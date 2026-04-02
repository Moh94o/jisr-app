-- ══════════════════════════════════════════════════════════════════════
-- جسر للأعمال — Migration v3 — 15 Features Enhancement
-- Run this in Supabase SQL Editor AFTER migration_v2.sql
-- ══════════════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │  #1  لوحة KPI ذكية مع أهداف شهرية                                │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS monthly_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_month DATE NOT NULL, -- أول يوم بالشهر مثلاً 2025-01-01
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL, -- NULL = كل الفروع
  metric_key TEXT NOT NULL CHECK (metric_key IN (
    'revenue','collection','collection_pct','transactions_completed',
    'sla_compliance_pct','new_clients','expenses_limit','profit',
    'workers_processed','invoices_issued'
  )),
  target_value NUMERIC(14,2) NOT NULL,
  actual_value NUMERIC(14,2) DEFAULT 0,
  previous_value NUMERIC(14,2) DEFAULT 0, -- قيمة الشهر السابق للمقارنة
  unit TEXT DEFAULT 'number' CHECK (unit IN ('number','currency','percentage')),
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(target_month, branch_id, metric_key)
);

CREATE INDEX idx_monthly_targets_month ON monthly_targets(target_month DESC);
CREATE INDEX idx_monthly_targets_branch ON monthly_targets(branch_id, target_month DESC);

-- دالة تحديث القيم الفعلية للأهداف
CREATE OR REPLACE FUNCTION update_kpi_actuals(p_month DATE DEFAULT date_trunc('month', CURRENT_DATE)::DATE)
RETURNS void AS $$
DECLARE
  m_start DATE := p_month;
  m_end DATE := (p_month + INTERVAL '1 month')::DATE;
  prev_start DATE := (p_month - INTERVAL '1 month')::DATE;
BEGIN
  -- تحديث الإيرادات
  UPDATE monthly_targets mt SET
    actual_value = COALESCE(s.val, 0),
    previous_value = COALESCE(p.val, 0),
    updated_at = now()
  FROM (
    SELECT branch_id, SUM(total_amount) as val FROM invoices
    WHERE deleted_at IS NULL AND issue_date >= m_start AND issue_date < m_end
    GROUP BY branch_id
  ) s
  LEFT JOIN (
    SELECT branch_id, SUM(total_amount) as val FROM invoices
    WHERE deleted_at IS NULL AND issue_date >= prev_start AND issue_date < m_start
    GROUP BY branch_id
  ) p ON p.branch_id IS NOT DISTINCT FROM s.branch_id
  WHERE mt.metric_key = 'revenue' AND mt.target_month = m_start
    AND mt.branch_id IS NOT DISTINCT FROM s.branch_id;

  -- تحديث التحصيل
  UPDATE monthly_targets mt SET
    actual_value = COALESCE(s.val, 0),
    updated_at = now()
  FROM (
    SELECT i.branch_id, SUM(ip.amount) as val FROM invoice_payments ip
    JOIN invoices i ON i.id = ip.invoice_id
    WHERE ip.deleted_at IS NULL AND ip.payment_date >= m_start AND ip.payment_date < m_end
    GROUP BY i.branch_id
  ) s
  WHERE mt.metric_key = 'collection' AND mt.target_month = m_start
    AND mt.branch_id IS NOT DISTINCT FROM s.branch_id;

  -- تحديث المعاملات المكتملة
  UPDATE monthly_targets mt SET
    actual_value = COALESCE(s.val, 0),
    updated_at = now()
  FROM (
    SELECT branch_id, COUNT(*) as val FROM transactions
    WHERE deleted_at IS NULL AND status = 'completed'
      AND completed_date >= m_start AND completed_date < m_end
    GROUP BY branch_id
  ) s
  WHERE mt.metric_key = 'transactions_completed' AND mt.target_month = m_start
    AND mt.branch_id IS NOT DISTINCT FROM s.branch_id;

  -- تحديث العملاء الجدد
  UPDATE monthly_targets mt SET
    actual_value = COALESCE(s.val, 0),
    updated_at = now()
  FROM (
    SELECT branch_id, COUNT(*) as val FROM clients
    WHERE deleted_at IS NULL AND created_at >= m_start AND created_at < m_end
    GROUP BY branch_id
  ) s
  WHERE mt.metric_key = 'new_clients' AND mt.target_month = m_start
    AND mt.branch_id IS NOT DISTINCT FROM s.branch_id;

  -- تحديث المصاريف
  UPDATE monthly_targets mt SET
    actual_value = COALESCE(s.val, 0),
    updated_at = now()
  FROM (
    SELECT branch_id, SUM(amount) as val FROM operational_expenses
    WHERE deleted_at IS NULL AND date >= m_start AND date < m_end
    GROUP BY branch_id
  ) s
  WHERE mt.metric_key = 'expenses_limit' AND mt.target_month = m_start
    AND mt.branch_id IS NOT DISTINCT FROM s.branch_id;
END;
$$ LANGUAGE plpgsql;


-- ┌─────────────────────────────────────────────────────────────────────┐
-- │  #2  تنبيهات واتساب تلقائية قبل انتهاء المستندات                  │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS auto_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('worker','facility','client','invoice','installment')),
  field_name TEXT NOT NULL, -- مثلاً iqama_expiry_date أو cr_expiry_date
  days_before INTEGER[] NOT NULL DEFAULT '{30,15,7}', -- أيام التنبيه
  channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp','sms','internal','email')),
  template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  send_to TEXT NOT NULL DEFAULT 'client' CHECK (send_to IN ('client','employee','manager','all')),
  create_task BOOLEAN DEFAULT false, -- إنشاء مهمة تلقائياً
  task_title_template TEXT, -- مثلاً "تجديد إقامة {worker_name}"
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auto_alert_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES auto_alert_rules(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_name TEXT,
  alert_date DATE NOT NULL DEFAULT CURRENT_DATE,
  days_remaining INTEGER,
  channel TEXT NOT NULL,
  recipient_phone TEXT,
  recipient_name TEXT,
  message_body TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','skipped')),
  error_message TEXT,
  task_id UUID, -- لو أنشأت مهمة
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_auto_alert_log_date ON auto_alert_log(alert_date DESC);
CREATE INDEX idx_auto_alert_log_entity ON auto_alert_log(entity_type, entity_id);
CREATE INDEX idx_auto_alert_log_status ON auto_alert_log(status) WHERE status = 'pending';

-- إدخال قواعد التنبيه الافتراضية
INSERT INTO auto_alert_rules (name_ar, name_en, entity_type, field_name, days_before, channel, send_to, create_task, task_title_template) VALUES
('انتهاء الإقامة', 'Iqama Expiry', 'worker', 'iqama_expiry_date', '{30,15,7}', 'whatsapp', 'client', true, 'تجديد إقامة {name}'),
('انتهاء الجواز', 'Passport Expiry', 'worker', 'passport_expiry', '{60,30,15}', 'whatsapp', 'client', true, 'تجديد جواز {name}'),
('انتهاء السجل التجاري', 'CR Expiry', 'facility', 'cr_expiry_date', '{60,30,15}', 'internal', 'employee', true, 'تجديد سجل {name}'),
('انتهاء رخصة العمل', 'Work Permit Expiry', 'worker', 'wp_expiry_date', '{30,15,7}', 'whatsapp', 'client', true, 'تجديد رخصة عمل {name}'),
('انتهاء عضوية الغرفة', 'Chamber Expiry', 'facility', 'chamber_membership_expiry', '{45,30,15}', 'internal', 'employee', true, 'تجديد عضوية الغرفة {name}'),
('قسط مستحق', 'Installment Due', 'installment', 'due_date', '{7,3,1}', 'whatsapp', 'client', false, NULL)
ON CONFLICT DO NOTHING;


-- ┌─────────────────────────────────────────────────────────────────────┐
-- │  #3  داشبورد أداء الموظفين — View محسّن                            │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE VIEW v_employee_performance_detailed AS
WITH current_month AS (
  SELECT date_trunc('month', CURRENT_DATE)::DATE as m_start,
         (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::DATE as m_end
),
prev_month AS (
  SELECT (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::DATE as m_start,
         date_trunc('month', CURRENT_DATE)::DATE as m_end
),
txn_stats AS (
  SELECT
    t.assigned_to as user_id,
    COUNT(*) FILTER (WHERE t.status = 'completed' AND t.completed_date >= cm.m_start AND t.completed_date < cm.m_end) as completed_this_month,
    COUNT(*) FILTER (WHERE t.status = 'completed' AND t.completed_date >= pm.m_start AND t.completed_date < pm.m_end) as completed_last_month,
    COUNT(*) FILTER (WHERE t.status = 'in_progress') as active_now,
    AVG(EXTRACT(DAY FROM (t.completed_date::TIMESTAMP - t.created_at))) FILTER (WHERE t.status = 'completed' AND t.completed_date IS NOT NULL) as avg_completion_days
  FROM transactions t, current_month cm, prev_month pm
  WHERE t.deleted_at IS NULL AND t.assigned_to IS NOT NULL
  GROUP BY t.assigned_to
),
invoice_stats AS (
  SELECT
    i.created_by as user_id,
    COUNT(*) FILTER (WHERE i.created_at >= cm.m_start AND i.created_at < cm.m_end) as invoices_this_month,
    SUM(COALESCE(i.paid_amount,0)) FILTER (WHERE i.created_at >= cm.m_start AND i.created_at < cm.m_end) as collected_this_month,
    SUM(COALESCE(i.total_amount,0)) FILTER (WHERE i.created_at >= cm.m_start AND i.created_at < cm.m_end) as revenue_this_month
  FROM invoices i, current_month cm
  WHERE i.deleted_at IS NULL AND i.created_by IS NOT NULL
  GROUP BY i.created_by
),
task_stats AS (
  SELECT
    tk.assigned_to as user_id,
    COUNT(*) FILTER (WHERE tk.status = 'completed' AND tk.completed_date >= cm.m_start) as tasks_completed,
    COUNT(*) FILTER (WHERE tk.status = 'overdue') as tasks_overdue,
    COUNT(*) FILTER (WHERE tk.status IN ('pending','in_progress')) as tasks_pending,
    CASE
      WHEN COUNT(*) FILTER (WHERE tk.due_date IS NOT NULL AND tk.status IN ('completed','overdue')) > 0
      THEN ROUND(100.0 * COUNT(*) FILTER (WHERE tk.status = 'completed' AND tk.completed_date <= tk.due_date)
           / NULLIF(COUNT(*) FILTER (WHERE tk.due_date IS NOT NULL AND tk.status IN ('completed','overdue')), 0), 1)
      ELSE NULL
    END as on_time_pct
  FROM tasks tk, current_month cm
  WHERE tk.deleted_at IS NULL AND tk.assigned_to IS NOT NULL
  GROUP BY tk.assigned_to
),
escalation_stats AS (
  SELECT
    from_user_id as user_id,
    COUNT(*) as escalation_count
  FROM escalations
  WHERE created_at >= date_trunc('month', CURRENT_DATE)
  GROUP BY from_user_id
)
SELECT
  u.id as user_id,
  u.name_ar,
  u.name_en,
  u.email,
  r.name_ar as role_name,
  u.branch_id,
  -- معاملات
  COALESCE(ts.completed_this_month, 0) as txn_completed,
  COALESCE(ts.completed_last_month, 0) as txn_completed_prev,
  COALESCE(ts.active_now, 0) as txn_active,
  ROUND(COALESCE(ts.avg_completion_days, 0)::NUMERIC, 1) as avg_completion_days,
  -- فواتير
  COALESCE(invs.invoices_this_month, 0) as invoices_created,
  COALESCE(invs.collected_this_month, 0) as amount_collected,
  COALESCE(invs.revenue_this_month, 0) as revenue_generated,
  -- مهام
  COALESCE(tks.tasks_completed, 0) as tasks_done,
  COALESCE(tks.tasks_overdue, 0) as tasks_overdue,
  COALESCE(tks.tasks_pending, 0) as tasks_pending,
  COALESCE(tks.on_time_pct, 0) as tasks_on_time_pct,
  -- تصعيدات
  COALESCE(es.escalation_count, 0) as escalations,
  -- نقاط الأداء المركّبة
  (
    COALESCE(ts.completed_this_month, 0) * 10 +
    COALESCE(tks.tasks_completed, 0) * 5 +
    COALESCE(invs.invoices_this_month, 0) * 3 -
    COALESCE(tks.tasks_overdue, 0) * 8 -
    COALESCE(es.escalation_count, 0) * 5
  ) as performance_score
FROM users u
LEFT JOIN roles r ON r.id = u.role_id
LEFT JOIN txn_stats ts ON ts.user_id = u.id
LEFT JOIN invoice_stats invs ON invs.user_id = u.id
LEFT JOIN task_stats tks ON tks.user_id = u.id
LEFT JOIN escalation_stats es ON es.user_id = u.id
WHERE u.deleted_at IS NULL AND u.is_active = true;


-- ┌─────────────────────────────────────────────────────────────────────┐
-- │  #4  تقرير التدفق النقدي مع التوقعات                              │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE VIEW v_cash_flow_forecast AS
WITH date_series AS (
  SELECT generate_series(
    date_trunc('week', CURRENT_DATE)::DATE,
    (CURRENT_DATE + INTERVAL '8 weeks')::DATE,
    '1 week'::INTERVAL
  )::DATE as week_start
),
weekly_inflow AS (
  SELECT
    date_trunc('week', inst.due_date)::DATE as week_start,
    SUM(inst.amount - COALESCE(inst.paid_amount, 0)) as expected_inflow,
    COUNT(*) as installment_count
  FROM installments inst
  JOIN invoices i ON i.id = inst.invoice_id AND i.deleted_at IS NULL
  WHERE inst.status IN ('pending','partial','overdue')
    AND inst.due_date >= CURRENT_DATE
    AND inst.due_date < CURRENT_DATE + INTERVAL '8 weeks'
  GROUP BY date_trunc('week', inst.due_date)::DATE
),
weekly_outflow AS (
  SELECT
    date_trunc('week', oe.date)::DATE as week_start,
    SUM(oe.amount) as actual_outflow
  FROM operational_expenses oe
  WHERE oe.deleted_at IS NULL
    AND oe.date >= date_trunc('week', CURRENT_DATE)::DATE
    AND oe.date < CURRENT_DATE + INTERVAL '8 weeks'
  GROUP BY date_trunc('week', oe.date)::DATE
),
recurring_outflow AS (
  SELECT
    AVG(monthly_total)::NUMERIC(12,2) / 4 as weekly_recurring
  FROM (
    SELECT date_trunc('month', date)::DATE as m, SUM(amount) as monthly_total
    FROM operational_expenses
    WHERE deleted_at IS NULL AND is_recurring = true
      AND date >= CURRENT_DATE - INTERVAL '3 months'
    GROUP BY date_trunc('month', date)::DATE
  ) sub
),
actual_inflow AS (
  SELECT
    date_trunc('week', ip.payment_date)::DATE as week_start,
    SUM(ip.amount) as collected
  FROM invoice_payments ip
  WHERE ip.deleted_at IS NULL
    AND ip.payment_date >= date_trunc('week', CURRENT_DATE)::DATE - INTERVAL '8 weeks'
  GROUP BY date_trunc('week', ip.payment_date)::DATE
)
SELECT
  ds.week_start,
  ds.week_start + 6 as week_end,
  COALESCE(wi.expected_inflow, 0) as expected_inflow,
  COALESCE(wi.installment_count, 0) as pending_installments,
  COALESCE(wo.actual_outflow, COALESCE(ro.weekly_recurring, 0)) as expected_outflow,
  COALESCE(wi.expected_inflow, 0) - COALESCE(wo.actual_outflow, COALESCE(ro.weekly_recurring, 0)) as net_flow,
  SUM(COALESCE(wi.expected_inflow, 0) - COALESCE(wo.actual_outflow, COALESCE(ro.weekly_recurring, 0)))
    OVER (ORDER BY ds.week_start) as cumulative_flow,
  COALESCE(ai.collected, 0) as actual_collected,
  CASE
    WHEN COALESCE(wi.expected_inflow, 0) - COALESCE(wo.actual_outflow, COALESCE(ro.weekly_recurring, 0)) < 0 THEN 'deficit'
    WHEN COALESCE(wi.expected_inflow, 0) - COALESCE(wo.actual_outflow, COALESCE(ro.weekly_recurring, 0)) < 5000 THEN 'tight'
    ELSE 'healthy'
  END as status
FROM date_series ds
LEFT JOIN weekly_inflow wi ON wi.week_start = ds.week_start
LEFT JOIN weekly_outflow wo ON wo.week_start = ds.week_start
CROSS JOIN recurring_outflow ro
LEFT JOIN actual_inflow ai ON ai.week_start = ds.week_start
ORDER BY ds.week_start;


-- ┌─────────────────────────────────────────────────────────────────────┐
-- │  #5  نظام SLA لمراقبة وقت الإنجاز                                 │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS sla_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type_id UUID, -- من transaction_types
  transaction_type_code TEXT, -- fallback بالكود
  name_ar TEXT NOT NULL,
  name_en TEXT,
  target_days INTEGER NOT NULL DEFAULT 5,
  warning_pct INTEGER NOT NULL DEFAULT 80, -- تنبيه عند 80% من الوقت
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- إدخال SLA افتراضية
INSERT INTO sla_definitions (transaction_type_code, name_ar, name_en, target_days) VALUES
('TRANSFER', 'نقل كفالة', 'Sponsorship Transfer', 5),
('IQAMA_RENEW', 'تجديد إقامة', 'Iqama Renewal', 3),
('WP_ISSUE', 'إصدار رخصة عمل', 'Work Permit Issue', 2),
('WP_RENEW', 'تجديد رخصة عمل', 'Work Permit Renewal', 2),
('RECRUIT', 'استقدام', 'Recruitment', 30),
('CR_RENEW', 'تجديد سجل تجاري', 'CR Renewal', 3),
('EXIT_REENTRY', 'خروج وعودة', 'Exit Re-entry', 2),
('FINAL_EXIT', 'خروج نهائي', 'Final Exit', 3),
('PROFESSION_CHANGE', 'تغيير مهنة', 'Profession Change', 5),
('GOSI_REG', 'تسجيل تأمينات', 'GOSI Registration', 2)
ON CONFLICT DO NOTHING;

-- View لمتابعة SLA لكل معاملة
CREATE OR REPLACE VIEW v_transaction_sla AS
SELECT
  t.id as transaction_id,
  t.transaction_number,
  t.status,
  t.created_at,
  t.completed_date,
  tt.code as type_code,
  tt.name_ar as type_name,
  t.assigned_to,
  u.name_ar as assigned_name,
  t.branch_id,
  sla.target_days,
  sla.warning_pct,
  -- أيام منذ الإنشاء
  EXTRACT(DAY FROM (COALESCE(t.completed_date::TIMESTAMP, now()) - t.created_at))::INTEGER as elapsed_days,
  -- نسبة الاستهلاك من الوقت
  CASE WHEN sla.target_days > 0
    THEN ROUND(100.0 * EXTRACT(DAY FROM (COALESCE(t.completed_date::TIMESTAMP, now()) - t.created_at)) / sla.target_days, 0)
    ELSE 0
  END as sla_usage_pct,
  -- الحالة
  CASE
    WHEN t.status = 'completed' AND EXTRACT(DAY FROM (t.completed_date::TIMESTAMP - t.created_at)) <= sla.target_days THEN 'on_time'
    WHEN t.status = 'completed' AND EXTRACT(DAY FROM (t.completed_date::TIMESTAMP - t.created_at)) > sla.target_days THEN 'late'
    WHEN t.status != 'completed' AND EXTRACT(DAY FROM (now() - t.created_at)) > sla.target_days THEN 'breached'
    WHEN t.status != 'completed' AND 100.0 * EXTRACT(DAY FROM (now() - t.created_at)) / NULLIF(sla.target_days, 0) >= sla.warning_pct THEN 'at_risk'
    ELSE 'on_track'
  END as sla_status,
  -- الأيام المتبقية
  GREATEST(0, sla.target_days - EXTRACT(DAY FROM (now() - t.created_at))::INTEGER) as days_remaining,
  c.name_ar as client_name,
  w.name_ar as worker_name
FROM transactions t
LEFT JOIN transaction_types tt ON tt.id = t.transaction_type_id
LEFT JOIN sla_definitions sla ON sla.transaction_type_code = tt.code AND sla.is_active = true
LEFT JOIN users u ON u.id = t.assigned_to
LEFT JOIN clients c ON c.id = t.client_id
LEFT JOIN workers w ON w.id = t.worker_id
WHERE t.deleted_at IS NULL AND t.status NOT IN ('cancelled','draft');

-- ملخص SLA الشهري
CREATE OR REPLACE VIEW v_sla_monthly_summary AS
SELECT
  tt.code as type_code,
  tt.name_ar as type_name,
  sla.target_days,
  COUNT(*) as total_transactions,
  COUNT(*) FILTER (WHERE t.status = 'completed') as completed,
  COUNT(*) FILTER (WHERE t.status = 'completed'
    AND EXTRACT(DAY FROM (t.completed_date::TIMESTAMP - t.created_at)) <= sla.target_days) as on_time,
  COUNT(*) FILTER (WHERE t.status = 'completed'
    AND EXTRACT(DAY FROM (t.completed_date::TIMESTAMP - t.created_at)) > sla.target_days) as late,
  COUNT(*) FILTER (WHERE t.status NOT IN ('completed','cancelled','draft')
    AND EXTRACT(DAY FROM (now() - t.created_at)) > sla.target_days) as currently_breached,
  CASE
    WHEN COUNT(*) FILTER (WHERE t.status = 'completed') > 0
    THEN ROUND(100.0 * COUNT(*) FILTER (WHERE t.status = 'completed'
      AND EXTRACT(DAY FROM (t.completed_date::TIMESTAMP - t.created_at)) <= sla.target_days)
      / NULLIF(COUNT(*) FILTER (WHERE t.status = 'completed'), 0), 1)
    ELSE NULL
  END as compliance_pct,
  ROUND(AVG(EXTRACT(DAY FROM (t.completed_date::TIMESTAMP - t.created_at)))
    FILTER (WHERE t.status = 'completed')::NUMERIC, 1) as avg_days
FROM transactions t
LEFT JOIN transaction_types tt ON tt.id = t.transaction_type_id
LEFT JOIN sla_definitions sla ON sla.transaction_type_code = tt.code AND sla.is_active = true
WHERE t.deleted_at IS NULL
  AND t.created_at >= date_trunc('month', CURRENT_DATE)
GROUP BY tt.code, tt.name_ar, sla.target_days;


-- ┌─────────────────────────────────────────────────────────────────────┐
-- │  #6  تقويم تفاعلي موحّد                                           │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE VIEW v_unified_calendar AS
-- المواعيد
SELECT
  'appointment' as event_type,
  a.id as event_id,
  a.date as event_date,
  a.time as event_time,
  a.title as title_ar,
  a.type as sub_type,
  a.status,
  a.assigned_to,
  a.client_id as related_entity_id,
  'clients' as related_entity_table,
  c.name_ar as related_name,
  a.branch_id,
  '#c9a84c' as color
FROM appointments a
LEFT JOIN clients c ON c.id = a.client_id
WHERE a.deleted_at IS NULL

UNION ALL

-- المهام
SELECT
  'task' as event_type,
  tk.id as event_id,
  tk.due_date as event_date,
  NULL as event_time,
  tk.title_ar,
  tk.category as sub_type,
  tk.status,
  tk.assigned_to,
  NULL as related_entity_id,
  NULL as related_entity_table,
  u.name_ar as related_name,
  NULL as branch_id,
  '#3483b4' as color
FROM tasks tk
LEFT JOIN users u ON u.id = tk.assigned_to
WHERE tk.deleted_at IS NULL AND tk.status NOT IN ('completed','skipped','cancelled')

UNION ALL

-- أقساط مستحقة
SELECT
  'installment' as event_type,
  inst.id as event_id,
  inst.due_date as event_date,
  NULL as event_time,
  'قسط فاتورة ' || i.invoice_number as title_ar,
  'payment' as sub_type,
  inst.status,
  NULL as assigned_to,
  i.client_id as related_entity_id,
  'clients' as related_entity_table,
  c.name_ar as related_name,
  i.branch_id,
  '#c0392b' as color
FROM installments inst
JOIN invoices i ON i.id = inst.invoice_id AND i.deleted_at IS NULL
LEFT JOIN clients c ON c.id = i.client_id
WHERE inst.status IN ('pending','partial','overdue')

UNION ALL

-- انتهاء إقامات
SELECT
  'iqama_expiry' as event_type,
  w.id as event_id,
  w.iqama_expiry_date as event_date,
  NULL as event_time,
  'انتهاء إقامة ' || w.name_ar as title_ar,
  'document' as sub_type,
  CASE
    WHEN w.iqama_expiry_date <= CURRENT_DATE THEN 'expired'
    WHEN w.iqama_expiry_date <= CURRENT_DATE + 7 THEN 'urgent'
    ELSE 'warning'
  END as status,
  NULL as assigned_to,
  w.id as related_entity_id,
  'workers' as related_entity_table,
  w.name_ar as related_name,
  w.branch_id,
  '#c0392b' as color
FROM workers w
WHERE w.deleted_at IS NULL AND w.iqama_expiry_date IS NOT NULL
  AND w.iqama_expiry_date <= CURRENT_DATE + 60
  AND w.worker_status = 'active'

UNION ALL

-- انتهاء سجلات تجارية
SELECT
  'cr_expiry' as event_type,
  f.id as event_id,
  f.cr_expiry_date as event_date,
  NULL as event_time,
  'انتهاء سجل ' || f.name_ar as title_ar,
  'document' as sub_type,
  CASE
    WHEN f.cr_expiry_date <= CURRENT_DATE THEN 'expired'
    WHEN f.cr_expiry_date <= CURRENT_DATE + 15 THEN 'urgent'
    ELSE 'warning'
  END as status,
  NULL as assigned_to,
  f.id as related_entity_id,
  'facilities' as related_entity_table,
  f.name_ar as related_name,
  f.branch_id,
  '#e67e22' as color
FROM facilities f
WHERE f.deleted_at IS NULL AND f.cr_expiry_date IS NOT NULL
  AND f.cr_expiry_date <= CURRENT_DATE + 60;


-- ┌─────────────────────────────────────────────────────────────────────┐
-- │  #7  تقرير ربحية العملاء والخدمات                                 │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE VIEW v_client_profitability AS
SELECT
  c.id as client_id,
  c.name_ar as client_name,
  c.phone,
  c.branch_id,
  c.status,
  -- فواتير
  COUNT(DISTINCT i.id) as total_invoices,
  COALESCE(SUM(i.total_amount), 0) as total_revenue,
  COALESCE(SUM(i.paid_amount), 0) as total_collected,
  COALESCE(SUM(i.remaining_amount), 0) as total_outstanding,
  -- عمولات مدفوعة
  COALESCE(comm.total_commissions, 0) as total_commissions,
  -- صافي الربح
  COALESCE(SUM(i.paid_amount), 0) - COALESCE(comm.total_commissions, 0) as net_profit,
  -- نسبة الربحية
  CASE
    WHEN COALESCE(SUM(i.paid_amount), 0) > 0
    THEN ROUND(100.0 * (COALESCE(SUM(i.paid_amount), 0) - COALESCE(comm.total_commissions, 0))
         / NULLIF(COALESCE(SUM(i.paid_amount), 0), 0), 1)
    ELSE 0
  END as profit_margin_pct,
  -- معاملات
  COUNT(DISTINCT t.id) as total_transactions,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as completed_transactions,
  -- نشاط
  MAX(i.created_at) as last_invoice_date,
  c.created_at as client_since
FROM clients c
LEFT JOIN invoices i ON i.client_id = c.id AND i.deleted_at IS NULL
LEFT JOIN transactions t ON t.client_id = c.id AND t.deleted_at IS NULL
LEFT JOIN (
  SELECT cm.invoice_id, SUM(cm.amount) as total_commissions
  FROM commissions cm WHERE cm.deleted_at IS NULL AND cm.status IN ('approved','paid')
  GROUP BY cm.invoice_id
) comm ON comm.invoice_id = i.id
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.name_ar, c.phone, c.branch_id, c.status, c.created_at, comm.total_commissions;

CREATE OR REPLACE VIEW v_service_profitability AS
SELECT
  tt.code as service_code,
  tt.name_ar as service_name,
  COUNT(DISTINCT t.id) as total_transactions,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as completed,
  COALESCE(SUM(i.total_amount), 0) as total_revenue,
  COALESCE(SUM(i.paid_amount), 0) as total_collected,
  COALESCE(SUM(cm.amount), 0) as total_commissions,
  COALESCE(SUM(i.paid_amount), 0) - COALESCE(SUM(cm.amount), 0) as net_profit,
  CASE
    WHEN COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') > 0
    THEN ROUND((COALESCE(SUM(i.paid_amount), 0) - COALESCE(SUM(cm.amount), 0))::NUMERIC
         / NULLIF(COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed'), 0), 0)
    ELSE 0
  END as avg_profit_per_transaction,
  ROUND(AVG(EXTRACT(DAY FROM (t.completed_date::TIMESTAMP - t.created_at)))
    FILTER (WHERE t.status = 'completed')::NUMERIC, 1) as avg_days_to_complete
FROM transaction_types tt
LEFT JOIN transactions t ON t.transaction_type_id = tt.id AND t.deleted_at IS NULL
LEFT JOIN invoices i ON i.id = t.invoice_id AND i.deleted_at IS NULL
LEFT JOIN commissions cm ON cm.transaction_id = t.id AND cm.deleted_at IS NULL AND cm.status IN ('approved','paid')
WHERE tt.is_active = true
GROUP BY tt.code, tt.name_ar;


-- ┌─────────────────────────────────────────────────────────────────────┐
-- │  #8  لوحة المراقبة الحية (Live Monitor)                           │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE VIEW v_live_monitor AS
SELECT
  -- معاملات جارية
  (SELECT COUNT(*) FROM transactions WHERE deleted_at IS NULL AND status = 'in_progress') as active_transactions,
  -- معاملات متأخرة عن SLA
  (SELECT COUNT(*) FROM v_transaction_sla WHERE sla_status = 'breached') as sla_breached,
  -- معاملات قريبة من التأخر
  (SELECT COUNT(*) FROM v_transaction_sla WHERE sla_status = 'at_risk') as sla_at_risk,
  -- فواتير غير محصّلة
  (SELECT COUNT(*) FROM invoices WHERE deleted_at IS NULL AND status IN ('unpaid','partial') AND due_date <= CURRENT_DATE) as overdue_invoices,
  -- مبلغ الفواتير المتأخرة
  (SELECT COALESCE(SUM(remaining_amount), 0) FROM invoices WHERE deleted_at IS NULL AND status IN ('unpaid','partial') AND due_date <= CURRENT_DATE) as overdue_amount,
  -- مستندات تنتهي خلال 7 أيام
  (SELECT COUNT(*) FROM workers WHERE deleted_at IS NULL AND worker_status = 'active'
    AND iqama_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7) as expiring_iqamas_7d,
  (SELECT COUNT(*) FROM facilities WHERE deleted_at IS NULL AND facility_status = 'active'
    AND cr_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7) as expiring_cr_7d,
  -- مهام متأخرة اليوم
  (SELECT COUNT(*) FROM tasks WHERE deleted_at IS NULL AND status = 'overdue') as overdue_tasks,
  -- مهام اليوم
  (SELECT COUNT(*) FROM tasks WHERE deleted_at IS NULL AND due_date = CURRENT_DATE AND status NOT IN ('completed','skipped','cancelled')) as today_tasks,
  -- مواعيد اليوم
  (SELECT COUNT(*) FROM appointments WHERE deleted_at IS NULL AND date = CURRENT_DATE AND status IN ('scheduled','confirmed')) as today_appointments,
  -- تحصيل اليوم
  (SELECT COALESCE(SUM(amount), 0) FROM invoice_payments WHERE deleted_at IS NULL AND payment_date = CURRENT_DATE) as today_collections,
  -- معاملات مكتملة اليوم
  (SELECT COUNT(*) FROM transactions WHERE deleted_at IS NULL AND status = 'completed' AND completed_date = CURRENT_DATE::TEXT) as today_completed,
  -- الوقت الحالي
  now() as snapshot_at;


-- ┌─────────────────────────────────────────────────────────────────────┐
-- │  #9  أتمتة سير العمل (Workflow Automation)                         │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS workflow_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT,
  -- الشرط (Trigger)
  trigger_entity TEXT NOT NULL CHECK (trigger_entity IN ('transaction','invoice','worker','facility','client')),
  trigger_event TEXT NOT NULL CHECK (trigger_event IN ('status_change','created','completed','overdue','field_change')),
  trigger_from_status TEXT, -- الحالة السابقة (اختياري)
  trigger_to_status TEXT, -- الحالة الجديدة
  trigger_type_code TEXT, -- نوع المعاملة (اختياري)
  -- الإجراء (Action)
  action_type TEXT NOT NULL CHECK (action_type IN ('create_task','send_notification','send_whatsapp','create_alert','escalate')),
  -- بيانات الإجراء
  action_config JSONB NOT NULL DEFAULT '{}',
  /*
    أمثلة action_config:
    create_task: {"title": "فحص طبي {worker_name}", "category": "workers", "priority": "high", "assign_to_role": "employee", "due_days": 2}
    send_whatsapp: {"template_id": "uuid", "to": "client"}
    send_notification: {"title": "وصل العامل", "body": "العامل {worker_name} وصل", "to": "assigned_user"}
    escalate: {"to_role": "manager", "reason": "تأخر SLA"}
  */
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflow_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES workflow_rules(id) ON DELETE SET NULL,
  trigger_entity TEXT NOT NULL,
  trigger_entity_id UUID NOT NULL,
  trigger_event TEXT,
  action_type TEXT,
  action_result JSONB DEFAULT '{}', -- نتيجة التنفيذ (مثلاً task_id المُنشأ)
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success','failed','skipped')),
  error_message TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_rules_trigger ON workflow_rules(trigger_entity, trigger_event) WHERE is_active = true;
CREATE INDEX idx_workflow_log_entity ON workflow_execution_log(trigger_entity, trigger_entity_id);
CREATE INDEX idx_workflow_log_date ON workflow_execution_log(executed_at DESC);

-- إدخال قواعد Workflow افتراضية
INSERT INTO workflow_rules (name_ar, name_en, trigger_entity, trigger_event, trigger_to_status, trigger_type_code, action_type, action_config, sort_order) VALUES
('وصول العامل - فحص طبي', 'Worker Arrived - Medical', 'transaction', 'status_change', 'worker_arrived', 'TRANSFER', 'create_task',
 '{"title": "فحص طبي للعامل", "category": "workers", "priority": "high", "due_days": 2}', 1),
('وصول العامل - تسجيل تأمينات', 'Worker Arrived - GOSI', 'transaction', 'status_change', 'worker_arrived', 'TRANSFER', 'create_task',
 '{"title": "تسجيل في التأمينات", "category": "workers", "priority": "high", "due_days": 3}', 2),
('معاملة مكتملة - إشعار العميل', 'Completed - Notify Client', 'transaction', 'completed', NULL, NULL, 'send_notification',
 '{"title": "تم إنجاز معاملتك", "to": "client"}', 3),
('فاتورة جديدة - متابعة تحصيل', 'New Invoice - Follow up', 'invoice', 'created', NULL, NULL, 'create_task',
 '{"title": "متابعة تحصيل فاتورة", "category": "finance", "priority": "normal", "due_days": 7}', 4),
('عميل جديد - ترحيب', 'New Client - Welcome', 'client', 'created', NULL, NULL, 'send_whatsapp',
 '{"template_category": "welcome", "to": "client"}', 5)
ON CONFLICT DO NOTHING;

-- دالة تنفيذ Workflow عند تغيّر حالة المعاملة
CREATE OR REPLACE FUNCTION execute_workflow_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
  rule RECORD;
  new_task_id UUID;
BEGIN
  -- فقط عند تغيّر الحالة
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    FOR rule IN
      SELECT * FROM workflow_rules
      WHERE is_active = true
        AND trigger_entity = 'transaction'
        AND trigger_event = 'status_change'
        AND (trigger_to_status IS NULL OR trigger_to_status = NEW.status)
        AND (trigger_type_code IS NULL OR trigger_type_code = (
          SELECT code FROM transaction_types WHERE id = NEW.transaction_type_id
        ))
      ORDER BY sort_order
    LOOP
      BEGIN
        IF rule.action_type = 'create_task' THEN
          INSERT INTO tasks (
            title_ar, category, priority, status, task_type,
            due_date, assigned_to, created_by
          ) VALUES (
            COALESCE(rule.action_config->>'title', 'مهمة تلقائية'),
            COALESCE(rule.action_config->>'category', 'general'),
            COALESCE(rule.action_config->>'priority', 'normal'),
            'pending', 'adhoc',
            CURRENT_DATE + COALESCE((rule.action_config->>'due_days')::INTEGER, 3),
            NEW.assigned_to,
            NEW.assigned_to
          ) RETURNING id INTO new_task_id;

          INSERT INTO workflow_execution_log (rule_id, trigger_entity, trigger_entity_id, trigger_event, action_type, action_result, status)
          VALUES (rule.id, 'transaction', NEW.id, 'status_change', 'create_task', jsonb_build_object('task_id', new_task_id), 'success');

        ELSIF rule.action_type = 'send_notification' THEN
          INSERT INTO employee_notifications (
            user_id, type, title, body, priority, entity_type, entity_id
          ) VALUES (
            COALESCE(NEW.assigned_to, NEW.created_by),
            'workflow',
            COALESCE(rule.action_config->>'title', 'إشعار تلقائي'),
            COALESCE(rule.action_config->>'body', 'تم تنفيذ إجراء تلقائي'),
            COALESCE(rule.action_config->>'priority', 'normal'),
            'transaction', NEW.id
          );

          INSERT INTO workflow_execution_log (rule_id, trigger_entity, trigger_entity_id, trigger_event, action_type, status)
          VALUES (rule.id, 'transaction', NEW.id, 'status_change', 'send_notification', 'success');
        END IF;

      EXCEPTION WHEN OTHERS THEN
        INSERT INTO workflow_execution_log (rule_id, trigger_entity, trigger_entity_id, trigger_event, action_type, status, error_message)
        VALUES (rule.id, 'transaction', NEW.id, 'status_change', rule.action_type, 'failed', SQLERRM);
      END;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger على جدول المعاملات
DROP TRIGGER IF EXISTS trg_workflow_transaction ON transactions;
CREATE TRIGGER trg_workflow_transaction
  AFTER UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION execute_workflow_on_transaction();


-- ┌─────────────────────────────────────────────────────────────────────┐
-- │  #10  تقرير مقارنة الفروع                                         │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE VIEW v_branch_comparison AS
SELECT
  b.id as branch_id,
  b.name_ar as branch_name,
  -- منشآت
  COUNT(DISTINCT f.id) as total_facilities,
  COUNT(DISTINCT f.id) FILTER (WHERE f.facility_status = 'active') as active_facilities,
  -- عمال
  COUNT(DISTINCT w.id) as total_workers,
  COUNT(DISTINCT w.id) FILTER (WHERE w.worker_status = 'active') as active_workers,
  -- عملاء
  COUNT(DISTINCT c.id) as total_clients,
  COUNT(DISTINCT c.id) FILTER (WHERE c.created_at >= date_trunc('month', CURRENT_DATE)) as new_clients_this_month,
  -- فواتير الشهر
  COALESCE(inv.monthly_revenue, 0) as monthly_revenue,
  COALESCE(inv.monthly_collected, 0) as monthly_collected,
  COALESCE(inv.monthly_outstanding, 0) as monthly_outstanding,
  CASE WHEN COALESCE(inv.monthly_revenue, 0) > 0
    THEN ROUND(100.0 * COALESCE(inv.monthly_collected, 0) / inv.monthly_revenue, 1)
    ELSE 0
  END as collection_rate_pct,
  -- معاملات الشهر
  COALESCE(txn.monthly_completed, 0) as monthly_transactions_completed,
  COALESCE(txn.monthly_active, 0) as monthly_transactions_active,
  COALESCE(txn.sla_compliance, 0) as sla_compliance_pct,
  -- مهام
  COALESCE(tsk.overdue_tasks, 0) as overdue_tasks,
  COALESCE(tsk.completed_tasks, 0) as completed_tasks_this_month,
  -- مصاريف
  COALESCE(exp.monthly_expenses, 0) as monthly_expenses,
  -- صافي الربح
  COALESCE(inv.monthly_collected, 0) - COALESCE(exp.monthly_expenses, 0) as net_profit
FROM branches b
LEFT JOIN facilities f ON f.branch_id = b.id AND f.deleted_at IS NULL
LEFT JOIN workers w ON w.branch_id = b.id AND w.deleted_at IS NULL
LEFT JOIN clients c ON c.branch_id = b.id AND c.deleted_at IS NULL
LEFT JOIN (
  SELECT branch_id,
    SUM(total_amount) as monthly_revenue,
    SUM(paid_amount) as monthly_collected,
    SUM(remaining_amount) as monthly_outstanding
  FROM invoices WHERE deleted_at IS NULL AND issue_date >= date_trunc('month', CURRENT_DATE)
  GROUP BY branch_id
) inv ON inv.branch_id = b.id
LEFT JOIN (
  SELECT branch_id,
    COUNT(*) FILTER (WHERE status = 'completed' AND completed_date >= date_trunc('month', CURRENT_DATE)::TEXT) as monthly_completed,
    COUNT(*) FILTER (WHERE status = 'in_progress') as monthly_active,
    CASE WHEN COUNT(*) FILTER (WHERE status = 'completed') > 0
      THEN ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed'
        AND completed_date IS NOT NULL
        AND EXTRACT(DAY FROM (completed_date::TIMESTAMP - created_at)) <= 5) -- تقريبي
        / NULLIF(COUNT(*) FILTER (WHERE status = 'completed'), 0), 0)
      ELSE 0
    END as sla_compliance
  FROM transactions WHERE deleted_at IS NULL
  GROUP BY branch_id
) txn ON txn.branch_id = b.id
LEFT JOIN (
  SELECT u.branch_id,
    COUNT(*) FILTER (WHERE tk.status = 'overdue') as overdue_tasks,
    COUNT(*) FILTER (WHERE tk.status = 'completed' AND tk.completed_date >= date_trunc('month', CURRENT_DATE)::TEXT) as completed_tasks
  FROM tasks tk
  LEFT JOIN users u ON u.id = tk.assigned_to
  WHERE tk.deleted_at IS NULL
  GROUP BY u.branch_id
) tsk ON tsk.branch_id = b.id
LEFT JOIN (
  SELECT branch_id, SUM(amount) as monthly_expenses
  FROM operational_expenses
  WHERE deleted_at IS NULL AND date >= date_trunc('month', CURRENT_DATE)
  GROUP BY branch_id
) exp ON exp.branch_id = b.id
WHERE b.deleted_at IS NULL
GROUP BY b.id, b.name_ar, inv.monthly_revenue, inv.monthly_collected, inv.monthly_outstanding,
  txn.monthly_completed, txn.monthly_active, txn.sla_compliance,
  tsk.overdue_tasks, tsk.completed_tasks, exp.monthly_expenses;


-- ┌─────────────────────────────────────────────────────────────────────┐
-- │  #11  تقييم رضا العملاء (NPS)                                      │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS customer_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name TEXT,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  -- التقييم
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback_text TEXT,
  feedback_category TEXT CHECK (feedback_category IN ('speed','quality','communication','pricing','staff','other')),
  -- بيانات
  service_type TEXT,
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  -- طريقة التقييم
  source TEXT DEFAULT 'link' CHECK (source IN ('link','whatsapp','manual','sms')),
  token TEXT UNIQUE, -- رابط التقييم الفريد
  is_public BOOLEAN DEFAULT false,
  -- الإجراء المتخذ
  follow_up_action TEXT,
  followed_up_by UUID REFERENCES users(id) ON DELETE SET NULL,
  followed_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_ratings_client ON customer_ratings(client_id);
CREATE INDEX idx_customer_ratings_date ON customer_ratings(created_at DESC);
CREATE INDEX idx_customer_ratings_token ON customer_ratings(token) WHERE token IS NOT NULL;
CREATE INDEX idx_customer_ratings_rating ON customer_ratings(rating);

-- ملخص التقييمات
CREATE OR REPLACE VIEW v_customer_satisfaction AS
SELECT
  date_trunc('month', cr.created_at)::DATE as month,
  COUNT(*) as total_ratings,
  ROUND(AVG(cr.rating)::NUMERIC, 2) as avg_rating,
  COUNT(*) FILTER (WHERE cr.rating >= 4) as promoters,
  COUNT(*) FILTER (WHERE cr.rating = 3) as passives,
  COUNT(*) FILTER (WHERE cr.rating <= 2) as detractors,
  ROUND(100.0 * COUNT(*) FILTER (WHERE cr.rating >= 4) / NULLIF(COUNT(*), 0)
    - 100.0 * COUNT(*) FILTER (WHERE cr.rating <= 2) / NULLIF(COUNT(*), 0), 1) as nps_score,
  -- حسب الموظف
  cr.assigned_user_id,
  u.name_ar as employee_name,
  -- حسب الخدمة
  cr.service_type
FROM customer_ratings cr
LEFT JOIN users u ON u.id = cr.assigned_user_id
GROUP BY date_trunc('month', cr.created_at)::DATE, cr.assigned_user_id, u.name_ar, cr.service_type;


-- ┌─────────────────────────────────────────────────────────────────────┐
-- │  #12  نظام حضور وانصراف — مع موقع إجباري                          │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS office_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  name_ar TEXT NOT NULL,
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 200, -- النطاق المقبول
  work_start_time TIME DEFAULT '08:00',
  work_end_time TIME DEFAULT '17:00',
  late_threshold_minutes INTEGER DEFAULT 15, -- عدد دقائق التأخير المسموح
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- تسجيل الحضور
  check_in_at TIMESTAMPTZ,
  check_in_lat NUMERIC(10,7),
  check_in_lng NUMERIC(10,7),
  check_in_location_id UUID REFERENCES office_locations(id),
  check_in_distance_meters INTEGER, -- المسافة عن المكتب عند التسجيل
  -- تسجيل الانصراف
  check_out_at TIMESTAMPTZ,
  check_out_lat NUMERIC(10,7),
  check_out_lng NUMERIC(10,7),
  check_out_distance_meters INTEGER,
  -- الحسابات
  work_hours NUMERIC(4,2), -- ساعات العمل المحسوبة
  is_late BOOLEAN DEFAULT false,
  late_minutes INTEGER DEFAULT 0,
  is_early_leave BOOLEAN DEFAULT false,
  early_minutes INTEGER DEFAULT 0,
  -- ملاحظات
  status TEXT DEFAULT 'present' CHECK (status IN ('present','absent','late','half_day','leave','holiday')),
  notes TEXT,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_attendance_user ON attendance(user_id, date DESC);
CREATE INDEX idx_attendance_date ON attendance(date DESC);
CREATE INDEX idx_attendance_branch ON attendance(branch_id, date DESC);

-- ملخص الحضور الشهري
CREATE OR REPLACE VIEW v_attendance_monthly AS
SELECT
  a.user_id,
  u.name_ar,
  u.branch_id,
  date_trunc('month', a.date)::DATE as month,
  COUNT(*) as total_days,
  COUNT(*) FILTER (WHERE a.status = 'present') as present_days,
  COUNT(*) FILTER (WHERE a.status = 'absent') as absent_days,
  COUNT(*) FILTER (WHERE a.is_late = true) as late_days,
  COUNT(*) FILTER (WHERE a.is_early_leave = true) as early_leave_days,
  ROUND(AVG(a.work_hours) FILTER (WHERE a.work_hours IS NOT NULL)::NUMERIC, 1) as avg_work_hours,
  SUM(a.work_hours) FILTER (WHERE a.work_hours IS NOT NULL) as total_work_hours,
  SUM(a.late_minutes) as total_late_minutes,
  ROUND(100.0 * COUNT(*) FILTER (WHERE a.status = 'present' AND a.is_late = false)
    / NULLIF(COUNT(*), 0), 1) as punctuality_pct
FROM attendance a
JOIN users u ON u.id = a.user_id
GROUP BY a.user_id, u.name_ar, u.branch_id, date_trunc('month', a.date)::DATE;

-- دالة حساب المسافة بين نقطتين (Haversine)
CREATE OR REPLACE FUNCTION haversine_distance(
  lat1 NUMERIC, lng1 NUMERIC,
  lat2 NUMERIC, lng2 NUMERIC
) RETURNS INTEGER AS $$
DECLARE
  R CONSTANT INTEGER := 6371000; -- نصف قطر الأرض بالمتر
  dlat NUMERIC;
  dlng NUMERIC;
  a NUMERIC;
  c NUMERIC;
BEGIN
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  a := sin(dlat/2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng/2)^2;
  c := 2 * asin(sqrt(a));
  RETURN ROUND(R * c);
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ┌─────────────────────────────────────────────────────────────────────┐
-- │  #13  ملخص تنفيذي أسبوعي تلقائي                                   │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL, -- NULL = كل الفروع
  -- ملخص مالي
  revenue NUMERIC(14,2) DEFAULT 0,
  collected NUMERIC(14,2) DEFAULT 0,
  expenses NUMERIC(14,2) DEFAULT 0,
  net_profit NUMERIC(14,2) DEFAULT 0,
  revenue_change_pct NUMERIC(5,1), -- مقارنة بالأسبوع السابق
  -- ملخص عمليات
  transactions_completed INTEGER DEFAULT 0,
  transactions_new INTEGER DEFAULT 0,
  transactions_overdue INTEGER DEFAULT 0,
  sla_compliance_pct NUMERIC(5,1),
  invoices_issued INTEGER DEFAULT 0,
  invoices_amount NUMERIC(14,2) DEFAULT 0,
  -- ملخص مخاطر
  expiring_documents_7d INTEGER DEFAULT 0,
  overdue_invoices INTEGER DEFAULT 0,
  overdue_invoices_amount NUMERIC(14,2) DEFAULT 0,
  uncompleted_tasks INTEGER DEFAULT 0,
  -- ملخص فريق
  top_employee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  top_employee_name TEXT,
  top_employee_score INTEGER,
  total_work_hours NUMERIC(8,1),
  -- البيانات الخام
  report_data JSONB DEFAULT '{}',
  -- حالة
  is_read BOOLEAN DEFAULT false,
  read_by UUID REFERENCES users(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_weekly_reports_date ON weekly_reports(report_date DESC);

-- دالة إنشاء التقرير الأسبوعي
CREATE OR REPLACE FUNCTION generate_weekly_report(p_branch_id UUID DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  w_start DATE := date_trunc('week', CURRENT_DATE - INTERVAL '1 day')::DATE; -- بداية الأسبوع الماضي
  w_end DATE := w_start + 6;
  pw_start DATE := w_start - 7;
  pw_end DATE := w_start - 1;
  report_id UUID;
  v_revenue NUMERIC := 0;
  v_collected NUMERIC := 0;
  v_expenses NUMERIC := 0;
  v_prev_revenue NUMERIC := 0;
  v_txn_completed INTEGER := 0;
  v_txn_new INTEGER := 0;
  v_txn_overdue INTEGER := 0;
  v_inv_issued INTEGER := 0;
  v_inv_amount NUMERIC := 0;
  v_exp_docs INTEGER := 0;
  v_overdue_inv INTEGER := 0;
  v_overdue_inv_amt NUMERIC := 0;
  v_uncompleted_tasks INTEGER := 0;
  v_top_emp_id UUID;
  v_top_emp_name TEXT;
  v_top_emp_score INTEGER := 0;
BEGIN
  -- الإيرادات
  SELECT COALESCE(SUM(total_amount), 0) INTO v_revenue FROM invoices
  WHERE deleted_at IS NULL AND issue_date >= w_start AND issue_date <= w_end
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

  SELECT COALESCE(SUM(total_amount), 0) INTO v_prev_revenue FROM invoices
  WHERE deleted_at IS NULL AND issue_date >= pw_start AND issue_date <= pw_end
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

  -- التحصيل
  SELECT COALESCE(SUM(ip.amount), 0) INTO v_collected FROM invoice_payments ip
  JOIN invoices i ON i.id = ip.invoice_id
  WHERE ip.deleted_at IS NULL AND ip.payment_date >= w_start AND ip.payment_date <= w_end
    AND (p_branch_id IS NULL OR i.branch_id = p_branch_id);

  -- المصاريف
  SELECT COALESCE(SUM(amount), 0) INTO v_expenses FROM operational_expenses
  WHERE deleted_at IS NULL AND date >= w_start AND date <= w_end
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

  -- المعاملات
  SELECT COUNT(*) INTO v_txn_completed FROM transactions
  WHERE deleted_at IS NULL AND status = 'completed' AND completed_date >= w_start::TEXT AND completed_date <= w_end::TEXT
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

  SELECT COUNT(*) INTO v_txn_new FROM transactions
  WHERE deleted_at IS NULL AND created_at >= w_start::TIMESTAMPTZ AND created_at < (w_end + 1)::TIMESTAMPTZ
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

  -- مستندات تنتهي
  SELECT COUNT(*) INTO v_exp_docs FROM workers
  WHERE deleted_at IS NULL AND worker_status = 'active'
    AND iqama_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

  -- فواتير متأخرة
  SELECT COUNT(*), COALESCE(SUM(remaining_amount), 0) INTO v_overdue_inv, v_overdue_inv_amt FROM invoices
  WHERE deleted_at IS NULL AND status IN ('unpaid','partial') AND due_date < CURRENT_DATE
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

  -- مهام غير مكتملة
  SELECT COUNT(*) INTO v_uncompleted_tasks FROM tasks
  WHERE deleted_at IS NULL AND status IN ('pending','overdue','in_progress');

  -- أفضل موظف
  SELECT user_id, name_ar, performance_score INTO v_top_emp_id, v_top_emp_name, v_top_emp_score
  FROM v_employee_performance_detailed
  WHERE (p_branch_id IS NULL OR branch_id = p_branch_id)
  ORDER BY performance_score DESC LIMIT 1;

  -- إدراج التقرير
  INSERT INTO weekly_reports (
    report_date, week_start, week_end, branch_id,
    revenue, collected, expenses, net_profit, revenue_change_pct,
    transactions_completed, transactions_new, transactions_overdue,
    invoices_issued, invoices_amount,
    expiring_documents_7d, overdue_invoices, overdue_invoices_amount, uncompleted_tasks,
    top_employee_id, top_employee_name, top_employee_score
  ) VALUES (
    CURRENT_DATE, w_start, w_end, p_branch_id,
    v_revenue, v_collected, v_expenses, v_collected - v_expenses,
    CASE WHEN v_prev_revenue > 0 THEN ROUND(100.0 * (v_revenue - v_prev_revenue) / v_prev_revenue, 1) ELSE NULL END,
    v_txn_completed, v_txn_new, v_txn_overdue,
    v_inv_issued, v_inv_amount,
    v_exp_docs, v_overdue_inv, v_overdue_inv_amt, v_uncompleted_tasks,
    v_top_emp_id, v_top_emp_name, v_top_emp_score
  ) RETURNING id INTO report_id;

  -- إشعار المدير
  INSERT INTO employee_notifications (user_id, type, title, body, priority, entity_type, entity_id)
  SELECT u.id, 'weekly_report', 'التقرير الأسبوعي جاهز',
    'إيرادات: ' || v_revenue || ' | تحصيل: ' || v_collected || ' | صافي: ' || (v_collected - v_expenses),
    'normal', 'weekly_report', report_id
  FROM users u
  JOIN roles r ON r.id = u.role_id AND r.escalation_level >= 3
  WHERE u.deleted_at IS NULL AND u.is_active = true;

  RETURN report_id;
END;
$$ LANGUAGE plpgsql;


-- ┌─────────────────────────────────────────────────────────────────────┐
-- │  #14  حاسبة تسعير ذكية                                            │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS gov_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT,
  fee_code TEXT UNIQUE NOT NULL, -- مثلاً TRANSFER_FEE, WP_ISSUE, IQAMA_RENEW
  category TEXT CHECK (category IN ('labor','immigration','commercial','insurance','other')),
  amount NUMERIC(10,2) NOT NULL,
  vat_inclusive BOOLEAN DEFAULT false,
  effective_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE, -- NULL = سارية
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- إدخال الرسوم الحكومية الشائعة
INSERT INTO gov_fees (name_ar, name_en, fee_code, category, amount) VALUES
('رسوم نقل كفالة', 'Transfer Fee', 'TRANSFER_FEE', 'labor', 2000),
('رسوم إصدار رخصة عمل', 'WP Issue Fee', 'WP_ISSUE', 'labor', 800),
('رسوم تجديد رخصة عمل', 'WP Renewal Fee', 'WP_RENEW', 'labor', 800),
('رسوم إصدار إقامة', 'Iqama Issue Fee', 'IQAMA_ISSUE', 'immigration', 650),
('رسوم تجديد إقامة (سنة)', 'Iqama Renewal 1yr', 'IQAMA_RENEW_1', 'immigration', 650),
('رسوم تجديد إقامة (سنتين)', 'Iqama Renewal 2yr', 'IQAMA_RENEW_2', 'immigration', 1300),
('رسوم خروج وعودة مفرد', 'Exit Re-entry Single', 'EXIT_REENTRY_S', 'immigration', 200),
('رسوم خروج وعودة متعدد', 'Exit Re-entry Multiple', 'EXIT_REENTRY_M', 'immigration', 500),
('رسوم خروج نهائي', 'Final Exit Fee', 'FINAL_EXIT', 'immigration', 200),
('رسوم تغيير مهنة', 'Profession Change', 'PROF_CHANGE', 'labor', 1000),
('المقابل المالي (شهري)', 'Monthly Levy', 'MONTHLY_LEVY', 'labor', 400),
('تأمين طبي (تقريبي)', 'Medical Insurance', 'MED_INSURANCE', 'insurance', 1200),
('رسوم تجديد سجل تجاري', 'CR Renewal', 'CR_RENEW', 'commercial', 200),
('رسوم الغرفة التجارية', 'Chamber Fee', 'CHAMBER_FEE', 'commercial', 300)
ON CONFLICT (fee_code) DO UPDATE SET amount = EXCLUDED.amount, updated_at = now();

CREATE TABLE IF NOT EXISTS service_cost_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_code TEXT NOT NULL, -- كود نوع الخدمة من transaction_types
  name_ar TEXT NOT NULL,
  name_en TEXT,
  -- الرسوم الثابتة (مرجع)
  fee_codes TEXT[] DEFAULT '{}', -- أكواد الرسوم الحكومية المرتبطة [{TRANSFER_FEE, WP_ISSUE}]
  -- تكاليف إضافية
  default_commission_pct NUMERIC(5,2) DEFAULT 0,
  default_office_fee NUMERIC(10,2) DEFAULT 0,
  default_misc_fee NUMERIC(10,2) DEFAULT 0,
  -- هامش الربح
  min_profit_margin_pct NUMERIC(5,2) DEFAULT 15, -- الحد الأدنى للربحية
  suggested_profit_margin_pct NUMERIC(5,2) DEFAULT 25,
  -- ملاحظات
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO service_cost_templates (service_code, name_ar, name_en, fee_codes, min_profit_margin_pct, suggested_profit_margin_pct) VALUES
('TRANSFER', 'نقل كفالة', 'Sponsorship Transfer', '{TRANSFER_FEE,WP_ISSUE,MED_INSURANCE}', 15, 25),
('IQAMA_RENEW', 'تجديد إقامة', 'Iqama Renewal', '{IQAMA_RENEW_1}', 20, 35),
('WP_ISSUE', 'إصدار رخصة عمل', 'Work Permit Issue', '{WP_ISSUE}', 25, 40),
('WP_RENEW', 'تجديد رخصة عمل', 'Work Permit Renewal', '{WP_RENEW}', 25, 40),
('EXIT_REENTRY', 'خروج وعودة', 'Exit Re-entry', '{EXIT_REENTRY_S}', 30, 50),
('FINAL_EXIT', 'خروج نهائي', 'Final Exit', '{FINAL_EXIT}', 25, 40),
('PROF_CHANGE', 'تغيير مهنة', 'Profession Change', '{PROF_CHANGE}', 20, 30),
('CR_RENEW', 'تجديد سجل تجاري', 'CR Renewal', '{CR_RENEW,CHAMBER_FEE}', 20, 35)
ON CONFLICT DO NOTHING;

-- دالة حساب تكلفة الخدمة
CREATE OR REPLACE FUNCTION calculate_service_cost(
  p_service_code TEXT,
  p_commission_amount NUMERIC DEFAULT 0
)
RETURNS TABLE (
  total_gov_fees NUMERIC,
  commission NUMERIC,
  total_cost NUMERIC,
  min_price NUMERIC,
  suggested_price NUMERIC,
  fee_breakdown JSONB
) AS $$
DECLARE
  v_template service_cost_templates%ROWTYPE;
  v_total_fees NUMERIC := 0;
  v_breakdown JSONB := '[]'::JSONB;
  v_fee RECORD;
BEGIN
  SELECT * INTO v_template FROM service_cost_templates WHERE service_code = p_service_code AND is_active = true LIMIT 1;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, '[]'::JSONB;
    RETURN;
  END IF;

  FOR v_fee IN
    SELECT gf.name_ar, gf.amount, gf.fee_code
    FROM gov_fees gf
    WHERE gf.fee_code = ANY(v_template.fee_codes) AND gf.is_active = true
  LOOP
    v_total_fees := v_total_fees + v_fee.amount;
    v_breakdown := v_breakdown || jsonb_build_object('name', v_fee.name_ar, 'amount', v_fee.amount, 'code', v_fee.fee_code);
  END LOOP;

  RETURN QUERY SELECT
    v_total_fees,
    p_commission_amount,
    v_total_fees + p_commission_amount + COALESCE(v_template.default_office_fee, 0) + COALESCE(v_template.default_misc_fee, 0),
    ROUND((v_total_fees + p_commission_amount + COALESCE(v_template.default_office_fee, 0)) / (1 - v_template.min_profit_margin_pct/100), 0),
    ROUND((v_total_fees + p_commission_amount + COALESCE(v_template.default_office_fee, 0)) / (1 - v_template.suggested_profit_margin_pct/100), 0),
    v_breakdown;
END;
$$ LANGUAGE plpgsql;


-- ┌─────────────────────────────────────────────────────────────────────┐
-- │  #15  لوحة الامتثال التنظيمي (Compliance)                         │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS compliance_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key TEXT NOT NULL UNIQUE CHECK (metric_key IN (
    'saudization_pct','wps_compliance_pct','contract_auth_pct',
    'gosi_compliance','cr_valid','iqama_valid','insurance_valid'
  )),
  name_ar TEXT NOT NULL,
  name_en TEXT,
  min_value NUMERIC(5,2), -- الحد الأدنى المطلوب
  warning_value NUMERIC(5,2), -- تحذير عند الاقتراب
  description_ar TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO compliance_thresholds (metric_key, name_ar, name_en, min_value, warning_value, description_ar) VALUES
('saudization_pct', 'نسبة السعودة', 'Saudization %', 20, 25, 'الحد الأدنى لنسبة السعودة حسب حجم المنشأة ونوع النشاط'),
('wps_compliance_pct', 'حماية الأجور', 'WPS Compliance %', 80, 90, 'نسبة الالتزام بنظام حماية الأجور (مُدد)'),
('contract_auth_pct', 'توثيق العقود', 'Contract Auth %', 100, 95, 'نسبة توثيق عقود العمل في منصة قوى'),
('gosi_compliance', 'التأمينات الاجتماعية', 'GOSI Compliance', 100, 100, 'الالتزام بسداد اشتراكات التأمينات'),
('cr_valid', 'السجل التجاري', 'CR Valid', 100, 100, 'السجل التجاري ساري الصلاحية'),
('iqama_valid', 'الإقامات', 'Iqama Valid', 100, 95, 'نسبة الإقامات سارية الصلاحية'),
('insurance_valid', 'التأمين الطبي', 'Insurance Valid', 100, 95, 'نسبة تغطية التأمين الطبي')
ON CONFLICT (metric_key) DO NOTHING;

-- View شامل لامتثال كل منشأة
CREATE OR REPLACE VIEW v_facility_compliance AS
SELECT
  f.id as facility_id,
  f.name_ar,
  f.unified_national_number,
  f.branch_id,
  f.facility_status,
  f.nitaqat_color,
  -- نسبة السعودة
  COALESCE(f.saudization_percentage, 0)::NUMERIC as saudization_pct,
  CASE
    WHEN COALESCE(f.saudization_percentage, 0) >= ct_s.warning_value THEN 'compliant'
    WHEN COALESCE(f.saudization_percentage, 0) >= ct_s.min_value THEN 'warning'
    ELSE 'violation'
  END as saudization_status,
  -- حماية الأجور
  COALESCE(f.wps_compliance_pct, 0)::NUMERIC as wps_pct,
  CASE
    WHEN COALESCE(f.wps_compliance_pct, 0) >= ct_w.warning_value THEN 'compliant'
    WHEN COALESCE(f.wps_compliance_pct, 0) >= ct_w.min_value THEN 'warning'
    ELSE 'violation'
  END as wps_status,
  -- توثيق العقود
  COALESCE(f.contract_auth_pct, 0)::NUMERIC as contract_pct,
  COALESCE(f.unauthenticated_count, 0) as unauthenticated_contracts,
  CASE
    WHEN COALESCE(f.contract_auth_pct, 0) >= ct_c.warning_value THEN 'compliant'
    WHEN COALESCE(f.contract_auth_pct, 0) >= ct_c.min_value THEN 'warning'
    ELSE 'violation'
  END as contract_status,
  -- التأمينات
  f.gosi_status,
  COALESCE(f.gosi_total_debit, 0) as gosi_debt,
  CASE
    WHEN f.gosi_status IN ('active','compliant') AND COALESCE(f.gosi_total_debit, 0) = 0 THEN 'compliant'
    WHEN COALESCE(f.gosi_total_debit, 0) > 0 THEN 'warning'
    ELSE 'violation'
  END as gosi_compliance_status,
  -- السجل التجاري
  f.cr_expiry_date,
  CASE
    WHEN f.cr_expiry_date > CURRENT_DATE + 60 THEN 'compliant'
    WHEN f.cr_expiry_date > CURRENT_DATE THEN 'warning'
    ELSE 'violation'
  END as cr_status_compliance,
  (f.cr_expiry_date - CURRENT_DATE) as cr_days_remaining,
  -- عدد العمال ونطاقات
  COALESCE(f.total_workers, 0) as total_workers,
  COALESCE(f.saudi_workers, 0) as saudi_workers,
  COALESCE(f.non_saudi_workers, 0) as non_saudi_workers,
  -- إقامات منتهية
  COALESCE(expired_iq.cnt, 0) as expired_iqamas,
  COALESCE(expiring_iq.cnt, 0) as expiring_iqamas_30d,
  -- التقييم الإجمالي
  CASE
    WHEN (COALESCE(f.saudization_percentage, 0) < ct_s.min_value)
      OR (COALESCE(f.wps_compliance_pct, 0) < ct_w.min_value)
      OR (f.cr_expiry_date IS NOT NULL AND f.cr_expiry_date <= CURRENT_DATE)
      OR (f.nitaqat_color = 'red')
    THEN 'critical'
    WHEN (COALESCE(f.saudization_percentage, 0) < ct_s.warning_value)
      OR (COALESCE(f.wps_compliance_pct, 0) < ct_w.warning_value)
      OR (COALESCE(f.contract_auth_pct, 0) < ct_c.warning_value)
      OR (f.cr_expiry_date IS NOT NULL AND f.cr_expiry_date <= CURRENT_DATE + 60)
      OR (f.nitaqat_color = 'yellow')
    THEN 'warning'
    ELSE 'compliant'
  END as overall_status,
  -- عدد المخالفات
  (
    CASE WHEN COALESCE(f.saudization_percentage, 0) < ct_s.min_value THEN 1 ELSE 0 END +
    CASE WHEN COALESCE(f.wps_compliance_pct, 0) < ct_w.min_value THEN 1 ELSE 0 END +
    CASE WHEN COALESCE(f.contract_auth_pct, 0) < ct_c.min_value THEN 1 ELSE 0 END +
    CASE WHEN f.cr_expiry_date IS NOT NULL AND f.cr_expiry_date <= CURRENT_DATE THEN 1 ELSE 0 END +
    CASE WHEN COALESCE(f.gosi_total_debit, 0) > 0 THEN 1 ELSE 0 END
  ) as violation_count
FROM facilities f
CROSS JOIN compliance_thresholds ct_s
CROSS JOIN compliance_thresholds ct_w
CROSS JOIN compliance_thresholds ct_c
LEFT JOIN (
  SELECT facility_id, COUNT(*) as cnt FROM workers
  WHERE deleted_at IS NULL AND worker_status = 'active'
    AND iqama_expiry_date IS NOT NULL AND iqama_expiry_date <= CURRENT_DATE
  GROUP BY facility_id
) expired_iq ON expired_iq.facility_id = f.id
LEFT JOIN (
  SELECT facility_id, COUNT(*) as cnt FROM workers
  WHERE deleted_at IS NULL AND worker_status = 'active'
    AND iqama_expiry_date IS NOT NULL
    AND iqama_expiry_date > CURRENT_DATE AND iqama_expiry_date <= CURRENT_DATE + 30
  GROUP BY facility_id
) expiring_iq ON expiring_iq.facility_id = f.id
WHERE f.deleted_at IS NULL
  AND ct_s.metric_key = 'saudization_pct'
  AND ct_w.metric_key = 'wps_compliance_pct'
  AND ct_c.metric_key = 'contract_auth_pct';

-- محاكي نطاقات: لو أضفنا/أزلنا عمال كيف تتغير النسبة
CREATE OR REPLACE FUNCTION simulate_saudization(
  p_facility_id UUID,
  p_add_saudi INTEGER DEFAULT 0,
  p_add_non_saudi INTEGER DEFAULT 0,
  p_remove_saudi INTEGER DEFAULT 0,
  p_remove_non_saudi INTEGER DEFAULT 0
)
RETURNS TABLE (
  current_saudi INTEGER,
  current_non_saudi INTEGER,
  current_total INTEGER,
  current_pct NUMERIC,
  new_saudi INTEGER,
  new_non_saudi INTEGER,
  new_total INTEGER,
  new_pct NUMERIC,
  current_nitaqat TEXT,
  projected_nitaqat TEXT
) AS $$
DECLARE
  v_saudi INTEGER;
  v_non_saudi INTEGER;
  v_new_saudi INTEGER;
  v_new_non_saudi INTEGER;
BEGIN
  SELECT COALESCE(f.saudi_workers, 0), COALESCE(f.non_saudi_workers, 0)
  INTO v_saudi, v_non_saudi
  FROM facilities f WHERE f.id = p_facility_id;

  v_new_saudi := GREATEST(0, v_saudi + p_add_saudi - p_remove_saudi);
  v_new_non_saudi := GREATEST(0, v_non_saudi + p_add_non_saudi - p_remove_non_saudi);

  RETURN QUERY SELECT
    v_saudi,
    v_non_saudi,
    v_saudi + v_non_saudi,
    CASE WHEN (v_saudi + v_non_saudi) > 0
      THEN ROUND(100.0 * v_saudi / (v_saudi + v_non_saudi), 2) ELSE 0 END,
    v_new_saudi,
    v_new_non_saudi,
    v_new_saudi + v_new_non_saudi,
    CASE WHEN (v_new_saudi + v_new_non_saudi) > 0
      THEN ROUND(100.0 * v_new_saudi / (v_new_saudi + v_new_non_saudi), 2) ELSE 0 END,
    (SELECT nitaqat_color FROM facilities WHERE id = p_facility_id),
    CASE
      WHEN (v_new_saudi + v_new_non_saudi) = 0 THEN 'unknown'
      WHEN 100.0 * v_new_saudi / (v_new_saudi + v_new_non_saudi) < 10 THEN 'red'
      WHEN 100.0 * v_new_saudi / (v_new_saudi + v_new_non_saudi) < 20 THEN 'yellow'
      WHEN 100.0 * v_new_saudi / (v_new_saudi + v_new_non_saudi) < 30 THEN 'green_low'
      WHEN 100.0 * v_new_saudi / (v_new_saudi + v_new_non_saudi) < 40 THEN 'green_mid'
      ELSE 'green_high'
    END;
END;
$$ LANGUAGE plpgsql;


-- ┌─────────────────────────────────────────────────────────────────────┐
-- │  أعمدة إضافية على الجداول الموجودة                                │
-- └─────────────────────────────────────────────────────────────────────┘

-- أعمدة مهمة للربط
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS completed_date TEXT; -- تاريخ الاكتمال
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS worker_id UUID REFERENCES workers(id) ON DELETE SET NULL;

-- عمود الموقع الجغرافي على الفروع
ALTER TABLE branches ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS geo_radius_meters INTEGER DEFAULT 200;

-- عمود is_recurring على المصاريف
ALTER TABLE operational_expenses ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;

-- عمود branch_id على الفواتير إذا ما كان موجود
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

-- عمود issue_date على الفواتير
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS issue_date DATE DEFAULT CURRENT_DATE;

-- عمود deleted_at على tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- عمود completed_date على tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_date TEXT;

-- عمود branch_id على transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;


-- ┌─────────────────────────────────────────────────────────────────────┐
-- │  Row Level Security للجداول الجديدة                                │
-- └─────────────────────────────────────────────────────────────────────┘

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'monthly_targets','auto_alert_rules','auto_alert_log',
    'sla_definitions','workflow_rules','workflow_execution_log',
    'customer_ratings','office_locations','attendance',
    'weekly_reports','gov_fees','service_cost_templates',
    'compliance_thresholds'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated v3" ON %I', t);
    EXECUTE format('CREATE POLICY "Allow all for authenticated v3" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;


-- ┌─────────────────────────────────────────────────────────────────────┐
-- │  تحديث دالة weekly_update لتشمل الميزات الجديدة                   │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION weekly_update()
RETURNS TEXT AS $$
DECLARE result TEXT := '';
BEGIN
  -- التنبيهات الذكية
  PERFORM generate_smart_alerts();
  result := result || 'Smart alerts generated. ';

  -- تحديث تقييمات العملاء
  PERFORM update_client_ratings();
  result := result || 'Client ratings updated. ';

  -- تحديث حالة الأقساط
  PERFORM update_installment_statuses();
  result := result || 'Installments checked. ';

  -- تحديث KPI
  PERFORM update_kpi_actuals();
  result := result || 'KPI actuals updated. ';

  -- إنشاء التقرير الأسبوعي
  PERFORM generate_weekly_report();
  result := result || 'Weekly report generated. ';

  -- تحديث الختم الزمني
  UPDATE system_settings SET setting_value = now()::TEXT WHERE setting_key = 'last_weekly_update';

  result := result || 'Done.';
  RETURN result;
END;
$$ LANGUAGE plpgsql;


-- ══════════════════════════════════════════════════════════════════════
SELECT '✅ Migration v3 — 15 Features — Completed Successfully!' as status;
-- ══════════════════════════════════════════════════════════════════════
