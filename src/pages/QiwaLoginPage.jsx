import React, { useState, useEffect, useRef, useCallback } from 'react'
import { KeyRound, Eye, EyeOff, LogIn, ShieldCheck, ExternalLink, RefreshCw, Puzzle, CheckCircle2, MessageSquareText, Loader2, Download, Copy, Check } from 'lucide-react'
import { F, C, sF, Lbl, IdField } from '../components/ui/FormKit.jsx'

// «الدخول لقوى» — تسجيل الدخول لمنصة قوى من داخل جسر.
// الصفحة تجمع رقم الهوية وكلمة المرور ثم رمز الجوال، وتسلّمها لإضافة كروم
// (`qiwa-sync-extension`) عبر جسر الرسائل `bridge.js`؛ والإضافة هي التي تكتبها في
// صفحة دخول قوى نفسها داخل تبويبٍ خلفي ثم تفتح قوى مسجَّلة الدخول. صفحة ويب لا
// تستطيع وضع جلسة قوى في المتصفح بنفسها، فلا بديل عن الإضافة.
// كلمة المرور لا تُحفظ في أي مكان: تبقى في حالة المكوّن حتى تُرسَل ثم تُمسح.
const PAGE = 'jisr-app'
const EXT = 'jisr-qiwa-ext'
const LS_ID = 'jisr_qiwa_login_id'
// رابط الإضافة في متجر كروم — يُملأ بعد النشر (انظر qiwa-sync-extension/STORE.md).
// متى ما ضُبط، يظهر زر «تثبيت من المتجر» بدل زر التحميل اليدوي.
const STORE_URL = ''
// ملف الإضافة المُحزَّم، يُخدَم من public/ (يحدّثه `npm run pack:ext`). زرّ التحميل
// في بطاقة «الإضافة غير مفعّلة» يشير إليه، فيُثبّت الموظف كل شيء من داخل البرنامج.
const EXT_ZIP_URL = '/jisr-qiwa-login-extension.zip'

let seq = 0
// طلبٌ واحد = ردٌّ واحد. غياب الردّ خلال المهلة يعني أن الإضافة غير موجودة.
function callExt(type, payload, timeout = 90000) {
  return new Promise((resolve) => {
    const id = 'q' + Date.now() + '_' + (++seq)
    let settled = false
    const finish = (v) => { if (settled) return; settled = true; window.removeEventListener('message', onMsg); clearTimeout(timer); resolve(v) }
    const onMsg = (e) => {
      if (e.source !== window || e.origin !== window.location.origin) return
      const d = e.data
      if (!d || d.source !== EXT || d.replyTo !== id) return
      if (d.ok) finish(d.data || { state: 'error', code: 'no_answer' })
      else finish({ state: 'error', code: d.stale ? 'stale' : 'bridge', message: d.error })
    }
    window.addEventListener('message', onMsg)
    const timer = setTimeout(() => finish({ state: 'error', code: 'no_extension' }), timeout)
    window.postMessage({ source: PAGE, id, type, payload }, window.location.origin)
  })
}

const CARD = { background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 16, boxShadow: 'var(--shadow-md)', padding: 26 }
const BTN = { width: '100%', height: 44, border: 'none', borderRadius: 10, background: C.gold, color: '#fff', fontFamily: F, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: '.2s' }
const BTN_GHOST = { ...BTN, background: 'var(--sunken)', color: 'var(--tx2)' }
const LINK = { background: 'none', border: 'none', padding: 0, fontFamily: F, fontSize: 13, fontWeight: 600, color: C.gold, cursor: 'pointer' }

export default function QiwaLoginPage({ lang }) {
  const isAr = lang !== 'en'
  const T = (a, e) => (isAr ? a : e)

  const [ext, setExt] = useState('checking') // checking | missing | stale | ready
  const [step, setStep] = useState('creds')  // creds | otp | done | manual
  const [userId, setUserId] = useState(() => { try { return localStorage.getItem(LS_ID) || '' } catch { return '' } })
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [code, setCode] = useState('')
  const [otpLen, setOtpLen] = useState(4)
  const [sentTo, setSentTo] = useState('')
  const [busy, setBusy] = useState('')       // '' | login | otp | resend | open
  const [err, setErr] = useState('')
  const [note, setNote] = useState('')
  const [copied, setCopied] = useState(false)
  const copyCmd = async () => {
    try { await navigator.clipboard.writeText('chrome://extensions') } catch (e) {}
    setCopied(true); setTimeout(() => setCopied(false), 1600)
  }
  const stepRef = useRef(step)
  stepRef.current = step
  const otpRef = useRef(null)

  const ping = useCallback(async () => {
    setExt('checking')
    const r = await callExt('qiwa-login:ping', null, 1500)
    setExt(r.state === 'ready' ? 'ready' : r.code === 'stale' ? 'stale' : 'missing')
  }, [])
  useEffect(() => { ping() }, [ping])

  // مغادرة الصفحة أثناء انتظار الرمز تُغلق تبويب قوى الخلفي فلا يبقى معلّقاً.
  useEffect(() => () => { if (stepRef.current === 'otp') callExt('qiwa-login:cancel', null, 3000) }, [])
  useEffect(() => { if (step === 'otp' && !busy) otpRef.current?.focus() }, [step, busy])

  const errText = (r) => {
    const fromQiwa = r.message ? T('ردّ قوى: ', 'Qiwa: ') + r.message : ''
    switch (r.code) {
      case 'login': return fromQiwa || T('بيانات الدخول غير صحيحة', 'Invalid credentials')
      case 'locked': return fromQiwa || T('الحساب مقفل في قوى', 'The account is locked on Qiwa')
      case 'multiple_session': return fromQiwa || T('توجد جلسة أخرى نشطة لهذا الحساب في قوى', 'Another session is active for this account')
      case 'captcha': return T('طلبت قوى تحققًا إضافيًا بعد عدة محاولات — انتظر قليلًا ثم أعد المحاولة', 'Qiwa requested extra verification after several attempts — wait a bit and try again')
      case 'sms_unavailable': return fromQiwa || T('تعذّر على قوى إرسال رمز التحقق', 'Qiwa could not send the verification code')
      case 'refused': return fromQiwa || T('رمز التحقق غير صحيح', 'Wrong verification code')
      case 'expired': return fromQiwa || T('انتهت صلاحية الرمز — اطلب رمزًا جديدًا', 'The code expired — request a new one')
      case 'too_many': return fromQiwa || T('محاولات كثيرة — اطلب رمزًا جديدًا', 'Too many attempts — request a new code')
      case 'resend': return fromQiwa || T('تعذّر إرسال رمز جديد — حاول مرة أخرى', 'Could not resend the code — try again')
      case 'network': return T('تعذّر الاتصال بخادم قوى — تحقّق من الشبكة', 'Could not reach the Qiwa server — check the connection')
      case 'bad_input': return T('تحقّق من البيانات المدخلة', 'Check the entered values')
      case 'tab_closed': return T('انتهت جلسة الدخول — ابدأ من جديد', 'The sign-in session ended — start again')
      case 'busy': return T('عملية دخول أخرى جارية — انتظر لحظة', 'Another sign-in is in progress')
      case 'load_timeout': case 'redirected': case 'no_config': case 'injection_failed': case 'encode_failed':
        return T('تعذّر تجهيز صفحة قوى — أعد المحاولة', 'Could not prepare the Qiwa page — try again')
      default: return fromQiwa || T('لم يصل ردّ من قوى — حاول مرة أخرى', 'No answer from Qiwa — try again')
    }
  }

  const openQiwa = async () => {
    setBusy('open')
    const r = await callExt('qiwa-login:open', null, 15000)
    setBusy('')
    if (r.state === 'error' && (r.code === 'no_extension' || r.code === 'stale')) setExt(r.code === 'stale' ? 'stale' : 'missing')
  }

  const apply = (r) => {
    setBusy('')
    setNote('')
    if (r.state === 'error' && (r.code === 'no_extension' || r.code === 'stale' || r.code === 'bridge')) { setExt(r.code === 'stale' ? 'stale' : 'missing'); setStep('creds'); return }
    if (r.state === 'otp') { setPassword(''); setCode(''); setErr(''); setSentTo(r.sentTo || ''); setOtpLen(r.length || 4); setStep('otp'); return }
    if (r.state === 'otp_error') { setCode(''); setErr(errText(r)); return }
    if (r.state === 'done') { setPassword(''); setCode(''); setErr(''); setStep('done'); openQiwa(); return }
    if (r.state === 'manual') { setPassword(''); setCode(''); setErr(''); setStep('manual'); return }
    setCode(''); setStep('creds'); setErr(errText(r))
  }

  const canStart = ext === 'ready' && !busy && userId.trim().length >= 10 && password.length > 0
  const start = async () => {
    if (!canStart) return
    setBusy('login'); setErr('')
    try { localStorage.setItem(LS_ID, userId.trim()) } catch {}
    apply(await callExt('qiwa-login:start', { userId: userId.trim(), password }))
  }

  const submitOtp = async (val) => {
    const v = val ?? code
    if (busy || v.length !== otpLen) return
    setBusy('otp'); setErr('')
    apply(await callExt('qiwa-login:otp', { code: v }))
  }

  const resend = async () => {
    if (busy) return
    setBusy('resend'); setErr(''); setNote('')
    const r = await callExt('qiwa-login:resend', null, 15000)
    setBusy('')
    if (r.state !== 'otp') { apply(r); return }
    setCode('')
    setNote(r.resendLabel && r.resendLabel === r.resendBefore ? r.resendLabel : T('طُلب إرسال رمز جديد إلى الجوال', 'A new code was requested'))
  }

  const cancel = async () => {
    callExt('qiwa-login:cancel', null, 3000)
    setStep('creds'); setCode(''); setErr(''); setNote(''); setBusy('')
  }

  const reset = () => { setStep('creds'); setPassword(''); setCode(''); setErr(''); setNote('') }
  const onEnter = (fn) => (e) => { if (e.key === 'Enter') { e.preventDefault(); fn() } }
  const spin = <Loader2 size={16} strokeWidth={2.2} style={{ animation: 'ql-spin 1s linear infinite' }} />

  const steps = [
    { k: 'creds', l: T('بيانات الدخول', 'Credentials'), Icon: KeyRound },
    { k: 'otp', l: T('رمز الجوال', 'SMS code'), Icon: MessageSquareText },
    { k: 'done', l: T('قوى', 'Qiwa'), Icon: ShieldCheck },
  ]
  const stepIdx = step === 'manual' ? 2 : steps.findIndex((s) => s.k === step)

  return (
    <div style={{ fontFamily: F, paddingBottom: 60, color: 'var(--tx2)' }}>
      <style>{`@keyframes ql-spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ maxWidth: 460, marginInline: 'auto' }}>
        {/* العنوان والوصف فوق الكرت مباشرة، متوسّطان */}
        <div style={{ textAlign: 'center', marginTop: 10, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <KeyRound size={26} strokeWidth={1.8} style={{ color: C.gold, flexShrink: 0 }} />
            <div style={{ fontSize: 22, fontWeight: 600, color: C.gold, letterSpacing: '-.2px', lineHeight: 1 }}>{T('الدخول لقوى', 'Qiwa Login')}</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 10, lineHeight: 1.7 }}>
            {T('تسجيل الدخول إلى منصة قوى برقم الهوية وكلمة المرور ورمز الجوال', 'Sign in to Qiwa with the ID number, password and SMS code')}
          </div>
        </div>

        {ext === 'checking' && (
          <div style={{ ...CARD, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--tx3)', fontSize: 13, fontWeight: 600 }}>
            {spin}{T('جارٍ التحقق من إضافة المتصفح…', 'Checking the browser extension…')}
          </div>
        )}

        {(ext === 'missing' || ext === 'stale') && (
          <div style={CARD}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Puzzle size={22} strokeWidth={1.8} style={{ color: C.gold, flexShrink: 0 }} />
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--tx)' }}>
                {ext === 'stale' ? T('تم تحديث الإضافة', 'The extension was updated') : T('إضافة جسر لقوى غير مفعّلة في هذا المتصفح', 'The Jisr–Qiwa extension is not active in this browser')}
              </div>
            </div>
            {ext === 'stale' ? (
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx3)', lineHeight: 1.9 }}>{T('حدّث هذه الصفحة لإعادة الاتصال بالإضافة.', 'Refresh this page to reconnect to the extension.')}</div>
            ) : STORE_URL ? (
              <ol style={{ margin: 0, paddingInlineStart: 20, fontSize: 13, fontWeight: 500, color: 'var(--tx3)', lineHeight: 2 }}>
                <li>{T('ثبّت الإضافة من متجر كروم (بضغطة واحدة).', 'Install the extension from the Chrome Web Store (one click).')}</li>
                <li>{T('حدّث هذه الصفحة.', 'Refresh this page.')}</li>
                <li>{T('بعدها تدخل من هنا دائمًا — لا حاجة لتكرار التثبيت.', 'After that you sign in from here every time — no need to reinstall.')}</li>
              </ol>
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx3)', lineHeight: 1.7, marginBottom: 12 }}>
                  {T('ثبّتها مرة واحدة فقط على كمبيوترك، واتبع الخطوات:', 'Install it once on your computer, following these steps:')}
                </div>
                <ol style={{ margin: 0, paddingInlineStart: 20, fontSize: 13, fontWeight: 500, color: 'var(--tx3)', lineHeight: 2.1 }}>
                  <li>{T('اضغط «تحميل الإضافة» بالأسفل.', 'Click “Download the extension” below.')}</li>
                  <li>{T('افتح الملف المُحمَّل، واضغط «استخراج الكل» (Extract All). لا تحذف المجلد بعدها.', 'Open the downloaded file and “Extract All”. Don’t delete the folder afterward.')}</li>
                  <li>
                    {T('افتح كروم على العنوان: ', 'In Chrome, open: ')}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, verticalAlign: 'middle' }}>
                      <span dir="ltr" style={{ color: 'var(--tx)', fontWeight: 700, background: 'var(--sunken)', padding: '1px 6px', borderRadius: 5 }}>chrome://extensions</span>
                      <button type="button" onClick={copyCmd} title={copied ? T('تم النسخ', 'Copied') : T('نسخ', 'Copy')}
                        style={{ display: 'inline-flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: copied ? C.ok : C.gold, padding: '2px 4px' }}>
                        {copied ? <Check size={14} strokeWidth={2.5} /> : <Copy size={14} strokeWidth={2.2} />}
                      </button>
                    </span>
                  </li>
                  <li>{T('فعّل «وضع المطوّر / Developer mode» (أعلى اليمين).', 'Turn on “Developer mode” (top right).')}</li>
                  <li>{T('اضغط «تحميل غير مُحزَّمة / Load unpacked» واختر المجلد المُستخرَج.', 'Click “Load unpacked” and pick the extracted folder.')}</li>
                  <li>{T('ارجع هنا واضغط «أعد الفحص».', 'Come back here and click “Check again”.')}</li>
                </ol>
                <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--tx4)', lineHeight: 1.7, marginTop: 10 }}>
                  {T('لو ظهر عند فتح كروم تنبيه عن «إضافات وضع المطوّر» اضغط «إلغاء» ولا توقف الإضافة.', 'If Chrome shows a “developer mode extensions” warning at startup, click “Cancel” — don’t disable it.')}
                </div>
              </>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
              {ext !== 'stale' && (STORE_URL ? (
                <button onClick={() => window.open(STORE_URL, '_blank')} style={BTN}>
                  <Puzzle size={16} strokeWidth={2.2} />{T('تثبيت من متجر كروم', 'Install from Chrome Web Store')}
                </button>
              ) : (
                <a href={EXT_ZIP_URL} download style={{ ...BTN, textDecoration: 'none' }}>
                  <Download size={16} strokeWidth={2.2} />{T('تحميل الإضافة', 'Download the extension')}
                </a>
              ))}
              <button onClick={ext === 'stale' ? () => window.location.reload() : ping} style={BTN_GHOST}>
                <RefreshCw size={15} strokeWidth={2.2} />{ext === 'stale' ? T('تحديث الصفحة', 'Refresh page') : T('أعد الفحص', 'Check again')}
              </button>
            </div>
          </div>
        )}

        {ext === 'ready' && (
          <div style={CARD}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
              {steps.map((s, i) => {
                const on = i <= stepIdx
                return (
                  <React.Fragment key={s.k}>
                    {i > 0 && <div style={{ flex: 1, height: 2, borderRadius: 2, background: on ? C.gold : 'var(--bd)', transition: '.3s' }} />}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: on ? C.gold : 'var(--tx4)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', transition: '.3s' }}>
                      <s.Icon size={15} strokeWidth={2} />{s.l}
                    </div>
                  </React.Fragment>
                )
              })}
            </div>

            {step === 'creds' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} onKeyDown={onEnter(start)}>
                <IdField label={T('رقم الهوية', 'ID number')} value={userId} onChange={setUserId} silent disabled={!!busy} />
                <div>
                  <Lbl>{T('كلمة المرور', 'Password')}</Lbl>
                  <div style={{ position: 'relative' }}>
                    <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} disabled={!!busy}
                      dir="ltr" autoComplete="off" spellCheck={false}
                      style={{ ...sF, direction: 'ltr', paddingInline: 42, ...(busy ? { opacity: .5, cursor: 'not-allowed' } : {}) }} />
                    <button type="button" onClick={() => setShowPw((v) => !v)} tabIndex={-1} aria-label={T('إظهار كلمة المرور', 'Show password')}
                      style={{ position: 'absolute', insetInlineEnd: 8, top: 0, height: 42, width: 30, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {showPw ? <EyeOff size={17} strokeWidth={2} /> : <Eye size={17} strokeWidth={2} />}
                    </button>
                  </div>
                </div>
                {err && <div style={{ fontSize: 12.5, fontWeight: 600, color: C.red, lineHeight: 1.7, textAlign: 'start' }}>{err}</div>}
                <button onClick={start} disabled={!canStart} style={{ ...BTN, marginTop: 4, opacity: canStart ? 1 : .5, cursor: canStart ? 'pointer' : 'not-allowed' }}>
                  {busy === 'login' ? spin : <LogIn size={16} strokeWidth={2.2} />}
                  {busy === 'login' ? T('جارٍ الدخول…', 'Signing in…') : T('تسجيل الدخول', 'Sign in')}
                </button>
              </div>
            )}

            {step === 'otp' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 500, color: 'var(--tx3)', lineHeight: 1.9 }}>
                  {T('أُرسل رمز التحقق إلى الجوال', 'The verification code was sent to')}
                  {sentTo && <div dir="ltr" style={{ fontSize: 15, fontWeight: 600, color: 'var(--tx)', letterSpacing: '.5px' }}>{sentTo}</div>}
                </div>
                <input ref={otpRef} value={code} inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={otpLen} disabled={!!busy}
                  onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, otpLen); setCode(v); if (v.length === otpLen) submitOtp(v) }}
                  onKeyDown={onEnter(() => submitOtp())}
                  placeholder={'•'.repeat(otpLen)}
                  style={{ ...sF, height: 56, fontSize: 26, letterSpacing: '14px', direction: 'ltr', paddingInlineStart: 28, ...(busy ? { opacity: .5, cursor: 'not-allowed' } : {}) }} />
                {err && <div style={{ fontSize: 12.5, fontWeight: 600, color: C.red, lineHeight: 1.7, textAlign: 'center' }}>{err}</div>}
                {note && !err && <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tx3)', lineHeight: 1.7, textAlign: 'center' }}>{note}</div>}
                <button onClick={() => submitOtp()} disabled={!!busy || code.length !== otpLen} style={{ ...BTN, opacity: !busy && code.length === otpLen ? 1 : .5, cursor: !busy && code.length === otpLen ? 'pointer' : 'not-allowed' }}>
                  {busy === 'otp' ? spin : <ShieldCheck size={16} strokeWidth={2.2} />}
                  {busy === 'otp' ? T('جارٍ التحقق…', 'Verifying…') : T('تأكيد', 'Confirm')}
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button onClick={resend} disabled={!!busy} style={{ ...LINK, opacity: busy ? .5 : 1 }}>{busy === 'resend' ? T('جارٍ الطلب…', 'Requesting…') : T('إعادة إرسال الرمز', 'Resend code')}</button>
                  <button onClick={cancel} disabled={busy === 'otp'} style={{ ...LINK, color: 'var(--tx4)', opacity: busy === 'otp' ? .5 : 1 }}>{T('إلغاء', 'Cancel')}</button>
                </div>
              </div>
            )}

            {step === 'done' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
                <CheckCircle2 size={52} strokeWidth={1.6} style={{ color: C.ok }} />
                <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--tx)' }}>{T('تم الدخول إلى قوى', 'Signed in to Qiwa')}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx3)', lineHeight: 1.8 }}>{T('فُتحت منصة قوى في تبويب جديد', 'Qiwa was opened in a new tab')}</div>
                <button onClick={openQiwa} disabled={!!busy} style={{ ...BTN, marginTop: 8 }}>
                  {busy === 'open' ? spin : <ExternalLink size={16} strokeWidth={2.2} />}{T('فتح قوى', 'Open Qiwa')}
                </button>
                <button onClick={reset} style={{ ...LINK, color: 'var(--tx4)', marginTop: 4 }}>{T('دخول بحساب آخر', 'Sign in with another account')}</button>
              </div>
            )}

            {step === 'manual' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
                <ShieldCheck size={48} strokeWidth={1.6} style={{ color: C.gold }} />
                <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--tx)' }}>{T('قوى تطلب خطوة إضافية', 'Qiwa needs one more step')}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx3)', lineHeight: 1.8 }}>{T('أكملها في تبويب قوى الذي فُتح، ثم اضغط «فتح قوى»', 'Complete it in the Qiwa tab that was opened, then press Open Qiwa')}</div>
                <button onClick={async () => { await openQiwa(); setStep('done') }} disabled={!!busy} style={{ ...BTN, marginTop: 8 }}>
                  {busy === 'open' ? spin : <ExternalLink size={16} strokeWidth={2.2} />}{T('فتح قوى', 'Open Qiwa')}
                </button>
                <button onClick={cancel} style={{ ...LINK, color: 'var(--tx4)', marginTop: 4 }}>{T('البدء من جديد', 'Start over')}</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
