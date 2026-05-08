-- ============================================================
-- Jisr Tier 1 — One-shot apply script
-- Run this in Supabase SQL Editor to install all Tier 1 modules:
-- Phase 0 (RBAC helpers + permission seed)
-- Phase 1 (Accounting Core)
-- Phase 2 (ZATCA Phase 2)
-- Phase 3 (WhatsApp Business)
-- Phase 4 (Client Portal)
-- ============================================================
-- Note: this file simply concatenates the individual migrations
-- under supabase/migrations/. Each migration is idempotent.
-- ============================================================

\i supabase/migrations/20260512000001_rbac_helpers_and_seeds.sql
\i supabase/migrations/20260513000001_accounting_core.sql
\i supabase/migrations/20260513000002_accounting_saudi_coa_and_posting.sql
\i supabase/migrations/20260514000001_zatca_core.sql
\i supabase/migrations/20260515000001_whatsapp_core.sql
\i supabase/migrations/20260516000001_client_portal_core.sql
