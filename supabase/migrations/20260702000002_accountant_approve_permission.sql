-- صلاحية «موافقة المحاسب» كإجراء فعلي (لا مجرد نافذة) — يمكّن دور المحاسب من اعتماد الطلبات
-- التي تتطلب موافقة المحاسب (خروج نهائي/نقل خارجي/خروج وعودة) دون منحه invoices.edit الكامل.
-- الواجهة: InvoicePage يبوّب الزر على canPerm('invoices.accountant_approve') && !isCreator.
-- يوسّع حارس 20260702000001 (فصل المهام) ليقصر «المحاسب فقط» على حقول accountant_* لا غير.

-- (1) بذر الصلاحية في كتالوج الصلاحيات (module.action = invoices.accountant_approve).
insert into public.permissions (module, module_label_ar, module_icon, module_sort, action, label_ar, sort_order, is_active)
select 'invoices', module_label_ar, module_icon, module_sort, 'accountant_approve', 'موافقة المحاسب', 999, true
from public.permissions where module='invoices' limit 1
on conflict (module, action) do update set label_ar = excluded.label_ar, is_active = true;

-- (2) سياسة UPDATE على service_requests: يُسمح أيضاً لحامل صلاحية «موافقة المحاسب».
alter policy service_requests_update_priv on public.service_requests
  using (
    current_user_is_super_admin()
    or current_user_has_permission('invoices.edit'::text)
    or current_user_has_permission('invoices.accountant_approve'::text)
    or (exists (select 1 from public.invoices i where i.service_request_id = service_requests.id and i.created_by = current_app_user_id()))
  )
  with check (
    current_user_is_super_admin()
    or current_user_has_permission('invoices.edit'::text)
    or current_user_has_permission('invoices.accountant_approve'::text)
    or (exists (select 1 from public.invoices i where i.service_request_id = service_requests.id and i.created_by = current_app_user_id()))
  );

-- (3) حارس فصل المهام (يستبدل نسخة 20260702000001): منع الاعتماد الذاتي للمنشئ + حصر «المحاسب فقط» بحقول accountant_*.
create or replace function public.guard_accountant_self_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin   boolean := current_user_is_super_admin() or is_general_manager();
  v_creator boolean;
  v_edit    boolean;
  v_acct    boolean;
  v_changed boolean := (new.accountant_status is distinct from old.accountant_status
                        or new.accountant_by is distinct from old.accountant_by
                        or new.accountant_note is distinct from old.accountant_note
                        or new.accountant_at is distinct from old.accountant_at);
  v_old jsonb; v_new jsonb; k text;
begin
  if v_admin then return new; end if;

  v_creator := exists (
    select 1 from public.invoices i
    where i.service_request_id = new.id and i.created_by = current_app_user_id()
  );

  -- فصل المهام: منشئ الفاتورة لا يعتمد موافقة المحاسب على طلبه.
  if v_changed and v_creator then
    raise exception 'لا يمكن لمنشئ الفاتورة اعتماد موافقة المحاسب على طلبه (فصل المهام).'
      using errcode = 'check_violation';
  end if;

  v_edit := current_user_has_permission('invoices.edit');
  v_acct := current_user_has_permission('invoices.accountant_approve');

  -- «المحاسب فقط» (صلاحية الموافقة بلا تعديل ولا كونه المنشئ): يُسمح له بتعديل حقول المحاسب فقط.
  if (not v_edit) and (not v_creator) and v_acct then
    v_old := to_jsonb(old); v_new := to_jsonb(new);
    for k in select jsonb_object_keys(v_new) loop
      if k not in ('accountant_status','accountant_by','accountant_note','accountant_at','updated_at')
         and (v_new -> k) is distinct from (v_old -> k) then
        raise exception 'المحاسب لا يعدّل سوى حقول موافقة المحاسب.'
          using errcode = 'check_violation';
      end if;
    end loop;
  end if;

  return new;
end;
$$;
