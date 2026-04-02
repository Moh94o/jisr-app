import React, { useState, useEffect, useCallback, useRef } from 'react'
const F="'Cairo','Tajawal',sans-serif"
const C={gold:'#c9a84c',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}
const num=v=>Number(v||0).toLocaleString('en-US')

export default function LiveMonitorPage({sb,toast,lang}){
const T=(a,e)=>lang==='ar'?a:e
const[data,setData]=useState(null);const[activity,setActivity]=useState([]);const[loading,setLoading]=useState(true)
const[lastUpdate,setLastUpdate]=useState(null)
const timerRef=useRef(null)

const load=useCallback(async()=>{
  const{data:d}=await sb.from('v_live_monitor').select('*').single()
  setData(d)
  const{data:act}=await sb.from('activity_log').select('*,users:user_id(name_ar)').order('created_at',{ascending:false}).limit(15)
  setActivity(act||[])
  setLastUpdate(new Date())
  setLoading(false)
},[sb])

useEffect(()=>{load();timerRef.current=setInterval(load,60000);return()=>clearInterval(timerRef.current)},[load])

const timeAgo=(d)=>{const s=Math.floor((Date.now()-new Date(d))/1000);if(s<60)return T('الآن','now');if(s<3600)return Math.floor(s/60)+T(' دقيقة',' min');return Math.floor(s/3600)+T(' ساعة',' hr')}
const actionIcons={insert:'◎',update:'✎',delete:'✕'}

if(loading||!data)return<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>
return<div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
<div><div style={{fontSize:22,fontWeight:800,color:'var(--tx)',display:'flex',alignItems:'center',gap:8}}>{T('المراقبة الحية','Live Monitor')} <span style={{width:8,height:8,borderRadius:'50%',background:C.ok,animation:'breathe 2s infinite'}}></span></div>
<div style={{fontSize:12,color:'var(--tx4)',marginTop:4}}>{T('تحديث تلقائي كل دقيقة','Auto-refresh every minute')} {lastUpdate&&<span>— {lastUpdate.toLocaleTimeString(lang==='ar'?'ar':'en',{hour:'2-digit',minute:'2-digit'})}</span>}</div></div>
<button onClick={load} style={{height:36,padding:'0 14px',borderRadius:8,border:'1px solid var(--bd)',background:'var(--bg)',color:'var(--tx3)',fontFamily:F,fontSize:11,fontWeight:600,cursor:'pointer'}}>↻ {T('تحديث','Refresh')}</button>
</div>

{/* البطاقات الرئيسية */}
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(150px,100%),1fr))',gap:10,marginBottom:20}}>
{[
{l:T('معاملات جارية','Active Txn'),v:data.active_transactions,c:C.blue,icon:'▣'},
{l:T('فواتير متأخرة','Overdue Inv.'),v:data.overdue_invoices,c:C.red,icon:'◎',alert:data.overdue_invoices>0},
{l:T('مبلغ متأخر','Overdue Amt'),v:num(data.overdue_amount),c:C.red,icon:'◉',sub:T('ر.س','SAR')},
{l:T('إقامات تنتهي 7 أيام','Iqama 7d'),v:data.expiring_iqamas_7d,c:'#e67e22',icon:'▤',alert:data.expiring_iqamas_7d>0},
{l:T('سجلات تنتهي 7 أيام','CR 7d'),v:data.expiring_cr_7d,c:'#e67e22',icon:'▥',alert:data.expiring_cr_7d>0},
{l:T('مهام متأخرة','Overdue Tasks'),v:data.overdue_tasks,c:C.red,icon:'▦',alert:data.overdue_tasks>0},
{l:T('مهام اليوم','Today Tasks'),v:data.today_tasks,c:C.gold,icon:'▧'},
{l:T('مواعيد اليوم','Today Appt.'),v:data.today_appointments,c:C.gold,icon:'▨'},
{l:T('تحصيل اليوم','Today Col.'),v:num(data.today_collections),c:C.ok,icon:'◉',sub:T('ر.س','SAR')},
{l:T('مكتملة اليوم','Done Today'),v:data.today_completed,c:C.ok,icon:'✓'}
].map(s=><div key={s.l} style={{padding:'14px 16px',borderRadius:12,background:s.alert?s.c+'08':'rgba(255,255,255,.02)',border:'1px solid '+(s.alert?s.c+'20':'var(--bd)'),position:'relative',overflow:'hidden'}}>
{s.alert&&<div style={{position:'absolute',top:0,left:0,right:0,height:2,background:s.c,animation:'breathe 2s infinite'}}/>}
<div style={{fontSize:9,color:s.c,opacity:.7,marginBottom:6,display:'flex',alignItems:'center',gap:4}}><span style={{fontSize:12}}>{s.icon}</span> {s.l}</div>
<div style={{fontSize:22,fontWeight:800,color:'var(--tx)'}}>{s.v}</div>
{s.sub&&<div style={{fontSize:9,color:'var(--tx5)',marginTop:2}}>{s.sub}</div>}
</div>)}
</div>

{/* آخر الحركات */}
<div style={{padding:'16px 18px',borderRadius:14,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)'}}>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx3)',marginBottom:14,display:'flex',alignItems:'center',gap:6}}>
<span style={{width:6,height:6,borderRadius:'50%',background:C.ok,animation:'breathe 1.5s infinite'}}></span>
{T('آخر الحركات','Live Activity')}
</div>
{activity.length===0?<div style={{textAlign:'center',padding:20,color:'var(--tx5)',fontSize:12}}>{T('لا توجد حركات','No activity')}</div>:
<div style={{display:'flex',flexDirection:'column',gap:6}}>
{activity.map((a,i)=><div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:8,background:i===0?'rgba(201,168,76,.03)':'transparent',border:'1px solid '+(i===0?'rgba(201,168,76,.08)':'transparent')}}>
<div style={{width:28,height:28,borderRadius:'50%',background:'rgba(255,255,255,.05)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'var(--tx4)',flexShrink:0}}>{actionIcons[a.action]||'•'}</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:12,color:'var(--tx2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.description||a.entity_type+' — '+a.action}</div>
<div style={{fontSize:10,color:'var(--tx5)',marginTop:2}}>{a.users?.name_ar||'—'}</div></div>
<div style={{fontSize:10,color:'var(--tx5)',whiteSpace:'nowrap'}}>{timeAgo(a.created_at)}</div>
</div>)}</div>}
</div>
</div>}
