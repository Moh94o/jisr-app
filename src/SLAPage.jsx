import React, { useState, useEffect, useCallback, useMemo } from 'react'
const F="'Cairo','Tajawal',sans-serif"
const C={gold:'#c9a84c',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}

export default function SLAPage({sb,toast,user,lang}){
const T=(a,e)=>lang==='ar'?a:e
const[transactions,setTransactions]=useState([]);const[defs,setDefs]=useState([])
const[loading,setLoading]=useState(true);const[filter,setFilter]=useState('all')
const[editPop,setEditPop]=useState(null);const[form,setForm]=useState({});const[saving,setSaving]=useState(false)

const load=useCallback(async()=>{
  setLoading(true)
  const[t,d]=await Promise.all([
    sb.from('v_transaction_sla').select('*').not('sla_status','is',null).order('created_at',{ascending:false}).limit(300),
    sb.from('sla_definitions').select('*').order('name_ar')
  ])
  setTransactions(t.data||[]);setDefs(d.data||[]);setLoading(false)
},[sb])
useEffect(()=>{load()},[load])

const saveDef=async()=>{setSaving(true);try{
  if(editPop==='new'){await sb.from('sla_definitions').insert({...form,created_by:user?.id})}
  else{await sb.from('sla_definitions').update({target_days:Number(form.target_days),warning_pct:Number(form.warning_pct),updated_at:new Date().toISOString()}).eq('id',editPop)}
  toast(T('تم الحفظ','Saved'));setEditPop(null);load()
}catch(e){toast('خطأ')}setSaving(false)}

const slaColors={on_time:C.ok,on_track:C.blue,at_risk:'#e67e22',breached:C.red,late:C.red,critical:C.red,warning:'#e67e22',done:'#888',no_deadline:'#666'}
const slaLabels={on_time:T('في الوقت','On Time'),on_track:T('على المسار','On Track'),at_risk:T('قريب','At Risk'),warning:T('تحذير','Warning'),breached:T('متجاوز','Breached'),late:T('متأخر','Late'),critical:T('حرج','Critical'),overdue:T('متأخر','Overdue'),done:T('مكتمل','Done'),no_deadline:T('بدون موعد','No Deadline')}
const filtered=filter==='all'?transactions:transactions.filter(t=>t.sla_status===filter||(filter==='breached'&&(t.sla_status==='late'||t.sla_status==='critical'||t.sla_status==='overdue')))

// ═══ COMPUTED: SLA by Service ═══
const svcSla=useMemo(()=>{
  const map={};transactions.forEach(t=>{
    const key=t.service_id||t.service_category||'OTHER'
    if(!map[key])map[key]={name:t.service_name_ar||t.service_category||'—',total:0,onTime:0,atRisk:0,breached:0,totalDays:0,color:t.service_color}
    map[key].total++
    if(t.sla_status==='on_time'||t.sla_status==='on_track'||t.sla_status==='done')map[key].onTime++
    else if(t.sla_status==='at_risk'||t.sla_status==='warning')map[key].atRisk++
    else map[key].breached++
    map[key].totalDays+=(t.days_elapsed||0)
  })
  return Object.values(map).map(s=>({...s,pct:s.total>0?Math.round(s.onTime/s.total*100):0,avg:s.total>0?Math.round(s.totalDays/s.total):0})).sort((a,b)=>a.pct-b.pct)
},[transactions])

const onTrackCount=transactions.filter(t=>t.sla_status==='on_track'||t.sla_status==='on_time').length
const atRiskCount=transactions.filter(t=>t.sla_status==='at_risk'||t.sla_status==='warning').length
const breachedCount=transactions.filter(t=>['breached','late','critical','overdue'].includes(t.sla_status)).length
const totalCompliance=transactions.length>0?Math.round(onTrackCount/transactions.length*100):0
const worstSvc=svcSla.length>0?svcSla[0]:null

const fS={width:'100%',height:40,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:F,fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',background:'rgba(255,255,255,.06)',textAlign:'right'}
if(loading)return<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>
return<div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
<div><div style={{fontSize:22,fontWeight:800,color:'var(--tx)'}}>{T('مراقبة SLA','SLA Monitor')}</div>
<div style={{fontSize:12,color:'var(--tx4)',marginTop:4}}>{T('متابعة وقت إنجاز المعاملات مقابل الأهداف','Track transaction completion time vs targets')}</div></div>
<button onClick={()=>{setForm({service_code:'',name_ar:'',target_days:5,warning_pct:80,is_active:true});setEditPop('new')}}
style={{height:36,padding:'0 16px',borderRadius:8,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.1)',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer'}}>+ {T('تعريف SLA','New SLA')}</button>
</div>

{/* ═══ ENHANCED SUMMARY ═══ */}
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
<div style={{padding:'16px',borderRadius:12,background:'rgba(201,168,76,.06)',border:'1px solid rgba(201,168,76,.1)',textAlign:'center'}}>
<div style={{fontSize:30,fontWeight:800,color:totalCompliance>=80?C.ok:totalCompliance>=60?'#e67e22':C.red}}>{totalCompliance}%</div>
<div style={{fontSize:10,color:'var(--tx4)'}}>{T('الالتزام العام','Compliance')}</div>
<div style={{fontSize:9,color:'var(--tx5)',marginTop:2}}>{onTrackCount}/{transactions.length} {T('في الوقت','on time')}</div></div>
{[{l:T('على المسار','On Track'),v:onTrackCount,c:C.ok},
{l:T('قريب من التأخر','At Risk'),v:atRiskCount,c:'#e67e22'},
{l:T('متجاوز SLA','Breached'),v:breachedCount,c:C.red}
].map(s=><div key={s.l} style={{padding:'16px',borderRadius:12,background:s.c+'08',border:'1px solid '+s.c+'15',textAlign:'center'}}>
<div style={{fontSize:28,fontWeight:800,color:s.c}}>{s.v}</div>
<div style={{fontSize:10,color:s.c,opacity:.7}}>{s.l}</div></div>)}
</div>

{/* ═══ WORST SERVICE ALERT ═══ */}
{worstSvc&&worstSvc.pct<50&&<div style={{padding:'12px 16px',borderRadius:10,background:'rgba(192,57,43,.06)',border:'1px solid rgba(192,57,43,.15)',marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
<div style={{flex:1}}>
<span style={{fontSize:11,fontWeight:700,color:C.red}}>{T('أكثر خدمة تأخراً:','Worst service:')}</span>
<span style={{fontSize:11,color:'var(--tx3)',marginRight:6,marginLeft:6}}>{worstSvc.name}</span>
<span style={{fontSize:10,color:C.red}}>({worstSvc.pct}% {T('التزام','compliance')} — {worstSvc.breached} {T('متجاوزة','breached')})</span>
</div>
</div>}

{/* ═══ SLA BY SERVICE (with names!) ═══ */}
{svcSla.length>0&&<div style={{padding:'18px 20px',borderRadius:14,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',marginBottom:20}}>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx3)',marginBottom:14}}>{T('SLA حسب الخدمة','SLA by Service')} <span style={{fontSize:10,color:'var(--tx5)'}}>({svcSla.length} {T('خدمة','services')})</span></div>
<div style={{display:'flex',flexDirection:'column',gap:8}}>
{svcSla.map((s,i)=>{const clr=s.pct>=80?C.ok:s.pct>=60?'#e67e22':C.red
return<div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'6px 0',borderBottom:i<svcSla.length-1?'1px solid var(--bd2)':'none'}}>
<div style={{width:160,fontSize:11,fontWeight:600,color:'var(--tx2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.name}</div>
<div style={{flex:1,height:8,borderRadius:4,background:'rgba(255,255,255,.06)',overflow:'hidden'}}><div style={{height:'100%',width:s.pct+'%',borderRadius:4,background:clr,transition:'width .5s'}}/></div>
<div style={{minWidth:40,textAlign:'center',fontSize:12,fontWeight:700,color:clr}}>{s.pct}%</div>
<div style={{minWidth:70,display:'flex',gap:4,justifyContent:'center'}}>
<span style={{fontSize:8,padding:'1px 4px',borderRadius:3,background:C.ok+'12',color:C.ok}}>{s.onTime}</span>
<span style={{fontSize:8,padding:'1px 4px',borderRadius:3,background:'rgba(230,126,34,.12)',color:'#e67e22'}}>{s.atRisk}</span>
<span style={{fontSize:8,padding:'1px 4px',borderRadius:3,background:C.red+'12',color:C.red}}>{s.breached}</span>
</div>
<div style={{minWidth:50,fontSize:9,color:'var(--tx5)',textAlign:'center'}}>{T('متوسط','avg')} {s.avg}{T('ي','d')}</div>
</div>})}
</div></div>}

{/* فلاتر */}
<div style={{display:'flex',gap:4,marginBottom:14}}>
{['all','on_track','at_risk','breached'].map(f=>{const cnt=f==='all'?transactions.length:f==='breached'?breachedCount:f==='on_track'?onTrackCount:atRiskCount
return<div key={f} onClick={()=>setFilter(f)}
style={{padding:'6px 12px',borderRadius:6,fontSize:10,fontWeight:filter===f?700:500,color:filter===f?(slaColors[f]||C.gold):'var(--tx4)',background:filter===f?'rgba(255,255,255,.06)':'transparent',border:'1px solid '+(filter===f?'rgba(255,255,255,.1)':'transparent'),cursor:'pointer'}}>
{f==='all'?T('الكل','All'):slaLabels[f]||f} ({cnt})</div>})}
</div>

{/* جدول المعاملات */}
<div style={{background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:12,overflow:'hidden'}}>
<table style={{width:'100%',borderCollapse:'collapse'}}>
<thead><tr>{[T('المعاملة','Txn'),T('الخدمة','Service'),T('العميل','Client'),T('المسؤول','Staff'),T('الأيام','Days'),T('الهدف','Target'),T('SLA','SLA'),T('الحالة','Status')].map(h=><th key={h} style={{padding:'10px 12px',fontSize:10,fontWeight:700,color:'var(--tx5)',textAlign:'right',borderBottom:'1px solid var(--bd)'}}>{h}</th>)}</tr></thead>
<tbody>{filtered.length===0?<tr><td colSpan={8} style={{padding:40,textAlign:'center',color:'var(--tx6)'}}>{T('لا توجد بيانات','No data')}</td></tr>:filtered.slice(0,50).map(t=>{const clr=slaColors[t.sla_status]||'#999';const usage=t.expected_sla_days>0?Math.round((t.days_elapsed||0)/t.expected_sla_days*100):0
return<tr key={t.id} style={{borderBottom:'1px solid var(--bd2)',background:['breached','late','critical','overdue'].includes(t.sla_status)?'rgba(192,57,43,.03)':'transparent'}}>
<td style={{padding:'10px 12px',fontSize:11,fontWeight:700,color:C.gold}}>{t.transaction_number}</td>
<td style={{padding:'10px 12px',fontSize:10}}><span style={{padding:'1px 5px',borderRadius:4,background:(t.service_color||C.gold)+'12',color:t.service_color||C.gold}}>{t.service_name_ar||t.service_category||'—'}</span></td>
<td style={{padding:'10px 12px',fontSize:10,color:'var(--tx3)'}}>{t.client_name||'—'}</td>
<td style={{padding:'10px 12px',fontSize:10,color:'var(--tx4)'}}>{t.assigned_name||'—'}</td>
<td style={{padding:'10px 12px',fontSize:12,fontWeight:700,color:clr}}>{t.days_elapsed||0}</td>
<td style={{padding:'10px 12px',fontSize:10,color:'var(--tx4)'}}>{t.expected_sla_days||'—'}{T('ي','d')}</td>
<td style={{padding:'10px 12px'}}><div style={{width:60,height:6,borderRadius:3,background:'rgba(255,255,255,.06)',overflow:'hidden'}}><div style={{height:'100%',width:Math.min(100,usage)+'%',borderRadius:3,background:clr}}/></div></td>
<td style={{padding:'10px 12px'}}><span style={{fontSize:9,fontWeight:600,padding:'2px 8px',borderRadius:5,color:clr,background:clr+'15'}}>{slaLabels[t.sla_status]||t.sla_status}</span></td>
</tr>})}</tbody></table></div>

{/* SLA Definitions editor */}
{editPop&&<div onClick={()=>setEditPop(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.8)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(420px,96vw)',display:'flex',flexDirection:'column',overflow:'hidden',border:'1px solid var(--bd)'}}>
<div style={{height:3,background:`linear-gradient(90deg,transparent,${C.blue},transparent)`}}/>
<div style={{padding:'16px 22px',borderBottom:'1px solid var(--bd)',fontSize:15,fontWeight:700,color:'var(--tx)'}}>{editPop==='new'?T('تعريف SLA جديد','New SLA'):T('تعديل SLA','Edit SLA')}</div>
<div style={{padding:'18px 22px',display:'flex',flexDirection:'column',gap:12}}>
{editPop==='new'&&<><div><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('كود الخدمة','Service Code')}</div><input value={form.service_code||''} onChange={e=>setForm(p=>({...p,service_code:e.target.value}))} style={fS} placeholder="TRANSFER"/></div>
<div><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('الاسم','Name')}</div><input value={form.name_ar||''} onChange={e=>setForm(p=>({...p,name_ar:e.target.value}))} style={fS}/></div></>}
<div><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('الوقت المستهدف (أيام)','Target Days')}</div><input type="number" value={form.target_days||''} onChange={e=>setForm(p=>({...p,target_days:e.target.value}))} style={{...fS,direction:'ltr'}}/></div>
<div><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('نسبة التحذير %','Warning %')}</div><input type="number" value={form.warning_pct||''} onChange={e=>setForm(p=>({...p,warning_pct:e.target.value}))} style={{...fS,direction:'ltr'}}/></div>
</div>
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',flexDirection:'row-reverse'}}>
<button onClick={saveDef} disabled={saving} style={{height:40,padding:'0 24px',borderRadius:8,border:'1px solid rgba(52,131,180,.2)',background:'rgba(52,131,180,.12)',color:C.blue,fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer',opacity:saving?.6:1}}>{saving?'...':T('حفظ','Save')}</button>
<button onClick={()=>setEditPop(null)} style={{height:40,padding:'0 16px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:12,cursor:'pointer'}}>{T('إلغاء','Cancel')}</button>
</div></div></div>}
</div>}
