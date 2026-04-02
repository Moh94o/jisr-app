import React, { useState, useEffect, useCallback, useMemo } from 'react'

const C = { gold:'#c9a84c', gl:'#dcc06e', red:'#c0392b', blue:'#3483b4', ok:'#27a046', purple:'#9b59b6', orange:'#e67e22' }
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
  const [typeTab, setTypeTab] = useState(defaultFilter === 'periodic' ? 'recurring' : 'all')
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
  const [taskAttachments, setTaskAttachments] = useState([])

  // ═══ LOAD ═══
  const load = useCallback(async () => {
    setLoading(true)
    const [t, tmpl, u, fac, br, svc] = await Promise.all([
      sb.from('tasks').select('*, assigned:assigned_to(name_ar,name_en)').order('due_date').order('priority'),
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
  const fBtnS = (a) => ({ padding: '5px 12px', borderRadius: 6, fontSize: 10, fontWeight: a ? 700 : 500, color: a ? C.gold : 'rgba(255,255,255,.4)', background: a ? 'rgba(201,168,76,.08)' : 'transparent', border: a ? '1px solid rgba(201,168,76,.15)' : '1px solid rgba(255,255,255,.06)', cursor: 'pointer' })
  const stClr = { pending: C.gold, in_progress: C.blue, completed: C.ok, overdue: C.red, skipped: '#888' }
  const priClr = { high: C.red, urgent: C.red, normal: C.gold, low: '#888' }

  // ═══ DETAIL VIEW ═══
  if (selectedTask) {
    const t = selectedTask
    const sc = stClr[t.status] || '#888'
    const pc = priClr[t.priority] || C.gold
    const catObj = cats.find(c => c.v === t.category)
    const daysLeft = Math.ceil((new Date(t.due_date) - new Date()) / 86400000)
    const progressPct = t.status === 'completed' ? 100 : t.status === 'in_progress' ? 50 : t.status === 'overdue' ? 30 : 10

    return (
      <div style={{ fontFamily: F, direction: isAr ? 'rtl' : 'ltr' }}>
        {/* Back button */}
        <button onClick={() => setSelectedTask(null)}
          style={{ height: 34, padding: '0 14px', borderRadius: 8, border: '1px solid var(--bd)', background: 'transparent', color: 'var(--tx4)', fontFamily: F, fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 5 }}>
          ← {T('رجوع', 'Back')}
        </button>

        {/* Task card */}
        <div style={{ padding: 24, borderRadius: 16, background: 'var(--sf)', border: `1px solid ${sc}20`, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--tx)' }}>{t.title_ar}</div>
              {t.description && <div style={{ fontSize: 12, color: 'var(--tx4)', marginTop: 6 }}>{t.description}</div>}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ fontSize: 9, padding: '3px 10px', borderRadius: 6, background: sc + '12', color: sc, fontWeight: 700 }}>
                {t.status === 'pending' ? T('معلّقة','Pending') : t.status === 'in_progress' ? T('قيد التنفيذ','In Progress') : t.status === 'completed' ? T('مكتملة','Done') : t.status === 'overdue' ? T('متأخرة','Overdue') : T('مُتخطاة','Skipped')}
              </span>
              <span style={{ fontSize: 9, padding: '3px 10px', borderRadius: 6, background: pc + '12', color: pc, fontWeight: 700 }}>{t.priority}</span>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--tx5)' }}>{T('التقدم', 'Progress')}</span>
              <span style={{ fontSize: 10, color: sc, fontWeight: 700 }}>{progressPct}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progressPct}%`, background: sc, borderRadius: 3, transition: '.3s' }} />
            </div>
          </div>

          {/* Meta */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
            <div><div style={{ fontSize: 9, color: 'var(--tx5)' }}>{T('التصنيف', 'Category')}</div><div style={{ fontSize: 12, fontWeight: 700, color: catObj?.c || '#888', marginTop: 2 }}>{catObj?.l}</div></div>
            <div><div style={{ fontSize: 9, color: 'var(--tx5)' }}>{T('تاريخ الاستحقاق', 'Due Date')}</div><div style={{ fontSize: 12, fontWeight: 700, color: daysLeft < 0 ? C.red : C.gold, marginTop: 2 }}>{t.due_date} ({daysLeft}{T('ي', 'd')})</div></div>
            <div><div style={{ fontSize: 9, color: 'var(--tx5)' }}>{T('المكلّف', 'Assignee')}</div><div style={{ fontSize: 12, fontWeight: 700, color: C.blue, marginTop: 2 }}>{t.assigned?.name_ar || T('غير معيّن', 'Unassigned')}</div></div>
            <div><div style={{ fontSize: 9, color: 'var(--tx5)' }}>{T('النوع', 'Type')}</div><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx3)', marginTop: 2 }}>{t.task_type === 'recurring' ? T('دورية', 'Recurring') : T('طارئة', 'Ad-hoc')}</div></div>
          </div>

          {/* Action buttons */}
          {t.status !== 'completed' && t.status !== 'skipped' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--bd)' }}>
              <button onClick={() => { complete(t.id); setSelectedTask(null) }} style={{ ...btnGold, height: 34, fontSize: 11 }}>{T('إنجاز ✓', 'Complete ✓')}</button>
              <button onClick={() => { skip(t.id); setSelectedTask(null) }} style={{ height: 34, padding: '0 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: 'var(--tx4)', fontFamily: F, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{T('تخطي', 'Skip')}</button>
            </div>
          )}
        </div>

        {/* 4 tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {[
            { v: 'info', l: T('التفاصيل', 'Details') },
            { v: 'team', l: T('الفريق', 'Team'), n: assignees.length },
            { v: 'comments', l: T('التعليقات', 'Comments'), n: comments.length },
            { v: 'attachments', l: T('المرفقات', 'Attachments'), n: taskAttachments.length },
          ].map(tab => (
            <div key={tab.v} onClick={() => setDetailTab(tab.v)}
              style={{ padding: '8px 16px', borderRadius: 8, fontSize: 11, fontWeight: detailTab === tab.v ? 700 : 500, color: detailTab === tab.v ? C.gold : 'rgba(255,255,255,.4)', background: detailTab === tab.v ? C.gold + '10' : 'transparent', border: detailTab === tab.v ? `1.5px solid ${C.gold}25` : '1px solid rgba(255,255,255,.06)', cursor: 'pointer' }}>
              {tab.l} {tab.n !== undefined && <span style={{ fontSize: 9, opacity: 0.6 }}>({tab.n})</span>}
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--sf)', borderRadius: 14, border: '1px solid var(--bd)', padding: 20, minHeight: 200 }}>
          {detailTab === 'info' && (
            <div style={{ display: 'grid', gap: 16 }}>
              {taskBranches.length > 0 && (
                <div>
                  <div style={labelS}>{T('الفروع', 'Branches')}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {taskBranches.map(b => (
                      <span key={b.id} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: C.purple + '10', color: C.purple, border: `1px solid ${C.purple}20` }}>
                        {b.branch?.name_ar} {b.transaction_count ? `(${b.transaction_count})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {taskPartners.length > 0 && (
                <div>
                  <div style={labelS}>{T('الملاك/الشركاء', 'Partners')}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {taskPartners.map(p => (
                      <div key={p.id} style={{ fontSize: 12, color: 'var(--tx3)' }}>
                        {p.partner_name} {p.id_number && <span style={{ fontSize: 10, color: 'var(--tx5)' }}>({p.id_number})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {detailTab === 'team' && (
            <div>
              {assignees.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--tx6)', fontSize: 12 }}>{T('لا يوجد فريق معيّن', 'No team assigned')}</div>
              ) : assignees.map(a => (
                <div key={a.id} style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,.02)', border: '1px solid var(--bd)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: C.blue + '12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: C.blue }}>{(a.user?.name_ar || '?')[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx2)' }}>{a.user?.name_ar}</div>
                    <div style={{ fontSize: 10, color: 'var(--tx5)' }}>{a.branch?.name_ar || ''} — {a.role}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.gold }}>{a.transaction_count || 0}</div>
                </div>
              ))}
            </div>
          )}

          {detailTab === 'comments' && (
            <div>
              {comments.map(c => (
                <div key={c.id} style={{ padding: '10px 14px', borderRadius: 10, background: c.comment_type === 'system' ? 'rgba(201,168,76,.04)' : 'rgba(255,255,255,.02)', border: '1px solid var(--bd)', marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.blue }}>{c.user?.name_ar || T('النظام', 'System')}</span>
                    <span style={{ fontSize: 9, color: 'var(--tx5)' }}>{c.created_at?.slice(0, 16).replace('T', ' ')}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--tx3)', lineHeight: 1.5 }}>{c.body}</div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)}
                  placeholder={T('اكتب تعليق...', 'Write a comment...')}
                  onKeyDown={e => e.key === 'Enter' && addComment()}
                  style={{ ...inputS, flex: 1 }} />
                <button onClick={addComment} style={{ ...btnGold, height: 42, padding: '0 18px', fontSize: 11 }}>{T('إرسال', 'Send')}</button>
              </div>
            </div>
          )}

          {detailTab === 'attachments' && (
            <div>
              {taskAttachments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--tx6)', fontSize: 12 }}>{T('لا توجد مرفقات', 'No attachments')}</div>
              ) : taskAttachments.map(a => (
                <div key={a.id} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--bd)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)' }}>{a.file_name}</div>
                    <div style={{ fontSize: 9, color: 'var(--tx5)' }}>{a.created_at?.slice(0, 10)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
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

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--tx)' }}>{T('المهام', 'Tasks')}</div>
          <div style={{ fontSize: 12, color: 'var(--tx4)', marginTop: 4 }}>{T('إدارة المهام الدورية والطارئة', 'Manage recurring & ad-hoc tasks')}</div>
        </div>
        <button onClick={() => { setShowCreate(true); setCreateStep(1) }}
          style={{ ...btnGold, display: 'flex', alignItems: 'center', gap: 6 }}>
          + {T('مهمة جديدة', 'New Task')}
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 14 }}>
        <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
          placeholder={T('بحث في المهام...', 'Search tasks...')}
          style={{ ...inputS, maxWidth: 360 }} />
      </div>

      {/* Type tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {[
          { v: 'all', l: T('الكل', 'All'), n: tasks.length, c: '#999' },
          { v: 'recurring', l: T('دورية', 'Recurring'), n: stats.recurring, c: C.gold },
          { v: 'adhoc', l: T('طارئة', 'Ad-hoc'), n: stats.adhoc, c: C.blue },
        ].map(t => (
          <div key={t.v} onClick={() => setTypeTab(t.v)}
            style={{ padding: '8px 16px', borderRadius: 8, fontSize: 11, fontWeight: typeTab === t.v ? 700 : 500, color: typeTab === t.v ? t.c : 'rgba(255,255,255,.4)', background: typeTab === t.v ? t.c + '12' : 'transparent', border: typeTab === t.v ? `1.5px solid ${t.c}30` : '1px solid rgba(255,255,255,.06)', cursor: 'pointer' }}>
            {t.l} <span style={{ fontSize: 9, opacity: 0.6 }}>({t.n})</span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(150px,100%), 1fr))', gap: 10, marginBottom: 18 }}>
        {[
          { l: T('معلّقة', 'Pending'), n: stats.pending, c: C.gold },
          { l: T('متأخرة', 'Overdue'), n: stats.overdue, c: C.red },
          { l: T('مكتملة', 'Done'), n: stats.completed, c: C.ok },
          { l: T('اليوم', 'Today'), n: stats.today, c: C.blue },
        ].map((s, i) => (
          <div key={i} style={{ padding: 14, borderRadius: 12, background: s.c + '06', border: `1px solid ${s.c}10` }}>
            <div style={{ fontSize: 10, color: s.c, opacity: 0.7, marginBottom: 6 }}>{s.l}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.c }}>{s.n}</div>
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
            
            return (
              <div key={t.id} onClick={() => loadDetail(t)}
                style={{ background: 'var(--sf)', border: `1px solid ${t.status === 'overdue' ? 'rgba(192,57,43,.15)' : 'var(--bd)'}`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: '.15s' }}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: t.status === 'completed' ? 'var(--tx5)' : 'var(--tx2)', textDecoration: t.status === 'completed' ? 'line-through' : 'none' }}>{t.title_ar}</span>
                    {catObj && catObj.v !== 'all' && <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: catObj.c + '12', color: catObj.c }}>{catObj.l}</span>}
                    <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: pc + '12', color: pc }}>{t.priority}</span>
                  </div>
                  {t.description && <div style={{ fontSize: 11, color: 'var(--tx5)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</div>}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {t.assigned?.name_ar && <span style={{ fontSize: 10, color: C.blue }}>{t.assigned.name_ar}</span>}
                    <select value={t.assigned_to || ''} onChange={e => { e.stopPropagation(); assign(t.id, e.target.value) }} onClick={e => e.stopPropagation()}
                      style={{ height: 22, padding: '0 6px', borderRadius: 4, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', color: 'var(--tx5)', fontFamily: F, fontSize: 9, outline: 'none', cursor: 'pointer' }}>
                      <option value="">{T('تعيين', 'Assign')}</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name_ar}</option>)}
                    </select>
                  </div>
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
