-- متابعة الإيداعات: «المبلغ» = صافي دخل الكاش (قرار المستخدم 2026-10-04).
--   صافي اليوم = نقد اليوم − كامل المسدَّد على الفواتير التي أُلغيت ذلك اليوم.
-- «كامل المسدَّد» = صافي دفعات الفاتورة السارية **بكل طرق الدفع** (نقد وحوالة)
-- بما فيها دفعات الاسترداد السالبة، فما سُجّل له استرداد بيدٍ لا يُخصم مرّتين.
-- ويوم الإلغاء = آخر `cancel_log.at` وإلا `created_at` — لا `updated_at` أبداً.
-- مثال التحقّق (الدمام - سيكو 2026-07-15): نقد 10,650 − ملغاة 4,500 (فاتورة
-- 2921154941 دُفعت بحوالتين) = 6,150 — وهو رقم المحاسب في الإكسل.
-- ⚠️ نسخة سابقة في اليوم نفسه خصمت الشقّ **النقدي** وحده فلم تُخرج هذا الرقم،
-- فأُلغيت بطلب المستخدم. يوم الدفع لا يتغيّر في الحالين.

create or replace view public.v_ops_office_cancel_refunds as
select b.id as branch_id,
       b.branch_code,
       b.name_ar as branch_name_ar,
       i.id as invoice_id,
       i.invoice_no,
       coalesce((i.cancel_log -> -1 ->> 'at')::timestamptz, i.created_at) as cancel_at,
       ((coalesce((i.cancel_log -> -1 ->> 'at')::timestamptz, i.created_at) at time zone 'Asia/Riyadh') - interval '05:00:00')::date as cancel_day,
       sum(p.amount) as net_paid,
       i.cancel_log -> -1 ->> 'reason' as reason,
       i.cancel_log -> -1 ->> 'by_name' as by_name
  from invoices i
  join lookup_items st on st.id = i.status_id and st.code = 'cancelled'
  join payments p on p.invoice_id = i.id and p.deleted_at is null and coalesce(p.is_valid, true)
  join branches b on b.id = coalesce(p.branch_id, i.branch_id)
 where i.deleted_at is null and b.deleted_at is null and b.is_active and not coalesce(b.is_test, false)
 group by b.id, i.id
having sum(p.amount) > 0;

-- عرضٌ مساعد يقرؤه العرضان أدناه وحدهما — لا يُفتح للواجهة مباشرةً
revoke all on public.v_ops_office_cancel_refunds from anon, authenticated;

create or replace view public.v_ops_office_deposits as
 WITH pay AS (
         SELECT b.id AS branch_id,
            b.branch_code,
            b.name_ar AS branch_name_ar,
            ((p.payment_date AT TIME ZONE 'Asia/Riyadh'::text) - '05:00:00'::interval)::date AS pay_date,
            li.code AS method,
            p.amount,
            p.id AS payment_id,
            p.payment_date AS paid_at,
            i.invoice_no
           FROM payments p
             JOIN invoices i ON i.id = p.invoice_id AND i.deleted_at IS NULL
             JOIN branches b ON b.id = COALESCE(p.branch_id, i.branch_id)
             LEFT JOIN lookup_items li ON li.id = p.payment_method_id
          WHERE p.deleted_at IS NULL AND COALESCE(p.is_valid, true) AND b.deleted_at IS NULL AND b.is_active AND NOT COALESCE(b.is_test, false)
        UNION ALL
         -- الفاتورة الملغاة: كامل مسدَّدها سطرٌ سالب على نقد يوم الإلغاء
         SELECT r.branch_id,
            r.branch_code,
            r.branch_name_ar,
            r.cancel_day AS pay_date,
            'cash'::character varying AS method,
            - r.net_paid AS amount,
            NULL::uuid AS payment_id,
            r.cancel_at AS paid_at,
            r.invoice_no
           FROM v_ops_office_cancel_refunds r
        ), files AS (
         SELECT pay.branch_code,
            pay.pay_date,
            jsonb_agg(jsonb_build_object('n', a.file_name, 'u', a.file_url, 'm', a.mime_type) ORDER BY a.created_at) AS bank_files
           FROM pay
             JOIN attachments a ON a.entity_type = 'payment'::text AND a.entity_id = pay.payment_id AND a.deleted_at IS NULL
          WHERE pay.method::text = 'bank_transfer'::text
          GROUP BY pay.branch_code, pay.pay_date
        ), transfers AS (
         SELECT pay.branch_code,
            pay.pay_date,
            jsonb_agg(jsonb_build_object('a', pay.amount, 'i', pay.invoice_no, 'f', COALESCE(( SELECT jsonb_agg(jsonb_build_object('n', a.file_name, 'u', a.file_url, 'm', a.mime_type) ORDER BY a.created_at) AS jsonb_agg
                   FROM attachments a
                  WHERE a.entity_type = 'payment'::text AND a.entity_id = pay.payment_id AND a.deleted_at IS NULL), '[]'::jsonb)) ORDER BY pay.paid_at, pay.payment_id) AS bank_transfers
           FROM pay
          WHERE pay.method::text = 'bank_transfer'::text
          GROUP BY pay.branch_code, pay.pay_date
        ), agg AS (
         SELECT pay.branch_id,
            pay.branch_code,
            pay.branch_name_ar,
            pay.pay_date,
            COALESCE(sum(pay.amount) FILTER (WHERE pay.method::text = 'cash'::text), 0::numeric) AS cash_total,
            COALESCE(sum(pay.amount) FILTER (WHERE pay.method::text = 'bank_transfer'::text), 0::numeric) AS bank_total,
            COALESCE(sum(pay.amount) FILTER (WHERE pay.method::text IS DISTINCT FROM 'cash'::text AND pay.method::text IS DISTINCT FROM 'bank_transfer'::text), 0::numeric) AS other_total,
            count(pay.payment_id) AS payments_count
           FROM pay
          GROUP BY pay.branch_id, pay.branch_code, pay.branch_name_ar, pay.pay_date
        )
 SELECT agg.branch_id,
    agg.branch_code,
    agg.branch_name_ar,
    agg.pay_date,
    agg.cash_total,
    agg.bank_total,
    agg.other_total,
    agg.payments_count,
    COALESCE(f.bank_files, '[]'::jsonb) AS bank_files,
    COALESCE(t.bank_transfers, '[]'::jsonb) AS bank_transfers
   FROM agg
     LEFT JOIN files f ON f.branch_code::text = agg.branch_code::text AND f.pay_date = agg.pay_date
     LEFT JOIN transfers t ON t.branch_code::text = agg.branch_code::text AND t.pay_date = agg.pay_date;

create or replace view public.v_ops_office_deposit_lines as
 SELECT b.branch_code,
    ((p.payment_date AT TIME ZONE 'Asia/Riyadh'::text) - '05:00:00'::interval)::date AS pay_date,
    p.id AS payment_id,
    p.amount,
    li.code AS method_code,
    li.value_ar AS method_ar,
    p.receipt_no,
    p.bank_reference,
    p.notes,
    i.invoice_no,
    i.id AS invoice_id,
    st.value_ar AS service_ar,
    COALESCE(NULLIF(TRIM(BOTH FROM c.name_ar), ''::text), c.name_en) AS client_name,
    f.name_ar AS facility_ar,
    up.name_ar AS created_by_name,
    p.payment_date AS paid_at
   FROM payments p
     JOIN invoices i ON i.id = p.invoice_id AND i.deleted_at IS NULL
     JOIN branches b ON b.id = COALESCE(p.branch_id, i.branch_id)
     LEFT JOIN lookup_items li ON li.id = p.payment_method_id
     LEFT JOIN lookup_items st ON st.id = i.service_type_id
     LEFT JOIN service_requests sr ON sr.id = i.service_request_id
     LEFT JOIN clients c ON c.id = sr.client_id
     LEFT JOIN facilities f ON f.id = sr.facility_id
     LEFT JOIN users u ON u.id = p.created_by
     LEFT JOIN persons up ON up.id = u.person_id
  WHERE p.deleted_at IS NULL AND COALESCE(p.is_valid, true) AND b.deleted_at IS NULL AND b.is_active AND NOT COALESCE(b.is_test, false)
UNION ALL
 -- سطر الملغاة في تفصيل اليوم: مجموع سطور «نقد» يبقى مساوياً لرقم الشيت
 SELECT r.branch_code,
    r.cancel_day AS pay_date,
    NULL::uuid AS payment_id,
    (- r.net_paid)::numeric(12,2) AS amount,
    'cash'::character varying AS method_code,
    'فاتورة ملغاة'::character varying AS method_ar,
    NULL::text AS receipt_no,
    NULL::text AS bank_reference,
    r.reason AS notes,
    r.invoice_no,
    r.invoice_id,
    st.value_ar AS service_ar,
    COALESCE(NULLIF(TRIM(BOTH FROM c.name_ar), ''::text), c.name_en) AS client_name,
    f.name_ar AS facility_ar,
    r.by_name AS created_by_name,
    r.cancel_at AS paid_at
   FROM v_ops_office_cancel_refunds r
     JOIN invoices i ON i.id = r.invoice_id
     LEFT JOIN lookup_items st ON st.id = i.service_type_id
     LEFT JOIN service_requests sr ON sr.id = i.service_request_id
     LEFT JOIN clients c ON c.id = sr.client_id
     LEFT JOIN facilities f ON f.id = sr.facility_id;
