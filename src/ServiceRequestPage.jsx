import React,{useState,useEffect,useCallback,useMemo,useRef} from 'react'
import {CalendarRange,CalendarClock,ArrowLeftRight,RefreshCw,Users,FileCheck,Ellipsis,ArrowRight,Plus,HeartPulse,UserCog,IdCard,Languages,Wallet,Printer,Plane,PlaneTakeoff,TriangleAlert,FileStack,Receipt,User,Phone,CreditCard,Briefcase,Building2,Calendar,ShieldCheck,Hash,AlertCircle,Globe,BadgeCheck,Circle,Upload,FileText,Paperclip,Copy,Check,MapPin,Sparkles,TrendingUp} from 'lucide-react'
import {isServiceActive,isServiceBillable} from './ServiceAdminPage.jsx'
const F="'Cairo','Tajawal',sans-serif"
const C={gold:'#D4A017',red:'#c0392b',ok:'#27a046',blue:'#3483b4',bentoGold:'#D4A017'}
// Format Saudi phone: +966558908008 → 055 890 8008
const fmtPhone=(p)=>{if(!p)return'';let n=String(p).replace(/[^0-9+]/g,'');if(n.startsWith('+966'))n='0'+n.slice(4);else if(n.startsWith('966'))n='0'+n.slice(3);if(n.length===10)return`${n.slice(0,3)} ${n.slice(3,6)} ${n.slice(6)}`;return n}
// Format date ISO → DD/MM/YYYY
const fmtDate=(d)=>{if(!d)return'—';const dt=new Date(d);if(isNaN(dt))return'—';return`${dt.getFullYear()}/${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getDate()).padStart(2,'0')}`}
// Flag emoji from country code (2 letters) or Arabic nationality name fallback
const NAT_MAP={'سعودي':'SA','سعودية':'SA','مصري':'EG','مصرية':'EG','هندي':'IN','هندية':'IN','باكستاني':'PK','باكستانية':'PK','بنجلاديشي':'BD','بنغلاديشي':'BD','فلبيني':'PH','فلبينية':'PH','يمني':'YE','يمنية':'YE','سوداني':'SD','سودانية':'SD','اندونيسي':'ID','إندونيسي':'ID','اثيوبي':'ET','إثيوبي':'ET','نيبالي':'NP','سريلانكي':'LK','كيني':'KE','أوغندي':'UG','اوغندي':'UG','سوري':'SY','أردني':'JO','اردني':'JO','لبناني':'LB','فلسطيني':'PS','مغربي':'MA','تونسي':'TN','جزائري':'DZ'}
const flagEmoji=(nat)=>{if(!nat)return'';let cc=nat.length===2?nat.toUpperCase():(NAT_MAP[nat.trim()]||'');if(cc.length!==2)return'';return String.fromCodePoint(...[...cc].map(c=>c.charCodeAt(0)+127397))}
// Extract latest nitaqat from facility.weekly_stats array
const latestStat=(stats)=>{if(!stats||!stats.length)return null;return[...stats].sort((a,b)=>new Date(b.week_date)-new Date(a.week_date))[0]}
// Check if date is expired/expiring
const dateStatus=(d)=>{if(!d)return'none';const dt=new Date(d),now=new Date(),days=Math.round((dt-now)/86400000);if(days<0)return'expired';if(days<30)return'soon';return'ok'}

// ═══════ Service Types (Bento Grid) ═══════
const MAIN_SERVICES=[
{id:'work_visa_permanent',name_ar:'تأشيرة عمل (دائمة)',Icon:CalendarRange,featured:true,billable:true},
{id:'work_visa_temporary',name_ar:'تأشيرة عمل (مؤقتة)',Icon:CalendarClock,billable:true},
{id:'kafala_transfer',name_ar:'نقل كفالة',Icon:ArrowLeftRight,billable:true},
{id:'iqama_renewal',name_ar:'تجديد الإقامة',Icon:RefreshCw,billable:true},
{id:'ajeer_contract',name_ar:'عقد أجير',Icon:Users,billable:true},
{id:'chamber_certification',name_ar:'الغرفة التجارية',Icon:FileCheck,billable:true}
]
const OTHER_SERVICES=[
{id:'medical_insurance',name_ar:'تأمين طبي',Icon:HeartPulse,billable:true},
{id:'profession_change',name_ar:'تغيير المهنة',Icon:UserCog,billable:true},
{id:'name_translation',name_ar:'تعديل الراتب',Icon:Wallet,billable:false},
{id:'exit_reentry_visa',name_ar:'إصدار / تمديد تأشيرة خروج وعودة',Icon:Plane,billable:true},
{id:'final_exit_visa',name_ar:'خروج نهائي / بلاغ تغيب',Icon:PlaneTakeoff,billable:true},
{id:'passport_update',name_ar:'تحديث بيانات الجواز',Icon:IdCard,billable:true},
{id:'iqama_print',name_ar:'طباعة الإقامة',Icon:Printer,billable:true},
{id:'documents',name_ar:'مستندات',Icon:FileStack,billable:true},
{id:'custom',name_ar:'عام',Icon:Sparkles,billable:true}
]
const ALL_SERVICES=[...MAIN_SERVICES,...OTHER_SERVICES]

// ═══════ Visa services (custom inputs) ═══════
const VISA_SERVICES=new Set(['work_visa_permanent','work_visa_temporary'])

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
    {key:'region',label_ar:'المنطقة',type:'select',required:true,source:'regions'},
    {key:'city',label_ar:'المدينة',type:'select',required:true,source:'cities'},
    {key:'contract_months',label_ar:'مدة العقد (أشهر)',type:'number',required:true,placeholder:'عدد الأشهر',grid_col:'1'}
  ],
  exit_reentry_visa:[
    {key:'exit_type',label_ar:'نوع التأشيرة',type:'select',required:true,
      options:[{value:'single',label:'مفردة'},{value:'multiple',label:'متعددة'}]},
    {key:'duration_months',label_ar:'المدة (أشهر)',type:'number',required:true,placeholder:'عدد الأشهر'}
  ],
  final_exit_visa:[
    {key:'reason',label_ar:'السبب',type:'textarea',placeholder:'اكتب سبب طلب تأشيرة الخروج النهائي...'}
  ],
  profession_change:[
    {key:'new_occupation',label_ar:'المهنة الجديدة',type:'select',required:true,source:'occupations'}
  ],
  passport_update:[],
  name_translation:[
    {key:'new_salary',label_ar:'الراتب الجديد',type:'number',required:true,placeholder:'0'},
    {key:'salary_weeks',label_ar:'مدة الراتب (أسابيع)',type:'number',required:true,placeholder:'عدد الأسابيع'}
  ],
  custom:[
    {key:'custom_note',label_ar:'وصف الخدمة',type:'textarea',required:true,placeholder:'اكتب تفاصيل الخدمة المطلوبة...'}
  ],
  iqama_print:[
    {key:'print_reason',label_ar:'السبب',type:'textarea',required:true,placeholder:'اكتب سبب طلب طباعة الإقامة...'}
  ],
  medical_insurance:[],
  documents:[
    {key:'doc_type',label_ar:'نوع المستند',type:'select',required:true,
      options:[{value:'work_cert',label:'شهادة عمل'},{value:'intro_letter',label:'خطاب تعريف'},{value:'salary_def',label:'تعريف راتب'},{value:'bank_letter',label:'خطاب بنكي'},{value:'other',label:'أخرى'}]},
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

const fS={width:'100%',height:42,padding:'0 14px',border:'1px solid rgba(255,255,255,.07)',borderRadius:10,fontFamily:F,fontSize:14,fontWeight:500,color:'var(--tx)',outline:'none',background:'linear-gradient(180deg,#323232 0%,#262626 100%)',textAlign:'center',boxSizing:'border-box',boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.18s'}
const lblS={fontSize:14,fontWeight:500,color:'rgba(255,255,255,.6)',marginBottom:8,display:'block',textAlign:'start'}
const goldBtn={height:48,padding:'0 24px',borderRadius:11,border:'1px solid rgba(212,160,23,.45)',background:'linear-gradient(180deg,rgba(212,160,23,.22) 0%,rgba(212,160,23,.10) 100%)',color:C.gold,fontFamily:F,fontSize:14,fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8,boxShadow:'0 4px 14px rgba(212,160,23,.25), inset 0 1px 0 rgba(212,160,23,.2)',transition:'.2s'}
const ghostBtn={height:48,padding:'0 24px',borderRadius:11,background:'linear-gradient(180deg,#323232 0%,#262626 100%)',border:'1px solid rgba(255,255,255,.07)',color:'var(--tx3)',fontFamily:F,fontSize:14,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8,boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'}

const STEPS=[{ar:'الخدمة',icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'},{ar:'العميل',icon:'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'},{ar:'التفاصيل',icon:'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'},{ar:'الفاتورة',icon:'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'},{ar:'الدفع',icon:'M3 10h18M7 15h2m4 0h2m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'},{ar:'الملخص',icon:'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'}]

// ═══════ Compact custom date picker — dark/gold theme, matches modal ═══════
const AR_MONTHS=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const AR_DAYS=['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']
function CompactDatePicker({value,onChange,width=150,height=34}){
  const[open,setOpen]=useState(false)
  const[pos,setPos]=useState({top:0,left:0})
  const init=value?new Date(value):new Date()
  const[viewDate,setViewDate]=useState(isNaN(init)?new Date():init)
  const btnRef=useRef(null)
  const popRef=useRef(null)
  useEffect(()=>{
    if(!open)return
    const POP_W=240,POP_H=260
    const place=()=>{
      const r=btnRef.current?.getBoundingClientRect();if(!r)return
      const vh=window.innerHeight,vw=window.innerWidth
      const below=vh-r.bottom>=POP_H+8
      const top=below?r.bottom+6:Math.max(8,r.top-POP_H-6)
      let left=r.right-POP_W;if(left<8)left=8;if(left+POP_W>vw-8)left=vw-POP_W-8
      setPos({top,left})
    }
    place()
    const h=(e)=>{if(btnRef.current?.contains(e.target))return;if(popRef.current?.contains(e.target))return;setOpen(false)}
    document.addEventListener('mousedown',h)
    window.addEventListener('resize',place);window.addEventListener('scroll',place,true)
    return()=>{document.removeEventListener('mousedown',h);window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true)}
  },[open])
  const y=viewDate.getFullYear(),m=viewDate.getMonth()
  const first=new Date(y,m,1).getDay()
  const dim=new Date(y,m+1,0).getDate()
  const cells=[];for(let i=0;i<first;i++)cells.push(null);for(let d=1;d<=dim;d++)cells.push(d)
  const pad=(n)=>String(n).padStart(2,'0')
  const pick=(d)=>{onChange(`${y}-${pad(m+1)}-${pad(d)}`);setOpen(false)}
  const sel=value?new Date(value):null
  const isSel=(d)=>sel&&sel.getFullYear()===y&&sel.getMonth()===m&&sel.getDate()===d
  const today=new Date()
  const isToday=(d)=>today.getFullYear()===y&&today.getMonth()===m&&today.getDate()===d
  return <div style={{position:'relative',width}}>
    {(()=>{const fs=height>=42?13:11;const ic=fs+2;return(
    <button ref={btnRef} type="button" onClick={()=>setOpen(o=>!o)} style={{width:'100%',height,padding:'0 12px',borderRadius:9,border:`1px solid ${open?C.gold+'66':'rgba(255,255,255,.05)'}`,background:'var(--modal-input-bg)',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)',color:value?'var(--tx)':'var(--tx5)',fontFamily:F,fontSize:fs,fontWeight:600,cursor:'pointer',outline:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:6,direction:'ltr',boxSizing:'border-box'}}>
      <span>{value||'yyyy-mm-dd'}</span>
      <svg width={ic} height={ic} viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    </button>
    )})()}
    {open&&<div ref={popRef} style={{position:'fixed',top:pos.top,left:pos.left,zIndex:9999,width:240,padding:10,borderRadius:10,background:'#1a1611',border:`1.5px solid ${C.gold}55`,boxShadow:'0 12px 40px rgba(0,0,0,.6)',direction:'rtl'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,gap:4}}>
        <button type="button" onClick={()=>setViewDate(new Date(y,m-1,1))} style={{width:24,height:24,borderRadius:6,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.03)',color:C.gold,cursor:'pointer',fontSize:14,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>
        <span style={{flex:1,textAlign:'center',fontSize:12,fontWeight:800,color:C.gold,fontFamily:F}}>{AR_MONTHS[m]} {y}</span>
        <button type="button" onClick={()=>setViewDate(new Date(y,m+1,1))} style={{width:24,height:24,borderRadius:6,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.03)',color:C.gold,cursor:'pointer',fontSize:14,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:4}}>
        {AR_DAYS.map(d=><span key={d} style={{fontSize:8,fontWeight:700,color:'var(--tx5)',textAlign:'center',padding:'3px 0',letterSpacing:'-0.2px'}}>{d}</span>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
        {cells.map((c,i)=>c==null?<span key={i}/>:<button key={i} type="button" onClick={()=>pick(c)} style={{height:26,borderRadius:5,border:isSel(c)?`1.5px solid ${C.gold}`:'1px solid transparent',background:isSel(c)?C.gold+'22':(isToday(c)?'rgba(255,255,255,.04)':'transparent'),color:isSel(c)?C.gold:'var(--tx)',fontFamily:F,fontSize:11,fontWeight:isSel(c)||isToday(c)?800:600,cursor:'pointer',transition:'.15s'}}>{c}</button>)}
      </div>
    </div>}
  </div>
}


// ═══════ Custom polished dropdown with search (auto-flip + fits container) ═══════
function NiceSelect({value,onChange,options,placeholder='اختر...',disabled=false,emptyText='لا توجد نتائج',searchable=true,compact=false,height,fontSize}){
const H=height||(compact?36:44)
const FZ=fontSize||(compact?12:13)
const[open,setOpen]=useState(false)
const[q,setQ]=useState('')
const[panelStyle,setPanelStyle]=useState({top:0,left:0,width:0,maxHeight:240,placeUp:false})
const ref=useRef(null)
const panelRef=useRef(null)
const selected=options.find(o=>o.value===value)
const filtered=useMemo(()=>{
if(!q.trim())return options
const s=q.trim().toLowerCase()
return options.filter(o=>(o.label||'').toLowerCase().includes(s))
},[options,q])
useEffect(()=>{
if(!open)return
const handler=(e)=>{if(ref.current&&!ref.current.contains(e.target)&&panelRef.current&&!panelRef.current.contains(e.target))setOpen(false)}
const escHandler=(e)=>{if(e.key==='Escape')setOpen(false)}
document.addEventListener('mousedown',handler)
document.addEventListener('keydown',escHandler)
return()=>{document.removeEventListener('mousedown',handler);document.removeEventListener('keydown',escHandler)}
},[open])
useEffect(()=>{if(!open)setQ('')},[open])
// Compute fixed placement based on viewport
useEffect(()=>{
if(!open||!ref.current)return
const compute=()=>{
const trigger=ref.current.getBoundingClientRect()
const spaceBelow=window.innerHeight-trigger.bottom-12
const spaceAbove=trigger.top-12
const placeUp=spaceBelow<200&&spaceAbove>spaceBelow
const maxHeight=Math.max(160,Math.min(300,placeUp?spaceAbove:spaceBelow))
setPanelStyle({top:placeUp?undefined:trigger.bottom+6,bottom:placeUp?window.innerHeight-trigger.top+6:undefined,left:trigger.left,width:trigger.width,maxHeight,placeUp})
}
compute()
window.addEventListener('resize',compute)
window.addEventListener('scroll',compute,true)
return()=>{window.removeEventListener('resize',compute);window.removeEventListener('scroll',compute,true)}
},[open])
return<div ref={ref} style={{position:'relative',width:'100%'}}>
<button type="button" disabled={disabled} onClick={()=>!disabled&&setOpen(!open)}
style={{width:'100%',height:H,padding:'0 32px',borderRadius:9,border:`1px solid ${open?'rgba(212,160,23,.5)':'rgba(255,255,255,.05)'}`,background:'var(--modal-input-bg)',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)',color:selected?'rgba(255,255,255,.95)':'rgba(255,255,255,.38)',fontFamily:F,fontSize:FZ,fontWeight:600,textAlign:'center',cursor:disabled?'not-allowed':'pointer',opacity:disabled?.5:1,transition:'.2s',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',outline:'none',boxSizing:'border-box'}}>
<span style={{flex:'1 1 0',minWidth:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',textAlign:'center'}}>{selected?selected.label:placeholder}</span>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5" style={{position:'absolute',left:14,top:'50%',transform:`translateY(-50%) rotate(${open?180:0}deg)`,transition:'.2s'}}><polyline points="6 9 12 15 18 9"/></svg>
</button>
{open&&<div ref={panelRef} style={{position:'fixed',top:panelStyle.top,bottom:panelStyle.bottom,left:panelStyle.left,width:panelStyle.width,zIndex:9999,borderRadius:12,border:'1px solid rgba(212,160,23,.25)',background:'var(--modal-bg)',boxShadow:'0 10px 30px rgba(0,0,0,.5),0 0 0 1px rgba(212,160,23,.05)',overflow:'hidden',display:'flex',flexDirection:'column',maxHeight:panelStyle.maxHeight,animation:'niceFadeIn .15s ease-out'}}>
{searchable&&options.length>1&&<div style={{padding:8,borderBottom:'1px solid rgba(255,255,255,.05)',flexShrink:0}}>
<div style={{position:'relative'}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2" style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
<input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="ابحث..."
style={{width:'100%',height:32,padding:'0 32px 0 12px',borderRadius:8,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.03)',color:'var(--tx)',fontFamily:F,fontSize:12,fontWeight:600,outline:'none',textAlign:'right',direction:'rtl',boxSizing:'border-box'}}/>
</div>
</div>}
<div className="sr-modal-scroll" style={{flex:1,minHeight:0,overflowY:'auto',padding:'8px 6px',display:'flex',flexDirection:'column',gap:4}}>
{filtered.length===0?<div style={{padding:'14px 12px',textAlign:'center',color:'var(--tx5)',fontSize:12,fontFamily:F}}>{emptyText}</div>:
filtered.map(opt=>{
const sel=opt.value===value
return<div key={opt.value} onClick={()=>{onChange(opt.value);setOpen(false)}}
style={{padding:sel?'9px 28px 9px 12px':'9px 12px',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',textAlign:'center',gap:8,fontFamily:F,fontSize:12.5,fontWeight:sel?700:600,color:sel?C.gold:'var(--tx2)',background:sel?'rgba(212,160,23,.1)':'transparent',transition:'.15s',position:'relative',flexShrink:0}}
onMouseEnter={e=>{if(!sel)e.currentTarget.style.background='rgba(255,255,255,.04)'}}
onMouseLeave={e=>{if(!sel)e.currentTarget.style.background='transparent'}}>
<span>{opt.label}</span>
{sel&&<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)'}}><polyline points="20 6 9 17 4 12"/></svg>}
</div>
})}
</div>
</div>}
</div>
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
const[step2Mode,setStep2Mode]=useState('client')// 'client' | 'worker'
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
const[bankAccSearch,setBankAccSearch]=useState('')
const bankAccTriggerRef=useRef(null)
const[bankAccPos,setBankAccPos]=useState({top:0,left:0,width:0})
const openBankAccDropdown=()=>{if(bankAccTriggerRef.current){const r=bankAccTriggerRef.current.getBoundingClientRect();setBankAccPos({top:r.bottom+4,left:r.left,width:r.width})}setBankAccOpen(v=>!v)}
// Visa services: installment plan overrides (empty = use default 1/3 split)
const[visaInstallments,setVisaInstallments]=useState({issuance:'',authorization:'',residencePerVisa:''})
// Visa services: total price override (null = use computed pricing.total)
const[totalOverride,setTotalOverride]=useState(null)
// Read per-installment minimum pricing config (from localStorage, with defaults)
const getVisaMinConfig=(svc)=>{
const key=svc==='work_visa_temporary'?'visaPricingMin_temporary':'visaPricingMin_permanent'
try{
const raw=localStorage.getItem(key)||localStorage.getItem('visaPricingMin')// back-compat with old shared key
if(raw){const p=JSON.parse(raw);return{issuance:Number(p.issuance)||2000,authorization:Number(p.authorization)||2000,residence:Number(p.residence)||0}}
}catch(e){}
return{issuance:2000,authorization:2000,residence:0}
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
const[err,setErr]=useState('')
const[loading,setLoading]=useState(true)

// Load data
useEffect(()=>{if(!sb)return;(async()=>{
const[s,r,c,w,b,ci,ba]=await Promise.all([
sb.from('sub_services').select('*').eq('is_active',true).eq('show_in_request_popup',true).order('sort_order'),
sb.from('regions').select('id,name_ar').eq('is_active',true).order('sort_order'),
sb.from('clients').select('id,client_number,name_ar,name_en,phone,id_number,nationality_id').is('deleted_at',null).eq('status','active').order('name_ar'),
sb.from('workers').select('id,name,name_ar,name_en,phone,iqama_number,iqama_expiry_date,birth_date,nationality,passport_number,passport_expiry,country:countries!fk_workers_nationality(nationality_ar,flag_emoji,code),occupation:lookup_items!fk_workers_occupation(value_ar),facility:facilities!fk_workers_facility(id,name_ar,unified_national_number,qiwa_unified_number,qiwa_file_number,gosi_file_number),work_permits(wp_expiry_date),worker_insurance(end_date)').is('deleted_at',null).order('name').limit(50),
sb.from('brokers').select('id,name_ar,name_en,phone,id_number').is('deleted_at',null).eq('status','active').order('name_ar').limit(50),
sb.from('cities').select('id,name_ar,region_id').order('name_ar'),
sb.from('bank_accounts').select('id,bank_name,account_name,account_number,iban,is_primary').eq('is_active',true).order('is_primary',{ascending:false}).order('bank_name')
])
const svcs=s.data||[]
setServices(svcs)
setRegions(r.data||[])
setClients(c.data||[])
setWorkers(w.data||[])
setBrokers(b?.data||[])
setCities(ci?.data||[])
setBankAccounts(ba?.data||[])
if(svcs.length>0){const cats=[...new Set(svcs.map(x=>x.category))];setSelCat(cats[0]||'')}
// Load visa-related lookups (countries + embassies + occupation + gender)
const[lkRes,coRes,emRes]=await Promise.all([
sb.from('lookup_items').select('id,value_ar,code,sort_order,lookup_categories!inner(category_key)').eq('is_active',true).in('lookup_categories.category_key',['occupation','gender']).order('sort_order'),
sb.from('countries').select('id,name_ar,nationality_ar,code,flag_emoji').eq('is_active',true).order('sort_order',{nullsFirst:false}).order('nationality_ar'),
sb.from('embassies_consulates').select('id,country_id,city_ar,type,sort_order').eq('is_active',true).order('sort_order')
])
if(lkRes.data){
const byCat=k=>lkRes.data.filter(i=>i.lookup_categories?.category_key===k)
setLkOccupations(byCat('occupation'))
setLkGenders(byCat('gender'))
}
// Dedupe countries by nationality_ar (table has dupes) + exclude GCC (work visas not applicable)
if(coRes.data){
const GCC=new Set(['SA','AE','KW','QA','BH','OM'])
const seen=new Set(),uniq=[]
for(const c of coRes.data){if(c.nationality_ar&&!seen.has(c.nationality_ar)&&!GCC.has((c.code||'').toUpperCase())){seen.add(c.nationality_ar);uniq.push(c)}}
setLkCountries(uniq)
}
setLkEmbassies(emRes.data||[])
setLoading(false)
})()},[sb])

const categories=useMemo(()=>[...new Set(services.map(s=>s.category))],[services])
const filteredSvcs=useMemo(()=>services.filter(s=>s.category===selCat),[services,selCat])
const selectedService=useMemo(()=>{
if(!selSvc)return null
const sv=ALL_SERVICES.find(s=>s.id===selSvc)
if(!sv)return services.find(s=>s.id===selSvc)||null
const db=services.find(s=>s.name_ar===sv.name_ar)
const displayName=sv.id==='custom'?(customName.trim()||'خدمة مخصصة'):sv.name_ar
return{id:db?.id||sv.id,service_type:sv.id,name_ar:displayName,
category:db?.category||'general',default_price:db?.default_price||0,
gov_fee:db?.gov_fee||0,pricing_rules:db?.pricing_rules||{},inputs:db?.inputs||[]}
},[selSvc,services,customName])

// Resolved inputs for current service (DB first, then SERVICE_INPUTS fallback)
const svcInputs=useMemo(()=>(selectedService?.inputs?.length?selectedService.inputs:SERVICE_INPUTS[selSvc])||[],[selectedService,selSvc])
// If service has exactly one simple field and isn't a visa service, merge it into Step 2 (worker view)
const svcSingleField=useMemo(()=>(!VISA_SERVICES.has(selSvc)&&selSvc!=='iqama_renewal'&&selSvc!=='profession_change'&&selSvc!=='final_exit_visa'&&selSvc!=='exit_reentry_visa'&&selSvc!=='custom'&&selSvc!=='iqama_print'&&svcInputs.length===1)?svcInputs[0]:null,[selSvc,svcInputs])
const hasMergedField=!!svcSingleField
// Broker is a distinct step only for services that need it (kafala/visa). Summary is the final step.
const hasBrokerStep=selSvc==='kafala_transfer'||VISA_SERVICES.has(selSvc)
// Free services skip invoice + payment (steps 4 & 5)
const isFreeSvc=!!selSvc&&!isServiceBillable(selSvc)
// All STEPS + الوسيط (if applicable) - merged field - (free svc skips 2 steps)
const totalSteps=STEPS.length+(hasBrokerStep?1:0)-(hasMergedField?1:0)-(isFreeSvc?2:0)
const displayStep=(()=>{
let d=hasMergedField&&step>=4?step-1:(hasMergedField&&step===3?2:step)
// Broker sub-screen: step 6 (after payment = 5)
if(step===5&&showBrokerNoteScreen)d=hasBrokerStep?(hasMergedField?5:6):d
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

// Fetch latest facility weekly stat when a worker is selected
useEffect(()=>{
if(!sb||!selWorker?.facility?.id){setWorkerFacilityStat(null);return}
let cancelled=false
;(async()=>{
const{data}=await sb.from('facility_weekly_stats').select('nitaqat_color,wps_has_notes,week_date,nitaqat:lookup_items!facility_weekly_stats_nitaqat_color_fkey(value_ar,code)').eq('facility_id',selWorker.facility.id).order('week_date',{ascending:false}).limit(1).maybeSingle()
if(!cancelled)setWorkerFacilityStat(data||null)
})()
return()=>{cancelled=true}
},[sb,selWorker])

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
return workers.filter(w=>(w.name||'').toLowerCase().includes(q)||(w.phone||'').includes(q)||(w.iqama_number||'').includes(q)).slice(0,2)
},[workers,workerQ])

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
const SVC_WITH_PRICING=new Set(['ajeer_contract','exit_reentry_visa','final_exit_visa','profession_change','passport_update','name_translation','iqama_print','medical_insurance','chamber_certification','custom'])
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
  return{lines:[{label:'إصدار مستند',amount:cfg.documents.perDoc||0}]}
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
// Load priced kafala transfer quotes when entering step 3 with kafala_transfer
useEffect(()=>{
if(!sb||step!==3||selSvc!=='kafala_transfer'||loadingKafalaQuotes||kafalaQuotes.length>0)return
setLoadingKafalaQuotes(true)
sb.from('worker_transfers').select('id,new_employer_name,client_charge,transfer_fee,iqama_cost,work_permit_cost,insurance_cost,other_costs,priced_at,notes,transfer_type').eq('status','priced').order('priced_at',{ascending:false}).limit(200).then(({data})=>{
const parsed=(data||[]).map(q=>{let n={};try{n=JSON.parse(q.notes||'{}')}catch{}return{...q,_notes:n,quote_no:n.quote_no||'',worker_name:n.worker_name||q.new_employer_name||'',iqama_number:n.iqama_number||'',phone:n.phone||''}})
setKafalaQuotes(parsed)
setLoadingKafalaQuotes(false)
})
},[sb,step,selSvc])
useEffect(()=>{if(selSvc==='documents'&&!fields.doc_lang)setFields(p=>({...p,doc_lang:'ar'}))},[selSvc])
// Set 'final_exit' as default for final_exit_visa type
useEffect(()=>{if(selSvc==='final_exit_visa'&&!fields.final_exit_type)setFields(p=>({...p,final_exit_type:'final_exit'}))},[selSvc])
// Set 'single' as default for exit_reentry_visa type
useEffect(()=>{if(selSvc==='exit_reentry_visa'&&!fields.exit_type)setFields(p=>({...p,exit_type:'single'}))},[selSvc])

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
if(step2Mode==='client'){
if(clientMode==='existing'&&!selClient&&!workerIsClient){setErr('يرجى اختيار عميل');return false}
if(clientMode==='new'&&!workerIsClient){
const nAr=newClient.name_ar.trim()
if(!nAr){setErr('يرجى إدخال الاسم بالعربي');return false}
if(!/^[\u0600-\u06FF\s]+$/.test(nAr)){setErr('الاسم بالعربي يجب أن يحتوي على حروف عربية فقط');return false}
{const w=nAr.split(/\s+/).filter(Boolean);if(w.length<2||w.length>3){setErr('الاسم بالعربي يجب أن يكون من كلمتين إلى ثلاث كلمات');return false}}
const nEn=newClient.name_en.trim()
if(!nEn){setErr('يرجى إدخال الاسم بالإنجليزي');return false}
if(!/^[A-Za-z\s]+$/.test(nEn)){setErr('الاسم بالإنجليزي يجب أن يحتوي على حروف إنجليزية فقط');return false}
{const w=nEn.split(/\s+/).filter(Boolean);if(w.length<2||w.length>3){setErr('الاسم بالإنجليزي يجب أن يكون من كلمتين إلى ثلاث كلمات');return false}}
if(!newClient.id_number||newClient.id_number.length!==10){setErr('رقم الهوية يجب أن يكون 10 أرقام');return false}
if(!newClient.phone||newClient.phone.length!==9){setErr('رقم الجوال يجب أن يكون 9 أرقام');return false}
}
}else if(step2Mode==='worker'){
if(workerMode==='existing'&&!selWorker){setErr('يرجى اختيار عامل');return false}
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
// Kafala transfer: must select a certified quote
if(selSvc==='kafala_transfer'){
if(!selKafalaQuote){setErr('يرجى اختيار حسبة تنازل مصدقة');return false}
return true
}
if(VISA_SERVICES.has(selSvc)){
if(step3Mode==='groups'){
for(let i=0;i<visaGroups.length;i++){
const g=visaGroups[i]
const lbl=`المجموعة ${i+1}`
if(!g.nationality){setErr(`${lbl}: يرجى اختيار الجنسية`);return false}
if(!g.embassy){setErr(`${lbl}: يرجى اختيار السفارة`);return false}
if(!g.profession){setErr(`${lbl}: يرجى اختيار المهنة`);return false}
if(!g.gender){setErr(`${lbl}: يرجى اختيار الجنس`);return false}
if((parseInt(g.count)||0)<1){setErr(`${lbl}: يرجى إدخال عدد التأشيرات`);return false}
}
}else{
// Validate global file distribution
const totalV=visaGroups.reduce((s,g)=>s+(parseInt(g.count)||0),0)
const fc=(f)=>Object.values(f.assignments||{}).reduce((s,n)=>s+(parseInt(n)||0),0)
const sumF=visaFiles.reduce((s,f)=>s+fc(f),0)
if(sumF!==totalV){setErr(`مجموع التأشيرات في الملفات (${sumF}) لا يطابق الإجمالي (${totalV})`);return false}
for(let i=0;i<visaFiles.length;i++){
const c=fc(visaFiles[i])
if(c<1){setErr(`الملف ${i+1}: يجب أن يحتوي على تأشيرة واحدة على الأقل`);return false}
if(c>4){setErr(`الملف ${i+1}: الحد الأقصى 4 تأشيرات لكل ملف`);return false}
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
if(inp.type==='toggle'){if(fields[inp.key]!==true&&fields[inp.key]!==false){setErr(`يرجى تعبئة: ${inp.label_ar}`);return false}}
else if(inp.type==='date_hijri'){if(!fields[inp.key]||!/^\d{4}-\d{2}-\d{2}$/.test(fields[inp.key])){setErr(`يرجى تعبئة: ${inp.label_ar}`);return false}}
else if(!fields[inp.key]){setErr(`يرجى تعبئة: ${inp.label_ar}`);return false}
}
}
}
// Step 4 (invoice) — block if any installment below its minimum for visa services
if(step===4&&VISA_SERVICES.has(selSvc)){
const cfg=getVisaMinConfig(selSvc)
const numVisas=visaGroups.reduce((s,g)=>s+(parseInt(g.count)||0),0)||1
const total=totalOverride!==null?totalOverride:(pricing.total||0)
const hasAuth=selSvc!=='work_visa_temporary'
const defaultEach=total/(hasAuth?3:2)
const issuanceVal=visaInstallments.issuance===''?defaultEach:(Number(visaInstallments.issuance)||0)
if(issuanceVal<numVisas*cfg.issuance){setErr('السعر المدخل غير مسموح، يرجى مراجعة الدفعات');return false}
if(hasAuth){
const authVal=visaInstallments.authorization===''?defaultEach:(Number(visaInstallments.authorization)||0)
if(authVal<numVisas*cfg.authorization){setErr('السعر المدخل غير مسموح، يرجى مراجعة الدفعات');return false}
}
}
return true
}

const goNext=()=>{
if(!canNext())return
// Step 2 sub-flow: client → (if worker not same and not visa/kafala service) worker → next step
if(step===2&&step2Mode==='client'&&!VISA_SERVICES.has(selSvc)&&selSvc!=='kafala_transfer'){setStep2Mode('worker');setErr('');return}
// If the service's single field is merged into Step 2, skip Step 3 entirely
if(step===2&&hasMergedField){setStep(4);return}
// Step 3 sub-flow (visa services): groups → [auto: skip to step 4] or [custom: files distribution → step 4]
if(step===3&&VISA_SERVICES.has(selSvc)&&step3Mode==='groups'){
// Auto-initialize global distribution: 4 per file, remainder in last, greedily assigned across groups
const totalV=visaGroups.reduce((s,g)=>s+(parseInt(g.count)||0),0)
const minFiles=Math.max(1,Math.ceil(totalV/4))
const sizes=[]
{let r=totalV;for(let i=0;i<minFiles;i++){const c=Math.min(4,r);sizes.push(c);r-=c}}
const q=visaGroups.map(g=>({id:g.id,rem:parseInt(g.count)||0}))
const files=sizes.map((sz,i)=>{const a={};let need=sz;while(need>0){const gg=q.find(x=>x.rem>0);if(!gg)break;const t=Math.min(gg.rem,need);a[gg.id]=(a[gg.id]||0)+t;gg.rem-=t;need-=t}return{id:i+1,assignments:a}})
if(visaDistMode==='auto'){
// Auto: fix distribution at 4-per-file and jump directly to invoice
setVisaFiles(files)
setForceCustomFiles(false)
setStep(4);setErr('');return
}
// Custom: seed if needed, open files sub-step
const sumExisting=visaFiles.reduce((s,f)=>s+Object.values(f.assignments||{}).reduce((ss,n)=>ss+(parseInt(n)||0),0),0)
if(visaFiles.length===0||sumExisting!==totalV){
setVisaFiles(files)
setForceCustomFiles(false)
}
setStep3Mode('files');setErr('');return
}
// Step 3 kafala sub-flow: quote search IS the entire step. Skip the pricing entry (التسعيرة) — go directly to the payment plan inside step 4.
if(step===3&&selSvc==='kafala_transfer'){setStep(4);setKafalaPayStep(true);setErr('');return}
// Step 3 passport sub-flow: current data+type → new passport fields
if(step===3&&selSvc==='passport_update'&&passportPage<2){setPassportPage(2);setErr('');return}
// Free services (documents): skip invoice + payment, jump straight to summary
if(step===3&&isFreeSvc){setStep(5);setShowSummaryScreen(true);setErr('');return}
// Step 4 kafala/iqama sub-flow: pricing → payment-plan screen (before moving to step 5)
if(step===4&&(selSvc==='kafala_transfer'||selSvc==='iqama_renewal')&&!kafalaPayStep){setKafalaPayStep(true);setErr('');return}
// Step 5 sub-flow: payment → broker/note (kafala/visa only) → summary
if(step===5&&!showSummaryScreen&&!showBrokerNoteScreen){
const needsBrokerNote=selSvc==='kafala_transfer'||VISA_SERVICES.has(selSvc)
if(needsBrokerNote){setShowBrokerNoteScreen(true);setErr('');return}
setShowSummaryScreen(true);setErr('');return
}
if(step===5&&showBrokerNoteScreen&&!showSummaryScreen){setShowBrokerNoteScreen(false);setShowSummaryScreen(true);setErr('');return}
setStep(s=>Math.min(s+1,5))
}
const goBack=()=>{
setErr('')
if(step===2&&step2Mode==='worker'){setStep2Mode('client');return}
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
// Free services (documents): summary → details (step 3) directly
if(step===5&&showSummaryScreen&&isFreeSvc){setShowSummaryScreen(false);setStep(3);return}
// Step 5 sub-flow: summary → broker/note (if applicable) → payment entry
if(step===5&&showSummaryScreen){
const needsBrokerNote=selSvc==='kafala_transfer'||VISA_SERVICES.has(selSvc)
if(needsBrokerNote){setShowSummaryScreen(false);setShowBrokerNoteScreen(true);return}
setShowSummaryScreen(false);return
}
if(step===5&&showBrokerNoteScreen){setShowBrokerNoteScreen(false);return}
// Coming back from step 5 into step 4: kafala/iqama → restore payment-plan screen
if(step===5&&(selSvc==='kafala_transfer'||selSvc==='iqama_renewal')){setStep(4);setKafalaPayStep(true);return}
// Mirror the skip on the way back
if(step===4&&hasMergedField){setStep(2);setStep2Mode('worker');return}
setStep(s=>Math.max(s-1,1))
}

// Submit
const handleSubmit=async()=>{
if(saving)return
setSaving(true);setErr('')
try{
let finalClientId=selClient?.id||null

// Create new worker if needed
let finalWorkerId=selWorker?.id||null
if(!workerIsClient&&workerMode==='new'){
const{data:nw,error:nwErr}=await sb.from('workers').insert({
name:newWorker.name,
phone:'+966'+newWorker.phone,iqama_number:newWorker.iqama_number||null,
created_by:user?.id
}).select().single()
if(nwErr)throw nwErr
finalWorkerId=nw.id
}

// Create new client if needed
if(clientMode==='new'){
const{data:nc,error:ncErr}=await sb.from('clients').insert({
name_ar:newClient.name_ar,name_en:newClient.name_en||null,
phone:'+966'+newClient.phone,
id_number:newClient.id_number||null,branch_id:branchId,status:'active',
client_number:'CL-'+Date.now(),created_by:user?.id
}).select().single()
if(ncErr)throw ncErr
finalClientId=nc.id
}

// Generate transaction number
const year=new Date().getFullYear()
const{count}=await sb.from('transactions').select('id',{count:'exact',head:true}).like('transaction_number',`TXN-${year}%`)
const txNum=`TXN-${year}-${String((count||0)+1).padStart(5,'0')}`

// Create transaction
const{data:tx,error:txErr}=await sb.from('transactions').insert({
transaction_number:txNum,transaction_type:'client_transaction',
service_id:selSvc,service_category:selectedService?.category,
client_id:finalClientId,worker_id:workerIsClient?null:finalWorkerId,
status:'pending',priority:'normal',branch_id:branchId,
start_date:new Date().toISOString().split('T')[0],
due_date:new Date(Date.now()+14*86400000).toISOString().split('T')[0],
client_note:clientNote||null,internal_note:internalNote||null,
notes:selectedService?.name_ar,created_by:user?.id
}).select().single()
if(txErr)throw txErr

// Save dynamic field values (keep `false` values for toggles, drop empty/null/undefined)
const fieldEntries=Object.entries(fields).filter(([,v])=>v!==undefined&&v!==null&&v!=='')
if(fieldEntries.length>0){
const{error:fErr}=await sb.from('transaction_field_values').insert(
fieldEntries.map(([key,val])=>({transaction_id:tx.id,field_key:key,field_value:String(val),created_at:new Date().toISOString(),updated_at:new Date().toISOString()}))
)
if(fErr)throw fErr
}

// Create invoice
const invNum=`INV-${year}-${String((count||0)+1).padStart(5,'0')}`
const{data:inv,error:invErr}=await sb.from('invoices').insert({
invoice_number:invNum,client_id:finalClientId,branch_id:branchId,
transaction_id:tx.id,total_amount:(VISA_SERVICES.has(selSvc)&&totalOverride!==null)?totalOverride:pricing.subtotal,
discount_amount:0,vat_amount:pricing.vat,vat_rate:pricing.vatRate*100,
net_amount:(VISA_SERVICES.has(selSvc)&&totalOverride!==null)?totalOverride:pricing.total,paid_amount:0,remaining_amount:(VISA_SERVICES.has(selSvc)&&totalOverride!==null)?totalOverride:pricing.total,
status:'unpaid',invoice_type:'client',
issue_date:new Date().toISOString().split('T')[0],
due_date:new Date(Date.now()+7*86400000).toISOString().split('T')[0],
service_category:selectedService?.category,
payment_terms_type:'full',payment_terms_days:7,
created_by:user?.id
}).select().single()
if(invErr)throw invErr

// Create invoice items
if((selSvc==='kafala_transfer'||selSvc==='iqama_renewal'||SVC_WITH_PRICING.has(selSvc))&&pricing.rules?.rules?.length){
// One row per non-zero kafala line + one row for office fee under "service"
const lines=pricing.rules.rules.filter(l=>l.amount>0)
const items=lines.map(l=>{
const lineTotal=Number(l.amount)
const vatAmt=Math.round(lineTotal*(pricing.vatRate)*100)/100
return{invoice_id:inv.id,item_type:'service',description_ar:l.label,
sub_service_id:selSvc,quantity:1,unit_price:lineTotal,discount:0,
vat_rate:pricing.vatRate*100,vat_amount:vatAmt,
line_total:lineTotal,line_total_with_vat:lineTotal+vatAmt}
})
if(items.length>0){
const{error:iiErr}=await sb.from('invoice_items').insert(items)
if(iiErr)throw iiErr
}
}else{
await sb.from('invoice_items').insert({
invoice_id:inv.id,item_type:'service',description_ar:selectedService?.name_ar,
sub_service_id:selSvc,quantity:1,unit_price:pricing.price,
discount:0,vat_rate:pricing.vatRate*100,vat_amount:pricing.vat,
line_total:pricing.subtotal,line_total_with_vat:pricing.total
})
}

toast(T('تم رفع الطلب بنجاح ✓','Request submitted successfully ✓'))
onClose()
}catch(e){
console.error(e)
setErr('حدث خطأ: '+(e.message||'حاول مرة أخرى'))
}
setSaving(false)
}

// ═══════════ RENDER ═══════════
return<div style={{display:'flex',flexDirection:'column',height:'100%',fontFamily:F,direction:'rtl'}}>
<style>{`.sr-modal-scroll::-webkit-scrollbar{width:0;display:none}.sr-modal-scroll{scrollbar-width:none;-ms-overflow-style:none}
input[type=number].sr-no-spin::-webkit-outer-spin-button,input[type=number].sr-no-spin::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
input[type=number].sr-no-spin{-moz-appearance:textfield}
input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
input[type=number]{-moz-appearance:textfield}
.sr-visa-field{width:100%;height:44px;padding:0 36px;border:1.5px solid rgba(255,255,255,.1);border-radius:10px;font-family:${F};font-size:13px;font-weight:600;color:var(--tx);outline:none;background:rgba(255,255,255,.05);text-align:center;text-align-last:center;box-sizing:border-box;appearance:none;-webkit-appearance:none;-moz-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23ffffff60' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:14px center;cursor:pointer;transition:.2s}
.sr-visa-field:hover:not(:disabled){border-color:rgba(212,160,23,.3)}
.sr-visa-field:focus{border-color:${C.gold}}
.sr-visa-field:disabled{cursor:not-allowed;opacity:.5}
.sr-visa-field option{background:var(--modal-bg);color:var(--tx);text-align:center;direction:rtl}
.sr-visa-label{font-size:11px;font-weight:700;color:var(--tx4);margin-bottom:6px;display:block;text-align:center;font-family:${F}}
@keyframes niceFadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
.sr-next-btn,.sr-back-btn{height:40px;padding:0 6px;background:transparent;border:none;color:#D4A017;font-family:${F};font-size:16px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:10px;transition:.2s}
.sr-back-btn{color:var(--tx3)}
.sr-next-btn .nav-ico,.sr-back-btn .nav-ico{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);display:flex;align-items:center;justify-content:center;transition:.2s;color:#D4A017}
.sr-back-btn .nav-ico{background:rgba(255,255,255,.06);color:var(--tx3)}
.sr-next-btn:hover:not(:disabled) .nav-ico{background:#D4A017;color:#000}
.sr-back-btn:hover:not(:disabled){color:var(--tx)}
.sr-back-btn:hover:not(:disabled) .nav-ico{background:rgba(255,255,255,.14);color:var(--tx)}
.sr-next-btn.dir-fwd:hover:not(:disabled) .nav-ico{transform:translateX(-4px)}
.sr-next-btn.dir-back:hover:not(:disabled) .nav-ico,.sr-back-btn:hover:not(:disabled) .nav-ico{transform:translateX(4px)}
[dir=rtl] .sr-next-btn.dir-fwd:hover:not(:disabled) .nav-ico{transform:translateX(4px)}
[dir=rtl] .sr-next-btn.dir-back:hover:not(:disabled) .nav-ico,[dir=rtl] .sr-back-btn:hover:not(:disabled) .nav-ico{transform:translateX(-4px)}
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
.bill-dot{position:absolute;top:8px;left:8px;padding:1px 7px;border-radius:4px;background:transparent;border:1.2px dashed rgba(60,192,101,.5);color:#3cc065;font-family:${F};font-size:9px;font-weight:800;transition:.2s;cursor:help}
.bill-dot[data-tip]::after{content:attr(data-tip);position:absolute;top:calc(100% + 8px);left:-4px;transform:translateY(-4px);background:var(--modal-bg);color:#D4A017;border:1px solid rgba(212,160,23,.35);padding:5px 11px;border-radius:7px;font-size:10.5px;font-weight:700;font-family:${F};white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .18s,transform .18s;box-shadow:0 6px 18px rgba(0,0,0,.5);z-index:30;letter-spacing:0}
.bill-dot[data-tip]::before{content:'';position:absolute;top:calc(100% + 3px);left:8px;transform:translateY(-4px);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:5px solid rgba(212,160,23,.45);opacity:0;pointer-events:none;transition:opacity .18s,transform .18s;z-index:30}
.bill-dot[data-tip]:hover::after,.bill-dot[data-tip]:hover::before{opacity:1;transform:translateY(0)}
.bento-card:hover .bill-dot,.bento-card.selected .bill-dot,.sub-card:hover .bill-dot,.sub-card.selected .bill-dot{border-color:rgba(60,192,101,.8);color:#4cd075}
.bento-sub{font-size:10px;color:rgba(255,255,255,.4);font-family:${F};direction:ltr;letter-spacing:.2px}`}</style>

{/* ── Top Bar: Icon + Title + Close ── */}
<div style={{padding:'20px 24px 0',display:'flex',flexDirection:'column',flexShrink:0}}>
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
<div style={{display:'flex',alignItems:'center',gap:12,flex:1,minWidth:0}}>
{(()=>{const svc=selSvc?ALL_SERVICES.find(s=>s.id===selSvc):null;const Ico=svc?.Icon;return Ico?<Ico size={28} strokeWidth={1.8} color={C.bentoGold} style={{flexShrink:0}}/>:<span style={{position:'relative',display:'inline-flex',alignItems:'center',color:C.bentoGold,flexShrink:0}}><FileText size={28} strokeWidth={1.8}/><Sparkles size={12} strokeWidth={2} style={{position:'absolute',top:-4,right:-4}}/></span>})()}
<div style={{fontSize:22,fontWeight:600,color:'var(--tx)',fontFamily:F,lineHeight:1.2}}>{(()=>{const svc=selSvc?ALL_SERVICES.find(s=>s.id===selSvc):null;return svc?svc.name_ar:'فاتورة'})()}</div>
</div>
<button onClick={onClose} onMouseEnter={e=>{e.currentTarget.style.background='linear-gradient(180deg,rgba(192,57,43,.18) 0%,rgba(192,57,43,.08) 100%)';e.currentTarget.style.borderColor='rgba(192,57,43,.4)';e.currentTarget.style.color='#e5867a'}} onMouseLeave={e=>{e.currentTarget.style.background='linear-gradient(180deg,#323232 0%,#262626 100%)';e.currentTarget.style.borderColor='rgba(255,255,255,.07)';e.currentTarget.style.color='var(--tx3)'}} style={{width:34,height:34,borderRadius:9,background:'linear-gradient(180deg,#323232 0%,#262626 100%)',border:'1px solid rgba(255,255,255,.07)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontFamily:F,boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'}} aria-label="إغلاق">
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
</button>
</div>
<div style={{display:'flex',gap:4,marginTop:14}}>
{Array.from({length:totalSteps}).map((_,i)=><div key={i} style={{flex:1,height:3,borderRadius:4,background:i<displayStep?'linear-gradient(90deg, #D4A017, #F0C040)':'rgba(255,255,255,.06)',transition:'.35s'}}/>)}
</div>
</div>

{/* ── Content ── */}
<div style={{flex:1,minHeight:0,padding:'6px 24px',display:'flex',flexDirection:'column'}}>
<div style={{borderRadius:12,padding:'0 0 4px',position:'relative',flex:1,display:'flex',flexDirection:'column',minHeight:0}}>
<div style={{display:'flex',alignItems:'center',marginBottom:12,flexShrink:0,gap:10}}>
<div style={{fontSize:13,fontWeight:600,color:C.bentoGold,fontFamily:F}}>{(()=>{const titles=['الطلب','العميل','التفاصيل','الفاتورة','الدفع'];let t=step===2&&step2Mode==='worker'?'العامل':(titles[step-1]||'');if(step===5&&showSummaryScreen)t='الملخص';if(step===5&&showBrokerNoteScreen)t='الوسيط والملاحظات';if(step===4&&kafalaPayStep)t='طريقة الدفع';return t})()}</div>
</div>
<div className="sr-modal-scroll" style={{flex:1,minHeight:0,display:'flex',flexDirection:'column',justifyContent:'flex-start',overflowY:'auto',overflowX:'hidden'}}>

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
.bill-dot{position:absolute;top:8px;left:8px;padding:1px 7px;border-radius:4px;background:transparent;border:1.2px dashed rgba(60,192,101,.5);color:#3cc065;font-family:${F};font-size:9px;font-weight:800;transition:.2s;cursor:help}
.bill-dot[data-tip]::after{content:attr(data-tip);position:absolute;top:calc(100% + 8px);left:-4px;transform:translateY(-4px);background:var(--modal-bg);color:#D4A017;border:1px solid rgba(212,160,23,.35);padding:5px 11px;border-radius:7px;font-size:10.5px;font-weight:700;font-family:${F};white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .18s,transform .18s;box-shadow:0 6px 18px rgba(0,0,0,.5);z-index:30;letter-spacing:0}
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
`}</style>

{/* Animated view container — fills available space */}
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
<div style={{position:'absolute',inset:0,opacity:showOthers?1:0,transform:showOthers?'translateX(0)':'translateX(-20px)',transition:'opacity .3s, transform .3s',pointerEvents:showOthers?'auto':'none'}}>
<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,height:'100%',gridAutoRows:'1fr'}}>
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
</div>}

{/* ═══ Step 2: Client & Worker ═══ */}
{step===2&&<div style={{display:'flex',flexDirection:'column',flex:1,minHeight:0}}>
{step2Mode==='client'&&<div style={{display:'flex',flexDirection:'column',flex:1,minHeight:0}}>

{/* Worker-is-client checkbox — placed above the search; when checked, hides the search & new-client form */}
{!VISA_SERVICES.has(selSvc)&&<label onClick={()=>{const newVal=!workerIsClient;setWorkerIsClient(newVal);if(newVal){if(selClient){const matchedWorker=workers.find(w=>w.iqama_number===selClient.id_number||w.phone===selClient.phone);setSelWorker(matchedWorker||null)}setClientMode('existing')}else{setSelWorker(null)}}} style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',flexShrink:0,fontFamily:F,userSelect:'none',padding:'10px 14px',borderRadius:9,background:workerIsClient?'rgba(212,160,23,.08)':'rgba(0,0,0,.18)',border:workerIsClient?'1px solid rgba(212,160,23,.35)':'1px solid rgba(255,255,255,.05)',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)',transition:'.15s',marginBottom:10}}>
<div style={{width:14,height:14,borderRadius:4,border:`1.5px solid ${workerIsClient?C.bentoGold:'rgba(255,255,255,.25)'}`,background:workerIsClient?C.bentoGold:'transparent',display:'flex',alignItems:'center',justifyContent:'center',transition:'.15s',flexShrink:0}}>
{workerIsClient&&<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
</div>
<span style={{fontSize:11,fontWeight:700,color:workerIsClient?C.bentoGold:'var(--tx4)'}}>العامل هو العميل</span>
</label>}

{/* Unified search — hidden when a client is selected, in new-client mode, or when worker-is-client is checked */}
{!workerIsClient&&!selClient&&clientMode!=='new'&&<>
<div style={{display:'flex',alignItems:'stretch',gap:8,marginBottom:(clientQ&&filteredClients.length===0)?14:8}}>
<div style={{position:'relative',flex:1,minWidth:0}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{position:'absolute',top:'50%',right:14,transform:'translateY(-50%)',pointerEvents:'none'}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
<input value={clientQ} onChange={e=>{setClientQ(e.target.value);setClientMode('existing')}} placeholder="ابحث بالاسم (عربي/إنجليزي) أو الجوال أو رقم الهوية..." style={{width:'100%',height:42,padding:'0 40px 0 14px',border:'1px solid rgba(255,255,255,.05)',borderRadius:9,fontFamily:F,fontSize:13,fontWeight:600,color:'var(--tx)',background:'var(--modal-input-bg)',outline:'none',textAlign:'right',boxSizing:'border-box',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)'}}/>
</div>
{clientMode!=='new'&&<button onClick={()=>{setClientMode('new');setNewClient(p=>({...p,name_ar:/[\u0600-\u06FF]/.test(clientQ)?clientQ:p.name_ar,name_en:/^[A-Za-z\s]+$/.test(clientQ)?clientQ:p.name_en,phone:/^[0-9+]+$/.test(clientQ)?clientQ:p.phone,id_number:/^\d{10}$/.test(clientQ)?clientQ:p.id_number}))}} style={{height:42,padding:'0 14px',background:'transparent',border:'1.3px dashed rgba(212,160,23,.55)',borderRadius:9,color:C.bentoGold,fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6,flexShrink:0,transition:'.15s',whiteSpace:'nowrap'}} onMouseEnter={e=>{e.currentTarget.style.background='rgba(212,160,23,.07)';e.currentTarget.style.borderColor='rgba(212,160,23,.85)'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='rgba(212,160,23,.55)'}}>
<span>عميل جديد</span>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
</button>}
</div>
</>}

{/* Mode: existing (show results) — hidden when worker-is-client is checked */}
{!workerIsClient&&clientMode==='existing'&&<div>
{filteredClients.length>0?<div style={{display:'flex',flexDirection:'column',gap:8}}>
{(selClient?[selClient]:filteredClients).map(c=>{
const sel=selClient?.id===c.id
const country=c.nationality_id?lkCountries.find(co=>co.id===c.nationality_id):null
// Resolve 2-letter ISO country code (e.g., "SA") from either `code` or `flag_emoji` column
const rawCode=(country?.code||country?.flag_emoji||'SA').toString().trim().toUpperCase()
const flagCode=/^[A-Z]{2}$/.test(rawCode)?rawCode:'SA'
const flagUrl=`https://flagcdn.com/w80/${flagCode.toLowerCase()}.png`
const natLabel=country?.nationality_ar||'سعودي'
return<div key={c.id} onClick={()=>{if(sel){setSelClient(null);setWorkerIsClient(false);setSelWorker(null)}else{setSelClient(c);setWorkerIsClient(false);setSelWorker(null)}}}
style={{padding:'12px 16px',borderRadius:12,cursor:'pointer',display:'flex',alignItems:'center',gap:14,position:'relative',
border:sel?'1px solid rgba(212,160,23,.25)':'1px solid rgba(255,255,255,.06)',
background:sel?'rgba(212,160,23,.04)':'rgba(255,255,255,.03)',
boxShadow:'none',
transition:'all .22s ease'}}
onMouseEnter={e=>{if(!sel){e.currentTarget.style.background='rgba(212,160,23,.07)';e.currentTarget.style.borderColor='rgba(212,160,23,.2)'}}}
onMouseLeave={e=>{if(!sel){e.currentTarget.style.background='rgba(255,255,255,.03)';e.currentTarget.style.borderColor='rgba(255,255,255,.06)'}}}>
{sel&&<div style={{position:'absolute',top:8,left:8,width:20,height:20,borderRadius:'50%',background:C.bentoGold,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px rgba(212,160,23,.45)'}}>
<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
</div>}
{/* Flag image — prominent nationality indicator on the right (RTL start) */}
<div title={natLabel} style={{width:sel?52:48,height:sel?52:48,borderRadius:12,background:'rgba(0,0,0,.25)',border:sel?'1.5px solid rgba(212,160,23,.4)':'1px solid rgba(255,255,255,.08)',flexShrink:0,transition:'.25s',boxShadow:sel?'0 2px 8px rgba(212,160,23,.15)':'none',position:'relative',overflow:'hidden'}}>
<img src={flagUrl} alt={natLabel} loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
</div>
<div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:5}}>
<div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
<span style={{fontSize:15,fontWeight:800,color:sel?C.gold:'rgba(255,255,255,.95)',letterSpacing:'-.2px'}}>{c.name_ar}</span>
{c.name_en&&<span style={{fontSize:11,color:'var(--tx5)',fontWeight:600,direction:'ltr',opacity:.7}}>{c.name_en}</span>}
</div>
<div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
{c.id_number&&<span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:11,color:'var(--tx4)',fontWeight:600,padding:'3px 8px',borderRadius:6,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.05)'}}>
<CreditCard size={11} strokeWidth={1.8}/>
<span style={{direction:'ltr'}}>{c.id_number}</span>
</span>}
{c.phone&&<span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:11,color:'var(--tx4)',fontWeight:600,padding:'3px 8px',borderRadius:6,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.05)'}}>
<Phone size={11} strokeWidth={1.8}/>
<span style={{direction:'ltr'}}>{fmtPhone(c.phone)}</span>
</span>}
</div>
</div>
</div>})}
</div>
:<div style={{padding:'24px 20px',borderRadius:9,background:'var(--modal-input-bg)',border:'1px solid rgba(255,255,255,.05)',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8}}>
<div style={{width:42,height:42,borderRadius:'50%',background:'rgba(212,160,23,.08)',border:'1px dashed rgba(212,160,23,.3)',display:'flex',alignItems:'center',justifyContent:'center'}}>
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(212,160,23,.65)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
</div>
<div style={{fontSize:12.5,color:'var(--tx2)',fontWeight:700,fontFamily:F}}>لا يوجد عميل بهذا البحث</div>
<div style={{fontSize:10.5,color:'var(--tx5)',fontWeight:500,fontFamily:F}}>يمكنك إضافة عميل جديد من الأعلى</div>
</div>}
</div>}

{/* When worker=client and a worker record matches, show expanded worker-style details below */}
{workerIsClient&&selClient&&selWorker&&(()=>{const w=selWorker;const iqStat=dateStatus(w.iqama_expiry_date);const natName=w.country?.nationality_ar||w.nationality||'—';const pillBase={display:'flex',alignItems:'center',gap:6,padding:'5px 9px',borderRadius:8,background:'rgba(255,255,255,.025)',border:'1px solid rgba(255,255,255,.06)',fontSize:11,fontFamily:F,color:'var(--tx3)',minHeight:28};const lbl={fontSize:9,color:'var(--tx5)',fontWeight:600,letterSpacing:'.2px'};const val={fontSize:12,color:'var(--tx)',fontWeight:700,direction:'ltr'};const stColors={expired:'#c0392b',soon:'#e5b534',ok:'#27a046',none:'var(--tx5)'};
return<div style={{marginTop:12,padding:10,borderRadius:14,background:'linear-gradient(135deg,rgba(212,160,23,.05),rgba(255,255,255,.015))',border:'1px solid rgba(212,160,23,.2)',display:'flex',flexDirection:'column',gap:6}}>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
<div style={pillBase}>
<CreditCard size={12} color={C.bentoGold} strokeWidth={1.8}/>
<div style={{display:'flex',flexDirection:'column',gap:5}}><span style={lbl}>رقم الإقامة</span><span style={val}>{w.iqama_number||'—'}</span></div>
</div>
<div style={pillBase}>
<Calendar size={12} color={stColors[iqStat]} strokeWidth={1.8}/>
<div style={{display:'flex',flexDirection:'column',gap:5}}><span style={lbl}>انتهاء الإقامة</span><span style={{...val,color:stColors[iqStat]}}>{fmtDate(w.iqama_expiry_date)}</span></div>
</div>
</div>
{w.facility&&<div style={{padding:'8px 10px',borderRadius:10,background:'rgba(255,255,255,.025)',border:'1px solid rgba(255,255,255,.06)',display:'flex',flexDirection:'column',gap:6}}>
<div style={{display:'flex',alignItems:'center',gap:8}}>
<div style={{width:24,height:24,borderRadius:7,background:'rgba(212,160,23,.1)',border:'1px solid rgba(212,160,23,.25)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
<Building2 size={12} color={C.bentoGold} strokeWidth={1.8}/>
</div>
<span style={{fontSize:13,fontWeight:800,color:'var(--tx)',fontFamily:F,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{w.facility.name_ar||'—'}</span>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
<div style={pillBase}><Hash size={12} color={C.bentoGold} strokeWidth={1.8}/>
<div style={{display:'flex',flexDirection:'column',gap:5,flex:1,minWidth:0}}><span style={lbl}>الرقم الموحد</span><span style={{...val,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{w.facility.unified_national_number||'—'}</span></div>
{w.facility.unified_national_number&&<button onClick={e=>{e.stopPropagation();navigator.clipboard?.writeText(w.facility.unified_national_number);toast&&toast(T('تم النسخ','Copied'))}} title="نسخ" style={{padding:3,background:'transparent',border:'none',cursor:'pointer',color:'var(--tx5)',display:'flex',alignItems:'center',borderRadius:4,transition:'.15s',flexShrink:0}} onMouseEnter={e=>{e.currentTarget.style.color=C.gold;e.currentTarget.style.background='rgba(212,160,23,.1)'}} onMouseLeave={e=>{e.currentTarget.style.color='var(--tx5)';e.currentTarget.style.background='transparent'}}><Copy size={11}/></button>}
</div>
<div style={pillBase}><Hash size={12} color={C.bentoGold} strokeWidth={1.8}/>
<div style={{display:'flex',flexDirection:'column',gap:5,flex:1,minWidth:0}}><span style={lbl}>رقم قوى</span><span style={{...val,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{w.facility.qiwa_file_number||w.facility.qiwa_unified_number||'—'}</span></div>
{(w.facility.qiwa_file_number||w.facility.qiwa_unified_number)&&<button onClick={e=>{e.stopPropagation();const v=w.facility.qiwa_file_number||w.facility.qiwa_unified_number;navigator.clipboard?.writeText(v);toast&&toast(T('تم النسخ','Copied'))}} title="نسخ" style={{padding:3,background:'transparent',border:'none',cursor:'pointer',color:'var(--tx5)',display:'flex',alignItems:'center',borderRadius:4,transition:'.15s',flexShrink:0}} onMouseEnter={e=>{e.currentTarget.style.color=C.gold;e.currentTarget.style.background='rgba(212,160,23,.1)'}} onMouseLeave={e=>{e.currentTarget.style.color='var(--tx5)';e.currentTarget.style.background='transparent'}}><Copy size={11}/></button>}
</div>
<div style={pillBase}><Hash size={12} color={C.bentoGold} strokeWidth={1.8}/>
<div style={{display:'flex',flexDirection:'column',gap:5,flex:1,minWidth:0}}><span style={lbl}>رقم التأمينات</span><span style={{...val,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{w.facility.gosi_file_number||'—'}</span></div>
{w.facility.gosi_file_number&&<button onClick={e=>{e.stopPropagation();navigator.clipboard?.writeText(w.facility.gosi_file_number);toast&&toast(T('تم النسخ','Copied'))}} title="نسخ" style={{padding:3,background:'transparent',border:'none',cursor:'pointer',color:'var(--tx5)',display:'flex',alignItems:'center',borderRadius:4,transition:'.15s',flexShrink:0}} onMouseEnter={e=>{e.currentTarget.style.color=C.gold;e.currentTarget.style.background='rgba(212,160,23,.1)'}} onMouseLeave={e=>{e.currentTarget.style.color='var(--tx5)';e.currentTarget.style.background='transparent'}}><Copy size={11}/></button>}
</div>
</div>
</div>}
</div>})()}

{workerIsClient&&selClient&&!selWorker&&<div style={{marginTop:12,padding:'12px 14px',borderRadius:10,background:'rgba(230,126,34,.06)',border:'1px dashed rgba(230,126,34,.25)',color:'#e67e22',fontSize:11,fontWeight:600,textAlign:'center'}}>
لا يوجد سجل عامل مرتبط بهذا العميل
</div>}

{/* Mode: new client form — hidden when worker-is-client is checked */}
{!workerIsClient&&clientMode==='new'&&(()=>{
const regLblS={fontSize:14,fontWeight:500,color:'rgba(255,255,255,.6)',marginBottom:8,textAlign:'start'};
const regInpS={width:'100%',height:42,padding:'0 14px',border:'1px solid rgba(255,255,255,.07)',borderRadius:10,fontFamily:F,fontSize:14,fontWeight:500,color:'var(--tx)',background:'var(--modal-input-bg)',outline:'none',textAlign:'center',boxSizing:'border-box',boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'};
return <div style={{border:'1.5px solid rgba(212,160,23,.35)',borderRadius:12,padding:'18px 14px 14px',position:'relative',display:'flex',flexDirection:'column',gap:12,marginTop:11}}>
<div style={{position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F}}>تسجيل عميل جديد</div>
<button onClick={()=>{setClientMode('existing');setClientQ('');setNewClient({name_ar:'',name_en:'',phone:'',id_number:'',nationality_id:''});setNatOpenClient(false);setNatSearchClient('')}} style={{position:'absolute',top:-11,left:14,height:22,padding:'0 10px',borderRadius:6,border:'1px solid rgba(192,57,43,.3)',background:'var(--modal-bg)',color:C.red,cursor:'pointer',fontSize:10,fontFamily:F,fontWeight:700}}>إلغاء</button>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div>
<div style={regLblS}>الاسم بالعربي <span style={{color:C.red}}>*</span></div>
<input value={newClient.name_ar} onChange={e=>{const v=e.target.value.replace(/[^\u0600-\u06FF\s]/g,'').replace(/\s+/g,' ').split(' ').slice(0,3).join(' ');setNewClient(p=>({...p,name_ar:v}))}} placeholder="الاسم الأول والأخير" style={regInpS}/>
</div>
<div>
<div style={regLblS}>الاسم بالإنجليزي <span style={{color:C.red}}>*</span></div>
<input value={newClient.name_en} onChange={e=>{const v=e.target.value.replace(/[^A-Za-z\s]/g,'').replace(/\s+/g,' ').split(' ').slice(0,3).join(' ');setNewClient(p=>({...p,name_en:v}))}} placeholder="First and Last Name" style={{...regInpS,direction:'ltr'}}/>
</div>
<div>
<div style={regLblS}>الجنسية <span style={{color:C.red}}>*</span></div>
<div style={{position:'relative'}}>
<div ref={natTriggerRef} onClick={openNatDropdown} style={{width:'100%',height:42,padding:'0 14px',border:'1px solid rgba(255,255,255,.05)',borderRadius:9,fontFamily:F,fontSize:13,fontWeight:600,color:newClient.nationality_id?'rgba(255,255,255,.95)':'rgba(255,255,255,.38)',background:'var(--modal-input-bg)',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',boxSizing:'border-box'}}>
<span style={{flex:1,textAlign:'center'}}>{(()=>{if(!newClient.nationality_id)return'اختر الجنسية';const f=lkCountries.find(co=>co.id===newClient.nationality_id);return f?f.nationality_ar:'اختر الجنسية'})()}</span>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{flexShrink:0,transform:natOpenClient?'rotate(180deg)':'none',transition:'.2s'}}><polyline points="6 9 12 15 18 9" stroke={C.bentoGold} strokeWidth="2.5" fill="none"/></svg>
</div>
{natOpenClient&&<><div onClick={()=>{setNatOpenClient(false);setNatSearchClient('')}} style={{position:'fixed',inset:0,zIndex:9998}}/>
<div style={{position:'fixed',top:natPos.top,left:natPos.left,width:natPos.width,background:'var(--modal-bg)',border:'1px solid rgba(255,255,255,.05)',borderRadius:9,maxHeight:220,display:'flex',flexDirection:'column',zIndex:9999,boxShadow:'0 8px 32px rgba(0,0,0,.6)',overflow:'hidden'}}>
<div style={{padding:'6px 8px',borderBottom:'1px solid rgba(255,255,255,.05)',flexShrink:0}}>
<input value={natSearchClient} onChange={e=>setNatSearchClient(e.target.value)} placeholder="بحث..." autoFocus style={{width:'100%',height:30,padding:'0 10px',border:'1px solid rgba(255,255,255,.05)',borderRadius:7,background:'var(--modal-input-bg)',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)',fontFamily:F,fontSize:11,fontWeight:500,color:'var(--tx2)',outline:'none',textAlign:'center',boxSizing:'border-box'}}/>
</div>
<div style={{flex:1,overflowY:'auto',scrollbarWidth:'none'}}>
{lkCountries.filter(co=>!natSearchClient||(co.nationality_ar||'').includes(natSearchClient)).map(co=><div key={co.id} onClick={()=>{setNewClient(p=>({...p,nationality_id:co.id}));setNatOpenClient(false);setNatSearchClient('')}} style={{padding:'10px 14px',fontSize:13,fontWeight:newClient.nationality_id===co.id?700:500,color:newClient.nationality_id===co.id?C.bentoGold:'rgba(255,255,255,.7)',cursor:'pointer',textAlign:'center',borderBottom:'1px solid var(--bd2)',background:newClient.nationality_id===co.id?'rgba(212,160,23,.06)':'transparent'}}>{co.nationality_ar}</div>)}
{lkCountries.filter(co=>!natSearchClient||(co.nationality_ar||'').includes(natSearchClient)).length===0&&<div style={{padding:12,textAlign:'center',fontSize:10,color:'var(--tx5)'}}>لا توجد نتائج</div>}
</div>
</div></>}
</div>
</div>
<div>
<div style={regLblS}>رقم الهوية <span style={{color:C.red}}>*</span></div>
<input value={newClient.id_number} onChange={e=>{const v=e.target.value.replace(/[^0-9]/g,'').slice(0,10);setNewClient(p=>({...p,id_number:v}))}} placeholder="XXXXXXXXXX" inputMode="numeric" maxLength={10} style={{...regInpS,direction:'ltr'}}/>
</div>
<div>
<div style={regLblS}>رقم الجوال <span style={{color:C.red}}>*</span></div>
<div style={{display:'flex',direction:'ltr',border:'1px solid rgba(255,255,255,.05)',borderRadius:9,overflow:'hidden',background:'var(--modal-input-bg)',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)'}}>
<div style={{height:42,padding:'0 10px',background:'rgba(255,255,255,.04)',borderRight:'1px solid rgba(255,255,255,.05)',display:'flex',alignItems:'center',fontSize:12,fontWeight:700,color:C.bentoGold,flexShrink:0,fontFamily:F}}>+966</div>
<input value={(()=>{const r=newClient.phone;if(!r)return'';if(r.length<=2)return r;if(r.length<=5)return r.slice(0,2)+' '+r.slice(2);return r.slice(0,2)+' '+r.slice(2,5)+' '+r.slice(5)})()} onChange={e=>{const v=e.target.value.replace(/[^0-9]/g,'').slice(0,9);setNewClient(p=>({...p,phone:v}))}} placeholder="5X XXX XXXX" inputMode="numeric" maxLength={12} style={{width:'100%',height:42,padding:'0 12px',border:'none',background:'transparent',fontFamily:F,fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',textAlign:'left'}}/>
</div>
</div>
</div>
</div>;
})()}
</div>}

{/* ─── Worker View ─── */}
{step2Mode==='worker'&&<div>
{/* Search — hidden when a worker is already selected or in new-worker mode (mirrors client UI) */}
{!selWorker&&workerMode!=='new'&&<div style={{display:'flex',alignItems:'stretch',gap:8,marginBottom:(workerQ&&filteredWorkers.length===0)?12:8}}>
<div style={{position:'relative',flex:1,minWidth:0}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{position:'absolute',top:'50%',right:14,transform:'translateY(-50%)',pointerEvents:'none'}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
<input value={workerQ} onChange={e=>{setWorkerQ(e.target.value);setWorkerMode('existing');setSelWorker(null)}} placeholder="ابحث بالاسم أو رقم الإقامة أو الجوال..." style={{width:'100%',height:42,padding:'0 40px 0 14px',border:'1px solid rgba(255,255,255,.05)',borderRadius:9,fontFamily:F,fontSize:13,fontWeight:600,color:'var(--tx)',background:'var(--modal-input-bg)',outline:'none',textAlign:'right',boxSizing:'border-box',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)'}}/>
</div>
{selSvc==='custom'&&<button onClick={()=>{setWorkerMode('new');setNewWorker(p=>({...p,name:/[\u0600-\u06FF\sA-Za-z]/.test(workerQ)?workerQ:p.name,phone:/^[0-9+]+$/.test(workerQ)?workerQ:p.phone,iqama_number:/^\d{10}$/.test(workerQ)?workerQ:p.iqama_number}))}} style={{height:42,padding:'0 14px',background:'transparent',border:'1.3px dashed rgba(212,160,23,.55)',borderRadius:9,color:C.bentoGold,fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6,flexShrink:0,transition:'.15s',whiteSpace:'nowrap'}} onMouseEnter={e=>{e.currentTarget.style.background='rgba(212,160,23,.07)';e.currentTarget.style.borderColor='rgba(212,160,23,.85)'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='rgba(212,160,23,.55)'}}>
<span>عامل جديد</span>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
</button>}
</div>}

{/* Mode: existing worker */}
{workerMode==='existing'&&<div>
{filteredWorkers.length>0?<div style={{display:'flex',flexDirection:'column',gap:8}}>
{(selWorker?[selWorker]:filteredWorkers).map(w=>{
const sel=selWorker?.id===w.id
// Resolve 2-letter ISO country code for flag image — same pattern as client card
const rawCode=(w.country?.code||w.country?.flag_emoji||'SA').toString().trim().toUpperCase()
const flagCode=/^[A-Z]{2}$/.test(rawCode)?rawCode:'SA'
const flagUrl=`https://flagcdn.com/w80/${flagCode.toLowerCase()}.png`
const natLabel=w.country?.nationality_ar||w.nationality||'—'
return<div key={w.id} onClick={()=>setSelWorker(sel?null:w)}
style={{padding:'12px 16px',borderRadius:12,cursor:'pointer',display:'flex',alignItems:'center',gap:14,position:'relative',
border:sel?'1px solid rgba(212,160,23,.25)':'1px solid rgba(255,255,255,.06)',
background:sel?'rgba(212,160,23,.04)':'rgba(255,255,255,.03)',
boxShadow:'none',
transition:'all .22s ease'}}
onMouseEnter={e=>{if(!sel){e.currentTarget.style.background='rgba(212,160,23,.07)';e.currentTarget.style.borderColor='rgba(212,160,23,.2)'}}}
onMouseLeave={e=>{if(!sel){e.currentTarget.style.background='rgba(255,255,255,.03)';e.currentTarget.style.borderColor='rgba(255,255,255,.06)'}}}>
{sel&&<div style={{position:'absolute',top:8,left:8,width:20,height:20,borderRadius:'50%',background:C.bentoGold,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px rgba(212,160,23,.45)'}}>
<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
</div>}
{/* Flag image — prominent nationality indicator on the right (RTL start) */}
<div title={natLabel} style={{width:sel?52:48,height:sel?52:48,borderRadius:12,background:'rgba(0,0,0,.25)',border:sel?'1.5px solid rgba(212,160,23,.4)':'1px solid rgba(255,255,255,.08)',flexShrink:0,transition:'.25s',boxShadow:sel?'0 2px 8px rgba(212,160,23,.15)':'none',position:'relative',overflow:'hidden'}}>
<img src={flagUrl} alt={natLabel} loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
</div>
<div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:5}}>
<div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
<span style={{fontSize:15,fontWeight:800,color:sel?C.gold:'rgba(255,255,255,.95)',letterSpacing:'-.2px'}}>{w.name_ar||w.name}</span>
{w.name_en&&<span style={{fontSize:11,color:'var(--tx5)',fontWeight:600,direction:'ltr',opacity:.7}}>{w.name_en}</span>}
</div>
<div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
{w.iqama_number&&<span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:11,color:'var(--tx4)',fontWeight:600,padding:'3px 8px',borderRadius:6,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.05)'}}>
<CreditCard size={11} strokeWidth={1.8}/>
<span style={{direction:'ltr'}}>{w.iqama_number}</span>
</span>}
{w.phone&&<span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:11,color:'var(--tx4)',fontWeight:600,padding:'3px 8px',borderRadius:6,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.05)'}}>
<Phone size={11} strokeWidth={1.8}/>
<span style={{direction:'ltr'}}>{fmtPhone(w.phone)}</span>
</span>}
</div>
</div>
</div>})}

{/* ─── Selected Worker Expanded Details ─── */}
{selWorker&&(()=>{const w=selWorker;const stat=workerFacilityStat;const latestWP=[...(w.work_permits||[])].sort((a,b)=>new Date(b.wp_expiry_date||0)-new Date(a.wp_expiry_date||0))[0];const latestIns=[...(w.worker_insurance||[])].sort((a,b)=>new Date(b.end_date||0)-new Date(a.end_date||0))[0];const iqStat=dateStatus(w.iqama_expiry_date);const wpStat=dateStatus(latestWP?.wp_expiry_date);const insStat=dateStatus(latestIns?.end_date);const natName=w.country?.nationality_ar||w.nationality||'—';const natFlag=w.country?.flag_emoji||flagEmoji(w.country?.code)||flagEmoji(w.nationality);const ncMap={'platinum':'#E5E4E2','green':'#27a046','green_low':'#6bb77a','green_mid':'#3fa356','green_high':'#1e8c3a','green_top':'#0d6b25','yellow':'#e5b534','yellow_low':'#e5b534','yellow_high':'#c99a2a','red':'#c0392b'};const ncCode=stat?.nitaqat?.code;const ncLabel=stat?.nitaqat?.value_ar||'—';const ncColor=ncCode?(ncMap[ncCode]||'#888'):'#444';const pillBase={display:'flex',alignItems:'center',gap:8,padding:'8px 11px',borderRadius:9,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',fontSize:11,fontFamily:F,color:'var(--tx3)',minHeight:40};const lbl={fontSize:10,color:'var(--tx5)',fontWeight:600,letterSpacing:'.2px',lineHeight:1.2};const val={fontSize:13,color:'#fff',fontWeight:800,direction:'ltr',lineHeight:1.2,textAlign:'right'};const stColors={expired:'#c0392b',soon:'#e5b534',ok:'#27a046',none:'var(--tx5)'};const workerLabel=w.name_ar||w.name_en||w.name||'بيانات العامل';const facilityLabel=w.facility?.name_ar||'بيانات المنشأة';
return<>
{/* ─── Worker data fieldset ─── */}
<div style={{marginTop:19,padding:'14px 14px 12px',borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',position:'relative'}}>
<div style={{position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,maxWidth:'calc(100% - 28px)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{workerLabel}</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1.3fr 1fr 1fr',gap:10}}>
<div style={pillBase}>
<CreditCard size={12} color={C.bentoGold} strokeWidth={1.8}/>
<div style={{display:'flex',flexDirection:'column',gap:5,flex:1,minWidth:0}}><span style={lbl}>رقم الإقامة</span><span style={{...val}}>{w.iqama_number||'—'}</span></div>
{w.iqama_number&&<button onClick={e=>{e.stopPropagation();navigator.clipboard?.writeText(w.iqama_number);toast&&toast(T('تم النسخ','Copied'))}} title="نسخ" style={{padding:3,background:'transparent',border:'none',cursor:'pointer',color:'var(--tx5)',display:'flex',alignItems:'center',borderRadius:4,transition:'.15s',flexShrink:0}} onMouseEnter={e=>{e.currentTarget.style.color=C.gold;e.currentTarget.style.background='rgba(212,160,23,.1)'}} onMouseLeave={e=>{e.currentTarget.style.color='var(--tx5)';e.currentTarget.style.background='transparent'}}><Copy size={11}/></button>}
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
{ncCode&&<span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:10,fontWeight:700,color:ncColor,padding:'3px 9px',borderRadius:999,background:`${ncColor}22`,border:`1px solid ${ncColor}55`,fontFamily:F,flexShrink:0}}>
<Circle size={7} fill={ncColor} stroke="none"/>
{ncLabel}
</span>}
{stat&&(stat.wps_has_notes===true?<span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:10,fontWeight:700,color:'#c0392b',padding:'3px 9px',borderRadius:999,background:'rgba(192,57,43,.12)',border:'1px solid rgba(192,57,43,.4)',fontFamily:F,flexShrink:0}}>
<AlertCircle size={10}/> ملاحظة قوى
</span>:stat.wps_has_notes===false?<span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:10,fontWeight:700,color:stColors.ok,padding:'3px 9px',borderRadius:999,background:'rgba(39,160,70,.1)',border:'1px solid rgba(39,160,70,.35)',fontFamily:F,flexShrink:0}}>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> قوى نظيف
</span>:null)}
</div>}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
<div style={pillBase}>
<Hash size={12} color={C.bentoGold} strokeWidth={1.8}/>
<div style={{display:'flex',flexDirection:'column',gap:5,flex:1,minWidth:0}}><span style={lbl}>الرقم الموحد</span><span style={{...val,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{w.facility.unified_national_number||'—'}</span></div>
{w.facility.unified_national_number&&<button onClick={e=>{e.stopPropagation();navigator.clipboard?.writeText(w.facility.unified_national_number);toast&&toast(T('تم النسخ','Copied'))}} title="نسخ" style={{padding:3,background:'transparent',border:'none',cursor:'pointer',color:'var(--tx5)',display:'flex',alignItems:'center',borderRadius:4,transition:'.15s',flexShrink:0}} onMouseEnter={e=>{e.currentTarget.style.color=C.gold;e.currentTarget.style.background='rgba(212,160,23,.1)'}} onMouseLeave={e=>{e.currentTarget.style.color='var(--tx5)';e.currentTarget.style.background='transparent'}}><Copy size={11}/></button>}
</div>
<div style={pillBase}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.bentoGold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>
<div style={{display:'flex',flexDirection:'column',gap:5,flex:1,minWidth:0}}><span style={lbl}>رقم قوى</span><span style={{...val,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{w.facility.qiwa_file_number||w.facility.qiwa_unified_number||'—'}</span></div>
{(w.facility.qiwa_file_number||w.facility.qiwa_unified_number)&&<button onClick={e=>{e.stopPropagation();const v=w.facility.qiwa_file_number||w.facility.qiwa_unified_number;navigator.clipboard?.writeText(v);toast&&toast(T('تم النسخ','Copied'))}} title="نسخ" style={{padding:3,background:'transparent',border:'none',cursor:'pointer',color:'var(--tx5)',display:'flex',alignItems:'center',borderRadius:4,transition:'.15s',flexShrink:0}} onMouseEnter={e=>{e.currentTarget.style.color=C.gold;e.currentTarget.style.background='rgba(212,160,23,.1)'}} onMouseLeave={e=>{e.currentTarget.style.color='var(--tx5)';e.currentTarget.style.background='transparent'}}><Copy size={11}/></button>}
</div>
<div style={pillBase}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.bentoGold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"/></svg>
<div style={{display:'flex',flexDirection:'column',gap:5,flex:1,minWidth:0}}><span style={lbl}>رقم التأمينات</span><span style={{...val,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{w.facility.gosi_file_number||'—'}</span></div>
{w.facility.gosi_file_number&&<button onClick={e=>{e.stopPropagation();navigator.clipboard?.writeText(w.facility.gosi_file_number);toast&&toast(T('تم النسخ','Copied'))}} title="نسخ" style={{padding:3,background:'transparent',border:'none',cursor:'pointer',color:'var(--tx5)',display:'flex',alignItems:'center',borderRadius:4,transition:'.15s',flexShrink:0}} onMouseEnter={e=>{e.currentTarget.style.color=C.gold;e.currentTarget.style.background='rgba(212,160,23,.1)'}} onMouseLeave={e=>{e.currentTarget.style.color='var(--tx5)';e.currentTarget.style.background='transparent'}}><Copy size={11}/></button>}
</div>
</div>
</div>}
</>})()}

</div>
:<div style={{padding:14,borderRadius:10,background:'rgba(212,160,23,.05)',border:'1px dashed rgba(212,160,23,.25)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
<div style={{fontSize:12,color:'var(--tx3)',fontWeight:600}}>لا يوجد عامل بهذا البحث</div>
<button onClick={()=>{setWorkerMode('new');setNewWorker(p=>({...p,name:/^[0-9+]+$/.test(workerQ)||/^\d{10}$/.test(workerQ)?p.name:workerQ,phone:/^[0-9+]+$/.test(workerQ)?workerQ:p.phone,iqama_number:/^\d{10}$/.test(workerQ)?workerQ:p.iqama_number}))}}
style={{height:34,padding:'0 14px',borderRadius:8,background:'rgba(212,160,23,.12)',border:'1px solid rgba(212,160,23,.35)',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
إضافة عامل جديد
</button>
</div>}
</div>}

{/* Mode: new worker form */}
{workerMode==='new'&&<div style={{borderRadius:12,border:'1.5px solid rgba(212,160,23,.22)',background:'rgba(212,160,23,.03)',padding:'14px 16px',display:'flex',flexDirection:'column',gap:12}}>
{/* Header: title + cancel */}
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
<div style={{fontSize:13,fontWeight:800,color:C.gold,fontFamily:F,display:'flex',alignItems:'center',gap:7}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="18" y1="2" x2="18" y2="8"/><line x1="21" y1="5" x2="15" y2="5"/></svg>
تسجيل عامل جديد
</div>
<button onClick={()=>{setWorkerMode('existing');setWorkerQ('');setNewWorker({name:'',phone:'',iqama_number:''})}} style={{height:26,padding:'0 10px',borderRadius:7,border:'1px solid rgba(192,57,43,.2)',background:'rgba(192,57,43,.08)',color:C.red,cursor:'pointer',fontSize:10.5,fontFamily:F,fontWeight:700}}>إلغاء</button>
</div>
{/* Fields */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<div style={{gridColumn:'1 / -1',display:'flex',flexDirection:'column',gap:5}}>
<span style={{fontSize:11,fontWeight:700,color:'var(--tx5)',fontFamily:F,paddingRight:2}}>الاسم <span style={{color:C.red}}>*</span></span>
<input value={newWorker.name} onChange={e=>{let v=e.target.value;const hasAr=/[\u0600-\u06FF]/.test(v),hasEn=/[A-Za-z]/.test(v);if(hasAr&&!hasEn)v=v.replace(/[^\u0600-\u06FF\s]/g,'');else if(hasEn&&!hasAr)v=v.replace(/[^A-Za-z\s]/g,'');else if(!hasAr&&!hasEn)v='';else v=newWorker.name;v=v.replace(/\s+/g,' ').split(' ').slice(0,3).join(' ');setNewWorker(p=>({...p,name:v}))}} placeholder="اسم العامل" style={{...fS,height:40,textAlign:'center'}}/>
</div>
<div style={{display:'flex',flexDirection:'column',gap:5}}>
<span style={{fontSize:11,fontWeight:700,color:'var(--tx5)',fontFamily:F,paddingRight:2}}>رقم الإقامة <span style={{color:C.red}}>*</span></span>
<input value={newWorker.iqama_number} onChange={e=>{const v=e.target.value.replace(/[^0-9]/g,'').slice(0,10);setNewWorker(p=>({...p,iqama_number:v}))}} placeholder="2XXXXXXXXX" inputMode="numeric" maxLength={10} style={{...fS,height:40,direction:'ltr',textAlign:'center'}}/>
</div>
<div style={{display:'flex',flexDirection:'column',gap:5}}>
<span style={{fontSize:11,fontWeight:700,color:'var(--tx5)',fontFamily:F,paddingRight:2}}>رقم الجوال <span style={{color:C.red}}>*</span></span>
<div style={{position:'relative',display:'flex',alignItems:'center'}}>
<span style={{position:'absolute',left:12,fontSize:12,fontWeight:700,color:C.bentoGold,fontFamily:F,pointerEvents:'none',direction:'ltr'}}>+966</span>
<input value={(()=>{const r=newWorker.phone;if(!r)return'';if(r.length<=2)return r;if(r.length<=5)return r.slice(0,2)+' '+r.slice(2);return r.slice(0,2)+' '+r.slice(2,5)+' '+r.slice(5)})()} onChange={e=>{const v=e.target.value.replace(/[^0-9]/g,'').slice(0,9);setNewWorker(p=>({...p,phone:v}))}} placeholder="5X XXX XXXX" inputMode="numeric" maxLength={12} style={{...fS,height:40,direction:'ltr',textAlign:'left',paddingLeft:54,paddingRight:14}}/>
</div>
</div>
</div>
</div>}

{/* ─── Merged Service Field (rendered at bottom of worker view when service has a single simple input) ─── */}
{hasMergedField&&(selWorker||(workerMode==='new'&&newWorker.name.trim()))&&(()=>{const inp=svcSingleField;const val=fields[inp.key]||'';return<div style={{marginTop:14,padding:'14px 16px',borderRadius:14,border:'1px solid rgba(212,160,23,.18)',background:'linear-gradient(135deg, rgba(212,160,23,.055), rgba(212,160,23,.02) 60%, rgba(212,160,23,.04))',boxShadow:'0 1px 0 rgba(255,255,255,.03) inset, 0 2px 8px rgba(0,0,0,.15), 0 0 0 1px rgba(212,160,23,.04)',display:'flex',flexDirection:'column',gap:10}}>
<label style={{fontSize:11,fontWeight:700,color:C.bentoGold,letterSpacing:'.2px',display:'flex',alignItems:'center',gap:6}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
{inp.label_ar} {inp.required&&<span style={{color:C.red}}>*</span>}
</label>
{inp.type==='select'?
<NiceSelect height={42} fontSize={13} value={val} placeholder="اختر..."
options={inp.source==='regions'?regions.map(r=>({value:r.id,label:r.name_ar})):inp.source==='countries'?lkCountries.map(c=>({value:c.nationality_ar,label:c.nationality_ar})):inp.source==='occupations'?lkOccupations.map(o=>({value:o.value_ar,label:o.value_ar})):(inp.options||[])}
onChange={v=>setFields(p=>({...p,[inp.key]:v}))}/>
:inp.type==='date'?
<input type="date" value={val} onChange={e=>setFields(p=>({...p,[inp.key]:e.target.value}))} style={{...fS,height:42,direction:'ltr',textAlign:'left'}}/>
:inp.type==='textarea'?
<textarea value={val} onChange={e=>setFields(p=>({...p,[inp.key]:e.target.value}))} placeholder={inp.placeholder||''} rows={3} style={{...fS,height:'auto',padding:'10px 14px',resize:'vertical'}}/>
:<input type={inp.type==='number'?'number':'text'} value={val} onChange={e=>setFields(p=>({...p,[inp.key]:e.target.value}))}
placeholder={inp.placeholder||''} style={{...fS,height:42,...(inp.direction==='ltr'?{direction:'ltr',textAlign:'left'}:{})}}/>
}
</div>})()}

</div>}
</div>}

{/* ═══ Step 3: Dynamic Fields ═══ */}
{step===3&&<div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column'}}>

{(()=>{
// ─── Visa services: custom inputs ───
if(VISA_SERVICES.has(selSvc)){
const totalVisas=visaGroups.reduce((s,g)=>s+(parseInt(g.count)||0),0)

// ─── Global file distribution sub-step (files can mix visas from different groups) ───
if(step3Mode==='files'){
const MAX_FILES=6 // hard cap to prevent scrolling
const fileCount=(f)=>Object.values(f.assignments||{}).reduce((s,n)=>s+(parseInt(n)||0),0)
const sumF=visaFiles.reduce((s,f)=>s+fileCount(f),0)
const remaining=totalVisas-sumF
const groupAssigned=(gid)=>visaFiles.reduce((s,f)=>s+(parseInt(f.assignments?.[gid])||0),0)
const groupRem=(gid)=>{const g=visaGroups.find(x=>x.id===gid);return(parseInt(g?.count)||0)-groupAssigned(gid)}
const incGroup=(fid,gid)=>{setForceCustomFiles(true);setVisaFiles(fs=>fs.map(f=>{
if(f.id!==fid)return f
if(fileCount(f)>=4)return f
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
.sr-pill{position:relative;display:inline-flex;align-items:center;gap:4px;padding:1px 7px;border-radius:4px;background:transparent;font-family:${F};font-size:9px;font-weight:800;transition:.2s;flex-shrink:0}
.sr-pill[data-tip]{cursor:help}
.sr-pill[data-tip]::after{content:attr(data-tip);position:absolute;top:calc(100% + 8px);right:-4px;background:var(--modal-bg);color:#D4A017;border:1px solid rgba(212,160,23,.35);padding:5px 11px;border-radius:7px;font-size:10.5px;font-weight:700;font-family:${F};white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .18s,transform .18s;transform:translateY(-4px);box-shadow:0 6px 18px rgba(0,0,0,.5);z-index:30;letter-spacing:0}
.sr-pill[data-tip]::before{content:'';position:absolute;top:calc(100% + 3px);right:8px;width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:5px solid rgba(212,160,23,.45);opacity:0;pointer-events:none;transition:opacity .18s,transform .18s;transform:translateY(-4px);z-index:30}
.sr-pill[data-tip]:hover::after,.sr-pill[data-tip]:hover::before{opacity:1;transform:translateY(0)}
.sr-pill.info{border:none;background:transparent;color:#b497e8;padding:1px 2px;font-size:12px;gap:5px}
.sr-pill.action{border:1.2px dashed rgba(212,160,23,.55);color:#D4A017;cursor:pointer}
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
<button type="button" onClick={()=>{setVisaDistMode('auto');setStep3Mode('groups');setErr('')}} className="sr-pill action" data-tip="العودة للتوزيع التلقائي">تلقائي</button>
{/* Add file button */}
{canAddMore&&<button type="button" onClick={addFile} className="sr-pill action" data-tip="إضافة ملف جديد">
<span>ملف</span>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
</button>}
</div>
{/* File cards — composition-aware, drop-target enabled */}
<div className="sr-modal-scroll" style={{flex:1,minHeight:0,overflowY:'auto',overflowX:'hidden',paddingLeft:2,scrollbarWidth:'none',msOverflowStyle:'none'}}>
<div style={{display:'grid',gridTemplateColumns:`repeat(auto-fill, minmax(${multiGroup?(activeFiles.length<=2?'230px':activeFiles.length<=4?'190px':'170px'):(activeFiles.length<=3?'150px':activeFiles.length<=6?'120px':'100px')}, 1fr))`,gap:10,alignItems:'stretch'}}>
{activeFiles.map((f,i)=>{
const c=fileCount(f)
const full=c>=4
// Drop-target state: is this file a valid destination for the current drag?
const isDragSource=!!dragInfo&&dragInfo.fileId===f.id
const isValidDrop=!!dragInfo&&dragInfo.fileId!==f.id&&!full
return<div key={f.id}
onDragOver={e=>{if(isValidDrop){e.preventDefault();e.dataTransfer.dropEffect='move'}}}
onDrop={e=>{if(!dragInfo||dragInfo.fileId===f.id)return;e.preventDefault();moveVisa(dragInfo.fileId,f.id,dragInfo.groupId);setDragInfo(null)}}
style={{position:'relative',display:'flex',flexDirection:'column',borderRadius:12,border:`1.5px ${isValidDrop?'dashed':'solid'} ${isValidDrop?'rgba(52,152,219,.6)':full?'rgba(46,160,67,.35)':c>0?'rgba(212,160,23,.25)':'rgba(255,255,255,.08)'}`,background:isValidDrop?'linear-gradient(135deg, rgba(52,152,219,.14), rgba(52,152,219,.04))':full?'linear-gradient(135deg, rgba(46,160,67,.08), rgba(46,160,67,.02))':c>0?'linear-gradient(135deg, rgba(212,160,23,.06), rgba(212,160,23,.02))':'rgba(255,255,255,.015)',overflow:'hidden',transition:'.2s',boxShadow:isValidDrop?'0 0 0 3px rgba(52,152,219,.15), 0 2px 12px rgba(52,152,219,.2)':full?'0 2px 8px rgba(46,160,67,.08)':'0 2px 8px rgba(0,0,0,.15)',opacity:isDragSource?.55:1}}>
{/* Delete button */}
{activeFiles.length>1&&<button type="button" onClick={()=>removeFile(f.id)} title="حذف"
style={{position:'absolute',top:6,left:6,width:20,height:20,borderRadius:5,border:'none',background:'rgba(192,57,43,.15)',color:C.red,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,zIndex:2,transition:'.15s'}}
onMouseEnter={e=>{e.currentTarget.style.background='rgba(192,57,43,.3)'}}
onMouseLeave={e=>{e.currentTarget.style.background='rgba(192,57,43,.15)'}}>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
</button>}
{/* File header: label + count/4 */}
<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'6px 8px 4px',borderBottom:'1px solid rgba(255,255,255,.05)',background:'rgba(255,255,255,.02)'}}>
<span style={{fontSize:10.5,fontWeight:800,color:full?'#2ea043':C.gold,fontFamily:F,letterSpacing:'.3px'}}>الملف {['الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر'][i]||(i+1)}</span>
<span style={{fontSize:9,fontWeight:700,color:'var(--tx5)'}}>•</span>
<span style={{fontSize:14,fontWeight:900,color:full?'#2ea043':c>0?C.gold:'var(--tx5)',fontFamily:F,lineHeight:1}}>{c}<span style={{fontSize:9.5,fontWeight:700,color:'var(--tx5)'}}>/4</span></span>
</div>
{multiGroup?(
// ── Multi-group: per-group rows with mini -/+ controls ──
<div style={{display:'flex',flexDirection:'column',gap:3,padding:'6px 6px 8px'}}>
{visaGroups.map((g,gi)=>{
const cnt=parseInt(f.assignments?.[g.id])||0
const natLbl=g.nationality?(lkCountries.find(co=>co.id===g.nationality)?.nationality_ar||`المجموعة ${gi+1}`):`المجموعة ${gi+1}`
const profLbl=g.profession?(lkOccupations.find(o=>o.id===g.profession)?.value_ar||''):''
const gR=groupRem(g.id)
const canInc=!full&&gR>0
const canDec=cnt>0
// Hide groups with no presence here AND no remaining to allocate
if(cnt===0&&gR<=0)return null
const isDraggingThis=!!dragInfo&&dragInfo.fileId===f.id&&dragInfo.groupId===g.id
return<div key={g.id}
draggable={cnt>0}
onDragStart={e=>{if(cnt<=0){e.preventDefault();return}setDragInfo({fileId:f.id,groupId:g.id});e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',`visa:${f.id}:${g.id}`)}catch(_){}}}
onDragEnd={()=>setDragInfo(null)}
title={cnt>0?'اسحب لنقل تأشيرة إلى ملف آخر':''}
style={{display:'flex',alignItems:'center',gap:5,fontFamily:F,padding:'3px 5px',borderRadius:6,background:isDraggingThis?'rgba(52,152,219,.15)':cnt>0?'rgba(212,160,23,.08)':'rgba(255,255,255,.015)',border:`1px solid ${isDraggingThis?'rgba(52,152,219,.5)':cnt>0?'rgba(212,160,23,.18)':'rgba(255,255,255,.04)'}`,transition:'.15s',cursor:cnt>0?'grab':'default',opacity:isDraggingThis?.6:1}}>
<button type="button" onClick={()=>decGroup(f.id,g.id)} disabled={!canDec} title="إنقاص"
style={{width:20,height:20,borderRadius:5,border:'none',background:canDec?'rgba(192,57,43,.12)':'transparent',color:canDec?C.red:'var(--tx6)',cursor:canDec?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',padding:0,fontSize:13,fontWeight:800,transition:'.15s',flexShrink:0}}
onMouseEnter={e=>{if(canDec)e.currentTarget.style.background='rgba(192,57,43,.22)'}}
onMouseLeave={e=>{if(canDec)e.currentTarget.style.background='rgba(192,57,43,.12)'}}>−</button>
<span style={{fontSize:12,fontWeight:900,color:cnt>0?C.gold:'var(--tx5)',minWidth:12,textAlign:'center',flexShrink:0}}>{cnt}</span>
<span style={{fontSize:10,fontWeight:700,color:cnt>0?'var(--tx2)':'var(--tx4)',flex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',minWidth:0}} title={profLbl?`${natLbl} · ${profLbl}`:natLbl}>{natLbl}{profLbl&&<span style={{fontSize:9,fontWeight:500,color:'var(--tx5)',marginRight:4}}> · {profLbl}</span>}</span>
<button type="button" onClick={()=>incGroup(f.id,g.id)} disabled={!canInc} title="إضافة"
style={{width:20,height:20,borderRadius:5,border:'none',background:canInc?'rgba(46,160,67,.12)':'transparent',color:canInc?'#2ea043':'var(--tx6)',cursor:canInc?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',padding:0,fontSize:13,fontWeight:800,transition:'.15s',flexShrink:0}}
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
<div style={{display:'flex',justifyContent:'center',gap:4,padding:'10px 0 8px'}}>
{[1,2,3,4].map(n=>{const filled=n<=c;const gid=visaGroups[0]?.id;return<button key={n} type="button" onClick={()=>{if(!gid)return;setVisaFiles(fs=>fs.map(ff=>ff.id===f.id?{...ff,assignments:{[gid]:n}}:ff));setForceCustomFiles(true)}}
style={{width:9,height:9,borderRadius:'50%',border:'none',background:filled?(full?'#2ea043':C.gold):'rgba(255,255,255,.12)',cursor:'pointer',padding:0,transition:'.15s',boxShadow:filled?`0 0 4px ${full?'rgba(46,160,67,.5)':'rgba(212,160,23,.5)'}`:'none'}} title={`اضبط على ${n}`}/>})}
</div>
<div style={{display:'flex',borderTop:'1px solid rgba(255,255,255,.05)',marginTop:'auto'}}>
<button type="button" onClick={()=>{const gid=visaGroups[0]?.id;if(gid)decGroup(f.id,gid)}} disabled={c<=1}
style={{flex:1,height:28,border:'none',background:'transparent',color:'var(--tx3)',fontSize:16,fontWeight:700,cursor:c<=1?'not-allowed':'pointer',opacity:c<=1?.25:1,fontFamily:F,padding:0,display:'flex',alignItems:'center',justifyContent:'center',transition:'.15s'}}
onMouseEnter={e=>{if(c>1)e.currentTarget.style.background='rgba(192,57,43,.08)'}}
onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>−</button>
<div style={{width:1,background:'rgba(255,255,255,.05)'}}/>
<button type="button" onClick={()=>{const gid=visaGroups[0]?.id;if(gid)incGroup(f.id,gid)}} disabled={c>=4}
style={{flex:1,height:28,border:'none',background:'transparent',color:'var(--tx3)',fontSize:16,fontWeight:700,cursor:c>=4?'not-allowed':'pointer',opacity:c>=4?.25:1,fontFamily:F,padding:0,display:'flex',alignItems:'center',justifyContent:'center',transition:'.15s'}}
onMouseEnter={e=>{if(c<4)e.currentTarget.style.background='rgba(46,160,67,.08)'}}
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
<span style={{fontSize:18,fontWeight:900,color:C.gold,lineHeight:1,letterSpacing:'-.5px'}}>{totalVisas}</span>
<span style={{fontSize:11,fontWeight:700,color:'var(--tx4)'}}>{totalVisas===1?'تأشيرة':'تأشيرة'}</span>
</div>
{visaGroups.length<4&&<button type="button" onClick={addGroup} title="إضافة مجموعة جديدة"
style={{height:24,borderRadius:7,border:'1.5px dashed rgba(212,160,23,.4)',background:'rgba(212,160,23,.05)',color:C.gold,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',transition:'.2s',padding:'0 9px',gap:5,fontFamily:F,fontSize:10.5,fontWeight:800}}>
<span>مجموعة</span>
<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
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
<span style={{fontSize:12.5,fontWeight:800,whiteSpace:'nowrap'}}>المجموعة {['الأولى','الثانية','الثالثة','الرابعة'][i]||(i+1)}</span>
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
return<div key={g.id} style={{border:'1.5px solid rgba(212,160,23,.35)',borderRadius:12,padding:`18px 14px 12px`,marginTop:visaGroups.length>1?14:0,position:'relative',display:'flex',flexDirection:'column',gap:GAP,width:'100%',maxWidth:'100%',boxSizing:'border-box',transition:'all .25s ease'}}>
<div style={{position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F}}>المجموعة {['الأولى','الثانية','الثالثة','الرابعة'][idx]||(idx+1)}</div>
{visaGroups.length>1&&<button type="button" onClick={()=>removeGroup(g.id)} title="حذف"
style={{position:'absolute',top:-11,left:14,height:22,padding:'0 10px',borderRadius:6,border:'1px solid rgba(192,57,43,.3)',background:'var(--modal-bg)',color:C.red,cursor:'pointer',fontSize:10,fontFamily:F,fontWeight:700,display:'inline-flex',alignItems:'center',gap:4}}>
<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
<span>حذف</span>
</button>}
{/* Row 1: nationality + embassy */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:solo?12:8,flexShrink:0}}>
<div style={{display:'flex',flexDirection:'column',gap:LGAP}}>
{solo&&<span style={{fontSize:LFS,fontWeight:700,color:'rgba(255,255,255,.58)',fontFamily:F,paddingRight:2}}>الجنسية <span style={{color:C.red}}>*</span></span>}
<NiceSelect height={H} fontSize={FS} value={g.nationality} placeholder={solo?'اختر الجنسية...':'الجنسية *'}
options={lkCountries.map(co=>({value:co.id,label:co.nationality_ar}))}
onChange={v=>updateGroup(g.id,{nationality:v,embassy:''})}/>
</div>
<div style={{display:'flex',flexDirection:'column',gap:LGAP}}>
{solo&&<span style={{fontSize:LFS,fontWeight:700,color:'rgba(255,255,255,.58)',fontFamily:F,paddingRight:2}}>السفارة <span style={{color:C.red}}>*</span></span>}
<NiceSelect height={H} fontSize={FS} value={g.embassy} disabled={!g.nationality}
placeholder={!g.nationality?(solo?'اختر الجنسية أولاً':'السفارة (اختر الجنسية أولاً)'):(filteredEm.length?(solo?'اختر المدينة...':'السفارة *'):'لا توجد')}
emptyText="لا توجد سفارة"
options={filteredEm.map(em=>({value:em.id,label:em.city_ar}))}
onChange={v=>updateGroup(g.id,{embassy:v})}/>
</div>
</div>
{/* Row 2: profession (full width) */}
<div style={{display:'flex',flexDirection:'column',gap:LGAP,flexShrink:0}}>
{solo&&<span style={{fontSize:LFS,fontWeight:700,color:'rgba(255,255,255,.58)',fontFamily:F,paddingRight:2}}>المهنة <span style={{color:C.red}}>*</span></span>}
<NiceSelect height={H} fontSize={FS} value={g.profession} placeholder={solo?'اختر المهنة...':'المهنة *'}
options={lkOccupations.map(o=>({value:o.id,label:o.value_ar}))}
onChange={v=>updateGroup(g.id,{profession:v})}/>
</div>
{/* Row 3: gender + count */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:solo?12:8,minWidth:0,flexShrink:0}}>
<div style={{display:'flex',flexDirection:'column',gap:LGAP,minWidth:0}}>
{solo&&<span style={{fontSize:LFS,fontWeight:700,color:'rgba(255,255,255,.58)',fontFamily:F,paddingRight:2}}>الجنس <span style={{color:C.red}}>*</span></span>}
<div style={{display:'flex',gap:solo?6:4,height:H,padding:solo?4:3,borderRadius:solo?10:9,background:'var(--modal-input-bg)',border:'1px solid rgba(255,255,255,.05)',minWidth:0}}>
{(lkGenders.length?lkGenders:[{id:'male',value_ar:'ذكر',code:'male'},{id:'female',value_ar:'أنثى',code:'female'}]).map(gg=>{
const key=gg.code||gg.id
const sel=g.gender===key
const isMale=key==='male'
return<button key={gg.id} type="button" onClick={()=>updateGroup(g.id,{gender:key})}
style={{flex:1,minWidth:0,borderRadius:solo?8:7,border:'none',background:sel?(isMale?'linear-gradient(135deg, rgba(52,131,180,.25), rgba(52,131,180,.12))':'linear-gradient(135deg, rgba(224,120,168,.25), rgba(224,120,168,.1))'):'transparent',color:sel?(isMale?'#5ca8d4':'#e78ac0'):'rgba(255,255,255,.5)',fontFamily:F,fontSize:solo?13:12,fontWeight:800,cursor:'pointer',transition:'.2s',display:'flex',alignItems:'center',justifyContent:'center',gap:solo?7:5,boxShadow:sel?'inset 0 1px 0 rgba(255,255,255,.08), 0 1px 4px rgba(0,0,0,.2)':'none'}}>
{isMale?<svg width={solo?14:12} height={solo?14:12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="14" r="5"/><path d="M19 5l-5.4 5.4M14 5h5v5"/></svg>
:<svg width={solo?14:12} height={solo?14:12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="5"/><path d="M12 14v8M9 19h6"/></svg>}
{gg.value_ar}
</button>
})}
</div>
</div>
<div style={{display:'flex',flexDirection:'column',gap:LGAP,minWidth:0}}>
{solo&&<span style={{fontSize:LFS,fontWeight:700,color:'rgba(255,255,255,.58)',fontFamily:F,paddingRight:2}}>عدد التأشيرات <span style={{color:C.red}}>*</span></span>}
<div style={{display:'flex',alignItems:'center',height:H,borderRadius:solo?10:9,background:'var(--modal-input-bg)',border:'1px solid rgba(255,255,255,.05)',padding:solo?4:3,gap:solo?5:3,minWidth:0}}>
<button type="button" onClick={()=>{const n=Math.max(1,(parseInt(g.count)||1)-1);updateGroup(g.id,{count:String(n)})}}
style={{width:BTN_W,height:'100%',borderRadius:solo?8:7,border:'none',background:'rgba(255,255,255,.05)',color:'var(--tx2)',fontSize:solo?18:16,fontWeight:700,cursor:'pointer',fontFamily:F,padding:0,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',transition:'.15s'}}
onMouseEnter={e=>{e.currentTarget.style.background='rgba(212,160,23,.15)';e.currentTarget.style.color=C.gold}}
onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.05)';e.currentTarget.style.color='var(--tx2)'}}>−</button>
<input type="number" min="1" max="200" value={g.count}
onChange={e=>updateGroup(g.id,{count:e.target.value.replace(/[^0-9]/g,'')})}
className="sr-no-spin" style={{flex:1,minWidth:0,height:'100%',borderRadius:0,border:'none',background:'transparent',color:C.gold,fontFamily:F,fontSize:CNT_FS,fontWeight:900,outline:'none',textAlign:'center',padding:0,boxSizing:'border-box'}}/>
<button type="button" onClick={()=>{const n=Math.min(200,(parseInt(g.count)||0)+1);updateGroup(g.id,{count:String(n)})}}
style={{width:BTN_W,height:'100%',borderRadius:solo?8:7,border:'none',background:'rgba(255,255,255,.05)',color:'var(--tx2)',fontSize:solo?18:16,fontWeight:700,cursor:'pointer',fontFamily:F,padding:0,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',transition:'.15s'}}
onMouseEnter={e=>{e.currentTarget.style.background='rgba(212,160,23,.15)';e.currentTarget.style.color=C.gold}}
onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.05)';e.currentTarget.style.color='var(--tx2)'}}>+</button>
</div>
</div>
</div>
</div>
})()}
</>
})()}

{/* Distribution mode — single checkbox: unchecking navigates to files customization view */}
<label onClick={()=>{
const newMode=visaDistMode==='auto'?'custom':'auto'
setVisaDistMode(newMode)
if(newMode==='custom'){
// Seed files and jump into customization view
const totalV=visaGroups.reduce((s,g)=>s+(parseInt(g.count)||0),0)
if(totalV>0){
const minFiles=Math.max(1,Math.ceil(totalV/4))
const sizes=[];let r=totalV;for(let i=0;i<minFiles;i++){const c=Math.min(4,r);sizes.push(c);r-=c}
const q=visaGroups.map(g=>({id:g.id,rem:parseInt(g.count)||0}))
const files=sizes.map((sz,i)=>{const a={};let need=sz;while(need>0){const gg=q.find(x=>x.rem>0);if(!gg)break;const t=Math.min(gg.rem,need);a[gg.id]=(a[gg.id]||0)+t;gg.rem-=t;need-=t}return{id:i+1,assignments:a}})
const sumExisting=visaFiles.reduce((s,f)=>s+Object.values(f.assignments||{}).reduce((ss,n)=>ss+(parseInt(n)||0),0),0)
if(visaFiles.length===0||sumExisting!==totalV){setVisaFiles(files);setForceCustomFiles(false)}
}
setStep3Mode('files');setErr('')
}
}}
style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',flexShrink:0,fontFamily:F,userSelect:'none',padding:'8px 12px',borderRadius:9,background:'var(--modal-input-bg)',border:'1px solid rgba(255,255,255,.05)',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)',transition:'.15s'}}>
<div style={{width:14,height:14,borderRadius:4,border:`1.5px solid ${visaDistMode==='auto'?C.gold:'rgba(255,255,255,.25)'}`,background:visaDistMode==='auto'?C.gold:'transparent',display:'flex',alignItems:'center',justifyContent:'center',transition:'.15s',flexShrink:0}}>
{visaDistMode==='auto'&&<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
</div>
<span style={{fontSize:11,fontWeight:700,color:visaDistMode==='auto'?C.gold:'var(--tx4)'}}>توزيع تلقائي — 4 تأشيرات كحد أقصى في كل ملف{visaDistMode==='custom'?' (اضغط للعودة)':''}</span>
</label>
</div>
}

// ─── Chamber certification: two sub-types ───
if(selSvc==='chamber_certification'){
const subtype=fields.chamber_subtype||''
const setSubtype=(v)=>setFields(p=>({...p,chamber_subtype:v}))
const cardOpts=[
{id:'printed',label:'تصديق على مطبوعات المنشأة',Icon:Paperclip,desc:'يرفق ملف المطبوعات للتصديق'},
{id:'open_request',label:'التصديق على طلب مفتوح',Icon:FileText,desc:'يكتب نص الطلب للتصديق'}
]
const legend={position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:5}
const fieldset={borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',padding:'16px 12px 12px',position:'relative',display:'flex',flexDirection:'column',gap:10}
return<div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column',gap:10,marginTop:10}}>

{/* ═══ Fieldset 1: نوع التصديق ═══ */}
<div style={{...fieldset,flexShrink:0}}>
<div style={legend}>
<FileCheck size={12} strokeWidth={2.2}/>
<span>نوع التصديق <span style={{color:C.red}}>*</span></span>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
{cardOpts.map(o=>{
const sel=subtype===o.id
return<button key={o.id} type="button" onClick={()=>setSubtype(o.id)}
style={{textAlign:'right',padding:'12px 14px',borderRadius:12,border:`1px solid ${sel?'rgba(212,160,23,.5)':'rgba(255,255,255,.06)'}`,background:sel?'rgba(212,160,23,.12)':'rgba(255,255,255,.03)',color:'var(--tx)',fontFamily:F,cursor:'pointer',transition:'all .2s',display:'flex',alignItems:'center',gap:10}}
onMouseEnter={e=>{if(!sel){e.currentTarget.style.background='rgba(212,160,23,.07)';e.currentTarget.style.borderColor='rgba(212,160,23,.2)'}}}
onMouseLeave={e=>{if(!sel){e.currentTarget.style.background='rgba(255,255,255,.03)';e.currentTarget.style.borderColor='rgba(255,255,255,.06)'}}}>
<div style={{width:40,height:40,borderRadius:10,background:'rgba(212,160,23,.08)',display:'flex',alignItems:'center',justifyContent:'center',color:C.bentoGold,flexShrink:0,transition:'.2s'}}>
<o.Icon size={20} strokeWidth={1.5}/>
</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:13,fontWeight:500,color:'rgba(255,255,255,.85)',marginBottom:2,lineHeight:1.3}}>{o.label}</div>
<div style={{fontSize:10,color:'rgba(255,255,255,.45)'}}>{o.desc}</div>
</div>
</button>
})}
</div>
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
<div style={{fontSize:13,fontWeight:800,marginBottom:3,wordBreak:'break-all'}}>{fields.chamber_file.name}</div>
<div style={{fontSize:10.5,color:'var(--tx5)'}}>{(fields.chamber_file.size/1024).toFixed(1)} KB · اضغط لتغيير الملف</div>
</div>
<button type="button" onClick={(e)=>{e.preventDefault();e.stopPropagation();setFields(p=>({...p,chamber_file:null}))}}
style={{position:'absolute',top:8,left:8,width:26,height:26,borderRadius:7,border:'1px solid rgba(192,57,43,.3)',background:'rgba(192,57,43,.12)',color:C.red,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700}}>×</button>
</>:<>
<div style={{width:52,height:52,borderRadius:12,background:'rgba(212,160,23,.1)',display:'flex',alignItems:'center',justifyContent:'center'}}>
<Upload size={22}/>
</div>
<div style={{textAlign:'center'}}>
<div style={{fontSize:13,fontWeight:800,marginBottom:4}}>اضغط لرفع الملف</div>
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
const fmtDay=(iso)=>{if(!iso)return'—';const d=new Date(iso);if(isNaN(d))return'—';return`${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`}
const hijri=(iso)=>{if(!iso)return'';try{const d=new Date(iso);if(isNaN(d))return'';const parts=new Intl.DateTimeFormat('en-SA-u-ca-islamic-umalqura',{day:'numeric',month:'numeric',year:'numeric'}).formatToParts(d);const dd=parts.find(p=>p.type==='day')?.value||'';const mm=parts.find(p=>p.type==='month')?.value||'';const yy=parts.find(p=>p.type==='year')?.value||'';return `${yy}/${mm}/${dd}`}catch{return''}}
const changeProf=fields.change_profession===true
const roBox={height:42,padding:'0 14px',borderRadius:9,border:'1px solid rgba(255,255,255,.05)',background:'var(--modal-input-bg)',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}
const hijPill={fontSize:9.5,fontWeight:700,fontFamily:F,padding:'2px 6px',borderRadius:5}
return<div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column',gap:14,marginTop:11}}>

{/* ─── Change profession fieldset (first) ─── */}
<div style={{borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',padding:'14px 12px 12px',position:'relative',flexShrink:0,display:'flex',flexDirection:'column',gap:8}}>
<div style={{position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:5}}>
<UserCog size={12} strokeWidth={2.2}/>
<span>تغيير المهنة</span>
</div>
{/* Yes/No buttons — first */}
<div style={{display:'flex',gap:8,flexShrink:0,marginTop:6}}>
{[{v:false,l:'لا',c:C.red,icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>},
{v:true,l:'نعم',c:C.ok,icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}].map(o=>{
const sel=fields.change_profession===o.v
return<div key={String(o.v)} onClick={()=>setFields(p=>({...p,change_profession:o.v,...(o.v===false?{new_occupation:''}:{})}))}
style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,height:36,borderRadius:9,border:`1.5px solid ${sel?`${o.c}80`:'rgba(255,255,255,.07)'}`,background:sel?`linear-gradient(180deg,${o.c}25 0%,${o.c}0d 100%)`:'linear-gradient(180deg,#2C2C2C 0%,#222 100%)',boxShadow:sel?`inset 0 1px 0 ${o.c}38`:'0 2px 6px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.04)',cursor:'pointer',transition:'.18s',color:sel?o.c:'var(--tx3)'}}>
<span style={{fontSize:14,fontWeight:sel?700:500,fontFamily:F}}>{o.l}</span>
{o.icon}
</div>
})}
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,alignItems:'end'}}>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>المهنة الحالية</label>
<div style={{...roBox,justifyContent:'flex-start'}}>
<Briefcase size={12} color={C.gold} strokeWidth={1.8}/>
<span style={{fontSize:13,fontWeight:700,color:currentProf?'var(--tx)':'var(--tx5)',fontFamily:F,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{currentProf||'—'}</span>
</div>
</div>
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
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>تاريخ انتهاء الإقامة الحالي</label>
<div style={roBox}>
<span style={{fontSize:13,fontWeight:700,color:currentExpiry?'var(--tx)':'var(--tx5)',fontFamily:F,direction:'ltr'}}>{fmtDay(currentExpiry)}</span>
{currentExpiry&&<span style={{...hijPill,color:C.gold,background:'rgba(212,160,23,.08)',border:'1px solid rgba(212,160,23,.2)'}}><bdi>{hijri(currentExpiry)}</bdi> هـ</span>}
</div>
</div>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>عدد أشهر التجديد <span style={{color:C.red}}>*</span></label>
<input type="text" inputMode="numeric" value={fields.renewal_months||''} onChange={e=>{const raw=e.target.value.replace(/[^0-9]/g,'');setFields(p=>({...p,renewal_months:raw}))}} placeholder="أدخل عدد الأشهر" style={{...fS,direction:'ltr',textAlign:'center'}}/>
</div>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>تاريخ انتهاء الإقامة المتوقع</label>
<div style={{...roBox,borderColor:expectedExpiry?'rgba(46,160,67,.3)':'rgba(255,255,255,.08)',background:expectedExpiry?'rgba(46,160,67,.06)':'rgba(0,0,0,.2)'}}>
<span style={{fontSize:13,fontWeight:800,color:expectedExpiry?'#4cd075':'var(--tx5)',fontFamily:F,direction:'ltr'}}>{fmtDay(expectedExpiry)}</span>
{expectedExpiry&&<span style={{...hijPill,color:'#4cd075',background:'rgba(46,160,67,.08)',border:'1px solid rgba(46,160,67,.2)'}}><bdi>{hijri(expectedExpiry)}</bdi> هـ</span>}
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
const fmtDay=(iso)=>{if(!iso)return'—';const d=new Date(iso);if(isNaN(d))return'—';return`${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`}
const cityOptions=cities.filter(c=>!fields.region||c.region_id===fields.region).map(c=>({value:c.id,label:c.name_ar}))
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
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>منشأة العامل</label>
<div style={{...roBox,justifyContent:'flex-start'}}>
<Building2 size={12} color={C.gold} strokeWidth={1.8}/>
<span style={{fontSize:13,fontWeight:700,color:'var(--tx)',fontFamily:F,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{origFacility}</span>
</div>
</div>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>رقم قوى</label>
<div style={{...roBox,justifyContent:'space-between',paddingInlineEnd:5}}>
<div style={{display:'flex',alignItems:'center',gap:6,flex:1,justifyContent:'center'}}>
<Hash size={12} color={C.gold} strokeWidth={1.8}/>
<span style={{fontSize:13,fontWeight:700,color:origQiwa?'var(--tx)':'var(--tx5)',fontFamily:F,direction:'ltr'}}>{origQiwa||'—'}</span>
</div>
{origQiwa&&<button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(origQiwa);setCopiedQiwa(true);setTimeout(()=>setCopiedQiwa(false),1500)}catch{}}} title={copiedQiwa?'تم النسخ':'نسخ'} style={{width:26,height:26,borderRadius:6,border:`1px solid ${copiedQiwa?'rgba(39,160,70,.45)':'rgba(212,160,23,.3)'}`,background:copiedQiwa?'rgba(39,160,70,.12)':'rgba(212,160,23,.08)',color:copiedQiwa?'#27a046':C.gold,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',transition:'.15s',flexShrink:0}}>
{copiedQiwa?<Check size={13} strokeWidth={2.4}/>:<Copy size={12} strokeWidth={2}/>}
</button>}
</div>
</div>
</div>}
{origFacility&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<span>النطاق الأسبوعي</span>
{weekDate&&<span style={{fontSize:9.5,fontWeight:600,color:'var(--tx5)',fontFamily:F,direction:'ltr'}}>{fmtDay(weekDate)}</span>}
</label>
<div style={{...roBox,justifyContent:'center',gap:8,borderColor:ncColor?`${ncColor}55`:'rgba(255,255,255,.08)',background:ncColor?`${ncColor}14`:'rgba(0,0,0,.18)'}}>
{ncColor?<>
<Circle size={10} fill={ncColor} stroke="none"/>
<span style={{fontSize:13,fontWeight:800,color:ncColor,fontFamily:F}}>{ncLabel||'نطاق'}</span>
</>:<>
<Circle size={10} color="var(--tx5)" strokeWidth={2}/>
<span style={{fontSize:12,fontWeight:600,color:'var(--tx5)',fontFamily:F}}>لا توجد بيانات</span>
</>}
</div>
</div>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<span>حماية الأجور</span>
{weekDate&&<span style={{fontSize:9.5,fontWeight:600,color:'var(--tx5)',fontFamily:F,direction:'ltr'}}>{fmtDay(weekDate)}</span>}
</label>
<div style={{...roBox,justifyContent:'center',gap:8,borderColor:wpsHasNotes===true?'rgba(192,57,43,.5)':wpsHasNotes===false?'rgba(39,160,70,.4)':'rgba(255,255,255,.08)',background:wpsHasNotes===true?'rgba(192,57,43,.1)':wpsHasNotes===false?'rgba(39,160,70,.08)':'rgba(0,0,0,.18)'}}>
{wpsHasNotes===true?<>
<AlertCircle size={13} color="#c0392b" strokeWidth={2.2}/>
<span style={{fontSize:13,fontWeight:800,color:'#c0392b',fontFamily:F}}>توجد ملاحظة</span>
</>:wpsHasNotes===false?<>
<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#27a046" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
<span style={{fontSize:13,fontWeight:800,color:'#27a046',fontFamily:F}}>نظيف</span>
</>:<>
<Circle size={10} color="var(--tx5)" strokeWidth={2}/>
<span style={{fontSize:12,fontWeight:600,color:'var(--tx5)',fontFamily:F}}>لا توجد بيانات</span>
</>}
</div>
</div>
</div>}
</div>

{/* ═══ Fieldset 2: بيانات عقد أجير ═══ */}
<div style={fieldset}>
<div style={legend}>
<FileCheck size={12} strokeWidth={2.2}/>
<span>بيانات عقد أجير</span>
</div>
<div style={{display:'grid',gridTemplateColumns:'1.3fr 1fr',gap:10}}>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>الرقم الموحد للمنشأة المستعارة <span style={{color:C.red}}>*</span></label>
<input type="text" inputMode="numeric" value={fields.borrower_700||''} onChange={e=>{const raw=e.target.value.replace(/[^0-9]/g,'').slice(0,11);setFields(p=>({...p,borrower_700:raw}))}} placeholder="7XX XXX XXXX" style={{...inS,direction:'ltr',textAlign:'center',letterSpacing:'.5px'}}/>
</div>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>المنطقة <span style={{color:C.red}}>*</span></label>
<NiceSelect compact height={inH} fontSize={13} value={fields.region||''} placeholder="اختر المنطقة..."
options={regions.map(r=>({value:r.id,label:r.name_ar}))}
onChange={v=>setFields(p=>({...p,region:v,city:''}))}/>
</div>
</div>
<div style={{display:'grid',gridTemplateColumns:'1.3fr 1fr',gap:10}}>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>المدينة <span style={{color:C.red}}>*</span></label>
<NiceSelect compact height={inH} fontSize={13} value={fields.city||''} placeholder={fields.region?'اختر المدينة...':'اختر المنطقة أولاً'}
options={cityOptions}
onChange={v=>setFields(p=>({...p,city:v}))}/>
</div>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>مدة العقد (أشهر) <span style={{color:C.red}}>*</span></label>
<input type="text" inputMode="numeric" value={fields.contract_months||''} onChange={e=>{const raw=e.target.value.replace(/[^0-9]/g,'').slice(0,3);setFields(p=>({...p,contract_months:raw}))}} placeholder="أدخل عدد الأشهر" style={{...inS,direction:'ltr',textAlign:'center'}}/>
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
const fmtDay=(iso)=>{if(!iso)return'—';const d=new Date(iso);if(isNaN(d))return'—';return`${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`}
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
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>منشأة العامل</label>
<div style={{...roBox,justifyContent:'flex-start'}}>
<Building2 size={12} color={C.gold} strokeWidth={1.8}/>
<span style={{fontSize:13,fontWeight:700,color:'var(--tx)',fontFamily:F,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{origFacility}</span>
</div>
</div>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>الرقم الموحد</label>
<div style={{...roBox,justifyContent:'space-between',paddingInlineEnd:5}}>
<div style={{display:'flex',alignItems:'center',gap:6,flex:1,justifyContent:'center'}}>
<Hash size={12} color={C.gold} strokeWidth={1.8}/>
<span style={{fontSize:13,fontWeight:700,color:origUnified?'var(--tx)':'var(--tx5)',fontFamily:F,direction:'ltr'}}>{origUnified||'—'}</span>
</div>
{origUnified&&<button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(origUnified);setCopiedUnified(true);setTimeout(()=>setCopiedUnified(false),1500)}catch{}}} title={copiedUnified?'تم النسخ':'نسخ'} style={{width:26,height:26,borderRadius:6,border:`1px solid ${copiedUnified?'rgba(39,160,70,.45)':'rgba(212,160,23,.3)'}`,background:copiedUnified?'rgba(39,160,70,.12)':'rgba(212,160,23,.08)',color:copiedUnified?'#27a046':C.gold,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',transition:'.15s',flexShrink:0}}>
{copiedUnified?<Check size={13} strokeWidth={2.4}/>:<Copy size={12} strokeWidth={2}/>}
</button>}
</div>
</div>
</div>}
</div>

{/* ═══ Fieldset 2: بيانات تأمين العامل ═══ */}
<div style={fieldset}>
<div style={legend}>
<ShieldCheck size={12} strokeWidth={2.2}/>
<span>بيانات تأمين العامل</span>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>وضع التأمين الحالي</label>
<div style={{...roBox,justifyContent:'center',gap:8,borderColor:latestIns?`${insStatColor}55`:'rgba(255,255,255,.08)',background:latestIns?`${insStatColor}14`:'rgba(0,0,0,.18)'}}>
<ShieldCheck size={13} color={latestIns?insStatColor:'var(--tx5)'} strokeWidth={1.8}/>
<span style={{fontSize:13,fontWeight:800,color:latestIns?insStatColor:'var(--tx5)',fontFamily:F}}>{insStatLabel}</span>
</div>
</div>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>تاريخ انتهاء التأمين</label>
<div style={{...roBox,justifyContent:'center',gap:8}}>
<Calendar size={13} color={insEnd?insStatColor:'var(--tx5)'} strokeWidth={1.8}/>
<span style={{fontSize:13,fontWeight:700,color:insEnd?insStatColor:'var(--tx5)',fontFamily:F,direction:'ltr'}}>{fmtDay(insEnd)}</span>
</div>
</div>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>تاريخ الميلاد</label>
<div style={{...roBox,justifyContent:'center',gap:8}}>
<Calendar size={13} color={C.gold} strokeWidth={1.8}/>
<span style={{fontSize:13,fontWeight:700,color:dob?'var(--tx)':'var(--tx5)',fontFamily:F,direction:'ltr'}}>{fmtDay(dob)}</span>
</div>
</div>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>عمر العامل</label>
<div style={{...roBox,justifyContent:'center',gap:8}}>
<User size={13} color={C.gold} strokeWidth={1.8}/>
<span style={{fontSize:13,fontWeight:700,color:age!==null?'var(--tx)':'var(--tx5)',fontFamily:F}}>{age!==null?`${age} سنة`:'—'}</span>
</div>
</div>
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
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>منشأة العامل</label>
<div style={{...roBox,justifyContent:'flex-start'}}>
<Building2 size={12} color={C.gold} strokeWidth={1.8}/>
<span style={{fontSize:13,fontWeight:700,color:'var(--tx)',fontFamily:F,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{origFacility}</span>
</div>
</div>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>الرقم الموحد</label>
<div style={{...roBox,justifyContent:'space-between',paddingInlineEnd:5}}>
<div style={{display:'flex',alignItems:'center',gap:6,flex:1,justifyContent:'center'}}>
<Hash size={12} color={C.gold} strokeWidth={1.8}/>
<span style={{fontSize:13,fontWeight:700,color:origUnified?'var(--tx)':'var(--tx5)',fontFamily:F,direction:'ltr'}}>{origUnified||'—'}</span>
</div>
{origUnified&&<button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(origUnified);setCopiedUnified(true);setTimeout(()=>setCopiedUnified(false),1500)}catch{}}} title={copiedUnified?'تم النسخ':'نسخ'} style={{width:26,height:26,borderRadius:6,border:`1px solid ${copiedUnified?'rgba(39,160,70,.45)':'rgba(212,160,23,.3)'}`,background:copiedUnified?'rgba(39,160,70,.12)':'rgba(212,160,23,.08)',color:copiedUnified?'#27a046':C.gold,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',transition:'.15s',flexShrink:0}}>
{copiedUnified?<Check size={13} strokeWidth={2.4}/>:<Copy size={12} strokeWidth={2}/>}
</button>}
</div>
</div>
</div>}
<div style={{display:'grid',gridTemplateColumns:'1fr 1.3fr',gap:10}}>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>رقم قوى</label>
<div style={{...roBox,justifyContent:'space-between',paddingInlineEnd:5}}>
<div style={{display:'flex',alignItems:'center',gap:6,flex:1,justifyContent:'center'}}>
<Hash size={12} color={C.gold} strokeWidth={1.8}/>
<span style={{fontSize:13,fontWeight:700,color:origQiwa?'var(--tx)':'var(--tx5)',fontFamily:F,direction:'ltr'}}>{origQiwa||'—'}</span>
</div>
{origQiwa&&<button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(origQiwa);setCopiedQiwa(true);setTimeout(()=>setCopiedQiwa(false),1500)}catch{}}} title={copiedQiwa?'تم النسخ':'نسخ'} style={{width:26,height:26,borderRadius:6,border:`1px solid ${copiedQiwa?'rgba(39,160,70,.45)':'rgba(212,160,23,.3)'}`,background:copiedQiwa?'rgba(39,160,70,.12)':'rgba(212,160,23,.08)',color:copiedQiwa?'#27a046':C.gold,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',transition:'.15s',flexShrink:0}}>
{copiedQiwa?<Check size={13} strokeWidth={2.4}/>:<Copy size={12} strokeWidth={2}/>}
</button>}
</div>
</div>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>المهنة الحالية</label>
<div style={{...roBox,justifyContent:'flex-start'}}>
<Briefcase size={12} color={C.gold} strokeWidth={1.8}/>
<span style={{fontSize:13,fontWeight:700,color:currentProf?'var(--tx)':'var(--tx5)',fontFamily:F,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{currentProf||'—'}</span>
</div>
</div>
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
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>نوع المستند <span style={{color:C.red}}>*</span></label>
<NiceSelect compact height={inH} fontSize={13} value={fields.doc_type||''} placeholder="اختر..."
options={[{value:'work_cert',label:'شهادة عمل'},{value:'intro_letter',label:'خطاب تعريف'},{value:'salary_def',label:'تعريف راتب'},{value:'bank_letter',label:'خطاب بنكي'},{value:'other',label:'أخرى'}]}
onChange={v=>setFields(p=>({...p,doc_type:v}))}/>
</div>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>لغة المستند <span style={{color:C.red}}>*</span></label>
<div style={{display:'flex',gap:4,height:inH,padding:3,borderRadius:9,background:'var(--modal-input-bg)',border:'1px solid rgba(255,255,255,.05)',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)'}}>
{[['ar','العربية','sa'],['en','English','us']].map(([v,l,cc])=>{const sel=fields.doc_lang===v;return<button key={v} type="button" onClick={()=>setFields(p=>({...p,doc_lang:v}))} style={{flex:1,borderRadius:7,border:'none',background:sel?'linear-gradient(135deg, rgba(212,160,23,.25), rgba(212,160,23,.1))':'transparent',color:sel?C.gold:'rgba(255,255,255,.5)',fontFamily:F,fontSize:13,fontWeight:800,cursor:'pointer',transition:'.2s',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:sel?'inset 0 1px 0 rgba(255,255,255,.08),0 1px 4px rgba(0,0,0,.2)':'none',direction:v==='ar'?'rtl':'ltr'}}>
<img src={`https://flagcdn.com/w40/${cc}.png`} width="20" height="14" alt="" style={{borderRadius:3,objectFit:'cover',opacity:sel?1:.75}}/>
{l}
</button>})}
</div>
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
const fmtDay=(iso)=>{if(!iso)return'—';const d=new Date(iso);if(isNaN(d))return'—';return`${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`}

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
<span style={{fontSize:13,fontWeight:700,color:iqamaNo?'var(--tx)':'var(--tx5)',fontFamily:F,direction:'ltr'}}>{iqamaNo||'—'}</span>
</div>
</div>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>رقم التأشيرة</label>
<div style={{...roBox,justifyContent:'center'}}>
<BadgeCheck size={12} color={C.gold} strokeWidth={1.8}/>
<span style={{fontSize:13,fontWeight:700,color:existingVisa?.visa_number?'var(--tx)':'var(--tx5)',fontFamily:F,direction:'ltr'}}>{existingVisa?.visa_number||'—'}</span>
</div>
</div>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>بداية التأشيرة</label>
<div style={{...roBox,justifyContent:'center'}}>
<Calendar size={12} color={C.gold} strokeWidth={1.8}/>
<span style={{fontSize:13,fontWeight:700,color:existingVisa?.start_date?'var(--tx)':'var(--tx5)',fontFamily:F,direction:'ltr'}}>{fmtDay(existingVisa?.start_date)}</span>
</div>
</div>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>نهاية التأشيرة</label>
<div style={{...roBox,justifyContent:'center'}}>
<Calendar size={12} color="#27a046" strokeWidth={1.8}/>
<span style={{fontSize:13,fontWeight:700,color:existingVisa?.end_date?'#27a046':'var(--tx5)',fontFamily:F,direction:'ltr'}}>{fmtDay(existingVisa?.end_date)}</span>
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
<input type="text" inputMode="numeric" value={fields.duration_months||''} onChange={e=>{const raw=e.target.value.replace(/[^0-9]/g,'').slice(0,2);setFields(p=>({...p,duration_months:raw,exit_type:fields.exit_type||'single'}))}} placeholder="عدد الأشهر" style={{...inS,direction:'ltr',textAlign:'center',flex:1}}/>
<span style={{fontSize:12,fontWeight:700,color:'var(--tx4)',fontFamily:F,flexShrink:0}}>شهر</span>
</div>
</div>
</>:<>
{/* ═══ Issuance: type selector + duration ═══ */}
<div style={fieldset}>
<div style={legend}>
<Plane size={12} strokeWidth={2.2}/>
<span>نوع التأشيرة <span style={{color:C.red}}>*</span></span>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
{[{id:'single',label:'مفردة',Icon:Plane,desc:'دخول وخروج مرة واحدة'},
{id:'multiple',label:'متعددة',Icon:PlaneTakeoff,desc:'دخول وخروج عدة مرات'}].map(o=>{
const sel=(fields.exit_type||'single')===o.id
return<button key={o.id} type="button" onClick={()=>setFields(p=>({...p,exit_type:o.id}))}
style={{textAlign:'right',padding:'12px 14px',borderRadius:12,border:`1px solid ${sel?'rgba(212,160,23,.5)':'rgba(255,255,255,.06)'}`,background:sel?'rgba(212,160,23,.12)':'rgba(255,255,255,.03)',color:'var(--tx)',fontFamily:F,cursor:'pointer',transition:'all .2s',display:'flex',alignItems:'center',gap:10}}
onMouseEnter={e=>{if(!sel){e.currentTarget.style.background='rgba(212,160,23,.07)';e.currentTarget.style.borderColor='rgba(212,160,23,.2)'}}}
onMouseLeave={e=>{if(!sel){e.currentTarget.style.background='rgba(255,255,255,.03)';e.currentTarget.style.borderColor='rgba(255,255,255,.06)'}}}>
<div style={{width:40,height:40,borderRadius:10,background:'rgba(212,160,23,.08)',display:'flex',alignItems:'center',justifyContent:'center',color:C.bentoGold,flexShrink:0}}>
<o.Icon size={20} strokeWidth={1.5}/>
</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:13,fontWeight:500,color:'rgba(255,255,255,.85)',marginBottom:2,lineHeight:1.3}}>{o.label}</div>
<div style={{fontSize:10,color:'rgba(255,255,255,.45)'}}>{o.desc}</div>
</div>
</button>
})}
</div>
</div>

<div style={fieldset}>
<div style={legend}>
<CalendarClock size={12} strokeWidth={2.2}/>
<span>مدة التأشيرة <span style={{color:C.red}}>*</span></span>
</div>
<div style={{display:'flex',alignItems:'center',gap:6}}>
<input type="text" inputMode="numeric" value={fields.duration_months||''} onChange={e=>{const raw=e.target.value.replace(/[^0-9]/g,'').slice(0,2);setFields(p=>({...p,duration_months:raw}))}} placeholder="عدد الأشهر" style={{...inS,direction:'ltr',textAlign:'center',flex:1}}/>
<span style={{fontSize:12,fontWeight:700,color:'var(--tx4)',fontFamily:F,flexShrink:0}}>شهر</span>
</div>
</div>
</>}

</div>
}

// ─── final_exit_visa: type selector + reason textarea in fieldsets ───
if(selSvc==='final_exit_visa'){
const legend={position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:5}
const fieldset={borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',padding:'16px 12px 12px',position:'relative',display:'flex',flexDirection:'column',gap:10}
const fexType=fields.final_exit_type||'final_exit'
const typeOpts=[
{id:'final_exit',label:'خروج نهائي',Icon:PlaneTakeoff,desc:'إصدار تأشيرة خروج نهائي للعامل'},
{id:'absence_report',label:'بلاغ تغيب',Icon:TriangleAlert,desc:'تسجيل بلاغ تغيب عن العمل'}
]
const isAbsence=fexType==='absence_report'
return<div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column',gap:10,marginTop:10}}>

{/* ═══ Fieldset 1: نوع الطلب ═══ */}
<div style={{...fieldset,flexShrink:0}}>
<div style={legend}>
<FileCheck size={12} strokeWidth={2.2}/>
<span>نوع الطلب <span style={{color:C.red}}>*</span></span>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
{typeOpts.map(o=>{
const sel=fexType===o.id
return<button key={o.id} type="button" onClick={()=>setFields(p=>({...p,final_exit_type:o.id}))}
style={{textAlign:'right',padding:'12px 14px',borderRadius:12,border:`1px solid ${sel?'rgba(212,160,23,.5)':'rgba(255,255,255,.06)'}`,background:sel?'rgba(212,160,23,.12)':'rgba(255,255,255,.03)',color:'var(--tx)',fontFamily:F,cursor:'pointer',transition:'all .2s',display:'flex',alignItems:'center',gap:10}}
onMouseEnter={e=>{if(!sel){e.currentTarget.style.background='rgba(212,160,23,.07)';e.currentTarget.style.borderColor='rgba(212,160,23,.2)'}}}
onMouseLeave={e=>{if(!sel){e.currentTarget.style.background='rgba(255,255,255,.03)';e.currentTarget.style.borderColor='rgba(255,255,255,.06)'}}}>
<div style={{width:40,height:40,borderRadius:10,background:'rgba(212,160,23,.08)',display:'flex',alignItems:'center',justifyContent:'center',color:C.bentoGold,flexShrink:0,transition:'.2s'}}>
<o.Icon size={20} strokeWidth={1.5}/>
</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:13,fontWeight:500,color:'rgba(255,255,255,.85)',marginBottom:2,lineHeight:1.3}}>{o.label}</div>
<div style={{fontSize:10,color:'rgba(255,255,255,.45)'}}>{o.desc}</div>
</div>
</button>
})}
</div>
</div>

{/* ═══ Fieldset 2: سبب الطلب ═══ */}
<div style={{...fieldset,flex:1,minHeight:0}}>
<div style={legend}>
<FileText size={12} strokeWidth={2.2}/>
<span>{isAbsence?'تفاصيل بلاغ التغيب':'سبب طلب الخروج النهائي'}</span>
</div>
<textarea value={fields.reason||''} onChange={e=>setFields(p=>({...p,reason:e.target.value}))}
placeholder={isAbsence?'اكتب تفاصيل بلاغ التغيب...':'اكتب سبب طلب تأشيرة الخروج النهائي...'}
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
<div style={{display:'grid',gridTemplateColumns:'1.3fr 1fr',gap:10}}>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>العامل / رقم الإقامة</label>
<div style={{...roBox,justifyContent:'space-between'}}>
<span style={{fontSize:13,fontWeight:700,color:workerName?'var(--tx)':'var(--tx5)',fontFamily:F,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{workerName||'—'}</span>
<span style={{fontSize:12,fontWeight:700,color:iqamaNo?C.gold:'var(--tx5)',fontFamily:F,direction:'ltr',flexShrink:0}}>{iqamaNo||'—'}</span>
</div>
</div>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>الراتب الحالي (التأمينات)</label>
<div style={{...roBox,justifyContent:'center',gap:6}}>
<span style={{fontSize:13,fontWeight:800,color:curSalary>0?C.gold:'var(--tx5)',fontFamily:F,direction:'ltr'}}>{curSalary>0?fmtMoney(curSalary):'—'}</span>
{curSalary>0&&<span style={{fontSize:10,fontWeight:700,color:'var(--tx5)'}}>ريال</span>}
</div>
</div>
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
<span style={{fontSize:12,fontWeight:700,color:'var(--tx4)',fontFamily:F,flexShrink:0}}>ريال</span>
</div>
</div>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>مدة استمرار الراتب <span style={{color:C.red}}>*</span></label>
<div style={{display:'flex',alignItems:'center',gap:6}}>
<input type="text" inputMode="numeric" value={fields.salary_weeks||''} onChange={e=>{const raw=e.target.value.replace(/[^0-9]/g,'').slice(0,3);setFields(p=>({...p,salary_weeks:raw}))}} placeholder="عدد الأسابيع" style={{...inS,direction:'ltr',textAlign:'center',flex:1}}/>
<span style={{fontSize:12,fontWeight:700,color:'var(--tx4)',fontFamily:F,flexShrink:0}}>أسبوع</span>
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
const fmtDay=(iso)=>{if(!iso)return'—';const d=new Date(iso);if(isNaN(d))return'—';return`${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`}
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
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>منشأة العامل</label>
<div style={{...roBox,justifyContent:'flex-start'}}>
<Building2 size={12} color={C.gold} strokeWidth={1.8}/>
<span style={{fontSize:13,fontWeight:700,color:'var(--tx)',fontFamily:F,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{origFacility}</span>
</div>
</div>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>الرقم الموحد</label>
<div style={{...roBox,justifyContent:'space-between',paddingInlineEnd:5}}>
<div style={{display:'flex',alignItems:'center',gap:6,flex:1,justifyContent:'center'}}>
<Hash size={12} color={C.gold} strokeWidth={1.8}/>
<span style={{fontSize:13,fontWeight:700,color:origUnified?'var(--tx)':'var(--tx5)',fontFamily:F,direction:'ltr'}}>{origUnified||'—'}</span>
</div>
{origUnified&&<button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(origUnified);setCopiedUnified(true);setTimeout(()=>setCopiedUnified(false),1500)}catch{}}} title={copiedUnified?'تم النسخ':'نسخ'} style={{width:26,height:26,borderRadius:6,border:`1px solid ${copiedUnified?'rgba(39,160,70,.45)':'rgba(212,160,23,.3)'}`,background:copiedUnified?'rgba(39,160,70,.12)':'rgba(212,160,23,.08)',color:copiedUnified?'#27a046':C.gold,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',transition:'.15s',flexShrink:0}}>
{copiedUnified?<Check size={13} strokeWidth={2.4}/>:<Copy size={12} strokeWidth={2}/>}
</button>}
</div>
</div>
</div>}
</div>

{/* ═══ Fieldset 2: بيانات الجواز الحالية ═══ */}
<div style={fieldset}>
<div style={legend}>
<IdCard size={12} strokeWidth={2.2}/>
<span>بيانات الجواز الحالية</span>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>رقم جواز السفر الحالي</label>
<div style={{...roBox,justifyContent:'center',gap:8}}>
<Hash size={13} color={C.gold} strokeWidth={1.8}/>
<span style={{fontSize:13,fontWeight:700,color:curPassportNo?'var(--tx)':'var(--tx5)',fontFamily:F,direction:'ltr'}}>{curPassportNo||'—'}</span>
</div>
</div>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
<label style={{...lblS,marginBottom:0}}>تاريخ انتهاء الجواز الحالي</label>
<div style={{...roBox,justifyContent:'center',gap:8}}>
<Calendar size={13} color={C.gold} strokeWidth={1.8}/>
<span style={{fontSize:13,fontWeight:700,color:curPassportExp?'var(--tx)':'var(--tx5)',fontFamily:F,direction:'ltr'}}>{fmtDay(curPassportExp)}</span>
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
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
{[{v:'extend',l:'تمديد',d:'تمديد تاريخ الانتهاء فقط',Icon:CalendarClock},
{v:'renew',l:'تجديد',d:'إصدار جواز جديد بكامل بياناته',Icon:IdCard}].map(o=>{
const sel=updateMode===o.v
return<button key={o.v} type="button" onClick={()=>setFields(p=>({...p,update_mode:o.v}))}
style={{textAlign:'right',padding:'12px 14px',borderRadius:12,border:`1px solid ${sel?'rgba(212,160,23,.5)':'rgba(255,255,255,.06)'}`,background:sel?'rgba(212,160,23,.12)':'rgba(255,255,255,.03)',color:'var(--tx)',fontFamily:F,cursor:'pointer',transition:'all .2s',display:'flex',alignItems:'center',gap:10}}
onMouseEnter={e=>{if(!sel){e.currentTarget.style.background='rgba(212,160,23,.07)';e.currentTarget.style.borderColor='rgba(212,160,23,.2)'}}}
onMouseLeave={e=>{if(!sel){e.currentTarget.style.background='rgba(255,255,255,.03)';e.currentTarget.style.borderColor='rgba(255,255,255,.06)'}}}>
<div style={{width:40,height:40,borderRadius:10,background:'rgba(212,160,23,.08)',display:'flex',alignItems:'center',justifyContent:'center',color:C.bentoGold,flexShrink:0}}>
<o.Icon size={20} strokeWidth={1.5}/>
</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:13,fontWeight:500,color:'rgba(255,255,255,.85)',marginBottom:2,lineHeight:1.3}}>{o.l}</div>
<div style={{fontSize:10,color:'rgba(255,255,255,.45)'}}>{o.d}</div>
</div>
</button>
})}
</div>
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
<span style={{fontSize:13,fontWeight:700,color:curPassportExp?'var(--tx4)':'var(--tx5)',fontFamily:F,direction:'ltr'}}>{fmtDay(curPassportExp)}</span>
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
const fmtPricedAt=(iso)=>{if(!iso)return'';const d=new Date(iso);if(isNaN(d))return'';return`${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`}
const pickQuote=(qt)=>{
setSelKafalaQuote(qt)
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
return<div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column',gap:10,marginTop:10}}>
{/* Search input — hidden when a quote is selected */}
{!selKafalaQuote&&<div style={{position:'relative'}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{position:'absolute',top:'50%',right:14,transform:'translateY(-50%)',pointerEvents:'none'}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
<input value={kafalaQuoteQ} onChange={e=>setKafalaQuoteQ(e.target.value)} placeholder="ابحث باسم العامل أو رقم الإقامة أو رقم طلب حسبة التنازل..." style={{width:'100%',height:42,padding:'0 40px 0 14px',border:'1px solid rgba(255,255,255,.05)',borderRadius:9,fontFamily:F,fontSize:13,fontWeight:600,color:'var(--tx)',background:'var(--modal-input-bg)',outline:'none',textAlign:'right',boxSizing:'border-box',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)'}}/>
</div>}
{/* Selected quote summary */}
{selKafalaQuote&&(()=>{const qt=selKafalaQuote;return<div style={{borderRadius:12,border:'1.5px solid rgba(212,160,23,.45)',background:'linear-gradient(135deg,rgba(212,160,23,.08),rgba(212,160,23,.02))',padding:14,position:'relative',display:'flex',flexDirection:'column',gap:10}}>
<div style={{position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:6}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
<span>حسبة تنازل مصدقة</span>
</div>
<button onClick={()=>{setSelKafalaQuote(null)}} title="إلغاء الاختيار" style={{position:'absolute',top:-11,left:14,height:22,padding:'0 10px',borderRadius:6,border:'1px solid rgba(192,57,43,.3)',background:'var(--modal-bg)',color:C.red,cursor:'pointer',fontSize:10,fontFamily:F,fontWeight:700}}>إلغاء</button>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:4}}>
<div><div style={{fontSize:10,color:'var(--tx5)',fontWeight:600,marginBottom:3}}>العامل</div><div style={{fontSize:13,fontWeight:800,color:'var(--tx)',fontFamily:F}}>{qt.worker_name||'—'}</div></div>
<div><div style={{fontSize:10,color:'var(--tx5)',fontWeight:600,marginBottom:3}}>رقم الإقامة</div><div style={{fontSize:13,fontWeight:800,color:'var(--tx)',direction:'ltr',textAlign:'right'}}>{qt.iqama_number||'—'}</div></div>
<div><div style={{fontSize:10,color:'var(--tx5)',fontWeight:600,marginBottom:3}}>رقم طلب التسعيرة</div><div style={{fontSize:13,fontWeight:800,color:C.gold,direction:'ltr',textAlign:'right'}}>{qt.quote_no||'—'}</div></div>
<div><div style={{fontSize:10,color:'var(--tx5)',fontWeight:600,marginBottom:3}}>الإجمالي</div><div style={{fontSize:13,fontWeight:800,color:C.gold,textAlign:'right'}}><bdi>{fmtPrice(qt.client_charge)}</bdi> <span style={{fontSize:10,color:'var(--tx5)'}}>ريال</span></div></div>
</div>
</div>})()}
{/* Results / loading / empty */}
{!selKafalaQuote&&<div style={{display:'flex',flexDirection:'column',gap:8}}>
{loadingKafalaQuotes?<div style={{padding:'40px 20px',textAlign:'center',color:'var(--tx5)',fontSize:12,fontFamily:F}}>...جاري التحميل</div>
:matches.length>0?matches.map(qt=>(
<div key={qt.id} onClick={()=>pickQuote(qt)} style={{padding:'12px 14px',borderRadius:10,cursor:'pointer',border:'1px solid rgba(255,255,255,.06)',background:'rgba(255,255,255,.03)',display:'flex',flexDirection:'column',gap:6,transition:'.2s'}}
onMouseEnter={e=>{e.currentTarget.style.background='rgba(212,160,23,.07)';e.currentTarget.style.borderColor='rgba(212,160,23,.25)'}}
onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.03)';e.currentTarget.style.borderColor='rgba(255,255,255,.06)'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
<span style={{fontSize:13,fontWeight:800,color:'var(--tx)',fontFamily:F,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{qt.worker_name||'—'}</span>
<span style={{fontSize:11,fontWeight:700,color:C.gold,flexShrink:0}}><bdi>{fmtPrice(qt.client_charge)}</bdi> ريال</span>
</div>
<div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
{qt.iqama_number&&<span style={{fontSize:10.5,color:'var(--tx4)',fontWeight:600,padding:'2px 7px',borderRadius:5,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.05)',direction:'ltr'}}>إقامة: {qt.iqama_number}</span>}
{qt.quote_no&&<span style={{fontSize:10.5,color:C.bentoGold,fontWeight:700,padding:'2px 7px',borderRadius:5,background:'rgba(212,160,23,.06)',border:'1px solid rgba(212,160,23,.18)',direction:'ltr'}}>{qt.quote_no}</span>}
{qt.priced_at&&<span style={{fontSize:10,color:'var(--tx5)',fontWeight:600,marginRight:'auto',direction:'ltr'}}>{fmtPricedAt(qt.priced_at)}</span>}
</div>
</div>
)):<div style={{padding:'40px 20px',textAlign:'center',color:'var(--tx5)',fontSize:12,fontFamily:F,background:'var(--modal-input-bg)',borderRadius:9,border:'1px solid rgba(255,255,255,.05)'}}>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx2)',marginBottom:5}}>لا توجد حسبة تنازل مطابقة</div>
<div style={{fontSize:10.5,color:'var(--tx5)'}}>{q?'جرّب بحثاً آخر':'يمكنك إصدار حسبة تنازل من حاسبة التنازل'}</div>
</div>}
</div>}
</div>
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
<label style={lblS}>{inp.label_ar} {inp.required&&inp.type!=='toggle'&&<span style={{color:C.red}}>*</span>}</label>
{inp.type==='toggle'?
<div style={{display:'flex',gap:6,height:34}}>
{[{v:true,l:'نعم',c:C.ok},{v:false,l:'لا',c:C.red}].map(o=>{
const sel=val===o.v
return<button key={String(o.v)} type="button" onClick={()=>setFields(p=>({...p,[inp.key]:o.v}))}
style={{flex:1,borderRadius:8,border:`1.5px solid ${sel?o.c:'rgba(255,255,255,.1)'}`,background:sel?`${o.c}1f`:'rgba(255,255,255,.05)',color:sel?o.c:'var(--tx4)',fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer',transition:'.2s'}}>{o.l}</button>
})}
</div>
:inp.type==='select'?
<NiceSelect height={36} fontSize={12} value={val||''} placeholder="اختر..."
options={inp.source==='regions'?regions.map(r=>({value:r.id,label:r.name_ar})):inp.source==='countries'?lkCountries.map(c=>({value:c.nationality_ar,label:c.nationality_ar})):inp.source==='occupations'?lkOccupations.map(o=>({value:o.value_ar,label:o.value_ar})):(inp.options||[])}
onChange={v=>setFields(p=>({...p,[inp.key]:v}))}/>
:inp.type==='date'?
<input type="date" value={val||''} onChange={e=>setFields(p=>({...p,[inp.key]:e.target.value}))} style={{...fS,direction:'ltr',textAlign:'left'}}/>
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
<div style={{display:'grid',gridTemplateColumns:'1fr 1.2fr .8fr',gap:5,direction:'ltr'}}>
<NiceSelect compact height={34} fontSize={11} value={dY} placeholder="السنة" options={years} searchable={false} onChange={v=>setDatePart('y',v)}/>
<NiceSelect compact height={34} fontSize={11} value={dM} placeholder="الشهر" options={months} searchable={false} onChange={v=>setDatePart('m',v)}/>
<NiceSelect compact height={34} fontSize={11} value={dD} placeholder="اليوم" options={days} searchable={false} onChange={v=>setDatePart('d',v)}/>
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
style={{width:80,background:'transparent',border:'none',outline:'none',color:C.gold,fontSize:11,fontWeight:700,fontFamily:F,textAlign:'center',padding:0,direction:'ltr'}}/>
<span style={{fontSize:10,fontWeight:700,color:C.gold,fontFamily:F}}>هـ</span>
</div>
})()}
</div>
})()
:inp.type==='textarea'?
<textarea value={val||''} onChange={e=>setFields(p=>({...p,[inp.key]:e.target.value}))} placeholder={inp.placeholder||''} rows={3} style={{...fS,height:'auto',padding:'10px 14px',resize:'vertical'}}/>
:<input type={inp.type==='number'?'number':'text'} value={val||''} onChange={e=>setFields(p=>({...p,[inp.key]:e.target.value}))}
placeholder={inp.placeholder||''} style={{...fS,...(inp.direction==='ltr'?{direction:'ltr',textAlign:'left'}:{})}}/>
}
</div>})}
</div>

return hasSections?<div style={{flex:1,minHeight:0,borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',padding:'18px 14px 14px',position:'relative',display:'flex',flexDirection:'column',gap:12,marginTop:10}}>
<div style={{position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:6}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{kafalaPage===1?<><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>:<><path d="M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7"/></>}</svg>
<span>{sectionTitles[kafalaPage]||`القسم ${kafalaPage}`}</span>
<span style={{fontSize:10,fontWeight:700,color:'var(--tx5)',marginRight:4}}>({kafalaPage}/{totalSections})</span>
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
<label style={{fontSize:11,fontWeight:700,color:on?c:'var(--tx4)',fontFamily:F,transition:'.2s'}}>{label}</label>
<button type="button" onClick={()=>setK(stateKey+'_on',!on)} style={{width:28,height:16,borderRadius:999,border:'none',background:on?c:'rgba(255,255,255,.15)',cursor:'pointer',position:'relative',transition:'.2s',padding:0,flexShrink:0}}>
<span style={{position:'absolute',width:12,height:12,borderRadius:'50%',background:'#fff',top:2,right:on?2:14,transition:'.2s'}}/>
</button>
</div>
<div style={{display:'flex',alignItems:'center',background:on?'rgba(0,0,0,.18)':'rgba(255,255,255,.02)',border:`1px solid ${on?c+'4d':'rgba(255,255,255,.05)'}`,borderRadius:9,boxShadow:on?'inset 0 1px 2px rgba(0,0,0,.2)':'none',height:36,opacity:on?1:.5,transition:'.2s'}}>
<input type="text" inputMode="decimal" disabled={!on} value={fmtAmt(k[stateKey]||'')} onChange={e=>{const raw=e.target.value.replace(/[^0-9.]/g,'');setK(stateKey,raw)}} placeholder="0" style={{flex:1,minWidth:0,height:'100%',padding:'0 10px',border:'none',background:'transparent',fontFamily:F,fontSize:12.5,fontWeight:700,color:on?'var(--tx)':'var(--tx5)',outline:'none',direction:'ltr',textAlign:'center'}}/>
<span style={{fontSize:10,color:'var(--tx5)',fontWeight:700,padding:'0 8px 0 4px',fontFamily:F,flexShrink:0}}>ريال</span>
</div>
</div>}
return<div style={{marginTop:10,borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',padding:'18px 14px 14px',position:'relative'}}>
<div style={{position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:6}}>
<span>التسعيرة</span>
{iqamaExpiredKafala&&<span style={{fontSize:9,color:C.red,background:'rgba(192,57,43,.12)',padding:'1px 6px',borderRadius:4,fontWeight:700}}>الإقامة منتهية</span>}
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
<button type="button" onClick={()=>{if(!kafalaExtraName||!kafalaExtraAmount)return;setKafalaPricing(p=>({...p,extras:[...(p.extras||[]),{name:kafalaExtraName,amount:kafalaExtraAmount}]}));setKafalaExtraName('');setKafalaExtraAmount('')}} style={{height:42,padding:'0 14px',borderRadius:9,border:'1px solid rgba(212,160,23,.3)',background:'rgba(212,160,23,.12)',color:C.gold,fontFamily:F,fontSize:14,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>+</button>
</div>
{(k.extras||[]).length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:6}}>
{k.extras.map((e,i)=><span key={i} style={{display:'inline-flex',alignItems:'center',gap:4,padding:'2px 8px',borderRadius:5,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.06)',fontSize:10,fontWeight:600,color:'var(--tx2)'}}>
{e.name} <span style={{color:C.gold,fontWeight:700}}>{Number(e.amount).toLocaleString('en-US')}</span>
<span onClick={()=>setKafalaPricing(p=>({...p,extras:p.extras.filter((_,idx)=>idx!==i)}))} style={{color:C.red,cursor:'pointer',fontWeight:700}}>×</span>
</span>)}
</div>}
</div>

{/* Subtotal + Deductions + Total */}
<div style={{marginTop:14,paddingTop:14,borderTop:'1px solid rgba(255,255,255,.05)',display:'flex',flexDirection:'column',gap:10}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<span style={{fontSize:12,fontWeight:700,color:'var(--tx2)'}}>إجمالي الرسوم</span>
<span style={{fontSize:14,fontWeight:800,color:'var(--tx)'}}>{Number(pricing.subtotal||0).toLocaleString('en-US',{minimumFractionDigits:2})} ريال</span>
</div>
{/* Toggle chips for deductions */}
<div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
{togChip('خصم','discount',C.gold)}
{togChip('رصيد أبشر','absherBalance','#2ea043')}
</div>
{/* Final total */}
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:5,borderTop:'1px dashed rgba(212,160,23,.2)'}}>
<span style={{fontSize:14,fontWeight:800,color:C.gold}}>الإجمالي</span>
<span style={{fontSize:17,fontWeight:900,color:C.gold}}>{Number(pricing.total).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} ريال</span>
</div>
</div>
</div>
})()}

{/* ═══ Kafala / Iqama-renewal Payment Plan: separate sub-step after pricing ═══ */}
{(selSvc==='kafala_transfer'||selSvc==='iqama_renewal')&&kafalaPayStep&&(()=>{
const total=Number(pricing.total)||0
const lines=selSvc==='iqama_renewal'?iqamaRenewalLines:kafalaLines
const officeFee=Number((lines&&lines.officeFee)||0)
const maxFirst=Math.max(0,total-officeFee)
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
<div style={{position:'absolute',top:-9,left:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:11,fontWeight:700,color:C.gold,fontFamily:F}}>الإجمالي: <span style={{direction:'ltr',display:'inline-block'}}>{fmtAmt(total.toFixed(2))}</span> ريال</div>
<div style={{display:'flex',gap:8}}>
{[{v:'single',l:'دفعة واحدة',icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/></svg>},
{v:'split',l:'دفعات متعددة',icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="4" rx="1"/><rect x="3" y="10" width="18" height="4" rx="1"/><rect x="3" y="16" width="18" height="4" rx="1"/></svg>}].map(o=>{const on=kafalaPayMode===o.v;return<div key={o.v} onClick={()=>setKafalaPayMode(o.v)} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,height:36,borderRadius:9,border:`1.5px solid ${on?C.gold:'rgba(255,255,255,.07)'}`,background:on?'linear-gradient(180deg,rgba(212,160,23,.18) 0%,rgba(212,160,23,.06) 100%)':'linear-gradient(180deg,#2C2C2C 0%,#222 100%)',boxShadow:on?'inset 0 1px 0 rgba(212,160,23,.22)':'0 2px 6px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.04)',cursor:'pointer',transition:'.18s',color:on?C.gold:'var(--tx3)'}}>
<span style={{fontSize:14,fontWeight:on?700:500,fontFamily:F}}>{o.l}</span>
{o.icon}
</div>})}
</div>
{kafalaPayMode==='split'&&<div style={{display:'flex',flexDirection:'column',gap:10,flex:1,minHeight:0,paddingTop:10}}>
{inst.map((row,i)=>{
const idxLbl=['الدفعة الأولى','الدفعة الثانية','الدفعة الثالثة','الدفعة الرابعة','الدفعة الخامسة'][i]||`الدفعة ${i+1}`
const val=parseFloat(row.amount)||0
const isFirst=i===0
const over=isFirst&&val>maxFirst
const dateOn=row.dateOn===true||!!row.date
const canAdd=isFirst&&inst.length<5
return<div key={i} style={{display:'grid',gridTemplateColumns:'auto 1fr auto auto',gap:8,alignItems:'center'}}>
<span style={{fontSize:11,fontWeight:700,color:'var(--tx2)',minWidth:90,textAlign:'right'}}>{idxLbl}</span>
<input type="text" inputMode="decimal" value={fmtAmt(row.amount)} onChange={e=>{const raw=e.target.value.replace(/[^0-9.]/g,'');setIF(i,'amount',raw)}} onBlur={e=>{const raw=e.target.value.replace(/[^0-9.]/g,'');if(isFirst&&raw!==''&&Number(raw)>maxFirst)setIF(i,'amount',String(maxFirst))}} placeholder={isFirst?fmtAmt(maxFirst.toFixed(2)):'المبلغ'} style={{...fS,height:34,fontSize:12,direction:'ltr',textAlign:'center',borderColor:over?C.red+'66':'rgba(255,255,255,.1)'}}/>
{isFirst?(canAdd?<button type="button" onClick={addInst} style={{height:34,width:150,padding:'0 12px',borderRadius:7,border:'1px solid rgba(212,160,23,.4)',background:'rgba(212,160,23,.08)',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
<span>إضافة دفعة</span>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
</button>:<span style={{width:150}}/>):(dateOn?<div style={{display:'flex',alignItems:'center',gap:4}}>
<CompactDatePicker value={row.date||''} onChange={(v)=>setIF(i,'date',v)} width={150} height={34}/>
<button type="button" onClick={()=>{setIF(i,'date','');setIF(i,'dateOn',false)}} style={{width:30,height:30,borderRadius:7,border:'1px solid rgba(192,57,43,.15)',background:'rgba(192,57,43,.06)',color:C.red,cursor:'pointer',fontSize:14,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}} title="إلغاء التاريخ">×</button>
</div>:<button type="button" onClick={()=>setIF(i,'dateOn',true)} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',height:34,width:150,borderRadius:7,border:'1px dashed rgba(212,160,23,.3)',background:'rgba(212,160,23,.04)',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',justifyContent:'center'}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg>
إضافة تاريخ
</button>)}
{inst.length>1&&!isFirst?<button type="button" onClick={()=>rmInst(i)} title="حذف الدفعة" style={{width:30,height:30,borderRadius:7,border:'1px solid rgba(192,57,43,.25)',background:'rgba(192,57,43,.12)',color:C.red,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>:<span style={{width:30}}/>}
</div>
})}
<div style={{display:'flex',justifyContent:'flex-end',alignItems:'center',marginBottom:8}}>
<div style={{fontSize:11,fontWeight:700}}>
<span style={{color:'var(--tx4)'}}>متبقّي: <span style={{color:remaining>0?C.gold:C.ok,direction:'ltr',display:'inline-block'}}>{fmtAmt(remaining.toFixed(2))}</span> ريال</span>
</div>
</div>
</div>}
{kafalaPayMode==='single'&&<div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6,color:'var(--tx4)'}}>
<div style={{fontSize:12,fontWeight:700}}>سيتم دفع الإجمالي دفعة واحدة</div>
<div style={{fontSize:18,fontWeight:900,color:C.gold}}><span style={{direction:'ltr',display:'inline-block'}}>{fmtAmt(total.toFixed(2))}</span> ريال</div>
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
<label style={{fontSize:11,fontWeight:700,color:on?c:'var(--tx4)',fontFamily:F,transition:'.2s'}}>{label}</label>
<button type="button" onClick={()=>setK(stateKey+'_on',!on)} style={{width:28,height:16,borderRadius:999,border:'none',background:on?c:'rgba(255,255,255,.15)',cursor:'pointer',position:'relative',transition:'.2s',padding:0,flexShrink:0}}>
<span style={{position:'absolute',width:12,height:12,borderRadius:'50%',background:'#fff',top:2,right:on?2:14,transition:'.2s'}}/>
</button>
</div>
<div style={{display:'flex',alignItems:'center',background:on?'rgba(0,0,0,.18)':'rgba(255,255,255,.02)',border:`1px solid ${on?c+'4d':'rgba(255,255,255,.05)'}`,borderRadius:9,boxShadow:on?'inset 0 1px 2px rgba(0,0,0,.2)':'none',height:36,opacity:on?1:.5,transition:'.2s'}}>
<input type="text" inputMode="decimal" disabled={!on} value={fmtAmt(k[stateKey]||'')} onChange={e=>{const raw=e.target.value.replace(/[^0-9.]/g,'');setK(stateKey,raw)}} placeholder="0" style={{flex:1,minWidth:0,height:'100%',padding:'0 10px',border:'none',background:'transparent',fontFamily:F,fontSize:12.5,fontWeight:700,color:on?'var(--tx)':'var(--tx5)',outline:'none',direction:'ltr',textAlign:'center'}}/>
<span style={{fontSize:10,color:'var(--tx5)',fontWeight:700,padding:'0 8px 0 4px',fontFamily:F,flexShrink:0}}>ريال</span>
</div>
</div>}
return<div style={{borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',padding:'16px 14px 12px',position:'relative',marginTop:11}}>
<div style={{position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:6}}>
<span>التسعيرة</span>
{iqamaExpiredRenewal&&<span style={{fontSize:9,color:C.red,background:'rgba(192,57,43,.12)',padding:'1px 6px',borderRadius:4,fontWeight:700}}>الإقامة منتهية</span>}
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
<button type="button" onClick={()=>{if(!iqamaExtraName||!iqamaExtraAmount)return;setIqamaPricing(p=>({...p,extras:[...(p.extras||[]),{name:iqamaExtraName,amount:iqamaExtraAmount}]}));setIqamaExtraName('');setIqamaExtraAmount('')}} style={{height:42,padding:'0 12px',borderRadius:9,border:'1px solid rgba(212,160,23,.25)',background:'rgba(212,160,23,.1)',color:C.gold,fontFamily:F,fontSize:14,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>+</button>
</div>
{(k.extras||[]).length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:6}}>
{k.extras.map((e,i)=><span key={i} style={{display:'inline-flex',alignItems:'center',gap:4,padding:'2px 8px',borderRadius:5,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.06)',fontSize:10,fontWeight:600,color:'var(--tx2)'}}>
{e.name} <span style={{color:C.gold,fontWeight:700}}>{Number(e.amount).toLocaleString('en-US')} ريال</span>
<span onClick={()=>setIqamaPricing(p=>({...p,extras:p.extras.filter((_,idx)=>idx!==i)}))} style={{color:C.red,cursor:'pointer',fontWeight:700}}>×</span>
</span>)}
</div>}
</div>

{/* Subtotal + Deductions + Total */}
{(()=>{const sub=Number(pricing.subtotal||0);const absh=Number(k.absherBalance_on?k.absherBalance:0)||0;const disc=Number(k.discount_on?k.discount:0)||0;return(
<div style={{marginTop:12,paddingTop:12,borderTop:'1px solid rgba(255,255,255,.05)',display:'flex',flexDirection:'column',gap:8}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<span style={{fontSize:11,fontWeight:700,color:'var(--tx2)'}}>إجمالي الرسوم</span>
<span style={{fontSize:13,fontWeight:800,color:'var(--tx)'}}>{Number(sub).toLocaleString('en-US',{minimumFractionDigits:2})} ريال</span>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
{togChip('خصم','discount',C.gold)}
{togChip('رصيد أبشر','absherBalance','#2ea043')}
</div>
{disc>0&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'3px 0'}}>
<span style={{fontSize:11,fontWeight:700,color:C.gold}}>خصم</span>
<span style={{fontSize:12,fontWeight:800,color:C.red,direction:'ltr'}}>− {Number(disc).toLocaleString('en-US',{minimumFractionDigits:2})} ريال</span>
</div>}
{absh>0&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'3px 0'}}>
<span style={{fontSize:11,fontWeight:700,color:'#2ea043'}}>رصيد أبشر</span>
<span style={{fontSize:12,fontWeight:800,color:C.red,direction:'ltr'}}>− {Number(absh).toLocaleString('en-US',{minimumFractionDigits:2})} ريال</span>
</div>}
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:5,borderTop:'1px dashed rgba(212,160,23,.2)'}}>
<span style={{fontSize:14,fontWeight:800,color:C.gold}}>الإجمالي</span>
<span style={{fontSize:17,fontWeight:900,color:C.gold}}>{Number(pricing.total).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} ريال</span>
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
<label style={{fontSize:11,fontWeight:700,color:on?c:'var(--tx4)',fontFamily:F,transition:'.2s'}}>{label}</label>
<button type="button" onClick={()=>setTK(stateKey+'_on',!on)} style={{width:28,height:16,borderRadius:999,border:'none',background:on?c:'rgba(255,255,255,.15)',cursor:'pointer',position:'relative',transition:'.2s',padding:0,flexShrink:0}}>
<span style={{position:'absolute',width:12,height:12,borderRadius:'50%',background:'#fff',top:2,right:on?2:14,transition:'.2s'}}/>
</button>
</div>
<div style={{display:'flex',alignItems:'center',background:on?'rgba(0,0,0,.18)':'rgba(255,255,255,.02)',border:`1px solid ${on?c+'4d':'rgba(255,255,255,.05)'}`,borderRadius:9,boxShadow:on?'inset 0 1px 2px rgba(0,0,0,.2)':'none',height:36,opacity:on?1:.5,transition:'.2s'}}>
<input type="text" inputMode="decimal" disabled={!on} value={fmtAmt(otherServicePricing[stateKey]||'')} onChange={e=>{const raw=e.target.value.replace(/[^0-9.]/g,'');setTK(stateKey,raw)}} placeholder="0" style={{flex:1,minWidth:0,height:'100%',padding:'0 10px',border:'none',background:'transparent',fontFamily:F,fontSize:12.5,fontWeight:700,color:on?'var(--tx)':'var(--tx5)',outline:'none',direction:'ltr',textAlign:'center'}}/>
<span style={{fontSize:10,color:'var(--tx5)',fontWeight:700,padding:'0 8px 0 4px',fontFamily:F,flexShrink:0}}>ريال</span>
</div>
</div>}
return<div style={{marginTop:10,borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',padding:'18px 14px 14px',position:'relative'}}>
<div style={{position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F,display:'inline-flex',alignItems:'center',gap:5}}>
<span>التسعيرة</span>
</div>
{/* Auto lines editable */}
<div style={{display:'grid',gridTemplateColumns:o.lines.length>1?'1fr 1fr':'1fr',gap:'10px 12px'}}>
{o.lines.map((line,i)=>{
const auto=Number(ac.lines[i]?.amount)||0
const curVal=otherServicePricing.overrides?.[i]??''
return<div key={i}>
<label style={{...lblS,fontSize:12,marginBottom:5}}>{line.label}{line.detail&&<span style={{color:'var(--tx5)',fontSize:10,marginRight:4,fontWeight:600}}>({line.detail})</span>}</label>
<input type="text" inputMode="decimal" value={fmtAmt(curVal)}
onChange={e=>{const raw=e.target.value.replace(/[^0-9.]/g,'');setOV(i,raw)}}
onBlur={e=>{const raw=e.target.value.replace(/[^0-9.]/g,'');if(raw!==''&&Number(raw)<auto)setOV(i,String(auto))}}
placeholder={auto>0?fmtAmt(auto):'0'} style={{...fS,direction:'ltr',textAlign:'center'}}/>
</div>
})}
</div>
{/* Extras */}
<div style={{marginTop:14,paddingTop:14,borderTop:'1px solid rgba(255,255,255,.05)'}}>
<div style={{display:'flex',gap:6,alignItems:'center'}}>
<input value={otherExtraName} onChange={e=>setOtherExtraName(e.target.value)} placeholder="بند إضافي" style={{...fS,flex:2}}/>
<input type="text" inputMode="decimal" value={fmtAmt(otherExtraAmount)} onChange={e=>{const raw=e.target.value.replace(/[^0-9.]/g,'');setOtherExtraAmount(raw)}} placeholder="المبلغ" style={{...fS,flex:1,direction:'ltr',textAlign:'center'}}/>
<button type="button" onClick={()=>{if(!otherExtraName||!otherExtraAmount)return;setOtherServicePricing(p=>({...p,extras:[...(p.extras||[]),{name:otherExtraName,amount:otherExtraAmount}]}));setOtherExtraName('');setOtherExtraAmount('')}} style={{height:42,padding:'0 14px',borderRadius:9,border:'1px solid rgba(212,160,23,.3)',background:'rgba(212,160,23,.12)',color:C.gold,fontFamily:F,fontSize:14,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>+</button>
</div>
{(otherServicePricing.extras||[]).length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:6}}>
{otherServicePricing.extras.map((e,i)=><span key={i} style={{display:'inline-flex',alignItems:'center',gap:4,padding:'2px 8px',borderRadius:5,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.06)',fontSize:10,fontWeight:600,color:'var(--tx2)'}}>
{e.name} <span style={{color:C.gold,fontWeight:700}}>{Number(e.amount).toLocaleString('en-US')}</span>
<span onClick={()=>setOtherServicePricing(p=>({...p,extras:p.extras.filter((_,idx)=>idx!==i)}))} style={{color:C.red,cursor:'pointer',fontWeight:700}}>×</span>
</span>)}
</div>}
</div>
{/* Totals */}
<div style={{marginTop:14,paddingTop:14,borderTop:'1px solid rgba(255,255,255,.05)',display:'flex',flexDirection:'column',gap:10}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<span style={{fontSize:12,fontWeight:700,color:'var(--tx2)'}}>إجمالي الرسوم</span>
<span style={{fontSize:14,fontWeight:800,color:'var(--tx)'}}>{Number(pricing.subtotal||0).toLocaleString('en-US',{minimumFractionDigits:2})} ريال</span>
</div>
{/* رصيد أبشر only for profession_change + exit_reentry_visa (discount only for kafala_transfer/iqama_renewal, not shown here) */}
{(selSvc==='profession_change'||selSvc==='exit_reentry_visa')&&<div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
{togChip('رصيد أبشر','absherBalance','#2ea043')}
</div>}
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:5,borderTop:'1px dashed rgba(212,160,23,.2)'}}>
<span style={{fontSize:14,fontWeight:800,color:C.gold}}>الإجمالي</span>
<span style={{fontSize:17,fontWeight:900,color:C.gold}}>{Number(pricing.total).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} ريال</span>
</div>
</div>
</div>
})()}

{selSvc!=='kafala_transfer'&&selSvc!=='iqama_renewal'&&!SVC_WITH_PRICING.has(selSvc)&&<div style={{border:'1.5px solid rgba(212,160,23,.35)',borderRadius:12,padding:'18px 14px 14px',position:'relative',marginTop:10}}>
<div style={{position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F}}>الإجمالي</div>
<div style={{display:'flex',justifyContent:'flex-end',alignItems:'center',gap:10}}>
{VISA_SERVICES.has(selSvc)?
<div style={{display:'flex',alignItems:'center',gap:8}}>
<input type="text" inputMode="decimal" value={totalOverride==null?'':fmtAmt(totalOverride)} placeholder={fmtAmt(pricing.total.toFixed(2))}
onChange={e=>{const raw=unfmtAmt(e.target.value);if(raw===''){setTotalOverride(null);return}if(!/^\d*\.?\d*$/.test(raw))return;const n=Number(raw);if(isNaN(n))return;setTotalOverride(n)}}
style={{width:160,height:42,padding:'0 14px',borderRadius:9,border:'1px solid rgba(255,255,255,.05)',background:'var(--modal-input-bg)',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)',color:C.gold,fontFamily:F,fontSize:16,fontWeight:900,textAlign:'center',direction:'ltr',outline:'none',boxSizing:'border-box'}}/>
<span style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,.58)',fontFamily:F}}>ريال</span>
</div>
:<span style={{fontSize:18,fontWeight:900,color:C.gold}}>{pricing.total.toFixed(2)} ريال</span>}
</div>
</div>}

{/* Installment plan for visa services */}
{VISA_SERVICES.has(selSvc)&&(()=>{
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
const inStyle=(bad)=>({width:100,height:28,padding:'0 6px',borderRadius:6,border:`1px solid ${bad?C.red:'rgba(212,160,23,.15)'}`,background:'rgba(0,0,0,.2)',color:bad?C.red:C.gold,fontFamily:F,fontSize:12,fontWeight:700,textAlign:'center',direction:'ltr',outline:'none'})
const totalInst=hasAuth?3:2
const residenceIdx=hasAuth?3:2
return<div style={{marginTop:18,border:'1.5px solid rgba(212,160,23,.35)',borderRadius:12,padding:'18px 14px 14px',position:'relative'}}>
<div style={{position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F}}>الدفعات</div>
{/* Installment 1 — Issuance */}
<div style={{display:'flex',alignItems:'center',gap:8,padding:'5px 0',borderBottom:'1px solid rgba(255,255,255,.04)'}}>
<div style={{width:26,height:26,borderRadius:'50%',background:'linear-gradient(135deg, rgba(212,160,23,.3), rgba(212,160,23,.12))',border:'1px solid rgba(212,160,23,.4)',color:C.gold,fontSize:11.5,fontWeight:900,fontFamily:F,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 2px 6px rgba(212,160,23,.15), inset 0 1px 0 rgba(255,255,255,.08)'}}>1</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:12.5,fontWeight:700,color:'rgba(255,255,255,.95)',fontFamily:F}}>عند إصدار التأشيرة</div>
<div style={{fontSize:10.5,color:issuanceBad?C.red:'rgba(255,255,255,.58)',fontFamily:F}}>{issuanceBad?'⚠ السعر المدخل غير مسموح':'دفعة واحدة لجميع التأشيرات'}</div>
</div>
<input type="text" inputMode="decimal" value={fmtAmt(visaInstallments.issuance)} onChange={e=>{const raw=unfmtAmt(e.target.value);if(raw===''||/^\d*\.?\d*$/.test(raw))setVisaInstallments(p=>({...p,issuance:raw}))}} placeholder={fmtAmt(defaultEach.toFixed(2))} style={inStyle(issuanceBad)}/>
<span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.58)',fontFamily:F}}>ريال</span>
</div>
{/* Installment 2 — Authorization (permanent visa only) */}
{hasAuth&&<div style={{display:'flex',alignItems:'center',gap:8,padding:'5px 0',borderBottom:'1px solid rgba(255,255,255,.04)'}}>
<div style={{width:26,height:26,borderRadius:'50%',background:'linear-gradient(135deg, rgba(212,160,23,.3), rgba(212,160,23,.12))',border:'1px solid rgba(212,160,23,.4)',color:C.gold,fontSize:11.5,fontWeight:900,fontFamily:F,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 2px 6px rgba(212,160,23,.15), inset 0 1px 0 rgba(255,255,255,.08)'}}>2</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:12.5,fontWeight:700,color:'rgba(255,255,255,.95)',fontFamily:F}}>عند توكيل التأشيرة</div>
<div style={{fontSize:10.5,color:authBad?C.red:'rgba(255,255,255,.58)',fontFamily:F}}>{authBad?'⚠ السعر المدخل غير مسموح':'دفعة واحدة لجميع التأشيرات'}</div>
</div>
<input type="text" inputMode="decimal" value={fmtAmt(visaInstallments.authorization)} onChange={e=>{const raw=unfmtAmt(e.target.value);if(raw===''||/^\d*\.?\d*$/.test(raw))setVisaInstallments(p=>({...p,authorization:raw}))}} placeholder={fmtAmt(defaultEach.toFixed(2))} style={inStyle(authBad)}/>
<span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.58)',fontFamily:F}}>ريال</span>
</div>}
{/* Final installment — Residence (per visa) */}
<div style={{display:'flex',alignItems:'center',gap:8,padding:'5px 0'}}>
<div style={{width:26,height:26,borderRadius:'50%',background:'linear-gradient(135deg, rgba(212,160,23,.3), rgba(212,160,23,.12))',border:'1px solid rgba(212,160,23,.4)',color:C.gold,fontSize:11.5,fontWeight:900,fontFamily:F,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 2px 6px rgba(212,160,23,.15), inset 0 1px 0 rgba(255,255,255,.08)'}}>{residenceIdx}</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:12.5,fontWeight:700,color:'rgba(255,255,255,.95)',fontFamily:F}}>عند إصدار الإقامة <span style={{fontSize:10.5,color:C.gold,fontWeight:700}}>(لكل تأشيرة)</span></div>
<div style={{fontSize:10.5,color:'rgba(255,255,255,.58)',fontFamily:F,direction:'rtl'}}><span style={{direction:'ltr',display:'inline-block'}}>{residencePerVisa.toFixed(2)}</span> × {numVisas} = <span style={{color:C.gold,fontWeight:700,direction:'ltr',display:'inline-block'}}>{residenceTotalCalc.toFixed(2)}</span> ريال</div>
</div>
<input type="text" inputMode="decimal" value={fmtAmt(visaInstallments.residencePerVisa)} onChange={e=>{const raw=unfmtAmt(e.target.value);if(raw===''||/^\d*\.?\d*$/.test(raw))setVisaInstallments(p=>({...p,residencePerVisa:raw}))}} placeholder={fmtAmt((residenceSubtotal/numVisas).toFixed(2))} style={inStyle(false)}/>
<span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.58)',fontFamily:F}}>ريال</span>
</div>
{/* Sum-check footer — two clear lines: sum, then difference (if any) */}
<div style={{marginTop:6,paddingTop:6,borderTop:'1px dashed rgba(255,255,255,.08)',display:'flex',flexDirection:'column',gap:3}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<span style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,.75)',fontFamily:F}}>مجموع الدفعات</span>
<span style={{fontSize:13,fontWeight:900,color:matchesTotal?'#2ea043':'rgba(255,255,255,.95)',fontFamily:F,display:'inline-flex',alignItems:'baseline',gap:5,direction:'rtl'}}>
{matchesTotal&&<bdi style={{color:'#2ea043'}}>✓</bdi>}
<bdi>{fmtAmt(sumCheck.toFixed(2))}</bdi>
<bdi style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.58)'}}>ريال</bdi>
</span>
</div>
{!matchesTotal&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<span style={{fontSize:10,fontWeight:700,color:C.red,fontFamily:F}}>{sumCheck<total?'ناقص عن الإجمالي':'زائد عن الإجمالي'}</span>
<span style={{fontSize:11,fontWeight:900,color:C.red,fontFamily:F,display:'inline-flex',alignItems:'baseline',gap:4,direction:'rtl'}}>
<bdi>{sumCheck<total?'−':'+'}</bdi>
<bdi>{fmtAmt(Math.abs(total-sumCheck).toFixed(2))}</bdi>
<bdi style={{fontSize:9.5,fontWeight:700,color:'rgba(192,57,43,.7)'}}>ريال</bdi>
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
const SectionTitle=({children})=><div style={{fontSize:11,fontWeight:800,color:C.gold,fontFamily:F,marginBottom:6,paddingBottom:4,borderBottom:'1px solid rgba(212,160,23,.15)'}}>{children}</div>
const Row=({label,value,highlight})=><div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',padding:'3px 0',gap:12}}>
<span style={{fontSize:11,color:'var(--tx5)',fontFamily:F}}>{label}</span>
<span style={{fontSize:12,color:highlight||'var(--tx2)',fontWeight:700,fontFamily:F,textAlign:'left'}}>{value}</span>
</div>
const SummaryCard=({compact})=>(<div className={compact?'':'sr-modal-scroll'} style={compact?{borderRadius:12,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.04)',padding:12}:{flex:1,minHeight:0,overflowY:'auto',display:'flex',flexDirection:'column',gap:14,padding:'16px 14px',border:'1.5px solid rgba(212,160,23,.35)',borderRadius:12,scrollbarWidth:'none',msOverflowStyle:'none'}}>
{compact&&<div style={{fontSize:11,fontWeight:800,color:'var(--tx)',marginBottom:8}}>ملخص الطلب</div>}

{/* Service & client info */}
<div>
<SectionTitle>الخدمة والعميل</SectionTitle>
<Row label="الخدمة" value={svcDesc}/>
{selClient&&<Row label="العميل" value={selClient.name_ar}/>}
{!selClient&&clientMode==='new'&&newClient.name_ar&&<Row label="العميل (جديد)" value={newClient.name_ar}/>}
{selWorker&&<Row label="العامل" value={workerIsClient?`${selWorker.name} (نفس العميل)`:selWorker.name}/>}
{selWorker&&selWorker.iqama_number&&<Row label="رقم الإقامة" value={<span style={{direction:'ltr',display:'inline-block'}}>{selWorker.iqama_number}</span>}/>}
{selWorker&&selWorker.phone&&<Row label="الجوال" value={<span style={{direction:'ltr',display:'inline-block'}}>{selWorker.phone}</span>}/>}
{selBroker&&<Row label="الوسيط" value={selBroker.name_ar}/>}
{!selBroker&&brokerMode==='new'&&newBroker.name_ar&&<Row label="الوسيط (جديد)" value={newBroker.name_ar}/>}
</div>

{/* Kafala transfer details */}
{selSvc==='kafala_transfer'&&<div>
<SectionTitle>بيانات نقل الكفالة</SectionTitle>
{fields.nationality&&<Row label="الجنسية" value={fields.nationality}/>}
{fields.worker_status&&<Row label="حالة العامل" value={fields.worker_status==='valid'?'صالح':fields.worker_status==='huroob'?'هروب':fields.worker_status==='final_exit'?'خروج نهائي':fields.worker_status==='absent'?'منقطع عن العمل':fields.worker_status}/>}
{fields.current_profession&&<Row label="المهنة الحالية" value={fields.current_profession}/>}
{fields.iqama_expiry&&<Row label="تاريخ انتهاء الإقامة" value={<bdi style={{direction:'ltr'}}>{fields.iqama_expiry}{fields.iqama_expiry_hijri&&<span style={{color:'var(--tx4)'}}>{' ('+fields.iqama_expiry_hijri+' هـ)'}</span>}</bdi>}/>}
{fields.work_card_expiry&&<Row label="نهاية كرت العمل" value={<bdi style={{direction:'ltr'}}>{fields.work_card_expiry}{fields.work_card_expiry_hijri&&<span style={{color:'var(--tx4)'}}>{' ('+fields.work_card_expiry_hijri+' هـ)'}</span>}</bdi>}/>}
{fields.birth_date&&<Row label="تاريخ الميلاد" value={<span style={{direction:'ltr',display:'inline-block'}}>{fields.birth_date}</span>}/>}
<Row label="فترة إشعار" value={fields.has_notice_period===true?'نعم':'لا'}/>
<Row label="موافقة صاحب العمل" value={fields.employer_consent===true?'نعم':'لا'}/>
{fields.change_profession===true&&<Row label="تغيير المهنة" value={fields.new_occupation||'نعم'}/>}
{fields.renew_iqama===true&&<>
<Row label="تجديد الإقامة" value="نعم"/>
{fields.renewal_months&&<Row label="مدة التجديد" value={`${fields.renewal_months} أشهر`}/>}
{fields.expected_iqama_months&&<Row label="أشهر الإقامة المتوقعة" value={`${fields.expected_iqama_months} أشهر`}/>}
</>}
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
<div style={{fontSize:10.5,fontWeight:700,color:C.gold,marginBottom:3}}>المجموعة {['الأولى','الثانية','الثالثة','الرابعة'][i]||(i+1)} · {g.count||0}×</div>
<div style={{fontSize:11,color:'var(--tx2)',fontWeight:600}}>{nat} · {prof} · {gen} · {emb}</div>
</div>
})}
{/* File distribution */}
{visaFiles.length>0&&<div style={{marginTop:6,padding:'6px 10px',borderRadius:7,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.05)'}}>
<div style={{fontSize:10.5,fontWeight:700,color:'var(--tx4)',marginBottom:4}}>توزيع الملفات ({visaFiles.length})</div>
<div style={{display:'flex',flexWrap:'wrap',gap:4}}>
{visaFiles.map((f,i)=>{
const fc=Object.values(f.assignments||{}).reduce((s,n)=>s+(parseInt(n)||0),0)
const parts=visaGroups.length>1?Object.entries(f.assignments||{}).filter(([,n])=>(parseInt(n)||0)>0).map(([gid,n])=>{const g=visaGroups.find(x=>x.id===(parseInt(gid)||gid));const nat=g?.nationality?(lkCountries.find(co=>co.id===g.nationality)?.nationality_ar||''):'';return`${n}× ${nat||'مجموعة'}`}).join(' · '):null
return<span key={f.id} style={{display:'inline-flex',alignItems:'center',gap:4,padding:'2px 8px',borderRadius:6,background:'rgba(212,160,23,.1)',border:'1px solid rgba(212,160,23,.22)',fontSize:10.5,fontWeight:700,color:C.gold,fontFamily:F}}>
<span>الملف {['الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر'][i]||(i+1)}: {fc}</span>
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
{fields.region&&<Row label="المنطقة" value={regions.find(r=>r.id===fields.region)?.name_ar||fields.region}/>}
{fields.city&&<Row label="المدينة" value={cities.find(c=>c.id===fields.city)?.name_ar||fields.city}/>}
{fields.contract_months&&<Row label="مدة العقد" value={`${fields.contract_months} أشهر`}/>}
</div>}

{/* Exit/re-entry visa details */}
{selSvc==='exit_reentry_visa'&&<div>
<SectionTitle>بيانات تأشيرة الخروج والعودة</SectionTitle>
{fields.exit_type&&<Row label="نوع التأشيرة" value={fields.exit_type==='multiple'?'متعددة':'مفردة'}/>}
{fields.duration_months&&<Row label="المدة" value={`${fields.duration_months} أشهر`}/>}
</div>}

{/* Final exit visa details */}
{selSvc==='final_exit_visa'&&fields.reason&&<div>
<SectionTitle>بيانات الخروج / بلاغ التغيب</SectionTitle>
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
const docTypes={work_cert:'شهادة عمل',intro_letter:'خطاب تعريف',salary_def:'تعريف راتب',bank_letter:'خطاب بنكي',other:'أخرى'}
return<div>
<SectionTitle>بيانات إصدار المستند</SectionTitle>
{fields.doc_type&&<Row label="نوع المستند" value={docTypes[fields.doc_type]||fields.doc_type}/>}
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
{fields.salary_weeks&&<Row label="مدة الاستمرار" value={`${fields.salary_weeks} أسبوع`}/>}
</div>}

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
<div style={{fontSize:10.5,fontWeight:700,color:'var(--tx4)',marginBottom:3}}>خطة الدفع</div>
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
{paid>0&&paymentMethod==='bank'&&transferReceipt&&<Row label="إيصال الحوالة" value={<span style={{color:'#2ea043',fontWeight:700}}>✓ {transferReceipt.name}</span>}/>}
<Row label="المدفوع" value={<span style={{direction:'rtl',display:'inline-flex',gap:4}}><bdi>{fmtAmt(paid.toFixed(2))}</bdi><bdi style={{fontSize:10,color:'var(--tx5)'}}>ريال</bdi></span>} highlight={paid>0?C.ok:'var(--tx4)'}/>
{effectiveRemaining>0&&<Row label="المتبقي" value={<span style={{direction:'rtl',display:'inline-flex',gap:4}}><bdi>{fmtAmt(effectiveRemaining.toFixed(2))}</bdi><bdi style={{fontSize:10,color:'var(--tx5)'}}>ريال</bdi></span>} highlight={C.red}/>}
</div>

{/* Client note */}
{clientNote&&clientNote.trim()&&<div>
<SectionTitle>ملاحظة للعميل</SectionTitle>
<div style={{fontSize:11.5,color:'var(--tx2)',fontWeight:500,lineHeight:1.6,padding:'4px 2px',whiteSpace:'pre-wrap'}}>{clientNote}</div>
</div>}
</div>)
return<div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column',gap:10}}>
{/* Entry screen — unified payment card, fills available space */}
{!showSummaryScreen&&!showBrokerNoteScreen&&<div style={{display:'flex',flexDirection:'column',gap:14,flex:1,minHeight:0,marginTop:6}}>
{/* المبلغ المدفوع — bordered frame with floating label */}
<div style={{border:'1.5px solid rgba(212,160,23,.35)',borderRadius:12,padding:'14px 14px 12px',position:'relative',flexShrink:0}}>
<div style={{position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F}}>المبلغ المدفوع</div>
<div style={{display:'flex',justifyContent:'flex-end',alignItems:'center',gap:8}}>
<input type="text" inputMode="decimal" value={fmtAmt(paidAmount)}
onChange={e=>{const raw=unfmtAmt(e.target.value);if(raw===''){setPaidAmount('');return}if(!/^\d*\.?\d*$/.test(raw))return;let n=Number(raw);if(isNaN(n))return;if(n<0)n=0;const cap=(VISA_SERVICES.has(selSvc)&&totalOverride!==null)?totalOverride:pricing.total;if(n>cap)n=cap;setPaidAmount(String(n))}}
placeholder="0.00"
style={{width:160,height:42,padding:'0 14px',borderRadius:9,border:'1px solid rgba(255,255,255,.05)',background:'var(--modal-input-bg)',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)',color:C.gold,fontFamily:F,fontSize:16,fontWeight:900,textAlign:'center',direction:'ltr',outline:'none',boxSizing:'border-box'}}/>
<span style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,.58)',fontFamily:F}}>ريال</span>
</div>
{/* Remaining / paid-in-full indicator — floating on bottom-left of frame border */}
{(()=>{const eff=(VISA_SERVICES.has(selSvc)&&totalOverride!==null)?totalOverride:pricing.total;const p=Number(paidAmount)||0;
if(p<eff&&eff>0)return<div style={{position:'absolute',bottom:-9,left:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:11,fontWeight:700,color:C.red,fontFamily:F,direction:'rtl'}}>المتبقي <span style={{direction:'ltr',display:'inline-block'}}>{fmtAmt((eff-p).toFixed(2))}</span> ريال</div>
if(p>=eff&&eff>0)return<div style={{position:'absolute',bottom:-9,left:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:11,fontWeight:700,color:C.ok,fontFamily:F}}>✓ مدفوع بالكامل</div>
return null})()}
</div>
{/* طريقة الدفع — bordered frame with floating label (only when paid amount > 0) */}
{(Number(paidAmount)||0)>0&&<div style={{border:'1.5px solid rgba(212,160,23,.35)',borderRadius:12,padding:'14px 14px 12px',position:'relative',display:'flex',flexDirection:'column',gap:8,flexShrink:0}}>
<div style={{position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F}}>طريقة الدفع</div>
<div style={{display:'flex',gap:8,flexShrink:0}}>
{[{k:'cash',l:'نقداً',icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/></svg>},
{k:'bank',l:'حوالة بنكية',icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M3 10h18"/><path d="M5 6l7-3 7 3"/><path d="M4 10v11"/><path d="M20 10v11"/><path d="M8 14v3"/><path d="M12 14v3"/><path d="M16 14v3"/></svg>}].map(o=>{
const on=paymentMethod===o.k
return<div key={o.k} onClick={()=>setPaymentMethod(o.k)} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,height:36,borderRadius:9,border:`1.5px solid ${on?C.gold:'rgba(255,255,255,.07)'}`,background:on?'linear-gradient(180deg,rgba(212,160,23,.18) 0%,rgba(212,160,23,.06) 100%)':'linear-gradient(180deg,#2C2C2C 0%,#222 100%)',boxShadow:on?'inset 0 1px 0 rgba(212,160,23,.22)':'0 2px 6px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.04)',cursor:'pointer',transition:'.18s',color:on?C.gold:'var(--tx3)'}}>
<span style={{fontSize:13,fontWeight:700,fontFamily:F}}>{o.l}</span>
{o.icon}
</div>
})}
</div>
{/* Row 3: Bank transfer details */}
{paymentMethod==='bank'&&<>
<div style={{display:'flex',gap:10,alignItems:'stretch',flexShrink:0}}
onDragEnter={e=>{e.preventDefault();e.stopPropagation();setReceiptDrag(true)}}
onDragOver={e=>{e.preventDefault();e.stopPropagation();if(!receiptDrag)setReceiptDrag(true)}}
onDragLeave={e=>{e.preventDefault();e.stopPropagation();if(e.currentTarget.contains(e.relatedTarget))return;setReceiptDrag(false)}}
onDrop={e=>{e.preventDefault();e.stopPropagation();setReceiptDrag(false);const f=e.dataTransfer.files?.[0];if(f)setTransferReceipt(f)}}>
<input type="text" value={transferReference} onChange={e=>setTransferReference(e.target.value)} placeholder="الرقم المرجعي للحوالة"
style={{flex:1,height:42,padding:'0 12px',borderRadius:9,border:`1px solid ${receiptDrag?C.gold:(transferReference?'rgba(212,160,23,.25)':'rgba(255,255,255,.08)')}`,background:receiptDrag?'rgba(212,160,23,.08)':'rgba(0,0,0,.2)',color:'var(--tx)',fontFamily:F,fontSize:13,fontWeight:600,outline:'none',direction:'ltr',textAlign:'center',transition:'.2s'}}/>
{!transferReceipt?<label htmlFor="transferReceiptInput" style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:7,padding:'0 14px',height:42,borderRadius:9,border:`1px dashed ${receiptDrag?C.gold:'rgba(212,160,23,.3)'}`,background:receiptDrag?'rgba(212,160,23,.15)':'rgba(212,160,23,.04)',color:C.gold,cursor:'pointer',transition:'.2s',fontFamily:F,fontSize:12.5,fontWeight:700,whiteSpace:'nowrap',transform:receiptDrag?'scale(1.02)':'scale(1)'}}
onMouseEnter={e=>{if(!receiptDrag)e.currentTarget.style.background='rgba(212,160,23,.1)'}}
onMouseLeave={e=>{if(!receiptDrag)e.currentTarget.style.background='rgba(212,160,23,.04)'}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
<span>{receiptDrag?'أفلت الملف هنا':'إيصال'}</span>
<input id="transferReceiptInput" type="file" accept="image/*,application/pdf" onChange={e=>setTransferReceipt(e.target.files?.[0]||null)} style={{display:'none'}}/>
</label>
:<div title={transferReceipt.name} style={{display:'inline-flex',alignItems:'center',gap:7,padding:'0 12px',height:42,borderRadius:9,border:'1px solid rgba(46,160,67,.25)',background:'rgba(46,160,67,.06)',color:'#2ea043',fontFamily:F,fontSize:12.5,fontWeight:700,whiteSpace:'nowrap'}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
<span style={{maxWidth:100,overflow:'hidden',textOverflow:'ellipsis'}}>{transferReceipt.name}</span>
<button type="button" onClick={()=>setTransferReceipt(null)} style={{width:22,height:22,borderRadius:5,border:'none',background:'rgba(192,57,43,.15)',color:C.red,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}}>
<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
</button>
</div>}
</div>
{/* Bank account: search + single card (closest match or selected) */}
{!selBankAcc&&<input value={bankAccSearch} onChange={e=>setBankAccSearch(e.target.value)} placeholder="ابحث باسم البنك أو الحساب أو IBAN..." style={{width:'100%',height:40,padding:'0 14px',border:'1px solid rgba(255,255,255,.05)',borderRadius:9,fontFamily:F,fontSize:12.5,fontWeight:600,color:'var(--tx)',background:'var(--modal-input-bg)',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)',outline:'none',textAlign:'right',boxSizing:'border-box',flexShrink:0}}/>}
<div style={{display:'flex',flexDirection:'column',gap:8,flexShrink:0}}>
{(()=>{let filtered;if(selBankAcc){filtered=bankAccounts.filter(a=>a.id===selBankAcc)}else if(bankAccSearch){const q=bankAccSearch.toLowerCase();filtered=bankAccounts.filter(a=>(a.bank_name||'').toLowerCase().includes(q)||(a.account_name||'').toLowerCase().includes(q)||(a.iban||'').toLowerCase().includes(q)||(a.account_number||'').includes(bankAccSearch)).slice(0,1)}else{filtered=bankAccounts.slice(0,1)}
if(filtered.length===0)return<div style={{padding:'14px',textAlign:'center',fontSize:11,color:'rgba(255,255,255,.5)',border:'1px dashed rgba(255,255,255,.1)',borderRadius:9,background:'rgba(0,0,0,.12)'}}>لا توجد نتائج</div>;
return filtered.map(a=>{const sel=selBankAcc===a.id;return<div key={a.id} onClick={()=>setSelBankAcc(sel?'':a.id)} style={{padding:'8px 12px 8px 36px',borderRadius:10,cursor:'pointer',display:'flex',alignItems:'center',gap:12,position:'relative',
border:sel?'1px solid rgba(212,160,23,.4)':'1px solid rgba(255,255,255,.06)',
background:sel?'rgba(212,160,23,.06)':'rgba(255,255,255,.03)',
transition:'all .2s'}}
onMouseEnter={e=>{if(!sel){e.currentTarget.style.background='rgba(212,160,23,.05)';e.currentTarget.style.borderColor='rgba(212,160,23,.18)'}}}
onMouseLeave={e=>{if(!sel){e.currentTarget.style.background='rgba(255,255,255,.03)';e.currentTarget.style.borderColor='rgba(255,255,255,.06)'}}}>
{sel&&<div style={{position:'absolute',top:'50%',left:8,transform:'translateY(-50%)',width:20,height:20,borderRadius:'50%',background:C.gold,display:'flex',alignItems:'center',justifyContent:'center'}}>
<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
</div>}
<div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:7}}>
<div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
<span style={{fontSize:13,fontWeight:800,color:sel?C.gold:'rgba(255,255,255,.95)'}}>{a.bank_name}</span>
{a.is_primary&&<span style={{fontSize:9,color:C.gold,fontWeight:700,padding:'1px 6px',borderRadius:5,background:'rgba(212,160,23,.12)',border:'1px solid rgba(212,160,23,.25)'}}>رئيسي</span>}
{a.account_name&&<span style={{fontSize:10.5,color:'rgba(255,255,255,.58)'}}>· {a.account_name}</span>}
</div>
<div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',fontSize:10,color:'rgba(255,255,255,.5)',fontFamily:'monospace',justifyContent:'flex-start'}}>
{a.account_number&&<span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'1px 6px',borderRadius:5,background:'rgba(255,255,255,.04)',direction:'ltr'}}>
<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
{a.account_number}
</span>}
{a.iban&&<span style={{direction:'ltr'}}>{a.iban}</span>}
</div>
</div>
</div>})})()}
</div>
</>}
</div>}
</div>}

{/* Broker + Notes sub-step (only for kafala_transfer and visa services) */}
{showBrokerNoteScreen&&<div style={{display:'flex',flexDirection:'column',gap:14,marginTop:6,flex:1,minHeight:0}}>
{/* ── Broker fieldset (collapsed by default — opens via the icon) ── */}
<div style={{position:'relative',border:'1.5px solid rgba(212,160,23,.35)',borderRadius:12,padding:brokerOpen?'18px 14px 14px':'14px 14px',marginTop:10,display:'flex',flexDirection:'column',gap:10}}>
{/* Legend on the border */}
<div style={{position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 10px',display:'inline-flex',alignItems:'center',gap:7,fontFamily:F}}>
<span style={{fontSize:12,fontWeight:600,color:C.bentoGold}}>الوسيط</span>
<span style={{fontSize:10,fontWeight:600,color:'rgba(255,255,255,.4)'}}>(اختياري)</span>
<button onClick={()=>{setBrokerOpen(o=>{const next=!o;if(!next){setSelBroker(null);setBrokerMode('existing');setBrokerQ('');setNewBroker({name_ar:'',name_en:'',phone:'',id_number:'',nationality_id:''})}return next})}} title={brokerOpen?'إغلاق':'إضافة وسيط'} style={{width:22,height:22,borderRadius:6,border:'1px solid rgba(212,160,23,.45)',background:'rgba(212,160,23,.12)',color:C.bentoGold,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',padding:0,transition:'.15s'}}>
{brokerOpen?<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>:<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
</button>
</div>
{!brokerOpen&&<div style={{fontSize:11,color:'var(--tx5)',fontFamily:F,textAlign:'center',padding:'2px 0'}}>اضغط على + لإضافة وسيط</div>}
{brokerOpen&&<>
{/* Search + new broker button — mirrors client UI */}
{!selBroker&&brokerMode!=='new'&&<div style={{display:'flex',alignItems:'stretch',gap:8,flexShrink:0}}>
<div style={{position:'relative',flex:1,minWidth:0}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{position:'absolute',top:'50%',right:14,transform:'translateY(-50%)',pointerEvents:'none'}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
<input value={brokerQ} onChange={e=>setBrokerQ(e.target.value)} placeholder="ابحث باسم الوسيط أو الجوال..." style={{width:'100%',height:40,padding:'0 40px 0 14px',border:'1px solid rgba(255,255,255,.05)',borderRadius:9,fontFamily:F,fontSize:12.5,fontWeight:600,color:'var(--tx)',background:'var(--modal-input-bg)',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)',outline:'none',textAlign:'right',boxSizing:'border-box'}}/>
</div>
{brokerMode!=='new'&&<button onClick={()=>{setBrokerMode('new');setNewBroker(p=>({...p,name_ar:/[\u0600-\u06FF]/.test(brokerQ)?brokerQ:p.name_ar,phone:/^[0-9+]+$/.test(brokerQ)?brokerQ:p.phone,id_number:/^\d{10}$/.test(brokerQ)?brokerQ:p.id_number}))}} style={{height:40,padding:'0 14px',background:'transparent',border:'1.3px dashed rgba(212,160,23,.55)',borderRadius:9,color:C.bentoGold,fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6,flexShrink:0,transition:'.15s',whiteSpace:'nowrap'}} onMouseEnter={e=>{e.currentTarget.style.background='rgba(212,160,23,.07)';e.currentTarget.style.borderColor='rgba(212,160,23,.85)'}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='rgba(212,160,23,.55)'}}>
<span>وسيط جديد</span>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
</button>}
</div>}

{/* Existing broker list */}
{brokerMode!=='new'&&<div style={{display:'flex',flexDirection:'column',gap:8}}>
{(()=>{const filtered=selBroker?[selBroker]:(brokerQ?brokers.filter(b=>(b.name_ar||'').includes(brokerQ)||(b.phone||'').includes(brokerQ)||(b.id_number||'').includes(brokerQ)).slice(0,2):brokers.slice(0,2));
if(filtered.length===0)return<div style={{padding:'10px 14px',borderRadius:9,background:'var(--modal-input-bg)',border:'1px solid rgba(255,255,255,.05)',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(212,160,23,.65)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
<span style={{fontSize:11,color:'var(--tx4)',fontWeight:600,fontFamily:F}}>لا يوجد وسيط بهذا البحث — أضف من الأعلى</span>
</div>;
return filtered.map(b=>{const sel=selBroker?.id===b.id;
const country=b.nationality_id?lkCountries.find(co=>co.id===b.nationality_id):null
const rawCode=(country?.code||country?.flag_emoji||'SA').toString().trim().toUpperCase()
const flagCode=/^[A-Z]{2}$/.test(rawCode)?rawCode:'SA'
const flagUrl=`https://flagcdn.com/w80/${flagCode.toLowerCase()}.png`
const natLabel=country?.nationality_ar||'سعودي'
return<div key={b.id} onClick={()=>setSelBroker(sel?null:b)} style={{padding:'12px 16px',borderRadius:12,cursor:'pointer',display:'flex',alignItems:'center',gap:14,position:'relative',
border:sel?'1px solid rgba(212,160,23,.25)':'1px solid rgba(255,255,255,.06)',
background:sel?'rgba(212,160,23,.04)':'rgba(255,255,255,.03)',
transition:'all .22s ease'}}
onMouseEnter={e=>{if(!sel){e.currentTarget.style.background='rgba(212,160,23,.07)';e.currentTarget.style.borderColor='rgba(212,160,23,.2)'}}}
onMouseLeave={e=>{if(!sel){e.currentTarget.style.background='rgba(255,255,255,.03)';e.currentTarget.style.borderColor='rgba(255,255,255,.06)'}}}>
{sel&&<div style={{position:'absolute',top:8,left:8,width:20,height:20,borderRadius:'50%',background:C.bentoGold,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px rgba(212,160,23,.45)'}}>
<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
</div>}
<div title={natLabel} style={{width:sel?52:48,height:sel?52:48,borderRadius:12,background:'rgba(0,0,0,.25)',border:sel?'1.5px solid rgba(212,160,23,.4)':'1px solid rgba(255,255,255,.08)',flexShrink:0,transition:'.25s',boxShadow:sel?'0 2px 8px rgba(212,160,23,.15)':'none',position:'relative',overflow:'hidden'}}>
<img src={flagUrl} alt={natLabel} loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
</div>
<div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:5}}>
<div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
<span style={{fontSize:15,fontWeight:800,color:sel?C.gold:'rgba(255,255,255,.95)',letterSpacing:'-.2px'}}>{b.name_ar}</span>
</div>
<div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
{b.id_number&&<span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:11,color:'var(--tx4)',fontWeight:600,padding:'3px 8px',borderRadius:6,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.05)'}}>
<CreditCard size={11} strokeWidth={1.8}/>
<span style={{direction:'ltr'}}>{b.id_number}</span>
</span>}
{b.phone&&<span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:11,color:'var(--tx4)',fontWeight:600,padding:'3px 8px',borderRadius:6,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.05)'}}>
<Phone size={11} strokeWidth={1.8}/>
<span style={{direction:'ltr'}}>{fmtPhone(b.phone)}</span>
</span>}
</div>
</div>
</div>})})()}
</div>}

{/* New broker form — mirrors new client form exactly */}
{brokerMode==='new'&&(()=>{
const regLblS={fontSize:14,fontWeight:500,color:'rgba(255,255,255,.6)',marginBottom:8,textAlign:'start'};
const regInpS={width:'100%',height:42,padding:'0 14px',border:'1px solid rgba(255,255,255,.07)',borderRadius:10,fontFamily:F,fontSize:14,fontWeight:500,color:'var(--tx)',background:'var(--modal-input-bg)',outline:'none',textAlign:'center',boxSizing:'border-box',boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'};
return <div style={{border:'1.5px solid rgba(212,160,23,.35)',borderRadius:12,padding:'18px 14px 14px',position:'relative',display:'flex',flexDirection:'column',gap:12,marginTop:11}}>
<div style={{position:'absolute',top:-9,right:14,background:'var(--modal-bg)',padding:'0 8px',fontSize:12,fontWeight:600,color:C.bentoGold,fontFamily:F}}>تسجيل وسيط جديد</div>
<button onClick={()=>{setBrokerMode('existing');setBrokerQ('');setNewBroker({name_ar:'',name_en:'',phone:'',id_number:'',nationality_id:''});setNatOpenBroker(false);setNatSearchBroker('')}} style={{position:'absolute',top:-11,left:14,height:22,padding:'0 10px',borderRadius:6,border:'1px solid rgba(192,57,43,.3)',background:'var(--modal-bg)',color:C.red,cursor:'pointer',fontSize:10,fontFamily:F,fontWeight:700}}>إلغاء</button>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div>
<div style={regLblS}>الاسم بالعربي <span style={{color:C.red}}>*</span></div>
<input value={newBroker.name_ar} onChange={e=>{const v=e.target.value.replace(/[^\u0600-\u06FF\s]/g,'').replace(/\s+/g,' ').split(' ').slice(0,3).join(' ');setNewBroker(p=>({...p,name_ar:v}))}} placeholder="الاسم الأول والأخير" style={regInpS}/>
</div>
<div>
<div style={regLblS}>الاسم بالإنجليزي <span style={{color:C.red}}>*</span></div>
<input value={newBroker.name_en} onChange={e=>{const v=e.target.value.replace(/[^A-Za-z\s]/g,'').replace(/\s+/g,' ').split(' ').slice(0,3).join(' ');setNewBroker(p=>({...p,name_en:v}))}} placeholder="First and Last Name" style={{...regInpS,direction:'ltr'}}/>
</div>
<div>
<div style={regLblS}>الجنسية <span style={{color:C.red}}>*</span></div>
<div style={{position:'relative'}}>
<div ref={natTriggerBrokerRef} onClick={openNatBrokerDropdown} style={{width:'100%',height:42,padding:'0 14px',border:'1px solid rgba(255,255,255,.05)',borderRadius:9,fontFamily:F,fontSize:13,fontWeight:600,color:newBroker.nationality_id?'rgba(255,255,255,.95)':'rgba(255,255,255,.38)',background:'var(--modal-input-bg)',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',boxSizing:'border-box'}}>
<span style={{flex:1,textAlign:'center'}}>{(()=>{if(!newBroker.nationality_id)return'اختر الجنسية';const f=lkCountries.find(co=>co.id===newBroker.nationality_id);return f?f.nationality_ar:'اختر الجنسية'})()}</span>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{flexShrink:0,transform:natOpenBroker?'rotate(180deg)':'none',transition:'.2s'}}><polyline points="6 9 12 15 18 9" stroke={C.bentoGold} strokeWidth="2.5" fill="none"/></svg>
</div>
{natOpenBroker&&<><div onClick={()=>{setNatOpenBroker(false);setNatSearchBroker('')}} style={{position:'fixed',inset:0,zIndex:9998}}/>
<div style={{position:'fixed',top:natPosBroker.top,left:natPosBroker.left,width:natPosBroker.width,background:'var(--modal-bg)',border:'1px solid rgba(255,255,255,.05)',borderRadius:9,maxHeight:220,display:'flex',flexDirection:'column',zIndex:9999,boxShadow:'0 8px 32px rgba(0,0,0,.6)',overflow:'hidden'}}>
<div style={{padding:'6px 8px',borderBottom:'1px solid rgba(255,255,255,.05)',flexShrink:0}}>
<input value={natSearchBroker} onChange={e=>setNatSearchBroker(e.target.value)} placeholder="بحث..." autoFocus style={{width:'100%',height:30,padding:'0 10px',border:'1px solid rgba(255,255,255,.05)',borderRadius:7,background:'var(--modal-input-bg)',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)',fontFamily:F,fontSize:11,fontWeight:500,color:'var(--tx2)',outline:'none',textAlign:'center',boxSizing:'border-box'}}/>
</div>
<div style={{flex:1,overflowY:'auto',scrollbarWidth:'none'}}>
{lkCountries.filter(co=>!natSearchBroker||(co.nationality_ar||'').includes(natSearchBroker)).map(co=><div key={co.id} onClick={()=>{setNewBroker(p=>({...p,nationality_id:co.id}));setNatOpenBroker(false);setNatSearchBroker('')}} style={{padding:'10px 14px',fontSize:13,fontWeight:newBroker.nationality_id===co.id?700:500,color:newBroker.nationality_id===co.id?C.bentoGold:'rgba(255,255,255,.7)',cursor:'pointer',textAlign:'center',borderBottom:'1px solid var(--bd2)',background:newBroker.nationality_id===co.id?'rgba(212,160,23,.06)':'transparent'}}>{co.nationality_ar}</div>)}
{lkCountries.filter(co=>!natSearchBroker||(co.nationality_ar||'').includes(natSearchBroker)).length===0&&<div style={{padding:12,textAlign:'center',fontSize:10,color:'var(--tx5)'}}>لا توجد نتائج</div>}
</div>
</div></>}
</div>
</div>
<div>
<div style={regLblS}>رقم الهوية <span style={{color:C.red}}>*</span></div>
<input value={newBroker.id_number} onChange={e=>{const v=e.target.value.replace(/[^0-9]/g,'').slice(0,10);setNewBroker(p=>({...p,id_number:v}))}} placeholder="XXXXXXXXXX" inputMode="numeric" maxLength={10} style={{...regInpS,direction:'ltr'}}/>
</div>
<div>
<div style={regLblS}>رقم الجوال <span style={{color:C.red}}>*</span></div>
<div style={{display:'flex',direction:'ltr',border:'1px solid rgba(255,255,255,.05)',borderRadius:9,overflow:'hidden',background:'var(--modal-input-bg)',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)'}}>
<div style={{height:42,padding:'0 10px',background:'rgba(255,255,255,.04)',borderRight:'1px solid rgba(255,255,255,.05)',display:'flex',alignItems:'center',fontSize:12,fontWeight:700,color:C.bentoGold,flexShrink:0,fontFamily:F}}>+966</div>
<input value={(()=>{const r=newBroker.phone;if(!r)return'';if(r.length<=2)return r;if(r.length<=5)return r.slice(0,2)+' '+r.slice(2);return r.slice(0,2)+' '+r.slice(2,5)+' '+r.slice(5)})()} onChange={e=>{const v=e.target.value.replace(/[^0-9]/g,'').slice(0,9);setNewBroker(p=>({...p,phone:v}))}} placeholder="5X XXX XXXX" inputMode="numeric" maxLength={12} style={{width:'100%',height:42,padding:'0 12px',border:'none',background:'transparent',fontFamily:F,fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',textAlign:'left'}}/>
</div>
</div>
</div>
</div>;
})()}
</>}
</div>
{brokerMode!=='new'&&<div style={{display:'flex',flexDirection:'column',gap:6,...(brokerOpen?{flexShrink:0}:{flex:1,minHeight:0})}}>
<div style={{fontSize:11.5,fontWeight:700,color:'rgba(255,255,255,.58)',fontFamily:F,display:'flex',alignItems:'center',gap:6,flexShrink:0}}>ملاحظة <span style={{fontSize:10,fontWeight:600,color:'rgba(255,255,255,.35)'}}>(اختيارية)</span></div>
<textarea value={clientNote} onChange={e=>setClientNote(e.target.value)} placeholder="أدخل ملاحظة تظهر في الفاتورة..." rows={brokerOpen?1:6} style={{width:'100%',padding:'10px 14px',border:'1px solid rgba(255,255,255,.05)',borderRadius:9,fontFamily:F,fontSize:12.5,fontWeight:600,color:'var(--tx)',background:'var(--modal-input-bg)',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)',outline:'none',resize:'none',textAlign:'right',boxSizing:'border-box',display:'block',lineHeight:'1.5',...(brokerOpen?{}:{flex:1,minHeight:0,height:'auto'})}}/>
</div>}
</div>}

{/* Summary screen — full summary, last step before submission */}
{showSummaryScreen&&<SummaryCard compact={false}/>}
{/* Old standalone receipt block — kept for structure, but now shows nothing since merged above */}
{false&&<div style={{display:'none'}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
<span style={{fontSize:12,fontWeight:800,color:'var(--tx)',fontFamily:F}}>إيصال الحوالة البنكية</span>
<span style={{fontSize:10,color:C.red,fontWeight:700}}>*</span>
</div>
{!transferReceipt?<label htmlFor="transferReceiptInput" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'14px',borderRadius:8,border:'1px dashed rgba(212,160,23,.25)',background:'rgba(212,160,23,.02)',color:C.gold,cursor:'pointer',transition:'.2s',fontFamily:F,fontSize:11.5,fontWeight:700}}
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
<div style={{fontSize:12,fontWeight:700,color:'var(--tx)',fontFamily:F,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{transferReceipt.name}</div>
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
</div>
</div>

{/* ── Footer ── */}
<div style={{padding:'14px 24px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0,gap:12}}>
<div style={{display:'flex',gap:8}}>
{step===1?(showOthers?<button onClick={()=>setShowOthers(false)} className="sr-back-btn">
<span>السابق</span>
<span className="nav-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>
</button>:<div/>)
:<button onClick={goBack} className="sr-back-btn">
<span>السابق</span>
<span className="nav-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>
</button>}
</div>

{err&&<div style={{fontSize:11,color:C.red,fontWeight:600,flex:1,textAlign:'center'}}>{err}</div>}

<div>
{(step<5||(step===5&&!showSummaryScreen))?<button onClick={goNext} className="sr-next-btn dir-fwd">
<span>التالي</span>
<span className="nav-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg></span>
</button>
:<button onClick={handleSubmit} disabled={saving} className="sr-next-btn dir-fwd" style={{opacity:saving?.6:1,cursor:saving?'wait':'pointer'}}>
<span>{saving?'جاري الإصدار...':'إصدار'}</span>
<span className="nav-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg></span>
</button>}
</div>
</div>

</div>
}
