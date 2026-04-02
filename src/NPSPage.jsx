import React, { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
const F="'Cairo','Tajawal',sans-serif"
const C={gold:'#c9a84c',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}
const num=v=>Number(v||0).toLocaleString('en-US')

export default function NPSPage({sb,toast,user,lang}){
const T=(a,e)=>lang==='ar'?a:e
const[ratings,setRatings]=useState([]);const[summary,setSummary]=useState([]);const[loading,setLoading]=useState(true)
const[addPop,setAddPop]=useState(false);const[form,setForm]=useState({});const[saving,setSaving]=useState(false)
const[clients,setClients]=useState([])

const load=useCallback(async()=>{setLoading(true)
const[r,s,c]=await Promise.all([
  sb.from('customer_ratings').select('*,clients:client_id(name_ar)').order('created_at',{ascending:false}).limit(50),
  sb.from('v_customer_satisfaction').select('*').order('month',{ascending:false}).limit(12),
  sb.from('clients').select('id,name_ar').is('deleted_at',null).order('name_ar')
])
setRatings(r.data||[]);setSummary(s.data||[]);setClients(c.data||[]);setLoading(false)},[sb])
useEffect(()=>{load()},[load])

const saveRating=async()=>{setSaving(true);try{
  await sb.from('customer_ratings').insert({client_id:form.client_id||null,client_name:form.client_name||null,rating:Number(form.rating),feedback_text:form.feedback_text||null,feedback_category:form.feedback_category||null,service_type:form.service_type||null,source:'manual',assigned_user_id:user?.id,branch_id:user?.branch_id||null})
  toast(T('تم الحفظ','Saved'));setAddPop(false);load()
}catch(e){toast('خطأ')}setSaving(false)}

const stars=r=>'★'.repeat(r)+'☆'.repeat(5-r)
const avgRating=ratings.length>0?Math.round(ratings.reduce((s,r)=>s+r.rating,0)/ratings.length*10)/10:0
const nps=ratings.length>0?Math.round(100*ratings.filter(r=>r.rating>=4).length/ratings.length-100*ratings.filter(r=>r.rating<=2).length/ratings.length):0
const catLabels={speed:T('السرعة','Speed'),quality:T('الجودة','Quality'),communication:T('التواصل','Comm.'),pricing:T('التسعير','Pricing'),staff:T('الفريق','Staff'),other:T('أخرى','Other')}
const fS={width:'100%',height:40,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:F,fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',background:'rgba(255,255,255,.06)',textAlign:'right'}

if(loading)return<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>
return<div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
<div><div style={{fontSize:22,fontWeight:800,color:'var(--tx)'}}>{T('رضا العملاء','Customer Satisfaction')}</div>
<div style={{fontSize:12,color:'var(--tx4)',marginTop:4}}>{T('تقييمات العملاء ومؤشر NPS','Customer ratings & NPS score')}</div></div>
<button onClick={()=>{setForm({client_id:'',rating:5,feedback_text:'',feedback_category:'',service_type:''});setAddPop(true)}}
style={{height:36,padding:'0 16px',borderRadius:8,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.1)',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer'}}>+ {T('تقييم يدوي','Manual Rating')}</button></div>

{/* Summary */}
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(160px,100%),1fr))',gap:12,marginBottom:20}}>
<div style={{padding:'16px',borderRadius:12,background:'rgba(201,168,76,.06)',border:'1px solid rgba(201,168,76,.1)',textAlign:'center'}}>
<div style={{fontSize:32,fontWeight:800,color:C.gold}}>{avgRating}</div>
<div style={{fontSize:18,color:C.gold,letterSpacing:2}}>{stars(Math.round(avgRating))}</div>
<div style={{fontSize:10,color:'var(--tx4)'}}>{T('متوسط التقييم','Avg Rating')}</div></div>
<div style={{padding:'16px',borderRadius:12,background:nps>=50?'rgba(39,160,70,.06)':nps>=0?'rgba(201,168,76,.06)':'rgba(192,57,43,.06)',border:'1px solid '+(nps>=50?'rgba(39,160,70,.1)':nps>=0?'rgba(201,168,76,.1)':'rgba(192,57,43,.1)'),textAlign:'center'}}>
<div style={{fontSize:32,fontWeight:800,color:nps>=50?C.ok:nps>=0?C.gold:C.red}}>{nps}</div>
<div style={{fontSize:10,color:'var(--tx4)'}}>NPS Score</div></div>
<div style={{padding:'16px',borderRadius:12,background:'rgba(39,160,70,.06)',border:'1px solid rgba(39,160,70,.1)',textAlign:'center'}}>
<div style={{fontSize:32,fontWeight:800,color:C.ok}}>{ratings.filter(r=>r.rating>=4).length}</div>
<div style={{fontSize:10,color:'var(--tx4)'}}>{T('راضون','Promoters')}</div></div>
<div style={{padding:'16px',borderRadius:12,background:'rgba(192,57,43,.06)',border:'1px solid rgba(192,57,43,.1)',textAlign:'center'}}>
<div style={{fontSize:32,fontWeight:800,color:C.red}}>{ratings.filter(r=>r.rating<=2).length}</div>
<div style={{fontSize:10,color:'var(--tx4)'}}>{T('غير راضين','Detractors')}</div></div>
</div>

{/* التقييمات */}
<div style={{display:'flex',flexDirection:'column',gap:8}}>
{ratings.map(r=><div key={r.id} style={{padding:'12px 16px',borderRadius:12,background:'var(--bg)',border:'1px solid var(--bd)',display:'flex',alignItems:'center',gap:12}}>
<div style={{textAlign:'center',minWidth:50}}>
<div style={{fontSize:22,fontWeight:800,color:r.rating>=4?C.ok:r.rating>=3?C.gold:C.red}}>{r.rating}</div>
<div style={{fontSize:10,color:r.rating>=4?C.ok:r.rating>=3?C.gold:C.red}}>{stars(r.rating).slice(0,r.rating)}</div></div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:13,fontWeight:600,color:'var(--tx)'}}>{r.clients?.name_ar||r.client_name||T('عميل','Client')}</div>
{r.feedback_text&&<div style={{fontSize:11,color:'var(--tx3)',marginTop:4}}>"{r.feedback_text}"</div>}
<div style={{fontSize:10,color:'var(--tx5)',marginTop:4,display:'flex',gap:8}}>
{r.feedback_category&&<span style={{background:'rgba(255,255,255,.06)',padding:'1px 6px',borderRadius:3}}>{catLabels[r.feedback_category]||r.feedback_category}</span>}
<span>{new Date(r.created_at).toLocaleDateString(lang==='ar'?'ar':'en',{month:'short',day:'numeric'})}</span>
<span>{r.source}</span>
</div></div>
</div>)}
</div>

{addPop&&<div onClick={()=>setAddPop(false)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.8)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(460px,96vw)',display:'flex',flexDirection:'column',overflow:'hidden',border:'1px solid var(--bd)'}}>
<div style={{height:3,background:`linear-gradient(90deg,transparent,${C.gold},transparent)`}}/>
<div style={{padding:'16px 22px',borderBottom:'1px solid var(--bd)',fontSize:15,fontWeight:700,color:'var(--tx)'}}>{T('تقييم يدوي','Manual Rating')}</div>
<div style={{padding:'18px 22px',display:'flex',flexDirection:'column',gap:12}}>
<div><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('العميل','Client')}</div><select value={form.client_id||''} onChange={e=>setForm(p=>({...p,client_id:e.target.value}))} style={fS}><option value="">{T('اختر','Select')}</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name_ar}</option>)}</select></div>
<div><div style={{fontSize:11,color:'var(--tx4)',marginBottom:8}}>{T('التقييم','Rating')}</div>
<div style={{display:'flex',gap:8,justifyContent:'center'}}>{[1,2,3,4,5].map(n=><button key={n} onClick={()=>setForm(p=>({...p,rating:n}))} style={{width:44,height:44,borderRadius:10,border:'1.5px solid '+(form.rating>=n?C.gold+'50':'rgba(255,255,255,.1)'),background:form.rating>=n?'rgba(201,168,76,.1)':'transparent',color:form.rating>=n?C.gold:'var(--tx5)',fontSize:18,cursor:'pointer',fontFamily:F}}>{n}</button>)}</div></div>
<div><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('التصنيف','Category')}</div><select value={form.feedback_category||''} onChange={e=>setForm(p=>({...p,feedback_category:e.target.value}))} style={fS}><option value="">{T('اختياري','Optional')}</option>{Object.entries(catLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
<div><div style={{fontSize:11,color:'var(--tx4)',marginBottom:4}}>{T('ملاحظات العميل','Feedback')}</div><textarea value={form.feedback_text||''} onChange={e=>setForm(p=>({...p,feedback_text:e.target.value}))} rows={2} style={{...fS,height:'auto',padding:12,resize:'vertical'}}/></div>
</div>
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',flexDirection:'row-reverse'}}>
<button onClick={saveRating} disabled={saving} style={{height:40,padding:'0 24px',borderRadius:8,border:'1px solid rgba(201,168,76,.3)',background:'rgba(201,168,76,.12)',color:C.gold,fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer',opacity:saving?.6:1}}>{saving?'...':T('حفظ','Save')}</button>
<button onClick={()=>setAddPop(false)} style={{height:40,padding:'0 16px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:12,cursor:'pointer'}}>{T('إلغاء','Cancel')}</button>
</div></div></div>}
</div>}
