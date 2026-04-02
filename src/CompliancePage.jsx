import React, { useState, useEffect, useCallback } from 'react'
const F="'Cairo','Tajawal',sans-serif"
const C={gold:'#c9a84c',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}
const num=v=>Number(v||0).toLocaleString('en-US')

export default function CompliancePage({sb,toast,user,lang}){
const T=(a,e)=>lang==='ar'?a:e
const[data,setData]=useState([]);const[loading,setLoading]=useState(true)
const[filter,setFilter]=useState('all');const[simPop,setSimPop]=useState(null)
const[simForm,setSimForm]=useState({add_saudi:0,add_non_saudi:0,remove_saudi:0,remove_non_saudi:0})
const[simResult,setSimResult]=useState(null)

const load=useCallback(async()=>{setLoading(true)
const{data:d}=await sb.from('v_facility_compliance').select('*').order('overall_status').order('name_ar')
setData(d||[]);setLoading(false)},[sb])
useEffect(()=>{load()},[load])

const runSim=async()=>{try{
  const{data}=await sb.rpc('simulate_saudization',{p_facility_id:simPop,...simForm})
  if(data&&data[0])setSimResult(data[0])
}catch(e){toast(T('خطأ','Error'))}}

const statusColors={compliant:C.ok,warning:'#e67e22',critical:C.red,violation:C.red,unknown:'#888'}
const statusLabels={compliant:T('ملتزم','Compliant'),warning:T('تحذير','Warning'),critical:T('حرج','Critical'),violation:T('مخالفة','Violation'),unknown:T('غير محدد','N/A')}
const nitaqatColors={red:C.red,yellow:'#e67e22',green_low:'#27a046',green_mid:'#2ecc71',green_high:'#1abc9c',platinum:C.gold}
const nitaqatLabels={red:T('أحمر','Red'),yellow:T('أصفر','Yellow'),green_low:T('أخضر منخفض','Green Low'),green_mid:T('أخضر متوسط','Green Mid'),green_high:T('أخضر مرتفع','Green High'),platinum:T('بلاتيني','Platinum')}

const filtered=filter==='all'?data:data.filter(f=>f.overall_status===filter)
const counts={compliant:data.filter(f=>f.overall_status==='compliant').length,warning:data.filter(f=>f.overall_status==='warning').length,critical:data.filter(f=>f.overall_status==='critical').length}
const fS={width:'100%',height:40,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:F,fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',background:'rgba(255,255,255,.06)',textAlign:'center',direction:'ltr'}

if(loading)return<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>
return<div>
<div style={{marginBottom:20}}><div style={{fontSize:22,fontWeight:800,color:'var(--tx)'}}>{T('الامتثال التنظيمي','Compliance')}</div>
<div style={{fontSize:12,color:'var(--tx4)',marginTop:4}}>{T('مراقبة التزام المنشآت بمتطلبات وزارة الموارد البشرية','Monitor facilities compliance with HRSD requirements')}</div></div>

{/* Summary */}
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(160px,100%),1fr))',gap:12,marginBottom:20}}>
{[{l:T('ملتزمة','Compliant'),v:counts.compliant,c:C.ok},{l:T('تحذير','Warning'),v:counts.warning,c:'#e67e22'},{l:T('حرج','Critical'),v:counts.critical,c:C.red},{l:T('إجمالي المنشآت','Total'),v:data.length,c:C.blue}].map(s=>
<div key={s.l} style={{padding:'16px',borderRadius:12,background:s.c+'08',border:'1px solid '+s.c+'15',textAlign:'center'}}>
<div style={{fontSize:28,fontWeight:800,color:s.c}}>{s.v}</div>
<div style={{fontSize:10,color:s.c,opacity:.7}}>{s.l}</div></div>)}
</div>

{/* Filters */}
<div style={{display:'flex',gap:4,marginBottom:16}}>
{['all','compliant','warning','critical'].map(f=><div key={f} onClick={()=>setFilter(f)}
style={{padding:'6px 12px',borderRadius:6,fontSize:10,fontWeight:filter===f?700:500,color:filter===f?(statusColors[f]||C.gold):'var(--tx4)',background:filter===f?'rgba(255,255,255,.06)':'transparent',border:'1px solid '+(filter===f?'rgba(255,255,255,.1)':'transparent'),cursor:'pointer'}}>{f==='all'?T('الكل','All'):statusLabels[f]} ({f==='all'?data.length:data.filter(d=>d.overall_status===f).length})</div>)}
</div>

{/* Facility cards */}
<div style={{display:'flex',flexDirection:'column',gap:10}}>
{filtered.map(f=>{const oc=statusColors[f.overall_status]||'#999'
return<div key={f.facility_id} style={{padding:'16px 18px',borderRadius:14,background:'var(--bg)',border:'1px solid var(--bd)',position:'relative',overflow:'hidden'}}>
<div style={{position:'absolute',top:0,left:0,right:0,height:3,background:oc}}/>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
<div><div style={{fontSize:14,fontWeight:700,color:'var(--tx)'}}>{f.name_ar}</div>
<div style={{fontSize:10,color:'var(--tx4)',marginTop:2}}>{f.unified_national_number||'—'}</div></div>
<div style={{display:'flex',gap:6,alignItems:'center'}}>
{f.nitaqat_color&&<span style={{fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:6,color:nitaqatColors[f.nitaqat_color]||'#999',background:(nitaqatColors[f.nitaqat_color]||'#999')+'15'}}>{nitaqatLabels[f.nitaqat_color]||f.nitaqat_color}</span>}
<span style={{fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:6,color:oc,background:oc+'15'}}>{statusLabels[f.overall_status]||f.overall_status}</span>
</div></div>

<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(130px,100%),1fr))',gap:8}}>
{/* السعودة */}
<div style={{padding:'8px 10px',borderRadius:8,background:statusColors[f.saudization_status]+'08',border:'1px solid '+statusColors[f.saudization_status]+'15'}}>
<div style={{fontSize:9,color:'var(--tx4)'}}>{T('السعودة','Saudization')}</div>
<div style={{fontSize:16,fontWeight:800,color:statusColors[f.saudization_status]}}>{Number(f.saudization_pct||0).toFixed(1)}%</div>
<div style={{fontSize:9,color:'var(--tx5)'}}>{f.saudi_workers||0} / {f.total_workers||0}</div></div>

{/* حماية الأجور */}
<div style={{padding:'8px 10px',borderRadius:8,background:statusColors[f.wps_status]+'08',border:'1px solid '+statusColors[f.wps_status]+'15'}}>
<div style={{fontSize:9,color:'var(--tx4)'}}>{T('حماية الأجور','WPS')}</div>
<div style={{fontSize:14,fontWeight:700,color:statusColors[f.wps_status]}}>{f.wps_status_text||T('غير محدد','N/A')}</div></div>

{/* السجل */}
<div style={{padding:'8px 10px',borderRadius:8,background:statusColors[f.cr_status_compliance]+'08',border:'1px solid '+statusColors[f.cr_status_compliance]+'15'}}>
<div style={{fontSize:9,color:'var(--tx4)'}}>{T('السجل التجاري','CR')}</div>
<div style={{fontSize:14,fontWeight:700,color:statusColors[f.cr_status_compliance]}}>{f.cr_days_remaining!=null?f.cr_days_remaining+T(' يوم',' d'):T('—','—')}</div></div>

{/* التأمينات */}
<div style={{padding:'8px 10px',borderRadius:8,background:'rgba(255,255,255,.03)',border:'1px solid var(--bd2)'}}>
<div style={{fontSize:9,color:'var(--tx4)'}}>{T('التأمينات','GOSI')}</div>
<div style={{fontSize:12,fontWeight:600,color:'var(--tx3)'}}>{f.gosi_status||'—'}</div></div>

{/* الإقامات */}
{(Number(f.expired_iqamas)>0||Number(f.expiring_iqamas_30d)>0)&&<div style={{padding:'8px 10px',borderRadius:8,background:C.red+'08',border:'1px solid '+C.red+'15'}}>
<div style={{fontSize:9,color:C.red}}>{T('إقامات','Iqamas')}</div>
<div style={{fontSize:10,color:C.red}}>{f.expired_iqamas>0&&<span style={{fontWeight:700}}>{f.expired_iqamas} {T('منتهية','expired')}</span>} {f.expiring_iqamas_30d>0&&<span>{f.expiring_iqamas_30d} {T('تنتهي قريباً','expiring')}</span>}</div></div>}
</div>

<div style={{marginTop:10,display:'flex',justifyContent:'flex-end'}}>
<button onClick={()=>{setSimPop(f.facility_id);setSimForm({add_saudi:0,add_non_saudi:0,remove_saudi:0,remove_non_saudi:0});setSimResult(null)}}
style={{fontSize:10,padding:'4px 12px',borderRadius:6,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.06)',color:C.gold,cursor:'pointer',fontFamily:F,fontWeight:600}}>{T('محاكاة نطاقات','Simulate')}</button>
</div></div>})}
</div>

{/* محاكي نطاقات */}
{simPop&&<div onClick={()=>setSimPop(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.8)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(480px,96vw)',display:'flex',flexDirection:'column',overflow:'hidden',border:'1px solid var(--bd)'}}>
<div style={{height:3,background:`linear-gradient(90deg,transparent,${C.gold},transparent)`}}/>
<div style={{padding:'16px 22px',borderBottom:'1px solid var(--bd)',fontSize:15,fontWeight:700,color:'var(--tx)'}}>{T('محاكي نطاقات','Nitaqat Simulator')}</div>
<div style={{padding:'18px 22px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<div><div style={{fontSize:11,color:C.ok,marginBottom:4}}>{T('إضافة سعوديين','+ Saudi')}</div><input type="number" min="0" value={simForm.add_saudi} onChange={e=>setSimForm(p=>({...p,add_saudi:Number(e.target.value)||0}))} style={fS}/></div>
<div><div style={{fontSize:11,color:C.blue,marginBottom:4}}>{T('إضافة غير سعوديين','+ Non-Saudi')}</div><input type="number" min="0" value={simForm.add_non_saudi} onChange={e=>setSimForm(p=>({...p,add_non_saudi:Number(e.target.value)||0}))} style={fS}/></div>
<div><div style={{fontSize:11,color:C.red,marginBottom:4}}>{T('إزالة سعوديين','- Saudi')}</div><input type="number" min="0" value={simForm.remove_saudi} onChange={e=>setSimForm(p=>({...p,remove_saudi:Number(e.target.value)||0}))} style={fS}/></div>
<div><div style={{fontSize:11,color:'#e67e22',marginBottom:4}}>{T('إزالة غير سعوديين','- Non-Saudi')}</div><input type="number" min="0" value={simForm.remove_non_saudi} onChange={e=>setSimForm(p=>({...p,remove_non_saudi:Number(e.target.value)||0}))} style={fS}/></div>
<div style={{gridColumn:'1/-1'}}><button onClick={runSim} style={{width:'100%',height:40,borderRadius:8,border:'1px solid rgba(201,168,76,.3)',background:'rgba(201,168,76,.12)',color:C.gold,fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer'}}>{T('محاكاة','Simulate')}</button></div>
</div>
{simResult&&<div style={{padding:'0 22px 18px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<div style={{padding:'12px',borderRadius:10,background:'rgba(255,255,255,.03)',border:'1px solid var(--bd)',textAlign:'center'}}>
<div style={{fontSize:10,color:'var(--tx4)'}}>{T('الحالي','Current')}</div>
<div style={{fontSize:20,fontWeight:800,color:'var(--tx)'}}>{simResult.current_pct}%</div>
<div style={{fontSize:10,color:'var(--tx5)'}}>{simResult.current_saudi}S / {simResult.current_total}T</div>
<div style={{fontSize:10,fontWeight:600,color:nitaqatColors[simResult.current_nitaqat]||'#999',marginTop:4}}>{nitaqatLabels[simResult.current_nitaqat]||simResult.current_nitaqat}</div></div>
<div style={{padding:'12px',borderRadius:10,background:simResult.new_pct>simResult.current_pct?'rgba(39,160,70,.06)':'rgba(192,57,43,.06)',border:'1px solid '+(simResult.new_pct>simResult.current_pct?'rgba(39,160,70,.1)':'rgba(192,57,43,.1)'),textAlign:'center'}}>
<div style={{fontSize:10,color:simResult.new_pct>simResult.current_pct?C.ok:C.red}}>{T('المتوقع','Projected')}</div>
<div style={{fontSize:20,fontWeight:800,color:simResult.new_pct>simResult.current_pct?C.ok:C.red}}>{simResult.new_pct}%</div>
<div style={{fontSize:10,color:'var(--tx5)'}}>{simResult.new_saudi}S / {simResult.new_total}T</div>
<div style={{fontSize:10,fontWeight:600,color:nitaqatColors[simResult.projected_nitaqat]||'#999',marginTop:4}}>{nitaqatLabels[simResult.projected_nitaqat]||simResult.projected_nitaqat}</div></div>
</div>}
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',textAlign:'center'}}>
<button onClick={()=>setSimPop(null)} style={{height:36,padding:'0 20px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:12,cursor:'pointer'}}>{T('إغلاق','Close')}</button>
</div></div></div>}
</div>}
