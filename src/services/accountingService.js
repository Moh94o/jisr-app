// Accounting service — wraps Supabase calls for the accounting module.
// Single-tenant: organization_id is left null (matches the seeded default COA).
import { getSupabase } from '../lib/supabase.js'

// ─── Chart of Accounts ─────────────────────────────────────────
export async function listAccounts() {
  const sb = getSupabase()
  const { data, error } = await sb.from('chart_of_accounts')
    .select('*')
    .eq('is_active', true)
    .order('code')
  if (error) throw error
  return data || []
}

export async function createAccount(payload) {
  const sb = getSupabase()
  const { data, error } = await sb.from('chart_of_accounts').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateAccount(id, payload) {
  const sb = getSupabase()
  const { data, error } = await sb.from('chart_of_accounts').update(payload).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deactivateAccount(id) {
  const sb = getSupabase()
  const { error } = await sb.from('chart_of_accounts').update({ is_active: false }).eq('id', id)
  if (error) throw error
}

export async function seedSaudiCoa() {
  const sb = getSupabase()
  const { error } = await sb.rpc('seed_saudi_coa', { p_org_id: null })
  if (error) throw error
}

// ─── Fiscal years / periods ────────────────────────────────────
export async function listFiscalYears() {
  const sb = getSupabase()
  const { data, error } = await sb.from('fiscal_years').select('*').order('starts_on', { ascending: false })
  if (error) throw error
  return data || []
}

export async function listPeriods(fiscalYearId) {
  const sb = getSupabase()
  let q = sb.from('accounting_periods').select('*').order('starts_on')
  if (fiscalYearId) q = q.eq('fiscal_year_id', fiscalYearId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function ensureFiscalYear(year) {
  const sb = getSupabase()
  const { data, error } = await sb.rpc('ensure_fiscal_year', { p_org_id: null, p_year: year })
  if (error) throw error
  return data
}

export async function closePeriod(periodId) {
  const sb = getSupabase()
  // Check no draft entries
  const { data: drafts } = await sb.from('journal_entries').select('id').eq('accounting_period_id', periodId).eq('status', 'draft').limit(1)
  if (drafts && drafts.length) throw new Error('لا يمكن إقفال الفترة — يوجد قيود مسودة في هذه الفترة. رحّلها أو احذفها أولاً.')
  const { data, error } = await sb.from('accounting_periods').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', periodId).select().single()
  if (error) throw error
  return data
}

export async function reopenPeriod(periodId) {
  const sb = getSupabase()
  const { data, error } = await sb.from('accounting_periods').update({ status: 'open', closed_at: null }).eq('id', periodId).select().single()
  if (error) throw error
  return data
}

// ─── Journal Entries ───────────────────────────────────────────
export async function listJournalEntries({ from, to, status, branchId, refType, limit = 200 } = {}) {
  const sb = getSupabase()
  let q = sb.from('journal_entries')
    .select('*')
    .order('entry_date', { ascending: false })
    .order('entry_number', { ascending: false })
    .limit(limit)
  if (from) q = q.gte('entry_date', from)
  if (to) q = q.lte('entry_date', to)
  if (status) q = q.eq('status', status)
  if (branchId) q = q.eq('branch_id', branchId)
  if (refType) q = q.eq('reference_type', refType)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function getJournalEntry(id) {
  const sb = getSupabase()
  const [{ data: header, error: e1 }, { data: lines, error: e2 }] = await Promise.all([
    sb.from('journal_entries').select('*').eq('id', id).single(),
    sb.from('journal_entry_lines').select('*, account:chart_of_accounts(id,code,name_ar,account_type)').eq('journal_entry_id', id).order('line_number')
  ])
  if (e1) throw e1
  if (e2) throw e2
  return { header, lines: lines || [] }
}

export async function createJournalEntry({ header, lines }) {
  const sb = getSupabase()
  // basic balance check
  const totalD = lines.reduce((s, l) => s + Number(l.debit || 0), 0)
  const totalC = lines.reduce((s, l) => s + Number(l.credit || 0), 0)
  if (Math.abs(totalD - totalC) > 0.01) throw new Error('القيد غير متوازن — مجموع المدين يجب أن يساوي مجموع الدائن')
  if (!header.entry_date) throw new Error('تاريخ القيد مطلوب')
  const year = new Date(header.entry_date).getFullYear()
  // ensure fiscal year/periods
  await ensureFiscalYear(year).catch(() => {})
  // generate entry number
  const { data: nextNo, error: numErr } = await sb.rpc('next_journal_entry_number', { p_org_id: null, p_year: year })
  if (numErr) throw numErr
  // resolve period
  const { data: periods } = await sb.from('accounting_periods')
    .select('id').lte('starts_on', header.entry_date).gte('ends_on', header.entry_date).eq('status', 'open').limit(1)
  const periodId = periods?.[0]?.id
  if (!periodId) throw new Error('لا توجد فترة محاسبية مفتوحة لهذا التاريخ')
  const status = header.status || 'draft'
  const { data: created, error: hdrErr } = await sb.from('journal_entries').insert({
    branch_id: header.branch_id || null,
    entry_number: nextNo,
    entry_date: header.entry_date,
    accounting_period_id: periodId,
    description: header.description || '',
    reference_type: header.reference_type || 'manual',
    reference_id: header.reference_id || null,
    status,
    total_debit: totalD,
    total_credit: totalC,
    posted_at: status === 'posted' ? new Date().toISOString() : null,
    notes: header.notes || null,
  }).select().single()
  if (hdrErr) throw hdrErr
  // insert lines
  const rows = lines.map((l, i) => ({
    journal_entry_id: created.id,
    line_number: i + 1,
    account_id: l.account_id,
    description: l.description || null,
    debit: Number(l.debit || 0),
    credit: Number(l.credit || 0),
    branch_id: l.branch_id || header.branch_id || null,
    client_id: l.client_id || null,
    facility_id: l.facility_id || null,
    worker_id: l.worker_id || null,
  }))
  const { error: lErr } = await sb.from('journal_entry_lines').insert(rows)
  if (lErr) throw lErr
  return created
}

export async function postJournalEntry(id) {
  const sb = getSupabase()
  // verify balance via the trigger; simply update status and the trigger validates totals.
  const { data: lines } = await sb.from('journal_entry_lines').select('debit,credit').eq('journal_entry_id', id)
  const totalD = (lines || []).reduce((s, l) => s + Number(l.debit || 0), 0)
  const totalC = (lines || []).reduce((s, l) => s + Number(l.credit || 0), 0)
  if (Math.abs(totalD - totalC) > 0.01) throw new Error('القيد غير متوازن')
  const { data, error } = await sb.from('journal_entries').update({
    status: 'posted',
    total_debit: totalD,
    total_credit: totalC,
    posted_at: new Date().toISOString(),
  }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function reverseJournalEntry(id, reason) {
  const sb = getSupabase()
  const { data, error } = await sb.rpc('reverse_journal_entry', { p_je_id: id, p_reason: reason || null })
  if (error) throw error
  return data
}

// ─── Reports ───────────────────────────────────────────────────
export async function trialBalance(asOfDate, branchId = null) {
  const sb = getSupabase()
  // Pull all posted lines up to date, then aggregate per account.
  let q = sb.from('journal_entry_lines')
    .select('account_id, debit, credit, account:chart_of_accounts(id,code,name_ar,account_type,normal_balance,is_leaf), je:journal_entries!inner(entry_date,status,branch_id)')
  q = q.lte('je.entry_date', asOfDate).eq('je.status', 'posted')
  if (branchId) q = q.eq('je.branch_id', branchId)
  const { data, error } = await q
  if (error) throw error
  const map = new Map()
  for (const row of data || []) {
    const key = row.account_id
    const acc = map.get(key) || { account_id: row.account_id, code: row.account.code, name_ar: row.account.name_ar, account_type: row.account.account_type, normal_balance: row.account.normal_balance, debit: 0, credit: 0 }
    acc.debit += Number(row.debit || 0)
    acc.credit += Number(row.credit || 0)
    map.set(key, acc)
  }
  const rows = Array.from(map.values()).map(r => ({
    ...r,
    balance: r.normal_balance === 'debit' ? r.debit - r.credit : r.credit - r.debit,
  })).filter(r => Math.abs(r.balance) > 0.005).sort((a, b) => a.code.localeCompare(b.code))
  const total_debit = rows.reduce((s, r) => s + (r.debit || 0), 0)
  const total_credit = rows.reduce((s, r) => s + (r.credit || 0), 0)
  return { rows, total_debit, total_credit }
}

export async function profitAndLoss(periodStart, periodEnd, branchId = null) {
  const sb = getSupabase()
  let q = sb.from('journal_entry_lines')
    .select('debit, credit, account:chart_of_accounts!inner(code,name_ar,account_type,account_subtype), je:journal_entries!inner(entry_date,status,branch_id)')
    .gte('je.entry_date', periodStart).lte('je.entry_date', periodEnd).eq('je.status', 'posted')
    .in('account.account_type', ['revenue', 'expense'])
  if (branchId) q = q.eq('je.branch_id', branchId)
  const { data, error } = await q
  if (error) throw error
  const byAccount = new Map()
  for (const r of data || []) {
    const a = r.account
    const key = a.code
    const cur = byAccount.get(key) || { code: a.code, name_ar: a.name_ar, account_type: a.account_type, account_subtype: a.account_subtype, debit: 0, credit: 0, amount: 0 }
    cur.debit += Number(r.debit || 0)
    cur.credit += Number(r.credit || 0)
    byAccount.set(key, cur)
  }
  for (const r of byAccount.values()) {
    // revenue normal credit: amount = credit - debit
    // expense normal debit:  amount = debit  - credit
    r.amount = r.account_type === 'revenue' ? (r.credit - r.debit) : (r.debit - r.credit)
  }
  const rows = Array.from(byAccount.values()).filter(r => Math.abs(r.amount) > 0.005)
  const totalRevenue = rows.filter(r => r.account_type === 'revenue').reduce((s, r) => s + r.amount, 0)
  const totalCogs = rows.filter(r => r.account_subtype === 'cogs').reduce((s, r) => s + r.amount, 0)
  const totalOpex = rows.filter(r => r.account_subtype === 'opex' || r.account_subtype === 'depreciation').reduce((s, r) => s + r.amount, 0)
  const grossProfit = totalRevenue - totalCogs
  const netProfit = grossProfit - totalOpex
  return { rows, totalRevenue, totalCogs, totalOpex, grossProfit, netProfit }
}

export async function balanceSheet(asOfDate) {
  const sb = getSupabase()
  let q = sb.from('journal_entry_lines')
    .select('debit, credit, account:chart_of_accounts!inner(code,name_ar,account_type,normal_balance), je:journal_entries!inner(entry_date,status)')
    .lte('je.entry_date', asOfDate).eq('je.status', 'posted')
    .in('account.account_type', ['asset', 'liability', 'equity', 'revenue', 'expense'])
  const { data, error } = await q
  if (error) throw error
  const byAccount = new Map()
  for (const r of data || []) {
    const a = r.account
    const cur = byAccount.get(a.code) || { code: a.code, name_ar: a.name_ar, account_type: a.account_type, normal_balance: a.normal_balance, debit: 0, credit: 0, amount: 0 }
    cur.debit += Number(r.debit || 0)
    cur.credit += Number(r.credit || 0)
    byAccount.set(a.code, cur)
  }
  let assets = 0, liab = 0, equity = 0, retained = 0
  const rows = []
  for (const r of byAccount.values()) {
    r.amount = r.normal_balance === 'debit' ? r.debit - r.credit : r.credit - r.debit
    if (r.account_type === 'asset') assets += r.amount
    if (r.account_type === 'liability') liab += r.amount
    if (r.account_type === 'equity') equity += r.amount
    if (r.account_type === 'revenue') retained += r.amount
    if (r.account_type === 'expense') retained -= r.amount
    if (Math.abs(r.amount) > 0.005 && (r.account_type === 'asset' || r.account_type === 'liability' || r.account_type === 'equity')) {
      rows.push(r)
    }
  }
  return { rows, assets, liabilities: liab, equity: equity + retained, retainedFromPL: retained }
}

export async function generalLedger(accountId, periodStart, periodEnd) {
  const sb = getSupabase()
  let q = sb.from('journal_entry_lines')
    .select('id, debit, credit, description, je:journal_entries!inner(id, entry_number, entry_date, description, status)')
    .eq('account_id', accountId).eq('je.status', 'posted').order('je.entry_date', { ascending: true })
  if (periodStart) q = q.gte('je.entry_date', periodStart)
  if (periodEnd) q = q.lte('je.entry_date', periodEnd)
  const { data, error } = await q
  if (error) throw error
  let running = 0
  return (data || []).map(r => {
    running += Number(r.debit || 0) - Number(r.credit || 0)
    return { ...r, running_balance: running }
  })
}

// ─── Bank accounts (financial) ─────────────────────────────────
export async function listBankAccounts() {
  const sb = getSupabase()
  const { data, error } = await sb.from('accounting_bank_accounts').select('*, account:chart_of_accounts(id,code,name_ar)').eq('is_active', true).order('bank_name_ar')
  if (error) throw error
  return data || []
}

export async function createBankAccount(payload) {
  const sb = getSupabase()
  const { data, error } = await sb.from('accounting_bank_accounts').insert(payload).select().single()
  if (error) throw error
  return data
}
