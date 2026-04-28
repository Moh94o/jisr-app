import React,{useState,useEffect,useCallback} from 'react'
const F="'Cairo','Tajawal',sans-serif"
const C={dk:'#171717',md:'#222222',fm:'#1e1e1e',gold:'#D4A017',gl:'#dcc06e',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}
const GLASS={background:'linear-gradient(160deg,#333 0%,#2A2A2A 50%,#232323 100%)',backdropFilter:'blur(20px) saturate(160%)',WebkitBackdropFilter:'blur(20px) saturate(160%)',border:'1px solid rgba(255,255,255,.08)',borderRadius:16,boxShadow:'0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}
const fS={width:'100%',height:40,padding:'0 14px',border:'1px solid rgba(255,255,255,.06)',borderRadius:10,fontFamily:F,fontSize:13,fontWeight:500,color:'var(--tx)',outline:'none',background:'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'}
const bS={height:40,padding:'0 18px',borderRadius:11,border:'1px solid rgba(212,160,23,.45)',background:'linear-gradient(180deg,rgba(212,160,23,.22) 0%,rgba(212,160,23,.10) 100%)',color:C.gold,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:'0 2px 8px rgba(212,160,23,.18), inset 0 1px 0 rgba(212,160,23,.18)',transition:'.2s'}
const secBtn={height:40,padding:'0 14px',borderRadius:11,border:'1px solid rgba(255,255,255,.06)',background:'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',color:'rgba(255,255,255,.78)',fontFamily:F,fontSize:12,fontWeight:500,cursor:'pointer',boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'}
const sMap={active:C.ok,absconded:C.red,final_exit:'#999',transferred:'#e67e22',suspended:'#e67e22',male:C.blue,female:'#9b59b6',completed:C.ok,pending:'#e67e22',cancelled:C.red,expired:'#999',recruitment:C.blue,transfer:'#9b59b6',approved:C.ok,rejected:C.red}
const valAr={male:'ذكر',female:'أنثى',single:'أعزب',married:'متزوج',divorced:'مطلق',widowed:'أرمل',active:'نشط',absconded:'هارب',suspended:'معلّق',final_exit:'خروج نهائي',transferred:'منقول',citizen:'مواطن',resident:'مقيم',basic:'أساسي',skilled:'ماهر',highly_skilled:'عالي المهارة',completed:'مكتمل',pending:'قيد الانتظار',cancelled:'ملغى',expired:'منتهي',registered:'مسجّل',not_registered:'غير مسجّل',true:'نعم',false:'لا',recruitment:'استقدام',transfer:'نقل كفالة',approved:'مقبول',rejected:'مرفوض',professional:'محترف',unskilled:'غير ماهر',semi_skilled:'شبه ماهر',laborer:'عامل',technician:'فني',engineer:'مهندس'}
const natFlags={'أردني':'🇯🇴','أفغاني':'🇦🇫','أوغندي':'🇺🇬','إثيوبي':'🇪🇹','إندونيسي':'🇮🇩','باكستاني':'🇵🇰','بنغلاديشي':'🇧🇩','تركي':'🇹🇷','تونسي':'🇹🇳','سريلانكي':'🇱🇰','سعودي':'🇸🇦','سعودية':'🇸🇦','سوداني':'🇸🇩','سوري':'🇸🇾','فلبيني':'🇵🇭','كيني':'🇰🇪','مصري':'🇪🇬','مغربي':'🇲🇦','ميانمار':'🇲🇲','نيبالي':'🇳🇵','هندي':'🇮🇳','يمني':'🇾🇪'}
const natCodes={'أردني':'JO','أفغاني':'AF','أوغندي':'UG','إثيوبي':'ET','إندونيسي':'ID','باكستاني':'PK','بنغلاديشي':'BD','تركي':'TR','تونسي':'TN','سريلانكي':'LK','سعودي':'SA','سعودية':'SA','سوداني':'SD','سوري':'SY','فلبيني':'PH','كيني':'KE','مصري':'EG','مغربي':'MA','ميانمار':'MM','نيبالي':'NP','هندي':'IN','يمني':'YE'}
const nm=v=>Number(v||0).toLocaleString('en-US')
const Badge=({v})=>{const cl=sMap[v]||'#888';const lbl=valAr[v]||v;return<span style={{fontSize:10,fontWeight:600,padding:'4px 10px',borderRadius:6,background:cl+'15',color:cl,display:'inline-flex',alignItems:'center',gap:5,fontFamily:F}}><span style={{width:5,height:5,borderRadius:'50%',background:cl}}/>{lbl||'\u2014'}</span>}
const EditBtn=({onClick})=><button onClick={e=>{e.stopPropagation();onClick()}} style={{width:28,height:28,borderRadius:7,border:'1px solid rgba(212,160,23,.15)',background:'rgba(212,160,23,.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="1.8"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>
const DelBtn=({onClick})=><button onClick={e=>{e.stopPropagation();onClick()}} style={{width:28,height:28,borderRadius:7,border:'1px solid rgba(192,57,43,.1)',background:'rgba(192,57,43,.04)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
const IB=({l,v,copy,isSt,toast})=>{const dv=valAr[v]||v;return<div style={{background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',borderRadius:10,padding:'10px 12px',border:'1px solid rgba(255,255,255,.06)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 4px rgba(0,0,0,.22)'}}><div style={{fontSize:11,fontWeight:600,color:'var(--tx5)',marginBottom:6}}>{l}</div><div style={{display:'flex',alignItems:'center',gap:6}}><div style={{fontSize:13,fontWeight:600,color:isSt?(sMap[v]||'rgba(255,255,255,.85)'):'rgba(255,255,255,.85)',direction:copy?'ltr':'inherit',fontFamily:F}}>{isSt?<Badge v={v}/>:(dv||'\u2014')}</div>{copy&&v&&<button onClick={e=>{e.stopPropagation();navigator.clipboard.writeText(String(v));toast&&toast(T('تم النسخ','Copied'))}} style={{width:20,height:20,borderRadius:5,border:'none',background:'rgba(255,255,255,.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>}</div></div>}
const FI=({f,form,setForm,isAr})=>{const v=form[f.k]||'';const set=val=>setForm(p=>({...p,[f.k]:val}));return<div style={{gridColumn:f.w?'1/-1':undefined}}><div style={{fontSize:12,fontWeight:600,color:'var(--tx3)',marginBottom:6,fontFamily:F}}>{f.l}{f.r&&<span style={{color:C.red}}> *</span>}</div>{f.opts?<select value={v} onChange={e=>set(e.target.value)} style={fS}><option value="">— اختر —</option>{f.opts.map(o=>typeof o==='object'?<option key={o.v} value={o.v}>{o.l}</option>:<option key={o} value={o}>{o}</option>)}</select>:f.t==='date'?<input type="date" value={v} onChange={e=>set(e.target.value)} style={{...fS,direction:'ltr'}}/>:f.w?<textarea value={v} onChange={e=>set(e.target.value)} rows={2} style={{...fS,height:'auto',padding:12,resize:'vertical'}}/>:<input value={v} onChange={e=>set(e.target.value)} style={{...fS,direction:f.d?'ltr':'rtl'}}/>}</div>}
const FormPopup=({title,fields,form,setForm,onSave,onClose,saving,isAr})=><div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16,fontFamily:F}}><div onClick={e=>e.stopPropagation()} style={{...GLASS,width:560,maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden'}}><div style={{height:3,background:'linear-gradient(90deg,transparent,'+C.gold+' 30%,'+C.gl+' 50%,'+C.gold+' 70%,transparent)'}}/><div style={{padding:'18px 22px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,.07)'}}><div style={{fontSize:15,fontWeight:600,color:'rgba(255,255,255,.93)',letterSpacing:'-.2px'}}>{title}</div><button onClick={onClose} style={{width:28,height:28,borderRadius:8,background:'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',border:'1px solid rgba(255,255,255,.06)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{'\u2715'}</button></div><div style={{flex:1,overflowY:'auto',padding:'18px 22px'}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>{fields.map(f=><FI key={f.k} f={f} form={form} setForm={setForm} isAr={isAr}/>)}</div></div><div style={{padding:'14px 22px',borderTop:'1px solid rgba(255,255,255,.07)',display:'flex',justifyContent:'space-between',flexDirection:'row-reverse'}}><button onClick={onSave} disabled={saving} style={{...bS,height:42,minWidth:130,opacity:saving?.6:1}}>{saving?'...':form._id?'حفظ':'إضافة'}</button><button onClick={onClose} style={{...secBtn,height:42,padding:'0 18px'}}>إلغاء</button></div></div></div>
const SectionHdr=({t})=><div style={{fontSize:12,fontWeight:600,color:C.gold,marginBottom:12,paddingBottom:8,borderBottom:'1px solid rgba(212,160,23,.18)',letterSpacing:'.3px',fontFamily:F}}>{t}</div>
const selS={height:36,padding:'0 12px',borderRadius:10,border:'1px solid rgba(255,255,255,.06)',background:'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',color:'rgba(255,255,255,.78)',fontFamily:F,fontSize:11,fontWeight:500,outline:'none',cursor:'pointer',boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)'}

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
// transfer_calculation is keyed by iqama_number, not worker_id — workforce-side transfer history is no longer joined here.
Promise.resolve({data:[]}),
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
const saveG=async(table,fd)=>{setSaving(true);try{const d={...fd};const id=d._id;delete d._id;Object.keys(d).forEach(k=>{if(d[k]==='')d[k]=null;if(d[k]==='true')d[k]=true;if(d[k]==='false')d[k]=false});if(id){d.updated_by=user?.id;const{error}=await sb.from(table).update(d).eq('id',id);if(error)throw error;toast(T('تم التعديل','Updated'))}else{d.created_by=user?.id;const{error}=await sb.from(table).insert(d);if(error)throw error;toast(T('تمت الإضافة','Added'))};setPop(null);load()}catch(e){toast(T('خطأ: ','Error: ')+e.message?.slice(0,80))}setSaving(false)}
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
const fBtnS=a=>({padding:'6px 14px',borderRadius:8,fontSize:10,fontWeight:a?700:500,color:a?C.gold:'rgba(255,255,255,.4)',background:a?'rgba(212,160,23,.08)':'transparent',border:a?'1px solid rgba(212,160,23,.15)':'1px solid rgba(255,255,255,.06)',cursor:'pointer',whiteSpace:'nowrap'})
const SB=<div style={{flex:1,minWidth:180,position:'relative'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.32)" strokeWidth="2" style={{position:'absolute',top:13,[isAr?'right':'left']:14}}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><input value={q} onChange={e=>{setQ(e.target.value);setPage(0)}} placeholder={T('بحث ...','Search ...')} style={{width:'100%',height:40,padding:isAr?'0 36px 0 14px':'0 14px 0 36px',background:'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',border:'1px solid rgba(255,255,255,.06)',borderRadius:11,fontFamily:F,fontSize:14,fontWeight:400,color:'var(--tx)',outline:'none',boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'}}/></div>

/* ═══ VIEW DATA ═══ */
const wP=viewRow?permits.filter(p=>p.worker_id===viewRow.id):[],wI=viewRow?iqamas.filter(i=>i.worker_id===viewRow.id):[],wIn=viewRow?insurance.filter(i=>i.worker_id===viewRow.id):[],wNI=viewRow?newIqamas.filter(i=>i.worker_id===viewRow.id):[],wPP=viewRow?passports.filter(p=>p.worker_id===viewRow.id):[],wLic=viewRow?licenses.filter(l=>l.worker_id===viewRow.id):[],wDep=viewRow?dependents.filter(d=>d.worker_id===viewRow.id):[],wCtr=viewRow?contracts.filter(c=>c.worker_id===viewRow.id):[],wSH=viewRow?salaryHistory.filter(s=>s.worker_id===viewRow.id):[]
const wVis=viewRow?visas.filter(v=>v.worker_id===viewRow.id):[],wVeh=viewRow?vehicles.filter(v=>v.worker_id===viewRow.id):[],wTL=viewRow?timeline.filter(t=>t.worker_id===viewRow.id):[],wTReq=viewRow?transferReqs.filter(t=>t.worker_id===viewRow.id):[],wGosi=viewRow?gosiSubs.filter(g=>g.worker_id===viewRow.id):[],wAtt=viewRow?attFiles.filter(a=>a.entity_type==='worker'&&a.entity_id===viewRow.id):[],wTr=viewRow?transfers.filter(t=>t.worker_id===viewRow.id):[]

return<div style={{fontFamily:F}}>
{/* ═══ HEADER ═══ */}
<div style={{marginBottom:24,display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:14,flexWrap:'wrap'}}>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:24,fontWeight:600,color:'rgba(255,255,255,.93)',letterSpacing:'-.3px',lineHeight:1.2}}>{T('العمالة','Workforce')}</div>
<div style={{fontSize:13,fontWeight:500,color:'var(--tx4)',marginTop:12,lineHeight:1.6}}>{T('إدارة بيانات العمّال والوثائق والعقود والتنقلات','Worker records, documents, contracts and transfers management')}</div>
</div>
<button onClick={openAdd} style={bS}>+ {T('عامل','Worker')}</button>
</div>

{/* ═══ 3 GROUPED STAT CARDS ═══ */}
<div style={{display:'grid',gridTemplateColumns:'auto 1fr 1fr',gap:14,marginBottom:14}}>
{/* Card 1: Total */}
<div style={{...GLASS,padding:'18px 22px',display:'flex',alignItems:'center',gap:18}}>
<div>
<div style={{fontSize:12,fontWeight:600,color:'var(--tx2)',letterSpacing:'.3px'}}>{T('إجمالي العمال','Total Workers')}</div>
<div style={{fontSize:11,fontWeight:500,color:'var(--tx5)',marginTop:4}}>{T('مسجل في النظام','Registered')}</div>
</div>
<div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
<div style={{display:'flex',alignItems:'center',gap:8}}>
<span style={{width:8,height:8,borderRadius:'50%',background:C.gold,boxShadow:'0 0 6px '+C.gold}}/>
<div style={{fontSize:32,fontWeight:700,color:C.gold,letterSpacing:'-.5px',direction:'ltr',lineHeight:1}}>{nm(workers.length)}</div>
</div>
{expiredIqama>0&&<div style={{display:'inline-flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:6,background:C.red+'15',color:C.red}}>
<span style={{width:5,height:5,borderRadius:'50%',background:C.red}}/>
<span style={{fontSize:10,fontWeight:600}}>{expiredIqama} {T('إقامة منتهية','expired')}</span>
</div>}
</div>
</div>
{/* Card 2: صحة الإقامات — health card */}
{(()=>{const validIqama=workers.filter(r=>{if(!r.iqama_expiry_date)return false;const d=Math.ceil((new Date(r.iqama_expiry_date)-now)/86400000);return d>90}).length;const total=workers.length||1;const pctValid=Math.round(validIqama/total*100);const pct90=Math.round(iqama90/total*100);const pct30=Math.round(iqama30/total*100);const pctExp=Math.round(expiredIqama/total*100);return<div style={{...GLASS,padding:'18px 22px'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
<div style={{fontSize:13,fontWeight:600,color:'var(--tx2)',letterSpacing:'.3px'}}>{T('صحة الإقامات','Iqama Health')}</div>
<div style={{fontSize:11,fontWeight:500,color:'var(--tx5)'}}>{T('الأمن','Security')}</div>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8,marginBottom:14}}>
{[[T('سارية','Valid'),validIqama,C.ok],[T('تنتهي 90 يوم','90 days'),iqama90,'#e67e22'],[T('تنتهي 30 يوم','30 days'),iqama30,C.gold],[T('منتهية','Expired'),expiredIqama,C.red]].map(([l,v,c],i)=><div key={i} style={{padding:'7px 12px',borderRadius:10,background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',border:'1px solid rgba(255,255,255,.06)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 4px rgba(0,0,0,.22)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
<div style={{display:'flex',alignItems:'center',gap:6}}>
<span style={{width:6,height:6,borderRadius:'50%',background:c,boxShadow:'0 0 5px '+c}}/>
<div style={{fontSize:18,fontWeight:700,color:c,letterSpacing:'-.3px',direction:'ltr',lineHeight:1}}>{v}</div>
</div>
<div style={{fontSize:11,color:'var(--tx2)',fontWeight:600}}>{l}</div>
</div>)}
</div>
{/* Progress bar */}
<div style={{height:6,borderRadius:3,overflow:'hidden',display:'flex',background:'rgba(0,0,0,.3)',boxShadow:'inset 0 1px 2px rgba(0,0,0,.4)'}}>
<div style={{width:pctValid+'%',background:C.ok,transition:'width .3s'}}/>
<div style={{width:pct90+'%',background:'#e67e22',transition:'width .3s'}}/>
<div style={{width:pct30+'%',background:C.gold,transition:'width .3s'}}/>
<div style={{width:pctExp+'%',background:C.red,transition:'width .3s'}}/>
</div>
</div>})()}
{/* Card 3: Joining — percentages */}
{(()=>{const total=workers.length||1;const pctR=Math.round(recruitW/total*100);const pctT=Math.round(transferW/total*100);return<div style={{...GLASS,padding:'18px 22px'}}>
<div style={{fontSize:13,fontWeight:600,color:'var(--tx2)',letterSpacing:'.3px',marginBottom:14}}>{T('طريقة الانضمام','Joining Method')}</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
{[[T('استقدام','Recruit'),pctR+'%',recruitW,C.blue],[T('نقل كفالة','Transfer'),pctT+'%',transferW,'#9b59b6']].map(([l,pct,v,c],i)=><div key={i} style={{padding:'7px 12px',borderRadius:10,background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',border:'1px solid rgba(255,255,255,.06)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 4px rgba(0,0,0,.22)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
<div style={{display:'flex',alignItems:'center',gap:6}}>
<span style={{width:6,height:6,borderRadius:'50%',background:c,boxShadow:'0 0 5px '+c}}/>
<div style={{fontSize:20,fontWeight:700,color:c,letterSpacing:'-.3px',direction:'ltr',lineHeight:1}}>{pct}</div>
</div>
<div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:2}}>
<div style={{fontSize:11,color:'var(--tx2)',fontWeight:600}}>{l}</div>
<div style={{fontSize:10,color:'var(--tx5)',fontWeight:500,direction:'ltr'}}>{v}</div>
</div>
</div>)}
</div>
<div style={{height:6,borderRadius:3,overflow:'hidden',display:'flex',background:'rgba(0,0,0,.3)',boxShadow:'inset 0 1px 2px rgba(0,0,0,.4)'}}>
<div style={{width:pctR+'%',background:C.blue,transition:'width .3s'}}/>
<div style={{width:pctT+'%',background:'#9b59b6',transition:'width .3s'}}/>
</div>
</div>})()}
</div>


{/* ═══ FILTERS ═══ */}
{<div style={{marginBottom:14}}>
<div style={{display:'flex',gap:10,marginBottom:10,alignItems:'center'}}>
{SB}
<button onClick={()=>setShowAdv(!showAdv)} style={{...secBtn,...(showAdv?{border:'1px solid rgba(212,160,23,.45)',background:'linear-gradient(180deg,rgba(212,160,23,.18) 0%,rgba(212,160,23,.08) 100%)',color:C.gold}:{}),display:'inline-flex',alignItems:'center',gap:6,whiteSpace:'nowrap'}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>{T('بحث متقدم','Advanced')}</button>
<button style={{...secBtn,color:C.blue,border:'1px solid rgba(52,131,180,.3)',display:'inline-flex',alignItems:'center',gap:6,whiteSpace:'nowrap'}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>{T('تصدير','Export')}</button>
</div>
{showAdv&&<div style={{...GLASS,marginBottom:14,padding:'14px 16px'}}>
<div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10}}>
{[[T('الحالة','Status'),'status','select',[{v:'active',l:T('نشط','Active')},{v:'absconded',l:T('هارب','Absconded')},{v:'suspended',l:T('معلّق','Suspended')},{v:'final_exit',l:T('خروج نهائي','Final Exit')}]],
[T('الجنسية','Nationality'),'nationality','select',natList.map(n=>({v:n,l:n}))],
[T('المنشأة','Facility'),'facility','select',facilities.map(f=>({v:f.id,l:f.name_ar}))],
[T('طريقة الانضمام','Joining'),'joining','select',[{v:'recruitment',l:T('استقدام','Recruitment')},{v:'transfer',l:T('نقل كفالة','Transfer')}]],
[T('الترتيب','Sort'),'sort','select',[{v:'created_at',l:T('الأحدث','Newest')},{v:'name',l:T('الاسم','Name')},{v:'completion',l:T('الأقل اكتمالاً','Least Complete')}]]
].map(([label,key,type,opts],i)=><div key={i}>
<div style={{fontSize:11,fontWeight:600,color:'var(--tx3)',marginBottom:6,fontFamily:F}}>{label}</div>
<select value={key==='status'?statusFilter:key==='nationality'?nationalityFilter:key==='facility'?facilityFilter:key==='joining'?joiningFilter:sortBy} onChange={e=>{const v=e.target.value;if(key==='status'){setStatusFilter(v);setPage(0)}else if(key==='nationality'){setNationalityFilter(v);setPage(0)}else if(key==='facility'){setFacilityFilter(v);setPage(0)}else if(key==='joining'){setJoiningFilter(v);setPage(0)}else{setSortBy(v)}}} style={selS}><option value={key==='sort'?'created_at':'all'}>{T('الكل','All')}</option>{opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select>
</div>)}
</div>
<button onClick={()=>{setStatusFilter('all');setNationalityFilter('all');setFacilityFilter('all');setJoiningFilter('all');setSortBy('created_at');setPage(0)}} style={{...secBtn,marginTop:12,height:32,padding:'0 14px',fontSize:11}}>{T('مسح الفلاتر','Clear Filters')}</button>
</div>}
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
<span style={{fontSize:12,fontWeight:600,color:'var(--tx2)',fontFamily:F}}>{filtered.length} {T('عامل','workers')}</span>
{filtered.length!==workers.length&&<span style={{fontSize:11,color:'var(--tx5)',fontFamily:F}}>{T('من أصل','out of')} {workers.length}</span>}
</div>
</div>}

{/* ═══ WORKER CARDS GRID ═══ */}
{loading?<div style={{textAlign:'center',padding:60,color:'var(--tx6)',fontFamily:F}}>...</div>:<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14}}>{paged.map(r=>{const fac=facilities.find(f=>f.id===r.facility_id);const gC=r.gender==='female'?'#9b59b6':C.blue
const wpCount=permits.filter(p=>p.worker_id===r.id).length
const iqDays=r.iqama_expiry_date?Math.ceil((new Date(r.iqama_expiry_date)-now)/86400000):null
const iqClr=iqDays===null?'#555':iqDays<0?C.red:iqDays<30?'#e67e22':iqDays<90?C.gold:C.ok
const hasIns=insurance.some(i=>i.worker_id===r.id&&i.end_date&&new Date(i.end_date)>=now)
const gosiOk=r.gosi_status==='active'||r.gosi_status==='registered'||hasIns
const qiwaOk=r.qiwa_contract_status==='active'||r.qiwa_contract_status==='registered'
const accentClr=r.worker_status==='absconded'?C.red:r.worker_status==='final_exit'?'#999':C.gold
const cc=natCodes[r.nationality]||''
return<div key={r.id} onClick={()=>{setViewRow(r);setViewTab('basic')}} style={{...GLASS,overflow:'hidden',cursor:'pointer',transition:'.2s',transform:'translateY(0)'}} onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 16px 36px rgba(0,0,0,.42), 0 4px 10px rgba(0,0,0,.22), 0 0 0 1px '+accentClr+'33, inset 0 1px 0 rgba(255,255,255,.08)'}} onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}}>
{/* Header */}
<div style={{padding:'14px 16px',display:'flex',gap:12,alignItems:'flex-start'}}>
{/* Avatar with small flag */}
<div style={{width:44,height:44,borderRadius:12,background:'linear-gradient(180deg,'+gC+'22 0%,'+gC+'11 100%)',border:'1px solid '+gC+'30',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:700,color:gC,flexShrink:0,position:'relative',boxShadow:'inset 0 1px 0 rgba(255,255,255,.06)'}}>
{(r.name_ar||'ع')[0]}
{cc&&<img src={'https://flagcdn.com/w40/'+cc.toLowerCase()+'.png'} alt="" style={{position:'absolute',bottom:-2,left:-2,width:16,height:12,borderRadius:2,objectFit:'cover',border:'1px solid rgba(0,0,0,.3)'}} onError={e=>e.target.style.display='none'}/>}
</div>
<div style={{flex:1,minWidth:0}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}><span style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,.93)',letterSpacing:'-.2px'}}>{r.name_ar}</span><Badge v={r.worker_status}/></div>
<div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6,flexWrap:'wrap'}}>
{r.worker_number&&<span style={{fontSize:11,fontWeight:500,color:'var(--tx5)',direction:'ltr'}}>{r.worker_number}</span>}
{r.worker_number&&r.nationality&&<span style={{color:'rgba(255,255,255,.15)'}}>·</span>}
{r.nationality&&<span style={{fontSize:11,fontWeight:500,color:'var(--tx5)'}}>{r.nationality}</span>}
</div>
{/* Tags */}
<div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
{r.joining_method&&<span style={{fontSize:9,fontWeight:600,padding:'3px 8px',borderRadius:6,background:(r.joining_method==='recruitment'?C.blue:'#9b59b6')+'15',color:r.joining_method==='recruitment'?C.blue:'#9b59b6',display:'inline-flex',alignItems:'center',gap:4}}><span style={{width:4,height:4,borderRadius:'50%',background:r.joining_method==='recruitment'?C.blue:'#9b59b6'}}/>{valAr[r.joining_method]||r.joining_method}</span>}
{occMap[r.occupation_id]&&<span style={{fontSize:9,fontWeight:600,padding:'3px 8px',borderRadius:6,background:C.gold+'15',color:C.gold}}>{occMap[r.occupation_id]}</span>}
{(()=>{const br=branches.find(x=>x.id===r.branch_id);return br?<span style={{fontSize:9,fontWeight:600,padding:'3px 8px',borderRadius:6,background:C.ok+'15',color:C.ok}}>{br.name_ar}</span>:null})()}
</div>
</div>
{/* 3-dot menu */}
<div style={{position:'relative',flexShrink:0}} onClick={e=>e.stopPropagation()}>
<div onClick={e=>{e.stopPropagation();const menu=e.currentTarget.nextSibling;menu.style.display=menu.style.display==='none'?'flex':'none'}} style={{width:28,height:28,borderRadius:8,background:'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',border:'1px solid rgba(255,255,255,.06)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05)'}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5" r="1.5" fill="rgba(255,255,255,.45)"/><circle cx="12" cy="12" r="1.5" fill="rgba(255,255,255,.45)"/><circle cx="12" cy="19" r="1.5" fill="rgba(255,255,255,.45)"/></svg>
</div>
<div style={{display:'none',position:'absolute',top:'100%',left:0,zIndex:50,flexDirection:'column',background:'linear-gradient(180deg,#2E2E2E 0%,#252525 100%)',border:'1px solid rgba(255,255,255,.08)',borderRadius:10,boxShadow:'0 12px 32px rgba(0,0,0,.55)',overflow:'hidden',minWidth:120,marginTop:6}}>
<div onClick={()=>openEdit(r)} style={{padding:'9px 14px',fontSize:11,fontWeight:600,color:'rgba(255,255,255,.78)',cursor:'pointer',display:'flex',alignItems:'center',gap:7,fontFamily:F}} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.04)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="1.8"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>{T('تعديل','Edit')}</div>
<div onClick={()=>del('workers',r.id)} style={{padding:'9px 14px',fontSize:11,fontWeight:600,color:'rgba(192,57,43,.78)',cursor:'pointer',display:'flex',alignItems:'center',gap:7,fontFamily:F}} onMouseEnter={e=>e.currentTarget.style.background='rgba(192,57,43,.05)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>{T('حذف','Delete')}</div>
</div>
</div>
</div>
{/* 4 Indicators bar */}
<div style={{display:'flex',borderTop:'1px solid rgba(255,255,255,.06)',background:'rgba(0,0,0,.18)'}}>
{[[iqDays===null?'—':iqDays<0?T('منتهية!','Expired!'):iqDays+' '+T('يوم','d'),T('الإقامة','Iqama'),iqClr],[wpCount>0?T('مشترك','Active'):'—',T('رخصة العمل','Permit'),wpCount>0?C.ok:'#555'],[gosiOk?T('ساري','Active'):'—',T('التأمينات','GOSI'),gosiOk?C.ok:'#555'],[qiwaOk?T('مشترك','Active'):'—',T('عقد قوى','Qiwa'),qiwaOk?C.ok:'#555']].map(([val,lbl,clr],i)=><div key={i} style={{flex:1,padding:'8px 6px',textAlign:'center',borderLeft:i>0?'1px solid rgba(255,255,255,.04)':'none'}}>
<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:4,marginBottom:3}}><div style={{width:5,height:5,borderRadius:'50%',background:clr,boxShadow:'0 0 4px '+clr}}/><span style={{fontSize:9,color:'var(--tx4)',fontWeight:600}}>{lbl}</span></div>
<div style={{fontSize:11,fontWeight:700,color:clr,letterSpacing:'-.2px'}}>{val}</div>
</div>)}
</div>
{/* Footer: Iqama + Facility + Unified */}
<div style={{borderTop:'1px solid rgba(255,255,255,.06)',background:'rgba(0,0,0,.12)',padding:'10px 14px'}}>
<div style={{display:'flex',gap:10,alignItems:'center',marginBottom:6}}>
<div style={{display:'flex',alignItems:'center',gap:6,flex:1}}>
<span style={{fontSize:10,fontWeight:600,color:'var(--tx5)',letterSpacing:'.3px'}}>{T('الإقامة','Iqama')}</span>
<span style={{fontSize:12,fontWeight:600,color:'var(--tx2)',direction:'ltr',letterSpacing:'.4px'}}>{r.iqama_number||'—'}</span>
{r.iqama_number&&<button onClick={e=>{e.stopPropagation();navigator.clipboard.writeText(r.iqama_number);toast&&toast(T('تم النسخ','Copied'))}} style={{width:18,height:18,borderRadius:5,border:'none',background:'rgba(255,255,255,.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,flexShrink:0}}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>}
</div>
</div>
<div style={{display:'flex',gap:6,alignItems:'center'}}>
<span style={{fontSize:11,fontWeight:500,color:'var(--tx5)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{fac?.name_ar||'—'}</span>
{fac?.unified_national_number&&<><span style={{fontSize:11,fontWeight:600,color:'var(--tx3)',direction:'ltr',letterSpacing:'.4px'}}>{fac.unified_national_number}</span>
<button onClick={e=>{e.stopPropagation();navigator.clipboard.writeText(fac.unified_national_number);toast&&toast(T('تم النسخ','Copied'))}} style={{width:18,height:18,borderRadius:5,border:'none',background:'rgba(255,255,255,.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,flexShrink:0}}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button></>}
</div>
</div>
{/* Special Status */}
{r.worker_status==='absconded'&&<div style={{padding:'8px 14px',background:'rgba(192,57,43,.08)',borderTop:'1px solid rgba(192,57,43,.18)',display:'flex',alignItems:'center',gap:7}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
<span style={{fontSize:10,fontWeight:600,color:C.red}}>{T('بلاغ هروب — المنشأة:','Absconded — Facility:')} {fac?.name_ar||'—'}</span>
</div>}
{r.worker_status==='final_exit'&&<div style={{padding:'8px 14px',background:'rgba(153,153,153,.06)',borderTop:'1px solid rgba(153,153,153,.14)'}}>
<span style={{fontSize:10,fontWeight:600,color:'#999'}}>{T('عائد بتاريخ','Exited on')} {r.exit_date||'—'} — {T('الملف مؤرشف','Archived')}</span>
</div>}
{r.outside_kingdom&&r.worker_status==='active'&&<div style={{padding:'8px 14px',background:'rgba(212,160,23,.06)',borderTop:'1px solid rgba(212,160,23,.18)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<span style={{fontSize:10,fontWeight:600,color:C.gold}}>{T('خارج المملكة','Outside Kingdom')}</span>
{r.visa_return_date&&<span style={{fontSize:10,fontWeight:700,color:C.gold,direction:'ltr'}}>{T('عودة:','Return:')} {r.visa_return_date}</span>}
</div>}
</div>})}</div>}

{/* ═══ PAGINATION ═══ */}
{totalPages>1&&(()=>{const btnS=(dis)=>({width:34,height:34,borderRadius:10,border:'1px solid rgba(255,255,255,.06)',background:'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',color:dis?'rgba(255,255,255,.18)':'var(--tx3)',cursor:dis?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontFamily:F,boxShadow:'0 2px 6px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'});return<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:20}}>
<div style={{flex:1}}/>
<div style={{display:'flex',gap:6,alignItems:'center'}}>
<button onClick={()=>setPage(0)} disabled={page===0} style={btnS(page===0)}>{'«'}</button>
<button onClick={()=>setPage(Math.max(0,page-1))} disabled={page===0} style={btnS(page===0)}>{'‹'}</button>
<span style={{width:34,height:34,borderRadius:10,border:'1px solid rgba(212,160,23,.45)',background:'linear-gradient(180deg,rgba(212,160,23,.22) 0%,rgba(212,160,23,.10) 100%)',color:C.gold,fontFamily:F,fontSize:13,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px rgba(212,160,23,.18), inset 0 1px 0 rgba(212,160,23,.18)'}}>{page+1}</span>
<button onClick={()=>setPage(Math.min(totalPages-1,page+1))} disabled={page===totalPages-1} style={btnS(page===totalPages-1)}>{'›'}</button>
<button onClick={()=>setPage(totalPages-1)} disabled={page===totalPages-1} style={btnS(page===totalPages-1)}>{'»'}</button>
</div>
<div style={{flex:1,display:'flex',justifyContent:'flex-end'}}><span style={{fontSize:11,color:'var(--tx5)',fontFamily:F,fontWeight:500}}>{T('عرض','Showing')} {page*PER_PAGE+1}-{Math.min((page+1)*PER_PAGE,filtered.length)} {T('من','of')} {filtered.length}</span></div>
</div>})()}

{/* ═══ SIDE PANEL — 8 TABS ═══ */}
{viewRow&&(()=>{const gC=viewRow.gender==='female'?'#9b59b6':C.blue;const fac=facilities.find(f=>f.id===viewRow.facility_id)
const vt=[{id:'basic',l:T('البيانات الأساسية','Basic Info')},{id:'docs',l:T('الوثائق','Documents'),n:wNI.length+wPP.length+wVis.length+wLic.length},{id:'contract',l:T('العقد والراتب','Contract & Salary'),n:wCtr.length},{id:'permits',l:T('رخصة العمل والتأمينات','Permits & Insurance'),n:wP.length+wIn.length},{id:'moves',l:T('التنقلات','Transfers'),n:wTr.length+wTReq.length},{id:'family',l:T('المرافقون والمركبات','Family & Vehicles'),n:wDep.length+wVeh.length},{id:'timeline',l:T('السجل الزمني','Timeline'),n:wTL.length},{id:'notes',l:T('الملاحظات والمرفقات','Notes & Files'),n:(viewRow.notes?1:0)+wAtt.length}]
return<div onClick={()=>setViewRow(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:16,fontFamily:F}}>
<div onClick={e=>e.stopPropagation()} style={{...GLASS,width:'min(920px,95vw)',height:'min(650px,88vh)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
{/* Header */}
<div style={{padding:'18px 24px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',borderBottom:'1px solid rgba(255,255,255,.07)',flexShrink:0}}>
<div style={{display:'flex',gap:14,alignItems:'center'}}><div style={{width:48,height:48,borderRadius:14,background:'linear-gradient(180deg,'+gC+'22 0%,'+gC+'11 100%)',border:'1px solid '+gC+'30',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:700,color:gC,boxShadow:'inset 0 1px 0 rgba(255,255,255,.06)'}}>{(viewRow.name_ar||'ع')[0]}</div><div><div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}><div style={{fontSize:18,fontWeight:600,color:'rgba(255,255,255,.93)',letterSpacing:'-.2px'}}>{viewRow.name_ar}</div><Badge v={viewRow.worker_status}/></div>{viewRow.name_en&&<div style={{fontSize:12,color:'var(--tx4)',direction:'ltr',fontWeight:500}}>{viewRow.name_en}</div>}{fac&&<div style={{fontSize:11,color:C.gold,marginTop:2,fontWeight:500}}>{fac.name_ar}</div>}</div></div>
<div style={{display:'flex',gap:8}}><button onClick={()=>{setViewRow(null);openEdit(viewRow)}} style={{...bS,height:36,padding:'0 16px'}}>{T('تعديل','Edit')}</button><button onClick={()=>setViewRow(null)} style={{width:36,height:36,borderRadius:10,background:'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',border:'1px solid rgba(255,255,255,.06)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05)'}}>{'\u2715'}</button></div></div>
{/* Body */}
<div style={{flex:1,display:'flex',overflow:'hidden'}}>
{/* Sidebar tabs */}
<div style={{width:200,background:'rgba(0,0,0,.18)',borderLeft:'1px solid rgba(255,255,255,.06)',padding:'14px 10px',overflowY:'auto',flexShrink:0,scrollbarWidth:'none'}}>{vt.map(t=><div key={t.id} onClick={()=>setViewTab(t.id)} style={{padding:'10px 12px',borderRadius:10,marginBottom:4,fontSize:12,fontWeight:viewTab===t.id?600:500,color:viewTab===t.id?C.gold:'var(--tx4)',background:viewTab===t.id?'linear-gradient(180deg,rgba(212,160,23,.16) 0%,rgba(212,160,23,.06) 100%)':'transparent',border:viewTab===t.id?'1px solid rgba(212,160,23,.3)':'1px solid transparent',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',transition:'.2s',fontFamily:F,boxShadow:viewTab===t.id?'0 2px 8px rgba(212,160,23,.12), inset 0 1px 0 rgba(212,160,23,.16)':'none'}}><span>{t.l}</span>{t.n!==undefined&&<span style={{fontSize:10,fontWeight:700,color:viewTab===t.id?C.gold:'var(--tx5)',background:viewTab===t.id?'rgba(212,160,23,.18)':'rgba(255,255,255,.05)',padding:'2px 7px',borderRadius:5,minWidth:20,textAlign:'center'}}>{t.n}</span>}</div>)}</div>
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
{wNI.length>0&&<><SectionHdr t="الإقامات"/>{wNI.map(i=>{const isE=i.expiry_date&&new Date(i.expiry_date)<now;return<div key={i.id} style={{background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',borderRadius:12,padding:'14px 16px',border:'1px solid '+(isE?'rgba(192,57,43,.25)':'rgba(255,255,255,.06)'),boxShadow:isE?'inset 0 1px 0 rgba(255,255,255,.04), 0 2px 6px rgba(192,57,43,.08)':'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 6px rgba(0,0,0,.18)',marginBottom:8}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><div style={{display:'flex',gap:8,alignItems:'center'}}>{i.version_number&&<span style={{fontSize:12,fontWeight:800,color:C.gold}}>v{i.version_number}</span>}{i.is_current&&<span style={{fontSize:10,fontWeight:600,padding:'4px 10px',borderRadius:6,background:C.ok+'15',color:C.ok,display:'inline-flex',alignItems:'center',gap:5}}>الحالية</span>}{isE&&<span style={{fontSize:10,fontWeight:600,padding:'4px 10px',borderRadius:6,background:C.red+'15',color:C.red,display:'inline-flex',alignItems:'center',gap:5}}>منتهية</span>}</div><Badge v={i.status}/></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}><IB l="الإصدار" v={i.issue_date}/><IB l="الانتهاء" v={i.expiry_date}/><IB l="مكان الإصدار" v={i.issue_place}/></div></div>})}</>}
{wPP.length>0&&<><SectionHdr t="الجوازات"/>{wPP.map(p=>{const isE=p.expiry_date&&new Date(p.expiry_date)<now;return<div key={p.id} style={{background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',borderRadius:12,padding:'14px 16px',border:'1px solid '+(isE?'rgba(192,57,43,.25)':'rgba(255,255,255,.06)'),boxShadow:isE?'inset 0 1px 0 rgba(255,255,255,.04), 0 2px 6px rgba(192,57,43,.08)':'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 6px rgba(0,0,0,.18)',marginBottom:8}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span style={{fontSize:13,fontWeight:700,color:'var(--tx2)',direction:'ltr'}}>{p.passport_number||'—'}</span>{p.is_current?<span style={{fontSize:10,fontWeight:600,padding:'4px 10px',borderRadius:6,background:C.ok+'15',color:C.ok,display:'inline-flex',alignItems:'center',gap:5}}>الحالي</span>:isE&&<span style={{fontSize:10,fontWeight:600,padding:'4px 10px',borderRadius:6,background:C.red+'15',color:C.red,display:'inline-flex',alignItems:'center',gap:5}}>منتهي</span>}</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}><IB l="الإصدار" v={p.issue_date}/><IB l="الانتهاء" v={p.expiry_date}/><IB l="مكان الإصدار" v={p.issue_place}/></div></div>})}</>}
{wVis.length>0&&<><SectionHdr t="التأشيرات"/>{wVis.map(v=><div key={v.id} style={{background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',borderRadius:12,padding:'14px 16px',border:'1px solid rgba(255,255,255,.06)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 6px rgba(0,0,0,.18)',marginBottom:8}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span style={{fontSize:12,fontWeight:700,color:'var(--tx2)'}}>{v.visa_number||'—'}</span><Badge v={v.status}/></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}><IB l="النوع" v={v.visa_type}/><IB l="تاريخ الإصدار" v={v.issue_date}/><IB l="الخروج قبل" v={v.exit_before}/></div></div>)}</>}
{wLic.length>0&&<><SectionHdr t="رخص السياقة"/>{wLic.map(l=>{const isE=l.expiry_date&&new Date(l.expiry_date)<now;return<div key={l.id} style={{background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',borderRadius:12,padding:'14px 16px',border:'1px solid '+(isE?'rgba(192,57,43,.25)':'rgba(255,255,255,.06)'),boxShadow:isE?'inset 0 1px 0 rgba(255,255,255,.04), 0 2px 6px rgba(192,57,43,.08)':'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 6px rgba(0,0,0,.18)',marginBottom:8}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>{l.license_type||'رخصة'}</span>{isE&&<span style={{fontSize:10,fontWeight:600,padding:'4px 10px',borderRadius:6,background:C.red+'15',color:C.red,display:'inline-flex',alignItems:'center',gap:5}}>منتهية</span>}</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><IB l="الإصدار" v={l.issue_date}/><IB l="الانتهاء" v={l.expiry_date}/></div></div>})}</>}
{wNI.length===0&&wPP.length===0&&wVis.length===0&&wLic.length===0&&<div style={{textAlign:'center',padding:40,color:'var(--tx5)',fontSize:13,fontWeight:500,fontFamily:F}}>لا توجد وثائق</div>}
</div>}

{/* TAB 3: العقد والراتب */}
{viewTab==='contract'&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}><div style={{...GLASS,padding:'20px',textAlign:'center'}}><div style={{fontSize:11,fontWeight:600,color:'var(--tx3)',marginBottom:10,letterSpacing:'.3px'}}>{T('راتب التأمينات','GOSI Salary')}</div><div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><span style={{width:8,height:8,borderRadius:'50%',background:C.gold,boxShadow:'0 0 6px '+C.gold}}/><div style={{fontSize:28,fontWeight:700,color:C.gold,letterSpacing:'-.5px',direction:'ltr',lineHeight:1}}>{viewRow.gosi_salary?nm(viewRow.gosi_salary):'—'}</div></div><div style={{fontSize:10,color:'var(--tx5)',marginTop:6,fontWeight:500}}>{T('ريال','SAR')}</div></div><div style={{...GLASS,padding:'20px',textAlign:'center'}}><div style={{fontSize:11,fontWeight:600,color:'var(--tx3)',marginBottom:10,letterSpacing:'.3px'}}>{T('راتب قوى','Qiwa Salary')}</div><div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><span style={{width:8,height:8,borderRadius:'50%',background:C.blue,boxShadow:'0 0 6px '+C.blue}}/><div style={{fontSize:28,fontWeight:700,color:C.blue,letterSpacing:'-.5px',direction:'ltr',lineHeight:1}}>{viewRow.qiwa_salary?nm(viewRow.qiwa_salary):'—'}</div></div><div style={{fontSize:10,color:'var(--tx5)',marginTop:6,fontWeight:500}}>{T('ريال','SAR')}</div></div></div>
{wCtr.length>0&&<><SectionHdr t="العقود"/>{wCtr.map(c=><div key={c.id} style={{background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',borderRadius:12,padding:'14px 16px',border:'1px solid rgba(255,255,255,.06)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 6px rgba(0,0,0,.18)',marginBottom:8}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><div style={{display:'flex',gap:8,alignItems:'center'}}><span style={{fontSize:12,fontWeight:700,color:C.gold}}>#{c.contract_number||'—'}</span><span style={{fontSize:10,color:'var(--tx4)'}}>{c.contract_type||'—'}</span></div><Badge v={c.status}/></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}><IB l="البداية" v={c.start_date}/><IB l="النهاية" v={c.end_date||'غير محدد'}/><IB l="المدة" v={c.duration_months?c.duration_months+' شهر':(c.duration_type||'—')}/></div></div>)}</>}
{wSH.length>0&&<><SectionHdr t="تاريخ الرواتب"/>{wSH.map(s=>{const up=Number(s.new_salary)>Number(s.old_salary);return<div key={s.id} style={{background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',borderRadius:12,padding:'14px 16px',border:'1px solid rgba(255,255,255,.06)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 6px rgba(0,0,0,.18)',marginBottom:8}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><div style={{display:'flex',gap:8,alignItems:'center'}}><span style={{fontSize:11,color:'var(--tx4)'}}>{s.change_date}</span>{s.source&&<span style={{fontSize:10,fontWeight:600,padding:'4px 10px',borderRadius:6,background:C.blue+'15',color:C.blue,display:'inline-flex',alignItems:'center',gap:5}}>{s.source}</span>}</div><span style={{fontSize:12,fontWeight:700,color:up?C.ok:C.red}}>{up?'↑':'↓'} {nm(s.new_salary)}</span></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}><IB l="القديم" v={s.old_salary?nm(s.old_salary):null}/><IB l="الجديد" v={s.new_salary?nm(s.new_salary):null}/><IB l="السبب" v={s.reason}/></div></div>})}</>}
</div>}

{/* TAB 4: رخصة العمل والتأمينات */}
{viewTab==='permits'&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
{<><SectionHdr t="رخص العمل"/>{wP.length===0?<div style={{textAlign:'center',padding:30,color:'var(--tx5)',fontSize:13,fontWeight:500,fontFamily:F}}>لا توجد رخص</div>:wP.map(p=>{const isE=p.wp_expiry_date&&new Date(p.wp_expiry_date)<now;return<div key={p.id} style={{background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',borderRadius:12,padding:'14px 16px',border:'1px solid '+(isE?'rgba(192,57,43,.25)':'rgba(255,255,255,.06)'),boxShadow:isE?'inset 0 1px 0 rgba(255,255,255,.04), 0 2px 6px rgba(192,57,43,.08)':'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 6px rgba(0,0,0,.18)',marginBottom:8}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><div style={{display:'flex',gap:8,alignItems:'center'}}>{p.wp_order&&<span style={{fontSize:12,fontWeight:800,color:C.gold}}>#{p.wp_order}</span>}{p.is_reduced&&<span style={{fontSize:10,fontWeight:600,padding:'4px 10px',borderRadius:6,background:C.gold+'15',color:C.gold,display:'inline-flex',alignItems:'center',gap:5}}>مخفضة</span>}{isE&&<span style={{fontSize:10,fontWeight:600,padding:'4px 10px',borderRadius:6,background:C.red+'15',color:C.red,display:'inline-flex',alignItems:'center',gap:5}}>منتهية</span>}</div>{p.duration_months&&<span style={{fontSize:10,color:C.blue}}>{p.duration_months} شهر</span>}</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><IB l="الإصدار" v={p.wp_issue_date}/><IB l="الانتهاء" v={p.wp_expiry_date}/></div></div>})}</>}
{wGosi.length>0&&<><SectionHdr t="اشتراكات التأمينات"/>{wGosi.map(g=><div key={g.id} style={{background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',borderRadius:12,padding:'14px 16px',border:'1px solid rgba(255,255,255,.06)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 6px rgba(0,0,0,.18)',marginBottom:8}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}><IB l="بداية الاشتراك" v={g.subscription_start}/><IB l="الراتب الأساسي" v={g.base_salary?nm(g.base_salary):null}/><IB l="المبلغ الإجمالي" v={g.total_amount?nm(g.total_amount):null}/></div></div>)}</>}
{<><SectionHdr t="التأمين الطبي"/>{wIn.length===0?<div style={{textAlign:'center',padding:30,color:'var(--tx5)',fontSize:13,fontWeight:500,fontFamily:F}}>لا يوجد تأمين</div>:wIn.map(i=>{const isE=i.end_date&&new Date(i.end_date)<now;return<div key={i.id} style={{background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',borderRadius:12,padding:'14px 16px',border:'1px solid '+(isE?'rgba(192,57,43,.25)':'rgba(255,255,255,.06)'),boxShadow:isE?'inset 0 1px 0 rgba(255,255,255,.04), 0 2px 6px rgba(192,57,43,.08)':'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 6px rgba(0,0,0,.18)',marginBottom:8}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>{i.insurance_company}</span>{isE&&<span style={{fontSize:10,fontWeight:600,padding:'4px 10px',borderRadius:6,background:C.red+'15',color:C.red,display:'inline-flex',alignItems:'center',gap:5}}>منتهي</span>}</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><IB l="البداية" v={i.start_date}/><IB l="النهاية" v={i.end_date}/></div></div>})}</>}
</div>}

{/* TAB 5: التنقلات */}
{viewTab==='moves'&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
{wTr.length>0&&<><SectionHdr t="عمليات النقل"/>{wTr.map(tr=>{const prClr=Number(tr.profit||0)>=0?C.ok:C.red;return<div key={tr.id} style={{background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',borderRadius:12,padding:'14px 16px',border:'1px solid rgba(255,255,255,.06)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 6px rgba(0,0,0,.18)',marginBottom:8}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><div style={{display:'flex',gap:8,alignItems:'center'}}><Badge v={tr.status}/>{tr.transfer_date&&<span style={{fontSize:10,color:'var(--tx5)',direction:'ltr'}}>{tr.transfer_date}</span>}{tr.new_employer_name&&<span style={{fontSize:10,color:'var(--tx4)'}}>→ {tr.new_employer_name}</span>}</div><span style={{fontSize:14,fontWeight:800,color:prClr}}>{Number(tr.profit||0).toLocaleString()}</span></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8}}><IB l="التكلفة" v={tr.total_cost?nm(tr.total_cost):null}/><IB l="رسوم النقل" v={tr.transfer_fee?nm(tr.transfer_fee):null}/><IB l="المحصّل" v={tr.client_charge?nm(tr.client_charge):null}/><IB l="الربح" v={tr.profit?nm(tr.profit):null}/></div></div>})}</>}
{wTReq.length>0&&<><SectionHdr t="طلبات النقل"/>{wTReq.map(r=><div key={r.id} style={{background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',borderRadius:12,padding:'14px 16px',border:'1px solid rgba(255,255,255,.06)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 6px rgba(0,0,0,.18)',marginBottom:8}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span style={{fontSize:12,fontWeight:700,color:C.gold}}>#{r.request_number||'—'}</span><Badge v={r.status}/></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}><IB l="صاحب العمل السابق" v={r.previous_employer}/><IB l="تاريخ الطلب" v={r.request_date}/><IB l="تاريخ الموافقة" v={r.approval_date}/></div></div>)}</>}
{wTr.length===0&&wTReq.length===0&&<div style={{textAlign:'center',padding:40,color:'var(--tx5)',fontSize:13,fontWeight:500,fontFamily:F}}>لا توجد تنقلات</div>}
</div>}

{/* TAB 6: المرافقون والمركبات */}
{viewTab==='family'&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
{wDep.length>0&&<><SectionHdr t="التابعين"/>{wDep.map(d=><div key={d.id} style={{background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',borderRadius:12,padding:'14px 16px',border:'1px solid rgba(255,255,255,.06)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 6px rgba(0,0,0,.18)',marginBottom:8}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>{d.full_name||'—'}</span><span style={{fontSize:10,color:d.gender==='female'?'#9b59b6':C.blue,background:(d.gender==='female'?'rgba(155,89,182,.1)':'rgba(52,131,180,.1)'),padding:'2px 8px',borderRadius:4}}>{d.relation_type||'—'}</span></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><IB l="تاريخ الميلاد" v={d.date_of_birth}/><IB l="رقم الهوية" v={d.identity_number} copy toast={toast}/></div></div>)}</>}
{wVeh.length>0&&<><SectionHdr t="المركبات"/>{wVeh.map(v=><div key={v.id} style={{background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',borderRadius:12,padding:'14px 16px',border:'1px solid rgba(255,255,255,.06)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 6px rgba(0,0,0,.18)',marginBottom:8}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}><IB l="رقم اللوحة" v={v.plate_number} copy toast={toast}/><IB l="النوع" v={v.vehicle_type}/><IB l="الموديل" v={v.model}/><IB l="السنة" v={v.year}/><IB l="انتهاء الاستمارة" v={v.registration_expiry}/></div></div>)}</>}
{wDep.length===0&&wVeh.length===0&&<div style={{textAlign:'center',padding:40,color:'var(--tx5)',fontSize:13,fontWeight:500,fontFamily:F}}>لا توجد بيانات</div>}
</div>}

{/* TAB 7: السجل الزمني */}
{viewTab==='timeline'&&<div style={{display:'flex',flexDirection:'column',gap:0}}>
{wTL.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx5)',fontSize:13,fontWeight:500,fontFamily:F}}>لا يوجد سجل زمني</div>:wTL.map((ev,i)=><div key={ev.id} style={{display:'flex',gap:14,paddingBottom:20}}>
<div style={{display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0,width:20}}>
<div style={{width:12,height:12,borderRadius:'50%',background:i===0?C.gold:'rgba(255,255,255,.18)',border:i===0?'2px solid rgba(212,160,23,.25)':'none',boxShadow:i===0?'0 0 8px '+C.gold:'none',flexShrink:0}}/>
{i<wTL.length-1&&<div style={{width:2,flex:1,background:'rgba(255,255,255,.06)',marginTop:4}}/>}
</div>
<div style={{flex:1,background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',borderRadius:12,padding:'14px 16px',border:'1px solid rgba(255,255,255,.06)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 6px rgba(0,0,0,.18)'}}>
<div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:12,fontWeight:700,color:'var(--tx2)'}}>{ev.title||ev.event_type||'—'}</span><span style={{fontSize:10,color:'var(--tx5)',direction:'ltr'}}>{ev.event_date}</span></div>
{ev.description&&<div style={{fontSize:11,color:'var(--tx4)',marginBottom:6}}>{ev.description}</div>}
{(ev.from_status||ev.to_status)&&<div style={{display:'flex',gap:6,alignItems:'center'}}>{ev.from_status&&<Badge v={ev.from_status}/>}{ev.to_status&&<><span style={{color:'var(--tx5)'}}>→</span><Badge v={ev.to_status}/></>}</div>}
</div>
</div>)}
</div>}

{/* TAB 8: الملاحظات والمرفقات */}
{viewTab==='notes'&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
{viewRow.notes&&<><SectionHdr t="ملاحظات"/><div style={{background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',borderRadius:12,padding:'14px 16px',border:'1px solid rgba(255,255,255,.06)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 6px rgba(0,0,0,.18)',fontSize:13,color:'var(--tx3)',lineHeight:1.8}}>{viewRow.notes}</div></>}
{wAtt.length>0&&<><SectionHdr t="المرفقات"/>{wAtt.map(a=><div key={a.id} style={{background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',borderRadius:12,padding:'12px 16px',border:'1px solid rgba(255,255,255,.06)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 6px rgba(0,0,0,.18)',marginBottom:8,display:'flex',alignItems:'center',gap:12}}>
<div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(180deg,'+C.blue+'22 0%,'+C.blue+'10 100%)',border:'1px solid '+C.blue+'30',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'inset 0 1px 0 rgba(255,255,255,.05)'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="1.8"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg></div>
<div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:'var(--tx2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.file_name||'مرفق'}</div><div style={{fontSize:10,color:'var(--tx5)',marginTop:3,fontWeight:500}}>{a.category||''}{a.file_size?' · '+Math.round(a.file_size/1024)+'KB':''}</div></div>
</div>)}</>}
{!viewRow.notes&&wAtt.length===0&&<div style={{textAlign:'center',padding:40,color:'var(--tx5)',fontSize:13,fontWeight:500,fontFamily:F}}>لا توجد ملاحظات أو مرفقات</div>}
</div>}

</div></div></div></div>})()}

{/* ═══ FORM POPUPS ═══ */}
{pop==='worker'&&<FormPopup title={form._id?'تعديل عامل':'إضافة عامل'} fields={wFields} form={form} setForm={setForm} onSave={()=>saveG('workers',form)} onClose={()=>setPop(null)} saving={saving} isAr={isAr}/>}
{pop==='permit'&&<FormPopup title={form._id?'تعديل رخصة':'إضافة رخصة'} fields={[{k:'facility_id',l:'المنشأة',opts:facilities.map(f=>({v:f.id,l:f.name_ar}))},{k:'worker_id',l:'العامل',opts:workers.map(w=>({v:w.id,l:w.name_ar})),r:1},{k:'wp_issue_date',l:'الإصدار',t:'date',r:1},{k:'wp_expiry_date',l:'الانتهاء',t:'date',r:1},{k:'duration_months',l:'المدة',d:1},{k:'is_reduced',l:'مخفضة',opts:['true','false']},{k:'notes',l:'ملاحظات',w:1}]} form={form} setForm={setForm} onSave={()=>saveG('work_permits',form)} onClose={()=>setPop(null)} saving={saving} isAr={isAr}/>}
{pop==='iqama'&&<FormPopup title={form._id?'تعديل إقامة':'إضافة إقامة'} fields={[{k:'facility_id',l:'المنشأة',opts:facilities.map(f=>({v:f.id,l:f.name_ar}))},{k:'worker_id',l:'العامل',opts:workers.map(w=>({v:w.id,l:w.name_ar})),r:1},{k:'iqama_issue_date',l:'الإصدار',t:'date',r:1},{k:'iqama_expiry_date',l:'الانتهاء',t:'date',r:1},{k:'duration_months',l:'المدة',d:1},{k:'notes',l:'ملاحظات',w:1}]} form={form} setForm={setForm} onSave={()=>saveG('iqama_cards',form)} onClose={()=>setPop(null)} saving={saving} isAr={isAr}/>}
{pop==='ins'&&<FormPopup title={form._id?'تعديل تأمين':'إضافة تأمين'} fields={[{k:'worker_id',l:'العامل',opts:workers.map(w=>({v:w.id,l:w.name_ar})),r:1},{k:'insurance_company',l:'الشركة',r:1},{k:'insurance_policy_no',l:'رقم الوثيقة',d:1},{k:'start_date',l:'البداية',t:'date',r:1},{k:'end_date',l:'النهاية',t:'date',r:1},{k:'notes',l:'ملاحظات',w:1}]} form={form} setForm={setForm} onSave={()=>saveG('worker_insurance',form)} onClose={()=>setPop(null)} saving={saving} isAr={isAr}/>}
</div>}
