-- ============================================================
-- Phase 2: ZATCA Phase 2 (E-Invoicing) Core
-- ============================================================

create table if not exists public.zatca_credentials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid unique,
  environment text not null default 'sandbox' check (environment in ('sandbox','simulation','production')),

  -- مرجعي / إعداد
  vat_number text,
  cr_number text,
  registration_name_ar text,
  registration_name_en text,
  street text,
  building_number text,
  district text,
  city text,
  postal_code text,
  additional_number text,

  -- اعتماد المرحلة الأولى (compliance)
  csr_pem text,
  csid_secret text,        -- مشفّر في Vault — هذا مرجع
  csid_certificate text,
  -- اعتماد المرحلة الثانية (production)
  pcsid_secret text,
  pcsid_certificate text,

  onboarded_at timestamptz,
  certificate_expires_at timestamptz,
  is_active boolean not null default false,
  last_health_check timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id)
);

create table if not exists public.zatca_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  invoice_id uuid not null unique,

  invoice_uuid uuid not null default gen_random_uuid(),
  icv bigint not null,
  pih text,
  invoice_hash text,
  invoice_type_code text not null default '388' check (invoice_type_code in ('388','383','381','386')),
  is_simplified boolean not null default true,

  xml_signed text,
  qr_base64 text,

  status text not null default 'pending' check (status in ('pending','submitted','cleared','reported','rejected','failed')),
  zatca_status_code text,
  zatca_warnings jsonb,
  zatca_errors jsonb,
  zatca_cleared_xml text,
  submitted_at timestamptz,
  cleared_at timestamptz,
  reported_at timestamptz,
  retry_count int not null default 0,
  last_error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id)
);
create unique index if not exists idx_zatca_inv_icv on public.zatca_invoices(organization_id, icv);
create index if not exists idx_zatca_inv_status on public.zatca_invoices(status) where status in ('pending','failed');

create table if not exists public.zatca_api_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  zatca_invoice_id uuid references public.zatca_invoices(id) on delete cascade,
  endpoint text not null,
  http_method text not null default 'POST',
  request_payload jsonb,
  response_status int,
  response_body jsonb,
  duration_ms int,
  created_at timestamptz not null default now()
);
create index if not exists idx_zatca_log_inv on public.zatca_api_log(zatca_invoice_id);

-- triggers
create trigger trg_zc_upd before update on public.zatca_credentials for each row execute function public.set_updated_at();
create trigger trg_zc_aud before insert or update on public.zatca_credentials for each row execute function public.set_created_updated_by();
create trigger trg_zi_upd before update on public.zatca_invoices for each row execute function public.set_updated_at();
create trigger trg_zi_aud before insert or update on public.zatca_invoices for each row execute function public.set_created_updated_by();

-- RLS
alter table public.zatca_credentials enable row level security;
alter table public.zatca_invoices enable row level security;
alter table public.zatca_api_log enable row level security;

drop policy if exists zc_admin on public.zatca_credentials;
create policy zc_admin on public.zatca_credentials
  for all to authenticated
  using (public.current_user_has_permission('zatca.settings.manage'))
  with check (public.current_user_has_permission('zatca.settings.manage'));

drop policy if exists zi_read on public.zatca_invoices;
create policy zi_read on public.zatca_invoices
  for select to authenticated
  using (public.current_user_has_permission('zatca.compliance.read'));
drop policy if exists zi_modify on public.zatca_invoices;
create policy zi_modify on public.zatca_invoices
  for all to authenticated
  using (public.current_user_has_permission('zatca.invoice.submit'))
  with check (public.current_user_has_permission('zatca.invoice.submit'));

drop policy if exists zlog_read on public.zatca_api_log;
create policy zlog_read on public.zatca_api_log
  for select to authenticated
  using (public.current_user_has_permission('zatca.compliance.read'));

-- ICV next-value helper
create or replace function public.next_zatca_icv(p_org_id uuid)
returns bigint
language sql
as $$
  select coalesce(max(icv), 0) + 1
  from public.zatca_invoices
  where organization_id is not distinct from p_org_id;
$$;
grant execute on function public.next_zatca_icv(uuid) to authenticated;
