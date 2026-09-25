import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { MStatStrip, MCardList, MFab, MChips, MSearch, MBadge, mTone } from '../MobileKit.jsx'
import { useBackHandler } from '../../../lib/mobileBack.js'

/* ═══════════════════════════════════════════════════════════════════════════
   «جداول العمل» على الجوال — قائمةٌ أصلية بدل الشبكة العريضة.
   عرضٌ فقط: كل البيانات والصلاحيات والكتابة تأتي من محرّك OpsExcelsPage عبر
   الدوالّ الممرَّرة (`api`) — لا جلب هنا ولا حفظ ولا حساب.
   · MSheetList   — العنوان · البحث · الشرائح (التبويبات/الحالة/الفترة) · الأرقام · البطاقات · زرّ الإضافة
   · MSheetDetail — صفحة الصفّ كاملة: رأسٌ ومراحل ثم مجموعات «التسمية/القيمة»، والتعديل بورقةٍ من أسفل
   ═══════════════════════════════════════════════════════════════════════════ */

const PAGE = 30
const s = (v) => String(v ?? '').trim()
const first = (t) => s(t).split('\n')[0].trim()

/* ── لون الحالة: خلفيّة الخليّة (rgba) ← نغمةٌ مسمّاة تُقرأ على الفاتح ── */
export function toneOfBg(bg) {
  if (!bg || typeof bg !== 'string') return null
  const m = bg.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (!m) return null
  const [r, g, b] = [m[1], m[2], m[3]].map((x) => Number(x) / 255)
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  if (d < 0.12) return 'gray'
  let h
  if (mx === r) h = ((g - b) / d) % 6
  else if (mx === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h = (h * 60 + 360) % 360
  if (h < 22 || h >= 335) return 'red'
  if (h < 68) return 'orange'
  if (h < 170) return 'green'
  if (h < 255) return 'blue'
  return 'purple'
}

/* حالةُ مرحلة: تم/لا يحتاج/ملغاة = مقضيّة · مشكلة = متعثّرة · غيرها = منتظرة */
const DONE_RE = /^(تم|أنجزت|لا يحتاج|ملغاة|منجز|Done|Not needed)$/
export function stageState(v) {
  const t = first(v)
  if (!t) return 'todo'
  if (DONE_RE.test(t)) return 'done'
  if (/مشكلة|متعثّر|Problem|Issue/.test(t)) return 'issue'
  return 'wait'
}

const TITLE_KEYS = ['worker_name', 'name_ar', 'saudi_name', 'sd_saudi_name', 'entity_full_name_ar', 'nickname', 'facility_ar',
  'facility_name', 'client_name', 'agent_name', 'sr_facility_name', 'person_name']
const SUB_KEYS = ['facility_ar', 'client_name', 'invoice_no', 'iqama_number', 'unified_number', 'cr_national_number',
  'id_number', 'branch_code', 'service_ar']
const STATUS_KEYS = /(^|_)(status|state|stage|st)(_ar)?$|^sv_state$|^tr_reached$|^col_state$|^payment_state$/
const MONEY_KEYS = ['total_amount', 'invoice_total', 'sr_amount', 'dep_total', 'sd_amount', '_due', 'amount', 'jawazat_balance']
const SKIP_KINDS = new Set(['rownum', 'bmk', 'photo', 'file', 'multifile', 'filepair', 'files', 'link', 'msg', 'longtext', 'fetch', 'yesno', 'pay'])
const LONG_KEYS = /note|notes|text|reason|follow/

/* ── مواصفة البطاقة: عامّةٌ من تعريف الأعمدة، ويعلوها ما يعرّفه العرض ──────
   العنوان/الفرعي قائمتا مفاتيح يُؤخذ منهما **أوّل غير فارغ لكل صفّ** (عاملٌ
   بلا اسمٍ يُعرَف بعميله). والحقول الأكثر امتلاءً في عيّنة من الصفوف، بترتيب
   الجدول — فلا تمتلئ البطاقة بـ«—». */
export function buildSpec({ cols, sample, fmt, override = {}, stages }) {
  const byKey = new Map(cols.map((c) => [c.key, c]))
  const fill = new Map()
  for (const c of cols) {
    let n = 0
    for (const r of sample) if (s(fmt(r, c))) n++
    fill.set(c.key, sample.length ? n / sample.length : 0)
  }
  const has = (k) => byKey.has(k)
  const okCol = (c) => c && !SKIP_KINDS.has(c.kind) && !c.render
  let title = (override.title || TITLE_KEYS).filter(has)
  if (!title.length) {
    const t = cols.find((c) => okCol(c) && c.kind !== 'num' && c.kind !== 'date' && (fill.get(c.key) || 0) > 0.4)
    title = t ? [t.key] : []
  }
  const sub = (override.sub || SUB_KEYS).filter((k) => has(k) && !title.slice(0, 1).includes(k))
  let badge = override.badge !== undefined ? override.badge : null
  if (badge === null && override.badge !== false) {
    const cand = cols.filter((c) => (c.bg || c.select || c.options) && STATUS_KEYS.test(c.key) && (fill.get(c.key) || 0) > 0.2
      && c.kind !== 'num' && c.kind !== 'date')
    // الأكثر امتلاءً أوّلاً (حالةٌ فارغة في أغلب الصفوف لا تصلح شارة)، ثم المُدخَل
    const pref = (c) => (c.ops ? 2 : 0) + (/request_status|sv_state|work|op_status|sr_status/.test(c.key) ? 1 : 0) - (/payment|invoice_status/.test(c.key) ? 2 : 0)
    const fr = (c) => Math.round((fill.get(c.key) || 0) * 5)
    cand.sort((a, b) => (fr(b) - fr(a)) || (pref(b) - pref(a)))
    badge = cand[0] ? cand[0].key : null
  }
  if (badge && !has(badge)) badge = null
  const payCol = cols.find((c) => c.kind === 'pay')
  let amount = override.amount !== undefined ? override.amount : (MONEY_KEYS.find((k) => has(k) && (fill.get(k) || 0) > 0.2) || null)
  if (amount && !has(amount)) amount = null
  const used = new Set([...title, ...sub.slice(0, 2), badge, amount].filter(Boolean))
  for (const g of (stages || [])) used.add(g.st)
  let fields = (override.fields || null)
  if (fields) fields = fields.filter(has)
  else {
    fields = cols
      .filter((c) => okCol(c) && !used.has(c.key) && !LONG_KEYS.test(c.key) && (fill.get(c.key) || 0) >= 0.35)
      .slice(0, 4).map((c) => c.key)
  }
  return { title, sub, badge, amount, pay: payCol ? payCol.key : null, fields, stages: stages || null }
}

/* ── تقدّم المراحل في البطاقة: شريطٌ مقسّم (قطعةٌ لكل مرحلة بلونها) وسطرٌ يقول
   أين يقف الصفّ — المتعثّرة أوّلاً، ثم التالية المنتظرة، وإلا «مكتملة». ── */
function StageDots({ items, isAr = true }) {
  const live = items.filter((g) => g.state !== 'na')
  const done = live.filter((g) => g.state === 'done').length
  const issue = live.find((g) => g.state === 'issue')
  const next = live.find((g) => g.state !== 'done')
  const st = issue ? 'issue' : !next ? 'done' : 'wait'
  const txt = issue ? (isAr ? 'متعثّرة: ' : 'Blocked: ') + issue.label
    : !next ? (isAr ? 'اكتملت المراحل' : 'All stages done')
      : (isAr ? 'التالية: ' : 'Next: ') + next.label
  return (
    <div className="msh-stages">
      <span className="msh-segbar" aria-hidden>
        {items.map((g) => <i key={g.st} className={g.state} />)}
      </span>
      <span className={'msh-stage-txt ' + st}>{txt}</span>
      <span className="msh-stage-n">{done}/{live.length}</span>
    </div>
  )
}

const fmtMoney = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })

/* ═══ القائمة ═══════════════════════════════════════════════════════════════ */
export function MSheetList({ api }) {
  const {
    isAr, T, title, hint, rows, loading, loadErr, cols, spec, cardOf, stats, summary,
    search, setSearch, tabs, tabSel, setTabSel, tabCounts, period, day, canAdd, addLabel, onAdd, onOpen, resetKey,
    filters, hidden,
  } = api
  const [n, setN] = useState(PAGE)
  const [chip, setChip] = useState('all')
  useEffect(() => { setN(PAGE) }, [resetKey, chip])
  useEffect(() => { setChip('all') }, [api.viewKey])

  /* شرائح الحالة — عرضٌ محلّي فوق المُصفّى (لا تمسّ فلاتر الجدول المحفوظة):
     للمراحل: قيد العمل · متعثّرة · مكتملة، وإلا قيمُ عمود الحالة إن قلّت. */
  const chipDefs = useMemo(() => {
    if (tabs && tabs.length > 1) return null
    if (spec.stages && spec.stages.length) {
      const cls = (r) => {
        const st = cardOf.stagesOf(r)
        if (st.some((g) => g.state === 'issue')) return 'issue'
        if (st.every((g) => g.state === 'done' || g.state === 'na')) return 'done'
        return 'open'
      }
      const cnt = { open: 0, issue: 0, done: 0 }
      const tag = new Map()
      for (const r of rows) { const c = cls(r); cnt[c]++; tag.set(r._id, c) }
      return {
        tag: (r) => tag.get(r._id),
        options: [
          { value: 'all', label: T('الكل', 'All'), count: rows.length },
          { value: 'open', label: T('قيد العمل', 'In progress'), count: cnt.open },
          { value: 'issue', label: T('متعثّرة', 'Blocked'), count: cnt.issue },
          { value: 'done', label: T('مكتملة', 'Complete'), count: cnt.done },
        ].filter((o) => o.value === 'all' || o.count > 0),
      }
    }
    if (!spec.badge) return null
    const m = new Map()
    for (const r of rows) { const b = cardOf.badgeOf(r); const k = b ? b.text : ''; m.set(k, (m.get(k) || 0) + 1) }
    if (m.size < 2 || m.size > 8) return null
    return {
      tag: (r) => { const b = cardOf.badgeOf(r); return b ? b.text : '' },
      options: [{ value: 'all', label: T('الكل', 'All'), count: rows.length },
        ...[...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, c]) => ({ value: k || '__none', label: k || T('بلا حالة', 'No status'), count: c }))],
    }
  }, [rows, spec, cardOf, tabs, T])
  const shown = useMemo(() => {
    if (!chipDefs || chip === 'all') return rows
    return rows.filter((r) => (chipDefs.tag(r) || '__none') === chip)
  }, [rows, chipDefs, chip])
  const slice = shown.slice(0, n)
  const cards = slice.map((r) => ({ ...cardOf.card(r), key: r._id, onClick: () => onOpen(r._id) }))
  const more = shown.length > n

  const strip = [
    ...(stats || []),
    ...((summary || []).map((x) => ({ label: x.label, value: x.value, tone: x.tone === 'bad' ? 'red' : x.tone === 'warn' ? 'orange' : x.tone === 'good' ? 'green' : 'gold' }))),
  ]

  return (
    <div className="msh" dir={isAr ? 'rtl' : 'ltr'}>
      <header className="msh-head">
        <h1>{title}</h1>
        {hint && <p>{hint}</p>}
      </header>
      <MSearch value={search} onChange={setSearch} placeholder={T('ابحث بالاسم أو الرقم…', 'Search by name or number…')} />
      {tabs && tabs.length > 1 && (
        <MChips value={tabSel} onChange={setTabSel}
          options={tabs.map((t) => ({ value: t.key, label: t.label, count: tabCounts ? (tabCounts.get(t.key) || 0) : undefined }))} />
      )}
      {period && <PeriodBar p={period} T={T} />}
      {day && <DayBar d={day} T={T} isAr={isAr} />}
      {filters && (
        <div className="msh-filters">
          <span>{filters.count ? T(`${filters.count} فلتر محفوظ يسري على القائمة`, `${filters.count} saved filters applied`) : T('القائمة مرتّبة بفرزٍ محفوظ', 'A saved sort is applied')}</span>
          <button onClick={filters.clear}>{T('مسح', 'Clear')}</button>
        </div>
      )}
      {!loading && strip.length > 0 && <MStatStrip items={strip} />}
      {chipDefs && !loading && chipDefs.options.length > 2 && <MChips value={chip} onChange={setChip} options={chipDefs.options} />}
      {loadErr ? (
        <div className="msh-err">{T('تعذّر التحميل: ', 'Load failed: ')}{loadErr}</div>
      ) : (
        <MCardList rows={cards} loading={loading}
          onEndReached={more ? () => setN((x) => x + PAGE) : undefined}
          empty={(
            <div className="msh-empty">
              <span className="msh-empty-ico" aria-hidden>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M3 9h18M8 13h8M8 16h5" /></svg>
              </span>
              <b>{search ? T('لا نتائج مطابقة', 'No matches') : T('لا صفوف هنا بعد', 'Nothing here yet')}</b>
              <span>{search ? T('جرّب كلمةً أخرى أو رقماً مختلفاً', 'Try another word or number') : (period ? T('غيّر الفترة لعرض صفوفٍ أخرى', 'Change the period to see other rows') : '')}</span>
            </div>
          )}
          footer={(
            <div className="msh-foot">
              {more
                ? <button className="msh-more" onClick={() => setN((x) => x + PAGE)}>{T('عرض المزيد', 'Show more')} <small>{shown.length - n}</small></button>
                : shown.length > 0 && <span>{T(`${shown.length} صف`, `${shown.length} rows`)}</span>}
              {hidden && <button className="msh-hidden-btn" onClick={hidden.toggle}>{hidden.on ? T('إخفاء المحذوفة', 'Hide removed') : T(`المحذوفة (${hidden.count})`, `Removed (${hidden.count})`)}</button>}
            </div>
          )} />
      )}
      {canAdd && <MFab label={addLabel} onClick={onAdd} />}
    </div>
  )
}

/* منتقي الفترة في سطرٍ واحد: ‹ المدى › ثم زرّ «الكل» — لمسُ المدى يعيده للفترة الجارية */
const AR_MON = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
const EN_MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const ymdD = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null }
export function rangeLabel({ from, sel, unit }, isAr) {
  const a = ymdD(from), z0 = ymdD(sel)
  if (!a || !z0) return ''
  const M = isAr ? AR_MON : EN_MON
  let z = z0
  if (unit === 'week') { z = new Date(z0); z.setDate(z.getDate() + 6) }
  if (unit === 'month') {
    const y = z0.getFullYear()
    return (a.getMonth() === z0.getMonth() && a.getFullYear() === y) ? `${M[y === a.getFullYear() ? a.getMonth() : 0]} ${y}` : `${M[a.getMonth()]} – ${M[z0.getMonth()]} ${y}`
  }
  const d = (x) => `${x.getDate()} ${M[x.getMonth()]}`
  return a.getTime() === z.getTime() ? d(a) : `${d(a)} – ${d(z)}`
}
function PeriodBar({ p, T }) {
  return (
    <>
      <div className="msh-period">
        <div className={'msh-step' + (p.isAll ? ' all' : '')}>
          <button aria-label={T('الأقدم', 'Older')} disabled={!p.canPrev} onClick={p.prev}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
          </button>
          <button className="msh-step-lbl" onClick={p.current} disabled={p.isCurrent}>
            <small>{p.name}{!p.isCurrent && !p.isAll && !p.isNoDate ? ' · ' + T('رجوع للحالية', 'back to current') : ''}</small>
            <b>{p.isAll ? p.allLabel : p.isNoDate ? T('بلا تاريخ', 'No date') : p.label}</b>
          </button>
          <button aria-label={T('الأحدث', 'Newer')} disabled={!p.canNext} onClick={p.next}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
          </button>
        </div>
        <button className={'msh-tgl' + (p.isAll ? ' on' : '')} onClick={p.isAll ? p.current : p.all}>{T('الكل', 'All')}</button>
        {p.noDate > 0 && <button className={'msh-tgl' + (p.isNoDate ? ' on' : '')} onClick={p.toggleNoDate}>{T('بلا تاريخ', 'No date')} <small>{p.noDate}</small></button>}
      </div>
      {p.missed > 0 && (
        <button className="msh-missed" onClick={p.all}>{T(`${p.missed} نتيجة خارج هذه الفترة — أظهرها`, `${p.missed} matches outside this period — show`)}</button>
      )}
    </>
  )
}

function DayBar({ d, T, isAr }) {
  const lbl = d.isAll ? T('كل الأيام', 'All days') : d.isToday ? T('اليوم', 'Today') : rangeLabel({ from: d.value, sel: d.value, unit: 'day' }, isAr)
  return (
    <div className="msh-period">
      <div className={'msh-step' + (d.isAll ? ' all' : '')}>
        <button aria-label={T('اليوم السابق', 'Previous day')} disabled={d.isAll} onClick={d.prev}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
        </button>
        <label className="msh-step-lbl msh-day">
          <small>{T('اليوم', 'Day')}</small>
          <b>{lbl}</b>
          <input type="date" value={d.isAll ? '' : d.value} onChange={(e) => d.set(e.target.value)} aria-label={T('اختر يوماً', 'Pick a day')} />
        </label>
        <button aria-label={T('اليوم التالي', 'Next day')} disabled={d.isAll} onClick={d.next}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>
        </button>
      </div>
      <button className={'msh-tgl' + (d.isAll ? ' on' : '')} onClick={d.isAll ? d.today : d.all}>{T('الكل', 'All')}</button>
    </div>
  )
}

/* ═══ صفحة الصفّ ═══════════════════════════════════════════════════════════ */
export function MSheetDetail({ api, rowId, onClose }) {
  const { isAr, T, rowOf, cols, groups, cardOf, cell, actions, statusOf } = api
  const row = rowOf(rowId)
  const [edit, setEdit] = useState(null)       // { col }
  const [showEmpty, setShowEmpty] = useState(false)
  const [closing, setClosing] = useState(false)
  const close = () => { setClosing(true); setTimeout(onClose, 220) }
  useBackHandler(!!rowId && !edit, () => { close(); return true })
  useBackHandler(!!edit, () => { setEdit(null); return true })
  const bodyRef = useRef(null)
  // الصفحة تحت الورقة لا تُمرَّر معها
  useEffect(() => {
    const el = document.querySelector('.dash-content')
    const prev = el ? el.style.overflow : ''
    if (el) el.style.overflow = 'hidden'
    return () => { if (el) el.style.overflow = prev }
  }, [])
  if (!row) return null
  const card = cardOf.card(row)
  const stages = cardOf.stagesOf(row)
  const st = statusOf(row)

  const secs = groups.map((g) => {
    const items = g.cols.map((c) => ({ c, info: cell.info(row, c) }))
      .filter(({ info }) => showEmpty || info.editable || info.widget || !info.empty)
    return { ...g, items }
  }).filter((g) => g.items.length)
  const hiddenEmpty = groups.reduce((n, g) => n + g.cols.filter((c) => { const i = cell.info(row, c); return i.empty && !i.editable && !i.widget }).length, 0)

  return ReactDOM.createPortal(
    <div className={'msh-detail' + (closing ? ' out' : '')} dir={isAr ? 'rtl' : 'ltr'} role="dialog" aria-modal="true">
      <div className="msh-dnav">
        <button className="msh-back" onClick={close}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d={isAr ? 'm9 6 6 6-6 6' : 'm15 6-6 6 6 6'} /></svg>
          {T('رجوع', 'Back')}
        </button>
        <span className="msh-dnav-title">{api.title}</span>
        <span className={'msh-save ' + (st || '')}>{st === 'saving' ? T('يُحفظ…', 'Saving…') : st === 'error' ? T('تعذّر الحفظ', 'Save failed') : st === 'saved' ? T('محفوظ', 'Saved') : ''}</span>
      </div>
      <div className="msh-dbody" ref={bodyRef}>
        <section className="msh-hero">
          {card.leading && <span className="msh-hero-lead">{card.leading}</span>}
          <h2>{card.title}</h2>
          {card.subtitle && <p>{card.subtitle}</p>}
          <div className="msh-hero-tags">
            {card.badge && <MBadge {...card.badge} />}
            {row._manual && <MBadge text={T('صف يدوي', 'Manual row')} tone="blue" />}
            {row._hidden && <MBadge text={T('مخفي', 'Hidden')} tone="gray" />}
            {api.locked(row) && <MBadge text={T('مقفول', 'Locked')} tone="gray" />}
          </div>
          {card.amount && (
            <div className="msh-hero-amt" style={{ color: mTone(card.amount.tone || 'gold') }}>
              {card.amount.value}<small>{card.amount.unit}</small>
              {card.amount.note && <em>{card.amount.note}</em>}
            </div>
          )}
          {stages.length > 0 && (
            <div className="msh-track">
              {stages.map((g, i) => (
                <div key={g.st} className={'msh-track-step ' + g.state}>
                  <span className="dot">{g.state === 'done' ? '✓' : g.state === 'issue' ? '!' : g.state === 'na' ? '–' : i + 1}</span>
                  <span className="lbl">{g.label}</span>
                  <span className="val">{g.state === 'na' ? T('لا ينطبق', 'N/A') : (g.value || T('لم تبدأ', 'Not started'))}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {secs.map((g) => (
          <section key={g.key} className="msh-group">
            {g.title && <h3>{g.title}</h3>}
            <div className="msh-list">
              {g.items.map(({ c, info }) => (
                <FieldRow key={c.key} c={c} info={info} row={row} cell={cell} T={T} isAr={isAr}
                  onEdit={() => setEdit({ col: c })} />
              ))}
            </div>
          </section>
        ))}

        {hiddenEmpty > 0 && (
          <button className="msh-toggle" onClick={() => setShowEmpty((v) => !v)}>
            {showEmpty ? T('إخفاء الحقول الفارغة', 'Hide empty fields') : T(`إظهار ${hiddenEmpty} حقلاً فارغاً`, `Show ${hiddenEmpty} empty fields`)}
          </button>
        )}

        {actions(row).length > 0 && (
          <section className="msh-group">
            <h3>{T('إجراءات', 'Actions')}</h3>
            <div className="msh-list">
              {actions(row).map((a) => (
                <button key={a.key} className={'msh-act' + (a.danger ? ' danger' : '')} disabled={a.disabled} onClick={a.onClick}>
                  <span className="ico" aria-hidden>{a.icon}</span>{a.label}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
      {edit && (
        <EditSheet col={edit.col} row={row} cell={cell} T={T} isAr={isAr} onClose={() => setEdit(null)} />
      )}
    </div>,
    document.body,
  )
}

/* سطر «التسمية ← القيمة». القيمة المرسومة (مرفق · زرّ جلب · دفعة…) تبقى
   مكوّنَ المحرّك نفسه؛ والنصّ القابل للتعديل يفتح ورقة التعديل؛ والرقم
   المقروء يُنسخ بلمسة. */
function FieldRow({ c, info, row, cell, T, isAr, onEdit }) {
  const lbl = isAr ? c.ar : (c.en || c.ar)
  const long = info.text.length > 26 || info.text.includes('\n')
  const tap = () => {
    if (info.drill) { cell.tapCard(row, c); return }
    if (info.editable && !info.widget) { onEdit(); return }
    if (info.lockWhy && !info.widget) { cell.toast(info.lockWhy, 'error'); return }
    if (info.tapCard) { cell.tapCard(row, c); return }
    if (info.longtext) { cell.longText(row, c); return }
    if (info.mono && info.text) { cell.copy(info.text) }
  }
  const tappable = info.drill || (!info.widget && (info.editable || info.tapCard || info.longtext || (info.mono && info.text) || info.lockWhy))
  return (
    <div className={'msh-row' + (long && !info.widget ? ' stack' : '') + (tappable ? ' tap' : '') + (info.dirty ? ' dirty' : '')}
      onClick={tappable ? tap : undefined} role={tappable ? 'button' : undefined}>
      <span className="msh-lbl">{lbl}</span>
      <span className="msh-val">
        {info.widget ? <span className="msh-widget">{info.widget}</span>
          : info.na ? <span className="msh-na">{T('لا ينطبق', 'N/A')}</span>
          : info.empty ? <span className="msh-empty-v">{info.editable ? T('أضف', 'Add') : '—'}</span>
          : info.badge ? <MBadge text={info.text} tone={info.badge} />
          : <span className={'msh-text' + (info.mono ? ' mono' : '')} dir={info.mono ? 'ltr' : undefined} style={info.fg ? { color: info.fg } : undefined}>{info.text}</span>}
      </span>
      {info.drill ? <span className="msh-chev" aria-hidden><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d={isAr ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} /></svg></span> : !info.widget && (info.editable
        ? <span className="msh-chev" aria-hidden><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg></span>
        : info.lockWhy ? <span className="msh-chev lock" aria-hidden><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg></span>
        : info.tapCard ? <span className="msh-chev" aria-hidden><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d={isAr ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} /></svg></span>
        : null)}
    </div>
  )
}

/* ورقة التعديل من أسفل: قائمة خيارات للحالة، وحقلٌ واحد لما سواها.
   الحفظ = `writeCells` في المحرّك (فيسري الحفظ التلقائي والختم والترحيل كما هي). */
function EditSheet({ col, row, cell, T, isAr, onClose }) {
  const info = cell.info(row, col)
  const opts = cell.options(row, col)
  const [val, setVal] = useState(info.raw)
  const inRef = useRef(null)
  useEffect(() => { if (!opts && inRef.current) setTimeout(() => inRef.current && inRef.current.focus(), 250) }, [opts])
  const lbl = isAr ? col.ar : (col.en || col.ar)
  const save = (v) => { cell.write(row, col, v); onClose() }
  const type = info.family === 'date' ? 'date' : 'text'
  const isLong = col.kind === 'longtext' || LONG_KEYS.test(col.key)
  return (
    <div className="msh-sheet-bg" onClick={onClose}>
      <div className="msh-sheet" onClick={(e) => e.stopPropagation()}>
        <span className="msh-grab" aria-hidden />
        <div className="msh-sheet-head">
          <button className="msh-link" onClick={onClose}>{T('إلغاء', 'Cancel')}</button>
          <b>{lbl}</b>
          {opts ? <span style={{ width: 48 }} /> : <button className="msh-link strong" onClick={() => save(val)}>{T('حفظ', 'Save')}</button>}
        </div>
        {opts ? (
          <div className="msh-opts">
            {['', ...opts].map((o) => {
              const on = s(o) === s(info.raw)
              const tone = o ? cell.optTone(row, col, o) : null
              return (
                <button key={o || '__none'} className={'msh-opt' + (on ? ' on' : '')} onClick={() => save(o)}>
                  <span className="dot" style={{ background: tone ? mTone(tone) : 'transparent', borderColor: tone ? mTone(tone) : 'var(--tx4)' }} />
                  <span className="t">{o ? cell.optLabel(row, col, o) : T('— بلا قيمة', '— None')}</span>
                  {on && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" /></svg>}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="msh-edit">
            {isLong
              ? <textarea ref={inRef} value={val} rows={5} onChange={(e) => setVal(e.target.value)} />
              : <input ref={inRef} type={type} value={type === 'date' ? s(val).slice(0, 10) : val}
                  inputMode={info.family === 'number' ? 'decimal' : info.mono ? 'numeric' : undefined}
                  dir={info.mono || info.family !== 'text' ? 'ltr' : undefined}
                  enterKeyHint="done"
                  onKeyDown={(e) => { if (e.key === 'Enter') save(val) }}
                  onChange={(e) => setVal(e.target.value)} />}
            {s(info.raw) && <button className="msh-clear" onClick={() => save('')}>{T('مسح القيمة', 'Clear value')}</button>}
          </div>
        )}
        <button className="msh-hist" onClick={() => { onClose(); cell.history(row, col) }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></svg>
          {T('سجلّ تغييرات هذه الخانة', 'Change history of this field')}
        </button>
      </div>
    </div>
  )
}

export { StageDots, fmtMoney }
