import React, { useState, useEffect, useCallback } from 'react'
const F="'Cairo','Tajawal',sans-serif"
const C={gold:'#c9a84c',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}
const num=v=>Number(v||0).toLocaleString('en-US')

export default function AutoAlertsPage({sb,toast,user,lang}){
const T=(a,e)=>lang==='ar'?a:e
const[rules,setRules]=useState([]);const[logs,setLogs]=useState([]);const[loading,setLoading]=useState(true)
const[tab,setTab]=useState('rules');const[editPop,setEditPop]=useState(null);const[saving,setSaving]=useState(false)
const[form,setForm]=useState({});const[logFilter,setLogFilter]=useState('all')

const load=useCallback(async()=>{
  setLoading(true)
  const[r,l]=await Promise.all([
    sb.from('auto_alert_rules').select('*').order('entity_type'),
    sb.from('auto_alert_log').select('*').order('created_at',{ascending:false}).limit(100)
  ])
  setRules(r.data||[]);setLogs(l.data||[]);setLoading(false)
},[sb])
useEffect(()=>{load()},[load])

const toggleRule=async(id,active)=>{
  await sb.from('auto_alert_rules').update({is_active:!active}).eq('id',id)
  toast(T(active?'تم التعطيل':'تم التفعيل',active?'Disabled':'Enabled'));load()
}

const saveRule=async()=>{
  setSaving(true)
  try{
    const row={...form,days_before:form.days_before_str?form.days_before_str.split(',').map(Number):form.days_before||[30,15,7]}
    delete row.days_before_str;delete row.id
    if(editPop==='new'){await sb.from('auto_alert_rules').insert({...row,created_by:user?.id})}
    else{await sb.from('auto_alert_rules').update(row).eq('id',editPop)}
    toast(T('تم الحفظ','Saved'));setEditPop(null);load()
  }catch(e){toast(T('خطأ','Error')+': '+e.message)}
  setSaving(false)
}

const entityLabels={worker:T('عامل','Worker'),facility:T('منشأة','Facility'),client:T('عميل','Client'),invoice:T('فاتورة','Invoice'),installment:T('قسط','Installment')}
const channelLabels={whatsapp:'واتساب',sms:'SMS',internal:T('داخلي','Internal'),email:T('بريد','Email')}
const statusColors={pending:C.gold,sent:C.ok,failed:C.red,skipped:'#888'}
const fS={width:'100%',height:40,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:F,fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',background:'rgba(255,255,255,.06)',textAlign:'right'}

if(loading)return<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>
return<div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
<div><div style={{fontSize:22,fontWeight:800,color:'var(--tx)'}}>{T('التنبيهات التلقائية','Auto Alerts')}</div>
<div style={{fontSize:12,color:'var(--tx4)',marginTop:4}}>{T('إدارة تنبيهات الواتساب والإشعارات قبل انتهاء المستندات','Manage WhatsApp & notification alerts before document expiry')}</div></div>
<button onClick={()=>{setForm({name_ar:'',entity_type:'worker',field_name:'iqama_expiry_date',days_before:[30,15,7],days_before_str:'30,15,7',channel:'whatsapp',send_to:'client',create_task:false,task_title_template:'',is_active:true});setEditPop('new')}}
style={{height:36,padding:'0 16px',borderRadius:8,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.1)',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer'}}>+ {T('قاعدة جديدة','New Rule')}</button>
</div>

{/* Tabs */}
<div style={{display:'flex',gap:4,marginBottom:16}}>
{[{v:'rules',l:T('القواعد','Rules'),n:rules.length},{v:'log',l:T('سجل الإرسال','Send Log'),n:logs.length}].map(t=>
<div key={t.v} onClick={()=>setTab(t.v)} style={{padding:'8px 16px',borderRadius:8,fontSize:11,fontWeight:tab===t.v?700:500,color:tab===t.v?C.gold:'rgba(255,255,255,.4)',background:tab===t.v?'rgba(201,168,76,.08)':'transparent',border:tab===t.v?'1.5px solid rgba(201,168,76,.15)':'1px solid rgba(255,255,255,.06)',cursor:'pointer'}}>{t.l} <span style={{fontSize:9,opacity:.6}}>({t.n})</span></div>)}
</div>

{tab==='rules'&&<div style={{display:'flex',flexDirection:'column',gap:10}}>
{rules.map(r=><div key={r.id} style={{padding:'14px 18px',borderRadius:12,background:'var(--bg)',border:'1px solid var(--bd)',display:'flex',alignItems:'center',gap:14,opacity:r.is_active?1:.5}}>
<div style={{width:8,height:8,borderRadius:'50%',background:r.is_active?C.ok:C.red,flexShrink:0}}/>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>{r.name_ar}</div>
<div style={{fontSize:11,color:'var(--tx4)',display:'flex',gap:8,flexWrap:'wrap',marginTop:4}}>
<span style={{background:'rgba(201,168,76,.08)',padding:'1px 8px',borderRadius:4,color:C.gold}}>{entityLabels[r.entity_type]||r.entity_type}</span>
<span>{r.field_name}</span>
<span>📅 {(r.days_before||[]).join(', ')} {T('يوم','days')}</span>
<span>{channelLabels[r.channel]||r.channel}</span>
{r.create_task&&<span style={{color:C.blue}}>+ {T('مهمة','Task')}</span>}
</div></div>
<button onClick={()=>toggleRule(r.id,r.is_active)} style={{height:30,padding:'0 12px',borderRadius:6,border:'1px solid rgba(255,255,255,.1)',background:'transparent',color:r.is_active?C.red:C.ok,fontFamily:F,fontSize:10,fontWeight:600,cursor:'pointer'}}>{r.is_active?T('تعطيل','Disable'):T('تفعيل','Enable')}</button>
<button onClick={()=>{setForm({...r,days_before_str:(r.days_before||[]).join(',')});setEditPop(r.id)}} style={{height:30,padding:'0 12px',borderRadius:6,border:'1px solid rgba(255,255,255,.1)',background:'transparent',color:'var(--tx4)',fontFamily:F,fontSize:10,fontWeight:600,cursor:'pointer'}}>{T('تعديل','Edit')}</button>
</div>)}
</div>}

{tab==='log'&&<div>
<div style={{display:'flex',gap:4,marginBottom:12}}>
{['all','pending','sent','failed'].map(f=><div key={f} onClick={()=>setLogFilter(f)} style={{padding:'4px 10px',borderRadius:6,fontSize:10,fontWeight:logFilter===f?700:500,color:logFilter===f?(statusColors[f]||'var(--tx)'):'var(--tx4)',background:logFilter===f?'rgba(255,255,255,.06)':'transparent',cursor:'pointer',border:'1px solid '+(logFilter===f?'rgba(255,255,255,.1)':'transparent')}}>{f==='all'?T('الكل','All'):f}</div>)}
</div>
<div style={{background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:12,overflow:'hidden'}}>
<table style={{width:'100%',borderCollapse:'collapse'}}>
<thead><tr>{[T('التاريخ','Date'),T('النوع','Type'),T('الاسم','Name'),T('الأيام','Days'),T('القناة','Channel'),T('الحالة','Status')].map(h=><th key={h} style={{padding:'10px 12px',fontSize:11,fontWeight:700,color:'var(--tx3)',textAlign:'right',borderBottom:'1px solid var(--bd)'}}>{h}</th>)}</tr></thead>
<tbody>{(logFilter==='all'?logs:logs.filter(l=>l.status===logFilter)).slice(0,50).map(l=><tr key={l.id} style={{borderBottom:'1px solid var(--bd2)'}}>
<td style={{padding:'8px 12px',fontSize:11,color:'var(--tx4)'}}>{l.alert_date}</td>
<td style={{padding:'8px 12px',fontSize:11}}>{entityLabels[l.entity_type]||l.entity_type}</td>
<td style={{padding:'8px 12px',fontSize:12,fontWeight:600,color:'var(--tx2)'}}>{l.entity_name||'—'}</td>
<td style={{padding:'8px 12px',fontSize:11,color:l.days_remaining<=7?C.red:C.gold,fontWeight:700}}>{l.days_remaining} {T('يوم','d')}</td>
<td style={{padding:'8px 12px',fontSize:11}}>{channelLabels[l.channel]||l.channel}</td>
<td style={{padding:'8px 12px'}}><span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:5,color:statusColors[l.status]||'#999',background:(statusColors[l.status]||'#999')+'15'}}>{l.status}</span></td>
</tr>)}</tbody>
</table></div>
</div>}

{editPop&&<div onClick={()=>setEditPop(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.8)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(520px,96vw)',maxHeight:'85vh',display:'flex',flexDirection:'column',overflow:'hidden',border:'1px solid var(--bd)'}}>
<div style={{height:3,background:`linear-gradient(90deg,transparent,${C.gold} 30%,${C.gold} 70%,transparent)`}}/>
<div style={{padding:'16px 22px',borderBottom:'1px solid var(--bd)',fontSize:15,fontWeight:700,color:'var(--tx)'}}>{editPop==='new'?T('قاعدة تنبيه جديدة','New Alert Rule'):T('تعديل القاعدة','Edit Rule')}</div>
<div style={{padding:'18px 22px',overflowY:'auto',display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<div style={{gridColumn:'1/-1'}}><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('اسم القاعدة','Rule Name')}</div><input value={form.name_ar||''} onChange={e=>setForm(p=>({...p,name_ar:e.target.value}))} style={fS}/></div>
<div><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('نوع الكيان','Entity')}</div><select value={form.entity_type||''} onChange={e=>setForm(p=>({...p,entity_type:e.target.value}))} style={fS}>{Object.entries(entityLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
<div><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('اسم الحقل','Field')}</div><input value={form.field_name||''} onChange={e=>setForm(p=>({...p,field_name:e.target.value}))} style={fS} placeholder="iqama_expiry_date"/></div>
<div><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('أيام التنبيه','Days Before')} (30,15,7)</div><input value={form.days_before_str||''} onChange={e=>setForm(p=>({...p,days_before_str:e.target.value}))} style={{...fS,direction:'ltr'}} placeholder="30,15,7"/></div>
<div><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('القناة','Channel')}</div><select value={form.channel||''} onChange={e=>setForm(p=>({...p,channel:e.target.value}))} style={fS}>{Object.entries(channelLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
<div><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('إرسال إلى','Send To')}</div><select value={form.send_to||''} onChange={e=>setForm(p=>({...p,send_to:e.target.value}))} style={fS}><option value="client">{T('العميل','Client')}</option><option value="employee">{T('الموظف','Employee')}</option><option value="manager">{T('المدير','Manager')}</option></select></div>
<div style={{gridColumn:'1/-1',display:'flex',gap:16,alignItems:'center'}}>
<label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:12,color:'var(--tx3)'}} onClick={()=>setForm(p=>({...p,create_task:!p.create_task}))}>
<div style={{width:18,height:18,borderRadius:5,border:form.create_task?'none':'1.5px solid rgba(255,255,255,.3)',background:form.create_task?C.blue:'transparent',display:'flex',alignItems:'center',justifyContent:'center'}}>{form.create_task&&<span style={{color:'#fff',fontSize:11}}>✓</span>}</div>
{T('إنشاء مهمة تلقائياً','Auto-create task')}</label>
</div>
{form.create_task&&<div style={{gridColumn:'1/-1'}}><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('عنوان المهمة','Task Title')}</div><input value={form.task_title_template||''} onChange={e=>setForm(p=>({...p,task_title_template:e.target.value}))} style={fS} placeholder="تجديد إقامة {name}"/></div>}
</div>
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',flexDirection:'row-reverse'}}>
<button onClick={saveRule} disabled={saving} style={{height:40,padding:'0 24px',borderRadius:8,border:'1px solid rgba(201,168,76,.3)',background:'rgba(201,168,76,.12)',color:C.gold,fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer',opacity:saving?.6:1}}>{saving?'...':T('حفظ','Save')}</button>
<button onClick={()=>setEditPop(null)} style={{height:40,padding:'0 16px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:12,cursor:'pointer'}}>{T('إلغاء','Cancel')}</button>
</div></div></div>}
</div>}
