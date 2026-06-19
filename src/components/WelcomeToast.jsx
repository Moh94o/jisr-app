import { useEffect, useRef, useState } from 'react'

// توست ترحيب راقٍ يظهر عند تسجيل الدخول بدل النافذة كاملة الشاشة.
// كرت زجاجي غامق · شارة ✓ خضراء متحركة · شريط تقدّم يعدّ للاختفاء.
function WelcomeToastCss() {
  return <style>{`
.wt{position:fixed;top:22px;left:50%;z-index:100001;transform:translate(-50%,-26px);opacity:0;
  display:flex;align-items:center;gap:13px;min-width:288px;max-width:calc(100vw - 28px);
  padding:13px 18px;border-radius:15px;cursor:pointer;overflow:hidden;
  background:linear-gradient(135deg,rgba(30,34,31,.97) 0%,rgba(18,20,18,.98) 100%);
  border:1px solid rgba(39,160,70,.40);
  box-shadow:0 14px 44px rgba(0,0,0,.5),0 0 34px rgba(39,160,70,.20),inset 0 1px 0 rgba(255,255,255,.06);
  -webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);
  font-family:'Reem Kufi','Cairo','Tajawal',sans-serif;
  transition:transform .5s cubic-bezier(.18,.89,.27,1),opacity .5s ease;}
.wt.wt-in{transform:translate(-50%,0);opacity:1;}
.wt-bar{position:absolute;left:0;bottom:0;height:3px;width:100%;transform-origin:left;
  background:linear-gradient(90deg,#34d068,#27a046);animation:wt-bar var(--wt-dur,3800ms) linear forwards;}
.wt-badge{position:relative;flex-shrink:0;width:38px;height:38px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  background:radial-gradient(circle at 50% 32%,#3ad874,#23973f 80%);
  box-shadow:0 3px 12px rgba(39,160,70,.5),inset 0 1px 0 rgba(255,255,255,.4);
  animation:wt-pop .55s cubic-bezier(.2,.85,.25,1) .08s both;}
.wt-check{stroke-dasharray:26;stroke-dashoffset:26;animation:wt-draw .5s ease .34s forwards;}
.wt-txt{display:flex;flex-direction:column;gap:2px;min-width:0;}
.wt-name{font-size:15.5px;font-weight:700;color:#fff;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:.2px;}
.wt-sub{font-family:'Cairo','Tajawal',sans-serif;font-size:11.5px;font-weight:500;color:rgba(255,255,255,.6);line-height:1.25;}
@keyframes wt-pop{0%{transform:scale(.35);opacity:0}60%{transform:scale(1.14)}100%{transform:scale(1);opacity:1}}
@keyframes wt-draw{to{stroke-dashoffset:0}}
@keyframes wt-bar{from{transform:scaleX(1)}to{transform:scaleX(0)}}
@media(prefers-reduced-motion:reduce){.wt,.wt-badge,.wt-check,.wt-bar{animation:none!important;transition:opacity .2s ease!important}.wt-check{stroke-dashoffset:0}}
`}</style>
}

export default function WelcomeToast({ name, lang = 'ar', onDone, duration = 3800 }) {
  const ar = lang === 'ar'
  const [show, setShow] = useState(false)
  const doneRef = useRef(false)
  const finish = () => { if (doneRef.current) return; doneRef.current = true; onDone && onDone() }

  useEffect(() => {
    const r = requestAnimationFrame(() => setShow(true))
    const t1 = setTimeout(() => setShow(false), duration)
    const t2 = setTimeout(finish, duration + 520)
    return () => { cancelAnimationFrame(r); clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const dismiss = () => { setShow(false); setTimeout(finish, 460) }
  const greet = ar ? 'أهلاً، ' : 'Welcome, '
  const sub = ar ? 'تم تسجيل دخولك بنجاح' : 'Signed in successfully'

  return (
    <div className={'wt' + (show ? ' wt-in' : '')} dir={ar ? 'rtl' : 'ltr'}
         style={{ ['--wt-dur']: duration + 'ms' }} onClick={dismiss} role="status" aria-live="polite">
      <WelcomeToastCss/>
      <div className="wt-badge">
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path className="wt-check" d="M5 12.5l4.4 4.4L19 7" stroke="#fff" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" pathLength="26"/>
        </svg>
      </div>
      <div className="wt-txt">
        <div className="wt-name">{greet}{name}</div>
        <div className="wt-sub">{sub}</div>
      </div>
      <div className="wt-bar"/>
    </div>
  )
}
