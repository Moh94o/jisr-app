import React,{useState,useEffect,useRef} from 'react'
import ReactDOM from 'react-dom'
import BackButton from './components/BackButton'
import {CalendarRange,CalendarClock,ArrowLeftRight,RefreshCw,Users,FileCheck,HeartPulse,UserCog,Wallet,Plane,PlaneTakeoff,IdCard,Printer,FileStack,BadgeCheck,Coins,Sparkles,Power,PowerOff,Gift,DollarSign,Edit3,ChevronDown,ChevronUp,X,Search,Building2,Calendar as CalendarIcon} from 'lucide-react'
import {getSupabase} from './lib/supabase.js'
import {hydrateSvcAdminFromDb,saveSvcAdminSetting} from './lib/serviceAdminSync.js'
import {EmptyState,Modal,SuccessView,ActionButton,ModalSection,CurrencyField,NumberField,Select,ScrollBox,GRID,DateField} from './components/ui/FormKit.jsx'
import {can,cardVisible,canCardBtn} from './lib/permissions.js'

// Shared Kafala pricing config — drives both the service-request kafala modal AND the Kafala Calculator modal
export const KAFALA_DEFAULTS={
  transferFee1:2000,transferFee2:4000,transferFee3:6000,
  // Occupations that get bumped up one transfer tier (0 → 1, 1 → 2, etc.) — domestic workers by default.
  transferBumpOccupations:['6d7ccefc-1647-4a36-9a80-ad1f9138db84','f3163bc5-a3e1-4e93-a620-7421db3abc68','8152564f-7a31-430c-9cb3-a76f5df77c04','0394376f-b7e0-455c-8466-0555d477cc42','ebd99f6b-ae4c-453c-9cf5-19099b7f35a3','a4cbe92d-69f8-4129-a876-0dc035fb9bf7','efd9f7af-7ac6-4f3e-9fda-efbc7d95ea61','5a20783b-8a28-4364-bbb8-85fbc71fc291','5ec4a1ba-64e9-4df7-badf-bf12eaf005ba','2feff711-f1d2-489c-870b-ab82b7de9cbd','0e6cd55b-1ced-4d88-ac37-ccfcafd244ec','01f7dcd3-1b72-4ade-bf21-95dc7f819463','09858dcd-0057-4857-a225-ce626313d457'],
  iqamaPerMonth:54.17,iqamaGovCover:650,iqamaFine1:500,iqamaFine2:1000,iqamaGraceDays:7,iqamaProcessingDays:7,iqamaExpiredThresholdDays:30,procDaysCase1:7,procDaysCase2:7,procDaysCase3:7,thresholdCase2:30,transferOnlyMinDays:30,
  workPermit3M:25,workPermit6M:50,workPermit9M:75,workPermit12M:100,
  workPermitNoExempt3M:2450,workPermitNoExempt6M:4850,workPermitNoExempt9M:7275,workPermitNoExempt12M:9700,
  workPermitDailyAfter:22,workPermitCutoffDate:'2027-02-20',
  workPermitProcDays:7,workPermitExpiredThreshold:30,workPermitExpiredProcDays:7,
  iqamaWpResetEnabled:false,iqamaWpResetAfterDays:365,iqamaWpIssuanceDays:5,iqamaWpBasis:'iqama',iqamaOfficeDiscountEnabled:true,
  kafalaWpBasis:'iqama',kafalaWpResetEnabled:false,kafalaWpResetAfterDays:365,kafalaWpIssuanceDays:5,kafalaOfficeFeeMode:'flat',kafalaOfficeDiscountEnabled:true,
  kafalaFloorMode:'daily',kafalaFloorFixed:0,
  profChange:1000,profChangeFreeOccupations:['2381e970-e939-4c6b-a7a9-8862f2133d41','1b4568be-0ea5-4079-bc90-ecca71d30adb'],officeFee:6500,officeDailyRate:18.06,iqamaOfficeFeeMode:'flat',
  medicalGraceMonths:2,medicalGraceDays:10,medGovCover:1000,
  medicalBrackets:[{min:20,max:30,rate:400},{min:30,max:40,rate:500},{min:40,max:50,rate:600},{min:50,max:60,rate:700},{min:60,max:70,rate:900}]
}
export function getKafalaPricingConfig(){
  try{const r=JSON.parse(localStorage.getItem('kafalaPricingConfig')||'{}');return{...KAFALA_DEFAULTS,...r,medicalBrackets:Array.isArray(r.medicalBrackets)&&r.medicalBrackets.length?r.medicalBrackets:KAFALA_DEFAULTS.medicalBrackets}}catch{return{...KAFALA_DEFAULTS}}
}
export function setKafalaPricingConfig(partial){
  const cur=getKafalaPricingConfig()
  const next={...cur,...partial}
  localStorage.setItem('kafalaPricingConfig',JSON.stringify(next))
}

// ─── Document types (نوع المستند) — admin-managed list for the «مستندات» service ───
// Stored as [{value, label}]. `value` is an opaque stable key kept in saved records;
// `label` is the Arabic name shown in the dropdown and can be renamed freely.
export const DOC_TYPE_DEFAULTS=[
  {value:'commercial_register',label:'السجل التجاري'},
  {value:'resident_file',label:'ملف مقيم'},
]
export function getDocTypes(){
  try{const r=JSON.parse(localStorage.getItem('docTypesConfig')||'null');return Array.isArray(r)&&r.length?r.filter(d=>d&&d.value):DOC_TYPE_DEFAULTS}catch{return DOC_TYPE_DEFAULTS}
}
export function setDocTypes(list){localStorage.setItem('docTypesConfig',JSON.stringify(list))}
export const docTypeLabel=v=>{const f=getDocTypes().find(d=>d.value===v);return f?f.label:v}
// Slug a label into a unique opaque value (allows Arabic letters); appends a counter on collision.
export function makeDocTypeValue(label,existing=[]){
  const base='dt_'+String(label||'').trim().toLowerCase().replace(/\s+/g,'_').replace(/[^\w؀-ۿ]/g,'')||'dt'
  let v=base,i=2;const taken=new Set(existing.map(d=>d.value))
  while(taken.has(v)){v=base+'_'+i;i++}
  return v
}

const F=`'Cairo','Tajawal',sans-serif`
const C={gold:'#B07D00',bentoGold:'#B07D00',red:'#c0392b',ok:'#27a046',blue:'#3483b4'}
const GLASS_CARD={background:'var(--card-grad)',backdropFilter:'blur(20px) saturate(160%)',WebkitBackdropFilter:'blur(20px) saturate(160%)',border:'1px solid var(--bd)',borderRadius:16,boxShadow:'0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}
const INNER_PILL={background:'var(--card-grad2)',border:'1px solid var(--bd)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 4px rgba(0,0,0,.22)'}
const FORM_INPUT={height:42,padding:'0 14px',borderRadius:10,border:'1px solid var(--bd)',background:'var(--inputBg)',color:'var(--tx)',fontFamily:F,fontSize:13,fontWeight:500,outline:'none',boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.18s',width:'100%',boxSizing:'border-box'}

// ─── Date picker (same visual pattern as Kafala Calculator's DateField) ───
const MONTH_NAMES_AR=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const DAY_ABBR_AR=['أحد','إثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت']
const pad2=n=>String(n).padStart(2,'0')
const fmtDateYMD=(y,m,d)=>`${y}-${pad2(m+1)}-${pad2(d)}`

function CalendarPopup({value,onPick,onClose,anchor}){
  const today=new Date()
  const parsed=value&&/^\d{4}-\d{2}-\d{2}$/.test(value)?value.split('-').map(Number):null
  const initial=parsed?{y:parsed[0],m:parsed[1]-1}:{y:today.getFullYear(),m:today.getMonth()}
  const [cur,setCur]=useState(initial)
  const firstDay=new Date(cur.y,cur.m,1).getDay()
  const daysInMonth=new Date(cur.y,cur.m+1,0).getDate()
  const prevMonth=()=>setCur(c=>c.m===0?{y:c.y-1,m:11}:{y:c.y,m:c.m-1})
  const nextMonth=()=>setCur(c=>c.m===11?{y:c.y+1,m:0}:{y:c.y,m:c.m+1})
  const cells=[]
  for(let i=0;i<firstDay;i++)cells.push(null)
  for(let d=1;d<=daysInMonth;d++)cells.push(d)
  const isToday=(y,m,d)=>today.getFullYear()===y&&today.getMonth()===m&&today.getDate()===d
  const navBtn={width:28,height:28,borderRadius:7,border:'1px solid var(--bd)',background:'var(--bd2)',color:C.gold,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,transition:'.15s'}
  // Position the popup flush against the input (6px gap). When there's room below we pin the top to the input's bottom; otherwise we pin the popup's bottom to the input's top — content-sized either way.
  const POPUP_W=Math.max(260,anchor.width)
  const GAP=6, RESERVE=340 // rough min height for fit calc only
  const spaceBelow=window.innerHeight-anchor.bottom
  const openUp=spaceBelow<RESERVE
  const left=Math.max(8,Math.min(window.innerWidth-POPUP_W-8,anchor.left+anchor.width/2-POPUP_W/2))
  const posStyle=openUp
    ?{bottom:Math.max(8,window.innerHeight-anchor.top+GAP),left}
    :{top:anchor.bottom+GAP,left}
  return ReactDOM.createPortal(
    <div style={{position:'fixed',...posStyle,width:POPUP_W,background:'var(--modal-bg)',border:'1px solid var(--bd)',borderRadius:10,padding:12,zIndex:2001,boxShadow:'0 12px 40px rgba(0,0,0,.7)',fontFamily:F,direction:'rtl'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10,direction:'ltr'}}>
        <button type="button" onClick={prevMonth} style={navBtn}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg></button>
        <div style={{fontSize:13,fontWeight:600,color:'var(--tx)'}}>{MONTH_NAMES_AR[cur.m]} {cur.y}</div>
        <button type="button" onClick={nextMonth} style={navBtn}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7, 1fr)',gap:2,fontSize:10,fontWeight:600,color:'var(--tx4)',marginBottom:4}}>
        {DAY_ABBR_AR.map(d=><div key={d} style={{textAlign:'center',padding:'4px 0'}}>{d}</div>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7, 1fr)',gap:2}}>
        {cells.map((d,i)=>{
          if(d===null)return <div key={i}/>
          const s=fmtDateYMD(cur.y,cur.m,d)
          const isSel=value===s
          const isTd=isToday(cur.y,cur.m,d)
          return(
            <button key={i} type="button" onClick={()=>{onPick(s);onClose()}}
              onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background='rgba(176,125,0,.08)'}}
              onMouseLeave={e=>{if(!isSel)e.currentTarget.style.background=isTd?'rgba(176,125,0,.04)':'transparent'}}
              style={{height:30,borderRadius:6,border:isTd&&!isSel?`1px solid ${C.gold}55`:'1px solid transparent',background:isSel?C.gold:(isTd?'rgba(176,125,0,.04)':'transparent'),color:isSel?'#000':(isTd?C.gold:'var(--tx2)'),fontFamily:F,fontSize:12,fontWeight:isSel||isTd?600:500,cursor:'pointer',transition:'.15s',padding:0}}>{d}</button>
          )
        })}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:10,paddingTop:8,borderTop:'1px solid var(--bd)'}}>
        <button type="button" onClick={()=>{const t=new Date();onPick(fmtDateYMD(t.getFullYear(),t.getMonth(),t.getDate()));onClose()}} style={{fontSize:11,color:C.gold,background:'transparent',border:'none',cursor:'pointer',fontFamily:F,fontWeight:600,padding:'4px 8px'}}>اليوم</button>
        <button type="button" onClick={()=>{onPick('');onClose()}} style={{fontSize:11,color:'var(--tx3)',background:'transparent',border:'none',cursor:'pointer',fontFamily:F,fontWeight:600,padding:'4px 8px'}}>مسح</button>
      </div>
    </div>,
    document.body
  )
}

// Text input + calendar icon. Typing accepts YYYY-MM-DD; calendar picker handles the rest.
function DateInput({value,onChange,disabled,readOnly,style}){
  const wrapRef=useRef(null)
  const [open,setOpen]=useState(false)
  const [anchor,setAnchor]=useState(null)
  const [text,setText]=useState(value||'')
  useEffect(()=>{setText(value||'')},[value])
  const handleType=t=>{
    let v=t.replace(/[^0-9-]/g,'')
    if(v.length>4&&v[4]!=='-')v=v.slice(0,4)+'-'+v.slice(4)
    if(v.length>7&&v[7]!=='-')v=v.slice(0,7)+'-'+v.slice(7)
    v=v.slice(0,10)
    if(v.length>=7){const m=parseInt(v.slice(5,7),10);if(m>12)v=v.slice(0,5)+'12'+v.slice(7);else if(m===0)v=v.slice(0,5)+'01'+v.slice(7)}
    if(v.length>=10){const d=parseInt(v.slice(8,10),10);if(d>31)v=v.slice(0,8)+'31';else if(d===0)v=v.slice(0,8)+'01'}
    setText(v)
    if(/^\d{4}-\d{2}-\d{2}$/.test(v)||v==='')onChange(v)
  }
  const openPicker=()=>{
    if(disabled||readOnly)return
    if(!open&&wrapRef.current){
      const r=wrapRef.current.getBoundingClientRect()
      setAnchor({top:r.top,bottom:r.bottom,left:r.left,width:r.width})
    }
    setOpen(o=>!o)
  }
  return(
    <div ref={wrapRef} style={{position:'relative',width:'100%'}}>
      <input type="text" value={text} onChange={e=>handleType(e.target.value)} disabled={disabled} readOnly={readOnly}
        placeholder="yyyy-mm-dd"
        style={{...style,direction:'ltr',textAlign:'center',padding:'0 40px 0 14px',letterSpacing:'.5px',cursor:readOnly?'default':'text'}}/>
      <button type="button" onClick={openPicker} disabled={disabled||readOnly} aria-label="calendar"
        style={{position:'absolute',left:6,top:'50%',transform:'translateY(-50%)',width:30,height:30,border:'none',background:open?'rgba(176,125,0,.12)':'transparent',cursor:(disabled||readOnly)?'default':'pointer',color:(disabled||readOnly)?'rgba(176,125,0,.4)':C.gold,display:'flex',alignItems:'center',justifyContent:'center',padding:0,borderRadius:7,transition:'.15s'}}>
        <CalendarIcon size={15} strokeWidth={2.2}/>
      </button>
      {open&&anchor&&(<>
        <div onClick={()=>setOpen(false)} style={{position:'fixed',inset:0,zIndex:2000}}/>
        <CalendarPopup value={value} onPick={onChange} onClose={()=>setOpen(false)} anchor={anchor}/>
      </>)}
    </div>
  )
}

const ALL_SERVICES=[
{id:'work_visa_permanent',name_ar:'تأشيرة وإقامة دائمة',Icon:CalendarRange,defaultBillable:true,group:'main'},
{id:'work_visa_temporary',name_ar:'تأشيرة وإقامة مؤقتة',Icon:CalendarClock,defaultBillable:true,group:'main'},
{id:'kafala_transfer',name_ar:'حسبة نقل الكفالة',Icon:ArrowLeftRight,defaultBillable:true,group:'main'},
{id:'iqama_renewal',name_ar:'تسعيرة تجديد الإقامة',Icon:RefreshCw,defaultBillable:true,group:'main'},
{id:'ajeer_contract',name_ar:'عقد أجير',Icon:Users,defaultBillable:true,group:'main'},
{id:'chamber_certification',name_ar:'الغرفة التجارية',Icon:FileCheck,defaultBillable:true,group:'main'},
{id:'medical_insurance',name_ar:'تأمين طبي',Icon:HeartPulse,defaultBillable:true,group:'other'},
{id:'profession_change',name_ar:'تغيير المهنة',Icon:UserCog,defaultBillable:true,group:'other'},
{id:'external_transfer_approval',name_ar:'الموافقة للنقل الخارجي',Icon:BadgeCheck,defaultBillable:false,group:'other'},
{id:'name_translation',name_ar:'تعديل الراتب',Icon:Wallet,defaultBillable:true,group:'other'},
{id:'exit_reentry_visa',name_ar:'إصدار / تمديد خروج وعودة',Icon:Plane,defaultBillable:true,group:'other'},
{id:'final_exit_visa',name_ar:'خروج نهائي',Icon:PlaneTakeoff,defaultBillable:true,group:'other'},
{id:'passport_update',name_ar:'تحديث بيانات الجواز',Icon:IdCard,defaultBillable:true,group:'other'},
{id:'iqama_print',name_ar:'طباعة الإقامة',Icon:Printer,defaultBillable:true,group:'other'},
{id:'documents',name_ar:'مستندات',Icon:FileStack,defaultBillable:false,group:'other'},
{id:'supplier_payroll',name_ar:'طلب رواتب سبلاير',Icon:Coins,defaultBillable:false,group:'other'},
{id:'custom',name_ar:'خدمة عامة',Icon:Sparkles,defaultBillable:true,group:'other'}
]

// ── Kafala pricing sections (grouped for editor UI) ──
const KAFALA_SECTIONS=[
  {title:'رسوم نقل الكفالة',note:'تُحتسب تلقائيًا من «عدد مرات نقل الخدمات السابقة» للعامل (من مقيم، أو يدويًا إذا لم تتوفر بيانات مقيم).',fields:[
    {k:'transferFee1',l:'بدون نقل سابق',badge:'0',hint:'النقلة الأولى',d:2000,sfx:'ريال'},
    {k:'transferFee2',l:'نقل واحد سابقاً',badge:'1',hint:'النقلة الثانية',d:4000,sfx:'ريال'},
    {k:'transferFee3',l:'نقلتين فأكثر',badge:'≥2',hint:'ثابت بعد ذلك',d:6000,sfx:'ريال'}
  ]},
  {title:'تجديد الإقامة',fields:[
    {k:'iqamaPerMonth',l:'سعر الشهر',d:54.2,sfx:'ريال/شهر'},
    {k:'iqamaGraceDays',l:'أيام المهلة قبل الغرامة',d:7,sfx:'يوم'},
    {k:'iqamaFine1',l:'غرامة الانتهاء (المرة الأولى)',d:500,sfx:'ريال'},
    {k:'iqamaFine2',l:'غرامة الانتهاء (المرة الثانية)',d:1000,sfx:'ريال'},
    {k:'transferOnlyMinDays',l:'الحد الأدنى للمتبقي لإتاحة «نقل فقط»',d:30,sfx:'يوم'}
  ]},
  {title:'كرت العمل',note:'سعر ثابت لكل فترة. بعد تاريخ التفعيل اليومي يصبح التسعير يومياً. بداية الفترة = اليوم + أيام معالجة الطلب.',fields:[
    {k:'workPermit3M',l:'كل 3 أشهر',d:25,sfx:'ريال'},
    {k:'workPermit6M',l:'كل 6 أشهر',d:50,sfx:'ريال'},
    {k:'workPermit9M',l:'كل 9 أشهر',d:75,sfx:'ريال'},
    {k:'workPermit12M',l:'كل 12 شهر',d:100,sfx:'ريال'},
    {k:'workPermitDailyAfter',l:'يومياً بعد التاريخ',d:22,sfx:'ريال/يوم'},
    {k:'workPermitCutoffDate',l:'تاريخ تفعيل التسعير اليومي',d:'2027-02-20',t:'date'},
    {k:'workPermitProcDays',l:'أيام معالجة الطلب',d:7,sfx:'يوم'},
    {k:'workPermitExpiredThreshold',l:'حد الإقامة المنتهية من مدة',d:30,sfx:'يوم'},
    {k:'workPermitExpiredProcDays',l:'أيام معالجة الطلب (إقامة منتهية من مدة)',d:7,sfx:'يوم'}
  ]},
  {title:'رسوم تغيير المهنة',fields:[
    {k:'profChange',l:'رسوم تغيير المهنة',d:1000,sfx:'ريال'}
  ]},
  {title:'رسوم المكتب',note:'السعر العام يُعرض ثابتاً عند رفع الطلب. سعر اليوم يُستخدم لحساب الحد الأدنى المسموح للخصم عند التصديق — هذا الحد لا يظهر للموظف المُصدِّق (يُرفض الطلب فقط عند النزول تحته).',fields:[
    {k:'officeFee',l:'السعر العام (عند رفع الطلب)',d:6500,sfx:'ريال'},
    {k:'officeDailyRate',l:'سعر اليوم (الحد الأدنى للخصم)',d:18.06,sfx:'ريال/يوم'}
  ]}
]
const KAFALA_FIELDS=KAFALA_SECTIONS.flatMap(s=>s.fields)
const VISA_FIELDS=[
{k:'issuance',l:'الحد الأدنى لدفعة إصدار التأشيرة',d:2000,sfx:'ريال/تأشيرة'},
{k:'authorization',l:'الحد الأدنى لدفعة الوكالة',d:2000,sfx:'ريال/تأشيرة'},
{k:'residence',l:'الحد الأدنى لدفعة إصدار الإقامة',d:0,sfx:'ريال/تأشيرة'},
{k:'defaultTotal',l:'الحد الأدنى للسعر الإجمالي',d:0,sfx:'ريال/تأشيرة',_footer:true}
]
// Temporary visa = دفعتان (إصدار + توكيل). حدّان دنيان للدفعتين + الحد الأدنى للإجمالي.
const VISA_TEMP_FIELDS=[
{k:'issuance',l:'الحد الأدنى لدفعة إصدار التأشيرة',d:2000,sfx:'ريال/تأشيرة'},
{k:'authorization',l:'الحد الأدنى لدفعة الوكالة',d:2000,sfx:'ريال/تأشيرة'},
{k:'defaultTotal',l:'الحد الأدنى للسعر الإجمالي',d:0,sfx:'ريال/تأشيرة',_footer:true}
]
// رخصة العمل بدون إعفاء — حقول خاصّة بتجديد الإقامة فقط (تُستخدم عند اختيار «لا يوجد إعفاء» في الحاسبة)
const WP_NO_EXEMPT_FIELDS=[
  {k:'workPermitNoExempt3M',l:'كل 3 أشهر (بدون إعفاء)',d:2425,sfx:'ريال'},
  {k:'workPermitNoExempt6M',l:'كل 6 أشهر (بدون إعفاء)',d:4850,sfx:'ريال'},
  {k:'workPermitNoExempt9M',l:'كل 9 أشهر (بدون إعفاء)',d:7275,sfx:'ريال'},
  {k:'workPermitNoExempt12M',l:'كل 12 شهر (بدون إعفاء)',d:9700,sfx:'ريال'},
]
// حقول خاصّة بتجديد الإقامة فقط — حد التغطية الحكومية (يُحرَّر من صفحة التسعير، وتقرأه حاسبة التجديد).
const IQAMA_EXTRA_FIELDS=[
  {k:'iqamaGovCover',l:'حد التغطية الحكومية للإقامة',d:650,sfx:'ريال'},
  {k:'iqamaWpResetEnabled',l:'تفعيل قاعدة الإقامة المنتهية من مدة طويلة',d:false,t:'bool'},
  {k:'iqamaWpResetAfterDays',l:'حدّ التأخّر الطويل (يبدأ بعده إصدار جديد)',d:365,sfx:'يوم'},
  {k:'iqamaWpIssuanceDays',l:'أيام إصدار الرخصة الجديدة',d:5,sfx:'يوم'},
  {k:'iqamaOfficeFeeMode',l:'طريقة حساب رسوم المكتب',d:'flat',t:'mode'},
  {k:'iqamaWpBasis',l:'أساس احتساب رخصة العمل',d:'iqama',t:'mode'},
  {k:'iqamaOfficeDiscountEnabled',l:'السماح بخصم المكتب عند التصديق',d:true,t:'bool'},
]
const IQAMA_FIELDS=[...KAFALA_FIELDS.filter(f=>!['transferFee1','transferFee2','transferFee3'].includes(f.k)),...WP_NO_EXEMPT_FIELDS,...IQAMA_EXTRA_FIELDS]
// أقسام تجديد الإقامة كصفحات معالج: نفس أقسام الكفالة لكن بحقول الإقامة فقط، مع حذف الأقسام الفارغة (نقل الكفالة).
// «الحد الأدنى للمتبقي لإتاحة نقل فقط» (transferOnlyMinDays) يخصّ سياق النقل، فلا يُعرض في تسعير تجديد الإقامة.
const IQAMA_SECTIONS=KAFALA_SECTIONS.map(sec=>({...sec,fields:sec.fields.filter(f=>IQAMA_FIELDS.includes(f)&&f.k!=='transferOnlyMinDays')})).filter(sec=>sec.fields.length)
const IQAMA_SECTION_ICONS={'تجديد الإقامة':RefreshCw,'كرت العمل':IdCard,'رسوم تغيير المهنة':UserCog,'رسوم المكتب':Building2}
// خريطة الحقول بالمفتاح — لبناء خطوات المعالج من قوائم مفاتيح.
const IQAMA_FIELD_BY_K=Object.fromEntries([...KAFALA_FIELDS,...WP_NO_EXEMPT_FIELDS,...IQAMA_EXTRA_FIELDS].map(f=>[f.k,f]))
// خطوات معالج تسعير تجديد الإقامة — مقسّمة بدقّة، لكل خطوة أيقونة وشرح، ولكل حقل وصف يوضّح دلالته.
const IQAMA_WIZARD_STEPS=[
  {title:'الرسوم الحكومية لتجديد الإقامة',icon:Coins,note:'رسم الإقامة الحكومي = عدد الأشهر × سعر الشهر. يشمله المكتب حتى «حد التغطية» (يعادل 12 شهرًا = 650 ريال). أي زيادة — تجديد أطول من سنة أو شهور متأخّرة — تُضاف على العميل، وغرامات التأخير لا تدخل التغطية وتُحسب منفصلة.',fields:[
    {k:'iqamaPerMonth',desc:'سعر الشهر الواحد من التجديد — يُضرب في عدد الأشهر (12 شهر ≈ 650 ريال · 3 أشهر ≈ 162.5 ريال).'},
    {k:'iqamaGovCover',desc:'المبلغ الذي يشمله المكتب من رسم الإقامة الحكومي (يعادل 12 شهرًا). ما زاد عنه — لتجديد أطول أو متأخرات — يُضاف على العميل. الغرامات لا تدخل التغطية.'},
  ]},
  {title:'المهلة والغرامات',icon:CalendarClock,note:'تتحكّم في متى تبدأ الغرامة ومقدارها عند تأخّر التجديد.',fields:[
    {k:'iqamaGraceDays',desc:'الحدّ الأدنى من الأيام المتبقية على الإقامة ليتمكّن المكتب من إنجاز التجديد قبل انتهائها. إذا تبقّى أكثر من هذا العدد ← تجديد عادي بلا غرامة؛ وإذا أتى العامل بأقل منه (أو الإقامة منتهية) ← تُحتسب غرامة تأخير، لأن المعاملة تحتاج وقتًا ولن تُنجَز قبل الانتهاء. المطلوب من العامل الحضور مبكّرًا — وليس في آخر أيام.'},
    {k:'iqamaFine1',desc:'الغرامة المُضافة أول مرّة تتأخّر أو تنتهي فيها الإقامة (الحالة الثانية).'},
    {k:'iqamaFine2',desc:'غرامة أعلى للمخالفة المكرّرة (الحالة الثالثة).'},
  ]},
  {title:'كرت العمل · ٣ و ٦ أشهر',icon:IdCard,note:'السعر الثابت لإصدار كرت العمل للمدد القصيرة (تنتهي قبل «تاريخ التفعيل اليومي»).',fields:[
    {k:'workPermit3M',desc:'سعر إصدار كرت العمل لمدّة ٣ أشهر.'},
    {k:'workPermit6M',desc:'سعر إصدار كرت العمل لمدّة ٦ أشهر.'},
  ]},
  {title:'كرت العمل · ٩ و ١٢ شهر',icon:IdCard,note:'السعر الثابت لإصدار كرت العمل للمدد الطويلة (تنتهي قبل «تاريخ التفعيل اليومي»).',fields:[
    {k:'workPermit9M',desc:'سعر إصدار كرت العمل لمدّة ٩ أشهر.'},
    {k:'workPermit12M',desc:'سعر إصدار كرت العمل لسنة كاملة (١٢ شهر).'},
  ]},
  {title:'كرت العمل · بدون إعفاء',icon:BadgeCheck,note:'السعر الثابت لرخصة العمل عند اختيار «لا يوجد إعفاء» في حاسبة التجديد — يحل محل الحساب الاعتيادي لكل فترة.',fields:[
    {k:'workPermitNoExempt3M',desc:'سعر رخصة العمل لمدّة ٣ أشهر بدون إعفاء.'},
    {k:'workPermitNoExempt6M',desc:'سعر رخصة العمل لمدّة ٦ أشهر بدون إعفاء.'},
    {k:'workPermitNoExempt9M',desc:'سعر رخصة العمل لمدّة ٩ أشهر بدون إعفاء.'},
    {k:'workPermitNoExempt12M',desc:'سعر رخصة العمل لسنة كاملة (١٢ شهر) بدون إعفاء.'},
  ]},
  {title:'كرت العمل · التسعير اليومي',icon:CalendarRange,note:'بعد «تاريخ التفعيل اليومي» يُحسب كرت العمل بعدد الأيام بدل السعر الثابت.',fields:[
    {k:'workPermitCutoffDate',desc:'الخط الفاصل: قبله السعر الثابت من الجدول، وبعده التسعير اليومي.'},
    {k:'workPermitDailyAfter',desc:'سعر اليوم الواحد بعد تاريخ التفعيل: عدد أيام الفترة × هذا السعر.'},
  ]},
  {title:'أساس احتساب رخصة العمل',icon:IdCard,basisStep:true,note:'التاريخ الذي تُبنى عليه فترة رخصة العمل وشهورها في كل الحسبات — سياسة موحّدة لا يغيّرها الموظف في الحاسبة.',fields:[]},
  {title:'بداية الفترة وقاعدة المنتهية',icon:BadgeCheck,wpReset:true,note:'متى تبدأ فترة رخصة العمل للإقامة المنتهية، وقاعدة المنتهية من مدة طويلة (إصدار جديد بلا شهور تأخّر).',fields:[
    {k:'workPermitProcDays',desc:'للإقامة المنتهية: تبدأ الفترة من اليوم + هذه الأيام (مدّة معالجة الطلب).'},
    {k:'iqamaWpResetAfterDays',desc:'إذا تجاوز تأخّر انتهاء الإقامة هذا العدد من الأيام (والقاعدة مفعّلة) ← تُحسب رخصة العمل كإصدار جديد.'},
    {k:'iqamaWpIssuanceDays',desc:'في الإصدار الجديد: تبدأ الفترة من اليوم + هذه الأيام، وتُحاسب على شهور التجديد فقط بلا شهور تأخّر.'},
  ]},
  {title:'رسوم تغيير المهنة',icon:UserCog,note:'رسم تغيير مهنة العامل، مع إمكانية إعفاء مهن محدّدة.',picker:true,fields:[
    {k:'profChange',desc:'الرسم الثابت المُضاف عند تغيير مهنة العامل.'},
  ]},
  {title:'رسوم المكتب',icon:Building2,officeStep:true,note:'طريقة حساب رسوم المكتب: سعر ثابت أو محسوب باليوم. سعر اليوم يُستخدم أيضاً كحدّ أدنى للخصم عند التصديق.',fields:[
    {k:'officeFee',desc:'السعر الثابت لرسوم المكتب — يُستخدم في وضع «سعر ثابت».'},
    {k:'officeDailyRate',desc:'سعر اليوم الواحد — أساس الحساب في وضع «يومي»، وحدّ الخصم الأدنى عند التصديق.'},
  ]},
  {title:'خصم المكتب',icon:Wallet,discountStep:true,note:'سياسة السماح بخصم المكتب عند تصديق التجديد (مبلغ بالريال، بحدّ أدنى لا ينزل تحت سعر اليوم × أيام التجديد).',fields:[]},
  // خطوة التأمين الطبي — تُرسم بمحتوى خاص (فئات عمرية فقط؛ التأمين إلزامي بلا إعفاء) لا بصفوف الحقول الاعتيادية.
  {title:'التأمين الطبي',icon:HeartPulse,medical:true,note:'التأمين الطبي إلزامي في التجديد ويُحتسب دائمًا حسب الفئة العمرية من تاريخ ميلاد العامل.',fields:[]},
]
// شرح مختصر يظهر أعلى كل خطوة في معالج تسعير تجديد الإقامة.
const IQAMA_STEP_NOTES={
  'تجديد الإقامة':'رسوم التجديد تُحسب على ثلاث حالات: إقامة سارية بعيدة عن الانتهاء (عدد الأشهر × سعر الشهر، بلا غرامة)؛ خلال المهلة أو منتهية حديثًا (المدة الكاملة × سعر الشهر + غرامة المرة الأولى)؛ ومخالفة مكررة (نفس المعادلة بغرامة المرة الثانية). «أيام المهلة قبل الغرامة» هي ما يفصل الحالة الأولى عن البقية.',
  'كرت العمل':'سعر رخصة العمل ثابت لكل فترة (٣/٦/٩/١٢ شهر) إذا انتهت قبل «تاريخ التفعيل اليومي»، وبعده يُحسب بعدد الأيام × سعر اليوم. «أيام معالجة الطلب» تحدّد بداية الفترة، وللإقامة المنتهية من مدة طويلة قاعدة خاصة.',
  'رسوم تغيير المهنة':'رسم ثابت يُضاف عند تغيير مهنة العامل. أي مهنة (الحالية أو الجديدة) مدرجة في القائمة أدناه تجعل الرسوم مجانية (٠ ريال).',
  'رسوم المكتب':'«السعر العام» يظهر ثابتًا عند رفع الطلب. «سعر اليوم» هو الحد الأدنى المسموح للخصم عند التصديق (لا يظهر للموظف المُصدّق)، ويُحتسب أيضًا للأيام الزائدة عن «الحد الشهري».',
}
const PRICING_SCHEMA={
work_visa_permanent:{store:'visaPricingMin_permanent',fields:VISA_FIELDS,note:'الحدود الدنيا لدفعات تأشيرة العمل الدائمة'},
work_visa_temporary:{store:'visaPricingMin_temporary',fields:VISA_TEMP_FIELDS,note:'الحدود الدنيا لتأشيرة العمل المؤقتة (إصدار + توكيل)'},
kafala_transfer:{store:'kafalaPricingConfig',fields:KAFALA_FIELDS,note:'إعدادات نقل الكفالة فقط'},
iqama_renewal:{store:'iqamaRenewalPricingConfig',fields:IQAMA_FIELDS,note:'إعدادات تجديد الإقامة فقط'},
ajeer_contract:{store:'servicesPricingConfig',sub:'ajeer',fields:[
  {k:'baseFee',l:'رسوم أساسية',d:300,sfx:'ريال'},
  {k:'baseMonths',l:'عدد الأشهر المشمولة بالأساس',d:3,sfx:'شهر'},
  {k:'perMonthAfter',l:'رسوم كل شهر إضافي',d:100,sfx:'ريال/شهر'},
  {k:'saudizationEnabled',t:'bool',d:true,_section:'saud'},
  {k:'saudizationThreshold',l:'حد السعودة (عدد العمال المستهدف)',d:6,sfx:'عامل',_section:'saud'},
  {k:'saudizationPerWorker',l:'رسم كل عامل ناقص عن الحد',d:250,sfx:'ريال/عامل',_section:'saud'}
]},
exit_reentry_visa:{store:'servicesPricingConfig',sub:'exitReentry',fields:[
  {k:'issueSingleBase',l:'إصدار مفردة · السعر الأساسي',d:300,sfx:'ريال'},
  {k:'issueMultipleBase',l:'إصدار متعددة · السعر الأساسي',d:500,sfx:'ريال'},
  {k:'issueSingleCovered',l:'إصدار مفردة · الأشهر المشمولة بالأساس',d:3,sfx:'شهر'},
  {k:'issueMultipleCovered',l:'إصدار متعددة · الأشهر المشمولة بالأساس',d:3,sfx:'شهر'},
  {k:'issueSinglePerMonth',l:'إصدار مفردة · كل شهر إضافي',d:100,sfx:'ريال/شهر'},
  {k:'issueMultiplePerMonth',l:'إصدار متعددة · كل شهر إضافي',d:200,sfx:'ريال/شهر'},
  {k:'extendSingle',l:'تمديد مفردة · كل شهر',d:100,sfx:'ريال/شهر'},
  {k:'extendMultiple',l:'تمديد متعددة · كل شهر',d:200,sfx:'ريال/شهر'},
  {k:'officeFeeFixed',l:'رسوم مكتب ثابتة',d:50,sfx:'ريال'}
],note:'الإصدار: السعر الأساسي يشمل عدد الأشهر المحدد، ويُضاف سعر كل شهر إضافي بعدها. التمديد: عدد الأشهر × سعر الشهر.'},
final_exit_visa:{store:'servicesPricingConfig',sub:'finalExit',fields:[
  {k:'fee',l:'رسوم الخروج النهائي',d:150,sfx:'ريال'}
]},
profession_change:{store:'servicesPricingConfig',sub:'professionChange',fields:[
  {k:'fee',l:'رسم تغيير المهنة',d:200,sfx:'ريال'},
  {k:'officeFeeFixed',l:'رسوم مكتب ثابتة',d:50,sfx:'ريال'}
]},
passport_update:{store:'servicesPricingConfig',sub:'passportUpdate',fields:[
  {k:'fee',l:'رسم تحديث الجواز',d:100,sfx:'ريال'}
]},
name_translation:{store:'servicesPricingConfig',sub:'nameTranslation',fields:[
  {k:'pct',l:'نسبة من الراتب الجديد',d:5,sfx:'%'}
],note:'السعر = نسبة مئوية من الراتب الجديد المُدخل في الفاتورة (يُقرَّب لأقرب رقم صحيح).'},
iqama_print:{store:'servicesPricingConfig',sub:'iqamaPrint',fields:[
  {k:'perCopy',l:'رسم طباعة الإقامة',d:30,sfx:'ريال'}
]},
chamber_certification:{store:'servicesPricingConfig',sub:'chamberCert',fields:[
  {k:'printed',l:'تصديق المطبوعات',d:200,sfx:'ريال'},
  {k:'openRequest',l:'تصديق طلب مفتوح',d:150,sfx:'ريال'},
  {k:'officeFeeFixed',l:'رسوم مكتب ثابتة',d:15,sfx:'ريال'}
]},
documents:{store:'servicesPricingConfig',sub:'documents',fields:[
  {k:'perDoc',l:'رسم إصدار المستند',d:30,sfx:'ريال'}
]},
medical_insurance:{store:'servicesPricingConfig',sub:'medicalInsurance',fields:[
  {k:'perMonthMultiplier',l:'معامل الحساب الشهري',d:1,sfx:''}
]}
}

const STORAGE_KEY='jisr_service_overrides'

export function getServiceOverrides(){
try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch{return{}}
}
export function isServiceActive(id){
const o=getServiceOverrides()[id]
return o?.active!==false
}
export function isServiceBillable(id){
const svc=ALL_SERVICES.find(s=>s.id===id)
const o=getServiceOverrides()[id]
if(o&&typeof o.billable==='boolean')return o.billable
return svc?.defaultBillable!==false
}

// ── Per-branch overrides ──
// Shape: { [branchId]: { [svcId]: { active?, billable?, pricing?: {...partial fields} } } }
// Any unset key falls back to the global service default above.
const BRANCH_STORAGE_KEY='jisr_branch_overrides'
export function getBranchOverrides(){try{return JSON.parse(localStorage.getItem(BRANCH_STORAGE_KEY)||'{}')}catch{return{}}}

export function isServiceActiveFor(svcId,branchId){
  if(!branchId)return isServiceActive(svcId)
  const o=getBranchOverrides()[branchId]?.[svcId]
  if(o&&typeof o.active==='boolean')return o.active
  return isServiceActive(svcId)
}
export function isServiceBillableFor(svcId,branchId){
  if(!branchId)return isServiceBillable(svcId)
  const o=getBranchOverrides()[branchId]?.[svcId]
  if(o&&typeof o.billable==='boolean')return o.billable
  return isServiceBillable(svcId)
}

// ── Pricing helpers ──
const readStore=(key)=>{try{return JSON.parse(localStorage.getItem(key)||'{}')}catch{return{}}}
const writeStore=(key,data)=>localStorage.setItem(key,JSON.stringify(data))

function getPricing(svcId){
const sch=PRICING_SCHEMA[svcId]
if(!sch)return null
const raw=readStore(sch.store)
const src=sch.sub?raw[sch.sub]||{}:raw
const out={}
sch.fields.forEach(f=>{out[f.k]=src[f.k]!==undefined?src[f.k]:f.d})
// تجديد الإقامة يشارك الكفالة جدول الفئات العمرية للتأمين فقط — التأمين إلزامي في التجديد فلا مهلة إعفاء.
if(svcId==='kafala_transfer'||svcId==='iqama_renewal'){
  out.medicalBrackets=Array.isArray(src.medicalBrackets)&&src.medicalBrackets.length?src.medicalBrackets:KAFALA_DEFAULTS.medicalBrackets
  out.profChangeFreeOccupations=Array.isArray(src.profChangeFreeOccupations)?src.profChangeFreeOccupations:KAFALA_DEFAULTS.profChangeFreeOccupations
}
if(svcId==='kafala_transfer'){
  out.transferBumpOccupations=Array.isArray(src.transferBumpOccupations)?src.transferBumpOccupations:KAFALA_DEFAULTS.transferBumpOccupations
  out.kafalaWpBasis=src.kafalaWpBasis||'iqama'
  out.kafalaWpResetEnabled=src.kafalaWpResetEnabled===true
  out.kafalaWpResetAfterDays=src.kafalaWpResetAfterDays!==undefined?src.kafalaWpResetAfterDays:365
  out.kafalaWpIssuanceDays=src.kafalaWpIssuanceDays!==undefined?src.kafalaWpIssuanceDays:5
  out.kafalaOfficeFeeMode=src.kafalaOfficeFeeMode||'flat'
  out.kafalaOfficeDiscountEnabled=src.kafalaOfficeDiscountEnabled!==false
  out.kafalaFloorMode=src.kafalaFloorMode||'daily'
  out.kafalaFloorFixed=src.kafalaFloorFixed!==undefined?src.kafalaFloorFixed:0
}
return out
}
function setPricing(svcId,values){
const sch=PRICING_SCHEMA[svcId]
if(!sch)return
const raw=readStore(sch.store)
if(sch.sub){raw[sch.sub]={...(raw[sch.sub]||{}),...values}}
else{Object.assign(raw,values)}
writeStore(sch.store,raw)
saveSvcAdminSetting(sch.store,raw).catch(e=>console.warn('[svcAdminSync] save pricing failed',sch.store,e))
}

// Resolve pricing for a specific branch — merges default with per-branch overrides.
export function getPricingFor(svcId,branchId){
  const def=getPricing(svcId)
  if(!branchId||!def)return def
  const op=getBranchOverrides()[branchId]?.[svcId]?.pricing
  if(!op)return def
  return {...def,...op}
}

export default function ServiceAdminPage({toast,lang,user}){
const isAr=lang!=='en';const T=(a,e)=>isAr?a:e
const [overrides,setOverrides]=useState(getServiceOverrides())
const [expanded,setExpanded]=useState(null)// svc id being edited
const [selectedSvcId,setSelectedSvcId]=useState(null)// service id for detail view
const [priceState,setPriceState]=useState({})
// Per-branch overrides (active/billable/pricing) live in state + localStorage
const [branchOverrides,setBranchOverridesState]=useState(getBranchOverrides())
const [branches,setBranches]=useState([])
// {svcId, branchId|null, draft:{active?,billable?,pricing:{...}}} or null
const [overrideEditor,setOverrideEditor]=useState(null)
const [searchQ,setSearchQ]=useState('')
const [isPriceEditable,setIsPriceEditable]=useState(false)
const [priceSnapshot,setPriceSnapshot]=useState(null)
// When non-null, the pricing editor edits a per-branch override (applied to these branchIds) instead of the global default.
const [priceBranchCtx,setPriceBranchCtx]=useState(null)
const startEditPrice=()=>{setPriceSnapshot({...priceState});setIsPriceEditable(true)}
const cancelEditPrice=()=>{if(priceSnapshot)setPriceState(priceSnapshot);setPriceSnapshot(null);setIsPriceEditable(false)}
const savePriceAndLock=(id)=>{savePrice(id);setPriceSnapshot(null);if(!priceBranchCtx)setIsPriceEditable(false)}
// ── Default-pricing edit modal (non-kafala simple services) — the card stays a read-only view;
//    editing happens in a popup so saved values are confirmed via an in-modal SuccessView, not just a toast.
const [priceSaved,setPriceSaved]=useState(false)
const openPriceModal=()=>{setPriceSnapshot({...priceState});setPriceSaved(false);setIsPriceEditable(true)}
const closePriceModal=()=>{if(!priceSaved&&priceSnapshot)setPriceState(priceSnapshot);setPriceSnapshot(null);setPriceSaved(false);setIsPriceEditable(false)}
const submitPriceModal=(id)=>{
  const normalized={}
  Object.entries(priceState).forEach(([k,v])=>{if(k.startsWith('__'))return;if(typeof v==='string'&&v!==''&&/^\d+(\.\d+)?$/.test(v))normalized[k]=Number(v);else normalized[k]=v})
  setPricing(id,normalized)
  setPriceSnapshot(null)
  setPriceSaved(true)
}
// ── Per-branch override wizard modal (simple services) — 2 steps: pick branch(es) → set price.
//    Same FormKit popup as the default-price edit; replaces the inline override editor for simple svcs.
const [ovModal,setOvModal]=useState(null)      // svcId or null
const [ovBranchIds,setOvBranchIds]=useState([])// selected branches
const [ovPricing,setOvPricing]=useState({})    // draft pricing for the override
const [ovSaved,setOvSaved]=useState(false)
const openOvModal=(svcId,branchId=null)=>{
  setOvBranchIds(branchId?[branchId]:[])
  setOvPricing({...((branchId?getPricingFor(svcId,branchId):getPricing(svcId))||{})})
  setOvSaved(false)
  setOvModal(svcId)
}
const closeOvModal=()=>{setOvModal(null);setOvSaved(false);setOvBranchIds([]);setOvPricing({})}
const submitOvModal=(svcId)=>{
  const vals={}
  ;(PRICING_SCHEMA[svcId]?.fields||[]).forEach(f=>{const v=ovPricing[f.k];if(typeof v==='string'&&v!==''&&/^\d+(\.\d+)?$/.test(v))vals[f.k]=Number(v);else if(v!==undefined&&v!=='')vals[f.k]=v})
  const pricing=diffFromDefault(svcId,vals)
  ovBranchIds.forEach(bid=>upsertBranchOverride(bid,svcId,{pricing}))
  setOvSaved(true)
}
// ─── Document types editor state (نوع المستند for the «مستندات» service) ───
const [docTypes,setDocTypesState]=useState(getDocTypes())
const [newDocLabel,setNewDocLabel]=useState('')
const persistDocTypes=async(list)=>{setDocTypesState(list);setDocTypes(list);try{await saveSvcAdminSetting('docTypesConfig',list)}catch(e){console.warn('[docTypes] save failed',e)}}
const addDocType=()=>{const l=newDocLabel.trim();if(!l)return;if(docTypes.some(d=>d.label===l)){toast(T('هذا النوع موجود مسبقاً','This type already exists'));return}persistDocTypes([...docTypes,{value:makeDocTypeValue(l,docTypes),label:l}]);setNewDocLabel('')}
const renameDocType=(value,label)=>{persistDocTypes(docTypes.map(d=>d.value===value?{...d,label}:d))}
const removeDocType=(value)=>{persistDocTypes(docTypes.filter(d=>d.value!==value))}
// Format integer-like value with thousands separators; preserves trailing decimals during typing.
const fmtThousands=(v)=>{
  if(v===''||v==null)return ''
  const s=String(v)
  const dot=s.indexOf('.')
  const intPart=dot===-1?s:s.slice(0,dot)
  const decPart=dot===-1?'':s.slice(dot)
  const n=Number(intPart);if(isNaN(n))return s
  return n.toLocaleString('en-US')+decPart
}
useEffect(()=>{
  const sb=getSupabase();if(!sb)return
  sb.from('branches').select('id,branch_code').is('deleted_at',null).order('branch_code').then(({data,error})=>{if(error){console.error('Failed to load branches',error);toast(T('تعذّر تحميل المكاتب','Failed to load branches'))}else setBranches(data||[])})
},[])
// Same guard as the global overrides effect: mirror to localStorage always, but
// skip the DB push on the initial mount run (and the post-hydration write-back)
// so a browser's stale local copy never clobbers remote branch overrides.
const skipNextBranchSync=useRef(true)
useEffect(()=>{
  localStorage.setItem(BRANCH_STORAGE_KEY,JSON.stringify(branchOverrides))
  if(skipNextBranchSync.current){skipNextBranchSync.current=false;return}
  saveSvcAdminSetting(BRANCH_STORAGE_KEY,branchOverrides).catch(e=>console.warn('[svcAdminSync] save branch overrides failed',e))
},[branchOverrides])
const getOverridesForSvc=(svcId)=>{
  const out=[]
  Object.entries(branchOverrides).forEach(([bid,svcs])=>{if(svcs[svcId])out.push({branchId:bid,...svcs[svcId]})})
  return out
}
const upsertBranchOverride=(branchId,svcId,patch)=>{
  setBranchOverridesState(p=>{
    const next={...p}
    next[branchId]={...(next[branchId]||{})}
    const cur=next[branchId][svcId]||{}
    const merged={...cur,...patch}
    Object.keys(merged).forEach(k=>{if(merged[k]===undefined||merged[k]===null||(k==='pricing'&&Object.keys(merged[k]||{}).length===0))delete merged[k]})
    if(Object.keys(merged).length===0)delete next[branchId][svcId]
    else next[branchId][svcId]=merged
    if(Object.keys(next[branchId]||{}).length===0)delete next[branchId]
    return next
  })
}
const removeBranchOverride=(branchId,svcId)=>{
  setBranchOverridesState(p=>{
    const next={...p}
    if(next[branchId]){delete next[branchId][svcId];if(Object.keys(next[branchId]).length===0)delete next[branchId]}
    return next
  })
  toast(T('تم حذف التخصيص','Override removed'))
}
const openOverrideEditor=(svcId,branchId=null)=>{
  const existing=branchId?(branchOverrides[branchId]?.[svcId]||{}):{}
  // Seed the shared pricing editor with the branch's effective values (default + its override).
  setPriceState((branchId?getPricingFor(svcId,branchId):getPricing(svcId))||{})
  setPriceBranchCtx({branchIds:branchId?[branchId]:[]})
  setCollapsed(Object.fromEntries(ALL_KAFALA_SECTIONS.map(t=>[t,true])))
  setEditing({})
  setIsPriceEditable(svcId!=='kafala_transfer') // non-kafala: editable inline (its external "تعديل" is hidden in override mode)
  setOverrideEditor({svcId,branchIds:branchId?[branchId]:[],draft:{
    active:existing.active,
    billable:existing.billable,
  }})
}
const closeOverrideEditor=()=>{
  const svc=overrideEditor?.svcId
  setOverrideEditor(null)
  setPriceBranchCtx(null)
  setEditing({})
  setIsPriceEditable(false)
  if(svc)setPriceState(getPricing(svc)||{})
}
// Re-seed the shared editor when the selected branch(es) change.
// Exactly 1 branch → its effective values (edit existing override); 0 or ≥2 → default (applied to all selected).
useEffect(()=>{
  if(!overrideEditor)return
  const ids=overrideEditor.branchIds||[]
  setPriceBranchCtx({branchIds:ids})
  setPriceState((ids.length===1?getPricingFor(overrideEditor.svcId,ids[0]):getPricing(overrideEditor.svcId))||{})
  setEditing({})
  setIsPriceEditable(overrideEditor.svcId!=='kafala_transfer')
// eslint-disable-next-line react-hooks/exhaustive-deps
},[overrideEditor?.branchIds?.join(','),overrideEditor?.svcId])

// Inline override editor — renders inside the per-branch overrides section card
// (no modal overlay). Active iff overrideEditor.svcId matches the current svc.
const renderInlineOverrideEditor=(svc)=>{
  const sch=PRICING_SCHEMA[svc.id]
  const fields=sch?.fields?.filter(f=>(!f.t||f.t==='text')&&!f._footer)||[]
  const def=getPricing(svc.id)||{}
  const draft=overrideEditor.draft
  const baseActive=isServiceActive(svc.id)
  const baseBillable=isServiceBillable(svc.id)
  const eff={
    active:typeof draft.active==='boolean'?draft.active:baseActive,
    billable:typeof draft.billable==='boolean'?draft.billable:baseBillable,
  }
  const setDraft=patch=>setOverrideEditor(p=>({...p,draft:{...p.draft,...patch}}))
  const setPricingField=(k,v)=>setOverrideEditor(p=>({...p,draft:{...p.draft,pricing:{...(p.draft.pricing||{}),[k]:v}}}))
  const clearPricingField=(k)=>setOverrideEditor(p=>{const np={...(p.draft.pricing||{})};delete np[k];return{...p,draft:{...p.draft,pricing:np}}})
  const selectedSet=new Set(overrideEditor.branchIds||[])
  const usedBranchIds=new Set(getOverridesForSvc(svc.id).map(o=>o.branchId).filter(b=>!selectedSet.has(b)))
  const availableBranches=branches.filter(b=>!usedBranchIds.has(b.id))
  const toggleBranch=(id)=>setOverrideEditor(p=>{const cur=p.branchIds||[];const next=cur.includes(id)?cur.filter(x=>x!==id):[...cur,id];return{...p,branchIds:next}})
  const canSave=(overrideEditor.branchIds||[]).length>0
  // Pricing is saved by the per-section buttons inside renderPriceEditor (→ saveSectionToBranches).
  // This footer button persists only the active/billable state for the selected branches, then closes.
  const onSave=()=>{
    if(!canSave){toast(T('اختر مكتباً واحداً على الأقل','Pick at least one branch'));return}
    const patch={
      active:(typeof draft.active==='boolean'&&draft.active!==baseActive)?draft.active:undefined,
      billable:(typeof draft.billable==='boolean'&&draft.billable!==baseBillable)?draft.billable:undefined,
    }
    overrideEditor.branchIds.forEach(bid=>upsertBranchOverride(bid,svc.id,patch))
    const n=overrideEditor.branchIds.length
    toast(T(n===1?'تم حفظ التخصيص':`تم حفظ التخصيص لـ ${n} مكاتب`,n===1?'Override saved':`Override saved for ${n} branches`))
    closeOverrideEditor()
  }
  const labelS={fontSize:11,fontWeight:600,color:'var(--tx3)',marginBottom:6,display:'block',textAlign:'right'}
  const compactInp={width:'100%',height:36,padding:'0 12px',border:'1px solid var(--bd)',borderRadius:9,fontFamily:F,fontSize:12,fontWeight:600,color:'var(--tx)',outline:'none',background:'var(--inputBg)',boxSizing:'border-box',boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)'}
  const Toggle=({on,onChange,onLabel,offLabel,onColor,offColor,onIcon,offIcon})=>(
    <div style={{display:'inline-flex',alignItems:'center',gap:6}}>
      <button type="button" onClick={()=>onChange(!on)}
        style={{width:44,height:22,borderRadius:999,border:'none',background:on?onColor:offColor,cursor:'pointer',position:'relative',transition:'.2s',padding:0,boxShadow:'0 2px 6px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.12)'}}>
        <span style={{position:'absolute',width:16,height:16,borderRadius:'50%',background:'#fff',top:3,right:on?3:25,transition:'.2s',display:'inline-flex',alignItems:'center',justifyContent:'center'}}>
          {on?onIcon:offIcon}
        </span>
      </button>
      <span style={{fontSize:11,fontWeight:600,color:on?onColor:offColor}}>{on?onLabel:offLabel}</span>
    </div>
  )
  return(
    <div style={{borderRadius:12,background:'rgba(0,0,0,.18)',border:'1px solid rgba(176,125,0,.25)',padding:'14px 16px',display:'flex',flexDirection:'column',gap:14}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,paddingBottom:10,borderBottom:'1px solid var(--bd)'}}>
        <span style={{display:'inline-flex',alignItems:'center',gap:8,fontSize:12,fontWeight:600,color:C.gold,letterSpacing:'.2px'}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>
          {overrideEditor.branchId?'تعديل تخصيص':'إضافة تخصيص'}
        </span>
      </div>
      {/* Branch picker — multi-select */}
      <div>
        <label style={{...labelS,display:'flex',alignItems:'center',justifyContent:'space-between',gap:6}}>
          <span>المكتب{selectedSet.size>0&&` (${selectedSet.size} محدّد)`}</span>
          <span style={{fontSize:9,color:'var(--tx5)',fontWeight:500}}>اضغط لتحديد عدة مكاتب</span>
        </label>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(90px,1fr))',gap:6,padding:8,borderRadius:10,background:'rgba(0,0,0,.18)',border:'1px solid var(--bd2)'}}>
          {availableBranches.length===0?(
            <div style={{gridColumn:'1/-1',padding:14,textAlign:'center',fontSize:11,color:'var(--tx5)'}}>كل المكاتب لها تخصيص بالفعل أو لا توجد مكاتب نشطة</div>
          ):availableBranches.map(b=>{
            const isSel=selectedSet.has(b.id)
            return(<button key={b.id} type="button" onClick={()=>toggleBranch(b.id)}
              style={{height:34,borderRadius:8,border:`1px solid ${isSel?C.gold:'var(--bd)'}`,background:isSel?'rgba(176,125,0,.18)':'var(--bd2)',color:C.gold,fontFamily:'monospace',fontSize:12,fontWeight:600,cursor:'pointer',direction:'ltr',transition:'.15s',boxShadow:isSel?`0 0 0 1px ${C.gold}33, 0 2px 6px ${C.gold}22`:'none',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:5}}
              onMouseEnter={e=>{if(!isSel){e.currentTarget.style.background='rgba(176,125,0,.10)';e.currentTarget.style.borderColor=`${C.gold}55`}}}
              onMouseLeave={e=>{if(!isSel){e.currentTarget.style.background='rgba(255,255,255,.03)';e.currentTarget.style.borderColor='rgba(255,255,255,.06)'}}}>
              {isSel&&<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              <span>{b.branch_code}</span>
            </button>)
          })}
        </div>
      </div>
      {/* Active + Billable */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <div style={{padding:'10px 12px',borderRadius:10,background:'rgba(0,0,0,.18)',border:'1px solid var(--bd)'}}>
          <div style={{fontSize:10,color:'var(--tx4)',fontWeight:600,marginBottom:8}}>الحالة <span style={{color:'var(--tx5)'}}>(الافتراضي: {baseActive?'فعّالة':'معطّلة'})</span></div>
          <Toggle on={eff.active} onChange={v=>setDraft({active:v})}
            onLabel="فعّالة" offLabel="معطّلة" onColor={C.ok} offColor={C.red}
            onIcon={<Power size={9} color={C.ok} strokeWidth={3}/>} offIcon={<PowerOff size={9} color={C.red} strokeWidth={3}/>}/>
          {typeof draft.active==='boolean'&&<button type="button" onClick={()=>setDraft({active:undefined})} style={{marginInlineStart:8,fontSize:10,color:'var(--tx5)',background:'transparent',border:'none',cursor:'pointer',fontFamily:F}}>← الافتراضي</button>}
        </div>
        <div style={{padding:'10px 12px',borderRadius:10,background:'rgba(0,0,0,.18)',border:'1px solid var(--bd)'}}>
          <div style={{fontSize:10,color:'var(--tx4)',fontWeight:600,marginBottom:8}}>الفوترة <span style={{color:'var(--tx5)'}}>(الافتراضي: {baseBillable?'مفوترة':'مجانية'})</span></div>
          <Toggle on={eff.billable} onChange={v=>setDraft({billable:v})}
            onLabel="مفوترة" offLabel="مجانية" onColor={C.gold} offColor={C.ok}
            onIcon={<DollarSign size={9} color={C.gold} strokeWidth={3}/>} offIcon={<Gift size={9} color={C.ok} strokeWidth={3}/>}/>
          {typeof draft.billable==='boolean'&&<button type="button" onClick={()=>setDraft({billable:undefined})} style={{marginInlineStart:8,fontSize:10,color:'var(--tx5)',background:'transparent',border:'none',cursor:'pointer',fontFamily:F}}>← الافتراضي</button>}
        </div>
      </div>
      {/* Pricing — full default-card UI, bound to the selected branch override(s) */}
      {canSave?(
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:11,color:C.gold,fontWeight:600,letterSpacing:'.2px',whiteSpace:'nowrap'}}>تخصيص التسعير للمكتب المحدد</span>
            <div style={{flex:1,height:1,background:'rgba(176,125,0,.2)'}}/>
            <span style={{fontSize:9,color:'var(--tx5)',fontWeight:500,whiteSpace:'nowrap'}}>كل قسم يُحفظ بزره المستقل</span>
          </div>
          {(overrideEditor.branchIds||[]).length!==1&&(
            <div style={{fontSize:10.5,color:'#3483b4',background:'rgba(52,131,180,.07)',border:'1px solid rgba(52,131,180,.25)',padding:'7px 11px',borderRadius:8,fontWeight:600,lineHeight:1.6}}>
              عند تحديد عدة مكاتب، تُحرَّر القيم انطلاقًا من الافتراضي وتُطبَّق على كل المكاتب المحددة. القيم المطابقة للافتراضي تبقى موروثة (لا تُخزَّن).
            </div>
          )}
          {renderPriceEditor(svc)}
        </div>
      ):(
        <div style={{fontSize:11,color:'var(--tx5)',textAlign:'center',padding:'14px 0'}}>اختر مكتباً لعرض وتعديل التسعير</div>
      )}
      {/* Footer — نفس أزرار كرت التسعير الافتراضي */}
      {(()=>{
        const ghostBtnStyle=(color,enabled=true)=>({height:32,padding:'0 14px',borderRadius:9,border:`1px dashed ${enabled?color+'80':'var(--bd)'}`,background:'transparent',color:enabled?color:'var(--tx5)',fontFamily:F,fontSize:12,fontWeight:600,cursor:enabled?'pointer':'not-allowed',display:'inline-flex',alignItems:'center',gap:7,boxShadow:'none',transition:'background .15s ease, border-color .15s ease',letterSpacing:'.2px',direction:'rtl'})
        const onHover=(e,color)=>{e.currentTarget.style.background=`${color}1f`}
        const offHover=(e,color)=>{e.currentTarget.style.background='transparent'}
        const singleSelected=(overrideEditor.branchIds||[]).length===1?overrideEditor.branchIds[0]:null
        const hasExisting=singleSelected&&getOverridesForSvc(svc.id).some(o=>o.branchId===singleSelected)
        return(
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,paddingTop:14,borderTop:'1px solid var(--bd)',flexWrap:'wrap'}}>
            <div style={{fontSize:10,color:'var(--tx5)',fontWeight:500}}>الأسعار تُحفظ بزر كل قسم · القيم المطابقة للافتراضي تبقى موروثة</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <button type="button" onClick={()=>closeOverrideEditor()}
                onMouseEnter={e=>onHover(e,'#c0392b')} onMouseLeave={e=>offHover(e,'#c0392b')}
                style={ghostBtnStyle('#c0392b')}>
                <span>إلغاء</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <button type="button" onClick={canSave?onSave:undefined} disabled={!canSave}
                onMouseEnter={e=>{if(canSave)onHover(e,C.gold)}} onMouseLeave={e=>{if(canSave)offHover(e,C.gold)}}
                style={ghostBtnStyle(C.gold,canSave)}>
                <span>حفظ التخصيص</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
const ALL_KAFALA_SECTIONS=['رسوم نقل الكفالة','تجديد الإقامة','كرت العمل','رسوم تغيير المهنة','رسوم المكتب','خصم تصديق الحسبة','المدة المتوقعة في الإقامة','التأمين الطبي','الرسوم الحكومية لتجديد الإقامة','المهلة والغرامات','كرت العمل (رخصة العمل)']
const [collapsed,setCollapsed]=useState(Object.fromEntries(ALL_KAFALA_SECTIONS.map(t=>[t,true])))// key: section title → true means collapsed (all collapsed by default)
const toggleSection=(title)=>setCollapsed(p=>({...p,[title]:!p[title]}))
const [editing,setEditing]=useState({})// key: section title → true means in edit mode
const [editSnapshot,setEditSnapshot]=useState({})// snapshot of priceState taken when entering edit mode, used for cancel
const startEdit=(title)=>{setEditSnapshot(p=>({...p,[title]:{...priceState}}));setEditing(p=>({...p,[title]:true}))}
const cancelEdit=(title)=>{const snap=editSnapshot[title];if(snap)setPriceState(snap);setEditing(p=>({...p,[title]:false}))}
const finishEdit=(title)=>setEditing(p=>({...p,[title]:false}))
// Mirror overrides to localStorage on every change, but only push to the DB
// for genuine user edits. The ref starts `true` so the INITIAL mount run is
// skipped — otherwise this browser's stale localStorage would be written up to
// the DB before hydration pulls the authoritative remote value, clobbering
// changes made on another browser. It is set back to `true` right before the
// post-hydration setState so that write-back is skipped too.
const skipNextOverridesSync=useRef(true)
useEffect(()=>{
  localStorage.setItem(STORAGE_KEY,JSON.stringify(overrides))
  if(skipNextOverridesSync.current){skipNextOverridesSync.current=false;return}
  saveSvcAdminSetting(STORAGE_KEY,overrides).catch(e=>console.warn('[svcAdminSync] save service overrides failed',e))
},[overrides])

// One-shot hydration: pull all svc_admin_* rows on mount, refresh React
// state from the freshly-written localStorage values.
useEffect(()=>{
  let cancelled=false
  hydrateSvcAdminFromDb().then(()=>{
    if(cancelled)return
    skipNextOverridesSync.current=true
    skipNextBranchSync.current=true
    setOverrides(getServiceOverrides())
    setBranchOverridesState(getBranchOverrides())
  }).catch(e=>console.warn('[svcAdminSync] hydrate failed',e))
  return()=>{cancelled=true}
},[])
// Cached occupations list (fetched once on first kafala-transfer open) — used for the free-change multi-select.
const [occupations,setOccupations]=useState([])
useEffect(()=>{
  // تُحمَّل المهن لنقل الكفالة (منتقي مهن النقل) ولتجديد الإقامة (منتقي المهن المعفاة من رسوم تغيير المهنة).
  if(!['kafala_transfer','iqama_renewal'].includes(expanded)||occupations.length)return
  const sb=getSupabase();if(!sb)return
  // Abort flag prevents a stale response from overwriting state if the section
  // is closed/reopened while the previous request is still pending.
  let cancelled=false
  ;(async()=>{
    try{
      const{data:arch}=await sb.from('lookup_items').select('id,lookup_categories!inner(category_key)').eq('code','archived').eq('lookup_categories.category_key','occupation_category').maybeSingle()
      if(cancelled)return
      let q=sb.from('occupations').select('id,name_ar,name_en').eq('is_active',true).order('sort_order',{nullsFirst:false}).order('name_ar').limit(5000)
      if(arch?.id)q=q.neq('category_id',arch.id)
      const{data,error}=await q
      if(cancelled)return
      if(error){console.error('Failed to load occupations',error);toast(T('تعذّر تحميل المهن','Failed to load occupations'));return}
      if(Array.isArray(data))setOccupations(data)
    }catch(e){if(!cancelled){console.error('Failed to load occupations',e);toast(T('تعذّر تحميل المهن','Failed to load occupations'))}}
  })()
  return()=>{cancelled=true}
},[expanded,occupations.length])

const getState=(id)=>{
const svc=ALL_SERVICES.find(s=>s.id===id)
const o=overrides[id]||{}
const billable=typeof o.billable==='boolean'?o.billable:(svc?.defaultBillable!==false)
const active=o.active!==false
return{billable,active}
}
const update=(id,key,val)=>{
setOverrides(p=>({...p,[id]:{...(p[id]||{}),[key]:val}}))
toast(T('تم حفظ الإعدادات','Settings saved'))
}
const openPrice=(id)=>{
if(expanded===id){setExpanded(null);return}
setExpanded(id)
setPriceState(getPricing(id)||{})
// Start with all sections collapsed — user opens only what they need
setCollapsed(Object.fromEntries(ALL_KAFALA_SECTIONS.map(t=>[t,true])))
setEditing({})
}
const savePrice=(id)=>{
// Convert number-like strings back to Number for storage
const normalized={}
Object.entries(priceState).forEach(([k,v])=>{
  if(typeof v==='string'&&v!==''&&/^\d+(\.\d+)?$/.test(v))normalized[k]=Number(v)
  else normalized[k]=v
})
if(priceBranchCtx){saveSectionToBranches(id,normalized);toast(T('تم حفظ التخصيص','Override saved'));return}
setPricing(id,normalized)
setExpanded(null)
toast(T('تم حفظ التسعير','Pricing saved'))
}

const mainSvcs=ALL_SERVICES.filter(s=>s.group==='main')
const otherSvcs=ALL_SERVICES.filter(s=>s.group==='other')

const inpS={width:'100%',height:42,padding:'0 14px',border:'1px solid var(--bd)',borderRadius:10,fontFamily:F,fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',background:'var(--inputBg)',textAlign:'center',boxSizing:'border-box',boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',direction:'ltr',transition:'.18s'}
const lbl={fontSize:12,fontWeight:500,color:'var(--tx3)',paddingInlineStart:2,marginBottom:7,display:'block',textAlign:'right'}

const clampField=(f,val)=>{
  if(val===''||val==null)return ''
  const n=Number(val); if(isNaN(n))return val
  if(f.min!=null&&n<f.min)return String(f.min)
  if(f.max!=null&&n>f.max)return String(f.max)
  return val
}
const renderField=(f,readOnly,big=true)=>{
  const rawVal=priceState[f.k]
  const parts=[]
  if(f.min!=null&&f.min!==0)parts.push(`الأدنى ${f.min}`)
  if(f.max!=null)parts.push(`الأعلى ${f.max}`)
  const hint=parts.length?parts.join(' · '):null
  const roStyle=readOnly?{background:'var(--bd2)',borderColor:'rgba(255,255,255,.04)',color:'var(--tx2)',cursor:'default'}:{}
  // "Giant number" tile (design 5) — centered label + big gold value + unit. Numeric fields only.
  if(big&&f.t!=='date'){
    return(<div key={f.k} style={{position:'relative',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,padding:'16px 6px 11px',borderRadius:11,background:'var(--card-bg)',border:'1px solid var(--bd)',textAlign:'center'}}>
      <span style={{fontSize:10.5,fontWeight:600,color:'var(--tx2)',lineHeight:1.25,maxWidth:'100%'}}>{f.l}</span>
      <input type="text" inputMode="decimal" className="svc-fee-num" disabled={readOnly} readOnly={readOnly} value={rawVal??''}
        onChange={e=>{let v=e.target.value.replace(/[^0-9.]/g,'');const i=v.indexOf('.');if(i!==-1)v=v.slice(0,i+1)+v.slice(i+1).replace(/\./g,'');setPriceState(p=>({...p,[f.k]:v}))}}
        onBlur={e=>{const cl=clampField(f,e.target.value); if(cl!==e.target.value)setPriceState(p=>({...p,[f.k]:cl}))}}
        placeholder={String(f.d)}
        style={{width:'100%',minWidth:0,border:readOnly?'none':`1px solid ${C.gold}66`,borderRadius:8,background:readOnly?'transparent':'var(--inputBg)',color:C.gold,fontFamily:F,fontSize:20,fontWeight:600,textAlign:'center',outline:'none',padding:readOnly?0:'3px 2px',marginTop:1,letterSpacing:'-.5px',fontVariantNumeric:'tabular-nums',direction:'ltr',lineHeight:1,whiteSpace:'nowrap',boxSizing:'border-box'}}/>
      {f.sfx&&<span style={{fontSize:8.5,fontWeight:600,color:'var(--tx5)'}}>{f.sfx}</span>}
    </div>)
  }
  return(<div key={f.k}>
    <label style={lbl}>{f.l}</label>
    <div style={{display:'flex',alignItems:'center',gap:6}}>
      {f.t==='date'
        ? <div style={{flex:1,display:'flex',alignItems:'center'}}>
            <DateInput value={rawVal||''} disabled={readOnly} readOnly={readOnly}
              onChange={v=>setPriceState(p=>({...p,[f.k]:v}))}
              style={{...inpS,...roStyle}}/>
          </div>
        : <input type="text" inputMode="decimal" disabled={readOnly} readOnly={readOnly} value={rawVal??''}
            onChange={e=>{let v=e.target.value.replace(/[^0-9.]/g,'');const i=v.indexOf('.');if(i!==-1)v=v.slice(0,i+1)+v.slice(i+1).replace(/\./g,'');setPriceState(p=>({...p,[f.k]:v}))}}
            onBlur={e=>{const cl=clampField(f,e.target.value); if(cl!==e.target.value)setPriceState(p=>({...p,[f.k]:cl}))}}
            placeholder={String(f.d)} style={{...inpS,flex:1,...roStyle}}/>
      }
      {f.sfx&&!['يوم','شهر'].includes(f.sfx)&&<span style={{fontSize:10,fontWeight:600,color:'var(--tx5)',flexShrink:0,minWidth:50,textAlign:'center'}}>{f.sfx}</span>}
    </div>
    {hint&&!readOnly&&<div style={{fontSize:9,color:'var(--tx5)',marginTop:3,textAlign:'right'}}>{hint}</div>}
  </div>)
}
// عقد أجير — بند «معامل السعودة» المستقل: زر تفعيل/تعطيل + حقلَي الحد ورسم العامل.
// readOnly=true في بطاقة العرض (الزر مجرّد مؤشّر حالة)، و=false داخل نافذة التعديل (زر فعّال).
const SAUD_FIELDS=(PRICING_SCHEMA.ajeer_contract?.fields||[]).filter(f=>f._section==='saud'&&f.t!=='bool')
const renderSaudCard=(readOnly,bare=false)=>{
  const on=priceState.saudizationEnabled!==false
  const outer=bare?{}:{borderRadius:12,background:'rgba(0,0,0,.18)',border:`1px solid ${on?'rgba(176,125,0,.25)':'rgba(255,255,255,.07)'}`,overflow:'hidden'}
  return(
    <div style={outer}>
      <div style={{padding:bare?'0 0 12px':'12px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,borderBottom:'1px solid var(--bd)'}}>
        <div style={{minWidth:0}}>
          <div style={{fontSize:12.5,fontWeight:600,color:on?C.gold:'var(--tx3)'}}>معامل السعودة</div>
          <div style={{fontSize:10,color:'var(--tx5)',fontWeight:600,marginTop:3,lineHeight:1.6}}>رسم إضافي = (الحد − عدد عمال منشأة العامل) بحد أدنى 1 × رسم كل عامل</div>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5,flexShrink:0}}>
          <button type="button" disabled={readOnly} onClick={readOnly?undefined:()=>setPriceState(p=>({...p,saudizationEnabled:!on}))} title={readOnly?'':(on?'اضغط للتعطيل':'اضغط للتفعيل')}
            style={{width:46,height:24,borderRadius:999,border:'none',background:on?C.ok:'rgba(192,57,43,.7)',cursor:readOnly?'default':'pointer',position:'relative',transition:'.2s',padding:0,boxShadow:'0 2px 6px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.12)'}}>
            <span style={{position:'absolute',width:18,height:18,borderRadius:'50%',background:'#fff',top:3,right:on?3:25,transition:'.2s'}}/>
          </button>
          <span style={{fontSize:9.5,fontWeight:600,color:on?C.ok:C.red}}>{on?'مفعّل':'معطّل'}</span>
        </div>
      </div>
      <div style={{padding:bare?'14px 0 0':14,opacity:on?1:.4,pointerEvents:(on&&!readOnly)?'auto':'none',display:'grid',gridTemplateColumns:readOnly?'1fr 1fr':'1fr',gap:12}}>
        {SAUD_FIELDS.map(f=>readOnly?renderField(f,true):renderFeeField(f))}
      </div>
    </div>
  )
}
const resetSection=(fields)=>{
  const next={...priceState}
  fields.forEach(f=>{next[f.k]=String(f.d)})
  setPriceState(next)
  toast(T('تمت استعادة القيم الافتراضية للقسم','Section defaults restored'))
}
// Save only the fields of a specific section (merge into stored config).
// extraKeys allows saving non-field state like the profession-change free list (arrays/objects).
const saveSection=(svcId,fields,label,extraKeys=[])=>{
  const vals={}
  fields.forEach(f=>{
    const v=priceState[f.k]
    if(typeof v==='string'&&v!==''&&/^\d+(\.\d+)?$/.test(v))vals[f.k]=Number(v)
    else if(v!==undefined)vals[f.k]=v
  })
  extraKeys.forEach(k=>{if(priceState[k]!==undefined)vals[k]=priceState[k]})
  if(priceBranchCtx){saveSectionToBranches(svcId,vals);toast(T('تم حفظ التخصيص','Override saved'));return}
  setPricing(svcId,vals)
  toast(isAr?`تم حفظ ${label||'القسم'}`:`Saved ${label||'section'}`)
}
// Save medical brackets only.
const saveMedicalBrackets=(svcId)=>{
  const b=Array.isArray(priceState.medicalBrackets)?priceState.medicalBrackets:[]
  if(priceBranchCtx){saveSectionToBranches(svcId,{medicalBrackets:b});toast(T('تم حفظ التخصيص','Override saved'));return}
  setPricing(svcId,{medicalBrackets:b})
  toast(T('تم حفظ الفئات العمرية','Age brackets saved'))
}
// Keep only values that differ from the global default — sparse override preserves inheritance.
const diffFromDefault=(svcId,vals)=>{
  const def=getPricing(svcId)||{}
  const out={}
  Object.entries(vals||{}).forEach(([k,v])=>{
    if(k.startsWith('__'))return // transient UI state (search queries)
    if(v===''||v===undefined||v===null)return // empty = inherit default
    const dv=def[k]
    const eq=(Array.isArray(v)||Array.isArray(dv))?JSON.stringify(v)===JSON.stringify(dv):String(v)===String(dv??'')
    if(!eq)out[k]=v
  })
  return out
}
// Merge a section's values into each selected branch's pricing override (diffed vs default).
const saveSectionToBranches=(svcId,sectionVals)=>{
  const ids=priceBranchCtx?.branchIds||[]
  if(!ids.length)return
  setBranchOverridesState(p=>{
    const next={...p}
    ids.forEach(bid=>{
      next[bid]={...(next[bid]||{})}
      const cur=next[bid][svcId]||{}
      const pricing=diffFromDefault(svcId,{...(cur.pricing||{}),...sectionVals})
      const merged={...cur}
      if(Object.keys(pricing).length)merged.pricing=pricing; else delete merged.pricing
      Object.keys(merged).forEach(k=>{if(merged[k]===undefined||merged[k]===null)delete merged[k]})
      if(Object.keys(merged).length===0)delete next[bid][svcId]; else next[bid][svcId]=merged
      if(Object.keys(next[bid]||{}).length===0)delete next[bid]
    })
    return next
  })
}
// Shared shell for each pricing section card — "thick gold spine" look (design 2):
// dark gradient body with a thick gold bar on the inline-end edge + asymmetric corners.
const secCardProps=(isCol)=>(isCol
  ? {style:{position:'relative',display:'flex',flexDirection:'column',gap:6,padding:'7px 12px',borderRadius:'7px 12px 12px 7px',background:'var(--bd2)',border:'1px solid var(--bd)',borderInlineEnd:'4px solid rgba(176,125,0,.55)',transition:'.18s'}}
  : {style:{position:'relative',display:'flex',flexDirection:'column',gap:11,padding:'16px 16px 16px 14px',borderRadius:'7px 16px 16px 7px',background:'var(--card-bg)',border:'1px solid var(--bd)',borderInlineEnd:'6px solid #B07D00',boxShadow:'0 8px 22px rgba(0,0,0,.34)',transition:'.18s'}}
)
const SectionHead=({title,badge,isCollapsed,onToggle})=>(
  <div onClick={onToggle} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 8px',marginBottom:2,cursor:'pointer',userSelect:'none'}}>
    <span style={{fontSize:isCollapsed?12:13,fontWeight:600,color:C.gold,display:'inline-flex',alignItems:'center',gap:8,transition:'font-size .15s',letterSpacing:'-.2px'}}>
      <span>{title}</span>
      {badge&&<span style={{fontSize:10,fontWeight:600,color:C.gold,padding:'2px 8px',borderRadius:5,background:'rgba(176,125,0,.10)',border:'1px solid rgba(176,125,0,.25)'}}>{badge}</span>}
    </span>
    {isCollapsed
      ? <ChevronDown size={14} style={{color:C.gold}}/>
      : <ChevronUp size={14} style={{color:C.gold}}/>}
  </div>
)
// Edit button positioned as a "tab" on the top-left border of the section card — sits ON the gold border.
const EditTab=({onClick})=>(
  <button type="button" onClick={onClick} title="تعديل" style={{position:'absolute',top:-11,insetInlineEnd:14,height:22,padding:'0 10px',borderRadius:6,border:`1px dashed ${C.gold}`,background:'#1a1a1a',color:C.gold,fontFamily:F,fontSize:10,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:5,transition:'.15s',zIndex:2}} onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 0 0 2px #1a1a1a'}} onMouseLeave={e=>{e.currentTarget.style.boxShadow='none'}}>
    <Edit3 size={10} strokeWidth={2.4}/>
    <span>تعديل</span>
  </button>
)
// Save + Cancel tabs shown while editing — same position as EditTab so they replace it.
const EditActionTabs=({onSave,onCancel})=>(
  <div style={{position:'absolute',top:-11,insetInlineEnd:14,display:'inline-flex',alignItems:'center',gap:6,zIndex:2}}>
    <button type="button" onClick={onCancel} title="إلغاء" style={{height:22,padding:'0 10px',borderRadius:6,border:'1px solid rgba(255,255,255,.2)',background:'#1a1a1a',color:'rgba(255,255,255,.75)',fontFamily:F,fontSize:10,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:5,transition:'.15s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.4)';e.currentTarget.style.color='#fff';e.currentTarget.style.boxShadow='0 0 0 2px #1a1a1a'}} onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.2)';e.currentTarget.style.color='rgba(255,255,255,.75)';e.currentTarget.style.boxShadow='none'}}>
      <span>إلغاء</span>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    </button>
    <button type="button" onClick={onSave} title="حفظ" style={{height:22,padding:'0 12px',borderRadius:6,border:`1px solid ${C.ok}`,background:'#1a1a1a',color:C.ok,fontFamily:F,fontSize:10,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:5,transition:'.15s'}} onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 0 0 2px #1a1a1a, 0 0 0 3px '+C.ok+'66'}} onMouseLeave={e=>{e.currentTarget.style.boxShadow='none'}}>
      <span>حفظ</span>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    </button>
  </div>
)
const fmtNum=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2})

const renderMedicalBrackets=()=>{
  const brackets=Array.isArray(priceState.medicalBrackets)?priceState.medicalBrackets:[]
  const update=(i,key,val)=>{const next=[...brackets];next[i]={...next[i],[key]:val};setPriceState(p=>({...p,medicalBrackets:next}))}
  const add=()=>setPriceState(p=>({...p,medicalBrackets:[...(p.medicalBrackets||[]),{min:0,max:10,rate:0}]}))
  const remove=(i)=>{const next=brackets.filter((_,idx)=>idx!==i);setPriceState(p=>({...p,medicalBrackets:next}))}
  return<div style={{display:'flex',flexDirection:'column',gap:6}}>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:6,fontSize:10,fontWeight:600,color:'var(--tx4)',padding:'0 4px'}}>
      <div style={{textAlign:'center'}}>من عمر</div>
      <div style={{textAlign:'center'}}>إلى عمر</div>
      <div style={{textAlign:'center'}}>السعر (ريال)</div>
      <div style={{width:28}}/>
    </div>
    {brackets.map((b,i)=>(<div key={i} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:6,alignItems:'center'}}>
      <input type="text" inputMode="numeric" value={b.min??''} onChange={e=>update(i,'min',e.target.value===''?'':Number(e.target.value.replace(/[^0-9]/g,'')))} placeholder="20" style={{...inpS,height:34}}/>
      <input type="text" inputMode="numeric" value={b.max??''} onChange={e=>update(i,'max',e.target.value===''?'':Number(e.target.value.replace(/[^0-9]/g,'')))} placeholder="30" style={{...inpS,height:34}}/>
      <input type="text" inputMode="decimal" value={b.rate??''} onChange={e=>update(i,'rate',e.target.value===''?'':Number(e.target.value.replace(/[^0-9.]/g,'')))} placeholder="400" style={{...inpS,height:34}}/>
      <button type="button" onClick={()=>remove(i)} style={{width:28,height:28,borderRadius:7,border:'1px solid rgba(192,57,43,.2)',background:'rgba(192,57,43,.06)',color:C.red,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,flexShrink:0}} title="حذف الفئة">×</button>
    </div>))}
    <button type="button" onClick={add} style={{height:32,marginTop:4,borderRadius:8,border:'1px dashed rgba(176,125,0,.3)',background:'transparent',color:C.gold,fontFamily:F,fontSize:11,fontWeight:600,cursor:'pointer'}}>+ إضافة فئة عمرية</button>
  </div>
}

const renderPriceEditor=(s,opts={})=>{
const sch=PRICING_SCHEMA[s.id]
if(!sch)return<div style={{padding:'12px 14px',background:'var(--bd2)',borderRadius:8,fontSize:11,color:'var(--tx5)',textAlign:'center'}}>لا يوجد تسعير ثابت لهذه الخدمة — يُحسب ديناميكياً</div>
const isKafala=s.id==='kafala_transfer'
// `editable` gates the editable inputs. opts.readOnly forces the pure view (the card);
// the modal opens the editable copy. opts.inModal hides the inline save bar (the modal footer owns it).
const editable=opts.readOnly?false:isPriceEditable
// Per-card edit gate: when the caller passes opts.canEdit===false (the live default_pricing card),
// the inline per-section pencils are hidden. Other contexts (modal/override) default to allowed.
const cardEditAllowed=opts.canEdit!==false
const secHead={fontSize:11,fontWeight:600,color:C.gold,padding:'4px 8px',borderRight:`2px solid ${C.gold}55`,marginBottom:2}
const secNote={fontSize:10,color:'var(--tx3)',marginBottom:6,paddingRight:12}
return<div className="svc-admin-pricing" style={{display:'flex',flexDirection:'column',gap:22}}>
<style>{`.svc-admin-pricing input:focus, .svc-admin-pricing input:not(:placeholder-shown):not([type=checkbox]):not([type=radio]) { border-color: var(--bd)!important } .svc-admin-pricing input.svc-fee-num { font-size:20px!important } .svc-admin-pricing input.svc-fee-num:disabled:not([type=checkbox]):not([type=radio]), .svc-admin-pricing input.svc-fee-num:read-only:not([type=checkbox]):not([type=radio]) { border-color:transparent!important } .svc-occ-search-ico{color:var(--tx4);transition:.2s} .svc-occ-search:focus-within .svc-occ-search-ico{color:#B07D00} .svc-admin-pricing .svc-occ-search:focus-within input:not([type=checkbox]):not([type=radio]){border-color:rgba(176,125,0,.6)!important} .svc-occ-list{scrollbar-width:none;-ms-overflow-style:none} .svc-occ-list::-webkit-scrollbar{display:none;width:0;height:0}`}</style>
{sch.note&&!isKafala&&!sch.fields.some(f=>f._footer)&&<div style={{fontSize:10,color:'var(--tx3)',background:'var(--bd2)',border:'1px solid var(--bd)',padding:'6px 10px',borderRadius:6,fontWeight:600}}>ℹ {sch.note}</div>}
{isKafala
  ? <>
      {KAFALA_SECTIONS.map(sec=>{
        // Dynamic notes + live examples per section — read current form values from priceState.
        let dynNote=sec.note
        let example=null
        if(sec.title==='تجديد الإقامة'){
          dynNote='لكل حالة إعداداتها الخاصة لحساب رسوم التجديد:'
          example=null
        }else if(sec.title==='رسوم نقل الكفالة'){
          const f1=Number(priceState.transferFee1)||2000
          const f2=Number(priceState.transferFee2)||4000
          const f3=Number(priceState.transferFee3)||6000
          example=`0 نقل سابق ← ${fmtNum(f1)}  ·  1 نقل سابق ← ${fmtNum(f2)}  ·  2+ نقل سابق ← ${fmtNum(f3)} ريال`
        }else if(sec.title==='كرت العمل'){
          dynNote='لكل حالة إعداداتها الخاصة حسب موقع فترة التجديد من تاريخ التفعيل اليومي:'
          example=null
        }else if(sec.title==='رسوم تغيير المهنة'){
          const pc=Number(priceState.profChange)||1000
          example=`مثال: تغيير مهنة مرة واحدة = ${fmtNum(pc)} ريال`
        }else if(sec.title==='رسوم المكتب'){
          const daily=Number(priceState.officeDailyRate)||18.06
          const base=Number(priceState.officeFee)||6500
          example=`مثال: السعر عند رفع الطلب = ${fmtNum(base)} ريال · الحد الأدنى للخصم (365 يوم × ${daily}) = ${fmtNum(365*daily)} ريال`
        }
        const isCol=!!collapsed[sec.title]
        const isEdit=!!editing[sec.title]
        return(<div key={sec.title} {...secCardProps(isCol)}>
          {cardEditAllowed&&!isCol&&!isEdit&&<EditTab onClick={()=>startEdit(sec.title)}/>}
          {!isCol&&isEdit&&<EditActionTabs onSave={()=>{const extras=sec.title==='رسوم تغيير المهنة'?['profChangeFreeOccupations']:sec.title==='رسوم نقل الكفالة'?['transferBumpOccupations']:sec.title==='رسوم المكتب'?['kafalaOfficeFeeMode']:[];saveSection(s.id,sec.fields,sec.title,extras);finishEdit(sec.title)}} onCancel={()=>cancelEdit(sec.title)}/>}
          <SectionHead title={sec.title} isEditing={isEdit} isCollapsed={isCol} onToggle={()=>toggleSection(sec.title)}/>
          {!isCol&&<>
            {dynNote&&<div style={secNote}>{dynNote}</div>}
            {example&&<div style={{fontSize:10,color:'#3483b4',background:'rgba(52,131,180,.07)',border:'1px solid rgba(52,131,180,.25)',padding:'5px 10px',borderRadius:6,fontWeight:600,marginBottom:4}}>{example}</div>}
            {sec.title==='رسوم نقل الكفالة'
              ? (() => {
                  const bumpIds=Array.isArray(priceState.transferBumpOccupations)?priceState.transferBumpOccupations:[]
                  const bumpSet=new Set(bumpIds)
                  const bumpItems=occupations.filter(o=>bumpSet.has(o.id))
                  return(<div style={{display:'flex',flexDirection:'column',gap:10}}>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                      {sec.fields.map(f=>{
                        const rawVal=priceState[f.k]
                        return(<div key={f.k} style={{position:'relative',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,padding:'18px 6px 11px',borderRadius:11,background:'var(--card-bg)',border:'1px solid var(--bd)',textAlign:'center'}}>
                          <span style={{position:'absolute',top:7,insetInlineStart:7,minWidth:18,height:18,padding:'0 4px',borderRadius:9,background:C.gold,color:'#1a1400',fontFamily:F,fontSize:8.5,fontWeight:600,display:'inline-flex',alignItems:'center',justifyContent:'center',direction:'ltr'}}>{f.badge}</span>
                          <span style={{fontSize:10.5,fontWeight:600,color:'var(--tx2)',lineHeight:1.25,maxWidth:'100%'}}>{f.l}</span>
                          <input type="text" inputMode="decimal" className="svc-fee-num" disabled={!isEdit} readOnly={!isEdit}
                            value={rawVal??''}
                            onChange={e=>{let v=e.target.value.replace(/[^0-9.]/g,'');const i=v.indexOf('.');if(i!==-1)v=v.slice(0,i+1)+v.slice(i+1).replace(/\./g,'');setPriceState(p=>({...p,[f.k]:v}))}}
                            placeholder={String(f.d)}
                            style={{width:'100%',minWidth:0,border:isEdit?`1px solid ${C.gold}66`:'none',borderRadius:8,background:isEdit?'var(--inputBg)':'transparent',color:C.gold,fontFamily:F,fontSize:20,fontWeight:600,textAlign:'center',outline:'none',padding:isEdit?'3px 2px':0,marginTop:1,letterSpacing:'-.5px',fontVariantNumeric:'tabular-nums',direction:'ltr',lineHeight:1,whiteSpace:'nowrap',boxSizing:'border-box'}}/>
                          <span style={{fontSize:8.5,fontWeight:600,color:'var(--tx5)'}}>{f.sfx}</span>
                        </div>)
                      })}
                    </div>
                    {/* Transfer-bump occupations — sponsorChanges + 1 when worker's occupation is in this list */}
                    <div style={{display:'flex',flexDirection:'column',gap:6,padding:'10px 12px',borderRadius:9,background:'rgba(52,131,180,.04)',border:'1px dashed rgba(52,131,180,.35)'}}>
                      <div style={{fontSize:11,fontWeight:600,color:'#3483b4',display:'flex',alignItems:'center',gap:6}}>
                        <ArrowLeftRight size={13} strokeWidth={2.4}/>
                        <span>مهن بزيادة نقل تلقائية (+1)</span>
                      </div>
                      <div style={{fontSize:10.5,color:'var(--tx3)',lineHeight:1.7}}>إذا كانت مهنة العامل ضمن هذه القائمة ← يُرفع عدد مرات النقل بدرجة واحدة تلقائيًا (مثلاً 0 ← 1، و 1 ← 2). تُستخدم للعمالة المنزلية.</div>
                      {isEdit&&(()=>{
                        const q=priceState.__bumpQuery||''
                        const setQ=v=>setPriceState(p=>({...p,__bumpQuery:v}))
                        const filtered=occupations.filter(o=>!bumpSet.has(o.id)&&(q?((o.name_ar||'').includes(q)||(o.name_en||'').toLowerCase().includes(q.toLowerCase())):true))
                        return(<div style={{display:'flex',flexDirection:'column',gap:6,marginTop:4}}>
                          <div className="svc-occ-search" style={{position:'relative'}}>
                            <Search size={15} strokeWidth={2.2} className="svc-occ-search-ico" style={{position:'absolute',top:'50%',left:14,transform:'translateY(-50%)',pointerEvents:'none'}}/>
                            <input type="text" value={q} onChange={e=>setQ(e.target.value)} placeholder={`ابحث بالاسم (${occupations.length} مهنة متاحة)…`} style={{...inpS,height:38,textAlign:'right',direction:'rtl',paddingLeft:40,paddingRight:14,background:'var(--inputBg)'}}/>
                          </div>
                          <div className="svc-occ-list" style={{maxHeight:220,overflowY:'auto',border:'1px solid var(--bd)',borderRadius:7,background:'rgba(0,0,0,.25)'}}>
                            {filtered.length>0?filtered.slice(0,300).map(o=>(
                              <div key={o.id} onClick={()=>setPriceState(p=>({...p,transferBumpOccupations:[...bumpIds,o.id]}))} style={{padding:'7px 10px',cursor:'pointer',fontSize:11.5,fontWeight:600,color:'var(--tx)',borderBottom:'1px solid var(--bd2)',display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}} onMouseEnter={e=>{e.currentTarget.style.background='rgba(52,131,180,.08)'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
                                <span>{o.name_ar}</span>
                                {o.name_en&&<span style={{fontSize:10,color:'var(--tx5)',unicodeBidi:'plaintext'}}>{o.name_en}</span>}
                              </div>
                            )):<div style={{fontSize:10.5,color:'var(--tx5)',padding:'14px',textAlign:'center'}}>{occupations.length===0?'جاري تحميل المهن…':q?'لا توجد نتائج':'كل المهن مضافة'}</div>}
                            {filtered.length>300&&<div style={{fontSize:10,color:'var(--tx5)',padding:'6px 10px',textAlign:'center',background:'rgba(0,0,0,.2)'}}>… و {filtered.length-300} مهنة أخرى · ضيّق البحث</div>}
                          </div>
                        </div>)
                      })()}
                      {bumpItems.length>0?(<div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:4}}>
                        {bumpItems.map(o=>(
                          <span key={o.id} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'3px 8px 3px 5px',borderRadius:999,background:'rgba(52,131,180,.12)',border:'1px solid rgba(52,131,180,.45)',fontSize:11,fontWeight:600,color:'#3483b4'}}>
                            {isEdit&&<button type="button" onClick={()=>setPriceState(p=>({...p,transferBumpOccupations:bumpIds.filter(id=>id!==o.id)}))} style={{width:14,height:14,borderRadius:'50%',border:'none',background:'rgba(52,131,180,.2)',color:'#3483b4',cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',padding:0,lineHeight:0}} title="إزالة">
                              <X size={9} strokeWidth={3}/>
                            </button>}
                            <span>{o.name_ar}</span>
                          </span>
                        ))}
                      </div>):(<div style={{fontSize:10.5,color:'var(--tx5)',padding:'4px 0',textAlign:'center'}}>لا توجد مهن مضافة — {isEdit?'ابحث بالأعلى لإضافة':'ادخل وضع التعديل لإضافة'}</div>)}
                    </div>
                  </div>)
                })()
              : sec.title==='تجديد الإقامة'
              ? (() => {
                  const rate=Number(priceState.iqamaPerMonth)||54.2
                  const grace=Number(priceState.iqamaGraceDays)||7
                  const fine1=Number(priceState.iqamaFine1)||500
                  const fine2=Number(priceState.iqamaFine2)||1000
                  const fRate=sec.fields.find(f=>f.k==='iqamaPerMonth')
                  const fGrace=sec.fields.find(f=>f.k==='iqamaGraceDays')
                  const fFine1=sec.fields.find(f=>f.k==='iqamaFine1')
                  const fFine2=sec.fields.find(f=>f.k==='iqamaFine2')
                  const fTransferMin=sec.fields.find(f=>f.k==='transferOnlyMinDays')
                  const transferMin=Number(priceState.transferOnlyMinDays)||30
                  const caseBox=(num,heading,formula,example,fields)=>(
                    <div style={{display:'flex',flexDirection:'column',gap:6,padding:'10px 12px',borderRadius:9,background:'var(--bd2)',border:'1px solid var(--bd)'}}>
                      <div style={{fontSize:11.5,fontWeight:600,color:C.gold,display:'flex',alignItems:'center',gap:8}}>
                        <span style={{width:20,height:20,borderRadius:'50%',background:'rgba(176,125,0,.18)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:10.5,fontWeight:600}}>{num}</span>
                        <span>{heading}</span>
                      </div>
                      <div style={{fontSize:10.5,color:'var(--tx3)',lineHeight:1.7,paddingRight:28}}>{formula}</div>
                      <div style={{fontSize:10.5,color:'#3483b4',background:'rgba(52,131,180,.07)',border:'1px solid rgba(52,131,180,.25)',padding:'6px 10px',borderRadius:6,fontWeight:600}}>{example}</div>
                      <div style={{display:'grid',gridTemplateColumns:fields.length>=2?'1fr 1fr':'1fr',gap:8,marginTop:4,paddingTop:6,borderTop:'1px dashed var(--bd)'}}>
                        {fields.map(f=>renderField(f,!isEdit,true))}
                      </div>
                    </div>
                  )
                  return(<div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {/* Shared threshold — affects all 3 cases */}
                    <div style={{display:'flex',flexDirection:'column',gap:6,padding:'10px 12px',borderRadius:9,background:'rgba(176,125,0,.04)',border:`1px dashed ${C.gold}55`}}>
                      <div style={{fontSize:11,fontWeight:600,color:C.gold,display:'flex',alignItems:'center',gap:6}}>
                        <span style={{fontSize:13}}>⚙</span>
                        <span>إعدادات مشتركة</span>
                      </div>
                      <div style={{fontSize:10.5,color:'var(--tx3)',lineHeight:1.7}}>
                        <b>أيام المهلة قبل الغرامة</b>: يفصل الحالة 1 (بدون غرامة) عن الحالتين 2 و 3.
                        <br/><b>الحد الأدنى للمتبقي لإتاحة «نقل فقط»</b>: إذا كان المتبقي في الإقامة أقل من <b>{transferMin} يوم</b> أو منتهية ← يُخفى زر «نقل فقط» ويُفرض اختيار فترة تجديد.
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:2}}>
                        {renderField(fGrace,!isEdit,true)}
                        {renderField(fTransferMin,!isEdit,true)}
                      </div>
                    </div>
                    {caseBox(1,'إقامة سارية — بعيدة عن الانتهاء',
                      `المتبقي أكبر من ${grace} يوم ← بدون غرامة. المجموع = عدد الأشهر المختارة × ${rate} ريال/شهر.`,
                      `مثال: 12 شهر × ${rate} = ${fmtNum(12*rate)} ريال`,
                      [fRate])}
                    {caseBox(2,'مهلة الغرامة / منتهية حديثًا — المرة الأولى',
                      `عندما يتبقى ≤ ${grace} يوم من الانتهاء أو الإقامة منتهية: المدة الكاملة بالتقويم (من تاريخ الانتهاء حتى نهاية التجديد) × ${rate} + غرامة ${fine1} ريال. أي جزء من شهر يُقرَّب لشهر كامل.`,
                      `مثال: متأخر 2 شهر و 13 يوم + تجديد 12 شهر ← المدة 14 شهر و 13 يوم ← تُحتسب 15 شهر: (15 × ${rate}) + ${fine1} = ${fmtNum(15*rate+fine1)} ريال`,
                      [fFine1])}
                    {caseBox(3,'مخالفة مكررة — المرة الثانية',
                      `نفس معادلة الحالة 2 مع غرامة أعلى: المدة الكاملة (مُقرَّبة لأعلى) × ${rate} + ${fine2} ريال.`,
                      `مثال: 14 شهر و 13 يوم ← تُحتسب 15 شهر: (15 × ${rate}) + ${fine2} = ${fmtNum(15*rate+fine2)} ريال`,
                      [fFine2])}
                  </div>)
                })()
              : sec.title==='كرت العمل'
              ? (() => {
                  const w3=Number(priceState.workPermit3M)||25
                  const w6=Number(priceState.workPermit6M)||50
                  const w9=Number(priceState.workPermit9M)||75
                  const w12=Number(priceState.workPermit12M)||100
                  const daily=Number(priceState.workPermitDailyAfter)||22
                  const cutoff=String(priceState.workPermitCutoffDate||'2027-02-20')
                  const proc=Number(priceState.workPermitProcDays)||7
                  const expThr=Number(priceState.workPermitExpiredThreshold)||30
                  const expProc=Number(priceState.workPermitExpiredProcDays)||7
                  const fW3=sec.fields.find(f=>f.k==='workPermit3M')
                  const fW6=sec.fields.find(f=>f.k==='workPermit6M')
                  const fW9=sec.fields.find(f=>f.k==='workPermit9M')
                  const fW12=sec.fields.find(f=>f.k==='workPermit12M')
                  const fDaily=sec.fields.find(f=>f.k==='workPermitDailyAfter')
                  const fCutoff=sec.fields.find(f=>f.k==='workPermitCutoffDate')
                  const fProc=sec.fields.find(f=>f.k==='workPermitProcDays')
                  const fExpThr=sec.fields.find(f=>f.k==='workPermitExpiredThreshold')
                  const fExpProc=sec.fields.find(f=>f.k==='workPermitExpiredProcDays')
                  const caseBox=(num,heading,formula,example,fields,fieldCols)=>(
                    <div style={{display:'flex',flexDirection:'column',gap:6,padding:'10px 12px',borderRadius:9,background:'var(--bd2)',border:'1px solid var(--bd)'}}>
                      <div style={{fontSize:11.5,fontWeight:600,color:C.gold,display:'flex',alignItems:'center',gap:8}}>
                        <span style={{width:20,height:20,borderRadius:'50%',background:'rgba(176,125,0,.18)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:10.5,fontWeight:600}}>{num}</span>
                        <span>{heading}</span>
                      </div>
                      <div style={{fontSize:10.5,color:'var(--tx3)',lineHeight:1.7,paddingRight:28}}>{formula}</div>
                      <div style={{fontSize:10.5,color:'#3483b4',background:'rgba(52,131,180,.07)',border:'1px solid rgba(52,131,180,.25)',padding:'6px 10px',borderRadius:6,fontWeight:600}}>{example}</div>
                      {fields&&fields.length>0&&<div style={{display:'grid',gridTemplateColumns:fieldCols||(fields.length>=2?'1fr 1fr':'1fr'),gap:8,marginTop:4,paddingTop:6,borderTop:'1px dashed var(--bd)'}}>
                        {fields.map(f=>renderField(f,!isEdit))}
                      </div>}
                    </div>
                  )
                  return(<div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {/* Shared settings — affect all cases */}
                    <div style={{display:'flex',flexDirection:'column',gap:6,padding:'10px 12px',borderRadius:9,background:'rgba(176,125,0,.04)',border:`1px dashed ${C.gold}55`}}>
                      <div style={{fontSize:11,fontWeight:600,color:C.gold,display:'flex',alignItems:'center',gap:6}}>
                        <span style={{fontSize:13}}>⚙</span>
                        <span>إعدادات مشتركة — تؤثر على الحالات الثلاث</span>
                      </div>
                      <div style={{fontSize:10.5,color:'var(--tx3)',lineHeight:1.7}}>
                        <b>تاريخ التفعيل اليومي</b>: يفصل بين التسعير الثابت (قبله) والتسعير اليومي (بعده).
                        <br/><b>بداية فترة كرت العمل</b>:
                        <ul style={{margin:'4px 0 0',paddingInlineStart:16,listStyleType:'disc'}}>
                          <li>إذا الإقامة <b>سارية</b> ← من <b>تاريخ انتهاء الإقامة</b> مباشرة (بدون أيام معالجة).</li>
                          <li>إذا منتهية لكن التأخير ≤ <b>{expThr} يوم</b> ← من <b>اليوم + {proc} يوم</b> (أيام معالجة الطلب).</li>
                          <li>إذا التأخير تجاوز الحد ← اطّلع على «الحالة الخاصة» أدناه.</li>
                        </ul>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:2}}>
                        {renderField(fCutoff,!isEdit)}
                        {renderField(fProc,!isEdit)}
                      </div>
                    </div>
                    {/* Special case — iqama expired for a long time */}
                    <div style={{display:'flex',flexDirection:'column',gap:6,padding:'10px 12px',borderRadius:9,background:'rgba(192,57,43,.04)',border:'1px dashed rgba(192,57,43,.35)'}}>
                      <div style={{fontSize:11,fontWeight:600,color:C.red,display:'flex',alignItems:'center',gap:6}}>
                        <span style={{fontSize:13}}>⚠</span>
                        <span>حالة خاصة — إقامة منتهية من مدة</span>
                      </div>
                      <div style={{fontSize:10.5,color:'var(--tx3)',lineHeight:1.7}}>
                        إذا تجاوز عدد أيام انتهاء الإقامة <b>{expThr} يوم</b> ← بداية فترة كرت العمل = <b>اليوم + {expProc} يوم</b> (بدون النظر لتاريخ انتهاء الإقامة).
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:2}}>
                        {renderField(fExpThr,!isEdit)}
                        {renderField(fExpProc,!isEdit)}
                      </div>
                    </div>
                    {caseBox(1,'كامل الفترة قبل تاريخ التفعيل — سعر ثابت',
                      `إذا كانت فترة التجديد (3/6/9/12 شهر) تنتهي قبل ${cutoff} ← يُستخدم السعر الثابت من الجدول.`,
                      `مثال: تجديد 12 شهر ينتهي قبل ${cutoff} ← ${fmtNum(w12)} ريال`,
                      [fW3,fW6,fW9,fW12],'1fr 1fr')}
                    {caseBox(2,'كامل الفترة بعد تاريخ التفعيل — تسعير يومي',
                      `إذا كانت فترة التجديد تبدأ بعد ${cutoff} ← عدد أيام الفترة × ${daily} ريال/يوم.`,
                      `مثال: تجديد 12 شهر (≈365 يوم) × ${daily} = ${fmtNum(365*daily)} ريال`,
                      [fDaily])}
                    {caseBox(3,'فترة مختلطة — تمر على تاريخ التفعيل',
                      `إذا بدأت قبل ${cutoff} وانتهت بعده: السعر الثابت + (عدد الأيام بعد ${cutoff} × ${daily} ريال/يوم).`,
                      `مثال: تجديد 12 شهر يبدأ قبل التاريخ بشهرين، 10 أشهر بعده (≈300 يوم) ← ${fmtNum(w12)} + (300 × ${daily}) = ${fmtNum(w12 + 300*daily)} ريال`,
                      [])}
                  </div>)
                })()
              : sec.title==='رسوم تغيير المهنة'
              ? (() => {
                  const selectedIds=Array.isArray(priceState.profChangeFreeOccupations)?priceState.profChangeFreeOccupations:[]
                  const selectedSet=new Set(selectedIds)
                  const selectedItems=occupations.filter(o=>selectedSet.has(o.id))
                  return(<div style={{display:'flex',flexDirection:'column',gap:10}}>
                    <div>{renderField(sec.fields[0],!isEdit)}</div>
                    <div style={{display:'flex',flexDirection:'column',gap:6,padding:'10px 12px',borderRadius:9,background:'rgba(39,160,70,.04)',border:`1px dashed ${C.ok}55`}}>
                      <div style={{fontSize:11,fontWeight:600,color:C.ok,display:'flex',alignItems:'center',gap:6}}>
                        <Gift size={13} strokeWidth={2.4}/>
                        <span>مهن معفاة من رسوم التغيير</span>
                      </div>
                      <div style={{fontSize:10.5,color:'var(--tx3)',lineHeight:1.7}}>إذا كانت المهنة الحالية للعامل أو المهنة الجديدة ضمن هذه القائمة ← تصير رسوم تغيير المهنة <b>مجانية (0 ريال)</b>.</div>
                      {isEdit&&(()=>{
                        const q=priceState.__profChangeFreeQuery||''
                        const setQ=v=>setPriceState(p=>({...p,__profChangeFreeQuery:v}))
                        const filtered=occupations.filter(o=>!selectedSet.has(o.id)&&(q?((o.name_ar||'').includes(q)||(o.name_en||'').toLowerCase().includes(q.toLowerCase())):true))
                        return(<div style={{display:'flex',flexDirection:'column',gap:6,marginTop:4}}>
                          <div className="svc-occ-search" style={{position:'relative'}}>
                            <Search size={15} strokeWidth={2.2} className="svc-occ-search-ico" style={{position:'absolute',top:'50%',left:14,transform:'translateY(-50%)',pointerEvents:'none'}}/>
                            <input type="text" value={q} onChange={e=>setQ(e.target.value)} placeholder={`ابحث بالاسم (${occupations.length} مهنة متاحة)…`} style={{...inpS,height:38,textAlign:'right',direction:'rtl',paddingLeft:40,paddingRight:14,background:'var(--inputBg)'}}/>
                          </div>
                          <div className="svc-occ-list" style={{maxHeight:220,overflowY:'auto',border:'1px solid var(--bd)',borderRadius:7,background:'rgba(0,0,0,.25)'}}>
                            {filtered.length>0?filtered.slice(0,300).map(o=>(
                              <div key={o.id} onClick={()=>setPriceState(p=>({...p,profChangeFreeOccupations:[...selectedIds,o.id]}))} style={{padding:'7px 10px',cursor:'pointer',fontSize:11.5,fontWeight:600,color:'var(--tx)',borderBottom:'1px solid var(--bd2)',display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}} onMouseEnter={e=>{e.currentTarget.style.background='rgba(39,160,70,.08)'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
                                <span>{o.name_ar}</span>
                                {o.name_en&&<span style={{fontSize:10,color:'var(--tx5)',unicodeBidi:'plaintext'}}>{o.name_en}</span>}
                              </div>
                            )):<div style={{fontSize:10.5,color:'var(--tx5)',padding:'14px',textAlign:'center'}}>{occupations.length===0?'جاري تحميل المهن…':q?'لا توجد نتائج':'كل المهن مضافة'}</div>}
                            {filtered.length>300&&<div style={{fontSize:10,color:'var(--tx5)',padding:'6px 10px',textAlign:'center',background:'rgba(0,0,0,.2)'}}>… و {filtered.length-300} مهنة أخرى · ضيّق البحث</div>}
                          </div>
                        </div>)
                      })()}
                      {selectedItems.length>0?(<div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:4}}>
                        {selectedItems.map(o=>(
                          <span key={o.id} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'3px 8px 3px 5px',borderRadius:999,background:'rgba(39,160,70,.12)',border:`1px solid ${C.ok}55`,fontSize:11,fontWeight:600,color:C.ok}}>
                            {isEdit&&<button type="button" onClick={()=>setPriceState(p=>({...p,profChangeFreeOccupations:selectedIds.filter(id=>id!==o.id)}))} style={{width:14,height:14,borderRadius:'50%',border:'none',background:'rgba(39,160,70,.2)',color:C.ok,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',padding:0,lineHeight:0}} title="إزالة">
                              <X size={9} strokeWidth={3}/>
                            </button>}
                            <span>{o.name_ar}</span>
                          </span>
                        ))}
                      </div>):(<div style={{fontSize:10.5,color:'var(--tx5)',padding:'4px 0',textAlign:'center'}}>لا توجد مهن معفاة — {isEdit?'ابحث بالأعلى لإضافة':'ادخل وضع التعديل لإضافة مهن'}</div>)}
                    </div>
                  </div>)
                })()
              : sec.title==='رسوم المكتب'
              ? (() => {
                  // طريقة حساب رسوم المكتب فقط — سياسة الخصم وأرضية الخصم انتقلتا إلى قسم «خصم تصديق الحسبة» المستقل.
                  // «سعر ثابت» ← يُستخدم «السعر العام» كما هو. «يومي» ← سعر اليوم × أيام التجديد.
                  const daily=priceState.kafalaOfficeFeeMode==='daily'
                  const subHead=(t)=>(<div style={{fontSize:11,fontWeight:600,color:C.gold,padding:'2px 8px',borderRight:`2px solid ${C.gold}55`}}>{t}</div>)
                  const modeBtn=(active,onClick,label,sub)=>(
                    <button type="button" disabled={!isEdit} onClick={isEdit?onClick:undefined} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'10px 8px',borderRadius:10,border:`1px solid ${active?C.gold:'var(--bd)'}`,background:active?'rgba(176,125,0,.12)':'var(--bd2)',color:active?C.gold:'var(--tx3)',cursor:isEdit?'pointer':'default',fontFamily:F,transition:'.15s'}}>
                      <span style={{fontSize:12,fontWeight:600}}>{label}</span><span style={{fontSize:9,fontWeight:600,opacity:.8}}>{sub}</span>
                    </button>
                  )
                  return(<div style={{display:'flex',flexDirection:'column',gap:12}}>
                    {subHead('طريقة الحساب')}
                    <div style={{display:'flex',gap:8}}>
                      {modeBtn(!daily,()=>setPriceState(p=>({...p,kafalaOfficeFeeMode:'flat'})),'سعر ثابت','نفس المبلغ')}
                      {modeBtn(daily,()=>setPriceState(p=>({...p,kafalaOfficeFeeMode:'daily'})),'يومي','سعر اليوم × الأيام')}
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                      {sec.fields.map(f=>renderField(f,!isEdit))}
                    </div>
                  </div>)
                })()
              : <div style={{display:'grid',gridTemplateColumns:sec.fields.length>=2?'1fr 1fr':'1fr',gap:10}}>
                  {sec.fields.map(f=>renderField(f,!isEdit))}
                </div>
            }
          </>}
        </div>)
      })}
      {/* خصم تصديق الحسبة — قسم مستقل: تفعيل خصم المكتب + أرضية الخصم الافتراضية (تُملأ في نافذة التصديق وتُفرض على كل مُصدِّق). */}
      {(() => {
        const title='خصم تصديق الحسبة'
        const isCol=!!collapsed[title]
        const isEdit=!!editing[title]
        const discOn=priceState.kafalaOfficeDiscountEnabled!==false
        const fMode=priceState.kafalaFloorMode||'daily'
        const subHead=(t)=>(<div style={{fontSize:11,fontWeight:600,color:C.gold,padding:'2px 8px',borderRight:`2px solid ${C.gold}55`}}>{t}</div>)
        const floorBtn=(m,label)=>(
          <button key={m} type="button" disabled={!isEdit} onClick={isEdit?()=>setPriceState(p=>({...p,kafalaFloorMode:m})):undefined} style={{flex:1,height:34,borderRadius:8,border:`1px solid ${fMode===m?C.gold:'var(--bd)'}`,background:fMode===m?'rgba(176,125,0,.12)':'var(--bd2)',color:fMode===m?C.gold:'var(--tx3)',fontFamily:F,fontSize:11.5,fontWeight:600,cursor:isEdit?'pointer':'default'}}>{label}</button>
        )
        return(
          <div {...secCardProps(isCol)}>
            {cardEditAllowed&&!isCol&&!isEdit&&<EditTab onClick={()=>startEdit(title)}/>}
            {!isCol&&isEdit&&<EditActionTabs onSave={()=>{saveSection(s.id,[{k:'kafalaFloorFixed',d:0}],title,['kafalaOfficeDiscountEnabled','kafalaFloorMode']);finishEdit(title)}} onCancel={()=>cancelEdit(title)}/>}
            <SectionHead title={title} isCollapsed={isCol} onToggle={()=>toggleSection(title)}/>
            {!isCol&&<div style={{padding:'2px 4px 4px',display:'flex',flexDirection:'column',gap:12}}>
              <div style={secNote}>خصم رسوم المكتب الذي يُطبَّق عند تصديق الحسبة، والحدّ الأدنى (الأرضية) الذي لا ينزل تحته.</div>
              {/* تفعيل الخصم */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:'10px 12px',borderRadius:10,background:discOn?'rgba(39,160,70,.05)':'rgba(192,57,43,.05)',border:`1px solid ${discOn?C.ok+'44':C.red+'44'}`}}>
                <div style={{display:'flex',flexDirection:'column',gap:2,minWidth:0}}>
                  <span style={{fontSize:11.5,fontWeight:600,color:'var(--tx2)'}}>السماح بخصم المكتب عند التصديق</span>
                  <span style={{fontSize:10,color:'var(--tx4)',fontWeight:600,lineHeight:1.7}}>عند التعطيل لا يظهر حقل الخصم في نافذة تصديق نقل الكفالة.</span>
                </div>
                <button type="button" disabled={!isEdit} onClick={isEdit?()=>setPriceState(p=>({...p,kafalaOfficeDiscountEnabled:!discOn})):undefined} title={isEdit?(discOn?'اضغط للتعطيل':'اضغط للتفعيل'):''} style={{width:46,height:24,borderRadius:999,border:'none',background:discOn?C.ok:'rgba(192,57,43,.7)',cursor:isEdit?'pointer':'default',position:'relative',flexShrink:0,padding:0,boxShadow:'0 2px 6px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.12)'}}>
                  <span style={{position:'absolute',width:18,height:18,borderRadius:'50%',background:'#fff',top:3,right:discOn?3:25,transition:'.2s'}}/>
                </button>
              </div>
              {/* أرضية الخصم */}
              {discOn&&<>
                {subHead('أرضية الخصم (الحدّ الأدنى لرسوم المكتب بعد الخصم)')}
                <div style={{display:'flex',gap:6}}>
                  {floorBtn('none','بدون')}
                  {floorBtn('fixed','مبلغ ثابت')}
                  {floorBtn('daily','يومي')}
                </div>
                {fMode==='fixed'&&<div style={{display:'grid',gridTemplateColumns:'1fr',gap:10}}>{renderField({k:'kafalaFloorFixed',l:'أقل مبلغ لرسوم المكتب',d:0,sfx:'ريال'},!isEdit)}</div>}
                <div style={{fontSize:10,color:'var(--tx4)',fontWeight:600,lineHeight:1.7}}>{fMode==='none'?'بدون أرضية — يُسمح بخصم رسوم المكتب بالكامل.':fMode==='fixed'?'الأرضية = المبلغ الثابت أعلاه؛ أقصى خصم = رسوم المكتب − الأرضية.':'الأرضية = سعر اليوم (من «رسوم المكتب») × أيام التجديد (شهور التجديد × 30)؛ أقصى خصم = رسوم المكتب − الأرضية.'}</div>
              </>}
            </div>}
          </div>
        )
      })()}
      {/* المدة المتوقعة في الإقامة — بنفس أسلوب باقي الأقسام، 3 حالات مع حقول لكل حالة */}
      {(() => {
        const title='المدة المتوقعة في الإقامة'
        const isCol=!!collapsed[title]
        const p1=Number(priceState.procDaysCase1)||7
        const p2=Number(priceState.procDaysCase2)||7
        const p3=Number(priceState.procDaysCase3)||7
        const th=Number(priceState.thresholdCase2)||30
        const f1={k:'procDaysCase1',l:'أيام معالجة الطلب',d:7,sfx:'يوم',min:0}
        const f2Proc={k:'procDaysCase2',l:'أيام معالجة الطلب',d:7,sfx:'يوم',min:0}
        const f2Th={k:'thresholdCase2',l:'حد الانتهاء القديم',d:30,sfx:'يوم',min:0}
        const f3={k:'procDaysCase3',l:'أيام معالجة الطلب',d:7,sfx:'يوم',min:0}
        const allFields=[f1,f2Proc,f2Th,f3]
        const isEdit=!!editing[title]
        const caseBox=(num,heading,formula,example,fields)=>(
          <div style={{display:'flex',flexDirection:'column',gap:6,padding:'10px 12px',borderRadius:9,background:'var(--bd2)',border:'1px solid var(--bd)'}}>
            <div style={{fontSize:11.5,fontWeight:600,color:C.gold,display:'flex',alignItems:'center',gap:8}}>
              <span style={{width:20,height:20,borderRadius:'50%',background:'rgba(176,125,0,.18)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:10.5,fontWeight:600}}>{num}</span>
              <span>{heading}</span>
            </div>
            <div style={{fontSize:10.5,color:'var(--tx3)',lineHeight:1.7,paddingRight:28}}>{formula}</div>
            <div style={{fontSize:10.5,color:'#3483b4',background:'rgba(52,131,180,.07)',border:'1px solid rgba(52,131,180,.25)',padding:'6px 10px',borderRadius:6,fontWeight:600}}>{example}</div>
            <div style={{display:'grid',gridTemplateColumns:fields.length>=2?'1fr 1fr':'1fr',gap:8,marginTop:4,paddingTop:6,borderTop:'1px dashed var(--bd)'}}>
              {fields.map(f=>renderField(f,!isEdit))}
            </div>
          </div>
        )
        return(
          <div {...secCardProps(isCol)}>
            {cardEditAllowed&&!isCol&&!isEdit&&<EditTab onClick={()=>startEdit(title)}/>}
            {!isCol&&isEdit&&<EditActionTabs onSave={()=>{saveSection(s.id,allFields,title);finishEdit(title)}} onCancel={()=>cancelEdit(title)}/>}
            <SectionHead title={title} isEditing={isEdit} isCollapsed={isCol} onToggle={()=>toggleSection(title)}/>
            {!isCol&&<>
              <div style={secNote}>لكل حالة إعداداتها الخاصة لحساب المدة:</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {caseBox(1,'نقل فقط (بدون تجديد)',
                  `المدة = من (اليوم + ${p1} يوم معالجة) حتى تاريخ انتهاء الإقامة الحالي.`,
                  `مثال: انتهاء 2026-06-22، اليوم 2026-04-22 ← من 2026-04-${22+p1<=30?String(22+p1).padStart(2,'0'):'29'} إلى 2026-06-22 ≈ 1 شهر و ${Math.max(0,24-p1)} يوم.`,
                  [f1])}
                {caseBox(2,`مع تجديد — الإقامة منتهية منذ ${th} يوم أو أكثر`,
                  `المدة = (اليوم + ${p2} يوم معالجة) + أشهر التجديد المختارة. يُتجاهَل تاريخ الانتهاء القديم.`,
                  `مثال: منتهية منذ 90 يوم + تجديد 12 شهر ← المدة ≈ 12 شهر و ${p2} يوم.`,
                  [f2Th,f2Proc])}
                {caseBox(3,'مع تجديد — الإقامة سارية أو منتهية حديثًا',
                  `المدة = من (اليوم + ${p3} يوم معالجة) حتى (تاريخ انتهاء الإقامة + أشهر التجديد).`,
                  `مثال: تنتهي بعد 30 يوم + تجديد 12 شهر ← المدة ≈ 12 شهر و ${Math.max(0,30-p3)} يوم.`,
                  [f3])}
              </div>
            </>}
          </div>
        )
      })()}
      {(() => {
        const title='التأمين الطبي'
        const isCol=!!collapsed[title]
        const isEdit=!!editing[title]
        const mo=Number(priceState.medicalGraceMonths)||2
        const dd=Number(priceState.medicalGraceDays)||7
        const brackets=Array.isArray(priceState.medicalBrackets)?priceState.medicalBrackets:[]
        const sample=brackets.find(b=>b.min<=35&&b.max>35)
        const medFields=[{k:'medicalGraceMonths',d:2},{k:'medicalGraceDays',d:10},{k:'medGovCover',d:1000}]
        const fGraceMonths={k:'medicalGraceMonths',l:'أشهر',d:2,sfx:'شهر'}
        const fGraceDays={k:'medicalGraceDays',l:'أيام إضافية',d:10,sfx:'يوم'}
        const fMedCover={k:'medGovCover',l:'حد تغطية المكتب',d:1000,sfx:'ريال'}
        const updateBracket=(i,key,val)=>{const next=[...brackets];next[i]={...next[i],[key]:val};setPriceState(p=>({...p,medicalBrackets:next}))}
        const addBracket=()=>{
          const last=brackets[brackets.length-1]||{max:0}
          const start=Number(last.max)||0
          setPriceState(p=>({...p,medicalBrackets:[...(p.medicalBrackets||[]),{min:start,max:start+10,rate:0}]}))
        }
        const removeBracket=(i)=>{const next=brackets.filter((_,idx)=>idx!==i);setPriceState(p=>({...p,medicalBrackets:next}))}
        const caseBox=(num,heading,formula,example,children)=>(
          <div style={{display:'flex',flexDirection:'column',gap:6,padding:'10px 12px',borderRadius:9,background:'var(--bd2)',border:'1px solid var(--bd)'}}>
            <div style={{fontSize:11.5,fontWeight:600,color:C.gold,display:'flex',alignItems:'center',gap:8}}>
              <span style={{width:20,height:20,borderRadius:'50%',background:'rgba(176,125,0,.18)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:10.5,fontWeight:600}}>{num}</span>
              <span>{heading}</span>
            </div>
            <div style={{fontSize:10.5,color:'var(--tx3)',lineHeight:1.7,paddingRight:28}}>{formula}</div>
            {example&&<div style={{fontSize:10.5,color:'#3483b4',background:'rgba(52,131,180,.07)',border:'1px solid rgba(52,131,180,.25)',padding:'6px 10px',borderRadius:6,fontWeight:600}}>{example}</div>}
            <div style={{marginTop:4,paddingTop:6,borderTop:'1px dashed var(--bd)'}}>{children}</div>
          </div>
        )
        return(
          <div {...secCardProps(isCol)}>
            {cardEditAllowed&&!isCol&&!isEdit&&<EditTab onClick={()=>startEdit(title)}/>}
            {!isCol&&isEdit&&<EditActionTabs onSave={()=>{saveSection(s.id,medFields,title);saveMedicalBrackets(s.id);finishEdit(title)}} onCancel={()=>cancelEdit(title)}/>}
            <SectionHead title={title} isEditing={isEdit} isCollapsed={isCol} onToggle={()=>toggleSection(title)}/>
            {!isCol&&<>
              <div style={secNote}>حالتان حسب وضع تأمين العامل الحالي:</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {caseBox(1,'تأمين ساري — إعفاء',
                  `إذا كان التأمين ساري ومتبقي عليه ${mo} شهر و${dd} يوم فأكثر ← لا تُحتسب رسوم تأمين.`,
                  null,
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    {renderField(fGraceMonths,!isEdit)}
                    {renderField(fGraceDays,!isEdit)}
                  </div>
                )}
                {caseBox(2,'تأمين غير ساري — احتساب حسب الفئة العمرية',
                  `تُحتسب الرسوم من تاريخ ميلاد العامل حسب جدول الفئات العمرية أدناه، ويشملها المكتب حتى «حد تغطية المكتب» والزائد عنه يُضاف على العميل.`,
                  sample?`مثال: عمر 35 سنة ← فئة ${sample.min}-${sample.max} = ${fmtNum(sample.rate)} ريال`:'أضِف فئات عمرية للاحتساب',
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    <div style={{display:'grid',gridTemplateColumns:'1fr',gap:8}}>{renderField(fMedCover,!isEdit)}</div>
                    {brackets.length===0&&<div style={{fontSize:10.5,color:'var(--tx5)',textAlign:'center',padding:'10px 0'}}>لا توجد فئات عمرية — {isEdit?'اضغط «إضافة فئة» أدناه':'ادخل وضع التعديل لإضافة فئات'}</div>}
                    {isEdit?<>
                      {brackets.map((b,i)=>(
                        <div key={i} style={{display:'grid',gridTemplateColumns:'70px 1fr 1fr 1fr auto',gap:8,alignItems:'center',padding:'6px 8px',borderRadius:7,background:'var(--bd2)',border:'1px solid var(--bd)'}}>
                          <span style={{fontSize:10.5,fontWeight:600,color:C.gold,background:'rgba(176,125,0,.12)',border:`1px solid ${C.gold}55`,borderRadius:999,padding:'3px 8px',textAlign:'center',whiteSpace:'nowrap',direction:'ltr'}}>{`#${i+1}`}</span>
                          <div>
                            <div style={{fontSize:9,fontWeight:600,color:'var(--tx4)',marginBottom:3,textAlign:'center'}}>من عمر</div>
                            <input type="text" inputMode="numeric" value={b.min??''} onChange={e=>updateBracket(i,'min',e.target.value===''?'':Number(e.target.value.replace(/[^0-9]/g,'')))} placeholder="20" style={{...inpS,height:32,fontSize:12,background:'var(--inputBg)'}}/>
                          </div>
                          <div>
                            <div style={{fontSize:9,fontWeight:600,color:'var(--tx4)',marginBottom:3,textAlign:'center'}}>إلى عمر</div>
                            <input type="text" inputMode="numeric" value={b.max??''} onChange={e=>updateBracket(i,'max',e.target.value===''?'':Number(e.target.value.replace(/[^0-9]/g,'')))} placeholder="30" style={{...inpS,height:32,fontSize:12,background:'var(--inputBg)'}}/>
                          </div>
                          <div>
                            <div style={{fontSize:9,fontWeight:600,color:'var(--tx4)',marginBottom:3,textAlign:'center'}}>السعر (ريال)</div>
                            <input type="text" inputMode="decimal" value={b.rate??''} onChange={e=>updateBracket(i,'rate',e.target.value===''?'':Number(e.target.value.replace(/[^0-9.]/g,'')))} placeholder="400" style={{...inpS,height:32,fontSize:12,background:'var(--inputBg)'}}/>
                          </div>
                          <button type="button" onClick={()=>removeBracket(i)} style={{width:28,height:28,borderRadius:7,border:'1px solid rgba(192,57,43,.25)',background:'rgba(192,57,43,.08)',color:C.red,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,flexShrink:0,alignSelf:'end'}} title="حذف الفئة">
                            <X size={12} strokeWidth={2.5}/>
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={addBracket} style={{height:32,marginTop:2,borderRadius:8,border:'1px dashed rgba(176,125,0,.35)',background:'transparent',color:C.gold,fontFamily:F,fontSize:11,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:5}}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        <span>إضافة فئة عمرية</span>
                      </button>
                    </>:(
                      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                        {brackets.map((b,i)=>{
                          const ageRange=`${b.min??'—'}-${b.max??'—'} سنة`
                          return(<div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,padding:'14px 6px 11px',borderRadius:11,background:'var(--card-bg)',border:'1px solid var(--bd)',textAlign:'center'}}>
                            <span style={{fontSize:10,fontWeight:600,color:C.gold,background:'rgba(176,125,0,.12)',border:`1px solid ${C.gold}55`,borderRadius:999,padding:'2px 8px',whiteSpace:'nowrap',direction:'rtl'}}>{ageRange}</span>
                            <span style={{fontSize:20,fontWeight:600,color:C.gold,fontVariantNumeric:'tabular-nums',letterSpacing:'-.5px',direction:'ltr',lineHeight:1,marginTop:2}}>{fmtNum(b.rate)}</span>
                            <span style={{fontSize:8.5,fontWeight:600,color:'var(--tx5)'}}>ريال</span>
                          </div>)
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>}
          </div>
        )
      })()}
      {renderKafalaPolicyCard(s)}
    </>
  : (() => {
      const totalField=sch.fields.find(f=>f._footer&&f.k==='defaultTotal')
      const gridFields=sch.fields.filter(f=>!f._footer&&f._section!=='saud'&&f.t!=='bool'&&f.t!=='mode')
      if(totalField){
        const tv=priceState[totalField.k]
        const onPriceChange=e=>{let v=e.target.value.replace(/[^0-9.]/g,'');const i=v.indexOf('.');if(i!==-1)v=v.slice(0,i+1)+v.slice(i+1).replace(/\./g,'');setPriceState(p=>({...p,[totalField.k]:v}))}
        const heroUnit=<span style={{fontSize:12,color:'var(--tx4)',fontWeight:600,minWidth:64,textAlign:'center'}}>{totalField.sfx}</span>
        const heroValue=(fs,h,align)=>editable
          ?<input type="text" inputMode="decimal" value={fmtThousands(tv??'')} onChange={onPriceChange} placeholder={String(totalField.d)}
            style={{flex:1,minWidth:0,height:h,padding:'0 14px',border:'1px solid rgba(176,125,0,.35)',borderRadius:11,fontFamily:F,fontSize:Math.min(fs,22),fontWeight:600,color:C.gold,outline:'none',background:'rgba(0,0,0,.30)',textAlign:align==='start'?'left':align,boxSizing:'border-box',direction:'ltr',fontVariantNumeric:'tabular-nums',letterSpacing:'-.5px'}}/>
          :<div style={{flex:1,minWidth:0,height:h,display:'flex',alignItems:'center',justifyContent:align==='center'?'center':align==='start'?'flex-start':'flex-end',fontSize:fs,fontWeight:600,color:C.gold,fontVariantNumeric:'tabular-nums',direction:'ltr',letterSpacing:'-.5px'}}>{fmtThousands(tv??totalField.d)}</div>
        const minOnChange=(k)=>e=>{let v=e.target.value.replace(/[^0-9.]/g,'');const i=v.indexOf('.');if(i!==-1)v=v.slice(0,i+1)+v.slice(i+1).replace(/\./g,'');setPriceState(p=>({...p,[k]:v}))}
        const minInput=(f,fs,wide)=><input type="text" inputMode="decimal" value={fmtThousands(priceState[f.k]??'')} onChange={minOnChange(f.k)} placeholder={String(f.d)} style={{...(wide?{flex:1,minWidth:0}:{width:140}),height:40,padding:'0 14px',border:'1px solid rgba(176,125,0,.35)',borderRadius:11,fontFamily:F,fontSize:15,fontWeight:600,color:C.gold,outline:'none',background:'rgba(0,0,0,.30)',textAlign:'center',boxSizing:'border-box',direction:'ltr',fontVariantNumeric:'tabular-nums',letterSpacing:'-.5px'}}/>
        const minNum=(f,fs,color)=><span style={{fontSize:fs,fontWeight:fs>=16?600:600,color:color||'var(--tx)',fontVariantNumeric:'tabular-nums',direction:'ltr'}}>{fmtThousands(priceState[f.k]??f.d)}</span>
        const renderMinimums=()=>(
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {gridFields.map(f=>(
              <div key={f.k} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:'10px 14px',borderRadius:10,background:'rgba(0,0,0,.18)',border:'1px solid var(--bd)'}}>
                <label style={{fontSize:12,fontWeight:600,color:'var(--tx3)',margin:0}}>{f.l}</label>
                <div style={{display:'flex',alignItems:'center',gap:8}}>{editable?minInput(f,13,false):minNum(f,14,C.gold)}<span style={{fontSize:10,fontWeight:600,color:'var(--tx5)',minWidth:60,textAlign:'center'}}>{f.sfx}</span></div>
              </div>
            ))}
          </div>
        )
        return <div style={{display:'flex',flexDirection:'column',gap:18}}>
          {/* Hero — default total (accent-rail design) */}
          <div style={{display:'flex',borderRadius:11,overflow:'hidden',background:'rgba(0,0,0,.18)',border:'1px solid var(--bd)'}}>
            <div style={{width:5,background:`linear-gradient(180deg,${C.gold},${C.gold}88)`,flexShrink:0}}/>
            <div style={{flex:1,minWidth:0,padding:'14px 16px',display:'flex',flexDirection:'column',gap:10}}>
              <span style={{fontSize:13.5,color:'var(--tx2)',fontWeight:600,letterSpacing:'.3px'}}>{totalField.l}</span>
              <div style={{display:'flex',alignItems:'center',gap:8}}>{heroValue(30,46,'start')}{heroUnit}</div>
            </div>
          </div>

          {/* Minimums section — note + boxed fields (only when there are fields) */}
          {gridFields.length>0&&(
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {sch.note&&(
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:12,color:'var(--tx2)',fontWeight:600,letterSpacing:'.2px',whiteSpace:'nowrap'}}>{sch.note}</span>
                <div style={{flex:1,height:1,background:'var(--bd)'}}/>
              </div>
            )}
            {renderMinimums()}
          </div>
          )}
        </div>
      }
      return <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <div style={{display:'grid',gridTemplateColumns:gridFields.length>=3?'1fr 1fr':'1fr',gap:10}}>
          {gridFields.map(f=>renderField(f,!editable))}
        </div>
        {s.id==='ajeer_contract'&&renderSaudCard(!editable)}
      </div>
    })()
}
{(() => {
  const ghostBtnStyle=(color)=>({height:32,padding:'0 14px',borderRadius:9,border:`1px dashed ${color}80`,background:'transparent',color,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:7,boxShadow:'none',transition:'background .15s ease, border-color .15s ease',letterSpacing:'.2px',direction:'rtl'})
  const onHover=(e,color)=>{e.currentTarget.style.background=`${color}1f`}
  const offHover=(e,color)=>{e.currentTarget.style.background='transparent'}
  return (!opts.inModal&&(isKafala||editable)) ? (
    <div style={{display:'flex',gap:10,justifyContent:'space-between',alignItems:'center',paddingTop:14,borderTop:'1px solid var(--bd)',marginTop:8,flexWrap:'wrap'}}>
      <span style={{fontSize:11,color:'var(--tx5)',fontWeight:500}}>{isKafala?'كل قسم له زر حفظ مستقل — اضغط "حفظ" عند كل قسم لحفظ تعديلاته':''}</span>
      {!isKafala&&editable&&<div style={{display:'flex',gap:8}}>
        <button type="button" onClick={cancelEditPrice}
          onMouseEnter={e=>onHover(e,'#c0392b')} onMouseLeave={e=>offHover(e,'#c0392b')}
          style={ghostBtnStyle('#c0392b')}>
          <span>إلغاء</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <button type="button" onClick={()=>savePriceAndLock(s.id)}
          onMouseEnter={e=>onHover(e,C.gold)} onMouseLeave={e=>offHover(e,C.gold)}
          style={ghostBtnStyle(C.gold)}>
          <span>حفظ التسعيرة</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
      </div>}
    </div>
  ) : null
})()}
</div>
}

// A service uses the standard FormKit field layout in the edit modal when its pricing is a
// simple flat list (no aggregate "total" footer field, no date field) — e.g. الغرفة التجارية.
// Richer schemas (visas/iqama with a hero total) keep their bespoke editor.
const isSimplePricing=(svcId)=>{
  const sch=PRICING_SCHEMA[svcId]
  return !!sch&&svcId!=='kafala_transfer'&&!sch.fields.some(f=>f._footer||f.t==='date')
}
// Edit-modal body in the FormKit format-gallery style — one CurrencyField/NumberField per fee.
// «عدد الأشهر المشمولة» تُختار من قائمة منسدلة (1-12 شهر) بدل الإدخال اليدوي.
const MONTHS_OPTS=Array.from({length:12},(_,i)=>i+1)
const monthsLabel=n=>`${n} ${n===1?'شهر':n===2?'شهران':n<=10?'أشهر':'شهراً'}`
const WORKERS_OPTS=Array.from({length:20},(_,i)=>i+1)
const workersLabel=n=>`${n} ${n===1?'عامل':n===2?'عاملان':n<=10?'عمال':'عاملاً'}`
const renderFeeField=(f)=>{
  if(f.k==='baseMonths')return(
    <Select key={f.k} label={f.l} searchable={false}
      value={Number(priceState[f.k]??f.d)} options={MONTHS_OPTS}
      getKey={n=>n} getLabel={monthsLabel}
      onChange={v=>setPriceState(p=>({...p,[f.k]:v}))}/>
  )
  if(f.k==='saudizationThreshold')return(
    <Select key={f.k} label={f.l} searchable={false}
      value={Number(priceState[f.k]??f.d)} options={WORKERS_OPTS}
      getKey={n=>n} getLabel={workersLabel}
      onChange={v=>setPriceState(p=>({...p,[f.k]:v}))}/>
  )
  if(f.t==='date')return(
    <DateField key={f.k} label={f.l} value={priceState[f.k]??''} onChange={v=>setPriceState(p=>({...p,[f.k]:v}))}/>
  )
  const isMoney=!f.sfx||/ريال/.test(f.sfx)
  return isMoney
    ? <CurrencyField key={f.k} label={f.l} unit={f.sfx||'ريال'} value={priceState[f.k]??''} placeholder={String(f.d)} onChange={v=>setPriceState(p=>({...p,[f.k]:v}))}/>
    : <NumberField key={f.k} label={f.l} hint={f.sfx} placeholder={String(f.d)} value={priceState[f.k]??''} onChange={v=>setPriceState(p=>({...p,[f.k]:v}))}/>
}
const renderPriceModalBody=(s)=>{
  const sch=PRICING_SCHEMA[s.id]
  if(!sch)return null
  const fields=sch.fields.filter(f=>!f.k?.startsWith('__')&&f._section!=='saud'&&f.t!=='bool'&&f.t!=='mode')
  return(
    <ModalSection Icon={Coins} label={T('الرسوم','Fees')} hint={`${fields.length} ${T('حقل','fields')}`}>
      <div style={{display:'grid',gridTemplateColumns:'1fr',gap:12}}>
        {fields.map(renderFeeField)}
      </div>
    </ModalSection>
  )
}
// صندوق شرح مختصر أعلى الخطوة.
const stepNoteBox=(txt)=>txt?(
  <div style={{fontSize:11,color:'var(--tx3)',lineHeight:1.8,background:'rgba(176,125,0,.05)',border:`1px solid ${C.gold}2e`,borderRadius:9,padding:'10px 12px',marginBottom:14,fontWeight:600,display:'flex',gap:8}}>
    <span style={{color:C.gold,flexShrink:0,fontWeight:600}}>ℹ</span><span>{txt}</span>
  </div>
):null
// قائمة المهن المعفاة من رسوم تغيير المهنة — محرّرة مباشرة داخل معالج التسعير (بحث + إضافة/إزالة).
const renderProfChangeFreePicker=()=>{
  const selectedIds=Array.isArray(priceState.profChangeFreeOccupations)?priceState.profChangeFreeOccupations:[]
  const selectedSet=new Set(selectedIds)
  const selectedItems=occupations.filter(o=>selectedSet.has(o.id))
  const q=priceState.__profChangeFreeQuery||''
  const setQ=v=>setPriceState(p=>({...p,__profChangeFreeQuery:v}))
  const filtered=occupations.filter(o=>!selectedSet.has(o.id)&&(q?((o.name_ar||'').includes(q)||(o.name_en||'').toLowerCase().includes(q.toLowerCase())):true))
  return(
    <div style={{display:'flex',flexDirection:'column',gap:8,padding:'12px 14px',borderRadius:10,background:'rgba(39,160,70,.04)',border:`1px dashed ${C.ok}55`,marginTop:14}}>
      <div style={{fontSize:12,fontWeight:600,color:C.ok,display:'flex',alignItems:'center',gap:7}}>
        <Gift size={14} strokeWidth={2.4}/><span>مهن معفاة من رسوم التغيير</span>
      </div>
      <div style={{fontSize:11,color:'var(--tx3)',lineHeight:1.7}}>إذا كانت المهنة الحالية للعامل أو المهنة الجديدة ضمن هذه القائمة ← تصير رسوم تغيير المهنة <b>مجانية (٠ ريال)</b>.</div>
      <div className="svc-occ-search" style={{position:'relative'}}>
        <Search size={15} strokeWidth={2.2} className="svc-occ-search-ico" style={{position:'absolute',top:'50%',left:14,transform:'translateY(-50%)',pointerEvents:'none'}}/>
        <input type="text" value={q} onChange={e=>setQ(e.target.value)} placeholder={`ابحث بالاسم (${occupations.length} مهنة متاحة)…`} style={{...inpS,height:38,textAlign:'right',direction:'rtl',paddingLeft:40,paddingRight:14,background:'var(--inputBg)'}}/>
      </div>
      {q&&<div className="svc-occ-list" style={{maxHeight:200,overflowY:'auto',border:'1px solid var(--bd)',borderRadius:7,background:'rgba(0,0,0,.25)'}}>
        {filtered.length>0?filtered.slice(0,300).map(o=>(
          <div key={o.id} onClick={()=>{setPriceState(p=>({...p,profChangeFreeOccupations:[...selectedIds,o.id],__profChangeFreeQuery:''}))}} style={{padding:'7px 10px',cursor:'pointer',fontSize:11.5,fontWeight:600,color:'var(--tx)',borderBottom:'1px solid var(--bd2)',display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}} onMouseEnter={e=>{e.currentTarget.style.background='rgba(39,160,70,.08)'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
            <span>{o.name_ar}</span>{o.name_en&&<span style={{fontSize:10,color:'var(--tx5)',unicodeBidi:'plaintext'}}>{o.name_en}</span>}
          </div>
        )):<div style={{fontSize:10.5,color:'var(--tx5)',padding:'14px',textAlign:'center'}}>{occupations.length===0?'جاري تحميل المهن…':'لا توجد نتائج'}</div>}
      </div>}
      {selectedItems.length>0?(<div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:2}}>
        {selectedItems.map(o=>(
          <span key={o.id} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'3px 8px 3px 5px',borderRadius:999,background:'rgba(39,160,70,.12)',border:`1px solid ${C.ok}55`,fontSize:11,fontWeight:600,color:C.ok}}>
            <button type="button" onClick={()=>setPriceState(p=>({...p,profChangeFreeOccupations:selectedIds.filter(id=>id!==o.id)}))} style={{width:14,height:14,borderRadius:'50%',border:'none',background:'rgba(39,160,70,.2)',color:C.ok,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',padding:0,lineHeight:0}} title="إزالة"><X size={9} strokeWidth={3}/></button>
            <span>{o.name_ar}</span>
          </span>
        ))}
      </div>):(<div style={{fontSize:10.5,color:'var(--tx5)',padding:'4px 0',textAlign:'center'}}>لا توجد مهن معفاة — ابحث بالأعلى لإضافة</div>)}
    </div>
  )
}
// حقل + وصف توضيحي أسفله — لتظهر دلالة كل حقل بوضوح.
const renderFeeFieldRow=(fk,desc)=>{
  const def=IQAMA_FIELD_BY_K[fk];if(!def)return null
  return(<div key={fk} style={{display:'flex',flexDirection:'column',gap:5}}>
    {renderFeeField(def)}
    {desc&&<div style={{fontSize:10.5,color:'var(--tx3)',lineHeight:1.6,paddingInlineStart:2,fontWeight:500}}>{desc}</div>}
  </div>)
}
// صفحات معالج تجديد الإقامة — خطوات مقسّمة بدقّة، كل حقل بوصفه؛ كل خطوة تكفي بنفسها بلا تمرير.
// محتوى خطوة التأمين الطبي داخل معالج تجديد الإقامة — التأمين إلزامي فلا يوجد إعفاء «تأمين ساري»:
// يُحتسب دائمًا من تاريخ ميلاد العامل حسب جدول الفئات العمرية.
const renderIqamaMedicalBody=()=>{
  const brackets=Array.isArray(priceState.medicalBrackets)?priceState.medicalBrackets:[]
  const sample=brackets.find(b=>b.min<=35&&b.max>35)
  const updateBracket=(i,key,val)=>{const next=[...brackets];next[i]={...next[i],[key]:val};setPriceState(p=>({...p,medicalBrackets:next}))}
  const addBracket=()=>{const last=brackets[brackets.length-1]||{max:0};const start=Number(last.max)||0;setPriceState(p=>({...p,medicalBrackets:[...(p.medicalBrackets||[]),{min:start,max:start+10,rate:0}]}))}
  const removeBracket=(i)=>{const next=brackets.filter((_,idx)=>idx!==i);setPriceState(p=>({...p,medicalBrackets:next}))}
  return(
    <div style={{display:'flex',flexDirection:'column',gap:8,padding:'10px 12px',borderRadius:9,background:'var(--bd2)',border:'1px solid var(--bd)'}}>
      <div style={{fontSize:11.5,fontWeight:600,color:C.gold,display:'flex',alignItems:'center',gap:8}}>
        <BadgeCheck size={15} strokeWidth={2.2}/><span>الفئات العمرية للتأمين</span>
      </div>
      <div style={{fontSize:10.5,color:'var(--tx3)',lineHeight:1.7}}>إذا كان لدى العامل تأمين ساري متبقٍّ عليه المدة أدناه فأكثر ← لا تُحتسب رسوم تأمين. غير ذلك تُحتسب حسب الفئة العمرية ويشملها المكتب حتى «حد تغطية المكتب».</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
        {renderField({k:'medicalGraceMonths',l:'أشهر سريان التأمين',d:2,sfx:'شهر'},false)}
        {renderField({k:'medicalGraceDays',l:'أيام إضافية',d:10,sfx:'يوم'},false)}
        {renderField({k:'medGovCover',l:'حد تغطية المكتب',d:1000,sfx:'ريال'},false)}
      </div>
      {sample&&<div style={{fontSize:10.5,color:'#3483b4',background:'rgba(52,131,180,.07)',border:'1px solid rgba(52,131,180,.25)',padding:'6px 10px',borderRadius:6,fontWeight:600}}>{`مثال: عمر 35 سنة ← فئة ${sample.min}-${sample.max} = ${fmtNum(sample.rate)} ريال`}</div>}
      <div className="svc-occ-list" style={{display:'flex',flexDirection:'column',gap:8,marginTop:2,maxHeight:300,overflowY:'auto',paddingInlineEnd:2}}>
        {brackets.length===0&&<div style={{fontSize:10.5,color:'var(--tx5)',textAlign:'center',padding:'10px 0'}}>لا توجد فئات عمرية — اضغط «إضافة فئة عمرية» أدناه</div>}
        {brackets.map((b,i)=>(
          <div key={i} style={{display:'grid',gridTemplateColumns:'70px 1fr 1fr 1fr auto',gap:8,alignItems:'center',padding:'6px 8px',borderRadius:7,background:'var(--bd2)',border:'1px solid var(--bd)'}}>
            <span style={{fontSize:10.5,fontWeight:600,color:C.gold,background:'rgba(176,125,0,.12)',border:`1px solid ${C.gold}55`,borderRadius:999,padding:'3px 8px',textAlign:'center',whiteSpace:'nowrap',direction:'ltr'}}>{`#${i+1}`}</span>
            <div>
              <div style={{fontSize:9,fontWeight:600,color:'var(--tx4)',marginBottom:3,textAlign:'center'}}>من عمر</div>
              <input type="text" inputMode="numeric" value={b.min??''} onChange={e=>updateBracket(i,'min',e.target.value===''?'':Number(e.target.value.replace(/[^0-9]/g,'')))} placeholder="20" style={{...inpS,height:32,fontSize:12,background:'var(--inputBg)'}}/>
            </div>
            <div>
              <div style={{fontSize:9,fontWeight:600,color:'var(--tx4)',marginBottom:3,textAlign:'center'}}>إلى عمر</div>
              <input type="text" inputMode="numeric" value={b.max??''} onChange={e=>updateBracket(i,'max',e.target.value===''?'':Number(e.target.value.replace(/[^0-9]/g,'')))} placeholder="30" style={{...inpS,height:32,fontSize:12,background:'var(--inputBg)'}}/>
            </div>
            <div>
              <div style={{fontSize:9,fontWeight:600,color:'var(--tx4)',marginBottom:3,textAlign:'center'}}>السعر (ريال)</div>
              <input type="text" inputMode="decimal" value={b.rate??''} onChange={e=>updateBracket(i,'rate',e.target.value===''?'':Number(e.target.value.replace(/[^0-9.]/g,'')))} placeholder="400" style={{...inpS,height:32,fontSize:12,background:'var(--inputBg)'}}/>
            </div>
            <button type="button" onClick={()=>removeBracket(i)} style={{width:28,height:28,borderRadius:7,border:'1px solid rgba(192,57,43,.25)',background:'rgba(192,57,43,.08)',color:C.red,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,flexShrink:0,alignSelf:'end'}} title="حذف الفئة">
              <X size={12} strokeWidth={2.5}/>
            </button>
          </div>
        ))}
        <button type="button" onClick={addBracket} style={{height:32,marginTop:2,borderRadius:8,border:`1px dashed ${C.gold}59`,background:'transparent',color:C.gold,fontFamily:F,fontSize:11,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:5}}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>إضافة فئة عمرية</span>
        </button>
      </div>
    </div>
  )
}
// محتوى خطوة «أساس احتساب رخصة العمل» — سياسة موحّدة (انتهاء الإقامة / انتهاء كرت العمل).
const renderIqamaBasisBody=()=>{
  const wc=priceState.iqamaWpBasis==='workcard'
  const opt=(val,label,sub)=>{
    const sel=wc===(val==='workcard')
    return(<button type="button" key={val} onClick={()=>setPriceState(p=>({...p,iqamaWpBasis:val}))} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:6,padding:'20px 10px',borderRadius:13,border:`1px solid ${sel?C.gold:'var(--bd)'}`,background:sel?'rgba(176,125,0,.12)':'var(--bd2)',color:sel?C.gold:'var(--tx3)',cursor:'pointer',fontFamily:F,transition:'.15s'}}>
      <IdCard size={22} strokeWidth={1.9}/>
      <span style={{fontSize:13.5,fontWeight:600}}>{label}</span><span style={{fontSize:10,fontWeight:600,opacity:.8}}>{sub}</span>
    </button>)
  }
  return(
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{display:'flex',gap:10}}>{opt('iqama','انتهاء الإقامة','الافتراضي')}{opt('workcard','انتهاء كرت العمل','تاريخ مستقل')}</div>
      <div style={{fontSize:10.5,color:'var(--tx4)',fontWeight:600,lineHeight:1.7,background:'var(--bd2)',border:'1px solid var(--bd)',borderRadius:9,padding:'10px 12px'}}>لو اخترت «كرت العمل» وعامل بلا تاريخ كرت عمل مسجّل ← يُحتسب على انتهاء الإقامة تلقائياً مع تنبيه في الحاسبة.</div>
    </div>
  )
}
// محتوى خطوة «بداية الفترة» — أيام المعالجة + زر تفعيل قاعدة الإقامة المنتهية من مدة طويلة (إصدار جديد) وحقولها.
const renderIqamaWpResetBody=(step)=>{
  const on=priceState.iqamaWpResetEnabled===true
  const descOf=k=>(step.fields.find(f=>f.k===k)||{}).desc
  return(
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      {renderFeeFieldRow('workPermitProcDays',descOf('workPermitProcDays'))}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:'12px 14px',borderRadius:10,background:on?'rgba(176,125,0,.06)':'var(--bd2)',border:`1px solid ${on?C.gold+'55':'var(--bd)'}`}}>
        <div style={{display:'flex',flexDirection:'column',gap:3,minWidth:0}}>
          <span style={{fontSize:12.5,fontWeight:600,color:on?C.gold:'var(--tx2)'}}>قاعدة الإقامة المنتهية من مدة طويلة</span>
          <span style={{fontSize:10.5,color:'var(--tx4)',fontWeight:600,lineHeight:1.7}}>عند التفعيل: إذا تجاوز تأخّر الإقامة الحدّ أدناه ← تُحسب رخصة العمل كإصدار جديد من اليوم، على شهور التجديد فقط (بلا شهور تأخّر).</span>
        </div>
        <button type="button" onClick={()=>setPriceState(p=>({...p,iqamaWpResetEnabled:!on}))} title={on?'اضغط للتعطيل':'اضغط للتفعيل'} style={{width:46,height:24,borderRadius:999,border:'none',background:on?C.ok:'rgba(192,57,43,.7)',cursor:'pointer',position:'relative',flexShrink:0,padding:0,boxShadow:'0 2px 6px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.12)'}}>
          <span style={{position:'absolute',width:18,height:18,borderRadius:'50%',background:'#fff',top:3,right:on?3:25,transition:'.2s'}}/>
        </button>
      </div>
      <div style={{opacity:on?1:.4,pointerEvents:on?'auto':'none',display:'flex',flexDirection:'column',gap:14}}>
        {renderFeeFieldRow('iqamaWpResetAfterDays',descOf('iqamaWpResetAfterDays'))}
        {renderFeeFieldRow('iqamaWpIssuanceDays',descOf('iqamaWpIssuanceDays'))}
      </div>
    </div>
  )
}
// محتوى خطوة «رسوم المكتب» — زر اختيار طريقة الحساب (سعر ثابت / يومي) + الحقلين.
const renderIqamaOfficeBody=(step)=>{
  const daily=priceState.iqamaOfficeFeeMode==='daily'
  const descOf=k=>(step.fields.find(f=>f.k===k)||{}).desc
  const opt=(val,label,sub)=>{
    const on=daily===(val==='daily')
    return(<button type="button" onClick={()=>setPriceState(p=>({...p,iqamaOfficeFeeMode:val}))} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'11px 8px',borderRadius:10,border:`1px solid ${on?C.gold:'rgba(255,255,255,.1)'}`,background:on?'rgba(176,125,0,.12)':'rgba(255,255,255,.02)',color:on?C.gold:'var(--tx3)',cursor:'pointer',fontFamily:F,transition:'.15s'}}>
      <span style={{fontSize:12.5,fontWeight:600}}>{label}</span>
      <span style={{fontSize:9.5,fontWeight:600,opacity:.8}}>{sub}</span>
    </button>)
  }
  return(
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{display:'flex',gap:8}}>
        {opt('flat','سعر ثابت','نفس المبلغ دائماً')}
        {opt('daily','يومي','سعر اليوم × أيام التجديد')}
      </div>
      <div style={{opacity:daily?.45:1,pointerEvents:daily?'none':'auto'}}>{renderFeeFieldRow('officeFee',descOf('officeFee'))}</div>
      {renderFeeFieldRow('officeDailyRate',descOf('officeDailyRate'))}
    </div>
  )
}
// محتوى خطوة «خصم المكتب» — زر سياسة السماح بالخصم عند التصديق.
const renderIqamaDiscountBody=()=>{
  const discOn=priceState.iqamaOfficeDiscountEnabled!==false
  return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:'16px',borderRadius:12,background:discOn?'rgba(176,125,0,.06)':'var(--bd2)',border:`1px solid ${discOn?C.gold+'55':'var(--bd)'}`}}>
      <div style={{display:'flex',flexDirection:'column',gap:4,minWidth:0}}>
        <span style={{fontSize:13,fontWeight:600,color:discOn?C.gold:'var(--tx2)'}}>السماح بخصم المكتب عند التصديق</span>
        <span style={{fontSize:11,color:'var(--tx4)',fontWeight:600,lineHeight:1.8}}>عند التفعيل: يظهر حقل «خصم المكتب» (مبلغ بالريال) في نافذة التصديق بحدّ أدنى لا ينزل تحت سعر اليوم × أيام التجديد. عند التعطيل: لا يُتاح أي خصم.</span>
      </div>
      <button type="button" onClick={()=>setPriceState(p=>({...p,iqamaOfficeDiscountEnabled:!discOn}))} title={discOn?'اضغط للتعطيل':'اضغط للتفعيل'} style={{width:46,height:24,borderRadius:999,border:'none',background:discOn?C.ok:'rgba(192,57,43,.7)',cursor:'pointer',position:'relative',flexShrink:0,padding:0,boxShadow:'0 2px 6px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.12)'}}>
        <span style={{position:'absolute',width:18,height:18,borderRadius:'50%',background:'#fff',top:3,right:discOn?3:25,transition:'.2s'}}/>
      </button>
    </div>
  )
}
// عرض القراءة لتسعيرة تجديد الإقامة — مقسّم بنفس أقسام المعالج، يعكس كل القيم والسياسات بتصميم بطاقات.
const renderIqamaDetailView=(s)=>{
  const v=getPricing(s.id)||{}
  const money=k=>fmtThousands(v[k]??0)
  const raw=k=>v[k]??'—'
  const brackets=Array.isArray(v.medicalBrackets)?v.medicalBrackets:[]
  const freeCount=Array.isArray(v.profChangeFreeOccupations)?v.profChangeFreeOccupations.length:0
  const resetOn=v.iqamaWpResetEnabled===true
  const daily=v.iqamaOfficeFeeMode==='daily'
  const discOn=v.iqamaOfficeDiscountEnabled!==false
  const wc=v.iqamaWpBasis==='workcard'
  const Stat=(label,value,unit,muted)=>(
    <div key={label} style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,padding:'14px 8px 11px',borderRadius:12,background:'var(--card-bg)',border:'1px solid var(--bd)',textAlign:'center',minWidth:0,opacity:muted?.5:1}}>
      <span style={{fontSize:10.5,fontWeight:600,color:'var(--tx3)',lineHeight:1.3}}>{label}</span>
      <span style={{fontSize:19,fontWeight:600,color:C.gold,fontVariantNumeric:'tabular-nums',letterSpacing:'-.5px',direction:'ltr',lineHeight:1,marginTop:2,whiteSpace:'nowrap'}}>{value}</span>
      {unit&&<span style={{fontSize:8.5,fontWeight:600,color:'var(--tx5)'}}>{unit}</span>}
    </div>
  )
  const grid=(cols,kids)=>(<div style={{display:'grid',gridTemplateColumns:`repeat(${cols},1fr)`,gap:10}}>{kids}</div>)
  const subhead=(t)=>(<div style={{fontSize:11,fontWeight:600,color:'var(--tx3)',display:'flex',alignItems:'center',gap:8,marginTop:4}}><span style={{width:14,height:2,background:`${C.gold}99`,borderRadius:2}}/>{t}</div>)
  const pill=(label,color)=>(<span style={{display:'inline-flex',alignItems:'center',gap:6,padding:'5px 11px',borderRadius:999,fontSize:11.5,fontWeight:600,background:`${color}1a`,border:`1px solid ${color}55`,color}}><span style={{width:6,height:6,borderRadius:'50%',background:color}}/>{label}</span>)
  const Section=(title,badge,children)=>(
    <div style={{borderRadius:14,background:'var(--card-grad2)',border:'1px solid var(--bd)',overflow:'hidden'}}>
      <div style={{padding:'12px 18px',borderBottom:'1px solid var(--bd)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
        <span style={{display:'inline-flex',alignItems:'center',gap:9,fontSize:14.5,fontWeight:600,color:C.gold}}><span style={{width:6,height:6,borderRadius:'50%',background:C.gold}}/>{title}</span>
        {badge}
      </div>
      <div style={{padding:'16px 18px',display:'flex',flexDirection:'column',gap:13}}>{children}</div>
    </div>
  )
  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      {Section('الرسوم الحكومية لتجديد الإقامة',null,
        grid(2,[Stat('سعر الشهر',money('iqamaPerMonth'),'ريال/شهر'),Stat('حد التغطية الحكومية',money('iqamaGovCover'),'ريال')]))}
      {Section('المهلة والغرامات',null,
        grid(3,[Stat('أيام المهلة',raw('iqamaGraceDays'),'يوم'),Stat('غرامة أولى',money('iqamaFine1'),'ريال'),Stat('غرامة ثانية',money('iqamaFine2'),'ريال')]))}
      {Section('كرت العمل (رخصة العمل)',pill(wc?'الأساس: انتهاء كرت العمل':'الأساس: انتهاء الإقامة',C.gold),
        <>
          {subhead('بالإعفاء · السعر الثابت لكل مدة')}
          {grid(4,[Stat('٣ أشهر',money('workPermit3M'),'ريال'),Stat('٦ أشهر',money('workPermit6M'),'ريال'),Stat('٩ أشهر',money('workPermit9M'),'ريال'),Stat('١٢ شهر',money('workPermit12M'),'ريال')])}
          {subhead('بدون إعفاء (المقابل المالي)')}
          {grid(4,[Stat('٣ أشهر',money('workPermitNoExempt3M'),'ريال'),Stat('٦ أشهر',money('workPermitNoExempt6M'),'ريال'),Stat('٩ أشهر',money('workPermitNoExempt9M'),'ريال'),Stat('١٢ شهر',money('workPermitNoExempt12M'),'ريال')])}
          {subhead('التسعير اليومي وبداية الفترة')}
          {grid(3,[Stat('سعر اليوم بعد التفعيل',money('workPermitDailyAfter'),'ريال/يوم'),Stat('تاريخ التفعيل اليومي',raw('workPermitCutoffDate')),Stat('أيام المعالجة',raw('workPermitProcDays'),'يوم')])}
          <div style={{display:'flex',flexDirection:'column',gap:7,padding:'11px 13px',borderRadius:10,background:resetOn?'rgba(176,125,0,.05)':'rgba(255,255,255,.02)',border:`1px solid ${resetOn?C.gold+'33':'rgba(255,255,255,.07)'}`}}>
            {pill(resetOn?'قاعدة المنتهية من مدة طويلة: مفعّلة':'قاعدة المنتهية من مدة طويلة: معطّلة',resetOn?C.ok:C.red)}
            {resetOn&&<span style={{fontSize:11,color:'var(--tx4)',fontWeight:600,lineHeight:1.7}}>بعد {raw('iqamaWpResetAfterDays')} يوم تأخّر ← تُحسب كإصدار جديد من اليوم + {raw('iqamaWpIssuanceDays')} أيام (بلا شهور تأخّر).</span>}
          </div>
        </>)}
      {Section('رسوم تغيير المهنة',pill(`مهن معفاة: ${freeCount}`,C.ok),
        grid(2,[Stat('رسوم تغيير المهنة',money('profChange'),'ريال'),Stat('عدد المهن المعفاة',freeCount,'مهنة')]))}
      {Section('رسوم المكتب',pill(daily?'الوضع: يومي':'الوضع: سعر ثابت',C.gold),
        <>
          {grid(2,[Stat('السعر الثابت',money('officeFee'),'ريال',daily),Stat('سعر اليوم',money('officeDailyRate'),'ريال/يوم')])}
          {pill(discOn?'خصم المكتب عند التصديق: مسموح':'خصم المكتب: غير مسموح',discOn?C.ok:C.red)}
        </>)}
      {Section('التأمين الطبي',pill(`${brackets.length} فئة عمرية`,C.gold),
        <>
        {grid(3,[Stat('سريان التأمين',raw('medicalGraceMonths'),'شهر'),Stat('أيام إضافية',raw('medicalGraceDays'),'يوم'),Stat('حد تغطية المكتب',money('medGovCover'),'ريال')])}
        {brackets.length
          ? <div style={{display:'flex',flexWrap:'wrap',gap:8}}>{brackets.map((b,i)=>(
              <span key={i} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'7px 12px',borderRadius:10,background:'var(--card-bg)',border:'1px solid var(--bd)',fontSize:11.5,fontWeight:600}}>
                <span style={{color:'var(--tx3)'}}>{b.min}-{b.max} سنة</span><span style={{color:C.gold,fontWeight:600,direction:'ltr'}}>{fmtThousands(b.rate)} ريال</span>
              </span>
            ))}</div>
          : <div style={{fontSize:11,color:'var(--tx5)',textAlign:'center',padding:'8px 0'}}>لا توجد فئات عمرية</div>}
        </>)}
    </div>
  )
}
// محرّر تسعيرة تجديد الإقامة inline — أقسام قابلة للطيّ مع «تعديل» لكل قسم (نفس نمط نقل الكفالة، بلا نافذة منبثقة).
const renderIqamaInlineEditor=(s,opts={})=>{
  const cardEditAllowed=opts.canEdit!==false
  const v=priceState
  const isE=t=>!!editing[t]
  const isC=t=>!!collapsed[t]
  const fld=(k,ed)=>{const d=IQAMA_FIELD_BY_K[k];return d?renderField(d,!ed,false):null}
  // ذرّات العرض للقراءة
  const Stat=(label,value,unit)=>(<div key={label} style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,padding:'13px 8px 10px',borderRadius:11,background:'var(--card-bg)',border:'1px solid var(--bd)',textAlign:'center',minWidth:0}}><span style={{fontSize:10,fontWeight:600,color:'var(--tx3)',lineHeight:1.3}}>{label}</span><span style={{fontSize:18,fontWeight:600,color:C.gold,direction:'ltr',letterSpacing:'-.5px',lineHeight:1,marginTop:2,whiteSpace:'nowrap'}}>{value}</span>{unit&&<span style={{fontSize:8.5,fontWeight:600,color:'var(--tx5)'}}>{unit}</span>}</div>)
  const grid=(cols,kids)=>(<div style={{display:'grid',gridTemplateColumns:`repeat(${cols},1fr)`,gap:10}}>{kids}</div>)
  const sub=(t)=>(<div style={{fontSize:11,fontWeight:600,color:'var(--tx3)',display:'flex',alignItems:'center',gap:8,marginTop:4}}><span style={{width:14,height:2,background:`${C.gold}99`,borderRadius:2}}/>{t}</div>)
  const pill=(label,color)=>(<span style={{display:'inline-flex',alignItems:'center',gap:6,padding:'5px 11px',borderRadius:999,fontSize:11.5,fontWeight:600,background:`${color}1a`,border:`1px solid ${color}55`,color}}><span style={{width:6,height:6,borderRadius:'50%',background:color}}/>{label}</span>)
  // أزرار التعديل (تفاعلية في وضع التعديل فقط)
  const seg=(key,opts)=>(<div style={{display:'flex',gap:8}}>{opts.map(o=>{const seld=(v[key]||opts[0].val)===o.val;return(<button key={o.val} type="button" onClick={()=>setPriceState(p=>({...p,[key]:o.val}))} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'10px 8px',borderRadius:10,border:`1px solid ${seld?C.gold:'var(--bd)'}`,background:seld?'rgba(176,125,0,.12)':'var(--bd2)',color:seld?C.gold:'var(--tx3)',cursor:'pointer',fontFamily:F}}><span style={{fontSize:12,fontWeight:600}}>{o.l}</span>{o.sub&&<span style={{fontSize:9,fontWeight:600,opacity:.8}}>{o.sub}</span>}</button>)})}</div>)
  const sw=(key,onLabel,offLabel)=>{const on=key==='iqamaOfficeDiscountEnabled'?v[key]!==false:v[key]===true;return(<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}><span style={{fontSize:12,fontWeight:600,color:on?C.gold:'var(--tx2)'}}>{on?onLabel:offLabel}</span><button type="button" onClick={()=>setPriceState(p=>({...p,[key]:!on}))} style={{width:46,height:24,borderRadius:999,border:'none',background:on?C.ok:'rgba(192,57,43,.7)',cursor:'pointer',position:'relative',flexShrink:0,padding:0}}><span style={{position:'absolute',width:18,height:18,borderRadius:'50%',background:'#fff',top:3,right:on?3:25,transition:'.2s'}}/></button></div>)}
  // محتوى كل قسم (قراءة/تعديل)
  const content=(title,ed)=>{
    if(title==='الرسوم الحكومية لتجديد الإقامة')return ed?grid(2,[fld('iqamaPerMonth',1),fld('iqamaGovCover',1)]):grid(2,[Stat('سعر الشهر',fmtThousands(v.iqamaPerMonth??0),'ريال/شهر'),Stat('حد التغطية',fmtThousands(v.iqamaGovCover??0),'ريال')])
    if(title==='المهلة والغرامات')return ed?grid(3,[fld('iqamaGraceDays',1),fld('iqamaFine1',1),fld('iqamaFine2',1)]):grid(3,[Stat('أيام المهلة',v.iqamaGraceDays??'—','يوم'),Stat('غرامة أولى',fmtThousands(v.iqamaFine1??0),'ريال'),Stat('غرامة ثانية',fmtThousands(v.iqamaFine2??0),'ريال')])
    if(title==='كرت العمل (رخصة العمل)'){const wc=v.iqamaWpBasis==='workcard';const rst=v.iqamaWpResetEnabled===true;return(<div style={{display:'flex',flexDirection:'column',gap:12}}>
      {sub('أساس الاحتساب')}{ed?seg('iqamaWpBasis',[{val:'iqama',l:'انتهاء الإقامة',sub:'الافتراضي'},{val:'workcard',l:'انتهاء كرت العمل',sub:'تاريخ مستقل'}]):pill(wc?'الأساس: كرت العمل':'الأساس: الإقامة',C.gold)}
      {sub('بالإعفاء · السعر الثابت')}{ed?grid(4,[fld('workPermit3M',1),fld('workPermit6M',1),fld('workPermit9M',1),fld('workPermit12M',1)]):grid(4,[Stat('٣ أشهر',fmtThousands(v.workPermit3M??0)),Stat('٦ أشهر',fmtThousands(v.workPermit6M??0)),Stat('٩ أشهر',fmtThousands(v.workPermit9M??0)),Stat('١٢ شهر',fmtThousands(v.workPermit12M??0))])}
      {sub('بدون إعفاء')}{ed?grid(4,[fld('workPermitNoExempt3M',1),fld('workPermitNoExempt6M',1),fld('workPermitNoExempt9M',1),fld('workPermitNoExempt12M',1)]):grid(4,[Stat('٣ أشهر',fmtThousands(v.workPermitNoExempt3M??0)),Stat('٦ أشهر',fmtThousands(v.workPermitNoExempt6M??0)),Stat('٩ أشهر',fmtThousands(v.workPermitNoExempt9M??0)),Stat('١٢ شهر',fmtThousands(v.workPermitNoExempt12M??0))])}
      {sub('التسعير اليومي وبداية الفترة')}{ed?grid(3,[fld('workPermitDailyAfter',1),fld('workPermitCutoffDate',1),fld('workPermitProcDays',1)]):grid(3,[Stat('سعر اليوم',fmtThousands(v.workPermitDailyAfter??0),'ريال/يوم'),Stat('تاريخ التفعيل',v.workPermitCutoffDate||'—'),Stat('أيام المعالجة',v.workPermitProcDays??'—','يوم')])}
      <div style={{display:'flex',flexDirection:'column',gap:8,padding:'11px 13px',borderRadius:10,background:rst?'rgba(176,125,0,.05)':'rgba(255,255,255,.02)',border:`1px solid ${rst?C.gold+'33':'rgba(255,255,255,.07)'}`}}>
        {ed?sw('iqamaWpResetEnabled','قاعدة المنتهية من مدة طويلة: مفعّلة','قاعدة المنتهية من مدة طويلة: معطّلة'):pill(rst?'قاعدة المنتهية من مدة طويلة: مفعّلة':'قاعدة المنتهية من مدة طويلة: معطّلة',rst?C.ok:C.red)}
        {rst&&(ed?grid(2,[fld('iqamaWpResetAfterDays',1),fld('iqamaWpIssuanceDays',1)]):<span style={{fontSize:11,color:'var(--tx4)',fontWeight:600}}>بعد {v.iqamaWpResetAfterDays??365} يوم ← إصدار جديد من اليوم + {v.iqamaWpIssuanceDays??5} أيام</span>)}
      </div></div>)}
    if(title==='رسوم تغيير المهنة'){const fc=Array.isArray(v.profChangeFreeOccupations)?v.profChangeFreeOccupations.length:0;return(<div style={{display:'flex',flexDirection:'column',gap:10}}>{ed?fld('profChange',1):grid(2,[Stat('رسوم تغيير المهنة',fmtThousands(v.profChange??0),'ريال'),Stat('مهن معفاة',fc,'مهنة')])}{ed?renderProfChangeFreePicker():null}</div>)}
    if(title==='رسوم المكتب'){const daily=v.iqamaOfficeFeeMode==='daily';return(<div style={{display:'flex',flexDirection:'column',gap:12}}>
      {sub('طريقة الحساب')}{ed?seg('iqamaOfficeFeeMode',[{val:'flat',l:'سعر ثابت',sub:'نفس المبلغ'},{val:'daily',l:'يومي',sub:'سعر اليوم × الأيام'}]):pill(daily?'الوضع: يومي':'الوضع: سعر ثابت',C.gold)}
      {ed?grid(2,[fld('officeFee',1),fld('officeDailyRate',1)]):grid(2,[Stat('السعر الثابت',fmtThousands(v.officeFee??0),'ريال'),Stat('سعر اليوم',fmtThousands(v.officeDailyRate??0),'ريال/يوم')])}
      {sub('الخصم عند التصديق')}{ed?sw('iqamaOfficeDiscountEnabled','مسموح بخصم المكتب','خصم المكتب معطّل'):pill(v.iqamaOfficeDiscountEnabled!==false?'خصم المكتب: مسموح':'خصم المكتب: غير مسموح',v.iqamaOfficeDiscountEnabled!==false?C.ok:C.red)}</div>)}
    if(title==='التأمين الطبي'){const bk=Array.isArray(v.medicalBrackets)?v.medicalBrackets:[];return ed?renderIqamaMedicalBody():(<div style={{display:'flex',flexDirection:'column',gap:11}}>
      {grid(3,[Stat('سريان التأمين',v.medicalGraceMonths??2,'شهر'),Stat('أيام إضافية',v.medicalGraceDays??10,'يوم'),Stat('حد تغطية المكتب',fmtThousands(v.medGovCover??1000),'ريال')])}
      {bk.length?<div style={{display:'flex',flexWrap:'wrap',gap:8}}>{bk.map((b,i)=>(<span key={i} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'7px 12px',borderRadius:10,background:'var(--card-bg)',border:'1px solid var(--bd)',fontSize:11.5,fontWeight:600}}><span style={{color:'var(--tx3)'}}>{b.min}-{b.max} سنة</span><span style={{color:C.gold,fontWeight:600,direction:'ltr'}}>{fmtThousands(b.rate)} ريال</span></span>))}</div>:<div style={{fontSize:11,color:'var(--tx5)',textAlign:'center',padding:'8px 0'}}>لا توجد فئات</div>}
    </div>)}
    return null
  }
  const saveMap={
    'الرسوم الحكومية لتجديد الإقامة':{keys:['iqamaPerMonth','iqamaGovCover']},
    'المهلة والغرامات':{keys:['iqamaGraceDays','iqamaFine1','iqamaFine2']},
    'كرت العمل (رخصة العمل)':{keys:['workPermit3M','workPermit6M','workPermit9M','workPermit12M','workPermitNoExempt3M','workPermitNoExempt6M','workPermitNoExempt9M','workPermitNoExempt12M','workPermitDailyAfter','workPermitCutoffDate','workPermitProcDays','iqamaWpBasis','iqamaWpResetEnabled','iqamaWpResetAfterDays','iqamaWpIssuanceDays']},
    'رسوم تغيير المهنة':{keys:['profChange'],extra:['profChangeFreeOccupations']},
    'رسوم المكتب':{keys:['officeFee','officeDailyRate','iqamaOfficeFeeMode','iqamaOfficeDiscountEnabled']},
    'التأمين الطبي':{keys:['medicalGraceMonths','medicalGraceDays','medGovCover'],extra:['medicalBrackets']},
  }
  const titles=['الرسوم الحكومية لتجديد الإقامة','المهلة والغرامات','كرت العمل (رخصة العمل)','رسوم تغيير المهنة','رسوم المكتب','التأمين الطبي']
  return(<div style={{display:'flex',flexDirection:'column',gap:12}}>
    {titles.map(title=>{const col=isC(title),ed=isE(title);const cfgS=saveMap[title]
      return(<div key={title} {...secCardProps(col)}>
        {cardEditAllowed&&!col&&!ed&&<EditTab onClick={()=>startEdit(title)}/>}
        {!col&&ed&&<EditActionTabs onSave={()=>{saveSection(s.id,cfgS.keys.map(k=>({k})),title,cfgS.extra||[]);finishEdit(title)}} onCancel={()=>cancelEdit(title)}/>}
        <SectionHead title={title} isCollapsed={col} onToggle={()=>toggleSection(title)}/>
        {!col&&<div style={{padding:'2px 4px'}}>{content(title,ed)}</div>}
      </div>)})}
  </div>)
}
// بطاقة سياسات نقل الكفالة — مطابقة لتجديد الإقامة (أساس الاحتساب · قاعدة المنتهية). حفظ فوري.
// وضع رسوم المكتب + سياسة الخصم انتقلا إلى بطاقة «رسوم المكتب» نفسها (كما في تجديد الإقامة).
const renderKafalaPolicyCard=(s)=>{
  const v=priceState
  const save=(k,val)=>{setPriceState(p=>({...p,[k]:val}));setPricing(s.id,{[k]:val})}
  const wc=v.kafalaWpBasis==='workcard'
  const resetOn=v.kafalaWpResetEnabled===true
  const seg=(sel,onSel,label,sub)=>(
    <button type="button" onClick={onSel} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'10px 8px',borderRadius:10,border:`1px solid ${sel?C.gold:'var(--bd)'}`,background:sel?'rgba(176,125,0,.12)':'var(--bd2)',color:sel?C.gold:'var(--tx3)',cursor:'pointer',fontFamily:F,transition:'.15s'}}>
      <span style={{fontSize:12,fontWeight:600}}>{label}</span><span style={{fontSize:9,fontWeight:600,opacity:.8}}>{sub}</span>
    </button>
  )
  const Switch=(on,onToggle)=>(
    <button type="button" onClick={onToggle} style={{width:46,height:24,borderRadius:999,border:'none',background:on?C.ok:'rgba(192,57,43,.7)',cursor:'pointer',position:'relative',flexShrink:0,padding:0,boxShadow:'0 2px 6px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.12)'}}>
      <span style={{position:'absolute',width:18,height:18,borderRadius:'50%',background:'#fff',top:3,right:on?3:25,transition:'.2s'}}/>
    </button>
  )
  const lbl=(t)=>(<span style={{fontSize:11.5,fontWeight:600,color:'var(--tx2)'}}>{t}</span>)
  const numF=(k,ph)=>(<input type="text" inputMode="numeric" defaultValue={v[k]??''} onBlur={e=>save(k,e.target.value.replace(/[^0-9]/g,''))} placeholder={ph} style={{...inpS,height:36,width:90,textAlign:'center',direction:'ltr'}}/>)
  return(
    <div className="svc-section" style={{marginTop:14}}>
      <div className="svc-section-head"><span className="svc-section-head-l"><span style={{width:6,height:6,borderRadius:'50%',background:C.gold,flexShrink:0}}/> سياسات الاحتساب (مطابقة لتجديد الإقامة)</span></div>
      <div className="svc-section-body" style={{display:'flex',flexDirection:'column',gap:18,padding:'18px 22px'}}>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {lbl('أساس احتساب رخصة العمل')}
          <div style={{display:'flex',gap:8}}>{seg(!wc,()=>save('kafalaWpBasis','iqama'),'انتهاء الإقامة','الافتراضي')}{seg(wc,()=>save('kafalaWpBasis','workcard'),'انتهاء كرت العمل','تاريخ مستقل')}</div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:10,padding:'12px 14px',borderRadius:10,background:resetOn?'rgba(176,125,0,.05)':'rgba(255,255,255,.02)',border:`1px solid ${resetOn?C.gold+'33':'rgba(255,255,255,.07)'}`}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
            <div style={{display:'flex',flexDirection:'column',gap:2,minWidth:0}}>{lbl('قاعدة المنتهية من مدة طويلة')}<span style={{fontSize:10,color:'var(--tx4)',fontWeight:600}}>إصدار جديد من اليوم بدل احتساب التأخّر الطويل</span></div>
            {Switch(resetOn,()=>save('kafalaWpResetEnabled',!resetOn))}
          </div>
          {resetOn&&<div style={{display:'flex',gap:14,flexWrap:'wrap'}}>
            <div style={{display:'flex',flexDirection:'column',gap:5}}><span style={{fontSize:10,color:'var(--tx4)',fontWeight:600}}>حدّ التأخّر (يوم)</span>{numF('kafalaWpResetAfterDays','365')}</div>
            <div style={{display:'flex',flexDirection:'column',gap:5}}><span style={{fontSize:10,color:'var(--tx4)',fontWeight:600}}>أيام الإصدار الجديد</span>{numF('kafalaWpIssuanceDays','5')}</div>
          </div>}
        </div>
      </div>
    </div>
  )
}
const renderIqamaPages=(s)=>IQAMA_WIZARD_STEPS.map(step=>({
  // لا نمرّر title للصفحة كي لا يتكرّر مع عنوان ModalSection — تكفي نقاط التقدّم + عنوان القسم.
  valid:true,
  content:(
    <ModalSection Icon={step.icon||Coins} label={step.title} hint={step.medical?'فئات عمرية':step.basisStep?'سياسة':step.discountStep?'سياسة':step.wpReset?'قاعدة':step.officeStep?'وضع':step.picker?'رسم + إعفاء':`${step.fields.length} حقل`}>
      {stepNoteBox(step.note)}
      {step.medical
        ? renderIqamaMedicalBody()
        : step.basisStep
        ? renderIqamaBasisBody()
        : step.discountStep
        ? renderIqamaDiscountBody()
        : step.wpReset
        ? renderIqamaWpResetBody(step)
        : step.officeStep
        ? renderIqamaOfficeBody(step)
        : <>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>{step.fields.map(f=>renderFeeFieldRow(f.k,f.desc))}</div>
            {step.picker&&renderProfChangeFreePicker()}
          </>}
    </ModalSection>
  )
}))
// خطوة معامل السعودة — نفس تأطير الخطوة الأولى تماماً (ModalSection بحقول مباشرة)،
// مع زر تفعيل/تعطيل في الأعلى ووصف الصيغة. لا إطار داخلي مكرّر.
const renderSaudSection=()=>{
  const on=priceState.saudizationEnabled!==false
  return(
    <ModalSection Icon={Users} label="معامل السعودة" hint="بند اختياري">
      <div style={{display:'grid',gridTemplateColumns:'1fr',gap:14}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
          <div style={{fontSize:11,color:'var(--tx4)',fontWeight:600,lineHeight:1.7}}>رسم إضافي = (الحد − عدد عمال منشأة العامل) بحد أدنى 1 × رسم كل عامل</div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5,flexShrink:0}}>
            <button type="button" onClick={()=>setPriceState(p=>({...p,saudizationEnabled:!on}))} title={on?'اضغط للتعطيل':'اضغط للتفعيل'}
              style={{width:46,height:24,borderRadius:999,border:'none',background:on?C.ok:'rgba(192,57,43,.7)',cursor:'pointer',position:'relative',transition:'.2s',padding:0,boxShadow:'0 2px 6px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.12)'}}>
              <span style={{position:'absolute',width:18,height:18,borderRadius:'50%',background:'#fff',top:3,right:on?3:25,transition:'.2s'}}/>
            </button>
            <span style={{fontSize:9.5,fontWeight:600,color:on?C.ok:C.red}}>{on?'مفعّل':'معطّل'}</span>
          </div>
        </div>
        <div style={{opacity:on?1:.4,pointerEvents:on?'auto':'none',display:'grid',gridTemplateColumns:'1fr',gap:12}}>
          {SAUD_FIELDS.map(renderFeeField)}
        </div>
      </div>
    </ModalSection>
  )
}
// Override wizard — step 1: branch multi-select (excludes branches that already have an override,
// except the one currently being edited). Uses the same chip-grid look as the legacy inline editor.
const renderOvBranchPicker=(svcId)=>{
  const used=new Set(getOverridesForSvc(svcId).map(o=>o.branchId).filter(b=>!ovBranchIds.includes(b)))
  const available=branches.filter(b=>!used.has(b.id))
  const toggle=id=>setOvBranchIds(cur=>cur.includes(id)?cur.filter(x=>x!==id):[...cur,id])
  return(
    <ModalSection flex Icon={Building2} label={T('المكاتب','Branches')} hint={ovBranchIds.length?`${ovBranchIds.length} ${T('محدّد','selected')}`:T('اختر مكتباً أو أكثر','pick one or more')}>
      {available.length===0
        ? <div style={{padding:24,textAlign:'center',fontSize:12,color:'var(--tx5)',fontWeight:500}}>{T('كل المكاتب لها تخصيص بالفعل','All branches already have an override')}</div>
        : <ScrollBox fill>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(96px,1fr))',gap:11,padding:'4px 2px 6px 18px'}}>
              {available.map(b=>{const sel=ovBranchIds.includes(b.id);return(
                <button key={b.id} type="button" onClick={()=>toggle(b.id)}
                  style={{height:40,borderRadius:9,border:`1px solid ${sel?C.gold:'var(--bd)'}`,background:sel?'rgba(176,125,0,.18)':'var(--bd2)',color:C.gold,fontFamily:'monospace',fontSize:13,fontWeight:600,cursor:'pointer',direction:'ltr',transition:'.15s',boxShadow:sel?`0 0 0 1px ${C.gold}33`:'none',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6}}>
                  {sel&&<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  <span>{b.branch_code}</span>
                </button>)})}
            </div>
          </ScrollBox>}
    </ModalSection>
  )
}
// Override wizard — step 2: pricing fields (FormKit format-gallery style), bound to ovPricing.
const renderOvPricingFields=(svcId)=>{
  const sch=PRICING_SCHEMA[svcId]
  if(!sch)return null
  const fields=sch.fields.filter(f=>!f.k?.startsWith('__')&&f._section!=='saud'&&f.t!=='bool'&&f.t!=='mode')
  const isMoney=f=>!f.sfx||/ريال/.test(f.sfx)
  return(
    <ModalSection Icon={Coins} label={T('السعر الافتراضي','Default price')} hint={`${fields.length} ${T('حقل','fields')}`}>
      <div style={{display:'grid',gridTemplateColumns:'1fr',gap:12}}>
        {fields.map(f=>isMoney(f)
          ? <CurrencyField key={f.k} label={f.l} unit={f.sfx||'ريال'}
              value={ovPricing[f.k]??''} placeholder={String(f.d)}
              onChange={v=>setOvPricing(p=>({...p,[f.k]:v}))}/>
          : <NumberField key={f.k} label={f.l} placeholder={String(f.d)}
              value={ovPricing[f.k]??''}
              onChange={v=>setOvPricing(p=>({...p,[f.k]:v}))}/>
        )}
      </div>
    </ModalSection>
  )
}

// Compact row card for the list view — click opens the detail page.
const renderRow=(s)=>{
  const st=getState(s.id)
  const I=s.Icon
  const tone=!st.active?C.red:(!st.billable?C.ok:C.gold)
  const ovs=getOverridesForSvc(s.id)
  const sp=samplePrice(s.id)
  const hasPrice=!!PRICING_SCHEMA[s.id]
  // Activity strip width = active branches ratio (default + non-disabled overrides)
  const totalBr=branches.length||1
  const disabledOv=ovs.filter(o=>o.active===false).length
  const effActive=st.active?(totalBr-disabledOv):0
  const pct=Math.min(100,Math.round((effActive/totalBr)*100))
  return(
    <div key={s.id} className="brs-row" onClick={()=>setSelectedSvcId(s.id)}
      style={{position:'relative',cursor:'pointer',borderRadius:14,background:`radial-gradient(ellipse at top, ${tone}10 0%, var(--card-bg) 60%)`,border:'1px solid var(--bd)',boxShadow:'0 4px 14px rgba(0,0,0,.22)',overflow:'hidden',opacity:st.active?1:.7,transition:'.15s'}}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=`${tone}55`}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.05)'}}>
      <div style={{padding:'16px 22px 14px 18px'}}>
        <div className="svc-row-grid">
          {/* Right (info): icon + name + tags */}
          <div style={{minWidth:0,display:'flex',alignItems:'center',gap:12}}>
            <I size={28} strokeWidth={1.8} color={C.gold} style={{flexShrink:0}}/>
            <div style={{minWidth:0,flex:1,display:'flex',flexDirection:'column',gap:6}}>
              <span style={{fontSize:17,fontWeight:600,color:'var(--tx)',letterSpacing:'-.2px'}}>{s.name_ar}</span>
              <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                <span style={{fontSize:10,fontWeight:600,padding:'3px 8px',borderRadius:6,background:`${st.active?C.ok:C.red}18`,color:st.active?C.ok:C.red,border:`1px solid ${st.active?C.ok:C.red}38`,display:'inline-flex',alignItems:'center',gap:4,flexShrink:0}}>
                  <span style={{width:5,height:5,borderRadius:'50%',background:st.active?C.ok:C.red}}/>
                  {st.active?'فعّالة':'معطّلة'}
                </span>
                {!st.billable&&<span style={{fontSize:10,fontWeight:600,padding:'3px 8px',borderRadius:6,background:`${C.ok}18`,color:C.ok,border:`1px solid ${C.ok}38`,display:'inline-flex',alignItems:'center',gap:4,flexShrink:0}}>
                  <Gift size={9} strokeWidth={2.8}/> مجانية
                </span>}
              </div>
            </div>
          </div>

          {/* Vertical divider */}
          <div className="svc-row-divider" style={{width:1,alignSelf:'stretch',background:'var(--bd)',minHeight:60}}/>

          {/* Left (stats): default price + overrides */}
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:10,color:'var(--tx4)',fontWeight:600,letterSpacing:'.3px',textTransform:'uppercase'}}>{st.billable?'السعر':'التشغيل'}</span>
              <span style={{fontSize:10,color:'var(--tx4)',fontWeight:600}}>{hasPrice?`${PRICING_SCHEMA[s.id].fields.length} حقل`:'ديناميكي'}</span>
            </div>
            <div style={{fontSize:24,fontWeight:600,color:st.billable?C.gold:(st.active?C.ok:C.red),fontVariantNumeric:'tabular-nums',direction:'ltr',letterSpacing:'-.5px',lineHeight:1}}>
              {st.billable?(sp?Number(sp.value).toLocaleString('en-US'):'—'):(st.active?'مجانية':'معطّلة')}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:3,paddingTop:6,borderTop:'1px solid var(--bd)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:11}}>
                <span style={{color:'var(--tx4)',fontWeight:600}}>تخصيصات</span>
                <span style={{color:ovs.length?C.gold:'var(--tx5)',fontWeight:600,direction:'ltr',fontVariantNumeric:'tabular-nums'}}>{ovs.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const renderCard=(s)=>{
const st=getState(s.id)
const I=s.Icon
const isOpen=expanded===s.id
const hasPrice=!!PRICING_SCHEMA[s.id]
const accent=!st.active?C.red:(!st.billable?C.ok:C.gold)
const baseShadow='0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'
return<div key={s.id} style={{...GLASS_CARD,display:'flex',flexDirection:'column',opacity:!st.active?.92:1,overflow:'hidden',transition:'.25s cubic-bezier(.4,0,.2,1)'}}
onMouseEnter={e=>{if(isOpen)return;e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 16px 36px rgba(0,0,0,.42), 0 4px 10px rgba(0,0,0,.22), 0 0 0 1px '+accent+'33, inset 0 1px 0 rgba(255,255,255,.08)'}}
onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow=baseShadow}}>
<div style={{padding:'18px 22px',display:'flex',alignItems:'center',gap:14}}>
<div style={{width:44,height:44,borderRadius:11,background:'linear-gradient(180deg,rgba(176,125,0,.14),rgba(176,125,0,.06))',border:'1px solid rgba(176,125,0,.25)',display:'flex',alignItems:'center',justifyContent:'center',color:C.gold,flexShrink:0,boxShadow:'inset 0 1px 0 rgba(255,255,255,.05)'}}>
<I size={20} strokeWidth={1.8}/>
</div>
<div style={{flex:1,minWidth:0}}>
<div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4,flexWrap:'wrap'}}>
<span style={{fontSize:14,fontWeight:600,color:'var(--tx)',fontFamily:F}}>{s.name_ar}</span>
{!st.billable&&<span style={{fontSize:10,fontWeight:600,padding:'4px 10px',borderRadius:6,background:C.ok+'15',color:C.ok,display:'inline-flex',alignItems:'center',gap:5}}><span style={{width:5,height:5,borderRadius:'50%',background:C.ok}}/>مجانية</span>}
{!st.active&&<span style={{fontSize:10,fontWeight:600,padding:'4px 10px',borderRadius:6,background:C.red+'15',color:C.red,display:'inline-flex',alignItems:'center',gap:5}}><span style={{width:5,height:5,borderRadius:'50%',background:C.red}}/>معطّلة</span>}
</div>
<div style={{fontSize:11,color:'var(--tx5)',fontFamily:F,direction:'ltr',fontWeight:500}}>{s.id}</div>
</div>
{/* Edit price button */}
{hasPrice&&st.billable&&<button type="button" onClick={()=>openPrice(s.id)} title={isOpen?'طيّ التفاصيل':'عرض التفاصيل'}
style={{height:40,padding:'0 14px',borderRadius:11,border:isOpen?'1px solid rgba(176,125,0,.45)':'1px solid var(--bd)',background:isOpen?'linear-gradient(180deg,rgba(176,125,0,.16),rgba(176,125,0,.08))':'var(--card-bg)',color:isOpen?C.gold:'var(--tx2)',fontFamily:F,fontSize:12,fontWeight:500,cursor:'pointer',display:'flex',alignItems:'center',gap:8,boxShadow:isOpen?'0 2px 8px rgba(176,125,0,.18), inset 0 1px 0 rgba(176,125,0,.18)':'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s',flexShrink:0}}>
<span>{isOpen?'إخفاء التسعير':'عرض التسعير'}</span>
{isOpen?<ChevronUp size={14} strokeWidth={2.2}/>:<ChevronDown size={14} strokeWidth={2.2}/>}
</button>}
{/* Billable toggle */}
<div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5}}>
<button type="button" onClick={()=>update(s.id,'billable',!st.billable)} title={st.billable?'اضغط لجعلها مجانية':'اضغط لجعلها مفوترة'}
style={{width:46,height:24,borderRadius:999,border:'none',background:st.billable?C.gold:'rgba(39,160,70,.7)',cursor:'pointer',position:'relative',transition:'.2s',padding:0,boxShadow:'0 2px 6px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.12)'}}>
<span style={{position:'absolute',width:18,height:18,borderRadius:'50%',background:'#fff',top:3,right:st.billable?3:25,transition:'.2s',display:'flex',alignItems:'center',justifyContent:'center'}}>
{st.billable?<DollarSign size={10} color={C.gold} strokeWidth={3}/>:<Gift size={10} color={C.ok} strokeWidth={3}/>}
</span>
</button>
<span style={{fontSize:10,fontWeight:600,color:st.billable?C.gold:C.ok,fontFamily:F}}>{st.billable?'مفوترة':'مجانية'}</span>
</div>
{/* Active toggle */}
<div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5}}>
<button type="button" onClick={()=>update(s.id,'active',!st.active)} title={st.active?'اضغط للتعطيل':'اضغط للتفعيل'}
style={{width:46,height:24,borderRadius:999,border:'none',background:st.active?C.ok:'rgba(192,57,43,.7)',cursor:'pointer',position:'relative',transition:'.2s',padding:0,boxShadow:'0 2px 6px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.12)'}}>
<span style={{position:'absolute',width:18,height:18,borderRadius:'50%',background:'#fff',top:3,right:st.active?3:25,transition:'.2s',display:'flex',alignItems:'center',justifyContent:'center'}}>
{st.active?<Power size={10} color={C.ok} strokeWidth={3}/>:<PowerOff size={10} color={C.red} strokeWidth={3}/>}
</span>
</button>
<span style={{fontSize:10,fontWeight:600,color:st.active?C.ok:C.red,fontFamily:F}}>{st.active?'فعّالة':'معطّلة'}</span>
</div>
</div>
{/* Per-branch overrides strip */}
{(() => {
  const ovs=getOverridesForSvc(s.id)
  return(
    <div style={{padding:'10px 22px 14px',borderTop:'1px solid var(--bd2)',display:'flex',flexDirection:'column',gap:8,background:'rgba(0,0,0,.10)'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
        <span style={{fontSize:11,fontWeight:600,color:'var(--tx3)',display:'inline-flex',alignItems:'center',gap:6}}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>
          تخصيص لكل مكتب {ovs.length>0&&<span style={{padding:'1px 7px',borderRadius:999,background:'rgba(176,125,0,.14)',color:C.gold,fontWeight:600,fontSize:10}}>{ovs.length}</span>}
        </span>
        <button type="button" onClick={()=>openOverrideEditor(s.id,null)}
          style={{height:28,padding:'0 10px',borderRadius:7,border:'1px dashed rgba(176,125,0,.35)',background:'transparent',color:C.gold,fontFamily:F,fontSize:11,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:4}}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          إضافة تخصيص
        </button>
      </div>
      {ovs.length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:6}}>
        {ovs.map(o=>{
          const br=branches.find(b=>b.id===o.branchId)
          const code=br?.branch_code||'—'
          const aOff=o.active===false
          const bOff=typeof o.billable==='boolean'&&o.billable!==(s.defaultBillable!==false)
          const pCount=o.pricing?Object.keys(o.pricing).length:0
          return(
            <span key={o.branchId} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'4px 4px 4px 10px',borderRadius:999,background:'rgba(176,125,0,.08)',border:'1px solid rgba(176,125,0,.25)',fontSize:11,fontWeight:600,color:'var(--tx)'}}>
              <button type="button" onClick={()=>openOverrideEditor(s.id,o.branchId)} title="تعديل التخصيص" style={{background:'transparent',border:'none',padding:0,cursor:'pointer',color:'inherit',fontFamily:F,fontWeight:600,display:'inline-flex',alignItems:'center',gap:5}}>
                <span style={{color:C.gold,direction:'ltr',fontFamily:'monospace'}}>{code}</span>
                {aOff&&<span title="معطّلة" style={{color:C.red,fontSize:10}}>✗</span>}
                {!aOff&&bOff&&<span title="مجانية" style={{color:C.ok,fontSize:10}}>$</span>}
                {pCount>0&&<span style={{padding:'1px 6px',borderRadius:999,background:'rgba(176,125,0,.18)',color:C.gold,fontSize:9}}>{pCount} سعر</span>}
              </button>
              <button type="button" onClick={()=>removeBranchOverride(o.branchId,s.id)} title="حذف" style={{width:18,height:18,borderRadius:'50%',border:'none',background:'rgba(192,57,43,.18)',color:C.red,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',padding:0}}>
                <X size={9} strokeWidth={3}/>
              </button>
            </span>
          )
        })}
      </div>}
    </div>
  )
})()}
{/* Expandable price editor */}
{isOpen&&<div style={{padding:'24px 22px 18px',borderTop:'1px solid var(--bd)',background:'rgba(0,0,0,.18)'}}>
{renderPriceEditor(s)}
</div>}
</div>
}

const sectionCard={...GLASS_CARD,padding:'16px 18px',display:'flex',flexDirection:'column',gap:12}
const sectionHead={display:'flex',alignItems:'center',gap:8,paddingBottom:10,borderBottom:'1px solid var(--bd)'}
const sectionTitle={fontSize:13,fontWeight:600,color:'var(--tx)',display:'inline-flex',alignItems:'center',gap:8}
const sectionIconBox={width:28,height:28,borderRadius:8,background:'linear-gradient(180deg,rgba(176,125,0,.14),rgba(176,125,0,.06))',border:'1px solid rgba(176,125,0,.25)',display:'inline-flex',alignItems:'center',justifyContent:'center',color:C.gold}

// KPI counts
const totalCount=ALL_SERVICES.length
const activeCount=ALL_SERVICES.filter(s=>{const st=getState(s.id);return st.active}).length
const billableCount=ALL_SERVICES.filter(s=>{const st=getState(s.id);return st.billable&&st.active}).length
const freeCount=ALL_SERVICES.filter(s=>{const st=getState(s.id);return !st.billable&&st.active}).length
const disabledCount=totalCount-activeCount

const filterSvcs=(list)=>{
  const q=searchQ.trim().toLowerCase()
  if(!q)return list
  return list.filter(s=>(s.name_ar||'').toLowerCase().includes(q)||(s.id||'').toLowerCase().includes(q))
}
const filteredMain=filterSvcs(mainSvcs)
const filteredOther=filterSvcs(otherSvcs)

// ─── Helpers shared between list and detail views ───
const selectedSvc=selectedSvcId?ALL_SERVICES.find(s=>s.id===selectedSvcId):null

// Effective default sample price for the row stat.
// Prefers the schema's "footer" field (the total/aggregate, e.g. defaultTotal for visas);
// falls back to the first numeric field if no footer field is present.
const samplePrice=(svcId)=>{
  const sch=PRICING_SCHEMA[svcId];if(!sch)return null
  const def=getPricing(svcId)||{}
  const valid=f=>def[f.k]!=null&&def[f.k]!==''&&!isNaN(Number(def[f.k]))
  const f=sch.fields.find(f=>f._footer&&valid(f))||sch.fields.find(valid)
  return f?{value:Number(def[f.k]),sfx:f.sfx,label:f.l}:null
}

const SVC_LIST_STYLES=(<style>{`
  .svc-hero{display:grid;grid-template-columns:2.2fr 1fr 1.5fr;gap:14px;margin-bottom:24px}
  @media (max-width: 1100px){.svc-hero{grid-template-columns:1fr 1fr}.svc-hero > :nth-child(3){grid-column:1/-1}}
  @media (max-width: 720px){.svc-hero{grid-template-columns:1fr}}
  .svc-row-grid{display:grid;grid-template-columns:1fr 1px 240px;gap:18px;align-items:center}
  @media (max-width: 720px){.svc-row-grid{grid-template-columns:1fr;gap:12px}.svc-row-divider{display:none}}
  .svc-section{background:var(--card-grad2);border:1px solid var(--bd);border-radius:16px;overflow:hidden;margin-bottom:14px}
  .svc-section-head{padding:14px 22px;border-bottom:1px solid var(--bd);display:flex;align-items:center;justify-content:space-between;gap:10px}
  .svc-section-head-l{display:inline-flex;align-items:center;gap:10px;font-size:16px;font-weight:600;color:#B07D00;letter-spacing:.2px}
  .svc-section-body{padding:18px 22px}
  .svc-section-count{padding:2px 8px;border-radius:999px;background:var(--bd);font-size:10px;font-weight:600;color:var(--tx3)}
`}</style>)

// ═══════════════════════════════════════════════════════════════
// DETAIL VIEW — opens when a service is clicked from the list
// ═══════════════════════════════════════════════════════════════
if(selectedSvc){
  const s=selectedSvc
  const I=s.Icon
  const st=getState(s.id)
  const tone=!st.active?C.red:(!st.billable?C.ok:C.gold)
  const hasPrice=!!PRICING_SCHEMA[s.id]
  const sp=samplePrice(s.id)
  const ovs=getOverridesForSvc(s.id)
  // Bar shows overrides distribution: how many disable / change billable / change pricing
  const ovDisabled=ovs.filter(o=>o.active===false).length
  const ovBillable=ovs.filter(o=>typeof o.billable==='boolean').length
  const ovPriced=ovs.filter(o=>o.pricing&&Object.keys(o.pricing).length>0).length
  return<div style={{paddingTop:0,paddingBottom:80,direction:'rtl',fontFamily:F,color:'var(--tx2)'}}>
    {SVC_LIST_STYLES}

    {/* Top bar — back button */}
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,gap:12,flexWrap:'wrap'}}>
      <BackButton onBack={()=>setSelectedSvcId(null)} />
    </div>

    {/* Header — icon + name title + subtitle (matches ClientDetailPage) */}
    <div style={{marginBottom:18,marginTop:6}}>
      <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <I size={26} color={C.gold} strokeWidth={1.8} style={{flexShrink:0}}/>
        <div style={{fontSize:22,fontWeight:600,color:C.gold,letterSpacing:'-.2px'}}>{(isAr?(s.name_ar||s.name_en):(s.name_en||s.name_ar))||T('تفاصيل الخدمة','Service details')}</div>
      </div>
      <div style={{fontSize:13,fontWeight:500,color:'var(--tx4)',marginTop:10,lineHeight:1.6}}>{T('عرض تفاصيل الخدمة وتسعيرها الافتراضي وتخصيصات المكاتب.','Service details, default pricing and branch overrides.')}</div>
    </div>

    <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:14,alignItems:'flex-start'}}>
    {/* Main column (right in RTL) — scrolling content: pricing + overrides */}
    <div>

    {/* Section: Default pricing editor (full editor inline) — hidden while a branch-override editor for this service is open (single-mount: it reuses the same priceState). */}
    {cardVisible(user,'admin_services','default_pricing')&&hasPrice&&st.billable&&!(priceBranchCtx&&overrideEditor?.svcId===s.id)&&(()=>{
      // Lazy-init priceState for this service so the editor renders correctly (skip while in override mode).
      if(expanded!==s.id&&!priceBranchCtx){setTimeout(()=>{setExpanded(s.id);setPriceState(getPricing(s.id)||{});setCollapsed(Object.fromEntries(ALL_KAFALA_SECTIONS.map(t=>[t,true])));setEditing({})},0)}
      return(
        <div className="svc-section">
          <div className="svc-section-head">
            <span className="svc-section-head-l">
              <span style={{width:6,height:6,borderRadius:'50%',background:C.gold,flexShrink:0}}/> التسعير الافتراضي (لكل المكاتب)
            </span>
            <span style={{display:'inline-flex',alignItems:'center',gap:12}}>
              {canCardBtn(user,'admin_services','default_pricing','edit')&&s.id!=='kafala_transfer'&&s.id!=='iqama_renewal'&&(
                <button type="button" onClick={openPriceModal}
                  onMouseEnter={e=>{e.currentTarget.style.background='rgba(176,125,0,.12)'}}
                  onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}
                  style={{height:32,padding:'0 14px',borderRadius:9,background:'transparent',border:'1px dashed rgba(176,125,0,.5)',color:C.gold,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:7,transition:'background .15s ease, border-color .15s ease'}}>
                  تعديل
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </button>
              )}
            </span>
          </div>
          <div className="svc-section-body" style={{padding:'18px 22px'}}>
            {s.id==='iqama_renewal'?renderIqamaInlineEditor(s,{canEdit:canCardBtn(user,'admin_services','default_pricing','edit')}):renderPriceEditor(s,{readOnly:true,canEdit:canCardBtn(user,'admin_services','default_pricing','edit')})}
          </div>
        </div>
      )
    })()}

    {/* Section: Document types (only for the «مستندات» service) — admin-managed dropdown options */}
    {cardVisible(user,'admin_services','document_types')&&s.id==='documents'&&(
      <div className="svc-section">
        <div className="svc-section-head">
          <span className="svc-section-head-l">
            <FileStack size={16} color={C.gold} strokeWidth={1.8}/>
            أنواع المستندات
            <span className="svc-section-count">{docTypes.length}</span>
          </span>
        </div>
        <div className="svc-section-body" style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{fontSize:11.5,color:'var(--tx5)',fontWeight:500,lineHeight:1.6}}>
            الأنواع المضافة هنا تظهر في قائمة «نوع المستند» عند إنشاء طلب مستندات.
          </div>
          {/* Existing types — rename inline or delete */}
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {docTypes.map(d=>(
              <div key={d.value} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:11,background:'rgba(0,0,0,.2)',border:'1px solid var(--bd)'}}>
                <FileStack size={14} color={C.gold} strokeWidth={2} style={{flexShrink:0,opacity:.8}}/>
                <input value={d.label} onChange={e=>renameDocType(d.value,e.target.value)} readOnly={!canCardBtn(user,'admin_services','document_types','edit')}
                  style={{...FORM_INPUT,height:36,flex:1,fontWeight:600}}/>
                {canCardBtn(user,'admin_services','document_types','delete')&&(
                <button type="button" onClick={()=>removeDocType(d.value)} title="حذف"
                  style={{width:30,height:30,borderRadius:8,border:'none',background:'rgba(192,57,43,.15)',color:C.red,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',padding:0,flexShrink:0}}>
                  <X size={13} strokeWidth={3}/>
                </button>
                )}
              </div>
            ))}
            {docTypes.length===0&&(
              <div style={{padding:20,textAlign:'center',color:'var(--tx5)',fontSize:11.5,border:'1px dashed var(--bd)',borderRadius:10}}>
                لا توجد أنواع — أضف نوعاً ليظهر في قائمة «نوع المستند»
              </div>
            )}
          </div>
          {/* Add new type */}
          {canCardBtn(user,'admin_services','document_types','create')&&(
          <div style={{display:'flex',alignItems:'center',gap:8,paddingTop:4,borderTop:'1px solid var(--bd)'}}>
            <input value={newDocLabel} onChange={e=>setNewDocLabel(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addDocType()}}}
              placeholder="اسم نوع المستند الجديد…" style={{...FORM_INPUT,height:38,flex:1}}/>
            <button type="button" onClick={addDocType} disabled={!newDocLabel.trim()}
              style={{height:38,padding:'0 16px',borderRadius:9,border:'1px dashed rgba(176,125,0,.5)',background:'transparent',color:C.gold,fontFamily:F,fontSize:12,fontWeight:600,cursor:newDocLabel.trim()?'pointer':'not-allowed',opacity:newDocLabel.trim()?1:.5,display:'inline-flex',alignItems:'center',gap:7,whiteSpace:'nowrap'}}>
              إضافة
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
          )}
        </div>
      </div>
    )}

    {/* Section: Per-branch overrides */}
    {cardVisible(user,'admin_services','branch_overrides')&&(
    <div className="svc-section">
      <div className="svc-section-head">
        <span className="svc-section-head-l">
          <span style={{width:6,height:6,borderRadius:'50%',background:C.gold,flexShrink:0}}/>
          التخصيصات حسب المكتب
          <span className="svc-section-count">{ovs.length}</span>
        </span>
        {canCardBtn(user,'admin_services','branch_overrides','create')&&(
        <button type="button" onClick={()=>isSimplePricing(s.id)?openOvModal(s.id,null):openOverrideEditor(s.id,null)}
          onMouseEnter={e=>{e.currentTarget.style.background='rgba(176,125,0,.12)'}}
          onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}
          style={{height:32,padding:'0 14px',borderRadius:9,border:'1px dashed rgba(176,125,0,.5)',background:'transparent',color:C.gold,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:7,transition:'background .15s ease, border-color .15s ease'}}>
          إضافة تخصيص
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        )}
      </div>
      <div className="svc-section-body" style={{display:'flex',flexDirection:'column',gap:14}}>
        {ovs.length>0&&(()=>{
          const sch=PRICING_SCHEMA[s.id]
          const def=getPricing(s.id)||{}
          const baseBillable=s.defaultBillable!==false
          return(
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))',gap:10}}>
            {ovs.map(o=>{
              const br=branches.find(b=>b.id===o.branchId)
              const code=br?.branch_code||'—'
              const aOff=o.active===false
              const bDiff=typeof o.billable==='boolean'&&o.billable!==baseBillable
              const ovTotalField=sch?.fields?.find(f=>f._footer&&f.k==='defaultTotal')
              const ovGridFields=sch?.fields?.filter(f=>(!f.t||f.t==='text')&&!f._footer)||[]
              const allPriceFields=[...(ovTotalField?[ovTotalField]:[]),...ovGridFields]
              const fmtV=(x)=>x===undefined||x===null||x===''?'—':((typeof x==='number'||/^\d+(\.\d+)?$/.test(String(x)))?fmtNum(x):String(x))
              const pf=allPriceFields.map(f=>{const ovv=o.pricing?.[f.k];const has=ovv!==undefined&&ovv!==null&&ovv!=='';const dv=def[f.k]??f.d;return{f,ovv,has,dv}}).filter(x=>x.has)
              return(
                <div key={o.branchId} style={{display:'flex',flexDirection:'column',borderRadius:12,background:'rgba(0,0,0,.22)',border:'1px solid var(--bd)',overflow:'hidden'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,padding:'9px 11px',background:'rgba(0,0,0,.18)',borderBottom:'1px solid var(--bd)'}}>
                    <button type="button" disabled={!canCardBtn(user,'admin_services','branch_overrides','edit')} onClick={()=>{if(!canCardBtn(user,'admin_services','branch_overrides','edit'))return;isSimplePricing(s.id)?openOvModal(s.id,o.branchId):openOverrideEditor(s.id,o.branchId)}} title="تعديل" style={{background:'transparent',border:'none',padding:0,cursor:canCardBtn(user,'admin_services','branch_overrides','edit')?'pointer':'default',display:'inline-flex',alignItems:'center',gap:8,fontFamily:F,flex:1,minWidth:0,justifyContent:'flex-start'}}>
                      <span style={{color:C.gold,direction:'ltr',fontFamily:'monospace',fontWeight:600,fontSize:14}}>{code}</span>
                      {aOff&&<span style={{padding:'2px 7px',borderRadius:5,background:'rgba(192,57,43,.15)',border:'1px solid rgba(192,57,43,.35)',color:C.red,fontSize:10,fontWeight:600,display:'inline-flex',alignItems:'center',gap:3}}><PowerOff size={9} strokeWidth={2.8}/>معطّلة</span>}
                      {!aOff&&bDiff&&(o.billable===false
                        ?<span style={{padding:'2px 7px',borderRadius:5,background:'rgba(39,160,70,.15)',border:'1px solid rgba(39,160,70,.35)',color:C.ok,fontSize:10,fontWeight:600,display:'inline-flex',alignItems:'center',gap:3}}><Gift size={9} strokeWidth={2.8}/>مجانية</span>
                        :<span style={{padding:'2px 7px',borderRadius:5,background:'rgba(176,125,0,.18)',border:'1px solid rgba(176,125,0,.35)',color:C.gold,fontSize:10,fontWeight:600,display:'inline-flex',alignItems:'center',gap:3}}><DollarSign size={9} strokeWidth={2.8}/>مفوترة</span>)}
                    </button>
                    {canCardBtn(user,'admin_services','branch_overrides','delete')&&(
                    <button type="button" onClick={()=>removeBranchOverride(o.branchId,s.id)} title="حذف التخصيص" style={{width:22,height:22,borderRadius:'50%',border:'none',background:'rgba(192,57,43,.15)',color:C.red,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',padding:0,flexShrink:0}}>
                      <X size={11} strokeWidth={3}/>
                    </button>
                    )}
                  </div>
                  {pf.length===0&&(
                    <div style={{padding:'10px 12px',fontSize:10.5,color:'var(--tx5)',textAlign:'center',fontWeight:500}}>لا تخصيص سعري — كل الأسعار افتراضية</div>
                  )}
                  {pf.length>0&&(
                    <div style={{padding:'6px 12px 8px',display:'flex',flexDirection:'column'}}>
                      {pf.map(({f,ovv,has,dv},fi)=>(
                        <div key={f.k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,padding:'7px 0',borderBottom:fi<pf.length-1?'1px dashed var(--bd2)':'none'}}>
                          <span style={{fontSize:11,color:'var(--tx3)',fontWeight:600,flex:1,minWidth:0}}>{f.l}</span>
                          <span style={{display:'inline-flex',alignItems:'baseline',gap:6,direction:'ltr',whiteSpace:'nowrap'}}>
                            {f.sfx&&<span style={{fontSize:8.5,color:'var(--tx5)'}}>{f.sfx}</span>}
                            <b style={{fontSize:13,color:has?C.gold:'var(--tx4)'}}>{fmtV(has?ovv:dv)}</b>
                            {has&&String(dv)!==String(ovv)&&<span style={{fontSize:9,color:'var(--tx5)',textDecoration:'line-through'}}>{fmtV(dv)}</span>}
                            {!has&&<span style={{fontSize:8.5,color:'var(--tx5)'}}>· افتراضي</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          )
        })()}
        {!isSimplePricing(s.id)&&overrideEditor&&overrideEditor.svcId===s.id&&renderInlineOverrideEditor(s)}
        {ovs.length===0&&!(overrideEditor&&overrideEditor.svcId===s.id)&&(
          <div style={{padding:28,textAlign:'center',color:'var(--tx4)',fontSize:12,border:'1px dashed var(--bd)',borderRadius:10}}>
            كل المكاتب تستخدم الإعدادات الافتراضية أعلاه — اضغط «إضافة تخصيص» لتغيير الحالة أو السعر لمكتب معين
          </div>
        )}
      </div>
    </div>
    )}

    </div>{/* /main column */}

    {/* Sticky sidebar (left in RTL) — operations: active + billable */}
    <div style={{position:'sticky',top:14}}>
      {cardVisible(user,'admin_services','operations_and_billing')&&(
      <div className="svc-section" style={{marginBottom:0}}>
        <div className="svc-section-head">
          <span className="svc-section-head-l">
            <span style={{width:6,height:6,borderRadius:'50%',background:C.gold,flexShrink:0}}/> التشغيل والفوترة
          </span>
        </div>
        <div className="svc-section-body">
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {/* Active */}
            <div style={{padding:'14px 16px',borderRadius:11,background:'rgba(0,0,0,.18)',border:'1px solid var(--bd)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
              <div>
                <div style={{fontSize:12,color:'var(--tx2)',fontWeight:600,marginBottom:4}}>حالة التشغيل</div>
                <div style={{fontSize:10.5,color:'var(--tx5)',fontWeight:500}}>{st.active?'الخدمة متاحة لكل المكاتب':'الخدمة معطّلة لكل المكاتب'}</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                {canCardBtn(user,'admin_services','operations_and_billing','toggle_active')&&(
                <button type="button" onClick={()=>update(s.id,'active',!st.active)} title={st.active?'اضغط للتعطيل':'اضغط للتفعيل'}
                  style={{width:50,height:26,borderRadius:999,border:'none',background:st.active?C.ok:'rgba(192,57,43,.7)',cursor:'pointer',position:'relative',transition:'.2s',padding:0,boxShadow:'0 2px 6px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.12)'}}>
                  <span style={{position:'absolute',width:20,height:20,borderRadius:'50%',background:'#fff',top:3,right:st.active?3:27,transition:'.2s',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {st.active?<Power size={11} color={C.ok} strokeWidth={3}/>:<PowerOff size={11} color={C.red} strokeWidth={3}/>}
                  </span>
                </button>
                )}
                <span style={{fontSize:10,fontWeight:600,color:st.active?C.ok:C.red}}>{st.active?'فعّالة':'معطّلة'}</span>
              </div>
            </div>
            {/* Billable */}
            <div style={{padding:'14px 16px',borderRadius:11,background:'rgba(0,0,0,.18)',border:'1px solid var(--bd)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
              <div>
                <div style={{fontSize:12,color:'var(--tx2)',fontWeight:600,marginBottom:4}}>حالة الفوترة</div>
                <div style={{fontSize:10.5,color:'var(--tx5)',fontWeight:500}}>{st.billable?'تُضاف للفاتورة بسعر التسعير':'لا تُحتسب على العميل'}</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                {canCardBtn(user,'admin_services','operations_and_billing','toggle_billable')&&(
                <button type="button" onClick={()=>update(s.id,'billable',!st.billable)} title={st.billable?'اضغط لجعلها مجانية':'اضغط لجعلها مفوترة'}
                  style={{width:50,height:26,borderRadius:999,border:'none',background:st.billable?C.gold:'rgba(39,160,70,.7)',cursor:'pointer',position:'relative',transition:'.2s',padding:0,boxShadow:'0 2px 6px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.12)'}}>
                  <span style={{position:'absolute',width:20,height:20,borderRadius:'50%',background:'#fff',top:3,right:st.billable?3:27,transition:'.2s',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {st.billable?<DollarSign size={11} color={C.gold} strokeWidth={3}/>:<Gift size={11} color={C.ok} strokeWidth={3}/>}
                  </span>
                </button>
                )}
                <span style={{fontSize:10,fontWeight:600,color:st.billable?C.gold:C.ok}}>{st.billable?'مفوترة':'مجانية'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>

    </div>{/* /grid */}

    {/* Default-pricing edit — popup (the card above stays a read-only view).
        عقد أجير له خطوتان: (1) الرسوم الأساسية  (2) معامل السعودة المؤطَّر. بقية الخدمات صفحة واحدة. */}
    <Modal
      open={isPriceEditable && s.id!=='kafala_transfer' && s.id!=='iqama_renewal'}
      onClose={closePriceModal}
      title="تعديل التسعير الافتراضي"
      subtitle={isAr?(s.name_ar||s.name_en):(s.name_en||s.name_ar)}
      Icon={p=>{const Ic=s.Icon||Coins;return <Ic {...p} size={34}/>}}
      accent={C.gold}
      width={520}
      success={priceSaved ? <SuccessView title="تم حفظ التسعيرة" /> : undefined}
      {...(s.id==='ajeer_contract'
        ? {submitLabel:'حفظ التسعيرة',onSubmit:()=>submitPriceModal(s.id),height:'min(470px, 92vh)',pages:[
            {title:'الرسوم الأساسية',content:renderPriceModalBody(s)},
            {title:'معامل السعودة',content:renderSaudSection()},
          ]}
        : s.id==='iqama_renewal'
        ? {submitLabel:'حفظ التسعيرة',onSubmit:()=>submitPriceModal(s.id),height:'min(620px, 92vh)',pages:renderIqamaPages(s)}
        : {scroll:true,footer:!priceSaved && (
            <ActionButton dir="back" color={C.gold} onClick={()=>submitPriceModal(s.id)}>حفظ التسعيرة</ActionButton>
          )})}
    >
      {s.id!=='ajeer_contract' && s.id!=='iqama_renewal' && (isSimplePricing(s.id) ? renderPriceModalBody(s) : renderPriceEditor(s,{inModal:true}))}
    </Modal>

    {/* Add/edit branch override — 2-step wizard popup (same FormKit modal as default-price edit) */}
    <Modal
      open={ovModal===s.id}
      onClose={closeOvModal}
      title="تخصيص حسب المكتب"
      subtitle={isAr?(s.name_ar||s.name_en):(s.name_en||s.name_ar)}
      Icon={p=>{const Ic=s.Icon||Coins;return <Ic {...p} size={34}/>}}
      accent={C.gold}
      width={520}
      height="min(620px, 92vh)"
      success={ovSaved ? <SuccessView title="تم حفظ التخصيص" /> : undefined}
      submitLabel="حفظ التخصيص"
      onSubmit={()=>submitOvModal(s.id)}
      pages={[
        {valid:ovBranchIds.length>0, content:renderOvBranchPicker(s.id)},
        {content:renderOvPricingFields(s.id)},
      ]}
    />
  </div>
}

// ═══════════════════════════════════════════════════════════════
// LIST VIEW — InvoicePage-style hero + grouped row-cards
// ═══════════════════════════════════════════════════════════════
return<div style={{paddingTop:0,paddingBottom:80,display:'flex',flexDirection:'column',direction:'rtl',fontFamily:F}}>
{SVC_LIST_STYLES}

{/* Page header */}
<div style={{marginBottom:22}}>
  <div style={{fontSize:24,fontWeight:600,color:'var(--tx)',letterSpacing:'-.3px',lineHeight:1.2}}>إدارة الخدمات</div>
  <div style={{fontSize:13,fontWeight:500,color:'var(--tx4)',marginTop:12,lineHeight:1.6}}>تحكّم في حالة الخدمات (مفعّلة / معطّلة)، فوترتها (مفوترة / مجانية)، وتسعيرها لكل مكتب على حدة</div>
</div>

{/* 3-col Hero — Big primary KPI + Stacked + Distribution */}
<div className="svc-hero">
  {/* Big primary — total services */}
  <div style={{position:'relative',padding:'18px 22px',borderRadius:16,background:'var(--card-grad2)',border:'1px solid var(--bd)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',display:'flex',flexDirection:'column',justifyContent:'space-between',overflow:'hidden',minHeight:150}}>
    <div style={{position:'absolute',insetInlineStart:-60,top:-60,width:180,height:180,borderRadius:'50%',background:`radial-gradient(circle, ${C.gold}18 0%, transparent 70%)`,pointerEvents:'none'}}/>
    <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:-6}}>
      <span style={{width:8,height:8,borderRadius:'50%',background:C.gold,boxShadow:`0 0 10px ${C.gold}aa`}}/>
      <span style={{fontSize:24,color:'var(--tx)',fontWeight:600,letterSpacing:'.2px'}}>الخدمات الفعّالة</span>
    </div>
    <div style={{position:'relative',display:'flex',alignItems:'baseline',gap:7,direction:'ltr'}}>
      <span style={{fontSize:42,fontWeight:600,color:C.gold,letterSpacing:'-1.5px',lineHeight:1,fontVariantNumeric:'tabular-nums'}}>{activeCount}</span>
    </div>
    <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:8,borderTop:'1px solid var(--bd)'}}>
      <span style={{fontSize:11,color:'var(--tx3)',fontWeight:600}}>{disabledCount===0?'كل الخدمات فعّالة':`${disabledCount} معطّلة`}</span>
      <span style={{fontSize:13,color:C.gold,fontWeight:600,direction:'ltr',fontVariantNumeric:'tabular-nums'}}>{Object.keys(branchOverrides).length} مكتب مخصّص</span>
    </div>
  </div>

  {/* Stacked secondary — billable / free */}
  <div style={{borderRadius:16,background:'var(--card-grad2)',border:'1px solid var(--bd)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',display:'flex',flexDirection:'column',overflow:'hidden',minHeight:150}}>
    {[
      {label:'مفوترة',val:billableCount,cnt:totalCount-billableCount-disabledCount,c:C.gold,sub:'مجانية'},
      {label:'معطّلة',val:disabledCount,cnt:freeCount,c:disabledCount?C.red:'#999',sub:'مجانية'},
    ].map((s,i)=>(
      <div key={i} style={{position:'relative',padding:'12px 16px',flex:1,borderTop:i>0?'1px solid var(--bd)':'none',display:'flex',flexDirection:'column',justifyContent:'space-between',gap:6,overflow:'hidden'}}>
        <div style={{position:'absolute',insetInlineStart:-25,top:'50%',transform:'translateY(-50%)',width:70,height:70,borderRadius:'50%',background:`radial-gradient(circle, ${s.c}10 0%, transparent 70%)`,pointerEvents:'none'}}/>
        <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'space-between',gap:5}}>
          <span style={{width:5,height:5,borderRadius:'50%',background:s.c}}/>
          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{fontSize:13,color:'var(--tx)',fontWeight:600}}>{s.label}</span>
            {i===0&&<span style={{fontSize:11,color:'var(--tx4)',fontWeight:600}}>({s.cnt} {s.sub})</span>}
          </div>
        </div>
        <div style={{position:'relative',display:'flex',alignItems:'baseline',direction:'ltr'}}>
          <span style={{fontSize:20,fontWeight:600,color:s.c,fontVariantNumeric:'tabular-nums',lineHeight:1,letterSpacing:'-.5px'}}>{s.val}</span>
        </div>
      </div>
    ))}
  </div>

  {/* Distribution — by category */}
  <div style={{borderRadius:16,background:'var(--card-grad2)',border:'1px solid var(--bd)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',padding:'12px 16px',display:'flex',flexDirection:'column',gap:10,minHeight:150}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <span style={{fontSize:12,color:'var(--tx2)',fontWeight:600,letterSpacing:'.2px'}}>التوزّع حسب الفئة</span>
      <span style={{fontSize:11,color:'var(--tx4)',fontWeight:600}}>
        <span style={{color:C.gold,fontWeight:600,direction:'ltr',fontVariantNumeric:'tabular-nums'}}>{totalCount}</span> خدمة
      </span>
    </div>
    {totalCount>0&&(
      <div style={{display:'flex',height:8,borderRadius:999,overflow:'hidden',background:'var(--bd2)'}}>
        <div title={`رئيسية: ${mainSvcs.length}`} style={{width:(mainSvcs.length/totalCount*100)+'%',background:C.gold,transition:'width .3s'}}/>
        <div title={`أخرى: ${otherSvcs.length}`} style={{width:(otherSvcs.length/totalCount*100)+'%',background:C.blue,transition:'width .3s'}}/>
      </div>
    )}
    <div style={{display:'grid',gridTemplateColumns:'repeat(2, 1fr)',gap:'6px 16px'}}>
      {[
        {l:'الخدمات الرئيسية',v:mainSvcs.length,c:C.gold},
        {l:'الخدمات الأخرى',v:otherSvcs.length,c:C.blue},
      ].map(x=>(
        <div key={x.l} style={{display:'flex',alignItems:'center',gap:7,fontSize:11,fontWeight:600}}>
          <span style={{color:x.c,fontVariantNumeric:'tabular-nums',direction:'ltr',minWidth:14,textAlign:'center',fontWeight:600}}>{x.v}</span>
          <span style={{color:'var(--tx2)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{x.l}</span>
        </div>
      ))}
    </div>
  </div>
</div>

{/* Group: الخدمات الرئيسية */}
{(() => {
  const list=filteredMain
  const totalAct=list.filter(s=>getState(s.id).active).length
  return(
    <div style={{marginBottom:28}}>
      <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:12,paddingBottom:10,borderBottom:'1px solid var(--bd)'}}>
        <div style={{display:'flex',alignItems:'baseline',gap:12}}>
          <span style={{width:6,height:6,borderRadius:'50%',background:C.gold,transform:'translateY(-2px)'}}/>
          <span style={{fontSize:14,fontWeight:600,color:'var(--tx2)'}}>الخدمات الرئيسية</span>
          <span style={{fontSize:12,color:'var(--tx4)',fontWeight:600}}>· {totalAct}/{list.length} فعّالة</span>
        </div>
        <div style={{fontSize:11,color:'var(--tx3)',fontWeight:600}}>
          <span style={{color:C.gold,direction:'ltr',fontVariantNumeric:'tabular-nums',fontWeight:600}}>{list.filter(s=>getOverridesForSvc(s.id).length>0).length}</span> بتخصيصات
        </div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {list.length?list.map(s=>renderRow(s)):<EmptyState title="لا توجد نتائج" desc="جرّب تعديل البحث أو الفلاتر" />}
      </div>
    </div>
  )
})()}

{/* Group: الخدمات الأخرى */}
{(() => {
  const list=filteredOther
  const totalAct=list.filter(s=>getState(s.id).active).length
  return(
    <div style={{marginBottom:28}}>
      <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:12,paddingBottom:10,borderBottom:'1px solid var(--bd)'}}>
        <div style={{display:'flex',alignItems:'baseline',gap:12}}>
          <span style={{width:6,height:6,borderRadius:'50%',background:C.blue,transform:'translateY(-2px)'}}/>
          <span style={{fontSize:14,fontWeight:600,color:'var(--tx2)'}}>الخدمات الأخرى</span>
          <span style={{fontSize:12,color:'var(--tx4)',fontWeight:600}}>· {totalAct}/{list.length} فعّالة</span>
        </div>
        <div style={{fontSize:11,color:'var(--tx3)',fontWeight:600}}>
          <span style={{color:C.gold,direction:'ltr',fontVariantNumeric:'tabular-nums',fontWeight:600}}>{list.filter(s=>getOverridesForSvc(s.id).length>0).length}</span> بتخصيصات
        </div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {list.length?list.map(s=>renderRow(s)):<EmptyState title="لا توجد نتائج" desc="جرّب تعديل البحث أو الفلاتر" />}
      </div>
    </div>
  )
})()}

{/* ─── (Inline override editor lives inside the section card; no modal here.) ─── */}
{false&&overrideEditor&&(()=>{
  const svc=ALL_SERVICES.find(x=>x.id===overrideEditor.svcId)
  if(!svc)return null
  const labelS={fontSize:11,fontWeight:600,color:'var(--tx3)',marginBottom:6,display:'block',textAlign:'right'}
  const Toggle=({on,onChange,onLabel,offLabel,onColor,offColor,onIcon,offIcon})=>(
    <div style={{display:'inline-flex',alignItems:'center',gap:6}}>
      <button type="button" onClick={()=>onChange(!on)}
        style={{width:44,height:22,borderRadius:999,border:'none',background:on?onColor:offColor,cursor:'pointer',position:'relative',transition:'.2s',padding:0,boxShadow:'0 2px 6px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.12)'}}>
        <span style={{position:'absolute',width:16,height:16,borderRadius:'50%',background:'#fff',top:3,right:on?3:25,transition:'.2s',display:'inline-flex',alignItems:'center',justifyContent:'center'}}>
          {on?onIcon:offIcon}
        </span>
      </button>
      <span style={{fontSize:11,fontWeight:600,color:on?onColor:offColor}}>{on?onLabel:offLabel}</span>
    </div>
  )
  return(
    <div style={{display:'none'}}>
      <div>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:10,minWidth:0}}>
            <span style={{width:36,height:36,borderRadius:9,background:'linear-gradient(180deg,rgba(176,125,0,.14),rgba(176,125,0,.06))',border:'1px solid rgba(176,125,0,.25)',display:'inline-flex',alignItems:'center',justifyContent:'center',color:C.gold,flexShrink:0}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>
            </span>
            <div style={{minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:'var(--tx)'}}>تخصيص لمكتب</div>
              <div style={{fontSize:11,color:'var(--tx4)',fontWeight:500,marginTop:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{svc.name_ar}</div>
            </div>
          </div>
          <button type="button" onClick={()=>setOverrideEditor(null)} style={{width:30,height:30,borderRadius:8,border:'1px solid var(--bd)',background:'var(--bd2)',color:'var(--tx3)',cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',padding:0}}>
            <X size={14} strokeWidth={2.5}/>
          </button>
        </div>
        <div style={{padding:'18px 22px',display:'flex',flexDirection:'column',gap:14}}>
          {/* Branch picker */}
          <div>
            <label style={labelS}>المكتب</label>
            {overrideEditor.branchId?(
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderRadius:10,background:'rgba(176,125,0,.08)',border:`1px solid ${C.gold}55`}}>
                <span style={{display:'inline-flex',alignItems:'center',gap:8,color:C.gold,fontSize:13,fontWeight:600}}>
                  <span style={{width:6,height:6,borderRadius:'50%',background:C.gold,boxShadow:`0 0 6px ${C.gold}`}}/>
                  <span style={{fontFamily:'monospace',direction:'ltr'}}>{branches.find(b=>b.id===overrideEditor.branchId)?.branch_code||'—'}</span>
                </span>
                <button type="button" onClick={()=>setOverrideEditor(p=>({...p,branchId:null}))} style={{fontSize:11,color:'var(--tx4)',background:'transparent',border:'none',cursor:'pointer',fontFamily:F}}>تغيير المكتب</button>
              </div>
            ):(
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:6,maxHeight:200,overflowY:'auto',padding:8,borderRadius:10,background:'rgba(0,0,0,.18)',border:'1px solid var(--bd)'}}>
                {availableBranches.length===0?(
                  <div style={{gridColumn:'1/-1',padding:14,textAlign:'center',fontSize:11,color:'var(--tx5)'}}>كل المكاتب لها تخصيص بالفعل أو لا توجد مكاتب نشطة</div>
                ):availableBranches.map(b=>(
                  <button key={b.id} type="button" onClick={()=>setOverrideEditor(p=>({...p,branchId:b.id}))}
                    style={{height:36,borderRadius:8,border:'1px solid var(--bd)',background:'var(--bd2)',color:C.gold,fontFamily:'monospace',fontSize:12,fontWeight:600,cursor:'pointer',direction:'ltr',transition:'.15s'}}
                    onMouseEnter={e=>{e.currentTarget.style.background='rgba(176,125,0,.12)';e.currentTarget.style.borderColor=`${C.gold}55`}}
                    onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.03)';e.currentTarget.style.borderColor='rgba(255,255,255,.06)'}}>
                    {b.branch_code}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active + Billable toggles */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div style={{padding:'10px 12px',borderRadius:10,background:'rgba(0,0,0,.18)',border:'1px solid var(--bd)'}}>
              <div style={{fontSize:10,color:'var(--tx4)',fontWeight:600,marginBottom:8}}>الحالة <span style={{color:'var(--tx5)'}}>(الافتراضي: {baseActive?'فعّالة':'معطّلة'})</span></div>
              <Toggle on={eff.active} onChange={v=>setDraft({active:v})}
                onLabel="فعّالة" offLabel="معطّلة" onColor={C.ok} offColor={C.red}
                onIcon={<Power size={9} color={C.ok} strokeWidth={3}/>} offIcon={<PowerOff size={9} color={C.red} strokeWidth={3}/>}/>
              {typeof draft.active==='boolean'&&<button type="button" onClick={()=>setDraft({active:undefined})} style={{marginInlineStart:8,fontSize:10,color:'var(--tx5)',background:'transparent',border:'none',cursor:'pointer',fontFamily:F}}>← الافتراضي</button>}
            </div>
            <div style={{padding:'10px 12px',borderRadius:10,background:'rgba(0,0,0,.18)',border:'1px solid var(--bd)'}}>
              <div style={{fontSize:10,color:'var(--tx4)',fontWeight:600,marginBottom:8}}>الفوترة <span style={{color:'var(--tx5)'}}>(الافتراضي: {baseBillable?'مفوترة':'مجانية'})</span></div>
              <Toggle on={eff.billable} onChange={v=>setDraft({billable:v})}
                onLabel="مفوترة" offLabel="مجانية" onColor={C.gold} offColor={C.ok}
                onIcon={<DollarSign size={9} color={C.gold} strokeWidth={3}/>} offIcon={<Gift size={9} color={C.ok} strokeWidth={3}/>}/>
              {typeof draft.billable==='boolean'&&<button type="button" onClick={()=>setDraft({billable:undefined})} style={{marginInlineStart:8,fontSize:10,color:'var(--tx5)',background:'transparent',border:'none',cursor:'pointer',fontFamily:F}}>← الافتراضي</button>}
            </div>
          </div>

          {/* Pricing fields */}
          {fields.length>0&&(
            <div style={{padding:'12px 14px',borderRadius:10,background:'rgba(0,0,0,.18)',border:'1px solid var(--bd)'}}>
              <div style={{fontSize:11,fontWeight:600,color:'var(--tx2)',marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
                <DollarSign size={12} color={C.gold}/> أسعار خاصة لهذا المكتب
                <span style={{marginInlineStart:'auto',fontSize:10,color:'var(--tx5)',fontWeight:500}}>اترك فارغاً لاستعمال السعر الافتراضي</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                {fields.map(f=>{
                  const ov=draft.pricing?.[f.k]
                  const has=ov!==undefined&&ov!==''
                  return(
                    <div key={f.k}>
                      <label style={{...labelS,display:'flex',alignItems:'center',justifyContent:'space-between',gap:6}}>
                        <span>{f.l}</span>
                        {has&&<button type="button" onClick={()=>clearPricingField(f.k)} title="إزالة التخصيص" style={{fontSize:9,color:'var(--tx5)',background:'transparent',border:'none',cursor:'pointer',fontFamily:F}}>← الافتراضي</button>}
                      </label>
                      <div style={{display:'flex',alignItems:'center',gap:5}}>
                        <input type="text" inputMode="decimal" value={ov??''}
                          onChange={e=>{let v=e.target.value.replace(/[^0-9.]/g,'');const i=v.indexOf('.');if(i!==-1)v=v.slice(0,i+1)+v.slice(i+1).replace(/\./g,'');setPricingField(f.k,v)}}
                          placeholder={String(def[f.k]??f.d)} style={{...compactInp,flex:1,textAlign:'center',direction:'ltr',borderColor:has?C.gold+'66':'rgba(255,255,255,.07)'}}/>
                        {f.sfx&&<span style={{fontSize:9,fontWeight:600,color:'var(--tx5)',minWidth:48,textAlign:'center'}}>{f.sfx}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        <div style={{padding:'12px 22px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          <div style={{fontSize:10,color:'var(--tx5)',fontWeight:500}}>
            القيم الفارغة = استعمال الافتراضي. التخصيصات تُحفظ محلياً.
          </div>
          <div style={{display:'flex',gap:8}}>
            {canCardBtn(user,'admin_services','branch_overrides','delete')&&overrideEditor.branchId&&getOverridesForSvc(svc.id).some(o=>o.branchId===overrideEditor.branchId)&&(
              <button type="button" onClick={()=>{removeBranchOverride(overrideEditor.branchId,svc.id);setOverrideEditor(null)}}
                style={{height:36,padding:'0 14px',borderRadius:9,border:'1px solid rgba(192,57,43,.3)',background:'rgba(192,57,43,.08)',color:C.red,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer'}}>
                حذف التخصيص
              </button>
            )}
            <button type="button" onClick={()=>setOverrideEditor(null)} style={{height:36,padding:'0 14px',borderRadius:9,border:'1px solid var(--bd)',background:'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',color:'var(--tx3)',fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer'}}>إلغاء</button>
            <button type="button" onClick={onSave} disabled={!canSave}
              style={{height:36,padding:'0 16px',borderRadius:9,border:'1px solid '+(canSave?'rgba(176,125,0,.45)':'rgba(255,255,255,.06)'),background:canSave?'linear-gradient(180deg,rgba(176,125,0,.22) 0%,rgba(176,125,0,.10) 100%)':'rgba(255,255,255,.03)',color:canSave?C.gold:'var(--tx5)',fontFamily:F,fontSize:12,fontWeight:600,cursor:canSave?'pointer':'not-allowed'}}>
              حفظ التخصيص
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})()}
</div>
}
