import React, { useCallback, useEffect, useState } from 'react'
import { Receipt, FileText, Plus, Copy, Check, Zap, Wifi, Droplets, CalendarClock } from 'lucide-react'
import { can as canPerm, canCardBtn } from '../../lib/permissions.js'
import { Modal as FKModal, ModalSection as FKSection, TextField, CurrencyField, DateField, Select as FKSelect, SuccessView } from '../../components/ui/FormKit.jsx'

const F = "'Cairo','Tajawal',sans-serif"
const GOLD = '#B07D00'
const C = { gold: GOLD, ok: '#2ecc71', warn: '#eab308', red: '#e87265', blue: '#5dade2', gray: '#95a5a6' }
const MONO = "'JetBrains Mono','Cairo',sans-serif"

const fmtAmt = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const todayIso = () => new Date().toISOString().slice(0, 10)
const FREQ = [
  { k: 'monthly', l: 'شهري', step: 1 },
  { k: 'quarterly', l: 'ربع سنوي', step: 3 },
  { k: 'semiannual', l: 'نصف سنوي', step: 6 },
  { k: 'annual', l: 'سنوي', step: 12 },
  { k: 'once', l: 'دفعة واحدة', step: 0 },
]
const freqLabel = (k) => FREQ.find(f => f.k === k)?.l || k
const DAY_OPTS = Array.from({ length: 31 }, (_, i) => ({ k: i + 1, l: String(i + 1) }))
function payState(p) {
  if (p.status === 'paid') return { l: 'مدفوع', c: C.ok }
  const t = todayIso()
  if (p.due_date < t) return { l: 'متأخر', c: C.red }
  const soon = new Date(); soon.setDate(soon.getDate() + 7)
  if (p.due_date <= soon.toISOString().slice(0, 10)) return { l: 'مستحق قريباً', c: C.gold }
  return { l: 'قادم', c: C.gray }
}

// Generic card for branch obligations of one or more types (utilities / phones).
// `typeOptions`: [{k,l}] selectable types; `accent`; `vendorLabel`/`accountLabel`/`addLabel`.
export default function BranchObligationsCard({ sb, branch, user, cardKey = 'electricity_bills', toast, title, accent = GOLD, typeOptions, vendorLabel = 'المزود', accountLabel = 'رقم الحساب', addLabel = 'إضافة', editLabel = 'تعديل', fixedMonthly = false, withAmount = false }) {
  const types = typeOptions.map(t => t.k)
  const typeMap = Object.fromEntries(typeOptions.map(t => [t.k, t.l]))
  const canEdit = canPerm(user, 'admin_offices.edit') || canPerm(user, 'admin_offices.create')
  // Per-card action gates (catalog: utility bill cards → edit/create).
  const canCardEdit = canCardBtn(user, 'admin_offices', cardKey, 'edit')
  const canCardCreate = canCardBtn(user, 'admin_offices', cardKey, 'create')

  const [items, setItems] = useState([])          // obligations
  const [paysByOb, setPaysByOb] = useState({})     // { obligationId: [payments] }
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(() => new Set())
  const [copiedId, setCopiedId] = useState(null)   // account number just copied (shows a green check)
  const [modal, setModal] = useState(null)         // obligation being added/edited (or {} for new)

  const load = useCallback(async () => {
    if (!sb || !branch?.id) return
    setLoading(true)
    const { data: obs } = await sb.from('branch_obligations').select('*')
      .eq('branch_id', branch.id).in('obligation_type', types).is('deleted_at', null).order('created_at')
    const list = obs || []
    setItems(list)
    if (list.length) {
      const { data: pays } = await sb.from('branch_obligation_payments').select('*')
        .in('obligation_id', list.map(o => o.id)).is('deleted_at', null).order('due_date')
      const map = {}
      ;(pays || []).forEach(p => { (map[p.obligation_id] ||= []).push(p) })
      setPaysByOb(map)
    } else setPaysByOb({})
    setLoading(false)
  }, [sb, branch?.id]) // eslint-disable-line
  useEffect(() => { load() }, [load])

  const toggle = (id) => setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  // ── Row helpers (type icon, due-date line, type badge, copy button) ──
  const iconFor = (t) => t?.includes('electric') ? Zap : t?.includes('internet') ? Wifi : t?.includes('water') ? Droplets : Receipt
  const dueText = (o) => o.start_date
    ? (o.frequency === 'monthly' ? `مستحقة يوم ${Number(o.start_date.slice(8, 10))} من كل شهر` : `${freqLabel(o.frequency)} · يوم ${Number(o.start_date.slice(8, 10))}`)
    : freqLabel(o.frequency)
  const badge = (o) => <span style={{ fontSize: 9.5, fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: `${accent}1a`, color: accent, border: `1px solid ${accent}33`, flexShrink: 0 }}>{typeMap[o.obligation_type] || 'بند'}</span>
  const copyBtn = (o, color = 'var(--tx4)') => o.account_no ? (
    <button onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(o.account_no); setCopiedId(o.id); setTimeout(() => setCopiedId(c => c === o.id ? null : c), 1500) }} title="نسخ"
      onMouseEnter={e => { if (copiedId !== o.id) e.currentTarget.style.color = GOLD }}
      onMouseLeave={e => { if (copiedId !== o.id) e.currentTarget.style.color = color }}
      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: copiedId === o.id ? C.ok : color, display: 'inline-flex', alignItems: 'center', padding: 2, flexShrink: 0, transition: 'color .15s' }}>
      {copiedId === o.id ? <Check size={13} strokeWidth={2.8} /> : <Copy size={13} strokeWidth={2} />}
    </button>
  ) : null

  return (
    <div className="brd-section">
      <div className="brd-section-head">
        <span className="brd-section-head-l">
          <span className="brd-section-dot" style={{ background: accent }} />
          {title}
          {items.length > 0 && <span className="brd-section-count">{items.length}</span>}
        </span>
        {canEdit && (() => {
          // One bill per office: if it already exists, the button edits it instead of adding another.
          const existing = items[0]
          // Gate by the matching catalog action for this card (edit when one exists, else create).
          if (!(existing ? canCardEdit : canCardCreate)) return null
          return (
            <button onClick={() => setModal(existing || {})}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(176,125,0,.12)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              style={{ height: 32, padding: '0 14px', borderRadius: 9, background: 'transparent', border: '1px dashed rgba(176,125,0,.5)', color: GOLD, fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              {existing ? 'تعديل' : addLabel}
              {existing
                ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>}
            </button>
          )
        })()}
      </div>

      <div className="brd-section-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--tx4)', fontSize: 12 }}>جارٍ التحميل…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 26, textAlign: 'center', color: 'var(--tx4)', fontSize: 12, border: '1px dashed rgba(255,255,255,.08)', borderRadius: 10 }}>لا توجد بنود — اضغط «{addLabel}».</div>
        ) : items.map(o => {
          const pays = paysByOb[o.id] || []
          const isOpen = expanded.has(o.id)
          const Icon = iconFor(o.obligation_type)
          const num = o.account_no || typeMap[o.obligation_type]
          return (
            <div key={o.id} style={{ borderRadius: 14, background: `linear-gradient(135deg, ${accent}14, rgba(255,255,255,.015))`, border: `1px solid ${accent}2e`, overflow: 'hidden' }}>
              <div onClick={() => toggle(o.id)} style={{ padding: '14px 16px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: `${accent}26`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={18} strokeWidth={2} /></div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--tx)', fontFamily: MONO, direction: 'ltr' }}>{num}</span>{copyBtn(o)}
                  </div>
                  {Number(o.amount) > 0 && <span style={{ fontSize: 13, fontWeight: 600, color: GOLD, fontFamily: MONO, direction: 'ltr', flexShrink: 0 }}>{fmtAmt(o.amount)}</span>}
                  {badge(o)}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--tx5)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: '.2s', flexShrink: 0 }}><polyline points="6 9 12 15 18 9" /></svg>
                </div>
                <div style={{ marginTop: 9, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: 'var(--tx3)' }}>
                  <CalendarClock size={13} strokeWidth={2} style={{ color: accent }} />
                  {dueText(o)}
                </div>
              </div>

              {isOpen && (
                <div style={{ padding: '4px 16px 14px', borderTop: '1px dashed rgba(255,255,255,.08)' }}>
                  {o.document_url && (
                    <a href={o.document_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: C.blue, textDecoration: 'none', margin: '8px 0' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                      عرض الملف
                    </a>
                  )}
                  <div style={{ margin: '8px 0 6px' }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--tx3)' }}>الدفعات ({pays.length})</span>
                  </div>
                  {pays.length === 0 ? (
                    <div style={{ padding: 12, textAlign: 'center', color: 'var(--tx5)', fontSize: 11 }}>لا توجد دفعات.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {pays.map(p => {
                        const st = payState(p)
                        return (
                          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 8, background: 'rgba(0,0,0,.16)' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.c, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)', fontFamily: MONO, direction: 'ltr' }}>{p.due_date}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: GOLD, fontFamily: MONO, direction: 'ltr' }}>{fmtAmt(p.amount)}</span>
                            <span style={{ marginInlineStart: 'auto', fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 5, background: `${st.c}1a`, color: st.c, border: `1px solid ${st.c}33` }}>{st.l}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {items.length > 0 && <div style={{ fontSize: 10.5, color: 'var(--tx5)', lineHeight: 1.6, marginTop: 2 }}>الدفعات المستحقة خلال 7 أيام تظهر تلقائياً في صفحة «سدادات خارجية».</div>}
      </div>

      {modal && (
        <ObligationModal sb={sb} branch={branch} toast={toast} obligation={modal.id ? modal : null}
          typeOptions={typeOptions} vendorLabel={vendorLabel} accountLabel={accountLabel} addLabel={addLabel} editLabel={editLabel}
          fixedMonthly={fixedMonthly} withAmount={withAmount}
          onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }} />
      )}
    </div>
  )
}

// ── Obligation add/edit modal — single-step FormKit popup ──
// Captures only the account/meter number + payment date. Amount, vendor, file and
// the editable payment schedule were intentionally dropped (one-step reminder form);
// any pre-existing values on those fields are preserved untouched when editing.
function ObligationModal({ sb, branch, toast, obligation, typeOptions, accountLabel, addLabel, editLabel, fixedMonthly = false, withAmount = false, onClose, onSaved }) {
  const multiType = typeOptions.length > 1
  const startLabel = fixedMonthly ? 'تاريخ السداد' : 'تاريخ البداية'

  const [f, setF] = useState(() => ({
    obligation_type: obligation?.obligation_type || typeOptions[0].k,
    account_no: obligation?.account_no || '',
    amount: obligation?.amount || '',
    start_date: obligation?.start_date || todayIso(),
  }))
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const save = async () => {
    if (!f.start_date) { setErr('أكمل الحقول المطلوبة'); return }
    setErr(''); setSaving(true)
    try {
      const payload = {
        branch_id: branch.id, obligation_type: f.obligation_type,
        account_no: f.account_no || null,
        start_date: f.start_date || null,
        // Amount is editable only on subscription bills (withAmount); otherwise preserve.
        amount: withAmount ? (Number(f.amount) || 0) : (obligation?.amount ?? 0),
        // Fields no longer editable in this popup — preserve existing values on edit.
        vendor: obligation?.vendor ?? null,
        frequency: obligation?.frequency || 'monthly',
        end_date: obligation?.end_date ?? null,
        notes: obligation?.notes ?? null,
        document_url: obligation?.document_url ?? null,
        document_path: obligation?.document_path ?? null,
      }
      if (obligation?.id) { const { error } = await sb.from('branch_obligations').update(payload).eq('id', obligation.id); if (error) throw error }
      else { const { error } = await sb.from('branch_obligations').insert(payload); if (error) throw error }
      setDone(true)
    } catch (e) { setErr('تعذّر الحفظ: ' + (e.message || '').slice(0, 90)) } finally { setSaving(false) }
  }

  // Monthly bills only need the recurring payment day. The Select reads/writes the
  // day-of-month onto start_date (anchored to the current month, clamped to its length).
  const payDay = f.start_date ? Number(f.start_date.slice(8, 10)) : Number(todayIso().slice(8, 10))
  const setDay = (day) => {
    const now = new Date()
    const y = now.getFullYear(), m = now.getMonth()
    const dim = new Date(y, m + 1, 0).getDate()
    const d = Math.min(Math.max(1, Number(day) || 1), dim)
    set('start_date', `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }

  const handleClose = () => done ? onSaved() : onClose()
  const filled = !!f.start_date && (!withAmount || !!f.amount)
  // When editing, keep the save button disabled until something actually changes.
  const dirty = !obligation ||
    f.obligation_type !== obligation.obligation_type ||
    (f.account_no || '') !== (obligation.account_no || '') ||
    (f.start_date || '') !== (obligation.start_date || '') ||
    (withAmount && (Number(f.amount) || 0) !== (Number(obligation.amount) || 0))
  const valid = filled && dirty

  const page1 = (
    <FKSection Icon={FileText} label="بيانات البند">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 16, rowGap: 14 }}>
        {multiType && (
          <div style={{ gridColumn: '1 / -1' }}>
            <FKSelect label="النوع" req searchable={false} value={f.obligation_type} onChange={v => set('obligation_type', v)}
              options={typeOptions} getKey={o => o.k} getLabel={o => o.l} />
          </div>
        )}
        <TextField label={accountLabel} dir="ltr" value={f.account_no} onChange={v => set('account_no', v)} />
        {withAmount && <CurrencyField label="المبلغ" req value={f.amount} onChange={v => set('amount', v)} />}
        {fixedMonthly ? (
          <FKSelect label="يوم السداد (من كل شهر)" req searchable={false} value={payDay} onChange={setDay}
            options={DAY_OPTS} getKey={o => o.k} getLabel={o => o.l} />
        ) : (
          <DateField label={startLabel} req value={f.start_date} onChange={v => set('start_date', v)} />
        )}
      </div>
    </FKSection>
  )

  return (
    <FKModal
      open onClose={handleClose} width={600} height="auto"
      title={obligation ? (editLabel || 'تعديل بند') : (addLabel || 'إضافة بند')} Icon={Receipt}
      variant={obligation ? 'edit' : 'create'}
      success={done ? <SuccessView title={obligation ? 'تم حفظ التعديل بنجاح' : 'تمت الإضافة بنجاح'} /> : undefined}
      onSubmit={save} submitting={saving}
      submitLabel={obligation ? 'تعديل' : 'إضافة'} submitIcon={obligation ? undefined : Plus}
      pages={[
        { title: 'بيانات البند', valid, error: err, content: page1 },
      ]}
    />
  )
}
