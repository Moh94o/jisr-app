-- Align invoice-family tables to ServiceRequest page needs (ADDITIVE ONLY).
-- Source of truth: docs/invoice_schema_alignment.md
--
-- Adds three targeted columns; no drops, no renames, no type changes:
--   invoice_installments.label_ar  — Arabic label for each scheduled installment
--   invoice_installments.phase     — machine-readable phase key (visa splits etc.)
--   invoice_items.category         — semantic classification of invoice line items
--
-- ADD COLUMN IF NOT EXISTS + DO-block guards make this re-runnable.

BEGIN;

-- ────────────────────────────────────────────────────────────────
-- invoice_installments.label_ar
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.invoice_installments
  ADD COLUMN IF NOT EXISTS label_ar VARCHAR(160) NULL;

COMMENT ON COLUMN public.invoice_installments.label_ar IS
  'Human-readable Arabic label for this installment (e.g. "دفعة الإصدار", "رسوم الإقامة", "القسط الأول"). Used by ServiceRequestPage visa/kafala installment previews; kept separate from the free-text notes column.';

-- ────────────────────────────────────────────────────────────────
-- invoice_installments.phase
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.invoice_installments
  ADD COLUMN IF NOT EXISTS phase VARCHAR(32) NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'invoice_installments'
      AND constraint_name = 'invoice_installments_phase_check'
  ) THEN
    ALTER TABLE public.invoice_installments
      ADD CONSTRAINT invoice_installments_phase_check
      CHECK (phase IS NULL OR phase IN ('issuance','authorization','residence','standard','final','custom'));
  END IF;
END $$;

COMMENT ON COLUMN public.invoice_installments.phase IS
  'Machine-readable installment phase key. Maps to visa 3-way payment split (issuance / authorization / residence) and generic groupings (standard / final / custom). NULL for legacy rows.';

CREATE INDEX IF NOT EXISTS idx_invoice_installments_phase
  ON public.invoice_installments(phase)
  WHERE phase IS NOT NULL;

-- ────────────────────────────────────────────────────────────────
-- invoice_items.category
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS category VARCHAR(32) NULL DEFAULT 'service';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'invoice_items'
      AND constraint_name = 'invoice_items_category_check'
  ) THEN
    ALTER TABLE public.invoice_items
      ADD CONSTRAINT invoice_items_category_check
      CHECK (category IS NULL OR category IN ('service','gov_fee','medical','office','extra','deduction','other'));
  END IF;
END $$;

COMMENT ON COLUMN public.invoice_items.category IS
  'Semantic classification beyond item_type. Values: service | gov_fee | medical | office | extra | deduction | other. Lets the UI group kafala/iqama breakdowns (transfer fees, work-permit fees, medical, office, add-ons, deductions) and lets accounting separate recoverable government fees from service revenue. Defaults to "service" for backfill.';

CREATE INDEX IF NOT EXISTS idx_invoice_items_category
  ON public.invoice_items(category)
  WHERE category IS NOT NULL;

COMMIT;
