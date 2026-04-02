import React, { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line, ComposedChart } from 'recharts'
const F="'Cairo','Tajawal',sans-serif"
const C={gold:'#c9a84c',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}
const num=v=>Number(v||0).toLocaleString('en-US')

export default function CashFlowPage({sb,toast,lang}){
const T=(a,e)=>lang==='ar'?a:e
const[data,setData]=useState([]);const[loading,setLoading]=useState(true)
const[summary,setSummary]=useState({inflow:0,outflow:0,net:0})

const load=useCallback(async()=>{
  setLoading(true)
  const{data:d}=await sb.from('v_cash_flow_forecast').select('*')
  setData(d||[])
  if(d&&d.length>0){
    const inf=d.reduce((s,r)=>s+Number(r.expected_inflow||0),0)
    const out=d.reduce((s,r)=>s+Number(r.expected_outflow||0),0)
    setSummary({inflow:inf,outflow:out,net:inf-out})
  }
  setLoading(false)
},[sb])
useEffect(()=>{load()},[load])

const statusColors={healthy:C.ok,tight:'#e67e22',deficit:C.red}
const statusLabels={healthy:T('مرتاح','Healthy'),tight:T('ضيّق','Tight'),deficit:T('عجز','Deficit')}

const chartData=data.map(d=>({
  week:d.week_start?.slice(5,10),
  inflow:Number(d.expected_inflow||0),
  outflow:Number(d.expected_outflow||0),
  net:Number(d.net_flow||0),
  cumulative:Number(d.cumulative_flow||0)
}))

const hasDeficit=data.some(d=>d.status==='deficit')

if(loading)return<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>
return<div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
<div><div style={{fontSize:22,fontWeight:800,color:'var(--tx)'}}>{T('التدفق النقدي','Cash Flow')}</div>
<div style={{fontSize:12,color:'var(--tx4)',marginTop:4}}>{T('توقعات الدخل والمصاريف لـ 8 أسابيع قادمة','8-week income & expense forecast')}</div></div>
<button onClick={load} style={{height:36,padding:'0 14px',borderRadius:8,border:'1px solid var(--bd)',background:'var(--bg)',color:'var(--tx3)',fontFamily:F,fontSize:11,fontWeight:600,cursor:'pointer'}}>↻ {T('تحديث','Refresh')}</button>
</div>

{/* تنبيه العجز */}
{hasDeficit&&<div style={{padding:'12px 16px',borderRadius:12,background:'rgba(192,57,43,.06)',border:'1px solid rgba(192,57,43,.12)',marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
<div><div style={{fontSize:12,fontWeight:700,color:C.red}}>{T('تحذير: يوجد عجز نقدي متوقع','Warning: Cash deficit forecasted')}</div>
<div style={{fontSize:11,color:'rgba(192,57,43,.6)',marginTop:2}}>{T('المصاريف المتوقعة قد تتجاوز الدخل في بعض الأسابيع','Expected expenses may exceed income in some weeks')}</div></div>
</div>}

{/* Summary Cards */}
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(200px,100%),1fr))',gap:12,marginBottom:20}}>
<div style={{padding:'16px 18px',borderRadius:12,background:'rgba(39,160,70,.06)',border:'1px solid rgba(39,160,70,.1)'}}>
<div style={{fontSize:10,color:C.ok,opacity:.7,marginBottom:4}}>{T('الدخل المتوقع','Expected Income')}</div>
<div style={{fontSize:22,fontWeight:800,color:C.ok}}>{num(summary.inflow)}</div>
<div style={{fontSize:10,color:'var(--tx5)'}}>{T('ر.س / 8 أسابيع','SAR / 8 weeks')}</div></div>
<div style={{padding:'16px 18px',borderRadius:12,background:'rgba(192,57,43,.06)',border:'1px solid rgba(192,57,43,.1)'}}>
<div style={{fontSize:10,color:C.red,opacity:.7,marginBottom:4}}>{T('المصاريف المتوقعة','Expected Expenses')}</div>
<div style={{fontSize:22,fontWeight:800,color:C.red}}>{num(summary.outflow)}</div>
<div style={{fontSize:10,color:'var(--tx5)'}}>{T('ر.س / 8 أسابيع','SAR / 8 weeks')}</div></div>
<div style={{padding:'16px 18px',borderRadius:12,background:summary.net>=0?'rgba(39,160,70,.06)':'rgba(192,57,43,.06)',border:'1px solid '+(summary.net>=0?'rgba(39,160,70,.1)':'rgba(192,57,43,.1)')}}>
<div style={{fontSize:10,color:summary.net>=0?C.ok:C.red,opacity:.7,marginBottom:4}}>{T('صافي التدفق','Net Flow')}</div>
<div style={{fontSize:22,fontWeight:800,color:summary.net>=0?C.ok:C.red}}>{summary.net>=0?'+':''}{num(summary.net)}</div>
<div style={{fontSize:10,color:'var(--tx5)'}}>{T('ر.س','SAR')}</div></div>
</div>

{/* Chart */}
{chartData.length>0&&<div style={{padding:'18px 20px',borderRadius:14,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',marginBottom:20}}>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx3)',marginBottom:16}}>{T('الدخل مقابل المصاريف أسبوعياً','Weekly Income vs Expenses')}</div>
<ResponsiveContainer width="100%" height={260}>
<ComposedChart data={chartData} barGap={4}>
<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)"/>
<XAxis dataKey="week" tick={{fontSize:10,fill:'rgba(255,255,255,.4)'}}/>
<YAxis tick={{fontSize:10,fill:'rgba(255,255,255,.4)'}} tickFormatter={v=>(v/1000)+'K'}/>
<Tooltip contentStyle={{background:'#1e1e1e',border:'1px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:11}} formatter={v=>[num(v)+T(' ر.س',' SAR')]}/>
<Bar dataKey="inflow" name={T('الدخل','Income')} fill={C.ok} radius={[4,4,0,0]} opacity={0.7}/>
<Bar dataKey="outflow" name={T('المصاريف','Expenses')} fill={C.red} radius={[4,4,0,0]} opacity={0.7}/>
<Line type="monotone" dataKey="cumulative" name={T('التراكمي','Cumulative')} stroke={C.gold} strokeWidth={2} dot={false}/>
</ComposedChart></ResponsiveContainer></div>}

{/* Weekly Details */}
<div style={{background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:12,overflow:'hidden'}}>
<table style={{width:'100%',borderCollapse:'collapse'}}>
<thead><tr>{[T('الأسبوع','Week'),T('الدخل المتوقع','Exp. Income'),T('الأقساط','Installments'),T('المصاريف','Expenses'),T('الصافي','Net'),T('الحالة','Status')].map(h=><th key={h} style={{padding:'10px 14px',fontSize:11,fontWeight:700,color:'var(--tx3)',textAlign:'right',borderBottom:'1px solid var(--bd)'}}>{h}</th>)}</tr></thead>
<tbody>{data.map((r,i)=>{const net=Number(r.net_flow||0);const clr=statusColors[r.status]||'#999'
return<tr key={i} style={{borderBottom:'1px solid var(--bd2)'}}>
<td style={{padding:'10px 14px',fontSize:12,fontWeight:600,color:'var(--tx2)'}}>{r.week_start?.slice(5)} → {r.week_end?.slice(5)}</td>
<td style={{padding:'10px 14px',fontSize:12,fontWeight:700,color:C.ok,direction:'ltr',textAlign:'left'}}>{num(r.expected_inflow)}</td>
<td style={{padding:'10px 14px',fontSize:11,color:'var(--tx4)'}}>{r.pending_installments} {T('قسط','inst.')}</td>
<td style={{padding:'10px 14px',fontSize:12,fontWeight:700,color:C.red,direction:'ltr',textAlign:'left'}}>{num(r.expected_outflow)}</td>
<td style={{padding:'10px 14px',fontSize:13,fontWeight:800,color:net>=0?C.ok:C.red,direction:'ltr',textAlign:'left'}}>{net>=0?'+':''}{num(net)}</td>
<td style={{padding:'10px 14px'}}><span style={{fontSize:10,fontWeight:600,padding:'3px 10px',borderRadius:6,color:clr,background:clr+'15'}}>{statusLabels[r.status]||r.status}</span></td>
</tr>})}</tbody></table></div>
</div>}
