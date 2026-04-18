import React, { useState, useEffect, useCallback, useMemo } from 'react'

const C = { gold:'#D4A017', gl:'#dcc06e', red:'#c0392b', blue:'#3483b4', ok:'#27a046', purple:'#9b59b6', orange:'#e67e22' }
const F = "'Cairo','Tajawal',sans-serif"

export default function TasksPage({ sb, toast, user, lang, defaultFilter }) {
  const T = (a, e) => lang === 'ar' ? a : e
  const isAr = lang !== 'en'

  // ═══ STATE ═══
  const [tasks, setTasks] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [facilities, setFacilities] = useState([])
  const [branches, setBranches] = useState([])
  const [services, setServices] = useState([])
  
  // Filters
  const [filter, setFilter] = useState('all')
  const [catFilter, setCatFilter] = useState('all')
  const [typeTab, setTypeTab] = useState(defaultFilter === 'periodic' ? 'recurring' : defaultFilter === 'regular' ? 'adhoc' : 'all')
  const [searchQ, setSearchQ] = useState('')
  
  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [createStep, setCreateStep] = useState(1) // 1-5
  const [createForm, setCreateForm] = useState({
    title: '', description: '', category: 'general', priority: 'normal', task_type: 'adhoc',
    due_date: new Date().toISOString().slice(0, 10), facility_id: '', sub_service_id: '',
    distribution_method: 'manual', // manual | ai | equal
    assigned_to: '', assignees: [], branches_list: [], partners: [],
    attachments: [],
  })
  const [createBusy, setCreateBusy] = useState(false)

  // Detail view
  const [selectedTask, setSelectedTask] = useState(null)
  const [detailTab, setDetailTab] = useState('info')
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [assignees, setAssignees] = useState([])
  const [taskBranches, setTaskBranches] = useState([])
  const [taskPartners, setTaskPartners] = useState([])
  const [taskAttachments, setTaskAttachments] = useState([]);const [taskTxns, setTaskTxns] = useState([])

  // ═══ LOAD ═══
  const load = useCallback(async () => {
    setLoading(true)
    const [t, tmpl, u, fac, br, svc] = await Promise.all([
      sb.from('tasks').select('*, assigned:assigned_to(name_ar,name_en), branch:branch_id(name_ar)').order('due_date').order('priority'),
      sb.from('task_templates').select('*').eq('is_active', true).order('recurrence').order('title_ar'),
      sb.from('users').select('id,name_ar,name_en').is('deleted_at', null),
      sb.from('facilities').select('id,name_ar'),
      sb.from('branches').select('id,name_ar'),
      sb.from('sub_services').select('id,name_ar,code,platform_code').eq('is_active', true),
    ])
    setTasks(t.data || [])
    setTemplates(tmpl.data || [])
    setUsers(u.data || [])
    setFacilities(fac.data || [])
    setBranches(br.data || [])
    setServices(svc.data || [])
    setLoading(false)
  }, [sb])

  useEffect(() => { load() }, [load])

  // Load task detail
  const loadDetail = async (task) => {
    setSelectedTask(task)
    setDetailTab('info')
    const [cm, as, tb, tp, ta] = await Promise.all([
      sb.from('task_comments').select('*, user:user_id(name_ar)').eq('task_id', task.id).order('created_at'),
      sb.from('task_assignees').select('*, user:user_id(name_ar), branch:branch_id(name_ar)').eq('task_id', task.id),
      sb.from('task_branches').select('*, branch:branch_id(name_ar)').eq('task_id', task.id),
      sb.from('task_partners').select('*').eq('task_id', task.id),
      sb.from('task_attachments').select('*').eq('task_id', task.id),
    ])
    setComments(cm.data || [])
    setAssignees(as.data || [])
    setTaskBranches(tb.data || [])
    setTaskPartners(tp.data || [])
    setTaskAttachments(ta.data || [])
    // Load linked transactions
    sb.from('v_transaction_sla').select('*').eq('branch_id', task.branch_id).is('deleted_at', null).limit(20).then(({data})=>setTaskTxns(data||[]))
  }

  // ═══ ACTIONS ═══
  const complete = async (id) => {
    await sb.from('tasks').update({ status: 'completed', completed_date: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString() }).eq('id', id)
    toast(T('تم الإنجاز ✓', 'Completed ✓'))
    load()
  }

  const skip = async (id) => {
    await sb.from('tasks').update({ status: 'skipped', updated_at: new Date().toISOString() }).eq('id', id)
    toast(T('تم التخطي', 'Skipped'))
    load()
  }

  const assign = async (id, uid) => {
    await sb.from('tasks').update({ assigned_to: uid || null, updated_at: new Date().toISOString() }).eq('id', id)
    load()
  }

  const addComment = async () => {
    if (!newComment.trim() || !selectedTask) return
    await sb.from('task_comments').insert({ task_id: selectedTask.id, user_id: user?.id, body: newComment, comment_type: 'comment' })
    setNewComment('')
    loadDetail(selectedTask)
  }

  // ═══ CREATE TASK ═══
  const saveTask = async () => {
    setCreateBusy(true)
    try {
      const { data: newTask } = await sb.from('tasks').insert({
        title_ar: createForm.title || T('مهمة جديدة', 'New Task'),
        description: createForm.description || null,
        category: createForm.category,
        priority: createForm.priority,
        task_type: createForm.task_type,
        status: 'pending',
        due_date: createForm.due_date,
        assigned_to: createForm.assigned_to || null,
        facility_id: createForm.facility_id || null,
        sub_service_id: createForm.sub_service_id || null,
        distribution_method: createForm.distribution_method,
        created_by: user?.id,
      }).select().single()

      if (newTask) {
        // Save branches
        if (createForm.branches_list.length > 0) {
          await sb.from('task_branches').insert(createForm.branches_list.map(b => ({
            task_id: newTask.id, branch_id: b.branch_id, transaction_count: b.count || 0,
          })))
        }
        // Save assignees
        if (createForm.assignees.length > 0) {
          await sb.from('task_assignees').insert(createForm.assignees.map(a => ({
            task_id: newTask.id, user_id: a.user_id, branch_id: a.branch_id || null,
            transaction_count: a.count || 0, role: a.role || 'executor',
          })))
        }
        // Save partners
        if (createForm.partners.length > 0) {
          await sb.from('task_partners').insert(createForm.partners.map(p => ({
            task_id: newTask.id, partner_name: p.name, id_number: p.id_number || null,
            phone: p.phone || null, role: p.role || 'partner',
          })))
        }
      }

      toast(T('تم إنشاء المهمة ✓', 'Task created ✓'))
      setShowCreate(false)
      setCreateStep(1)
      setCreateForm({ title: '', description: '', category: 'general', priority: 'normal', task_type: 'adhoc', due_date: new Date().toISOString().slice(0, 10), facility_id: '', sub_service_id: '', distribution_method: 'manual', assigned_to: '', assignees: [], branches_list: [], partners: [], attachments: [] })
      load()
    } catch (e) {
      toast(T('خطأ', 'Error'))
    }
    setCreateBusy(false)
  }

  // ═══ FILTER ═══
  const cats = [
    { v: 'all', l: T('الكل', 'All'), c: '#999' },
    { v: 'nitaqat', l: T('نطاقات', 'Nitaqat'), c: C.gold },
    { v: 'workers', l: T('عمالة', 'Workers'), c: C.blue },
    { v: 'finance', l: T('مالية', 'Finance'), c: C.ok },
    { v: 'facilities', l: T('منشآت', 'Facilities'), c: C.orange },
    { v: 'platforms', l: T('منصات', 'Platforms'), c: C.purple },
    { v: 'reports', l: T('تقارير', 'Reports'), c: '#1abc9c' },
    { v: 'general', l: T('عامة', 'General'), c: '#888' },
  ]

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (filter !== 'all' && t.status !== filter) return false
      if (catFilter !== 'all' && t.category !== catFilter) return false
      if (typeTab !== 'all' && t.task_type !== typeTab) return false
      if (searchQ && !(t.title_ar || '').includes(searchQ) && !(t.description || '').includes(searchQ)) return false
      return true
    })
  }, [tasks, filter, catFilter, typeTab, searchQ])

  const stats = useMemo(() => ({
    pending: tasks.filter(t => t.status === 'pending').length,
    overdue: tasks.filter(t => t.status === 'overdue').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    today: tasks.filter(t => t.due_date === new Date().toISOString().slice(0, 10) && !['completed', 'skipped'].includes(t.status)).length,
    recurring: tasks.filter(t => t.task_type === 'recurring').length,
    adhoc: tasks.filter(t => t.task_type === 'adhoc').length,
  }), [tasks])

  // ═══ STYLES ═══
  const inputS = { width: '100%', height: 42, padding: '0 14px', border: '1.5px solid rgba(255,255,255,.1)', borderRadius: 10, fontFamily: F, fontSize: 13, fontWeight: 600, color: 'var(--tx)', background: 'rgba(255,255,255,.04)', outline: 'none', boxSizing: 'border-box' }
  const labelS = { fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.55)', marginBottom: 5, display: 'block' }
  const selectS = { ...inputS, appearance: 'none', cursor: 'pointer' }
  const btnGold = { height: 40, padding: '0 24px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${C.gold}, ${C.gl})`, color: '#111', fontFamily: F, fontSize: 13, fontWeight: 800, cursor: 'pointer' }
  const fBtnS = (a) => ({ padding: '5px 12px', borderRadius: 6, fontSize: 10, fontWeight: a ? 700 : 500, color: a ? C.gold : 'rgba(255,255,255,.4)', background: a ? 'rgba(212,160,23,.08)' : 'transparent', border: a ? '1px solid rgba(212,160,23,.15)' : '1px solid rgba(255,255,255,.06)', cursor: 'pointer' })
  const stClr = { pending: C.gold, in_progress: C.blue, completed: C.ok, overdue: C.red, skipped: '#888' }
  const priClr = { high: C.red, urgent: C.red, normal: C.gold, low: '#888' }

  // ═══ DETAIL VIEW ═══
  /* ═══ TASK DETAIL — SIDE PANEL ═══ */
  const renderDetailPanel = () => {
    if (!selectedTask) return null
    const t = selectedTask
    const sc = stClr[t.status] || '#888'
    const pc = priClr[t.priority] || C.gold
    const catObj = cats.find(c => c.v === t.category)
    const daysLeft = Math.ceil((new Date(t.due_date) - new Date()) / 86400000)
    const progressPct = t.total_transactions > 0 ? Math.round((t.completed_transactions || 0) / t.total_transactions * 100) : t.status === 'completed' ? 100 : t.status === 'in_progress' ? 50 : t.status === 'overdue' ? 30 : 10
    const brName = t.branch?.name_ar || branches.find(b => b.id === t.branch_id)?.name_ar
    const entityName = t.entity_type === 'facility' ? facilities.find(f => f.id === t.entity_id)?.name_ar : ''
    const stLabel = {pending:T('معلّقة','Pending'),in_progress:T('قيد التنفيذ','In Progress'),completed:T('مكتملة','Done'),overdue:T('متأخرة','Overdue'),skipped:T('مُتخطاة','Skipped')}
    const priLabel = {urgent:T('عاجل','Urgent'),high:T('عالي','High'),normal:T('عادي','Normal'),low:T('منخفض','Low')}

    return <div onClick={()=>setSelectedTask(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:16}}>
    <div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(900px,96vw)',height:'min(620px,90vh)',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.5)',border:'1px solid rgba(212,160,23,.12)',fontFamily:F,direction:isAr?'rtl':'ltr'}}>
      {/* Header */}
      <div style={{padding:'18px 22px',borderBottom:'1px solid rgba(212,160,23,.1)',flexShrink:0,background:'var(--bg)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:800,color:'var(--tx)',marginBottom:6}}>{t.title_ar}</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              <span style={{fontSize:9,padding:'3px 10px',borderRadius:6,background:sc+'12',color:sc,fontWeight:700}}>{stLabel[t.status]||t.status}</span>
              <span style={{fontSize:9,padding:'3px 10px',borderRadius:6,background:pc+'12',color:pc,fontWeight:700}}>{priLabel[t.priority]||t.priority}</span>
              {catObj&&catObj.v!=='all'&&<span style={{fontSize:9,padding:'3px 10px',borderRadius:6,background:catObj.c+'12',color:catObj.c}}>{catObj.l}</span>}
              <span style={{fontSize:9,padding:'3px 10px',borderRadius:6,background:'rgba(255,255,255,.06)',color:'var(--tx4)'}}>{t.task_type==='recurring'?T('دورية','Recurring'):T('اعتيادية','Regular')}</span>
            </div>
          </div>
          <button onClick={()=>setSelectedTask(null)} style={{width:32,height:32,borderRadius:10,background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button>
        </div>
        {t.description&&<div style={{fontSize:11,color:'var(--tx4)',marginBottom:10,lineHeight:1.6}}>{t.description}</div>}
        {/* Progress */}
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
          <div style={{flex:1,height:5,borderRadius:3,background:'rgba(255,255,255,.06)',overflow:'hidden'}}><div style={{height:'100%',width:progressPct+'%',background:progressPct===100?C.ok:sc,borderRadius:3,transition:'.3s'}}/></div>
          <span style={{fontSize:10,fontWeight:700,color:progressPct===100?C.ok:sc}}>{progressPct}%</span>
        </div>
        {/* Meta grid */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
          {[[T('الاستحقاق','Due'),t.due_date?new Date(t.due_date).toLocaleDateString('ar-SA',{month:'short',day:'numeric'}):'—',daysLeft<0?C.red:daysLeft===0?C.gold:'var(--tx3)'],
          [T('المكلّف','Assignee'),t.assigned?.name_ar||T('غير معيّن','—'),C.blue],
          [T('الفرع','Branch'),brName||'—','#9b59b6']
          ].map(([l,v,c],i)=><div key={i} style={{background:'rgba(255,255,255,.03)',borderRadius:8,padding:'8px 10px'}}>
            <div style={{fontSize:8,color:'var(--tx5)',marginBottom:2}}>{l}</div>
            <div style={{fontSize:11,fontWeight:700,color:c}}>{v}</div>
          </div>)}
        </div>
        {/* Quick info chips */}
        <div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>
          {entityName&&<span style={{fontSize:9,padding:'3px 8px',borderRadius:6,background:C.gold+'08',border:'1px solid '+C.gold+'15',color:C.gold}}>🏢 {entityName}</span>}
          {t.total_transactions>0&&<span style={{fontSize:9,padding:'3px 8px',borderRadius:6,background:C.ok+'08',border:'1px solid '+C.ok+'15',color:C.ok}}>📋 {t.completed_transactions||0}/{t.total_transactions} {T('معاملة','txn')}</span>}
          {daysLeft<0&&t.status!=='completed'&&<span style={{fontSize:9,padding:'3px 8px',borderRadius:6,background:C.red+'12',color:C.red,fontWeight:700}}>⚠ {T('متأخرة','Late')} {Math.abs(daysLeft)}{T('ي','d')}</span>}
        </div>
        {/* Actions */}
        {t.status!=='completed'&&t.status!=='skipped'&&<div style={{display:'flex',gap:8,marginTop:12}}>
          <button onClick={()=>{complete(t.id);setSelectedTask(null)}} style={{...btnGold,height:34,fontSize:11,flex:1}}>{T('إنجاز ✓','Complete ✓')}</button>
          <button onClick={()=>{skip(t.id);setSelectedTask(null)}} style={{height:34,padding:'0 16px',borderRadius:8,border:'1px solid rgba(255,255,255,.1)',background:'transparent',color:'var(--tx4)',fontFamily:F,fontSize:11,fontWeight:600,cursor:'pointer'}}>{T('تخطي','Skip')}</button>
        </div>}
      </div>
      {/* Content with sidebar tabs — like transactions */}
      <div style={{flex:1,display:'flex',overflow:'hidden'}}>
        {/* Sidebar tabs */}
        <div style={{width:130,background:'var(--bg)',borderLeft:isAr?'none':'1px solid rgba(255,255,255,.04)',borderRight:isAr?'1px solid rgba(255,255,255,.04)':'none',padding:'12px 8px',flexShrink:0}}>
          {[{v:'info',l:T('التفاصيل','Details'),icon:'📋'},{v:'team',l:T('الفريق','Team'),n:assignees.length,icon:'👥'},{v:'comments',l:T('التعليقات','Comments'),n:comments.length,icon:'💬'},{v:'attachments',l:T('المرفقات','Files'),n:taskAttachments.length,icon:'📎'},{v:'transactions',l:T('المعاملات','Txns'),n:taskTxns.length,icon:'📊'}].map(tab=>
            <div key={tab.v} onClick={()=>setDetailTab(tab.v)} style={{padding:'10px 10px',borderRadius:8,marginBottom:3,fontSize:10,fontWeight:detailTab===tab.v?700:500,color:detailTab===tab.v?C.gold:'rgba(255,255,255,.38)',background:detailTab===tab.v?'rgba(212,160,23,.08)':'transparent',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',gap:4}}>
              <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{fontSize:12}}>{tab.icon}</span>{tab.l}</span>
              {tab.n!==undefined&&tab.n>0&&<span style={{fontSize:9,fontWeight:700,color:detailTab===tab.v?C.gold:'rgba(255,255,255,.2)',background:detailTab===tab.v?'rgba(212,160,23,.15)':'rgba(255,255,255,.04)',padding:'1px 6px',borderRadius:4}}>{tab.n}</span>}
            </div>)}
        </div>
        {/* Tab content */}
        <div className="dash-content" style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>
        {detailTab==='info'&&<div style={{display:'flex',flexDirection:'column',gap:12}}>
          {/* Dates */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <div style={{background:'rgba(255,255,255,.03)',borderRadius:10,padding:'10px 12px',border:'1px solid rgba(255,255,255,.04)'}}>
              <div style={{fontSize:9,color:'var(--tx5)',marginBottom:4}}>📅 {T('تاريخ الإنشاء','Created')}</div>
              <div style={{fontSize:11,fontWeight:600,color:'var(--tx3)'}}>{t.created_at?new Date(t.created_at).toLocaleDateString('ar-SA',{year:'numeric',month:'short',day:'numeric'}):'—'}</div>
            </div>
            <div style={{background:'rgba(255,255,255,.03)',borderRadius:10,padding:'10px 12px',border:'1px solid rgba(255,255,255,.04)'}}>
              <div style={{fontSize:9,color:'var(--tx5)',marginBottom:4}}>⏰ {T('تاريخ الاستحقاق','Due Date')}</div>
              <div style={{fontSize:11,fontWeight:600,color:daysLeft<0?C.red:C.gold}}>{t.due_date?new Date(t.due_date).toLocaleDateString('ar-SA',{year:'numeric',month:'short',day:'numeric'}):'—'}</div>
            </div>
          </div>
          {t.completed_date&&<div style={{background:'rgba(39,160,70,.04)',borderRadius:10,padding:'10px 12px',border:'1px solid rgba(39,160,70,.1)'}}>
            <div style={{fontSize:9,color:C.ok,marginBottom:4}}>✅ {T('تاريخ الإنجاز','Completed')}</div>
            <div style={{fontSize:11,fontWeight:600,color:C.ok}}>{new Date(t.completed_date).toLocaleDateString('ar-SA',{year:'numeric',month:'short',day:'numeric'})}</div>
          </div>}
          {/* Result notes */}
          {t.result_notes&&<div style={{background:'rgba(255,255,255,.03)',borderRadius:10,padding:'12px 14px',border:'1px solid rgba(255,255,255,.04)'}}>
            <div style={{fontSize:10,fontWeight:600,color:'var(--tx4)',marginBottom:6}}>{T('نتيجة التنفيذ','Result Notes')}</div>
            <div style={{fontSize:12,color:'var(--tx3)',lineHeight:1.8}}>{t.result_notes}</div>
          </div>}
          {/* Branches */}
          {taskBranches.length>0&&<div style={{background:'rgba(255,255,255,.03)',borderRadius:10,padding:'12px 14px',border:'1px solid rgba(255,255,255,.04)'}}>
            <div style={{fontSize:10,fontWeight:600,color:'var(--tx4)',marginBottom:8}}>{T('الفروع المرتبطة','Branches')}</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{taskBranches.map(b=><span key={b.id} style={{fontSize:10,padding:'4px 10px',borderRadius:6,background:'rgba(155,89,182,.08)',color:'#9b59b6',border:'1px solid rgba(155,89,182,.15)'}}>{b.branch?.name_ar} {b.transaction_count?`(${b.transaction_count})`:''}</span>)}</div>
          </div>}
          {/* Partners */}
          {taskPartners.length>0&&<div style={{background:'rgba(255,255,255,.03)',borderRadius:10,padding:'12px 14px',border:'1px solid rgba(255,255,255,.04)'}}>
            <div style={{fontSize:10,fontWeight:600,color:'var(--tx4)',marginBottom:8}}>{T('الملاك/الشركاء','Partners')}</div>
            {taskPartners.map(p=><div key={p.id} style={{fontSize:11,color:'var(--tx3)',padding:'4px 0'}}>{p.partner_name} {p.id_number&&<span style={{fontSize:10,color:'var(--tx5)'}}>({p.id_number})</span>}</div>)}
          </div>}
          {/* Empty state if nothing */}
          {!t.result_notes&&taskBranches.length===0&&taskPartners.length===0&&!t.completed_date&&<div style={{textAlign:'center',padding:'20px 0',color:'var(--tx5)',fontSize:11}}>{T('بيانات المهمة الأساسية معروضة في الأعلى','Basic task info is shown in the header above')}</div>}
        </div>}

        {detailTab==='team'&&<div>
          {assignees.length===0?<div style={{textAlign:'center',padding:40}}>
            <div style={{fontSize:32,marginBottom:8}}>👥</div>
            <div style={{fontSize:12,color:'var(--tx5)'}}>{T('لا يوجد فريق معيّن','No team assigned')}</div>
            <div style={{fontSize:10,color:'var(--tx6)',marginTop:4}}>{T('المكلّف الحالي:','Current assignee:')} <span style={{color:C.blue}}>{t.assigned?.name_ar||'—'}</span></div>
          </div>:assignees.map(a=><div key={a.id} style={{padding:'12px 14px',borderRadius:10,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',marginBottom:6,display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:36,height:36,borderRadius:10,background:C.blue+'12',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:C.blue}}>{(a.user?.name_ar||'?')[0]}</div>
            <div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:'var(--tx2)'}}>{a.user?.name_ar}</div><div style={{fontSize:10,color:'var(--tx5)'}}>{a.branch?.name_ar||''}{a.role?' — '+a.role:''}</div></div>
            {a.transaction_count>0&&<div style={{textAlign:'center'}}><div style={{fontSize:14,fontWeight:800,color:C.gold}}>{a.transaction_count}</div><div style={{fontSize:8,color:'var(--tx5)'}}>{T('معاملة','txn')}</div></div>}
          </div>)}
        </div>}

        {detailTab==='comments'&&<div>
          {comments.length===0&&<div style={{textAlign:'center',padding:'20px 0',color:'var(--tx6)',fontSize:11,marginBottom:12}}>{T('لا توجد تعليقات بعد','No comments yet')}</div>}
          {comments.map(c=><div key={c.id} style={{padding:'10px 14px',borderRadius:10,background:c.comment_type==='system'?'rgba(212,160,23,.04)':'rgba(255,255,255,.02)',border:'1px solid var(--bd)',marginBottom:6}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
              <span style={{fontSize:11,fontWeight:700,color:c.comment_type==='system'?C.gold:C.blue}}>{c.user?.name_ar||T('النظام','System')}</span>
              <span style={{fontSize:9,color:'var(--tx5)'}}>{new Date(c.created_at).toLocaleDateString('ar-SA',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
            </div>
            <div style={{fontSize:12,color:'var(--tx3)',lineHeight:1.6}}>{c.body}</div>
          </div>)}
          <div style={{display:'flex',gap:8,marginTop:8}}>
            <input type="text" value={newComment} onChange={e=>setNewComment(e.target.value)} placeholder={T('اكتب تعليق...','Write a comment...')} onKeyDown={e=>e.key==='Enter'&&addComment()} style={{...inputS,flex:1,height:38}}/>
            <button onClick={addComment} style={{...btnGold,height:38,padding:'0 18px',fontSize:11}}>{T('إرسال','Send')}</button>
          </div>
        </div>}

        {detailTab==='attachments'&&<div>
          {taskAttachments.length===0?<div style={{textAlign:'center',padding:40}}>
            <div style={{fontSize:32,marginBottom:8}}>📎</div>
            <div style={{fontSize:12,color:'var(--tx5)'}}>{T('لا توجد مرفقات','No attachments')}</div>
          </div>:taskAttachments.map(a=><div key={a.id} style={{padding:'10px 14px',borderRadius:10,border:'1px solid var(--bd)',marginBottom:6,display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:32,height:32,borderRadius:8,background:C.gold+'12',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>📄</div>
            <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:'var(--tx2)'}}>{a.file_name}</div><div style={{fontSize:9,color:'var(--tx5)'}}>{a.created_at?.slice(0,10)}</div></div>
          </div>)}
        </div>}

        {detailTab==='transactions'&&<div>
          {taskTxns.length===0?<div style={{textAlign:'center',padding:40}}>
            <div style={{fontSize:32,marginBottom:8}}>📊</div>
            <div style={{fontSize:12,color:'var(--tx5)'}}>{T('لا توجد معاملات مرتبطة','No linked transactions')}</div>
          </div>:taskTxns.map(txn=>{const slaC={on_time:C.ok,warning:'#e67e22',critical:C.red,overdue:C.red}[txn.sla_status]||'#999';const stC={completed:C.ok,in_progress:C.blue,pending:C.gold,issue:C.red}[txn.status]||'#999'
          return<div key={txn.id} style={{padding:'10px 14px',borderRadius:10,border:'1px solid var(--bd)',marginBottom:6,display:'flex',alignItems:'center',gap:10,background:txn.status==='issue'?'rgba(192,57,43,.03)':'rgba(255,255,255,.02)'}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:stC,flexShrink:0}}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}><span style={{fontSize:11,fontWeight:700,color:C.gold,direction:'ltr'}}>{txn.transaction_number}</span><span style={{fontSize:8,padding:'1px 5px',borderRadius:4,background:(txn.service_color||C.gold)+'12',color:txn.service_color||C.gold}}>{isAr?txn.service_name_ar:txn.service_name_en}</span></div>
              <div style={{fontSize:10,color:'var(--tx5)'}}>{txn.client_name||''}{txn.facility_name?' · '+txn.facility_name:''}</div>
            </div>
            {txn.total_steps>0&&<div style={{display:'flex',alignItems:'center',gap:4,flexShrink:0}}><div style={{width:40,height:3,borderRadius:2,background:'rgba(255,255,255,.06)',overflow:'hidden'}}><div style={{height:'100%',width:(txn.steps_pct||0)+'%',borderRadius:2,background:txn.steps_pct>=100?C.ok:C.gold}}/></div><span style={{fontSize:8,color:'var(--tx5)'}}>{txn.steps_pct||0}%</span></div>}
            {txn.days_remaining!=null&&<div style={{fontSize:10,fontWeight:700,color:slaC,flexShrink:0}}>{txn.days_remaining<0?txn.days_remaining:'+'+txn.days_remaining}{T('ي','d')}</div>}
          </div>})}
        </div>}
      </div>
    </div>
    </div>
    </div>
  }

  // ═══ CREATE MODAL ═══
  const renderCreateModal = () => {
    if (!showCreate) return null
    const stepTitles = [
      T('البيانات الأساسية', 'Basic Info'),
      T('المنشأة والخدمة', 'Facility & Service'),
      T('الملاك والشركاء', 'Partners'),
      T('التوزيع والتكليف', 'Distribution'),
      T('المرفقات', 'Attachments'),
    ]

    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(8px)' }}
        onClick={e => { if (e.target === e.currentTarget) setShowCreate(false) }}>
        <div style={{ width: 'min(560px, 94vw)', maxHeight: '85vh', background: 'var(--sf)', borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid var(--bd)' }}>
          {/* Header */}
          <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--tx)' }}>{T('إنشاء مهمة جديدة', 'Create New Task')}</div>
              <div onClick={() => setShowCreate(false)} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--tx5)' }}>✕</div>
            </div>
            {/* Step indicators */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
              {stepTitles.map((title, i) => (
                <div key={i} onClick={() => setCreateStep(i + 1)} style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}>
                  <div style={{ height: 3, borderRadius: 2, background: i + 1 <= createStep ? C.gold : 'rgba(255,255,255,.08)', marginBottom: 4, transition: '.2s' }} />
                  <div style={{ fontSize: 9, fontWeight: i + 1 === createStep ? 700 : 500, color: i + 1 === createStep ? C.gold : 'var(--tx5)' }}>{title}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1 }}>
            {createStep === 1 && (
              <div style={{ display: 'grid', gap: 14 }}>
                <div><label style={labelS}>{T('عنوان المهمة', 'Title')} <span style={{ color: C.red }}>*</span></label>
                  <input type="text" value={createForm.title} onChange={e => setCreateForm(p => ({ ...p, title: e.target.value }))} placeholder={T('مثال: تجديد إقامات فرع الدمام', 'e.g. Renew Dammam branch iqamas')} style={inputS} /></div>
                <div><label style={labelS}>{T('الوصف', 'Description')}</label>
                  <textarea value={createForm.description} onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))} rows={3} style={{ ...inputS, height: 'auto', padding: '10px 14px' }} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={labelS}>{T('التصنيف', 'Category')}</label>
                    <select value={createForm.category} onChange={e => setCreateForm(p => ({ ...p, category: e.target.value }))} style={selectS}>
                      {cats.filter(c => c.v !== 'all').map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
                    </select></div>
                  <div><label style={labelS}>{T('الأولوية', 'Priority')}</label>
                    <select value={createForm.priority} onChange={e => setCreateForm(p => ({ ...p, priority: e.target.value }))} style={selectS}>
                      {[{ v: 'low', l: T('منخفضة', 'Low') }, { v: 'normal', l: T('عادية', 'Normal') }, { v: 'high', l: T('عالية', 'High') }, { v: 'urgent', l: T('عاجلة', 'Urgent') }].map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
                    </select></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={labelS}>{T('النوع', 'Type')}</label>
                    <select value={createForm.task_type} onChange={e => setCreateForm(p => ({ ...p, task_type: e.target.value }))} style={selectS}>
                      <option value="adhoc">{T('طارئة', 'Ad-hoc')}</option>
                      <option value="recurring">{T('دورية', 'Recurring')}</option>
                    </select></div>
                  <div><label style={labelS}>{T('تاريخ الاستحقاق', 'Due Date')}</label>
                    <input type="date" value={createForm.due_date} onChange={e => setCreateForm(p => ({ ...p, due_date: e.target.value }))} style={inputS} /></div>
                </div>
              </div>
            )}

            {createStep === 2 && (
              <div style={{ display: 'grid', gap: 14 }}>
                <div><label style={labelS}>{T('المنشأة', 'Facility')}</label>
                  <select value={createForm.facility_id} onChange={e => setCreateForm(p => ({ ...p, facility_id: e.target.value }))} style={selectS}>
                    <option value="">{T('اختر المنشأة...', 'Select facility...')}</option>
                    {facilities.map(f => <option key={f.id} value={f.id}>{f.name_ar}</option>)}
                  </select></div>
                <div><label style={labelS}>{T('الخدمة', 'Service')}</label>
                  <select value={createForm.sub_service_id} onChange={e => setCreateForm(p => ({ ...p, sub_service_id: e.target.value }))} style={selectS}>
                    <option value="">{T('اختر الخدمة...', 'Select service...')}</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name_ar} ({s.code})</option>)}
                  </select></div>
                <div><label style={labelS}>{T('الفروع', 'Branches')}</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {branches.map(b => {
                      const sel = createForm.branches_list.some(x => x.branch_id === b.id)
                      return <div key={b.id} onClick={() => {
                        setCreateForm(p => ({ ...p, branches_list: sel ? p.branches_list.filter(x => x.branch_id !== b.id) : [...p.branches_list, { branch_id: b.id, count: 0 }] }))
                      }} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: sel ? 700 : 500, color: sel ? C.purple : 'rgba(255,255,255,.4)', background: sel ? C.purple + '10' : 'transparent', border: `1px solid ${sel ? C.purple + '30' : 'rgba(255,255,255,.06)'}`, cursor: 'pointer' }}>{b.name_ar}</div>
                    })}
                  </div>
                </div>
              </div>
            )}

            {createStep === 3 && (
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ fontSize: 12, color: 'var(--tx4)', marginBottom: 8 }}>{T('أضف الملاك والشركاء المرتبطين بهذه المهمة', 'Add owners/partners related to this task')}</div>
                {createForm.partners.map((p, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                    <div><label style={labelS}>{T('الاسم', 'Name')}</label><input type="text" value={p.name} onChange={e => { const arr = [...createForm.partners]; arr[i].name = e.target.value; setCreateForm(prev => ({ ...prev, partners: arr })) }} style={inputS} /></div>
                    <div><label style={labelS}>{T('رقم الهوية', 'ID')}</label><input type="text" value={p.id_number || ''} onChange={e => { const arr = [...createForm.partners]; arr[i].id_number = e.target.value; setCreateForm(prev => ({ ...prev, partners: arr })) }} style={inputS} /></div>
                    <div onClick={() => setCreateForm(p2 => ({ ...p2, partners: p2.partners.filter((_, j) => j !== i) }))} style={{ width: 36, height: 42, borderRadius: 8, border: '1px solid rgba(192,57,43,.2)', background: 'rgba(192,57,43,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.red }}>✕</div>
                  </div>
                ))}
                <button onClick={() => setCreateForm(p => ({ ...p, partners: [...p.partners, { name: '', id_number: '', phone: '', role: 'partner' }] }))}
                  style={{ height: 36, borderRadius: 8, border: `1.5px dashed ${C.gold}30`, background: 'transparent', color: C.gold, fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  + {T('إضافة شريك', 'Add Partner')}
                </button>
              </div>
            )}

            {createStep === 4 && (
              <div style={{ display: 'grid', gap: 14 }}>
                <div><label style={labelS}>{T('طريقة التوزيع', 'Distribution Method')}</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[{ v: 'manual', l: T('يدوي', 'Manual'), c: C.blue }, { v: 'ai', l: T('ذكاء اصطناعي', 'AI'), c: C.gold }, { v: 'equal', l: T('بالتساوي', 'Equal'), c: C.ok }].map(m => (
                      <div key={m.v} onClick={() => setCreateForm(p => ({ ...p, distribution_method: m.v }))}
                        style={{ flex: 1, padding: '12px', borderRadius: 10, textAlign: 'center', fontSize: 12, fontWeight: createForm.distribution_method === m.v ? 700 : 500, color: createForm.distribution_method === m.v ? m.c : 'var(--tx5)', background: createForm.distribution_method === m.v ? m.c + '10' : 'rgba(255,255,255,.02)', border: `1.5px solid ${createForm.distribution_method === m.v ? m.c + '30' : 'rgba(255,255,255,.06)'}`, cursor: 'pointer' }}>{m.l}</div>
                    ))}
                  </div>
                </div>
                <div><label style={labelS}>{T('المكلّف الرئيسي', 'Main Assignee')}</label>
                  <select value={createForm.assigned_to} onChange={e => setCreateForm(p => ({ ...p, assigned_to: e.target.value }))} style={selectS}>
                    <option value="">{T('اختر...', 'Select...')}</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name_ar}</option>)}
                  </select></div>
                {createForm.distribution_method === 'ai' && (
                  <div style={{ padding: 16, borderRadius: 12, background: C.gold + '06', border: `1px solid ${C.gold}12`, fontSize: 11, color: C.gold }}>
                    {T('الذكاء الاصطناعي سيحلل أداء الموظفين وتخصصاتهم ولغاتهم لتوزيع المعاملات تلقائياً', 'AI will analyze employee performance, specialties, and languages to auto-distribute tasks')}
                  </div>
                )}
              </div>
            )}

            {createStep === 5 && (
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ fontSize: 12, color: 'var(--tx4)', marginBottom: 8 }}>{T('أرفق الوثائق والملفات المطلوبة', 'Attach required documents')}</div>
                <div style={{ padding: 40, borderRadius: 14, border: `2px dashed rgba(255,255,255,.1)`, textAlign: 'center', color: 'var(--tx5)', fontSize: 12 }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="1.5" style={{ marginBottom: 8 }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <div>{T('اسحب الملفات هنا أو اضغط للرفع', 'Drag files here or click to upload')}</div>
                  <div style={{ fontSize: 9, color: 'var(--tx6)', marginTop: 4 }}>{T('PDF, Word, Excel, صور', 'PDF, Word, Excel, Images')}</div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
            <button onClick={() => { if (createStep > 1) setCreateStep(p => p - 1); else setShowCreate(false) }}
              style={{ height: 36, padding: '0 18px', borderRadius: 8, border: '1px solid var(--bd)', background: 'transparent', color: 'var(--tx4)', fontFamily: F, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              {createStep > 1 ? T('السابق', 'Previous') : T('إلغاء', 'Cancel')}
            </button>
            <button onClick={() => { if (createStep < 5) setCreateStep(p => p + 1); else saveTask() }} disabled={createBusy}
              style={{ ...btnGold, height: 36, fontSize: 11, opacity: createBusy ? 0.6 : 1 }}>
              {createBusy ? '...' : createStep < 5 ? T('التالي', 'Next') : T('إنشاء المهمة ✓', 'Create Task ✓')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ═══ MAIN VIEW ═══
  return (
    <div style={{ fontFamily: F, direction: isAr ? 'rtl' : 'ltr' }}>
      {renderCreateModal()}
      {renderDetailPanel()}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--tx)' }}>{T('المهام', 'Tasks')}</div>
          <div style={{ fontSize: 12, color: 'var(--tx4)', marginTop: 4 }}>{T('إدارة المهام الدورية والاعتيادية', 'Manage recurring & ad-hoc tasks')}</div>
        </div>
        <button onClick={() => { setShowCreate(true); setCreateStep(1) }}
          style={{ ...btnGold, display: 'flex', alignItems: 'center', gap: 6 }}>
          + {T('مهمة جديدة', 'New Task')}
        </button>
      </div>

      {/* Type tabs + content layout */}
      <div style={{ display: 'flex', gap: 0 }}>
      <div style={{ width: 80, flexShrink: 0, borderLeft: isAr ? '1px solid rgba(255,255,255,.05)' : 'none', borderRight: !isAr ? '1px solid rgba(255,255,255,.05)' : 'none', paddingTop: 2 }}>
        {[
          { v: 'all', l: T('الكل', 'All'), n: tasks.length },
          { v: 'adhoc', l: T('الاعتيادية', 'Regular'), n: stats.adhoc },
          { v: 'recurring', l: T('الدورية', 'Recurring'), n: stats.recurring },
        ].map(t => (
          <div key={t.v} onClick={() => setTypeTab(t.v)}
            style={{ padding: '6px 8px', fontSize: 10, fontWeight: typeTab === t.v ? 700 : 500, color: typeTab === t.v ? C.gold : 'rgba(255,255,255,.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRight: isAr && typeTab === t.v ? '2px solid ' + C.gold : '2px solid transparent', borderLeft: !isAr && typeTab === t.v ? '2px solid ' + C.gold : '2px solid transparent', transition: '.1s' }}>
            <span>{t.l}</span><span style={{ fontSize: 7, color: 'rgba(255,255,255,.2)' }}>{t.n}</span>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, paddingRight: isAr ? 8 : 0, paddingLeft: !isAr ? 8 : 0 }}>

      {/* Search */}
      <div style={{ marginBottom: 14 }}>
        <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
          placeholder={T('بحث في المهام...', 'Search tasks...')}
          style={{ ...inputS, maxWidth: 360 }} />
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 18 }}>
        {[
          { l: T('الإجمالي', 'Total'), n: filtered.length, c: C.gold, sub: '' },
          { l: T('معلّقة', 'Pending'), n: stats.pending, c: '#e67e22', sub: '' },
          { l: T('متأخرة', 'Overdue'), n: stats.overdue, c: C.red, sub: stats.overdue > 0 ? '⚠' : '' },
          { l: T('مكتملة', 'Done'), n: stats.completed, c: C.ok, sub: filtered.length > 0 ? Math.round(stats.completed / filtered.length * 100) + '%' : '' },
          { l: T('اليوم', 'Today'), n: stats.today, c: C.blue, sub: '' },
        ].map((s, i) => (
          <div key={i} style={{ padding: 14, borderRadius: 12, background: s.c + '08', border: `1px solid ${s.c}15` }}>
            <div style={{ fontSize: 9, color: s.c, opacity: 0.7, marginBottom: 4 }}>{s.l}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.c }}>{s.n}</div>
            {s.sub && <div style={{ fontSize: 9, color: s.c, opacity: 0.5, marginTop: 2 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {['all', 'pending', 'overdue', 'completed'].map(f => (
            <div key={f} onClick={() => setFilter(f)} style={fBtnS(filter === f)}>
              {f === 'all' ? T('الكل', 'All') : f === 'pending' ? T('معلّقة', 'Pending') : f === 'overdue' ? T('متأخرة', 'Overdue') : T('مكتملة', 'Done')}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          {cats.map(c => (
            <div key={c.v} onClick={() => setCatFilter(c.v)}
              style={{ padding: '4px 10px', borderRadius: 6, fontSize: 9, fontWeight: catFilter === c.v ? 700 : 500, color: catFilter === c.v ? c.c : 'rgba(255,255,255,.35)', background: catFilter === c.v ? c.c + '12' : 'transparent', border: catFilter === c.v ? `1px solid ${c.c}25` : '1px solid rgba(255,255,255,.05)', cursor: 'pointer' }}>
              {c.l}
            </div>
          ))}
        </div>
      </div>

      {/* Task list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--tx5)' }}>...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--tx6)' }}>{T('لا توجد مهام', 'No tasks')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(t => {
            const sc = stClr[t.status] || '#999'
            const pc = priClr[t.priority] || C.gold
            const catObj = cats.find(c => c.v === t.category)
            const daysLeft = Math.ceil((new Date(t.due_date) - new Date()) / 86400000)
            const isToday = daysLeft === 0
            const isPast = daysLeft < 0
            const progPct = t.total_transactions > 0 ? Math.round((t.completed_transactions || 0) / t.total_transactions * 100) : t.status === 'completed' ? 100 : 0
            const brName = t.branch?.name_ar
            const entityName = t.entity_type === 'facility' ? facilities.find(f => f.id === t.entity_id)?.name_ar : t.entity_type === 'client' ? '' : ''

            return (
              <div key={t.id} onClick={() => loadDetail(t)}
                style={{ background: 'var(--sf)', border: `1px solid ${t.status === 'overdue' ? 'rgba(192,57,43,.2)' : 'var(--bd)'}`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: '.15s', borderRight: t.status === 'overdue' ? `3px solid ${C.red}` : undefined, borderLeft: t.status === 'overdue' ? `3px solid ${C.red}` : undefined }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,.03)'}
                onMouseOut={e => e.currentTarget.style.background = 'var(--sf)'}>

                {/* Complete button */}
                {t.status !== 'completed' && t.status !== 'skipped' ? (
                  <div onClick={e => { e.stopPropagation(); complete(t.id) }}
                    style={{ width: 28, height: 28, borderRadius: 8, border: `2px solid ${sc}40`, background: sc + '08', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} title={T('إنجاز', 'Complete')}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={sc} strokeWidth="3" opacity=".3"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                ) : (
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: sc + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={sc} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                )}

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: t.status === 'completed' ? 'var(--tx5)' : 'var(--tx2)', textDecoration: t.status === 'completed' ? 'line-through' : 'none' }}>{t.title_ar}</span>
                    {catObj && catObj.v !== 'all' && <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: catObj.c + '12', color: catObj.c }}>{catObj.l}</span>}
                    <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: pc + '12', color: pc }}>{t.priority === 'urgent' ? T('عاجل','Urgent') : t.priority === 'high' ? T('عالي','High') : t.priority === 'normal' ? T('عادي','Normal') : T('منخفض','Low')}</span>
                    {brName && <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: 'rgba(155,89,182,.1)', color: '#9b59b6' }}>{brName}</span>}
                    {isPast && t.status !== 'completed' && t.status !== 'skipped' && <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: C.red + '12', color: C.red, fontWeight: 700 }}>{T('متأخرة','Overdue')} {Math.abs(daysLeft)}{T('ي','d')}</span>}
                  </div>
                  {t.description && <div style={{ fontSize: 11, color: 'var(--tx5)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</div>}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {t.assigned?.name_ar && <span style={{ fontSize: 10, color: C.blue }}>👤 {t.assigned.name_ar}</span>}
                    {entityName && <span style={{ fontSize: 9, color: 'var(--tx5)' }}>🏢 {entityName}</span>}
                    {t.total_transactions > 0 && <span style={{ fontSize: 9, color: C.gold }}>📋 {t.completed_transactions||0}/{t.total_transactions}</span>}
                    {!t.assigned?.name_ar && <select value={t.assigned_to || ''} onChange={e => { e.stopPropagation(); assign(t.id, e.target.value) }} onClick={e => e.stopPropagation()}
                      style={{ height: 22, padding: '0 6px', borderRadius: 4, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', color: 'var(--tx5)', fontFamily: F, fontSize: 9, outline: 'none', cursor: 'pointer' }}>
                      <option value="">{T('تعيين', 'Assign')}</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name_ar}</option>)}
                    </select>}
                  </div>
                  {/* Progress bar for tasks with transactions */}
                  {t.total_transactions > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,.06)', overflow: 'hidden', maxWidth: 120 }}>
                      <div style={{ height: '100%', width: progPct + '%', borderRadius: 2, background: progPct === 100 ? C.ok : C.gold, transition: '.3s' }} />
                    </div>
                    <span style={{ fontSize: 9, color: progPct === 100 ? C.ok : C.gold, fontWeight: 700 }}>{progPct}%</span>
                  </div>}
                </div>

                {/* Due date */}
                <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 50 }}>
                  <div style={{ fontSize: 9, color: isPast ? C.red : isToday ? C.gold : 'var(--tx5)' }}>{t.due_date?.slice(5)}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: isPast ? C.red : isToday ? C.gold : 'var(--tx4)' }}>
                    {isPast ? daysLeft + T('ي', 'd') : isToday ? T('اليوم', 'Today') : '+' + daysLeft + T('ي', 'd')}
                  </div>
                </div>

                {/* Actions */}
                {t.status !== 'completed' && t.status !== 'skipped' && (
                  <div style={{ display: 'flex', gap: 3, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <div onClick={() => skip(t.id)} style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={T('تخطي', 'Skip')}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="2"><path d="M5 4h4l10 8-10 8H5l10-8z"/></svg>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      </div></div>
      {/* Templates section */}
      <div style={{ marginTop: 24, borderTop: '1px solid var(--bd)', paddingTop: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx3)', marginBottom: 12 }}>{T('القوالب المجدولة', 'Scheduled Templates')} <span style={{ fontSize: 11, color: 'var(--tx5)', fontWeight: 500 }}>({templates.length})</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
          {templates.map(t => {
            const catObj = cats.find(c => c.v === t.category)
            return (
              <div key={t.id} style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,.02)', border: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: (catObj?.c || '#999') + '10', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={catObj?.c || '#999'} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title_ar}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3 }}>
                    <span style={{ fontSize: 9, color: (catObj?.c || '#999'), background: (catObj?.c || '#999') + '10', padding: '1px 6px', borderRadius: 3 }}>{catObj?.l || t.category}</span>
                    <span style={{ fontSize: 9, color: 'var(--tx5)' }}>{t.recurrence === 'weekly' ? T('أسبوعي', 'Weekly') : T('شهري', 'Monthly')}</span>
                    <span style={{ fontSize: 9, color: 'var(--tx5)' }}>{t.estimated_minutes} {T('دقيقة', 'min')}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
