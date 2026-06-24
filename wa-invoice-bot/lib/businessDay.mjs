// Business "day" = 05:00 Riyadh boundary (= 02:00 UTC). Mirrors riyadhDayStart() in the
// app and public.wa_business_day() in the DB EXACTLY, so the bot, dashboard and triggers
// all agree on which day an event belongs to.

// 'YYYY-MM-DD' label of the business day a timestamp falls in.
export function businessDayOf(d = new Date()) {
  return new Date(d.getTime() - 2 * 3600 * 1000).toISOString().slice(0, 10)
}

// Riyadh wall-clock parts (UTC+3).
export function riyadh(d = new Date()) {
  const ry = new Date(d.getTime() + 3 * 3600 * 1000)
  return { h: ry.getUTCHours(), m: ry.getUTCMinutes(), iso: ry.toISOString() }
}

const AR_WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

// 'YYYY-MM-DD' → 'الأحد 2026/06/21'
export function arabicDate(ymd) {
  const [Y, M, D] = String(ymd).split('-').map(Number)
  const wd = AR_WEEKDAYS[new Date(Date.UTC(Y, M - 1, D)).getUTCDay()]
  return `${wd} ${Y}/${String(M).padStart(2, '0')}/${String(D).padStart(2, '0')}`
}

// Weekday name only, e.g. 'الأحد'
export function arabicWeekday(ymd) {
  const [Y, M, D] = String(ymd).split('-').map(Number)
  return AR_WEEKDAYS[new Date(Date.UTC(Y, M - 1, D)).getUTCDay()]
}

// Numeric date only, e.g. '2026/06/21'
export function arabicDateNum(ymd) {
  const [Y, M, D] = String(ymd).split('-').map(Number)
  return `${Y}/${String(M).padStart(2, '0')}/${String(D).padStart(2, '0')}`
}
