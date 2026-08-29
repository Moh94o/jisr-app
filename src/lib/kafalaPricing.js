export const KAFALA_DEFAULTS={
  transferFee1:2000,transferFee2:4000,transferFee3:6000,
  transferBumpOccupations:['6d7ccefc-1647-4a36-9a80-ad1f9138db84','f3163bc5-a3e1-4e93-a620-7421db3abc68','8152564f-7a31-430c-9cb3-a76f5df77c04','0394376f-b7e0-455c-8466-0555d477cc42','ebd99f6b-ae4c-453c-9cf5-19099b7f35a3','a4cbe92d-69f8-4129-a876-0dc035fb9bf7','efd9f7af-7ac6-4f3e-9fda-efbc7d95ea61','5a20783b-8a28-4364-bbb8-85fbc71fc291','5ec4a1ba-64e9-4df7-badf-bf12eaf005ba','2feff711-f1d2-489c-870b-ab82b7de9cbd','0e6cd55b-1ced-4d88-ac37-ccfcafd244ec','01f7dcd3-1b72-4ade-bf21-95dc7f819463','09858dcd-0057-4857-a225-ce626313d457'],
  iqamaPerMonth:54.17,iqamaGovCover:650,iqamaFine1:500,iqamaFine2:1000,iqamaGraceDays:7,iqamaProcessingDays:7,iqamaExpiredThresholdDays:30,procDaysCase1:7,procDaysCase2:7,procDaysCase3:7,thresholdCase2:30,transferOnlyMinDays:30,
  workPermit3M:25,workPermit6M:50,workPermit9M:75,workPermit12M:100,
  // رخصة العمل بدون إعفاء — سعر ثابت لكل فترة يُستخدم عند اختيار «لا يوجد إعفاء» (يحل محل الحساب الاعتيادي)
  workPermitNoExempt3M:2425,workPermitNoExempt6M:4850,workPermitNoExempt9M:7275,workPermitNoExempt12M:9700,
  workPermitDailyAfter:22,workPermitCutoffDate:'2027-02-20',
  workPermitProcDays:7,workPermitExpiredThreshold:30,workPermitExpiredProcDays:7,
  // قاعدة خاصّة بتجديد الإقامة فقط: إذا انتهت الإقامة من مدة طويلة ← رخصة عمل كإصدار جديد (بلا شهور تأخّر)
  iqamaWpResetEnabled:false,iqamaWpResetAfterDays:365,iqamaWpIssuanceDays:5,
  // أساس احتساب رخصة العمل (سياسة الأدمن): 'iqama' انتهاء الإقامة · 'workcard' انتهاء كرت العمل
  iqamaWpBasis:'iqama',
  // سياسة «هل يوجد إعفاء؟» في حاسبة التجديد (سياسة الأدمن):
  //  'free' يختار المستخدم نعم/لا · 'exempt' دائماً بإعفاء (مقفل) · 'noexempt' دائماً بدون إعفاء (مقفل)
  iqamaExemptionMode:'free',
  // السماح بخصم المكتب عند تصديق التجديد (سياسة الأدمن)
  iqamaOfficeDiscountEnabled:true,
  // سقف خصم المكتب عند التصديق حسب مدة التجديد (سياسة الأدمن — الإدارة ← الخدمات ← تجديد الإقامة).
  // الحد الأعلى للخصم الذي يُدخله المُصدِّق لكل مدة (٣/٦/٩/١٢ شهرًا). لمدد غير معيارية يُحسب تناسبيًا من فئة ١٢.
  iqamaApprovalDiscountCap3M:25,iqamaApprovalDiscountCap6M:51,iqamaApprovalDiscountCap9M:76,iqamaApprovalDiscountCap12M:102,
  // سياسات نقل الكفالة (مطابقة للتجديد): أساس رخصة العمل · قاعدة المنتهية من مدة طويلة · وضع رسوم المكتب · الخصم
  kafalaWpBasis:'iqama',kafalaWpResetEnabled:false,kafalaWpResetAfterDays:365,kafalaWpIssuanceDays:5,kafalaOfficeFeeMode:'flat',kafalaOfficeDiscountEnabled:true,
  // أرضية الخصم الافتراضية (سياسة الأدمن): تُملأ في نافذة تصديق نقل الكفالة وتُفرض كحدّ أدنى لرسوم المكتب بعد الخصم.
  // 'none' بدون أرضية · 'fixed' مبلغ ثابت = kafalaFloorFixed · 'daily' سعر اليوم (officeDailyRate) × أيام التجديد.
  kafalaFloorMode:'daily',kafalaFloorFixed:0,
  // مدد التجديد المتاحة في الحاسبة لكل حالة إعفاء (زر المدة يُعطَّل إن لم تكن ضمن القائمة).
  kafalaPeriodsExempt:[3,6,9,12],kafalaPeriodsNoExempt:[3,6,9,12],
  // أرضية الخصم لحالة «بدون إعفاء» (0 = استخدم قيمة الإعفاء نفسها).
  kafalaFloorFixedNoExempt:0,kafalaFloorDailyNoExempt:0,
  profChange:1000,profChangeFreeOccupations:['2381e970-e939-4c6b-a7a9-8862f2133d41','1b4568be-0ea5-4079-bc90-ecca71d30adb'],officeFee:6500,officeFeeNoExempt:6500,officeDailyRate:18.06,
  // وضع حساب رسوم المكتب لتجديد الإقامة: 'flat' سعر ثابت · 'daily' سعر اليوم × أيام التجديد
  iqamaOfficeFeeMode:'flat',
  // ── نموذج تسعير تجديد الإقامة ──────────────────────────────────────────────
  // 'cover' القديم: الرسوم الحكومية مغطّاة بحدود ولا يدخل الإجمالي إلا الزائد عنها
  //         — فتعديل رسم تحت حدّه لا يغيّر الإجمالي إطلاقاً.
  // 'flat'  الجديد: كل الرسوم تدخل الإجمالي بقيمها الكاملة، و**رسوم المكتب متغيّر**
  //         يمتصّ التأمين وحده: رسوم المكتب = حصة المدة − التأمين (لا تنزل تحت صفر).
  //         فمجموع (المكتب + التأمين) لا يقلّ عن حصة المدة مهما تغيّرت شريحة العمر،
  //         بينما تغيّر تجديد الإقامة أو رخصة العمل يغيّر الإجمالي كما هو متوقَّع.
  iqamaPricingModel:'flat',
  // حصة المكتب والتأمين لكل مدة (ريال) — الحدّ الأدنى لمجموعهما في نموذج 'flat'.
  // تُشتقّ تلقائياً من «الإجمالي المستهدف باستثناء الغرامة» أدناه إن كان مضبوطاً (> 0)؛ وإلا تُستخدم كقيمة مباشرة (توافق قديم).
  iqamaOfficeShare3M:1412.5,iqamaOfficeShare6M:2825,iqamaOfficeShare9M:4237.5,iqamaOfficeShare12M:5650,
  // الإجمالي المستهدف باستثناء غرامة التأخير لكل مدة (الحالة القياسية: بإعفاء، بلا تغيير مهنة أو إضافات، بلا تأخير).
  // البرنامج يشتق منه رسوم المكتب تلقائياً: حصة المكتب = الإجمالي المستهدف − تجديد الإقامة القياسي − رخصة العمل (بإعفاء).
  iqamaExclFineTotal3M:5000,iqamaExclFineTotal6M:8500,iqamaExclFineTotal9M:12500,iqamaExclFineTotal12M:16000,
  medicalGraceMonths:2,medicalGraceDays:10,medGovCover:1000,
  medicalBrackets:[{min:20,max:30,rate:400},{min:30,max:40,rate:500},{min:40,max:50,rate:600},{min:50,max:60,rate:700},{min:60,max:70,rate:900}],
  // حاسبة تاريخ الانتهاء (مطابقة قوى) — أيام تُضاف لكل مدة + تعويض تأخير الإقامات المنتهية.
  expiryDays3:90,expiryDays6:178,expiryDays9:267,expiryDays12:355,
  overdueEnabled:true,overdueQuarterDays:90,
}

// ── Per-branch (office) pricing overrides ──
// تخصيص أسعار الخدمة لمكتب محدد يُحفظ في jisr_branch_overrides (يحرّره: الإدارة ← الخدمات ← تخصيص لمكتب).
// الشكل: { [branchId]: { [svcId]: { pricing:{...حقول جزئية} } } } — أي حقل غير مخصَّص يرجع للسعر العام.
const BRANCH_OVERRIDES_KEY='jisr_branch_overrides'
function branchPricingOverride(svcId,branchId){
  if(!branchId)return null
  try{const all=JSON.parse(localStorage.getItem(BRANCH_OVERRIDES_KEY)||'{}');const op=all?.[branchId]?.[svcId]?.pricing;return op&&typeof op==='object'?op:null}catch{return null}
}
// دمج القيم الخام + تخصيص المكتب فوق الافتراضي (medicalBrackets تُستبدل كاملةً إن خُصِّصت).
function mergeKafalaCfg(raw,op){
  const merged={...KAFALA_DEFAULTS,...raw,...(op||{})}
  merged.medicalBrackets=(op&&Array.isArray(op.medicalBrackets)&&op.medicalBrackets.length)?op.medicalBrackets
    :(Array.isArray(raw.medicalBrackets)&&raw.medicalBrackets.length?raw.medicalBrackets:KAFALA_DEFAULTS.medicalBrackets)
  return merged
}

export function getKafalaPricingConfig(branchId){
  try{const r=JSON.parse(localStorage.getItem('kafalaPricingConfig')||'{}');return mergeKafalaCfg(r,branchPricingOverride('kafala_transfer',branchId))}catch{return{...KAFALA_DEFAULTS}}
}

export function setKafalaPricingConfig(partial){
  const cur=getKafalaPricingConfig()
  const next={...cur,...partial}
  localStorage.setItem('kafalaPricingConfig',JSON.stringify(next))
}

// إعدادات تسعير «تجديد الإقامة» — مخزن مستقل (يحرّره: الإدارة ← الخدمات ← تجديد الإقامة) ومتزامن مع القاعدة.
// تجديد الإقامة يقرأ هذا بدل إعدادات نقل الكفالة (مطابق لما تفعله صفحة طلب الخدمة للفاتورة).
export function getIqamaRenewalPricingConfig(branchId){
  try{const r=JSON.parse(localStorage.getItem('iqamaRenewalPricingConfig')||'{}');return mergeKafalaCfg(r,branchPricingOverride('iqama_renewal',branchId))}catch{return{...KAFALA_DEFAULTS}}
}

// سقف خصم المكتب عند تصديق التجديد بحسب مدة التجديد (شهور) — يقرأه المُصدِّق من الإعدادات.
// ٣/٦/٩/١٢ شهرًا لها قيم مستقلة؛ لمدة أطول من ١٢ يُحسب تناسبيًا من فئة الـ١٢.
export function renewalApprovalDiscountCap(cfg,months){
  const c=cfg||KAFALA_DEFAULTS
  const m=Number(months)||0
  const n=(x,d)=>{const v=Number(x);return isFinite(v)&&v>=0?v:d}
  if(m<=0)return 0
  if(m<=3)return n(c.iqamaApprovalDiscountCap3M,25)
  if(m<=6)return n(c.iqamaApprovalDiscountCap6M,51)
  if(m<=9)return n(c.iqamaApprovalDiscountCap9M,76)
  if(m<=12)return n(c.iqamaApprovalDiscountCap12M,102)
  return Math.round(n(c.iqamaApprovalDiscountCap12M,102)/12*m)
}
