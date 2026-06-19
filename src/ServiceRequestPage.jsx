import React,{useState,useEffect,useCallback,useMemo,useRef} from 'react'
import {CalendarRange,CalendarClock,ArrowLeftRight,RefreshCw,Users,FileCheck,Ellipsis,ArrowRight,Plus,HeartPulse,UserCog,IdCard,Languages,Wallet,Printer,Plane,PlaneTakeoff,FileStack,Receipt,User,Phone,CreditCard,Briefcase,Building2,Calendar,ShieldCheck,Hash,AlertCircle,Globe,BadgeCheck,Circle,Upload,FileText,Paperclip,Copy,Check,MapPin,Sparkles,TrendingUp,Coins} from 'lucide-react'
import {isServiceActive,isServiceBillable,isServiceActiveFor,isServiceBillableFor,getPricingFor,getDocTypes,docTypeLabel} from './ServiceAdminPage.jsx'
import {TXN_SERVICES} from './pages/txnServices.js'
import {noDash} from './lib/utils.js'
import {Modal as FKModal, SuccessView, ActionButton as FKAction, ModalSection, Field as FKField, IdField as FKId, PhoneField as FKPhone, Select as FKSelect, Segmented as FKSegmented, Stepper as FKStepper, Checkbox as FKCheckbox, CurrencyField as FKCurrency, TextArea as FKTextArea, TextField as FKText, NumberField as FKNumber, DateField as FKDate, FileField as FKFile, Dropdown as FKDropdown, Lbl as FKLbl, GRID as FKGRID, sF as fkSF, validateSaudiId, validatePhone} from './components/ui/FormKit.jsx'
const F="'Cairo','Tajawal',sans-serif"
const C={gold:'#D4A017',red:'#c0392b',ok:'#27a046',blue:'#3483b4',bentoGold:'#D4A017'}
// Unified loading spinner — shown during any search/wait inside the invoice modal.
const Spinner=({size=26,label,style})=>(
<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,padding:'28px 20px',...style}}>
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="2.4" strokeLinecap="round" style={{animation:'srSpin .7s linear infinite'}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
{label&&<span style={{fontSize:11.5,fontWeight:600,color:'rgba(255,255,255,.55)',fontFamily:F}}>{label}</span>}
<style>{`@keyframes srSpin{to{transform:rotate(360deg)}}`}</style>
</div>
)
// Inline copy button — on click copies the value and flips to a green check (no toast).
const CopyBtn=({value,size=13})=>{
const[done,setDone]=useState(false)
if(!value)return null
return<button type="button" title={done?'تم النسخ':'نسخ'} onClick={e=>{e.stopPropagation();try{navigator.clipboard?.writeText(String(value))}catch(_){}setDone(true);setTimeout(()=>setDone(false),1300)}} style={{padding:3,background:'transparent',border:'none',cursor:'pointer',color:done?C.ok:'var(--tx5)',display:'flex',alignItems:'center',borderRadius:4,transition:'.15s',flexShrink:0}} onMouseEnter={e=>{if(!done)e.currentTarget.style.color=C.gold}} onMouseLeave={e=>{e.currentTarget.style.color=done?C.ok:'var(--tx5)'}}>{done?<Check size={size+2} strokeWidth={2.4}/>:<Copy size={size}/>}</button>
}
// Format Saudi phone: +966558908008 → 055 890 8008
const fmtPhone=(p)=>{if(!p)return'';let n=String(p).replace(/[^0-9+]/g,'');if(n.startsWith('+966'))n='0'+n.slice(4);else if(n.startsWith('966'))n='0'+n.slice(3);if(n.length===10)return`${n.slice(0,3)} ${n.slice(3,6)} ${n.slice(6)}`;return n}
// عدد الأشهر بصيغة عربية صحيحة: 1=شهر، 2=شهرين، 3–10=N أشهر، 11+=N شهراً
const fmtMonths=(n)=>{n=Number(n)||0;return n===1?'شهر':n===2?'شهرين':n<=10?`${n} أشهر`:`${n} شهراً`}
// كرت معلومات للقراءة فقط — أيقونة + عنوان صغير داخل الكرت فوق القيمة (+ زر نسخ اختياري)
const InfoCard=({Icon,lead,label,labelExtra,value,valueColor,ltr=false,muted=false,copy=null})=>(
<div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 11px',borderRadius:9,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',minHeight:40}}>
{lead||(Icon&&<Icon size={13} color={C.gold} strokeWidth={1.8} style={{flexShrink:0}}/>)}
<div style={{display:'flex',flexDirection:'column',gap:4,flex:1,minWidth:0}}>
<span style={{fontSize:10,color:'var(--tx5)',fontWeight:600,letterSpacing:'.2px',lineHeight:1.2,display:'flex',justifyContent:'space-between',alignItems:'center',gap:6}}><span>{label}</span>{labelExtra}</span>
<span style={{fontSize:13,fontWeight:600,color:valueColor||(muted?'var(--tx5)':'var(--tx)'),fontFamily:F,direction:ltr?'ltr':'rtl',textAlign:ltr?'right':'start',lineHeight:1.2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{value}</span>
</div>
{copy}
</div>
)
// Format date ISO → DD/MM/YYYY
const fmtDate=(d)=>{if(!d)return'—';const dt=new Date(d);if(isNaN(dt))return'—';return`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`}
// Flag emoji from country code (2 letters) or Arabic nationality name fallback
const NAT_MAP={'سعودي':'SA','سعودية':'SA','مصري':'EG','مصرية':'EG','هندي':'IN','هندية':'IN','باكستاني':'PK','باكستانية':'PK','بنجلاديشي':'BD','بنغلاديشي':'BD','فلبيني':'PH','فلبينية':'PH','يمني':'YE','يمنية':'YE','سوداني':'SD','سودانية':'SD','اندونيسي':'ID','إندونيسي':'ID','اثيوبي':'ET','إثيوبي':'ET','نيبالي':'NP','سريلانكي':'LK','كيني':'KE','أوغندي':'UG','اوغندي':'UG','سوري':'SY','أردني':'JO','اردني':'JO','لبناني':'LB','فلسطيني':'PS','مغربي':'MA','تونسي':'TN','جزائري':'DZ'}
const flagEmoji=(nat)=>{if(!nat)return'';let cc=nat.length===2?nat.toUpperCase():(NAT_MAP[nat.trim()]||'');if(cc.length!==2)return'';return String.fromCodePoint(...[...cc].map(c=>c.charCodeAt(0)+127397))}
// Flag image URL for a nationality. The `code` column is alpha-3/numeric (e.g. "SAU","340"), so prefer the
// stored flag_url; fall back to a 2-letter ISO code or the Arabic-name map, and null when nothing resolves.
const natFlagUrl=(nat)=>{if(!nat)return null;if(nat.flag_url)return nat.flag_url;const raw=(nat.code||nat.flag_emoji||'').toString().trim().toUpperCase();const iso=/^[A-Z]{2}$/.test(raw)?raw:NAT_MAP[(nat.nationality_ar||nat.name_ar||'').trim()];return iso?`https://flagcdn.com/w80/${iso.toLowerCase()}.png`:null}
// Extract latest nitaqat from facility.weekly_stats array
const latestStat=(stats)=>{if(!stats||!stats.length)return null;return[...stats].sort((a,b)=>new Date(b.week_date)-new Date(a.week_date))[0]}
// Check if date is expired/expiring
const dateStatus=(d)=>{if(!d)return'none';const dt=new Date(d),now=new Date(),days=Math.round((dt-now)/86400000);if(days<0)return'expired';if(days<30)return'soon';return'ok'}
// Visa-file grouping key: visas may share a file ONLY when nationality, embassy, gender AND profession all match.
// A file is fully homogeneous — two visas with any differing attribute can never sit in the same file.
const visaBucketKey=(g)=>`${g?.nationality||''}|${g?.embassy||''}|${g?.gender||''}|${g?.profession||''}`
// Validate that a file distribution is still consistent with the current groups:
// every file holds a single bucket (≤4 visas), and each group's assigned total matches its requested count.
// Used to detect stale assignments after a group's attributes change, so we can re-pack.
const visaFilesValid=(files,groups)=>{
const byId=Object.fromEntries((groups||[]).map(g=>[String(g.id),g]))
if(!files||!files.length)return (groups||[]).every(g=>(parseInt(g.count)||0)<=0)
const need={};for(const g of groups||[]){const c=parseInt(g.count)||0;if(c>0)need[String(g.id)]=c}
const have={}
for(const f of files){
const ks=new Set();let fc=0
for(const[gid,n]of Object.entries(f.assignments||{})){
const cnt=parseInt(n)||0;if(cnt<=0)continue
const g=byId[String(gid)];if(!g)return false
ks.add(visaBucketKey(g));fc+=cnt
have[String(gid)]=(have[String(gid)]||0)+cnt
}
if(ks.size>1||fc>4)return false // mixed bucket or over-capacity file
}
for(const k of new Set([...Object.keys(need),...Object.keys(have)])){if((need[k]||0)!==(have[k]||0))return false}
return true
}
// Pack visa groups into files of ≤4 visas, never mixing incompatible buckets (different nationality/embassy/gender/profession).
// Each bucket is packed independently, so a file always holds visas that share those four attributes.
const packVisaFiles=(groups)=>{
const buckets=[]
for(const g of groups||[]){
const cnt=parseInt(g.count)||0
if(cnt<=0)continue
const key=visaBucketKey(g)
let b=buckets.find(x=>x.key===key)
if(!b){b={key,items:[]};buckets.push(b)}
b.items.push({id:g.id,rem:cnt})
}
const files=[];let fid=1
for(const b of buckets){
let total=b.items.reduce((s,it)=>s+it.rem,0)
while(total>0){
const take=Math.min(4,total);total-=take
const a={};let need=take
while(need>0){const it=b.items.find(x=>x.rem>0);if(!it)break;const t=Math.min(it.rem,need);a[it.id]=(a[it.id]||0)+t;it.rem-=t;need-=t}
files.push({id:fid++,assignments:a})
}
}
return files
}

// ═══════ Service Types (Bento Grid) ═══════
const MAIN_SERVICES=[
{id:'work_visa_permanent',name_ar:'تأشيرة وإقامة دائمة',Icon:CalendarRange,featured:true,billable:true},
{id:'work_visa_temporary',name_ar:'تأشيرة وإقامة مؤقتة',Icon:CalendarClock,billable:true},
{id:'kafala_transfer',name_ar:'نقل كفالة',Icon:ArrowLeftRight,billable:true},
{id:'iqama_renewal',name_ar:'تجديد الإقامة',Icon:RefreshCw,billable:true},
{id:'ajeer_contract',name_ar:'عقد أجير',Icon:Users,billable:true},
{id:'chamber_certification',name_ar:'الغرفة التجارية',Icon:FileCheck,billable:true}
]
const OTHER_SERVICES=[
{id:'medical_insurance',name_ar:'تأمين طبي',Icon:HeartPulse,billable:true},
{id:'profession_change',name_ar:'تغيير المهنة',Icon:UserCog,billable:true},
{id:'external_transfer_approval',name_ar:'الموافقة للنقل الخارجي',Icon:BadgeCheck,billable:false},
{id:'name_translation',name_ar:'تعديل الراتب',Icon:Wallet,billable:false},
{id:'exit_reentry_visa',name_ar:'إصدار / تمديد تأشيرة خروج وعودة',Icon:Plane,billable:true},
{id:'final_exit_visa',name_ar:'خروج نهائي',Icon:PlaneTakeoff,billable:true},
{id:'passport_update',name_ar:'تحديث بيانات الجواز',Icon:IdCard,billable:true},
{id:'iqama_print',name_ar:'طباعة الإقامة',Icon:Printer,billable:true},
{id:'documents',name_ar:'مستندات',Icon:FileStack,billable:true},
{id:'supplier_payroll',name_ar:'طلب رواتب سبلاير',Icon:Coins,billable:false},
{id:'custom',name_ar:'خدمة عامة',Icon:Sparkles,billable:true}
]
const ALL_SERVICES=[...MAIN_SERVICES,...OTHER_SERVICES]

// ═══════ Visa services (custom inputs) ═══════
const VISA_SERVICES=new Set(['work_visa_permanent','work_visa_temporary'])

// ═══════ Client step applies ONLY to these services ═══════
// Every other service skips the client step and opens step 2 directly on worker selection —
// for them the client IS the worker, so there is no separate client party to pick.
const CLIENT_SERVICES=new Set(['work_visa_permanent','work_visa_temporary','kafala_transfer','custom'])

// ═══════ Occupations (used by kafala_transfer.new_occupation) ═══════
const KAFALA_OCCUPATIONS=['عامل بناء','نجار','حداد','كهربائي','سباك','دهان','مشغل معدات','سائق','مقاول','فني تكييف','حارس أمن','عامل نظافة','بائع','موظف إداري','أخرى']

// ═══════ Gregorian → Hijri helper (uses browser Intl API, Umm al-Qura calendar) ═══════
const toHijri=(dateStr)=>{
  if(!dateStr)return''
  try{
    const d=new Date(dateStr)
    if(isNaN(d))return''
    const fmt=new Intl.DateTimeFormat('en-SA-u-ca-islamic-umalqura',{day:'numeric',month:'numeric',year:'numeric'})
    const parts=fmt.formatToParts(d)
    const dd=parts.find(p=>p.type==='day')?.value||''
    const mm=parts.find(p=>p.type==='month')?.value||''
    const yy=parts.find(p=>p.type==='year')?.value||''
    return `${yy}/${mm}/${dd}`
  }catch{return''}
}

// ═══════ Service-specific inputs (fallback when DB has none) ═══════
// Each service defines its own appropriate fields
const SERVICE_INPUTS={
  iqama_renewal:[
    {key:'renewal_months',label_ar:'عدد أشهر التجديد',type:'number',required:true,placeholder:'عدد الأشهر'},
    {key:'change_profession',label_ar:'تغيير المهنة',type:'toggle',required:true},
    {key:'new_occupation',label_ar:'المهنة الجديدة',type:'select',show_if:'change_profession',source:'occupations'}
  ],
  ajeer_contract:[
    {key:'borrower_700',label_ar:'الرقم الموحد للمنشأة المستعارة',type:'text',required:true,placeholder:'7XX XXX XXXX',direction:'ltr'},
    // Region was dropped because city already implies its region — see the rendered
    // UI in `bيانات عقد أجير` fieldset; cities are shown unfiltered.
    {key:'city',label_ar:'المدينة',type:'select',required:true,source:'cities'},
    // 1-24 month dropdown; matches the Ajeer contract's allowed contract length.
    {key:'contract_months',label_ar:'مدة العقد',type:'select',required:true,options:Array.from({length:24},(_,i)=>({value:String(i+1),label:fmtMonths(i+1)})),grid_col:'1'}
  ],
  exit_reentry_visa:[
    {key:'exit_type',label_ar:'نوع التأشيرة',type:'select',required:true,
      options:[{value:'single',label:'مفردة'},{value:'multiple',label:'متعددة'}]},
    // Dropdown 1-12 — exit/reentry visas are issued in whole-month increments.
    {key:'duration_months',label_ar:'المدة',type:'select',required:true,options:Array.from({length:24},(_,i)=>({value:String(i+1),label:fmtMonths(i+1)}))}
  ],
  final_exit_visa:[
    {key:'reason',label_ar:'السبب',type:'textarea',placeholder:'اكتب سبب طلب تأشيرة الخروج النهائي...'}
  ],
  profession_change:[
    {key:'new_occupation',label_ar:'المهنة الجديدة',type:'select',required:true,source:'occupations'}
  ],
  passport_update:[],
  external_transfer_approval:[
    {key:'reason',label_ar:'السبب',type:'textarea',placeholder:'اكتب سبب طلب الموافقة على النقل الخارجي...'}
  ],
  name_translation:[
    {key:'new_salary',label_ar:'الراتب الجديد',type:'number',required:true,placeholder:'0'},
    // Switched from weeks to months at the user's request — easier to pick + matches HR norms.
    {key:'salary_months',label_ar:'مدة الراتب',type:'select',required:true,options:Array.from({length:24},(_,i)=>({value:String(i+1),label:fmtMonths(i+1)}))}
  ],
  custom:[
    {key:'custom_note',label_ar:'وصف الخدمة',type:'textarea',required:true,placeholder:'اكتب تفاصيل الخدمة المطلوبة...'}
  ],
  // طلب رواتب سبلاير — العامل مُختار مسبقاً في الخطوة السابقة، فلا حاجة لتكرار اسمه. تُرسم الحقول الثلاثة
  // بمكوّنات FormKit داخل إطار (فرع supplier_payroll في الخطوة 3): جوال العامل للتواصل، عدد أشهر الرواتب
  // غير المدفوعة (قائمة منسدلة)، والمبلغ الإجمالي لهذه الرواتب. هذه القائمة تخدم التحقق فقط (نفس المفاتيح).
  supplier_payroll:[
    {key:'worker_phone',label_ar:'رقم جوال العامل',type:'text',required:true},
    {key:'unpaid_salaries_count',label_ar:'عدد أشهر الرواتب غير المدفوعة',type:'select',required:true},
    {key:'total_amount',label_ar:'المبلغ الإجمالي',type:'number',required:true}
  ],
  iqama_print:[
    {key:'print_reason',label_ar:'السبب',type:'textarea',required:true,placeholder:'اكتب سبب طلب طباعة الإقامة...'}
  ],
  medical_insurance:[],
  documents:[
    {key:'doc_type',label_ar:'نوع المستند',type:'select',required:true,
      options:[{value:'commercial_register',label:'السجل التجاري'},{value:'resident_file',label:'ملف مقيم'}]},
    {key:'doc_lang',label_ar:'لغة المستند',type:'select',required:true,
      options:[{value:'ar',label:'عربي'},{value:'en',label:'إنجليزي'}]}
  ],
  kafala_transfer:[
    // ═══ Section 1: بيانات العامل ═══
    {key:'nationality',label_ar:'الجنسية',type:'select',required:true,section:1,source:'countries'},
    {key:'birth_date',label_ar:'تاريخ الميلاد',type:'date_hijri',required:true,section:1},
    {key:'worker_status',label_ar:'حالة العامل',type:'select',required:true,section:1,
      options:[{value:'valid',label:'صالح'},{value:'huroob',label:'هروب'},{value:'final_exit',label:'خروج نهائي'},{value:'absent',label:'منقطع عن العمل'}]},
    {key:'current_profession',label_ar:'المهنة الحالية',type:'select',required:true,section:1,source:'occupations'},
    {key:'iqama_expiry',label_ar:'تاريخ انتهاء الإقامة',type:'date_hijri',required:true,section:1,prefill_from:'iqama_expiry_date',hijri:true},
    {key:'work_card_expiry',label_ar:'تاريخ نهاية كرت العمل',type:'date_hijri',required:true,section:1,hijri:true},
    // ═══ Section 2: تفاصيل النقل ═══
    {key:'has_notice_period',label_ar:'فترة إشعار',type:'toggle',required:true,section:2},
    {key:'employer_consent',label_ar:'موافقة صاحب العمل',type:'toggle',required:true,section:2},
    {key:'change_profession',label_ar:'تغيير المهنة',type:'toggle',required:true,section:2},
    {key:'new_occupation',label_ar:'المهنة الجديدة',type:'select',show_if:'change_profession',section:2,
      options:KAFALA_OCCUPATIONS.map(o=>({value:o,label:o}))},
    {key:'renew_iqama',label_ar:'تجديد الإقامة',type:'toggle',required:true,grid_col:'1',section:2},
    {key:'expected_iqama_months',label_ar:'أشهر الإقامة المتوقعة بعد التجديد',type:'number',show_if:'renew_iqama',section:2,placeholder:'عدد الأشهر'},
    {key:'renewal_months',label_ar:'مدة التجديد (أشهر)',type:'number',show_if:'renew_iqama',section:2,placeholder:'عدد الأشهر'},
  ]
}
// Registry-driven tabs supply their own step-3 inputs; the wizard id == the service_type code,
// so the detail page can read them straight back from other_applications.details.
Object.entries(TXN_SERVICES).forEach(([code,cfg])=>{if(cfg.inputs)SERVICE_INPUTS[code]=cfg.inputs})

// Field + label styles — mirror FormKit's canonical sF/Lbl so raw inputs in this page match معرض الفورمات
const fS={...fkSF}
const lblS={fontSize:14,fontWeight:600,color:'rgba(255,255,255,.92)',marginBottom:9,display:'block',textAlign:'start'}
const goldBtn={height:48,padding:'0 24px',borderRadius:11,border:'1px solid rgba(212,160,23,.45)',background:'linear-gradient(180deg,rgba(212,160,23,.22) 0%,rgba(212,160,23,.10) 100%)',color:C.gold,fontFamily:F,fontSize:14,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8,boxShadow:'0 4px 14px rgba(212,160,23,.25), inset 0 1px 0 rgba(212,160,23,.2)',transition:'.2s'}
const ghostBtn={height:48,padding:'0 24px',borderRadius:11,background:'linear-gradient(180deg,#323232 0%,#262626 100%)',border:'1px solid rgba(255,255,255,.07)',color:'var(--tx3)',fontFamily:F,fontSize:14,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8,boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'}

const STEPS=[{ar:'الخدمة',icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'},{ar:'العميل',icon:'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'},{ar:'التفاصيل',icon:'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'},{ar:'الفاتورة',icon:'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'},{ar:'الدفع',icon:'M3 10h18M7 15h2m4 0h2m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'},{ar:'الملخص',icon:'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'}]

// ═══════ Date picker — thin wrapper over the canonical FormKit DateField (input + calendar popup) ═══════
// Kept under the old name so every call site stays untouched; width is honored via the container.
function CompactDatePicker({value,onChange,width=150}){
  return <div style={{width,minWidth:0}}><FKDate value={value||''} onChange={onChange}/></div>
}
// Local DateField alias (same FormKit widget) — replaces the old KafalaCalculator import.
function DateField({value,onChange}){
  return <FKDate value={value||''} onChange={onChange}/>
}


// ═══════ Dropdown — thin wrapper over the canonical FormKit Dropdown (portal + search + check mark) ═══════
// Same prop shape as the old NiceSelect ({value,label} options) so every call site stays untouched.
// compact/height/fontSize are accepted but ignored: FormKit fields are uniformly 42px by design.
function NiceSelect({value,onChange,options,placeholder='اختر...',disabled=false,searchable=true}){
  return <FKDropdown value={value} onChange={onChange} options={options} placeholder={placeholder}
    getKey={o=>o.value} getLabel={o=>String(o.label??'')} searchable={searchable} disabled={disabled}/>
}
// KafalaSel replacement — old import from KafalaCalculator used {v,l} option shape.
function KafalaSel({value,onChange,options,placeholder='اختر...',disabled=false}){
  return <FKDropdown value={value} onChange={onChange} options={options} placeholder={placeholder}
    getKey={o=>o.v} getLabel={o=>String(o.l??'')} searchable={false} disabled={disabled}/>
}

export default function ServiceRequestPage({sb,toast,user,lang,branchId,onClose,preselectedService}){
const isAr=lang!=='en';const T=(a,e)=>isAr?a:e
const[step,setStep]=useState(preselectedService?2:1)
const[services,setServices]=useState([])
const[regions,setRegions]=useState([])
const[cities,setCities]=useState([])
const[selCat,setSelCat]=useState('')
const[selSvc,setSelSvc]=useState(preselectedService||null)
const[showOthers,setShowOthers]=useState(false)
const[customName,setCustomName]=useState('')
const[clientMode,setClientMode]=useState('existing')
const[clientQ,setClientQ]=useState('')
const[selClient,setSelClient]=useState(null)
const[newClient,setNewClient]=useState({name_ar:'',name_en:'',phone:'',id_number:'',nationality_id:''})
const[natOpenClient,setNatOpenClient]=useState(false)
const[natSearchClient,setNatSearchClient]=useState('')
const natTriggerRef=useRef(null)
const[natPos,setNatPos]=useState({top:0,left:0,width:0})
const openNatDropdown=()=>{if(natTriggerRef.current){const r=natTriggerRef.current.getBoundingClientRect();setNatPos({top:r.bottom+4,left:r.left,width:r.width})}setNatOpenClient(v=>!v)}
const[clients,setClients]=useState([])
const[workerIsClient,setWorkerIsClient]=useState(false)// default: unchecked
const[step2Mode,setStep2Mode]=useState(preselectedService&&!CLIENT_SERVICES.has(preselectedService)?'worker':'client')// 'client' | 'worker'
const[workerQ,setWorkerQ]=useState('')
const[selWorker,setSelWorker]=useState(null)
const[workers,setWorkers]=useState([])
const[workerMode,setWorkerMode]=useState('existing')// 'existing' | 'new'
const[newWorker,setNewWorker]=useState({name:'',phone:'',iqama_number:''})
const[workerFacilityStat,setWorkerFacilityStat]=useState(null)// latest nitaqat/wps data for selected worker's facility
const[copiedQiwa,setCopiedQiwa]=useState(false)
const[copiedUnified,setCopiedUnified]=useState(false)

// Step 4: Invoice
const[paymentType,setPaymentType]=useState('full')// 'full' | 'installments'
const[installmentsCount,setInstallmentsCount]=useState(2)
const[firstInstallmentDate,setFirstInstallmentDate]=useState('')
const[hasBroker,setHasBroker]=useState(false)
const[brokerMode,setBrokerMode]=useState('existing')// 'existing' | 'new'
const[brokerQ,setBrokerQ]=useState('')
const[selBroker,setSelBroker]=useState(null)
const[newBroker,setNewBroker]=useState({name_ar:'',name_en:'',phone:'',id_number:'',nationality_id:''})
const[brokers,setBrokers]=useState([])
const[natOpenBroker,setNatOpenBroker]=useState(false)
const[natSearchBroker,setNatSearchBroker]=useState('')
const natTriggerBrokerRef=useRef(null)
const[natPosBroker,setNatPosBroker]=useState({top:0,left:0,width:0})
const openNatBrokerDropdown=()=>{if(natTriggerBrokerRef.current){const r=natTriggerBrokerRef.current.getBoundingClientRect();setNatPosBroker({top:r.bottom+4,left:r.left,width:r.width})}setNatOpenBroker(v=>!v)}

// Step 5: Payment + Notes
const[paidAmount,setPaidAmount]=useState('')
// Payment method: 'cash' or 'bank' (bank = حوالة بنكية with optional receipt attachment)
const[paymentMethod,setPaymentMethod]=useState('cash')
const[transferReceipt,setTransferReceipt]=useState(null)
const[receiptDrag,setReceiptDrag]=useState(false)
const[transferReference,setTransferReference]=useState('')
const[bankAccounts,setBankAccounts]=useState([])
const[selBankAcc,setSelBankAcc]=useState('')
const[bankAccOpen,setBankAccOpen]=useState(false)
const bankAccTriggerRef=useRef(null)
const[bankAccPos,setBankAccPos]=useState({top:0,left:0,width:0})
const openBankAccDropdown=()=>{if(bankAccTriggerRef.current){const r=bankAccTriggerRef.current.getBoundingClientRect();setBankAccPos({top:r.bottom+4,left:r.left,width:r.width})}setBankAccOpen(v=>!v)}
// Visa services: installment plan overrides (empty = use default 1/3 split)
const[visaInstallments,setVisaInstallments]=useState({issuance:'',authorization:'',residencePerVisa:''})
// Visa services: total price override (null = use computed pricing.total)
const[totalOverride,setTotalOverride]=useState(null)
// Read per-installment + total minimum pricing config — branch-aware via getPricingFor (falls back to global defaults).
// Returns per-visa minimums; callers multiply by visa count for absolute thresholds.
const getVisaMinConfig=(svc)=>{
const branchForPricing=user?.primary_branch_id||branchId||null
const p=getPricingFor(svc,branchForPricing)||{}
return{
  issuance:Number(p.issuance)||0,
  authorization:Number(p.authorization)||0,
  residence:Number(p.residence)||0,
  defaultTotal:Number(p.defaultTotal)||0,
}
}
const[addAdminNote,setAddAdminNote]=useState(false)
const[addClientNote,setAddClientNote]=useState(false)
const[showSummaryScreen,setShowSummaryScreen]=useState(false)
const[showBrokerNoteScreen,setShowBrokerNoteScreen]=useState(false)
const[brokerOpen,setBrokerOpen]=useState(false)// broker fieldset collapsed by default — user opens via icon
const[fields,setFields]=useState({})
// Kafala-transfer-specific pricing inputs (only used when selSvc==='kafala_transfer')
// Empty = use auto-calculated value from settings; user override takes precedence
const[kafalaPricing,setKafalaPricing]=useState({
  transferFeeInput:'',iqamaRenewalFee:'',
  profChangeInput:'',workPermitRate:'',medicalFee:'',officeFee:'',
  absherBalance:'',discount:'',
  extras:[]
})
const[kafalaExtraName,setKafalaExtraName]=useState('')
const[kafalaExtraAmount,setKafalaExtraAmount]=useState('')
// Iqama-renewal-specific pricing (mirrors kafala, minus transfer fee)
const[iqamaPricing,setIqamaPricing]=useState({
  iqamaRenewalFee:'',profChangeInput:'',workPermitRate:'',medicalFee:'',officeFee:'',
  absherBalance:'',discount:'',extras:[]
})
const[iqamaExtraName,setIqamaExtraName]=useState('')
const[iqamaExtraAmount,setIqamaExtraAmount]=useState('')
// Kafala payment plan: 'single' = one payment | 'split' = multiple installments
const[kafalaPayMode,setKafalaPayMode]=useState('single')
const[kafalaInstallments,setKafalaInstallments]=useState([{amount:'',date:''}])
// Kafala sub-step: after step 4 (pricing) → show payment-plan screen before moving to step 5
const[kafalaPayStep,setKafalaPayStep]=useState(false)
const[visaGroups,setVisaGroups]=useState([{id:1,nationality:'',embassy:'',profession:'',gender:'male',count:'1'}])
const[expandedGroups,setExpandedGroups]=useState(new Set([1]))
const[step3Mode,setStep3Mode]=useState('groups')// 'groups' | 'files' (visa services only)
const[kafalaPage,setKafalaPage]=useState(1)// 1=worker data, 2=transfer details
// Kafala transfer quote search (replaces step 3 fields for kafala_transfer)
const[kafalaQuoteQ,setKafalaQuoteQ]=useState('')
const[kafalaQuotes,setKafalaQuotes]=useState([])
const[selKafalaQuote,setSelKafalaQuote]=useState(null)
const[loadingKafalaQuotes,setLoadingKafalaQuotes]=useState(false)
// Kafala party step (inverted): worker comes from the quote, so we ask whether the client is the same person.
// null = not answered yet · true = client is the worker (auto-link/create) · false = a different client
const[kafalaSameClient,setKafalaSameClient]=useState(null)
const[kafalaClientLoading,setKafalaClientLoading]=useState(false)// resolving the worker→client link after choosing «same worker»
const[passportPage,setPassportPage]=useState(1)// 1=facility+current+type, 2=new passport fields
const prefilledRef=useRef(new Set())// tracks which fields have already been auto-prefilled
const[visaDistMode,setVisaDistMode]=useState('auto')// 'auto' (4 per file) | 'custom' (open files sub-step)
const[visaFiles,setVisaFiles]=useState([])// [{id,count}, ...] — global file distribution across total visas
const[forceCustomFiles,setForceCustomFiles]=useState(false)// explicit custom mode toggle
const[dragInfo,setDragInfo]=useState(null)// {fileId, groupId} — drag state for moving visas between files
const[lkCountries,setLkCountries]=useState([])
const[lkEmbassies,setLkEmbassies]=useState([])
const[lkOccupations,setLkOccupations]=useState([])
const[lkGenders,setLkGenders]=useState([])
const[clientNote,setClientNote]=useState('')
const[internalNote,setInternalNote]=useState('')
const[saving,setSaving]=useState(false)
// After a successful issue, the modal transforms into a success screen (mirrors the transfer-quote flow)
// instead of toasting and closing — shows a check, "تم إصدار الفاتورة" and the invoice number.
const[issuedInvoice,setIssuedInvoice]=useState(null)
const[err,realSetErr]=useState('')
// `setErr` normally drives the error banner. getStepError() (used to enable/disable «التالي») needs to
// run the full canNext() logic during render to know if the step is complete — but canNext() calls
// setErr, and setState-during-render is illegal. So when errCaptureRef is active we divert setErr into
// the capture box instead of touching state, making canNext() a pure predicate in that window.
const errCaptureRef=useRef(null)
const setErr=(v)=>{if(errCaptureRef.current)errCaptureRef.current.v=v;else realSetErr(v)}
const[loading,setLoading]=useState(true)

// Load data — adapted to the new schema (clients/workers/agents/lookup_items/nationalities/embassies)
useEffect(()=>{if(!sb)return;(async()=>{
const[r,c,w,b,ci,ba]=await Promise.all([
sb.from('regions').select('id,name_ar').order('name_ar'),
sb.from('clients').select('id,name_ar,name_en,phone,id_number,nationality_id').is('deleted_at',null).order('name_ar').limit(500),
// Worker query with current_facility / current_occupation / nationality joins (new schema)
sb.from('workers').select('id,name_ar,name_en,phone,iqama_number,iqama_expiry_date,occupation_ar,nationality_ar,birth_date,nationality:nationality_id(id,name_ar,code:code,flag_url),current_occupation:current_occupation_id(name_ar),current_facility:current_facility_id(id,name_ar,unified_number,gosi_number,hrsd_number)').is('deleted_at',null).order('name_ar').limit(50),
sb.from('agents').select('id,name_ar,name_en,phone,id_number,nationality_id').is('deleted_at',null).order('name_ar').limit(50),
sb.from('cities').select('id,name_ar,region_id').order('name_ar'),
// Receiving-transfer accounts — junction rows where the bank account is designated
// for incoming transfers ("التحويلات الواردة"). Scoped to this invoice's branch when set.
(()=>{let q=sb.from('bank_account_branches')
  .select('id,branch_id,account_purpose,bank_accounts!inner(id,bank_name,account_name,account_number,iban,is_primary,deleted_at)')
  .is('deleted_at',null).eq('is_active',true)
  .eq('account_purpose','التحويلات الواردة')
  .is('bank_accounts.deleted_at',null);
  if(branchId)q=q.eq('branch_id',branchId);
  return q})(),
])
// Build a synthetic services array from MAIN+OTHER_SERVICES so downstream code keeps working.
const svcs=ALL_SERVICES.map((s,i)=>({id:s.id,name_ar:s.name_ar,category:MAIN_SERVICES.includes(s)?'main':'other',default_price:0,gov_fee:0,pricing_rules:{},inputs:[],sort_order:i,is_active:true,show_in_request_popup:true}))
setServices(svcs)
setRegions(r.data||[])
setClients(c.data||[])
// Reshape workers to match the legacy `country` / `occupation` / `facility` field names downstream code expects.
const wRows=(w.data||[]).map(x=>({
id:x.id,name:x.name_ar||x.name_en,name_ar:x.name_ar,name_en:x.name_en,phone:x.phone,iqama_number:x.iqama_number,
iqama_expiry_date:x.iqama_expiry_date||null,birth_date:x.birth_date,passport_number:null,passport_expiry:null,
nationality_id:x.nationality?.id||null,
nationality:x.nationality?.name_ar||x.nationality_ar||null,
country:x.nationality?{nationality_ar:x.nationality.name_ar,flag_emoji:null,code:x.nationality.code||null,flag_url:x.nationality.flag_url||null}:(x.nationality_ar?{nationality_ar:x.nationality_ar,flag_emoji:null,code:null,flag_url:null}:null),
occupation:x.current_occupation?{value_ar:x.current_occupation.name_ar}:(x.occupation_ar?{value_ar:x.occupation_ar}:null),
facility:x.current_facility?{id:x.current_facility.id,name_ar:x.current_facility.name_ar,unified_national_number:x.current_facility.unified_number,hrsd_number:x.current_facility.hrsd_number||null,gosi_file_number:x.current_facility.gosi_number||null}:null,
work_permits:null,worker_insurance:null,
}))
setWorkers(wRows)
setBrokers(b?.data||[])
setCities(ci?.data||[])
// Flatten the junction: one row per (account, branch). The same bank account can
// appear multiple times if it's the receiving account for several branches, but
// when branchId is set above we've already narrowed to a single branch.
setBankAccounts((ba?.data||[]).map(j=>({...(j.bank_accounts||{}),_junction_id:j.id,branch_id:j.branch_id,account_purpose:j.account_purpose})))
setSelCat('main')
// Visa lookups: occupations from `occupations` table, gender hardcoded (no lookup category for it).
const[occRes,natRes,emRes]=await Promise.all([
sb.from('occupations').select('id,name_ar,code').is('is_active',true).order('name_ar').limit(2000),
sb.from('nationalities').select('id,name_ar,code,country_name_ar,flag_url').is('is_active',true).order('name_ar'),
sb.from('embassies').select('id,name_ar,name_en,nationality_id').is('is_active',true).order('name_ar'),
])
setLkOccupations((occRes.data||[]).map(o=>({id:o.id,value_ar:o.name_ar,code:o.code,sort_order:0})))
setLkGenders([{id:'male',value_ar:'ذكر',code:'male',sort_order:1},{id:'female',value_ar:'أنثى',code:'female',sort_order:2}])
// Reshape nationalities to match legacy countries shape (nationality_ar)
if(natRes.data){
const GCC=new Set(['SA','AE','KW','QA','BH','OM'])
const seen=new Set(),uniq=[]
for(const c of natRes.data){const code=(c.code||'').toUpperCase();const nat=c.name_ar;if(nat&&!seen.has(nat)&&!GCC.has(code)){seen.add(nat);uniq.push({id:c.id,name_ar:c.country_name_ar||c.name_ar,nationality_ar:c.name_ar,code:c.code,flag_emoji:null,flag_url:c.flag_url||null})}}
setLkCountries(uniq)
// Backfill worker country/flag info when the FK join was empty but a denormalized
// nationality_ar is present (e.g. workers synced from GOSI keep only the name).
// GOSI spellings vary (نيبالي vs نيبال, بنغلادش vs بنغلاديش) so normalize before
// matching: strip ال prefix, drop ي everywhere, drop trailing ة/ه/ى. This collapses
// nationality/country/transliteration variants to a single key.
const normNat=s=>(s||'').trim().replace(/^ال/,'').replace(/ي/g,'').replace(/[ةىه]$/,'')
const natByName={}
for(const c of natRes.data){const data={code:c.code||null,flag_url:c.flag_url||null,nat:c.name_ar};for(const v of [c.name_ar,c.country_name_ar]){if(!v)continue;natByName[v.trim()]=data;const n=normNat(v);if(n)natByName[n]=data}}
setWorkers(prev=>prev.map(w=>{
if(w.country&&w.country.flag_url)return w
const raw=(w.country?.nationality_ar||w.nationality||'').trim()
if(!raw)return w
const hit=natByName[raw]||natByName[normNat(raw)]
if(!hit)return w
return{...w,country:{nationality_ar:hit.nat||raw,flag_emoji:null,code:hit.code,flag_url:hit.flag_url}}
}))
}
// Reshape embassies (country_id mirrors nationality_id for filtering)
setLkEmbassies((emRes.data||[]).map((e,i)=>({id:e.id,country_id:e.nationality_id||null,nationality_id:e.nationality_id||null,city_ar:e.name_ar,name_en:e.name_en||null,type:'embassy',sort_order:i})))
setLoading(false)
})()},[sb])

const categories=useMemo(()=>[...new Set(services.map(s=>s.category))],[services])
const filteredSvcs=useMemo(()=>services.filter(s=>s.category===selCat),[services,selCat])
const selectedService=useMemo(()=>{
if(!selSvc)return null
const sv=ALL_SERVICES.find(s=>s.id===selSvc)
if(!sv)return services.find(s=>s.id===selSvc)||null
const db=services.find(s=>s.name_ar===sv.name_ar)
const displayName=sv.id==='custom'?(customName.trim()||'خدمة عامة'):sv.name_ar
return{id:db?.id||sv.id,service_type:sv.id,name_ar:displayName,
category:db?.category||'general',default_price:db?.default_price||0,
gov_fee:db?.gov_fee||0,pricing_rules:db?.pricing_rules||{},inputs:db?.inputs||[]}
},[selSvc,services,customName])

// Resolved inputs for current service (DB first, then SERVICE_INPUTS fallback)
const svcInputs=useMemo(()=>(selectedService?.inputs?.length?selectedService.inputs:SERVICE_INPUTS[selSvc])||[],[selectedService,selSvc])
// If service has exactly one simple field and isn't a visa service, merge it into Step 2 (worker view)
// Worker-only services (no client step) always get a dedicated details step so the "رقم جوال العامل"
// field has somewhere to live — never merge their single field into the worker step.
const svcSingleField=useMemo(()=>(selSvc&&!CLIENT_SERVICES.has(selSvc))?null:((!VISA_SERVICES.has(selSvc)&&selSvc!=='iqama_renewal'&&selSvc!=='profession_change'&&selSvc!=='final_exit_visa'&&selSvc!=='exit_reentry_visa'&&selSvc!=='custom'&&selSvc!=='iqama_print'&&svcInputs.length===1)?svcInputs[0]:null),[selSvc,svcInputs])
const hasMergedField=!!svcSingleField
// The note sub-step now appears for every service (a dedicated step before the summary).
// The broker (الوسيط) field inside it is only relevant for permanent work visa and kafala transfer.
const showBroker=selSvc==='work_visa_permanent'||selSvc==='kafala_transfer'
const hasBrokerStep=!!selSvc
// Services with no client party — step 2 opens directly on worker selection. The client is the
// worker themselves, so only the four CLIENT_SERVICES keep the dedicated client step.
const skipClientStep=!!selSvc&&!CLIENT_SERVICES.has(selSvc)
// Free services skip invoice + payment (steps 4 & 5)
const isFreeSvc=!!selSvc&&!isServiceBillable(selSvc)
// All STEPS + الوسيط (if applicable) - merged field - (free svc skips 2 steps)
const totalSteps=STEPS.length+(hasBrokerStep?1:0)-(hasMergedField?1:0)-(isFreeSvc?2:0)
const displayStep=(()=>{
let d=hasMergedField&&step>=4?step-1:(hasMergedField&&step===3?2:step)
// Note sub-screen sits right before the summary (always the second-to-last step)
if(step===5&&showBrokerNoteScreen)d=totalSteps-1
// Summary is the last step (7 with broker, 6 without; minus 1 if merged field)
if(step===5&&showSummaryScreen)d=totalSteps
return d
})()

// Client search (name AR / EN, phone, ID)
const filteredClients=useMemo(()=>{
if(!clientQ.trim())return clients.slice(0,2)
const q=clientQ.trim().toLowerCase()
return clients.filter(c=>(c.name_ar||'').toLowerCase().includes(q)||(c.name_en||'').toLowerCase().includes(q)||(c.phone||'').includes(q)||(c.id_number||'').includes(q)).slice(0,2)
},[clients,clientQ])

// Facility weekly stats are not in the new schema yet — keep null so dependent UI gracefully renders empty
useEffect(()=>{setWorkerFacilityStat(null)},[selWorker])

// عميل جديد + «العامل هو نفسه العميل»: لا يُنشأ عامل جديد — يُبحث عن عامل مسجّل بنفس رقم الهوية/الإقامة
// فيُربط تلقائياً (أو يبقى فارغاً فيظهر تنبيه «لا يوجد عامل بهذه البيانات»). يبقى selWorker متزامناً مع الرقم المُدخل.
useEffect(()=>{
if(clientMode!=='new'||!workerIsClient)return
const validId=newClient.id_number&&newClient.id_number.length===10
const m=validId?(workers.find(w=>w.iqama_number===newClient.id_number)||null):null
setSelWorker(m)
// الاسم والجنسية مخفيان في هذا الوضع — نملؤهما تلقائياً من سجل العامل المطابق ليُحفظ العميل بهما.
if(m)setNewClient(p=>({...p,name_ar:m.name_ar||'',name_en:m.name_en||'',nationality_id:m.nationality_id||p.nationality_id||null}))
},[clientMode,workerIsClient,newClient.id_number,workers])

// Broker search
const filteredBrokers=useMemo(()=>{
if(!brokerQ.trim())return brokers.slice(0,2)
const q=brokerQ.trim().toLowerCase()
return brokers.filter(b=>(b.name_ar||'').toLowerCase().includes(q)||(b.name_en||'').toLowerCase().includes(q)||(b.phone||'').includes(q)||(b.id_number||'').includes(q)).slice(0,2)
},[brokers,brokerQ])

// Worker search
const filteredWorkers=useMemo(()=>{
if(!workerQ.trim())return workers.slice(0,2)
const q=workerQ.trim().toLowerCase()
return workers.filter(w=>(w.name||'').toLowerCase().includes(q)||(w.iqama_number||'').includes(q)).slice(0,2)
},[workers,workerQ])

// «شخص مختلف»: العامل يجب ألا يكون العميل نفسه — نستبعد سجل العميل من نتائج البحث
// كي لا يُربط بنفسه (للحالة المطابقة يُستخدم خيار «هو نفسه العميل» في خطوة العميل).
const clientSelfId=selClient?.id_number||(clientMode==='new'?(newClient?.id_number||null):null)
const workerResults=useMemo(()=>{
if(!clientSelfId||workerIsClient===true)return filteredWorkers
return filteredWorkers.filter(w=>w.iqama_number!==clientSelfId)
},[filteredWorkers,clientSelfId,workerIsClient])

// Kafala transfer — computed line items + iqama-expired flag
const iqamaExpiredKafala=useMemo(()=>{
if(selSvc!=='kafala_transfer'||!selWorker?.iqama_expiry_date)return false
return new Date(selWorker.iqama_expiry_date)<new Date()
},[selSvc,selWorker])

// ── Kafala/Iqama: read settings from localStorage (separate stores per service) ──
const getKafalaConfig=(svc)=>{
const key=svc==='iqama_renewal'?'iqamaRenewalPricingConfig':'kafalaPricingConfig'
const def={transferFee:2000,iqamaPerMonth:650,iqamaFine:1000,workPermitYearly:100,workPermitDaily:23,profChange:200,officePerMonth:100,medicalAge:[{min:0,max:25,rate:500},{min:25,max:35,rate:700},{min:35,max:45,rate:900},{min:45,max:100,rate:1200}]}
try{const r=localStorage.getItem(key);if(r){const p=JSON.parse(r);return{transferFee:p.transferFee??def.transferFee,iqamaPerMonth:p.iqamaPerMonth??def.iqamaPerMonth,iqamaFine:p.iqamaFine??def.iqamaFine,workPermitYearly:p.workPermitYearly??def.workPermitYearly,workPermitDaily:p.workPermitDaily??def.workPermitDaily,profChange:p.profChange??def.profChange,officePerMonth:p.officePerMonth??def.officePerMonth,medicalAge:p.medicalAge||def.medicalAge}}}catch(e){}
return def
}

// ── Kafala: auto-calculated values from settings + form data ──
const kafalaAutoCalc=useMemo(()=>{
if(selSvc!=='kafala_transfer')return null
const cfg=getKafalaConfig('kafala_transfer')
// Transfer fee (fixed from settings)
const transferFee=cfg.transferFee
// Iqama renewal = per-month rate × renewal_months (+ fine auto-added if iqama expires within 3 days)
const renewalMonths=parseInt(fields.renewal_months)||0
let iqamaFine=0
if(fields.iqama_expiry){const exp=new Date(fields.iqama_expiry),now=new Date(),diff=Math.round((exp-now)/86400000);if(diff<=3)iqamaFine=cfg.iqamaFine}
const iqamaRenewalFee=cfg.iqamaPerMonth*renewalMonths+iqamaFine
// Work permit: yearly rate, after 2027-02-21 add daily surcharge
let workPermit=cfg.workPermitYearly
const surchargeDate=new Date('2027-02-21')
if(fields.work_card_expiry){const wExp=new Date(fields.work_card_expiry);if(wExp>surchargeDate){const extraDays=Math.ceil((wExp-surchargeDate)/86400000);workPermit+=cfg.workPermitDaily*extraDays}}
// Medical: age-group based
let medical=0
if(fields.birth_date){const bd=new Date(fields.birth_date),age=Math.floor((new Date()-bd)/31557600000);const grp=cfg.medicalAge.find(g=>age>=g.min&&age<g.max);medical=grp?grp.rate:(cfg.medicalAge[cfg.medicalAge.length-1]?.rate||0)}
// Prof change (fixed from settings)
const profChange=cfg.profChange
// Office = per-month × expected_iqama_months
const expectedMonths=parseInt(fields.expected_iqama_months)||0
const officeFee=cfg.officePerMonth*expectedMonths
return{transferFee,iqamaRenewalFee,iqamaFine,workPermit,medical,profChange,officeFee}
},[selSvc,fields])

const kafalaLines=useMemo(()=>{
if(selSvc!=='kafala_transfer')return null
const k=kafalaPricing,ac=kafalaAutoCalc||{}
// Use user value if typed, otherwise fall back to auto-calculated
const val=(userVal,autoVal)=>{const u=parseFloat(userVal);return isNaN(u)?autoVal:u}
const transferFee=val(k.transferFeeInput,ac.transferFee||0)
const iqamaRenewalFee=val(k.iqamaRenewalFee,ac.iqamaRenewalFee||0)
const workPermitFee=val(k.workPermitRate,ac.workPermit||0)
const profChangeFee=fields.change_profession===true?val(k.profChangeInput,ac.profChange||0):0
const medicalFee=val(k.medicalFee,ac.medical||0)
const officeFee=val(k.officeFee,ac.officeFee||0)
const extras=(k.extras||[]).map(e=>({label:e.name||'إضافي',amount:parseFloat(e.amount)||0}))
const absherBalance=k.absherBalance_on?(parseFloat(k.absherBalance)||0):0
const discount=k.discount_on?(parseFloat(k.discount)||0):0
return{transferFee,iqamaRenewalFee,workPermitFee,profChangeFee,medicalFee,officeFee,extras,absherBalance,discount}
},[selSvc,kafalaPricing,kafalaAutoCalc,fields,iqamaExpiredKafala])

// ── Iqama renewal: auto-calculated values (uses iqamaRenewalPricingConfig) ──
const iqamaRenewalAutoCalc=useMemo(()=>{
if(selSvc!=='iqama_renewal')return null
const cfg=getKafalaConfig('iqama_renewal')
// Iqama renewal: per-month × months (+ fine if expiring within 3 days)
const renewalMonths=parseInt(fields.renewal_months)||0
const iqamaExpiry=selWorker?.iqama_expiry_date||''
let iqamaFine=0
if(iqamaExpiry){const exp=new Date(iqamaExpiry),now=new Date(),diff=Math.round((exp-now)/86400000);if(diff<=3)iqamaFine=cfg.iqamaFine}
const iqamaRenewalFee=cfg.iqamaPerMonth*renewalMonths+iqamaFine
// Work permit: yearly + daily surcharge after 2027-02-21 (based on worker's work_permit expiry)
let workPermit=cfg.workPermitYearly
const surchargeDate=new Date('2027-02-21')
const wpExp=selWorker?.work_permits?.length?[...selWorker.work_permits].sort((a,b)=>new Date(b.wp_expiry_date||0)-new Date(a.wp_expiry_date||0))[0]?.wp_expiry_date:''
if(wpExp){const wExp=new Date(wpExp);if(wExp>surchargeDate){const extraDays=Math.ceil((wExp-surchargeDate)/86400000);workPermit+=cfg.workPermitDaily*extraDays}}
// Medical: age-group based (uses worker.birth_date)
let medical=0
const dob=selWorker?.birth_date||''
if(dob){const bd=new Date(dob),age=Math.floor((new Date()-bd)/31557600000);const grp=cfg.medicalAge.find(g=>age>=g.min&&age<g.max);medical=grp?grp.rate:(cfg.medicalAge[cfg.medicalAge.length-1]?.rate||0)}
// Prof change
const profChange=cfg.profChange
// Office = per-month × renewal_months (iqama renewal duration)
const officeFee=cfg.officePerMonth*renewalMonths
return{iqamaRenewalFee,iqamaFine,workPermit,medical,profChange,officeFee}
},[selSvc,fields,selWorker])

const iqamaRenewalLines=useMemo(()=>{
if(selSvc!=='iqama_renewal')return null
const k=iqamaPricing,ac=iqamaRenewalAutoCalc||{}
const val=(userVal,autoVal)=>{const u=parseFloat(userVal);return isNaN(u)?autoVal:u}
const iqamaRenewalFee=val(k.iqamaRenewalFee,ac.iqamaRenewalFee||0)
const workPermitFee=val(k.workPermitRate,ac.workPermit||0)
const profChangeFee=fields.change_profession===true?val(k.profChangeInput,ac.profChange||0):0
const medicalFee=val(k.medicalFee,ac.medical||0)
const officeFee=val(k.officeFee,ac.officeFee||0)
const extras=(k.extras||[]).map(e=>({label:e.name||'إضافي',amount:parseFloat(e.amount)||0}))
const absherBalance=k.absherBalance_on?(parseFloat(k.absherBalance)||0):0
const discount=k.discount_on?(parseFloat(k.discount)||0):0
return{iqamaRenewalFee,workPermitFee,profChangeFee,medicalFee,officeFee,extras,absherBalance,discount}
},[selSvc,iqamaPricing,iqamaRenewalAutoCalc,fields])

// Iqama expiry flag (for fine indicator in pricing card)
const iqamaExpiredRenewal=useMemo(()=>{
if(selSvc!=='iqama_renewal'||!selWorker?.iqama_expiry_date)return false
return new Date(selWorker.iqama_expiry_date)<new Date()
},[selSvc,selWorker])

// ── Other services: read settings from localStorage ──
const getServicesConfig=()=>{
const d={
  ajeer:{baseFee:300,baseMonths:3,perMonthAfter:100},
  exitReentry:{perMonthSingle:50,perMonthMultiple:100},
  finalExit:{fee:150},
  professionChange:{fee:200},
  passportUpdate:{fee:100},
  nameTranslation:{fee:50},
  iqamaPrint:{perCopy:30},
  chamberCert:{printed:200,openRequest:150},
  documents:{perDoc:30},
  medicalInsurance:{perMonthMultiplier:1}
}
try{const r=localStorage.getItem('servicesPricingConfig');if(r){const p=JSON.parse(r);Object.keys(d).forEach(k=>{d[k]={...d[k],...(p[k]||{})}})}}catch(e){}
return d
}

// ── Other services: auto pricing calc (dispatches by selSvc) ──
const SVC_WITH_PRICING=new Set(['ajeer_contract','exit_reentry_visa','final_exit_visa','profession_change','passport_update','name_translation','iqama_print','medical_insurance','chamber_certification','documents','custom'])
const otherServiceAutoCalc=useMemo(()=>{
if(!SVC_WITH_PRICING.has(selSvc))return null
const cfg=getServicesConfig()
if(selSvc==='ajeer_contract'){
  const months=parseInt(fields.contract_months)||0
  const{baseFee,baseMonths,perMonthAfter}=cfg.ajeer
  const extraMonths=Math.max(0,months-baseMonths)
  const serviceFee=baseFee+extraMonths*perMonthAfter
  return{lines:[{label:'رسوم عقد أجير',amount:serviceFee,detail:months>0?(months<=baseMonths?`${months} أشهر (شامل بالحد الأدنى)`:`${baseMonths} أشهر + ${extraMonths} أشهر إضافية`):''}]}
}
if(selSvc==='exit_reentry_visa'){
  const months=parseInt(fields.duration_months)||0
  const type=fields.exit_type||'single'
  const rate=type==='multiple'?cfg.exitReentry.perMonthMultiple:cfg.exitReentry.perMonthSingle
  const serviceFee=rate*months
  return{lines:[{label:`رسوم خروج وعودة (${type==='multiple'?'متعددة':'مفردة'})`,amount:serviceFee,detail:months>0?`${months} × ${rate}`:''}]}
}
if(selSvc==='final_exit_visa'){
  return{lines:[{label:'رسوم خروج نهائي',amount:cfg.finalExit.fee}]}
}
if(selSvc==='profession_change'){
  return{lines:[{label:'رسم تغيير المهنة',amount:cfg.professionChange.fee}]}
}
if(selSvc==='passport_update'){
  return{lines:[{label:'رسم تحديث بيانات الجواز',amount:cfg.passportUpdate.fee}]}
}
if(selSvc==='name_translation'){
  return{lines:[{label:'رسم تعديل الراتب',amount:cfg.nameTranslation.fee}]}
}
if(selSvc==='iqama_print'){
  return{lines:[{label:'طباعة الإقامة',amount:cfg.iqamaPrint.perCopy||0}]}
}
if(selSvc==='medical_insurance'){
  // Uses kafala medicalAge × multiplier, based on worker age (annual policy — no duration input)
  const kcfg=getKafalaConfig('kafala_transfer')
  const dob=selWorker?.birth_date||''
  let ageRate=0,age=0
  if(dob){const bd=new Date(dob);age=Math.floor((new Date()-bd)/31557600000);const grp=kcfg.medicalAge.find(g=>age>=g.min&&age<g.max);ageRate=grp?grp.rate:(kcfg.medicalAge[kcfg.medicalAge.length-1]?.rate||0)}
  const mult=cfg.medicalInsurance.perMonthMultiplier||1
  const fee=Math.round(ageRate*mult)
  return{lines:[{label:'التأمين الطبي',amount:fee,detail:dob?`${age} سنة × ${ageRate}/سنة × ${mult}`:''}]}
}
if(selSvc==='documents'){
  const copies=parseInt(fields.copies)||1
  const per=cfg.documents.perDoc||0
  return{lines:[{label:'إصدار مستند',amount:per*copies,detail:copies>1?`${copies} نسخ × ${per}`:''}]}
}
if(selSvc==='chamber_certification'){
  const sub=fields.chamber_subtype
  const fee=sub==='printed'?cfg.chamberCert.printed:(sub==='open_request'?cfg.chamberCert.openRequest:0)
  return{lines:[{label:sub==='printed'?'تصديق المطبوعات':(sub==='open_request'?'تصديق طلب مفتوح':'الغرفة التجارية'),amount:fee}]}
}
if(selSvc==='custom'){
  return{lines:[{label:customName.trim()||'خدمة عامة',amount:0}]}
}
return null
},[selSvc,fields,selWorker,customName])

// ── Other services: editable pricing state + lines ──
const[otherServicePricing,setOtherServicePricing]=useState({overrides:{},extras:[],absherBalance:'',discount:''})
const[otherExtraName,setOtherExtraName]=useState('')
const[otherExtraAmount,setOtherExtraAmount]=useState('')
// Reset when service changes
useEffect(()=>{setOtherServicePricing({overrides:{},extras:[],absherBalance:'',discount:''});setOtherExtraName('');setOtherExtraAmount('')},[selSvc])
// Set Arabic as default for documents language
// Load APPROVED (مصدقة) kafala transfer quotes whose 5-day validity window (from priced_at) hasn't expired.
// Kafala reorders the wizard so the quote step is step 2 (التفاصيل), ahead of the client step.
useEffect(()=>{
if(!sb||selSvc!=='kafala_transfer'||step!==2||loadingKafalaQuotes||kafalaQuotes.length>0)return
setLoadingKafalaQuotes(true)
const cutoff=new Date(Date.now()-5*86400000).toISOString()
sb.from('transfer_calculation').select('id,worker_name,iqama_number,phone,quote_no,total_amount,subtotal,transfer_fee,iqama_renewal_fee,work_permit_fee,medical_fee,office_fee,prof_change_fee,priced_at,approved_at,transfer_only,nationality_id,dob').eq('status','approved').gte('priced_at',cutoff).is('deleted_at',null).order('priced_at',{ascending:false}).limit(200).then(({data})=>{
const parsed=(data||[]).map(q=>({
id:q.id,
new_employer_name:q.worker_name||'',
client_charge:Number(q.total_amount||0),
transfer_fee:Number(q.transfer_fee||0),
iqama_cost:Number(q.iqama_renewal_fee||0),
work_permit_cost:Number(q.work_permit_fee||0),
insurance_cost:Number(q.medical_fee||0),
other_costs:Number(q.office_fee||0)+Number(q.prof_change_fee||0),
priced_at:q.priced_at,
transfer_type:q.transfer_only?'transfer_only':'sponsorship',
_notes:{nationality_id:q.nationality_id||null,dob:q.dob||null},
nationality_id:q.nationality_id||null,
quote_no:q.quote_no||'',
worker_name:q.worker_name||'',
iqama_number:q.iqama_number||'',
phone:q.phone?('+966'+q.phone):'',
}))
setKafalaQuotes(parsed)
setLoadingKafalaQuotes(false)
})
},[sb,step,selSvc])
useEffect(()=>{if(selSvc==='documents'&&!fields.doc_lang)setFields(p=>({...p,doc_lang:'ar'}))},[selSvc])
// Set 'single' as default for exit_reentry_visa type
useEffect(()=>{if(selSvc==='exit_reentry_visa'&&!fields.exit_type)setFields(p=>({...p,exit_type:'single'}))},[selSvc])
// passport_update: «تمديد» يظهر مختاراً افتراضياً — اجعله قيمة فعلية حتى يعمل «التالي» بدون نقرة إضافية
useEffect(()=>{if(selSvc==='passport_update'&&!fields.update_mode)setFields(p=>({...p,update_mode:'extend'}))},[selSvc])
// iqama_renewal: «لا» is shown selected by default for تغيير المهنة — make it a real value so «التالي» opens without an extra click
useEffect(()=>{if(selSvc==='iqama_renewal'&&fields.change_profession===undefined)setFields(p=>(p.change_profession===undefined?{...p,change_profession:false}:p))},[selSvc])

const otherServiceLines=useMemo(()=>{
if(!SVC_WITH_PRICING.has(selSvc)||!otherServiceAutoCalc)return null
const ac=otherServiceAutoCalc
const ov=otherServicePricing.overrides||{}
const lines=ac.lines.map((l,i)=>{
  const u=parseFloat(ov[i])
  return{...l,amount:isNaN(u)?(l.amount||0):u}
})
const extras=(otherServicePricing.extras||[]).map(e=>({label:e.name||'إضافي',amount:parseFloat(e.amount)||0}))
const absherBalance=otherServicePricing.absherBalance_on?(parseFloat(otherServicePricing.absherBalance)||0):0
const discount=otherServicePricing.discount_on?(parseFloat(otherServicePricing.discount)||0):0
return{lines,extras,absherBalance,discount}
},[selSvc,otherServiceAutoCalc,otherServicePricing])

// Thousand-separator formatting helpers for amount inputs
const fmtAmt=(v)=>{if(v===''||v==null||v===undefined)return'';const s=String(v);const parts=s.split('.');parts[0]=parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,',');return parts.join('.')}
const unfmtAmt=(v)=>String(v||'').replace(/,/g,'')

// Price calculation
const pricing=useMemo(()=>{
if(!selectedService)return{price:0,govFee:0,vat:0,total:0}
const rules=selectedService.pricing_rules||{}
const vatRate=0
// ── Kafala transfer: build pricing from kafalaLines ──
if(selSvc==='kafala_transfer'&&kafalaLines){
const k=kafalaLines
const price=k.officeFee
const govFee=k.transferFee+k.iqamaRenewalFee+k.workPermitFee+k.profChangeFee
const extrasTotal=k.extras.reduce((s,e)=>s+e.amount,0)
const subtotal=price+govFee+k.medicalFee+extrasTotal
const deductions=k.absherBalance+k.discount
const vat=Math.round(subtotal*vatRate*100)/100
const total=Math.max(0,subtotal+vat-deductions)
const rulesDisplay={rules:[
{label:'رسوم النقل',amount:k.transferFee},
{label:'تجديد الإقامة',amount:k.iqamaRenewalFee},
{label:'رسوم كرت العمل',amount:k.workPermitFee},
...(k.profChangeFee>0?[{label:'تغيير المهنة',amount:k.profChangeFee}]:[]),
{label:'التأمين الطبي',amount:k.medicalFee},
{label:'رسوم المكتب',amount:k.officeFee},
...k.extras.map(e=>({label:e.name||e.label,amount:e.amount})),
],subtotal,absherBalance:k.absherBalance,discount:k.discount}
return{price,govFee,vatRate,vat,subtotal,total,rules:rulesDisplay}
}
// ── Other services: build pricing from otherServiceLines ──
if(SVC_WITH_PRICING.has(selSvc)&&otherServiceLines){
const o=otherServiceLines
const linesTotal=o.lines.reduce((s,l)=>s+(Number(l.amount)||0),0)
const extrasTotal=o.extras.reduce((s,e)=>s+e.amount,0)
const subtotal=linesTotal+extrasTotal
const deductions=o.absherBalance+o.discount
const vat=Math.round(subtotal*vatRate*100)/100
const total=Math.max(0,subtotal+vat-deductions)
const rulesDisplay={rules:[
...o.lines.map(l=>({label:l.label,amount:Number(l.amount)||0})),
...o.extras.map(e=>({label:e.name||e.label,amount:e.amount})),
],subtotal,absherBalance:o.absherBalance,discount:o.discount}
return{price:linesTotal,govFee:0,vatRate,vat,subtotal,total,rules:rulesDisplay}
}
// ── Iqama renewal: build pricing from iqamaRenewalLines (no transfer fee) ──
if(selSvc==='iqama_renewal'&&iqamaRenewalLines){
const k=iqamaRenewalLines
const price=k.officeFee
const govFee=k.iqamaRenewalFee+k.workPermitFee+k.profChangeFee
const extrasTotal=k.extras.reduce((s,e)=>s+e.amount,0)
const subtotal=price+govFee+k.medicalFee+extrasTotal
const deductions=k.absherBalance+k.discount
const vat=Math.round(subtotal*vatRate*100)/100
const total=Math.max(0,subtotal+vat-deductions)
const rulesDisplay={rules:[
{label:'تجديد الإقامة',amount:k.iqamaRenewalFee},
{label:'رسوم كرت العمل',amount:k.workPermitFee},
...(k.profChangeFee>0?[{label:'تغيير المهنة',amount:k.profChangeFee}]:[]),
{label:'التأمين الطبي',amount:k.medicalFee},
{label:'رسوم المكتب',amount:k.officeFee},
...k.extras.map(e=>({label:e.name||e.label,amount:e.amount})),
],subtotal,absherBalance:k.absherBalance,discount:k.discount}
return{price,govFee,vatRate,vat,subtotal,total,rules:rulesDisplay}
}
let price=rules.base_price??Number(selectedService.default_price||0)
let govFee=rules.gov_fee??Number(selectedService.gov_fee||0)
;(rules.rules||[]).forEach(rule=>{
const val=Number(fields[rule.condition_field]||0)
if(rule.condition_operator==='gt'&&val>rule.condition_value){
price+=(val-rule.condition_value)*rule.per_unit_extra
}
})
const subtotal=price+govFee
const vat=Math.round(subtotal*vatRate*100)/100
const total=subtotal+vat
return{price,govFee,vatRate,vat,subtotal,total,rules}
},[selectedService,fields,selSvc,kafalaLines,iqamaRenewalLines,otherServiceLines])

// Installments breakdown
const installmentsList=useMemo(()=>{
if(paymentType!=='installments'||!installmentsCount||installmentsCount<2)return[]
const total=pricing.total||0
const per=Math.round((total/installmentsCount)*100)/100
const startDate=firstInstallmentDate?new Date(firstInstallmentDate):new Date()
return Array.from({length:installmentsCount},(_,i)=>{
const d=new Date(startDate)
d.setMonth(d.getMonth()+i)
return{idx:i+1,amount:i===installmentsCount-1?total-(per*(installmentsCount-1)):per,date:d.toISOString().split('T')[0]}
})
},[paymentType,installmentsCount,firstInstallmentDate,pricing])

// Validation
const canNext=()=>{
setErr('')
if(step===1&&!selSvc){setErr('يرجى اختيار خدمة');return false}
if(step===2){
// Kafala: step 2 is the certified-quote selection (التفاصيل) — moved ahead of the client step.
if(selSvc==='kafala_transfer'){if(!selKafalaQuote){setErr('يرجى اختيار حسبة تنازل مصدقة');return false}return true}
if(step2Mode==='client'){
if(clientMode==='existing'&&!selClient&&!workerIsClient){setErr('يرجى اختيار عميل');return false}
// «العامل هو نفسه العميل» يتطلب وجود سجل عامل مسجّل — لا يُنشأ هنا (بيانات العمال تُدخل من قسم العمالة)
if(workerIsClient&&selClient&&!selWorker){setErr('لا يوجد سجل عامل لهذا العميل — اختر «شخص مختلف» وحدّد عاملاً مسجّلاً');return false}
if(clientMode==='new'){
// عند «هو نفسه العميل» يُخفى الاسم والجنسية ويأتيان من سجل العامل المطابق — فلا نتحقق منهما هنا.
if(!workerIsClient){
const nm=(newClient.name_ar||newClient.name_en||'').trim()
if(!nm){setErr('يرجى إدخال اسم العميل');return false}
{const isArN=/^[؀-ۿ\s]+$/.test(nm),isEnN=/^[A-Za-z\s]+$/.test(nm);if(!isArN&&!isEnN){setErr('اسم العميل يجب أن يكون بالعربية فقط أو بالإنجليزية فقط');return false}const w=nm.split(/\s+/).filter(Boolean);if(w.length!==2){setErr('اسم العميل يجب أن يكون من كلمتين بالضبط');return false}}
if(!newClient.nationality_id){setErr('يرجى اختيار الجنسية');return false}
}
if(!newClient.id_number||newClient.id_number.length!==10){setErr('رقم الهوية يجب أن يكون 10 أرقام');return false}
{const e=validateSaudiId(newClient.id_number);if(e){setErr(e);return false}}
if(!newClient.phone||newClient.phone.length!==9){setErr('رقم الجوال يجب أن يكون 9 أرقام');return false}
{const e=validatePhone(newClient.phone);if(e){setErr(e);return false}}
// «العامل هو نفسه العميل» لعميل جديد: يتطلب وجود عامل مسجّل بنفس رقم الهوية (لا يُنشأ هنا).
if(workerIsClient&&!selWorker){setErr('لا يوجد عامل بنفس بيانات الهوية — اختر «شخص مختلف» وحدّد عاملاً مسجّلاً');return false}
}
}else if(step2Mode==='worker'){
// Worker selection is optional — worker-only services capture the worker via «رقم جوال العامل» in the details step.
if(workerMode==='new'){
const wn=newWorker.name.trim()
if(!wn){setErr('يرجى إدخال اسم العامل');return false}
const isAr=/^[\u0600-\u06FF\s]+$/.test(wn),isEn=/^[A-Za-z\s]+$/.test(wn)
if(!isAr&&!isEn){setErr('اسم العامل يجب أن يكون بالعربية فقط أو بالإنجليزية فقط');return false}
{const w=wn.split(/\s+/).filter(Boolean);if(w.length<1||w.length>3){setErr('اسم العامل يجب أن يكون من كلمة إلى ثلاث كلمات');return false}}
if(!newWorker.iqama_number||newWorker.iqama_number.length!==10){setErr('رقم الإقامة يجب أن يكون 10 أرقام');return false}
if(!newWorker.phone||newWorker.phone.length!==9){setErr('رقم الجوال يجب أن يكون 9 أرقام');return false}
}
// If the service has a single merged field, validate it here (Step 3 will be skipped)
if(svcSingleField&&svcSingleField.required&&!fields[svcSingleField.key]){setErr(`يرجى تعبئة: ${svcSingleField.label_ar}`);return false}
}
}
if(step===3){
// Kafala transfer: step 3 is the client (العميل) party step — worker already came from the quote.
// Ask whether the client is the same person as the worker (inverted «هو نفسه العميل» logic).
if(selSvc==='kafala_transfer'){
if(kafalaSameClient===null){setErr('حدّد هل العميل هو نفس العامل');return false}
if(kafalaSameClient===false){
if(clientMode==='existing'&&!selClient){setErr('يرجى اختيار عميل');return false}
if(clientMode==='new'){
const nm=(newClient.name_ar||newClient.name_en||'').trim()
if(!nm){setErr('يرجى إدخال اسم العميل');return false}
{const isArN=/^[؀-ۿ\s]+$/.test(nm),isEnN=/^[A-Za-z\s]+$/.test(nm);if(!isArN&&!isEnN){setErr('اسم العميل يجب أن يكون بالعربية فقط أو بالإنجليزية فقط');return false}const w=nm.split(/\s+/).filter(Boolean);if(w.length!==2){setErr('اسم العميل يجب أن يكون من كلمتين بالضبط');return false}}
if(!newClient.nationality_id){setErr('يرجى اختيار الجنسية');return false}
if(!newClient.id_number||newClient.id_number.length!==10){setErr('رقم الهوية يجب أن يكون 10 أرقام');return false}
{const e=validateSaudiId(newClient.id_number);if(e){setErr(e);return false}}
if(!newClient.phone||newClient.phone.length!==9){setErr('رقم الجوال يجب أن يكون 9 أرقام');return false}
{const e=validatePhone(newClient.phone);if(e){setErr(e);return false}}
}
}
return true
}
if(VISA_SERVICES.has(selSvc)){
// Every group must be fully filled in BOTH sub-modes (groups + files): the file-distribution
// step is downstream of the groups, so an incomplete group is never valid — even after switching
// to manual distribution. Guards «التالي» AND the «توزيع تلقائي» toggle (which jumps to files).
for(let i=0;i<visaGroups.length;i++){
const g=visaGroups[i]
const lbl=`المجموعة ${i+1}`
if(!g.nationality){setErr(`${lbl}: يرجى اختيار الجنسية`);return false}
if(!g.embassy){setErr(`${lbl}: يرجى اختيار السفارة`);return false}
if(!g.profession){setErr(`${lbl}: يرجى اختيار المهنة`);return false}
if(!g.gender){setErr(`${lbl}: يرجى اختيار الجنس`);return false}
if((parseInt(g.count)||0)<1){setErr(`${lbl}: يرجى إدخال عدد التأشيرات`);return false}
}
if(visaGroups.reduce((s,g)=>s+(parseInt(g.count)||0),0)>4){setErr('الحد الأقصى 4 تأشيرات لكل فاتورة');return false}
if(step3Mode!=='groups'){
// Validate global file distribution
const totalV=visaGroups.reduce((s,g)=>s+(parseInt(g.count)||0),0)
const fc=(f)=>Object.values(f.assignments||{}).reduce((s,n)=>s+(parseInt(n)||0),0)
const sumF=visaFiles.reduce((s,f)=>s+fc(f),0)
if(sumF!==totalV){setErr(`مجموع التأشيرات في الملفات (${sumF}) لا يطابق الإجمالي (${totalV})`);return false}
for(let i=0;i<visaFiles.length;i++){
const c=fc(visaFiles[i])
if(c<1){setErr(`الملف ${i+1}: يجب أن يحتوي على تأشيرة واحدة على الأقل`);return false}
if(c>4){setErr(`الملف ${i+1}: الحد الأقصى 4 تأشيرات لكل ملف`);return false}
// Every visa in a file must share the same nationality, embassy, gender and profession
const bks=new Set();for(const g of visaGroups){if((parseInt(visaFiles[i].assignments?.[g.id])||0)>0)bks.add(visaBucketKey(g))}
if(bks.size>1){setErr(`الملف ${i+1}: لا يمكن دمج تأشيرات بجنسية أو سفارة أو جنس أو مهنة مختلفة في ملف واحد`);return false}
}
for(const g of visaGroups){
const have=visaFiles.reduce((s,f)=>s+(parseInt(f.assignments?.[g.id])||0),0)
const need=parseInt(g.count)||0
if(have!==need){setErr(`لم يتم توزيع جميع تأشيرات كل مجموعة على الملفات`);return false}
}
}
}else if(selSvc==='chamber_certification'){
if(!fields.chamber_subtype){setErr('يرجى اختيار نوع التصديق');return false}
if(fields.chamber_subtype==='printed'&&!fields.chamber_file){setErr('يرجى رفع ملف المطبوعات');return false}
if(fields.chamber_subtype==='open_request'&&!(fields.chamber_text||'').trim()){setErr('يرجى كتابة نص الطلب');return false}
}else if(selSvc==='passport_update'){
if(passportPage===1){
if(!fields.update_mode){setErr('يرجى اختيار نوع التحديث');return false}
}else{
if(fields.update_mode==='renew'){
if(!fields.new_passport_no||!fields.new_passport_no.trim()){setErr('يرجى إدخال رقم الجواز الجديد');return false}
if(!fields.new_passport_issue_city){setErr('يرجى اختيار مكان الإصدار');return false}
if(!fields.new_passport_issue_date){setErr('يرجى إدخال تاريخ الإصدار');return false}
if(!fields.new_passport_expiry){setErr('يرجى إدخال تاريخ الانتهاء');return false}
}else{
if(!fields.new_passport_expiry){setErr('يرجى إدخال تاريخ الانتهاء الجديد');return false}
}
}
}else{
const allInps=(selectedService?.inputs?.length?selectedService.inputs:SERVICE_INPUTS[selSvc])||[]
const hasSec=allInps.some(i=>i.section)
const inputs=hasSec?allInps.filter(i=>i.section===kafalaPage):allInps
for(const inp of inputs){
if(!inp.required)continue
if(inp.show_if&&!fields[inp.show_if])continue
if(inp.show_if_eq&&fields[inp.show_if_eq.key]!==inp.show_if_eq.value)continue
if(inp.type==='toggle'){if(fields[inp.key]!==true&&fields[inp.key]!==false){setErr(`يرجى تعبئة: ${inp.label_ar}`);return false}}
else if(inp.type==='date_hijri'){if(!fields[inp.key]||!/^\d{4}-\d{2}-\d{2}$/.test(fields[inp.key])){setErr(`يرجى تعبئة: ${inp.label_ar}`);return false}}
else if(!fields[inp.key]){setErr(`يرجى تعبئة: ${inp.label_ar}`);return false}
}
}
}
// Step 4 (invoice) — block if total or any installment is below its minimum for visa services
if(step===4&&VISA_SERVICES.has(selSvc)){
const cfg=getVisaMinConfig(selSvc)
const numVisas=visaGroups.reduce((s,g)=>s+(parseInt(g.count)||0),0)||1
const total=totalOverride!==null?Number(totalOverride):Number(pricing?.total||0)
const minTotalAbs=(Number(cfg.defaultTotal)||0)*numVisas
if(minTotalAbs>0&&total<minTotalAbs){setErr('السعر الإجمالي أقل من الحد الأدنى المسموح');return false}
// Temporary visa = single payment, only total is enforced. Permanent visa = 3 installments.
if(selSvc!=='work_visa_temporary'){
const defaultEach=total/3
const issuanceVal=visaInstallments.issuance===''?defaultEach:(Number(visaInstallments.issuance)||0)
if(issuanceVal<numVisas*cfg.issuance){setErr('دفعة «عند إصدار التأشيرة» أقل من الحد المسموح');return false}
const authVal=visaInstallments.authorization===''?defaultEach:(Number(visaInstallments.authorization)||0)
if(authVal<numVisas*cfg.authorization){setErr('دفعة «عند توكيل التأشيرة» أقل من الحد المسموح');return false}
const residenceSubtotal=Math.max(0,total-issuanceVal-authVal)
const residencePerVisa=visaInstallments.residencePerVisa===''?(residenceSubtotal/numVisas):(Number(visaInstallments.residencePerVisa)||0)
if((Number(cfg.residence)||0)>0&&residencePerVisa<Number(cfg.residence)){setErr('دفعة «عند إصدار الإقامة» أقل من الحد المسموح');return false}
}
}
// Step 4 (invoice) — the general/custom service has free-form pricing; a billable request can't total zero.
if(step===4&&selSvc==='custom'&&(Number(pricing?.price)||0)<=0){setErr('يرجى إدخال مبلغ خدمة عامة — البند الأساسي');return false}
// Kafala/Iqama payment plan: the first installment must cover everything except the office fee.
if(step===4&&(selSvc==='kafala_transfer'||selSvc==='iqama_renewal')&&kafalaPayStep&&kafalaPayMode==='split'){
const total=Number(pricing.total)||0
const lines=selSvc==='iqama_renewal'?iqamaRenewalLines:kafalaLines
const officeFee=Number((lines&&lines.officeFee)||0)
const minFirst=Math.max(0,total-officeFee)
const first=parseFloat(kafalaInstallments[0]?.amount)||0
if(first<minFirst){setErr(`الدفعة الأولى يجب ألا تقل عن ${fmtAmt(minFirst.toFixed(2))} ريال (إجمالي الرسوم عدا رسوم المكتب)`);return false}
}
// Step 5 (payment entry) — bank transfer requires the destination account AND a receipt file before proceeding
if(step===5&&!showSummaryScreen&&!showBrokerNoteScreen&&(Number(paidAmount)||0)>0&&paymentMethod==='bank'){
if(bankAccounts.length>0&&!selBankAcc){setErr('يرجى اختيار الحساب المحوّل إليه');return false}
if(!transferReceipt){setErr('يرجى إرفاق ملف إيصال الحوالة');return false}
}
// Step 5 (broker/note screen) — a new broker is optional, but once the user starts one it must be
// complete and valid. Validated here (not in the field) so errors surface in the bottom bar and the
// «التالي» button disables — mirroring تسجيل عميل جديد instead of reddening the fields.
if(step===5&&showBrokerNoteScreen&&brokerMode==='new'&&!selBroker){
const bn=(newBroker.name_ar||newBroker.name_en||'').trim()
const started=!!(bn||newBroker.id_number||newBroker.phone||newBroker.nationality_id)
if(started){
if(!bn){setErr('يرجى إدخال اسم الوسيط');return false}
{const isArN=/^[؀-ۿ\s]+$/.test(bn),isEnN=/^[A-Za-z\s]+$/.test(bn);if(!isArN&&!isEnN){setErr('اسم الوسيط يجب أن يكون بالعربية فقط أو بالإنجليزية فقط');return false}const w=bn.split(/\s+/).filter(Boolean);if(w.length!==2){setErr('اسم الوسيط يجب أن يكون من كلمتين بالضبط');return false}}
if(!newBroker.nationality_id){setErr('يرجى اختيار جنسية الوسيط');return false}
if(!newBroker.id_number||newBroker.id_number.length!==10){setErr('رقم هوية الوسيط يجب أن يكون 10 أرقام');return false}
{const e=validateSaudiId(newBroker.id_number);if(e){setErr(e);return false}}
if(!newBroker.phone||newBroker.phone.length!==9){setErr('رقم جوال الوسيط يجب أن يكون 9 أرقام');return false}
{const e=validatePhone(newBroker.phone);if(e){setErr(e);return false}}
}
}
return true
}
// Pure read of the current step's blocking message ('' = step is complete and «التالي» is enabled).
// Runs canNext() with setErr captured, so it has NO side effects and is safe to call during render.
const getStepError=()=>{const cap={v:''};errCaptureRef.current=cap;try{canNext()}finally{errCaptureRef.current=null}return cap.v}

const goNext=async()=>{
if(!canNext())return
// Step 1 → 2: pick the step-2 sub-mode. Client-less services (supplier payroll) open directly on
// worker selection — clear any stale client link so submit records no client_id.
if(step===1){setStep(2);if(skipClientStep){setStep2Mode('worker');setSelClient(null);setWorkerIsClient(false)}else setStep2Mode('client');setErr('');return}
// Duplicate guard: block creating a second client record under an existing national ID or mobile number.
if(((step===2&&selSvc!=='kafala_transfer')||(step===3&&selSvc==='kafala_transfer'))&&step2Mode==='client'&&clientMode==='new'){
const idVal=newClient.id_number&&newClient.id_number.length===10?newClient.id_number:null
const phoneVal=newClient.phone&&newClient.phone.length===9?('966'+newClient.phone):null
if(idVal||phoneVal){
const orParts=[]
if(idVal)orParts.push(`id_number.eq.${idVal}`)
if(phoneVal)orParts.push(`phone.eq.${phoneVal}`)
const{data:dups,error:dupErr}=await sb.from('clients').select('id,name_ar,name_en,phone,id_number,nationality_id').or(orParts.join(',')).is('deleted_at',null).limit(1)
if(dupErr){setErr('تعذر التحقق من بيانات العميل، حاول مرة أخرى');return}
if(dups&&dups.length){
const d=dups[0]
const byId=idVal&&d.id_number===idVal
const nm=d.name_ar||d.name_en||'عميل آخر'
setErr(byId?`رقم الهوية مسجّل مسبقاً للعميل: ${nm} — يرجى البحث عنه واختياره من القائمة`:`رقم الجوال مسجّل مسبقاً للعميل: ${nm} — يرجى البحث عنه واختياره من القائمة`)
return
}
}
}
// Step 2 sub-flow: client → (if worker not same and not visa/kafala service) worker → next step
if(step===2&&step2Mode==='client'&&!VISA_SERVICES.has(selSvc)&&selSvc!=='kafala_transfer'){setStep2Mode('worker');setErr('');return}
// If the service's single field is merged into Step 2, skip Step 3 entirely
if(step===2&&hasMergedField){setStep(4);return}
// Step 3 sub-flow (visa services): groups → [auto: skip to step 4] or [custom: files distribution → step 4]
if(step===3&&VISA_SERVICES.has(selSvc)&&step3Mode==='groups'){
// Auto-initialize global distribution: ≤4 per file, never mixing different nationality/embassy/gender
const totalV=visaGroups.reduce((s,g)=>s+(parseInt(g.count)||0),0)
const files=packVisaFiles(visaGroups)
if(visaDistMode==='auto'){
// Auto: fix distribution at 4-per-file and jump directly to invoice
setVisaFiles(files)
setForceCustomFiles(false)
setStep(4);setErr('');return
}
// Custom: seed if needed (or re-pack when the existing distribution went stale after a group edit), open files sub-step
if(!visaFilesValid(visaFiles,visaGroups)){
setVisaFiles(files)
setForceCustomFiles(false)
}
setStep3Mode('files');setErr('');return
}
// Step 3 kafala sub-flow: quote search IS the entire step. Skip the pricing entry (التسعيرة) — go directly to the payment plan inside step 4.
if(step===3&&selSvc==='kafala_transfer'){setStep(4);setKafalaPayStep(true);setErr('');return}
// Step 3 passport sub-flow: current data+type → new passport fields
if(step===3&&selSvc==='passport_update'&&passportPage<2){setPassportPage(2);setErr('');return}
// Free services (documents): skip invoice + payment, jump to the note step (then summary)
if(step===3&&isFreeSvc){setStep(5);setShowBrokerNoteScreen(true);setErr('');return}
// Step 4 kafala/iqama sub-flow: pricing → payment-plan screen (before moving to step 5)
if(step===4&&(selSvc==='kafala_transfer'||selSvc==='iqama_renewal')&&!kafalaPayStep){setKafalaPayStep(true);setErr('');return}
// Step 5 sub-flow: payment → note (every service) → summary
if(step===5&&!showSummaryScreen&&!showBrokerNoteScreen){
setShowBrokerNoteScreen(true);setErr('');return
}
if(step===5&&showBrokerNoteScreen&&!showSummaryScreen){
// Duplicate guard for a new broker: block creating an agent under an existing national ID or mobile number.
if(brokerMode==='new'&&!selBroker){
const idVal=newBroker.id_number&&newBroker.id_number.length===10?newBroker.id_number:null
const phoneVal=newBroker.phone&&newBroker.phone.length===9?('966'+newBroker.phone):null
if(idVal||phoneVal){
const orParts=[]
if(idVal)orParts.push(`id_number.eq.${idVal}`)
if(phoneVal)orParts.push(`phone.eq.${phoneVal}`)
const{data:dups,error:dupErr}=await sb.from('agents').select('id,name_ar,name_en,phone,id_number').or(orParts.join(',')).is('deleted_at',null).limit(1)
if(dupErr){setErr('تعذر التحقق من بيانات الوسيط، حاول مرة أخرى');return}
if(dups&&dups.length){
const d=dups[0]
const byId=idVal&&d.id_number===idVal
const nm=d.name_ar||d.name_en||'وسيط آخر'
setErr(byId?`رقم الهوية مسجّل مسبقاً للوسيط: ${nm} — يرجى البحث عنه واختياره من القائمة`:`رقم الجوال مسجّل مسبقاً للوسيط: ${nm} — يرجى البحث عنه واختياره من القائمة`)
return
}
}
}
setShowBrokerNoteScreen(false);setShowSummaryScreen(true);setErr('');return}
setStep(s=>Math.min(s+1,5))
}
const goBack=()=>{
setErr('')
if(step===2&&step2Mode==='worker'){if(skipClientStep){setStep(1);return}setStep2Mode('client');return}
// Step 3 kafala sub-flow: removed — quote search is the entire step now
// Step 3 passport sub-flow: new passport fields → current data+type
if(step===3&&selSvc==='passport_update'&&passportPage>1){setPassportPage(1);return}
// Step 3 sub-flow: files → groups
if(step===3&&step3Mode==='files'){setStep3Mode('groups');return}
// Step 4 iqama sub-flow: payment-plan → pricing
if(step===4&&selSvc==='iqama_renewal'&&kafalaPayStep){setKafalaPayStep(false);return}
// Step 4 kafala sub-flow: payment-plan → step 3 (skip pricing entry — prices come from the quote)
if(step===4&&selSvc==='kafala_transfer'&&kafalaPayStep){setKafalaPayStep(false);setStep(3);return}
// Coming back from step 4 into step 3: visa → restore sub-mode, kafala → section 2
if(step===4&&VISA_SERVICES.has(selSvc)){setStep(3);setStep3Mode(visaDistMode==='auto'?'groups':'files');return}
if(step===4&&selSvc==='kafala_transfer'){setStep(3);return}
if(step===4&&selSvc==='passport_update'){setStep(3);setPassportPage(2);return}
// Step 5 sub-flow: summary → note (always present now) → payment entry
if(step===5&&showSummaryScreen){setShowSummaryScreen(false);setShowBrokerNoteScreen(true);return}
// Note → back: free services have no payment step, so return to details (step 3)
if(step===5&&showBrokerNoteScreen){setShowBrokerNoteScreen(false);if(isFreeSvc)setStep(3);return}
// Coming back from step 5 into step 4: kafala/iqama → restore payment-plan screen
if(step===5&&(selSvc==='kafala_transfer'||selSvc==='iqama_renewal')){setStep(4);setKafalaPayStep(true);return}
// Mirror the skip on the way back
if(step===4&&hasMergedField){setStep(2);setStep2Mode('worker');return}
setStep(s=>Math.max(s-1,1))
}

// Submit — adapted to the new schema:
//   service_requests + (visa/transfer/ajeer/iqama_renewal/other)_applications + invoice (when billable) + installments
const handleSubmit=async()=>{
if(saving)return
// Branch on every write follows the user's primary branch — falling back to the dashboard filter if absent.
const userBranchId=user?.primary_branch_id||branchId||null
if(!userBranchId){setErr('لا يوجد مكتب مرتبط بحسابك — تواصل مع مدير النظام لتعيين مكتبك');return}

// ─── Hard pricing validation — enforce Service Admin minimums BEFORE any DB writes ───
// The visa flow lets the user override the total and per-installment amounts. Block save
// if any of them falls under the configured minimum for this service + branch.
if(VISA_SERVICES.has(selSvc)&&isServiceBillable(selSvc)){
  const minCfg=getPricingFor(selSvc,userBranchId)||{}
  const numVisas=visaGroups.reduce((s,g)=>s+(parseInt(g.count)||0),0)||1
  const total=totalOverride!==null?Number(totalOverride):Number(pricing?.total||0)
  const minTotalAbs=(Number(minCfg.defaultTotal)||0)*numVisas
  if(minTotalAbs>0&&total<minTotalAbs){setErr('السعر الإجمالي أقل من الحد الأدنى المسموح');return}
  // Temporary visa is a single payment — only the total is enforced. Permanent visa = 3 installments.
  if(selSvc!=='work_visa_temporary'){
  const defaultEach=total/3
  const issuanceVal=visaInstallments.issuance===''?defaultEach:(Number(visaInstallments.issuance)||0)
  const authVal=visaInstallments.authorization===''?defaultEach:(Number(visaInstallments.authorization)||0)
  const residenceSubtotal=Math.max(0,total-issuanceVal-authVal)
  const residencePerVisa=visaInstallments.residencePerVisa===''?(residenceSubtotal/numVisas):(Number(visaInstallments.residencePerVisa)||0)
  const minIss=(Number(minCfg.issuance)||0)*numVisas
  const minAuth=(Number(minCfg.authorization)||0)*numVisas
  const minRes=Number(minCfg.residence)||0
  if(minIss>0&&issuanceVal<minIss){setErr('دفعة إصدار التأشيرة أقل من الحد الأدنى المسموح');return}
  if(minAuth>0&&authVal<minAuth){setErr('دفعة توكيل التأشيرة أقل من الحد الأدنى المسموح');return}
  if(minRes>0&&residencePerVisa<minRes){setErr('دفعة إصدار الإقامة أقل من الحد الأدنى المسموح');return}
  }
}

setSaving(true);setErr('')
try{
let finalClientId=selClient?.id||null
let finalWorkerId=selWorker?.id||null

// Create new worker if needed (new schema columns)
if(!workerIsClient&&workerMode==='new'){
const{data:nw,error:nwErr}=await sb.from('workers').insert({
name_ar:newWorker.name||null,
phone:newWorker.phone?('966'+newWorker.phone):null,
iqama_number:newWorker.iqama_number||null,
branch_id:userBranchId,
}).select('id').single()
if(nwErr)throw nwErr
finalWorkerId=nw.id
}

// Create new client if needed (new schema columns — no client_number/status)
if(clientMode==='new'){
// Safety net: re-check ID + phone uniqueness right before insert (in case another user created the same record between step 2 and submit).
{
const idVal=newClient.id_number||null
const phoneVal=newClient.phone?('966'+newClient.phone):null
if(idVal||phoneVal){
const orParts=[]
if(idVal)orParts.push(`id_number.eq.${idVal}`)
if(phoneVal)orParts.push(`phone.eq.${phoneVal}`)
const{data:dup,error:dupErr}=await sb.from('clients').select('id,name_ar,name_en,id_number,phone').or(orParts.join(',')).is('deleted_at',null).limit(1)
if(dupErr)throw dupErr
if(dup&&dup.length){const d=dup[0];const byId=idVal&&d.id_number===idVal;const nm=d.name_ar||d.name_en||'عميل آخر';setErr(byId?`رقم الهوية مسجّل مسبقاً للعميل: ${nm} — يرجى البحث عنه واختياره`:`رقم الجوال مسجّل مسبقاً للعميل: ${nm} — يرجى البحث عنه واختياره`);setSaving(false);return}
}
}
const{data:nc,error:ncErr}=await sb.from('clients').insert({
name_ar:newClient.name_ar||null,name_en:newClient.name_en||null,
phone:newClient.phone?('966'+newClient.phone):null,
id_number:newClient.id_number||null,
nationality_id:newClient.nationality_id||null,
branch_id:userBranchId,
}).select('id').single()
if(ncErr)throw ncErr
finalClientId=nc.id
}

// Map page-side service id → schema service_type code (permanent/temporary variants are preserved as distinct types).
// EVERY selectable wizard id (ALL_SERVICES) must resolve here. Ids missing from this map previously fell
// through to the default below and were silently saved as 'other' (= "الغرفة التجارية"); e.g. picking the
// "عام" service (id 'custom') stored it as Chamber of Commerce. Keep this in sync with ALL_SERVICES.
const SVC_CODE_MAP={
  work_visa_permanent:'work_visa_permanent',work_visa_temporary:'work_visa_temporary',
  kafala_transfer:'transfer',iqama_renewal:'iqama_renewal',ajeer_contract:'ajeer',
  supplier_payroll:'supplier_payroll',external_transfer_approval:'external_transfer_approval',
  // ids whose service_type code differs from the wizard id, or that have no registry entry of their own:
  chamber_certification:'other',   // "الغرفة التجارية" is stored under the legacy 'other' code
  custom:'general',                // "عام" — the generic service bucket
  medical_insurance:'medical_insurance',name_translation:'name_translation',
  exit_reentry_visa:'exit_reentry_visa',final_exit_visa:'final_exit_visa',iqama_print:'iqama_print',
  // Registry-driven tabs: wizard id is already the service_type code, so map each to itself.
  ...Object.fromEntries(Object.keys(TXN_SERVICES).map(c=>[c,c])),
}
// Fall back to the generic "عام" bucket — NEVER 'other'/الغرفة التجارية — for any id not listed above.
const serviceTypeCode=SVC_CODE_MAP[selSvc]||'general'
// Both visa variants share the visa_applications table, so detail-table/row logic keys off the base family.
const svcCode=(serviceTypeCode==='work_visa_permanent'||serviceTypeCode==='work_visa_temporary')?'work_visa':serviceTypeCode

// Resolve lookup IDs (service_type + initial 'in_progress' status — the 'new' stage was retired)
const{data:svcTypeRow}=await sb.from('lookup_items').select('id,category:lookup_categories!inner(category_key)').eq('code',serviceTypeCode).eq('category.category_key','service_type').maybeSingle()
const{data:newStatusRow}=await sb.from('lookup_items').select('id,category:lookup_categories!inner(category_key)').eq('code','in_progress').eq('category.category_key','request_status').maybeSingle()
if(!svcTypeRow?.id||!newStatusRow?.id)throw new Error('lookup ids not found')

// Generate ref number (timestamp-based, last 10 digits)
const refNo=String(Date.now()).slice(-10)
// Determine quantity (visas can have many)
const qty=Math.max(1,Number(fields.visa_count||fields.quantity||1))

// 1. Insert service_request
const{data:sr,error:srErr}=await sb.from('service_requests').insert({
request_ref_no:refNo,
branch_id:userBranchId,
client_id:finalClientId,
service_type_id:svcTypeRow.id,
status_id:newStatusRow.id,
request_date:new Date().toISOString(),
quantity:qty,
note:[clientNote,internalNote].filter(Boolean).join(' — ')||null,
}).select('id').single()
if(srErr)throw srErr

// 2. Insert detail row(s) in the matching application table.
// Work-visa requests fan out into one visa_applications row per visa, grouped into files via file_number,
// so the file distribution (which visas sit in which file) is persisted for the invoice detail view.
let createdVisaIds=[]
if(svcCode==='work_visa'){
const groupById=Object.fromEntries(visaGroups.map(g=>[String(g.id),g]))
const fallbackFiles=packVisaFiles(visaGroups)
const files=visaFiles.length?visaFiles:fallbackFiles
const visaRows=[]
files.forEach((f,fi)=>{
const fileNo=fi+1
Object.entries(f.assignments||{}).forEach(([gid,cnt])=>{
const g=groupById[String(gid)];const n=parseInt(cnt)||0
// التأشيرة الدائمة: المنشأة تُختار يدويًا في صفحة تفاصيل المعاملة (مسار «اختيار المنشأة وتوزيع التأشيرات») — لا تُسند تلقائيًا من منشأة العميل/العامل.
for(let k=0;k<n;k++)visaRows.push({service_request_id:sr.id,main_facility_id:serviceTypeCode==='work_visa_permanent'?null:(selWorker?.facility?.id||null),file_number:fileNo,nationality_id:g?.nationality||fields.nationality_id||null,occupation_id:g?.profession||fields.occupation_id||null,embassy_id:g?.embassy||fields.embassy_id||null,gender:g?.gender||fields.gender||null})
})
})
if(visaRows.length===0)visaRows.push({service_request_id:sr.id,main_facility_id:serviceTypeCode==='work_visa_permanent'?null:(selWorker?.facility?.id||null),file_number:1,nationality_id:fields.nationality_id||null,occupation_id:fields.occupation_id||null,embassy_id:fields.embassy_id||null,gender:fields.gender||null})
const{data:createdVisas,error:dErr}=await sb.from('visa_applications').insert(visaRows).select('id')
if(dErr)throw dErr
createdVisaIds=(createdVisas||[]).map(v=>v.id)
}else{
const detailTbl=svcCode==='transfer'?'transfer_applications'
:svcCode==='ajeer'?'ajeer_applications'
:svcCode==='iqama_renewal'?'iqama_renewal_applications'
:svcCode==='supplier_payroll'?'supplier_payroll_applications'
:'other_applications'
// Registry tabs store their step-3 fields in the details JSONB column (dropping empties).
const regCfg=TXN_SERVICES[serviceTypeCode]
const regDetails=regCfg?Object.fromEntries((regCfg.inputs||[]).map(i=>[i.key,fields[i.key]]).filter(([,v])=>v!==undefined&&v!==null&&v!=='')):null
const detailRow=(svcCode==='transfer')?{service_request_id:sr.id,worker_id:finalWorkerId,main_facility_id:selWorker?.facility?.id||null,total_price_final:Number(pricing.total||0)||null}
:(svcCode==='ajeer')?{service_request_id:sr.id,worker_id:finalWorkerId,main_facility_id:selWorker?.facility?.id||null,worker_phone:fields.worker_phone||null,duration_months:Number(fields.duration_months)||null,start_date:fields.start_date||null,end_date:fields.end_date||null}
:(svcCode==='iqama_renewal')?{service_request_id:sr.id,worker_id:finalWorkerId,worker_facility_id:selWorker?.facility?.id||null,worker_phone:fields.worker_phone||null,duration_months:Number(fields.duration_months)||12,current_expire_date:fields.current_expire_date||null,new_expire_date:fields.new_expire_date||null}
:(svcCode==='supplier_payroll')?{service_request_id:sr.id,worker_id:workerIsClient?null:finalWorkerId,worker_facility_id:selWorker?.facility?.id||null,description:selectedService?.name_ar||fields.description||null,worker_phone:fields.worker_phone||null,unpaid_salaries_count:Number(fields.unpaid_salaries_count)||null,total_amount:Number(fields.total_amount)||null}
:{service_request_id:sr.id,worker_id:workerIsClient?null:finalWorkerId,worker_facility_id:selWorker?.facility?.id||null,worker_phone:fields.worker_phone||null,description:(selSvc==='custom'?fields.custom_note:(selectedService?.name_ar||fields.description))||null,details:regDetails&&Object.keys(regDetails).length?regDetails:null}
const{error:dErr}=await sb.from(detailTbl).insert(detailRow)
if(dErr)throw dErr
}

// 2b. Persist broker/agent link. Either reuse the picked broker, or create a new
// agent row from `newBroker` and then link. Without this step the UI lets the user
// pick a broker but the selection is discarded at submit.
let linkedAgentId=null
if(selBroker?.id){
  linkedAgentId=selBroker.id
}else if(brokerMode==='new'&&(newBroker?.name_ar?.trim()||newBroker?.name_en?.trim())){
  const{data:newAgent,error:newAgentErr}=await sb.from('agents').insert({
    name_ar:newBroker.name_ar?.trim()||null,
    name_en:(newBroker.name_en||'').trim()||null,
    phone:newBroker.phone?('966'+String(newBroker.phone).replace(/\D/g,'')):null,
    id_number:newBroker.id_number||null,
    nationality_id:newBroker.nationality_id||null,
    branch_id:userBranchId,
    created_by:user?.id||null,
  }).select('id,default_commission_amount').single()
  if(newAgentErr)throw newAgentErr
  linkedAgentId=newAgent.id
}
if(linkedAgentId){
  const brokerForCommission=selBroker||{}
  const{error:sraErr}=await sb.from('service_request_agents').insert({
    service_request_id:sr.id,
    agent_id:linkedAgentId,
    commission_amount:Number(brokerForCommission.default_commission_amount||0)||null,
  })
  if(sraErr)throw sraErr
}

// 3. Insert invoice IF the service is billable. Free services skip the invoice (per the user's free-service flow).
const billable=isServiceBillable?isServiceBillable(selSvc):true
let createdInvId=null
let issuedInvoiceNo=null
const effectiveTotal=(VISA_SERVICES.has(selSvc)&&totalOverride!==null)?Number(totalOverride):Number(pricing?.total||0)
if(billable&&effectiveTotal>0){
const total=effectiveTotal
// Invoice number mirrors the transfer-quote scheme: INV-{branch_code}-{random}. Falls back to the
// timestamp-based ref if the RPC is unavailable so invoice creation is never blocked by numbering.
let invNo
try{const{data:genNo,error:genErr}=await sb.rpc('generate_invoice_number',{p_branch_id:userBranchId});if(genErr||!genNo)throw genErr||new Error('no number');invNo=genNo}catch{invNo='INV-'+refNo}
const paidNum=Math.min(Number(paidAmount)||0,total)

// Build the installment schedule based on the chosen service.
// Visa services use the visa-specific stages (issuance / authorization / residence) shown in the UI;
// other services fall back to the generic N-equal-installments split.
const isVisa=VISA_SERVICES.has(selSvc)
// Permanent visa = 3 installments (issuance + authorization + residence).
// Temporary visa = single payment (no installment split).
const visaHasInstallments=isVisa&&selSvc!=='work_visa_temporary'
const visaStageCount=visaHasInstallments?3:0
const numVisas=isVisa?(visaGroups.reduce((s,g)=>s+(parseInt(g.count)||0),0)||1):1
// Round each stage to 2 decimals (matches the DB numeric(.,2) columns). The first two
// stages are rounded and the residence stage absorbs the remainder, so the three stages
// always sum to exactly `total` — otherwise total/3 = 4666.6667 stores as 4666.67 ×3 = 14000.01,
// leaving a phantom 0.01 on the last installment while the invoice reads fully paid.
const r2=v=>Math.round((Number(v)||0)*100)/100
const defaultEachVisa=visaHasInstallments?total/3:0
const issuanceVal=visaHasInstallments?r2(visaInstallments.issuance===''?defaultEachVisa:(Number(visaInstallments.issuance)||0)):0
const authVal=visaHasInstallments?r2(visaInstallments.authorization===''?defaultEachVisa:(Number(visaInstallments.authorization)||0)):0
const residenceVal=visaHasInstallments?r2(Math.max(0,total-issuanceVal-authVal)):0
// نقل الكفالة (transfer) وتجديد الإقامة (iqama_renewal) وحدهما يمكن تقسيمهما لعدّة دفعات — وذلك
// فقط إذا اختار المستخدم «دفعات متعددة». التأشيرة الدائمة تستخدم مراحلها الثلاث أعلاه. وكل خدمة
// أخرى لها فاتورة تُنشئ دفعة واحدة بكامل المبلغ (وليس صفراً).
const installmentSvc=selSvc==='kafala_transfer'||selSvc==='iqama_renewal'
const splitChosen=installmentSvc&&kafalaPayMode==='split'
const splitRows=splitChosen?kafalaInstallments.map(rw=>({amount:r2(parseFloat(rw.amount)||0),date:rw.date||null})).filter(rw=>rw.amount>0):[]
const planCount=visaHasInstallments?(2+(createdVisaIds.length||1)):(splitRows.length>1?splitRows.length:1)

// Snapshot the التسعيرة line items (service lines + extras) so the invoice detail can show the
// itemized breakdown later — the wizard otherwise only persists the total. Null when no line items.
const pricingBreakdown=(()=>{
const arr=Array.isArray(pricing?.rules?.rules)?pricing.rules.rules:[]
const items=arr.filter(l=>l&&typeof l.label==='string'&&(Number(l.amount)||0)>0).map(l=>({label:l.label,amount:Number(l.amount)||0}))
return items.length?items:null
})()

const{data:inv,error:invErr}=await sb.from('invoices').insert({
invoice_no:invNo,
service_request_id:sr.id,
branch_id:userBranchId,
service_type_id:svcTypeRow.id,
service_quantity:qty,
total_amount:total,
paid_amount:paidNum,
payment_plan:planCount>1?'installment':'cash',
installments_count:planCount>1?planCount:0,
pricing_breakdown:pricingBreakdown,
note_public:clientNote||null,
created_by:user?.id||null,
}).select('id').single()
if(invErr)throw invErr
createdInvId=inv.id
issuedInvoiceNo=invNo

// Resolve payment_method lookup once — needed for both payment row + paid installments
let pmId=null
if(paidNum>0){
const payCode=paymentMethod==='bank'?'bank_transfer':'cash'
const{data:pmRow}=await sb.from('lookup_items').select('id,category:lookup_categories!inner(category_key)').eq('code',payCode).eq('category.category_key','payment_method').maybeSingle()
pmId=pmRow?.id||null
}
const nowIso=new Date().toISOString()

// 4. Installments — always create a schedule: a single full-amount دفعة by default, the 3 visa
// stages for a permanent visa, or the user's chosen rows when transfer/iqama is split into
// «دفعات متعددة». The down-payment is consumed across rows in order.
let downPaymentInstId=null
if(planCount>=1){
let insts
if(visaHasInstallments){
// Two shared transaction-level tranches — «إصدار التأشيرة» then «توكيل التأشيرة» (cover all visas,
// no per-visa link) — then ONE «إصدار الإقامة» tranche per visa linked via visa_application_id.
// The iqama total is split evenly across visas (last visa absorbs the rounding remainder).
const vids=createdVisaIds.length?createdVisaIds:[null]
const N=vids.length
const splitAmt=(amt,n)=>{const per=r2(amt/n);const a=[];let acc=0;for(let i=0;i<n;i++){if(i<n-1){a.push(per);acc+=per}else a.push(r2(amt-acc))}return a}
const iqamaSplit=splitAmt(residenceVal,N)
const rows=[{vid:null,amt:issuanceVal,order:1,label:'عند إصدار التأشيرة',paid:0},{vid:null,amt:authVal,order:2,label:'عند توكيل التأشيرة',paid:0}]
vids.forEach((vid,v)=>rows.push({vid,amt:iqamaSplit[v],order:v+3,label:'عند إصدار الإقامة',paid:0}))
// Down-payment is consumed in order: issuance, then توكيل, then each visa's iqama.
let leftover=paidNum
rows.forEach(r=>{const p=Math.min(leftover,r.amt);leftover-=p;r.paid=p})
insts=rows.map(r=>({invoice_id:createdInvId,service_request_id:sr.id,branch_id:userBranchId,visa_application_id:r.vid,installment_order:r.order,total_amount:r.amt,paid_amount:r.paid,expected_date:null,paid_date:r.amt>0&&r.paid>=r.amt?nowIso:null,payment_method_id:r.paid>0?pmId:null,notes:r.label}))
}else{
const amounts=splitRows.length>1
?(()=>{const a=splitRows.map(rw=>rw.amount);const used=a.slice(0,-1).reduce((s,x)=>s+x,0);a[a.length-1]=r2(Math.max(0,total-used));return a})()
:[r2(total)]
// Split rows use the date the user entered; a single full-amount دفعة has no schedulable future date.
const dates=splitRows.length>1?splitRows.map(rw=>rw.date||null):[null]
let leftover=paidNum
insts=amounts.map((amt,i)=>{
const instPaid=Math.min(leftover,amt)
leftover-=instPaid
return{
invoice_id:createdInvId,
service_request_id:sr.id,
branch_id:userBranchId,
installment_order:i+1,
total_amount:amt,
paid_amount:instPaid,
expected_date:dates[i]||null,
paid_date:instPaid>=amt?nowIso:null,
payment_method_id:instPaid>0?pmId:null,
notes:null,
}
})
}
const{data:instData,error:instErr}=await sb.from('installments').insert(insts).select('id,installment_order')
if(instErr)throw instErr
// اربط الدفعة المقدّمة بأوّل دفعة (ترتيب 1) للتتبّع؛ توزيعها الفعلي يبقى محفوظاً في paid_amount لكل دفعة.
downPaymentInstId=(instData||[]).slice().sort((a,b)=>(a.installment_order||0)-(b.installment_order||0))[0]?.id||null
}

// 5. Down-payment — record an actual payment row so the receipts log stays consistent
if(paidNum>0){
const{error:payErr}=await sb.from('payments').insert({
invoice_id:createdInvId,
service_request_id:sr.id,
branch_id:userBranchId,
amount:paidNum,
installment_id:downPaymentInstId,
payment_method_id:pmId,
bank_reference:paymentMethod==='bank'?(transferReference||null):null,
// Receiving-bank account (only meaningful for bank transfers).
bank_account_id:paymentMethod==='bank'?(selBankAcc||null):null,
is_valid:true,
created_by:user?.id||null,
})
if(payErr)throw payErr
}

// Link this invoice back to its certified transfer quote (تسعيرة التنازل) via transfer_calculation.invoice_id,
// so the invoice page can show the quote number and deep-link to its details. Goes through the edge function
// (invoice_id is server-protected). Non-fatal: a linking hiccup must never fail invoice creation.
if(svcCode==='transfer'&&selKafalaQuote?.id&&createdInvId){
try{
const{data:{session}}=await sb.auth.getSession()
if(session){
await fetch(`${sb.supabaseUrl}/functions/v1/update-quotation`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({action:'change_status',id:selKafalaQuote.id,status:'invoiced',invoice_id:createdInvId})})
}
}catch(e){console.warn('quote→invoice link failed',e)}
}
}

const clientNm=selClient?.name_ar||newClient?.name_ar||selWorker?.name||selWorker?.name_ar||''
setIssuedInvoice({invoiceNo:issuedInvoiceNo,invoiceId:createdInvId,total:billable?effectiveTotal:0,clientName:clientNm,serviceName:selectedService?.name_ar||''})
}catch(e){
console.error(e)
// Surface specific failure reasons so the user knows whether to retry, pick another value, or contact admin.
const m=(e.message||'').toLowerCase()
if(e.code==='23505'||m.includes('duplicate')||m.includes('unique')){
  if(m.includes('id_number'))setErr('رقم الهوية مسجل مسبقاً — اختر العميل من القائمة بدلاً من تسجيله من جديد')
  else setErr('قيمة مكررة — راجع الحقول الفريدة (رقم الفاتورة، رقم الطلب)')
}
else if(e.code==='23503'||m.includes('foreign key')){setErr('حقل مرجعي غير صالح — تحقق من العميل/العامل/المنشأة المختارة')}
else if(e.code==='23502'||m.includes('not-null')){setErr('حقل مطلوب فارغ — راجع جميع الخطوات')}
else if(m.includes('permission')||m.includes('rls')){setErr('ليست لديك صلاحية لإتمام هذا الإجراء')}
else setErr('حدث خطأ: '+(e.message||'حاول مرة أخرى'))
}
setSaving(false)
}

// ═══════════ RENDER ═══════════
// شاشة النجاح — العبارة الموحّدة داخل نفس النافذة (نمط معرض الفورمات). رقم الفاتورة داخل العبارة.
if(issuedInvoice){
const ii=issuedInvoice
const closeSuccess=()=>{try{window.dispatchEvent(new CustomEvent('invoice-created',{detail:{id:ii.invoiceId}}))}catch{};setIssuedInvoice(null);onClose&&onClose()}
const openInvoiceDetails=()=>{if(ii.invoiceId){try{window.dispatchEvent(new CustomEvent('app-navigate-invoice',{detail:{id:ii.invoiceId}}))}catch{}}closeSuccess()}
return<FKModal open onClose={closeSuccess} variant="create" width={680}
  success={<SuccessView title={ii.invoiceNo?'تم إصدار الفاتورة':'تم رفع الطلب بنجاح'} code={ii.invoiceNo?noDash(ii.invoiceNo):undefined}
    action={ii.invoiceId?<FKAction dir="back" Icon={Receipt} color={C.gold} onClick={openInvoiceDetails}>عرض تفاصيل الفاتورة</FKAction>:undefined}/>}/>
}
// ── النافذة الموحّدة (منبثقة بالوسط، ارتفاع ثابت، بلا سكرول) — ويزارد متحكَّم:
//    المنطق (goNext/goBack/التحقق) يبقى كما هو، والكروم كله من FormKit Modal.
return (()=>{
const titles=['الخدمة','العميل','التفاصيل','الفاتورة','الدفع']
let curTitle=step===2&&step2Mode==='worker'?'العامل':(titles[step-1]||'')
// Kafala transfer reorders steps 2↔3: quote (التفاصيل) first, then the client (العميل) party step.
if(selSvc==='kafala_transfer'){if(step===2)curTitle='التفاصيل';else if(step===3)curTitle='العميل'}
if(step===5&&showSummaryScreen)curTitle='الملخص'
if(step===5&&showBrokerNoteScreen)curTitle=showBroker?'الوسيط والملاحظات':'ملاحظة'
if(step===4&&kafalaPayStep)curTitle='طريقة الدفع'
const svcMeta=selSvc?ALL_SERVICES.find(s=>s.id===selSvc):null
const body=(
<div className="sr-body" style={{flex:1,minHeight:0,display:'flex',flexDirection:'column',justifyContent:'flex-start',fontFamily:F,direction:'rtl'}}>
<style>{`/* مسافة علوية ثابتة فوق أول إطار في كل خطوة — مقيّدة بجسم طلب الخدمة فقط.
   جذر المحتوى (بعد وسم style المتصدّر) وأول إطار داخله (حتى عمق مستويين) يُصفّر هامشه العلوي،
   فيقع الإطار ملاصقاً لأعلى المحتوى والمسافة تأتي فقط من هامش المغلّف (4px) — نفس القيمة في كل الخطوات. */
.sr-body>style~*{margin-top:0!important}
.sr-body>style~*>*:first-child{margin-top:0!important}
.sr-body>style~*>*:first-child>*:first-child{margin-top:0!important}
.sr-modal-scroll::-webkit-scrollbar{width:0;display:none}.sr-modal-scroll{scrollbar-width:none;-ms-overflow-style:none}
input[type=number].sr-no-spin::-webkit-outer-spin-button,input[type=number].sr-no-spin::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
input[type=number].sr-no-spin{-moz-appearance:textfield}
input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
input[type=number]{-moz-appearance:textfield}
.sr-visa-field{width:100%;height:44px;padding:0 36px;border:1.5px solid rgba(255,255,255,.1);border-radius:10px;font-family:${F};font-size:13px;font-weight:600;color:var(--tx);outline:none;background:rgba(255,255,255,.05);text-align:center;text-align-last:center;box-sizing:border-box;appearance:none;-webkit-appearance:none;-moz-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23ffffff60' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:14px center;cursor:pointer;transition:.2s}
.sr-visa-field:hover:not(:disabled){border-color:rgba(212,160,23,.3)}
.sr-visa-field:focus{border-color:${C.gold}}
.sr-visa-field:disabled{cursor:not-allowed;opacity:.5}
.sr-visa-field option{background:var(--modal-bg);color:var(--tx);text-align:center;direction:rtl}
.sr-visa-label{font-size:11px;font-weight:600;color:var(--tx4);margin-bottom:6px;display:block;text-align:center;font-family:${F}}
@keyframes niceFadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
.sr-next-btn,.sr-back-btn{height:40px;padding:0 6px;background:transparent;border:none;color:#D4A017;font-family:${F};font-size:16px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:10px;transition:.2s}
.sr-back-btn{color:var(--tx3)}
.sr-next-btn .nav-ico,.sr-back-btn .nav-ico{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);display:flex;align-items:center;justify-content:center;transition:.2s;color:#D4A017}
.sr-back-btn .nav-ico{background:rgba(255,255,255,.06);color:var(--tx3)}
.sr-next-btn:hover:not(:disabled) .nav-ico{background:#D4A017;color:#000}
.sr-back-btn:hover:not(:disabled){color:var(--tx)}
.sr-back-btn:hover:not(:disabled) .nav-ico{background:rgba(255,255,255,.14);color:var(--tx)}
.sr-next-btn:disabled,.sr-back-btn:disabled{opacity:.5;cursor:not-allowed}
.bento-card{padding:12px 10px;border-radius:12px;cursor:pointer;transition:all .2s;background:linear-gradient(180deg,#2A2A2A 0%,#222 100%);border:1px solid rgba(255,255,255,.06);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;position:relative;min-height:86px;box-shadow:0 2px 8px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.04);font-family:${F}}
.bento-card:hover{background:linear-gradient(180deg,rgba(212,160,23,.1) 0%,rgba(212,160,23,.04) 100%);border-color:rgba(212,160,23,.25)}
.bento-card.selected{background:linear-gradient(180deg,rgba(212,160,23,.18) 0%,rgba(212,160,23,.06) 100%);border-color:rgba(212,160,23,.5);box-shadow:inset 0 1px 0 rgba(212,160,23,.22)}
.bento-card.muted{opacity:.55}
.bento-card.muted:hover{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.1);opacity:.85}
.bento-icon{width:40px;height:40px;border-radius:10px;background:rgba(212,160,23,.08);display:flex;align-items:center;justify-content:center;transition:.2s}
.bento-card.muted .bento-icon{background:rgba(255,255,255,.04)}
.bento-label{font-size:13px;font-weight:500;color:rgba(255,255,255,.85);text-align:center;line-height:1.3;font-family:${F}}
.bento-card.muted .bento-label{color:rgba(255,255,255,.45)}
.bento-badge{position:absolute;top:8px;right:8px;font-size:10px;color:#D4A017;background:rgba(212,160,23,.12);padding:3px 10px;border-radius:6px;font-weight:600;font-family:${F}}
.bento-check{position:absolute;top:8px;left:8px;width:22px;height:22px;border-radius:50%;background:#D4A017;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(212,160,23,.35)}
.bill-dot{position:absolute;top:8px;left:8px;padding:1px 7px;border-radius:4px;background:transparent;border:1.2px dashed rgba(60,192,101,.5);color:#3cc065;font-family:${F};font-size:9px;font-weight:600;transition:.2s;cursor:help}
.bill-dot[data-tip]::after{content:attr(data-tip);position:absolute;top:calc(100% + 8px);left:-4px;transform:translateY(-4px);background:var(--modal-bg);color:#D4A017;border:1px solid rgba(212,160,23,.35);padding:5px 11px;border-radius:7px;font-size:10.5px;font-weight:600;font-family:${F};white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .18s,transform .18s;box-shadow:0 6px 18px rgba(0,0,0,.5);z-index:30;letter-spacing:0}
.bill-dot[data-tip]::before{content:'';position:absolute;top:calc(100% + 3px);left:8px;transform:translateY(-4px);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:5px solid rgba(212,160,23,.45);opacity:0;pointer-events:none;transition:opacity .18s,transform .18s;z-index:30}
.bill-dot[data-tip]:hover::after,.bill-dot[data-tip]:hover::before{opacity:1;transform:translateY(0)}
.bento-card:hover .bill-dot,.bento-card.selected .bill-dot,.sub-card:hover .bill-dot,.sub-card.selected .bill-dot{border-color:rgba(60,192,101,.8);color:#4cd075}
.bento-sub{font-size:10px;color:rgba(255,255,255,.4);font-family:${F};direction:ltr;letter-spacing:.2px}`}</style>

{/* الترويسة + شريط التقدّم + عنوان الخطوة + التذييل: كلها من FormKit Modal الآن */}

{/* ═══ Step 1: Choose Service (Bento Grid) ═══ */}
{step===1&&<div style={{flex:1,display:'flex',flexDirection:'column',minHeight:0}}>
<style>{`
.bento-card{padding:12px 10px;border-radius:12px;cursor:pointer;transition:all .2s;background:linear-gradient(180deg,#2A2A2A 0%,#222 100%);border:1px solid rgba(255,255,255,.06);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;position:relative;min-height:86px;box-shadow:0 2px 8px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.04)}
.bento-card:hover{background:linear-gradient(180deg,rgba(212,160,23,.1) 0%,rgba(212,160,23,.04) 100%);border-color:rgba(212,160,23,.25)}
.bento-card.selected{background:linear-gradient(180deg,rgba(212,160,23,.18) 0%,rgba(212,160,23,.06) 100%);border-color:rgba(212,160,23,.5);box-shadow:inset 0 1px 0 rgba(212,160,23,.22)}
.bento-card.muted{opacity:.55}
.bento-card.muted:hover{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.1);opacity:.85}
.bento-icon{width:40px;height:40px;border-radius:10px;background:rgba(212,160,23,.08);display:flex;align-items:center;justify-content:center;transition:.2s}
.bento-card.muted .bento-icon{background:rgba(255,255,255,.04)}
.bento-label{font-size:13px;font-weight:500;color:rgba(255,255,255,.85);text-align:center;line-height:1.3;font-family:${F}}
.bento-card.muted .bento-label{color:rgba(255,255,255,.45)}
.bento-badge{position:absolute;top:8px;right:8px;font-size:10px;color:#D4A017;background:rgba(212,160,23,.12);padding:3px 10px;border-radius:6px;font-weight:600;font-family:${F}}
.bill-dot{position:absolute;top:8px;left:8px;padding:1px 7px;border-radius:4px;background:transparent;border:1.2px dashed rgba(60,192,101,.5);color:#3cc065;font-family:${F};font-size:9px;font-weight:600;transition:.2s;cursor:help}
.bill-dot[data-tip]::after{content:attr(data-tip);position:absolute;top:calc(100% + 8px);left:-4px;transform:translateY(-4px);background:var(--modal-bg);color:#D4A017;border:1px solid rgba(212,160,23,.35);padding:5px 11px;border-radius:7px;font-size:10.5px;font-weight:600;font-family:${F};white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .18s,transform .18s;box-shadow:0 6px 18px rgba(0,0,0,.5);z-index:30;letter-spacing:0}
.bill-dot[data-tip]::before{content:'';position:absolute;top:calc(100% + 3px);left:8px;transform:translateY(-4px);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:5px solid rgba(212,160,23,.45);opacity:0;pointer-events:none;transition:opacity .18s,transform .18s;z-index:30}
.bill-dot[data-tip]:hover::after,.bill-dot[data-tip]:hover::before{opacity:1;transform:translateY(0)}
.bento-card:hover .bill-dot,.bento-card.selected .bill-dot,.sub-card:hover .bill-dot,.sub-card.selected .bill-dot{border-color:rgba(60,192,101,.8);color:#4cd075}
.sub-card .bill-dot{padding:0 5px;font-size:7px;top:6px;left:6px}
.sub-card{position:relative;padding:10px 6px;border-radius:12px;cursor:pointer;transition:all .2s;background:linear-gradient(180deg,#262626 0%,#1F1F1F 100%);border:1px solid rgba(255,255,255,.05);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:74px;box-shadow:0 2px 6px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.04)}
.sub-card:hover{background:linear-gradient(180deg,rgba(212,160,23,.08) 0%,rgba(212,160,23,.03) 100%);border-color:rgba(212,160,23,.22)}
.sub-card:hover .sub-label{color:rgba(255,255,255,.85)}
.sub-card.selected{background:linear-gradient(180deg,rgba(212,160,23,.15) 0%,rgba(212,160,23,.05) 100%);border-color:rgba(212,160,23,.45);box-shadow:inset 0 1px 0 rgba(212,160,23,.2)}
.sub-card.selected .sub-label{color:#D4A017}
.sub-card.selected .sub-icon{color:#D4A017!important}
.sub-label{font-size:12px;color:rgba(255,255,255,.6);text-align:center;line-height:1.3;font-family:${F};transition:.2s}
.sub-card.custom{border:1px dashed rgba(212,160,23,.25);background:rgba(255,255,255,.015)}
.sub-card.custom:hover{border-color:rgba(212,160,23,.5);background:rgba(212,160,23,.04)}
.sub-card.custom .sub-label{color:rgba(212,160,23,.55)}
.sub-card.custom.selected{border-style:solid;border-color:rgba(212,160,23,.5);background:rgba(212,160,23,.1)}
.sub-card.custom.selected .sub-label{color:#D4A017}
.sub-card.muted{border-color:rgba(255,255,255,.06);opacity:.55}
.sub-card.muted .sub-label{color:rgba(255,255,255,.45)}
.sub-card.muted:hover{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.1);opacity:.85}
`}</style>

{/* Animated view container — fills available space */}
<ModalSection flex Icon={FileStack} label="اختر الخدمة" hint="الخدمة المطلوبة في الفاتورة" style={{marginTop:0}}>
<div style={{position:'relative',flex:1,minHeight:260}}>

{/* ─── Main Bento Grid View ─── */}
<div style={{position:'absolute',inset:0,opacity:showOthers?0:1,transform:showOthers?'translateX(20px)':'translateX(0)',transition:'opacity .3s, transform .3s',pointerEvents:showOthers?'none':'auto'}}>
<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,height:'100%',gridAutoRows:'1fr'}}>
{MAIN_SERVICES.map(s=>{const I=s.Icon;const sel=selSvc===s.id;const active=isServiceActive(s.id);const billable=isServiceBillable(s.id)
return<div key={s.id} className={`bento-card${sel?' selected':''}${!active?' disabled-card':''}`} onClick={()=>{if(active)setSelSvc(s.id)}} style={!active?{opacity:.45,cursor:'not-allowed',filter:'grayscale(.6)'}:{}}>
{!billable&&active&&<div className="bill-dot" data-tip="خدمة مجانية">مجانية</div>}
{!active&&<div className="bill-dot" style={{borderColor:'rgba(192,57,43,.6)',color:'#e66659'}} data-tip="معطّلة">معطّلة</div>}
<div className="bento-icon"><I size={22} color={C.bentoGold} strokeWidth={1.5}/></div>
<div className="bento-label">{s.name_ar}</div>
</div>})}
<div className="bento-card muted" onClick={()=>setShowOthers(true)} style={{gridColumn:'span 3'}}>
<div className="bento-icon"><Ellipsis size={22} color="rgba(255,255,255,.4)" strokeWidth={1.5}/></div>
<div className="bento-label">خدمات أخرى</div>
<div style={{fontSize:10,color:'rgba(255,255,255,.35)',fontFamily:F}}>{OTHER_SERVICES.length} خدمات</div>
</div>
</div>
</div>

{/* ─── Others View (3-column grid) ─── */}
<div style={{position:'absolute',inset:0,opacity:showOthers?1:0,transform:showOthers?'translateX(0)':'translateX(-20px)',transition:'opacity .3s, transform .3s',pointerEvents:showOthers?'auto':'none',display:'flex',flexDirection:'column',gap:6}}>
<div style={{flex:1,minHeight:0,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,gridAutoRows:'1fr'}}>
{/* رجوع للخدمات الرئيسية — نفس حجم/مكان كرت الخدمة، بألوان خطوط وأيقونة خافتة مثل كرت "خدمات أخرى" */}
<div onClick={()=>setShowOthers(false)} className="sub-card muted">
<ArrowRight className="sub-icon" size={22} color="rgba(255,255,255,.4)" strokeWidth={1.5}/>
<div className="sub-label">الرئيسية</div>
</div>
{OTHER_SERVICES.map(s=>{const I=s.Icon;const sel=selSvc===s.id;const active=isServiceActive(s.id);const billable=isServiceBillable(s.id)
return<div key={s.id} className={`sub-card${sel?' selected':''}`} onClick={()=>{if(active)setSelSvc(s.id)}} style={!active?{opacity:.45,cursor:'not-allowed',filter:'grayscale(.6)'}:{}}>
{!billable&&active&&<div className="bill-dot" data-tip="خدمة مجانية">مجانية</div>}
{!active&&<div className="bill-dot" style={{borderColor:'rgba(192,57,43,.6)',color:'#e66659'}} data-tip="معطّلة">معطّلة</div>}
<I className="sub-icon" size={22} color="#8a7a4a" strokeWidth={1.5}/>
<div className="sub-label">{s.name_ar}</div>
</div>})}
</div>

</div>

</div>
</ModalSection>
</div>}

{/* ═══ Step 2: Client & Worker ═══ */}
{((step===2&&selSvc!=='kafala_transfer')||(step===3&&selSvc==='kafala_transfer'))&&<ModalSection flex Icon={User} label={step2Mode==='worker'?'العامل':'العميل'} hint="بيانات الأطراف" style={{marginTop:8}}><div className="sr-modal-scroll" style={{display:'flex',flexDirection:'column',flex:1,minHeight:0,overflowY:'auto',overflowX:'hidden'}}>
{step2Mode==='client'&&<div style={{display:'flex',flexDirection:'column',flex:1,minHeight:0}}>

{/* علاقة العميل↔العامل صارت لوحة ذكية أسفل العميل المختار (انظر أدناه) — لا تشيك بوكس علوي */}

{/* ─── Kafala (inverted): worker comes from the chosen quote — ask whether the client is the same person ─── */}
{selSvc==='kafala_transfer'&&(()=>{
const qt=selKafalaQuote||{}
const note=qt._notes||qt._meta||{}
const wName=qt.worker_name||'—'
const wIq=qt.iqama_number||''
const wPh=String(qt.phone||note.phone||'').replace(/^\+?966/,'')
const pick=async(same)=>{
setKafalaSameClient(same)
if(same){
setWorkerIsClient(true)
setSelClient(null)
setKafalaClientLoading(true)
// Link an existing client by national id only; otherwise create one from the quote's worker data.
const orParts=[]
if(wIq)orParts.push(`id_number.eq.${wIq}`)
let mc=null
// Keep the spinner visible for a perceptible moment even when the lookup returns instantly.
const minDelay=new Promise(r=>setTimeout(r,450))
if(orParts.length){try{const{data}=await sb.from('clients').select('id,name_ar,name_en,id_number,phone,nationality_id').or(orParts.join(',')).is('deleted_at',null).limit(1);mc=data&&data[0]}catch{}}
await minDelay
if(mc){setSelClient(mc);setClientMode('existing')}
else{setSelClient(null);setClientMode('new');setNewClient(p=>({...p,name_ar:/[؀-ۿ]/.test(wName)?wName:p.name_ar,name_en:/^[A-Za-z\s]+$/.test(wName)?wName:p.name_en,id_number:wIq||p.id_number,phone:wPh||p.phone,nationality_id:note.nationality_id||p.nationality_id}))}
setKafalaClientLoading(false)
}else{setKafalaClientLoading(false);setWorkerIsClient(false);setSelClient(null);setClientMode('existing')}
}
return<div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:10}}>
<span style={{fontSize:11,fontWeight:600,color:'var(--tx4)',fontFamily:F}}>هل العميل هو نفس العامل؟</span>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
{[{v:true,t:'العميل هو نفس العامل',sub:'يُربط/يُنشأ تلقائياً من بيانات العامل',Icon:User},{v:false,t:'عميل مختلف',sub:'حدّد أو سجّل العميل بالأسفل',Icon:Users}].map(opt=>{const act=kafalaSameClient===opt.v;const I=opt.Icon;return<div key={String(opt.v)} onClick={()=>pick(opt.v)} style={{cursor:'pointer',padding:'11px 13px',borderRadius:11,display:'flex',alignItems:'center',gap:10,transition:'.18s',border:act?'1px solid rgba(212,160,23,.45)':'1px solid rgba(255,255,255,.07)',background:act?'linear-gradient(135deg,rgba(212,160,23,.12),rgba(255,255,255,.02))':'rgba(255,255,255,.025)'}}>
<div style={{width:32,height:32,borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,background:act?'rgba(212,160,23,.18)':'rgba(0,0,0,.2)',border:act?'1px solid rgba(212,160,23,.4)':'1px solid rgba(255,255,255,.06)'}}><I size={16} strokeWidth={1.9} color={act?C.bentoGold:'var(--tx4)'}/></div>
<div style={{display:'flex',flexDirection:'column',gap:2,minWidth:0,flex:1}}><span style={{fontSize:12,fontWeight:600,color:act?C.gold:'var(--tx2)'}}>{opt.t}</span><span style={{fontSize:9,fontWeight:600,color:'var(--tx5)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{opt.sub}</span></div>
{act&&<div style={{width:18,height:18,borderRadius:'50%',background:C.bentoGold,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>}
</div>})}
</div>
{kafalaSameClient===true&&!kafalaClientLoading&&<div style={{fontSize:10,fontWeight:600,color:C.bentoGold,display:'inline-flex',alignItems:'center',gap:5}}><BadgeCheck size={12} strokeWidth={2}/>{selClient?'تم ربط العميل المسجّل تلقائياً':'سيُسجّل العميل تلقائياً من بيانات العامل'}</div>}
</div>
})()}

{/* Resolving the worker→client link — show a spinner before the card appears */}
{selSvc==='kafala_transfer'&&kafalaSameClient===true&&kafalaClientLoading&&!selClient&&<Spinner label="جارٍ ربط العميل من بيانات العامل..." style={{borderRadius:16,border:'1px solid rgba(212,160,23,.18)',background:'linear-gradient(135deg,rgba(212,160,23,.05),rgba(255,255,255,.01))'}}/>}

{/* Unified search — hidden once a client is selected or in new-client mode */}
{(selSvc!=='kafala_transfer'||kafalaSameClient===false)&&!selClient&&clientMode!=='new'&&<>
<div style={{display:'flex',alignItems:'stretch',gap:8,marginBottom:(clientQ&&filteredClients.length===0)?16:14}}>
<div style={{position:'relative',flex:1,minWidth:0}}>
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{position:'absolute',top:'50%',left:14,transform:'translateY(-50%)',pointerEvents:'none',transition:'stroke .2s'}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
<input value={clientQ} onChange={e=>{setClientQ(e.target.value);setClientMode('existing')}} placeholder="ابحث بالاسم (عربي/إنجليزي) أو الجوال أو رقم الهوية..." onFocus={e=>{e.currentTarget.style.borderColor=C.bentoGold;e.currentTarget.style.boxShadow=`0 0 0 1px ${C.bentoGold}33, inset 0 1px 2px rgba(0,0,0,.2)`;e.currentTarget.previousElementSibling.style.stroke=C.bentoGold}} onBlur={e=>{e.currentTarget.style.borderColor='transparent';e.currentTarget.style.boxShadow='inset 0 1px 2px rgba(0,0,0,.2)';e.currentTarget.previousElementSibling.style.stroke='rgba(255,255,255,.35)'}} style={{...fkSF,padding:'0 14px 0 40px',textAlign:'right',border:'1px solid transparent'}}/>
</div>
{clientMode!=='new'&&<button onClick={()=>{setClientMode('new');setNewClient(p=>({...p,name_ar:/[\u0600-\u06FF]/.test(clientQ)?clientQ:p.name_ar,name_en:/^[A-Za-z\s]+$/.test(clientQ)?clientQ:p.name_en,phone:/^[0-9+]+$/.test(clientQ)?clientQ:p.phone,id_number:/^\d{10}$/.test(clientQ)?clientQ:p.id_number}))}} style={{height:42,padding:'0 14px',background:'transparent',border:'1.3px dashed rgba(212,160,23,.55)',borderRadius:9,color:C.bentoGold,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6,flexShrink:0,transition:'.15s',whiteSpace:'nowrap'}} onMouseEnter={e=>{e.currentTarget.style.background='rgba(212,160,23,.07)';e.currentTarget.style.borderColor='rgba(212,160,23,.85)'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='rgba(212,160,23,.55)'}}>
<span>عميل جديد</span>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
</button>}
</div>
</>}

{/* Mode: existing (show results / selected client) */}
{(selSvc!=='kafala_transfer'||kafalaSameClient!==null)&&clientMode==='existing'&&!(selSvc==='kafala_transfer'&&kafalaSameClient===true&&!selClient)&&<div>
{filteredClients.length>0?<div style={{display:'flex',flexDirection:'column',gap:8}}>
{(selClient?[selClient]:filteredClients).map(c=>{
const sel=selClient?.id===c.id
const country=(c.nationality_id?lkCountries.find(co=>co.id===c.nationality_id):null)||(workers.find(w=>w.iqama_number===c.id_number)?.country)||null
const flagUrl=natFlagUrl(country)
const natLabel=country?.nationality_ar||'—'
// خلفية زجاجية موحّدة
const G={base:'linear-gradient(135deg,rgba(255,255,255,.05),rgba(255,255,255,.012))',baseB:'rgba(255,255,255,.08)',hover:'linear-gradient(135deg,rgba(212,160,23,.08),rgba(255,255,255,.02))',hoverB:'rgba(212,160,23,.25)',sel:'linear-gradient(135deg,rgba(212,160,23,.12),rgba(255,255,255,.02))',selB:'rgba(212,160,23,.4)'}
const onEnter=e=>{if(!sel){e.currentTarget.style.background=G.hover;e.currentTarget.style.borderColor=G.hoverB}}
const onLeave=e=>{if(!sel){e.currentTarget.style.background=G.base;e.currentTarget.style.borderColor=G.baseB}}
const handleClick=()=>{const mw=workers.find(w=>w.iqama_number===c.id_number);setSelClient(c);setClientMode('existing');if(mw){setSelWorker(mw);setWorkerIsClient(true)}else{setSelWorker(null);setWorkerIsClient(false)}}
const deselect=e=>{if(e)e.stopPropagation();setSelClient(null);setWorkerIsClient(false);setSelWorker(null)}
const infoBox=(Icon,label,val)=><div style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:9,background:'rgba(0,0,0,.18)',border:'1px solid rgba(255,255,255,.05)',minWidth:0}}><Icon size={13} color={C.bentoGold} strokeWidth={1.8}/><div style={{display:'flex',flexDirection:'column',gap:2,minWidth:0}}><span style={{fontSize:9,color:'var(--tx5)',fontWeight:600}}>{label}</span><span style={{fontSize:12,color:'var(--tx)',fontWeight:600,direction:'ltr',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{val}</span></div></div>
const flagEl=size=><div title={natLabel} style={{width:size,height:size,borderRadius:12,background:'rgba(0,0,0,.25)',border:sel?'1.5px solid rgba(212,160,23,.4)':'1px solid rgba(255,255,255,.08)',flexShrink:0,transition:'.25s',boxShadow:sel?'0 2px 8px rgba(212,160,23,.15)':'none',position:'relative',overflow:'hidden'}}>{flagUrl?<img src={flagUrl} alt={natLabel} loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>:<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}><Globe size={Math.round(size*.42)} strokeWidth={1.6} color="rgba(255,255,255,.35)"/></div>}</div>
const nameBlock=<div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:3}}><span style={{fontSize:15.5,fontWeight:600,color:sel?C.gold:'rgba(255,255,255,.95)',letterSpacing:'-.2px'}}>{c.name_ar||c.name_en||'—'}</span>{c.name_ar&&c.name_en&&<span style={{fontSize:11,color:'var(--tx5)',fontWeight:600,direction:'ltr',opacity:.7}}>{c.name_en}</span>}</div>
const boxes=<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>{c.id_number&&infoBox(CreditCard,'رقم الهوية',c.id_number)}{c.phone&&infoBox(Phone,'الجوال',fmtPhone(c.phone))}</div>
const wrapSel={position:'relative',border:`1px solid ${G.selB}`,background:G.sel,boxShadow:'0 4px 16px rgba(0,0,0,.28)',transition:'all .22s ease',padding:'14px',borderRadius:16,display:'flex',flexDirection:'column',gap:12}
const xIcon=<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>

// مُختار — أيقونة زاوية: زر إلغاء أحمر بالزاوية + شارة «محدد» بجانب الاسم
if(sel)return<div key={c.id} style={wrapSel}>
{!(selSvc==='kafala_transfer'&&kafalaSameClient===true)&&<button onClick={deselect} title="تغيير العميل" style={{position:'absolute',top:8,left:8,width:28,height:28,borderRadius:8,background:'rgba(192,57,43,.12)',border:'1px solid rgba(192,57,43,.35)',color:C.red,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',zIndex:2,transition:'.15s'}} onMouseEnter={e=>{e.currentTarget.style.background='rgba(192,57,43,.22)'}} onMouseLeave={e=>{e.currentTarget.style.background='rgba(192,57,43,.12)'}}>{xIcon}</button>}
<div style={{display:'flex',alignItems:'center',gap:14}}>{flagEl(48)}<div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:4}}><div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}><span style={{fontSize:15.5,fontWeight:600,color:C.gold,letterSpacing:'-.2px'}}>{c.name_ar||c.name_en||'—'}</span><span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:9.5,fontWeight:600,color:C.bentoGold,background:'rgba(212,160,23,.12)',border:'1px solid rgba(212,160,23,.3)',borderRadius:20,padding:'2px 8px'}}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>محدد</span></div>{c.name_ar&&c.name_en&&<span style={{fontSize:11,color:'var(--tx5)',fontWeight:600,direction:'ltr',opacity:.7}}>{c.name_en}</span>}</div></div>
{boxes}
</div>
// غير مُختار — بطاقة معلومات قابلة للضغط للاختيار
return<div key={c.id} onClick={handleClick} onMouseEnter={onEnter} onMouseLeave={onLeave}
style={{cursor:'pointer',position:'relative',border:`1px solid ${G.baseB}`,background:G.base,boxShadow:'0 4px 16px rgba(0,0,0,.28)',transition:'all .22s ease',padding:'14px',borderRadius:16,display:'flex',flexDirection:'column',gap:12}}>
<div style={{display:'flex',alignItems:'center',gap:14}}>{flagEl(48)}{nameBlock}</div>
{boxes}
</div>})}
</div>
:<div style={{padding:'24px 20px',borderRadius:9,background:'transparent',border:'1px dashed rgba(255,255,255,.1)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8}}>
<div style={{width:42,height:42,borderRadius:'50%',background:'rgba(212,160,23,.08)',border:'1px dashed rgba(212,160,23,.3)',display:'flex',alignItems:'center',justifyContent:'center'}}>
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(212,160,23,.65)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
</div>
<div style={{fontSize:12.5,color:'var(--tx2)',fontWeight:600,fontFamily:F}}>لا يوجد عميل بهذا البحث</div>
<div style={{fontSize:10.5,color:'var(--tx5)',fontWeight:500,fontFamily:F}}>يمكنك إضافة عميل جديد من الأعلى</div>
</div>}
</div>}

{/* ─── العامل (ربط ذكي) — يظهر بعد اختيار العميل للخدمات التي تتطلب عاملاً ─── */}
{selClient&&clientMode==='existing'&&!VISA_SERVICES.has(selSvc)&&selSvc!=='kafala_transfer'&&(()=>{
const matched=workers.find(w=>w.iqama_number===selClient.id_number)
const setSame=(val)=>{setWorkerIsClient(val);if(val){setSelWorker(matched||null);setClientMode('existing')}else{setSelWorker(null)}}
return<div style={{marginTop:12,display:'flex',flexDirection:'column',gap:8}}>
<span style={{fontSize:11,fontWeight:600,color:C.gold,fontFamily:F}}>العامل</span>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
{[{v:true,t:'هو نفسه العميل',sub:matched?'تم العثور على سجل عامل مطابق':'لا يوجد سجل عامل مسجّل',Icon:User},{v:false,t:'شخص مختلف',sub:'يُحدَّد في الخطوة التالية',Icon:Users}].map(opt=>{const act=workerIsClient===opt.v;const I=opt.Icon;return<div key={String(opt.v)} onClick={()=>setSame(opt.v)} style={{cursor:'pointer',padding:'11px 13px',borderRadius:11,display:'flex',alignItems:'center',gap:10,transition:'.18s',border:act?'1px solid rgba(212,160,23,.45)':'1px solid rgba(255,255,255,.07)',background:act?'linear-gradient(135deg,rgba(212,160,23,.12),rgba(255,255,255,.02))':'rgba(255,255,255,.025)'}}>
<div style={{width:32,height:32,borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,background:act?'rgba(212,160,23,.18)':'rgba(0,0,0,.2)',border:act?'1px solid rgba(212,160,23,.4)':'1px solid rgba(255,255,255,.06)'}}><I size={16} strokeWidth={1.9} color={act?C.bentoGold:'var(--tx4)'}/></div>
<div style={{display:'flex',flexDirection:'column',gap:2,minWidth:0,flex:1}}><span style={{fontSize:12,fontWeight:600,color:act?C.gold:'var(--tx2)'}}>{opt.t}</span><span style={{fontSize:9,fontWeight:600,color:'var(--tx5)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{opt.sub}</span></div>
{act&&<div style={{width:18,height:18,borderRadius:'50%',background:C.bentoGold,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>}
</div>})}
</div>
{workerIsClient&&matched&&<div style={{fontSize:10,fontWeight:600,color:C.bentoGold,display:'inline-flex',alignItems:'center',gap:5}}><BadgeCheck size={12} strokeWidth={2}/>تم ربط العامل تلقائياً من بيانات العميل</div>}
</div>
})()}

{/* العامل=العميل: تفاصيل العامل ومنشأته لا تُعرض هنا — تظهر كاملةً في خطوة «العامل» التالية (تجنّب التكرار) */}

{workerIsClient&&selClient&&!selWorker&&selSvc!=='kafala_transfer'&&<div style={{marginTop:10,padding:'10px 13px',borderRadius:10,background:'rgba(230,126,34,.06)',border:'1px dashed rgba(230,126,34,.25)',color:'#e67e22',fontSize:10.5,fontWeight:600,textAlign:'center',display:'flex',alignItems:'center',justifyContent:'center',gap:7}}>
<AlertCircle size={13} strokeWidth={2}/>لا يوجد سجل عامل لهذا العميل، ولا يمكن المتابعة. بيانات العمّال تُدخل من قسم العمالة — اختر «شخص مختلف» وحدّد عاملاً مسجّلاً.
</div>}

{/* Mode: new client form — for kafala, only when the client is a different person (the «same» case auto-creates silently) */}
{(selSvc!=='kafala_transfer'||kafalaSameClient===false)&&clientMode==='new'&&(()=>{
const onCancel=()=>{setClientMode('existing');setClientQ('');setNewClient({name_ar:'',name_en:'',phone:'',id_number:'',nationality_id:''});setNatOpenClient(false);setNatSearchClient('')}
const fields=(<div style={FKGRID}>
{/* الاسم — يُخفى عند «هو نفسه العميل» (يأتي تلقائياً من سجل العامل المطابق) */}
{!workerIsClient&&(()=>{
const cur=newClient.name_ar||newClient.name_en||''
const isAr=/[؀-ۿ]/.test(cur)
const handle=(raw)=>{
let v=raw.replace(/[^؀-ۿA-Za-z\s]/g,'').replace(/\s+/g,' ').replace(/^\s+/,'')
const parts=v.split(' ')
if(parts.length>2) v=parts.slice(0,2).join(' ')
const isArNow=/[؀-ۿ]/.test(v)
setNewClient(p=>({...p, name_ar: isArNow?v:'' , name_en: !isArNow&&v?v:''}))
}
return <FKField label="الاسم" req>
<input value={cur} onChange={e=>handle(e.target.value)} placeholder="اسمين — عربي أو إنجليزي" style={{...fkSF,direction:isAr?'rtl':(cur?'ltr':'rtl')}}/>
</FKField>
})()}
{/* الجنسية — تُخفى عند «هو نفسه العميل» (تأتي تلقائياً من سجل العامل المطابق) */}
{!workerIsClient&&<FKSelect label="الجنسية" req placeholder="اختر الجنسية..."
value={newClient.nationality_id||null}
onChange={(id)=>setNewClient(p=>({...p,nationality_id:id||null}))}
options={lkCountries} getKey={o=>o.id} getLabel={o=>o.nationality_ar} getSub={o=>o.nationality_en||''}
renderSelected={o=>{const u=natFlagUrl(o);return <span style={{display:'inline-flex',alignItems:'center',gap:8}}>{o.nationality_ar}{u&&<img src={u} alt="" width={16} height={12} style={{borderRadius:2,objectFit:'cover'}}/>}</span>}}
renderCell={(o,sel)=>{const u=natFlagUrl(o);return <span style={{fontSize:14,fontWeight:600,color:sel?C.bentoGold:'rgba(255,255,255,.92)',display:'inline-flex',alignItems:'center',gap:8}}>{o.nationality_ar}{u&&<img src={u} alt="" width={16} height={12} style={{borderRadius:2,objectFit:'cover'}}/>}</span>}}
/>}
{/* الهوية — silent: لا يحمرّ الحقل؛ التحقق يظهر في الشريط السفلي */}
<FKId silent label="الهوية" req value={newClient.id_number} onChange={v=>setNewClient(p=>({...p,id_number:v}))}/>
{/* رقم الجوال — silent: لا يحمرّ الحقل؛ التحقق يظهر في الشريط السفلي */}
<FKPhone silent label="رقم الجوال" req value={newClient.phone} onChange={v=>setNewClient(p=>({...p,phone:v}))}/>
</div>)
const title=<span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:13,fontWeight:600,color:C.bentoGold,fontFamily:F}}><Plus size={14} strokeWidth={2.5}/>تسجيل عميل جديد</span>
const cancel=<button onClick={onCancel} style={{height:34,padding:'0 14px',background:'transparent',border:'1.3px dashed rgba(192,57,43,.55)',borderRadius:9,color:C.red,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6,flexShrink:0,transition:'.15s',whiteSpace:'nowrap'}} onMouseEnter={e=>{e.currentTarget.style.background='rgba(192,57,43,.07)';e.currentTarget.style.borderColor='rgba(192,57,43,.85)'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='rgba(192,57,43,.55)'}}><span>إلغاء</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>

// بطاقة محايدة ناعمة (حدّ رمادي خفيف، لا ذهبي — فلا ينافس الإطار الخارجي)
return <div style={{marginTop:6,background:'rgba(255,255,255,.025)',border:'1px solid rgba(255,255,255,.06)',borderRadius:12,padding:14}}>
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>{title}{cancel}</div>
{fields}
</div>
})()}

{/* العامل لعميل جديد — نفس منطق العميل المسجّل: يبحث عن عامل مسجّل بنفس رقم الهوية/الإقامة (لا يُنشئ عاملاً جديداً) */}
{clientMode==='new'&&!VISA_SERVICES.has(selSvc)&&selSvc!=='kafala_transfer'&&(()=>{
const validId=newClient.id_number&&newClient.id_number.length===10
const matched=validId?workers.find(w=>w.iqama_number===newClient.id_number):null
const setSame=(val)=>{setWorkerIsClient(val);if(val){setSelWorker(matched||null)}else{setSelWorker(null)}}
return<div style={{marginTop:12,display:'flex',flexDirection:'column',gap:8}}>
<span style={{fontSize:11,fontWeight:600,color:C.gold,fontFamily:F}}>العامل</span>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
{[{v:true,t:'هو نفسه العميل',sub:!validId?'أدخل رقم الهوية أولاً':(matched?'تم العثور على سجل عامل مطابق':'لا يوجد عامل بهذه البيانات'),Icon:User},{v:false,t:'شخص مختلف',sub:'يُحدَّد في الخطوة التالية',Icon:Users}].map(opt=>{const act=workerIsClient===opt.v;const I=opt.Icon;return<div key={String(opt.v)} onClick={()=>setSame(opt.v)} style={{cursor:'pointer',padding:'11px 13px',borderRadius:11,display:'flex',alignItems:'center',gap:10,transition:'.18s',border:act?'1px solid rgba(212,160,23,.45)':'1px solid rgba(255,255,255,.07)',background:act?'linear-gradient(135deg,rgba(212,160,23,.12),rgba(255,255,255,.02))':'rgba(255,255,255,.025)'}}>
<div style={{width:32,height:32,borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,background:act?'rgba(212,160,23,.18)':'rgba(0,0,0,.2)',border:act?'1px solid rgba(212,160,23,.4)':'1px solid rgba(255,255,255,.06)'}}><I size={16} strokeWidth={1.9} color={act?C.bentoGold:'var(--tx4)'}/></div>
<div style={{display:'flex',flexDirection:'column',gap:2,minWidth:0,flex:1}}><span style={{fontSize:12,fontWeight:600,color:act?C.gold:'var(--tx2)'}}>{opt.t}</span><span style={{fontSize:9,fontWeight:600,color:'var(--tx5)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{opt.sub}</span></div>
{act&&<div style={{width:18,height:18,borderRadius:'50%',background:C.bentoGold,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>}
</div>})}
</div>
{workerIsClient&&matched&&<div style={{fontSize:10,fontWeight:600,color:C.bentoGold,display:'inline-flex',alignItems:'center',gap:5}}><BadgeCheck size={12} strokeWidth={2}/>تم ربط العامل تلقائياً من بيانات العميل</div>}
{workerIsClient&&!matched&&<div style={{marginTop:2,padding:'10px 13px',borderRadius:10,background:'rgba(230,126,34,.06)',border:'1px dashed rgba(230,126,34,.25)',color:'#e67e22',fontSize:10.5,fontWeight:600,textAlign:'center',display:'flex',alignItems:'center',justifyContent:'center',gap:7}}><AlertCircle size={13} strokeWidth={2}/>لا يوجد عامل بنفس بيانات الهوية — اختر «شخص مختلف» وحدّد عاملاً مسجّلاً</div>}
</div>
})()}
</div>}

{/* ─── Worker View ─── */}
{step2Mode==='worker'&&<div>
{/* Search — hidden when a worker is already selected or in new-worker mode (mirrors client UI) */}
{!selWorker&&workerMode!=='new'&&<div style={{display:'flex',alignItems:'stretch',gap:8,marginBottom:(workerQ&&workerResults.length===0)?16:14}}>
<div style={{position:'relative',flex:1,minWidth:0}}>
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{position:'absolute',top:'50%',left:14,transform:'translateY(-50%)',pointerEvents:'none',transition:'stroke .2s'}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
<input value={workerQ} onChange={e=>{setWorkerQ(e.target.value);setWorkerMode('existing');setSelWorker(null)}} placeholder="ابحث بالاسم أو رقم الإقامة..." onFocus={e=>{e.currentTarget.style.borderColor=C.bentoGold;e.currentTarget.style.boxShadow=`0 0 0 1px ${C.bentoGold}33, inset 0 1px 2px rgba(0,0,0,.2)`;e.currentTarget.previousElementSibling.style.stroke=C.bentoGold}} onBlur={e=>{e.currentTarget.style.borderColor='transparent';e.currentTarget.style.boxShadow='inset 0 1px 2px rgba(0,0,0,.2)';e.currentTarget.previousElementSibling.style.stroke='rgba(255,255,255,.35)'}} style={{...fkSF,padding:'0 14px 0 40px',textAlign:'right',border:'1px solid transparent'}}/>
</div>
{false&&selSvc==='custom'&&<button onClick={()=>{setWorkerMode('new');setNewWorker(p=>({...p,name:/[\u0600-\u06FF\sA-Za-z]/.test(workerQ)?workerQ:p.name,phone:/^[0-9+]+$/.test(workerQ)?workerQ:p.phone,iqama_number:/^\d{10}$/.test(workerQ)?workerQ:p.iqama_number}))}} style={{height:42,padding:'0 14px',background:'transparent',border:'1.3px dashed rgba(212,160,23,.55)',borderRadius:9,color:C.bentoGold,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6,flexShrink:0,transition:'.15s',whiteSpace:'nowrap'}} onMouseEnter={e=>{e.currentTarget.style.background='rgba(212,160,23,.07)';e.currentTarget.style.borderColor='rgba(212,160,23,.85)'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='rgba(212,160,23,.55)'}}>
<span>عامل جديد</span>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
</button>}
</div>}

{/* Mode: existing worker */}
{workerMode==='existing'&&<div>
{workerResults.length>0?<div style={{display:'flex',flexDirection:'column',gap:8}}>
{(selWorker?[selWorker]:workerResults).map(w=>{
const sel=selWorker?.id===w.id
const flagUrl=natFlagUrl(w.country)
const natLabel=w.country?.nationality_ar||w.nationality||'—'
const nm=w.name_ar||w.name
// نفس تصميم كرت العميل: خلفية زجاجية + بطاقة معلومات، والمختار «أيقونة زاوية»
const G={base:'linear-gradient(135deg,rgba(255,255,255,.05),rgba(255,255,255,.012))',baseB:'rgba(255,255,255,.08)',hover:'linear-gradient(135deg,rgba(212,160,23,.08),rgba(255,255,255,.02))',hoverB:'rgba(212,160,23,.25)',sel:'linear-gradient(135deg,rgba(212,160,23,.12),rgba(255,255,255,.02))',selB:'rgba(212,160,23,.4)'}
const onEnter=e=>{if(!sel){e.currentTarget.style.background=G.hover;e.currentTarget.style.borderColor=G.hoverB}}
const onLeave=e=>{if(!sel){e.currentTarget.style.background=G.base;e.currentTarget.style.borderColor=G.baseB}}
const deselect=e=>{if(e)e.stopPropagation();setSelWorker(null)}
// Iqama-expiry status colors — mirror the expanded worker details below (expired/soon/ok/none).
const stColors={expired:'#c0392b',soon:'#e5b534',ok:'#27a046',none:'var(--tx5)'}
const infoBox=(Icon,label,val,valColor)=><div style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:9,background:'rgba(0,0,0,.18)',border:'1px solid rgba(255,255,255,.05)',minWidth:0}}><Icon size={13} color={valColor||C.bentoGold} strokeWidth={1.8}/><div style={{display:'flex',flexDirection:'column',gap:2,minWidth:0}}><span style={{fontSize:9,color:'var(--tx5)',fontWeight:600}}>{label}</span><span style={{fontSize:12,color:valColor||'var(--tx)',fontWeight:600,direction:'ltr',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{val}</span></div></div>
const flagEl=size=><div title={natLabel} style={{width:size,height:size,borderRadius:12,background:'rgba(0,0,0,.25)',border:sel?'1.5px solid rgba(212,160,23,.4)':'1px solid rgba(255,255,255,.08)',flexShrink:0,transition:'.25s',boxShadow:sel?'0 2px 8px rgba(212,160,23,.15)':'none',position:'relative',overflow:'hidden'}}>{flagUrl?<img src={flagUrl} alt={natLabel} loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>:<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}><Globe size={Math.round(size*.42)} strokeWidth={1.6} color="rgba(255,255,255,.35)"/></div>}</div>
const xIcon=<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
// مُختار — أيقونة زاوية (التفاصيل الغنية تظهر أسفله)
if(sel)return<div key={w.id} style={{position:'relative',border:`1px solid ${G.selB}`,background:G.sel,boxShadow:'0 4px 16px rgba(0,0,0,.28)',transition:'all .22s ease',padding:'14px',borderRadius:16,display:'flex',alignItems:'center',gap:14}}>
{!workerIsClient&&<button onClick={deselect} title="تغيير العامل" style={{position:'absolute',top:8,left:8,width:28,height:28,borderRadius:8,background:'rgba(192,57,43,.12)',border:'1px solid rgba(192,57,43,.35)',color:C.red,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',zIndex:2,transition:'.15s'}} onMouseEnter={e=>{e.currentTarget.style.background='rgba(192,57,43,.22)'}} onMouseLeave={e=>{e.currentTarget.style.background='rgba(192,57,43,.12)'}}>{xIcon}</button>}
{flagEl(48)}<div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:4}}><div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}><span style={{fontSize:15.5,fontWeight:600,color:C.gold,letterSpacing:'-.2px'}}>{nm}</span><span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:9.5,fontWeight:600,color:C.bentoGold,background:'rgba(212,160,23,.12)',border:'1px solid rgba(212,160,23,.3)',borderRadius:20,padding:'2px 8px'}}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>محدد</span></div>{w.name_en&&nm!==w.name_en&&<span style={{fontSize:11,color:'var(--tx5)',fontWeight:600,direction:'ltr',opacity:.7}}>{w.name_en}</span>}</div>
</div>
// غير مُختار — بطاقة معلومات زجاجية
return<div key={w.id} onClick={()=>setSelWorker(w)} onMouseEnter={onEnter} onMouseLeave={onLeave}
style={{cursor:'pointer',position:'relative',border:`1px solid ${G.baseB}`,background:G.base,boxShadow:'0 4px 16px rgba(0,0,0,.28)',transition:'all .22s ease',padding:'14px',borderRadius:16,display:'flex',flexDirection:'column',gap:12}}>
<div style={{display:'flex',alignItems:'center',gap:14}}>{flagEl(48)}<div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:3}}><span style={{fontSize:15.5,fontWeight:600,color:'rgba(255,255,255,.95)',letterSpacing:'-.2px'}}>{nm}</span>{w.name_en&&nm!==w.name_en&&<span style={{fontSize:11,color:'var(--tx5)',fontWeight:600,direction:'ltr',opacity:.7}}>{w.name_en}</span>}</div></div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>{w.iqama_number&&infoBox(CreditCard,'رقم الإقامة',w.iqama_number)}{infoBox(Calendar,'انتهاء الإقامة',fmtDate(w.iqama_expiry_date),stColors[dateStatus(w.iqama_expiry_date)])}{w.phone&&infoBox(Phone,'الجوال',fmtPhone(w.phone))}</div>
</div>})}

{/* ─── Selected Worker Expanded Details ─── */}
{selWorker&&(()=>{const w=selWorker;const stat=workerFacilityStat;const latestWP=[...(w.work_permits||[])].sort((a,b)=>new Date(b.wp_expiry_date||0)-new Date(a.wp_expiry_date||0))[0];const latestIns=[...(w.worker_insurance||[])].sort((a,b)=>new Date(b.end_date||0)-new Date(a.end_date||0))[0];const iqStat=dateStatus(w.iqama_expiry_date);const wpStat=dateStatus(latestWP?.wp_expiry_date);const insStat=dateStatus(latestIns?.end_date);const natName=w.country?.nationality_ar||w.nationality||'—';const natFlag=w.country?.flag_emoji||flagEmoji(w.country?.code)||flagEmoji(w.nationality);const ncMap={'platinum':'#E5E4E2','green':'#27a046','green_low':'#6bb77a','green_mid':'#3fa356','green_high':'#1e8c3a','green_top':'#0d6b25','yellow':'#e5b534','yellow_low':'#e5b534','yellow_high':'#c99a2a','red':'#c0392b'};const ncCode=stat?.nitaqat?.code;const ncLabel=stat?.nitaqat?.value_ar||'—';const ncColor=ncCode?(ncMap[ncCode]||'#888'):'#444';const pillBase={display:'flex',alignItems:'center',gap:8,padding:'8px 11px',borderRadius:9,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',fontSize:11,fontFamily:F,color:'var(--tx3)',minHeight:40};const lbl={fontSize:10,color:'var(--tx5)',fontWeight:600,letterSpacing:'.2px',lineHeight:1.2};const val={fontSize:13,color:'#fff',fontWeight:600,direction:'ltr',lineHeight:1.2,textAlign:'right'};const stColors={expired:'#c0392b',soon:'#e5b534',ok:'#27a046',none:'var(--tx5)'};const workerLabel=w.name_ar||w.name_en||w.name||'بيانات العامل';const facilityLabel=w.facility?.name_ar||'بيانات المنشأة';
return<>
{/* ─── Worker data fieldset ─── */}
<div style={{marginTop:19,padding:'14px 14px 12px',borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',position:'relative'}}>
<div style={{position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,maxWidth:'calc(100% - 28px)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{workerLabel}</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1.3fr 1fr 1fr',gap:10}}>
<div style={pillBase}>
<CreditCard size={12} color={C.bentoGold} strokeWidth={1.8}/>
<div style={{display:'flex',flexDirection:'column',gap:5,flex:1,minWidth:0}}><span style={lbl}>رقم الإقامة</span><span style={{...val}}>{w.iqama_number||'—'}</span></div>
{w.iqama_number&&<CopyBtn value={w.iqama_number}/>}
</div>
<div style={pillBase}>
<Briefcase size={12} color={C.bentoGold} strokeWidth={1.8}/>
<div style={{display:'flex',flexDirection:'column',gap:5,minWidth:0}}><span style={lbl}>المهنة</span><span style={{...val,fontFamily:F,direction:'rtl',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{w.occupation?.value_ar||'—'}</span></div>
</div>
<div style={pillBase}>
<Calendar size={12} color={stColors[iqStat]} strokeWidth={1.8}/>
<div style={{display:'flex',flexDirection:'column',gap:5}}><span style={lbl}>انتهاء الإقامة</span><span style={{...val,color:stColors[iqStat],direction:'ltr'}}>{fmtDate(w.iqama_expiry_date)}</span></div>
</div>
<div style={pillBase}>
<BadgeCheck size={12} color={stColors[wpStat]} strokeWidth={1.8}/>
<div style={{display:'flex',flexDirection:'column',gap:5}}><span style={lbl}>رخصة العمل</span><span style={{...val,color:stColors[wpStat],direction:'ltr'}}>{fmtDate(latestWP?.wp_expiry_date)}</span></div>
</div>
</div>
</div>

{/* ─── Facility data fieldset ─── */}
{w.facility&&<div style={{marginTop:19,padding:'14px 14px 12px',borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',position:'relative',display:'flex',flexDirection:'column',gap:8}}>
<div style={{position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,maxWidth:'calc(100% - 28px)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{facilityLabel}</div>
{/* Status badges row (nitaqat + wps) */}
{(ncCode||stat)&&<div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
{ncCode&&<span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:10,fontWeight:600,color:ncColor,padding:'3px 9px',borderRadius:999,background:`${ncColor}22`,border:`1px solid ${ncColor}55`,fontFamily:F,flexShrink:0}}>
<Circle size={7} fill={ncColor} stroke="none"/>
{ncLabel}
</span>}
{stat&&(stat.wps_has_notes===true?<span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:10,fontWeight:600,color:'#c0392b',padding:'3px 9px',borderRadius:999,background:'rgba(192,57,43,.12)',border:'1px solid rgba(192,57,43,.4)',fontFamily:F,flexShrink:0}}>
<AlertCircle size={10}/> ملاحظة قوى
</span>:stat.wps_has_notes===false?<span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:10,fontWeight:600,color:stColors.ok,padding:'3px 9px',borderRadius:999,background:'rgba(39,160,70,.1)',border:'1px solid rgba(39,160,70,.35)',fontFamily:F,flexShrink:0}}>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> قوى نظيف
</span>:null)}
</div>}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
<div style={pillBase}>
<Hash size={12} color={C.bentoGold} strokeWidth={1.8}/>
<div style={{display:'flex',flexDirection:'column',gap:5,flex:1,minWidth:0}}><span style={lbl}>الرقم الموحد</span><span style={{...val,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{w.facility.unified_national_number||'—'}</span></div>
{w.facility.unified_national_number&&<CopyBtn value={w.facility.unified_national_number}/>}
</div>
<div style={pillBase}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.bentoGold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>
<div style={{display:'flex',flexDirection:'column',gap:5,flex:1,minWidth:0}}><span style={lbl}>رقم الموارد البشرية</span><span style={{...val,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{w.facility.hrsd_number||'—'}</span></div>
{w.facility.hrsd_number&&<CopyBtn value={w.facility.hrsd_number}/>}
</div>
<div style={pillBase}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.bentoGold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"/></svg>
<div style={{display:'flex',flexDirection:'column',gap:5,flex:1,minWidth:0}}><span style={lbl}>رقم التأمينات</span><span style={{...val,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{w.facility.gosi_file_number||'—'}</span></div>
{w.facility.gosi_file_number&&<CopyBtn value={w.facility.gosi_file_number}/>}
</div>
</div>
</div>}
</>})()}

</div>
:<div style={{padding:14,borderRadius:10,background:'rgba(212,160,23,.05)',border:'1px dashed rgba(212,160,23,.25)',display:'flex',alignItems:'center',justifyContent:'center',gap:10,textAlign:'center'}}>
<div style={{fontSize:12,color:'var(--tx3)',fontWeight:600,lineHeight:1.6}}>{clientSelfId&&filteredWorkers.length>0&&workerResults.length===0?'هذا هو العميل نفسه — لا يمكن اختياره كعامل مختلف. ارجع لخطوة العميل واختر «هو نفسه العميل».':'لا يوجد عامل بهذا البحث'}</div>
</div>}
</div>}

{/* Mode: new worker form */}
{workerMode==='new'&&<div style={{borderRadius:12,border:'1.5px solid rgba(212,160,23,.22)',background:'rgba(212,160,23,.03)',padding:'14px 16px',display:'flex',flexDirection:'column',gap:12}}>
{/* Header: title + cancel */}
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
<div style={{fontSize:13,fontWeight:600,color:C.gold,fontFamily:F,display:'flex',alignItems:'center',gap:7}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="18" y1="2" x2="18" y2="8"/><line x1="21" y1="5" x2="15" y2="5"/></svg>
تسجيل عامل جديد
</div>
<button onClick={()=>{setWorkerMode('existing');setWorkerQ('');setNewWorker({name:'',phone:'',iqama_number:''})}} style={{height:26,padding:'0 10px',borderRadius:7,border:'1px solid rgba(192,57,43,.2)',background:'rgba(192,57,43,.08)',color:C.red,cursor:'pointer',fontSize:10.5,fontFamily:F,fontWeight:600}}>إلغاء</button>
</div>
{/* Fields */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<div style={{gridColumn:'1 / -1',display:'flex',flexDirection:'column',gap:5}}>
<span style={{fontSize:11,fontWeight:600,color:'var(--tx5)',fontFamily:F,paddingRight:2}}>الاسم <span style={{color:C.red}}>*</span></span>
<input value={newWorker.name} onChange={e=>{let v=e.target.value;const hasAr=/[\u0600-\u06FF]/.test(v),hasEn=/[A-Za-z]/.test(v);if(hasAr&&!hasEn)v=v.replace(/[^\u0600-\u06FF\s]/g,'');else if(hasEn&&!hasAr)v=v.replace(/[^A-Za-z\s]/g,'');else if(!hasAr&&!hasEn)v='';else v=newWorker.name;v=v.replace(/\s+/g,' ').split(' ').slice(0,3).join(' ');setNewWorker(p=>({...p,name:v}))}} placeholder="اسم العامل" style={{...fS,height:40,textAlign:'center'}}/>
</div>
<div style={{display:'flex',flexDirection:'column',gap:5}}>
<span style={{fontSize:11,fontWeight:600,color:'var(--tx5)',fontFamily:F,paddingRight:2}}>رقم الإقامة <span style={{color:C.red}}>*</span></span>
<input value={newWorker.iqama_number} onChange={e=>{const v=e.target.value.replace(/[^0-9]/g,'').slice(0,10);setNewWorker(p=>({...p,iqama_number:v}))}} placeholder="2XXXXXXXXX" inputMode="numeric" maxLength={10} style={{...fS,height:40,direction:'ltr',textAlign:'center'}}/>
</div>
<div style={{display:'flex',flexDirection:'column',gap:5}}>
<span style={{fontSize:11,fontWeight:600,color:'var(--tx5)',fontFamily:F,paddingRight:2}}>رقم الجوال <span style={{color:C.red}}>*</span></span>
<div style={{position:'relative',display:'flex',alignItems:'center'}}>
<span style={{position:'absolute',left:12,fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,pointerEvents:'none',direction:'ltr'}}>+966</span>
<input value={(()=>{const r=newWorker.phone;if(!r)return'';if(r.length<=2)return r;if(r.length<=5)return r.slice(0,2)+' '+r.slice(2);return r.slice(0,2)+' '+r.slice(2,5)+' '+r.slice(5)})()} onChange={e=>{const v=e.target.value.replace(/[^0-9]/g,'').slice(0,9);setNewWorker(p=>({...p,phone:v}))}} placeholder="5X XXX XXXX" inputMode="numeric" maxLength={12} style={{...fS,height:40,direction:'ltr',textAlign:'left',paddingLeft:54,paddingRight:14}}/>
</div>
</div>
</div>
</div>}

{/* ─── Merged Service Field (rendered at bottom of worker view when service has a single simple input) ─── */}
{hasMergedField&&(selWorker||(workerMode==='new'&&newWorker.name.trim()))&&(()=>{const inp=svcSingleField;const val=fields[inp.key]||'';return<div style={{marginTop:14,padding:'14px 16px',borderRadius:14,border:'1px solid rgba(212,160,23,.18)',background:'linear-gradient(135deg, rgba(212,160,23,.055), rgba(212,160,23,.02) 60%, rgba(212,160,23,.04))',boxShadow:'0 1px 0 rgba(255,255,255,.03) inset, 0 2px 8px rgba(0,0,0,.15), 0 0 0 1px rgba(212,160,23,.04)',display:'flex',flexDirection:'column',gap:10}}>
<label style={{fontSize:11,fontWeight:600,color:C.bentoGold,letterSpacing:'.2px',display:'flex',alignItems:'center',gap:6}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
{inp.label_ar} {inp.required&&<span style={{color:C.red}}>*</span>}
</label>
{inp.type==='select'?
<NiceSelect height={42} fontSize={13} value={val} placeholder="اختر..."
options={inp.source==='regions'?regions.map(r=>({value:r.id,label:r.name_ar})):inp.source==='countries'?lkCountries.map(c=>({value:c.nationality_ar,label:c.nationality_ar})):inp.source==='occupations'?lkOccupations.map(o=>({value:o.value_ar,label:o.value_ar})):(inp.options||[])}
onChange={v=>setFields(p=>({...p,[inp.key]:v}))}/>
:inp.type==='date'?
<DateField value={val||''} onChange={v=>setFields(p=>({...p,[inp.key]:v}))} lang={lang}/>
:inp.type==='textarea'?
<textarea value={val} onChange={e=>setFields(p=>({...p,[inp.key]:e.target.value}))} placeholder={inp.placeholder||''} rows={3} style={{...fS,height:'auto',padding:'10px 14px',resize:'vertical'}}/>
:<input type={inp.type==='number'?'number':'text'} value={val} onChange={e=>setFields(p=>({...p,[inp.key]:e.target.value}))}
placeholder={inp.placeholder||''} style={{...fS,height:42,...(inp.direction==='ltr'?{direction:'ltr',textAlign:'left'}:{})}}/>
}
</div>})()}

</div>}
</div></ModalSection>}

{/* ═══ Step 3: Dynamic Fields ═══ */}
{((step===3&&selSvc!=='kafala_transfer')||(step===2&&selSvc==='kafala_transfer'))&&<div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column'}}>
{/* Worker-only services capture the worker by phone here (same as supplier payroll), instead of a forced worker pick. */}
{skipClientStep&&selSvc!=='supplier_payroll'&&selSvc!=='documents'&&<div style={{flexShrink:0,marginBottom:14}}>
<FKPhone label="رقم جوال العامل" value={fields.worker_phone||''} onChange={v=>setFields(p=>({...p,worker_phone:v}))}/>
</div>}

{(()=>{
// ─── Visa services: custom inputs ───
if(VISA_SERVICES.has(selSvc)){
const totalVisas=visaGroups.reduce((s,g)=>s+(parseInt(g.count)||0),0)
const MAX_VISAS=4 // Total visas across all groups may not exceed 4 per invoice

// ─── Global file distribution sub-step (a file may only hold visas sharing nationality/embassy/gender) ───
if(step3Mode==='files'){
const MAX_FILES=4 // max 4 visas/invoice → at most 4 files (1 visa each), one clean row
const fileCount=(f)=>Object.values(f.assignments||{}).reduce((s,n)=>s+(parseInt(n)||0),0)
const sumF=visaFiles.reduce((s,f)=>s+fileCount(f),0)
const remaining=totalVisas-sumF
const groupAssigned=(gid)=>visaFiles.reduce((s,f)=>s+(parseInt(f.assignments?.[gid])||0),0)
const groupRem=(gid)=>{const g=visaGroups.find(x=>x.id===gid);return(parseInt(g?.count)||0)-groupAssigned(gid)}
// A file's bucket = the nationality/embassy/gender of whatever group currently sits in it (null when empty).
const bucketOfFile=(f)=>{for(const g of visaGroups){if((parseInt(f.assignments?.[g.id])||0)>0)return visaBucketKey(g)}return null}
const groupBucket=(gid)=>visaBucketKey(visaGroups.find(x=>x.id===gid))
const incGroup=(fid,gid)=>{if(remaining<=0)return;setForceCustomFiles(true);setVisaFiles(fs=>fs.map(f=>{
if(f.id!==fid)return f
if(fileCount(f)>=4)return f
const bk=bucketOfFile(f)
if(bk&&bk!==groupBucket(gid))return f // can't add an incompatible nationality/embassy/gender to this file
return{...f,assignments:{...(f.assignments||{}),[gid]:(parseInt(f.assignments?.[gid])||0)+1}}
}))}
const decGroup=(fid,gid)=>{setForceCustomFiles(true);setVisaFiles(fs=>fs.map(f=>{
if(f.id!==fid)return f
const cur=parseInt(f.assignments?.[gid])||0
if(cur<=0)return f
const next={...(f.assignments||{})};next[gid]=cur-1
if(next[gid]<=0)delete next[gid]
return{...f,assignments:next}
}))}
const addFile=()=>{setForceCustomFiles(true);setVisaFiles(fs=>fs.length>=MAX_FILES?fs:[...fs,{id:Math.max(0,...fs.map(f=>f.id))+1,assignments:{}}])}
const removeFile=(fid)=>{setForceCustomFiles(true);setVisaFiles(fs=>fs.filter(f=>f.id!==fid))}
// Move 1 visa of `gid` from one file to another (drag-and-drop)
const moveVisa=(fromFid,toFid,gid)=>{
if(fromFid===toFid)return
// Validate the move up-front so we never decrement the source without filling the destination.
const dest=visaFiles.find(f=>f.id===toFid)
if(!dest)return
const destSum=Object.values(dest.assignments||{}).reduce((s,n)=>s+(parseInt(n)||0),0)
if(destSum>=4)return
const destBk=bucketOfFile(dest)
if(destBk&&destBk!==groupBucket(gid))return // destination already holds a different nationality/embassy/gender
setForceCustomFiles(true)
setVisaFiles(fs=>fs.map(f=>{
if(f.id===fromFid){
const cur=parseInt(f.assignments?.[gid])||0
if(cur<=0)return f
const next={...(f.assignments||{})};next[gid]=cur-1
if(next[gid]<=0)delete next[gid]
return{...f,assignments:next}
}
if(f.id===toFid){
const sum=Object.values(f.assignments||{}).reduce((s,n)=>s+(parseInt(n)||0),0)
if(sum>=4)return f
return{...f,assignments:{...(f.assignments||{}),[gid]:(parseInt(f.assignments?.[gid])||0)+1}}
}
return f
}))
}
const activeFiles=visaFiles
const activeRemaining=remaining
const activeTotal=totalVisas
const canAddMore=activeFiles.length<MAX_FILES
const distPct=activeTotal>0?Math.min(100,Math.round((sumF/activeTotal)*100)):0
const isComplete=activeRemaining===0&&activeTotal>0
const isOver=activeRemaining<0
const multiGroup=visaGroups.length>1
return<div style={{display:'flex',flexDirection:'column',gap:8,flex:1,minHeight:0,width:'100%'}}>
<style>{`
.sr-pill{position:relative;display:inline-flex;align-items:center;gap:4px;padding:1px 7px;border-radius:4px;background:transparent;font-family:${F};font-size:9px;font-weight:600;transition:.2s;flex-shrink:0}
.sr-pill[data-tip]{cursor:help}
.sr-pill[data-tip]::after{content:attr(data-tip);position:absolute;top:calc(100% + 8px);right:-4px;background:var(--modal-bg);color:#D4A017;border:1px solid rgba(212,160,23,.35);padding:5px 11px;border-radius:7px;font-size:10.5px;font-weight:600;font-family:${F};white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .18s,transform .18s;transform:translateY(-4px);box-shadow:0 6px 18px rgba(0,0,0,.5);z-index:30;letter-spacing:0}
.sr-pill[data-tip]::before{content:'';position:absolute;top:calc(100% + 3px);right:8px;width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:5px solid rgba(212,160,23,.45);opacity:0;pointer-events:none;transition:opacity .18s,transform .18s;transform:translateY(-4px);z-index:30}
.sr-pill[data-tip]:hover::after,.sr-pill[data-tip]:hover::before{opacity:1;transform:translateY(0)}
.sr-pill.info{border:none;background:transparent;color:#b497e8;padding:1px 2px;font-size:12px;gap:5px}
.sr-pill.action{border:1.3px dashed rgba(212,160,23,.55);border-radius:9px;color:#D4A017;cursor:pointer;height:30px;padding:0 13px;font-size:12px;gap:6px}
.sr-pill.action:hover{background:rgba(212,160,23,.08);border-color:rgba(212,160,23,.85)}
.sr-pill.status-ok{border:none;background:transparent;color:#2ea043;padding:1px 2px;font-size:12px;gap:5px}
.sr-pill.status-warn{border:none;background:transparent;color:#D4A017;padding:1px 2px;font-size:12px;gap:5px}
.sr-pill.status-err{border:none;background:transparent;color:#c0392b;padding:1px 2px;font-size:12px;gap:5px}
`}</style>
{/* ═══ Simplified header — matches other step title rows ═══ */}
<div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0,fontFamily:F,paddingBottom:8,borderBottom:'1px solid rgba(255,255,255,.06)'}}>
{/* Status pill */}
<span className={`sr-pill ${isComplete?'status-ok':isOver?'status-err':'status-warn'}`} data-tip={isComplete?'تم توزيع جميع التأشيرات':isOver?`لديك ${Math.abs(activeRemaining)} زيادة عن العدد المطلوب`:`يتبقى ${activeRemaining} تأشيرة للتوزيع`}>
<span>{sumF}/{activeTotal}</span>
<span>·</span>
<span>{isComplete?'مكتمل':isOver?'زيادة':'متبقي'}</span>
</span>
{/* Progress bar */}
<div style={{flex:1,minWidth:40,height:4,borderRadius:2,background:'rgba(255,255,255,.05)',overflow:'hidden'}}>
<div style={{height:'100%',width:`${distPct}%`,background:isComplete?'#2ea043':isOver?'#c0392b':C.gold,borderRadius:2,transition:'width .3s cubic-bezier(.4,0,.2,1)'}}/>
</div>
{/* Drag hint — instructional pill */}
{multiGroup&&activeFiles.length>1&&<span className="sr-pill info" data-tip="اسحب أي تأشيرة بين الملفات لنقلها">
<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 9l4-4 4 4M9 5v14M19 15l-4 4-4-4M15 19V5"/></svg>
<span>اسحب للنقل</span>
</span>}
{/* Back-to-auto */}
<button type="button" onClick={()=>{setVisaDistMode('auto');setStep3Mode('groups');setErr('')}} className="sr-pill action">تلقائي</button>
{/* Add file button */}
{canAddMore&&<button type="button" onClick={addFile} className="sr-pill action">
<span>ملف</span>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
</button>}
</div>
{/* File cards — composition-aware, drop-target enabled */}
<div className="sr-modal-scroll" style={{flex:1,minHeight:0,overflowY:'auto',overflowX:'hidden',paddingLeft:2,scrollbarWidth:'none',msOverflowStyle:'none'}}>
<div style={{display:'grid',gridTemplateColumns:`repeat(${activeFiles.length}, minmax(0, ${multiGroup?'230px':'180px'}))`,justifyContent:'center',gap:12,alignItems:'stretch',gridAutoRows:'1fr',minHeight:'100%'}}>
{activeFiles.map((f,i)=>{
const c=fileCount(f)
const full=c>=4
const fBk=bucketOfFile(f) // this file's locked nationality/embassy/gender (null while empty)
// Drop-target state: a valid destination must have room AND share this file's bucket (or be empty)
const isDragSource=!!dragInfo&&dragInfo.fileId===f.id
const isValidDrop=!!dragInfo&&dragInfo.fileId!==f.id&&!full&&(!fBk||fBk===groupBucket(dragInfo.groupId))
return<div key={f.id}
onDragOver={e=>{if(isValidDrop){e.preventDefault();e.dataTransfer.dropEffect='move'}}}
onDrop={e=>{if(!dragInfo||dragInfo.fileId===f.id)return;e.preventDefault();moveVisa(dragInfo.fileId,f.id,dragInfo.groupId);setDragInfo(null)}}
style={{position:'relative',display:'flex',flexDirection:'column',maxHeight:215,borderRadius:12,border:`1.5px ${isValidDrop?'dashed':'solid'} ${isValidDrop?'rgba(52,152,219,.6)':full?'rgba(46,160,67,.35)':c>0?'rgba(212,160,23,.25)':'rgba(255,255,255,.08)'}`,background:isValidDrop?'linear-gradient(135deg, rgba(52,152,219,.14), rgba(52,152,219,.04))':full?'linear-gradient(135deg, rgba(46,160,67,.08), rgba(46,160,67,.02))':c>0?'linear-gradient(135deg, rgba(212,160,23,.06), rgba(212,160,23,.02))':'rgba(255,255,255,.015)',overflow:'hidden',transition:'.2s',boxShadow:isValidDrop?'0 0 0 3px rgba(52,152,219,.15), 0 2px 12px rgba(52,152,219,.2)':full?'0 2px 8px rgba(46,160,67,.08)':'0 2px 8px rgba(0,0,0,.15)',opacity:isDragSource?.55:1}}>
{/* Delete button */}
{activeFiles.length>1&&<button type="button" onClick={()=>removeFile(f.id)} title="حذف"
style={{position:'absolute',top:6,left:6,width:20,height:20,borderRadius:5,border:'none',background:'rgba(192,57,43,.15)',color:C.red,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,zIndex:2,transition:'.15s'}}
onMouseEnter={e=>{e.currentTarget.style.background='rgba(192,57,43,.3)'}}
onMouseLeave={e=>{e.currentTarget.style.background='rgba(192,57,43,.15)'}}>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
</button>}
{/* File header: label + count/4 */}
<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'6px 8px 4px',borderBottom:'1px solid rgba(255,255,255,.05)',background:'rgba(255,255,255,.02)'}}>
<span style={{fontSize:10.5,fontWeight:600,color:full?'#2ea043':C.gold,fontFamily:F,letterSpacing:'.3px'}}>الملف {['الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر'][i]||(i+1)}</span>
<span style={{fontSize:9,fontWeight:600,color:'var(--tx5)'}}>•</span>
<span style={{fontSize:14,fontWeight:600,color:full?'#2ea043':c>0?C.gold:'var(--tx5)',fontFamily:F,lineHeight:1}}><span style={{fontSize:9.5,fontWeight:600,color:'var(--tx5)'}}>4/</span>{c}</span>
</div>
{multiGroup?(
// ── Multi-group: per-group rows with mini -/+ controls ──
<div style={{display:'flex',flexDirection:'column',gap:3,padding:'6px 6px 8px',flex:1,justifyContent:'center',minHeight:0}}>
{visaGroups.map((g,gi)=>{
const cnt=parseInt(f.assignments?.[g.id])||0
const natLbl=g.nationality?(lkCountries.find(co=>co.id===g.nationality)?.nationality_ar||`المجموعة ${gi+1}`):`المجموعة ${gi+1}`
const profLbl=g.profession?(lkOccupations.find(o=>o.id===g.profession)?.value_ar||''):''
const gR=groupRem(g.id)
const compatible=!fBk||visaBucketKey(g)===fBk
const canInc=!full&&gR>0&&compatible
const canDec=cnt>0
// Hide a group from this file when it has nothing left to place here, or belongs to a different bucket
if(cnt===0&&(gR<=0||!compatible))return null
const isDraggingThis=!!dragInfo&&dragInfo.fileId===f.id&&dragInfo.groupId===g.id
return<div key={g.id}
draggable={cnt>0}
onDragStart={e=>{if(cnt<=0){e.preventDefault();return}setDragInfo({fileId:f.id,groupId:g.id});e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',`visa:${f.id}:${g.id}`)}catch(_){}}}
onDragEnd={()=>setDragInfo(null)}
title={cnt>0?'اسحب لنقل تأشيرة إلى ملف آخر':''}
style={{display:'flex',alignItems:'center',gap:5,fontFamily:F,padding:'3px 5px',borderRadius:6,background:isDraggingThis?'rgba(52,152,219,.15)':cnt>0?'rgba(212,160,23,.08)':'rgba(255,255,255,.015)',border:`1px solid ${isDraggingThis?'rgba(52,152,219,.5)':cnt>0?'rgba(212,160,23,.18)':'rgba(255,255,255,.04)'}`,transition:'.15s',cursor:cnt>0?'grab':'default',opacity:isDraggingThis?.6:1}}>
<button type="button" onClick={()=>decGroup(f.id,g.id)} disabled={!canDec} title="إنقاص"
style={{width:20,height:20,borderRadius:5,border:'none',background:canDec?'rgba(192,57,43,.12)':'transparent',color:canDec?C.red:'var(--tx6)',cursor:canDec?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',padding:0,fontSize:13,fontWeight:600,transition:'.15s',flexShrink:0}}
onMouseEnter={e=>{if(canDec)e.currentTarget.style.background='rgba(192,57,43,.22)'}}
onMouseLeave={e=>{if(canDec)e.currentTarget.style.background='rgba(192,57,43,.12)'}}>−</button>
<span style={{fontSize:12,fontWeight:600,color:cnt>0?C.gold:'var(--tx5)',minWidth:12,textAlign:'center',flexShrink:0}}>{cnt}</span>
<span style={{fontSize:10,fontWeight:600,color:cnt>0?'var(--tx2)':'var(--tx4)',flex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',minWidth:0}} title={profLbl?`${natLbl} · ${profLbl}`:natLbl}>{natLbl}{profLbl&&<span style={{fontSize:9,fontWeight:500,color:'var(--tx5)',marginRight:4}}> · {profLbl}</span>}</span>
<button type="button" onClick={()=>incGroup(f.id,g.id)} disabled={!canInc} title="إضافة"
style={{width:20,height:20,borderRadius:5,border:'none',background:canInc?'rgba(46,160,67,.12)':'transparent',color:canInc?'#2ea043':'var(--tx6)',cursor:canInc?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',padding:0,fontSize:13,fontWeight:600,transition:'.15s',flexShrink:0}}
onMouseEnter={e=>{if(canInc)e.currentTarget.style.background='rgba(46,160,67,.22)'}}
onMouseLeave={e=>{if(canInc)e.currentTarget.style.background='rgba(46,160,67,.12)'}}>+</button>
</div>
})}
{/* Placeholder when empty file */}
{c===0&&<div style={{fontSize:10,color:'var(--tx5)',fontFamily:F,textAlign:'center',padding:'8px 4px'}}>أضف تأشيرات من المجموعات المتاحة</div>}
</div>
):(
// ── Single-group: dot slots + simple -/+ ──
<>
<div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:4,padding:'10px 0 8px',flex:1,minHeight:0}}>
{[1,2,3,4].map(n=>{const filled=n<=c;const gid=visaGroups[0]?.id;return<button key={n} type="button" onClick={()=>{if(!gid)return;const target=Math.min(n,c+Math.max(0,remaining));if(target<1)return;setVisaFiles(fs=>fs.map(ff=>ff.id===f.id?{...ff,assignments:{[gid]:target}}:ff));setForceCustomFiles(true)}}
style={{width:9,height:9,borderRadius:'50%',border:'none',background:filled?(full?'#2ea043':C.gold):'rgba(255,255,255,.12)',cursor:'pointer',padding:0,transition:'.15s',boxShadow:filled?`0 0 4px ${full?'rgba(46,160,67,.5)':'rgba(212,160,23,.5)'}`:'none'}} title={`اضبط على ${n}`}/>})}
</div>
<div style={{display:'flex',borderTop:'1px solid rgba(255,255,255,.05)',marginTop:'auto'}}>
<button type="button" onClick={()=>{const gid=visaGroups[0]?.id;if(gid)decGroup(f.id,gid)}} disabled={c<=1}
style={{flex:1,height:28,border:'none',background:'transparent',color:'var(--tx3)',fontSize:16,fontWeight:600,cursor:c<=1?'not-allowed':'pointer',opacity:c<=1?.25:1,fontFamily:F,padding:0,display:'flex',alignItems:'center',justifyContent:'center',transition:'.15s'}}
onMouseEnter={e=>{if(c>1)e.currentTarget.style.background='rgba(192,57,43,.08)'}}
onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>−</button>
<div style={{width:1,background:'rgba(255,255,255,.05)'}}/>
<button type="button" onClick={()=>{const gid=visaGroups[0]?.id;if(gid)incGroup(f.id,gid)}} disabled={c>=4||remaining<=0}
style={{flex:1,height:28,border:'none',background:'transparent',color:'var(--tx3)',fontSize:16,fontWeight:600,cursor:(c>=4||remaining<=0)?'not-allowed':'pointer',opacity:(c>=4||remaining<=0)?.25:1,fontFamily:F,padding:0,display:'flex',alignItems:'center',justifyContent:'center',transition:'.15s'}}
onMouseEnter={e=>{if(c<4&&remaining>0)e.currentTarget.style.background='rgba(46,160,67,.08)'}}
onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>+</button>
</div>
</>
)}
</div>
})}
</div>
</div>
</div>
}

const updateGroup=(id,patch)=>setVisaGroups(gs=>gs.map(g=>g.id===id?{...g,...patch}:g))
const addGroup=()=>{
if(visaGroups.length>=4)return // Hard limit: 4 groups max
if(totalVisas>=MAX_VISAS){setErr(`الحد الأقصى ${MAX_VISAS} تأشيرة`);return} // Total visas capped
const newId=Math.max(0,...visaGroups.map(g=>g.id))+1
setVisaGroups(gs=>[...gs,{id:newId,nationality:'',embassy:'',profession:'',gender:'male',count:'1'}])
// Accordion: only the newly-added group is expanded
setExpandedGroups(new Set([newId]))
}
const removeGroup=(id)=>{setVisaGroups(gs=>{
const next=gs.filter(g=>g.id!==id)
// If the removed group was expanded, auto-expand the first remaining group
setExpandedGroups(prev=>{
if(!prev.has(id))return prev
return next.length?new Set([next[0].id]):new Set()
})
return next
})}
// Accordion toggle: opening a group collapses all others
const toggleExpand=(id)=>setExpandedGroups(prev=>prev.has(id)?new Set():new Set([id]))
// Helper: is a group fully filled?
const isGroupComplete=(g)=>!!(g.nationality&&g.embassy&&g.profession&&g.gender&&(parseInt(g.count)||0)>=1)
// Helper: lookup labels for collapsed summary
const labelFor=(arr,idKey,labelKey,id)=>arr.find(x=>x[idKey]===id)?.[labelKey]||'—'
return<div style={{display:'flex',flexDirection:'column',gap:8,flex:1,minHeight:0,minWidth:0,width:'100%'}}>
{/* Compact summary bar with inline add button */}
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
<div style={{display:'inline-flex',alignItems:'baseline',gap:5,fontFamily:F}}>
<span style={{fontSize:18,fontWeight:600,color:C.gold,lineHeight:1,letterSpacing:'-.5px'}}>{totalVisas}</span>
<span style={{fontSize:11,fontWeight:600,color:'var(--tx4)'}}>{totalVisas===1?'تأشيرة':'تأشيرة'}</span>
</div>
{visaGroups.length<4&&<button type="button" onClick={addGroup} title="إضافة مجموعة جديدة"
style={{height:30,padding:'0 13px',background:'transparent',border:'1.3px dashed rgba(212,160,23,.55)',borderRadius:9,color:C.bentoGold,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,flexShrink:0,transition:'.15s',whiteSpace:'nowrap'}}
onMouseEnter={e=>{e.currentTarget.style.background='rgba(212,160,23,.07)';e.currentTarget.style.borderColor='rgba(212,160,23,.85)'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='rgba(212,160,23,.55)'}}>
<span>مجموعة</span>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
</button>}
</div>

{/* Tabs strip (shown when >1 group) + one full-height form for the active group */}
{(()=>{
const activeId=visaGroups.find(gg=>expandedGroups.has(gg.id))?.id||visaGroups[0]?.id
const activeGroup=visaGroups.find(gg=>gg.id===activeId)
const activeIdx=visaGroups.findIndex(gg=>gg.id===activeId)
const setActive=(id)=>setExpandedGroups(new Set([id]))
return<>
{/* Tabs: simple underline style — text only with bottom line on active */}
{visaGroups.length>1&&<div style={{display:'flex',gap:4,borderBottom:'1px solid rgba(255,255,255,.06)'}}>
{visaGroups.map((gg,i)=>{
const isAct=gg.id===activeId
const done=isGroupComplete(gg)
return<button key={gg.id} type="button" onClick={()=>setActive(gg.id)}
style={{flex:1,minWidth:0,height:36,border:'none',background:'transparent',color:isAct?C.gold:'var(--tx4)',fontFamily:F,cursor:'pointer',transition:'color .2s, border-color .2s',display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'0 6px',borderBottom:isAct?`2px solid ${C.gold}`:'2px solid transparent',marginBottom:-1}}
onMouseEnter={e=>{if(!isAct)e.currentTarget.style.color='var(--tx2)'}}
onMouseLeave={e=>{if(!isAct)e.currentTarget.style.color='var(--tx4)'}}>
<span style={{fontSize:12.5,fontWeight:600,whiteSpace:'nowrap'}}>المجموعة {['الأولى','الثانية','الثالثة','الرابعة'][i]||(i+1)}</span>
<div title={done?'مكتملة':'ناقصة'} style={{width:6,height:6,borderRadius:'50%',background:done?'#2ea043':'var(--tx5)',flexShrink:0}}/>
<span style={{fontSize:10.5,fontWeight:600,opacity:.7,whiteSpace:'nowrap'}}>{gg.count||0}×</span>
</button>
})}
</div>}
{/* Active group — full vertical form, fills remaining space, never scrolls */}
{activeGroup&&(()=>{
const g=activeGroup
const idx=activeIdx
const filteredEm=g.nationality?lkEmbassies.filter(e=>e.country_id===g.nationality):[]
// Responsive sizing: solo mode = spacious with labels, multi mode = compact but breathing
const solo=visaGroups.length===1
const H=40                         // input height
const FS=13                        // font size
const GAP=10                       // inter-row gap
const PADY=solo?10:10              // card vertical padding
const PADX=solo?16:12              // card horizontal padding
const LGAP=5                       // label→input gap
const LFS=11                       // label font size (match regLblS)
const TITLE_FS=solo?12.5:12.5      // title font size
const BTN_W=32                     // counter button width
const CNT_FS=15                    // count value font size
return<div key={g.id} style={{border:'1.5px solid rgba(212,160,23,.35)',borderRadius:12,padding:`18px 14px 12px`,marginTop:visaGroups.length>1?14:12,position:'relative',display:'flex',flexDirection:'column',gap:GAP,width:'100%',maxWidth:'100%',boxSizing:'border-box',transition:'all .25s ease'}}>
<div style={{position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F}}>المجموعة {['الأولى','الثانية','الثالثة','الرابعة'][idx]||(idx+1)}</div>
{visaGroups.length>1&&<button type="button" onClick={()=>removeGroup(g.id)} title="حذف"
style={{position:'absolute',top:-13,left:14,height:26,padding:'0 12px',borderRadius:9,border:'1.3px dashed rgba(192,57,43,.55)',background:'var(--modal-bg)',color:C.red,cursor:'pointer',fontSize:11,fontFamily:F,fontWeight:600,display:'inline-flex',alignItems:'center',gap:6,transition:'.15s'}}
onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(192,57,43,.85)';e.currentTarget.style.color='#e66'}} onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(192,57,43,.55)';e.currentTarget.style.color=C.red}}>
<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
<span>حذف</span>
</button>}
{/* الحقول — مكوّنات FormKit (نفس معرض الفورمات) */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<FKSelect label="الجنسية" req placeholder="اختر الجنسية..."
value={g.nationality||null}
onChange={(id)=>updateGroup(g.id,{nationality:id||'',embassy:''})}
options={lkCountries} getKey={o=>o.id} getLabel={o=>o.nationality_ar} getSub={o=>o.nationality_en||''}
renderSelected={o=>{const u=natFlagUrl(o);return <span style={{display:'inline-flex',alignItems:'center',gap:8}}>{o.nationality_ar}{u&&<img src={u} alt="" width={16} height={12} style={{borderRadius:2,objectFit:'cover'}}/>}</span>}}
renderCell={(o,sel)=>{const u=natFlagUrl(o);return <span style={{fontSize:14,fontWeight:600,color:sel?C.bentoGold:'rgba(255,255,255,.92)',display:'inline-flex',alignItems:'center',gap:8}}>{o.nationality_ar}{u&&<img src={u} alt="" width={16} height={12} style={{borderRadius:2,objectFit:'cover'}}/>}</span>}}/>
<FKSelect label="السفارة" req disabled={!g.nationality||filteredEm.length===0}
placeholder={!g.nationality?'اختر الجنسية أولاً':(filteredEm.length===0?'لا توجد سفارة لهذه الجنسية':'اختر المدينة...')}
value={g.embassy||null}
onChange={(id)=>updateGroup(g.id,{embassy:id||''})}
options={filteredEm} getKey={o=>o.id} getLabel={o=>o.city_ar} getSub={o=>o.name_en||''}/>
</div>
<FKSelect label="المهنة" req full placeholder="اختر المهنة..."
value={g.profession||null}
onChange={(id)=>updateGroup(g.id,{profession:id||''})}
options={lkOccupations} getKey={o=>o.id} getLabel={o=>o.value_ar}/>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<FKSegmented label="الجنس" req value={g.gender}
onChange={(v)=>updateGroup(g.id,{gender:v})}
options={[{v:'male',l:'ذكر',c:'#3483b4'},{v:'female',l:'أنثى',c:'#e078a8'}]}/>
<FKStepper label="عدد التأشيرات" req value={parseInt(g.count)||1} min={1} max={MAX_VISAS}
onChange={(n)=>{const others=totalVisas-(parseInt(g.count)||0);const cap=Math.max(1,MAX_VISAS-others);updateGroup(g.id,{count:String(Math.min(Math.max(1,n),cap))})}}/>
</div>
</div>
})()}
</>
})()}

{/* Distribution mode — single checkbox: unchecking navigates to files customization view.
    Hidden when total visas ≤ 1 (one visa = one file, so there's nothing to distribute). */}
{visaGroups.reduce((s,g)=>s+(parseInt(g.count)||0),0)>1&&<div style={{padding:'2px 2px'}}>
<FKCheckbox checked={visaDistMode==='auto'} label={`توزيع تلقائي${visaDistMode==='custom'?' (اضغط للعودة)':''}`}
onChange={()=>{
// Unchecking opens manual file distribution — a forward step past the groups, so gate it on the
// same validation as «التالي»: an incomplete group blocks it (canNext sets the error banner).
if(visaDistMode==='auto'){
if(!canNext())return
setVisaDistMode('custom')
const totalV=visaGroups.reduce((s,g)=>s+(parseInt(g.count)||0),0)
if(totalV>0){
const files=packVisaFiles(visaGroups)
if(!visaFilesValid(visaFiles,visaGroups)){setVisaFiles(files);setForceCustomFiles(false)}
}
setStep3Mode('files');setErr('')
}else setVisaDistMode('auto')
}}/>
</div>}
</div>
}

// ─── Chamber certification: two sub-types ───
if(selSvc==='chamber_certification'){
const subtype=fields.chamber_subtype||''
const setSubtype=(v)=>setFields(p=>({...p,chamber_subtype:v}))
const legend={position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:5}
const fieldset={borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',padding:'16px 12px 12px',position:'relative',display:'flex',flexDirection:'column',gap:10}
return<div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column',gap:10,marginTop:10}}>

{/* ═══ Fieldset 1: نوع التصديق ═══ */}
<div style={{...fieldset,flexShrink:0}}>
<div style={legend}>
<FileCheck size={12} strokeWidth={2.2}/>
<span>نوع التصديق <span style={{color:C.red}}>*</span></span>
</div>
<FKSegmented value={subtype} onChange={setSubtype} height={54}
options={[{v:'printed',l:'تصديق مطبوعات',sub:'يرفق ملف المطبوعات'},{v:'open_request',l:'طلب مفتوح',sub:'يكتب نص الطلب'}]}/>
</div>

{/* ═══ Fieldset 2: ملف المطبوعات / نص الطلب ═══ */}
{subtype==='printed'&&<div style={{...fieldset,flex:1,minHeight:0,padding:'16px 12px 12px'}}>
<div style={legend}>
<Upload size={12} strokeWidth={2.2}/>
<span>ملف المطبوعات <span style={{color:C.red}}>*</span></span>
</div>
<label htmlFor="chamberFileInput" style={{flex:1,minHeight:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,padding:'16px',borderRadius:10,border:'1.5px dashed rgba(212,160,23,.35)',background:'rgba(212,160,23,.04)',color:C.gold,cursor:'pointer',transition:'.2s',position:'relative'}}
onMouseEnter={e=>{e.currentTarget.style.background='rgba(212,160,23,.07)';e.currentTarget.style.borderColor='rgba(212,160,23,.55)'}}
onMouseLeave={e=>{e.currentTarget.style.background='rgba(212,160,23,.04)';e.currentTarget.style.borderColor='rgba(212,160,23,.35)'}}>
{fields.chamber_file?<>
<div style={{width:52,height:52,borderRadius:12,background:'rgba(212,160,23,.15)',display:'flex',alignItems:'center',justifyContent:'center'}}>
<FileCheck size={26} color={C.gold}/>
</div>
<div style={{textAlign:'center'}}>
<div style={{fontSize:13,fontWeight:600,marginBottom:3,wordBreak:'break-all'}}>{fields.chamber_file.name}</div>
<div style={{fontSize:10.5,color:'var(--tx5)'}}>{(fields.chamber_file.size/1024).toFixed(1)} KB · اضغط لتغيير الملف</div>
</div>
<button type="button" onClick={(e)=>{e.preventDefault();e.stopPropagation();setFields(p=>({...p,chamber_file:null}))}}
style={{position:'absolute',top:8,left:8,width:26,height:26,borderRadius:7,border:'1px solid rgba(192,57,43,.3)',background:'rgba(192,57,43,.12)',color:C.red,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:600}}>×</button>
</>:<>
<div style={{width:52,height:52,borderRadius:12,background:'rgba(212,160,23,.1)',display:'flex',alignItems:'center',justifyContent:'center'}}>
<Upload size={22}/>
</div>
<div style={{textAlign:'center'}}>
<div style={{fontSize:13,fontWeight:600,marginBottom:4}}>اضغط لرفع الملف</div>
<div style={{fontSize:10.5,color:'var(--tx5)'}}>أو اسحب الملف وأفلته هنا</div>
<div style={{fontSize:9.5,color:'var(--tx5)',marginTop:6,padding:'3px 10px',borderRadius:5,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.06)',display:'inline-block'}}>PDF · JPG · PNG</div>
</div>
</>}
</label>
<input id="chamberFileInput" type="file" accept=".pdf,.jpg,.jpeg,.png"
onChange={e=>{const f=e.target.files?.[0];if(f)setFields(p=>({...p,chamber_file:f}))}}
style={{display:'none'}}/>
</div>}
{subtype==='open_request'&&<div style={{...fieldset,flex:1,minHeight:0,padding:'16px 12px 12px'}}>
<div style={legend}>
<FileText size={12} strokeWidth={2.2}/>
<span>نص الطلب <span style={{color:C.red}}>*</span></span>
</div>
<textarea value={fields.chamber_text||''} onChange={e=>setFields(p=>({...p,chamber_text:e.target.value}))}
placeholder="اكتب نص طلب التصديق هنا..."
style={{...fS,flex:1,height:'auto',padding:'12px 14px',resize:'none',minHeight:0}}/>
</div>}

</div>
}

// ─── iqama_renewal: gold card with current expiry + months input + calculated new expiry ───
if(selSvc==='iqama_renewal'){
const months=parseInt(fields.renewal_months)||0
const currentExpiry=selWorker?.iqama_expiry_date||''
const currentProf=selWorker?.occupation?.value_ar||''
let expectedExpiry=''
if(currentExpiry&&months>0){const d=new Date(currentExpiry);if(!isNaN(d)){d.setMonth(d.getMonth()+months);expectedExpiry=d.toISOString().split('T')[0]}}
const fmtDay=(iso)=>{if(!iso)return'—';const d=new Date(iso);if(isNaN(d))return'—';return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
const hijri=(iso)=>{if(!iso)return'';try{const d=new Date(iso);if(isNaN(d))return'';const parts=new Intl.DateTimeFormat('en-SA-u-ca-islamic-umalqura',{day:'numeric',month:'numeric',year:'numeric'}).formatToParts(d);const dd=parts.find(p=>p.type==='day')?.value||'';const mm=parts.find(p=>p.type==='month')?.value||'';const yy=parts.find(p=>p.type==='year')?.value||'';return `${yy}/${mm}/${dd}`}catch{return''}}
const changeProf=fields.change_profession===true
const roBox={height:42,padding:'0 14px',borderRadius:9,border:'1px solid rgba(255,255,255,.05)',background:'var(--modal-input-bg)',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}
const hijPill={fontSize:9.5,fontWeight:600,fontFamily:F,padding:'2px 6px',borderRadius:5}
return<div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column',gap:14,marginTop:11}}>

{/* ─── Change profession fieldset (first) ─── */}
<div style={{borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',padding:'14px 12px 12px',position:'relative',flexShrink:0,display:'flex',flexDirection:'column',gap:8}}>
<div style={{position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:5}}>
<UserCog size={12} strokeWidth={2.2}/>
<span>تغيير المهنة</span>
</div>
{/* Yes/No — canonical FormKit segmented buttons */}
<div style={{marginTop:6,flexShrink:0}}>
<FKSegmented value={fields.change_profession??false}
onChange={v=>setFields(p=>({...p,change_profession:v,...(v===false?{new_occupation:''}:{})}))}
options={[{v:false,l:'لا',c:C.blue},{v:true,l:'نعم',c:C.ok}]}/>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,alignItems:'end'}}>
<InfoCard Icon={Briefcase} label="المهنة الحالية" muted={!currentProf} value={currentProf||'—'}/>
{changeProf?<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>المهنة الجديدة <span style={{color:C.red}}>*</span></label>
<NiceSelect compact height={42} fontSize={13} value={fields.new_occupation||''} placeholder="اختر المهنة الجديدة..."
options={lkOccupations.map(o=>({value:o.value_ar,label:o.value_ar}))}
onChange={v=>setFields(p=>({...p,new_occupation:v}))}/>
</div>:<div/>}
</div>
</div>

{/* ─── Iqama renewal fieldset ─── */}
<div style={{borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',padding:'18px 14px 14px',position:'relative',display:'flex',flexDirection:'column',gap:10}}>
<div style={{position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:5}}>
<RefreshCw size={12} strokeWidth={2.2}/>
<span>تجديد الإقامة</span>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
<InfoCard Icon={Calendar} label="انتهاء الإقامة الحالية" ltr muted={!currentExpiry} value={fmtDay(currentExpiry)} labelExtra={currentExpiry&&<span style={{...hijPill,color:C.gold,background:'rgba(212,160,23,.08)',border:'1px solid rgba(212,160,23,.2)'}}><bdi>{hijri(currentExpiry)}</bdi></span>}/>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>عدد أشهر التجديد <span style={{color:C.red}}>*</span></label>
<KafalaSel value={fields.renewal_months||''} placeholder="اختر المدة..."
options={[{v:'3',l:'3'},{v:'6',l:'6'},{v:'9',l:'9'},{v:'12',l:'12'}]}
onChange={v=>setFields(p=>({...p,renewal_months:v}))}/>
</div>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>تاريخ انتهاء الإقامة المتوقع</label>
<div style={{...roBox,borderColor:expectedExpiry?'rgba(46,160,67,.3)':'rgba(255,255,255,.08)',background:expectedExpiry?'rgba(46,160,67,.06)':'rgba(0,0,0,.2)'}}>
<span style={{fontSize:13,fontWeight:600,color:expectedExpiry?'#4cd075':'var(--tx5)',fontFamily:F,direction:'ltr'}}>{fmtDay(expectedExpiry)}</span>
{expectedExpiry&&<span style={{...hijPill,color:'#4cd075',background:'rgba(46,160,67,.08)',border:'1px solid rgba(46,160,67,.2)'}}><bdi>{hijri(expectedExpiry)}</bdi></span>}
</div>
</div>
</div>
</div>

</div>
}

// ─── ajeer_contract: two fieldsets matching register/iqama style ───
if(selSvc==='ajeer_contract'){
const origFacility=selWorker?.facility?.name_ar||''
const origQiwa=selWorker?.facility?.qiwa_file_number||selWorker?.facility?.qiwa_unified_number||''
const stat=workerFacilityStat
const ncMap={'platinum':'#E5E4E2','green':'#27a046','green_low':'#6bb77a','green_mid':'#3fa356','green_high':'#1e8c3a','green_top':'#0d6b25','yellow':'#e5b534','yellow_low':'#e5b534','yellow_high':'#c99a2a','red':'#c0392b'}
const ncCode=stat?.nitaqat?.code
const ncLabel=stat?.nitaqat?.value_ar||''
const ncColor=ncCode?(ncMap[ncCode]||'#888'):null
const wpsHasNotes=stat?.wps_has_notes
const fmtDay=(iso)=>{if(!iso)return'—';const d=new Date(iso);if(isNaN(d))return'—';return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
// Region filter removed — show all cities, since the UI no longer asks for a region.
const cityOptions=cities.map(c=>({value:c.id,label:c.name_ar}))
const weekDate=stat?.week_date||''
const inH=38
const inS={...fS,height:inH}
const roBox={height:inH,padding:'0 12px',borderRadius:9,border:'1px solid rgba(255,255,255,.05)',background:'var(--modal-input-bg)',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)',display:'flex',alignItems:'center',gap:8}
const legend={position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:5}
const fieldset={borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',padding:'14px 12px 12px',position:'relative',flexShrink:0,display:'flex',flexDirection:'column',gap:8}
return<div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column',gap:10,marginTop:10}}>

{/* ═══ Fieldset 1: بيانات منشأة العامل ═══ */}
<div style={fieldset}>
<div style={legend}>
<Building2 size={12} strokeWidth={2.2}/>
<span>بيانات منشأة العامل</span>
</div>
{origFacility&&<div style={{display:'grid',gridTemplateColumns:'1.6fr 1fr',gap:10}}>
<InfoCard Icon={Building2} label="منشأة العامل" value={origFacility}/>
<InfoCard Icon={Hash} label="رقم قوى" ltr muted={!origQiwa} value={origQiwa||'—'} copy={origQiwa&&<button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(origQiwa);setCopiedQiwa(true);setTimeout(()=>setCopiedQiwa(false),1500)}catch{}}} onMouseEnter={e=>{if(!copiedQiwa)e.currentTarget.style.color=C.gold}} onMouseLeave={e=>{if(!copiedQiwa)e.currentTarget.style.color=C.gold}} title={copiedQiwa?'تم النسخ':'نسخ'} style={{width:26,height:26,borderRadius:6,border:`1px solid ${copiedQiwa?'rgba(39,160,70,.45)':'rgba(212,160,23,.3)'}`,background:copiedQiwa?'rgba(39,160,70,.12)':'rgba(212,160,23,.08)',color:copiedQiwa?C.ok:C.gold,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',transition:'color .15s',flexShrink:0}}>{copiedQiwa?<Check size={13} strokeWidth={2.4}/>:<Copy size={12} strokeWidth={2}/>}</button>}/>
</div>}
{origFacility&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<InfoCard label="النطاق الأسبوعي"
labelExtra={weekDate&&<span style={{fontSize:9.5,fontWeight:600,color:'var(--tx5)',direction:'ltr'}}>{fmtDay(weekDate)}</span>}
lead={ncColor?<Circle size={11} fill={ncColor} stroke="none" style={{flexShrink:0}}/>:<Circle size={11} color="var(--tx5)" strokeWidth={2} style={{flexShrink:0}}/>}
value={ncColor?(ncLabel||'نطاق'):'لا توجد بيانات'} valueColor={ncColor||'var(--tx5)'}/>
<InfoCard label="حماية الأجور"
labelExtra={weekDate&&<span style={{fontSize:9.5,fontWeight:600,color:'var(--tx5)',direction:'ltr'}}>{fmtDay(weekDate)}</span>}
lead={wpsHasNotes===true?<AlertCircle size={14} color="#c0392b" strokeWidth={2.2} style={{flexShrink:0}}/>:wpsHasNotes===false?<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#27a046" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><polyline points="20 6 9 17 4 12"/></svg>:<Circle size={11} color="var(--tx5)" strokeWidth={2} style={{flexShrink:0}}/>}
value={wpsHasNotes===true?'توجد ملاحظة':wpsHasNotes===false?'نظيف':'لا توجد بيانات'} valueColor={wpsHasNotes===true?'#c0392b':wpsHasNotes===false?'#27a046':'var(--tx5)'}/>
</div>}
</div>

{/* ═══ Fieldset 2: بيانات عقد أجير ═══ */}
<div style={fieldset}>
<div style={legend}>
<FileCheck size={12} strokeWidth={2.2}/>
<span>بيانات عقد أجير</span>
</div>
{/* Row 1: borrower's 700 number + city. Region was dropped because city is enough. */}
<div style={{display:'grid',gridTemplateColumns:'1.3fr 1fr',gap:10}}>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>الرقم الموحد للمنشأة المستعارة <span style={{color:C.red}}>*</span></label>
<input type="text" inputMode="numeric" maxLength={10} value={fields.borrower_700||''} onChange={e=>{let raw=e.target.value.replace(/[^0-9]/g,'').slice(0,10);if(raw&&raw[0]!=='7')raw='7'+raw.slice(1);setFields(p=>({...p,borrower_700:raw}))}} placeholder="7XXXXXXXXX" style={{...inS,direction:'ltr',textAlign:'center',letterSpacing:'.5px'}}/>
</div>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>المدينة <span style={{color:C.red}}>*</span></label>
<NiceSelect compact height={inH} fontSize={13} value={fields.city||''} placeholder="اختر المدينة..."
options={cityOptions}
onChange={v=>setFields(p=>({...p,city:v}))}/>
</div>
</div>
{/* Row 2: contract length only — kept on the right column (1fr) so it sits
under "المدينة" above. 1-24 month dropdown replaces the free-text input
so users can only pick a valid contract length. */}
<div style={{display:'grid',gridTemplateColumns:'1.3fr 1fr',gap:10}}>
<div/>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>مدة العقد <span style={{color:C.red}}>*</span></label>
<NiceSelect compact height={inH} fontSize={13} value={fields.contract_months||''} placeholder="اختر المدة..."
options={Array.from({length:24},(_,i)=>({value:String(i+1),label:fmtMonths(i+1)}))}
onChange={v=>setFields(p=>({...p,contract_months:v}))}/>
</div>
</div>
</div>

</div>
}

// ─── medical_insurance: gold card with worker facility (unified#) + current insurance status + worker age ───
if(selSvc==='medical_insurance'){
const origFacility=selWorker?.facility?.name_ar||''
const origUnified=selWorker?.facility?.unified_national_number||''
const stat=workerFacilityStat
const ncMap={'platinum':'#E5E4E2','green':'#27a046','green_low':'#6bb77a','green_mid':'#3fa356','green_high':'#1e8c3a','green_top':'#0d6b25','yellow':'#e5b534','yellow_low':'#e5b534','yellow_high':'#c99a2a','red':'#c0392b'}
const ncCode=stat?.nitaqat?.code
const ncLabel=stat?.nitaqat?.value_ar||''
const ncColor=ncCode?(ncMap[ncCode]||'#888'):null
const wpsHasNotes=stat?.wps_has_notes
const weekDate=stat?.week_date||''
const fmtDay=(iso)=>{if(!iso)return'—';const d=new Date(iso);if(isNaN(d))return'—';return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
// Current worker insurance (latest end_date)
const latestIns=[...(selWorker?.worker_insurance||[])].sort((a,b)=>new Date(b.end_date||0)-new Date(a.end_date||0))[0]
const insEnd=latestIns?.end_date||''
const insStat=dateStatus(insEnd)
const insStatLabel=latestIns?(insStat==='expired'?'منتهي':insStat==='soon'?'قارب الانتهاء':'ساري'):'لا يوجد'
const insStatColor=insStat==='expired'?'#c0392b':insStat==='soon'?'#e5b534':insStat==='ok'?'#27a046':'var(--tx5)'
// Worker age from birth_date
const dob=selWorker?.birth_date||''
let age=null
if(dob){const bd=new Date(dob);if(!isNaN(bd))age=Math.floor((new Date()-bd)/31557600000)}
const inH=38
const roBox={height:inH,padding:'0 12px',borderRadius:9,border:'1px solid rgba(255,255,255,.05)',background:'var(--modal-input-bg)',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)',display:'flex',alignItems:'center',gap:8}
const legend={position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:5}
const fieldset={borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',padding:'14px 12px 12px',position:'relative',flexShrink:0,display:'flex',flexDirection:'column',gap:8}
return<div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column',gap:10,marginTop:10}}>

{/* ═══ Fieldset 1: بيانات منشأة العامل ═══ */}
<div style={fieldset}>
<div style={legend}>
<Building2 size={12} strokeWidth={2.2}/>
<span>بيانات منشأة العامل</span>
</div>
{origFacility&&<div style={{display:'grid',gridTemplateColumns:'1.6fr 1fr',gap:10}}>
<InfoCard Icon={Building2} label="منشأة العامل" value={origFacility}/>
<InfoCard Icon={Hash} label="الرقم الموحد" ltr muted={!origUnified} value={origUnified||'—'} copy={origUnified&&<button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(origUnified);setCopiedUnified(true);setTimeout(()=>setCopiedUnified(false),1500)}catch{}}} onMouseEnter={e=>{if(!copiedUnified)e.currentTarget.style.color=C.gold}} onMouseLeave={e=>{if(!copiedUnified)e.currentTarget.style.color=C.gold}} title={copiedUnified?'تم النسخ':'نسخ'} style={{width:26,height:26,borderRadius:6,border:`1px solid ${copiedUnified?'rgba(39,160,70,.45)':'rgba(212,160,23,.3)'}`,background:copiedUnified?'rgba(39,160,70,.12)':'rgba(212,160,23,.08)',color:copiedUnified?C.ok:C.gold,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',transition:'color .15s',flexShrink:0}}>{copiedUnified?<Check size={13} strokeWidth={2.4}/>:<Copy size={12} strokeWidth={2}/>}</button>}/>
</div>}
</div>

{/* ═══ Fieldset 2: بيانات تأمين العامل ═══ */}
<div style={fieldset}>
<div style={legend}>
<ShieldCheck size={12} strokeWidth={2.2}/>
<span>بيانات تأمين العامل</span>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<InfoCard label="وضع التأمين الحالي" lead={<ShieldCheck size={14} color={latestIns?insStatColor:'var(--tx5)'} strokeWidth={1.8} style={{flexShrink:0}}/>} value={insStatLabel} valueColor={latestIns?insStatColor:'var(--tx5)'}/>
<InfoCard label="تاريخ انتهاء التأمين" ltr lead={<Calendar size={14} color={insEnd?insStatColor:'var(--tx5)'} strokeWidth={1.8} style={{flexShrink:0}}/>} value={fmtDay(insEnd)} valueColor={insEnd?insStatColor:'var(--tx5)'}/>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<InfoCard Icon={Calendar} label="تاريخ الميلاد" ltr muted={!dob} value={fmtDay(dob)}/>
<InfoCard Icon={User} label="عمر العامل" muted={age===null} value={age!==null?`${age} سنة`:'—'}/>
</div>
</div>

</div>
}

// ─── profession_change: gold card with worker facility (unified# + qiwa with copy) + current profession + new profession ───
if(selSvc==='profession_change'){
const origFacility=selWorker?.facility?.name_ar||''
const origUnified=selWorker?.facility?.unified_national_number||''
const origQiwa=selWorker?.facility?.qiwa_file_number||selWorker?.facility?.qiwa_unified_number||''
const currentProf=selWorker?.occupation?.value_ar||''
const inH=38
const roBox={height:inH,padding:'0 12px',borderRadius:9,border:'1px solid rgba(255,255,255,.05)',background:'var(--modal-input-bg)',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)',display:'flex',alignItems:'center',gap:8}
const legend={position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:5}
const fieldset={borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',padding:'14px 12px 12px',position:'relative',flexShrink:0,display:'flex',flexDirection:'column',gap:8}
return<div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column',gap:10,marginTop:10}}>

{/* ═══ Fieldset 1: بيانات منشأة العامل ═══ */}
<div style={fieldset}>
<div style={legend}>
<Building2 size={12} strokeWidth={2.2}/>
<span>بيانات منشأة العامل</span>
</div>
{origFacility&&<div style={{display:'grid',gridTemplateColumns:'1.6fr 1fr',gap:10}}>
<InfoCard Icon={Building2} label="منشأة العامل" value={origFacility}/>
<InfoCard Icon={Hash} label="الرقم الموحد" ltr muted={!origUnified} value={origUnified||'—'} copy={origUnified&&<button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(origUnified);setCopiedUnified(true);setTimeout(()=>setCopiedUnified(false),1500)}catch{}}} onMouseEnter={e=>{if(!copiedUnified)e.currentTarget.style.color=C.gold}} onMouseLeave={e=>{if(!copiedUnified)e.currentTarget.style.color=C.gold}} title={copiedUnified?'تم النسخ':'نسخ'} style={{width:26,height:26,borderRadius:6,border:`1px solid ${copiedUnified?'rgba(39,160,70,.45)':'rgba(212,160,23,.3)'}`,background:copiedUnified?'rgba(39,160,70,.12)':'rgba(212,160,23,.08)',color:copiedUnified?C.ok:C.gold,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',transition:'color .15s',flexShrink:0}}>{copiedUnified?<Check size={13} strokeWidth={2.4}/>:<Copy size={12} strokeWidth={2}/>}</button>}/>
</div>}
<div style={{display:'grid',gridTemplateColumns:'1fr 1.3fr',gap:10}}>
<InfoCard Icon={Hash} label="رقم قوى" ltr muted={!origQiwa} value={origQiwa||'—'} copy={origQiwa&&<button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(origQiwa);setCopiedQiwa(true);setTimeout(()=>setCopiedQiwa(false),1500)}catch{}}} onMouseEnter={e=>{if(!copiedQiwa)e.currentTarget.style.color=C.gold}} onMouseLeave={e=>{if(!copiedQiwa)e.currentTarget.style.color=C.gold}} title={copiedQiwa?'تم النسخ':'نسخ'} style={{width:26,height:26,borderRadius:6,border:`1px solid ${copiedQiwa?'rgba(39,160,70,.45)':'rgba(212,160,23,.3)'}`,background:copiedQiwa?'rgba(39,160,70,.12)':'rgba(212,160,23,.08)',color:copiedQiwa?C.ok:C.gold,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',transition:'color .15s',flexShrink:0}}>{copiedQiwa?<Check size={13} strokeWidth={2.4}/>:<Copy size={12} strokeWidth={2}/>}</button>}/>
<InfoCard Icon={Briefcase} label="المهنة الحالية" muted={!currentProf} value={currentProf||'—'}/>
</div>
</div>

{/* ═══ Fieldset 2: بيانات المهنة الجديدة ═══ */}
<div style={fieldset}>
<div style={legend}>
<UserCog size={12} strokeWidth={2.2}/>
<span>بيانات المهنة الجديدة</span>
</div>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>المهنة الجديدة <span style={{color:C.red}}>*</span></label>
<NiceSelect compact height={inH} fontSize={13} value={fields.new_occupation||''} placeholder="اختر المهنة الجديدة..."
options={lkOccupations.map(o=>({value:o.value_ar,label:o.value_ar}))}
onChange={v=>setFields(p=>({...p,new_occupation:v}))}/>
</div>
</div>

</div>
}

// ─── documents: doc type + language in fieldset ───
if(selSvc==='documents'){
const inH=42
const legend={position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:5}
const fieldset={borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',padding:'16px 12px 12px',position:'relative',display:'flex',flexDirection:'column',gap:10}
return<div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column',gap:10,marginTop:10}}>
<div style={fieldset}>
<div style={legend}>
<FileStack size={12} strokeWidth={2.2}/>
<span>بيانات المستند</span>
</div>
<FKPhone label="رقم جوال العامل" value={fields.worker_phone||''} onChange={v=>setFields(p=>({...p,worker_phone:v}))}/>
<div style={{display:'flex',flexDirection:'column',gap:10}}>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>نوع المستند <span style={{color:C.red}}>*</span></label>
<NiceSelect compact height={inH} fontSize={13} value={fields.doc_type||''} placeholder="اختر..."
options={getDocTypes()}
onChange={v=>setFields(p=>({...p,doc_type:v}))}/>
</div>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>لغة المستند <span style={{color:C.red}}>*</span></label>
<FKSegmented value={fields.doc_lang||''} onChange={v=>setFields(p=>({...p,doc_lang:v}))} height={inH}
options={[{v:'ar',l:'العربية'},{v:'en',l:'English'}]}/>
</div>
</div>
</div>
</div>
}

// ─── iqama_print: reason textarea in fieldset ───
if(selSvc==='iqama_print'){
const legend={position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:5}
const fieldset={borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',padding:'16px 12px 12px',position:'relative',display:'flex',flexDirection:'column',gap:10}
return<div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column',gap:10,marginTop:10}}>
<div style={{...fieldset,flex:1,minHeight:0}}>
<div style={legend}>
<Printer size={12} strokeWidth={2.2}/>
<span>سبب طلب طباعة الإقامة <span style={{color:C.red}}>*</span></span>
</div>
<textarea value={fields.print_reason||''} onChange={e=>setFields(p=>({...p,print_reason:e.target.value}))}
placeholder="اكتب سبب طلب طباعة الإقامة..."
style={{...fS,flex:1,minHeight:0,height:'auto',padding:'12px 14px',resize:'none',textAlign:'right'}}/>
</div>
</div>
}

// ─── custom (عام): free-form description textarea in fieldset ───
if(selSvc==='custom'){
const legend={position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:5}
const fieldset={borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',padding:'16px 12px 12px',position:'relative',display:'flex',flexDirection:'column',gap:10}
return<div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column',gap:10,marginTop:10}}>
<div style={{...fieldset,flex:1,minHeight:0}}>
<div style={legend}>
<Sparkles size={12} strokeWidth={2.2}/>
<span>وصف الخدمة <span style={{color:C.red}}>*</span></span>
</div>
<textarea value={fields.custom_note||''} onChange={e=>setFields(p=>({...p,custom_note:e.target.value}))}
placeholder="اكتب تفاصيل الخدمة المطلوبة..."
style={{...fS,flex:1,minHeight:0,height:'auto',padding:'12px 14px',resize:'none',textAlign:'right'}}/>
</div>
</div>
}

// ─── exit_reentry_visa: extension (if active visa exists) or issuance (new) ───
if(selSvc==='exit_reentry_visa'){
const iqamaNo=selWorker?.iqama_number||''
const existingVisa=selWorker?.exit_reentry_visa||null
const today=new Date()
const endIso=existingVisa?.end_date||''
const endDate=endIso?new Date(endIso):null
const isActive=!!(existingVisa&&endDate&&!isNaN(endDate)&&endDate>=today)
const inH=42
const inS={...fS,height:inH}
const roBox={height:inH,padding:'0 14px',borderRadius:9,border:'1px solid rgba(255,255,255,.05)',background:'var(--modal-input-bg)',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)',display:'flex',alignItems:'center',gap:8}
const legend={position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:5}
const fieldset={borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',padding:'16px 12px 12px',position:'relative',flexShrink:0,display:'flex',flexDirection:'column',gap:10}
const fmtDay=(iso)=>{if(!iso)return'—';const d=new Date(iso);if(isNaN(d))return'—';return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}

return<div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column',gap:10,marginTop:10}}>

{isActive?<>
{/* ═══ Extension: existing active visa info + extension months ═══ */}
<div style={fieldset}>
<div style={legend}>
<Plane size={12} strokeWidth={2.2}/>
<span>التأشيرة الحالية (فعّالة)</span>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>رقم الإقامة</label>
<div style={{...roBox,justifyContent:'center'}}>
<Hash size={12} color={C.gold} strokeWidth={1.8}/>
<span style={{fontSize:13,fontWeight:600,color:iqamaNo?'var(--tx)':'var(--tx5)',fontFamily:F,direction:'ltr'}}>{iqamaNo||'—'}</span>
</div>
</div>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>رقم التأشيرة</label>
<div style={{...roBox,justifyContent:'center'}}>
<BadgeCheck size={12} color={C.gold} strokeWidth={1.8}/>
<span style={{fontSize:13,fontWeight:600,color:existingVisa?.visa_number?'var(--tx)':'var(--tx5)',fontFamily:F,direction:'ltr'}}>{existingVisa?.visa_number||'—'}</span>
</div>
</div>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>بداية التأشيرة</label>
<div style={{...roBox,justifyContent:'center'}}>
<Calendar size={12} color={C.gold} strokeWidth={1.8}/>
<span style={{fontSize:13,fontWeight:600,color:existingVisa?.start_date?'var(--tx)':'var(--tx5)',fontFamily:F,direction:'ltr'}}>{fmtDay(existingVisa?.start_date)}</span>
</div>
</div>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>نهاية التأشيرة</label>
<div style={{...roBox,justifyContent:'center'}}>
<Calendar size={12} color="#27a046" strokeWidth={1.8}/>
<span style={{fontSize:13,fontWeight:600,color:existingVisa?.end_date?'#27a046':'var(--tx5)',fontFamily:F,direction:'ltr'}}>{fmtDay(existingVisa?.end_date)}</span>
</div>
</div>
</div>
</div>

<div style={fieldset}>
<div style={legend}>
<CalendarClock size={12} strokeWidth={2.2}/>
<span>مدة التمديد المطلوبة <span style={{color:C.red}}>*</span></span>
</div>
<div style={{display:'flex',alignItems:'center',gap:6}}>
{/* Extension duration — dropdown 1-12 (months). Also defaults exit_type to "single" if it wasn't set. */}
<div style={{flex:1}}>
<NiceSelect compact height={inH} fontSize={13} value={fields.duration_months||''} placeholder="اختر المدة..."
options={Array.from({length:24},(_,i)=>({value:String(i+1),label:fmtMonths(i+1)}))}
onChange={v=>setFields(p=>({...p,duration_months:v,exit_type:fields.exit_type||'single'}))}/>
</div>
</div>
</div>
</>:<>
{/* ═══ Issuance: type selector + duration ═══ */}
<div style={fieldset}>
<div style={legend}>
<Plane size={12} strokeWidth={2.2}/>
<span>نوع التأشيرة <span style={{color:C.red}}>*</span></span>
</div>
<FKSegmented value={fields.exit_type||'single'} onChange={v=>setFields(p=>({...p,exit_type:v}))} height={54}
options={[{v:'single',l:'مفردة',sub:'دخول وخروج مرة واحدة'},{v:'multiple',l:'متعددة',sub:'دخول وخروج عدة مرات'}]}/>
</div>

<div style={fieldset}>
<div style={legend}>
<CalendarClock size={12} strokeWidth={2.2}/>
<span>مدة التأشيرة <span style={{color:C.red}}>*</span></span>
</div>
<div style={{display:'flex',alignItems:'center',gap:6}}>
{/* Issuance duration — dropdown 1-12 (months). */}
<div style={{flex:1}}>
<NiceSelect compact height={inH} fontSize={13} value={fields.duration_months||''} placeholder="اختر المدة..."
options={Array.from({length:24},(_,i)=>({value:String(i+1),label:fmtMonths(i+1)}))}
onChange={v=>setFields(p=>({...p,duration_months:v}))}/>
</div>
</div>
</div>
</>}

</div>
}

// ─── final_exit_visa: reason textarea (final exit only) ───
if(selSvc==='final_exit_visa'){
const legend={position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:5}
const fieldset={borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',padding:'16px 12px 12px',position:'relative',display:'flex',flexDirection:'column',gap:10}
return<div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column',gap:10,marginTop:10}}>

{/* ═══ سبب طلب الخروج النهائي ═══ */}
<div style={{...fieldset,flex:1,minHeight:0}}>
<div style={legend}>
<FileText size={12} strokeWidth={2.2}/>
<span>سبب طلب الخروج النهائي</span>
</div>
<textarea value={fields.reason||''} onChange={e=>setFields(p=>({...p,reason:e.target.value}))}
placeholder='اكتب سبب طلب تأشيرة الخروج النهائي...'
style={{...fS,flex:1,minHeight:0,height:'auto',padding:'12px 14px',resize:'none',textAlign:'right'}}/>
</div>

</div>
}

// ─── name_translation (تعديل الراتب): current salary/iqama + new salary + weeks ───
if(selSvc==='name_translation'){
const workerName=selWorker?.name_ar||''
const iqamaNo=selWorker?.iqama_number||''
const curSalary=selWorker?.gosi_salary||0
const inH=42
const inS={...fS,height:inH}
const roBox={height:inH,padding:'0 14px',borderRadius:9,border:'1px solid rgba(255,255,255,.05)',background:'var(--modal-input-bg)',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)',display:'flex',alignItems:'center',gap:8}
const legend={position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:5}
const fieldset={borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',padding:'16px 12px 12px',position:'relative',flexShrink:0,display:'flex',flexDirection:'column',gap:10}
const fmtMoney=(n)=>Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})
return<div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column',gap:12,marginTop:10}}>

{/* ═══ Fieldset 1: بيانات الراتب الحالي ═══ */}
<div style={fieldset}>
<div style={legend}>
<Wallet size={12} strokeWidth={2.2}/>
<span>بيانات الراتب الحالي</span>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr',gap:10}}>
<InfoCard Icon={Wallet} label="الراتب الحالي (التأمينات)" ltr muted={!(curSalary>0)} value={curSalary>0?`${fmtMoney(curSalary)} ريال`:'—'}/>
</div>
</div>

{/* ═══ Fieldset 2: بيانات الراتب الجديد ═══ */}
<div style={fieldset}>
<div style={legend}>
<TrendingUp size={12} strokeWidth={2.2}/>
<span>بيانات الراتب الجديد</span>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr',gap:10}}>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>الراتب الجديد <span style={{color:C.red}}>*</span></label>
<div style={{display:'flex',alignItems:'center',gap:6}}>
<input type="text" inputMode="decimal" value={fields.new_salary||''} onChange={e=>{const raw=e.target.value.replace(/[^0-9.]/g,'');setFields(p=>({...p,new_salary:raw}))}} placeholder="0" style={{...inS,direction:'ltr',textAlign:'center',flex:1}}/>
<span style={{fontSize:12,fontWeight:600,color:'var(--tx4)',fontFamily:F,flexShrink:0}}>ريال</span>
</div>
</div>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>مدة استمرار الراتب <span style={{color:C.red}}>*</span></label>
<div style={{display:'flex',alignItems:'center',gap:6}}>
{/* Months dropdown 1-12. Migrated from a free-text weeks input. */}
<div style={{flex:1}}>
<NiceSelect compact height={inH} fontSize={13} value={fields.salary_months||''} placeholder="اختر المدة..."
options={Array.from({length:24},(_,i)=>({value:String(i+1),label:fmtMonths(i+1)}))}
onChange={v=>setFields(p=>({...p,salary_months:v}))}/>
</div>
</div>
</div>
</div>
</div>

</div>
}

// ─── passport_update: fieldsets matching register modal (two pages) ───
if(selSvc==='passport_update'){
const origFacility=selWorker?.facility?.name_ar||''
const origUnified=selWorker?.facility?.unified_national_number||''
const curPassportNo=selWorker?.passport_number||''
const curPassportExp=selWorker?.passport_expiry||''
const fmtDay=(iso)=>{if(!iso)return'—';const d=new Date(iso);if(isNaN(d))return'—';return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
const updateMode=fields.update_mode||'extend'
const isRenew=updateMode==='renew'
const inH=42
const inS={...fS,height:inH}
const roBox={height:inH,padding:'0 14px',borderRadius:9,border:'1px solid rgba(255,255,255,.05)',background:'var(--modal-input-bg)',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)',display:'flex',alignItems:'center',gap:8}
const legend={position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:5}
const fieldset={borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',padding:'16px 12px 12px',position:'relative',flexShrink:0,display:'flex',flexDirection:'column',gap:10}
const cityOpts=cities.map(c=>({value:c.id,label:c.name_ar}))
return<div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column',gap:10,marginTop:10}}>

{passportPage===1?<>
{/* ═══ Fieldset 1: بيانات منشأة العامل ═══ */}
<div style={fieldset}>
<div style={legend}>
<Building2 size={12} strokeWidth={2.2}/>
<span>بيانات منشأة العامل</span>
</div>
{origFacility&&<div style={{display:'grid',gridTemplateColumns:'1.6fr 1fr',gap:10}}>
<InfoCard Icon={Building2} label="منشأة العامل" value={origFacility}/>
<InfoCard Icon={Hash} label="الرقم الموحد" ltr muted={!origUnified} value={origUnified||'—'} copy={origUnified&&<button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(origUnified);setCopiedUnified(true);setTimeout(()=>setCopiedUnified(false),1500)}catch{}}} onMouseEnter={e=>{if(!copiedUnified)e.currentTarget.style.color=C.gold}} onMouseLeave={e=>{if(!copiedUnified)e.currentTarget.style.color=C.gold}} title={copiedUnified?'تم النسخ':'نسخ'} style={{width:26,height:26,borderRadius:6,border:`1px solid ${copiedUnified?'rgba(39,160,70,.45)':'rgba(212,160,23,.3)'}`,background:copiedUnified?'rgba(39,160,70,.12)':'rgba(212,160,23,.08)',color:copiedUnified?C.ok:C.gold,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',transition:'color .15s',flexShrink:0}}>{copiedUnified?<Check size={13} strokeWidth={2.4}/>:<Copy size={12} strokeWidth={2}/>}</button>}/>
</div>}
</div>

{/* ═══ Fieldset 2: بيانات الجواز الحالية ═══ */}
<div style={fieldset}>
<div style={legend}>
<IdCard size={12} strokeWidth={2.2}/>
<span>بيانات الجواز الحالية</span>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 11px',borderRadius:9,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',minHeight:40}}>
<Hash size={13} color={C.gold} strokeWidth={1.8} style={{flexShrink:0}}/>
<div style={{display:'flex',flexDirection:'column',gap:4,flex:1,minWidth:0}}>
<span style={{fontSize:10,color:'var(--tx5)',fontWeight:600,letterSpacing:'.2px',lineHeight:1.2}}>رقم جواز السفر الحالي</span>
<span style={{fontSize:13,fontWeight:600,color:curPassportNo?'var(--tx)':'var(--tx5)',fontFamily:F,direction:'ltr',lineHeight:1.2,textAlign:'right'}}>{curPassportNo||'—'}</span>
</div>
</div>
<div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 11px',borderRadius:9,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',minHeight:40}}>
<Calendar size={13} color={C.gold} strokeWidth={1.8} style={{flexShrink:0}}/>
<div style={{display:'flex',flexDirection:'column',gap:4,flex:1,minWidth:0}}>
<span style={{fontSize:10,color:'var(--tx5)',fontWeight:600,letterSpacing:'.2px',lineHeight:1.2}}>تاريخ انتهاء الجواز الحالي</span>
<span style={{fontSize:13,fontWeight:600,color:curPassportExp?'var(--tx)':'var(--tx5)',fontFamily:F,direction:'ltr',lineHeight:1.2,textAlign:'right'}}>{fmtDay(curPassportExp)}</span>
</div>
</div>
</div>
</div>

{/* ═══ Fieldset 3: نوع التحديث ═══ */}
<div style={fieldset}>
<div style={legend}>
<RefreshCw size={12} strokeWidth={2.2}/>
<span>نوع التحديث <span style={{color:C.red}}>*</span></span>
</div>
<FKSegmented value={updateMode} onChange={v=>setFields(p=>({...p,update_mode:v}))} height={54}
options={[{v:'extend',l:'تمديد',sub:'تمديد تاريخ الانتهاء فقط'},{v:'renew',l:'تجديد',sub:'إصدار جواز جديد بكامل بياناته'}]}/>
</div>
</>:<>
{/* ═══ Page 2: New passport fields ═══ */}
<div style={fieldset}>
<div style={legend}>
<IdCard size={12} strokeWidth={2.2}/>
<span>{isRenew?'بيانات الجواز الجديد':'تمديد تاريخ الانتهاء'}</span>
</div>
{isRenew?<>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>رقم جواز السفر الجديد <span style={{color:C.red}}>*</span></label>
<input type="text" value={fields.new_passport_no||''} onChange={e=>setFields(p=>({...p,new_passport_no:e.target.value.toUpperCase()}))} placeholder="T0000000" style={{...inS,direction:'ltr',textAlign:'center',letterSpacing:'.5px'}}/>
</div>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>مكان إصدار الجواز <span style={{color:C.red}}>*</span></label>
<input type="text" value={fields.new_passport_issue_city||''} onChange={e=>setFields(p=>({...p,new_passport_issue_city:e.target.value}))} placeholder="مدينة الإصدار" style={{...inS,textAlign:'center'}}/>
</div>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>تاريخ إصدار الجواز <span style={{color:C.red}}>*</span></label>
<CompactDatePicker value={fields.new_passport_issue_date||''} onChange={v=>setFields(p=>({...p,new_passport_issue_date:v}))} width="100%" height={inH}/>
</div>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>تاريخ انتهاء الجواز <span style={{color:C.red}}>*</span></label>
<CompactDatePicker value={fields.new_passport_expiry||''} onChange={v=>setFields(p=>({...p,new_passport_expiry:v}))} width="100%" height={inH}/>
</div>
</div>
</>:<>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>تاريخ الانتهاء الحالي</label>
<div style={{...roBox,justifyContent:'center',gap:8}}>
<Calendar size={13} color={C.gold} strokeWidth={1.8}/>
<span style={{fontSize:13,fontWeight:600,color:curPassportExp?'var(--tx4)':'var(--tx5)',fontFamily:F,direction:'ltr'}}>{fmtDay(curPassportExp)}</span>
</div>
</div>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>تاريخ انتهاء الجواز الجديد <span style={{color:C.red}}>*</span></label>
<CompactDatePicker value={fields.new_passport_expiry||''} onChange={v=>setFields(p=>({...p,new_passport_expiry:v}))} width="100%" height={inH}/>
</div>
</div>
</>}
</div>
</>}

</div>
}

// ─── Kafala transfer: search certified transfer quotes by worker name / iqama / quote no ───
if(selSvc==='kafala_transfer'){
const q=kafalaQuoteQ.trim().toLowerCase()
const matches=q?kafalaQuotes.filter(it=>(it.worker_name||'').toLowerCase().includes(q)||(it.iqama_number||'').includes(q)||(it.quote_no||'').toLowerCase().includes(q)).slice(0,3):kafalaQuotes.slice(0,3)
const fmtPrice=(n)=>Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})
const fmtPricedAt=(iso)=>{if(!iso)return'';const d=new Date(iso);if(isNaN(d))return'';return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
const pickQuote=(qt)=>{
setSelKafalaQuote(qt)
setKafalaSameClient(null)
const n=qt._notes||{}
setFields(p=>({...p,
nationality:n.nationality||p.nationality||'',
iqama_expiry:n.iqama_expiry||p.iqama_expiry||'',
worker_status:n.worker_status||p.worker_status||'',
current_profession:n.current_profession||p.current_profession||'',
work_card_expiry:n.work_card_expiry||p.work_card_expiry||'',
birth_date:n.birth_date||p.birth_date||'',
change_profession:n.change_profession??p.change_profession,
new_occupation:n.new_occupation||p.new_occupation||'',
renew_iqama:typeof n.duration_months==='number'?n.duration_months>0:p.renew_iqama,
renewal_months:n.duration_months?String(n.duration_months):p.renewal_months,
expected_iqama_months:n.expected_iqama_days?String(Math.round(n.expected_iqama_days/30)):p.expected_iqama_months,
}))
setKafalaPricing(p=>({...p,
transferFeeInput:String(qt.transfer_fee||''),
iqamaRenewalFee:String(qt.iqama_cost||''),
workPermitRate:String(qt.work_permit_cost||''),
medicalFee:String(qt.insurance_cost||''),
officeFee:String(qt.other_costs||''),
extras:Array.isArray(n.extras)?n.extras:p.extras,
}))
}
return<ModalSection flex Icon={Receipt} label="حسبة التنازل" hint="اختر حسبة تنازل مصدقة" style={{marginTop:8}}><div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column',gap:10}}>
{/* Search input — hidden when a quote is selected */}
{!selKafalaQuote&&<div style={{position:'relative'}}>
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{position:'absolute',top:'50%',left:14,transform:'translateY(-50%)',pointerEvents:'none',transition:'stroke .2s'}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
<input value={kafalaQuoteQ} onChange={e=>setKafalaQuoteQ(e.target.value)} placeholder="ابحث باسم العامل أو رقم الإقامة أو رقم طلب حسبة التنازل..." onFocus={e=>{e.currentTarget.style.borderColor=C.bentoGold;e.currentTarget.style.boxShadow=`0 0 0 1px ${C.bentoGold}33, inset 0 1px 2px rgba(0,0,0,.2)`;e.currentTarget.previousElementSibling.style.stroke=C.bentoGold}} onBlur={e=>{e.currentTarget.style.borderColor='transparent';e.currentTarget.style.boxShadow='inset 0 1px 2px rgba(0,0,0,.2)';e.currentTarget.previousElementSibling.style.stroke='rgba(255,255,255,.35)'}} style={{...fkSF,padding:'0 14px 0 40px',textAlign:'right',border:'1px solid transparent'}}/>
</div>}
{/* Selected quote summary */}
{selKafalaQuote&&(()=>{const qt=selKafalaQuote;const _tot=Number((pricing&&pricing.total)||0)||Number(qt.client_charge||0);const minFees=Math.max(0,_tot-Number((kafalaLines&&kafalaLines.officeFee)||0));return<div style={{borderRadius:12,border:'1.5px solid rgba(212,160,23,.45)',background:'linear-gradient(135deg,rgba(212,160,23,.08),rgba(212,160,23,.02))',padding:14,position:'relative',display:'flex',flexDirection:'column',gap:10}}>
<div style={{position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:6}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
<span>حسبة تنازل مصدقة</span>
</div>
<button onClick={()=>{setSelKafalaQuote(null);setKafalaSameClient(null)}} title="إلغاء الاختيار" style={{position:'absolute',top:-11,left:14,height:22,padding:'0 10px',borderRadius:6,border:'1px solid rgba(192,57,43,.3)',background:'var(--modal-bg)',color:C.red,cursor:'pointer',fontSize:10,fontFamily:F,fontWeight:600}}>إلغاء</button>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:4}}>
<div><div style={{fontSize:10,color:'var(--tx5)',fontWeight:600,marginBottom:3}}>العامل</div><div style={{fontSize:13,fontWeight:600,color:'var(--tx)',fontFamily:F}}>{qt.worker_name||'—'}</div></div>
<div><div style={{fontSize:10,color:'var(--tx5)',fontWeight:600,marginBottom:3}}>رقم الإقامة</div><div style={{fontSize:13,fontWeight:600,color:'var(--tx)',direction:'ltr',textAlign:'right'}}>{qt.iqama_number||'—'}</div></div>
<div><div style={{fontSize:10,color:'var(--tx5)',fontWeight:600,marginBottom:3}}>رقم طلب التسعيرة</div><div style={{fontSize:13,fontWeight:600,color:C.gold,direction:'ltr',textAlign:'right'}}>{qt.quote_no?noDash(qt.quote_no):'—'}</div></div>
<div><div style={{fontSize:10,color:'var(--tx5)',fontWeight:600,marginBottom:3}}>مجموع الرسوم <span style={{opacity:.7}}>(عدا المكتب)</span></div><div style={{fontSize:13,fontWeight:600,color:C.gold,textAlign:'right'}}><bdi>{fmtPrice(minFees)}</bdi> <span style={{fontSize:10,color:'var(--tx5)'}}>ريال</span></div></div>
<div><div style={{fontSize:10,color:'var(--tx5)',fontWeight:600,marginBottom:3}}>الإجمالي</div><div style={{fontSize:13,fontWeight:600,color:C.gold,textAlign:'right'}}><bdi>{fmtPrice(qt.client_charge)}</bdi> <span style={{fontSize:10,color:'var(--tx5)'}}>ريال</span></div></div>
</div>
</div>})()}
{/* Results / loading / empty */}
{!selKafalaQuote&&<div style={{display:'flex',flexDirection:'column',gap:8}}>
{loadingKafalaQuotes?<Spinner label="جارٍ تحميل حسبات التنازل..."/>
:matches.length>0?matches.map(qt=>(
<div key={qt.id} onClick={()=>pickQuote(qt)} style={{padding:'12px 14px',borderRadius:10,cursor:'pointer',border:'1px solid rgba(255,255,255,.06)',background:'rgba(255,255,255,.03)',display:'flex',flexDirection:'column',gap:6,transition:'.2s'}}
onMouseEnter={e=>{e.currentTarget.style.background='rgba(212,160,23,.07)';e.currentTarget.style.borderColor='rgba(212,160,23,.25)'}}
onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.03)';e.currentTarget.style.borderColor='rgba(255,255,255,.06)'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
<span style={{fontSize:13,fontWeight:600,color:'var(--tx)',fontFamily:F,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{qt.worker_name||'—'}</span>
<span style={{fontSize:11,fontWeight:600,color:C.gold,flexShrink:0}}><bdi>{fmtPrice(qt.client_charge)}</bdi> ريال</span>
</div>
<div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
{qt.iqama_number&&<span style={{fontSize:10.5,color:'var(--tx4)',fontWeight:600,padding:'2px 7px',borderRadius:5,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.05)',direction:'ltr'}}>إقامة: {qt.iqama_number}</span>}
{qt.quote_no&&<span style={{fontSize:10.5,color:C.bentoGold,fontWeight:600,padding:'2px 7px',borderRadius:5,background:'rgba(212,160,23,.06)',border:'1px solid rgba(212,160,23,.18)',direction:'ltr'}}>{noDash(qt.quote_no)}</span>}
{qt.priced_at&&<span style={{fontSize:10,color:'var(--tx5)',fontWeight:600,marginRight:'auto',direction:'ltr'}}>{fmtPricedAt(qt.priced_at)}</span>}
</div>
</div>
)):<div style={{padding:'40px 20px',textAlign:'center',color:'var(--tx5)',fontSize:12,fontFamily:F,background:'var(--modal-input-bg)',borderRadius:9,border:'1px solid rgba(255,255,255,.05)'}}>
<div style={{fontSize:13,fontWeight:600,color:'var(--tx2)',marginBottom:5}}>لا توجد حسبة تنازل مطابقة</div>
<div style={{fontSize:10.5,color:'var(--tx5)'}}>{q?'جرّب بحثاً آخر':'يمكنك إصدار حسبة تنازل من حاسبة التنازل'}</div>
</div>}
</div>}
</div></ModalSection>
}

// ─── Supplier payroll: custom framed details (FormKit) ───
// Worker is already chosen in the previous step → no redundant name field. Three FormKit inputs inside a
// gold-framed ModalSection: contact phone, unpaid-months dropdown, and the total amount for those salaries.
if(selSvc==='supplier_payroll'){
// Prefill the contact phone once from the selected worker's stored number (strip 966 / leading 0 → 9 digits).
if(!prefilledRef.current.has('worker_phone')&&!fields.worker_phone&&selWorker?.phone){
const lp=String(selWorker.phone).replace(/\D/g,'').replace(/^966/,'').replace(/^0/,'').slice(-9)
if(lp){prefilledRef.current.add('worker_phone');setTimeout(()=>setFields(p=>p.worker_phone?p:{...p,worker_phone:lp}),0)}
}
const monthLabel=(n)=>n===1?'شهر واحد':n===2?'شهران':n<=10?`${n} أشهر`:`${n} شهراً`
const monthOpts=Array.from({length:24},(_,i)=>({value:String(i+1),label:monthLabel(i+1)}))
return<ModalSection flex Icon={Coins} label="تفاصيل الرواتب" hint="رواتب العامل غير المدفوعة">
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginTop:6}}>
<FKPhone label="رقم جوال العامل" req value={fields.worker_phone||''} onChange={v=>setFields(p=>({...p,worker_phone:v}))}/>
<FKSelect label="عدد أشهر الرواتب غير المدفوعة" req placeholder="اختر عدد الأشهر..." searchable={false}
value={fields.unpaid_salaries_count||null} onChange={v=>setFields(p=>({...p,unpaid_salaries_count:v}))}
options={monthOpts} getKey={o=>o.value} getLabel={o=>o.label}/>
<FKCurrency label="المبلغ الإجمالي لهذه الرواتب" req full value={fields.total_amount||''} onChange={v=>setFields(p=>({...p,total_amount:v}))}/>
</div>
</ModalSection>
}

const allInputs=(selectedService?.inputs?.length?selectedService.inputs:SERVICE_INPUTS[selSvc])||[]
if(allInputs.length===0)return<div style={{textAlign:'center',padding:40,color:'var(--tx5)',fontSize:12,background:'rgba(255,255,255,.02)',borderRadius:12,border:'1px solid rgba(255,255,255,.04)'}}>
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom:8}}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
<div>لا توجد حقول إضافية — يمكنك المتابعة</div>
</div>

// If inputs have sections, filter by current kafalaPage
const hasSections=allInputs.some(i=>i.section)
const inputs=hasSections?allInputs.filter(i=>i.section===kafalaPage):allInputs
const sectionTitles={1:'بيانات العامل',2:'تفاصيل النقل'}
const totalSections=hasSections?Math.max(...allInputs.map(i=>i.section||1)):1

const fieldsGrid=<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,flex:1,minHeight:0,gridAutoRows:'1fr',alignContent:'stretch'}}>
{inputs.map(inp=>{
// Conditional show_if — only render if dependency field is truthy
if(inp.show_if&&!fields[inp.show_if])return null
if(inp.show_if_eq&&fields[inp.show_if_eq.key]!==inp.show_if_eq.value)return null
// Auto-prefill from worker data (once per field — skip if already prefilled or user cleared)
if(!prefilledRef.current.has(inp.key)&&!fields[inp.key]&&selWorker){
const doPrefill=(v)=>{if(v){prefilledRef.current.add(inp.key);setTimeout(()=>setFields(p=>p[inp.key]?p:{...p,[inp.key]:v}),0)}}
if(inp.prefill_from){const path=inp.prefill_from.split('.');let wVal=selWorker;for(const p of path)wVal=wVal?.[p];doPrefill(wVal)}
if(inp.key==='nationality')doPrefill(selWorker.country?.nationality_ar)
if(inp.key==='current_profession')doPrefill(selWorker.occupation?.value_ar)
if(inp.key==='work_card_expiry'&&selWorker.work_permits?.length){const latest=[...selWorker.work_permits].sort((a,b)=>new Date(b.wp_expiry_date||0)-new Date(a.wp_expiry_date||0))[0];doPrefill(latest?.wp_expiry_date)}
}
const val=fields[inp.key]
const colSpan=inp.grid_col==='1'?{gridColumn:'1/-1'}:{}
return<div key={inp.key} style={colSpan}>
{inp.type==='toggle'?
<FKSegmented label={inp.label_ar} value={val} onChange={v=>setFields(p=>({...p,[inp.key]:v}))}
options={[{v:true,l:'نعم',c:C.ok},{v:false,l:'لا',c:C.blue}]}/>
:inp.type==='select'?
<FKSelect label={inp.label_ar} req={inp.required} placeholder="اختر..." value={val||null}
options={inp.source==='regions'?regions.map(r=>({value:r.id,label:r.name_ar})):inp.source==='countries'?lkCountries.map(c=>({value:c.nationality_ar,label:c.nationality_ar})):inp.source==='occupations'?lkOccupations.map(o=>({value:o.value_ar,label:o.value_ar})):(inp.options||[])}
getKey={o=>o.value} getLabel={o=>String(o.label??'')}
onChange={v=>setFields(p=>({...p,[inp.key]:v}))}/>
:inp.type==='date'?
<FKDate label={inp.label_ar} req={inp.required} value={val||''} onChange={v=>setFields(p=>({...p,[inp.key]:v}))}/>
:inp.type==='date_hijri'?
(()=>{
const parts=val?val.split('-'):[]
const dY=parts[0]||'',dM=parts[1]||'',dD=parts[2]||''
const curYear=new Date().getFullYear()
const years=Array.from({length:60},(_,i)=>({value:String(curYear-40+i),label:String(curYear-40+i)}))
const months=Array.from({length:12},(_,i)=>({value:String(i+1).padStart(2,'0'),label:String(i+1).padStart(2,'0')}))
const maxDay=dY&&dM?new Date(parseInt(dY),parseInt(dM),0).getDate():31
const days=Array.from({length:maxDay},(_,i)=>({value:String(i+1).padStart(2,'0'),label:String(i+1)}))
const setDatePart=(part,v)=>{
const p=val?val.split('-'):['','','']
if(part==='y')p[0]=v;if(part==='m')p[1]=v;if(part==='d')p[2]=v
const built=p[0]&&p[1]&&p[2]?`${p[0]}-${p[1]}-${p[2]}`:''
setFields(prev=>({...prev,[inp.key]:built||`${p[0]||''}-${p[1]||''}-${p[2]||''}`}))
}
return<div style={{display:'flex',flexDirection:'column',gap:3}}>
<FKLbl req={inp.required}>{inp.label_ar}</FKLbl>
<div style={{display:'grid',gridTemplateColumns:'1fr 1.2fr .8fr',gap:5,direction:'ltr'}}>
<NiceSelect value={dY} placeholder="السنة" options={years} searchable={false} onChange={v=>setDatePart('y',v)}/>
<NiceSelect value={dM} placeholder="الشهر" options={months} searchable={false} onChange={v=>setDatePart('m',v)}/>
<NiceSelect value={dD} placeholder="اليوم" options={days} searchable={false} onChange={v=>setDatePart('d',v)}/>
</div>
{inp.hijri&&val&&/^\d{4}-\d{2}-\d{2}$/.test(val)&&(()=>{
const hKey=inp.key+'_hijri'
const hSrcKey=inp.key+'_hijri_src'// tracks which gregorian date generated the current hijri
const autoH=toHijri(val)
// Re-calculate hijri whenever the gregorian date changes, preserve manual edits otherwise
if(autoH&&fields[hSrcKey]!==val){setTimeout(()=>setFields(p=>({...p,[hKey]:autoH,[hSrcKey]:val})),0)}
const hVal=fields[hKey]||autoH
return<div style={{display:'inline-flex',alignItems:'center',gap:5,padding:'3px 9px',borderRadius:6,background:'rgba(212,160,23,.07)',border:'1px solid rgba(212,160,23,.18)',alignSelf:'flex-end'}}>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
<input value={hVal} onChange={e=>{const v=e.target.value.replace(/[^\d/]/g,'');setFields(prev=>({...prev,[hKey]:v}))}}
style={{width:80,background:'transparent',border:'none',outline:'none',color:C.gold,fontSize:11,fontWeight:600,fontFamily:F,textAlign:'center',padding:0,direction:'ltr'}}/>
<span style={{fontSize:10,fontWeight:600,color:C.gold,fontFamily:F}}>هـ</span>
</div>
})()}
</div>
})()
:inp.type==='textarea'?
<FKTextArea label={inp.label_ar} req={inp.required} full={false} value={val||''} onChange={v=>setFields(p=>({...p,[inp.key]:v}))} placeholder={inp.placeholder||''} rows={3}/>
:inp.type==='number'?
<FKNumber label={inp.label_ar} req={inp.required} value={val||''} onChange={v=>setFields(p=>({...p,[inp.key]:v}))} placeholder={inp.placeholder||''}/>
:<FKText label={inp.label_ar} req={inp.required} value={val||''} onChange={v=>setFields(p=>({...p,[inp.key]:v}))} placeholder={inp.placeholder||''} dir={inp.direction==='ltr'?'ltr':'rtl'}/>
}
</div>})}
</div>

return hasSections?<div style={{flex:1,minHeight:0,borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',padding:'18px 14px 14px',position:'relative',display:'flex',flexDirection:'column',gap:12,marginTop:10}}>
<div style={{position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:6}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{kafalaPage===1?<><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>:<><path d="M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7"/></>}</svg>
<span>{sectionTitles[kafalaPage]||`القسم ${kafalaPage}`}</span>
<span style={{fontSize:10,fontWeight:600,color:'var(--tx5)',marginRight:4}}>({kafalaPage}/{totalSections})</span>
</div>
{fieldsGrid}
</div>:fieldsGrid
})()}
</div>}

{/* ═══ Step 4: Pricing ═══ */}
{step===4&&<div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column',justifyContent:'flex-start'}}>

{/* ── Kafala-transfer editable pricing inputs ── */}
{selSvc==='kafala_transfer'&&!kafalaPayStep&&(()=>{
const k=kafalaPricing
const ac=kafalaAutoCalc||{}
const setK=(key,v)=>setKafalaPricing(p=>({...p,[key]:v}))
// autoVal = minimum (from settings-based calc); placeholder shows the minimum; user can type higher but not lower
const numIn=(key,autoVal,fallbackPH)=>{
const minVal=Number(autoVal)||0
const ph=minVal>0?fmtAmt(minVal):(fallbackPH||'0')
return<input type="text" inputMode="decimal" value={fmtAmt(k[key])} onChange={e=>{const raw=e.target.value.replace(/[^0-9.]/g,'');setK(key,raw)}} onBlur={e=>{const raw=e.target.value.replace(/[^0-9.]/g,'');if(raw!==''&&Number(raw)<minVal)setK(key,String(minVal))}} placeholder={ph} style={{...fS,direction:'ltr',textAlign:'center'}}/>
}
const togChip=(label,stateKey,clr)=>{
const on=!!k[stateKey+'_on']
const c=clr||C.gold
return<div style={{display:'flex',flexDirection:'column',gap:5,flex:1,minWidth:0}}>
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:6}}>
<label style={{fontSize:14,fontWeight:600,color:on?c:'var(--tx4)',fontFamily:F,transition:'.2s'}}>{label}</label>
<button type="button" onClick={()=>setK(stateKey+'_on',!on)} style={{width:40,height:22,borderRadius:11,border:'none',background:on?c:'rgba(255,255,255,.12)',cursor:'pointer',position:'relative',transition:'.2s',padding:0,flexShrink:0}}>
<span style={{position:'absolute',width:18,height:18,borderRadius:'50%',background:'#fff',top:2,right:on?2:20,transition:'.2s'}}/>
</button>
</div>
<div style={{display:'flex',alignItems:'center',background:on?'rgba(0,0,0,.18)':'rgba(255,255,255,.02)',border:'1px solid transparent',borderRadius:9,boxShadow:on?'inset 0 1px 2px rgba(0,0,0,.2)':'none',height:42,opacity:on?1:.5,transition:'.2s'}}>
<input type="text" inputMode="decimal" disabled={!on} value={fmtAmt(k[stateKey]||'')} onChange={e=>{const raw=e.target.value.replace(/[^0-9.]/g,'');setK(stateKey,raw)}} placeholder="0" style={{flex:1,minWidth:0,height:'100%',padding:'0 10px',border:'none',background:'transparent',fontFamily:F,fontSize:14,fontWeight:600,color:on?'var(--tx)':'var(--tx5)',outline:'none',direction:'ltr',textAlign:'center'}}/>
<span style={{fontSize:12,color:on?c:'var(--tx5)',fontWeight:600,padding:'0 8px 0 4px',fontFamily:F,flexShrink:0}}>ريال</span>
</div>
</div>}
return<div style={{marginTop:10,borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',padding:'18px 14px 14px',position:'relative'}}>
<div style={{position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:6}}>
<span>التسعيرة</span>
{iqamaExpiredKafala&&<span style={{fontSize:9,color:C.red,background:'rgba(192,57,43,.12)',padding:'1px 6px',borderRadius:4,fontWeight:600}}>الإقامة منتهية</span>}
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px 10px'}}>
<div><label style={{...lblS,fontSize:12,marginBottom:5}}>رسوم النقل</label>{numIn('transferFeeInput',ac.transferFee,'2,000')}</div>
<div><label style={{...lblS,fontSize:12,marginBottom:5}}>تجديد الإقامة{ac.iqamaFine>0&&<span style={{color:C.red,fontSize:10,marginRight:4,fontWeight:600}}>(شامل الغرامة)</span>}</label>{numIn('iqamaRenewalFee',ac.iqamaRenewalFee,'0')}</div>
<div><label style={{...lblS,fontSize:12,marginBottom:5}}>رسوم كرت العمل</label>{numIn('workPermitRate',ac.workPermit,'100')}</div>
<div><label style={{...lblS,fontSize:12,marginBottom:5}}>التأمين الطبي</label>{numIn('medicalFee',ac.medical,'0')}</div>
{fields.change_profession===true&&<div><label style={{...lblS,fontSize:12,marginBottom:5}}>رسم تغيير المهنة</label>{numIn('profChangeInput',ac.profChange,'200')}</div>}
<div><label style={{...lblS,fontSize:12,marginBottom:5}}>رسوم المكتب</label>{numIn('officeFee',ac.officeFee,'0')}</div>
</div>

{/* Extras */}
<div style={{marginTop:14,paddingTop:14,borderTop:'1px solid rgba(255,255,255,.05)'}}>
<div style={{display:'flex',gap:6,alignItems:'center'}}>
<input value={kafalaExtraName} onChange={e=>setKafalaExtraName(e.target.value)} placeholder="بند إضافي" style={{...fS,flex:2}}/>
<input type="text" inputMode="decimal" value={fmtAmt(kafalaExtraAmount)} onChange={e=>{const raw=e.target.value.replace(/[^0-9.]/g,'');setKafalaExtraAmount(raw)}} placeholder="المبلغ" style={{...fS,flex:1,direction:'ltr',textAlign:'center'}}/>
<button type="button" onClick={()=>{if(!kafalaExtraName||!kafalaExtraAmount)return;setKafalaPricing(p=>({...p,extras:[...(p.extras||[]),{name:kafalaExtraName,amount:kafalaExtraAmount}]}));setKafalaExtraName('');setKafalaExtraAmount('')}} style={{height:42,padding:'0 14px',borderRadius:9,border:'1px solid rgba(212,160,23,.3)',background:'rgba(212,160,23,.12)',color:C.gold,fontFamily:F,fontSize:14,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>+</button>
</div>
{(k.extras||[]).length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:6}}>
{k.extras.map((e,i)=><span key={i} style={{display:'inline-flex',alignItems:'center',gap:4,padding:'2px 8px',borderRadius:5,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.06)',fontSize:10,fontWeight:600,color:'var(--tx2)'}}>
{e.name} <span style={{color:C.gold,fontWeight:600}}>{Number(e.amount).toLocaleString('en-US')}</span>
<span onClick={()=>setKafalaPricing(p=>({...p,extras:p.extras.filter((_,idx)=>idx!==i)}))} style={{color:C.red,cursor:'pointer',fontWeight:600}}>×</span>
</span>)}
</div>}
</div>

{/* Subtotal + Deductions + Total */}
<div style={{marginTop:14,paddingTop:14,borderTop:'1px solid rgba(255,255,255,.05)',display:'flex',flexDirection:'column',gap:10}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<span style={{fontSize:12,fontWeight:600,color:'var(--tx2)'}}>إجمالي الرسوم</span>
<span style={{fontSize:14,fontWeight:600,color:'var(--tx)'}}>{Number(pricing.subtotal||0).toLocaleString('en-US',{minimumFractionDigits:2})} ريال</span>
</div>
{/* Toggle chips for deductions */}
<div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
{togChip('خصم','discount',C.gold)}
{togChip('رصيد أبشر','absherBalance','#2ea043')}
</div>
{/* Final total */}
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:5,borderTop:'1px dashed rgba(212,160,23,.2)'}}>
<span style={{fontSize:14,fontWeight:600,color:C.gold}}>الإجمالي</span>
<span style={{fontSize:17,fontWeight:600,color:C.gold}}>{Number(pricing.total).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} ريال</span>
</div>
</div>
</div>
})()}

{/* ═══ Kafala / Iqama-renewal Payment Plan: separate sub-step after pricing ═══ */}
{(selSvc==='kafala_transfer'||selSvc==='iqama_renewal')&&kafalaPayStep&&(()=>{
const total=Number(pricing.total)||0
const lines=selSvc==='iqama_renewal'?iqamaRenewalLines:kafalaLines
const officeFee=Number((lines&&lines.officeFee)||0)
// First payment must cover all fees except the office fee (only the office fee may be deferred to later installments).
const minFirst=Math.max(0,total-officeFee)
const inst=kafalaInstallments
const sumPaid=inst.reduce((s,x)=>s+(parseFloat(x.amount)||0),0)
const remaining=Math.max(0,total-sumPaid)
const addInst=()=>setKafalaInstallments(p=>p.length>=5?p:[...p,{amount:'',date:''}])
const rmInst=(i)=>setKafalaInstallments(p=>p.filter((_,idx)=>idx!==i))
const setIF=(i,k,v)=>setKafalaInstallments(p=>p.map((x,idx)=>idx===i?{...x,[k]:v}:x))
return<div style={{flex:1,minHeight:0,borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',padding:'16px 14px 12px',position:'relative',marginTop:11,display:'flex',flexDirection:'column',gap:10}}>
<div style={{position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:5}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
<span>طريقة الدفع</span>
</div>
{/* Total floating on left of top border */}
<div style={{position:'absolute',top:-9,left:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:11,fontWeight:600,color:C.gold,fontFamily:F}}>الإجمالي: <span style={{direction:'ltr',display:'inline-block'}}>{fmtAmt(total.toFixed(2))}</span> ريال</div>
<FKSegmented value={kafalaPayMode} onChange={setKafalaPayMode} height={42}
options={[{v:'single',l:'دفعة واحدة'},{v:'split',l:'دفعات متعددة'}]}/>
{kafalaPayMode==='split'&&<div style={{display:'flex',flexDirection:'column',gap:10,flex:1,minHeight:0,paddingTop:10}}>
{inst.map((row,i)=>{
const idxLbl=['الدفعة الأولى','الدفعة الثانية','الدفعة الثالثة','الدفعة الرابعة','الدفعة الخامسة'][i]||`الدفعة ${i+1}`
const val=parseFloat(row.amount)||0
const isFirst=i===0
const under=isFirst&&val>0&&val<minFirst
const dateOn=row.dateOn===true||!!row.date
const canAdd=isFirst&&inst.length<5
return<div key={i} style={{display:'grid',gridTemplateColumns:'auto minmax(110px,150px) 1fr auto',gap:8,alignItems:'center'}}>
<span style={{fontSize:11,fontWeight:600,color:'var(--tx2)',minWidth:90,textAlign:'right'}}>{idxLbl}</span>
<input type="text" inputMode="decimal" value={fmtAmt(row.amount)} onChange={e=>{const raw=e.target.value.replace(/[^0-9.]/g,'');setIF(i,'amount',raw)}} onBlur={e=>{const raw=e.target.value.replace(/[^0-9.]/g,'');if(raw!==''&&Number(raw)>total)setIF(i,'amount',String(total))}} placeholder={isFirst?fmtAmt(minFirst.toFixed(2)):'المبلغ'} style={{...fS,height:42,fontSize:12,direction:'ltr',textAlign:'center',borderColor:under?C.red+'66':'rgba(255,255,255,.1)'}}/>
{isFirst?(canAdd?<button type="button" onClick={addInst} onMouseEnter={e=>{e.currentTarget.style.background='rgba(212,160,23,.07)';e.currentTarget.style.borderColor='rgba(212,160,23,.85)'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='rgba(212,160,23,.55)'}} style={{height:42,width:'100%',padding:'0 12px',borderRadius:9,border:'1.3px dashed rgba(212,160,23,.55)',background:'transparent',color:C.gold,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',display:'flex',alignItems:'center',justifyContent:'center',gap:6,transition:'.15s'}}>
<span>إضافة دفعة</span>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
</button>:<span/>):(dateOn?<div style={{display:'flex',alignItems:'center',gap:4}}>
<CompactDatePicker value={row.date||''} onChange={(v)=>setIF(i,'date',v)} width={'100%'}/>
<button type="button" onClick={()=>{setIF(i,'date','');setIF(i,'dateOn',false)}} style={{width:30,height:30,flexShrink:0,borderRadius:7,border:'1px solid rgba(192,57,43,.15)',background:'rgba(192,57,43,.06)',color:C.red,cursor:'pointer',fontSize:14,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center'}} title="إلغاء التاريخ">×</button>
</div>:<button type="button" onClick={()=>setIF(i,'dateOn',true)} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',height:42,width:'100%',borderRadius:9,border:'1.3px dashed rgba(212,160,23,.55)',background:'transparent',color:C.gold,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',justifyContent:'center'}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg>
إضافة تاريخ
</button>)}
{inst.length>1&&!isFirst?<button type="button" onClick={()=>rmInst(i)} title="حذف الدفعة" style={{width:30,height:30,borderRadius:7,border:'1px solid rgba(192,57,43,.25)',background:'rgba(192,57,43,.12)',color:C.red,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>:<span style={{width:30}}/>}
</div>
})}
<div style={{display:'flex',justifyContent:'flex-end',alignItems:'center',marginBottom:8}}>
<div style={{fontSize:11,fontWeight:600}}>
<span style={{color:'var(--tx4)'}}>متبقّي: <span style={{color:remaining>0?C.gold:C.ok,direction:'ltr',display:'inline-block'}}>{fmtAmt(remaining.toFixed(2))}</span> ريال</span>
</div>
</div>
</div>}
{kafalaPayMode==='single'&&<div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6,color:'var(--tx4)'}}>
<div style={{fontSize:12,fontWeight:600}}>سيتم دفع الإجمالي دفعة واحدة</div>
<div style={{fontSize:18,fontWeight:600,color:C.gold}}><span style={{direction:'ltr',display:'inline-block'}}>{fmtAmt(total.toFixed(2))}</span> ريال</div>
</div>}
</div>
})()}

{/* ── Iqama-renewal editable pricing (same layout as kafala, minus transfer fee) ── */}
{selSvc==='iqama_renewal'&&!kafalaPayStep&&(()=>{
const k=iqamaPricing
const ac=iqamaRenewalAutoCalc||{}
const setK=(key,v)=>setIqamaPricing(p=>({...p,[key]:v}))
const numIn=(key,autoVal,fallbackPH)=>{
const minVal=Number(autoVal)||0
const ph=minVal>0?fmtAmt(minVal):(fallbackPH||'0')
return<input type="text" inputMode="decimal" value={fmtAmt(k[key])} onChange={e=>{const raw=e.target.value.replace(/[^0-9.]/g,'');setK(key,raw)}} onBlur={e=>{const raw=e.target.value.replace(/[^0-9.]/g,'');if(raw!==''&&Number(raw)<minVal)setK(key,String(minVal))}} placeholder={ph} style={{...fS,direction:'ltr',textAlign:'center'}}/>
}
const togChip=(label,stateKey,clr)=>{
const on=!!k[stateKey+'_on']
const c=clr||C.gold
return<div style={{display:'flex',flexDirection:'column',gap:5,flex:1,minWidth:0}}>
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:6}}>
<label style={{fontSize:14,fontWeight:600,color:on?c:'var(--tx4)',fontFamily:F,transition:'.2s'}}>{label}</label>
<button type="button" onClick={()=>setK(stateKey+'_on',!on)} style={{width:40,height:22,borderRadius:11,border:'none',background:on?c:'rgba(255,255,255,.12)',cursor:'pointer',position:'relative',transition:'.2s',padding:0,flexShrink:0}}>
<span style={{position:'absolute',width:18,height:18,borderRadius:'50%',background:'#fff',top:2,right:on?2:20,transition:'.2s'}}/>
</button>
</div>
<div style={{display:'flex',alignItems:'center',background:on?'rgba(0,0,0,.18)':'rgba(255,255,255,.02)',border:'1px solid transparent',borderRadius:9,boxShadow:on?'inset 0 1px 2px rgba(0,0,0,.2)':'none',height:42,opacity:on?1:.5,transition:'.2s'}}>
<input type="text" inputMode="decimal" disabled={!on} value={fmtAmt(k[stateKey]||'')} onChange={e=>{const raw=e.target.value.replace(/[^0-9.]/g,'');setK(stateKey,raw)}} placeholder="0" style={{flex:1,minWidth:0,height:'100%',padding:'0 10px',border:'none',background:'transparent',fontFamily:F,fontSize:14,fontWeight:600,color:on?'var(--tx)':'var(--tx5)',outline:'none',direction:'ltr',textAlign:'center'}}/>
<span style={{fontSize:12,color:on?c:'var(--tx5)',fontWeight:600,padding:'0 8px 0 4px',fontFamily:F,flexShrink:0}}>ريال</span>
</div>
</div>}
return<div style={{borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',padding:'16px 14px 12px',position:'relative',marginTop:11}}>
<div style={{position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:6}}>
<span>التسعيرة</span>
{iqamaExpiredRenewal&&<span style={{fontSize:9,color:C.red,background:'rgba(192,57,43,.12)',padding:'1px 6px',borderRadius:4,fontWeight:600}}>الإقامة منتهية</span>}
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px 10px'}}>
{fields.change_profession===true&&<div><label style={{...lblS,marginBottom:3}}>رسم تغيير المهنة</label>{numIn('profChangeInput',ac.profChange,'200')}</div>}
<div><label style={{...lblS,marginBottom:3}}>رسوم المكتب</label>{numIn('officeFee',ac.officeFee,'0')}</div>
</div>

{/* Extras */}
<div style={{marginTop:10}}>
<div style={{display:'flex',gap:8,alignItems:'center'}}>
<input value={iqamaExtraName} onChange={e=>setIqamaExtraName(e.target.value)} placeholder="بند إضافي" style={{...fS,flex:2}}/>
<input type="text" inputMode="decimal" value={fmtAmt(iqamaExtraAmount)} onChange={e=>{const raw=e.target.value.replace(/[^0-9.]/g,'');setIqamaExtraAmount(raw)}} placeholder="المبلغ" style={{...fS,flex:1,direction:'ltr',textAlign:'center'}}/>
<button type="button" onClick={()=>{if(!iqamaExtraName||!iqamaExtraAmount)return;setIqamaPricing(p=>({...p,extras:[...(p.extras||[]),{name:iqamaExtraName,amount:iqamaExtraAmount}]}));setIqamaExtraName('');setIqamaExtraAmount('')}} style={{height:42,padding:'0 12px',borderRadius:9,border:'1px solid rgba(212,160,23,.25)',background:'rgba(212,160,23,.1)',color:C.gold,fontFamily:F,fontSize:14,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>+</button>
</div>
{(k.extras||[]).length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:6}}>
{k.extras.map((e,i)=><span key={i} style={{display:'inline-flex',alignItems:'center',gap:4,padding:'2px 8px',borderRadius:5,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.06)',fontSize:10,fontWeight:600,color:'var(--tx2)'}}>
{e.name} <span style={{color:C.gold,fontWeight:600}}>{Number(e.amount).toLocaleString('en-US')} ريال</span>
<span onClick={()=>setIqamaPricing(p=>({...p,extras:p.extras.filter((_,idx)=>idx!==i)}))} style={{color:C.red,cursor:'pointer',fontWeight:600}}>×</span>
</span>)}
</div>}
</div>

{/* Subtotal + Deductions + Total */}
{(()=>{const sub=Number(pricing.subtotal||0);const absh=Number(k.absherBalance_on?k.absherBalance:0)||0;const disc=Number(k.discount_on?k.discount:0)||0;return(
<div style={{marginTop:12,paddingTop:12,borderTop:'1px solid rgba(255,255,255,.05)',display:'flex',flexDirection:'column',gap:8}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<span style={{fontSize:11,fontWeight:600,color:'var(--tx2)'}}>إجمالي الرسوم</span>
<span style={{fontSize:13,fontWeight:600,color:'var(--tx)'}}>{Number(sub).toLocaleString('en-US',{minimumFractionDigits:2})} ريال</span>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
{togChip('خصم','discount',C.gold)}
{togChip('رصيد أبشر','absherBalance','#2ea043')}
</div>
{disc>0&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'3px 0'}}>
<span style={{fontSize:11,fontWeight:600,color:C.gold}}>خصم</span>
<span style={{fontSize:12,fontWeight:600,color:C.red,direction:'ltr'}}>− {Number(disc).toLocaleString('en-US',{minimumFractionDigits:2})} ريال</span>
</div>}
{absh>0&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'3px 0'}}>
<span style={{fontSize:11,fontWeight:600,color:'#2ea043'}}>رصيد أبشر</span>
<span style={{fontSize:12,fontWeight:600,color:C.red,direction:'ltr'}}>− {Number(absh).toLocaleString('en-US',{minimumFractionDigits:2})} ريال</span>
</div>}
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:5,borderTop:'1px dashed rgba(212,160,23,.2)'}}>
<span style={{fontSize:14,fontWeight:600,color:C.gold}}>الإجمالي</span>
<span style={{fontSize:17,fontWeight:600,color:C.gold}}>{Number(pricing.total).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} ريال</span>
</div>
</div>
)})()}
</div>
})()}

{/* ── Other services (ajeer, exit-reentry, final-exit, etc): gold editable pricing ── */}
{SVC_WITH_PRICING.has(selSvc)&&!kafalaPayStep&&otherServiceLines&&(()=>{
const o=otherServiceLines
const ac=otherServiceAutoCalc||{lines:[]}
const setOV=(idx,v)=>setOtherServicePricing(p=>({...p,overrides:{...p.overrides,[idx]:v}}))
const togChip=(label,stateKey,clr)=>{
const on=!!otherServicePricing[stateKey+'_on']
const c=clr||C.gold
const setTK=(key,v)=>setOtherServicePricing(p=>({...p,[key]:v}))
return<div style={{display:'flex',flexDirection:'column',gap:5,flex:1,minWidth:0}}>
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:6}}>
<label style={{fontSize:14,fontWeight:600,color:on?c:'var(--tx4)',fontFamily:F,transition:'.2s'}}>{label}</label>
<button type="button" onClick={()=>setTK(stateKey+'_on',!on)} style={{width:40,height:22,borderRadius:11,border:'none',background:on?c:'rgba(255,255,255,.12)',cursor:'pointer',position:'relative',transition:'.2s',padding:0,flexShrink:0}}>
<span style={{position:'absolute',width:18,height:18,borderRadius:'50%',background:'#fff',top:2,right:on?2:20,transition:'.2s'}}/>
</button>
</div>
<div style={{display:'flex',alignItems:'center',background:on?'rgba(0,0,0,.18)':'rgba(255,255,255,.02)',border:'1px solid transparent',borderRadius:9,boxShadow:on?'inset 0 1px 2px rgba(0,0,0,.2)':'none',height:42,opacity:on?1:.5,transition:'.2s'}}>
<input type="text" inputMode="decimal" disabled={!on} value={fmtAmt(otherServicePricing[stateKey]||'')} onChange={e=>{const raw=e.target.value.replace(/[^0-9.]/g,'');setTK(stateKey,raw)}} placeholder="0" style={{flex:1,minWidth:0,height:'100%',padding:'0 10px',border:'none',background:'transparent',fontFamily:F,fontSize:14,fontWeight:600,color:on?'var(--tx)':'var(--tx5)',outline:'none',direction:'ltr',textAlign:'center'}}/>
<span style={{fontSize:12,color:on?c:'var(--tx5)',fontWeight:600,padding:'0 8px 0 4px',fontFamily:F,flexShrink:0}}>ريال</span>
</div>
</div>}
return<div style={{marginTop:10,borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',padding:'18px 14px 14px',position:'relative'}}>
<div style={{position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:5}}>
<span>التسعيرة</span>
</div>
{/* بنود نمط الإيصال — الاسم يمينًا، نقاط رابطة، ثم المبلغ (حقل قابل للتعديل لبنود الخدمة، والإضافات المضافة أسفلها كصفوف) */}
<div style={{display:'flex',flexDirection:'column',gap:2}}>
{o.lines.map((line,i)=>{
const auto=Number(ac.lines[i]?.amount)||0
const curVal=otherServicePricing.overrides?.[i]??''
return<div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'3px 2px'}}>
<span style={{fontSize:13,fontWeight:600,color:'var(--tx)',whiteSpace:'nowrap'}}>{line.label}{line.detail&&<span style={{color:'var(--tx5)',fontSize:10,marginRight:4,fontWeight:600}}>({line.detail})</span>}</span>
<span style={{flex:1,borderBottom:'1.5px dotted rgba(255,255,255,.16)',transform:'translateY(4px)'}}/>
<input type="text" inputMode="decimal" value={fmtAmt(curVal)}
onChange={e=>{const raw=e.target.value.replace(/[^0-9.]/g,'');setOV(i,raw)}}
onBlur={e=>{const raw=e.target.value.replace(/[^0-9.]/g,'');if(raw!==''&&Number(raw)<auto)setOV(i,String(auto))}}
placeholder={auto>0?fmtAmt(auto):'0'} style={{...fS,width:120,flex:'none',direction:'ltr',textAlign:'center'}}/>
<span style={{width:16,flexShrink:0}}/>
</div>
})}
{(otherServicePricing.extras||[]).map((e,i)=><div key={'x'+i} style={{display:'flex',alignItems:'center',gap:10,padding:'3px 2px'}}>
<span style={{fontSize:13,fontWeight:600,color:'var(--tx2)',whiteSpace:'nowrap'}}>{e.name}</span>
<span style={{flex:1,borderBottom:'1.5px dotted rgba(255,255,255,.16)',transform:'translateY(4px)'}}/>
<span style={{fontSize:13,fontWeight:700,color:'var(--tx)',direction:'ltr',whiteSpace:'nowrap',width:120,textAlign:'center'}}>{Number(e.amount).toLocaleString('en-US')}</span>
<span onClick={()=>setOtherServicePricing(p=>({...p,extras:p.extras.filter((_,idx)=>idx!==i)}))} title="حذف" style={{width:16,flexShrink:0,textAlign:'center',color:C.red,cursor:'pointer',fontWeight:700,fontSize:16,lineHeight:1}}>×</span>
</div>)}
</div>
{/* Extras */}
<div style={{marginTop:14,paddingTop:14,borderTop:'1px solid rgba(255,255,255,.05)'}}>
<div style={{display:'flex',gap:6,alignItems:'center'}}>
<input value={otherExtraName} onChange={e=>setOtherExtraName(e.target.value)} placeholder="بند إضافي" style={{...fS,flex:2}}/>
<input type="text" inputMode="decimal" value={fmtAmt(otherExtraAmount)} onChange={e=>{const raw=e.target.value.replace(/[^0-9.]/g,'');setOtherExtraAmount(raw)}} placeholder="المبلغ" style={{...fS,flex:1,direction:'ltr',textAlign:'center'}}/>
<button type="button" onClick={()=>{if(!otherExtraName||!otherExtraAmount)return;setOtherServicePricing(p=>({...p,extras:[...(p.extras||[]),{name:otherExtraName,amount:otherExtraAmount}]}));setOtherExtraName('');setOtherExtraAmount('')}} onMouseEnter={e=>{e.currentTarget.style.background='rgba(212,160,23,.12)'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent'}} style={{height:42,padding:'0 16px',borderRadius:11,border:'1px dashed rgba(212,160,23,.5)',background:'transparent',color:C.gold,fontFamily:F,fontSize:18,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',display:'inline-flex',alignItems:'center',justifyContent:'center',transition:'background .15s ease'}}>+</button>
</div>
{/* الإضافات المضافة تظهر كصفوف إيصال ضمن البنود أعلاه */}
</div>
{/* الإجمالي نمط الإيصال — خط علوي ذهبي عريض ورقم بارز */}
<div style={{marginTop:14,display:'flex',flexDirection:'column',gap:8}}>
{selSvc!=='custom'&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<span style={{fontSize:12,fontWeight:600,color:'var(--tx2)'}}>إجمالي الرسوم</span>
<span style={{fontSize:14,fontWeight:600,color:'var(--tx)'}}>{Number(pricing.subtotal||0).toLocaleString('en-US',{minimumFractionDigits:2})} ريال</span>
</div>}
{/* رصيد أبشر only for profession_change + exit_reentry_visa (discount only for kafala_transfer/iqama_renewal, not shown here) */}
{(selSvc==='profession_change'||selSvc==='exit_reentry_visa')&&<div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
{togChip('رصيد أبشر','absherBalance','#2ea043')}
</div>}
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:12,borderTop:'2px solid rgba(212,160,23,.4)'}}>
<span style={{fontSize:15,fontWeight:700,color:C.gold}}>الإجمالي</span>
<span style={{fontSize:20,fontWeight:800,color:C.gold,display:'inline-flex',alignItems:'baseline',gap:4,direction:'ltr'}}><span style={{fontSize:12}}>ريال</span><bdi>{Number(pricing.total).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</bdi></span>
</div>
</div>
</div>
})()}

{selSvc!=='kafala_transfer'&&selSvc!=='iqama_renewal'&&!SVC_WITH_PRICING.has(selSvc)&&(()=>{
const isVisa=VISA_SERVICES.has(selSvc)
const numVisasT=isVisa?(visaGroups.reduce((s,g)=>s+(parseInt(g.count)||0),0)||1):1
const cfgT=isVisa?getVisaMinConfig(selSvc):null
const minTotalAbs=cfgT?(Number(cfgT.defaultTotal)||0)*numVisasT:0
const currTotal=totalOverride!=null?Number(totalOverride):Number(pricing.total||0)
const totalBad=isVisa&&minTotalAbs>0&&totalOverride!=null&&Number(totalOverride)<minTotalAbs
return isVisa?
<div style={{marginTop:10}}>
<FKCurrency label="الإجمالي" full padX={26}
value={totalOverride==null?'':String(totalOverride)}
placeholder={pricing.total.toFixed(2)}
onChange={v=>{if(v===''){setTotalOverride(null);return}const n=Number(v);if(!isNaN(n))setTotalOverride(n)}}/>
</div>
:<div style={{border:'1.5px solid rgba(212,160,23,.35)',borderRadius:12,padding:'18px 14px 14px',position:'relative',marginTop:10}}>
<div style={{position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F}}>الإجمالي</div>
<div style={{display:'flex',justifyContent:'flex-end',alignItems:'center',gap:10}}>
<span style={{fontSize:18,fontWeight:600,color:C.gold}}>{pricing.total.toFixed(2)} ريال</span>
</div>
</div>
})()}

{/* Installment plan for permanent visa only — temporary visa is a single payment */}
{VISA_SERVICES.has(selSvc)&&selSvc!=='work_visa_temporary'&&(()=>{
const numVisas=visaGroups.reduce((s,g)=>s+(parseInt(g.count)||0),0)||1
const total=totalOverride!==null?totalOverride:(pricing.total||0)
const cfg=getVisaMinConfig(selSvc)
const minIssuance=numVisas*cfg.issuance
const minAuth=numVisas*cfg.authorization
const hasAuth=selSvc!=='work_visa_temporary'
const defaultEach=total/(hasAuth?3:2)
const issuanceVal=visaInstallments.issuance===''?defaultEach:(Number(visaInstallments.issuance)||0)
const authVal=hasAuth?(visaInstallments.authorization===''?defaultEach:(Number(visaInstallments.authorization)||0)):0
const residenceSubtotal=Math.max(0,total-issuanceVal-authVal)
const residencePerVisa=visaInstallments.residencePerVisa===''?(residenceSubtotal/numVisas):(Number(visaInstallments.residencePerVisa)||0)
const residenceTotalCalc=residencePerVisa*numVisas
const sumCheck=issuanceVal+authVal+residenceTotalCalc
const matchesTotal=Math.abs(sumCheck-total)<0.01
// Silent per-installment validation — only flags when user has typed something
const issuanceBad=visaInstallments.issuance!==''&&issuanceVal<minIssuance
const authBad=hasAuth&&visaInstallments.authorization!==''&&authVal<minAuth
// صندوق عملة بنمط معرض الفورمات (الوحدة + الرقم متوسّط داخل إطار)
const moneyBox=(val,onCh,ph,bad)=><div style={{display:'flex',direction:'ltr',alignItems:'center',justifyContent:'center',gap:6,border:`1px solid ${bad?C.red:'transparent'}`,borderRadius:9,background:'rgba(0,0,0,.18)',boxShadow:bad?`0 0 0 1px ${C.red}, inset 0 1px 2px rgba(0,0,0,.2)`:'inset 0 1px 2px rgba(0,0,0,.2)',height:40,width:140,padding:'0 10px',flexShrink:0}}>
<span style={{fontSize:12,fontWeight:600,color:bad?C.red:C.bentoGold,flexShrink:0}}>ريال</span>
<input type="text" inputMode="decimal" value={fmtAmt(val)} placeholder={ph} onChange={e=>{const raw=unfmtAmt(e.target.value);if(raw===''||/^\d*\.?\d*$/.test(raw))onCh(raw)}} style={{flex:1,minWidth:0,height:'100%',padding:0,border:'none',background:'transparent',fontFamily:F,fontSize:14,fontWeight:600,color:bad?C.red:'var(--tx)',outline:'none',textAlign:'center'}}/>
</div>
const totalInst=hasAuth?3:2
const residenceIdx=hasAuth?3:2
return<div style={{marginTop:18,border:'1.5px solid rgba(212,160,23,.35)',borderRadius:12,padding:'18px 14px 14px',position:'relative'}}>
<div style={{position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F}}>الدفعات</div>
{/* Installment 1 — Issuance */}
<div style={{display:'flex',alignItems:'center',gap:8,padding:'5px 0',borderBottom:'1px solid rgba(255,255,255,.04)'}}>
<div style={{width:26,height:26,borderRadius:'50%',background:'linear-gradient(135deg, rgba(212,160,23,.3), rgba(212,160,23,.12))',border:'1px solid rgba(212,160,23,.4)',color:C.gold,fontSize:11.5,fontWeight:600,fontFamily:F,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 2px 6px rgba(212,160,23,.15), inset 0 1px 0 rgba(255,255,255,.08)'}}>1</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:12.5,fontWeight:600,color:'rgba(255,255,255,.95)',fontFamily:F}}>عند إصدار التأشيرة</div>
<div style={{fontSize:10.5,color:'rgba(255,255,255,.58)',fontFamily:F}}>دفعة واحدة لجميع التأشيرات</div>
</div>
{moneyBox(visaInstallments.issuance,(raw)=>setVisaInstallments(p=>({...p,issuance:raw})),fmtAmt(defaultEach.toFixed(2)),false)}
</div>
{/* Installment 2 — Authorization (permanent visa only) */}
{hasAuth&&<div style={{display:'flex',alignItems:'center',gap:8,padding:'5px 0',borderBottom:'1px solid rgba(255,255,255,.04)'}}>
<div style={{width:26,height:26,borderRadius:'50%',background:'linear-gradient(135deg, rgba(212,160,23,.3), rgba(212,160,23,.12))',border:'1px solid rgba(212,160,23,.4)',color:C.gold,fontSize:11.5,fontWeight:600,fontFamily:F,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 2px 6px rgba(212,160,23,.15), inset 0 1px 0 rgba(255,255,255,.08)'}}>2</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:12.5,fontWeight:600,color:'rgba(255,255,255,.95)',fontFamily:F}}>عند توكيل التأشيرة</div>
<div style={{fontSize:10.5,color:'rgba(255,255,255,.58)',fontFamily:F}}>دفعة واحدة لجميع التأشيرات</div>
</div>
{moneyBox(visaInstallments.authorization,(raw)=>setVisaInstallments(p=>({...p,authorization:raw})),fmtAmt(defaultEach.toFixed(2)),false)}
</div>}
{/* Final installment — Residence (per visa) */}
<div style={{display:'flex',alignItems:'center',gap:8,padding:'5px 0'}}>
<div style={{width:26,height:26,borderRadius:'50%',background:'linear-gradient(135deg, rgba(212,160,23,.3), rgba(212,160,23,.12))',border:'1px solid rgba(212,160,23,.4)',color:C.gold,fontSize:11.5,fontWeight:600,fontFamily:F,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 2px 6px rgba(212,160,23,.15), inset 0 1px 0 rgba(255,255,255,.08)'}}>{residenceIdx}</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:12.5,fontWeight:600,color:'rgba(255,255,255,.95)',fontFamily:F}}>عند إصدار الإقامة <span style={{fontSize:10.5,color:C.gold,fontWeight:600}}>(لكل تأشيرة)</span></div>
<div style={{fontSize:10.5,color:'rgba(255,255,255,.58)',fontFamily:F,direction:'rtl'}}><span style={{direction:'ltr',display:'inline-block'}}>{residencePerVisa.toFixed(2)}</span> × {numVisas} = <span style={{color:C.gold,fontWeight:600,direction:'ltr',display:'inline-block'}}>{residenceTotalCalc.toFixed(2)}</span> ريال</div>
</div>
{moneyBox(visaInstallments.residencePerVisa,(raw)=>setVisaInstallments(p=>({...p,residencePerVisa:raw})),fmtAmt((residenceSubtotal/numVisas).toFixed(2)),false)}
</div>
{/* Sum-check footer — two clear lines: sum, then difference (if any) */}
<div style={{marginTop:6,paddingTop:6,borderTop:'1px dashed rgba(255,255,255,.08)',display:'flex',flexDirection:'column',gap:3}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<span style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,.75)',fontFamily:F}}>مجموع الدفعات</span>
<span style={{fontSize:13,fontWeight:600,color:matchesTotal?'#2ea043':'rgba(255,255,255,.95)',fontFamily:F,display:'inline-flex',alignItems:'baseline',gap:5,direction:'rtl'}}>
{matchesTotal&&<bdi style={{color:'#2ea043'}}>✓</bdi>}
<bdi>{fmtAmt(sumCheck.toFixed(2))}</bdi>
<bdi style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,.58)'}}>ريال</bdi>
</span>
</div>
{!matchesTotal&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<span style={{fontSize:10,fontWeight:600,color:C.red,fontFamily:F}}>{sumCheck<total?'ناقص عن الإجمالي':'زائد عن الإجمالي'}</span>
<span style={{fontSize:11,fontWeight:600,color:C.red,fontFamily:F,display:'inline-flex',alignItems:'baseline',gap:4,direction:'rtl'}}>
<bdi>{sumCheck<total?'−':'+'}</bdi>
<bdi>{fmtAmt(Math.abs(total-sumCheck).toFixed(2))}</bdi>
<bdi style={{fontSize:9.5,fontWeight:600,color:'rgba(192,57,43,.7)'}}>ريال</bdi>
</span>
</div>}
</div>
</div>
})()}

</div>}

{/* ═══ Step 5: Notes ═══ */}
{step===5&&(()=>{
// Build a descriptive service summary
let svcDesc=selectedService?.name_ar||''
if(selSvc==='chamber_certification'){
if(fields.chamber_subtype==='printed')svcDesc+=' — تصديق على مطبوعات المنشأة'
else if(fields.chamber_subtype==='open_request')svcDesc+=' — التصديق على طلب مفتوح'
}
const anyNote=addClientNote||addAdminNote
const paid=Number(paidAmount)||0
const remaining=pricing.total-paid
const isVisa=VISA_SERVICES.has(selSvc)
const effectiveTotal=(isVisa&&totalOverride!==null)?totalOverride:pricing.total
const effectiveRemaining=effectiveTotal-paid
const numVisas=isVisa?visaGroups.reduce((s,g)=>s+(parseInt(g.count)||0),0):0
// Compute installments values for display
const hasAuth=isVisa&&selSvc!=='work_visa_temporary'
const defaultEach=effectiveTotal/(hasAuth?3:2)
const issuanceVal=isVisa?(visaInstallments.issuance===''?defaultEach:(Number(visaInstallments.issuance)||0)):0
const authVal=hasAuth?(visaInstallments.authorization===''?defaultEach:(Number(visaInstallments.authorization)||0)):0
const residenceSubtotalCalc=isVisa?Math.max(0,effectiveTotal-issuanceVal-authVal):0
const residencePerVisaVal=isVisa?(visaInstallments.residencePerVisa===''?(numVisas>0?residenceSubtotalCalc/numVisas:0):(Number(visaInstallments.residencePerVisa)||0)):0
const SectionTitle=({children})=><div style={{fontSize:11,fontWeight:600,color:C.gold,fontFamily:F,marginBottom:6,paddingBottom:4,borderBottom:'1px solid rgba(212,160,23,.15)'}}>{children}</div>
const Row=({label,value,highlight})=><div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',padding:'3px 0',gap:12}}>
<span style={{fontSize:11,color:'var(--tx5)',fontFamily:F}}>{label}</span>
<span style={{fontSize:12,color:highlight||'var(--tx2)',fontWeight:600,fontFamily:F,textAlign:'left'}}>{value}</span>
</div>
{/* الملخص الكامل: تدفّق بعمودين بلا أي تمرير — كل قسم كتلة غير قابلة للكسر */}
const SummaryCard=({compact})=>(<div className={compact?'':'sr-sum-col'} style={compact?{borderRadius:12,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.04)',padding:12}:{flex:1,minHeight:0,columns:2,columnGap:16,padding:'14px 14px 8px',border:'1.5px solid rgba(212,160,23,.35)',borderRadius:12,overflow:'hidden'}}>
{!compact&&<style>{`.sr-sum-col>div{break-inside:avoid;margin-bottom:12px}`}</style>}
{compact&&<div style={{fontSize:11,fontWeight:600,color:'var(--tx)',marginBottom:8}}>ملخص الطلب</div>}

{/* Client / worker info — أقسام ذهبية منفصلة (عميل · عامل · وسيط) */}
{(()=>{
const ltr=v=><span style={{direction:'ltr',display:'inline-block'}}>{v}</span>
// نفس الشخص عميل وعامل → قسم واحد بعنوان «العميل والعامل»
if(selClient&&selWorker&&workerIsClient)return<div>
<SectionTitle>العميل والعامل</SectionTitle>
<Row label="الاسم" value={selClient.name_ar}/>
{(selClient.id_number||selWorker.iqama_number)&&<Row label="رقم الهوية" value={ltr(selClient.id_number||selWorker.iqama_number)}/>}
{(selClient.phone||selWorker.phone)&&<Row label="الجوال" value={ltr(fmtPhone(selClient.phone||selWorker.phone))}/>}
</div>
// مختلفين → قسم مستقل للعميل وقسم مستقل للعامل
return<>
{selClient&&<div>
<SectionTitle>العميل</SectionTitle>
<Row label="الاسم" value={selClient.name_ar}/>
{selClient.id_number&&<Row label="رقم الهوية" value={ltr(selClient.id_number)}/>}
{selClient.phone&&<Row label="الجوال" value={ltr(fmtPhone(selClient.phone))}/>}
</div>}
{!selClient&&clientMode==='new'&&newClient.name_ar&&<div>
<SectionTitle>العميل</SectionTitle>
<Row label="الاسم" value={newClient.name_ar}/>
{newClient.id_number&&<Row label="رقم الهوية" value={ltr(newClient.id_number)}/>}
{newClient.phone&&<Row label="الجوال" value={ltr(fmtPhone(newClient.phone))}/>}
</div>}
{selWorker&&<div>
<SectionTitle>العامل</SectionTitle>
<Row label="الاسم" value={selWorker.name}/>
{selWorker.iqama_number&&<Row label="رقم الإقامة" value={ltr(selWorker.iqama_number)}/>}
{selWorker.phone&&<Row label="الجوال" value={ltr(fmtPhone(selWorker.phone))}/>}
</div>}
</>
})()}
{/* رقم جوال العامل — للخدمات التي تتطلب العامل بدون عميل، عندما لم يُختر عامل مسجّل (يُلتقط في خطوة التفاصيل) */}
{skipClientStep&&selSvc!=='supplier_payroll'&&fields.worker_phone&&!selWorker&&<div>
<SectionTitle>العامل</SectionTitle>
<Row label="رقم الجوال" value={<span style={{direction:'ltr',display:'inline-block'}}>{fmtPhone('966'+fields.worker_phone)}</span>}/>
</div>}
{/* الوسيط — قسم مستقل عند وجوده (نفس صفوف العميل: الاسم + الهوية + الجوال) */}
{(selBroker||(brokerMode==='new'&&(newBroker.name_ar||newBroker.name_en)))&&(()=>{
const ltr=v=><span style={{direction:'ltr',display:'inline-block'}}>{v}</span>
const bId=selBroker?selBroker.id_number:newBroker.id_number
const bPhone=selBroker?selBroker.phone:newBroker.phone
return<div>
<SectionTitle>الوسيط</SectionTitle>
<Row label="الاسم" value={selBroker?(selBroker.name_ar||selBroker.name_en):(newBroker.name_ar||newBroker.name_en)}/>
{bId&&<Row label="رقم الهوية" value={ltr(bId)}/>}
{bPhone&&<Row label="الجوال" value={ltr(fmtPhone(bPhone))}/>}
</div>})()}

{/* Kafala transfer details */}
{selSvc==='kafala_transfer'&&<div>
<SectionTitle>بيانات نقل الكفالة</SectionTitle>
{fields.nationality&&<Row label="الجنسية" value={fields.nationality}/>}
{fields.worker_status&&<Row label="حالة العامل" value={fields.worker_status==='valid'?'صالح':fields.worker_status==='huroob'?'هروب':fields.worker_status==='final_exit'?'خروج نهائي':fields.worker_status==='absent'?'منقطع عن العمل':fields.worker_status}/>}
{fields.current_profession&&<Row label="المهنة الحالية" value={fields.current_profession}/>}
{fields.iqama_expiry&&<Row label="تاريخ انتهاء الإقامة" value={<bdi style={{direction:'ltr'}}>{fields.iqama_expiry}{fields.iqama_expiry_hijri&&<span style={{color:'var(--tx4)'}}>{' ('+fields.iqama_expiry_hijri+' هـ)'}</span>}</bdi>}/>}
{fields.work_card_expiry&&<Row label="نهاية كرت العمل" value={<bdi style={{direction:'ltr'}}>{fields.work_card_expiry}{fields.work_card_expiry_hijri&&<span style={{color:'var(--tx4)'}}>{' ('+fields.work_card_expiry_hijri+' هـ)'}</span>}</bdi>}/>}
{fields.birth_date&&<Row label="تاريخ الميلاد" value={<span style={{direction:'ltr',display:'inline-block'}}>{fields.birth_date}</span>}/>}
{(()=>{const n=selKafalaQuote?._notes||{};const rm=Number(fields.renewal_months)||Number(n.duration_months)||0;const moU=x=>(x>=3&&x<=9)?'شهور':'شهر';return<Row label="مدة التجديد" value={rm>0?`${rm} ${moU(rm)}`:'—'}/>})()}
{(()=>{const n=selKafalaQuote?._notes||{};const days=Number(n.expected_iqama_days)||0;const m=Number(fields.expected_iqama_months)||(days?Math.floor(days/30):0);const d=days?days%30:0;const moU=x=>(x>=3&&x<=9)?'شهور':'شهر';const parts=[];if(m>0)parts.push(`${m} ${moU(m)}`);if(d>0)parts.push(`${d} يوم`);return<Row label="المدة المتوقعة في الإقامة" value={parts.length?parts.join(' و '):'—'}/>})()}
{fields.change_profession===true&&<Row label="تغيير المهنة" value={fields.new_occupation||'نعم'}/>}
{fields.renew_iqama===true&&<Row label="تجديد الإقامة" value="نعم"/>}
</div>}

{/* Visa service details */}
{isVisa&&visaGroups.length>0&&<div>
<SectionTitle>تفاصيل التأشيرات ({numVisas})</SectionTitle>
{visaGroups.map((g,i)=>{
const nat=g.nationality?(lkCountries.find(co=>co.id===g.nationality)?.nationality_ar||'—'):'—'
const prof=g.profession?(lkOccupations.find(o=>o.id===g.profession)?.value_ar||'—'):'—'
const emb=g.embassy?(lkEmbassies.find(em=>em.id===g.embassy)?.city_ar||'—'):'—'
const gen=g.gender==='female'?'أنثى':'ذكر'
return<div key={g.id} style={{padding:'6px 10px',marginBottom:4,borderRadius:7,background:'rgba(212,160,23,.04)',border:'1px solid rgba(212,160,23,.1)'}}>
<div style={{fontSize:10.5,fontWeight:600,color:C.gold,marginBottom:3}}>المجموعة {['الأولى','الثانية','الثالثة','الرابعة'][i]||(i+1)} · {g.count||0}×</div>
<div style={{fontSize:11,color:'var(--tx2)',fontWeight:600}}>{nat} · {prof} · {gen} · {emb}</div>
</div>
})}
{/* File distribution */}
{visaFiles.length>0&&<div style={{marginTop:6,padding:'6px 10px',borderRadius:7,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.05)'}}>
<div style={{fontSize:10.5,fontWeight:600,color:'var(--tx4)',marginBottom:4}}>توزيع الملفات ({visaFiles.length})</div>
<div style={{display:'flex',flexWrap:'wrap',gap:4}}>
{visaFiles.map((f,i)=>{
const fc=Object.values(f.assignments||{}).reduce((s,n)=>s+(parseInt(n)||0),0)
const parts=visaGroups.length>1?Object.entries(f.assignments||{}).filter(([,n])=>(parseInt(n)||0)>0).map(([gid,n])=>{const g=visaGroups.find(x=>x.id===(parseInt(gid)||gid));const nat=g?.nationality?(lkCountries.find(co=>co.id===g.nationality)?.nationality_ar||''):'';return`${n}× ${nat||'مجموعة'}`}).join(' · '):null
// ملف واحد بتأشيرة واحدة → «ملف واحد» بدل ترقيم زائد («الملف الأول: 1»)
const single=visaFiles.length===1&&fc===1
return<span key={f.id} style={{display:'inline-flex',alignItems:'center',gap:4,padding:'2px 8px',borderRadius:6,background:'rgba(212,160,23,.1)',border:'1px solid rgba(212,160,23,.22)',fontSize:10.5,fontWeight:600,color:C.gold,fontFamily:F}}>
<span>{single?'ملف واحد':`الملف ${['الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر'][i]||(i+1)}: ${fc}`}</span>
{parts&&<span style={{fontSize:9.5,fontWeight:600,color:'var(--tx3)'}}>({parts})</span>}
</span>
})}
</div>
</div>}
</div>}

{/* Iqama renewal details */}
{selSvc==='iqama_renewal'&&<div>
<SectionTitle>بيانات تجديد الإقامة</SectionTitle>
{selWorker?.iqama_expiry_date&&<Row label="تاريخ انتهاء الإقامة الحالي" value={<span style={{direction:'ltr',display:'inline-block'}}>{selWorker.iqama_expiry_date}</span>}/>}
{fields.renewal_months&&<Row label="عدد أشهر التجديد" value={`${fields.renewal_months} أشهر`}/>}
{fields.change_profession===true&&<Row label="تغيير المهنة" value={fields.new_occupation||'نعم'}/>}
</div>}

{/* Ajeer contract details */}
{selSvc==='ajeer_contract'&&<div>
<SectionTitle>بيانات عقد أجير</SectionTitle>
{fields.borrower_700&&<Row label="الرقم الموحد للمنشأة المستعارة" value={<span style={{direction:'ltr',display:'inline-block'}}>{fields.borrower_700}</span>}/>}
{fields.city&&<Row label="المدينة" value={cities.find(c=>c.id===fields.city)?.name_ar||fields.city}/>}
{fields.contract_months&&<Row label="مدة العقد" value={fmtMonths(fields.contract_months)}/>}
</div>}

{/* Exit/re-entry visa details */}
{selSvc==='exit_reentry_visa'&&<div>
<SectionTitle>بيانات تأشيرة الخروج والعودة</SectionTitle>
{fields.exit_type&&<Row label="نوع التأشيرة" value={fields.exit_type==='multiple'?'متعددة':'مفردة'}/>}
{fields.duration_months&&<Row label="المدة" value={fmtMonths(fields.duration_months)}/>}
</div>}

{/* Final exit visa details */}
{selSvc==='final_exit_visa'&&fields.reason&&<div>
<SectionTitle>بيانات الخروج النهائي</SectionTitle>
<Row label="السبب" value={fields.reason}/>
</div>}

{/* Profession change details */}
{selSvc==='profession_change'&&fields.new_occupation&&<div>
<SectionTitle>بيانات تغيير المهنة</SectionTitle>
<Row label="المهنة الجديدة" value={fields.new_occupation}/>
</div>}

{/* Iqama print details */}
{selSvc==='iqama_print'&&fields.print_reason&&<div>
<SectionTitle>بيانات طباعة الإقامة</SectionTitle>
<Row label="السبب" value={fields.print_reason}/>
</div>}

{/* Medical insurance details */}
{selSvc==='medical_insurance'&&(()=>{
const latestIns=[...(selWorker?.worker_insurance||[])].sort((a,b)=>new Date(b.end_date||0)-new Date(a.end_date||0))[0]
const insEnd=latestIns?.end_date||''
const insSt=dateStatus(insEnd)
const insLabel=latestIns?(insSt==='expired'?'منتهي':insSt==='soon'?'قارب الانتهاء':'ساري'):'لا يوجد'
const dob=selWorker?.birth_date||''
let age=null
if(dob){const bd=new Date(dob);if(!isNaN(bd))age=Math.floor((new Date()-bd)/31557600000)}
return<div>
<SectionTitle>بيانات التأمين الطبي</SectionTitle>
{selWorker?.facility?.name_ar&&<Row label="منشأة العامل" value={selWorker.facility.name_ar}/>}
{selWorker?.facility?.unified_national_number&&<Row label="الرقم الموحد" value={<span style={{direction:'ltr',display:'inline-block'}}>{selWorker.facility.unified_national_number}</span>}/>}
<Row label="وضع التأمين الحالي" value={insLabel}/>
{insEnd&&<Row label="تاريخ انتهاء التأمين" value={<span style={{direction:'ltr',display:'inline-block'}}>{insEnd}</span>}/>}
{dob&&<Row label="تاريخ الميلاد" value={<span style={{direction:'ltr',display:'inline-block'}}>{dob}</span>}/>}
{age!==null&&<Row label="عمر العامل" value={`${age} سنة`}/>}
</div>
})()}

{/* Documents details */}
{selSvc==='documents'&&(fields.doc_type||fields.doc_lang)&&(()=>{
return<div>
<SectionTitle>بيانات إصدار المستند</SectionTitle>
{fields.doc_type&&<Row label="نوع المستند" value={docTypeLabel(fields.doc_type)}/>}
{fields.doc_lang&&<Row label="لغة المستند" value={fields.doc_lang==='ar'?'عربي':'إنجليزي'}/>}
</div>
})()}

{/* Chamber certification details */}
{selSvc==='chamber_certification'&&fields.chamber_subtype&&<div>
<SectionTitle>بيانات الغرفة التجارية</SectionTitle>
<Row label="النوع" value={fields.chamber_subtype==='printed'?'تصديق مطبوعات':'طلب مفتوح'}/>
</div>}

{/* Passport update details */}
{selSvc==='passport_update'&&<div>
<SectionTitle>بيانات تعديل الجواز</SectionTitle>
<Row label="نوع التحديث" value={fields.update_mode==='renew'?'تجديد (جواز جديد)':'تمديد (تاريخ الانتهاء فقط)'}/>
{fields.update_mode==='renew'&&fields.new_passport_no&&<Row label="رقم الجواز الجديد" value={<span style={{direction:'ltr',display:'inline-block'}}>{fields.new_passport_no}</span>}/>}
{fields.update_mode==='renew'&&fields.new_passport_issue_city&&<Row label="مكان الإصدار" value={cities.find(c=>c.id===fields.new_passport_issue_city)?.name_ar||fields.new_passport_issue_city}/>}
{fields.update_mode==='renew'&&fields.new_passport_issue_date&&<Row label="تاريخ إصدار الجواز" value={<span style={{direction:'ltr',display:'inline-block'}}>{fields.new_passport_issue_date}</span>}/>}
{fields.new_passport_expiry&&<Row label={fields.update_mode==='renew'?'تاريخ انتهاء الجواز الجديد':'تاريخ الانتهاء الجديد'} value={<span style={{direction:'ltr',display:'inline-block'}}>{fields.new_passport_expiry}</span>}/>}
</div>}

{/* Name translation (salary edit) details */}
{selSvc==='name_translation'&&<div>
<SectionTitle>بيانات تعديل الراتب</SectionTitle>
{selWorker?.gosi_salary&&<Row label="الراتب الحالي" value={<span style={{direction:'ltr',display:'inline-block'}}>{Number(selWorker.gosi_salary).toLocaleString('en-US',{minimumFractionDigits:2})} ريال</span>}/>}
{fields.new_salary&&<Row label="الراتب الجديد" value={<span style={{direction:'ltr',display:'inline-block'}}>{Number(fields.new_salary).toLocaleString('en-US',{minimumFractionDigits:2})} ريال</span>}/>}
{fields.salary_months&&<Row label="مدة الاستمرار" value={`${fields.salary_months} أشهر`}/>}
</div>}

{/* Generic details — any service without a dedicated block above (e.g. supplier_payroll, external_transfer_approval) */}
{!['kafala_transfer','iqama_renewal','ajeer_contract','exit_reentry_visa','final_exit_visa','profession_change','iqama_print','medical_insurance','documents','chamber_certification','passport_update','name_translation'].includes(selSvc)&&!isVisa&&(()=>{
const inputs=(selectedService?.inputs?.length?selectedService.inputs:SERVICE_INPUTS[selSvc])||[]
const fmtV=(inp,v)=>{if(inp.type==='toggle')return(v===true||v==='true')?'نعم':'لا';if(Array.isArray(inp.options)){const o=inp.options.find(o=>String(o.value)===String(v));if(o)return o.label}return String(v)}
const rows=inputs.filter(inp=>{if(inp.show_if&&!fields[inp.show_if])return false;const v=fields[inp.key];return v!==undefined&&v!==''&&v!==null&&v!==false}).map(inp=>({label:inp.label_ar,value:fmtV(inp,fields[inp.key])}))
if(!rows.length)return null
return<div>
<SectionTitle>تفاصيل الخدمة{svcDesc?` - ${svcDesc}`:''}</SectionTitle>
{rows.map((r,i)=><Row key={i} label={r.label} value={<span style={{direction:/^[0-9+]/.test(String(r.value))?'ltr':'rtl',display:'inline-block'}}>{r.value}</span>}/>)}
</div>
})()}

{/* Pricing & installments */}
<div>
<SectionTitle>التسعير</SectionTitle>
{(selSvc==='kafala_transfer'||selSvc==='iqama_renewal'||SVC_WITH_PRICING.has(selSvc))&&(()=>{
const rules=pricing.rules||{}
const lines=(rules.rules||[]).filter(l=>l.amount>0)
const sub=rules.subtotal||0
const absh=rules.absherBalance||0
const disc=rules.discount||0
return<>
{lines.map((line,i)=>
<Row key={i} label={line.label} value={<span style={{direction:'rtl',display:'inline-flex',gap:4}}><bdi>{fmtAmt(Number(line.amount).toFixed(2))}</bdi><bdi style={{fontSize:10,color:'var(--tx5)'}}>ريال</bdi></span>}/>
)}
{(absh>0||disc>0)&&<Row label="إجمالي الرسوم" value={<span style={{direction:'rtl',display:'inline-flex',gap:4}}><bdi>{fmtAmt(sub.toFixed(2))}</bdi><bdi style={{fontSize:10,color:'var(--tx5)'}}>ريال</bdi></span>}/>}
{absh>0&&<Row label="رصيد أبشر" value={<span style={{direction:'rtl',display:'inline-flex',gap:4,color:C.red}}><bdi>-{fmtAmt(absh.toFixed(2))}</bdi><bdi style={{fontSize:10}}>ريال</bdi></span>}/>}
{disc>0&&<Row label="خصم" value={<span style={{direction:'rtl',display:'inline-flex',gap:4,color:C.red}}><bdi>-{fmtAmt(disc.toFixed(2))}</bdi><bdi style={{fontSize:10}}>ريال</bdi></span>}/>}
</>
})()}
<Row label="الإجمالي" value={<span style={{direction:'rtl',display:'inline-flex',gap:4}}><bdi>{fmtAmt(effectiveTotal.toFixed(2))}</bdi><bdi style={{fontSize:10,color:'var(--tx5)'}}>ريال</bdi></span>} highlight={C.gold}/>
{/* Installments breakdown for visa services */}
{isVisa&&<div style={{margin:'6px 0',padding:'6px 10px',borderRadius:7,background:'rgba(212,160,23,.03)',border:'1px solid rgba(212,160,23,.1)'}}>
<div style={{fontSize:10.5,fontWeight:600,color:'var(--tx4)',marginBottom:3}}>خطة الدفع</div>
<Row label="1. عند إصدار التأشيرة" value={<span style={{direction:'rtl',display:'inline-flex',gap:4}}><bdi>{fmtAmt(issuanceVal.toFixed(2))}</bdi><bdi style={{fontSize:10,color:'var(--tx5)'}}>ريال</bdi></span>}/>
{hasAuth&&<Row label="2. عند توكيل التأشيرة" value={<span style={{direction:'rtl',display:'inline-flex',gap:4}}><bdi>{fmtAmt(authVal.toFixed(2))}</bdi><bdi style={{fontSize:10,color:'var(--tx5)'}}>ريال</bdi></span>}/>}
<Row label={`${hasAuth?3:2}. عند إصدار الإقامة (${fmtAmt(residencePerVisaVal.toFixed(2))} × ${numVisas})`} value={<span style={{direction:'rtl',display:'inline-flex',gap:4}}><bdi>{fmtAmt((residencePerVisaVal*numVisas).toFixed(2))}</bdi><bdi style={{fontSize:10,color:'var(--tx5)'}}>ريال</bdi></span>}/>
</div>}
</div>

{/* Payment */}
<div>
<SectionTitle>الدفع</SectionTitle>
{paid>0&&<Row label="طريقة الدفع" value={paymentMethod==='bank'?'حوالة بنكية':'نقداً'}/>}
{paid>0&&paymentMethod==='bank'&&transferReference&&<Row label="الرقم المرجعي" value={<span style={{direction:'ltr',display:'inline-block'}}>{transferReference}</span>}/>}
{paid>0&&paymentMethod==='bank'&&transferReceipt&&<Row label="إيصال الحوالة" value={<span style={{color:'#2ea043',fontWeight:600}}>✓ {transferReceipt.name}</span>}/>}
<Row label="المدفوع" value={<span style={{direction:'rtl',display:'inline-flex',gap:4}}><bdi>{fmtAmt(paid.toFixed(2))}</bdi><bdi style={{fontSize:10,color:'var(--tx5)'}}>ريال</bdi></span>} highlight={paid>0?C.ok:'var(--tx4)'}/>
{effectiveRemaining>0&&<Row label="المتبقي" value={<span style={{direction:'rtl',display:'inline-flex',gap:4}}><bdi>{fmtAmt(effectiveRemaining.toFixed(2))}</bdi><bdi style={{fontSize:10,color:'var(--tx5)'}}>ريال</bdi></span>} highlight={C.red}/>}
</div>

{/* Client note */}
{clientNote&&clientNote.trim()&&<div>
<SectionTitle>ملاحظة الفاتورة</SectionTitle>
<div style={{fontSize:11.5,color:'var(--tx2)',fontWeight:500,lineHeight:1.6,padding:'4px 2px',whiteSpace:'pre-wrap'}}>{clientNote}</div>
</div>}
</div>)
return<div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column',gap:10}}>
{/* Entry screen — unified payment card, fills available space */}
{!showSummaryScreen&&!showBrokerNoteScreen&&<div style={{display:'flex',flexDirection:'column',gap:14,flex:1,minHeight:0,marginTop:6}}>
{/* المبلغ المدفوع — إطار ذهبي مع عنوان عائم (نفس نمط طريقة الدفع) */}
<div style={{position:'relative',borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',padding:'15px 14px 12px',marginTop:4,display:'flex',flexDirection:'column',gap:8,flexShrink:0}}>
<div style={{position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:6}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
<span>المبلغ المدفوع</span>
</div>
<FKCurrency full value={paidAmount} placeholder="0.00"
onChange={v=>{if(v===''){setPaidAmount('');return}let n=Number(v);if(isNaN(n))return;if(n<0)n=0;const cap=(VISA_SERVICES.has(selSvc)&&totalOverride!==null)?totalOverride:pricing.total;if(n>cap)n=cap;setPaidAmount(String(n))}}/>
{(()=>{const eff=(VISA_SERVICES.has(selSvc)&&totalOverride!==null)?totalOverride:pricing.total;const p=Number(paidAmount)||0;
if(p<eff&&eff>0)return<div style={{fontSize:11,fontWeight:600,color:C.red,fontFamily:F,direction:'rtl',textAlign:'left'}}>المتبقي <span style={{direction:'ltr',display:'inline-block'}}>{fmtAmt((eff-p).toFixed(2))}</span> ريال</div>
if(p>=eff&&eff>0)return<div style={{fontSize:11,fontWeight:600,color:C.ok,fontFamily:F,textAlign:'left'}}>✓ مدفوع بالكامل</div>
return null})()}
</div>
{/* طريقة الدفع — إطار ذهبي مع عنوان عائم */}
{(Number(paidAmount)||0)>0&&<div style={{position:'relative',borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',padding:'15px 14px 12px',marginTop:4,display:'flex',flexDirection:'column',gap:11,flexShrink:0}}>
<div style={{position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:6}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
<span>طريقة الدفع</span>
</div>
<FKSegmented value={paymentMethod} onChange={setPaymentMethod} options={[{v:'cash',l:'نقداً'},{v:'bank',l:'حوالة بنكية'}]}/>
{paymentMethod==='bank'&&<>
{/* الحساب المحوّل إليه: عنوان + دروب داون يعرض الحسابات بكامل بياناتها (نفس شكل البطاقة) */}
<div style={{display:'flex',flexDirection:'column',gap:8,flexShrink:0}}>
<span style={{fontSize:12.5,fontWeight:600,color:'rgba(255,255,255,.92)',fontFamily:F,textAlign:'start'}}>الحساب المحوّل إليه<span style={{color:C.red}}> *</span></span>
{(()=>{
// بطاقة الحساب — نفس الشكل للعنصر داخل القائمة وللمختار (أيقونة + اسم البنك + المؤسسة + الحساب + الآيبان)
const bankCard=(a,sel)=>{
const ic=size=><div style={{width:size,height:size,borderRadius:9,background:'rgba(0,0,0,.25)',border:sel?'1.5px solid rgba(212,160,23,.4)':'1px solid rgba(255,255,255,.08)',flexShrink:0,boxShadow:sel?'0 2px 8px rgba(212,160,23,.15)':'none',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width={Math.round(size*.52)} height={Math.round(size*.52)} viewBox="0 0 24 24" fill="none" stroke={sel?C.gold:'rgba(255,255,255,.5)'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M4 21V10M20 21V10M8 21v-5M16 21v-5M12 21v-5M3 10l9-6 9 6"/></svg></div>
const nm=<span style={{fontSize:13.5,fontWeight:600,color:sel?C.gold:'rgba(255,255,255,.95)',letterSpacing:'-.2px',whiteSpace:'nowrap'}}>{a.bank_name}</span>
const prim=a.is_primary?<span style={{fontSize:8.5,color:C.gold,fontWeight:600,padding:'1px 6px',borderRadius:5,background:'rgba(212,160,23,.12)',border:'1px solid rgba(212,160,23,.25)',whiteSpace:'nowrap'}}>رئيسي</span>:null
const acc=a.account_name?<span style={{fontSize:10,color:'var(--tx5)',fontWeight:600,opacity:.8,whiteSpace:'nowrap'}}>{a.account_name}</span>:null
const valText=<div style={{display:'flex',gap:'2px 14px',flexWrap:'wrap',alignItems:'center'}}>{a.account_number&&<span style={{display:'inline-flex',alignItems:'center',gap:5}}><span style={{fontSize:9,color:C.bentoGold,fontWeight:600,fontFamily:F}}>الحساب</span><span style={{fontSize:11,color:'var(--tx)',fontWeight:600,fontFamily:'monospace',direction:'ltr'}}>{a.account_number}</span></span>}{a.iban&&<span style={{display:'inline-flex',alignItems:'center',gap:5}}><span style={{fontSize:9,color:C.bentoGold,fontWeight:600,fontFamily:F}}>الآيبان</span><span style={{fontSize:11,color:'var(--tx)',fontWeight:600,fontFamily:'monospace',direction:'ltr'}}>{a.iban}</span></span>}</div>
return<div style={{display:'flex',alignItems:'center',gap:11,width:'100%'}}>{ic(40)}<div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:3}}><div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>{nm}{prim}{acc}</div>{valText}</div></div>
}
// مختار: نفس البطاقة بإطار ذهبي + زر تغيير. غير مختار: دروب داون يفتح القائمة كاملة بنفس شكل البطاقة
if(selBankAcc){const a=bankAccounts.find(x=>x.id===selBankAcc);if(!a)return null
return<div style={{position:'relative',padding:'9px 12px',paddingLeft:34,borderRadius:12,boxShadow:'0 4px 14px rgba(0,0,0,.25)',border:'1px solid rgba(212,160,23,.4)',background:'linear-gradient(135deg,rgba(212,160,23,.12),rgba(255,255,255,.02))'}}>
<button type="button" onClick={()=>setSelBankAcc('')} title="تغيير الحساب" style={{position:'absolute',top:7,left:7,width:24,height:24,borderRadius:7,background:'rgba(192,57,43,.12)',border:'1px solid rgba(192,57,43,.35)',color:C.red,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',zIndex:2,transition:'.15s'}} onMouseEnter={e=>{e.currentTarget.style.background='rgba(192,57,43,.22)'}} onMouseLeave={e=>{e.currentTarget.style.background='rgba(192,57,43,.12)'}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
{bankCard(a,true)}
</div>}
return<FKDropdown value={selBankAcc||null} onChange={k=>setSelBankAcc(k)} options={bankAccounts} searchable={false}
placeholder="اختر الحساب المحوّل إليه" getKey={a=>a.id} getLabel={a=>a.bank_name||''}
getSub={a=>`${a.account_name||''} ${a.account_number||''} ${a.iban||''}`}
renderCell={(a,sel)=>bankCard(a,sel)}/>
})()}
</div>
{/* إيصال الحوالة البنكية */}
<div style={{display:'flex',gap:10,alignItems:'stretch',flexShrink:0}}
onDragEnter={e=>{e.preventDefault();e.stopPropagation();setReceiptDrag(true)}}
onDragOver={e=>{e.preventDefault();e.stopPropagation();if(!receiptDrag)setReceiptDrag(true)}}
onDragLeave={e=>{e.preventDefault();e.stopPropagation();if(e.currentTarget.contains(e.relatedTarget))return;setReceiptDrag(false)}}
onDrop={e=>{e.preventDefault();e.stopPropagation();setReceiptDrag(false);const f=e.dataTransfer.files?.[0];if(f)setTransferReceipt(f)}}>
{!transferReceipt?<label htmlFor="transferReceiptInput" style={{flex:1,display:'inline-flex',alignItems:'center',justifyContent:'center',gap:7,padding:'0 14px',height:42,borderRadius:9,border:`1px dashed ${receiptDrag?C.gold:'rgba(212,160,23,.3)'}`,background:receiptDrag?'rgba(212,160,23,.15)':'rgba(212,160,23,.04)',color:C.gold,cursor:'pointer',transition:'.2s',fontFamily:F,fontSize:12.5,fontWeight:600,whiteSpace:'nowrap',transform:receiptDrag?'scale(1.02)':'scale(1)'}}
onMouseEnter={e=>{if(!receiptDrag)e.currentTarget.style.background='rgba(212,160,23,.1)'}}
onMouseLeave={e=>{if(!receiptDrag)e.currentTarget.style.background='rgba(212,160,23,.04)'}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
<span>{receiptDrag?'أفلت الملف هنا':<>إيصال الحوالة البنكية<span style={{color:C.red}}> *</span></>}</span>
<input id="transferReceiptInput" type="file" accept="image/*,application/pdf" onChange={e=>setTransferReceipt(e.target.files?.[0]||null)} style={{display:'none'}}/>
</label>
:<div title={transferReceipt.name} style={{flex:1,display:'inline-flex',alignItems:'center',justifyContent:'center',gap:7,padding:'0 12px',height:42,borderRadius:9,border:'1px solid rgba(46,160,67,.25)',background:'rgba(46,160,67,.06)',color:'#2ea043',fontFamily:F,fontSize:12.5,fontWeight:600,whiteSpace:'nowrap'}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
<span style={{maxWidth:100,overflow:'hidden',textOverflow:'ellipsis'}}>{transferReceipt.name}</span>
<button type="button" onClick={()=>setTransferReceipt(null)} style={{width:22,height:22,borderRadius:5,border:'none',background:'rgba(192,57,43,.15)',color:C.red,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}}>
<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
</button>
</div>}
</div>
</>}
</div>}
</div>}

{/* Note sub-step — shown for every service. The broker fieldset only appears for permanent visa + kafala transfer. */}
{showBrokerNoteScreen&&<div style={{display:'flex',flexDirection:'column',gap:10,marginTop:4,flex:1,minHeight:0}}>
{/* ── Broker fieldset (collapsed by default — opens via the icon) ── */}
{showBroker&&<div style={{border:'1.5px solid rgba(212,160,23,.35)',borderRadius:12,padding:brokerOpen?'12px 14px 14px':'12px 14px',marginTop:8,display:'flex',flexDirection:'column',gap:0,transition:'padding .34s cubic-bezier(.4,0,.2,1)'}}>
{/* Header row — in-flow (no negative top offset) so the toggle is never clipped by the modal's top edge */}
<div style={{display:'flex',alignItems:'center',gap:7,fontFamily:F}}>
<span style={{fontSize:12,fontWeight:600,color:C.bentoGold}}>الوسيط</span>
<span style={{fontSize:10,fontWeight:600,color:'rgba(255,255,255,.4)'}}>(اختياري)</span>
<button onClick={()=>{setBrokerOpen(o=>{const next=!o;if(!next){setSelBroker(null);setBrokerMode('existing');setBrokerQ('');setNewBroker({name_ar:'',name_en:'',phone:'',id_number:'',nationality_id:''})}return next})}} title={brokerOpen?'إغلاق':'إضافة وسيط'} style={{width:22,height:22,borderRadius:6,border:'1px solid rgba(212,160,23,.45)',background:'rgba(212,160,23,.12)',color:C.bentoGold,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',padding:0,transition:'.15s'}}>
{brokerOpen?<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>:<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
</button>
</div>
{!brokerOpen&&<div style={{fontSize:11,color:'var(--tx5)',fontFamily:F,textAlign:'center',padding:'6px 0 0',transition:'opacity .25s'}}>اضغط على + لإضافة وسيط</div>}
<div style={{display:'grid',gridTemplateRows:brokerOpen?'1fr':'0fr',transition:'grid-template-rows .34s cubic-bezier(.4,0,.2,1)'}}>
<div style={{overflow:'hidden',minHeight:0,display:'flex',flexDirection:'column',gap:14,paddingTop:brokerOpen?14:0,transition:'padding-top .34s cubic-bezier(.4,0,.2,1)'}}>
{/* Search + new broker button — mirrors client UI */}
{!selBroker&&brokerMode!=='new'&&<div style={{display:'flex',alignItems:'stretch',gap:8,flexShrink:0}}>
<div style={{position:'relative',flex:1,minWidth:0}}>
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{position:'absolute',top:'50%',left:14,transform:'translateY(-50%)',pointerEvents:'none',transition:'stroke .2s'}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
<input value={brokerQ} onChange={e=>setBrokerQ(e.target.value)} placeholder="ابحث باسم الوسيط أو الجوال..." onFocus={e=>{e.currentTarget.style.borderColor=C.bentoGold;e.currentTarget.style.boxShadow=`0 0 0 1px ${C.bentoGold}33, inset 0 1px 2px rgba(0,0,0,.2)`;e.currentTarget.previousElementSibling.style.stroke=C.bentoGold}} onBlur={e=>{e.currentTarget.style.borderColor='transparent';e.currentTarget.style.boxShadow='inset 0 1px 2px rgba(0,0,0,.2)';e.currentTarget.previousElementSibling.style.stroke='rgba(255,255,255,.35)'}} style={{...fkSF,padding:'0 14px 0 40px',textAlign:'right',border:'1px solid transparent'}}/>
</div>
{brokerMode!=='new'&&<button onClick={()=>{setBrokerMode('new');setNewBroker(p=>({...p,name_ar:/[\u0600-\u06FF]/.test(brokerQ)?brokerQ:p.name_ar,phone:/^[0-9+]+$/.test(brokerQ)?brokerQ:p.phone,id_number:/^\d{10}$/.test(brokerQ)?brokerQ:p.id_number}))}} style={{height:42,padding:'0 14px',background:'transparent',border:'1.3px dashed rgba(212,160,23,.55)',borderRadius:9,color:C.bentoGold,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6,flexShrink:0,transition:'.15s',whiteSpace:'nowrap'}} onMouseEnter={e=>{e.currentTarget.style.background='rgba(212,160,23,.07)';e.currentTarget.style.borderColor='rgba(212,160,23,.85)'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='rgba(212,160,23,.55)'}}>
<span>وسيط جديد</span>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
</button>}
</div>}

{/* Existing broker list */}
{brokerMode!=='new'&&<div style={{display:'flex',flexDirection:'column',gap:8}}>
{(()=>{const filtered=selBroker?[selBroker]:(brokerQ?brokers.filter(b=>(b.name_ar||'').includes(brokerQ)||(b.phone||'').includes(brokerQ)||(b.id_number||'').includes(brokerQ)).slice(0,2):brokers.slice(0,2));
if(filtered.length===0)return<div style={{padding:'10px 16px',borderRadius:9,background:'transparent',border:'1px dashed rgba(255,255,255,.1)',display:'flex',alignItems:'center',justifyContent:'center',gap:9}}>
<div style={{width:28,height:28,borderRadius:'50%',background:'rgba(212,160,23,.08)',border:'1px dashed rgba(212,160,23,.3)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(212,160,23,.65)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
</div>
<div style={{fontSize:12,color:'var(--tx2)',fontWeight:600,fontFamily:F}}>لا يوجد وسيط بهذا البحث — أضِف وسيطاً جديداً</div>
</div>;
return filtered.map(b=>{const sel=selBroker?.id===b.id
const country=b.nationality_id?lkCountries.find(co=>co.id===b.nationality_id):null
const flagUrl=natFlagUrl(country)
const natLabel=country?.nationality_ar||'—'
const G={base:'linear-gradient(135deg,rgba(255,255,255,.05),rgba(255,255,255,.012))',baseB:'rgba(255,255,255,.08)',hover:'linear-gradient(135deg,rgba(212,160,23,.08),rgba(255,255,255,.02))',hoverB:'rgba(212,160,23,.25)',sel:'linear-gradient(135deg,rgba(212,160,23,.12),rgba(255,255,255,.02))',selB:'rgba(212,160,23,.4)'}
const onEnter=e=>{if(!sel){e.currentTarget.style.background=G.hover;e.currentTarget.style.borderColor=G.hoverB}}
const onLeave=e=>{if(!sel){e.currentTarget.style.background=G.base;e.currentTarget.style.borderColor=G.baseB}}
const deselect=e=>{if(e)e.stopPropagation();setSelBroker(null)}
const infoBox=(Icon,label,val)=><div style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:9,background:'rgba(0,0,0,.18)',border:'1px solid rgba(255,255,255,.05)',minWidth:0}}><Icon size={13} color={C.bentoGold} strokeWidth={1.8}/><div style={{display:'flex',flexDirection:'column',gap:2,minWidth:0}}><span style={{fontSize:9,color:'var(--tx5)',fontWeight:600}}>{label}</span><span style={{fontSize:12,color:'var(--tx)',fontWeight:600,direction:'ltr',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{val}</span></div></div>
const flagEl=size=><div title={natLabel} style={{width:size,height:size,borderRadius:12,background:'rgba(0,0,0,.25)',border:sel?'1.5px solid rgba(212,160,23,.4)':'1px solid rgba(255,255,255,.08)',flexShrink:0,transition:'.25s',boxShadow:sel?'0 2px 8px rgba(212,160,23,.15)':'none',position:'relative',overflow:'hidden'}}>{flagUrl?<img src={flagUrl} alt={natLabel} loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>:<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}><Globe size={Math.round(size*.42)} strokeWidth={1.6} color="rgba(255,255,255,.35)"/></div>}</div>
const nameBlock=<div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:3}}><span style={{fontSize:15.5,fontWeight:600,color:sel?C.gold:'rgba(255,255,255,.95)',letterSpacing:'-.2px'}}>{b.name_ar||b.name_en||'—'}</span>{b.name_ar&&b.name_en&&<span style={{fontSize:11,color:'var(--tx5)',fontWeight:600,direction:'ltr',opacity:.7}}>{b.name_en}</span>}</div>
const boxes=<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>{b.id_number&&infoBox(CreditCard,'رقم الهوية',b.id_number)}{b.phone&&infoBox(Phone,'الجوال',fmtPhone(b.phone))}</div>
const wrapSel={position:'relative',border:`1px solid ${G.selB}`,background:G.sel,boxShadow:'0 4px 16px rgba(0,0,0,.28)',transition:'all .22s ease',padding:'14px',borderRadius:16,display:'flex',flexDirection:'column',gap:12}
const xIcon=<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
if(sel)return<div key={b.id} style={wrapSel}>
<button onClick={deselect} title="تغيير الوسيط" style={{position:'absolute',top:8,left:8,width:28,height:28,borderRadius:8,background:'rgba(192,57,43,.12)',border:'1px solid rgba(192,57,43,.35)',color:C.red,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',zIndex:2,transition:'.15s'}} onMouseEnter={e=>{e.currentTarget.style.background='rgba(192,57,43,.22)'}} onMouseLeave={e=>{e.currentTarget.style.background='rgba(192,57,43,.12)'}}>{xIcon}</button>
<div style={{display:'flex',alignItems:'center',gap:14}}>{flagEl(48)}<div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:4}}><div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}><span style={{fontSize:15.5,fontWeight:600,color:C.gold,letterSpacing:'-.2px'}}>{b.name_ar||b.name_en||'—'}</span><span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:9.5,fontWeight:600,color:C.bentoGold,background:'rgba(212,160,23,.12)',border:'1px solid rgba(212,160,23,.3)',borderRadius:20,padding:'2px 8px'}}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>محدد</span></div>{b.name_ar&&b.name_en&&<span style={{fontSize:11,color:'var(--tx5)',fontWeight:600,direction:'ltr',opacity:.7}}>{b.name_en}</span>}</div></div>
{boxes}
</div>
return<div key={b.id} onClick={()=>setSelBroker(b)} onMouseEnter={onEnter} onMouseLeave={onLeave}
style={{cursor:'pointer',position:'relative',border:`1px solid ${G.baseB}`,background:G.base,boxShadow:'0 4px 16px rgba(0,0,0,.28)',transition:'all .22s ease',padding:'14px',borderRadius:16,display:'flex',flexDirection:'column',gap:12}}>
<div style={{display:'flex',alignItems:'center',gap:14}}>{flagEl(48)}{nameBlock}</div>
{boxes}
</div>})})()}
</div>}

{/* New broker form — mirrors new client form exactly */}
{brokerMode==='new'&&(()=>{
const onCancel=()=>{setBrokerMode('existing');setBrokerQ('');setNewBroker({name_ar:'',name_en:'',phone:'',id_number:'',nationality_id:''});setNatOpenBroker(false);setNatSearchBroker('')}
const fields=(<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
{(()=>{
const cur=newBroker.name_ar||newBroker.name_en||''
const isAr=/[؀-ۿ]/.test(cur)
const handle=(raw)=>{let v=raw.replace(/[^؀-ۿ A-Za-z\s]/g,'').replace(/\s+/g,' ').replace(/^\s+/,'');const parts=v.split(' ');if(parts.length>2)v=parts.slice(0,2).join(' ');const isArNow=/[؀-ۿ]/.test(v);setNewBroker(p=>({...p,name_ar:isArNow?v:'',name_en:!isArNow&&v?v:''}))}
return <FKField label="الاسم" req>
<input value={cur} onChange={e=>handle(e.target.value)} placeholder="اسمين فقط — عربي أو إنجليزي / Two names — Arabic or English" style={{...fkSF,direction:isAr?'rtl':(cur?'ltr':'rtl')}}/>
</FKField>
})()}
<FKSelect label="الجنسية" req placeholder="اختر الجنسية..."
value={newBroker.nationality_id||null}
onChange={(id)=>setNewBroker(p=>({...p,nationality_id:id||null}))}
options={lkCountries} getKey={o=>o.id} getLabel={o=>o.nationality_ar} getSub={o=>o.nationality_en||''}
renderSelected={o=>{const u=natFlagUrl(o);return <span style={{display:'inline-flex',alignItems:'center',gap:8}}>{o.nationality_ar}{u&&<img src={u} alt="" width={16} height={12} style={{borderRadius:2,objectFit:'cover'}}/>}</span>}}
renderCell={(o,sel)=>{const u=natFlagUrl(o);return <span style={{fontSize:14,fontWeight:600,color:sel?C.bentoGold:'rgba(255,255,255,.92)',display:'inline-flex',alignItems:'center',gap:8}}>{o.nationality_ar}{u&&<img src={u} alt="" width={16} height={12} style={{borderRadius:2,objectFit:'cover'}}/>}</span>}}
/>
{/* silent: لا يحمرّ الحقل ولا يظهر تنبيه تحته — التحقق يظهر في الشريط السفلي (نفس تسجيل عميل جديد) */}
<FKId silent label="الهوية" req value={newBroker.id_number} onChange={v=>setNewBroker(p=>({...p,id_number:v}))}/>
<FKPhone silent label="رقم الجوال" req value={newBroker.phone} onChange={v=>setNewBroker(p=>({...p,phone:v}))}/>
</div>)
const title=<span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:13,fontWeight:600,color:C.bentoGold,fontFamily:F}}><Plus size={14} strokeWidth={2.5}/>تسجيل وسيط جديد</span>
const cancel=<button onClick={onCancel} style={{height:34,padding:'0 14px',background:'transparent',border:'1.3px dashed rgba(192,57,43,.55)',borderRadius:9,color:C.red,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6,flexShrink:0,transition:'.15s',whiteSpace:'nowrap'}} onMouseEnter={e=>{e.currentTarget.style.background='rgba(192,57,43,.07)';e.currentTarget.style.borderColor='rgba(192,57,43,.85)'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='rgba(192,57,43,.55)'}}><span>إلغاء</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
return <div style={{marginTop:6,background:'rgba(255,255,255,.025)',border:'1px solid rgba(255,255,255,.06)',borderRadius:12,padding:14}}>
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>{title}{cancel}</div>
{fields}
</div>
})()}
</div>
</div>
</div>}
{/* ملاحظة — إطار ذهبي مع عنوان عائم (نفس نمط «المبلغ المدفوع») */}
<div style={{position:'relative',borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',padding:'15px 14px 12px',marginTop:4,display:'flex',flexDirection:'column',gap:8,flexShrink:0}}>
<div style={{position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:6}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
<span>ملاحظة</span>
<span style={{fontSize:11,fontWeight:500,color:'var(--tx4)',marginInlineStart:4}}>اختيارية</span>
</div>
<FKTextArea value={clientNote} onChange={setClientNote} placeholder="أدخل ملاحظة تظهر في الفاتورة..." rows={showBroker&&brokerOpen?2:4}/>
</div>
</div>}

{/* Summary screen — full summary, last step before submission */}
{showSummaryScreen&&<SummaryCard compact={false}/>}
{/* Old standalone receipt block — kept for structure, but now shows nothing since merged above */}
{false&&<div style={{display:'none'}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
<span style={{fontSize:12,fontWeight:600,color:'var(--tx)',fontFamily:F}}>إيصال الحوالة البنكية</span>
<span style={{fontSize:10,color:C.red,fontWeight:600}}>*</span>
</div>
{!transferReceipt?<label htmlFor="transferReceiptInput" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'14px',borderRadius:8,border:'1px dashed rgba(212,160,23,.25)',background:'rgba(212,160,23,.02)',color:C.gold,cursor:'pointer',transition:'.2s',fontFamily:F,fontSize:11.5,fontWeight:600}}
onMouseEnter={e=>{e.currentTarget.style.background='rgba(212,160,23,.06)'}}
onMouseLeave={e=>{e.currentTarget.style.background='rgba(212,160,23,.02)'}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
<span>اضغط لرفع صورة/ملف الإيصال</span>
<input id="transferReceiptInput" type="file" accept="image/*,application/pdf" onChange={e=>setTransferReceipt(e.target.files?.[0]||null)} style={{display:'none'}}/>
</label>
:<div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:8,background:'rgba(46,160,67,.06)',border:'1px solid rgba(46,160,67,.2)'}}>
<div style={{width:32,height:32,borderRadius:7,background:'rgba(46,160,67,.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2ea043" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:12,fontWeight:600,color:'var(--tx)',fontFamily:F,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{transferReceipt.name}</div>
<div style={{fontSize:10,color:'var(--tx5)',fontFamily:F}}>{(transferReceipt.size/1024).toFixed(1)} KB</div>
</div>
<button type="button" onClick={()=>setTransferReceipt(null)} title="حذف" style={{width:28,height:28,borderRadius:7,border:'1px solid rgba(192,57,43,.2)',background:'rgba(192,57,43,.08)',color:C.red,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6"/></svg>
</button>
</div>}
</div>}
</div>
})()}

</div>
)
// صفحة واحدة لكل خطوة معروضة — المحتوى نفسه (الحالة الداخلية تحدد ما يُرسم)
// زر «التالي» يُعطَّل حتى تكتمل حقول/اختيارات الخطوة الحالية (getStepError يُرجع '' عند الاكتمال).
const stepValid=!getStepError()
const pages=Array.from({length:totalSteps},(_,i)=>({
  title:i===displayStep-1?curTitle:'',
  valid:i===displayStep-1?stepValid:true,
  error:i===displayStep-1?(err||''):'',
  content:body,
}))
return <FKModal open onClose={onClose}
  title={svcMeta?svcMeta.name_ar:'فاتورة'} Icon={svcMeta?.Icon||FileText}
  variant="create" width={760}
  page={displayStep-1}
  onNext={goNext}
  onBack={()=>{if(step===1&&showOthers){setShowOthers(false);return}goBack()}}
  onSubmit={handleSubmit} submitting={saving} submitLabel="إصدار" submitIcon={FileText}
  pages={pages}/>
})()
}
