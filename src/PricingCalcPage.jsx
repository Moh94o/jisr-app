import React, { useState, useEffect, useCallback } from 'react'
const F="'Cairo','Tajawal',sans-serif"
const C={gold:'#c9a84c',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}
const num=v=>Number(v||0).toLocaleString('en-US')

export default function PricingCalcPage({sb,toast,user,lang}){
const T=(a,e)=>lang==='ar'?a:e
const[templates,setTemplates]=useState([]);const[fees,setFees]=useState([]);const[loading,setLoading]=useState(true)
const[selected,setSelected]=useState(null);const[commission,setCommission]=useState('')
const[result,setResult]=useState(null);const[customPrice,setCustomPrice]=useState('')
const[editPop,setEditPop]=useState(null);const[form,setForm]=useState({});const[saving,setSaving]=useState(false)

const load=useCallback(async()=>{setLoading(true)
const[t,f]=await Promise.all([sb.from('service_cost_templates').select('*').eq('is_active',true).order('service_code'),sb.from('gov_fees').select('*').eq('is_active',true).order('category')])
setTemplates(t.data||[]);setFees(f.data||[]);setLoading(false)},[sb])
useEffect(()=>{load()},[load])

const calculate=async(svc)=>{
  setSelected(svc);setResult(null);setCustomPrice('')
  const{data}=await sb.rpc('calculate_service_cost',{p_service_code:svc.service_code,p_commission:Number(commission)||0})
  if(data&&data[0])setResult(data[0])
}

const saveFee=async()=>{setSaving(true);try{
  if(editPop==='new'){await sb.from('gov_fees').insert({name_ar:form.name_ar,fee_code:form.fee_code,category:form.category||'other',amount:Number(form.amount),updated_by:user?.id})}
  else{await sb.from('gov_fees').update({amount:Number(form.amount),updated_by:user?.id,updated_at:new Date().toISOString()}).eq('id',editPop)}
  toast(T('تم الحفظ','Saved'));setEditPop(null);load()
}catch(e){toast('خطأ: '+e.message)}setSaving(false)}

const profitMargin=result&&customPrice?Math.round(100*(Number(customPrice)-Number(result.total_cost))/Number(customPrice)):null
const fS={width:'100%',height:40,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:F,fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',background:'rgba(255,255,255,.06)',textAlign:'right'}

if(loading)return<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>
return<div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
<div><div style={{fontSize:22,fontWeight:800,color:'var(--tx)'}}>{T('حاسبة التسعير','Pricing Calculator')}</div>
<div style={{fontSize:12,color:'var(--tx4)',marginTop:4}}>{T('حساب التكلفة والسعر المقترح لكل خدمة','Calculate cost & suggested price per service')}</div></div>
<div style={{display:'flex',gap:6}}>
<button onClick={()=>{setForm({name_ar:'',fee_code:'',category:'other',amount:''});setEditPop('new')}} style={{height:36,padding:'0 14px',borderRadius:8,border:'1px solid rgba(52,131,180,.2)',background:'rgba(52,131,180,.08)',color:C.blue,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer'}}>+ {T('رسم حكومي','New Fee')}</button>
</div></div>

{/* اختيار الخدمة */}
<div style={{marginBottom:16}}>
<div style={{fontSize:12,fontWeight:700,color:'var(--tx4)',marginBottom:8}}>{T('اختر نوع الخدمة','Select Service')}</div>
<div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
{templates.map(t=><button key={t.service_code} onClick={()=>calculate(t)}
style={{padding:'8px 16px',borderRadius:8,border:'1px solid '+(selected?.service_code===t.service_code?'rgba(201,168,76,.3)':'rgba(255,255,255,.1)'),background:selected?.service_code===t.service_code?'rgba(201,168,76,.08)':'transparent',color:selected?.service_code===t.service_code?C.gold:'var(--tx3)',fontFamily:F,fontSize:12,fontWeight:selected?.service_code===t.service_code?700:500,cursor:'pointer'}}>{t.name_ar}</button>)}
</div>
</div>

{/* عمولة الوسيط */}
<div style={{marginBottom:16,display:'flex',gap:12,alignItems:'flex-end',flexWrap:'wrap'}}>
<div><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('عمولة الوسيط','Broker Commission')} ({T('ر.س','SAR')})</div>
<input type="number" value={commission} onChange={e=>setCommission(e.target.value)} style={{...fS,width:160,direction:'ltr'}} placeholder="0"/></div>
{selected&&<button onClick={()=>calculate(selected)} style={{height:40,padding:'0 16px',borderRadius:8,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.1)',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer'}}>{T('حساب','Calculate')}</button>}
</div>

{/* النتيجة */}
{result&&<div style={{padding:'20px',borderRadius:14,background:'rgba(255,255,255,.02)',border:'1px solid var(--bd)',marginBottom:20}}>
<div style={{fontSize:14,fontWeight:800,color:C.gold,marginBottom:16}}>{selected?.name_ar} — {T('تفصيل التكلفة','Cost Breakdown')}</div>

{/* تفصيل الرسوم */}
<div style={{marginBottom:16}}>
{(JSON.parse(typeof result.fee_breakdown==='string'?result.fee_breakdown:'[]')||[]).map((f,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--bd2)'}}>
<span style={{fontSize:12,color:'var(--tx3)'}}>{f.name}</span>
<span style={{fontSize:12,fontWeight:700,color:'var(--tx)',direction:'ltr'}}>{num(f.amount)} {T('ر.س','SAR')}</span></div>)}
{Number(commission)>0&&<div style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--bd2)'}}>
<span style={{fontSize:12,color:'var(--tx3)'}}>{T('عمولة الوسيط','Commission')}</span>
<span style={{fontSize:12,fontWeight:700,color:'#e67e22',direction:'ltr'}}>{num(commission)} {T('ر.س','SAR')}</span></div>}
</div>

{/* الإجماليات */}
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(160px,100%),1fr))',gap:10,marginBottom:16}}>
<div style={{padding:'12px 14px',borderRadius:10,background:'rgba(192,57,43,.06)',border:'1px solid rgba(192,57,43,.1)'}}>
<div style={{fontSize:10,color:C.red,opacity:.7}}>{T('إجمالي التكلفة','Total Cost')}</div>
<div style={{fontSize:20,fontWeight:800,color:C.red,marginTop:4}}>{num(result.total_cost)}</div></div>
<div style={{padding:'12px 14px',borderRadius:10,background:'rgba(230,126,34,.06)',border:'1px solid rgba(230,126,34,.1)'}}>
<div style={{fontSize:10,color:'#e67e22',opacity:.7}}>{T('الحد الأدنى','Min Price')} ({selected?.min_profit_margin_pct||15}%)</div>
<div style={{fontSize:20,fontWeight:800,color:'#e67e22',marginTop:4}}>{num(result.min_price)}</div></div>
<div style={{padding:'12px 14px',borderRadius:10,background:'rgba(39,160,70,.06)',border:'1px solid rgba(39,160,70,.1)'}}>
<div style={{fontSize:10,color:C.ok,opacity:.7}}>{T('السعر المقترح','Suggested')} ({selected?.suggested_profit_margin_pct||25}%)</div>
<div style={{fontSize:20,fontWeight:800,color:C.ok,marginTop:4}}>{num(result.suggested_price)}</div></div>
</div>

{/* حاسبة السعر المخصص */}
<div style={{padding:'14px 16px',borderRadius:10,background:'rgba(201,168,76,.04)',border:'1px solid rgba(201,168,76,.1)'}}>
<div style={{fontSize:12,fontWeight:700,color:C.gold,marginBottom:8}}>{T('حاسبة السعر المخصص','Custom Price Calculator')}</div>
<div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
<div><div style={{fontSize:10,color:'var(--tx4)',marginBottom:4}}>{T('سعرك','Your Price')}</div>
<input type="number" value={customPrice} onChange={e=>setCustomPrice(e.target.value)} style={{...fS,width:140,direction:'ltr'}} placeholder="0"/></div>
{profitMargin!==null&&<div style={{padding:'10px 16px',borderRadius:8,background:profitMargin>0?(profitMargin>=15?C.ok+'12':'#e67e22'+'12'):C.red+'12',border:'1px solid '+(profitMargin>0?(profitMargin>=15?C.ok+'20':'#e67e22'+'20'):C.red+'20')}}>
<div style={{fontSize:10,color:profitMargin>=15?C.ok:profitMargin>0?'#e67e22':C.red}}>{T('هامش الربح','Margin')}</div>
<div style={{fontSize:20,fontWeight:800,color:profitMargin>=15?C.ok:profitMargin>0?'#e67e22':C.red}}>{profitMargin}%</div>
{profitMargin<0&&<div style={{fontSize:9,color:C.red}}>⚠ {T('خسارة!','Loss!')}</div>}
{profitMargin>=0&&profitMargin<15&&<div style={{fontSize:9,color:'#e67e22'}}>⚠ {T('أقل من الحد الأدنى','Below minimum')}</div>}
</div>}
<div style={{fontSize:11,color:'var(--tx4)'}}>
{customPrice&&result?T('الربح: ','Profit: ')+num(Number(customPrice)-Number(result.total_cost))+T(' ر.س',' SAR'):''}
</div></div>
</div>
</div>}

{/* جدول الرسوم الحكومية */}
<div style={{fontSize:13,fontWeight:700,color:'var(--tx3)',marginBottom:10}}>{T('الرسوم الحكومية المسجّلة','Government Fees')}</div>
<div style={{background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:12,overflow:'hidden'}}>
<table style={{width:'100%',borderCollapse:'collapse'}}>
<thead><tr>{[T('الرسم','Fee'),T('التصنيف','Category'),T('المبلغ','Amount'),''].map(h=><th key={h} style={{padding:'10px 12px',fontSize:11,fontWeight:700,color:'var(--tx3)',textAlign:'right',borderBottom:'1px solid var(--bd)'}}>{h}</th>)}</tr></thead>
<tbody>{fees.map(f=>{const catAr={commercial:T('تجاري','Commercial'),immigration:T('جوازات','Immigration'),labor:T('عمل','Labor'),insurance:T('تأمين','Insurance'),municipal:T('بلدي','Municipal'),other:T('أخرى','Other')};const catClr={commercial:C.gold,immigration:C.blue,labor:'#e67e22',insurance:'#9b59b6',municipal:'#1abc9c',other:'#888'};return<tr key={f.id} style={{borderBottom:'1px solid var(--bd2)'}}>
<td style={{padding:'8px 12px',fontSize:12,fontWeight:600,color:'var(--tx)'}}>{f.name_ar}</td>
<td style={{padding:'8px 12px'}}><span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:5,background:(catClr[f.category]||'#888')+'12',color:catClr[f.category]||'#888'}}>{catAr[f.category]||f.category}</span></td>
<td style={{padding:'8px 12px',fontSize:13,fontWeight:700,color:C.gold,direction:'ltr',textAlign:'left'}}>{num(f.amount)}</td>
<td style={{padding:'8px 12px'}}><button onClick={()=>{setForm({...f});setEditPop(f.id)}} style={{fontSize:9,padding:'2px 8px',borderRadius:4,border:'1px solid rgba(255,255,255,.1)',background:'transparent',color:'var(--tx4)',cursor:'pointer',fontFamily:F}}>✎</button></td>
</tr>})}</tbody></table>
{/* Total summary */}
<div style={{padding:'10px 14px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',alignItems:'center',background:'rgba(201,168,76,.03)'}}>
<span style={{fontSize:11,fontWeight:700,color:'var(--tx4)'}}>{T('إجمالي الرسوم الحكومية','Total Gov Fees')}</span>
<span style={{fontSize:14,fontWeight:800,color:C.gold}}>{num(fees.reduce((s,f)=>s+Number(f.amount||0),0))} {T('ر.س','SAR')}</span>
</div>
</div>

{/* Edit popup */}
{editPop&&<div onClick={()=>setEditPop(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.8)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(420px,96vw)',display:'flex',flexDirection:'column',overflow:'hidden',border:'1px solid var(--bd)'}}>
<div style={{height:3,background:`linear-gradient(90deg,transparent,${C.gold},transparent)`}}/>
<div style={{padding:'16px 22px',borderBottom:'1px solid var(--bd)',fontSize:15,fontWeight:700,color:'var(--tx)'}}>{editPop==='new'?T('رسم جديد','New Fee'):T('تعديل الرسم','Edit Fee')}</div>
<div style={{padding:'18px 22px',display:'flex',flexDirection:'column',gap:12}}>
<div><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('الاسم','Name')}</div><input value={form.name_ar||''} onChange={e=>setForm(p=>({...p,name_ar:e.target.value}))} style={fS}/></div>
{editPop==='new'&&<div><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('الكود','Code')}</div><input value={form.fee_code||''} onChange={e=>setForm(p=>({...p,fee_code:e.target.value}))} style={{...fS,direction:'ltr',fontFamily:'monospace'}} placeholder="TRANSFER_FEE"/></div>}
<div><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('المبلغ','Amount')} ({T('ر.س','SAR')})</div><input type="number" value={form.amount||''} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} style={{...fS,direction:'ltr'}}/></div>
</div>
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',flexDirection:'row-reverse'}}>
<button onClick={saveFee} disabled={saving} style={{height:40,padding:'0 24px',borderRadius:8,border:'1px solid rgba(201,168,76,.3)',background:'rgba(201,168,76,.12)',color:C.gold,fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer',opacity:saving?.6:1}}>{saving?'...':T('حفظ','Save')}</button>
<button onClick={()=>setEditPop(null)} style={{height:40,padding:'0 16px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:12,cursor:'pointer'}}>{T('إلغاء','Cancel')}</button>
</div></div></div>}
</div>}
