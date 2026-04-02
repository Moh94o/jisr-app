import React,{useState,useEffect,useCallback} from 'react'
const F="'Cairo',sans-serif"
const C={dk:'#171717',fm:'#1e1e1e',gold:'#c9a84c',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}
const fS={width:'100%',height:42,padding:'0 14px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:F,fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',background:'rgba(255,255,255,.07)',textAlign:'center'}
const bS={height:36,padding:'0 16px',borderRadius:8,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.12)',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5}
const sMap={completed:C.ok,in_progress:C.blue,pending:C.gold,draft:'#999',cancelled:C.red,issue:C.red,urgent:C.red,high:'#e67e22',normal:C.blue,low:'#999'}
const Badge=({v})=>{const cl=sMap[v]||'#999';return<span style={{fontSize:10,fontWeight:600,padding:'3px 8px',borderRadius:6,background:cl+'15',color:cl,display:'inline-flex',alignItems:'center',gap:3}}><span style={{width:4,height:4,borderRadius:'50%',background:cl}}/>{v||'—'}</span>}
const EditBtn=({onClick})=><button onClick={e=>{e.stopPropagation();onClick()}} style={{width:28,height:28,borderRadius:7,border:'1px solid rgba(201,168,76,.15)',background:'rgba(201,168,76,.08)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="1.8"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>
const DelBtn=({onClick})=><button onClick={e=>{e.stopPropagation();onClick()}} style={{width:28,height:28,borderRadius:7,border:'1px solid rgba(192,57,43,.12)',background:'rgba(192,57,43,.04)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>

export default function TransactionsPage({sb,toast,user,lang,onTabChange}){
const isAr=lang!=='en'
const T=(a,e)=>isAr?a:e
const[tab,setTab]=useState('all')
const[data,setData]=useState([])
const[steps,setSteps]=useState([])
const[loading,setLoading]=useState(false)
const[pop,setPop]=useState(null)
const[form,setForm]=useState({})
const[saving,setSaving]=useState(false)
const[viewRow,setViewRow]=useState(null)
const[viewTab,setViewTab]=useState('info')
const[q,setQ]=useState('')
const[statusFilter,setStatusFilter]=useState('all')
const[assignFilter,setAssignFilter]=useState('all')
const[escPop,setEscPop]=useState(null);const[escReason,setEscReason]=useState('')
const escalateTxn=async(txnId)=>{if(!escReason.trim()){toast(T('اكتب سبب التصعيد','Enter reason'));return}
try{const{data:sup}=await sb.from('users').select('id,roles:role_id(escalation_level)').is('deleted_at',null);const toUser=sup?.find(s=>s.roles?.escalation_level>=3)
await sb.from('escalations').insert({entity_type:'transaction',entity_id:txnId,from_user_id:user?.id,to_user_id:toUser?.id||null,reason:escReason,priority:'high',created_by:user?.id})
if(toUser?.id){await sb.from('employee_notifications').insert({user_id:toUser.id,type:'escalation',title:'تصعيد معاملة',body:escReason,priority:'high',entity_type:'transaction',entity_id:txnId})}
toast(T('تم التصعيد بنجاح','Escalated'));setEscPop(null);setEscReason('')}catch(e){toast('خطأ')}}
const[users,setUsers]=useState([])
const[clients,setClients]=useState([])
const[facilities,setFacilities]=useState([])
const[templates,setTemplates]=useState([])
const[selected,setSelected]=useState([])
const[showTemplates,setShowTemplates]=useState(false)

useEffect(()=>{onTabChange&&onTabChange({tab})},[tab])

const load=useCallback(async()=>{
setLoading(true)
const[d,s,u,cl,fc,tmpl]=await Promise.all([
sb.from('v_transaction_sla').select('*').order('due_date'),
sb.from('transaction_steps').select('*').order('step_order'),
sb.from('users').select('id,name_ar').is('deleted_at',null),
sb.from('clients').select('id,name_ar,phone').is('deleted_at',null),
sb.from('facilities').select('id,name_ar').is('deleted_at',null),
sb.from('transaction_templates').select('*').eq('is_active',true).order('sort_order')
])
setData(d.data||[]);setSteps(s.data||[]);setUsers(u.data||[]);setClients(cl.data||[]);setFacilities(fc.data||[]);setTemplates(tmpl.data||[]);setLoading(false)
},[sb])
useEffect(()=>{load()},[load])

// Create from template
const createFromTemplate=async(tmpl)=>{
try{
const txnNum='TXN-'+new Date().getFullYear()+'-'+String(data.length+1).padStart(4,'0')
const dueDate=new Date();dueDate.setDate(dueDate.getDate()+14)
const{data:newTxn,error}=await sb.from('transactions').insert({
transaction_number:txnNum,transaction_type:tmpl.transaction_type,service_category:tmpl.service_category||'OTHER',
status:'pending',priority:'normal',start_date:new Date().toISOString().slice(0,10),
due_date:dueDate.toISOString().slice(0,10),created_by:user?.id
}).select().single()
if(error)throw error
// Auto-create steps from template sub_services
const{data:tss}=await sb.from('template_sub_services').select('*,sub_services:sub_service_id(name_ar,name_en)').eq('template_id',tmpl.id).order('sort_order')
if(tss&&tss.length>0){const stepsToInsert=tss.map((ts,i)=>({
transaction_id:newTxn.id,step_order:i+1,step_name_ar:ts.sub_services?.name_ar||'خطوة '+(i+1),
step_name_en:ts.sub_services?.name_en||'Step '+(i+1),status:'pending',
sub_service_id:ts.sub_service_id,created_by:user?.id
}));await sb.from('transaction_steps').insert(stepsToInsert)}
toast(T('تم إنشاء المعاملة من القالب ✓','Transaction created from template ✓'));setShowTemplates(false);load()
}catch(e){toast('خطأ: '+e.message?.slice(0,80))}
}

// Bulk update
const bulkUpdate=async(newStatus)=>{if(selected.length===0)return
if(!confirm(T('تحديث '+selected.length+' معاملة؟','Update '+selected.length+' transactions?')))return
try{await sb.from('transactions').update({status:newStatus,updated_by:user?.id,updated_at:new Date().toISOString(),...(newStatus==='completed'?{completed_date:new Date().toISOString().slice(0,10)}:{})}).in('id',selected)
toast(T('تم تحديث '+selected.length+' معاملة','Updated '+selected.length));setSelected([]);load()}catch(e){toast('خطأ')}
}

// WhatsApp overdue
const sendOverdueWhatsApp=(r)=>{if(!r.client_phone)return toast(T('لا يوجد رقم جوال للعميل','No client phone'));const ph=r.client_phone.replace(/\D/g,'').replace(/^0/,'966');const msg=encodeURIComponent('السلام عليكم '+(r.client_name||'')+'\n\nمعاملتكم رقم: '+(r.transaction_number||'')+' متأخرة عن الموعد المحدد.\nنعمل على إنجازها في أقرب وقت.\n\nجسر للأعمال');window.open('https://wa.me/'+ph+'?text='+msg,'_blank');sb.from('whatsapp_log').insert({phone:ph,client_id:r.client_id,event_type:'transaction_overdue',message_ar:'تنبيه تأخر معاملة '+(r.transaction_number||''),entity_id:r.id,sent_by:user?.id})}

// Print
const printTxn=(r)=>{const txSteps=steps.filter(s=>s.transaction_id===r.id).sort((a,b)=>a.step_order-b.step_order);const w=window.open('','_blank');w.document.write('<html dir="rtl"><head><style>body{font-family:Cairo,sans-serif;padding:40px;color:#333}h1{font-size:20px;border-bottom:2px solid #c9a84c;padding-bottom:10px}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border:1px solid #ddd;padding:8px;text-align:right;font-size:12px}th{background:#f5f5f5}.gold{color:#c9a84c}.green{color:#27a046}.red{color:#c0392b}</style></head><body>');w.document.write('<h1>معاملة: '+r.transaction_number+'</h1>');w.document.write('<table><tr><th>الحالة</th><td>'+r.status+'</td><th>الخدمة</th><td>'+(r.service_category||'')+'</td></tr><tr><th>العميل</th><td>'+(r.client_name||'—')+'</td><th>المنشأة</th><td>'+(r.facility_name||'—')+'</td></tr><tr><th>البدء</th><td>'+(r.start_date||'—')+'</td><th>الاستحقاق</th><td>'+(r.due_date||'—')+'</td></tr></table>');if(txSteps.length>0){w.document.write('<h2>الخطوات</h2><table><tr><th>#</th><th>الخطوة</th><th>الحالة</th></tr>');txSteps.forEach(s=>{w.document.write('<tr><td>'+s.step_order+'</td><td>'+s.step_name_ar+'</td><td class="'+(s.status==='completed'?'green':s.status==='issue'?'red':'')+'">'+s.status+'</td></tr>')});w.document.write('</table>')}w.document.write('<p style="margin-top:30px;font-size:10px;color:#999">طُبع بتاريخ: '+new Date().toLocaleDateString('ar-SA')+'  —  جسر للأعمال</p></body></html>');w.document.close();w.print()}

const save=async()=>{setSaving(true);try{const d={...form};const id=d._id;delete d._id;const wasCompleted=d.status==='completed';Object.keys(d).forEach(k=>{if(d[k]==='')d[k]=null})
if(id){d.updated_by=user?.id;const{error}=await sb.from('transactions').update(d).eq('id',id);if(error)throw error;toast(T('تم التعديل','Updated'))
if(wasCompleted){const{data:txn}=await sb.from('transactions').select('*,clients:client_id(name_ar,phone)').eq('id',id).single()
if(txn?.clients?.phone){const ph=txn.clients.phone.replace(/\D/g,'').replace(/^0/,'966');if(confirm(T('إرسال واتساب للعميل بإنجاز المعاملة؟','Send WhatsApp to client?'))){const msg=encodeURIComponent('السلام عليكم '+txn.clients.name_ar+'\n\n✅ تم إنجاز معاملتكم رقم: '+(txn.transaction_number||'')+'\nالنوع: '+(txn.transaction_type||'')+'\n\nشكراً لكم — جسر للأعمال');window.open('https://wa.me/'+ph+'?text='+msg,'_blank');sb.from('whatsapp_log').insert({phone:ph,client_id:txn.client_id,event_type:'transaction_completed',message_ar:'إنجاز معاملة '+(txn.transaction_number||''),entity_id:id,sent_by:user?.id}).then(()=>{})}}}}
else{d.created_by=user?.id;const{error}=await sb.from('transactions').insert(d);if(error)throw error;toast(T('تمت الإضافة','Added'))}
setPop(null);load()}catch(e){toast('خطأ: '+e.message?.slice(0,80))}setSaving(false)}
const del=async id=>{if(!confirm(T('حذف؟','Delete?')))return;await sb.from('transactions').update({deleted_at:new Date().toISOString()}).eq('id',id);toast(T('تم الحذف','Deleted'));load()}

const tabs=[{id:'all',l:'الكل',le:'All'},{id:'PERM_VISA',l:'تأشيرة دائمة',le:'Perm Visa'},{id:'TEMP_VISA',l:'تأشيرة مؤقتة',le:'Temp Visa'},{id:'IQAMA_NEW',l:'إصدار إقامة',le:'New Iqama'},{id:'TRANSFER',l:'نقل كفالة',le:'Transfer'},{id:'TRANSFER_RENEW',l:'نقل+تجديد',le:'Transfer+Renew'},{id:'IQAMA_RENEW',l:'تجديد إقامة',le:'Iqama Renew'},{id:'AJEER',l:'أجير',le:'Ajeer'},{id:'SAUDIZATION',l:'السعودة',le:'Saudization'},{id:'OTHER',l:'أخرى',le:'Other'}]
const catLabels={PERM_VISA:T('تأشيرة دائمة','Perm Visa'),TEMP_VISA:T('تأشيرة مؤقتة','Temp Visa'),IQAMA_NEW:T('إصدار إقامة','New Iqama'),TRANSFER:T('نقل كفالة','Transfer'),TRANSFER_RENEW:T('نقل+تجديد','Transfer+Renew'),IQAMA_RENEW:T('تجديد إقامة','Iqama Renew'),AJEER:T('أجير','Ajeer'),SAUDIZATION:T('السعودة','Saudization'),OTHER:T('أخرى','Other')}
const cardS={background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:12,overflow:'hidden'}
const thS={padding:'10px 14px',textAlign:isAr?'right':'left',fontSize:10,fontWeight:600,color:'var(--tx5)'}
const tdS={padding:'10px 14px',fontSize:12,fontWeight:600,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}

const tFields=[
{k:'transaction_number',l:T('رقم المعاملة','Transaction No.'),d:1},
{k:'transaction_type',l:T('النوع','Type'),opts:[{v:'client_transaction',l:T('عميل','Client')},{v:'internal_task',l:T('داخلية','Internal')}],r:1},
{k:'service_category',l:T('تصنيف الخدمة','Service Category'),opts:Object.entries(catLabels).map(([v,l])=>({v,l})),r:1},
{k:'status',l:T('الحالة','Status'),opts:[{v:'draft',l:T('مسودة','Draft')},{v:'pending',l:T('معلّقة','Pending')},{v:'in_progress',l:T('جارية','Active')},{v:'completed',l:T('مكتملة','Done')},{v:'cancelled',l:T('ملغية','Cancelled')}],r:1},
{k:'priority',l:T('الأولوية','Priority'),opts:[{v:'low',l:T('منخفضة','Low')},{v:'normal',l:T('عادية','Normal')},{v:'high',l:T('عالية','High')},{v:'urgent',l:T('عاجلة','Urgent')}]},
{k:'client_id',l:T('العميل','Client'),opts:clients.map(c=>({v:c.id,l:c.name_ar}))},
{k:'facility_id',l:T('المنشأة','Facility'),opts:facilities.map(f=>({v:f.id,l:f.name_ar}))},
{k:'assigned_to',l:T('المسؤول','Assigned To'),opts:users.map(u=>({v:u.id,l:u.name_ar}))},
{k:'start_date',l:T('تاريخ البدء','Start Date'),t:'date'},
{k:'due_date',l:T('تاريخ الاستحقاق','Due Date'),t:'date'},
{k:'completed_date',l:T('تاريخ الإنجاز','Completed Date'),t:'date'},
{k:'notes',l:T('ملاحظات','Notes'),w:1},
{k:'parent_transaction_id',l:T('معاملة سابقة (اختياري)','Parent Transaction'),opts:data.filter(d=>d.id!==form._id).map(d=>({v:d.id,l:d.transaction_number+' — '+(catLabels[d.service_category]||d.service_category||'')}))}
]
const openAdd=()=>{const init={};tFields.forEach(f=>init[f.k]='');if(tab!=='all')init.service_category=tab;init.status='pending';init.priority='normal';setForm(init);setPop('add')}
const openEdit=r=>{const init={_id:r.id};tFields.forEach(f=>init[f.k]=r[f.k]??'');setForm(init);setPop('edit')}

const filtered=data.filter(r=>{
if(tab!=='all'&&r.service_category!==tab)return false
if(statusFilter!=='all'&&r.status!==statusFilter)return false
if(assignFilter!=='all'&&r.assigned_to!==assignFilter)return false
if(q){const s=q.toLowerCase();return(r.transaction_number||'').toLowerCase().includes(s)||(r.client_name||'').includes(s)||(r.facility_name||'').includes(s)||(r.worker_name||'').includes(s)}
return true
})

const totalC=filtered.length,doneC=filtered.filter(r=>r.status==='completed').length,activeC=filtered.filter(r=>r.status==='in_progress').length,overdueC=filtered.filter(r=>r.sla_status==='overdue'||r.sla_status==='critical').length,avgDays=filtered.filter(r=>r.completion_days).length>0?Math.round(filtered.filter(r=>r.completion_days).reduce((s,r)=>s+r.completion_days,0)/filtered.filter(r=>r.completion_days).length):0
const fBtnS=a=>({padding:'5px 12px',borderRadius:6,fontSize:10,fontWeight:a?700:500,color:a?C.gold:'rgba(255,255,255,.4)',background:a?'rgba(201,168,76,.08)':'transparent',border:a?'1px solid rgba(201,168,76,.15)':'1px solid rgba(255,255,255,.06)',cursor:'pointer'})

return<div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
<div><div style={{fontSize:20,fontWeight:700,color:'rgba(255,255,255,.93)'}}>{T('المعاملات','Transactions')}</div><div style={{fontSize:12,color:'var(--tx4)',marginTop:6}}>{T('إدارة جميع المعاملات','Manage all transactions')}</div></div>
<div style={{display:'flex',gap:6}}>
<div style={{position:'relative'}}>
<button onClick={()=>setShowTemplates(!showTemplates)} style={{...bS,background:'rgba(52,131,180,.1)',border:'1px solid rgba(52,131,180,.2)',color:C.blue}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>{T('من قالب','From Template')}</button>
{showTemplates&&<><div onClick={()=>setShowTemplates(false)} style={{position:'fixed',inset:0,zIndex:98}}/>
<div style={{position:'absolute',top:'calc(100% + 4px)',[isAr?'right':'left']:0,width:320,background:'#252525',border:'1px solid rgba(255,255,255,.12)',borderRadius:12,boxShadow:'0 12px 36px rgba(0,0,0,.5)',zIndex:99,maxHeight:400,overflowY:'auto',padding:6}}>
<div style={{padding:'8px 12px',fontSize:12,fontWeight:700,color:C.gold,borderBottom:'1px solid rgba(255,255,255,.06)',marginBottom:4}}>{T('اختر قالب المعاملة','Choose Template')}</div>
{templates.map(t=><div key={t.id} onClick={()=>createFromTemplate(t)} style={{padding:'10px 14px',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',gap:10,marginBottom:2}} onMouseEnter={e=>e.currentTarget.style.background='rgba(201,168,76,.06)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
<div style={{width:32,height:32,borderRadius:8,background:'rgba(52,131,180,.08)',border:'1px solid rgba(52,131,180,.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 10h8M8 14h5"/></svg></div>
<div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,color:'var(--tx2)'}}>{t.name_ar}</div>
<div style={{fontSize:9,color:'var(--tx5)',marginTop:2}}>{t.service_category||t.transaction_type}</div>
</div></div>)}
</div></>}
</div>
<button onClick={openAdd} style={bS}>+ {T('معاملة يدوية','Manual')}</button>
</div>
</div>

{/* Bulk action bar */}
{selected.length>0&&<div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 16px',borderRadius:10,background:'rgba(201,168,76,.06)',border:'1px solid rgba(201,168,76,.12)',marginBottom:14}}>
<span style={{fontSize:12,fontWeight:700,color:C.gold}}>{selected.length} {T('محددة','selected')}</span>
<div style={{flex:1}}/>
<button onClick={()=>bulkUpdate('completed')} style={{height:30,padding:'0 12px',borderRadius:6,border:'1px solid rgba(39,160,70,.2)',background:'rgba(39,160,70,.08)',color:C.ok,fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer'}}>{T('إنجاز الكل','Complete All')}</button>
<button onClick={()=>bulkUpdate('cancelled')} style={{height:30,padding:'0 12px',borderRadius:6,border:'1px solid rgba(192,57,43,.2)',background:'rgba(192,57,43,.06)',color:C.red,fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer'}}>{T('إلغاء الكل','Cancel All')}</button>
<button onClick={()=>setSelected([])} style={{height:30,padding:'0 10px',borderRadius:6,border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.04)',color:'var(--tx4)',fontFamily:F,fontSize:10,cursor:'pointer'}}>✕</button>
</div>}

{/* Stats */}
<div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:18}}>
<div style={{padding:'14px',borderRadius:12,background:'rgba(201,168,76,.06)',border:'1px solid rgba(201,168,76,.1)'}}><div style={{fontSize:9,color:C.gold,opacity:.7,marginBottom:4}}>{T('الإجمالي','Total')}</div><div style={{fontSize:24,fontWeight:800,color:C.gold}}>{totalC}</div></div>
<div style={{padding:'14px',borderRadius:12,background:'rgba(52,131,180,.06)',border:'1px solid rgba(52,131,180,.1)'}}><div style={{fontSize:9,color:C.blue,opacity:.7,marginBottom:4}}>{T('جارية','Active')}</div><div style={{fontSize:24,fontWeight:800,color:C.blue}}>{activeC}</div></div>
<div style={{padding:'14px',borderRadius:12,background:'rgba(39,160,70,.06)',border:'1px solid rgba(39,160,70,.1)'}}><div style={{fontSize:9,color:C.ok,opacity:.7,marginBottom:4}}>{T('مكتملة','Done')}</div><div style={{fontSize:24,fontWeight:800,color:C.ok}}>{doneC}</div></div>
<div style={{padding:'14px',borderRadius:12,background:'rgba(192,57,43,.06)',border:'1px solid rgba(192,57,43,.1)'}}><div style={{fontSize:9,color:C.red,opacity:.7,marginBottom:4}}>{T('متأخرة','Overdue')}</div><div style={{fontSize:24,fontWeight:800,color:C.red}}>{overdueC}</div></div>
<div style={{padding:'14px',borderRadius:12,background:'rgba(155,89,182,.06)',border:'1px solid rgba(155,89,182,.1)'}}><div style={{fontSize:9,color:'#9b59b6',opacity:.7,marginBottom:4}}>{T('متوسط أيام','Avg Days')}</div><div style={{fontSize:24,fontWeight:800,color:'#9b59b6'}}>{avgDays}</div></div>
</div>

{/* Tabs */}
<div style={{display:'flex',gap:0,marginBottom:16,borderBottom:'1px solid var(--bd)',overflowX:'auto',scrollbarWidth:'thin'}}>
{tabs.map(t=><div key={t.id} onClick={()=>{setTab(t.id);setQ('')}} style={{padding:'10px 14px',fontSize:11,fontWeight:tab===t.id?700:500,color:tab===t.id?C.gold:'rgba(255,255,255,.42)',borderBottom:tab===t.id?'2px solid '+C.gold:'2px solid transparent',cursor:'pointer',whiteSpace:'nowrap'}}>{isAr?t.l:t.le}</div>)}
</div>

{/* Filters row */}
<div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
<input value={q} onChange={e=>setQ(e.target.value)} placeholder={T('بحث بالرقم أو العميل أو المنشأة ...','Search ...')} style={{flex:1,minWidth:200,height:36,padding:'0 14px',border:'1.5px solid rgba(255,255,255,.08)',borderRadius:8,fontFamily:F,fontSize:11,color:'var(--tx)',background:'rgba(255,255,255,.04)',outline:'none'}}/>
<div style={{display:'flex',gap:3}}>{[{v:'all',l:T('الكل','All')},{v:'in_progress',l:T('جارية','Active')},{v:'completed',l:T('مكتملة','Done')},{v:'issue',l:T('مشكلة','Issue')}].map(f=><div key={f.v} onClick={()=>setStatusFilter(f.v)} style={fBtnS(statusFilter===f.v)}>{f.l}</div>)}</div>
<select value={assignFilter} onChange={e=>setAssignFilter(e.target.value)} style={{height:36,padding:'0 10px',borderRadius:8,border:'1px solid var(--bd)',background:'rgba(255,255,255,.04)',color:'rgba(255,255,255,.6)',fontFamily:F,fontSize:10,outline:'none',cursor:'pointer'}}>
<option value="all">{T('كل الموظفين','All Staff')}</option>
{users.map(u=><option key={u.id} value={u.id}>{u.name_ar}</option>)}
</select>
<div style={{fontSize:10,color:'var(--tx5)'}}>{filtered.length} {T('معاملة','txn')}</div>
</div>

{/* Table */}
{loading?<div style={{textAlign:'center',padding:50,color:'var(--tx5)'}}>...</div>:
<div style={cardS}><table style={{width:'100%',borderCollapse:'collapse',fontFamily:F}}>
<thead><tr style={{background:'rgba(255,255,255,.04)',borderBottom:'1px solid var(--bd)'}}>
<th style={{...thS,width:36}}><input type="checkbox" checked={selected.length===filtered.length&&filtered.length>0} onChange={()=>setSelected(selected.length===filtered.length?[]:filtered.map(r=>r.id))} style={{cursor:'pointer'}}/></th>
<th style={thS}>{T('الرقم','No.')}</th><th style={thS}>{T('الخدمة','Service')}</th><th style={thS}>{T('العميل/المنشأة','Client/Fac.')}</th><th style={thS}>{T('الحالة','Status')}</th><th style={thS}>{T('التقدم','Progress')}</th><th style={thS}>{T('SLA','SLA')}</th><th style={thS}>{T('المسؤول','Staff')}</th><th style={{...thS,width:80}}></th>
</tr></thead>
<tbody>{filtered.length===0?<tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'var(--tx6)'}}>{T('لا توجد بيانات','No data')}</td></tr>:
filtered.map(r=>{const slaC={on_time:C.ok,warning:'#e67e22',critical:C.red,overdue:C.red,done:'#999',no_deadline:'#666'}[r.sla_status]||'#999';const isSel=selected.includes(r.id);return<tr key={r.id} onClick={()=>{setViewRow(r);setViewTab('info')}} style={{borderBottom:'1px solid rgba(255,255,255,.025)',cursor:'pointer',background:isSel?'rgba(201,168,76,.04)':'transparent'}} onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background='rgba(201,168,76,.03)'}} onMouseLeave={e=>{if(!isSel)e.currentTarget.style.background='transparent'}}>
<td style={{padding:'8px 14px'}} onClick={e=>e.stopPropagation()}><input type="checkbox" checked={isSel} onChange={()=>setSelected(p=>isSel?p.filter(x=>x!==r.id):[...p,r.id])} style={{cursor:'pointer'}}/></td>
<td style={{...tdS,color:C.gold,fontWeight:700}}>{r.transaction_number||'—'}</td>
<td style={tdS}><span style={{fontSize:9,padding:'2px 6px',borderRadius:4,background:'rgba(201,168,76,.08)',color:C.gold}}>{catLabels[r.service_category]||r.service_category||'—'}</span></td>
<td style={tdS}><div style={{fontSize:11,color:'var(--tx3)'}}>{r.client_name||'—'}</div><div style={{fontSize:9,color:'var(--tx5)'}}>{r.facility_name||''}</div></td>
<td style={tdS}><Badge v={r.status}/></td>
<td style={{...tdS,width:100}}>{r.total_steps>0?<div style={{display:'flex',alignItems:'center',gap:4}}><div style={{flex:1,height:4,borderRadius:2,background:'rgba(255,255,255,.06)',overflow:'hidden'}}><div style={{height:'100%',width:(r.steps_pct||0)+'%',borderRadius:2,background:r.steps_pct>=100?C.ok:C.gold}}/></div><span style={{fontSize:9,color:'var(--tx5)',minWidth:24}}>{r.steps_pct||0}%</span></div>:<span style={{fontSize:9,color:'var(--tx6)'}}>—</span>}</td>
<td style={tdS}><div style={{display:'flex',alignItems:'center',gap:4}}>{r.days_remaining!=null?<span style={{fontSize:10,fontWeight:700,color:slaC}}>{r.days_remaining<0?r.days_remaining+T('ي','d'):r.days_remaining===0?T('اليوم','Today'):'+'+r.days_remaining+T('ي','d')}</span>:<span style={{fontSize:9,color:'var(--tx6)'}}>—</span>}
{(r.sla_status==='overdue'||r.sla_status==='critical')&&r.client_phone&&<span onClick={e=>{e.stopPropagation();sendOverdueWhatsApp(r)}} title={T('تنبيه واتساب','WhatsApp Alert')} style={{width:16,height:16,borderRadius:4,background:'rgba(39,160,70,.1)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0}}>
<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#27a046" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72"/></svg></span>}
</div></td>
<td style={{...tdS,fontSize:10,color:'var(--tx4)'}}>{r.assigned_name||<span style={{color:'var(--tx6)'}}>—</span>}</td>
<td style={{padding:'8px',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
<div style={{display:'flex',gap:3,justifyContent:'center'}}>
<div onClick={()=>setEscPop(r.id)} style={{width:28,height:28,borderRadius:7,border:'1px solid rgba(230,126,34,.12)',background:'rgba(230,126,34,.04)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}} title={T('تصعيد','Escalate')}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#e67e22" strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg></div>
<EditBtn onClick={()=>openEdit(r)}/><DelBtn onClick={()=>del(r.id)}/></div></td>
</tr>})}</tbody></table></div>}

{viewRow&&(()=>{
const IB=({l,v,copy})=><div style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'14px 16px',border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:9,color:'var(--tx5)',marginBottom:6}}>{l}</div><div style={{display:'flex',alignItems:'center',gap:6}}><div style={{fontSize:14,fontWeight:700,color:sMap[v]?sMap[v]:'rgba(255,255,255,.85)',direction:copy?'ltr':'inherit'}}>{sMap[v]?<Badge v={v}/>:(v||'\u2014')}</div>{copy&&v&&<button onClick={e=>{e.stopPropagation();navigator.clipboard.writeText(String(v));toast(T('\u062a\u0645 \u0627\u0644\u0646\u0633\u062e','Copied'))}} style={{width:20,height:20,borderRadius:5,border:'none',background:'rgba(255,255,255,.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>}</div></div>
const txSteps=steps.filter(s=>s.transaction_id===viewRow.id).sort((a,b)=>a.step_order-b.step_order);const completedSteps=txSteps.filter(s=>s.status==='completed').length;const totalSteps=txSteps.length;const progressPct=totalSteps>0?Math.round(completedSteps/totalSteps*100):0
const vtabs=[{id:'info',l:T('\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a','Info')},{id:'steps',l:T('\u0627\u0644\u062e\u0637\u0648\u0627\u062a','Steps'),n:totalSteps},{id:'dates',l:T('\u0627\u0644\u062a\u0648\u0627\u0631\u064a\u062e','Dates')},{id:'notes',l:T('\u0645\u0644\u0627\u062d\u0638\u0627\u062a','Notes')}]
const stClr=sMap[viewRow.status]||'#999';const prClr=sMap[viewRow.priority]||'#999'
return<div onClick={()=>setViewRow(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(820px,95vw)',height:'min(480px,85vh)',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.5)',border:'1px solid rgba(201,168,76,.15)'}}>
<div style={{background:'var(--bg)',padding:'18px 24px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',borderBottom:'1px solid rgba(201,168,76,.12)',flexShrink:0}}>
<div style={{display:'flex',gap:12,alignItems:'center'}}><div style={{width:48,height:48,borderRadius:14,background:stClr+'15',border:'1.5px solid '+stClr+'25',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:stClr,textAlign:'center'}}>{viewRow.transaction_number?.split('-').pop()||'#'}</div><div><div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}><div style={{fontSize:16,fontWeight:800,color:'var(--tx)',direction:'ltr'}}>{viewRow.transaction_number||'\u2014'}</div><Badge v={viewRow.status}/><Badge v={viewRow.priority}/></div><div style={{fontSize:11,color:'var(--tx4)'}}><Badge v={viewRow.transaction_type}/></div></div></div>
<div style={{display:'flex',gap:6}}><button onClick={()=>printTxn(viewRow)} style={{height:32,padding:'0 12px',borderRadius:8,border:'1px solid rgba(52,131,180,.15)',background:'rgba(52,131,180,.06)',color:C.blue,fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>{T('طباعة','Print')}</button>
{viewRow.client_phone&&viewRow.sla_status==='overdue'&&<button onClick={()=>sendOverdueWhatsApp(viewRow)} style={{height:32,padding:'0 12px',borderRadius:8,border:'1px solid rgba(39,160,70,.15)',background:'rgba(39,160,70,.06)',color:C.ok,fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer'}}>WA</button>}
<button onClick={()=>{setViewRow(null);openEdit(viewRow)}} style={{height:32,padding:'0 16px',borderRadius:8,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.08)',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer'}}>{T('\u062a\u0639\u062f\u064a\u0644','Edit')}</button><button onClick={()=>setViewRow(null)} style={{width:32,height:32,borderRadius:8,background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{'\u2715'}</button></div></div>
<div style={{flex:1,display:'flex',overflow:'hidden'}}>
<div style={{width:160,background:'var(--bg)',borderLeft:'1px solid rgba(255,255,255,.04)',padding:'12px 8px',flexShrink:0}}>{vtabs.map(t=><div key={t.id} onClick={()=>setViewTab(t.id)} style={{padding:'10px 12px',borderRadius:8,marginBottom:3,fontSize:11,fontWeight:viewTab===t.id?700:500,color:viewTab===t.id?C.gold:'rgba(255,255,255,.38)',background:viewTab===t.id?'rgba(201,168,76,.08)':'transparent',border:viewTab===t.id?'1px solid rgba(201,168,76,.12)':'1px solid transparent',cursor:'pointer',transition:'.15s',display:'flex',justifyContent:'space-between',alignItems:'center'}}><span>{t.l}</span>{t.n!==undefined&&<span style={{fontSize:9,fontWeight:700,color:viewTab===t.id?C.gold:'rgba(255,255,255,.2)',background:viewTab===t.id?'rgba(201,168,76,.15)':'rgba(255,255,255,.04)',padding:'1px 6px',borderRadius:4,minWidth:18,textAlign:'center'}}>{t.n}</span>}</div>)}</div>
<div style={{flex:1,overflowY:'auto',padding:'20px 24px',scrollbarWidth:'none'}}>
{viewTab==='info'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<IB l={T('\u0631\u0642\u0645 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629','Transaction No.')} v={viewRow.transaction_number} copy/>
<IB l={T('تصنيف الخدمة','Service Category')} v={catLabels[viewRow.service_category]||viewRow.service_category}/>
<IB l={T('\u0627\u0644\u062d\u0627\u0644\u0629','Status')} v={viewRow.status}/>
<IB l={T('\u0627\u0644\u0623\u0648\u0644\u0648\u064a\u0629','Priority')} v={viewRow.priority}/>
<IB l={T('العميل','Client')} v={viewRow.client_name||'—'}/>
<IB l={T('المنشأة','Facility')} v={viewRow.facility_name||'—'}/>
<IB l={T('المسؤول','Assigned')} v={viewRow.assigned_name||'—'}/>
<IB l={T('SLA المتوقع','Expected SLA')} v={(viewRow.expected_sla_days||14)+' '+T('يوم','days')}/>
{viewRow.invoice_number&&<IB l={T('الفاتورة','Invoice')} v={viewRow.invoice_number+' — '+(Number(viewRow.invoice_amount||0).toLocaleString())+' '+T('ر.س','SAR')} copy/>}
{viewRow.parent_txn_number&&<IB l={T('معاملة سابقة','Parent')} v={viewRow.parent_txn_number} copy/>}
{totalSteps>0&&<div style={{gridColumn:'1/-1',background:'rgba(201,168,76,.04)',borderRadius:10,padding:'12px 16px',border:'1px solid rgba(201,168,76,.08)'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><span style={{fontSize:11,fontWeight:600,color:C.gold}}>{T('\u062a\u0642\u062f\u0645 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629','Progress')}</span><span style={{fontSize:12,fontWeight:800,color:C.gold}}>{progressPct}%</span></div>
<div style={{height:6,borderRadius:3,background:'rgba(255,255,255,.06)',overflow:'hidden'}}><div style={{height:'100%',width:progressPct+'%',borderRadius:3,background:progressPct===100?C.ok:C.gold,transition:'width .5s'}}/></div>
<div style={{fontSize:10,color:'var(--tx4)',marginTop:6}}>{completedSteps}/{totalSteps} {T('\u062e\u0637\u0648\u0627\u062a \u0645\u0643\u062a\u0645\u0644\u0629','steps completed')}</div>
</div>}
</div>}
{viewTab==='steps'&&<div>
{txSteps.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)'}}>{T('\u0644\u0627 \u062a\u0648\u062c\u062f \u062e\u0637\u0648\u0627\u062a','No steps defined')}</div>:
<div style={{display:'flex',flexDirection:'column',gap:0}}>
{txSteps.map((s,i)=>{const stC=s.status==='completed'?C.ok:s.status==='in_progress'?C.blue:s.status==='issue'?C.red:'rgba(255,255,255,.15)';const isLast=i===txSteps.length-1
return<div key={s.id} style={{display:'flex',gap:14,position:'relative'}}>
{/* Timeline line + dot */}
<div style={{display:'flex',flexDirection:'column',alignItems:'center',width:24,flexShrink:0}}>
<div style={{width:s.status==='in_progress'?28:20,height:s.status==='in_progress'?28:20,borderRadius:'50%',background:stC+'20',border:'2px solid '+stC,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,zIndex:1}}>
{s.status==='completed'&&<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={stC} strokeWidth="3" strokeLinecap="round"><path d="M5 12l5 5L19 7"/></svg>}
{s.status==='in_progress'&&<div style={{width:8,height:8,borderRadius:'50%',background:stC}}/>}
{s.status==='issue'&&<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={stC} strokeWidth="3"><path d="M12 8v4M12 16h.01"/></svg>}
{s.status==='pending'&&<div style={{width:6,height:6,borderRadius:'50%',background:'rgba(255,255,255,.1)'}}/>}
</div>
{!isLast&&<div style={{width:2,flex:1,background:s.status==='completed'?C.ok+'40':'rgba(255,255,255,.06)',minHeight:20}}/>}
</div>
{/* Content */}
<div style={{flex:1,paddingBottom:isLast?0:16}}>
<div style={{background:s.status==='issue'?'rgba(192,57,43,.04)':s.status==='in_progress'?'rgba(52,131,180,.04)':'rgba(255,255,255,.02)',borderRadius:10,padding:'12px 16px',border:'1px solid '+(s.status==='issue'?'rgba(192,57,43,.1)':s.status==='in_progress'?'rgba(52,131,180,.1)':'rgba(255,255,255,.04)')}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
<div style={{display:'flex',alignItems:'center',gap:8}}>
<span style={{fontSize:10,fontWeight:800,color:stC,background:stC+'15',width:20,height:20,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center'}}>{s.step_order}</span>
<span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>{isAr?s.step_name_ar:s.step_name_en||s.step_name_ar}</span>
</div>
<Badge v={s.status}/>
</div>
{s.status==='completed'&&s.duration_minutes!=null&&<div style={{display:'flex',gap:12,fontSize:10,color:'var(--tx4)',marginTop:4}}>
<span>{T('\u0627\u0644\u0645\u062f\u0629:','Time:')} <b style={{color:'var(--tx3)'}}>{s.duration_minutes} {T('\u062f\u0642\u064a\u0642\u0629','min')}</b></span>
{s.estimated_minutes&&<span>{T('\u0627\u0644\u0645\u062a\u0648\u0642\u0639:','Est:')} {s.estimated_minutes} {T('\u062f\u0642\u064a\u0642\u0629','min')}</span>}
{s.duration_minutes<s.estimated_minutes&&<span style={{color:C.ok}}>{T('\u0623\u0633\u0631\u0639','Faster')} \u2714</span>}
{s.duration_minutes>s.estimated_minutes&&<span style={{color:'#e67e22'}}>{T('\u0623\u0628\u0637\u0623','Slower')} \u26a0</span>}
</div>}
{s.status==='in_progress'&&s.started_at&&<div style={{fontSize:10,color:C.blue,marginTop:4}}>{T('\u0628\u062f\u0623\u062a \u0645\u0646\u0630:','Started:')} {new Date(s.started_at).toLocaleDateString('ar-SA')}</div>}
{s.issue_description&&<div style={{marginTop:6,padding:'8px 10px',background:'rgba(192,57,43,.06)',borderRadius:6,border:'1px solid rgba(192,57,43,.08)',fontSize:11,color:C.red}}>{s.issue_description}</div>}
{s.notes&&<div style={{fontSize:10,color:'var(--tx5)',marginTop:4}}>{s.notes}</div>}
</div></div></div>})}
</div>}
</div>}
{viewTab==='dates'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
<div style={{background:'rgba(201,168,76,.04)',borderRadius:12,padding:'16px',border:'1px solid rgba(201,168,76,.08)',textAlign:'center'}}><div style={{fontSize:9,color:'rgba(201,168,76,.5)',marginBottom:6}}>{T('\u0627\u0644\u0628\u062f\u0621','Start')}</div><div style={{fontSize:16,fontWeight:800,color:C.gold,direction:'ltr'}}>{viewRow.start_date||'\u2014'}</div></div>
<div style={{background:'rgba(192,57,43,.04)',borderRadius:12,padding:'16px',border:'1px solid rgba(192,57,43,.08)',textAlign:'center'}}><div style={{fontSize:9,color:'rgba(192,57,43,.5)',marginBottom:6}}>{T('\u0627\u0644\u0627\u0633\u062a\u062d\u0642\u0627\u0642','Due')}</div><div style={{fontSize:16,fontWeight:800,color:C.red,direction:'ltr'}}>{viewRow.due_date||'\u2014'}</div></div>
<div style={{background:'rgba(39,160,70,.04)',borderRadius:12,padding:'16px',border:'1px solid rgba(39,160,70,.08)',textAlign:'center'}}><div style={{fontSize:9,color:'rgba(39,160,70,.5)',marginBottom:6}}>{T('\u0627\u0644\u0625\u0646\u062c\u0627\u0632','Completed')}</div><div style={{fontSize:16,fontWeight:800,color:C.ok,direction:'ltr'}}>{viewRow.completed_date||'\u2014'}</div></div>
</div>}
{viewTab==='notes'&&<div>{viewRow.notes?<div style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'16px',border:'1px solid rgba(255,255,255,.03)',fontSize:13,lineHeight:2,color:'rgba(255,255,255,.7)'}}>{viewRow.notes}</div>:<div style={{textAlign:'center',padding:40,color:'var(--tx6)'}}>{T('\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0644\u0627\u062d\u0638\u0627\u062a','No notes')}</div>}{viewRow.cancellation_reason&&<div style={{marginTop:12,background:'rgba(192,57,43,.04)',borderRadius:10,padding:'14px 16px',border:'1px solid rgba(192,57,43,.08)'}}><div style={{fontSize:9,color:'rgba(192,57,43,.5)',marginBottom:6}}>{T('\u0633\u0628\u0628 \u0627\u0644\u0625\u0644\u063a\u0627\u0621','Cancellation Reason')}</div><div style={{fontSize:13,color:'rgba(192,57,43,.7)'}}>{viewRow.cancellation_reason}</div></div>}</div>}
</div></div></div></div>})()}

{pop&&<div onClick={()=>setPop(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:660,maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.4)',border:'1px solid var(--bd)'}}>
<div style={{height:3,background:'linear-gradient(90deg,transparent,'+C.gold+' 30%,#dcc06e 50%,'+C.gold+' 70%,transparent)'}}/>
<div style={{background:'var(--bg)',padding:'16px 22px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<div style={{fontSize:15,fontWeight:700,color:'var(--tx)'}}>{form._id?T('تعديل معاملة','Edit Transaction'):T('إضافة معاملة','Add Transaction')}</div>
<button onClick={()=>setPop(null)} style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
</div>
<div style={{flex:1,overflowY:'auto',padding:'18px 22px'}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
{tFields.map(f=><div key={f.k} style={{gridColumn:f.w?'1/-1':undefined}}>
<div style={{fontSize:12,fontWeight:600,color:'var(--tx3)',marginBottom:5}}>{f.l}{f.r&&<span style={{color:C.red}}> *</span>}</div>
{f.opts?<select value={form[f.k]||''} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} style={fS}><option value="">{T('— اختر —','— Select —')}</option>{f.opts.map(o=>typeof o==='string'?<option key={o} value={o}>{o}</option>:<option key={o.v} value={o.v}>{o.l}</option>)}</select>:
f.t==='date'?<input type="date" value={form[f.k]||''} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} style={{...fS,direction:'ltr'}}/>:
f.w?<textarea value={form[f.k]||''} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} rows={2} style={{...fS,height:'auto',padding:12,resize:'vertical'}}/>:
<input value={form[f.k]||''} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} style={{...fS,direction:f.d?'ltr':'rtl'}}/>}
</div>)}
</div></div>
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',flexDirection:'row-reverse'}}>
<button onClick={save} disabled={saving} style={{...bS,height:42,minWidth:130,opacity:saving?.6:1}}>{saving?'...':form._id?T('حفظ','Save'):T('إضافة','Add')}</button>
<button onClick={()=>setPop(null)} style={{height:42,padding:'0 18px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer'}}>{T('إلغاء','Cancel')}</button>
</div></div></div>}
{/* Escalation popup */}
{escPop&&<div onClick={()=>setEscPop(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:420,display:'flex',flexDirection:'column',overflow:'hidden',border:'1px solid rgba(230,126,34,.15)'}}>
<div style={{height:3,background:'linear-gradient(90deg,transparent,#e67e22 30%,#f0a050 50%,#e67e22 70%,transparent)'}}/>
<div style={{padding:'16px 22px',fontSize:15,fontWeight:700,color:'var(--tx)'}}>{T('تصعيد المعاملة','Escalate Transaction')}</div>
<div style={{padding:'0 22px 18px'}}><div style={{fontSize:11,color:'var(--tx4)',marginBottom:8}}>{T('سبب التصعيد','Reason')}</div>
<textarea value={escReason} onChange={e=>setEscReason(e.target.value)} rows={3} placeholder={T('اكتب سبب التصعيد بالتفصيل...','Describe the reason...')} style={{width:'100%',padding:12,border:'1.5px solid rgba(230,126,34,.15)',borderRadius:10,fontFamily:F,fontSize:12,color:'var(--tx)',background:'rgba(255,255,255,.05)',outline:'none',resize:'vertical'}}/>
</div>
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',flexDirection:'row-reverse'}}>
<button onClick={()=>escalateTxn(escPop)} style={{height:38,padding:'0 20px',borderRadius:8,border:'1px solid rgba(230,126,34,.2)',background:'rgba(230,126,34,.1)',color:'#e67e22',fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer'}}>⬆ {T('تصعيد','Escalate')}</button>
<button onClick={()=>setEscPop(null)} style={{height:38,padding:'0 16px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:12,cursor:'pointer'}}>{T('إلغاء','Cancel')}</button>
</div></div></div>}
</div>}
