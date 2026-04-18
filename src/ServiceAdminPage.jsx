import React,{useState,useEffect} from 'react'
import {CalendarRange,CalendarClock,ArrowLeftRight,RefreshCw,Users,FileCheck,HeartPulse,UserCog,Wallet,Plane,PlaneTakeoff,IdCard,Printer,FileStack,Sparkles,Power,PowerOff,Gift,DollarSign,Edit3,ChevronDown,ChevronUp} from 'lucide-react'

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

// ── Pricing schema: which keys each service edits ──
const KAFALA_FIELDS=[
{k:'transferFee',l:'رسوم نقل الكفالة',d:2000,sfx:'ريال'},
{k:'iqamaPerMonth',l:'تجديد الإقامة (شهرياً)',d:650,sfx:'ريال/شهر'},
{k:'iqamaFine',l:'غرامة انتهاء الإقامة',d:1000,sfx:'ريال'},
{k:'workPermitYearly',l:'كرت العمل (سنوياً)',d:100,sfx:'ريال'},
{k:'workPermitDaily',l:'كرت العمل (يومياً)',d:23,sfx:'ريال/يوم'},
{k:'profChange',l:'رسم تغيير المهنة',d:200,sfx:'ريال'},
{k:'officePerMonth',l:'رسوم المكتب (شهرياً)',d:100,sfx:'ريال/شهر'}
]
const VISA_FIELDS=[
{k:'issuance',l:'الحد الأدنى لرسم الإصدار',d:2000,sfx:'ريال/تأشيرة'},
{k:'authorization',l:'الحد الأدنى لرسم التوكيل',d:2000,sfx:'ريال/تأشيرة'},
{k:'residence',l:'الحد الأدنى لرسم الإقامة',d:0,sfx:'ريال/تأشيرة'}
]
const IQAMA_FIELDS=KAFALA_FIELDS.filter(f=>f.k!=='transferFee')
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
setPricing(id,priceState)
setExpanded(null)
toast('تم حفظ التسعير')
}

const mainSvcs=ALL_SERVICES.filter(s=>s.group==='main')
const otherSvcs=ALL_SERVICES.filter(s=>s.group==='other')

const inpS={width:'100%',height:38,padding:'0 12px',border:'1px solid rgba(255,255,255,.05)',borderRadius:9,fontFamily:F,fontSize:13,fontWeight:700,color:'var(--tx)',outline:'none',background:'rgba(0,0,0,.18)',textAlign:'center',boxSizing:'border-box',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)',direction:'ltr'}
const lbl={fontSize:11,fontWeight:700,color:'rgba(255,255,255,.58)',marginBottom:5,display:'block',textAlign:'right'}

const renderPriceEditor=(s)=>{
const sch=PRICING_SCHEMA[s.id]
if(!sch)return<div style={{padding:'12px 14px',background:'rgba(255,255,255,.02)',borderRadius:8,fontSize:11,color:'var(--tx5)',textAlign:'center'}}>لا يوجد تسعير ثابت لهذه الخدمة — يُحسب ديناميكياً</div>
return<div style={{display:'flex',flexDirection:'column',gap:10}}>
{sch.note&&<div style={{fontSize:10,color:C.gold,background:'rgba(212,160,23,.08)',border:'1px solid rgba(212,160,23,.2)',padding:'6px 10px',borderRadius:6,fontWeight:600}}>ℹ {sch.note}</div>}
<div style={{display:'grid',gridTemplateColumns:sch.fields.length>=3?'1fr 1fr':'1fr',gap:10}}>
{sch.fields.map(f=>(<div key={f.k}>
<label style={lbl}>{f.l}</label>
<div style={{display:'flex',alignItems:'center',gap:6}}>
<input type="number" value={priceState[f.k]??''} onChange={e=>setPriceState(p=>({...p,[f.k]:e.target.value===''?'':Number(e.target.value)}))} placeholder={String(f.d)} style={{...inpS,flex:1}}/>
{f.sfx&&<span style={{fontSize:10,fontWeight:700,color:'var(--tx5)',flexShrink:0,minWidth:50,textAlign:'center'}}>{f.sfx}</span>}
</div>
</div>))}
</div>
<div style={{display:'flex',gap:8,justifyContent:'flex-end',paddingTop:4}}>
<button type="button" onClick={()=>setExpanded(null)} style={{height:36,padding:'0 16px',borderRadius:8,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.03)',color:'var(--tx4)',fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer'}}>إلغاء</button>
<button type="button" onClick={()=>savePrice(s.id)} style={{height:36,padding:'0 18px',borderRadius:8,border:'none',background:`linear-gradient(135deg,${C.gold},#a8872e)`,color:'#fff',fontFamily:F,fontSize:12,fontWeight:800,cursor:'pointer'}}>حفظ التسعير</button>
</div>
</div>
}

const renderCard=(s)=>{
const st=getState(s.id)
const I=s.Icon
const isOpen=expanded===s.id
const hasPrice=!!PRICING_SCHEMA[s.id]
return<div key={s.id} style={{borderRadius:12,border:`1px solid ${!st.active?'rgba(192,57,43,.25)':'rgba(212,160,23,.15)'}`,background:!st.active?'rgba(192,57,43,.04)':'rgba(212,160,23,.03)',display:'flex',flexDirection:'column',opacity:!st.active?.85:1,transition:'.2s',overflow:'hidden'}}>
<div style={{padding:'14px 16px',display:'flex',alignItems:'center',gap:14}}>
<div style={{width:48,height:48,borderRadius:10,background:'rgba(212,160,23,.08)',display:'flex',alignItems:'center',justifyContent:'center',color:C.bentoGold,flexShrink:0}}>
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
style={{width:36,height:36,borderRadius:8,border:`1px solid ${isOpen?'rgba(212,160,23,.5)':'rgba(212,160,23,.2)'}`,background:isOpen?'rgba(212,160,23,.12)':'rgba(212,160,23,.04)',color:C.gold,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'.2s'}}>
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
