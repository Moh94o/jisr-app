-- «رسالة السداد» في شيت «تجديد الإقامات» تطرح خصم أبشر من رسم التجديد المفوتر
-- (رصيد العامل في أبشر يُستهلك في رسم تجديد إقامته، فما يُسدَّد في البوّابة هو
-- الرسم ناقصَه — كما تُطبَع الفاتورة نفسها). فيلزم العمود على صفّ الشيت كبقيّة
-- الرسوم التي يمرّرها العرض من الحسبة.
-- ⚠️ يُضاف في **ذيل** قائمة الأعمدة: create or replace view لا يقبل غير الإلحاق.
create or replace view public.v_ops_iqama_renewals as
 SELECT t.id,
    t.invoice_id,
    i.invoice_no,
    i.created_at AS invoice_at,
    ist.code AS invoice_status_code,
    ist.value_ar AS invoice_status_ar,
    i.total_amount AS invoice_total,
    i.paid_amount,
    i.remaining_amount,
        CASE
            WHEN COALESCE(i.remaining_amount, 0::numeric) <= 0::numeric AND COALESCE(i.total_amount, 0::numeric) > 0::numeric THEN 'مدفوعة'::text
            WHEN COALESCE(i.paid_amount, 0::numeric) > 0::numeric THEN 'مدفوعة جزئياً'::text
            ELSE 'غير مدفوعة'::text
        END AS payment_state,
    b.branch_code,
    svc.value_ar AS service_ar,
    svc.code AS service_code,
    sr.id AS service_request_id,
    sr.request_ref_no,
    rst.code AS request_status_code,
    rst.value_ar AS request_status_ar,
    sr.completed_at AS request_completed_at,
    c.name_ar AS client_name,
    c.phone AS client_phone,
    ag.name_ar AS agent_name,
    ag.phone AS agent_phone,
    f.name_ar AS facility_ar,
    f.unified_number::text AS unified_number,
    f.gosi_number,
    f.hrsd_number,
    t.quote_no,
    t.worker_id,
    t.worker_name,
    t.iqama_number,
    COALESCE(NULLIF(btrim(t.phone::text), ''::text), w.phone::text) AS phone,
    COALESCE(NULLIF(btrim(t.nationality), ''::text), nat.name_ar::text, w.nationality_ar) AS nationality_ar,
    COALESCE(NULLIF(btrim(t.occupation_name_ar), ''::text), w.occupation_ar) AS occupation_ar,
    t.new_occupation_name_ar,
    t.new_occupation_id,
    t.change_profession,
    t.prof_change_fee,
    w.passport_number,
    COALESCE(t.iqama_expiry_gregorian, w.iqama_expiry_date) AS iqama_expiry_gregorian,
    t.iqama_expired,
    t.renewal_months,
    t.billed_renewal_months,
    t.expected_duration_months,
    t.expected_expiry_date,
    t.total_amount AS calc_total,
    t.iqama_renewal_fee,
    t.work_permit_fee,
    t.late_fine_amount,
    t.medical_fee,
    t.office_fee,
    t.exemption,
    ops_txn_stage_ar((t.stage_data -> 'insurance'::text) ->> 'status'::text) AS insurance_status_ar,
    COALESCE(NULLIF((t.stage_data -> 'insurance'::text) ->> 'company'::text, ''::text), t.medical_insurance_company) AS insurance_company,
    COALESCE(NULLIF((t.stage_data -> 'insurance'::text) ->> 'policy_no'::text, ''::text), t.medical_insurance_policy) AS insurance_policy_no,
    COALESCE(NULLIF((t.stage_data -> 'insurance'::text) ->> 'expiry'::text, ''::text)::date, t.medical_insurance_end) AS insurance_expiry,
    NULLIF((t.stage_data -> 'insurance'::text) ->> 'amount'::text, ''::text)::numeric AS insurance_amount,
    t.medical_insured,
    ops_txn_stage_ar((t.stage_data -> 'work_permit'::text) ->> 'status'::text) AS work_permit_status_ar,
    NULLIF((t.stage_data -> 'work_permit'::text) ->> 'duration_months'::text, ''::text)::smallint AS work_permit_months,
    COALESCE(NULLIF((t.stage_data -> 'work_permit'::text) ->> 'expiry'::text, ''::text)::date, t.work_permit_expiry) AS work_permit_expiry,
    NULLIF((t.stage_data -> 'work_permit'::text) ->> 'amount'::text, ''::text)::numeric AS work_permit_amount,
    ops_txn_stage_ar((t.stage_data -> 'iqama'::text) ->> 'status'::text) AS iqama_status_ar,
    NULLIF((t.stage_data -> 'iqama'::text) ->> 'iqama_expiry'::text, ''::text)::date AS iqama_expiry,
    NULLIF((t.stage_data -> 'iqama'::text) ->> 'amount'::text, ''::text)::numeric AS iqama_amount,
    COALESCE(NULLIF((t.stage_data -> 'iqama'::text) ->> 'occupation_name_ar'::text, ''::text),
        CASE
            WHEN COALESCE(t.prof_change_fee, 0::numeric) > 0::numeric THEN NULLIF(btrim(t.new_occupation_name_ar), ''::text)
            ELSE NULL::text
        END, t.occupation_name_ar, w.occupation_ar) AS iqama_occupation_ar,
    t.stage_data,
    t.priced_at,
    t.created_at,
    t.updated_at,
    w.birth_date,
    w.photo_path,
    t.absher_discount
   FROM iqama_renewal_calculation t
     JOIN invoices i ON i.id = t.invoice_id AND i.deleted_at IS NULL
     LEFT JOIN service_requests sr ON sr.id = i.service_request_id
     LEFT JOIN lookup_items ist ON ist.id = i.status_id
     LEFT JOIN lookup_items rst ON rst.id = sr.status_id
     LEFT JOIN lookup_items svc ON svc.id = COALESCE(i.service_type_id, sr.service_type_id)
     LEFT JOIN branches b ON b.id = COALESCE(i.branch_id, sr.branch_id)
     LEFT JOIN clients c ON c.id = sr.client_id
     LEFT JOIN agents ag ON ag.id = i.agent_id
     LEFT JOIN workers w ON w.id = t.worker_id
     LEFT JOIN nationalities nat ON nat.id = t.nationality_id
     LEFT JOIN facilities f ON f.id = COALESCE(sr.facility_id, w.current_facility_id)
  WHERE t.deleted_at IS NULL AND t.cancelled_at IS NULL AND COALESCE(ist.code, ''::character varying)::text <> 'cancelled'::text;
