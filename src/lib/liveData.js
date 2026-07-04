// ════════════════════════════════════════════════════════════════════
// liveData — سرعة الصفحات الثقيلة (الفواتير · حسبة النقل · حسبة التجديد):
//
//  1) كاش «اعرض القديم وحدّث بالخلفية» (SWR): الصفحات تُفكَّك عند تبديل التبويب،
//     فبدل سكيلتون + انتظار الشبكة في كل زيارة، تُحفظ آخر نتيجة في خريطة على مستوى
//     الموديول وتُرسم فوراً عند العودة بينما يجري جلبٌ صامت يحدّثها.
//
//  2) تحديث تلقائي (useLiveRefresh): اشتراك Supabase Realtime على جداول الصفحة —
//     أي دفعة/فاتورة/إلغاء/استرجاع/معاملة (من هذا الجهاز أو غيره) تصل كإشارة
//     «تغيّر شيء» فتُعاد القراءة صامتاً بلا رفرش يدوي. مدعوم باحتياطيين:
//     حدث نافذة محلي (emitDataChanged) والعودة إلى التبويب بعد غياب طويل.
// ════════════════════════════════════════════════════════════════════
import { useEffect, useRef } from 'react'
import { getSupabase } from './supabase'

// ── كاش الجلسة (يعيش ما دام التطبيق مفتوحاً — لا يُخزَّن على القرص) ──
const cache = new Map()
export const swrGet = (key) => cache.get(key)
export const swrSet = (key, val) => { cache.set(key, val); return val }

// إبطال مجموعة مفاتيح بالبادئة — يُستدعى نادراً (مثلاً عند تسجيل خروج)
export const swrClear = (prefix = '') => {
  for (const k of [...cache.keys()]) if (!prefix || String(k).startsWith(prefix)) cache.delete(k)
}

// ── المكاتب التجريبية (branches.is_test) ──
// مكتب تجريبي/تعليمي: بياناته (فواتير/حسبات/مدفوعات وهمية) لا تدخل أي إجمالي أو
// إحصائية على مستوى «كل المكاتب»، ولا القوائم الافتراضية — تظهر فقط عند اختيار
// المكتب صراحةً. طبقة قاعدة البيانات تتكفّل بإحصاءات الفواتير وملخص الواتساب؛
// هذا المساعد يجلب معرّفات المكاتب التجريبية مرة واحدة (كاش الجلسة) لاستثنائها
// في استعلامات «كل المكاتب» على مستوى التطبيق (المدفوعات/الإيداعات/الحسبات…).
let _testBranchIdsP = null
export function getTestBranchIds(sb) {
  if (!_testBranchIdsP) {
    const c = sb || getSupabase()
    _testBranchIdsP = c.from('branches').select('id').eq('is_test', true).is('deleted_at', null)
      .then(r => (r.data || []).map(x => x.id))
      .catch(() => [])
  }
  return _testBranchIdsP
}
// فلتر PostgREST لاستبعاد المكاتب التجريبية مع الإبقاء على الصفوف بلا فرع (اليتيمة):
//   query.or(excludeTestBranchesOr(ids, 'branch_id'))
export const excludeTestBranchesOr = (ids, col = 'branch_id') =>
  `${col}.is.null,${col}.not.in.(${(ids || []).join(',')})`

// ── ناقل أحداث محلي: تأمين فوري بعد عمليات هذا الجهاز (لا ينتظر رحلة Realtime) ──
const BUS_EVENT = 'app-data-changed'
export const emitDataChanged = (...tables) => {
  try { window.dispatchEvent(new CustomEvent(BUS_EVENT, { detail: { tables } })) } catch {}
}

let chanSeq = 0

// useLiveRefresh(['invoices','payments'], cb) — ينادي cb (مهدّأً) كلما تغيّر أي جدول.
// cb يجب أن يكون جلباً صامتاً (بلا سبينر) حتى لا تومض الصفحة عند كل تحديث.
export function useLiveRefresh(tables, cb, { debounce = 500 } = {}) {
  const cbRef = useRef(cb)
  cbRef.current = cb
  const key = tables.join(',')

  useEffect(() => {
    const sb = getSupabase()
    if (!sb) return
    const list = key.split(',').filter(Boolean)
    let timer = null
    let lastSeen = Date.now()
    const fire = () => {
      clearTimeout(timer)
      timer = setTimeout(() => { lastSeen = Date.now(); cbRef.current?.() }, debounce)
    }

    // 1) Realtime: إشارة تغيّر من قاعدة البيانات (تشمل تعديلات المستخدمين الآخرين)
    let channel = null
    try {
      channel = sb.channel(`live-${key}-${++chanSeq}`)
      list.forEach(t => channel.on('postgres_changes', { event: '*', schema: 'public', table: t }, fire))
      channel.subscribe()
    } catch (e) { console.warn('[liveData] realtime unavailable', e) }

    // 2) حدث محلي بعد عمليات هذا الجهاز (دفعة/إلغاء/استرجاع/إنشاء…)
    const onBus = (e) => {
      const changed = e?.detail?.tables || []
      if (!changed.length || changed.some(t => list.includes(t))) fire()
    }
    window.addEventListener(BUS_EVENT, onBus)

    // 3) احتياط: عند العودة للتبويب بعد غياب > 60 ثانية أعد الجلب (لو فات حدثٌ ما)
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastSeen > 60_000) fire()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearTimeout(timer)
      window.removeEventListener(BUS_EVENT, onBus)
      document.removeEventListener('visibilitychange', onVisible)
      if (channel) { try { sb.removeChannel(channel) } catch {} }
    }
  }, [key, debounce])
}
