import React,{useState,useEffect,useCallback} from 'react'
import {C as FKC, Modal as FKModal, ModalSection as FKSection, ActionButton as FKAction, GRID as FKGRID, FULL as FKFULL, TextField as FKText, TextArea as FKArea, Select as FKSelect, MultiSelect as FKMulti, PhoneField as FKPhone, IdField as FKIdField, TimeField as FKTimeField, CurrencyField as FKCurrency, Switch as FKSwitch, Segmented as FKSegmented, Checkbox as FKCheckbox, RadioGroup as FKRadioGroup, ColorField as FKColor, SuccessView, ConfirmDialog, ScrollBox, InfoRow, InfoGrid} from './components/ui/FormKit.jsx'
import {Building2, MapPin, Phone as PhoneIcon, Mail, CalendarDays, Wallet, StickyNote, ClipboardList, Landmark, CreditCard, Link2, Settings2, User, Users, UserCog, UserCheck, UserX, RefreshCcw, Shield, KeyRound, FileText, Eye, Palette, Activity, LogIn, Languages, ListChecks, Briefcase, AlertTriangle, Info, Pencil} from 'lucide-react'
import PageSkeleton, {Shimmer} from './components/ui/Skeleton.jsx'
const F="'Cairo','Tajawal',sans-serif"
const C={dk:'#171717',fm:'#1e1e1e',gold:'#D4A017',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}
const num=v=>Number(v||0).toLocaleString('en-US')
const roleClrs={'المدير العام':'#e8c547','مدير فرع':'#85B7EB','محاسب':'#AFA9EC','موظف استقبال':'#5DCAA5'}
const daysSince=iso=>{if(!iso)return 0;return Math.floor((Date.now()-new Date(iso).getTime())/86400000)}

const GLASS={background:'linear-gradient(160deg,#333 0%,#2A2A2A 50%,#232323 100%)',backdropFilter:'blur(20px) saturate(160%)',WebkitBackdropFilter:'blur(20px) saturate(160%)',border:'1px solid rgba(255,255,255,.08)',borderRadius:16,boxShadow:'0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}
const fS={width:'100%',height:42,padding:'0 14px',border:'1px solid rgba(255,255,255,.07)',borderRadius:10,fontFamily:F,fontSize:13,fontWeight:500,color:'var(--tx)',outline:'none',background:'linear-gradient(180deg,#323232 0%,#262626 100%)',boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.18s',textAlign:'center',boxSizing:'border-box'}
const bS={height:40,padding:'0 18px',borderRadius:11,border:'1px solid rgba(212,160,23,.45)',background:'linear-gradient(180deg,rgba(212,160,23,.22) 0%,rgba(212,160,23,.10) 100%)',color:C.gold,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:'0 2px 8px rgba(212,160,23,.18), inset 0 1px 0 rgba(212,160,23,.18)',transition:'.2s'}
const sBS={height:40,padding:'0 14px',borderRadius:11,border:'1px solid rgba(255,255,255,.06)',background:'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',color:'rgba(255,255,255,.78)',fontFamily:F,fontSize:12,fontWeight:500,cursor:'pointer',display:'flex',alignItems:'center',gap:10,boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'}
const lblS={fontSize:12,fontWeight:500,color:'var(--tx3)',paddingInlineStart:2,marginBottom:7}
const IB=({l,v,copy,toast,isAr})=>{const[copied,setCopied]=useState(false);return <div style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'14px 16px',border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:9,color:'var(--tx5)',marginBottom:6}}>{l}</div><div style={{display:'flex',alignItems:'center',gap:6}}><div style={{fontSize:14,fontWeight:700,color:'rgba(255,255,255,.85)',direction:copy?'ltr':'inherit'}}>{v||'—'}</div>{copy&&v&&<button onClick={e=>{e.stopPropagation();try{navigator.clipboard.writeText(String(v));setCopied(true);setTimeout(()=>setCopied(false),1200)}catch{}}} onMouseEnter={e=>{if(!copied)e.currentTarget.style.color=C.gold}} onMouseLeave={e=>{if(!copied)e.currentTarget.style.color='var(--tx5)'}} style={{width:20,height:20,borderRadius:5,border:'none',background:'rgba(255,255,255,.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,fontSize:9,color:copied?C.ok:'var(--tx5)',transition:'color .15s'}}>{copied?<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>:<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}</button>}</div></div>}

const BadgeStatus=({v})=><span style={{fontSize:10,fontWeight:600,padding:'3px 8px',borderRadius:6,background:v?'rgba(39,160,70,.1)':'rgba(192,57,43,.1)',color:v?C.ok:C.red}}>{v?'نشط':'معطّل'}</span>

// CustomSelect/DeletePopup أزيلا — كل النوافذ تستخدم FormKit (Select / ConfirmDialog)

// ═══ Main Component ═══
export default function AdminPage({sb,toast,user,lang,onTabChange,defaultTab,nav,hubTabs,visibility,onVisibilityChange}){
const isAr=lang!=='en'
const[tab,setTab]=useState(defaultTab||'branches');useEffect(()=>{if(defaultTab)setTab(defaultTab)},[defaultTab])
const[branches,setBranches]=useState([])
const[users,setUsers]=useState([])
const[roles,setRoles]=useState([])
const[perms,setPerms]=useState([])
const[rolePerms,setRolePerms]=useState([])
const[regions,setRegions]=useState([])
const[cities,setCities]=useState([])
const[loading,setLoading]=useState(false)
const[lLists,setLLists]=useState([])
const[lItems,setLItems]=useState([])
const[bankAccs,setBankAccs]=useState([])
const[q,setQ]=useState('')
const[filterStatus,setFilterStatus]=useState('all')
const[filterRegion,setFilterRegion]=useState('all')
const[pop,setPop]=useState(null)
const[form,setForm]=useState({})
const[selRoles,setSelRoles]=useState([])
const[activateNow,setActivateNow]=useState(true)
const[roleSearch,setRoleSearch]=useState('')
const[reviewUser,setReviewUser]=useState(null)
const[editTab,setEditTab]=useState('roles')
const[editBranch,setEditBranch]=useState('')
const[deactReason,setDeactReason]=useState('')
const[deactNotes,setDeactNotes]=useState('')
const[deactConfirm,setDeactConfirm]=useState('')
const[reactNotify,setReactNotify]=useState(true)
const[roleScope,setRoleScope]=useState('own_branch')
const[roleLevel,setRoleLevel]=useState(2)
const[roleAssignable,setRoleAssignable]=useState(true)
const[roleEscalation,setRoleEscalation]=useState(false)
const[rolePermSearch,setRolePermSearch]=useState('')
const[roleOpenMods,setRoleOpenMods]=useState({})
const[roleWizStep,setRoleWizStep]=useState(1)
const[roleActiveMod,setRoleActiveMod]=useState('')
const[saving,setSaving]=useState(false)
const[saved,setSaved]=useState(false)
const[saveErr,setSaveErr]=useState(null)
const[permErr,setPermErr]=useState(null)
const[delTarget,setDelTarget]=useState(null)
const[viewPop,setViewPop]=useState(null)
const[viewTab,setViewTab]=useState('info')
const[step,setStep]=useState(1)
const[permPop,setPermPop]=useState(null)
const[permSaving,setPermSaving]=useState(false)
const[selPerms,setSelPerms]=useState([])
const[viewUser,setViewUser]=useState(null)
const[userTab,setUserTab]=useState('data')
const[roleFilter,setRoleFilter]=useState('all')
const[attendance,setAttendance]=useState([])
const[loginLogs,setLoginLogs]=useState([])
const[empLangs,setEmpLangs]=useState([])
const[empSpecs,setEmpSpecs]=useState([])
const[userTasks,setUserTasks]=useState([])
const[perfData,setPerfData]=useState([])
const[allAttendance,setAllAttendance]=useState([])
const[perfSort,setPerfSort]=useState('performance_score')
const[perfBranch,setPerfBranch]=useState(null)
const[attBranch,setAttBranch]=useState(null)
const[attDate,setAttDate]=useState(new Date().toISOString().slice(0,10))

useEffect(()=>{onTabChange&&onTabChange({tab,svcSubTab:tab})},[tab,onTabChange])

const loadAll=useCallback(async()=>{
setLoading(true)
const[br,us,rl,pm,rp,rg,ct,ll,li,ba]=await Promise.all([
sb.from('branches').select('*').is('deleted_at',null).order('name_ar'),
sb.from('users').select('*,user_roles!user_roles_user_id_fkey(roles(name_ar,name_en,color))').is('deleted_at',null).order('name_ar'),
sb.from('roles').select('*').is('deleted_at',null).order('name_ar'),
sb.from('permission_templates').select('*').order('module').order('action'),
sb.from('role_permissions').select('*'),
sb.from('regions').select('*').order('sort_order').order('name_ar'),
sb.from('cities').select('*').order('sort_order').order('name_ar'),
sb.from('lookup_categories').select('*').order('name_ar'),
sb.from('lookup_items').select('*').order('sort_order'),
sb.from('bank_accounts').select('*').order('is_primary',{ascending:false}).order('bank_name')
])
setBranches(br.data||[]);setUsers((us.data||[]).map(u=>({...u,roles:u.user_roles?.[0]?.roles||null})));setRoles(rl.data||[]);setPerms(pm.data||[]);setRolePerms(rp.data||[]);setRegions(rg.data||[]);setCities(ct.data||[]);setLLists(ll.data||[]);setLItems(li.data||[]);setBankAccs(ba.data||[])
if(defaultTab==='users'){
sb.from('v_employee_performance_detailed').select('*').then(({data:pd})=>setPerfData(pd||[]))
sb.from('attendance').select('*').order('date',{ascending:false}).limit(200).then(({data:ad})=>setAllAttendance(ad||[]))
}
setLoading(false)
},[sb])
useEffect(()=>{loadAll()},[loadAll])
useEffect(()=>{if(!viewUser||!sb)return;const uid=viewUser.id
Promise.all([
sb.from('attendance').select('*').eq('user_id',uid).order('date',{ascending:false}).limit(20),
sb.from('login_log').select('*').eq('user_id',uid).order('created_at',{ascending:false}).limit(10),
sb.from('employee_languages').select('*').eq('user_id',uid),
sb.from('employee_specialties').select('*').eq('user_id',uid),
sb.from('task_assignees').select('*,tasks:task_id(title,status,priority,due_date)').eq('user_id',uid)
]).then(([at,ll,el,es,ta])=>{setAttendance(at.data||[]);setLoginLogs(ll.data||[]);setEmpLangs(el.data||[]);setEmpSpecs(es.data||[]);setUserTasks((ta.data||[]).filter(t=>t.tasks))})},[viewUser,sb])

const saveForm=async()=>{setSaving(true);setSaveErr(null);try{const t=form._table;const id=form._id;const d={...form};delete d._table;delete d._id;Object.keys(d).forEach(k=>{if(d[k]==='')d[k]=null})
if(d.is_active!==undefined&&d.is_active!==null)d.is_active=d.is_active==='true'
if(d.is_system!==undefined&&d.is_system!==null)d.is_system=d.is_system==='true'
if(d.is_primary!==undefined&&d.is_primary!==null)d.is_primary=d.is_primary==='true'
if(t==='branches'&&d.mobile)d.mobile='+966'+d.mobile.replace(/^\+966/,'')
if(t==='branches'&&d.code){const c=cities.find(x=>x.id===d.city_id);const prefix=c?(c.code||c.name_ar?.slice(0,3)):'';d.code=prefix+'-'+d.code.replace(/^.*-/,'')}
if(id){d.updated_by=user?.id;const{error}=await sb.from(t).update(d).eq('id',id);if(error)throw error;toast(isAr?'تم التعديل':'Updated')}
else{d.created_by=user?.id;const{error}=await sb.from(t).insert(d);if(error)throw error;toast(isAr?'تمت الإضافة':'Added')}
setSaved(true);setTimeout(()=>{setSaved(false);setPop(null);loadAll()},1400)}catch(e){setSaveErr((isAr?'خطأ: ':'Error: ')+e.message?.slice(0,80))}setSaving(false)}

const confirmDel=async()=>{if(!delTarget)return;const{table,id}=delTarget
await sb.from(table).update({deleted_at:new Date().toISOString(),deleted_by:user?.id}).eq('id',id)
toast(isAr?'تم الحذف':'Deleted');setDelTarget(null);loadAll()}

const savePerms=async()=>{if(!permPop)return;setPermSaving(true);setPermErr(null);try{
await sb.from('role_permissions').delete().eq('role_id',permPop)
if(selPerms.length>0){const ins=selPerms.map(pid=>({role_id:permPop,permission_id:pid}));const{error}=await sb.from('role_permissions').insert(ins);if(error)throw error}
toast(isAr?'تم حفظ الصلاحيات':'Permissions saved');setSaved(true);setTimeout(()=>{setSaved(false);setPermPop(null);loadAll()},1400)
}catch(e){setPermErr((isAr?'خطأ: ':'Error: ')+e.message?.slice(0,80))}setPermSaving(false)}

const getRef=(id,list,ak='name_ar')=>{const r=list.find(x=>x.id===id);return r?r[ak]:'—'}

// ═══ STATS ═══
const brActive=branches.filter(b=>b.is_active).length
const brInactive=branches.filter(b=>!b.is_active).length
const totalUsers=users.length
const usActive=users.filter(u=>u.is_active).length
const usInactive=users.filter(u=>!u.is_active).length
const baActive=bankAccs.filter(a=>a.is_active).length
const baInactive=bankAccs.filter(a=>!a.is_active).length
const baDeposit=bankAccs.filter(a=>a.account_type==='deposit').length
const baSadad=bankAccs.filter(a=>a.account_type==='sadad').length
const baIntl=bankAccs.filter(a=>a.account_type==='international').length

// ═══ FILTERS ═══
const filteredBranches=branches.filter(b=>{
if(filterStatus==='active'&&!b.is_active)return false
if(filterStatus==='inactive'&&b.is_active)return false
if(filterRegion!=='all'&&b.region_id!==filterRegion)return false
if(!q)return true
const s=q.toLowerCase()
return(b.name_ar||'').includes(s)||(b.name_en||'').toLowerCase().includes(s)||(b.code||'').toLowerCase().includes(s)||(b.mobile||'').includes(s)||(b.email||'').toLowerCase().includes(s)
})

const allTabs=[{id:'branches',l:'المكاتب',le:'Branches'},{id:'bank_accounts',l:'الحسابات البنكية',le:'Bank Accounts'},{id:'users',l:'الموظفين',le:'Users'},{id:'roles',l:'الأدوار والصلاحيات',le:'Roles & Permissions'},{id:'ui_controls',l:'التحكم بالعرض',le:'UI Controls'}];const tabs=defaultTab==='users'?[{id:'users',l:'الموظفين'},{id:'performance',l:'الأداء'},{id:'attendance_tab',l:'الحضور'},{id:'roles',l:'الأدوار والصلاحيات'},{id:'ui_controls',l:'التحكم بالعرض'}]:allTabs

const openAdd=()=>{setForm({_table:'branches',name_ar:'',name_en:'',code:'',region_id:'',city_id:'',mobile:'',email:'',color:'#c9a84c',manager_id:'',work_from:'08:00',work_to:'17:00',work_days:'الأحد,الاثنين,الثلاثاء,الأربعاء,الخميس',opening_balance:'',daily_cash_limit:'',is_active:'true',address:'',google_maps_url:'',notes:''});setStep(1);setPop('add')}
const openEdit=(b)=>{setForm({_table:'branches',_id:b.id,name_ar:b.name_ar||'',name_en:b.name_en||'',code:b.code?b.code.split('-').pop():'',region_id:b.region_id||'',city_id:b.city_id||'',mobile:b.mobile?b.mobile.replace('+966',''):'',email:b.email||'',color:b.color||'#c9a84c',manager_id:b.manager_id||'',work_from:b.work_from||'08:00',work_to:b.work_to||'17:00',work_days:b.work_days||'الأحد,الاثنين,الثلاثاء,الأربعاء,الخميس',opening_balance:b.opening_balance||'',daily_cash_limit:b.daily_cash_limit||'',is_active:String(b.is_active!==false),address:b.address||'',google_maps_url:b.google_maps_url||'',notes:b.notes||''});setStep(1);setPop('edit')}

const permModules=[...new Set(perms.map(p=>p.module))]

return<div>
<div style={{marginBottom:24,display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:14,flexWrap:'wrap'}}>
<div style={{flex:1,minWidth:0}}>
{!defaultTab&&<>
<div style={{fontSize:24,fontWeight:600,color:'rgba(255,255,255,.93)',letterSpacing:'-.3px',lineHeight:1.2}}>الإدارة</div>
<div style={{fontSize:13,fontWeight:500,color:'var(--tx4)',marginTop:12,lineHeight:1.6}}>إدارة المكاتب والموظفين والأدوار والصلاحيات</div>
</>}
</div>
{tab!=='users'&&<button onClick={()=>{
if(tab==='branches')openAdd()
else if(tab==='bank_accounts'){setForm({_table:'bank_accounts',bank_name:'',account_name:'',account_number:'',iban:'',swift_code:'',account_type:'deposit',branch_id:'',is_primary:'false',is_active:'true',notes:''});setPop('add_bank')}
else if(tab==='roles'){setForm({_table:'roles',name_ar:'',name_en:'',description:'',color:'',is_active:'true'});setPop('add_role')}
}} style={bS}>{{branches:'مكتب +',bank_accounts:'حساب بنكي +',roles:'دور +'}[tab]}</button>}
</div>


{!defaultTab&&<div style={{display:'flex',gap:0,borderBottom:'1px solid rgba(255,255,255,.07)',marginBottom:18,overflowX:'auto',scrollbarWidth:'none'}}>
{[...tabs].map(t=>{const sel=tab===t.id;return<div key={t.id} onClick={()=>{setTab(t.id);setQ('');setFilterStatus('all');setFilterRegion('all')}} style={{padding:'10px 22px 9px',cursor:'pointer',color:sel?C.gold:'var(--tx4)',fontFamily:F,fontSize:13,fontWeight:sel?600:500,borderBottom:sel?'2px solid '+C.gold:'2px solid transparent',marginBottom:-1,transition:'.2s',letterSpacing:'-.2px',whiteSpace:'nowrap'}}>{t.l}</div>})}
</div>}
<div style={{display:'flex',gap:0}}>
<div style={{flex:1,minWidth:0}}>

{/* ═══════════════ BRANCHES TAB ═══════════════ */}
{tab==='branches'&&<>
{/* Search + Filters */}
<div style={{display:'flex',gap:10,marginBottom:18,flexWrap:'wrap'}}>
<div style={{flex:1,minWidth:200,position:'relative'}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2" style={{position:'absolute',top:'50%',transform:'translateY(-50%)',right:14}}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
<input value={q} onChange={e=>setQ(e.target.value)} placeholder="بحث بالاسم، الكود، الجوال، البريد..." style={{width:'100%',height:40,padding:'0 38px 0 14px',background:'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',border:'1px solid rgba(255,255,255,.06)',borderRadius:11,fontFamily:F,fontSize:14,fontWeight:400,color:'var(--tx)',outline:'none',boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s',textAlign:'right',boxSizing:'border-box'}}/>
</div>
{[['all','الكل'],['active','نشط'],['inactive','معطّل']].map(([k,l])=>{const sel=filterStatus===k;return<div key={k} onClick={()=>setFilterStatus(k)} style={{height:40,padding:'0 14px',borderRadius:11,border:'1px solid '+(sel?'rgba(212,160,23,.45)':'rgba(255,255,255,.06)'),background:sel?'linear-gradient(180deg,rgba(212,160,23,.22) 0%,rgba(212,160,23,.10) 100%)':'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',color:sel?C.gold:'rgba(255,255,255,.78)',fontFamily:F,fontSize:12,fontWeight:sel?600:500,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:sel?'0 2px 8px rgba(212,160,23,.18), inset 0 1px 0 rgba(212,160,23,.18)':'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'}}>{l}</div>})}
{regions.length>0&&<select value={filterRegion} onChange={e=>setFilterRegion(e.target.value)} style={{...sBS,width:160,cursor:'pointer'}}>
<option value="all">كل المناطق</option>
{regions.map(r=><option key={r.id} value={r.id}>{r.name_ar}</option>)}
</select>}
</div>

{/* Branch Cards */}
{loading&&branches.length===0?<div style={{fontFamily:F}}>
<style>{`@keyframes sk-shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}`}</style>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
{Array.from({length:6}).map((_,i)=><div key={i} style={{background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',border:'1px solid rgba(255,255,255,.05)',borderRadius:16,overflow:'hidden'}}>
<div style={{height:3,background:'rgba(255,255,255,.06)'}}/>
<div style={{padding:'14px 16px 12px'}}>
<div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
<Shimmer w={38} h={38} r={10}/>
<div style={{flex:1,display:'flex',flexDirection:'column',gap:6}}><Shimmer w="60%" h={13}/><Shimmer w="40%" h={9}/></div>
<Shimmer w={44} h={18} r={6}/>
</div>
<div style={{display:'flex',flexDirection:'column',gap:8}}><Shimmer w="55%" h={10}/><Shimmer w="70%" h={10}/></div>
</div>
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 16px',borderTop:'1px solid rgba(255,255,255,.05)',background:'rgba(255,255,255,.015)'}}>
<Shimmer w={120} h={11}/>
<div style={{display:'flex',gap:4}}><Shimmer w={28} h={28} r={7}/><Shimmer w={28} h={28} r={7}/></div>
</div>
</div>)}
</div>
</div>:
filteredBranches.length===0?<div style={{textAlign:'center',padding:60,color:'var(--tx6)',fontSize:13}}>لا توجد مكاتب</div>:
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
{filteredBranches.map(b=>{const bUsers=users.filter(u=>u.branch_id===b.id);const reg=regions.find(r=>r.id===b.region_id);const cit=cities.find(c=>c.id===b.city_id);const accent=b.color||C.gold
return<div key={b.id} onClick={()=>{setViewTab('info');setViewPop(b)}} onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 16px 36px rgba(0,0,0,.42), 0 4px 10px rgba(0,0,0,.22), 0 0 0 1px '+accent+'33, inset 0 1px 0 rgba(255,255,255,.08)'}} onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}} style={{...GLASS,overflow:'hidden',cursor:'pointer',transition:'.2s'}}>
<div style={{height:3,background:b.color||C.gold}}/>
<div style={{padding:'14px 16px 12px'}}>
{/* Header: icon + names + code + status */}
<div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
<div style={{width:38,height:38,borderRadius:10,background:(b.color||C.gold)+'18',border:'1.5px solid '+(b.color||C.gold)+'30',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
<span style={{fontSize:15,fontWeight:800,color:b.color||C.gold}}>{b.name_ar?.[0]}</span>
</div>
<div style={{flex:1,minWidth:0}}>
<div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
<span style={{fontSize:14,fontWeight:700,color:'var(--tx)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.name_ar}</span>
{b.code&&<span style={{fontSize:8,fontWeight:700,color:b.color||C.gold,background:(b.color||C.gold)+'12',padding:'2px 6px',borderRadius:5,fontFamily:'monospace',direction:'ltr',flexShrink:0}}>{b.code}</span>}
</div>
{b.name_en&&<div style={{fontSize:10,color:'rgba(255,255,255,.28)',direction:'ltr',textAlign:'right'}}>{b.name_en}</div>}
</div>
<BadgeStatus v={b.is_active}/>
</div>

{/* Info: location + contact */}
<div style={{display:'flex',flexDirection:'column',gap:6}}>
{(reg||cit)&&<div style={{display:'flex',alignItems:'center',gap:5,fontSize:10,color:'var(--tx4)'}}>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
{reg?.name_ar||''}{reg&&cit?'، ':''}{cit?.name_ar||''}
</div>}
{(b.mobile||b.email)&&<div style={{display:'flex',alignItems:'center',gap:12,fontSize:10,color:'var(--tx4)',direction:'ltr'}}>
{b.mobile&&<span style={{display:'flex',alignItems:'center',gap:4}}>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
{b.mobile}</span>}
{b.email&&<span style={{display:'flex',alignItems:'center',gap:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="2" style={{flexShrink:0}}><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7"/></svg>
{b.email}</span>}
</div>}
</div>
</div>

{/* Footer */}
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 16px',borderTop:'1px solid rgba(255,255,255,.05)',background:'rgba(255,255,255,.015)'}}>
<div style={{display:'flex',alignItems:'center',gap:14}}>
<div style={{display:'flex',alignItems:'center',gap:4}}>
<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={bUsers.length>0?C.blue:'rgba(255,255,255,.18)'} strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0116 0v1"/></svg>
<span style={{fontSize:10,fontWeight:600,color:bUsers.length>0?C.blue:'rgba(255,255,255,.2)'}}>{bUsers.length} موظف</span>
</div>
<div style={{display:'flex',alignItems:'center',gap:4}}>
<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
<span style={{fontSize:9,color:'var(--tx5)',direction:'ltr'}}>{b.work_from||'08:00'} - {b.work_to||'17:00'}</span>
</div>
</div>
<div style={{display:'flex',gap:4}} onClick={e=>e.stopPropagation()}>
<button title="تعديل" onClick={()=>openEdit(b)} style={{width:28,height:28,borderRadius:7,border:'1px solid rgba(201,168,76,.15)',background:'rgba(201,168,76,.08)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>
<button title={isAr?(b.is_active?'تعطيل المكتب':'تفعيل المكتب'):(b.is_active?'Disable branch':'Enable branch')} onClick={async()=>{await sb.from('branches').update({is_active:!b.is_active}).eq('id',b.id);toast(isAr?(b.is_active?'تم تعطيل المكتب':'تم تفعيل المكتب'):(b.is_active?'Branch disabled':'Branch enabled'));loadAll()}} style={{width:28,height:28,borderRadius:7,border:'1px solid '+(b.is_active?'rgba(192,57,43,.15)':'rgba(39,160,70,.15)'),background:b.is_active?'rgba(192,57,43,.06)':'rgba(39,160,70,.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{b.is_active?<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.ok} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}</button>
</div>
</div>
</div>})}
</div>}
</>}

{/* ═══════════════ BANK ACCOUNTS TAB ═══════════════ */}
{tab==='bank_accounts'&&(()=>{const filtBA=bankAccs.filter(a=>{
if(filterStatus==='active'&&!a.is_active)return false;if(filterStatus==='inactive'&&a.is_active)return false
if(filterRegion!=='all'&&a.account_type!==filterRegion)return false
if(!q)return true;const s=q.toLowerCase();return(a.bank_name||'').includes(s)||(a.account_name||'').includes(s)||(a.iban||'').includes(s)||(a.account_number||'').includes(s)
});return<>
<div style={{display:'flex',gap:10,marginBottom:18,flexWrap:'wrap'}}>
<div style={{flex:1,minWidth:200,position:'relative'}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2" style={{position:'absolute',top:'50%',transform:'translateY(-50%)',right:14}}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
<input value={q} onChange={e=>setQ(e.target.value)} placeholder="بحث بالبنك، الآيبان، رقم الحساب..." style={{width:'100%',height:40,padding:'0 38px 0 14px',background:'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',border:'1px solid rgba(255,255,255,.06)',borderRadius:11,fontFamily:F,fontSize:14,fontWeight:400,color:'var(--tx)',outline:'none',boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s',textAlign:'right',boxSizing:'border-box'}}/>
</div>
{[['all','الكل'],['active','نشط'],['inactive','معطّل']].map(([k,l])=>{const sel=filterStatus===k;return<div key={k} onClick={()=>setFilterStatus(k)} style={{height:40,padding:'0 14px',borderRadius:11,border:'1px solid '+(sel?'rgba(212,160,23,.45)':'rgba(255,255,255,.06)'),background:sel?'linear-gradient(180deg,rgba(212,160,23,.22) 0%,rgba(212,160,23,.10) 100%)':'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',color:sel?C.gold:'rgba(255,255,255,.78)',fontFamily:F,fontSize:12,fontWeight:sel?600:500,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:sel?'0 2px 8px rgba(212,160,23,.18), inset 0 1px 0 rgba(212,160,23,.18)':'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'}}>{l}</div>})}
{[['all','الكل',C.gold],['deposit','إيداع',C.gold],['sadad','سداد',C.blue],['international','خارجي',C.ok]].map(([k,l,c])=>{const sel=filterRegion===k;return<div key={k} onClick={()=>setFilterRegion(k)} style={{height:40,padding:'0 14px',borderRadius:11,border:'1px solid '+(sel?c+'66':'rgba(255,255,255,.06)'),background:sel?'linear-gradient(180deg,'+c+'33 0%,'+c+'14 100%)':'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',color:sel?c:'rgba(255,255,255,.78)',fontFamily:F,fontSize:12,fontWeight:sel?600:500,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:sel?'0 2px 8px '+c+'2a, inset 0 1px 0 '+c+'22':'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'}}>{l}</div>})}
</div>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
{filtBA.map(a=>{const br=branches.find(b=>b.id===a.branch_id);const typeMap={deposit:{l:'إيداع',c:C.gold},sadad:{l:'سداد',c:C.blue},international:{l:'حوالات خارجية',c:C.ok}};const tp=typeMap[a.account_type]||typeMap.deposit
return<div key={a.id} onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 16px 36px rgba(0,0,0,.42), 0 4px 10px rgba(0,0,0,.22), 0 0 0 1px '+tp.c+'33, inset 0 1px 0 rgba(255,255,255,.08)'}} onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}} style={{...GLASS,overflow:'hidden',transition:'.2s'}}>
<div style={{height:3,background:tp.c}}/>
<div style={{padding:'14px 16px'}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
<div style={{width:36,height:36,borderRadius:10,background:tp.c+'15',border:'1px solid '+tp.c+'25',display:'flex',alignItems:'center',justifyContent:'center'}}>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={tp.c} strokeWidth="1.8"><rect x="2" y="6" width="20" height="14" rx="3"/><path d="M2 10h20"/><circle cx="7" cy="15" r="1.5"/></svg>
</div>
<div style={{flex:1}}>
<div style={{display:'flex',alignItems:'center',gap:6}}>
<span style={{fontSize:14,fontWeight:700,color:'var(--tx)'}}>{a.bank_name}</span>
{a.is_primary&&<span style={{fontSize:8,color:C.gold,background:'rgba(201,168,76,.1)',padding:'2px 6px',borderRadius:6,fontWeight:700}}>رئيسي</span>}
</div>
{a.account_name&&<div style={{fontSize:10,color:'var(--tx5)',marginTop:2}}>{a.account_name}</div>}
</div>
<span style={{fontSize:9,color:tp.c,background:tp.c+'12',padding:'3px 8px',borderRadius:6,fontWeight:700}}>{tp.l}</span>
</div>

<div style={{display:'flex',flexDirection:'column',gap:5,marginBottom:10}}>
{a.account_number&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<span style={{fontSize:10,color:'var(--tx4)'}}>رقم الحساب</span>
<span style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,.7)',direction:'ltr',fontFamily:'monospace'}}>{a.account_number}</span>
</div>}
{a.iban&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<span style={{fontSize:10,color:'var(--tx4)'}}>IBAN</span>
<span style={{fontSize:10,fontWeight:600,color:'var(--tx3)',direction:'ltr',fontFamily:'monospace'}}>{a.iban}</span>
</div>}
{a.swift_code&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<span style={{fontSize:10,color:'var(--tx4)'}}>SWIFT</span>
<span style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,.6)',direction:'ltr',fontFamily:'monospace'}}>{a.swift_code}</span>
</div>}
{br&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<span style={{fontSize:10,color:'var(--tx4)'}}>المكتب</span>
<span style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,.6)'}}>{br.name_ar}</span>
</div>}
</div>

<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:8,borderTop:'1px solid rgba(255,255,255,.05)'}}>
<BadgeStatus v={a.is_active}/>
<div style={{display:'flex',gap:3}}>
<button onClick={()=>{setForm({_table:'bank_accounts',_id:a.id,bank_name:a.bank_name||'',account_name:a.account_name||'',account_number:a.account_number||'',iban:a.iban||'',swift_code:a.swift_code||'',account_type:a.account_type||'deposit',branch_id:a.branch_id||'',is_primary:String(a.is_primary===true),is_active:String(a.is_active!==false),notes:a.notes||''});setPop('edit_bank')}} style={{width:26,height:26,borderRadius:6,border:'1px solid rgba(201,168,76,.15)',background:'rgba(201,168,76,.08)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>
<button onClick={async()=>{await sb.from('bank_accounts').update({is_active:!a.is_active}).eq('id',a.id);toast(isAr?(a.is_active?'تم تعطيل الحساب':'تم تفعيل الحساب'):(a.is_active?'Account disabled':'Account enabled'));loadAll()}} style={{width:26,height:26,borderRadius:6,border:'1px solid '+(a.is_active?'rgba(192,57,43,.15)':'rgba(39,160,70,.15)'),background:a.is_active?'rgba(192,57,43,.04)':'rgba(39,160,70,.04)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{a.is_active?<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>:<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.ok} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}</button>
</div>
</div>
</div></div>})}
</div>
</>})()}

{/* ═══════════════ USERS TAB ═══════════════ */}
{tab==='users'&&(()=>{
const statusOf=u=>u.is_active?'active':(u.last_login_at?'inactive':'pending');
const pending=users.filter(u=>statusOf(u)==='pending');
const activeUsers=users.filter(u=>statusOf(u)==='active');
const disabled=users.filter(u=>statusOf(u)==='inactive');
const filtUsers=users.filter(u=>{
const st=statusOf(u);
if(filterStatus==='active'&&st!=='active')return false;
if(filterStatus==='pending'&&st!=='pending')return false;
if(filterStatus==='inactive'&&st!=='inactive')return false;
if(filterRegion!=='all'&&u.branch_id!==filterRegion)return false;
if(!q)return true;
const s=q.toLowerCase();
return(u.name_ar||'').includes(s)||(u.name_en||'').toLowerCase().includes(s)||(u.email||'').toLowerCase().includes(s)||(u.phone||'').includes(s)||(u.id_number||'').includes(s);
});
const roleCounts={};users.forEach(u=>{if(u.roles?.name_ar){roleCounts[u.roles.name_ar]=(roleCounts[u.roles.name_ar]||0)+1}});
const gmCount=roleCounts['المدير العام']||0;
const otherRoles=Object.keys(roleCounts).filter(k=>k!=='المدير العام').length;
const usedBranches=[...new Set(users.filter(u=>u.branch_id).map(u=>{const b=branches.find(br=>br.id===u.branch_id);return b?.name_ar}).filter(Boolean))];
const relTime=iso=>{if(!iso)return'—';const d=new Date(iso);const diff=(Date.now()-d.getTime())/1000;if(diff<60)return'الآن';if(diff<3600)return'قبل '+Math.floor(diff/60)+' دقيقة';if(diff<86400)return'قبل '+Math.floor(diff/3600)+' ساعات';if(diff<172800)return'أمس';if(diff<604800)return'قبل '+Math.floor(diff/86400)+' أيام';if(diff<2592000)return'قبل '+Math.floor(diff/604800)+' أسبوعين';return d.toISOString().slice(0,10)};
const ago=iso=>{if(!iso)return'—';const d=new Date(iso);const diff=(Date.now()-d.getTime())/1000;if(diff<86400)return'اليوم';if(diff<172800)return'أمس';if(diff<604800)return'قبل '+Math.floor(diff/86400)+' أيام';return''};
return <div>
<div style={{position:'absolute',top:4,left:0,zIndex:5}}>
<button onClick={()=>{setForm({_table:'roles',name_ar:'',name_en:'',code:'',description:'',color:'#3483b4',is_active:'true',level:2});setSelPerms([]);setRoleScope('own_branch');setRoleLevel(2);setRoleAssignable(true);setRoleEscalation(false);setRolePermSearch('');setRoleOpenMods({});setRoleWizStep(1);setRoleActiveMod('');setPop('add_role_full')}} style={bS}>
إضافة دور وصلاحيات
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
</button>
</div>
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:18}}>
<div style={{...GLASS,padding:'16px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
<div style={{width:38,height:38,borderRadius:11,background:'linear-gradient(180deg,rgba(39,160,70,.18) 0%,rgba(39,160,70,.06) 100%)',border:'1px solid rgba(39,160,70,.25)',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.ok} strokeWidth="2"><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/></svg></div>
<div style={{textAlign:'left',flex:1}}>
<div style={{fontSize:12,color:'var(--tx4)',fontWeight:500}}>إجمالي الموظفين</div>
<div style={{fontSize:24,fontWeight:700,color:'rgba(255,255,255,.93)',lineHeight:1.1,marginTop:4,letterSpacing:'-.3px'}}>{users.length}</div>
<div style={{fontSize:10,marginTop:6,display:'flex',gap:8}}>
<span style={{color:C.ok}}>● {activeUsers.length} نشط</span>
<span style={{color:C.red}}>● {disabled.length} معطل</span>
<span style={{color:'#b8722a'}}>● {pending.length} بانتظار</span>
</div>
</div>
</div>
<div style={{...GLASS,padding:'16px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,...(pending.length>0?{boxShadow:'0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), 0 0 0 1px rgba(184,114,42,.22), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}:{})}}>
<div style={{width:38,height:38,borderRadius:11,background:'linear-gradient(180deg,rgba(184,114,42,.18) 0%,rgba(184,114,42,.06) 100%)',border:'1px solid rgba(184,114,42,.25)',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b8722a" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
<div style={{textAlign:'left',flex:1}}>
<div style={{fontSize:12,color:'var(--tx4)',fontWeight:500}}>بانتظار الموافقة</div>
<div style={{fontSize:24,fontWeight:700,color:'rgba(255,255,255,.93)',lineHeight:1.1,marginTop:4,letterSpacing:'-.3px'}}>{pending.length}</div>
<div style={{fontSize:10,marginTop:6,color:pending.length>0?'#b8722a':'var(--tx5)'}}>{pending.length>0?'يحتاج مراجعة منك →':'لا يوجد طلبات'}</div>
</div>
</div>
<div style={{...GLASS,padding:'16px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
<div style={{width:38,height:38,borderRadius:11,background:'linear-gradient(180deg,rgba(52,131,180,.18) 0%,rgba(52,131,180,.06) 100%)',border:'1px solid rgba(52,131,180,.25)',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
<div style={{textAlign:'left',flex:1}}>
<div style={{fontSize:12,color:'var(--tx4)',fontWeight:500}}>الأدوار المعيّنة</div>
<div style={{fontSize:24,fontWeight:700,color:'rgba(255,255,255,.93)',lineHeight:1.1,marginTop:4,letterSpacing:'-.3px'}}>{Object.keys(roleCounts).length}</div>
<div style={{fontSize:10,marginTop:6,color:'var(--tx5)'}}>{gmCount>0?gmCount+' مدير عام · ':''}{otherRoles} أدوار أخرى</div>
</div>
</div>
<div style={{...GLASS,padding:'16px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
<div style={{width:38,height:38,borderRadius:11,background:'linear-gradient(180deg,rgba(39,160,70,.18) 0%,rgba(39,160,70,.06) 100%)',border:'1px solid rgba(39,160,70,.25)',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.ok} strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg></div>
<div style={{textAlign:'left',flex:1,minWidth:0}}>
<div style={{fontSize:12,color:'var(--tx4)',fontWeight:500}}>توزيع الفروع</div>
<div style={{fontSize:24,fontWeight:700,color:'rgba(255,255,255,.93)',lineHeight:1.1,marginTop:4,letterSpacing:'-.3px'}}>{usedBranches.length}</div>
<div style={{fontSize:10,marginTop:6,color:'var(--tx5)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{usedBranches.join(' · ')||'—'}</div>
</div>
</div>
</div>
{pending.length>0?<div style={{...GLASS,padding:'16px 18px',display:'flex',alignItems:'center',gap:14,marginBottom:16,boxShadow:'0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), 0 0 0 1px rgba(212,160,23,.22), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}}>
<div style={{width:40,height:40,borderRadius:11,background:'linear-gradient(180deg,rgba(212,160,23,.22) 0%,rgba(212,160,23,.06) 100%)',border:'1px solid rgba(212,160,23,.3)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg></div>
<div style={{flex:1}}>
<div style={{fontSize:13,fontWeight:600,color:'var(--tx2)',marginBottom:4}}>طلب تسجيل جديد بحاجة للمراجعة</div>
<div style={{fontSize:11,color:'var(--tx4)',lineHeight:1.6}}>{pending[0].name_ar} سجّل حساب جديد بتاريخ {new Date(pending[0].created_at).toLocaleDateString('ar-SA',{day:'numeric',month:'long',year:'numeric'})}. قم بتعيين دور وتفعيل الحساب للسماح بالدخول.</div>
</div>
<button onClick={()=>{setReviewUser(pending[0]);setSelRoles([]);setActivateNow(true);setRoleSearch('');setForm({branch_id:pending[0].branch_id||'',notes:''});setPop('review_pending')}} style={{...bS,flexShrink:0}}>مراجعة الطلب</button>
</div>:null}
<div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
<div style={{flex:1,minWidth:260,position:'relative'}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2" style={{position:'absolute',top:'50%',transform:'translateY(-50%)',right:14}}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
<input value={q} onChange={e=>setQ(e.target.value)} placeholder="بحث بالاسم، البريد، الجوال، أو رقم الهوية..." style={{width:'100%',height:40,padding:'0 38px 0 14px',background:'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',border:'1px solid rgba(255,255,255,.06)',borderRadius:11,fontFamily:F,fontSize:14,fontWeight:400,color:'var(--tx)',outline:'none',boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s',textAlign:'right',boxSizing:'border-box'}}/>
</div>
{[['all','الكل',users.length,C.gold],['active','نشط',activeUsers.length,C.ok],['pending','بانتظار',pending.length,'#b8722a'],['inactive','معطل',disabled.length,C.red]].map(([k,l,n,c])=>{const sel=filterStatus===k;return<div key={k} onClick={()=>setFilterStatus(k)} style={{height:40,padding:'0 14px',borderRadius:11,fontSize:12,fontWeight:sel?600:500,color:sel?c:'rgba(255,255,255,.78)',background:sel?'linear-gradient(180deg,'+c+'33 0%,'+c+'14 100%)':'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',border:'1px solid '+(sel?c+'66':'rgba(255,255,255,.06)'),cursor:'pointer',whiteSpace:'nowrap',fontFamily:F,display:'flex',alignItems:'center',gap:8,boxShadow:sel?'0 2px 8px '+c+'2a, inset 0 1px 0 '+c+'22':'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'}}><span>{l}</span><span style={{fontSize:10,padding:'1px 6px',borderRadius:10,background:sel?c+'33':'rgba(255,255,255,.06)',color:sel?c:'var(--tx4)',fontWeight:600}}>{n}</span></div>})}
</div>
{filtUsers.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)'}}>لا يوجد موظفين</div>:<div style={{...GLASS,overflow:'hidden'}}>
<div style={{display:'grid',gridTemplateColumns:'28px 2.2fr 1.4fr 1fr 1fr 1.1fr 1.1fr 100px',gap:10,padding:'14px 18px',background:'linear-gradient(180deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.01) 100%)',borderBottom:'1px solid rgba(255,255,255,.06)',fontSize:11,fontWeight:600,color:'var(--tx3)',alignItems:'center'}}>
<div><input type="checkbox" style={{cursor:'pointer'}}/></div>
<div>الموظف</div><div>الأدوار</div><div>الفرع</div><div>الحالة</div><div>آخر دخول</div><div>تاريخ الإضافة</div><div></div>
</div>
{filtUsers.map(u=>{const br=branches.find(b=>b.id===u.branch_id);const rc=roleClrs[u.roles?.name_ar]||u.roles?.color||'#888';const st=statusOf(u);const stClr=st==='active'?C.ok:st==='pending'?'#b8722a':C.red;const stLbl=st==='active'?'نشط':st==='pending'?'بانتظار الموافقة':'معطل';return <div key={u.id} onClick={()=>{setViewUser(u);setUserTab('data')}} style={{display:'grid',gridTemplateColumns:'28px 2.2fr 1.4fr 1fr 1fr 1.1fr 1.1fr 100px',gap:10,padding:'14px 18px',borderBottom:'1px solid var(--bd2)',alignItems:'center',cursor:'pointer',transition:'.12s',borderRight:st==='pending'?'3px solid rgba(184,114,42,.7)':st==='inactive'?'3px solid rgba(192,57,43,.5)':'3px solid transparent'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(201,168,76,.02)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
<div onClick={e=>e.stopPropagation()}><input type="checkbox" style={{cursor:'pointer'}}/></div>
<div style={{display:'flex',alignItems:'center',gap:10,minWidth:0}}>
<div style={{width:34,height:34,borderRadius:'50%',background:rc+'20',border:'1px solid '+rc+'30',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:rc,flexShrink:0}}>{(u.name_ar||'?')[0]}</div>
<div style={{minWidth:0,flex:1}}>
<div style={{fontSize:12,fontWeight:800,color:'var(--tx)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.name_ar}</div>
<div style={{fontSize:10,color:'var(--tx5)',direction:'ltr',textAlign:'right',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.email||u.name_en||''}</div>
</div>
</div>
<div>{u.roles?<span style={{fontSize:10,padding:'4px 10px',borderRadius:12,background:rc+'15',border:'1px solid '+rc+'25',color:rc,fontWeight:700,whiteSpace:'nowrap'}}>{u.roles.name_ar}</span>:<span style={{fontSize:10,padding:'4px 10px',borderRadius:12,border:'1px dashed rgba(255,255,255,.1)',color:'var(--tx5)',whiteSpace:'nowrap'}}>لم يتم التعيين</span>}</div>
<div style={{fontSize:10,color:'var(--tx3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.is_all_branches?'كل الفروع':br?br.name_ar:'—'}</div>
<div><span style={{fontSize:10,padding:'4px 10px',borderRadius:12,background:stClr+'12',color:stClr,fontWeight:700,display:'inline-flex',alignItems:'center',gap:5,whiteSpace:'nowrap'}}><span style={{width:5,height:5,borderRadius:'50%',background:stClr}}/>{stLbl}</span></div>
<div style={{display:'flex',flexDirection:'column',gap:1}}>
<span style={{fontSize:10,color:'var(--tx3)',fontWeight:600}}>{relTime(u.last_login_at)}</span>
{u.last_login_at?<span style={{fontSize:8,color:'var(--tx5)'}}>{String(u.last_login_at).slice(0,10)}</span>:null}
</div>
<div style={{display:'flex',flexDirection:'column',gap:1}}>
<span style={{fontSize:10,color:'var(--tx3)',fontWeight:600}}>{u.created_at?String(u.created_at).slice(0,10):'—'}</span>
<span style={{fontSize:8,color:'var(--tx5)'}}>{ago(u.created_at)}</span>
</div>
<div style={{display:'flex',gap:2,justifyContent:'flex-end'}} onClick={e=>e.stopPropagation()}>
<button onClick={()=>{setViewUser(u);setUserTab('data')}} title="عرض" style={{width:26,height:26,borderRadius:6,border:'none',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--tx4)'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
{st==='pending'?<button onClick={()=>{setReviewUser(u);setSelRoles([]);setActivateNow(true);setRoleSearch('');setForm({branch_id:u.branch_id||'',notes:''});setPop('review_pending')}} title="مراجعة" style={{width:26,height:26,borderRadius:6,border:'none',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:C.ok}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg></button>:st==='inactive'?<button onClick={()=>{setReviewUser(u);setReactNotify(true);setPop('reactivate_user')}} title="إعادة تفعيل" style={{width:26,height:26,borderRadius:6,border:'none',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:C.ok}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg></button>:<button onClick={()=>{const curRoles=u.user_roles?.map(ur=>ur.roles?.id||ur.role_id).filter(Boolean)||[];setReviewUser(u);setSelRoles(curRoles);setEditBranch(u.branch_id||'');setEditTab('roles');setPop('edit_active')}} title="تعديل" style={{width:26,height:26,borderRadius:6,border:'none',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--tx4)'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>}
<button title="المزيد" style={{width:26,height:26,borderRadius:6,border:'none',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--tx4)'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg></button>
</div>
</div>})}
</div>}
</div>;
})()}

{/* ═══════════════ ROLES TAB ═══════════════ */}
{tab==='roles'&&(()=>{const filtRoles=roles.filter(r=>{
if(!q)return true;const s=q.toLowerCase();return(r.name_ar||'').includes(s)||(r.name_en||'').toLowerCase().includes(s)||(r.description||'').includes(s)
});const activeRoles=filtRoles.filter(r=>r.is_active);return<>
<div style={{fontSize:13,fontWeight:600,color:'var(--tx2)',marginBottom:14,paddingBottom:8,borderBottom:'1px solid rgba(255,255,255,.06)'}}>أدوار نشطة ({activeRoles.length})</div>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(380px,1fr))',gap:14}}>
{filtRoles.map(r=>{const rp=rolePerms.filter(p=>p.role_id===r.id);const rUsers=users.filter(u=>u.role_id===r.id);const rc=r.color||C.gold
return<div key={r.id} onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 16px 36px rgba(0,0,0,.42), 0 4px 10px rgba(0,0,0,.22), 0 0 0 1px '+rc+'33, inset 0 1px 0 rgba(255,255,255,.08)'}} onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}} style={{...GLASS,overflow:'hidden',transition:'.2s'}}>
<div style={{padding:'14px 16px'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
<div style={{display:'flex',alignItems:'center',gap:8}}>
<span style={{width:8,height:8,borderRadius:'50%',background:rc,flexShrink:0}}/>
<span style={{fontSize:15,fontWeight:700,color:'var(--tx)'}}>{r.name_ar}</span>
{r.is_system&&<span style={{fontSize:8,padding:'2px 6px',borderRadius:4,background:'rgba(201,168,76,.1)',color:C.gold,fontWeight:700}}>نظامي</span>}
</div>
<span style={{fontSize:9,padding:'2px 8px',borderRadius:5,background:r.is_active?'rgba(39,160,70,.1)':'rgba(153,153,153,.1)',color:r.is_active?C.ok:'#999',fontWeight:700}}>{r.is_active?'نشط':'معطّل'}</span>
</div>
{r.name_en&&<div style={{fontSize:11,color:'var(--tx5)',direction:'ltr',marginBottom:4}}>{r.name_en}</div>}
{r.description&&<div style={{fontSize:10,color:'var(--tx4)',marginBottom:8}}>{r.description}</div>}
</div>
<div style={{display:'flex',borderTop:'1px solid rgba(255,255,255,.04)'}}>
<div style={{flex:1,padding:'10px 16px',textAlign:'center',borderLeft:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:18,fontWeight:800,color:rc}}>{rp.length}</div><div style={{fontSize:8,color:rc,opacity:.6,marginTop:2}}>صلاحية</div></div>
<div style={{flex:1,padding:'10px 16px',textAlign:'center'}}><div style={{fontSize:18,fontWeight:800,color:C.gold}}>{rUsers.length}</div><div style={{fontSize:8,color:C.gold,opacity:.6,marginTop:2}}>موظف</div></div>
</div>
<div style={{display:'flex',borderTop:'1px solid rgba(255,255,255,.04)'}}>
<button onClick={()=>{setSelPerms(rp.map(p=>p.permission_id));setPermPop(r.id)}} style={{flex:1,height:34,border:'none',borderLeft:'1px solid rgba(255,255,255,.04)',background:'rgba(52,131,180,.04)',color:C.blue,fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>إدارة الصلاحيات</button>
<button onClick={()=>{setForm({_table:'roles',_id:r.id,name_ar:r.name_ar||'',name_en:r.name_en||'',description:r.description||'',color:r.color||'',is_active:String(r.is_active!==false)});setPop('edit_role')}} style={{width:50,height:34,border:'none',background:'rgba(201,168,76,.04)',color:C.gold,fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>تعديل</button>
</div>
</div>})}
</div>
</>})()}

{/* ═══ UI CONTROLS TAB ═══ */}
{tab==='ui_controls'&&<UiControlsTab sb={sb} users={users} toast={toast} lang={lang} nav={nav} hubTabs={hubTabs} visibility={visibility} onVisibilityChange={onVisibilityChange}/>}

{/* ═══ PERFORMANCE TAB (Enhanced) ═══ */}
{tab==='performance'&&(()=>{const MAX_SCORE=150;const scoreColor=s=>s>=80?C.ok:s>=50?C.gold:s>=20?'#e67e22':C.red;const medals=['🥇','🥈','🥉'];const filtered=perfData.filter(e=>!perfBranch||e.branch_id===perfBranch).filter(e=>!roleFilter||roleFilter==='all'||e.role_id===roleFilter).sort((a,b)=>(Number(b[perfSort])||0)-(Number(a[perfSort])||0))
const avgScore=perfData.length>0?Math.round(perfData.reduce((s,e)=>s+Number(e.performance_score||0),0)/perfData.length):0
const avgScorePrev=perfData.length>0?Math.round(perfData.reduce((s,e)=>s+Number(e.performance_score_prev||e.performance_score||0),0)/perfData.length):0
const totalTxn=perfData.reduce((s,e)=>s+Number(e.txn_completed||0),0)
const totalTxnAll=perfData.reduce((s,e)=>s+Number(e.txn_completed||0)+Number(e.txn_completed_prev||0),0)
const totalOverdue=perfData.reduce((s,e)=>s+Number(e.tasks_overdue||0),0)
const overdueUsers=perfData.filter(e=>Number(e.tasks_overdue||0)>0).length
const scoreDiff=avgScore-avgScorePrev
return<>
{/* Enhanced Stat cards */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:14,marginBottom:18}}>
{/* Employees */}
<div style={{...GLASS,padding:'16px 18px',textAlign:'center'}}>
<div style={{fontSize:12,fontWeight:500,color:'var(--tx4)',marginBottom:8}}>الموظفين</div>
<div style={{fontSize:24,fontWeight:700,color:C.ok,lineHeight:1.1,letterSpacing:'-.3px'}}>{filtered.length}</div>
<div style={{fontSize:10,color:'var(--tx5)',marginTop:6}}>{perfData.length} إجمالي</div>
</div>
{/* Avg Score with comparison */}
<div style={{...GLASS,padding:'16px 18px',textAlign:'center'}}>
<div style={{fontSize:12,fontWeight:500,color:'var(--tx4)',marginBottom:8}}>متوسط النقاط</div>
<div style={{fontSize:24,fontWeight:700,color:C.gold,lineHeight:1.1,letterSpacing:'-.3px'}}>{avgScore}<span style={{fontSize:12,fontWeight:500,opacity:.5}}>/{MAX_SCORE}</span></div>
{scoreDiff!==0&&<div style={{fontSize:10,fontWeight:600,color:scoreDiff>0?C.ok:C.red,marginTop:6}}>{scoreDiff>0?'▲':'▼'} {Math.abs(scoreDiff)} عن الشهر السابق</div>}
</div>
{/* Total Transactions */}
<div style={{...GLASS,padding:'16px 18px',textAlign:'center'}}>
<div style={{fontSize:12,fontWeight:500,color:'var(--tx4)',marginBottom:8}}>المعاملات المنجزة</div>
<div style={{fontSize:24,fontWeight:700,color:C.blue,lineHeight:1.1,letterSpacing:'-.3px'}}>{totalTxn}</div>
<div style={{fontSize:10,color:'var(--tx5)',marginTop:6}}>نسبة الإنجاز: {totalTxnAll>0?Math.round(totalTxn/totalTxnAll*100):0}%</div>
</div>
{/* Overdue */}
<div style={{...GLASS,padding:'16px 18px',textAlign:'center'}}>
<div style={{fontSize:12,fontWeight:500,color:'var(--tx4)',marginBottom:8}}>المتأخرات</div>
<div style={{fontSize:24,fontWeight:700,color:totalOverdue>0?C.red:'var(--tx5)',lineHeight:1.1,letterSpacing:'-.3px'}}>{totalOverdue}</div>
<div style={{fontSize:10,color:totalOverdue>0?C.red:'var(--tx5)',marginTop:6,opacity:.85}}>{overdueUsers} موظف عنده متأخرات</div>
</div>
</div>
{/* Filters */}
<div style={{display:'flex',gap:10,marginBottom:18,flexWrap:'wrap',alignItems:'center'}}>
<select value={perfBranch||''} onChange={e=>setPerfBranch(e.target.value||null)} style={sBS}>
<option value="">كل المكاتب</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name_ar}</option>)}
</select>
<select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)} style={sBS}>
<option value="all">كل الأدوار</option>{roles.map(r=><option key={r.id} value={r.id}>{r.name_ar}</option>)}
</select>
<select value={perfSort} onChange={e=>setPerfSort(e.target.value)} style={sBS}>
<option value="performance_score">النقاط</option><option value="txn_completed">المعاملات</option><option value="amount_collected">التحصيل</option><option value="tasks_done">المهام</option>
</select>
<span style={{fontSize:11,color:'var(--tx5)'}}>{filtered.length} موظف</span>
</div>
{/* Enhanced Leaderboard */}
<div style={{display:'flex',flexDirection:'column',gap:12}}>
{filtered.map((e,i)=>{const sc=Number(e.performance_score)||0;const scPrev=Number(e.performance_score_prev||sc);const pct=Math.round(sc/MAX_SCORE*100);const diff=sc-scPrev;const hasOverdue=Number(e.tasks_overdue||0)>0;const isWeak=sc<50;const accent=hasOverdue&&Number(e.tasks_overdue)>10?C.red:isWeak?'#e67e22':C.gold
return<div key={e.user_id} onMouseEnter={ev=>{ev.currentTarget.style.transform='translateY(-3px)';ev.currentTarget.style.boxShadow='0 16px 36px rgba(0,0,0,.42), 0 4px 10px rgba(0,0,0,.22), 0 0 0 1px '+accent+'33, inset 0 1px 0 rgba(255,255,255,.08)'}} onMouseLeave={ev=>{ev.currentTarget.style.transform='translateY(0)';ev.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}} style={{...GLASS,overflow:'hidden',transition:'.2s'}}>
{/* Header */}
<div style={{padding:'14px 18px',display:'flex',alignItems:'center',gap:14}}>
<div style={{width:38,height:38,borderRadius:'50%',background:i<3?'rgba(201,168,76,.12)':'rgba(255,255,255,.04)',border:'1.5px solid '+(i<3?'rgba(201,168,76,.25)':'rgba(255,255,255,.08)'),display:'flex',alignItems:'center',justifyContent:'center',fontSize:i<3?16:13,fontWeight:800,color:i<3?C.gold:'var(--tx4)',flexShrink:0}}>
{i<3?medals[i]:'#'+(i+1)}
</div>
<div style={{flex:1,minWidth:0}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
<span style={{fontSize:14,fontWeight:700,color:'var(--tx)'}}>{e.name_ar}</span>
{hasOverdue&&<span style={{fontSize:8,padding:'1px 6px',borderRadius:3,background:'rgba(192,57,43,.1)',color:C.red,fontWeight:600}}>متأخرات</span>}
</div>
<div style={{fontSize:10,color:'var(--tx4)'}}>{e.role_name||'—'}{e.branch_name?' · '+e.branch_name:''}</div>
</div>
{/* Score with max */}
<div style={{textAlign:'center',flexShrink:0,minWidth:90}}>
<div style={{display:'flex',alignItems:'baseline',justifyContent:'center',gap:2}}>
<span style={{fontSize:26,fontWeight:900,color:scoreColor(sc)}}>{sc}</span>
<span style={{fontSize:11,color:'var(--tx5)'}}>/ {MAX_SCORE}</span>
</div>
{diff!==0&&<div style={{fontSize:9,fontWeight:700,color:diff>0?C.ok:C.red,marginTop:2}}>{diff>0?'▲ +':'▼ '}{Math.abs(diff)} عن السابق</div>}
</div>
</div>
{/* Progress bar */}
<div style={{padding:'0 18px 6px'}}>
<div style={{height:6,borderRadius:3,background:'rgba(255,255,255,.06)',overflow:'hidden'}}>
<div style={{height:'100%',width:Math.min(100,pct)+'%',borderRadius:3,background:scoreColor(sc),transition:'width .3s'}}/>
</div>
<div style={{fontSize:8,color:'var(--tx5)',marginTop:3,textAlign:'left'}}>الإنتاجية {pct}%</div>
</div>
{/* Metrics */}
<div style={{display:'flex',borderTop:'1px solid rgba(255,255,255,.04)',background:'rgba(255,255,255,.01)'}}>
{[['معاملات',e.txn_completed,C.blue],['تحصيل',num(e.amount_collected),C.ok],['مهام',e.tasks_done,C.gold],['متأخرة',e.tasks_overdue,Number(e.tasks_overdue)>0?C.red:'var(--tx5)'],['تصعيدات',e.escalations,Number(e.escalations)>0?'#e67e22':'var(--tx5)'],['م.الأيام',e.avg_completion_days,'#9b59b6']].map(([l,v,c],j)=>
<div key={l} style={{flex:1,padding:'8px 4px',textAlign:'center',borderLeft:j>0?'1px solid rgba(255,255,255,.03)':'none'}}>
<div style={{fontSize:14,fontWeight:700,color:c}}>{v||0}</div>
<div style={{fontSize:7,color:'var(--tx5)',marginTop:2}}>{l}</div>
</div>)}
</div>
</div>})}
</div>
</>})()}

{/* ═══ ATTENDANCE TAB (Enhanced) ═══ */}
{tab==='attendance_tab'&&(()=>{const dayAtt=allAttendance.filter(a=>a.date===attDate);const brAtt=attBranch?dayAtt.filter(a=>a.branch_id===attBranch):dayAtt
const dayOnTime=brAtt.filter(a=>!a.is_late).length;const dayLate=brAtt.filter(a=>a.is_late).length
const dayAvgHrs=brAtt.length>0?(brAtt.reduce((s,a)=>s+Number(a.work_hours||0),0)/brAtt.length).toFixed(1):0
const activeUsers=users.filter(u=>u.is_active&&u.deleted_at===null&&(!attBranch||u.branch_id===attBranch))
const absent=activeUsers.filter(u=>!brAtt.some(a=>a.user_id===u.id))
const dayOfWeek=new Date(attDate).toLocaleDateString('en',{weekday:'short'}).toLowerCase()
const dayNameAr={'sun':'الأحد','mon':'الاثنين','tue':'الثلاثاء','wed':'الأربعاء','thu':'الخميس','fri':'الجمعة','sat':'السبت'}
const isHoliday=dayOfWeek==='fri'||dayOfWeek==='sat'
return<>
{/* Holiday alert */}
{isHoliday&&brAtt.length===0&&<div style={{...GLASS,padding:'14px 18px',marginBottom:16,display:'flex',alignItems:'center',gap:8,boxShadow:'0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), 0 0 0 1px rgba(212,160,23,.22), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}}>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
<span style={{fontSize:13,fontWeight:600,color:C.gold}}>يوم إجازة — {dayNameAr[dayOfWeek]||dayOfWeek}</span>
</div>}
{/* Dynamic Stat cards */}
<div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:18}}>
{[['الحاضرين',brAtt.length,C.ok],['في الوقت',dayOnTime,C.ok],['متأخر',dayLate,dayLate>0?'#e67e22':'var(--tx5)'],['غائب',absent.length,absent.length>0?C.red:'var(--tx5)'],['متوسط الساعات',dayAvgHrs,C.blue]].map(([l,v,c],i)=><div key={i} style={{...GLASS,padding:14,textAlign:'center'}}><div style={{fontSize:22,fontWeight:700,color:c,letterSpacing:'-.3px',lineHeight:1.1}}>{v}</div><div style={{fontSize:11,color:'var(--tx4)',marginTop:6,fontWeight:500}}>{l}</div></div>)}
</div>
{/* Filters */}
<div style={{display:'flex',gap:10,marginBottom:18,flexWrap:'wrap',alignItems:'center'}}>
<input type="date" value={attDate} onChange={e=>setAttDate(e.target.value)} style={{...sBS,direction:'ltr'}}/>
<select value={attBranch||''} onChange={e=>setAttBranch(e.target.value||null)} style={sBS}>
<option value="">كل المكاتب</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name_ar}</option>)}
</select>
<span style={{fontSize:11,color:'var(--tx5)'}}>|</span>
<span style={{fontSize:12,fontWeight:500,color:'var(--tx4)'}}>{dayNameAr[dayOfWeek]||''} · {brAtt.length} حاضر · {absent.length} غائب</span>
</div>
{/* Attendance Cards */}
{brAtt.length===0&&!isHoliday?<div style={{textAlign:'center',padding:40,color:'var(--tx6)'}}>لا يوجد سجل حضور لهذا اليوم</div>:
<div style={{display:'flex',flexDirection:'column',gap:8}}>
{/* Present employees */}
{brAtt.map(a=>{const u=users.find(x=>x.id===a.user_id);const rc=u?.roles?.color||C.gold;const cin=a.check_in_at?new Date(a.check_in_at).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit',hour12:false}):'—';const cout=a.check_out_at?new Date(a.check_out_at).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit',hour12:false}):'—';const isLate=a.is_late
return<div key={a.id} style={{borderRadius:12,background:'var(--bg)',border:'1px solid '+(isLate?'rgba(230,126,34,.15)':'var(--bd)'),overflow:'hidden'}}>
<div style={{padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
<div style={{width:38,height:38,borderRadius:10,background:rc+'15',border:'1px solid '+rc+'25',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:800,color:rc,flexShrink:0}}>{(u?.name_ar||'?')[0]}</div>
<div style={{flex:1}}>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>{u?.name_ar||'—'}</div>
<div style={{fontSize:9,color:'var(--tx4)',marginTop:2}}>{u?.roles?.name_ar||'—'}{a.branch_id?' · '+(branches.find(b=>b.id===a.branch_id)?.name_ar||''):''}</div>
</div>
<span style={{fontSize:10,padding:'3px 10px',borderRadius:6,background:isLate?'rgba(230,126,34,.1)':'rgba(39,160,70,.1)',color:isLate?'#e67e22':C.ok,fontWeight:700}}>{isLate?'⏰ متأخر '+a.late_minutes+' د':'✓ في الوقت'}</span>
</div>
<div style={{display:'flex',borderTop:'1px solid rgba(255,255,255,.04)',background:'rgba(255,255,255,.01)'}}>
{[['الدخول',cin,C.ok],['الخروج',cout,C.blue],['الساعات',Number(a.work_hours||0).toFixed(1)+' ساعة',C.gold],['الحالة',isLate?'+'+a.late_minutes+' دقيقة':'في الوقت',isLate?'#e67e22':C.ok]].map(([l,v,c],j)=>
<div key={l} style={{flex:1,padding:'8px 10px',textAlign:'center',borderLeft:j>0?'1px solid rgba(255,255,255,.03)':'none'}}>
<div style={{fontSize:8,color:'var(--tx5)',marginBottom:2}}>{l}</div>
<div style={{fontSize:11,fontWeight:700,color:c,direction:'ltr'}}>{v}</div>
</div>)}
</div>
{a.check_in_distance_meters&&<div style={{padding:'4px 16px 6px',fontSize:9,color:'var(--tx5)'}}>📍 المسافة: {a.check_in_distance_meters}م من الموقع المحدد</div>}
</div>})}
{/* Absent employees */}
{absent.length>0&&!isHoliday&&<>
<div style={{fontSize:11,fontWeight:700,color:C.red,marginTop:12,marginBottom:6,paddingBottom:6,borderBottom:'1px solid rgba(192,57,43,.12)'}}>غائبين ({absent.length})</div>
{absent.slice(0,10).map(u=>{const rc=u.roles?.color||'#999';return<div key={u.id} style={{padding:'10px 16px',borderRadius:10,background:'rgba(192,57,43,.02)',border:'1px solid rgba(192,57,43,.06)',display:'flex',alignItems:'center',gap:10}}>
<div style={{width:32,height:32,borderRadius:8,background:'rgba(192,57,43,.08)',border:'1px solid rgba(192,57,43,.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:C.red,flexShrink:0}}>{(u.name_ar||'?')[0]}</div>
<div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:'var(--tx3)'}}>{u.name_ar}</div><div style={{fontSize:9,color:'var(--tx5)'}}>{u.roles?.name_ar||'—'}</div></div>
<span style={{fontSize:9,padding:'2px 8px',borderRadius:4,background:'rgba(192,57,43,.08)',color:C.red,fontWeight:600}}>✕ غائب</span>
</div>})}
{absent.length>10&&<div style={{textAlign:'center',fontSize:10,color:'var(--tx5)',padding:8}}>+ {absent.length-10} موظفين آخرين</div>}
</>}
</div>}
</>})()}

{/* ═══ EMPLOYEE DETAIL SIDE PANEL ═══ */}
{viewUser&&(()=>{const u=viewUser;const br=branches.find(b=>b.id===u.branch_id);const rc=u.roles?.color||C.gold;const activeTasks=userTasks.filter(t=>t.tasks&&t.tasks.status!=='completed'&&t.tasks.status!=='cancelled');const completedTasks=userTasks.filter(t=>t.tasks&&t.tasks.status==='completed');const attDays=attendance.length;const onTime=attendance.filter(a=>!a.is_late).length;const lateDays=attendance.filter(a=>a.is_late).length;const avgHrs=attDays>0?(attendance.reduce((s,a)=>s+Number(a.work_hours||0),0)/attDays).toFixed(1):0;const SH3=({t,c})=><div style={{fontSize:12,fontWeight:700,color:c||C.gold,marginBottom:10,paddingBottom:6,borderBottom:'1px solid '+(c||C.gold)+'20'}}>{t}</div>;const priClr={urgent:C.red,high:'#e67e22',medium:C.gold,low:C.ok};const priLbl={urgent:'عاجل',high:'عالي',medium:'متوسط',low:'منخفض'};const stLbl={in_progress:'جاري',pending:'معلّق',completed:'مكتمل',cancelled:'ملغى'}
const utabs=[{id:'data',l:'البيانات'},{id:'tasks',l:'المهام',n:activeTasks.length},{id:'attend',l:'الحضور',n:attDays},{id:'logins',l:'سجل الدخول',n:loginLogs.length}]
const tabIcons={data:User,tasks:ClipboardList,attend:CalendarDays,logins:LogIn}
const profLbl=p=>p==='native'?'لغة أم':p==='advanced'?'متقدم':p==='intermediate'?'متوسط':'مبتدئ'
const tabContent={
data:<ScrollBox maxHeight={380}>
<FKSection Icon={User} label="البيانات الشخصية">
<InfoGrid>
<InfoRow label="الاسم بالعربي" value={u.name_ar}/>
<InfoRow label="بالإنجليزي" value={u.name_en}/>
<InfoRow label="رقم الهوية" value={u.id_number} mono copy/>
<InfoRow label="الجنسية" value={u.nationality}/>
<InfoRow label="الإيميل" value={u.email} mono copy/>
<InfoRow label="الجوال" value={u.phone} mono copy/>
</InfoGrid>
</FKSection>
<FKSection Icon={Briefcase} label="الوظيفة">
<InfoGrid>
<InfoRow label="الدور" value={u.roles?.name_ar} color={rc}/>
<InfoRow label="الفرع" value={u.is_all_branches?'كل الفروع':br?.name_ar}/>
<InfoRow label="تاريخ التعيين" value={u.hire_date}/>
<InfoRow label="سنوات الخبرة" value={u.experience_years?u.experience_years+' سنوات':null}/>
<InfoRow label="الحد الأقصى للمعاملات" value={u.max_concurrent_transactions}/>
{u.is_super_admin?<InfoRow label="حساب نظامي" value="نعم" color={FKC.gold}/>:null}
</InfoGrid>
</FKSection>
{empLangs.length>0&&<FKSection Icon={Languages} label="اللغات">
<InfoGrid>{empLangs.map(l=><InfoRow key={l.id} label={l.language} value={profLbl(l.proficiency)} color={l.proficiency==='native'?FKC.ok:'#e67e22'}/>)}</InfoGrid>
</FKSection>}
{empSpecs.length>0&&<FKSection Icon={ListChecks} label="التخصصات">
<InfoGrid>{empSpecs.map(s=><InfoRow key={s.id} label={s.service_name||'تخصص'} value={(s.skill_level==='expert'?'خبير':s.skill_level==='advanced'?'متقدم':'متوسط')+(s.certified?' · ✓ معتمد':'')} color={s.certified?FKC.ok:undefined}/>)}</InfoGrid>
</FKSection>}
</ScrollBox>,
tasks:<FKSection Icon={ClipboardList} label="المهام" hint={activeTasks.length+' نشطة · '+completedTasks.length+' مكتملة هذا الشهر'}>
{activeTasks.length===0&&completedTasks.length===0?<div style={{textAlign:'center',padding:30,color:FKC.tx5,fontSize:13}}>لا توجد مهام</div>:
<ScrollBox maxHeight={360}>
<InfoGrid style={{gridTemplateColumns:'1fr'}}>
{activeTasks.map(ta=>{const t=ta.tasks;const pc=priClr[t.priority]||FKC.gold;return<InfoRow key={ta.id} Icon={ClipboardList} color={pc} label={t.title} value={(priLbl[t.priority]||t.priority)+' · '+(stLbl[t.status]||t.status)+' · الاستحقاق: '+(t.due_date||'—')}/>})}
</InfoGrid>
</ScrollBox>}
</FKSection>,
attend:<FKSection Icon={CalendarDays} label="الحضور" hint={attDays+' يوم · '+onTime+' في الوقت · '+lateDays+' متأخر · متوسط '+avgHrs+' س'}>
{attendance.length===0?<div style={{textAlign:'center',padding:30,color:FKC.tx5,fontSize:13}}>لا يوجد سجل حضور</div>:
<ScrollBox maxHeight={360}>
<table style={{width:'100%',borderCollapse:'collapse',fontFamily:F}}>
<thead><tr style={{background:'rgba(255,255,255,.03)'}}>{['التاريخ','الدخول','الخروج','الساعات','الحالة'].map((h,i)=><th key={i} style={{padding:'10px 14px',fontSize:11,fontWeight:600,color:FKC.tx4,textAlign:i===4?'center':'right'}}>{h}</th>)}</tr></thead>
<tbody>{attendance.slice(0,15).map(a=>{const cin=a.check_in_at?new Date(a.check_in_at).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit',hour12:false}):'—';const cout=a.check_out_at?new Date(a.check_out_at).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit',hour12:false}):'—';return<tr key={a.id} style={{borderBottom:'1px solid '+FKC.line}}>
<td style={{padding:'8px 14px',fontSize:12,color:FKC.tx3}}>{a.date}</td>
<td style={{padding:'8px 14px',fontSize:12,color:FKC.tx3,direction:'ltr'}}>{cin}</td>
<td style={{padding:'8px 14px',fontSize:12,color:FKC.tx3,direction:'ltr'}}>{cout}</td>
<td style={{padding:'8px 14px',fontSize:13,fontWeight:600,color:FKC.gold}}>{Number(a.work_hours||0).toFixed(1)}</td>
<td style={{padding:'8px 14px',textAlign:'center'}}>{a.is_late?<span style={{fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:5,background:'rgba(230,126,34,.12)',color:'#e67e22'}}>+{a.late_minutes}د</span>:<span style={{fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:5,background:FKC.ok+'1a',color:FKC.ok}}>✓</span>}</td>
</tr>})}</tbody></table>
</ScrollBox>}
</FKSection>,
logins:<FKSection Icon={LogIn} label="سجل الدخول" hint={'آخر '+loginLogs.length+' عمليات دخول'}>
{loginLogs.length===0?<div style={{textAlign:'center',padding:30,color:FKC.tx5,fontSize:13}}>لا يوجد سجل</div>:
<ScrollBox maxHeight={360}>
<InfoGrid style={{gridTemplateColumns:'1fr'}}>
{loginLogs.map(l=>{const ua=l.user_agent||'';const browser=ua.includes('Safari')&&!ua.includes('Chrome')?'Safari':ua.includes('Chrome')?'Chrome':ua.includes('Firefox')?'Firefox':'Other';const os=ua.includes('iPhone')?'iPhone':ua.includes('Android')?'Android':ua.includes('Windows')?'Windows':ua.includes('Mac')?'Mac':'Other';const ip=(l.ip_address||'').replace(/\d+\.\d+$/,'xx.xx');return<InfoRow key={l.id} Icon={LogIn} color={l.success?FKC.ok:FKC.red} label={browser+' / '+os} value={(l.success?'ناجح':'فشل')+' · '+ip+' · '+(l.created_at?new Date(l.created_at).toLocaleString('en',{month:'2-digit',day:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}):'')}/>})}
</InfoGrid>
</ScrollBox>}
</FKSection>,
}
return<FKModal open onClose={()=>setViewUser(null)} title={u.name_ar} subtitle={[(u.is_active?'نشط':'معطّل'),u.name_en,u.roles?.name_ar,br?.name_ar].filter(Boolean).join(' · ')} Icon={User} accent={rc} width={820}
tab={Math.max(0,utabs.findIndex(t=>t.id===userTab))} onTab={i=>setUserTab(utabs[i].id)}
footer={<FKAction Icon={Pencil} onClick={()=>{setViewUser(null);setForm({_table:'users',_id:u.id,name_ar:u.name_ar||'',name_en:u.name_en||'',email:u.email||'',phone:u.phone||'',id_number:u.id_number||'',nationality:u.nationality||'',role_id:u.role_id||'',branch_id:u.branch_id||'',is_active:String(u.is_active!==false),notes:u.notes||''});setPop('edit_user')}}>تعديل</FKAction>}
tabs={utabs.map(t=>({label:t.l+(t.n!==undefined&&t.n>0?' ('+t.n+')':''),Icon:tabIcons[t.id],content:tabContent[t.id]}))}/>})()}

{/* ═══ VIEW BRANCH POPUP (FormKit tabs) ═══ */}
{viewPop&&(()=>{const bUsers=users.filter(u=>u.branch_id===viewPop.id);const bAccs=bankAccs.filter(a=>a.branch_id===viewPop.id);const typeMap={deposit:{l:'إيداع',c:C.gold},sadad:{l:'سداد',c:C.blue},international:{l:'حوالات خارجية',c:C.ok}}
const vKeys=['info','accounts','staff']
const infoRows=[['الكود',viewPop.code],['المنطقة',getRef(viewPop.region_id,regions)],['المدينة',getRef(viewPop.city_id,cities)],['الجوال',viewPop.mobile],['البريد',viewPop.email],['مدير المكتب',getRef(viewPop.manager_id,users)],['أيام الدوام',viewPop.work_days],['ساعات العمل',(viewPop.work_from||'08:00')+' - '+(viewPop.work_to||'17:00')],['الرصيد الافتتاحي',viewPop.opening_balance?num(viewPop.opening_balance)+' ر.س':null],['الحد النقدي اليومي',viewPop.daily_cash_limit?num(viewPop.daily_cash_limit)+' ر.س':null],['الحالة',viewPop.is_active?'نشط':'معطّل'],['العنوان',viewPop.address],['ملاحظات',viewPop.notes]].filter(([,v])=>v&&v!=='—')
return<FKModal open onClose={()=>{setViewPop(null);setViewTab('info')}} title={viewPop.name_ar} subtitle={viewPop.name_en||''} Icon={Building2} accent={viewPop.color||FKC.gold}
tab={Math.max(0,vKeys.indexOf(viewTab))} onTab={i=>setViewTab(vKeys[i])}
footer={<FKAction Icon={Pencil} onClick={()=>{openEdit(viewPop);setViewPop(null);setViewTab('info')}}>تعديل</FKAction>}
tabs={[
{label:'البيانات الأساسية',Icon:Info,content:
<FKSection Icon={Info} label="معلومات المكتب">
<ScrollBox maxHeight={340}>
<InfoGrid>
{infoRows.map(([k,v])=><InfoRow key={k} label={k} value={String(v)} mono={k==='البريد'||k==='الجوال'||k==='الكود'} copy={k==='البريد'||k==='الجوال'} color={k==='الحالة'?(viewPop.is_active?FKC.ok:FKC.red):undefined}/>)}
{viewPop.google_maps_url&&<div style={FKFULL}><a href={viewPop.google_maps_url} target="_blank" rel="noreferrer" style={{fontSize:13,fontWeight:600,color:FKC.blue,textDecoration:'none'}}>فتح في الخرائط ↗</a></div>}
</InfoGrid>
{viewPop.google_maps_url&&<div style={{marginTop:10,borderRadius:10,overflow:'hidden',height:140}}><iframe src={`https://maps.google.com/maps?q=${encodeURIComponent(viewPop.address||viewPop.google_maps_url)}&output=embed`} width="100%" height="140" style={{border:0}} allowFullScreen loading="lazy"/></div>}
</ScrollBox>
</FKSection>},
{label:'الحسابات البنكية ('+bAccs.length+')',Icon:Landmark,content:
<FKSection Icon={Landmark} label="الحسابات البنكية" hint={bAccs.length+' حساب'}>
{bAccs.length===0?<div style={{textAlign:'center',padding:30,color:FKC.tx5,fontSize:13}}>لا توجد حسابات بنكية مرتبطة بهذا المكتب</div>:
<ScrollBox maxHeight={340}>
{bAccs.map(a=>{const tp=typeMap[a.account_type]||typeMap.deposit;return<div key={a.id} style={{marginBottom:10}}>
<div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 2px'}}>
<span style={{fontSize:14,fontWeight:600,color:FKC.tx}}>{a.bank_name}</span>
{a.is_primary&&<span style={{fontSize:10,fontWeight:600,color:FKC.gold,background:FKC.gold+'1a',padding:'2px 7px',borderRadius:6}}>رئيسي</span>}
<span style={{fontSize:10,fontWeight:600,color:tp.c,background:tp.c+'1a',padding:'2px 7px',borderRadius:6}}>{tp.l}</span>
<span style={{flex:1}}/>
<span style={{fontSize:11,fontWeight:600,color:a.is_active?FKC.ok:FKC.red}}>{a.is_active?'نشط':'معطّل'}</span>
</div>
<InfoGrid>
{[['اسم الحساب',a.account_name,false],['رقم الحساب',a.account_number,true],['IBAN',a.iban,true],['SWIFT',a.swift_code,true]].filter(([,v])=>v).map(([k,v,m])=><InfoRow key={k} label={k} value={v} mono={m} copy={m}/>)}
</InfoGrid>
</div>})}
</ScrollBox>}
</FKSection>},
{label:'الموظفين ('+bUsers.length+')',Icon:Users,content:
<FKSection Icon={Users} label="موظفو المكتب" hint={bUsers.length+' موظف'}>
{bUsers.length===0?<div style={{textAlign:'center',padding:30,color:FKC.tx5,fontSize:13}}>لا يوجد موظفين في هذا المكتب</div>:
<ScrollBox maxHeight={340}>
<InfoGrid style={{gridTemplateColumns:'1fr'}}>
{bUsers.map(u=><InfoRow key={u.id} Icon={User} label={u.name_ar} color={u.roles?.color||FKC.gold} value={(u.roles?.name_ar?u.roles.name_ar+' · ':'')+(u.is_active?'نشط':'معطّل')}/>)}
</InfoGrid>
</ScrollBox>}
</FKSection>},
]}/>})()}

{/* ═══ ADD/EDIT BRANCH POPUP (3-Step Wizard) ═══ */}
{(pop==='add'||pop==='edit')&&(()=>{
const weekdayList=lLists.find(l=>l.category_key==='weekdays')
const allDays=weekdayList?lItems.filter(i=>i.category_id===weekdayList.id).map(i=>i.value_ar):['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']
const selDays=(form.work_days||'').split(',').filter(Boolean)
const toggleDay=d=>{const has=selDays.includes(d);setForm(p=>({...p,work_days:has?selDays.filter(x=>x!==d).join(','):[...selDays,d].join(',')}))}
const times=[];for(let h=6;h<=23;h++)for(let m=0;m<60;m+=30)times.push(String(h).padStart(2,'0')+':'+String(m).padStart(2,'0'))
const fmtMobile=v=>{if(!v)return'';return v.replace(/(\d{2})(\d{3})(\d{0,4})/,'$1 $2 $3').trim()}
const getCityCode=()=>{const c=cities.find(x=>x.id===form.city_id);return c?(c.code||c.name_ar?.slice(0,3)):'---'}
const net=(Number(String(form.opening_balance||0).replace(/,/g,''))||0)
const reviewRows=[['الاسم بالعربي',form.name_ar],['الاسم بالإنجليزي',form.name_en],['المنطقة',getRef(form.region_id,regions)],['المدينة',getRef(form.city_id,cities)],['الكود',getCityCode()+'-'+form.code],['اللون',form.color],['العنوان',form.address],['الجوال',form.mobile?'+966 '+fmtMobile(form.mobile):null],['البريد',form.email],['الحالة',form.is_active==='true'?'نشط':'معطّل'],['مدير المكتب',getRef(form.manager_id,users)],['أيام الدوام',form.work_days],['بداية الدوام',form.work_from],['نهاية الدوام',form.work_to],['الرصيد الافتتاحي',form.opening_balance],['الحد النقدي اليومي',form.daily_cash_limit],['رابط الموقع',form.google_maps_url?'محدد':null],['ملاحظات',form.notes]]
return<FKModal open onClose={()=>{setSaveErr(null);setPop(null)}} title={pop==='add'?'إضافة مكتب':'تعديل مكتب'} Icon={Building2} variant={pop==='add'?'create':'edit'}
success={saved?<SuccessView title={pop==='add'?'تمت إضافة المكتب':'تم حفظ التعديلات'}/>:null}
onSubmit={saveForm} submitting={saving} submitLabel={pop==='add'?'إضافة المكتب':'حفظ التعديلات'}
pages={[
{title:'البيانات الأساسية',valid:!!form.name_ar&&!!form.code,content:
<FKSection Icon={FileText} label="الاسم والكود">
<div style={FKGRID}>
<FKText label="الاسم بالعربي" req value={form.name_ar} onChange={v=>setForm(p=>({...p,name_ar:v}))}/>
<FKText label="الاسم بالإنجليزي" dir="ltr" value={form.name_en} onChange={v=>setForm(p=>({...p,name_en:v}))}/>
<FKSelect label="المنطقة" value={form.region_id} onChange={v=>setForm(p=>({...p,region_id:v,city_id:''}))} options={regions} getKey={r=>r.id} getLabel={r=>r.name_ar} placeholder="اختر المنطقة"/>
<FKSelect label="المدينة" value={form.city_id} onChange={v=>setForm(p=>({...p,city_id:v}))} options={cities.filter(c=>!form.region_id||c.region_id===form.region_id)} getKey={c=>c.id} getLabel={c=>c.name_ar} placeholder="اختر المدينة"/>
<FKText label="الكود" req hint={getCityCode()+'-'+(form.code||'..')} dir="ltr" value={form.code} onChange={v=>setForm(p=>({...p,code:v.replace(/\D/g,'').slice(0,4)}))} placeholder="01"/>
<FKColor label="اللون" value={form.color} onChange={v=>setForm(p=>({...p,color:v}))}/>
</div>
</FKSection>},
{title:'الموقع والتواصل',valid:true,content:<>
<FKSection Icon={MapPin} label="الموقع">
<div style={FKGRID}>
<FKArea label="العنوان" rows={2} value={form.address} onChange={v=>setForm(p=>({...p,address:v}))}/>
<FKText label="رابط الموقع على Google Maps" dir="ltr" full value={form.google_maps_url} onChange={v=>setForm(p=>({...p,google_maps_url:v}))} placeholder="https://maps.app.goo.gl/..."/>
</div>
</FKSection>
<FKSection Icon={PhoneIcon} label="التواصل">
<div style={FKGRID}>
<FKPhone label="رقم الجوال" value={form.mobile} onChange={v=>setForm(p=>({...p,mobile:v}))}/>
<FKText label="البريد الإلكتروني" dir="ltr" value={form.email} onChange={v=>setForm(p=>({...p,email:v}))} placeholder="example@jisr.sa"/>
</div>
</FKSection>
</>},
{title:'الدوام والإدارة',valid:true,content:<>
<FKSection Icon={CalendarDays} label="أيام وساعات الدوام">
<div style={FKGRID}>
<FKMulti label="أيام الدوام" full value={selDays} onChange={arr=>setForm(p=>({...p,work_days:arr.join(',')}))} options={allDays} getKey={d=>d} getLabel={d=>d} searchable={false} placeholder="اختر الأيام"/>
<FKTimeField label="بداية الدوام" value={form.work_from||'08:00'} onChange={v=>setForm(p=>({...p,work_from:v}))}/>
<FKTimeField label="نهاية الدوام" value={form.work_to||'17:00'} onChange={v=>setForm(p=>({...p,work_to:v}))}/>
</div>
</FKSection>
<FKSection Icon={Settings2} label="الإدارة والحالة">
<div style={FKGRID}>
<FKSelect label="مدير المكتب" value={form.manager_id||''} onChange={v=>setForm(p=>({...p,manager_id:v}))} options={users} getKey={u=>u.id} getLabel={u=>u.name_ar} placeholder="اختر المدير"/>
<FKSwitch label="مكتب نشط" hint="يظهر في القوائم ويستقبل العمليات" checked={form.is_active==='true'} onChange={v=>setForm(p=>({...p,is_active:v?'true':'false'}))}/>
</div>
</FKSection>
</>},
{title:'المالية والملاحظات',valid:true,content:<>
<FKSection Icon={Wallet} label="المالية">
<div style={FKGRID}>
<FKCurrency label="الرصيد الافتتاحي" value={form.opening_balance} onChange={v=>setForm(p=>({...p,opening_balance:v}))}/>
<FKCurrency label="الحد النقدي اليومي" value={form.daily_cash_limit} onChange={v=>setForm(p=>({...p,daily_cash_limit:v}))}/>
</div>
</FKSection>
<FKSection Icon={StickyNote} label="ملاحظات">
<FKArea label="ملاحظات" rows={2} value={form.notes} onChange={v=>setForm(p=>({...p,notes:v}))}/>
</FKSection>
</>},
{title:'مراجعة البيانات',valid:true,error:saveErr,content:
<FKSection Icon={ClipboardList} label="مراجعة" hint="تأكد من صحة البيانات قبل الحفظ">
<ScrollBox maxHeight={300}>
<InfoGrid>
{reviewRows.filter(([,v])=>v&&v!=='—'&&v!=='---').map(([k,v])=><InfoRow key={k} label={k} value={String(v)}/>)}
</InfoGrid>
</ScrollBox>
</FKSection>},
]}/>})()}

{/* ═══ EDIT USER POPUP (FormKit) ═══ */}
{pop==='edit_user'&&<FKModal open onClose={()=>{setSaveErr(null);setPop(null)}} title="تعديل موظف" Icon={UserCog} variant="edit"
success={saved?<SuccessView title="تم حفظ التعديلات"/>:null}
onSubmit={saveForm} submitting={saving} submitLabel="حفظ"
pages={[
{title:'البيانات الشخصية',valid:!!form.name_ar,content:
<FKSection Icon={User} label="البيانات الشخصية">
<div style={FKGRID}>
<FKText label="الاسم بالعربي" req value={form.name_ar||''} onChange={v=>setForm(p=>({...p,name_ar:v}))}/>
<FKText label="الاسم بالإنجليزي" dir="ltr" value={form.name_en||''} onChange={v=>setForm(p=>({...p,name_en:v}))}/>
<FKText label="البريد" dir="ltr" value={form.email||''} onChange={v=>setForm(p=>({...p,email:v}))}/>
<FKText label="الجوال" dir="ltr" value={form.phone||''} onChange={v=>setForm(p=>({...p,phone:v}))}/>
<FKIdField label="رقم الهوية" value={form.id_number||''} onChange={v=>setForm(p=>({...p,id_number:v}))}/>
<FKText label="الجنسية" value={form.nationality||''} onChange={v=>setForm(p=>({...p,nationality:v}))}/>
</div>
</FKSection>},
{title:'الوظيفة والحالة',valid:!!form.role_id,error:saveErr,content:<>
<FKSection Icon={Briefcase} label="الوظيفة">
<div style={FKGRID}>
<FKSelect label="الدور" req value={form.role_id} onChange={v=>setForm(p=>({...p,role_id:v}))} options={roles} getKey={r=>r.id} getLabel={r=>r.name_ar} placeholder="اختر الدور"/>
<FKSelect label="المكتب" value={form.branch_id} onChange={v=>setForm(p=>({...p,branch_id:v}))} options={branches} getKey={b=>b.id} getLabel={b=>b.name_ar} placeholder="اختر المكتب"/>
<FKSwitch label="حساب نشط" hint="يستطيع تسجيل الدخول" checked={form.is_active==='true'} onChange={v=>setForm(p=>({...p,is_active:v?'true':'false'}))}/>
</div>
</FKSection>
<FKSection Icon={StickyNote} label="ملاحظات">
<FKArea label="ملاحظات" rows={2} value={form.notes||''} onChange={v=>setForm(p=>({...p,notes:v}))}/>
</FKSection>
</>},
]}/>}

{/* ═══ ADD/EDIT ROLE POPUP (FormKit) ═══ */}
{(pop==='add_role'||pop==='edit_role')&&<FKModal open onClose={()=>{setSaveErr(null);setPop(null)}} title={pop==='add_role'?'إضافة دور':'تعديل دور'} Icon={Shield} variant={pop==='add_role'?'create':'edit'} width={560}
success={saved?<SuccessView title={form._id?'تم حفظ التعديلات':'تمت إضافة الدور'}/>:null}
errorMsg={saveErr}
footer={<FKAction onClick={saveForm} disabled={saving||!form.name_ar}>{saving?'جاري الحفظ...':(form._id?'حفظ':'إضافة')}</FKAction>}>
<FKSection Icon={Shield} label="بيانات الدور">
<div style={FKGRID}>
<FKText label="الاسم بالعربي" req value={form.name_ar||''} onChange={v=>setForm(p=>({...p,name_ar:v}))}/>
<FKText label="الاسم بالإنجليزي" dir="ltr" value={form.name_en||''} onChange={v=>setForm(p=>({...p,name_en:v}))}/>
<FKColor label="اللون" value={form.color} onChange={v=>setForm(p=>({...p,color:v}))}/>
<FKSwitch label="دور نشط" hint="متاح للتعيين" checked={form.is_active==='true'} onChange={v=>setForm(p=>({...p,is_active:v?'true':'false'}))}/>
<FKArea label="الوصف" rows={2} value={form.description||''} onChange={v=>setForm(p=>({...p,description:v}))}/>
</div>
</FKSection>
</FKModal>}

{/* ═══ PERMISSIONS POPUP (FormKit) ═══ */}
{permPop&&<FKModal open onClose={()=>{setPermErr(null);setPermPop(null)}} title="إدارة الصلاحيات" subtitle={(roles.find(r=>r.id===permPop)?.name_ar||'')+' — '+selPerms.length+' صلاحية مختارة'} Icon={KeyRound} variant="edit" width={620}
success={saved?<SuccessView title="تم حفظ الصلاحيات"/>:null}
errorMsg={permErr}
footer={<FKAction onClick={savePerms} disabled={permSaving}>{permSaving?'جاري الحفظ...':'حفظ الصلاحيات'}</FKAction>}>
<FKSection Icon={KeyRound} label="صلاحيات الدور" hint={selPerms.length+' مختارة'}>
<ScrollBox maxHeight={300}>
{permModules.map(mod=>{const modPerms=perms.filter(p=>p.module===mod);const allChecked=modPerms.every(p=>selPerms.includes(p.id))
return<div key={mod} style={{marginBottom:12}}>
<div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderBottom:'1px solid '+FKC.line}}>
<FKCheckbox label={mod} checked={allChecked} onChange={()=>{if(allChecked)setSelPerms(s=>s.filter(id=>!modPerms.some(p=>p.id===id)));else setSelPerms(s=>[...new Set([...s,...modPerms.map(p=>p.id)])])}}/>
<span style={{fontSize:11,fontWeight:600,color:FKC.tx4}}>{modPerms.filter(p=>selPerms.includes(p.id)).length}/{modPerms.length}</span>
</div>
{modPerms.map(p=>{const checked=selPerms.includes(p.id);return<div key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0 7px 26px'}}>
<FKCheckbox label={p.name_ar} checked={checked} onChange={()=>setSelPerms(s=>checked?s.filter(id=>id!==p.id):[...s,p.id])}/>
<span style={{flex:1}}/>
<span style={{fontSize:10,fontWeight:600,color:FKC.tx5,fontFamily:'monospace',direction:'ltr'}}>{p.action}</span>
</div>})}
</div>})}
</ScrollBox>
</FKSection>
</FKModal>}

{/* ═══ ADD/EDIT BANK ACCOUNT POPUP (FormKit) ═══ */}
{(pop==='add_bank'||pop==='edit_bank')&&<FKModal open onClose={()=>{setSaveErr(null);setPop(null)}} title={pop==='add_bank'?'إضافة حساب بنكي':'تعديل حساب بنكي'} Icon={Landmark} variant={pop==='add_bank'?'create':'edit'}
success={saved?<SuccessView title={form._id?'تم حفظ التعديلات':'تمت إضافة الحساب'}/>:null}
onSubmit={saveForm} submitting={saving} submitLabel={form._id?'حفظ':'إضافة'}
pages={[
{title:'بيانات الحساب',valid:!!form.bank_name&&!!form.account_type,content:
<FKSection Icon={Landmark} label="بيانات الحساب">
<div style={FKGRID}>
<FKText label="اسم البنك" req value={form.bank_name||''} onChange={v=>setForm(p=>({...p,bank_name:v}))}/>
<FKText label="اسم الحساب" value={form.account_name||''} onChange={v=>setForm(p=>({...p,account_name:v}))}/>
<FKText label="رقم الحساب" dir="ltr" value={form.account_number||''} onChange={v=>setForm(p=>({...p,account_number:v}))}/>
<FKSelect label="نوع الحساب" req value={form.account_type||'deposit'} onChange={v=>setForm(p=>({...p,account_type:v}))} options={[{v:'deposit',l:'إيداع'},{v:'sadad',l:'سداد'},{v:'international',l:'حوالات خارجية'}]} getKey={o=>o.v} getLabel={o=>o.l} searchable={false}/>
</div>
</FKSection>},
{title:'الأرقام البنكية',valid:true,content:
<FKSection Icon={CreditCard} label="الأرقام البنكية">
<div style={FKGRID}>
<FKText label="رقم الآيبان (IBAN)" dir="ltr" full upper value={form.iban||''} onChange={v=>setForm(p=>({...p,iban:v.toUpperCase()}))} placeholder="SA..."/>
{form.account_type==='international'&&<FKText label="رمز SWIFT" dir="ltr" upper value={form.swift_code||''} onChange={v=>setForm(p=>({...p,swift_code:v.toUpperCase()}))}/>}
</div>
</FKSection>},
{title:'الربط والإعدادات',valid:true,error:saveErr,content:<>
<FKSection Icon={Link2} label="الربط والحالة">
<div style={FKGRID}>
<FKSelect label="المكتب" value={form.branch_id||''} onChange={v=>setForm(p=>({...p,branch_id:v}))} options={branches} getKey={b=>b.id} getLabel={b=>b.name_ar} placeholder="اختر المكتب"/>
<FKSwitch label="حساب رئيسي" hint="يُعرض أولاً في القوائم" checked={(form.is_primary||'false')==='true'} onChange={v=>setForm(p=>({...p,is_primary:v?'true':'false'}))}/>
<FKSwitch label="حساب نشط" hint="متاح للعمليات" checked={(form.is_active||'true')==='true'} onChange={v=>setForm(p=>({...p,is_active:v?'true':'false'}))}/>
</div>
</FKSection>
<FKSection Icon={StickyNote} label="ملاحظات">
<FKArea label="ملاحظات" rows={2} value={form.notes||''} onChange={v=>setForm(p=>({...p,notes:v}))}/>
</FKSection>
</>},
]}/>}

</div></div>
{/* REVIEW PENDING USER POPUP */}
{pop==='review_pending'&&reviewUser&&(()=>{
const ru=reviewUser;
const visibleRoles=roles.filter(r=>!roleSearch||(r.name_ar||'').includes(roleSearch)||(r.name_en||'').toLowerCase().includes(roleSearch.toLowerCase()));
const submit=async()=>{
if(saving||selRoles.length===0)return;
setSaving(true);setSaveErr(null);
try{
const updates={branch_id:form.branch_id||null,notes:form.notes||null};
if(activateNow){updates.is_active=true;updates.activated_at=new Date().toISOString();updates.activated_by=user?.id||null}
await sb.from('users').update(updates).eq('id',ru.id);
await sb.from('user_roles').delete().eq('user_id',ru.id);
if(selRoles.length>0){await sb.from('user_roles').insert(selRoles.map(rid=>({user_id:ru.id,role_id:rid,assigned_by:user?.id||null})))}
toast(isAr?(activateNow?'تمت الموافقة والتفعيل':'تم حفظ التعديلات'):(activateNow?'Approved and activated':'Changes saved'));
setSaved(true);setTimeout(()=>{setSaved(false);setPop(null);setReviewUser(null);setSelRoles([]);loadAll()},1400);
}catch(e){setSaveErr((isAr?'خطأ: ':'Error: ')+(e.message||''))}
setSaving(false);
};
return <FKModal open onClose={()=>{setSaveErr(null);setPop(null);setReviewUser(null)}} title="مراجعة طلب تسجيل جديد" Icon={UserCheck} variant="add"
success={saved?<SuccessView title={activateNow?'تمت الموافقة والتفعيل':'تم حفظ التعديلات'}/>:null}
onSubmit={submit} submitting={saving} submitLabel="موافقة وتفعيل"
pages={[
{title:'بيانات المتقدم والأدوار',valid:selRoles.length>0,error:selRoles.length===0?'حدّد دوراً واحداً على الأقل':'',content:<>
<FKSection Icon={User} label="بيانات المتقدم" hint="بانتظار الموافقة">
<InfoGrid>
<InfoRow label="الاسم" value={ru.name_ar+(ru.name_en?' · '+ru.name_en:'')}/>
<InfoRow label="البريد" value={ru.email} mono copy/>
<InfoRow label="الجوال" value={ru.phone} mono copy/>
<InfoRow label="رقم الهوية" value={ru.id_number} mono/>
{ru.nationality?<InfoRow label="الجنسية" value={ru.nationality}/>:null}
</InfoGrid>
</FKSection>
<FKSection Icon={Shield} label="التعيين" hint="الموظف يحصل على مجموع صلاحيات جميع الأدوار">
<div style={FKGRID}>
<FKMulti label="الأدوار المعيّنة" req value={selRoles} onChange={arr=>setSelRoles(arr)} options={visibleRoles} getKey={r=>r.id} getLabel={r=>r.name_ar} getSub={r=>r.name_en||''} placeholder="اختر الأدوار"/>
<FKSelect label="الفرع" value={form.branch_id||''} onChange={v=>setForm(p=>({...p,branch_id:v}))} options={branches} getKey={b=>b.id} getLabel={b=>b.name_ar} placeholder="اختر الفرع"/>
</div>
</FKSection>
</>},
{title:'التفعيل والملاحظات',valid:selRoles.length>0,error:saveErr,content:<>
<FKSection Icon={UserCheck} label="التفعيل">
<div style={FKGRID}>
<FKSwitch full label="تفعيل الحساب فوراً" hint="سيتمكن الموظف من تسجيل الدخول بعد الحفظ" checked={activateNow} onChange={v=>setActivateNow(v)}/>
</div>
</FKSection>
<FKSection Icon={StickyNote} label="ملاحظات داخلية" hint="اختياري">
<FKArea label="ملاحظات" rows={2} value={form.notes||''} onChange={v=>setForm(p=>({...p,notes:v}))} placeholder="سبب الموافقة، صلاحيات إضافية، ملاحظات إدارية..."/>
</FKSection>
</>},
]}/>;
})()}

{/* EDIT ACTIVE USER POPUP */}
{pop==='edit_active'&&reviewUser&&(()=>{
const ru=reviewUser;
const ac=ru.roles?.color||roleClrs[ru.roles?.name_ar]||'#9b59b6';
const br=branches.find(b=>b.id===editBranch);
const relD=iso=>{if(!iso)return'—';const d=daysSince(iso);if(d<1)return'اليوم';if(d===1)return'أمس';if(d<7)return'قبل '+d+' أيام';return d+' يوم'};
const updDays=daysSince(ru.updated_at);
const submit=async()=>{
if(saving)return;setSaving(true);setSaveErr(null);
try{
await sb.from('users').update({branch_id:editBranch||null}).eq('id',ru.id);
await sb.from('user_roles').delete().eq('user_id',ru.id);
if(selRoles.length>0){await sb.from('user_roles').insert(selRoles.map(rid=>({user_id:ru.id,role_id:rid,assigned_by:user?.id||null})))}
toast(isAr?'تم حفظ التعديلات':'Changes saved');
setSaved(true);setTimeout(()=>{setSaved(false);setPop(null);setReviewUser(null);loadAll()},1400);
}catch(e){setSaveErr((isAr?'خطأ: ':'Error: ')+(e.message||''))}
setSaving(false);
};
const eKeys=['roles','personal','activity']
return <FKModal open onClose={()=>{setSaveErr(null);setPop(null);setReviewUser(null)}} title="تعديل بيانات الموظف" subtitle={[ru.name_ar,(ru.email||ru.name_en||''),br?.name_ar,ru.updated_at?'آخر تعديل: قبل '+updDays+' أيام':''].filter(Boolean).join(' · ')} Icon={UserCog} variant="edit"
success={saved?<SuccessView title="تم حفظ التعديلات"/>:null}
tab={Math.max(0,eKeys.indexOf(editTab))} onTab={i=>setEditTab(eKeys[i])}
errorMsg={saveErr}
footer={<FKAction onClick={submit} disabled={saving}>{saving?'جاري الحفظ...':'حفظ'}</FKAction>}
tabs={[
{label:'الأدوار والصلاحيات',Icon:Shield,content:<>
<FKSection Icon={Shield} label="الأدوار والفرع">
<div style={FKGRID}>
<FKMulti label="الأدوار" value={selRoles} onChange={arr=>setSelRoles(arr)} options={roles} getKey={r=>r.id} getLabel={r=>r.name_ar} getSub={r=>r.name_en||''} placeholder="اختر الأدوار"/>
<FKSelect label="الفرع" value={editBranch} onChange={v=>setEditBranch(v)} options={branches} getKey={b=>b.id} getLabel={b=>b.name_ar} placeholder="اختر الفرع"/>
</div>
</FKSection>
<FKSection Icon={Activity} label="معلومات الحساب">
<InfoGrid>
<InfoRow label="الإضافة" value={ru.created_at?String(ru.created_at).slice(0,10):'—'} mono/>
<InfoRow label="التفعيل" value={ru.activated_at?String(ru.activated_at).slice(0,10):'—'} mono/>
<InfoRow label="آخر دخول" value={ru.last_login_at?String(ru.last_login_at).slice(0,10):'—'} mono/>
<InfoRow label="فُعل بواسطة" value={user?.name_ar||'—'}/>
</InfoGrid>
</FKSection>
<FKSection Icon={AlertTriangle} label="منطقة الخطر" style={{borderColor:FKC.red+'59'}}>
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
<div>
<div style={{fontSize:13,fontWeight:600,color:FKC.red}}>تعطيل الحساب</div>
<div style={{fontSize:11,color:FKC.tx4,marginTop:2}}>سيتم منع الموظف من تسجيل الدخول</div>
</div>
<FKAction Icon={UserX} color={FKC.red} onClick={()=>{setDeactReason('');setDeactNotes('');setDeactConfirm('');setPop('deactivate_user')}}>تعطيل</FKAction>
</div>
</FKSection>
</>},
{label:'البيانات الشخصية',Icon:User,content:
<FKSection Icon={User} label="البيانات الشخصية" hint="للقراءة فقط">
<InfoGrid>
<InfoRow label="الاسم بالعربي" value={ru.name_ar}/>
<InfoRow label="الاسم بالإنجليزي" value={ru.name_en}/>
<InfoRow label="البريد" value={ru.email} mono copy/>
<InfoRow label="الجوال" value={ru.phone} mono copy/>
<InfoRow label="رقم الهوية" value={ru.id_number} mono/>
<InfoRow label="الجنسية" value={ru.nationality}/>
</InfoGrid>
</FKSection>},
{label:'سجل النشاط',Icon:Activity,content:
<FKSection Icon={Activity} label="سجل النشاط">
<div style={{padding:30,textAlign:'center',color:FKC.tx5,fontSize:13}}>سجل النشاط غير متاح حالياً</div>
</FKSection>},
]}/>;
})()}

{/* DEACTIVATE USER POPUP */}
{pop==='deactivate_user'&&reviewUser&&(()=>{
const ru=reviewUser;
const ac=ru.roles?.color||roleClrs[ru.roles?.name_ar]||'#888';
const reasons=[['end_service','انتهاء الخدمة','الموظف لم يعد يعمل في الشركة'],['leave','إجازة طويلة','تعطيل مؤقت أثناء الإجازة'],['transfer','نقل لفرع آخر','الموظف انتقل لمكان آخر غير متابع'],['other','سبب آخر','اكتب السبب يدوياً في الخانة التالية']];
const canSubmit=deactReason&&deactConfirm.trim()===ru.name_ar?.trim();
const submit=async()=>{
if(saving||!canSubmit)return;setSaving(true);setSaveErr(null);
try{
await sb.from('users').update({is_active:false,deactivated_at:new Date().toISOString(),deactivated_by:user?.id||null,deactivation_reason:reasons.find(r=>r[0]===deactReason)?.[1]||null,notes:deactNotes||null}).eq('id',ru.id);
toast(isAr?'تم تعطيل الحساب':'Account disabled');setSaved(true);setTimeout(()=>{setSaved(false);setPop(null);setReviewUser(null);loadAll()},1400);
}catch(e){setSaveErr((isAr?'خطأ: ':'Error: ')+(e.message||''))}
setSaving(false);
};
return <FKModal open onClose={()=>{setSaveErr(null);setPop('edit_active')}} title="تعطيل حساب الموظف" subtitle={[ru.name_ar,ru.name_en,ru.roles?.name_ar].filter(Boolean).join(' · ')+' — هذا الإجراء يمنع الموظف من الدخول للنظام'} Icon={UserX} variant="delete"
success={saved?<SuccessView title="تم تعطيل الحساب"/>:null}
onSubmit={submit} submitting={saving} submitLabel="تعطيل الحساب" submitIcon={UserX}
pages={[
{title:'سبب التعطيل',valid:!!deactReason,error:!deactReason?'اختر سبب التعطيل':'',content:<>
<FKSection Icon={AlertTriangle} label="سبب التعطيل" hint="إلزامي">
<FKRadioGroup label="السبب" req value={deactReason} onChange={v=>setDeactReason(v)} options={reasons.map(([k,l,d])=>({v:k,l:l+' — '+d}))}/>
</FKSection>
<FKSection Icon={StickyNote} label="ملاحظات إضافية" hint="اختياري">
<FKArea label="ملاحظات" rows={2} value={deactNotes} onChange={v=>setDeactNotes(v)} placeholder="تفاصيل إضافية عن سبب التعطيل..."/>
</FKSection>
</>},
{title:'تأكيد الإجراء',valid:canSubmit,error:saveErr,content:
<FKSection Icon={AlertTriangle} label="تأكيد الإجراء">
<div style={{fontSize:12,color:FKC.tx3,lineHeight:2,marginBottom:10}}>
لن يتمكن الموظف من <span style={{color:FKC.red,fontWeight:600}}>تسجيل الدخول</span> للنظام · ستبقى <span style={{color:FKC.red,fontWeight:600}}>بياناته والمعاملات السابقة محفوظة</span> · يمكنك <span style={{color:FKC.red,fontWeight:600}}>إعادة تفعيل</span> الحساب في أي وقت · الأدوار الحالية ستبقى محفوظة ولن تحذف
</div>
<div style={FKGRID}>
<FKText label={'اكتب اسم الموظف "'+ru.name_ar+'" للتأكيد'} req full value={deactConfirm} onChange={v=>setDeactConfirm(v)} placeholder="اكتب الاسم هنا..." error={deactConfirm&&!canSubmit?'الاسم غير مطابق':null}/>
</div>
</FKSection>},
]}/>;
})()}

{/* REACTIVATE USER POPUP */}
{pop==='reactivate_user'&&reviewUser&&(()=>{
const ru=reviewUser;
const ac=ru.roles?.color||roleClrs[ru.roles?.name_ar]||'#888';
const disDays=ru.deactivated_at?daysSince(ru.deactivated_at):null;
const savedRoles=ru.user_roles||[];
const submit=async()=>{
if(saving)return;setSaving(true);setSaveErr(null);
try{
await sb.from('users').update({is_active:true,activated_at:new Date().toISOString(),activated_by:user?.id||null,deactivated_at:null,deactivation_reason:null}).eq('id',ru.id);
toast(isAr?'تم تفعيل الحساب':'Account enabled');setSaved(true);setTimeout(()=>{setSaved(false);setPop(null);setReviewUser(null);loadAll()},1400);
}catch(e){setSaveErr((isAr?'خطأ: ':'Error: ')+(e.message||''))}
setSaving(false);
};
return <FKModal open onClose={()=>{setSaveErr(null);setPop(null);setReviewUser(null)}} title="إعادة تفعيل الحساب" subtitle={[ru.name_ar,'معطل',ru.name_en,disDays!==null?'معطل منذ '+disDays+' يوم':''].filter(Boolean).join(' · ')} Icon={RefreshCcw} variant="add"
success={saved?<SuccessView title="تم تفعيل الحساب"/>:null}
errorMsg={saveErr}
footer={<FKAction onClick={submit} disabled={saving}>{saving?'جاري التفعيل...':'تفعيل الحساب'}</FKAction>}>
<FKSection Icon={Info} label="معلومات التعطيل السابق">
<InfoGrid>
<InfoRow label="السبب" value={ru.deactivation_reason||'—'}/>
<InfoRow label="عُطل بتاريخ" value={ru.deactivated_at?String(ru.deactivated_at).slice(0,10):'—'} mono/>
<InfoRow label="عُطل بواسطة" value="مهدي اليامي"/>
<InfoRow label="آخر دخول" value={ru.last_login_at?String(ru.last_login_at).slice(0,10):'—'} mono/>
</InfoGrid>
</FKSection>
<FKSection Icon={Shield} label="الأدوار المحفوظة" hint="ستعود فعّالة تلقائياً بعد التفعيل">
<InfoGrid style={{gridTemplateColumns:'1fr'}}>
<InfoRow label="الأدوار" value={savedRoles.map(ur=>ur.roles?.name_ar).filter(Boolean).join(' · ')||'لا توجد أدوار محفوظة'}/>
</InfoGrid>
</FKSection>
<FKSection Icon={Mail} label="الإشعار" hint="سيتمكن الموظف من الدخول فوراً بعد التفعيل بنفس بيانات الدخول السابقة">
<div style={FKGRID}>
<FKSwitch full label="إرسال إشعار للموظف" hint="بريد إلكتروني لإعلامه بإعادة تفعيل حسابه" checked={reactNotify} onChange={v=>setReactNotify(v)}/>
</div>
</FKSection>
</FKModal>;
})()}

{/* ADD ROLE FULL POPUP */}
{pop==='add_role_full'&&(()=>{
const colors=['#16a085','#9b59b6','#3498db','#d4ac0d','#e74c3c','#27ae60','#e67e22','#e91e63'];
const modsLabels={'users':'إدارة الموظفين','transactions':'المعاملات والخدمات','clients':'العملاء والمنشآت','workers':'العمالة والتأشيرات','finance':'المالية والفواتير','reports':'التقارير والإحصائيات','settings':'الإعدادات والنظام'};
const permsByMod={};perms.forEach(p=>{const m=p.module||'other';if(!permsByMod[m])permsByMod[m]=[];permsByMod[m].push(p)});
const filteredPerms=rolePermSearch?perms.filter(p=>((p.name_ar||'').includes(rolePermSearch)||(p.action||'').toLowerCase().includes(rolePermSearch.toLowerCase())||(p.module||'').toLowerCase().includes(rolePermSearch.toLowerCase()))):perms;
const visMods=[...new Set(filteredPerms.map(p=>p.module))];
const curMod=roleActiveMod&&visMods.includes(roleActiveMod)?roleActiveMod:(visMods[0]||'');
const curModPerms=(permsByMod[curMod]||[]).filter(p=>filteredPerms.includes(p));
const curModAllSel=curModPerms.length>0&&curModPerms.every(p=>selPerms.includes(p.id));
const canNext1=form.name_ar&&form.name_en&&form.code;
const canSubmit=form.name_ar&&form.code&&selPerms.length>0;
const submit=async()=>{
if(saving)return;
setSaving(true);setSaveErr(null);
try{
const{data:newR,error}=await sb.from('roles').insert({name_ar:form.name_ar,name_en:form.name_en||null,description:form.description||null,color:form.color||C.gold,is_active:true,is_system:false}).select('id').single();
if(error)throw error;
if(selPerms.length>0){await sb.from('role_permissions').insert(selPerms.map(pid=>({role_id:newR.id,permission_id:pid})))}
toast(isAr?'تم إنشاء الدور':'Role created');setSaved(true);setTimeout(()=>{setSaved(false);setPop(null);loadAll()},1400);
}catch(e){setSaveErr((isAr?'خطأ: ':'Error: ')+(e.message||''))}
setSaving(false);
};
// ── صفحة 1: المعلومات الأساسية ──
const page1=(
<FKSection Icon={Shield} label="المعلومات الأساسية">
<div style={FKGRID}>
<FKText label="الاسم بالعربي" req value={form.name_ar||''} onChange={v=>setForm(p=>({...p,name_ar:v}))} placeholder="مسؤول تأشيرات"/>
<FKText label="الاسم بالإنجليزي" req dir="ltr" value={form.name_en||''} onChange={v=>setForm(p=>({...p,name_en:v}))} placeholder="Visa Officer"/>
<FKText label="المعرّف البرمجي" req hint="لا يمكن تغييره لاحقاً" dir="ltr" value={form.code||''} onChange={v=>setForm(p=>({...p,code:String(v).toLowerCase().replace(/[^a-z0-9_]/g,'')}))} placeholder="visa_officer"/>
<FKSelect label="مستوى الوصول" value={String(roleLevel)} onChange={v=>setRoleLevel(Number(v))} searchable={false}
options={[{v:'1',l:'1 — أساسي'},{v:'2',l:'2 — مسؤول متخصص'},{v:'3',l:'3 — مدير'},{v:'4',l:'4 — مدير عام'}]}
getKey={o=>o.v} getLabel={o=>o.l}/>
<FKArea label="الوصف" hint="اختياري" rows={2} value={form.description||''} onChange={v=>setForm(p=>({...p,description:v}))} placeholder="وصف مختصر عن مسؤوليات هذا الدور..."/>
</div>
</FKSection>
);
// ── صفحة 2: المظهر ونطاق الوصول ──
const page2=(
<>
<FKSection Icon={Palette} label="الشكل المرئي" hint="لون الدور وشارته">
<div style={FKGRID}>
<FKColor label="لون الدور" value={form.color||'#3483b4'} onChange={v=>setForm(p=>({...p,color:v}))} swatches={colors}/>
<div>
<div style={{fontSize:14,fontWeight:600,color:FKC.tx3,marginBottom:9,textAlign:'start'}}>المعاينة</div>
<div style={{height:42,borderRadius:9,background:FKC.inputBg,boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
<span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:12,padding:'5px 12px',borderRadius:14,background:(form.color||'#3483b4')+'20',border:'1px solid '+(form.color||'#3483b4')+'50',color:form.color||'#3483b4',fontWeight:600}}>
<Shield size={11} strokeWidth={2.2}/>{form.name_ar||'اسم الدور'}
</span>
</div>
</div>
</div>
</FKSection>
<FKSection Icon={Eye} label="نطاق الوصول">
<FKSegmented full value={roleScope} onChange={setRoleScope}
options={[{v:'all_branches',l:'جميع الفروع',sub:'وصول شامل لبيانات جميع الفروع'},{v:'own_branch',l:'فرع الموظف فقط',sub:'يرى بيانات الفرع المعيّن له فقط'}]} height={52}/>
</FKSection>
<FKSection Icon={Settings2} label="إعدادات إضافية">
<div style={FKGRID}>
<FKSwitch label="قابل للتعيين" hint="السماح بتعيين هذا الدور لموظفين جدد" checked={roleAssignable} onChange={setRoleAssignable}/>
<FKSwitch label="يتطلب تصعيد تلقائي" hint="إشعار المدير عند تجاوز حدود الصلاحية" checked={roleEscalation} onChange={setRoleEscalation}/>
</div>
</FKSection>
</>
);
// ── صفحة 3: الصلاحيات (القائمة وحدها تتمرّر عبر ScrollBox — النافذة ثابتة) ──
const page3=(
<FKSection Icon={KeyRound} label="الصلاحيات" hint={`${selPerms.length} محدّدة`}>
<div style={{display:'flex',flexDirection:'column',gap:10}}>
<FKText value={rolePermSearch} onChange={setRolePermSearch} placeholder="ابحث في الصلاحيات..."/>
<div style={{display:'flex',gap:6,overflowX:'auto',flexShrink:0,paddingBottom:2,scrollbarWidth:'none'}}>
{visMods.map(m=>{const mPerms=(permsByMod[m]||[]).filter(p=>filteredPerms.includes(p));const modSel=mPerms.filter(p=>selPerms.includes(p.id)).length;const isCur=m===curMod;return <div key={m} onClick={()=>setRoleActiveMod(m)} style={{padding:'6px 12px',borderRadius:8,background:isCur?FKC.gold+'26':'rgba(255,255,255,.03)',border:'1px solid '+(isCur?FKC.gold+'59':'rgba(255,255,255,.06)'),cursor:'pointer',display:'flex',alignItems:'center',gap:6,flexShrink:0,transition:'.15s'}}>
<span style={{fontSize:11,fontWeight:600,color:isCur?FKC.gold:FKC.tx2,whiteSpace:'nowrap'}}>{modsLabels[m]||m}</span>
<span style={{fontSize:9,padding:'1px 6px',borderRadius:8,background:modSel>0?FKC.gold+'22':'rgba(255,255,255,.05)',color:modSel>0?FKC.gold:FKC.tx5,fontWeight:600}}>{modSel}/{mPerms.length}</span>
</div>})}
</div>
{curMod&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
<div style={{fontSize:11,color:FKC.tx5}}>{modsLabels[curMod]||curMod}</div>
<div style={{display:'flex',gap:6}}>
<button onClick={()=>setSelPerms(perms.map(p=>p.id))} style={{padding:'4px 10px',borderRadius:6,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.03)',color:FKC.tx3,fontSize:10,fontWeight:600,fontFamily:F,cursor:'pointer'}}>الكل</button>
<button onClick={()=>{if(curModAllSel){setSelPerms(s=>s.filter(id=>!curModPerms.some(p=>p.id===id)))}else{setSelPerms(s=>[...new Set([...s,...curModPerms.map(p=>p.id)])])}}} style={{padding:'4px 10px',borderRadius:6,border:'1px solid '+FKC.gold+'33',background:FKC.gold+'14',color:FKC.gold,fontSize:10,fontWeight:600,fontFamily:F,cursor:'pointer'}}>{curModAllSel?'إلغاء القسم':'تحديد القسم'}</button>
</div>
</div>}
<ScrollBox maxHeight={190}>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,alignContent:'flex-start'}}>
{curModPerms.map(p=>{const ck=selPerms.includes(p.id);return <div key={p.id} onClick={()=>setSelPerms(s=>ck?s.filter(id=>id!==p.id):[...s,p.id])} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:8,background:ck?FKC.gold+'14':'rgba(255,255,255,.02)',border:'1px solid '+(ck?FKC.gold+'4d':'rgba(255,255,255,.06)'),cursor:'pointer',transition:'.1s',minHeight:38,boxSizing:'border-box'}}>
<span style={{width:16,height:16,borderRadius:4,border:ck?'none':'1.5px solid rgba(255,255,255,.18)',background:ck?FKC.gold:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{ck?<svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="#000" strokeWidth="3" strokeLinecap="round"/></svg>:null}</span>
<span style={{flex:1,minWidth:0}}>
<span style={{display:'block',fontSize:11,fontWeight:600,color:ck?FKC.gold:FKC.tx,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.name_ar||p.action}</span>
<span style={{display:'block',fontSize:9,color:FKC.tx5,direction:'ltr',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.module}.{p.action}</span>
</span>
</div>})}
{curModPerms.length===0&&<div style={{gridColumn:'1/-1',padding:16,textAlign:'center',fontSize:10,color:FKC.tx5}}>لا توجد صلاحيات</div>}
</div>
</ScrollBox>
</div>
</FKSection>
);
return <FKModal open onClose={()=>{setSaveErr(null);setPop(null)}} title="إضافة دور جديد" Icon={Shield} variant="create" width={720}
onSubmit={submit} submitting={saving} submitLabel="إنشاء الدور"
success={saved?<SuccessView title="تم إنشاء الدور"/>:null}
pages={[
{title:'المعلومات الأساسية',valid:!!canNext1,error:canNext1?'':'أكمل الحقول الإلزامية (*) للمتابعة',content:page1},
{title:'المظهر ونطاق الوصول',valid:true,content:page2},
{title:'الصلاحيات',valid:!!canSubmit,error:canSubmit?(saveErr||''):'حدّد صلاحية واحدة على الأقل',content:page3},
]}/>;
})()}

{/* DELETE CONFIRM (FormKit) */}
<ConfirmDialog open={!!delTarget} itemName={delTarget?.name} onConfirm={confirmDel} onCancel={()=>setDelTarget(null)}/>
</div>}

function UiControlsTab({sb,users,toast,lang,nav,hubTabs,visibility,onVisibilityChange}){
  const isAr=lang!=='en'
  const F="'Cairo',sans-serif"
  const C={gold:'#D4A017',ok:'#27a046',red:'#c0392b',blue:'#3483b4'}
  // Sections grouped by feature area — add new sections here as you gate more features
  const SECTIONS=[]
  const MODES=[
    {v:'everyone',l:'الجميع',c:C.ok,ic:'✓'},
    {v:'disabled',l:'معطّل',c:C.red,ic:'✕'},
    {v:'gm_only',l:'المدير العام فقط',c:C.gold,ic:'♛'},
    {v:'custom',l:'موظفون محددون',c:C.blue,ic:'●'},
  ]
  const[perms,setPerms]=React.useState({})
  const[loading,setLoading]=React.useState(true)
  React.useEffect(()=>{sb.from('ui_controls').select('*').then(({data})=>{if(data)setPerms(Object.fromEntries(data.map(r=>[r.control_key,r])));setLoading(false)})},[sb])
  const updateMode=async(key,mode)=>{const current=perms[key]||{control_key:key,allowed_user_ids:[]};const next={...current,mode,updated_at:new Date().toISOString()};setPerms(p=>({...p,[key]:next}));await sb.from('ui_controls').upsert({control_key:key,mode,allowed_user_ids:current.allowed_user_ids||[]});toast&&toast(isAr?'تم الحفظ':'Saved')}
  const toggleUser=async(key,userId)=>{const current=perms[key]||{control_key:key,mode:'custom',allowed_user_ids:[]};const arr=current.allowed_user_ids||[];const nextArr=arr.includes(userId)?arr.filter(u=>u!==userId):[...arr,userId];const next={...current,allowed_user_ids:nextArr};setPerms(p=>({...p,[key]:next}));await sb.from('ui_controls').upsert({control_key:key,mode:current.mode||'custom',allowed_user_ids:nextArr})}
  if(loading)return<PageSkeleton variant="list" listRows={6}/>
  // Sidebar visibility toggles (localStorage-based, applies to all users)
  const LOCKED_NAV=['admin_hub','admin_visibility']
  const visGet=(id)=>(visibility||{})[id]!==false
  const visToggle=(id)=>{if(LOCKED_NAV.includes(id))return;const next={...(visibility||{}),[id]:!visGet(id)};onVisibilityChange&&onVisibilityChange(next);toast&&toast(isAr?(next[id]?'تم الإظهار':'تم الإخفاء'):(next[id]?'Shown':'Hidden'))}
  const showAllNav=()=>{onVisibilityChange&&onVisibilityChange({});toast&&toast(isAr?'تم إظهار كل التبويبات':'All tabs shown')}
  const NavToggle=({id,label})=>{const on=visGet(id);const locked=LOCKED_NAV.includes(id)
    return<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:'8px 12px',borderRadius:8,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.05)',opacity:locked?.6:1}}>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <span style={{color:on?'var(--tx)':'var(--tx4)',fontSize:12,fontWeight:600}}>{label}</span>
        {locked&&<span style={{fontSize:8,padding:'1px 6px',borderRadius:4,background:'rgba(212,160,23,.1)',color:C.gold,fontWeight:700}}>دائم</span>}
      </div>
      <button type="button" disabled={locked} onClick={()=>visToggle(id)} style={{width:40,height:20,borderRadius:999,border:'none',background:on?C.ok:'rgba(255,255,255,.15)',cursor:locked?'not-allowed':'pointer',position:'relative',padding:0,transition:'.2s',flexShrink:0}}>
        <span style={{position:'absolute',width:14,height:14,borderRadius:'50%',background:'#fff',top:3,right:on?3:23,transition:'.2s'}}/>
      </button>
    </div>}
  return<div style={{fontFamily:F,direction:'rtl'}}>
    <div style={{fontSize:12,color:'rgba(255,255,255,.55)',marginBottom:18,lineHeight:1.7}}>حدد لكل زر أو عنصر: يظهر للجميع، أو معطّل تماماً، أو للمدير العام فقط، أو لموظفين محددين. قسم التبويبات الجانبية يُطبَّق على جميع المستخدمين.</div>

    {/* ─── Sidebar Visibility Section ─── */}
    {nav&&hubTabs&&<div style={{marginBottom:24}}>
      <div style={{fontSize:13,fontWeight:800,color:C.gold,marginBottom:10,paddingBottom:6,borderBottom:'1px solid rgba(212,160,23,.15)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:15}}>📂</span>
          <span>التبويبات المرئية — القائمة الجانبية</span>
        </div>
        <button onClick={showAllNav} style={{height:28,padding:'0 12px',borderRadius:7,border:'1px solid rgba(212,160,23,.25)',background:'rgba(212,160,23,.06)',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer'}}>إظهار الكل</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:8}}>
        {nav.map(n=>{const subs=hubTabs[n.id]||[]
        return<div key={n.id} style={{padding:10,borderRadius:10,background:'rgba(0,0,0,.2)',border:'1px solid rgba(255,255,255,.04)'}}>
          <NavToggle id={n.id} label={n.l}/>
          {subs.length>0&&<div style={{paddingRight:14,marginTop:5,display:'flex',flexDirection:'column',gap:4,borderRight:'2px solid rgba(212,160,23,.12)',marginRight:8}}>
            {subs.map(t=><NavToggle key={t.id} id={t.id} label={t.l}/>)}
          </div>}
        </div>})}
      </div>
    </div>}

    {SECTIONS.map(section=><div key={section.id} style={{marginBottom:24}}>
      <div style={{fontSize:13,fontWeight:800,color:C.gold,marginBottom:10,paddingBottom:6,borderBottom:'1px solid rgba(212,160,23,.15)',display:'flex',alignItems:'center',gap:8}}>
        <span style={{fontSize:15}}>{section.icon}</span>
        <span>{section.l}</span>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {section.controls.map(ctrl=>{const p=perms[ctrl.k]||{mode:'gm_only',allowed_user_ids:[]};const isCustom=p.mode==='custom'
        return<div key={ctrl.k} style={{padding:'14px 16px',borderRadius:12,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.06)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,marginBottom:10,flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:240}}>
              <div style={{fontSize:14,fontWeight:800,color:'var(--tx)',marginBottom:3}}>{ctrl.l}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.5)'}}>{ctrl.d}</div>
            </div>
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {MODES.map(m=>{const active=p.mode===m.v
              return<button key={m.v} onClick={()=>updateMode(ctrl.k,m.v)} style={{fontSize:11,fontWeight:700,padding:'6px 12px',borderRadius:7,border:'1px solid '+(active?m.c+'66':'rgba(255,255,255,.1)'),background:active?m.c+'1a':'transparent',color:active?m.c:'rgba(255,255,255,.6)',cursor:'pointer',fontFamily:F,display:'inline-flex',alignItems:'center',gap:5}}>
                <span>{m.ic}</span>{m.l}
              </button>})}
            </div>
          </div>
          {isCustom&&<div style={{marginTop:4,paddingTop:10,borderTop:'1px dashed rgba(255,255,255,.08)'}}>
            <div style={{fontSize:10,color:'rgba(255,255,255,.5)',fontWeight:600,marginBottom:6}}>اختر الموظفين المسموح لهم:</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
              {users.map(u=>{const sel=(p.allowed_user_ids||[]).includes(u.id)
              return<button key={u.id} onClick={()=>toggleUser(ctrl.k,u.id)} style={{fontSize:10.5,fontWeight:700,padding:'4px 10px',borderRadius:5,border:'1px solid '+(sel?'rgba(39,160,70,.4)':'rgba(255,255,255,.1)'),background:sel?'rgba(39,160,70,.1)':'transparent',color:sel?C.ok:'rgba(255,255,255,.55)',cursor:'pointer',fontFamily:F}}>{u.name_ar}</button>})}
            </div>
          </div>}
        </div>})}
      </div>
    </div>)}
  </div>
}
