-- ============================================================
-- Phase 0: RBAC Helper Functions + Permission Catalog Seed
-- Builds ON TOP of existing roles/permissions/user_permissions/role_permissions
-- ============================================================

-- ───────────────────────────────────────────────────────────
-- 1) Helper functions used inside RLS policies on new tables
-- ───────────────────────────────────────────────────────────

-- Resolve the public.users.id for the current Supabase auth user
create or replace function public.current_app_user_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select u.id
  from public.users u
  where u.auth_user_id = auth.uid()
    and (u.is_active is null or u.is_active = true)
    and u.deleted_at is null
  limit 1;
$$;

-- Generic permission check: looks up "<module>.<action>" in v_user_effective_permissions
create or replace function public.current_user_has_permission(p_permission_code text)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_user_id uuid := public.current_app_user_id();
  v_module text;
  v_action text;
  v_dot int;
  v_found boolean;
begin
  if v_user_id is null then return false; end if;
  v_dot := position('.' in p_permission_code);
  if v_dot < 2 then return false; end if;
  v_module := split_part(p_permission_code, '.', 1);
  -- Action is everything after the FIRST dot, in case action codes contain dots themselves.
  v_action := substr(p_permission_code, v_dot + 1);
  select exists(
    select 1 from public.v_user_effective_permissions vp
    where vp.user_id = v_user_id
      and vp.module = v_module
      and vp.action = v_action
      and vp.is_granted = true
  ) into v_found;
  return coalesce(v_found, false);
end;
$$;

-- Convenience: branch ids the current user can access (NULL row in user_roles = all branches)
create or replace function public.current_user_branch_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  with me as (select public.current_app_user_id() as id)
  select b.id
  from public.branches b
  where b.deleted_at is null
    and (
      -- super_admin / org_admin: all branches
      exists (
        select 1 from public.users u
        join public.roles r on r.id = u.role_id
        where u.id = (select id from me)
          and r.name_en in ('Super Admin','Org Admin','Owner','GM')
      )
      -- otherwise restrict to user's primary_branch_id
      or exists (
        select 1 from public.users u
        where u.id = (select id from me) and u.primary_branch_id = b.id
      )
    );
$$;

-- Detect Super Admin
create or replace function public.current_user_is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1
    from public.users u
    join public.roles r on r.id = u.role_id
    where u.auth_user_id = auth.uid()
      and (r.name_en ilike 'super admin' or r.name_ar ilike '%مدير عام%' or r.name_ar ilike '%عام%')
      and (u.is_active is null or u.is_active = true)
  );
$$;

grant execute on function public.current_app_user_id() to authenticated;
grant execute on function public.current_user_has_permission(text) to authenticated;
grant execute on function public.current_user_branch_ids() to authenticated;
grant execute on function public.current_user_is_super_admin() to authenticated;

-- ───────────────────────────────────────────────────────────
-- 2) Generic audit triggers (used by every new table below)
-- ───────────────────────────────────────────────────────────

-- Only create these helpers if missing — the project may already have
-- equivalents wired into existing tables.
do $$
begin
  if not exists (select 1 from pg_proc where proname = 'set_updated_at' and pronamespace = 'public'::regnamespace) then
    execute $fn$create or replace function public.set_updated_at()
    returns trigger language plpgsql as $body$
    begin new.updated_at := now(); return new; end;
    $body$$fn$;
  end if;
  if not exists (select 1 from pg_proc where proname = 'set_created_updated_by' and pronamespace = 'public'::regnamespace) then
    execute $fn$create or replace function public.set_created_updated_by()
    returns trigger language plpgsql as $body$
    begin
      if (tg_op = 'INSERT') and new.created_by is null then new.created_by := public.current_app_user_id(); end if;
      if (tg_op = 'UPDATE') then new.updated_by := public.current_app_user_id(); end if;
      return new;
    end;
    $body$$fn$;
  end if;
end$$;

-- ───────────────────────────────────────────────────────────
-- 3) Permission catalog: ensure all new module codes exist
-- Uses the existing public.permissions table.
-- ───────────────────────────────────────────────────────────

-- The existing permissions table on this project uses `label_ar` for the
-- per-action label. Stage rows then upsert into the real columns.
do $$
begin
  -- Build a temp staging set of permissions and merge by (module,action).
  create temp table _new_perms (
    module text, action text, label_ar text, mod_label_ar text, mod_icon text, mod_sort int, sort int
  ) on commit drop;

  insert into _new_perms (module, action, label_ar, mod_label_ar, mod_icon, mod_sort, sort) values
    -- accounting
    ('accounting','coa.read','عرض شجرة الحسابات','المحاسبة','BookOpen', 50, 10),
    ('accounting','coa.manage','إدارة شجرة الحسابات','المحاسبة','BookOpen', 50, 11),
    ('accounting','journal_entry.read','عرض القيود','المحاسبة','BookOpen', 50, 20),
    ('accounting','journal_entry.create','إنشاء قيد يومية','المحاسبة','BookOpen', 50, 21),
    ('accounting','journal_entry.post','ترحيل القيد','المحاسبة','BookOpen', 50, 22),
    ('accounting','journal_entry.reverse','عكس القيد','المحاسبة','BookOpen', 50, 23),
    ('accounting','period.close','إقفال الفترة','المحاسبة','BookOpen', 50, 30),
    ('accounting','bank.reconcile','تسوية بنكية','المحاسبة','BookOpen', 50, 40),
    ('accounting','reports.pl','تقرير الأرباح والخسائر','المحاسبة','BookOpen', 50, 50),
    ('accounting','reports.bs','الميزانية العمومية','المحاسبة','BookOpen', 50, 51),
    ('accounting','reports.gl','دفتر الأستاذ','المحاسبة','BookOpen', 50, 52),
    ('accounting','reports.tb','ميزان المراجعة','المحاسبة','BookOpen', 50, 53),
    ('accounting','reports.cashflow','قائمة التدفقات النقدية','المحاسبة','BookOpen', 50, 54),
    -- zatca
    ('zatca','settings.manage','إعدادات ZATCA','الفوترة الإلكترونية','FileCheck2', 60, 10),
    ('zatca','compliance.read','حالة الامتثال','الفوترة الإلكترونية','FileCheck2', 60, 20),
    ('zatca','invoice.submit','إرسال الفاتورة لـ ZATCA','الفوترة الإلكترونية','FileCheck2', 60, 30),
    -- whatsapp
    ('whatsapp','message.send','إرسال رسائل واتساب','واتساب الأعمال','MessageCircle', 70, 10),
    ('whatsapp','template.manage','إدارة قوالب واتساب','واتساب الأعمال','MessageCircle', 70, 20),
    ('whatsapp','conversation.read','عرض محادثات واتساب','واتساب الأعمال','MessageCircle', 70, 30),
    ('whatsapp','settings.manage','إعدادات واتساب','واتساب الأعمال','MessageCircle', 70, 40),
    -- client portal
    ('portal','invite','دعوة عميل لبوابة العميل','بوابة العميل','UserPlus', 80, 10),
    ('portal','review_uploads','مراجعة وثائق العملاء','بوابة العميل','UserPlus', 80, 20);

  insert into public.permissions (module, action, label_ar, module_label_ar, module_icon, module_sort, sort_order, is_active)
  select n.module, n.action, n.label_ar, n.mod_label_ar, n.mod_icon, n.mod_sort, n.sort, true
  from _new_perms n
  on conflict (module, action) do nothing;
end$$;

-- ───────────────────────────────────────────────────────────
-- 4) Auto-grant the new permissions to "Super Admin" / "GM"
--    by inserting into role_permissions if such a role exists.
-- ───────────────────────────────────────────────────────────

do $$
declare
  v_role_id uuid;
begin
  for v_role_id in
    select r.id
    from public.roles r
    where (r.name_en ilike 'super admin' or r.name_en ilike 'gm' or r.name_en ilike 'owner'
           or r.name_ar ilike '%مدير عام%' or r.name_ar ilike '%مالك%')
  loop
    insert into public.role_permissions (role_id, permission_id, is_granted)
    select v_role_id, p.id, true
    from public.permissions p
    where p.module in ('accounting','zatca','whatsapp','portal')
    on conflict (role_id, permission_id) do update set is_granted = excluded.is_granted;
  end loop;
exception
  when undefined_column then
    -- fallback if role_permissions doesn't have is_granted
    for v_role_id in
      select r.id from public.roles r
      where (r.name_en ilike 'super admin' or r.name_en ilike 'gm' or r.name_en ilike 'owner'
             or r.name_ar ilike '%مدير عام%' or r.name_ar ilike '%مالك%')
    loop
      insert into public.role_permissions (role_id, permission_id)
      select v_role_id, p.id
      from public.permissions p
      where p.module in ('accounting','zatca','whatsapp','portal')
      on conflict do nothing;
    end loop;
end$$;
