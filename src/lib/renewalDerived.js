// ───────────────────────────────────────────────────────────────────────────
// لقطة مجمّدة لقيم حسبة تجديد الإقامة (iqama_renewal_calculation)
// ───────────────────────────────────────────────────────────────────────────
// كل قيمة مشتقّة معروضة في تفاصيل/طباعة التجديد تُحسب مرة واحدة وقت الإصدار/التصديق/التعديل
// وتُخزَّن في عمود ثابت، فلا تتغيّر القيم التاريخية إذا تغيّرت الحاسبة أو الإعدادات لاحقًا.
// هذه الدالة هي المصدر الوحيد للحساب — تُستدعى من RenewalCalculator (الإنشاء) و
// RenewalCalcPage (التصديق + تعديل الكروت). نفس صيغ العرض في صفحة التفاصيل بالضبط.
//
// الأعمدة المجمّدة:
//   billed_renewal_months   عدد أشهر تجديد الإقامة المحتسبة (يشمل الشهور المتأخرة عند انتهاء الإقامة)
//   office_cover            «الخصم» = ما يغطّيه المكتب من الرسوم الحكومية
//   office_fee_net          رسوم المكتب الصافية بعد التغطية وخصم المكتب
//   government_fees         إجمالي الرسوم الحكومية الكاملة (للعرض في الملخّص المالي)
//   expected_duration_months  المدة المتوقعة (= مدة التجديد)
//   expected_expiry_date    تاريخ انتهاء الإقامة المتوقع بعد التجديد

const num = v => Number(v || 0)

export function computeRenewalDerived(row = {}) {
  const iqamaFee = num(row.iqama_renewal_fee)
  const wpFee = num(row.work_permit_fee)
  const medFee = num(row.medical_fee)
  const fine = num(row.late_fine_amount)
  const profChange = num(row.prof_change_fee)
  const officeFee = num(row.office_fee)
  const govExcess = num(row.gov_excess)
  const manual = num(row.manual_discount)
  const renMo = Number(row.renewal_months || 0)

  // الخصم = (تجديد الإقامة + رخصة العمل + التأمين) − الزائد عن الحدود الحكومية
  const office_cover = Math.max(0, iqamaFee + wpFee + medFee - govExcess)
  const office_fee_net = Math.max(0, officeFee - office_cover - manual)
  const government_fees = iqamaFee + wpFee + medFee + fine + profChange

  // المرجع الزمني = تاريخ التسعير إن وُجد، وإلا الآن (يثبّت الحساب «كما في يوم التسعير»)
  const refDate = row.priced_at ? new Date(row.priced_at) : new Date()

  // أشهر تجديد الإقامة المحتسبة — المدى من انتهاء الإقامة حتى (المرجع + أشهر التجديد) عند انتهاء الإقامة
  let billed_renewal_months = renMo
  const exp = row.iqama_expiry_gregorian ? new Date(row.iqama_expiry_gregorian) : null
  if (exp && !isNaN(exp)) {
    const ref = new Date(refDate); ref.setHours(0, 0, 0, 0); exp.setHours(0, 0, 0, 0)
    if (exp < ref) {
      const end = new Date(ref); end.setMonth(end.getMonth() + renMo)
      let m = (end.getFullYear() - exp.getFullYear()) * 12 + (end.getMonth() - exp.getMonth())
      let d = end.getDate() - exp.getDate()
      if (d < 0) { m -= 1; d += new Date(end.getFullYear(), end.getMonth(), 0).getDate() }
      billed_renewal_months = d > 0 ? m + 1 : m
    }
  }

  // تاريخ الانتهاء المتوقع = (انتهاء الإقامة إن كان مستقبلاً، وإلا المرجع) + أشهر التجديد
  let expected_expiry_date = null
  if (renMo > 0) {
    const iqExp = row.iqama_expiry_gregorian ? new Date(row.iqama_expiry_gregorian) : null
    const base = (iqExp && !isNaN(iqExp) && iqExp > refDate) ? new Date(iqExp) : new Date(refDate)
    if (!isNaN(base)) { base.setMonth(base.getMonth() + renMo); expected_expiry_date = base.toISOString().slice(0, 10) }
  }

  return {
    billed_renewal_months,
    office_cover,
    office_fee_net,
    government_fees,
    expected_duration_months: renMo,
    expected_expiry_date,
  }
}
