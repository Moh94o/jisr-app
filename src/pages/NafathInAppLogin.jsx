import React from 'react'
import { buildNafathBookmarklet } from './nafathSyncBookmarklet.js'

// Pre-sync Nafath card — "Live Wallet" aesthetic.
//
// Background: iam.gov.sa blocks non-Saudi IPs at its CDN, so we cannot proxy
// the login through a Supabase Edge Function (Deno runs in non-Saudi regions
// and gets a 404 + HTML fallback page from IAM). The user's own browser DOES
// have a Saudi IP, so the only working integration is the bookmarklet — it
// runs *inside* the user's tab on iam.gov.sa, where it has both the right IP
// and the user's session cookies.
//
// To keep the visual experience the user chose, this card mirrors the wallet
// layout: instructions + action buttons on one side, a pending wallet preview
// on the other. After the user clicks the bookmark on iam.gov.sa, the
// `persons` row is patched server-side and the parent re-renders into the
// post-sync state (handled by the Wallet card in SyncHub).

const C = { gold: '#B07D00', green: '#22c55e' }
const F = "'Cairo','Tajawal',sans-serif"
const HUB_CARD = {
  background: 'linear-gradient(180deg, #1d1d1d 0%, #181818 100%)',
  border: '1px solid rgba(255,255,255,.06)',
  borderRadius: 14,
  boxShadow: '0 4px 14px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.04)',
}

// Same ref trick used in SyncHub: React strips `javascript:` URLs by default,
// so we set href via DOM attribute after mount.
function BookmarkletDrag({ href, title, children, style }) {
  const ref = React.useRef(null)
  React.useEffect(() => { if (ref.current) ref.current.setAttribute('href', href) }, [href])
  return (
    <a
      ref={ref}
      title={title}
      onClick={e => e.preventDefault()}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '0 18px', height: 42, borderRadius: 11,
        background: C.gold, color: '#1a1a1a',
        textDecoration: 'none', fontFamily: F, fontSize: 13, fontWeight: 600,
        cursor: 'grab',
        boxShadow: `0 6px 18px ${C.gold}55, inset 0 1px 0 rgba(255,255,255,.3)`,
        ...style,
      }}>
      {children}
    </a>
  )
}

export default function NafathInAppLogin({ T, lang, operator }) {
  const href = React.useMemo(
    () => buildNafathBookmarklet({ personId: operator?.person_id || '', syncPersonId: operator?.id || '' }),
    [operator?.person_id, operator?.id],
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14, alignItems: 'stretch' }}>
      {/* ─── Action side ─── */}
      <div style={{ ...HUB_CARD, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14, borderColor: `${C.gold}55` }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--tx)', lineHeight: 1.3 }}>
            {T('وثّق هويتك من نفاذ', 'Verify your identity with Nafath')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 500, marginTop: 6, lineHeight: 1.7 }}>
            {T('بضغطتين سنسحب اسمك، هويتك، ميلادك، جنسيتك، جوّالك، جواز سفرك، وسجل دخولك للجهات الحكومية — مباشرة من نفاذ.',
               'In two clicks, we\'ll pull your name, ID, DOB, nationality, mobile, passport, and sign-in history at gov services — straight from Nafath.')}
          </div>
        </div>

        {/* Two big buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
          <BookmarkletDrag href={href}
            title={T('اسحب هذا الزر إلى شريط إشارات المتصفح — مرة واحدة فقط', 'Drag this button to your browser\'s bookmarks bar — one-time only')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 11c0-3.5 2.5-6 6-6 1.5 0 3 .5 4 1.5"/><path d="M12 11v10"/><path d="M6 7c-2 .5-4 2-4 4 0 3 3 5 7 5"/><circle cx="12" cy="6" r="3"/>
            </svg>
            {T('اسحب «نفاذ» للإشارات', 'Drag "Nafath" to bookmarks')}
          </BookmarkletDrag>

          <a href="https://www.iam.gov.sa/sso/" target="_blank" rel="noreferrer"
            title={T('افتح بوابة نفاذ الوطنية في تبويب جديد وسجّل دخول', 'Open the Nafath portal in a new tab and sign in')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '0 16px', height: 42, borderRadius: 11,
              background: 'rgba(255,255,255,.04)', color: 'var(--tx)',
              border: `1.5px solid ${C.gold}66`, textDecoration: 'none',
              fontFamily: F, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              transition: '.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `${C.gold}14`; e.currentTarget.style.borderColor = `${C.gold}aa` }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.04)'; e.currentTarget.style.borderColor = `${C.gold}66` }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            {T('افتح بوابة نفاذ', 'Open Nafath portal')}
          </a>
        </div>

        {/* Numbered walk-through */}
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { n: 1, t: T('اسحب الزر الذهبي «نفاذ» إلى شريط إشارات المتصفح (مرة واحدة فقط).',
                         'Drag the gold "Nafath" button to your bookmarks bar (one-time only).') },
            { n: 2, t: T('اضغط «افتح بوابة نفاذ»، سجّل دخول برقم الهوية وكلمة المرور.',
                         'Click "Open Nafath portal", then sign in with your ID and password.') },
            { n: 3, t: T('من شريط الإشارات اضغط «نفاذ» — تنسخ هويتك وسجلّك وترجع تلقائياً هنا.',
                         'From your bookmarks bar, click "Nafath" — your identity and history are captured and shown here.') },
          ].map(s => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 11px', borderRadius: 9, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.05)' }}>
              <span style={{
                width: 22, height: 22, borderRadius: '50%',
                background: `${C.gold}1A`, border: `1px solid ${C.gold}66`,
                color: C.gold, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600, flexShrink: 0, marginTop: 1,
              }}>{s.n}</span>
              <span style={{ fontSize: 12, color: 'var(--tx3)', lineHeight: 1.7, fontWeight: 500 }}>{s.t}</span>
            </div>
          ))}
        </div>

        {/* Why this approach */}
        <div style={{
          marginTop: 4, padding: '9px 12px',
          borderRadius: 8,
          background: 'rgba(176,125,0,.06)',
          border: '1px solid rgba(176,125,0,.18)',
          fontSize: 11, color: 'var(--tx4)', lineHeight: 1.7,
          display: 'flex', alignItems: 'flex-start', gap: 8,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <span>
            {T('بوابة نفاذ تقبل الطلبات من IP سعودي فقط، لذلك التحقق يتم من متصفّحك مباشرة. كلمة المرور لا تُرسل لخوادمنا أبداً — تُكتب على iam.gov.sa فقط.',
               'The Nafath portal accepts only Saudi IPs, so verification runs from your own browser. Your password never reaches our servers — it stays on iam.gov.sa.')}
          </span>
        </div>
      </div>

      {/* ─── Wallet preview side (pending) ─── */}
      <div style={{
        ...HUB_CARD, padding: 0, overflow: 'hidden',
        background: 'linear-gradient(140deg, #1d1d1d 0%, #181818 100%)',
        borderColor: `${C.gold}33`, position: 'relative',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ position: 'absolute', insetInlineEnd: -60, top: -60, width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle, ${C.gold}1A 0%, transparent 65%)`, pointerEvents: 'none' }} />

        <div style={{ position: 'relative', padding: '18px 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 9.5, fontWeight: 600, color: C.gold, letterSpacing: '1px', textTransform: 'uppercase' }}>
            {T('بطاقة نفاذ', 'Nafath Card')}
          </div>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${C.gold}1A`, border: `1px solid ${C.gold}55`, color: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 11c0-3.5 2.5-6 6-6 1.5 0 3 .5 4 1.5"/><circle cx="12" cy="6" r="3"/>
            </svg>
          </div>
        </div>

        <div style={{ position: 'relative', padding: '24px 18px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            T('الاسم', 'Name'),
            T('رقم الهوية', 'ID'),
            T('الميلاد', 'DOB'),
            T('الجنسية', 'Nationality'),
            T('الجوال', 'Mobile'),
          ].map(k => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
              <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--tx5)', letterSpacing: '.3px' }}>{k}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx5)', opacity: .55 }}>— — —</span>
            </div>
          ))}
        </div>

        <div style={{ position: 'relative', padding: '12px 18px', borderTop: '1px dashed rgba(255,255,255,.06)', fontSize: 9.5, fontWeight: 600, color: 'var(--tx5)', letterSpacing: '.5px', display: 'flex', justifyContent: 'space-between' }}>
          <span>{T('مصدر', 'Source')}: <b style={{ color: C.gold }}>iam.gov.sa</b></span>
          <span style={{ direction: 'ltr', fontFamily: 'ui-monospace, monospace' }}>...pending</span>
        </div>
      </div>
    </div>
  )
}
