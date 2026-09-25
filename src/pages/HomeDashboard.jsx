// ════════════════════════════════════════════════════════════════════════
// HomeDashboard — لوحة الصفحة الرئيسية
// نداءٌ واحد لـ`home_dashboard()` يُرجع كل الأرقام مقسّمةً حسب المكتب × الفترة،
// فتبديل المكتب/الفترة فوريّ بلا نداءٍ جديد. قواعد الأرقام في الدالة نفسها
// (الداخل بتاريخ الدفع · الخارج = مرتجع + مسدَّد الملغاة بتاريخ الإلغاء ·
// يوم العمل 05:00 الرياض · الأسبوع يبدأ الجمعة · المقارنة بنفس المدّة المنقضية).
// المكتب التجريبي لا يدخل «كل المكاتب» ويظهر فقط عند اختياره صراحةً.
// كل قسم بطاقةٌ optIn في الصلاحيات (home) — المدير العام يرى الكل.
// ════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { TrendingUp, TrendingDown, Minus, RefreshCw, Wallet, FileText, Users, ShieldAlert, Building2, Banknote, ArrowLeftRight, Info, CalendarRange, X, Ban } from 'lucide-react'
import { swrGet, swrSet, useLiveRefresh } from '../lib/liveData.js'
import { branchNick } from '../lib/utils.js'
import { cardVisible } from '../lib/permissions.js'
import { Shimmer } from '../components/ui/Skeleton.jsx'
import { DateField } from '../components/ui/FormKit.jsx'
import { ALL_SERVICES, SVC_CODE_MAP } from '../ServiceRequestPage.jsx'
import { useIsMobile, MChips } from '../components/mobile/MobileKit.jsx'
import '../styles/m-home.css'

// ── الألوان (مُتحقَّق منها بمدقّق الألوان على سطح #faf8f3) ──
const GOLD = '#B07D00'
const SERIES = ['#B07D00', '#2a78d6', '#1baf7a', '#eb6834', '#4a3aa7'] // ترتيب ثابت لا يُدوَّر
const OTHER = '#b5ab96'
const ST = { good: '#0ca30c', warn: '#fab219', serious: '#ec835a', crit: '#d03b3b', none: '#b5ab96', pale: '#e3cf8a' }
const UP = '#006300', DOWN = '#b33030'
const GRID = 'rgba(120,100,60,.13)'
const AXIS = 'rgba(95,80,54,.6)'

const PERIODS = ['today', 'yesterday', 'week', 'month', 'year']
// ترتيب الخدمات كما في نافذة إنشاء الفاتورة (رمز lookup_items ← موضعه)
const POPUP_SVC_ORDER = new Map(ALL_SERVICES.map((sv, i) => [SVC_CODE_MAP[sv.id] || sv.id, i]))
const svcRank = (code) => (POPUP_SVC_ORDER.has(code) ? POPUP_SVC_ORDER.get(code) : 999)
// أسماء الخدمات من النافذة نفسها — رمز lookup_items مثل `other` مكرّر في قوائم أخرى («أخرى»)
// فالاسم من الخادم وحده قد يكون خاطئاً. «general» يبقى باسمه من الخادم («عام»).
// تسميات أقصر خاصّة باللوحة (تغلب اسم النافذة)
const DASH_SVC_NAME = { external_transfer_approval: { ar: 'النقل الخارجي', en: 'External transfer' } }
const POPUP_SVC_NAME = new Map(ALL_SERVICES.filter((sv) => sv.id !== 'custom').map((sv) => [SVC_CODE_MAP[sv.id] || sv.id, { ar: sv.name_ar, en: sv.name_en }]))
const SWR_KEY = 'home_dashboard'
const SEL_KEY = 'jisr_home_office'
// أزرار بنفس شكل تبويبات «سجل العمالة» (ox-btn): صندوق خفيف، والمحدَّد بلا صندوق بخطٍّ ذهبي سفلي
// أوزان عرض كروت المؤشرات في صفٍّ واحد (الدخل أعرض لأن سطره الفرعي أطول)
const KPI_W = { inc: 1.35, inv: 1.25, recv: 1, wk: 1 }
const HD_CSS = `
        .hd-kpis-wrap{container-type:inline-size}
        .hd-kpis{display:grid;gap:14px;align-items:stretch}
        @container (max-width:760px){.hd-kpis{grid-template-columns:1fr 1fr!important}}
        @container (max-width:460px){.hd-kpis{grid-template-columns:1fr!important}}
        .hd-tab{height:40px;padding:0 15px;border-radius:9px;border:1px solid var(--bd);cursor:pointer;
          font-family:'Cairo',sans-serif;font-size:12.5px;font-weight:600;display:inline-flex;align-items:center;gap:7px;
          background:transparent;color:var(--tx2);transition:.15s;box-sizing:border-box;flex-shrink:0;white-space:nowrap}
        .hd-tab:hover{background:rgba(176,125,0,.07);color:var(--accent);border-color:var(--accent-bd)}
        .hd-tab[data-on="1"]{background:transparent;border-color:transparent;color:var(--accent);box-shadow:inset 0 -2px 0 var(--accent);border-radius:0}
        .hd-tab[data-on="1"]:hover{background:rgba(176,125,0,.07);border-color:transparent}
        .hd-tab-n{padding:1px 6px;border-radius:6px;font-size:10.5px;font-weight:600;background:rgba(120,100,60,.10);color:var(--tx4);transition:.15s}
        .hd-tab[data-on="1"] .hd-tab-n{background:rgba(176,125,0,.18);color:var(--accent)}
        /* شريط المكاتب: بلا صناديق — المحدَّد ذهبي بخطٍّ سفلي ينزلق */
        .hd-orow{display:flex;flex-wrap:wrap;border-bottom:1px solid var(--bd)}
        .hd-otab{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:0;padding:8px 18px 12px;
          background:none;border:none;cursor:pointer;font-family:'Cairo',sans-serif;white-space:nowrap;flex-shrink:0}
        .hd-otab .nm{font-size:13px;font-weight:600;color:var(--tx3);transition:color .15s}
        .hd-otab::after{content:'';position:absolute;inset-inline:14px;bottom:0;height:2.5px;border-radius:3px 3px 0 0;
          background:var(--accent);transform:scaleX(0);transition:transform .22s ease}
        .hd-otab:hover .nm{color:var(--tx)}
        .hd-otab:hover::after{transform:scaleX(.35);opacity:.4}
        .hd-otab[data-on="1"] .nm{color:var(--accent)}
        .hd-otab[data-on="1"]::after{transform:scaleX(1);opacity:1}
      `

const n0 = (v) => Number(v) || 0
const fmt = (v) => Math.round(n0(v)).toLocaleString('en-US')
const compact = (v) => {
  const x = Math.abs(n0(v))
  if (x >= 1e6) return (v / 1e6).toFixed(x >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M'
  if (x >= 1e3) return (v / 1e3).toFixed(x >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K'
  return String(Math.round(n0(v)))
}
const pctOf = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0)
const delta = (cur, prev) => (prev > 0 ? (cur - prev) / prev : cur > 0 ? null : 0)
const addDays = (iso, d) => { const t = new Date(iso + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + d); return t.toISOString().slice(0, 10) }
const ISO = /^\d{4}-\d{2}-\d{2}$/
const monthKey = (iso, back) => { const t = new Date(iso.slice(0, 7) + '-01T00:00:00Z'); t.setUTCMonth(t.getUTCMonth() - back); return t.toISOString().slice(0, 7) }

// ── أنماط مشتركة ──
const card = { background: 'var(--card-bg)', border: '1px solid var(--bd)', borderRadius: 16, boxShadow: 'var(--shadow-sm)', padding: 18, minWidth: 0 }
const h2 = { fontSize: 14.5, fontWeight: 600, color: 'var(--tx)', display: 'flex', alignItems: 'center', gap: 8 }
const sub = { fontSize: 11.5, color: 'var(--tx4)', fontWeight: 500 }
const num = { fontVariantNumeric: 'tabular-nums' }
const metaChip = { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--tx4)', fontWeight: 500, whiteSpace: 'nowrap' }

// أزرار الاختيار بنفس شكل أزرار المكاتب (hd-tab): صندوق خفيف، والمحدَّد بخطٍّ ذهبي سفلي
function Seg({ value, onChange, options, small }) {
  return (
    <div role="tablist" style={{ display: 'inline-flex', gap: small ? 6 : 10, flexWrap: 'wrap', alignItems: 'center' }}>
      {options.map(([v, l]) => (
        <button key={v} className="hd-tab" role="tab" aria-selected={v === value} data-on={v === value ? '1' : '0'} onClick={() => onChange(v)}
          style={small ? { height: 30, padding: '0 11px', fontSize: 11.5 } : undefined}>{l}</button>
      ))}
    </div>
  )
}

function Delta({ cur, prev, T, label }) {
  const d = delta(cur, prev)
  if (d === 0 && !cur && !prev) return <span style={{ ...sub, fontSize: 11 }}>{T('لا حركة', 'No activity')}</span>
  if (d === null) return <span style={{ fontSize: 11.5, color: UP, fontWeight: 600 }}>{T('جديد', 'New')} <span style={{ ...sub, fontWeight: 400 }}>{label}</span></span>
  const up = d > 0, flat = Math.abs(d) < 0.005
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown
  const c = flat ? 'var(--tx4)' : up ? UP : DOWN
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: c, fontWeight: 600 }} title={`${fmt(prev)} ${label}`}>
      <Icon size={13} strokeWidth={2.2} />
      <span style={num}>{flat ? '0%' : `${up ? '+' : ''}${Math.round(d * 100)}%`}</span>
      <span style={{ ...sub, fontWeight: 400 }}>{label}</span>
    </span>
  )
}

function Kpi({ icon: Icon, label, value, unit, foot, children, accent = GOLD }) {
  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: 3, background: accent, opacity: 0.85 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--accent-soft)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: accent }}>
          <Icon size={16} strokeWidth={1.9} />
        </span>
        <span style={{ fontSize: 12.5, color: 'var(--tx3)', fontWeight: 600 }}>{label}</span>
      </div>
      {value != null && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 27, fontWeight: 600, color: 'var(--tx)', letterSpacing: '-.3px', lineHeight: 1.1 }}>{value}</span>
          {unit && <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 500 }}>{unit}</span>}
        </div>
      )}
      {children}
      {foot && <div style={{ marginTop: 'auto' }}>{foot}</div>}
    </div>
  )
}

// شريط مُكدَّس أفقي بفواصل 2px — لكل مقطع لون + تسمية في المفتاح
function StackBar({ parts, height = 12 }) {
  const total = parts.reduce((s, p) => s + n0(p.v), 0)
  if (!total) return <div style={{ height, borderRadius: 6, background: 'var(--bd2)' }} />
  return (
    <div style={{ display: 'flex', gap: 2, height, borderRadius: 6, overflow: 'hidden' }}>
      {parts.filter((p) => n0(p.v) > 0).map((p) => (
        <div key={p.k} title={`${p.l}: ${fmt(p.v)} (${pctOf(p.v, total)}%)`} style={{ flex: `${p.v} 1 0`, background: p.c, minWidth: 3 }} />
      ))}
    </div>
  )
}

function Legend({ parts, total }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
      {parts.map((p) => (
        <span key={p.k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--tx3)' }}>
          <span style={{ width: 9, height: 9, borderRadius: 3, background: p.c }} />
          {p.l}
          <span style={{ ...num, color: 'var(--tx)', fontWeight: 600 }}>{fmt(p.v)}</span>
          {total > 0 && <span style={{ ...num, color: 'var(--tx4)' }}>{pctOf(p.v, total)}%</span>}
        </span>
      ))}
    </div>
  )
}

// قائمة أشرطة أفقية (لون واحد لسلسلة واحدة؛ المختار مُبرَز والباقي خافت)
// شبكة واحدة لكل الصفوف: عمود الاسم بعرض أطول اسمٍ فعلاً (لا عرضٌ ثابت يترك فراغاً)،
// فتبدأ كل الأشرطة من نفس الخطّ بعد الأسماء مباشرة
// share: طول الشريط = حصّة الصفّ من مجموع الكل (لا نسبةً إلى أكبر صفّ)
// fill: تتوزّع الصفوف على كامل ارتفاع الكرت (حين يجاوره كرتٌ أطول) فلا يبقى فراغٌ تحتها
function BarList({ rows, valueFmt = fmt, highlight, onPick, empty, share, fill }) {
  const max = Math.max(0, ...rows.map((r) => n0(r.v)))
  const total = rows.reduce((a, r) => a + n0(r.v), 0)
  const denom = share ? total : max
  if (!rows.length || !max) return <div style={{ ...sub, padding: '18px 0', textAlign: 'center' }}>{empty}</div>
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'fit-content(55%) minmax(60px,1fr) auto auto', alignItems: 'center', columnGap: 12, rowGap: 9, ...(fill ? { flex: 1, alignContent: 'space-between' } : null) }}>
      {rows.map((r) => {
        const dim = highlight && highlight !== r.k
        const cell = { onClick: onPick ? () => onPick(r.k) : undefined, title: r.tip || `${r.l}: ${valueFmt(r.v)}` }
        const cur = { cursor: onPick ? 'pointer' : 'default' }
        return (
          <React.Fragment key={r.k}>
            <span {...cell} style={{ ...cur, display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
              <span style={{ fontSize: 12, color: dim ? 'var(--tx4)' : 'var(--tx2)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.l}</span>
              {r.note && <span style={{ ...num, fontSize: 11, color: 'var(--tx4)', whiteSpace: 'nowrap', flexShrink: 0 }}>{r.note}</span>}
            </span>
            <div {...cell} style={{ ...cur, height: 10, borderRadius: 5, background: 'var(--bd2)', overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(1.5, (n0(r.v) / denom) * 100)}%`, height: '100%', borderRadius: 5, background: r.c || GOLD, opacity: dim ? 0.3 : 1, transition: 'width .5s ease, opacity .2s' }} />
            </div>
            {/* النسبة بجوار الشريط، ثم الرقم في الطرف — عمودان منفصلان فيصطفّ كلٌّ منهما */}
            <span {...cell} style={{ ...cur, ...num, fontSize: 11, color: 'var(--tx4)', textAlign: 'start', whiteSpace: 'nowrap' }}>{r.extra || ''}</span>
            <span {...cell} style={{ ...cur, ...num, fontSize: 13, color: dim ? 'var(--tx4)' : 'var(--tx)', fontWeight: 600, minWidth: 44, textAlign: 'end', whiteSpace: 'nowrap' }}>{valueFmt(r.v)}</span>
          </React.Fragment>
        )
      })}
    </div>
  )
}

function ChartTip({ active, payload, label, T, fmtLabel }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--modal-portal-bg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '8px 12px', boxShadow: 'var(--shadow-md)', fontFamily: "'Cairo',sans-serif", minWidth: 150 }}>
      <div style={{ fontSize: 11.5, color: 'var(--tx4)', marginBottom: 4, ...num }}>{fmtLabel ? fmtLabel(label) : label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--tx2)', justifyContent: 'space-between' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />{p.name}</span>
          <span style={{ ...num, fontWeight: 600, color: 'var(--tx)' }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function Section({ title, icon: Icon, right, children, style }) {
  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={h2}>{Icon && <Icon size={16} color={GOLD} strokeWidth={1.9} />}{title}</div>
        {right}
      </div>
      {children}
    </div>
  )
}

function DashSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 14 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Shimmer w="45%" h={12} /><Shimmer w="70%" h={26} /><Shimmer w="55%" h={10} />
          </div>
        ))}
      </div>
      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Shimmer w="25%" h={14} />{[0, 1, 2, 3, 4].map((i) => <Shimmer key={i} h={22} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 14 }}>
        <div style={card}><Shimmer w="30%" h={14} /><div style={{ height: 14 }} /><Shimmer h={220} r={10} /></div>
        <div style={card}><Shimmer w="30%" h={14} /><div style={{ height: 14 }} /><Shimmer h={220} r={10} /></div>
      </div>
    </div>
  )
}

export default function HomeDashboard({ sb, user, lang = 'ar', onNavigate, logo = null }) {
  const isAr = lang === 'ar'
  const T = (ar, en) => (isAr ? ar : en)
  const [data, setData] = useState(() => swrGet(SWR_KEY) || null)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [loadedAt, setLoadedAt] = useState(null)
  const [period, setPeriod] = useState('month')
  const [sel, setSel] = useState(() => { try { return localStorage.getItem(SEL_KEY) || 'all' } catch { return 'all' } })
  const [trend, setTrend] = useState('daily')
  const [cmpMetric, setCmpMetric] = useState('net')
  const [svcMetric, setSvcMetric] = useState('cnt')
  const [agAll, setAgAll] = useState(false)
  // تاريخ محدد: range = المطبَّق (يُرسَل للخادم)، draft = ما في النافذة قبل «تطبيق»
  const [range, setRange] = useState(null)
  const [draft, setDraft] = useState({ from: '', to: '' })
  const [rangeOpen, setRangeOpen] = useState(false)
  const rangeRef = useRef(null)
  rangeRef.current = range
  const isMobile = useIsMobile()

  const show = useCallback((k) => cardVisible(user, 'home', k), [user])
  const anyCard = ['income', 'offices', 'invoices', 'workers', 'iqama', 'agents'].some(show)

  const fetchDash = useCallback(async (r) => {
    setBusy(true)
    const { data: d, error } = await sb.rpc('home_dashboard', r ? { p_from: r.from, p_to: r.to } : {})
    setBusy(false)
    if (error) { setErr(error.message); return null }
    setErr(null); setData(r ? d : swrSet(SWR_KEY, d)); setLoadedAt(new Date())
    return d
  }, [sb])
  const load = useCallback(() => fetchDash(rangeRef.current), [fetchDash])
  const applyRange = async (r) => {
    if (!r || !ISO.test(r.from) || !ISO.test(r.to)) return
    const ord = r.from <= r.to ? r : { from: r.to, to: r.from }
    const d = await fetchDash(ord)
    if (!d) return
    setRange(ord); setDraft(ord); setPeriod('custom'); setRangeOpen(false)
  }
  const pickPeriod = (v) => {
    if (v === 'custom') { setDraft(range || { from: '', to: '' }); setRangeOpen((o) => !o); return }
    setPeriod(v); setRangeOpen(false)
  }
  useEffect(() => { if (anyCard) load() }, [load, anyCard])
  useLiveRefresh(['payments', 'invoices'], () => { if (anyCard) load() }, { debounce: 1500 })

  const pickOffice = (id) => {
    const v = id === sel ? 'all' : id
    setSel(v)
    try { localStorage.setItem(SEL_KEY, v) } catch { /* تخزين المتصفح غير متاح */ }
  }

  // ── التجميع حسب المكتب المختار ──
  const agg = useMemo(() => {
    if (!data) return null
    const branches = data.branches || []
    const testIds = new Set(branches.filter((b) => b.test).map((b) => b.id))
    // مكاتب لها فواتير (منذ بداية السنة الماضية) — وحدها تظهر في أزرار المكاتب؛ مكتبٌ بعمالةٍ فقط لا زرّ له
    const invOffices = new Set([...(data.inv || []), ...(data.recv || []), ...(data.fin || [])].map((r) => r.b).filter(Boolean))
    const selValid = sel === 'all' || branches.some((b) => b.id === sel && b.active !== false && invOffices.has(b.id))
    const s = selValid ? sel : 'all'
    const inSel = (b) => (s === 'all' ? !testIds.has(b) : b === s)
    const sumBy = (rows, keys, pred) => {
      const o = Object.fromEntries(keys.map((k) => [k, 0]))
      for (const r of rows) if (pred(r)) for (const k of keys) o[k] += n0(r[k])
      return o
    }
    const PK = data.custom ? [...PERIODS, 'custom'] : PERIODS
    const fin = {}, inv = {}, oldPay = {}
    for (const k of PK) {
      oldPay[k] = sumBy(data.oldPay || [], ['oldCnt', 'oldSum', 'newCnt', 'newSum'], (r) => r.k === k && inSel(r.b))
      fin[k] = sumBy(data.fin || [], ['in', 'cash', 'bank', 'out', 'inP', 'outP'], (r) => r.k === k && inSel(r.b))
      inv[k] = sumBy(data.inv || [], ['cnt', 'sum', 'cntP', 'sumP', 'canc', 'paid', 'part', 'unpaid'], (r) => r.k === k && inSel(r.b))
    }
    const svcMap = {}
    for (const r of data.svc || []) {
      if (r.k !== period || !inSel(r.b)) continue
      const m = svcMap[r.svc] || (svcMap[r.svc] = { cnt: 0, units: 0, sum: 0 })
      m.cnt += n0(r.cnt); m.units += n0(r.units); m.sum += n0(r.sum)
    }
    const recv = sumBy(data.recv || [], ['cnt', 'sum'], (r) => inSel(r.b))
    // الوسطاء في الفترة المختارة: عدد الفواتير والقيمة وتوزيعها على الخدمات والمكاتب
    const agentMap = {}
    // فواتير كل وسيط في السنة الحالية (كل المكاتب الحقيقية) — مَن له أقل من 3 لا يظهر في الكرت
    const agentYear = {}
    for (const r of data.agents || []) if (r.k === 'year' && !testIds.has(r.b)) agentYear[r.a] = (agentYear[r.a] || 0) + n0(r.cnt)
    for (const r of data.agents || []) {
      if (r.k !== period || !inSel(r.b)) continue
      const m = agentMap[r.a] || (agentMap[r.a] = { cnt: 0, sum: 0, svc: {}, offices: {} })
      m.cnt += n0(r.cnt); m.sum += n0(r.sum)
      m.svc[r.svc] = (m.svc[r.svc] || 0) + n0(r.cnt)
      m.offices[r.b || '-'] = (m.offices[r.b || '-'] || 0) + n0(r.cnt)
    }
    const recvSvc = {}
    for (const r of data.recv || []) {
      if (!inSel(r.b)) continue
      const m = recvSvc[r.svc] || (recvSvc[r.svc] = { cnt: 0, sum: 0 })
      m.cnt += n0(r.cnt); m.sum += n0(r.sum)
    }
    const wk = sumBy(data.workers || [], ['total', 'expired', 'd30', 'd60', 'd90', 'ok', 'unknown'], (r) => inSel(r.b))
    const natMap = {}
    for (const r of data.nat || []) if (inSel(r.b)) natMap[r.nat] = (natMap[r.nat] || 0) + n0(r.n)

    const today = data.today
    const daily = Array.from({ length: 30 }, (_, i) => {
      const d = addDays(today, i - 29)
      const o = sumBy(data.daily || [], ['i', 'o'], (r) => r.d === d && inSel(r.b))
      return { x: d, in: o.i, out: o.o }
    })
    const monthly = Array.from({ length: 12 }, (_, i) => {
      const m = monthKey(today, 11 - i)
      const o = sumBy(data.monthly || [], ['i', 'o'], (r) => r.m === m && inSel(r.b))
      const iv = sumBy(data.invMonthly || [], ['n', 'sum'], (r) => r.m === m && inSel(r.b))
      return { x: m, in: o.i, out: o.o, n: iv.n, sum: iv.sum }
    })

    // صفوف المكاتب: كل مكتب حقيقي (والتجريبي إن اختير)، و«بدون مكتب» إن كان له أثر
    const officeRows = branches
      .filter((b) => !b.test || b.id === s)
      .map((b) => ({ id: b.id, label: branchNick({ name_ar: b.name }) || b.code, code: b.code, test: b.test, active: b.active }))
    const hasNull = [data.fin, data.inv, data.workers].some((a) => (a || []).some((r) => r.b == null && (n0(r.in) || n0(r.cnt) || n0(r.total))))
    if (hasNull) officeRows.push({ id: null, label: isAr ? 'بدون مكتب' : 'No office', code: '—' })
    for (const o of officeRows) {
      const match = (r) => r.b === o.id || (o.id == null && r.b == null)
      o.fin = {}; o.inv = {}
      for (const k of PK) {
        const f = sumBy(data.fin || [], ['in', 'out', 'inP', 'outP'], (r) => r.k === k && match(r))
        o.fin[k] = { net: f.in - f.out, netP: f.inP - f.outP, in: f.in }
        const iv = sumBy(data.inv || [], ['cnt', 'sum', 'cntP'], (r) => r.k === k && match(r))
        o.inv[k] = iv
      }
      o.w = sumBy(data.workers || [], ['total', 'expired', 'd30', 'd60', 'd90', 'ok', 'unknown'], match)
      o.recv = sumBy(data.recv || [], ['sum', 'cnt'], match)
    }
    return { s, fin, inv, oldPay, svcMap, recv, recvSvc, agentMap, agentYear, wk, natMap, daily, monthly, officeRows, branches, invOffices, PK }
  }, [data, sel, period, isAr])

  const periodLabel = { today: T('اليوم', 'Today'), yesterday: T('أمس', 'Yesterday'), week: T('هذا الأسبوع', 'This week'), month: T('هذا الشهر', 'This month'), year: T('هذه السنة', 'This year'), custom: data?.custom ? T(`من ${data.custom.from} إلى ${data.custom.to}`, `${data.custom.from} → ${data.custom.to}`) : '' }
  const prevLabel = { today: T('عن أمس', 'vs yesterday'), yesterday: T('عن أول أمس', 'vs the day before'), week: T('عن الأسبوع الماضي', 'vs last week'), month: T('عن الشهر الماضي', 'vs last month'), year: T('عن السنة الماضية', 'vs last year'), custom: T('عن الفترة السابقة بنفس الطول', 'vs previous period of same length') }
  const SAR = T('ر.س', 'SAR')

  if (!anyCard) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ ...card, maxWidth: 440, width: '100%', textAlign: 'center', padding: '34px 30px 28px', position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(180deg, rgba(176,125,0,.08), rgba(176,125,0,0) 50%), var(--card-bg)' }}>
          <div style={{ position: 'absolute', top: 0, insetInline: 0, height: 3, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`, opacity: 0.7 }} />
          {logo}
          <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--tx)', marginBottom: 8 }}>{T('أهلاً بك في جسر', 'Welcome to Jisr')}</div>
          <div style={{ fontSize: 13, color: 'var(--tx3)', lineHeight: 1.8 }}>{T('لم تُفعَّل لك بطاقات لوحة المؤشرات بعد.', 'No dashboard cards are enabled for you yet.')}</div>
        </div>
      </div>
    )
  }

  const money = !!data?.money
  // «تأشيرة بإقامة 12 شهر» ← «تأشيرة 12 شهر» (اسمٌ أقصر في اللوحة)
  const svcName = (c) => String(DASH_SVC_NAME[c]?.[isAr ? 'ar' : 'en'] || POPUP_SVC_NAME.get(c)?.[isAr ? 'ar' : 'en'] || (data?.svcNames?.[c]?.[isAr ? 'ar' : 'en']) || data?.svcNames?.[c]?.ar || c).replace(/\s*بإقامة\s*/, ' ')

  // ── نافذة «تاريخ محدد»: من/إلى + اختصارات جاهزة ──
  const t0 = data?.today
  const presets = t0 ? [
    [T('أمس', 'Yesterday'), addDays(t0, -1), addDays(t0, -1)],
    [T('آخر 7 أيام', 'Last 7 days'), addDays(t0, -6), t0],
    [T('آخر 30 يوماً', 'Last 30 days'), addDays(t0, -29), t0],
    [T('الشهر الماضي', 'Last month'), monthKey(t0, 1) + '-01', addDays(t0.slice(0, 7) + '-01', -1)],
    [T('آخر 90 يوماً', 'Last 90 days'), addDays(t0, -89), t0],
  ] : []
  const draftOk = ISO.test(draft.from) && ISO.test(draft.to)
  const rangePanel = (
    <div style={{ position: 'absolute', top: 'calc(100% + 8px)', insetInlineEnd: 0, zIndex: 60, width: 'min(92vw, 360px)',
      background: 'var(--modal-portal-bg)', border: '1px solid var(--bd)', borderRadius: 14, boxShadow: 'var(--shadow-lg)', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ ...h2, fontSize: 13.5 }}><CalendarRange size={15} color={GOLD} />{T('تاريخ محدد', 'Custom date')}</span>
        <button onClick={() => setRangeOpen(false)} aria-label="close" style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--tx4)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {presets.map(([l, f, t]) => (
          <button key={l} onClick={() => applyRange({ from: f, to: t })} disabled={busy} className="hd-tab" style={{ height: 30, padding: '0 11px', fontSize: 11.5 }}>{l}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <DateField label={T('من', 'From')} value={draft.from} max={draft.to || t0} onChange={(v) => setDraft((d) => ({ ...d, from: v }))} />
        <DateField label={T('إلى', 'To')} value={draft.to} min={draft.from || undefined} max={t0} onChange={(v) => setDraft((d) => ({ ...d, to: v }))} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button onClick={() => applyRange(draft)} disabled={!draftOk || busy} style={{ flex: 1, height: 38, borderRadius: 10, border: 'none', cursor: draftOk && !busy ? 'pointer' : 'not-allowed',
          background: GOLD, color: '#fff', fontFamily: "'Cairo',sans-serif", fontSize: 13, fontWeight: 600, opacity: draftOk && !busy ? 1 : 0.45 }}>
          {busy ? T('جارٍ الحساب…', 'Calculating…') : T('تطبيق', 'Apply')}
        </button>
        {range && <button onClick={() => { setRange(null); rangeRef.current = null; setPeriod('month'); setRangeOpen(false); fetchDash(null) }} style={{ height: 38, padding: '0 14px', borderRadius: 10, border: '1px solid var(--bd)', background: 'transparent', color: 'var(--tx3)', fontFamily: "'Cairo',sans-serif", fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>{T('إزالة التاريخ', 'Clear')}</button>}
      </div>
    </div>
  )

  // ── الرأس: المكتب + الفترة ──
  const header = (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
      <div>
        <div style={{ fontSize: 21, fontWeight: 600, color: 'var(--tx)' }}>
          {T('الرئيسية', 'Home')}
        </div>
        {/* سطر المعلومات: رقاقتان هادئتان (اليوم · آخر تحديث) + «i» تشرح حدود اليوم والأسبوع */}
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {data?.today && (
            <span style={metaChip}>
              <span style={{ color: 'var(--tx2)', fontWeight: 600 }}>{new Date(data.today + 'T12:00:00Z').toLocaleDateString(isAr ? 'ar-u-nu-latn' : 'en-GB', { weekday: 'long', timeZone: 'UTC' })}</span>
              <span style={{ ...num, direction: 'ltr' }}>{data.today}</span>
            </span>
          )}
          {loadedAt && (
            <span style={metaChip} title={T('تتحدّث الأرقام تلقائياً عند تسجيل دفعة أو فاتورة', 'Figures refresh automatically on new payments or invoices')}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: busy ? ST.warn : ST.good, boxShadow: `0 0 0 3px ${busy ? 'rgba(250,178,25,.18)' : 'rgba(12,163,12,.14)'}` }} />
              {busy ? T('جارٍ التحديث…', 'Updating…') : <>{T('محدَّث', 'Updated')} <span style={{ ...num, color: 'var(--tx2)', fontWeight: 600 }}>{loadedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span></>}
            </span>
          )}
          <span style={{ ...metaChip, cursor: 'help' }}
            title={T('يوم العمل يبدأ 5 فجراً، والأسبوع يبدأ يوم الجمعة. المقارنة بالفترة السابقة لنفس المدّة.', 'The business day starts at 5 AM and the week on Friday. Comparisons use the same elapsed span of the previous period.')}>
            <Info size={13} strokeWidth={1.9} />
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <Seg value={period} onChange={pickPeriod} options={[
            ...PERIODS.map((p) => [p, { today: T('اليوم', 'Today'), yesterday: T('أمس', 'Yesterday'), week: T('الأسبوع', 'Week'), month: T('الشهر', 'Month'), year: T('السنة', 'Year') }[p]]),
            ['custom', <span key="c" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <CalendarRange size={14} strokeWidth={1.9} />
              {period === 'custom' && data?.custom ? <span style={num}>{data.custom.from === data.custom.to ? data.custom.from : `${data.custom.from} – ${data.custom.to}`}</span> : T('تاريخ محدد', 'Custom date')}
            </span>],
          ]} />
          {rangeOpen && rangePanel}
        </div>
        <button onClick={load} disabled={busy} title={T('تحديث', 'Refresh')} className="hd-tab" style={{ width: 40, padding: 0, cursor: busy ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <RefreshCw size={15} style={{ animation: busy ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>
    </div>
  )

  // أزرار المكاتب بنفس شكل تبويبات «سجل العمالة» (ox-btn): صندوق خفيف، والمحدَّد بلا صندوق بخطٍّ ذهبي سفلي
  // شريط المكاتب: أسماء بلا صناديق، والمحدَّد ذهبي بخطٍّ سفلي
  const officeTabs = agg ? agg.officeRows.filter((o) => o.id && o.active !== false && agg.invOffices.has(o.id)) : []
  const officeChips = agg && officeTabs.length > 1 && (
    <div className="hd-orow" role="tablist">
      {[{ id: 'all', label: T('كل المكاتب', 'All offices') }, ...officeTabs].map((o) => (
        <button key={o.id} className="hd-otab" role="tab" aria-selected={agg.s === o.id} data-on={agg.s === o.id ? '1' : '0'} onClick={() => pickOffice(o.id)}>
          <span className="nm">{o.label}{o.test && <span style={{ color: ST.crit, fontSize: 10.5, marginInlineStart: 6 }}>{T('تجريبي', 'Test')}</span>}</span>
        </button>
      ))}
    </div>
  )

  // ════ عرض الجوال (≤768px): رأس مضغوط + شرائح أفقية للفترة والمكتب + ورقة سفلية للتاريخ المحدد ════
  const mDate = data?.today && new Date(data.today + 'T12:00:00Z').toLocaleDateString(isAr ? 'ar-u-nu-latn' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
  const mHeader = isMobile && (
    <div className="mh-head">
      <div className="mh-head-t">
        <h1>{T('الرئيسية', 'Home')}</h1>
        <div className="mh-meta">
          {mDate && <span>{mDate}</span>}
          {loadedAt && (
            <span className="mh-live">
              <i data-busy={busy ? '1' : '0'} />
              {busy ? T('جارٍ التحديث…', 'Updating…') : <>{T('محدَّث', 'Updated')} <b>{loadedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</b></>}
            </span>
          )}
        </div>
      </div>
      <button className="mh-iconbtn" onClick={load} disabled={busy} aria-label={T('تحديث', 'Refresh')}>
        <RefreshCw size={18} strokeWidth={2} className={busy ? 'mh-spin' : undefined} />
      </button>
    </div>
  )
  const mCustomLbl = period === 'custom' && data?.custom
    ? (data.custom.from === data.custom.to ? data.custom.from.slice(5) : `${data.custom.from.slice(5)} – ${data.custom.to.slice(5)}`)
    : T('تاريخ محدد', 'Custom')
  const mPeriodChips = isMobile && (
    <MChips value={period} onChange={pickPeriod} options={[
      ...PERIODS.map((p) => ({ value: p, label: { today: T('اليوم', 'Today'), yesterday: T('أمس', 'Yesterday'), week: T('الأسبوع', 'Week'), month: T('الشهر', 'Month'), year: T('السنة', 'Year') }[p] })),
      { value: 'custom', label: <span className="mh-chip-ic"><CalendarRange size={14} strokeWidth={2} /><span dir={period === 'custom' && data?.custom ? 'ltr' : undefined}>{mCustomLbl}</span></span> },
    ]} />
  )
  const mOfficeTabs = agg ? agg.officeRows.filter((o) => o.id && o.active !== false && agg.invOffices.has(o.id)) : []
  const mOfficeChips = isMobile && agg && mOfficeTabs.length > 1 && (
    <MChips value={agg.s} onChange={pickOffice} options={[
      { value: 'all', label: T('كل المكاتب', 'All offices') },
      ...mOfficeTabs.map((o) => ({ value: o.id, label: o.test ? <>{o.label} <span style={{ color: ST.crit, fontSize: 11 }}>{T('تجريبي', 'Test')}</span></> : o.label })),
    ]} />
  )
  const mRangeSheet = isMobile && rangeOpen && (
    <div className="mh-sheet-bg" onClick={() => setRangeOpen(false)}>
      <div className="mh-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="mh-grab" />
        <div className="mh-sheet-head">
          <b>{T('تاريخ محدد', 'Custom date')}</b>
          <button className="mh-x" onClick={() => setRangeOpen(false)} aria-label="close"><X size={18} /></button>
        </div>
        <div className="mh-presets">
          {presets.map(([l, f, t]) => <button key={l} className="mk-chip" disabled={busy} onClick={() => applyRange({ from: f, to: t })}>{l}</button>)}
        </div>
        <div className="mh-dates">
          <DateField label={T('من', 'From')} value={draft.from} max={draft.to || t0} onChange={(v) => setDraft((d) => ({ ...d, from: v }))} />
          <DateField label={T('إلى', 'To')} value={draft.to} min={draft.from || undefined} max={t0} onChange={(v) => setDraft((d) => ({ ...d, to: v }))} />
        </div>
        <button className="mh-primary" onClick={() => applyRange(draft)} disabled={!draftOk || busy}>
          {busy ? T('جارٍ الحساب…', 'Calculating…') : T('تطبيق', 'Apply')}
        </button>
        {range && <button className="mh-secondary" onClick={() => { setRange(null); rangeRef.current = null; setPeriod('month'); setRangeOpen(false); fetchDash(null) }}>{T('إزالة التاريخ', 'Clear date')}</button>}
      </div>
    </div>
  )

  if (isMobile && !data) {
    return (
      <div className="mh">
        {mHeader}
        {mPeriodChips}
        {mRangeSheet}
        {err ? <div className="mh-card mh-err">{T('تعذّر تحميل لوحة المؤشرات', 'Could not load the dashboard')}</div> : (
          <>
            <div className="mh-hero mh-hero-skel"><Shimmer w="35%" h={12} /><Shimmer w="60%" h={30} /><Shimmer w="100%" h={6} /></div>
            <div className="mh-tiles">{[0, 1, 2, 3].map((i) => <div key={i} className="mh-tile"><Shimmer w="50%" h={11} /><Shimmer w="70%" h={22} /></div>)}</div>
            <div className="mh-card"><Shimmer w="30%" h={13} /><div style={{ height: 12 }} /><Shimmer h={160} r={10} /></div>
          </>
        )}
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <style>{HD_CSS}</style>
        {header}
        {err ? <div style={{ ...card, color: DOWN, fontSize: 13 }}>{T('تعذّر تحميل لوحة المؤشرات', 'Could not load the dashboard')}</div> : <DashSkeleton />}
      </div>
    )
  }

  const F = agg.fin[period] || agg.fin.month, I = agg.inv[period] || agg.inv.month, P = agg.oldPay[period] || agg.oldPay.month
  const net = F.in - F.out, netP = F.inP - F.outP
  const W = agg.wk

  // ── بطاقات المؤشرات ──
  // ── المتبقي على العملاء حسب نوع الخدمة (للكرت العلوي وللدائرة) ──
  const recvSorted = Object.entries(agg.recvSvc).map(([code, m]) => ({ code, ...m })).sort((a, b) => b.sum - a.sum)
  const recvTop = recvSorted.slice(0, 5).map((r, i) => ({ k: r.code, l: svcName(r.code), v: r.sum, cnt: r.cnt, c: SERIES[i] }))
  const recvRest = recvSorted.slice(5)
  const recvParts = recvRest.length
    ? [...recvTop, { k: '_other', l: T(`أخرى (${recvRest.length})`, `Other (${recvRest.length})`), v: recvRest.reduce((a, r) => a + r.sum, 0), cnt: recvRest.reduce((a, r) => a + r.cnt, 0), c: OTHER }]
    : recvTop
  const recvTotal = recvParts.reduce((a, p) => a + p.v, 0)

  const kpis = [
    show('income') && money && (
      <Kpi key="inc" icon={Wallet} label={T('الدخل', 'Income')} value={fmt(net)} unit={SAR}
        foot={<Delta cur={net} prev={netP} T={T} label={prevLabel[period]} />}>
        <StackBar height={7} parts={[{ k: 'cash', v: F.cash, c: GOLD, l: T('نقداً', 'Cash') }, { k: 'bank', v: F.bank, c: SERIES[1], l: T('تحويل', 'Bank') }]} />
        {/* نقداً | تحويل | ملغى — ثلاث خانات: التسمية فوق والرقم تحت، فلا ينقطع السطر في الكرت الضيّق */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8 }}>
          {[
            { k: 'cash', icon: Banknote, c: GOLD, l: T('نقداً', 'Cash'), v: F.cash, vc: 'var(--tx)' },
            { k: 'bank', icon: ArrowLeftRight, c: SERIES[1], l: T('تحويل', 'Bank'), v: F.bank, vc: 'var(--tx)' },
            { k: 'out', icon: Ban, c: DOWN, l: T('ملغى', 'Cancelled'), v: F.out, vc: F.out ? DOWN : 'var(--tx4)' },
          ].map(({ k, icon: Ic, c, l, v, vc }) => (
            <div key={k} style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--tx3)', whiteSpace: 'nowrap' }}><Ic size={12} color={c} />{l}</span>
              <b style={{ ...num, fontSize: 12.5, color: vc, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fmt(v)}</b>
            </div>
          ))}
        </div>
      </Kpi>
    ),
    show('invoices') && (
      <Kpi key="inv" icon={FileText} label={T('الفواتير', 'Invoices')} accent={SERIES[1]}
        foot={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Delta cur={I.cnt} prev={I.cntP} T={T} label={prevLabel[period]} />
          {I.canc > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--tx3)' }}><Ban size={12} color={DOWN} />{T('ملغاة', 'Cancelled')} <b style={{ ...num, color: DOWN, fontWeight: 600 }}>{fmt(I.canc)}</b></span>}
        </div>}>
        {/* جديدة (صدرت في الفترة) | سابقة سُدِّد عليها داخل الفترة */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 12, alignItems: 'stretch' }}>
          {[
            /* «دُفع» تحت الجديدة = ما سُدِّد داخل الفترة على فواتير صدرت فيها (oldPay.newSum) — بطلب المستخدم 2026-09-24 */
            { n: I.cnt, l: T('فواتير جديدة', 'New invoices'), sub: T('بقيمة', 'Worth'), v: I.sum, sub2: T('دُفع', 'Paid'), v2: P.newSum },
            null,
            { n: P.oldCnt, l: T('فواتير دفعات', 'Invoices with payments'), sub: T('دُفع', 'Paid'), v: P.oldSum },
          ].map((c, i) => c ? (
            <div key={i} style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 11.5, color: 'var(--tx3)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.l}</span>
              <span style={{ ...num, fontSize: 24, fontWeight: 600, color: 'var(--tx)', lineHeight: 1.15 }}>{fmt(c.n)}</span>
              {money && <span style={{ fontSize: 11, color: 'var(--tx4)', whiteSpace: 'nowrap' }}>{c.sub} <b style={{ ...num, color: 'var(--tx2)', fontWeight: 600 }}>{fmt(c.v)}</b></span>}
              {money && c.sub2 && <span style={{ fontSize: 11, color: 'var(--tx4)', whiteSpace: 'nowrap' }}>{c.sub2} <b style={{ ...num, color: 'var(--tx2)', fontWeight: 600 }}>{fmt(c.v2)}</b></span>}
            </div>
          ) : <div key={i} style={{ background: 'var(--bd)' }} />)}
        </div>
      </Kpi>
    ),
    show('invoices') && money && (
      <Kpi key="recv" icon={Building2} label={T('المتبقي على العملاء', 'Outstanding balance')} value={fmt(agg.recv.sum)} unit={SAR} accent={ST.serious}
        foot={<span style={sub}>{T('على', 'Across')} <b style={{ ...num, color: 'var(--tx2)', fontWeight: 600 }}>{fmt(agg.recv.cnt)}</b> {T('فاتورة غير مسدّدة بالكامل', 'open invoices')}</span>}>
        <StackBar height={7} parts={recvParts} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {recvParts.slice(0, 2).map((p) => (
            <span key={p.k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--tx3)', minWidth: 0 }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: p.c, flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{p.l}</span>
              <b style={{ ...num, color: 'var(--tx)', fontWeight: 600 }}>{fmt(p.v)}</b>
            </span>
          ))}
        </div>
      </Kpi>
    ),
    show('workers') && (
      <Kpi key="wk" icon={Users} label={T('العمالة المسجّلة', 'Registered workers')} value={fmt(W.total)} unit={T('عامل', 'workers')} accent={SERIES[2]}
        foot={<div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 12, borderTop: '1px dashed var(--bd)', paddingTop: 10 }}>
          {[
            { l: T('إقامة منتهية', 'Expired'), v: W.expired, c: ST.crit },
            null,
            { l: T('خلال 30 يوماً', 'Within 30 days'), v: W.d30, c: ST.serious },
          ].map((x, i) => x ? (
            <div key={i} style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--tx3)', minWidth: 0 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: x.c, flexShrink: 0 }} />{x.l}
              </span>
              <span style={{ ...num, fontSize: 18, fontWeight: 600, color: x.c, lineHeight: 1.2 }}>{fmt(x.v)}</span>
            </div>
          ) : <div key={i} style={{ background: 'var(--bd)' }} />)}
        </div>} />
    ),
  ].filter(Boolean)

  // ── صفوف المكاتب (لمقارنة المكاتب) ──
  const offRows = agg.officeRows
  // ── منحنى الاتجاه ──
  const trendData = trend === 'daily' ? agg.daily : agg.monthly
  const fmtX = (x) => (trend === 'daily' ? x.slice(5) : x)
  const trendCard = show('income') && money && (
    <Section title={T('حركة الدخل', 'Income trend')} icon={TrendingUp}
      right={<Seg small value={trend} onChange={setTrend} options={[['daily', T('آخر 30 يوماً', 'Last 30 days')], ['monthly', T('آخر 12 شهراً', 'Last 12 months')]]} />}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
        <Legend parts={[
          { k: 'in', l: T('الداخل', 'Received'), v: trendData.reduce((s, r) => s + r.in, 0), c: GOLD },
          { k: 'out', l: T('الملغى', 'Cancelled'), v: trendData.reduce((s, r) => s + r.out, 0), c: ST.crit },
        ]} />
      </div>
      <div style={{ flex: 1, minHeight: 180, direction: 'ltr' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trendData} margin={{ top: 8, right: 6, left: 6, bottom: 0 }}>
            <defs>
              <linearGradient id="hdIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GOLD} stopOpacity={0.28} /><stop offset="100%" stopColor={GOLD} stopOpacity={0.02} /></linearGradient>
              <linearGradient id="hdOut" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={ST.crit} stopOpacity={0.18} /><stop offset="100%" stopColor={ST.crit} stopOpacity={0.01} /></linearGradient>
            </defs>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="x" reversed={isAr} tickFormatter={fmtX} tick={{ fontSize: 10.5, fill: AXIS, fontFamily: 'Cairo' }} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={18} />
            <YAxis orientation={isAr ? 'right' : 'left'} tickFormatter={compact} tick={{ fontSize: 10.5, fill: AXIS, fontFamily: 'Cairo' }} tickLine={false} axisLine={false} width={44} />
            <Tooltip wrapperStyle={{ zIndex: 20, outline: 'none' }} content={<ChartTip T={T} />} cursor={{ stroke: 'rgba(120,100,60,.35)', strokeWidth: 1 }} />
            <Area type="monotone" dataKey="in" name={T('الداخل', 'Received')} stroke={GOLD} strokeWidth={2} fill="url(#hdIn)" activeDot={{ r: 4.5, stroke: 'var(--card-bg)', strokeWidth: 2 }} />
            <Area type="monotone" dataKey="out" name={T('الملغى', 'Cancelled')} stroke={ST.crit} strokeWidth={2} strokeDasharray="5 3" fill="url(#hdOut)" activeDot={{ r: 4.5, stroke: 'var(--card-bg)', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Section>
  )

  // ── مقارنة المكاتب ──
  const cmpOpts = [
    money && ['net', T('الدخل', 'Income')],
    ['cnt', T('عدد الفواتير', 'Invoices')],
    money && ['sum', T('قيمة الفواتير', 'Invoice value')],
    ['workers', T('العمالة', 'Workers')],
  ].filter(Boolean)
  const metric = cmpOpts.some(([k]) => k === cmpMetric) ? cmpMetric : cmpOpts[0][0]
  const cmpVal = (r) => metric === 'net' ? (r.fin[period] || r.fin.month).net : metric === 'cnt' ? (r.inv[period] || r.inv.month).cnt : metric === 'sum' ? (r.inv[period] || r.inv.month).sum : r.w.total
  const cmpRows = offRows.filter((r) => !r.test || r.id === agg.s)
    .map((r) => ({ k: r.id, l: r.label, v: Math.max(0, cmpVal(r)) }))
    .filter((r) => r.v > 0) // مكتب بلا قيمة في هذا المقياس لا يُعرض
    .sort((a, b) => b.v - a.v)
  const cmpTotal = cmpRows.reduce((s, r) => s + r.v, 0)
  const officeCompare = show('offices') && (
    <Section title={T('مقارنة المكاتب', 'Office comparison')} icon={Building2}
      right={<Seg small value={metric} onChange={setCmpMetric} options={cmpOpts} />}>
      <div style={{ ...sub, marginBottom: 12 }}>{metric === 'workers' ? T('العمالة المسجّلة حالياً', 'Currently registered') : periodLabel[period]}</div>
      <BarList share rows={cmpRows.map((r) => ({ ...r, extra: cmpTotal ? `${pctOf(r.v, cmpTotal)}%` : '' }))}
        highlight={agg.s !== 'all' ? agg.s : null} onPick={(id) => id && pickOffice(id)}
        empty={T('لا بيانات في هذه الفترة', 'No data for this period')} />
    </Section>
  )

  // ── الفواتير حسب الخدمة + حالة السداد ──
  const svcRows = Object.entries(agg.svcMap)
    .map(([code, m]) => ({ k: code, l: svcName(code), v: svcMetric === 'sum' ? m.sum : m.cnt, note: code.startsWith('work_visa') && m.units ? `(${fmt(m.units)})` : '' }))
    .sort((a, b) => svcRank(a.k) - svcRank(b.k) || b.v - a.v)
  const svcCard = show('invoices') && (
    <Section title={T('الفواتير حسب الخدمة', 'Invoices by service')} icon={FileText}
      right={money && <Seg small value={svcMetric} onChange={setSvcMetric} options={[['cnt', T('العدد', 'Count')], ['sum', T('القيمة', 'Value')]]} />}>
      <BarList share fill rows={svcRows.map((r, _, all) => { const t = all.reduce((a, x) => a + n0(x.v), 0); return { ...r, extra: t ? `${pctOf(r.v, t)}%` : '' } })} empty={T('لا فواتير في هذه الفترة', 'No invoices in this period')} />
    </Section>
  )
  const statusParts = [
    { k: 'paid', l: T('مسدّدة بالكامل', 'Fully paid'), v: I.paid, c: ST.good },
    { k: 'part', l: T('مسدّدة جزئياً', 'Partially paid'), v: I.part, c: ST.warn },
    { k: 'unpaid', l: T('غير مسدّدة', 'Unpaid'), v: I.unpaid, c: ST.crit },
  ]
  const statusTotal = I.paid + I.part + I.unpaid
  const statusBody = show('invoices') && (
    <>
      {statusTotal ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ width: 150, height: 150, position: 'relative', flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusParts.filter((p) => p.v > 0)} dataKey="v" nameKey="l" innerRadius={50} outerRadius={70} paddingAngle={2} stroke="var(--card-bg)" strokeWidth={2} isAnimationActive>
                  {statusParts.filter((p) => p.v > 0).map((p) => <Cell key={p.k} fill={p.c} />)}
                </Pie>
                <Tooltip wrapperStyle={{ zIndex: 20, outline: 'none' }} content={({ active, payload }) => active && payload?.length ? (
                  <div style={{ background: 'var(--modal-portal-bg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '6px 10px', fontSize: 12, fontFamily: "'Cairo',sans-serif", boxShadow: 'var(--shadow-md)' }}>
                    {payload[0].name}: <b style={{ fontWeight: 600 }}>{fmt(payload[0].value)}</b>
                  </div>) : null} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <span style={{ fontSize: 22, fontWeight: 600, color: 'var(--tx)', ...num }}>{pctOf(I.paid, statusTotal)}%</span>
              <span style={{ fontSize: 10.5, color: 'var(--tx4)' }}>{T('مسدّدة', 'paid')}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 160 }}>
            {statusParts.map((p) => (
              <div key={p.k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 12.5 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: 'var(--tx3)' }}><span style={{ width: 10, height: 10, borderRadius: 3, background: p.c }} />{p.l}</span>
                <span style={{ ...num, color: 'var(--tx)', fontWeight: 600 }}>{fmt(p.v)} <span style={{ color: 'var(--tx4)', fontWeight: 400 }}>{pctOf(p.v, statusTotal)}%</span></span>
              </div>
            ))}
            {I.canc > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--tx4)', borderTop: '1px solid var(--bd2)', paddingTop: 8 }}>
                <span>{T('أُلغيت في الفترة', 'Cancelled in period')}</span><span style={{ ...num, color: DOWN, fontWeight: 600 }}>{fmt(I.canc)}</span>
              </div>
            )}
          </div>
        </div>
      ) : <div style={{ ...sub, padding: '28px 0', textAlign: 'center' }}>{T('لا فواتير في هذه الفترة', 'No invoices in this period')}</div>}
    </>
  )

  // ── الفواتير الشهرية ──
  const invMonthlyCard = show('invoices') && (
    <Section title={T('الفواتير الصادرة شهرياً', 'Invoices per month')} icon={FileText} right={<span style={sub}>{T('آخر 12 شهراً', 'Last 12 months')}</span>}>
      <div style={{ flex: 1, minHeight: 180, direction: 'ltr' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={agg.monthly} margin={{ top: 8, right: 6, left: 6, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="x" reversed={isAr} tickFormatter={(x) => x.slice(2)} tick={{ fontSize: 10.5, fill: AXIS, fontFamily: 'Cairo' }} tickLine={false} axisLine={{ stroke: GRID }} />
            <YAxis orientation={isAr ? 'right' : 'left'} allowDecimals={false} tick={{ fontSize: 10.5, fill: AXIS, fontFamily: 'Cairo' }} tickLine={false} axisLine={false} width={36} />
            <Tooltip wrapperStyle={{ zIndex: 20, outline: 'none' }} content={<ChartTip T={T} />} cursor={{ fill: 'rgba(176,125,0,.07)' }} />
            <Bar dataKey="n" name={T('فواتير', 'Invoices')} fill={SERIES[1]} radius={[4, 4, 0, 0]} maxBarSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Section>
  )

  // ── الإقامات ──
  const expParts = [
    { k: 'expired', l: T('منتهية', 'Expired'), v: W.expired, c: ST.crit },
    { k: 'd30', l: T('خلال 30 يوماً', 'Within 30 days'), v: W.d30, c: ST.serious },
    { k: 'd60', l: T('31 – 60 يوماً', '31–60 days'), v: W.d60, c: ST.warn },
    { k: 'd90', l: T('61 – 90 يوماً', '61–90 days'), v: W.d90, c: ST.pale },
    { k: 'ok', l: T('أكثر من 90 يوماً', 'Over 90 days'), v: W.ok, c: ST.good },
    { k: 'unknown', l: T('بلا تاريخ', 'No date'), v: W.unknown, c: ST.none },
  ]
  const iqamaCard = show('iqama') && (
    <Section title={T('صلاحية الإقامات', 'Iqama validity')} icon={ShieldAlert}>
      {/* لوحٌ واحد بأربع خانات في صفٍّ واحد دائماً، تفصلها خطوط شعرية؛ الرقم بلون حالته */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', border: '1px solid var(--bd)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
        {expParts.slice(0, 4).map((p, i) => (
          <div key={p.k} style={{ padding: '12px 14px', borderInlineStart: i ? '1px solid var(--bd)' : 'none', display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--tx3)', fontWeight: 500, minWidth: 0 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.c, flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.l}</span>
            </span>
            <span style={{ ...num, fontSize: 22, fontWeight: 600, color: 'var(--tx)', lineHeight: 1.2 }}>{fmt(p.v)}</span>
            <span style={{ ...num, fontSize: 10.5, color: 'var(--tx4)' }}>{pctOf(p.v, W.total)}%</span>
          </div>
        ))}
      </div>
      <StackBar parts={expParts} height={14} />
      <div style={{ marginTop: 10 }}><Legend parts={expParts} total={W.total} /></div>
    </Section>
  )

  const recvBody = show('invoices') && money && (
    <>
      {recvTotal ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ width: 150, height: 150, flexShrink: 0, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={recvParts} dataKey="v" nameKey="l" innerRadius={50} outerRadius={70} paddingAngle={1.5} stroke="var(--card-bg)" strokeWidth={2}>
                  {recvParts.map((p) => <Cell key={p.k} fill={p.c} />)}
                </Pie>
                <Tooltip wrapperStyle={{ zIndex: 20, outline: 'none' }} content={({ active, payload }) => active && payload?.length ? (
                  <div style={{ background: 'var(--modal-portal-bg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '6px 10px', fontSize: 12, fontFamily: "'Cairo',sans-serif", boxShadow: 'var(--shadow-md)' }}>
                    {payload[0].name}: <b style={{ fontWeight: 600 }}>{fmt(payload[0].value)}</b> {SAR} · {fmt(payload[0].payload.cnt)} {T('فاتورة', 'invoices')}
                  </div>) : null} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <span style={{ fontSize: 19, fontWeight: 600, color: 'var(--tx)', ...num }}>{compact(recvTotal)}</span>
              <span style={{ fontSize: 10.5, color: 'var(--tx4)' }}>{SAR}</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 9 }}>
            {recvParts.map((p) => (
              <div key={p.k} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'center', fontSize: 12.5 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: 'var(--tx2)', minWidth: 0 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: p.c, flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.l}</span>
                  <span style={{ ...num, color: 'var(--tx4)', fontSize: 11 }}>({fmt(p.cnt)})</span>
                </span>
                <span style={{ ...num, color: 'var(--tx)', fontWeight: 600 }}>{fmt(p.v)}</span>
                <span style={{ ...num, color: 'var(--tx4)', minWidth: 34, textAlign: 'end' }}>{pctOf(p.v, recvTotal)}%</span>
              </div>
            ))}
          </div>
        </div>
      ) : <div style={{ ...sub, padding: '28px 0', textAlign: 'center' }}>{T('لا مبالغ متبقية', 'Nothing outstanding')}</div>}
    </>
  )

  // ── السداد والمتبقي: كرت واحد (حالة سداد فواتير الفترة ثم المتبقي على العملاء حسب الخدمة) ──
  const subHead = (label, right) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tx2)' }}>{label}</span>{right}
    </div>
  )
  const payCard = (statusBody || recvBody) && (
    <Section title={T('حالة الفواتير', 'Invoice status')} icon={Wallet}>
      {statusBody && subHead(T('حالة سداد الفواتير', 'Payment status'))}
      {statusBody}
      {statusBody && recvBody && <div style={{ borderTop: '1px dashed var(--bd)', margin: '16px 0' }} />}
      {recvBody && subHead(T('المتبقي على العملاء', 'Outstanding balance'), <span style={sub}>{fmt(agg.recv.cnt)} {T('فاتورة غير مسدّدة بالكامل', 'open invoices')}</span>)}
      {recvBody}
    </Section>
  )

  // ── الوسطاء: كل وسيط كم فاتورة ونوع خدماتها (في المكتب المختار والفترة) ──
  const officeLabel = (id) => agg.officeRows.find((o) => o.id === id)?.label || (isAr ? 'بدون مكتب' : 'No office')
  const AG_MIN_YEAR = 3
  const agRows = Object.entries(agg.agentMap)
    .filter(([id]) => (agg.agentYear[id] || 0) >= AG_MIN_YEAR)
    .map(([id, m]) => ({ id, name: data.agentNames?.[id] || '—', ...m }))
    .sort((a, b) => b.cnt - a.cnt || b.sum - a.sum)
  const agInvTotal = agRows.reduce((a, r) => a + r.cnt, 0)
  const AG_TOP = 8
  const agShown = agAll ? agRows : agRows.slice(0, AG_TOP)
  const agentsCard = show('agents') && (
    <Section title={T('الوسطاء', 'Brokers')} icon={Users}
      right={<span style={{ ...sub, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
        <span><b style={{ ...num, color: 'var(--tx2)', fontWeight: 600 }}>{fmt(agRows.length)}</b> {T('وسيط', 'brokers')}</span>
        <span style={{ width: 1, height: 12, background: 'var(--bd)' }} />
        <span><b style={{ ...num, color: 'var(--tx2)', fontWeight: 600 }}>{fmt(agInvTotal)}</b> {T('فاتورة', 'invoices')}</span>
      </span>}>
      {agRows.length ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, max-content) minmax(0,1fr) auto auto', columnGap: 16, alignItems: 'center' }}>
            {agShown.map((r, i) => {
              const svcs = Object.entries(r.svc).sort((a, b) => svcRank(a[0]) - svcRank(b[0]) || b[1] - a[1])
              const offs = Object.entries(r.offices).sort((a, b) => b[1] - a[1])
              const line = { padding: '10px 0', borderTop: i ? '1px solid var(--bd2)' : 'none', minWidth: 0 }
              return (
                <React.Fragment key={r.id}>
                  <div style={{ ...line, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                    {agg.s === 'all' && <span style={{ fontSize: 10.5, color: 'var(--tx4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{offs.map(([b, n]) => offs.length > 1 ? `${officeLabel(b === '-' ? null : b)} (${n})` : officeLabel(b === '-' ? null : b)).join('، ')}</span>}
                  </div>
                  <div style={{ ...line, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {svcs.map(([code, n]) => (
                      <span key={code} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 22, padding: '0 8px', borderRadius: 6, background: 'var(--sunken)', fontSize: 11, color: 'var(--tx3)', whiteSpace: 'nowrap' }}>
                        <b style={{ ...num, color: 'var(--tx)', fontWeight: 600 }}>{fmt(n)}</b>{svcName(code)}
                      </span>
                    ))}
                  </div>
                  <div style={{ ...line, textAlign: 'end', whiteSpace: 'nowrap' }}>
                    <span style={{ ...num, fontSize: 15, fontWeight: 600, color: 'var(--tx)' }}>{fmt(r.cnt)}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--tx4)', marginInlineStart: 4 }}>{T('فاتورة', 'inv.')}</span>
                  </div>
                  <div style={{ ...line, textAlign: 'end', whiteSpace: 'nowrap', ...num, fontSize: 12, color: 'var(--tx3)' }}>
                    {money ? <>{fmt(r.sum)} <span style={{ fontSize: 10.5, color: 'var(--tx4)' }}>{SAR}</span></> : null}
                  </div>
                </React.Fragment>
              )
            })}
          </div>
          {agRows.length > AG_TOP && (
            <button className="hd-tab" onClick={() => setAgAll((v) => !v)} style={{ alignSelf: 'center', marginTop: 12, height: 32, fontSize: 12 }}>
              {agAll ? T('عرض أقل', 'Show less') : T(`عرض الكل (${agRows.length})`, `Show all (${agRows.length})`)}
            </button>
          )}
        </>
      ) : <div style={{ ...sub, padding: '24px 0', textAlign: 'center' }}>{T('لا فواتير بوسطاء في هذه الفترة', 'No broker invoices in this period')}</div>}
    </Section>
  )

  // ── الجنسيات ──
  const natSorted = Object.entries(agg.natMap).sort((a, b) => b[1] - a[1])
  const natTop = natSorted.slice(0, 5).map(([nat, v], i) => ({ k: nat, l: nat, v, c: SERIES[i] }))
  const natRest = natSorted.slice(5).reduce((s, [, v]) => s + v, 0)
  const natParts = natRest ? [...natTop, { k: '_other', l: T(`أخرى (${natSorted.length - 5})`, `Other (${natSorted.length - 5})`), v: natRest, c: OTHER }] : natTop
  const natCard = show('workers') && (
    <Section title={T('العمالة حسب الجنسية', 'Workers by nationality')} icon={Users} right={<span style={{ ...sub, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
        <span><b style={{ ...num, color: 'var(--tx2)', fontWeight: 600 }}>{fmt(W.total)}</b> {T('عامل', 'workers')}</span>
        <span style={{ width: 1, height: 12, background: 'var(--bd)' }} />
        <span><b style={{ ...num, color: 'var(--tx2)', fontWeight: 600 }}>{natSorted.length}</b> {T('جنسية', 'nationalities')}</span>
      </span>}>
      {W.total ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ width: 170, height: 170, flexShrink: 0, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={natParts} dataKey="v" nameKey="l" innerRadius={52} outerRadius={80} paddingAngle={1.5} stroke="var(--card-bg)" strokeWidth={2}>
                  {natParts.map((p) => <Cell key={p.k} fill={p.c} />)}
                </Pie>
                <Tooltip wrapperStyle={{ zIndex: 20, outline: 'none' }} content={({ active, payload }) => active && payload?.length ? (
                  <div style={{ background: 'var(--modal-portal-bg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '6px 10px', fontSize: 12, fontFamily: "'Cairo',sans-serif", boxShadow: 'var(--shadow-md)' }}>
                    {payload[0].name}: <b style={{ fontWeight: 600 }}>{fmt(payload[0].value)}</b> ({pctOf(payload[0].value, W.total)}%)
                  </div>) : null} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--tx)', ...num }}>{compact(W.total)}</span>
              <span style={{ fontSize: 10.5, color: 'var(--tx4)' }}>{T('عامل', 'workers')}</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 9 }}>
            {natParts.map((p) => (
              <div key={p.k} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'center', fontSize: 12.5 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: 'var(--tx2)' }}><span style={{ width: 10, height: 10, borderRadius: 3, background: p.c }} />{p.l}</span>
                <span style={{ ...num, color: 'var(--tx)', fontWeight: 600 }}>{fmt(p.v)}</span>
                <span style={{ ...num, color: 'var(--tx4)', minWidth: 34, textAlign: 'end' }}>{pctOf(p.v, W.total)}%</span>
              </div>
            ))}
          </div>
        </div>
      ) : <div style={{ ...sub, padding: '28px 0', textAlign: 'center' }}>{T('لا عمالة مسجّلة', 'No workers')}</div>}
    </Section>
  )

  const grid2 = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 16 }
  const pair = (a, b) => (a || b) && <div style={grid2}>{a}{b}</div>

  // ════ عرض الجوال: نفس الأرقام أعلاه، مرتّبةً كتطبيقٍ أصلي (بطاقة دخل رئيسية + مربعات + بطاقات بعرض كامل) ════
  if (isMobile) {
    const mSeg = (value, onChange, options) => (
      <div className="mh-seg" role="tablist">
        {options.map(([v, l]) => <button key={v} role="tab" aria-selected={v === value} data-on={v === value ? '1' : '0'} onClick={() => onChange(v)}>{l}</button>)}
      </div>
    )
    const mDelta = (cur, prev) => {
      const d = delta(cur, prev)
      if (d === 0 && !cur && !prev) return <span className="mh-delta flat">{T('لا حركة', 'No activity')}</span>
      if (d === null) return <span className="mh-delta up">{T('جديد', 'New')}</span>
      const flat = Math.abs(d) < 0.005, up = d > 0
      const Ic = flat ? Minus : up ? TrendingUp : TrendingDown
      return <span className={'mh-delta ' + (flat ? 'flat' : up ? 'up' : 'down')}><Ic size={13} strokeWidth={2.4} /><span dir="ltr">{flat ? '0%' : `${up ? '+' : ''}${Math.round(d * 100)}%`}</span></span>
    }
    const mEmpty = (t) => <div className="mh-empty">{t}</div>
    const mBarRows = (rows, { highlight, onPick, valueFmt = fmt } = {}) => {
      const max = Math.max(0, ...rows.map((r) => n0(r.v)))
      const tot = rows.reduce((a, r) => a + n0(r.v), 0)
      return (
        <div className="mh-bars">
          {rows.map((r, i) => (
            <div key={r.k ?? i} className={'mh-bar' + (onPick ? ' mk-tap' : '') + (highlight && highlight !== r.k ? ' dim' : '')} onClick={onPick ? () => onPick(r.k) : undefined}>
              <div className="mh-bar-top">
                <span className="mh-bar-l">{r.l}{r.note && <small>{r.note}</small>}</span>
                <span className="mh-bar-v">{valueFmt(r.v)}</span>
                <span className="mh-bar-p">{tot ? pctOf(r.v, tot) : 0}%</span>
              </div>
              <div className="mh-bar-track"><i style={{ width: `${max ? Math.max(2, (n0(r.v) / max) * 100) : 0}%`, background: r.c || GOLD }} /></div>
            </div>
          ))}
        </div>
      )
    }
    const mDonut = (parts, center, centerSub, size = 124) => (
      <div className="mh-donut" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={parts.filter((p) => p.v > 0)} dataKey="v" nameKey="l" innerRadius={size / 2 - 17} outerRadius={size / 2 - 2} paddingAngle={2} stroke="var(--m-surface)" strokeWidth={2} isAnimationActive={false}>
              {parts.filter((p) => p.v > 0).map((p) => <Cell key={p.k} fill={p.c} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="mh-donut-c"><b>{center}</b><small>{centerSub}</small></div>
      </div>
    )
    const mLegendRows = (parts, total) => (
      <div className="mh-dl">
        {parts.map((p) => (
          <div key={p.k} className="mh-dl-row">
            <span className="mh-dl-l"><i style={{ background: p.c }} />{p.l}</span>
            <span className="mh-dl-v">{fmt(p.v)}</span>
            {total > 0 && <span className="mh-dl-p">{pctOf(p.v, total)}%</span>}
          </div>
        ))}
      </div>
    )
    const axisTick = { fontSize: 11, fill: AXIS, fontFamily: 'Cairo' }

    // ── بطاقة الدخل الرئيسية ──
    const mHero = show('income') && money && (
      <div className="mh-hero">
        <div className="mh-hero-lbl"><Wallet size={15} strokeWidth={2} /><span>{T('الدخل', 'Income')}</span><em>{periodLabel[period]}</em></div>
        <div className="mh-hero-num"><b>{fmt(net)}</b><small>{SAR}</small></div>
        <div className="mh-hero-cmp">{mDelta(net, netP)}<span>{prevLabel[period]}</span></div>
        <div className="mh-hero-bar">
          {F.cash + F.bank > 0 ? <><i style={{ flex: `${F.cash} 1 0`, background: '#e8c35a' }} /><i style={{ flex: `${F.bank} 1 0`, background: '#7fb0ea' }} /></> : <i style={{ flex: 1, background: 'rgba(255,255,255,.12)' }} />}
        </div>
        <div className="mh-hero-split">
          {[
            { k: 'cash', c: '#e8c35a', l: T('نقداً', 'Cash'), v: F.cash },
            { k: 'bank', c: '#7fb0ea', l: T('تحويل', 'Bank'), v: F.bank },
            { k: 'out', c: '#f08a7e', l: T('ملغى', 'Cancelled'), v: F.out, red: true },
          ].map((x) => (
            <div key={x.k}>
              <span><i style={{ background: x.c }} />{x.l}</span>
              <b className={x.red && x.v ? 'red' : undefined}>{fmt(x.v)}</b>
            </div>
          ))}
        </div>
      </div>
    )

    // ── مربعات المؤشرات ──
    const tiles = [
      show('invoices') && { k: 'inv', icon: FileText, c: SERIES[1], l: T('فواتير جديدة', 'New invoices'), v: fmt(I.cnt),
        sub: <>{mDelta(I.cnt, I.cntP)}{money && <span>{T('بقيمة', 'Worth')} <b>{compact(I.sum)}</b></span>}</> },
      show('invoices') && { k: 'old', icon: Banknote, c: GOLD, l: T('فواتير دفعات', 'With payments'), v: fmt(P.oldCnt),
        sub: money ? <span>{T('دُفع', 'Paid')} <b>{fmt(P.oldSum)}</b></span> : I.canc > 0 && <span>{T('ملغاة', 'Cancelled')} <b className="red">{fmt(I.canc)}</b></span> },
      show('invoices') && money && { k: 'recv', icon: Building2, c: ST.serious, l: T('المتبقي على العملاء', 'Outstanding'), v: fmt(agg.recv.sum), unit: SAR,
        sub: <span>{T('على', 'On')} <b>{fmt(agg.recv.cnt)}</b> {T('فاتورة', 'invoices')}</span> },
      show('workers') && { k: 'wk', icon: Users, c: SERIES[2], l: T('العمالة المسجّلة', 'Workers'), v: fmt(W.total), unit: T('عامل', ''),
        sub: <span><b className="red">{fmt(W.expired)}</b> {T('منتهية', 'expired')} · <b className="org">{fmt(W.d30)}</b> {T('خلال 30 يوماً', '≤30d')}</span> },
    ].filter(Boolean)
    const mTiles = tiles.length > 0 && (
      <div className="mh-tiles">
        {tiles.map(({ k, icon: Ic, c, l, v, unit, sub: s }) => (
          <div key={k} className="mh-tile" style={{ '--tone': c }}>
            <div className="mh-tile-h"><span className="mh-tile-ic"><Ic size={16} strokeWidth={2} /></span><span className="mh-tile-l">{l}</span></div>
            <div className="mh-tile-v">{v}{unit && <small>{unit}</small>}</div>
            {s && <div className="mh-tile-s">{s}</div>}
          </div>
        ))}
      </div>
    )

    // ── حركة الدخل ──
    const mTrend = show('income') && money && (
      <section className="mh-card">
        <div className="mh-card-h"><h3>{T('حركة الدخل', 'Income trend')}</h3></div>
        {mSeg(trend, setTrend, [['daily', T('آخر 30 يوماً', 'Last 30 days')], ['monthly', T('آخر 12 شهراً', 'Last 12 months')]])}
        <div className="mh-legend">
          <span><i style={{ background: GOLD }} />{T('الداخل', 'Received')} <b>{fmt(trendData.reduce((s, r) => s + r.in, 0))}</b></span>
          <span><i style={{ background: ST.crit }} />{T('الملغى', 'Cancelled')} <b>{fmt(trendData.reduce((s, r) => s + r.out, 0))}</b></span>
        </div>
        <div className="mh-chart" style={{ height: 176 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 6, right: 2, left: 2, bottom: 0 }}>
              <defs>
                <linearGradient id="mhIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GOLD} stopOpacity={0.3} /><stop offset="100%" stopColor={GOLD} stopOpacity={0.02} /></linearGradient>
              </defs>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="x" reversed={isAr} tickFormatter={(x) => (trend === 'daily' ? x.slice(8) + '/' + x.slice(5, 7) : x.slice(5) + '/' + x.slice(2, 4))} tick={axisTick} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={22} />
              <YAxis orientation={isAr ? 'right' : 'left'} tickFormatter={compact} tick={axisTick} tickLine={false} axisLine={false} width={36} />
              <Tooltip wrapperStyle={{ zIndex: 20, outline: 'none' }} content={<ChartTip T={T} />} cursor={{ stroke: 'rgba(120,100,60,.35)', strokeWidth: 1 }} />
              <Area type="monotone" dataKey="in" name={T('الداخل', 'Received')} stroke={GOLD} strokeWidth={2} fill="url(#mhIn)" activeDot={{ r: 4.5, stroke: '#fff', strokeWidth: 2 }} />
              <Area type="monotone" dataKey="out" name={T('الملغى', 'Cancelled')} stroke={ST.crit} strokeWidth={1.6} strokeDasharray="4 3" fill="none" activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    )

    // ── حالة السداد ──
    const mStatus = show('invoices') && (
      <section className="mh-card">
        <div className="mh-card-h"><h3>{T('حالة سداد الفواتير', 'Payment status')}</h3><span className="mh-card-note">{periodLabel[period]}</span></div>
        {statusTotal ? (
          <div className="mh-donut-row">
            {mDonut(statusParts, `${pctOf(I.paid, statusTotal)}%`, T('مسدّدة', 'paid'))}
            <div style={{ flex: 1, minWidth: 0 }}>
              {mLegendRows(statusParts, statusTotal)}
              {I.canc > 0 && <div className="mh-dl-foot"><span>{T('أُلغيت في الفترة', 'Cancelled')}</span><b>{fmt(I.canc)}</b></div>}
            </div>
          </div>
        ) : mEmpty(T('لا فواتير في هذه الفترة', 'No invoices in this period'))}
      </section>
    )

    // ── المتبقي على العملاء حسب الخدمة ──
    const mRecv = show('invoices') && money && (
      <section className="mh-card">
        <div className="mh-card-h"><h3>{T('المتبقي على العملاء', 'Outstanding balance')}</h3><span className="mh-card-note">{fmt(agg.recv.cnt)} {T('فاتورة مفتوحة', 'open invoices')}</span></div>
        {recvTotal ? (
          <>
            <div className="mh-big"><b>{fmt(recvTotal)}</b><small>{SAR}</small></div>
            <div className="mh-stack">{recvParts.filter((p) => p.v > 0).map((p) => <i key={p.k} style={{ flex: `${p.v} 1 0`, background: p.c }} />)}</div>
            <div className="mh-dl">
              {recvParts.map((p) => (
                <div key={p.k} className="mh-dl-row">
                  <span className="mh-dl-l"><i style={{ background: p.c }} />{p.l}<small>({fmt(p.cnt)})</small></span>
                  <span className="mh-dl-v">{fmt(p.v)}</span>
                  <span className="mh-dl-p">{pctOf(p.v, recvTotal)}%</span>
                </div>
              ))}
            </div>
          </>
        ) : mEmpty(T('لا مبالغ متبقية', 'Nothing outstanding'))}
      </section>
    )

    // ── الفواتير حسب الخدمة ──
    const mSvc = show('invoices') && (
      <section className="mh-card">
        <div className="mh-card-h"><h3>{T('الفواتير حسب الخدمة', 'Invoices by service')}</h3>{!money && <span className="mh-card-note">{periodLabel[period]}</span>}</div>
        {money && mSeg(svcMetric, setSvcMetric, [['cnt', T('العدد', 'Count')], ['sum', T('القيمة', 'Value')]])}
        {svcRows.some((r) => n0(r.v) > 0) ? mBarRows(svcRows.filter((r) => n0(r.v) > 0)) : mEmpty(T('لا فواتير في هذه الفترة', 'No invoices in this period'))}
      </section>
    )

    // ── الفواتير الصادرة شهرياً ──
    const mInvMonthly = show('invoices') && (
      <section className="mh-card">
        <div className="mh-card-h"><h3>{T('الفواتير الصادرة شهرياً', 'Invoices per month')}</h3><span className="mh-card-note">{T('آخر 12 شهراً', 'Last 12 months')}</span></div>
        <div className="mh-chart" style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={agg.monthly} margin={{ top: 6, right: 2, left: 2, bottom: 0 }} barCategoryGap="24%">
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="x" reversed={isAr} tickFormatter={(x) => x.slice(5)} tick={axisTick} tickLine={false} axisLine={{ stroke: GRID }} interval={1} />
              <YAxis orientation={isAr ? 'right' : 'left'} allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} width={30} />
              <Tooltip wrapperStyle={{ zIndex: 20, outline: 'none' }} content={<ChartTip T={T} />} cursor={{ fill: 'rgba(176,125,0,.07)' }} />
              <Bar dataKey="n" name={T('فواتير', 'Invoices')} fill={SERIES[1]} radius={[5, 5, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    )

    // ── مقارنة المكاتب ──
    const cmpShort = { net: T('الدخل', 'Income'), cnt: T('الفواتير', 'Invoices'), sum: T('القيمة', 'Value'), workers: T('العمالة', 'Workers') }
    const mOffices = show('offices') && (
      <section className="mh-card">
        <div className="mh-card-h"><h3>{T('مقارنة المكاتب', 'Office comparison')}</h3><span className="mh-card-note">{metric === 'workers' ? T('حالياً', 'Now') : periodLabel[period]}</span></div>
        {mSeg(metric, setCmpMetric, cmpOpts.map(([k]) => [k, cmpShort[k]]))}
        {cmpRows.length ? mBarRows(cmpRows, { highlight: agg.s !== 'all' ? agg.s : null, onPick: (id) => id && pickOffice(id) }) : mEmpty(T('لا بيانات في هذه الفترة', 'No data for this period'))}
      </section>
    )

    // ── الوسطاء ──
    const mAgents = show('agents') && (
      <section className="mh-card">
        <div className="mh-card-h"><h3>{T('الوسطاء', 'Brokers')}</h3><span className="mh-card-note">{fmt(agRows.length)} {T('وسيط', 'brokers')} · {fmt(agInvTotal)} {T('فاتورة', 'invoices')}</span></div>
        {agRows.length ? (
          <div className="mh-ag">
            {agShown.map((r) => {
              const svcs = Object.entries(r.svc).sort((a, b) => svcRank(a[0]) - svcRank(b[0]) || b[1] - a[1])
              const offs = Object.entries(r.offices).sort((a, b) => b[1] - a[1])
              return (
                <div key={r.id} className="mh-ag-row">
                  <span className="mh-av">{String(r.name).trim().charAt(0)}</span>
                  <div className="mh-ag-main">
                    <div className="mh-ag-name">{r.name}</div>
                    {agg.s === 'all' && <div className="mh-ag-off">{offs.map(([b, n]) => offs.length > 1 ? `${officeLabel(b === '-' ? null : b)} (${n})` : officeLabel(b === '-' ? null : b)).join('، ')}</div>}
                    <div className="mh-tags">{svcs.map(([code, n]) => <span key={code}><b>{fmt(n)}</b>{svcName(code)}</span>)}</div>
                  </div>
                  <div className="mh-ag-num">
                    <b>{fmt(r.cnt)}</b><small>{T('فاتورة', 'inv.')}</small>
                    {money && <span>{fmt(r.sum)} {SAR}</span>}
                  </div>
                </div>
              )
            })}
            {agRows.length > AG_TOP && <button className="mh-more" onClick={() => setAgAll((v) => !v)}>{agAll ? T('عرض أقل', 'Show less') : T(`عرض الكل (${agRows.length})`, `Show all (${agRows.length})`)}</button>}
          </div>
        ) : mEmpty(T('لا فواتير بوسطاء في هذه الفترة', 'No broker invoices in this period'))}
      </section>
    )

    // ── صلاحية الإقامات ──
    const mIqama = show('iqama') && (
      <section className="mh-card">
        <div className="mh-card-h"><h3>{T('صلاحية الإقامات', 'Iqama validity')}</h3><span className="mh-card-note">{fmt(W.total)} {T('عامل', 'workers')}</span></div>
        <div className="mh-stack" style={{ height: 10 }}>{W.total ? expParts.filter((p) => p.v > 0).map((p) => <i key={p.k} style={{ flex: `${p.v} 1 0`, background: p.c }} />) : <i style={{ flex: 1, background: 'var(--bd2)' }} />}</div>
        <div className="mh-cells">
          {expParts.map((p) => (
            <div key={p.k} className="mh-cell">
              <span className="mh-cell-l"><i style={{ background: p.c }} />{p.l}</span>
              <span className="mh-cell-v">{fmt(p.v)}<small>{pctOf(p.v, W.total)}%</small></span>
            </div>
          ))}
        </div>
      </section>
    )

    // ── الجنسيات ──
    const mNat = show('workers') && (
      <section className="mh-card">
        <div className="mh-card-h"><h3>{T('العمالة حسب الجنسية', 'By nationality')}</h3><span className="mh-card-note">{natSorted.length} {T('جنسية', 'nationalities')}</span></div>
        {W.total ? (
          <div className="mh-donut-row">
            {mDonut(natParts, compact(W.total), T('عامل', 'workers'))}
            <div style={{ flex: 1, minWidth: 0 }}>{mLegendRows(natParts, W.total)}</div>
          </div>
        ) : mEmpty(T('لا عمالة مسجّلة', 'No workers'))}
      </section>
    )

    const grp = (title, ...items) => items.some(Boolean) && React.createElement(React.Fragment, null, <div className="mh-group">{title}</div>, ...items)
    return (
      <div className="mh">
        {mHeader}
        {mPeriodChips}
        {mOfficeChips}
        {mRangeSheet}
        {!money && show('income') && <div className="mh-note"><Info size={15} />{T('الأرقام المالية غير متاحة لدورك — تظهر الأعداد فقط.', 'Financial figures are not available for your role — counts only.')}</div>}
        {mHero}
        {mTiles}
        {grp(T('المالية', 'Finance'), mTrend, mStatus, mRecv)}
        {grp(T('الفواتير', 'Invoices'), mSvc, mInvMonthly)}
        {grp(T('المكاتب والوسطاء', 'Offices & brokers'), mOffices, mAgents)}
        {grp(T('العمالة', 'Workers'), mIqama, mNat)}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 24 }}>
      <style>{HD_CSS}</style>
      {header}
      {officeChips}
      {!money && show('income') && (
        <div style={{ ...card, padding: '10px 14px', fontSize: 12, color: 'var(--tx3)' }}>{T('الأرقام المالية غير متاحة لدورك — تظهر الأعداد فقط.', 'Financial figures are not available for your role — counts only.')}</div>
      )}
      {kpis.length > 0 && <div className="hd-kpis-wrap" style={{ paddingBottom: 22, marginBottom: 6, borderBottom: '1px solid var(--bd)' }}><div className="hd-kpis" style={{ gridTemplateColumns: kpis.map((k) => `minmax(0,${KPI_W[k.key] || 1}fr)`).join(' ') }}>{kpis}</div></div>}
      {pair(trendCard, invMonthlyCard)}
      {pair(svcCard, payCard)}
      {pair(iqamaCard, natCard)}
      {officeCompare}
      {agentsCard}
    </div>
  )
}
