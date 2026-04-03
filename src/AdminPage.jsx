import React,{useState,useEffect,useCallback} from 'react'
const F="'Cairo',sans-serif"
const C={dk:'#171717',fm:'#1e1e1e',gold:'#c9a84c',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}
const num=v=>Number(v||0).toLocaleString('en-US')

const fS={width:'100%',height:42,padding:'0 14px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:F,fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',background:'rgba(255,255,255,.07)',textAlign:'center'}
const bS={height:36,padding:'0 16px',borderRadius:8,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.12)',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5}
const lblS={fontSize:11,fontWeight:600,color:'var(--tx3)',marginBottom:5}

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
export default function AdminPage({sb,toast,user,lang,onTabChange,defaultTab}){
const isAr=lang!=='en'
const[tab,setTab]=useState(defaultTab||'branches')
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
const[attendance,setAttendance]=useState([])
const[loginLogs,setLoginLogs]=useState([])
const[empLangs,setEmpLangs]=useState([])
const[empSpecs,setEmpSpecs]=useState([])
const[userTasks,setUserTasks]=useState([])

useEffect(()=>{onTabChange&&onTabChange({tab,svcSubTab:tab})},[tab,onTabChange])

const loadAll=useCallback(async()=>{
setLoading(true)
const[br,us,rl,pm,rp,rg,ct,ll,li,ba]=await Promise.all([
sb.from('branches').select('*').is('deleted_at',null).order('name_ar'),
sb.from('users').select('*,roles:role_id(name_ar,name_en,color)').is('deleted_at',null).order('name_ar'),
sb.from('roles').select('*').is('deleted_at',null).order('name_ar'),
sb.from('permission_templates').select('*').order('module').order('action'),
sb.from('role_permissions').select('*'),
sb.from('regions').select('*').order('sort_order').order('name_ar'),
sb.from('cities').select('*').order('sort_order').order('name_ar'),
sb.from('lookup_lists').select('*').order('name_ar'),
sb.from('lookup_items').select('*').order('sort_order'),
sb.from('bank_accounts').select('*').order('is_primary',{ascending:false}).order('bank_name')
])
setBranches(br.data||[]);setUsers(us.data||[]);setRoles(rl.data||[]);setPerms(pm.data||[]);setRolePerms(rp.data||[]);setRegions(rg.data||[]);setCities(ct.data||[]);setLLists(ll.data||[]);setLItems(li.data||[]);setBankAccs(ba.data||[])
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

const allTabs=[{id:'branches',l:'المكاتب',le:'Branches'},{id:'bank_accounts',l:'الحسابات البنكية',le:'Bank Accounts'},{id:'users',l:'الموظفين',le:'Users'},{id:'roles',l:'الأدوار والصلاحيات',le:'Roles & Permissions'}];const tabs=defaultTab==='users'?allTabs.filter(t=>t.id==='users'||t.id==='roles'):allTabs

const openAdd=()=>{setForm({_table:'branches',name_ar:'',name_en:'',code:'',region_id:'',city_id:'',mobile:'',email:'',color:'#c9a84c',manager_id:'',work_from:'08:00',work_to:'17:00',work_days:'الأحد,الاثنين,الثلاثاء,الأربعاء,الخميس',opening_balance:'',daily_cash_limit:'',is_active:'true',address:'',google_maps_url:'',notes:''});setStep(1);setPop('add')}
const openEdit=(b)=>{setForm({_table:'branches',_id:b.id,name_ar:b.name_ar||'',name_en:b.name_en||'',code:b.code?b.code.split('-').pop():'',region_id:b.region_id||'',city_id:b.city_id||'',mobile:b.mobile?b.mobile.replace('+966',''):'',email:b.email||'',color:b.color||'#c9a84c',manager_id:b.manager_id||'',work_from:b.work_from||'08:00',work_to:b.work_to||'17:00',work_days:b.work_days||'الأحد,الاثنين,الثلاثاء,الأربعاء,الخميس',opening_balance:b.opening_balance||'',daily_cash_limit:b.daily_cash_limit||'',is_active:String(b.is_active!==false),address:b.address||'',google_maps_url:b.google_maps_url||'',notes:b.notes||''});setStep(1);setPop('edit')}

const permModules=[...new Set(perms.map(p=>p.module))]

return<div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
<div>
<div style={{fontSize:20,fontWeight:700,color:'rgba(255,255,255,.93)'}}>الإدارة</div>
<div style={{fontSize:12,color:'var(--tx4)',marginTop:6}}>إدارة المكاتب والموظفين والأدوار والصلاحيات</div>
</div>
<button onClick={()=>{
if(tab==='branches')openAdd()
else if(tab==='bank_accounts'){setForm({_table:'bank_accounts',bank_name:'',account_name:'',account_number:'',iban:'',swift_code:'',account_type:'deposit',branch_id:'',is_primary:'false',is_active:'true',notes:''});setPop('add_bank')}
else if(tab==='users'){setForm({_table:'users',name_ar:'',name_en:'',email:'',phone:'',id_number:'',nationality:'',role_id:'',branch_id:'',is_active:'true',notes:''});setPop('add_user')}
else if(tab==='roles'){setForm({_table:'roles',name_ar:'',name_en:'',description:'',color:'',is_active:'true'});setPop('add_role')}
}} style={bS}>{{branches:'مكتب +',bank_accounts:'حساب بنكي +',users:'موظف +',roles:'دور +'}[tab]}</button>
</div>

{/* ═══ SHARED STATS CARDS ═══ */}
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:18}}>
{/* المكاتب */}
<div onClick={()=>{setTab('branches');setQ('');setFilterStatus('all');setFilterRegion('all')}} style={{padding:'14px 16px',borderRadius:12,background:'linear-gradient(145deg,rgba(28,24,16,.95),rgba(34,30,18,.95))',border:tab==='branches'?'1.5px solid rgba(201,168,76,.3)':'1px solid rgba(255,255,255,.06)',cursor:'pointer',transition:'.15s'}}>
<div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span style={{fontSize:11,fontWeight:600,color:'var(--tx3)'}}>المكاتب</span><span style={{width:6,height:6,borderRadius:'50%',background:C.gold}}/></div>
<div style={{fontSize:24,fontWeight:700,color:C.gold,lineHeight:1,marginBottom:8}}>{branches.length}</div>
<div style={{display:'flex',gap:8}}><span style={{fontSize:9,color:C.ok}}>{brActive} نشط</span><span style={{fontSize:9,color:C.red}}>{brInactive} معطّل</span></div>
</div>
{/* الحسابات البنكية */}
<div onClick={()=>{setTab('bank_accounts');setQ('');setFilterStatus('all')}} style={{padding:'14px 16px',borderRadius:12,background:'linear-gradient(145deg,rgba(16,18,28,.95),rgba(18,22,38,.95))',border:tab==='bank_accounts'?'1.5px solid rgba(52,131,180,.3)':'1px solid rgba(255,255,255,.06)',cursor:'pointer',transition:'.15s'}}>
<div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span style={{fontSize:11,fontWeight:600,color:'var(--tx3)'}}>الحسابات البنكية</span><span style={{width:6,height:6,borderRadius:'50%',background:C.blue}}/></div>
<div style={{fontSize:24,fontWeight:700,color:C.blue,lineHeight:1,marginBottom:8}}>{bankAccs.length}</div>
<div style={{display:'flex',gap:6,flexWrap:'wrap'}}><span style={{fontSize:9,color:C.ok}}>{baActive} نشط</span><span style={{fontSize:9,color:C.red}}>{baInactive} معطّل</span><span style={{fontSize:9,color:'var(--tx5)'}}>|</span><span style={{fontSize:9,color:C.gold}}>{baDeposit} إيداع</span><span style={{fontSize:9,color:C.blue}}>{baSadad} سداد</span><span style={{fontSize:9,color:C.ok}}>{baIntl} خارجي</span></div>
</div>
{/* الموظفين */}
<div onClick={()=>{setTab('users');setQ('');setFilterStatus('all')}} style={{padding:'14px 16px',borderRadius:12,background:'linear-gradient(145deg,rgba(20,28,20,.95),rgba(22,34,22,.95))',border:tab==='users'?'1.5px solid rgba(39,160,70,.3)':'1px solid rgba(255,255,255,.06)',cursor:'pointer',transition:'.15s'}}>
<div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span style={{fontSize:11,fontWeight:600,color:'var(--tx3)'}}>الموظفين</span><span style={{width:6,height:6,borderRadius:'50%',background:C.ok}}/></div>
<div style={{fontSize:24,fontWeight:700,color:C.ok,lineHeight:1,marginBottom:8}}>{totalUsers}</div>
<div style={{display:'flex',gap:8}}><span style={{fontSize:9,color:C.ok}}>{usActive} نشط</span><span style={{fontSize:9,color:C.red}}>{usInactive} معطّل</span></div>
</div>
{/* الأدوار */}
<div onClick={()=>{setTab('roles');setQ('');setFilterStatus('all')}} style={{padding:'14px 16px',borderRadius:12,background:'linear-gradient(145deg,rgba(28,16,28,.95),rgba(34,18,34,.95))',border:tab==='roles'?'1.5px solid rgba(160,100,200,.3)':'1px solid rgba(255,255,255,.06)',cursor:'pointer',transition:'.15s'}}>
<div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span style={{fontSize:11,fontWeight:600,color:'var(--tx3)'}}>الأدوار والصلاحيات</span><span style={{width:6,height:6,borderRadius:'50%',background:'#a064c8'}}/></div>
<div style={{fontSize:24,fontWeight:700,color:'#a064c8',lineHeight:1,marginBottom:8}}>{roles.length}</div>
<div style={{display:'flex',gap:8}}><span style={{fontSize:9,color:'var(--tx4)'}}>{perms.length} صلاحية</span></div>
</div>
</div>

<div style={{display:'flex',gap:0,marginBottom:16,borderBottom:'1px solid var(--bd)',overflowX:'auto',scrollbarWidth:'none'}}>
{[...tabs].map(t=><div key={t.id} onClick={()=>{setTab(t.id);setQ('');setFilterStatus('all');setFilterRegion('all')}} style={{padding:'10px 16px',fontSize:12,fontWeight:tab===t.id?700:500,color:tab===t.id?C.gold:'rgba(255,255,255,.42)',borderBottom:tab===t.id?'2px solid '+C.gold:'2px solid transparent',cursor:'pointer',transition:'.15s',whiteSpace:'nowrap',flexShrink:0}}>{t.l}</div>)}
</div>

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
{tab==='users'&&(()=>{const filtUsers=users.filter(u=>{
if(filterStatus==='active'&&!u.is_active)return false;if(filterStatus==='inactive'&&u.is_active)return false
if(filterRegion!=='all'&&u.branch_id!==filterRegion)return false
if(!q)return true;const s=q.toLowerCase();return(u.name_ar||'').includes(s)||(u.name_en||'').toLowerCase().includes(s)||(u.email||'').toLowerCase().includes(s)||(u.phone||'').includes(s)
});const roleClrs={'المدير العام':'#e8c547','مدير فرع':'#85B7EB','محاسب':'#AFA9EC','موظف استقبال':'#5DCAA5'};const roleCounts={};users.forEach(u=>{const rn=u.roles?.name_ar||'—';roleCounts[rn]=(roleCounts[rn]||0)+1});const taskCount=16;const usersWithTasks=2;return<>
{/* Stat cards for team page */}
{defaultTab==='users'&&<div style={{display:'grid',gridTemplateColumns:'auto 1fr 1fr auto',gap:12,marginBottom:20}}>
<div style={{padding:'16px 20px',borderRadius:14,background:'linear-gradient(135deg,rgba(39,160,70,.08),rgba(39,160,70,.02))',border:'1px solid rgba(39,160,70,.15)',minWidth:140,textAlign:'center'}}>
<div style={{fontSize:11,fontWeight:600,color:C.ok,marginBottom:8}}>الموظفين</div>
<div style={{fontSize:32,fontWeight:900,color:C.ok,lineHeight:1}}>{users.length}</div>
<div style={{fontSize:9,color:C.ok,opacity:.6,marginTop:6}}>{users.filter(u=>u.is_active).length} نشط · {users.filter(u=>!u.is_active).length} معطّل</div>
</div>
<div style={{padding:'16px 20px',borderRadius:14,background:'rgba(201,168,76,.04)',border:'1px solid rgba(201,168,76,.1)',textAlign:'center'}}>
<div style={{fontSize:11,fontWeight:600,color:C.gold,marginBottom:8}}>الأدوار</div>
<div style={{fontSize:32,fontWeight:900,color:C.gold,lineHeight:1}}>{roles.length}</div>
<div style={{fontSize:9,color:'var(--tx5)',marginTop:6}}>{roles.filter(r=>r.is_active).length} مستخدم · {roles.length-roles.filter(r=>r.is_active).length} فارغ</div>
</div>
<div style={{padding:'16px 20px',borderRadius:14,background:'rgba(52,131,180,.04)',border:'1px solid rgba(52,131,180,.1)'}}>
<div style={{fontSize:11,fontWeight:600,color:C.blue,marginBottom:10}}>توزيع الأدوار</div>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
{Object.entries(roleCounts).slice(0,4).map(([rn,cnt])=>{const rc=roleClrs[rn]||'#888';return<div key={rn} style={{display:'flex',alignItems:'center',gap:6}}><span style={{width:6,height:6,borderRadius:'50%',background:rc,flexShrink:0}}/><span style={{fontSize:10,color:'var(--tx3)',flex:1}}>{rn} ({cnt})</span></div>})}
</div></div>
<div style={{padding:'16px 20px',borderRadius:14,background:'rgba(230,126,34,.04)',border:'1px solid rgba(230,126,34,.1)',minWidth:140,textAlign:'center'}}>
<div style={{fontSize:11,fontWeight:600,color:'#e67e22',marginBottom:8}}>المهام النشطة</div>
<div style={{fontSize:32,fontWeight:900,color:'#e67e22',lineHeight:1}}>{taskCount}</div>
<div style={{fontSize:9,color:'#e67e22',opacity:.6,marginTop:6}}>{usersWithTasks} موظف عنده مهام</div>
</div>
</div>}
{/* Filters */}
<div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
<div style={{flex:1,minWidth:200,position:'relative'}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2" style={{position:'absolute',top:'50%',transform:'translateY(-50%)',right:14}}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
<input value={q} onChange={e=>setQ(e.target.value)} placeholder="بحث بالاسم، البريد، الجوال..." style={{...fS,textAlign:'right',paddingRight:38}}/>
</div>
<span style={{fontSize:10,color:'var(--tx5)'}}>الفرع:</span>
{[['all','الكل']].concat(branches.map(b=>[b.id,b.name_ar])).map(([k,l])=>
<div key={k} onClick={()=>setFilterRegion(k)} style={{padding:'6px 12px',borderRadius:8,fontSize:10,fontWeight:filterRegion===k?700:500,color:filterRegion===k?C.gold:'rgba(255,255,255,.4)',background:filterRegion===k?'rgba(201,168,76,.08)':'transparent',border:filterRegion===k?'1px solid rgba(201,168,76,.15)':'1px solid rgba(255,255,255,.06)',cursor:'pointer',whiteSpace:'nowrap',fontFamily:F}}>{l}</div>)}
<span style={{fontSize:10,color:'var(--tx5)',marginRight:6}}>الدور:</span>
{[['all','الكل']].concat(roles.map(r=>[r.id,r.name_ar])).map(([k,l])=>
<div key={k} onClick={()=>{if(k==='all')setFilterStatus('all');else setFilterStatus(k)}} style={{padding:'6px 12px',borderRadius:8,fontSize:10,fontWeight:filterStatus===k?700:500,color:filterStatus===k?C.gold:'rgba(255,255,255,.4)',background:filterStatus===k?'rgba(201,168,76,.08)':'transparent',border:filterStatus===k?'1px solid rgba(201,168,76,.15)':'1px solid rgba(255,255,255,.06)',cursor:'pointer',whiteSpace:'nowrap',fontFamily:F}}>{l}</div>)}
</div>
{/* Employee Cards Grid */}
{filtUsers.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)'}}>لا يوجد موظفين</div>:
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(380px,1fr))',gap:14}}>
{filtUsers.map(u=>{const br=branches.find(b=>b.id===u.branch_id);const rc=roleClrs[u.roles?.name_ar]||u.roles?.color||'#888';const yrs=u.experience_years||Math.max(0,new Date().getFullYear()-(u.hire_date?new Date(u.hire_date).getFullYear():new Date().getFullYear()));return<div key={u.id} onClick={()=>{setViewUser(u);setUserTab('data')}} style={{background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:14,overflow:'hidden',borderRight:'3px solid '+rc,cursor:'pointer',transition:'.15s'}} onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(201,168,76,.2)'} onMouseLeave={e=>e.currentTarget.style.borderColor='var(--bd)'}>
{/* Header */}
<div style={{padding:'14px 16px',display:'flex',gap:12,alignItems:'flex-start'}}>
<div style={{width:44,height:44,borderRadius:12,background:rc+'15',border:'1px solid '+rc+'25',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:rc,flexShrink:0}}>{(u.name_ar||'?')[0]}</div>
<div style={{flex:1,minWidth:0}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}><span style={{fontSize:14,fontWeight:700,color:'var(--tx)'}}>{u.name_ar}</span>{u.roles&&<span style={{fontSize:8,padding:'2px 7px',borderRadius:4,background:rc+'15',color:rc,fontWeight:700}}>{u.roles.name_ar}</span>}{u.is_super_admin&&<span style={{fontSize:8,padding:'2px 6px',borderRadius:4,background:'rgba(201,168,76,.1)',color:C.gold,fontWeight:700}}>نظامي</span>}</div>
{u.name_en&&<div style={{fontSize:10,color:'var(--tx5)',direction:'ltr',marginBottom:4}}>{u.name_en}</div>}
<div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
{u.is_all_branches?<span style={{fontSize:8,padding:'2px 7px',borderRadius:4,background:'rgba(201,168,76,.06)',border:'1px solid rgba(201,168,76,.08)',color:'rgba(201,168,76,.7)',fontWeight:600}}>كل الفروع</span>:br&&<span style={{fontSize:8,padding:'2px 7px',borderRadius:4,background:'rgba(52,131,180,.06)',border:'1px solid rgba(52,131,180,.08)',color:'rgba(52,131,180,.7)',fontWeight:600}}>{br.name_ar}</span>}
</div>
</div>
<div style={{display:'flex',gap:4,flexShrink:0}}>
<button onClick={()=>{setForm({_table:'users',_id:u.id,name_ar:u.name_ar||'',name_en:u.name_en||'',email:u.email||'',phone:u.phone||'',id_number:u.id_number||'',nationality:u.nationality||'',role_id:u.role_id||'',branch_id:u.branch_id||'',is_active:String(u.is_active!==false),notes:u.notes||''});setPop('edit_user')}} style={{width:28,height:28,borderRadius:7,border:'1px solid rgba(201,168,76,.15)',background:'rgba(201,168,76,.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg></button>
</div>
</div>
{/* 4 Indicators */}
<div style={{display:'flex',borderTop:'1px solid rgba(255,255,255,.04)',background:'rgba(255,255,255,.01)'}}>
{[[0,'مهمة نشطة','#e67e22'],[yrs,'سنة خبرة',C.blue],[0,'لغة','#9b59b6'],[0,'تخصص',C.gold]].map(([v,l,c],i)=><div key={i} style={{flex:1,padding:'8px 6px',textAlign:'center',borderLeft:i>0?'1px solid rgba(255,255,255,.03)':'none'}}>
<div style={{fontSize:16,fontWeight:800,color:v>0?c:'var(--tx5)',lineHeight:1}}>{v}</div>
<div style={{fontSize:7,fontWeight:600,color:v>0?c:'var(--tx6)',marginTop:3}}>{l}</div>
</div>)}
</div>
{/* Footer */}
<div style={{padding:'6px 14px',borderTop:'1px solid rgba(255,255,255,.03)',display:'flex',justifyContent:'space-between',background:'rgba(255,255,255,.015)'}}>
<span style={{fontSize:9,color:'var(--tx5)'}}>تعيين: {u.hire_date||'—'}</span>
<span style={{fontSize:9,color:'var(--tx5)'}}>آخر دخول: {u.last_login_at?String(u.last_login_at).slice(0,10):'—'}</span>
</div>
</div>})}
</div>}
</>})()}

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
const weekdayList=lLists.find(l=>l.list_key==='weekdays')
const allDays=weekdayList?lItems.filter(i=>i.list_id===weekdayList.id).map(i=>i.value_ar):['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']
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

{/* ═══ ADD/EDIT USER POPUP ═══ */}
{(pop==='add_user'||pop==='edit_user')&&<div onClick={()=>setPop(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:520,maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.4)',border:'1px solid var(--bd)'}}>
<div style={{height:3,background:'linear-gradient(90deg,transparent,'+C.gold+' 30%,#dcc06e 50%,'+C.gold+' 70%,transparent)',flexShrink:0}}/>
<div style={{background:'var(--bg)',padding:'16px 22px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
<div style={{fontSize:15,fontWeight:700,color:'var(--tx)'}}>{pop==='add_user'?'إضافة موظف':'تعديل موظف'}</div>
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
<button onClick={saveForm} disabled={saving} style={{...bS,height:42,minWidth:130,opacity:saving?.6:1}}>{saving?'...':(form._id?'حفظ':'إضافة')}</button>
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

{/* DELETE POPUP */}
{delTarget&&<DeletePopup itemName={delTarget.name} onConfirm={confirmDel} onCancel={()=>setDelTarget(null)}/>}
</div>}
