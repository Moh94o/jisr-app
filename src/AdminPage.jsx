import React,{useState,useEffect,useCallback} from 'react'
const F="'Cairo',sans-serif"
const C={dk:'#171717',fm:'#1e1e1e',gold:'#c9a84c',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}
const num=v=>Number(v||0).toLocaleString('en-US')
const roleClrs={'المدير العام':'#e8c547','مدير فرع':'#85B7EB','محاسب':'#AFA9EC','موظف استقبال':'#5DCAA5'}
const daysSince=iso=>{if(!iso)return 0;return Math.floor((Date.now()-new Date(iso).getTime())/86400000)}

const fS={width:'100%',height:42,padding:'0 14px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:F,fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',background:'rgba(255,255,255,.07)',textAlign:'center'}
const bS={height:36,padding:'0 16px',borderRadius:8,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.12)',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5}
const lblS={fontSize:11,fontWeight:600,color:'var(--tx3)',marginBottom:5}
const IB=({l,v,copy,toast})=><div style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'14px 16px',border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:9,color:'var(--tx5)',marginBottom:6}}>{l}</div><div style={{display:'flex',alignItems:'center',gap:6}}><div style={{fontSize:14,fontWeight:700,color:'rgba(255,255,255,.85)',direction:copy?'ltr':'inherit'}}>{v||'—'}</div>{copy&&v&&<button onClick={e=>{e.stopPropagation();navigator.clipboard.writeText(String(v));toast&&toast('تم النسخ')}} style={{width:20,height:20,borderRadius:5,border:'none',background:'rgba(255,255,255,.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,fontSize:9,color:'var(--tx5)'}}>⎘</button>}</div></div>

const BadgeStatus=({v})=><span style={{fontSize:10,fontWeight:600,padding:'3px 8px',borderRadius:6,background:v?'rgba(39,160,70,.1)':'rgba(192,57,43,.1)',color:v?C.ok:C.red}}>{v?'نشط':'معطّل'}</span>

function CustomSelect({value,onChange,options,placeholder,style:sx}){
const[open,setOpen]=useState(false)
const ref=React.useRef(null)
const[pos,setPos]=useState({top:0,left:0,width:0})
const selected=options.find(o=>String(o.v)===String(value))
React.useEffect(()=>{if(!open)return;const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h)},[open])
const handleOpen=()=>{if(ref.current){const r=ref.current.getBoundingClientRect();setPos({top:r.bottom+4,left:r.left,width:r.width})};setOpen(!open)}
return<div ref={ref} style={{position:'relative',...sx}}>
<div onClick={handleOpen} style={{...fS,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',background:open?'rgba(255,255,255,.1)':'rgba(255,255,255,.07)',borderColor:open?'rgba(201,168,76,.35)':'rgba(255,255,255,.12)'}}>
<span style={{color:selected?'rgba(255,255,255,.95)':'rgba(255,255,255,.3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,textAlign:'center'}}>{selected?selected.l:placeholder||'— اختر —'}</span>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,transition:'.2s',transform:open?'rotate(180deg)':'none'}}><polyline points="6 9 12 15 18 9"/></svg>
</div>
{open&&<div style={{position:'fixed',top:pos.top,left:pos.left,width:pos.width,background:'#252525',border:'1px solid rgba(255,255,255,.15)',borderRadius:10,overflow:'hidden',zIndex:9999,maxHeight:200,overflowY:'auto',boxShadow:'0 12px 32px rgba(0,0,0,.6)'}}>
{options.map(o=><div key={o.v} onClick={()=>{onChange(String(o.v));setOpen(false)}} style={{padding:'10px 14px',fontSize:13,fontWeight:String(o.v)===String(value)?700:500,color:String(o.v)===String(value)?C.gold:'rgba(255,255,255,.8)',background:String(o.v)===String(value)?'rgba(201,168,76,.08)':'transparent',cursor:'pointer',borderBottom:'1px solid var(--bd2)',textAlign:'center',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>{o.l}{String(o.v)===String(value)&&<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}</div>)}
</div>}
</div>}

function DeletePopup({onConfirm,onCancel,itemName}){
return<div onClick={onCancel} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.8)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1001,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:420,overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.5)',border:'1px solid rgba(192,57,43,.15)'}}>
<div style={{height:3,background:'linear-gradient(90deg,transparent,'+C.red+' 30%,#e74c3c 50%,'+C.red+' 70%,transparent)'}}/>
<div style={{padding:'28px 24px',textAlign:'center'}}>
<div style={{width:56,height:56,borderRadius:'50%',background:'rgba(192,57,43,.08)',border:'2px solid rgba(192,57,43,.15)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
</div>
<div style={{fontSize:16,fontWeight:700,color:C.red,marginBottom:8}}>تأكيد الحذف</div>
<div style={{fontSize:13,color:'var(--tx3)',lineHeight:1.8,marginBottom:4}}>هل أنت متأكد من حذف</div>
{itemName&&<div style={{fontSize:14,fontWeight:700,color:'var(--tx2)',marginBottom:4}}>"{itemName}"</div>}
<div style={{fontSize:11,color:'var(--tx5)',marginBottom:20}}>هذا الإجراء لا يمكن التراجع عنه</div>
<div style={{display:'flex',gap:10,justifyContent:'center'}}>
<button onClick={onConfirm} style={{height:42,padding:'0 24px',borderRadius:10,border:'none',background:C.red,color:'#fff',fontFamily:F,fontSize:13,fontWeight:700,cursor:'pointer',flex:1}}>نعم، احذف</button>
<button onClick={onCancel} style={{height:42,padding:'0 24px',borderRadius:10,border:'1.5px solid rgba(255,255,255,.1)',background:'transparent',color:'var(--tx3)',fontFamily:F,fontSize:13,fontWeight:600,cursor:'pointer',flex:1}}>إلغاء</button>
</div></div></div></div>}

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

const saveForm=async()=>{setSaving(true);try{const t=form._table;const id=form._id;const d={...form};delete d._table;delete d._id;Object.keys(d).forEach(k=>{if(d[k]==='')d[k]=null})
if(d.is_active!==undefined&&d.is_active!==null)d.is_active=d.is_active==='true'
if(d.is_system!==undefined&&d.is_system!==null)d.is_system=d.is_system==='true'
if(d.is_primary!==undefined&&d.is_primary!==null)d.is_primary=d.is_primary==='true'
if(t==='branches'&&d.mobile)d.mobile='+966'+d.mobile.replace(/^\+966/,'')
if(t==='branches'&&d.code){const c=cities.find(x=>x.id===d.city_id);const prefix=c?(c.code||c.name_ar?.slice(0,3)):'';d.code=prefix+'-'+d.code.replace(/^.*-/,'')}
if(id){d.updated_by=user?.id;const{error}=await sb.from(t).update(d).eq('id',id);if(error)throw error;toast('تم التعديل')}
else{d.created_by=user?.id;const{error}=await sb.from(t).insert(d);if(error)throw error;toast('تمت الإضافة')}
setPop(null);loadAll()}catch(e){toast('خطأ: '+e.message?.slice(0,80))}setSaving(false)}

const confirmDel=async()=>{if(!delTarget)return;const{table,id}=delTarget
await sb.from(table).update({deleted_at:new Date().toISOString(),deleted_by:user?.id}).eq('id',id)
toast('تم الحذف');setDelTarget(null);loadAll()}

const savePerms=async()=>{if(!permPop)return;setPermSaving(true);try{
await sb.from('role_permissions').delete().eq('role_id',permPop)
if(selPerms.length>0){const ins=selPerms.map(pid=>({role_id:permPop,permission_id:pid}));const{error}=await sb.from('role_permissions').insert(ins);if(error)throw error}
toast('تم حفظ الصلاحيات');setPermPop(null);loadAll()
}catch(e){toast('خطأ: '+e.message?.slice(0,80))}setPermSaving(false)}

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
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
<div>
{!defaultTab&&<><div style={{fontSize:20,fontWeight:700,color:'rgba(255,255,255,.93)'}}>الإدارة</div>
<div style={{fontSize:12,color:'var(--tx4)',marginTop:6}}>إدارة المكاتب والموظفين والأدوار والصلاحيات</div></>}
</div>
{tab!=='users'&&<button onClick={()=>{
if(tab==='branches')openAdd()
else if(tab==='bank_accounts'){setForm({_table:'bank_accounts',bank_name:'',account_name:'',account_number:'',iban:'',swift_code:'',account_type:'deposit',branch_id:'',is_primary:'false',is_active:'true',notes:''});setPop('add_bank')}
else if(tab==='roles'){setForm({_table:'roles',name_ar:'',name_en:'',description:'',color:'',is_active:'true'});setPop('add_role')}
}} style={bS}>{{branches:'مكتب +',bank_accounts:'حساب بنكي +',roles:'دور +'}[tab]}</button>}
</div>


<div style={{display:'flex',gap:0}}>
{!defaultTab&&<div style={{width:90,flexShrink:0,borderLeft:'1px solid rgba(255,255,255,.05)',paddingTop:2}}>
{[...tabs].map(t=><div key={t.id} onClick={()=>{setTab(t.id);setQ('');setFilterStatus('all');setFilterRegion('all')}} style={{padding:'6px 8px',fontSize:10,fontWeight:tab===t.id?700:500,color:tab===t.id?C.gold:'rgba(255,255,255,.3)',cursor:'pointer',borderRight:tab===t.id?'2px solid '+C.gold:'2px solid transparent',transition:'.1s'}}>{t.l}</div>)}
</div>}
<div style={{flex:1,...(!defaultTab?{paddingRight:8}:{})}}>

{/* ═══════════════ BRANCHES TAB ═══════════════ */}
{tab==='branches'&&<>
{/* Search + Filters */}
<div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
<div style={{flex:1,minWidth:200,position:'relative'}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2" style={{position:'absolute',top:'50%',transform:'translateY(-50%)',right:14}}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
<input value={q} onChange={e=>setQ(e.target.value)} placeholder="بحث بالاسم، الكود، الجوال، البريد..." style={{...fS,textAlign:'right',paddingRight:38}}/>
</div>
{[['all','الكل'],['active','نشط'],['inactive','معطّل']].map(([k,l])=>
<div key={k} onClick={()=>setFilterStatus(k)} style={{height:42,padding:'0 14px',borderRadius:10,border:'1.5px solid '+(filterStatus===k?'rgba(201,168,76,.3)':'rgba(255,255,255,.1)'),background:filterStatus===k?'rgba(201,168,76,.1)':'rgba(255,255,255,.04)',color:filterStatus===k?C.gold:'rgba(255,255,255,.35)',fontFamily:F,fontSize:11,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{l}</div>)}
{regions.length>0&&<select value={filterRegion} onChange={e=>setFilterRegion(e.target.value)} style={{...fS,width:160,cursor:'pointer',fontSize:11}}>
<option value="all">كل المناطق</option>
{regions.map(r=><option key={r.id} value={r.id}>{r.name_ar}</option>)}
</select>}
</div>

{/* Branch Cards */}
{loading?<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>جاري التحميل...</div>:
filteredBranches.length===0?<div style={{textAlign:'center',padding:60,color:'var(--tx6)',fontSize:13}}>لا توجد مكاتب</div>:
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:12}}>
{filteredBranches.map(b=>{const bUsers=users.filter(u=>u.branch_id===b.id);const reg=regions.find(r=>r.id===b.region_id);const cit=cities.find(c=>c.id===b.city_id)
return<div key={b.id} onClick={()=>{setViewTab('info');setViewPop(b)}} style={{background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:14,overflow:'hidden',cursor:'pointer',transition:'.15s'}}>
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
<button title={b.is_active?'تعطيل المكتب':'تفعيل المكتب'} onClick={async()=>{await sb.from('branches').update({is_active:!b.is_active}).eq('id',b.id);toast(b.is_active?'تم تعطيل المكتب':'تم تفعيل المكتب');loadAll()}} style={{width:28,height:28,borderRadius:7,border:'1px solid '+(b.is_active?'rgba(192,57,43,.15)':'rgba(39,160,70,.15)'),background:b.is_active?'rgba(192,57,43,.06)':'rgba(39,160,70,.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{b.is_active?<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.ok} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}</button>
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
<div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
<div style={{flex:1,minWidth:200,position:'relative'}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2" style={{position:'absolute',top:'50%',transform:'translateY(-50%)',right:14}}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
<input value={q} onChange={e=>setQ(e.target.value)} placeholder="بحث بالبنك، الآيبان، رقم الحساب..." style={{...fS,textAlign:'right',paddingRight:38}}/>
</div>
{[['all','الكل'],['active','نشط'],['inactive','معطّل']].map(([k,l])=>
<div key={k} onClick={()=>setFilterStatus(k)} style={{height:42,padding:'0 14px',borderRadius:10,border:'1.5px solid '+(filterStatus===k?'rgba(201,168,76,.3)':'rgba(255,255,255,.1)'),background:filterStatus===k?'rgba(201,168,76,.1)':'rgba(255,255,255,.04)',color:filterStatus===k?C.gold:'rgba(255,255,255,.35)',fontFamily:F,fontSize:11,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{l}</div>)}
{[['all','الكل','rgba(255,255,255,.35)'],['deposit','إيداع',C.gold],['sadad','سداد',C.blue],['international','خارجي',C.ok]].map(([k,l,c])=>
<div key={k} onClick={()=>setFilterRegion(k)} style={{height:42,padding:'0 12px',borderRadius:10,border:'1.5px solid '+(filterRegion===k?c+'40':'rgba(255,255,255,.1)'),background:filterRegion===k?c+'12':'rgba(255,255,255,.04)',color:filterRegion===k?c:'rgba(255,255,255,.35)',fontFamily:F,fontSize:11,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{l}</div>)}
</div>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:12}}>
{filtBA.map(a=>{const br=branches.find(b=>b.id===a.branch_id);const typeMap={deposit:{l:'إيداع',c:C.gold},sadad:{l:'سداد',c:C.blue},international:{l:'حوالات خارجية',c:C.ok}};const tp=typeMap[a.account_type]||typeMap.deposit
return<div key={a.id} style={{background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:14,overflow:'hidden'}}>
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
<button onClick={async()=>{await sb.from('bank_accounts').update({is_active:!a.is_active}).eq('id',a.id);toast(a.is_active?'تم تعطيل الحساب':'تم تفعيل الحساب');loadAll()}} style={{width:26,height:26,borderRadius:6,border:'1px solid '+(a.is_active?'rgba(192,57,43,.15)':'rgba(39,160,70,.15)'),background:a.is_active?'rgba(192,57,43,.04)':'rgba(39,160,70,.04)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{a.is_active?<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>:<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.ok} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}</button>
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
<button onClick={()=>{setForm({_table:'roles',name_ar:'',name_en:'',code:'',description:'',color:'#3483b4',is_active:'true',level:2});setSelPerms([]);setRoleScope('own_branch');setRoleLevel(2);setRoleAssignable(true);setRoleEscalation(false);setRolePermSearch('');setRoleOpenMods({});setRoleWizStep(1);setRoleActiveMod('');setPop('add_role_full')}} style={{height:40,padding:'0 20px',borderRadius:10,background:'rgba(212,160,23,.12)',border:'1px solid rgba(212,160,23,.2)',color:C.gold,fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
إضافة دور وصلاحيات
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
</button>
</div>
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
<div style={{padding:'14px 18px',borderRadius:14,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
<div style={{width:36,height:36,borderRadius:10,background:'rgba(39,160,70,.1)',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.ok} strokeWidth="2"><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/></svg></div>
<div style={{textAlign:'left',flex:1}}>
<div style={{fontSize:11,color:'var(--tx4)'}}>إجمالي الموظفين</div>
<div style={{fontSize:26,fontWeight:900,color:'var(--tx)',lineHeight:1.1,marginTop:2}}>{users.length}</div>
<div style={{fontSize:9,marginTop:4,display:'flex',gap:8}}>
<span style={{color:C.ok}}>● {activeUsers.length} نشط</span>
<span style={{color:C.red}}>● {disabled.length} معطل</span>
<span style={{color:'#b8722a'}}>● {pending.length} بانتظار</span>
</div>
</div>
</div>
<div style={{padding:'14px 18px',borderRadius:14,background:pending.length>0?'rgba(184,114,42,.04)':'rgba(255,255,255,.02)',border:'1px solid '+(pending.length>0?'rgba(184,114,42,.2)':'var(--bd)'),display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
<div style={{width:36,height:36,borderRadius:10,background:'rgba(184,114,42,.1)',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b8722a" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
<div style={{textAlign:'left',flex:1}}>
<div style={{fontSize:11,color:'var(--tx4)'}}>بانتظار الموافقة</div>
<div style={{fontSize:26,fontWeight:900,color:'var(--tx)',lineHeight:1.1,marginTop:2}}>{pending.length}</div>
<div style={{fontSize:9,marginTop:4,color:pending.length>0?'#b8722a':'var(--tx5)'}}>{pending.length>0?'يحتاج مراجعة منك →':'لا يوجد طلبات'}</div>
</div>
</div>
<div style={{padding:'14px 18px',borderRadius:14,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
<div style={{width:36,height:36,borderRadius:10,background:'rgba(52,131,180,.1)',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
<div style={{textAlign:'left',flex:1}}>
<div style={{fontSize:11,color:'var(--tx4)'}}>الأدوار المعيّنة</div>
<div style={{fontSize:26,fontWeight:900,color:'var(--tx)',lineHeight:1.1,marginTop:2}}>{Object.keys(roleCounts).length}</div>
<div style={{fontSize:9,marginTop:4,color:'var(--tx5)'}}>{gmCount>0?gmCount+' مدير عام · ':''}{otherRoles} أدوار أخرى</div>
</div>
</div>
<div style={{padding:'14px 18px',borderRadius:14,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
<div style={{width:36,height:36,borderRadius:10,background:'rgba(39,160,70,.1)',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.ok} strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg></div>
<div style={{textAlign:'left',flex:1,minWidth:0}}>
<div style={{fontSize:11,color:'var(--tx4)'}}>توزيع الفروع</div>
<div style={{fontSize:26,fontWeight:900,color:'var(--tx)',lineHeight:1.1,marginTop:2}}>{usedBranches.length}</div>
<div style={{fontSize:9,marginTop:4,color:'var(--tx5)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{usedBranches.join(' · ')||'—'}</div>
</div>
</div>
</div>
{pending.length>0?<div style={{padding:'14px 18px',borderRadius:12,background:'rgba(201,168,76,.06)',border:'1px solid rgba(201,168,76,.2)',display:'flex',alignItems:'center',gap:14,marginBottom:16}}>
<div style={{width:40,height:40,borderRadius:10,background:'rgba(201,168,76,.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg></div>
<div style={{flex:1}}>
<div style={{fontSize:13,fontWeight:800,color:'var(--tx)',marginBottom:3}}>طلب تسجيل جديد بحاجة للمراجعة</div>
<div style={{fontSize:10,color:'var(--tx4)',lineHeight:1.6}}>{pending[0].name_ar} سجّل حساب جديد بتاريخ {new Date(pending[0].created_at).toLocaleDateString('ar-SA',{day:'numeric',month:'long',year:'numeric'})}. قم بتعيين دور وتفعيل الحساب للسماح بالدخول.</div>
</div>
<button onClick={()=>{setReviewUser(pending[0]);setSelRoles([]);setActivateNow(true);setRoleSearch('');setForm({branch_id:pending[0].branch_id||'',notes:''});setPop('review_pending')}} style={{height:36,padding:'0 16px',borderRadius:9,border:'none',background:C.gold,color:'#000',fontFamily:F,fontSize:11,fontWeight:800,cursor:'pointer',flexShrink:0}}>مراجعة الطلب</button>
</div>:null}
<div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
<div style={{flex:1,minWidth:260,position:'relative'}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2" style={{position:'absolute',top:'50%',transform:'translateY(-50%)',right:14}}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
<input value={q} onChange={e=>setQ(e.target.value)} placeholder="بحث بالاسم، البريد، الجوال، أو رقم الهوية..." style={{...fS,textAlign:'right',paddingRight:38}}/>
</div>
{[['all','الكل',users.length,C.gold],['active','نشط',activeUsers.length,C.ok],['pending','بانتظار',pending.length,'#b8722a'],['inactive','معطل',disabled.length,C.red]].map(([k,l,n,c])=>
<div key={k} onClick={()=>setFilterStatus(k)} style={{padding:'7px 14px',borderRadius:9,fontSize:11,fontWeight:filterStatus===k?800:600,color:filterStatus===k?c:'rgba(255,255,255,.5)',background:filterStatus===k?c+'12':'rgba(255,255,255,.03)',border:'1px solid '+(filterStatus===k?c+'30':'rgba(255,255,255,.06)'),cursor:'pointer',whiteSpace:'nowrap',fontFamily:F,display:'flex',alignItems:'center',gap:6}}><span>{l}</span><span style={{fontSize:10,padding:'1px 6px',borderRadius:10,background:filterStatus===k?c+'20':'rgba(255,255,255,.06)',color:filterStatus===k?c:'var(--tx4)'}}>{n}</span></div>)}
</div>
{filtUsers.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)'}}>لا يوجد موظفين</div>:<div style={{background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:12,overflow:'hidden'}}>
<div style={{display:'grid',gridTemplateColumns:'28px 2.2fr 1.4fr 1fr 1fr 1.1fr 1.1fr 100px',gap:10,padding:'12px 18px',background:'rgba(255,255,255,.02)',borderBottom:'1px solid var(--bd)',fontSize:10,fontWeight:700,color:'var(--tx4)',alignItems:'center'}}>
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
<div style={{fontSize:12,fontWeight:700,color:C.gold,marginBottom:14,paddingBottom:6,borderBottom:'1px solid rgba(201,168,76,.12)'}}>أدوار نشطة ({activeRoles.length})</div>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(380px,1fr))',gap:14}}>
{filtRoles.map(r=>{const rp=rolePerms.filter(p=>p.role_id===r.id);const rUsers=users.filter(u=>u.role_id===r.id);const rc=r.color||C.gold
return<div key={r.id} style={{background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:14,overflow:'hidden'}}>
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
{tab==='ui_controls'&&<UiControlsTab sb={sb} users={users} toast={toast} nav={nav} hubTabs={hubTabs} visibility={visibility} onVisibilityChange={onVisibilityChange}/>}

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
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:12,marginBottom:20}}>
{/* Employees */}
<div style={{padding:'16px 18px',borderRadius:14,background:'linear-gradient(135deg,rgba(39,160,70,.08),rgba(39,160,70,.02))',border:'1px solid rgba(39,160,70,.15)',textAlign:'center'}}>
<div style={{fontSize:11,fontWeight:600,color:C.ok,marginBottom:8}}>الموظفين</div>
<div style={{fontSize:28,fontWeight:900,color:C.ok,lineHeight:1}}>{filtered.length}</div>
<div style={{fontSize:9,color:'var(--tx5)',marginTop:6}}>{perfData.length} إجمالي</div>
</div>
{/* Avg Score with comparison */}
<div style={{padding:'16px 18px',borderRadius:14,background:'rgba(201,168,76,.04)',border:'1px solid rgba(201,168,76,.1)',textAlign:'center'}}>
<div style={{fontSize:11,fontWeight:600,color:C.gold,marginBottom:8}}>متوسط النقاط</div>
<div style={{fontSize:28,fontWeight:900,color:C.gold,lineHeight:1}}>{avgScore}<span style={{fontSize:12,fontWeight:500,opacity:.5}}>/{MAX_SCORE}</span></div>
{scoreDiff!==0&&<div style={{fontSize:10,fontWeight:700,color:scoreDiff>0?C.ok:C.red,marginTop:6}}>{scoreDiff>0?'▲':'▼'} {Math.abs(scoreDiff)} عن الشهر السابق</div>}
</div>
{/* Total Transactions */}
<div style={{padding:'16px 18px',borderRadius:14,background:'rgba(52,131,180,.04)',border:'1px solid rgba(52,131,180,.1)',textAlign:'center'}}>
<div style={{fontSize:11,fontWeight:600,color:C.blue,marginBottom:8}}>المعاملات المنجزة</div>
<div style={{fontSize:28,fontWeight:900,color:C.blue,lineHeight:1}}>{totalTxn}</div>
<div style={{fontSize:9,color:'var(--tx5)',marginTop:6}}>نسبة الإنجاز: {totalTxnAll>0?Math.round(totalTxn/totalTxnAll*100):0}%</div>
</div>
{/* Overdue */}
<div style={{padding:'16px 18px',borderRadius:14,background:totalOverdue>0?'rgba(192,57,43,.06)':'rgba(255,255,255,.02)',border:'1px solid '+(totalOverdue>0?'rgba(192,57,43,.12)':'rgba(255,255,255,.04)'),textAlign:'center'}}>
<div style={{fontSize:11,fontWeight:600,color:totalOverdue>0?C.red:'var(--tx4)',marginBottom:8}}>المتأخرات</div>
<div style={{fontSize:28,fontWeight:900,color:totalOverdue>0?C.red:'var(--tx5)',lineHeight:1}}>{totalOverdue}</div>
<div style={{fontSize:9,color:totalOverdue>0?C.red:'var(--tx5)',marginTop:6,opacity:.7}}>{overdueUsers} موظف عنده متأخرات</div>
</div>
</div>
{/* Filters */}
<div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
<select value={perfBranch||''} onChange={e=>setPerfBranch(e.target.value||null)} style={{height:36,padding:'0 12px',borderRadius:8,border:'1px solid var(--bd)',background:'var(--bg)',color:'var(--tx)',fontFamily:F,fontSize:12}}>
<option value="">كل المكاتب</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name_ar}</option>)}
</select>
<select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)} style={{height:36,padding:'0 12px',borderRadius:8,border:'1px solid var(--bd)',background:'var(--bg)',color:'var(--tx)',fontFamily:F,fontSize:12}}>
<option value="all">كل الأدوار</option>{roles.map(r=><option key={r.id} value={r.id}>{r.name_ar}</option>)}
</select>
<select value={perfSort} onChange={e=>setPerfSort(e.target.value)} style={{height:36,padding:'0 12px',borderRadius:8,border:'1px solid var(--bd)',background:'var(--bg)',color:'var(--tx)',fontFamily:F,fontSize:12}}>
<option value="performance_score">النقاط</option><option value="txn_completed">المعاملات</option><option value="amount_collected">التحصيل</option><option value="tasks_done">المهام</option>
</select>
<span style={{fontSize:10,color:'var(--tx5)'}}>{filtered.length} موظف</span>
</div>
{/* Enhanced Leaderboard */}
<div style={{display:'flex',flexDirection:'column',gap:10}}>
{filtered.map((e,i)=>{const sc=Number(e.performance_score)||0;const scPrev=Number(e.performance_score_prev||sc);const pct=Math.round(sc/MAX_SCORE*100);const diff=sc-scPrev;const hasOverdue=Number(e.tasks_overdue||0)>0;const isWeak=sc<50;const borderClr=hasOverdue&&Number(e.tasks_overdue)>10?'rgba(192,57,43,.2)':isWeak?'rgba(230,126,34,.15)':'var(--bd)'
return<div key={e.user_id} style={{borderRadius:14,background:'var(--bg)',border:'1px solid '+borderClr,overflow:'hidden'}}>
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
{isHoliday&&brAtt.length===0&&<div style={{padding:'12px 18px',borderRadius:12,background:'rgba(201,168,76,.06)',border:'1px solid rgba(201,168,76,.12)',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
<span style={{fontSize:12,fontWeight:600,color:C.gold}}>يوم إجازة — {dayNameAr[dayOfWeek]||dayOfWeek}</span>
</div>}
{/* Dynamic Stat cards */}
<div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:20}}>
{[['الحاضرين',brAtt.length,C.ok],['في الوقت',dayOnTime,C.ok],['متأخر',dayLate,dayLate>0?'#e67e22':'var(--tx5)'],['غائب',absent.length,absent.length>0?C.red:'var(--tx5)'],['متوسط الساعات',dayAvgHrs,C.blue]].map(([l,v,c],i)=><div key={i} style={{padding:12,borderRadius:10,background:c==='var(--tx5)'?'rgba(255,255,255,.02)':c+'06',border:'1px solid '+(c==='var(--tx5)'?'rgba(255,255,255,.04)':c+'12'),textAlign:'center'}}><div style={{fontSize:20,fontWeight:900,color:c}}>{v}</div><div style={{fontSize:8,color:c,opacity:.7,marginTop:4}}>{l}</div></div>)}
</div>
{/* Filters */}
<div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
<input type="date" value={attDate} onChange={e=>setAttDate(e.target.value)} style={{height:36,padding:'0 12px',borderRadius:8,border:'1px solid var(--bd)',background:'var(--bg)',color:'var(--tx)',fontFamily:F,fontSize:12,direction:'ltr'}}/>
<select value={attBranch||''} onChange={e=>setAttBranch(e.target.value||null)} style={{height:36,padding:'0 12px',borderRadius:8,border:'1px solid var(--bd)',background:'var(--bg)',color:'var(--tx)',fontFamily:F,fontSize:12}}>
<option value="">كل المكاتب</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name_ar}</option>)}
</select>
<span style={{fontSize:10,color:'var(--tx5)'}}>|</span>
<span style={{fontSize:11,fontWeight:600,color:'var(--tx4)'}}>{dayNameAr[dayOfWeek]||''} · {brAtt.length} حاضر · {absent.length} غائب</span>
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
return<div onClick={()=>setViewUser(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.8)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(920px,95vw)',height:'min(650px,88vh)',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.4)',border:'1px solid rgba(201,168,76,.15)'}}>
{/* Header */}
<div style={{background:'var(--bg)',padding:'18px 24px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',borderBottom:'1px solid rgba(201,168,76,.12)',flexShrink:0}}>
<div style={{display:'flex',gap:12,alignItems:'center'}}>
<div style={{width:48,height:48,borderRadius:14,background:rc+'15',border:'1.5px solid '+rc+'25',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:800,color:rc}}>{(u.name_ar||'?')[0]}</div>
<div>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}><span style={{fontSize:18,fontWeight:800,color:'var(--tx)'}}>{u.name_ar}</span><span style={{fontSize:9,padding:'2px 8px',borderRadius:5,background:u.is_active?'rgba(39,160,70,.1)':'rgba(153,153,153,.1)',color:u.is_active?C.ok:'#999',fontWeight:700}}>{u.is_active?'نشط':'معطّل'}</span></div>
{u.name_en&&<div style={{fontSize:12,color:'var(--tx4)',direction:'ltr'}}>{u.name_en}</div>}
<div style={{display:'flex',gap:4,marginTop:4}}>{u.roles&&<span style={{fontSize:9,padding:'2px 8px',borderRadius:4,background:rc+'15',color:rc,fontWeight:700}}>{u.roles.name_ar}</span>}{br&&<span style={{fontSize:9,padding:'2px 8px',borderRadius:4,background:'rgba(52,131,180,.08)',color:C.blue}}>{br.name_ar}</span>}{u.is_super_admin&&<span style={{fontSize:9,padding:'2px 8px',borderRadius:4,background:'rgba(201,168,76,.1)',color:C.gold}}>نظامي</span>}</div>
</div></div>
<div style={{display:'flex',gap:6}}>
<button onClick={()=>{setViewUser(null);setForm({_table:'users',_id:u.id,name_ar:u.name_ar||'',name_en:u.name_en||'',email:u.email||'',phone:u.phone||'',id_number:u.id_number||'',nationality:u.nationality||'',role_id:u.role_id||'',branch_id:u.branch_id||'',is_active:String(u.is_active!==false),notes:u.notes||''});setPop('edit_user')}} style={{height:32,padding:'0 16px',borderRadius:8,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.08)',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer'}}>تعديل</button>
<button onClick={()=>setViewUser(null)} style={{width:32,height:32,borderRadius:8,background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
</div></div>
{/* Body */}
<div style={{flex:1,display:'flex',overflow:'hidden'}}>
<div style={{width:140,background:'var(--bg)',borderLeft:'1px solid var(--bd2)',padding:'12px 6px',flexShrink:0,overflowY:'auto',scrollbarWidth:'none'}}>
{utabs.map(t=><div key={t.id} onClick={()=>setUserTab(t.id)} style={{padding:'10px 10px',borderRadius:8,marginBottom:3,fontSize:11,fontWeight:userTab===t.id?700:500,color:userTab===t.id?C.gold:'var(--tx4)',background:userTab===t.id?'rgba(201,168,76,.08)':'transparent',border:userTab===t.id?'1px solid rgba(201,168,76,.12)':'1px solid transparent',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',transition:'.15s'}}>
<span>{t.l}</span>{t.n!==undefined&&t.n>0&&<span style={{fontSize:9,fontWeight:700,color:userTab===t.id?C.gold:'var(--tx6)',background:userTab===t.id?'rgba(201,168,76,.15)':'rgba(255,255,255,.04)',padding:'1px 6px',borderRadius:4,minWidth:18,textAlign:'center'}}>{t.n}</span>}
</div>)}
</div>
<div style={{flex:1,overflowY:'auto',padding:'20px 24px',scrollbarWidth:'none'}}>

{/* TAB 1: البيانات */}
{userTab==='data'&&<div style={{display:'flex',flexDirection:'column',gap:18}}>
<div><SH3 t="البيانات الشخصية" c={C.gold}/><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}><IB l="الاسم بالعربي" v={u.name_ar} toast={toast}/><IB l="بالإنجليزي" v={u.name_en} toast={toast}/><IB l="رقم الهوية" v={u.id_number} copy toast={toast}/><IB l="الجنسية" v={u.nationality} toast={toast}/></div><div style={{display:'grid',gridTemplateColumns:'1fr',gap:10,marginTop:8}}><IB l="الإيميل" v={u.email} copy toast={toast}/><IB l="الجوال" v={u.phone} copy toast={toast}/></div></div>
<div><SH3 t="الوظيفة" c="#e67e22"/><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>{u.roles&&<div style={{background:rc+'08',borderRadius:10,padding:'14px 16px',border:'1px solid '+rc+'15',borderRight:'3px solid '+rc}}><div style={{fontSize:9,color:'var(--tx5)',marginBottom:6}}>الدور</div><div style={{fontSize:14,fontWeight:700,color:rc}}>{u.roles.name_ar}</div></div>}<IB l="الفرع" v={br?.name_ar} toast={toast}/><IB l="تاريخ التعيين" v={u.hire_date} toast={toast}/><IB l="سنوات الخبرة" v={u.experience_years?u.experience_years+' سنوات':null} toast={toast}/><IB l="الحد الأقصى للمعاملات" v={u.max_concurrent_transactions} toast={toast}/>{u.is_all_branches?<div style={{background:'rgba(201,168,76,.06)',borderRadius:10,padding:'14px 16px',border:'1px solid rgba(201,168,76,.1)',borderRight:'3px solid '+C.gold}}><div style={{fontSize:9,color:'var(--tx5)',marginBottom:6}}>الفروع</div><div style={{fontSize:14,fontWeight:700,color:C.gold}}>كل الفروع</div></div>:null}</div></div>
{empLangs.length>0&&<div><SH3 t="اللغات" c={C.blue}/><div style={{display:'flex',flexDirection:'column',gap:6}}>{empLangs.map(l=><div key={l.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 14px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.03)'}}><span style={{fontSize:13,fontWeight:600,color:'var(--tx2)'}}>{l.language}</span><span style={{fontSize:9,padding:'2px 8px',borderRadius:4,background:l.proficiency==='native'?'rgba(39,160,70,.1)':'rgba(230,126,34,.1)',color:l.proficiency==='native'?C.ok:'#e67e22',fontWeight:600}}>{l.proficiency==='native'?'لغة أم':l.proficiency==='advanced'?'متقدم':l.proficiency==='intermediate'?'متوسط':'مبتدئ'}</span></div>)}</div></div>}
{empSpecs.length>0&&<div><SH3 t="التخصصات" c={C.ok}/><div style={{display:'flex',flexDirection:'column',gap:6}}>{empSpecs.map(s=><div key={s.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 14px',background:'rgba(255,255,255,.02)',borderRadius:8,border:'1px solid rgba(255,255,255,.03)'}}><div><div style={{fontSize:13,fontWeight:600,color:'var(--tx2)'}}>{s.service_name||'تخصص'}</div><div style={{fontSize:9,color:'var(--tx5)',marginTop:2}}>مستوى: {s.skill_level==='expert'?'خبير':s.skill_level==='advanced'?'متقدم':'متوسط'}</div></div>{s.certified&&<span style={{fontSize:9,padding:'2px 8px',borderRadius:4,background:'rgba(39,160,70,.1)',color:C.ok,fontWeight:600}}>✓ معتمد</span>}</div>)}</div></div>}
</div>}

{/* TAB 2: المهام */}
{userTab==='tasks'&&<div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
<div style={{padding:14,borderRadius:10,background:'rgba(52,131,180,.04)',border:'1px solid rgba(52,131,180,.08)',textAlign:'center'}}><div style={{fontSize:24,fontWeight:900,color:C.blue}}>{activeTasks.length}</div><div style={{fontSize:9,color:C.blue,opacity:.6,marginTop:4}}>مهام نشطة</div></div>
<div style={{padding:14,borderRadius:10,background:'rgba(39,160,70,.04)',border:'1px solid rgba(39,160,70,.08)',textAlign:'center'}}><div style={{fontSize:24,fontWeight:900,color:C.ok}}>{completedTasks.length}</div><div style={{fontSize:9,color:C.ok,opacity:.6,marginTop:4}}>مكتملة هذا الشهر</div></div>
</div>
{activeTasks.length===0&&completedTasks.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)'}}>لا توجد مهام</div>:
<div style={{display:'flex',flexDirection:'column',gap:6}}>
{activeTasks.map(ta=>{const t=ta.tasks;const pc=priClr[t.priority]||C.gold;return<div key={ta.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderRadius:10,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.03)',borderRight:'3px solid '+pc}}>
<div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:'var(--tx2)',marginBottom:3}}>{t.title}</div><div style={{display:'flex',gap:6,alignItems:'center'}}><span style={{fontSize:9,color:pc,fontWeight:700}}>{priLbl[t.priority]||t.priority}</span><span style={{fontSize:9,color:'var(--tx5)'}}>الاستحقاق: {t.due_date||'—'}</span></div></div>
<span style={{fontSize:9,padding:'2px 8px',borderRadius:4,background:t.status==='in_progress'?'rgba(52,131,180,.1)':'rgba(230,126,34,.1)',color:t.status==='in_progress'?C.blue:'#e67e22',fontWeight:600}}>{stLbl[t.status]||t.status}</span>
</div>})}
</div>}
</div>}

{/* TAB 3: الحضور */}
{userTab==='attend'&&<div>
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
{[[attDays,'أيام حضور',C.gold],[onTime,'في الوقت',C.ok],[lateDays,'متأخر',lateDays>0?C.red:'var(--tx5)'],[avgHrs,'متوسط ساعات',C.blue]].map(([v,l,c],i)=><div key={i} style={{padding:12,borderRadius:10,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.04)',textAlign:'center'}}><div style={{fontSize:20,fontWeight:900,color:c}}>{v}</div><div style={{fontSize:8,color:c,opacity:.6,marginTop:4}}>{l}</div></div>)}
</div>
{attendance.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)'}}>لا يوجد سجل حضور</div>:
<div style={{background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:12,overflow:'hidden'}}>
<table style={{width:'100%',borderCollapse:'collapse',fontFamily:F}}>
<thead><tr style={{background:'rgba(255,255,255,.03)'}}>{['التاريخ','الدخول','الخروج','الساعات','الحالة'].map((h,i)=><th key={i} style={{padding:'10px 14px',fontSize:10,fontWeight:600,color:'var(--tx4)',textAlign:i===4?'center':'right'}}>{h}</th>)}</tr></thead>
<tbody>{attendance.slice(0,15).map(a=>{const cin=a.check_in_at?new Date(a.check_in_at).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit',hour12:false}):'—';const cout=a.check_out_at?new Date(a.check_out_at).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit',hour12:false}):'—';return<tr key={a.id} style={{borderBottom:'1px solid rgba(255,255,255,.03)'}}>
<td style={{padding:'8px 14px',fontSize:11,color:'var(--tx3)'}}>{a.date}</td>
<td style={{padding:'8px 14px',fontSize:11,color:'var(--tx3)',direction:'ltr'}}>{cin}</td>
<td style={{padding:'8px 14px',fontSize:11,color:'var(--tx3)',direction:'ltr'}}>{cout}</td>
<td style={{padding:'8px 14px',fontSize:12,fontWeight:700,color:C.gold}}>{Number(a.work_hours||0).toFixed(1)}</td>
<td style={{padding:'8px 14px',textAlign:'center'}}>{a.is_late?<span style={{fontSize:9,padding:'2px 6px',borderRadius:4,background:'rgba(230,126,34,.1)',color:'#e67e22',fontWeight:600}}>+{a.late_minutes}د</span>:<span style={{fontSize:9,padding:'2px 6px',borderRadius:4,background:'rgba(39,160,70,.1)',color:C.ok}}>✓</span>}</td>
</tr>})}</tbody></table></div>}
</div>}

{/* TAB 4: سجل الدخول */}
{userTab==='logins'&&<div>
<div style={{fontSize:11,color:'var(--tx4)',marginBottom:14}}>آخر {loginLogs.length} عمليات دخول</div>
{loginLogs.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)'}}>لا يوجد سجل</div>:
<div style={{display:'flex',flexDirection:'column',gap:6}}>
{loginLogs.map(l=>{const ua=l.user_agent||'';const isMobile=ua.includes('iPhone')||ua.includes('Android');const browser=ua.includes('Safari')&&!ua.includes('Chrome')?'Safari':ua.includes('Chrome')?'Chrome':ua.includes('Firefox')?'Firefox':'Other';const os=ua.includes('iPhone')?'iPhone':ua.includes('Android')?'Android':ua.includes('Windows')?'Windows':ua.includes('Mac')?'Mac':'Other';const ip=(l.ip_address||'').replace(/\d+\.\d+$/,'xx.xx');return<div key={l.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderRadius:10,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.03)'}}>
<div style={{width:8,height:8,borderRadius:'50%',background:l.success?C.ok:C.red,flexShrink:0}}/>
<div style={{flex:1}}>
<div style={{fontSize:12,fontWeight:600,color:l.success?'var(--tx2)':C.red}}>{browser} / {os}</div>
<div style={{fontSize:9,color:'var(--tx5)',direction:'ltr',marginTop:2}}>{ip} · {l.created_at?new Date(l.created_at).toLocaleString('en',{month:'2-digit',day:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}):''}</div>
</div>
<span style={{fontSize:9,padding:'2px 8px',borderRadius:4,background:l.success?'rgba(39,160,70,.1)':'rgba(230,126,34,.1)',color:l.success?C.ok:'#e67e22',fontWeight:600}}>{l.success?'ناجح':'فشل'}</span>
</div>})}
</div>}
</div>}

</div></div></div></div>})()}

{/* ═══ VIEW BRANCH POPUP ═══ */}
{viewPop&&(()=>{const bUsers=users.filter(u=>u.branch_id===viewPop.id);const bAccs=bankAccs.filter(a=>a.branch_id===viewPop.id);const typeMap={deposit:{l:'إيداع',c:C.gold},sadad:{l:'سداد',c:C.blue},international:{l:'حوالات خارجية',c:C.ok}}
return<div onClick={()=>{setViewPop(null);setViewTab('info')}} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:600,maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.4)',border:'1px solid var(--bd)'}}>
<div style={{height:3,background:viewPop.color||C.gold,flexShrink:0}}/>
<div style={{background:'var(--bg)',padding:'16px 22px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
<div style={{display:'flex',alignItems:'center',gap:10}}>
<div style={{width:40,height:40,borderRadius:10,background:(viewPop.color||C.gold)+'18',border:'1.5px solid '+(viewPop.color||C.gold)+'30',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:16,fontWeight:800,color:viewPop.color||C.gold}}>{viewPop.name_ar?.[0]}</span></div>
<div><div style={{fontSize:17,fontWeight:700,color:'var(--tx)'}}>{viewPop.name_ar}</div>{viewPop.name_en&&<div style={{fontSize:11,color:'var(--tx5)',direction:'ltr',marginTop:2}}>{viewPop.name_en}</div>}</div>
</div>
<button onClick={()=>{setViewPop(null);setViewTab('info')}} style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
</div>
{/* View Tabs */}
<div style={{display:'flex',gap:0,borderBottom:'1px solid var(--bd)',padding:'0 22px',flexShrink:0}}>
{[['info','البيانات الأساسية'],['accounts','الحسابات البنكية ('+bAccs.length+')'],['staff','الموظفين ('+bUsers.length+')']].map(([k,l])=>
<div key={k} onClick={()=>setViewTab(k)} style={{padding:'10px 14px',fontSize:11,fontWeight:viewTab===k?700:500,color:viewTab===k?C.gold:'rgba(255,255,255,.38)',borderBottom:viewTab===k?'2px solid '+C.gold:'2px solid transparent',cursor:'pointer',transition:'.15s',whiteSpace:'nowrap'}}>{l}</div>)}
</div>
<div style={{flex:1,overflowY:'auto',padding:'16px 22px'}}>
{/* Tab: البيانات الأساسية */}
{viewTab==='info'&&<div>
{[['الكود',viewPop.code],['المنطقة',getRef(viewPop.region_id,regions)],['المدينة',getRef(viewPop.city_id,cities)],['الجوال',viewPop.mobile],['البريد',viewPop.email],['مدير المكتب',getRef(viewPop.manager_id,users)],['أيام الدوام',viewPop.work_days],['ساعات العمل',(viewPop.work_from||'08:00')+' - '+(viewPop.work_to||'17:00')],['الرصيد الافتتاحي',viewPop.opening_balance?num(viewPop.opening_balance)+' ر.س':null],['الحد النقدي اليومي',viewPop.daily_cash_limit?num(viewPop.daily_cash_limit)+' ر.س':null],['الحالة',viewPop.is_active?'نشط':'معطّل'],['العنوان',viewPop.address],['الموقع',viewPop.google_maps_url?'رابط':''],['ملاحظات',viewPop.notes]].filter(([,v])=>v&&v!=='—').map(([k,v],i)=>
<div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid rgba(255,255,255,.05)'}}>
<span style={{fontSize:11,color:'var(--tx4)'}}>{k}</span>
{k==='الموقع'?<a href={viewPop.google_maps_url} target="_blank" rel="noreferrer" style={{fontSize:12,fontWeight:600,color:C.blue,textDecoration:'none'}}>فتح في الخرائط ↗</a>:
<span style={{fontSize:13,fontWeight:600,color:k==='الحالة'?(viewPop.is_active?C.ok:C.red):'rgba(255,255,255,.82)',direction:k==='البريد'||k==='الجوال'?'ltr':'rtl'}}>{v}</span>}
</div>)}
{viewPop.google_maps_url&&<div style={{marginTop:10,borderRadius:10,overflow:'hidden',border:'1px solid var(--bd)',height:140}}><iframe src={`https://maps.google.com/maps?q=${encodeURIComponent(viewPop.address||viewPop.google_maps_url)}&output=embed`} width="100%" height="140" style={{border:0}} allowFullScreen loading="lazy"/></div>}
</div>}
{/* Tab: الحسابات البنكية */}
{viewTab==='accounts'&&<div>
{bAccs.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)',fontSize:12}}>لا توجد حسابات بنكية مرتبطة بهذا المكتب</div>:
bAccs.map(a=>{const tp=typeMap[a.account_type]||typeMap.deposit;return<div key={a.id} style={{padding:'12px 14px',borderRadius:10,border:'1px solid var(--bd)',marginBottom:8,background:'rgba(255,255,255,.02)'}}>
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
<div style={{display:'flex',alignItems:'center',gap:6}}>
<span style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>{a.bank_name}</span>
{a.is_primary&&<span style={{fontSize:8,color:C.gold,background:'rgba(201,168,76,.1)',padding:'2px 5px',borderRadius:5,fontWeight:700}}>رئيسي</span>}
</div>
<span style={{fontSize:9,color:tp.c,background:tp.c+'12',padding:'2px 7px',borderRadius:5,fontWeight:700}}>{tp.l}</span>
</div>
{[['اسم الحساب',a.account_name],['رقم الحساب',a.account_number],['IBAN',a.iban],['SWIFT',a.swift_code]].filter(([,v])=>v).map(([k,v],i)=>
<div key={i} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:10}}>
<span style={{color:'var(--tx4)'}}>{k}</span>
<span style={{color:'rgba(255,255,255,.6)',fontFamily:'monospace',direction:'ltr'}}>{v}</span>
</div>)}
<div style={{marginTop:6}}><BadgeStatus v={a.is_active}/></div>
</div>})}
</div>}
{/* Tab: الموظفين */}
{viewTab==='staff'&&<div>
{bUsers.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)',fontSize:12}}>لا يوجد موظفين في هذا المكتب</div>:
bUsers.map(u=><div key={u.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid var(--bd2)'}}>
<div style={{width:32,height:32,borderRadius:8,background:'rgba(255,255,255,.06)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
<span style={{fontSize:12,fontWeight:700,color:'var(--tx3)'}}>{u.name_ar?.[0]}</span>
</div>
<div style={{flex:1}}>
<div style={{fontSize:12,fontWeight:600,color:'var(--tx2)'}}>{u.name_ar}</div>
{u.email&&<div style={{fontSize:9,color:'var(--tx5)',direction:'ltr'}}>{u.email}</div>}
</div>
{u.roles&&<span style={{fontSize:9,color:u.roles.color||C.gold,background:(u.roles.color||C.gold)+'15',padding:'3px 7px',borderRadius:6,fontWeight:600}}>{u.roles.name_ar}</span>}
<BadgeStatus v={u.is_active}/>
</div>)}
</div>}
</div>
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',gap:8,flexDirection:'row-reverse',flexShrink:0}}>
<button onClick={()=>{openEdit(viewPop);setViewPop(null);setViewTab('info')}} style={{...bS,height:42,minWidth:100}}>تعديل</button>
<button onClick={()=>{setViewPop(null);setViewTab('info')}} style={{height:42,padding:'0 18px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer'}}>إغلاق</button>
</div></div></div>})()}

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
return<div onClick={()=>setPop(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:580,maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.4)',border:'1px solid var(--bd)'}}>
<div style={{height:3,background:'linear-gradient(90deg,transparent,'+C.gold+' 30%,#dcc06e 50%,'+C.gold+' 70%,transparent)',flexShrink:0}}/>
<div style={{background:'var(--bg)',padding:'16px 22px'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
<div style={{fontSize:15,fontWeight:700,color:'var(--tx)'}}>{pop==='add'?'إضافة مكتب':'تعديل مكتب'}</div>
<button onClick={()=>setPop(null)} style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
</div>
{/* Stepper */}
<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:0}}>
{['البيانات الأساسية','التفاصيل','مراجعة'].map((s,i)=>{const sn=i+1;const isA=step===sn;const isD=step>sn
return<React.Fragment key={i}>
{i>0&&<div style={{flex:1,height:2,margin:'0 6px 16px',borderRadius:1,background:'rgba(255,255,255,.1)',position:'relative',overflow:'hidden',maxWidth:60}}><div style={{position:'absolute',top:0,right:0,bottom:0,width:step>=sn?'100%':'0%',background:`linear-gradient(to left, ${C.gold}, rgba(201,168,76,.4))`,borderRadius:1,transition:'width .4s'}}/></div>}
<div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
<div style={{width:24,height:24,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,background:isA||isD?C.gold:'rgba(255,255,255,.07)',color:isA||isD?C.dk:'rgba(255,255,255,.25)',boxShadow:isA?'0 0 0 4px rgba(201,168,76,.15)':'none',transition:'.3s'}}>{isD?<svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>:sn}</div>
<div style={{fontSize:9,color:isA?C.gold:'rgba(255,255,255,.25)',fontWeight:isA?700:500,whiteSpace:'nowrap'}}>{s}</div>
</div></React.Fragment>})}
</div>
</div>
<div style={{flex:1,overflowY:'auto',padding:'18px 22px'}}>
{/* ── Step 1: Basic ── */}
{step===1&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<div><div style={lblS}>الاسم بالعربي <span style={{color:C.red}}>*</span></div><input value={form.name_ar} onChange={e=>setForm(p=>({...p,name_ar:e.target.value}))} style={fS}/></div>
<div><div style={lblS}>الاسم بالإنجليزي</div><input value={form.name_en} onChange={e=>setForm(p=>({...p,name_en:e.target.value}))} style={fS}/></div>
<div><div style={lblS}>المنطقة</div><CustomSelect value={form.region_id} onChange={v=>setForm(p=>({...p,region_id:v,city_id:''}))} options={regions.map(r=>({v:r.id,l:r.name_ar}))}/></div>
<div><div style={lblS}>المدينة</div><CustomSelect value={form.city_id} onChange={v=>setForm(p=>({...p,city_id:v}))} options={cities.filter(c=>!form.region_id||c.region_id===form.region_id).map(c=>({v:c.id,l:c.name_ar}))}/></div>
<div><div style={lblS}>الكود <span style={{color:C.red}}>*</span></div><div style={{display:'flex',direction:'ltr',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,overflow:'hidden',background:'rgba(255,255,255,.07)'}}><div style={{height:42,padding:'0 10px',background:'rgba(255,255,255,.06)',borderRight:'1px solid rgba(255,255,255,.08)',display:'flex',alignItems:'center',fontSize:10,fontWeight:700,color:'rgba(201,168,76,.5)',flexShrink:0}}>{getCityCode()}-</div><input value={form.code} onChange={e=>setForm(p=>({...p,code:e.target.value.replace(/\D/g,'').slice(0,4)}))} placeholder="01" style={{width:'100%',height:42,padding:'0 12px',border:'none',background:'transparent',fontFamily:F,fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',textAlign:'center'}}/></div></div>
<div><div style={lblS}>اللون</div><div style={{display:'flex',gap:6,alignItems:'center'}}><input type="color" value={form.color||'#c9a84c'} onChange={e=>setForm(p=>({...p,color:e.target.value}))} style={{width:42,height:42,borderRadius:10,border:'1.5px solid rgba(255,255,255,.12)',background:'transparent',cursor:'pointer',padding:2}}/><span style={{fontSize:10,color:'var(--tx5)',fontFamily:'monospace',direction:'ltr'}}>{form.color}</span></div></div>
<div style={{gridColumn:'1/-1'}}><div style={lblS}>العنوان</div><textarea value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))} rows={2} style={{...fS,height:'auto',padding:12,resize:'vertical'}}/></div>
<div><div style={lblS}>رقم الجوال</div><div style={{display:'flex',direction:'ltr',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,overflow:'hidden',background:'rgba(255,255,255,.07)'}}><div style={{height:42,padding:'0 10px',background:'rgba(255,255,255,.06)',borderRight:'1px solid rgba(255,255,255,.08)',display:'flex',alignItems:'center',fontSize:11,fontWeight:700,color:'var(--tx4)',flexShrink:0}}>966+</div><input value={fmtMobile(form.mobile)} onChange={e=>{const v=e.target.value.replace(/\D/g,'').slice(0,9);setForm(p=>({...p,mobile:v}))}} placeholder="5x xxx xxxx" style={{width:'100%',height:42,padding:'0 12px',border:'none',background:'transparent',fontFamily:F,fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',textAlign:'left',letterSpacing:1}}/></div></div>
<div><div style={lblS}>البريد الإلكتروني</div><input value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="example@jisr.sa" style={fS}/></div>
</div>}
{/* ── Step 2: Details ── */}
{step===2&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<div><div style={lblS}>الحالة</div><CustomSelect value={form.is_active} onChange={v=>setForm(p=>({...p,is_active:v}))} options={[{v:'true',l:'نشط'},{v:'false',l:'معطّل'}]}/></div>
<div><div style={lblS}>مدير المكتب</div><CustomSelect value={form.manager_id||''} onChange={v=>setForm(p=>({...p,manager_id:v}))} options={users.map(u=>({v:u.id,l:u.name_ar}))}/></div>
<div style={{gridColumn:'1/-1'}}><div style={lblS}>أيام الدوام</div>
<div style={{display:'flex',gap:4,flexWrap:'wrap'}}>{allDays.map(d=>{const sel=selDays.includes(d);return<div key={d} onClick={()=>toggleDay(d)} style={{padding:'6px 12px',borderRadius:8,border:'1.5px solid '+(sel?'rgba(201,168,76,.3)':'rgba(255,255,255,.1)'),background:sel?'rgba(201,168,76,.1)':'transparent',color:sel?C.gold:'rgba(255,255,255,.35)',fontSize:11,fontWeight:600,cursor:'pointer',transition:'.15s'}}>{d}</div>})}</div>
</div>
<div><div style={lblS}>بداية الدوام</div><CustomSelect value={form.work_from||'08:00'} onChange={v=>setForm(p=>({...p,work_from:v}))} options={times.map(t=>({v:t,l:t}))}/></div>
<div><div style={lblS}>نهاية الدوام</div><CustomSelect value={form.work_to||'17:00'} onChange={v=>setForm(p=>({...p,work_to:v}))} options={times.map(t=>({v:t,l:t}))}/></div>
<div><div style={lblS}>الرصيد الافتتاحي</div><input value={form.opening_balance} onChange={e=>setForm(p=>({...p,opening_balance:e.target.value.replace(/[^\d.]/g,'')}))} placeholder="0" style={fS}/></div>
<div><div style={lblS}>الحد النقدي اليومي</div><input value={form.daily_cash_limit} onChange={e=>setForm(p=>({...p,daily_cash_limit:e.target.value.replace(/[^\d.]/g,'')}))} placeholder="0" style={fS}/></div>
<div style={{gridColumn:'1/-1'}}><div style={lblS}>رابط الموقع على Google Maps</div><input value={form.google_maps_url} onChange={e=>setForm(p=>({...p,google_maps_url:e.target.value}))} placeholder="https://maps.app.goo.gl/..." style={{...fS,direction:'ltr',textAlign:'left'}}/>
{form.google_maps_url&&<div style={{marginTop:8,borderRadius:10,overflow:'hidden',border:'1px solid var(--bd)',height:160}}><iframe src={form.google_maps_url.replace('/maps/','/maps/embed?pb=').includes('embed')?form.google_maps_url:`https://maps.google.com/maps?q=${encodeURIComponent(form.google_maps_url)}&output=embed`} width="100%" height="160" style={{border:0}} allowFullScreen loading="lazy"/></div>}
</div>
<div style={{gridColumn:'1/-1'}}><div style={lblS}>ملاحظات</div><textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2} style={{...fS,height:'auto',padding:12,resize:'vertical'}}/></div>
</div>}
{/* ── Step 3: Review ── */}
{step===3&&<div>
<div style={{fontSize:14,fontWeight:700,color:'var(--tx)',marginBottom:4}}>مراجعة البيانات</div>
<div style={{fontSize:10,color:'var(--tx4)',marginBottom:14}}>تأكد من صحة البيانات قبل الحفظ</div>
{reviewRows.filter(([,v])=>v&&v!=='—'&&v!=='---').map(([k,v],i)=>
<div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,.05)'}}>
<span style={{fontSize:11,color:'var(--tx4)'}}>{k}</span>
{k==='اللون'?<div style={{display:'flex',alignItems:'center',gap:6}}><span style={{width:12,height:12,borderRadius:'50%',background:v,border:'1px solid rgba(255,255,255,.1)'}}/><span style={{fontSize:11,color:'var(--tx5)',fontFamily:'monospace'}}>{v}</span></div>:
k==='الحالة'?<span style={{fontSize:12,fontWeight:600,color:v==='نشط'?C.ok:C.red}}>{v}</span>:
<span style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,.82)'}}>{v}</span>}
</div>)}
</div>}
</div>
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',gap:10,flexDirection:'row-reverse',flexShrink:0}}>
{step===1&&<button onClick={()=>{if(!form.name_ar){toast('الاسم مطلوب');return};if(!form.code){toast('الكود مطلوب');return};setStep(2)}} style={{...bS,height:42,minWidth:130,gap:6}}>التالي <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>}
{step===2&&<><button onClick={()=>setStep(3)} style={{...bS,height:42,minWidth:130,gap:6}}>مراجعة <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button><button onClick={()=>setStep(1)} style={{height:42,padding:'0 18px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer'}}>رجوع</button></>}
{step===3&&<><button onClick={saveForm} disabled={saving} style={{...bS,height:42,minWidth:130,opacity:saving?.6:1}}>{saving?'...':(pop==='add'?'إضافة المكتب':'حفظ التعديلات')}</button><button onClick={()=>setStep(2)} style={{height:42,padding:'0 18px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer'}}>رجوع</button></>}
</div></div></div>})()}

{/* ═══ EDIT USER POPUP ═══ */}
{pop==='edit_user'&&<div onClick={()=>setPop(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:520,maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.4)',border:'1px solid var(--bd)'}}>
<div style={{height:3,background:'linear-gradient(90deg,transparent,'+C.gold+' 30%,#dcc06e 50%,'+C.gold+' 70%,transparent)',flexShrink:0}}/>
<div style={{background:'var(--bg)',padding:'16px 22px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
<div style={{fontSize:15,fontWeight:700,color:'var(--tx)'}}>تعديل موظف</div>
<button onClick={()=>setPop(null)} style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
</div>
<div style={{flex:1,overflowY:'auto',padding:'18px 22px'}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
{[['name_ar','الاسم بالعربي',1],['name_en','الاسم بالإنجليزي'],['email','البريد'],['phone','الجوال'],['id_number','رقم الهوية'],['nationality','الجنسية']].map(([k,l,r])=>
<div key={k}><div style={lblS}>{l}{r&&<span style={{color:C.red}}> *</span>}</div><input value={form[k]||''} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} style={fS}/></div>)}
<div><div style={lblS}>الدور <span style={{color:C.red}}>*</span></div><CustomSelect value={form.role_id} onChange={v=>setForm(p=>({...p,role_id:v}))} options={roles.map(r=>({v:r.id,l:r.name_ar}))}/></div>
<div><div style={lblS}>المكتب</div><CustomSelect value={form.branch_id} onChange={v=>setForm(p=>({...p,branch_id:v}))} options={branches.map(b=>({v:b.id,l:b.name_ar}))}/></div>
<div><div style={lblS}>الحالة</div><CustomSelect value={form.is_active} onChange={v=>setForm(p=>({...p,is_active:v}))} options={[{v:'true',l:'نشط'},{v:'false',l:'معطّل'}]}/></div>
<div style={{gridColumn:'1/-1'}}><div style={lblS}>ملاحظات</div><textarea value={form.notes||''} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2} style={{...fS,height:'auto',padding:12,resize:'vertical'}}/></div>
</div></div>
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',flexDirection:'row-reverse',flexShrink:0}}>
<button onClick={saveForm} disabled={saving} style={{...bS,height:42,minWidth:130,opacity:saving?.6:1}}>{saving?'...':'حفظ'}</button>
<button onClick={()=>setPop(null)} style={{height:42,padding:'0 18px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer'}}>إلغاء</button>
</div></div></div>}

{/* ═══ ADD/EDIT ROLE POPUP ═══ */}
{(pop==='add_role'||pop==='edit_role')&&<div onClick={()=>setPop(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:480,maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.4)',border:'1px solid var(--bd)'}}>
<div style={{height:3,background:'linear-gradient(90deg,transparent,'+C.gold+' 30%,#dcc06e 50%,'+C.gold+' 70%,transparent)',flexShrink:0}}/>
<div style={{background:'var(--bg)',padding:'16px 22px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
<div style={{fontSize:15,fontWeight:700,color:'var(--tx)'}}>{pop==='add_role'?'إضافة دور':'تعديل دور'}</div>
<button onClick={()=>setPop(null)} style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
</div>
<div style={{flex:1,overflowY:'auto',padding:'18px 22px'}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<div><div style={lblS}>الاسم بالعربي <span style={{color:C.red}}>*</span></div><input value={form.name_ar||''} onChange={e=>setForm(p=>({...p,name_ar:e.target.value}))} style={fS}/></div>
<div><div style={lblS}>الاسم بالإنجليزي</div><input value={form.name_en||''} onChange={e=>setForm(p=>({...p,name_en:e.target.value}))} style={fS}/></div>
<div><div style={lblS}>اللون</div><input type="color" value={form.color||'#c9a84c'} onChange={e=>setForm(p=>({...p,color:e.target.value}))} style={{width:'100%',height:42,borderRadius:10,border:'1.5px solid rgba(255,255,255,.12)',background:'transparent',cursor:'pointer',padding:2}}/></div>
<div><div style={lblS}>الحالة</div><CustomSelect value={form.is_active} onChange={v=>setForm(p=>({...p,is_active:v}))} options={[{v:'true',l:'نشط'},{v:'false',l:'معطّل'}]}/></div>
<div style={{gridColumn:'1/-1'}}><div style={lblS}>الوصف</div><textarea value={form.description||''} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={2} style={{...fS,height:'auto',padding:12,resize:'vertical'}}/></div>
</div></div>
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',flexDirection:'row-reverse',flexShrink:0}}>
<button onClick={saveForm} disabled={saving} style={{...bS,height:42,minWidth:130,opacity:saving?.6:1}}>{saving?'...':(form._id?'حفظ':'إضافة')}</button>
<button onClick={()=>setPop(null)} style={{height:42,padding:'0 18px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer'}}>إلغاء</button>
</div></div></div>}

{/* ═══ PERMISSIONS POPUP ═══ */}
{permPop&&<div onClick={()=>setPermPop(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:580,maxHeight:'85vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.4)',border:'1px solid var(--bd)'}}>
<div style={{height:3,background:'linear-gradient(90deg,transparent,'+C.blue+' 30%,#5ba3d4 50%,'+C.blue+' 70%,transparent)',flexShrink:0}}/>
<div style={{background:'var(--bg)',padding:'16px 22px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
<div><div style={{fontSize:15,fontWeight:700,color:'var(--tx)'}}>إدارة الصلاحيات</div><div style={{fontSize:10,color:'var(--tx4)',marginTop:2}}>{roles.find(r=>r.id===permPop)?.name_ar||''} — {selPerms.length} صلاحية مختارة</div></div>
<button onClick={()=>setPermPop(null)} style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
</div>
<div style={{flex:1,overflowY:'auto',padding:'12px 22px'}}>
{permModules.map(mod=>{const modPerms=perms.filter(p=>p.module===mod);const allChecked=modPerms.every(p=>selPerms.includes(p.id))
return<div key={mod} style={{marginBottom:12}}>
<div onClick={()=>{if(allChecked)setSelPerms(s=>s.filter(id=>!modPerms.some(p=>p.id===id)));else setSelPerms(s=>[...new Set([...s,...modPerms.map(p=>p.id)])])}} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',cursor:'pointer',borderBottom:'1px solid var(--bd2)'}}>
<div style={{width:18,height:18,borderRadius:5,border:allChecked?'none':'1.5px solid rgba(255,255,255,.2)',background:allChecked?C.blue:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
{allChecked&&<svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
</div>
<span style={{fontSize:12,fontWeight:700,color:C.gold}}>{mod}</span>
<span style={{fontSize:9,color:'var(--tx5)'}}>{modPerms.filter(p=>selPerms.includes(p.id)).length}/{modPerms.length}</span>
</div>
{modPerms.map(p=>{const checked=selPerms.includes(p.id);return<div key={p.id} onClick={()=>setSelPerms(s=>checked?s.filter(id=>id!==p.id):[...s,p.id])} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0 7px 26px',cursor:'pointer'}}>
<div style={{width:16,height:16,borderRadius:4,border:checked?'none':'1.5px solid rgba(255,255,255,.15)',background:checked?C.blue:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
{checked&&<svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
</div>
<span style={{fontSize:12,fontWeight:500,color:checked?'rgba(255,255,255,.85)':'rgba(255,255,255,.35)',flex:1}}>{p.name_ar}</span>
<span style={{fontSize:9,color:'rgba(255,255,255,.18)',fontFamily:'monospace',direction:'ltr'}}>{p.action}</span>
</div>})}
</div>})}
</div>
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',flexDirection:'row-reverse',flexShrink:0}}>
<button onClick={savePerms} disabled={permSaving} style={{...bS,height:42,minWidth:130,border:'1px solid rgba(52,131,180,.3)',background:'rgba(52,131,180,.15)',color:C.blue,opacity:permSaving?.6:1}}>{permSaving?'...':'حفظ الصلاحيات'}</button>
<button onClick={()=>setPermPop(null)} style={{height:42,padding:'0 18px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer'}}>إلغاء</button>
</div></div></div>}

{/* ═══ ADD/EDIT BANK ACCOUNT POPUP ═══ */}
{(pop==='add_bank'||pop==='edit_bank')&&<div onClick={()=>setPop(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:520,maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.4)',border:'1px solid var(--bd)'}}>
<div style={{height:3,background:'linear-gradient(90deg,transparent,'+C.blue+' 30%,#5ba3d4 50%,'+C.blue+' 70%,transparent)',flexShrink:0}}/>
<div style={{background:'var(--bg)',padding:'16px 22px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
<div style={{fontSize:15,fontWeight:700,color:'var(--tx)'}}>{pop==='add_bank'?'إضافة حساب بنكي':'تعديل حساب بنكي'}</div>
<button onClick={()=>setPop(null)} style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
</div>
<div style={{flex:1,overflowY:'auto',padding:'18px 22px'}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<div><div style={lblS}>اسم البنك <span style={{color:C.red}}>*</span></div><input value={form.bank_name||''} onChange={e=>setForm(p=>({...p,bank_name:e.target.value}))} style={fS}/></div>
<div><div style={lblS}>اسم الحساب</div><input value={form.account_name||''} onChange={e=>setForm(p=>({...p,account_name:e.target.value}))} style={fS}/></div>
<div><div style={lblS}>رقم الحساب</div><input value={form.account_number||''} onChange={e=>setForm(p=>({...p,account_number:e.target.value}))} style={fS}/></div>
<div><div style={lblS}>نوع الحساب <span style={{color:C.red}}>*</span></div><CustomSelect value={form.account_type||'deposit'} onChange={v=>setForm(p=>({...p,account_type:v}))} options={[{v:'deposit',l:'إيداع'},{v:'sadad',l:'سداد'},{v:'international',l:'حوالات خارجية'}]}/></div>
<div style={{gridColumn:'1/-1'}}><div style={lblS}>رقم الآيبان (IBAN)</div><input value={form.iban||''} onChange={e=>setForm(p=>({...p,iban:e.target.value.toUpperCase()}))} placeholder="SA..." style={{...fS,direction:'ltr',fontFamily:'monospace',letterSpacing:1}}/></div>
{form.account_type==='international'&&<div><div style={lblS}>رمز SWIFT</div><input value={form.swift_code||''} onChange={e=>setForm(p=>({...p,swift_code:e.target.value.toUpperCase()}))} style={{...fS,direction:'ltr',fontFamily:'monospace'}}/></div>}
<div><div style={lblS}>المكتب</div><CustomSelect value={form.branch_id||''} onChange={v=>setForm(p=>({...p,branch_id:v}))} options={branches.map(b=>({v:b.id,l:b.name_ar}))}/></div>
{form.account_type!=='international'&&<div/>}
<div><div style={lblS}>حساب رئيسي</div><CustomSelect value={form.is_primary||'false'} onChange={v=>setForm(p=>({...p,is_primary:v}))} options={[{v:'true',l:'نعم'},{v:'false',l:'لا'}]}/></div>
<div><div style={lblS}>الحالة</div><CustomSelect value={form.is_active||'true'} onChange={v=>setForm(p=>({...p,is_active:v}))} options={[{v:'true',l:'نشط'},{v:'false',l:'معطّل'}]}/></div>
<div style={{gridColumn:'1/-1'}}><div style={lblS}>ملاحظات</div><textarea value={form.notes||''} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2} style={{...fS,height:'auto',padding:12,resize:'vertical'}}/></div>
</div></div>
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'flex-start',flexShrink:0}}>
<button onClick={saveForm} disabled={saving} style={{...bS,height:42,minWidth:130,opacity:saving?.6:1}}>{saving?'...':(form._id?'حفظ':'إضافة')}</button>
</div></div></div>}

</div></div>
{/* REVIEW PENDING USER POPUP */}
{pop==='review_pending'&&reviewUser&&(()=>{
const ru=reviewUser;
const visibleRoles=roles.filter(r=>!roleSearch||(r.name_ar||'').includes(roleSearch)||(r.name_en||'').toLowerCase().includes(roleSearch.toLowerCase()));
const submit=async()=>{
if(saving||selRoles.length===0)return;
setSaving(true);
try{
const updates={branch_id:form.branch_id||null,notes:form.notes||null};
if(activateNow){updates.is_active=true;updates.activated_at=new Date().toISOString();updates.activated_by=user?.id||null}
await sb.from('users').update(updates).eq('id',ru.id);
await sb.from('user_roles').delete().eq('user_id',ru.id);
if(selRoles.length>0){await sb.from('user_roles').insert(selRoles.map(rid=>({user_id:ru.id,role_id:rid,assigned_by:user?.id||null})))}
toast(activateNow?'تمت الموافقة والتفعيل':'تم حفظ التعديلات');
setPop(null);setReviewUser(null);setSelRoles([]);
loadAll();
}catch(e){toast('خطأ: '+(e.message||''))}
setSaving(false);
};
return <div onClick={()=>{setPop(null);setReviewUser(null)}} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.78)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'#1a1a1a',borderRadius:16,width:'min(680px,96vw)',maxHeight:'92vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 24px 60px rgba(0,0,0,.5)',border:'1px solid var(--bd)'}}>
<div style={{padding:'18px 22px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexShrink:0,borderBottom:'1px solid var(--bd)'}}>
<div style={{display:'flex',alignItems:'flex-start',gap:10}}>
<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8"><circle cx="9" cy="7" r="4"/><path d="M17 11l2 2 4-4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/></svg>
<div>
<div style={{fontSize:16,fontWeight:800,color:C.gold}}>مراجعة طلب تسجيل جديد</div>
<div style={{fontSize:11,color:'var(--tx4)',marginTop:3}}>عيّن الأدوار المناسبة ثم قم بتفعيل الحساب للسماح بالدخول</div>
</div>
</div>
<button onClick={()=>{setPop(null);setReviewUser(null)}} style={{width:32,height:32,borderRadius:10,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
</button>
</div>
<div style={{flex:1,overflowY:'auto',padding:'18px 22px',display:'flex',flexDirection:'column',gap:16}}>
<div style={{padding:'14px 18px',borderRadius:12,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',display:'flex',alignItems:'center',gap:14}}>
<div style={{width:46,height:46,borderRadius:'50%',background:'rgba(184,114,42,.2)',border:'1px solid rgba(184,114,42,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:'#b8722a',flexShrink:0}}>{(ru.name_ar||'?')[0]}</div>
<div style={{flex:1,minWidth:0}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3,flexWrap:'wrap'}}>
<span style={{fontSize:15,fontWeight:800,color:'var(--tx)'}}>{ru.name_ar}</span>
<span style={{fontSize:10,padding:'3px 10px',borderRadius:12,background:'rgba(184,114,42,.15)',color:'#b8722a',fontWeight:700,display:'inline-flex',alignItems:'center',gap:5}}>
<span style={{width:5,height:5,borderRadius:'50%',background:'#b8722a'}}/>بانتظار الموافقة
</span>
</div>
<div style={{fontSize:11,color:'var(--tx4)',direction:'ltr',textAlign:'right',marginBottom:4}}>{ru.name_en||''}</div>
<div style={{display:'flex',gap:12,flexWrap:'wrap',fontSize:10,color:'var(--tx4)'}}>
{ru.email?<span style={{direction:'ltr'}}>✉ {ru.email}</span>:null}
{ru.phone?<span style={{direction:'ltr'}}>📞 {ru.phone}</span>:null}
{ru.id_number?<span style={{direction:'ltr'}}>ID: {ru.id_number}</span>:null}
{ru.nationality?<span>{ru.nationality}</span>:null}
</div>
</div>
</div>
<div>
<div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
<span style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>الأدوار المعيّنة</span>
<span style={{color:C.red}}>*</span>
</div>
<div style={{fontSize:10,color:'var(--tx4)',marginBottom:12}}>حدّد دور واحد أو أكثر. الموظف يحصل على مجموع صلاحيات جميع الأدوار.</div>
<div style={{padding:'10px 14px',borderRadius:10,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',display:'flex',flexWrap:'wrap',gap:6,minHeight:44,alignItems:'center'}}>
{selRoles.length>0?selRoles.map(rid=>{const r=roles.find(x=>x.id===rid);if(!r)return null;const rc=roleClrs[r.name_ar]||r.color||C.gold;return <span key={rid} style={{fontSize:11,padding:'5px 10px',borderRadius:12,background:rc+'15',border:'1px solid '+rc+'30',color:rc,fontWeight:700,display:'inline-flex',alignItems:'center',gap:6}}>{r.name_ar}<span onClick={()=>setSelRoles(sr=>sr.filter(id=>id!==rid))} style={{cursor:'pointer',display:'flex'}}>✕</span></span>}):<span style={{fontSize:10,color:'var(--tx5)'}}>لم يتم اختيار أي دور</span>}
</div>
<div style={{position:'relative',marginTop:10}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2" style={{position:'absolute',top:'50%',transform:'translateY(-50%)',right:14}}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
<input value={roleSearch} onChange={e=>setRoleSearch(e.target.value)} placeholder="ابحث عن دور..." style={{...fS,textAlign:'right',paddingRight:38}}/>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:10}}>
{visibleRoles.map(r=>{const ck=selRoles.includes(r.id);const rc=roleClrs[r.name_ar]||r.color||C.gold;return <div key={r.id} onClick={()=>setSelRoles(sr=>ck?sr.filter(id=>id!==r.id):[...sr,r.id])} style={{padding:'14px 16px',borderRadius:10,border:'1px solid '+(ck?rc+'40':'var(--bd)'),background:ck?rc+'08':'rgba(255,255,255,.02)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,transition:'.15s'}}>
<div style={{width:20,height:20,borderRadius:5,border:ck?'none':'1.5px solid rgba(255,255,255,.18)',background:ck?rc:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
{ck?<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>:null}
</div>
<div style={{textAlign:'right',flex:1}}>
<div style={{fontSize:12,fontWeight:700,color:ck?rc:'var(--tx)'}}>{r.name_ar}</div>
<div style={{fontSize:9,color:'var(--tx5)',direction:'ltr',textAlign:'right'}}>{r.name_en||r.name_ar}</div>
</div>
</div>})}
</div>
</div>
<div>
<div style={{fontSize:12,fontWeight:700,color:'var(--tx3)',marginBottom:8}}>الفرع</div>
<CustomSelect value={form.branch_id||''} onChange={v=>setForm(p=>({...p,branch_id:v}))} options={branches.map(b=>({v:b.id,l:b.name_ar}))}/>
</div>
<div style={{padding:'12px 14px',borderRadius:10,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
<div>
<div style={{fontSize:12,fontWeight:700,color:'var(--tx)',marginBottom:3}}>تفعيل الحساب فوراً</div>
<div style={{fontSize:10,color:'var(--tx4)'}}>سيتمكن الموظف من تسجيل الدخول بعد الحفظ</div>
</div>
<div onClick={()=>setActivateNow(!activateNow)} style={{width:42,height:22,borderRadius:11,background:activateNow?C.ok:'rgba(255,255,255,.1)',cursor:'pointer',position:'relative',transition:'.2s',flexShrink:0}}>
<div style={{position:'absolute',top:2,[activateNow?'left':'right']:2,width:18,height:18,borderRadius:'50%',background:'#fff',transition:'.2s'}}/>
</div>
</div>
<div>
<div style={{fontSize:12,fontWeight:700,color:'var(--tx3)',marginBottom:6}}>ملاحظات داخلية (اختياري)</div>
<textarea value={form.notes||''} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2} placeholder="سبب الموافقة، صلاحيات إضافية، ملاحظات إدارية..." style={{...fS,height:'auto',padding:12,resize:'vertical',textAlign:'right'}}/>
</div>
</div>
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0,gap:10}}>
<div style={{fontSize:10,color:'var(--tx5)'}}>{selRoles.length} دور محدد · {activateNow?'سيتم تفعيل الحساب':'لن يُفعّل الآن'}</div>
<div style={{display:'flex',gap:10,alignItems:'center'}}>
<button onClick={()=>{setPop(null);setReviewUser(null)}} style={{height:42,padding:'0 18px',background:'transparent',color:'var(--tx4)',border:'none',fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer'}}>رفض الطلب</button>
<button onClick={submit} disabled={saving||selRoles.length===0} style={{height:42,padding:'0 20px',background:C.ok,color:'#fff',border:'none',borderRadius:10,fontFamily:F,fontSize:12,fontWeight:800,cursor:saving||selRoles.length===0?'not-allowed':'pointer',display:'flex',alignItems:'center',gap:8,opacity:saving||selRoles.length===0?.6:1}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
{saving?'...':'موافقة وتفعيل'}
</button>
</div>
</div>
</div>
</div>;
})()}

{/* EDIT ACTIVE USER POPUP */}
{pop==='edit_active'&&reviewUser&&(()=>{
const ru=reviewUser;
const ac=ru.roles?.color||roleClrs[ru.roles?.name_ar]||'#9b59b6';
const br=branches.find(b=>b.id===editBranch);
const relD=iso=>{if(!iso)return'—';const d=daysSince(iso);if(d<1)return'اليوم';if(d===1)return'أمس';if(d<7)return'قبل '+d+' أيام';return d+' يوم'};
const updDays=daysSince(ru.updated_at);
const submit=async()=>{
if(saving)return;setSaving(true);
try{
await sb.from('users').update({branch_id:editBranch||null}).eq('id',ru.id);
await sb.from('user_roles').delete().eq('user_id',ru.id);
if(selRoles.length>0){await sb.from('user_roles').insert(selRoles.map(rid=>({user_id:ru.id,role_id:rid,assigned_by:user?.id||null})))}
toast('تم حفظ التعديلات');
setPop(null);setReviewUser(null);
loadAll();
}catch(e){toast('خطأ: '+(e.message||''))}
setSaving(false);
};
return <div onClick={()=>{setPop(null);setReviewUser(null)}} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.78)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'#1a1a1a',borderRadius:16,width:'min(680px,96vw)',maxHeight:'92vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 24px 60px rgba(0,0,0,.5)',border:'1px solid var(--bd)'}}>
<div style={{padding:'18px 22px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexShrink:0,borderBottom:'1px solid var(--bd)'}}>
<div style={{display:'flex',alignItems:'flex-start',gap:10}}>
<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
<div>
<div style={{fontSize:16,fontWeight:800,color:'var(--tx)'}}>تعديل بيانات الموظف</div>
<div style={{fontSize:11,color:'var(--tx4)',marginTop:3}}>إدارة الأدوار، الفرع، والحالة</div>
</div>
</div>
<button onClick={()=>{setPop(null);setReviewUser(null)}} style={{width:32,height:32,borderRadius:10,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
</button>
</div>
<div style={{flex:1,overflowY:'auto',padding:'18px 22px',display:'flex',flexDirection:'column',gap:16}}>
<div style={{padding:'14px 18px',borderRadius:12,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',display:'flex',alignItems:'center',gap:14}}>
<div style={{width:46,height:46,borderRadius:'50%',background:ac+'20',border:'1px solid '+ac+'30',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:ac,flexShrink:0}}>{(ru.name_ar||'?')[0]}</div>
<div style={{flex:1,minWidth:0}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3,flexWrap:'wrap'}}>
<span style={{fontSize:15,fontWeight:800,color:'var(--tx)'}}>{ru.name_ar}</span>
<span style={{fontSize:10,padding:'3px 10px',borderRadius:12,background:'rgba(39,160,70,.15)',color:C.ok,fontWeight:700,display:'inline-flex',alignItems:'center',gap:5}}>
<span style={{width:5,height:5,borderRadius:'50%',background:C.ok}}/>نشط
</span>
</div>
<div style={{fontSize:11,color:'var(--tx4)',direction:'ltr',textAlign:'right',marginBottom:4}}>{ru.name_en||''}{ru.last_login_at?' · آخر دخول: '+relD(ru.last_login_at):''}</div>
<div style={{display:'flex',gap:12,flexWrap:'wrap',fontSize:10,color:'var(--tx4)'}}>
{ru.email?<span style={{display:'inline-flex',alignItems:'center',gap:5}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg><span style={{direction:'ltr'}}>{ru.email}</span></span>:null}
{br?<span style={{display:'inline-flex',alignItems:'center',gap:5}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>{br.name_ar}</span>:null}
</div>
</div>
</div>
<div style={{display:'flex',gap:0,borderRadius:10,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',padding:4}}>
{[['roles','الأدوار والصلاحيات','shield'],['personal','البيانات الشخصية','user'],['activity','سجل النشاط','clock']].map(([k,l,i])=>{const sel=editTab===k;return <div key={k} onClick={()=>setEditTab(k)} style={{flex:1,padding:'10px 12px',borderRadius:7,fontSize:11,fontWeight:sel?800:600,color:sel?'var(--tx)':'var(--tx4)',background:sel?'rgba(255,255,255,.06)':'transparent',cursor:'pointer',textAlign:'center',transition:'.15s',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
<span>{l}</span>
{i==='shield'?<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>:i==='user'?<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0113 0"/></svg>:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
</div>})}
</div>
{editTab==='roles'?<div style={{display:'flex',flexDirection:'column',gap:16}}>
<div>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx)',marginBottom:4}}>الأدوار الحالية</div>
<div style={{fontSize:10,color:'var(--tx4)',marginBottom:10}}>يمكنك إضافة أو إزالة أدوار في أي وقت. التغييرات تصبح فعّالة فوراً.</div>
<div style={{padding:'12px 14px',borderRadius:10,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',display:'flex',flexWrap:'wrap',gap:6,minHeight:48,alignItems:'center'}}>
{selRoles.length>0?selRoles.map(rid=>{const r=roles.find(x=>x.id===rid);if(!r)return null;const rc=roleClrs[r.name_ar]||r.color||C.gold;return <span key={rid} style={{fontSize:11,padding:'5px 10px',borderRadius:12,background:rc+'15',border:'1px solid '+rc+'30',color:rc,fontWeight:700,display:'inline-flex',alignItems:'center',gap:6}}>{r.name_ar}<span onClick={()=>setSelRoles(sr=>sr.filter(id=>id!==rid))} style={{cursor:'pointer',display:'flex'}}>✕</span></span>}):<span style={{fontSize:10,color:'var(--tx5)'}}>لا توجد أدوار</span>}
</div>
<button onClick={()=>{const next=roles.find(r=>!selRoles.includes(r.id));if(next)setSelRoles(sr=>[...sr,next.id])}} style={{marginTop:10,width:'100%',padding:'14px',borderRadius:10,border:'1px dashed rgba(255,255,255,.12)',background:'transparent',color:'var(--tx3)',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:F,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>+ إضافة دور</button>
</div>
<div>
<div style={{fontSize:12,fontWeight:700,color:'var(--tx3)',marginBottom:8}}>الفرع</div>
<CustomSelect value={editBranch} onChange={v=>setEditBranch(v)} options={branches.map(b=>({v:b.id,l:b.name_ar}))}/>
</div>
<div>
<div style={{fontSize:12,fontWeight:700,color:'var(--tx3)',marginBottom:10}}>معلومات الحساب</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
{[['تاريخ الإضافة',ru.created_at?String(ru.created_at).slice(0,10):'—'],['تاريخ التفعيل',ru.activated_at?String(ru.activated_at).slice(0,10):'—'],['آخر دخول',ru.last_login_at?String(ru.last_login_at).slice(0,10):'—'],['فُعل بواسطة',user?.name_ar||'—']].map(([l,v])=><div key={l} style={{padding:'12px 14px',borderRadius:10,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)'}}>
<div style={{fontSize:9,color:'var(--tx5)',marginBottom:4}}>{l}</div>
<div style={{fontSize:12,fontWeight:700,color:'var(--tx)'}}>{v}</div>
</div>)}
</div>
</div>
<div>
<div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
<span style={{fontSize:12,fontWeight:700,color:C.red}}>منطقة الخطر</span>
</div>
<div style={{padding:'14px 16px',borderRadius:10,border:'1px solid rgba(192,57,43,.2)',background:'rgba(192,57,43,.03)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
<div>
<div style={{fontSize:12,fontWeight:700,color:C.red,marginBottom:3}}>تعطيل الحساب</div>
<div style={{fontSize:10,color:'var(--tx4)'}}>سيتم منع الموظف من تسجيل الدخول</div>
</div>
<button onClick={()=>{setDeactReason('');setDeactNotes('');setDeactConfirm('');setPop('deactivate_user')}} style={{height:34,padding:'0 14px',borderRadius:8,border:'none',background:C.red,color:'#fff',fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>تعطيل الحساب</button>
</div>
</div>
</div>:editTab==='personal'?<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
{[['name_ar','الاسم بالعربي'],['name_en','الاسم بالإنجليزي'],['email','البريد'],['phone','الجوال'],['id_number','رقم الهوية'],['nationality','الجنسية']].map(([k,l])=><div key={k}>
<div style={{fontSize:10,color:'var(--tx5)',marginBottom:6}}>{l}</div>
<div style={{padding:'12px 14px',borderRadius:10,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',fontSize:12,color:'var(--tx3)'}}>{ru[k]||'—'}</div>
</div>)}
</div>:<div style={{padding:40,textAlign:'center',color:'var(--tx5)',fontSize:12}}>سجل النشاط غير متاح حالياً</div>}
</div>
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0,gap:10}}>
<div style={{fontSize:10,color:'var(--tx5)'}}>{ru.updated_at?'آخر تعديل: قبل '+updDays+' أيام':''}</div>
<div style={{display:'flex',gap:10,alignItems:'center'}}>
<button onClick={()=>{setPop(null);setReviewUser(null)}} style={{height:42,padding:'0 18px',background:'transparent',color:'var(--tx4)',border:'none',fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer'}}>إلغاء</button>
<button onClick={submit} disabled={saving} style={{height:42,padding:'0 20px',background:C.gold,color:'#000',border:'none',borderRadius:10,fontFamily:F,fontSize:12,fontWeight:800,cursor:saving?'not-allowed':'pointer',display:'flex',alignItems:'center',gap:8,opacity:saving?.6:1}}>
{saving?'...':'حفظ التعديلات'}
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
</button>
</div>
</div>
</div>
</div>;
})()}

{/* DEACTIVATE USER POPUP */}
{pop==='deactivate_user'&&reviewUser&&(()=>{
const ru=reviewUser;
const ac=ru.roles?.color||roleClrs[ru.roles?.name_ar]||'#888';
const reasons=[['end_service','انتهاء الخدمة','الموظف لم يعد يعمل في الشركة'],['leave','إجازة طويلة','تعطيل مؤقت أثناء الإجازة'],['transfer','نقل لفرع آخر','الموظف انتقل لمكان آخر غير متابع'],['other','سبب آخر','اكتب السبب يدوياً في الخانة التالية']];
const canSubmit=deactReason&&deactConfirm.trim()===ru.name_ar?.trim();
const submit=async()=>{
if(saving||!canSubmit)return;setSaving(true);
try{
await sb.from('users').update({is_active:false,deactivated_at:new Date().toISOString(),deactivated_by:user?.id||null,deactivation_reason:reasons.find(r=>r[0]===deactReason)?.[1]||null,notes:deactNotes||null}).eq('id',ru.id);
toast('تم تعطيل الحساب');setPop(null);setReviewUser(null);loadAll();
}catch(e){toast('خطأ: '+(e.message||''))}
setSaving(false);
};
return <div onClick={()=>setPop('edit_active')} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.82)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1100,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'#1a1a1a',borderRadius:16,width:'min(580px,96vw)',maxHeight:'92vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 24px 60px rgba(0,0,0,.6)',border:'1px solid rgba(192,57,43,.2)'}}>
<div style={{padding:'18px 22px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexShrink:0,borderBottom:'1px solid var(--bd)'}}>
<div style={{display:'flex',alignItems:'flex-start',gap:10}}>
<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
<div>
<div style={{fontSize:16,fontWeight:800,color:C.red}}>تعطيل حساب الموظف</div>
<div style={{fontSize:11,color:'var(--tx4)',marginTop:3}}>هذا الإجراء يمنع الموظف من الدخول للنظام</div>
</div>
</div>
<button onClick={()=>setPop('edit_active')} style={{width:32,height:32,borderRadius:10,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
</button>
</div>
<div style={{flex:1,overflowY:'auto',padding:'18px 22px',display:'flex',flexDirection:'column',gap:14}}>
<div style={{padding:'14px 18px',borderRadius:12,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',display:'flex',alignItems:'center',gap:14}}>
<div style={{width:46,height:46,borderRadius:'50%',background:ac+'20',border:'1px solid '+ac+'30',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:ac}}>{(ru.name_ar||'?')[0]}</div>
<div><div style={{fontSize:15,fontWeight:800,color:'var(--tx)'}}>{ru.name_ar}</div><div style={{fontSize:11,color:'var(--tx4)'}}>{ru.name_en||''}{ru.roles?.name_ar?' · '+ru.roles.name_ar:''}</div></div>
</div>
<div style={{padding:'14px 18px',borderRadius:12,background:'rgba(192,57,43,.04)',border:'1px solid rgba(192,57,43,.2)'}}>
<div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
<span style={{fontSize:12,fontWeight:800,color:C.red}}>ما الذي سيحدث عند التعطيل؟</span>
</div>
<ul style={{margin:0,paddingRight:20,fontSize:11,color:'var(--tx3)',lineHeight:2}}>
<li>لن يتمكن الموظف من <span style={{color:C.red,fontWeight:700}}>تسجيل الدخول</span> للنظام</li>
<li>ستبقى <span style={{color:C.red,fontWeight:700}}>بياناته والمعاملات السابقة محفوظة</span></li>
<li>يمكنك <span style={{color:C.red,fontWeight:700}}>إعادة تفعيل</span> الحساب في أي وقت</li>
<li>الأدوار الحالية ستبقى محفوظة ولن تحذف</li>
</ul>
</div>
<div>
<div style={{fontSize:12,fontWeight:700,color:'var(--tx3)',marginBottom:10}}>سبب التعطيل <span style={{color:C.red}}>*</span></div>
<div style={{display:'flex',flexDirection:'column',gap:8}}>
{reasons.map(([k,l,d])=>{const sel=deactReason===k;return <div key={k} onClick={()=>setDeactReason(k)} style={{padding:'14px 16px',borderRadius:10,border:'1px solid '+(sel?'rgba(192,57,43,.35)':'var(--bd)'),background:sel?'rgba(192,57,43,.05)':'rgba(255,255,255,.02)',cursor:'pointer',display:'flex',alignItems:'center',gap:12,transition:'.15s'}}>
<div style={{width:18,height:18,borderRadius:'50%',border:sel?'none':'1.5px solid rgba(255,255,255,.18)',background:sel?C.red:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{sel?<div style={{width:7,height:7,borderRadius:'50%',background:'#fff'}}/>:null}</div>
<div style={{flex:1}}>
<div style={{fontSize:12,fontWeight:700,color:sel?C.red:'var(--tx)'}}>{l}</div>
<div style={{fontSize:10,color:'var(--tx5)',marginTop:2}}>{d}</div>
</div>
</div>})}
</div>
</div>
<div>
<div style={{fontSize:12,fontWeight:700,color:'var(--tx3)',marginBottom:6}}>ملاحظات إضافية (اختياري)</div>
<textarea value={deactNotes} onChange={e=>setDeactNotes(e.target.value)} rows={3} placeholder="تفاصيل إضافية عن سبب التعطيل..." style={{...fS,height:'auto',padding:12,resize:'vertical',textAlign:'right'}}/>
</div>
<div style={{padding:'14px 18px',borderRadius:12,background:'rgba(192,57,43,.04)',border:'1px solid rgba(192,57,43,.2)'}}>
<div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>
<span style={{fontSize:12,fontWeight:800,color:C.red}}>تأكيد الإجراء</span>
</div>
<div style={{fontSize:11,color:'var(--tx3)',marginBottom:8}}>اكتب اسم الموظف <span style={{color:C.red,fontWeight:700}}>"{ru.name_ar}"</span> للتأكيد</div>
<input value={deactConfirm} onChange={e=>setDeactConfirm(e.target.value)} placeholder="اكتب الاسم هنا..." style={{...fS,textAlign:'center',background:'rgba(0,0,0,.3)'}}/>
</div>
</div>
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'flex-start',gap:10,flexShrink:0}}>
<button onClick={submit} disabled={saving||!canSubmit} style={{height:42,padding:'0 20px',background:C.red,color:'#fff',border:'none',borderRadius:10,fontFamily:F,fontSize:12,fontWeight:800,cursor:canSubmit?'pointer':'not-allowed',display:'flex',alignItems:'center',gap:8,opacity:canSubmit?1:.5}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
تعطيل الحساب
</button>
<button onClick={()=>setPop('edit_active')} style={{height:42,padding:'0 20px',background:'rgba(255,255,255,.04)',color:'var(--tx)',border:'1px solid rgba(255,255,255,.08)',borderRadius:10,fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer'}}>إلغاء</button>
</div>
</div>
</div>;
})()}

{/* REACTIVATE USER POPUP */}
{pop==='reactivate_user'&&reviewUser&&(()=>{
const ru=reviewUser;
const ac=ru.roles?.color||roleClrs[ru.roles?.name_ar]||'#888';
const disDays=ru.deactivated_at?daysSince(ru.deactivated_at):null;
const savedRoles=ru.user_roles||[];
const submit=async()=>{
if(saving)return;setSaving(true);
try{
await sb.from('users').update({is_active:true,activated_at:new Date().toISOString(),activated_by:user?.id||null,deactivated_at:null,deactivation_reason:null}).eq('id',ru.id);
toast('تم تفعيل الحساب');setPop(null);setReviewUser(null);loadAll();
}catch(e){toast('خطأ: '+(e.message||''))}
setSaving(false);
};
return <div onClick={()=>{setPop(null);setReviewUser(null)}} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.82)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1100,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'#1a1a1a',borderRadius:16,width:'min(580px,96vw)',maxHeight:'92vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 24px 60px rgba(0,0,0,.6)',border:'1px solid rgba(39,160,70,.2)'}}>
<div style={{padding:'18px 22px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexShrink:0,borderBottom:'1px solid var(--bd)'}}>
<div style={{display:'flex',alignItems:'flex-start',gap:10}}>
<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.ok} strokeWidth="1.8"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
<div>
<div style={{fontSize:16,fontWeight:800,color:C.ok}}>إعادة تفعيل الحساب</div>
<div style={{fontSize:11,color:'var(--tx4)',marginTop:3}}>استعادة وصول الموظف للنظام</div>
</div>
</div>
<button onClick={()=>{setPop(null);setReviewUser(null)}} style={{width:32,height:32,borderRadius:10,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
</button>
</div>
<div style={{flex:1,overflowY:'auto',padding:'18px 22px',display:'flex',flexDirection:'column',gap:14}}>
<div style={{padding:'14px 18px',borderRadius:12,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',display:'flex',alignItems:'center',gap:14}}>
<div style={{width:46,height:46,borderRadius:'50%',background:ac+'20',border:'1px solid '+ac+'30',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:ac}}>{(ru.name_ar||'?')[0]}</div>
<div style={{flex:1,minWidth:0}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3,flexWrap:'wrap'}}>
<span style={{fontSize:15,fontWeight:800,color:'var(--tx)'}}>{ru.name_ar}</span>
<span style={{fontSize:10,padding:'3px 10px',borderRadius:12,background:'rgba(192,57,43,.15)',color:C.red,fontWeight:700,display:'inline-flex',alignItems:'center',gap:5}}>
<span style={{width:5,height:5,borderRadius:'50%',background:C.red}}/>معطل
</span>
</div>
<div style={{fontSize:11,color:'var(--tx4)',direction:'ltr',textAlign:'right'}}>{ru.name_en||''}{disDays!==null?' · معطل منذ '+disDays+' يوم':''}</div>
</div>
</div>
<div>
<div style={{fontSize:12,fontWeight:700,color:'var(--tx3)',marginBottom:10}}>معلومات التعطيل السابق</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
{[['السبب',ru.deactivation_reason||'—'],['عُطل بتاريخ',ru.deactivated_at?String(ru.deactivated_at).slice(0,10):'—'],['عُطل بواسطة','مهدي اليامي'],['آخر دخول',ru.last_login_at?String(ru.last_login_at).slice(0,10):'—']].map(([l,v])=><div key={l} style={{padding:'12px 14px',borderRadius:10,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)'}}>
<div style={{fontSize:9,color:'var(--tx5)',marginBottom:4}}>{l}</div>
<div style={{fontSize:12,fontWeight:700,color:'var(--tx)'}}>{v}</div>
</div>)}
</div>
</div>
<div>
<div style={{fontSize:12,fontWeight:700,color:'var(--tx3)',marginBottom:4}}>الأدوار المحفوظة</div>
<div style={{fontSize:10,color:'var(--tx5)',marginBottom:10}}>هذه الأدوار ستعود فعّالة تلقائياً بعد التفعيل</div>
<div style={{padding:'12px 14px',borderRadius:10,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',display:'flex',flexWrap:'wrap',gap:6,minHeight:44,alignItems:'center'}}>
{savedRoles.length>0?savedRoles.map((ur,i)=>{const rn=ur.roles?.name_ar;if(!rn)return null;const rc=roleClrs[rn]||ur.roles?.color||C.gold;return <span key={i} style={{fontSize:11,padding:'5px 12px',borderRadius:12,background:rc+'15',border:'1px solid '+rc+'30',color:rc,fontWeight:700}}>{rn}</span>}):<span style={{fontSize:10,color:'var(--tx5)'}}>لا توجد أدوار محفوظة</span>}
</div>
</div>
<div style={{padding:'12px 14px',borderRadius:10,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
<div>
<div style={{fontSize:12,fontWeight:700,color:'var(--tx)',marginBottom:3}}>إرسال إشعار للموظف</div>
<div style={{fontSize:10,color:'var(--tx4)'}}>بريد إلكتروني لإعلامه بإعادة تفعيل حسابه</div>
</div>
<div onClick={()=>setReactNotify(!reactNotify)} style={{width:42,height:22,borderRadius:11,background:reactNotify?C.ok:'rgba(255,255,255,.1)',cursor:'pointer',position:'relative',transition:'.2s',flexShrink:0}}>
<div style={{position:'absolute',top:2,[reactNotify?'left':'right']:2,width:18,height:18,borderRadius:'50%',background:'#fff',transition:'.2s'}}/>
</div>
</div>
<div style={{padding:'14px 18px',borderRadius:12,background:'rgba(52,131,180,.06)',border:'1px solid rgba(52,131,180,.2)',display:'flex',alignItems:'flex-start',gap:10}}>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2" style={{flexShrink:0,marginTop:1}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
<div>
<div style={{fontSize:12,fontWeight:700,color:C.blue,marginBottom:3}}>ملاحظة</div>
<div style={{fontSize:11,color:'var(--tx3)',lineHeight:1.7}}>سيتمكن الموظف من الدخول فوراً بعد التفعيل باستخدام نفس بيانات الدخول السابقة.</div>
</div>
</div>
</div>
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'flex-start',gap:10,flexShrink:0}}>
<button onClick={submit} disabled={saving} style={{height:42,padding:'0 20px',background:C.ok,color:'#fff',border:'none',borderRadius:10,fontFamily:F,fontSize:12,fontWeight:800,cursor:saving?'not-allowed':'pointer',display:'flex',alignItems:'center',gap:8,opacity:saving?.6:1}}>
{saving?'...':'تفعيل الحساب'}
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
</button>
<button onClick={()=>{setPop(null);setReviewUser(null)}} style={{height:42,padding:'0 20px',background:'rgba(255,255,255,.04)',color:'var(--tx)',border:'1px solid rgba(255,255,255,.08)',borderRadius:10,fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer'}}>إلغاء</button>
</div>
</div>
</div>;
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
const stepTitles={1:'المعلومات الأساسية',2:'المظهر ونطاق الوصول',3:'الصلاحيات'};
const canNext1=form.name_ar&&form.name_en&&form.code;
const canSubmit=form.name_ar&&form.code&&selPerms.length>0;
const submit=async()=>{
if(saving)return;
setSaving(true);
try{
const{data:newR,error}=await sb.from('roles').insert({name_ar:form.name_ar,name_en:form.name_en||null,description:form.description||null,color:form.color||C.gold,is_active:true,is_system:false}).select('id').single();
if(error)throw error;
if(selPerms.length>0){await sb.from('role_permissions').insert(selPerms.map(pid=>({role_id:newR.id,permission_id:pid})))}
toast('تم إنشاء الدور');setPop(null);loadAll();
}catch(e){toast('خطأ: '+(e.message||''))}
setSaving(false);
};
const fldLbl={fontSize:11,fontWeight:700,color:'rgba(255,255,255,.58)',marginBottom:5};
const fldInp={width:'100%',height:40,padding:'0 14px',border:'1px solid rgba(255,255,255,.08)',borderRadius:9,fontFamily:F,fontSize:12,fontWeight:600,color:'var(--tx)',background:'rgba(0,0,0,.18)',outline:'none',textAlign:'right',boxSizing:'border-box',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)'};
return <div onClick={()=>setPop(null)} style={{position:'fixed',inset:0,background:'rgba(10,10,10,.8)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'#1a1a1a',borderRadius:18,width:'min(720px,96vw)',height:'min(560px,94vh)',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 24px 60px rgba(0,0,0,.5)',border:'1px solid rgba(212,160,23,.08)'}}>
<style>{`.role-nav-btn{height:40px;padding:0 6px;background:transparent;border:none;color:${C.gold};font-family:${F};font-size:14px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:10px;transition:.2s}.role-nav-btn .nav-ico{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);display:flex;align-items:center;justify-content:center;transition:.2s;color:${C.gold}}.role-nav-btn:hover:not(:disabled) .nav-ico{background:${C.gold};color:#000}.role-nav-btn:disabled{opacity:.45;cursor:not-allowed}.role-hide-scroll{scrollbar-width:none;-ms-overflow-style:none}.role-hide-scroll::-webkit-scrollbar{display:none;width:0;height:0}`}</style>

{/* Header */}
<div style={{padding:'16px 22px 10px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
<div style={{display:'flex',alignItems:'center',gap:10}}>
<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
<div>
<div style={{fontSize:16,fontWeight:800,color:'var(--tx)'}}>إضافة دور جديد</div>
<div style={{fontSize:11,color:'var(--tx4)',marginTop:3}}>الخطوة {roleWizStep} من 3 — {stepTitles[roleWizStep]}</div>
</div>
</div>
<button onClick={()=>setPop(null)} style={{width:32,height:32,borderRadius:10,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
</button>
</div>

{/* Progress bar */}
<div style={{padding:'0 22px 10px',display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
{[1,2,3].map(s=><div key={s} style={{flex:1,height:3,borderRadius:2,background:roleWizStep>=s?C.gold:'rgba(255,255,255,.08)',transition:'.25s'}}/>)}
</div>

{/* Body */}
<div className="role-hide-scroll" style={{flex:1,overflowY:'auto',padding:'12px 22px 10px',display:'flex',flexDirection:'column',gap:12,minHeight:0}}>

{/* STEP 1 — Basic info */}
{roleWizStep===1&&<div style={{border:'1.5px solid rgba(212,160,23,.35)',borderRadius:12,padding:'18px 16px 16px',position:'relative',flex:1,display:'flex',flexDirection:'column',gap:12}}>
<div style={{position:'absolute',top:-9,right:14,background:'#1a1a1a',padding:'0 8px',fontSize:12,fontWeight:800,color:C.gold}}>المعلومات الأساسية</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:4}}>
<div><div style={fldLbl}>الاسم بالعربي <span style={{color:C.red}}>*</span></div><input value={form.name_ar||''} onChange={e=>setForm(p=>({...p,name_ar:e.target.value}))} placeholder="مسؤول تأشيرات" style={fldInp}/></div>
<div><div style={fldLbl}>الاسم بالإنجليزي <span style={{color:C.red}}>*</span></div><input value={form.name_en||''} onChange={e=>setForm(p=>({...p,name_en:e.target.value}))} placeholder="Visa Officer" style={{...fldInp,direction:'ltr',textAlign:'left'}}/></div>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div>
<div style={fldLbl}>المعرّف البرمجي <span style={{color:C.red}}>*</span></div>
<div style={{display:'flex',border:'1px solid rgba(255,255,255,.08)',borderRadius:9,background:'rgba(0,0,0,.18)',overflow:'hidden',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)'}}>
<input value={form.code||''} onChange={e=>setForm(p=>({...p,code:e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,'')}))} placeholder="visa_officer" style={{flex:1,height:40,padding:'0 12px',border:'none',background:'transparent',direction:'ltr',color:'var(--tx)',fontSize:12,fontWeight:600,outline:'none'}}/>
<div style={{padding:'0 10px',background:'rgba(255,255,255,.04)',display:'flex',alignItems:'center',fontSize:11,color:'var(--tx5)',direction:'ltr'}}>.role</div>
</div>
</div>
<div>
<div style={fldLbl}>مستوى الوصول</div>
<CustomSelect value={String(roleLevel)} onChange={v=>setRoleLevel(Number(v))} options={[{v:'1',l:'1 — أساسي'},{v:'2',l:'2 — مسؤول متخصص'},{v:'3',l:'3 — مدير'},{v:'4',l:'4 — مدير عام'}]}/>
</div>
</div>
<div>
<div style={fldLbl}>الوصف</div>
<textarea value={form.description||''} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={2} placeholder="وصف مختصر عن مسؤوليات هذا الدور..." style={{...fldInp,height:60,padding:'10px 14px',resize:'none',textAlign:'right'}}/>
</div>
<div style={{fontSize:9,color:'var(--tx5)',display:'flex',alignItems:'center',gap:4,marginTop:'auto'}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>المعرّف البرمجي لا يمكن تغييره لاحقاً</div>
</div>}

{/* STEP 2 — Appearance + Scope + Settings */}
{roleWizStep===2&&<div style={{flex:1,display:'flex',flexDirection:'column',gap:10,minHeight:0}}>
<div style={{border:'1.5px solid rgba(212,160,23,.35)',borderRadius:12,padding:'14px 16px',position:'relative'}}>
<div style={{position:'absolute',top:-9,right:14,background:'#1a1a1a',padding:'0 8px',fontSize:12,fontWeight:800,color:C.gold}}>الشكل المرئي</div>
<div style={{display:'flex',alignItems:'center',gap:14,marginTop:2}}>
<span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:11,padding:'6px 12px',borderRadius:14,background:(form.color||'#3483b4')+'20',border:'1px solid '+(form.color||'#3483b4')+'50',color:form.color||'#3483b4',fontWeight:700,flexShrink:0}}>
<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
{form.name_ar||'اسم الدور'}
</span>
<div style={{display:'flex',gap:6,flex:1,flexWrap:'wrap'}}>
{colors.map(c=><div key={c} onClick={()=>setForm(p=>({...p,color:c}))} style={{width:28,height:28,borderRadius:7,background:c,cursor:'pointer',border:form.color===c?'2px solid #fff':'2px solid transparent',display:'flex',alignItems:'center',justifyContent:'center',boxSizing:'border-box'}}>
{form.color===c?<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>:null}
</div>)}
</div>
</div>
</div>

<div style={{border:'1.5px solid rgba(212,160,23,.35)',borderRadius:12,padding:'14px 16px',position:'relative'}}>
<div style={{position:'absolute',top:-9,right:14,background:'#1a1a1a',padding:'0 8px',fontSize:12,fontWeight:800,color:C.gold}}>نطاق الوصول</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:2}}>
{[['all_branches','جميع الفروع','وصول شامل لبيانات جميع الفروع'],['own_branch','فرع الموظف فقط','يرى بيانات الفرع المعيّن له فقط']].map(([k,l,d])=>{const sel=roleScope===k;return <div key={k} onClick={()=>setRoleScope(k)} style={{padding:'10px 12px',borderRadius:9,border:'1px solid '+(sel?'rgba(212,160,23,.4)':'var(--bd)'),background:sel?'rgba(212,160,23,.05)':'rgba(255,255,255,.02)',cursor:'pointer',transition:'.15s'}}>
<div style={{fontSize:11,fontWeight:700,color:sel?C.gold:'var(--tx)',marginBottom:3}}>{l}</div>
<div style={{fontSize:9,color:'var(--tx5)',lineHeight:1.5}}>{d}</div>
</div>})}
</div>
</div>

<div style={{border:'1.5px solid rgba(212,160,23,.35)',borderRadius:12,padding:'14px 16px',position:'relative'}}>
<div style={{position:'absolute',top:-9,right:14,background:'#1a1a1a',padding:'0 8px',fontSize:12,fontWeight:800,color:C.gold}}>إعدادات إضافية</div>
<div style={{display:'flex',flexDirection:'column',gap:8,marginTop:2}}>
<div style={{padding:'8px 12px',borderRadius:8,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
<div>
<div style={{fontSize:11,fontWeight:700,color:'var(--tx)',marginBottom:2}}>قابل للتعيين</div>
<div style={{fontSize:9,color:'var(--tx4)'}}>السماح بتعيين هذا الدور لموظفين جدد</div>
</div>
<div onClick={()=>setRoleAssignable(!roleAssignable)} style={{width:38,height:20,borderRadius:10,background:roleAssignable?C.ok:'rgba(255,255,255,.1)',cursor:'pointer',position:'relative',transition:'.2s',flexShrink:0}}>
<div style={{position:'absolute',top:2,[roleAssignable?'left':'right']:2,width:16,height:16,borderRadius:'50%',background:'#fff',transition:'.2s'}}/>
</div>
</div>
<div style={{padding:'8px 12px',borderRadius:8,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
<div>
<div style={{fontSize:11,fontWeight:700,color:'var(--tx)',marginBottom:2}}>يتطلب تصعيد تلقائي</div>
<div style={{fontSize:9,color:'var(--tx4)'}}>إشعار المدير عند تجاوز حدود الصلاحية</div>
</div>
<div onClick={()=>setRoleEscalation(!roleEscalation)} style={{width:38,height:20,borderRadius:10,background:roleEscalation?C.ok:'rgba(255,255,255,.1)',cursor:'pointer',position:'relative',transition:'.2s',flexShrink:0}}>
<div style={{position:'absolute',top:2,[roleEscalation?'left':'right']:2,width:16,height:16,borderRadius:'50%',background:'#fff',transition:'.2s'}}/>
</div>
</div>
</div>
</div>
</div>}

{/* STEP 3 — Permissions */}
{roleWizStep===3&&<div style={{border:'1.5px solid rgba(212,160,23,.35)',borderRadius:12,padding:'18px 14px 14px',position:'relative',flex:1,display:'flex',flexDirection:'column',gap:10,minHeight:0}}>
<div style={{position:'absolute',top:-9,right:14,background:'#1a1a1a',padding:'0 8px',fontSize:12,fontWeight:800,color:C.gold}}>الصلاحيات · {selPerms.length} محدّدة</div>

<div style={{position:'relative',flexShrink:0}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2" style={{position:'absolute',top:'50%',transform:'translateY(-50%)',right:12}}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
<input value={rolePermSearch} onChange={e=>setRolePermSearch(e.target.value)} placeholder="ابحث في الصلاحيات..." style={{...fldInp,height:36,paddingRight:30}}/>
</div>

<div className="role-hide-scroll" style={{display:'flex',gap:6,overflowX:'auto',flexShrink:0,paddingBottom:2}}>
{visMods.map(m=>{const mPerms=(permsByMod[m]||[]).filter(p=>filteredPerms.includes(p));const modSel=mPerms.filter(p=>selPerms.includes(p.id)).length;const isCur=m===curMod;return <div key={m} onClick={()=>setRoleActiveMod(m)} style={{padding:'6px 12px',borderRadius:8,background:isCur?'rgba(212,160,23,.15)':'rgba(255,255,255,.03)',border:'1px solid '+(isCur?'rgba(212,160,23,.35)':'rgba(255,255,255,.06)'),cursor:'pointer',display:'flex',alignItems:'center',gap:6,flexShrink:0,transition:'.15s'}}>
<span style={{fontSize:11,fontWeight:700,color:isCur?C.gold:'var(--tx2)',whiteSpace:'nowrap'}}>{modsLabels[m]||m}</span>
<span style={{fontSize:9,padding:'1px 6px',borderRadius:8,background:modSel>0?C.gold+'22':'rgba(255,255,255,.05)',color:modSel>0?C.gold:'var(--tx5)',fontWeight:800}}>{modSel}/{mPerms.length}</span>
</div>})}
</div>

{curMod&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
<div style={{fontSize:10,color:'var(--tx5)'}}>{modsLabels[curMod]||curMod}</div>
<div style={{display:'flex',gap:6}}>
<button onClick={()=>setSelPerms(perms.map(p=>p.id))} style={{padding:'4px 10px',borderRadius:6,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.03)',color:'var(--tx3)',fontSize:10,fontWeight:700,fontFamily:F,cursor:'pointer'}}>الكل</button>
<button onClick={()=>{if(curModAllSel){setSelPerms(s=>s.filter(id=>!curModPerms.some(p=>p.id===id)))}else{setSelPerms(s=>[...new Set([...s,...curModPerms.map(p=>p.id)])])}}} style={{padding:'4px 10px',borderRadius:6,border:'1px solid rgba(212,160,23,.2)',background:'rgba(212,160,23,.08)',color:C.gold,fontSize:10,fontWeight:700,fontFamily:F,cursor:'pointer'}}>{curModAllSel?'إلغاء القسم':'تحديد القسم'}</button>
</div>
</div>}

<div className="role-hide-scroll" style={{flex:1,overflowY:'auto',display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,alignContent:'flex-start'}}>
{curModPerms.map(p=>{const ck=selPerms.includes(p.id);return <div key={p.id} onClick={()=>setSelPerms(s=>ck?s.filter(id=>id!==p.id):[...s,p.id])} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:8,background:ck?'rgba(212,160,23,.08)':'rgba(255,255,255,.02)',border:'1px solid '+(ck?'rgba(212,160,23,.3)':'var(--bd)'),cursor:'pointer',transition:'.1s',minHeight:38,boxSizing:'border-box'}}>
<div style={{width:16,height:16,borderRadius:4,border:ck?'none':'1.5px solid rgba(255,255,255,.18)',background:ck?C.gold:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{ck?<svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="#000" strokeWidth="3" strokeLinecap="round"/></svg>:null}</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:11,fontWeight:700,color:ck?C.gold:'var(--tx)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.name_ar||p.action}</div>
<div style={{fontSize:9,color:'var(--tx5)',direction:'ltr',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.module}.{p.action}</div>
</div>
</div>})}
{curModPerms.length===0&&<div style={{gridColumn:'1/-1',padding:16,textAlign:'center',fontSize:10,color:'var(--tx5)'}}>لا توجد صلاحيات</div>}
</div>
</div>}

</div>

{/* Footer navigation */}
<div style={{flexShrink:0,padding:'12px 22px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
{roleWizStep>1?<button onClick={()=>setRoleWizStep(roleWizStep-1)} className="role-nav-btn"><span className="nav-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span><span>رجوع</span></button>:<span/>}
{roleWizStep<3?<button onClick={()=>{if(roleWizStep===1&&!canNext1){toast('الرجاء إكمال الحقول المطلوبة');return}setRoleWizStep(roleWizStep+1)}} disabled={roleWizStep===1&&!canNext1} className="role-nav-btn"><span>التالي</span><span className="nav-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg></span></button>:<button onClick={submit} disabled={saving||!canSubmit} className="role-nav-btn"><span>{saving?'جاري...':'إنشاء الدور'}</span><span className="nav-ico">{saving?<div style={{width:14,height:14,border:'2px solid rgba(212,160,23,.3)',borderTopColor:C.gold,borderRadius:'50%',animation:'spin .7s linear infinite'}}/>:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}</span></button>}
</div>

</div>
</div>;
})()}

{/* DELETE POPUP */}
{delTarget&&<DeletePopup itemName={delTarget.name} onConfirm={confirmDel} onCancel={()=>setDelTarget(null)}/>}
</div>}

function UiControlsTab({sb,users,toast,nav,hubTabs,visibility,onVisibilityChange}){
  const F="'Cairo',sans-serif"
  const C={gold:'#D4A017',ok:'#27a046',red:'#c0392b',blue:'#3483b4'}
  // Sections grouped by feature area — add new sections here as you gate more features
  const SECTIONS=[
    {id:'sms',l:'الرسائل النصية',icon:'💬',controls:[
      {k:'add_person',l:'إضافة شخص',d:'زر إضافة شخص جديد في أعلى الصفحة'},
      {k:'service_settings',l:'إعدادات الجهات (الشعارات والألوان)',d:'أيقونة الترس لفتح نافذة تخصيص الجهات'},
      {k:'person_settings',l:'إعدادات الشخص (الحساب والاتصال)',d:'أزرار إعدادات كل شخص عند اختياره من التبويب'},
      {k:'delete_message',l:'حذف الرسالة',d:'زر حذف يظهر أعلى كل كرت رسالة'},
      {k:'edit_msg_category',l:'تعديل فئة الرسالة',d:'زر تعديل الفئة للرسالة الواحدة'},
      {k:'edit_permissions',l:'تعديل صلاحيات الاطلاع',d:'زر تعديل من يستطيع رؤية الرسالة'},
      {k:'search',l:'شريط البحث',d:'خانة البحث النصي فوق قائمة الرسائل'},
      {k:'advanced_search',l:'البحث المتقدم',d:'قائمة الفلاتر (الجهة / التصنيف / الفئة)'},
    ]},
  ]
  const MODES=[
    {v:'everyone',l:'الجميع',c:C.ok,ic:'✓'},
    {v:'disabled',l:'معطّل',c:C.red,ic:'✕'},
    {v:'gm_only',l:'المدير العام فقط',c:C.gold,ic:'♛'},
    {v:'custom',l:'موظفون محددون',c:C.blue,ic:'●'},
  ]
  const[perms,setPerms]=React.useState({})
  const[loading,setLoading]=React.useState(true)
  React.useEffect(()=>{sb.from('ui_controls').select('*').then(({data})=>{if(data)setPerms(Object.fromEntries(data.map(r=>[r.control_key,r])));setLoading(false)})},[sb])
  const updateMode=async(key,mode)=>{const current=perms[key]||{control_key:key,allowed_user_ids:[]};const next={...current,mode,updated_at:new Date().toISOString()};setPerms(p=>({...p,[key]:next}));await sb.from('ui_controls').upsert({control_key:key,mode,allowed_user_ids:current.allowed_user_ids||[]});toast&&toast('تم الحفظ')}
  const toggleUser=async(key,userId)=>{const current=perms[key]||{control_key:key,mode:'custom',allowed_user_ids:[]};const arr=current.allowed_user_ids||[];const nextArr=arr.includes(userId)?arr.filter(u=>u!==userId):[...arr,userId];const next={...current,allowed_user_ids:nextArr};setPerms(p=>({...p,[key]:next}));await sb.from('ui_controls').upsert({control_key:key,mode:current.mode||'custom',allowed_user_ids:nextArr})}
  if(loading)return<div style={{padding:40,textAlign:'center',color:'var(--tx5)',fontFamily:F}}>جاري التحميل...</div>
  // Sidebar visibility toggles (localStorage-based, applies to all users)
  const LOCKED_NAV=['admin_hub','admin_visibility']
  const visGet=(id)=>(visibility||{})[id]!==false
  const visToggle=(id)=>{if(LOCKED_NAV.includes(id))return;const next={...(visibility||{}),[id]:!visGet(id)};onVisibilityChange&&onVisibilityChange(next);toast&&toast(next[id]?'تم الإظهار':'تم الإخفاء')}
  const showAllNav=()=>{onVisibilityChange&&onVisibilityChange({});toast&&toast('تم إظهار كل التبويبات')}
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
