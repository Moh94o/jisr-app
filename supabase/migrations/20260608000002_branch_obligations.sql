-- Recurring branch obligations (rent / utilities / phone lines) + their payment schedules.
-- Payments due within 7 days surface on the Payments page (live, no scheduler).

create table if not exists public.branch_obligations (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  obligation_type text not null default 'rent',   -- rent | utility_electricity | utility_water | utility_internet | phone
  title text,
  vendor text,                                    -- landlord / provider
  account_no text,                                -- contract no / account no / phone number
  amount numeric(14,2),                           -- default per-period amount
  frequency text default 'monthly',               -- monthly | quarterly | semiannual | annual | once
  start_date date,
  end_date date,
  document_url text,
  document_path text,
  notes text,
  is_active boolean default true,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  created_by uuid,
  updated_at timestamptz,
  updated_by uuid,
  deleted_at timestamptz
);

create table if not exists public.branch_obligation_payments (
  id uuid primary key default gen_random_uuid(),
  obligation_id uuid not null references public.branch_obligations(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  due_date date not null,
  amount numeric(14,2) not null default 0,
  status text not null default 'pending',         -- pending | paid
  paid_date date,
  paid_amount numeric(14,2),
  payment_method text,
  reference_no text,
  notes text,
  created_at timestamptz default now(),
  created_by uuid,
  updated_at timestamptz,
  updated_by uuid,
  deleted_at timestamptz
);

create index if not exists idx_bo_branch_type on public.branch_obligations (branch_id, obligation_type) where deleted_at is null;
create index if not exists idx_bop_due on public.branch_obligation_payments (branch_id, status, due_date) where deleted_at is null;

drop trigger if exists trg_bo_cu on public.branch_obligations;
create trigger trg_bo_cu before insert or update on public.branch_obligations
  for each row execute function public.set_created_updated_by();
drop trigger if exists trg_bo_ts on public.branch_obligations;
create trigger trg_bo_ts before update on public.branch_obligations
  for each row execute function public.set_updated_at();
drop trigger if exists trg_bop_cu on public.branch_obligation_payments;
create trigger trg_bop_cu before insert or update on public.branch_obligation_payments
  for each row execute function public.set_created_updated_by();
drop trigger if exists trg_bop_ts on public.branch_obligation_payments;
create trigger trg_bop_ts before update on public.branch_obligation_payments
  for each row execute function public.set_updated_at();

alter table public.branch_obligations enable row level security;
alter table public.branch_obligation_payments enable row level security;

create policy bo_select on public.branch_obligations for select to authenticated
  using (current_user_is_super_admin() or current_user_has_permission('admin_offices.view') or current_user_has_permission('payments.view'));
create policy bo_insert on public.branch_obligations for insert to authenticated
  with check (current_user_is_super_admin() or current_user_has_permission('admin_offices.create') or current_user_has_permission('admin_offices.edit'));
create policy bo_update on public.branch_obligations for update to authenticated
  using (current_user_is_super_admin() or current_user_has_permission('admin_offices.edit'))
  with check (current_user_is_super_admin() or current_user_has_permission('admin_offices.edit'));
create policy bo_delete on public.branch_obligations for delete to authenticated
  using (current_user_is_super_admin() or current_user_has_permission('admin_offices.delete'));

create policy bop_select on public.branch_obligation_payments for select to authenticated
  using (current_user_is_super_admin() or current_user_has_permission('admin_offices.view') or current_user_has_permission('payments.view'));
create policy bop_insert on public.branch_obligation_payments for insert to authenticated
  with check (current_user_is_super_admin() or current_user_has_permission('admin_offices.create') or current_user_has_permission('admin_offices.edit'));
create policy bop_update on public.branch_obligation_payments for update to authenticated
  using (current_user_is_super_admin() or current_user_has_permission('admin_offices.edit'))
  with check (current_user_is_super_admin() or current_user_has_permission('admin_offices.edit'));
create policy bop_delete on public.branch_obligation_payments for delete to authenticated
  using (current_user_is_super_admin() or current_user_has_permission('admin_offices.delete'));
