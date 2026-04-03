import React,{useState,useEffect,useCallback} from 'react'
const F="'Cairo',sans-serif"
const C={dk:'#171717',fm:'#1e1e1e',gold:'#c9a84c',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}
const fS={width:'100%',height:42,padding:'0 14px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:F,fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',background:'rgba(255,255,255,.07)',textAlign:'center'}
const bS={height:36,padding:'0 16px',borderRadius:8,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.12)',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5}
const sMap={active:C.ok,inactive:'#999'}
const Badge=({v,l})=>{const cl=sMap[v]||'#999';return<span style={{fontSize:10,fontWeight:600,padding:'3px 8px',borderRadius:6,background:cl+'15',color:cl,display:'inline-flex',alignItems:'center',gap:3}}><span style={{width:4,height:4,borderRadius:'50%',background:cl}}/>{l||v||'—'}</span>}
const EditBtn=({onClick})=><button onClick={e=>{e.stopPropagation();onClick()}} style={{width:28,height:28,borderRadius:7,border:'1px solid rgba(201,168,76,.15)',background:'rgba(201,168,76,.08)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="1.8"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>
const DelBtn=({onClick})=><button onClick={e=>{e.stopPropagation();onClick()}} style={{width:28,height:28,borderRadius:7,border:'1px solid rgba(192,57,43,.12)',background:'rgba(192,57,43,.04)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
const nm=v=>{const n=Number(v);return isNaN(n)?'0':n.toLocaleString('en-US')}

export default function DataPage({sb,toast,user,lang,onTabChange,defaultTab}){
const isAr=lang!=='en'
const T=(a,e)=>isAr?a:e
const[tab,setTab]=useState(defaultTab||'clients')
const[clients,setClients]=useState([])
const[brokers,setBrokers]=useState([])
const[providers,setProviders]=useState([])
const[loading,setLoading]=useState(false)
const[pop,setPop]=useState(null)
const[form,setForm]=useState({})
const[saving,setSaving]=useState(false)
const[viewRow,setViewRow]=useState(null)
const[viewTab,setViewTab]=useState('info')
const[bvTab,setBvTab]=useState('info')
const[q,setQ]=useState('')
const[idTypes,setIdTypes]=useState([])
const[genders,setGenders]=useState([])
const[countries,setCountries]=useState([])
const[branches,setBranches]=useState([])

useEffect(()=>{onTabChange&&onTabChange({tab})},[tab])

const loadRef=useCallback(async()=>{
const[it,cats,co,br]=await Promise.all([
sb.from('lookup_items').select('id,value_ar,value_en,code,category_id').eq('is_active',true),
sb.from('lookup_categories').select('id,category_key'),
sb.from('countries').select('id,name_ar,nationality_ar').eq('is_active',true).order('name_ar'),
sb.from('branches').select('id,name_ar').eq('is_active',true).order('name_ar')
])
const items=it.data||[];const c2=cats.data||[]
const idCat=c2.find(c=>c.category_key==='id_type')
const gnCat=c2.find(c=>c.category_key==='gender')
setIdTypes(items.filter(i=>idCat&&i.category_id===idCat.id))
setGenders(items.filter(i=>gnCat&&i.category_id===gnCat.id))
setCountries(co.data||[]);setBranches(br.data||[])
},[sb])

const load=useCallback(async()=>{
setLoading(true)
const[c,b,p]=await Promise.all([
sb.from('clients').select('*').is('deleted_at',null).order('created_at',{ascending:false}),
sb.from('brokers').select('*').is('deleted_at',null).order('name_ar'),
sb.from('providers').select('*').is('deleted_at',null).order('name_ar')
])
setClients(c.data||[]);setBrokers(b.data||[]);setProviders(p.data||[])
setLoading(false)
},[sb])
useEffect(()=>{loadRef();load()},[loadRef,load])

const save=async()=>{setSaving(true);try{const t=form._table;const id=form._id;const d={...form};delete d._table;delete d._id
Object.keys(d).forEach(k=>{if(d[k]==='')d[k]=null})
if(d.is_vip!==undefined&&d.is_vip!==null)d.is_vip=d.is_vip==='true'
if(id){d.updated_by=user?.id;const{error}=await sb.from(t).update(d).eq('id',id);if(error)throw error;toast(T('تم التعديل','Updated'))}
else{d.created_by=user?.id;delete d.client_number;const{error}=await sb.from(t).insert(d);if(error)throw error;toast(T('تمت الإضافة','Added'))}
setPop(null);load()}catch(e){toast('خطأ: '+e.message?.slice(0,100))}setSaving(false)}
const del=async(table,id)=>{if(!confirm(T('حذف؟','Delete?')))return;await sb.from(table).update({deleted_at:new Date().toISOString()}).eq('id',id);toast(T('تم الحذف','Deleted'));load()}

const idTypeName=id=>idTypes.find(i=>i.id===id)?.value_ar||'—'
const genderName=id=>genders.find(i=>i.id===id)?.value_ar||'—'
const nationalityName=id=>countries.find(c=>c.id===id)?.nationality_ar||'—'
const branchName=id=>branches.find(b=>b.id===id)?.name_ar||'—'

const tabs=[{id:'clients',l:'العملاء',le:'Clients'},{id:'brokers',l:'الوسطاء',le:'Brokers'},{id:'providers',l:'المعقّبين',le:'Providers'}]
const cardS={background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:12,overflow:'hidden'}
const thS={padding:'10px 14px',textAlign:isAr?'right':'left',fontSize:10,fontWeight:600,color:'var(--tx5)'}
const tdS={padding:'10px 14px',fontSize:12,fontWeight:600,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}

const clientFields=[
{k:'name_ar',l:T('الاسم بالعربي','Name AR'),r:1},
{k:'name_en',l:T('الاسم بالإنجليزي','Name EN'),d:1},
{k:'id_type_id',l:T('نوع الهوية','ID Type'),fk:idTypes},
{k:'id_number',l:T('رقم الهوية','ID Number'),d:1},
{k:'nationality_id',l:T('الجنسية','Nationality'),fk:countries,fkL:'nationality_ar'},
{k:'gender_id',l:T('الجنس','Gender'),fk:genders},
{k:'phone',l:T('الجوال','Phone'),r:1,d:1,ph:'+966XXXXXXXXX'},
{k:'secondary_phone',l:T('رقم إضافي','Secondary Phone'),d:1},
{k:'email',l:T('البريد','Email'),d:1},
{k:'address',l:T('العنوان','Address'),w:1},
{k:'branch_id',l:T('الفرع','Branch'),fk:branches,fkL:'name_ar'},
{k:'is_vip',l:T('عميل مميز','VIP'),opts:[{v:'true',l:T('نعم','Yes')},{v:'false',l:T('لا','No')}]},
{k:'status',l:T('الحالة','Status'),opts:[{v:'active',l:T('نشط','Active')},{v:'inactive',l:T('غير نشط','Inactive')}],r:1},
{k:'notes',l:T('ملاحظات','Notes'),w:1,ta:1}
]
const brokerFields=[
{k:'name_ar',l:T('الاسم بالعربي','Name AR'),r:1},{k:'name_en',l:T('بالإنجليزي','Name EN'),d:1},
{k:'id_number',l:T('رقم الهوية','ID'),d:1},{k:'phone',l:T('الجوال','Phone'),d:1},{k:'email',l:T('البريد','Email'),d:1},
{k:'default_commission_type',l:T('نوع العمولة','Commission'),opts:[{v:'fixed',l:T('ثابت','Fixed')},{v:'percentage',l:T('نسبة','%')}]},
{k:'default_commission_rate',l:T('المبلغ/النسبة','Rate'),d:1},
{k:'bank_name',l:T('البنك','Bank')},{k:'account_number',l:T('رقم الحساب','Account'),d:1},{k:'iban',l:T('الآيبان','IBAN'),d:1,w:1},
{k:'status',l:T('الحالة','Status'),opts:[{v:'active',l:T('نشط','Active')},{v:'inactive',l:T('غير نشط','Inactive')}],r:1},
{k:'notes',l:T('ملاحظات','Notes'),w:1,ta:1}
]
const providerFields=[
{k:'name_ar',l:T('الاسم','Name AR'),r:1},{k:'name_en',l:T('بالإنجليزي','Name EN'),d:1},
{k:'phone',l:T('الجوال','Phone'),d:1},{k:'email',l:T('البريد','Email'),d:1},{k:'specialty',l:T('التخصص','Specialty')},
{k:'bank_name',l:T('البنك','Bank')},{k:'account_number',l:T('رقم الحساب','Account'),d:1},{k:'iban',l:T('الآيبان','IBAN'),d:1,w:1},
{k:'status',l:T('الحالة','Status'),opts:[{v:'active',l:T('نشط','Active')},{v:'inactive',l:T('غير نشط','Inactive')}],r:1},
{k:'notes',l:T('ملاحظات','Notes'),w:1,ta:1}
]

const curTable=tab==='clients'?'clients':tab==='brokers'?'brokers':'providers'
const curFields=tab==='clients'?clientFields:tab==='brokers'?brokerFields:providerFields
const curData=tab==='clients'?clients:tab==='brokers'?brokers:providers
const filtered=curData.filter(r=>!q||JSON.stringify(r).toLowerCase().includes(q.toLowerCase()))

const openAdd=()=>{const init={_table:curTable};curFields.forEach(f=>init[f.k]='');init.status='active';if(tab==='clients')init.is_vip='false';setForm(init);setPop('add')}
const openEdit=r=>{const init={_table:curTable,_id:r.id};curFields.forEach(f=>{let v=r[f.k];if(typeof v==='boolean')v=String(v);init[f.k]=v??''});setForm(init);setPop('edit')}

const totalClients=clients.length
const activeClients=clients.filter(c=>c.status==='active').length
const vipClients=clients.filter(c=>c.is_vip).length
const totalOwed=clients.reduce((s,c)=>s+(Number(c.remaining_amount)||0),0)
const totalBrokers=brokers.length;const activeBrokers=brokers.filter(b=>b.status==='active').length
const totalProviders=providers.length;const activeProviders=providers.filter(p=>p.status==='active').length

return<div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
<div>
<div style={{fontSize:20,fontWeight:700,color:'rgba(255,255,255,.93)'}}>{T('العملاء والوسطاء','Clients & Brokers')}</div>
<div style={{fontSize:12,color:'var(--tx4)',marginTop:6}}>{T('إدارة العملاء والوسطاء والمعقّبين','Manage clients, brokers & providers')}</div>
</div>
<div style={{display:'flex',gap:6}}>
<button onClick={()=>{const hdr=curFields.filter(f=>!f.w).map(f=>f.l);const rows=curData.map(r=>curFields.filter(f=>!f.w).map(f=>r[f.k]||''));const csv='\uFEFF'+[hdr,...rows].map(r=>r.join(',')).join('\n');const b=new Blob([csv],{type:'text/csv;charset=utf-8;'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=tab+'_'+new Date().toISOString().slice(0,10)+'.csv';a.click()}} style={{height:36,padding:'0 12px',borderRadius:8,border:'1px solid rgba(52,131,180,.15)',background:'rgba(52,131,180,.06)',color:C.blue,fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>{T('تصدير','Export')}</button>
<button onClick={openAdd} style={bS}>+ {T(tab==='clients'?'عميل':tab==='brokers'?'وسيط':'معقّب','Add')}</button>
</div>
</div>

<div style={{display:'flex',gap:0,marginBottom:20,borderBottom:'1px solid var(--bd)',overflowX:'auto',scrollbarWidth:'none'}}>
{tabs.map(t=><div key={t.id} onClick={()=>{setTab(t.id);setQ('');setViewRow(null)}} style={{padding:'10px 16px',fontSize:12,fontWeight:tab===t.id?700:500,color:tab===t.id?C.gold:'rgba(255,255,255,.42)',borderBottom:tab===t.id?'2px solid '+C.gold:'2px solid transparent',cursor:'pointer',whiteSpace:'nowrap'}}>{isAr?t.l:t.le}</div>)}
</div>

{tab==='clients'&&<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
{[[T('إجمالي','Total'),totalClients,C.blue,'rgba(52,131,180,.06)','rgba(52,131,180,.1)'],[T('نشط','Active'),activeClients,C.ok,'rgba(39,160,70,.06)','rgba(39,160,70,.1)'],[T('مميز','VIP'),vipClients,C.gold,'rgba(201,168,76,.06)','rgba(201,168,76,.1)'],[T('مستحقات','Owed'),nm(totalOwed)+' '+T('ر.س','SAR'),C.red,'rgba(192,57,43,.06)','rgba(192,57,43,.1)']].map(([l,v,c,bg,bc],i)=>
<div key={i} style={{padding:'14px',borderRadius:12,background:bg,border:'1px solid '+bc}}>
<div style={{fontSize:9,color:c,opacity:.7,marginBottom:4}}>{l}</div>
<div style={{fontSize:22,fontWeight:800,color:c}}>{v}</div></div>)}
</div>}

{tab==='brokers'&&<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
{[[T('إجمالي الوسطاء','Total'),totalBrokers,C.blue,'rgba(52,131,180,.06)','rgba(52,131,180,.1)'],[T('نشط','Active'),activeBrokers,C.ok,'rgba(39,160,70,.06)','rgba(39,160,70,.1)'],[T('غير نشط','Inactive'),totalBrokers-activeBrokers,'#999','rgba(255,255,255,.02)','rgba(255,255,255,.06)']].map(([l,v,c,bg,bc],i)=>
<div key={i} style={{padding:'14px',borderRadius:12,background:bg,border:'1px solid '+bc}}>
<div style={{fontSize:9,color:c,opacity:.7,marginBottom:4}}>{l}</div>
<div style={{fontSize:22,fontWeight:800,color:c}}>{v}</div></div>)}
</div>}

{tab==='providers'&&<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
{[[T('إجمالي المعقّبين','Total'),totalProviders,C.blue],[T('نشط','Active'),activeProviders,C.ok],[T('غير نشط','Inactive'),totalProviders-activeProviders,'#999']].map(([l,v,c],i)=>
<div key={i} style={{padding:'14px',borderRadius:10,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.04)',textAlign:'center'}}>
<div style={{fontSize:9,color:'var(--tx5)',marginBottom:5}}>{l}</div>
<div style={{fontSize:18,fontWeight:800,color:c}}>{v}</div></div>)}
</div>}

<div style={{display:'flex',alignItems:'center',marginBottom:12,gap:10}}>
<input value={q} onChange={e=>setQ(e.target.value)} placeholder={T('بحث ...','Search ...')} style={{flex:1,height:38,padding:'0 14px',border:'1.5px solid rgba(255,255,255,.08)',borderRadius:10,fontFamily:F,fontSize:12,color:'var(--tx)',background:'rgba(255,255,255,.04)',outline:'none'}}/>
<div style={{fontSize:11,color:'var(--tx5)',whiteSpace:'nowrap'}}>{filtered.length} {T('سجل','records')}</div>
</div>

{loading?<div style={{textAlign:'center',padding:50,color:'var(--tx5)'}}>...</div>:
filtered.length===0?<div style={{textAlign:'center',padding:50,color:'var(--tx6)'}}>{T('لا توجد بيانات','No data')}</div>:
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(360px,1fr))',gap:14}}>
{filtered.map(r=>{
const isClient=tab==='clients';const isBroker=tab==='brokers'
const rate=isClient?Number(r.commitment_rate)||0:0;const rateCl=rate>=80?C.ok:rate>=50?C.gold:rate>0?C.red:'var(--tx5)'
const owed=Number(r.remaining_amount)||0;const isBlk=r.is_blacklisted
const borderClr=isBlk?'rgba(192,57,43,.25)':r.is_vip?'rgba(201,168,76,.2)':'var(--bd)'
return<div key={r.id} onClick={()=>{setViewRow(r);setViewTab('info');setBvTab('info')}} style={{background:'var(--bg)',border:'1px solid '+borderClr,borderRadius:14,overflow:'hidden',cursor:'pointer',transition:'.15s'}} onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(201,168,76,.2)'} onMouseLeave={e=>e.currentTarget.style.borderColor=borderClr}>
{/* Header */}
<div style={{padding:'14px 16px',display:'flex',gap:12,alignItems:'flex-start'}}>
<div style={{width:44,height:44,borderRadius:12,background:r.is_vip?'rgba(201,168,76,.12)':'rgba(255,255,255,.04)',border:'1.5px solid '+(r.is_vip?'rgba(201,168,76,.25)':'rgba(255,255,255,.08)'),display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:r.is_vip?C.gold:'var(--tx4)',flexShrink:0}}>{(r.name_ar||'?')[0]}</div>
<div style={{flex:1,minWidth:0}}>
<div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
<span style={{fontSize:14,fontWeight:700,color:'var(--tx)'}}>{r.name_ar}</span>
<Badge v={r.status} l={r.status==='active'?T('نشط','Active'):T('غير نشط','Inactive')}/>
</div>
<div style={{display:'flex',gap:4,alignItems:'center',flexWrap:'wrap'}}>
{isClient&&r.client_number&&<span style={{fontSize:9,color:'var(--tx5)',direction:'ltr'}}>{r.client_number}</span>}
{isClient&&r.is_vip&&<span style={{fontSize:8,padding:'1px 6px',borderRadius:4,background:'rgba(201,168,76,.15)',color:C.gold,fontWeight:700}}>VIP</span>}
{isClient&&isBlk&&<span style={{fontSize:8,padding:'1px 6px',borderRadius:4,background:'rgba(192,57,43,.15)',color:C.red,fontWeight:700}}>محظور</span>}
{isBroker&&r.default_commission_rate&&<span style={{fontSize:8,padding:'1px 6px',borderRadius:4,background:'rgba(201,168,76,.08)',color:C.gold,fontWeight:600}}>{r.default_commission_type==='percentage'?'نسبة '+r.default_commission_rate+'%':'مبلغ ثابت '+r.default_commission_rate+' ر.س'}</span>}
{!isClient&&!isBroker&&r.specialty&&<span style={{fontSize:8,padding:'1px 6px',borderRadius:4,background:'rgba(52,131,180,.08)',color:C.blue,fontWeight:600}}>{r.specialty}</span>}
{r.branch_id&&<span style={{fontSize:8,padding:'1px 6px',borderRadius:4,background:'rgba(39,160,70,.06)',color:'rgba(39,160,70,.7)',fontWeight:600}}>{branchName(r.branch_id)}</span>}
</div>
</div>
<div style={{display:'flex',gap:4,flexShrink:0}} onClick={e=>e.stopPropagation()}>
{isClient&&r.phone&&<button onClick={()=>{const ph=r.phone.replace(/\D/g,'').replace(/^0/,'966');window.open('https://wa.me/'+ph,'_blank')}} style={{width:28,height:28,borderRadius:7,border:'1px solid rgba(39,160,70,.15)',background:'rgba(39,160,70,.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#27a046" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></button>}
<EditBtn onClick={()=>openEdit(r)}/></div>
</div>
{/* Client: 4 indicators */}
{isClient&&<div style={{display:'flex',borderTop:'1px solid rgba(255,255,255,.04)',background:'rgba(255,255,255,.01)'}}>
{[[(r.total_invoices||0),'فاتورة',C.blue],[nm(r.total_invoices_amount||0),'إجمالي',C.gold],[nm(owed),'مستحقات',owed>0?C.red:C.ok],[rate+'%','الالتزام',rateCl]].map(([v,l,c],j)=>
<div key={j} style={{flex:1,padding:'8px 6px',textAlign:'center',borderLeft:j>0?'1px solid rgba(255,255,255,.03)':'none'}}>
<div style={{fontSize:14,fontWeight:700,color:c}}>{v}</div>
<div style={{fontSize:7,color:'var(--tx5)',marginTop:2}}>{l}</div>
</div>)}
</div>}
{/* Client: commitment bar */}
{isClient&&rate>0&&<div style={{padding:'4px 14px 6px'}}>
<div style={{height:4,borderRadius:2,background:'rgba(255,255,255,.06)',overflow:'hidden'}}><div style={{height:'100%',width:Math.min(rate,100)+'%',borderRadius:2,background:rateCl}}/></div>
</div>}
{/* Broker: indicators */}
{isBroker&&<div style={{display:'flex',borderTop:'1px solid rgba(255,255,255,.04)',background:'rgba(255,255,255,.01)'}}>
{[[(r.total_transactions||0),'عمولة',C.gold],[nm(r.total_amount||0),'إجمالي ر.س',C.ok],[(r.workers_count||0),'عمال معوّلين',C.blue]].map(([v,l,c],j)=>
<div key={j} style={{flex:1,padding:'8px 6px',textAlign:'center',borderLeft:j>0?'1px solid rgba(255,255,255,.03)':'none'}}>
<div style={{fontSize:14,fontWeight:700,color:c}}>{v}</div>
<div style={{fontSize:7,color:'var(--tx5)',marginTop:2}}>{l}</div>
</div>)}
</div>}
{/* Footer: phone + ID */}
<div style={{padding:'6px 14px',borderTop:'1px solid rgba(255,255,255,.03)',display:'flex',justifyContent:'space-between',background:'rgba(255,255,255,.015)'}}>
<span style={{fontSize:9,color:'var(--tx5)',direction:'ltr'}}>{r.phone||'—'}</span>
{r.id_number&&<span style={{fontSize:9,color:'var(--tx5)',direction:'ltr'}}>{r.id_number}</span>}
{!isClient&&r.bank_name&&<span style={{fontSize:9,color:'var(--tx5)'}}>{r.bank_name}</span>}
</div>
{/* Client: overdue alert */}
{isClient&&Number(r.overdue_count)>0&&<div style={{padding:'5px 14px',background:'rgba(192,57,43,.04)',borderTop:'1px solid rgba(192,57,43,.08)'}}>
<span style={{fontSize:9,color:C.red,fontWeight:600}}>{r.overdue_count} فاتورة متأخرة</span>
</div>}
</div>})}
</div>}

{viewRow&&tab==='clients'&&(()=>{
const r=viewRow;const rate=Number(r.commitment_rate)||0;const rateCl=rate>=80?C.ok:rate>=50?C.gold:rate>0?C.red:'var(--tx5)'
const IB=({l,v,copy,c})=><div style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'14px 16px',border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:9,color:'var(--tx5)',marginBottom:6}}>{l}</div><div style={{display:'flex',alignItems:'center',gap:6}}><div style={{fontSize:14,fontWeight:700,color:c||'rgba(255,255,255,.85)',direction:copy?'ltr':'inherit'}}>{v||'—'}</div>{copy&&v&&v!=='—'&&<button onClick={e=>{e.stopPropagation();navigator.clipboard.writeText(String(v));toast(T('تم النسخ','Copied'))}} style={{width:20,height:20,borderRadius:5,border:'none',background:'rgba(255,255,255,.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>}</div></div>
const vtabs=[{id:'info',l:T('البيانات','Info')},{id:'financial',l:T('المالية','Financial')},{id:'contact',l:T('التواصل','Contact')},{id:'notes',l:T('ملاحظات','Notes')}]
return<div onClick={()=>setViewRow(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(860px,95vw)',height:'min(540px,85vh)',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.5)',border:'1px solid rgba(201,168,76,.15)'}}>
<div style={{background:'var(--bg)',padding:'18px 24px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',borderBottom:'1px solid rgba(201,168,76,.12)',flexShrink:0}}>
<div style={{display:'flex',gap:12,alignItems:'center'}}>
<div style={{width:48,height:48,borderRadius:14,background:r.is_vip?'rgba(201,168,76,.12)':'rgba(255,255,255,.05)',border:r.is_vip?'1.5px solid rgba(201,168,76,.2)':'1px solid rgba(255,255,255,.06)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:800,color:r.is_vip?C.gold:'var(--tx4)'}}>{(r.name_ar||'?')[0]}</div>
<div><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}><span style={{fontSize:18,fontWeight:800,color:'var(--tx)'}}>{r.name_ar}</span><Badge v={r.status} l={r.status==='active'?T('نشط','Active'):T('غير نشط','Inactive')}/>{r.is_vip&&<span style={{fontSize:9,padding:'2px 8px',borderRadius:5,background:'rgba(201,168,76,.15)',color:C.gold,fontWeight:700}}>VIP</span>}</div>
<div style={{fontSize:11,color:'var(--tx4)'}}>{r.client_number}{r.name_en&&' · '+r.name_en}</div></div></div>
<div style={{display:'flex',gap:6}}><button onClick={()=>{setViewRow(null);openEdit(r)}} style={{height:32,padding:'0 16px',borderRadius:8,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.08)',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer'}}>{T('تعديل','Edit')}</button><button onClick={()=>setViewRow(null)} style={{width:32,height:32,borderRadius:8,background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button></div></div>
<div style={{flex:1,display:'flex',overflow:'hidden'}}>
<div style={{width:150,background:'var(--bg)',borderLeft:'1px solid rgba(255,255,255,.04)',padding:'12px 8px',flexShrink:0}}>{vtabs.map(t=><div key={t.id} onClick={()=>setViewTab(t.id)} style={{padding:'10px 12px',borderRadius:8,marginBottom:3,fontSize:11,fontWeight:viewTab===t.id?700:500,color:viewTab===t.id?C.gold:'rgba(255,255,255,.38)',background:viewTab===t.id?'rgba(201,168,76,.08)':'transparent',cursor:'pointer'}}>{t.l}</div>)}</div>
<div style={{flex:1,overflowY:'auto',padding:'20px 24px',scrollbarWidth:'none'}}>
{viewTab==='info'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<IB l={T('رقم العميل','Client No.')} v={r.client_number} copy/><IB l={T('نوع الهوية','ID Type')} v={idTypeName(r.id_type_id)}/>
<IB l={T('رقم الهوية','ID No.')} v={r.id_number} copy/><IB l={T('الجنسية','Nationality')} v={nationalityName(r.nationality_id)}/>
<IB l={T('الجنس','Gender')} v={genderName(r.gender_id)}/><IB l={T('الفرع','Branch')} v={branchName(r.branch_id)}/>
</div>}
{viewTab==='financial'&&<div>
<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
<div style={{background:'rgba(52,131,180,.06)',borderRadius:12,padding:'16px',border:'1px solid rgba(52,131,180,.1)',textAlign:'center'}}><div style={{fontSize:9,color:'rgba(52,131,180,.6)',marginBottom:6}}>{T('إجمالي الفواتير','Total')}</div><div style={{fontSize:22,fontWeight:900,color:C.blue}}>{nm(r.total_invoices_amount||0)}</div><div style={{fontSize:10,color:'var(--tx5)',marginTop:2}}>{r.total_invoices||0} {T('فاتورة','inv')}</div></div>
<div style={{background:'rgba(39,160,70,.06)',borderRadius:12,padding:'16px',border:'1px solid rgba(39,160,70,.1)',textAlign:'center'}}><div style={{fontSize:9,color:'rgba(39,160,70,.6)',marginBottom:6}}>{T('المدفوع','Paid')}</div><div style={{fontSize:22,fontWeight:900,color:C.ok}}>{nm(r.paid_amount||0)}</div></div>
<div style={{background:Number(r.remaining_amount)>0?'rgba(192,57,43,.06)':'rgba(39,160,70,.06)',borderRadius:12,padding:'16px',border:'1px solid '+(Number(r.remaining_amount)>0?'rgba(192,57,43,.1)':'rgba(39,160,70,.1)'),textAlign:'center'}}><div style={{fontSize:9,color:Number(r.remaining_amount)>0?'rgba(192,57,43,.6)':'rgba(39,160,70,.6)',marginBottom:6}}>{T('المتبقي','Remaining')}</div><div style={{fontSize:22,fontWeight:900,color:Number(r.remaining_amount)>0?C.red:C.ok}}>{nm(r.remaining_amount||0)}</div></div>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<div style={{background:'rgba(255,255,255,.025)',borderRadius:12,padding:'16px',border:'1px solid rgba(255,255,255,.04)',textAlign:'center'}}><div style={{fontSize:9,color:'var(--tx5)',marginBottom:6}}>{T('نسبة الالتزام','Commitment')}</div><div style={{fontSize:28,fontWeight:900,color:rateCl}}>{rate}%</div><div style={{width:'100%',height:6,borderRadius:3,background:'rgba(255,255,255,.06)',marginTop:8,overflow:'hidden'}}><div style={{width:Math.min(rate,100)+'%',height:'100%',borderRadius:3,background:rateCl}}/></div></div>
<div style={{background:'rgba(255,255,255,.025)',borderRadius:12,padding:'16px',border:'1px solid rgba(255,255,255,.04)',textAlign:'center'}}><div style={{fontSize:9,color:'var(--tx5)',marginBottom:6}}>{T('المعاملات','Transactions')}</div><div style={{fontSize:28,fontWeight:900,color:'var(--tx2)'}}>{r.total_transactions||0}</div></div>
</div></div>}
{viewTab==='contact'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<IB l={T('الجوال','Phone')} v={r.phone} copy/><IB l={T('رقم إضافي','Secondary')} v={r.secondary_phone} copy/>
<IB l={T('البريد','Email')} v={r.email} copy/><div/>
<div style={{gridColumn:'1/-1'}}><IB l={T('العنوان','Address')} v={r.address}/></div>
{r.phone&&<div style={{gridColumn:'1/-1'}}><button onClick={()=>{const ph=r.phone.replace(/\D/g,'');window.open('https://wa.me/'+ph,'_blank')}} style={{width:'100%',height:42,borderRadius:10,border:'1px solid rgba(39,160,70,.2)',background:'rgba(39,160,70,.08)',color:C.ok,fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer'}}>{T('تواصل واتساب','WhatsApp')}</button></div>}
</div>}
{viewTab==='notes'&&<div>{r.notes?<div style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'16px',border:'1px solid rgba(255,255,255,.03)',fontSize:13,lineHeight:2,color:'rgba(255,255,255,.7)'}}>{r.notes}</div>:<div style={{textAlign:'center',padding:40,color:'var(--tx6)'}}>{T('لا توجد ملاحظات','No notes')}</div>}</div>}
</div></div></div></div>})()}

{viewRow&&tab!=='clients'&&(()=>{const r=viewRow
const IB=({l,v,copy})=><div style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'14px 16px',border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:9,color:'var(--tx5)',marginBottom:6}}>{l}</div><div style={{display:'flex',alignItems:'center',gap:6}}><div style={{fontSize:14,fontWeight:700,color:'rgba(255,255,255,.85)',direction:copy?'ltr':'inherit'}}>{v||'—'}</div>{copy&&v&&<button onClick={e=>{e.stopPropagation();navigator.clipboard.writeText(String(v));toast(T('تم النسخ','Copied'))}} style={{width:20,height:20,borderRadius:5,border:'none',background:'rgba(255,255,255,.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>}</div></div>
const btabs=tab==='brokers'?[{id:'info',l:T('البيانات','Info')},{id:'bank',l:T('الحساب البنكي','Bank')},{id:'notes',l:T('ملاحظات','Notes')}]:[{id:'info',l:T('البيانات','Info')},{id:'bank',l:T('الحساب البنكي','Bank')},{id:'notes',l:T('ملاحظات','Notes')}]
return<div onClick={()=>setViewRow(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(700px,95vw)',height:'min(440px,80vh)',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.5)',border:'1px solid var(--bd)'}}>
<div style={{padding:'16px 22px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid var(--bd)',flexShrink:0}}>
<div style={{display:'flex',gap:10,alignItems:'center'}}>
<div style={{width:40,height:40,borderRadius:12,background:'rgba(201,168,76,.1)',border:'1px solid rgba(201,168,76,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:C.gold}}>{(r.name_ar||'?')[0]}</div>
<div><div style={{fontSize:16,fontWeight:800,color:'var(--tx)'}}>{r.name_ar}</div>{r.name_en&&<div style={{fontSize:10,color:'var(--tx4)'}}>{r.name_en}</div>}</div></div>
<div style={{display:'flex',gap:6}}><button onClick={()=>{setViewRow(null);openEdit(r)}} style={{height:32,padding:'0 16px',borderRadius:8,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.08)',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer'}}>{T('تعديل','Edit')}</button><button onClick={()=>setViewRow(null)} style={{width:32,height:32,borderRadius:8,background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button></div></div>
<div style={{flex:1,display:'flex',overflow:'hidden'}}>
<div style={{width:140,background:'var(--bg)',borderLeft:'1px solid rgba(255,255,255,.04)',padding:'12px 8px',flexShrink:0}}>
{btabs.map(t=><div key={t.id} onClick={()=>setBvTab(t.id)} style={{padding:'10px 12px',borderRadius:8,marginBottom:3,fontSize:11,fontWeight:bvTab===t.id?700:500,color:bvTab===t.id?C.gold:'rgba(255,255,255,.38)',background:bvTab===t.id?'rgba(201,168,76,.08)':'transparent',cursor:'pointer'}}>{t.l}</div>)}
</div>
<div style={{flex:1,overflowY:'auto',padding:'20px 24px',scrollbarWidth:'none'}}>
{bvTab==='info'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<IB l={T('الاسم','Name')} v={r.name_ar}/>{r.name_en&&<IB l={T('بالإنجليزي','EN')} v={r.name_en}/>}
{r.id_number&&<IB l={T('الهوية','ID')} v={r.id_number} copy/>}<IB l={T('الجوال','Phone')} v={r.phone} copy/>
{r.email&&<IB l={T('البريد','Email')} v={r.email} copy/>}{r.specialty&&<IB l={T('التخصص','Spec')} v={r.specialty}/>}
{r.default_commission_rate&&<IB l={T('العمولة','Comm')} v={r.default_commission_rate+(r.default_commission_type==='percentage'?'%':' '+T('ر.س','SAR'))}/>}
<IB l={T('الحالة','Status')} v={r.status}/>
</div>}
{bvTab==='bank'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
{r.bank_name?<><IB l={T('البنك','Bank')} v={r.bank_name}/>{r.account_number&&<IB l={T('رقم الحساب','Account')} v={r.account_number} copy/>}{r.iban&&<div style={{gridColumn:'1/-1'}}><IB l={T('الآيبان','IBAN')} v={r.iban} copy/></div>}</>:<div style={{gridColumn:'1/-1',textAlign:'center',padding:30,color:'var(--tx6)'}}>{T('لا توجد بيانات بنكية','No bank info')}</div>}
</div>}
{bvTab==='notes'&&<div>{r.notes?<div style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'16px',border:'1px solid rgba(255,255,255,.03)',fontSize:13,lineHeight:2,color:'rgba(255,255,255,.7)'}}>{r.notes}</div>:<div style={{textAlign:'center',padding:40,color:'var(--tx6)'}}>{T('لا توجد ملاحظات','No notes')}</div>}</div>}
</div></div></div></div>})()}

{pop&&<div onClick={()=>setPop(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:700,maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.4)',border:'1px solid var(--bd)'}}>
<div style={{height:3,background:'linear-gradient(90deg,transparent,'+C.gold+' 30%,#dcc06e 50%,'+C.gold+' 70%,transparent)'}}/>
<div style={{background:'var(--bg)',padding:'16px 22px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<div style={{fontSize:15,fontWeight:700,color:'var(--tx)'}}>{(form._id?T('تعديل','Edit'):T('إضافة','Add'))+' — '+(tab==='clients'?T('عميل','Client'):tab==='brokers'?T('وسيط','Broker'):T('معقّب','Provider'))}</div>
<button onClick={()=>setPop(null)} style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
</div>
<div style={{flex:1,overflowY:'auto',padding:'18px 22px',scrollbarWidth:'none'}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
{curFields.map(f=><div key={f.k} style={{gridColumn:f.w?'1/-1':undefined}}>
<div style={{fontSize:12,fontWeight:600,color:'var(--tx3)',marginBottom:5}}>{f.l}{f.r&&<span style={{color:C.red}}> *</span>}</div>
{f.fk?<select value={form[f.k]||''} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} style={fS}><option value="">{T('— اختر —','— Select —')}</option>{f.fk.map(o=><option key={o.id} value={o.id}>{o[f.fkL||'value_ar']||o.name_ar}</option>)}</select>:
f.opts?<select value={form[f.k]||''} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} style={fS}><option value="">{T('— اختر —','— Select —')}</option>{f.opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select>:
f.ta?<textarea value={form[f.k]||''} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} rows={2} style={{...fS,height:'auto',padding:12,resize:'vertical',textAlign:'right'}}/>:
<input value={form[f.k]||''} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph||''} style={{...fS,direction:f.d?'ltr':'rtl',textAlign:f.d?'left':'right'}}/>}
</div>)}
</div></div>
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',flexDirection:'row-reverse'}}>
<button onClick={save} disabled={saving} style={{...bS,height:42,minWidth:130,opacity:saving?.6:1}}>{saving?'...':form._id?T('حفظ','Save'):T('إضافة','Add')}</button>
<button onClick={()=>setPop(null)} style={{height:42,padding:'0 18px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer'}}>{T('إلغاء','Cancel')}</button>
</div></div></div>}
</div>}
