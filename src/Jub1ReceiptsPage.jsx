// صفحة سندات القبض لمكتب JUB1 — إدخال يدوي متسامح لسندات القبض القديمة (≈سنتين، ≈4000 صورة)
// مرحلة وسيطة (staging): يُدخل الموظف كل سند كصورة + بيانات كاملة في جدولَي
// jub1_receipts + jub1_receipt_payments، مع كشف أخطاء مباشر (مجموع ≠ إجمالي، سند مكرّر…)،
// ثم نراجعها سوياً ونحوّلها لاحقاً إلى فواتير حقيقية مطابقة لباقي المكاتب.
// كل الحقول اختيارية — يُسمح بالحفظ الناقص والتعديل لاحقاً حتى تكتمل الصورة.
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Modal as FKModal, ModalSection, GRID, TextField, NumberField, CurrencyField,
  DateField, TextArea, Select, FileField, Segmented, ActionButton, SuccessView, EmptyState,
} from './components/ui/FormKit.jsx'
import {
  Plus, Trash2, X, AlertTriangle, Search, Pencil, FileText, Check, Receipt,
  Image as ImageIcon, Filter, RefreshCw, CheckCircle2, CircleDashed,
} from 'lucide-react'

const JUB1_ENTITY = 'jub1_receipt'
const num = v => { const n = parseFloat(String(v ?? '').replace(/,/g, '')); return isNaN(n) ? 0 : n }
const fmt = v => { const n = num(v); return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
const rid = () => Math.random().toString(36).slice(2, 10)

// حالات المراجعة
const STATUS = {
  draft:     { l: 'مسودة',   e: 'Draft',     c: '#8a7a55' },
  complete:  { l: 'مكتمل',   e: 'Complete',  c: '#2563eb' },
  reviewed:  { l: 'مُراجَع', e: 'Reviewed',  c: '#1f7a45' },
  flagged:   { l: 'عليه ملاحظة', e: 'Flagged', c: '#c0392b' },
  converted: { l: 'محوّل',   e: 'Converted', c: '#7c3aed' },
}

export default function Jub1ReceiptsPage({ sb, user, toast, lang = 'ar', emptyIcon }) {
  const T = (ar, en) => (lang === 'ar' ? ar : en)
  const tt = m => toast?.(m)

  const [branch, setBranch] = useState(null)         // {id, branch_code}
  const [services, setServices] = useState([])       // lookup_items نوع الخدمة
  const [methods, setMethods] = useState([])         // lookup_items طريقة الدفع
  const [agents, setAgents] = useState([])           // للاقتراح التلقائي لاسم الوسيط
  const [entries, setEntries] = useState([])         // صفوف jub1_receipts + payments
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [onlyFlagged, setOnlyFlagged] = useState(false)
  const [editing, setEditing] = useState(null)       // كائن النموذج المفتوح أو null

  const isGM = user?.role?.name_ar === 'المدير العام'

  // ── تحميل المراجع + القيود ─────────────────────────────────────────────
  const loadRefs = useCallback(async () => {
    const [{ data: br }, { data: cats }, { data: ag }] = await Promise.all([
      sb.from('branches').select('id,branch_code,name_ar').eq('branch_code', 'JUB1').maybeSingle(),
      sb.from('lookup_categories').select('id,name_ar').in('name_ar', ['نوع الخدمة', 'طريقة الدفع']),
      sb.from('agents').select('id,name_ar').is('deleted_at', null).order('name_ar').limit(1000),
    ])
    setBranch(br || null)
    const svcCat = (cats || []).find(c => c.name_ar === 'نوع الخدمة')?.id
    const payCat = (cats || []).find(c => c.name_ar === 'طريقة الدفع')?.id
    if (svcCat) {
      const { data } = await sb.from('lookup_items').select('id,value_ar,code,is_active,sort_order').eq('category_id', svcCat).order('sort_order')
      setServices((data || []).filter(x => x.is_active))
    }
    if (payCat) {
      const { data } = await sb.from('lookup_items').select('id,value_ar,code,sort_order').eq('category_id', payCat).order('sort_order')
      setMethods(data || [])
    }
    setAgents((ag || []).map(a => a.name_ar).filter(Boolean))
  }, [sb])

  const loadEntries = useCallback(async () => {
    setLoading(true)
    const { data: rows } = await sb.from('jub1_receipts')
      .select('*').is('deleted_at', null).order('created_at', { ascending: false }).limit(3000)
    const ids = (rows || []).map(r => r.id)
    let pays = []
    if (ids.length) {
      const { data } = await sb.from('jub1_receipt_payments').select('*').in('receipt_entry_id', ids)
      pays = data || []
    }
    const byEntry = {}
    pays.forEach(p => { (byEntry[p.receipt_entry_id] ||= []).push(p) })
    const merged = (rows || []).map(r => ({ ...r, payments: (byEntry[r.id] || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)) }))
    setEntries(merged)
    setLoading(false)
  }, [sb])

  useEffect(() => { loadRefs() }, [loadRefs])
  useEffect(() => { loadEntries() }, [loadEntries])

  // عدّاد أرقام السندات عبر كل الإدخالات — لكشف التكرار
  const sanadCounts = useMemo(() => {
    const m = {}
    entries.forEach(e => {
      const seen = new Set()
      ;[e.primary_receipt_no, ...(e.payments || []).map(p => p.sanad_no)].forEach(s => {
        const k = String(s || '').trim()
        if (!k || seen.has(k)) return
        seen.add(k); m[k] = (m[k] || 0) + 1
      })
    })
    return m
  }, [entries])

  const flagsOf = useCallback((e) => {
    const f = []
    const total = num(e.total_amount)
    const paid = (e.payments || []).reduce((s, p) => s + num(p.amount), 0)
    const planSum = (e.installment_plan || []).reduce((s, p) => s + num(p.amount), 0)
    if (total && Math.abs(paid - total) > 0.5 && paid > total + 0.5) f.push(T('المدفوع أكبر من الإجمالي', 'Paid > total'))
    if (total && planSum && Math.abs(planSum - total) > 0.5) f.push(T('توزيع الدفعات ≠ الإجمالي', 'Plan ≠ total'))
    // سند مكرّر
    const nums = [e.primary_receipt_no, ...(e.payments || []).map(p => p.sanad_no)].map(s => String(s || '').trim()).filter(Boolean)
    const dupInside = nums.some((s, i) => nums.indexOf(s) !== i)
    const dupOutside = nums.some(s => (sanadCounts[s] || 0) > 1)
    if (dupInside || dupOutside) f.push(T('رقم سند مكرّر', 'Duplicate receipt no'))
    if (!e.client_name) f.push(T('بدون اسم عميل', 'No client name'))
    if (!total) f.push(T('بدون إجمالي', 'No total'))
    return f
  }, [sanadCounts, lang])

  // ── تصفية العرض ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return entries.filter(e => {
      if (statusFilter !== 'all' && e.review_status !== statusFilter) return false
      if (onlyFlagged && flagsOf(e).length === 0) return false
      if (!qq) return true
      const hay = [e.client_name, e.client_phone, e.client_id_no, e.agent_name, e.primary_receipt_no, e.service_code,
        ...(e.payments || []).map(p => p.sanad_no)].join(' ').toLowerCase()
      return hay.includes(qq)
    })
  }, [entries, q, statusFilter, onlyFlagged, flagsOf])

  const stats = useMemo(() => {
    const s = { total: entries.length, draft: 0, complete: 0, reviewed: 0, converted: 0, flagged: 0 }
    entries.forEach(e => { s[e.review_status] = (s[e.review_status] || 0) + 1; if (flagsOf(e).length) s.flagged++ })
    return s
  }, [entries, flagsOf])

  // ── فتح/إغلاق النموذج ──────────────────────────────────────────────────
  const blankEntry = () => ({
    _new: true, id: null, client_name: '', client_phone: '', client_id_no: '', agent_name: '',
    service_item_id: null, service_code: '', quantity: '1', total_amount: '', primary_receipt_no: '',
    receipt_date: '', installment_plan: [], notes: '', review_status: 'draft',
    payments: [{ _k: rid(), sanad_no: '', pay_date: '', amount: '', method_code: '', is_previous: false, notes: '' }],
    newFiles: [], existingFiles: [],
  })

  const openNew = () => setEditing(blankEntry())
  const openEdit = async (e) => {
    // حمّل الصور المرفقة الحالية
    const { data: atts } = await sb.from('attachments').select('id,file_url,file_name')
      .eq('entity_type', JUB1_ENTITY).eq('entity_id', e.id).is('deleted_at', null)
    setEditing({
      ...e,
      installment_plan: Array.isArray(e.installment_plan) ? e.installment_plan.map(p => ({ _k: rid(), ...p })) : [],
      payments: (e.payments || []).map(p => ({ ...p, _k: rid() })),
      newFiles: [], existingFiles: atts || [],
    })
  }

  return (
    <div style={{ padding: '4px 2px 40px' }}>
      {/* ═══ الترويسة + الإحصاءات ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-soft)', border: '1px solid var(--accent-bd)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Receipt size={20} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--tx)', fontFamily: 'Cairo' }}>{T('سندات القبض — JUB1', 'Receipts — JUB1')}</div>
            <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{T('إدخال يدوي من الصور ثم مراجعة وتحويل لفواتير', 'Manual entry from images, then review & convert')}</div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={loadEntries} title={T('تحديث', 'Refresh')} style={btnGhost}>
          <RefreshCw size={15} />
        </button>
        <button onClick={openNew} style={btnGold}>
          <Plus size={16} /> {T('سند جديد', 'New receipt')}
        </button>
      </div>

      {/* شريط الإحصاءات */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10, marginBottom: 14 }}>
        <StatCard label={T('الإجمالي', 'Total')} value={stats.total} c="var(--accent)" />
        <StatCard label={STATUS.draft.l} value={stats.draft} c={STATUS.draft.c} />
        <StatCard label={STATUS.complete.l} value={stats.complete} c={STATUS.complete.c} />
        <StatCard label={STATUS.reviewed.l} value={stats.reviewed} c={STATUS.reviewed.c} />
        <StatCard label={T('عليه ملاحظة', 'Flagged')} value={stats.flagged} c="#c0392b" />
        <StatCard label={STATUS.converted.l} value={stats.converted} c={STATUS.converted.c} />
      </div>

      {/* أدوات التصفية */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 340 }}>
          <Search size={15} style={{ position: 'absolute', top: 11, insetInlineStart: 11, color: 'var(--tx4)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={T('بحث: عميل، جوال، هوية، رقم سند…', 'Search…')}
            style={{ width: '100%', height: 38, padding: '0 12px 0 34px', borderRadius: 10, border: '1px solid var(--inputBd)', background: 'var(--inputBg)', color: 'var(--tx)', fontFamily: 'Cairo', fontSize: 13 }} />
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {['all', 'draft', 'complete', 'reviewed', 'converted'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={chip(statusFilter === s, s === 'all' ? 'var(--accent)' : STATUS[s].c)}>
              {s === 'all' ? T('الكل', 'All') : STATUS[s].l}
            </button>
          ))}
        </div>
        <button onClick={() => setOnlyFlagged(v => !v)} style={chip(onlyFlagged, '#c0392b')}>
          <AlertTriangle size={13} style={{ verticalAlign: -2, marginInlineEnd: 4 }} />{T('عليه ملاحظات', 'Flagged only')}
        </button>
      </div>

      {/* ═══ الجدول ═══ */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--tx3)' }}>{T('جارٍ التحميل…', 'Loading…')}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={emptyIcon} title={T('لا توجد سندات', 'No receipts')} desc={T('ابدأ بإضافة أول سند قبض', 'Add the first receipt')} />
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid var(--bd)', borderRadius: 14, background: 'var(--card-grad2)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, fontFamily: 'Cairo', minWidth: 900 }}>
            <thead>
              <tr style={{ background: 'var(--hoverBg)', color: 'var(--tx3)', fontSize: 11 }}>
                {[T('رقم السند', 'Receipt#'), T('العميل', 'Client'), T('الخدمة', 'Service'), T('الكمية', 'Qty'),
                  T('الإجمالي', 'Total'), T('المدفوع', 'Paid'), T('المتبقي', 'Remaining'), T('سندات', 'Rows'),
                  T('الحالة', 'Status'), T('ملاحظات', 'Flags'), ''].map((h, i) => (
                  <th key={i} style={{ padding: '9px 10px', textAlign: i > 3 && i < 8 ? 'center' : 'start', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => {
                const paid = (e.payments || []).reduce((s, p) => s + num(p.amount), 0)
                const total = num(e.total_amount)
                const flags = flagsOf(e)
                const st = STATUS[e.review_status] || STATUS.draft
                return (
                  <tr key={e.id} onClick={() => openEdit(e)} style={{ borderTop: '1px solid var(--bd)', cursor: 'pointer' }}
                    onMouseEnter={ev => ev.currentTarget.style.background = 'var(--hoverBg)'}
                    onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '9px 10px', fontWeight: 700, color: 'var(--tx)', direction: 'ltr' }}>{e.primary_receipt_no || '—'}</td>
                    <td style={{ padding: '9px 10px', color: 'var(--tx2)' }}>{e.client_name || <em style={{ color: 'var(--tx4)' }}>{T('—', '—')}</em>}</td>
                    <td style={{ padding: '9px 10px', color: 'var(--tx3)', whiteSpace: 'nowrap' }}>{services.find(s => s.id === e.service_item_id)?.value_ar || '—'}</td>
                    <td style={{ padding: '9px 10px', textAlign: 'center', color: 'var(--tx3)' }}>{e.quantity || 1}</td>
                    <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 700, color: 'var(--tx)', direction: 'ltr' }}>{total ? fmt(total) : '—'}</td>
                    <td style={{ padding: '9px 10px', textAlign: 'center', color: 'var(--ok)', direction: 'ltr' }}>{fmt(paid)}</td>
                    <td style={{ padding: '9px 10px', textAlign: 'center', direction: 'ltr', color: total - paid > 0.5 ? 'var(--warn)' : 'var(--tx3)' }}>{fmt(total - paid)}</td>
                    <td style={{ padding: '9px 10px', textAlign: 'center', color: 'var(--tx3)' }}>{(e.payments || []).length}</td>
                    <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                      <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, color: st.c, background: st.c + '18' }}>{st.l}</span>
                    </td>
                    <td style={{ padding: '9px 10px' }}>
                      {flags.length ? (
                        <span title={flags.join('، ')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#c0392b', fontSize: 11, fontWeight: 700 }}>
                          <AlertTriangle size={13} /> {flags.length}
                        </span>
                      ) : <Check size={14} style={{ color: 'var(--ok)' }} />}
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'center' }}><Pencil size={14} style={{ color: 'var(--tx4)' }} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <EntryModal sb={sb} user={user} lang={lang} tt={tt} branch={branch} services={services} methods={methods}
          agents={agents} entry={editing} isGM={isGM} onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); loadEntries() }} />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// نموذج الإدخال/التعديل
// ═══════════════════════════════════════════════════════════════════════
function EntryModal({ sb, user, lang, tt, branch, services, methods, agents, entry, isGM, onClose, onSaved }) {
  const T = (ar, en) => (lang === 'ar' ? ar : en)
  const [f, setF] = useState(entry)
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const paid = (f.payments || []).reduce((s, p) => s + num(p.amount), 0)
  const planSum = (f.installment_plan || []).reduce((s, p) => s + num(p.amount), 0)
  const total = num(f.total_amount)
  const remaining = total - paid

  // كشف الأخطاء المباشر
  const liveFlags = useMemo(() => {
    const arr = []
    if (total && paid > total + 0.5) arr.push(T('المدفوع أكبر من الإجمالي', 'Paid exceeds total'))
    if (total && planSum && Math.abs(planSum - total) > 0.5) arr.push(T('توزيع الدفعات لا يساوي الإجمالي', 'Plan sum ≠ total'))
    const nums = [f.primary_receipt_no, ...(f.payments || []).map(p => p.sanad_no)].map(s => String(s || '').trim()).filter(Boolean)
    if (nums.some((s, i) => nums.indexOf(s) !== i)) arr.push(T('رقم سند مكرّر داخل هذا الإدخال', 'Duplicate receipt no within entry'))
    return arr
  }, [f, total, paid, planSum, lang])

  // صفوف الدفعات (السندات)
  const addPay = () => set('payments', [...(f.payments || []), { _k: rid(), sanad_no: '', pay_date: '', amount: '', method_code: '', is_previous: false, notes: '' }])
  const setPay = (k, key, val) => set('payments', f.payments.map(p => p._k === k ? { ...p, [key]: val } : p))
  const delPay = (k) => set('payments', f.payments.filter(p => p._k !== k))

  // صفوف توزيع الدفعات
  const addPlan = () => set('installment_plan', [...(f.installment_plan || []), { _k: rid(), label: '', amount: '' }])
  const setPlan = (k, key, val) => set('installment_plan', f.installment_plan.map(p => p._k === k ? { ...p, [key]: val } : p))
  const delPlan = (k) => set('installment_plan', f.installment_plan.filter(p => p._k !== k))

  const svcOpt = services.map(s => ({ id: s.id, label: s.value_ar, code: s.code }))
  const isVisa = /visa/i.test(f.service_code || '')

  async function save() {
    setBusy(true)
    try {
      const row = {
        branch_id: branch?.id || null,
        client_name: f.client_name || null, client_phone: f.client_phone || null, client_id_no: f.client_id_no || null,
        agent_name: f.agent_name || null,
        service_item_id: f.service_item_id || null, service_code: f.service_code || null,
        quantity: f.quantity ? parseInt(f.quantity, 10) : null,
        total_amount: f.total_amount ? num(f.total_amount) : null,
        primary_receipt_no: f.primary_receipt_no || null,
        receipt_date: f.receipt_date || null,
        installment_plan: (f.installment_plan || []).map(({ _k, ...p }) => ({ ...p, amount: p.amount ? num(p.amount) : null })),
        notes: f.notes || null,
        review_status: f.review_status || 'draft',
        updated_by: user?.id || null,
      }
      let entryId = f.id
      if (f._new || !entryId) {
        const { data, error } = await sb.from('jub1_receipts').insert({ ...row, created_by: user?.id || null }).select('id').single()
        if (error) throw error
        entryId = data.id
      } else {
        const { error } = await sb.from('jub1_receipts').update(row).eq('id', entryId)
        if (error) throw error
      }

      // الدفعات: استبدال كامل (بسيط وآمن للمرحلة الوسيطة)
      await sb.from('jub1_receipt_payments').delete().eq('receipt_entry_id', entryId)
      const payRows = (f.payments || []).filter(p => p.sanad_no || p.amount || p.pay_date).map((p, i) => ({
        receipt_entry_id: entryId, sanad_no: p.sanad_no || null, pay_date: p.pay_date || null,
        amount: p.amount ? num(p.amount) : null, method_code: p.method_code || null,
        is_previous: !!p.is_previous, notes: p.notes || null, sort_order: i,
      }))
      if (payRows.length) { const { error } = await sb.from('jub1_receipt_payments').insert(payRows); if (error) throw error }

      // رفع الصور الجديدة
      for (const file of (f.newFiles || [])) {
        try {
          const safe = (file.name || 'img').replace(/[^\w.\-]+/g, '_')
          const path = `jub1_receipts/${entryId}/${Date.now()}_${rid()}_${safe}`
          await sb.storage.from('attachments').upload(path, file, { cacheControl: '3600', upsert: false })
          const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
          await sb.from('attachments').insert({
            entity_type: JUB1_ENTITY, entity_id: entryId, file_name: file.name,
            file_url: pub?.publicUrl || path, storage_path: path,
            mime_type: file.type || null, size_bytes: file.size || null, uploaded_by: user?.id || null,
          })
        } catch (e) { /* رفع صورة واحدة فشل — لا نوقف الحفظ */ }
      }
      setOk(true)
    } catch (e) {
      tt(T('خطأ في الحفظ: ', 'Save error: ') + (e.message || e))
      setBusy(false)
    }
  }

  async function removeExisting(att) {
    await sb.from('attachments').update({ deleted_at: new Date().toISOString(), deleted_by: user?.id || null }).eq('id', att.id)
    set('existingFiles', (f.existingFiles || []).filter(x => x.id !== att.id))
  }

  if (ok) {
    return <FKModal open onClose={onSaved} lang={lang} variant="create" width={520}
      success={<SuccessView title={T('تم حفظ السند بنجاح', 'Receipt saved')}
        action={<ActionButton Icon={Check} color="var(--accent)" onClick={onSaved}>{T('تم', 'Done')}</ActionButton>} />} />
  }

  const body = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* العميل */}
      <ModalSection Icon={FileText} label={T('العميل', 'Client')}>
        <div style={GRID}>
          <TextField label={T('اسم العميل', 'Client name')} value={f.client_name} onChange={v => set('client_name', v)} />
          <TextField label={T('جوال العميل', 'Phone')} value={f.client_phone} onChange={v => set('client_phone', v)} dir="ltr" align="center" />
          <TextField label={T('رقم الهوية', 'ID number')} value={f.client_id_no} onChange={v => set('client_id_no', v)} dir="ltr" align="center" />
          <ComboField label={T('اسم الوسيط', 'Agent name')} value={f.agent_name} onChange={v => set('agent_name', v)} options={agents} lang={lang} />
        </div>
      </ModalSection>

      {/* الخدمة والمبلغ */}
      <ModalSection Icon={Receipt} label={T('الخدمة والمبلغ', 'Service & amount')}>
        <div style={GRID}>
          <Select label={T('نوع الخدمة', 'Service')} value={f.service_item_id} options={svcOpt}
            getKey={o => o.id} getLabel={o => o.label} placeholder={T('اختر الخدمة', 'Select service')}
            onChange={id => { const o = svcOpt.find(x => x.id === id); setF(p => ({ ...p, service_item_id: id, service_code: o?.code || '' })) }} />
          <NumberField label={T('الكمية', 'Quantity') + (isVisa ? ' ⚑' : '')} value={f.quantity} onChange={v => set('quantity', v)} min={1} />
          <CurrencyField label={T('المبلغ الإجمالي', 'Total amount')} value={f.total_amount} onChange={v => set('total_amount', v)} />
          <TextField label={T('رقم السند الأساسي', 'Primary receipt no')} value={f.primary_receipt_no} onChange={v => set('primary_receipt_no', v)} dir="ltr" align="center" />
          <DateField label={T('تاريخ السند', 'Receipt date')} value={f.receipt_date} onChange={v => set('receipt_date', v)} />
        </div>
      </ModalSection>

      {/* توزيع الدفعات */}
      <ModalSection Icon={FileText} label={T('توزيع الدفعات (اختياري)', 'Installment plan (optional)')}>
        <RowEditor rows={f.installment_plan} onAdd={addPlan} addLabel={T('إضافة دفعة للجدول', 'Add plan row')} lang={lang}
          render={(p) => (
            <>
              <input value={p.label || ''} onChange={e => setPlan(p._k, 'label', e.target.value)} placeholder={T('وصف (مثال: الدفعة الأولى)', 'Label')}
                style={cellInput} />
              <input value={p.amount || ''} onChange={e => setPlan(p._k, 'amount', e.target.value.replace(/[^\d.]/g, ''))} placeholder={T('المبلغ', 'Amount')}
                style={{ ...cellInput, width: 120, direction: 'ltr', textAlign: 'center' }} />
              <button onClick={() => delPlan(p._k)} style={rowDel}><Trash2 size={14} /></button>
            </>
          )} />
        {planSum > 0 && <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 6 }}>{T('مجموع التوزيع', 'Plan total')}: <b style={{ color: 'var(--tx)' }}>{fmt(planSum)}</b></div>}
      </ModalSection>

      {/* السندات / المدفوعات */}
      <ModalSection Icon={Receipt} label={T('السندات / المدفوعات', 'Receipts / Payments')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(f.payments || []).map(p => (
            <div key={p._k} style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', padding: 8, borderRadius: 10, border: '1px solid var(--bd)', background: 'var(--inputBg)' }}>
              <input value={p.sanad_no || ''} onChange={e => setPay(p._k, 'sanad_no', e.target.value)} placeholder={T('رقم السند', 'Receipt#')} style={{ ...cellInput, width: 110, direction: 'ltr', textAlign: 'center' }} />
              <input value={p.pay_date || ''} onChange={e => setPay(p._k, 'pay_date', e.target.value)} placeholder="YYYY-MM-DD" style={{ ...cellInput, width: 120, direction: 'ltr', textAlign: 'center' }} />
              <input value={p.amount || ''} onChange={e => setPay(p._k, 'amount', e.target.value.replace(/[^\d.]/g, ''))} placeholder={T('المبلغ', 'Amount')} style={{ ...cellInput, width: 100, direction: 'ltr', textAlign: 'center' }} />
              <select value={p.method_code || ''} onChange={e => setPay(p._k, 'method_code', e.target.value)} style={{ ...cellInput, width: 110 }}>
                <option value="">{T('طريقة الدفع', 'Method')}</option>
                {methods.map(m => <option key={m.code} value={m.code}>{m.value_ar}</option>)}
              </select>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--tx3)', cursor: 'pointer' }}>
                <input type="checkbox" checked={!!p.is_previous} onChange={e => setPay(p._k, 'is_previous', e.target.checked)} /> {T('دفعة سابقة', 'Previous')}
              </label>
              <input value={p.notes || ''} onChange={e => setPay(p._k, 'notes', e.target.value)} placeholder={T('ملاحظة', 'Note')} style={{ ...cellInput, flex: 1, minWidth: 100 }} />
              <button onClick={() => delPay(p._k)} style={rowDel}><Trash2 size={14} /></button>
            </div>
          ))}
          <button onClick={addPay} style={addRowBtn}><Plus size={14} /> {T('إضافة سند', 'Add receipt')}</button>
        </div>
      </ModalSection>

      {/* الصور */}
      <ModalSection Icon={ImageIcon} label={T('صور السندات', 'Receipt images')}>
        {(f.existingFiles || []).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            {f.existingFiles.map(a => (
              <div key={a.id} style={{ position: 'relative', width: 84, height: 84, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--bd)' }}>
                <a href={a.file_url} target="_blank" rel="noreferrer"><img src={a.file_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></a>
                <button onClick={() => removeExisting(a)} style={{ position: 'absolute', top: 2, insetInlineEnd: 2, width: 20, height: 20, borderRadius: 6, border: 'none', background: 'rgba(192,57,43,.9)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} /></button>
              </div>
            ))}
          </div>
        )}
        <FileField label={T('أضف صور (متعدّد)', 'Add images')} value={f.newFiles} onChange={v => set('newFiles', v)} multiple accept="image/*,application/pdf" />
      </ModalSection>

      {/* ملاحظات + الحالة */}
      <ModalSection Icon={FileText} label={T('ملاحظات والحالة', 'Notes & status')}>
        <TextArea label={T('ملاحظات', 'Notes')} value={f.notes} onChange={v => set('notes', v)} rows={2} />
        <Segmented label={T('حالة المراجعة', 'Review status')} value={f.review_status} onChange={v => set('review_status', v)}
          options={[{ v: 'draft', l: STATUS.draft.l, c: STATUS.draft.c }, { v: 'complete', l: STATUS.complete.l, c: STATUS.complete.c }, { v: 'reviewed', l: STATUS.reviewed.l, c: STATUS.reviewed.c }, { v: 'flagged', l: STATUS.flagged.l, c: STATUS.flagged.c }]} />
      </ModalSection>
    </div>
  )

  // لوحة الحسابات المباشرة (تظهر أسفل النافذة كـ footerStart)
  const calcBar = (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', fontSize: 11.5, fontFamily: 'Cairo' }}>
      <span style={{ color: 'var(--tx3)' }}>{T('المدفوع', 'Paid')}: <b style={{ color: 'var(--ok)', direction: 'ltr' }}>{fmt(paid)}</b></span>
      <span style={{ color: 'var(--tx3)' }}>{T('المتبقي', 'Remaining')}: <b style={{ color: remaining > 0.5 ? 'var(--warn)' : 'var(--tx2)', direction: 'ltr' }}>{fmt(remaining)}</b></span>
      {liveFlags.length > 0 && (
        <span style={{ color: '#c0392b', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <AlertTriangle size={13} /> {liveFlags.join('، ')}
        </span>
      )}
    </div>
  )

  return (
    <FKModal open onClose={onClose} lang={lang} variant={f._new ? 'create' : 'edit'} width={860} scroll
      title={f._new ? T('سند قبض جديد', 'New receipt') : T('تعديل سند', 'Edit receipt')}
      subtitle={T('كل الحقول اختيارية — احفظ ناقص وكمّل لاحقاً', 'All fields optional — save partial')}
      Icon={Receipt}
      footerStart={calcBar}
      footer={<ActionButton dir="back" Icon={Check} color="var(--accent)" disabled={busy} onClick={save}>{busy ? T('جارٍ الحفظ…', 'Saving…') : T('حفظ', 'Save')}</ActionButton>}>
      {body}
    </FKModal>
  )
}

// ── مكوّنات مساعدة ────────────────────────────────────────────────────────
function StatCard({ label, value, c }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid var(--bd)', background: 'var(--card-grad2)', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: c, fontFamily: 'Cairo', direction: 'ltr' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function RowEditor({ rows, render, onAdd, addLabel, lang }) {
  const T = (ar, en) => (lang === 'ar' ? ar : en)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {(rows || []).map(r => (
        <div key={r._k} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>{render(r)}</div>
      ))}
      <button onClick={onAdd} style={addRowBtn}><Plus size={14} /> {addLabel}</button>
    </div>
  )
}

// حقل نص مع اقتراح تلقائي (datalist) — للوسيط
function ComboField({ label, value, onChange, options, lang }) {
  const id = useRef('dl_' + rid()).current
  return (
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--tx3)', marginBottom: 6, fontFamily: 'Cairo' }}>{label}</div>
      <input list={id} value={value || ''} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', height: 42, padding: '0 12px', borderRadius: 9, border: '1px solid transparent', background: 'var(--inputBg)', color: 'var(--tx)', fontFamily: 'Cairo', fontSize: 14, textAlign: 'center' }} />
      <datalist id={id}>{(options || []).map((o, i) => <option key={i} value={o} />)}</datalist>
    </div>
  )
}

// ── أنماط ─────────────────────────────────────────────────────────────────
const btnGold = { display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,var(--accent-strong,#B07D00),var(--accent))', color: '#fff', fontFamily: 'Cairo', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }
const btnGhost = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 10, border: '1px solid var(--bd)', background: 'var(--inputBg)', color: 'var(--tx2)', cursor: 'pointer' }
const cellInput = { height: 34, padding: '0 10px', borderRadius: 8, border: '1px solid var(--inputBd)', background: 'var(--card-bg,var(--sf))', color: 'var(--tx)', fontFamily: 'Cairo', fontSize: 12.5 }
const rowDel = { width: 30, height: 30, flexShrink: 0, borderRadius: 8, border: 'none', background: 'rgba(192,57,43,.12)', color: '#c0392b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const addRowBtn = { alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', borderRadius: 9, border: '1px dashed var(--accent-bd)', background: 'var(--accent-soft)', color: 'var(--accent)', fontFamily: 'Cairo', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
const chip = (active, c) => ({ height: 30, padding: '0 12px', borderRadius: 20, border: `1px solid ${active ? c + '80' : 'var(--bd)'}`, background: active ? c + '18' : 'var(--inputBg)', color: active ? c : 'var(--tx3)', fontFamily: 'Cairo', fontSize: 12, fontWeight: 600, cursor: 'pointer' })
