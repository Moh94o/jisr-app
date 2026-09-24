-- منشأة العامل كانت تظهر «غير مرتبط بمنشأة» لكل مستخدم بلا صلاحية facilities.view:
-- التضمين (facility:current_facility_id) يُفرَّغ بصمت تحت RLS، فيبدو الربط مفقوداً وهو موجود.
-- الحل: سياسة قراءة المنشآت تتبع سياق العامل — نفس توسعة workers_select تماماً
-- (من يرى العامل داخل فاتورة/عرض سعر يحتاج أرقام منشأته: الموحّد، الموارد البشرية، التأمينات).
alter policy facilities_select on public.facilities
  using (
    current_user_is_super_admin()
    or current_user_has_permission('facilities.view')
    or current_user_has_permission('workers.view')
    or current_user_has_permission('invoices.view')
    or current_user_has_permission('quotations.view')
  );
