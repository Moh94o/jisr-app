import React, { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend } from 'recharts'
const F="'Cairo','Tajawal',sans-serif"
const C={gold:'#c9a84c',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}
const num=v=>Number(v||0).toLocaleString('en-US')

export default function BranchComparisonPage({sb,toast,lang}){
const T=(a,e)=>lang==='ar'?a:e
const[data,setData]=useState([]);const[loading,setLoading]=useState(true)

const load=useCallback(async()=>{setLoading(true)
const{data:d}=await sb.from('v_branch_comparison').select('*')
setData(d||[]);setLoading(false)},[sb])
useEffect(()=>{load()},[load])

const metrics=[
  {k:'monthly_revenue',l:T('الإيرادات','Revenue'),fmt:v=>num(v),c:C.gold},
  {k:'monthly_collected',l:T('التحصيل','Collected'),fmt:v=>num(v),c:C.ok},
  {k:'monthly_completed',l:T('معاملات مكتملة','Completed'),fmt:v=>v,c:C.blue},
  {k:'active_transactions',l:T('جارية','Active'),fmt:v=>v,c:'#9b59b6'},
  {k:'total_clients',l:T('عملاء','Clients'),fmt:v=>v,c:'#e67e22'},
  {k:'new_clients_month',l:T('عملاء جدد','New'),fmt:v=>v,c:C.ok},
  {k:'total_workers',l:T('عمال','Workers'),fmt:v=>v,c:C.blue},
  {k:'monthly_expenses',l:T('مصاريف','Expenses'),fmt:v=>num(v),c:C.red},
]

const radarData=metrics.slice(0,6).map(m=>{const obj={metric:m.l};data.forEach(b=>{const maxVal=Math.max(...data.map(x=>Number(x[m.k])||0),1);obj[b.branch_name]=Math.round(100*(Number(b[m.k])||0)/maxVal)});return obj})
const colors=[C.gold,C.blue,C.ok,'#9b59b6','#e67e22']

if(loading)return<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>
return<div>
<div style={{marginBottom:20}}><div style={{fontSize:22,fontWeight:800,color:'var(--tx)'}}>{T('مقارنة الفروع','Branch Comparison')}</div>
<div style={{fontSize:12,color:'var(--tx4)',marginTop:4}}>{T('مقارنة أداء جميع الفروع','Compare all branches performance')}</div></div>

{data.length===0?<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>{T('لا توجد فروع','No branches')}</div>:<>
{/* Radar Chart */}
{data.length>1&&<div style={{padding:'18px 20px',borderRadius:14,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',marginBottom:20}}>
<ResponsiveContainer width="100%" height={300}>
<RadarChart data={radarData}>
<PolarGrid stroke="rgba(255,255,255,.1)"/>
<PolarAngleAxis dataKey="metric" tick={{fontSize:10,fill:'rgba(255,255,255,.5)'}}/>
{data.map((b,i)=><Radar key={b.branch_id} name={b.branch_name} dataKey={b.branch_name} stroke={colors[i%colors.length]} fill={colors[i%colors.length]} fillOpacity={0.1} strokeWidth={2}/>)}
<Legend wrapperStyle={{fontSize:11}}/>
<Tooltip contentStyle={{background:'#1e1e1e',border:'1px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:11}}/>
</RadarChart></ResponsiveContainer></div>}

{/* جدول المقارنة */}
<div style={{background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:12,overflow:'auto'}}>
<table style={{width:'100%',borderCollapse:'collapse',minWidth:600}}>
<thead><tr><th style={{padding:'12px',fontSize:11,fontWeight:700,color:'var(--tx3)',textAlign:'right',borderBottom:'1px solid var(--bd)',position:'sticky',right:0,background:'var(--bg)'}}>{T('المؤشر','Metric')}</th>
{data.map(b=><th key={b.branch_id} style={{padding:'12px',fontSize:12,fontWeight:700,color:C.gold,textAlign:'center',borderBottom:'1px solid var(--bd)'}}>{b.branch_name}</th>)}</tr></thead>
<tbody>{metrics.map(m=>{const vals=data.map(b=>Number(b[m.k])||0);const maxV=Math.max(...vals)
return<tr key={m.k} style={{borderBottom:'1px solid var(--bd2)'}}>
<td style={{padding:'10px 12px',fontSize:12,fontWeight:600,color:'var(--tx2)',position:'sticky',right:0,background:'var(--bg)'}}>{m.l}</td>
{data.map((b,i)=>{const v=Number(b[m.k])||0;const isBest=v===maxV&&maxV>0
return<td key={b.branch_id} style={{padding:'10px 12px',textAlign:'center',fontSize:13,fontWeight:isBest?800:500,color:isBest?m.c:'var(--tx3)'}}>
{m.fmt(v)} {isBest&&maxV>0&&<span style={{fontSize:9}}>🥇</span>}</td>})}
</tr>})}</tbody></table></div>
</>}
</div>}
