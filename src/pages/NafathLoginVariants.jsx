import React, { useState, useEffect, useRef } from 'react'

// Design lab — three visually distinct in-app Nafath login flows so the user
// can pick which one ships. All variants implement the same three steps:
//   1. Identity & password — enter ID number + Nafath password
//   2. OTP verification    — enter the code shown in the Nafath mobile app
//   3. Success             — identity is fetched and shown briefly
//
// No real backend is wired here. `onComplete` is called when the user reaches
// step 3 so the parent can swap in real data later.

const C = { gold: '#B07D00', green: '#22c55e', red: '#ef4444' }
const F = "'Cairo','Tajawal',sans-serif"
const HUB_CARD = {
  background: 'linear-gradient(180deg, #1d1d1d 0%, #181818 100%)',
  border: '1px solid rgba(255,255,255,.06)',
  borderRadius: 14,
  boxShadow: '0 4px 14px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.04)',
}

// Shared submit fake — simulates a 900ms request, then advances step.
function useFakeFlow(onComplete) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const submit = (delay = 900) => {
    setLoading(true); setError(null)
    setTimeout(() => {
      setLoading(false)
      if (step === 1) setStep(2)
      else if (step === 2) { setStep(3); onComplete?.() }
    }, delay)
  }
  const reset = () => { setStep(1); setError(null); setLoading(false) }
  return { step, loading, error, setError, submit, reset, setStep }
}

// ════════════════════════════════════════════════════════════════════
// VARIANT A — Classic stacked card
// One vertical card. Step 1 is a clean form. Step 2 reveals an OTP entry
// section below (the form fades to a summary). Step 3 shows a success
// banner. Familiar pattern, low cognitive load.
// ════════════════════════════════════════════════════════════════════
function ClassicVariant({ T, lang, operator, onComplete }) {
  const f = useFakeFlow(onComplete)
  const [id, setId] = useState(operator?.id_number || '')
  const [pwd, setPwd] = useState('')
  const [otp, setOtp] = useState('')

  return (
    <div style={{ ...HUB_CARD, padding: 0, overflow: 'hidden', borderColor: f.step === 3 ? '#22c55e44' : `${C.gold}55` }}>
      {/* Header */}
      <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px dashed rgba(255,255,255,.06)' }}>
        <div style={{ width: 42, height: 42, borderRadius: 11, background: `linear-gradient(135deg, ${C.gold}30, ${C.gold}08)`, border: `1.5px solid ${C.gold}55`, color: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--tx)' }}>{T('تسجيل دخول عبر نفاذ', 'Sign in via Nafath')}</div>
          <div style={{ fontSize: 11, color: 'var(--tx5)', fontWeight: 600, marginTop: 2 }}>
            {T('برقم الهوية وكلمة المرور', 'With your ID and password')}
          </div>
        </div>
      </div>

      {/* Body */}
      {f.step === 1 && (
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label={T('رقم الهوية', 'ID number')} value={id} onChange={setId} placeholder="1xxxxxxxxx" ltr mono maxLength={10} />
          <Field label={T('كلمة المرور في نفاذ', 'Nafath password')} value={pwd} onChange={setPwd} placeholder="••••••••" type="password" />
          <button disabled={f.loading || !id || !pwd}
            onClick={() => f.submit()}
            style={primaryBtn(f.loading || !id || !pwd)}>
            {f.loading ? T('جارٍ الإرسال...', 'Sending...') : T('إرسال رمز التحقق', 'Send verification code')}
          </button>
        </div>
      )}

      {f.step === 2 && (
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: '10px 13px', borderRadius: 8, background: `${C.gold}0E`, border: `1px solid ${C.gold}33`, fontSize: 11.5, color: 'var(--tx3)', lineHeight: 1.7, display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
            <span>{T('فتح تطبيق نفاذ واعرض الرمز المعروض على الشاشة. يبقى صالحاً لمدة دقيقتين.', 'Open the Nafath app and show the code displayed on screen. It is valid for 2 minutes.')}</span>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx4)', marginBottom: 8 }}>{T('رمز نفاذ', 'Nafath code')}</div>
            <OtpBoxes value={otp} onChange={setOtp} count={4} />
          </div>
          <button disabled={f.loading || otp.length < 4}
            onClick={() => f.submit()}
            style={primaryBtn(f.loading || otp.length < 4)}>
            {f.loading ? T('جارٍ التحقق...', 'Verifying...') : T('تأكيد ومتابعة', 'Confirm & continue')}
          </button>
        </div>
      )}

      {f.step === 3 && <SuccessPanel T={T} onReset={() => { f.reset(); setOtp('') }} />}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// VARIANT B — Side rail stepper
// Two columns. Right (in RTL) is a vertical numbered stepper highlighting
// progress. Left is the active step content. Feels guided & premium.
// ════════════════════════════════════════════════════════════════════
function StepperVariant({ T, lang, operator, onComplete }) {
  const f = useFakeFlow(onComplete)
  const [id, setId] = useState(operator?.id_number || '')
  const [pwd, setPwd] = useState('')
  const [otp, setOtp] = useState('')

  const steps = [
    { n: 1, title: T('الهوية وكلمة المرور', 'Identity & password'), desc: T('ابدأ بإدخال رقم هويتك وكلمة المرور.', 'Start by entering your ID and password.') },
    { n: 2, title: T('رمز التحقق', 'Verification code'), desc: T('أدخل الرمز المعروض في تطبيق نفاذ.', 'Enter the code shown in the Nafath app.') },
    { n: 3, title: T('اكتمل', 'Done'), desc: T('تم استيراد بياناتك ومزامنتها.', 'Your data has been imported and synced.') },
  ]

  return (
    <div style={{ ...HUB_CARD, padding: 0, overflow: 'hidden', display: 'grid', gridTemplateColumns: '210px 1fr', minHeight: 360, borderColor: f.step === 3 ? '#22c55e44' : 'rgba(255,255,255,.08)' }}>
      {/* Rail */}
      <div style={{ background: 'rgba(0,0,0,.18)', borderInlineEnd: '1px solid rgba(255,255,255,.05)', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx5)', letterSpacing: '.5px', textTransform: 'uppercase' }}>
          {T('توثيق نفاذ', 'Nafath verification')}
        </div>
        {steps.map(s => {
          const active = s.n === f.step
          const done = s.n < f.step
          const color = done ? C.green : active ? C.gold : 'var(--tx5)'
          return (
            <div key={s.n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', opacity: active || done ? 1 : .55, transition: '.2s' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', border: `1.5px solid ${done ? `${C.green}66` : active ? `${C.gold}88` : 'rgba(255,255,255,.1)'}`, background: done ? `${C.green}1A` : active ? `${C.gold}1A` : 'transparent', color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12, flexShrink: 0 }}>
                {done ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : s.n}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: active ? 'var(--tx)' : 'var(--tx3)' }}>{s.title}</div>
                <div style={{ fontSize: 10.5, color: 'var(--tx5)', fontWeight: 500, marginTop: 3, lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Content */}
      <div style={{ padding: '24px 26px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        {f.step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--tx)', letterSpacing: '-.2px' }}>{T('سجّل دخول نفاذ', 'Sign in to Nafath')}</div>
            <Field label={T('رقم الهوية', 'ID number')} value={id} onChange={setId} placeholder="1xxxxxxxxx" ltr mono maxLength={10} />
            <Field label={T('كلمة المرور', 'Password')} value={pwd} onChange={setPwd} placeholder="••••••••" type="password" />
            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
              <button disabled={f.loading || !id || !pwd}
                onClick={() => f.submit()}
                style={{ ...primaryBtn(f.loading || !id || !pwd), width: 'auto', padding: '0 22px' }}>
                {f.loading ? T('جارٍ الإرسال...', 'Sending...') : T('متابعة ←', 'Continue ←')}
              </button>
            </div>
          </div>
        )}

        {f.step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--tx)', letterSpacing: '-.2px' }}>{T('أدخل رمز التحقق', 'Enter verification code')}</div>
            <div style={{ fontSize: 12.5, color: 'var(--tx4)', lineHeight: 1.7 }}>
              {T('افتح تطبيق نفاذ في جوالك واعرض الرمز.', 'Open the Nafath app on your phone and show the code.')}
            </div>
            <OtpBoxes value={otp} onChange={setOtp} count={4} />
            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => { f.setStep(1); setOtp('') }}
                style={ghostBtn()}>
                {T('→ رجوع', '← Back')}
              </button>
              <button disabled={f.loading || otp.length < 4}
                onClick={() => f.submit()}
                style={{ ...primaryBtn(f.loading || otp.length < 4), width: 'auto', padding: '0 22px' }}>
                {f.loading ? T('جارٍ التحقق...', 'Verifying...') : T('تأكيد ←', 'Confirm ←')}
              </button>
            </div>
          </div>
        )}

        {f.step === 3 && <SuccessPanel T={T} onReset={() => { f.reset(); setOtp('') }} />}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// VARIANT C — Live identity wallet
// Left: form. Right: a "wallet card" preview that fills in as the user
// progresses. Visual feedback — the user sees what they're capturing.
// ════════════════════════════════════════════════════════════════════
function WalletVariant({ T, lang, operator, onComplete }) {
  const f = useFakeFlow(onComplete)
  const [id, setId] = useState(operator?.id_number || '')
  const [pwd, setPwd] = useState('')
  const [otp, setOtp] = useState('')
  const filled = f.step >= 3

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14, alignItems: 'stretch' }}>
      {/* Form */}
      <div style={{ ...HUB_CARD, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14, borderColor: f.step === 3 ? '#22c55e44' : 'rgba(255,255,255,.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 3].map(n => (
              <span key={n} style={{ width: f.step === n ? 18 : 6, height: 6, borderRadius: 999, background: f.step >= n ? (f.step === 3 ? C.green : C.gold) : 'rgba(255,255,255,.12)', transition: '.25s' }} />
            ))}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx5)', letterSpacing: '.3px' }}>
            {T(`خطوة ${Math.min(f.step, 3)} من 3`, `Step ${Math.min(f.step, 3)} of 3`)}
          </div>
        </div>

        {f.step === 1 && (
          <>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--tx)' }}>{T('من أنت في نفاذ؟', 'Who are you on Nafath?')}</div>
            <div style={{ fontSize: 12, color: 'var(--tx4)', lineHeight: 1.7, marginBottom: 4 }}>
              {T('سنستخدم بياناتك لمزامنة الهوية الرسمية وتفاصيل التأمينات والمنشآت.', 'We\'ll use your details to sync your official identity, GOSI status, and facilities.')}
            </div>
            <Field label={T('رقم الهوية', 'ID number')} value={id} onChange={setId} placeholder="1xxxxxxxxx" ltr mono maxLength={10} />
            <Field label={T('كلمة المرور', 'Password')} value={pwd} onChange={setPwd} placeholder="••••••••" type="password" />
            <button disabled={f.loading || !id || !pwd}
              onClick={() => f.submit()}
              style={{ ...primaryBtn(f.loading || !id || !pwd), marginTop: 'auto' }}>
              {f.loading ? T('جارٍ الإرسال...', 'Sending...') : T('إرسال رمز نفاذ', 'Send Nafath code')}
            </button>
          </>
        )}

        {f.step === 2 && (
          <>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--tx)' }}>{T('أدخل رمز نفاذ', 'Enter Nafath code')}</div>
            <div style={{ fontSize: 12, color: 'var(--tx4)', lineHeight: 1.7 }}>
              {T('الرمز معروض في تطبيق نفاذ بجوالك.', 'The code is shown in the Nafath app on your phone.')}
            </div>
            <OtpBoxes value={otp} onChange={setOtp} count={4} />
            <button disabled={f.loading || otp.length < 4}
              onClick={() => f.submit()}
              style={{ ...primaryBtn(f.loading || otp.length < 4), marginTop: 'auto' }}>
              {f.loading ? T('جارٍ التحقق...', 'Verifying...') : T('تحقّق', 'Verify')}
            </button>
          </>
        )}

        {f.step === 3 && <SuccessPanel T={T} compact onReset={() => { f.reset(); setOtp('') }} />}
      </div>

      {/* Wallet card preview */}
      <div style={{
        ...HUB_CARD,
        padding: 0,
        overflow: 'hidden',
        background: `linear-gradient(140deg, ${filled ? '#1a2c1d' : '#1d1d1d'} 0%, ${filled ? '#142119' : '#181818'} 100%)`,
        borderColor: filled ? '#22c55e55' : `${C.gold}33`,
        position: 'relative',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ position: 'absolute', insetInlineEnd: -60, top: -60, width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle, ${filled ? '#22c55e26' : `${C.gold}1A`} 0%, transparent 65%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', padding: '18px 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 9.5, fontWeight: 600, color: filled ? C.green : C.gold, letterSpacing: '1px', textTransform: 'uppercase' }}>
            {T('بطاقة نفاذ', 'Nafath Card')}
          </div>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${filled ? C.green : C.gold}1A`, border: `1px solid ${filled ? C.green : C.gold}55`, color: filled ? C.green : C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              {filled ? <polyline points="20 6 9 17 4 12"/> : <><path d="M12 11c0-3.5 2.5-6 6-6 1.5 0 3 .5 4 1.5"/><circle cx="12" cy="6" r="3"/></>}
            </svg>
          </div>
        </div>

        <div style={{ position: 'relative', padding: '24px 18px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <WalletRow label={T('الاسم', 'Name')} value={filled ? 'مهدي بن صالح بن محمد اليامي' : null} pending={!filled} />
          <WalletRow label={T('رقم الهوية', 'ID')} value={filled ? id || '1089150369' : (id || null)} pending={!id && !filled} mono />
          <WalletRow label={T('الميلاد', 'DOB')} value={filled ? '1994-12-27' : null} pending={!filled} mono />
          <WalletRow label={T('الجنسية', 'Nationality')} value={filled ? T('المملكة العربية السعودية', 'Saudi Arabia') : null} pending={!filled} />
        </div>

        <div style={{ position: 'relative', padding: '12px 18px', borderTop: '1px dashed rgba(255,255,255,.06)', fontSize: 9.5, fontWeight: 600, color: 'var(--tx5)', letterSpacing: '.5px', display: 'flex', justifyContent: 'space-between' }}>
          <span>{T('مصدر', 'Source')}: <b style={{ color: filled ? C.green : C.gold }}>iam.gov.sa</b></span>
          <span style={{ direction: 'ltr', fontFamily: 'ui-monospace, monospace' }}>{filled ? '✓ verified' : '...pending'}</span>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Shared bits
// ──────────────────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, type = 'text', ltr, mono, maxLength }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx4)' }}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        style={{
          height: 40, padding: '0 12px', borderRadius: 9,
          background: 'rgba(255,255,255,.03)',
          border: '1px solid rgba(255,255,255,.08)',
          color: 'var(--tx)', fontFamily: F, fontSize: 13, fontWeight: 600,
          direction: ltr ? 'ltr' : undefined,
          textAlign: ltr ? 'start' : undefined,
          ...(mono && { fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace' }),
          outline: 'none',
          transition: '.15s',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = `${C.gold}77`; e.currentTarget.style.background = 'rgba(255,255,255,.04)' }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)'; e.currentTarget.style.background = 'rgba(255,255,255,.03)' }}
      />
    </label>
  )
}

function OtpBoxes({ value, onChange, count = 4 }) {
  const refs = useRef([])
  const chars = value.split('').slice(0, count)
  const handle = (i, v) => {
    const next = value.split('')
    next[i] = (v || '').slice(-1)
    const joined = next.join('').slice(0, count)
    onChange(joined)
    if (v && i < count - 1) refs.current[i + 1]?.focus()
  }
  const back = (i, e) => {
    if (e.key === 'Backspace' && !chars[i] && i > 0) refs.current[i - 1]?.focus()
  }
  return (
    <div style={{ display: 'flex', gap: 10, direction: 'ltr', justifyContent: 'flex-start' }}>
      {Array.from({ length: count }).map((_, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          value={chars[i] || ''}
          onChange={e => handle(i, e.target.value)}
          onKeyDown={e => back(i, e)}
          maxLength={1}
          inputMode="numeric"
          style={{
            width: 52, height: 58, textAlign: 'center', fontSize: 24, fontWeight: 600,
            borderRadius: 11, background: 'rgba(255,255,255,.03)',
            border: `1.5px solid ${chars[i] ? `${C.gold}aa` : 'rgba(255,255,255,.08)'}`,
            color: 'var(--tx)', outline: 'none', fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            transition: '.15s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = `${C.gold}cc` }}
          onBlur={e => { e.currentTarget.style.borderColor = chars[i] ? `${C.gold}aa` : 'rgba(255,255,255,.08)' }}
        />
      ))}
    </div>
  )
}

function SuccessPanel({ T, compact, onReset }) {
  return (
    <div style={{ padding: compact ? '12px 0' : '36px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12, flex: 1, justifyContent: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,.16)', border: '2px solid rgba(34,197,94,.5)', color: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 24px rgba(34,197,94,.25)` }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--tx)' }}>{T('تمت المزامنة بنجاح', 'Sync complete')}</div>
      <div style={{ fontSize: 12, color: 'var(--tx4)', lineHeight: 1.7, maxWidth: 280 }}>
        {T('تم استيراد هويتك الكاملة وسجل دخولك من نفاذ. شاهد البطاقة لأعلى الصفحة.', 'Your full identity and sign-in history have been imported from Nafath. See the card above.')}
      </div>
      <button onClick={onReset}
        style={ghostBtn()}>
        {T('تجربة مرة أخرى', 'Run again')}
      </button>
    </div>
  )
}

function WalletRow({ label, value, pending, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
      <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--tx5)', letterSpacing: '.3px' }}>{label}</span>
      <span style={{
        fontSize: 12, fontWeight: 600, color: pending ? 'var(--tx5)' : 'var(--tx)',
        fontFamily: mono ? 'ui-monospace, monospace' : undefined,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        maxWidth: 200, textAlign: 'end',
        opacity: pending ? .55 : 1,
      }}>
        {value || '— — —'}
      </span>
    </div>
  )
}

const primaryBtn = (disabled) => ({
  width: '100%', height: 44, borderRadius: 10,
  background: disabled ? 'rgba(255,255,255,.05)' : C.gold,
  color: disabled ? 'var(--tx5)' : '#1a1a1a',
  border: 'none', fontFamily: F, fontSize: 13.5, fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  boxShadow: disabled ? 'none' : `0 6px 18px ${C.gold}55, inset 0 1px 0 rgba(255,255,255,.3)`,
  transition: '.15s',
})

const ghostBtn = () => ({
  height: 36, padding: '0 14px', borderRadius: 9,
  background: 'rgba(255,255,255,.04)', color: 'var(--tx3)',
  border: '1px solid rgba(255,255,255,.08)', fontFamily: F,
  fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: '.15s',
})

// ════════════════════════════════════════════════════════════════════
// Public component — switchable design lab
// ════════════════════════════════════════════════════════════════════
export default function NafathLoginVariants({ T, lang, operator, onComplete }) {
  const [variant, setVariant] = useState('a')
  const variants = [
    { id: 'a', label: T('كلاسيكي', 'Classic'),  desc: T('كرت واحد · بسيط', 'Single card · simple'),    el: ClassicVariant },
    { id: 'b', label: T('خطوات جانبية', 'Stepper'), desc: T('شريط جانبي مرقّم', 'Numbered side rail'),     el: StepperVariant },
    { id: 'c', label: T('بطاقة حية', 'Live wallet'),  desc: T('معاينة فورية للبيانات', 'Live data preview'), el: WalletVariant },
  ]
  const Active = variants.find(v => v.id === variant)?.el || ClassicVariant

  return (
    <div>
      {/* Variant switcher */}
      <div style={{
        ...HUB_CARD, padding: '10px 12px', marginBottom: 14,
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--tx5)', letterSpacing: '.5px', textTransform: 'uppercase', marginInlineEnd: 6 }}>
          {T('اختر التصميم', 'Pick a design')}
        </div>
        {variants.map(v => {
          const active = v.id === variant
          return (
            <button key={v.id} onClick={() => setVariant(v.id)}
              style={{
                padding: '8px 14px', borderRadius: 9,
                background: active ? `${C.gold}1A` : 'rgba(255,255,255,.025)',
                border: `1px solid ${active ? `${C.gold}77` : 'rgba(255,255,255,.06)'}`,
                color: active ? C.gold : 'var(--tx3)',
                fontFamily: F, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                lineHeight: 1.2, transition: '.15s',
              }}>
              <span>{v.label}</span>
              <span style={{ fontSize: 9.5, fontWeight: 600, color: active ? `${C.gold}cc` : 'var(--tx5)', textTransform: 'none', letterSpacing: 0 }}>{v.desc}</span>
            </button>
          )
        })}
      </div>

      <Active T={T} lang={lang} operator={operator} onComplete={onComplete} />
    </div>
  )
}
