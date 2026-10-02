-- متابعة الإيداعات: اليوم = **يوم العمل** (يبدأ 5 فجراً بتوقيت الرياض) كبقيّة البرنامج
-- (home_dashboard · invoice_period_stats · سجل الفواتير). دفعةٌ بعد منتصف الليل وقبل
-- الخامسة تُحسب على اليوم السابق. يسري على العرضين: المجاميع وسطور التفصيل.
CREATE OR REPLACE VIEW public.v_ops_office_deposits AS
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
            jsonb_agg(jsonb_build_object('a', pay.amount, 'i', pay.invoice_no, 'f', COALESCE(( SELECT jsonb_agg(jsonb_build_object('n', a.file_name, 'u', a.file_url, 'm', a.mime_type) ORDER BY a.created_at)
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
            count(*) AS payments_count
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

CREATE OR REPLACE VIEW public.v_ops_office_deposit_lines AS
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
  WHERE p.deleted_at IS NULL AND COALESCE(p.is_valid, true) AND b.deleted_at IS NULL AND b.is_active AND NOT COALESCE(b.is_test, false);
