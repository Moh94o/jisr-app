// ─── زر الرجوع في الجوال (Android back / إيماءة الرجوع) ──────────────────────
// البرنامج صفحةٌ واحدة: بلا هذا الملف كان زرّ الرجوع في الجوال يُخرج المستخدم
// من البرنامج كلّه وهو داخل نافذةٍ أو تفاصيل. هنا نحجز قيداً في سجلّ المتصفّح،
// وكلّ رجوعٍ يُعطى لأعلى «معالج» مسجَّل: نافذة مفتوحة تُغلق، القائمة الجانبية
// تُطوى، تفاصيلُ لها زرّ رجوع ترجع، وإلا فالصفحة السابقة ثم الرئيسية. وفي
// الرئيسية بلا شيءٍ مفتوح يُترك الرجوع يعمل عمله الطبيعي (الخروج).
import { useEffect, useRef } from 'react'

const handlers = []          // مكدّس: الأحدث تسجيلاً (النافذة الأعلى) أوّلاً
let fallback = null          // معالج البرنامج الأخير (الصفحة السابقة/الرئيسية)
let armed = false
let installed = false
let lastHref = ''

const STATE = { jisrBack: 1 }

function arm() {
  if (armed) return
  try { history.pushState(STATE, '', location.href); armed = true } catch { /* ignore */ }
  lastHref = location.href
}

function onPop() {
  // تغيّر العنوان (رجوعٌ بين هاشات صفحةٍ تتنقّل بالهاش) ⇒ الصفحة تعالجه بنفسها
  if (location.href !== lastHref && !(history.state && history.state.jisrBack)) {
    lastHref = location.href
    armed = false
    arm()
    return
  }
  armed = false
  for (let i = handlers.length - 1; i >= 0; i--) {
    const h = handlers[i]
    if (h.fn() !== false) { arm(); return }
  }
  if (fallback && fallback() !== false) { arm(); return }
  // لا شيء يُرجَع إليه: نترك الرجوع التالي يُخرج من البرنامج
}

// يُستدعى مرةً من غلاف البرنامج بعد الدخول
export function installMobileBack(fb) {
  fallback = fb
  if (installed) return () => { fallback = null }
  installed = true
  window.addEventListener('popstate', onPop)
  arm()
  return () => { fallback = null }
}

// يعيد تسليح القيد بعد تنقّلٍ جديد (فتح صفحة بعد أن تُرك الرجوع يخرج)
export function rearmMobileBack() { if (installed) arm() }

// سجِّل معالجاً ما دام `active` صحيحاً. `fn` تُرجع false إن لم تعالج الرجوع.
export function useBackHandler(active, fn) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    if (!active) return
    const h = { fn: () => ref.current?.() }
    handlers.push(h)
    return () => { const i = handlers.indexOf(h); if (i >= 0) handlers.splice(i, 1) }
  }, [active])
}
