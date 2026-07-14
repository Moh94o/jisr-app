// صفحة سندات القبض لمكتب JUB1 — إدخال يدوي متسامح لسندات القبض القديمة (≈سنتين، ≈4000 صورة)
// مرحلة وسيطة (staging): يُدخل الموظف كل سند كصورة + بيانات كاملة في جدولَي
// jub1_receipts + jub1_receipt_payments، مع كشف أخطاء مباشر (مجموع ≠ إجمالي، سند مكرّر…)،
// ثم نراجعها سوياً ونحوّلها لاحقاً إلى فواتير حقيقية مطابقة لباقي المكاتب.
// كل الحقول اختيارية — يُسمح بالحفظ الناقص والتعديل لاحقاً حتى تكتمل الصورة.
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Modal as FKModal, ModalSection, GRID, TextField, NumberField, CurrencyField,
  DateField, Select, FileField, ActionButton, SuccessView, EmptyState, CalendarPopup,
  Dropdown as FKDropdown,
} from './components/ui/FormKit.jsx'
import {
  Plus, Trash2, X, AlertTriangle, Search, Pencil, FileText, Check, Receipt,
  Image as ImageIcon, Filter, RefreshCw, CheckCircle2, CircleDashed, RotateCw, ExternalLink,
  ChevronDown, Calendar, User, Tag, Coins, Wallet,
} from 'lucide-react'
import { ALL_SERVICES, SVC_CODE_MAP } from './ServiceRequestPage.jsx'
import { can, isGM as isGmUser, cardVisible, canCardBtn, fieldVisible, fieldEditable, modalAllowed, stageVisible } from './lib/permissions.js'
import { swrGet, swrSet, useLiveRefresh } from './lib/liveData.js'
import BackButton from './components/BackButton'

const TAB = 'jub1_receipts'

const JUB1_ENTITY = 'jub1_receipt'

// مرادفات ما يُكتب على السند بخط اليد → كود الخدمة الرسمي (يُستخدم كخيار احتياطي بعد فشل المطابقة بالاسم):
//  • «تنازل» = نقل كفالة.
//  • «visa/تأشيرة/اصدار» = تأشيرة بإقامة 12 شهر افتراضياً ما لم تُذكر مدة أخرى (3 شهور / 6 أشهر).
//    و«اصدار» تعني تأشيرة 12 شهر وتدل فقط على مرحلة دفعة.
function svcSynonymCode(txt) {
  const t = String(txt || '').trim()
  if (!t) return null
  if (t.includes('تنازل')) return 'transfer'
  const isVisa = /visa|فيزا|تأشير|تاشير|اصدار|إصدار/i.test(t)
  if (isVisa) {
    const hasMonth = /شهر|شهور|اشهر|أشهر/.test(t)
    if (hasMonth && /(^|[^0-9])3([^0-9]|$)|ثلاث/.test(t)) return 'work_visa_temporary'
    if (hasMonth && /(^|[^0-9])6([^0-9]|$)|ست/.test(t)) return 'work_visa_6m'
    if (hasMonth && /(^|[^0-9])9([^0-9]|$)|تسع/.test(t)) return 'work_visa_9m'
    return 'work_visa_permanent'   // الافتراضي: تأشيرة بإقامة 12 شهر
  }
  return null
}

// ترتيب أكواد الخدمات كما تظهر في نافذة الفاتورة المنبثقة (نفس المجموعة والترتيب: رئيسية ثم أخرى).
// المصدر الوحيد للحقيقة: ALL_SERVICES + SVC_CODE_MAP من نافذة طلب الخدمة.
const POPUP_SVC_ORDER = new Map(ALL_SERVICES.map((s, i) => [SVC_CODE_MAP[s.id] || s.id, i]))
// اقصر قائمة «نوع الخدمة» على خدمات نافذة الفاتورة فقط، مرتّبة بنفس ترتيبها.
// keepId: إن كانت القيمة المختارة حالياً خارج المجموعة (سند قديم بخدمة غير معروضة) نُبقيها كي لا تختفي.
function popupServices(services, keepId) {
  const list = (services || [])
    .filter(s => POPUP_SVC_ORDER.has(s.code))
    .sort((a, b) => POPUP_SVC_ORDER.get(a.code) - POPUP_SVC_ORDER.get(b.code))
  if (keepId && !list.some(s => s.id === keepId)) {
    const cur = (services || []).find(s => s.id === keepId)
    if (cur) list.push(cur)
  }
  return list
}
const num = v => { const n = parseFloat(String(v ?? '').replace(/,/g, '')); return isNaN(n) ? 0 : n }
const fmt = v => { const n = num(v); return n.toLocaleString('en-US', { maximumFractionDigits: 0 }) }
const fmt0 = v => { const n = num(v); return n.toLocaleString('en-US', { maximumFractionDigits: 0 }) }
const rid = () => Math.random().toString(36).slice(2, 10)
// المقبوض = مبلغ السند الأساسي + السندات/المدفوعات الإضافية
const paidOf = (e) => num(e.primary_receipt_amount) + (e.payments || []).reduce((s, p) => s + num(p.amount), 0)
const dt = (v) => (v ? String(v).slice(0, 10) : '—')

// حالات المراجعة — مرحلتان: مسودة → (مكتمل | يحتاج مراجعة) → مدقق
const STATUS = {
  draft:        { l: 'مسودة',        e: 'Draft',        c: '#8a7a55', Ico: CircleDashed },
  complete:     { l: 'مكتمل',        e: 'Complete',     c: '#2563eb', Ico: CheckCircle2 },
  needs_review: { l: 'يحتاج مراجعة', e: 'Needs review', c: '#c0392b', Ico: AlertTriangle },
  reviewed:     { l: 'مدقق',         e: 'Verified',     c: '#1f7a45', Ico: Check },
  flagged:      { l: 'عليه ملاحظة',  e: 'Flagged',      c: '#c0392b', Ico: AlertTriangle },
  converted:    { l: 'محوّل',        e: 'Converted',    c: '#7c3aed', Ico: RefreshCw },
  cancelled:    { l: 'ملغي',         e: 'Cancelled',    c: '#6b7280', Ico: X },
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
  const [statsData, setStatsData] = useState(() => swrGet('jub1_stats') || null)  // إحصاءات خادمية (RPC) — كروت فورية
  const [visibleCount, setVisibleCount] = useState(150)  // عرض تدريجي: لا نرسم آلاف الصفوف دفعة واحدة
  const sentinelRef = useRef(null)
  const [q, setQ] = useState('')
  // تصفية بنمط صفحة الفواتير — لوحة قابلة للطي + اختيارات متعددة
  const [advOpen, setAdvOpen] = useState(false)
  const [statusSel, setStatusSel] = useState([])     // review_status[] (فارغ = الكل)
  const [svcFilter, setSvcFilter] = useState([])     // service_code[]
  const [payFilter, setPayFilter] = useState([])     // 'paid'|'partial'|'unpaid'
  const [agentFilter, setAgentFilter] = useState('') // اسم الوسيط
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sortMode, setSortMode] = useState('created_desc')
  const [onlyFlagged, setOnlyFlagged] = useState(false)
  const [editing, setEditing] = useState(null)       // كائن نموذج التعديل المفتوح أو null
  const [creating, setCreating] = useState(false)     // نافذة «سند جديد» = رفع صور + قراءة آلية + حفظ مسودة

  const isGM = user?.role?.name_ar === 'المدير العام'

  // ── تحميل المراجع + القيود (كاش جلسة: تُرسم فوراً ثم تُحدَّث صامتاً) ────────
  const applyRefs = useCallback((refs) => {
    setBranch(refs.branch || null)
    setServices(refs.services || [])
    setMethods(refs.methods || [])
    setAgents(refs.agents || [])
  }, [])
  const loadRefs = useCallback(async () => {
    const [{ data: br }, { data: cats }, { data: ag }] = await Promise.all([
      sb.from('branches').select('id,branch_code,name_ar').eq('branch_code', 'JUB1').maybeSingle(),
      sb.from('lookup_categories').select('id,name_ar').in('name_ar', ['نوع الخدمة', 'طريقة الدفع']),
      sb.from('agents').select('id,name_ar').is('deleted_at', null).order('name_ar').limit(1000),
    ])
    const svcCat = (cats || []).find(c => c.name_ar === 'نوع الخدمة')?.id
    const payCat = (cats || []).find(c => c.name_ar === 'طريقة الدفع')?.id
    const [svcRes, payRes] = await Promise.all([
      svcCat ? sb.from('lookup_items').select('id,value_ar,code,is_active,sort_order').eq('category_id', svcCat).order('sort_order') : Promise.resolve({ data: [] }),
      payCat ? sb.from('lookup_items').select('id,value_ar,code,sort_order').eq('category_id', payCat).order('sort_order') : Promise.resolve({ data: [] }),
    ])
    const refs = {
      branch: br || null,
      services: (svcRes.data || []).filter(x => x.is_active),
      methods: payRes.data || [],
      agents: (ag || []).map(a => a.name_ar).filter(Boolean),
    }
    swrSet('jub1_refs', refs)
    applyRefs(refs)
  }, [sb, applyRefs])

  const loadEntries = useCallback(async () => {
    // كاش الجلسة: لا سبينر إن كانت لدينا نتيجة سابقة — تُعرض فوراً ويحدّثها الجلب الصامت أدناه.
    if (!swrGet('jub1_entries')) setLoading(true)
    const { data: rows } = await sb.from('jub1_receipts')
      .select('*').is('deleted_at', null).order('created_at', { ascending: false }).limit(5000)
    const ids = (rows || []).map(r => r.id)
    // الدفعات والمرفقات معاً بالتوازي (كلاهما يعتمد على المعرّفات فقط)
    let pays = [], atts = []
    if (ids.length) {
      const [pRes, aRes] = await Promise.all([
        sb.from('jub1_receipt_payments').select('*').in('receipt_entry_id', ids),
        sb.from('attachments').select('entity_id').eq('entity_type', JUB1_ENTITY).in('entity_id', ids).is('deleted_at', null),
      ])
      pays = pRes.data || []
      atts = aRes.data || []
    }
    const byEntry = {}
    pays.forEach(p => { (byEntry[p.receipt_entry_id] ||= []).push(p) })
    const withImg = new Set()
    atts.forEach(a => withImg.add(a.entity_id))
    const merged = (rows || []).map(r => ({ ...r, payments: (byEntry[r.id] || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)), _hasImage: withImg.has(r.id) }))
    swrSet('jub1_entries', merged)
    setEntries(merged)
    setLoading(false)
  }, [sb])

  // الإحصاءات خادمياً (RPC) — كروت الأعلى تظهر بأرقامها فوراً بلا انتظار جلب كل الصفوف.
  // للمدير العام فقط (غيره يرى أصفاراً)، ونحدّثها صامتاً مع كل تحديث بيانات.
  const loadStats = useCallback(async () => {
    if (!isGM) { setStatsData(null); return }
    const { data } = await sb.rpc('jub1_receipts_stats')
    if (data) { swrSet('jub1_stats', data); setStatsData(data) }
  }, [sb, isGM])

  // العرض الفوري من كاش الجلسة ثم تحديث صامت بالخلفية (نفس سرعة الفواتير)
  useEffect(() => {
    const cachedRefs = swrGet('jub1_refs'); if (cachedRefs) applyRefs(cachedRefs)
    const cachedEntries = swrGet('jub1_entries'); if (cachedEntries) { setEntries(cachedEntries); setLoading(false) }
    loadRefs(); loadStats(); loadEntries()
  }, [loadRefs, loadEntries, loadStats, applyRefs])
  // تحديث تلقائي: أي إضافة/تعديل/حذف سند أو دفعة (من هذا الجهاز أو غيره) يعيد الجلب صامتاً.
  useLiveRefresh(['jub1_receipts', 'jub1_receipt_payments'], () => { loadStats(); loadEntries() })

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
    const paid = paidOf(e)
    const planSum = (e.installment_plan || []).reduce((s, p) => s + num(p.amount), 0)
    if (total && Math.abs(paid - total) > 0.5 && paid > total + 0.5) f.push(T('المدفوع أكبر من الإجمالي', 'Paid > total'))
    if (total && planSum && Math.abs(planSum - total) > 0.5) f.push(T('توزيع الدفعات ≠ الإجمالي', 'Plan ≠ total'))
    // سند مكرّر
    const nums = [e.primary_receipt_no, ...(e.payments || []).map(p => p.sanad_no)].map(s => String(s || '').trim()).filter(Boolean)
    const dupInside = nums.some((s, i) => nums.indexOf(s) !== i)
    const dupOutside = nums.some(s => (sanadCounts[s] || 0) > 1)
    if (dupInside || dupOutside) f.push(T('رقم سند مكرّر', 'Duplicate receipt no'))
    if (!e._hasImage) f.push(T('بدون صور', 'No images'))
    if (!total) f.push(T('بدون إجمالي', 'No total'))
    return f
  }, [sanadCounts, lang])

  // ── تصفية + ترتيب العرض ─────────────────────────────────────────────────
  const payStatusOf = (e) => {
    const total = num(e.total_amount), paid = paidOf(e)
    if (paid <= 0) return 'unpaid'
    if (total > 0 && paid + 0.5 >= total) return 'paid'
    return 'partial'
  }
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    const out = entries.filter(e => {
      if (e.is_transfer_calc) return false   // حسبات التنازل ليست سندات — تُستبعد من القائمة
      if (statusSel.length && !statusSel.includes(e.review_status)) return false
      if (onlyFlagged && flagsOf(e).length === 0) return false
      if (from && (!e.receipt_date || e.receipt_date < from)) return false
      if (to && (!e.receipt_date || e.receipt_date > to)) return false
      if (svcFilter.length && !svcFilter.includes(e.service_code)) return false
      if (agentFilter && String(e.agent_name || '').trim() !== agentFilter) return false
      if (payFilter.length && !payFilter.includes(payStatusOf(e))) return false
      if (!qq) return true
      const hay = [e.client_name, e.client_phone, e.client_id_no, e.agent_name, e.primary_receipt_no, e.service_code,
        ...(e.payments || []).map(p => p.sanad_no)].join(' ').toLowerCase()
      return hay.includes(qq)
    })
    const dcmp = (a, b, k) => String(a[k] || '').localeCompare(String(b[k] || ''))
    out.sort((a, b) => {
      switch (sortMode) {
        case 'created_asc':  return dcmp(a, b, 'created_at')
        case 'date_desc':    return dcmp(b, a, 'receipt_date') || dcmp(b, a, 'created_at')
        case 'date_asc':     return dcmp(a, b, 'receipt_date') || dcmp(a, b, 'created_at')
        default:             return dcmp(b, a, 'created_at')   // created_desc
      }
    })
    return out
  }, [entries, q, statusSel, onlyFlagged, from, to, svcFilter, payFilter, agentFilter, sortMode, flagsOf])

  // العرض التدريجي: أعد العدّ إلى الصفحة الأولى عند تغيّر البحث/التصفية/الفرز
  useEffect(() => { setVisibleCount(150) }, [q, statusSel, onlyFlagged, from, to, svcFilter, payFilter, agentFilter, sortMode])
  // تحميل المزيد تلقائياً عند الاقتراب من نهاية القائمة (بلا آلاف الصفوف في الـDOM دفعة واحدة)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || visibleCount >= filtered.length) return
    const io = new IntersectionObserver(es => {
      if (es[0]?.isIntersecting) setVisibleCount(v => Math.min(v + 150, filtered.length))
    }, { rootMargin: '600px' })
    io.observe(el)
    return () => io.disconnect()
  }, [filtered.length, visibleCount])

  // كروت الإحصاء أرقامها للمدير العام فقط (خادمياً عبر RPC — فورية بلا انتظار كل الصفوف)؛ غيره أصفار.
  const stats = useMemo(() => {
    const d = statsData
    if (!isGM || !d) return { total: 0, draft: 0, complete: 0, needs_review: 0, reviewed: 0, converted: 0, flagged: 0 }
    return { total: d.total || 0, draft: d.draft || 0, complete: d.complete || 0, needs_review: d.needs_review || 0, reviewed: d.reviewed || 0, converted: d.converted || 0, flagged: d.flagged || 0 }
  }, [statsData, isGM])

  // مجاميع المبالغ لكرت البطل (من RPC)
  const sums = useMemo(() => {
    if (!isGM || !statsData) return { total: 0, paid: 0, remaining: 0 }
    const total = num(statsData.sum_total), paid = num(statsData.sum_paid)
    return { total, paid, remaining: Math.max(0, total - paid) }
  }, [statsData, isGM])

  // تفصيل أنواع الملاحظات لكرت الملاحظات (من RPC)
  const flagStats = useMemo(() => {
    if (!isGM || !statsData) return { dup: 0, noImage: 0, noTotal: 0, mismatch: 0 }
    return { dup: statsData.flag_dup || 0, noImage: statsData.flag_no_image || 0, noTotal: statsData.flag_no_total || 0, mismatch: statsData.flag_mismatch || 0 }
  }, [statsData, isGM])

  // ── صفحة التفاصيل — تُشتق من viewId فتبقى حيّة بعد أي تعديل/تحديث ─────────
  const [viewId, setViewId] = useState(null)
  const detail = viewId ? entries.find(e => e.id === viewId) : null
  // مكدّس الرجوع الذكي بين السندات: عند فتح سند مرتبط يُحفَظ السند الحالي فيه، فيصبح زر
  // «رجوع للقائمة» = «رجوع لسند #<السابق>» ويعيدنا إليه؛ عند فراغ المكدّس نرجع للقائمة.
  const [recStack, setRecStack] = useState([])
  const openFromList = (id) => { setRecStack([]); setViewId(id) }          // فتح من القائمة = أصل جديد
  const openLinked = useCallback((id) => {                                  // فتح سند مرتبط = ادفع الحالي للمكدّس
    setRecStack(s => {
      const cur = entries.find(e => e.id === viewId)
      return viewId && viewId !== id ? [...s, { id: viewId, no: cur?.primary_receipt_no || '' }] : s
    })
    setViewId(id)
  }, [entries, viewId])
  const backSmart = useCallback(() => {                                     // زر الرجوع: اسحب من المكدّس أو ارجع للقائمة
    setRecStack(s => {
      if (!s.length) { setViewId(null); return s }
      setViewId(s[s.length - 1].id)
      return s.slice(0, -1)
    })
  }, [])
  const [detailAtts, setDetailAtts] = useState([])
  const [attsTick, setAttsTick] = useState(0)
  useEffect(() => {
    if (!viewId) { setDetailAtts([]); return }
    let alive = true
    sb.from('attachments').select('id,file_url,file_name,rotation')
      .eq('entity_type', JUB1_ENTITY).eq('entity_id', viewId).is('deleted_at', null)
      .then(({ data }) => { if (alive) setDetailAtts(data || []) })
    return () => { alive = false }
  }, [sb, viewId, entries, attsTick])

  const setReviewStatus = useCallback(async (id, s) => {
    const { error } = await sb.from('jub1_receipts').update({ review_status: s }).eq('id', id)
    if (error) tt(T('فشل تحديث الحالة: ', 'Status update failed: ') + error.message)
    else loadEntries()
  }, [sb, loadEntries])

  // حفظ التحرير المباشر من صفحة التفاصيل — تحديث السند + استبدال صفوف المدفوعات
  const saveInline = useCallback(async (id, patch, payRows) => {
    const { error } = await sb.from('jub1_receipts').update(patch).eq('id', id)
    if (error) { tt(T('فشل الحفظ: ', 'Save failed: ') + error.message); return false }
    await sb.from('jub1_receipt_payments').delete().eq('receipt_entry_id', id)
    const rows = (payRows || []).filter(p => p.sanad_no || p.amount || p.pay_date).map((p, i) => ({
      receipt_entry_id: id, sanad_no: p.sanad_no || null, pay_date: p.pay_date || null,
      amount: p.amount ? num(p.amount) : null, method_code: p.method_code || null,
      is_previous: !!p.is_previous, notes: p.notes || null, sort_order: i,
    }))
    if (rows.length) {
      const { error: e2 } = await sb.from('jub1_receipt_payments').insert(rows)
      if (e2) tt(T('حُفظ السند لكن فشل حفظ المدفوعات: ', 'Saved, but payments failed: ') + e2.message)
    }
    await loadEntries()
    tt(T('تم حفظ التعديلات', 'Changes saved'))
    return true
  }, [sb, loadEntries])

  // حذف السند (حذف ناعم — قابل للاسترجاع) ثم العودة للقائمة
  const deleteEntry = useCallback(async (id) => {
    const { error } = await sb.from('jub1_receipts').update({ deleted_at: new Date().toISOString(), deleted_by: user?.id || null }).eq('id', id)
    if (error) { tt(T('فشل الحذف: ', 'Delete failed: ') + error.message); return false }
    setViewId(null)
    await loadEntries()
    tt(T('تم حذف السند', 'Receipt deleted'))
    return true
  }, [sb, user, loadEntries])

  // فتح سند عبر رقمه — رقاقة «أرقام السندات السابقة» هي رابط تكوين صورة الفاتورة
  const openByNo = useCallback((no) => {
    const k = String(no || '').trim()
    const hit = entries.find(x => String(x.primary_receipt_no || '').trim() === k)
    if (hit) openLinked(hit.id)
    else tt(T('لا يوجد سند مسجّل بالرقم ', 'No receipt registered with no ') + k)
  }, [entries, openLinked])

  // ربط/فكّ ربط سندَين ثنائي الاتجاه (رقم السند غير فريد فالربط بمعرّفات صريحة) — يُكتب فوراً للطرفين
  const toggleLink = useCallback(async (currentId, targetId, link) => {
    const cur = entries.find(e => e.id === currentId)
    const tgt = entries.find(e => e.id === targetId)
    if (!cur || !tgt) return
    const curSet = new Set(cur.linked_receipt_ids || [])
    const tgtSet = new Set(tgt.linked_receipt_ids || [])
    if (link) { curSet.add(targetId); tgtSet.add(currentId) } else { curSet.delete(targetId); tgtSet.delete(currentId) }
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      sb.from('jub1_receipts').update({ linked_receipt_ids: [...curSet] }).eq('id', currentId),
      sb.from('jub1_receipts').update({ linked_receipt_ids: [...tgtSet] }).eq('id', targetId),
    ])
    if (e1 || e2) { tt(T('فشل الربط: ', 'Link failed: ') + ((e1 || e2).message)); return }
    await loadEntries()
    tt(link ? T('تم ربط السند', 'Receipt linked') : T('تم إلغاء الربط', 'Link removed'))
  }, [sb, entries, loadEntries])

  // ── فتح نموذج التعديل (الإضافة تتم حصرياً عبر المعالجة الآلية للصور) ────
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

  // سند جديد — نافذة رفع صور فقط: تُقرأ آلياً وتُحفظ كمسودة (التحرير الكامل لاحقاً من صفحة التفاصيل)
  const canCreate = (isGM || can(user, 'jub1_receipts.create')) && modalAllowed(user, TAB, 'receipt_new')
  const openNew = () => setCreating(true)

  // ═══ صفحة التفاصيل (تحل محل القائمة عند فتح سند) ═══
  if (detail) return (
    <div style={{ fontFamily: 'Cairo, Tajawal, sans-serif', paddingBottom: 60 }}>
      <ReceiptDetail e={detail} atts={detailAtts} services={services} methods={methods} agents={agents} flags={flagsOf(detail)} T={T} sb={sb} tt={tt} user={user}
        entries={entries} orderedIds={filtered.map(x => x.id)} onOpenId={(id) => setViewId(id)} onOpenLinked={openLinked} onLinkToggle={toggleLink}
        onBack={backSmart} backLabel={recStack.length ? T('رجوع لسند #', 'Back to #') + (recStack[recStack.length - 1].no || '—') : T('رجوع للقائمة', 'Back to list')}
        onEditModal={() => openEdit(detail)} onStatus={(s) => setReviewStatus(detail.id, s)}
        onSave={saveInline} onOpenByNo={openByNo} onAttsChanged={() => setAttsTick(t => t + 1)} onDelete={deleteEntry} />
      {editing && (
        <EntryModal sb={sb} user={user} lang={lang} tt={tt} branch={branch} services={services} methods={methods}
          agents={agents} entry={editing} isGM={isGM} onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); loadEntries() }} />
      )}
    </div>
  )

  const donutSegs = [
    { k: 'draft', l: STATUS.draft.l, v: stats.draft, c: STATUS.draft.c },
    { k: 'complete', l: STATUS.complete.l, v: stats.complete, c: STATUS.complete.c },
    { k: 'needs_review', l: STATUS.needs_review.l, v: stats.needs_review, c: STATUS.needs_review.c },
    { k: 'reviewed', l: STATUS.reviewed.l, v: stats.reviewed, c: STATUS.reviewed.c },
    { k: 'converted', l: STATUS.converted.l, v: stats.converted, c: STATUS.converted.c },
  ]
  const donutTot = Math.max(1, stats.total)
  const R = 42, CIRC = 2 * Math.PI * R
  let acc = 0
  const donutArcs = donutSegs.map(s => {
    const len = (s.v / donutTot) * CIRC
    const arc = { ...s, dash: `${len} ${CIRC - len}`, offset: -acc }
    acc += len
    return arc
  })
  const readyPct = Math.round(((stats.reviewed + stats.converted) / donutTot) * 100)

  return (
    <div style={{ fontFamily: 'Cairo, Tajawal, sans-serif', paddingBottom: 40 }}>
      {/* ═══ الترويسة — بنمط صفحة المنشآت ═══ */}
      <div style={{ position: 'relative', marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--tx)', letterSpacing: '-.3px', lineHeight: 1.2 }}>
            {T('سندات القبض — JUB1', 'Receipts — JUB1')}
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx2)', marginTop: 12, lineHeight: 1.6 }}>
            {T('إدخال سندات القبض من الصور ومراجعتها ثم تحويلها إلى فواتير', 'Enter receipts from images, review, then convert to invoices')}
          </div>
        </div>
        <div className="page-cta-row" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {canCreate && (
            <button onClick={openNew} className="btn-primary-modal"
              style={{ height: 42, padding: '0 18px', borderRadius: 11, fontFamily: 'Cairo, Tajawal, sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {T('سند قبض جديد', 'New receipt')}<Plus size={16} strokeWidth={2.2} />
            </button>
          )}
        </div>
      </div>

      {/* ═══ كروت الإحصاء — بنمط صفحة الفواتير: بطل بشريط أيقونة + كرت جانبي + كرت تفصيلي ═══ */}
      {/* الشبكة 1.6fr 1fr 1.7fr تنهار إلى عمود واحد على الجوال عبر قاعدة عامة (max-width:680px) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1.7fr', gap: 14, marginBottom: 24 }}>
        {/* بطل «سند» — المحتوى يمين + شريط أيقونة ذهبي على اليسار (نفس بطل «نقدًا» في الفواتير) */}
        <div style={{ borderRadius: 16, background: 'var(--card-grad2)', border: '1px solid var(--bd)', boxShadow: 'var(--shadow-sm)', position: 'relative', overflow: 'hidden', minHeight: 190, display: 'flex' }}>
          <div style={{ position: 'absolute', insetInlineEnd: -50, top: -50, width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(176,125,0,.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', flex: 1, padding: '16px 34px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'right' }}>
            <span style={{ fontSize: 24, color: 'var(--tx)', fontWeight: 600, letterSpacing: '.2px' }}>{T('سند', 'Receipts')}</span>
            <div style={{ direction: 'ltr', textAlign: 'right' }}>
              <span style={{ fontSize: 46, fontWeight: 600, color: '#B07D00', letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{stats.total.toLocaleString('en-US')}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* الإجمالي — «تاق» ذهبي بنفس تصميم تاق المقبوض */}
              <span style={{ alignSelf: 'flex-start', direction: 'rtl', display: 'inline-flex', alignItems: 'center', gap: 6, borderInlineStart: '3px solid #B07D00', background: 'rgba(176,125,0,.10)', padding: '5px 11px', color: '#B07D00', flexShrink: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{T('الإجمالي', 'Total')}</span>
                <span style={{ fontSize: 15, fontWeight: 600, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{fmt0(sums.total)}</span>
                <span style={{ fontSize: 10.5, fontWeight: 600, opacity: .85 }}>{T('ريال', 'SAR')}</span>
              </span>
              {/* المقبوض والمتبقي في صف واحد */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {/* المقبوض — «تاق» أخضر مثل تاق الصافي النقدي في الفواتير */}
                <span style={{ direction: 'rtl', display: 'inline-flex', alignItems: 'center', gap: 6, borderInlineStart: '3px solid #27a046', background: 'rgba(39,160,70,.10)', padding: '5px 11px', color: '#27a046', flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{T('المقبوض', 'Received')}</span>
                  <span style={{ fontSize: 15, fontWeight: 600, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{fmt0(sums.paid)}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 600, opacity: .85 }}>{T('ريال', 'SAR')}</span>
                </span>
                {/* المتبقي — «تاق» أحمر بنفس تصميم تاق المقبوض */}
                <span style={{ direction: 'rtl', display: 'inline-flex', alignItems: 'center', gap: 6, borderInlineStart: '3px solid #c0392b', background: 'rgba(192,57,43,.10)', padding: '5px 11px', color: '#c0392b', flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{T('المتبقي', 'Remaining')}</span>
                  <span style={{ fontSize: 15, fontWeight: 600, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{fmt0(sums.remaining)}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 600, opacity: .85 }}>{T('ريال', 'SAR')}</span>
                </span>
              </div>
            </div>
          </div>
          <div style={{ position: 'relative', width: 72, background: 'linear-gradient(180deg, #B07D001a, #B07D0008)', borderInlineStart: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#B07D00' }}>
            <Receipt size={30} />
          </div>
        </div>

        {/* الملاحظات — كرت جانبي مضغوط بشريط أيقونة (يقابل كرت التحويلات/المرتجعة في الفواتير) */}
        {(() => { const railC = stats.flagged ? '#c0392b' : '#B07D00'; return (
        <div style={{ borderRadius: 16, background: 'var(--card-grad2)', border: '1px solid var(--bd)', boxShadow: 'var(--shadow-sm)', display: 'flex', overflow: 'hidden', minHeight: 190 }}>
          <div style={{ flex: 1, padding: 14, display: 'flex' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gridTemplateRows: 'repeat(2,1fr)', gap: 10, flex: 1 }}>
              {[
                { l: T('رقم سند مكرّر', 'Duplicate no'), v: flagStats.dup, c: '#c0392b' },
                { l: T('بدون صور', 'No images'), v: flagStats.noImage, c: '#e67e22' },
                { l: T('بدون إجمالي', 'No total'), v: flagStats.noTotal, c: '#e67e22' },
                { l: T('توزيع ≠ إجمالي', 'Plan ≠ total'), v: flagStats.mismatch, c: '#c0392b' },
              ].map((x, i) => (
                <div key={i} style={{ borderRadius: 12, padding: '10px 12px', background: 'rgba(255,255,255,.024)', border: '1px solid rgba(255,255,255,.04)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.l}</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: x.v ? x.c : 'var(--tx4)', fontVariantNumeric: 'tabular-nums', direction: 'ltr', textAlign: 'right', lineHeight: 1 }}>{x.v.toLocaleString('en-US')}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ width: 56, background: `linear-gradient(180deg, ${railC}1a, ${railC}08)`, borderInlineStart: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: railC }}>
            <AlertTriangle size={22} />
          </div>
        </div>
        )})()}

        {/* دونات حالة المراجعة — كرت تفصيلي عريض بشريط أيقونة (يقابل كرت الخدمات في الفواتير) */}
        <div style={{ borderRadius: 16, background: 'var(--card-grad2)', border: '1px solid var(--bd)', boxShadow: 'var(--shadow-sm)', display: 'flex', overflow: 'hidden', minHeight: 190 }}>
          <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>{T('حالة المراجعة', 'Review status')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
              <div style={{ position: 'relative', width: 112, height: 112, flexShrink: 0 }}>
                <svg width="112" height="112" viewBox="0 0 112 112">
                  <g style={{ transform: 'rotate(-90deg)', transformOrigin: '56px 56px' }}>
                    <circle cx="56" cy="56" r={R} fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="12" />
                    {donutArcs.map(a => (
                      <circle key={a.k} cx="56" cy="56" r={R} fill="none" stroke={a.c} strokeOpacity=".85" strokeWidth="12"
                        strokeLinecap="butt" strokeDasharray={a.dash} strokeDashoffset={a.offset} style={{ transition: 'stroke-dasharray .4s, stroke-dashoffset .4s' }} />
                    ))}
                  </g>
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--tx)', lineHeight: 1, direction: 'ltr' }}>{readyPct}%</span>
                  <span style={{ fontSize: 9.5, fontWeight: 600, marginTop: 4, letterSpacing: '.2px', color: 'var(--tx2)' }}>{T('جاهز', 'ready')}</span>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {donutSegs.map(s => (
                  <div key={s.k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, color: 'var(--tx2)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 3, background: s.c }} /> {s.l}
                    </span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: s.c, fontVariantNumeric: 'tabular-nums', direction: 'ltr' }}>{s.v.toLocaleString('en-US')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ width: 56, background: 'linear-gradient(180deg, #B07D001a, #B07D0008)', borderInlineStart: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#B07D00' }}>
            <CheckCircle2 size={26} />
          </div>
        </div>
      </div>

      {/* ═══ البحث + التصفية — بنمط صفحة الفواتير ═══ */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px', position: 'relative', borderRadius: 12, boxShadow: '0 2px 7px rgba(0,0,0,.12), inset 0 1px 0 rgba(176,125,0,.1)' }}>
          <Search size={15} style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', color: q ? '#B07D00' : 'var(--tx4)', transition: 'color .18s' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={T('بحث: عميل، جوال، هوية، رقم سند…', 'Search: client, phone, ID, receipt no…')}
            style={{ width: '100%', height: 44, padding: '0 14px 0 38px', borderRadius: 12, background: 'var(--search-bg)', border: '1px solid transparent', color: 'var(--tx)', fontSize: 13, fontFamily: 'Cairo, Tajawal, sans-serif', boxSizing: 'border-box' }} />
        </div>
        {(() => {
          const hasFilters = !!(statusSel.length || svcFilter.length || payFilter.length || agentFilter || from || to || onlyFlagged)
          const clearAll = () => { setStatusSel([]); setSvcFilter([]); setPayFilter([]); setAgentFilter(''); setFrom(''); setTo(''); setOnlyFlagged(false) }
          const active = advOpen || hasFilters
          return (
            <button onClick={() => setAdvOpen(o => !o)}
              style={{ height: 44, padding: '0 16px', borderRadius: 12, background: active ? 'var(--accent-soft)' : 'var(--search-bg)', border: '1px solid ' + (active ? 'var(--accent-bd)' : 'transparent'), color: active ? 'var(--accent)' : 'var(--tx2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Cairo, Tajawal, sans-serif', display: 'flex', alignItems: 'center', gap: 8, boxSizing: 'border-box', boxShadow: '0 2px 7px rgba(0,0,0,.12), inset 0 1px 0 rgba(176,125,0,.1)' }}>
              {T('تصفية', 'Filter')}
              {hasFilters ? (
                <span role="button" tabIndex={0} title={T('مسح الفلاتر', 'Clear filters')}
                  onClick={e => { e.stopPropagation(); clearAll() }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#c0392b'; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#B07D00'; e.currentTarget.style.color = '#000' }}
                  style={{ background: '#B07D00', color: '#000', width: 18, height: 18, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '.18s' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </span>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="14" y2="6"/><line x1="18" y1="6" x2="20" y2="6"/><circle cx="16" cy="6" r="2"/><line x1="4" y1="12" x2="8" y2="12"/><line x1="12" y1="12" x2="20" y2="12"/><circle cx="10" cy="12" r="2"/><line x1="4" y1="18" x2="16" y2="18"/><line x1="20" y1="18" x2="20" y2="18"/><circle cx="18" cy="18" r="2"/></svg>
              )}
            </button>
          )
        })()}
      </div>

      {/* لوحة التصفية المتقدمة — نفس تصميم صفحة الفواتير */}
      {advOpen && (() => {
        const fLbl = { fontSize: 12, fontWeight: 500, color: 'var(--tx3)', paddingInlineStart: 2, marginBottom: 7 }
        const today = new Date(); const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
        const dShift = (key, n) => { const d = new Date(key + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
        const datePresets = [
          { l: T('اليوم', 'Today'), f: todayStr, t: todayStr },
          { l: T('أمس', 'Yesterday'), f: dShift(todayStr, -1), t: dShift(todayStr, -1) },
          { l: T('هذا الأسبوع', 'This week'), f: dShift(todayStr, -new Date(todayStr + 'T12:00:00Z').getUTCDay()), t: todayStr },
          { l: T('هذا الشهر', 'This month'), f: todayStr.slice(0, 8) + '01', t: todayStr },
        ]
        return (
          <div style={{ marginBottom: 22, padding: '16px 18px', background: 'var(--card-grad2)', border: '1px solid var(--bd)', borderRadius: 14, boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid var(--bd)', paddingBottom: 2, marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx3)', marginInlineEnd: 8, paddingBottom: 8 }}>{T('فترة سريعة', 'Quick period')}</span>
              {datePresets.map(p => {
                const a = from === p.f && to === p.t
                return <button key={p.l} type="button" onClick={() => { setFrom(p.f); setTo(p.t) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cairo, Tajawal, sans-serif', fontSize: 13, fontWeight: 600, color: a ? '#B07D00' : 'var(--tx2)', padding: '4px 12px 8px', transition: '.18s', borderBottom: `2px solid ${a ? '#B07D00' : 'transparent'}`, marginBottom: -1 }}>{p.l}</button>
              })}
              {(from || to) && (
                <button type="button" onClick={() => { setFrom(''); setTo('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cairo, Tajawal, sans-serif', fontSize: 12.5, fontWeight: 600, color: '#c0392b', padding: '4px 10px 8px', marginInlineStart: 'auto' }}>{T('مسح التاريخ', 'Clear dates')}</button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
              <div>
                <div style={fLbl}>{T('تاريخ من', 'Date From')}</div>
                <DateField value={from} onChange={setFrom} lang={lang} />
              </div>
              <div>
                <div style={fLbl}>{T('تاريخ إلى', 'Date To')}</div>
                <DateField value={to} onChange={setTo} lang={lang} />
              </div>
              <div>
                <div style={fLbl}>{T('نوع الخدمة', 'Service Type')}</div>
                <FKDropdown multi selectedKeys={svcFilter} onChange={setSvcFilter} placeholder={T('الكل', 'All')} getKey={o => o.v} getLabel={o => o.l}
                  options={popupServices(services).map(s => ({ v: s.code, l: s.value_ar }))} />
              </div>
              <div>
                <div style={fLbl}>{T('حالة السند', 'Receipt status')}</div>
                <FKDropdown multi selectedKeys={statusSel} onChange={setStatusSel} placeholder={T('الكل', 'All')} getKey={o => o.v} getLabel={o => o.l}
                  options={['draft', 'complete', 'needs_review', 'reviewed', 'converted'].map(s => ({ v: s, l: STATUS[s].l }))} />
              </div>
              <div>
                <div style={fLbl}>{T('حالة السداد', 'Pay Status')}</div>
                <FKDropdown multi selectedKeys={payFilter} onChange={setPayFilter} placeholder={T('الكل', 'All')} getKey={o => o.v} getLabel={o => o.l}
                  options={[{ v: 'paid', l: T('مدفوع بالكامل', 'Fully paid') }, { v: 'partial', l: T('مدفوع جزئياً', 'Partially paid') }, { v: 'unpaid', l: T('غير مدفوع', 'Unpaid') }]} />
              </div>
              <div>
                <div style={fLbl}>{T('الوسيط', 'Agent')}</div>
                <FKDropdown value={agentFilter} onChange={v => setAgentFilter(v || '')} placeholder={T('الكل', 'All')} getKey={o => o.v} getLabel={o => o.l}
                  options={[{ v: '', l: T('الكل', 'All') }, ...agents.map(a => ({ v: a, l: a }))]} />
              </div>
              <div>
                <div style={fLbl}>{T('الترتيب', 'Sort')}</div>
                <FKDropdown value={sortMode} onChange={v => setSortMode(v || 'created_desc')} placeholder={T('الأحدث إضافة', 'Newest first')} getKey={o => o.v} getLabel={o => o.l}
                  options={[
                    { v: 'created_desc', l: T('الأحدث إضافة', 'Newest added') },
                    { v: 'created_asc', l: T('الأقدم إضافة', 'Oldest added') },
                    { v: 'date_desc', l: T('تاريخ السند — الأحدث', 'Receipt date — newest') },
                    { v: 'date_asc', l: T('تاريخ السند — الأقدم', 'Receipt date — oldest') },
                  ]} />
              </div>
              <div>
                <div style={fLbl}>{T('الملاحظات', 'Flags')}</div>
                <button onClick={() => setOnlyFlagged(v => !v)}
                  style={{ height: 42, width: '100%', padding: '0 14px', borderRadius: 9, cursor: 'pointer', fontFamily: 'Cairo, Tajawal, sans-serif', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: '.18s',
                    border: `1px solid ${onlyFlagged ? 'rgba(192,57,43,.5)' : 'var(--bd)'}`, background: onlyFlagged ? 'rgba(192,57,43,.1)' : 'var(--inputBg)', color: onlyFlagged ? '#c0392b' : 'var(--tx3)' }}>
                  <AlertTriangle size={14} />{T('عليه ملاحظات فقط', 'Flagged only')}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ═══ الجدول ═══ */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--tx3)' }}>{T('جارٍ التحميل…', 'Loading…')}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={emptyIcon} title={T('لا توجد سندات', 'No receipts')} desc={T('تُضاف السندات عبر المعالجة الآلية لصور السندات', 'Receipts are added via automatic image processing')} />
      ) : (
        <>
        <div className="jub-tbl-scroll" style={{ overflowX: 'auto', borderRadius: 10, boxShadow: 'var(--shadow-sm)' }}>
          <style>{`
            .jub-tbl-scroll::-webkit-scrollbar{display:none}
            .jub-tbl{width:100%;table-layout:fixed;border-collapse:separate;border-spacing:0;font-family:'Cairo','Tajawal',sans-serif;background:var(--card-grad2);border-radius:10px;border:1px solid var(--bd)}
            .jub-tbl thead th{position:sticky;top:0;background:var(--hd);color:var(--hdtx);font-size:13px;font-weight:600;text-align:center;padding:13px 6px 11px;box-shadow:inset 0 -2px 0 rgba(176,125,0,.55);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;z-index:2;letter-spacing:.2px}
            .jub-tbl tbody td{padding:12px 8px;font-size:12.5px;color:var(--tx);text-align:center;vertical-align:middle;overflow:hidden;border-bottom:1px solid var(--bd2)}
            .jub-tbl tbody tr{cursor:pointer;transition:background .12s}
            .jub-tbl tbody tr:nth-child(even) td{background:var(--bd2)}
            .jub-tbl tbody tr:hover td{background:rgba(176,125,0,.06)}
            .jub-tbl tbody tr:last-child td{border-bottom:none}
            .jub-tbl tbody tr:last-child td:first-child{border-bottom-right-radius:9px}
            .jub-tbl tbody tr:last-child td:last-child{border-bottom-left-radius:9px}
          `}</style>
          <table className="jub-tbl" style={{ minWidth: 980 }}>
            <colgroup>
              {[10, 11, 16, 15, 10, 10, 10, 9, 9].map((w, i) => <col key={i} style={{ width: w + '%' }} />)}
            </colgroup>
            <thead>
              <tr>
                {[T('رقم السند', 'Receipt#'), T('التاريخ', 'Date'), T('العميل', 'Client'),
                  T('الخدمة', 'Service'), T('الإجمالي', 'Total'), T('المقبوض', 'Received'),
                  T('المتبقي', 'Remaining'), T('الحالة', 'Status'), T('ملاحظات', 'Flags')].map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, visibleCount).map(e => {
                const paid = paidOf(e)
                const total = num(e.total_amount)
                const flags = flagsOf(e)
                const st = STATUS[e.review_status] || STATUS.draft
                return (
                  <tr key={e.id} onClick={() => openFromList(e.id)}>
                    <td style={{ fontWeight: 700, color: '#B07D00', direction: 'ltr' }}>{e.primary_receipt_no || '—'}</td>
                    <td style={{ color: 'var(--tx3)', direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{dt(e.receipt_date)}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.client_name || <em style={{ color: 'var(--tx4)', fontWeight: 500 }}>{T('بدون اسم', 'No name')}</em>}</div>
                      {e.client_phone && <div style={{ fontSize: 11, color: 'var(--tx4)', direction: 'ltr' }}>{e.client_phone}</div>}
                    </td>
                    <td style={{ color: 'var(--tx3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{services.find(s => s.id === e.service_item_id)?.value_ar || '—'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--tx)', direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{total ? fmt(total) : '—'}</td>
                    <td style={{ color: 'var(--ok)', direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{fmt(paid)}</td>
                    <td style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', color: total - paid > 0.5 ? 'var(--warn)' : 'var(--tx3)' }}>{total ? fmt(Math.max(0, total - paid)) : '—'}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, borderInlineStart: '3px solid ' + st.c, background: st.c + '10', padding: '5px 10px', color: st.c, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}><st.Ico size={13} />{st.l}</span>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {flags.length ? (
                          <span title={flags.join('، ')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#c0392b', fontSize: 11, fontWeight: 700 }}>
                            <AlertTriangle size={13} /> {flags.length}
                          </span>
                        ) : <Check size={14} style={{ color: 'var(--ok)' }} />}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {/* عدّاد + حسّاس التحميل التدريجي (يُحمّل المزيد تلقائياً عند التمرير) */}
        {visibleCount < filtered.length && (
          <div ref={sentinelRef} style={{ padding: '14px 0', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--tx4)' }}>
            {T('عرض', 'Showing')} {visibleCount.toLocaleString('en-US')} {T('من', 'of')} {filtered.length.toLocaleString('en-US')} — {T('مرّر لعرض المزيد…', 'scroll for more…')}
          </div>
        )}
        </>
      )}

      {/* نافذة «سند جديد» — رفع صور + قراءة آلية + حفظ مسودة (تُفتح من زر «سند قبض جديد») */}
      {creating && (
        <NewReceiptModal sb={sb} user={user} lang={lang} tt={tt} branch={branch} services={services}
          onClose={() => { setCreating(false); loadEntries() }} />
      )}

      {/* نافذة تعديل سند (تُفتح من صفحة التفاصيل) */}
      {editing && (
        <EntryModal sb={sb} user={user} lang={lang} tt={tt} branch={branch} services={services} methods={methods}
          agents={agents} entry={editing} isGM={isGM} onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); loadEntries() }} />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// صفحة تفاصيل سند القبض — نفس لغة تفاصيل الفاتورة (صفحة كاملة، لا نافذة)
// ═══════════════════════════════════════════════════════════════════════
// نموذج التحرير المباشر — يُشتق من صف السند ويُقارن به لاكتشاف التعديلات
const initDetailForm = (e) => ({
  client_name: e.client_name || '', client_phone: e.client_phone || '', client_id_no: e.client_id_no || '',
  agent_name: e.agent_name || '',
  service_item_id: e.service_item_id || '', service_code: e.service_code || '',
  quantity: e.quantity != null ? String(e.quantity) : '1',
  total_amount: e.total_amount != null ? String(num(e.total_amount)) : '',
  primary_receipt_amount: e.primary_receipt_amount != null ? String(num(e.primary_receipt_amount)) : '',
  primary_receipt_no: e.primary_receipt_no || '',
  receipt_date: e.receipt_date || '',
  notes: e.notes || '',
  is_transfer_calc: !!e.is_transfer_calc,
  prevNos: String(e.previous_receipt_nos || '').split(/[،,;\s]+/).filter(Boolean),
  plan: Array.isArray(e.installment_plan) ? e.installment_plan.map(p => ({ _k: rid(), label: p.label || '', amount: p.amount != null && p.amount !== '' ? String(p.amount) : '', paid: !!p.paid })) : [],
  payments: (e.payments || []).map(p => ({ _k: rid(), sanad_no: p.sanad_no || '', pay_date: p.pay_date || '', amount: p.amount != null ? String(num(p.amount)) : '', method_code: p.method_code || '', is_previous: !!p.is_previous, notes: p.notes || '' })),
  // حسبة التنازل (نقل الكفالة): { image_url, image_path, fields:[{label,value}], note } — تُرفع يدوياً وتُقرأ آلياً للمراجعة
  transfer_calc: (e.transfer_calc && typeof e.transfer_calc === 'object') ? { ...e.transfer_calc, fields: Array.isArray(e.transfer_calc.fields) ? e.transfer_calc.fields.map(x => ({ _k: rid(), label: x.label || '', value: x.value || '' })) : [] } : null,
})
const snapForm = (f) => JSON.stringify({
  ...f,
  plan: f.plan.map(({ _k, ...r }) => r),
  payments: f.payments.map(({ _k, ...r }) => r),
  transfer_calc: f.transfer_calc ? { ...f.transfer_calc, fields: (f.transfer_calc.fields || []).map(({ _k, ...r }) => r) } : null,
})

// كرت اختيار «نوع الخدمة» — بنفس هيئة كروت box لكن بقائمة منسدلة أنيقة بدل الـ<select> الأصلي:
// زر يعرض القيمة + سهم ذهبي، وقائمة تنسدل بعلامة صح للمختار وتظليل ذهبي عند المرور. (مكوّن مستقل عن ReceiptDetail
// كي لا يُعاد إنشاؤه كل رندر فيفقد حالته). options = عناصر lookup {id, value_ar}.
function ServiceBox({ label, value, options, onChange, placeholder = '—' }) {
  const [open, setOpen] = useState(false)
  const [flipUp, setFlipUp] = useState(false)
  const wrapRef = useRef(null)
  const sel = options.find(o => o.id === value)
  useEffect(() => {
    if (!open) return
    const onDoc = ev => { if (wrapRef.current && !wrapRef.current.contains(ev.target)) setOpen(false) }
    const onKey = ev => { if (ev.key === 'Escape') setOpen(false) }
    setTimeout(() => document.addEventListener('mousedown', onDoc), 0)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])
  const toggle = () => {
    if (!open && wrapRef.current) {
      const r = wrapRef.current.getBoundingClientRect()
      setFlipUp(window.innerHeight - r.bottom < 280 && r.top > window.innerHeight - r.bottom)
    }
    setOpen(o => !o)
  }
  return (
    <div ref={wrapRef} style={{ position: 'relative', minWidth: 0 }}>
      <button type="button" onClick={toggle}
        style={{ width: '100%', textAlign: 'start', borderRadius: 12, padding: '8px 12px 9px', cursor: 'pointer',
          background: 'var(--inputBg)', border: `1px solid ${open ? 'rgba(176,125,0,.55)' : 'var(--bd)'}`,
          boxShadow: open ? '0 0 0 3px rgba(176,125,0,.12)' : 'none', transition: '.15s', fontFamily: 'Cairo, Tajawal, sans-serif' }}>
        <div style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, marginBottom: 3 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            color: sel ? 'var(--tx)' : 'var(--tx4)' }}>{sel ? sel.value_ar : placeholder}</span>
          <ChevronDown size={15} color="#B07D00" strokeWidth={2.5}
            style={{ flexShrink: 0, transition: '.2s', transform: open ? 'rotate(180deg)' : 'none' }} />
        </div>
      </button>
      {open && (
        <div className="sr-scroll" style={{ position: 'absolute', insetInlineStart: 0, insetInlineEnd: 0, zIndex: 50,
          ...(flipUp ? { bottom: 'calc(100% + 6px)' } : { top: 'calc(100% + 6px)' }),
          maxHeight: 260, overflowY: 'auto', borderRadius: 12, padding: 5,
          background: 'var(--modal-bg, var(--card-grad2))', border: '1px solid var(--bd)', boxShadow: '0 14px 40px var(--shadowClr, rgba(0,0,0,.4))' }}>
          {options.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', fontSize: 11.5, color: 'var(--tx4)', fontWeight: 600 }}>لا توجد خدمات</div>
          )}
          {options.map(o => {
            const on = o.id === value
            return (
              <div key={o.id} onClick={() => { onChange(o); setOpen(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', borderRadius: 9, cursor: 'pointer',
                  background: on ? 'rgba(176,125,0,.14)' : 'transparent', transition: '.12s' }}
                onMouseEnter={ev => { if (!on) ev.currentTarget.style.background = 'rgba(176,125,0,.08)' }}
                onMouseLeave={ev => { if (!on) ev.currentTarget.style.background = 'transparent' }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: on ? 700 : 600, color: on ? '#B07D00' : 'var(--tx)' }}>{o.value_ar}</span>
                {on && <Check size={14} color="#B07D00" strokeWidth={3} style={{ flexShrink: 0 }} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// حقل تاريخ مضغوط بهيئة كروت box لكن يفتح كلندر البرنامج الأنيق (CalendarPopup) بدل الـ<input type=date> الأصلي.
function DateBox({ label, value, onChange }) {
  const wrapRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState(null)
  // إدخال يدوي بصيغة YYYY-MM-DD: تحويل الأرقام العربية، إدراج الشرطات آلياً،
  // وتقييد الشهر ≤ 12 واليوم ≤ 31.
  const normDate = (s) => {
    const digits = String(s || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\D/g, '').slice(0, 8)
    const y = digits.slice(0, 4)
    let m = digits.slice(4, 6)
    let d = digits.slice(6, 8)
    if (m.length === 2) m = String(Math.min(12, Math.max(1, +m))).padStart(2, '0')
    if (d.length === 2) d = String(Math.min(31, Math.max(1, +d))).padStart(2, '0')
    let out = y
    if (digits.length > 4) out += '-' + m
    if (digits.length > 6) out += '-' + d
    return out
  }
  const openPicker = () => {
    if (!open && wrapRef.current) {
      const r = wrapRef.current.getBoundingClientRect()
      setAnchor({ top: r.top, bottom: r.bottom, left: r.left, width: r.width })
    }
    setOpen(o => !o)
  }
  return (
    <div ref={wrapRef} style={{ position: 'relative', minWidth: 0 }}>
      <div style={{ width: '100%', borderRadius: 12, padding: '8px 12px 9px',
          background: 'var(--inputBg)', border: `1px solid ${open ? 'rgba(176,125,0,.55)' : 'var(--bd)'}`,
          boxShadow: open ? '0 0 0 3px rgba(176,125,0,.12)' : 'none', transition: '.15s' }}>
        <div style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, marginBottom: 3 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input value={value || ''} onChange={ev => onChange(normDate(ev.target.value))} placeholder="YYYY-MM-DD" inputMode="numeric"
            style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, direction: 'ltr', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--tx)', background: 'transparent', border: 'none', outline: 'none', padding: 0, fontFamily: 'Cairo, Tajawal, sans-serif' }} />
          <button type="button" onClick={openPicker} title="التقويم" style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex', flexShrink: 0 }}>
            <Calendar size={15} color="#B07D00" strokeWidth={2.2} />
          </button>
        </div>
      </div>
      {open && anchor && <CalendarPopup value={value} onPick={v => { onChange(v); setOpen(false) }} onClose={() => setOpen(false)} anchor={anchor} />}
    </div>
  )
}

function ReceiptDetail({ e, atts, services, methods, agents, flags, T, sb, tt, user, entries = [], orderedIds = [], onOpenId, onOpenLinked, onLinkToggle, onBack, backLabel, onEditModal, onStatus, onSave, onOpenByNo, onAttsChanged, onDelete }) {
  // الانتقال لسند القبض التالي — بنفس ترتيب القائمة التي يراها المستخدم (تصفية + فرز)،
  // ويسقط إلى ترتيب التحميل الكامل إن لم يكن السند ضمن القائمة المصفّاة حالياً.
  const navIds = (orderedIds.length ? orderedIds : entries.map(x => x.id))
  const curIdx = navIds.indexOf(e.id)
  const prevId = (curIdx > 0) ? navIds[curIdx - 1] : null
  const nextId = (curIdx >= 0 && curIdx < navIds.length - 1) ? navIds[curIdx + 1] : null
  // ── مراحل حالة السند ─────────────────────────────────────────────────
  // مسودة (افتراضية عند رفع الصور) → المدخِل يعتمدها «مكتمل» أو يعلّمها «يحتاج مراجعة»؛
  // ثم المراجع يدقّقها «مدقق» أو يعيدها «يحتاج مراجعة». كل انتقال يُحكَم بصلاحية المرحلة.
  const [statusModal, setStatusModal] = useState(false)
  const [statusOk, setStatusOk] = useState(false)
  const [statusBusy, setStatusBusy] = useState(false)
  const [statusPick, setStatusPick] = useState(null)   // الحالة المختارة قبل الاعتماد بزر «تعديل الحالة»
  const [delModal, setDelModal] = useState(false)
  const [delBusy, setDelBusy] = useState(false)
  const doDelete = async () => {
    if (delBusy) return
    setDelBusy(true)
    await onDelete?.(e.id)
    setDelBusy(false)
  }
  // بوّابات الصلاحيات — كل مرحلة صلاحية مستقلة (نفس نمط مراحل المعاملة في الفواتير)
  const canDo = (perm) => {
    if (isGmUser(user)) return true
    if (perm === 'any') return can(user, 'jub1_receipts.stage_reopen')
    return can(user, 'jub1_receipts.' + perm)
  }
  // enforcement: التحرير المباشر (بيانات/دفعات/ربط السندات) يتطلب صلاحية jub1_receipts.edit
  const canEditReceipt = can(user, 'jub1_receipts.edit')
  // بوّابات البطاقات والحقول والنوافذ (فعّالة — تُخفي/تُقفل فعلياً لا مجرد عرض في اللوحة)
  const cardOn = (k) => cardVisible(user, TAB, k)
  const fVis = (k) => fieldVisible(user, TAB, k)
  const fEdit = (k) => fieldEditable(user, TAB, k)
  const canLink = canCardBtn(user, TAB, 'linked_receipts', 'link')
  // انتقالات كل حالة: [الحالة الهدف، الصلاحية المطلوبة] — كل انتقال بصلاحيته الدقيقة
  const STATUS_FLOW = {
    draft:        [['complete', 'mark_complete'], ['needs_review', 'stage_flag'], ['cancelled', 'stage_cancel']],
    complete:     [['reviewed', 'mark_reviewed'], ['needs_review', 'stage_flag'], ['cancelled', 'stage_cancel']],
    needs_review: [['complete', 'mark_complete'], ['reviewed', 'mark_reviewed'], ['draft', 'stage_reopen'], ['cancelled', 'stage_cancel']],
    reviewed:     [['needs_review', 'stage_flag'], ['draft', 'stage_reopen'], ['cancelled', 'stage_cancel']],
    cancelled:    [['draft', 'stage_reopen']],
  }
  const STATUS_DESC = {
    complete:     T('البيانات صحيحة ومكتملة — جاهز للمراجعة', 'Data verified & complete — ready for review'),
    needs_review: T('عليه ملاحظة تحتاج مراجعة أو تصحيح', 'Has an issue needing review or fixing'),
    reviewed:     T('تم تدقيق البيانات وربط السندات', 'Data and receipt-linking verified'),
    draft:        T('إرجاع إلى مسودة', 'Send back to draft'),
    cancelled:    T('السند ملغى — لا يُحتسب في الإجماليات', 'Cancelled — excluded from totals'),
  }
  // المدير العام: ينتقل لأي حالة من أي حالة (مكتمل→مسودة أو أي شيء) بلا قيود المسار.
  // غير المدير: خيار الانتقال يظهر فقط إن مُنِحت صلاحيته وكانت مرحلته الهدف ظاهرة لهذا الدور.
  const ALL_STATUSES = ['draft', 'complete', 'needs_review', 'reviewed', 'cancelled']
  const statusOptions = isGmUser(user)
    ? ALL_STATUSES.filter(s => s !== e.review_status).map(s => [s, null])
    : (STATUS_FLOW[e.review_status] || []).filter(([to, perm]) => canDo(perm) && stageVisible(user, TAB, to))
  // تغيير الحالة يعيد تحميل السند من القاعدة، فتضيع أي تعديلات معلّقة في الكروت.
  // لذا نحفظ التعديلات غير المحفوظة أولاً (إن وُجدت وكان يملك صلاحية التعديل) ثم نغيّر الحالة.
  const commitThenStatus = async (to) => {
    if (dirty && canEditReceipt) await doSave()
    await onStatus(to)
  }
  const applyStatus = async (to) => {
    if (statusBusy) return
    setStatusBusy(true)
    await commitThenStatus(to)
    setStatusBusy(false)
    setStatusOk(true)
    setTimeout(() => { setStatusOk(false); setStatusModal(false); setStatusPick(null) }, 1000)
  }
  // تدوير الصور — أغلب صور الواتساب مقلوبة. اللف فوري للعرض، وبعد ثانية ونصف من آخر
  // لفّة يُحفظ الاتجاه نهائياً: تُعاد كتابة الصورة مدوّرة في التخزين ويحدَّث المرفق،
  // فتبقى صحيحة بعد الخروج ولكل من يفتحها.
  // زاوية الدوران تُخزَّن كرقم في العمود attachments.rotation وتُطبَّق بـ CSS فقط —
  // لا إعادة ترميز ولا رفع ولا توستر: القلب فوري ويبقى على آخر زاوية عند إعادة الفتح.
  const [rot, setRot] = useState({})
  useEffect(() => { setRot(Object.fromEntries((atts || []).map(a => [a.id, ((a.rotation || 0) % 360 + 360) % 360]))) }, [atts])

  const spin = (id) => {
    const next = (((rot[id] || 0) + 90) % 360)
    setRot(p => ({ ...p, [id]: next }))
    // حفظ فوري في قاعدة البيانات — لا تأخير كي لا يضيع عند الخروج مباشرة بعد القلب
    sb.from('attachments').update({ rotation: next }).eq('id', id).then(({ error }) => { if (error) tt(T('تعذّر حفظ الاتجاه', 'Could not save rotation')) })
  }
  const st = STATUS[e.review_status] || STATUS.draft

  // ── التحرير المباشر في الكروت ──────────────────────────────────────────
  const [f, setF] = useState(() => initDetailForm(e))
  const [prevInput, setPrevInput] = useState('')
  const [saving, setSaving] = useState(false)
  // إعادة المزامنة عند تغيّر السند (فتح سند آخر أو بعد حفظ/تغيير حالة)
  useEffect(() => { setF(initDetailForm(e)); setPrevInput('') }, [e.id, e.updated_at])
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const dirty = useMemo(() => snapForm(f) !== snapForm(initDetailForm(e)), [f, e])

  // ── ربط السندات — المعتمد هو رقم السند وصورته ───────────────────────────
  // خطوة الاكتمال (مسودة): المدخِل يسجّل أرقام السندات المرتبطة كما تظهر على صورة السند
  // (أو تُعبَّأ من القراءة الآلية) — تُخزَّن في previous_receipt_nos وتُحفظ من شريط الحفظ.
  // بعد «مكتمل»: تُبنى الصورة الكاملة — كل رقم يُطابَق بسنده المسجّل (بصورته) للربط اليدوي،
  // والأرقام بلا سند تُعلَّم «غير موجود»، مع ملخص المجموعة (الإجمالي/المقبوض/المتبقي)
  // ليتأكد المراجع أن الصورة مكتملة ودقيقة قبل «مدقق».
  const linkedIds = useMemo(() => e.linked_receipt_ids || [], [e.linked_receipt_ids])
  const [linkBusy, setLinkBusy] = useState(null)          // معرّف السند الجاري ربطه/فكّه
  const [imgByReceipt, setImgByReceipt] = useState({})    // معرّف السند → أول صورة (أو null)
  const imgRef = useRef({})
  useEffect(() => { imgRef.current = imgByReceipt }, [imgByReceipt])

  const norm = (s) => String(s || '').trim()
  // كل رقم مسجّل → السندات المطابقة له (الرقم غير فريد؛ الحسم من الصورة)
  const resolution = useMemo(() => f.prevNos.map(no => {
    const k = norm(no)
    return {
      no,
      matches: entries.filter(x => x.id !== e.id && !x.deleted_at &&
        (norm(x.primary_receipt_no) === k || (x.payments || []).some(p => norm(p.sanad_no) === k))),
    }
  }), [f.prevNos, entries, e.id])
  const missingNos = resolution.filter(r => !r.matches.length).map(r => r.no)
  const linkedRows = useMemo(() => entries.filter(x => linkedIds.includes(x.id)), [entries, linkedIds])
  // مرتبطة فعلياً لكن رقمها غير مسجّل في القائمة — تُعرض كي لا يغيب شيء عن المراجع
  const matchedIds = useMemo(() => new Set(resolution.flatMap(r => r.matches.map(m => m.id))), [resolution])
  const extraLinked = useMemo(() => linkedRows.filter(r => !matchedIds.has(r.id)), [linkedRows, matchedIds])
  // حسبات التنازل المسجّلة لنفس العامل (نفس رقم الهوية/الإقامة) — تظهر داخل كرت «حسبة التنازل»
  // في سندات نقل الكفالة، بدل أن تكون سنداً مستقلاً في القائمة.
  const idKey = norm(f.client_id_no)
  const calcMatches = useMemo(() => (idKey.length >= 5 && !e.is_transfer_calc)
    ? entries.filter(x => x.is_transfer_calc && x.id !== e.id && !x.deleted_at && norm(x.client_id_no) === idKey)
    : [], [entries, e.id, idKey, e.is_transfer_calc])
  // قائمة مسطّحة لكل الظاهر (لتحميل الصور)
  const allShown = useMemo(() => {
    const seen = new Set(), out = []
    ;[...linkedRows, ...resolution.flatMap(r => r.matches), ...calcMatches].forEach(r => { if (!seen.has(r.id)) { seen.add(r.id); out.push(r) } })
    return out
  }, [linkedRows, resolution, calcMatches])
  // الصورة الكاملة تظهر بعد اعتماد «مكتمل» — قبلها الخطوة هي تسجيل الأرقام فقط
  const linkResolved = e.review_status !== 'draft'

  // حمّل أول صورة لكل سند معروض (مرّة واحدة لكل معرّف)
  useEffect(() => {
    const ids = allShown.map(r => r.id).filter(id => !(id in imgRef.current))
    if (!ids.length) return
    let alive = true
    sb.from('attachments').select('entity_id,file_url').eq('entity_type', JUB1_ENTITY).in('entity_id', ids).is('deleted_at', null)
      .then(({ data }) => {
        if (!alive) return
        const m = {}
        ;(data || []).forEach(a => { if (!(a.entity_id in m)) m[a.entity_id] = a.file_url })
        ids.forEach(id => { if (!(id in m)) m[id] = null })
        setImgByReceipt(p => ({ ...p, ...m }))
      })
    return () => { alive = false }
  }, [sb, allShown])

  const toggleLink = async (targetId, link) => {
    if (!canLink) return
    setLinkBusy(targetId)
    await onLinkToggle?.(e.id, targetId, link)
    setLinkBusy(null)
  }

  // الحساب الإلكتروني — يُحسب لحظياً من الحقول
  const liveTotal = num(f.total_amount)
  const livePaid = num(f.primary_receipt_amount) + f.payments.reduce((s, p) => s + num(p.amount), 0)
  const planSum = f.plan.reduce((s, p) => s + num(p.amount), 0)
  // مقبوض المجموعة = مقبوض هذا السند + مبالغ السندات المرتبطة (كل سند = صورة واحدة بمبلغها الأساسي)
  const groupPaid = livePaid + linkedRows.reduce((s, r) => s + num(r.primary_receipt_amount), 0)

  const addPrevNo = (raw) => {
    const parts = String(raw || '').split(/[،,;\s]+/).map(x => x.trim()).filter(Boolean)
    if (!parts.length) return
    set('prevNos', [...f.prevNos, ...parts.filter(x => !f.prevNos.includes(x))])
    setPrevInput('')
  }

  const doSave = async () => {
    if (saving || !canEditReceipt) return
    setSaving(true)
    const patch = {
      client_name: f.client_name || null, client_phone: f.client_phone || null, client_id_no: f.client_id_no || null,
      agent_name: f.agent_name || null,
      service_item_id: f.service_item_id || null, service_code: f.service_code || null,
      quantity: f.quantity ? parseInt(f.quantity, 10) || null : null,
      total_amount: f.total_amount ? num(f.total_amount) : null,
      primary_receipt_amount: f.primary_receipt_amount ? num(f.primary_receipt_amount) : null,
      primary_receipt_no: f.primary_receipt_no || null,
      receipt_date: f.receipt_date || null,
      notes: f.notes || null,
      is_transfer_calc: !!f.is_transfer_calc,
      previous_receipt_nos: f.prevNos.join('، ') || null,
      installment_plan: f.plan.map(({ _k, ...p }) => ({ label: p.label, amount: p.amount ? num(p.amount) : null, paid: !!p.paid })),
      transfer_calc: f.transfer_calc
        ? { ...f.transfer_calc, fields: (f.transfer_calc.fields || []).map(({ _k, ...r }) => ({ label: r.label || '', value: r.value || '' })) }
        : null,
    }
    await onSave(e.id, patch, f.payments)
    setSaving(false)
  }

  // ── حسبة التنازل (نقل الكفالة) — رفع يدوي + قراءة آلية لكل بنودها للمراجعة ──────────
  const [tcBusy, setTcBusy] = useState(false)
  const tcFileRef = useRef(null)
  const tc = f.transfer_calc
  const setTc = (patch) => setF(p => ({ ...p, transfer_calc: { image_url: '', image_path: '', image_name: '', fields: [], note: '', ...(p.transfer_calc || {}), ...patch } }))
  const fileToB64tc = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(file) })
  const uploadTc = async (file) => {
    if (!file) return
    try {
      const safe = (file.name || 'calc').replace(/[^\w.\-]+/g, '_')
      const path = `jub1_transfer_calc/${e.id}/${Date.now()}_${rid()}_${safe}`
      const { error } = await sb.storage.from('attachments').upload(path, file, { cacheControl: '3600', upsert: false })
      if (error) throw error
      const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
      setTc({ image_url: pub?.publicUrl || path, image_path: path, image_name: file.name || '' })
      tt(T('تم رفع حسبة التنازل — اضغط «قراءة الحسبة»', 'Calculation uploaded — press "Read"'))
    } catch (err) { tt(T('تعذّر رفع الحسبة: ', 'Upload failed: ') + (err?.message || err)) }
  }
  const readTc = async () => {
    if (tcBusy) return
    if (!tc?.image_url) { tt(T('ارفع صورة الحسبة أولاً', 'Upload the calculation image first')); return }
    setTcBusy(true)
    try {
      const resp = await fetch(tc.image_url)
      const blob = await resp.blob()
      const b64 = await fileToB64tc(blob)
      const { data, error } = await sb.functions.invoke('jub1-transfer-calc-ocr', { body: { image_base64: b64, media_type: blob.type || 'image/jpeg' } })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.error || T('فشلت القراءة', 'OCR failed'))
      const r = data.result || {}
      setTc({ fields: (r.fields || []).map(x => ({ _k: rid(), label: x.label || '', value: x.value || '' })), note: r.uncertain_note || '' })
      tt(T('تمت قراءة الحسبة — راجع الحقول وصحّح ما يلزم', 'Read — review & correct the fields'))
    } catch (err) { tt(T('تعذّرت قراءة الحسبة: ', 'Read failed: ') + (err?.message || err)) }
    finally { setTcBusy(false) }
  }
  const setTcField = (k, key, val) => setTc({ fields: (tc.fields || []).map(x => x._k === k ? { ...x, [key]: val } : x) })
  const addTcField = () => setTc({ fields: [...((tc && tc.fields) || []), { _k: rid(), label: '', value: '' }] })
  const delTcField = (k) => setTc({ fields: (tc.fields || []).filter(x => x._k !== k) })
  const removeTc = () => setF(p => ({ ...p, transfer_calc: null }))
  const showTc = f.service_code === 'transfer' || !!f.transfer_calc || calcMatches.length > 0

  // ── أدوات عرض/إدخال (دوال تُستدعى — لا مكوّنات متداخلة كي لا يفقد الإدخال التركيز) ──
  const card = { borderRadius: 16, background: 'var(--card-grad2)', border: '1px solid var(--bd)', boxShadow: 'var(--shadow-sm)', padding: '16px 18px' }
  // بطاقة تُخفى فعلياً للأدوار الممنوعة من رؤيتها (بوّابة cardVisible) — لا مجرد عرض في اللوحة
  const cardStyle = (k) => (cardOn(k) ? card : { display: 'none' })
  const planEditable = fEdit('installment_plan')
  const tcEditable = fEdit('tc_fields')
  const numsEditable = fEdit('linked_numbers')
  const tcCanRead = canCardBtn(user, TAB, 'transfer_calc', 'read')
  const cardTitle = (label, hint) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 10 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 700, color: 'var(--tx)' }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#B07D00', boxShadow: '0 0 8px rgba(176,125,0,.6)' }} />{label}
      </span>
      {hint && <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600 }}>{hint}</span>}
    </div>
  )
  const box = { borderRadius: 12, padding: '8px 12px 9px', background: 'var(--inputBg)', border: '1px solid var(--bd)', minWidth: 0 }
  const lblS = { fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, marginBottom: 3 }
  // كل الحقول تبدأ من اليمين: العربية بحكم الاتجاه (start=يمين)، والأرقام/الجوال/التاريخ نُبقي direction:ltr
  // لصحّة ترتيب الأرقام لكن نحاذيها لليمين (textAlign:right) فتبدأ من الحافة اليمنى مثل بقية الحقول.
  const inpS = (ltr) => ({ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 600, color: 'var(--tx)', fontFamily: 'Cairo, Tajawal, sans-serif', direction: ltr ? 'ltr' : undefined, textAlign: ltr ? 'right' : 'start', padding: 0, fontVariantNumeric: 'tabular-nums' })
  // fld = مفتاح الحقل في كتالوج الصلاحيات (افتراضياً = مفتاح الحالة). يُخفى إن مُنِع عرضه،
  // ويصبح للقراءة فقط إن قُفِل تعديله لهذا الدور (fieldEditable يتحقق أيضاً من صلاحية التعديل).
  const inp = (k, key, { ltr, type = 'text', placeholder, list, fld = key } = {}) => {
    if (fld && !fVis(fld)) return null
    const ro = fld ? !fEdit(fld) : !canEditReceipt
    return (
      <div style={box}>
        <div style={lblS}>{k}</div>
        <input type={type} value={f[key] ?? ''} onChange={ev => { if (!ro) set(key, ev.target.value) }} readOnly={ro}
          placeholder={placeholder || '—'} list={list} style={{ ...inpS(ltr), opacity: ro ? .65 : 1, cursor: ro ? 'not-allowed' : 'text' }} />
      </div>
    )
  }
  const roField = (k, v, strong) => (
    <div style={box}>
      <div style={lblS}>{k}</div>
      <div style={{ fontSize: 14.5, fontWeight: 700, color: strong ? '#B07D00' : 'var(--tx)', direction: 'ltr', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{v}</div>
    </div>
  )
  const grid2 = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8 }
  const rowInp = { height: 36, padding: '0 10px', borderRadius: 9, border: '1px solid var(--bd)', background: 'var(--inputBg)', color: 'var(--tx)', fontFamily: 'Cairo, Tajawal, sans-serif', fontSize: 12.5, fontWeight: 600, outline: 'none', boxSizing: 'border-box' }
  const delBtn = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(192,57,43,.25)', background: 'rgba(192,57,43,.06)', color: '#c0392b', cursor: 'pointer', flexShrink: 0 }
  const addBtn = { display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 14px', borderRadius: 9, border: '1px dashed rgba(176,125,0,.45)', background: 'transparent', color: '#B07D00', cursor: 'pointer', fontFamily: 'Cairo, Tajawal, sans-serif', fontSize: 12, fontWeight: 700, alignSelf: 'flex-start' }

  // بطاقة سند مطابق/مرتبط — صورة + بيانات مختصرة + زر ربط/فك (دالة عرض لا مكوّن كي لا يُعاد الإنشاء)
  const linkReceiptCard = (r) => {
    const on = linkedIds.includes(r.id)
    const img = imgByReceipt[r.id]
    const busy = linkBusy === r.id
    const rst = STATUS[r.review_status] || STATUS.draft
    return (
      <div key={r.id} style={{ borderRadius: 12, border: `1px solid ${on ? 'rgba(31,122,69,.5)' : 'var(--bd)'}`, background: on ? 'rgba(31,122,69,.06)' : 'var(--inputBg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div onClick={() => onOpenLinked?.(r.id)} title={T('فتح السند', 'Open receipt')}
          style={{ height: 120, background: 'var(--bd2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {img ? <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={26} color="var(--tx5)" />}
        </div>
        <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.client_name || T('بدون اسم', 'No name')}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: rst.c, background: rst.c + '1a', padding: '2px 7px', borderRadius: 6, flexShrink: 0 }}>{T(rst.l, rst.e)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--tx3)', fontWeight: 600, fontVariantNumeric: 'tabular-nums', flexWrap: 'wrap' }}>
            <span style={{ direction: 'ltr' }}>#{r.primary_receipt_no || '—'}</span><span>·</span>
            <span style={{ direction: 'ltr' }}>{fmt(num(r.primary_receipt_amount) || paidOf(r))}</span><span>·</span>
            <span style={{ direction: 'ltr' }}>{dt(r.receipt_date)}</span>
          </div>
          <button onClick={() => toggleLink(r.id, !on)} disabled={busy || !canLink}
            style={{ marginTop: 3, height: 32, borderRadius: 8, cursor: (busy || !canLink) ? 'default' : 'pointer', fontFamily: 'Cairo, Tajawal, sans-serif', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: (busy || !canLink) ? .6 : 1,
              border: on ? '1px solid rgba(192,57,43,.35)' : '1px solid rgba(31,122,69,.45)',
              background: on ? 'rgba(192,57,43,.06)' : 'rgba(31,122,69,.1)',
              color: on ? '#c0392b' : 'var(--ok,#1f7a45)' }}>
            {on ? <><X size={13} /> {T('إلغاء الربط', 'Unlink')}</> : <><Check size={13} strokeWidth={3} /> {T('ربط', 'Link')}</>}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* رجوع للقائمة (يمين) + تنقّل بين السندات: السابق/التالي (يسار) */}
      {(() => {
        const navBtn = (onClick, enabled, label, dir) => (
          <button onClick={() => { if (enabled) onClick() }} disabled={!enabled}
            title={dir === 'prev' ? T('السند السابق', 'Previous receipt') : T('السند التالي', 'Next receipt')}
            onMouseEnter={ev => { if (enabled) ev.currentTarget.style.background = 'rgba(176,125,0,.10)' }}
            onMouseLeave={ev => { ev.currentTarget.style.background = 'transparent' }}
            style={{ cursor: enabled ? 'pointer' : 'not-allowed', opacity: enabled ? 1 : .4, fontFamily: 'Cairo, Tajawal, sans-serif', display: 'inline-flex', alignItems: 'center', gap: 7, height: 38, padding: '0 15px', borderRadius: 10, background: 'transparent', border: '1px solid rgba(176,125,0,.5)', color: '#B07D00', fontSize: 12, fontWeight: 700, boxShadow: 'var(--shadow-sm)', transition: '.15s' }}>
            {dir === 'prev' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>}
            <span>{label}</span>
            {dir === 'next' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>}
          </button>
        )
        return (
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <BackButton onClick={onBack} label={backLabel || T('رجوع للقائمة', 'Back to list')} isAr={T(true, false)} />
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {navBtn(() => onOpenId?.(prevId), !!prevId, T('السابق', 'Previous'), 'prev')}
          {navBtn(() => onOpenId?.(nextId), !!nextId, T('التالي', 'Next'), 'next')}
        </div>
      </div>
        )
      })()}

      {/* الترويسة */}
      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Receipt size={26} style={{ color: '#B07D00', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#B07D00', letterSpacing: '-.2px' }}>{T('تفاصيل سند القبض', 'Receipt details')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)', direction: 'ltr' }}>{e.primary_receipt_no ? `#${e.primary_receipt_no}` : T('بدون رقم', 'No number')}</span>
              <span style={{ fontSize: 12, color: 'var(--tx3)', direction: 'ltr' }}>{dt(e.receipt_date)}</span>
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, color: st.c, background: st.c + '18' }}>{st.l}</span>
              <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>JUB1</span>
            </div>
          </div>
        </div>
        {/* حالة السند — زر واحد يفتح نافذة اختيار المرحلة (يظهر فقط إن سُمح بنافذة الحالة) */}
        {modalAllowed(user, TAB, 'receipt_status') && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => { setStatusOk(false); setStatusPick(null); setStatusModal(true) }}
            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(.93)' }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}
            style={{ minWidth: 120, height: 38, padding: '0 12px', borderRadius: 8, background: 'linear-gradient(160deg,#23201a,#141210)', border: '1px solid rgba(176,125,0,.5)', color: '#F0CB6A', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'Cairo, Tajawal, sans-serif', fontSize: 12, fontWeight: 600, boxShadow: '0 2px 7px rgba(0,0,0,.12), inset 0 1px 0 rgba(176,125,0,.1)', transition: 'filter .15s ease' }}>
            <span>{T('الحالة', 'Status')}</span>
          </button>
        </div>
        )}
      </div>

      {/* ملاحظات القراءة/الفحص */}
      {(flags.length > 0 || e.review_note) && (
        <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 12, background: 'rgba(192,57,43,.06)', border: '1px solid rgba(192,57,43,.2)', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {flags.length > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#c0392b', fontSize: 12, fontWeight: 700 }}>
              <AlertTriangle size={14} /> {flags.join('، ')}
            </span>
          )}
          {e.review_note && <span style={{ fontSize: 12, color: '#e67e22', fontWeight: 600 }}>{e.review_note}</span>}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* نوع السجل — «حسبة تنازل»: يُستبعد من القائمة/الإجماليات ويظهر في كرت «حسبة التنازل» لسندات نقل كفالة نفس العامل */}
        <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, ...(f.is_transfer_calc ? { border: '1px solid rgba(124,58,237,.45)', background: 'rgba(124,58,237,.05)' } : {}) }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 700, color: f.is_transfer_calc ? '#7c3aed' : 'var(--tx)' }}>
              <FileText size={15} /> {T('هذا السجل حسبة تنازل (وليس سند قبض)', 'This record is a transfer calculation (not a receipt)')}
            </span>
            <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, lineHeight: 1.6 }}>
              {T('يُستبعد من قائمة السندات والإجماليات، وتظهر صورته في كرت «حسبة التنازل» لسندات نقل كفالة نفس العامل (مطابقة الهوية/الإقامة).', "Excluded from the receipts list & totals; shown in the “Transfer calculation” card of the same worker's transfer receipts (ID/Iqama match).")}
            </span>
          </div>
          <button onClick={() => { if (canEditReceipt) set('is_transfer_calc', !f.is_transfer_calc) }} disabled={!canEditReceipt}
            title={T('تبديل نوع السجل', 'Toggle record type')}
            style={{ position: 'relative', width: 46, height: 26, borderRadius: 20, border: 'none', cursor: canEditReceipt ? 'pointer' : 'not-allowed', flexShrink: 0, direction: 'ltr', transition: '.15s', opacity: canEditReceipt ? 1 : .5, background: f.is_transfer_calc ? '#7c3aed' : 'rgba(120,120,120,.35)' }}>
            <span style={{ position: 'absolute', top: 3, left: f.is_transfer_calc ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .15s', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
          </button>
        </div>

        {/* صورة السند */}
        <div style={cardStyle('receipt_image')}>
          {cardTitle(T('صورة السند', 'Receipt image'))}
          {atts.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--tx4)', padding: '10px 0' }}>{T('لا توجد صور مرفقة — من «الصور والقراءة الآلية» أعلاه', 'No images — use "Images & OCR" above')}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {atts.map(a => {
                const d = rot[a.id] || 0
                const sideways = d % 180 !== 0
                return (
                  <div key={a.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* عارض كبير — الموظف ينقل البيانات منه مباشرة */}
                    <div style={{ position: 'relative', width: '100%', minHeight: 320, height: 'min(72vh, 640px)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 14, border: '1px solid var(--bd)', background: 'rgba(0,0,0,.035)' }}>
                      <img src={a.file_url} alt={a.file_name || ''}
                        style={{
                          transform: `rotate(${d}deg)`, transition: 'transform .25s ease',
                          ...(sideways
                            ? { maxWidth: 'min(72vh, 640px)', maxHeight: 'none' }
                            : { maxWidth: '100%', maxHeight: '100%' }),
                          objectFit: 'contain', display: 'block',
                        }} />
                      {/* أزرار عائمة فوق الصورة */}
                      <div style={{ position: 'absolute', top: 10, insetInlineEnd: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button onClick={() => spin(a.id)} title={T('اقلب الصورة 90°', 'Rotate 90°')}
                          style={{ width: 42, height: 42, borderRadius: 11, border: '1px solid rgba(176,125,0,.4)', background: 'var(--modal-bg)', color: '#B07D00', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-md)' }}>
                          <RotateCw size={19} />
                        </button>
                        <a href={a.file_url} target="_blank" rel="noreferrer" title={T('فتح بالحجم الكامل', 'Open full size')}
                          style={{ width: 42, height: 42, borderRadius: 11, border: '1px solid var(--bd)', background: 'var(--modal-bg)', color: 'var(--tx3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-md)' }}>
                          <ExternalLink size={17} />
                        </a>
                      </div>
                    </div>
                    {a.file_name && <span style={{ fontSize: 11, color: 'var(--tx4)', direction: 'ltr', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.file_name}</span>}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* حالة الإلغاء — لافتة بارزة تحت كرت سند القبض عندما يكون السند ملغياً */}
        {e.review_status === 'cancelled' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderRadius: 14, background: 'rgba(107,114,128,.10)', border: '1px solid rgba(107,114,128,.45)' }}>
            <span style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(107,114,128,.18)', color: '#6b7280', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <X size={20} strokeWidth={2.6} />
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 14.5, fontWeight: 800, color: '#6b7280' }}>{T('سند ملغي', 'Cancelled receipt')}</span>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--tx3)' }}>{T('هذا السند ملغى ولا يُحتسب في الإجماليات', 'This receipt is cancelled and excluded from totals')}</span>
            </div>
          </div>
        )}

        {/* العميل — تحرير مباشر */}
        <div style={cardStyle('client')}>
          {cardTitle(T('العميل', 'Client'), T('عدّل مباشرة ثم احفظ من الشريط السفلي', 'Edit inline, save below'))}
          <div style={grid2}>
            {inp(T('الاسم', 'Name'), 'client_name')}
            {inp(T('الجوال', 'Phone'), 'client_phone', { ltr: true })}
            {inp(T('الهوية', 'ID no'), 'client_id_no', { ltr: true })}
          </div>
        </div>

        {/* سند القبض — تحرير مباشر + أرقام السندات السابقة كرقائق */}
        <div style={cardStyle('receipt_voucher')}>
          {cardTitle(T('سند القبض', 'Receipt voucher'))}
          <div style={grid2}>
            {inp(T('مبلغ السند المقبوض', 'Receipt amount'), 'primary_receipt_amount', { ltr: true })}
            {inp(T('رقم السند', 'Receipt no'), 'primary_receipt_no', { ltr: true })}
            {fVis('receipt_date') && (fEdit('receipt_date')
              ? <DateBox label={T('تاريخ السند', 'Date')} value={f.receipt_date} onChange={v => set('receipt_date', v)} />
              : roField(T('تاريخ السند', 'Date'), dt(f.receipt_date)))}
          </div>
          {/* السند ملغي — مفتاح يدوي يضبط حالة السند (ملغي ⇄ مسودة) */}
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 12, background: e.review_status === 'cancelled' ? 'rgba(192,57,43,.06)' : 'var(--inputBg)', border: `1px solid ${e.review_status === 'cancelled' ? 'rgba(192,57,43,.3)' : 'var(--bd)'}`, transition: '.15s' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: e.review_status === 'cancelled' ? '#c0392b' : 'var(--tx2)' }}>{T('السند ملغي', 'Receipt cancelled')}</span>
              <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600 }}>{T('فعّله إذا كان مكتوباً على السند «ملغي» أو عليه X بالأحمر', 'Turn on if marked cancelled / red X')}</span>
            </div>
            {(() => {
              // enforcement: الإلغاء يتطلب stage_cancel، وإلغاء الإلغاء (→مسودة) يتطلب stage_reopen — نفس بوّابة نافذة الحالة
              const canToggleCancel = (e.review_status === 'cancelled' ? canDo('stage_reopen') : canDo('stage_cancel'))
                && canCardBtn(user, TAB, 'receipt_voucher', 'stage_cancel')
              return (
            <button onClick={() => { if (!canToggleCancel) return; commitThenStatus(e.review_status === 'cancelled' ? 'draft' : 'cancelled') }} disabled={!canToggleCancel} title={T('تبديل حالة الإلغاء', 'Toggle cancelled')}
              style={{ position: 'relative', width: 46, height: 26, borderRadius: 20, border: 'none', cursor: canToggleCancel ? 'pointer' : 'not-allowed', flexShrink: 0, direction: 'ltr', transition: '.15s', opacity: canToggleCancel ? 1 : .5, background: e.review_status === 'cancelled' ? '#c0392b' : 'rgba(120,120,120,.35)' }}>
              <span style={{ position: 'absolute', top: 3, left: e.review_status === 'cancelled' ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .15s', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
            </button>
              )
            })()}
          </div>
        </div>

        {/* الخدمة — تحرير مباشر */}
        <div style={cardStyle('service')}>
          {cardTitle(T('الخدمة', 'Service'))}
          <div style={grid2}>
            {fVis('service_type') && (fEdit('service_type')
              ? <ServiceBox label={T('نوع الخدمة', 'Service type')} value={f.service_item_id}
                  options={popupServices(services, f.service_item_id)}
                  onChange={o => setF(p => ({ ...p, service_item_id: o.id, service_code: o.code || '' }))} />
              : roField(T('نوع الخدمة', 'Service type'), services.find(s => s.id === f.service_item_id)?.value_ar || '—'))}
            {/* لا يظهر خيار «بلا خدمة» بعد الاختيار — الفراغ يظهر كـ placeholder فقط */}
            {inp(T('الكمية', 'Quantity'), 'quantity', { ltr: true })}
            {inp(T('المبلغ الإجمالي للخدمة', 'Service total'), 'total_amount', { ltr: true })}
          </div>
        </div>

        {/* توزيع الدفعات — تحرير مباشر */}
        <div style={cardStyle('installment_plan')}>
          {cardTitle(T('توزيع الدفعات المقترح', 'Suggested installment plan'), planSum ? `${T('المجموع', 'Sum')}: ${fmt(planSum)}` : null)}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {f.plan.map(p => (
              <div key={p._k} style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <input value={p.label} readOnly={!planEditable} onChange={ev => set('plan', f.plan.map(x => x._k === p._k ? { ...x, label: ev.target.value } : x))}
                  placeholder={T('وصف (مثال: الدفعة الأولى)', 'Label')} style={{ ...rowInp, flex: 1, minWidth: 160, opacity: planEditable ? 1 : .65 }} />
                <input value={p.amount} readOnly={!planEditable} onChange={ev => set('plan', f.plan.map(x => x._k === p._k ? { ...x, amount: ev.target.value.replace(/[^\d.]/g, '') } : x))}
                  placeholder={T('المبلغ', 'Amount')} style={{ ...rowInp, width: 120, direction: 'ltr', textAlign: 'center', opacity: planEditable ? 1 : .65 }} />
                {/* تاق «وصل» — هل دُفعت هذه الدفعة (وصلت)؟ اضغط للتبديل: أخضر=مدفوع، رمادي=لم يصل بعد */}
                <button type="button" disabled={!planEditable} title={p.paid ? T('مدفوع — اضغط للإلغاء', 'Paid — click to clear') : T('لم يصل بعد — اضغط للتأكيد', 'Not received — click to confirm')}
                  onClick={() => { if (planEditable) set('plan', f.plan.map(x => x._k === p._k ? { ...x, paid: !x.paid } : x)) }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 36, padding: '0 12px', borderRadius: 9, cursor: 'pointer', flexShrink: 0,
                    fontFamily: 'Cairo, Tajawal, sans-serif', fontSize: 12, fontWeight: 700, transition: '.15s',
                    border: p.paid ? '1px solid rgba(31,122,69,.5)' : '1px dashed var(--bd)',
                    background: p.paid ? 'rgba(31,122,69,.12)' : 'var(--inputBg)',
                    color: p.paid ? 'var(--ok, #1f7a45)' : 'var(--tx4)' }}>
                  {p.paid ? <Check size={13} strokeWidth={3} /> : <CircleDashed size={13} />}
                  {p.paid ? T('وصل', 'Paid') : T('وصل؟', 'Paid?')}
                </button>
                {planEditable && <button onClick={() => set('plan', f.plan.filter(x => x._k !== p._k))} style={delBtn}><Trash2 size={13} /></button>}
              </div>
            ))}
            {planEditable && <button onClick={() => set('plan', [...f.plan, { _k: rid(), label: '', amount: '', paid: false }])} style={addBtn}><Plus size={13} /> {T('إضافة دفعة', 'Add row')}</button>}
          </div>
        </div>

        {/* ربط السندات — المعتمد رقم السند وصورته: تسجيل الأرقام في خطوة الاكتمال، والصورة الكاملة بعد «مكتمل» */}
        <div style={cardStyle('linked_receipts')}>
          {cardTitle(T('ربط السندات', 'Link receipts'), T('المعتمد رقم سند القبض وصورته', 'Receipt number & image are authoritative'))}

          {/* أرقام السندات المرتبطة — رقائق تُضاف من صورة السند (أو من القراءة الآلية)، وتُحفظ من شريط الحفظ */}
          <div style={box}>
            <div style={lblS}>{T('أرقام السندات المرتبطة بهذا السند — سجّلها كما تظهر على الصورة', 'Linked receipt numbers — as written on the voucher image')}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 4 }}>
              {f.prevNos.map((n, i) => {
                const found = !!(resolution[i] && resolution[i].matches.length)
                return (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 9,
                    background: found ? 'rgba(31,122,69,.08)' : 'rgba(192,57,43,.06)',
                    border: `1px solid ${found ? 'rgba(31,122,69,.4)' : 'rgba(192,57,43,.35)'}` }}>
                    <span title={found ? T('يوجد سند مسجّل بهذا الرقم', 'A receipt exists with this number') : T('لا يوجد سند مسجّل بهذا الرقم بعد', 'No receipt registered with this number yet')}
                      style={{ width: 7, height: 7, borderRadius: '50%', background: found ? 'var(--ok,#1f7a45)' : '#c0392b', flexShrink: 0 }} />
                    <button onClick={() => onOpenByNo(n)} title={T('فتح السند المرتبط', 'Open linked receipt')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: found ? 'var(--ok,#1f7a45)' : '#c0392b', fontWeight: 700, fontSize: 12.5, fontFamily: 'Cairo, Tajawal, sans-serif', direction: 'ltr', padding: 0 }}>{n}</button>
                    {numsEditable && <button onClick={() => set('prevNos', f.prevNos.filter((_, j) => j !== i))} title={T('إزالة', 'Remove')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx4)', display: 'inline-flex', padding: 0 }}><X size={12} /></button>}
                  </span>
                )
              })}
              {numsEditable && <input value={prevInput} onChange={ev => setPrevInput(ev.target.value)}
                onKeyDown={ev => { if (ev.key === 'Enter') { ev.preventDefault(); addPrevNo(prevInput) } }}
                onBlur={() => addPrevNo(prevInput)}
                placeholder={T('أضف رقماً + Enter', 'Add no + Enter')}
                style={{ ...inpS(true), width: 150, flex: '0 0 auto' }} />}
            </div>
          </div>

          {!linkResolved ? (
            /* خطوة الاكتمال: تسجيل الأرقام فقط — الصورة الكاملة تُبنى بعد اعتماد «مكتمل» */
            <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 12, border: '1px dashed var(--bd)', fontSize: 11.5, color: 'var(--tx4)', fontWeight: 600, lineHeight: 1.8 }}>
              {T('في خطوة الاكتمال سجّل الأرقام فقط. بعد اعتماد السند «مكتمل» تُعرض هنا الصورة الكاملة: مطابقة كل رقم بسنده المسجّل وربطها، وتمييز السندات غير الموجودة، والتحقق من الإجمالي والمقبوض والمتبقي.',
                'At the completion step just record the numbers. Once the receipt is marked complete, the full picture appears here: each number matched to its registered receipt for linking, missing receipts flagged, and totals verified.')}
            </div>
          ) : (
            /* بعد «مكتمل»: الصورة الكاملة للمراجعة — كل رقم وسنده + غير الموجود + ملخص المجموعة */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
              {resolution.map(({ no, matches }) => (
                <div key={no}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--tx2)', direction: 'ltr' }}>#{no}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                      ...(matches.length ? { color: 'var(--ok,#1f7a45)', background: 'rgba(31,122,69,.1)' } : { color: '#c0392b', background: 'rgba(192,57,43,.08)' }) }}>
                      {matches.length ? `${matches.length} ${T('سند مطابق', 'matching')}` : T('سند غير موجود', 'Receipt missing')}
                    </span>
                  </div>
                  {matches.length ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 8 }}>{matches.map(linkReceiptCard)}</div>
                  ) : (
                    <div style={{ padding: '10px 14px', borderRadius: 10, border: '1px dashed rgba(192,57,43,.4)', background: 'rgba(192,57,43,.04)', fontSize: 11.5, color: '#c0392b', fontWeight: 600 }}>
                      {T('لا يوجد سند مسجّل بهذا الرقم — أدخِله من صورته لتكتمل الصورة', 'No receipt registered with this number — enter it from its image to complete the picture')}
                    </div>
                  )}
                </div>
              ))}
              {/* مرتبطة فعلياً لكن رقمها غير مسجّل أعلاه */}
              {extraLinked.length > 0 && (
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--tx2)', marginBottom: 6 }}>{T('مرتبطة بهذا السند (رقمها غير مسجّل أعلاه)', 'Linked to this receipt (number not listed above)')}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 8 }}>{extraLinked.map(linkReceiptCard)}</div>
                </div>
              )}
              {/* ملخص المجموعة — الصورة المالية بعد الربط */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 12, border: '1px solid var(--bd)', background: 'var(--inputBg)', fontSize: 12, fontWeight: 600, color: 'var(--tx3)', fontVariantNumeric: 'tabular-nums' }}>
                <span>{T('الإجمالي', 'Total')}: <b style={{ color: 'var(--tx)', direction: 'ltr', display: 'inline-block' }}>{liveTotal ? fmt(liveTotal) : '—'}</b></span>
                <span style={{ color: 'var(--tx5)' }}>·</span>
                <span>{T('المقبوض (مع المرتبطة)', 'Received (incl. linked)')}: <b style={{ color: 'var(--ok,#1f7a45)', direction: 'ltr', display: 'inline-block' }}>{fmt(groupPaid)}</b></span>
                <span style={{ color: 'var(--tx5)' }}>·</span>
                <span>{T('المتبقي', 'Remaining')}: <b style={{ color: '#B07D00', direction: 'ltr', display: 'inline-block' }}>{liveTotal ? fmt(Math.max(0, liveTotal - groupPaid)) : '—'}</b></span>
                <span style={{ marginInlineStart: 'auto', fontSize: 11, color: 'var(--tx4)' }}>{T('المرتبطة', 'Linked')}: <b style={{ color: 'var(--ok,#1f7a45)' }}>{linkedIds.length}</b></span>
              </div>
              {missingNos.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 13px', borderRadius: 10, border: '1px solid rgba(192,57,43,.3)', background: 'rgba(192,57,43,.05)', fontSize: 11.5, fontWeight: 600, color: '#c0392b' }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                  {T('سندات غير موجودة: ', 'Missing receipts: ')}<b style={{ direction: 'ltr' }}>{missingNos.join('، ')}</b> — {T('قد يكون باقي المقبوض فيها؛ أدخِلها من صورها ليكتمل التدقيق', 'the remaining amount may be there; enter them from their images to complete the review')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* التفاصيل — مربّع نصّي حر لأي ملاحظات/تفاصيل عن السند */}
        <div style={cardStyle('details')}>
          {cardTitle(T('التفاصيل', 'Details'), T('أي تفاصيل أو ملاحظات عن السند', 'Any notes or details about the receipt'))}
          {fVis('notes') && (
            <textarea value={f.notes} readOnly={!fEdit('notes')}
              onChange={ev => { if (fEdit('notes')) set('notes', ev.target.value) }}
              placeholder={T('اكتب أي تفاصيل هنا…', 'Write any details here…')} rows={4}
              style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: 92, borderRadius: 12, padding: '10px 12px', background: 'var(--inputBg)', border: '1px solid var(--bd)', color: 'var(--tx)', fontFamily: 'Cairo, Tajawal, sans-serif', fontSize: 13.5, fontWeight: 600, lineHeight: 1.7, outline: 'none', opacity: fEdit('notes') ? 1 : .65, cursor: fEdit('notes') ? 'text' : 'not-allowed' }} />
          )}
        </div>

        {/* الحساب — إلكتروني (قراءة فقط) */}
        <div style={cardStyle('totals')}>
          {cardTitle(T('الحساب', 'Totals'), T('إلكتروني — يُحسب تلقائياً ولا يُعدَّل', 'Computed automatically — read-only'))}
          <div style={grid2}>
            {fVis('totals_total') && roField(T('الإجمالي', 'Total'), liveTotal ? fmt(liveTotal) : '—')}
            {fVis('totals_received') && roField(T('المقبوض', 'Received'), fmt(livePaid))}
            {fVis('totals_remaining') && roField(T('المتبقي', 'Remaining'), liveTotal ? fmt(Math.max(0, liveTotal - livePaid)) : '—', true)}
          </div>
        </div>

        {/* الوسيط — كرت مستقل في آخر الصفحة */}
        <div style={cardStyle('agent')}>
          {cardTitle(T('الوسيط', 'Agent'))}
          <div style={grid2}>
            {inp(T('اسم الوسيط', 'Agent name'), 'agent_name', { list: 'rd_agents' })}
            <datalist id="rd_agents">{agents.map((a, i) => <option key={i} value={a} />)}</datalist>
          </div>
        </div>

        {/* حسبة التنازل — لخدمة نقل الكفالة: رفع يدوي + قراءة آلية لكل البنود للمراجعة */}
        {showTc && cardOn('transfer_calc') && (
          <div style={card}>
            {cardTitle(T('حسبة التنازل', 'Transfer calculation'), T('نقل الكفالة — ارفع الحسبة ثم اقرأها للمراجعة', 'Sponsorship transfer — upload then read for review'))}
            {/* حسبات التنازل المسجّلة لنفس العامل (سجلات مُعلَّمة «حسبة تنازل» بنفس الهوية/الإقامة) */}
            {calcMatches.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  <FileText size={13} style={{ color: '#7c3aed' }} />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--tx2)' }}>{T('حسبة تنازل مسجّلة لنفس العامل', 'Transfer calc registered for this worker')}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', direction: 'ltr' }}>{idKey}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx4)' }}>({calcMatches.length})</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 8 }}>
                  {calcMatches.map(c => {
                    const img = imgByReceipt[c.id]
                    return (
                      <div key={c.id} onClick={() => onOpenLinked?.(c.id)} title={T('فتح حسبة التنازل', 'Open the calculation')}
                        style={{ borderRadius: 12, border: '1px solid rgba(124,58,237,.4)', background: 'rgba(124,58,237,.05)', overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ height: 130, background: 'var(--bd2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {img ? <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FileText size={26} color="var(--tx5)" />}
                        </div>
                        <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#7c3aed', direction: 'ltr' }}>#{c.primary_receipt_no || '—'}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{c.total_amount ? fmt(c.total_amount) : ''}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            <input ref={tcFileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
              onChange={ev => { const file = ev.target.files?.[0]; ev.target.value = ''; uploadTc(file) }} />
            {!tc?.image_url ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
                {tcEditable ? (
                  <button onClick={() => tcFileRef.current?.click()} style={{ ...addBtn, height: 38, padding: '0 16px' }}>
                    <ImageIcon size={15} /> {T('ارفع حسبة التنازل', 'Upload calculation')}
                  </button>
                ) : <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600 }}>{T('لا توجد حسبة مرفقة', 'No calculation attached')}</span>}
                {tcEditable && <span style={{ fontSize: 11, color: 'var(--tx4)' }}>{T('صورة أو PDF — تُقرأ آلياً بعد الرفع', 'Image or PDF — read after upload')}</span>}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <a href={tc.image_url} target="_blank" rel="noreferrer" title={T('فتح بالحجم الكامل', 'Open full size')}
                    style={{ width: 96, height: 96, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--bd)', flexShrink: 0, display: 'block', background: 'rgba(0,0,0,.04)' }}>
                    {/\.pdf(\?|$)/i.test(tc.image_url)
                      ? <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tx3)' }}><FileText size={28} /></div>
                      : <img src={tc.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </a>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {tcCanRead && (
                      <button onClick={readTc} disabled={tcBusy} style={{ ...btnGold, opacity: tcBusy ? .6 : 1, cursor: tcBusy ? 'wait' : 'pointer' }}>
                        {tcBusy ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <FileText size={14} />}
                        {tcBusy ? T('جارٍ قراءة الحسبة…', 'Reading…') : T('قراءة الحسبة', 'Read calculation')}
                      </button>
                    )}
                    {tcEditable && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => tcFileRef.current?.click()} style={addBtn}><RotateCw size={13} /> {T('استبدال', 'Replace')}</button>
                        <button onClick={removeTc} style={{ ...delBtn, width: 'auto', padding: '0 12px', height: 32, gap: 6 }}><Trash2 size={13} /> {T('إزالة', 'Remove')}</button>
                      </div>
                    )}
                  </div>
                </div>
                {tc.note && (
                  <div style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(230,126,34,.08)', border: '1px solid rgba(230,126,34,.25)', fontSize: 11.5, color: '#e67e22', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={13} /> {T('تنبيه القراءة: ', 'OCR note: ')}{tc.note}
                  </div>
                )}
                {(tc.fields || []).length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--tx4)', padding: '6px 0' }}>{T('اضغط «قراءة الحسبة» لاستخراج البنود، أو أضِفها يدوياً', 'Press "Read" to extract items, or add manually')}</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {tc.fields.map(x => (
                      <div key={x._k} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input value={x.label} readOnly={!tcEditable} onChange={ev => setTcField(x._k, 'label', ev.target.value)} placeholder={T('البند', 'Label')} style={{ ...rowInp, flex: '1 1 40%', opacity: tcEditable ? 1 : .65 }} />
                        <input value={x.value} readOnly={!tcEditable} onChange={ev => setTcField(x._k, 'value', ev.target.value)} placeholder={T('القيمة', 'Value')} style={{ ...rowInp, flex: '1 1 40%', direction: 'ltr', textAlign: 'right', opacity: tcEditable ? 1 : .65 }} />
                        {tcEditable && <button onClick={() => delTcField(x._k)} style={delBtn}><Trash2 size={14} /></button>}
                      </div>
                    ))}
                  </div>
                )}
                {tcEditable && <button onClick={addTcField} style={addBtn}><Plus size={14} /> {T('إضافة بند', 'Add item')}</button>}
              </div>
            )}
          </div>
        )}

        {/* حذف السند — إجراء خطر بعرض كامل في آخر الصفحة (نُقل من الأعلى) */}
        {onDelete && (isGmUser(user) || can(user, 'jub1_receipts.delete')) && modalAllowed(user, TAB, 'receipt_delete') && (
          <button onClick={() => setDelModal(true)}
            onMouseEnter={ev => { ev.currentTarget.style.background = 'rgba(192,57,43,.12)' }}
            onMouseLeave={ev => { ev.currentTarget.style.background = 'rgba(192,57,43,.06)' }}
            style={{ width: '100%', boxSizing: 'border-box', cursor: 'pointer', fontFamily: 'Cairo, Tajawal, sans-serif', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, height: 48, padding: '0 18px', borderRadius: 14, background: 'rgba(192,57,43,.06)', border: '1px solid rgba(192,57,43,.35)', color: '#c0392b', fontSize: 13.5, fontWeight: 700, letterSpacing: '.2px', transition: '.15s' }}>
            <Trash2 size={16} /><span>{T('حذف السند', 'Delete receipt')}</span>
          </button>
        )}
      </div>

      {/* شريط الحفظ العائم — يظهر فقط عند وجود تعديلات غير محفوظة */}
      {dirty && canEditReceipt && (
        <div style={{ position: 'sticky', bottom: 14, zIndex: 30, display: 'flex', justifyContent: 'center', marginTop: 18 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 16px', borderRadius: 14, background: 'var(--modal-bg)', border: '1px solid rgba(176,125,0,.4)', boxShadow: '0 12px 34px rgba(0,0,0,.28)' }}>
            <span style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 700 }}>{T('تعديلات غير محفوظة', 'Unsaved changes')}</span>
            <button onClick={() => { setF(initDetailForm(e)); setPrevInput('') }}
              style={{ height: 36, padding: '0 14px', borderRadius: 9, border: '1px solid var(--bd)', background: 'var(--inputBg)', color: 'var(--tx3)', cursor: 'pointer', fontFamily: 'Cairo, Tajawal, sans-serif', fontSize: 12.5, fontWeight: 700 }}>
              {T('تجاهل', 'Discard')}
            </button>
            <button onClick={doSave} disabled={saving} style={{ ...btnGold, opacity: saving ? .6 : 1 }}>
              <Check size={15} /> {saving ? T('جارٍ الحفظ…', 'Saving…') : T('حفظ التعديلات', 'Save changes')}
            </button>
          </div>
        </div>
      )}

      {/* نافذة تغيير الحالة — خيارات المرحلة حسب الحالة الحالية والصلاحيات */}
      {statusModal && (
        <FKModal open onClose={() => { if (!statusBusy) setStatusModal(false) }} title={T('حالة السند', 'Receipt status')} Icon={CheckCircle2} width={470}
          success={statusOk ? <SuccessView title={T('تم تحديث الحالة', 'Status updated')} /> : null}
          footer={statusOptions.length > 0 ? (
            <ActionButton dir="back" Icon={CheckCircle2} color="var(--accent)" disabled={!statusPick || statusBusy} onClick={() => applyStatus(statusPick)}>
              {statusBusy ? T('جارٍ التعديل…', 'Updating…') : T('تعديل الحالة', 'Update status')}
            </ActionButton>
          ) : null}>
          <ModalSection Icon={CheckCircle2} label={T('اختر الحالة', 'Choose status')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 12, color: 'var(--tx3)', fontWeight: 600 }}>
              {T('الحالة الحالية', 'Current')}:
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: st.c, fontWeight: 700 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: st.c }} /> {T(st.l, st.e)}
              </span>
            </div>
            {statusOptions.length === 0 ? (
              <div style={{ padding: 18, textAlign: 'center', fontSize: 12.5, color: 'var(--tx4)', fontWeight: 600, border: '1px dashed var(--bd)', borderRadius: 12 }}>
                {T('لا توجد إجراءات متاحة بصلاحياتك على هذه الحالة', 'No status actions available with your permissions')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {statusOptions.map(([to]) => {
                  const S = STATUS[to]
                  const Ico = to === 'cancelled' ? X : to === 'needs_review' ? AlertTriangle : to === 'draft' ? RotateCw : to === 'reviewed' ? Check : CheckCircle2
                  const sel = statusPick === to
                  return (
                    <button key={to} onClick={() => setStatusPick(to)} disabled={statusBusy}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'start', padding: '12px 14px', borderRadius: 12, cursor: statusBusy ? 'default' : 'pointer', opacity: statusBusy ? .6 : 1,
                        border: `1px solid ${S.c}${sel ? 'ff' : '55'}`, background: S.c + (sel ? '22' : '10'), boxShadow: sel ? `inset 0 0 0 1px ${S.c}, 0 0 0 3px ${S.c}22` : 'none', fontFamily: 'Cairo, Tajawal, sans-serif', transition: '.15s' }}>
                      <span style={{ width: 38, height: 38, borderRadius: 10, background: S.c + '1e', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: S.c }}>
                        <Ico size={19} strokeWidth={2.2} />
                      </span>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: S.c }}>{T(S.l, S.e)}</span>
                        <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--tx3)', lineHeight: 1.5 }}>{STATUS_DESC[to]}</span>
                      </span>
                      {sel && <Check size={18} strokeWidth={2.6} color={S.c} style={{ flexShrink: 0 }} />}
                    </button>
                  )
                })}
              </div>
            )}
          </ModalSection>
        </FKModal>
      )}

      {/* نافذة تأكيد حذف السند */}
      {delModal && (
        <FKModal open onClose={() => { if (!delBusy) setDelModal(false) }} title={T('حذف السند', 'Delete receipt')} Icon={Trash2} variant="delete" width={430}>
          <ModalSection Icon={AlertTriangle} label={T('تأكيد الحذف', 'Confirm delete')}>
            <div style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 600, lineHeight: 1.7 }}>
              {T('سيُحذف سند القبض', 'The receipt')} <b style={{ direction: 'ltr', display: 'inline-block' }}>#{e.primary_receipt_no || '—'}</b> {T('من القائمة. هل أنت متأكد؟', 'will be deleted. Are you sure?')}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button onClick={() => setDelModal(false)} disabled={delBusy}
                style={{ height: 40, padding: '0 16px', borderRadius: 10, border: '1px solid var(--bd)', background: 'var(--inputBg)', color: 'var(--tx3)', cursor: 'pointer', fontFamily: 'Cairo, Tajawal, sans-serif', fontSize: 13, fontWeight: 700 }}>
                {T('إلغاء', 'Cancel')}
              </button>
              <button onClick={doDelete} disabled={delBusy}
                style={{ height: 40, padding: '0 18px', borderRadius: 10, border: 'none', background: '#c0392b', color: '#fff', cursor: delBusy ? 'wait' : 'pointer', fontFamily: 'Cairo, Tajawal, sans-serif', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8, opacity: delBusy ? .7 : 1 }}>
                <Trash2 size={15} /> {delBusy ? T('جارٍ الحذف…', 'Deleting…') : T('حذف السند', 'Delete')}
              </button>
            </div>
          </ModalSection>
        </FKModal>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// NewReceiptModal — «سند جديد» مبسّط: ارفع صور السندات فقط، تُقرأ آلياً (OCR)
// ويُحفظ كل سند كمسودة تلقائياً مع صورته، ويُراجَع/يُكمَّل لاحقاً من صفحة التفاصيل.
// كل صورة = مسودة سند مستقلة؛ حتى لو فشلت القراءة تُحفظ المسودة بصورتها كي لا يضيع شيء.
// ═══════════════════════════════════════════════════════════════════════
function NewReceiptModal({ sb, user, lang, tt, branch, services, onClose }) {
  const T = (ar, en) => (lang === 'ar' ? ar : en)
  const [items, setItems] = useState([])          // {key,file,name,thumb,status,summary,warn,note,entryId,error}
  const [running, setRunning] = useState(false)
  const [saved, setSaved] = useState(false)        // عرض شاشة النجاح داخل النافذة قبل الإغلاق
  const itemsRef = useRef([])                      // مرجع متزامن — يقرؤه محرّك المعالجة كي لا يتأثر بإغلاقات الحالة القديمة
  const runningRef = useRef(false)
  const commit = (nx) => { itemsRef.current = nx; setItems(nx) }
  const patch = (key, p) => commit(itemsRef.current.map(i => i.key === key ? { ...i, ...p } : i))

  const fileToB64 = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(file) })
  const matchService = (txt) => {
    const t = String(txt || '').trim()
    if (!t) return null
    let hit = services.find(o => o.value_ar === t) || services.find(o => t.includes(o.value_ar) || o.value_ar.includes(t))
    if (!hit) { const code = svcSynonymCode(t); if (code) hit = services.find(o => o.code === code) }
    return hit ? { service_item_id: hit.id, service_code: hit.code } : null
  }
  const summarize = (r) => {
    const bits = [r.client_name, r.receipt_no && '#' + r.receipt_no, r.total_amount != null && (fmt(r.total_amount) + ' ' + T('ريال', 'SAR'))].filter(Boolean)
    return bits.length ? bits.join(' · ') : T('لم تُقرأ بيانات — مسودة فارغة', 'No data read — empty draft')
  }

  // معالجة صورة واحدة: قراءة آلية ← بناء صف مسودة ← إدراج ← رفع الصورة كمرفق
  const processOne = async (file) => {
    let b64 = null; const mediaType = file.type || 'image/jpeg'
    if (/^image\//.test(file.type || '')) { try { b64 = await fileToB64(file) } catch { b64 = null } }
    let r = {}, readNote = null
    if (b64) {
      try {
        const { data, error } = await sb.functions.invoke('jub1-receipt-ocr', { body: { image_base64: b64, media_type: mediaType } })
        if (error) throw error
        if (!data?.ok) throw new Error(data?.error || T('فشلت القراءة', 'OCR failed'))
        r = data.result || {}
      } catch (e) { readNote = T('تعذّرت القراءة الآلية', 'Auto-read failed') + ': ' + (e.message || e) }
    } else {
      readNote = T('ملف غير صورة — لم يُقرأ آلياً', 'Non-image file — not auto-read')
    }
    const svc = matchService(r.service_text)
    const row = {
      branch_id: branch?.id || null,
      client_name: r.client_name || null, client_phone: r.client_phone || null, client_id_no: r.client_id_no || null,
      agent_name: r.agent_name || null,
      service_item_id: svc?.service_item_id || null, service_code: svc?.service_code || null,
      quantity: r.quantity != null ? parseInt(r.quantity, 10) : null,
      total_amount: r.total_amount != null ? num(r.total_amount) : null,
      primary_receipt_no: r.receipt_no || null,
      primary_receipt_amount: r.receipt_amount != null ? num(r.receipt_amount) : null,
      previous_receipt_nos: (r.previous_receipt_nos || []).join('، ') || null,
      receipt_date: r.receipt_date || null,
      installment_plan: (r.installments || []).map(x => ({ label: x.label || '', amount: x.amount != null ? num(x.amount) : null })),
      review_note: [r.uncertain_note, readNote].filter(Boolean).join(' · ') || null,
      review_status: r.is_cancelled ? 'cancelled' : 'draft',
      created_by: user?.id || null, updated_by: user?.id || null,
    }
    const { data: ins, error: insErr } = await sb.from('jub1_receipts').insert(row).select('id').single()
    if (insErr) throw insErr
    const entryId = ins.id
    // رفع الصورة كمرفق (فشلها لا يُلغي المسودة المحفوظة)
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
    } catch { /* تجاهل فشل رفع الصورة */ }
    return { entryId, summary: summarize(r), warn: !!readNote, note: readNote }
  }

  // محرّك المعالجة — يعالج الصور المضافة تِباعاً (واحدة تلو الأخرى) حتى تفرغ الطابور
  const pump = useCallback(async () => {
    if (runningRef.current) return
    runningRef.current = true; setRunning(true)
    try {
      while (true) {
        const next = itemsRef.current.find(i => i.status === 'pending')
        if (!next) break
        patch(next.key, { status: 'reading' })
        try {
          const res = await processOne(next.file)
          patch(next.key, { status: 'done', ...res })
        } catch (e) {
          patch(next.key, { status: 'error', error: e.message || String(e) })
        }
      }
    } finally { runningRef.current = false; setRunning(false) }
  }, [])

  // صورة واحدة فقط — تُخزَّن مؤقتاً (بلا قراءة/حفظ) وتُعالَج فقط عند الضغط على «تم».
  const addFiles = (arr) => {
    const file = (arr || [])[0]
    if (!file) return
    itemsRef.current.forEach(i => i.thumb && URL.revokeObjectURL(i.thumb))
    commit([{
      key: rid(), file, name: file.name || 'ملف',
      thumb: /^image\//.test(file.type || '') ? URL.createObjectURL(file) : null,
      status: 'pending', summary: null, warn: false, note: null, entryId: null, error: null,
    }])
  }
  const clearStaged = () => { itemsRef.current.forEach(i => i.thumb && URL.revokeObjectURL(i.thumb)); commit([]) }

  // «تم»: إن وُجدت صورة مُخزَّنة تُقرأ وتُحفظ الآن ثم تُغلق النافذة؛ بلا صورة = إغلاق فقط.
  const finish = async () => {
    if (runningRef.current) return
    if (itemsRef.current.some(i => i.status === 'pending')) {
      await pump()
      if (itemsRef.current.some(i => i.status === 'error')) return  // تبقى مفتوحة عند الفشل ليراها المستخدم
      setSaved(true)                                     // شاشة نجاح داخل النافذة ثم إغلاق تلقائي
      setTimeout(onClose, 1200)
      return
    }
    onClose()
  }
  useEffect(() => () => { itemsRef.current.forEach(i => i.thumb && URL.revokeObjectURL(i.thumb)) }, [])

  const staged = items[0] || null
  const body = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <ModalSection Icon={ImageIcon} label={T('صورة سند القبض', 'Receipt image')} style={{ marginTop: 4 }}>
        <FileField value={staged?.file || null}
          onChange={file => file ? addFiles([file]) : clearStaged()} accept="image/*,application/pdf" />
        {staged?.status === 'error' && (
          <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 9, background: 'rgba(192,57,43,.08)', border: '1px solid rgba(192,57,43,.25)', fontSize: 11.5, color: '#c0392b', fontFamily: 'Cairo', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={13} /> {staged.error}
          </div>
        )}
        <div style={{ marginTop: 8, fontSize: 10, color: 'var(--tx4)', fontFamily: 'Cairo', lineHeight: 1.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {T('عند الضغط على «تم» تُقرأ الصورة وتُحفظ كمسودة، وتُكمَّل لاحقاً من صفحة التفاصيل.',
             'On “Done” the image is read & saved as a draft, completed later from the detail page.')}
        </div>
      </ModalSection>
    </div>
  )

  const footStart = null

  return (
    <FKModal open onClose={onClose} lang={lang} variant="create" width={480} scroll
      title={T('سند قبض جديد', 'New receipt')}
      Icon={Receipt}
      success={saved ? <SuccessView title={T('تم رفع سند القبض بنجاح', 'Receipt uploaded successfully')} /> : null}
      footerStart={footStart}
      footer={<ActionButton dir="back" Icon={Check} color="var(--accent)" disabled={running} onClick={finish}>
        {running ? T('جارٍ المعالجة…', 'Processing…') : T('تم', 'Done')}
      </ActionButton>}>
      {body}
    </FKModal>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// نموذج تعديل السند (التحرير الكامل — يُفتح من صفحة التفاصيل)
// ═══════════════════════════════════════════════════════════════════════
function EntryModal({ sb, user, lang, tt, branch, services, methods, agents, entry, isGM, onClose, onSaved }) {
  const T = (ar, en) => (lang === 'ar' ? ar : en)
  const [f, setF] = useState(entry)
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const paid = num(f.primary_receipt_amount) + (f.payments || []).reduce((s, p) => s + num(p.amount), 0)
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
  const addPlan = () => set('installment_plan', [...(f.installment_plan || []), { _k: rid(), label: '', amount: '', paid: false }])
  const setPlan = (k, key, val) => set('installment_plan', f.installment_plan.map(p => p._k === k ? { ...p, [key]: val } : p))
  const delPlan = (k) => set('installment_plan', f.installment_plan.filter(p => p._k !== k))

  // خيارات القائمة = خدمات نافذة الفاتورة فقط (مع إبقاء المختار حالياً إن كان خارجها)
  const svcOpt = popupServices(services, f.service_item_id).map(s => ({ id: s.id, label: s.value_ar, code: s.code }))
  // مطابقة قراءة OCR تبحث في كامل الخدمات (لا تُقيَّد بقائمة النافذة) كي لا تفوت أي نص مقروء
  const svcOptAll = services.map(s => ({ id: s.id, label: s.value_ar, code: s.code }))
  const isVisa = /visa/i.test(f.service_code || '')

  // ── قراءة السند بالذكاء الاصطناعي (edge fn: jub1-receipt-ocr) ────────────
  // يقرأ أول صورة (مرفوعة الآن أو محفوظة سابقاً)، يعبّي الحقول، والموظف يراجع ويصحّح.
  const [ocrBusy, setOcrBusy] = useState(false)
  const fileToB64 = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(file) })
  const matchService = (txt) => {
    const t = String(txt || '').trim()
    if (!t) return null
    let hit = svcOptAll.find(o => o.label === t) || svcOptAll.find(o => t.includes(o.label) || o.label.includes(t))
    if (!hit) { const code = svcSynonymCode(t); if (code) hit = svcOptAll.find(o => o.code === code) }
    return hit ? { service_item_id: hit.id, service_code: hit.code } : null
  }
  const readReceipt = async () => {
    if (ocrBusy) return
    let b64 = null, mediaType = 'image/jpeg'
    const nf = (f.newFiles || []).find(x => /^image\//.test(x.type || ''))
    if (nf) { b64 = await fileToB64(nf); mediaType = nf.type }
    else {
      // لا صورة جديدة — جرّب أول صورة محفوظة (وضع التعديل)
      const ex = (f.existingFiles || []).find(a => /\.(jpe?g|png|webp|gif)(\?|$)/i.test(a.file_url || ''))
      if (ex) {
        try {
          const resp = await fetch(ex.file_url)
          const blob = await resp.blob()
          mediaType = blob.type || 'image/jpeg'
          b64 = await fileToB64(blob)
        } catch { /* يسقط للتنبيه أدناه */ }
      }
    }
    if (!b64) { tt(T('أرفق صورة السند أولاً (JPG/PNG)', 'Attach a receipt image first (JPG/PNG)')); return }
    setOcrBusy(true)
    try {
      const { data, error } = await sb.functions.invoke('jub1-receipt-ocr', { body: { image_base64: b64, media_type: mediaType } })
      if (error) throw error
      if (!data?.ok) throw new Error(data?.error || T('فشلت القراءة', 'OCR failed'))
      const r = data.result || {}
      setF(p => ({
        ...p,
        client_name: r.client_name ?? p.client_name,
        client_phone: r.client_phone ?? p.client_phone,
        client_id_no: r.client_id_no ?? p.client_id_no,
        agent_name: r.agent_name ?? p.agent_name,
        quantity: r.quantity != null ? String(r.quantity) : p.quantity,
        total_amount: r.total_amount != null ? String(r.total_amount) : p.total_amount,
        primary_receipt_amount: r.receipt_amount != null ? String(r.receipt_amount) : p.primary_receipt_amount,
        primary_receipt_no: r.receipt_no ?? p.primary_receipt_no,
        receipt_date: r.receipt_date ?? p.receipt_date,
        previous_receipt_nos: (r.previous_receipt_nos || []).join('، ') || p.previous_receipt_nos,
        installment_plan: (r.installments || []).length
          ? r.installments.map(x => ({ _k: rid(), label: x.label || '', amount: x.amount != null ? String(x.amount) : '' }))
          : p.installment_plan,
        review_note: r.uncertain_note || p.review_note,
        review_status: r.is_cancelled ? 'cancelled' : p.review_status,
        _svc_text: r.service_text || null,
        ...(matchService(r.service_text) || {}),
      }))
      tt(r.is_cancelled
        ? T('السند مكتوب عليه «ملغي» — عُيّنت الحالة ملغي، راجع الحقول', 'Marked cancelled — review fields')
        : T('تمت قراءة السند — راجع الحقول وصحّح ما يلزم', 'Receipt read — review & correct'))
    } catch (e) {
      tt(T('تعذّرت قراءة السند: ', 'OCR failed: ') + (e.message || e))
    } finally { setOcrBusy(false) }
  }

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
        primary_receipt_amount: f.primary_receipt_amount ? num(f.primary_receipt_amount) : null,
        previous_receipt_nos: f.previous_receipt_nos || null,
        receipt_date: f.receipt_date || null,
        installment_plan: (f.installment_plan || []).map(({ _k, ...p }) => ({ ...p, amount: p.amount ? num(p.amount) : null })),
        notes: f.notes || null,
        review_note: f.review_note || null,
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
      {/* صورة السند — أولاً: يرفعها الموظف ثم يقرؤها الذكاء الاصطناعي ويعبّي الحقول */}
      <ModalSection Icon={ImageIcon} label={T('صورة السند', 'Receipt image')}>
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
        <FileField label={T('أضف صور السند (متعدّد)', 'Add receipt images')} value={f.newFiles} onChange={v => set('newFiles', v)} multiple accept="image/*,application/pdf" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          <button onClick={readReceipt} disabled={ocrBusy}
            style={{ ...btnGold, opacity: ocrBusy ? .6 : 1, cursor: ocrBusy ? 'wait' : 'pointer' }}>
            {ocrBusy ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <FileText size={14} />}
            {ocrBusy ? T('جارٍ قراءة السند…', 'Reading receipt…') : T('قراءة السند وتعبئة الحقول', 'Read receipt & fill fields')}
          </button>
          <span style={{ fontSize: 11, color: 'var(--tx4)', fontFamily: 'Cairo' }}>
            {T('ارفع الصورة ثم اضغط القراءة — تُعبَّأ الحقول تلقائياً وتبقى مراجعتها وتصحيحها عليك', 'Upload then click read — fields are auto-filled for your review')}
          </span>
        </div>
        {f._svc_text && !f.service_item_id && (
          <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--warn)', fontFamily: 'Cairo' }}>
            {T('الخدمة المكتوبة على السند: ', 'Service on receipt: ')}<b>{f._svc_text}</b> — {T('لم تُطابَق تلقائياً، اخترها يدوياً', 'no auto-match, pick manually')}
          </div>
        )}
        {f.review_note && (
          <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 9, background: 'rgba(230,126,34,.08)', border: '1px solid rgba(230,126,34,.25)', fontSize: 11.5, color: '#e67e22', fontFamily: 'Cairo', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={13} /> {T('تنبيه القراءة: ', 'OCR note: ')}{f.review_note}
          </div>
        )}
      </ModalSection>

      {/* العميل */}
      <ModalSection Icon={FileText} label={T('العميل', 'Client')}>
        <div style={GRID}>
          <TextField label={T('اسم العميل', 'Client name')} value={f.client_name} onChange={v => set('client_name', v)} />
          <TextField label={T('جوال العميل', 'Phone')} value={f.client_phone} onChange={v => set('client_phone', v)} dir="ltr" align="center" />
          <TextField label={T('رقم الهوية', 'ID number')} value={f.client_id_no} onChange={v => set('client_id_no', v)} dir="ltr" align="center" />
        </div>
      </ModalSection>

      {/* الخدمة */}
      <ModalSection Icon={Receipt} label={T('الخدمة', 'Service')}>
        <div style={GRID}>
          <Select label={T('نوع الخدمة', 'Service')} value={f.service_item_id} options={svcOpt}
            getKey={o => o.id} getLabel={o => o.label} placeholder={T('اختر الخدمة', 'Select service')}
            onChange={id => { const o = svcOpt.find(x => x.id === id); setF(p => ({ ...p, service_item_id: id, service_code: o?.code || '' })) }} />
          <NumberField label={T('الكمية', 'Quantity') + (isVisa ? ' ⚑' : '')} value={f.quantity} onChange={v => set('quantity', v)} min={1} />
          <CurrencyField label={T('المبلغ الإجمالي للخدمة', 'Service total amount')} value={f.total_amount} onChange={v => set('total_amount', v)} />
        </div>
      </ModalSection>

      {/* توزيع الدفعات */}
      <ModalSection Icon={FileText} label={T('توزيع الدفعات المقترح (اختياري)', 'Suggested installment plan (optional)')}>
        <RowEditor rows={f.installment_plan} onAdd={addPlan} addLabel={T('إضافة دفعة للجدول', 'Add plan row')} lang={lang}
          render={(p) => (
            <>
              <input value={p.label || ''} onChange={e => setPlan(p._k, 'label', e.target.value)} placeholder={T('وصف (مثال: الدفعة الأولى)', 'Label')}
                style={cellInput} />
              <input value={p.amount || ''} onChange={e => setPlan(p._k, 'amount', e.target.value.replace(/[^\d.]/g, ''))} placeholder={T('المبلغ', 'Amount')}
                style={{ ...cellInput, width: 120, direction: 'ltr', textAlign: 'center' }} />
              {/* تاق «وصل» — هل دُفعت هذه الدفعة؟ أخضر=مدفوع، رمادي=لم يصل بعد */}
              <button type="button" title={p.paid ? T('مدفوع — اضغط للإلغاء', 'Paid — click to clear') : T('لم يصل بعد — اضغط للتأكيد', 'Not received — click to confirm')}
                onClick={() => setPlan(p._k, 'paid', !p.paid)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 36, padding: '0 12px', borderRadius: 9, cursor: 'pointer', flexShrink: 0,
                  fontFamily: 'Cairo, Tajawal, sans-serif', fontSize: 12, fontWeight: 700, transition: '.15s',
                  border: p.paid ? '1px solid rgba(31,122,69,.5)' : '1px dashed var(--bd)',
                  background: p.paid ? 'rgba(31,122,69,.12)' : 'var(--inputBg)',
                  color: p.paid ? 'var(--ok, #1f7a45)' : 'var(--tx4)' }}>
                {p.paid ? <Check size={13} strokeWidth={3} /> : <CircleDashed size={13} />}
                {p.paid ? T('وصل', 'Paid') : T('وصل؟', 'Paid?')}
              </button>
              <button onClick={() => delPlan(p._k)} style={rowDel}><Trash2 size={14} /></button>
            </>
          )} />
        {planSum > 0 && <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 6 }}>{T('مجموع التوزيع', 'Plan total')}: <b style={{ color: 'var(--tx)' }}>{fmt(planSum)}</b></div>}
      </ModalSection>

      {/* سند القبض — بيانات هذا السند تحديداً */}
      <ModalSection Icon={Receipt} label={T('سند القبض', 'Receipt voucher')}>
        <div style={GRID}>
          <CurrencyField label={T('مبلغ السند المقبوض', 'Receipt amount')} value={f.primary_receipt_amount} onChange={v => set('primary_receipt_amount', v)} />
          <TextField label={T('رقم السند', 'Receipt no')} value={f.primary_receipt_no} onChange={v => set('primary_receipt_no', v)} dir="ltr" align="center" />
          <DateField label={T('تاريخ السند', 'Receipt date')} value={f.receipt_date} onChange={v => set('receipt_date', v)} />
          <TextField label={T('أرقام السندات السابقة', 'Previous receipt nos')} value={f.previous_receipt_nos} onChange={v => set('previous_receipt_nos', v)} placeholder={T('مثال: 1023، 1187', 'e.g. 1023, 1187')} />
        </div>
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

      {/* الوسيط */}
      <ModalSection Icon={FileText} label={T('الوسيط', 'Agent')}>
        <div style={GRID}>
          <ComboField label={T('اسم الوسيط', 'Agent name')} value={f.agent_name} onChange={v => set('agent_name', v)} options={agents} lang={lang} />
        </div>
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
