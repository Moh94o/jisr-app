import React,{useState,useEffect,useRef} from 'react'
import ReactDOM from 'react-dom'
import {CalendarRange,CalendarClock,ArrowLeftRight,RefreshCw,Users,FileCheck,HeartPulse,UserCog,Wallet,Plane,PlaneTakeoff,IdCard,Printer,FileStack,Sparkles,Power,PowerOff,Gift,DollarSign,Edit3,ChevronDown,ChevronUp,X,Calendar as CalendarIcon} from 'lucide-react'
import {getSupabase} from './lib/supabase.js'

// Shared Kafala pricing config — drives both the service-request kafala modal AND the Kafala Calculator modal
export const KAFALA_DEFAULTS={
  transferFee1:2000,transferFee2:4000,transferFee3:6000,
  // Occupations that get bumped up one transfer tier (0 → 1, 1 → 2, etc.) — domestic workers by default.
  transferBumpOccupations:['6d7ccefc-1647-4a36-9a80-ad1f9138db84','f3163bc5-a3e1-4e93-a620-7421db3abc68','8152564f-7a31-430c-9cb3-a76f5df77c04','0394376f-b7e0-455c-8466-0555d477cc42','ebd99f6b-ae4c-453c-9cf5-19099b7f35a3','a4cbe92d-69f8-4129-a876-0dc035fb9bf7','efd9f7af-7ac6-4f3e-9fda-efbc7d95ea61','5a20783b-8a28-4364-bbb8-85fbc71fc291','5ec4a1ba-64e9-4df7-badf-bf12eaf005ba','2feff711-f1d2-489c-870b-ab82b7de9cbd','0e6cd55b-1ced-4d88-ac37-ccfcafd244ec','01f7dcd3-1b72-4ade-bf21-95dc7f819463','09858dcd-0057-4857-a225-ce626313d457'],
  iqamaPerMonth:54.2,iqamaFine1:500,iqamaFine2:1000,iqamaGraceDays:7,iqamaProcessingDays:7,iqamaExpiredThresholdDays:30,procDaysCase1:7,procDaysCase2:7,procDaysCase3:7,thresholdCase2:30,transferOnlyMinDays:30,
  workPermit3M:25,workPermit6M:50,workPermit9M:75,workPermit12M:100,
  workPermitDailyAfter:22,workPermitCutoffDate:'2027-02-20',
  workPermitProcDays:7,workPermitExpiredThreshold:30,workPermitExpiredProcDays:7,
  profChange:1000,profChangeFreeOccupations:['2381e970-e939-4c6b-a7a9-8862f2133d41','1b4568be-0ea5-4079-bc90-ecca71d30adb'],officeFee:6500,officeDailyRate:18.06,officeFlatMonths:12,
  medicalGraceMonths:2,medicalGraceDays:7,
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

const F=`'Cairo','Tajawal',sans-serif`
const C={gold:'#D4A017',bentoGold:'#D4A017',red:'#c0392b',ok:'#27a046',blue:'#3483b4'}
const GLASS_CARD={background:'linear-gradient(160deg,#333 0%,#2A2A2A 50%,#232323 100%)',backdropFilter:'blur(20px) saturate(160%)',WebkitBackdropFilter:'blur(20px) saturate(160%)',border:'1px solid rgba(255,255,255,.08)',borderRadius:16,boxShadow:'0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}
const INNER_PILL={background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',border:'1px solid rgba(255,255,255,.06)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 4px rgba(0,0,0,.22)'}
const FORM_INPUT={height:42,padding:'0 14px',borderRadius:10,border:'1px solid rgba(255,255,255,.07)',background:'linear-gradient(180deg,#323232 0%,#262626 100%)',color:'var(--tx)',fontFamily:F,fontSize:13,fontWeight:500,outline:'none',boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.18s',width:'100%',boxSizing:'border-box'}

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
  const navBtn={width:28,height:28,borderRadius:7,border:'1px solid rgba(255,255,255,.06)',background:'rgba(255,255,255,.03)',color:C.gold,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,transition:'.15s'}
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
    <div style={{position:'fixed',...posStyle,width:POPUP_W,background:'#0f0f0f',border:'1px solid rgba(255,255,255,.08)',borderRadius:10,padding:12,zIndex:2001,boxShadow:'0 12px 40px rgba(0,0,0,.7)',fontFamily:F,direction:'rtl'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10,direction:'ltr'}}>
        <button type="button" onClick={prevMonth} style={navBtn}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg></button>
        <div style={{fontSize:13,fontWeight:800,color:'var(--tx)'}}>{MONTH_NAMES_AR[cur.m]} {cur.y}</div>
        <button type="button" onClick={nextMonth} style={navBtn}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7, 1fr)',gap:2,fontSize:10,fontWeight:700,color:'rgba(255,255,255,.4)',marginBottom:4}}>
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
              onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background='rgba(212,160,23,.08)'}}
              onMouseLeave={e=>{if(!isSel)e.currentTarget.style.background=isTd?'rgba(212,160,23,.04)':'transparent'}}
              style={{height:30,borderRadius:6,border:isTd&&!isSel?`1px solid ${C.gold}55`:'1px solid transparent',background:isSel?C.gold:(isTd?'rgba(212,160,23,.04)':'transparent'),color:isSel?'#000':(isTd?C.gold:'rgba(255,255,255,.8)'),fontFamily:F,fontSize:12,fontWeight:isSel||isTd?800:500,cursor:'pointer',transition:'.15s',padding:0}}>{d}</button>
          )
        })}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:10,paddingTop:8,borderTop:'1px solid rgba(255,255,255,.06)'}}>
        <button type="button" onClick={()=>{const t=new Date();onPick(fmtDateYMD(t.getFullYear(),t.getMonth(),t.getDate()));onClose()}} style={{fontSize:11,color:C.gold,background:'transparent',border:'none',cursor:'pointer',fontFamily:F,fontWeight:800,padding:'4px 8px'}}>اليوم</button>
        <button type="button" onClick={()=>{onPick('');onClose()}} style={{fontSize:11,color:'rgba(255,255,255,.5)',background:'transparent',border:'none',cursor:'pointer',fontFamily:F,fontWeight:700,padding:'4px 8px'}}>مسح</button>
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
        style={{position:'absolute',left:6,top:'50%',transform:'translateY(-50%)',width:30,height:30,border:'none',background:open?'rgba(212,160,23,.12)':'transparent',cursor:(disabled||readOnly)?'default':'pointer',color:(disabled||readOnly)?'rgba(212,160,23,.4)':C.gold,display:'flex',alignItems:'center',justifyContent:'center',padding:0,borderRadius:7,transition:'.15s'}}>
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
{id:'work_visa_permanent',name_ar:'تأشيرة عمل (دائمة)',Icon:CalendarRange,defaultBillable:true,group:'main'},
{id:'work_visa_temporary',name_ar:'تأشيرة عمل (مؤقتة)',Icon:CalendarClock,defaultBillable:true,group:'main'},
{id:'kafala_transfer',name_ar:'حسبة التنازل',Icon:ArrowLeftRight,defaultBillable:true,group:'main'},
{id:'iqama_renewal',name_ar:'تجديد الإقامة',Icon:RefreshCw,defaultBillable:true,group:'main'},
{id:'ajeer_contract',name_ar:'عقد أجير',Icon:Users,defaultBillable:true,group:'main'},
{id:'chamber_certification',name_ar:'الغرفة التجارية',Icon:FileCheck,defaultBillable:true,group:'main'},
{id:'medical_insurance',name_ar:'تأمين طبي',Icon:HeartPulse,defaultBillable:true,group:'other'},
{id:'profession_change',name_ar:'تغيير المهنة',Icon:UserCog,defaultBillable:true,group:'other'},
{id:'name_translation',name_ar:'تعديل الراتب',Icon:Wallet,defaultBillable:false,group:'other'},
{id:'exit_reentry_visa',name_ar:'إصدار / تمديد تأشيرة خروج وعودة',Icon:Plane,defaultBillable:true,group:'other'},
{id:'final_exit_visa',name_ar:'خروج نهائي / بلاغ تغيب',Icon:PlaneTakeoff,defaultBillable:true,group:'other'},
{id:'passport_update',name_ar:'تحديث بيانات الجواز',Icon:IdCard,defaultBillable:true,group:'other'},
{id:'iqama_print',name_ar:'طباعة الإقامة',Icon:Printer,defaultBillable:true,group:'other'},
{id:'documents',name_ar:'مستندات',Icon:FileStack,defaultBillable:false,group:'other'},
{id:'custom',name_ar:'عام',Icon:Sparkles,defaultBillable:true,group:'other'}
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
  {title:'رسوم المكتب',note:'السعر العام يُعرض ثابتاً عند رفع الطلب. سعر اليوم يُستخدم لحساب الحد الأدنى المسموح للخصم عند التصديق — هذا الحد لا يظهر للموظف المُصدِّق (يُرفض الطلب فقط عند النزول تحته). إذا تجاوزت المدة المتوقعة في الإقامة الحد الشهري، الأيام الزائدة تُحسب بسعر اليوم وتُضاف للسعر العام.',fields:[
    {k:'officeFee',l:'السعر العام (عند رفع الطلب)',d:6500,sfx:'ريال'},
    {k:'officeDailyRate',l:'سعر اليوم (الحد الأدنى للخصم)',d:18.06,sfx:'ريال/يوم'},
    {k:'officeFlatMonths',l:'الحد الشهري للسعر العام',d:12,sfx:'شهر'}
  ]}
]
const KAFALA_FIELDS=KAFALA_SECTIONS.flatMap(s=>s.fields)
const VISA_FIELDS=[
{k:'issuance',l:'الحد الأدنى لرسم الإصدار',d:2000,sfx:'ريال/تأشيرة'},
{k:'authorization',l:'الحد الأدنى لرسم التوكيل',d:2000,sfx:'ريال/تأشيرة'},
{k:'residence',l:'الحد الأدنى لرسم الإقامة',d:0,sfx:'ريال/تأشيرة'}
]
const IQAMA_FIELDS=KAFALA_FIELDS.filter(f=>!['transferFee1','transferFee2','transferFee3'].includes(f.k))
const PRICING_SCHEMA={
work_visa_permanent:{store:'visaPricingMin_permanent',fields:VISA_FIELDS,note:'الحدود الدنيا لدفعات تأشيرة العمل الدائمة'},
work_visa_temporary:{store:'visaPricingMin_temporary',fields:VISA_FIELDS,note:'الحدود الدنيا لدفعات تأشيرة العمل المؤقتة'},
kafala_transfer:{store:'kafalaPricingConfig',fields:KAFALA_FIELDS,note:'إعدادات نقل الكفالة فقط'},
iqama_renewal:{store:'iqamaRenewalPricingConfig',fields:IQAMA_FIELDS,note:'إعدادات تجديد الإقامة فقط'},
ajeer_contract:{store:'servicesPricingConfig',sub:'ajeer',fields:[
  {k:'baseFee',l:'رسوم أساسية',d:300,sfx:'ريال'},
  {k:'baseMonths',l:'عدد الأشهر المشمولة بالأساس',d:3,sfx:'شهر'},
  {k:'perMonthAfter',l:'رسوم كل شهر إضافي',d:100,sfx:'ريال/شهر'}
]},
exit_reentry_visa:{store:'servicesPricingConfig',sub:'exitReentry',fields:[
  {k:'perMonthSingle',l:'مفردة (شهرياً)',d:50,sfx:'ريال/شهر'},
  {k:'perMonthMultiple',l:'متعددة (شهرياً)',d:100,sfx:'ريال/شهر'}
]},
final_exit_visa:{store:'servicesPricingConfig',sub:'finalExit',fields:[
  {k:'fee',l:'رسوم الخروج النهائي',d:150,sfx:'ريال'}
]},
profession_change:{store:'servicesPricingConfig',sub:'professionChange',fields:[
  {k:'fee',l:'رسم تغيير المهنة',d:200,sfx:'ريال'}
]},
passport_update:{store:'servicesPricingConfig',sub:'passportUpdate',fields:[
  {k:'fee',l:'رسم تحديث الجواز',d:100,sfx:'ريال'}
]},
name_translation:{store:'servicesPricingConfig',sub:'nameTranslation',fields:[
  {k:'fee',l:'رسم تعديل الراتب',d:50,sfx:'ريال'}
]},
iqama_print:{store:'servicesPricingConfig',sub:'iqamaPrint',fields:[
  {k:'perCopy',l:'رسم طباعة الإقامة',d:30,sfx:'ريال'}
]},
chamber_certification:{store:'servicesPricingConfig',sub:'chamberCert',fields:[
  {k:'printed',l:'تصديق المطبوعات',d:200,sfx:'ريال'},
  {k:'openRequest',l:'تصديق طلب مفتوح',d:150,sfx:'ريال'}
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
function writeBranchOverrides(next){localStorage.setItem(BRANCH_STORAGE_KEY,JSON.stringify(next))}

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
if(svcId==='kafala_transfer'){
  out.medicalBrackets=Array.isArray(src.medicalBrackets)&&src.medicalBrackets.length?src.medicalBrackets:KAFALA_DEFAULTS.medicalBrackets
  out.profChangeFreeOccupations=Array.isArray(src.profChangeFreeOccupations)?src.profChangeFreeOccupations:KAFALA_DEFAULTS.profChangeFreeOccupations
  out.transferBumpOccupations=Array.isArray(src.transferBumpOccupations)?src.transferBumpOccupations:KAFALA_DEFAULTS.transferBumpOccupations
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
}

// Resolve pricing for a specific branch — merges default with per-branch overrides.
export function getPricingFor(svcId,branchId){
  const def=getPricing(svcId)
  if(!branchId||!def)return def
  const op=getBranchOverrides()[branchId]?.[svcId]?.pricing
  if(!op)return def
  return {...def,...op}
}

export default function ServiceAdminPage({toast,lang}){
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
useEffect(()=>{
  const sb=getSupabase();if(!sb)return
  sb.from('branches').select('id,branch_code').is('deleted_at',null).order('branch_code').then(({data})=>setBranches(data||[]))
},[])
useEffect(()=>{writeBranchOverrides(branchOverrides)},[branchOverrides])
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
  setOverrideEditor({svcId,branchId,draft:{
    active:existing.active,
    billable:existing.billable,
    pricing:existing.pricing||{},
  }})
}
const ALL_KAFALA_SECTIONS=['رسوم نقل الكفالة','تجديد الإقامة','كرت العمل','رسوم تغيير المهنة','رسوم المكتب','المدة المتوقعة في الإقامة','التأمين الطبي']
const [collapsed,setCollapsed]=useState(Object.fromEntries(ALL_KAFALA_SECTIONS.map(t=>[t,true])))// key: section title → true means collapsed (all collapsed by default)
const toggleSection=(title)=>setCollapsed(p=>({...p,[title]:!p[title]}))
const [editing,setEditing]=useState({})// key: section title → true means in edit mode
const [editSnapshot,setEditSnapshot]=useState({})// snapshot of priceState taken when entering edit mode, used for cancel
const startEdit=(title)=>{setEditSnapshot(p=>({...p,[title]:{...priceState}}));setEditing(p=>({...p,[title]:true}))}
const cancelEdit=(title)=>{const snap=editSnapshot[title];if(snap)setPriceState(snap);setEditing(p=>({...p,[title]:false}))}
const finishEdit=(title)=>setEditing(p=>({...p,[title]:false}))
useEffect(()=>{localStorage.setItem(STORAGE_KEY,JSON.stringify(overrides))},[overrides])
// Cached occupations list (fetched once on first kafala-transfer open) — used for the free-change multi-select.
const [occupations,setOccupations]=useState([])
useEffect(()=>{
  if(expanded!=='kafala_transfer'||occupations.length)return
  const sb=getSupabase();if(!sb)return
  ;(async()=>{const{data:arch}=await sb.from('lookup_items').select('id,lookup_categories!inner(category_key)').eq('code','archived').eq('lookup_categories.category_key','occupation_category').maybeSingle();let q=sb.from('occupations').select('id,name_ar,name_en').eq('is_active',true).order('sort_order',{nullsFirst:false}).order('name_ar').limit(5000);if(arch?.id)q=q.neq('category_id',arch.id);const{data}=await q;if(Array.isArray(data))setOccupations(data)})()
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
setPricing(id,normalized)
setExpanded(null)
toast(T('تم حفظ التسعير','Pricing saved'))
}

const mainSvcs=ALL_SERVICES.filter(s=>s.group==='main')
const otherSvcs=ALL_SERVICES.filter(s=>s.group==='other')

const inpS={width:'100%',height:42,padding:'0 14px',border:'1px solid rgba(255,255,255,.07)',borderRadius:10,fontFamily:F,fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',background:'linear-gradient(180deg,#323232 0%,#262626 100%)',textAlign:'center',boxSizing:'border-box',boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',direction:'ltr',transition:'.18s'}
const lbl={fontSize:12,fontWeight:500,color:'var(--tx3)',paddingInlineStart:2,marginBottom:7,display:'block',textAlign:'right'}

const clampField=(f,val)=>{
  if(val===''||val==null)return ''
  const n=Number(val); if(isNaN(n))return val
  if(f.min!=null&&n<f.min)return String(f.min)
  if(f.max!=null&&n>f.max)return String(f.max)
  return val
}
const renderField=(f,readOnly)=>{
  const rawVal=priceState[f.k]
  const parts=[]
  if(f.min!=null&&f.min!==0)parts.push(`الأدنى ${f.min}`)
  if(f.max!=null)parts.push(`الأعلى ${f.max}`)
  const hint=parts.length?parts.join(' · '):null
  const roStyle=readOnly?{background:'rgba(255,255,255,.03)',borderColor:'rgba(255,255,255,.04)',color:'rgba(255,255,255,.78)',cursor:'default'}:{}
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
      {f.sfx&&!['يوم','شهر'].includes(f.sfx)&&<span style={{fontSize:10,fontWeight:700,color:'var(--tx5)',flexShrink:0,minWidth:50,textAlign:'center'}}>{f.sfx}</span>}
    </div>
    {hint&&!readOnly&&<div style={{fontSize:9,color:'rgba(255,255,255,.3)',marginTop:3,textAlign:'right'}}>{hint}</div>}
  </div>)
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
  setPricing(svcId,vals)
  toast(isAr?`تم حفظ ${label||'القسم'}`:`Saved ${label||'section'}`)
}
// Save medical brackets only.
const saveMedicalBrackets=(svcId)=>{
  const b=Array.isArray(priceState.medicalBrackets)?priceState.medicalBrackets:[]
  setPricing(svcId,{medicalBrackets:b})
  toast(T('تم حفظ الفئات العمرية','Age brackets saved'))
}
const SectionHead=({title,badge,isCollapsed,onToggle})=>(
  <div onClick={onToggle} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 8px',marginBottom:2,cursor:'pointer',userSelect:'none'}}>
    <span style={{fontSize:isCollapsed?12:13,fontWeight:600,color:C.gold,display:'inline-flex',alignItems:'center',gap:8,transition:'font-size .15s',letterSpacing:'-.2px'}}>
      <span>{title}</span>
      {badge&&<span style={{fontSize:10,fontWeight:600,color:C.gold,padding:'2px 8px',borderRadius:5,background:'rgba(212,160,23,.10)',border:'1px solid rgba(212,160,23,.25)'}}>{badge}</span>}
    </span>
    {isCollapsed
      ? <ChevronDown size={14} style={{color:C.gold}}/>
      : <ChevronUp size={14} style={{color:C.gold}}/>}
  </div>
)
// Edit button positioned as a "tab" on the top-left border of the section card — sits ON the gold border.
const EditTab=({onClick})=>(
  <button type="button" onClick={onClick} title="تعديل" style={{position:'absolute',top:-11,insetInlineEnd:14,height:22,padding:'0 10px',borderRadius:6,border:`1px dashed ${C.gold}`,background:'#1a1a1a',color:C.gold,fontFamily:F,fontSize:10,fontWeight:800,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:5,transition:'.15s',zIndex:2}} onMouseEnter={e=>{e.currentTarget.style.borderStyle='solid';e.currentTarget.style.boxShadow='0 0 0 2px #1a1a1a'}} onMouseLeave={e=>{e.currentTarget.style.borderStyle='dashed';e.currentTarget.style.boxShadow='none'}}>
    <Edit3 size={10} strokeWidth={2.4}/>
    <span>تعديل</span>
  </button>
)
// Save + Cancel tabs shown while editing — same position as EditTab so they replace it.
const EditActionTabs=({onSave,onCancel})=>(
  <div style={{position:'absolute',top:-11,insetInlineEnd:14,display:'inline-flex',alignItems:'center',gap:6,zIndex:2}}>
    <button type="button" onClick={onCancel} title="إلغاء" style={{height:22,padding:'0 10px',borderRadius:6,border:'1px solid rgba(255,255,255,.2)',background:'#1a1a1a',color:'rgba(255,255,255,.75)',fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:5,transition:'.15s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.4)';e.currentTarget.style.color='#fff';e.currentTarget.style.boxShadow='0 0 0 2px #1a1a1a'}} onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.2)';e.currentTarget.style.color='rgba(255,255,255,.75)';e.currentTarget.style.boxShadow='none'}}>
      <span>إلغاء</span>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    </button>
    <button type="button" onClick={onSave} title="حفظ" style={{height:22,padding:'0 12px',borderRadius:6,border:`1px solid ${C.ok}`,background:'#1a1a1a',color:C.ok,fontFamily:F,fontSize:10,fontWeight:800,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:5,transition:'.15s'}} onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 0 0 2px #1a1a1a, 0 0 0 3px '+C.ok+'66'}} onMouseLeave={e=>{e.currentTarget.style.boxShadow='none'}}>
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
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:6,fontSize:10,fontWeight:700,color:'rgba(255,255,255,.45)',padding:'0 4px'}}>
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
    <button type="button" onClick={add} style={{height:32,marginTop:4,borderRadius:8,border:'1px dashed rgba(212,160,23,.3)',background:'transparent',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer'}}>+ إضافة فئة عمرية</button>
  </div>
}

const renderPriceEditor=(s)=>{
const sch=PRICING_SCHEMA[s.id]
if(!sch)return<div style={{padding:'12px 14px',background:'rgba(255,255,255,.02)',borderRadius:8,fontSize:11,color:'var(--tx5)',textAlign:'center'}}>لا يوجد تسعير ثابت لهذه الخدمة — يُحسب ديناميكياً</div>
const isKafala=s.id==='kafala_transfer'
const secHead={fontSize:11,fontWeight:800,color:C.gold,padding:'4px 8px',borderRight:`2px solid ${C.gold}55`,marginBottom:2}
const secNote={fontSize:10,color:'rgba(255,255,255,.5)',marginBottom:6,paddingRight:12}
return<div className="svc-admin-pricing" style={{display:'flex',flexDirection:'column',gap:22}}>
<style>{`.svc-admin-pricing input:focus, .svc-admin-pricing input:not(:placeholder-shown):not([type=checkbox]):not([type=radio]) { border-color: rgba(255,255,255,.08)!important }`}</style>
{sch.note&&!isKafala&&<div style={{fontSize:10,color:'rgba(255,255,255,.55)',background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.06)',padding:'6px 10px',borderRadius:6,fontWeight:600}}>ℹ {sch.note}</div>}
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
        return(<div key={sec.title} style={{position:'relative',display:'flex',flexDirection:'column',gap:6,padding:isCol?'6px 10px':'14px 12px 12px',borderRadius:10,background:'rgba(255,255,255,.015)',border:`1px solid ${isCol?'rgba(255,255,255,.05)':'rgba(212,160,23,.35)'}`,transition:'.18s'}}>
          {!isCol&&!isEdit&&<EditTab onClick={()=>startEdit(sec.title)}/>}
          {!isCol&&isEdit&&<EditActionTabs onSave={()=>{const extras=sec.title==='رسوم تغيير المهنة'?['profChangeFreeOccupations']:sec.title==='رسوم نقل الكفالة'?['transferBumpOccupations']:[];saveSection(s.id,sec.fields,sec.title,extras);finishEdit(sec.title)}} onCancel={()=>cancelEdit(sec.title)}/>}
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
                        return(<div key={f.k} style={{display:'flex',flexDirection:'column',gap:6,padding:'10px 10px 9px',borderRadius:9,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.06)'}}>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <span style={{width:26,height:26,borderRadius:'50%',background:'rgba(212,160,23,.12)',border:`1px solid ${C.gold}55`,color:C.gold,fontFamily:F,fontSize:11,fontWeight:800,display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0,direction:'ltr'}}>{f.badge}</span>
                            <div style={{display:'flex',flexDirection:'column',minWidth:0}}>
                              <span style={{fontSize:11,fontWeight:800,color:'rgba(255,255,255,.82)',lineHeight:1.2}}>{f.l}</span>
                              <span style={{fontSize:9.5,fontWeight:700,color:'rgba(255,255,255,.4)',lineHeight:1.3,marginTop:2}}>{f.hint}</span>
                            </div>
                          </div>
                          <div style={{display:'flex',alignItems:'center',gap:5}}>
                            <input type="text" inputMode="decimal" disabled={!isEdit} readOnly={!isEdit}
                              value={rawVal??''}
                              onChange={e=>{let v=e.target.value.replace(/[^0-9.]/g,'');const i=v.indexOf('.');if(i!==-1)v=v.slice(0,i+1)+v.slice(i+1).replace(/\./g,'');setPriceState(p=>({...p,[f.k]:v}))}}
                              placeholder={String(f.d)}
                              style={{...inpS,flex:1,...(isEdit?{}:{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.04)',color:'rgba(255,255,255,.78)',cursor:'default'})}}/>
                            <span style={{fontSize:10,fontWeight:700,color:'var(--tx5)',flexShrink:0}}>{f.sfx}</span>
                          </div>
                        </div>)
                      })}
                    </div>
                    {/* Transfer-bump occupations — sponsorChanges + 1 when worker's occupation is in this list */}
                    <div style={{display:'flex',flexDirection:'column',gap:6,padding:'10px 12px',borderRadius:9,background:'rgba(52,131,180,.04)',border:'1px dashed rgba(52,131,180,.35)'}}>
                      <div style={{fontSize:11,fontWeight:800,color:'#3483b4',display:'flex',alignItems:'center',gap:6}}>
                        <ArrowLeftRight size={13} strokeWidth={2.4}/>
                        <span>مهن بزيادة نقل تلقائية (+1)</span>
                      </div>
                      <div style={{fontSize:10.5,color:'rgba(255,255,255,.6)',lineHeight:1.7}}>إذا كانت مهنة العامل ضمن هذه القائمة ← يُرفع عدد مرات النقل بدرجة واحدة تلقائيًا (مثلاً 0 ← 1، و 1 ← 2). تُستخدم للعمالة المنزلية.</div>
                      {isEdit&&(()=>{
                        const q=priceState.__bumpQuery||''
                        const setQ=v=>setPriceState(p=>({...p,__bumpQuery:v}))
                        const filtered=occupations.filter(o=>!bumpSet.has(o.id)&&(q?((o.name_ar||'').includes(q)||(o.name_en||'').toLowerCase().includes(q.toLowerCase())):true))
                        return(<div style={{display:'flex',flexDirection:'column',gap:6,marginTop:4}}>
                          <input type="text" value={q} onChange={e=>setQ(e.target.value)} placeholder={`ابحث بالاسم (${occupations.length} مهنة متاحة)…`} style={{...inpS,height:34,textAlign:'right',direction:'rtl'}}/>
                          <div style={{maxHeight:220,overflowY:'auto',border:'1px solid rgba(255,255,255,.06)',borderRadius:7,background:'rgba(0,0,0,.25)'}}>
                            {filtered.length>0?filtered.slice(0,300).map(o=>(
                              <div key={o.id} onClick={()=>setPriceState(p=>({...p,transferBumpOccupations:[...bumpIds,o.id]}))} style={{padding:'7px 10px',cursor:'pointer',fontSize:11.5,fontWeight:700,color:'var(--tx)',borderBottom:'1px solid rgba(255,255,255,.04)',display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}} onMouseEnter={e=>{e.currentTarget.style.background='rgba(52,131,180,.08)'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
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
                          <span key={o.id} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'3px 8px 3px 5px',borderRadius:999,background:'rgba(52,131,180,.12)',border:'1px solid rgba(52,131,180,.45)',fontSize:11,fontWeight:700,color:'#3483b4'}}>
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
                    <div style={{display:'flex',flexDirection:'column',gap:6,padding:'10px 12px',borderRadius:9,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.07)'}}>
                      <div style={{fontSize:11.5,fontWeight:800,color:C.gold,display:'flex',alignItems:'center',gap:8}}>
                        <span style={{width:20,height:20,borderRadius:'50%',background:'rgba(212,160,23,.18)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:10.5,fontWeight:800}}>{num}</span>
                        <span>{heading}</span>
                      </div>
                      <div style={{fontSize:10.5,color:'rgba(255,255,255,.65)',lineHeight:1.7,paddingRight:28}}>{formula}</div>
                      <div style={{fontSize:10.5,color:'#3483b4',background:'rgba(52,131,180,.07)',border:'1px solid rgba(52,131,180,.25)',padding:'6px 10px',borderRadius:6,fontWeight:600}}>{example}</div>
                      <div style={{display:'grid',gridTemplateColumns:fields.length>=2?'1fr 1fr':'1fr',gap:8,marginTop:4,paddingTop:6,borderTop:'1px dashed rgba(255,255,255,.06)'}}>
                        {fields.map(f=>renderField(f,!isEdit))}
                      </div>
                    </div>
                  )
                  return(<div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {/* Shared threshold — affects all 3 cases */}
                    <div style={{display:'flex',flexDirection:'column',gap:6,padding:'10px 12px',borderRadius:9,background:'rgba(212,160,23,.04)',border:`1px dashed ${C.gold}55`}}>
                      <div style={{fontSize:11,fontWeight:800,color:C.gold,display:'flex',alignItems:'center',gap:6}}>
                        <span style={{fontSize:13}}>⚙</span>
                        <span>إعدادات مشتركة</span>
                      </div>
                      <div style={{fontSize:10.5,color:'rgba(255,255,255,.6)',lineHeight:1.7}}>
                        <b>أيام المهلة قبل الغرامة</b>: يفصل الحالة 1 (بدون غرامة) عن الحالتين 2 و 3.
                        <br/><b>الحد الأدنى للمتبقي لإتاحة «نقل فقط»</b>: إذا كان المتبقي في الإقامة أقل من <b>{transferMin} يوم</b> أو منتهية ← يُخفى زر «نقل فقط» ويُفرض اختيار فترة تجديد.
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:2}}>
                        {renderField(fGrace,!isEdit)}
                        {renderField(fTransferMin,!isEdit)}
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
                    <div style={{display:'flex',flexDirection:'column',gap:6,padding:'10px 12px',borderRadius:9,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.07)'}}>
                      <div style={{fontSize:11.5,fontWeight:800,color:C.gold,display:'flex',alignItems:'center',gap:8}}>
                        <span style={{width:20,height:20,borderRadius:'50%',background:'rgba(212,160,23,.18)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:10.5,fontWeight:800}}>{num}</span>
                        <span>{heading}</span>
                      </div>
                      <div style={{fontSize:10.5,color:'rgba(255,255,255,.65)',lineHeight:1.7,paddingRight:28}}>{formula}</div>
                      <div style={{fontSize:10.5,color:'#3483b4',background:'rgba(52,131,180,.07)',border:'1px solid rgba(52,131,180,.25)',padding:'6px 10px',borderRadius:6,fontWeight:600}}>{example}</div>
                      {fields&&fields.length>0&&<div style={{display:'grid',gridTemplateColumns:fieldCols||(fields.length>=2?'1fr 1fr':'1fr'),gap:8,marginTop:4,paddingTop:6,borderTop:'1px dashed rgba(255,255,255,.06)'}}>
                        {fields.map(f=>renderField(f,!isEdit))}
                      </div>}
                    </div>
                  )
                  return(<div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {/* Shared settings — affect all cases */}
                    <div style={{display:'flex',flexDirection:'column',gap:6,padding:'10px 12px',borderRadius:9,background:'rgba(212,160,23,.04)',border:`1px dashed ${C.gold}55`}}>
                      <div style={{fontSize:11,fontWeight:800,color:C.gold,display:'flex',alignItems:'center',gap:6}}>
                        <span style={{fontSize:13}}>⚙</span>
                        <span>إعدادات مشتركة — تؤثر على الحالات الثلاث</span>
                      </div>
                      <div style={{fontSize:10.5,color:'rgba(255,255,255,.6)',lineHeight:1.7}}>
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
                      <div style={{fontSize:11,fontWeight:800,color:C.red,display:'flex',alignItems:'center',gap:6}}>
                        <span style={{fontSize:13}}>⚠</span>
                        <span>حالة خاصة — إقامة منتهية من مدة</span>
                      </div>
                      <div style={{fontSize:10.5,color:'rgba(255,255,255,.6)',lineHeight:1.7}}>
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
                      <div style={{fontSize:11,fontWeight:800,color:C.ok,display:'flex',alignItems:'center',gap:6}}>
                        <Gift size={13} strokeWidth={2.4}/>
                        <span>مهن معفاة من رسوم التغيير</span>
                      </div>
                      <div style={{fontSize:10.5,color:'rgba(255,255,255,.6)',lineHeight:1.7}}>إذا كانت المهنة الحالية للعامل أو المهنة الجديدة ضمن هذه القائمة ← تصير رسوم تغيير المهنة <b>مجانية (0 ريال)</b>.</div>
                      {isEdit&&(()=>{
                        const q=priceState.__profChangeFreeQuery||''
                        const setQ=v=>setPriceState(p=>({...p,__profChangeFreeQuery:v}))
                        const filtered=occupations.filter(o=>!selectedSet.has(o.id)&&(q?((o.name_ar||'').includes(q)||(o.name_en||'').toLowerCase().includes(q.toLowerCase())):true))
                        return(<div style={{display:'flex',flexDirection:'column',gap:6,marginTop:4}}>
                          <input type="text" value={q} onChange={e=>setQ(e.target.value)} placeholder={`ابحث بالاسم (${occupations.length} مهنة متاحة)…`} style={{...inpS,height:34,textAlign:'right',direction:'rtl'}}/>
                          <div style={{maxHeight:220,overflowY:'auto',border:'1px solid rgba(255,255,255,.06)',borderRadius:7,background:'rgba(0,0,0,.25)'}}>
                            {filtered.length>0?filtered.slice(0,300).map(o=>(
                              <div key={o.id} onClick={()=>setPriceState(p=>({...p,profChangeFreeOccupations:[...selectedIds,o.id]}))} style={{padding:'7px 10px',cursor:'pointer',fontSize:11.5,fontWeight:700,color:'var(--tx)',borderBottom:'1px solid rgba(255,255,255,.04)',display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}} onMouseEnter={e=>{e.currentTarget.style.background='rgba(39,160,70,.08)'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
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
                          <span key={o.id} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'3px 8px 3px 5px',borderRadius:999,background:'rgba(39,160,70,.12)',border:`1px solid ${C.ok}55`,fontSize:11,fontWeight:700,color:C.ok}}>
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
              : <div style={{display:'grid',gridTemplateColumns:sec.fields.length>=2?'1fr 1fr':'1fr',gap:10}}>
                  {sec.fields.map(f=>renderField(f,!isEdit))}
                </div>
            }
          </>}
        </div>)
      })}
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
          <div style={{display:'flex',flexDirection:'column',gap:6,padding:'10px 12px',borderRadius:9,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.07)'}}>
            <div style={{fontSize:11.5,fontWeight:800,color:C.gold,display:'flex',alignItems:'center',gap:8}}>
              <span style={{width:20,height:20,borderRadius:'50%',background:'rgba(212,160,23,.18)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:10.5,fontWeight:800}}>{num}</span>
              <span>{heading}</span>
            </div>
            <div style={{fontSize:10.5,color:'rgba(255,255,255,.65)',lineHeight:1.7,paddingRight:28}}>{formula}</div>
            <div style={{fontSize:10.5,color:'#3483b4',background:'rgba(52,131,180,.07)',border:'1px solid rgba(52,131,180,.25)',padding:'6px 10px',borderRadius:6,fontWeight:600}}>{example}</div>
            <div style={{display:'grid',gridTemplateColumns:fields.length>=2?'1fr 1fr':'1fr',gap:8,marginTop:4,paddingTop:6,borderTop:'1px dashed rgba(255,255,255,.06)'}}>
              {fields.map(f=>renderField(f,!isEdit))}
            </div>
          </div>
        )
        return(
          <div style={{position:'relative',display:'flex',flexDirection:'column',gap:6,padding:isCol?'6px 10px':'14px 12px 12px',borderRadius:10,background:'rgba(255,255,255,.015)',border:`1px solid ${isCol?'rgba(255,255,255,.05)':'rgba(212,160,23,.35)'}`,transition:'.18s'}}>
            {!isCol&&!isEdit&&<EditTab onClick={()=>startEdit(title)}/>}
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
        const medFields=[{k:'medicalGraceMonths',d:2},{k:'medicalGraceDays',d:7}]
        const fGraceMonths={k:'medicalGraceMonths',l:'أشهر',d:2,sfx:'شهر'}
        const fGraceDays={k:'medicalGraceDays',l:'أيام إضافية',d:7,sfx:'يوم'}
        const updateBracket=(i,key,val)=>{const next=[...brackets];next[i]={...next[i],[key]:val};setPriceState(p=>({...p,medicalBrackets:next}))}
        const addBracket=()=>{
          const last=brackets[brackets.length-1]||{max:0}
          const start=Number(last.max)||0
          setPriceState(p=>({...p,medicalBrackets:[...(p.medicalBrackets||[]),{min:start,max:start+10,rate:0}]}))
        }
        const removeBracket=(i)=>{const next=brackets.filter((_,idx)=>idx!==i);setPriceState(p=>({...p,medicalBrackets:next}))}
        const caseBox=(num,heading,formula,example,children)=>(
          <div style={{display:'flex',flexDirection:'column',gap:6,padding:'10px 12px',borderRadius:9,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.07)'}}>
            <div style={{fontSize:11.5,fontWeight:800,color:C.gold,display:'flex',alignItems:'center',gap:8}}>
              <span style={{width:20,height:20,borderRadius:'50%',background:'rgba(212,160,23,.18)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:10.5,fontWeight:800}}>{num}</span>
              <span>{heading}</span>
            </div>
            <div style={{fontSize:10.5,color:'rgba(255,255,255,.65)',lineHeight:1.7,paddingRight:28}}>{formula}</div>
            {example&&<div style={{fontSize:10.5,color:'#3483b4',background:'rgba(52,131,180,.07)',border:'1px solid rgba(52,131,180,.25)',padding:'6px 10px',borderRadius:6,fontWeight:600}}>{example}</div>}
            <div style={{marginTop:4,paddingTop:6,borderTop:'1px dashed rgba(255,255,255,.06)'}}>{children}</div>
          </div>
        )
        return(
          <div style={{position:'relative',display:'flex',flexDirection:'column',gap:6,padding:isCol?'6px 10px':'14px 12px 12px',borderRadius:10,background:'rgba(255,255,255,.015)',border:`1px solid ${isCol?'rgba(255,255,255,.05)':'rgba(212,160,23,.35)'}`,transition:'.18s'}}>
            {!isCol&&!isEdit&&<EditTab onClick={()=>startEdit(title)}/>}
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
                  `تُحتسب الرسوم من تاريخ ميلاد العامل بناء على جدول الفئات العمرية أدناه.`,
                  sample?`مثال: عمر 35 سنة ← فئة ${sample.min}-${sample.max} = ${fmtNum(sample.rate)} ريال`:'أضِف فئات عمرية للاحتساب',
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {brackets.length===0&&<div style={{fontSize:10.5,color:'var(--tx5)',textAlign:'center',padding:'10px 0'}}>لا توجد فئات عمرية — {isEdit?'اضغط «إضافة فئة» أدناه':'ادخل وضع التعديل لإضافة فئات'}</div>}
                    {brackets.map((b,i)=>{
                      const ageRange=`${b.min??'—'}-${b.max??'—'} سنة`
                      return(<div key={i} style={{display:'grid',gridTemplateColumns:isEdit?'70px 1fr 1fr 1fr auto':'100px 1fr',gap:8,alignItems:'center',padding:'6px 8px',borderRadius:7,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.05)'}}>
                        <span style={{fontSize:10.5,fontWeight:800,color:C.gold,background:'rgba(212,160,23,.12)',border:`1px solid ${C.gold}55`,borderRadius:999,padding:'3px 8px',textAlign:'center',whiteSpace:'nowrap',direction:isEdit?'ltr':'rtl'}}>{isEdit?`#${i+1}`:ageRange}</span>
                        {isEdit?<>
                          <div>
                            <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,.45)',marginBottom:3,textAlign:'center'}}>من عمر</div>
                            <input type="text" inputMode="numeric" value={b.min??''} onChange={e=>updateBracket(i,'min',e.target.value===''?'':Number(e.target.value.replace(/[^0-9]/g,'')))} placeholder="20" style={{...inpS,height:32,fontSize:12}}/>
                          </div>
                          <div>
                            <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,.45)',marginBottom:3,textAlign:'center'}}>إلى عمر</div>
                            <input type="text" inputMode="numeric" value={b.max??''} onChange={e=>updateBracket(i,'max',e.target.value===''?'':Number(e.target.value.replace(/[^0-9]/g,'')))} placeholder="30" style={{...inpS,height:32,fontSize:12}}/>
                          </div>
                          <div>
                            <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,.45)',marginBottom:3,textAlign:'center'}}>السعر (ريال)</div>
                            <input type="text" inputMode="decimal" value={b.rate??''} onChange={e=>updateBracket(i,'rate',e.target.value===''?'':Number(e.target.value.replace(/[^0-9.]/g,'')))} placeholder="400" style={{...inpS,height:32,fontSize:12}}/>
                          </div>
                          <button type="button" onClick={()=>removeBracket(i)} style={{width:28,height:28,borderRadius:7,border:'1px solid rgba(192,57,43,.25)',background:'rgba(192,57,43,.08)',color:C.red,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,flexShrink:0,alignSelf:'end'}} title="حذف الفئة">
                            <X size={12} strokeWidth={2.5}/>
                          </button>
                        </>:<span style={{fontSize:12,fontWeight:800,color:'var(--tx)',textAlign:'start',display:'inline-flex',alignItems:'baseline',gap:5}}><span style={{direction:'ltr'}}>{fmtNum(b.rate)}</span><span style={{fontSize:10,fontWeight:700,color:'var(--tx5)'}}>ريال</span></span>}
                      </div>)
                    })}
                    {isEdit&&<button type="button" onClick={addBracket} style={{height:32,marginTop:2,borderRadius:8,border:'1px dashed rgba(212,160,23,.35)',background:'transparent',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:5}}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      <span>إضافة فئة عمرية</span>
                    </button>}
                  </div>
                )}
              </div>
            </>}
          </div>
        )
      })()}
    </>
  : <div style={{display:'grid',gridTemplateColumns:sch.fields.length>=3?'1fr 1fr':'1fr',gap:10}}>
      {sch.fields.map(renderField)}
    </div>
}
<div style={{display:'flex',gap:10,justifyContent:'space-between',alignItems:'center',paddingTop:14,borderTop:'1px solid rgba(255,255,255,.06)',marginTop:8,flexWrap:'wrap'}}>
<span style={{fontSize:11,color:'var(--tx5)',fontWeight:500}}>{isKafala?'كل قسم له زر حفظ مستقل — اضغط "حفظ" عند كل قسم لحفظ تعديلاته':''}</span>
<div style={{display:'flex',gap:8}}>
<button type="button" onClick={()=>setExpanded(null)} style={{height:40,padding:'0 18px',borderRadius:11,border:'1px solid rgba(255,255,255,.06)',background:'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',color:'rgba(255,255,255,.78)',fontFamily:F,fontSize:12,fontWeight:500,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8,boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'}}>إغلاق</button>
{!isKafala&&<button type="button" onClick={()=>savePrice(s.id)} style={{height:40,padding:'0 18px',borderRadius:11,border:'1px solid rgba(212,160,23,.45)',background:'linear-gradient(180deg,rgba(212,160,23,.22) 0%,rgba(212,160,23,.10) 100%)',color:C.gold,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8,boxShadow:'0 2px 8px rgba(212,160,23,.18), inset 0 1px 0 rgba(212,160,23,.18)',transition:'.2s'}}>
<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
<span>حفظ التسعير</span>
</button>}
</div>
</div>
</div>
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
      style={{position:'relative',cursor:'pointer',borderRadius:14,background:`radial-gradient(ellipse at top, ${tone}10 0%, #222 60%)`,border:'1px solid rgba(255,255,255,.05)',boxShadow:'0 4px 14px rgba(0,0,0,.22)',overflow:'hidden',opacity:st.active?1:.7,transition:'.15s'}}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=`${tone}55`}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.05)'}}>
      <div style={{padding:'16px 22px 14px 18px'}}>
        <div className="svc-row-grid">
          {/* Right (info): icon + name + tags */}
          <div style={{minWidth:0,display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:40,height:40,borderRadius:10,background:'linear-gradient(180deg,rgba(212,160,23,.14),rgba(212,160,23,.06))',border:'1px solid rgba(212,160,23,.25)',display:'flex',alignItems:'center',justifyContent:'center',color:C.gold,flexShrink:0}}>
              <I size={18} strokeWidth={1.8}/>
            </div>
            <div style={{minWidth:0,flex:1,display:'flex',flexDirection:'column',gap:6}}>
              <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                <span style={{fontSize:14.5,fontWeight:700,color:'#fff',letterSpacing:'-.2px'}}>{s.name_ar}</span>
                <span style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:6,background:`${st.active?C.ok:C.red}18`,color:st.active?C.ok:C.red,border:`1px solid ${st.active?C.ok:C.red}38`,display:'inline-flex',alignItems:'center',gap:4,flexShrink:0}}>
                  <span style={{width:5,height:5,borderRadius:'50%',background:st.active?C.ok:C.red}}/>
                  {st.active?'فعّالة':'معطّلة'}
                </span>
                {!st.billable&&<span style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:6,background:`${C.ok}18`,color:C.ok,border:`1px solid ${C.ok}38`,display:'inline-flex',alignItems:'center',gap:4,flexShrink:0}}>
                  <Gift size={9} strokeWidth={2.8}/> مجانية
                </span>}
                {ovs.length>0&&<span style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:6,background:'rgba(212,160,23,.12)',color:C.gold,border:'1px solid rgba(212,160,23,.35)',display:'inline-flex',alignItems:'center',gap:4,flexShrink:0}}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>
                  {ovs.length} مكتب
                </span>}
              </div>
              <div style={{fontSize:11,color:'var(--tx4)',fontFamily:'monospace',direction:'ltr',fontWeight:500}}>{s.id}</div>
            </div>
          </div>

          {/* Vertical divider */}
          <div className="svc-row-divider" style={{width:1,alignSelf:'stretch',background:'rgba(255,255,255,.06)',minHeight:60}}/>

          {/* Left (stats): default price + overrides */}
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:10,color:'var(--tx4)',fontWeight:600,letterSpacing:'.3px',textTransform:'uppercase'}}>{st.billable?'السعر':'التشغيل'}</span>
              <span style={{fontSize:10,color:'var(--tx4)',fontWeight:600}}>{hasPrice?`${PRICING_SCHEMA[s.id].fields.length} حقل`:'ديناميكي'}</span>
            </div>
            <div style={{fontSize:24,fontWeight:700,color:'#fff',fontVariantNumeric:'tabular-nums',direction:'ltr',letterSpacing:'-.5px',lineHeight:1}}>
              {st.billable?(sp?Number(sp.value).toLocaleString('en-US'):'—'):(st.active?'مجانية':'معطّلة')}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:3,paddingTop:6,borderTop:'1px solid rgba(255,255,255,.06)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:11}}>
                <span style={{color:'var(--tx4)',fontWeight:600}}>تخصيصات</span>
                <span style={{color:ovs.length?C.gold:'var(--tx5)',fontWeight:700,direction:'ltr',fontVariantNumeric:'tabular-nums'}}>{ovs.length}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:11}}>
                <span style={{color:'var(--tx4)',fontWeight:600}}>الفوترة</span>
                <span style={{color:st.billable?C.gold:C.ok,fontWeight:700,display:'inline-flex',alignItems:'center',gap:4}}>
                  {st.billable?<DollarSign size={11} strokeWidth={2.5}/>:<Gift size={11} strokeWidth={2.5}/>}
                  {st.billable?'مفوترة':'مجانية'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Progress strip */}
      <div style={{height:5,background:'rgba(255,255,255,.05)'}}>
        <div style={{height:'100%',width:`${pct}%`,background:tone,transition:'width .3s'}}/>
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
<div style={{width:44,height:44,borderRadius:11,background:'linear-gradient(180deg,rgba(212,160,23,.14),rgba(212,160,23,.06))',border:'1px solid rgba(212,160,23,.25)',display:'flex',alignItems:'center',justifyContent:'center',color:C.gold,flexShrink:0,boxShadow:'inset 0 1px 0 rgba(255,255,255,.05)'}}>
<I size={20} strokeWidth={1.8}/>
</div>
<div style={{flex:1,minWidth:0}}>
<div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4,flexWrap:'wrap'}}>
<span style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,.92)',fontFamily:F}}>{s.name_ar}</span>
{!st.billable&&<span style={{fontSize:10,fontWeight:600,padding:'4px 10px',borderRadius:6,background:C.ok+'15',color:C.ok,display:'inline-flex',alignItems:'center',gap:5}}><span style={{width:5,height:5,borderRadius:'50%',background:C.ok}}/>مجانية</span>}
{!st.active&&<span style={{fontSize:10,fontWeight:600,padding:'4px 10px',borderRadius:6,background:C.red+'15',color:C.red,display:'inline-flex',alignItems:'center',gap:5}}><span style={{width:5,height:5,borderRadius:'50%',background:C.red}}/>معطّلة</span>}
</div>
<div style={{fontSize:11,color:'var(--tx5)',fontFamily:F,direction:'ltr',fontWeight:500}}>{s.id}</div>
</div>
{/* Edit price button */}
{hasPrice&&st.billable&&<button type="button" onClick={()=>openPrice(s.id)} title={isOpen?'طيّ التفاصيل':'عرض التفاصيل'}
style={{height:40,padding:'0 14px',borderRadius:11,border:isOpen?'1px solid rgba(212,160,23,.45)':'1px solid rgba(255,255,255,.06)',background:isOpen?'linear-gradient(180deg,rgba(212,160,23,.16),rgba(212,160,23,.08))':'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',color:isOpen?C.gold:'rgba(255,255,255,.78)',fontFamily:F,fontSize:12,fontWeight:500,cursor:'pointer',display:'flex',alignItems:'center',gap:8,boxShadow:isOpen?'0 2px 8px rgba(212,160,23,.18), inset 0 1px 0 rgba(212,160,23,.18)':'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s',flexShrink:0}}>
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
    <div style={{padding:'10px 22px 14px',borderTop:'1px solid rgba(255,255,255,.04)',display:'flex',flexDirection:'column',gap:8,background:'rgba(0,0,0,.10)'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
        <span style={{fontSize:11,fontWeight:700,color:'var(--tx3)',display:'inline-flex',alignItems:'center',gap:6}}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>
          تخصيص لكل مكتب {ovs.length>0&&<span style={{padding:'1px 7px',borderRadius:999,background:'rgba(212,160,23,.14)',color:C.gold,fontWeight:800,fontSize:10}}>{ovs.length}</span>}
        </span>
        <button type="button" onClick={()=>openOverrideEditor(s.id,null)}
          style={{height:28,padding:'0 10px',borderRadius:7,border:'1px dashed rgba(212,160,23,.35)',background:'transparent',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:4}}>
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
            <span key={o.branchId} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'4px 4px 4px 10px',borderRadius:999,background:'rgba(212,160,23,.08)',border:'1px solid rgba(212,160,23,.25)',fontSize:11,fontWeight:700,color:'var(--tx)'}}>
              <button type="button" onClick={()=>openOverrideEditor(s.id,o.branchId)} title="تعديل التخصيص" style={{background:'transparent',border:'none',padding:0,cursor:'pointer',color:'inherit',fontFamily:F,fontWeight:700,display:'inline-flex',alignItems:'center',gap:5}}>
                <span style={{color:C.gold,direction:'ltr',fontFamily:'monospace'}}>{code}</span>
                {aOff&&<span title="معطّلة" style={{color:C.red,fontSize:10}}>✗</span>}
                {!aOff&&bOff&&<span title="مجانية" style={{color:C.ok,fontSize:10}}>$</span>}
                {pCount>0&&<span style={{padding:'1px 6px',borderRadius:999,background:'rgba(212,160,23,.18)',color:C.gold,fontSize:9}}>{pCount} سعر</span>}
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
{isOpen&&<div style={{padding:'24px 22px 18px',borderTop:'1px solid rgba(255,255,255,.06)',background:'rgba(0,0,0,.18)'}}>
{renderPriceEditor(s)}
</div>}
</div>
}

const sectionCard={...GLASS_CARD,padding:'16px 18px',display:'flex',flexDirection:'column',gap:12}
const sectionHead={display:'flex',alignItems:'center',gap:8,paddingBottom:10,borderBottom:'1px solid rgba(255,255,255,.06)'}
const sectionTitle={fontSize:13,fontWeight:600,color:'rgba(255,255,255,.88)',display:'inline-flex',alignItems:'center',gap:8}
const sectionIconBox={width:28,height:28,borderRadius:8,background:'linear-gradient(180deg,rgba(212,160,23,.14),rgba(212,160,23,.06))',border:'1px solid rgba(212,160,23,.25)',display:'inline-flex',alignItems:'center',justifyContent:'center',color:C.gold}

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

// Effective default sample price for the row stat — uses the first numeric pricing field (best-effort).
const samplePrice=(svcId)=>{
  const sch=PRICING_SCHEMA[svcId];if(!sch)return null
  const def=getPricing(svcId)||{}
  const f=sch.fields.find(f=>def[f.k]!=null&&def[f.k]!==''&&!isNaN(Number(def[f.k])))
  return f?{value:Number(def[f.k]),sfx:f.sfx,label:f.l}:null
}

const SVC_LIST_STYLES=(<style>{`
  .svc-hero{display:grid;grid-template-columns:2.2fr 1fr 1.5fr;gap:14px;margin-bottom:24px}
  @media (max-width: 1100px){.svc-hero{grid-template-columns:1fr 1fr}.svc-hero > :nth-child(3){grid-column:1/-1}}
  @media (max-width: 720px){.svc-hero{grid-template-columns:1fr}}
  .svc-row-grid{display:grid;grid-template-columns:1fr 1px 240px;gap:18px;align-items:center}
  @media (max-width: 720px){.svc-row-grid{grid-template-columns:1fr;gap:12px}.svc-row-divider{display:none}}
  .svc-section{background:linear-gradient(180deg,#1f1f1f 0%,#181818 100%);border:1px solid rgba(255,255,255,.06);border-radius:16px;overflow:hidden;margin-bottom:14px}
  .svc-section-head{padding:14px 22px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;gap:10px}
  .svc-section-head-l{display:inline-flex;align-items:center;gap:10px;font-size:13px;font-weight:700;color:#fff;letter-spacing:.2px}
  .svc-section-body{padding:18px 22px}
  .svc-section-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
  .svc-section-count{padding:2px 8px;border-radius:999px;background:rgba(255,255,255,.06);font-size:10px;font-weight:700;color:var(--tx3)}
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
  return<div style={{padding:'24px 28px',direction:'rtl',fontFamily:F,color:'var(--tx2)'}}>
    {SVC_LIST_STYLES}

    {/* Top bar — back button */}
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,gap:12,flexWrap:'wrap'}}>
      <button type="button" onClick={()=>setSelectedSvcId(null)}
        style={{height:40,padding:'0 14px',borderRadius:11,background:'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',border:'1px solid rgba(255,255,255,.06)',color:'rgba(255,255,255,.78)',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8,fontFamily:F,fontSize:12,fontWeight:500,boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'}}
        onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(212,160,23,.45)';e.currentTarget.style.color=C.gold}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.06)';e.currentTarget.style.color='rgba(255,255,255,.78)'}}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        <span>رجوع</span>
      </button>
    </div>

    {/* Header — title + tag row */}
    <div style={{marginBottom:18,marginTop:6}}>
      <div style={{fontSize:21,fontWeight:600,color:'rgba(255,255,255,.93)'}}>تفاصيل الخدمة</div>
      <div style={{marginTop:18,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',fontSize:11.5,color:'var(--tx3)'}}>
        <span style={{display:'inline-flex',alignItems:'center',gap:7,color:C.gold,fontWeight:700,borderBottom:`1.5px solid ${C.gold}`,paddingBottom:1}}>
          <I size={14} strokeWidth={1.8}/>
          {s.name_ar}
        </span>
        <span style={{width:3,height:3,borderRadius:'50%',background:'rgba(255,255,255,.18)'}}/>
        <span style={{color:'var(--tx4)',fontFamily:'monospace',direction:'ltr',fontWeight:600}}>{s.id}</span>
        <span style={{width:3,height:3,borderRadius:'50%',background:'rgba(255,255,255,.18)'}}/>
        <span style={{display:'inline-flex',alignItems:'center',gap:5,color:st.active?C.ok:C.red,fontWeight:700}}>
          <span style={{width:5,height:5,borderRadius:'50%',background:st.active?C.ok:C.red,boxShadow:`0 0 5px ${st.active?C.ok:C.red}`}}/>
          {st.active?'فعّالة':'معطّلة'}
        </span>
        <span style={{width:3,height:3,borderRadius:'50%',background:'rgba(255,255,255,.18)'}}/>
        <span style={{display:'inline-flex',alignItems:'center',gap:5,color:st.billable?C.gold:C.ok,fontWeight:700}}>
          {st.billable?<DollarSign size={11} strokeWidth={2.5}/>:<Gift size={11} strokeWidth={2.5}/>}
          {st.billable?'مفوترة':'مجانية'}
        </span>
        {ovs.length>0&&<>
          <span style={{width:3,height:3,borderRadius:'50%',background:'rgba(255,255,255,.18)'}}/>
          <span style={{padding:'3px 10px',borderRadius:999,background:'rgba(212,160,23,.12)',border:'1px solid rgba(212,160,23,.4)',color:C.gold,fontSize:10.5,fontWeight:800,display:'inline-flex',alignItems:'center',gap:5}}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>
            {ovs.length} مكتب مخصّص
          </span>
        </>}
      </div>
    </div>

    {/* 3-col hero — Big primary KPI + Stacked + Distribution */}
    <div className="svc-hero">
      {/* Big primary — sample default price OR status if free */}
      <div style={{position:'relative',padding:'18px 22px',borderRadius:16,background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',border:'1px solid rgba(255,255,255,.05)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',display:'flex',flexDirection:'column',justifyContent:'space-between',overflow:'hidden',minHeight:150}}>
        <div style={{position:'absolute',insetInlineStart:-60,top:-60,width:180,height:180,borderRadius:'50%',background:`radial-gradient(circle, ${tone}18 0%, transparent 70%)`,pointerEvents:'none'}}/>
        <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:-6}}>
          <span style={{width:8,height:8,borderRadius:'50%',background:tone,boxShadow:`0 0 10px ${tone}aa`}}/>
          <span style={{fontSize:24,color:'#fff',fontWeight:600,letterSpacing:'.2px'}}>{st.billable?'السعر الافتراضي':(st.active?'خدمة مجانية':'الخدمة معطّلة')}</span>
        </div>
        <div style={{position:'relative',display:'flex',alignItems:'baseline',gap:7,direction:'ltr'}}>
          {st.billable&&sp?<>
            <span style={{fontSize:13,color:'var(--tx4)',fontWeight:600}}>{sp.sfx||'ريال'}</span>
            <span style={{fontSize:42,fontWeight:800,color:tone,letterSpacing:'-1.5px',lineHeight:1,fontVariantNumeric:'tabular-nums'}}>{Number(sp.value).toLocaleString('en-US')}</span>
          </>:<span style={{fontSize:42,fontWeight:800,color:tone,letterSpacing:'-1.5px',lineHeight:1}}>{st.billable?'—':'0'}</span>}
        </div>
        <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:8,borderTop:'1px solid rgba(255,255,255,.06)'}}>
          <span style={{fontSize:11,color:'var(--tx3)',fontWeight:600}}>{sp?sp.label:(hasPrice?'يحتاج إعداد التسعير':'يُحسب ديناميكياً')}</span>
          {hasPrice&&<span style={{fontSize:11,color:C.gold,fontWeight:700}}>{PRICING_SCHEMA[s.id].fields.length} حقل تسعير</span>}
        </div>
      </div>

      {/* Stacked secondary — overrides + branches affected */}
      <div style={{borderRadius:16,background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',border:'1px solid rgba(255,255,255,.05)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',display:'flex',flexDirection:'column',overflow:'hidden',minHeight:150}}>
        {[
          {label:'تخصيصات لمكاتب',val:ovs.length,cnt:ovDisabled,c:C.gold,sub:'معطّلة فيهم'},
          {label:'فرق أسعار',val:ovPriced,cnt:ovBillable,c:C.blue,sub:'فوترة مختلفة'},
        ].map((s2,i)=>(
          <div key={i} style={{position:'relative',padding:'12px 16px',flex:1,borderTop:i>0?'1px solid rgba(255,255,255,.06)':'none',display:'flex',flexDirection:'column',justifyContent:'space-between',gap:6,overflow:'hidden'}}>
            <div style={{position:'absolute',insetInlineStart:-25,top:'50%',transform:'translateY(-50%)',width:70,height:70,borderRadius:'50%',background:`radial-gradient(circle, ${s2.c}10 0%, transparent 70%)`,pointerEvents:'none'}}/>
            <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'space-between',gap:5}}>
              <span style={{width:5,height:5,borderRadius:'50%',background:s2.c}}/>
              <div style={{display:'flex',alignItems:'center',gap:5}}>
                <span style={{fontSize:13,color:'#fff',fontWeight:700}}>{s2.label}</span>
                <span style={{fontSize:11,color:'var(--tx4)',fontWeight:600}}>({s2.cnt} {s2.sub})</span>
              </div>
            </div>
            <div style={{position:'relative',display:'flex',alignItems:'baseline',direction:'ltr'}}>
              <span style={{fontSize:20,fontWeight:700,color:s2.c,fontVariantNumeric:'tabular-nums',lineHeight:1,letterSpacing:'-.5px'}}>{s2.val}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Distribution — branches affected (compact list) */}
      <div style={{borderRadius:16,background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',border:'1px solid rgba(255,255,255,.05)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',padding:'12px 16px',display:'flex',flexDirection:'column',gap:10,minHeight:150}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:12,color:'var(--tx2)',fontWeight:600,letterSpacing:'.2px'}}>المكاتب المتأثّرة</span>
          <span style={{fontSize:11,color:'var(--tx4)',fontWeight:600}}>
            <span style={{color:C.gold,fontWeight:700,direction:'ltr',fontVariantNumeric:'tabular-nums'}}>{ovs.length}</span>/{branches.length}
          </span>
        </div>
        {ovs.length===0?(
          <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'var(--tx5)',textAlign:'center',padding:'10px 0'}}>
            لا توجد تخصيصات — كل المكاتب على الافتراضي
          </div>
        ):(
          <div style={{display:'flex',flexWrap:'wrap',gap:5,maxHeight:90,overflowY:'auto'}}>
            {ovs.map(o=>{
              const br=branches.find(b=>b.id===o.branchId)
              const code=br?.branch_code||'—'
              const isOff=o.active===false
              return(
                <span key={o.branchId} title={code} style={{padding:'3px 8px',borderRadius:999,background:isOff?'rgba(192,57,43,.10)':'rgba(212,160,23,.10)',border:`1px solid ${isOff?'rgba(192,57,43,.3)':'rgba(212,160,23,.3)'}`,color:isOff?C.red:C.gold,fontSize:10.5,fontWeight:800,fontFamily:'monospace',direction:'ltr'}}>
                  {code}
                </span>
              )
            })}
          </div>
        )}
      </div>
    </div>

    {/* Section: Operations — active + billable toggles */}
    <div className="svc-section">
      <div className="svc-section-head">
        <span className="svc-section-head-l">
          <span className="svc-section-dot" style={{background:C.gold}}/>
          <Power size={13} color={C.gold}/> التشغيل والفوترة (افتراضي لكل المكاتب)
        </span>
      </div>
      <div className="svc-section-body">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          {/* Active */}
          <div style={{padding:'14px 16px',borderRadius:11,background:'rgba(0,0,0,.18)',border:'1px solid rgba(255,255,255,.06)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
            <div>
              <div style={{fontSize:12,color:'var(--tx2)',fontWeight:700,marginBottom:4}}>حالة التشغيل</div>
              <div style={{fontSize:10.5,color:'var(--tx5)',fontWeight:500}}>{st.active?'الخدمة متاحة لكل المكاتب':'الخدمة معطّلة لكل المكاتب'}</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
              <button type="button" onClick={()=>update(s.id,'active',!st.active)} title={st.active?'اضغط للتعطيل':'اضغط للتفعيل'}
                style={{width:50,height:26,borderRadius:999,border:'none',background:st.active?C.ok:'rgba(192,57,43,.7)',cursor:'pointer',position:'relative',transition:'.2s',padding:0,boxShadow:'0 2px 6px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.12)'}}>
                <span style={{position:'absolute',width:20,height:20,borderRadius:'50%',background:'#fff',top:3,right:st.active?3:27,transition:'.2s',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {st.active?<Power size={11} color={C.ok} strokeWidth={3}/>:<PowerOff size={11} color={C.red} strokeWidth={3}/>}
                </span>
              </button>
              <span style={{fontSize:10,fontWeight:700,color:st.active?C.ok:C.red}}>{st.active?'فعّالة':'معطّلة'}</span>
            </div>
          </div>
          {/* Billable */}
          <div style={{padding:'14px 16px',borderRadius:11,background:'rgba(0,0,0,.18)',border:'1px solid rgba(255,255,255,.06)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
            <div>
              <div style={{fontSize:12,color:'var(--tx2)',fontWeight:700,marginBottom:4}}>حالة الفوترة</div>
              <div style={{fontSize:10.5,color:'var(--tx5)',fontWeight:500}}>{st.billable?'تُضاف للفاتورة بسعر التسعير':'لا تُحتسب على العميل'}</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
              <button type="button" onClick={()=>update(s.id,'billable',!st.billable)} title={st.billable?'اضغط لجعلها مجانية':'اضغط لجعلها مفوترة'}
                style={{width:50,height:26,borderRadius:999,border:'none',background:st.billable?C.gold:'rgba(39,160,70,.7)',cursor:'pointer',position:'relative',transition:'.2s',padding:0,boxShadow:'0 2px 6px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.12)'}}>
                <span style={{position:'absolute',width:20,height:20,borderRadius:'50%',background:'#fff',top:3,right:st.billable?3:27,transition:'.2s',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {st.billable?<DollarSign size={11} color={C.gold} strokeWidth={3}/>:<Gift size={11} color={C.ok} strokeWidth={3}/>}
                </span>
              </button>
              <span style={{fontSize:10,fontWeight:700,color:st.billable?C.gold:C.ok}}>{st.billable?'مفوترة':'مجانية'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Section: Default pricing editor (full editor inline) */}
    {hasPrice&&st.billable&&(()=>{
      // Lazy-init priceState for this service so the editor renders correctly
      if(expanded!==s.id){setTimeout(()=>{setExpanded(s.id);setPriceState(getPricing(s.id)||{});setCollapsed(Object.fromEntries(ALL_KAFALA_SECTIONS.map(t=>[t,true])));setEditing({})},0)}
      return(
        <div className="svc-section">
          <div className="svc-section-head">
            <span className="svc-section-head-l">
              <span className="svc-section-dot" style={{background:C.gold}}/>
              <DollarSign size={13} color={C.gold}/> التسعير الافتراضي (لكل المكاتب)
            </span>
            <span style={{fontSize:11,color:'var(--tx4)',fontWeight:600}}>{PRICING_SCHEMA[s.id].fields.length} حقل</span>
          </div>
          <div className="svc-section-body" style={{padding:'18px 22px',background:'rgba(0,0,0,.10)'}}>
            {renderPriceEditor(s)}
          </div>
        </div>
      )
    })()}

    {/* Section: Per-branch overrides */}
    <div className="svc-section">
      <div className="svc-section-head">
        <span className="svc-section-head-l">
          <span className="svc-section-dot" style={{background:C.blue}}/>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>
          التخصيصات حسب المكتب
          <span className="svc-section-count">{ovs.length}</span>
        </span>
        <button type="button" onClick={()=>openOverrideEditor(s.id,null)}
          style={{height:32,padding:'0 12px',borderRadius:9,border:'1px dashed rgba(212,160,23,.45)',background:'rgba(212,160,23,.06)',color:C.gold,fontFamily:F,fontSize:11.5,fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:5}}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          إضافة تخصيص
        </button>
      </div>
      <div className="svc-section-body">
        {ovs.length===0?(
          <div style={{padding:28,textAlign:'center',color:'var(--tx4)',fontSize:12,border:'1px dashed rgba(255,255,255,.08)',borderRadius:10}}>
            كل المكاتب تستخدم الإعدادات الافتراضية أعلاه — اضغط «إضافة تخصيص» لتغيير الحالة أو السعر لمكتب معين
          </div>
        ):(
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {ovs.map(o=>{
              const br=branches.find(b=>b.id===o.branchId)
              const code=br?.branch_code||'—'
              const aOff=o.active===false
              const bOff=typeof o.billable==='boolean'&&o.billable!==(s.defaultBillable!==false)
              const pCount=o.pricing?Object.keys(o.pricing).length:0
              return(
                <span key={o.branchId} style={{display:'inline-flex',alignItems:'center',gap:8,padding:'8px 8px 8px 14px',borderRadius:11,background:'rgba(212,160,23,.08)',border:'1px solid rgba(212,160,23,.25)'}}>
                  <button type="button" onClick={()=>openOverrideEditor(s.id,o.branchId)} title="تعديل" style={{background:'transparent',border:'none',padding:0,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8,fontFamily:F}}>
                    <span style={{color:C.gold,direction:'ltr',fontFamily:'monospace',fontWeight:800,fontSize:13}}>{code}</span>
                    {aOff&&<span title="معطّلة" style={{padding:'2px 7px',borderRadius:5,background:'rgba(192,57,43,.15)',border:'1px solid rgba(192,57,43,.35)',color:C.red,fontSize:10,fontWeight:700,display:'inline-flex',alignItems:'center',gap:3}}><PowerOff size={9} strokeWidth={2.8}/>معطّلة</span>}
                    {!aOff&&bOff&&<span title="فوترة مختلفة" style={{padding:'2px 7px',borderRadius:5,background:'rgba(39,160,70,.15)',border:'1px solid rgba(39,160,70,.35)',color:C.ok,fontSize:10,fontWeight:700,display:'inline-flex',alignItems:'center',gap:3}}><Gift size={9} strokeWidth={2.8}/>مجانية</span>}
                    {pCount>0&&<span style={{padding:'2px 7px',borderRadius:5,background:'rgba(212,160,23,.18)',color:C.gold,fontSize:10,fontWeight:700,display:'inline-flex',alignItems:'center',gap:3}}><DollarSign size={9} strokeWidth={2.8}/>{pCount} سعر</span>}
                  </button>
                  <button type="button" onClick={()=>removeBranchOverride(o.branchId,s.id)} title="حذف التخصيص" style={{width:22,height:22,borderRadius:'50%',border:'none',background:'rgba(192,57,43,.15)',color:C.red,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',padding:0}}>
                    <X size={11} strokeWidth={3}/>
                  </button>
                </span>
              )
            })}
          </div>
        )}
      </div>
    </div>

    <div style={{fontSize:11,color:'var(--tx5)',textAlign:'center',padding:'10px 0'}}>الإعدادات تُحفظ محلياً على هذا المتصفح</div>
  </div>
}

// ═══════════════════════════════════════════════════════════════
// LIST VIEW — InvoicePage-style hero + grouped row-cards
// ═══════════════════════════════════════════════════════════════
return<div style={{padding:'24px 28px',display:'flex',flexDirection:'column',direction:'rtl',fontFamily:F}}>
{SVC_LIST_STYLES}

{/* Page header */}
<div style={{marginBottom:22}}>
  <div style={{fontSize:24,fontWeight:600,color:'rgba(255,255,255,.93)',letterSpacing:'-.3px',lineHeight:1.2}}>إدارة الخدمات</div>
  <div style={{fontSize:13,fontWeight:500,color:'var(--tx4)',marginTop:12,lineHeight:1.6}}>تحكّم في حالة الخدمات (مفعّلة / معطّلة)، فوترتها (مفوترة / مجانية)، وتسعيرها لكل مكتب على حدة</div>
</div>

{/* 3-col Hero — Big primary KPI + Stacked + Distribution */}
<div className="svc-hero">
  {/* Big primary — total services */}
  <div style={{position:'relative',padding:'18px 22px',borderRadius:16,background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',border:'1px solid rgba(255,255,255,.05)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',display:'flex',flexDirection:'column',justifyContent:'space-between',overflow:'hidden',minHeight:150}}>
    <div style={{position:'absolute',insetInlineStart:-60,top:-60,width:180,height:180,borderRadius:'50%',background:`radial-gradient(circle, ${C.gold}18 0%, transparent 70%)`,pointerEvents:'none'}}/>
    <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:-6}}>
      <span style={{width:8,height:8,borderRadius:'50%',background:C.gold,boxShadow:`0 0 10px ${C.gold}aa`}}/>
      <span style={{fontSize:24,color:'#fff',fontWeight:600,letterSpacing:'.2px'}}>الخدمات الفعّالة</span>
    </div>
    <div style={{position:'relative',display:'flex',alignItems:'baseline',gap:7,direction:'ltr'}}>
      <span style={{fontSize:13,color:'var(--tx4)',fontWeight:600}}>/ {totalCount}</span>
      <span style={{fontSize:42,fontWeight:800,color:C.gold,letterSpacing:'-1.5px',lineHeight:1,fontVariantNumeric:'tabular-nums'}}>{activeCount}</span>
    </div>
    <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:8,borderTop:'1px solid rgba(255,255,255,.06)'}}>
      <span style={{fontSize:11,color:'var(--tx3)',fontWeight:600}}>{disabledCount===0?'كل الخدمات فعّالة':`${disabledCount} معطّلة`}</span>
      <span style={{fontSize:13,color:C.gold,fontWeight:700,direction:'ltr',fontVariantNumeric:'tabular-nums'}}>{Object.keys(branchOverrides).length} مكتب مخصّص</span>
    </div>
  </div>

  {/* Stacked secondary — billable / free */}
  <div style={{borderRadius:16,background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',border:'1px solid rgba(255,255,255,.05)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',display:'flex',flexDirection:'column',overflow:'hidden',minHeight:150}}>
    {[
      {label:'مفوترة',val:billableCount,cnt:totalCount-billableCount-disabledCount,c:C.gold,sub:'مجانية'},
      {label:'معطّلة',val:disabledCount,cnt:freeCount,c:disabledCount?C.red:'#999',sub:'مجانية'},
    ].map((s,i)=>(
      <div key={i} style={{position:'relative',padding:'12px 16px',flex:1,borderTop:i>0?'1px solid rgba(255,255,255,.06)':'none',display:'flex',flexDirection:'column',justifyContent:'space-between',gap:6,overflow:'hidden'}}>
        <div style={{position:'absolute',insetInlineStart:-25,top:'50%',transform:'translateY(-50%)',width:70,height:70,borderRadius:'50%',background:`radial-gradient(circle, ${s.c}10 0%, transparent 70%)`,pointerEvents:'none'}}/>
        <div style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'space-between',gap:5}}>
          <span style={{width:5,height:5,borderRadius:'50%',background:s.c}}/>
          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{fontSize:13,color:'#fff',fontWeight:700}}>{s.label}</span>
            <span style={{fontSize:11,color:'var(--tx4)',fontWeight:600}}>({s.cnt} {s.sub})</span>
          </div>
        </div>
        <div style={{position:'relative',display:'flex',alignItems:'baseline',direction:'ltr'}}>
          <span style={{fontSize:20,fontWeight:700,color:s.c,fontVariantNumeric:'tabular-nums',lineHeight:1,letterSpacing:'-.5px'}}>{s.val}</span>
        </div>
      </div>
    ))}
  </div>

  {/* Distribution — by category */}
  <div style={{borderRadius:16,background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',border:'1px solid rgba(255,255,255,.05)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',padding:'12px 16px',display:'flex',flexDirection:'column',gap:10,minHeight:150}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <span style={{fontSize:12,color:'var(--tx2)',fontWeight:600,letterSpacing:'.2px'}}>التوزّع حسب الفئة</span>
      <span style={{fontSize:11,color:'var(--tx4)',fontWeight:600}}>
        <span style={{color:C.gold,fontWeight:700,direction:'ltr',fontVariantNumeric:'tabular-nums'}}>{totalCount}</span> خدمة
      </span>
    </div>
    {totalCount>0&&(
      <div style={{display:'flex',height:8,borderRadius:999,overflow:'hidden',background:'rgba(255,255,255,.04)'}}>
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
          <span style={{color:x.c,fontVariantNumeric:'tabular-nums',direction:'ltr',minWidth:14,textAlign:'center',fontWeight:700}}>{x.v}</span>
          <span style={{color:'var(--tx2)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{x.l}</span>
        </div>
      ))}
    </div>
  </div>
</div>

{/* Filter row */}
<div style={{display:'flex',gap:10,marginBottom:18,alignItems:'center',flexWrap:'wrap'}}>
  <div style={{flex:'1 1 280px',position:'relative'}}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'var(--tx4)',pointerEvents:'none'}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="ابحث باسم الخدمة أو معرّفها..." style={{width:'100%',height:44,padding:'0 14px 0 38px',borderRadius:12,background:'rgba(0,0,0,.18)',border:'1px solid rgba(255,255,255,.05)',color:'#fff',fontSize:13,fontFamily:F,boxSizing:'border-box'}}/>
  </div>
</div>

{/* Group: الخدمات الرئيسية */}
{(() => {
  const list=filteredMain
  const totalAct=list.filter(s=>getState(s.id).active).length
  return(
    <div style={{marginBottom:28}}>
      <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:12,paddingBottom:10,borderBottom:'1px solid rgba(255,255,255,.06)'}}>
        <div style={{display:'flex',alignItems:'baseline',gap:12}}>
          <span style={{width:6,height:6,borderRadius:'50%',background:C.gold,transform:'translateY(-2px)'}}/>
          <span style={{fontSize:14,fontWeight:700,color:'var(--tx2)'}}>الخدمات الرئيسية</span>
          <span style={{fontSize:12,color:'var(--tx4)',fontWeight:600}}>· {totalAct}/{list.length} فعّالة</span>
        </div>
        <div style={{fontSize:11,color:'var(--tx3)',fontWeight:600}}>
          <span style={{color:C.gold,direction:'ltr',fontVariantNumeric:'tabular-nums',fontWeight:700}}>{list.filter(s=>getOverridesForSvc(s.id).length>0).length}</span> بتخصيصات
        </div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {list.length?list.map(s=>renderRow(s)):<div style={{padding:60,textAlign:'center',color:'var(--tx4)',fontSize:13,border:'1px dashed rgba(255,255,255,.08)',borderRadius:14}}>لا توجد نتائج</div>}
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
      <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:12,paddingBottom:10,borderBottom:'1px solid rgba(255,255,255,.06)'}}>
        <div style={{display:'flex',alignItems:'baseline',gap:12}}>
          <span style={{width:6,height:6,borderRadius:'50%',background:C.blue,transform:'translateY(-2px)'}}/>
          <span style={{fontSize:14,fontWeight:700,color:'var(--tx2)'}}>الخدمات الأخرى</span>
          <span style={{fontSize:12,color:'var(--tx4)',fontWeight:600}}>· {totalAct}/{list.length} فعّالة</span>
        </div>
        <div style={{fontSize:11,color:'var(--tx3)',fontWeight:600}}>
          <span style={{color:C.gold,direction:'ltr',fontVariantNumeric:'tabular-nums',fontWeight:700}}>{list.filter(s=>getOverridesForSvc(s.id).length>0).length}</span> بتخصيصات
        </div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {list.length?list.map(s=>renderRow(s)):<div style={{padding:60,textAlign:'center',color:'var(--tx4)',fontSize:13,border:'1px dashed rgba(255,255,255,.08)',borderRadius:14}}>لا توجد نتائج</div>}
      </div>
    </div>
  )
})()}

<div style={{fontSize:11,color:'var(--tx5)',textAlign:'center',padding:'10px 0'}}>
الإعدادات تُحفظ محلياً على هذا المتصفح
</div>

{/* ─── Branch override editor modal ─── */}
{overrideEditor&&(()=>{
  const svc=ALL_SERVICES.find(x=>x.id===overrideEditor.svcId)
  if(!svc)return null
  const sch=PRICING_SCHEMA[svc.id]
  const fields=sch?.fields?.filter(f=>!f.t||f.t==='text')||[]  // skip date/complex fields in this minimal editor
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
  const usedBranchIds=new Set(getOverridesForSvc(svc.id).map(o=>o.branchId).filter(b=>b!==overrideEditor.branchId))
  const availableBranches=branches.filter(b=>!usedBranchIds.has(b.id))
  const canSave=!!overrideEditor.branchId
  const onSave=()=>{
    if(!overrideEditor.branchId){toast(T('اختر مكتباً أولاً','Pick a branch first'));return}
    const patch={}
    if(typeof draft.active==='boolean'&&draft.active!==baseActive)patch.active=draft.active
    else patch.active=undefined
    if(typeof draft.billable==='boolean'&&draft.billable!==baseBillable)patch.billable=draft.billable
    else patch.billable=undefined
    // Coerce pricing values to numbers when applicable, drop empty
    const cleanPricing={}
    Object.entries(draft.pricing||{}).forEach(([k,v])=>{
      if(v===''||v===null||v===undefined)return
      const n=typeof v==='string'&&/^\d+(\.\d+)?$/.test(v)?Number(v):v
      cleanPricing[k]=n
    })
    patch.pricing=Object.keys(cleanPricing).length?cleanPricing:undefined
    upsertBranchOverride(overrideEditor.branchId,svc.id,patch)
    toast(T('تم حفظ التخصيص','Override saved'))
    setOverrideEditor(null)
  }
  const overlayS={position:'fixed',inset:0,background:'rgba(0,0,0,.6)',backdropFilter:'blur(4px)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:14,direction:'rtl',fontFamily:F}
  const modalS={width:'min(560px, 100%)',maxHeight:'92vh',overflowY:'auto',background:'linear-gradient(180deg,#1f1f1f 0%,#181818 100%)',border:'1px solid rgba(255,255,255,.08)',borderRadius:16,boxShadow:'0 20px 50px rgba(0,0,0,.6)'}
  const headS={padding:'14px 22px',borderBottom:'1px solid rgba(255,255,255,.06)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}
  const labelS={fontSize:11,fontWeight:600,color:'var(--tx3)',marginBottom:6,display:'block',textAlign:'right'}
  const compactInp={...FORM_INPUT,height:36,fontSize:12}
  const Toggle=({on,onChange,onLabel,offLabel,onColor,offColor,onIcon,offIcon})=>(
    <div style={{display:'inline-flex',alignItems:'center',gap:6}}>
      <button type="button" onClick={()=>onChange(!on)}
        style={{width:44,height:22,borderRadius:999,border:'none',background:on?onColor:offColor,cursor:'pointer',position:'relative',transition:'.2s',padding:0,boxShadow:'0 2px 6px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.12)'}}>
        <span style={{position:'absolute',width:16,height:16,borderRadius:'50%',background:'#fff',top:3,right:on?3:25,transition:'.2s',display:'inline-flex',alignItems:'center',justifyContent:'center'}}>
          {on?onIcon:offIcon}
        </span>
      </button>
      <span style={{fontSize:11,fontWeight:700,color:on?onColor:offColor}}>{on?onLabel:offLabel}</span>
    </div>
  )
  return(
    <div style={overlayS} onClick={()=>setOverrideEditor(null)}>
      <div style={modalS} onClick={e=>e.stopPropagation()}>
        <div style={headS}>
          <div style={{display:'flex',alignItems:'center',gap:10,minWidth:0}}>
            <span style={{width:36,height:36,borderRadius:9,background:'linear-gradient(180deg,rgba(212,160,23,.14),rgba(212,160,23,.06))',border:'1px solid rgba(212,160,23,.25)',display:'inline-flex',alignItems:'center',justifyContent:'center',color:C.gold,flexShrink:0}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>
            </span>
            <div style={{minWidth:0}}>
              <div style={{fontSize:13,fontWeight:700,color:'#fff'}}>تخصيص لمكتب</div>
              <div style={{fontSize:11,color:'var(--tx4)',fontWeight:500,marginTop:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{svc.name_ar}</div>
            </div>
          </div>
          <button type="button" onClick={()=>setOverrideEditor(null)} style={{width:30,height:30,borderRadius:8,border:'1px solid rgba(255,255,255,.06)',background:'rgba(255,255,255,.03)',color:'var(--tx3)',cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',padding:0}}>
            <X size={14} strokeWidth={2.5}/>
          </button>
        </div>
        <div style={{padding:'18px 22px',display:'flex',flexDirection:'column',gap:14}}>
          {/* Branch picker */}
          <div>
            <label style={labelS}>المكتب</label>
            {overrideEditor.branchId?(
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderRadius:10,background:'rgba(212,160,23,.08)',border:`1px solid ${C.gold}55`}}>
                <span style={{display:'inline-flex',alignItems:'center',gap:8,color:C.gold,fontSize:13,fontWeight:800}}>
                  <span style={{width:6,height:6,borderRadius:'50%',background:C.gold,boxShadow:`0 0 6px ${C.gold}`}}/>
                  <span style={{fontFamily:'monospace',direction:'ltr'}}>{branches.find(b=>b.id===overrideEditor.branchId)?.branch_code||'—'}</span>
                </span>
                <button type="button" onClick={()=>setOverrideEditor(p=>({...p,branchId:null}))} style={{fontSize:11,color:'var(--tx4)',background:'transparent',border:'none',cursor:'pointer',fontFamily:F}}>تغيير المكتب</button>
              </div>
            ):(
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:6,maxHeight:200,overflowY:'auto',padding:8,borderRadius:10,background:'rgba(0,0,0,.18)',border:'1px solid rgba(255,255,255,.05)'}}>
                {availableBranches.length===0?(
                  <div style={{gridColumn:'1/-1',padding:14,textAlign:'center',fontSize:11,color:'var(--tx5)'}}>كل المكاتب لها تخصيص بالفعل أو لا توجد مكاتب نشطة</div>
                ):availableBranches.map(b=>(
                  <button key={b.id} type="button" onClick={()=>setOverrideEditor(p=>({...p,branchId:b.id}))}
                    style={{height:36,borderRadius:8,border:'1px solid rgba(255,255,255,.06)',background:'rgba(255,255,255,.03)',color:C.gold,fontFamily:'monospace',fontSize:12,fontWeight:800,cursor:'pointer',direction:'ltr',transition:'.15s'}}
                    onMouseEnter={e=>{e.currentTarget.style.background='rgba(212,160,23,.12)';e.currentTarget.style.borderColor=`${C.gold}55`}}
                    onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.03)';e.currentTarget.style.borderColor='rgba(255,255,255,.06)'}}>
                    {b.branch_code}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active + Billable toggles */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div style={{padding:'10px 12px',borderRadius:10,background:'rgba(0,0,0,.18)',border:'1px solid rgba(255,255,255,.05)'}}>
              <div style={{fontSize:10,color:'var(--tx4)',fontWeight:600,marginBottom:8}}>الحالة <span style={{color:'var(--tx5)'}}>(الافتراضي: {baseActive?'فعّالة':'معطّلة'})</span></div>
              <Toggle on={eff.active} onChange={v=>setDraft({active:v})}
                onLabel="فعّالة" offLabel="معطّلة" onColor={C.ok} offColor={C.red}
                onIcon={<Power size={9} color={C.ok} strokeWidth={3}/>} offIcon={<PowerOff size={9} color={C.red} strokeWidth={3}/>}/>
              {typeof draft.active==='boolean'&&<button type="button" onClick={()=>setDraft({active:undefined})} style={{marginInlineStart:8,fontSize:10,color:'var(--tx5)',background:'transparent',border:'none',cursor:'pointer',fontFamily:F}}>← الافتراضي</button>}
            </div>
            <div style={{padding:'10px 12px',borderRadius:10,background:'rgba(0,0,0,.18)',border:'1px solid rgba(255,255,255,.05)'}}>
              <div style={{fontSize:10,color:'var(--tx4)',fontWeight:600,marginBottom:8}}>الفوترة <span style={{color:'var(--tx5)'}}>(الافتراضي: {baseBillable?'مفوترة':'مجانية'})</span></div>
              <Toggle on={eff.billable} onChange={v=>setDraft({billable:v})}
                onLabel="مفوترة" offLabel="مجانية" onColor={C.gold} offColor={C.ok}
                onIcon={<DollarSign size={9} color={C.gold} strokeWidth={3}/>} offIcon={<Gift size={9} color={C.ok} strokeWidth={3}/>}/>
              {typeof draft.billable==='boolean'&&<button type="button" onClick={()=>setDraft({billable:undefined})} style={{marginInlineStart:8,fontSize:10,color:'var(--tx5)',background:'transparent',border:'none',cursor:'pointer',fontFamily:F}}>← الافتراضي</button>}
            </div>
          </div>

          {/* Pricing fields */}
          {fields.length>0&&(
            <div style={{padding:'12px 14px',borderRadius:10,background:'rgba(0,0,0,.18)',border:'1px solid rgba(255,255,255,.05)'}}>
              <div style={{fontSize:11,fontWeight:700,color:'var(--tx2)',marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
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
                        {f.sfx&&<span style={{fontSize:9,fontWeight:700,color:'var(--tx5)',minWidth:48,textAlign:'center'}}>{f.sfx}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        <div style={{padding:'12px 22px',borderTop:'1px solid rgba(255,255,255,.06)',display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          <div style={{fontSize:10,color:'var(--tx5)',fontWeight:500}}>
            القيم الفارغة = استعمال الافتراضي. التخصيصات تُحفظ محلياً.
          </div>
          <div style={{display:'flex',gap:8}}>
            {overrideEditor.branchId&&getOverridesForSvc(svc.id).some(o=>o.branchId===overrideEditor.branchId)&&(
              <button type="button" onClick={()=>{removeBranchOverride(overrideEditor.branchId,svc.id);setOverrideEditor(null)}}
                style={{height:36,padding:'0 14px',borderRadius:9,border:'1px solid rgba(192,57,43,.3)',background:'rgba(192,57,43,.08)',color:C.red,fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer'}}>
                حذف التخصيص
              </button>
            )}
            <button type="button" onClick={()=>setOverrideEditor(null)} style={{height:36,padding:'0 14px',borderRadius:9,border:'1px solid rgba(255,255,255,.06)',background:'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',color:'var(--tx3)',fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer'}}>إلغاء</button>
            <button type="button" onClick={onSave} disabled={!canSave}
              style={{height:36,padding:'0 16px',borderRadius:9,border:'1px solid '+(canSave?'rgba(212,160,23,.45)':'rgba(255,255,255,.06)'),background:canSave?'linear-gradient(180deg,rgba(212,160,23,.22) 0%,rgba(212,160,23,.10) 100%)':'rgba(255,255,255,.03)',color:canSave?C.gold:'var(--tx5)',fontFamily:F,fontSize:12,fontWeight:700,cursor:canSave?'pointer':'not-allowed'}}>
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
