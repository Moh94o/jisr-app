// حاسبة تاريخ انتهاء التجديد (نقل الكفالة + تجديد الإقامة)
// ─────────────────────────────────────────────────────────────
// القاعدة مُستنبَطة من مطابقة منصة قوى على عدة أمثلة (يوليو 2026):
//   التاريخ الجديد = تاريخ انتهاء الإقامة/كرت العمل + عدد أيام ثابت حسب المدة.
//   3 أشهر=90 · 6 أشهر=178 · 9 أشهر=267 · 12 شهر=355 يوم.
// تنطبق على الإقامات السارية أو التي تُجدَّد اليوم (تُستثنى فترة التأخير
// «overdue» للإقامات المنتهية من مدة — تُحسب بقاعدة منفصلة).
// الأرقام قابلة للتعديل من الإدارة > الخدمات، فإذا حدّثت قوى قاعدتها تُعدَّل هنا.

export const EXPIRY_DAYS_DEFAULT = { 3: 90, 6: 178, 9: 267, 12: 355 }
export const EXPIRY_DURATIONS = [3, 6, 9, 12]

// يقرأ خريطة الأيام من إعدادات التسعير (expiryDays3/6/9/12) مع السقوط للافتراضي.
export function getExpiryDaysMap(cfg) {
  const g = (m) => {
    const n = Number(cfg?.['expiryDays' + m])
    return Number.isFinite(n) && n > 0 ? n : EXPIRY_DAYS_DEFAULT[m]
  }
  return { 3: g(3), 6: g(6), 9: g(9), 12: g(12) }
}

function parseYMD(s) {
  if (s instanceof Date) return isNaN(s) ? null : new Date(s.getTime())
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s).trim())
  if (m) { const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])); return isNaN(d) ? null : d }
  const d = new Date(s); return isNaN(d) ? null : d
}
const dayDiff = (a, b) => Math.round((b - a) / 86400000)

// ── تعويض التأخير (overdue) للإقامات المنتهية ──
// أم القرى عبر Intl — لحساب «M × 3 أشهر هجرية» بدقّة (أطوال الأشهر متغيّرة).
function toUmm(g) {
  const f = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', { year: 'numeric', month: 'numeric', day: 'numeric' })
  const o = {}
  for (const p of f.formatToParts(g)) { if (p.type === 'year') o.y = +p.value; if (p.type === 'month') o.m = +p.value; if (p.type === 'day') o.d = +p.value }
  return o
}
// يضيف n شهراً هجرياً على تاريخ ميلادي (تثبيت اليوم + جبر لآخر الشهر) ويُرجع Date.
function addHijriMonths(greg, n) {
  if (!n || n <= 0) return new Date(greg.getTime())
  const u = toUmm(greg)
  let m = u.m - 1 + n
  const y = u.y + Math.floor(m / 12)
  m = ((m % 12) + 12) % 12 + 1
  const guess = new Date(greg.getTime() + n * 29.53 * 86400000)
  for (let dd = u.d; dd >= 1; dd--) {
    for (let i = -62; i <= 62; i++) {
      const c = new Date(guess.getTime() + i * 86400000)
      const uu = toUmm(c)
      if (uu.y === y && uu.m === m && uu.d === dd) return c
    }
  }
  return guess
}

// عدد أرباع التأخير (كل ربع = 3 أشهر). asOf = تاريخ التجديد (عادةً اليوم).
export function overdueQuarters(expiry, asOf, cfg) {
  const base = parseYMD(expiry), now = parseYMD(asOf)
  if (!base || !now || cfg?.overdueEnabled === false) return 0
  const q = Number(cfg?.overdueQuarterDays) > 0 ? Number(cfg.overdueQuarterDays) : 90
  const overdue = dayDiff(base, now)
  return overdue > 0 ? Math.floor(overdue / q) : 0
}

// يحسب التاريخ الجديد: (تاريخ الانتهاء + تعويض التأخير) + عدد أيام المدة.
// opts.asOf = تاريخ التجديد (اليوم) — لازم لاحتساب التأخير؛ بدونه = إقامة سارية (تعويض صفر).
// يُرجع Date أو null.
export function computeRenewalExpiry(expiry, months, cfg, opts = {}) {
  const base = parseYMD(expiry)
  if (!base) return null
  const days = getExpiryDaysMap(cfg)[months]
  if (!days) return null
  const M = opts.asOf ? overdueQuarters(expiry, opts.asOf, cfg) : 0
  const start = M > 0 ? addHijriMonths(base, M * 3) : base
  const out = new Date(start.getTime())
  out.setDate(out.getDate() + days)
  return out
}

// نسخة تُرجع 'yyyy-mm-dd' (مناسبة للتخزين).
export function computeRenewalExpiryYMD(expiry, months, cfg, opts = {}) {
  const d = computeRenewalExpiry(expiry, months, cfg, opts)
  if (!d) return null
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
