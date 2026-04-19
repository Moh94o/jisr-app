import React,{useState,useEffect} from 'react'
import {CalendarRange,CalendarClock,ArrowLeftRight,RefreshCw,Users,FileCheck,HeartPulse,UserCog,Wallet,Plane,PlaneTakeoff,IdCard,Printer,FileStack,Sparkles,Power,PowerOff,Gift,DollarSign,Edit3,ChevronDown,ChevronUp} from 'lucide-react'

// Shared Kafala pricing config — drives both the service-request kafala modal AND the Kafala Calculator modal
export const KAFALA_DEFAULTS={
  transferFee1:2000,transferFee2:4000,transferFee3:6000,
  iqamaPerMonth:54.2,iqamaFine1:500,iqamaFine2:1000,iqamaGraceDays:7,
  workPermit3M:25,workPermit6M:50,workPermit9M:75,workPermit12M:100,
  workPermitDailyAfter:22,workPermitCutoffDate:'2027-02-20',workPermitExpiredOffsetDays:57,
  profChange:1000,officeFee:6500,officePerMonth:541.67,
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
const C={gold:'#D4A017',bentoGold:'#D4A017',red:'#c0392b',ok:'#27a046'}

const ALL_SERVICES=[
{id:'work_visa_permanent',name_ar:'تأشيرة عمل (دائمة)',Icon:CalendarRange,defaultBillable:true,group:'main'},
{id:'work_visa_temporary',name_ar:'تأشيرة عمل (مؤقتة)',Icon:CalendarClock,defaultBillable:true,group:'main'},
{id:'kafala_transfer',name_ar:'نقل كفالة',Icon:ArrowLeftRight,defaultBillable:true,group:'main'},
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
  {title:'رسوم نقل الكفالة',fields:[
    {k:'transferFee1',l:'المرة الأولى',d:2000,sfx:'ريال'},
    {k:'transferFee2',l:'المرة الثانية',d:4000,sfx:'ريال'},
    {k:'transferFee3',l:'أكثر من مرتين',d:6000,sfx:'ريال'}
  ]},
  {title:'تجديد الإقامة',note:'إذا كانت الإقامة منتهية أو باقي عليها أقل من (أيام المهلة) → تُضاف الغرامة. خلاف ذلك يُحسب فقط عدد الأشهر المختارة × سعر الشهر',fields:[
    {k:'iqamaPerMonth',l:'سعر الشهر',d:54.2,sfx:'ريال/شهر'},
    {k:'iqamaGraceDays',l:'أيام المهلة قبل الغرامة',d:7,sfx:'يوم'},
    {k:'iqamaFine1',l:'غرامة الانتهاء (المرة الأولى)',d:500,sfx:'ريال'},
    {k:'iqamaFine2',l:'غرامة الانتهاء (المرة الثانية)',d:1000,sfx:'ريال'}
  ]},
  {title:'كرت العمل',note:'سعر ثابت لكل فترة. بعد تاريخ التفعيل اليومي يصبح التسعير يومياً. عند انتهاء الإقامة يضاف عدد أيام التأخير قبل بدء حساب الفترة',fields:[
    {k:'workPermit3M',l:'كل 3 أشهر',d:25,sfx:'ريال'},
    {k:'workPermit6M',l:'كل 6 أشهر',d:50,sfx:'ريال'},
    {k:'workPermit9M',l:'كل 9 أشهر',d:75,sfx:'ريال'},
    {k:'workPermit12M',l:'كل 12 شهر',d:100,sfx:'ريال'},
    {k:'workPermitDailyAfter',l:'يومياً بعد التاريخ',d:22,sfx:'ريال/يوم'},
    {k:'workPermitCutoffDate',l:'تاريخ تفعيل التسعير اليومي',d:'2027-02-20',t:'date'},
    {k:'workPermitExpiredOffsetDays',l:'أيام التأخير عند انتهاء الإقامة',d:57,sfx:'يوم'}
  ]},
  {title:'رسوم تغيير المهنة',fields:[
    {k:'profChange',l:'رسوم تغيير المهنة',d:1000,sfx:'ريال'}
  ]},
  {title:'رسوم المكتب',note:'السعر العام افتراضي. الحد الأدنى = (أشهر متبقية في الإقامة + أشهر التجديد المختارة) × سعر الشهر. الخصم العام (لاحقاً) يطرح من رسوم المكتب ولا تنزل عن الحد الأدنى',fields:[
    {k:'officeFee',l:'السعر العام',d:6500,sfx:'ريال'},
    {k:'officePerMonth',l:'سعر الشهر (الحد الأدنى)',d:541.67,sfx:'ريال/شهر'}
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

export default function ServiceAdminPage({toast,lang}){
const [overrides,setOverrides]=useState(getServiceOverrides())
const [expanded,setExpanded]=useState(null)// svc id being edited
const [priceState,setPriceState]=useState({})
useEffect(()=>{localStorage.setItem(STORAGE_KEY,JSON.stringify(overrides))},[overrides])

const getState=(id)=>{
const svc=ALL_SERVICES.find(s=>s.id===id)
const o=overrides[id]||{}
const billable=typeof o.billable==='boolean'?o.billable:(svc?.defaultBillable!==false)
const active=o.active!==false
return{billable,active}
}
const update=(id,key,val)=>{
setOverrides(p=>({...p,[id]:{...(p[id]||{}),[key]:val}}))
toast('تم حفظ الإعدادات')
}
const openPrice=(id)=>{
if(expanded===id){setExpanded(null);return}
setExpanded(id)
setPriceState(getPricing(id)||{})
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
toast('تم حفظ التسعير')
}

const mainSvcs=ALL_SERVICES.filter(s=>s.group==='main')
const otherSvcs=ALL_SERVICES.filter(s=>s.group==='other')

const inpS={width:'100%',height:38,padding:'0 12px',border:'1px solid rgba(255,255,255,.05)',borderRadius:9,fontFamily:F,fontSize:13,fontWeight:700,color:'var(--tx)',outline:'none',background:'rgba(0,0,0,.18)',textAlign:'center',boxSizing:'border-box',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)',direction:'ltr'}
const lbl={fontSize:11,fontWeight:700,color:'rgba(255,255,255,.58)',marginBottom:5,display:'block',textAlign:'right'}

const renderField=(f)=>(<div key={f.k}>
<label style={lbl}>{f.l}</label>
<div style={{display:'flex',alignItems:'center',gap:6}}>
{f.t==='date'
  ? <input type="date" value={priceState[f.k]||''} onChange={e=>setPriceState(p=>({...p,[f.k]:e.target.value}))} style={{...inpS,flex:1,colorScheme:'dark'}}/>
  : <input type="text" inputMode="decimal" value={priceState[f.k]??''} onChange={e=>{let v=e.target.value.replace(/[^0-9.]/g,'');const i=v.indexOf('.');if(i!==-1)v=v.slice(0,i+1)+v.slice(i+1).replace(/\./g,'');setPriceState(p=>({...p,[f.k]:v}))}} placeholder={String(f.d)} style={{...inpS,flex:1}}/>
}
{f.sfx&&<span style={{fontSize:10,fontWeight:700,color:'var(--tx5)',flexShrink:0,minWidth:50,textAlign:'center'}}>{f.sfx}</span>}
</div>
</div>)

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
return<div style={{display:'flex',flexDirection:'column',gap:14}}>
{sch.note&&!isKafala&&<div style={{fontSize:10,color:'rgba(255,255,255,.55)',background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.06)',padding:'6px 10px',borderRadius:6,fontWeight:600}}>ℹ {sch.note}</div>}
{isKafala
  ? <>
      {KAFALA_SECTIONS.map(sec=>(<div key={sec.title} style={{display:'flex',flexDirection:'column',gap:6}}>
        <div style={secHead}>{sec.title}</div>
        {sec.note&&<div style={secNote}>{sec.note}</div>}
        <div style={{display:'grid',gridTemplateColumns:sec.fields.length>=2?'1fr 1fr':'1fr',gap:10}}>
          {sec.fields.map(renderField)}
        </div>
      </div>))}
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        <div style={secHead}>التأمين الطبي</div>
        <div style={secNote}>إذا كان التأمين سارٍ ومتبقي عليه (الأشهر + الأيام) فأكثر → لا تُحتسب رسوم. غير ذلك → تُحتسب من تاريخ الميلاد حسب الفئة العمرية</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:8}}>
          {renderField({k:'medicalGraceMonths',l:'مهلة الإعفاء — أشهر',d:2,sfx:'شهر'})}
          {renderField({k:'medicalGraceDays',l:'مهلة الإعفاء — أيام إضافية',d:7,sfx:'يوم'})}
        </div>
        {renderMedicalBrackets()}
      </div>
    </>
  : <div style={{display:'grid',gridTemplateColumns:sch.fields.length>=3?'1fr 1fr':'1fr',gap:10}}>
      {sch.fields.map(renderField)}
    </div>
}
<div style={{display:'flex',gap:8,justifyContent:'flex-end',paddingTop:10,borderTop:'1px solid rgba(255,255,255,.05)',marginTop:8}}>
<button type="button" onClick={()=>setExpanded(null)} style={{height:38,padding:'0 18px',borderRadius:9,border:'1px solid rgba(255,255,255,.06)',background:'transparent',color:'rgba(255,255,255,.55)',fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer',transition:'.18s'}} onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.04)';e.currentTarget.style.color='rgba(255,255,255,.85)'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='rgba(255,255,255,.55)'}}>إلغاء</button>
<button type="button" onClick={()=>savePrice(s.id)} style={{height:38,padding:'0 22px',borderRadius:9,border:`1px solid ${C.gold}`,background:'transparent',color:C.gold,fontFamily:F,fontSize:12.5,fontWeight:800,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:7,transition:'.18s'}} onMouseEnter={e=>{e.currentTarget.style.background=C.gold;e.currentTarget.style.color='#000'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color=C.gold}}>
<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
<span>حفظ التسعير</span>
</button>
</div>
</div>
}

const renderCard=(s)=>{
const st=getState(s.id)
const I=s.Icon
const isOpen=expanded===s.id
const hasPrice=!!PRICING_SCHEMA[s.id]
return<div key={s.id} style={{borderRadius:12,border:`1px solid ${!st.active?'rgba(192,57,43,.25)':'rgba(255,255,255,.06)'}`,background:!st.active?'rgba(192,57,43,.04)':'rgba(255,255,255,.015)',display:'flex',flexDirection:'column',opacity:!st.active?.85:1,transition:'.2s',overflow:'hidden'}}>
<div style={{padding:'14px 16px',display:'flex',alignItems:'center',gap:14}}>
<div style={{width:48,height:48,borderRadius:10,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.05)',display:'flex',alignItems:'center',justifyContent:'center',color:C.bentoGold,flexShrink:0}}>
<I size={22} strokeWidth={1.6}/>
</div>
<div style={{flex:1,minWidth:0}}>
<div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
<span style={{fontSize:14,fontWeight:700,color:'var(--tx)',fontFamily:F}}>{s.name_ar}</span>
{!st.billable&&<span style={{fontSize:10,fontWeight:700,color:C.ok,background:'rgba(39,160,70,.12)',border:'1px solid rgba(39,160,70,.3)',padding:'2px 7px',borderRadius:5,fontFamily:F}}>مجانية</span>}
{!st.active&&<span style={{fontSize:10,fontWeight:700,color:C.red,background:'rgba(192,57,43,.12)',border:'1px solid rgba(192,57,43,.3)',padding:'2px 7px',borderRadius:5,fontFamily:F}}>معطّلة</span>}
</div>
<div style={{fontSize:10.5,color:'var(--tx5)',fontFamily:F,direction:'ltr'}}>{s.id}</div>
</div>
{/* Edit price button */}
{hasPrice&&st.billable&&<button type="button" onClick={()=>openPrice(s.id)} title="تعديل التسعير"
style={{width:36,height:36,borderRadius:8,border:`1px solid ${isOpen?'rgba(212,160,23,.45)':'rgba(255,255,255,.08)'}`,background:isOpen?'rgba(212,160,23,.1)':'rgba(255,255,255,.03)',color:C.gold,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'.2s'}}>
{isOpen?<ChevronUp size={16} strokeWidth={2.2}/>:<Edit3 size={15} strokeWidth={2.2}/>}
</button>}
{/* Billable toggle */}
<div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
<button type="button" onClick={()=>update(s.id,'billable',!st.billable)} title={st.billable?'اضغط لجعلها مجانية':'اضغط لجعلها مدفوعة'}
style={{width:46,height:24,borderRadius:999,border:'none',background:st.billable?C.bentoGold:'rgba(39,160,70,.7)',cursor:'pointer',position:'relative',transition:'.2s',padding:0}}>
<span style={{position:'absolute',width:18,height:18,borderRadius:'50%',background:'#fff',top:3,right:st.billable?3:25,transition:'.2s',display:'flex',alignItems:'center',justifyContent:'center'}}>
{st.billable?<DollarSign size={10} color={C.bentoGold} strokeWidth={3}/>:<Gift size={10} color={C.ok} strokeWidth={3}/>}
</span>
</button>
<span style={{fontSize:9.5,fontWeight:700,color:st.billable?C.bentoGold:C.ok,fontFamily:F}}>{st.billable?'مدفوعة':'مجانية'}</span>
</div>
{/* Active toggle */}
<div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
<button type="button" onClick={()=>update(s.id,'active',!st.active)} title={st.active?'اضغط للتعطيل':'اضغط للتفعيل'}
style={{width:46,height:24,borderRadius:999,border:'none',background:st.active?C.ok:'rgba(192,57,43,.7)',cursor:'pointer',position:'relative',transition:'.2s',padding:0}}>
<span style={{position:'absolute',width:18,height:18,borderRadius:'50%',background:'#fff',top:3,right:st.active?3:25,transition:'.2s',display:'flex',alignItems:'center',justifyContent:'center'}}>
{st.active?<Power size={10} color={C.ok} strokeWidth={3}/>:<PowerOff size={10} color={C.red} strokeWidth={3}/>}
</span>
</button>
<span style={{fontSize:9.5,fontWeight:700,color:st.active?C.ok:C.red,fontFamily:F}}>{st.active?'فعّالة':'معطّلة'}</span>
</div>
</div>
{/* Expandable price editor */}
{isOpen&&<div style={{padding:'14px 16px',borderTop:'1px dashed rgba(212,160,23,.2)',background:'rgba(0,0,0,.12)'}}>
{renderPriceEditor(s)}
</div>}
</div>
}

const legend={position:'absolute',top:-9,right:14,background:'var(--bg,#111)',padding:'0 8px',fontSize:12,fontWeight:800,color:C.bentoGold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:5}
const fieldset={borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',padding:'18px 14px 14px',position:'relative',display:'flex',flexDirection:'column',gap:10}

return<div style={{padding:'20px 24px',display:'flex',flexDirection:'column',gap:16,direction:'rtl',fontFamily:F}}>
<div style={{display:'flex',alignItems:'center',gap:10}}>
<div style={{fontSize:18,fontWeight:800,color:'var(--tx)'}}>إدارة الخدمات</div>
<div style={{fontSize:11,color:'var(--tx5)'}}>— تحكّم في حالة الخدمات ومجانيتها وتسعيرها</div>
</div>

<div style={fieldset}>
<div style={legend}><Sparkles size={12} strokeWidth={2.2}/><span>الخدمات الرئيسية</span></div>
<div style={{display:'flex',flexDirection:'column',gap:8}}>{mainSvcs.map(renderCard)}</div>
</div>

<div style={fieldset}>
<div style={legend}><FileStack size={12} strokeWidth={2.2}/><span>الخدمات الأخرى</span></div>
<div style={{display:'flex',flexDirection:'column',gap:8}}>{otherSvcs.map(renderCard)}</div>
</div>

<div style={{fontSize:11,color:'var(--tx5)',textAlign:'center',padding:'10px 0'}}>
الإعدادات تُحفظ محلياً على هذا المتصفح
</div>
</div>
}
