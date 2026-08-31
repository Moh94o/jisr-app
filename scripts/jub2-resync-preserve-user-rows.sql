-- ============================================================================
-- إصلاح انهيار مزامنة JUB2: الصفوف التي أنشأها المستخدمون على الفواتير المحوَّلة
-- ----------------------------------------------------------------------------
-- العلّة: jub2_resync() كان يهدم الفاتورة المحوَّلة قبل إعادة بنائها، لكنه لا
-- يحذف إلا الصفوف الموسومة 'jub2conv:%'. أي دفعة أضافها موظف من الواجهة على
-- فاتورة محوَّلة تبقى وتمنع حذف الفاتورة:
--   23503 — update or delete on table "invoices" violates foreign key
--           constraint "payments_invoice_id_fkey" on table "payments"
-- فتفشل المعاملة كاملةً، وتبقى راية jub2_sync_state.dirty مرفوعة، فتتوقّف
-- المزامنة عن كل المكتب (منذ 2026-08-28 22:24) ولا ينعكس أي ربط سندات.
--
-- الإصلاح: قبل الهدم نحفظ صفوف المستخدمين (دفعات + ملاحظات + أقساط غير موسومة)
-- في جداول عمل، ثم نعيدها بعد البناء إلى الفاتورة/الطلب الجديدين بنفس المعرّفات
-- (فتبقى المرفقات المعلّقة عليها صحيحة).
-- ============================================================================

------------------------------------------------------------------ جداول العمل
create table if not exists _jub2_map_old_new (old_comp uuid primary key, new_comp uuid);
create table if not exists _jub2_extpay  (id uuid primary key, old_comp uuid, new_comp uuid, inst_order int, rowdata jsonb);
create table if not exists _jub2_extnote (id uuid primary key, old_comp uuid, new_comp uuid, rowdata jsonb);
create table if not exists _jub2_extinst (id uuid primary key, old_comp uuid, new_comp uuid, rowdata jsonb);
-- أرشيف دائم: صفٌّ لا مكان له بعد إعادة البناء (كل سندات مجموعته حُذفت)
create table if not exists _jub2_orphan  (kind text, old_comp uuid, rowdata jsonb, at timestamptz default now());

alter table _jub2_map_old_new enable row level security;
alter table _jub2_extpay      enable row level security;
alter table _jub2_extnote     enable row level security;
alter table _jub2_extinst     enable row level security;
alter table _jub2_orphan      enable row level security;

--------------------------------------------------------------------- الدالة
create or replace function public.jub2_resync()
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_todo integer := 0;
  n1 integer; n2 integer;
begin
  perform set_config('jisr.wa_suppress', 'on', true);
  perform pg_advisory_xact_lock(hashtext('jub2_resync'));

  delete from _jub2_autolink where true;
  insert into _jub2_autolink (src_id, prev_no, n_ok, n_strong, tgt_id, how)
  with src as (
    select r.id src_id, r.client_phone, r.client_id_no, lpad(trim(t),4,'0') prev_no
    from jub1_receipts r, unnest(regexp_split_to_array(coalesce(r.previous_receipt_nos,''),'[^0-9]+')) t
    where r.deleted_at is null and length(trim(t)) > 0),
  cand as (
    select s.src_id, s.prev_no, t.id tgt_id,
      (t.client_id_no is not null and s.client_id_no is not null and t.client_id_no = s.client_id_no) id_match,
      (t.client_phone is not null and s.client_phone is not null and t.client_phone = s.client_phone) ph_match,
      (t.client_id_no is not null and s.client_id_no is not null and t.client_id_no <> s.client_id_no) id_clash,
      (t.client_phone is not null and s.client_phone is not null and t.client_phone <> s.client_phone) ph_clash
    from src s join jub1_receipts t on t.deleted_at is null and t.id <> s.src_id
      and lpad(regexp_replace(coalesce(t.primary_receipt_no,''),'\D','','g'),4,'0') = s.prev_no),
  ok as (select * from cand where not id_clash and not ph_clash),
  agg as (select src_id, prev_no, count(*) n_ok, count(*) filter (where id_match or ph_match) n_strong,
            (array_agg(tgt_id) filter (where id_match or ph_match))[1] strong_id, (array_agg(tgt_id))[1] any_id
          from ok group by 1,2)
  select src_id, prev_no, n_ok, n_strong,
    case when n_strong = 1 then strong_id when n_ok = 1 then any_id end,
    case when n_strong = 1 then 'strong' when n_ok = 1 then 'unique' else 'ambiguous' end
  from agg;

  delete from _jub2_ccnew where true;
  insert into _jub2_ccnew (receipt_id, comp)
  with r as (select id, linked_receipt_ids from jub1_receipts where deleted_at is null),
  e0 as (select id a, unnest(linked_receipt_ids) b from r),
  e1 as (select src_id a, tgt_id b from _jub2_autolink where tgt_id is not null and how = 'strong'),
  allb as (select a,b from e0 union all select a,b from e1),
  e as (select distinct a,b from (select a,b from allb union all select b a, a b from allb) z
        where a in (select id from r) and b in (select id from r)),
  walk as (with recursive w(start_id,node) as (
             select id,id from r union select w.start_id, e.b from w join e on e.a = w.node) select * from w)
  select start_id, min(node::text)::uuid from walk group by start_id;

  delete from _jub2_todo where true; delete from _jub2_dead where true;
  insert into _jub2_todo(comp)
  with fp_now as (
    select c.comp, md5(string_agg(
        concat_ws('|', r.id::text, r.primary_receipt_no, r.receipt_date::text, r.primary_receipt_amount::text,
          r.total_amount::text, r.client_name, r.client_id_no, r.client_phone, r.agent_name,
          r.service_code, r.quantity::text, r.review_status, r.installment_plan::text), E'\n' order by r.id)) fp
    from _jub2_ccnew c join jub1_receipts r on r.id = c.receipt_id group by c.comp)
  select f.comp from fp_now f
  left join _jub2_grp g on g.comp = f.comp
  where g.comp is null or g.fingerprint is distinct from f.fp
     or not exists (select 1 from invoices i where i.legacy_bubble_id = 'jub2conv:inv:' || f.comp);

  loop
    insert into _jub2_dead(comp)
    select distinct o.comp from _jub2_cc2 o join _jub2_ccnew n on n.receipt_id = o.receipt_id
    where n.comp in (select comp from _jub2_todo) on conflict do nothing;
    get diagnostics n1 = row_count;
    insert into _jub2_todo(comp)
    select distinct n.comp from _jub2_ccnew n join _jub2_cc2 o on o.receipt_id = n.receipt_id
    where o.comp in (select comp from _jub2_dead) on conflict do nothing;
    get diagnostics n2 = row_count;
    exit when n1 = 0 and n2 = 0;
  end loop;

  select count(*) into v_todo from _jub2_todo;
  if v_todo = 0 then return 0; end if;

  delete from _jub2_keep where true;
  insert into _jub2_keep (comp, invoice_no)
  select distinct on (n.comp) n.comp, i.invoice_no
  from _jub2_ccnew n join _jub2_cc2 o on o.receipt_id = n.receipt_id
  join invoices i on i.legacy_bubble_id = 'jub2conv:inv:' || o.comp
  where n.comp in (select comp from _jub2_todo)
  order by n.comp, i.created_at, i.invoice_no;

  ------------------------------------------------------------------------
  -- حفظ صفوف المستخدمين قبل الهدم
  -- (دفعة/ملاحظة/قسط أضافها موظف من الواجهة على فاتورة محوَّلة — غير موسومة
  --  بـjub2conv فلا يحذفها الهدم، وكانت تمنع حذف الفاتورة وتُسقط المزامنة)
  ------------------------------------------------------------------------
  -- المجموعة القديمة ← المجموعة الجديدة التي ورثت أكثر سنداتها
  delete from _jub2_map_old_new where true;
  insert into _jub2_map_old_new(old_comp, new_comp)
  select distinct on (t.old_comp) t.old_comp, t.new_comp
  from (select o.comp old_comp, n.comp new_comp, count(*) c
        from _jub2_cc2 o join _jub2_ccnew n on n.receipt_id = o.receipt_id
        where o.comp in (select comp from _jub2_dead)
        group by 1,2) t
  order by t.old_comp, t.c desc, t.new_comp;

  delete from _jub2_extpay where true;
  delete from _jub2_extnote where true;
  delete from _jub2_extinst where true;

  insert into _jub2_extpay(id, old_comp, new_comp, inst_order, rowdata)
  select p.id, d.comp, m.new_comp,
         (select x.installment_order from installments x
           where x.id = p.installment_id and x.legacy_bubble_id like 'jub2conv:inst:%'),
         to_jsonb(p)
  from _jub2_dead d
  join invoices i on i.legacy_bubble_id = 'jub2conv:inv:' || d.comp
  join payments p on p.invoice_id = i.id
  left join _jub2_map_old_new m on m.old_comp = d.comp
  where p.legacy_bubble_id is null or p.legacy_bubble_id not like 'jub2conv:pay:%';

  insert into _jub2_extinst(id, old_comp, new_comp, rowdata)
  select x.id, d.comp, m.new_comp, to_jsonb(x)
  from _jub2_dead d
  join invoices i on i.legacy_bubble_id = 'jub2conv:inv:' || d.comp
  join installments x on x.invoice_id = i.id
  left join _jub2_map_old_new m on m.old_comp = d.comp
  where x.legacy_bubble_id is null or x.legacy_bubble_id not like 'jub2conv:inst:%';

  insert into _jub2_extnote(id, old_comp, new_comp, rowdata)
  select nt.id, d.comp, m.new_comp, to_jsonb(nt)
  from _jub2_dead d
  join service_requests sr on sr.legacy_bubble_id = 'jub2conv:sr:' || d.comp
  join service_request_notes nt on nt.service_request_id = sr.id
  left join _jub2_map_old_new m on m.old_comp = d.comp
  where nt.note not like 'محوَّلة آلياً من سندات قبض%';

  -- ما لا مكان له بعد البناء يُؤرشَف بدل أن يضيع
  insert into _jub2_orphan(kind, old_comp, rowdata)
  select 'payment', old_comp, rowdata from _jub2_extpay where new_comp is null
  union all select 'installment', old_comp, rowdata from _jub2_extinst where new_comp is null
  union all select 'note', old_comp, rowdata from _jub2_extnote where new_comp is null;

  delete from payments p using _jub2_extpay e where p.id = e.id;

  ------------------------------------------------------------------------ الهدم
  update jub1_receipts r set converted_invoice_id = null, converted_at = null
  from _jub2_cc2 o, _jub2_dead d where o.receipt_id = r.id and o.comp = d.comp;
  update jub1_receipts r set converted_invoice_id = null, converted_at = null
  where r.converted_invoice_id in (select i.id from invoices i, _jub2_dead d where i.legacy_bubble_id = 'jub2conv:inv:' || d.comp);

  delete from attachments a using _jub2_dead d where a.legacy_bubble_id like 'jub2conv:att:' || d.comp || ':%';
  delete from attachments a using _jub2_cc2 o join _jub2_dead d on d.comp = o.comp
    where a.legacy_bubble_id = 'jub2conv:iatt:' || o.receipt_id;
  delete from service_request_notes nt using service_requests sr, _jub2_dead d
    where nt.service_request_id = sr.id and sr.legacy_bubble_id = 'jub2conv:sr:' || d.comp;
  delete from payments     p using _jub2_dead d where p.legacy_bubble_id like 'jub2conv:pay:'  || d.comp || ':%';
  -- شبكة أمان: أي دفعة موسومة بقيت على فاتورة ميتة (وسم مجموعة أخرى)
  delete from payments p using _jub2_dead d join invoices i on i.legacy_bubble_id = 'jub2conv:inv:' || d.comp
    where p.invoice_id = i.id and p.legacy_bubble_id like 'jub2conv:pay:%';
  delete from installments x using _jub2_dead d where x.legacy_bubble_id like 'jub2conv:inst:' || d.comp || ':%';
  delete from transaction_fees tf using service_requests sr, _jub2_dead d
    where tf.service_request_id = sr.id and sr.legacy_bubble_id = 'jub2conv:sr:' || d.comp;
  delete from visa_applications          v using _jub2_dead d where v.legacy_bubble_id like 'jub2conv:visa:' || d.comp || ':%';
  delete from transfer_applications      t using _jub2_dead d where t.legacy_bubble_id = 'jub2conv:tr:'  || d.comp;
  delete from iqama_renewal_applications t using _jub2_dead d where t.legacy_bubble_id = 'jub2conv:ir:'  || d.comp;
  delete from other_applications         t using _jub2_dead d where t.legacy_bubble_id = 'jub2conv:oth:' || d.comp;
  delete from service_request_agents sra using service_requests sr, _jub2_dead d
    where sra.service_request_id = sr.id and sr.legacy_bubble_id = 'jub2conv:sr:' || d.comp;
  delete from invoices         i using _jub2_dead d where i.legacy_bubble_id = 'jub2conv:inv:' || d.comp;
  delete from service_requests s using _jub2_dead d where s.legacy_bubble_id = 'jub2conv:sr:'  || d.comp;
  delete from _jub2_grp g using _jub2_dead d where g.comp = d.comp;
  delete from _jub2_grp g using _jub2_todo t where g.comp = t.comp;
  delete from _jub2_client_map cm using _jub2_dead d where cm.comp = d.comp;
  delete from _jub2_client_map cm using _jub2_todo t where cm.comp = t.comp;
  delete from _jub2_pay p using _jub2_dead d where p.comp = d.comp;
  delete from _jub2_pay p using _jub2_todo t where p.comp = t.comp;

  delete from _jub2_cc2 where true;
  insert into _jub2_cc2(receipt_id, comp) select receipt_id, comp from _jub2_ccnew;

  insert into _jub2_grp (comp, members, first_date, last_date, max_total, paid_sum, paid_sum_all, qty,
    all_cancelled, slip_nos, agents_all, client_name, client_phone, client_id_no, agent_name,
    service_code, installment_plan, total_amount)
  with m as (
    select c.comp, r.*,
      (case when r.client_name is not null then 1 else 0 end) + (case when r.client_id_no is not null then 1 else 0 end)
        + (case when r.client_phone is not null then 1 else 0 end) completeness,
      coalesce(r.receipt_date, r.created_at::date) eff_date
    from _jub2_cc2 c join jub1_receipts r on r.id = c.receipt_id
    where c.comp in (select comp from _jub2_todo)),
  nm as (select distinct on (comp) comp, nm from
          (select comp, trim(client_name) nm, count(*) n, max(length(trim(client_name))) ln from m
           where nullif(trim(coalesce(client_name,'')),'') is not null group by 1,2) z
         order by comp, n desc, ln desc, nm),
  best as (select distinct on (comp) comp, client_phone, client_id_no, agent_name from m
           order by comp, completeness desc, eff_date desc, created_at desc),
  svc as (select distinct on (comp) comp, service_code from
            (select comp, service_code, count(*) n, max(eff_date) mx from m where service_code is not null group by 1,2) z
          order by comp, n desc, mx desc),
  agg as (select comp, count(*) members,
            min(eff_date) filter (where eff_date between date '2023-01-01' and current_date) plausible, min(eff_date) any_d,
            max(eff_date) last_date, max(total_amount) max_total,
            sum(case when review_status = 'cancelled' then 0 else coalesce(primary_receipt_amount,0) end) paid_sum,
            sum(coalesce(primary_receipt_amount,0)) paid_sum_all, max(coalesce(quantity,1)) qty,
            bool_and(review_status = 'cancelled') all_cancelled,
            string_agg(distinct nullif(primary_receipt_no,''), ' ') slip_nos,
            string_agg(distinct nullif(agent_name,''), ' | ') agents_all
          from m group by 1),
  plan as (select distinct on (comp) comp, installment_plan from
            (select m.comp, m.installment_plan, m.eff_date, m.created_at, a.max_total,
               (select coalesce(sum((x->>'amount')::numeric),0) from jsonb_array_elements(m.installment_plan) x) psum
             from m join agg a on a.comp = m.comp where jsonb_array_length(coalesce(m.installment_plan,'[]'::jsonb)) > 0) z
           order by comp, (abs(psum - max_total) <= 0.5) desc, jsonb_array_length(installment_plan) desc, eff_date desc, created_at desc)
  select a.comp, a.members, coalesce(a.plausible, a.any_d), a.last_date, a.max_total, a.paid_sum, a.paid_sum_all, a.qty,
    a.all_cancelled, a.slip_nos, a.agents_all, nm.nm, b.client_phone, b.client_id_no, b.agent_name,
    coalesce(s.service_code, 'general'), coalesce(p.installment_plan, '[]'::jsonb),
    greatest(coalesce(a.max_total, a.paid_sum_all, 0), a.paid_sum)
  from agg a join best b using(comp) left join nm using(comp) left join svc s using(comp) left join plan p using(comp);

  update _jub2_grp g
  set total_adjusted = (g.paid_sum > coalesce(g.max_total,0) + 0.005),
      fingerprint = public.jub2_group_fp(g.comp),
      date_flag = case when not exists (
          select 1 from _jub2_cc2 c join jub1_receipts r on r.id = c.receipt_id
          where c.comp = g.comp and coalesce(r.receipt_date, r.created_at::date) between date '2023-01-01' and current_date)
        then 'implausible_date' end
  where g.comp in (select comp from _jub2_todo);

  with o as (select comp, first_date, row_number() over (partition by first_date order by comp) rn
             from _jub2_grp where comp in (select comp from _jub2_todo))
  update _jub2_grp g set inv_ts = ((o.first_date::timestamp + interval '9 hours' + (o.rn * interval '7 seconds')) at time zone 'Asia/Riyadh')
  from o where o.comp = g.comp;

  update _jub2_grp g set ref_no = coalesce(k.invoice_no, right((extract(epoch from g.inv_ts)*1000)::bigint::text, 10))
  from _jub2_todo t left join _jub2_keep k on k.comp = t.comp where g.comp = t.comp;

  for n1 in 1..60 loop
    select count(*) into n2 from ( select g.comp from _jub2_grp g join _jub2_todo t on t.comp = g.comp where exists (select 1 from _jub2_grp o where o.ref_no = g.ref_no and o.comp <> g.comp)    or exists (select 1 from service_requests sr where sr.request_ref_no = g.ref_no                 and sr.legacy_bubble_id like 'jub2conv:sr:%'                 and sr.legacy_bubble_id <> 'jub2conv:sr:' || g.comp)) z;
    exit when n2 = 0;
    update _jub2_grp g
    set ref_no = right((extract(epoch from (g.inv_ts + (n1 || ' seconds')::interval))*1000)::bigint::text, 10)
    from (select g2.comp, row_number() over (partition by g2.ref_no order by (t2.comp is not null), (k2.comp is null), g2.comp) rn from _jub2_grp g2 left join _jub2_todo t2 on t2.comp = g2.comp left join _jub2_keep k2 on k2.comp = g2.comp) d
    where d.comp = g.comp and g.comp in (select comp from _jub2_todo) and (d.rn > 1 or exists (select 1 from service_requests sr where sr.request_ref_no = g.ref_no        and sr.legacy_bubble_id like 'jub2conv:sr:%'        and sr.legacy_bubble_id <> 'jub2conv:sr:' || g.comp));
  end loop;

  perform public.jub2_build();

  ------------------------------------------------------------------------
  -- إعادة صفوف المستخدمين إلى الفاتورة/الطلب الجديدين (بنفس المعرّفات)
  ------------------------------------------------------------------------
  with base as (
    select e.id, e.rowdata, g.inv_id, g.sr_id,
      coalesce((select max(x.installment_order) from installments x where x.invoice_id = g.inv_id),0)
        + row_number() over (partition by g.inv_id order by (e.rowdata->>'installment_order')::int nulls last, e.id) ord
    from _jub2_extinst e join _jub2_grp g on g.comp = e.new_comp
    where e.new_comp is not null and g.inv_id is not null)
  -- قائمة أعمدة صريحة: remaining_amount عمود مُولَّد (GENERATED ALWAYS) لا يُدرَج
  -- وvisa_application_id يُصفَّر لأن صف التأشيرة القديم حُذف مع الطلب
  insert into installments (id, legacy_bubble_id, invoice_id, service_request_id, branch_id, installment_order,
    total_amount, paid_amount, expected_date, paid_date, payment_method_id, payment_milestone_id, receipt_no,
    bank_reference, paper_slip_no, notes, created_at, updated_at, created_by, updated_by, deleted_at, deleted_by,
    visa_application_id)
  select r.id, r.legacy_bubble_id, r.invoice_id, r.service_request_id, r.branch_id, r.installment_order,
    r.total_amount, r.paid_amount, r.expected_date, r.paid_date, r.payment_method_id, r.payment_milestone_id,
    r.receipt_no, r.bank_reference, r.paper_slip_no, r.notes, r.created_at, r.updated_at, r.created_by,
    r.updated_by, r.deleted_at, r.deleted_by, null
  from base b
  cross join lateral jsonb_populate_record(null::installments,
    b.rowdata || jsonb_build_object('invoice_id', b.inv_id, 'service_request_id', b.sr_id,
                                    'installment_order', b.ord)) r;

  insert into payments
  select r.* from _jub2_extpay e
  join _jub2_grp g on g.comp = e.new_comp
  cross join lateral jsonb_populate_record(null::payments,
    e.rowdata || jsonb_build_object(
      'invoice_id', g.inv_id, 'service_request_id', g.sr_id,
      'installment_id', (select x.id from installments x
                          where x.invoice_id = g.inv_id and x.legacy_bubble_id like 'jub2conv:inst:%'
                            and x.installment_order = e.inst_order limit 1))) r
  where e.new_comp is not null and g.inv_id is not null;

  insert into service_request_notes
  select r.* from _jub2_extnote e
  join _jub2_grp g on g.comp = e.new_comp
  cross join lateral jsonb_populate_record(null::service_request_notes,
    e.rowdata || jsonb_build_object('service_request_id', g.sr_id)) r
  where e.new_comp is not null and g.sr_id is not null;

  -- الدفعات المعادة تغيّر المقبوض (محفّز paid_amount) ⇒ صحّح الحالة والبحث
  update invoices i
  set status_id = case when i.total_amount > 0 and i.paid_amount >= i.total_amount - 0.005
                       then '0fc95727-004d-43a2-92a9-caa27d84203c'::uuid else i.status_id end,
      search_text = invoice_build_search_text(i.id)
  from _jub2_grp g
  where i.id = g.inv_id
    and g.comp in (select new_comp from _jub2_extpay where new_comp is not null)
    and i.status_id <> '84a77164-2cba-46be-b6ce-a0245e4a72ed'::uuid;

  return v_todo;
end;
$function$;
