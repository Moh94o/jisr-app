import React, { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line, ComposedChart } from 'recharts'
const F="'Cairo','Tajawal',sans-serif"
const C={gold:'#c9a84c',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}
const num=v=>Number(v||0).toLocaleString('en-US')

export default function CashFlowPage({sb,toast,lang}){
const T=(a,e)=>lang==='ar'?a:e
const[data,setData]=useState([]);const[loading,setLoading]=useState(true)
const[summary,setSummary]=useState({inflow:0,outflow:0,net:0})
const[actual,setActual]=useState({income:0,expense:0})
const[overBudget,setOverBudget]=useState(false)

const load=useCallback(async()=>{
  setLoading(true)
  const[{data:d},{data:br},{data:op}]=await Promise.all([
    sb.from('v_cash_flow_forecast').select('*'),
    sb.from('bank_reconciliation').select('transaction_type,amount').is('deleted_at',null),
    sb.from('operational_expenses').select('amount').is('deleted_at',null)
  ])
  setData(d||[])
  if(d&&d.length>0){
    const inf=d.reduce((s,r)=>s+Number(r.expected_inflow||0),0)
    const out=d.reduce((s,r)=>s+Number(r.expected_outflow||0),0)
    setSummary({inflow:inf,outflow:out,net:inf-out})
  }
  // Actual from bank
  const isInc=t=>t==='bank_transfer_in'||t==='cash_in'||t==='deposit'||t==='transfer_in'
  const actIncome=(br||[]).filter(r=>isInc(r.transaction_type)).reduce((s,r)=>s+Number(r.amount||0),0)
  const actExpense=(op||[]).reduce((s,r)=>s+Number(r.amount||0),0)
  setActual({income:actIncome,expense:actExpense})
  setOverBudget(actExpense>summary.outflow&&summary.outflow>0)
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

{/* تنبيه تجاوز الميزانية */}
{actual.expense>0&&summary.outflow>0&&actual.expense>summary.outflow&&<div style={{padding:'12px 16px',borderRadius:12,background:'rgba(192,57,43,.06)',border:'1px solid rgba(192,57,43,.15)',marginBottom:12,display:'flex',alignItems:'center',gap:10}}>
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
<div><div style={{fontSize:12,fontWeight:700,color:C.red}}>{T('الصرف الفعلي تجاوز المتوقع!','Actual spending exceeded forecast!')}</div>
<div style={{fontSize:11,color:'rgba(192,57,43,.6)',marginTop:2}}>{T('الفعلي: ','Actual: ')}{num(actual.expense)} — {T('المتوقع: ','Expected: ')}{num(summary.outflow)} — {T('الفرق: ','Diff: ')}{num(actual.expense-summary.outflow)}</div></div>
</div>}

{/* Actual vs Expected */}
<div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginBottom:16}}>
<div style={{padding:'14px 16px',borderRadius:12,background:'rgba(39,160,70,.04)',border:'1px solid rgba(39,160,70,.08)'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
<span style={{fontSize:10,fontWeight:700,color:C.ok}}>{T('الدخل','Income')}</span>
</div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
<div><div style={{fontSize:8,color:'var(--tx6)'}}>الفعلي</div><div style={{fontSize:20,fontWeight:900,color:C.ok}}>{num(actual.income)}</div></div>
<div style={{textAlign:'left'}}><div style={{fontSize:8,color:'var(--tx6)'}}>المتوقع</div><div style={{fontSize:14,fontWeight:600,color:'var(--tx5)'}}>{num(summary.inflow)}</div></div>
</div>
{summary.inflow>0&&<div style={{height:4,borderRadius:2,background:'rgba(255,255,255,.06)',overflow:'hidden',marginTop:8}}><div style={{height:'100%',width:Math.min(100,Math.round(actual.income/summary.inflow*100))+'%',borderRadius:2,background:C.ok}}/></div>}
</div>
<div style={{padding:'14px 16px',borderRadius:12,background:'rgba(192,57,43,.04)',border:'1px solid rgba(192,57,43,.08)'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
<span style={{fontSize:10,fontWeight:700,color:C.red}}>{T('المصاريف','Expenses')}</span>
{actual.expense>summary.outflow&&summary.outflow>0&&<span style={{fontSize:8,fontWeight:700,padding:'2px 6px',borderRadius:4,background:'rgba(192,57,43,.15)',color:C.red}}>تجاوز!</span>}
</div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
<div><div style={{fontSize:8,color:'var(--tx6)'}}>الفعلي</div><div style={{fontSize:20,fontWeight:900,color:C.red}}>{num(actual.expense)}</div></div>
<div style={{textAlign:'left'}}><div style={{fontSize:8,color:'var(--tx6)'}}>المتوقع</div><div style={{fontSize:14,fontWeight:600,color:'var(--tx5)'}}>{num(summary.outflow)}</div></div>
</div>
{summary.outflow>0&&<div style={{height:4,borderRadius:2,background:'rgba(255,255,255,.06)',overflow:'hidden',marginTop:8}}><div style={{height:'100%',width:Math.min(100,Math.round(actual.expense/summary.outflow*100))+'%',borderRadius:2,background:actual.expense>summary.outflow?C.red:'#e67e22'}}/></div>}
</div>
</div>

{/* تنبيه العجز */}
{hasDeficit&&<div style={{padding:'12px 16px',borderRadius:12,background:'rgba(192,57,43,.06)',border:'1px solid rgba(192,57,43,.12)',marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
<div><div style={{fontSize:12,fontWeight:700,color:C.red}}>{T('تحذير: يوجد عجز نقدي متوقع','Warning: Cash deficit forecasted')}</div>
<div style={{fontSize:11,color:'rgba(192,57,43,.6)',marginTop:2}}>{T('المصاريف المتوقعة قد تتجاوز الدخل في بعض الأسابيع','Expected expenses may exceed income in some weeks')}</div></div>
</div>}
{/* Recommendation */}
{summary.net<0&&<div style={{padding:'12px 16px',borderRadius:12,background:'rgba(201,168,76,.04)',border:'1px solid rgba(201,168,76,.1)',marginBottom:16,display:'flex',alignItems:'flex-start',gap:10}}>
<span style={{fontSize:16,flexShrink:0}}>💡</span>
<div><div style={{fontSize:12,fontWeight:700,color:C.gold}}>{T('توصية','Recommendation')}</div>
<div style={{fontSize:11,color:'var(--tx3)',marginTop:4,lineHeight:1.8}}>{T('تحصيل المستحقات المعلّقة من العملاء يمكن أن يغطي جزءاً من العجز المتوقع. راجع أعمار الديون في صفحة الفواتير.','Collecting outstanding receivables from clients can cover part of the expected deficit. Review aging in the invoices page.')}</div></div>
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
