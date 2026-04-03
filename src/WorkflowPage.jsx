import React, { useState, useEffect, useCallback, useMemo } from 'react'
const F="'Cairo','Tajawal',sans-serif"
const C={gold:'#c9a84c',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}

export default function WorkflowPage({sb,toast,user,lang}){
const T=(a,e)=>lang==='ar'?a:e
const[rules,setRules]=useState([]);const[logs,setLogs]=useState([]);const[loading,setLoading]=useState(true)
const[tab,setTab]=useState('rules');const[editPop,setEditPop]=useState(null);const[form,setForm]=useState({});const[saving,setSaving]=useState(false)

const load=useCallback(async()=>{setLoading(true)
const[r,l]=await Promise.all([sb.from('workflow_rules').select('*').order('sort_order'),sb.from('workflow_execution_log').select('*').order('executed_at',{ascending:false}).limit(100)])
setRules(r.data||[]);setLogs(l.data||[]);setLoading(false)},[sb])
useEffect(()=>{load()},[load])

const toggleRule=async(id,active)=>{await sb.from('workflow_rules').update({is_active:!active}).eq('id',id);toast(T(active?'تم التعطيل':'تم التفعيل','Toggled'));load()}
const deleteRule=async(id)=>{if(!confirm(T('حذف القاعدة؟','Delete rule?')))return;await sb.from('workflow_rules').delete().eq('id',id);toast(T('تم الحذف','Deleted'));load()}

const saveRule=async()=>{setSaving(true);try{
  const cfg=form.action_config_str?JSON.parse(form.action_config_str):form.action_config||{}
  const row={name_ar:form.name_ar,trigger_entity:form.trigger_entity,trigger_event:form.trigger_event,trigger_to_status:form.trigger_to_status||null,trigger_type_code:form.trigger_type_code||null,action_type:form.action_type,action_config:cfg,is_active:true,sort_order:form.sort_order||0}
  if(editPop==='new'){await sb.from('workflow_rules').insert({...row,created_by:user?.id})}
  else{await sb.from('workflow_rules').update({...row,updated_at:new Date().toISOString()}).eq('id',editPop)}
  toast(T('تم الحفظ','Saved'));setEditPop(null);load()
}catch(e){toast(T('خطأ في البيانات','Invalid data'))}setSaving(false)}

const actionLabels={create_task:T('إنشاء مهمة','Create Task'),send_notification:T('إرسال إشعار','Send Notification'),send_whatsapp:T('إرسال واتساب','Send WhatsApp'),create_alert:T('إنشاء تنبيه','Create Alert'),escalate:T('تصعيد','Escalate')}
const eventLabels={status_change:T('تغيّر الحالة','Status Change'),created:T('إنشاء جديد','Created'),completed:T('اكتمال','Completed'),overdue:T('تأخر','Overdue')}
const entityLabels={transaction:T('معاملة','Transaction'),invoice:T('فاتورة','Invoice'),worker:T('عامل','Worker'),facility:T('منشأة','Facility'),client:T('عميل','Client')}
const statusColors={success:C.ok,failed:C.red,skipped:'#888'}
const statusLabels={success:T('ناجح','Success'),failed:T('فشل','Failed'),skipped:T('تخطي','Skipped')}
const actionColors={create_task:C.blue,send_notification:C.gold,send_whatsapp:C.ok,escalate:'#e67e22',create_alert:C.red}

// ═══ COMPUTED: Stats per rule ═══
const ruleStats=useMemo(()=>{
  const map={};logs.forEach(l=>{
    if(!map[l.rule_id])map[l.rule_id]={total:0,success:0,failed:0,last:null}
    map[l.rule_id].total++
    if(l.status==='success')map[l.rule_id].success++
    if(l.status==='failed')map[l.rule_id].failed++
    if(!map[l.rule_id].last||new Date(l.executed_at)>new Date(map[l.rule_id].last))map[l.rule_id].last=l.executed_at
  })
  return map
},[logs])

const totalExec=logs.length;const totalSuccess=logs.filter(l=>l.status==='success').length;const totalFailed=logs.filter(l=>l.status==='failed').length
const activeRules=rules.filter(r=>r.is_active).length

const fS={width:'100%',height:40,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:F,fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',background:'rgba(255,255,255,.06)',textAlign:'right'}

if(loading)return<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>
return<div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
<div><div style={{fontSize:22,fontWeight:800,color:'var(--tx)'}}>{T('أتمتة سير العمل','Workflow Automation')}</div>
<div style={{fontSize:12,color:'var(--tx4)',marginTop:4}}>{T('قواعد تلقائية لإنشاء مهام وإشعارات عند تغيّر الحالات','Auto-create tasks & notifications on status changes')}</div></div>
<button onClick={()=>{setForm({name_ar:'',trigger_entity:'transaction',trigger_event:'status_change',trigger_to_status:'',trigger_type_code:'',action_type:'create_task',action_config_str:'{"title": "مهمة جديدة", "category": "general", "priority": "normal", "due_days": 3}',sort_order:rules.length+1});setEditPop('new')}}
style={{height:36,padding:'0 16px',borderRadius:8,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.1)',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer'}}>+ {T('قاعدة جديدة','New Rule')}</button></div>

{/* ═══ STATS CARDS ═══ */}
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:18}}>
{[[T('القواعد النشطة','Active Rules'),activeRules+'/'+rules.length,C.gold],
[T('إجمالي التنفيذات','Total Executions'),totalExec,C.blue],
[T('ناجحة','Successful'),totalSuccess,C.ok],
[T('فاشلة','Failed'),totalFailed,C.red]
].map(([l,v,c],i)=><div key={i} style={{padding:14,borderRadius:12,background:c+'08',border:'1px solid '+c+'15'}}>
<div style={{fontSize:9,color:c,opacity:.7,marginBottom:4}}>{l}</div>
<div style={{fontSize:22,fontWeight:800,color:c}}>{v}</div>
{i===2&&totalExec>0&&<div style={{fontSize:9,color:c,opacity:.5,marginTop:2}}>{Math.round(totalSuccess/totalExec*100)}%</div>}
</div>)}
</div>

<div style={{display:'flex',gap:4,marginBottom:16}}>
{[{v:'rules',l:T('القواعد','Rules')+' ('+rules.length+')'},{v:'log',l:T('سجل التنفيذ','Log')+' ('+logs.length+')'}].map(t=>
<div key={t.v} onClick={()=>setTab(t.v)} style={{padding:'8px 16px',borderRadius:8,fontSize:11,fontWeight:tab===t.v?700:500,color:tab===t.v?C.gold:'rgba(255,255,255,.4)',background:tab===t.v?'rgba(201,168,76,.08)':'transparent',border:tab===t.v?'1.5px solid rgba(201,168,76,.15)':'1px solid rgba(255,255,255,.06)',cursor:'pointer'}}>{t.l}</div>)}</div>

{/* ═══ RULES WITH STATS ═══ */}
{tab==='rules'&&<div style={{display:'flex',flexDirection:'column',gap:10}}>
{rules.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)'}}>{T('لا توجد قواعد','No rules')}</div>:
rules.map((r,i)=>{const ac=actionColors[r.action_type]||'#999';const rs=ruleStats[r.id]||{total:0,success:0,failed:0,last:null};const successRate=rs.total>0?Math.round(rs.success/rs.total*100):0
return<div key={r.id} style={{padding:'16px 18px',borderRadius:12,background:'var(--bg)',border:'1px solid var(--bd)',opacity:r.is_active?1:.5}}>
<div style={{display:'flex',alignItems:'flex-start',gap:12}}>
<div style={{width:32,height:32,borderRadius:10,background:ac+'15',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:ac,flexShrink:0}}>{i+1}</div>
<div style={{flex:1}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
<span style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>{r.name_ar}</span>
{!r.is_active&&<span style={{fontSize:8,padding:'2px 6px',borderRadius:4,background:'rgba(255,255,255,.06)',color:'var(--tx5)'}}>{T('معطّل','Disabled')}</span>}
</div>
<div style={{fontSize:11,color:'var(--tx4)',display:'flex',gap:6,flexWrap:'wrap',marginBottom:6}}>
<span style={{background:'rgba(255,255,255,.06)',padding:'2px 8px',borderRadius:4}}>{T('عندما','When')}: {entityLabels[r.trigger_entity]||r.trigger_entity} → {eventLabels[r.trigger_event]||r.trigger_event}</span>
{r.trigger_to_status&&<span style={{background:'rgba(52,131,180,.08)',padding:'2px 8px',borderRadius:4,color:C.blue}}>→ {r.trigger_to_status}</span>}
<span style={{background:ac+'12',padding:'2px 8px',borderRadius:4,color:ac}}>{T('نفّذ','Do')}: {actionLabels[r.action_type]||r.action_type}</span>
</div>
{/* Execution stats */}
<div style={{display:'flex',gap:12,alignItems:'center'}}>
<span style={{fontSize:9,color:'var(--tx5)'}}>{T('تنفيذ:','Runs:')} <strong style={{color:'var(--tx3)'}}>{rs.total}</strong></span>
{rs.total>0&&<><span style={{fontSize:9,color:C.ok}}>✓ {rs.success}</span>
{rs.failed>0&&<span style={{fontSize:9,color:C.red}}>✗ {rs.failed}</span>}
<span style={{fontSize:9,color:successRate>=80?C.ok:successRate>=50?'#e67e22':C.red}}>{successRate}% {T('نجاح','success')}</span></>}
{rs.last&&<span style={{fontSize:9,color:'var(--tx5)'}}>{T('آخر:','Last:')} {new Date(rs.last).toLocaleDateString(lang==='ar'?'ar':'en',{month:'short',day:'numeric'})}</span>}
</div>
</div>
<div style={{display:'flex',gap:4,flexShrink:0}}>
<button onClick={()=>toggleRule(r.id,r.is_active)} style={{height:28,padding:'0 10px',borderRadius:6,border:'1px solid rgba(255,255,255,.1)',background:r.is_active?'rgba(192,57,43,.06)':'rgba(39,160,70,.06)',color:r.is_active?C.red:C.ok,fontFamily:F,fontSize:9,fontWeight:600,cursor:'pointer'}}>{r.is_active?T('تعطيل','Off'):T('تفعيل','On')}</button>
<button onClick={()=>{setForm({...r,action_config_str:JSON.stringify(r.action_config||{},null,2)});setEditPop(r.id)}} style={{height:28,padding:'0 10px',borderRadius:6,border:'1px solid rgba(255,255,255,.1)',background:'transparent',color:'var(--tx4)',fontFamily:F,fontSize:9,fontWeight:600,cursor:'pointer'}}>✎ {T('تعديل','Edit')}</button>
<button onClick={()=>deleteRule(r.id)} style={{height:28,padding:'0 10px',borderRadius:6,border:'1px solid rgba(192,57,43,.1)',background:'rgba(192,57,43,.04)',color:C.red,fontFamily:F,fontSize:9,fontWeight:600,cursor:'pointer'}}>🗑</button>
</div></div></div>})}
</div>}

{/* ═══ EXECUTION LOG — ENHANCED ═══ */}
{tab==='log'&&<div style={{background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:12,overflow:'hidden'}}>
<table style={{width:'100%',borderCollapse:'collapse'}}>
<thead><tr>{[T('الوقت','Time'),T('القاعدة','Rule'),T('الكيان','Entity'),T('الإجراء','Action'),T('الحالة','Status')].map(h=><th key={h} style={{padding:'10px 12px',fontSize:10,fontWeight:700,color:'var(--tx5)',textAlign:'right',borderBottom:'1px solid var(--bd)'}}>{h}</th>)}</tr></thead>
<tbody>{logs.length===0?<tr><td colSpan={5} style={{padding:40,textAlign:'center',color:'var(--tx6)'}}>{T('لا توجد سجلات','No logs')}</td></tr>:logs.map(l=>{const sc=statusColors[l.status]||'#999'
return<tr key={l.id} style={{borderBottom:'1px solid var(--bd2)',background:l.status==='failed'?'rgba(192,57,43,.03)':'transparent'}}>
<td style={{padding:'8px 12px',fontSize:10,color:'var(--tx4)'}}>{new Date(l.executed_at).toLocaleString(lang==='ar'?'ar':'en',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</td>
<td style={{padding:'8px 12px',fontSize:11,color:'var(--tx2)'}}>{rules.find(r=>r.id===l.rule_id)?.name_ar||'—'}</td>
<td style={{padding:'8px 12px',fontSize:10,color:'var(--tx4)'}}>{entityLabels[l.trigger_entity]||l.trigger_entity}</td>
<td style={{padding:'8px 12px',fontSize:10,color:actionColors[l.action_type]||'var(--tx4)'}}>{actionLabels[l.action_type]||l.action_type}</td>
<td style={{padding:'8px 12px'}}><span style={{fontSize:9,fontWeight:600,padding:'2px 8px',borderRadius:5,color:sc,background:sc+'15'}}>{statusLabels[l.status]||l.status}</span>{l.error_message&&<div style={{fontSize:9,color:C.red,marginTop:2}}>{l.error_message.slice(0,80)}</div>}</td>
</tr>})}</tbody></table></div>}

{editPop&&<div onClick={()=>setEditPop(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.8)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(560px,96vw)',maxHeight:'88vh',display:'flex',flexDirection:'column',overflow:'hidden',border:'1px solid var(--bd)'}}>
<div style={{height:3,background:`linear-gradient(90deg,transparent,${C.gold},transparent)`}}/>
<div style={{padding:'16px 22px',borderBottom:'1px solid var(--bd)',fontSize:15,fontWeight:700,color:'var(--tx)'}}>{editPop==='new'?T('قاعدة جديدة','New Rule'):T('تعديل القاعدة','Edit Rule')}</div>
<div style={{padding:'18px 22px',overflowY:'auto',display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<div style={{gridColumn:'1/-1'}}><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('اسم القاعدة','Name')}</div><input value={form.name_ar||''} onChange={e=>setForm(p=>({...p,name_ar:e.target.value}))} style={fS}/></div>
<div><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('الكيان','Entity')}</div><select value={form.trigger_entity||''} onChange={e=>setForm(p=>({...p,trigger_entity:e.target.value}))} style={fS}>{Object.entries(entityLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
<div><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('الحدث','Event')}</div><select value={form.trigger_event||''} onChange={e=>setForm(p=>({...p,trigger_event:e.target.value}))} style={fS}>{Object.entries(eventLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
<div><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('الحالة الجديدة','To Status')}</div><input value={form.trigger_to_status||''} onChange={e=>setForm(p=>({...p,trigger_to_status:e.target.value}))} style={fS} placeholder={T('اختياري','Optional')}/></div>
<div><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('الإجراء','Action')}</div><select value={form.action_type||''} onChange={e=>setForm(p=>({...p,action_type:e.target.value}))} style={fS}>{Object.entries(actionLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
<div style={{gridColumn:'1/-1'}}><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('إعدادات الإجراء (JSON)','Action Config')}</div><textarea value={form.action_config_str||''} onChange={e=>setForm(p=>({...p,action_config_str:e.target.value}))} rows={4} style={{...fS,height:'auto',padding:12,resize:'vertical',direction:'ltr',textAlign:'left',fontSize:11,fontFamily:'monospace'}}/></div>
</div>
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',flexDirection:'row-reverse'}}>
<button onClick={saveRule} disabled={saving} style={{height:40,padding:'0 24px',borderRadius:8,border:'1px solid rgba(201,168,76,.3)',background:'rgba(201,168,76,.12)',color:C.gold,fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer',opacity:saving?.6:1}}>{saving?'...':T('حفظ','Save')}</button>
<button onClick={()=>setEditPop(null)} style={{height:40,padding:'0 16px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:12,cursor:'pointer'}}>{T('إلغاء','Cancel')}</button>
</div></div></div>}
</div>}
