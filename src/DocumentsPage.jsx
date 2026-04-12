import React, { useState, useEffect, useCallback, useMemo } from 'react'

const C = { dk:'#171717', gold:'#c9a84c', red:'#c0392b', blue:'#3483b4', ok:'#27a046' }
const F = "'Cairo','Tajawal',sans-serif"
const fS = { width:'100%', height:42, padding:'0 14px', border:'1.5px solid rgba(255,255,255,.12)', borderRadius:10, fontFamily:F, fontSize:13, fontWeight:600, color:'var(--tx)', outline:'none', background:'rgba(255,255,255,.06)', textAlign:'right' }

export default function DocumentsPage({ sb, toast, user, lang }) {
  const T = (ar, en) => lang === 'ar' ? ar : en
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterEntity, setFilterEntity] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [searchQ, setSearchQ] = useState('')
  const [pop, setPop] = useState(null)
  const [f, setF] = useState({
    entity_type: 'client', entity_id: '', file_name: '', file_url: '',
    file_type: '', category: 'other', description: ''
  })

  const load = useCallback(async () => {
    setLoading(true)
    const { data: d } = await sb.from('attachments').select('*').is('deleted_at', null).order('uploaded_at', { ascending: false }).limit(200)
    setData(d || [])
    setLoading(false)
  }, [sb])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    let d = data
    if (filterEntity !== 'all') d = d.filter(a => a.entity_type === filterEntity)
    if (filterCategory !== 'all') d = d.filter(a => a.category === filterCategory)
    if (searchQ) {
      const q = searchQ.toLowerCase()
      d = d.filter(a => (a.file_name || '').toLowerCase().includes(q) || (a.description || '').toLowerCase().includes(q))
    }
    return d
  }, [data, filterEntity, filterCategory, searchQ])

  const save = async () => {
    if (!f.file_name || !f.file_url) { toast(T('يرجى إدخال اسم ورابط الملف', 'Enter file name and URL')); return }
    if (!f.entity_type || !f.entity_id) { toast(T('يرجى تحديد الجهة', 'Select entity')); return }
    const row = { ...f, uploaded_by: user?.id }
    if (pop === 'new') {
      const { error } = await sb.from('attachments').insert(row)
      if (error) { toast(T('خطأ: ', 'Error: ') + error.message); return }
    } else {
      const { error } = await sb.from('attachments').update(row).eq('id', pop)
      if (error) { toast(T('خطأ: ', 'Error: ') + error.message); return }
    }
    toast(T('تم الحفظ', 'Saved')); setPop(null); load()
  }

  const entityLabels = { worker: T('عامل', 'Worker'), facility: T('منشأة', 'Facility'), client: T('عميل', 'Client'), broker: T('وسيط', 'Broker'), invoice: T('فاتورة', 'Invoice'), transaction: T('معاملة', 'Transaction'), expense: T('مصروف', 'Expense'), user: T('موظف', 'User'), commission: T('عمولة', 'Commission') }
  const categoryLabels = { id_copy: T('صورة هوية', 'ID Copy'), passport: T('جواز سفر', 'Passport'), contract: T('عقد', 'Contract'), receipt: T('إيصال', 'Receipt'), photo: T('صورة', 'Photo'), insurance: T('تأمين', 'Insurance'), license: T('رخصة', 'License'), letter: T('خطاب', 'Letter'), other: T('أخرى', 'Other') }
  const categoryColors = { id_copy: C.blue, passport: '#9b59b6', contract: C.gold, receipt: C.ok, photo: '#e67e22', insurance: C.blue, license: C.gold, letter: '#3498db', other: 'var(--tx4)' }

  const fileIcon = (type) => {
    if (!type) return '📄'
    if (type.includes('pdf')) return '📕'
    if (type.includes('image') || type.includes('png') || type.includes('jpg')) return '🖼️'
    if (type.includes('excel') || type.includes('sheet')) return '📊'
    if (type.includes('word') || type.includes('doc')) return '📝'
    return '📄'
  }

  const stats = useMemo(() => ({
    total: data.length,
    contracts: data.filter(a => a.category === 'contract').length,
    ids: data.filter(a => a.category === 'id_copy' || a.category === 'passport').length,
    receipts: data.filter(a => a.category === 'receipt').length,
  }), [data])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--tx)' }}>{T('مركز المستندات', 'Documents Center')}</div>
        <button onClick={() => { setF({ entity_type: 'client', entity_id: '', file_name: '', file_url: '', file_type: '', category: 'other', description: '' }); setPop('new') }} style={{ height: 36, padding: '0 18px', borderRadius: 10, border: '1px solid rgba(201,168,76,.2)', background: 'rgba(201,168,76,.1)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>+ {T('مستند جديد', 'New Document')}</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 8 }}>
        {[
          { l: T('الإجمالي', 'Total'), v: stats.total, c: 'var(--tx2)' },
          { l: T('العقود', 'Contracts'), v: stats.contracts, c: C.gold },
          { l: T('الهويات', 'IDs'), v: stats.ids, c: C.blue },
          { l: T('الإيصالات', 'Receipts'), v: stats.receipts, c: C.ok },
        ].map((s, i) => (
          <div key={i} style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--bd)' }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--tx5)' }}>{s.l}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: s.c, marginTop: 2 }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder={T('بحث بالاسم...', 'Search...')} style={{ ...fS, width: 180, height: 32, fontSize: 11 }} />
        <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)} style={{ height: 32, padding: '0 10px', borderRadius: 8, border: '1px solid var(--bd)', background: 'var(--bg)', color: 'var(--tx2)', fontFamily: F, fontSize: 11, fontWeight: 600 }}>
          <option value="all">{T('كل الجهات', 'All Entities')}</option>
          {Object.entries(entityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ height: 32, padding: '0 10px', borderRadius: 8, border: '1px solid var(--bd)', background: 'var(--bg)', color: 'var(--tx2)', fontFamily: F, fontSize: 11, fontWeight: 600 }}>
          <option value="all">{T('كل الفئات', 'All Categories')}</option>
          {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Grid of documents */}
      {loading ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--tx5)' }}>...</div> :
        filtered.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--tx5)' }}>{T('لا توجد مستندات', 'No documents')}</div> :
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 8 }}>
          {filtered.map(doc => (
            <div key={doc.id} onClick={() => { setF({ ...doc }); setPop(doc.id) }} style={{ padding: '14px', borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--bd)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8, transition: '.15s' }}>
              {/* File icon & name */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ fontSize: 22 }}>{fileIcon(doc.file_type)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.file_name}</div>
                  <div style={{ fontSize: 9, color: 'var(--tx5)', marginTop: 1 }}>{doc.file_type || T('غير محدد', 'Unknown')}</div>
                </div>
              </div>
              {/* Tags */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: (categoryColors[doc.category] || 'var(--tx4)') + '15', color: categoryColors[doc.category] || 'var(--tx4)' }}>{categoryLabels[doc.category] || doc.category}</span>
                <span style={{ fontSize: 9, fontWeight: 500, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,.04)', color: 'var(--tx4)' }}>{entityLabels[doc.entity_type] || doc.entity_type}</span>
              </div>
              {doc.description && <div style={{ fontSize: 10, color: 'var(--tx4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.description}</div>}
              <div style={{ fontSize: 9, color: 'var(--tx5)' }}>{doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</div>
            </div>
          ))}
        </div>
      }

      {/* Popup */}
      {pop && (
        <div onClick={() => setPop(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(14,14,14,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--sf)', borderRadius: 16, width: 'min(480px,96vw)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid var(--bd)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)' }}>{pop === 'new' ? T('مستند جديد', 'New Document') : T('تفاصيل المستند', 'Document Details')}</div>
              <button onClick={() => setPop(null)} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', color: 'var(--tx3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx4)', marginBottom: 4 }}>{T('نوع الجهة', 'Entity Type')} *</div>
                  <select value={f.entity_type} onChange={e => setF(p => ({ ...p, entity_type: e.target.value }))} style={fS}>
                    {Object.entries(entityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx4)', marginBottom: 4 }}>{T('معرف الجهة', 'Entity ID')} *</div>
                  <input value={f.entity_id || ''} onChange={e => setF(p => ({ ...p, entity_id: e.target.value }))} style={fS} placeholder="UUID" />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx4)', marginBottom: 4 }}>{T('اسم الملف', 'File Name')} *</div>
                  <input value={f.file_name || ''} onChange={e => setF(p => ({ ...p, file_name: e.target.value }))} style={fS} />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx4)', marginBottom: 4 }}>{T('الفئة', 'Category')}</div>
                  <select value={f.category || 'other'} onChange={e => setF(p => ({ ...p, category: e.target.value }))} style={fS}>
                    {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx4)', marginBottom: 4 }}>{T('رابط الملف', 'File URL')} *</div>
                <input value={f.file_url || ''} onChange={e => setF(p => ({ ...p, file_url: e.target.value }))} style={{ ...fS, direction: 'ltr' }} placeholder="https://..." />
              </div>
              {f.file_url && pop !== 'new' && (
                <a href={f.file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, background: 'rgba(52,131,180,.08)', border: '1px solid rgba(52,131,180,.15)', color: C.blue, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke={C.blue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  {T('فتح الملف', 'Open File')}
                </a>
              )}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx4)', marginBottom: 4 }}>{T('نوع الملف', 'File Type')}</div>
                <input value={f.file_type || ''} onChange={e => setF(p => ({ ...p, file_type: e.target.value }))} style={fS} placeholder="application/pdf" />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx4)', marginBottom: 4 }}>{T('الوصف', 'Description')}</div>
                <textarea value={f.description || ''} onChange={e => setF(p => ({ ...p, description: e.target.value }))} style={{ ...fS, height: 60, padding: '8px 12px', resize: 'none' }} />
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--bd)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={save} style={{ height: 38, padding: '0 24px', borderRadius: 10, background: C.gold, border: 'none', color: C.dk, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{T('حفظ', 'Save')}</button>
              {pop !== 'new' && <button onClick={async () => { await sb.from('attachments').update({ deleted_at: new Date().toISOString(), deleted_by: user?.id }).eq('id', pop); toast(T('تم الحذف', 'Deleted')); setPop(null); load() }} style={{ height: 38, padding: '0 18px', borderRadius: 10, background: 'rgba(192,57,43,.1)', border: '1px solid rgba(192,57,43,.15)', color: C.red, fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{T('حذف', 'Delete')}</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
