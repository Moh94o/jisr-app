import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Landmark, Plus, Search, CreditCard, Copy, Eye, EyeOff, ChevronLeft, X,
  ArrowDownToLine, ArrowUpFromLine, Banknote, Receipt, FileText, AlertCircle, User, Wallet, Check, Building2,
} from 'lucide-react'
import { BankAccountFormModal, BankCardModal } from './BranchesPage.jsx'
import { Modal as FKModal, ModalSection as FKSection, ActionButton as FKAction, Select as FKSelect, MultiSelect as FKMulti, ScrollBox, GRID, EmptyState, C as FKC } from './components/ui/FormKit.jsx'
import BackButton from './components/BackButton'
import { SkeletonCards, SkeletonList } from './components/ui/Skeleton.jsx'
import { can, cardVisible, canCardBtn } from './lib/permissions.js'

const F = "'Cairo','Tajawal',sans-serif"
const MONO_F = "'JetBrains Mono','Cairo',sans-serif"
const GOLD = '#B07D00'
const C = { gold: '#B07D00', ok: '#27a046', red: '#c0392b', blue: '#3483b4', warn: '#e6a23c', purple: '#bb8fce' }
const PALETTE = ['#3483b4', '#27a046', '#B07D00', '#bb8fce', '#e6a23c', '#e87265', '#5dade2', '#48c9b0']
const nm = v => Number(v || 0).toLocaleString('en-US')
const maskNum = v => { const s = String(v || '').replace(/\s+/g, ''); return s.length > 4 ? '•••• ' + s.slice(-4) : s }
const PURPOSE_META = {
  'الإيداعات النقدية': { Icon: Banknote, hue: '#27a046' },
  'التحويلات الواردة': { Icon: ArrowDownToLine, hue: '#3483b4' },
  'التحويلات الصادرة': { Icon: ArrowUpFromLine, hue: '#e6a23c' },
  'سداد المدفوعات': { Icon: Receipt, hue: '#bb8fce' },
}

const dashedBtn = (label, Icon, onClick, clr = GOLD, height = 32) => (
  <button type="button" onClick={onClick}
    onMouseEnter={e => { e.currentTarget.style.background = `${clr}1f` }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    style={{ height, padding: '0 14px', borderRadius: 9, background: 'transparent', border: `1px dashed ${clr}80`, color: clr, fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, transition: '.15s', whiteSpace: 'nowrap' }}>
    {label} {Icon && <Icon size={14} strokeWidth={2.2} />}
  </button>
)

const switchBtn = (on, onClick, title) => (
  <button type="button" onClick={onClick} title={title}
    style={{ width: 44, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0, position: 'relative', transition: '.2s', background: on ? `linear-gradient(180deg, ${C.ok} 0%, #1f8a3a 100%)` : 'rgba(255,255,255,.14)', boxShadow: on ? `0 0 8px ${C.ok}44, inset 0 1px 0 rgba(255,255,255,.15)` : 'inset 0 1px 2px rgba(0,0,0,.3)' }}>
    <span style={{ position: 'absolute', width: 18, height: 18, borderRadius: '50%', background: '#fff', top: 3, right: on ? 3 : 23, transition: '.2s', boxShadow: '0 1px 3px rgba(0,0,0,.4)' }} />
  </button>
)

const CopyRow = ({ label, value, onCopy }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, background: 'var(--inputBg)', border: '1px solid var(--bd)' }}>
    <button onClick={onCopy} title="نسخ" style={{ width: 28, height: 28, borderRadius: 7, background: `${GOLD}14`, border: `1px solid ${GOLD}33`, color: GOLD, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Copy size={13} /></button>
    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--tx)', direction: 'ltr', fontFamily: MONO_F, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
    <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600, flexShrink: 0 }}>{label}</span>
  </div>
)

const IRow = ({ label, value, mono, color }) => (
  <div className="brd-irow">
    <span className="brd-irow-l">{label}</span>
    <span className="brd-irow-v" style={{ direction: mono ? 'ltr' : undefined, fontFamily: mono ? MONO_F : undefined, color: color || (value ? 'var(--tx2)' : 'var(--tx5)') }}>{value || '—'}</span>
  </div>
)

const Section = ({ title, Icon, dot = GOLD, count, action, children }) => (
  <div className="brd-section">
    <div className="brd-section-head">
      <span className="brd-section-head-l"><span className="brd-section-dot" style={{ background: dot }} />{title}{count != null && <span className="brd-section-count">{count}</span>}</span>
      {action}
    </div>
    <div className="brd-section-body">{children}</div>
  </div>
)

// ─── Card chip (full visual, reveal/edit/toggle) ─────────────────────────────
const CardChip = ({ card, bankName, shown, onReveal, onEdit, onToggle, canEdit = true, canToggle = true }) => {
  const inactive = card.is_active === false
  const cardBtn = (extra = {}) => ({ width: 26, height: 26, borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ...extra })
  return (
    <div style={{ position: 'relative', width: '100%', minHeight: 168, borderRadius: 14, padding: '15px 17px', overflow: 'hidden', background: 'linear-gradient(135deg, #313131 0%, #1d1d1d 52%, #151515 100%)', border: `1px solid ${GOLD}33`, boxShadow: `0 10px 26px rgba(0,0,0,.42), inset 0 1px 0 ${GOLD}1f`, display: 'flex', flexDirection: 'column', opacity: inactive ? .5 : 1, transition: 'opacity .2s' }}>
      <div style={{ position: 'absolute', insetInlineEnd: -34, top: -34, width: 130, height: 130, borderRadius: '50%', background: `radial-gradient(circle, ${GOLD}26 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: GOLD, letterSpacing: '.4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bankName}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <button type="button" onClick={onReveal} title={shown ? 'إخفاء' : 'إظهار'} style={cardBtn({ border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.7)' })}>{shown ? <EyeOff size={13} /> : <Eye size={13} />}</button>
          {canEdit && <button type="button" onClick={onEdit} title="تعديل البطاقة" style={cardBtn({ border: `1px solid ${GOLD}40`, background: `${GOLD}1f`, color: GOLD })}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg></button>}
        </div>
      </div>
      <div style={{ position: 'relative', width: 38, height: 28, borderRadius: 6, margin: '16px 0 14px', background: 'linear-gradient(135deg,#e9d089 0%,#b5903a 50%,#8c6c25 100%)', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.25), 0 1px 2px rgba(0,0,0,.3)' }}>
        <div style={{ position: 'absolute', inset: '6px 5px', borderRadius: 3, border: '1px solid rgba(0,0,0,.22)' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: 'rgba(0,0,0,.2)' }} />
      </div>
      <div style={{ position: 'relative', fontSize: 16.5, fontWeight: 600, color: 'rgba(255,255,255,.93)', direction: 'ltr', fontFamily: MONO_F, letterSpacing: '2.5px' }}>{shown ? (card.card_number || '—') : maskNum(card.card_number)}</div>
      <div style={{ position: 'relative', marginTop: 'auto', paddingTop: 13, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 7.5, fontWeight: 600, color: 'var(--tx5)', letterSpacing: '.6px', marginBottom: 2 }}>حامل البطاقة</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.86)', direction: 'ltr', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>{card.holder_name || '—'}</div>
        </div>
        {canToggle && switchBtn(card.is_active !== false, onToggle, card.is_active !== false ? 'تعطيل البطاقة' : 'تفعيل البطاقة')}
      </div>
      {shown && (card.pin || card.cvv) && (
        <div style={{ position: 'relative', marginTop: 11, paddingTop: 9, borderTop: '1px solid rgba(255,255,255,.09)', display: 'flex', gap: 16, fontSize: 11, color: 'var(--tx3)', direction: 'ltr', fontFamily: MONO_F }}>
          {card.pin && <span>PIN: <b style={{ color: 'var(--tx2)' }}>{card.pin}</b></span>}
          {card.cvv && <span>CVV: <b style={{ color: 'var(--tx2)' }}>{card.cvv}</b></span>}
        </div>
      )}
    </div>
  )
}

// ─── Account-info field list + shared bits for the "بيانات الحساب" variants ──
const accFields = (account) => [
  account.account_number && { k: 'رقم الحساب', v: account.account_number, mono: true, copy: true },
  account.iban && { k: 'الآيبان', v: account.iban, mono: true, copy: true, wide: true },
  account.expiry_date && { k: 'تاريخ الانتهاء', v: account.expiry_date, mono: true },
  account.swift_code && { k: 'سويفت', v: account.swift_code, mono: true, copy: true },
  { k: 'البنك', v: account.bank_name },
  { k: 'اسم الحساب', v: account.account_name },
  account.account_type && { k: 'نوع الحساب', v: account.account_type },
  { k: 'حساب رئيسي', v: account.is_primary ? 'نعم' : 'لا', gold: account.is_primary },
].filter(Boolean)

// Subtle gray copy button — mirrors the users-card CopyBtn (turns green when copied).
const MiniCopy = ({ onClick }) => {
  const [done, setDone] = useState(false)
  return (
    <button type="button" title="نسخ"
      onClick={() => { onClick(); setDone(true); setTimeout(() => setDone(false), 1200) }}
      onMouseEnter={e => { if (!done) e.currentTarget.style.color = C.gold }}
      onMouseLeave={e => { if (!done) e.currentTarget.style.color = 'var(--tx4)' }}
      style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, border: '1px solid var(--bd)', background: done ? 'rgba(39,160,70,.16)' : 'var(--bd2)', color: done ? C.ok : 'var(--tx4)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'color .15s' }}>
      {done ? <Check size={12} /> : <Copy size={12} />}
    </button>
  )
}

const StatusSeg = ({ accActive, onToggle }) => (
  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
    <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600 }}>حالة الحساب</span>
    <div style={{ display: 'inline-flex', borderRadius: 10, border: '1px solid var(--bd)', overflow: 'hidden', background: 'var(--inputBg)' }}>
      {[{ v: true, l: 'نشط', clr: C.ok }, { v: false, l: 'معطّل', clr: '#95a5a6' }].map(seg => {
        const sel = accActive === seg.v
        return (<button key={String(seg.v)} type="button" onClick={() => { if (!sel) onToggle() }} style={{ padding: '8px 18px', border: 'none', cursor: sel ? 'default' : 'pointer', fontFamily: F, fontSize: 13, fontWeight: 600, background: sel ? `${seg.clr}22` : 'transparent', color: sel ? seg.clr : 'var(--tx4)', transition: '.15s', display: 'inline-flex', alignItems: 'center', gap: 6 }}>{sel && <Check size={13} strokeWidth={3} />} {seg.l}</button>)
      })}
    </div>
  </div>
)

// ── «ترويسة بنكية» — كرت بيانات الحساب (شريط علوي + قائمة نظيفة) ──
const BodyHero = ({ account, copy }) => (
  <>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 14, background: `linear-gradient(135deg, ${GOLD}24 0%, rgba(0,0,0,.22) 70%)`, border: `1px solid ${GOLD}3a`, marginBottom: 14 }}>
      <div style={{ width: 46, height: 46, borderRadius: 12, background: `${GOLD}1f`, border: `1px solid ${GOLD}45`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: GOLD, flexShrink: 0 }}><Landmark size={24} /></div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{account.bank_name}</div>
        {account.account_name && <div style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600, marginTop: 2 }}>{account.account_name}</div>}
      </div>
      {account.is_primary && <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 6, background: `${GOLD}22`, color: GOLD, flexShrink: 0 }}>رئيسي</span>}
    </div>
    {accFields(account).filter(f => !['البنك', 'اسم الحساب', 'حساب رئيسي'].includes(f.k)).map((f, i) => (
      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '9px 2px', borderBottom: '1px dashed var(--bd)' }}>
        <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600, flexShrink: 0 }}>{f.k}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {f.copy && <MiniCopy onClick={() => copy(f.v)} />}
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx2)', direction: f.mono ? 'ltr' : 'rtl', fontFamily: f.mono ? MONO_F : F, textAlign: 'end', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.v}>{f.v}</span>
        </span>
      </div>
    ))}
  </>
)

// ─── Linked-offices editor (manage which offices use this account + purpose) ──
const PURPOSES = ['الإيداعات النقدية', 'التحويلات الواردة', 'التحويلات الصادرة', 'سداد المدفوعات']
const parsePurposes = s => String(s || '').split('·').map(x => x.trim()).filter(Boolean)
const PURPOSE_SELECT_OPTS = PURPOSES.map(p => ({ k: p, l: p }))

function LinkedOfficesEditor({ sb, account, branches, toast, onClose, onChanged }) {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [newBranch, setNewBranch] = useState(null)
  const [newPurposes, setNewPurposes] = useState([])
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await sb.from('bank_account_branches').select('id, branch_id, account_purpose, branches(branch_code)').eq('bank_account_id', account.id).eq('is_active', true).is('deleted_at', null)
    setLinks(data || []); setLoading(false)
  }, [sb, account.id])
  useEffect(() => { load() }, [load])

  const linkedIds = new Set(links.map(l => l.branch_id))
  const available = (branches || []).filter(b => !linkedIds.has(b.id))

  const addLink = async () => {
    if (!newBranch) { toast?.('اختر المكتب', 'error'); return }
    setBusy(true)
    const { error } = await sb.from('bank_account_branches').insert({ bank_account_id: account.id, branch_id: newBranch, account_purpose: newPurposes.join(' · ') || null, is_active: true })
    setBusy(false)
    if (error) { toast?.(error.code === '23505' ? 'هذا المكتب مربوط بالفعل' : 'تعذّر الربط', 'error'); return }
    toast?.('تم ربط المكتب'); setNewBranch(null); setNewPurposes([]); load(); onChanged?.()
  }
  const setLinkPurpose = async (id, purposes) => {
    setLinks(ls => ls.map(l => l.id === id ? { ...l, account_purpose: purposes.join(' · ') } : l))
    await sb.from('bank_account_branches').update({ account_purpose: purposes.join(' · ') || null }).eq('id', id)
    onChanged?.()
  }
  const removeLink = async (id) => {
    await sb.from('bank_account_branches').update({ deleted_at: new Date().toISOString(), is_active: false }).eq('id', id)
    toast?.('تم إلغاء الربط'); load(); onChanged?.()
  }

  return (
    <FKModal open onClose={onClose} variant="edit" width={560}
      title="المكاتب المرتبطة" subtitle={account.bank_name} Icon={Wallet}
      footer={<FKAction variant="ghost" Icon={X} onClick={onClose}>إغلاق</FKAction>}>
      <FKSection Icon={Building2} label="روابط المكاتب" hint={loading ? '…' : `${links.length} مكتب`}>
        {loading ? (
          <div style={{ padding: 16, textAlign: 'center', color: FKC.tx4, fontSize: 12 }}>…</div>
        ) : links.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: FKC.tx4, fontSize: 12, border: '1px dashed var(--bd)', borderRadius: 10 }}>لا يوجد مكاتب مرتبطة</div>
        ) : (
          <ScrollBox maxHeight={240}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {links.map(l => (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 9, background: FKC.inputBg, boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: FKC.blue, fontFamily: MONO_F, direction: 'ltr', flexShrink: 0, minWidth: 56, textAlign: 'center' }}>{l.branches?.branch_code}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <FKMulti searchable={false} value={parsePurposes(l.account_purpose)}
                      onChange={arr => setLinkPurpose(l.id, arr)}
                      options={PURPOSE_SELECT_OPTS} getKey={o => o.k} getLabel={o => o.l} placeholder="الغرض..." />
                  </div>
                  <button onClick={() => removeLink(l.id)} title="إلغاء الربط"
                    style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(192,57,43,.12)', border: '1px solid rgba(192,57,43,.3)', color: FKC.red, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          </ScrollBox>
        )}
      </FKSection>
      <FKSection Icon={Plus} label="إضافة ربط" hint="مكتب جديد + غرضه">
        <div style={GRID}>
          <FKSelect label="المكتب" req searchable value={newBranch}
            onChange={v => setNewBranch(v)}
            options={available} getKey={o => o.id} getLabel={o => o.branch_code} placeholder="اختر المكتب..." />
          <FKMulti label="الغرض" searchable={false} value={newPurposes} onChange={setNewPurposes}
            options={PURPOSE_SELECT_OPTS} getKey={o => o.k} getLabel={o => o.l} placeholder="اختر الغرض..." />
        </div>
        <div style={{ marginTop: 6, display: 'flex', justifyContent: 'flex-end' }}>
          <FKAction Icon={Plus} disabled={busy || !newBranch} onClick={addLink}>{busy ? 'جاري الربط...' : 'ربط المكتب'}</FKAction>
        </div>
      </FKSection>
    </FKModal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// DETAIL PAGE — mirrors BranchDetailPage (header + brd-grid + sections)
// ═══════════════════════════════════════════════════════════════════════════
function BankAccountDetailPage({ sb, user, account, branches, toast, onBack, onEdit, onReload }) {
  const copy = (v) => { if (!v) return; navigator.clipboard?.writeText(String(v)) }
  const accActive = account.is_active !== false
  const tone = accActive ? C.ok : '#777'
  const bal = account._bal || {}
  const lowBal = account.min_balance_alert != null && Number(account.current_balance || 0) <= Number(account.min_balance_alert)
  const balColor = lowBal ? C.warn : C.ok

  const [links, setLinks] = useState([])
  const [cards, setCards] = useState([])
  const [atts, setAtts] = useState([])
  const [reveal, setReveal] = useState({})
  const [cardModal, setCardModal] = useState({ open: false, card: null })
  const [accBusy, setAccBusy] = useState(false)

  const loadLinks = useCallback(async () => {
    const { data } = await sb.from('bank_account_branches').select('id, account_purpose, is_active, branches(branch_code)').eq('bank_account_id', account.id).eq('is_active', true).is('deleted_at', null)
    setLinks(data || [])
  }, [sb, account.id])
  const loadCards = useCallback(async () => {
    const { data } = await sb.from('bank_cards').select('*').eq('bank_account_id', account.id).is('deleted_at', null).order('created_at', { ascending: true })
    setCards(data || [])
  }, [sb, account.id])
  const loadAtts = useCallback(async () => {
    const { data } = await sb.from('attachments').select('*').eq('entity_type', 'bank_account').eq('entity_id', account.id).is('deleted_at', null).order('created_at', { ascending: false })
    setAtts(data || [])
  }, [sb, account.id])
  useEffect(() => { loadLinks(); loadCards(); loadAtts() }, [loadLinks, loadCards, loadAtts])

  const toggleAccount = async () => {
    if (accBusy) return
    setAccBusy(true)
    const { error } = await sb.from('bank_accounts').update({ is_active: !accActive }).eq('id', account.id)
    setAccBusy(false)
    if (error) { toast?.('تعذّر تحديث حالة الحساب', 'error'); return }
    toast?.(!accActive ? 'تم تفعيل الحساب' : 'تم تعطيل الحساب'); onReload?.()
  }
  const toggleCard = async (cd) => {
    const { error } = await sb.from('bank_cards').update({ is_active: cd.is_active === false }).eq('id', cd.id)
    if (error) { toast?.('تعذّر تحديث حالة البطاقة', 'error'); return }
    loadCards()
  }
  const breakdown = [
    { l: 'تحويلات واردة', v: bal.in_payments, Icon: ArrowDownToLine, hue: C.blue, sign: '+' },
    { l: 'إيداعات نقدية', v: bal.in_cash_deposits, Icon: Banknote, hue: C.ok, sign: '+' },
    { l: 'المدفوعات', v: bal.out_fees, Icon: Receipt, hue: C.purple, sign: '−' },
  ]

  return (
    <div style={{ fontFamily: F, paddingTop: 0, color: 'var(--tx2)' }}>
      <style>{`
        .brd-section{background:var(--card-grad2);border:1px solid var(--bd);border-radius:16px;overflow:hidden}
        .brd-section-head{padding:14px 22px;border-bottom:1px solid var(--bd);display:flex;align-items:center;justify-content:space-between;gap:10px}
        .brd-section-head-l{display:inline-flex;align-items:center;gap:10px;font-size:16px;font-weight:600;color:var(--tx);letter-spacing:.2px}
        .brd-section-body{padding:14px 22px}
        .brd-section-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
        .brd-section-count{padding:2px 8px;border-radius:999px;background:var(--bd);font-size:10px;font-weight:600;color:var(--tx3)}
        .brd-grid{display:grid;grid-template-columns:1fr 340px;gap:14px;align-items:flex-start}
        @media (max-width:900px){.brd-grid{grid-template-columns:1fr}.brd-side,.brd-main{grid-column:auto !important;position:static !important}}
        .brd-irow{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:9px 0;border-bottom:1px dashed var(--bd)}
        .brd-irow:last-child{border-bottom:none}
        .brd-irow-l{font-size:12px;color:var(--tx4);font-weight:600;flex-shrink:0}
        .brd-irow-v{font-size:13px;font-weight:600;text-align:end;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
      `}</style>

      {/* Back — shared component (matches the offices detail) */}
      <div style={{ marginBottom: 16 }}>
        <BackButton onBack={onBack} />
      </div>

      {/* Header — icon + name + status + subtitle + metadata (matches BranchDetailPage) */}
      <div style={{ marginBottom: 18, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Landmark size={26} color={GOLD} strokeWidth={1.8} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 22, fontWeight: 600, color: GOLD, letterSpacing: '-.2px', lineHeight: 1 }}>{account.bank_name}</div>
          {account.is_primary && <span style={{ fontSize: 10.5, fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: `${GOLD}15`, color: GOLD }}>رئيسي</span>}
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 10, lineHeight: 1.6 }}>عرض تفاصيل الحساب البنكي وبطاقاته ومكاتبه المرتبطة ومرفقاته.</div>
      </div>

      {/* Two-column layout */}
      <div className="brd-grid">
        {/* MAIN */}
        <div className="brd-main" style={{ order: 1, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          {/* Identity — «ترويسة بنكية» */}
          {cardVisible(user, 'admin_bank_accounts', 'account_data') && (
          <Section title="بيانات الحساب" Icon={Landmark} action={canCardBtn(user, 'admin_bank_accounts', 'account_data', 'edit') ? dashedBtn('تعديل', null, () => onEdit?.(account)) : null}>
            <BodyHero account={account} copy={copy} />
          </Section>
          )}

          {/* Linked offices */}
          {cardVisible(user, 'admin_bank_accounts', 'linked_offices') && (
          <Section title="المكاتب المرتبطة" Icon={Wallet} dot={C.blue} count={links.length}>
            {links.length === 0 ? (
              <div style={{ padding: 18, textAlign: 'center', color: 'var(--tx4)', fontSize: 12, border: '1px dashed var(--bd)', borderRadius: 10 }}>غير مرتبط بأي مكتب</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {links.map(l => {
                  const meta = PURPOSE_META[l.account_purpose] || { Icon: CreditCard, hue: C.blue }
                  return (
                    <span key={l.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 9, background: `linear-gradient(135deg, ${meta.hue}1f 0%, rgba(255,255,255,.02) 70%)`, border: `1px solid ${meta.hue}40`, fontSize: 12, fontWeight: 600, color: 'var(--tx)' }}>
                      <span style={{ fontFamily: MONO_F, direction: 'ltr', color: meta.hue }}>{l.branches?.branch_code}</span>
                      {l.account_purpose && <><span style={{ width: 1, height: 12, background: 'var(--bd)' }} /><meta.Icon size={12} style={{ color: meta.hue }} /><span style={{ fontSize: 11, color: 'var(--tx2)' }}>{l.account_purpose}</span></>}
                    </span>
                  )
                })}
              </div>
            )}
          </Section>
          )}

          {/* Cards */}
          {cardVisible(user, 'admin_bank_accounts', 'bank_cards') && (
          <Section title="البطاقات البنكية" Icon={CreditCard} count={cards.length}
            action={canCardBtn(user, 'admin_bank_accounts', 'bank_cards', 'create') ? dashedBtn('بطاقة جديدة', Plus, () => setCardModal({ open: true, card: null })) : null}>
            {cards.length === 0 ? (
              <div style={{ padding: 18, textAlign: 'center', color: 'var(--tx4)', fontSize: 12, border: '1px dashed var(--bd)', borderRadius: 10 }}>لا توجد بطاقات</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
                {cards.map(card => (
                  <CardChip key={card.id} card={card} bankName={account.bank_name}
                    canEdit={canCardBtn(user, 'admin_bank_accounts', 'bank_cards', 'edit')}
                    canToggle={canCardBtn(user, 'admin_bank_accounts', 'bank_cards', 'toggle')}
                    shown={!!reveal[card.id]} onReveal={() => setReveal(p => ({ ...p, [card.id]: !p[card.id] }))}
                    onEdit={() => setCardModal({ open: true, card })} onToggle={() => toggleCard(card)} />
                ))}
              </div>
            )}
          </Section>
          )}

          {/* Attachments */}
          {cardVisible(user, 'admin_bank_accounts', 'attachments') && (
          <Section title="المرفقات" Icon={FileText} count={atts.length}>
            {atts.length === 0 ? (
              <div style={{ padding: 18, textAlign: 'center', color: 'var(--tx4)', fontSize: 12, border: '1px dashed var(--bd)', borderRadius: 10 }}>لا توجد مرفقات</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {atts.map(a => (
                  <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, background: 'var(--inputBg)', border: '1px solid var(--bd)', textDecoration: 'none', color: 'inherit' }}>
                    <span style={{ width: 30, height: 30, borderRadius: 7, background: `${GOLD}14`, border: `1px solid ${GOLD}33`, color: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FileText size={14} /></span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.file_name || 'ملف'}</div>
                      {a.notes && <div style={{ fontSize: 10.5, color: 'var(--tx4)' }}>{a.notes}</div>}
                    </span>
                    <ChevronLeft size={14} style={{ color: 'var(--tx4)' }} />
                  </a>
                ))}
              </div>
            )}
          </Section>
          )}
        </div>

        {/* SIDE */}
        <div className="brd-side" style={{ order: 2, position: 'sticky', top: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {cardVisible(user, 'admin_bank_accounts', 'overview') && (
          <Section title="نظرة عامة" Icon={Wallet} dot={C.blue} action={
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: accActive ? C.ok : 'var(--tx5)' }}>{accActive ? 'نشط' : 'معطّل'}</span>
              {canCardBtn(user, 'admin_bank_accounts', 'overview', 'toggle') && (
              <button type="button" disabled={accBusy} onClick={toggleAccount} title={accActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                style={{ width: 44, height: 24, borderRadius: 999, border: 'none', background: accActive ? `linear-gradient(180deg, ${C.ok} 0%, #1f8a3a 100%)` : 'linear-gradient(180deg, rgba(255,255,255,.18) 0%, rgba(255,255,255,.10) 100%)', cursor: accBusy ? 'not-allowed' : 'pointer', opacity: accBusy ? .55 : 1, position: 'relative', padding: 0, transition: '.2s', flexShrink: 0, boxShadow: accActive ? `0 2px 8px ${C.ok}44, inset 0 1px 0 rgba(255,255,255,.15)` : 'inset 0 1px 0 rgba(255,255,255,.08), 0 2px 4px rgba(0,0,0,.18)' }}>
                <span style={{ position: 'absolute', width: 18, height: 18, borderRadius: '50%', background: '#fff', top: 3, right: accActive ? 3 : 23, transition: '.2s', boxShadow: '0 2px 4px rgba(0,0,0,.3)' }} />
              </button>
              )}
            </div>
          }>
            <div style={{ textAlign: 'center', padding: '6px 0 14px' }}>
              <div style={{ fontSize: 36, fontWeight: 600, color: balColor, fontFamily: MONO_F, direction: 'ltr', letterSpacing: '-.5px', lineHeight: 1.05 }}>{nm(account.current_balance || 0)}</div>
              <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600, marginTop: 4 }}>الرصيد الحالي · ريال</div>
            </div>
            {lowBal && (
              <div style={{ fontSize: 11, fontWeight: 600, color: C.warn, background: `${C.warn}1f`, padding: '7px 11px', borderRadius: 8, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                <AlertCircle size={12} /> الرصيد عند الحد الأدنى أو أقل
              </div>
            )}
            <div style={{ borderTop: '1px solid var(--bd)', paddingTop: 6 }}>
              {breakdown.map(b => (
                <div key={b.l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: '1px dashed var(--bd)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--tx3)' }}>
                    <span style={{ width: 24, height: 24, borderRadius: 7, background: `${b.hue}1a`, color: b.hue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><b.Icon size={13} /></span>
                    {b.l}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: b.hue, fontFamily: MONO_F, direction: 'ltr' }}>{b.sign} {nm(b.v)}</span>
                </div>
              ))}
            </div>
          </Section>
          )}
        </div>
      </div>

      {cardModal.open && (
        <BankCardModal sb={sb} accountId={account.id} bankName={account.bank_name} card={cardModal.card} toast={toast}
          onClose={() => setCardModal({ open: false, card: null })}
          onSaved={() => { setCardModal({ open: false, card: null }); loadCards() }} />
      )}
    </div>
  )
}

// ─── Account row card (mirrors BranchCard) ───────────────────────────────────
function AccountCard({ account, onClick }) {
  const isActive = account.is_active !== false
  const lowBal = account.min_balance_alert != null && Number(account.current_balance || 0) <= Number(account.min_balance_alert)
  const tone = isActive ? (lowBal ? C.warn : C.ok) : '#777'
  const balColor = lowBal ? C.warn : C.ok
  return (
    <div onClick={onClick} className="brs-row"
      style={{ position: 'relative', cursor: 'pointer', borderRadius: 14, background: `linear-gradient(135deg, ${tone}0e 0%, var(--card-bg) 50%, var(--card-bg) 100%)`, border: '1px solid var(--bd)', boxShadow: '0 4px 14px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.03)', overflow: 'hidden', opacity: isActive ? 1 : .7 }}>
      {/* Status rail on the leading edge */}
      <span style={{ position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: 4, background: `linear-gradient(180deg, ${tone} 0%, ${tone}55 100%)` }} />
      <div style={{ padding: '20px 30px 20px 26px' }}>
        <div className="brs-row-grid" style={{ gap: 22 }}>
          {/* Code block (right) — framed masked account + status */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', gap: 10, padding: '13px 18px', borderRadius: 12, background: 'rgba(176,125,0,.06)', border: '1px solid rgba(176,125,0,.18)', minWidth: 104 }}>
            <span style={{ fontSize: 23, fontWeight: 600, color: GOLD, fontFamily: MONO_F, letterSpacing: '-.5px', direction: 'ltr', lineHeight: 1 }}>{maskNum(account.account_number || account.iban)}</span>
            <span style={{ fontSize: 11, color: tone, fontWeight: 600, letterSpacing: '.3px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: tone, boxShadow: `0 0 6px ${tone}` }} />
              {isActive ? 'نشط' : 'معطّل'}
            </span>
          </div>

          <div className="brs-row-vdiv" style={{ minHeight: 56 }} />

          {/* Metadata */}
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="brs-meta-row" style={{ flexWrap: 'wrap', fontSize: 15 }}>
              <Landmark size={16} color={GOLD} strokeWidth={2.2} />
              <span style={{ color: 'var(--tx2)', fontWeight: 600 }}>{account.bank_name}</span>
              {account.is_primary && <span style={{ fontSize: 9.5, fontWeight: 600, padding: '1px 6px', borderRadius: 5, background: `${GOLD}15`, color: GOLD }}>رئيسي</span>}
            </div>
            <div className="brs-meta-row" style={{ fontSize: 11.5, gap: 12, flexWrap: 'wrap' }}>
              {account.account_name && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <User size={12} color="var(--tx4)" /><span style={{ color: 'var(--tx2)' }}>{account.account_name}</span>
                </span>
              )}
              <span style={{ color: 'var(--tx4)', display: 'inline-flex', alignItems: 'center', gap: 5 }}><CreditCard size={11} /> {account._cardCount || 0} بطاقة</span>
            </div>
            <div className="brs-meta-row" style={{ fontSize: 11.5, gap: 12, flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--tx4)', display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Building2 size={11} />
                <span style={{ direction: 'ltr', fontFamily: MONO_F, color: (account._officeCodes || []).length ? 'var(--tx2)' : 'var(--tx4)' }}>
                  {(account._officeCodes || []).length ? account._officeCodes.join('  ·  ') : 'بدون مكاتب'}
                </span>
              </span>
            </div>
          </div>

          {/* Left (balance stat) */}
          <div className="ba-bal-box" style={{ padding: '11px 20px', alignSelf: 'stretch', borderColor: `${balColor}40`, background: `linear-gradient(160deg, ${balColor}1a 0%, ${balColor}06 100%)` }}>
            <TrendingIcon color={balColor} size={20} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1 }}>
              <span style={{ fontSize: 27, fontWeight: 600, color: balColor, fontFamily: MONO_F, fontVariantNumeric: 'tabular-nums', letterSpacing: '-.5px', direction: 'ltr' }}>{nm(account.current_balance || 0)}</span>
              <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600, letterSpacing: '.2px', marginTop: 3, alignSelf: 'flex-end' }}>ريال</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
const TrendingIcon = ({ color, size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M16 7h6v6" /><path d="m22 7-8.5 8.5-5-5L2 17" /></svg>

// ─── Hero stat card (mirrors offices hero) ───────────────────────────────────
const HeroStat = ({ title, value, color, foot, valueSize = 42 }) => (
  <div style={{ position: 'relative', padding: '18px 22px', borderRadius: 16, background: 'var(--card-grad2)', border: '1px solid var(--bd)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden', minHeight: 150 }}>
    <div style={{ position: 'absolute', insetInlineStart: -60, top: -60, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -6 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}aa` }} />
      <span style={{ fontSize: 24, color: 'var(--tx)', fontWeight: 600, letterSpacing: '.2px' }}>{title}</span>
    </div>
    <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 7, direction: 'ltr' }}>
      <span style={{ fontSize: valueSize, fontWeight: 600, color, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid var(--bd)' }}>
      <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 600 }}>{foot}</span>
    </div>
  </div>
)

// ═══════════════════════════════════════════════════════════════════════════
// PAGE — list + detail (mirrors BranchesPage)
// ═══════════════════════════════════════════════════════════════════════════
export default function BankAccountsPage({ sb, user, toast, lang }) {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [branches, setBranches] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [searchQ, setSearchQ] = useState('')
  const [bankFilter, setBankFilter] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [advOpen, setAdvOpen] = useState(false)

  const [bankPop, setBankPop] = useState(false)
  const [bankForm, setBankForm] = useState({})
  const [bankSaving, setBankSaving] = useState(false)
  const [bankSuccess, setBankSuccess] = useState(false)

  const reload = useCallback(async () => {
    if (!sb) return
    const { data } = await sb.from('bank_accounts').select('*').is('deleted_at', null).order('bank_name', { ascending: true })
    let list = data || []
    const ids = list.map(a => a.id).filter(Boolean)
    if (ids.length) {
      const [balsR, linksR, cardsR] = await Promise.all([
        sb.from('v_bank_account_balances').select('*').in('bank_account_id', ids),
        sb.from('bank_account_branches').select('bank_account_id, branches(branch_code)').eq('is_active', true).is('deleted_at', null).in('bank_account_id', ids),
        sb.from('bank_cards').select('bank_account_id').is('deleted_at', null).in('bank_account_id', ids),
      ])
      const balMap = Object.fromEntries((balsR.data || []).map(r => [r.bank_account_id, r]))
      const officeCodes = {}; (linksR.data || []).forEach(r => { (officeCodes[r.bank_account_id] = officeCodes[r.bank_account_id] || []).push(r.branches?.branch_code) })
      const cardCount = {}; (cardsR.data || []).forEach(r => { cardCount[r.bank_account_id] = (cardCount[r.bank_account_id] || 0) + 1 })
      list = list.map(a => ({ ...a, current_balance: balMap[a.id] ? balMap[a.id].balance : a.current_balance, _bal: balMap[a.id] || null, _officeCodes: (officeCodes[a.id] || []).filter(Boolean), _officeCount: (officeCodes[a.id] || []).filter(Boolean).length, _cardCount: cardCount[a.id] || 0 }))
    }
    setAccounts(list)
    setLoading(false)
  }, [sb])
  useEffect(() => { reload() }, [reload])

  useEffect(() => {
    if (!sb) return
    sb.from('branches').select('id, branch_code').is('deleted_at', null).order('branch_code').then(({ data }) => setBranches(data || []))
  }, [sb])

  const totalBalance = useMemo(() => accounts.reduce((s, a) => s + Number(a.current_balance || 0), 0), [accounts])
  const activeCount = useMemo(() => accounts.filter(a => a.is_active !== false).length, [accounts])
  const totalCards = useMemo(() => accounts.reduce((s, a) => s + (a._cardCount || 0), 0), [accounts])
  const selected = useMemo(() => accounts.find(a => a.id === selectedId) || null, [accounts, selectedId])
  const bankOptions = useMemo(() => [...new Set(accounts.map(a => a.bank_name).filter(Boolean))], [accounts])
  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase()
    return accounts.filter(a => {
      if (bankFilter && a.bank_name !== bankFilter) return false
      if (branchFilter && !(a._officeCodes || []).includes(branchFilter)) return false
      if (statusFilter === 'active' && a.is_active === false) return false
      if (statusFilter === 'inactive' && a.is_active !== false) return false
      if (q && !`${a.bank_name || ''} ${a.account_name || ''} ${a.account_number || ''} ${a.iban || ''}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [accounts, searchQ, bankFilter, branchFilter, statusFilter])

  // Group by bank name (mirrors offices grouping by city)
  const bankGroups = useMemo(() => {
    const map = new Map()
    filtered.forEach(a => {
      const k = a.bank_name || 'بدون بنك'
      if (!map.has(k)) map.set(k, { id: k, name: k, items: [], active: 0 })
      const g = map.get(k); g.items.push(a); if (a.is_active !== false) g.active++
    })
    return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length)
  }, [filtered])

  // Distribution by bank (for donut). Strip a leading "مصرف"/"بنك"/"البنك" so the
  // legend reads "الإنماء" / "الأهلي" instead of "مصرف الإنماء" / "البنك الأهلي".
  const shortBank = (n) => (n || '').replace(/^\s*(?:مصرف|البنك|بنك)\s+/, '').trim() || (n || '')
  const byBank = useMemo(() => bankGroups.map(g => ({ id: g.id, name: g.name, cnt: g.items.length })), [bankGroups])
  const totalCnt = accounts.length || 1

  const openAdd = () => { setBankForm({ mode: 'new', is_primary: false, current_balance: 0 }); setBankPop(true) }
  const openEdit = async (account) => {
    setBankForm({ mode: 'edit', _edit_account_id: account.id, bank_name: account.bank_name, bank_name_en: account.bank_name_en || '', account_name: account.account_name, account_name_en: account.account_name_en || '', account_number: account.account_number, iban: account.iban, swift_code: account.swift_code, is_primary: !!account.is_primary, expiry_date: account.expiry_date || '', sbc_facility_id: account.sbc_facility_id || null, _branch_ids: [], account_purpose: '' })
    setBankPop(true)
    // Load the account's current office links + their purposes so the edit modal
    // can manage them inline (it replaces the old standalone linked-offices editor).
    const { data } = await sb.from('bank_account_branches')
      .select('branch_id, account_purpose').eq('bank_account_id', account.id).eq('is_active', true).is('deleted_at', null)
    const ids = (data || []).map(r => r.branch_id)
    const purposes = [...new Set((data || []).flatMap(r => (r.account_purpose || '').split('·').map(s => s.trim()).filter(Boolean)))]
    const purposeStr = purposes.join(' · ')
    setBankForm(p => (p._edit_account_id === account.id ? { ...p, _branch_ids: ids, account_purpose: purposeStr,
      // Snapshot before any change so the success card can show only what changed.
      _orig: { bank_name: account.bank_name || '', bank_name_en: account.bank_name_en || '', account_name: account.account_name || '', account_name_en: account.account_name_en || '', account_number: account.account_number || '', iban: account.iban || '', expiry_date: account.expiry_date || '', sbc_facility_id: account.sbc_facility_id || null, branch_ids: ids, account_purpose: purposeStr } } : p))
  }

  const saveBankAccount = async () => {
    setBankSaving(true)
    const uploadIban = async (accountId) => {
      const file = bankForm._ibanFile
      if (!file || !accountId) return
      const safe = (file.name || 'file').replace(/[^\w.\-]+/g, '_')
      const path = `bank_accounts/${accountId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safe}`
      const { error: upErr } = await sb.storage.from('attachments').upload(path, file, { cacheControl: '3600', upsert: false })
      if (upErr) throw upErr
      const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
      const { error: insErr } = await sb.from('attachments').insert({ entity_type: 'bank_account', entity_id: accountId, file_name: file.name, file_url: pub?.publicUrl || path, storage_path: path, mime_type: file.type || null, size_bytes: file.size || null, notes: 'ملف الآيبان' })
      if (insErr) throw insErr
    }
    try {
      if (bankForm.mode === 'edit') {
        const accId = bankForm._edit_account_id
        const upd = { bank_name: bankForm.bank_name || null, bank_name_en: bankForm.bank_name_en || null, account_name: bankForm.account_name || null, account_name_en: bankForm.account_name_en || null, account_number: bankForm.account_number || null, iban: bankForm.iban || null, swift_code: bankForm.swift_code || null, is_primary: !!bankForm.is_primary, expiry_date: bankForm.expiry_date || null, sbc_facility_id: bankForm.sbc_facility_id || null }
        const { error } = await sb.from('bank_accounts').update(upd).eq('id', accId)
        if (error) throw error
        await uploadIban(accId)
        // Sync the office links (junction) — the edit modal now manages them.
        const newIds = Array.isArray(bankForm._branch_ids) ? [...new Set(bankForm._branch_ids.filter(Boolean))] : []
        const purpose = bankForm.account_purpose || null
        const { data: allRows } = await sb.from('bank_account_branches').select('id, branch_id, is_active, deleted_at').eq('bank_account_id', accId)
        const rows = allRows || []
        const activeRows = rows.filter(r => r.is_active && !r.deleted_at)
        const toRemove = activeRows.filter(r => !newIds.includes(r.branch_id))
        if (toRemove.length) {
          const { error: rmErr } = await sb.from('bank_account_branches').update({ deleted_at: new Date().toISOString(), is_active: false }).in('id', toRemove.map(r => r.id))
          if (rmErr) throw rmErr
        }
        for (const bid of newIds) {
          const existing = rows.find(r => r.branch_id === bid)
          if (existing) {
            const { error: upErr } = await sb.from('bank_account_branches').update({ account_purpose: purpose, is_active: true, deleted_at: null }).eq('id', existing.id)
            if (upErr) throw upErr
          } else {
            const { error: insErr } = await sb.from('bank_account_branches').insert({ bank_account_id: accId, branch_id: bid, account_purpose: purpose, is_active: true })
            if (insErr) throw insErr
          }
        }
        setBankSuccess(true)
        reload() // refresh behind the unified success view
        setTimeout(() => { setBankSuccess(false); setBankPop(false) }, 1400)
        return null
      }
      const branchIds = Array.isArray(bankForm._branch_ids) ? bankForm._branch_ids.filter(Boolean) : []
      if (branchIds.length === 0) return 'اختر المكتب المرتبط'
      let bankAccountId = bankForm._link_account_id
      if (!bankAccountId) {
        const d = { ...bankForm, branch_id: branchIds[0] }
        delete d.mode; delete d._link_account_id; delete d._link_account; delete d.account_purpose; delete d._ibanFile; delete d._branch_ids; delete d._sbc_facility; delete d._orig
        Object.keys(d).forEach(k => { if (d[k] === '') d[k] = null })
        const { data, error } = await sb.from('bank_accounts').insert(d).select('id').single()
        if (error) throw error
        bankAccountId = data.id
      }
      // One junction row per linked office (the account can serve several offices).
      const { error: jErr } = await sb.from('bank_account_branches').insert(
        branchIds.map(bid => ({ bank_account_id: bankAccountId, branch_id: bid, account_purpose: bankForm.account_purpose || null }))
      )
      if (jErr) throw jErr
      await uploadIban(bankAccountId)
      setBankSuccess(true)
      reload() // refresh behind the unified success view
      setTimeout(() => { setBankSuccess(false); setBankPop(false) }, 1400)
      return null
    } catch (e) {
      const msg = (e.message || '').toLowerCase()
      if (e.code === '23505' || msg.includes('duplicate') || msg.includes('unique')) return 'هذا الحساب مربوط بالفعل بهذا المكتب'
      if (e.code === '42501' || msg.includes('row-level security')) return 'لا تملك صلاحية إضافة حساب بنكي'
      if (e.code === '23502' || msg.includes('null value')) return 'تنقص بيانات مطلوبة — تأكد من تعبئة كل الحقول الأساسية'
      return 'تعذّر حفظ الحساب: ' + (e.message || '').slice(0, 80)
    } finally { setBankSaving(false) }
  }

  const modal = (
    <BankAccountFormModal sb={sb} open={bankPop} onClose={() => { setBankPop(false); setBankSuccess(false) }}
      form={bankForm} setForm={setBankForm} saving={bankSaving} success={bankSuccess}
      onSave={saveBankAccount} branches={branches} />
  )

  // DETAIL
  if (selected) {
    return (
      <div style={{ fontFamily: F, paddingTop: 0, color: 'var(--tx2)' }}>
        <BankAccountDetailPage sb={sb} user={user} account={selected} branches={branches} toast={toast}
          onBack={() => setSelectedId(null)} onEdit={openEdit} onReload={reload} />
        {modal}
      </div>
    )
  }

  // LIST
  const initialLoading = loading && accounts.length === 0
  return (
    <div style={{ fontFamily: F, paddingTop: 0, color: 'var(--tx2)' }}>
      <style>{`
        .brs-row{transition:all .15s}
        .brs-row:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(0,0,0,.34) !important;border-color:rgba(176,125,0,.22) !important}
        .brs-hero-grid{display:grid;grid-template-columns:2.2fr 1fr 1.5fr;gap:14px;margin-bottom:24px}
        @media (max-width: 1100px){.brs-hero-grid{grid-template-columns:1fr 1fr}.brs-hero-grid > :nth-child(3){grid-column:1/-1}}
        @media (max-width: 720px){.brs-hero-grid{grid-template-columns:1fr}}
        .brs-row-grid{display:grid;grid-template-columns:auto 1px 1fr auto;gap:18px;align-items:center}
        @media (max-width: 720px){.brs-row-grid{grid-template-columns:1fr;gap:12px}.brs-row-vdiv{display:none}}
        .brs-row-vdiv{width:1px;align-self:stretch;background:linear-gradient(180deg,transparent 0%,var(--bd) 50%,transparent 100%);min-height:46px}
        .ba-bal-box{border:1px solid;border-radius:12px;padding:8px 16px;display:flex;align-items:center;gap:10px;transition:.2s}
        .brs-code-block{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:96px}
        .brs-meta-row{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:var(--tx3);font-weight:600}
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--tx)', letterSpacing: '-.3px', lineHeight: 1.2 }}>الحسابات البنكية</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>إدارة الحسابات البنكية والبطاقات عبر جميع المكاتب ومتابعة أرصدتها</div>
          </div>
          {can(user, 'admin_bank_accounts.create') && (
          <button onClick={openAdd} className="btn-primary-modal"
            style={{ height: 42, padding: '0 18px', borderRadius: 11, fontFamily: F, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', flexShrink: 0, transition: 'background .15s ease, border-color .15s ease, box-shadow .15s ease' }}>
            حساب بنكي جديد <Plus size={16} strokeWidth={2.2} />
          </button>
          )}
        </div>
      </div>

      {initialLoading ? (<><SkeletonCards count={3} cols="2.2fr 1fr 1.5fr" minHeight={150} /><SkeletonList rows={6} /></>) : (<>

      {/* Hero stats */}
      <div className="brs-hero-grid">
        <HeroStat title="الحسابات" value={activeCount} color={C.ok}
          foot={activeCount === accounts.length ? 'جميع الحسابات نشطة' : `${accounts.length - activeCount} معطّل`} />
        <HeroStat title="الرصيد" value={nm(Math.round(totalBalance))} color={GOLD} valueSize={32}
          foot={`${nm(totalCards)} بطاقة`} />

        {/* Distribution by bank — donut (mirrors offices city distribution) */}
        <div style={{ borderRadius: 16, background: 'var(--card-grad2)', border: '1px solid var(--bd)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 150 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>التوزّع حسب البنك</span>
            <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}><span style={{ color: GOLD, fontWeight: 600, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{nm(accounts.length)}</span> حساب</span>
          </div>
          {accounts.length > 0 && (() => {
            const R = 32, CIRC = 2 * Math.PI * R
            let offset = 0
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                <svg width="86" height="86" viewBox="-43 -43 86 86" style={{ flexShrink: 0, transform: 'rotate(-90deg)' }}>
                  <circle r={R} fill="none" stroke="var(--bd2)" strokeWidth="11" />
                  {byBank.map((r, i) => {
                    const c = PALETTE[i % PALETTE.length]
                    const dash = (r.cnt / totalCnt) * CIRC
                    const seg = <circle key={r.id} r={R} fill="none" stroke={c} strokeWidth="11" strokeDasharray={`${dash} ${CIRC - dash}`} strokeDashoffset={-offset} style={{ transition: 'stroke-dasharray .3s' }}><title>{`${r.name}: ${r.cnt}`}</title></circle>
                    offset += dash
                    return seg
                  })}
                  <text x="0" y="0" textAnchor="middle" dominantBaseline="central" transform="rotate(90)" style={{ fill: 'var(--tx)', fontSize: 16, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{nm(accounts.length)}</text>
                </svg>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '5px 24px', minWidth: 0 }}>
                  {byBank.slice(0, 6).map((r, i) => {
                    const c = PALETTE[i % PALETTE.length]
                    return (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, minWidth: 0 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, flexShrink: 0 }} />
                        <span style={{ color: 'var(--tx2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortBank(r.name)}</span>
                        <span style={{ color: c, fontVariantNumeric: 'tabular-nums', direction: 'ltr', flexShrink: 0, fontWeight: 600 }}>{nm(r.cnt)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Search + filter (InvoicePage style) */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px', position: 'relative' }}>
          <Search size={14} color="var(--tx4)" style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="ابحث بالبنك، اسم الحساب، رقم الحساب، الآيبان…"
            style={{ width: '100%', height: 44, padding: '0 14px 0 38px', borderRadius: 12, background: 'var(--card-grad2)', border: '1px solid var(--bd)', color: 'var(--tx)', fontSize: 13, fontFamily: F, boxSizing: 'border-box' }} />
        </div>
        {(() => {
          const hasFilters = !!(bankFilter || branchFilter || statusFilter)
          const active = advOpen || hasFilters
          const clearAll = () => { setBankFilter(''); setBranchFilter(''); setStatusFilter('') }
          return (
            <button onClick={() => setAdvOpen(o => !o)} style={{ height: 44, padding: '0 16px', borderRadius: 12, flexShrink: 0, background: active ? 'rgba(176,125,0,.12)' : 'var(--card-grad2)', border: active ? '1px solid rgba(176,125,0,.4)' : '1px solid var(--bd)', color: active ? FKC.gold : 'var(--tx2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: F, display: 'flex', alignItems: 'center', gap: 8, boxSizing: 'border-box', transition: '.2s' }}>
              تصفية
              {hasFilters ? (
                <span role="button" tabIndex={0} title="مسح الفلاتر"
                  onClick={e => { e.stopPropagation(); clearAll() }}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); clearAll() } }}
                  onMouseEnter={e => { e.currentTarget.style.background = FKC.red; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = FKC.gold; e.currentTarget.style.color = '#000' }}
                  style={{ background: FKC.gold, color: '#000', width: 18, height: 18, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '.18s' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </span>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="14" y2="6" /><line x1="18" y1="6" x2="20" y2="6" /><circle cx="16" cy="6" r="2" /><line x1="4" y1="12" x2="8" y2="12" /><line x1="12" y1="12" x2="20" y2="12" /><circle cx="10" cy="12" r="2" /><line x1="4" y1="18" x2="16" y2="18" /><line x1="20" y1="18" x2="20" y2="18" /><circle cx="18" cy="18" r="2" /></svg>
              )}
            </button>
          )
        })()}
      </div>

      {advOpen && (() => {
        const fLbl = { fontSize: 12, fontWeight: 500, color: 'var(--tx3)', paddingInlineStart: 2, marginBottom: 7 }
        return (
          <div style={{ marginBottom: 22, padding: '16px 18px', background: 'var(--card-grad2)', border: '1px solid var(--bd)', borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.04)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
              <div>
                <div style={fLbl}>البنك</div>
                <FKSelect searchable options={[{ v: '', l: 'كل البنوك' }, ...bankOptions.map(b => ({ v: b, l: b }))]} getKey={o => o.v} getLabel={o => o.l}
                  value={bankFilter || null} onChange={v => setBankFilter(v || '')} placeholder="كل البنوك" />
              </div>
              <div>
                <div style={fLbl}>المكتب</div>
                <FKSelect searchable options={[{ v: '', l: 'كل المكاتب' }, ...(branches || []).map(b => ({ v: b.branch_code, l: b.branch_code }))]} getKey={o => o.v} getLabel={o => o.l}
                  value={branchFilter || null} onChange={v => setBranchFilter(v || '')} placeholder="كل المكاتب" />
              </div>
              <div>
                <div style={fLbl}>الحالة</div>
                <FKSelect options={[{ v: '', l: 'الكل' }, { v: 'active', l: 'نشط' }, { v: 'inactive', l: 'معطّل' }]} getKey={o => o.v} getLabel={o => o.l}
                  value={statusFilter || null} onChange={v => setStatusFilter(v || '')} placeholder="الكل" />
              </div>
            </div>
          </div>
        )
      })()}

      {/* List — grouped by bank */}
      {!loading && filtered.length === 0 && (
        <EmptyState
          icon={accounts.length === 0
            ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B07D00" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="22" y2="22" /><line x1="6" x2="6" y1="18" y2="11" /><line x1="10" x2="10" y1="18" y2="11" /><line x1="14" x2="14" y1="18" y2="11" /><line x1="18" x2="18" y1="18" y2="11" /><polygon points="12 2 20 7 4 7" /></svg>
            : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B07D00" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>}
          title={accounts.length === 0 ? 'لا توجد حسابات بنكية بعد' : 'لا توجد نتائج مطابقة'}
          desc={accounts.length === 0 ? 'أضِف أول حساب بنكي لإدارة الأرصدة والبطاقات' : 'جرّب تعديل كلمة البحث'} />
      )}
      {!loading && bankGroups.map((g, gi) => {
        const c = PALETTE[gi % PALETTE.length]
        return (
          <div key={g.id} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--bd)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, transform: 'translateY(-2px)' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx2)' }}>{g.name}</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600 }}>{g.active}/{g.items.length} نشط</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {g.items.map(a => <AccountCard key={a.id} account={a} onClick={() => setSelectedId(a.id)} />)}
            </div>
          </div>
        )
      })}

      </>)}

      {modal}
    </div>
  )
}
