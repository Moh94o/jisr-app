import React, { useEffect, useRef, useState } from 'react'

/* واجهة الجوال: تظهر على الشاشات ≤ 768px فقط (mobile.css يخفيها على الحاسب ويخفي
   الترويسة والقائمة الجانبية الخاصّتين بالحاسب). المنطق كلّه (الصفحات والصلاحيات)
   يبقى في DashPage — هذه المكوّنات عرضٌ فقط. */

const GOLD = '#B07D00'

const Chevron = ({ rtl, size = 16, color = 'var(--tx4)' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    {rtl ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
  </svg>
)

export function MobileTopBar({ user, lang, title, officeText, onProfile, onLang, onLogout, onSearch }) {
  const ar = lang === 'ar'
  const nm = (ar ? (user?.person?.name_ar || user?.person?.name_en) : (user?.person?.name_en || user?.person?.name_ar)) || ''
  const first = nm.trim().split(/\s+/)[0] || ''
  const initial = (first || '؟').charAt(0)
  const avatar = user?.avatar_url || user?.person?.avatar_url
  return (
    <div className="m-topbar">
      <button className="m-me m-press" onClick={onProfile} aria-label={ar ? 'الملف الشخصي' : 'Profile'}>
        <span className="m-avatar">{avatar ? <img src={avatar} alt="" /> : initial}</span>
        <span className="m-me-text">
          {title
            ? <span className="m-me-title">{title}</span>
            : <>
              <span className="m-me-hello">{ar ? 'مرحباً' : 'Hello'}{first ? (ar ? '، ' : ', ') + first : ''}</span>
              {officeText && <span className="m-me-office">{officeText}</span>}
            </>}
        </span>
      </button>
      <div className="m-actions">
        {onSearch && (
          <button className="m-icon-btn m-press" onClick={onSearch} aria-label={ar ? 'بحث' : 'Search'}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </button>
        )}
        <button className="m-icon-btn m-press" onClick={onLang} aria-label={ar ? 'English' : 'العربية'}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 010 18 14 14 0 010-18z" /></svg>
        </button>
        <button className="m-icon-btn m-press m-danger" onClick={onLogout} aria-label={ar ? 'تسجيل الخروج' : 'Sign out'}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ transform: ar ? 'scaleX(-1)' : 'none' }}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
        </button>
      </div>
    </div>
  )
}

/* تبويبات القسم (الصفحات الفرعية) — شريط شرائح أفقي قابل للتمرير تحت الترويسة */
export function MobileHubTabs({ tabs, active, onPick }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current?.querySelector('.m-chip.on')
    if (el) el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [active])
  if (!tabs || tabs.length < 2) return null
  return (
    <div className="m-hub">
      <div className="m-chips" ref={ref}>
        {tabs.map(t => (
          <button key={t.id} className={'m-chip m-press' + (t.id === active ? ' on' : '')} onClick={() => onPick(t.id)}>{t.l}</button>
        ))}
      </div>
    </div>
  )
}

export function MobileTabBar({ items, onPick }) {
  return (
    <nav className="m-tabbar">
      {items.map(n => (
        <button key={n.id} className={'m-tab' + (n.on ? ' on' : '')} onClick={() => onPick(n.id)} aria-label={n.l}>
          <span className="m-tab-ico">{n.icon}</span>
          <span className="m-tab-lbl">{n.l}</span>
        </button>
      ))}
    </nav>
  )
}

/* «المزيد»: شاشة كاملة بكل الأقسام كبطاقات (مثل أبشر)، والقسم ذو التبويبات يفتح
   قائمته الفرعية داخل الشاشة نفسها (مثل قوائم تطبيقات البنوك) */
export function MobileMoreSheet({ open, onClose, sections, active, onPick, lang, renderIcon, user, onProfile, onLang, onLogout }) {
  const ar = lang === 'ar'
  const [hub, setHub] = useState(null)
  const [q, setQ] = useState('')
  useEffect(() => { if (!open) { setHub(null); setQ('') } }, [open])
  if (!open) return null
  const cur = hub && sections.find(s => s.id === hub)
  const query = q.trim()
  const results = query ? sections.flatMap(s => (s.tabs && s.tabs.length ? s.tabs.filter(t => !t.hdr).map(t => ({ ...t, parent: s })) : [{ ...s, parent: null }]))
    .filter(t => t.l.includes(query) || (t.parent && t.parent.l.includes(query))) : null
  const pick = (id) => { onPick(id); onClose() }
  const nm = (ar ? (user?.person?.name_ar || user?.person?.name_en) : (user?.person?.name_en || user?.person?.name_ar)) || ''
  return (
    <div className="m-more" role="dialog">
      <div className="m-more-head">
        {cur ? (
          <button className="m-back m-press" onClick={() => setHub(null)}>
            <Chevron rtl={!ar} size={20} color={GOLD} /><span>{ar ? 'كل الأقسام' : 'All sections'}</span>
          </button>
        ) : <span />}
        <button className="m-icon-btn m-press" onClick={onClose} aria-label={ar ? 'إغلاق' : 'Close'}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="m-more-body">
        {!cur && <>
          <h1 className="m-large-title">{ar ? 'الأقسام' : 'Sections'}</h1>
          <label className="m-search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder={ar ? 'ابحث عن قسم أو جدول' : 'Search sections'} />
          </label>
          {results ? (
            <div className="m-list">
              {results.length === 0 && <div className="m-empty-line">{ar ? 'لا نتائج' : 'No results'}</div>}
              {results.map(t => (
                <button key={t.id} className="m-row m-press" onClick={() => pick(t.id)}>
                  <span className="m-row-ico">{renderIcon(t.i || t.parent?.i, GOLD, 20)}</span>
                  <span className="m-row-text"><span className="m-row-title">{t.l}</span>{t.parent && <span className="m-row-sub">{t.parent.l}</span>}</span>
                  <Chevron rtl={ar} />
                </button>
              ))}
            </div>
          ) : (
            <div className="m-tiles">
              {sections.map(s => {
                const on = s.id === active || (s.tabs || []).some(t => t.id === active)
                const cnt = (s.tabs || []).filter(t => !t.hdr).length
                return (
                  <button key={s.id} className={'m-tile m-press' + (on ? ' on' : '')} onClick={() => (cnt > 1 ? setHub(s.id) : pick(cnt === 1 ? s.tabs.find(t => !t.hdr).id : s.id))}>
                    <span className="m-tile-ico">{renderIcon(s.i, GOLD, 26)}</span>
                    <span className="m-tile-lbl">{s.l}</span>
                    {cnt > 1 && <span className="m-tile-sub">{cnt} {ar ? 'صفحات' : 'pages'}</span>}
                  </button>
                )
              })}
            </div>
          )}
          {!results && (
            <div className="m-list m-list-gap">
              <button className="m-row m-press" onClick={() => { onClose(); onProfile() }}>
                <span className="m-row-ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0116 0v1" strokeLinecap="round" /></svg></span>
                <span className="m-row-text"><span className="m-row-title">{ar ? 'الملف الشخصي' : 'Profile'}</span>{nm && <span className="m-row-sub">{nm}</span>}</span>
                <Chevron rtl={ar} />
              </button>
              <button className="m-row m-press" onClick={onLang}>
                <span className="m-row-ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 010 18 14 14 0 010-18z" /></svg></span>
                <span className="m-row-text"><span className="m-row-title">{ar ? 'اللغة' : 'Language'}</span><span className="m-row-sub">{ar ? 'العربية' : 'English'}</span></span>
                <span className="m-row-value">{ar ? 'English' : 'العربية'}</span>
              </button>
              <button className="m-row m-press m-row-danger" onClick={onLogout}>
                <span className="m-row-ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ transform: ar ? 'scaleX(-1)' : 'none' }}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg></span>
                <span className="m-row-text"><span className="m-row-title">{ar ? 'تسجيل الخروج' : 'Sign out'}</span></span>
              </button>
            </div>
          )}
        </>}
        {cur && <>
          <div className="m-hub-hero">
            <span className="m-tile-ico m-tile-ico-lg">{renderIcon(cur.i, GOLD, 30)}</span>
            <h1 className="m-large-title">{cur.l}</h1>
          </div>
          <div className="m-list">
            {cur.tabs.map(t => t.hdr
              ? <div key={t.id} className="m-list-hdr">{t.l}</div>
              : (
                <button key={t.id} className={'m-row m-press' + (t.id === active ? ' on' : '')} onClick={() => pick(t.id)}>
                  <span className="m-row-ico">{renderIcon(t.i || cur.i, GOLD, 20)}</span>
                  <span className="m-row-text"><span className="m-row-title">{t.l}</span></span>
                  <Chevron rtl={ar} />
                </button>
              ))}
          </div>
        </>}
      </div>
    </div>
  )
}
