import React,{useState,useEffect,useCallback} from 'react'
const F="'Cairo',sans-serif"
const C={dk:'#171717',fm:'#1e1e1e',gold:'#c9a84c',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}
const fS={width:'100%',height:42,padding:'0 14px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:F,fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',background:'rgba(255,255,255,.07)',textAlign:'center'}
const bS={height:38,padding:'0 20px',borderRadius:10,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.12)',color:C.gold,fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}
const sMap={active:C.ok,absconded:C.red,final_exit:'#999',transferred:'#e67e22',suspended:'#e67e22',male:C.blue,female:'#9b59b6',completed:C.ok,pending:'#e67e22',cancelled:C.red,expired:'#999',recruitment:C.blue,transfer:'#9b59b6',approved:C.ok,rejected:C.red}
const valAr={male:'ذكر',female:'أنثى',single:'أعزب',married:'متزوج',divorced:'مطلق',widowed:'أرمل',active:'نشط',absconded:'هارب',suspended:'معلّق',final_exit:'خروج نهائي',transferred:'منقول',citizen:'مواطن',resident:'مقيم',basic:'أساسي',skilled:'ماهر',highly_skilled:'عالي المهارة',completed:'مكتمل',pending:'قيد الانتظار',cancelled:'ملغى',expired:'منتهي',registered:'مسجّل',not_registered:'غير مسجّل',true:'نعم',false:'لا',recruitment:'استقدام',transfer:'نقل كفالة',approved:'مقبول',rejected:'مرفوض',professional:'محترف',unskilled:'غير ماهر',semi_skilled:'شبه ماهر',laborer:'عامل',technician:'فني',engineer:'مهندس'}
const natFlags={'أردني':'🇯🇴','أفغاني':'🇦🇫','أوغندي':'🇺🇬','إثيوبي':'🇪🇹','إندونيسي':'🇮🇩','باكستاني':'🇵🇰','بنغلاديشي':'🇧🇩','تركي':'🇹🇷','تونسي':'🇹🇳','سريلانكي':'🇱🇰','سعودي':'🇸🇦','سعودية':'🇸🇦','سوداني':'🇸🇩','سوري':'🇸🇾','فلبيني':'🇵🇭','كيني':'🇰🇪','مصري':'🇪🇬','مغربي':'🇲🇦','ميانمار':'🇲🇲','نيبالي':'🇳🇵','هندي':'🇮🇳','يمني':'🇾🇪'}
const natCodes={'أردني':'JO','أفغاني':'AF','أوغندي':'UG','إثيوبي':'ET','إندونيسي':'ID','باكستاني':'PK','بنغلاديشي':'BD','تركي':'TR','تونسي':'TN','سريلانكي':'LK','سعودي':'SA','سعودية':'SA','سوداني':'SD','سوري':'SY','فلبيني':'PH','كيني':'KE','مصري':'EG','مغربي':'MA','ميانمار':'MM','نيبالي':'NP','هندي':'IN','يمني':'YE'}
const nm=v=>Number(v||0).toLocaleString('en-US')
const Badge=({v})=>{const cl=sMap[v]||'#888';const lbl=valAr[v]||v;return<span style={{fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:6,background:cl+'18',color:cl,display:'inline-flex',alignItems:'center',gap:4}}><span style={{width:5,height:5,borderRadius:'50%',background:cl}}/>{lbl||'\u2014'}</span>}
const EditBtn=({onClick})=><button onClick={e=>{e.stopPropagation();onClick()}} style={{width:28,height:28,borderRadius:7,border:'1px solid rgba(201,168,76,.15)',background:'rgba(201,168,76,.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="1.8"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>
const DelBtn=({onClick})=><button onClick={e=>{e.stopPropagation();onClick()}} style={{width:28,height:28,borderRadius:7,border:'1px solid rgba(192,57,43,.1)',background:'rgba(192,57,43,.04)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
const IB=({l,v,copy,isSt,toast})=>{const dv=valAr[v]||v;return<div style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'14px 16px',border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:9,color:'var(--tx5)',marginBottom:6}}>{l}</div><div style={{display:'flex',alignItems:'center',gap:6}}><div style={{fontSize:14,fontWeight:700,color:isSt?(sMap[v]||'rgba(255,255,255,.85)'):'rgba(255,255,255,.85)',direction:copy?'ltr':'inherit'}}>{isSt?<Badge v={v}/>:(dv||'\u2014')}</div>{copy&&v&&<button onClick={e=>{e.stopPropagation();navigator.clipboard.writeText(String(v));toast&&toast('تم النسخ')}} style={{width:20,height:20,borderRadius:5,border:'none',background:'rgba(255,255,255,.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>}</div></div>}
const FI=({f,form,setForm,isAr})=>{const v=form[f.k]||'';const set=val=>setForm(p=>({...p,[f.k]:val}));return<div style={{gridColumn:f.w?'1/-1':undefined}}><div style={{fontSize:12,fontWeight:600,color:'var(--tx3)',marginBottom:5}}>{f.l}{f.r&&<span style={{color:C.red}}> *</span>}</div>{f.opts?<select value={v} onChange={e=>set(e.target.value)} style={fS}><option value="">— اختر —</option>{f.opts.map(o=>typeof o==='object'?<option key={o.v} value={o.v}>{o.l}</option>:<option key={o} value={o}>{o}</option>)}</select>:f.t==='date'?<input type="date" value={v} onChange={e=>set(e.target.value)} style={{...fS,direction:'ltr'}}/>:f.w?<textarea value={v} onChange={e=>set(e.target.value)} rows={2} style={{...fS,height:'auto',padding:12,resize:'vertical'}}/>:<input value={v} onChange={e=>set(e.target.value)} style={{...fS,direction:f.d?'ltr':'rtl'}}/>}</div>}
const FormPopup=({title,fields,form,setForm,onSave,onClose,saving,isAr})=><div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}><div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:560,maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.4)',border:'1px solid var(--bd)'}}><div style={{height:3,background:'linear-gradient(90deg,transparent,'+C.gold+' 30%,#dcc06e 50%,'+C.gold+' 70%,transparent)'}}/><div style={{background:'var(--bg)',padding:'16px 22px',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{fontSize:15,fontWeight:700,color:'var(--tx)'}}>{title}</div><button onClick={onClose} style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{'\u2715'}</button></div><div style={{flex:1,overflowY:'auto',padding:'18px 22px'}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>{fields.map(f=><FI key={f.k} f={f} form={form} setForm={setForm} isAr={isAr}/>)}</div></div><div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',flexDirection:'row-reverse'}}><button onClick={onSave} disabled={saving} style={{...bS,height:42,minWidth:130,opacity:saving?.6:1}}>{saving?'...':form._id?'حفظ':'إضافة'}</button><button onClick={onClose} style={{height:42,padding:'0 18px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer'}}>إلغاء</button></div></div></div>
const SectionHdr=({t})=><div style={{fontSize:12,fontWeight:700,color:C.gold,marginBottom:10,paddingBottom:6,borderBottom:'1px solid rgba(201,168,76,.12)'}}>{t}</div>
const selS={height:34,padding:'0 10px',borderRadius:8,border:'1px solid var(--bd)',background:'rgba(255,255,255,.04)',color:'rgba(255,255,255,.6)',fontFamily:F,fontSize:10,outline:'none',cursor:'pointer'}

export default function WorkforcePage({sb,toast,user,lang,onTabChange}){
const isAr=lang!=='en';const T=(a,e)=>isAr?a:e
const[workers,setWorkers]=useState([]);const[facilities,setFacilities]=useState([]);const[brokers,setBrokers]=useState([])
const[permits,setPermits]=useState([]);const[iqamas,setIqamas]=useState([]);const[insurance,setInsurance]=useState([])
const[transfers,setTransfers]=useState([]);const[newIqamas,setNewIqamas]=useState([]);const[passports,setPassports]=useState([]);const[licenses,setLicenses]=useState([]);const[dependents,setDependents]=useState([]);const[contracts,setContracts]=useState([]);const[salaryHistory,setSalaryHistory]=useState([])
const[visas,setVisas]=useState([]);const[vehicles,setVehicles]=useState([]);const[timeline,setTimeline]=useState([]);const[transferReqs,setTransferReqs]=useState([]);const[gosiSubs,setGosiSubs]=useState([]);const[attFiles,setAttFiles]=useState([])
const[loading,setLoading]=useState(false);const[q,setQ]=useState('');const[statusFilter,setStatusFilter]=useState('all')
const[nationalityFilter,setNationalityFilter]=useState('all');const[facilityFilter,setFacilityFilter]=useState('all');const[joiningFilter,setJoiningFilter]=useState('all');const[alertFilter,setAlertFilter]=useState(null)
const[sortBy,setSortBy]=useState('created_at');const[page,setPage]=useState(0)
const[viewRow,setViewRow]=useState(null);const[viewTab,setViewTab]=useState('basic')
const[pop,setPop]=useState(null);const[form,setForm]=useState({});const[saving,setSaving]=useState(false)
const[completionMap,setCompletionMap]=useState({})
const[occMap,setOccMap]=useState({})
const[branches,setBranches]=useState([])
const[showAdv,setShowAdv]=useState(false)
const PER_PAGE=9
useEffect(()=>{onTabChange&&onTabChange({tab:'workers'})},[])
const load=useCallback(async()=>{setLoading(true);
// Phase 1: Essential data first (workers list + lookups) — show UI immediately
const[w,f,b,br]=await Promise.all([
sb.from('workers').select('*').is('deleted_at',null).order('created_at',{ascending:false}),
sb.from('facilities').select('id,name_ar,unified_national_number').is('deleted_at',null),
sb.from('brokers').select('id,name_ar').is('deleted_at',null),
sb.from('branches').select('id,name_ar').is('deleted_at',null)
]);setWorkers(w.data||[]);setFacilities(f.data||[]);setBrokers(b.data||[]);setBranches(br.data||[]);setLoading(false);
// Phase 2: Detail data in background — no blocking
Promise.all([
sb.from('work_permits').select('*').is('deleted_at',null).order('wp_expiry_date',{ascending:false}),
sb.from('iqama_cards').select('*').is('deleted_at',null).order('iqama_expiry_date',{ascending:false}),
sb.from('worker_insurance').select('*').is('deleted_at',null).order('end_date',{ascending:false}),
sb.from('worker_transfers').select('*,workers:worker_id(name_ar),facilities:facility_id(name_ar)').is('deleted_at',null).order('created_at',{ascending:false}),
Promise.resolve({data:[]}),
sb.from('worker_passports').select('*').order('expiry_date',{ascending:false}),
sb.from('worker_licenses').select('*').order('expiry_date',{ascending:false}),
sb.from('worker_dependents').select('*').order('created_at',{ascending:false}),
sb.from('contracts').select('*').order('start_date',{ascending:false}),
sb.from('worker_salary_history').select('*').order('change_date',{ascending:false}),
sb.from('worker_visas').select('*').order('created_at',{ascending:false}),
sb.from('worker_vehicles').select('*').order('created_at',{ascending:false}),
sb.from('worker_timeline').select('*').order('event_date',{ascending:false}),
sb.from('transfer_requests').select('*').order('created_at',{ascending:false}),
sb.from('gosi_subscriptions').select('*').order('created_at',{ascending:false}),
sb.from('attachments').select('*').is('deleted_at',null).order('created_at',{ascending:false})
]).then(([wp,iq,ins,tr,niq,pp,lic,dep,ctr,sh,vi,vh,tl,treq,gs,att])=>{setPermits(wp.data||[]);setIqamas(iq.data||[]);setInsurance(ins.data||[]);setTransfers(tr.data||[]);setNewIqamas(niq.data||[]);setPassports(pp.data||[]);setLicenses(lic.data||[]);setDependents(dep.data||[]);setContracts(ctr.data||[]);setSalaryHistory(sh.data||[]);setVisas(vi.data||[]);setVehicles(vh.data||[]);setTimeline(tl.data||[]);setTransferReqs(treq.data||[]);setGosiSubs(gs.data||[]);setAttFiles(att.data||[])})},[sb])
useEffect(()=>{load()},[load])
// v_worker_completeness removed — completionMap stays empty (feature disabled)
useEffect(()=>{if(!sb||!workers.length)return;const ids=[...new Set(workers.map(w=>w.occupation_id).filter(Boolean))];if(!ids.length)return;sb.from('lookup_items').select('id,value_ar').in('id',ids).then(({data})=>{if(data){const m={};data.forEach(r=>m[r.id]=r.value_ar);setOccMap(m)}})},[sb,workers])
const saveG=async(table,fd)=>{setSaving(true);try{const d={...fd};const id=d._id;delete d._id;Object.keys(d).forEach(k=>{if(d[k]==='')d[k]=null;if(d[k]==='true')d[k]=true;if(d[k]==='false')d[k]=false});if(id){d.updated_by=user?.id;const{error}=await sb.from(table).update(d).eq('id',id);if(error)throw error;toast(T('تم التعديل','Updated'))}else{d.created_by=user?.id;const{error}=await sb.from(table).insert(d);if(error)throw error;toast(T('تمت الإضافة','Added'))};setPop(null);load()}catch(e){toast('خطأ: '+e.message?.slice(0,80))}setSaving(false)}
const del=async(t,id)=>{if(!confirm(T('حذف؟','Delete?')))return;await sb.from(t).update({deleted_at:new Date().toISOString()}).eq('id',id);toast(T('تم الحذف','Deleted'));load()}

/* ═══ COMPUTED STATS ═══ */
const now=new Date()
const activeW=workers.filter(r=>r.worker_status==='active').length
const abscondedW=workers.filter(r=>r.worker_status==='absconded').length
const suspendedW=workers.filter(r=>r.worker_status==='suspended').length
const exitW=workers.filter(r=>r.worker_status==='final_exit').length
const recruitW=workers.filter(r=>r.joining_method==='recruitment').length
const transferW=workers.filter(r=>r.joining_method==='transfer').length
const expiredIqama=workers.filter(r=>r.iqama_expiry_date&&new Date(r.iqama_expiry_date)<now).length
const iqama30=workers.filter(r=>{if(!r.iqama_expiry_date)return false;const d=Math.ceil((new Date(r.iqama_expiry_date)-now)/86400000);return d>=0&&d<=30}).length
const iqama90=workers.filter(r=>{if(!r.iqama_expiry_date)return false;const d=Math.ceil((new Date(r.iqama_expiry_date)-now)/86400000);return d>30&&d<=90}).length
const incompleteFile=Object.values(completionMap).filter(c=>c.completion_pct<80).length

/* ═══ NATIONALITIES LIST ═══ */
const natList=[...new Set(workers.map(w=>w.nationality).filter(Boolean))].sort()

/* ═══ FILTER LOGIC ═══ */
let filtered=workers.filter(r=>{
if(statusFilter!=='all'&&r.worker_status!==statusFilter)return false
if(nationalityFilter!=='all'&&r.nationality!==nationalityFilter)return false
if(facilityFilter!=='all'&&r.facility_id!==facilityFilter)return false
if(joiningFilter!=='all'&&r.joining_method!==joiningFilter)return false
if(alertFilter==='expired'&&!(r.iqama_expiry_date&&new Date(r.iqama_expiry_date)<now))return false
if(alertFilter==='30d'){const d=r.iqama_expiry_date?Math.ceil((new Date(r.iqama_expiry_date)-now)/86400000):-1;if(!(d>=0&&d<=30))return false}
if(alertFilter==='90d'){const d=r.iqama_expiry_date?Math.ceil((new Date(r.iqama_expiry_date)-now)/86400000):-1;if(!(d>30&&d<=90))return false}
if(alertFilter==='incomplete'&&(completionMap[r.id]?.completion_pct||0)>=80)return false
if(q){const s=q.toLowerCase();return(r.name_ar||'').includes(s)||(r.name_en||'').toLowerCase().includes(s)||(r.iqama_number||'').includes(s)||(r.worker_number||'').includes(s)||(r.phone||'').includes(s)}
return true})
if(sortBy==='name')filtered.sort((a,b)=>(a.name_ar||'').localeCompare(b.name_ar||''))
else if(sortBy==='completion')filtered.sort((a,b)=>(completionMap[a.id]?.completion_pct||0)-(completionMap[b.id]?.completion_pct||0))
const totalPages=Math.ceil(filtered.length/PER_PAGE),paged=filtered.slice(page*PER_PAGE,(page+1)*PER_PAGE)

const wFields=[{k:'worker_number',l:T('رقم العامل','Worker No.'),d:1},{k:'name_ar',l:T('الاسم بالعربي','Name (AR)'),r:1},{k:'name_en',l:T('الاسم بالإنجليزي','Name (EN)'),d:1},{k:'gender',l:T('الجنس','Gender'),opts:['male','female']},{k:'nationality',l:T('الجنسية','Nationality')},{k:'phone',l:T('الجوال','Phone'),d:1},{k:'iqama_number',l:T('رقم الإقامة','Iqama No.'),d:1,r:1},{k:'border_number',l:T('رقم الحدود','Border No.'),d:1},{k:'passport_number',l:T('رقم الجواز','Passport'),d:1},{k:'passport_expiry',l:T('انتهاء الجواز','Passport Exp.'),t:'date'},{k:'facility_id',l:T('المنشأة','Facility'),opts:facilities.map(f=>({v:f.id,l:f.name_ar}))},{k:'broker_id',l:T('الوسيط','Broker'),opts:brokers.map(b=>({v:b.id,l:b.name_ar}))},{k:'birth_date_g',l:T('تاريخ الميلاد','Birth Date'),t:'date'},{k:'gosi_salary',l:T('راتب التأمينات','GOSI Salary'),d:1},{k:'qiwa_salary',l:T('راتب قوى','Qiwa Salary'),d:1},{k:'worker_status',l:T('الحالة','Status'),opts:[{v:'active',l:T('نشط','Active')},{v:'absconded',l:T('هارب','Absconded')},{v:'final_exit',l:T('خروج نهائي','Final Exit')},{v:'transferred',l:T('منقول','Transferred')},{v:'suspended',l:T('معلّق','Suspended')}],r:1},{k:'dependents_count',l:T('عدد المرافقين','Dependents'),d:1},{k:'identity_type',l:T('نوع الهوية','ID Type'),opts:[{v:'citizen',l:T('مواطن','Citizen')},{v:'resident',l:T('مقيم','Resident')}]},{k:'marital_status',l:T('الحالة الاجتماعية','Marital'),opts:[{v:'single',l:T('أعزب','Single')},{v:'married',l:T('متزوج','Married')},{v:'divorced',l:T('مطلق','Divorced')},{v:'widowed',l:T('أرمل','Widowed')}]},{k:'skill_classification',l:T('تصنيف المهارات','Skill'),opts:[{v:'basic',l:T('أساسي','Basic')},{v:'skilled',l:T('ماهر','Skilled')},{v:'highly_skilled',l:T('عالي المهارة','Highly Skilled')}]},{k:'joining_method',l:T('طريقة الانضمام','Joining'),opts:[{v:'recruitment',l:T('استقدام','Recruitment')},{v:'transfer',l:T('نقل كفالة','Transfer')}]},{k:'entry_port',l:T('منفذ الدخول','Entry Port')},{k:'iqama_expiry_date',l:T('انتهاء الإقامة','Iqama Exp.'),t:'date'},{k:'notes',l:T('ملاحظات','Notes'),w:1}]
const openAdd=()=>{const init={};wFields.forEach(f=>init[f.k]='');init.worker_status='active';init.gender='male';setForm(init);setPop('worker')}
const openEdit=r=>{const init={_id:r.id};wFields.forEach(f=>init[f.k]=r[f.k]??'');setForm(init);setPop('worker')}
const fBtnS=a=>({padding:'6px 14px',borderRadius:8,fontSize:10,fontWeight:a?700:500,color:a?C.gold:'rgba(255,255,255,.4)',background:a?'rgba(201,168,76,.08)':'transparent',border:a?'1px solid rgba(201,168,76,.15)':'1px solid rgba(255,255,255,.06)',cursor:'pointer',whiteSpace:'nowrap'})
const SB=<div style={{flex:1,minWidth:180,position:'relative'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="2" style={{position:'absolute',top:12,[isAr?'right':'left']:12}}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><input value={q} onChange={e=>{setQ(e.target.value);setPage(0)}} placeholder={T('بحث ...','Search ...')} style={{width:'100%',height:38,padding:isAr?'0 36px 0 14px':'0 14px 0 36px',border:'1.5px solid rgba(255,255,255,.08)',borderRadius:10,fontFamily:F,fontSize:12,color:'var(--tx)',background:'rgba(255,255,255,.04)',outline:'none'}}/></div>

/* ═══ VIEW DATA ═══ */
const wP=viewRow?permits.filter(p=>p.worker_id===viewRow.id):[],wI=viewRow?iqamas.filter(i=>i.worker_id===viewRow.id):[],wIn=viewRow?insurance.filter(i=>i.worker_id===viewRow.id):[],wNI=viewRow?newIqamas.filter(i=>i.worker_id===viewRow.id):[],wPP=viewRow?passports.filter(p=>p.worker_id===viewRow.id):[],wLic=viewRow?licenses.filter(l=>l.worker_id===viewRow.id):[],wDep=viewRow?dependents.filter(d=>d.worker_id===viewRow.id):[],wCtr=viewRow?contracts.filter(c=>c.worker_id===viewRow.id):[],wSH=viewRow?salaryHistory.filter(s=>s.worker_id===viewRow.id):[]
const wVis=viewRow?visas.filter(v=>v.worker_id===viewRow.id):[],wVeh=viewRow?vehicles.filter(v=>v.worker_id===viewRow.id):[],wTL=viewRow?timeline.filter(t=>t.worker_id===viewRow.id):[],wTReq=viewRow?transferReqs.filter(t=>t.worker_id===viewRow.id):[],wGosi=viewRow?gosiSubs.filter(g=>g.worker_id===viewRow.id):[],wAtt=viewRow?attFiles.filter(a=>a.entity_type==='worker'&&a.entity_id===viewRow.id):[],wTr=viewRow?transfers.filter(t=>t.worker_id===viewRow.id):[]

return<div>
{/* ═══ HEADER ═══ */}
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}><div><div style={{fontSize:22,fontWeight:800,color:'var(--tx)'}}>العمالة</div><div style={{fontSize:12,color:'var(--tx4)',marginTop:4}}>إدارة بيانات العمّال والوثائق والعقود والتنقلات</div></div>
<button onClick={openAdd} style={bS}>+ عامل</button></div>

{/* ═══ 3 GROUPED STAT CARDS ═══ */}
<div style={{display:'grid',gridTemplateColumns:'auto 1fr 1fr',gap:12,marginBottom:20}}>
{/* Card 1: Total */}
<div style={{padding:'20px 24px',borderRadius:14,background:'linear-gradient(135deg,rgba(201,168,76,.1),rgba(201,168,76,.03))',border:'1px solid rgba(201,168,76,.18)',display:'flex',alignItems:'center',gap:16}}>
<div><div style={{fontSize:13,fontWeight:700,color:C.gold}}>إجمالي العمال</div><div style={{fontSize:10,color:'rgba(201,168,76,.5)',marginTop:2}}>مسجل في النظام</div></div>
<div style={{display:'flex',flexDirection:'column',alignItems:'center'}}><div style={{fontSize:38,fontWeight:900,color:C.gold,lineHeight:1}}>{nm(workers.length)}</div>
{expiredIqama>0&&<div style={{display:'inline-flex',alignItems:'center',gap:4,marginTop:6,padding:'2px 8px',borderRadius:5,background:'rgba(192,57,43,.08)',border:'1px solid rgba(192,57,43,.12)'}}><div style={{width:5,height:5,borderRadius:'50%',background:C.red}}/><span style={{fontSize:9,fontWeight:600,color:C.red}}>{expiredIqama} إقامة منتهية</span></div>}
</div></div>
{/* Card 2: صحة الإقامات — health card */}
{(()=>{const validIqama=workers.filter(r=>{if(!r.iqama_expiry_date)return false;const d=Math.ceil((new Date(r.iqama_expiry_date)-now)/86400000);return d>90}).length;const total=workers.length||1;const pctValid=Math.round(validIqama/total*100);const pct90=Math.round(iqama90/total*100);const pct30=Math.round(iqama30/total*100);const pctExp=Math.round(expiredIqama/total*100);return<div style={{padding:'18px 20px',borderRadius:14,background:'linear-gradient(135deg,rgba(39,160,70,.04),rgba(39,160,70,.01))',border:'1.5px solid rgba(39,160,70,.18)'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}><div style={{fontSize:12,fontWeight:700,color:C.ok}}>صحة الإقامات</div><div style={{fontSize:9,color:'var(--tx5)'}}>الأمن</div></div>
<div style={{display:'flex',gap:16,marginBottom:14}}>
{[[T('سارية','Valid'),validIqama,C.ok],[T('تنتهي 90 يوم','90 days'),iqama90,'#e67e22'],[T('تنتهي 30 يوم','30 days'),iqama30,C.gold],[T('منتهية','Expired'),expiredIqama,C.red]].map(([l,v,c],i)=><div key={i} style={{flex:1,textAlign:'center'}}>
<div style={{fontSize:22,fontWeight:800,color:c,lineHeight:1}}>{v}</div>
<div style={{fontSize:9,fontWeight:600,color:c,opacity:.7,marginTop:4}}>{l}</div>
</div>)}
</div>
{/* Progress bar */}
<div style={{height:8,borderRadius:4,overflow:'hidden',display:'flex',background:'rgba(255,255,255,.06)',marginBottom:10}}>
<div style={{width:pctValid+'%',background:C.ok,transition:'width .3s'}}/>
<div style={{width:pct90+'%',background:'#e67e22',transition:'width .3s'}}/>
<div style={{width:pct30+'%',background:C.gold,transition:'width .3s'}}/>
<div style={{width:pctExp+'%',background:C.red,transition:'width .3s'}}/>
</div>
</div>})()}
{/* Card 3: Joining — percentages */}
{(()=>{const total=workers.length||1;const pctR=Math.round(recruitW/total*100);const pctT=Math.round(transferW/total*100);return<div style={{padding:'20px 18px',borderRadius:14,background:'linear-gradient(135deg,rgba(52,131,180,.08),rgba(52,131,180,.02))',border:'1px solid rgba(52,131,180,.15)'}}>
<div style={{fontSize:10,fontWeight:600,color:'rgba(52,131,180,.7)',marginBottom:14}}>طريقة الانضمام</div>
<div style={{display:'flex',gap:16,marginBottom:12}}>
{[[T('استقدام','Recruit'),pctR+'%',recruitW,C.blue],[T('نقل كفالة','Transfer'),pctT+'%',transferW,'#9b59b6']].map(([l,pct,v,c],i)=><div key={i} style={{flex:1,textAlign:'center'}}>
<div style={{fontSize:26,fontWeight:900,color:c,lineHeight:1}}>{pct}</div>
<div style={{fontSize:9,fontWeight:600,color:c,opacity:.7,marginTop:4}}>{l}</div>
<div style={{fontSize:9,color:'var(--tx5)',marginTop:2}}>{v}</div>
</div>)}
</div>
<div style={{height:6,borderRadius:3,overflow:'hidden',display:'flex',background:'rgba(255,255,255,.06)'}}>
<div style={{width:pctR+'%',background:C.blue,transition:'width .3s'}}/>
<div style={{width:pctT+'%',background:'#9b59b6',transition:'width .3s'}}/>
</div>
</div>})()}
</div>


{/* ═══ FILTERS — matching FacilitiesPage ═══ */}
{<div style={{borderTop:'1px solid var(--bd)',paddingTop:16,marginBottom:12}}>
<div style={{display:'flex',gap:8,marginBottom:10,alignItems:'center'}}>
{SB}
<button onClick={()=>setShowAdv(!showAdv)} style={{height:38,padding:'0 14px',borderRadius:10,border:'1px solid '+(showAdv?'rgba(201,168,76,.2)':'rgba(255,255,255,.08)'),background:showAdv?'rgba(201,168,76,.06)':'rgba(255,255,255,.04)',color:showAdv?C.gold:'var(--tx4)',fontFamily:F,fontSize:10,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:5,whiteSpace:'nowrap'}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>{T('بحث متقدم','Advanced')}</button>
<button style={{height:34,padding:'0 12px',borderRadius:8,border:'1px solid rgba(52,131,180,.15)',background:'rgba(52,131,180,.06)',color:C.blue,fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>{T('تصدير','Export')}</button>
</div>
{showAdv&&<div style={{marginBottom:14,padding:'14px 16px',background:'rgba(255,255,255,.02)',borderRadius:12,border:'1px solid rgba(201,168,76,.1)'}}>
<div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10}}>
{[[T('الحالة','Status'),'status','select',[{v:'active',l:T('نشط','Active')},{v:'absconded',l:T('هارب','Absconded')},{v:'suspended',l:T('معلّق','Suspended')},{v:'final_exit',l:T('خروج نهائي','Final Exit')}]],
[T('الجنسية','Nationality'),'nationality','select',natList.map(n=>({v:n,l:n}))],
[T('المنشأة','Facility'),'facility','select',facilities.map(f=>({v:f.id,l:f.name_ar}))],
[T('طريقة الانضمام','Joining'),'joining','select',[{v:'recruitment',l:T('استقدام','Recruitment')},{v:'transfer',l:T('نقل كفالة','Transfer')}]],
[T('الترتيب','Sort'),'sort','select',[{v:'created_at',l:T('الأحدث','Newest')},{v:'name',l:T('الاسم','Name')},{v:'completion',l:T('الأقل اكتمالاً','Least Complete')}]]
].map(([label,key,type,opts],i)=><div key={i}>
<div style={{fontSize:9,fontWeight:600,color:'var(--tx5)',marginBottom:4}}>{label}</div>
<select value={key==='status'?statusFilter:key==='nationality'?nationalityFilter:key==='facility'?facilityFilter:key==='joining'?joiningFilter:sortBy} onChange={e=>{const v=e.target.value;if(key==='status'){setStatusFilter(v);setPage(0)}else if(key==='nationality'){setNationalityFilter(v);setPage(0)}else if(key==='facility'){setFacilityFilter(v);setPage(0)}else if(key==='joining'){setJoiningFilter(v);setPage(0)}else{setSortBy(v)}}} style={{width:'100%',height:32,padding:'0 8px',border:'1px solid rgba(255,255,255,.08)',borderRadius:7,fontFamily:F,fontSize:10,color:'var(--tx)',background:'rgba(255,255,255,.04)',outline:'none',cursor:'pointer'}}><option value={key==='sort'?'created_at':'all'}>{T('الكل','All')}</option>{opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select>
</div>)}
</div>
<button onClick={()=>{setStatusFilter('all');setNationalityFilter('all');setFacilityFilter('all');setJoiningFilter('all');setSortBy('created_at');setPage(0)}} style={{marginTop:10,height:28,padding:'0 14px',borderRadius:6,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.04)',color:'var(--tx4)',fontFamily:F,fontSize:10,cursor:'pointer'}}>{T('مسح الفلاتر','Clear Filters')}</button>
</div>}
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
<span style={{fontSize:11,fontWeight:600,color:'var(--tx4)'}}>{filtered.length} {T('عامل','workers')}</span>
{filtered.length!==workers.length&&<span style={{fontSize:10,color:'var(--tx5)'}}>{T('من أصل','out of')} {workers.length}</span>}
</div>
</div>}

{/* ═══ WORKER CARDS GRID ═══ */}
{loading?<div style={{textAlign:'center',padding:60,color:'var(--tx6)'}}>...</div>:<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14}}>{paged.map(r=>{const fac=facilities.find(f=>f.id===r.facility_id);const gC=r.gender==='female'?'#9b59b6':C.blue
const wpCount=permits.filter(p=>p.worker_id===r.id).length
const iqDays=r.iqama_expiry_date?Math.ceil((new Date(r.iqama_expiry_date)-now)/86400000):null
const iqClr=iqDays===null?'#555':iqDays<0?C.red:iqDays<30?'#e67e22':iqDays<90?C.gold:C.ok
const hasIns=insurance.some(i=>i.worker_id===r.id&&i.end_date&&new Date(i.end_date)>=now)
const gosiOk=r.gosi_status==='active'||r.gosi_status==='registered'||hasIns
const qiwaOk=r.qiwa_contract_status==='active'||r.qiwa_contract_status==='registered'
const borderClr=r.worker_status==='absconded'?'rgba(192,57,43,.25)':r.worker_status==='final_exit'?'rgba(153,153,153,.15)':'var(--bd)'
const cc=natCodes[r.nationality]||''
return<div key={r.id} onClick={()=>{setViewRow(r);setViewTab('basic')}} style={{background:'var(--bg)',border:'1px solid '+borderClr,borderRadius:14,overflow:'hidden',cursor:'pointer',transition:'.15s'}} onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(201,168,76,.2)'} onMouseLeave={e=>e.currentTarget.style.borderColor=borderClr}>
{/* Header */}
<div style={{padding:'14px 16px',display:'flex',gap:12,alignItems:'flex-start'}}>
{/* Avatar with small flag */}
<div style={{width:44,height:44,borderRadius:12,background:gC+'15',border:'1px solid '+gC+'25',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:gC,flexShrink:0,position:'relative'}}>
{(r.name_ar||'ع')[0]}
{cc&&<img src={'https://flagcdn.com/w40/'+cc.toLowerCase()+'.png'} alt="" style={{position:'absolute',bottom:-2,left:-2,width:16,height:12,borderRadius:2,objectFit:'cover',border:'1px solid rgba(0,0,0,.3)'}} onError={e=>e.target.style.display='none'}/>}
</div>
<div style={{flex:1,minWidth:0}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}><span style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>{r.name_ar}</span><Badge v={r.worker_status}/></div>
<div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4,flexWrap:'wrap'}}>
{r.worker_number&&<span style={{fontSize:9,color:'var(--tx5)',direction:'ltr'}}>{r.worker_number}</span>}
{r.worker_number&&r.nationality&&<span style={{color:'rgba(255,255,255,.1)'}}>·</span>}
{r.nationality&&<span style={{fontSize:9,color:'var(--tx5)'}}>{r.nationality}</span>}
</div>
{/* Tags */}
<div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
{r.joining_method&&<span style={{fontSize:8,padding:'2px 7px',borderRadius:4,background:(r.joining_method==='recruitment'?'rgba(52,131,180,.06)':'rgba(155,89,182,.06)'),border:'1px solid '+(r.joining_method==='recruitment'?'rgba(52,131,180,.08)':'rgba(155,89,182,.08)'),color:r.joining_method==='recruitment'?'rgba(52,131,180,.7)':'rgba(155,89,182,.7)',fontWeight:600}}>{valAr[r.joining_method]||r.joining_method}</span>}
{occMap[r.occupation_id]&&<span style={{fontSize:8,padding:'2px 7px',borderRadius:4,background:'rgba(201,168,76,.06)',border:'1px solid rgba(201,168,76,.08)',color:'rgba(201,168,76,.7)',fontWeight:600}}>{occMap[r.occupation_id]}</span>}
{(()=>{const br=branches.find(x=>x.id===r.branch_id);return br?<span style={{fontSize:8,padding:'2px 7px',borderRadius:4,background:'rgba(39,160,70,.06)',border:'1px solid rgba(39,160,70,.1)',color:'rgba(39,160,70,.7)',fontWeight:600}}>{br.name_ar}</span>:null})()}
</div>
</div>
{/* 3-dot menu */}
<div style={{position:'relative',flexShrink:0}} onClick={e=>e.stopPropagation()}>
<div onClick={e=>{e.stopPropagation();const menu=e.currentTarget.nextSibling;menu.style.display=menu.style.display==='none'?'flex':'none'}} style={{width:28,height:28,borderRadius:7,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.06)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5" r="1.5" fill="rgba(255,255,255,.35)"/><circle cx="12" cy="12" r="1.5" fill="rgba(255,255,255,.35)"/><circle cx="12" cy="19" r="1.5" fill="rgba(255,255,255,.35)"/></svg>
</div>
<div style={{display:'none',position:'absolute',top:'100%',left:0,zIndex:50,flexDirection:'column',background:'#252525',border:'1px solid rgba(255,255,255,.12)',borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,.5)',overflow:'hidden',minWidth:120,marginTop:4}}>
<div onClick={()=>openEdit(r)} style={{padding:'8px 14px',fontSize:10,fontWeight:600,color:'rgba(255,255,255,.7)',cursor:'pointer',display:'flex',alignItems:'center',gap:6}} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.04)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="1.8"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>تعديل</div>
<div onClick={()=>del('workers',r.id)} style={{padding:'8px 14px',fontSize:10,fontWeight:600,color:'rgba(192,57,43,.7)',cursor:'pointer',display:'flex',alignItems:'center',gap:6}} onMouseEnter={e=>e.currentTarget.style.background='rgba(192,57,43,.04)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>حذف</div>
</div>
</div>
</div>
{/* 4 Indicators bar */}
<div style={{display:'flex',borderTop:'1px solid rgba(255,255,255,.04)',background:'rgba(255,255,255,.01)'}}>
{[[iqDays===null?'—':iqDays<0?'منتهية!':iqDays+' يوم','الإقامة',iqClr],[wpCount>0?'مشترك':'—','رخصة العمل',wpCount>0?C.ok:'#555'],[gosiOk?'ساري':'—','التأمينات',gosiOk?C.ok:'#555'],[qiwaOk?'مشترك':'—','عقد قوى',qiwaOk?C.ok:'#555']].map(([val,lbl,clr],i)=><div key={i} style={{flex:1,padding:'7px 6px',textAlign:'center',borderLeft:i>0?'1px solid rgba(255,255,255,.03)':'none'}}>
<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:3,marginBottom:2}}><div style={{width:4,height:4,borderRadius:'50%',background:clr}}/><span style={{fontSize:7,color:clr,opacity:.8}}>{lbl}</span></div>
<div style={{fontSize:10,fontWeight:700,color:clr}}>{val}</div>
</div>)}
</div>
{/* Footer: Iqama + Facility + Unified */}
<div style={{borderTop:'1px solid rgba(255,255,255,.04)',background:'rgba(255,255,255,.015)',padding:'8px 12px'}}>
<div style={{display:'flex',gap:10,alignItems:'center',marginBottom:4}}>
<div style={{display:'flex',alignItems:'center',gap:4,flex:1}}>
<span style={{fontSize:8,color:'var(--tx6)'}}>الإقامة</span>
<span style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,.6)',direction:'ltr',letterSpacing:'.5px'}}>{r.iqama_number||'—'}</span>
{r.iqama_number&&<button onClick={e=>{e.stopPropagation();navigator.clipboard.writeText(r.iqama_number);toast&&toast('تم النسخ')}} style={{width:18,height:18,borderRadius:4,border:'none',background:'rgba(255,255,255,.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,flexShrink:0}}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>}
</div>
</div>
<div style={{display:'flex',gap:6,alignItems:'center'}}>
<span style={{fontSize:9,color:'rgba(255,255,255,.4)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{fac?.name_ar||'—'}</span>
{fac?.unified_national_number&&<><span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.5)',direction:'ltr',letterSpacing:'.5px'}}>{fac.unified_national_number}</span>
<button onClick={e=>{e.stopPropagation();navigator.clipboard.writeText(fac.unified_national_number);toast&&toast('تم النسخ')}} style={{width:18,height:18,borderRadius:4,border:'none',background:'rgba(255,255,255,.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,flexShrink:0}}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button></>}
</div>
</div>
{/* Special Status */}
{r.worker_status==='absconded'&&<div style={{padding:'6px 12px',background:'rgba(192,57,43,.06)',borderTop:'1px solid rgba(192,57,43,.12)',display:'flex',alignItems:'center',gap:6}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
<span style={{fontSize:9,fontWeight:600,color:C.red}}>بلاغ هروب — المنشأة: {fac?.name_ar||'—'}</span>
</div>}
{r.worker_status==='final_exit'&&<div style={{padding:'6px 12px',background:'rgba(153,153,153,.04)',borderTop:'1px solid rgba(153,153,153,.1)'}}>
<span style={{fontSize:9,fontWeight:600,color:'#999'}}>عائد بتاريخ {r.exit_date||'—'} — الملف مؤرشف</span>
</div>}
{r.outside_kingdom&&r.worker_status==='active'&&<div style={{padding:'6px 12px',background:'rgba(201,168,76,.04)',borderTop:'1px solid rgba(201,168,76,.1)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<span style={{fontSize:9,fontWeight:600,color:C.gold}}>خارج المملكة</span>
{r.visa_return_date&&<span style={{fontSize:9,fontWeight:700,color:C.gold}}>عودة: {r.visa_return_date}</span>}
</div>}
</div>})}</div>}

{/* ═══ PAGINATION ═══ */}
{totalPages>1&&(()=>{const btnS=(dis)=>({width:30,height:30,borderRadius:7,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.04)',color:dis?'rgba(255,255,255,.15)':'var(--tx4)',cursor:dis?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12});return<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:18}}>
<div style={{flex:1}}/>
<div style={{display:'flex',gap:4,alignItems:'center'}}>
<button onClick={()=>setPage(0)} disabled={page===0} style={btnS(page===0)}>{'«'}</button>
<button onClick={()=>setPage(Math.max(0,page-1))} disabled={page===0} style={btnS(page===0)}>{'‹'}</button>
<span style={{width:30,height:30,borderRadius:7,border:'1px solid rgba(201,168,76,.3)',background:'rgba(201,168,76,.15)',color:'#c9a84c',fontFamily:F,fontSize:12,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center'}}>{page+1}</span>
<button onClick={()=>setPage(Math.min(totalPages-1,page+1))} disabled={page===totalPages-1} style={btnS(page===totalPages-1)}>{'›'}</button>
<button onClick={()=>setPage(totalPages-1)} disabled={page===totalPages-1} style={btnS(page===totalPages-1)}>{'»'}</button>
</div>
<div style={{flex:1,display:'flex',justifyContent:'flex-end'}}><span style={{fontSize:10,color:'var(--tx5)'}}>عرض {page*PER_PAGE+1}-{Math.min((page+1)*PER_PAGE,filtered.length)} من {filtered.length}</span></div>
</div>})()}

{/* ═══ SIDE PANEL — 8 TABS ═══ */}
{viewRow&&(()=>{const gC=viewRow.gender==='female'?'#9b59b6':C.blue;const fac=facilities.find(f=>f.id===viewRow.facility_id)
const vt=[{id:'basic',l:'البيانات الأساسية'},{id:'docs',l:'الوثائق',n:wNI.length+wPP.length+wVis.length+wLic.length},{id:'contract',l:'العقد والراتب',n:wCtr.length},{id:'permits',l:'رخصة العمل والتأمينات',n:wP.length+wIn.length},{id:'moves',l:'التنقلات',n:wTr.length+wTReq.length},{id:'family',l:'المرافقون والمركبات',n:wDep.length+wVeh.length},{id:'timeline',l:'السجل الزمني',n:wTL.length},{id:'notes',l:'الملاحظات والمرفقات',n:(viewRow.notes?1:0)+wAtt.length}]
return<div onClick={()=>setViewRow(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(920px,95vw)',height:'min(650px,88vh)',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.5)',border:'1px solid rgba(201,168,76,.15)'}}>
{/* Header */}
<div style={{background:'var(--bg)',padding:'18px 24px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',borderBottom:'1px solid rgba(201,168,76,.12)',flexShrink:0}}>
<div style={{display:'flex',gap:12,alignItems:'center'}}><div style={{width:48,height:48,borderRadius:14,background:gC+'15',border:'1.5px solid '+gC+'25',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:800,color:gC}}>{(viewRow.name_ar||'ع')[0]}</div><div><div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}><div style={{fontSize:18,fontWeight:800,color:'var(--tx)'}}>{viewRow.name_ar}</div><Badge v={viewRow.worker_status}/></div>{viewRow.name_en&&<div style={{fontSize:12,color:'var(--tx4)',direction:'ltr'}}>{viewRow.name_en}</div>}{fac&&<div style={{fontSize:10,color:'rgba(201,168,76,.5)',marginTop:2}}>{fac.name_ar}</div>}</div></div>
<div style={{display:'flex',gap:6}}><button onClick={()=>{setViewRow(null);openEdit(viewRow)}} style={{height:32,padding:'0 16px',borderRadius:8,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.08)',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer'}}>تعديل</button><button onClick={()=>setViewRow(null)} style={{width:32,height:32,borderRadius:8,background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{'\u2715'}</button></div></div>
{/* Body */}
<div style={{flex:1,display:'flex',overflow:'hidden'}}>
{/* Sidebar tabs */}
<div style={{width:180,background:'var(--bg)',borderLeft:'1px solid rgba(255,255,255,.04)',padding:'12px 8px',overflowY:'auto',flexShrink:0,scrollbarWidth:'none'}}>{vt.map(t=><div key={t.id} onClick={()=>setViewTab(t.id)} style={{padding:'10px 12px',borderRadius:8,marginBottom:3,fontSize:11,fontWeight:viewTab===t.id?700:500,color:viewTab===t.id?C.gold:'rgba(255,255,255,.38)',background:viewTab===t.id?'rgba(201,168,76,.08)':'transparent',border:viewTab===t.id?'1px solid rgba(201,168,76,.12)':'1px solid transparent',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',transition:'.15s'}}><span>{t.l}</span>{t.n!==undefined&&<span style={{fontSize:9,fontWeight:700,color:viewTab===t.id?C.gold:'rgba(255,255,255,.2)',background:viewTab===t.id?'rgba(201,168,76,.15)':'rgba(255,255,255,.04)',padding:'1px 6px',borderRadius:4,minWidth:18,textAlign:'center'}}>{t.n}</span>}</div>)}</div>
{/* Content */}
<div style={{flex:1,overflowY:'auto',padding:'20px 24px',scrollbarWidth:'none'}}>

{/* TAB 1: البيانات الأساسية */}
{viewTab==='basic'&&<div style={{display:'flex',flexDirection:'column',gap:18}}>
<div><SectionHdr t="الهوية"/><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}><IB l="رقم العامل" v={viewRow.worker_number} copy toast={toast}/><IB l="رقم الإقامة" v={viewRow.iqama_number} copy toast={toast}/><IB l="رقم الحدود" v={viewRow.border_number} copy toast={toast}/><IB l="رقم الجواز" v={viewRow.passport_number} copy toast={toast}/><IB l="انتهاء الجواز" v={viewRow.passport_expiry}/><IB l="نوع الهوية" v={viewRow.identity_type}/><IB l="الجنسية" v={viewRow.nationality}/><IB l="تاريخ الميلاد" v={viewRow.birth_date_g}/><IB l="الجنس" v={viewRow.gender}/></div></div>
<div><SectionHdr t="العمل"/><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}><IB l="المنشأة" v={fac?.name_ar}/><IB l="الحالة" v={viewRow.worker_status} isSt/><IB l="تاريخ الدخول" v={viewRow.entry_date_saudi}/><IB l="طريقة الانضمام" v={viewRow.joining_method}/><IB l="صاحب العمل السابق" v={viewRow.old_employer_name}/><IB l="تصنيف المهارات" v={viewRow.skill_classification}/><IB l="حالة التأمينات" v={viewRow.gosi_status}/><IB l="حالة عقد قوى" v={viewRow.qiwa_contract_status}/><IB l="انتهاء عقد قوى" v={viewRow.qiwa_contract_expiry_date}/></div></div>
<div><SectionHdr t="التواصل"/><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}><IB l="الجوال" v={viewRow.phone} copy toast={toast}/></div></div>
<div><SectionHdr t="الإقامة"/><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}><IB l="انتهاء الإقامة" v={viewRow.iqama_expiry_date}/><IB l="منفذ الدخول" v={viewRow.entry_port}/><IB l="الحالة الاجتماعية" v={viewRow.marital_status}/><IB l="عدد المرافقين" v={viewRow.dependents_count}/></div></div>
{viewRow.notes&&<div><SectionHdr t="ملاحظات"/><IB l="ملاحظات" v={viewRow.notes}/></div>}
</div>}

{/* TAB 2: الوثائق */}
{viewTab==='docs'&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
{wNI.length>0&&<><SectionHdr t="الإقامات"/>{wNI.map(i=>{const isE=i.expiry_date&&new Date(i.expiry_date)<now;return<div key={i.id} style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'14px 16px',border:'1px solid '+(isE?'rgba(192,57,43,.12)':'rgba(255,255,255,.04)'),marginBottom:6}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><div style={{display:'flex',gap:8,alignItems:'center'}}>{i.version_number&&<span style={{fontSize:12,fontWeight:800,color:C.gold}}>v{i.version_number}</span>}{i.is_current&&<span style={{fontSize:9,color:C.ok,background:'rgba(39,160,70,.1)',padding:'2px 6px',borderRadius:4}}>الحالية</span>}{isE&&<span style={{fontSize:9,fontWeight:700,color:C.red,background:'rgba(192,57,43,.1)',padding:'2px 6px',borderRadius:4}}>منتهية</span>}</div><Badge v={i.status}/></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}><IB l="الإصدار" v={i.issue_date}/><IB l="الانتهاء" v={i.expiry_date}/><IB l="مكان الإصدار" v={i.issue_place}/></div></div>})}</>}
{wPP.length>0&&<><SectionHdr t="الجوازات"/>{wPP.map(p=>{const isE=p.expiry_date&&new Date(p.expiry_date)<now;return<div key={p.id} style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'14px 16px',border:'1px solid '+(isE?'rgba(192,57,43,.12)':'rgba(255,255,255,.04)'),marginBottom:6}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span style={{fontSize:13,fontWeight:700,color:'var(--tx2)',direction:'ltr'}}>{p.passport_number||'—'}</span>{p.is_current?<span style={{fontSize:9,color:C.ok,background:'rgba(39,160,70,.1)',padding:'2px 6px',borderRadius:4}}>الحالي</span>:isE&&<span style={{fontSize:9,fontWeight:700,color:C.red,background:'rgba(192,57,43,.1)',padding:'2px 6px',borderRadius:4}}>منتهي</span>}</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}><IB l="الإصدار" v={p.issue_date}/><IB l="الانتهاء" v={p.expiry_date}/><IB l="مكان الإصدار" v={p.issue_place}/></div></div>})}</>}
{wVis.length>0&&<><SectionHdr t="التأشيرات"/>{wVis.map(v=><div key={v.id} style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'14px 16px',border:'1px solid rgba(255,255,255,.04)',marginBottom:6}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span style={{fontSize:12,fontWeight:700,color:'var(--tx2)'}}>{v.visa_number||'—'}</span><Badge v={v.status}/></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}><IB l="النوع" v={v.visa_type}/><IB l="تاريخ الإصدار" v={v.issue_date}/><IB l="الخروج قبل" v={v.exit_before}/></div></div>)}</>}
{wLic.length>0&&<><SectionHdr t="رخص السياقة"/>{wLic.map(l=>{const isE=l.expiry_date&&new Date(l.expiry_date)<now;return<div key={l.id} style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'14px 16px',border:'1px solid '+(isE?'rgba(192,57,43,.12)':'rgba(255,255,255,.04)'),marginBottom:6}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>{l.license_type||'رخصة'}</span>{isE&&<span style={{fontSize:9,fontWeight:700,color:C.red,background:'rgba(192,57,43,.1)',padding:'2px 6px',borderRadius:4}}>منتهية</span>}</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><IB l="الإصدار" v={l.issue_date}/><IB l="الانتهاء" v={l.expiry_date}/></div></div>})}</>}
{wNI.length===0&&wPP.length===0&&wVis.length===0&&wLic.length===0&&<div style={{textAlign:'center',padding:40,color:'var(--tx6)'}}>لا توجد وثائق</div>}
</div>}

{/* TAB 3: العقد والراتب */}
{viewTab==='contract'&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}><div style={{background:'rgba(201,168,76,.04)',borderRadius:12,padding:'20px',border:'1px solid rgba(201,168,76,.08)',textAlign:'center'}}><div style={{fontSize:10,color:'rgba(201,168,76,.5)',marginBottom:8}}>راتب التأمينات</div><div style={{fontSize:28,fontWeight:900,color:C.gold}}>{viewRow.gosi_salary?nm(viewRow.gosi_salary):'—'}</div><div style={{fontSize:9,color:'rgba(201,168,76,.3)',marginTop:4}}>ريال</div></div><div style={{background:'rgba(52,131,180,.04)',borderRadius:12,padding:'20px',border:'1px solid rgba(52,131,180,.08)',textAlign:'center'}}><div style={{fontSize:10,color:'rgba(52,131,180,.5)',marginBottom:8}}>راتب قوى</div><div style={{fontSize:28,fontWeight:900,color:C.blue}}>{viewRow.qiwa_salary?nm(viewRow.qiwa_salary):'—'}</div><div style={{fontSize:9,color:'rgba(52,131,180,.3)',marginTop:4}}>ريال</div></div></div>
{wCtr.length>0&&<><SectionHdr t="العقود"/>{wCtr.map(c=><div key={c.id} style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'14px 16px',border:'1px solid rgba(255,255,255,.04)',marginBottom:6}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><div style={{display:'flex',gap:8,alignItems:'center'}}><span style={{fontSize:12,fontWeight:700,color:C.gold}}>#{c.contract_number||'—'}</span><span style={{fontSize:10,color:'var(--tx4)'}}>{c.contract_type||'—'}</span></div><Badge v={c.status}/></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}><IB l="البداية" v={c.start_date}/><IB l="النهاية" v={c.end_date||'غير محدد'}/><IB l="المدة" v={c.duration_months?c.duration_months+' شهر':(c.duration_type||'—')}/></div></div>)}</>}
{wSH.length>0&&<><SectionHdr t="تاريخ الرواتب"/>{wSH.map(s=>{const up=Number(s.new_salary)>Number(s.old_salary);return<div key={s.id} style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'14px 16px',border:'1px solid rgba(255,255,255,.04)',marginBottom:6}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><div style={{display:'flex',gap:8,alignItems:'center'}}><span style={{fontSize:11,color:'var(--tx4)'}}>{s.change_date}</span>{s.source&&<span style={{fontSize:9,color:C.blue,background:'rgba(52,131,180,.1)',padding:'2px 6px',borderRadius:4}}>{s.source}</span>}</div><span style={{fontSize:12,fontWeight:700,color:up?C.ok:C.red}}>{up?'↑':'↓'} {nm(s.new_salary)}</span></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}><IB l="القديم" v={s.old_salary?nm(s.old_salary):null}/><IB l="الجديد" v={s.new_salary?nm(s.new_salary):null}/><IB l="السبب" v={s.reason}/></div></div>})}</>}
</div>}

{/* TAB 4: رخصة العمل والتأمينات */}
{viewTab==='permits'&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
{<><SectionHdr t="رخص العمل"/>{wP.length===0?<div style={{textAlign:'center',padding:30,color:'var(--tx6)'}}>لا توجد رخص</div>:wP.map(p=>{const isE=p.wp_expiry_date&&new Date(p.wp_expiry_date)<now;return<div key={p.id} style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'14px 16px',border:'1px solid '+(isE?'rgba(192,57,43,.12)':'rgba(255,255,255,.04)'),marginBottom:6}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><div style={{display:'flex',gap:8,alignItems:'center'}}>{p.wp_order&&<span style={{fontSize:12,fontWeight:800,color:C.gold}}>#{p.wp_order}</span>}{p.is_reduced&&<span style={{fontSize:9,color:C.gold,background:'rgba(201,168,76,.1)',padding:'2px 6px',borderRadius:4}}>مخفضة</span>}{isE&&<span style={{fontSize:9,fontWeight:700,color:C.red,background:'rgba(192,57,43,.1)',padding:'2px 6px',borderRadius:4}}>منتهية</span>}</div>{p.duration_months&&<span style={{fontSize:10,color:C.blue}}>{p.duration_months} شهر</span>}</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><IB l="الإصدار" v={p.wp_issue_date}/><IB l="الانتهاء" v={p.wp_expiry_date}/></div></div>})}</>}
{wGosi.length>0&&<><SectionHdr t="اشتراكات التأمينات"/>{wGosi.map(g=><div key={g.id} style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'14px 16px',border:'1px solid rgba(255,255,255,.04)',marginBottom:6}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}><IB l="بداية الاشتراك" v={g.subscription_start}/><IB l="الراتب الأساسي" v={g.base_salary?nm(g.base_salary):null}/><IB l="المبلغ الإجمالي" v={g.total_amount?nm(g.total_amount):null}/></div></div>)}</>}
{<><SectionHdr t="التأمين الطبي"/>{wIn.length===0?<div style={{textAlign:'center',padding:30,color:'var(--tx6)'}}>لا يوجد تأمين</div>:wIn.map(i=>{const isE=i.end_date&&new Date(i.end_date)<now;return<div key={i.id} style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'14px 16px',border:'1px solid '+(isE?'rgba(192,57,43,.12)':'rgba(255,255,255,.04)'),marginBottom:6}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>{i.insurance_company}</span>{isE&&<span style={{fontSize:9,fontWeight:700,color:C.red,background:'rgba(192,57,43,.1)',padding:'2px 6px',borderRadius:4}}>منتهي</span>}</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><IB l="البداية" v={i.start_date}/><IB l="النهاية" v={i.end_date}/></div></div>})}</>}
</div>}

{/* TAB 5: التنقلات */}
{viewTab==='moves'&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
{wTr.length>0&&<><SectionHdr t="عمليات النقل"/>{wTr.map(tr=>{const prClr=Number(tr.profit||0)>=0?C.ok:C.red;return<div key={tr.id} style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'14px 16px',border:'1px solid rgba(255,255,255,.04)',marginBottom:6}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><div style={{display:'flex',gap:8,alignItems:'center'}}><Badge v={tr.status}/>{tr.transfer_date&&<span style={{fontSize:10,color:'var(--tx5)',direction:'ltr'}}>{tr.transfer_date}</span>}{tr.new_employer_name&&<span style={{fontSize:10,color:'var(--tx4)'}}>→ {tr.new_employer_name}</span>}</div><span style={{fontSize:14,fontWeight:800,color:prClr}}>{Number(tr.profit||0).toLocaleString()}</span></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8}}><IB l="التكلفة" v={tr.total_cost?nm(tr.total_cost):null}/><IB l="رسوم النقل" v={tr.transfer_fee?nm(tr.transfer_fee):null}/><IB l="المحصّل" v={tr.client_charge?nm(tr.client_charge):null}/><IB l="الربح" v={tr.profit?nm(tr.profit):null}/></div></div>})}</>}
{wTReq.length>0&&<><SectionHdr t="طلبات النقل"/>{wTReq.map(r=><div key={r.id} style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'14px 16px',border:'1px solid rgba(255,255,255,.04)',marginBottom:6}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span style={{fontSize:12,fontWeight:700,color:C.gold}}>#{r.request_number||'—'}</span><Badge v={r.status}/></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}><IB l="صاحب العمل السابق" v={r.previous_employer}/><IB l="تاريخ الطلب" v={r.request_date}/><IB l="تاريخ الموافقة" v={r.approval_date}/></div></div>)}</>}
{wTr.length===0&&wTReq.length===0&&<div style={{textAlign:'center',padding:40,color:'var(--tx6)'}}>لا توجد تنقلات</div>}
</div>}

{/* TAB 6: المرافقون والمركبات */}
{viewTab==='family'&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
{wDep.length>0&&<><SectionHdr t="التابعين"/>{wDep.map(d=><div key={d.id} style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'14px 16px',border:'1px solid rgba(255,255,255,.04)',marginBottom:6}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>{d.full_name||'—'}</span><span style={{fontSize:10,color:d.gender==='female'?'#9b59b6':C.blue,background:(d.gender==='female'?'rgba(155,89,182,.1)':'rgba(52,131,180,.1)'),padding:'2px 8px',borderRadius:4}}>{d.relation_type||'—'}</span></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><IB l="تاريخ الميلاد" v={d.date_of_birth}/><IB l="رقم الهوية" v={d.identity_number} copy toast={toast}/></div></div>)}</>}
{wVeh.length>0&&<><SectionHdr t="المركبات"/>{wVeh.map(v=><div key={v.id} style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'14px 16px',border:'1px solid rgba(255,255,255,.04)',marginBottom:6}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}><IB l="رقم اللوحة" v={v.plate_number} copy toast={toast}/><IB l="النوع" v={v.vehicle_type}/><IB l="الموديل" v={v.model}/><IB l="السنة" v={v.year}/><IB l="انتهاء الاستمارة" v={v.registration_expiry}/></div></div>)}</>}
{wDep.length===0&&wVeh.length===0&&<div style={{textAlign:'center',padding:40,color:'var(--tx6)'}}>لا توجد بيانات</div>}
</div>}

{/* TAB 7: السجل الزمني */}
{viewTab==='timeline'&&<div style={{display:'flex',flexDirection:'column',gap:0}}>
{wTL.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)'}}>لا يوجد سجل زمني</div>:wTL.map((ev,i)=><div key={ev.id} style={{display:'flex',gap:14,paddingBottom:20}}>
<div style={{display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0,width:20}}>
<div style={{width:12,height:12,borderRadius:'50%',background:i===0?C.gold:'rgba(255,255,255,.15)',border:'2px solid '+(i===0?C.gold:'rgba(255,255,255,.1)'),flexShrink:0}}/>
{i<wTL.length-1&&<div style={{width:2,flex:1,background:'rgba(255,255,255,.06)',marginTop:4}}/>}
</div>
<div style={{flex:1,background:'rgba(255,255,255,.025)',borderRadius:10,padding:'14px 16px',border:'1px solid rgba(255,255,255,.04)'}}>
<div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:12,fontWeight:700,color:'var(--tx2)'}}>{ev.title||ev.event_type||'—'}</span><span style={{fontSize:10,color:'var(--tx5)',direction:'ltr'}}>{ev.event_date}</span></div>
{ev.description&&<div style={{fontSize:11,color:'var(--tx4)',marginBottom:6}}>{ev.description}</div>}
{(ev.from_status||ev.to_status)&&<div style={{display:'flex',gap:6,alignItems:'center'}}>{ev.from_status&&<Badge v={ev.from_status}/>}{ev.to_status&&<><span style={{color:'var(--tx5)'}}>→</span><Badge v={ev.to_status}/></>}</div>}
</div>
</div>)}
</div>}

{/* TAB 8: الملاحظات والمرفقات */}
{viewTab==='notes'&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
{viewRow.notes&&<><SectionHdr t="ملاحظات"/><div style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'14px 16px',border:'1px solid rgba(255,255,255,.04)',fontSize:13,color:'var(--tx3)',lineHeight:1.8}}>{viewRow.notes}</div></>}
{wAtt.length>0&&<><SectionHdr t="المرفقات"/>{wAtt.map(a=><div key={a.id} style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'12px 16px',border:'1px solid rgba(255,255,255,.04)',marginBottom:6,display:'flex',alignItems:'center',gap:12}}>
<div style={{width:36,height:36,borderRadius:8,background:'rgba(52,131,180,.08)',border:'1px solid rgba(52,131,180,.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="1.8"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg></div>
<div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,color:'var(--tx2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.file_name||'مرفق'}</div><div style={{fontSize:9,color:'var(--tx5)',marginTop:2}}>{a.category||''}{a.file_size?' · '+Math.round(a.file_size/1024)+'KB':''}</div></div>
</div>)}</>}
{!viewRow.notes&&wAtt.length===0&&<div style={{textAlign:'center',padding:40,color:'var(--tx6)'}}>لا توجد ملاحظات أو مرفقات</div>}
</div>}

</div></div></div></div>})()}

{/* ═══ FORM POPUPS ═══ */}
{pop==='worker'&&<FormPopup title={form._id?'تعديل عامل':'إضافة عامل'} fields={wFields} form={form} setForm={setForm} onSave={()=>saveG('workers',form)} onClose={()=>setPop(null)} saving={saving} isAr={isAr}/>}
{pop==='permit'&&<FormPopup title={form._id?'تعديل رخصة':'إضافة رخصة'} fields={[{k:'facility_id',l:'المنشأة',opts:facilities.map(f=>({v:f.id,l:f.name_ar}))},{k:'worker_id',l:'العامل',opts:workers.map(w=>({v:w.id,l:w.name_ar})),r:1},{k:'wp_issue_date',l:'الإصدار',t:'date',r:1},{k:'wp_expiry_date',l:'الانتهاء',t:'date',r:1},{k:'duration_months',l:'المدة',d:1},{k:'is_reduced',l:'مخفضة',opts:['true','false']},{k:'notes',l:'ملاحظات',w:1}]} form={form} setForm={setForm} onSave={()=>saveG('work_permits',form)} onClose={()=>setPop(null)} saving={saving} isAr={isAr}/>}
{pop==='iqama'&&<FormPopup title={form._id?'تعديل إقامة':'إضافة إقامة'} fields={[{k:'facility_id',l:'المنشأة',opts:facilities.map(f=>({v:f.id,l:f.name_ar}))},{k:'worker_id',l:'العامل',opts:workers.map(w=>({v:w.id,l:w.name_ar})),r:1},{k:'iqama_issue_date',l:'الإصدار',t:'date',r:1},{k:'iqama_expiry_date',l:'الانتهاء',t:'date',r:1},{k:'duration_months',l:'المدة',d:1},{k:'notes',l:'ملاحظات',w:1}]} form={form} setForm={setForm} onSave={()=>saveG('iqama_cards',form)} onClose={()=>setPop(null)} saving={saving} isAr={isAr}/>}
{pop==='ins'&&<FormPopup title={form._id?'تعديل تأمين':'إضافة تأمين'} fields={[{k:'worker_id',l:'العامل',opts:workers.map(w=>({v:w.id,l:w.name_ar})),r:1},{k:'insurance_company',l:'الشركة',r:1},{k:'insurance_policy_no',l:'رقم الوثيقة',d:1},{k:'start_date',l:'البداية',t:'date',r:1},{k:'end_date',l:'النهاية',t:'date',r:1},{k:'notes',l:'ملاحظات',w:1}]} form={form} setForm={setForm} onSave={()=>saveG('worker_insurance',form)} onClose={()=>setPop(null)} saving={saving} isAr={isAr}/>}
</div>}
