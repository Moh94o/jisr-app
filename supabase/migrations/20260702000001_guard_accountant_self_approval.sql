-- فصل المهام على مستوى قاعدة البيانات: منشئ فاتورة الطلب لا يعتمد «موافقة المحاسب» على طلبه.
-- طبقة دفاعية خلف إخفاء الزر في الواجهة (InvoicePage: !isCreator على inv_stage_acct_approval) —
-- تمنع أي كتابة مباشرة (API) لحقول accountant_* من المنشئ عبر تجاوز-المنشئ في سياسة UPDATE.
-- المشرف الأعلى/المدير العام مستثنيان (لتصحيحات إدارية). SECURITY DEFINER كي تقرأ invoices رغم RLS.
create or replace function public.guard_accountant_self_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.accountant_status is distinct from old.accountant_status
      or new.accountant_by is distinct from old.accountant_by) then
    if not (current_user_is_super_admin() or is_general_manager()) then
      if exists (
        select 1 from public.invoices i
        where i.service_request_id = new.id
          and i.created_by = current_app_user_id()
      ) then
        raise exception 'لا يمكن لمنشئ الفاتورة اعتماد موافقة المحاسب على طلبه (فصل المهام).'
          using errcode = 'check_violation';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_acct_self_approval on public.service_requests;
create trigger trg_guard_acct_self_approval
  before update on public.service_requests
  for each row
  execute function public.guard_accountant_self_approval();
