import React from 'react'
const F = "'Cairo','Tajawal',sans-serif"
export default function ServiceRequestPage({sb,toast,user,lang,branchId,onClose}){
  const isAr=lang!=='en'
  return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',fontFamily:F,direction:'rtl'}}>
    <div style={{textAlign:'center',color:'rgba(255,255,255,.4)',fontSize:14}}>{isAr?'قريباً...':'Coming soon...'}</div>
  </div>
}