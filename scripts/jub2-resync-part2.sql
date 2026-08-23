-- ⚠ صار تلقائياً: هذا المنطق انتقل إلى دوال قاعدة البيانات jub2_resync() + jub2_build()
-- ويعمل عبر المحفّز jub2_sync_after_receipts على jub1_receipts. هذا الملف مرجع تاريخي فقط —
-- لا تشغّله يدوياً (ستزدوج المزامنة). للتعافي اليدوي: select public.jub2_resync();

-- ============================================================================
-- مزامنة فواتير JUB2 — الجزء (ب): إنشاء الفواتير للمجموعات المعلَّمة في _jub2_todo
-- شغّله بعد jub2-resync.sql مباشرة (يعتمد على _jub2_todo و_jub2_grp).
-- كل الإدراجات موسومة jub2conv:% ولها on-conflict-do-nothing فإعادة التشغيل آمنة.
-- ============================================================================
begin;

alter table invoices disable trigger wa_invoices_aiu;
alter table payments disable trigger wa_payments_aiu;

-- ── 1) العملاء (مطابقة بالهوية ثم الجوال، وإلا عميل جديد لكل مجموعة) ───────
delete from _jub2_client_map cm using _jub2_todo t where cm.comp = t.comp;
insert into _jub2_client_map (comp, ckey, client_name, idno, ph, existing_by_id, existing_by_ph, client_id)
with g as (
  select comp, client_name,
    nullif(regexp_replace(coalesce(client_id_no,''),'\D','','g'),'') idno,
    case when length(regexp_replace(coalesce(client_phone,''),'\D','','g')) >= 9
         then '966' || right(regexp_replace(client_phone,'\D','','g'),9) end ph
  from _jub2_grp where comp in (select comp from _jub2_todo)),
k as (select comp, client_name, idno, ph,
        coalesce('I:'||idno, 'P:'||ph, case when client_name is not null then 'G:'||comp::text end) ckey from g)
select k.comp, k.ckey, k.client_name, k.idno, k.ph,
  (select c.id from clients c where c.deleted_at is null and k.idno is not null and c.id_number = k.idno order by c.created_at limit 1),
  (select c.id from clients c where c.deleted_at is null and k.ph   is not null and c.phone     = k.ph   order by c.created_at limit 1),
  null::uuid
from k;
update _jub2_client_map set client_id = coalesce(existing_by_id, existing_by_ph)
where comp in (select comp from _jub2_todo);

insert into clients (name_ar, name_en, phone, id_number, branch_id, branch_ids, legacy_bubble_id, notes, created_at, updated_at)
select case when m.client_name ~ '[؀-ۿ]' then m.client_name end,
       case when m.client_name !~ '[؀-ۿ]' then m.client_name end,
       m.ph, m.idno, '5f9431b1-fda9-4738-9d9b-57c542cefb2b'::uuid,
       array['5f9431b1-fda9-4738-9d9b-57c542cefb2b'::uuid],
       'jub2conv:client:' || m.ckey, 'مُنشأ من تحويل سندات قبض JUB1', min(m.first_ts), min(m.first_ts)
from (select cm.*, g.inv_ts first_ts, row_number() over (partition by cm.ckey order by (cm.client_name is null), g.inv_ts) rn
      from _jub2_client_map cm join _jub2_grp g using(comp)
      where cm.comp in (select comp from _jub2_todo) and cm.ckey is not null and cm.client_id is null) m
where m.rn = 1
group by m.ckey, m.client_name, m.ph, m.idno
on conflict (legacy_bubble_id) do nothing;

update _jub2_client_map cm set client_id = c.id
from clients c where c.legacy_bubble_id = 'jub2conv:client:' || cm.ckey and cm.client_id is null;

-- حدِّث اسم/هوية/جوال عملاء التحويل من بيانات السند الحالية (السند قد يكون عُدِّل بعد التحويل).
-- يقتصر على العملاء الذين أنشأهم التحويل — لا يُلمس أي عميل أصلي في النظام.
update clients c
set name_ar = case when g.client_name ~ '[؀-ۿ]' then trim(g.client_name) end,
    name_en = case when g.client_name !~ '[؀-ۿ]' then trim(g.client_name) end,
    id_number = coalesce(cm.idno, c.id_number),
    phone = coalesce(cm.ph, c.phone),
    notes = 'مُنشأ من تحويل سندات قبض JUB1'
from _jub2_client_map cm join _jub2_grp g using(comp)
where c.id = cm.client_id and cm.comp in (select comp from _jub2_todo)
  and c.legacy_bubble_id like 'jub2conv:client:%'
  and g.client_name is not null
  and coalesce(c.name_ar, c.name_en) is distinct from trim(g.client_name);

-- ── 2) الوسطاء ─────────────────────────────────────────────────────────────
insert into _jub2_agent_map (nm, agent_id)
select distinct trim(g.agent_name), null::uuid from _jub2_grp g
where g.comp in (select comp from _jub2_todo) and nullif(trim(coalesce(g.agent_name,'')),'') is not null
  and not exists (select 1 from _jub2_agent_map am where am.nm = trim(g.agent_name));
update _jub2_agent_map m set agent_id = (select a.id from agents a
  where a.deleted_at is null and trim(coalesce(a.name_ar,a.name_en)) = m.nm order by a.created_at limit 1)
where m.agent_id is null;
insert into agents (name_ar, name_en, branch_id, legacy_bubble_id, notes, created_at, updated_at)
select case when nm ~ '[؀-ۿ]' then nm end, case when nm !~ '[؀-ۿ]' then nm end,
  '5f9431b1-fda9-4738-9d9b-57c542cefb2b'::uuid, 'jub2conv:agent:' || nm, 'مُنشأ من تحويل سندات قبض JUB1', now(), now()
from _jub2_agent_map where agent_id is null
on conflict (legacy_bubble_id) do nothing;
update _jub2_agent_map m set agent_id = a.id from agents a
where a.legacy_bubble_id = 'jub2conv:agent:' || m.nm and m.agent_id is null;

-- ── 3) الطلبات ─────────────────────────────────────────────────────────────
insert into service_requests (legacy_bubble_id, request_ref_no, branch_id, client_id, service_type_id, status_id,
  request_date, quantity, slip_no, created_at, updated_at)
select 'jub2conv:sr:' || g.comp, g.ref_no, '5f9431b1-fda9-4738-9d9b-57c542cefb2b'::uuid, cm.client_id, st.id,
  case when g.all_cancelled then '961b2e01-0255-46eb-937d-67a7b04487f2'::uuid
       when g.service_code in ('other','ajeer') then 'aca5ecef-1b9c-4d5e-9f96-348712b81e0b'::uuid
       else '65a54fdd-45c1-4c01-9092-69037d9d3e37'::uuid end,
  g.inv_ts, greatest(1, coalesce(g.qty,1)), g.slip_nos, g.inv_ts, g.inv_ts
from _jub2_grp g join _jub2_client_map cm using(comp)
join lookup_items st on st.code = g.service_code
join lookup_categories lc on lc.id = st.category_id and lc.category_key = 'service_type'
where g.comp in (select comp from _jub2_todo)
on conflict (legacy_bubble_id) do nothing;

update _jub2_grp g set sr_id = sr.id from service_requests sr
where sr.legacy_bubble_id = 'jub2conv:sr:' || g.comp and g.comp in (select comp from _jub2_todo);

insert into service_request_agents (service_request_id, agent_id, created_at)
select g.sr_id, am.agent_id, g.inv_ts from _jub2_grp g join _jub2_agent_map am on am.nm = trim(g.agent_name)
where g.comp in (select comp from _jub2_todo) and g.sr_id is not null and am.agent_id is not null;

-- ── 4) جداول التفاصيل ──────────────────────────────────────────────────────
insert into visa_applications (legacy_bubble_id, service_request_id, file_number, worker_name, created_at, updated_at)
select 'jub2conv:visa:' || g.comp || ':' || s.i, g.sr_id, 1, g.client_name, g.inv_ts, g.inv_ts
from _jub2_grp g, lateral generate_series(1, greatest(1, coalesce(g.qty,1))) s(i)
where g.comp in (select comp from _jub2_todo) and g.service_code like 'work_visa%'
on conflict (legacy_bubble_id) do nothing;

insert into transfer_applications (legacy_bubble_id, service_request_id, total_price_final, created_at, updated_at)
select 'jub2conv:tr:' || g.comp, g.sr_id, nullif(g.total_amount,0), g.inv_ts, g.inv_ts
from _jub2_grp g where g.comp in (select comp from _jub2_todo) and g.service_code = 'transfer'
on conflict (legacy_bubble_id) do nothing;

insert into iqama_renewal_applications (legacy_bubble_id, service_request_id, worker_phone, duration_months, created_at, updated_at)
select 'jub2conv:ir:' || g.comp, g.sr_id, right(regexp_replace(coalesce(g.client_phone,''),'\D','','g'),9), 12, g.inv_ts, g.inv_ts
from _jub2_grp g where g.comp in (select comp from _jub2_todo) and g.service_code = 'iqama_renewal'
on conflict (legacy_bubble_id) do nothing;

insert into other_applications (legacy_bubble_id, service_request_id, worker_phone, description, created_at, updated_at)
select 'jub2conv:oth:' || g.comp, g.sr_id,
  nullif(right(regexp_replace(coalesce(g.client_phone,''),'\D','','g'),9),''), st.value_ar, g.inv_ts, g.inv_ts
from _jub2_grp g join lookup_items st on st.code = g.service_code
join lookup_categories lc on lc.id = st.category_id and lc.category_key = 'service_type'
where g.comp in (select comp from _jub2_todo)
  and g.service_code not like 'work_visa%' and g.service_code not in ('transfer','iqama_renewal')
on conflict (legacy_bubble_id) do nothing;

-- ── 5) الفواتير ────────────────────────────────────────────────────────────
insert into invoices (legacy_bubble_id, invoice_no, service_request_id, branch_id, service_type_id, service_quantity,
  total_amount, paid_amount, status_id, payment_plan, installments_count, agent_id, created_at, updated_at, last_activity_at)
select 'jub2conv:inv:' || g.comp, g.ref_no, g.sr_id, '5f9431b1-fda9-4738-9d9b-57c542cefb2b'::uuid, st.id,
  greatest(1, coalesce(g.qty,1)), g.total_amount, 0,
  case when g.all_cancelled then '84a77164-2cba-46be-b6ce-a0245e4a72ed'::uuid
       when g.total_amount > 0 and g.paid_sum >= g.total_amount - 0.005 then '0fc95727-004d-43a2-92a9-caa27d84203c'::uuid
       else '2f3a394a-6b11-4f4e-a885-027d254cb7d4'::uuid end,
  case when jsonb_array_length(g.installment_plan) > 1 then 'installment' else 'cash' end,
  case when jsonb_array_length(g.installment_plan) > 1 then jsonb_array_length(g.installment_plan) else 0 end,
  am.agent_id, g.inv_ts, g.inv_ts, g.inv_ts
from _jub2_grp g join lookup_items st on st.code = g.service_code
join lookup_categories lc on lc.id = st.category_id and lc.category_key = 'service_type'
left join _jub2_agent_map am on am.nm = trim(g.agent_name)
where g.comp in (select comp from _jub2_todo)
on conflict (legacy_bubble_id) do nothing;

update _jub2_grp g set inv_id = i.id from invoices i
where i.legacy_bubble_id = 'jub2conv:inv:' || g.comp and g.comp in (select comp from _jub2_todo);

-- ── 6) جدول الدفعات (الصف الأخير يمتصّ الفرق) ─────────────────────────────
insert into installments (legacy_bubble_id, invoice_id, service_request_id, branch_id, installment_order,
  total_amount, paid_amount, paid_date, payment_method_id, notes, created_at, updated_at)
with rows_raw as (
  select g.comp, g.inv_id, g.sr_id, g.inv_ts, g.total_amount, g.paid_sum, x.ord,
         round(coalesce((x.el->>'amount')::numeric,0),2) amt, nullif(trim(x.el->>'label'),'') label,
         count(*) over (partition by g.comp) ncnt
  from _jub2_grp g cross join lateral (select ordinality ord, value el from jsonb_array_elements(g.installment_plan) with ordinality) x
  where g.comp in (select comp from _jub2_todo) and g.total_amount > 0 and jsonb_array_length(g.installment_plan) > 0
  union all
  select g.comp, g.inv_id, g.sr_id, g.inv_ts, g.total_amount, g.paid_sum, 1, round(g.total_amount,2), null, 1
  from _jub2_grp g where g.comp in (select comp from _jub2_todo) and g.total_amount > 0 and jsonb_array_length(g.installment_plan) = 0),
fixed as (select r.*, sum(amt) over (partition by comp order by ord rows between unbounded preceding and current row) cum from rows_raw r),
adj as (select f.*, case when f.ord = f.ncnt then round(greatest(0, f.total_amount - (f.cum - f.amt)),2) else f.amt end final_amt from fixed f),
acc as (select a.*, coalesce(sum(final_amt) over (partition by comp order by ord rows between unbounded preceding and 1 preceding),0) prior from adj a)
select 'jub2conv:inst:' || comp || ':' || ord, inv_id, sr_id, '5f9431b1-fda9-4738-9d9b-57c542cefb2b'::uuid, ord,
  final_amt, round(least(final_amt, greatest(0, paid_sum - prior)),2),
  case when final_amt > 0 and least(final_amt, greatest(0, paid_sum - prior)) >= final_amt - 0.005 then inv_ts end,
  case when greatest(0, paid_sum - prior) > 0 then 'd9e366ff-f243-41b2-acf5-62bfebc07c0d'::uuid end,
  label, inv_ts, inv_ts
from acc
on conflict (legacy_bubble_id) do nothing;

-- ── 7) الدفعات — صف لكل سند برقمه وتاريخه ومبلغه ───────────────────────────
delete from _jub2_pay p using _jub2_todo t where p.comp = t.comp;
insert into _jub2_pay (comp, rid, primary_receipt_no, amt, review_status, d, source_image, notes, created_at, inv_id, sr_id, sq, prior, pay_ts)
with r as (
  select c.comp, r.id rid, r.primary_receipt_no, r.primary_receipt_amount amt, r.review_status,
    coalesce(r.receipt_date, r.created_at::date) d, r.source_image, r.notes, r.created_at, g.inv_id, g.sr_id
  from _jub2_cc2 c join jub1_receipts r on r.id = c.receipt_id join _jub2_grp g on g.comp = c.comp
  where c.comp in (select comp from _jub2_todo) and coalesce(r.primary_receipt_amount,0) > 0),
ord as (select r.*, row_number() over (partition by comp order by d, created_at) sq,
  coalesce(sum(case when review_status = 'cancelled' then 0 else amt end)
    over (partition by comp order by d, created_at rows between unbounded preceding and 1 preceding),0) prior
  from r)
select o.*, ((o.d::timestamp + interval '9 hours') at time zone 'Asia/Riyadh') from ord o;

insert into payments (legacy_bubble_id, invoice_id, service_request_id, branch_id, amount, payment_date,
  payment_method_id, is_valid, receipt_no, notes, created_at, updated_at)
select 'jub2conv:pay:' || p.comp || ':' || p.sq, p.inv_id, p.sr_id, '5f9431b1-fda9-4738-9d9b-57c542cefb2b'::uuid,
  p.amt, p.pay_ts, 'd9e366ff-f243-41b2-acf5-62bfebc07c0d'::uuid, (p.review_status <> 'cancelled'),
  p.primary_receipt_no, case when p.review_status = 'cancelled' then 'سند ملغي' end, p.pay_ts, p.pay_ts
from _jub2_pay p where p.comp in (select comp from _jub2_todo)
on conflict (legacy_bubble_id) do nothing;

-- اربط كل دفعة بالقسط الذي تقع فيه
with ins as (select id, invoice_id, installment_order,
    sum(total_amount) over (partition by invoice_id order by installment_order rows between unbounded preceding and current row) hi
  from installments where legacy_bubble_id like 'jub2conv:inst:%'),
pick as (select pay.id pay_id,
    (select i.id from ins i where i.invoice_id = pay.invoice_id and jp.prior < i.hi - 0.005 order by i.installment_order limit 1) inst_id
  from payments pay join _jub2_pay jp on 'jub2conv:pay:' || jp.comp || ':' || jp.sq = pay.legacy_bubble_id
  where pay.is_valid and jp.comp in (select comp from _jub2_todo))
update payments p set installment_id = pick.inst_id from pick where p.id = pick.pay_id;

-- ── 8) صور السندات: على الدفعة، وعلى الفاتورة للسندات صفرية المبلغ ─────────
insert into attachments (legacy_bubble_id, entity_type, entity_id, file_name, file_url, storage_path, mime_type,
  size_bytes, notes, created_at, updated_at, rotation)
select 'jub2conv:att:' || p.comp || ':' || p.sq, 'payment', pay.id, a.file_name, a.file_url, a.storage_path,
  a.mime_type, a.size_bytes, 'صورة سند القبض ' || coalesce(p.primary_receipt_no,''), p.pay_ts, p.pay_ts, coalesce(a.rotation,0)
from _jub2_pay p
join payments pay on pay.legacy_bubble_id = 'jub2conv:pay:' || p.comp || ':' || p.sq
join attachments a on a.entity_type = 'jub1_receipt' and a.entity_id = p.rid and a.deleted_at is null
where p.comp in (select comp from _jub2_todo)
  and not exists (select 1 from attachments x where x.legacy_bubble_id = 'jub2conv:att:' || p.comp || ':' || p.sq);

insert into attachments (legacy_bubble_id, entity_type, entity_id, file_name, file_url, storage_path, mime_type,
  size_bytes, notes, created_at, updated_at, rotation)
select 'jub2conv:iatt:' || r.id, 'invoice', g.inv_id, a.file_name, a.file_url, a.storage_path, a.mime_type, a.size_bytes,
  'صورة سند القبض ' || coalesce(r.primary_receipt_no,'') || case when r.review_status = 'cancelled' then ' (ملغي)' else '' end,
  g.inv_ts, g.inv_ts, coalesce(a.rotation,0)
from _jub2_cc2 c join jub1_receipts r on r.id = c.receipt_id join _jub2_grp g on g.comp = c.comp
join attachments a on a.entity_type = 'jub1_receipt' and a.entity_id = r.id and a.deleted_at is null
where c.comp in (select comp from _jub2_todo) and coalesce(r.primary_receipt_amount,0) = 0
  and not exists (select 1 from attachments x where x.legacy_bubble_id = 'jub2conv:iatt:' || r.id);

-- ── 9) ملاحظة التتبّع + الوسم على السندات + نص البحث + آخر نشاط ────────────
insert into service_request_notes (service_request_id, note, created_by, created_at, updated_at)
select g.sr_id,
 'محوَّلة آلياً من سندات قبض مكتب JUB1 — عدد السندات: ' || g.members || E'\nالسندات: ' || coalesce(x.lines,'—') ||
 case when g.date_flag = 'implausible_date' then E'\n⚠ تاريخ السند غير منطقي (خطأ قراءة) — يحتاج تصحيح' else '' end ||
 case when g.total_adjusted then E'\n⚠ الإجمالي عُدِّل ليساوي المقبوض' else '' end,
 null, g.inv_ts, g.inv_ts
from _jub2_grp g
left join lateral (
  select string_agg('• سند ' || coalesce(r.primary_receipt_no,'؟') || ' — ' ||
    coalesce(to_char(r.receipt_date,'YYYY-MM-DD'),'بلا تاريخ') || ' — ' || coalesce(r.primary_receipt_amount::text,'0') || ' ر.س' ||
    case when r.review_status = 'cancelled' then ' (ملغي)' else '' end ||
    case when r.notes is not null then ' — ' || r.notes else '' end, E'\n'
    order by r.receipt_date nulls last, r.created_at) lines
  from _jub2_cc2 c join jub1_receipts r on r.id = c.receipt_id where c.comp = g.comp) x on true
where g.comp in (select comp from _jub2_todo) and g.sr_id is not null
  and not exists (select 1 from service_request_notes n where n.service_request_id = g.sr_id and n.note like 'محوَّلة آلياً من سندات قبض%');

update jub1_receipts r set converted_invoice_id = g.inv_id, converted_at = now()
from _jub2_cc2 c join _jub2_grp g on g.comp = c.comp
where r.id = c.receipt_id and r.deleted_at is null and c.comp in (select comp from _jub2_todo);

update invoices i
set last_activity_at = greatest(i.created_at, coalesce(lp.mx, i.created_at)),
    updated_at = greatest(i.created_at, coalesce(lp.mx, i.created_at)),
    search_text = invoice_build_search_text(i.id)
from _jub2_grp g
left join lateral (select max(p.payment_date) mx from payments p where p.invoice_id = g.inv_id) lp on true
where i.id = g.inv_id and g.comp in (select comp from _jub2_todo);

alter table invoices enable trigger wa_invoices_aiu;
alter table payments enable trigger wa_payments_aiu;

commit;
