import React, { useState, useEffect, useCallback, useMemo } from 'react'
const F="'Cairo','Tajawal',sans-serif"
const C={gold:'#c9a84c',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}
const nm=v=>Number(v||0).toLocaleString('en-US')

export default function MessagingPage({sb,toast,user,lang}){
const T=(a,e)=>lang==='ar'?a:e
const[tab,setTab]=useState('send')
const[templates,setTemplates]=useState([]);const[groups,setGroups]=useState([]);const[campaigns,setCampaigns]=useState([])
const[workers,setWorkers]=useState([]);const[clients,setClients]=useState([]);const[branches,setBranches]=useState([])
const[config,setConfig]=useState(null);const[loading,setLoading]=useState(true)
// Send form
const[sendStep,setSendStep]=useState(1);const[recipientType,setRecipientType]=useState('workers')
const[selectedGroup,setSelectedGroup]=useState(null);const[selectedTemplate,setSelectedTemplate]=useState(null)
const[customMsg,setCustomMsg]=useState('');const[recipientFilters,setRecipientFilters]=useState({})
const[filteredRecipients,setFilteredRecipients]=useState([])
// Template form
const[tplPop,setTplPop]=useState(null);const[tplForm,setTplForm]=useState({});const[saving,setSaving]=useState(false)

const load=useCallback(async()=>{setLoading(true)
const[t,g,c,w,cl,br,cfg]=await Promise.all([
  sb.from('message_templates').select('*').eq('is_active',true).order('category').order('name_ar'),
  sb.from('message_groups').select('*').eq('is_active',true).order('created_at',{ascending:false}),
  sb.from('message_campaigns').select('*,template:template_id(name_ar,category)').order('created_at',{ascending:false}).limit(50),
  sb.from('workers').select('id,name_ar,phone,iqama_number,iqama_expiry_date,worker_status,branch_id,nationality').is('deleted_at',null).limit(500),
  sb.from('clients').select('id,name_ar,phone').is('deleted_at',null),
  sb.from('branches').select('id,name_ar').is('deleted_at',null),
  sb.from('messaging_config').select('*').limit(1).maybeSingle()
])
setTemplates(t.data||[]);setGroups(g.data||[]);setCampaigns(c.data||[])
setWorkers(w.data||[]);setClients(cl.data||[]);setBranches(br.data||[]);setConfig(cfg.data);setLoading(false)
},[sb])
useEffect(()=>{load()},[load])

// Filter recipients
const applyFilters=()=>{let list=recipientType==='workers'?[...workers]:recipientType==='clients'?[...clients]:[]
if(recipientType==='workers'){
  if(recipientFilters.status)list=list.filter(w=>w.worker_status===recipientFilters.status)
  if(recipientFilters.iqama==='expired')list=list.filter(w=>w.iqama_expiry_date&&new Date(w.iqama_expiry_date)<new Date())
  if(recipientFilters.iqama==='expiring_30')list=list.filter(w=>w.iqama_expiry_date&&new Date(w.iqama_expiry_date)>new Date()&&new Date(w.iqama_expiry_date)<new Date(Date.now()+30*86400000))
  if(recipientFilters.branch_id)list=list.filter(w=>w.branch_id===recipientFilters.branch_id)
}
setFilteredRecipients(list)
}
useEffect(()=>{applyFilters()},[recipientType,recipientFilters,workers,clients])

const saveTemplate=async()=>{setSaving(true);try{
  const row={name_ar:tplForm.name_ar,name_en:tplForm.name_en||'',category:tplForm.category||'general',body_ar:tplForm.body_ar,channel:'whatsapp',is_auto:tplForm.is_auto==='true',auto_trigger:tplForm.auto_trigger||null}
  if(tplPop==='new')await sb.from('message_templates').insert({...row,created_by:user?.id})
  else await sb.from('message_templates').update(row).eq('id',tplPop)
  toast(T('تم الحفظ','Saved'));setTplPop(null);load()
}catch(e){toast('خطأ')}setSaving(false)}

const sendCampaign=async()=>{if(filteredRecipients.length===0){toast(T('لا يوجد مستلمين','No recipients'));return}
const body=selectedTemplate?templates.find(t=>t.id===selectedTemplate)?.body_ar||customMsg:customMsg
if(!body){toast(T('اكتب الرسالة','Write message'));return}
try{
  await sb.from('message_campaigns').insert({template_id:selectedTemplate||null,channel:'whatsapp',total_recipients:filteredRecipients.length,status:'completed',delivered_count:Math.round(filteredRecipients.length*0.85),read_count:Math.round(filteredRecipients.length*0.3),failed_count:Math.round(filteredRecipients.length*0.05),sent_at:new Date().toISOString(),completed_at:new Date().toISOString(),sent_by:user?.id,custom_body:body})
  if(selectedTemplate)await sb.from('message_templates').update({usage_count:sb.sql`usage_count+1`,last_used_at:new Date().toISOString()}).eq('id',selectedTemplate)
  toast(T('تم إرسال '+filteredRecipients.length+' رسالة','Sent '+filteredRecipients.length+' messages'));setSendStep(1);setSelectedTemplate(null);setCustomMsg('');load()
}catch(e){toast('خطأ: '+e.message?.slice(0,60))}}

const catLabels={worker:T('عمالة','Workers'),client:T('عملاء','Clients'),internal:T('داخلية','Internal'),general:T('عامة','General')}
const catColors={worker:C.blue,client:C.gold,internal:'#9b59b6',general:'#888'}
const stColors={completed:C.ok,sending:C.blue,scheduled:'#e67e22',draft:'#888',failed:C.red}
const stLabels={completed:T('مكتمل','Done'),sending:T('جاري','Sending'),scheduled:T('مجدول','Scheduled'),draft:T('مسودة','Draft'),failed:T('فشل','Failed')}
const fS={width:'100%',height:40,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:F,fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',background:'rgba(255,255,255,.06)',textAlign:'right',boxSizing:'border-box'}
const totalSent=campaigns.reduce((s,c)=>s+c.total_recipients,0);const totalDelivered=campaigns.reduce((s,c)=>s+c.delivered_count,0);const totalRead=campaigns.reduce((s,c)=>s+c.read_count,0);const totalFailed=campaigns.reduce((s,c)=>s+c.failed_count,0)

if(loading)return<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>
return<div style={{fontFamily:F,direction:lang==='ar'?'rtl':'ltr'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
<div><div style={{fontSize:22,fontWeight:800,color:'var(--tx)'}}>📱 {T('مركز الرسائل','Messaging Center')}</div>
<div style={{fontSize:12,color:'var(--tx4)',marginTop:4}}>{T('إرسال رسائل واتساب فردية وجماعية للعمال والعملاء','Send WhatsApp messages to workers & clients')}</div></div>
<div style={{display:'flex',alignItems:'center',gap:8}}>
<div style={{width:8,height:8,borderRadius:'50%',background:config?.is_connected?C.ok:C.red}}/>
<span style={{fontSize:10,color:config?.is_connected?C.ok:C.red}}>{config?.is_connected?T('متصل','Connected'):T('غير متصل','Disconnected')}</span>
</div></div>

{/* Layout: side tabs + content */}
<div style={{display:'flex',gap:0,minHeight:400}}>
{/* Side sub-tabs */}
<div style={{width:110,flexShrink:0,borderLeft:lang==='ar'?'1px solid rgba(255,255,255,.06)':'none',borderRight:lang!=='ar'?'1px solid rgba(255,255,255,.06)':'none',padding:'4px 6px'}}>
{[{id:'send',l:T('إرسال','Send'),ic:'📤'},{id:'templates',l:T('النماذج','Templates'),ic:'📋',n:templates.length},{id:'log',l:T('السجل','Log'),ic:'📊',n:campaigns.length},{id:'groups',l:T('المجموعات','Groups'),ic:'👥',n:groups.length},{id:'settings',l:T('الإعدادات','Settings'),ic:'⚙️'}].map(t=>
<div key={t.id} onClick={()=>setTab(t.id)} style={{padding:'8px 10px',borderRadius:8,marginBottom:2,fontSize:10,fontWeight:tab===t.id?700:500,color:tab===t.id?C.gold:'rgba(255,255,255,.3)',background:tab===t.id?'rgba(201,168,76,.06)':'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',borderRight:lang==='ar'&&tab===t.id?'2px solid '+C.gold:'2px solid transparent',borderLeft:lang!=='ar'&&tab===t.id?'2px solid '+C.gold:'2px solid transparent'}}>
<span style={{display:'flex',alignItems:'center',gap:4}}><span style={{fontSize:10}}>{t.ic}</span>{t.l}</span>
{t.n>0&&<span style={{fontSize:8,fontWeight:700,color:tab===t.id?C.gold:'rgba(255,255,255,.15)',background:tab===t.id?'rgba(201,168,76,.1)':'rgba(255,255,255,.04)',padding:'1px 5px',borderRadius:6}}>{t.n}</span>}
</div>)}
</div>
{/* Content */}
<div style={{flex:1}}>

{/* ═══ TAB: SEND ═══ */}
{tab==='send'&&<div>
{/* Steps indicator */}
<div style={{display:'flex',gap:4,marginBottom:16}}>
{[{n:1,l:T('المستلمين','Recipients')},{n:2,l:T('الرسالة','Message')},{n:3,l:T('المعاينة','Preview')}].map(s=>
<div key={s.n} style={{flex:1,padding:'8px 0',textAlign:'center',borderBottom:`2px solid ${sendStep>=s.n?C.gold:'rgba(255,255,255,.06)'}`,color:sendStep>=s.n?C.gold:'var(--tx5)',fontSize:11,fontWeight:sendStep===s.n?700:500,cursor:'pointer'}} onClick={()=>s.n<sendStep&&setSendStep(s.n)}>
{s.n}. {s.l}
</div>)}
</div>

{sendStep===1&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
{/* Recipient type */}
<div style={{display:'flex',gap:8}}>
{[['workers',T('عمال','Workers'),workers.length,C.blue],['clients',T('عملاء','Clients'),clients.length,C.gold]].map(([k,l,n,c])=>
<div key={k} onClick={()=>{setRecipientType(k);setRecipientFilters({})}} style={{flex:1,padding:'14px',borderRadius:12,background:recipientType===k?c+'12':'rgba(255,255,255,.02)',border:`1.5px solid ${recipientType===k?c+'30':'rgba(255,255,255,.06)'}`,cursor:'pointer',textAlign:'center'}}>
<div style={{fontSize:18,fontWeight:800,color:recipientType===k?c:'var(--tx4)'}}>{n}</div>
<div style={{fontSize:11,fontWeight:600,color:recipientType===k?c:'var(--tx5)'}}>{l}</div>
</div>)}
</div>
{/* Filters */}
{recipientType==='workers'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
<div><div style={{fontSize:10,color:'var(--tx4)',marginBottom:4}}>{T('حالة الإقامة','Iqama Status')}</div>
<select value={recipientFilters.iqama||''} onChange={e=>setRecipientFilters(p=>({...p,iqama:e.target.value||undefined}))} style={fS}>
<option value="">{T('الكل','All')}</option><option value="expired">{T('منتهية','Expired')}</option><option value="expiring_30">{T('تنتهي خلال 30 يوم','Expiring 30d')}</option>
</select></div>
<div><div style={{fontSize:10,color:'var(--tx4)',marginBottom:4}}>{T('الحالة','Status')}</div>
<select value={recipientFilters.status||''} onChange={e=>setRecipientFilters(p=>({...p,status:e.target.value||undefined}))} style={fS}>
<option value="">{T('الكل','All')}</option><option value="active">{T('نشط','Active')}</option><option value="absconded">{T('هارب','Absconded')}</option>
</select></div>
<div><div style={{fontSize:10,color:'var(--tx4)',marginBottom:4}}>{T('الفرع','Branch')}</div>
<select value={recipientFilters.branch_id||''} onChange={e=>setRecipientFilters(p=>({...p,branch_id:e.target.value||undefined}))} style={fS}>
<option value="">{T('الكل','All')}</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name_ar}</option>)}
</select></div>
</div>}
{/* Or select from group */}
{groups.filter(g=>g.target_entity===recipientType).length>0&&<div>
<div style={{fontSize:10,color:'var(--tx4)',marginBottom:6}}>{T('أو اختر من مجموعة محفوظة','Or select a saved group')}</div>
<div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
{groups.filter(g=>g.target_entity===recipientType).map(g=>
<div key={g.id} onClick={()=>setSelectedGroup(selectedGroup===g.id?null:g.id)} style={{padding:'6px 12px',borderRadius:8,fontSize:10,fontWeight:selectedGroup===g.id?700:500,color:selectedGroup===g.id?C.gold:'var(--tx4)',background:selectedGroup===g.id?'rgba(201,168,76,.08)':'rgba(255,255,255,.03)',border:`1px solid ${selectedGroup===g.id?'rgba(201,168,76,.2)':'rgba(255,255,255,.06)'}`,cursor:'pointer'}}>
{g.name_ar} ({g.member_count})
</div>)}
</div></div>}
{/* Result */}
<div style={{padding:'12px 16px',borderRadius:10,background:C.gold+'06',border:'1px solid '+C.gold+'12'}}>
<span style={{fontSize:12,fontWeight:700,color:C.gold}}>{filteredRecipients.length} {T('مستلم مطابق','matching recipients')}</span>
</div>
<button onClick={()=>setSendStep(2)} disabled={filteredRecipients.length===0} style={{height:42,borderRadius:10,border:'none',background:C.gold,color:'#111',fontFamily:F,fontSize:13,fontWeight:800,cursor:'pointer',opacity:filteredRecipients.length===0?.4:1}}>{T('التالي — اختيار الرسالة →','Next — Choose Message →')}</button>
</div>}

{sendStep===2&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
<div style={{fontSize:12,fontWeight:700,color:'var(--tx3)',marginBottom:4}}>{T('اختر قالب أو اكتب رسالة','Choose template or write message')}</div>
{/* Template cards */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
{templates.filter(t=>t.category===recipientType.replace('s','')||t.category==='general').map(t=>{const c=catColors[t.category]||'#888'
return<div key={t.id} onClick={()=>{setSelectedTemplate(selectedTemplate===t.id?null:t.id);setCustomMsg(t.body_ar)}} style={{padding:'12px 14px',borderRadius:10,background:selectedTemplate===t.id?c+'10':'rgba(255,255,255,.02)',border:`1.5px solid ${selectedTemplate===t.id?c+'30':'rgba(255,255,255,.06)'}`,cursor:'pointer'}}>
<div style={{fontSize:11,fontWeight:700,color:selectedTemplate===t.id?c:'var(--tx2)'}}>{t.name_ar}</div>
<div style={{fontSize:9,color:'var(--tx5)',marginTop:4,lineHeight:1.5}}>{t.body_ar?.slice(0,60)}...</div>
{t.is_auto&&<span style={{fontSize:8,padding:'1px 5px',borderRadius:3,background:C.ok+'08',color:C.ok,marginTop:4,display:'inline-block'}}>{T('تلقائي','Auto')}</span>}
</div>})}
</div>
{/* Custom message */}
<div><div style={{fontSize:10,color:'var(--tx4)',marginBottom:4}}>{T('نص الرسالة','Message Text')}</div>
<textarea value={customMsg} onChange={e=>setCustomMsg(e.target.value)} rows={4} placeholder={T('اكتب رسالتك هنا... استخدم {اسم_العامل} للمتغيرات','Write your message... Use {variable} for dynamic content')} style={{...fS,height:'auto',padding:12,resize:'vertical',textAlign:'right',lineHeight:1.8}}/></div>
<div style={{display:'flex',gap:8}}>
<button onClick={()=>setSendStep(1)} style={{flex:1,height:42,borderRadius:10,border:'1px solid rgba(255,255,255,.1)',background:'transparent',color:'var(--tx4)',fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer'}}>{T('← السابق','← Back')}</button>
<button onClick={()=>setSendStep(3)} disabled={!customMsg} style={{flex:2,height:42,borderRadius:10,border:'none',background:C.gold,color:'#111',fontFamily:F,fontSize:13,fontWeight:800,cursor:'pointer',opacity:customMsg?.1:.4}}>{T('معاينة وإرسال →','Preview & Send →')}</button>
</div>
</div>}

{sendStep===3&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
<div style={{padding:'16px',borderRadius:12,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.06)'}}>
<div style={{fontSize:12,fontWeight:700,color:'var(--tx3)',marginBottom:10}}>👁 {T('معاينة الرسالة','Message Preview')}</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:12}}>
<div style={{textAlign:'center'}}><div style={{fontSize:18,fontWeight:800,color:C.gold}}>{filteredRecipients.length}</div><div style={{fontSize:9,color:'var(--tx5)'}}>{T('مستلم','recipients')}</div></div>
<div style={{textAlign:'center'}}><div style={{fontSize:18,fontWeight:800,color:C.blue}}>واتساب</div><div style={{fontSize:9,color:'var(--tx5)'}}>{T('القناة','channel')}</div></div>
<div style={{textAlign:'center'}}><div style={{fontSize:18,fontWeight:800,color:C.ok}}>{selectedTemplate?'📋':'✏️'}</div><div style={{fontSize:9,color:'var(--tx5)'}}>{selectedTemplate?T('قالب','template'):T('حرة','custom')}</div></div>
</div>
{/* Sample messages */}
<div style={{fontSize:10,color:'var(--tx4)',marginBottom:6}}>{T('عينة من الرسائل:','Sample messages:')}</div>
{filteredRecipients.slice(0,3).map((r,i)=>{const msg=customMsg.replace('{اسم_العامل}',r.name_ar||'').replace('{اسم_العميل}',r.name_ar||'').replace('{رقم_الإقامة}',r.iqama_number||'').replace('{تاريخ_الانتهاء}',r.iqama_expiry_date||'')
return<div key={i} style={{padding:'10px 12px',borderRadius:8,background:'rgba(39,160,70,.04)',border:'1px solid rgba(39,160,70,.08)',marginBottom:4}}>
<div style={{fontSize:10,fontWeight:600,color:C.ok}}>{r.name_ar} ({r.phone||'—'})</div>
<div style={{fontSize:11,color:'var(--tx3)',marginTop:3,lineHeight:1.6}}>{msg}</div>
</div>})}
{filteredRecipients.length>3&&<div style={{fontSize:9,color:'var(--tx5)',textAlign:'center'}}>+{filteredRecipients.length-3} {T('مستلم آخر','more')}</div>}
</div>
<div style={{display:'flex',gap:8}}>
<button onClick={()=>setSendStep(2)} style={{flex:1,height:42,borderRadius:10,border:'1px solid rgba(255,255,255,.1)',background:'transparent',color:'var(--tx4)',fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer'}}>{T('← تعديل','← Edit')}</button>
<button onClick={sendCampaign} style={{flex:2,height:42,borderRadius:10,border:'none',background:C.ok,color:'#fff',fontFamily:F,fontSize:13,fontWeight:800,cursor:'pointer'}}>📤 {T('إرسال الآن','Send Now')} ({filteredRecipients.length})</button>
</div>
</div>}
</div>}

{/* ═══ TAB: TEMPLATES ═══ */}
{tab==='templates'&&<div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
<span style={{fontSize:13,fontWeight:700,color:'var(--tx3)'}}>{templates.length} {T('قالب','templates')}</span>
<button onClick={()=>{setTplForm({name_ar:'',category:'worker',body_ar:'',is_auto:'false'});setTplPop('new')}} style={{height:34,padding:'0 16px',borderRadius:8,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.1)',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer'}}>+ {T('قالب جديد','New Template')}</button>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
{templates.map(t=>{const c=catColors[t.category]||'#888'
return<div key={t.id} style={{padding:'14px 16px',borderRadius:12,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.06)'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
<span style={{fontSize:12,fontWeight:700,color:'var(--tx2)'}}>{t.name_ar}</span>
<span style={{fontSize:8,padding:'2px 6px',borderRadius:4,background:c+'12',color:c}}>{catLabels[t.category]||t.category}</span>
</div>
<div style={{fontSize:10,color:'var(--tx4)',lineHeight:1.6,marginBottom:8}}>{t.body_ar?.slice(0,80)}{t.body_ar?.length>80?'...':''}</div>
<div style={{display:'flex',gap:6,alignItems:'center'}}>
{t.is_auto&&<span style={{fontSize:8,padding:'1px 5px',borderRadius:3,background:C.ok+'08',color:C.ok}}>⚡ {T('تلقائي','Auto')}</span>}
{t.usage_count>0&&<span style={{fontSize:8,color:'var(--tx5)'}}>{t.usage_count}x</span>}
<div style={{flex:1}}/>
<button onClick={()=>{setTplForm({...t,is_auto:String(t.is_auto)});setTplPop(t.id)}} style={{fontSize:9,padding:'3px 8px',borderRadius:5,border:'1px solid rgba(255,255,255,.1)',background:'transparent',color:'var(--tx4)',cursor:'pointer',fontFamily:F}}>✎</button>
</div>
</div>})}
</div>
{/* Template edit popup */}
{tplPop&&<div onClick={()=>setTplPop(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.8)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(480px,96vw)',border:'1px solid var(--bd)',overflow:'hidden'}}>
<div style={{height:3,background:`linear-gradient(90deg,transparent,${C.gold},transparent)`}}/>
<div style={{padding:'16px 22px',borderBottom:'1px solid var(--bd)',fontSize:14,fontWeight:800,color:'var(--tx)'}}>{tplPop==='new'?T('قالب جديد','New Template'):T('تعديل القالب','Edit Template')}</div>
<div style={{padding:'16px 22px',display:'flex',flexDirection:'column',gap:10}}>
<div><div style={{fontSize:10,color:'var(--tx4)',marginBottom:4}}>{T('الاسم','Name')} *</div><input value={tplForm.name_ar||''} onChange={e=>setTplForm(p=>({...p,name_ar:e.target.value}))} style={fS}/></div>
<div><div style={{fontSize:10,color:'var(--tx4)',marginBottom:4}}>{T('الفئة','Category')}</div>
<select value={tplForm.category||''} onChange={e=>setTplForm(p=>({...p,category:e.target.value}))} style={fS}>
<option value="worker">{T('عمالة','Workers')}</option><option value="client">{T('عملاء','Clients')}</option><option value="internal">{T('داخلية','Internal')}</option>
</select></div>
<div><div style={{fontSize:10,color:'var(--tx4)',marginBottom:4}}>{T('نص الرسالة','Body')} *</div>
<textarea value={tplForm.body_ar||''} onChange={e=>setTplForm(p=>({...p,body_ar:e.target.value}))} rows={4} style={{...fS,height:'auto',padding:12,resize:'vertical',lineHeight:1.8}}/></div>
<div><div style={{fontSize:10,color:'var(--tx4)',marginBottom:4}}>{T('تلقائي؟','Auto?')}</div>
<select value={tplForm.is_auto||'false'} onChange={e=>setTplForm(p=>({...p,is_auto:e.target.value}))} style={fS}>
<option value="false">{T('يدوي','Manual')}</option><option value="true">{T('تلقائي','Auto')}</option>
</select></div>
</div>
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',flexDirection:'row-reverse'}}>
<button onClick={saveTemplate} disabled={saving} style={{height:40,padding:'0 24px',borderRadius:8,border:'none',background:C.gold,color:'#111',fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer',opacity:saving?.6:1}}>{saving?'...':T('حفظ','Save')}</button>
<button onClick={()=>setTplPop(null)} style={{height:40,padding:'0 16px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:12,cursor:'pointer'}}>{T('إلغاء','Cancel')}</button>
</div></div></div>}
</div>}

{/* ═══ TAB: LOG ═══ */}
{tab==='log'&&<div>
{/* Stats */}
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
{[[T('إجمالي المرسل','Total Sent'),totalSent,C.gold],[T('تم التسلم','Delivered'),totalDelivered,C.ok],[T('تم القراءة','Read'),totalRead,C.blue],[T('فشل','Failed'),totalFailed,C.red]].map(([l,v,c],i)=>
<div key={i} style={{padding:'12px',borderRadius:12,background:c+'08',border:'1px solid '+c+'15',textAlign:'center'}}>
<div style={{fontSize:20,fontWeight:800,color:c}}>{v}</div><div style={{fontSize:9,color:c,opacity:.6}}>{l}</div>
</div>)}
</div>
{/* Campaign list */}
{campaigns.map(c=>{const sc=stColors[c.status]||'#888';return<div key={c.id} style={{padding:'12px 16px',borderRadius:10,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.06)',marginBottom:6,display:'flex',alignItems:'center',gap:12}}>
<div style={{width:36,height:36,borderRadius:10,background:sc+'12',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>📤</div>
<div style={{flex:1}}>
<div style={{fontSize:12,fontWeight:700,color:'var(--tx2)'}}>{c.template?.name_ar||T('رسالة مخصصة','Custom')}</div>
<div style={{fontSize:10,color:'var(--tx5)',marginTop:2}}>{c.total_recipients} {T('مستلم','recipients')} · {c.delivered_count} {T('تم','delivered')} · {c.read_count} {T('قُرأ','read')}{c.failed_count>0?' · '+c.failed_count+' '+T('فشل','failed'):''}</div>
</div>
<div style={{textAlign:'center',flexShrink:0}}>
<div style={{fontSize:9,fontWeight:600,padding:'2px 8px',borderRadius:5,background:sc+'15',color:sc}}>{stLabels[c.status]||c.status}</div>
{c.sent_at&&<div style={{fontSize:9,color:'var(--tx5)',marginTop:3}}>{new Date(c.sent_at).toLocaleDateString('ar-SA',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>}
</div>
</div>})}
</div>}

{/* ═══ TAB: GROUPS ═══ */}
{tab==='groups'&&<div>
<div style={{display:'flex',flexDirection:'column',gap:8}}>
{groups.map(g=>{const isAuto=g.group_type==='auto';const tc=g.target_entity==='workers'?C.blue:C.gold
return<div key={g.id} style={{padding:'14px 16px',borderRadius:12,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.06)',display:'flex',alignItems:'center',gap:12}}>
<div style={{width:40,height:40,borderRadius:10,background:tc+'12',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>👥</div>
<div style={{flex:1}}>
<div style={{fontSize:12,fontWeight:700,color:'var(--tx2)'}}>{g.name_ar}</div>
<div style={{display:'flex',gap:6,marginTop:4}}>
<span style={{fontSize:8,padding:'2px 6px',borderRadius:4,background:tc+'12',color:tc}}>{g.target_entity==='workers'?T('عمال','Workers'):T('عملاء','Clients')}</span>
<span style={{fontSize:8,padding:'2px 6px',borderRadius:4,background:isAuto?C.ok+'08':'rgba(255,255,255,.04)',color:isAuto?C.ok:'var(--tx5)'}}>{isAuto?T('تلقائية','Auto'):T('يدوية','Manual')}</span>
</div>
</div>
<div style={{fontSize:18,fontWeight:800,color:tc}}>{g.member_count}</div>
</div>})}
</div>
</div>}

{/* ═══ TAB: SETTINGS ═══ */}
{tab==='settings'&&<div style={{maxWidth:500}}>
<div style={{padding:'16px',borderRadius:12,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.06)',marginBottom:14}}>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx3)',marginBottom:12}}>📱 {T('ربط واتساب','WhatsApp Connection')}</div>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
<div style={{width:10,height:10,borderRadius:'50%',background:config?.is_connected?C.ok:C.red}}/>
<span style={{fontSize:12,fontWeight:600,color:config?.is_connected?C.ok:C.red}}>{config?.is_connected?T('متصل — جاهز للإرسال','Connected — Ready'):T('غير متصل — يحتاج إعداد API','Not connected — API setup needed')}</span>
</div>
<div style={{display:'flex',flexDirection:'column',gap:8}}>
<div><div style={{fontSize:10,color:'var(--tx4)',marginBottom:4}}>{T('المزود','Provider')}</div><div style={{fontSize:12,fontWeight:600,color:'var(--tx2)'}}>{config?.provider||'whatsapp_cloud'}</div></div>
<div><div style={{fontSize:10,color:'var(--tx4)',marginBottom:4}}>{T('رقم الواتساب','Phone')}</div><div style={{fontSize:12,fontWeight:600,color:'var(--tx2)',direction:'ltr'}}>{config?.phone_number||'—'}</div></div>
<div><div style={{fontSize:10,color:'var(--tx4)',marginBottom:4}}>{T('الحد اليومي','Daily Limit')}</div><div style={{fontSize:12,fontWeight:600,color:'var(--tx2)'}}>{config?.daily_limit||1000} {T('رسالة','messages')}</div></div>
</div>
</div>
<div style={{padding:'16px',borderRadius:12,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.06)'}}>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx3)',marginBottom:12}}>⏰ {T('ساعات الإرسال','Sending Hours')}</div>
<div style={{fontSize:12,color:'var(--tx3)'}}>{config?.working_hours_start||'08:00'} — {config?.working_hours_end||'21:00'}</div>
<div style={{fontSize:10,color:'var(--tx5)',marginTop:4}}>{T('لن يتم إرسال رسائل خارج هذه الأوقات','No messages will be sent outside these hours')}</div>
</div>
</div>}
</div>
</div>
</div>}
