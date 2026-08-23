-- ⚠ صار تلقائياً: هذا المنطق انتقل إلى دوال قاعدة البيانات jub2_resync() + jub2_build()
-- ويعمل عبر المحفّز jub2_sync_after_receipts على jub1_receipts. هذا الملف مرجع تاريخي فقط —
-- لا تشغّله يدوياً (ستزدوج المزامنة). للتعافي اليدوي: select public.jub2_resync();

-- ============================================================================
-- مزامنة فواتير JUB2 مع سندات قبض JUB1 بعد أي تعديل/إضافة/ربط جديد
-- شغّله كلما اشتغل الموظفون على صفحة «سندات JUB1» وتبي الفواتير تعكس الوضع الحالي.
-- آمن لإعادة التشغيل: يُعيد بناء المجموعات المتغيّرة فقط ويترك الباقي كما هو.
-- الفرع: JUB2 = 5f9431b1-fda9-4738-9d9b-57c542cefb2b
-- الجزء (أ): كشف التغيّر + هدم المجموعات المتأثّرة + اشتقاق صفوفها من جديد.
-- ============================================================================
begin;

alter table invoices disable trigger wa_invoices_aiu;
alter table payments disable trigger wa_payments_aiu;

-- ── 1) أعِد حساب حواف الربط التلقائي (تشمل السندات الجديدة) ─────────────────
drop table if exists _jub2_autolink;
create table _jub2_autolink as
with src as (
  select r.id src_id, r.client_phone, r.client_id_no, lpad(trim(t),4,'0') prev_no
  from jub1_receipts r, unnest(regexp_split_to_array(coalesce(r.previous_receipt_nos,''),'[^0-9]+')) t
  where r.deleted_at is null and length(trim(t))>0),
cand as (
  select s.src_id, s.prev_no, t.id tgt_id,
    (t.client_id_no is not null and s.client_id_no is not null and t.client_id_no=s.client_id_no) id_match,
    (t.client_phone is not null and s.client_phone is not null and t.client_phone=s.client_phone) ph_match,
    (t.client_id_no is not null and s.client_id_no is not null and t.client_id_no<>s.client_id_no) id_clash,
    (t.client_phone is not null and s.client_phone is not null and t.client_phone<>s.client_phone) ph_clash
  from src s join jub1_receipts t on t.deleted_at is null and t.id<>s.src_id
    and lpad(regexp_replace(coalesce(t.primary_receipt_no,''),'\D','','g'),4,'0') = s.prev_no),
ok as (select * from cand where not id_clash and not ph_clash),
agg as (select src_id, prev_no, count(*) n_ok, count(*) filter (where id_match or ph_match) n_strong,
          (array_agg(tgt_id) filter (where id_match or ph_match))[1] strong_id, (array_agg(tgt_id))[1] any_id
        from ok group by 1,2)
select src_id, prev_no, n_ok, n_strong,
  case when n_strong=1 then strong_id when n_ok=1 then any_id end tgt_id,
  case when n_strong=1 then 'strong' when n_ok=1 then 'unique' else 'ambiguous' end how
from agg;

-- ── 2) التجميع الصحيح الآن — ربط صريح + حواف strong فقط ────────────────────
--     (unique مرفوضة عمداً: رقم السند غير فريد فتدمج أشخاصاً مختلفين)
drop table if exists _jub2_cc_now;
create table _jub2_cc_now as
with r as (select id, linked_receipt_ids from jub1_receipts where deleted_at is null),
e0 as (select id a, unnest(linked_receipt_ids) b from r),
e1 as (select src_id a, tgt_id b from _jub2_autolink where tgt_id is not null and how='strong'),
allb as (select a,b from e0 union all select a,b from e1),
e as (select distinct a,b from (select a,b from allb union all select b a, a b from allb) z
      where a in (select id from r) and b in (select id from r)),
walk as (with recursive w(start_id,node) as (select id,id from r union select w.start_id, e.b from w join e on e.a=w.node) select * from w)
select start_id receipt_id, min(node::text)::uuid comp from walk group by start_id;
create index on _jub2_cc_now(comp);

-- ── 3) المجموعات المتغيّرة (todo) والمجموعات القديمة المتأثّرة (dead) ───────
drop table if exists _jub2_todo;
create table _jub2_todo (comp uuid primary key);
drop table if exists _jub2_dead;
create table _jub2_dead (comp uuid primary key);

-- البذرة: كل مجموعة جديدة أعضاؤها يختلفون عن أي مجموعة قديمة
insert into _jub2_todo (comp)
with now_g as (select comp, array_agg(receipt_id order by receipt_id) mem from _jub2_cc_now group by 1),
old_g as (select comp, array_agg(receipt_id order by receipt_id) mem from _jub2_cc2 group by 1)
select n.comp from now_g n where not exists (select 1 from old_g o where o.mem = n.mem);

-- الإغلاق: مجموعة قديمة تشارك سنداً مع todo ⇒ dead، ومجموعة جديدة تشارك سنداً مع dead ⇒ todo.
-- نكرّر حتى الثبات كي لا تبقى فاتورة قديمة معلّقة على سند انتقل لمجموعة أخرى.
do $cl$
declare n1 int; n2 int;
begin
  loop
    insert into _jub2_dead (comp)
    select distinct o.comp from _jub2_cc2 o join _jub2_cc_now n on n.receipt_id = o.receipt_id
    where n.comp in (select comp from _jub2_todo)
    on conflict do nothing;
    get diagnostics n1 = row_count;

    insert into _jub2_todo (comp)
    select distinct n.comp from _jub2_cc_now n join _jub2_cc2 o on o.receipt_id = n.receipt_id
    where o.comp in (select comp from _jub2_dead)
    on conflict do nothing;
    get diagnostics n2 = row_count;

    exit when n1 = 0 and n2 = 0;
  end loop;
end $cl$;

-- ── 4) اهدم فواتير المجموعات القديمة المتأثّرة ──────────────────────────────
-- أولاً فُكّ إشارة السند إلى فاتورته (مفتاح أجنبي يمنع الحذف)
update jub1_receipts r set converted_invoice_id = null, converted_at = null
from _jub2_cc2 o, _jub2_dead d where o.receipt_id = r.id and o.comp = d.comp;
update jub1_receipts r set converted_invoice_id = null, converted_at = null
where r.converted_invoice_id in (select i.id from invoices i, _jub2_dead d where i.legacy_bubble_id = 'jub2conv:inv:' || d.comp);

delete from attachments a using _jub2_dead d where a.legacy_bubble_id like 'jub2conv:att:' || d.comp || ':%';
delete from attachments a using _jub2_cc2 o join _jub2_dead d on d.comp = o.comp
  where a.legacy_bubble_id = 'jub2conv:iatt:' || o.receipt_id;
delete from service_request_notes n using service_requests sr, _jub2_dead d
  where n.service_request_id = sr.id and sr.legacy_bubble_id = 'jub2conv:sr:' || d.comp;
delete from payments     p using _jub2_dead d where p.legacy_bubble_id like 'jub2conv:pay:'  || d.comp || ':%';
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
-- احتياط: أي صف اشتقاق باقٍ لمجموعة سنعيد بناءها
delete from _jub2_grp g using _jub2_todo t where g.comp = t.comp;

-- ── 5) اعتمد التجميع الجديد مرجعاً للمقارنة القادمة ────────────────────────
drop table if exists _jub2_cc2;
alter table _jub2_cc_now rename to _jub2_cc2;

-- ── 6) اشتقّ صفوف المجموعات الجديدة (نفس قواعد التحويل الأصلي) ─────────────
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
    date_flag = case when not exists (
        select 1 from _jub2_cc2 c join jub1_receipts r on r.id = c.receipt_id
        where c.comp = g.comp and coalesce(r.receipt_date, r.created_at::date) between date '2023-01-01' and current_date)
      then 'implausible_date' end
where g.comp in (select comp from _jub2_todo);

-- رقم/وقت الفاتورة: مشتقّ من تاريخ أول سند (نفس صيغة البرنامج: آخر ١٠ خانات من epoch-ms)
with o as (select comp, first_date, row_number() over (partition by first_date order by comp) rn
           from _jub2_grp where comp in (select comp from _jub2_todo))
update _jub2_grp g set inv_ts = ((o.first_date::timestamp + interval '9 hours' + (o.rn * interval '7 seconds')) at time zone 'Asia/Riyadh')
from o where o.comp = g.comp;

do $blk$ declare i int; n int; begin
  for i in 1..60 loop
    update _jub2_grp g set inv_ts = g.inv_ts + interval '1 second'
    from (select comp, row_number() over (partition by right((extract(epoch from inv_ts)*1000)::bigint::text,10) order by comp) rn
          from _jub2_grp) d
    where d.comp = g.comp and d.rn > 1 and g.comp in (select comp from _jub2_todo);
    select count(*) into n from (select right((extract(epoch from inv_ts)*1000)::bigint::text,10) r
                                 from _jub2_grp group by 1 having count(*) > 1) z;
    exit when n = 0;
  end loop;
end $blk$;

update _jub2_grp set ref_no = right((extract(epoch from inv_ts)*1000)::bigint::text, 10)
where comp in (select comp from _jub2_todo);

commit;
