import React, { useState, useEffect, useCallback, useMemo } from 'react'

const F = "'Cairo',sans-serif"
const C = { dk:'#171717', fm:'#1e1e1e', gold:'#D4A017', red:'#c0392b', blue:'#3483b4', ok:'#27a046' }
const sMap = { completed:C.ok, in_progress:C.blue, pending:C.gold, draft:'#999', cancelled:C.red, issue:C.red, urgent:C.red, high:'#e67e22', normal:C.blue, low:'#999' }
const stAr = { completed:'مكتمل', in_progress:'جاري', pending:'معلّق', draft:'مسودة', cancelled:'ملغي', issue:'مشكلة', urgent:'عاجل', high:'عالي', normal:'عادي', low:'منخفض' }
const Badge = ({ v, color }) => { const cl = color || sMap[v] || '#999'; return <span style={{ fontSize:10, fontWeight:600, padding:'3px 8px', borderRadius:6, background:cl+'15', color:cl, display:'inline-flex', alignItems:'center', gap:3 }}><span style={{ width:4, height:4, borderRadius:'50%', background:cl }}/>{stAr[v]||v||'—'}</span> }
const GoldBar = () => <div style={{ height:3, background:'linear-gradient(90deg,transparent,#D4A017 30%,#dcc06e 50%,#D4A017 70%,transparent)' }}/>
const baseInput = { width:'100%', height:42, padding:'0 14px', border:'1.5px solid rgba(255,255,255,.12)', borderRadius:10, fontFamily:F, fontSize:13, fontWeight:600, color:'var(--tx)', outline:'none', background:'rgba(255,255,255,.07)', textAlign:'center' }
const bS = { height:36, padding:'0 16px', borderRadius:8, border:'1px solid rgba(212,160,23,.2)', background:'rgba(212,160,23,.12)', color:C.gold, fontFamily:F, fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }

export default function DynamicTransactionEngine({ sb, toast, user, lang, onTabChange, defaultType }) {
  const isAr = lang !== 'en'; const T = (a, e) => isAr ? a : e
  const isInternal = defaultType === 'internal'; const isExternal = defaultType === 'external'
  const internalTypes = ['internal', 'internal_task', 'office']
  const externalTypes = ['external', 'client_transaction']
  const [services,setServices]=useState([]); const [transactions,setTransactions]=useState([]); const [txSteps,setTxSteps]=useState([]); const [stepFields,setStepFields]=useState([])
  const [templates,setTemplates]=useState([]); const [clients,setClients]=useState([]); const [facilities,setFacilities]=useState([]); const [workers,setWorkers]=useState([]); const [users,setUsers]=useState([])
  const [loading,setLoading]=useState(true); const [fkCache,setFkCache]=useState({})
  const [activeTab,setActiveTab]=useState('all'); const [q,setQ]=useState(''); const [statusFilter,setStatusFilter]=useState('all')
  const [showServicePicker,setShowServicePicker]=useState(false); const [selectedService,setSelectedService]=useState(null)
  const [viewRow,setViewRow]=useState(null); const [viewTab,setViewTab]=useState('info'); const [currentStep,setCurrentStep]=useState(0)
  const [fieldValues,setFieldValues]=useState({}); const [saving,setSaving]=useState(false); const [selected,setSelected]=useState([])
  const [createForm,setCreateForm]=useState(null); const [showTemplates,setShowTemplates]=useState(false)
  const [viewLog,setViewLog]=useState([]); const [viewAttachments,setViewAttachments]=useState([]); const [viewPayments,setViewPayments]=useState([])
  const [svcDropOpen,setSvcDropOpen]=useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [svc,txn,stp,sf,tmpl,cl,fc,wk,us] = await Promise.all([
      sb.from('sub_services').select('*').eq('is_active',true).order('sort_order'),
      sb.from('v_transaction_sla').select('*').order('created_at',{ascending:false}),
      sb.from('transaction_steps').select('*').order('step_order'),
      sb.from('step_fields').select('*').order('sort_order'),
      sb.from('transaction_templates').select('*').eq('is_active',true).order('sort_order'),
      sb.from('clients').select('id,name_ar,phone').is('deleted_at',null),
      sb.from('facilities').select('id,name_ar').is('deleted_at',null),
      sb.from('workers').select('id,name_ar').is('deleted_at',null),
      sb.from('users').select('id,name_ar').is('deleted_at',null)
    ])
    setServices(svc.data||[]); setTransactions(txn.data||[]); setTxSteps(stp.data||[]); setStepFields(sf.data||[])
    setTemplates(tmpl.data||[]); setClients(cl.data||[]); setFacilities(fc.data||[]); setWorkers(wk.data||[]); setUsers(us.data||[])
    const cache={clients:cl.data||[],facilities:fc.data||[],workers:wk.data||[],users:us.data||[]}
    const fkTables=[...new Set((sf.data||[]).filter(f=>f.fk_table).map(f=>f.fk_table))]
    for(const tbl of fkTables){if(!cache[tbl]){const{data:fkd}=await sb.from(tbl).select('*').is('deleted_at',null).limit(500);cache[tbl]=fkd||[]}}
    const{data:li}=await sb.from('lookup_items').select('*').is('deleted_at',null)
    const{data:lc}=await sb.from('lookup_categories').select('*')
    if(li&&lc){lc.forEach(cat=>{cache['_lookup_'+cat.category_key]=(li||[]).filter(i=>i.category_id===cat.id)});(sf.data||[]).forEach(f=>{if(f.lookup_category_key){const cat=lc.find(c=>c.category_key===f.lookup_category_key);if(cat)cache['_lookup_'+f.field_name]=(li||[]).filter(i=>i.category_id===cat.id)}})}
    setFkCache(cache); setLoading(false)
  },[sb])
  useEffect(()=>{load()},[load]); useEffect(()=>{onTabChange&&onTabChange({tab:activeTab})},[activeTab])

  const createTransaction=async(service,form)=>{try{const txnNum='TXN-'+new Date().getFullYear()+'-'+String((transactions.length||0)+1).padStart(4,'0');const dd=new Date();dd.setDate(dd.getDate()+(service.expected_sla_days||14))
    const{data:newTxn,error}=await sb.from('transactions').insert({transaction_number:txnNum,transaction_type:form.transaction_type||'client_transaction',service_category:service.category||'OTHER',service_id:service.id,status:'pending',priority:'normal',start_date:new Date().toISOString().slice(0,10),due_date:dd.toISOString().slice(0,10),client_id:form.client_id||null,facility_id:form.facility_id||null,worker_id:form.worker_id||null,assigned_to:form.assigned_to||null,notes:form.notes||null,created_by:user?.id,branch_id:user?.branch_id||null}).select().single()
    if(error)throw error;const{data:svcSteps}=await sb.from('sub_service_steps').select('*').eq('sub_service_id',service.id).order('step_order')
    if(svcSteps?.length>0){await sb.from('transaction_steps').insert(svcSteps.map(s=>({transaction_id:newTxn.id,step_order:s.step_order,step_name_ar:s.name_ar,step_name_en:s.name_en,status:'pending',estimated_minutes:s.estimated_minutes,service_step_id:s.id,sub_service_id:service.id,target_table:s.target_table,created_by:user?.id})))}
    toast(T('✓ تم إنشاء المعاملة: '+txnNum,'✓ Created: '+txnNum));setCreateForm(null);setShowServicePicker(false);load()}catch(e){toast('خطأ: '+(e.message||'').slice(0,80))}}

  const createFromTemplate=async(tmpl)=>{try{const txnNum='TXN-'+new Date().getFullYear()+'-'+String((transactions.length||0)+1).padStart(4,'0');const dd=new Date();dd.setDate(dd.getDate()+14)
    const{data:newTxn,error}=await sb.from('transactions').insert({transaction_number:txnNum,transaction_type:tmpl.transaction_type,service_category:tmpl.service_category||'OTHER',status:'pending',priority:'normal',start_date:new Date().toISOString().slice(0,10),due_date:dd.toISOString().slice(0,10),created_by:user?.id}).select().single()
    if(error)throw error;const{data:tss}=await sb.from('template_sub_services').select('*,sub_services:sub_service_id(name_ar,name_en)').eq('template_id',tmpl.id).order('sort_order')
    if(tss?.length>0){await sb.from('transaction_steps').insert(tss.map((ts,i)=>({transaction_id:newTxn.id,step_order:i+1,step_name_ar:ts.sub_services?.name_ar||'خطوة '+(i+1),step_name_en:ts.sub_services?.name_en||'Step '+(i+1),status:'pending',sub_service_id:ts.sub_service_id,created_by:user?.id})))}
    toast(T('✓ تم الإنشاء من القالب','✓ Created from template'));setShowTemplates(false);load()}catch(e){toast('خطأ: '+(e.message||'').slice(0,80))}}

  const openDetail=async(row)=>{setViewRow(row);setViewTab('info');setCurrentStep(0)
    const[fvR,logR,attR,payR]=await Promise.all([
      sb.from('transaction_field_values').select('*').eq('transaction_id',row.id),
      sb.from('activity_log').select('*').eq('entity_type','transaction').eq('entity_id',row.id).order('created_at',{ascending:false}).limit(50),
      sb.from('attachments').select('*').eq('entity_type','transaction').eq('entity_id',row.id).is('deleted_at',null),
      sb.from('external_payments').select('*').eq('transaction_id',row.id).is('deleted_at',null).order('created_at',{ascending:false})
    ])
    const vals={};(fvR.data||[]).forEach(v=>{vals[v.field_key]=v.field_value});setFieldValues(vals)
    setViewLog(logR.data||[]);setViewAttachments(attR.data||[]);setViewPayments(payR.data||[])}

  const saveStepFields=async(step,action)=>{setSaving(true);try{const bpId=step.service_step_id||step.sub_service_id;const sFields=stepFields.filter(f=>f.step_id===bpId)
    for(const fd of sFields){const val=fieldValues[fd.field_name];if(val===undefined||val==='')continue;if(val instanceof File)continue
      await sb.from('transaction_field_values').insert({transaction_id:viewRow.id,transaction_step_id:step.id,step_field_id:fd.id,field_key:fd.field_name,field_value:String(val),target_table:fd.target_table,target_field:fd.field_name}).select()
      if(fd.target_table&&step.target_record_id){await sb.from(fd.target_table).update({[fd.field_name]:val}).eq('id',step.target_record_id)}}
    const noteKey='_note_'+step.id;if(fieldValues[noteKey])await sb.from('transaction_steps').update({notes:fieldValues[noteKey]}).eq('id',step.id)
    if(action==='complete'){await sb.from('transaction_steps').update({status:'completed',completed_at:new Date().toISOString(),completed_by:user?.id,duration_minutes:step.started_at?Math.round((Date.now()-new Date(step.started_at).getTime())/60000):null}).eq('id',step.id)
      const allS=txSteps.filter(s=>s.transaction_id===viewRow.id);const allDone=allS.filter(s=>s.id!==step.id).every(s=>s.status==='completed')
      if(allDone){await sb.from('transactions').update({status:'completed',completed_date:new Date().toISOString().slice(0,10),updated_by:user?.id}).eq('id',viewRow.id);toast(T('✅ تم إنجاز المعاملة بالكامل!','✅ Fully completed!'))}
      else{toast(T('✓ تم إنجاز الخطوة','✓ Step completed'));const ns=allS.find(s=>s.step_order===step.step_order+1&&s.status==='pending');if(ns){await sb.from('transaction_steps').update({status:'in_progress',started_at:new Date().toISOString()}).eq('id',ns.id);setCurrentStep(c=>c+1)}}}
    else toast(T('✓ تم الحفظ','✓ Saved'));load()}catch(e){toast('خطأ: '+(e.message||'').slice(0,80))}setSaving(false)}

  const del=async id=>{if(!confirm(T('حذف؟','Delete?')))return;await sb.from('transactions').update({deleted_at:new Date().toISOString(),deleted_by:user?.id}).eq('id',id);toast(T('تم الحذف','Deleted'));setViewRow(null);load()}
  const bulkUpdate=async(ns)=>{if(!selected.length)return;if(!confirm(T('تحديث '+selected.length+'؟','Update?')))return;await sb.from('transactions').update({status:ns,updated_by:user?.id,...(ns==='completed'?{completed_date:new Date().toISOString().slice(0,10)}:{})}).in('id',selected);toast(T('تم','Done'));setSelected([]);load()}

  const dynamicTabs=useMemo(()=>{const tabs=[{id:'all',name_ar:'الكل',name_en:'All',color:C.gold}];services.forEach(s=>tabs.push({id:s.id,code:s.code,name_ar:s.name_ar,name_en:s.name_en,color:s.color||C.gold}));return tabs},[services])
  const typeFiltered=useMemo(()=>{if(isInternal)return transactions.filter(r=>internalTypes.includes(r.transaction_type));if(isExternal)return transactions.filter(r=>externalTypes.includes(r.transaction_type));return transactions},[transactions,defaultType])
  const filtered=useMemo(()=>typeFiltered.filter(r=>{if(activeTab!=='all'&&r.service_id!==activeTab)return false;if(statusFilter!=='all'&&r.status!==statusFilter)return false;if(q){const s=q.toLowerCase();return(r.transaction_number||'').toLowerCase().includes(s)||(r.client_name||'').includes(s)||(r.facility_name||'').includes(s)||(r.service_name_ar||'').includes(s)}return true}),[typeFiltered,activeTab,statusFilter,q])
  const stats=useMemo(()=>{const all=typeFiltered;const t=all.length;const done=all.filter(r=>r.status==='completed').length;const active=all.filter(r=>r.status==='in_progress').length;const issue=all.filter(r=>r.status==='issue').length;const pending=all.filter(r=>r.status==='pending').length;const overdue=all.filter(r=>r.sla_status==='overdue'||r.sla_status==='critical').length;const d=all.filter(r=>r.completion_days);const avgDays=d.length>0?Math.round(d.reduce((s,r)=>s+r.completion_days,0)/d.length):0;return{total:t,done,active,issue,pending,overdue,avgDays,donePct:t>0?Math.round(done/t*100):0,issuePct:t>0?Math.round(issue/t*100):0}},[typeFiltered])
  const viewSteps=viewRow?txSteps.filter(s=>s.transaction_id===viewRow.id).sort((a,b)=>a.step_order-b.step_order):[]
  const fBtnS=a=>({padding:'5px 12px',borderRadius:6,fontSize:10,fontWeight:a?700:500,color:a?C.gold:'rgba(255,255,255,.4)',background:a?'rgba(212,160,23,.08)':'transparent',border:a?'1px solid rgba(212,160,23,.15)':'1px solid rgba(255,255,255,.06)',cursor:'pointer'})
  const cardS={background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:12,overflow:'hidden'};const thS={padding:'10px 14px',textAlign:isAr?'right':'left',fontSize:10,fontWeight:600,color:'var(--tx5)'};const tdS={padding:'10px 14px',fontSize:12,fontWeight:600,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}

  /* DynamicField */
  const DF=({field,value,onChange})=>{const label=isAr?field.field_label_ar:(field.field_label_en||field.field_label_ar);const t=field.field_type;const ph=field.placeholder_ar||''
    const inp=()=>{if(t==='fk'){const items=fkCache[field.fk_table]||[];return<select value={value||''} onChange={e=>onChange(e.target.value)} style={baseInput}><option value="">{T('— اختر —','— Select —')}</option>{items.map(i=><option key={i.id} value={i.id}>{i[field.fk_display_field||'name_ar']||i.name_ar||i.id}</option>)}</select>}
      if(t==='select'){const opts=field.options&&Array.isArray(field.options)&&field.options.length>0?field.options:(fkCache['_lookup_'+field.field_name]||[]);return<select value={value||''} onChange={e=>onChange(e.target.value)} style={baseInput}><option value="">{T('— اختر —','— Select —')}</option>{opts.map((o,i)=>typeof o==='string'?<option key={i} value={o}>{o}</option>:<option key={o.value||o.code||i} value={o.value||o.code}>{isAr?(o.label_ar||o.name_ar||o.value):(o.label_en||o.name_en||o.value)}</option>)}</select>}
      if(t==='textarea')return<textarea value={value||''} onChange={e=>onChange(e.target.value)} rows={3} placeholder={ph} style={{...baseInput,height:'auto',padding:12,resize:'vertical',textAlign:isAr?'right':'left'}}/>
      if(t==='boolean')return<label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:12,color:'var(--tx3)'}}><input type="checkbox" checked={value===true||value==='true'} onChange={e=>onChange(e.target.checked)} style={{width:18,height:18,accentColor:C.gold,cursor:'pointer'}}/>{label}</label>
      if(t==='date')return<input type="date" value={value||''} onChange={e=>onChange(e.target.value)} style={{...baseInput,direction:'ltr'}}/>
      if(t==='number')return<input type="number" value={value||''} onChange={e=>onChange(e.target.value)} placeholder={ph} style={{...baseInput,direction:'ltr'}}/>
      return<input value={value||''} onChange={e=>onChange(e.target.value)} placeholder={ph} style={{...baseInput,textAlign:isAr?'right':'left'}}/>}
    if(t==='boolean')return<div style={{gridColumn:field.grid_col==='2'?'1/-1':undefined}}>{inp()}</div>
    return<div style={{gridColumn:field.grid_col==='2'?'1/-1':undefined}}><div style={{fontSize:12,fontWeight:600,color:'var(--tx3)',marginBottom:5}}>{label}{field.is_required&&<span style={{color:C.red}}> *</span>}</div>{inp()}{field.help_text_ar&&<div style={{fontSize:9,color:'var(--tx6)',marginTop:3}}>{isAr?field.help_text_ar:(field.help_text_en||field.help_text_ar)}</div>}</div>}

  /* ───── VERTICAL TIMELINE for Steps ───── */
  const StepTimeline=()=>{const step=viewSteps[currentStep];if(!step)return null;const bpId=step.service_step_id||step.sub_service_id;const sF=stepFields.filter(f=>f.step_id===bpId).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))
    return<div style={{display:'flex',gap:16}}>
    {/* Timeline sidebar */}
    <div style={{width:180,flexShrink:0,overflowY:'auto',maxHeight:420}}>
    {viewSteps.map((s,i)=>{const done=s.status==='completed';const act=i===currentStep;const inProg=s.status==='in_progress';const clr=done?C.ok:act||inProg?C.gold:'rgba(255,255,255,.2)';const isLast=i===viewSteps.length-1
      return<div key={s.id} onClick={()=>setCurrentStep(i)} style={{display:'flex',gap:10,cursor:'pointer',padding:'6px 0',position:'relative'}}>
        {/* Line connector */}
        {!isLast&&<div style={{position:'absolute',[isAr?'right':'left']:11,top:28,width:2,height:'calc(100% - 16px)',background:done?C.ok+'40':'rgba(255,255,255,.06)'}}/>}
        {/* Circle */}
        <div style={{width:24,height:24,borderRadius:'50%',background:done?C.ok:act?C.gold+'20':'rgba(255,255,255,.04)',border:'2px solid '+clr,display:'flex',alignItems:'center',justifyContent:'center',fontSize:done?10:9,fontWeight:800,color:clr,flexShrink:0,zIndex:1,transition:'.2s'}}>
          {done?'✓':s.step_order}
        </div>
        {/* Label */}
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:10,fontWeight:act?700:500,color:act?'var(--tx)':done?C.ok:'rgba(255,255,255,.4)',lineHeight:1.3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{isAr?s.step_name_ar:(s.step_name_en||s.step_name_ar)}</div>
          <div style={{fontSize:8,color:'var(--tx5)',marginTop:1}}>
            {done&&s.completed_at?new Date(s.completed_at).toLocaleDateString('ar-SA',{month:'short',day:'numeric'}):inProg?T('جاري...','In progress...'):''}
          </div>
          {s.duration_minutes&&<div style={{fontSize:8,color:C.blue}}>{s.duration_minutes} {T('د','m')}</div>}
        </div>
      </div>})}
    </div>
    {/* Step Content */}
    <div style={{flex:1}}>
      <div style={{background:'rgba(255,255,255,.02)',borderRadius:14,padding:16,border:'1px solid rgba(255,255,255,.04)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:32,height:32,borderRadius:8,background:C.gold+'12',border:'1px solid '+C.gold+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:C.gold}}>{step.step_order}</div>
            <div><div style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>{isAr?step.step_name_ar:(step.step_name_en||step.step_name_ar)}</div>
            <div style={{display:'flex',gap:6,marginTop:2}}><Badge v={step.status}/>{step.target_table&&<span style={{fontSize:9,padding:'1px 5px',borderRadius:3,background:'rgba(52,131,180,.08)',color:C.blue}}>{step.target_table}</span>}</div></div>
          </div>
        </div>
        {sF.length>0?<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>{sF.map(f=>{if(f.depends_on_field&&f.depends_on_value&&fieldValues[f.depends_on_field]!==f.depends_on_value)return null;return<DF key={f.id} field={f} value={fieldValues[f.field_name]||''} onChange={val=>setFieldValues(p=>({...p,[f.field_name]:val}))}/>})}</div>:<div style={{textAlign:'center',padding:'20px 0',color:'var(--tx5)',fontSize:12}}>{T('لا توجد حقول — أنجز الخطوة مباشرة','No fields — complete directly')}</div>}
        <div style={{marginTop:12}}><div style={{fontSize:11,fontWeight:600,color:'var(--tx4)',marginBottom:4}}>{T('ملاحظات','Notes')}</div><textarea value={fieldValues['_note_'+step.id]||''} onChange={e=>setFieldValues(p=>({...p,['_note_'+step.id]:e.target.value}))} rows={2} placeholder={T('أضف ملاحظات...','Add notes...')} style={{width:'100%',padding:10,border:'1.5px solid rgba(255,255,255,.08)',borderRadius:8,fontFamily:F,fontSize:11,color:'var(--tx)',background:'rgba(255,255,255,.03)',outline:'none',resize:'vertical'}}/></div>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:14,gap:8}}>
        <button onClick={()=>setCurrentStep(Math.max(0,currentStep-1))} disabled={currentStep===0} style={{height:38,padding:'0 16px',borderRadius:10,border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.04)',color:'var(--tx4)',fontFamily:F,fontSize:11,fontWeight:600,cursor:currentStep===0?'default':'pointer',opacity:currentStep===0?.3:1}}>{T('← السابق','← Prev')}</button>
        <div style={{display:'flex',gap:6}}>
          <button onClick={()=>saveStepFields(step,'save')} disabled={saving} style={{height:38,padding:'0 16px',borderRadius:10,border:'1px solid rgba(212,160,23,.2)',background:'rgba(212,160,23,.08)',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer',opacity:saving?.5:1}}>{saving?'...':T('💾 حفظ','💾 Save')}</button>
          {step.status!=='completed'&&<button onClick={()=>saveStepFields(step,'complete')} disabled={saving} style={{height:38,padding:'0 16px',borderRadius:10,border:'1px solid rgba(39,160,70,.2)',background:'rgba(39,160,70,.08)',color:C.ok,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer'}}>{T('✓ إنجاز','✓ Done')}</button>}
          {currentStep<viewSteps.length-1&&<button onClick={()=>setCurrentStep(currentStep+1)} style={{height:38,padding:'0 16px',borderRadius:10,border:'1px solid rgba(52,131,180,.2)',background:'rgba(52,131,180,.08)',color:C.blue,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer'}}>{T('التالي →','Next →')}</button>}
        </div>
      </div>
    </div></div>}

  return<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
      <div><div style={{fontSize:20,fontWeight:700,color:'rgba(255,255,255,.93)'}}>{isInternal?T('المعاملات الداخلية','Internal Transactions'):isExternal?T('المعاملات الخارجية','External Transactions'):T('المعاملات','Transactions')}</div><div style={{fontSize:12,color:'var(--tx4)',marginTop:6}}>{isInternal?T('المعاملات الداخلية والمكتبية — إجراءات لا تتطلب عميل','Internal & office transactions'):isExternal?T('معاملات العملاء — خدمات خارجية مباشرة','Client transactions — direct external services'):T('محرك ديناميكي — الخدمات والخطوات والحقول من قاعدة البيانات','Dynamic engine — services, steps & fields from database')}</div></div>
      <div style={{display:'flex',gap:6}}>
        <div style={{position:'relative'}}><button onClick={()=>setShowTemplates(!showTemplates)} style={{...bS,background:'rgba(52,131,180,.1)',border:'1px solid rgba(52,131,180,.2)',color:C.blue}}>📋 {T('من قالب','Template')}</button>
          {showTemplates&&<><div onClick={()=>setShowTemplates(false)} style={{position:'fixed',inset:0,zIndex:98}}/><div style={{position:'absolute',top:'calc(100% + 4px)',[isAr?'right':'left']:0,width:300,background:'#252525',border:'1px solid rgba(255,255,255,.12)',borderRadius:12,boxShadow:'0 12px 36px rgba(0,0,0,.5)',zIndex:99,maxHeight:350,overflowY:'auto',padding:6}}>{templates.map(t=><div key={t.id} onClick={()=>createFromTemplate(t)} style={{padding:'10px 14px',borderRadius:8,cursor:'pointer',marginBottom:2}} onMouseEnter={e=>e.currentTarget.style.background='rgba(212,160,23,.06)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}><div style={{fontSize:12,fontWeight:600,color:'var(--tx2)'}}>{t.name_ar}</div><div style={{fontSize:9,color:'var(--tx5)',marginTop:2}}>{t.service_category||t.transaction_type}</div></div>)}</div></>}</div>
        <button onClick={()=>setShowServicePicker(true)} style={bS}>⚡ {T('معاملة جديدة','New Transaction')}</button>
      </div></div>

    {selected.length>0&&<div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 16px',borderRadius:10,background:'rgba(212,160,23,.06)',border:'1px solid rgba(212,160,23,.12)',marginBottom:14}}><span style={{fontSize:12,fontWeight:700,color:C.gold}}>{selected.length} {T('محددة','selected')}</span><div style={{flex:1}}/><button onClick={()=>bulkUpdate('completed')} style={{height:30,padding:'0 12px',borderRadius:6,border:'1px solid rgba(39,160,70,.2)',background:'rgba(39,160,70,.08)',color:C.ok,fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer'}}>{T('إنجاز','Complete')}</button><button onClick={()=>bulkUpdate('cancelled')} style={{height:30,padding:'0 12px',borderRadius:6,border:'1px solid rgba(192,57,43,.2)',background:'rgba(192,57,43,.06)',color:C.red,fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer'}}>{T('إلغاء','Cancel')}</button><button onClick={()=>setSelected([])} style={{height:30,padding:'0 10px',borderRadius:6,border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.04)',color:'var(--tx4)',fontFamily:F,fontSize:10,cursor:'pointer'}}>✕</button></div>}

    {/* ═══ ENHANCED STATS CARDS ═══ */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:10,marginBottom:18}}>
      {[
        {l:T('الإجمالي','Total'),v:stats.total,c:C.gold,sub:''},
        {l:T('جارية + معلّقة','Active+Pending'),v:stats.active+stats.pending,c:C.blue,sub:stats.active+' '+T('جاري','act')+' · '+stats.pending+' '+T('معلّق','pen')},
        {l:T('مكتملة','Completed'),v:stats.done,c:C.ok,sub:stats.donePct+'%'},
        {l:T('مشكلة','Issue'),v:stats.issue,c:C.red,sub:stats.issuePct>0?'⚠ '+stats.issuePct+'%':''},
        {l:T('متجاوزة SLA','SLA Overdue'),v:stats.overdue,c:'#e67e22',sub:''},
        {l:T('متوسط أيام','Avg Days'),v:stats.avgDays,c:'#9b59b6',sub:T('يوم','days')}
      ].map((s,i)=><div key={i} style={{padding:14,borderRadius:12,background:s.c+'08',border:'1px solid '+s.c+'15',position:'relative',overflow:'hidden'}}>
        {s.v>0&&s.c===C.red&&<div style={{position:'absolute',top:0,right:0,width:40,height:40,background:C.red+'08',borderRadius:'0 0 0 40px'}}/>}
        <div style={{fontSize:9,color:s.c,opacity:.7,marginBottom:4}}>{s.l}</div>
        <div style={{fontSize:22,fontWeight:800,color:s.c}}>{s.v}</div>
        {s.sub&&<div style={{fontSize:8,color:s.c,opacity:.5,marginTop:2}}>{s.sub}</div>}
      </div>)}
    </div>

    {/* ═══ ENHANCED FILTERS ═══ */}
    <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder={T('🔍 بحث بالرقم أو العميل أو المنشأة...','🔍 Search by number, client or facility...')} style={{flex:1,minWidth:200,height:36,padding:'0 14px',border:'1.5px solid rgba(255,255,255,.08)',borderRadius:8,fontFamily:F,fontSize:11,color:'var(--tx)',background:'rgba(255,255,255,.04)',outline:'none'}}/>
      {/* Service dropdown */}
      <div style={{position:'relative'}}>
        <div onClick={()=>setSvcDropOpen(!svcDropOpen)} style={{height:36,padding:'0 12px',borderRadius:8,border:activeTab!=='all'?'1.5px solid rgba(212,160,23,.3)':'1.5px solid rgba(255,255,255,.08)',background:activeTab!=='all'?'rgba(212,160,23,.08)':'rgba(255,255,255,.04)',display:'flex',alignItems:'center',gap:6,cursor:'pointer',minWidth:130}}>
          <span style={{fontSize:11,fontWeight:activeTab!=='all'?700:500,color:activeTab!=='all'?C.gold:'var(--tx4)',flex:1}}>{activeTab==='all'?T('كل الخدمات','All Services'):(isAr?dynamicTabs.find(t=>t.id===activeTab)?.name_ar:dynamicTabs.find(t=>t.id===activeTab)?.name_en)||T('كل الخدمات','All')}</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{transform:svcDropOpen?'rotate(180deg)':'',transition:'.2s'}}><polyline points="6 9 12 15 18 9" stroke={C.gold} strokeWidth="2.5"/></svg>
        </div>
        {svcDropOpen&&<><div onClick={()=>setSvcDropOpen(false)} style={{position:'fixed',inset:0,zIndex:98}}/><div style={{position:'absolute',top:'calc(100% + 4px)',[isAr?'right':'left']:0,width:260,background:'#252525',border:'1px solid rgba(255,255,255,.12)',borderRadius:10,boxShadow:'0 8px 32px rgba(0,0,0,.6)',zIndex:99,maxHeight:300,overflowY:'auto',padding:4}}>
          {dynamicTabs.map(t=><div key={t.id} onClick={()=>{setActiveTab(t.id);setSvcDropOpen(false);setQ('')}} style={{padding:'8px 12px',borderRadius:6,cursor:'pointer',display:'flex',alignItems:'center',gap:8,fontSize:11,fontWeight:activeTab===t.id?700:500,color:activeTab===t.id?C.gold:'rgba(255,255,255,.6)',background:activeTab===t.id?'rgba(212,160,23,.06)':'transparent'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.04)'} onMouseLeave={e=>e.currentTarget.style.background=activeTab===t.id?'rgba(212,160,23,.06)':'transparent'}>
            {t.color&&t.id!=='all'&&<span style={{width:6,height:6,borderRadius:'50%',background:t.color,flexShrink:0}}/>}
            <span>{isAr?t.name_ar:(t.name_en||t.name_ar)}</span>
            <span style={{marginRight:'auto',marginLeft:'auto'}}/>
            <span style={{fontSize:9,color:'rgba(255,255,255,.25)'}}>{typeFiltered.filter(r=>t.id==='all'?true:r.service_id===t.id).length}</span>
          </div>)}
        </div></>}
      </div>
      {/* Status filters */}
      <div style={{display:'flex',gap:3}}>
        {[{v:'all',l:T('الكل','All')},{v:'in_progress',l:T('جارية','Active')},{v:'completed',l:T('مكتملة','Done')},{v:'pending',l:T('معلقة','Pending')},{v:'issue',l:T('مشكلة','Issue'),c:C.red}].map(f=>
          <div key={f.v} onClick={()=>setStatusFilter(f.v)} style={{...fBtnS(statusFilter===f.v),...(f.c&&statusFilter===f.v?{color:f.c,background:f.c+'12',borderColor:f.c+'25'}:{})}}>{f.l}</div>
        )}
      </div>
      <div style={{fontSize:10,color:'var(--tx5)'}}>{filtered.length} {T('معاملة','txn')}</div>
    </div>

    {/* ═══ TABLE ═══ */}
    {loading?<div style={{textAlign:'center',padding:50,color:'var(--tx5)'}}>...</div>:<div style={cardS}><table style={{width:'100%',borderCollapse:'collapse',fontFamily:F}}><thead><tr style={{background:'rgba(255,255,255,.04)',borderBottom:'1px solid var(--bd)'}}><th style={{...thS,width:36}}><input type="checkbox" checked={selected.length===filtered.length&&filtered.length>0} onChange={()=>setSelected(selected.length===filtered.length?[]:filtered.map(r=>r.id))} style={{cursor:'pointer'}}/></th><th style={thS}>{T('الرقم','No.')}</th><th style={thS}>{T('الخدمة','Service')}</th><th style={thS}>{T('العميل/المنشأة','Client/Fac.')}</th><th style={thS}>{T('الحالة','Status')}</th><th style={thS}>{T('التقدم','Progress')}</th><th style={thS}>{T('SLA','SLA')}</th><th style={thS}>{T('المسؤول','Staff')}</th><th style={{...thS,width:60}}></th></tr></thead><tbody>{filtered.length===0?<tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'var(--tx6)'}}>{T('لا توجد بيانات','No data')}</td></tr>:filtered.map(r=>{const slaC={on_time:C.ok,warning:'#e67e22',critical:C.red,overdue:C.red,done:'#999',no_deadline:'#666'}[r.sla_status]||'#999';const isSel=selected.includes(r.id);const isIssue=r.status==='issue';return<tr key={r.id} onClick={()=>openDetail(r)} style={{borderBottom:'1px solid rgba(255,255,255,.025)',cursor:'pointer',background:isIssue?'rgba(192,57,43,.04)':isSel?'rgba(212,160,23,.04)':'transparent'}} onMouseEnter={e=>{if(!isSel&&!isIssue)e.currentTarget.style.background='rgba(212,160,23,.03)'}} onMouseLeave={e=>{e.currentTarget.style.background=isIssue?'rgba(192,57,43,.04)':isSel?'rgba(212,160,23,.04)':'transparent'}}><td style={{padding:'8px 14px'}} onClick={e=>e.stopPropagation()}><input type="checkbox" checked={isSel} onChange={()=>setSelected(p=>isSel?p.filter(x=>x!==r.id):[...p,r.id])} style={{cursor:'pointer'}}/></td><td style={{...tdS,color:C.gold,fontWeight:700}}>{r.transaction_number||'—'}</td><td style={tdS}><span style={{fontSize:9,padding:'2px 6px',borderRadius:4,background:(r.service_color||C.gold)+'12',color:r.service_color||C.gold}}>{isAr?(r.service_name_ar||r.service_category||'—'):(r.service_name_en||r.service_code||'—')}</span></td><td style={tdS}><div style={{fontSize:11,color:'var(--tx3)'}}>{r.client_name||'—'}</div><div style={{fontSize:9,color:'var(--tx5)'}}>{r.facility_name||''}</div></td><td style={tdS}><Badge v={r.status}/></td><td style={{...tdS,width:100}}>{r.total_steps>0?<div style={{display:'flex',alignItems:'center',gap:4}}><div style={{flex:1,height:4,borderRadius:2,background:'rgba(255,255,255,.06)',overflow:'hidden'}}><div style={{height:'100%',width:(r.steps_pct||0)+'%',borderRadius:2,background:r.steps_pct>=100?C.ok:C.gold}}/></div><span style={{fontSize:9,color:'var(--tx5)',minWidth:24}}>{r.steps_pct||0}%</span></div>:<span style={{fontSize:9,color:'var(--tx6)'}}>—</span>}</td><td style={tdS}>{r.days_remaining!=null?<span style={{fontSize:10,fontWeight:700,color:slaC}}>{r.days_remaining<0?r.days_remaining+T('ي','d'):r.days_remaining===0?T('اليوم','Today'):'+'+r.days_remaining+T('ي','d')}</span>:<span style={{fontSize:9,color:'var(--tx6)'}}>—</span>}</td><td style={{...tdS,fontSize:10,color:'var(--tx4)'}}>{r.assigned_name||<span style={{color:'var(--tx6)'}}>—</span>}</td><td style={{padding:'8px',textAlign:'center'}} onClick={e=>e.stopPropagation()}><button onClick={()=>del(r.id)} style={{width:28,height:28,borderRadius:7,border:'1px solid rgba(192,57,43,.12)',background:'rgba(192,57,43,.04)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button></td></tr>})}</tbody></table></div>}

    {/* ═══ ENHANCED DETAIL PANEL (5 TABS) ═══ */}
    {viewRow&&(()=>{const cS=viewSteps.filter(s=>s.status==='completed').length;const tS=viewSteps.length;const pP=tS>0?Math.round(cS/tS*100):0
      const IB=({l,v,copy,icon})=><div style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'14px 16px',border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:9,color:'var(--tx5)',marginBottom:6,display:'flex',alignItems:'center',gap:4}}>{icon&&<span>{icon}</span>}{l}</div><div style={{display:'flex',alignItems:'center',gap:6}}><div style={{fontSize:14,fontWeight:700,color:sMap[v]?sMap[v]:'rgba(255,255,255,.85)'}}>{sMap[v]?<Badge v={v}/>:(v||'—')}</div>{copy&&v&&v!=='—'&&<button onClick={e=>{e.stopPropagation();navigator.clipboard.writeText(String(v));toast(T('تم النسخ','Copied'))}} style={{width:20,height:20,borderRadius:5,border:'none',background:'rgba(255,255,255,.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>}</div></div>

      const vtabs=[
        {id:'info',l:T('البيانات','Info'),icon:'📋'},
        {id:'steps',l:T('الخطوات','Steps'),n:tS,icon:'📊'},
        {id:'finance',l:T('المالية','Finance'),n:viewPayments.length,icon:'💰'},
        {id:'log',l:T('السجل','Log'),n:viewLog.length,icon:'📝'},
        {id:'notes',l:T('ملاحظات/مرفقات','Notes'),n:viewAttachments.length,icon:'📎'}
      ]

      return<div onClick={()=>setViewRow(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:16}}><div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(960px,96vw)',height:'min(620px,92vh)',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.5)',border:'1px solid rgba(212,160,23,.15)'}}>
        {/* Header with progress */}
        <div style={{background:'var(--bg)',padding:'16px 22px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',borderBottom:'1px solid rgba(212,160,23,.12)',flexShrink:0}}>
          <div style={{display:'flex',gap:12,alignItems:'center',flex:1}}>
            <div style={{width:44,height:44,borderRadius:12,background:(viewRow.service_color||C.gold)+'15',border:'1.5px solid '+(viewRow.service_color||C.gold)+'25',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:viewRow.service_color||C.gold}}>{viewRow.transaction_number?.split('-').pop()||'#'}</div>
            <div style={{flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4,flexWrap:'wrap'}}>
                <div style={{fontSize:16,fontWeight:800,color:'var(--tx)',direction:'ltr'}}>{viewRow.transaction_number||'—'}</div>
                <Badge v={viewRow.status}/><Badge v={viewRow.priority}/>
                {viewRow.days_remaining!=null&&<span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:5,background:(viewRow.days_remaining<0?C.red:viewRow.days_remaining<=3?'#e67e22':C.ok)+'12',color:viewRow.days_remaining<0?C.red:viewRow.days_remaining<=3?'#e67e22':C.ok}}>SLA: {viewRow.days_remaining<0?viewRow.days_remaining:'+'+viewRow.days_remaining}{T('ي','d')}</span>}
              </div>
              <div style={{fontSize:11,color:viewRow.service_color||C.gold,fontWeight:600}}>{isAr?(viewRow.service_name_ar||viewRow.service_category||''):(viewRow.service_name_en||viewRow.service_code||'')}</div>
              {/* Progress bar in header */}
              {tS>0&&<div style={{display:'flex',alignItems:'center',gap:8,marginTop:6}}>
                <div style={{flex:1,maxWidth:200,height:4,borderRadius:2,background:'rgba(255,255,255,.06)',overflow:'hidden'}}><div style={{height:'100%',width:pP+'%',borderRadius:2,background:pP===100?C.ok:C.gold,transition:'width .5s'}}/></div>
                <span style={{fontSize:10,fontWeight:700,color:pP===100?C.ok:C.gold}}>{cS}/{tS} ({pP}%)</span>
              </div>}
            </div>
          </div>
          <button onClick={()=>setViewRow(null)} style={{width:32,height:32,borderRadius:8,background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>

        <div style={{flex:1,display:'flex',overflow:'hidden'}}>
          {/* Sidebar tabs */}
          <div style={{width:140,background:'var(--bg)',borderLeft:isAr?'none':'1px solid rgba(255,255,255,.04)',borderRight:isAr?'1px solid rgba(255,255,255,.04)':'none',padding:'12px 8px',flexShrink:0}}>
            {vtabs.map(t=><div key={t.id} onClick={()=>setViewTab(t.id)} style={{padding:'10px 10px',borderRadius:8,marginBottom:3,fontSize:10,fontWeight:viewTab===t.id?700:500,color:viewTab===t.id?C.gold:'rgba(255,255,255,.38)',background:viewTab===t.id?'rgba(212,160,23,.08)':'transparent',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',gap:4}}>
              <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{fontSize:12}}>{t.icon}</span>{t.l}</span>
              {t.n!==undefined&&t.n>0&&<span style={{fontSize:9,fontWeight:700,color:viewTab===t.id?C.gold:'rgba(255,255,255,.2)',background:viewTab===t.id?'rgba(212,160,23,.15)':'rgba(255,255,255,.04)',padding:'1px 6px',borderRadius:4}}>{t.n}</span>}
            </div>)}
          </div>

          {/* Tab content */}
          <div className="dash-content" style={{flex:1,overflowY:'auto',padding:'18px 22px'}}>
            {/* ── TAB: البيانات (Enhanced) ── */}
            {viewTab==='info'&&<div>
              {/* Parties section */}
              {(viewRow.client_name||viewRow.facility_name||viewRow.worker_name)&&<div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,color:'var(--tx)',marginBottom:8}}>{T('الأطراف','Parties')}</div>
                <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                  {viewRow.client_name&&<div style={{background:'rgba(212,160,23,.04)',border:'1px solid rgba(212,160,23,.1)',borderRadius:10,padding:'10px 14px',flex:1,minWidth:140}}>
                    <div style={{fontSize:9,color:C.gold,marginBottom:4}}>{T('العميل','Client')}</div>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>{viewRow.client_name}</div>
                    {viewRow.client_phone&&<div style={{fontSize:10,color:'var(--tx5)',marginTop:2,direction:'ltr'}}>{viewRow.client_phone}</div>}
                  </div>}
                  {viewRow.facility_name&&<div style={{background:'rgba(52,131,180,.04)',border:'1px solid rgba(52,131,180,.1)',borderRadius:10,padding:'10px 14px',flex:1,minWidth:140}}>
                    <div style={{fontSize:9,color:C.blue,marginBottom:4}}>{T('المنشأة','Facility')}</div>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>{viewRow.facility_name}</div>
                  </div>}
                  {viewRow.worker_name&&<div style={{background:'rgba(39,160,70,.04)',border:'1px solid rgba(39,160,70,.1)',borderRadius:10,padding:'10px 14px',flex:1,minWidth:140}}>
                    <div style={{fontSize:9,color:C.ok,marginBottom:4}}>{T('العامل','Worker')}</div>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>{viewRow.worker_name}</div>
                  </div>}
                </div>
              </div>}
              {/* Details grid */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <IB l={T('رقم المعاملة','Transaction No.')} v={viewRow.transaction_number} copy icon="🔢"/>
                <IB l={T('الخدمة','Service')} v={isAr?(viewRow.service_name_ar||viewRow.service_category):(viewRow.service_name_en||viewRow.service_code)} icon="📋"/>
                <IB l={T('الحالة','Status')} v={viewRow.status} icon="📌"/>
                <IB l={T('الأولوية','Priority')} v={viewRow.priority} icon="⚡"/>
                <IB l={T('المسؤول','Assigned')} v={viewRow.assigned_name||'—'} icon="👤"/>
                {viewRow.invoice_number&&<IB l={T('الفاتورة','Invoice')} v={viewRow.invoice_number} copy icon="🧾"/>}
                <IB l={T('تاريخ البدء','Start Date')} v={viewRow.start_date?new Date(viewRow.start_date).toLocaleDateString('ar-SA',{year:'numeric',month:'short',day:'numeric'}):'—'} icon="📅"/>
                <IB l={T('تاريخ الاستحقاق','Due Date')} v={viewRow.due_date?new Date(viewRow.due_date).toLocaleDateString('ar-SA',{year:'numeric',month:'short',day:'numeric'}):'—'} icon="⏰"/>
                {viewRow.completed_date&&<IB l={T('تاريخ الإنجاز','Completed')} v={new Date(viewRow.completed_date).toLocaleDateString('ar-SA',{year:'numeric',month:'short',day:'numeric'})} icon="✅"/>}
              </div>
            </div>}

            {/* ── TAB: الخطوات (Timeline) ── */}
            {viewTab==='steps'&&(viewSteps.length>0?<StepTimeline/>:
              <div style={{textAlign:'center',padding:'40px 20px'}}>
                <div style={{fontSize:40,marginBottom:12}}>📭</div>
                <div style={{fontSize:13,fontWeight:600,color:'var(--tx4)',marginBottom:6}}>{T('لا توجد خطوات مربوطة','No steps linked')}</div>
                <div style={{fontSize:11,color:'var(--tx5)',maxWidth:300,margin:'0 auto'}}>{T('هذه المعاملة لم تُربط بقالب — اربطها بخدمة لإنشاء الخطوات تلقائياً','This transaction has no linked template — link to a service to auto-create steps')}</div>
              </div>
            )}

            {/* ── TAB: المالية ── */}
            {viewTab==='finance'&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
              {/* Invoice summary */}
              {viewRow.invoice_number&&<div style={{background:'rgba(212,160,23,.04)',border:'1px solid rgba(212,160,23,.1)',borderRadius:12,padding:14,display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:40,height:40,borderRadius:10,background:C.gold+'15',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🧾</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,color:C.gold}}>{T('الفاتورة المرتبطة','Linked Invoice')}</div>
                  <div style={{fontSize:14,fontWeight:700,color:'var(--tx)'}}>{viewRow.invoice_number}</div>
                </div>
                {viewRow.invoice_amount&&<div style={{textAlign:'center'}}>
                  <div style={{fontSize:16,fontWeight:800,color:C.ok}}>{Number(viewRow.invoice_amount).toLocaleString()}</div>
                  <div style={{fontSize:9,color:'var(--tx5)'}}>{T('ر.س','SAR')}</div>
                </div>}
              </div>}
              {/* External payments */}
              <div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',borderRadius:12,overflow:'hidden'}}>
                <div style={{padding:'10px 14px',borderBottom:'1px solid var(--bd)',fontSize:11,fontWeight:700,color:'var(--tx)',display:'flex',alignItems:'center',gap:6}}>
                  <span>💳</span>{T('المدفوعات الخارجية','External Payments')}
                  {viewPayments.length>0&&<span style={{fontSize:9,fontWeight:600,color:C.gold,background:C.gold+'12',padding:'1px 6px',borderRadius:4}}>{viewPayments.length}</span>}
                </div>
                {viewPayments.length===0?<div style={{padding:20,textAlign:'center',fontSize:10,color:'var(--tx5)'}}>{T('لا توجد مدفوعات خارجية','No external payments')}</div>:
                <div>{viewPayments.map((p,i)=><div key={i} style={{display:'flex',alignItems:'center',padding:'10px 14px',borderBottom:'1px solid var(--bd2)',gap:10}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:p.status==='confirmed'?C.ok:p.status==='pending'?'#e67e22':C.red,flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:600,color:'var(--tx)'}}>{p.payment_to||p.payment_type||'—'}</div>
                    <div style={{fontSize:9,color:'var(--tx5)',marginTop:1}}>{p.payment_date?new Date(p.payment_date).toLocaleDateString('ar-SA',{month:'short',day:'numeric'}):'—'} · {p.payment_method||'—'}{p.reference_number?' · '+p.reference_number:''}</div>
                  </div>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontSize:13,fontWeight:800,color:p.status==='confirmed'?C.ok:'#e67e22'}}>{Number(p.amount||0).toLocaleString()}</div>
                    <div style={{fontSize:8,color:'var(--tx5)'}}>{T('ر.س','SAR')}</div>
                  </div>
                </div>)}</div>}
              </div>
              {/* Total */}
              {viewPayments.length>0&&<div style={{display:'flex',justifyContent:'space-between',padding:'10px 14px',background:'rgba(255,255,255,.02)',borderRadius:10,border:'1px solid rgba(255,255,255,.04)'}}>
                <span style={{fontSize:11,fontWeight:600,color:'var(--tx4)'}}>{T('إجمالي المدفوعات','Total Payments')}</span>
                <span style={{fontSize:13,fontWeight:800,color:C.gold}}>{viewPayments.reduce((s,p)=>s+Number(p.amount||0),0).toLocaleString()} {T('ر.س','SAR')}</span>
              </div>}
            </div>}

            {/* ── TAB: السجل (Activity Log Timeline) ── */}
            {viewTab==='log'&&<div>
              {viewLog.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx5)',fontSize:11}}>{T('لا يوجد سجل تغييرات','No activity log')}</div>:
              <div style={{position:'relative'}}>
                {/* Vertical line */}
                <div style={{position:'absolute',[isAr?'right':'left']:11,top:0,bottom:0,width:2,background:'rgba(255,255,255,.06)'}}/>
                {viewLog.map((log,i)=>{const actClr=log.action==='create'?C.ok:log.action==='update'?C.blue:log.action==='delete'?C.red:C.gold;const userName=users.find(u=>u.id===log.user_id)?.name_ar||'النظام';return<div key={i} style={{display:'flex',gap:12,padding:'8px 0',position:'relative'}}>
                  <div style={{width:24,height:24,borderRadius:'50%',background:actClr+'15',border:'2px solid '+actClr+'40',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,zIndex:1}}>
                    <div style={{width:6,height:6,borderRadius:'50%',background:actClr}}/>
                  </div>
                  <div style={{flex:1,background:'rgba(255,255,255,.02)',borderRadius:10,padding:'10px 14px',border:'1px solid rgba(255,255,255,.03)'}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:10,fontWeight:600,color:actClr}}>{log.action==='create'?T('إنشاء','Create'):log.action==='update'?T('تحديث','Update'):log.action==='delete'?T('حذف','Delete'):(log.action||'—')}</span>
                      <span style={{fontSize:9,color:'var(--tx5)'}}>{new Date(log.created_at).toLocaleDateString('ar-SA',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
                    </div>
                    <div style={{fontSize:11,color:'var(--tx3)'}}>{log.description||'—'}</div>
                    <div style={{fontSize:9,color:'var(--tx5)',marginTop:2}}>{userName}</div>
                  </div>
                </div>})}
              </div>}
            </div>}

            {/* ── TAB: ملاحظات ومرفقات ── */}
            {viewTab==='notes'&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
              {/* Notes */}
              <div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',borderRadius:12,overflow:'hidden'}}>
                <div style={{padding:'10px 14px',borderBottom:'1px solid var(--bd)',fontSize:11,fontWeight:700,color:'var(--tx)',display:'flex',alignItems:'center',gap:6}}>
                  <span>📝</span>{T('الملاحظات','Notes')}
                </div>
                {viewRow.notes?<div style={{padding:16,fontSize:12,lineHeight:2,color:'rgba(255,255,255,.7)'}}>{viewRow.notes}</div>:<div style={{padding:20,textAlign:'center',fontSize:10,color:'var(--tx5)'}}>{T('لا توجد ملاحظات','No notes')}</div>}
              </div>
              {/* Attachments */}
              <div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',borderRadius:12,overflow:'hidden'}}>
                <div style={{padding:'10px 14px',borderBottom:'1px solid var(--bd)',fontSize:11,fontWeight:700,color:'var(--tx)',display:'flex',alignItems:'center',gap:6}}>
                  <span>📎</span>{T('المرفقات','Attachments')}
                  {viewAttachments.length>0&&<span style={{fontSize:9,fontWeight:600,color:C.blue,background:C.blue+'12',padding:'1px 6px',borderRadius:4}}>{viewAttachments.length}</span>}
                </div>
                {viewAttachments.length===0?<div style={{padding:20,textAlign:'center',fontSize:10,color:'var(--tx5)'}}>{T('لا توجد مرفقات','No attachments')}</div>:
                <div style={{padding:10,display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {viewAttachments.map((a,i)=><div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.04)'}}>
                    <div style={{width:32,height:32,borderRadius:6,background:C.blue+'12',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>
                      {(a.file_type||'').includes('pdf')?'📄':(a.file_type||'').includes('image')?'🖼️':'📁'}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:10,fontWeight:600,color:'var(--tx3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.file_name||'—'}</div>
                      <div style={{fontSize:8,color:'var(--tx5)'}}>{a.file_size?(a.file_size/1024).toFixed(0)+' KB':''} {a.category||''}</div>
                    </div>
                    {a.file_url&&<a href={a.file_url} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{width:24,height:24,borderRadius:6,background:'rgba(52,131,180,.08)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </a>}
                  </div>)}
                </div>}
              </div>
            </div>}
          </div>
        </div>
      </div></div>})()}

    {/* Service picker modal */}
    {showServicePicker&&<div onClick={()=>setShowServicePicker(false)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}><div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(700px,95vw)',maxHeight:'85vh',display:'flex',flexDirection:'column',overflow:'hidden',border:'1px solid var(--bd)',boxShadow:'0 20px 48px rgba(0,0,0,.5)'}}><GoldBar/><div style={{padding:'18px 22px',display:'flex',justifyContent:'space-between',alignItems:'center',background:'var(--bg)'}}><div><div style={{fontSize:16,fontWeight:700,color:'var(--tx)'}}>{T('اختر الخدمة','Choose Service')}</div><div style={{fontSize:11,color:'var(--tx4)',marginTop:2}}>{services.length} {T('خدمة متاحة','services')}</div></div><button onClick={()=>setShowServicePicker(false)} style={{width:32,height:32,borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button></div><div style={{flex:1,overflowY:'auto',padding:'12px 22px 22px'}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>{services.map(s=><div key={s.id} onClick={()=>{setSelectedService(s);setShowServicePicker(false);setCreateForm({client_id:'',facility_id:'',worker_id:'',assigned_to:'',notes:'',transaction_type:'client_transaction'})}} style={{padding:14,borderRadius:12,cursor:'pointer',background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.04)',transition:'.2s'}} onMouseEnter={e=>{e.currentTarget.style.background=(s.color||C.gold)+'08';e.currentTarget.style.borderColor=(s.color||C.gold)+'20'}} onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.02)';e.currentTarget.style.borderColor='rgba(255,255,255,.04)'}}><div style={{display:'flex',alignItems:'center',gap:10}}><div style={{width:36,height:36,borderRadius:8,background:(s.color||C.gold)+'15',border:'1px solid '+(s.color||C.gold)+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>📋</div><div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:700,color:'var(--tx2)'}}>{isAr?s.name_ar:(s.name_en||s.name_ar)}</div><div style={{display:'flex',gap:6,marginTop:3}}><span style={{fontSize:9,padding:'1px 5px',borderRadius:3,background:(s.color||C.gold)+'12',color:s.color||C.gold}}>{s.code}</span><span style={{fontSize:9,color:'var(--tx5)'}}>{s.expected_sla_days||14} {T('يوم','d')}</span>{s.default_price>0&&<span style={{fontSize:9,color:C.ok}}>{s.default_price} {T('ر.س','SAR')}</span>}</div></div></div></div>)}</div></div></div></div>}

    {/* Create form modal */}
    {createForm&&selectedService&&<div onClick={()=>{setCreateForm(null);setSelectedService(null)}} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1001,padding:16}}><div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(540px,95vw)',display:'flex',flexDirection:'column',overflow:'hidden',border:'1px solid var(--bd)',boxShadow:'0 20px 48px rgba(0,0,0,.5)'}}><div style={{height:3,background:'linear-gradient(90deg,transparent,'+(selectedService.color||C.gold)+' 30%,transparent)'}}/><div style={{padding:'16px 22px',display:'flex',justifyContent:'space-between',alignItems:'center',background:'var(--bg)',borderBottom:'1px solid var(--bd)'}}><div><div style={{fontSize:15,fontWeight:700,color:'var(--tx)'}}>{T('معاملة جديدة','New Transaction')}</div><div style={{fontSize:11,color:selectedService.color||C.gold,fontWeight:600,marginTop:1}}>{isAr?selectedService.name_ar:(selectedService.name_en||selectedService.name_ar)}</div></div><button onClick={()=>{setCreateForm(null);setSelectedService(null)}} style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button></div><div style={{padding:'16px 22px'}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>{selectedService.requires_client&&<div><div style={{fontSize:12,fontWeight:600,color:'var(--tx3)',marginBottom:5}}>{T('العميل','Client')} <span style={{color:C.red}}>*</span></div><select value={createForm.client_id} onChange={e=>setCreateForm(p=>({...p,client_id:e.target.value}))} style={baseInput}><option value="">{T('— اختر —','— Select —')}</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name_ar}</option>)}</select></div>}{selectedService.requires_facility&&<div><div style={{fontSize:12,fontWeight:600,color:'var(--tx3)',marginBottom:5}}>{T('المنشأة','Facility')} <span style={{color:C.red}}>*</span></div><select value={createForm.facility_id} onChange={e=>setCreateForm(p=>({...p,facility_id:e.target.value}))} style={baseInput}><option value="">{T('— اختر —','— Select —')}</option>{facilities.map(f=><option key={f.id} value={f.id}>{f.name_ar}</option>)}</select></div>}{selectedService.requires_worker&&<div><div style={{fontSize:12,fontWeight:600,color:'var(--tx3)',marginBottom:5}}>{T('العامل','Worker')}</div><select value={createForm.worker_id} onChange={e=>setCreateForm(p=>({...p,worker_id:e.target.value}))} style={baseInput}><option value="">{T('— اختر —','— Select —')}</option>{workers.map(w=><option key={w.id} value={w.id}>{w.name_ar}</option>)}</select></div>}<div><div style={{fontSize:12,fontWeight:600,color:'var(--tx3)',marginBottom:5}}>{T('المسؤول','Assigned')}</div><select value={createForm.assigned_to} onChange={e=>setCreateForm(p=>({...p,assigned_to:e.target.value}))} style={baseInput}><option value="">{T('— اختر —','— Select —')}</option>{users.map(u=><option key={u.id} value={u.id}>{u.name_ar}</option>)}</select></div><div style={{gridColumn:'1/-1'}}><div style={{fontSize:12,fontWeight:600,color:'var(--tx3)',marginBottom:5}}>{T('ملاحظات','Notes')}</div><textarea value={createForm.notes} onChange={e=>setCreateForm(p=>({...p,notes:e.target.value}))} rows={2} style={{...baseInput,height:'auto',padding:12,resize:'vertical',textAlign:isAr?'right':'left'}}/></div></div></div><div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',flexDirection:'row-reverse'}}><button onClick={()=>createTransaction(selectedService,createForm)} style={{height:42,minWidth:150,padding:'0 22px',borderRadius:10,border:'1px solid '+(selectedService.color||C.gold)+'30',background:(selectedService.color||C.gold)+'12',color:selectedService.color||C.gold,fontFamily:F,fontSize:13,fontWeight:700,cursor:'pointer'}}>{T('⚡ إنشاء المعاملة','⚡ Create')}</button><button onClick={()=>{setCreateForm(null);setSelectedService(null)}} style={{height:42,padding:'0 18px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer'}}>{T('إلغاء','Cancel')}</button></div></div></div>}
  </div>
}
