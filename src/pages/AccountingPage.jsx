import React, { useEffect, useMemo, useState, useCallback } from 'react'
import * as Acc from '../services/accountingService.js'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#D4A017', goldSoft: '#e8c77a', red: '#c0392b', ok: '#27a046', warn: '#eab308', blue: '#3483b4' }

const fmtAmt = v => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const todayStr = () => new Date().toISOString().slice(0, 10)
const monthStart = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10) }

const pageTabs = [
  { id: 'dash', label_ar: 'لوحة المحاسبة' },
  { id: 'coa', label_ar: 'شجرة الحسابات' },
  { id: 'je', label_ar: 'القيود' },
  { id: 'tb', label_ar: 'ميزان المراجعة' },
  { id: 'pl', label_ar: 'الأرباح والخسائر' },
  { id: 'bs', label_ar: 'الميزانية العمومية' },
  { id: 'gl', label_ar: 'دفتر الأستاذ' },
  { id: 'banks', label_ar: 'البنوك' },
  { id: 'periods', label_ar: 'الفترات والإقفال' },
]

export default function AccountingPage({ toast }) {
  const [tab, setTab] = useState('dash')
  const onTab = (id) => setTab(id)
  return (
    <div style={{ fontFamily: F, direction: 'rtl', padding: '0 4px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {pageTabs.map(t => (
          <button key={t.id} onClick={() => onTab(t.id)} style={tabBtn(tab === t.id)}>{t.label_ar}</button>
        ))}
      </div>
      {tab === 'dash' && <Dash onJump={onTab} toast={toast} />}
      {tab === 'coa' && <CoaTab toast={toast} />}
      {tab === 'je' && <JeTab toast={toast} />}
      {tab === 'tb' && <TbTab toast={toast} />}
      {tab === 'pl' && <PlTab toast={toast} />}
      {tab === 'bs' && <BsTab toast={toast} />}
      {tab === 'gl' && <GlTab toast={toast} />}
      {tab === 'banks' && <BanksTab toast={toast} />}
      {tab === 'periods' && <PeriodsTab toast={toast} />}
    </div>
  )
}

const tabBtn = (active) => ({
  height: 38, padding: '0 16px', borderRadius: 10,
  background: active ? 'rgba(212,160,23,.14)' : 'rgba(0,0,0,.18)',
  border: '1px solid ' + (active ? 'rgba(212,160,23,.42)' : 'rgba(255,255,255,.06)'),
  color: active ? C.gold : 'var(--tx2, rgba(255,255,255,.62))',
  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F,
})

// ─── Dashboard ──────────────────────────────────────────────────
function Dash({ onJump, toast }) {
  const [tb, setTb] = useState(null)
  const [pl, setPl] = useState(null)
  const [busy, setBusy] = useState(true)
  useEffect(() => {
    (async () => {
      try {
        const [tbRes, plRes] = await Promise.all([
          Acc.trialBalance(todayStr()),
          Acc.profitAndLoss(monthStart(), todayStr()),
        ])
        setTb(tbRes); setPl(plRes)
      } catch (e) { toast?.('خطأ: ' + (e.message || e)) }
      setBusy(false)
    })()
  }, [])
  if (busy) return <Spinner />
  const balanced = tb && Math.abs((tb.total_debit || 0) - (tb.total_credit || 0)) < 0.01
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
      <Kpi title="إيرادات الشهر" value={fmtAmt(pl?.totalRevenue)} accent={C.ok} onClick={() => onJump('pl')} />
      <Kpi title="مصاريف تشغيلية" value={fmtAmt(pl?.totalOpex)} accent={C.warn} onClick={() => onJump('pl')} />
      <Kpi title="صافي الربح" value={fmtAmt(pl?.netProfit)} accent={pl?.netProfit >= 0 ? C.ok : C.red} onClick={() => onJump('pl')} />
      <Kpi title="ميزان المراجعة" value={balanced ? 'متوازن ✓' : 'غير متوازن'} accent={balanced ? C.ok : C.red} onClick={() => onJump('tb')} />
    </div>
  )
}

function Kpi({ title, value, accent, onClick }) {
  return (
    <div onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', padding: 18, borderRadius: 14, background: 'linear-gradient(160deg,#2A2A2A 0%,#1F1F1F 100%)', border: '1px solid ' + accent + '33' }}>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent, marginTop: 6 }}>{value}</div>
    </div>
  )
}

function Spinner() {
  return <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,.5)', fontSize: 13 }}>جاري التحميل...</div>
}

// ─── Chart of Accounts ──────────────────────────────────────────
function CoaTab({ toast }) {
  const [accounts, setAccounts] = useState([])
  const [busy, setBusy] = useState(true)
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(null)   // parent id when adding child
  const [form, setForm] = useState({ code: '', name_ar: '', account_type: 'asset', normal_balance: 'debit', is_leaf: true })

  const refresh = async () => {
    setBusy(true)
    try { setAccounts(await Acc.listAccounts()) } catch (e) { toast?.('خطأ: ' + e.message) }
    setBusy(false)
  }
  useEffect(() => { refresh() }, [])

  const tree = useMemo(() => buildTree(accounts), [accounts])

  const filteredTree = useMemo(() => {
    if (!search) return tree
    const s = search.toLowerCase()
    const match = (n) => (n.code + ' ' + n.name_ar).toLowerCase().includes(s) || n.children?.some(match)
    const filterNode = (n) => match(n) ? { ...n, children: (n.children || []).filter(filterNode) } : null
    return tree.map(filterNode).filter(Boolean)
  }, [tree, search])

  const addChild = (parentId) => {
    setAdding(parentId)
    const parent = accounts.find(a => a.id === parentId)
    setForm({ code: parent ? parent.code + '.' : '', name_ar: '', account_type: parent?.account_type || 'asset', normal_balance: parent?.normal_balance || 'debit', is_leaf: true })
  }

  const saveNew = async () => {
    if (!form.code || !form.name_ar) { toast?.('الكود والاسم مطلوبان'); return }
    try {
      await Acc.createAccount({ ...form, parent_id: adding, is_active: true })
      setAdding(null); refresh()
      toast?.('تمت الإضافة')
    } catch (e) { toast?.('خطأ: ' + e.message) }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالكود أو الاسم" style={inputS} />
        <button onClick={refresh} style={btnS()}>تحديث</button>
        {!accounts.length && !busy && (
          <button onClick={async () => { try { await Acc.seedSaudiCoa(); await refresh(); toast?.('تم إنشاء شجرة الحسابات السعودية المعيارية') } catch (e) { toast?.('خطأ: ' + e.message) } }} style={btnS('gold')}>إنشاء شجرة الحسابات السعودية</button>
        )}
      </div>
      {busy ? <Spinner /> : (
        <div style={{ background: '#1f1f1f', borderRadius: 12, padding: 12, border: '1px solid rgba(255,255,255,.06)' }}>
          {filteredTree.length === 0
            ? <div style={{ padding: 20, textAlign: 'center', color: 'rgba(255,255,255,.5)' }}>لا توجد حسابات</div>
            : filteredTree.map(n => <CoaNode key={n.id} node={n} depth={0} onAddChild={addChild} />)
          }
        </div>
      )}
      {adding !== null && (
        <Modal onClose={() => setAdding(null)} title="إضافة حساب فرعي">
          <Field label="الكود"><input style={inputS} value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></Field>
          <Field label="الاسم بالعربي"><input style={inputS} value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} /></Field>
          <Field label="نوع الحساب">
            <select style={inputS} value={form.account_type} onChange={e => setForm({ ...form, account_type: e.target.value })}>
              <option value="asset">أصل</option>
              <option value="liability">خصم</option>
              <option value="equity">حقوق ملكية</option>
              <option value="revenue">إيراد</option>
              <option value="expense">مصروف</option>
            </select>
          </Field>
          <Field label="الطبيعة">
            <select style={inputS} value={form.normal_balance} onChange={e => setForm({ ...form, normal_balance: e.target.value })}>
              <option value="debit">مدين</option>
              <option value="credit">دائن</option>
            </select>
          </Field>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
            <button style={btnS()} onClick={() => setAdding(null)}>إلغاء</button>
            <button style={btnS('gold')} onClick={saveNew}>حفظ</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function buildTree(rows) {
  const map = new Map(rows.map(r => [r.id, { ...r, children: [] }]))
  const roots = []
  for (const r of map.values()) {
    if (r.parent_id && map.has(r.parent_id)) map.get(r.parent_id).children.push(r)
    else roots.push(r)
  }
  const sortRec = (a) => { a.children.sort((x, y) => x.code.localeCompare(y.code)); a.children.forEach(sortRec) }
  roots.sort((a, b) => a.code.localeCompare(b.code))
  roots.forEach(sortRec)
  return roots
}

function CoaNode({ node, depth, onAddChild }) {
  const [open, setOpen] = useState(depth < 1)
  const typeColor = { asset: C.blue, liability: '#bb8fce', equity: C.gold, revenue: C.ok, expense: C.warn }[node.account_type] || '#888'
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, marginRight: depth * 18, background: 'rgba(0,0,0,.18)', marginBottom: 4, border: '1px solid rgba(255,255,255,.04)' }}>
        {node.children?.length > 0
          ? <span onClick={() => setOpen(!open)} style={{ cursor: 'pointer', fontSize: 12, width: 16 }}>{open ? '▼' : '◀'}</span>
          : <span style={{ width: 16 }} />}
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', fontFamily: 'monospace', minWidth: 60 }}>{node.code}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx, #f0f0f0)', flex: 1 }}>{node.name_ar}</span>
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: typeColor + '22', color: typeColor, fontWeight: 700 }}>
          {node.account_type === 'asset' ? 'أصل' : node.account_type === 'liability' ? 'خصم' : node.account_type === 'equity' ? 'حقوق ملكية' : node.account_type === 'revenue' ? 'إيراد' : 'مصروف'}
        </span>
        {node.is_system && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(212,160,23,.18)', color: C.gold, fontWeight: 700 }}>نظامي</span>}
        {!node.is_leaf && <button style={{ ...btnS(), height: 26, fontSize: 11, padding: '0 10px' }} onClick={() => onAddChild(node.id)}>+ فرع</button>}
      </div>
      {open && node.children?.map(c => <CoaNode key={c.id} node={c} depth={depth + 1} onAddChild={onAddChild} />)}
    </div>
  )
}

// ─── Journal Entries list + new ─────────────────────────────────
function JeTab({ toast }) {
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(true)
  const [filters, setFilters] = useState({ from: monthStart(), to: todayStr(), status: '' })
  const [showNew, setShowNew] = useState(false)
  const [active, setActive] = useState(null)

  const refresh = async () => {
    setBusy(true)
    try { setRows(await Acc.listJournalEntries(filters)) } catch (e) { toast?.('خطأ: ' + e.message) }
    setBusy(false)
  }
  useEffect(() => { refresh() }, [])

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <input type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} style={inputS} />
        <span style={{ color: 'rgba(255,255,255,.5)' }}>—</span>
        <input type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} style={inputS} />
        <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} style={inputS}>
          <option value="">كل الحالات</option>
          <option value="draft">مسودة</option>
          <option value="posted">مُرحّل</option>
          <option value="reversed">مُعكوس</option>
        </select>
        <button style={btnS()} onClick={refresh}>بحث</button>
        <button style={btnS('gold')} onClick={() => setShowNew(true)}>+ قيد جديد</button>
      </div>
      {busy ? <Spinner /> : (
        <table style={tblS}>
          <thead><tr>
            <Th>رقم القيد</Th><Th>التاريخ</Th><Th>البيان</Th><Th>المرجع</Th><Th>مدين</Th><Th>دائن</Th><Th>الحالة</Th><Th></Th>
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={8} style={emptyTd}>لا قيود</td></tr>}
            {rows.map(r => (
              <tr key={r.id} onClick={() => setActive(r.id)} style={{ cursor: 'pointer' }}>
                <Td>{r.entry_number}</Td>
                <Td>{r.entry_date}</Td>
                <Td>{r.description}</Td>
                <Td>{r.reference_type || '—'}</Td>
                <Td>{fmtAmt(r.total_debit)}</Td>
                <Td>{fmtAmt(r.total_credit)}</Td>
                <Td><StatusPill s={r.status} /></Td>
                <Td>›</Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {showNew && <NewJeModal onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); refresh() }} toast={toast} />}
      {active && <JeDetailModal id={active} onClose={() => setActive(null)} onChanged={refresh} toast={toast} />}
    </div>
  )
}

function StatusPill({ s }) {
  const map = { draft: { c: '#888', t: 'مسودة' }, posted: { c: C.ok, t: 'مُرحّل' }, reversed: { c: C.red, t: 'مُعكوس' } }
  const x = map[s] || { c: '#888', t: s }
  return <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 4, background: x.c + '22', color: x.c, fontWeight: 700 }}>{x.t}</span>
}

function NewJeModal({ onClose, onSaved, toast }) {
  const [accounts, setAccounts] = useState([])
  const [hdr, setHdr] = useState({ entry_date: todayStr(), description: '', reference_type: 'manual' })
  const [lines, setLines] = useState([
    { account_id: '', description: '', debit: 0, credit: 0 },
    { account_id: '', description: '', debit: 0, credit: 0 },
  ])
  useEffect(() => { Acc.listAccounts().then(setAccounts).catch(() => {}) }, [])
  const leafAccounts = accounts.filter(a => a.is_leaf)
  const totalD = lines.reduce((s, l) => s + Number(l.debit || 0), 0)
  const totalC = lines.reduce((s, l) => s + Number(l.credit || 0), 0)
  const balanced = Math.abs(totalD - totalC) < 0.01 && totalD > 0

  const save = async (status) => {
    if (!balanced) { toast?.('القيد غير متوازن'); return }
    try {
      await Acc.createJournalEntry({ header: { ...hdr, status }, lines: lines.filter(l => l.account_id) })
      toast?.('تم الحفظ')
      onSaved?.()
    } catch (e) { toast?.('خطأ: ' + e.message) }
  }

  return (
    <Modal onClose={onClose} title="قيد يومية جديد" wide>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 12 }}>
        <Field label="التاريخ"><input type="date" style={inputS} value={hdr.entry_date} onChange={e => setHdr({ ...hdr, entry_date: e.target.value })} /></Field>
        <Field label="البيان"><input style={inputS} value={hdr.description} onChange={e => setHdr({ ...hdr, description: e.target.value })} /></Field>
      </div>
      <table style={tblS}>
        <thead><tr><Th>#</Th><Th>الحساب</Th><Th>البيان</Th><Th>مدين</Th><Th>دائن</Th><Th></Th></tr></thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <Td>{i + 1}</Td>
              <Td>
                <select style={inputS} value={l.account_id} onChange={e => updateLine(i, 'account_id', e.target.value)}>
                  <option value="">اختر حساباً</option>
                  {leafAccounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name_ar}</option>)}
                </select>
              </Td>
              <Td><input style={inputS} value={l.description} onChange={e => updateLine(i, 'description', e.target.value)} /></Td>
              <Td><input type="number" style={inputS} value={l.debit} onChange={e => updateLine(i, 'debit', Number(e.target.value))} /></Td>
              <Td><input type="number" style={inputS} value={l.credit} onChange={e => updateLine(i, 'credit', Number(e.target.value))} /></Td>
              <Td><button style={{ ...btnS(), height: 26, padding: '0 8px' }} onClick={() => setLines(lines.filter((_, j) => j !== i))}>×</button></Td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><td colSpan={3} style={{ ...emptyTd, textAlign: 'left', padding: '6px 12px' }}>الإجمالي</td><Td><b>{fmtAmt(totalD)}</b></Td><Td><b>{fmtAmt(totalC)}</b></Td><Td/></tr>
        </tfoot>
      </table>
      <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
        <button style={btnS()} onClick={() => setLines([...lines, { account_id: '', description: '', debit: 0, credit: 0 }])}>+ بند</button>
        <div style={{ fontSize: 12, color: balanced ? C.ok : C.red, fontWeight: 700 }}>
          {balanced ? '✓ متوازن' : `الفرق: ${fmtAmt(Math.abs(totalD - totalC))}`}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnS()} onClick={onClose}>إلغاء</button>
          <button style={btnS()} onClick={() => save('draft')}>حفظ مسودة</button>
          <button style={btnS('gold')} disabled={!balanced} onClick={() => save('posted')}>ترحيل</button>
        </div>
      </div>
    </Modal>
  )
  function updateLine(i, k, v) {
    const next = [...lines]; next[i] = { ...next[i], [k]: v }; setLines(next)
  }
}

function JeDetailModal({ id, onClose, onChanged, toast }) {
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(true)
  useEffect(() => { Acc.getJournalEntry(id).then(setData).catch(e => toast?.('خطأ: ' + e.message)).finally(() => setBusy(false)) }, [id])

  const post = async () => {
    try { await Acc.postJournalEntry(id); toast?.('تم الترحيل'); onChanged?.(); onClose() }
    catch (e) { toast?.('خطأ: ' + e.message) }
  }
  const reverse = async () => {
    const reason = window.prompt('سبب العكس (اختياري)')
    try { await Acc.reverseJournalEntry(id, reason); toast?.('تم العكس'); onChanged?.(); onClose() }
    catch (e) { toast?.('خطأ: ' + e.message) }
  }

  return (
    <Modal onClose={onClose} title="عرض القيد" wide>
      {busy ? <Spinner /> : data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
            <KV k="رقم القيد" v={data.header.entry_number} />
            <KV k="التاريخ" v={data.header.entry_date} />
            <KV k="الحالة" v={<StatusPill s={data.header.status} />} />
            <KV k="المرجع" v={data.header.reference_type || '—'} />
          </div>
          <table style={tblS}>
            <thead><tr><Th>#</Th><Th>الحساب</Th><Th>البيان</Th><Th>مدين</Th><Th>دائن</Th></tr></thead>
            <tbody>
              {data.lines.map(l => (
                <tr key={l.id}>
                  <Td>{l.line_number}</Td>
                  <Td>{l.account?.code} — {l.account?.name_ar}</Td>
                  <Td>{l.description || '—'}</Td>
                  <Td>{fmtAmt(l.debit)}</Td>
                  <Td>{fmtAmt(l.credit)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button style={btnS()} onClick={onClose}>إغلاق</button>
            {data.header.status === 'draft' && <button style={btnS('gold')} onClick={post}>ترحيل</button>}
            {data.header.status === 'posted' && <button style={btnS('red')} onClick={reverse}>عكس</button>}
          </div>
        </>
      )}
    </Modal>
  )
}

// ─── Trial Balance ──────────────────────────────────────────────
function TbTab({ toast }) {
  const [asOf, setAsOf] = useState(todayStr())
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const run = async () => { setBusy(true); try { setData(await Acc.trialBalance(asOf)) } catch (e) { toast?.('خطأ: ' + e.message) } setBusy(false) }
  useEffect(() => { run() }, [])
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input type="date" style={inputS} value={asOf} onChange={e => setAsOf(e.target.value)} />
        <button style={btnS()} onClick={run}>تحديث</button>
      </div>
      {busy ? <Spinner /> : data && (
        <>
          <table style={tblS}>
            <thead><tr><Th>الكود</Th><Th>الحساب</Th><Th>مدين</Th><Th>دائن</Th><Th>الرصيد</Th></tr></thead>
            <tbody>
              {data.rows.length === 0 && <tr><td colSpan={5} style={emptyTd}>لا حركة بعد</td></tr>}
              {data.rows.map(r => (
                <tr key={r.account_id}>
                  <Td>{r.code}</Td>
                  <Td>{r.name_ar}</Td>
                  <Td>{fmtAmt(r.debit)}</Td>
                  <Td>{fmtAmt(r.credit)}</Td>
                  <Td><b>{fmtAmt(r.balance)}</b></Td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={2} style={{ ...emptyTd, textAlign: 'left' }}>الإجمالي</td><Td><b>{fmtAmt(data.total_debit)}</b></Td><Td><b>{fmtAmt(data.total_credit)}</b></Td><Td/></tr></tfoot>
          </table>
          <div style={{ marginTop: 8, fontSize: 12, color: Math.abs(data.total_debit - data.total_credit) < 0.01 ? C.ok : C.red, fontWeight: 700, textAlign: 'center' }}>
            {Math.abs(data.total_debit - data.total_credit) < 0.01 ? '✓ مدين = دائن' : `⚠ غير متوازن — الفرق ${fmtAmt(Math.abs(data.total_debit - data.total_credit))}`}
          </div>
        </>
      )}
    </div>
  )
}

// ─── P&L ───────────────────────────────────────────────────────
function PlTab({ toast }) {
  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState(todayStr())
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const run = async () => { setBusy(true); try { setData(await Acc.profitAndLoss(from, to)) } catch (e) { toast?.('خطأ: ' + e.message) } setBusy(false) }
  useEffect(() => { run() }, [])
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input type="date" style={inputS} value={from} onChange={e => setFrom(e.target.value)} />
        <span style={{ color: 'rgba(255,255,255,.5)' }}>—</span>
        <input type="date" style={inputS} value={to} onChange={e => setTo(e.target.value)} />
        <button style={btnS()} onClick={run}>تحديث</button>
      </div>
      {busy ? <Spinner /> : data && (
        <div style={{ background: '#1f1f1f', borderRadius: 12, padding: 18, border: '1px solid rgba(255,255,255,.06)' }}>
          <Section title="الإيرادات" rows={data.rows.filter(r => r.account_type === 'revenue')} total={data.totalRevenue} accent={C.ok} />
          <Section title="تكلفة الخدمات" rows={data.rows.filter(r => r.account_subtype === 'cogs')} total={data.totalCogs} accent={C.warn} />
          <Row label="الربح الإجمالي" v={data.grossProfit} bold accent={data.grossProfit >= 0 ? C.ok : C.red} />
          <Section title="المصاريف التشغيلية" rows={data.rows.filter(r => r.account_subtype === 'opex' || r.account_subtype === 'depreciation')} total={data.totalOpex} accent={C.warn} />
          <Row label="صافي الربح" v={data.netProfit} bold accent={data.netProfit >= 0 ? C.ok : C.red} />
        </div>
      )}
    </div>
  )
}

function Section({ title, rows, total, accent }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: accent, marginBottom: 6, padding: '6px 0', borderBottom: '1px solid ' + accent + '33' }}>{title}</div>
      {rows.length === 0 && <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', padding: '4px 12px' }}>لا حركة</div>}
      {rows.map(r => <Row key={r.code} label={`${r.code} — ${r.name_ar}`} v={r.amount} />)}
      <div style={{ height: 1, background: 'rgba(255,255,255,.05)', margin: '4px 0' }} />
      <Row label={'إجمالي ' + title} v={total} bold accent={accent} />
    </div>
  )
}

function Row({ label, v, bold, accent }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 12px', fontSize: bold ? 14 : 13, fontWeight: bold ? 800 : 500, color: accent || 'var(--tx, #f0f0f0)' }}>
      <span>{label}</span>
      <span style={{ fontFamily: 'monospace' }}>{fmtAmt(v)}</span>
    </div>
  )
}

// ─── Balance Sheet ─────────────────────────────────────────────
function BsTab({ toast }) {
  const [asOf, setAsOf] = useState(todayStr())
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const run = async () => { setBusy(true); try { setData(await Acc.balanceSheet(asOf)) } catch (e) { toast?.('خطأ: ' + e.message) } setBusy(false) }
  useEffect(() => { run() }, [])
  const ok = data && Math.abs(data.assets - (data.liabilities + data.equity)) < 0.01
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input type="date" style={inputS} value={asOf} onChange={e => setAsOf(e.target.value)} />
        <button style={btnS()} onClick={run}>تحديث</button>
      </div>
      {busy ? <Spinner /> : data && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <BSColumn title="الأصول" total={data.assets} rows={data.rows.filter(r => r.account_type === 'asset')} accent={C.blue} />
          <div>
            <BSColumn title="الخصوم" total={data.liabilities} rows={data.rows.filter(r => r.account_type === 'liability')} accent="#bb8fce" />
            <div style={{ height: 12 }} />
            <BSColumn title="حقوق الملكية" total={data.equity} rows={data.rows.filter(r => r.account_type === 'equity')} accent={C.gold} extra={[{ label: 'صافي ربح/خسارة الفترة', v: data.retainedFromPL }]} />
          </div>
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', fontSize: 13, fontWeight: 700, color: ok ? C.ok : C.red, padding: 10 }}>
            {ok ? '✓ الميزانية متوازنة' : `⚠ غير متوازنة — الأصول ${fmtAmt(data.assets)} ≠ الخصوم+حقوق ${fmtAmt(data.liabilities + data.equity)}`}
          </div>
        </div>
      )}
    </div>
  )
}

function BSColumn({ title, rows, total, accent, extra }) {
  return (
    <div style={{ background: '#1f1f1f', borderRadius: 12, padding: 18, border: '1px solid rgba(255,255,255,.06)' }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: accent, marginBottom: 10 }}>{title}</div>
      {rows.length === 0 && <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>لا حركة</div>}
      {rows.map(r => <Row key={r.code} label={`${r.code} — ${r.name_ar}`} v={r.amount} />)}
      {extra?.map((e, i) => <Row key={i} label={e.label} v={e.v} />)}
      <div style={{ height: 1, background: accent + '44', margin: '8px 0' }} />
      <Row label={'إجمالي ' + title} v={total + (extra?.reduce((s, e) => s + (e.v || 0), 0) || 0)} bold accent={accent} />
    </div>
  )
}

// ─── General Ledger ────────────────────────────────────────────
function GlTab({ toast }) {
  const [accounts, setAccounts] = useState([])
  const [accountId, setAccountId] = useState('')
  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState(todayStr())
  const [rows, setRows] = useState(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { Acc.listAccounts().then(a => { setAccounts(a.filter(x => x.is_leaf)); if (a.length) setAccountId(a.find(x => x.is_leaf)?.id || '') }) }, [])
  const run = async () => {
    if (!accountId) return
    setBusy(true)
    try { setRows(await Acc.generalLedger(accountId, from, to)) } catch (e) { toast?.('خطأ: ' + e.message) }
    setBusy(false)
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <select style={inputS} value={accountId} onChange={e => setAccountId(e.target.value)}>
          <option value="">اختر حساب</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name_ar}</option>)}
        </select>
        <input type="date" style={inputS} value={from} onChange={e => setFrom(e.target.value)} />
        <input type="date" style={inputS} value={to} onChange={e => setTo(e.target.value)} />
        <button style={btnS()} onClick={run}>تحديث</button>
      </div>
      {busy ? <Spinner /> : rows && (
        <table style={tblS}>
          <thead><tr><Th>التاريخ</Th><Th>القيد</Th><Th>البيان</Th><Th>مدين</Th><Th>دائن</Th><Th>الرصيد</Th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} style={emptyTd}>لا حركة</td></tr>}
            {rows.map(r => (
              <tr key={r.id}>
                <Td>{r.je.entry_date}</Td>
                <Td>{r.je.entry_number}</Td>
                <Td>{r.description || r.je.description}</Td>
                <Td>{fmtAmt(r.debit)}</Td>
                <Td>{fmtAmt(r.credit)}</Td>
                <Td><b>{fmtAmt(r.running_balance)}</b></Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ─── Banks ─────────────────────────────────────────────────────
function BanksTab({ toast }) {
  const [banks, setBanks] = useState([])
  const [busy, setBusy] = useState(true)
  const [form, setForm] = useState(null)
  const [accounts, setAccounts] = useState([])
  const refresh = async () => { setBusy(true); try { setBanks(await Acc.listBankAccounts()); setAccounts(await Acc.listAccounts()) } catch (e) { toast?.('خطأ: ' + e.message) } setBusy(false) }
  useEffect(() => { refresh() }, [])
  const bankAccounts = accounts.filter(a => a.account_subtype === 'bank' || a.code === '1110' || (a.parent_id && accounts.find(p => p.id === a.parent_id)?.code === '1110'))
  const save = async () => {
    if (!form?.bank_name_ar || !form?.iban || !form?.account_id) { toast?.('الاسم والآيبان والحساب المحاسبي مطلوبة'); return }
    try { await Acc.createBankAccount(form); setForm(null); refresh(); toast?.('تمت الإضافة') } catch (e) { toast?.('خطأ: ' + e.message) }
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button style={btnS('gold')} onClick={() => setForm({ bank_name_ar: '', iban: '', account_number: '', currency_code: 'SAR', account_id: '' })}>+ حساب بنكي</button>
      </div>
      {busy ? <Spinner /> : (
        <table style={tblS}>
          <thead><tr><Th>البنك</Th><Th>الآيبان</Th><Th>رقم الحساب</Th><Th>العملة</Th><Th>الحساب المحاسبي</Th></tr></thead>
          <tbody>
            {banks.length === 0 && <tr><td colSpan={5} style={emptyTd}>لا حسابات</td></tr>}
            {banks.map(b => (
              <tr key={b.id}>
                <Td>{b.bank_name_ar}</Td>
                <Td style={{ fontFamily: 'monospace' }}>{b.iban}</Td>
                <Td>{b.account_number || '—'}</Td>
                <Td>{b.currency_code}</Td>
                <Td>{b.account?.code} — {b.account?.name_ar}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {form && (
        <Modal onClose={() => setForm(null)} title="حساب بنكي جديد">
          <Field label="اسم البنك"><input style={inputS} value={form.bank_name_ar} onChange={e => setForm({ ...form, bank_name_ar: e.target.value })} /></Field>
          <Field label="الآيبان"><input style={inputS} value={form.iban} onChange={e => setForm({ ...form, iban: e.target.value })} /></Field>
          <Field label="رقم الحساب"><input style={inputS} value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} /></Field>
          <Field label="الحساب المحاسبي">
            <select style={inputS} value={form.account_id} onChange={e => setForm({ ...form, account_id: e.target.value })}>
              <option value="">اختر</option>
              {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name_ar}</option>)}
            </select>
          </Field>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
            <button style={btnS()} onClick={() => setForm(null)}>إلغاء</button>
            <button style={btnS('gold')} onClick={save}>حفظ</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Periods ───────────────────────────────────────────────────
function PeriodsTab({ toast }) {
  const [years, setYears] = useState([])
  const [periodsByYear, setPeriodsByYear] = useState({})
  const refresh = async () => {
    try {
      const ys = await Acc.listFiscalYears()
      setYears(ys)
      const mapped = {}
      for (const y of ys) {
        mapped[y.id] = await Acc.listPeriods(y.id)
      }
      setPeriodsByYear(mapped)
    } catch (e) { toast?.('خطأ: ' + e.message) }
  }
  useEffect(() => { refresh() }, [])
  const ensureYear = async () => {
    const y = Number(window.prompt('السنة المالية (مثلاً 2026)', new Date().getFullYear()))
    if (!y) return
    try { await Acc.ensureFiscalYear(y); refresh() } catch (e) { toast?.('خطأ: ' + e.message) }
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button style={btnS('gold')} onClick={ensureYear}>+ سنة مالية</button>
      </div>
      {years.length === 0 && <div style={{ ...emptyTd, padding: 32 }}>لا توجد سنوات مالية</div>}
      {years.map(y => (
        <div key={y.id} style={{ marginBottom: 18, background: '#1f1f1f', borderRadius: 12, padding: 14, border: '1px solid rgba(255,255,255,.06)' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.gold, marginBottom: 8 }}>{y.name}  ·  {y.starts_on} → {y.ends_on}  ·  {y.status === 'closed' ? 'مغلقة' : 'مفتوحة'}</div>
          <table style={tblS}>
            <thead><tr><Th>الفترة</Th><Th>من</Th><Th>إلى</Th><Th>الحالة</Th><Th></Th></tr></thead>
            <tbody>
              {(periodsByYear[y.id] || []).map(p => (
                <tr key={p.id}>
                  <Td>{p.name}</Td>
                  <Td>{p.starts_on}</Td>
                  <Td>{p.ends_on}</Td>
                  <Td>{p.status === 'closed' ? 'مُقفلة' : 'مفتوحة'}</Td>
                  <Td>
                    {p.status === 'open'
                      ? <button style={btnS()} onClick={async () => { try { await Acc.closePeriod(p.id); refresh(); toast?.('تم الإقفال') } catch (e) { toast?.('خطأ: ' + e.message) } }}>إقفال</button>
                      : <button style={btnS()} onClick={async () => { try { await Acc.reopenPeriod(p.id); refresh(); toast?.('تم إعادة الفتح') } catch (e) { toast?.('خطأ: ' + e.message) } }}>إعادة فتح</button>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

// ─── Common UI atoms ───────────────────────────────────────────
const inputS = { width: '100%', height: 38, padding: '0 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,.06)', background: 'var(--modal-input-bg, #2a2a2a)', color: 'var(--tx, #f0f0f0)', fontFamily: F, fontSize: 13, outline: 'none', boxSizing: 'border-box' }
const btnS = (variant) => ({
  height: 38, padding: '0 16px', borderRadius: 9, fontFamily: F, fontWeight: 700, fontSize: 13, cursor: 'pointer',
  border: '1px solid ' + (variant === 'gold' ? C.gold : variant === 'red' ? C.red : 'rgba(255,255,255,.08)'),
  background: variant === 'gold' ? 'rgba(212,160,23,.16)' : variant === 'red' ? 'rgba(192,57,43,.16)' : 'rgba(0,0,0,.18)',
  color: variant === 'gold' ? C.gold : variant === 'red' ? '#ff8e7e' : 'var(--tx, #f0f0f0)',
})
const tblS = { width: '100%', borderCollapse: 'collapse', background: '#1f1f1f', borderRadius: 12, overflow: 'hidden', fontSize: 13 }
const emptyTd = { textAlign: 'center', padding: 24, color: 'rgba(255,255,255,.5)' }
function Th({ children }) { return <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, fontSize: 12, color: 'rgba(255,255,255,.55)', background: 'rgba(0,0,0,.18)', borderBottom: '1px solid rgba(255,255,255,.05)' }}>{children}</th> }
function Td({ children, style }) { return <td style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,.04)', ...(style || {}) }}>{children}</td> }
function Field({ label, children }) { return <div style={{ marginBottom: 10 }}><div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.55)', marginBottom: 4 }}>{label}</div>{children}</div> }
function KV({ k, v }) { return <div><div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)' }}>{k}</div><div style={{ fontSize: 13, fontWeight: 700 }}>{v}</div></div> }

function Modal({ onClose, title, children, wide }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,.78)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--modal-bg, #1f1f1f)', borderRadius: 14, width: wide ? 900 : 560, maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto', border: '1px solid rgba(212,160,23,.18)', padding: 20, fontFamily: F, direction: 'rtl' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.gold, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,.06)' }}>{title}</div>
        {children}
      </div>
    </div>
  )
}
