import React, { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
const F="'Cairo','Tajawal',sans-serif"
const C={gold:'#c9a84c',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}
const num=v=>Number(v||0).toLocaleString('en-US')

export default function ProfitabilityPage({sb,toast,lang}){
const T=(a,e)=>lang==='ar'?a:e
const[clients,setClients]=useState([]);const[services,setServices]=useState([]);const[loading,setLoading]=useState(true)
const[tab,setTab]=useState('clients');const[sortBy,setSortBy]=useState('total_collected')

const load=useCallback(async()=>{
  setLoading(true)
  const[c,s]=await Promise.all([
    sb.from('v_client_profitability').select('*').gt('total_invoices',0),
    sb.from('v_service_profitability').select('*').gt('total_transactions',0)
  ])
  setClients((c.data||[]).sort((a,b)=>Number(b.total_collected||0)-Number(a.total_collected||0)))
  setServices((s.data||[]).sort((a,b)=>Number(b.total_transactions||0)-Number(a.total_transactions||0)))
  setLoading(false)
},[sb])
useEffect(()=>{load()},[load])

const totalRev=clients.reduce((s,c)=>s+Number(c.total_revenue||0),0)
const totalCol=clients.reduce((s,c)=>s+Number(c.total_collected||0),0)
const totalOut=clients.reduce((s,c)=>s+Number(c.total_outstanding||0),0)

const topClients=clients.slice(0,10).map(c=>({name:c.client_name?.slice(0,15),revenue:Number(c.total_revenue||0),collected:Number(c.total_collected||0)}))

if(loading)return<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>
return<div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
<div><div style={{fontSize:22,fontWeight:800,color:'var(--tx)'}}>{T('تقرير الربحية','Profitability')}</div>
<div style={{fontSize:12,color:'var(--tx4)',marginTop:4}}>{T('تحليل ربحية العملاء والخدمات','Client & service profitability analysis')}</div></div></div>

{/* Summary */}
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(180px,100%),1fr))',gap:12,marginBottom:20}}>
<div style={{padding:'14px 16px',borderRadius:12,background:'rgba(201,168,76,.06)',border:'1px solid rgba(201,168,76,.1)'}}>
<div style={{fontSize:10,color:C.gold,opacity:.7}}>{T('إجمالي الإيرادات','Total Revenue')}</div>
<div style={{fontSize:20,fontWeight:800,color:C.gold,marginTop:4}}>{num(totalRev)}</div></div>
<div style={{padding:'14px 16px',borderRadius:12,background:'rgba(39,160,70,.06)',border:'1px solid rgba(39,160,70,.1)'}}>
<div style={{fontSize:10,color:C.ok,opacity:.7}}>{T('المحصّل','Collected')}</div>
<div style={{fontSize:20,fontWeight:800,color:C.ok,marginTop:4}}>{num(totalCol)}</div></div>
<div style={{padding:'14px 16px',borderRadius:12,background:'rgba(192,57,43,.06)',border:'1px solid rgba(192,57,43,.1)'}}>
<div style={{fontSize:10,color:C.red,opacity:.7}}>{T('المتبقي','Outstanding')}</div>
<div style={{fontSize:20,fontWeight:800,color:C.red,marginTop:4}}>{num(totalOut)}</div></div>
<div style={{padding:'14px 16px',borderRadius:12,background:'rgba(52,131,180,.06)',border:'1px solid rgba(52,131,180,.1)'}}>
<div style={{fontSize:10,color:C.blue,opacity:.7}}>{T('عدد العملاء','Clients')}</div>
<div style={{fontSize:20,fontWeight:800,color:C.blue,marginTop:4}}>{clients.length}</div></div>
</div>

{/* Tabs */}
<div style={{display:'flex',gap:4,marginBottom:16}}>
{[{v:'clients',l:T('العملاء','Clients')},{v:'services',l:T('الخدمات','Services')},{v:'chart',l:T('رسم بياني','Chart')}].map(t=>
<div key={t.v} onClick={()=>setTab(t.v)} style={{padding:'8px 16px',borderRadius:8,fontSize:11,fontWeight:tab===t.v?700:500,color:tab===t.v?C.gold:'rgba(255,255,255,.4)',background:tab===t.v?'rgba(201,168,76,.08)':'transparent',border:tab===t.v?'1.5px solid rgba(201,168,76,.15)':'1px solid rgba(255,255,255,.06)',cursor:'pointer'}}>{t.l}</div>)}
</div>

{tab==='clients'&&<div style={{background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:12,overflow:'hidden'}}>
<table style={{width:'100%',borderCollapse:'collapse'}}>
<thead><tr>{[T('العميل','Client'),T('الفواتير','Invoices'),T('الإيرادات','Revenue'),T('المحصّل','Collected'),T('المتبقي','Outstd.'),T('نسبة التحصيل','Rate'),T('المعاملات','Txn')].map(h=><th key={h} style={{padding:'10px 12px',fontSize:11,fontWeight:700,color:'var(--tx3)',textAlign:'right',borderBottom:'1px solid var(--bd)'}}>{h}</th>)}</tr></thead>
<tbody>{clients.slice(0,30).map((c,i)=>{const rate=Number(c.collection_rate_pct||0)
return<tr key={c.client_id} style={{borderBottom:'1px solid var(--bd2)'}}>
<td style={{padding:'10px 12px',fontSize:12,fontWeight:600,color:'var(--tx)'}}><span style={{fontSize:10,color:'var(--tx5)',marginLeft:4}}>{i+1}.</span> {c.client_name}</td>
<td style={{padding:'10px 12px',fontSize:12,color:'var(--tx3)',textAlign:'center'}}>{c.total_invoices}</td>
<td style={{padding:'10px 12px',fontSize:12,fontWeight:700,color:C.gold,direction:'ltr',textAlign:'left'}}>{num(c.total_revenue)}</td>
<td style={{padding:'10px 12px',fontSize:12,fontWeight:700,color:C.ok,direction:'ltr',textAlign:'left'}}>{num(c.total_collected)}</td>
<td style={{padding:'10px 12px',fontSize:12,color:C.red,direction:'ltr',textAlign:'left'}}>{num(c.total_outstanding)}</td>
<td style={{padding:'10px 12px',textAlign:'center'}}><span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:5,color:rate>=80?C.ok:rate>=50?'#e67e22':C.red,background:(rate>=80?C.ok:rate>=50?'#e67e22':C.red)+'15'}}>{Math.round(rate)}%</span></td>
<td style={{padding:'10px 12px',fontSize:11,color:'var(--tx4)',textAlign:'center'}}>{c.completed_transactions}/{c.total_transactions}</td>
</tr>})}</tbody></table></div>}

{tab==='services'&&<div style={{display:'flex',flexDirection:'column',gap:10}}>
{services.map(s=><div key={s.service_code} style={{padding:'14px 18px',borderRadius:12,background:'var(--bg)',border:'1px solid var(--bd)',display:'flex',alignItems:'center',gap:14}}>
<div style={{flex:1}}>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>{s.service_name||s.service_code}</div>
<div style={{fontSize:11,color:'var(--tx4)',marginTop:4,display:'flex',gap:12}}>
<span>{s.total_transactions} {T('معاملة','txn')}</span>
<span style={{color:C.ok}}>{s.completed} {T('مكتملة','done')}</span>
{s.avg_days&&<span>{s.avg_days} {T('يوم متوسط','avg days')}</span>}
</div></div>
</div>)}
</div>}

{tab==='chart'&&topClients.length>0&&<div style={{padding:'18px 20px',borderRadius:14,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)'}}>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx3)',marginBottom:16}}>{T('أعلى 10 عملاء','Top 10 Clients')}</div>
<ResponsiveContainer width="100%" height={300}>
<BarChart data={topClients} layout="vertical" barGap={4}>
<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)"/>
<XAxis type="number" tick={{fontSize:10,fill:'rgba(255,255,255,.4)'}} tickFormatter={v=>(v/1000)+'K'}/>
<YAxis type="category" dataKey="name" tick={{fontSize:10,fill:'rgba(255,255,255,.5)'}} width={100}/>
<Tooltip contentStyle={{background:'#1e1e1e',border:'1px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:11}} formatter={v=>[num(v)+T(' ر.س',' SAR')]}/>
<Bar dataKey="revenue" name={T('الإيرادات','Revenue')} fill="rgba(201,168,76,.3)" radius={[0,4,4,0]}/>
<Bar dataKey="collected" name={T('المحصّل','Collected')} fill={C.ok} radius={[0,4,4,0]}/>
</BarChart></ResponsiveContainer></div>}
</div>}
