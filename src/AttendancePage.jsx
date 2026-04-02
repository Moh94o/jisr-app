import React, { useState, useEffect, useCallback } from 'react'
const F="'Cairo','Tajawal',sans-serif"
const C={gold:'#c9a84c',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}
const num=v=>Number(v||0).toLocaleString('en-US')

export default function AttendancePage({sb,toast,user,lang}){
const T=(a,e)=>lang==='ar'?a:e
const[records,setRecords]=useState([]);const[monthly,setMonthly]=useState([]);const[loading,setLoading]=useState(true)
const[tab,setTab]=useState('today');const[month,setMonth]=useState(new Date().toISOString().slice(0,7))
const[checkingIn,setCheckingIn]=useState(false);const[myRecord,setMyRecord]=useState(null)
const[locations,setLocations]=useState([])

const today=new Date().toISOString().slice(0,10)

const load=useCallback(async()=>{setLoading(true)
const[rec,mon,loc,my]=await Promise.all([
  sb.from('attendance').select('*,users:user_id(name_ar)').eq('date',today).order('check_in_at'),
  sb.from('v_attendance_monthly').select('*').eq('month',month+'-01'),
  sb.from('office_locations').select('*').eq('is_active',true),
  sb.from('attendance').select('*').eq('user_id',user?.id).eq('date',today).maybeSingle()
])
setRecords(rec.data||[]);setMonthly(mon.data||[]);setLocations(loc.data||[]);setMyRecord(my.data);setLoading(false)},[sb,month,user])
useEffect(()=>{load()},[load])

const getLocation=()=>new Promise((resolve,reject)=>{
  if(!navigator.geolocation)return reject(new Error('GPS غير متاح'))
  navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude}),e=>reject(e),{enableHighAccuracy:true,timeout:10000})
})

const checkIn=async()=>{setCheckingIn(true);try{
  const pos=await getLocation()
  // التحقق من المسافة
  let minDist=Infinity,nearestLoc=null
  for(const loc of locations){
    const{data}=await sb.rpc('haversine_distance',{lat1:pos.lat,lng1:pos.lng,lat2:Number(loc.latitude),lng2:Number(loc.longitude)})
    if(data<minDist){minDist=data;nearestLoc=loc}
  }
  if(locations.length>0&&minDist>(nearestLoc?.radius_meters||200)){
    toast(T('أنت خارج نطاق المكتب! المسافة: '+minDist+' متر','Outside office range! Distance: '+minDist+'m'));setCheckingIn(false);return
  }
  const now=new Date()
  const workStart=nearestLoc?.work_start_time||'08:00'
  const[h,m]=workStart.split(':').map(Number)
  const startTime=new Date();startTime.setHours(h,m,0,0)
  const late=now>startTime;const lateMins=late?Math.floor((now-startTime)/60000):0
  const threshold=nearestLoc?.late_threshold_minutes||15

  await sb.from('attendance').upsert({user_id:user?.id,date:today,check_in_at:now.toISOString(),check_in_lat:pos.lat,check_in_lng:pos.lng,check_in_location_id:nearestLoc?.id,check_in_distance_meters:minDist,is_late:lateMins>threshold,late_minutes:lateMins,status:lateMins>threshold?'late':'present',branch_id:nearestLoc?.branch_id||user?.branch_id},{onConflict:'user_id,date'})
  toast(T('تم تسجيل الحضور ✓','Checked in ✓')+(lateMins>threshold?T(' (متأخر '+lateMins+' دقيقة)',' (Late '+lateMins+' min)'):' '+T('المسافة: '+minDist+' متر','Distance: '+minDist+'m')));load()
}catch(e){toast(T('خطأ: ','Error: ')+e.message)}setCheckingIn(false)}

const checkOut=async()=>{setCheckingIn(true);try{
  const pos=await getLocation()
  const now=new Date()
  const hours=myRecord?.check_in_at?Math.round((now-new Date(myRecord.check_in_at))/3600000*100)/100:0
  await sb.from('attendance').update({check_out_at:now.toISOString(),check_out_lat:pos.lat,check_out_lng:pos.lng,work_hours:hours,updated_at:now.toISOString()}).eq('user_id',user?.id).eq('date',today)
  toast(T('تم تسجيل الانصراف ✓ — ساعات العمل: '+hours,'Checked out ✓ — Hours: '+hours));load()
}catch(e){toast(T('خطأ: ','Error: ')+e.message)}setCheckingIn(false)}

const statusColors={present:C.ok,late:'#e67e22',absent:C.red,leave:C.blue,holiday:C.gold}
const statusLabels={present:T('حاضر','Present'),late:T('متأخر','Late'),absent:T('غائب','Absent'),leave:T('إجازة','Leave'),holiday:T('عطلة','Holiday')}

if(loading)return<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>
return<div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
<div><div style={{fontSize:22,fontWeight:800,color:'var(--tx)'}}>{T('الحضور والانصراف','Attendance')}</div>
<div style={{fontSize:12,color:'var(--tx4)',marginTop:4}}>{T('تسجيل الحضور بالموقع الجغرافي','Location-based attendance tracking')}</div></div></div>

{/* زر الحضور/الانصراف */}
<div style={{padding:'20px',borderRadius:14,background:myRecord?.check_in_at?'rgba(39,160,70,.04)':'rgba(201,168,76,.04)',border:'1px solid '+(myRecord?.check_in_at?'rgba(39,160,70,.12)':'rgba(201,168,76,.12)'),marginBottom:20,textAlign:'center'}}>
{!myRecord?.check_in_at?<>
<div style={{fontSize:14,color:'var(--tx3)',marginBottom:12}}>{T('لم تسجّل حضورك اليوم','You haven\'t checked in today')}</div>
<button onClick={checkIn} disabled={checkingIn} style={{height:50,padding:'0 40px',borderRadius:12,border:'none',background:C.gold,color:C.dk,fontFamily:F,fontSize:15,fontWeight:800,cursor:'pointer',opacity:checkingIn?.6:1}}>
{checkingIn?'...':T('تسجيل حضور ◎','Check In ◎')}</button>
<div style={{fontSize:10,color:'var(--tx5)',marginTop:8}}>{T('سيتم التحقق من موقعك الجغرافي','Your location will be verified')}</div>
</>:!myRecord?.check_out_at?<>
<div style={{fontSize:14,color:C.ok,marginBottom:4}}>✓ {T('تم تسجيل الحضور','Checked in')} — {new Date(myRecord.check_in_at).toLocaleTimeString(lang==='ar'?'ar':'en',{hour:'2-digit',minute:'2-digit'})}</div>
{myRecord.is_late&&<div style={{fontSize:11,color:'#e67e22',marginBottom:8}}>{T('متأخر','Late')} {myRecord.late_minutes} {T('دقيقة','min')}</div>}
<button onClick={checkOut} disabled={checkingIn} style={{height:44,padding:'0 32px',borderRadius:10,border:'1px solid rgba(192,57,43,.2)',background:'rgba(192,57,43,.08)',color:C.red,fontFamily:F,fontSize:13,fontWeight:700,cursor:'pointer',opacity:checkingIn?.6:1}}>
{checkingIn?'...':T('تسجيل انصراف','Check Out')}</button>
</>:<>
<div style={{fontSize:14,color:C.ok}}>✓ {T('يوم مكتمل','Day complete')} — {myRecord.work_hours||0} {T('ساعات','hours')}</div>
<div style={{fontSize:11,color:'var(--tx4)',marginTop:4}}>{new Date(myRecord.check_in_at).toLocaleTimeString(lang==='ar'?'ar':'en',{hour:'2-digit',minute:'2-digit'})} → {new Date(myRecord.check_out_at).toLocaleTimeString(lang==='ar'?'ar':'en',{hour:'2-digit',minute:'2-digit'})}</div>
</>}
</div>

{/* Tabs */}
<div style={{display:'flex',gap:4,marginBottom:16}}>
{[{v:'today',l:T('اليوم','Today')},{v:'monthly',l:T('الشهري','Monthly')}].map(t=>
<div key={t.v} onClick={()=>setTab(t.v)} style={{padding:'8px 16px',borderRadius:8,fontSize:11,fontWeight:tab===t.v?700:500,color:tab===t.v?C.gold:'rgba(255,255,255,.4)',background:tab===t.v?'rgba(201,168,76,.08)':'transparent',border:tab===t.v?'1.5px solid rgba(201,168,76,.15)':'1px solid rgba(255,255,255,.06)',cursor:'pointer'}}>{t.l}</div>)}
{tab==='monthly'&&<input type="month" value={month} onChange={e=>setMonth(e.target.value)} style={{height:34,padding:'0 10px',borderRadius:8,border:'1px solid var(--bd)',background:'var(--bg)',color:'var(--tx)',fontFamily:'inherit',fontSize:12,marginRight:'auto'}}/>}
</div>

{tab==='today'&&<div style={{display:'flex',flexDirection:'column',gap:6}}>
{records.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx5)'}}>{T('لا توجد سجلات اليوم','No records today')}</div>:
records.map(r=>{const clr=statusColors[r.status]||'#999'
return<div key={r.id} style={{padding:'12px 16px',borderRadius:10,background:'var(--bg)',border:'1px solid var(--bd)',display:'flex',alignItems:'center',gap:12}}>
<div style={{width:8,height:8,borderRadius:'50%',background:clr,flexShrink:0}}/>
<div style={{flex:1}}>
<div style={{fontSize:13,fontWeight:600,color:'var(--tx)'}}>{r.users?.name_ar||'—'}</div>
<div style={{fontSize:10,color:'var(--tx4)',marginTop:2}}>
{r.check_in_at&&<span>{T('دخول: ','In: ')}{new Date(r.check_in_at).toLocaleTimeString(lang==='ar'?'ar':'en',{hour:'2-digit',minute:'2-digit'})}</span>}
{r.check_out_at&&<span> | {T('خروج: ','Out: ')}{new Date(r.check_out_at).toLocaleTimeString(lang==='ar'?'ar':'en',{hour:'2-digit',minute:'2-digit'})}</span>}
{r.work_hours&&<span> | {r.work_hours} {T('ساعة','hrs')}</span>}
{r.check_in_distance_meters&&<span> | {r.check_in_distance_meters}{T('م','m')}</span>}
</div></div>
<span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:5,color:clr,background:clr+'15'}}>{statusLabels[r.status]||r.status}</span>
</div>})}
</div>}

{tab==='monthly'&&<div style={{background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:12,overflow:'hidden'}}>
<table style={{width:'100%',borderCollapse:'collapse'}}>
<thead><tr>{[T('الموظف','Employee'),T('أيام الحضور','Present'),T('غياب','Absent'),T('تأخر','Late'),T('م.ساعات','Avg Hrs'),T('الانضباط','Punctuality')].map(h=><th key={h} style={{padding:'10px 12px',fontSize:11,fontWeight:700,color:'var(--tx3)',textAlign:'right',borderBottom:'1px solid var(--bd)'}}>{h}</th>)}</tr></thead>
<tbody>{monthly.map(m=>{const pct=Number(m.punctuality_pct||0)
return<tr key={m.user_id} style={{borderBottom:'1px solid var(--bd2)'}}>
<td style={{padding:'10px 12px',fontSize:12,fontWeight:600,color:'var(--tx)'}}>{m.name_ar}</td>
<td style={{padding:'10px 12px',fontSize:12,fontWeight:700,color:C.ok,textAlign:'center'}}>{m.present_days}</td>
<td style={{padding:'10px 12px',fontSize:12,color:m.absent_days>0?C.red:'var(--tx4)',textAlign:'center'}}>{m.absent_days}</td>
<td style={{padding:'10px 12px',fontSize:12,color:m.late_days>0?'#e67e22':'var(--tx4)',textAlign:'center'}}>{m.late_days}</td>
<td style={{padding:'10px 12px',fontSize:12,color:'var(--tx3)',textAlign:'center'}}>{m.avg_work_hours||'—'}</td>
<td style={{padding:'10px 12px',textAlign:'center'}}><span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:5,color:pct>=90?C.ok:pct>=70?'#e67e22':C.red,background:(pct>=90?C.ok:pct>=70?'#e67e22':C.red)+'15'}}>{Math.round(pct)}%</span></td>
</tr>})}</tbody></table></div>}
</div>}
