import React, { useState, useEffect, useCallback } from 'react'
const F="'Cairo','Tajawal',sans-serif"
const C={gold:'#c9a84c',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}

export default function CalendarPage({sb,toast,user,lang,onNavigate}){
const T=(a,e)=>lang==='ar'?a:e
const[events,setEvents]=useState([]);const[loading,setLoading]=useState(true)
const[viewMode,setViewMode]=useState('month')
const[currentDate,setCurrentDate]=useState(new Date())
const[selectedDay,setSelectedDay]=useState(null)
const[typeFilter,setTypeFilter]=useState('all')

const load=useCallback(async()=>{
  setLoading(true)
  const{data}=await sb.from('v_unified_calendar').select('*').gte('event_date',new Date(currentDate.getFullYear(),currentDate.getMonth()-1,1).toISOString().slice(0,10)).lte('event_date',new Date(currentDate.getFullYear(),currentDate.getMonth()+2,0).toISOString().slice(0,10)).order('event_date').order('event_time')
  setEvents(data||[]);setLoading(false)
},[sb,currentDate])
useEffect(()=>{load()},[load])

const typeLabels={appointment:{l:T('موعد','Appt'),c:C.gold,icon:'◎'},task:{l:T('مهمة','Task'),c:C.blue,icon:'▣'},installment:{l:T('قسط','Inst.'),c:C.red,icon:'◉'},iqama_expiry:{l:T('إقامة','Iqama'),c:C.red,icon:'▤'},cr_expiry:{l:T('سجل','CR'),c:'#e67e22',icon:'▥'}}

// حساب أيام الشهر
const year=currentDate.getFullYear(),month=currentDate.getMonth()
const firstDay=new Date(year,month,1).getDay()
const daysInMonth=new Date(year,month+1,0).getDate()
const today=new Date().toISOString().slice(0,10)
const days=[]
for(let i=0;i<firstDay;i++)days.push(null)
for(let d=1;d<=daysInMonth;d++)days.push(d)

const getEventsForDay=(day)=>{
  if(!day)return[]
  const dateStr=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  return events.filter(e=>e.event_date===dateStr&&(typeFilter==='all'||e.event_type===typeFilter))
}

const navMonth=(dir)=>{const d=new Date(currentDate);d.setMonth(d.getMonth()+dir);setCurrentDate(d);setSelectedDay(null)}
const monthLabel=currentDate.toLocaleDateString(lang==='ar'?'ar-SA':'en',{month:'long',year:'numeric'})
const dayNames=lang==='ar'?['أحد','إثن','ثلا','أرب','خمي','جمع','سبت']:['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const selectedDateStr=selectedDay?`${year}-${String(month+1).padStart(2,'0')}-${String(selectedDay).padStart(2,'0')}`:null
const dayEvents=selectedDay?getEventsForDay(selectedDay):[]

if(loading)return<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>
return<div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
<div><div style={{fontSize:22,fontWeight:800,color:'var(--tx)'}}>{T('التقويم','Calendar')}</div>
<div style={{fontSize:12,color:'var(--tx4)',marginTop:4}}>{T('جميع المواعيد والمهام والاستحقاقات في مكان واحد','All appointments, tasks & dues in one place')}</div></div>
</div>

{/* فلاتر الأنواع */}
<div style={{display:'flex',gap:4,marginBottom:16,flexWrap:'wrap'}}>
<div onClick={()=>setTypeFilter('all')} style={{padding:'5px 12px',borderRadius:6,fontSize:10,fontWeight:typeFilter==='all'?700:500,color:typeFilter==='all'?C.gold:'var(--tx4)',background:typeFilter==='all'?'rgba(201,168,76,.08)':'transparent',border:'1px solid '+(typeFilter==='all'?'rgba(201,168,76,.15)':'rgba(255,255,255,.06)'),cursor:'pointer'}}>{T('الكل','All')}</div>
{Object.entries(typeLabels).map(([k,v])=><div key={k} onClick={()=>setTypeFilter(k)} style={{padding:'5px 12px',borderRadius:6,fontSize:10,fontWeight:typeFilter===k?700:500,color:typeFilter===k?v.c:'var(--tx4)',background:typeFilter===k?v.c+'12':'transparent',border:'1px solid '+(typeFilter===k?v.c+'25':'rgba(255,255,255,.06)'),cursor:'pointer'}}>{v.icon} {v.l}</div>)}
</div>

{/* التنقل بين الأشهر */}
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
<button onClick={()=>navMonth(-1)} style={{width:34,height:34,borderRadius:8,border:'1px solid var(--bd)',background:'var(--bg)',color:'var(--tx3)',cursor:'pointer',fontFamily:F,fontSize:14}}>‹</button>
<div style={{fontSize:16,fontWeight:800,color:'var(--tx)'}}>{monthLabel}</div>
<button onClick={()=>navMonth(1)} style={{width:34,height:34,borderRadius:8,border:'1px solid var(--bd)',background:'var(--bg)',color:'var(--tx3)',cursor:'pointer',fontFamily:F,fontSize:14}}>›</button>
</div>

{/* شبكة التقويم */}
<div style={{background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:14,overflow:'hidden',marginBottom:16}}>
{/* أسماء الأيام */}
<div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',borderBottom:'1px solid var(--bd)'}}>
{dayNames.map(d=><div key={d} style={{padding:'8px 4px',textAlign:'center',fontSize:10,fontWeight:700,color:'var(--tx4)'}}>{d}</div>)}
</div>
{/* الأيام */}
<div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
{days.map((d,i)=>{
  if(!d)return<div key={'e'+i} style={{padding:8,minHeight:70,borderBottom:'1px solid var(--bd2)',borderRight:'1px solid var(--bd2)'}}/>
  const dateStr=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  const dayEvts=getEventsForDay(d)
  const isToday=dateStr===today
  const isSel=selectedDay===d
  return<div key={d} onClick={()=>setSelectedDay(isSel?null:d)} style={{padding:'6px 4px',minHeight:70,borderBottom:'1px solid var(--bd2)',borderRight:'1px solid var(--bd2)',cursor:'pointer',background:isSel?'rgba(201,168,76,.06)':isToday?'rgba(201,168,76,.03)':'transparent',transition:'.15s'}}>
  <div style={{fontSize:12,fontWeight:isToday?800:500,color:isToday?C.gold:isSel?'var(--tx)':'var(--tx3)',textAlign:'center',marginBottom:4}}>{d}</div>
  <div style={{display:'flex',flexWrap:'wrap',gap:2,justifyContent:'center'}}>
  {dayEvts.slice(0,4).map((e,j)=>{const t=typeLabels[e.event_type]||{c:'#999'}
    return<div key={j} style={{width:6,height:6,borderRadius:'50%',background:t.c||'#999'}}/>
  })}
  {dayEvts.length>4&&<div style={{fontSize:7,color:'var(--tx5)'}}>+{dayEvts.length-4}</div>}
  </div></div>
})}
</div></div>

{/* تفاصيل اليوم المختار */}
{selectedDay&&<div style={{padding:'16px 18px',borderRadius:14,background:'rgba(201,168,76,.04)',border:'1px solid rgba(201,168,76,.1)'}}>
<div style={{fontSize:13,fontWeight:700,color:C.gold,marginBottom:12}}>{selectedDay} {monthLabel.split(' ')[0]} — {dayEvents.length} {T('حدث','events')}</div>
{dayEvents.length===0?<div style={{fontSize:12,color:'var(--tx5)',padding:'12px 0'}}>{T('لا توجد أحداث','No events')}</div>:
<div style={{display:'flex',flexDirection:'column',gap:8}}>
{dayEvents.map((e,i)=>{const t=typeLabels[e.event_type]||{l:'—',c:'#999',icon:'•'}
return<div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:8,background:'rgba(255,255,255,.03)',border:'1px solid var(--bd2)'}}>
<div style={{width:4,height:30,borderRadius:2,background:t.c,flexShrink:0}}/>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:12,fontWeight:600,color:'var(--tx)'}}>{e.title_ar}</div>
<div style={{fontSize:10,color:'var(--tx4)',display:'flex',gap:8,marginTop:2}}>
{e.event_time&&<span>{e.event_time?.slice(0,5)}</span>}
<span style={{color:t.c}}>{t.l}</span>
{e.related_name&&<span>{e.related_name}</span>}
{e.status&&<span style={{padding:'0 4px',borderRadius:3,background:'rgba(255,255,255,.06)'}}>{e.status}</span>}
</div></div></div>})}
</div>}
</div>}
</div>}
