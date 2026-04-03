import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
const F="'Cairo','Tajawal',sans-serif"
const C={gold:'#c9a84c',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}
const nm=v=>Number(v||0).toLocaleString('en-US')

export default function ManpowerPage({sb,toast,user,lang}){
const T=(a,e)=>lang==='ar'?a:e
const[tab,setTab]=useState('dashboard')
const[projects,setProjects]=useState([]);const[workers,setWorkers]=useState([]);const[extracts,setExtracts]=useState([])
const[partners,setPartners]=useState([]);const[commissions,setCommissions]=useState([]);const[loading,setLoading]=useState(true)
const[viewProject,setViewProject]=useState(null);const[viewTab,setViewTab]=useState('info')
const[projWorkers,setProjWorkers]=useState([]);const[projExtracts,setProjExtracts]=useState([])

const load=useCallback(async()=>{setLoading(true)
const[p,w,e,pt,cm]=await Promise.all([
  sb.from('mp_projects').select('*').is('deleted_at',null).order('created_at',{ascending:false}),
  sb.from('mp_project_workers').select('*,worker:worker_id(name_ar,phone,iqama_number,nationality)').eq('status','active'),
  sb.from('mp_extracts').select('*,project:project_id(name_ar,project_number)').order('period_from',{ascending:false}),
  sb.from('mp_partners').select('*').eq('is_active',true),
  sb.from('mp_commission_payments').select('*,partner:partner_id(name_ar),project:project_id(name_ar)').order('created_at',{ascending:false})
])
setProjects(p.data||[]);setWorkers(w.data||[]);setExtracts(e.data||[]);setPartners(pt.data||[]);setCommissions(cm.data||[]);setLoading(false)
},[sb])
useEffect(()=>{load()},[load])

const openProject=async(p)=>{setViewProject(p);setViewTab('info')
const[pw,pe]=await Promise.all([
  sb.from('mp_project_workers').select('*,worker:worker_id(name_ar,phone,iqama_number,nationality)').eq('project_id',p.id),
  sb.from('mp_extracts').select('*').eq('project_id',p.id).order('period_from',{ascending:false})
])
setProjWorkers(pw.data||[]);setProjExtracts(pe.data||[])}

const activeProjects=projects.filter(p=>p.status==='active')
const totalAssigned=workers.length
const totalSalaries=extracts.filter(e=>e.total_salaries).reduce((s,e)=>s+Number(e.total_salaries||0),0)
const totalExtractAmt=extracts.reduce((s,e)=>s+Number(e.gross_amount||0),0)
const pendingExtracts=extracts.filter(e=>['draft','submitted','client_approved'].includes(e.status))
const stClr={active:C.ok,paused:'#e67e22',completed:C.blue,draft:'#888',cancelled:C.red}
const stLabel={active:T('نشط','Active'),paused:T('معلّق','Paused'),completed:T('مكتمل','Done'),draft:T('مسودة','Draft'),cancelled:T('ملغي','Cancelled')}
const extStClr={draft:'#888',submitted:C.gold,client_approved:C.blue,paid:C.ok,disputed:C.red}
const extStLabel={draft:T('مسودة','Draft'),submitted:T('مرسل','Sent'),client_approved:T('معتمد','Approved'),paid:T('مصروف','Paid'),disputed:T('متنازع','Disputed')}

if(loading)return<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>
return<div style={{fontFamily:F,direction:lang==='ar'?'rtl':'ltr'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
<div><div style={{fontSize:22,fontWeight:800,color:'var(--tx)'}}>🏗 {T('المانباور','Manpower')}</div>
<div style={{fontSize:12,color:'var(--tx4)',marginTop:4}}>{T('إدارة مشاريع توفير العمالة والمستخلصات','Manpower projects, extracts & payroll')}</div></div>
</div>

{/* Layout: side tabs + content */}
<div style={{display:'flex',gap:0,minHeight:400}}>
{/* Side sub-tabs */}
<div style={{width:110,flexShrink:0,borderLeft:lang==='ar'?'1px solid rgba(255,255,255,.06)':'none',borderRight:lang!=='ar'?'1px solid rgba(255,255,255,.06)':'none',padding:'4px 6px'}}>
{[{id:'dashboard',l:T('لوحة التحكم','Dashboard'),ic:'📊'},{id:'projects',l:T('المشاريع','Projects'),ic:'📁',n:projects.length},{id:'workers',l:T('العمال','Workers'),ic:'👷',n:totalAssigned},{id:'extracts',l:T('المستخلصات','Extracts'),ic:'📄',n:extracts.length},{id:'partners',l:T('الشراكات','Partners'),ic:'🤝',n:partners.length}].map(t=>
<div key={t.id} onClick={()=>setTab(t.id)} style={{padding:'8px 10px',borderRadius:8,marginBottom:2,fontSize:10,fontWeight:tab===t.id?700:500,color:tab===t.id?C.gold:'rgba(255,255,255,.3)',background:tab===t.id?'rgba(201,168,76,.06)':'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',borderRight:lang==='ar'&&tab===t.id?'2px solid '+C.gold:'2px solid transparent',borderLeft:lang!=='ar'&&tab===t.id?'2px solid '+C.gold:'2px solid transparent'}}>
<span style={{display:'flex',alignItems:'center',gap:4}}><span style={{fontSize:10}}>{t.ic}</span>{t.l}</span>
{t.n>0&&<span style={{fontSize:8,fontWeight:700,color:tab===t.id?C.gold:'rgba(255,255,255,.15)',background:tab===t.id?'rgba(201,168,76,.1)':'rgba(255,255,255,.04)',padding:'1px 5px',borderRadius:6}}>{t.n}</span>}
</div>)}
</div>
{/* Content */}
<div style={{flex:1}}>

{/* ═══ DASHBOARD ═══ */}
{tab==='dashboard'&&<div>
<div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:18}}>
{[[T('مشاريع','Projects'),projects.length,C.gold,'📁'],[T('نشطة','Active'),activeProjects.length,C.ok,'🟢'],[T('عمال معيّنين','Assigned'),totalAssigned,C.blue,'👷'],[T('رواتب الشهر','Salaries'),nm(totalSalaries),'#e67e22','💰'],[T('مستخلصات معلّقة','Pending'),nm(pendingExtracts.reduce((s,e)=>s+Number(e.gross_amount||0),0)),C.red,'📄']].map(([l,v,c,ic],i)=>
<div key={i} style={{padding:'14px',borderRadius:12,background:c+'08',border:'1px solid '+c+'15',textAlign:'center'}}>
<div style={{fontSize:16}}>{ic}</div><div style={{fontSize:20,fontWeight:800,color:c,marginTop:4}}>{v}</div><div style={{fontSize:9,color:c,opacity:.6}}>{l}</div>
</div>)}
</div>
{/* Active projects + recent extracts */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
<div style={{borderRadius:12,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',padding:16}}>
<div style={{fontSize:12,fontWeight:700,color:'var(--tx3)',marginBottom:12}}>{T('المشاريع النشطة','Active Projects')}</div>
{activeProjects.map(p=>{const wc=workers.filter(w=>w.project_id===p.id).length;const isCom=p.management_type==='commission'
return<div key={p.id} onClick={()=>{openProject(p);setTab('projects')}} style={{padding:'10px 12px',borderRadius:8,background:isCom?'rgba(230,126,34,.03)':'rgba(39,160,70,.03)',border:'1px solid '+(isCom?'rgba(230,126,34,.08)':'rgba(39,160,70,.08)'),marginBottom:6,cursor:'pointer'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<span style={{fontSize:12,fontWeight:700,color:'var(--tx2)'}}>{p.name_ar}</span>
<span style={{fontSize:8,padding:'2px 6px',borderRadius:4,background:isCom?'rgba(230,126,34,.1)':'rgba(39,160,70,.1)',color:isCom?'#e67e22':C.ok}}>{isCom?T('عمولة','Commission'):T('مباشر','Direct')}</span>
</div>
<div style={{fontSize:10,color:'var(--tx5)',marginTop:3}}>{p.city||''} · {wc} {T('عامل','workers')}{isCom&&p.commission_pct?' · '+p.commission_pct+'%':''}</div>
</div>})}
</div>
<div style={{borderRadius:12,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',padding:16}}>
<div style={{fontSize:12,fontWeight:700,color:'var(--tx3)',marginBottom:12}}>{T('آخر المستخلصات','Recent Extracts')}</div>
{extracts.slice(0,5).map(e=>{const ec=extStClr[e.status]||'#888'
return<div key={e.id} style={{padding:'8px 10px',borderRadius:8,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd2)',marginBottom:4,display:'flex',alignItems:'center',gap:8}}>
<span style={{fontSize:10,fontWeight:700,color:C.gold,direction:'ltr'}}>{e.extract_number}</span>
<span style={{fontSize:10,color:'var(--tx3)',flex:1}}>{e.project?.name_ar||''}</span>
<span style={{fontSize:11,fontWeight:700,color:C.gold}}>{nm(e.gross_amount)}</span>
<span style={{fontSize:8,padding:'2px 6px',borderRadius:4,background:ec+'12',color:ec}}>{extStLabel[e.status]||e.status}</span>
</div>})}
</div>
</div>
</div>}

{/* ═══ PROJECTS ═══ */}
{tab==='projects'&&!viewProject&&<div>
<div style={{display:'flex',flexDirection:'column',gap:10}}>
{projects.map(p=>{const wc=workers.filter(w=>w.project_id===p.id).length;const pExts=extracts.filter(e=>e.project_id===p.id);const totalExt=pExts.reduce((s,e)=>s+Number(e.gross_amount||0),0);const totalSal=pExts.reduce((s,e)=>s+Number(e.total_salaries||0),0);const profit=pExts.reduce((s,e)=>s+Number(e.profit_amount||0),0);const isCom=p.management_type==='commission';const sc=stClr[p.status]||'#888';const progPct=p.start_date&&p.end_date?Math.min(100,Math.round((Date.now()-new Date(p.start_date))/(new Date(p.end_date)-new Date(p.start_date))*100)):0
return<div key={p.id} onClick={()=>openProject(p)} style={{padding:'18px',borderRadius:14,background:'rgba(255,255,255,.02)',border:`1px solid ${isCom?'rgba(230,126,34,.12)':'rgba(255,255,255,.06)'}`,cursor:'pointer'}} onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,.04)'} onMouseOut={e=>e.currentTarget.style.background='rgba(255,255,255,.02)'}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
<div style={{display:'flex',alignItems:'center',gap:8}}>
<span style={{fontSize:15,fontWeight:800,color:'var(--tx)'}}>{p.name_ar}</span>
<span style={{fontSize:8,padding:'2px 6px',borderRadius:4,background:sc+'12',color:sc}}>{stLabel[p.status]}</span>
<span style={{fontSize:8,padding:'2px 6px',borderRadius:4,background:isCom?'rgba(230,126,34,.1)':'rgba(39,160,70,.1)',color:isCom?'#e67e22':C.ok}}>{isCom?T('عمولة','Comm.'):T('مباشر','Direct')}</span>
</div>
<span style={{fontSize:10,color:'var(--tx5)'}}>{p.city||''}</span>
</div>
<div style={{fontSize:10,color:'var(--tx4)',marginBottom:10}}>{T('العميل:','Client:')} {p.client_name}{isCom?' · '+T('العمولة:','Comm:')+' '+p.commission_pct+'%':''}</div>
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:10}}>
{[[wc+' '+T('عامل','workers'),C.blue],[nm(totalExt)+' '+T('مستخلص','extract'),C.gold],[isCom?nm(pExts.reduce((s,e)=>s+Number(e.commission_amount||0),0))+' '+T('عمولة','comm'):nm(totalSal)+' '+T('رواتب','sal'),'#e67e22'],[isCom?'':nm(profit)+' '+T('ربح','profit'),C.ok]].filter(([v])=>v).map(([v,c],i)=>
<div key={i} style={{fontSize:10,fontWeight:700,color:c}}>{v}</div>)}
</div>
{progPct>0&&<div style={{display:'flex',alignItems:'center',gap:6}}>
<div style={{flex:1,height:3,borderRadius:2,background:'rgba(255,255,255,.06)',overflow:'hidden'}}><div style={{height:'100%',width:progPct+'%',borderRadius:2,background:progPct>=100?C.ok:C.gold}}/></div>
<span style={{fontSize:9,color:'var(--tx5)'}}>{progPct}%</span>
</div>}
</div>})}
</div>
</div>}

{/* ═══ PROJECT DETAIL (Side Panel) ═══ */}
{tab==='projects'&&viewProject&&(()=>{const p=viewProject;const isCom=p.management_type==='commission';const sc=stClr[p.status]||'#888'
return<div>
<button onClick={()=>setViewProject(null)} style={{height:34,padding:'0 14px',borderRadius:8,border:'1px solid var(--bd)',background:'transparent',color:'var(--tx4)',fontFamily:F,fontSize:11,fontWeight:600,cursor:'pointer',marginBottom:16}}>← {T('رجوع','Back')}</button>
<div style={{padding:20,borderRadius:14,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',marginBottom:16}}>
<div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
<div><div style={{fontSize:18,fontWeight:800,color:'var(--tx)'}}>{p.name_ar}</div>
<div style={{fontSize:11,color:'var(--tx4)',marginTop:3}}>{p.client_name} · {p.city||''}</div></div>
<div style={{display:'flex',gap:6}}><span style={{fontSize:9,padding:'3px 8px',borderRadius:6,background:sc+'12',color:sc}}>{stLabel[p.status]}</span><span style={{fontSize:9,padding:'3px 8px',borderRadius:6,background:isCom?'rgba(230,126,34,.1)':'rgba(39,160,70,.1)',color:isCom?'#e67e22':C.ok}}>{isCom?T('عمولة '+p.commission_pct+'%','Comm'):T('مباشر','Direct')}</span></div>
</div>
</div>
{/* Tabs */}
<div style={{display:'flex',gap:4,marginBottom:14}}>
{[{v:'info',l:T('البيانات','Info')},{v:'workers',l:T('العمال','Workers'),n:projWorkers.length},{v:'extracts',l:T('المستخلصات','Extracts'),n:projExtracts.length},{v:'finance',l:T('المالية','Finance')}].map(t=>
<div key={t.v} onClick={()=>setViewTab(t.v)} style={{padding:'8px 14px',borderRadius:8,fontSize:11,fontWeight:viewTab===t.v?700:500,color:viewTab===t.v?C.gold:'rgba(255,255,255,.4)',background:viewTab===t.v?'rgba(201,168,76,.08)':'transparent',border:viewTab===t.v?'1.5px solid rgba(201,168,76,.15)':'1px solid rgba(255,255,255,.06)',cursor:'pointer'}}>
{t.l}{t.n!==undefined&&<span style={{fontSize:9,opacity:.6}}> ({t.n})</span>}</div>)}
</div>
<div style={{background:'rgba(255,255,255,.02)',borderRadius:12,border:'1px solid var(--bd)',padding:16,minHeight:200}}>
{viewTab==='info'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
{[[T('رقم المشروع','Project#'),p.project_number],[T('العميل','Client'),p.client_name],[T('الموقع','Location'),p.location||'—'],[T('المدينة','City'),p.city||'—'],[T('البداية','Start'),p.start_date],[T('النهاية','End'),p.end_date||'—'],[T('سعر اليوم','Daily Rate'),p.daily_rate+' '+T('ر.س','SAR')],[T('قيمة العقد','Contract'),nm(p.contract_value)+' '+T('ر.س','SAR')]].map(([l,v],i)=>
<div key={i} style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'10px 14px',border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:9,color:'var(--tx5)',marginBottom:4}}>{l}</div><div style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,.85)'}}>{v||'—'}</div></div>)}
</div>}
{viewTab==='workers'&&<div>
{projWorkers.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)'}}>{T('لا يوجد عمال','No workers')}</div>:
projWorkers.map(w=><div key={w.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--bd2)'}}>
<div style={{width:32,height:32,borderRadius:8,background:C.blue+'12',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:C.blue}}>{(w.worker?.name_ar||'?')[0]}</div>
<div style={{flex:1}}><div style={{fontSize:11,fontWeight:600,color:'var(--tx2)'}}>{w.worker?.name_ar}</div><div style={{fontSize:9,color:'var(--tx5)'}}>{w.worker?.iqama_number||''} · {w.role_on_project||T('عامل','Worker')}</div></div>
<div style={{fontSize:11,fontWeight:700,color:C.gold}}>{nm(w.monthly_salary||0)} <span style={{fontSize:8,color:'var(--tx5)'}}>{T('ر.س','SAR')}</span></div>
</div>)}
</div>}
{viewTab==='extracts'&&<div>
{projExtracts.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)'}}>{T('لا توجد مستخلصات','No extracts')}</div>:
projExtracts.map(e=>{const ec=extStClr[e.status]||'#888'
return<div key={e.id} style={{padding:'12px 14px',borderRadius:10,border:'1px solid var(--bd)',marginBottom:6}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
<span style={{fontSize:12,fontWeight:700,color:C.gold}}>{e.extract_number}</span>
<span style={{fontSize:9,padding:'2px 8px',borderRadius:5,background:ec+'15',color:ec}}>{extStLabel[e.status]}</span>
</div>
<div style={{fontSize:10,color:'var(--tx4)',marginBottom:4}}>{e.period_from} → {e.period_to} · {e.total_workers} {T('عامل','workers')} · {e.total_working_days} {T('يوم','days')}</div>
<div style={{display:'flex',gap:12}}>
<span style={{fontSize:11,fontWeight:700,color:C.gold}}>{nm(e.gross_amount)} {T('إجمالي','gross')}</span>
<span style={{fontSize:11,fontWeight:700,color:C.ok}}>{nm(e.net_amount)} {T('صافي','net')}</span>
{e.commission_amount>0&&<span style={{fontSize:11,fontWeight:700,color:'#e67e22'}}>{nm(e.commission_amount)} {T('عمولة','comm')}</span>}
{e.profit_amount>0&&<span style={{fontSize:11,fontWeight:700,color:C.ok}}>{nm(e.profit_amount)} {T('ربح','profit')}</span>}
</div>
</div>})}
</div>}
{viewTab==='finance'&&(()=>{const pExts=projExtracts;const totalRev=pExts.reduce((s,e)=>s+Number(e.net_amount||0),0);const totalCost=pExts.reduce((s,e)=>s+Number(e.total_costs||0),0);const totalProfit=pExts.reduce((s,e)=>s+Number(e.profit_amount||0),0)
return<div style={{display:'flex',flexDirection:'column',gap:14}}>
<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
{[[T('الإيرادات','Revenue'),nm(totalRev),C.gold],[T('التكاليف','Costs'),nm(totalCost),C.red],[T('الربح','Profit'),nm(totalProfit),C.ok]].map(([l,v,c],i)=>
<div key={i} style={{padding:'14px',borderRadius:12,background:c+'08',border:'1px solid '+c+'15',textAlign:'center'}}>
<div style={{fontSize:20,fontWeight:800,color:c}}>{v}</div><div style={{fontSize:9,color:c,opacity:.6}}>{l}</div>
</div>)}
</div>
</div>})()}
</div>
</div>})()}

{/* ═══ WORKERS ═══ */}
{tab==='workers'&&<div>
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
{[[T('معيّن على مشاريع','Assigned'),totalAssigned,C.blue],[T('داخلي','Internal'),workers.filter(w=>w.source==='internal').length,C.ok],[T('خارجي','External'),workers.filter(w=>w.source==='external').length,'#e67e22'],[T('متاح (غير معيّن)','Available'),T('—','—'),'#888']].map(([l,v,c],i)=>
<div key={i} style={{padding:'12px',borderRadius:12,background:c+'08',border:'1px solid '+c+'15',textAlign:'center'}}>
<div style={{fontSize:18,fontWeight:800,color:c}}>{v}</div><div style={{fontSize:9,color:c,opacity:.6}}>{l}</div>
</div>)}
</div>
{workers.map(w=>{const proj=projects.find(p=>p.id===w.project_id)
return<div key={w.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderRadius:10,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd2)',marginBottom:4}}>
<div style={{width:32,height:32,borderRadius:8,background:C.blue+'12',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:C.blue}}>{(w.worker?.name_ar||'?')[0]}</div>
<div style={{flex:1}}><div style={{fontSize:11,fontWeight:600,color:'var(--tx2)'}}>{w.worker?.name_ar}</div><div style={{fontSize:9,color:'var(--tx5)'}}>{w.worker?.iqama_number||''} · {w.source==='internal'?T('داخلي','Int'):T('خارجي','Ext')}</div></div>
<span style={{fontSize:10,color:C.gold}}>{proj?.name_ar||'—'}</span>
<span style={{fontSize:11,fontWeight:700,color:C.gold}}>{nm(w.monthly_salary)} {T('ر.س','SAR')}</span>
</div>})}
</div>}

{/* ═══ EXTRACTS ═══ */}
{tab==='extracts'&&<div>
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
{[[T('إجمالي','Total'),extracts.length,C.gold],[T('مصروف','Paid'),extracts.filter(e=>e.status==='paid').length,C.ok],[T('معتمد','Approved'),extracts.filter(e=>e.status==='client_approved').length,C.blue],[T('قيد المراجعة','Pending'),extracts.filter(e=>['draft','submitted'].includes(e.status)).length,'#e67e22']].map(([l,v,c],i)=>
<div key={i} style={{padding:'12px',borderRadius:12,background:c+'08',border:'1px solid '+c+'15',textAlign:'center'}}>
<div style={{fontSize:18,fontWeight:800,color:c}}>{v}</div><div style={{fontSize:9,color:c,opacity:.6}}>{l}</div>
</div>)}
</div>
{extracts.map(e=>{const ec=extStClr[e.status]||'#888';const proj=projects.find(p=>p.id===e.project_id)
return<div key={e.id} style={{padding:'14px 16px',borderRadius:12,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',marginBottom:8}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
<div style={{display:'flex',alignItems:'center',gap:8}}>
<span style={{fontSize:13,fontWeight:800,color:C.gold,direction:'ltr'}}>{e.extract_number}</span>
<span style={{fontSize:10,color:'var(--tx3)'}}>{proj?.name_ar||e.project?.name_ar||''}</span>
</div>
<span style={{fontSize:9,padding:'3px 10px',borderRadius:6,background:ec+'15',color:ec,fontWeight:700}}>{extStLabel[e.status]}</span>
</div>
<div style={{fontSize:10,color:'var(--tx5)',marginBottom:6}}>{e.period_from} → {e.period_to} · {e.total_workers} {T('عامل','workers')} · {e.total_working_days} {T('يوم','days')} · {T('سعر اليوم','rate')}: {e.daily_rate}</div>
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
<div><div style={{fontSize:8,color:'var(--tx5)'}}>{T('الإجمالي','Gross')}</div><div style={{fontSize:13,fontWeight:800,color:C.gold}}>{nm(e.gross_amount)}</div></div>
<div><div style={{fontSize:8,color:'var(--tx5)'}}>{T('الضريبة','VAT')}</div><div style={{fontSize:13,fontWeight:700,color:'var(--tx4)'}}>{nm(e.vat_amount)}</div></div>
<div><div style={{fontSize:8,color:'var(--tx5)'}}>{T('الصافي','Net')}</div><div style={{fontSize:13,fontWeight:800,color:C.ok}}>{nm(e.net_amount)}</div></div>
{e.profit_amount>0&&<div><div style={{fontSize:8,color:'var(--tx5)'}}>{T('الربح','Profit')}</div><div style={{fontSize:13,fontWeight:800,color:C.ok}}>{nm(e.profit_amount)}</div></div>}
{e.commission_amount>0&&<div><div style={{fontSize:8,color:'var(--tx5)'}}>{T('العمولة','Comm')}</div><div style={{fontSize:13,fontWeight:800,color:'#e67e22'}}>{nm(e.commission_amount)}</div></div>}
</div>
</div>})}
</div>}

{/* ═══ PARTNERS ═══ */}
{tab==='partners'&&<div>
<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
{[[T('شراكات نشطة','Active'),partners.length,C.gold],[T('إجمالي العمولات','Total Comm'),nm(commissions.reduce((s,c)=>s+Number(c.commission_amount||0),0))+'  '+T('ر.س','SAR'),C.ok],[T('متوسط العمولة','Avg %'),partners.length>0?Math.round(partners.reduce((s,p)=>s+Number(p.default_commission_pct||0),0)/partners.length)+'%':'—','#e67e22']].map(([l,v,c],i)=>
<div key={i} style={{padding:'14px',borderRadius:12,background:c+'08',border:'1px solid '+c+'15',textAlign:'center'}}>
<div style={{fontSize:18,fontWeight:800,color:c}}>{v}</div><div style={{fontSize:9,color:c,opacity:.6}}>{l}</div>
</div>)}
</div>
{partners.map(p=>{const pComms=commissions.filter(c=>c.partner_id===p.id);const totalComm=pComms.reduce((s,c)=>s+Number(c.commission_amount||0),0);const pProjects=projects.filter(pr=>pr.partner_id===p.id)
return<div key={p.id} style={{padding:'16px',borderRadius:12,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',marginBottom:8}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
<div><div style={{fontSize:14,fontWeight:800,color:'var(--tx)'}}>{p.name_ar}</div><div style={{fontSize:10,color:'var(--tx5)',marginTop:2}}>{p.phone||''} · {T('العمولة:','Comm:')} {p.default_commission_pct}%</div></div>
<div style={{textAlign:'center'}}><div style={{fontSize:18,fontWeight:800,color:C.ok}}>{nm(totalComm)}</div><div style={{fontSize:8,color:'var(--tx5)'}}>{T('إجمالي العمولات','Total')}</div></div>
</div>
{pProjects.length>0&&<div style={{marginTop:8}}><div style={{fontSize:10,fontWeight:600,color:'var(--tx4)',marginBottom:6}}>{T('المشاريع:','Projects:')}</div>
{pProjects.map(pr=><div key={pr.id} style={{fontSize:10,color:'var(--tx3)',padding:'4px 0'}}>• {pr.name_ar} ({workers.filter(w=>w.project_id===pr.id).length} {T('عامل','workers')})</div>)}
</div>}
{pComms.length>0&&<div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>
{pComms.slice(0,6).map(c=><span key={c.id} style={{fontSize:9,padding:'3px 8px',borderRadius:6,background:c.status==='received'?C.ok+'08':C.gold+'08',color:c.status==='received'?C.ok:C.gold,border:'1px solid '+(c.status==='received'?C.ok:C.gold)+'15'}}>{c.period_month} · {nm(c.commission_amount)} {c.status==='received'?'✓':'⏳'}</span>)}
</div>}
</div>})}
</div>}
</div>
</div>
</div>}
