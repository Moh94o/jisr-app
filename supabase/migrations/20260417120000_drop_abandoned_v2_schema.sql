-- Drop abandoned _v2 parallel schema (29 tables)
-- Both code audit (docs/v2_tables_code_audit.md) and DB audit
-- (docs/v2_tables_db_audit.md) confirmed: SAFE TO DROP WITH CASCADE.
-- settings_v2 content already duplicated in system_settings; no migration needed.

BEGIN;

DROP TABLE IF EXISTS public.agents_v2                  CASCADE;
DROP TABLE IF EXISTS public.approval_flows_v2          CASCADE;
DROP TABLE IF EXISTS public.audit_log_v2               CASCADE;
DROP TABLE IF EXISTS public.clients_v2                 CASCADE;
DROP TABLE IF EXISTS public.commercial_records_v2      CASCADE;
DROP TABLE IF EXISTS public.countries_nationalities_v2 CASCADE;
DROP TABLE IF EXISTS public.daily_payments_v2          CASCADE;
DROP TABLE IF EXISTS public.exemption_transfers_v2     CASCADE;
DROP TABLE IF EXISTS public.facilities_v2              CASCADE;
DROP TABLE IF EXISTS public.gosi_establishments_v2     CASCADE;
DROP TABLE IF EXISTS public.installments_v2            CASCADE;
DROP TABLE IF EXISTS public.invoices_v2                CASCADE;
DROP TABLE IF EXISTS public.main_requests_v2           CASCADE;
DROP TABLE IF EXISTS public.notifications_v2           CASCADE;
DROP TABLE IF EXISTS public.offices_v2                 CASCADE;
DROP TABLE IF EXISTS public.owners_v2                  CASCADE;
DROP TABLE IF EXISTS public.perm_visa_apps_v2          CASCADE;
DROP TABLE IF EXISTS public.regions_cities_v2          CASCADE;
DROP TABLE IF EXISTS public.saudization_records_v2     CASCADE;
DROP TABLE IF EXISTS public.service_pricing_v2         CASCADE;
DROP TABLE IF EXISTS public.settings_v2                CASCADE;
DROP TABLE IF EXISTS public.sms_messages_v2            CASCADE;
DROP TABLE IF EXISTS public.transfer_apps_v2           CASCADE;
DROP TABLE IF EXISTS public.users_v2                   CASCADE;
DROP TABLE IF EXISTS public.whatsapp_groups_v2         CASCADE;
DROP TABLE IF EXISTS public.whatsapp_log_v2            CASCADE;
DROP TABLE IF EXISTS public.whatsapp_templates_v2      CASCADE;
DROP TABLE IF EXISTS public.workers_v2                 CASCADE;
DROP TABLE IF EXISTS public.wps_payroll_v2             CASCADE;

COMMIT;
