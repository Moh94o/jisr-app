-- ============================================================
-- Phase 4: Client Portal (OTP login + uploads)
-- ============================================================

create table if not exists public.client_portal_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,                          -- references auth.users(id) — managed by edge fn
  client_id uuid not null references public.clients(id) on delete cascade,
  person_id uuid references public.persons(id),
  phone text not null,
  full_name_ar text not null,
  email text,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  last_login_at timestamptz,
  invited_at timestamptz,
  invited_by uuid references public.users(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_cpu_client on public.client_portal_users(client_id);
create unique index if not exists idx_cpu_phone on public.client_portal_users(phone) where is_active = true;

create table if not exists public.client_portal_otp_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  attempts int not null default 0,
  max_attempts int not null default 5,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists idx_otp_phone on public.client_portal_otp_codes(phone) where consumed_at is null;
create index if not exists idx_otp_expires on public.client_portal_otp_codes(expires_at);

create table if not exists public.client_portal_uploads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  uploaded_by_portal_user_id uuid references public.client_portal_users(id),
  reference_type text,
  reference_id uuid,
  file_url text not null,
  file_name text not null,
  file_size_bytes bigint,
  mime_type text,
  document_type text,
  description_ar text,
  status text not null default 'pending' check (status in ('pending','reviewed','approved','rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid references public.users(id),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_cp_uploads_client on public.client_portal_uploads(client_id);
create index if not exists idx_cp_uploads_status on public.client_portal_uploads(status);

-- triggers
create trigger trg_cpu_upd before update on public.client_portal_users for each row execute function public.set_updated_at();
create trigger trg_cpup_upd before update on public.client_portal_uploads for each row execute function public.set_updated_at();

-- RLS
alter table public.client_portal_users enable row level security;
alter table public.client_portal_otp_codes enable row level security;
alter table public.client_portal_uploads enable row level security;

-- internal staff sees / edits portal users
drop policy if exists cpu_staff on public.client_portal_users;
create policy cpu_staff on public.client_portal_users
  for all to authenticated
  using (public.current_user_has_permission('portal.invite'))
  with check (public.current_user_has_permission('portal.invite'));

-- portal user sees only their own row (matched via auth.uid())
drop policy if exists cpu_self on public.client_portal_users;
create policy cpu_self on public.client_portal_users
  for select to authenticated
  using (user_id = auth.uid());

-- OTP table is internal only — no row visible to anyone (service role bypasses RLS)
drop policy if exists otp_none on public.client_portal_otp_codes;
create policy otp_none on public.client_portal_otp_codes
  for select to authenticated using (false);

-- Uploads:
--  - portal user can insert/select rows tied to its own client_id
--  - staff with permission can manage everything
drop policy if exists cpup_self on public.client_portal_uploads;
create policy cpup_self on public.client_portal_uploads
  for select to authenticated
  using (
    exists (
      select 1 from public.client_portal_users cpu
      where cpu.user_id = auth.uid() and cpu.client_id = client_portal_uploads.client_id
    )
  );
drop policy if exists cpup_self_insert on public.client_portal_uploads;
create policy cpup_self_insert on public.client_portal_uploads
  for insert to authenticated
  with check (
    exists (
      select 1 from public.client_portal_users cpu
      where cpu.user_id = auth.uid() and cpu.client_id = client_portal_uploads.client_id
    )
  );
drop policy if exists cpup_staff on public.client_portal_uploads;
create policy cpup_staff on public.client_portal_uploads
  for all to authenticated
  using (public.current_user_has_permission('portal.review_uploads'))
  with check (public.current_user_has_permission('portal.review_uploads'));

-- Helper RPC for portal-side dashboard data (client sees its own data only)
create or replace function public.portal_my_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select cpu.client_id from public.client_portal_users cpu
  where cpu.user_id = auth.uid() and cpu.is_active = true
  limit 1;
$$;
grant execute on function public.portal_my_client_id() to authenticated;

-- Aggregate dashboard counts for the current portal user
create or replace function public.portal_dashboard_counts()
returns table(active_transactions int, unpaid_invoices int, unpaid_amount numeric, expiring_documents int)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_client uuid := public.portal_my_client_id();
begin
  if v_client is null then
    return;
  end if;
  return query
  select
    coalesce((select count(*) from public.transactions t where t.client_id = v_client and t.deleted_at is null and t.status not in ('completed','cancelled'))::int, 0),
    coalesce((select count(*) from public.invoices i where i.client_id = v_client and i.deleted_at is null and coalesce(i.status,'') <> 'cancelled' and coalesce(i.paid_amount,0) < coalesce(i.total_amount,0))::int, 0),
    coalesce((select sum(coalesce(i.total_amount,0) - coalesce(i.paid_amount,0)) from public.invoices i where i.client_id = v_client and i.deleted_at is null and coalesce(i.status,'') <> 'cancelled' and coalesce(i.paid_amount,0) < coalesce(i.total_amount,0))::numeric, 0),
    coalesce((select count(*) from public.smart_alerts sa
              where sa.status = 'active'
                and sa.expiry_date is not null
                and sa.expiry_date <= current_date + 60
                and exists (select 1 from public.facilities f where f.id::text = sa.entity_id::text)
            )::int, 0);
exception when undefined_table then
  -- if any of the source tables is missing on this DB, return zeros
  return query select 0,0,0::numeric,0;
end;
$$;
grant execute on function public.portal_dashboard_counts() to authenticated;
