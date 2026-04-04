import React,{useState,useEffect,useCallback} from 'react'
const F="'Cairo',sans-serif"
const C={dk:'#171717',fm:'#1e1e1e',gold:'#c9a84c',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}
const fS={width:'100%',height:42,padding:'0 14px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:F,fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',background:'rgba(255,255,255,.07)',textAlign:'center'}
const bS={height:38,padding:'0 20px',borderRadius:10,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.12)',color:C.gold,fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}
const sMap={active:C.ok,issue:C.red,suspended:'#e67e22',cancelled:C.red,expired:'#999',inactive:'#999',red:C.red,yellow:'#e67e22',green_low:C.ok,green_mid:C.ok,green_high:C.ok,platinum:C.gold,pending_confirmation:C.gold,revoked:C.red,compliant:C.ok,non_compliant:C.red,registered:C.ok,not_registered:'#999',deregistered:C.red,'نشط':C.ok,'نشطة':C.ok,'غير نشط':'#999','غير نشطة':'#999','معلّق':'#e67e22','ملغى':C.red,'منتهي':'#999','مشطوب':C.red,'ضمن فترة التأكيد':C.gold,'بها مشكلة':C.red,'متوافق':C.ok,'غير متوافق':C.red,'مسجّل':C.ok,'غير مسجّل':'#999','نعم':C.ok,'متاحة':C.ok,'مستخدمة':C.blue,'قيد المعالجة':'#e67e22','ملغاة':'#999','منتهية':C.red,'استقدام':C.blue,'نقل كفالة':'#e67e22','دائمة':C.ok,'مؤقتة':'#e67e22'}
const nm=v=>Number(v||0).toLocaleString('en-US')
const Badge=({v})=>{const cl=sMap[v]||'#888';return<span style={{fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:6,background:cl+'18',color:cl,display:'inline-flex',alignItems:'center',gap:4}}><span style={{width:5,height:5,borderRadius:'50%',background:cl}}/>{v||'—'}</span>}
const EditBtn=({onClick})=><button onClick={e=>{e.stopPropagation();onClick()}} style={{width:28,height:28,borderRadius:7,border:'1px solid rgba(201,168,76,.15)',background:'rgba(201,168,76,.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="1.8"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>
const DelBtn=({onClick})=><button onClick={e=>{e.stopPropagation();onClick()}} style={{width:28,height:28,borderRadius:7,border:'1px solid rgba(192,57,43,.1)',background:'rgba(192,57,43,.04)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
const StatCard=({l,v,c,bg,bc})=><div style={{padding:'12px 16px',borderRadius:12,background:bg,border:'1px solid '+bc,minWidth:120,flex:'1 0 auto',display:'flex',alignItems:'center',gap:10}}><div style={{fontSize:24,fontWeight:900,color:c,lineHeight:1}}>{v}</div><div style={{fontSize:10,fontWeight:600,color:c,opacity:.85,whiteSpace:'nowrap'}}>{l}</div></div>
const FieldView=({l,v,isStatus})=><div style={{padding:'12px 14px',background:'rgba(255,255,255,.02)',borderBottom:'1px solid var(--bd2)'}}><div style={{fontSize:9,fontWeight:600,color:'var(--tx5)',marginBottom:4}}>{l}</div><div style={{fontSize:13,fontWeight:600,color:'var(--tx2)'}}>{isStatus?<Badge v={v}/>:String(v)}</div></div>
const fieldStyle={width:'100%',height:42,padding:'0 14px',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',background:'rgba(255,255,255,.04)',transition:'.2s',boxSizing:'border-box'}

// Custom dropdown component
const CustomSelect=({value,options,onChange,placeholder,isAr})=>{
const[open,setOpen]=React.useState(false);const ref=React.useRef(null);const[search,setSearch]=React.useState('')
React.useEffect(()=>{if(!open)return;const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h)},[open])
const allOpts=options||[];const filtered=search?allOpts.filter(o=>{const l=typeof o==='object'?o.l:o;return l?.toLowerCase().includes(search.toLowerCase())}):allOpts
const selLabel=value?(()=>{const found=allOpts.find(o=>typeof o==='object'?o.v===value:o===value);return found?(typeof found==='object'?found.l:found):value})():null
return<div ref={ref} style={{position:'relative'}}>
<div onClick={()=>{setOpen(!open);setSearch('')}} style={{...fieldStyle,display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',background:open?'rgba(201,168,76,.04)':'rgba(255,255,255,.04)',borderColor:open?'rgba(201,168,76,.4)':'rgba(255,255,255,.1)'}}>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5" style={{transition:'.2s',transform:open?'rotate(180deg)':'none',opacity:.5,flexShrink:0}}><polyline points="6 9 12 15 18 9"/></svg>
<span style={{flex:1,textAlign:'right',fontSize:13,fontWeight:600,color:selLabel?'var(--tx)':'var(--tx5)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{selLabel||(placeholder||'— اختر —')}</span>
</div>
{open&&<div style={{position:'absolute',top:'100%',left:0,right:0,marginTop:4,background:'#1e1e1e',border:'1.5px solid rgba(201,168,76,.2)',borderRadius:12,boxShadow:'0 12px 40px rgba(0,0,0,.6)',zIndex:50,maxHeight:220,display:'flex',flexDirection:'column',overflow:'hidden'}}>
{allOpts.length>5&&<div style={{padding:'8px 10px',borderBottom:'1px solid rgba(255,255,255,.06)',flexShrink:0}}><input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder={isAr?'بحث...':'Search...'} style={{width:'100%',height:32,padding:'0 10px',border:'1px solid rgba(255,255,255,.08)',borderRadius:8,fontFamily:F,fontSize:11,color:'var(--tx)',background:'rgba(255,255,255,.04)',outline:'none',textAlign:'right'}}/></div>}
<div style={{overflowY:'auto',scrollbarWidth:'thin'}}>
<div onClick={()=>{onChange('');setOpen(false)}} style={{padding:'9px 14px',fontSize:12,color:'var(--tx5)',cursor:'pointer',textAlign:'right',borderBottom:'1px solid rgba(255,255,255,.03)'}}>{isAr?'— اختر —':'— Select —'}</div>
{filtered.map((o,i)=>{const ov=typeof o==='object'?o.v:o;const ol=typeof o==='object'?o.l:o;const active=ov===value
return<div key={ov||i} onClick={()=>{onChange(ov);setOpen(false)}} style={{padding:'9px 14px',fontSize:12,fontWeight:active?700:500,color:active?C.gold:'rgba(255,255,255,.75)',background:active?'rgba(201,168,76,.08)':'transparent',cursor:'pointer',textAlign:'right',borderBottom:'1px solid rgba(255,255,255,.02)',transition:'.1s'}} onMouseEnter={e=>e.target.style.background=active?'rgba(201,168,76,.12)':'rgba(255,255,255,.04)'} onMouseLeave={e=>e.target.style.background=active?'rgba(201,168,76,.08)':'transparent'}>{ol}</div>})}
{filtered.length===0&&<div style={{padding:'14px',textAlign:'center',fontSize:11,color:'var(--tx6)'}}>{isAr?'لا توجد نتائج':'No results'}</div>}
</div></div>}
</div>}

// Custom date input
const DateInput=({value,onChange})=>{
return<div style={{position:'relative'}}>
<input type="date" value={value} onChange={e=>onChange(e.target.value)} style={{...fieldStyle,direction:'ltr',colorScheme:'dark',paddingLeft:36}}/>
<div style={{position:'absolute',top:'50%',left:12,transform:'translateY(-50%)',pointerEvents:'none',opacity:.4}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
</div></div>}

const FieldInput=({f,form,setForm,isAr})=>{const v=form[f.k]||'';const set=val=>setForm(p=>({...p,[f.k]:val}))
const onFocus=e=>{e.target.style.borderColor='rgba(201,168,76,.4)';e.target.style.background='rgba(201,168,76,.04)'}
const onBlur=e=>{e.target.style.borderColor='rgba(255,255,255,.1)';e.target.style.background='rgba(255,255,255,.04)'}
return<div style={{gridColumn:f.w?'1/-1':undefined}}><div style={{fontSize:11,fontWeight:600,color:'var(--tx4)',marginBottom:6}}>{f.l}{f.r&&<span style={{color:C.red,marginRight:2}}> *</span>}</div>
{f.opts?<CustomSelect value={v} options={f.opts} onChange={set} isAr={isAr}/>
:f.t==='date'?<DateInput value={v} onChange={set}/>
:f.t==='bool'?<div style={{display:'flex',gap:8}}>{[{v:'true',l:isAr?'نعم':'Yes',c:C.ok},{v:'false',l:isAr?'لا':'No',c:C.red}].map(o=><button key={o.v} onClick={()=>set(o.v)} style={{flex:1,height:42,borderRadius:10,border:'1.5px solid '+(v===o.v?o.c+'40':'rgba(255,255,255,.08)'),background:v===o.v?o.c+'12':'rgba(255,255,255,.03)',color:v===o.v?o.c:'var(--tx5)',fontFamily:F,fontSize:12,fontWeight:v===o.v?700:500,cursor:'pointer',transition:'.2s'}}>{o.l}</button>)}</div>
:f.w?<textarea value={v} onChange={e=>set(e.target.value)} onFocus={onFocus} onBlur={onBlur} rows={3} style={{...fieldStyle,height:'auto',padding:12,resize:'vertical',textAlign:'right'}}/>
:<input value={v} onChange={e=>set(e.target.value)} onFocus={onFocus} onBlur={onBlur} style={{...fieldStyle,textAlign:f.d?'left':'right',direction:f.d?'ltr':'rtl'}}/>}
</div>}

export default function FacilitiesPage({sb,toast,user,lang,onTabChange}){
const isAr=lang!=='en';const T=(a,e)=>isAr?a:e
const[tab,setTab]=useState('facilities')
const[data,setData]=useState([]);const[owners,setOwners]=useState([]);const[subs,setSubs]=useState([]);const[creds,setCreds]=useState([]);const[partners,setPartners]=useState([]);const[exemptions,setExemptions]=useState([]);const[weeklyStats,setWeeklyStats]=useState([]);const[visas,setVisas]=useState([])
const[branches,setBranches]=useState([]);const[regions,setRegions]=useState([]);const[cities,setCities]=useState([])
const[loading,setLoading]=useState(false);const[q,setQ]=useState('');const[statusFilter,setStatusFilter]=useState('all');const[sortBy,setSortBy]=useState('created_at');const[nitaqatFilter,setNitaqatFilter]=useState('all')
const[page,setPage]=useState(0);const[viewRow,setViewRow]=useState(null);const[viewTab,setViewTab]=useState('basic')
const[wizard,setWizard]=useState(null);const[saving,setSaving]=useState(false);const[ownerMode,setOwnerMode]=useState('existing');const[newOwner,setNewOwner]=useState({name_ar:'',name_en:'',id_type:'national_id',id_number:'',nationality:'سعودي',gender:'male',mobile_personal:'',email:'',date_of_birth:''});const[wizPartners,setWizPartners]=useState([]);const[partnerAdd,setPartnerAdd]=useState(null);const[pop,setPop]=useState(null);const[form,setForm]=useState({});const[actionMenu,setActionMenu]=useState(null);const[menuPos,setMenuPos]=useState({x:0,y:0});const[showAdvSearch,setShowAdvSearch]=useState(false);const[visaFilter,setVisaFilter]=useState('all');const[facWorkersData,setFacWorkersData]=useState([]);const[facWorkersLoading,setFacWorkersLoading]=useState(false);const[facDocs,setFacDocs]=useState([]);const[docFilter,setDocFilter]=useState('all');const[facDebts,setFacDebts]=useState([]);const[facViolations,setFacViolations]=useState([]);const[violationFilter,setViolationFilter]=useState('all');const[advFilters,setAdvFilters]=useState({cr_number:'',owner:'',region:'',city:'',gosi_status:'',vat_status:'',mlsd_status:'',mudad_status:'',facility_status:'',nitaqat:''})
const PER_PAGE=15
useEffect(()=>{onTabChange&&onTabChange({tab})},[tab])

const load=useCallback(async()=>{setLoading(true)
// Phase 1: Essential data first — show facilities list immediately
const[f,o,br,rg,ct]=await Promise.all([
sb.from('facilities').select('*').is('deleted_at',null).order('created_at',{ascending:false}),
sb.from('owners').select('*').is('deleted_at',null).order('name_ar'),
sb.from('branches').select('id,name_ar').is('deleted_at',null),
sb.from('regions').select('id,name_ar').order('name_ar'),
sb.from('cities').select('id,name_ar,region_id').order('name_ar')
]);setData(f.data||[]);setOwners(o.data||[]);setBranches(br.data||[]);setRegions(rg.data||[]);setCities(ct.data||[]);setLoading(false)
// Phase 2: Detail data in background
Promise.all([
sb.from('facility_subscriptions').select('*').is('deleted_at',null).order('created_at',{ascending:false}),
sb.from('platform_credentials').select('*').is('deleted_at',null).order('created_at',{ascending:false}),
sb.from('facility_partners').select('*').is('deleted_at',null),
sb.from('facility_exemption_log').select('*').is('deleted_at',null).order('created_at',{ascending:false}),
sb.from('facility_weekly_stats').select('*').order('week_date',{ascending:false}).limit(500),
sb.from('facility_visas').select('*').is('deleted_at',null).order('created_at',{ascending:false})
]).then(([s,c,p,ex,ws,vi])=>{setSubs(s.data||[]);setCreds(c.data||[]);setPartners(p.data||[]);setExemptions(ex.data||[]);setWeeklyStats(ws.data||[]);setVisas(vi.data||[])})},[sb])
useEffect(()=>{load()},[load])
const[occupationsMap,setOccupationsMap]=useState({})
useEffect(()=>{if(!viewRow)return;setFacWorkersLoading(true);sb.from('workers').select('*').eq('facility_id',viewRow.id).is('deleted_at',null).order('name_ar').then(({data:d})=>{setFacWorkersData(d||[]);setFacWorkersLoading(false);const occIds=[...new Set((d||[]).map(w=>w.occupation_id).filter(Boolean))];if(occIds.length)sb.from('lookup_items').select('id,value_ar').in('id',occIds).then(({data:o})=>{const m={};(o||[]).forEach(x=>m[x.id]=x.value_ar);setOccupationsMap(p=>({...p,...m}))})});sb.from('facility_documents').select('*').eq('facility_id',viewRow.id).is('deleted_at',null).order('expiry_date').then(({data:d})=>setFacDocs(d||[]));sb.from('facility_debts').select('*').eq('facility_id',viewRow.id).is('deleted_at',null).order('due_date').then(({data:d})=>setFacDebts(d||[]));sb.from('facility_violations').select('*').eq('facility_id',viewRow.id).is('deleted_at',null).order('violation_date',{ascending:false}).then(({data:d})=>setFacViolations(d||[]))},[viewRow,sb])

const del=async(t,id)=>{if(!confirm(T('حذف؟','Delete?')))return;await sb.from(t).update({deleted_at:new Date().toISOString()}).eq('id',id);toast(T('تم الحذف','Deleted'));load()}
const saveGeneric=async(table,formData)=>{setSaving(true);try{const d={...formData};const id=d._id;delete d._id;Object.keys(d).forEach(k=>{if(d[k]==='')d[k]=null;if(d[k]==='true')d[k]=true;if(d[k]==='false')d[k]=false})
if(id){d.updated_by=user?.id;const{error}=await sb.from(table).update(d).eq('id',id);if(error)throw error;toast(T('تم التعديل','Updated'))}
else{d.created_by=user?.id;const{error}=await sb.from(table).insert(d);if(error)throw error;toast(T('تمت الإضافة','Added'))}
setPop(null);load()}catch(e){toast('خطأ: '+e.message?.slice(0,80))}setSaving(false)}

// === Stats ===
const totalFac=data.length
const pendingConfirmFac=data.filter(r=>r.cr_status==='pending_confirmation').length
const suspendedFac=data.filter(r=>r.cr_status==='suspended').length
const deletedCrFac=data.filter(r=>r.cr_delete_date!=null).length
const issueFac=data.filter(r=>r.facility_status==='issue').length
const soleEstablishments=data.filter(r=>r.legal_form==='sole_proprietorship').length
const llcOnePerson=data.filter(r=>r.legal_form==='limited_liability'&&r.character_count==='one_person').length
const llcTwoPlus=data.filter(r=>r.legal_form==='limited_liability'&&r.character_count!=='one_person').length
const exemptFac=data.filter(r=>r.is_original_exempt===true).length
const activeSubs=subs.filter(s=>s.subscription_status==='active').length,expiredSubs=subs.filter(s=>s.subscription_status==='expired').length
const activeCreds=creds.filter(c=>c.status==='active').length,inactiveCreds=creds.filter(c=>c.status!=='active').length
const exportCSV=()=>{const hdr=['الاسم','الرقم الموحد','السجل التجاري','النطاق','الحالة','العمال','التأشيرات','السعودة%','انتهاء السجل'];const rows=data.map(r=>[r.name_ar,r.unified_national_number,r.cr_number,r.nitaqat_color,r.facility_status,r.total_workers,r.max_visas,r.saudization_percentage,r.cr_expiry_date]);const csv='\uFEFF'+[hdr,...rows].map(r=>r.join(',')).join('\n');const b=new Blob([csv],{type:'text/csv;charset=utf-8;'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='facilities_'+new Date().toISOString().slice(0,10)+'.csv';a.click()}

// === Filter ===
let filtered=data.filter(r=>{if(q){const s=q.toLowerCase();if(!((r.name_ar||'').includes(s)||(r.name_en||'').toLowerCase().includes(s)||(r.cr_number||'').includes(s)||(r.unified_national_number||'').includes(s)||(r.qiwa_file_number||'').includes(s)||(r.gosi_file_number||'').includes(s)||(r.mobile||'').includes(s)||(r.email||'').toLowerCase().includes(s)))return false};if(advFilters.facility_status&&r.facility_status!==advFilters.facility_status)return false;if(advFilters.nitaqat&&r.nitaqat_color!==advFilters.nitaqat)return false;if(advFilters.cr_number&&!(r.cr_number||'').includes(advFilters.cr_number))return false;if(advFilters.owner&&r.owner_id!==advFilters.owner)return false;if(advFilters.region&&r.region_id!==advFilters.region)return false;if(advFilters.city&&r.city_id!==advFilters.city)return false;if(advFilters.gosi_status&&r.gosi_status!==advFilters.gosi_status)return false;if(advFilters.vat_status&&r.vat_status!==advFilters.vat_status)return false;if(advFilters.mlsd_status&&r.mlsd_service_status!==advFilters.mlsd_status)return false;if(advFilters.mudad_status&&r.mudad_wps_compliance_status!==advFilters.mudad_status)return false;return true})
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
{title:T('المالك','Owner'),custom:'owner'},
{title:T('الربط والموقع','Links & Location'),fields:[
{k:'branch_id',l:T('المكتب','Branch'),opts:branches.map(b=>({v:b.id,l:b.name_ar})),r:1},
{k:'gosi_owner_id',l:T('مالك التأمينات','GOSI Owner'),opts:owners.map(o=>({v:o.id,l:o.name_ar}))},
{k:'parent_facility_id',l:T('المنشأة الأم','Parent Facility'),opts:data.map(f=>({v:f.id,l:f.name_ar}))},
{k:'region_id',l:T('المنطقة','Region'),opts:regions.map(r=>({v:r.id,l:r.name_ar})),r:1},
{k:'city_id',l:T('المدينة','City'),opts:cities.map(c=>({v:c.id,l:c.name_ar})),r:1},
{k:'address_ar',l:T('العنوان','Address'),w:1},
{k:'short_address',l:T('العنوان المختصر','Short Address'),d:1},
{k:'postal_code',l:T('الرمز البريدي','Postal Code'),d:1},
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

const allFieldsFlat=wizardSteps.flatMap(s=>s.fields||[])
const initForm=()=>Object.fromEntries(allFieldsFlat.map(f=>([f.k,''])))
const openAdd=()=>setWizard({step:0,data:{...initForm(),type:'establishment',facility_status:'active',cr_status:'active',is_main_cr:'true'}})
const openEdit=r=>{const d={};allFieldsFlat.forEach(f=>d[f.k]=r[f.k]!=null?String(r[f.k]):'');setWizard({step:0,editId:r.id,data:d})}
const WZ=wizard?.data||{};const setWZ=(k,v)=>setWizard(p=>({...p,data:{...p.data,[k]:v}}))
const saveWizard=async()=>{setSaving(true);try{const d={...wizard.data};Object.keys(d).forEach(k=>{if(d[k]==='')d[k]=null;if(d[k]==='true')d[k]=true;if(d[k]==='false')d[k]=false})
// If new owner mode, create owner first
if(ownerMode==='new'&&!wizard.editId&&newOwner.name_ar){const ownerData={...newOwner};Object.keys(ownerData).forEach(k=>{if(ownerData[k]==='')ownerData[k]=null});ownerData.created_by=user?.id;const{data:createdOwner,error:ownerErr}=await sb.from('owners').insert(ownerData).select('id').single();if(ownerErr)throw ownerErr;d.owner_id=createdOwner.id;if(!d.gosi_owner_id)d.gosi_owner_id=createdOwner.id}
// Auto calc cr_expiry_date
if(d.cr_confirm_date&&!wizard.data.cr_expiry_date){const dt=new Date(d.cr_confirm_date);dt.setDate(dt.getDate()+90);d.cr_expiry_date=dt.toISOString().split('T')[0]}
if(wizard.editId){d.updated_by=user?.id;const{error}=await sb.from('facilities').update(d).eq('id',wizard.editId);if(error)throw error;toast(T('تم التعديل','Updated'))}else{d.created_by=user?.id;const{data:newFac,error}=await sb.from('facilities').insert(d).select('id').single();if(error)throw error;
// Save partners
if(wizPartners.length>0&&newFac){for(const p of wizPartners){const row={facility_id:newFac.id,partner_type:p.partner_type,ownership_percentage:Number(p.percentage)||0,is_manager:p.is_manager||false,status:'active',created_by:user?.id};if(p.partner_type==='person')row.owner_id=p.owner_id;else row.owner_facility_id=p.facility_id;await sb.from('facility_partners').insert(row)}}
toast(T('تمت الإضافة','Added'))};setWizPartners([]);setWizard(null);load()}catch(e){toast('خطأ: '+e.message?.slice(0,80))}setSaving(false)}

// View data
const facSubs=viewRow?subs.filter(s=>s.facility_id===viewRow.id):[]
const facCreds=viewRow?creds.filter(c=>c.facility_id===viewRow.id):[]
const facPartners=viewRow?partners.filter(p=>p.facility_id===viewRow.id):[]
const facExemptions=viewRow?exemptions.filter(e=>e.exempt_facility_id===viewRow.id||e.linked_facility_id===viewRow.id):[]

const tabs=[{id:'facilities',l:'المنشآت',le:'Facilities'}]
const fBtnS=a=>({padding:'6px 14px',borderRadius:8,fontSize:10,fontWeight:a?700:500,color:a?C.gold:'rgba(255,255,255,.4)',background:a?'rgba(201,168,76,.08)':'transparent',border:a?'1px solid rgba(201,168,76,.15)':'1px solid rgba(255,255,255,.06)',cursor:'pointer',whiteSpace:'nowrap'})
const SearchBar=<div style={{flex:1,minWidth:180,position:'relative'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="2" style={{position:'absolute',top:12,[isAr?'right':'left']:12}}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><input value={q} onChange={e=>{setQ(e.target.value);setPage(0)}} placeholder={T('بحث ...','Search ...')} style={{width:'100%',height:38,padding:isAr?'0 36px 0 14px':'0 14px 0 36px',border:'1.5px solid rgba(255,255,255,.08)',borderRadius:10,fontFamily:F,fontSize:12,color:'var(--tx)',background:'rgba(255,255,255,.04)',outline:'none'}}/></div>

return<div style={{paddingBottom:0}}>
<div style={{marginBottom:16,marginTop:12,display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
<div>
<div style={{fontSize:20,fontWeight:800,color:'var(--tx)'}}>{T('المنشآت','Facilities')}</div>
<div style={{fontSize:11,color:'var(--tx5)',marginTop:4}}>{T('إدارة بيانات المنشآت والسجلات التجارية','Manage facilities & commercial registrations')}</div>
</div>
<button onClick={openAdd} style={{height:42,padding:'0 20px',borderRadius:10,border:'1.5px solid rgba(201,168,76,.25)',background:'linear-gradient(135deg,rgba(201,168,76,.15),rgba(201,168,76,.05))',color:C.gold,fontFamily:F,fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:6,whiteSpace:'nowrap'}}>+ {T('منشأة جديدة','New Facility')}</button>
</div>

{/* ═══ FACILITIES ═══ */}
<div style={{display:'grid',gridTemplateColumns:'auto 1fr 1fr',gap:12,marginBottom:40}}>
{/* الإجمالي */}
<div style={{padding:'20px 24px',borderRadius:14,background:'linear-gradient(135deg,rgba(201,168,76,.1),rgba(201,168,76,.03))',border:'1px solid rgba(201,168,76,.18)',display:'flex',alignItems:'center',gap:16}}>
<div style={{display:'flex',flexDirection:'column',alignItems:'center',flex:1}}>
<div style={{fontSize:42,fontWeight:900,color:C.gold,lineHeight:1}}>{totalFac}</div>
<div style={{fontSize:13,fontWeight:700,color:C.gold,marginTop:8}}>{T('إجمالي المنشآت','Total Facilities')}</div>
{issueFac>0&&<div style={{display:'inline-flex',alignItems:'center',gap:4,marginTop:6,padding:'2px 8px',borderRadius:5,background:'rgba(192,57,43,.08)',border:'1px solid rgba(192,57,43,.12)'}}><div style={{width:5,height:5,borderRadius:'50%',background:C.red}}/><span style={{fontSize:9,fontWeight:600,color:C.red}}>{issueFac} {T('تحتاج متابعة','need attention')}</span></div>}
</div>
</div>
{/* نوع المنشأة — في المنتصف */}
<div style={{padding:'20px 18px',borderRadius:14,background:'linear-gradient(135deg,rgba(155,89,182,.08),rgba(155,89,182,.02))',border:'1px solid rgba(155,89,182,.15)'}}>
<div style={{fontSize:13,fontWeight:700,color:'rgba(155,89,182,.8)',marginBottom:14}}>{T('نوع المنشآت','Facility Types')}</div>
<div style={{display:'flex',gap:16}}>
{[{l:T('مؤسسة فردية','Sole Est.'),v:soleEstablishments,c:'#9b59b6'},{l:T('شخص واحد','One Person'),v:llcOnePerson,c:'#1abc9c'},{l:T('شخصين فأكثر','Two+'),v:llcTwoPlus,c:'#3483b4'}].map((s,i)=><div key={i} style={{flex:1,textAlign:'center'}}>
<div style={{fontSize:22,fontWeight:800,color:s.c,lineHeight:1}}>{s.v}</div>
<div style={{fontSize:9,fontWeight:600,color:s.c,opacity:.7,marginTop:4}}>{s.l}</div>
</div>)}
</div>
</div>
{/* حالة السجل */}
<div style={{padding:'20px 18px',borderRadius:14,background:'linear-gradient(135deg,rgba(52,131,180,.08),rgba(52,131,180,.02))',border:'1px solid rgba(52,131,180,.15)'}}>
<div style={{fontSize:13,fontWeight:700,color:'rgba(52,131,180,.8)',marginBottom:14}}>{T('حالة السجل التجاري','CR Status')}</div>
<div style={{display:'flex',gap:16}}>
{[{l:T('ضمن فترة التأكيد','Pending'),v:pendingConfirmFac,c:C.blue},{l:T('معلّق','Suspended'),v:suspendedFac,c:'#e67e22'},{l:T('مشطوب','Deleted'),v:deletedCrFac,c:C.red}].map((s,i)=><div key={i} style={{flex:1,textAlign:'center'}}>
<div style={{fontSize:22,fontWeight:800,color:s.c,lineHeight:1}}>{s.v}</div>
<div style={{fontSize:9,fontWeight:600,color:s.c,opacity:.7,marginTop:4}}>{s.l}</div>
</div>)}
</div>
</div>
</div>
<div style={{borderTop:'1px solid var(--bd)',paddingTop:16,marginBottom:12}}>
<div style={{display:'flex',gap:8,marginBottom:10,alignItems:'center'}}>
{SearchBar}
<button onClick={()=>setShowAdvSearch(!showAdvSearch)} style={{height:38,padding:'0 14px',borderRadius:10,border:'1px solid '+(showAdvSearch?'rgba(201,168,76,.2)':'rgba(255,255,255,.08)'),background:showAdvSearch?'rgba(201,168,76,.06)':'rgba(255,255,255,.04)',color:showAdvSearch?C.gold:'var(--tx4)',fontFamily:F,fontSize:10,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:5,whiteSpace:'nowrap'}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>{T('بحث متقدم','Advanced')}</button>
<button onClick={exportCSV} style={{height:34,padding:'0 12px',borderRadius:8,border:'1px solid rgba(52,131,180,.15)',background:'rgba(52,131,180,.06)',color:C.blue,fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>{T('تصدير','Export')}</button>
</div>
{/* Advanced Search Panel */}
{showAdvSearch&&<div style={{marginBottom:14,padding:'14px 16px',background:'rgba(255,255,255,.02)',borderRadius:12,border:'1px solid rgba(201,168,76,.1)'}}>
<div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10}}>
{[
[T('رقم السجل','CR No.'),'cr_number','text'],
[T('المالك','Owner'),'owner','select',owners.map(o=>({v:o.id,l:o.name_ar}))],
[T('المنطقة','Region'),'region','select',regions.map(r=>({v:r.id,l:r.name_ar}))],
[T('المدينة','City'),'city','select',cities.map(c=>({v:c.id,l:c.name_ar}))],
[T('التأمينات','GOSI'),'gosi_status','select',[{v:'active',l:T('نشط','Active')},{v:'inactive',l:T('غير نشط','Inactive')}]],
[T('الضريبة','VAT'),'vat_status','select',[{v:'registered',l:T('مسجّل','Registered')},{v:'not_registered',l:T('غير مسجّل','Not Reg.')}]],
[T('خدمات العمل','Labor'),'mlsd_status','select',[{v:'active',l:T('نشط','Active')},{v:'suspended',l:T('معلّق','Suspended')}]],
[T('مدد','Mudad'),'mudad_status','select',[{v:'compliant',l:T('متوافق','Compliant')},{v:'non_compliant',l:T('غير متوافق','Non-Comp.')}]],
[T('حالة المنشأة','Status'),'facility_status','select',[{v:'active',l:T('نشطة','Active')},{v:'issue',l:T('مشاكل','Issues')}]],
[T('لون النطاق','Nitaqat'),'nitaqat','select',[{v:'red',l:T('أحمر','Red')},{v:'yellow',l:T('أصفر','Yellow')},{v:'green_low',l:'G1'},{v:'green_mid',l:'G2'},{v:'green_high',l:'G3'},{v:'platinum',l:T('بلاتيني','Platinum')}]]
].map(([label,key,type,opts],i)=><div key={i}>
<div style={{fontSize:9,fontWeight:600,color:'var(--tx5)',marginBottom:4}}>{label}</div>
{type==='text'?<input value={advFilters[key]} onChange={e=>{setAdvFilters(p=>({...p,[key]:e.target.value}));setPage(0)}} style={{width:'100%',height:32,padding:'0 10px',border:'1px solid rgba(255,255,255,.08)',borderRadius:7,fontFamily:F,fontSize:11,color:'var(--tx)',background:'rgba(255,255,255,.04)',outline:'none'}} placeholder="..."/>
:<select value={advFilters[key]} onChange={e=>{setAdvFilters(p=>({...p,[key]:e.target.value}));setPage(0)}} style={{width:'100%',height:32,padding:'0 8px',border:'1px solid rgba(255,255,255,.08)',borderRadius:7,fontFamily:F,fontSize:10,color:'var(--tx)',background:'rgba(255,255,255,.04)',outline:'none',cursor:'pointer'}}><option value="">{T('الكل','All')}</option>{opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select>}
</div>)}
</div>
<button onClick={()=>{setAdvFilters({cr_number:'',owner:'',region:'',city:'',gosi_status:'',vat_status:'',mlsd_status:'',mudad_status:'',facility_status:'',nitaqat:''});setPage(0)}} style={{marginTop:10,height:28,padding:'0 14px',borderRadius:6,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.04)',color:'var(--tx4)',fontFamily:F,fontSize:10,cursor:'pointer'}}>{T('مسح الفلاتر','Clear Filters')}</button>
</div>}
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
<span style={{fontSize:11,fontWeight:600,color:'var(--tx4)'}}>{filtered.length} {T('منشأة','facilities')}</span>
{filtered.length!==data.length&&<span style={{fontSize:10,color:'var(--tx5)'}}>{T('من أصل','out of')} {data.length}</span>}
</div>
</div>
{loading?<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>:filtered.length===0?<div style={{textAlign:'center',padding:60,color:'var(--tx6)'}}>{T('لا توجد نتائج','No results')}</div>:<>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
{paged.map(r=>{const nClr=sMap[r.nitaqat_color]||'#555';const hasExempt=r.is_original_exempt;const ownCount=partners.filter(p=>p.facility_id===r.id).length||1
const purposes=[];if(r.purpose_transfer)purposes.push(T('نقل','Transfer'));if(r.purpose_permanent_visa)purposes.push(T('تأشيرة دائمة','Perm. Visa'));if(r.purpose_temporary_visa)purposes.push(T('تأشيرة مؤقتة','Temp. Visa'));if(!purposes.length)purposes.push(T('نقل','Transfer'))
const typeLabel=r.type==='company'?T('شركة','Company'):T('مؤسسة فردية','Establishment')
const legalLabel=r.legal_form==='limited_liability'?T('ذ.م.م','LLC'):r.legal_form==='simplified_joint_stock'?T('مساهمة مبسطة','SJS'):''
const alerts=[];if(r.facility_status==='issue')alerts.push(T('مشكلة','Issue'));if(r.cr_status==='suspended')alerts.push(T('معلّق','Suspended'));if(r.cr_status==='expired')alerts.push(T('منتهي','Expired'))
return<div key={r.id} data-card onClick={()=>{setViewRow(r);setViewTab('basic')}} style={{background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:14,overflow:'hidden',cursor:'pointer',transition:'.15s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(201,168,76,.2)';e.currentTarget.style.background='#1c1c1c'}} onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.06)';e.currentTarget.style.background=C.dk}}>
<div style={{padding:'18px 20px'}}>
{/* Name + Menu */}
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
<div style={{width:20,height:20,borderRadius:'50%',background:nClr+'20',border:'1.5px solid '+nClr+'40',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}} title={r.nitaqat_color}><div style={{width:7,height:7,borderRadius:'50%',background:nClr}}/></div>
<div style={{fontSize:16,fontWeight:800,color:'var(--tx)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.name_ar}</div>
{hasExempt&&<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" style={{flexShrink:0}} title={T('معفى','Exempt')}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
<button onClick={e=>{e.stopPropagation();const rect=e.currentTarget.getBoundingClientRect();setMenuPos({x:rect.right-140,y:rect.bottom+6});setActionMenu(actionMenu===r.id?null:r.id)}} style={{width:32,height:32,borderRadius:8,border:'1px solid rgba(255,255,255,.06)',background:'rgba(255,255,255,.03)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,padding:0}} title={T('إجراءات','Actions')}>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></button>
</div>
{r.name_en&&<div style={{fontSize:10,color:'var(--tx4)',marginBottom:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',textAlign:'right'}}>{r.name_en}</div>}
{!r.name_en&&<div style={{marginBottom:12}}/>}
{/* Type badges */}
<div style={{display:'flex',alignItems:'center',gap:6,marginBottom:16,flexWrap:'wrap'}}>
<span style={{fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:6,background:'rgba(52,131,180,.08)',color:'#3483b4',border:'1px solid rgba(52,131,180,.1)'}}>{typeLabel}</span>
<span style={{fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:6,background:'rgba(201,168,76,.06)',color:'rgba(201,168,76,.6)',border:'1px solid rgba(201,168,76,.08)'}}>{ownCount} {T('ملّاك','owners')}</span>
<span style={{fontSize:9,padding:'3px 10px',borderRadius:6,background:'rgba(39,160,70,.06)',color:'rgba(39,160,70,.6)',border:'1px solid rgba(39,160,70,.08)'}}>{purposes.join(' + ')}</span>
</div>
{/* 3 Number boxes with copy */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:14}}>
{[[r.unified_national_number,T('الرقم الموحد','Unified')],[r.gosi_file_number,T('التأمينات','GOSI')],[r.qiwa_file_number,T('قوى','Qiwa')]].map(([val,label],i)=><div key={i} style={{background:'rgba(255,255,255,.025)',borderRadius:8,padding:'8px 10px',border:'1px solid rgba(255,255,255,.03)',minWidth:0}}>
<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:4,marginBottom:4}}>
<span style={{fontSize:8,fontWeight:700,color:'var(--tx4)',letterSpacing:.3}}>{label}</span>
{val&&<button onClick={e=>{e.stopPropagation();navigator.clipboard.writeText(val);toast(T('تم النسخ','Copied'))}} style={{width:16,height:16,borderRadius:4,border:'none',background:'rgba(255,255,255,.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,padding:0}} title={T('نسخ','Copy')}><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>}
</div>
<div style={{fontSize:11,fontWeight:800,color:'rgba(255,255,255,.7)',direction:'ltr',textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{val||'—'}</div>
</div>)}
</div>
{/* Confirmation date */}
{r.cr_confirm_date&&<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginBottom:14,padding:'8px 10px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.03)'}}>
<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
<span style={{fontSize:9,color:'var(--tx5)'}}>{T('التأكيد السنوي','Annual Confirm')}</span>
<span style={{fontSize:10,fontWeight:700,color:'var(--tx3)',direction:'ltr'}}>{r.cr_confirm_date}</span>
</div>}
{/* Stats row */}
<div style={{display:'grid',gridTemplateColumns:alerts.length>0?'1fr 1fr 1fr':'1fr 1fr',gap:8,marginBottom:8}}>
<div style={{background:'rgba(201,168,76,.04)',borderRadius:8,padding:'8px 10px',border:'1px solid rgba(201,168,76,.06)',textAlign:'center'}}><div style={{fontSize:7,color:'rgba(201,168,76,.5)',marginBottom:3}}>{T('العمال','Workers')}</div><div style={{fontSize:18,fontWeight:900,color:'rgba(201,168,76,.7)',lineHeight:1}}>{r.total_workers||0}</div></div>
<div style={{background:'rgba(52,131,180,.04)',borderRadius:8,padding:'8px 10px',border:'1px solid rgba(52,131,180,.06)',textAlign:'center'}}><div style={{fontSize:7,color:'rgba(52,131,180,.5)',marginBottom:3}}>{T('التأشيرات','Visas')}</div><div style={{fontSize:18,fontWeight:900,color:'rgba(52,131,180,.7)',lineHeight:1}}>{r.max_visas||0}</div></div>
{alerts.length>0&&<div style={{background:'rgba(192,57,43,.04)',borderRadius:8,padding:'8px 10px',border:'1px solid rgba(192,57,43,.08)',textAlign:'center'}}><div style={{fontSize:7,color:'rgba(192,57,43,.5)',marginBottom:3}}>{T('تنبيه','Alert')}</div><div style={{fontSize:14,fontWeight:800,color:'rgba(192,57,43,.7)',lineHeight:1.2}}>{alerts.join(' · ')}</div></div>}
</div>
{r.cr_expiry_date&&(()=>{const dLeft=Math.ceil((new Date(r.cr_expiry_date)-new Date())/(86400000));const expClr=dLeft<0?C.red:dLeft<30?'#e67e22':dLeft<90?C.gold:null;return expClr?<div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 10px',borderRadius:6,background:expClr+'10',border:'1px solid '+expClr+'20',marginTop:2}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={expClr} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg><span style={{fontSize:9,fontWeight:700,color:expClr}}>{dLeft<0?T('السجل منتهي!','CR Expired!'):T('السجل ينتهي خلال ','CR expires in ')+dLeft+T(' يوم',' days')}</span></div>:null})()}
{/* Branch + Actions */}
<div style={{marginTop:10,borderTop:'1px solid rgba(255,255,255,.04)',paddingTop:10,position:'relative',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
<span style={{fontSize:9,fontWeight:600,color:'rgba(201,168,76,.5)',display:'flex',alignItems:'center',gap:4,padding:'3px 10px',borderRadius:6,background:'rgba(201,168,76,.04)',border:'1px solid rgba(201,168,76,.06)'}}>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(201,168,76,.4)" strokeWidth="2"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M6 7V5a2 2 0 012-2h8a2 2 0 012 2v2"/></svg>
{(()=>{const br=branches.find(b=>b.id===r.branch_id);return br?br.name_ar:T('بدون مكتب','No branch')})()}
</span>
{actionMenu===r.id&&<><div onClick={e=>{e.stopPropagation();setActionMenu(null)}} style={{position:'fixed',inset:0,zIndex:9998}}/>
<div onClick={e=>e.stopPropagation()} style={{position:'fixed',top:menuPos.y,left:menuPos.x,width:140,background:'var(--sf)',border:'1px solid rgba(255,255,255,.1)',borderRadius:10,padding:'4px 0',zIndex:9999,boxShadow:'0 12px 40px rgba(0,0,0,.6)',backdropFilter:'blur(12px)'}}>
{[[T('تعديل','Edit'),C.gold,()=>{openEdit(r);setActionMenu(null)}],
[T('رفع التعليق','Unsuspend'),C.ok,()=>{sb.from('facilities').update({cr_status:'active',facility_status:'active',updated_by:user?.id}).eq('id',r.id).then(()=>{toast(T('تم رفع التعليق','Unsuspended'));load()});setActionMenu(null)}],
[T('تجديد السجل','Renew CR'),C.blue,()=>{sb.from('facilities').update({cr_status:'active',cr_confirm_date:new Date(Date.now()+365*86400000).toISOString().slice(0,10),updated_by:user?.id}).eq('id',r.id).then(()=>{toast(T('تم التجديد','Renewed'));load()});setActionMenu(null)}],
[T('شطب السجل','Delete CR'),'#e67e22',()=>{sb.from('facilities').update({cr_delete_date:new Date().toISOString().slice(0,10),cr_status:'cancelled',updated_by:user?.id}).eq('id',r.id).then(()=>{toast(T('تم الشطب','CR Deleted'));load()});setActionMenu(null)}],
[T('حذف','Delete'),C.red,()=>{setActionMenu(null);del('facilities',r.id)}]
].map(([l,c,fn],i)=><button key={i} onClick={fn} style={{width:'100%',height:34,border:'none',background:'transparent',color:c,fontFamily:F,fontSize:11,fontWeight:600,cursor:'pointer',textAlign:'right',padding:'0 14px'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.05)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>{l}</button>)}
</div></>}
</div>
</div></div>})}</div>
{totalPages>1&&(()=>{const btnS=(dis)=>({width:30,height:30,borderRadius:7,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.04)',color:dis?'rgba(255,255,255,.15)':'var(--tx4)',cursor:dis?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12});return<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:18,paddingBottom:8}}>
<div style={{flex:1}}/>
<div style={{display:'flex',gap:4,alignItems:'center'}}>
<button onClick={()=>setPage(0)} disabled={page===0} style={btnS(page===0)}>{'«'}</button>
<button onClick={()=>setPage(Math.max(0,page-1))} disabled={page===0} style={btnS(page===0)}>{'‹'}</button>
<span style={{width:30,height:30,borderRadius:7,border:'1px solid rgba(201,168,76,.3)',background:'rgba(201,168,76,.15)',color:C.gold,fontFamily:F,fontSize:12,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center'}}>{page+1}</span>
<button onClick={()=>setPage(Math.min(totalPages-1,page+1))} disabled={page===totalPages-1} style={btnS(page===totalPages-1)}>{'›'}</button>
<button onClick={()=>setPage(totalPages-1)} disabled={page===totalPages-1} style={btnS(page===totalPages-1)}>{'»'}</button>
</div>
<div style={{flex:1,display:'flex',justifyContent:'flex-end'}}><span style={{fontSize:10,color:'var(--tx5)'}}>{T('عرض','Showing')} {page*PER_PAGE+1}-{Math.min((page+1)*PER_PAGE,filtered.length)} {T('من','of')} {filtered.length}</span></div>
</div>})()}
</>}

{/* ═══ VIEW FACILITY POPUP — Side Tabs ═══ */}
{viewRow&&(()=>{const facWorkers=facWorkersData;const facVisas=visas.filter(v=>v.facility_id===viewRow.id);const facWeekly=weeklyStats.filter(w=>w.facility_id===viewRow.id);const nClr=sMap[viewRow.nitaqat_color]||'#555'
const resolve=(k,v)=>{if(k==='branch_id')return branches.find(b=>b.id===v)?.name_ar||v;if(k==='owner_id'||k==='gosi_owner_id')return owners.find(o=>o.id===v)?.name_ar||v;if(k==='region_id')return regions.find(r=>r.id===v)?.name_ar||v;if(k==='city_id')return cities.find(c=>c.id===v)?.name_ar||v;if(k==='parent_facility_id')return data.find(f=>f.id===v)?.name_ar||v;return v}
const InfoBox=({l,v,copy,isSt})=><div style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'14px 16px',border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:9,color:'var(--tx5)',marginBottom:6}}>{l}</div><div style={{display:'flex',alignItems:'center',gap:6}}><div style={{fontSize:14,fontWeight:700,color:isSt?(sMap[v]||'rgba(255,255,255,.85)'):'rgba(255,255,255,.85)',direction:copy?'ltr':'inherit'}}>{isSt?<Badge v={v}/>:v}</div>{copy&&v&&v!=='—'&&<button onClick={e=>{e.stopPropagation();navigator.clipboard.writeText(String(v));toast(T('تم النسخ','Copied'))}} style={{width:20,height:20,borderRadius:5,border:'none',background:'rgba(255,255,255,.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,flexShrink:0}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>}</div></div>
const vtabs=[{id:'basic',l:T('البيانات الأساسية','Basic Info')},{id:'fpartners',l:T('الملّاك والشركاء','Owners & Partners'),n:facPartners.length},{id:'fworkers',l:T('العمال','Workers'),n:facWorkers.length},{id:'fvisas',l:T('تأشيرات العمل','Work Visas'),n:facVisas.length},{id:'weekly',l:T('السجل الأسبوعي','Weekly Log'),n:facWeekly.length},{id:'fdebts',l:T('المديونيات والمخالفات','Debts & Violations'),n:facDebts.length+facViolations.length},{id:'fsubs',l:T('الاشتراكات','Subscriptions'),n:facSubs.length},{id:'fcreds',l:T('بيانات الدخول','Credentials'),n:facCreds.length},{id:'fdocs',l:T('المستندات','Documents'),n:facDocs.length}]
return<div onClick={()=>setViewRow(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(920px,95vw)',height:'85vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.5)',border:'1px solid rgba(201,168,76,.15)'}}>
{/* Header */}
<div style={{background:'var(--bg)',padding:'16px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(201,168,76,.12)'}}>
<div style={{display:'flex',alignItems:'center',gap:12}}>
<div style={{width:44,height:44,borderRadius:12,background:'rgba(201,168,76,.08)',border:'1.5px solid rgba(201,168,76,.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:900,color:C.gold,flexShrink:0}}>{(viewRow.name_ar||'م')[0]}</div>
<div>
<div style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:17,fontWeight:800,color:'var(--tx)'}}>{viewRow.name_ar}</span><Badge v={{active:T('نشطة','Active'),issue:T('بها مشكلة','Issue'),inactive:T('غير نشطة','Inactive'),deleted:T('محذوفة','Deleted')}[viewRow.facility_status]||viewRow.facility_status}/><div style={{width:18,height:18,borderRadius:'50%',background:nClr+'20',border:'1.5px solid '+nClr+'40',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:6,height:6,borderRadius:'50%',background:nClr}}/></div></div>
{viewRow.name_en&&<div style={{fontSize:10,color:'var(--tx5)',marginTop:2}}>{viewRow.name_en}</div>}
</div></div>
<div style={{display:'flex',gap:6}}>
<button onClick={()=>{setViewRow(null);openEdit(viewRow)}} style={{height:32,padding:'0 14px',borderRadius:8,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.08)',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer'}}>{T('تعديل','Edit')}</button>
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

{viewTab==='basic'&&<div style={{display:'flex',flexDirection:'column',gap:22}}>
{/* 1. السجل التجاري */}
<div>
<div style={{fontSize:11,fontWeight:700,color:C.gold,marginBottom:10,display:'flex',alignItems:'center',gap:6}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 7h8M8 11h6M8 15h4"/></svg>{T('السجل التجاري','Commercial Reg.')}</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
<InfoBox l={T('الرقم الموحد','Unified No.')} v={viewRow.unified_national_number||'—'} copy/>
<InfoBox l={T('رقم السجل','CR Number')} v={viewRow.cr_number||'—'} copy/>
<InfoBox l={T('حالة السجل','CR Status')} v={{active:T('نشط','Active'),pending_confirmation:T('ضمن فترة التأكيد','Pending'),suspended:T('معلّق','Suspended'),cancelled:T('ملغى','Cancelled'),expired:T('منتهي','Expired'),deleted:T('مشطوب','Deleted')}[viewRow.cr_status]||viewRow.cr_status||'—'} isSt/>
<InfoBox l={T('تاريخ الإصدار','Issue Date')} v={viewRow.cr_issue_date||'—'}/>
<InfoBox l={T('تاريخ التأكيد السنوي','Annual Confirm')} v={viewRow.cr_confirm_date||'—'}/>
<InfoBox l={T('سجل رئيسي','Main CR')} v={viewRow.is_main_cr?T('نعم','Yes'):T('لا','No')}/>
</div>
</div>
{/* 2. أرقام الملفات الحكومية */}
<div>
<div style={{fontSize:11,fontWeight:700,color:'#9b59b6',marginBottom:10,display:'flex',alignItems:'center',gap:6}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b59b6" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>{T('أرقام الملفات الحكومية','Gov. File Numbers')}</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
<InfoBox l={T('ملف قوى','Qiwa File')} v={viewRow.qiwa_file_number||'—'} copy/>
<InfoBox l={T('ملف التأمينات الاجتماعية','GOSI File')} v={viewRow.gosi_file_number||'—'} copy/>
{viewRow.chamber_membership_no&&<InfoBox l={T('الغرفة التجارية','Chamber')} v={viewRow.chamber_membership_no} copy/>}
{viewRow.subl_file_number&&<InfoBox l={T('سُبل','Subl')} v={viewRow.subl_file_number} copy/>}
</div>
</div>
{/* 3. معلومات المنشأة */}
<div>
<div style={{fontSize:11,fontWeight:700,color:C.blue,marginBottom:10,display:'flex',alignItems:'center',gap:6}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2"><rect x="3" y="8" width="18" height="14" rx="2"/><path d="M7 8V4a2 2 0 012-2h6a2 2 0 012 2v4"/></svg>{T('معلومات المنشأة','Facility Info')}</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:8}}>
<InfoBox l={T('النوع','Type')} v={viewRow.type==='company'?T('شركة','Company'):T('مؤسسة فردية','Establishment')}/>
<InfoBox l={T('الشكل القانوني','Legal Form')} v={{sole_proprietorship:T('مؤسسة فردية','Sole Proprietorship'),limited_liability:T('ذات مسؤولية محدودة','LLC'),simplified_joint_stock:T('مساهمة مبسطة','Simplified Joint Stock'),general_partnership:T('تضامن','General Partnership'),limited_partnership:T('توصية بسيطة','Limited Partnership'),joint_stock:T('مساهمة','Joint Stock')}[viewRow.legal_form]||'—'}/>
<InfoBox l={T('الحالة','Status')} v={{active:T('نشطة','Active'),issue:T('بها مشكلة','Issue'),inactive:T('غير نشطة','Inactive'),deleted:T('محذوفة','Deleted')}[viewRow.facility_status]||viewRow.facility_status||'—'} isSt/>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
<InfoBox l={T('رأس المال','Capital')} v={viewRow.capital?nm(viewRow.capital)+' '+T('ر.س','SAR'):'—'}/>
<div style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'14px 16px',border:'1px solid rgba(255,255,255,.03)'}}>
<div style={{fontSize:9,color:'var(--tx5)',marginBottom:6}}>{T('الأغراض','Purposes')}</div>
<div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
{viewRow.purpose_transfer&&<span style={{fontSize:9,fontWeight:600,padding:'3px 10px',borderRadius:5,background:'rgba(26,188,156,.08)',color:'#1abc9c',border:'1px solid rgba(26,188,156,.12)'}}>{T('نقل خدمات','Transfer')}</span>}
{viewRow.purpose_permanent_visa&&<span style={{fontSize:9,fontWeight:600,padding:'3px 10px',borderRadius:5,background:'rgba(52,131,180,.08)',color:C.blue,border:'1px solid rgba(52,131,180,.12)'}}>{T('تأشيرة دائمة','Permanent Visa')}</span>}
{viewRow.purpose_temporary_visa&&<span style={{fontSize:9,fontWeight:600,padding:'3px 10px',borderRadius:5,background:'rgba(201,168,76,.08)',color:C.gold,border:'1px solid rgba(201,168,76,.12)'}}>{T('تأشيرة مؤقتة','Temporary Visa')}</span>}
{!viewRow.purpose_transfer&&!viewRow.purpose_permanent_visa&&!viewRow.purpose_temporary_visa&&<span style={{fontSize:9,color:'var(--tx6)'}}>—</span>}
</div>
</div>
</div>
</div>
{/* 5. الموقع والعنوان */}
<div>
<div style={{fontSize:11,fontWeight:700,color:'#1abc9c',marginBottom:10,display:'flex',alignItems:'center',gap:6}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1abc9c" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>{T('الموقع والعنوان','Location & Address')}</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
<InfoBox l={T('المنطقة','Region')} v={resolve('region_id',viewRow.region_id)||'—'}/>
<InfoBox l={T('المدينة','City')} v={resolve('city_id',viewRow.city_id)||'—'}/>
<InfoBox l={T('العنوان المختصر','Short Address')} v={viewRow.short_address||'—'} copy/>
<InfoBox l={T('الرمز البريدي','Postal Code')} v={viewRow.postal_code||'—'}/>
</div>
</div>
{/* 6. الامتثال */}
<div>
<div style={{fontSize:11,fontWeight:700,color:'#e67e22',marginBottom:10,display:'flex',alignItems:'center',gap:6}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e67e22" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>{T('الامتثال','Compliance')}</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
<InfoBox l={T('حالة التأمينات الاجتماعية','Social Insurance')} v={{active:T('نشط','Active'),inactive:T('غير نشط','Inactive')}[viewRow.gosi_status]||'—'} isSt/>
<InfoBox l={T('خدمات العمل','Labor Services')} v={{active:T('نشط','Active'),suspended:T('معلّق','Suspended')}[viewRow.mlsd_service_status]||'—'} isSt/>
<InfoBox l={T('حماية الأجور (مدد)','Wage Protection (Mudad)')} v={{compliant:T('متوافق','Compliant'),non_compliant:T('غير متوافق','Non-Compliant')}[viewRow.mudad_wps_compliance_status]||'—'} isSt/>
{viewRow.is_original_exempt&&<InfoBox l={T('إعفاء أصلي','Original Exempt')} v={T('نعم','Yes')}/>}
</div>
</div>
{/* 7. الالتزامات المالية الحكومية */}
{(viewRow.vat_number||viewRow.zakat_unique_number||viewRow.vat_status)&&<div>
<div style={{fontSize:11,fontWeight:700,color:'#e74c3c',marginBottom:10,display:'flex',alignItems:'center',gap:6}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="3"/><line x1="2" y1="10" x2="22" y2="10"/></svg>{T('الالتزامات المالية الحكومية','Gov. Financial Obligations')}</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
<InfoBox l={T('رقم ضريبة القيمة المضافة','VAT Number')} v={viewRow.vat_number||'—'} copy/>
<InfoBox l={T('الرقم المميز للزكاة','Zakat Unique No.')} v={viewRow.zakat_unique_number||'—'} copy/>
<InfoBox l={T('رصيد الزكاة المستحق','Zakat Balance')} v={viewRow.zakat_outstanding_balance?nm(viewRow.zakat_outstanding_balance)+' '+T('ر.س','SAR'):'—'}/>
</div>
</div>}
{/* 7. ملاحظات */}
{viewRow.notes&&<div>
<div style={{fontSize:11,fontWeight:700,color:'var(--tx4)',marginBottom:10,display:'flex',alignItems:'center',gap:6}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--tx4)" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>{T('ملاحظات','Notes')}</div>
<div style={{padding:'12px 16px',background:'rgba(255,255,255,.02)',borderRadius:10,border:'1px solid rgba(255,255,255,.03)',fontSize:12,color:'var(--tx3)',lineHeight:1.8,whiteSpace:'pre-wrap'}}>{viewRow.notes}</div>
</div>}
</div>}

{viewTab==='fpartners'&&<div style={{display:'flex',flexDirection:'column',gap:12}}>
<div style={{fontSize:11,fontWeight:700,color:C.gold,display:'flex',alignItems:'center',gap:6}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2"><circle cx="9" cy="7" r="4"/><path d="M2 21v-1a5 5 0 0114 0v1"/><circle cx="19" cy="7" r="2"/><path d="M22 21v-1a3 3 0 00-3-3"/></svg>{T('الملّاك والشركاء','Owners & Partners')} ({facPartners.length})</div>
{facPartners.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)',background:'rgba(255,255,255,.02)',borderRadius:10,border:'1px solid rgba(255,255,255,.03)'}}>{T('لا يوجد ملّاك/شركاء','No partners')}</div>:facPartners.map(p=>{const own=owners.find(o=>o.id===p.owner_id);const ownerFac=p.owner_facility_id?data.find(f=>f.id===p.owner_facility_id):null;const isFacPartner=p.partner_type==='facility'&&ownerFac;return<div key={p.id} style={{background:'rgba(255,255,255,.02)',borderRadius:12,padding:'18px 20px',border:'1px solid rgba(255,255,255,.04)'}}>
<div style={{display:'flex',alignItems:'center',gap:14,marginBottom:12}}>
<div style={{width:42,height:42,borderRadius:12,background:isFacPartner?'linear-gradient(135deg,rgba(201,168,76,.12),rgba(201,168,76,.04))':'linear-gradient(135deg,rgba(52,131,180,.12),rgba(52,131,180,.04))',border:'1px solid '+(isFacPartner?'rgba(201,168,76,.15)':'rgba(52,131,180,.15)'),display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:900,color:isFacPartner?C.gold:C.blue,flexShrink:0}}>{isFacPartner?(ownerFac.name_ar||'م')[0]:(own?.name_ar||'م')[0]}</div>
<div style={{flex:1}}>
<div style={{display:'flex',alignItems:'center',gap:8}}>
<span style={{fontSize:14,fontWeight:700,color:'var(--tx)'}}>{isFacPartner?ownerFac.name_ar:(own?.name_ar||T('مالك','Owner'))}</span>
{p.is_manager&&<span style={{fontSize:9,color:C.gold,background:'rgba(201,168,76,.1)',padding:'3px 10px',borderRadius:6,fontWeight:700}}>{T('مدير','Manager')}</span>}
<span style={{fontSize:9,fontWeight:600,padding:'3px 8px',borderRadius:5,background:isFacPartner?'rgba(201,168,76,.08)':'rgba(52,131,180,.08)',color:isFacPartner?C.gold:C.blue,border:'1px solid '+(isFacPartner?'rgba(201,168,76,.12)':'rgba(52,131,180,.12)')}}>{isFacPartner?T('منشأة','Facility'):T('شخص','Person')}</span>
</div>
{isFacPartner?ownerFac.name_en&&<div style={{fontSize:10,color:'var(--tx5)',marginTop:2}}>{ownerFac.name_en}</div>:own?.name_en&&<div style={{fontSize:10,color:'var(--tx5)',marginTop:2}}>{own.name_en}</div>}
</div>
{p.ownership_percentage&&<div style={{textAlign:'center'}}><div style={{fontSize:20,fontWeight:800,color:C.gold}}>{p.ownership_percentage}%</div><div style={{fontSize:8,color:'var(--tx5)'}}>{T('الملكية','Ownership')}</div></div>}
</div>
{isFacPartner?<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
<div style={{padding:'8px 12px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:8,color:'var(--tx5)',marginBottom:2}}>{T('الرقم الموحد','Unified No.')}</div><div style={{fontSize:11,fontWeight:600,color:'var(--tx2)',direction:'ltr'}}>{ownerFac.unified_national_number||'—'}</div></div>
<div style={{padding:'8px 12px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:8,color:'var(--tx5)',marginBottom:2}}>{T('رقم السجل','CR Number')}</div><div style={{fontSize:11,fontWeight:600,color:'var(--tx2)',direction:'ltr'}}>{ownerFac.cr_number||'—'}</div></div>
</div>:<>
{/* البيانات الشخصية */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:8}}>
{own?.id_number&&<div style={{padding:'8px 12px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:8,color:'var(--tx5)',marginBottom:2}}>{T('رقم الهوية','ID Number')}</div><div style={{display:'flex',alignItems:'center',gap:6}}><span style={{fontSize:11,fontWeight:600,color:'var(--tx2)',direction:'ltr'}}>{own.id_number}</span><button onClick={e=>{e.stopPropagation();navigator.clipboard.writeText(own.id_number);toast(T('تم النسخ','Copied'))}} style={{width:18,height:18,borderRadius:4,border:'none',background:'rgba(255,255,255,.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,flexShrink:0}}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button></div></div>}
<div style={{padding:'8px 12px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:8,color:'var(--tx5)',marginBottom:2}}>{T('تاريخ الميلاد','Date of Birth')}</div><div style={{display:'flex',alignItems:'center',gap:6}}><span style={{fontSize:11,fontWeight:600,color:'var(--tx2)',direction:'ltr'}}>{own?.date_of_birth||'—'}</span>{own?.date_of_birth&&<span style={{fontSize:8,fontWeight:700,color:C.gold,background:'rgba(201,168,76,.08)',padding:'1px 6px',borderRadius:4}}>{Math.floor((Date.now()-new Date(own.date_of_birth).getTime())/(365.25*86400000))} {T('سنة','y')}</span>}</div>{own?.date_of_birth_h&&<div style={{fontSize:9,color:'var(--tx5)',marginTop:3,direction:'ltr'}}>{own.date_of_birth_h} {T('هـ','H')}</div>}</div>
{own?.gender&&<div style={{padding:'8px 12px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:8,color:'var(--tx5)',marginBottom:2}}>{T('الجنس','Gender')}</div><div style={{fontSize:11,fontWeight:600,color:'var(--tx2)'}}>{own.gender==='male'?T('ذكر','Male'):own.gender==='female'?T('أنثى','Female'):own.gender}</div></div>}
</div>
{/* التواصل */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
{own?.mobile_work&&<div style={{padding:'8px 12px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:8,color:'var(--tx5)',marginBottom:2}}>{T('جوال العمل','Work Phone')}</div><div style={{fontSize:11,fontWeight:600,color:'var(--tx2)',direction:'ltr'}}>{own.mobile_work}</div></div>}
{own?.mobile_personal&&<div style={{padding:'8px 12px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:8,color:'var(--tx5)',marginBottom:2}}>{T('الجوال الشخصي','Personal Phone')}</div><div style={{fontSize:11,fontWeight:600,color:'var(--tx2)',direction:'ltr'}}>{own.mobile_personal}</div></div>}
</div>
</>}
{p.notes&&<div style={{marginTop:8,padding:'8px 12px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.03)',fontSize:10,color:'var(--tx4)'}}>{p.notes}</div>}
</div>})}</div>}

{viewTab==='fworkers'&&(()=>{const expiredIqama=facWorkers.filter(w=>w.iqama_expiry_date&&new Date(w.iqama_expiry_date)<new Date()).length;const expiredWP=facWorkers.filter(w=>w.qiwa_contract_expiry_date&&new Date(w.qiwa_contract_expiry_date)<new Date()).length;const flagMap={'سعودي':'🇸🇦','سعودية':'🇸🇦','مصري':'🇪🇬','باكستاني':'🇵🇰','بنغلاديشي':'🇧🇩','هندي':'🇮🇳','فلبيني':'🇵🇭','إندونيسي':'🇮🇩','سوداني':'🇸🇩','إثيوبي':'🇪🇹','يمني':'🇾🇪','سوري':'🇸🇾','أردني':'🇯🇴','نيبالي':'🇳🇵','سريلانكي':'🇱🇰','ميانمار':'🇲🇲','كيني':'🇰🇪','أوغندي':'🇺🇬','تركي':'🇹🇷','مغربي':'🇲🇦','تونسي':'🇹🇳','أفغاني':'🇦🇫'};const dateStatus=(d)=>{if(!d)return null;const diff=Math.ceil((new Date(d)-new Date())/(86400000));return diff<0?'expired':diff<30?'warning':'ok'};return<div style={{display:'flex',flexDirection:'column',gap:16}}>
{/* إحصائيات */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8}}>
{[[T('الإجمالي','Total'),facWorkers.length,C.gold],[T('سعوديين','Saudis'),facWorkers.filter(w=>w.nationality==='سعودي'||w.nationality==='سعودية').length,C.ok],[T('رخص عمل منتهية','Expired WP'),expiredWP,expiredWP>0?C.red:'#555'],[T('إقامات منتهية','Expired Iqama'),expiredIqama,expiredIqama>0?C.red:'#555']].map(([l,v,c],i)=>
<div key={i} style={{background:c+'08',borderRadius:10,padding:'12px 10px',border:'1px solid '+c+'15',textAlign:'center'}}>
<div style={{fontSize:8,color:c,opacity:.7,marginBottom:4}}>{l}</div>
<div style={{fontSize:20,fontWeight:900,color:c,lineHeight:1}}>{v}</div>
</div>)}
</div>
{/* قائمة العمال */}
<div style={{fontSize:11,fontWeight:700,color:C.gold,display:'flex',alignItems:'center',gap:6}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0116 0v1"/></svg>{T('العمال','Workers')} ({facWorkers.length})</div>
{facWorkersLoading?<div style={{textAlign:'center',padding:30,color:'var(--tx5)'}}>...</div>:
facWorkers.length===0?<div style={{textAlign:'center',padding:30,color:'var(--tx6)',background:'rgba(255,255,255,.02)',borderRadius:10,border:'1px solid rgba(255,255,255,.03)'}}>{T('لا يوجد عمال','No workers')}</div>:
<div style={{display:'flex',flexDirection:'column',gap:10}}>
{facWorkers.map(w=>{const iqSt=dateStatus(w.iqama_expiry_date);const wpSt=dateStatus(w.qiwa_contract_expiry_date);const stClr=(st)=>st==='expired'?C.red:st==='warning'?'#e67e22':'var(--tx2)';const stBg=(st)=>st==='expired'?'rgba(192,57,43,.04)':st==='warning'?'rgba(230,126,34,.04)':'rgba(255,255,255,.02)';const stBd=(st)=>st==='expired'?'rgba(192,57,43,.1)':st==='warning'?'rgba(230,126,34,.1)':'rgba(255,255,255,.03)'
return<div key={w.id} style={{background:'rgba(255,255,255,.02)',borderRadius:12,padding:'16px 18px',border:'1px solid '+(iqSt==='expired'?'rgba(192,57,43,.15)':'rgba(255,255,255,.04)')}}>
{/* هيدر */}
<div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
<div style={{width:44,height:44,borderRadius:'50%',background:'linear-gradient(135deg,rgba(52,131,180,.12),rgba(52,131,180,.04))',border:'2px solid rgba(52,131,180,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:C.blue,flexShrink:0}}>{(w.name_ar||'ع')[0]}</div>
<div style={{flex:1}}>
<div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
{w.nationality&&<img src={'https://flagcdn.com/20x15/'+({'سعودي':'sa','سعودية':'sa','مصري':'eg','باكستاني':'pk','بنغلاديشي':'bd','هندي':'in','فلبيني':'ph','إندونيسي':'id','سوداني':'sd','إثيوبي':'et','يمني':'ye','سوري':'sy','أردني':'jo','نيبالي':'np','سريلانكي':'lk','ميانمار':'mm','كيني':'ke','أوغندي':'ug','تركي':'tr','مغربي':'ma','تونسي':'tn','أفغاني':'af'}[w.nationality]||'xx')+'.png'} alt={w.nationality} title={w.nationality} style={{width:20,height:15,borderRadius:2,objectFit:'cover'}} onError={e=>{e.target.style.display='none'}}/>}
<span style={{fontSize:14,fontWeight:700,color:'var(--tx)'}}>{w.name_ar}</span>
{w.worker_number&&<span style={{fontSize:9,color:'var(--tx5)',fontWeight:500}}>{w.worker_number}</span>}
<Badge v={{active:T('نشط','Active'),inactive:T('غير نشط','Inactive'),transferred:T('منقول','Transferred'),final_exit:T('خروج نهائي','Final Exit')}[w.worker_status]||w.worker_status||'—'}/>
{w.outside_kingdom&&<span style={{fontSize:8,fontWeight:700,padding:'2px 8px',borderRadius:4,background:'rgba(192,57,43,.08)',color:C.red,border:'1px solid rgba(192,57,43,.12)'}}>{T('خارج المملكة','Outside KSA')}</span>}
</div>
{w.name_en&&<div style={{fontSize:9,color:'var(--tx5)',marginTop:2}}>{w.name_en}</div>}
</div>
</div>
{/* صف أول: الإقامة | المهنة | الجوال */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:6}}>
<div style={{padding:'8px 10px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:7,color:'var(--tx5)',marginBottom:3}}>{T('رقم الإقامة','Iqama')}</div><div style={{fontSize:11,fontWeight:700,color:'var(--tx2)',direction:'ltr'}}>{w.iqama_number||'—'}</div></div>
<div style={{padding:'8px 10px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:7,color:'var(--tx5)',marginBottom:3}}>{T('المهنة','Occupation')}</div><div style={{fontSize:11,fontWeight:700,color:'var(--tx2)'}}>{occupationsMap[w.occupation_id]||'—'}</div></div>
<div style={{padding:'8px 10px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:7,color:'var(--tx5)',marginBottom:3}}>{T('الجوال','Phone')}</div><div style={{fontSize:11,fontWeight:700,color:'var(--tx2)',direction:'ltr'}}>{w.phone||'—'}</div></div>
</div>
{/* صف ثاني: انتهاء الإقامة | انتهاء رخصة العمل | التأمين */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:6}}>
<div style={{padding:'8px 10px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:7,color:'var(--tx5)',marginBottom:3}}>{T('اشتراك التأمينات','GOSI Subscription')}</div><div style={{fontSize:11,fontWeight:700}}><Badge v={{active:T('نشط','Active'),inactive:T('غير نشط','Inactive')}[w.gosi_status]||w.gosi_status||'—'}/></div></div>
<div style={{padding:'8px 10px',background:stBg(wpSt),borderRadius:8,border:'1px solid '+stBd(wpSt)}}><div style={{fontSize:7,color:stClr(wpSt),marginBottom:3,display:'flex',alignItems:'center',gap:4}}>{T('انتهاء رخصة العمل','WP Expiry')}{wpSt==='expired'&&<span style={{fontSize:7,fontWeight:700,color:C.red,background:'rgba(192,57,43,.1)',padding:'0 4px',borderRadius:3}}>{T('منتهية','Expired')}</span>}</div><div style={{fontSize:11,fontWeight:700,color:stClr(wpSt),direction:'ltr'}}>{w.qiwa_contract_expiry_date||'—'}</div></div>
<div style={{padding:'8px 10px',background:stBg(iqSt),borderRadius:8,border:'1px solid '+stBd(iqSt)}}><div style={{fontSize:7,color:stClr(iqSt),marginBottom:3,display:'flex',alignItems:'center',gap:4}}>{T('انتهاء الإقامة','Iqama Expiry')}{iqSt==='expired'&&<span style={{fontSize:7,fontWeight:700,color:C.red,background:'rgba(192,57,43,.1)',padding:'0 4px',borderRadius:3}}>{T('منتهية','Expired')}</span>}</div><div style={{fontSize:11,fontWeight:700,color:stClr(iqSt),direction:'ltr'}}>{w.iqama_expiry_date||'—'}</div></div>
</div>
{/* صف ثالث: الراتب | طريقة الانضمام */}
<div style={{display:'grid',gridTemplateColumns:w.broker_id?'1fr 1fr 1fr':'1fr 1fr',gap:6}}>
<div style={{padding:'8px 10px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:7,color:'var(--tx5)',marginBottom:3}}>{T('راتب التأمينات','GOSI Salary')}</div><div style={{fontSize:11,fontWeight:700,color:'var(--tx2)'}}>{w.gosi_salary?nm(w.gosi_salary)+' '+T('ر.س','SAR'):'—'}</div></div>
<div style={{padding:'8px 10px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:7,color:'var(--tx5)',marginBottom:3}}>{T('طريقة الانضمام','Joining Method')}</div><div>{w.joining_method?<span style={{fontSize:9,fontWeight:700,padding:'3px 10px',borderRadius:5,background:w.joining_method==='transfer'?'rgba(230,126,34,.08)':'rgba(52,131,180,.08)',color:w.joining_method==='transfer'?'#e67e22':C.blue,border:'1px solid '+(w.joining_method==='transfer'?'rgba(230,126,34,.12)':'rgba(52,131,180,.12)')}}>{w.joining_method==='transfer'?T('نقل كفالة','Transfer'):w.joining_method==='recruitment'?T('استقدام','Recruitment'):w.joining_method==='visa'?T('تأشيرة','Visa'):w.joining_method}</span>:<span style={{fontSize:11,color:'var(--tx2)'}}>—</span>}</div></div>
{w.broker_id&&<div style={{padding:'8px 10px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:7,color:'var(--tx5)',marginBottom:3}}>{T('الوسيط','Broker')}</div><div style={{fontSize:11,fontWeight:700,color:'var(--tx2)'}}>{w.broker_id}</div></div>}
</div>
</div>})}
</div>}
</div>})()}

{viewTab==='fvisas'&&(()=>{const vAvail=facVisas.filter(v=>v.status==='available').length;const vUsed=facVisas.filter(v=>v.status==='used').length;const vProc=facVisas.filter(v=>v.status==='processing').length;const vExpired=facVisas.filter(v=>v.expiry_date&&new Date(v.expiry_date)<new Date()&&v.status!=='cancelled').length;const vCanc=facVisas.filter(v=>v.status==='cancelled').length;const filteredVisas=visaFilter==='all'?facVisas:visaFilter==='expired'?facVisas.filter(v=>v.expiry_date&&new Date(v.expiry_date)<new Date()&&v.status!=='cancelled'):facVisas.filter(v=>v.status===visaFilter);const vDateSt=(d)=>{if(!d)return null;const diff=Math.ceil((new Date(d)-new Date())/(86400000));return diff<0?'expired':diff<30?'warning':'ok'};const vStLabel={'available':T('متاحة','Available'),'used':T('مستخدمة','Used'),'processing':T('قيد المعالجة','Processing'),'cancelled':T('ملغاة','Cancelled')};const vStClr={'available':C.ok,'used':C.blue,'processing':'#e67e22','cancelled':'#999'};return<div style={{display:'flex',flexDirection:'column',gap:16}}>
{/* إحصائيات */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr',gap:8}}>
{[[T('متاحة','Available'),vAvail,C.ok],[T('مستخدمة','Used'),vUsed,C.blue],[T('قيد المعالجة','Processing'),vProc,vProc>0?'#e67e22':'#555'],[T('منتهية الصلاحية','Expired'),vExpired,vExpired>0?C.red:'#555'],[T('ملغاة','Cancelled'),vCanc,'#999']].map(([l,v,c],i)=>
<div key={i} style={{background:c+'08',borderRadius:10,padding:'10px 6px',border:'1px solid '+c+'15',textAlign:'center'}}>
<div style={{fontSize:7,color:c,opacity:.7,marginBottom:4}}>{l}</div>
<div style={{fontSize:18,fontWeight:900,color:c,lineHeight:1}}>{v}</div>
</div>)}
</div>
{/* فلتر */}
<div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
{[['all',T('الكل','All')],['available',T('متاحة','Available')],['used',T('مستخدمة','Used')],['processing',T('قيد المعالجة','Processing')],['expired',T('منتهية','Expired')],['cancelled',T('ملغاة','Cancelled')]].map(([k,l])=><div key={k} onClick={()=>setVisaFilter(k)} style={{padding:'5px 12px',borderRadius:8,fontSize:10,fontWeight:visaFilter===k?700:500,color:visaFilter===k?C.gold:'rgba(255,255,255,.4)',background:visaFilter===k?'rgba(201,168,76,.08)':'transparent',border:visaFilter===k?'1px solid rgba(201,168,76,.15)':'1px solid rgba(255,255,255,.06)',cursor:'pointer'}}>{l}</div>)}
</div>
{/* القائمة */}
{filteredVisas.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)',background:'rgba(255,255,255,.02)',borderRadius:10,border:'1px solid rgba(255,255,255,.03)'}}>
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="1.5" style={{marginBottom:8}}><rect x="2" y="5" width="20" height="14" rx="3"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
<div>{T('لا توجد تأشيرات عمل','No work visas')}</div>
</div>:
<div style={{display:'flex',flexDirection:'column',gap:10}}>
{filteredVisas.map(v=>{const expSt=vDateSt(v.expiry_date);const linkedWorker=v.worker_id?facWorkers.find(w=>w.id===v.worker_id):null;return<div key={v.id} style={{background:'rgba(255,255,255,.02)',borderRadius:12,padding:'16px 18px',border:'1px solid '+(expSt==='expired'?'rgba(192,57,43,.15)':'rgba(255,255,255,.04)')}}>
{/* هيدر */}
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
<span style={{fontSize:13,fontWeight:700,color:'var(--tx)',direction:'ltr'}}>{v.visa_number||'—'}</span>
{v.visa_type&&<span style={{fontSize:9,fontWeight:600,padding:'3px 8px',borderRadius:5,background:'rgba(255,255,255,.05)',color:'var(--tx4)',border:'1px solid rgba(255,255,255,.06)'}}>{v.visa_type}</span>}
<Badge v={vStLabel[v.status]||v.status}/>
<div style={{flex:1}}/>
<DelBtn onClick={()=>del('facility_visas',v.id)}/>
</div>
{/* صف أول: الحدود | المهنة | الجنسية */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:6}}>
<div style={{padding:'8px 10px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:7,color:'var(--tx5)',marginBottom:3}}>{T('رقم الحدود','Border No.')}</div><div style={{fontSize:11,fontWeight:700,color:'var(--tx2)',direction:'ltr'}}>{v.border_number||'—'}</div></div>
<div style={{padding:'8px 10px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:7,color:'var(--tx5)',marginBottom:3}}>{T('المهنة','Occupation')}</div><div style={{fontSize:11,fontWeight:700,color:'var(--tx2)'}}>{v.occupation||'—'}</div></div>
<div style={{padding:'8px 10px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:7,color:'var(--tx5)',marginBottom:3}}>{T('الجنسية','Nationality')}</div><div style={{fontSize:11,fontWeight:700,color:'var(--tx2)'}}>{v.nationality||'—'}</div></div>
</div>
{/* صف ثاني: مدينة السفارة | المدة | تاريخ الإصدار */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:6}}>
<div style={{padding:'8px 10px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:7,color:'var(--tx5)',marginBottom:3}}>{T('مدينة السفارة','Embassy City')}</div><div style={{fontSize:11,fontWeight:700,color:'var(--tx2)'}}>{v.embassy_city||'—'}</div></div>
<div style={{padding:'8px 10px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:7,color:'var(--tx5)',marginBottom:3}}>{T('المدة','Duration')}</div><div><Badge v={v.duration_type==='permanent'?T('دائمة','Permanent'):T('مؤقتة','Temporary')}/></div></div>
<div style={{padding:'8px 10px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:7,color:'var(--tx5)',marginBottom:3}}>{T('تاريخ الإصدار','Issue Date')}</div><div style={{fontSize:11,fontWeight:700,color:'var(--tx2)',direction:'ltr'}}>{v.issue_date||'—'}</div></div>
</div>
{/* صف ثالث: تاريخ الانتهاء */}
<div style={{display:'grid',gridTemplateColumns:'1fr',gap:6}}>
<div style={{padding:'8px 10px',background:expSt==='expired'?'rgba(192,57,43,.04)':expSt==='warning'?'rgba(230,126,34,.04)':'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid '+(expSt==='expired'?'rgba(192,57,43,.1)':expSt==='warning'?'rgba(230,126,34,.1)':'rgba(255,255,255,.03)')}}><div style={{fontSize:7,color:expSt==='expired'?C.red:expSt==='warning'?'#e67e22':'var(--tx5)',marginBottom:3,display:'flex',alignItems:'center',gap:4}}>{T('تاريخ الانتهاء','Expiry Date')}{expSt==='expired'&&<span style={{fontSize:7,fontWeight:700,color:C.red,background:'rgba(192,57,43,.1)',padding:'0 4px',borderRadius:3}}>{T('منتهية','Expired')}</span>}</div><div style={{fontSize:11,fontWeight:700,color:expSt==='expired'?C.red:expSt==='warning'?'#e67e22':'var(--tx2)',direction:'ltr'}}>{v.expiry_date||'—'}</div></div>
</div>
{/* العامل المرتبط */}
{linkedWorker&&<div style={{marginTop:8,padding:'8px 12px',background:'rgba(52,131,180,.04)',borderRadius:8,border:'1px solid rgba(52,131,180,.08)',display:'flex',alignItems:'center',gap:8,cursor:'pointer'}} onClick={()=>setViewTab('fworkers')}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0116 0v1"/></svg>
<span style={{fontSize:10,fontWeight:600,color:C.blue}}>{linkedWorker.name_ar}</span>
<span style={{fontSize:9,color:'var(--tx5)'}}>{linkedWorker.worker_number}</span>
</div>}
</div>})}
</div>}
</div>})()}

{viewTab==='weekly'&&(()=>{const last=facWeekly[0];const nitaqatAr={'red':T('أحمر','Red'),'yellow':T('أصفر','Yellow'),'green_low':T('أخضر منخفض','Green Low'),'green_mid':T('أخضر متوسط','Green Mid'),'green_high':T('أخضر عالي','Green High'),'platinum':T('بلاتيني','Platinum')};const diff=(cur,prev,k)=>{if(!prev||cur==null||prev[k]==null)return null;const d=Number(cur)-Number(prev[k]);return d===0?null:d};const diffIcon=(d)=>d>0?<span style={{color:C.ok,fontSize:9,marginRight:2}}>↑</span>:<span style={{color:C.red,fontSize:9,marginRight:2}}>↓</span>;const pctClr=(v,threshold)=>v!=null&&v<threshold?v<60?C.red:'#e67e22':'var(--tx3)';return<div style={{display:'flex',flexDirection:'column',gap:16}}>
{/* إحصائيات آخر سجل */}
{last&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
<div style={{background:(sMap[last.nitaqat_color]||'#555')+'08',borderRadius:10,padding:'12px 10px',border:'1px solid '+(sMap[last.nitaqat_color]||'#555')+'15',textAlign:'center'}}>
<div style={{fontSize:8,color:sMap[last.nitaqat_color]||'#555',opacity:.7,marginBottom:4}}>{T('النطاق الحالي','Current Nitaqat')}</div>
<div style={{fontSize:16,fontWeight:900,color:sMap[last.nitaqat_color]||'#555'}}>{nitaqatAr[last.nitaqat_color]||last.nitaqat_color||'—'}</div>
</div>
<div style={{background:(last.saudization_percentage!=null&&last.saudization_percentage<20?C.red:C.ok)+'08',borderRadius:10,padding:'12px 10px',border:'1px solid '+(last.saudization_percentage!=null&&last.saudization_percentage<20?C.red:C.ok)+'15',textAlign:'center'}}>
<div style={{fontSize:8,color:last.saudization_percentage!=null&&last.saudization_percentage<20?C.red:C.ok,opacity:.7,marginBottom:4}}>{T('نسبة السعودة','Saudization')}</div>
<div style={{fontSize:20,fontWeight:900,color:last.saudization_percentage!=null&&last.saudization_percentage<20?C.red:C.ok}}>{last.saudization_percentage!=null?last.saudization_percentage+'%':'—'}</div>
</div>
<div style={{background:(pctClr(last.contract_auth_pct,80)==='var(--tx3)'?C.ok:pctClr(last.contract_auth_pct,80))+'08',borderRadius:10,padding:'12px 10px',border:'1px solid '+(pctClr(last.contract_auth_pct,80)==='var(--tx3)'?C.ok:pctClr(last.contract_auth_pct,80))+'15',textAlign:'center'}}>
<div style={{fontSize:8,color:pctClr(last.contract_auth_pct,80)==='var(--tx3)'?C.ok:pctClr(last.contract_auth_pct,80),opacity:.7,marginBottom:4}}>{T('توثيق العقود','Contract Auth')}</div>
<div style={{fontSize:20,fontWeight:900,color:pctClr(last.contract_auth_pct,80)==='var(--tx3)'?C.ok:pctClr(last.contract_auth_pct,80)}}>{last.contract_auth_pct!=null?last.contract_auth_pct+'%':'—'}</div>
</div>
</div>}
{/* العنوان + إضافة */}
<div style={{fontSize:11,fontWeight:700,color:C.gold,display:'flex',alignItems:'center',gap:6}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>{T('السجل الأسبوعي','Weekly Log')} ({facWeekly.length})</div>
{/* القائمة */}
{facWeekly.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)',background:'rgba(255,255,255,.02)',borderRadius:10,border:'1px solid rgba(255,255,255,.03)'}}>{T('لا توجد بيانات أسبوعية بعد','No weekly data yet')}</div>:
<div style={{display:'flex',flexDirection:'column',gap:8}}>
{facWeekly.slice(0,20).map((w,idx)=>{const prev=facWeekly[idx+1];return<div key={w.id} style={{background:'rgba(255,255,255,.02)',borderRadius:12,padding:'14px 16px',border:'1px solid rgba(255,255,255,.04)'}}>
{/* هيدر */}
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
<span style={{fontSize:12,fontWeight:700,color:'var(--tx2)',direction:'ltr'}}>{w.week_date}</span>
<Badge v={nitaqatAr[w.nitaqat_color]||w.nitaqat_color||'—'}/>
{w.has_weekly_exemption&&<span style={{fontSize:8,fontWeight:700,color:C.gold,background:'rgba(201,168,76,.1)',padding:'2px 6px',borderRadius:4}}>{T('معفى','Exempt')}</span>}
<div style={{flex:1}}/>
<span style={{fontSize:10,fontWeight:700,color:w.saudization_percentage!=null&&w.saudization_percentage<20?C.red:C.ok}}>{w.saudization_percentage!=null?w.saudization_percentage+'%':''}</span>
</div>
{/* العمالة — 3 مجموعات */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:8}}>
{/* إجمالي */}
<div style={{padding:'8px 6px',borderRadius:7,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.03)'}}>
<div style={{fontSize:7,color:'var(--tx5)',marginBottom:4,textAlign:'center'}}>{T('إجمالي العمال','Total Workers')}</div>
<div style={{display:'flex',justifyContent:'space-around'}}>
{[[T('إجمالي','Total'),'total_workers','rgba(255,255,255,.6)'],[T('سعوديين','Saudi'),'saudi_workers',C.ok],[T('غير سعوديين','Non-Saudi'),'non_saudi_workers',C.blue]].map(([l,k,c],i)=>{const d=diff(w[k],prev,k);return<div key={i} style={{textAlign:'center'}}>
<div style={{fontSize:13,fontWeight:800,color:c,display:'flex',alignItems:'center',justifyContent:'center',gap:1}}>{d!=null&&diffIcon(d)}{w[k]??'—'}</div>
<div style={{fontSize:6,color:'var(--tx6)'}}>{l}</div>
</div>})}
</div>
</div>
{/* في نطاقات */}
<div style={{padding:'8px 6px',borderRadius:7,background:'rgba(201,168,76,.03)',border:'1px solid rgba(201,168,76,.06)'}}>
<div style={{fontSize:7,color:C.gold,opacity:.7,marginBottom:4,textAlign:'center'}}>{T('محسوبين في نطاقات','Counted in Nitaqat')}</div>
<div style={{display:'flex',justifyContent:'space-around'}}>
{[[T('إجمالي','Total'),'total_workers_in_nitaqat',C.gold],[T('سعوديين','Saudi'),'gosi_saudi_contributors',C.ok],[T('غير سعوديين','Non-Saudi'),'gosi_non_saudi_contributors',C.blue]].map(([l,k,c],i)=>{const d=diff(w[k],prev,k);return<div key={i} style={{textAlign:'center'}}>
<div style={{fontSize:13,fontWeight:800,color:c,display:'flex',alignItems:'center',justifyContent:'center',gap:1}}>{d!=null&&diffIcon(d)}{w[k]??'—'}</div>
<div style={{fontSize:6,color:'var(--tx6)'}}>{l}</div>
</div>})}
</div>
</div>
{/* التأمينات */}
<div style={{padding:'8px 6px',borderRadius:7,background:'rgba(52,131,180,.03)',border:'1px solid rgba(52,131,180,.06)'}}>
<div style={{fontSize:7,color:C.blue,opacity:.7,marginBottom:4,textAlign:'center'}}>{T('التأمينات الاجتماعية','Social Insurance')}</div>
<div style={{display:'flex',justifyContent:'space-around'}}>
{[[T('إجمالي','Total'),'gosi_total_contributors',C.blue],[T('نشيطين','Active'),'gosi_active_contributors',C.ok],[T('غير نشيطين','Inactive'),'gosi_non_active_contributors','#e67e22']].map(([l,k,c],i)=>{const d=diff(w[k],prev,k);return<div key={i} style={{textAlign:'center'}}>
<div style={{fontSize:13,fontWeight:800,color:c,display:'flex',alignItems:'center',justifyContent:'center',gap:1}}>{d!=null&&diffIcon(d)}{w[k]??'—'}</div>
<div style={{fontSize:6,color:'var(--tx6)'}}>{l}</div>
</div>})}
</div>
</div>
</div>
{/* التفاصيل — 6 أعمدة مدمجة */}
<div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:4}}>
{[[T('توثيق العقود','Contracts'),w.contract_auth_pct!=null?w.contract_auth_pct+'%':'—',pctClr(w.contract_auth_pct,80)],
[T('حماية الأجور','WPS'),w.wps_compliance_pct!=null?w.wps_compliance_pct+'%':'—',pctClr(w.wps_compliance_pct,80)],
[T('مدد','Mudad'),w.mudad_wps_compliance_pct!=null?w.mudad_wps_compliance_pct+'%':'—',pctClr(w.mudad_wps_compliance_pct,80)],
[T('مشتركين','GOSI'),w.gosi_total_contributors??'—','var(--tx3)'],
[T('مديونية','Debt'),w.gosi_total_debit??'—',w.gosi_total_debit>0?C.red:'var(--tx3)'],
[T('أجير','Ajeer'),w.ajeer_active_contracts??'—','var(--tx3)']
].map(([l,v,c],i)=><div key={i} style={{padding:'4px 6px',background:'rgba(255,255,255,.015)',borderRadius:5,border:'1px solid rgba(255,255,255,.02)',textAlign:'center'}}>
<div style={{fontSize:7,color:'var(--tx6)',marginBottom:1}}>{l}</div>
<div style={{fontSize:10,fontWeight:700,color:c}}>{v}</div>
</div>)}
</div>
</div>})}
</div>}
</div>})()}

{viewTab==='fsubs'&&(()=>{const activeSbs=facSubs.filter(s=>s.subscription_status==='active').length;const expiredSbs=facSubs.filter(s=>s.subscription_status==='expired'||(s.end_date&&new Date(s.end_date)<new Date())).length;const totalAmount=facSubs.reduce((sum,s)=>sum+Number(s.amount_paid||0),0);const subDateSt=(d)=>{if(!d)return null;const diff=Math.ceil((new Date(d)-new Date())/(86400000));return diff<0?'expired':diff<90?'warning':'ok'};const payLabel={'bank_transfer':T('تحويل بنكي','Bank Transfer'),'sadad':T('سداد','Sadad'),'credit_card':T('بطاقة ائتمان','Credit Card')};return<div style={{display:'flex',flexDirection:'column',gap:16}}>
{/* إحصائيات */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
{[[T('نشطة','Active'),activeSbs,C.ok],[T('منتهية','Expired'),expiredSbs,expiredSbs>0?C.red:'#555'],[T('إجمالي المبالغ','Total Paid'),nm(totalAmount)+' '+T('ر.س','SAR'),C.gold]].map(([l,v,c],i)=>
<div key={i} style={{background:c+'08',borderRadius:10,padding:'12px 10px',border:'1px solid '+c+'15',textAlign:'center'}}>
<div style={{fontSize:8,color:c,opacity:.7,marginBottom:4}}>{l}</div>
<div style={{fontSize:i===2?14:20,fontWeight:900,color:c,lineHeight:1}}>{v}</div>
</div>)}
</div>
{/* القائمة */}
{facSubs.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)',background:'rgba(255,255,255,.02)',borderRadius:10,border:'1px solid rgba(255,255,255,.03)'}}>{T('لا توجد اشتراكات','No subscriptions')}</div>:facSubs.map(s=>{const endSt=subDateSt(s.end_date);const remaining=s.end_date?Math.ceil((new Date(s.end_date)-new Date())/(86400000)):null;const stClr=endSt==='expired'?C.red:endSt==='warning'?'#e67e22':'var(--tx2)';return<div key={s.id} style={{background:'rgba(255,255,255,.02)',borderRadius:12,padding:'16px 18px',border:'1px solid '+(endSt==='expired'?'rgba(192,57,43,.15)':'rgba(255,255,255,.04)')}}>
{/* هيدر */}
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
<span style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>{s.subscription_type==='muqeem'?T('اشتراك مقيم','Muqeem'):T('اشتراك قوى','Qiwa')}</span>
<Badge v={{active:T('نشط','Active'),expired:T('منتهي','Expired'),pending:T('معلّق','Pending')}[s.subscription_status]||s.subscription_status}/>
{s.points_balance>0&&<span style={{fontSize:9,fontWeight:700,color:C.gold,background:'rgba(201,168,76,.08)',padding:'2px 8px',borderRadius:5,border:'1px solid rgba(201,168,76,.12)'}}>{s.points_balance} {T('نقطة','pts')}</span>}
</div>
{/* صف أول: البداية | الانتهاء | المتبقي */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:6}}>
<div style={{padding:'8px 10px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:7,color:'var(--tx5)',marginBottom:3}}>{T('تاريخ البداية','Start Date')}</div><div style={{fontSize:11,fontWeight:700,color:'var(--tx2)',direction:'ltr'}}>{s.start_date||'—'}</div></div>
<div style={{padding:'8px 10px',background:endSt==='expired'?'rgba(192,57,43,.04)':endSt==='warning'?'rgba(230,126,34,.04)':'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid '+(endSt==='expired'?'rgba(192,57,43,.1)':endSt==='warning'?'rgba(230,126,34,.1)':'rgba(255,255,255,.03)')}}><div style={{fontSize:7,color:stClr,marginBottom:3,display:'flex',alignItems:'center',gap:4}}>{T('تاريخ الانتهاء','End Date')}{endSt==='expired'&&<span style={{fontSize:7,fontWeight:700,color:C.red,background:'rgba(192,57,43,.1)',padding:'0 4px',borderRadius:3}}>{T('منتهي','Expired')}</span>}</div><div style={{fontSize:11,fontWeight:700,color:stClr,direction:'ltr'}}>{s.end_date||'—'}</div></div>
<div style={{padding:'8px 10px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:7,color:'var(--tx5)',marginBottom:3}}>{T('المتبقي','Remaining')}</div><div style={{fontSize:11,fontWeight:700,color:remaining!=null&&remaining<0?C.red:remaining!=null&&remaining<30?'#e67e22':C.ok}}>{remaining!=null?(remaining<0?T('منتهي','Expired'):remaining+' '+T('يوم','days')):'—'}</div></div>
</div>
{/* صف ثاني: المبلغ | طريقة الدفع */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
<div style={{padding:'8px 10px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:7,color:'var(--tx5)',marginBottom:3}}>{T('المبلغ المدفوع','Amount Paid')}</div><div style={{fontSize:11,fontWeight:700,color:'var(--tx2)'}}>{s.amount_paid?nm(s.amount_paid)+' '+T('ر.س','SAR'):'—'}</div></div>
<div style={{padding:'8px 10px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:7,color:'var(--tx5)',marginBottom:3}}>{T('طريقة الدفع','Payment Method')}</div><div style={{fontSize:11,fontWeight:700,color:'var(--tx2)'}}>{payLabel[s.payment_method]||'—'}</div></div>
</div>
</div>})}
</div>})()}

{viewTab==='fcreds'&&(()=>{const platNames={'qiwa':[T('قوى','Qiwa'),'Qiwa'],'gosi':[T('التأمينات الاجتماعية','Social Insurance'),'GOSI'],'chamber':[T('الغرفة التجارية','Chamber of Commerce'),'Chamber'],'mudad':[T('مدد','Mudad'),'Mudad'],'absher':[T('أبشر','Absher'),'Absher']};return<div style={{display:'flex',flexDirection:'column',gap:12}}>
<div style={{fontSize:11,fontWeight:700,color:'#9b59b6',display:'flex',alignItems:'center',gap:6}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b59b6" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2.5"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>{T('بيانات الدخول','Credentials')} ({facCreds.length})</div>
{facCreds.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)',background:'rgba(255,255,255,.02)',borderRadius:10,border:'1px solid rgba(255,255,255,.03)'}}>{T('لا توجد بيانات دخول','No credentials')}</div>:facCreds.map(c=>{const own=owners.find(o=>o.id===c.owner_id);const pn=platNames[c.credential_type]||[c.credential_type?.toUpperCase(),c.credential_type];return<div key={c.id} style={{background:'rgba(255,255,255,.02)',borderRadius:12,padding:'16px 18px',border:'1px solid rgba(255,255,255,.04)'}}>
{/* هيدر */}
<div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
<div style={{flex:1}}>
<div style={{display:'flex',alignItems:'center',gap:8}}>
<span style={{fontSize:14,fontWeight:700,color:'var(--tx)'}}>{pn[0]}</span>
<Badge v={{active:T('نشط','Active'),inactive:T('غير نشط','Inactive'),expired:T('منتهي','Expired')}[c.status]||c.status}/>
{c.platform_url&&<a href={c.platform_url} target="_blank" rel="noopener" onClick={e=>e.stopPropagation()} style={{width:22,height:22,borderRadius:6,background:'rgba(52,131,180,.08)',border:'1px solid rgba(52,131,180,.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}} title={T('فتح المنصة','Open Platform')}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>}
</div>
<div style={{fontSize:9,color:'var(--tx5)',marginTop:2}}>{pn[1]}{own&&<span> · {own.name_ar}</span>}</div>
</div>
</div>
{/* الحقول */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
<div style={{padding:'8px 10px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:7,color:'var(--tx5)',marginBottom:3}}>{T('اسم المستخدم','Username')}</div><div style={{display:'flex',alignItems:'center',gap:4}}><span style={{fontSize:11,fontWeight:700,color:'var(--tx2)',direction:'ltr'}}>{c.username||'—'}</span>{c.username&&<button onClick={e=>{e.stopPropagation();navigator.clipboard.writeText(c.username);toast(T('تم النسخ','Copied'))}} style={{width:16,height:16,borderRadius:3,border:'none',background:'rgba(255,255,255,.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,flexShrink:0}}><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>}</div></div>
<div style={{padding:'8px 10px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:7,color:'var(--tx5)',marginBottom:3}}>{T('الجوال المربوط','Linked Phone')}</div><div style={{fontSize:11,fontWeight:700,color:'var(--tx2)',direction:'ltr'}}>{c.phone_linked||'—'}</div></div>
<div style={{padding:'8px 10px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:7,color:'var(--tx5)',marginBottom:3}}>{T('آخر تحديث','Last Updated')}</div><div style={{fontSize:11,fontWeight:700,color:'var(--tx2)',direction:'ltr'}}>{c.updated_at?new Date(c.updated_at).toLocaleDateString('ar-SA'):'—'}</div></div>
</div>
</div>})}
</div>})()}

{viewTab==='fdocs'&&(()=>{const docSt=(d)=>{if(!d.file_url&&d.status==='no_file')return'no_file';if(d.expiry_date&&new Date(d.expiry_date)<new Date())return'expired';if(d.expiry_date&&new Date(d.expiry_date)<new Date(Date.now()+30*86400000))return'expiring';return'active'};const docsWithSt=facDocs.map(d=>({...d,_st:docSt(d)}));const activeD=docsWithSt.filter(d=>d._st==='active').length;const expiringD=docsWithSt.filter(d=>d._st==='expiring').length;const expiredD=docsWithSt.filter(d=>d._st==='expired').length;const filteredDocs=docFilter==='all'?docsWithSt:docsWithSt.filter(d=>d._st===docFilter);const catNames={'licenses':{l:T('التراخيص والسجلات','Licenses & Registrations'),c:C.gold,icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 7h8M8 11h6"/></svg>},'certificates':{l:T('الشهادات الحكومية','Gov. Certificates'),c:C.blue,icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>},'contracts':{l:T('العقود والتفويضات','Contracts & Authorizations'),c:'#9b59b6',icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b59b6" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>},'other':{l:T('مستندات أخرى','Other Documents'),c:'#1abc9c',icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1abc9c" strokeWidth="2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>}};const stLabel={'active':T('ساري','Valid'),'expiring':T('تنتهي قريباً','Expiring Soon'),'expired':T('منتهي','Expired'),'no_file':T('بدون ملف','No File')};const stClr={'active':C.ok,'expiring':'#e67e22','expired':C.red,'no_file':'#555'};const cats=['licenses','certificates','contracts','other'];return<div style={{display:'flex',flexDirection:'column',gap:16}}>
{/* إحصائيات */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8}}>
{[[T('الإجمالي','Total'),facDocs.length,C.gold],[T('سارية','Valid'),activeD,C.ok],[T('تنتهي قريباً','Expiring'),expiringD,expiringD>0?'#e67e22':'#555'],[T('منتهية','Expired'),expiredD,expiredD>0?C.red:'#555']].map(([l,v,c],i)=>
<div key={i} style={{background:c+'08',borderRadius:10,padding:'10px 8px',border:'1px solid '+c+'15',textAlign:'center'}}>
<div style={{fontSize:7,color:c,opacity:.7,marginBottom:4}}>{l}</div>
<div style={{fontSize:18,fontWeight:900,color:c,lineHeight:1}}>{v}</div>
</div>)}
</div>
{/* فلتر */}
<div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
{[['all',T('الكل','All')],['active',T('سارية','Valid')],['expiring',T('تنتهي قريباً','Expiring')],['expired',T('منتهية','Expired')],['no_file',T('بدون ملف','No File')]].map(([k,l])=><div key={k} onClick={()=>setDocFilter(k)} style={{padding:'5px 12px',borderRadius:8,fontSize:10,fontWeight:docFilter===k?700:500,color:docFilter===k?C.gold:'rgba(255,255,255,.4)',background:docFilter===k?'rgba(201,168,76,.08)':'transparent',border:docFilter===k?'1px solid rgba(201,168,76,.15)':'1px solid rgba(255,255,255,.06)',cursor:'pointer'}}>{l}</div>)}
</div>
{/* المستندات حسب الفئة */}
{filteredDocs.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)',background:'rgba(255,255,255,.02)',borderRadius:10,border:'1px solid rgba(255,255,255,.03)'}}>{T('لا توجد مستندات','No documents')}</div>:
cats.map(cat=>{const catDocs=filteredDocs.filter(d=>d.category===cat);if(!catDocs.length)return null;const cn=catNames[cat]||catNames.other;return<div key={cat}>
<div style={{fontSize:11,fontWeight:700,color:cn.c,marginBottom:8,display:'flex',alignItems:'center',gap:6}}>{cn.icon}{cn.l}</div>
<div style={{display:'flex',flexDirection:'column',gap:8}}>
{catDocs.map(d=><div key={d.id} style={{background:d._st==='no_file'?'transparent':'rgba(255,255,255,.02)',borderRadius:8,padding:d._st==='no_file'?'10px 14px':'10px 14px',border:d._st==='no_file'?'1.5px dashed rgba(255,255,255,.08)':'1px solid '+(d._st==='expired'?'rgba(192,57,43,.15)':d._st==='expiring'?'rgba(230,126,34,.1)':'rgba(255,255,255,.04)'),opacity:d._st==='no_file'?.7:1}}>
{d._st==='no_file'?<div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
<span style={{fontSize:11,fontWeight:600,color:'var(--tx4)'}}>{d.document_name}</span>
<label style={{fontSize:9,color:C.blue,background:'rgba(52,131,180,.08)',padding:'3px 10px',borderRadius:5,cursor:'pointer',border:'1px solid rgba(52,131,180,.12)'}}>{T('رفع ملف','Upload')}<input type="file" style={{display:'none'}} onChange={async e=>{const file=e.target.files?.[0];if(!file)return;const path='docs/'+viewRow.id+'/'+Date.now()+'.'+file.name.split('.').pop();const{error:upErr}=await sb.storage.from('documents').upload(path,file);if(upErr){toast(T('خطأ في الرفع','Upload error'));return}const{data:url}=sb.storage.from('documents').getPublicUrl(path);await sb.from('facility_documents').update({file_url:url.publicUrl,file_name:file.name,status:'active'}).eq('id',d.id);sb.from('facility_documents').select('*').eq('facility_id',viewRow.id).is('deleted_at',null).order('expiry_date').then(({data:dd})=>setFacDocs(dd||[]));toast(T('تم الرفع','Uploaded'))}}/></label>
</div>:<div style={{display:'flex',alignItems:'center',gap:10}}>
{d.file_url&&(()=>{const isImg=d.file_name&&/\.(png|jpg|jpeg|gif|webp)$/i.test(d.file_name);const isPdf=d.file_name&&/\.pdf$/i.test(d.file_name);return<a href={d.file_url} target="_blank" rel="noopener" onClick={e=>e.stopPropagation()} style={{width:80,height:50,borderRadius:8,border:'1px solid rgba(255,255,255,.08)',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,background:'rgba(255,255,255,.03)'}}>
{isImg?<img src={d.file_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:isPdf?<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15v-2h2a1 1 0 110 2H9z" fill="rgba(231,76,60,.2)"/></svg>:<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
</a>})()}
<div style={{flex:1,minWidth:0}}>
<div style={{display:'flex',alignItems:'center',gap:6}}>
<span style={{fontSize:11,fontWeight:700,color:'var(--tx)'}}>{d.document_name}</span>
<Badge v={stLabel[d._st]}/>
</div>
<div style={{display:'flex',gap:8,marginTop:2}}>
{d.reference_number&&<span style={{fontSize:8,color:'var(--tx5)',direction:'ltr'}}>{d.reference_number}</span>}
{d.expiry_date&&<span style={{fontSize:8,fontWeight:600,color:stClr[d._st],direction:'ltr'}}>{d.expiry_date}</span>}
{d.file_name&&<span style={{fontSize:8,color:'var(--tx6)'}}>{d.file_name}</span>}
</div>
</div>
{d.file_url&&<a href={d.file_url} target="_blank" rel="noopener" onClick={e=>e.stopPropagation()} style={{width:24,height:24,borderRadius:6,background:'rgba(52,131,180,.08)',border:'1px solid rgba(52,131,180,.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}} title={T('عرض','View')}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>}
</div>}
</div>)}
</div>
</div>}).filter(Boolean)}
</div>})()}

{viewTab==='fdebts'&&(()=>{const totalDebt=facDebts.filter(d=>d.status==='outstanding'||d.status==='scheduled').reduce((s,d)=>s+Number(d.amount||0),0);const pendingVio=facViolations.filter(v=>v.status==='pending').length;const paidVio=facViolations.filter(v=>v.status==='paid').length;const totalVioAmt=facViolations.reduce((s,v)=>s+Number(v.amount||0),0);const authNames={'gosi':T('التأمينات الاجتماعية','GOSI'),'zakat':T('الزكاة والدخل','Zakat & Income'),'labor_fees':T('رسوم العمالة','Labor Fees'),'municipality':T('البلدية','Municipality'),'labor':T('وزارة العمل','Labor Ministry'),'civil_defense':T('الدفاع المدني','Civil Defense'),'traffic':T('المرور','Traffic')};const debtStLabel={'outstanding':T('قائمة','Outstanding'),'paid':T('مسددة','Paid'),'scheduled':T('جدولة سداد','Scheduled')};const vioStLabel={'pending':T('معلقة','Pending'),'paid':T('مدفوعة','Paid'),'contested':T('معترض عليها','Contested'),'cancelled':T('ملغاة','Cancelled')};const filteredVio=violationFilter==='all'?facViolations:facViolations.filter(v=>v.status===violationFilter);return<div style={{display:'flex',flexDirection:'column',gap:16}}>
{/* إحصائيات */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8}}>
{[[T('إجمالي المديونيات','Total Debts'),totalDebt>0?nm(totalDebt)+' '+T('ر.س','SAR'):'0',totalDebt>0?C.red:'#555'],[T('مخالفات معلقة','Pending'),pendingVio,pendingVio>0?C.red:'#555'],[T('مخالفات مدفوعة','Paid'),paidVio,C.ok],[T('إجمالي المخالفات','Total Vio.'),nm(totalVioAmt)+' '+T('ر.س','SAR'),C.gold]].map(([l,v,c],i)=>
<div key={i} style={{background:c+'08',borderRadius:10,padding:'10px 8px',border:'1px solid '+c+'15',textAlign:'center'}}>
<div style={{fontSize:7,color:c,opacity:.7,marginBottom:4}}>{l}</div>
<div style={{fontSize:i===0||i===3?13:18,fontWeight:900,color:c,lineHeight:1}}>{v}</div>
</div>)}
</div>
{/* المديونيات */}
<div>
<div style={{fontSize:11,fontWeight:700,color:C.red,marginBottom:10,display:'flex',alignItems:'center',gap:6}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="3"/><line x1="2" y1="10" x2="22" y2="10"/></svg>{T('المديونيات','Debts')} ({facDebts.length})</div>
{facDebts.length===0?<div style={{textAlign:'center',padding:30,color:'var(--tx6)',background:'rgba(255,255,255,.02)',borderRadius:10,border:'1px solid rgba(255,255,255,.03)'}}>{T('لا توجد مديونيات','No debts')}</div>:
<div style={{display:'flex',flexDirection:'column',gap:8}}>
{facDebts.map(d=><div key={d.id} style={{background:'rgba(255,255,255,.02)',borderRadius:10,padding:'14px 16px',border:'1px solid '+(d.status==='outstanding'?'rgba(192,57,43,.12)':'rgba(255,255,255,.04)')}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
<span style={{fontSize:12,fontWeight:700,color:'var(--tx)'}}>{authNames[d.authority]||d.authority}</span>
<Badge v={debtStLabel[d.status]||d.status}/>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:d.notes?6:0}}>
<div style={{padding:'6px 10px',background:'rgba(255,255,255,.02)',borderRadius:7,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:7,color:'var(--tx5)',marginBottom:2}}>{T('المبلغ المستحق','Amount')}</div><div style={{fontSize:11,fontWeight:700,color:d.status==='outstanding'?C.red:'var(--tx2)'}}>{nm(d.amount)} {T('ر.س','SAR')}</div></div>
<div style={{padding:'6px 10px',background:'rgba(255,255,255,.02)',borderRadius:7,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:7,color:'var(--tx5)',marginBottom:2}}>{T('تاريخ الاستحقاق','Due Date')}</div><div style={{fontSize:11,fontWeight:700,color:'var(--tx2)',direction:'ltr'}}>{d.due_date||'—'}</div></div>
<div style={{padding:'6px 10px',background:'rgba(255,255,255,.02)',borderRadius:7,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:7,color:'var(--tx5)',marginBottom:2}}>{T('رقم المرجع','Reference')}</div><div style={{fontSize:11,fontWeight:700,color:'var(--tx2)',direction:'ltr'}}>{d.reference_number||'—'}</div></div>
</div>
{d.notes&&<div style={{padding:'6px 10px',background:'rgba(255,255,255,.015)',borderRadius:6,fontSize:10,color:'var(--tx4)'}}>{d.notes}</div>}
</div>)}
</div>}
</div>
{/* المخالفات */}
<div>
<div style={{fontSize:11,fontWeight:700,color:'#e67e22',marginBottom:10,display:'flex',alignItems:'center',gap:6}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e67e22" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{T('المخالفات','Violations')} ({facViolations.length})</div>
{/* فلتر */}
<div style={{display:'flex',gap:4,marginBottom:10,flexWrap:'wrap'}}>
{[['all',T('الكل','All')],['pending',T('معلقة','Pending')],['paid',T('مدفوعة','Paid')],['contested',T('معترض عليها','Contested')],['cancelled',T('ملغاة','Cancelled')]].map(([k,l])=><div key={k} onClick={()=>setViolationFilter(k)} style={{padding:'4px 10px',borderRadius:6,fontSize:9,fontWeight:violationFilter===k?700:500,color:violationFilter===k?C.gold:'rgba(255,255,255,.4)',background:violationFilter===k?'rgba(201,168,76,.08)':'transparent',border:violationFilter===k?'1px solid rgba(201,168,76,.15)':'1px solid rgba(255,255,255,.06)',cursor:'pointer'}}>{l}</div>)}
</div>
{filteredVio.length===0?<div style={{textAlign:'center',padding:30,color:'var(--tx6)',background:'rgba(255,255,255,.02)',borderRadius:10,border:'1px solid rgba(255,255,255,.03)'}}>{T('لا توجد مخالفات','No violations')}</div>:
<div style={{display:'flex',flexDirection:'column',gap:8}}>
{filteredVio.map(v=><div key={v.id} style={{background:'rgba(255,255,255,.02)',borderRadius:10,padding:'14px 16px',border:'1px solid '+(v.status==='pending'?'rgba(192,57,43,.12)':'rgba(255,255,255,.04)')}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
<span style={{fontSize:12,fontWeight:700,color:'var(--tx)'}}>{authNames[v.authority]||v.authority}</span>
<Badge v={vioStLabel[v.status]||v.status}/>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:v.description?6:0}}>
<div style={{padding:'6px 10px',background:'rgba(255,255,255,.02)',borderRadius:7,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:7,color:'var(--tx5)',marginBottom:2}}>{T('رقم المخالفة','Violation No.')}</div><div style={{fontSize:11,fontWeight:700,color:'var(--tx2)',direction:'ltr'}}>{v.violation_number||'—'}</div></div>
<div style={{padding:'6px 10px',background:'rgba(255,255,255,.02)',borderRadius:7,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:7,color:'var(--tx5)',marginBottom:2}}>{T('المبلغ','Amount')}</div><div style={{fontSize:11,fontWeight:700,color:v.status==='pending'?C.red:'var(--tx2)'}}>{nm(v.amount)} {T('ر.س','SAR')}</div></div>
<div style={{padding:'6px 10px',background:'rgba(255,255,255,.02)',borderRadius:7,border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:7,color:'var(--tx5)',marginBottom:2}}>{T('تاريخ المخالفة','Violation Date')}</div><div style={{fontSize:11,fontWeight:700,color:'var(--tx2)',direction:'ltr'}}>{v.violation_date||'—'}</div></div>
</div>
<div style={{display:'grid',gridTemplateColumns:v.payment_date?'1fr 1fr':'1fr',gap:6}}>
{v.description&&<div style={{padding:'6px 10px',background:'rgba(255,255,255,.015)',borderRadius:6,fontSize:10,color:'var(--tx4)'}}>{v.description}</div>}
{v.payment_date&&<div style={{padding:'6px 10px',background:'rgba(39,160,70,.04)',borderRadius:6,border:'1px solid rgba(39,160,70,.08)'}}><div style={{fontSize:7,color:C.ok,marginBottom:2}}>{T('تاريخ السداد','Payment Date')}</div><div style={{fontSize:10,fontWeight:700,color:C.ok,direction:'ltr'}}>{v.payment_date}</div></div>}
</div>
</div>)}
</div>}
</div>
</div>})()}

</div></div></div></div>})()}

{/* ═══ ADD/EDIT FACILITY — Side-tab modal matching view layout ═══ */}
{wizard&&<div onClick={()=>setWizard(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.8)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(920px,95vw)',height:'85vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.5)',border:'1px solid rgba(201,168,76,.15)'}}>
{/* Header */}
<div style={{background:'var(--bg)',padding:'16px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(201,168,76,.12)',flexShrink:0}}>
<div style={{display:'flex',alignItems:'center',gap:12}}>
<div style={{width:44,height:44,borderRadius:12,background:'linear-gradient(135deg,rgba(201,168,76,.15),rgba(201,168,76,.05))',border:'1.5px solid rgba(201,168,76,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:900,color:C.gold}}>{wizard.editId?'✎':'+'}</div>
<div><div style={{fontSize:17,fontWeight:800,color:'var(--tx)'}}>{wizard.editId?T('تعديل منشأة','Edit Facility'):T('إضافة منشأة جديدة','Add New Facility')}</div>
<div style={{fontSize:10,color:'var(--tx5)',marginTop:2}}>{T('تعبئة جميع بيانات المنشأة','Fill in all facility details')}</div></div>
</div>
<div style={{display:'flex',gap:6}}>
<button onClick={saveWizard} disabled={saving} style={{...bS,height:36,minWidth:100,opacity:saving?.6:1}}>{saving?'...':wizard.editId?T('حفظ','Save'):T('إضافة','Add')}</button>
<button onClick={()=>setWizard(null)} style={{width:32,height:32,borderRadius:8,background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
</div></div>
{/* Body: Side tabs + Form */}
<div style={{display:'flex',flex:1,overflow:'hidden'}}>
{/* Side tabs */}
<div style={{width:170,background:'rgba(255,255,255,.015)',borderLeft:isAr?'1px solid rgba(255,255,255,.04)':'none',borderRight:!isAr?'1px solid rgba(255,255,255,.04)':'none',padding:'12px 0',flexShrink:0,overflowY:'auto'}}>
{wizardSteps.map((s,i)=>{const active=wizard.step===i;return<div key={i} onClick={()=>setWizard(p=>({...p,step:i}))} style={{padding:'10px 16px',fontSize:11,fontWeight:active?700:500,color:active?C.gold:'rgba(255,255,255,.4)',background:active?'rgba(201,168,76,.06)':'transparent',borderRight:isAr&&active?'3px solid '+C.gold:'3px solid transparent',borderLeft:!isAr&&active?'3px solid '+C.gold:'3px solid transparent',cursor:'pointer',transition:'.15s'}}>{s.title}</div>})}
</div>
{/* Form content */}
<div style={{flex:1,overflowY:'auto',padding:'24px 28px'}}>
<div style={{fontSize:13,fontWeight:700,color:C.gold,marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
<span style={{width:24,height:24,borderRadius:6,background:'rgba(201,168,76,.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:C.gold}}>{wizard.step+1}</span>
{wizardSteps[wizard.step].title}
</div>

{/* Custom owner step */}
{wizardSteps[wizard.step].custom==='owner'?<div>

{/* ═══ Partners list ═══ */}
{wizPartners.length>0&&<div style={{marginBottom:20}}>
<div style={{fontSize:11,fontWeight:700,color:C.gold,marginBottom:10}}>{T('الملّاك والشركاء المضافون','Added Owners & Partners')} ({wizPartners.length})</div>
{wizPartners.map((p,i)=><div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:'rgba(255,255,255,.025)',borderRadius:10,border:'1px solid rgba(255,255,255,.05)',marginBottom:6}}>
<div style={{width:36,height:36,borderRadius:10,background:p.partner_type==='person'?'rgba(201,168,76,.1)':'rgba(52,131,180,.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{p.partner_type==='person'?'👤':'🏢'}</div>
<div style={{flex:1}}>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>{p.name}{p.is_manager&&<span style={{fontSize:9,padding:'2px 8px',borderRadius:5,background:'rgba(201,168,76,.1)',color:C.gold,marginRight:8}}>{T('مدير','Manager')}</span>}</div>
<div style={{fontSize:10,color:'var(--tx5)'}}>{p.partner_type==='person'?T('شخص','Person'):T('منشأة','Facility')} · {p.percentage||0}%</div>
</div>
<button onClick={()=>setWizPartners(prev=>prev.filter((_,j)=>j!==i))} style={{width:28,height:28,borderRadius:7,border:'1px solid rgba(192,57,43,.15)',background:'rgba(192,57,43,.04)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:C.red,fontSize:14}}>✕</button>
</div>)}
</div>}

{/* ═══ Add partner form ═══ */}
{!partnerAdd?<div>
{/* Main owner selection */}
<div style={{fontSize:11,fontWeight:600,color:'var(--tx4)',marginBottom:8}}>{T('المالك الرئيسي','Main Owner')} <span style={{color:C.red}}>*</span></div>
<div style={{display:'flex',gap:0,marginBottom:14,borderRadius:10,overflow:'hidden',border:'1.5px solid rgba(201,168,76,.2)'}}>
{[{v:'existing',l:T('مالك موجود','Existing Owner'),ic:'👤'},{v:'new',l:T('مالك جديد','New Owner'),ic:'＋'}].map(o=><button key={o.v} onClick={()=>setOwnerMode(o.v)} style={{flex:1,height:40,border:'none',background:ownerMode===o.v?'rgba(201,168,76,.12)':'rgba(255,255,255,.02)',color:ownerMode===o.v?C.gold:'var(--tx5)',fontFamily:F,fontSize:12,fontWeight:ownerMode===o.v?700:500,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5,transition:'.2s'}}>{o.ic} {o.l}</button>)}
</div>

{ownerMode==='existing'?<div>
<CustomSelect value={WZ.owner_id||''} options={owners.map(o=>({v:o.id,l:o.name_ar+(o.id_number?' — '+o.id_number:'')}))} onChange={v=>setWZ('owner_id',v)} isAr={isAr} placeholder={T('ابحث عن مالك...','Search owner...')}/>
{WZ.owner_id&&(()=>{const ow=owners.find(o=>o.id===WZ.owner_id);return ow?<div style={{marginTop:12,padding:'14px 16px',borderRadius:10,background:'rgba(201,168,76,.04)',border:'1px solid rgba(201,168,76,.1)'}}>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx)',marginBottom:6}}>{ow.name_ar}</div>
<div style={{display:'flex',gap:12,fontSize:10,color:'var(--tx4)',flexWrap:'wrap'}}>
{ow.id_number&&<span>{T('الهوية:','ID:')} {ow.id_number}</span>}
{ow.nationality&&<span>{T('الجنسية:','Nat:')} {ow.nationality}</span>}
{ow.mobile_personal&&<span style={{direction:'ltr'}}>{ow.mobile_personal}</span>}
</div></div>:null})()}
</div>:
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
{[
{k:'name_ar',l:T('الاسم بالعربي','Name (AR)'),r:1},{k:'name_en',l:T('بالإنجليزي','Name (EN)'),d:1},
{k:'id_type',l:T('نوع الهوية','ID Type'),opts:[{v:'national_id',l:T('هوية وطنية','National ID')},{v:'iqama',l:T('إقامة','Iqama')},{v:'gcc_id',l:T('خليجية','GCC')},{v:'passport',l:T('جواز','Passport')}],r:1},
{k:'id_number',l:T('رقم الهوية','ID No.'),d:1,r:1},{k:'nationality',l:T('الجنسية','Nationality'),r:1},
{k:'gender',l:T('الجنس','Gender'),opts:[{v:'male',l:T('ذكر','Male')},{v:'female',l:T('أنثى','Female')}],r:1},
{k:'mobile_personal',l:T('الجوال','Phone'),d:1},{k:'email',l:T('البريد','Email'),d:1},
{k:'date_of_birth',l:T('تاريخ الميلاد','Birth Date'),t:'date'}
].map(f=><FieldInput key={f.k} f={f} form={newOwner} setForm={setNewOwner} isAr={isAr}/>)}
</div>}

{/* Add partner button */}
<div style={{marginTop:20,paddingTop:16,borderTop:'1px solid rgba(255,255,255,.06)'}}>
<button onClick={()=>setPartnerAdd({partner_type:'person',owner_id:'',facility_id:'',percentage:'',is_manager:false,name:''})} style={{width:'100%',height:42,borderRadius:10,border:'1.5px dashed rgba(52,131,180,.3)',background:'rgba(52,131,180,.04)',color:C.blue,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>+ {T('إضافة شريك','Add Partner')}</button>
</div>
</div>:

/* ═══ Partner add form ═══ */
<div style={{padding:'18px',background:'rgba(52,131,180,.03)',borderRadius:12,border:'1px solid rgba(52,131,180,.12)'}}>
<div style={{fontSize:13,fontWeight:700,color:C.blue,marginBottom:14,display:'flex',alignItems:'center',gap:6}}>{T('إضافة شريك','Add Partner')}</div>

<div style={{display:'flex',gap:0,marginBottom:14,borderRadius:10,overflow:'hidden',border:'1.5px solid rgba(52,131,180,.2)'}}>
{[{v:'person',l:T('شخص','Person'),ic:'👤'},{v:'facility',l:T('منشأة','Facility'),ic:'🏢'}].map(o=><button key={o.v} onClick={()=>setPartnerAdd(p=>({...p,partner_type:o.v}))} style={{flex:1,height:40,border:'none',background:partnerAdd.partner_type===o.v?'rgba(52,131,180,.12)':'rgba(255,255,255,.02)',color:partnerAdd.partner_type===o.v?C.blue:'var(--tx5)',fontFamily:F,fontSize:12,fontWeight:partnerAdd.partner_type===o.v?700:500,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>{o.ic} {o.l}</button>)}
</div>

<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
{partnerAdd.partner_type==='person'?
<div style={{gridColumn:'1/-1'}}><div style={{fontSize:11,fontWeight:600,color:'var(--tx4)',marginBottom:6}}>{T('اختر المالك','Select Owner')}</div>
<CustomSelect value={partnerAdd.owner_id} options={owners.map(o=>({v:o.id,l:o.name_ar+(o.id_number?' — '+o.id_number:'')}))} onChange={v=>{const ow=owners.find(o=>o.id===v);setPartnerAdd(p=>({...p,owner_id:v,name:ow?.name_ar||''}))}} isAr={isAr}/></div>:
<div style={{gridColumn:'1/-1'}}><div style={{fontSize:11,fontWeight:600,color:'var(--tx4)',marginBottom:6}}>{T('اختر المنشأة','Select Facility')}</div>
<CustomSelect value={partnerAdd.facility_id} options={data.map(f=>({v:f.id,l:f.name_ar+(f.cr_number?' — '+f.cr_number:'')}))} onChange={v=>{const fc=data.find(f=>f.id===v);setPartnerAdd(p=>({...p,facility_id:v,name:fc?.name_ar||''}))}} isAr={isAr}/></div>}
<div><div style={{fontSize:11,fontWeight:600,color:'var(--tx4)',marginBottom:6}}>{T('نسبة الملكية %','Ownership %')}</div>
<input value={partnerAdd.percentage||''} onChange={e=>setPartnerAdd(p=>({...p,percentage:e.target.value}))} type="number" min="0" max="100" style={{...fieldStyle,direction:'ltr',textAlign:'center'}}/></div>
<div><div style={{fontSize:11,fontWeight:600,color:'var(--tx4)',marginBottom:6}}>{T('مدير المنشأة','Facility Manager')}</div>
<div style={{display:'flex',gap:8}}>{[{v:true,l:T('نعم','Yes'),c:C.ok},{v:false,l:T('لا','No'),c:C.red}].map(o=><button key={String(o.v)} onClick={()=>setPartnerAdd(p=>({...p,is_manager:o.v}))} style={{flex:1,height:42,borderRadius:10,border:'1.5px solid '+(partnerAdd.is_manager===o.v?o.c+'40':'rgba(255,255,255,.08)'),background:partnerAdd.is_manager===o.v?o.c+'12':'rgba(255,255,255,.03)',color:partnerAdd.is_manager===o.v?o.c:'var(--tx5)',fontFamily:F,fontSize:12,fontWeight:partnerAdd.is_manager===o.v?700:500,cursor:'pointer'}}>{o.l}</button>)}</div></div>
</div>

<div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
<button onClick={()=>setPartnerAdd(null)} style={{height:36,padding:'0 16px',borderRadius:8,border:'1px solid rgba(255,255,255,.1)',background:'transparent',color:'var(--tx4)',fontFamily:F,fontSize:11,fontWeight:600,cursor:'pointer'}}>{T('إلغاء','Cancel')}</button>
<button onClick={()=>{if(!partnerAdd.name&&!partnerAdd.owner_id&&!partnerAdd.facility_id)return;setWizPartners(prev=>[...prev,{...partnerAdd}]);setPartnerAdd(null)}} style={{height:36,padding:'0 16px',borderRadius:8,border:'1px solid rgba(52,131,180,.2)',background:'rgba(52,131,180,.1)',color:C.blue,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer'}}>{T('إضافة','Add')}</button>
</div>
</div>}

</div>:

<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
{(wizardSteps[wizard.step].fields||[]).map(f=><FieldInput key={f.k} f={f} form={WZ} setForm={v=>setWizard(p=>({...p,data:{...p.data,...(typeof v==='function'?v(p.data):v)}}))} isAr={isAr}/>)}
</div>}
</div>
</div>
</div></div>}

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
