-- مرآة `optIn` في permCatalog.js: جدول «الحسابات البنكية» (bank_accounts) محجوب
-- افتراضياً حتى يُمنح صراحةً. (مُطبَّق على الإنتاج 2026-10-04)
create or replace function public._ops_sheet_opt_in(p_view text)
 returns boolean
 language sql
 immutable
 set search_path to 'public'
as $function$
  select p_view = any (array['offices','owner_exemption','iqama_expiring','iqama_dispatch','iqama_renewal',
    'svc_chamber','svc_ajeer','svc_medical','svc_profession','svc_ext_transfer','svc_exit_reentry',
    'svc_final_exit','svc_salary','svc_passport','svc_documents','worker_overdue','bank_accounts']);
$function$;
