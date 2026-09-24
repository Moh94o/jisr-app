-- قرار المستخدم 2026-09-22: في جداول العمل **الصلاحية هي التي تحكم لا المكتب**.
-- من يملك «مراحل المعاملة» (invoices.manage_stages) يُدخل بيانات المرحلة على أي
-- صفّ مهما كان مكتبه — «مالها شغل بالمكتب».
--
-- سياسةُ التعديل كانت تقبله أصلاً: `current_user_can_on_branch('invoices.manage_stages', …)`
-- تردّ true لكل الفروع متى كان تكليفُ المستخدم بلا فرع. لكنّ سياسةَ **القراءة**
-- كانت مقيَّدةً بمكاتبه، وبوستجرس يطبّق سياسة SELECT على UPDATE — فالصفّ غير
-- المرئيّ غير قابل للتحديث. والشبكة تقرأ من عرضٍ يتجاوز RLS فتُريه صفوف كل
-- المكاتب: يملأ المرحلة ولا تُحفظ، والرسالة «تعذّر الحفظ في المعاملة».
-- فتُضاف الصلاحية نفسُها إلى القراءة ليستقيم البابان.
--
-- ⚠️ من لا يملك الصلاحية يبقى مقيَّداً بمكاتبه كما كان (مُتحقَّق منه بمحاكاة
--    جلسة مستخدم بلا الصلاحية: ٦٧ صفاً، ولا شيء من خارج مكتبه).

drop policy if exists irc_select on public.iqama_renewal_calculation;
create policy irc_select on public.iqama_renewal_calculation
  for select
  using (
    current_user_is_super_admin()
    or current_user_has_permission('invoices.manage_stages')
    or (current_user_quote_offices('renewal_calc') is null)
    or (branch_id = any (current_user_quote_offices('renewal_calc')))
    or (invoice_id is not null and exists (
          select 1 from public.invoices i where i.id = iqama_renewal_calculation.invoice_id))
  );

drop policy if exists tc_select_authenticated on public.transfer_calculation;
create policy tc_select_authenticated on public.transfer_calculation
  for select
  using (
    current_user_is_super_admin()
    or current_user_has_permission('invoices.manage_stages')
    or (current_user_quote_offices('quotations') is null)
    or (branch_id = any (current_user_quote_offices('quotations')))
    or (invoice_id is not null and exists (
          select 1 from public.invoices i where i.id = transfer_calculation.invoice_id))
  );
