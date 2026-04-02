import React,{useState,useEffect,useCallback} from 'react'
const F="'Cairo',sans-serif"
const C={dk:'#171717',fm:'#1e1e1e',gold:'#c9a84c',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}
const fS={width:'100%',height:42,padding:'0 14px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:F,fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',background:'rgba(255,255,255,.07)',textAlign:'center'}
const bS={height:38,padding:'0 20px',borderRadius:10,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.12)',color:C.gold,fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}
const sMap={active:C.ok,issue:C.red,suspended:'#e67e22',cancelled:C.red,expired:'#999',inactive:'#999',red:C.red,yellow:'#e67e22',green_low:C.ok,green_mid:C.ok,green_high:C.ok,platinum:C.gold,pending_confirmation:C.gold,revoked:C.red}
const nm=v=>Number(v||0).toLocaleString('en-US')
const Badge=({v})=>{const cl=sMap[v]||'#888';return<span style={{fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:6,background:cl+'18',color:cl,display:'inline-flex',alignItems:'center',gap:4}}><span style={{width:5,height:5,borderRadius:'50%',background:cl}}/>{v||'—'}</span>}
const EditBtn=({onClick})=><button onClick={e=>{e.stopPropagation();onClick()}} style={{width:28,height:28,borderRadius:7,border:'1px solid rgba(201,168,76,.15)',background:'rgba(201,168,76,.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="1.8"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>
const DelBtn=({onClick})=><button onClick={e=>{e.stopPropagation();onClick()}} style={{width:28,height:28,borderRadius:7,border:'1px solid rgba(192,57,43,.1)',background:'rgba(192,57,43,.04)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
const StatCard=({l,v,c,bg,bc})=><div style={{padding:'20px',borderRadius:14,background:bg,border:'1px solid '+bc}}><div style={{fontSize:11,fontWeight:600,color:c,marginBottom:10,opacity:.85}}>{l}</div><div style={{fontSize:32,fontWeight:900,color:c,lineHeight:1}}>{v}</div></div>
const FieldView=({l,v,isStatus})=><div style={{padding:'12px 14px',background:'rgba(255,255,255,.02)',borderBottom:'1px solid var(--bd2)'}}><div style={{fontSize:9,fontWeight:600,color:'var(--tx5)',marginBottom:4}}>{l}</div><div style={{fontSize:13,fontWeight:600,color:'var(--tx2)'}}>{isStatus?<Badge v={v}/>:String(v)}</div></div>
const FieldInput=({f,form,setForm,isAr})=>{const v=form[f.k]||'';const set=val=>setForm(p=>({...p,[f.k]:val}))
return<div style={{gridColumn:f.w?'1/-1':undefined}}><div style={{fontSize:12,fontWeight:600,color:'var(--tx3)',marginBottom:6}}>{f.l}{f.r&&<span style={{color:C.red}}> *</span>}</div>
{f.opts?<select value={v} onChange={e=>set(e.target.value)} style={fS}><option value="">{isAr?'— اختر —':'— Select —'}</option>{f.opts.map(o=>typeof o==='object'?<option key={o.v} value={o.v}>{o.l}</option>:<option key={o} value={o}>{o}</option>)}</select>
:f.t==='date'?<input type="date" value={v} onChange={e=>set(e.target.value)} style={{...fS,direction:'ltr'}}/>
:f.t==='bool'?<select value={v} onChange={e=>set(e.target.value)} style={fS}><option value="">{isAr?'— اختر —':'— Select —'}</option><option value="true">{isAr?'نعم':'Yes'}</option><option value="false">{isAr?'لا':'No'}</option></select>
:f.w?<textarea value={v} onChange={e=>set(e.target.value)} rows={3} style={{...fS,height:'auto',padding:12,resize:'vertical'}}/>
:<input value={v} onChange={e=>set(e.target.value)} style={{...fS,direction:f.d?'ltr':'rtl'}}/>}
</div>}

export default function FacilitiesPage({sb,toast,user,lang,onTabChange}){
const isAr=lang!=='en';const T=(a,e)=>isAr?a:e
const[tab,setTab]=useState('facilities')
const[data,setData]=useState([]);const[owners,setOwners]=useState([]);const[subs,setSubs]=useState([]);const[creds,setCreds]=useState([]);const[partners,setPartners]=useState([]);const[exemptions,setExemptions]=useState([]);const[weeklyStats,setWeeklyStats]=useState([]);const[visas,setVisas]=useState([])
const[branches,setBranches]=useState([]);const[regions,setRegions]=useState([]);const[cities,setCities]=useState([])
const[loading,setLoading]=useState(false);const[q,setQ]=useState('');const[statusFilter,setStatusFilter]=useState('all');const[sortBy,setSortBy]=useState('created_at');const[nitaqatFilter,setNitaqatFilter]=useState('all')
const[page,setPage]=useState(0);const[viewRow,setViewRow]=useState(null);const[viewTab,setViewTab]=useState('basic')
const[wizard,setWizard]=useState(null);const[saving,setSaving]=useState(false);const[pop,setPop]=useState(null);const[form,setForm]=useState({})
const PER_PAGE=8
useEffect(()=>{onTabChange&&onTabChange({tab})},[tab])

const load=useCallback(async()=>{setLoading(true)
const[f,o,s,c,p,ex,br,rg,ct,ws,vi]=await Promise.all([
sb.from('facilities').select('*').is('deleted_at',null).order('created_at',{ascending:false}),
sb.from('owners').select('*').is('deleted_at',null).order('name_ar'),
sb.from('facility_subscriptions').select('*').is('deleted_at',null).order('created_at',{ascending:false}),
sb.from('platform_credentials').select('*').is('deleted_at',null).order('created_at',{ascending:false}),
sb.from('facility_partners').select('*').is('deleted_at',null),
sb.from('facility_exemption_log').select('*').is('deleted_at',null).order('created_at',{ascending:false}),
sb.from('branches').select('id,name_ar').is('deleted_at',null),
sb.from('regions').select('id,name_ar').order('name_ar'),
sb.from('cities').select('id,name_ar,region_id').order('name_ar'),
sb.from('facility_weekly_stats').select('*').order('week_date',{ascending:false}).limit(500),
sb.from('facility_visas').select('*').is('deleted_at',null).order('created_at',{ascending:false})
]);setData(f.data||[]);setOwners(o.data||[]);setSubs(s.data||[]);setCreds(c.data||[]);setPartners(p.data||[]);setExemptions(ex.data||[]);setBranches(br.data||[]);setRegions(rg.data||[]);setCities(ct.data||[]);setWeeklyStats(ws.data||[]);setVisas(vi.data||[]);setLoading(false)},[sb])
useEffect(()=>{load()},[load])

const del=async(t,id)=>{if(!confirm(T('حذف؟','Delete?')))return;await sb.from(t).update({deleted_at:new Date().toISOString()}).eq('id',id);toast(T('تم الحذف','Deleted'));load()}
const saveGeneric=async(table,formData)=>{setSaving(true);try{const d={...formData};const id=d._id;delete d._id;Object.keys(d).forEach(k=>{if(d[k]==='')d[k]=null;if(d[k]==='true')d[k]=true;if(d[k]==='false')d[k]=false})
if(id){d.updated_by=user?.id;const{error}=await sb.from(table).update(d).eq('id',id);if(error)throw error;toast(T('تم التعديل','Updated'))}
else{d.created_by=user?.id;const{error}=await sb.from(table).insert(d);if(error)throw error;toast(T('تمت الإضافة','Added'))}
setPop(null);load()}catch(e){toast('خطأ: '+e.message?.slice(0,80))}setSaving(false)}

// === Stats ===
const totalFac=data.length,activeFac=data.filter(r=>r.facility_status==='active'&&r.cr_status==='active').length
const suspendedFac=data.filter(r=>r.cr_status==='suspended').length,issueFac=data.filter(r=>r.facility_status==='issue').length
const redNitaqat=data.filter(r=>r.nitaqat_color==='red'||r.nitaqat_color==='yellow').length
const totalVisas=data.reduce((s,r)=>s+(r.max_visas||0),0),totalWorkers=data.reduce((s,r)=>s+(r.total_workers||0),0),avgSaudi=data.length?Math.round(data.reduce((s,r)=>s+Number(r.saudization_percentage||0),0)/data.length):0
const activeSubs=subs.filter(s=>s.subscription_status==='active').length,expiredSubs=subs.filter(s=>s.subscription_status==='expired').length
const activeCreds=creds.filter(c=>c.status==='active').length,inactiveCreds=creds.filter(c=>c.status!=='active').length
const exportCSV=()=>{const hdr=['الاسم','الرقم الموحد','السجل التجاري','النطاق','الحالة','العمال','التأشيرات','السعودة%','انتهاء السجل'];const rows=data.map(r=>[r.name_ar,r.unified_national_number,r.cr_number,r.nitaqat_color,r.facility_status,r.total_workers,r.max_visas,r.saudization_percentage,r.cr_expiry_date]);const csv='\uFEFF'+[hdr,...rows].map(r=>r.join(',')).join('\n');const b=new Blob([csv],{type:'text/csv;charset=utf-8;'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='facilities_'+new Date().toISOString().slice(0,10)+'.csv';a.click()}

// === Filter ===
let filtered=data.filter(r=>{if(statusFilter!=='all'&&r.facility_status!==statusFilter)return false;if(nitaqatFilter!=='all'&&r.nitaqat_color!==nitaqatFilter)return false;if(q){const s=q.toLowerCase();return(r.name_ar||'').includes(s)||(r.name_en||'').toLowerCase().includes(s)||(r.cr_number||'').includes(s)||(r.unified_national_number||'').includes(s)};return true})
if(sortBy==='name')filtered.sort((a,b)=>(a.name_ar||'').localeCompare(b.name_ar||''))
else if(sortBy==='workers')filtered.sort((a,b)=>(b.total_workers||0)-(a.total_workers||0))
const totalPages=Math.ceil(filtered.length/PER_PAGE),paged=filtered.slice(page*PER_PAGE,(page+1)*PER_PAGE)
const filteredOwners=owners.filter(r=>!q||JSON.stringify(r).toLowerCase().includes(q.toLowerCase()))
const filteredSubs=subs.filter(r=>!q||(data.find(f=>f.id===r.facility_id)?.name_ar||'').includes(q))
const filteredCreds=creds.filter(r=>!q||(r.username||'').toLowerCase().includes(q.toLowerCase())||(r.credential_type||'').includes(q))

// === Wizard Fields (6 steps) ===
const wizardSteps=[
{title:T('البيانات الأساسية','Basic Info'),fields:[
{k:'name_ar',l:T('الاسم بالعربي','Name (AR)'),r:1},{k:'name_en',l:T('الاسم بالإنجليزي','Name (EN)'),d:1},
{k:'type',l:T('النوع','Type'),opts:[{v:'establishment',l:T('مؤسسة فردية','Establishment')},{v:'company',l:T('شركة','Company')}],r:1},
{k:'legal_form',l:T('الشكل القانوني','Legal Form'),opts:[{v:'sole_proprietorship',l:T('مؤسسة فردية','Sole Proprietorship')},{v:'limited_liability',l:T('ذات مسؤولية محدودة','LLC')},{v:'limited_partnership',l:T('توصية بسيطة','Limited Partnership')},{v:'general_partnership',l:T('تضامن','General Partnership')},{v:'joint_stock',l:T('مساهمة','Joint Stock')},{v:'simplified_joint_stock',l:T('مساهمة مبسطة','Simplified Joint Stock')}]},
{k:'character_count',l:T('عدد الشخصيات','Character Count'),opts:[{v:'one_person',l:T('شخص واحد','One Person')},{v:'two_or_more',l:T('شخصين أو أكثر','Two or More')}]},
{k:'facility_status',l:T('حالة المنشأة','Status'),opts:[{v:'active',l:T('نشط','Active')},{v:'issue',l:T('مشكلة','Issue')}],r:1},
{k:'capital',l:T('رأس المال','Capital'),d:1},
{k:'economic_activity_id',l:T('النشاط الاقتصادي','Economic Activity')}
]},
{title:T('السجل التجاري','Commercial Reg.'),fields:[
{k:'unified_national_number',l:T('الرقم الموحد','Unified No.'),d:1,r:1},
{k:'cr_number',l:T('رقم السجل التجاري','CR Number'),d:1},
{k:'cr_status',l:T('حالة السجل','CR Status'),opts:[{v:'active',l:T('نشط','Active')},{v:'pending_confirmation',l:T('قيد التصديق','Pending')},{v:'suspended',l:T('معلّق','Suspended')},{v:'cancelled',l:T('ملغى','Cancelled')},{v:'expired',l:T('منتهي','Expired')}],r:1},
{k:'cr_issue_date',l:T('تاريخ الإصدار','Issue Date'),t:'date',r:1},
{k:'cr_confirm_date',l:T('تاريخ التصديق','Confirm Date'),t:'date',r:1},
{k:'cr_expiry_date',l:T('تاريخ الانتهاء','Expiry Date (auto +90 days)'),t:'date',r:1},
{k:'is_main_cr',l:T('سجل رئيسي','Main CR'),t:'bool',r:1},
{k:'cr_version_no',l:T('رقم نسخة السجل','CR Version'),d:1},
{k:'cr_delete_date',l:T('تاريخ الشطب','Delete Date'),t:'date'},
{k:'cr_activities',l:T('أنشطة السجل','CR Activities'),w:1}
]},
{title:T('الملفات والأرقام','Files & Numbers'),fields:[
{k:'qiwa_file_number',l:T('رقم ملف قوى','Qiwa File No.'),d:1,r:1},
{k:'gosi_file_number',l:T('رقم ملف التأمينات','GOSI File No.'),d:1,r:1},
{k:'chamber_membership_no',l:T('رقم الغرفة التجارية','Chamber No.'),d:1},
{k:'chamber_membership_expiry',l:T('انتهاء عضوية الغرفة','Chamber Expiry'),t:'date'},
{k:'subl_file_number',l:T('رقم سبل','Subl No.'),d:1},
{k:'vat_number',l:T('رقم ض.ق.م','VAT No.'),d:1},
{k:'vat_status',l:T('حالة الضريبة','VAT Status'),opts:[{v:'registered',l:T('مسجّل','Registered')},{v:'not_registered',l:T('غير مسجّل','Not Registered')},{v:'deregistered',l:T('ملغى','Deregistered')}]},
{k:'zakat_unique_number',l:T('الرقم المميز للزكاة','Zakat No.'),d:1},
{k:'zakat_outstanding_balance',l:T('رصيد الزكاة المستحق','Zakat Balance'),d:1}
]},
{title:T('الربط والموقع','Links & Location'),fields:[
{k:'branch_id',l:T('المكتب','Branch'),opts:branches.map(b=>({v:b.id,l:b.name_ar})),r:1},
{k:'owner_id',l:T('المالك','Owner'),opts:owners.map(o=>({v:o.id,l:o.name_ar})),r:1},
{k:'gosi_owner_id',l:T('مالك التأمينات','GOSI Owner'),opts:owners.map(o=>({v:o.id,l:o.name_ar}))},
{k:'parent_facility_id',l:T('المنشأة الأم','Parent Facility'),opts:data.map(f=>({v:f.id,l:f.name_ar}))},
{k:'region_id',l:T('المنطقة','Region'),opts:regions.map(r=>({v:r.id,l:r.name_ar})),r:1},
{k:'city_id',l:T('المدينة','City'),opts:cities.map(c=>({v:c.id,l:c.name_ar})),r:1},
{k:'address_ar',l:T('العنوان','Address'),w:1},
{k:'mobile',l:T('الجوال','Phone'),d:1},
{k:'email',l:T('البريد','Email'),d:1}
]},
{title:T('نطاقات والعمالة','Nitaqat & Workers'),fields:[
{k:'nitaqat_color',l:T('لون نطاقات','Nitaqat Color'),opts:[{v:'red',l:T('أحمر','Red')},{v:'yellow',l:T('أصفر','Yellow')},{v:'green_low',l:T('أخضر منخفض','Green Low')},{v:'green_mid',l:T('أخضر متوسط','Green Mid')},{v:'green_high',l:T('أخضر عالي','Green High')},{v:'platinum',l:T('بلاتيني','Platinum')}],r:1},
{k:'nitaqat_size',l:T('حجم نطاقات','Nitaqat Size'),opts:[{v:'micro',l:T('صغير جداً','Micro')},{v:'small',l:T('صغير','Small')},{v:'medium',l:T('متوسط','Medium')},{v:'large',l:T('كبير','Large')},{v:'giant',l:T('عملاق','Giant')}],r:1},
{k:'total_workers',l:T('إجمالي العمال','Total Workers'),d:1},
{k:'saudi_workers',l:T('سعوديين','Saudis'),d:1},
{k:'non_saudi_workers',l:T('غير سعوديين','Non-Saudis'),d:1},
{k:'saudization_percentage',l:T('نسبة السعودة %','Saudization %'),d:1},
{k:'max_visas',l:T('الحد الأقصى للتأشيرات','Max Visas'),d:1},
{k:'max_work_permits',l:T('الحد الأقصى لرخص العمل','Max Work Permits'),d:1}
]},
{title:T('الأغراض والملاحظات','Purposes & Notes'),fields:[
{k:'purpose_permanent_visa',l:T('تأشيرة دائمة','Permanent Visa'),t:'bool'},
{k:'purpose_temporary_visa',l:T('تأشيرة مؤقتة','Temporary Visa'),t:'bool'},
{k:'purpose_transfer',l:T('نقل خدمات','Transfer'),t:'bool'},
{k:'is_original_exempt',l:T('مستثنى أصلي','Originally Exempt'),t:'bool'},
{k:'gosi_form',l:T('نموذج التأمينات','GOSI Form'),opts:[{v:'1',l:'1'},{v:'2',l:'2'},{v:'3',l:'3'}]},
{k:'gosi_status',l:T('حالة التأمينات','GOSI Status'),opts:[{v:'active',l:T('نشط','Active')},{v:'inactive',l:T('غير نشط','Inactive')}]},
{k:'mudad_wps_compliance_status',l:T('حالة مدد','Mudad Status'),opts:[{v:'compliant',l:T('متوافق','Compliant')},{v:'non_compliant',l:T('غير متوافق','Non-Compliant')}]},
{k:'mlsd_service_status',l:T('حالة خدمات العمل','Labor Status'),opts:[{v:'active',l:T('نشط','Active')},{v:'suspended',l:T('معلّق','Suspended')}]},
{k:'notes',l:T('ملاحظات','Notes'),w:1}
]}]

const allFieldsFlat=wizardSteps.flatMap(s=>s.fields)
const initForm=()=>Object.fromEntries(allFieldsFlat.map(f=>([f.k,''])))
const openAdd=()=>setWizard({step:0,data:{...initForm(),type:'establishment',facility_status:'active',cr_status:'active',is_main_cr:'true'}})
const openEdit=r=>{const d={};allFieldsFlat.forEach(f=>d[f.k]=r[f.k]!=null?String(r[f.k]):'');setWizard({step:0,editId:r.id,data:d})}
const WZ=wizard?.data||{};const setWZ=(k,v)=>setWizard(p=>({...p,data:{...p.data,[k]:v}}))
const saveWizard=async()=>{setSaving(true);try{const d={...wizard.data};Object.keys(d).forEach(k=>{if(d[k]==='')d[k]=null;if(d[k]==='true')d[k]=true;if(d[k]==='false')d[k]=false})
// Auto calc cr_expiry_date
if(d.cr_confirm_date&&!wizard.data.cr_expiry_date){const dt=new Date(d.cr_confirm_date);dt.setDate(dt.getDate()+90);d.cr_expiry_date=dt.toISOString().split('T')[0]}
if(wizard.editId){d.updated_by=user?.id;const{error}=await sb.from('facilities').update(d).eq('id',wizard.editId);if(error)throw error;toast(T('تم التعديل','Updated'))}else{d.created_by=user?.id;const{error}=await sb.from('facilities').insert(d);if(error)throw error;toast(T('تمت الإضافة','Added'))};setWizard(null);load()}catch(e){toast('خطأ: '+e.message?.slice(0,80))}setSaving(false)}

// View data
const facSubs=viewRow?subs.filter(s=>s.facility_id===viewRow.id):[]
const facCreds=viewRow?creds.filter(c=>c.facility_id===viewRow.id):[]
const facPartners=viewRow?partners.filter(p=>p.facility_id===viewRow.id):[]
const facExemptions=viewRow?exemptions.filter(e=>e.exempt_facility_id===viewRow.id||e.linked_facility_id===viewRow.id):[]

const tabs=[{id:'facilities',l:'المنشآت',le:'Facilities'},{id:'owners',l:'الملّاك',le:'Owners'},{id:'subs',l:'الاشتراكات',le:'Subscriptions'},{id:'creds',l:'بيانات الدخول',le:'Credentials'}]
const fBtnS=a=>({padding:'6px 14px',borderRadius:8,fontSize:10,fontWeight:a?700:500,color:a?C.gold:'rgba(255,255,255,.4)',background:a?'rgba(201,168,76,.08)':'transparent',border:a?'1px solid rgba(201,168,76,.15)':'1px solid rgba(255,255,255,.06)',cursor:'pointer',whiteSpace:'nowrap'})
const SearchBar=<div style={{flex:1,minWidth:180,position:'relative'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="2" style={{position:'absolute',top:12,[isAr?'right':'left']:12}}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><input value={q} onChange={e=>{setQ(e.target.value);setPage(0)}} placeholder={T('بحث ...','Search ...')} style={{width:'100%',height:38,padding:isAr?'0 36px 0 14px':'0 14px 0 36px',border:'1.5px solid rgba(255,255,255,.08)',borderRadius:10,fontFamily:F,fontSize:12,color:'var(--tx)',background:'rgba(255,255,255,.04)',outline:'none'}}/></div>

return<div>
{/* Title + Add */}
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
<div><div style={{fontSize:22,fontWeight:800,color:'var(--tx)'}}>{T('المنشآت','Facilities')}</div><div style={{fontSize:12,color:'var(--tx4)',marginTop:4}}>{T('إدارة المنشآت والملّاك والاشتراكات وبيانات الدخول','Manage facilities, owners, subscriptions & credentials')}</div></div>
{tab==='facilities'&&<button onClick={openAdd} style={bS}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>{T('منشأة','Facility')}</button>}
{tab==='owners'&&<button onClick={()=>{setForm({name_ar:'',name_en:'',id_type:'',id_number:'',nationality:'',gender:'',mobile_personal:'',mobile_work:'',email:'',date_of_birth:'',date_of_birth_h:'',is_relative:'false',notes:''});setPop('owner')}} style={bS}>+ {T('مالك','Owner')}</button>}
{tab==='subs'&&<button onClick={()=>{setForm({facility_id:'',subscription_status:'active',start_date:'',end_date:'',points_balance:'',notes:''});setPop('sub')}} style={bS}>+ {T('اشتراك','Sub')}</button>}
{tab==='creds'&&<button onClick={()=>{setForm({credential_type:'',owner_id:'',facility_id:'',username:'',password:'',phone_linked:'',email_linked:'',status:'active',platform_url:'',notes:''});setPop('cred')}} style={bS}>+ {T('حساب','Credential')}</button>}
</div>

{/* Tabs */}
<div style={{display:'flex',gap:0,marginBottom:22,borderBottom:'1px solid var(--bd)',overflowX:'auto',scrollbarWidth:'none'}}>{tabs.map(t=><div key={t.id} onClick={()=>{setTab(t.id);setQ('');setPage(0);setStatusFilter('all')}} style={{padding:'10px 18px',fontSize:12,fontWeight:tab===t.id?700:500,color:tab===t.id?C.gold:'rgba(255,255,255,.4)',borderBottom:tab===t.id?'2px solid '+C.gold:'2px solid transparent',cursor:'pointer',whiteSpace:'nowrap'}}>{isAr?t.l:t.le}</div>)}</div>

{/* ═══ FACILITIES TAB ═══ */}
{tab==='facilities'&&<>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:22}}>
<StatCard l={T('إجمالي المنشآت','Total')} v={totalFac} c="rgba(201,168,76,.8)" bg="linear-gradient(135deg,rgba(201,168,76,.08),rgba(201,168,76,.02))" bc="rgba(201,168,76,.15)"/>
<StatCard l={T('نشطة ومؤكدة','Active')} v={activeFac} c={C.ok} bg="linear-gradient(135deg,rgba(39,160,70,.08),rgba(39,160,70,.02))" bc="rgba(39,160,70,.15)"/>
<StatCard l={T('معلّقة','Suspended')} v={suspendedFac} c="#e67e22" bg="linear-gradient(135deg,rgba(230,126,34,.08),rgba(230,126,34,.02))" bc="rgba(230,126,34,.15)"/>
<StatCard l={T('بها مشاكل','Issues')} v={issueFac} c={C.red} bg="linear-gradient(135deg,rgba(192,57,43,.08),rgba(192,57,43,.02))" bc="rgba(192,57,43,.15)"/>
<StatCard l={T('نطاق خطر','At Risk')} v={redNitaqat} c="#e74c3c" bg="linear-gradient(135deg,rgba(231,76,60,.08),rgba(231,76,60,.02))" bc="rgba(231,76,60,.15)"/>
<StatCard l={T('تأشيرات متاحة','Visas')} v={totalVisas} c={C.blue} bg="linear-gradient(135deg,rgba(52,131,180,.08),rgba(52,131,180,.02))" bc="rgba(52,131,180,.15)"/>
<StatCard l={T('متوسط السعودة','Avg Saudi%')} v={avgSaudi+'%'} c={C.ok} bg="linear-gradient(135deg,rgba(39,160,70,.08),rgba(39,160,70,.02))" bc="rgba(39,160,70,.15)"/>
</div>
<div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
{SearchBar}
<div style={{display:'flex',gap:4}}>{[{v:'all',l:T('الكل','All')},{v:'active',l:T('نشطة','Active')},{v:'issue',l:T('مشاكل','Issues')}].map(f=><div key={f.v} onClick={()=>{setStatusFilter(f.v);setPage(0)}} style={fBtnS(statusFilter===f.v)}>{f.l}</div>)}</div>
<div style={{display:'flex',gap:3}}>{[{v:'all',l:T('كل النطاقات','All'),c:'#999'},{v:'red',l:T('أحمر','Red'),c:'#e74c3c'},{v:'yellow',l:T('أصفر','Yellow'),c:'#e67e22'},{v:'green_low',l:'G1',c:'#27a046'},{v:'green_mid',l:'G2',c:'#2ecc71'},{v:'green_high',l:'G3',c:'#1abc9c'},{v:'platinum',l:T('بلاتيني','Plat.'),c:'#c9a84c'}].map(f=><div key={f.v} onClick={()=>{setNitaqatFilter(f.v);setPage(0)}} style={{padding:'5px 10px',borderRadius:8,fontSize:10,fontWeight:nitaqatFilter===f.v?700:500,color:nitaqatFilter===f.v?f.c:'rgba(255,255,255,.35)',background:nitaqatFilter===f.v?f.c+'15':'transparent',border:nitaqatFilter===f.v?'1px solid '+f.c+'30':'1px solid rgba(255,255,255,.06)',cursor:'pointer',whiteSpace:'nowrap'}}>{f.v==='all'?f.l:<><span style={{display:'inline-block',width:6,height:6,borderRadius:'50%',background:f.c,marginLeft:4,verticalAlign:'middle'}}/> {f.l}</>}</div>)}</div>
<select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{height:34,padding:'0 10px',borderRadius:8,border:'1px solid var(--bd)',background:'rgba(255,255,255,.04)',color:'rgba(255,255,255,.6)',fontFamily:F,fontSize:11,outline:'none',cursor:'pointer'}}><option value="created_at">{T('الأحدث','Newest')}</option><option value="name">{T('الاسم','Name')}</option><option value="workers">{T('العمال','Workers')}</option></select>
<button onClick={exportCSV} style={{height:34,padding:'0 12px',borderRadius:8,border:'1px solid rgba(52,131,180,.15)',background:'rgba(52,131,180,.06)',color:C.blue,fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>{T('تصدير','Export')}</button>
</div>
{loading?<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>:filtered.length===0?<div style={{textAlign:'center',padding:60,color:'var(--tx6)'}}>{T('لا توجد نتائج','No results')}</div>:<>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:12}}>
{paged.map(r=>{const nClr=sMap[r.nitaqat_color]||'#555';const hasExempt=r.is_original_exempt;const ownCount=partners.filter(p=>p.facility_id===r.id).length||1
const purposes=[];if(r.purpose_transfer)purposes.push(T('نقل','Transfer'));if(r.purpose_permanent_visa)purposes.push(T('تأشيرة دائمة','Perm. Visa'));if(r.purpose_temporary_visa)purposes.push(T('تأشيرة مؤقتة','Temp. Visa'));if(!purposes.length)purposes.push(T('نقل','Transfer'))
const typeLabel=r.type==='company'?T('شركة','Company'):T('مؤسسة فردية','Establishment')
const legalLabel=r.legal_form==='limited_liability'?T('ذ.م.م','LLC'):r.legal_form==='simplified_joint_stock'?T('مساهمة مبسطة','SJS'):''
const alerts=[];if(r.facility_status==='issue')alerts.push(T('مشكلة','Issue'));if(r.cr_status==='suspended')alerts.push(T('معلّق','Suspended'));if(r.cr_status==='expired')alerts.push(T('منتهي','Expired'))
return<div key={r.id} onClick={()=>{setViewRow(r);setViewTab('basic')}} style={{background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:14,overflow:'hidden',cursor:'pointer',transition:'.15s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(201,168,76,.2)';e.currentTarget.style.background='#1c1c1c'}} onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.06)';e.currentTarget.style.background=C.dk}}>
<div style={{padding:'16px 18px'}}>
{/* Name + Icons */}
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
<div style={{fontSize:16,fontWeight:800,color:'var(--tx)',flex:1}}>{r.name_ar}</div>
<div style={{display:'flex',gap:4,flexShrink:0}}>
<div style={{width:22,height:22,borderRadius:'50%',background:nClr+'20',border:'1.5px solid '+nClr+'40',display:'flex',alignItems:'center',justifyContent:'center'}} title={r.nitaqat_color}><div style={{width:8,height:8,borderRadius:'50%',background:nClr}}/></div>
{hasExempt&&<div style={{height:22,padding:'0 8px',borderRadius:11,background:'rgba(201,168,76,.1)',border:'1px solid rgba(201,168,76,.15)',display:'flex',alignItems:'center',gap:4}} title={T('إعفاء أسبوعي','Weekly Exemption')}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><span style={{fontSize:8,fontWeight:700,color:C.gold}}>{T('معفى','Exempt')}</span></div>}
</div>
</div>
{r.name_en&&<div style={{fontSize:10,color:'var(--tx5)',direction:'ltr',marginBottom:12}}>{r.name_en}</div>}
{/* Type badges */}
<div style={{display:'flex',alignItems:'center',gap:6,marginBottom:14,flexWrap:'wrap'}}>
<span style={{fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:6,background:'rgba(52,131,180,.08)',color:'#3483b4',border:'1px solid rgba(52,131,180,.1)'}}>{typeLabel}</span>
{legalLabel&&<span style={{fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:6,background:'rgba(201,168,76,.06)',color:'rgba(201,168,76,.6)',border:'1px solid rgba(201,168,76,.08)'}}>{legalLabel} · {ownCount} {T('ملّاك','owners')}</span>}
{!legalLabel&&<span style={{fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:6,background:'rgba(201,168,76,.06)',color:'rgba(201,168,76,.6)',border:'1px solid rgba(201,168,76,.08)'}}>{ownCount} {T('ملّاك','owners')}</span>}
<span style={{fontSize:9,padding:'3px 10px',borderRadius:6,background:'rgba(39,160,70,.06)',color:'rgba(39,160,70,.6)',border:'1px solid rgba(39,160,70,.08)'}}>{purposes.join(' + ')}</span>
</div>
{/* 3 Number boxes with copy */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:10}}>
{[[r.unified_national_number,T('الرقم الموحد','Unified')],[r.gosi_file_number,T('التأمينات','GOSI')],[r.qiwa_file_number,T('قوى','Qiwa')]].map(([val,label],i)=><div key={i} style={{background:'rgba(255,255,255,.025)',borderRadius:8,padding:'8px 10px',border:'1px solid rgba(255,255,255,.03)',position:'relative'}}>
<div style={{fontSize:7,fontWeight:600,color:'var(--tx6)',marginBottom:4,letterSpacing:.5,textAlign:'center'}}>{label}</div>
<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
<div style={{fontSize:12,fontWeight:800,color:'rgba(255,255,255,.7)',direction:'ltr'}}>{val||'—'}</div>
{val&&<button onClick={e=>{e.stopPropagation();navigator.clipboard.writeText(val);toast(T('تم النسخ','Copied'))}} style={{width:18,height:18,borderRadius:4,border:'none',background:'rgba(255,255,255,.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,padding:0}} title={T('نسخ','Copy')}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>}
</div></div>)}
</div>
{/* Confirmation date */}
{r.cr_confirm_date&&<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginBottom:12,padding:'6px 10px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.03)'}}>
<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
<span style={{fontSize:9,color:'var(--tx5)'}}>{T('التأكيد السنوي','Annual Confirm')}</span>
<span style={{fontSize:10,fontWeight:700,color:'var(--tx3)',direction:'ltr'}}>{r.cr_confirm_date}</span>
</div>}
{/* Stats row */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:6,marginBottom:6}}>
<div style={{background:'rgba(201,168,76,.04)',borderRadius:8,padding:'8px 10px',border:'1px solid rgba(201,168,76,.06)',textAlign:'center'}}><div style={{fontSize:7,color:'rgba(201,168,76,.5)',marginBottom:3}}>{T('العمال','Workers')}</div><div style={{fontSize:18,fontWeight:900,color:'rgba(201,168,76,.7)',lineHeight:1}}>{r.total_workers||0}</div></div>
<div style={{background:'rgba(52,131,180,.04)',borderRadius:8,padding:'8px 10px',border:'1px solid rgba(52,131,180,.06)',textAlign:'center'}}><div style={{fontSize:7,color:'rgba(52,131,180,.5)',marginBottom:3}}>{T('التأشيرات','Visas')}</div><div style={{fontSize:18,fontWeight:900,color:'rgba(52,131,180,.7)',lineHeight:1}}>{r.max_visas||0}</div></div>
<div style={{background:'rgba(39,160,70,.04)',borderRadius:8,padding:'8px 10px',border:'1px solid rgba(39,160,70,.06)',textAlign:'center'}}><div style={{fontSize:7,color:'rgba(39,160,70,.5)',marginBottom:3}}>{T('السعودة','Saudi%')}</div><div style={{fontSize:18,fontWeight:900,color:'rgba(39,160,70,.7)',lineHeight:1}}>{Math.round(r.saudization_percentage||0)}%</div></div>
{alerts.length>0?<div style={{background:'rgba(192,57,43,.04)',borderRadius:8,padding:'8px 10px',border:'1px solid rgba(192,57,43,.08)',textAlign:'center'}}><div style={{fontSize:7,color:'rgba(192,57,43,.5)',marginBottom:3}}>{T('تنبيه','Alert')}</div><div style={{fontSize:18,fontWeight:900,color:'rgba(192,57,43,.7)',lineHeight:1}}>{alerts.length}</div></div>
:<div style={{background:'rgba(155,89,182,.04)',borderRadius:8,padding:'8px 10px',border:'1px solid rgba(155,89,182,.06)',textAlign:'center'}}><div style={{fontSize:7,color:'rgba(155,89,182,.5)',marginBottom:3}}>{T('سعودي/أجنبي','S/NS')}</div><div style={{fontSize:12,fontWeight:800,color:'rgba(155,89,182,.7)',lineHeight:1.4}}>{r.saudi_workers||0}/{r.non_saudi_workers||0}</div></div>}
</div>
{r.cr_expiry_date&&(()=>{const dLeft=Math.ceil((new Date(r.cr_expiry_date)-new Date())/(86400000));const expClr=dLeft<0?C.red:dLeft<30?'#e67e22':dLeft<90?C.gold:null;return expClr?<div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 10px',borderRadius:6,background:expClr+'10',border:'1px solid '+expClr+'20',marginTop:2}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={expClr} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg><span style={{fontSize:9,fontWeight:700,color:expClr}}>{dLeft<0?T('السجل منتهي!','CR Expired!'):T('السجل ينتهي خلال ','CR expires in ')+dLeft+T(' يوم',' days')}</span></div>:null})()}
</div></div>})}</div>
{totalPages>1&&<div style={{display:'flex',justifyContent:'center',gap:6,marginTop:18}}>{Array.from({length:totalPages},(_,i)=><div key={i} onClick={()=>setPage(i)} style={{width:32,height:32,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:page===i?700:500,color:page===i?C.gold:'rgba(255,255,255,.4)',background:page===i?'rgba(201,168,76,.1)':'rgba(255,255,255,.04)',border:page===i?'1px solid rgba(201,168,76,.2)':'1px solid rgba(255,255,255,.06)',cursor:'pointer'}}>{i+1}</div>)}</div>}
</>}</>}

{/* ═══ OWNERS TAB ═══ */}
{tab==='owners'&&<>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:22}}>
<StatCard l={T('إجمالي الملّاك','Total')} v={owners.length} c="rgba(201,168,76,.8)" bg="linear-gradient(135deg,rgba(201,168,76,.08),rgba(201,168,76,.02))" bc="rgba(201,168,76,.15)"/>
<StatCard l={T('ذكور','Males')} v={owners.filter(o=>o.gender==='male').length} c={C.blue} bg="linear-gradient(135deg,rgba(52,131,180,.08),rgba(52,131,180,.02))" bc="rgba(52,131,180,.15)"/>
<StatCard l={T('إناث','Females')} v={owners.filter(o=>o.gender==='female').length} c="#9b59b6" bg="linear-gradient(135deg,rgba(155,89,182,.08),rgba(155,89,182,.02))" bc="rgba(155,89,182,.15)"/>
</div>
<div style={{marginBottom:14}}>{SearchBar}</div>
<div style={{display:'flex',flexDirection:'column',gap:6}}>
{filteredOwners.length===0?<div style={{textAlign:'center',padding:50,color:'var(--tx6)'}}>{T('لا يوجد ملّاك','No owners')}</div>:
filteredOwners.map(r=><div key={r.id} style={{background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:12,padding:'14px 18px',display:'flex',alignItems:'center',gap:14,transition:'.15s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(201,168,76,.15)';e.currentTarget.style.background='#1c1c1c'}} onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.06)';e.currentTarget.style.background=C.dk}}>
<div style={{width:42,height:42,borderRadius:12,background:r.gender==='female'?'rgba(155,89,182,.1)':'rgba(52,131,180,.1)',border:'1px solid '+(r.gender==='female'?'rgba(155,89,182,.15)':'rgba(52,131,180,.15)'),display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:800,color:r.gender==='female'?'#9b59b6':C.blue,flexShrink:0}}>{(r.name_ar||'م')[0]}</div>
<div style={{flex:1,minWidth:0}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3,flexWrap:'wrap'}}><span style={{fontSize:14,fontWeight:700,color:'var(--tx)'}}>{r.name_ar}</span>{r.name_en&&<span style={{fontSize:10,color:'var(--tx5)',direction:'ltr'}}>{r.name_en}</span>}<span style={{fontSize:9,fontWeight:600,padding:'2px 8px',borderRadius:5,background:r.gender==='female'?'rgba(155,89,182,.1)':'rgba(52,131,180,.1)',color:r.gender==='female'?'#9b59b6':C.blue}}>{r.gender==='female'?T('أنثى','Female'):T('ذكر','Male')}</span></div>
<div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>{r.id_number&&<span style={{fontSize:11,color:'var(--tx4)',direction:'ltr'}}>{r.id_number}</span>}{r.mobile_personal&&<span style={{fontSize:11,color:'var(--tx4)',direction:'ltr'}}>{r.mobile_personal}</span>}{r.email&&<span style={{fontSize:11,color:'var(--tx4)',direction:'ltr'}}>{r.email}</span>}</div></div>
<div style={{display:'flex',gap:4,flexShrink:0}}><EditBtn onClick={()=>{setForm({_id:r.id,name_ar:r.name_ar||'',name_en:r.name_en||'',id_type:r.id_type||'',id_number:r.id_number||'',nationality:r.nationality||'',gender:r.gender||'',mobile_personal:r.mobile_personal||'',mobile_work:r.mobile_work||'',email:r.email||'',date_of_birth:r.date_of_birth||'',date_of_birth_h:r.date_of_birth_h||'',is_relative:String(r.is_relative||false),notes:r.notes||''});setPop('owner')}}/><DelBtn onClick={()=>del('owners',r.id)}/></div>
</div>)}</div></>}

{/* ═══ SUBS TAB ═══ */}
{tab==='subs'&&<>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:22}}>
<StatCard l={T('الإجمالي','Total')} v={subs.length} c="rgba(201,168,76,.8)" bg="linear-gradient(135deg,rgba(201,168,76,.08),rgba(201,168,76,.02))" bc="rgba(201,168,76,.15)"/>
<StatCard l={T('نشطة','Active')} v={activeSubs} c={C.ok} bg="linear-gradient(135deg,rgba(39,160,70,.08),rgba(39,160,70,.02))" bc="rgba(39,160,70,.15)"/>
<StatCard l={T('منتهية','Expired')} v={expiredSubs} c={C.red} bg="linear-gradient(135deg,rgba(192,57,43,.08),rgba(192,57,43,.02))" bc="rgba(192,57,43,.15)"/>
</div>
<div style={{marginBottom:14}}>{SearchBar}</div>
<div style={{display:'flex',flexDirection:'column',gap:6}}>{filteredSubs.length===0?<div style={{textAlign:'center',padding:50,color:'var(--tx6)'}}>{T('لا توجد اشتراكات','No subscriptions')}</div>:filteredSubs.map(r=>{const fac=data.find(f=>f.id===r.facility_id);return<div key={r.id} style={{background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:12,padding:'14px 18px',display:'flex',alignItems:'center',gap:14,transition:'.15s'}} onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(201,168,76,.15)'} onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,255,255,.06)'}>
<div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:'var(--tx2)',marginBottom:4}}>{fac?.name_ar||T('منشأة','Facility')}</div><div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}><Badge v={r.subscription_status}/><span style={{fontSize:10,color:'var(--tx4)',direction:'ltr'}}>{r.start_date||'—'} → {r.end_date||'—'}</span>{r.points_balance>0&&<span style={{fontSize:10,color:C.gold}}>{r.points_balance} {T('نقطة','pts')}</span>}</div>{r.notes&&<div style={{fontSize:10,color:'var(--tx6)',marginTop:4}}>{r.notes}</div>}</div>
<div style={{display:'flex',gap:4,flexShrink:0}}><EditBtn onClick={()=>{setForm({_id:r.id,facility_id:r.facility_id||'',subscription_status:r.subscription_status||'',start_date:r.start_date||'',end_date:r.end_date||'',points_balance:r.points_balance||'',notes:r.notes||''});setPop('sub')}}/><DelBtn onClick={()=>del('facility_subscriptions',r.id)}/></div></div>})}</div></>}

{/* ═══ CREDS TAB ═══ */}
{tab==='creds'&&<>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:22}}>
<StatCard l={T('الإجمالي','Total')} v={creds.length} c="rgba(201,168,76,.8)" bg="linear-gradient(135deg,rgba(201,168,76,.08),rgba(201,168,76,.02))" bc="rgba(201,168,76,.15)"/>
<StatCard l={T('نشطة','Active')} v={activeCreds} c={C.ok} bg="linear-gradient(135deg,rgba(39,160,70,.08),rgba(39,160,70,.02))" bc="rgba(39,160,70,.15)"/>
<StatCard l={T('معطّلة','Inactive')} v={inactiveCreds} c={C.red} bg="linear-gradient(135deg,rgba(192,57,43,.08),rgba(192,57,43,.02))" bc="rgba(192,57,43,.15)"/>
</div>
<div style={{marginBottom:14}}>{SearchBar}</div>
<div style={{display:'flex',flexDirection:'column',gap:6}}>{filteredCreds.length===0?<div style={{textAlign:'center',padding:50,color:'var(--tx6)'}}>{T('لا توجد بيانات','No credentials')}</div>:filteredCreds.map(r=>{const fac=data.find(f=>f.id===r.facility_id);const own=owners.find(o=>o.id===r.owner_id);return<div key={r.id} style={{background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:12,padding:'14px 18px',display:'flex',alignItems:'center',gap:14,transition:'.15s'}} onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(201,168,76,.15)'} onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,255,255,.06)'}>
<div style={{flex:1}}><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}><span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>{r.credential_type?.toUpperCase()}</span><Badge v={r.status}/></div><div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>{r.username&&<span style={{fontSize:11,color:'var(--tx4)',direction:'ltr'}}>{r.username}</span>}{fac&&<span style={{fontSize:10,color:'var(--tx5)'}}>{fac.name_ar}</span>}{own&&<span style={{fontSize:10,color:'var(--tx5)'}}>{own.name_ar}</span>}</div></div>
<div style={{display:'flex',gap:4,flexShrink:0}}><EditBtn onClick={()=>{setForm({_id:r.id,credential_type:r.credential_type||'',owner_id:r.owner_id||'',facility_id:r.facility_id||'',username:r.username||'',password:r.password||'',phone_linked:r.phone_linked||'',email_linked:r.email_linked||'',status:r.status||'',platform_url:r.platform_url||'',notes:r.notes||''});setPop('cred')}}/><DelBtn onClick={()=>del('platform_credentials',r.id)}/></div></div>})}</div></>}

{/* ═══ VIEW FACILITY POPUP — Side Tabs ═══ */}
{viewRow&&(()=>{const facWorkers=[];const facVisas=visas.filter(v=>v.facility_id===viewRow.id);const facWeekly=weeklyStats.filter(w=>w.facility_id===viewRow.id);const nClr=sMap[viewRow.nitaqat_color]||'#555'
const resolve=(k,v)=>{if(k==='branch_id')return branches.find(b=>b.id===v)?.name_ar||v;if(k==='owner_id'||k==='gosi_owner_id')return owners.find(o=>o.id===v)?.name_ar||v;if(k==='region_id')return regions.find(r=>r.id===v)?.name_ar||v;if(k==='city_id')return cities.find(c=>c.id===v)?.name_ar||v;if(k==='parent_facility_id')return data.find(f=>f.id===v)?.name_ar||v;return v}
const InfoBox=({l,v,copy,isSt})=><div style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'14px 16px',border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:9,color:'var(--tx5)',marginBottom:6}}>{l}</div><div style={{display:'flex',alignItems:'center',gap:6}}><div style={{fontSize:14,fontWeight:700,color:isSt?(sMap[v]||'rgba(255,255,255,.85)'):'rgba(255,255,255,.85)',direction:copy?'ltr':'inherit'}}>{isSt?<Badge v={v}/>:v}</div>{copy&&v&&v!=='—'&&<button onClick={e=>{e.stopPropagation();navigator.clipboard.writeText(String(v));toast(T('تم النسخ','Copied'))}} style={{width:20,height:20,borderRadius:5,border:'none',background:'rgba(255,255,255,.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,flexShrink:0}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>}</div></div>
const vtabs=[{id:'basic',l:T('البيانات الأساسية','Basic Info')},{id:'cr',l:T('السجل التجاري','Commercial Reg.')},{id:'fpartners',l:T('الملّاك','Owners'),n:facPartners.length},{id:'fworkers',l:T('العمال','Workers'),n:viewRow.total_workers||0},{id:'fvisas',l:T('التأشيرات','Visas'),n:facVisas.length},{id:'weekly',l:T('السجل الأسبوعي','Weekly Log'),n:facWeekly.length},{id:'fsubs',l:T('الاشتراكات','Subscriptions'),n:facSubs.length},{id:'fcreds',l:T('بيانات الدخول','Credentials'),n:facCreds.length}]
return<div onClick={()=>setViewRow(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(920px,95vw)',maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.5)',border:'1px solid rgba(201,168,76,.15)'}}>
{/* Header */}
<div style={{background:'var(--bg)',padding:'16px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(201,168,76,.12)'}}>
<div style={{display:'flex',alignItems:'center',gap:12}}>
<div style={{width:44,height:44,borderRadius:12,background:'rgba(201,168,76,.08)',border:'1.5px solid rgba(201,168,76,.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:900,color:C.gold,flexShrink:0}}>{(viewRow.name_ar||'م')[0]}</div>
<div>
<div style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:17,fontWeight:800,color:'var(--tx)'}}>{viewRow.name_ar}</span><Badge v={viewRow.facility_status}/><div style={{width:18,height:18,borderRadius:'50%',background:nClr+'20',border:'1.5px solid '+nClr+'40',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:6,height:6,borderRadius:'50%',background:nClr}}/></div></div>
<div style={{fontSize:10,color:'var(--tx5)',marginTop:2,direction:'ltr'}}>{viewRow.name_en||''} · {viewRow.type==='company'?T('شركة','Company'):T('مؤسسة','Establishment')}{viewRow.legal_form==='limited_liability'?' · '+T('ذ.م.م','LLC'):''}</div>
</div></div>
<div style={{display:'flex',gap:6}}>
<button onClick={()=>{setViewRow(null);openEdit(viewRow)}} style={{height:32,padding:'0 16px',borderRadius:8,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.08)',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer'}}>{T('تعديل','Edit')}</button>
<button onClick={()=>{if(confirm(T('حذف؟','Delete?'))){del('facilities',viewRow.id);setViewRow(null)}}} style={{height:32,padding:'0 12px',borderRadius:8,border:'1px solid rgba(192,57,43,.15)',background:'rgba(192,57,43,.06)',color:C.red,fontFamily:F,fontSize:11,fontWeight:600,cursor:'pointer'}}>{T('حذف','Delete')}</button>
<button onClick={()=>setViewRow(null)} style={{width:32,height:32,borderRadius:8,background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
</div></div>
{/* Body: Side tabs + Content */}
<div style={{display:'flex',flex:1,overflow:'hidden'}}>
{/* Side tabs */}
<div style={{width:170,background:'rgba(255,255,255,.015)',borderLeft:'1px solid rgba(255,255,255,.04)',padding:'12px 0',flexShrink:0,overflowY:'auto'}}>
{vtabs.map(t=><div key={t.id} onClick={()=>setViewTab(t.id)} style={{padding:'10px 16px',fontSize:11,fontWeight:viewTab===t.id?700:500,color:viewTab===t.id?C.gold:'rgba(255,255,255,.4)',background:viewTab===t.id?'rgba(201,168,76,.06)':'transparent',borderRight:viewTab===t.id?'3px solid '+C.gold:'3px solid transparent',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',transition:'.15s'}}><span>{t.l}</span>{t.n!=null&&<span style={{fontSize:9,color:viewTab===t.id?'rgba(201,168,76,.5)':'rgba(255,255,255,.2)',background:viewTab===t.id?'rgba(201,168,76,.08)':'rgba(255,255,255,.04)',padding:'2px 6px',borderRadius:4,minWidth:18,textAlign:'center'}}>{t.n}</span>}</div>)}
</div>
{/* Content */}
<div style={{flex:1,overflowY:'auto',padding:'20px 24px'}}>

{viewTab==='basic'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<InfoBox l={T('النوع','Type')} v={viewRow.type==='company'?T('شركة','Company'):T('مؤسسة فردية','Establishment')}/>
<InfoBox l={T('الشكل القانوني','Legal Form')} v={viewRow.legal_form||'—'}/>
<InfoBox l={T('الحالة','Status')} v={viewRow.facility_status} isSt/>
<InfoBox l={T('رأس المال','Capital')} v={viewRow.capital?nm(viewRow.capital)+' '+T('ر.س','SAR'):'—'}/>
<InfoBox l={T('المكتب','Branch')} v={resolve('branch_id',viewRow.branch_id)||'—'}/>
<InfoBox l={T('المالك','Owner')} v={resolve('owner_id',viewRow.owner_id)||'—'}/>
<InfoBox l={T('المنطقة','Region')} v={resolve('region_id',viewRow.region_id)||'—'}/>
<InfoBox l={T('المدينة','City')} v={resolve('city_id',viewRow.city_id)||'—'}/>
<InfoBox l={T('الجوال','Phone')} v={viewRow.mobile||'—'} copy/>
<InfoBox l={T('البريد','Email')} v={viewRow.email||'—'} copy/>
{viewRow.address_ar&&<div style={{gridColumn:'1/-1'}}><InfoBox l={T('العنوان','Address')} v={viewRow.address_ar}/></div>}
</div>}

{viewTab==='cr'&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<InfoBox l={T('الرقم الموحد','Unified No.')} v={viewRow.unified_national_number||'—'} copy/>
<InfoBox l={T('رقم السجل','CR No.')} v={viewRow.cr_number||'—'} copy/>
<InfoBox l={T('حالة السجل','CR Status')} v={viewRow.cr_status} isSt/>
<InfoBox l={T('سجل رئيسي','Main CR')} v={viewRow.is_main_cr?T('نعم','Yes'):T('لا','No')}/>
<InfoBox l={T('تاريخ الإصدار','Issue Date')} v={viewRow.cr_issue_date||'—'}/>
<InfoBox l={T('تاريخ التصديق','Confirm Date')} v={viewRow.cr_confirm_date||'—'}/>
<InfoBox l={T('تاريخ الانتهاء','Expiry Date')} v={viewRow.cr_expiry_date||'—'}/>
{viewRow.cr_delete_date&&<InfoBox l={T('تاريخ الشطب','Delete Date')} v={viewRow.cr_delete_date}/>}
{viewRow.cr_version_no&&<InfoBox l={T('رقم النسخة','Version')} v={viewRow.cr_version_no}/>}
<InfoBox l={T('ملف قوى','Qiwa File')} v={viewRow.qiwa_file_number||'—'} copy/>
<InfoBox l={T('ملف التأمينات','GOSI File')} v={viewRow.gosi_file_number||'—'} copy/>
{viewRow.chamber_membership_no&&<InfoBox l={T('الغرفة التجارية','Chamber')} v={viewRow.chamber_membership_no} copy/>}
{viewRow.subl_file_number&&<InfoBox l={T('سُبل','Subl')} v={viewRow.subl_file_number} copy/>}
{viewRow.vat_number&&<InfoBox l={T('ض.ق.م','VAT')} v={viewRow.vat_number} copy/>}
{viewRow.zakat_unique_number&&<InfoBox l={T('الرقم المميز','Zakat')} v={viewRow.zakat_unique_number} copy/>}
{viewRow.cr_activities&&<div style={{gridColumn:'1/-1'}}><InfoBox l={T('الأنشطة','Activities')} v={viewRow.cr_activities}/></div>}
</div>}

{viewTab==='fpartners'&&<div style={{display:'flex',flexDirection:'column',gap:8}}>{facPartners.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)'}}>{T('لا يوجد ملّاك/شركاء','No partners')}</div>:facPartners.map(p=>{const own=owners.find(o=>o.id===p.owner_id);return<div key={p.id} style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'14px 16px',border:'1px solid rgba(255,255,255,.03)',display:'flex',alignItems:'center',gap:12}}>
<div style={{width:38,height:38,borderRadius:10,background:'rgba(52,131,180,.1)',border:'1px solid rgba(52,131,180,.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:C.blue,flexShrink:0}}>{(own?.name_ar||'م')[0]}</div>
<div style={{flex:1}}><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}><span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>{own?.name_ar||T('مالك','Owner')}</span>{p.is_manager&&<span style={{fontSize:9,color:C.gold,background:'rgba(201,168,76,.1)',padding:'2px 8px',borderRadius:5,fontWeight:700}}>{T('مدير','Manager')}</span>}<Badge v={p.status}/></div>
{p.ownership_percentage&&<span style={{fontSize:11,color:'var(--tx4)'}}>{T('نسبة الملكية','Ownership')}: <span style={{fontWeight:700,color:'rgba(255,255,255,.6)'}}>{p.ownership_percentage}%</span></span>}
</div></div>})}</div>}

{viewTab==='fworkers'&&<div style={{textAlign:'center',padding:40}}>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:20}}>
<div style={{background:'rgba(201,168,76,.04)',borderRadius:10,padding:'16px',border:'1px solid rgba(201,168,76,.06)'}}><div style={{fontSize:9,color:'rgba(201,168,76,.5)',marginBottom:6}}>{T('إجمالي العمال','Total')}</div><div style={{fontSize:28,fontWeight:900,color:'rgba(201,168,76,.7)'}}>{viewRow.total_workers||0}</div></div>
<div style={{background:'rgba(39,160,70,.04)',borderRadius:10,padding:'16px',border:'1px solid rgba(39,160,70,.06)'}}><div style={{fontSize:9,color:'rgba(39,160,70,.5)',marginBottom:6}}>{T('سعوديين','Saudis')}</div><div style={{fontSize:28,fontWeight:900,color:'rgba(39,160,70,.7)'}}>{viewRow.saudi_workers||0}</div></div>
<div style={{background:'rgba(52,131,180,.04)',borderRadius:10,padding:'16px',border:'1px solid rgba(52,131,180,.06)'}}><div style={{fontSize:9,color:'rgba(52,131,180,.5)',marginBottom:6}}>{T('غير سعوديين','Non-Saudis')}</div><div style={{fontSize:28,fontWeight:900,color:'rgba(52,131,180,.7)'}}>{viewRow.non_saudi_workers||0}</div></div>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<InfoBox l={T('نسبة السعودة','Saudization')} v={viewRow.saudization_percentage?viewRow.saudization_percentage+'%':'—'}/>
<InfoBox l={T('حد رخص العمل','Max Permits')} v={viewRow.max_work_permits||'—'}/>
<InfoBox l={T('نطاقات','Nitaqat')} v={viewRow.nitaqat_color} isSt/>
<InfoBox l={T('حجم نطاقات','Nitaqat Size')} v={viewRow.nitaqat_size||'—'}/>
</div></div>}

{viewTab==='fvisas'&&<div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:20}}>
<div style={{background:'rgba(52,131,180,.04)',borderRadius:10,padding:'16px',border:'1px solid rgba(52,131,180,.06)'}}><div style={{fontSize:9,color:'rgba(52,131,180,.5)',marginBottom:6}}>{T('متاحة','Available')}</div><div style={{fontSize:28,fontWeight:900,color:'rgba(52,131,180,.7)'}}>{facVisas.filter(v=>v.status==='available').length}</div></div>
<div style={{background:'rgba(39,160,70,.04)',borderRadius:10,padding:'16px',border:'1px solid rgba(39,160,70,.06)'}}><div style={{fontSize:9,color:'rgba(39,160,70,.5)',marginBottom:6}}>{T('مستخدمة','Used')}</div><div style={{fontSize:28,fontWeight:900,color:'rgba(39,160,70,.7)'}}>{facVisas.filter(v=>v.status==='used').length}</div></div>
<div style={{background:'rgba(192,57,43,.04)',borderRadius:10,padding:'16px',border:'1px solid rgba(192,57,43,.06)'}}><div style={{fontSize:9,color:'rgba(192,57,43,.5)',marginBottom:6}}>{T('ملغاة','Cancelled')}</div><div style={{fontSize:28,fontWeight:900,color:'rgba(192,57,43,.7)'}}>{facVisas.filter(v=>v.status==='cancelled').length}</div></div>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
<InfoBox l={T('حد التأشيرات','Max Visas')} v={viewRow.max_visas||'—'}/>
<InfoBox l={T('الأغراض','Purposes')} v={[viewRow.purpose_transfer&&T('نقل','Transfer'),viewRow.purpose_permanent_visa&&T('دائمة','Perm.'),viewRow.purpose_temporary_visa&&T('مؤقتة','Temp.')].filter(Boolean).join(' · ')||'—'}/>
</div>
{facVisas.length>0?<div style={{display:'flex',flexDirection:'column',gap:6}}>{facVisas.map(v=><div key={v.id} style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'12px 16px',border:'1px solid rgba(255,255,255,.03)',display:'flex',alignItems:'center',gap:12}}>
<div style={{flex:1}}><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>{v.visa_number&&<span style={{fontSize:12,fontWeight:700,color:'var(--tx2)',direction:'ltr'}}>{v.visa_number}</span>}<Badge v={v.status}/>{v.visa_type&&<span style={{fontSize:9,color:'var(--tx5)',background:'rgba(255,255,255,.04)',padding:'2px 6px',borderRadius:4}}>{v.visa_type}</span>}</div>
<div style={{display:'flex',gap:10,fontSize:10,color:'var(--tx4)'}}>
{v.border_number&&<span style={{direction:'ltr'}}>{T('حدود:','Border:')} {v.border_number}</span>}
{v.issue_date&&<span>{T('إصدار:','Issue:')} {v.issue_date}</span>}
{v.expiry_date&&<span>{T('انتهاء:','Expiry:')} {v.expiry_date}</span>}
</div></div>
<DelBtn onClick={()=>del('facility_visas',v.id)}/>
</div>)}</div>:<div style={{textAlign:'center',padding:30,color:'var(--tx6)'}}>{T('لا توجد تأشيرات','No visas')}</div>}
</div>}

{viewTab==='weekly'&&<div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
<div style={{fontSize:12,fontWeight:600,color:'var(--tx4)'}}>{facWeekly.length} {T('سجل','records')}</div>
<button onClick={()=>{const last=facWeekly[0]||{};const today=new Date().toISOString().split('T')[0];setForm({_table:'weekly',facility_id:viewRow.id,week_date:today,nitaqat_color:last.nitaqat_color||viewRow.nitaqat_color||'',nitaqat_size:last.nitaqat_size||viewRow.nitaqat_size||'',total_workers:last.total_workers??'',saudi_workers:last.saudi_workers??'',non_saudi_workers:last.non_saudi_workers??'',total_workers_in_nitaqat:last.total_workers_in_nitaqat??'',saudization_percentage:last.saudization_percentage??'',contract_auth_pct:last.contract_auth_pct??'',wps_compliance_pct:last.wps_compliance_pct??'',authenticated_count:last.authenticated_count??'',unauthenticated_count:last.unauthenticated_count??'',has_weekly_exemption:String(last.has_weekly_exemption||false),gosi_total_contributors:last.gosi_total_contributors??'',gosi_saudi_contributors:last.gosi_saudi_contributors??'',gosi_non_saudi_contributors:last.gosi_non_saudi_contributors??'',gosi_active_contributors:last.gosi_active_contributors??'',gosi_non_active_contributors:last.gosi_non_active_contributors??'',gosi_total_contributions:last.gosi_total_contributions??'',gosi_total_debit:last.gosi_total_debit??'',gosi_penalties:last.gosi_penalties??'',gosi_total_obligations:last.gosi_total_obligations??'',mudad_wps_compliance_pct:last.mudad_wps_compliance_pct??'',ajeer_borrowed_workers_count:last.ajeer_borrowed_workers_count??'',ajeer_active_contracts:last.ajeer_active_contracts??''});setPop('weekly_add')}} style={{...bS,height:32,padding:'0 14px',fontSize:10}}>+ {T('إضافة سجل','Add Record')}</button>
</div>
{facWeekly.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)'}}>{T('لا توجد بيانات أسبوعية بعد','No weekly data yet')}</div>:
<div style={{display:'flex',flexDirection:'column',gap:10}}>
{facWeekly.slice(0,12).map(w=><div key={w.id} style={{background:'rgba(255,255,255,.025)',borderRadius:12,padding:'16px',border:'1px solid rgba(255,255,255,.04)'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
<div style={{display:'flex',alignItems:'center',gap:8}}>
<span style={{fontSize:13,fontWeight:700,color:'var(--tx2)',direction:'ltr'}}>{w.week_date}</span>
{w.nitaqat_color&&<Badge v={w.nitaqat_color}/>}
{w.has_weekly_exemption&&<span style={{fontSize:8,fontWeight:700,color:C.gold,background:'rgba(201,168,76,.1)',padding:'2px 6px',borderRadius:4}}>{T('معفى','Exempt')}</span>}
</div>
<span style={{fontSize:10,color:'var(--tx5)'}}>{w.saudization_percentage!=null?w.saudization_percentage+'%':''} {T('سعودة','')}</span>
</div>
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:10}}>
{[
[T('إجمالي','Total'),w.total_workers,'rgba(255,255,255,.6)'],
[T('سعوديين','Saudis'),w.saudi_workers,C.ok],
[T('غير سعوديين','Non-Saudi'),w.non_saudi_workers,C.blue],
[T('في نطاقات','In Nitaqat'),w.total_workers_in_nitaqat,C.gold]
].map(([l,v,c],i)=><div key={i} style={{textAlign:'center',padding:'8px 4px',borderRadius:8,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.03)'}}>
<div style={{fontSize:8,color:'var(--tx5)',marginBottom:3}}>{l}</div>
<div style={{fontSize:16,fontWeight:800,color:c}}>{v??'—'}</div>
</div>)}
</div>
<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,fontSize:9}}>
{[
[T('توثيق العقود','Contract Auth'),w.contract_auth_pct!=null?w.contract_auth_pct+'%':'—'],
[T('حماية الأجور','WPS'),w.wps_compliance_pct!=null?w.wps_compliance_pct+'%':'—'],
[T('مدد','Mudad'),w.mudad_wps_compliance_pct!=null?w.mudad_wps_compliance_pct+'%':'—'],
[T('مشتركين التأمينات','GOSI Total'),w.gosi_total_contributors??'—'],
[T('مديونية التأمينات','GOSI Debit'),w.gosi_total_debit??'—'],
[T('أجير','Ajeer'),w.ajeer_active_contracts??'—']
].map(([l,v],i)=><div key={i} style={{padding:'6px 8px',background:'rgba(255,255,255,.015)',borderRadius:6,border:'1px solid rgba(255,255,255,.025)'}}>
<div style={{color:'var(--tx6)',marginBottom:2}}>{l}</div>
<div style={{color:'var(--tx3)',fontWeight:700,fontSize:11}}>{v}</div>
</div>)}
</div>
</div>)}
</div>}
</div>}

{viewTab==='fsubs'&&<div style={{display:'flex',flexDirection:'column',gap:8}}>{facSubs.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)'}}>{T('لا توجد اشتراكات','No subscriptions')}</div>:facSubs.map(s=><div key={s.id} style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'14px 16px',border:'1px solid rgba(255,255,255,.03)'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><Badge v={s.subscription_status}/><span style={{fontSize:10,color:'var(--tx5)',direction:'ltr'}}>{s.start_date||'—'} → {s.end_date||'—'}</span></div>
{s.points_balance>0&&<div style={{fontSize:11,color:C.gold,marginBottom:4}}>{s.points_balance} {T('نقطة','pts')}</div>}
{s.notes&&<div style={{fontSize:10,color:'var(--tx5)'}}>{s.notes}</div>}
</div>)}</div>}

{viewTab==='fcreds'&&<div style={{display:'flex',flexDirection:'column',gap:8}}>{facCreds.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)'}}>{T('لا توجد بيانات دخول','No credentials')}</div>:facCreds.map(c=>{const own=owners.find(o=>o.id===c.owner_id);return<div key={c.id} style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'14px 16px',border:'1px solid rgba(255,255,255,.03)'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><div style={{display:'flex',gap:8,alignItems:'center'}}><span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>{c.credential_type?.toUpperCase()}</span><Badge v={c.status}/></div>{own&&<span style={{fontSize:10,color:'var(--tx5)'}}>{own.name_ar}</span>}</div>
<div style={{display:'flex',gap:12,fontSize:11,color:'var(--tx4)',flexWrap:'wrap'}}>
{c.username&&<span style={{direction:'ltr'}}>{c.username}</span>}
{c.phone_linked&&<span style={{direction:'ltr'}}>{c.phone_linked}</span>}
{c.email_linked&&<span style={{direction:'ltr'}}>{c.email_linked}</span>}
{c.platform_url&&<a href={c.platform_url} target="_blank" rel="noopener" style={{color:C.blue,fontSize:10}} onClick={e=>e.stopPropagation()}>{T('رابط المنصة','Platform URL')}</a>}
</div></div>})}</div>}

</div></div></div></div>})()}

{/* ═══ WIZARD (6 Steps) ═══ */}
{wizard&&<div onClick={()=>setWizard(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.8)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(700px,95vw)',maxHeight:'92vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.5)',border:'1px solid rgba(201,168,76,.12)'}}>
<div style={{height:3,background:`linear-gradient(90deg,transparent,${C.gold} 30%,#dcc06e 50%,${C.gold} 70%,transparent)`}}/>
<div style={{background:'var(--bg)',padding:'16px 24px',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{fontSize:16,fontWeight:700,color:'var(--tx)'}}>{wizard.editId?T('تعديل منشأة','Edit Facility'):T('إضافة منشأة','Add Facility')}</div><button onClick={()=>setWizard(null)} style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button></div>
<div style={{display:'flex',gap:0,padding:'0 16px',background:'rgba(255,255,255,.02)',overflowX:'auto',scrollbarWidth:'none'}}>{wizardSteps.map((s,i)=><div key={i} onClick={()=>setWizard(p=>({...p,step:i}))} style={{flex:'0 0 auto',padding:'10px 12px',textAlign:'center',fontSize:10,fontWeight:wizard.step===i?700:500,color:wizard.step===i?C.gold:i<wizard.step?'rgba(39,160,70,.6)':'rgba(255,255,255,.3)',borderBottom:wizard.step===i?'2px solid '+C.gold:i<wizard.step?'2px solid rgba(39,160,70,.3)':'2px solid transparent',cursor:'pointer',whiteSpace:'nowrap'}}><div style={{fontSize:14,fontWeight:800,marginBottom:2}}>{i+1}</div>{s.title}</div>)}</div>
<div style={{flex:1,overflowY:'auto',padding:'20px 24px'}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>{wizardSteps[wizard.step].fields.map(f=><FieldInput key={f.k} f={f} form={WZ} setForm={v=>setWizard(p=>({...p,data:{...p.data,...(typeof v==='function'?v(p.data):v)}}))} isAr={isAr}/>)}</div></div>
<div style={{padding:'16px 24px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'space-between'}}>
<button onClick={()=>wizard.step>0?setWizard(p=>({...p,step:p.step-1})):setWizard(null)} style={{height:42,padding:'0 20px',borderRadius:10,border:'1.5px solid rgba(255,255,255,.1)',background:'transparent',color:'var(--tx3)',fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer'}}>{wizard.step>0?T('← السابق','← Back'):T('إلغاء','Cancel')}</button>
{wizard.step<wizardSteps.length-1?<button onClick={()=>setWizard(p=>({...p,step:p.step+1}))} style={{...bS,height:42,minWidth:120}}>{T('التالي →','Next →')}</button>:<button onClick={saveWizard} disabled={saving} style={{...bS,height:42,minWidth:140,opacity:saving?.6:1}}>{saving?'...':wizard.editId?T('حفظ','Save'):T('إضافة','Add')}</button>}
</div></div></div>}

{/* ═══ OWNER FORM ═══ */}
{pop==='owner'&&<div onClick={()=>setPop(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:560,maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.4)',border:'1px solid var(--bd)'}}>
<div style={{height:3,background:`linear-gradient(90deg,transparent,${C.gold} 30%,#dcc06e 50%,${C.gold} 70%,transparent)`}}/>
<div style={{background:'var(--bg)',padding:'16px 22px',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{fontSize:15,fontWeight:700,color:'var(--tx)'}}>{form._id?T('تعديل مالك','Edit Owner'):T('إضافة مالك','Add Owner')}</div><button onClick={()=>setPop(null)} style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button></div>
<div style={{flex:1,overflowY:'auto',padding:'18px 22px'}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
{[{k:'name_ar',l:T('الاسم بالعربي','Name (AR)'),r:1},{k:'name_en',l:T('الاسم بالإنجليزي','Name (EN)'),d:1},{k:'id_type',l:T('نوع الهوية','ID Type'),opts:['national_id','iqama','gcc_id','passport'],r:1},{k:'id_number',l:T('رقم الهوية','ID No.'),d:1,r:1},{k:'nationality',l:T('الجنسية','Nationality'),r:1},{k:'gender',l:T('الجنس','Gender'),opts:['male','female'],r:1},{k:'mobile_personal',l:T('الجوال الشخصي','Personal Phone'),d:1},{k:'mobile_work',l:T('جوال العمل','Work Phone'),d:1},{k:'email',l:T('البريد','Email'),d:1},{k:'date_of_birth',l:T('تاريخ الميلاد','Birth Date'),t:'date',r:1},{k:'date_of_birth_h',l:T('تاريخ الميلاد هجري','Birth Date (H)'),r:1},{k:'is_relative',l:T('قريب','Relative'),t:'bool'},{k:'notes',l:T('ملاحظات','Notes'),w:1}].map(f=><FieldInput key={f.k} f={f} form={form} setForm={setForm} isAr={isAr}/>)}</div></div>
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',flexDirection:'row-reverse'}}><button onClick={()=>saveGeneric('owners',form)} disabled={saving} style={{...bS,height:42,minWidth:130,opacity:saving?.6:1}}>{saving?'...':form._id?T('حفظ','Save'):T('إضافة','Add')}</button><button onClick={()=>setPop(null)} style={{height:42,padding:'0 18px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer'}}>{T('إلغاء','Cancel')}</button></div></div></div>}

{/* ═══ SUB FORM ═══ */}
{pop==='sub'&&<div onClick={()=>setPop(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:520,maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.4)',border:'1px solid var(--bd)'}}>
<div style={{height:3,background:`linear-gradient(90deg,transparent,${C.gold} 30%,#dcc06e 50%,${C.gold} 70%,transparent)`}}/>
<div style={{background:'var(--bg)',padding:'16px 22px',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{fontSize:15,fontWeight:700,color:'var(--tx)'}}>{form._id?T('تعديل اشتراك','Edit Sub'):T('إضافة اشتراك','Add Sub')}</div><button onClick={()=>setPop(null)} style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button></div>
<div style={{flex:1,overflowY:'auto',padding:'18px 22px'}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
{[{k:'facility_id',l:T('المنشأة','Facility'),opts:data.map(f=>({v:f.id,l:f.name_ar})),r:1},{k:'subscription_status',l:T('الحالة','Status'),opts:['active','expired','suspended'],r:1},{k:'start_date',l:T('البداية','Start'),t:'date'},{k:'end_date',l:T('النهاية','End'),t:'date'},{k:'points_balance',l:T('رصيد النقاط','Points'),d:1},{k:'notes',l:T('ملاحظات','Notes'),w:1}].map(f=><FieldInput key={f.k} f={f} form={form} setForm={setForm} isAr={isAr}/>)}</div></div>
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',flexDirection:'row-reverse'}}><button onClick={()=>saveGeneric('facility_subscriptions',form)} disabled={saving} style={{...bS,height:42,minWidth:130,opacity:saving?.6:1}}>{saving?'...':form._id?T('حفظ','Save'):T('إضافة','Add')}</button><button onClick={()=>setPop(null)} style={{height:42,padding:'0 18px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer'}}>{T('إلغاء','Cancel')}</button></div></div></div>}

{/* ═══ CRED FORM ═══ */}
{pop==='cred'&&<div onClick={()=>setPop(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:560,maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.4)',border:'1px solid var(--bd)'}}>
<div style={{height:3,background:`linear-gradient(90deg,transparent,${C.gold} 30%,#dcc06e 50%,${C.gold} 70%,transparent)`}}/>
<div style={{background:'var(--bg)',padding:'16px 22px',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{fontSize:15,fontWeight:700,color:'var(--tx)'}}>{form._id?T('تعديل حساب','Edit'):T('إضافة حساب','Add Credential')}</div><button onClick={()=>setPop(null)} style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button></div>
<div style={{flex:1,overflowY:'auto',padding:'18px 22px'}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
{[{k:'credential_type',l:T('نوع الحساب','Type'),opts:['qiwa','gosi','mudad','absher','chamber','tax','mol','subl','other'],r:1},{k:'facility_id',l:T('المنشأة','Facility'),opts:data.map(f=>({v:f.id,l:f.name_ar}))},{k:'owner_id',l:T('المالك','Owner'),opts:owners.map(o=>({v:o.id,l:o.name_ar}))},{k:'username',l:T('اسم المستخدم','Username'),d:1},{k:'password',l:T('كلمة المرور','Password')},{k:'phone_linked',l:T('الجوال المرتبط','Phone'),d:1},{k:'email_linked',l:T('البريد المرتبط','Email'),d:1},{k:'status',l:T('الحالة','Status'),opts:['active','inactive','expired','suspended'],r:1},{k:'platform_url',l:T('رابط المنصة','URL'),d:1},{k:'notes',l:T('ملاحظات','Notes'),w:1}].map(f=><FieldInput key={f.k} f={f} form={form} setForm={setForm} isAr={isAr}/>)}</div></div>
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',flexDirection:'row-reverse'}}><button onClick={()=>saveGeneric('platform_credentials',form)} disabled={saving} style={{...bS,height:42,minWidth:130,opacity:saving?.6:1}}>{saving?'...':form._id?T('حفظ','Save'):T('إضافة','Add')}</button><button onClick={()=>setPop(null)} style={{height:42,padding:'0 18px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer'}}>{T('إلغاء','Cancel')}</button></div></div></div>}

{/* ═══ WEEKLY STATS FORM ═══ */}
{pop==='weekly_add'&&<div onClick={()=>setPop(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.8)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(780px,95vw)',maxHeight:'92vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.5)',border:'1px solid rgba(201,168,76,.12)'}}>
<div style={{height:3,background:`linear-gradient(90deg,transparent,${C.gold} 30%,#dcc06e 50%,${C.gold} 70%,transparent)`}}/>
<div style={{background:'var(--bg)',padding:'16px 22px',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{fontSize:15,fontWeight:700,color:'var(--tx)'}}>{T('إضافة سجل أسبوعي','Add Weekly Record')}</div><button onClick={()=>setPop(null)} style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button></div>
<div style={{flex:1,overflowY:'auto',padding:'18px 22px'}}>
{[
{title:T('التاريخ والنطاقات','Date & Nitaqat'),fields:[{k:'week_date',l:T('تاريخ الأسبوع','Week Date'),t:'date'},{k:'nitaqat_color',l:T('لون نطاقات','Nitaqat Color'),opts:[{v:'red',l:T('أحمر','Red')},{v:'yellow',l:T('أصفر','Yellow')},{v:'green_low',l:T('أخضر منخفض','Green Low')},{v:'green_mid',l:T('أخضر متوسط','Green Mid')},{v:'green_high',l:T('أخضر عالي','Green High')},{v:'platinum',l:T('بلاتيني','Platinum')}]},{k:'nitaqat_size',l:T('حجم نطاقات','Size')},{k:'has_weekly_exemption',l:T('إعفاء أسبوعي','Weekly Exemption'),opts:['true','false']}]},
{title:T('العمالة','Workers'),fields:[{k:'total_workers',l:T('إجمالي العمال','Total'),d:1},{k:'saudi_workers',l:T('سعوديين','Saudis'),d:1},{k:'non_saudi_workers',l:T('غير سعوديين','Non-Saudi'),d:1},{k:'total_workers_in_nitaqat',l:T('في نطاقات','In Nitaqat'),d:1},{k:'saudization_percentage',l:T('نسبة السعودة %','Saudization %'),d:1}]},
{title:T('العقود وحماية الأجور','Contracts & WPS'),fields:[{k:'contract_auth_pct',l:T('توثيق العقود %','Contract Auth %'),d:1},{k:'wps_compliance_pct',l:T('حماية الأجور %','WPS %'),d:1},{k:'authenticated_count',l:T('عقود موثقة','Authenticated'),d:1},{k:'unauthenticated_count',l:T('غير موثقة','Unauthenticated'),d:1},{k:'mudad_wps_compliance_pct',l:T('مدد %','Mudad %'),d:1}]},
{title:T('التأمينات الاجتماعية','GOSI'),fields:[{k:'gosi_total_contributors',l:T('إجمالي المشتركين','Total'),d:1},{k:'gosi_saudi_contributors',l:T('سعوديين','Saudis'),d:1},{k:'gosi_non_saudi_contributors',l:T('غير سعوديين','Non-Saudi'),d:1},{k:'gosi_active_contributors',l:T('نشطين','Active'),d:1},{k:'gosi_non_active_contributors',l:T('غير نشطين','Inactive'),d:1},{k:'gosi_total_contributions',l:T('الاشتراكات','Contributions'),d:1},{k:'gosi_total_debit',l:T('المديونية','Debit'),d:1},{k:'gosi_penalties',l:T('الغرامات','Penalties'),d:1},{k:'gosi_total_obligations',l:T('الالتزامات','Obligations'),d:1}]},
{title:T('أجير','Ajeer'),fields:[{k:'ajeer_borrowed_workers_count',l:T('عمال مستعارين','Borrowed'),d:1},{k:'ajeer_active_contracts',l:T('عقود نشطة','Active Contracts'),d:1}]}
].map((sec,si)=><div key={si} style={{marginBottom:18}}>
<div style={{fontSize:12,fontWeight:700,color:C.gold,marginBottom:10,paddingBottom:6,borderBottom:'1px solid rgba(201,168,76,.1)'}}>{sec.title}</div>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10}}>
{sec.fields.map(f=><div key={f.k}><div style={{fontSize:10,fontWeight:600,color:'var(--tx4)',marginBottom:4}}>{f.l}</div>
{f.opts?<select value={form[f.k]||''} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} style={{...fS,height:36,fontSize:11}}><option value="">—</option>{f.opts.map(o=>typeof o==='object'?<option key={o.v} value={o.v}>{o.l}</option>:<option key={o} value={o}>{o}</option>)}</select>:
f.t==='date'?<input type="date" value={form[f.k]||''} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} style={{...fS,height:36,fontSize:11,direction:'ltr'}}/>:
<input value={form[f.k]||''} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} style={{...fS,height:36,fontSize:11,direction:'ltr'}}/>}
</div>)}
</div></div>)}
</div>
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',flexDirection:'row-reverse'}}>
<button onClick={async()=>{setSaving(true);try{const d={...form};delete d._table;Object.keys(d).forEach(k=>{if(d[k]==='')d[k]=null;if(d[k]==='true')d[k]=true;if(d[k]==='false')d[k]=false;if(k!=='week_date'&&k!=='nitaqat_color'&&k!=='nitaqat_size'&&k!=='facility_id'&&d[k]!=null&&!isNaN(d[k]))d[k]=Number(d[k])});d.created_by=user?.id;const{error}=await sb.from('facility_weekly_stats').insert(d);if(error)throw error;toast(T('تمت الإضافة','Added'));setPop(null);load()}catch(e){toast('خطأ: '+e.message?.slice(0,80))}setSaving(false)}} disabled={saving} style={{...bS,height:42,minWidth:130,opacity:saving?.6:1}}>{saving?'...':T('إضافة','Add')}</button>
<button onClick={()=>setPop(null)} style={{height:42,padding:'0 18px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer'}}>{T('إلغاء','Cancel')}</button>
</div></div></div>}
</div>}
