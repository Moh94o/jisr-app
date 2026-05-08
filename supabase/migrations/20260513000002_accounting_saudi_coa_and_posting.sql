-- ============================================================
-- Phase 1.b: Saudi Standard COA seed + auto-posting functions
-- ============================================================

-- Seed Saudi-standard chart of accounts for an organization (or NULL for default).
create or replace function public.seed_saudi_coa(p_org_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assets uuid;
  v_current_assets uuid;
  v_banks uuid;
  v_fixed_assets uuid;
  v_liabilities uuid;
  v_current_liab uuid;
  v_equity uuid;
  v_revenue uuid;
  v_expenses uuid;
  v_cogs uuid;
  v_opex uuid;
begin
  -- skip if already seeded for this org
  if exists (select 1 from public.chart_of_accounts where organization_id is not distinct from p_org_id and is_system = true limit 1) then
    return;
  end if;

  -- 1xxx Assets
  insert into public.chart_of_accounts (organization_id, code, name_ar, name_en, parent_id, account_type, account_subtype, normal_balance, is_leaf, is_system)
  values (p_org_id, '1', 'الأصول', 'Assets', null, 'asset', null, 'debit', false, true)
  returning id into v_assets;

  insert into public.chart_of_accounts (organization_id, code, name_ar, name_en, parent_id, account_type, account_subtype, normal_balance, is_leaf, is_system)
  values (p_org_id, '11', 'الأصول المتداولة', 'Current Assets', v_assets, 'asset', 'current_asset', 'debit', false, true)
  returning id into v_current_assets;

  insert into public.chart_of_accounts (organization_id, code, name_ar, name_en, parent_id, account_type, account_subtype, normal_balance, is_leaf, is_system)
  values
    (p_org_id, '1101', 'الصندوق', 'Cash on Hand', v_current_assets, 'asset', 'cash', 'debit', true, true),
    (p_org_id, '1110', 'البنوك', 'Banks', v_current_assets, 'asset', 'bank', 'debit', false, true);

  select id into v_banks from public.chart_of_accounts
   where organization_id is not distinct from p_org_id and code = '1110';

  insert into public.chart_of_accounts (organization_id, code, name_ar, name_en, parent_id, account_type, account_subtype, normal_balance, is_leaf, is_system)
  values
    (p_org_id, '1120', 'العملاء (ذمم مدينة)', 'Trade Receivables', v_current_assets, 'asset', 'receivable', 'debit', true, true),
    (p_org_id, '1130', 'مصاريف حكومية مدفوعة عن العملاء', 'Government Fees Receivable', v_current_assets, 'asset', 'receivable', 'debit', true, true),
    (p_org_id, '1140', 'سلف ومقدمات', 'Advances & Prepayments', v_current_assets, 'asset', 'prepaid', 'debit', true, true),
    (p_org_id, '1150', 'ضريبة القيمة المضافة (مدخلات)', 'Input VAT', v_current_assets, 'asset', 'vat_input', 'debit', true, true);

  -- 12 Fixed Assets
  insert into public.chart_of_accounts (organization_id, code, name_ar, name_en, parent_id, account_type, account_subtype, normal_balance, is_leaf, is_system)
  values (p_org_id, '12', 'الأصول الثابتة', 'Fixed Assets', v_assets, 'asset', 'fixed_asset', 'debit', false, true)
  returning id into v_fixed_assets;

  insert into public.chart_of_accounts (organization_id, code, name_ar, name_en, parent_id, account_type, account_subtype, normal_balance, is_leaf, is_system)
  values
    (p_org_id, '1201', 'أثاث ومعدات مكتبية', 'Office Furniture & Equipment', v_fixed_assets, 'asset', 'fixed_asset', 'debit', true, true),
    (p_org_id, '1202', 'أجهزة حاسب آلي', 'Computers & IT Equipment', v_fixed_assets, 'asset', 'fixed_asset', 'debit', true, true),
    (p_org_id, '1203', 'سيارات', 'Vehicles', v_fixed_assets, 'asset', 'fixed_asset', 'debit', true, true),
    (p_org_id, '1290', 'مجمع الإهلاك', 'Accumulated Depreciation', v_fixed_assets, 'asset', 'accum_depreciation', 'credit', true, true);

  -- 2xxx Liabilities
  insert into public.chart_of_accounts (organization_id, code, name_ar, name_en, parent_id, account_type, account_subtype, normal_balance, is_leaf, is_system)
  values (p_org_id, '2', 'الخصوم', 'Liabilities', null, 'liability', null, 'credit', false, true)
  returning id into v_liabilities;

  insert into public.chart_of_accounts (organization_id, code, name_ar, name_en, parent_id, account_type, account_subtype, normal_balance, is_leaf, is_system)
  values (p_org_id, '21', 'الخصوم المتداولة', 'Current Liabilities', v_liabilities, 'liability', 'current_liability', 'credit', false, true)
  returning id into v_current_liab;

  insert into public.chart_of_accounts (organization_id, code, name_ar, name_en, parent_id, account_type, account_subtype, normal_balance, is_leaf, is_system)
  values
    (p_org_id, '2101', 'الموردون (ذمم دائنة)', 'Trade Payables', v_current_liab, 'liability', 'payable', 'credit', true, true),
    (p_org_id, '2110', 'ضريبة القيمة المضافة (مخرجات)', 'Output VAT', v_current_liab, 'liability', 'vat_output', 'credit', true, true),
    (p_org_id, '2120', 'مستحقات الزكاة وضريبة الدخل', 'Zakat & Income Tax Payable', v_current_liab, 'liability', 'tax_payable', 'credit', true, true),
    (p_org_id, '2130', 'رواتب مستحقة', 'Accrued Salaries', v_current_liab, 'liability', 'accrued', 'credit', true, true),
    (p_org_id, '2140', 'تأمينات اجتماعية مستحقة', 'GOSI Payable', v_current_liab, 'liability', 'accrued', 'credit', true, true),
    (p_org_id, '2150', 'مدفوعات مقدمة من العملاء', 'Customer Advances', v_current_liab, 'liability', 'unearned_revenue', 'credit', true, true),
    (p_org_id, '2160', 'مصاريف مستحقة', 'Accrued Expenses', v_current_liab, 'liability', 'accrued', 'credit', true, true);

  -- 3xxx Equity
  insert into public.chart_of_accounts (organization_id, code, name_ar, name_en, parent_id, account_type, account_subtype, normal_balance, is_leaf, is_system)
  values (p_org_id, '3', 'حقوق الملكية', 'Equity', null, 'equity', null, 'credit', false, true)
  returning id into v_equity;

  insert into public.chart_of_accounts (organization_id, code, name_ar, name_en, parent_id, account_type, account_subtype, normal_balance, is_leaf, is_system)
  values
    (p_org_id, '3101', 'رأس المال', 'Capital', v_equity, 'equity', 'capital', 'credit', true, true),
    (p_org_id, '3201', 'الأرباح المحتجزة', 'Retained Earnings', v_equity, 'equity', 'retained_earnings', 'credit', true, true),
    (p_org_id, '3301', 'مسحوبات شخصية', 'Owner Drawings', v_equity, 'equity', 'drawings', 'debit', true, true);

  -- 4xxx Revenue
  insert into public.chart_of_accounts (organization_id, code, name_ar, name_en, parent_id, account_type, account_subtype, normal_balance, is_leaf, is_system)
  values (p_org_id, '4', 'الإيرادات', 'Revenue', null, 'revenue', null, 'credit', false, true)
  returning id into v_revenue;

  insert into public.chart_of_accounts (organization_id, code, name_ar, name_en, parent_id, account_type, account_subtype, normal_balance, is_leaf, is_system)
  values
    (p_org_id, '4101', 'إيراد خدمات نقل الكفالة', 'Kafala Transfer Service Revenue', v_revenue, 'revenue', 'service_revenue', 'credit', true, true),
    (p_org_id, '4102', 'إيراد خدمات تجديد الإقامة', 'Iqama Renewal Service Revenue', v_revenue, 'revenue', 'service_revenue', 'credit', true, true),
    (p_org_id, '4103', 'إيراد خدمات التأشيرات', 'Visa Service Revenue', v_revenue, 'revenue', 'service_revenue', 'credit', true, true),
    (p_org_id, '4104', 'إيراد خدمات السجلات التجارية', 'Commercial Registration Revenue', v_revenue, 'revenue', 'service_revenue', 'credit', true, true),
    (p_org_id, '4105', 'إيرادات خدمات حكومية أخرى', 'Other Government Services Revenue', v_revenue, 'revenue', 'service_revenue', 'credit', true, true),
    (p_org_id, '4110', 'استرداد مصاريف حكومية', 'Government Fees Recovery', v_revenue, 'revenue', 'recovery', 'credit', true, true),
    (p_org_id, '4120', 'إيرادات أخرى', 'Other Revenue', v_revenue, 'revenue', 'other_revenue', 'credit', true, true);

  -- 5xxx Expenses
  insert into public.chart_of_accounts (organization_id, code, name_ar, name_en, parent_id, account_type, account_subtype, normal_balance, is_leaf, is_system)
  values (p_org_id, '5', 'المصروفات', 'Expenses', null, 'expense', null, 'debit', false, true)
  returning id into v_expenses;

  insert into public.chart_of_accounts (organization_id, code, name_ar, name_en, parent_id, account_type, account_subtype, normal_balance, is_leaf, is_system)
  values (p_org_id, '51', 'تكلفة الخدمات', 'Cost of Services', v_expenses, 'expense', 'cogs', 'debit', false, true)
  returning id into v_cogs;

  insert into public.chart_of_accounts (organization_id, code, name_ar, name_en, parent_id, account_type, account_subtype, normal_balance, is_leaf, is_system)
  values
    (p_org_id, '5101', 'رسوم حكومية مدفوعة (تكلفة)', 'Government Fees (Cost)', v_cogs, 'expense', 'cogs', 'debit', true, true),
    (p_org_id, '5102', 'عمولات مندوبين خارجيين', 'External Agents Commissions', v_cogs, 'expense', 'cogs', 'debit', true, true);

  insert into public.chart_of_accounts (organization_id, code, name_ar, name_en, parent_id, account_type, account_subtype, normal_balance, is_leaf, is_system)
  values (p_org_id, '52', 'المصاريف التشغيلية', 'Operating Expenses', v_expenses, 'expense', 'opex', 'debit', false, true)
  returning id into v_opex;

  insert into public.chart_of_accounts (organization_id, code, name_ar, name_en, parent_id, account_type, account_subtype, normal_balance, is_leaf, is_system)
  values
    (p_org_id, '5201', 'الرواتب والأجور', 'Salaries & Wages', v_opex, 'expense', 'opex', 'debit', true, true),
    (p_org_id, '5202', 'حصة المنشأة من التأمينات (GOSI)', 'GOSI Employer Share', v_opex, 'expense', 'opex', 'debit', true, true),
    (p_org_id, '5203', 'بدلات وحوافز', 'Allowances & Bonuses', v_opex, 'expense', 'opex', 'debit', true, true),
    (p_org_id, '5210', 'إيجارات', 'Rent', v_opex, 'expense', 'opex', 'debit', true, true),
    (p_org_id, '5211', 'كهرباء وماء', 'Utilities', v_opex, 'expense', 'opex', 'debit', true, true),
    (p_org_id, '5212', 'اتصالات وإنترنت', 'Telecom & Internet', v_opex, 'expense', 'opex', 'debit', true, true),
    (p_org_id, '5220', 'قرطاسية ومطبوعات', 'Stationery & Printing', v_opex, 'expense', 'opex', 'debit', true, true),
    (p_org_id, '5221', 'صيانة', 'Maintenance', v_opex, 'expense', 'opex', 'debit', true, true),
    (p_org_id, '5230', 'تسويق وإعلان', 'Marketing & Advertising', v_opex, 'expense', 'opex', 'debit', true, true),
    (p_org_id, '5240', 'أتعاب مهنية واستشارات', 'Professional Fees', v_opex, 'expense', 'opex', 'debit', true, true),
    (p_org_id, '5250', 'إهلاك أصول ثابتة', 'Depreciation Expense', v_opex, 'expense', 'depreciation', 'debit', true, true),
    (p_org_id, '5260', 'بنكية ومصرفية', 'Bank Charges', v_opex, 'expense', 'opex', 'debit', true, true),
    (p_org_id, '5290', 'مصاريف عامة أخرى', 'Other General Expenses', v_opex, 'expense', 'opex', 'debit', true, true);
end;
$$;

grant execute on function public.seed_saudi_coa(uuid) to authenticated;

-- Auto-seed the default (NULL org) on migration so the system has a working COA out of the box.
select public.seed_saudi_coa(null);

-- ───── Auto-create fiscal year + 12 monthly periods ─────
create or replace function public.ensure_fiscal_year(p_org_id uuid, p_year int)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fy_id uuid;
  v_start date;
  v_end date;
  v_m int;
  v_period_start date;
  v_period_end date;
begin
  v_start := make_date(p_year, 1, 1);
  v_end := make_date(p_year, 12, 31);
  select id into v_fy_id from public.fiscal_years
    where organization_id is not distinct from p_org_id and name = p_year::text limit 1;
  if v_fy_id is null then
    insert into public.fiscal_years (organization_id, name, starts_on, ends_on)
    values (p_org_id, p_year::text, v_start, v_end)
    returning id into v_fy_id;
  end if;
  for v_m in 1..12 loop
    v_period_start := make_date(p_year, v_m, 1);
    v_period_end := (v_period_start + interval '1 month' - interval '1 day')::date;
    insert into public.accounting_periods (fiscal_year_id, name, starts_on, ends_on)
    values (v_fy_id,
      case v_m
        when 1 then 'يناير ' || p_year
        when 2 then 'فبراير ' || p_year
        when 3 then 'مارس ' || p_year
        when 4 then 'إبريل ' || p_year
        when 5 then 'مايو ' || p_year
        when 6 then 'يونيو ' || p_year
        when 7 then 'يوليو ' || p_year
        when 8 then 'أغسطس ' || p_year
        when 9 then 'سبتمبر ' || p_year
        when 10 then 'أكتوبر ' || p_year
        when 11 then 'نوفمبر ' || p_year
        when 12 then 'ديسمبر ' || p_year
      end,
      v_period_start, v_period_end)
    on conflict (fiscal_year_id, starts_on) do nothing;
  end loop;
  return v_fy_id;
end;
$$;
grant execute on function public.ensure_fiscal_year(uuid, int) to authenticated;
-- create the current year right away
select public.ensure_fiscal_year(null, extract(year from current_date)::int);

-- ───── Next journal entry number per (org, year) ─────
create or replace function public.next_journal_entry_number(p_org_id uuid, p_year int)
returns text
language plpgsql
as $$
declare
  v_count int;
begin
  select count(*) + 1 into v_count
  from public.journal_entries
  where organization_id is not distinct from p_org_id
    and extract(year from entry_date) = p_year;
  return 'JE-' || p_year || '-' || lpad(v_count::text, 5, '0');
end;
$$;

-- Helper: find or create a leaf account by code
create or replace function public._coa_id(p_org_id uuid, p_code text)
returns uuid
language sql
stable
as $$
  select id from public.chart_of_accounts
   where organization_id is not distinct from p_org_id and code = p_code
   limit 1;
$$;

-- ───── Add accounting linkage columns to invoices/payments (additive) ─────
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='invoices' and column_name='journal_entry_id') then
    alter table public.invoices add column journal_entry_id uuid references public.journal_entries(id);
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='invoices' and column_name='service_amount') then
    alter table public.invoices add column service_amount numeric(18,2);
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='invoices' and column_name='vat_amount') then
    alter table public.invoices add column vat_amount numeric(18,2) default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='invoices' and column_name='govt_fees_recovery') then
    alter table public.invoices add column govt_fees_recovery numeric(18,2) default 0;
  end if;
exception when undefined_table then null; -- invoices may not exist on a fresh install
end$$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='invoice_payments') then
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='invoice_payments' and column_name='journal_entry_id') then
      alter table public.invoice_payments add column journal_entry_id uuid references public.journal_entries(id);
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='invoice_payments' and column_name='accounting_bank_account_id') then
      alter table public.invoice_payments add column accounting_bank_account_id uuid references public.accounting_bank_accounts(id);
    end if;
  end if;
end$$;

-- ───── Post invoice as journal entry ─────
create or replace function public.post_invoice_journal_entry(p_invoice_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv record;
  v_je_id uuid;
  v_je_number text;
  v_year int;
  v_period_id uuid;
  v_org_id uuid;
  v_branch_id uuid;
  v_acc_recv uuid;
  v_acc_revenue uuid;
  v_acc_vat uuid;
  v_acc_recovery uuid;
  v_acc_govt_recv uuid;
  v_total numeric(18,2);
  v_service_amt numeric(18,2);
  v_vat_amt numeric(18,2);
  v_recovery_amt numeric(18,2);
  v_descr text;
  v_inv_no text;
  v_inv_date date;
  v_client_id uuid;
  v_client_name text;
begin
  -- Read invoice columns defensively (invoice schema varies between projects)
  execute format($q$
    select i.id,
      coalesce(i.invoice_number, i.invoice_no, i.id::text) as inv_no,
      coalesce(i.issue_date, i.invoice_date, current_date) as inv_date,
      i.client_id,
      i.branch_id,
      coalesce(i.total_amount, i.total, 0) as total_amount,
      coalesce(i.service_amount, coalesce(i.subtotal, coalesce(i.total_amount, i.total, 0))) as service_amount,
      coalesce(i.vat_amount, 0) as vat_amount,
      coalesce(i.govt_fees_recovery, 0) as govt_fees_recovery,
      i.journal_entry_id
    from public.invoices i where i.id = $1
  $q$) into v_inv using p_invoice_id;

  if v_inv is null then
    raise exception 'Invoice % not found', p_invoice_id;
  end if;
  if v_inv.journal_entry_id is not null then
    return v_inv.journal_entry_id;
  end if;

  v_inv_no := v_inv.inv_no;
  v_inv_date := v_inv.inv_date;
  v_client_id := v_inv.client_id;
  v_branch_id := v_inv.branch_id;
  v_total := v_inv.total_amount;
  v_service_amt := v_inv.service_amount;
  v_vat_amt := v_inv.vat_amount;
  v_recovery_amt := v_inv.govt_fees_recovery;

  if v_client_id is not null then
    select coalesce(p.name_ar, p.name_en, '') into v_client_name
    from public.clients c left join public.persons p on p.id = c.person_id
    where c.id = v_client_id;
  end if;

  v_year := extract(year from v_inv_date)::int;
  v_je_number := public.next_journal_entry_number(null, v_year);
  perform public.ensure_fiscal_year(null, v_year);

  select id into v_period_id from public.accounting_periods
   where v_inv_date between starts_on and ends_on
     and status = 'open'
   order by starts_on desc limit 1;
  if v_period_id is null then
    raise exception 'No open accounting period for date %', v_inv_date;
  end if;

  v_acc_recv := public._coa_id(null, '1120');
  v_acc_revenue := public._coa_id(null, '4101');
  v_acc_vat := public._coa_id(null, '2110');
  v_acc_recovery := public._coa_id(null, '4110');

  v_descr := 'فاتورة رقم ' || v_inv_no || coalesce(' - ' || v_client_name, '');

  insert into public.journal_entries(
    branch_id, entry_number, entry_date, accounting_period_id,
    description, reference_type, reference_id, status,
    total_debit, total_credit, posted_at
  ) values (
    v_branch_id, v_je_number, v_inv_date, v_period_id,
    v_descr, 'invoice', p_invoice_id, 'posted',
    v_total, v_total, now()
  ) returning id into v_je_id;

  -- Lines
  insert into public.journal_entry_lines(journal_entry_id, line_number, account_id, description, debit, credit, branch_id, client_id)
  values (v_je_id, 1, v_acc_recv, 'مدين عميل', v_total, 0, v_branch_id, v_client_id);

  insert into public.journal_entry_lines(journal_entry_id, line_number, account_id, description, debit, credit, branch_id, client_id)
  values (v_je_id, 2, v_acc_revenue, 'إيراد خدمة', 0, coalesce(v_service_amt - coalesce(v_recovery_amt,0), v_total - coalesce(v_vat_amt,0) - coalesce(v_recovery_amt,0)), v_branch_id, v_client_id);

  if coalesce(v_vat_amt, 0) > 0 then
    insert into public.journal_entry_lines(journal_entry_id, line_number, account_id, description, debit, credit, branch_id)
    values (v_je_id, 3, v_acc_vat, 'ضريبة القيمة المضافة', 0, v_vat_amt, v_branch_id);
  end if;

  if coalesce(v_recovery_amt, 0) > 0 then
    insert into public.journal_entry_lines(journal_entry_id, line_number, account_id, description, debit, credit, branch_id, client_id)
    values (v_je_id, 4, v_acc_recovery, 'استرداد رسوم حكومية', 0, v_recovery_amt, v_branch_id, v_client_id);
  end if;

  update public.invoices set journal_entry_id = v_je_id where id = p_invoice_id;
  return v_je_id;
end;
$$;
grant execute on function public.post_invoice_journal_entry(uuid) to authenticated;

-- ───── Post payment as journal entry ─────
create or replace function public.post_payment_journal_entry(p_payment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pay record;
  v_je_id uuid;
  v_je_number text;
  v_year int;
  v_period_id uuid;
  v_acc_cash uuid;
  v_acc_bank uuid;
  v_acc_recv uuid;
  v_branch_id uuid;
  v_client_id uuid;
  v_inv_no text;
  v_dt date;
  v_amount numeric(18,2);
  v_method text;
  v_bank_acct_id uuid;
begin
  execute format($q$
    select ip.id,
      coalesce(ip.payment_date, current_date) as dt,
      coalesce(ip.amount, 0) as amount,
      ip.payment_method,
      i.client_id,
      i.branch_id,
      coalesce(i.invoice_number, i.invoice_no, i.id::text) as inv_no,
      ip.journal_entry_id,
      ip.accounting_bank_account_id
    from public.invoice_payments ip
    left join public.invoices i on i.id = ip.invoice_id
    where ip.id = $1
  $q$) into v_pay using p_payment_id;

  if v_pay is null then return null; end if;
  if v_pay.journal_entry_id is not null then return v_pay.journal_entry_id; end if;

  v_dt := v_pay.dt;
  v_amount := v_pay.amount;
  v_method := v_pay.payment_method;
  v_client_id := v_pay.client_id;
  v_branch_id := v_pay.branch_id;
  v_inv_no := v_pay.inv_no;
  v_bank_acct_id := v_pay.accounting_bank_account_id;

  v_year := extract(year from v_dt)::int;
  v_je_number := public.next_journal_entry_number(null, v_year);
  perform public.ensure_fiscal_year(null, v_year);

  select id into v_period_id from public.accounting_periods
   where v_dt between starts_on and ends_on and status = 'open'
   order by starts_on desc limit 1;
  if v_period_id is null then
    raise exception 'No open accounting period for date %', v_dt;
  end if;

  v_acc_cash := public._coa_id(null, '1101');
  v_acc_recv := public._coa_id(null, '1120');

  if v_method in ('cash') or v_bank_acct_id is null then
    v_acc_bank := v_acc_cash;
  else
    select account_id into v_acc_bank from public.accounting_bank_accounts where id = v_bank_acct_id;
    if v_acc_bank is null then v_acc_bank := v_acc_cash; end if;
  end if;

  insert into public.journal_entries(
    branch_id, entry_number, entry_date, accounting_period_id,
    description, reference_type, reference_id, status, total_debit, total_credit, posted_at
  ) values (
    v_branch_id, v_je_number, v_dt, v_period_id,
    'دفعة على فاتورة ' || coalesce(v_inv_no,''), 'payment', p_payment_id, 'posted',
    v_amount, v_amount, now()
  ) returning id into v_je_id;

  insert into public.journal_entry_lines(journal_entry_id, line_number, account_id, description, debit, credit, branch_id, client_id)
  values
    (v_je_id, 1, v_acc_bank, 'استلام دفعة', v_amount, 0, v_branch_id, v_client_id),
    (v_je_id, 2, v_acc_recv, 'تسوية ذمم العميل', 0, v_amount, v_branch_id, v_client_id);

  update public.invoice_payments set journal_entry_id = v_je_id where id = p_payment_id;
  return v_je_id;
end;
$$;
grant execute on function public.post_payment_journal_entry(uuid) to authenticated;

-- ───── Reverse a posted journal entry ─────
create or replace function public.reverse_journal_entry(p_je_id uuid, p_reason text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orig record;
  v_new_id uuid;
  v_je_number text;
  v_year int;
begin
  select * into v_orig from public.journal_entries where id = p_je_id;
  if v_orig is null then raise exception 'JE % not found', p_je_id; end if;
  if v_orig.status <> 'posted' then raise exception 'Only posted entries can be reversed'; end if;

  v_year := extract(year from current_date)::int;
  v_je_number := public.next_journal_entry_number(v_orig.organization_id, v_year);

  insert into public.journal_entries(
    organization_id, branch_id, entry_number, entry_date, accounting_period_id,
    description, reference_type, reference_id, status,
    total_debit, total_credit, posted_at, reversal_of, notes
  ) values (
    v_orig.organization_id, v_orig.branch_id, v_je_number, current_date, v_orig.accounting_period_id,
    'عكس قيد ' || v_orig.entry_number || coalesce(' — ' || p_reason, ''),
    'reversal', p_je_id, 'posted',
    v_orig.total_credit, v_orig.total_debit, now(), p_je_id, p_reason
  ) returning id into v_new_id;

  insert into public.journal_entry_lines(
    journal_entry_id, line_number, account_id, description, debit, credit, branch_id, client_id, facility_id
  )
  select v_new_id, line_number, account_id, 'عكس: ' || coalesce(description,''), credit, debit, branch_id, client_id, facility_id
  from public.journal_entry_lines where journal_entry_id = p_je_id;

  update public.journal_entries set status = 'reversed', reversed_at = now() where id = p_je_id;
  return v_new_id;
end;
$$;
grant execute on function public.reverse_journal_entry(uuid, text) to authenticated;

-- ───── Triggers: auto-post on invoice issue / payment confirm ─────
create or replace function public.trg_invoice_after_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_status text;
  v_old_status text;
begin
  begin
    v_status := new.status;
  exception when undefined_column then v_status := null; end;
  begin
    v_old_status := old.status;
  exception when others then v_old_status := null; end;
  -- Auto-post when the invoice transitions to 'issued' (or similar)
  if v_status in ('issued','sent','approved','posted') and (v_old_status is null or v_old_status not in ('issued','sent','approved','posted')) then
    perform public.post_invoice_journal_entry(new.id);
  end if;
  return new;
end$$;

drop trigger if exists trg_invoice_je on public.invoices;
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='invoices') then
    create trigger trg_invoice_je
      after insert or update on public.invoices
      for each row execute function public.trg_invoice_after_change();
  end if;
exception when others then null; end$$;

create or replace function public.trg_payment_after_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- ip table varies — guard everything
  begin
    perform public.post_payment_journal_entry(new.id);
  exception when others then null; end;
  return new;
end$$;

drop trigger if exists trg_payment_je on public.invoice_payments;
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='invoice_payments') then
    create trigger trg_payment_je
      after insert on public.invoice_payments
      for each row execute function public.trg_payment_after_change();
  end if;
exception when others then null; end$$;
