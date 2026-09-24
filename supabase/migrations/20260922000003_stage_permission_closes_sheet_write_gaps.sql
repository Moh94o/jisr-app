-- تتمّةُ مبدأ «الصلاحية تحكم لا المكتب» على باقي جداول العمل (قرار المستخدم 2026-09-22).
--
-- جداولُ الطلبات الأربعة إخوةٌ تكتب فيها الشيتات نفسها، وكانت سياساتُها متفاوتة:
-- `visa_applications` و`iqama_issuance_applications` و`service_requests` تقبل
-- «مراحل المعاملة»، و`other_applications` لا تقبلها — تفاوتٌ بلا سبب: شيتات
-- الخدمات تكتب `other_applications.details` بنفس اليد التي تكتب أخواتها.
alter policy other_applications_update_priv on public.other_applications
  using (
    current_user_is_super_admin()
    or current_user_has_permission('invoices.edit')
    or current_user_has_permission('invoices.manage_stages')
    or current_user_has_permission('invoices.accountant_approve')
    or exists (select 1 from public.invoices i
                where i.service_request_id = other_applications.service_request_id
                  and i.created_by = current_app_user_id())
  );

-- وشيتُ «إصدار الإقامات» **يُنشئ** صفّ الإقامة للتأشيرة عند أوّل إدخال، فيلزمه
-- الإدراج. واشتراطُ `invoices.create` وحده خطأٌ في الموضع: ذاك إذنُ **إصدار
-- فاتورة** لا إذنُ تعبئة مرحلة — ومنحُه لمُعقّبٍ يفتح له بابَ الفوترة كلَّه.
alter policy iqama_issuance_applications_insert_priv on public.iqama_issuance_applications
  with check (
    current_user_is_super_admin()
    or current_user_has_permission('invoices.create')
    or current_user_has_permission('invoices.manage_stages')
  );
