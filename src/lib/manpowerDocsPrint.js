/* ═══════════════════════════════════════════════════════════════════════════
   وثائق توريد العمالة — عقد · كشف دوام · مستخلص · فاتورة ضريبية · كشف رواتب.

   كلّها بهوية MCC نفسها (ترويسة وتذييل وختم من public/mcc/) وبنفس نمط ملفّ
   عرض السعر: وثيقة بلغةٍ واحدة تُختار وقت الطباعة، وذهبٌ على عاجيّ.

   بُنيت الجداول على مستندات المكتب الحقيقية (فواتير CHCC وGulf Asia وكشوف
   MACC): جدولان للساعات العادية والإضافية بسعرين مستقلّين، وخصم الغياب
   بمعدلٍ يومي ثابت قبل الضريبة، وتسويةٌ مرحّلة بملاحظة، والمبلغ كتابةً،
   وجدول الحساب البنكي، وخانتا «أعدّه» و«اعتمده العميل».
   ═══════════════════════════════════════════════════════════════════════════ */

const n = v => { const x = parseFloat(String(v ?? '').replace(/,/g, '')); return isNaN(x) ? 0 : x }
const nm = v => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })
const nm2 = v => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const nm0 = v => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const hasArabic = v => /[؀-ۿ]/.test(String(v ?? ''))
const fmtD = d => { if (!d) return '—'; const x = new Date(d); if (isNaN(x)) return '—'; return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0') }

/* بيانات البائع على الفاتورة الضريبية — تُعدَّل هنا وحدها إن تغيّرت */
export const MCC_SELLER = {
  name_ar: 'شركة مهدي للمقاولات (MCC)', name_en: 'Mahdi Contracting Co. (MCC)',
  cr: '7042715412', vat_no: '',
  address_ar: 'المنطقة الشرقية، المملكة العربية السعودية', address_en: 'Eastern Province, Kingdom of Saudi Arabia',
  phone: '0554740314',
}

/* ── المبلغ كتابةً ──────────────────────────────────────────────────────── */
const EN_ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const EN_TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
const wordsEn = (x) => {
  x = Math.floor(Math.abs(x))
  if (x === 0) return 'Zero'
  const chunk = (v) => {
    let s = ''
    if (v >= 100) { s += EN_ONES[Math.floor(v / 100)] + ' Hundred'; v %= 100; if (v) s += ' ' }
    if (v >= 20) { s += EN_TENS[Math.floor(v / 10)]; v %= 10; if (v) s += '-' + EN_ONES[v] }
    else if (v > 0) s += EN_ONES[v]
    return s
  }
  const parts = []
  const scales = [[1e9, 'Billion'], [1e6, 'Million'], [1e3, 'Thousand'], [1, '']]
  for (const [f, name] of scales) {
    if (x >= f) { const q = Math.floor(x / f); x %= f; parts.push(chunk(q) + (name ? ' ' + name : '')) }
  }
  return parts.join(' ')
}
const AR_ONES = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر']
const AR_TENS = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون']
const AR_HUNDREDS = ['', 'مئة', 'مئتان', 'ثلاثمئة', 'أربعمئة', 'خمسمئة', 'ستمئة', 'سبعمئة', 'ثمانمئة', 'تسعمئة']
const wordsAr = (x) => {
  x = Math.floor(Math.abs(x))
  if (x === 0) return 'صفر'
  const chunk = (v) => {
    const p = []
    if (v >= 100) { p.push(AR_HUNDREDS[Math.floor(v / 100)]); v %= 100 }
    if (v >= 20) { const u = v % 10; if (u) p.push(AR_ONES[u]); p.push(AR_TENS[Math.floor(v / 10)]); }
    else if (v > 0) p.push(AR_ONES[v])
    // «خمسة وعشرون»: الآحاد قبل العشرات بواو
    return p.length === 3 ? p[0] + ' و' + p[1] + ' و' + p[2] : p.join(' و')
  }
  const parts = []
  /* تمييز المعدود يتبع آخر جزأين من العدد: 0 و1-2 → مفرد (مئة ألف)، 3-10 → جمع
     (ثلاثة آلاف)، 11-99 → منصوب (خمسة وعشرون ألفاً) */
  const scale = (q, one, two, few, many) => {
    if (q === 1) return one
    if (q === 2) return two
    const rem = q % 100
    const tail = rem === 0 || rem <= 2 ? one : rem <= 10 ? few : many
    return chunk(q) + ' ' + tail
  }
  if (x >= 1e9) { const q = Math.floor(x / 1e9); x %= 1e9; parts.push(scale(q, 'مليار', 'ملياران', 'مليارات', 'ملياراً')) }
  if (x >= 1e6) { const q = Math.floor(x / 1e6); x %= 1e6; parts.push(scale(q, 'مليون', 'مليونان', 'ملايين', 'مليوناً')) }
  if (x >= 1e3) { const q = Math.floor(x / 1e3); x %= 1e3; parts.push(scale(q, 'ألف', 'ألفان', 'آلاف', 'ألفاً')) }
  if (x > 0) parts.push(chunk(x))
  return parts.join(' و')
}
export const amountInWords = (amount, isAr) => {
  const riyals = Math.floor(Math.abs(n(amount)))
  const halalas = Math.round((Math.abs(n(amount)) - riyals) * 100)
  if (isAr) return wordsAr(riyals) + ' ريال سعودي' + (halalas ? ' و' + wordsAr(halalas) + ' هللة' : '') + ' فقط لا غير'
  return wordsEn(riyals) + ' Saudi Riyals' + (halalas ? ' and ' + wordsEn(halalas) + ' Halalas' : '') + ' Only'
}

/* ── هوية الوثيقة — نفس CSS عرض السعر مع إضافات الجداول المالية ─────────── */
const CSS = (isAr, landscape) => `
  @page { size: A4${landscape ? ' landscape' : ''}; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font-family: ${isAr ? `'Cairo','Tajawal','Segoe UI',Arial,sans-serif` : `'Segoe UI',Arial,Helvetica,sans-serif`};
    color: #1c1c1c; font-size: ${landscape ? '8.6pt' : '10pt'}; line-height: 1.6;
  }
  .page {
    width: ${landscape ? '297mm' : '210mm'}; min-height: ${landscape ? '210mm' : '297mm'}; margin: 0 auto; position: relative;
    display: flex; flex-direction: column; background: #fff; overflow: hidden;
  }
  .hdr img, .ftr img { width: 100%; display: block; }
  .ftr { margin-top: auto; }
  .body { padding: ${landscape ? '5mm 10mm 4mm' : '7mm 16mm 6mm'}; flex: 1; position: relative; z-index: 1; }
  .wm {
    position: absolute; top: 45%; ${isAr ? 'right' : 'left'}: 50%;
    transform: translate(${isAr ? '50%' : '-50%'}, -50%) rotate(-24deg);
    font-size: 78pt; font-weight: 800; letter-spacing: 6px;
    color: #C9962E; opacity: .045; white-space: nowrap; z-index: 0; pointer-events: none;
  }
  .title {
    font-weight: 600; font-size: ${landscape ? '11pt' : '12pt'}; color: #8a6a1f; text-align: center;
    padding: 2.4mm 4mm; margin: 0 0 4mm; background: #fdf9f0;
    border-block: 1pt solid #C9962E; letter-spacing: .4px;
  }
  .meta { display: flex; gap: 0; border: .5pt solid #e3d6b8; border-radius: 2mm; overflow: hidden; margin-bottom: 4mm; }
  .meta div { flex: 1; padding: 2mm 2.4mm; text-align: center; border-inline-end: .5pt solid #efe6d2; }
  .meta div:last-child { border-inline-end: none; }
  .meta .k { font-size: 7.2pt; color: #8a7a58; letter-spacing: .4px; margin-bottom: .5mm; }
  .meta .v { font-size: 9pt; font-weight: 600; color: #2a2317; font-variant-numeric: tabular-nums; }
  .two { display: flex; gap: 5mm; margin-bottom: 4mm; }
  .box { flex: 1; border: .5pt solid #e3d6b8; border-radius: 2mm; padding: 2.6mm 3.2mm; }
  .box .lbl { font-size: 7.6pt; color: #8a7a58; letter-spacing: .5px; margin-bottom: 1mm; }
  .box .nm { font-size: 10.6pt; font-weight: 600; }
  .box .ln { font-size: 8.8pt; color: #4a4a4a; margin-top: .4mm; }
  h3.sec {
    font-size: 10pt; font-weight: 600; letter-spacing: .6px; color: #8a6a1f;
    margin: 4mm 0 2mm; padding-bottom: 1.2mm; border-bottom: 1.2pt solid #C9962E;
    display: flex; align-items: center; gap: 2.6mm;
  }
  h3.sec span.no {
    width: 5.6mm; height: 5.6mm; border-radius: 50%; background: #C9962E; color: #fff;
    font-size: 8pt; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  table.rates { width: 100%; border-collapse: collapse; margin: 1.6mm 0; font-size: ${landscape ? '7.6pt' : '9.2pt'}; }
  table.rates th {
    background: #C9962E; color: #fff; font-weight: 600; padding: ${landscape ? '1.4mm 1mm' : '2.2mm 1.8mm'};
    border: .4pt solid #b3841f; letter-spacing: .2px;
  }
  table.rates td { border: .4pt solid #ddd; padding: ${landscape ? '1.2mm 1mm' : '2mm 1.8mm'}; }
  table.rates tbody tr:nth-child(even) td { background: #fcfaf5; }
  table.rates td.c { text-align: center; }
  table.rates tr.tot td { background: #fdf5e4; font-weight: 600; border-top: 1pt solid #C9962E; }
  table.rates td.abs { color: #b3261e; font-weight: 700; }
  table.rates td.off { color: #999; }
  .num { font-variant-numeric: tabular-nums; }
  table.sum { width: 100%; border-collapse: collapse; margin: 2mm 0; font-size: 9.4pt; }
  table.sum td { padding: 1.8mm 3mm; border: .4pt solid #e3d6b8; }
  table.sum td.k { background: #fdf9f0; font-weight: 600; color: #6a5a30; width: 55%; }
  table.sum td.v { text-align: ${isAr ? 'left' : 'right'}; font-weight: 600; font-variant-numeric: tabular-nums; }
  table.sum tr.grand td { background: #fdf5e4; border-top: 1pt solid #C9962E; font-size: 10.6pt; color: #8a6a1f; font-weight: 700; }
  .words {
    margin: 2mm 0 3mm; padding: 2.4mm 4mm; border: .6pt dashed #C9962E; border-radius: 2mm;
    background: #fffdf8; font-size: 9pt; font-weight: 600; color: #5a4a20;
  }
  table.bank { width: 100%; border-collapse: collapse; margin: 2mm 0; font-size: 8.8pt; }
  table.bank td { padding: 1.6mm 3mm; border: .4pt solid #e3d6b8; }
  table.bank td.k { background: #fdf9f0; font-weight: 600; color: #6a5a30; width: 32%; }
  table.bank td.v { font-variant-numeric: tabular-nums; direction: ltr; text-align: ${isAr ? 'right' : 'left'}; }
  ol.terms { margin: 0 0 3mm; padding-inline-start: 6mm; }
  ol.terms li { margin-bottom: 1.8mm; text-align: justify; padding-inline-start: 1mm; }
  ol.terms li::marker { color: #C9962E; font-weight: 700; }
  p { margin-bottom: 2.4mm; text-align: justify; }
  .sig { margin-top: 6mm; display: flex; gap: 8mm; }
  .sig > div { flex: 1; position: relative; }
  .sig .stamp { position: absolute; top: -8mm; ${isAr ? 'right' : 'left'}: 20mm; width: 30mm; opacity: .88; transform: rotate(-8deg); }
  .sig .rule { border-top: .8pt solid #999; margin: 12mm 0 1.4mm; }
  .sig .t { font-size: 8.6pt; color: #8a6a1f; font-weight: 600; }
  .sig .s { font-size: 8pt; color: #777; }
  .sigrow { margin-top: 5mm; display: flex; gap: 4mm; }
  .sigrow > div { flex: 1; border: .5pt solid #e3d6b8; border-radius: 2mm; padding: 2mm 3mm 8mm; }
  .sigrow .t { font-size: 7.8pt; color: #8a7a58; font-weight: 600; }
  .note { font-size: 8.2pt; color: #666; margin-top: 1.4mm; }
  .flag { color: #b3261e; font-weight: 600; }
  .pageno {
    position: absolute; bottom: 3mm; ${isAr ? 'left' : 'right'}: 14mm;
    font-size: 8pt; color: #a99a78; font-variant-numeric: tabular-nums; z-index: 2;
  }
  @media print { .page { page-break-after: always } .page:last-child { page-break-after: auto } }
`

const pageWrap = (inner, no, total, origin) => `<div class="page">
  <div class="hdr"><img src="${origin}/mcc/header.png" alt=""></div>
  <div class="wm">MCC</div>
  <div class="body">${inner}</div>
  ${total > 1 ? `<div class="pageno">${no} / ${total}</div>` : ''}
  <div class="ftr"><img src="${origin}/mcc/footer.png" alt=""></div>
</div>`

const docShell = (isAr, landscape, pages, title) => `<!doctype html><html lang="${isAr ? 'ar' : 'en'}" dir="${isAr ? 'rtl' : 'ltr'}"><head>
<meta charset="utf-8"><title>${esc(title)}</title>
${isAr ? '<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">' : ''}
<style>${CSS(isAr, landscape)}</style></head><body>${pages}</body></html>`

/* ── إطار الطباعة المخفي — نفس آلية عرض السعر: انتظار الصور ثم الطباعة ── */
function printDoc(htmlStr) {
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:-9999px;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow.document
  doc.open(); doc.write(htmlStr); doc.close()
  const cleanup = () => { try { document.body.removeChild(iframe) } catch { /* أُزيل */ } }
  const firePrint = () => {
    try {
      iframe.contentWindow.focus()
      iframe.contentWindow.onafterprint = () => setTimeout(cleanup, 100)
      iframe.contentWindow.print()
    } catch { cleanup() }
  }
  const imgs = Array.from(doc.images || [])
  let left = imgs.filter(im => !im.complete).length
  let fired = false
  const go = () => { if (fired) return; fired = true; setTimeout(firePrint, 250) }
  if (!left) go()
  else {
    imgs.forEach(im => { if (!im.complete) { im.onload = im.onerror = () => { if (--left <= 0) go() } } })
    setTimeout(go, 3000)
  }
  setTimeout(cleanup, 60000)
}

/* الحساب البنكي — جدول موحّد يظهر في المستخلص والفاتورة */
const bankTable = (bank, isAr) => {
  if (!bank) return ''
  const rows = [
    [isAr ? 'اسم الحساب' : 'A/C NAME', isAr ? (bank.account_name || bank.account_name_en) : (bank.account_name_en || bank.account_name)],
    [isAr ? 'البنك' : 'BANK NAME', isAr ? (bank.bank_name || bank.bank_name_en) : (bank.bank_name_en || bank.bank_name)],
    [isAr ? 'رقم الحساب' : 'ACCOUNT NUMBER', bank.account_number],
    ['IBAN', bank.iban],
  ].filter(([, v]) => v)
  if (!rows.length) return ''
  return `<h3 class="sec">${isAr ? 'بيانات الحساب البنكي' : 'BANK DETAILS'}</h3>
  <table class="bank">${rows.map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td class="v">${esc(v)}</td></tr>`).join('')}</table>`
}

const pick = (isAr, ar, en) => isAr ? (ar || en || '') : (en || (hasArabic(ar) ? '' : ar) || '')

/* ════════════════════ 1) عقد توريد العمالة ════════════════════ */
export function printManpowerContract(c, { quote, lang = 'ar' } = {}) {
  const isAr = lang === 'ar'
  const T = (ar, en) => isAr ? ar : en
  const hpd = n(c.hours_per_day) || 10, dpm = n(c.days_per_month) || 26
  const dueDays = n(c.payment_due_days) || 45
  const dedRate = n(c.absence_deduction_rate)
  const client = pick(isAr, c.client_name, c.client_name_en) || c.client_name || ''

  const lineRows = (c.lines || []).map((l, i) => `<tr>
    <td class="c">${i + 1}</td>
    <td>${esc(isAr ? (l.item || l.item_en) : (l.item_en || l.item))}</td>
    <td class="c num">${nm0(l.qty) || '—'}</td>
    <td class="c num">${nm(l.unit_price)}</td>
    <td class="c num">${n(l.ot_rate) ? nm(l.ot_rate) : '—'}</td>
    <td class="c">${esc({ hour: T('بالساعة', 'Per Hour'), day: T('باليوم', 'Per Day'), month: T('بالشهر', 'Per Month'), meter: T('بالمتر', 'Per Meter'), lump: T('مقطوعية', 'Lump Sum') }[l.method] || '—')}</td>
  </tr>`).join('')

  const obligations = quote ? [
    [T('السكن', 'Accommodation'), quote.housing_by], [T('المواصلات اليومية', 'Daily transportation'), quote.transport_by],
    [T('الإعاشة', 'Food'), quote.food_by], [T('مهمّات السلامة', 'Safety equipment (PPE)'), quote.safety_by],
    [T('أدوات العمل', 'Work tools'), quote.tools_by],
  ] : null

  const clauses = [
    T(`نطاق العمل: يورّد الطرف الأول للطرف الثاني العمالة بالمهن والأعداد والأسعار المبيّنة في الجدول أعلاه، لتعمل تحت إشراف الطرف الثاني وإدارته في مواقعه.`,
      `Scope: The First Party shall supply the Second Party with manpower in the trades, quantities and rates listed in the schedule above, to work under the Second Party's supervision and management at its sites.`),
    T(`مدة العقد من ${fmtD(c.start_date)} إلى ${fmtD(c.end_date)}، ويتجدّد تلقائياً لمددٍ مماثلة ما لم يُخطِر أحدُ الطرفين الآخرَ كتابياً برغبته في عدم التجديد قبل ثلاثين (30) يوماً من نهاية المدة.`,
      `Term: from ${fmtD(c.start_date)} to ${fmtD(c.end_date)}, automatically renewed for similar periods unless either party notifies the other in writing of non-renewal thirty (30) days before expiry.`),
    T(`ساعات العمل ${nm(hpd)} ساعات يومياً و${nm(dpm)} يوم عمل شهرياً. وما زاد على ذلك يُحتسب وقتاً إضافياً بسعر الساعة الإضافية المبيّن في الجدول لكل مهنة.`,
      `Working hours are ${nm(hpd)} hours per day and ${nm(dpm)} working days per month. Hours in excess are billed as overtime at the per-trade overtime rate shown in the schedule.`),
    obligations ? (isAr
      ? 'الالتزامات: ' + obligations.map(([k, v]) => `${k} على ${v === 'mcc' ? 'الطرف الأول' : 'الطرف الثاني'}`).join('، ') + '.'
      : 'Obligations: ' + obligations.map(([k, v]) => `${k} shall be provided by ${v === 'mcc' ? 'the First Party' : 'the Second Party'}`).join('; ') + '.') : null,
    dedRate > 0 ? T(`الغياب: يُخصم مبلغ ${nm2(dedRate)} ريال عن كل يوم غيابٍ للعامل الواحد (مقابل السكن والإعاشة والمواصلات) من مستحقات الطرف الأول، إضافةً إلى عدم احتساب ساعات ذلك اليوم.`,
      `Absence: SAR ${nm2(dedRate)} shall be deducted from the First Party's dues for each absent man-day (covering accommodation, food and transportation), in addition to the unearned hours of that day.`) : null,
    T(`الفوترة والسداد: يقدّم الطرف الأول فاتورته شهرياً بموجب كشوف دوامٍ معتمدة من الطرف الثاني، ويلتزم الطرف الثاني بسدادها خلال ${nm0(dueDays)} يوماً من تاريخ تقديمها.${c.invoice_terms && isAr ? ' ' + esc(c.invoice_terms) : ''}${c.invoice_terms_en && !isAr ? ' ' + esc(c.invoice_terms_en) : ''}`,
      `Invoicing & payment: The First Party shall submit its invoice monthly against timesheets approved by the Second Party, and the Second Party shall settle it within ${nm0(dueDays)} days of submission.${!isAr && c.invoice_terms_en ? ' ' + esc(c.invoice_terms_en) : ''}`),
    T('الأنظمة: يلتزم الطرف الأول بتوريد عمالةٍ نظامية بإقاماتٍ سارية ورخص عمل وتأمينٍ طبي، وبأنظمة العمل السعودية ونظام أجير، ويتحمّل مسؤولية أوراق عماله أمام الجهات الرسمية.',
      'Compliance: The First Party shall supply fully documented workers holding valid Iqama, work permits and medical insurance, in compliance with Saudi labor regulations and the Ajeer system, and remains responsible for its workers before government authorities.'),
    T('الاستبدال: يستبدل الطرف الأول أي عاملٍ يراه الطرف الثاني غير لائقٍ أو ضعيف الأداء خلال 48 ساعة دون تكلفةٍ إضافية. ويُخطَر الطرف الأول قبل إنهاء توريد أي عاملٍ بعشرة (10) أيام على الأقل.',
      'Replacement: The First Party shall replace any worker deemed unfit or underperforming by the Second Party within 48 hours at no additional cost. At least ten (10) days’ notice shall be given before demobilizing any worker.'),
    T(`الضريبة: الأسعار غير شاملة ضريبة القيمة المضافة ${nm(n(c.vat_pct) || 15)}٪، وتُضاف على كل فاتورة وفق النظام.`,
      `VAT: Rates are exclusive of ${nm(n(c.vat_pct) || 15)}% VAT, added to each invoice as per law.`),
    T('القانون والاختصاص: يخضع هذا العقد لأنظمة المملكة العربية السعودية، وأي نزاعٍ لا يُحلّ ودياً يكون الفصل فيه للجهات القضائية المختصة بالمنطقة الشرقية.',
      'Law & jurisdiction: This contract is governed by the laws of the Kingdom of Saudi Arabia. Any dispute not settled amicably shall be referred to the competent judicial authorities in the Eastern Province.'),
  ].filter(Boolean)

  const p1 = `
    <div class="title">${T('عقد توريد عمالة', 'MANPOWER SUPPLY AGREEMENT')}</div>
    <div class="meta">
      <div><div class="k">${T('رقم العقد', 'CONTRACT NO.')}</div><div class="v">${esc(c.contract_no || '—')}</div></div>
      <div><div class="k">${T('تاريخ البداية', 'START')}</div><div class="v">${fmtD(c.start_date)}</div></div>
      <div><div class="k">${T('تاريخ النهاية', 'END')}</div><div class="v">${fmtD(c.end_date)}</div></div>
      ${c.po_number ? `<div><div class="k">${T('أمر الشراء', 'P.O. NO.')}</div><div class="v">${esc(c.po_number)}</div></div>` : ''}
    </div>
    <div class="two">
      <div class="box">
        <div class="lbl">${T('الطرف الأول — المورّد', 'FIRST PARTY — SUPPLIER')}</div>
        <div class="nm">${esc(T(MCC_SELLER.name_ar, MCC_SELLER.name_en))}</div>
        <div class="ln">${T('س.ت', 'C.R')}: ${MCC_SELLER.cr} · ${esc(T(MCC_SELLER.address_ar, MCC_SELLER.address_en))}</div>
      </div>
      <div class="box">
        <div class="lbl">${T('الطرف الثاني — العميل', 'SECOND PARTY — CLIENT')}</div>
        <div class="nm">${esc(client)}</div>
        ${c.client_cr_no ? `<div class="ln">${T('س.ت', 'C.R')}: ${esc(c.client_cr_no)}</div>` : ''}
        ${c.client_vat_no ? `<div class="ln">${T('الرقم الضريبي', 'VAT No.')}: ${esc(c.client_vat_no)}</div>` : ''}
        ${(c.client_address || c.client_location) ? `<div class="ln">${esc(c.client_address || c.client_location)}</div>` : ''}
        ${c.attn_name && (isAr || !hasArabic(c.attn_name)) ? `<div class="ln">${T('عناية', 'Attn')}: ${esc(c.attn_name)}</div>` : ''}
      </div>
    </div>
    ${(c.project_name || c.project_name_en) ? `<p><b>${T('المشروع', 'Project')}:</b> ${esc(pick(isAr, c.project_name, c.project_name_en))}</p>` : ''}
    <h3 class="sec"><span class="no">1</span>${T('جدول المهن والأسعار', 'TRADES & RATES SCHEDULE')}</h3>
    <table class="rates">
      <tr><th style="width:8mm">#</th><th>${T('المهنة / البند', 'Trade / Item')}</th><th style="width:16mm">${T('العدد', 'Qty')}</th>
      <th style="width:24mm">${T('السعر (ر.س)', 'Rate (SAR)')}</th><th style="width:26mm">${T('سعر الإضافي (ر.س)', 'OT Rate (SAR)')}</th><th style="width:22mm">${T('الأساس', 'Basis')}</th></tr>
      ${lineRows}
    </table>
  `
  const p2 = `
    <h3 class="sec"><span class="no">2</span>${T('الشروط والأحكام', 'TERMS & CONDITIONS')}</h3>
    <ol class="terms">${clauses.map(t => `<li>${t}</li>`).join('')}</ol>
    <div class="sig">
      <div>
        <img class="stamp" src="${location.origin}/mcc/stamp.png" alt="">
        <div class="rule"></div>
        <div class="t">${T('الطرف الأول — شركة مهدي للمقاولات (MCC)', 'First Party — Mahdi Contracting Co. (MCC)')}</div>
        <div class="s">${T('الاسم والتوقيع والختم', 'Name, signature & stamp')}</div>
      </div>
      <div>
        <div class="rule"></div>
        <div class="t">${T('الطرف الثاني — ', 'Second Party — ')}${esc(client)}</div>
        <div class="s">${T('الاسم والتوقيع والختم', 'Name, signature & stamp')}</div>
      </div>
    </div>
  `
  printDoc(docShell(isAr, false, pageWrap(p1, 1, 2, location.origin) + pageWrap(p2, 2, 2, location.origin), c.contract_no || 'Contract'))
}

/* ════════════════════ 2) كشف الدوام (بالعرض) ════════════════════ */
export function printManpowerTimesheet(ts, { contract, lang = 'ar', dayList, splitFn, absentFn } = {}) {
  const isAr = lang === 'ar'
  const T = (ar, en) => isAr ? ar : en
  const days = dayList || []
  const client = contract ? pick(isAr, contract.client_name, contract.client_name_en) : ''

  let totN = 0, totO = 0, totA = 0
  ;(ts.lines || []).forEach(l => {
    const s = splitFn(l.days, ts.hours_per_day)
    totN += s.normal; totO += s.ot; totA += absentFn(l.days)
  })

  /* الصفحة العرضية تسع ~31 عمود يوم — فترةٌ أطول تُقسم صفحات، والإجماليات
     على الصفحة الأخيرة وحدها كي لا تتكرّر مبتورة */
  const chunks = []
  for (let i = 0; i < days.length; i += 31) chunks.push(days.slice(i, i + 31))
  if (!chunks.length) chunks.push([])

  const meta = `
    <div class="meta">
      <div><div class="k">${T('رقم الكشف', 'SHEET NO.')}</div><div class="v">${esc(ts.sheet_no || '—')}</div></div>
      <div><div class="k">${T('العقد', 'CONTRACT')}</div><div class="v">${esc(contract?.contract_no || '—')}</div></div>
      <div><div class="k">${T('الفترة', 'PERIOD')}</div><div class="v">${fmtD(ts.period_from)} → ${fmtD(ts.period_to)}</div></div>
      <div><div class="k">${T('ساعات اليوم', 'HRS/DAY')}</div><div class="v">${nm(ts.hours_per_day)}</div></div>
      <div><div class="k">${T('عدد العمال', 'WORKERS')}</div><div class="v">${nm0((ts.lines || []).length)}</div></div>
    </div>`

  const pagesHtml = chunks.map((chunk, ci) => {
    const last = ci === chunks.length - 1
    const rows = (ts.lines || []).map((l, i) => {
      const s = splitFn(l.days, ts.hours_per_day)
      const a = absentFn(l.days)
      const cells = chunk.map(d => {
        const v = l.days?.[d]
        const u = String(v ?? '').trim().toUpperCase()
        if (u === 'A') return '<td class="c abs">A</td>'
        if (u === 'F' || u === 'H') return `<td class="c off">${u}</td>`
        const h = n(v)
        return `<td class="c num">${h || ''}</td>`
      }).join('')
      return `<tr>
        <td class="c">${i + 1}</td>
        <td>${esc(l.worker_name)}</td>
        <td class="c">${esc(isAr ? (l.trade || l.trade_en) : (l.trade_en || l.trade))}</td>
        ${cells}
        ${last ? `<td class="c num">${nm(s.normal)}</td><td class="c num">${nm(s.ot)}</td><td class="c num${a ? ' abs' : ''}">${a || ''}</td>` : ''}
      </tr>`
    }).join('')
    return `
      <div class="title">${T('كشف دوام — ', 'ATTENDANCE SHEET — ')}${esc(client)}${(contract?.project_name || contract?.project_name_en) ? ' · ' + esc(pick(isAr, contract.project_name, contract.project_name_en)) : ''}</div>
      ${meta}
      <table class="rates">
        <tr><th style="width:6mm">#</th><th style="min-width:34mm">${T('اسم العامل', 'Employee Name')}</th><th style="min-width:18mm">${T('المهنة', 'Trade')}</th>
        ${chunk.map(d => `<th style="width:5.4mm">${Number(d.slice(8))}</th>`).join('')}
        ${last ? `<th style="width:11mm">${T('عادي', 'Normal')}</th><th style="width:11mm">${T('إضافي', 'OT')}</th><th style="width:10mm">${T('غياب', 'Abs')}</th>` : ''}</tr>
        ${rows}
        ${last ? `<tr class="tot"><td colspan="3" style="text-align:${isAr ? 'left' : 'right'}">${T('الإجمالي', 'TOTAL')}</td>
        ${chunk.map(() => '<td></td>').join('')}
        <td class="c num">${nm(totN)}</td><td class="c num">${nm(totO)}</td><td class="c num">${nm0(totA)}</td></tr>` : ''}
      </table>
      <div class="note">A = ${T('غائب', 'Absent')} · F = ${T('جمعة/راحة', 'Friday/Rest')} · H = ${T('عطلة رسمية', 'Holiday')} · ${T(`ما زاد على ${nm(ts.hours_per_day)} ساعات في اليوم يُحتسب وقتاً إضافياً — عمل الجمعة بالسعر العادي`, `Hours above ${nm(ts.hours_per_day)}/day count as overtime — Friday work bills at the normal rate`)}</div>
      ${last ? `<div class="sigrow">
        <div><div class="t">${T('أعدّه', 'Prepared by')}</div></div>
        <div><div class="t">${T('راجعه', 'Checked by')}</div></div>
        <div><div class="t">${T('اعتمده — MCC', 'Approved — MCC')}</div></div>
        <div><div class="t">${T('اعتماد العميل', 'Client Approval')}</div></div>
      </div>` : ''}
    `
  })
  printDoc(docShell(isAr, true,
    pagesHtml.map((p, i) => pageWrap(p, i + 1, pagesHtml.length, location.origin)).join(''),
    ts.sheet_no || 'Timesheet'))
}

/* ════════════════════ 3) المستخلص — خطاب المطالبة الشهرية ════════════════════
   نفس بنية مستندات المكتب: جدول الساعات العادية ثم الإضافية بسعرها المستقل،
   فالخصم (معدل الغياب × الأيام) فالتسوية فالضريبة على الصافي، والمبلغ كتابةً. */
export function printManpowerClaim(claim, { contract, sheet, bank, lang = 'ar', splitFn, absentFn } = {}) {
  const isAr = lang === 'ar'
  const T = (ar, en) => isAr ? ar : en
  const client = contract ? pick(isAr, contract.client_name, contract.client_name_en) : ''
  const lines = claim.lines || []
  const otRateOf = l => n(l.ot_rate) || n(l.unit_price) * (n(l.ot_multiplier) || 1.5)

  const normRows = lines.filter(l => n(l.normal_units) > 0).map(l => `<tr>
    <td>${esc(isAr ? (l.item || l.item_en) : (l.item_en || l.item))}</td>
    <td class="c num">${nm(l.normal_units)}</td><td class="c num">${nm2(l.unit_price)}</td>
    <td class="c num">${nm2(n(l.normal_units) * n(l.unit_price))}</td></tr>`).join('')
  const otRows = lines.filter(l => n(l.ot_units) > 0).map(l => `<tr>
    <td>${esc(isAr ? (l.item || l.item_en) : (l.item_en || l.item))}</td>
    <td class="c num">${nm(l.ot_units)}</td><td class="c num">${nm2(otRateOf(l))}</td>
    <td class="c num">${nm2(n(l.ot_units) * otRateOf(l))}</td></tr>`).join('')

  const subtotal = n(claim.subtotal), otAmount = n(claim.ot_amount)
  const ded = n(claim.deductions), adj = n(claim.adjustment)
  const net = Math.max(0, subtotal + otAmount - ded + adj)
  const vat = n(claim.vat_amount), total = n(claim.total)
  const dedDays = n(claim.absent_days), dedRate = n(claim.deduction_rate)

  const p1 = `
    <div class="title">${T('مستخلص أعمال — توريد عمالة', 'PROGRESS CLAIM — MANPOWER SUPPLY')}</div>
    <div class="meta">
      <div><div class="k">${T('رقم المستخلص', 'CLAIM NO.')}</div><div class="v">${esc(claim.claim_no || '—')}</div></div>
      <div><div class="k">${T('العقد', 'CONTRACT')}</div><div class="v">${esc(contract?.contract_no || '—')}</div></div>
      <div><div class="k">${T('الفترة', 'PERIOD')}</div><div class="v">${fmtD(claim.period_from)} → ${fmtD(claim.period_to)}</div></div>
      ${contract?.po_number ? `<div><div class="k">${T('أمر الشراء', 'P.O. NO.')}</div><div class="v">${esc(contract.po_number)}</div></div>` : ''}
    </div>
    <div class="two">
      <div class="box">
        <div class="lbl">${T('السادة', 'TO')}</div>
        <div class="nm">${esc(client)}</div>
        ${(contract?.project_name || contract?.project_name_en) ? `<div class="ln">${T('المشروع', 'Project')}: ${esc(pick(isAr, contract.project_name, contract.project_name_en))}</div>` : ''}
        ${contract?.client_vat_no ? `<div class="ln">${T('الرقم الضريبي', 'VAT No.')}: ${esc(contract.client_vat_no)}</div>` : ''}
        <div class="ln">${T('عناية: الإدارة المالية', 'Attn: Accounts Department')}</div>
      </div>
      <div class="box">
        <div class="lbl">${T('من', 'FROM')}</div>
        <div class="nm">${esc(T(MCC_SELLER.name_ar, MCC_SELLER.name_en))}</div>
        <div class="ln">${T('س.ت', 'C.R')}: ${MCC_SELLER.cr}</div>
        ${sheet ? `<div class="ln">${T('كشف الدوام', 'Timesheet')}: ${esc(sheet.sheet_no || '')}</div>` : ''}
      </div>
    </div>
    <p>${T('نتقدّم لكم بمستخلص أعمال توريد العمالة عن الفترة المبيّنة أعلاه بموجب كشف الدوام المعتمد، وتفصيله كما يلي:',
      'We hereby submit our manpower supply progress claim for the period stated above, based on the approved timesheet, detailed as follows:')}</p>
    <h3 class="sec"><span class="no">1</span>${T('الساعات العادية', 'NORMAL HOURS')}</h3>
    <table class="rates">
      <tr><th>${T('المهنة', 'Category')}</th><th style="width:26mm">${T('الوحدات', 'Units')}</th><th style="width:26mm">${T('السعر (ر.س)', 'Rate (SAR)')}</th><th style="width:32mm">${T('المبلغ (ر.س)', 'Amount (SAR)')}</th></tr>
      ${normRows || `<tr><td colspan="4" class="c">—</td></tr>`}
      <tr class="tot"><td colspan="3" style="text-align:${isAr ? 'left' : 'right'}">${T('إجمالي العادي', 'TOTAL NORMAL')}</td><td class="c num">${nm2(subtotal)}</td></tr>
    </table>
    ${otRows ? `<h3 class="sec"><span class="no">2</span>${T('الساعات الإضافية', 'OVERTIME HOURS')}</h3>
    <table class="rates">
      <tr><th>${T('المهنة', 'Category')}</th><th style="width:26mm">${T('الوحدات', 'Units')}</th><th style="width:26mm">${T('سعر الإضافي (ر.س)', 'OT Rate (SAR)')}</th><th style="width:32mm">${T('المبلغ (ر.س)', 'Amount (SAR)')}</th></tr>
      ${otRows}
      <tr class="tot"><td colspan="3" style="text-align:${isAr ? 'left' : 'right'}">${T('إجمالي الإضافي', 'TOTAL OVERTIME')}</td><td class="c num">${nm2(otAmount)}</td></tr>
    </table>` : ''}
    <h3 class="sec"><span class="no">${otRows ? 3 : 2}</span>${T('الحساب', 'SUMMARY')}</h3>
    <table class="sum">
      <tr><td class="k">${T('المبلغ', 'AMOUNT')}</td><td class="v">${nm2(subtotal + otAmount)}</td></tr>
      ${ded ? `<tr><td class="k">${T('الخصم', 'DEDUCTION')}${dedRate && dedDays ? ` (${nm2(dedRate)} × ${nm0(dedDays)})` : ''}</td><td class="v">− ${nm2(ded)}</td></tr>` : ''}
      ${adj ? `<tr><td class="k">${T('تسوية', 'ADJUSTMENT')}${claim.adjustment_note ? ' — ' + esc(claim.adjustment_note) : ''}</td><td class="v">${adj > 0 ? '+ ' : '− '}${nm2(Math.abs(adj))}</td></tr>` : ''}
      <tr><td class="k">${T('الإجمالي قبل الضريبة', 'TOTAL WITHOUT VAT')}</td><td class="v">${nm2(net)}</td></tr>
      <tr><td class="k">${T(`ضريبة القيمة المضافة ${nm(n(claim.vat_pct) || 15)}٪`, `VAT ${nm(n(claim.vat_pct) || 15)}%`)}</td><td class="v">${nm2(vat)}</td></tr>
      <tr class="grand"><td class="k">${T('المبلغ الإجمالي (ر.س)', 'TOTAL AMOUNT (SAR)')}</td><td class="v">${nm2(total)}</td></tr>
    </table>
    <div class="words">${T('المبلغ كتابةً: ', 'Amount in words: ')}${amountInWords(total, isAr)}</div>
    ${bankTable(bank, isAr)}
    <div class="sigrow">
      <div><div class="t">${T('أعدّه — MCC (التوقيع والختم)', 'Prepared by — MCC (Signature & Stamp)')}</div></div>
      <div><div class="t">${T('اعتماد العميل (التوقيع والختم)', 'Client Approval (Signature & Stamp)')}</div></div>
    </div>
  `

  /* صفحة تفصيل العمال — من كشف الدوام: ما يطلبه محاسب العميل قبل الاعتماد */
  let p2 = ''
  if (sheet && splitFn && absentFn) {
    const wRows = (sheet.lines || []).map((l, i) => {
      const s = splitFn(l.days, sheet.hours_per_day)
      const a = absentFn(l.days)
      const otr = n(l.ot_rate) || n(l.unit_price) * (n(sheet.ot_multiplier) || 1.5)
      const amt = s.normal * n(l.unit_price) + s.ot * otr
      return `<tr><td class="c">${i + 1}</td><td>${esc(l.worker_name)}</td>
      <td class="c">${esc(isAr ? (l.trade || l.trade_en) : (l.trade_en || l.trade))}</td>
      <td class="c num">${nm(s.normal)}</td><td class="c num">${nm(s.ot)}</td><td class="c num${a ? ' abs' : ''}">${a || ''}</td>
      <td class="c num">${nm2(l.unit_price)}</td><td class="c num">${nm2(amt)}</td></tr>`
    }).join('')
    p2 = `
      <div class="title">${T('ملحق المستخلص — تفصيل العمال', 'CLAIM ANNEX — PER-WORKER DETAIL')}</div>
      <div class="meta">
        <div><div class="k">${T('رقم المستخلص', 'CLAIM NO.')}</div><div class="v">${esc(claim.claim_no || '—')}</div></div>
        <div><div class="k">${T('كشف الدوام', 'TIMESHEET')}</div><div class="v">${esc(sheet.sheet_no || '—')}</div></div>
        <div><div class="k">${T('الفترة', 'PERIOD')}</div><div class="v">${fmtD(claim.period_from)} → ${fmtD(claim.period_to)}</div></div>
      </div>
      <table class="rates">
        <tr><th style="width:8mm">#</th><th>${T('اسم العامل', 'Employee Name')}</th><th style="width:26mm">${T('المهنة', 'Trade')}</th>
        <th style="width:17mm">${T('عادي', 'Normal')}</th><th style="width:17mm">${T('إضافي', 'OT')}</th><th style="width:14mm">${T('غياب', 'Abs')}</th>
        <th style="width:20mm">${T('السعر', 'Rate')}</th><th style="width:24mm">${T('المبلغ', 'Amount')}</th></tr>
        ${wRows}
      </table>
    `
  }
  const total_pages = p2 ? 2 : 1
  printDoc(docShell(isAr, false,
    pageWrap(p1, 1, total_pages, location.origin) + (p2 ? pageWrap(p2, 2, total_pages, location.origin) : ''),
    claim.claim_no || 'Claim'))
}

/* ════════════════════ 4) الفاتورة الضريبية ════════════════════ */
export function printManpowerInvoice(inv, { bank, lang = 'ar' } = {}) {
  const isAr = lang === 'ar'
  const T = (ar, en) => isAr ? ar : en
  const client = pick(isAr, inv.client_name, inv.client_name_en) || inv.client_name || ''
  const lines = inv.lines || []
  const otRateOf = l => n(l.ot_rate) || n(l.unit_price) * (n(l.ot_multiplier) || 1.5)

  const rows = []
  lines.forEach(l => {
    const nameAr = l.item || l.item_en || '', nameEn = l.item_en || l.item || ''
    if (n(l.normal_units) > 0) rows.push({
      name: isAr ? nameAr : nameEn, workers: l.workers, units: n(l.normal_units), rate: n(l.unit_price),
      amount: n(l.normal_units) * n(l.unit_price),
    })
    if (n(l.ot_units) > 0) rows.push({
      name: (isAr ? nameAr + ' — إضافي' : nameEn + ' — Overtime'), workers: l.workers, units: n(l.ot_units), rate: otRateOf(l),
      amount: n(l.ot_units) * otRateOf(l),
    })
  })
  const lineRows = rows.map((r, i) => `<tr>
    <td class="c">${i + 1}</td><td>${esc(r.name)}</td>
    <td class="c num">${n(r.workers) ? nm0(r.workers) : '—'}</td>
    <td class="c num">${nm(r.units)}</td><td class="c num">${nm2(r.rate)}</td><td class="c num">${nm2(r.amount)}</td>
  </tr>`).join('')

  const subtotal = n(inv.subtotal) + n(inv.ot_amount)
  const ded = n(inv.deduction), adj = n(inv.adjustment)
  const net = Math.max(0, subtotal - ded + adj)
  const total = n(inv.total)
  const remaining = Math.max(0, total - n(inv.paid_amount))

  const inner = `
    <div class="title">${T('فاتورة ضريبية', 'TAX INVOICE')} · ${T('توريد عمالة', 'MANPOWER SUPPLY')}</div>
    <div class="meta">
      <div><div class="k">${T('رقم الفاتورة', 'INVOICE NO.')}</div><div class="v">${esc(inv.invoice_no || '—')}</div></div>
      <div><div class="k">${T('تاريخ الإصدار', 'INVOICE DATE')}</div><div class="v">${fmtD(inv.invoice_date)}</div></div>
      <div><div class="k">${T('تاريخ الاستحقاق', 'DUE DATE')}</div><div class="v">${fmtD(inv.due_date)}</div></div>
      <div><div class="k">${T('الفترة', 'PERIOD')}</div><div class="v">${fmtD(inv.period_from)} → ${fmtD(inv.period_to)}</div></div>
    </div>
    <div class="two">
      <div class="box">
        <div class="lbl">${T('من — المورّد', 'FROM — SUPPLIER')}</div>
        <div class="nm">${esc(T(MCC_SELLER.name_ar, MCC_SELLER.name_en))}</div>
        <div class="ln">${T('س.ت', 'C.R')}: ${MCC_SELLER.cr}</div>
        ${MCC_SELLER.vat_no ? `<div class="ln">${T('الرقم الضريبي', 'VAT Reg. No.')}: ${MCC_SELLER.vat_no}</div>` : ''}
        <div class="ln">${esc(T(MCC_SELLER.address_ar, MCC_SELLER.address_en))}</div>
      </div>
      <div class="box">
        <div class="lbl">${T('إلى — العميل', 'INVOICE TO')}</div>
        <div class="nm">${esc(client)}</div>
        ${inv.client_cr_no ? `<div class="ln">${T('س.ت', 'C.R')}: ${esc(inv.client_cr_no)}</div>` : ''}
        ${inv.client_vat_no ? `<div class="ln">${T('الرقم الضريبي', 'VAT Reg. No.')}: ${esc(inv.client_vat_no)}</div>` : ''}
        ${inv.client_address ? `<div class="ln">${esc(inv.client_address)}</div>` : ''}
        ${inv.po_number ? `<div class="ln">${T('أمر الشراء', 'P.O. No.')}: ${esc(inv.po_number)}</div>` : ''}
        ${(inv.project_name || inv.project_name_en) ? `<div class="ln">${T('المشروع', 'Project')}: ${esc(pick(isAr, inv.project_name, inv.project_name_en))}</div>` : ''}
      </div>
    </div>
    <table class="rates">
      <tr><th style="width:8mm">#</th><th>${T('البيان', 'Description')}</th><th style="width:16mm">${T('العمال', 'Qty')}</th>
      <th style="width:22mm">${T('الوحدات', 'Units/Hrs')}</th><th style="width:22mm">${T('السعر (ر.س)', 'Rate (SAR)')}</th><th style="width:28mm">${T('المبلغ (ر.س)', 'Amount (SAR)')}</th></tr>
      ${lineRows || `<tr><td colspan="6" class="c">—</td></tr>`}
      <tr class="tot"><td colspan="5" style="text-align:${isAr ? 'left' : 'right'}">${T('الإجمالي', 'TOTAL')}</td><td class="c num">${nm2(subtotal)}</td></tr>
    </table>
    <table class="sum">
      ${ded ? `<tr><td class="k">${T('الخصم', 'DEDUCTION')}${inv.deduction_note ? ' — ' + esc(inv.deduction_note) : ''}</td><td class="v">− ${nm2(ded)}</td></tr>` : ''}
      ${adj ? `<tr><td class="k">${T('تسوية', 'ADJUSTMENT')}${inv.adjustment_note ? ' — ' + esc(inv.adjustment_note) : ''}</td><td class="v">${adj > 0 ? '+ ' : '− '}${nm2(Math.abs(adj))}</td></tr>` : ''}
      <tr><td class="k">${T('الإجمالي قبل الضريبة', 'TOTAL WITHOUT VAT')}</td><td class="v">${nm2(net)}</td></tr>
      <tr><td class="k">${T(`ضريبة القيمة المضافة ${nm(n(inv.vat_pct) || 15)}٪`, `VAT ${nm(n(inv.vat_pct) || 15)}%`)}</td><td class="v">${nm2(inv.vat_amount)}</td></tr>
      <tr class="grand"><td class="k">${T('المبلغ الإجمالي شامل الضريبة (ر.س)', 'TOTAL AMOUNT INCL. VAT (SAR)')}</td><td class="v">${nm2(total)}</td></tr>
      ${n(inv.paid_amount) > 0 ? `<tr><td class="k">${T('المسدَّد', 'PAID')}</td><td class="v">${nm2(inv.paid_amount)}</td></tr>
      <tr><td class="k">${T('المتبقي', 'BALANCE DUE')}</td><td class="v">${nm2(remaining)}</td></tr>` : ''}
    </table>
    <div class="words">${T('المبلغ كتابةً: ', 'Amount in words: ')}${amountInWords(total, isAr)}</div>
    ${bankTable(bank, isAr)}
    ${inv.notes && (isAr || !hasArabic(inv.notes)) ? `<div class="note">${esc(inv.notes)}</div>` : ''}
    <div class="sigrow">
      <div><div class="t">${T('أعدّها — MCC (التوقيع والختم)', 'Prepared by — MCC (Signature & Stamp)')}</div></div>
      <div><div class="t">${T('استلمها — العميل (التوقيع والختم)', 'Received by — Client (Signature & Stamp)')}</div></div>
    </div>
  `
  printDoc(docShell(isAr, false, pageWrap(inner, 1, 1, location.origin), inv.invoice_no || 'Invoice'))
}

/* ════════════════════ 5) كشف الرواتب والأرباح (بالعرض) ════════════════════ */
export function printManpowerPayroll(p, { lang = 'ar', showPnl = false, branchName = '' } = {}) {
  const isAr = lang === 'ar'
  const T = (ar, en) => isAr ? ar : en
  const penRate = n(p.absence_penalty_rate)
  const calc = (l) => {
    const basic = n(l.basic_hours) * n(l.wage_rate)
    const ot = n(l.ot_hours) * n(l.ot_wage)
    const pen = n(l.absent_days) * penRate
    const net = basic + ot - pen - n(l.advance)
    return { basic, ot, pen, net }
  }
  let tB = 0, tO = 0, tP = 0, tA = 0, tN = 0, tH = 0, tOH = 0
  const rows = (p.lines || []).map((l, i) => {
    const c = calc(l)
    tB += c.basic; tO += c.ot; tP += c.pen; tA += n(l.advance); tN += c.net; tH += n(l.basic_hours); tOH += n(l.ot_hours)
    return `<tr><td class="c">${i + 1}</td><td>${esc(l.name)}</td>
    <td class="c num">${esc(l.iqama || '—')}</td><td class="c">${esc(isAr ? (l.trade || l.trade_en) : (l.trade_en || l.trade))}</td>
    <td class="c num">${nm(l.basic_hours)}</td><td class="c num">${nm(l.ot_hours)}</td><td class="c num${n(l.absent_days) ? ' abs' : ''}">${n(l.absent_days) || ''}</td>
    <td class="c num">${nm2(l.wage_rate)}</td><td class="c num">${nm2(c.basic)}</td><td class="c num">${nm2(c.ot)}</td>
    <td class="c num">${nm2(c.basic + c.ot)}</td><td class="c num">${c.pen ? '− ' + nm2(c.pen) : ''}</td>
    <td class="c num">${n(l.advance) ? '− ' + nm2(l.advance) : ''}</td><td class="c num" style="font-weight:700">${nm2(c.net)}</td>
    <td></td></tr>`
  }).join('')

  const inner1 = `
    <div class="title">${T('مسير رواتب توريد العمالة — ', 'MANPOWER PAYROLL REGISTER — ')}${esc(String(p.month || '').slice(0, 7))}${branchName ? ' · ' + esc(branchName) : ''}</div>
    <div class="meta">
      <div><div class="k">${T('رقم المسير', 'REGISTER NO.')}</div><div class="v">${esc(p.payroll_no || '—')}</div></div>
      <div><div class="k">${T('الشهر', 'MONTH')}</div><div class="v">${esc(String(p.month || '').slice(0, 7))}</div></div>
      <div><div class="k">${T('عدد العمال', 'WORKERS')}</div><div class="v">${nm0((p.lines || []).length)}</div></div>
      <div><div class="k">${T('خصم الغياب/يوم', 'ABSENCE PENALTY')}</div><div class="v">${nm2(penRate)}</div></div>
    </div>
    <table class="rates">
      <tr><th style="width:6mm">#</th><th style="min-width:30mm">${T('اسم العامل', 'Employee Name')}</th><th style="width:19mm">${T('الإقامة', 'Iqama')}</th><th style="width:17mm">${T('المهنة', 'Trade')}</th>
      <th style="width:12mm">${T('ساعات', 'Basic Hr')}</th><th style="width:11mm">${T('إضافي', 'OT Hr')}</th><th style="width:9mm">${T('غياب', 'Abs')}</th>
      <th style="width:12mm">${T('الأجر/س', 'Rate/Hr')}</th><th style="width:16mm">${T('الأساسي', 'Basic')}</th><th style="width:13mm">${T('الإضافي', 'OT Pay')}</th>
      <th style="width:16mm">${T('الإجمالي', 'Total')}</th><th style="width:14mm">${T('خصم غياب', 'Abs Ded.')}</th><th style="width:13mm">${T('سلفة', 'Advance')}</th><th style="width:17mm">${T('الصافي', 'Net')}</th>
      <th style="width:22mm">${T('توقيع الاستلام', 'Signature')}</th></tr>
      ${rows}
      <tr class="tot"><td colspan="4" style="text-align:${isAr ? 'left' : 'right'}">${T('الإجمالي', 'TOTAL')}</td>
      <td class="c num">${nm(tH)}</td><td class="c num">${nm(tOH)}</td><td></td><td></td>
      <td class="c num">${nm2(tB)}</td><td class="c num">${nm2(tO)}</td><td class="c num">${nm2(tB + tO)}</td>
      <td class="c num">${tP ? '− ' + nm2(tP) : ''}</td><td class="c num">${tA ? '− ' + nm2(tA) : ''}</td><td class="c num" style="font-weight:700">${nm2(tN)}</td>
      <td></td></tr>
    </table>
    <div class="words">${T('صافي المسير كتابةً: ', 'Net payable in words: ')}${amountInWords(tN, isAr)}</div>
    <div class="sigrow">
      <div><div class="t">${T('أعدّه', 'Prepared by')}</div></div>
      <div><div class="t">${T('راجعه', 'Checked by')}</div></div>
      <div><div class="t">${T('اعتمده', 'Approved by')}</div></div>
    </div>
  `

  let inner2 = ''
  if (showPnl && p.revenue != null) {
    /* الإيراد المخزَّن قبل الضريبة — الضريبة تحصيلٌ عابر للهيئة لا يدخل الربح */
    const revenue = n(p.revenue)
    const mgr = n(p.manager_profit)
    const remainder = revenue - tN - mgr
    const partners = Array.isArray(p.partners) ? p.partners.filter(x => x?.name) : []
    const pnlRows = [
      [T('إيراد الشهر (قبل الضريبة)', 'Month revenue (excl. VAT)'), nm2(revenue)],
      [T('رواتب العمال (صافي)', 'Employees salaries (net)'), '− ' + nm2(tN)],
      mgr ? [T('ربح الإدارة', 'Manager profit'), '− ' + nm2(mgr)] : null,
      [T('المتبقي للتوزيع', 'Remainder for distribution'), nm2(remainder)],
    ].filter(Boolean)
    inner2 = `
      <div class="title">${T('حساب الأرباح والخسائر — ', 'PROFIT & LOSS — ')}${esc(String(p.month || '').slice(0, 7))}</div>
      <table class="sum" style="font-size:10pt">
        ${pnlRows.map(([k, v], i) => `<tr${i === pnlRows.length - 1 ? ' class="grand"' : ''}><td class="k">${k}</td><td class="v">${v}</td></tr>`).join('')}
      </table>
      ${partners.length ? `<h3 class="sec">${T('تقسيم الشركاء', 'PARTNERS SPLIT')}</h3>
      <table class="sum">
        ${partners.map(x => `<tr><td class="k">${esc(x.name)} — ${nm(x.share_pct)}٪</td><td class="v">${nm2(remainder > 0 ? remainder * n(x.share_pct) / 100 : 0)}</td></tr>`).join('')}
      </table>` : ''}
      ${tA ? `<div class="note">${T(`إجمالي السُلف المخصومة من الرواتب هذا الشهر: ${nm2(tA)} ر.س (مبيّنة في كشف الرواتب).`, `Total advances deducted from salaries this month: SAR ${nm2(tA)} (shown in the salary sheet).`)}</div>` : ''}
      <div class="sigrow">
        <div><div class="t">${T('المدير العام', 'General Manager')}</div></div>
        <div><div class="t">${T('المحاسب', 'Accountant')}</div></div>
      </div>
    `
  }
  const totalPages = inner2 ? 2 : 1
  printDoc(docShell(isAr, true,
    pageWrap(inner1, 1, totalPages, location.origin) + (inner2 ? pageWrap(inner2, 2, totalPages, location.origin) : ''),
    p.payroll_no || 'Payroll'))
}
