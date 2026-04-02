import React, { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
const F="'Cairo','Tajawal',sans-serif"
const C={gold:'#c9a84c',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}
const num=v=>Number(v||0).toLocaleString('en-US')

export default function SLAPage({sb,toast,user,lang}){
const T=(a,e)=>lang==='ar'?a:e
const[transactions,setTransactions]=useState([]);const[summary,setSummary]=useState([]);const[defs,setDefs]=useState([])
const[loading,setLoading]=useState(true);const[filter,setFilter]=useState('all')
const[editPop,setEditPop]=useState(null);const[form,setForm]=useState({});const[saving,setSaving]=useState(false)

const load=useCallback(async()=>{
  setLoading(true)
  const[t,s,d]=await Promise.all([
    sb.from('v_transaction_sla').select('*').not('sla_status','is',null).order('sla_usage_pct',{ascending:false}).limit(100),
    sb.from('v_sla_monthly_summary').select('*'),
    sb.from('sla_definitions').select('*').order('name_ar')
  ])
  setTransactions(t.data||[]);setSummary(s.data||[]);setDefs(d.data||[]);setLoading(false)
},[sb])
useEffect(()=>{load()},[load])

const saveDef=async()=>{setSaving(true);try{
  if(editPop==='new'){await sb.from('sla_definitions').insert({...form,created_by:user?.id})}
  else{await sb.from('sla_definitions').update({target_days:Number(form.target_days),warning_pct:Number(form.warning_pct),updated_at:new Date().toISOString()}).eq('id',editPop)}
  toast(T('تم الحفظ','Saved'));setEditPop(null);load()
}catch(e){toast('خطأ')}setSaving(false)}

const slaColors={on_time:C.ok,on_track:C.blue,at_risk:'#e67e22',breached:C.red,late:C.red}
const slaLabels={on_time:T('في الوقت','On Time'),on_track:T('على المسار','On Track'),at_risk:T('قريب','At Risk'),breached:T('متجاوز','Breached'),late:T('متأخر','Late')}
const filtered=filter==='all'?transactions:transactions.filter(t=>t.sla_status===filter)

const totalCompliance=summary.reduce((s,r)=>s+Number(r.compliance_pct||0),0)/Math.max(summary.length,1)
const pieData=[
  {name:T('في الوقت','On Time'),value:transactions.filter(t=>t.sla_status==='on_time'||t.sla_status==='on_track').length,color:C.ok},
  {name:T('قريب','At Risk'),value:transactions.filter(t=>t.sla_status==='at_risk').length,color:'#e67e22'},
  {name:T('متجاوز','Breached'),value:transactions.filter(t=>t.sla_status==='breached'||t.sla_status==='late').length,color:C.red}
].filter(d=>d.value>0)

const fS={width:'100%',height:40,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:F,fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',background:'rgba(255,255,255,.06)',textAlign:'right'}
if(loading)return<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>
return<div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
<div><div style={{fontSize:22,fontWeight:800,color:'var(--tx)'}}>{T('مراقبة SLA','SLA Monitor')}</div>
<div style={{fontSize:12,color:'var(--tx4)',marginTop:4}}>{T('متابعة وقت إنجاز المعاملات مقابل الأهداف','Track transaction completion time vs targets')}</div></div>
<button onClick={()=>{setForm({service_code:'',name_ar:'',target_days:5,warning_pct:80,is_active:true});setEditPop('new')}}
style={{height:36,padding:'0 16px',borderRadius:8,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.1)',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer'}}>+ {T('تعريف SLA','New SLA')}</button>
</div>

{/* الملخص */}
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(180px,100%),1fr))',gap:12,marginBottom:20}}>
<div style={{padding:'16px',borderRadius:12,background:'rgba(201,168,76,.06)',border:'1px solid rgba(201,168,76,.1)',textAlign:'center'}}>
<div style={{fontSize:28,fontWeight:800,color:totalCompliance>=80?C.ok:totalCompliance>=60?'#e67e22':C.red}}>{Math.round(totalCompliance)}%</div>
<div style={{fontSize:10,color:'var(--tx4)'}}>{T('الالتزام العام','Compliance')}</div></div>
{[{l:T('على المسار','On Track'),v:transactions.filter(t=>t.sla_status==='on_track').length,c:C.blue},
{l:T('قريب من التأخر','At Risk'),v:transactions.filter(t=>t.sla_status==='at_risk').length,c:'#e67e22'},
{l:T('متجاوز SLA','Breached'),v:transactions.filter(t=>t.sla_status==='breached'||t.sla_status==='late').length,c:C.red}
].map(s=><div key={s.l} style={{padding:'16px',borderRadius:12,background:s.c+'08',border:'1px solid '+s.c+'15',textAlign:'center'}}>
<div style={{fontSize:28,fontWeight:800,color:s.c}}>{s.v}</div>
<div style={{fontSize:10,color:s.c,opacity:.7}}>{s.l}</div></div>)}
</div>

{/* SLA لكل نوع خدمة */}
{summary.length>0&&<div style={{padding:'18px 20px',borderRadius:14,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',marginBottom:20}}>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx3)',marginBottom:14}}>{T('SLA حسب نوع الخدمة','SLA by Service Type')}</div>
<div style={{display:'flex',flexDirection:'column',gap:8}}>
{summary.map(s=>{const pct=Number(s.compliance_pct||0);const clr=pct>=80?C.ok:pct>=60?'#e67e22':C.red
return<div key={s.type_code} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 0'}}>
<div style={{width:140,fontSize:12,fontWeight:600,color:'var(--tx2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.type_name||s.type_code||'—'}</div>
<div style={{flex:1,height:8,borderRadius:4,background:'rgba(255,255,255,.06)',overflow:'hidden'}}><div style={{height:'100%',width:pct+'%',borderRadius:4,background:clr,transition:'width .5s'}}/></div>
<div style={{minWidth:40,textAlign:'center',fontSize:12,fontWeight:700,color:clr}}>{Math.round(pct)}%</div>
<div style={{minWidth:60,fontSize:10,color:'var(--tx5)',textAlign:'center'}}>{s.target_days||'—'} {T('يوم','d')}</div>
<div style={{minWidth:40,fontSize:10,color:'var(--tx4)',textAlign:'center'}}>{s.completed||0}/{s.total_transactions||0}</div>
</div>})}
</div></div>}

{/* فلاتر */}
<div style={{display:'flex',gap:4,marginBottom:14}}>
{['all','on_track','at_risk','breached'].map(f=><div key={f} onClick={()=>setFilter(f)}
style={{padding:'6px 12px',borderRadius:6,fontSize:10,fontWeight:filter===f?700:500,color:filter===f?(slaColors[f]||C.gold):'var(--tx4)',background:filter===f?'rgba(255,255,255,.06)':'transparent',border:'1px solid '+(filter===f?'rgba(255,255,255,.1)':'transparent'),cursor:'pointer'}}>
{f==='all'?T('الكل','All'):slaLabels[f]||f} ({f==='all'?transactions.length:transactions.filter(t=>t.sla_status===f).length})</div>)}
</div>

{/* جدول المعاملات */}
<div style={{background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:12,overflow:'hidden'}}>
<table style={{width:'100%',borderCollapse:'collapse'}}>
<thead><tr>{[T('المعاملة','Transaction'),T('النوع','Type'),T('المسؤول','Assigned'),T('الأيام','Days'),T('الهدف','Target'),T('SLA','SLA'),T('الحالة','Status')].map(h=><th key={h} style={{padding:'10px 12px',fontSize:11,fontWeight:700,color:'var(--tx3)',textAlign:'right',borderBottom:'1px solid var(--bd)'}}>{h}</th>)}</tr></thead>
<tbody>{filtered.slice(0,50).map(t=>{const clr=slaColors[t.sla_status]||'#999';const usage=Number(t.sla_usage_pct||0)
return<tr key={t.transaction_id} style={{borderBottom:'1px solid var(--bd2)'}}>
<td style={{padding:'10px 12px',fontSize:12,fontWeight:600,color:'var(--tx)'}}>{t.transaction_number}</td>
<td style={{padding:'10px 12px',fontSize:11,color:'var(--tx4)'}}>{t.type_name||'—'}</td>
<td style={{padding:'10px 12px',fontSize:11,color:'var(--tx3)'}}>{t.assigned_name||'—'}</td>
<td style={{padding:'10px 12px',fontSize:12,fontWeight:700,color:clr}}>{t.elapsed_days||0}</td>
<td style={{padding:'10px 12px',fontSize:11,color:'var(--tx4)'}}>{t.target_days||'—'} {T('يوم','d')}</td>
<td style={{padding:'10px 12px'}}><div style={{width:60,height:6,borderRadius:3,background:'rgba(255,255,255,.06)',overflow:'hidden'}}><div style={{height:'100%',width:Math.min(100,usage)+'%',borderRadius:3,background:clr}}/></div></td>
<td style={{padding:'10px 12px'}}><span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:5,color:clr,background:clr+'15'}}>{slaLabels[t.sla_status]||t.sla_status}</span></td>
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
