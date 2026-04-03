import React, { useState, useEffect, useCallback } from 'react'
const F="'Cairo','Tajawal',sans-serif"
const C={gold:'#c9a84c',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}
const nm=v=>Number(v||0).toLocaleString('en-US')

/* ═══ CONTRACTS PAGE ═══ */
export function ContractsPage({sb,toast,user,lang,branchId}){
const T=(a,e)=>lang==='ar'?a:e
const[data,setData]=useState([]);const[loading,setLoading]=useState(true)
useEffect(()=>{sb.from('client_contracts').select('*,clients:client_id(name_ar)').is('deleted_at',null).order('end_date').then(({data})=>{setData(data||[]);setLoading(false)})},[sb])
const active=data.filter(d=>d.status==='active').length;const expiring=data.filter(d=>d.status==='active'&&d.end_date&&(new Date(d.end_date)-new Date())/86400000<60).length;const expired=data.filter(d=>d.status==='expired').length
const stClr={active:C.ok,draft:'#888',expired:C.red,terminated:C.red};const stLbl={active:T('نشط','Active'),draft:T('مسودة','Draft'),expired:T('منتهي','Expired'),terminated:T('ملغي','Terminated')}
if(loading)return<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>
return<div style={{fontFamily:F,direction:lang==='ar'?'rtl':'ltr'}}>
<div style={{fontSize:22,fontWeight:800,color:'var(--tx)',marginBottom:4}}>{T('العقود والاتفاقيات','Contracts')}</div>
<div style={{fontSize:12,color:'var(--tx4)',marginBottom:20}}>{T('عقود العملاء والخدمات','Client & service contracts')}</div>
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
{[[T('إجمالي','Total'),data.length,C.gold],[T('نشط','Active'),active,C.ok],[T('ينتهي قريباً','Expiring'),expiring,'#e67e22'],[T('منتهي','Expired'),expired,C.red]].map(([l,v,c],i)=>
<div key={i} style={{padding:'14px',borderRadius:12,background:c+'08',border:'1px solid '+c+'15',textAlign:'center'}}>
<div style={{fontSize:22,fontWeight:800,color:c}}>{v}</div><div style={{fontSize:9,color:c,opacity:.6}}>{l}</div>
</div>)}
</div>
{data.map(c=>{const sc=stClr[c.status]||'#888';const daysLeft=c.end_date?Math.ceil((new Date(c.end_date)-new Date())/86400000):null
return<div key={c.id} style={{padding:'14px 16px',borderRadius:12,background:'rgba(255,255,255,.02)',border:'1px solid '+(daysLeft!==null&&daysLeft<30&&c.status==='active'?'rgba(230,126,34,.15)':'var(--bd)'),marginBottom:6}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
<div style={{display:'flex',alignItems:'center',gap:8}}>
<span style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>{c.title_ar}</span>
<span style={{fontSize:8,padding:'2px 6px',borderRadius:4,background:sc+'12',color:sc}}>{stLbl[c.status]}</span>
{c.auto_renew&&<span style={{fontSize:8,padding:'2px 6px',borderRadius:4,background:C.blue+'08',color:C.blue}}>🔄 {T('تجديد تلقائي','Auto')}</span>}
</div>
{c.total_value>0&&<span style={{fontSize:13,fontWeight:800,color:C.gold}}>{nm(c.total_value)} {T('ر.س','SAR')}</span>}
</div>
<div style={{fontSize:10,color:'var(--tx4)'}}>{c.clients?.name_ar||'—'} · {c.contract_number||''} · {c.start_date} → {c.end_date||'—'}{daysLeft!==null&&c.status==='active'?<span style={{color:daysLeft<30?C.red:daysLeft<60?'#e67e22':C.ok,fontWeight:700}}> ({daysLeft} {T('يوم','d')})</span>:''}</div>
</div>})}
</div>}

/* ═══ ARCHIVE PAGE ═══ */
export function ArchivePage({sb,toast,user,lang}){
const T=(a,e)=>lang==='ar'?a:e
const[data,setData]=useState([]);const[loading,setLoading]=useState(true);const[catFilter,setCatFilter]=useState('all')
useEffect(()=>{sb.from('document_archive').select('*').is('deleted_at',null).order('created_at',{ascending:false}).then(({data})=>{setData(data||[]);setLoading(false)})},[sb])
const catLabels={contract:T('عقد','Contract'),license:T('رخصة','License'),certificate:T('شهادة','Certificate'),letter:T('خطاب','Letter'),id:T('هوية','ID'),other:T('أخرى','Other')}
const catColors={contract:C.gold,license:C.blue,certificate:C.ok,letter:'#9b59b6',id:'#e67e22',other:'#888'}
const filtered=catFilter==='all'?data:data.filter(d=>d.category===catFilter)
const expiring=data.filter(d=>d.expiry_date&&new Date(d.expiry_date)<new Date(Date.now()+30*86400000)).length
const expired=data.filter(d=>d.expiry_date&&new Date(d.expiry_date)<new Date()).length
if(loading)return<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>
return<div style={{fontFamily:F,direction:lang==='ar'?'rtl':'ltr'}}>
<div style={{fontSize:22,fontWeight:800,color:'var(--tx)',marginBottom:4}}>{T('الأرشيف والمستندات','Document Archive')}</div>
<div style={{fontSize:12,color:'var(--tx4)',marginBottom:20}}>{T('أرشيف مركزي للوثائق والملفات','Central document repository')}</div>
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
{[[T('إجمالي','Total'),data.length,C.gold],[T('حرجة','Critical'),data.filter(d=>d.is_critical).length,C.red],[T('منتهية','Expired'),expired,C.red],[T('تنتهي قريباً','Expiring'),expiring,'#e67e22']].map(([l,v,c],i)=>
<div key={i} style={{padding:'12px',borderRadius:12,background:c+'08',border:'1px solid '+c+'15',textAlign:'center'}}>
<div style={{fontSize:20,fontWeight:800,color:c}}>{v}</div><div style={{fontSize:9,color:c,opacity:.6}}>{l}</div>
</div>)}
</div>
{/* Category filters */}
<div style={{display:'flex',gap:4,marginBottom:14,flexWrap:'wrap'}}>
<span onClick={()=>setCatFilter('all')} style={{padding:'5px 12px',borderRadius:6,fontSize:10,fontWeight:catFilter==='all'?700:500,color:catFilter==='all'?C.gold:'rgba(255,255,255,.4)',background:catFilter==='all'?'rgba(201,168,76,.08)':'transparent',border:catFilter==='all'?'1px solid rgba(201,168,76,.15)':'1px solid rgba(255,255,255,.06)',cursor:'pointer'}}>{T('الكل','All')} ({data.length})</span>
{Object.entries(catLabels).map(([k,v])=>{const n=data.filter(d=>d.category===k).length;if(n===0)return null;const c=catColors[k]||'#888'
return<span key={k} onClick={()=>setCatFilter(k)} style={{padding:'5px 12px',borderRadius:6,fontSize:10,fontWeight:catFilter===k?700:500,color:catFilter===k?c:'rgba(255,255,255,.4)',background:catFilter===k?c+'12':'transparent',border:catFilter===k?'1px solid '+c+'20':'1px solid rgba(255,255,255,.06)',cursor:'pointer'}}>{v} ({n})</span>})}
</div>
{filtered.map(d=>{const c=catColors[d.category]||'#888';const isExp=d.expiry_date&&new Date(d.expiry_date)<new Date();const daysLeft=d.expiry_date?Math.ceil((new Date(d.expiry_date)-new Date())/86400000):null
return<div key={d.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderRadius:10,background:isExp?'rgba(192,57,43,.03)':'rgba(255,255,255,.02)',border:'1px solid '+(isExp?'rgba(192,57,43,.1)':'var(--bd2)'),marginBottom:4}}>
<div style={{width:36,height:36,borderRadius:8,background:c+'12',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>📄</div>
<div style={{flex:1}}>
<div style={{fontSize:12,fontWeight:600,color:'var(--tx2)'}}>{d.title_ar}</div>
<div style={{fontSize:9,color:'var(--tx5)',marginTop:2}}>{d.file_name||''}{d.entity_type?' · '+d.entity_type:''}</div>
</div>
<span style={{fontSize:8,padding:'2px 6px',borderRadius:4,background:c+'12',color:c}}>{catLabels[d.category]||d.category}</span>
{d.is_critical&&<span style={{fontSize:8,padding:'2px 6px',borderRadius:4,background:C.red+'12',color:C.red}}>{T('حرج','Critical')}</span>}
{daysLeft!==null&&<span style={{fontSize:10,fontWeight:700,color:daysLeft<0?C.red:daysLeft<30?'#e67e22':C.ok}}>{daysLeft<0?T('منتهي','Exp'):daysLeft+T('ي','d')}</span>}
</div>})}
</div>}

/* ═══ SUPPLIERS PAGE ═══ */
export function SuppliersPage({sb,toast,user,lang}){
const T=(a,e)=>lang==='ar'?a:e
const[data,setData]=useState([]);const[loading,setLoading]=useState(true)
useEffect(()=>{sb.from('suppliers').select('*').is('deleted_at',null).order('name_ar').then(({data})=>{setData(data||[]);setLoading(false)})},[sb])
const typeLabels={recruitment:T('استقدام','Recruitment'),insurance:T('تأمين','Insurance'),real_estate:T('عقارات','Real Estate'),maintenance:T('صيانة','Maintenance'),government:T('حكومي','Government'),other:T('أخرى','Other')}
const typeColors={recruitment:C.blue,insurance:'#9b59b6',real_estate:C.gold,maintenance:'#e67e22',government:C.red,other:'#888'}
if(loading)return<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>
return<div style={{fontFamily:F,direction:lang==='ar'?'rtl':'ltr'}}>
<div style={{fontSize:22,fontWeight:800,color:'var(--tx)',marginBottom:4}}>{T('الموردين والمتعاقدين','Suppliers')}</div>
<div style={{fontSize:12,color:'var(--tx4)',marginBottom:20}}>{T('شركات الاستقدام والتأمين والعقارات','Recruitment, insurance & real estate vendors')}</div>
<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
{[[T('إجمالي','Total'),data.length,C.gold],[T('نشط','Active'),data.filter(d=>d.is_active).length,C.ok],[T('متوسط التقييم','Avg Rating'),(data.length>0?(data.reduce((s,d)=>s+(d.rating||0),0)/data.length).toFixed(1):'—'),'#e67e22']].map(([l,v,c],i)=>
<div key={i} style={{padding:'14px',borderRadius:12,background:c+'08',border:'1px solid '+c+'15',textAlign:'center'}}>
<div style={{fontSize:22,fontWeight:800,color:c}}>{v}</div><div style={{fontSize:9,color:c,opacity:.6}}>{l}</div>
</div>)}
</div>
{data.map(s=>{const tc=typeColors[s.supplier_type]||'#888'
return<div key={s.id} style={{padding:'14px 16px',borderRadius:12,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',marginBottom:6,display:'flex',alignItems:'center',gap:12}}>
<div style={{width:40,height:40,borderRadius:10,background:tc+'12',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:tc,flexShrink:0}}>{(s.name_ar||'?')[0]}</div>
<div style={{flex:1}}>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>{s.name_ar}</div>
<div style={{display:'flex',gap:6,marginTop:3}}>
<span style={{fontSize:9,padding:'2px 6px',borderRadius:4,background:tc+'12',color:tc}}>{typeLabels[s.supplier_type]||s.supplier_type}</span>
{s.contact_person&&<span style={{fontSize:9,color:'var(--tx5)'}}>{s.contact_person}</span>}
{s.phone&&<span style={{fontSize:9,color:'var(--tx5)',direction:'ltr'}}>{s.phone}</span>}
</div>
</div>
<div style={{display:'flex',gap:2}}>{[1,2,3,4,5].map(n=><span key={n} style={{fontSize:12,color:n<=s.rating?'#f1c40f':'rgba(255,255,255,.1)'}}>★</span>)}</div>
</div>})}
</div>}

/* ═══ WORKER LEAVES PAGE ═══ */
export function WorkerLeavesPage({sb,toast,user,lang}){
const T=(a,e)=>lang==='ar'?a:e
const[data,setData]=useState([]);const[loading,setLoading]=useState(true)
useEffect(()=>{sb.from('worker_leaves').select('*,worker:worker_id(name_ar)').order('start_date',{ascending:false}).limit(50).then(({data})=>{setData(data||[]);setLoading(false)})},[sb])
const typeLabels={annual:T('سنوية','Annual'),sick:T('مرضية','Sick'),emergency:T('طارئة','Emergency'),unpaid:T('بدون راتب','Unpaid'),exit_reentry:T('خروج وعودة','Exit/Return')}
const stClr={pending:C.gold,approved:C.ok,rejected:C.red,completed:C.blue}
const stLbl={pending:T('معلّقة','Pending'),approved:T('مقبولة','Approved'),rejected:T('مرفوضة','Rejected'),completed:T('مكتملة','Done')}
const pending=data.filter(d=>d.status==='pending').length
if(loading)return<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>
return<div style={{fontFamily:F,direction:lang==='ar'?'rtl':'ltr'}}>
<div style={{fontSize:22,fontWeight:800,color:'var(--tx)',marginBottom:4}}>{T('الإجازات والمغادرات','Leaves & Departures')}</div>
<div style={{fontSize:12,color:'var(--tx4)',marginBottom:20}}>{T('إجازات العمال والمغادرات','Worker leaves management')}</div>
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
{[[T('إجمالي','Total'),data.length,C.gold],[T('معلّقة','Pending'),pending,'#e67e22'],[T('مقبولة','Approved'),data.filter(d=>d.status==='approved').length,C.ok],[T('مكتملة','Done'),data.filter(d=>d.status==='completed').length,C.blue]].map(([l,v,c],i)=>
<div key={i} style={{padding:'12px',borderRadius:12,background:c+'08',border:'1px solid '+c+'15',textAlign:'center'}}>
<div style={{fontSize:20,fontWeight:800,color:c}}>{v}</div><div style={{fontSize:9,color:c,opacity:.6}}>{l}</div>
</div>)}
</div>
{data.map(d=>{const sc=stClr[d.status]||'#888'
return<div key={d.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderRadius:10,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd2)',marginBottom:4}}>
<div style={{width:32,height:32,borderRadius:8,background:sc+'12',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:sc}}>{d.days||'—'}</div>
<div style={{flex:1}}>
<div style={{fontSize:12,fontWeight:600,color:'var(--tx2)'}}>{d.worker?.name_ar||'—'}</div>
<div style={{fontSize:9,color:'var(--tx5)',marginTop:2}}>{typeLabels[d.leave_type]||d.leave_type} · {d.start_date} → {d.end_date}</div>
</div>
<span style={{fontSize:9,padding:'2px 8px',borderRadius:5,background:sc+'15',color:sc,fontWeight:600}}>{stLbl[d.status]||d.status}</span>
</div>})}
</div>}

/* ═══ BUDGET PAGE ═══ */
export function BudgetPage({sb,toast,user,lang,branchId}){
const T=(a,e)=>lang==='ar'?a:e
const[data,setData]=useState([]);const[loading,setLoading]=useState(true)
const period='2026-04'
useEffect(()=>{let q=sb.from('budget_items').select('*').eq('period',period);if(branchId)q=q.eq('branch_id',branchId);q.order('category').then(({data})=>{setData(data||[]);setLoading(false)})},[sb,branchId])
const catLabels={salaries:T('رواتب','Salaries'),rent:T('إيجار','Rent'),government:T('رسوم حكومية','Gov Fees'),operations:T('تشغيل','Operations'),marketing:T('تسويق','Marketing'),other:T('أخرى','Other')}
const catColors={salaries:C.blue,rent:C.gold,government:C.red,operations:'#e67e22',marketing:'#9b59b6',other:'#888'}
const totalBudget=data.reduce((s,d)=>s+Number(d.budget_amount||0),0);const totalActual=data.reduce((s,d)=>s+Number(d.actual_amount||0),0);const usagePct=totalBudget>0?Math.round(totalActual/totalBudget*100):0
if(loading)return<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>
return<div style={{fontFamily:F,direction:lang==='ar'?'rtl':'ltr'}}>
<div style={{fontSize:22,fontWeight:800,color:'var(--tx)',marginBottom:4}}>{T('الميزانية والموازنة','Budget')}</div>
<div style={{fontSize:12,color:'var(--tx4)',marginBottom:20}}>{T('متابعة الصرف مقابل الميزانية المخططة','Track spending vs planned budget')}</div>
<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
{[[T('الميزانية','Budget'),nm(totalBudget),C.gold],[T('المصروف','Spent'),nm(totalActual),totalActual>totalBudget?C.red:'#e67e22'],[T('الاستخدام','Usage'),usagePct+'%',usagePct>100?C.red:usagePct>80?'#e67e22':C.ok]].map(([l,v,c],i)=>
<div key={i} style={{padding:'14px',borderRadius:12,background:c+'08',border:'1px solid '+c+'15',textAlign:'center'}}>
<div style={{fontSize:22,fontWeight:800,color:c}}>{v}</div><div style={{fontSize:9,color:c,opacity:.6}}>{l}</div>
{i===2&&<div style={{height:4,borderRadius:2,background:'rgba(255,255,255,.06)',overflow:'hidden',marginTop:6}}><div style={{height:'100%',width:Math.min(100,usagePct)+'%',borderRadius:2,background:c}}/></div>}
</div>)}
</div>
{data.map(d=>{const c=catColors[d.category]||'#888';const pct=Number(d.budget_amount)>0?Math.round(Number(d.actual_amount||0)/Number(d.budget_amount)*100):0;const over=pct>100
return<div key={d.id} style={{padding:'12px 16px',borderRadius:10,background:over?'rgba(192,57,43,.03)':'rgba(255,255,255,.02)',border:'1px solid '+(over?'rgba(192,57,43,.1)':'var(--bd2)'),marginBottom:6}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
<span style={{fontSize:12,fontWeight:700,color:c}}>{catLabels[d.category]||d.category}</span>
<span style={{fontSize:11,fontWeight:700,color:over?C.red:C.ok}}>{pct}%</span>
</div>
<div style={{height:4,borderRadius:2,background:'rgba(255,255,255,.06)',overflow:'hidden',marginBottom:4}}><div style={{height:'100%',width:Math.min(100,pct)+'%',borderRadius:2,background:over?C.red:pct>80?'#e67e22':C.ok}}/></div>
<div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--tx5)'}}>
<span>{T('الميزانية:','Budget:')} {nm(d.budget_amount)}</span>
<span>{T('المصروف:','Spent:')} {nm(d.actual_amount)}</span>
<span style={{color:over?C.red:C.ok}}>{over?T('تجاوز','Over'):'✓'}</span>
</div>
</div>})}
</div>}
