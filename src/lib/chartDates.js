// صيغ التاريخ الموحّدة لمحاور الشارتات الزمنية وتلميحاتها (أرقام غربية دائماً)
const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const mName = (mm, isAr) => (isAr ? AR_MONTHS : EN_MONTHS)[Number(mm) - 1] || mm

// 'YYYY-MM' → «سبتمبر 26» / «Sep 26»
export const fmtChartMonth = (ym, isAr) => {
  const s = String(ym || '')
  if (!/^\d{4}-\d{2}/.test(s)) return s
  return `${mName(s.slice(5, 7), isAr)} ${s.slice(2, 4)}`
}

// 'YYYY-MM-DD' → «30 سبتمبر» / «30 Sep»
export const fmtChartDay = (iso, isAr) => {
  const s = String(iso || '')
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return s
  return `${Number(s.slice(8, 10))} ${mName(s.slice(5, 7), isAr)}`
}
