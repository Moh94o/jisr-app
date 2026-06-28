-- ════════════════════════════════════════════════════════════════════
-- Granular FIELD-LOCK enforcement (DB layer for the per-user permission UI)
-- --------------------------------------------------------------------
-- users.ui_visibility holds per-user field locks:
--   'fieldedit:<tab>:<field_key>' = false  → column read-only for that user
--   'field:<tab>:<field_key>'     = false  → field hidden (⇒ also non-editable)
-- This trigger makes those locks REAL: a locked column cannot be changed even
-- via the raw API. field_lock_map maps a physical column → the (tab, field_key)
-- that guards it (multiple rows per column allowed). GM/super bypasses.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.field_lock_map (
  table_name  text not null,
  column_name text not null,
  tab         text not null,
  field_key   text not null,
  primary key (table_name, column_name, tab, field_key)
);
comment on table public.field_lock_map is
  'Maps physical columns to permission field keys; read by enforce_field_locks().';

alter table public.field_lock_map enable row level security;
drop policy if exists field_lock_map_read on public.field_lock_map;
create policy field_lock_map_read on public.field_lock_map
  for select to authenticated using (true);

create or replace function public.enforce_field_locks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := public.current_app_user_id();
  v_vis  jsonb;
  v_old  jsonb;
  v_new  jsonb;
  r      record;
begin
  -- Unknown caller (edge function / service role / server job) — enforced by
  -- that layer, not here. GM/super bypasses everything.
  if v_user is null then return new; end if;
  if public.current_user_is_super_admin() then return new; end if;
  select ui_visibility into v_vis from public.users where id = v_user;
  if v_vis is null or v_vis = '{}'::jsonb then return new; end if;
  v_old := to_jsonb(old);
  v_new := to_jsonb(new);
  for r in
    select column_name, tab, field_key from public.field_lock_map where table_name = tg_table_name
  loop
    if (v_vis -> ('fieldedit:' || r.tab || ':' || r.field_key)) = 'false'::jsonb
       or (v_vis -> ('field:' || r.tab || ':' || r.field_key)) = 'false'::jsonb then
      if (v_old ->> r.column_name) is distinct from (v_new ->> r.column_name) then
        raise exception 'FIELD_LOCKED: لا تملك صلاحية تعديل هذا الحقل (%.%)', tg_table_name, r.column_name
          using errcode = '42501';
      end if;
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function public.enforce_field_locks() from public;
grant execute on function public.enforce_field_locks() to authenticated;

-- Idempotent helper to attach the guard to a table (called per business table).
create or replace function public._attach_field_lock_trigger(p_table text)
returns void language plpgsql set search_path = public as $$
begin
  execute format('drop trigger if exists trg_field_locks on public.%I', p_table);
  execute format('create trigger trg_field_locks before update on public.%I for each row execute function public.enforce_field_locks()', p_table);
end;
$$;
