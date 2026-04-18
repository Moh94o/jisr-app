import React,{useState,useEffect,useCallback} from 'react'
const F="'Cairo',sans-serif"
const C={dk:'#171717',fm:'#1e1e1e',gold:'#D4A017',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}

// ═══ Components OUTSIDE main function (prevents re-creation) ═══
const fS={width:'100%',height:42,padding:'0 14px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:F,fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',background:'rgba(255,255,255,.07)',textAlign:'center'}
const bS={height:36,padding:'0 16px',borderRadius:8,border:'1px solid rgba(212,160,23,.2)',background:'rgba(212,160,23,.12)',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5}

const ArrowIcon=({isOpen})=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{transition:'.2s',transform:isOpen?'rotate(90deg)':'none',opacity:.7,flexShrink:0}}><polyline points="9 18 15 12 9 6"/></svg>

const EditIcon=()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>

const DelIcon=()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>

const EditBtn=({onClick})=><button onClick={e=>{e.stopPropagation();onClick()}} style={{width:28,height:28,borderRadius:7,border:'1px solid rgba(212,160,23,.15)',background:'rgba(212,160,23,.08)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><EditIcon/></button>

const DelBtn=({onClick})=><button onClick={e=>{e.stopPropagation();onClick()}} style={{width:28,height:28,borderRadius:7,border:'1px solid rgba(192,57,43,.12)',background:'rgba(192,57,43,.04)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><DelIcon/></button>

const BadgeStatus=({v,isAr})=><span style={{fontSize:10,fontWeight:600,padding:'3px 8px',borderRadius:6,background:v?'rgba(39,160,70,.1)':'rgba(255,255,255,.05)',color:v?C.ok:'rgba(255,255,255,.3)'}}>{v?(isAr?'نشطة':'Active'):(isAr?'معطّلة':'Inactive')}</span>

const MetaText=({t})=><span style={{fontSize:10,color:'var(--tx5)',direction:'ltr'}}>{t}</span>

// ═══ Delete Confirmation Popup ═══
function DeletePopup({isAr,onConfirm,onCancel,itemName}){
return<div onClick={onCancel} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.8)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1001,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:420,overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.5)',border:'1px solid rgba(192,57,43,.15)'}}>
<div style={{height:3,background:'linear-gradient(90deg,transparent,'+C.red+' 30%,#e74c3c 50%,'+C.red+' 70%,transparent)'}}/>
<div style={{padding:'28px 24px',textAlign:'center'}}>
<div style={{width:56,height:56,borderRadius:'50%',background:'rgba(192,57,43,.08)',border:'2px solid rgba(192,57,43,.15)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
</div>
<div style={{fontSize:16,fontWeight:700,color:C.red,marginBottom:8}}>{isAr?'تأكيد الحذف':'Confirm Delete'}</div>
<div style={{fontSize:13,color:'var(--tx3)',lineHeight:1.8,marginBottom:4}}>{isAr?'هل أنت متأكد من حذف':'Are you sure you want to delete'}</div>
{itemName&&<div style={{fontSize:14,fontWeight:700,color:'var(--tx2)',marginBottom:4}}>"{itemName}"</div>}
<div style={{fontSize:11,color:'var(--tx5)',marginBottom:20}}>{isAr?'هذا الإجراء لا يمكن التراجع عنه':'This action cannot be undone'}</div>
<div style={{display:'flex',gap:10,justifyContent:'center'}}>
<button onClick={onConfirm} style={{height:42,padding:'0 24px',borderRadius:10,border:'none',background:C.red,color:'#fff',fontFamily:F,fontSize:13,fontWeight:700,cursor:'pointer',flex:1}}>{isAr?'نعم، احذف':'Yes, Delete'}</button>
<button onClick={onCancel} style={{height:42,padding:'0 24px',borderRadius:10,border:'1.5px solid rgba(255,255,255,.1)',background:'transparent',color:'var(--tx3)',fontFamily:F,fontSize:13,fontWeight:600,cursor:'pointer',flex:1}}>{isAr?'إلغاء':'Cancel'}</button>
</div></div></div></div>}

// ═══ Custom Select Dropdown ═══
function CustomSelect({value,onChange,options,placeholder,style:sx}){
const[open,setOpen]=useState(false)
const ref=React.useRef(null)
const[pos,setPos]=useState({top:0,left:0,width:0})
const selected=options.find(o=>String(o.v)===String(value))
React.useEffect(()=>{if(!open)return;const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h)},[open])
const handleOpen=()=>{if(ref.current){const r=ref.current.getBoundingClientRect();setPos({top:r.bottom+4,left:r.left,width:r.width})};setOpen(!open)}
return<div ref={ref} style={{position:'relative',...sx}}>
<div onClick={handleOpen} style={{...fS,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',background:open?'rgba(255,255,255,.1)':'rgba(255,255,255,.07)',borderColor:open?'rgba(212,160,23,.35)':'rgba(255,255,255,.12)'}}>
<span style={{color:selected?'rgba(255,255,255,.95)':'rgba(255,255,255,.3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,textAlign:'center'}}>{selected?selected.l:placeholder||'— اختر —'}</span>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,transition:'.2s',transform:open?'rotate(180deg)':'none'}}><polyline points="6 9 12 15 18 9"/></svg>
</div>
{open&&<div style={{position:'fixed',top:pos.top,left:pos.left,width:pos.width,background:'#252525',border:'1px solid rgba(255,255,255,.15)',borderRadius:10,overflow:'hidden',zIndex:9999,maxHeight:200,overflowY:'auto',boxShadow:'0 12px 32px rgba(0,0,0,.6)'}}>
{options.map(o=><div key={o.v} onClick={()=>{onChange(String(o.v));setOpen(false)}} style={{padding:'10px 14px',fontSize:13,fontWeight:String(o.v)===String(value)?700:500,color:String(o.v)===String(value)?C.gold:'rgba(255,255,255,.8)',background:String(o.v)===String(value)?'rgba(212,160,23,.08)':'transparent',cursor:'pointer',borderBottom:'1px solid var(--bd2)',textAlign:'center',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>{o.l}{String(o.v)===String(value)&&<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}</div>)}
</div>}
</div>}

// ═══ Form Popup — defined outside to prevent focus loss ═══
function FormPopup({title,fields,form,setForm,onSave,onClose,saving,isAr}){
return<div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:520,maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.4)',border:'1px solid var(--bd)'}}>
<div style={{height:3,background:'linear-gradient(90deg,transparent,'+C.gold+' 30%,#dcc06e 50%,'+C.gold+' 70%,transparent)',flexShrink:0}}/>
<div style={{background:'var(--bg)',padding:'16px 22px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
<div style={{fontSize:15,fontWeight:700,color:'var(--tx)'}}>{title}</div>
<button onClick={onClose} style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
</div>
<div style={{flex:1,overflowY:'auto',padding:'18px 22px'}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
{fields.map(f=><div key={f.k} style={{gridColumn:f.w?'1/-1':undefined}}>
<div style={{fontSize:12,fontWeight:600,color:'var(--tx3)',marginBottom:5}}>{f.l}{f.r&&<span style={{color:C.red}}> *</span>}</div>
{f.opts?<CustomSelect value={form[f.k]||''} onChange={v=>setForm(p=>({...p,[f.k]:v}))} options={f.opts} placeholder={isAr?'— اختر —':'— Select —'}/>:
f.w?<textarea value={form[f.k]||''} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} rows={2} style={{...fS,height:'auto',padding:12,resize:'vertical'}}/>:
<input value={form[f.k]||''} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} style={fS}/>}
</div>)}
</div></div>
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',flexDirection:'row-reverse',flexShrink:0}}>
<button onClick={onSave} disabled={saving} style={{...bS,height:42,minWidth:130,opacity:saving?.6:1}}>{saving?'...':(form._id?(isAr?'حفظ':'Save'):(isAr?'إضافة':'Add'))}</button>
<button onClick={onClose} style={{height:42,padding:'0 18px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer'}}>{isAr?'إلغاء':'Cancel'}</button>
</div></div></div>}

// ═══ Main Component ═══
export default function SettingsPage({sb,toast,user,lang,onTabChange}){
const isAr=lang!=='en'
const[tab,setTab]=useState('general')
const[sData,setSData]=useState([]);const[sLoading,setSLoading]=useState(true)
const[regions,setRegions]=useState([]);const[cities,setCities]=useState([]);const[districtsList,setDistrictsList]=useState([])
const[authoritiesList,setAuthoritiesList]=useState([]);const[municipalitiesList,setMunicipalitiesList]=useState([])
const[countries,setCountries]=useState([]);const[embassies,setEmbassies]=useState([])
const[lLists,setLLists]=useState([]);const[lItems,setLItems]=useState([])
const[docs,setDocs]=useState([])
const[loading,setLoading]=useState(false)
const[q,setQ]=useState('');const[pop,setPop]=useState(null)
const[form,setForm]=useState({});const[saving,setSaving]=useState(false)
const[listFilter,setListFilter]=useState('')
const[open,setOpen]=useState({})
const[delTarget,setDelTarget]=useState(null)
const[subSvcs,setSubSvcs]=useState([])
const[subSteps,setSubSteps]=useState([])
const[tplts,setTplts]=useState([])
const[tplLinks,setTplLinks]=useState([])
const[instPlans,setInstPlans]=useState([])
const[msList,setMsList]=useState([])
const[svcSubTab,setSvcSubTab]=useState('services');const[stepFieldCounts,setStepFieldCounts]=useState({});const[txnCounts,setTxnCounts]=useState({});const[svcCatFilter,setSvcCatFilter]=useState('all')

const toggle=id=>setOpen(p=>({...p,[id]:!p[id]}))
useEffect(()=>{onTabChange&&onTabChange({tab,svcSubTab})},[tab,svcSubTab,onTabChange])

const loadAll=useCallback(async()=>{
setLoading(true)
const[s,rg,ct,co,em,ll,li,dc,sv,ss,tp,tl,di,au,mn]=await Promise.all([
sb.from('system_settings').select('*').order('category').order('setting_key'),
sb.from('regions').select('*').order('sort_order').order('name_ar'),
sb.from('cities').select('*').order('sort_order').order('name_ar'),
sb.from('countries').select('*').order('sort_order').order('name_ar'),
sb.from('embassies_consulates').select('*').order('sort_order').order('city_ar'),
sb.from('lookup_categories').select('*').order('sort_order').order('name_ar'),
sb.from('lookup_items').select('*').order('sort_order'),
sb.from('documents').select('*').is('deleted_at',null).order('created_at',{ascending:false}).limit(200),
sb.from('sub_services').select('*').order('sort_order').order('name_ar'),
sb.from('sub_service_steps').select('*').order('step_order'),
sb.from('transaction_templates').select('*').order('sort_order').order('name_ar'),
sb.from('template_sub_services').select('*').order('step_order'),
sb.from('districts').select('*').order('sort_order').order('name_ar'),
sb.from('authorities').select('*').order('sort_order').order('name_ar'),
sb.from('municipalities').select('*').order('sort_order').order('name_ar')
])
setSData(s.data||[]);setSLoading(false);setRegions(rg.data||[]);setCities(ct.data||[]);setDistrictsList(di.data||[]);setAuthoritiesList(au.data||[]);setMunicipalitiesList(mn.data||[])
setCountries(co.data||[]);setEmbassies(em.data||[])
setLLists(ll.data||[]);setLItems(li.data||[]);setDocs(dc.data||[]);setSubSvcs(sv.data||[]);setSubSteps(ss.data||[]);setTplts(tp.data||[]);setTplLinks(tl.data||[])
// Load step_fields counts per step and txn counts per service
sb.from('step_fields').select('step_id').then(({data:sfData})=>{const counts={};(sfData||[]).forEach(f=>{counts[f.step_id]=(counts[f.step_id]||0)+1});setStepFieldCounts(counts)})
sb.from('transactions').select('service_id').is('deleted_at',null).then(({data:txData})=>{const counts={};(txData||[]).forEach(t=>{if(t.service_id)counts[t.service_id]=(counts[t.service_id]||0)+1});setTxnCounts(counts)})
sb.from('service_installment_plans').select('*').order('installment_order').then(({data})=>setInstPlans(data||[]))
sb.from('service_type_milestones').select('*').eq('is_active',true).order('sort_order').then(({data})=>setMsList(data||[]))
setLoading(false)
},[sb])
useEffect(()=>{loadAll()},[loadAll])

const saveSetting=async(key,val)=>{const{error}=await sb.from('system_settings').update({setting_value:val,updated_at:new Date().toISOString()}).eq('setting_key',key);if(error)toast('خطأ');else toast(isAr?'تم الحفظ':'Saved')}
const saveForm=async()=>{setSaving(true);try{const t=form._table;const id=form._id;const d={...form};delete d._table;delete d._id;Object.keys(d).forEach(k=>{if(d[k]==='')d[k]=null})
if(d.is_active!==undefined&&d.is_active!==null)d.is_active=d.is_active==='true'
if(d.is_system!==undefined&&d.is_system!==null)d.is_system=d.is_system==='true'
if(d.is_conditional!==undefined&&d.is_conditional!==null)d.is_conditional=d.is_conditional==='true'
if(id){const{error}=await sb.from(t).update(d).eq('id',id);if(error)throw error;toast(isAr?'تم التعديل':'Updated')}
else{if(['documents'].includes(t))d.created_by=user?.id;const{error}=await sb.from(t).insert(d);if(error)throw error;toast(isAr?'تمت الإضافة':'Added')}
setPop(null);loadAll()}catch(e){toast('خطأ: '+e.message?.slice(0,80))}setSaving(false)}
const confirmDel=async()=>{if(!delTarget)return;const{table,id}=delTarget
if(table==='documents'){await sb.from(table).update({deleted_at:new Date().toISOString()}).eq('id',id)}
else{await sb.from(table).delete().eq('id',id)}
toast(isAr?'تم الحذف':'Deleted');setDelTarget(null);loadAll()}
const askDel=(table,id,name)=>setDelTarget({table,id,name})

const getRef=(val,list,ak='name_ar',ek='name_en')=>{if(!val)return'—';const r=list.find(x=>x.id===val);return r?(isAr?r[ak]:r[ek]||r[ak]):'—'}

const secS={display:'flex',alignItems:'center',gap:8,padding:'10px 0',fontSize:13,fontWeight:700,color:'rgba(255,255,255,.6)'}
const cardS={background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:14,overflow:'hidden'}
const parentRow={display:'flex',alignItems:'center',gap:10,padding:'12px 16px',cursor:'pointer',borderBottom:'1px solid var(--bd2)',transition:'.1s'}
const childRow={display:'flex',alignItems:'center',gap:10,padding:'9px 16px 9px 42px',borderBottom:'1px solid rgba(255,255,255,.02)',background:'rgba(255,255,255,.015)'}

const tabs=[
{id:'general',l:'الإعدادات العامة',le:'General'},
{id:'services',l:'الخدمات والمعاملات',le:'Services & Transactions'},
{id:'categories',l:'الخانات والعناصر',le:'Categories & Items'},
{id:'countries_nat',l:'الدول والجنسيات والسفارات',le:'Countries & Embassies'},
{id:'regions_cities',l:'المناطق والمدن',le:'Regions & Cities'},
{id:'authorities_muni',l:'الأمانات والبلديات',le:'Authorities & Municipalities'},
{id:'documents',l:'الوثائق',le:'Documents'},
]

const popFields={
r:[{k:'name_ar',l:isAr?'الاسم بالعربي':'Name (Arabic)',r:1},{k:'name_en',l:isAr?'الاسم بالإنجليزي':'Name (English)',d:1},{k:'code',l:isAr?'الرمز':'Code',d:1},{k:'sort_order',l:isAr?'الترتيب':'Sort',d:1},{k:'is_active',l:isAr?'الحالة':'Status',opts:[{v:'true',l:isAr?'نشطة':'Active'},{v:'false',l:isAr?'معطّلة':'Inactive'}]}],
c:[{k:'name_ar',l:isAr?'الاسم بالعربي':'Name (Arabic)',r:1},{k:'name_en',l:isAr?'الاسم بالإنجليزي':'Name (English)',d:1},{k:'code',l:isAr?'الرمز':'Code',d:1},{k:'sort_order',l:isAr?'الترتيب':'Sort',d:1},{k:'is_active',l:isAr?'الحالة':'Status',opts:[{v:'true',l:isAr?'نشطة':'Active'},{v:'false',l:isAr?'معطّلة':'Inactive'}]}],
co:[{k:'name_ar',l:isAr?'اسم الدولة بالعربي':'Country (Arabic)',r:1},{k:'name_en',l:isAr?'اسم الدولة بالإنجليزي':'Country (English)',d:1},{k:'nationality_ar',l:isAr?'الجنسية بالعربي':'Nationality (Arabic)'},{k:'nationality_en',l:isAr?'الجنسية بالإنجليزي':'Nationality (English)',d:1},{k:'code',l:isAr?'كود الدولة':'Code',d:1},{k:'flag_emoji',l:isAr?'العلم':'Flag',d:1},{k:'sort_order',l:isAr?'الترتيب':'Sort',d:1},{k:'is_active',l:isAr?'الحالة':'Status',opts:[{v:'true',l:isAr?'نشطة':'Active'},{v:'false',l:isAr?'معطّلة':'Inactive'}]}],
em:[{k:'city_ar',l:isAr?'المدينة بالعربي':'City (Arabic)',r:1},{k:'city_en',l:isAr?'المدينة بالإنجليزي':'City (English)',d:1},{k:'sort_order',l:isAr?'الترتيب':'Sort',d:1},{k:'is_active',l:isAr?'الحالة':'Status',opts:[{v:'true',l:isAr?'نشطة':'Active'},{v:'false',l:isAr?'معطّلة':'Inactive'}]}],
ll:[{k:'category_key',l:isAr?'المفتاح (إنجليزي)':'Key (English)',r:1,d:1},{k:'name_ar',l:isAr?'الاسم بالعربي':'Name (Arabic)',r:1},{k:'name_en',l:isAr?'الاسم بالإنجليزي':'Name (English)',d:1},{k:'sort_order',l:isAr?'الترتيب':'Sort Order',d:1},{k:'is_system',l:isAr?'نظامي':'System',opts:[{v:'true',l:isAr?'نعم':'Yes'},{v:'false',l:isAr?'لا':'No'}]},{k:'is_active',l:isAr?'الحالة':'Status',opts:[{v:'true',l:isAr?'نشطة':'Active'},{v:'false',l:isAr?'معطّلة':'Inactive'}]}],
li:[{k:'value_ar',l:isAr?'القيمة بالعربي':'Value (Arabic)',r:1},{k:'value_en',l:isAr?'القيمة بالإنجليزي':'Value (English)',d:1},{k:'code',l:isAr?'الرمز':'Code',d:1},{k:'sort_order',l:isAr?'الترتيب':'Sort',d:1}],
bnk:[{k:'value_ar',l:isAr?'اسم البنك بالعربي':'Bank Name (Arabic)',r:1},{k:'value_en',l:isAr?'بالإنجليزي':'English',d:1},{k:'code',l:isAr?'الرمز':'Code',d:1},{k:'type_id',l:isAr?'نوع البنك':'Bank Type',opts:lItems.filter(i=>{const bl=lLists.find(l=>l.category_key==='bank_type');return bl&&i.category_id===bl.id}).map(i=>({v:i.id,l:i.value_ar}))},{k:'sort_order',l:isAr?'الترتيب':'Sort',d:1}],
di:[{k:'name_ar',l:isAr?'اسم الحي بالعربي':'District (Arabic)',r:1},{k:'name_en',l:isAr?'اسم الحي بالإنجليزي':'District (English)',d:1},{k:'code',l:isAr?'الرمز':'Code',d:1},{k:'sort_order',l:isAr?'الترتيب':'Sort',d:1}],
au:[{k:'name_ar',l:isAr?'اسم الأمانة بالعربي':'Authority (Arabic)',r:1},{k:'name_en',l:isAr?'بالإنجليزي':'English',d:1},{k:'code',l:isAr?'الرمز':'Code',d:1},{k:'sort_order',l:isAr?'الترتيب':'Sort',d:1},{k:'is_active',l:isAr?'الحالة':'Status',opts:[{v:'true',l:isAr?'نشطة':'Active'},{v:'false',l:isAr?'معطّلة':'Inactive'}]}],
mu:[{k:'name_ar',l:isAr?'اسم البلدية بالعربي':'Municipality (Arabic)',r:1},{k:'name_en',l:isAr?'بالإنجليزي':'English',d:1},{k:'code',l:isAr?'الرمز':'Code',d:1},{k:'sort_order',l:isAr?'الترتيب':'Sort',d:1},{k:'is_active',l:isAr?'الحالة':'Status',opts:[{v:'true',l:isAr?'نشطة':'Active'},{v:'false',l:isAr?'معطّلة':'Inactive'}]}],
doc:[{k:'title',l:isAr?'العنوان':'Title',r:1},{k:'document_type',l:isAr?'النوع':'Type'},{k:'entity_type',l:isAr?'نوع الكيان':'Entity Type'},{k:'description',l:isAr?'الوصف':'Description',w:1}],
sv:[{k:'name_ar',l:isAr?'اسم الخدمة بالعربي':'Service (Arabic)',r:1},{k:'name_en',l:isAr?'بالإنجليزي':'English',d:1},{k:'code',l:isAr?'الرمز':'Code',d:1},{k:'category',l:isAr?'التصنيف':'Category'},{k:'service_scope',l:isAr?'النوع':'Scope',opts:[{v:'client',l:isAr?'خارجي (عميل)':'Client'},{v:'internal',l:isAr?'داخلي':'Internal'},{v:'office',l:isAr?'مكتب':'Office'}]},{k:'default_price',l:isAr?'السعر الافتراضي':'Default Price',d:1},{k:'gov_fee',l:isAr?'الرسوم الحكومية':'Gov. Fee',d:1},{k:'is_free',l:isAr?'مجانية':'Free',opts:[{v:'true',l:isAr?'نعم (مجاني)':'Yes (Free)'},{v:'false',l:isAr?'لا (بفلوس)':'No (Paid)'}]},{k:'vat_included',l:isAr?'شامل الضريبة':'VAT Included',opts:[{v:'true',l:isAr?'نعم':'Yes'},{v:'false',l:isAr?'لا':'No'}]},{k:'show_in_request_popup',l:isAr?'تظهر في رفع طلب':'Show in Request',opts:[{v:'true',l:isAr?'نعم':'Yes'},{v:'false',l:isAr?'لا':'No'}]},{k:'requires_client',l:isAr?'يتطلب عميل':'Requires Client',opts:[{v:'true',l:isAr?'نعم':'Yes'},{v:'false',l:isAr?'لا':'No'}]},{k:'requires_worker',l:isAr?'يتطلب عامل':'Requires Worker',opts:[{v:'true',l:isAr?'نعم':'Yes'},{v:'false',l:isAr?'لا':'No'}]},{k:'requires_facility',l:isAr?'يتطلب منشأة':'Requires Facility',opts:[{v:'true',l:isAr?'نعم':'Yes'},{v:'false',l:isAr?'لا':'No'}]},{k:'sort_order',l:isAr?'الترتيب':'Sort',d:1},{k:'is_active',l:isAr?'الحالة':'Status',opts:[{v:'true',l:isAr?'نشطة':'Active'},{v:'false',l:isAr?'معطّلة':'Inactive'}]},{k:'pricing_notes',l:isAr?'ملاحظات التسعير':'Pricing Notes'},{k:'description_ar',l:isAr?'وصف الخدمة':'Description',w:1},{k:'notes',l:isAr?'ملاحظات':'Notes',w:1}],
ss:[{k:'name_ar',l:isAr?'اسم الخطوة':'Step (Arabic)',r:1},{k:'name_en',l:isAr?'بالإنجليزي':'English',d:1},{k:'step_order',l:isAr?'الترتيب':'Order',r:1,d:1},{k:'is_required',l:isAr?'مطلوبة':'Required',opts:[{v:'true',l:isAr?'نعم':'Yes'},{v:'false',l:isAr?'لا':'No'}]},{k:'sadad_requirement',l:isAr?'متطلب سداد':'SADAD',opts:[{v:'none',l:isAr?'بدون':'None'},{v:'required_blocking',l:isAr?'مطلوب (حظر)':'Blocking'},{v:'required_before_complete',l:isAr?'قبل الإنهاء':'Before Complete'}]},{k:'default_sadad_amount',l:isAr?'مبلغ سداد':'Amount',d:1},{k:'description',l:isAr?'الوصف':'Description',w:1}],
tp:[{k:'name_ar',l:isAr?'اسم القالب بالعربي':'Template (Arabic)',r:1},{k:'name_en',l:isAr?'بالإنجليزي':'English',d:1},{k:'code',l:isAr?'الرمز':'Code',d:1},{k:'transaction_type',l:isAr?'نوع المعاملة':'Type',opts:[{v:'recruitment',l:isAr?'استقدام':'Recruitment'},{v:'transfer',l:isAr?'نقل خدمات':'Transfer'},{v:'exit',l:isAr?'خروج':'Exit'},{v:'renewal',l:isAr?'تجديد':'Renewal'},{v:'other',l:isAr?'أخرى':'Other'}]},{k:'sort_order',l:isAr?'الترتيب':'Sort',d:1},{k:'is_active',l:isAr?'الحالة':'Status',opts:[{v:'true',l:isAr?'نشط':'Active'},{v:'false',l:isAr?'معطّل':'Inactive'}]},{k:'notes',l:isAr?'ملاحظات':'Notes',w:1}],
tl:[{k:'sub_service_id',l:isAr?'الخدمة الفرعية':'Sub Service',r:1,opts:subSvcs.map(s=>({v:s.id,l:isAr?s.name_ar:s.name_en||s.name_ar}))},{k:'step_order',l:isAr?'الترتيب':'Order',r:1,d:1},{k:'step_group',l:isAr?'مجموعة تبديل':'Swap Group',d:1},{k:'is_conditional',l:isAr?'شرطية؟':'Conditional?',opts:[{v:'false',l:isAr?'لا':'No'},{v:'true',l:isAr?'نعم':'Yes'}]},{k:'condition_note',l:isAr?'وصف الشرط':'Condition Note',w:1}],
ip:[{k:'service_id',l:isAr?'الخدمة':'Service',r:1,opts:subSvcs.map(s=>({v:s.id,l:isAr?s.name_ar:s.name_en||s.name_ar}))},{k:'label_ar',l:isAr?'اسم القسط':'Label (AR)',r:1},{k:'label_en',l:isAr?'بالإنجليزي':'Label (EN)',d:1},{k:'installment_order',l:isAr?'الترتيب':'Order',r:1,d:1},{k:'percentage',l:isAr?'النسبة %':'Percentage',d:1},{k:'fixed_amount',l:isAr?'مبلغ ثابت':'Fixed Amount',d:1},{k:'due_type',l:isAr?'نوع الاستحقاق':'Due Type',r:1,opts:[{v:'on_request',l:isAr?'عند رفع الطلب':'On Request'},{v:'after_days',l:isAr?'بعد عدد أيام':'After Days'},{v:'on_milestone',l:isAr?'عند إنجاز مرحلة':'On Milestone'},{v:'on_completion',l:isAr?'عند اكتمال المعاملة':'On Completion'}]},{k:'due_days',l:isAr?'عدد الأيام':'Days',d:1},{k:'milestone_id',l:isAr?'المرحلة':'Milestone',opts:[{v:'',l:'—'},...msList.map(m=>({v:m.id,l:m.name_ar}))]},{k:'is_active',l:isAr?'الحالة':'Status',opts:[{v:'true',l:isAr?'نشط':'Active'},{v:'false',l:isAr?'معطّل':'Inactive'}]}]
}
const popTitles={
r:form._id?(isAr?'تعديل منطقة':'Edit Region'):(isAr?'إضافة منطقة':'Add Region'),
c:form._id?(isAr?'تعديل مدينة':'Edit City'):(isAr?'إضافة مدينة':'Add City'),
co:form._id?(isAr?'تعديل دولة':'Edit Country'):(isAr?'إضافة دولة':'Add Country'),
em:form._id?(isAr?'تعديل سفارة':'Edit Embassy'):(isAr?'إضافة سفارة':'Add Embassy'),
ll:form._id?(isAr?'تعديل خانة':'Edit Category'):(isAr?'إضافة خانة':'Add Category'),
li:form._id?(isAr?'تعديل عنصر':'Edit Item'):(isAr?'إضافة عنصر':'Add Item'),
bnk:form._id?(isAr?'تعديل بنك':'Edit Bank'):(isAr?'إضافة بنك':'Add Bank'),
di:form._id?(isAr?'تعديل حي':'Edit District'):(isAr?'إضافة حي':'Add District'),
au:form._id?(isAr?'تعديل أمانة':'Edit Authority'):(isAr?'إضافة أمانة':'Add Authority'),
mu:form._id?(isAr?'تعديل بلدية':'Edit Municipality'):(isAr?'إضافة بلدية':'Add Municipality'),
doc:form._id?(isAr?'تعديل وثيقة':'Edit Document'):(isAr?'إضافة وثيقة':'Add Document'),
sv:form._id?(isAr?'تعديل خدمة فرعية':'Edit Sub Service'):(isAr?'إضافة خدمة فرعية':'Add Sub Service'),
ss:form._id?(isAr?'تعديل خطوة':'Edit Step'):(isAr?'إضافة خطوة':'Add Step'),
tp:form._id?(isAr?'تعديل قالب':'Edit Template'):(isAr?'إضافة قالب معاملة':'Add Template'),
tl:form._id?(isAr?'تعديل ربط':'Edit Link'):(isAr?'ربط خدمة فرعية بقالب':'Link Sub Service'),
ip:form._id?(isAr?'تعديل قسط':'Edit Installment'):(isAr?'إضافة قسط جديد':'Add Installment')
}

const fLItems=lItems.filter(i=>{if(listFilter&&i.category_id!==listFilter)return false;if(q)return(i.value_ar||'').includes(q)||(i.value_en||'').toLowerCase().includes(q.toLowerCase());return true})

return<div>
<div style={{marginBottom:20}}>
<div style={{fontSize:20,fontWeight:700,color:'rgba(255,255,255,.93)'}}>{isAr?'الإعدادات والتصنيفات':'Settings & Categories'}</div>
<div style={{fontSize:12,color:'var(--tx4)',marginTop:6}}>{isAr?'إدارة البيانات الأساسية والتصنيفات':'Manage core data & categories'}</div>
</div>

<div style={{display:'flex',gap:0,marginBottom:20,borderBottom:'1px solid var(--bd)',overflowX:'auto',scrollbarWidth:'none'}}>
{tabs.map(t=><div key={t.id} onClick={()=>{setTab(t.id);setQ('');setListFilter('')}} style={{padding:'10px 16px',fontSize:12,fontWeight:tab===t.id?700:500,color:tab===t.id?C.gold:'rgba(255,255,255,.42)',borderBottom:tab===t.id?'2px solid '+C.gold:'2px solid transparent',cursor:'pointer',transition:'.15s',whiteSpace:'nowrap',flexShrink:0}}>{isAr?t.l:t.le}</div>)}
</div>

{/* GENERAL */}
{tab==='general'&&<>
{sLoading?<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>:
[{k:'general',l:'معلومات الموقع',le:'Website Info'},
{k:'invoice',l:'الفوترة والبادئات',le:'Invoicing & Prefixes'},
{k:'defaults',l:'القيم الافتراضية',le:'Defaults'},
{k:'reminders',l:'التنبيهات (أيام قبل الانتهاء)',le:'Reminders'},
{k:'system',l:'النظام والأمان',le:'System & Security'}
].map(cat=>{const items=sData.filter(s=>s.category===cat.k);if(!items.length)return null;return<div key={cat.k} style={{marginBottom:20}}>
<div style={{...secS,marginBottom:8}}><span style={{width:6,height:6,borderRadius:'50%',background:cat.k==='reminders'?C.red:cat.k==='system'?C.blue:C.gold}}/>{isAr?cat.l:cat.le}<span style={{fontSize:10,color:'var(--tx5)'}}>{items.length}</span></div>
<div style={cardS}>{items.map((s,i)=><div key={s.id} style={{display:'flex',alignItems:'center',padding:'12px 18px',borderBottom:i<items.length-1?'1px solid rgba(255,255,255,.04)':'none',gap:14}}>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:13,fontWeight:600,color:'var(--tx)',marginBottom:2}}>{isAr?s.label_ar:s.label_en||s.setting_key}</div>
<div style={{fontSize:10,color:'var(--tx5)',fontFamily:'monospace',direction:'ltr'}}>{s.setting_key}</div>
</div>
{s.input_type==='boolean'?
<div style={{display:'flex',gap:4}}>
{[{v:'true',l:isAr?'نعم':'Yes'},{v:'false',l:isAr?'لا':'No'}].map(o=>{const on=s.setting_value===o.v;return<button key={o.v} onClick={()=>{saveSetting(s.setting_key,o.v);setSData(p=>p.map(x=>x.id===s.id?{...x,setting_value:o.v}:x))}} style={{height:32,padding:'0 14px',borderRadius:8,border:on?'1.5px solid rgba(212,160,23,.4)':'1.5px solid rgba(255,255,255,.1)',background:on?'rgba(212,160,23,.15)':'transparent',color:on?C.gold:'var(--tx5)',fontFamily:F,fontSize:11,fontWeight:on?700:500,cursor:'pointer'}}>{o.l}</button>})}
</div>
:s.input_type==='textarea'?
<textarea defaultValue={s.setting_value||''} onBlur={e=>saveSetting(s.setting_key,e.target.value)} rows={2} style={{width:260,padding:'8px 12px',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:8,fontFamily:F,fontSize:12,fontWeight:600,color:'var(--tx)',background:'rgba(255,255,255,.05)',outline:'none',resize:'vertical',direction:s.setting_key.includes('_ar')||s.setting_key.includes('label')?'rtl':'ltr'}}/>
:s.input_type==='number'?
<input type="number" defaultValue={s.setting_value||''} onBlur={e=>saveSetting(s.setting_key,e.target.value)} style={{width:120,height:36,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:8,fontFamily:F,fontSize:13,fontWeight:700,color:C.gold,background:'rgba(255,255,255,.05)',outline:'none',textAlign:'center',direction:'ltr'}}/>
:
<input defaultValue={s.setting_value||''} onBlur={e=>saveSetting(s.setting_key,e.target.value)} style={{width:260,height:36,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:8,fontFamily:F,fontSize:12,fontWeight:600,color:'var(--tx)',background:'rgba(255,255,255,.05)',outline:'none',direction:s.setting_key.includes('_ar')?'rtl':'ltr',textAlign:s.setting_key.includes('_ar')?'right':'left'}}/>
}
</div>)}</div>
</div>})}</>}

{/* REGIONS & CITIES */}
{tab==='regions_cities'&&<>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
<div style={secS}><span style={{width:6,height:6,borderRadius:'50%',background:C.gold}}/>{isAr?'المناطق والمدن والأحياء':'Regions, Cities & Districts'}<span style={{fontSize:10,color:'var(--tx5)'}}>{regions.length} {isAr?'منطقة':'regions'} · {cities.length} {isAr?'مدينة':'cities'}</span></div>
<div style={{display:'flex',gap:6}}>
<button onClick={()=>{setForm({_table:'regions',name_ar:'',name_en:'',code:'',sort_order:'',is_active:'true'});setPop('r')}} style={bS}>{isAr?'منطقة':'Region'} +</button>
</div></div>
<div style={cardS}>{regions.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)',fontSize:12}}>{isAr?'لا توجد مناطق':'No regions'}</div>:
regions.map(r=>{const rc=cities.filter(c=>c.region_id===r.id);const io=open['r_'+r.id];return<div key={r.id}>
<div style={parentRow} onClick={()=>toggle('r_'+r.id)}>
<ArrowIcon isOpen={io}/>
<div style={{flex:1}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
<span style={{fontSize:14,fontWeight:700,color:'var(--tx)'}}>{r.name_ar}</span>
<span style={{fontSize:11,color:'var(--tx5)',direction:'ltr'}}>{r.name_en||''}</span>
{r.code&&<span style={{fontSize:10,color:'var(--tx5)',fontFamily:'monospace',direction:'ltr'}}>{r.code}</span>}
<BadgeStatus v={r.is_active} isAr={isAr}/>
</div>
<div style={{display:'flex',alignItems:'center',gap:6}}>
<span style={{fontSize:10,color:'var(--tx5)',background:'rgba(255,255,255,.06)',padding:'2px 8px',borderRadius:8}}>{rc.length} {isAr?'مدن':'cities'}</span>
</div>
</div>
<div style={{display:'flex',gap:4}} onClick={e=>e.stopPropagation()}>
<button onClick={()=>{setForm({_table:'cities',name_ar:'',name_en:'',code:'',region_id:r.id,sort_order:'',is_active:'true'});setPop('c')}} style={{height:28,padding:'0 10px',borderRadius:8,border:'1px solid rgba(52,131,180,.25)',background:'rgba(52,131,180,.1)',color:C.blue,fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>{isAr?'مدينة':'City'}</button>
<EditBtn onClick={()=>{setForm({_table:'regions',_id:r.id,name_ar:r.name_ar||'',name_en:r.name_en||'',code:r.code||'',sort_order:r.sort_order||'',is_active:String(r.is_active!==false)});setPop('r')}}/>
<DelBtn onClick={()=>askDel('regions',r.id,r.name_ar)}/>
</div></div>
{io&&<div style={{background:'rgba(255,255,255,.015)'}}>
{rc.map(c=>{const cd=districtsList.filter(d=>d.city_id===c.id&&d.is_active);const cio=open['c_'+c.id];return<div key={c.id}>
<div style={{...childRow,cursor:'pointer'}} onClick={()=>toggle('c_'+c.id)}>
<ArrowIcon isOpen={cio}/>
<div style={{flex:1,display:'flex',alignItems:'center',gap:8}}>
<span style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,.7)'}}>{c.name_ar}</span>
<span style={{fontSize:10,color:'var(--tx5)',direction:'ltr'}}>{c.name_en||''}</span>
<span style={{fontSize:10,color:'var(--tx6)',fontFamily:'monospace',direction:'ltr'}}>{c.code||''}</span>
{cd.length>0&&<span style={{fontSize:9,color:'var(--tx5)',background:'rgba(255,255,255,.06)',padding:'1px 6px',borderRadius:6}}>{cd.length} {isAr?'حي':'dist'}</span>}
</div>
<BadgeStatus v={c.is_active} isAr={isAr}/>
<div style={{display:'flex',gap:4}} onClick={e=>e.stopPropagation()}>
<button onClick={()=>{setForm({_table:'districts',name_ar:'',name_en:'',code:'',sort_order:'',city_id:c.id,is_active:'true'});setPop('di')}} style={{height:24,padding:'0 8px',borderRadius:6,border:'1px solid rgba(39,160,70,.2)',background:'rgba(39,160,70,.06)',color:C.ok,fontFamily:F,fontSize:9,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:3}}><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={C.ok} strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>{isAr?'حي':'Dist'}</button>
<EditBtn onClick={()=>{setForm({_table:'cities',_id:c.id,name_ar:c.name_ar||'',name_en:c.name_en||'',code:c.code||'',region_id:c.region_id||'',sort_order:c.sort_order||'',is_active:String(c.is_active!==false)});setPop('c')}}/>
<DelBtn onClick={()=>askDel('cities',c.id,c.name_ar)}/>
</div></div>
{cio&&cd.length>0&&<div style={{paddingRight:48,paddingBottom:8}}>
{cd.map(d=><div key={d.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 12px',borderRadius:6,marginBottom:2,background:'rgba(39,160,70,.02)',border:'1px solid rgba(39,160,70,.05)'}}>
<span style={{width:3,height:3,borderRadius:'50%',background:C.ok,flexShrink:0}}/>
<span style={{flex:1,fontSize:12,color:'rgba(255,255,255,.55)'}}>{d.name_ar}</span>
<span style={{fontSize:9,color:'var(--tx6)',direction:'ltr'}}>{d.name_en||''}</span>
<span style={{fontSize:9,color:'var(--tx6)',fontFamily:'monospace',direction:'ltr'}}>{d.code||''}</span>
<div style={{display:'flex',gap:3}}>
<EditBtn onClick={()=>{setForm({_table:'districts',_id:d.id,city_id:d.city_id,name_ar:d.name_ar||'',name_en:d.name_en||'',code:d.code||'',sort_order:d.sort_order||'',is_active:String(d.is_active!==false)});setPop('di')}}/>
<DelBtn onClick={()=>askDel('districts',d.id,d.name_ar)}/>
</div></div>)}
</div>}
</div>})}</div>}
</div>})}</div></>}

{/* COUNTRIES & EMBASSIES */}
{tab==='countries_nat'&&<>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
<div style={secS}><span style={{width:6,height:6,borderRadius:'50%',background:C.gold}}/>{isAr?'الدول والجنسيات والسفارات':'Countries & Embassies'}<span style={{fontSize:10,color:'var(--tx5)'}}>{countries.length} {isAr?'دولة':'countries'} · {embassies.length} {isAr?'سفارة':'embassies'}</span></div>
<div style={{display:'flex',gap:6}}>
<button onClick={()=>{setForm({_table:'countries',name_ar:'',name_en:'',nationality_ar:'',nationality_en:'',code:'',sort_order:'',flag_emoji:'',is_active:'true'});setPop('co')}} style={bS}>{isAr?'دولة':'Country'} +</button>
</div></div>
<div style={cardS}>{countries.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)',fontSize:12}}>{isAr?'لا توجد دول':'No countries'}</div>:
countries.map(co=>{const ce=embassies.filter(e=>e.country_id===co.id);const io=open['co_'+co.id];return<div key={co.id}>
<div style={parentRow} onClick={()=>toggle('co_'+co.id)}>
<ArrowIcon isOpen={io}/>
<div style={{flex:1}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
<span style={{fontSize:14,fontWeight:700,color:'var(--tx)'}}>{co.name_ar}</span>
<span style={{fontSize:11,color:'var(--tx5)',direction:'ltr'}}>{co.name_en||''}</span>
{co.code&&<span style={{fontSize:10,color:'var(--tx5)',fontFamily:'monospace',direction:'ltr'}}>{co.code}</span>}
<BadgeStatus v={co.is_active} isAr={isAr}/>
</div>
<div style={{display:'flex',alignItems:'center',gap:6}}>
{co.code&&<img src={'https://flagcdn.com/w40/'+co.code.toLowerCase()+'.png'} width={24} height={16} style={{borderRadius:2,objectFit:'cover',flexShrink:0}} alt='' onError={e=>{e.target.style.display='none'}}/>}
<span style={{fontSize:10,color:'rgba(212,160,23,.6)',background:'rgba(212,160,23,.08)',padding:'2px 8px',borderRadius:8}}>{co.nationality_ar||'—'}</span>
<span style={{width:3,height:3,borderRadius:'50%',background:'rgba(255,255,255,.12)'}}/>
<span style={{fontSize:10,color:'var(--tx5)',background:'rgba(255,255,255,.06)',padding:'2px 8px',borderRadius:8}}>{ce.length} {isAr?'سفارة':'embassies'}</span>
</div>
</div>
<div style={{display:'flex',gap:4}} onClick={e=>e.stopPropagation()}>
<button onClick={()=>{setForm({_table:'embassies_consulates',city_ar:'',city_en:'',country_id:co.id,sort_order:'',is_active:'true'});setPop('em')}} style={{height:28,padding:'0 10px',borderRadius:8,border:'1px solid rgba(52,131,180,.25)',background:'rgba(52,131,180,.1)',color:C.blue,fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>{isAr?'سفارة':'Embassy'}</button>
<EditBtn onClick={()=>{setForm({_table:'countries',_id:co.id,name_ar:co.name_ar||'',name_en:co.name_en||'',nationality_ar:co.nationality_ar||'',nationality_en:co.nationality_en||'',code:co.code||'',sort_order:co.sort_order||'',flag_emoji:co.flag_emoji||'',is_active:String(co.is_active!==false)});setPop('co')}}/>
<DelBtn onClick={()=>askDel('countries',co.id,co.name_ar)}/>
</div></div>
{io&&<div style={{background:'rgba(255,255,255,.015)'}}>{ce.length===0?<div style={{...childRow,color:'var(--tx6)',fontSize:11}}>{isAr?'لا توجد سفارات':'No embassies'}</div>:
ce.map(e=><div key={e.id} style={childRow}>
<div style={{width:4,height:4,borderRadius:'50%',background:C.blue,flexShrink:0}}/>
<div style={{flex:1,display:'flex',alignItems:'center',gap:8}}>
<span style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,.7)'}}>{e.city_ar}</span>
<span style={{fontSize:10,color:'var(--tx5)',direction:'ltr'}}>{e.city_en||''}</span>
</div>
<BadgeStatus v={e.is_active} isAr={isAr}/>
<div style={{display:'flex',gap:4}}>
<EditBtn onClick={()=>{setForm({_table:'embassies_consulates',_id:e.id,city_ar:e.city_ar||'',city_en:e.city_en||'',country_id:e.country_id||'',sort_order:e.sort_order||'',is_active:String(e.is_active!==false)});setPop('em')}}/>
<DelBtn onClick={()=>askDel('embassies_consulates',e.id,e.city_ar)}/>
</div></div>)}</div>}
</div>})}</div></>}

{/* CATEGORIES & ITEMS */}
{tab==='categories'&&<>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
<div style={secS}><span style={{width:6,height:6,borderRadius:'50%',background:C.gold}}/>{isAr?'الخانات والعناصر':'Categories & Items'}<span style={{fontSize:10,color:'var(--tx5)'}}>{lLists.length} {isAr?'خانة':'categories'} · {lItems.length} {isAr?'عنصر':'items'}</span></div>
<div style={{display:'flex',gap:6}}>
<button onClick={()=>{setForm({_table:'lookup_categories',category_key:'',name_ar:'',name_en:'',sort_order:'',is_system:'false',is_active:'true'});setPop('ll')}} style={bS}>{isAr?'خانة':'Category'} +</button>
</div></div>
<div style={cardS}>{lLists.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)',fontSize:12}}>{isAr?'لا توجد خانات':'No categories'}</div>:
lLists.map(ll=>{const li2=lItems.filter(i=>i.category_id===ll.id);const io=open['ll_'+ll.id];return<div key={ll.id}>
<div style={parentRow} onClick={()=>toggle('ll_'+ll.id)}>
<ArrowIcon isOpen={io}/>
<div style={{flex:1}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
<span style={{fontSize:14,fontWeight:700,color:'var(--tx)'}}>{ll.name_ar}</span>
<span style={{fontSize:11,color:'var(--tx5)',direction:'ltr'}}>{ll.name_en||''}</span>
{ll.is_system&&<span style={{fontSize:9,color:C.gold,background:'rgba(212,160,23,.1)',padding:'2px 6px',borderRadius:6}}>نظامي</span>}
</div>
<div style={{display:'flex',alignItems:'center',gap:6}}>
<span style={{fontSize:10,color:'var(--tx4)',fontFamily:'monospace',direction:'ltr'}}>{ll.category_key}</span>
<span style={{width:3,height:3,borderRadius:'50%',background:'rgba(255,255,255,.12)'}}/>
<span style={{fontSize:10,color:'var(--tx5)',background:'rgba(255,255,255,.06)',padding:'2px 8px',borderRadius:8}}>{li2.length} {isAr?'عنصر':'items'}</span>
</div>
</div>
<div style={{display:'flex',gap:4}} onClick={e=>e.stopPropagation()}>
<button onClick={()=>{const isBnk=ll.category_key==='bank_name';setForm({_table:'lookup_items',value_ar:'',value_en:'',code:'',sort_order:'',category_id:ll.id,...(isBnk?{type_id:''}:{})});setPop(isBnk?'bnk':'li')}} style={{height:28,padding:'0 10px',borderRadius:8,border:'1px solid rgba(52,131,180,.25)',background:'rgba(52,131,180,.1)',color:C.blue,fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>{isAr?'عنصر':'Item'}</button>
<EditBtn onClick={()=>{setForm({_table:'lookup_categories',_id:ll.id,category_key:ll.category_key||'',name_ar:ll.name_ar||'',name_en:ll.name_en||'',sort_order:ll.sort_order||'',is_system:String(ll.is_system===true),is_active:String(ll.is_active!==false)});setPop('ll')}}/>
{!ll.is_system&&<DelBtn onClick={()=>askDel('lookup_categories',ll.id,ll.name_ar)}/>}
</div></div>
{io&&<div style={{background:'rgba(255,255,255,.015)'}}>{li2.length===0?<div style={{...childRow,color:'var(--tx6)',fontSize:11}}>{isAr?'لا توجد عناصر':'No items'}</div>:
li2.map(it=>{const isBnk=ll.category_key==='bank_name';const typeName=isBnk&&it.type_id?lItems.find(x=>x.id===it.type_id)?.value_ar:'';return<div key={it.id} style={childRow}>
<div style={{width:4,height:4,borderRadius:'50%',background:C.blue,flexShrink:0}}/>
<div style={{flex:1,display:'flex',alignItems:'center',gap:8}}>
<span style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,.7)'}}>{it.value_ar}</span>
<span style={{fontSize:10,color:'var(--tx5)',direction:'ltr'}}>{it.value_en||''}</span>
<span style={{fontSize:10,color:'var(--tx6)',fontFamily:'monospace',direction:'ltr'}}>{it.code||''}</span>
{typeName&&<span style={{fontSize:9,color:C.gold,background:'rgba(212,160,23,.08)',padding:'2px 6px',borderRadius:6}}>{typeName}</span>}
</div>
{it.sort_order!=null&&<MetaText t={'#'+it.sort_order}/>}
<div style={{display:'flex',gap:4}}>
<EditBtn onClick={()=>{setForm({_table:'lookup_items',_id:it.id,category_id:it.category_id||'',value_ar:it.value_ar||'',value_en:it.value_en||'',code:it.code||'',sort_order:it.sort_order||'',...(isBnk?{type_id:it.type_id||''}:{})});setPop(isBnk?'bnk':'li')}}/>
<DelBtn onClick={()=>askDel('lookup_items',it.id,it.value_ar)}/>
</div></div>})}</div>}
</div>})}</div></>}

{/* AUTHORITIES & MUNICIPALITIES */}
{tab==='authorities_muni'&&<>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
<div style={secS}><span style={{width:6,height:6,borderRadius:'50%',background:C.gold}}/>{isAr?'الأمانات والبلديات':'Authorities & Municipalities'}<span style={{fontSize:10,color:'var(--tx5)'}}>{authoritiesList.length} {isAr?'أمانة':'auth'} · {municipalitiesList.length} {isAr?'بلدية':'muni'}</span></div>
<div style={{display:'flex',gap:6}}>
<button onClick={()=>{setForm({_table:'authorities',name_ar:'',name_en:'',code:'',sort_order:'',is_active:'true'});setPop('au')}} style={bS}>{isAr?'أمانة':'Authority'} +</button>
</div></div>
<div style={cardS}>{authoritiesList.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)',fontSize:12}}>{isAr?'لا توجد أمانات':'No authorities'}</div>:
authoritiesList.map(a=>{const am=municipalitiesList.filter(m=>m.authority_id===a.id);const io=open['au_'+a.id];return<div key={a.id}>
<div style={parentRow} onClick={()=>toggle('au_'+a.id)}>
<ArrowIcon isOpen={io}/>
<div style={{flex:1}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
<span style={{fontSize:14,fontWeight:700,color:'var(--tx)'}}>{a.name_ar}</span>
<span style={{fontSize:11,color:'var(--tx5)',direction:'ltr'}}>{a.name_en||''}</span>
<BadgeStatus v={a.is_active} isAr={isAr}/>
</div>
<span style={{fontSize:10,color:'var(--tx5)',background:'rgba(255,255,255,.06)',padding:'2px 8px',borderRadius:8}}>{am.length} {isAr?'بلدية':'muni'}</span>
</div>
<div style={{display:'flex',gap:4}} onClick={e=>e.stopPropagation()}>
<button onClick={()=>{setForm({_table:'municipalities',name_ar:'',name_en:'',code:'',authority_id:a.id,sort_order:'',is_active:'true'});setPop('mu')}} style={{height:28,padding:'0 10px',borderRadius:8,border:'1px solid rgba(52,131,180,.25)',background:'rgba(52,131,180,.1)',color:C.blue,fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>{isAr?'بلدية':'Municipality'}</button>
<EditBtn onClick={()=>{setForm({_table:'authorities',_id:a.id,name_ar:a.name_ar||'',name_en:a.name_en||'',code:a.code||'',sort_order:a.sort_order||'',is_active:String(a.is_active!==false)});setPop('au')}}/>
<DelBtn onClick={()=>askDel('authorities',a.id,a.name_ar)}/>
</div></div>
{io&&<div style={{background:'rgba(255,255,255,.015)'}}>
{am.length===0?<div style={{...childRow,color:'var(--tx6)',fontSize:11}}>{isAr?'لا توجد بلديات':'No municipalities'}</div>:
am.map(m=><div key={m.id} style={childRow}>
<div style={{width:4,height:4,borderRadius:'50%',background:C.blue,flexShrink:0}}/>
<div style={{flex:1,display:'flex',alignItems:'center',gap:8}}>
<span style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,.7)'}}>{m.name_ar}</span>
<span style={{fontSize:10,color:'var(--tx5)',direction:'ltr'}}>{m.name_en||''}</span>
<span style={{fontSize:10,color:'var(--tx6)',fontFamily:'monospace',direction:'ltr'}}>{m.code||''}</span>
</div>
<BadgeStatus v={m.is_active} isAr={isAr}/>
<div style={{display:'flex',gap:4}}>
<EditBtn onClick={()=>{setForm({_table:'municipalities',_id:m.id,name_ar:m.name_ar||'',name_en:m.name_en||'',code:m.code||'',authority_id:m.authority_id||'',sort_order:m.sort_order||'',is_active:String(m.is_active!==false)});setPop('mu')}}/>
<DelBtn onClick={()=>askDel('municipalities',m.id,m.name_ar)}/>
</div></div>)}</div>}
</div>})}</div></>}

{/* DOCUMENTS */}
{tab==='documents'&&<>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
<div style={secS}><span style={{width:6,height:6,borderRadius:'50%',background:C.gold}}/>{isAr?'الوثائق':'Documents'}<MetaText t={'— '+docs.length}/></div>
<button onClick={()=>{setForm({_table:'documents',title:'',document_type:'',entity_type:'',description:''});setPop('doc')}} style={bS}>{isAr?'وثيقة':'Document'} +</button>
</div>
<div style={cardS}>
<table style={{width:'100%',borderCollapse:'collapse',fontFamily:F}}>
<thead><tr style={{background:'rgba(255,255,255,.04)',borderBottom:'1px solid rgba(255,255,255,.08)'}}>
<th style={{padding:'12px 16px',textAlign:'right',fontSize:11,fontWeight:600,color:'var(--tx4)',width:36}}>#</th>
<th style={{padding:'12px 16px',textAlign:'right',fontSize:11,fontWeight:600,color:'var(--tx4)'}}>العنوان</th>
<th style={{padding:'12px 16px',textAlign:'right',fontSize:11,fontWeight:600,color:'var(--tx4)'}}>النوع</th>
<th style={{padding:'12px 16px',textAlign:'right',fontSize:11,fontWeight:600,color:'var(--tx4)'}}>الكيان</th>
<th style={{padding:'12px',textAlign:'center',width:80}}></th>
</tr></thead>
<tbody>{docs.length===0?<tr><td colSpan={5} style={{textAlign:'center',padding:40,color:'var(--tx6)',fontSize:12}}>{isAr?'لا توجد وثائق':'No documents'}</td></tr>:
docs.map((d,i)=><tr key={d.id} style={{borderBottom:'1px solid var(--bd2)'}}>
<td style={{padding:'12px 16px',fontSize:11,color:'var(--tx5)'}}>{i+1}</td>
<td style={{padding:'12px 16px',fontSize:13,fontWeight:600,color:'var(--tx2)'}}>{d.title||'—'}</td>
<td style={{padding:'12px 16px',fontSize:12,color:'rgba(255,255,255,.6)'}}>{d.document_type||'—'}</td>
<td style={{padding:'12px 16px',fontSize:12,color:'rgba(255,255,255,.6)'}}>{d.entity_type||'—'}</td>
<td style={{padding:'8px',textAlign:'center'}}><div style={{display:'flex',gap:4,justifyContent:'center'}}>
<EditBtn onClick={()=>{setForm({_table:'documents',_id:d.id,title:d.title||'',document_type:d.document_type||'',entity_type:d.entity_type||'',description:d.description||''});setPop('doc')}}/>
<DelBtn onClick={()=>askDel('documents',d.id,d.title)}/>
</div></td></tr>)}</tbody></table></div></>}

{/* SERVICES */}
{tab==='services'&&<>
{/* Sub-tabs: side list */}
<div style={{display:'flex',gap:0}}>
<div style={{width:80,flexShrink:0,borderLeft:isAr?'1px solid rgba(255,255,255,.05)':'none',borderRight:!isAr?'1px solid rgba(255,255,255,.05)':'none',paddingTop:2}}>
{[{id:'services',l:'الخدمات',le:'Services'},{id:'installments',l:'الأقساط',le:'Installments'},{id:'templates',l:'المعاملات',le:'Transactions'}].map(st=><div key={st.id} onClick={()=>setSvcSubTab(st.id)} style={{padding:'6px 8px',fontSize:10,fontWeight:svcSubTab===st.id?700:500,color:svcSubTab===st.id?C.gold:'rgba(255,255,255,.3)',cursor:'pointer',borderRight:isAr&&svcSubTab===st.id?'2px solid '+C.gold:'2px solid transparent',borderLeft:!isAr&&svcSubTab===st.id?'2px solid '+C.gold:'2px solid transparent',transition:'.1s'}}>{isAr?st.l:st.le}</div>)}
</div>
<div style={{flex:1,paddingRight:isAr?8:0,paddingLeft:!isAr?8:0}}>

{/* ═══ SERVICES — GROUPED BY CATEGORY ═══ */}
{svcSubTab==='services'&&(()=>{
const categories=[...new Set(subSvcs.map(s=>s.category||'أخرى'))].sort();const catCounts={};categories.forEach(c=>{catCounts[c]=subSvcs.filter(s=>(s.category||'أخرى')===c).length})
const filteredSvcs=svcCatFilter==='all'?subSvcs:subSvcs.filter(s=>(s.category||'أخرى')===svcCatFilter)
const readyCount=subSvcs.filter(sv=>{const steps=subSteps.filter(s=>s.sub_service_id===sv.id);return steps.length>0&&steps.some(st=>stepFieldCounts[st.id]>0)}).length
const noStepCount=subSvcs.filter(sv=>subSteps.filter(s=>s.sub_service_id===sv.id).length===0).length
return<>
{/* Stats summary */}
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:14}}>
{[[isAr?'إجمالي الخدمات':'Total',subSvcs.length,C.gold],[isAr?'جاهزة (فيها حقول)':'Ready',readyCount,C.ok],[isAr?'بدون خطوات':'No Steps',noStepCount,C.red],[isAr?'خارجية / داخلية':'Ext/Int',subSvcs.filter(s=>s.service_scope==='client').length+' / '+subSvcs.filter(s=>s.service_scope!=='client').length,C.blue]].map(([l,v,c],i)=>
<div key={i} style={{padding:'10px 12px',borderRadius:10,background:c+'08',border:'1px solid '+c+'15'}}>
<div style={{fontSize:9,color:c,opacity:.7}}>{l}</div>
<div style={{fontSize:18,fontWeight:800,color:c}}>{v}</div>
</div>)}
</div>

<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}}>
<div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
<div style={secS}><span style={{width:6,height:6,borderRadius:'50%',background:C.gold}}/>{isAr?'الخدمات الفرعية':'Sub Services'}<MetaText t={filteredSvcs.length+' '+(isAr?'خدمة':'services')}/></div>
{/* Category filter chips */}
<div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
<span onClick={()=>setSvcCatFilter('all')} style={{fontSize:9,padding:'3px 8px',borderRadius:6,cursor:'pointer',fontWeight:svcCatFilter==='all'?700:500,color:svcCatFilter==='all'?C.gold:'rgba(255,255,255,.35)',background:svcCatFilter==='all'?'rgba(212,160,23,.08)':'rgba(255,255,255,.04)',border:svcCatFilter==='all'?'1px solid rgba(212,160,23,.15)':'1px solid rgba(255,255,255,.06)'}}>{isAr?'الكل':'All'}</span>
{categories.map(c=><span key={c} onClick={()=>setSvcCatFilter(c)} style={{fontSize:9,padding:'3px 8px',borderRadius:6,cursor:'pointer',fontWeight:svcCatFilter===c?700:500,color:svcCatFilter===c?C.gold:'rgba(255,255,255,.35)',background:svcCatFilter===c?'rgba(212,160,23,.08)':'rgba(255,255,255,.04)',border:svcCatFilter===c?'1px solid rgba(212,160,23,.15)':'1px solid rgba(255,255,255,.06)'}}>{c} ({catCounts[c]})</span>)}
</div>
</div>
<button onClick={()=>{setForm({_table:'sub_services',name_ar:'',name_en:'',service_scope:'client',sort_order:'',notes:''});setPop('sv')}} style={bS}>{isAr?'خدمة فرعية':'Sub Service'} +</button>
</div>

{/* Grouped services */}
{svcCatFilter==='all'?categories.map(cat=>{const catSvcs=subSvcs.filter(s=>(s.category||'أخرى')===cat);if(catSvcs.length===0)return null;const catOpen=open['cat_'+cat]!==false
return<div key={cat} style={{marginBottom:12}}>
{/* Category header */}
<div onClick={()=>setOpen(p=>({...p,['cat_'+cat]:!catOpen}))} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',borderRadius:10,background:'rgba(212,160,23,.04)',border:'1px solid rgba(212,160,23,.08)',cursor:'pointer',marginBottom:catOpen?6:0}}>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{transform:catOpen?'rotate(90deg)':'',transition:'.2s'}}><polyline points="9 6 15 12 9 18" stroke={C.gold} strokeWidth="2.5"/></svg>
<span style={{fontSize:12,fontWeight:700,color:C.gold}}>{cat}</span>
<span style={{fontSize:10,color:'rgba(212,160,23,.5)'}}>{catSvcs.length} {isAr?'خدمة':'svc'}</span>
<div style={{flex:1}}/>
<span style={{fontSize:9,color:C.ok}}>{catSvcs.filter(sv=>{const steps=subSteps.filter(s=>s.sub_service_id===sv.id);return steps.length>0&&steps.some(st=>stepFieldCounts[st.id]>0)}).length} {isAr?'جاهزة':'ready'}</span>
</div>
{catOpen&&<div style={cardS}>{catSvcs.map(sv=>{const svSt=subSteps.filter(s=>s.sub_service_id===sv.id);const io=open['sv_'+sv.id];const hasFields=svSt.some(st=>stepFieldCounts[st.id]>0);const txnCount=txnCounts[sv.id]||0
return<div key={sv.id}>
<div style={parentRow} onClick={()=>toggle('sv_'+sv.id)}>
<ArrowIcon isOpen={io}/>
<div style={{flex:1}}>
<div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3,flexWrap:'wrap'}}>
<span style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>{sv.name_ar}</span>
<span style={{fontSize:10,color:'var(--tx5)',direction:'ltr'}}>{sv.name_en||''}</span>
<span style={{fontSize:9,color:sv.service_scope==='client'?C.gold:C.blue,background:sv.service_scope==='client'?'rgba(212,160,23,.08)':'rgba(52,131,180,.08)',padding:'2px 6px',borderRadius:6}}>{sv.service_scope==='client'?(isAr?'خارجي':'External'):(isAr?'داخلي':'Internal')}</span>
{/* Readiness indicator */}
{svSt.length>0&&hasFields&&<span style={{fontSize:8,color:C.ok,background:'rgba(39,160,70,.08)',padding:'2px 6px',borderRadius:6}}>✓ {isAr?'جاهزة':'Ready'}</span>}
{svSt.length>0&&!hasFields&&<span style={{fontSize:8,color:'#e67e22',background:'rgba(230,126,34,.08)',padding:'2px 6px',borderRadius:6}}>⚠ {isAr?'بدون حقول':'No Fields'}</span>}
{svSt.length===0&&<span style={{fontSize:8,color:C.red,background:'rgba(192,57,43,.08)',padding:'2px 6px',borderRadius:6}}>✗ {isAr?'بدون خطوات':'No Steps'}</span>}
</div>
<div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
<span style={{fontSize:10,color:'var(--tx5)',background:'rgba(255,255,255,.06)',padding:'2px 8px',borderRadius:8}}>{svSt.length} {isAr?'خطوة':'steps'}</span>
{sv.expected_sla_days&&<span style={{fontSize:9,color:'rgba(255,255,255,.3)'}}>SLA: {sv.expected_sla_days}{isAr?'ي':'d'}</span>}
{sv.default_price>0&&<span style={{fontSize:9,color:C.ok}}>{sv.default_price} {isAr?'ر.س':'SAR'}</span>}
{sv.platform_code&&<span style={{fontSize:8,color:C.blue,background:'rgba(52,131,180,.06)',padding:'1px 5px',borderRadius:4}}>{sv.platform_code}</span>}
{txnCount>0&&<span style={{fontSize:9,color:C.gold,background:'rgba(212,160,23,.06)',padding:'2px 6px',borderRadius:6}}>{txnCount} {isAr?'معاملة':'txn'}</span>}
</div>
</div>
<div style={{display:'flex',gap:4}} onClick={e=>e.stopPropagation()}>
<button onClick={()=>{setForm({_table:'sub_service_steps',step_name_ar:'',step_name_en:'',step_order:'',sadad_requirement:'none',default_sadad_amount:'',sub_service_id:sv.id});setPop('ss')}} style={{height:28,padding:'0 10px',borderRadius:8,border:'1px solid rgba(52,131,180,.25)',background:'rgba(52,131,180,.1)',color:C.blue,fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>{isAr?'خطوة':'Step'}</button>
<EditBtn onClick={()=>{setForm({_table:'sub_services',_id:sv.id,name_ar:sv.name_ar||'',name_en:sv.name_en||'',service_scope:sv.service_scope||'client',sort_order:sv.sort_order||'',notes:sv.notes||''});setPop('sv')}}/>
<DelBtn onClick={()=>askDel('sub_services',sv.id,sv.name_ar)}/>
</div></div>
{io&&<div style={{background:'rgba(255,255,255,.015)'}}>
{svSt.length===0?<div style={{...childRow,color:'var(--tx6)',fontSize:11}}>{isAr?'لا توجد خطوات':'No steps'}</div>:
svSt.map(st=>{const fCount=stepFieldCounts[st.id]||0;return<div key={st.id} style={childRow}>
<span style={{fontSize:11,fontWeight:700,color:C.gold,width:20,textAlign:'center',flexShrink:0}}>{st.step_order}</span>
<div style={{flex:1,display:'flex',alignItems:'center',gap:8}}>
<span style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,.7)'}}>{st.step_name_ar}</span>
<span style={{fontSize:10,color:'var(--tx5)',direction:'ltr'}}>{st.step_name_en||''}</span>
{fCount>0&&<span style={{fontSize:8,color:C.ok,background:'rgba(39,160,70,.06)',padding:'1px 5px',borderRadius:4}}>{fCount} {isAr?'حقل':'fields'}</span>}
{fCount===0&&<span style={{fontSize:8,color:'rgba(255,255,255,.2)'}}>—</span>}
</div>
{st.sadad_requirement!=='none'&&<span style={{fontSize:9,color:C.red,background:'rgba(192,57,43,.08)',padding:'2px 7px',borderRadius:6}}>{st.sadad_requirement==='required_blocking'?(isAr?'سداد (حظر)':'Blocking'):st.sadad_requirement==='required_one_step_grace'?(isAr?'سداد (مهلة)':'Grace'):(isAr?'سداد قبل الإنهاء':'Before Complete')}{st.default_sadad_amount?' · '+st.default_sadad_amount:''}</span>}
<div style={{display:'flex',gap:4}}>
<EditBtn onClick={()=>{setForm({_table:'sub_service_steps',_id:st.id,sub_service_id:st.sub_service_id||'',step_name_ar:st.step_name_ar||'',step_name_en:st.step_name_en||'',step_order:st.step_order||'',sadad_requirement:st.sadad_requirement||'none',default_sadad_amount:st.default_sadad_amount||''});setPop('ss')}}/>
<DelBtn onClick={()=>askDel('sub_service_steps',st.id,st.step_name_ar)}/>
</div></div>})}
</div>}
</div>})}</div>}
</div>})
/* Single category filter view */
:<div style={cardS}>{filteredSvcs.map(sv=>{const svSt=subSteps.filter(s=>s.sub_service_id===sv.id);const io=open['sv_'+sv.id];const hasFields=svSt.some(st=>stepFieldCounts[st.id]>0);const txnCount=txnCounts[sv.id]||0
return<div key={sv.id}>
<div style={parentRow} onClick={()=>toggle('sv_'+sv.id)}>
<ArrowIcon isOpen={io}/>
<div style={{flex:1}}>
<div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3,flexWrap:'wrap'}}>
<span style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>{sv.name_ar}</span>
<span style={{fontSize:10,color:'var(--tx5)',direction:'ltr'}}>{sv.name_en||''}</span>
<span style={{fontSize:9,color:sv.service_scope==='client'?C.gold:C.blue,background:sv.service_scope==='client'?'rgba(212,160,23,.08)':'rgba(52,131,180,.08)',padding:'2px 6px',borderRadius:6}}>{sv.service_scope==='client'?(isAr?'خارجي':'External'):(isAr?'داخلي':'Internal')}</span>
{svSt.length>0&&hasFields&&<span style={{fontSize:8,color:C.ok,background:'rgba(39,160,70,.08)',padding:'2px 6px',borderRadius:6}}>✓ {isAr?'جاهزة':'Ready'}</span>}
{svSt.length>0&&!hasFields&&<span style={{fontSize:8,color:'#e67e22',background:'rgba(230,126,34,.08)',padding:'2px 6px',borderRadius:6}}>⚠ {isAr?'بدون حقول':'No Fields'}</span>}
{svSt.length===0&&<span style={{fontSize:8,color:C.red,background:'rgba(192,57,43,.08)',padding:'2px 6px',borderRadius:6}}>✗ {isAr?'بدون خطوات':'No Steps'}</span>}
</div>
<div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
<span style={{fontSize:10,color:'var(--tx5)',background:'rgba(255,255,255,.06)',padding:'2px 8px',borderRadius:8}}>{svSt.length} {isAr?'خطوة':'steps'}</span>
{sv.expected_sla_days&&<span style={{fontSize:9,color:'rgba(255,255,255,.3)'}}>SLA: {sv.expected_sla_days}{isAr?'ي':'d'}</span>}
{sv.default_price>0&&<span style={{fontSize:9,color:C.ok}}>{sv.default_price} {isAr?'ر.س':'SAR'}</span>}
{sv.platform_code&&<span style={{fontSize:8,color:C.blue,background:'rgba(52,131,180,.06)',padding:'1px 5px',borderRadius:4}}>{sv.platform_code}</span>}
{txnCount>0&&<span style={{fontSize:9,color:C.gold,background:'rgba(212,160,23,.06)',padding:'2px 6px',borderRadius:6}}>{txnCount} {isAr?'معاملة':'txn'}</span>}
</div>
</div>
<div style={{display:'flex',gap:4}} onClick={e=>e.stopPropagation()}>
<button onClick={()=>{setForm({_table:'sub_service_steps',step_name_ar:'',step_name_en:'',step_order:'',sadad_requirement:'none',default_sadad_amount:'',sub_service_id:sv.id});setPop('ss')}} style={{height:28,padding:'0 10px',borderRadius:8,border:'1px solid rgba(52,131,180,.25)',background:'rgba(52,131,180,.1)',color:C.blue,fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>{isAr?'خطوة':'Step'}</button>
<EditBtn onClick={()=>{setForm({_table:'sub_services',_id:sv.id,name_ar:sv.name_ar||'',name_en:sv.name_en||'',service_scope:sv.service_scope||'client',sort_order:sv.sort_order||'',notes:sv.notes||''});setPop('sv')}}/>
<DelBtn onClick={()=>askDel('sub_services',sv.id,sv.name_ar)}/>
</div></div>
{io&&<div style={{background:'rgba(255,255,255,.015)'}}>
{svSt.length===0?<div style={{...childRow,color:'var(--tx6)',fontSize:11}}>{isAr?'لا توجد خطوات':'No steps'}</div>:
svSt.map(st=>{const fCount=stepFieldCounts[st.id]||0;return<div key={st.id} style={childRow}>
<span style={{fontSize:11,fontWeight:700,color:C.gold,width:20,textAlign:'center',flexShrink:0}}>{st.step_order}</span>
<div style={{flex:1,display:'flex',alignItems:'center',gap:8}}>
<span style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,.7)'}}>{st.step_name_ar}</span>
<span style={{fontSize:10,color:'var(--tx5)',direction:'ltr'}}>{st.step_name_en||''}</span>
{fCount>0&&<span style={{fontSize:8,color:C.ok,background:'rgba(39,160,70,.06)',padding:'1px 5px',borderRadius:4}}>{fCount} {isAr?'حقل':'fields'}</span>}
</div>
{st.sadad_requirement!=='none'&&<span style={{fontSize:9,color:C.red,background:'rgba(192,57,43,.08)',padding:'2px 7px',borderRadius:6}}>{st.sadad_requirement==='required_blocking'?(isAr?'سداد (حظر)':'Blocking'):st.sadad_requirement==='required_one_step_grace'?(isAr?'سداد (مهلة)':'Grace'):(isAr?'سداد قبل الإنهاء':'Before Complete')}{st.default_sadad_amount?' · '+st.default_sadad_amount:''}</span>}
<div style={{display:'flex',gap:4}}>
<EditBtn onClick={()=>{setForm({_table:'sub_service_steps',_id:st.id,sub_service_id:st.sub_service_id||'',step_name_ar:st.step_name_ar||'',step_name_en:st.step_name_en||'',step_order:st.step_order||'',sadad_requirement:st.sadad_requirement||'none',default_sadad_amount:st.default_sadad_amount||''});setPop('ss')}}/>
<DelBtn onClick={()=>askDel('sub_service_steps',st.id,st.step_name_ar)}/>
</div></div>})}
</div>}
</div>})}</div>}
</>})()}

{/* ═══ TRANSACTION TEMPLATES — WITH STATS ═══ */}
{svcSubTab==='templates'&&<>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
<div style={secS}><span style={{width:6,height:6,borderRadius:'50%',background:C.gold}}/>{isAr?'قوالب المعاملات':'Transaction Templates'}<MetaText t={tplts.length+' '+(isAr?'قالب':'templates')}/></div>
<div style={{display:'flex',gap:6}}>
<button onClick={()=>{setForm({_table:'transaction_templates',name_ar:'',name_en:'',service_scope:'client',sort_order:'',notes:''});setPop('tp')}} style={bS}>{isAr?'قالب':'Template'} +</button>
</div></div>
<div style={cardS}>{tplts.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)',fontSize:12}}>{isAr?'لا توجد قوالب':'No templates'}</div>:
tplts.map(tp=>{const tpLinks=tplLinks.filter(l=>l.template_id===tp.id).sort((a,b)=>a.step_order-b.step_order);const io=open['tp_'+tp.id]
// Count transactions using this template's service_category
const tplTxnCount=Object.values(txnCounts).reduce((s,v)=>s+v,0)>0?tpLinks.reduce((s,lk)=>s+(txnCounts[lk.sub_service_id]||0),0):0
return<div key={tp.id}>
<div style={parentRow} onClick={()=>toggle('tp_'+tp.id)}>
<ArrowIcon isOpen={io}/>
<div style={{flex:1}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
<span style={{fontSize:14,fontWeight:700,color:'var(--tx)'}}>{tp.name_ar}</span>
<span style={{fontSize:11,color:'var(--tx5)',direction:'ltr'}}>{tp.name_en||''}</span>
<span style={{fontSize:9,color:tp.service_scope==='client'?C.gold:C.blue,background:tp.service_scope==='client'?'rgba(212,160,23,.08)':'rgba(52,131,180,.08)',padding:'2px 6px',borderRadius:6}}>{tp.service_scope==='client'?(isAr?'خارجي':'External'):(isAr?'داخلي':'Internal')}</span>
</div>
<div style={{display:'flex',alignItems:'center',gap:6}}>
<span style={{fontSize:10,color:'var(--tx5)',background:'rgba(255,255,255,.06)',padding:'2px 8px',borderRadius:8}}>{tpLinks.length} {isAr?'خدمة فرعية':'sub services'}</span>
{tplTxnCount>0&&<span style={{fontSize:9,color:C.gold,background:'rgba(212,160,23,.06)',padding:'2px 6px',borderRadius:6}}>{tplTxnCount} {isAr?'معاملة':'txn'}</span>}
</div>
</div>
<div style={{display:'flex',gap:4}} onClick={e=>e.stopPropagation()}>
<button onClick={()=>{setForm({_table:'template_sub_services',sub_service_id:'',step_order:'',step_group:'',is_conditional:'false',condition_note:'',template_id:tp.id});setPop('tl')}} style={{height:28,padding:'0 10px',borderRadius:8,border:'1px solid rgba(52,131,180,.25)',background:'rgba(52,131,180,.1)',color:C.blue,fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>{isAr?'ربط خدمة':'Link'}</button>
<EditBtn onClick={()=>{setForm({_table:'transaction_templates',_id:tp.id,name_ar:tp.name_ar||'',name_en:tp.name_en||'',service_scope:tp.service_scope||'client',sort_order:tp.sort_order||'',notes:tp.notes||''});setPop('tp')}}/>
<DelBtn onClick={()=>askDel('transaction_templates',tp.id,tp.name_ar)}/>
</div></div>
{io&&<div style={{background:'rgba(255,255,255,.015)'}}>
{tpLinks.length===0?<div style={{...childRow,color:'var(--tx6)',fontSize:11}}>{isAr?'لا توجد خدمات مربوطة':'No linked services'}</div>:
tpLinks.map(lk=>{const sv=subSvcs.find(s=>s.id===lk.sub_service_id);return<div key={lk.id} style={childRow}>
<span style={{fontSize:11,fontWeight:700,color:C.gold,width:20,textAlign:'center',flexShrink:0}}>{lk.step_order}</span>
<div style={{flex:1,display:'flex',alignItems:'center',gap:8}}>
<span style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,.7)'}}>{sv?sv.name_ar:'—'}</span>
<span style={{fontSize:10,color:'var(--tx5)',direction:'ltr'}}>{sv?sv.name_en:''}</span>
</div>
{lk.is_conditional&&<span style={{fontSize:9,color:'rgba(212,160,23,.7)',background:'rgba(212,160,23,.08)',padding:'2px 7px',borderRadius:6}}>{isAr?'شرطي':'Conditional'}{lk.condition_note?' · '+lk.condition_note.slice(0,30):''}</span>}
{lk.step_group&&<span style={{fontSize:9,color:C.blue,background:'rgba(52,131,180,.08)',padding:'2px 7px',borderRadius:6}}>{isAr?'مجموعة':'Group'} {lk.step_group}</span>}
<div style={{display:'flex',gap:4}}>
<EditBtn onClick={()=>{setForm({_table:'template_sub_services',_id:lk.id,template_id:lk.template_id||'',sub_service_id:lk.sub_service_id||'',step_order:lk.step_order||'',step_group:lk.step_group||'',is_conditional:String(lk.is_conditional||false),condition_note:lk.condition_note||''});setPop('tl')}}/>
<DelBtn onClick={()=>askDel('template_sub_services',lk.id,sv?.name_ar)}/>
</div></div>})}
</div>}
</div>})}</div></>}

{/* ═══ INSTALLMENT PLANS — PER SERVICE ═══ */}
{svcSubTab==='installments'&&<>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
<div style={{fontSize:14,fontWeight:700,color:'var(--tx)'}}>{isAr?'خطط الأقساط لكل خدمة':'Installment Plans per Service'}</div>
<button onClick={()=>{setForm({_table:'service_installment_plans',service_id:'',label_ar:'',label_en:'',installment_order:'1',percentage:'',fixed_amount:'',due_type:'on_request',due_days:'',is_active:'true'});setPop('ip')}} style={bS}>+ {isAr?'إضافة قسط':'Add Plan'}</button>
</div>
<div style={{fontSize:10,color:'var(--tx4)',marginBottom:14}}>{isAr?'حدد لكل خدمة كم قسط ومتى يحل كل قسط (عند الطلب، بعد أيام، عند إنجاز مرحلة، عند الاكتمال)':'Define installment count and due conditions per service'}</div>

{/* Group by service */}
{(()=>{
const svcsWithPlans=[...new Set(instPlans.map(p=>p.service_id))]
const svcsAll=subSvcs.filter(s=>Number(s.default_price||0)>0||svcsWithPlans.includes(s.id))
return<div style={cardS}>
{svcsAll.length===0&&<div style={{padding:20,textAlign:'center',fontSize:11,color:'var(--tx5)'}}>{isAr?'لا توجد خدمات مدفوعة':'No paid services'}</div>}
{svcsAll.map(sv=>{
const plans=instPlans.filter(p=>p.service_id===sv.id).sort((a,b)=>(a.installment_order||0)-(b.installment_order||0))
const isOpen=open['ip_'+sv.id]
return<div key={sv.id}>
<div onClick={()=>toggle('ip_'+sv.id)} style={{...parentRow,justifyContent:'space-between'}}>
<div style={{display:'flex',alignItems:'center',gap:8,flex:1}}>
<ArrowIcon isOpen={isOpen}/>
<span style={{fontSize:12,fontWeight:700,color:'var(--tx)'}}>{sv.name_ar}</span>
<span style={{fontSize:9,color:C.gold,fontWeight:600}}>{sv.default_price?sv.default_price+' ر.س':''}</span>
</div>
<div style={{display:'flex',alignItems:'center',gap:8}}>
{plans.length>0?<span style={{fontSize:9,padding:'2px 8px',borderRadius:5,background:'rgba(39,160,70,.08)',color:C.ok,fontWeight:600}}>{plans.length} {isAr?'قسط':'inst'}</span>
:<span style={{fontSize:9,padding:'2px 8px',borderRadius:5,background:'rgba(255,255,255,.05)',color:'var(--tx5)',fontWeight:500}}>{isAr?'دفع كامل':'Full pay'}</span>}
<button onClick={e=>{e.stopPropagation();setForm({_table:'service_installment_plans',service_id:sv.id,label_ar:'',label_en:'',installment_order:String(plans.length+1),percentage:'',fixed_amount:'',due_type:'on_request',due_days:'',is_active:'true'});setPop('ip')}} style={{width:24,height:24,borderRadius:6,border:'1px solid rgba(212,160,23,.15)',background:'rgba(212,160,23,.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:C.gold,fontFamily:F}}>+</button>
</div>
</div>
{isOpen&&plans.length>0&&<div>
{plans.map((pl,idx)=>{
const dueLabel=pl.due_type==='on_request'?(isAr?'عند رفع الطلب':'On request'):pl.due_type==='after_days'?(isAr?'بعد '+pl.due_days+' يوم':'After '+pl.due_days+' days'):pl.due_type==='on_milestone'?(msList.find(m=>m.id===pl.milestone_id)?.name_ar||(isAr?'مرحلة':'Milestone')):(isAr?'عند الاكتمال':'On completion')
return<div key={pl.id} style={childRow}>
<div style={{width:20,height:20,borderRadius:'50%',background:C.gold,color:C.dk,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:800,flexShrink:0}}>{pl.installment_order||idx+1}</div>
<div style={{flex:1}}>
<span style={{fontSize:12,fontWeight:600,color:'var(--tx)'}}>{pl.label_ar}</span>
<div style={{display:'flex',gap:10,marginTop:2,fontSize:9,color:'var(--tx5)'}}>
{pl.percentage>0&&<span>{pl.percentage}%</span>}
{pl.fixed_amount>0&&<span>{pl.fixed_amount} ر.س</span>}
<span style={{color:C.blue}}>{dueLabel}</span>
</div>
</div>
<BadgeStatus v={pl.is_active} isAr={isAr}/>
<EditBtn onClick={()=>{setForm({_table:'service_installment_plans',_id:pl.id,service_id:pl.service_id,label_ar:pl.label_ar||'',label_en:pl.label_en||'',installment_order:pl.installment_order||'',percentage:pl.percentage||'',fixed_amount:pl.fixed_amount||'',due_type:pl.due_type||'on_request',due_days:pl.due_days||'',milestone_id:pl.milestone_id||'',is_active:String(pl.is_active!==false)});setPop('ip')}}/>
<DelBtn onClick={()=>askDel('service_installment_plans',pl.id,pl.label_ar)}/>
</div>})}
</div>}
{isOpen&&plans.length===0&&<div style={{padding:'12px 42px',fontSize:10,color:'var(--tx5)'}}>{isAr?'لم يتم تعريف أقساط — سيكون الدفع كاملاً':'No installments defined — full payment'}</div>}
</div>})}
</div>})()}
</>}

</div></div>
</>}


{/* FORM POPUP */}
{pop&&popFields[pop]&&<FormPopup title={popTitles[pop]} fields={popFields[pop]} form={form} setForm={setForm} onSave={saveForm} onClose={()=>setPop(null)} saving={saving} isAr={isAr}/>}

{/* DELETE POPUP */}
{delTarget&&<DeletePopup isAr={isAr} itemName={delTarget.name} onConfirm={confirmDel} onCancel={()=>setDelTarget(null)}/>}

</div>}
