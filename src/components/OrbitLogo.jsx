import React, { useEffect, useId, useRef } from 'react'
import { Logo } from './Logo.jsx'

/* حركة الشعار — «الهالة المنقّطة» (اختيار المستخدم 2026-09-25 من سبعة تصاميم): عقدٌ من
   النقاط الذهبية يدور مائلاً حول الوسام. الإيهام الثلاثيّ: كل نقطةٍ تُرسم مرّتين — طبقةٌ
   **تحت** الوسام وطبقةٌ **فوقه** — وتظهر في إحداهما بحسب موضعها على المدار (الخلف أصغر
   وأخفت). الحركة بـrequestAnimationFrame على خصائص الـSVG مباشرةً بلا إعادة رسمٍ لـReact. */

const G = '#B07D00', GD = '#7E5A00'
// نصف قطر الرسم أكبر من الجسم: الزائد هالةٌ شفّافة تذوب فيها حافّةُ النقطة
const DOT_SOFT = 1.7

/* الوحدات: a/b نسبةٌ من نصف مساحة الرسم R، ونصف قطر الجسم `r` نسبةٌ من قطر الوسام */
const HALO = {
  id: 'halo', lines: [],
  bodies: Array.from({ length: 36 }, (_, i) => ({ a: 0.9, b: 0.3, tilt: -10, period: 12, phase: (i / 36) * Math.PI * 2, r: 0.02 })),
}

// نقطةٌ على مدارٍ بيضاويّ مائل
const pos = (o, th, R, c) => {
  const ph = (o.tilt * Math.PI) / 180
  const lx = o.a * R * Math.cos(th), ly = o.b * R * Math.sin(th)
  return [c + lx * Math.cos(ph) - ly * Math.sin(ph), c + lx * Math.sin(ph) + ly * Math.cos(ph)]
}

function OrbitScene({ d, size }) {
  const S = Math.round(size * 1.8), c = S / 2, R = S / 2
  const u = useId().replace(/:/g, '')
  const refs = useRef([])
  // كل جسمٍ يتفرّع إلى ذيله: نقاطٌ متأخّرةٌ عنه تصغر وتخفت
  const dots = []
  d.bodies.forEach((b) => {
    const n = b.trail || 0
    for (let k = 0; k <= n; k++) dots.push({ ...b, lagK: k, fade: n ? 1 - k / (n + 1) : 1 })
  })
  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    const t0 = performance.now()
    const draw = (now) => {
      const t = (now - t0) / 1000
      dots.forEach((b, i) => {
        const el = refs.current[i]
        if (!el) return
        const th = b.phase + (reduce ? 0 : (t / b.period) * Math.PI * 2) - b.lagK * (b.lag || 0)
        const [x, y] = pos(b, th, R, c)
        const depth = Math.sin(th)
        const front = depth > 0
        /* العمق **متّصلٌ** لا درجتان (بلاغ المستخدم 2026-10-02: النقاط تبدو متقطّعة عند الأمام
           والخلف): كانت الشفافية تقفز من .42 إلى 1 لحظة عبور النقطة طرفَي المدار. الآن الحجم
           والشفافية يتبعان منحنىً ناعماً (smoothstep) من أبعد الخلف إلى أقرب الأمام، فلا يُرى
           موضعُ التبديل بين الطبقتين — وهو يقع عند الطرفين خارج الوسام أصلاً. */
        const z = (depth + 1) / 2, e = z * z * (3 - 2 * z)
        const k = (0.62 + 0.58 * e) * (0.35 + 0.65 * b.fade)
        const tw = b.twinkle ? 0.55 + 0.45 * Math.sin(t * 3 + b.phase * 5) : 1
        const op = (0.3 + 0.7 * e) * b.fade * tw
        for (const [node, on] of [[el.back, !front], [el.front, front]]) {
          if (!node) continue
          node.setAttribute('cx', x.toFixed(2)); node.setAttribute('cy', y.toFixed(2))
          node.setAttribute('r', (b.r * size * k * DOT_SOFT).toFixed(2))
          node.style.opacity = on ? op : 0
        }
      })
      if (!reduce) raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [d.id, size])   // eslint-disable-line react-hooks/exhaustive-deps
  const half = (o, front) => {
    const [x1, y1] = pos(o, 0, R, c), [x2, y2] = pos(o, Math.PI, R, c)
    return `M${x1.toFixed(2)},${y1.toFixed(2)} A${(o.a * R).toFixed(2)},${(o.b * R).toFixed(2)} ${o.tilt} 0 ${front ? 1 : 0} ${x2.toFixed(2)},${y2.toFixed(2)}`
  }
  const layer = (front) => (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none', zIndex: front ? 3 : 1 }}>
      <defs>
        {/* نقطةٌ بحافّةٍ ناعمة: لبٌّ لامع ثم ذهبٌ يذوب إلى شفافية — يُغني عن `drop-shadow` لكل
            نقطة (36 مرشِّحاً يُعاد حسابها كل إطار كانت تُثقل الحركة فتتقطّع). */}
        <radialGradient id={u + (front ? 'f' : 'b')} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#FFF3C8"/><stop offset=".32" stopColor="#E3B955"/>
          <stop offset=".58" stopColor={G}/><stop offset=".72" stopColor={GD} stopOpacity=".55"/>
          <stop offset="1" stopColor={G} stopOpacity="0"/>
        </radialGradient>
      </defs>
      {d.lines.map((o, i) => (
        <path key={i} d={half(o, front)} fill="none" stroke={G} strokeLinecap="round"
          strokeWidth={o.band ? o.band * size : (front ? 1.3 : 1)}
          strokeOpacity={o.band ? (front ? 0.32 : 0.14) : o.faint ? (front ? 0.22 : 0.1) : (front ? 0.55 : 0.22)} />
      ))}
      {dots.map((b, i) => (
        <circle key={i} r={0} fill={`url(#${u}${front ? 'f' : 'b'})`}
          style={{ opacity: 0 }}
          ref={(n) => { refs.current[i] = refs.current[i] || {}; refs.current[i][front ? 'front' : 'back'] = n }} />
      ))}
    </svg>
  )
  return <div style={{ position: 'relative', width: S, height: S, flexShrink: 0, margin: '0 auto' }}>
    {layer(false)}
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
      <Logo size={size} style={{ margin: 0 }} />
    </div>
    {layer(true)}
  </div>
}

export function OrbitLogo({ size = 94 }) {
  return <OrbitScene d={HALO} size={size} />
}
