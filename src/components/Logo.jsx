import React, { useId } from 'react'

/* شعار البرنامج — «الوسام الذهبي»: الـV المتموّج منقوشاً على وسام ذهبي مصمت.
   نفس الرسم في public/favicon.svg وأيقونات public/icons (مولّدة منه) — أي تعديل هنا يُنقل إليها. */

const G = '#B07D00', GL = '#DDB04A', GD = '#7E5A00'

const V_LEFT = 'M32.0,18.0 L32.5,19.6 L32.7,21.3 L32.9,23.1 L33.0,24.8 L33.2,26.5 L33.7,28.2 L34.5,29.6 L35.7,31.0 L37.3,32.2 L39.0,33.3 L40.9,34.4 L42.6,35.5 L44.1,36.7 L45.1,38.1 L45.5,39.8 L45.4,41.6 L44.7,43.7 L43.7,45.9 L42.5,48.2 L41.3,50.4 L40.5,52.5 L40.1,54.5 L40.4,56.2 L41.4,57.6 L42.9,58.8 L45.0,59.8 L47.3,60.7 L49.8,61.5 L52.0,62.5 L53.9,63.5 L55.3,64.8 L56.0,66.3 L56.3,68.0 L56.0,69.9 L55.5,71.9 L54.9,74.0 L54.3,76.0 L54.0,77.9 L54.0,79.7 L54.4,81.4 L55.1,82.9 L56.1,84.3 L57.2,85.7 L58.3,87.1 L59.3,88.5 L60.0,90.0'
const V_RIGHT = 'M88.0,18.0 L87.5,19.6 L87.3,21.3 L87.1,23.1 L87.0,24.8 L86.8,26.5 L86.3,28.2 L85.5,29.6 L84.3,31.0 L82.7,32.2 L81.0,33.3 L79.1,34.4 L77.4,35.5 L75.9,36.7 L74.9,38.1 L74.5,39.8 L74.6,41.6 L75.3,43.7 L76.3,45.9 L77.5,48.2 L78.7,50.4 L79.5,52.5 L79.9,54.5 L79.6,56.2 L78.6,57.6 L77.1,58.8 L75.0,59.8 L72.7,60.7 L70.2,61.5 L68.0,62.5 L66.1,63.5 L64.7,64.8 L64.0,66.3 L63.7,68.0 L64.0,69.9 L64.5,71.9 L65.1,74.0 L65.7,76.0 L66.0,77.9 L66.0,79.7 L65.6,81.4 L64.9,82.9 L63.9,84.3 L62.8,85.7 L61.7,87.1 L60.7,88.5 L60.0,90.0'

export function Logo({ size = 60, style: sx }) {
  const u = useId().replace(/:/g, '')
  return <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', flexShrink: 0, ...sx, border: 'none', background: 'none', boxShadow: 'none', borderRadius: 0 }}>
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" style={{ overflow: 'visible', filter: 'drop-shadow(0 6px 14px rgba(176,125,0,.16))' }}>
      <defs>
        <radialGradient id={u + 'm'} cx="42%" cy="36%" r="75%"><stop offset="0" stopColor={GL}/><stop offset=".6" stopColor={G}/><stop offset="1" stopColor={GD}/></radialGradient>
      </defs>
      <circle cx="60" cy="60" r="56" fill={`url(#${u}m)`}/>
      <circle cx="60" cy="60" r="49" fill="none" stroke="#FFF6DD" strokeWidth="1.2" opacity=".55"/>
      <g transform="translate(60 62) scale(.6) translate(-60 -54)">
        {[V_LEFT, V_RIGHT].map((d, i) => <path key={i} d={d} stroke="#FFF8E7" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>)}
      </g>
    </svg>
  </div>
}

export default Logo
