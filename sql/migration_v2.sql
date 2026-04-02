-- ══════════════════════════════════════════════════════════════
-- جسر للأعمال — Migration v2 — All New Features
-- Run this in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- ═══ DB-1: سجل التواصل ═══
CREATE TABLE IF NOT EXISTS communication_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  broker_id UUID REFERENCES brokers(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('call','whatsapp','sms','email','visit','other')),
  direction TEXT NOT NULL DEFAULT 'out' CHECK (direction IN ('in','out')),
  summary TEXT,
  duration_minutes INTEGER,
  template_id UUID,
  invoice_id UUID,
  transaction_id UUID,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_reason TEXT
);
CREATE INDEX idx_comm_log_client ON communication_log(client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comm_log_worker ON communication_log(worker_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comm_log_created ON communication_log(created_at DESC) WHERE deleted_at IS NULL;

-- ═══ DB-2: التنبيهات الذكية ═══
CREATE TABLE IF NOT EXISTS smart_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('worker','facility','client','invoice','insurance','vehicle','document')),
  entity_id UUID NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'iqama_expiry','passport_expiry','insurance_expiry','cr_expiry',
    'license_expiry','chamber_expiry','contract_expiry','visa_expiry',
    'gosi_issue','qiwa_issue','invoice_overdue','custom'
  )),
  entity_name TEXT,
  expiry_date DATE,
  days_before_alert INTEGER NOT NULL DEFAULT 30,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','urgent','critical')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','snoozed','resolved','expired')),
  snoozed_until DATE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolve_notes TEXT,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  auto_generated BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_smart_alerts_entity ON smart_alerts(entity_type, entity_id);
CREATE INDEX idx_smart_alerts_expiry ON smart_alerts(expiry_date) WHERE status = 'active';
CREATE INDEX idx_smart_alerts_status ON smart_alerts(status, severity);

-- ═══ DB-3: العمولات ═══
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID REFERENCES brokers(id) ON DELETE SET NULL,
  provider_id UUID,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  transaction_id UUID,
  worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  commission_type TEXT NOT NULL DEFAULT 'fixed' CHECK (commission_type IN ('fixed','percentage')),
  percentage NUMERIC(5,2),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','cancelled')),
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  paid_date DATE,
  paid_by UUID REFERENCES users(id) ON DELETE SET NULL,
  payment_method TEXT CHECK (payment_method IN ('cash','bank_transfer','check')),
  payment_reference TEXT,
  notes TEXT,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_reason TEXT
);
CREATE INDEX idx_commissions_broker ON commissions(broker_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_commissions_status ON commissions(status) WHERE deleted_at IS NULL;

-- ═══ DB-4: تاريخ العامل ═══
CREATE TABLE IF NOT EXISTS worker_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'arrival','sponsorship_transfer','iqama_renewal','iqama_issued',
    'passport_renewal','exit_reentry','final_exit','absconded',
    'returned','work_injury','contract_signed','contract_ended',
    'facility_change','status_change','insurance_added','insurance_expired',
    'complaint','note','other'
  )),
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT,
  description TEXT,
  from_facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
  to_facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
  from_status TEXT,
  to_status TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_worker_timeline ON worker_timeline(worker_id, event_date DESC);

-- ═══ DB-5: المرفقات ═══
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('worker','facility','client','broker','invoice','transaction','expense','user','commission')),
  entity_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  category TEXT CHECK (category IN ('id_copy','passport','contract','receipt','photo','insurance','license','letter','other')),
  description TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX idx_attachments_entity ON attachments(entity_type, entity_id) WHERE deleted_at IS NULL;

-- ═══ DB-6: أعمدة deleted_reason و deleted_by ═══
DO $$ 
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['facilities','workers','clients','brokers','invoices','transactions','bank_accounts','lookup_items','lookup_lists','owners','platforms','credentials'])
  LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id) ON DELETE SET NULL', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS deleted_reason TEXT', t);
  END LOOP;
END $$;

-- ═══ DB-7: الأقساط ═══
CREATE TABLE IF NOT EXISTS installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL DEFAULT 1,
  amount NUMERIC(12,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  paid_amount NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','partial','overdue','cancelled')),
  payment_method TEXT CHECK (payment_method IN ('cash','bank_transfer','check','pos')),
  payment_reference TEXT,
  collected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_installments_invoice ON installments(invoice_id);
CREATE INDEX idx_installments_due ON installments(due_date) WHERE status IN ('pending','partial');

-- ═══ DB-8: قوالب الرسائل ═══
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT,
  type TEXT NOT NULL DEFAULT 'whatsapp' CHECK (type IN ('whatsapp','sms','email')),
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN (
    'invoice_reminder','payment_confirmation','welcome','appointment',
    'document_request','status_update','worker_arrival','general','custom'
  )),
  body_ar TEXT NOT NULL,
  body_en TEXT,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default templates
INSERT INTO message_templates (name_ar, name_en, type, category, body_ar, variables, sort_order) VALUES
('تذكير دفع فاتورة', 'Invoice Payment Reminder', 'whatsapp', 'invoice_reminder',
 'السلام عليكم {client_name}

نذكركم بفاتورة رقم: {invoice_no}
المبلغ المتبقي: {remaining} ريال
تاريخ الاستحقاق: {due_date}

نأمل السداد في أقرب وقت.
جسر للأعمال', '{client_name,invoice_no,remaining,due_date}', 1),

('تأكيد استلام دفعة', 'Payment Confirmation', 'whatsapp', 'payment_confirmation',
 'السلام عليكم {client_name}

تم استلام مبلغ {amount} ريال
فاتورة رقم: {invoice_no}
المتبقي: {remaining} ريال

شكراً لكم — جسر للأعمال', '{client_name,amount,invoice_no,remaining}', 2),

('طلب مستندات', 'Document Request', 'whatsapp', 'document_request',
 'السلام عليكم {client_name}

نحتاج منكم المستندات التالية:
{documents}

يرجى إرسالها في أقرب وقت لإتمام المعاملة رقم {transaction_no}.

جسر للأعمال', '{client_name,documents,transaction_no}', 3),

('إشعار وصول عامل', 'Worker Arrival', 'whatsapp', 'worker_arrival',
 'السلام عليكم {client_name}

نسعد بإبلاغكم بوصول العامل/ة: {worker_name}
رقم الإقامة: {iqama_no}

يرجى مراجعة مكتبنا لإتمام الإجراءات.
جسر للأعمال', '{client_name,worker_name,iqama_no}', 4),

('تذكير بموعد', 'Appointment Reminder', 'whatsapp', 'appointment',
 'السلام عليكم {client_name}

تذكير بموعدكم:
التاريخ: {date}
الوقت: {time}
{notes}

جسر للأعمال', '{client_name,date,time,notes}', 5)
ON CONFLICT DO NOTHING;

-- ═══ DB-10: المواعيد ═══
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'client_visit' CHECK (type IN (
    'client_visit','passport_office','insurance','jawazat',
    'labor_office','gosi','court','other'
  )),
  date DATE NOT NULL,
  time TIME,
  duration_minutes INTEGER DEFAULT 30,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','confirmed','completed','cancelled','no_show')),
  location TEXT,
  notes TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_appointments_date ON appointments(date, time) WHERE deleted_at IS NULL AND status IN ('scheduled','confirmed');
CREATE INDEX idx_appointments_assigned ON appointments(assigned_to, date) WHERE deleted_at IS NULL;

-- ═══ DB-11: المصاريف التشغيلية ═══
CREATE TABLE IF NOT EXISTS operational_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_number TEXT,
  amount NUMERIC(12,2) NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'rent','salary','gov_fee','transport','utilities',
    'office_supplies','maintenance','marketing','insurance',
    'telecom','legal','other'
  )),
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT CHECK (payment_method IN ('cash','bank_transfer','check','pos','auto_debit')),
  payment_reference TEXT,
  receipt_url TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_period TEXT CHECK (recurring_period IN ('monthly','quarterly','yearly')),
  vendor_name TEXT,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_reason TEXT
);
CREATE INDEX idx_op_expenses_date ON operational_expenses(date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_op_expenses_cat ON operational_expenses(category) WHERE deleted_at IS NULL;

-- ═══ BIZ-5: تقييم العملاء ═══
ALTER TABLE clients ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 5 CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS rating_notes TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS total_invoices INTEGER DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS total_paid NUMERIC(12,2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS total_pending NUMERIC(12,2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_payment_date DATE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS overdue_count INTEGER DEFAULT 0;

-- ═══ BIZ-6: سير عمل الموافقات ═══
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'delete_invoice','cancel_invoice','apply_discount',
    'large_payment','delete_transaction','cancel_transaction',
    'refund','write_off','modify_price','delete_worker','other'
  )),
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,
  description TEXT NOT NULL,
  amount NUMERIC(12,2),
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  decision_by UUID REFERENCES users(id) ON DELETE SET NULL,
  decision_at TIMESTAMPTZ,
  decision_notes TEXT,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_approvals_status ON approval_requests(status, priority) WHERE status = 'pending';
CREATE INDEX idx_approvals_assigned ON approval_requests(assigned_to) WHERE status = 'pending';

-- ═══ BIZ-8: تسعير ذكي للخدمات ═══
CREATE TABLE IF NOT EXISTS service_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL,
  nationality TEXT,
  gender TEXT CHECK (gender IN ('male','female','both')),
  base_price NUMERIC(12,2) NOT NULL,
  gov_fee NUMERIC(12,2) DEFAULT 0,
  insurance_fee NUMERIC(12,2) DEFAULT 0,
  office_fee NUMERIC(12,2) DEFAULT 0,
  other_fees NUMERIC(12,2) DEFAULT 0,
  total_price NUMERIC(12,2) GENERATED ALWAYS AS (base_price + gov_fee + insurance_fee + office_fee + other_fees) STORED,
  vat_percentage NUMERIC(5,2) DEFAULT 15,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══ BIZ-3: صلاحيات حسب الفرع ═══
ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_branches UUID[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_all_branches BOOLEAN DEFAULT true;

-- ═══ Functions ═══

-- Function: Auto-generate smart alerts from expiry dates
CREATE OR REPLACE FUNCTION generate_smart_alerts()
RETURNS void AS $$
BEGIN
  -- Worker iqama expiry
  INSERT INTO smart_alerts (entity_type, entity_id, alert_type, entity_name, expiry_date, severity, branch_id)
  SELECT 'worker', w.id, 'iqama_expiry', w.name_ar,
    w.iqama_expiry_date,
    CASE 
      WHEN w.iqama_expiry_date <= CURRENT_DATE THEN 'critical'
      WHEN w.iqama_expiry_date <= CURRENT_DATE + 15 THEN 'urgent'
      WHEN w.iqama_expiry_date <= CURRENT_DATE + 30 THEN 'warning'
      ELSE 'info'
    END,
    w.branch_id
  FROM workers w
  WHERE w.deleted_at IS NULL
    AND w.iqama_expiry_date IS NOT NULL
    AND w.iqama_expiry_date <= CURRENT_DATE + 60
    AND NOT EXISTS (
      SELECT 1 FROM smart_alerts sa
      WHERE sa.entity_type = 'worker' AND sa.entity_id = w.id
        AND sa.alert_type = 'iqama_expiry' AND sa.status = 'active'
    );

  -- Worker passport expiry
  INSERT INTO smart_alerts (entity_type, entity_id, alert_type, entity_name, expiry_date, severity, branch_id)
  SELECT 'worker', w.id, 'passport_expiry', w.name_ar,
    w.passport_expiry_date,
    CASE 
      WHEN w.passport_expiry_date <= CURRENT_DATE THEN 'critical'
      WHEN w.passport_expiry_date <= CURRENT_DATE + 30 THEN 'urgent'
      ELSE 'warning'
    END,
    w.branch_id
  FROM workers w
  WHERE w.deleted_at IS NULL
    AND w.passport_expiry_date IS NOT NULL
    AND w.passport_expiry_date <= CURRENT_DATE + 90
    AND NOT EXISTS (
      SELECT 1 FROM smart_alerts sa
      WHERE sa.entity_type = 'worker' AND sa.entity_id = w.id
        AND sa.alert_type = 'passport_expiry' AND sa.status = 'active'
    );

  -- Facility CR expiry
  INSERT INTO smart_alerts (entity_type, entity_id, alert_type, entity_name, expiry_date, severity, branch_id)
  SELECT 'facility', f.id, 'cr_expiry', f.name_ar,
    f.cr_expiry_date,
    CASE 
      WHEN f.cr_expiry_date <= CURRENT_DATE THEN 'critical'
      WHEN f.cr_expiry_date <= CURRENT_DATE + 30 THEN 'urgent'
      ELSE 'warning'
    END,
    f.branch_id
  FROM facilities f
  WHERE f.deleted_at IS NULL
    AND f.cr_expiry_date IS NOT NULL
    AND f.cr_expiry_date <= CURRENT_DATE + 60
    AND NOT EXISTS (
      SELECT 1 FROM smart_alerts sa
      WHERE sa.entity_type = 'facility' AND sa.entity_id = f.id
        AND sa.alert_type = 'cr_expiry' AND sa.status = 'active'
    );

  -- Overdue invoices
  INSERT INTO smart_alerts (entity_type, entity_id, alert_type, entity_name, expiry_date, severity, branch_id)
  SELECT 'invoice', i.id, 'invoice_overdue', i.invoice_number,
    i.due_date,
    CASE 
      WHEN CURRENT_DATE - i.due_date > 60 THEN 'critical'
      WHEN CURRENT_DATE - i.due_date > 30 THEN 'urgent'
      ELSE 'warning'
    END,
    i.branch_id
  FROM invoices i
  WHERE i.deleted_at IS NULL
    AND i.status IN ('unpaid','partial')
    AND i.due_date < CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM smart_alerts sa
      WHERE sa.entity_type = 'invoice' AND sa.entity_id = i.id
        AND sa.alert_type = 'invoice_overdue' AND sa.status = 'active'
    );

  -- Auto-resolve alerts for renewed/paid items
  UPDATE smart_alerts SET status = 'resolved', resolved_at = now()
  WHERE status = 'active' AND alert_type = 'iqama_expiry'
    AND entity_id IN (SELECT id FROM workers WHERE iqama_expiry_date > CURRENT_DATE + 60);

  UPDATE smart_alerts SET status = 'resolved', resolved_at = now()
  WHERE status = 'active' AND alert_type = 'invoice_overdue'
    AND entity_id IN (SELECT id FROM invoices WHERE status = 'paid');
END;
$$ LANGUAGE plpgsql;

-- Function: Update client ratings automatically
CREATE OR REPLACE FUNCTION update_client_ratings()
RETURNS void AS $$
BEGIN
  UPDATE clients c SET
    total_invoices = COALESCE(s.cnt, 0),
    total_paid = COALESCE(s.paid, 0),
    total_pending = COALESCE(s.pending, 0),
    overdue_count = COALESCE(s.overdue, 0),
    last_payment_date = s.last_pay,
    rating = CASE
      WHEN COALESCE(s.overdue, 0) >= 3 THEN 1
      WHEN COALESCE(s.overdue, 0) >= 2 THEN 2
      WHEN COALESCE(s.overdue, 0) >= 1 THEN 3
      WHEN COALESCE(s.pending, 0) > 0 THEN 4
      ELSE 5
    END
  FROM (
    SELECT 
      i.client_id,
      COUNT(*) as cnt,
      SUM(COALESCE(i.paid_amount,0)) as paid,
      SUM(COALESCE(i.remaining_amount,0)) as pending,
      COUNT(*) FILTER (WHERE i.status IN ('unpaid','partial') AND i.due_date < CURRENT_DATE) as overdue,
      MAX(i.updated_at) FILTER (WHERE i.paid_amount > 0) as last_pay
    FROM invoices i
    WHERE i.deleted_at IS NULL
    GROUP BY i.client_id
  ) s
  WHERE c.id = s.client_id AND c.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function: Update installment statuses
CREATE OR REPLACE FUNCTION update_installment_statuses()
RETURNS void AS $$
BEGIN
  UPDATE installments SET status = 'overdue', updated_at = now()
  WHERE status = 'pending' AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Enhanced weekly_update to include new features
CREATE OR REPLACE FUNCTION weekly_update()
RETURNS TEXT AS $$
DECLARE result TEXT := '';
BEGIN
  -- Generate smart alerts
  PERFORM generate_smart_alerts();
  result := result || 'Smart alerts generated. ';
  
  -- Update client ratings
  PERFORM update_client_ratings();
  result := result || 'Client ratings updated. ';
  
  -- Update installment statuses
  PERFORM update_installment_statuses();
  result := result || 'Installments checked. ';
  
  -- Update last weekly update timestamp
  UPDATE system_settings SET setting_value = now()::TEXT WHERE setting_key = 'last_weekly_update';
  
  result := result || 'Done.';
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ═══ Supabase Storage Bucket for attachments ═══
-- Run this separately in Supabase Dashboard > Storage
-- CREATE BUCKET: jisr-files (public: false)

-- ═══ Row Level Security ═══
ALTER TABLE communication_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_pricing ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (adjust per your needs)
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'communication_log','smart_alerts','commissions','worker_timeline',
    'attachments','installments','message_templates','appointments',
    'operational_expenses','approval_requests','service_pricing'
  ])
  LOOP
    EXECUTE format('CREATE POLICY "Allow all for authenticated" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- ═══ Views for reports ═══
CREATE OR REPLACE VIEW client_statement AS
SELECT 
  c.id as client_id,
  c.name_ar as client_name,
  c.phone,
  c.rating,
  i.id as invoice_id,
  i.invoice_number,
  i.created_at as invoice_date,
  i.total_amount,
  i.paid_amount,
  i.remaining_amount,
  i.status,
  i.due_date,
  p.id as payment_id,
  p.amount as payment_amount,
  p.payment_date,
  p.payment_method
FROM clients c
LEFT JOIN invoices i ON i.client_id = c.id AND i.deleted_at IS NULL
LEFT JOIN payments p ON p.invoice_id = i.id AND p.deleted_at IS NULL
WHERE c.deleted_at IS NULL
ORDER BY c.name_ar, i.created_at DESC;

-- Employee performance view
CREATE OR REPLACE VIEW employee_performance AS
SELECT 
  u.id as user_id,
  u.name_ar,
  u.name_en,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as completed_transactions,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'in_progress') as active_transactions,
  COUNT(DISTINCT i.id) as invoices_created,
  SUM(COALESCE(i.paid_amount,0)) as total_collected,
  COUNT(DISTINCT tk.id) FILTER (WHERE tk.status = 'completed') as tasks_completed,
  COUNT(DISTINCT tk.id) FILTER (WHERE tk.status = 'overdue') as tasks_overdue,
  COUNT(DISTINCT cl.id) as communications_made
FROM users u
LEFT JOIN transactions t ON t.assigned_to = u.id AND t.deleted_at IS NULL
LEFT JOIN invoices i ON i.created_by = u.id AND i.deleted_at IS NULL
LEFT JOIN tasks tk ON tk.assigned_to = u.id AND tk.deleted_at IS NULL
LEFT JOIN communication_log cl ON cl.created_by = u.id AND cl.deleted_at IS NULL
  AND cl.created_at >= date_trunc('month', CURRENT_DATE)
WHERE u.deleted_at IS NULL AND u.is_active = true
GROUP BY u.id, u.name_ar, u.name_en;

SELECT 'Migration v2 completed successfully!' as status;
