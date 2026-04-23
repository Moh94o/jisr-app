import React from 'react'

// Reusable "official stamp" badge — 4 L-shape corners + light tilt.
// Parent must NOT use overflow:hidden, otherwise the corners get clipped.
//   <StampBadge>مسعرة</StampBadge>
//   <StampBadge color="#16a34a">معتمدة</StampBadge>
export default function StampBadge({children,color='#c9a84c',rotate=-7,fontSize=13,letterSpacing=3,padding='7px 20px'}){
  return<>
    <span className="stamp-badge" style={{position:'relative',display:'inline-block',padding,color,fontWeight:900,fontSize,letterSpacing:`${letterSpacing}px`,fontFamily:"'Cairo','Tajawal',sans-serif",transform:`rotate(${rotate}deg)`,opacity:.92,background:'transparent','--stamp-color':color,whiteSpace:'nowrap',lineHeight:1.15}}>
      <span className="stamp-badge__inner">{children}</span>
    </span>
    <StampBadgeStyles/>
  </>
}

// Injects the L-corner CSS once. Idempotent — multiple <StampBadge> on a page
// share the same stylesheet.
function StampBadgeStyles(){
  return<style>{`
.stamp-badge::before,.stamp-badge::after,
.stamp-badge .stamp-badge__inner::before,.stamp-badge .stamp-badge__inner::after{
  content:'';position:absolute;width:12px;height:12px;pointer-events:none;
}
.stamp-badge::before{
  top:-2px;right:-2px;
  border-top:2px solid var(--stamp-color,#c9a84c);
  border-right:2px solid var(--stamp-color,#c9a84c);
}
.stamp-badge::after{
  bottom:-2px;left:-2px;
  border-bottom:2px solid var(--stamp-color,#c9a84c);
  border-left:2px solid var(--stamp-color,#c9a84c);
}
.stamp-badge .stamp-badge__inner{position:static}
.stamp-badge .stamp-badge__inner::before{
  top:-2px;left:-2px;
  border-top:2px solid var(--stamp-color,#c9a84c);
  border-left:2px solid var(--stamp-color,#c9a84c);
}
.stamp-badge .stamp-badge__inner::after{
  bottom:-2px;right:-2px;
  border-bottom:2px solid var(--stamp-color,#c9a84c);
  border-right:2px solid var(--stamp-color,#c9a84c);
}
@media(max-width:600px){
  .stamp-badge{transform:rotate(-4deg)!important;letter-spacing:2px!important}
}
`}</style>
}
