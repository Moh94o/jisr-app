-- «الدخول لقوى» — تبويبٌ جديد يسجّل الدخول لمنصة قوى من داخل جسر (QiwaLoginPage + إضافة كروم).
-- وحدة صلاحياتٍ مستقلّة بإجراءٍ واحد `qiwa_login.access`. لا تُمنح لأي دور هنا: التبويب
-- يولد مقفلاً ويفتحه المدير العام من شاشة الأدوار لمن يشاء.
insert into public.permissions (module, action, label_ar, module_label_ar, module_icon, module_sort, sort_order, is_active)
values ('qiwa_login', 'access', 'الدخول لقوى من جسر', 'الدخول لقوى', 'userPerm', 108, 0, true)
on conflict (module, action) do update
  set label_ar = excluded.label_ar,
      module_label_ar = excluded.module_label_ar,
      module_icon = excluded.module_icon,
      module_sort = excluded.module_sort,
      is_active = true;
