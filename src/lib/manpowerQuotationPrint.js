/* ═══════════════════════════════════════════════════════════════════════════
   عرض سعر توريد العمالة — ملفّ من صفحتين بهوية MCC، بالعربية أو الإنجليزية.

   لماذا ملفٌّ مستقلّ: القالب صار وثيقةً كاملة (صفحة عرض + صفحة شروط وتوقيع)
   بلغتين، فبقاؤه داخل صفحة القائمة كان يُغرقها. وهو خالصٌ بلا حالة: يأخذ
   التسعيرة ويُعيد HTML، فيسهل تجريبه وتغييره وحده.

   لماذا صفحتان: الصفحة الأولى هي ما يقرؤه صاحب القرار — من نحن، وكم السعر.
   والثانية هي ما يقرؤه من يراجع العقد — الشروط والتوقيع. خلطُهما في صفحةٍ
   واحدة يجعل السعر يضيع بين البنود.
   ═══════════════════════════════════════════════════════════════════════════ */

const n = v => { const x = parseFloat(String(v ?? '').replace(/,/g, '')); return isNaN(x) ? 0 : x }
const nm = v => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })
const nm0 = v => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const hasArabic = v => /[؀-ۿ]/.test(String(v ?? ''))
/* الواو في العربية تتّصل بما بعدها: «السكن والمواصلات» لا «السكن و المواصلات» */
const andList = (a) => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join('، ') + ' و' + a[a.length - 1]
const andListEn = a => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]

const METHOD = {
  hour: { ar: 'بالساعة', en: 'Per Hour' },
  day: { ar: 'باليوم', en: 'Per Day' },
  month: { ar: 'بالشهر', en: 'Per Month' },
  meter: { ar: 'بالمتر', en: 'Per Meter' },
  lump: { ar: 'مقطوعية', en: 'Lump Sum' },
}
const methodLabel = (v, isAr) => (METHOD[v] ? (isAr ? METHOD[v].ar : METHOD[v].en) : '—')

const PAY_TEXT = {
  net15: {
    ar: 'الدفع شهرياً مقابل كشوف دوام معتمدة، وتُستحق الفاتورة خلال 15 يوماً من تاريخ تقديمها.',
    en: 'Payment shall be made on a monthly basis against approved timesheets. Invoices are due NET 15 days from the date of submission.',
  },
  net30: {
    ar: 'الدفع شهرياً مقابل كشوف دوام معتمدة، وتُستحق الفاتورة خلال 30 يوماً من تاريخ تقديمها.',
    en: 'Payment shall be made on a monthly basis against approved timesheets. Invoices are due NET 30 days from the date of submission.',
  },
  early_disc: {
    ar: 'الدفع شهرياً مقابل كشوف دوام معتمدة، وتُستحق الفاتورة خلال 15 يوماً، مع خصم 1٪ عند السداد خلال 7 أيام.',
    en: 'Payment shall be made on a monthly basis against approved timesheets. Invoices are due NET 15 days from the date of submission. A 1% early payment discount is available for settlement within 7 days.',
  },
  advance_25: {
    ar: 'دفعة مقدَّمة 25٪ عند توقيع العقد، والباقي يُفوتَر شهرياً مقابل كشوف دوام معتمدة.',
    en: 'A 25% advance payment shall be made upon contract signing, with the balance invoiced monthly against approved timesheets.',
  },
  on_delivery: {
    ar: 'الدفع عند التسليم وقبول الأعمال.',
    en: 'Payment shall be made upon delivery and acceptance of the works.',
  },
}

/* المدن: الخطاب الإنجليزي يحتاج الاسم الإنجليزي، والمخزَّن قد يكون العربي */
const CITY_EN = { JUB: 'Al Jubail', KHB: 'Al Khobar', DMM: 'Dammam', RYD: 'Riyadh', HAL: 'Al Ahsa', JED: 'Jeddah', MKA: 'Makkah', MDN: 'Madinah' }

/* ── بناء نصوص الوثيقة بلغةٍ واحدة ─────────────────────────────────────────
   كل جملةٍ لها وجهان، ويُختار الوجه كاملاً — لا تُركَّب جملةٌ من نصفين. */
function buildDoc(r, { branches, cities, isAr }) {
  const hpd = n(r.hours_per_day) || 10
  const dpm = n(r.days_per_month) || 26
  const validity = r.validity_days || 5
  const vat = 15

  const branch = (branches || []).find(b => b.id === r.branch_id)
  const codePrefix = String(branch?.branch_code || '').replace(/[0-9]+$/, '').toUpperCase()
  const branchTxt = isAr
    ? (branch?.name_ar || 'المنطقة الشرقية')
    : (CITY_EN[codePrefix] || 'Eastern Province')

  const cityRow = (cities || []).find(c => c.name_ar === r.client_location || c.name_en === r.client_location)
  const city = isAr
    ? (cityRow?.name_ar || (hasArabic(r.client_location) ? r.client_location : '') || '')
    : (cityRow?.name_en || (hasArabic(r.client_location) ? '' : (r.client_location || '')))

  const clientName = isAr ? (r.client_name || '') : (r.client_name_en || r.client_name || '')
  const attn = isAr ? (r.attn_name || '') : (hasArabic(r.attn_name) ? '' : (r.attn_name || ''))
  const work = isAr ? (r.work_description || '') : (hasArabic(r.work_description) ? '' : (r.work_description || ''))
  const invTerms = isAr ? (r.invoice_terms || '') : (r.invoice_terms_en || (hasArabic(r.invoice_terms) ? '' : (r.invoice_terms || '')))

  const lines = (r.revenue_lines || []).filter(l => (l.item || l.item_en) && n(l.unit_price) > 0)
  const hasLabour = lines.some(l => ['hour', 'day', 'month'].includes(l.method))
  const hasWorks = lines.some(l => ['meter', 'lump'].includes(l.method))
  const timeBased = lines.length > 0 && !hasWorks

  const monthlyEst = l => l.method === 'hour' ? n(l.unit_price) * hpd * dpm
    : l.method === 'day' ? n(l.unit_price) * dpm
      : l.method === 'month' ? n(l.unit_price) : null
  const lineAmount = l => n(l.unit_price) * (l.method === 'lump' ? 1 : (n(l.units) || 1))
  // القيمة الشهرية للعرض العمالي: التقدير الشهري لكل مهنة × عددها
  const monthlyTotal = lines.reduce((t, l) => t + (monthlyEst(l) || 0) * (n(l.units) || 1), 0)
  const worksTotal = lines.reduce((t, l) => t + lineAmount(l), 0)
  const headline = timeBased ? monthlyTotal : worksTotal

  const subject = timeBased
    ? (isAr ? 'عرض سعر توريد عمالة — حرفيون مهرة' : 'Manpower Supply Quotation — Skilled Tradesmen')
    : hasLabour
      ? (isAr ? 'عرض سعر توريد عمالة وأعمال' : 'Manpower Supply & Works Quotation')
      : (isAr ? 'عرض سعر — نطاق الأعمال' : 'Quotation — Scope of Works')

  const scope = timeBased
    ? (isAr ? 'توريد حرفيين مهرة' : 'the supply of skilled tradesmen')
    : hasLabour
      ? (isAr ? 'توريد حرفيين مهرة وتنفيذ الأعمال' : 'the supply of skilled tradesmen and the works')
      : (isAr ? 'تنفيذ الأعمال' : 'the works')

  /* بنود التحمّل — من يوفّر ماذا. جملةٌ واحدة مبنيّة من المدخلات لا خمس جمل. */
  const fatItems = isAr
    ? [['الإعاشة', r.food_by], ['السكن', r.housing_by], ['المواصلات اليومية', r.transport_by]]
    : [['food', r.food_by], ['accommodation', r.housing_by], ['daily transportation', r.transport_by]]
  const byClient = fatItems.filter(([, v]) => v !== 'mcc').map(([k]) => k)
  const byMcc = fatItems.filter(([, v]) => v === 'mcc').map(([k]) => k)
  const fat = []
  if (byClient.length) fat.push(isAr
    ? `يوفّر العميل للعمال ${andList(byClient)}.`
    : `Workers' ${andListEn(byClient)} shall be provided by the Client.`)
  if (byMcc.length) fat.push(isAr
    ? `توفّر MCC للعمال ${andList(byMcc)} (مشمولة في الأسعار المعروضة).`
    : `Workers' ${andListEn(byMcc)} shall be provided by MCC (included in the quoted rates).`)

  const byWord = v => v === 'mcc' ? (isAr ? 'MCC' : 'MCC') : (isAr ? 'العميل' : 'the Client')
  const tools = r.safety_by === r.tools_by
    ? (isAr ? `يوفّر ${byWord(r.tools_by)} العُدد اليدوية ومهمّات السلامة الشخصية.`
      : `Hand tools and personal safety equipment (PPE) shall be provided by ${byWord(r.tools_by)}.`)
    : (isAr ? `يوفّر ${byWord(r.tools_by)} العُدد اليدوية، ويوفّر ${byWord(r.safety_by)} مهمّات السلامة الشخصية.`
      : `Hand tools shall be provided by ${byWord(r.tools_by)}. Personal safety equipment (PPE) shall be provided by ${byWord(r.safety_by)}.`)

  const hoursTerm = !timeBased ? null
    : lines.some(l => l.method === 'hour')
      ? (isAr ? `ساعات العمل ${hpd} ساعات يومياً و${dpm} يوم عمل شهرياً. وما زاد على ${hpd} ساعات يومياً، أو عمل يومَي الجمعة والسبت والعطل الرسمية، يُحتسب بالسعر نفسه.`
        : `Working hours are based on ${hpd} hours per day and ${dpm} working days per month. Any hours exceeding ${hpd} hours per day, or work performed on Fridays, Saturdays or public holidays, shall be billed at the same rate.`)
      : (isAr ? `أيام العمل ${dpm} يوماً شهرياً. وعملُ يومَي الجمعة والسبت والعطل الرسمية يُحتسب بالسعر نفسه.`
        : `Working days are based on ${dpm} working days per month. Work performed on Fridays, Saturdays or public holidays shall be billed at the same rate.`)

  const terms = [
    isAr ? 'جميع الأسعار بالريال السعودي، وشاملةً الأجر الأساسي للعامل ورسوم الإقامة والتأمين الطبي.'
      : `All rates are quoted in Saudi Riyals (SAR) and are inclusive of the worker's basic salary, Iqama fees, and medical insurance coverage.`,
    hoursTerm,
    r.ajeer !== false
      ? (isAr ? 'توفّر MCC جميع العمال عبر نظام أجير بالتزامٍ كامل بأنظمة العمل السعودية، ويحمل العمال إقاماتٍ سارية ورخص عمل وتأميناً طبياً.'
        : 'MCC shall provide all workers through the Ajeer system in full compliance with Saudi labor regulations. Workers will hold valid Iqama, work permits, and medical insurance.')
      : (isAr ? 'توفّر MCC جميع العمال بالتزامٍ كامل بأنظمة العمل السعودية، ويحمل العمال إقاماتٍ سارية ورخص عمل وتأميناً طبياً.'
        : 'MCC shall provide all workers in full compliance with Saudi labor regulations. Workers will hold valid Iqama, work permits, and medical insurance.'),
    isAr ? 'يكتمل تعبئة العمالة خلال 72 ساعة للمهن الاعتيادية، ومن 7 إلى 14 يوم عمل للتخصصية، حسب التوفّر.'
      : 'Worker mobilization shall be completed within 72 hours for standard trades and within 7–14 business days for specialized positions, subject to availability.',
    (PAY_TEXT[r.payment_terms_key || 'net15'] || PAY_TEXT.net15)[isAr ? 'ar' : 'en'],
    invTerms ? (isAr ? `شروط الفوترة: ${invTerms}` : `Progress billing terms: ${invTerms}`) : null,
    ...fat,
    tools,
    isAr ? 'تحتفظ MCC بحق استبدال أي عامل يُرى غير لائقٍ أو ضعيف الأداء خلال 48 ساعة دون تكلفة إضافية على العميل.'
      : 'MCC reserves the right to replace any worker who is deemed unfit or underperforming within 48 hours, at no additional cost to the Client.',
    isAr ? `هذا العرض ساري ${validity} أيام من تاريخ إصداره، وبعدها تخضع الأسعار للمراجعة وفق أحوال السوق.`
      : `This quotation is valid for ${validity} days from the date of issue. Rates are subject to revision thereafter based on prevailing market conditions.`,
    isAr ? `الأسعار غير شاملة ضريبة القيمة المضافة ${vat}٪ وفق النظام السعودي.`
      : `All rates are exclusive of ${vat}% VAT as per Saudi law.`,
  ].filter(Boolean)

  return {
    isAr, hpd, dpm, validity, branchTxt, city, clientName, attn, work,
    lines, timeBased, monthlyEst, lineAmount, headline, subject, scope, terms,
  }
}

/* ── هوية الوثيقة: ذهبٌ على عاجيّ، ومسافاتٌ واسعة، وخطٌّ واحد لا يتزاحم ──
   الفخامة هنا ليست زخرفة: هي انتظامُ الشبكة، واتّساع الهوامش، وقلّة الألوان
   (ذهبٌ واحد ورماديّان)، وترقيمُ الصفحات — وهي ما يميّز خطاب شركةٍ من ورقة. */
const CSS = (isAr) => `
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font-family: ${isAr ? `'Cairo','Tajawal','Segoe UI',Arial,sans-serif` : `'Segoe UI',Arial,Helvetica,sans-serif`};
    color: #1c1c1c; font-size: 10.4pt; line-height: 1.65;
  }
  .page {
    width: 210mm; min-height: 297mm; margin: 0 auto; position: relative;
    display: flex; flex-direction: column; background: #fff; overflow: hidden;
  }
  .hdr img, .ftr img { width: 100%; display: block; }
  .ftr { margin-top: auto; }
  .body { padding: 8mm 18mm 6mm; flex: 1; position: relative; z-index: 1; }

  /* علامة مائية خفيفة — حضورُ الهوية بلا ضجيج */
  .wm {
    position: absolute; top: 45%; ${isAr ? 'right' : 'left'}: 50%;
    transform: translate(${isAr ? '50%' : '-50%'}, -50%) rotate(-24deg);
    font-size: 78pt; font-weight: 800; letter-spacing: 6px;
    color: #C9962E; opacity: .045; white-space: nowrap; z-index: 0; pointer-events: none;
  }

  /* شريط المعلومات: التاريخ والمرجع والصلاحية في صفٍّ واحد بحدٍّ ذهبي */
  .meta { display: flex; gap: 0; border: .5pt solid #e3d6b8; border-radius: 2mm; overflow: hidden; margin-bottom: 6mm; }
  .meta div { flex: 1; padding: 2.4mm 3mm; text-align: center; border-inline-end: .5pt solid #efe6d2; }
  .meta div:last-child { border-inline-end: none; }
  .meta .k { font-size: 7.6pt; color: #8a7a58; letter-spacing: .4px; margin-bottom: .6mm; }
  .meta .v { font-size: 9.6pt; font-weight: 600; color: #2a2317; font-variant-numeric: tabular-nums; }

  .to { margin-bottom: 5mm; line-height: 1.6; }
  .to .lbl { font-size: 8.4pt; color: #8a7a58; letter-spacing: .5px; margin-bottom: 1mm; }
  .to .nm { font-size: 12.5pt; font-weight: 600; color: #1c1c1c; }
  .to .sub { font-size: 9.6pt; color: #4a4a4a; }

  .subject {
    font-weight: 600; font-size: 11pt; color: #8a6a1f; text-align: center;
    padding: 2.6mm 4mm; margin: 0 0 5mm; background: #fdf9f0;
    border-block: 1pt solid #C9962E; letter-spacing: .3px;
  }
  p { margin-bottom: 3mm; text-align: justify; }

  h3.sec {
    font-size: 10.4pt; font-weight: 600; letter-spacing: .6px; color: #8a6a1f;
    margin: 6mm 0 2.5mm; padding-bottom: 1.4mm; border-bottom: 1.2pt solid #C9962E;
    display: flex; align-items: center; gap: 3mm;
  }
  h3.sec span.no {
    width: 6mm; height: 6mm; border-radius: 50%; background: #C9962E; color: #fff;
    font-size: 8.4pt; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
  }

  table.rates { width: 100%; border-collapse: collapse; margin: 2mm 0; font-size: 9.6pt; }
  table.rates th {
    background: #C9962E; color: #fff; font-weight: 600; padding: 2.4mm 2mm;
    border: .4pt solid #b3841f; letter-spacing: .2px;
  }
  table.rates td { border: .4pt solid #ddd; padding: 2.2mm; }
  table.rates tbody tr:nth-child(even) td { background: #fcfaf5; }
  table.rates td.c { text-align: center; }
  table.rates tr.tot td { background: #fdf5e4; font-weight: 600; border-top: 1pt solid #C9962E; }
  .num { font-variant-numeric: tabular-nums; }

  /* شريط الرقم الرئيسي — أول ما تقع عليه العين */
  .headline {
    margin: 4mm 0 2mm; padding: 3.4mm 5mm; border-radius: 2mm;
    background: linear-gradient(${isAr ? '270deg' : '90deg'}, #fdf5e4 0%, #fbf7ef 100%);
    border: .6pt solid #e3d6b8; display: flex; align-items: baseline; justify-content: space-between; gap: 4mm;
  }
  .headline .k { font-size: 9.4pt; font-weight: 600; color: #8a6a1f; }
  .headline .v { font-size: 15pt; font-weight: 700; color: #8a6a1f; font-variant-numeric: tabular-nums; }
  .headline .x { font-size: 8pt; color: #8a7a58; }

  .note { font-size: 8.4pt; color: #666; margin-top: 1.5mm; }
  .partner { font-size: 9.2pt; font-weight: 600; color: #8a6a1f; margin: 3mm 0; text-align: center; }

  ol.terms { margin: 0 0 4mm; padding-inline-start: 6mm; }
  ol.terms li { margin-bottom: 2mm; text-align: justify; padding-inline-start: 1mm; }
  ol.terms li::marker { color: #C9962E; font-weight: 700; }

  .sig { margin-top: 8mm; position: relative; }
  .sig .stamp {
    position: absolute; top: -10mm; ${isAr ? 'right' : 'left'}: 48mm;
    width: 34mm; opacity: .88; transform: rotate(-8deg);
  }
  .sig .rule { width: 52mm; border-top: .8pt solid #999; margin: 12mm 0 1.6mm; }
  .sig .nm { font-weight: 600; font-size: 10.6pt; }
  .sig .ttl { font-size: 9pt; color: #444; }
  .sig .co { font-size: 9pt; color: #8a6a1f; font-weight: 600; margin-top: .8mm; }
  .sig .cl { font-size: 8.6pt; color: #555; margin-top: .6mm; font-variant-numeric: tabular-nums; }

  /* خانة قبول العميل — الوثيقة تُوقَّع لا تُقرأ فقط */
  .accept {
    margin-top: 8mm; border: .6pt dashed #C9962E; border-radius: 2mm; padding: 4mm 5mm; background: #fffdf8;
  }
  .accept .t { font-size: 9.4pt; font-weight: 600; color: #8a6a1f; margin-bottom: 3mm; }
  .accept .row { display: flex; gap: 8mm; }
  .accept .row > div { flex: 1; }
  .accept .fl { font-size: 8.4pt; color: #777; margin-bottom: 6mm; }
  .accept .ln { border-top: .6pt solid #bbb; }

  .pageno {
    position: absolute; bottom: 3mm; ${isAr ? 'left' : 'right'}: 18mm;
    font-size: 8pt; color: #a99a78; font-variant-numeric: tabular-nums; z-index: 2;
  }
  @media print { .page { page-break-after: always } .page:last-child { page-break-after: auto } }
`

/* ── الوثيقة كاملة ───────────────────────────────────────────────────────── */
function html(d, r, origin) {
  const { isAr } = d
  const T = (ar, en) => isAr ? ar : en
  const today = new Date()
  const dateStr = isAr
    ? today.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' })
    : today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const rows = d.lines.map((l, i) => {
    const est = d.monthlyEst(l)
    const name = isAr ? (l.item || l.item_en || '') : (l.item_en || l.item || '').toUpperCase()
    const tail = d.timeBased
      ? `<td class="c num">${nm0(l.units) || '1'}</td><td class="c num">${est === null ? '—' : nm0(est)}</td>`
      : `<td class="c num">${l.method === 'lump' ? '—' : nm0(l.units)}</td><td class="c num">${nm0(d.lineAmount(l))}</td>`
    return `<tr>
      <td class="c">${i + 1}</td>
      <td>${esc(name)}</td>
      <td class="c num">${nm(n(l.unit_price))}</td>
      <td class="c">${esc(methodLabel(l.method, isAr))}</td>
      ${tail}
    </tr>`
  }).join('')

  const head3 = d.timeBased
    ? `<th style="width:20mm">${T('العدد', 'Qty')}</th><th style="width:32mm">${T('التقدير الشهري', 'Monthly Est.')}</th>`
    : `<th style="width:20mm">${T('الكمية', 'Qty')}</th><th style="width:32mm">${T('المبلغ', 'Amount')}</th>`

  const totalRow = d.headline > 0 ? `<tr class="tot">
      <td colspan="4" style="text-align:${isAr ? 'left' : 'right'}">${d.timeBased
      ? T('الإجمالي الشهري التقديري (غير شامل الضريبة)', 'Estimated Monthly Total (excl. VAT)')
      : T('الإجمالي (غير شامل الضريبة)', 'Total (excl. VAT)')}</td>
      <td class="c"></td><td class="c num">${nm0(d.headline)}</td>
    </tr>` : ''

  const page = (inner, no) => `<div class="page">
    <div class="hdr"><img src="${origin}/mcc/header.png" alt=""></div>
    <div class="wm">MCC</div>
    <div class="body">${inner}</div>
    <div class="pageno">${T('صفحة', 'Page')} ${no} / 2</div>
    <div class="ftr"><img src="${origin}/mcc/footer.png" alt=""></div>
  </div>`

  /* ── الصفحة الأولى: من نحن، وكم السعر ── */
  const p1 = `
    <div class="meta">
      <div><div class="k">${T('التاريخ', 'DATE')}</div><div class="v">${esc(dateStr)}</div></div>
      <div><div class="k">${T('المرجع', 'REF')}</div><div class="v">${esc(r.quote_no || '—')}</div></div>
      <div><div class="k">${T('الفرع', 'BRANCH')}</div><div class="v">${esc(d.branchTxt)}</div></div>
      <div><div class="k">${T('الصلاحية', 'VALIDITY')}</div><div class="v">${d.validity} ${T('أيام', 'Days')}</div></div>
    </div>

    <div class="to">
      <div class="lbl">${T('السادة', 'TO')}</div>
      <div class="nm">${esc(d.clientName || T('اسم العميل', 'Company Name'))}</div>
      ${d.attn ? `<div class="sub">${T('عناية', 'Attn')}: ${esc(d.attn)}</div>` : ''}
      <div class="sub">${d.city ? esc(d.city) + '، ' : ''}${T('المملكة العربية السعودية', 'Kingdom of Saudi Arabia')}</div>
    </div>

    <div class="subject">${esc(d.subject)}</div>

    <p>${T('تحية طيبة وبعد،', 'Dear Sir / Madam,')}</p>
    <p>${T(
    `نشكر لكم استفساركم بشأن ${d.scope}${d.work ? ` لـ${esc(d.work)}` : ''}، ويسعدنا أن نقدّم لكم عرضنا التنافسي التالي لتفضّلكم بالاطلاع.`,
    `Thank you for your inquiry regarding ${d.scope}${d.work ? ` for ${esc(d.work)}` : ' for your project'}. We are pleased to submit our competitive rate quotation for your kind review and consideration.`)}</p>
    <p>${T(
    'شركة مهدي للمقاولات (MCC) شركة توريد عمالة مرخّصة ومسجّلة في نظام أجير، ولها خبرة واسعة في تزويد المشاريع بالعمالة الإنشائية الماهرة في أنحاء المملكة. عمالتنا مُنتقاة ومُختبَرة مهنياً، وتحمل وثائق سارية تشمل الإقامة والتأمين الطبي وشهادات السلامة اللازمة.',
    'MCC (Mahdi Contracting Co.) is a fully licensed manpower supply company registered under the Ajeer system, with extensive experience in deploying skilled construction workers across the Kingdom of Saudi Arabia. Our workforce is carefully screened, trade-tested, and equipped with valid documentation including Iqama, medical insurance, and relevant safety certifications.')}</p>

    <h3 class="sec"><span class="no">1</span>${T('جدول الأسعار', 'RATE SCHEDULE')}</h3>
    <table class="rates">
      <tr>
        <th style="width:9mm">#</th>
        <th>${T('المهنة / البند', 'Position / Work Item')}</th>
        <th style="width:26mm">${T('السعر (ر.س)', 'Rate (SAR)')}</th>
        <th style="width:24mm">${T('الأساس', 'Basis')}</th>
        ${head3}
      </tr>
      ${rows || `<tr><td class="c">1</td><td>—</td><td class="c">—</td><td class="c">—</td><td class="c">—</td><td class="c">—</td></tr>`}
      ${totalRow}
    </table>
    ${d.timeBased ? `<div class="note">* ${T(
    `التقدير الشهري = السعر × ${d.hpd} ساعات يومياً × ${d.dpm} يوماً شهرياً للعامل الواحد. الوقت الإضافي يُحتسب بالسعر نفسه.`,
    `Monthly estimate = Rate × ${d.hpd} hrs/day × ${d.dpm} days/month per worker. Overtime billed at the same rate.`)}</div>` : ''}

    ${d.headline > 0 ? `<div class="headline">
      <span class="k">${d.timeBased ? T('القيمة الشهرية التقديرية', 'Estimated Monthly Value') : T('قيمة العرض', 'Quotation Value')}</span>
      <span><span class="v">${nm0(d.headline)}</span> <span class="x">${T('ر.س · غير شامل الضريبة', 'SAR · excl. VAT')}</span></span>
    </div>` : ''}

    <div class="partner">${T('أسعار تفضيلية للتعاقدات طويلة الأجل', 'Partnership Pricing Available for Long-Term Commitments')}</div>
  `

  /* ── الصفحة الثانية: الشروط والتوقيع والقبول ── */
  const p2 = `
    <h3 class="sec"><span class="no">2</span>${T('الشروط والأحكام', 'TERMS & CONDITIONS')}</h3>
    <ol class="terms">${d.terms.map(t => `<li>${t}</li>`).join('')}</ol>

    <p>${T(
    'نثق أن أسعارنا التنافسية، مع التزامنا بالجودة والامتثال وسرعة التعبئة، تجعل من MCC الشريك الأنسب لاحتياجاتكم من العمالة، ونتطلّع لشرف العمل مع مؤسستكم الموقّرة.',
    'We are confident that our competitive rates, combined with our commitment to quality, compliance, and rapid mobilization, make MCC the ideal partner for your manpower requirements. We look forward to the opportunity of working with your esteemed organization.')}</p>
    <p>${T('ولأي استفسارٍ أو رغبةٍ في مناقشة الشروط، لا تتردّدوا في التواصل معنا.',
      'Should you require any clarification or wish to discuss the terms further, please do not hesitate to contact us.')}</p>

    <div class="sig">
      <img class="stamp" src="${origin}/mcc/stamp.png" alt="">
      <div>${T('وتفضّلوا بقبول فائق الاحترام،', 'Yours faithfully,')}</div>
      <div class="rule"></div>
      <div class="nm">${T('مهدي اليامي', 'Mahdi Alyami')}</div>
      <div class="ttl">${T('المؤسس والمدير التنفيذي', 'Founder & Executive Director')}</div>
      <div class="co">${T('شركة مهدي للمقاولات (MCC)', 'Mahdi Contracting Co. (MCC)')}</div>
      <div class="cl">${T('جوال', 'Mobile')}: 0554740314 &nbsp;|&nbsp; ${T('س.ت', 'CR')}: 7042715412 &nbsp;|&nbsp; ${T('المنطقة الشرقية، السعودية', 'Eastern Province, KSA')}</div>
    </div>

    <div class="accept">
      <div class="t">${T('إقرار القبول — للعميل', 'Acceptance — For the Client')}</div>
      <div class="row">
        <div><div class="fl">${T('الاسم والصفة', 'Name & Title')}</div><div class="ln"></div></div>
        <div><div class="fl">${T('التوقيع والختم', 'Signature & Stamp')}</div><div class="ln"></div></div>
        <div><div class="fl">${T('التاريخ', 'Date')}</div><div class="ln"></div></div>
      </div>
    </div>
  `

  return `<!doctype html><html lang="${isAr ? 'ar' : 'en'}" dir="${isAr ? 'rtl' : 'ltr'}"><head>
<meta charset="utf-8"><title>${esc(r.quote_no || 'Quotation')}</title>
${isAr ? '<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">' : ''}
<style>${CSS(isAr)}</style></head><body>${page(p1, 1)}${page(p2, 2)}</body></html>`
}

/* بناء الوثيقة بلا طباعة — للمعاينة والاختبار */
export function quotationHtml(r, { branches, cities, lang = 'en', origin } = {}) {
  const isAr = lang === 'ar'
  return html(buildDoc(r, { branches, cities, isAr }), r, origin || location.origin)
}

/* ── الطباعة: إطارٌ مخفيّ ينتظر صور الهوية ثم يطبع ─────────────────────────
   الانتظار ضروري: الطباعة قبل تحميل الترويسة تُخرج ورقةً بلا هوية — ومهلةٌ
   احتياطية كي لا تعلّق الطباعة إن تعذّرت صورة. */
export function printManpowerQuotation(r, branches, cities, lang = 'en') {
  const isAr = lang === 'ar'
  const d = buildDoc(r, { branches, cities, isAr })
  const doc0 = html(d, r, location.origin)

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:-9999px;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow.document
  doc.open(); doc.write(doc0); doc.close()

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

/* الربح المتوقَّع — يُحسب من بطاقة الأسعار لا من إدخالٍ يدوي:
   تكلفة الساعة في البطاقة مقابل السعر المعروض في التسعيرة. */
export const quoteEconomics = (r, rateCard, opts = {}) => {
  const hpd = n(r.hours_per_day) || 10
  const dpm = n(r.days_per_month) || 26
  const byTrade = new Map((rateCard || []).map(c => [c.position_ar, c]))
  const perMethod = (hourlyCost, method) => method === 'hour' ? hourlyCost
    : method === 'day' ? hourlyCost * hpd
      : method === 'month' ? hourlyCost * hpd * dpm : null

  const lines = (r.revenue_lines || []).filter(l => (l.item || l.item_en) && n(l.unit_price) > 0).map(l => {
    const qty = n(l.units) || 1
    const rc = byTrade.get(l.item)
    const unitCost = perMethod(n(rc?.avg_cost), l.method)
    // بند لا زمن له لا تُعرف تكلفته من البطاقة — يُحسب إيراده ويُترك ربحه مجهولاً
    const mult = l.method === 'hour' ? hpd * dpm : l.method === 'day' ? dpm : 1
    const revenue = n(l.unit_price) * mult * qty
    const cost = unitCost === null ? null : unitCost * mult * qty
    return { ...l, qty, unitCost, revenue, cost, profit: cost === null ? null : revenue - cost, known: cost !== null }
  })

  const revenue = lines.reduce((t, l) => t + l.revenue, 0)
  const known = lines.filter(l => l.known)
  const cost = known.reduce((t, l) => t + l.cost, 0)
  const unknownRevenue = lines.filter(l => !l.known).reduce((t, l) => t + l.revenue, 0)
  const profit = revenue - cost
  const margin = revenue ? profit / revenue : 0
  const partnerPct = n(opts.partnerPct ?? r.partner_share_pct)
  const partnerCut = profit > 0 ? profit * (partnerPct / 100) : 0
  return { lines, revenue, cost, profit, margin, unknownRevenue, partnerPct, partnerCut, netOwn: profit - partnerCut }
}
