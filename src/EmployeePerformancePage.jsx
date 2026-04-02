import React, { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts'
const F="'Cairo','Tajawal',sans-serif"
const C={gold:'#c9a84c',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}
const num=v=>Number(v||0).toLocaleString('en-US')

export default function EmployeePerformancePage({sb,toast,user,lang}){
const T=(a,e)=>lang==='ar'?a:e
const[data,setData]=useState([]);const[loading,setLoading]=useState(true)
const[branches,setBranches]=useState([]);const[branchFilter,setBranchFilter]=useState(null)
const[selected,setSelected]=useState(null);const[sortBy,setSortBy]=useState('performance_score')

const load=useCallback(async()=>{
  setLoading(true)
  const{data:d}=await sb.from('v_employee_performance_detailed').select('*')
  const{data:br}=await sb.from('branches').select('id,name_ar').is('deleted_at',null)
  setData(d||[]);setBranches(br||[]);setLoading(false)
},[sb])
useEffect(()=>{load()},[load])

const filtered=data.filter(e=>!branchFilter||e.branch_id===branchFilter).sort((a,b)=>(Number(b[sortBy])||0)-(Number(a[sortBy])||0))
const medals=['🥇','🥈','🥉']

const scoreColor=s=>s>=50?C.ok:s>=20?C.gold:s>=0?'#e67e22':C.red

if(loading)return<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>
return<div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
<div><div style={{fontSize:22,fontWeight:800,color:'var(--tx)'}}>{T('أداء الموظفين','Employee Performance')}</div>
<div style={{fontSize:12,color:'var(--tx4)',marginTop:4}}>{T('مؤشرات الإنجاز والإنتاجية لكل موظف','Individual performance metrics')}</div></div>
<div style={{display:'flex',gap:8}}>
<select value={branchFilter||''} onChange={e=>setBranchFilter(e.target.value||null)} style={{height:36,padding:'0 12px',borderRadius:8,border:'1px solid var(--bd)',background:'var(--bg)',color:'var(--tx)',fontFamily:'inherit',fontSize:12}}>
<option value="">{T('كل المكاتب','All')}</option>
{branches.map(b=><option key={b.id} value={b.id}>{b.name_ar}</option>)}
</select>
<select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{height:36,padding:'0 12px',borderRadius:8,border:'1px solid var(--bd)',background:'var(--bg)',color:'var(--tx)',fontFamily:'inherit',fontSize:12}}>
<option value="performance_score">{T('النقاط','Score')}</option>
<option value="txn_completed">{T('المعاملات','Transactions')}</option>
<option value="amount_collected">{T('التحصيل','Collection')}</option>
<option value="tasks_done">{T('المهام','Tasks')}</option>
</select>
</div></div>

{/* Leaderboard */}
<div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:24}}>
{filtered.map((e,i)=>{const sc=Number(e.performance_score)||0
return<div key={e.user_id} onClick={()=>setSelected(selected===e.user_id?null:e.user_id)}
style={{padding:'14px 18px',borderRadius:12,background:selected===e.user_id?'rgba(201,168,76,.04)':'var(--bg)',border:'1px solid '+(selected===e.user_id?'rgba(201,168,76,.15)':'var(--bd)'),cursor:'pointer',transition:'.15s'}}>
<div style={{display:'flex',alignItems:'center',gap:14}}>
<div style={{width:36,height:36,borderRadius:'50%',background:i<3?'rgba(201,168,76,.1)':'rgba(255,255,255,.05)',border:'1.5px solid '+(i<3?'rgba(201,168,76,.2)':'rgba(255,255,255,.08)'),display:'flex',alignItems:'center',justifyContent:'center',fontSize:i<3?16:12,fontWeight:800,color:i<3?C.gold:'var(--tx4)',flexShrink:0}}>
{i<3?medals[i]:i+1}</div>
<div style={{flex:1,minWidth:0}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<div><div style={{fontSize:14,fontWeight:700,color:'var(--tx)'}}>{e.name_ar}</div>
<div style={{fontSize:10,color:'var(--tx4)',marginTop:2}}>{e.role_name||'—'}</div></div>
<div style={{textAlign:'center'}}><div style={{fontSize:24,fontWeight:800,color:scoreColor(sc)}}>{sc}</div>
<div style={{fontSize:9,color:'var(--tx5)'}}>{T('نقطة','pts')}</div></div>
</div>
<div style={{display:'flex',gap:12,marginTop:10,flexWrap:'wrap'}}>
{[{l:T('معاملات','Txn'),v:e.txn_completed,c:C.blue},{l:T('تحصيل','Col.'),v:num(e.amount_collected),c:C.ok},{l:T('مهام','Tasks'),v:e.tasks_done,c:C.gold},{l:T('متأخرة','Late'),v:e.tasks_overdue,c:C.red},{l:T('تصعيدات','Esc.'),v:e.escalations,c:'#e67e22'},{l:T('م.الأيام','Avg Days'),v:e.avg_completion_days,c:'#9b59b6'}].map(s=>
<div key={s.l} style={{textAlign:'center',minWidth:55}}>
<div style={{fontSize:14,fontWeight:700,color:s.c}}>{s.v||0}</div>
<div style={{fontSize:9,color:'var(--tx5)'}}>{s.l}</div></div>)}
</div>
</div></div>

{/* تفاصيل الموظف */}
{selected===e.user_id&&<div style={{marginTop:12,padding:'14px 16px',background:'rgba(255,255,255,.02)',borderRadius:10,border:'1px solid var(--bd2)'}}>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:10}}>
<div style={{padding:12,borderRadius:8,background:'rgba(52,131,180,.06)',border:'1px solid rgba(52,131,180,.1)'}}>
<div style={{fontSize:10,color:C.blue,opacity:.7}}>{T('المعاملات هذا الشهر','Transactions This Month')}</div>
<div style={{fontSize:20,fontWeight:800,color:C.blue,marginTop:4}}>{e.txn_completed}</div>
<div style={{fontSize:10,color:'var(--tx5)',marginTop:2}}>{T('الشهر السابق:','Last month:')} {e.txn_completed_prev}</div>
{Number(e.txn_completed_prev)>0&&<div style={{fontSize:10,fontWeight:700,color:e.txn_completed>=e.txn_completed_prev?C.ok:C.red,marginTop:2}}>
{e.txn_completed>=e.txn_completed_prev?'↑':'↓'}{Math.abs(Math.round(((e.txn_completed-e.txn_completed_prev)/e.txn_completed_prev)*100))}%</div>}
</div>
<div style={{padding:12,borderRadius:8,background:'rgba(39,160,70,.06)',border:'1px solid rgba(39,160,70,.1)'}}>
<div style={{fontSize:10,color:C.ok,opacity:.7}}>{T('مبلغ التحصيل','Amount Collected')}</div>
<div style={{fontSize:20,fontWeight:800,color:C.ok,marginTop:4}}>{num(e.amount_collected)}</div>
<div style={{fontSize:10,color:'var(--tx5)',marginTop:2}}>{T('ر.س','SAR')}</div></div>
<div style={{padding:12,borderRadius:8,background:'rgba(201,168,76,.06)',border:'1px solid rgba(201,168,76,.1)'}}>
<div style={{fontSize:10,color:C.gold,opacity:.7}}>{T('المهام المنجزة','Tasks Done')}</div>
<div style={{fontSize:20,fontWeight:800,color:C.gold,marginTop:4}}>{e.tasks_done}</div>
<div style={{fontSize:10,color:'var(--tx5)',marginTop:2}}>{T('معلّقة:','Pending:')} {e.tasks_pending}</div></div>
<div style={{padding:12,borderRadius:8,background:e.tasks_overdue>0?'rgba(192,57,43,.06)':'rgba(255,255,255,.02)',border:'1px solid '+(e.tasks_overdue>0?'rgba(192,57,43,.1)':'var(--bd2)')}}>
<div style={{fontSize:10,color:e.tasks_overdue>0?C.red:'var(--tx4)',opacity:.7}}>{T('متأخرة + تصعيدات','Overdue + Escalations')}</div>
<div style={{fontSize:20,fontWeight:800,color:e.tasks_overdue>0?C.red:'var(--tx4)',marginTop:4}}>{(Number(e.tasks_overdue)+Number(e.escalations))||0}</div>
</div></div>
</div>}
</div>})}
</div>
</div>}
