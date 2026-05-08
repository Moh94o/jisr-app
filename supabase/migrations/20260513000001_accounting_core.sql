-- ============================================================
-- Phase 1: Accounting Core
-- Tables: fiscal_years, accounting_periods, chart_of_accounts,
--         bank_accounts (acct), journal_entries(_lines),
--         bank_statements(_lines)
-- Single-tenant: organization_id is OPTIONAL (nullable) so the
-- existing single-org setup keeps working without breakage.
-- ============================================================

-- ───── Fiscal Years ─────
create table if not exists public.fiscal_years (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'open' check (status in ('open','closed','locked')),
  closed_at timestamptz,
  closed_by uuid references public.users(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  unique (organization_id, name)
);

-- ───── Accounting Periods (months) ─────
create table if not exists public.accounting_periods (
  id uuid primary key default gen_random_uuid(),
  fiscal_year_id uuid not null references public.fiscal_years(id) on delete cascade,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'open' check (status in ('open','closed','locked')),
  closed_at timestamptz,
  closed_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  unique (fiscal_year_id, starts_on)
);
create index if not exists idx_acct_periods_fy on public.accounting_periods(fiscal_year_id);
create index if not exists idx_acct_periods_dates on public.accounting_periods(starts_on, ends_on);

-- ───── Chart of Accounts ─────
create table if not exists public.chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  code text not null,
  name_ar text not null,
  name_en text,
  parent_id uuid references public.chart_of_accounts(id) on delete restrict,
  account_type text not null check (account_type in ('asset','liability','equity','revenue','expense')),
  account_subtype text,
  normal_balance text not null check (normal_balance in ('debit','credit')),
  is_leaf boolean not null default true,
  is_system boolean not null default false,
  is_active boolean not null default true,
  currency_code text not null default 'SAR',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  unique (organization_id, code)
);
create index if not exists idx_coa_parent on public.chart_of_accounts(parent_id);
create index if not exists idx_coa_type on public.chart_of_accounts(account_type);
create index if not exists idx_coa_active on public.chart_of_accounts(is_active) where is_active = true;

-- ───── Bank Accounts (financial — different from existing settings table) ─────
-- The existing project may have a `bank_accounts` table for client/facility info.
-- We create `accounting_bank_accounts` to avoid any name collision and keep concerns separate.
create table if not exists public.accounting_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  account_id uuid not null references public.chart_of_accounts(id),
  bank_name_ar text not null,
  bank_swift text,
  iban text not null,
  account_number text,
  currency_code text not null default 'SAR',
  is_default boolean not null default false,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  unique (organization_id, iban)
);

-- ───── Journal Entries (header + lines) ─────
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  branch_id uuid references public.branches(id),
  entry_number text not null,
  entry_date date not null,
  accounting_period_id uuid references public.accounting_periods(id),
  description text not null,
  reference_type text,
  reference_id uuid,
  status text not null default 'draft' check (status in ('draft','posted','reversed')),
  total_debit numeric(18,2) not null default 0,
  total_credit numeric(18,2) not null default 0,
  posted_at timestamptz,
  posted_by uuid references public.users(id),
  reversed_at timestamptz,
  reversed_by uuid references public.users(id),
  reversal_of uuid references public.journal_entries(id),
  attachment_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  unique (organization_id, entry_number)
);
create index if not exists idx_je_org_date on public.journal_entries(organization_id, entry_date desc);
create index if not exists idx_je_period on public.journal_entries(accounting_period_id);
create index if not exists idx_je_reference on public.journal_entries(reference_type, reference_id);
create index if not exists idx_je_status on public.journal_entries(status);

create table if not exists public.journal_entry_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  line_number int not null,
  account_id uuid not null references public.chart_of_accounts(id),
  description text,
  debit numeric(18,2) not null default 0 check (debit >= 0),
  credit numeric(18,2) not null default 0 check (credit >= 0),
  branch_id uuid references public.branches(id),
  client_id uuid references public.clients(id),
  facility_id uuid references public.facilities(id),
  worker_id uuid references public.workers(id),
  currency_code text not null default 'SAR',
  exchange_rate numeric(12,6) not null default 1,
  created_at timestamptz not null default now(),
  check (debit = 0 or credit = 0),
  check (debit > 0 or credit > 0)
);
create index if not exists idx_jel_entry on public.journal_entry_lines(journal_entry_id);
create index if not exists idx_jel_account on public.journal_entry_lines(account_id);
create index if not exists idx_jel_branch on public.journal_entry_lines(branch_id);
create index if not exists idx_jel_client on public.journal_entry_lines(client_id);

-- Enforce balanced totals only when posting / reversed
create or replace function public.je_check_balance()
returns trigger language plpgsql as $$
begin
  if new.status in ('posted','reversed') then
    if abs(new.total_debit - new.total_credit) > 0.01 then
      raise exception 'Journal entry %, totals not balanced (D=%, C=%)', new.entry_number, new.total_debit, new.total_credit;
    end if;
  end if;
  return new;
end$$;

drop trigger if exists trg_je_balance on public.journal_entries;
create trigger trg_je_balance before insert or update on public.journal_entries
  for each row execute function public.je_check_balance();

-- ───── Bank statements (for reconciliation) ─────
create table if not exists public.bank_statements (
  id uuid primary key default gen_random_uuid(),
  bank_account_id uuid not null references public.accounting_bank_accounts(id) on delete cascade,
  statement_date date not null,
  opening_balance numeric(18,2) not null,
  closing_balance numeric(18,2) not null,
  total_debits numeric(18,2) not null default 0,
  total_credits numeric(18,2) not null default 0,
  source text not null default 'manual' check (source in ('manual','mt940','csv','api')),
  file_url text,
  is_reconciled boolean not null default false,
  reconciled_at timestamptz,
  reconciled_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id)
);

create table if not exists public.bank_statement_lines (
  id uuid primary key default gen_random_uuid(),
  bank_statement_id uuid not null references public.bank_statements(id) on delete cascade,
  transaction_date date not null,
  value_date date,
  description text,
  reference text,
  debit numeric(18,2) not null default 0,
  credit numeric(18,2) not null default 0,
  balance_after numeric(18,2),
  matched_journal_line_id uuid references public.journal_entry_lines(id),
  matched_at timestamptz,
  matched_by uuid references public.users(id),
  is_matched boolean generated always as (matched_journal_line_id is not null) stored,
  created_at timestamptz not null default now()
);
create index if not exists idx_bsl_statement on public.bank_statement_lines(bank_statement_id);
create index if not exists idx_bsl_unmatched on public.bank_statement_lines(bank_statement_id) where matched_journal_line_id is null;

-- ───── Triggers (created_at/updated_at + audit) ─────
do $$
begin
  perform 1;
end$$;

create trigger trg_fy_upd before update on public.fiscal_years
  for each row execute function public.set_updated_at();
create trigger trg_fy_aud before insert or update on public.fiscal_years
  for each row execute function public.set_created_updated_by();

create trigger trg_ap_upd before update on public.accounting_periods
  for each row execute function public.set_updated_at();
create trigger trg_ap_aud before insert or update on public.accounting_periods
  for each row execute function public.set_created_updated_by();

create trigger trg_coa_upd before update on public.chart_of_accounts
  for each row execute function public.set_updated_at();
create trigger trg_coa_aud before insert or update on public.chart_of_accounts
  for each row execute function public.set_created_updated_by();

create trigger trg_aba_upd before update on public.accounting_bank_accounts
  for each row execute function public.set_updated_at();
create trigger trg_aba_aud before insert or update on public.accounting_bank_accounts
  for each row execute function public.set_created_updated_by();

create trigger trg_je_upd before update on public.journal_entries
  for each row execute function public.set_updated_at();
create trigger trg_je_aud before insert or update on public.journal_entries
  for each row execute function public.set_created_updated_by();

create trigger trg_bs_upd before update on public.bank_statements
  for each row execute function public.set_updated_at();
create trigger trg_bs_aud before insert or update on public.bank_statements
  for each row execute function public.set_created_updated_by();

-- ───── Enable RLS ─────
alter table public.fiscal_years enable row level security;
alter table public.accounting_periods enable row level security;
alter table public.chart_of_accounts enable row level security;
alter table public.accounting_bank_accounts enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_entry_lines enable row level security;
alter table public.bank_statements enable row level security;
alter table public.bank_statement_lines enable row level security;

-- ───── Policies (read = coa.read, modify = role-specific) ─────
drop policy if exists fy_read on public.fiscal_years;
create policy fy_read on public.fiscal_years
  for select to authenticated
  using (public.current_user_has_permission('accounting.coa.read'));

drop policy if exists fy_modify on public.fiscal_years;
create policy fy_modify on public.fiscal_years
  for all to authenticated
  using (public.current_user_has_permission('accounting.period.close'))
  with check (public.current_user_has_permission('accounting.period.close'));

drop policy if exists ap_read on public.accounting_periods;
create policy ap_read on public.accounting_periods
  for select to authenticated
  using (public.current_user_has_permission('accounting.coa.read'));
drop policy if exists ap_modify on public.accounting_periods;
create policy ap_modify on public.accounting_periods
  for all to authenticated
  using (public.current_user_has_permission('accounting.period.close'))
  with check (public.current_user_has_permission('accounting.period.close'));

drop policy if exists coa_read on public.chart_of_accounts;
create policy coa_read on public.chart_of_accounts
  for select to authenticated
  using (public.current_user_has_permission('accounting.coa.read'));
drop policy if exists coa_modify on public.chart_of_accounts;
create policy coa_modify on public.chart_of_accounts
  for all to authenticated
  using (
    public.current_user_has_permission('accounting.coa.manage')
    and (is_system = false or public.current_user_is_super_admin())
  )
  with check (public.current_user_has_permission('accounting.coa.manage'));

drop policy if exists aba_read on public.accounting_bank_accounts;
create policy aba_read on public.accounting_bank_accounts
  for select to authenticated
  using (public.current_user_has_permission('accounting.coa.read'));
drop policy if exists aba_modify on public.accounting_bank_accounts;
create policy aba_modify on public.accounting_bank_accounts
  for all to authenticated
  using (public.current_user_has_permission('accounting.coa.manage'))
  with check (public.current_user_has_permission('accounting.coa.manage'));

drop policy if exists je_read on public.journal_entries;
create policy je_read on public.journal_entries
  for select to authenticated
  using (public.current_user_has_permission('accounting.journal_entry.read'));
drop policy if exists je_create on public.journal_entries;
create policy je_create on public.journal_entries
  for insert to authenticated
  with check (public.current_user_has_permission('accounting.journal_entry.create'));
drop policy if exists je_update on public.journal_entries;
create policy je_update on public.journal_entries
  for update to authenticated
  using (
    (status = 'draft' and public.current_user_has_permission('accounting.journal_entry.create'))
    or (public.current_user_has_permission('accounting.journal_entry.post'))
    or (public.current_user_has_permission('accounting.journal_entry.reverse'))
  )
  with check (true);

drop policy if exists jel_read on public.journal_entry_lines;
create policy jel_read on public.journal_entry_lines
  for select to authenticated
  using (
    exists (
      select 1 from public.journal_entries je
      where je.id = journal_entry_id
        and public.current_user_has_permission('accounting.journal_entry.read')
    )
  );
drop policy if exists jel_modify on public.journal_entry_lines;
create policy jel_modify on public.journal_entry_lines
  for all to authenticated
  using (
    exists (
      select 1 from public.journal_entries je
      where je.id = journal_entry_id
        and (
          (je.status = 'draft' and public.current_user_has_permission('accounting.journal_entry.create'))
          or public.current_user_has_permission('accounting.journal_entry.post')
        )
    )
  )
  with check (true);

drop policy if exists bs_all on public.bank_statements;
create policy bs_all on public.bank_statements
  for all to authenticated
  using (public.current_user_has_permission('accounting.bank.reconcile'))
  with check (public.current_user_has_permission('accounting.bank.reconcile'));

drop policy if exists bsl_all on public.bank_statement_lines;
create policy bsl_all on public.bank_statement_lines
  for all to authenticated
  using (
    exists (
      select 1 from public.bank_statements bs
      where bs.id = bank_statement_id
        and public.current_user_has_permission('accounting.bank.reconcile')
    )
  )
  with check (true);
