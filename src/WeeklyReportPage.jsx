import React, { useState, useEffect, useCallback } from 'react'
const F="'Cairo','Tajawal',sans-serif"
const C={gold:'#c9a84c',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}
const num=v=>Number(v||0).toLocaleString('en-US')

export default function WeeklyReportPage({sb,toast,user,lang}){
const T=(a,e)=>lang==='ar'?a:e
const[reports,setReports]=useState([]);const[loading,setLoading]=useState(true)
const[selected,setSelected]=useState(null);const[generating,setGenerating]=useState(false)

const load=useCallback(async()=>{setLoading(true)
const{data}=await sb.from('weekly_reports').select('*').order('report_date',{ascending:false}).limit(20)
setReports(data||[]);if(data?.length>0&&!selected)setSelected(data[0]);setLoading(false)},[sb])
useEffect(()=>{load()},[load])

const generate=async()=>{setGenerating(true);try{
  const{data}=await sb.rpc('generate_weekly_report')
  toast(T('تم إنشاء التقرير ✓','Report generated ✓'));load()
}catch(e){toast(T('خطأ','Error'))}setGenerating(false)}

const markRead=async(id)=>{await sb.from('weekly_reports').update({is_read:true,read_by:user?.id,read_at:new Date().toISOString()}).eq('id',id);load()}

const r=selected
if(loading)return<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>
return<div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
<div><div style={{fontSize:22,fontWeight:800,color:'var(--tx)'}}>{T('التقرير الأسبوعي','Weekly Report')}</div>
<div style={{fontSize:12,color:'var(--tx4)',marginTop:4}}>{T('ملخص تنفيذي لأداء الأسبوع','Weekly executive performance summary')}</div></div>
<button onClick={generate} disabled={generating} style={{height:36,padding:'0 16px',borderRadius:8,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.1)',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer',opacity:generating?.6:1}}>
{generating?'...':T('إنشاء تقرير الآن','Generate Now')}</button></div>

<div style={{display:'flex',gap:16,minHeight:400}}>
{/* قائمة التقارير */}
<div style={{width:220,flexShrink:0,display:'flex',flexDirection:'column',gap:6}}>
{reports.map(rp=><div key={rp.id} onClick={()=>{setSelected(rp);if(!rp.is_read)markRead(rp.id)}}
style={{padding:'10px 14px',borderRadius:10,background:selected?.id===rp.id?'rgba(201,168,76,.06)':'var(--bg)',border:'1px solid '+(selected?.id===rp.id?'rgba(201,168,76,.15)':'var(--bd)'),cursor:'pointer',position:'relative'}}>
{!rp.is_read&&<div style={{position:'absolute',top:8,left:8,width:6,height:6,borderRadius:'50%',background:C.gold}}/>}
<div style={{fontSize:12,fontWeight:700,color:'var(--tx)'}}>{rp.week_start?.slice(5)} → {rp.week_end?.slice(5)}</div>
<div style={{fontSize:10,color:'var(--tx5)',marginTop:2}}>{rp.report_date}</div>
</div>)}
{reports.length===0&&<div style={{textAlign:'center',padding:30,color:'var(--tx5)',fontSize:11}}>{T('لا توجد تقارير','No reports')}</div>}
</div>

{/* تفاصيل التقرير */}
{r?<div style={{flex:1}}>
<div style={{fontSize:16,fontWeight:800,color:C.gold,marginBottom:16}}>
{T('أسبوع','Week')} {r.week_start?.slice(5)} → {r.week_end?.slice(5)}
{r.revenue_change_pct!==null&&<span style={{fontSize:12,fontWeight:700,color:r.revenue_change_pct>=0?C.ok:C.red,marginRight:8}}>{r.revenue_change_pct>=0?'↑':'↓'}{Math.abs(r.revenue_change_pct)}%</span>}
</div>

{/* المالي */}
<div style={{fontSize:13,fontWeight:700,color:'var(--tx3)',marginBottom:10}}>{T('الملخص المالي','Financial')}</div>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(160px,100%),1fr))',gap:10,marginBottom:20}}>
{[{l:T('الإيرادات','Revenue'),v:num(r.revenue),c:C.gold},{l:T('التحصيل','Collected'),v:num(r.collected),c:C.ok},{l:T('المصاريف','Expenses'),v:num(r.expenses),c:C.red},{l:T('صافي الربح','Net'),v:num(r.net_profit),c:Number(r.net_profit)>=0?C.ok:C.red}].map(s=>
<div key={s.l} style={{padding:'12px 14px',borderRadius:10,background:s.c+'08',border:'1px solid '+s.c+'15'}}>
<div style={{fontSize:10,color:s.c,opacity:.7}}>{s.l}</div>
<div style={{fontSize:18,fontWeight:800,color:s.c,marginTop:4}}>{s.v} <span style={{fontSize:9,opacity:.5}}>{T('ر.س','SAR')}</span></div>
</div>)}
</div>

{/* العمليات */}
<div style={{fontSize:13,fontWeight:700,color:'var(--tx3)',marginBottom:10}}>{T('العمليات','Operations')}</div>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(140px,100%),1fr))',gap:10,marginBottom:20}}>
{[{l:T('معاملات مكتملة','Completed'),v:r.transactions_completed,c:C.ok},{l:T('جديدة','New'),v:r.transactions_new,c:C.blue}].map(s=>
<div key={s.l} style={{padding:'12px 14px',borderRadius:10,background:'rgba(255,255,255,.03)',border:'1px solid var(--bd)'}}>
<div style={{fontSize:10,color:'var(--tx4)'}}>{s.l}</div>
<div style={{fontSize:20,fontWeight:800,color:s.c,marginTop:4}}>{s.v||0}</div></div>)}
</div>

{/* المخاطر */}
<div style={{fontSize:13,fontWeight:700,color:C.red,marginBottom:10}}>{T('تحذيرات','Warnings')}</div>
<div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:20}}>
{[{l:T('مستندات تنتهي خلال 7 أيام','Expiring docs 7d'),v:r.expiring_documents_7d},{l:T('فواتير متأخرة','Overdue invoices'),v:r.overdue_invoices,sub:num(r.overdue_invoices_amount)+T(' ر.س',' SAR')},{l:T('مهام غير مكتملة','Uncompleted tasks'),v:r.uncompleted_tasks}].filter(s=>s.v>0).map(s=>
<div key={s.l} style={{padding:'10px 14px',borderRadius:8,background:'rgba(192,57,43,.06)',border:'1px solid rgba(192,57,43,.1)',display:'flex',alignItems:'center',gap:8}}>
<div style={{fontSize:16,fontWeight:800,color:C.red,minWidth:30}}>{s.v}</div>
<div><div style={{fontSize:12,color:C.red}}>{s.l}</div>{s.sub&&<div style={{fontSize:10,color:'rgba(192,57,43,.5)'}}>{s.sub}</div>}</div>
</div>)}
{r.expiring_documents_7d===0&&r.overdue_invoices===0&&r.uncompleted_tasks===0&&<div style={{fontSize:12,color:C.ok,padding:12}}>✓ {T('لا توجد تحذيرات','No warnings')}</div>}
</div>

{/* أفضل موظف */}
{r.top_employee_name&&<div style={{padding:'12px 16px',borderRadius:10,background:'rgba(201,168,76,.04)',border:'1px solid rgba(201,168,76,.1)'}}>
<div style={{fontSize:11,color:C.gold,opacity:.7}}>{T('أفضل موظف هذا الأسبوع','Top Employee')}</div>
<div style={{fontSize:16,fontWeight:800,color:'var(--tx)',marginTop:4}}>🏆 {r.top_employee_name} <span style={{fontSize:12,color:C.gold}}>({r.top_employee_score} {T('نقطة','pts')})</span></div>
</div>}
</div>:<div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--tx5)'}}>{T('اختر تقرير','Select a report')}</div>}
</div>
</div>}
