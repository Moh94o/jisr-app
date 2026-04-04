import React,{useState,useEffect,useCallback} from 'react'
const F="'Cairo','Tajawal',sans-serif"
const C={gold:'#c9a84c',ok:'#27a046',red:'#c0392b',blue:'#3483b4'}
const nm=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2})

const catMap={rent:'إيجار',utilities:'كهرباء/ماء',telecom:'إنترنت/اتصالات',maintenance:'صيانة',insurance:'تأمين',office_supplies:'مستلزمات مكتبية',supplies:'مستلزمات',transport:'مواصلات',marketing:'تسويق',legal:'قانوني',salary:'رواتب',salaries:'رواتب',gov_fee:'رسوم حكومية',government_fees:'رسوم حكومية',subscription:'اشتراكات',travel:'سفر',other:'أخرى'}
const getCatAr=(e)=>e.cat?.name_ar||catMap[e.category]||e.category||'أخرى'
const statusLabels={pending:'بانتظار السداد',paid:'تم السداد',confirmed:'تم التأكيد',rejected:'مرفوض'}
const statusColors={pending:C.gold,paid:C.blue,confirmed:C.ok,rejected:C.red}

export default function PaymentsPageNew({sb,toast,user,lang,branchId}){
const[tab,setTab]=useState('all')
const[expenses,setExpenses]=useState([])
const[extPayments,setExtPayments]=useState([])
const[opExpenses,setOpExpenses]=useState([])
const[payments,setPayments]=useState([])
const[bankData,setBankData]=useState([])
const[loading,setLoading]=useState(true)
const[q,setQ]=useState('')
const[detailItem,setDetailItem]=useState(null)
const[pop,setPop]=useState(null)
const[form,setForm]=useState({})
const[saving,setSaving]=useState(false)

const load=useCallback(async()=>{
setLoading(true)
const[ex,ep,op,ip,br]=await Promise.all([
sb.from('expenses').select('*,facilities:facility_id(name_ar)').is('deleted_at',null).order('created_at',{ascending:false}),
sb.from('external_payments').select('*,facilities:facility_id(name_ar)').is('deleted_at',null).order('created_at',{ascending:false}),
sb.from('operational_expenses').select('*,cat:expense_categories(id,name_ar,parent_type)').is('deleted_at',null).order('date',{ascending:false}),
sb.from('invoice_payments').select('*').is('deleted_at',null).order('payment_date',{ascending:false}),
sb.from('bank_reconciliation').select('*').is('deleted_at',null).order('transaction_date',{ascending:false})
])
setExpenses(ex.data||[]);setExtPayments(ep.data||[]);setOpExpenses(op.data||[]);setPayments(ip.data||[]);setBankData(br.data||[])
setLoading(false)
},[sb])
useEffect(()=>{load()},[load])

// All payment operations combined
const allOps=[
...expenses.map(e=>({...e,_src:'expense',_amt:Number(e.amount||0),_date:e.expense_date||e.payment_date,_desc:e.description||e.notes||e.expense_type,_status:e.payment_status||'paid',_who:null,_txRef:e.reference_number,_facility:e.facilities?.name_ar})),
...(opExpenses.filter(e=>(e.cat?.parent_type||'')!=='daily')).map(e=>({...e,_src:'op_expense',_amt:Number(e.amount||0),_date:e.date,_desc:e.description||e.vendor_name||getCatAr(e),_status:e.payment_status||'paid',_who:null,_txRef:e.payment_reference,_cat:getCatAr(e)})),
...extPayments.map(e=>({...e,_src:'external',_amt:Number(e.amount||0),_date:e.payment_date,_desc:e.payment_to||e.notes||e.payment_type,_status:e.payment_status||'paid',_who:null,_txRef:e.reference_number})),
...payments.filter(p=>p.payment_method==='bank_transfer').map(p=>({...p,_src:'invoice_pay',_amt:Number(p.amount||0),_date:p.payment_date,_desc:p.notes||'دفعة فاتورة'+(p.reference_number?' #'+p.reference_number:''),_status:p.payment_status||'paid',_who:null,_txRef:p.reference_number}))
]

// SMS verification: check if bank SMS exists for this payment
const dayMs=86400000
const isExpenseType=t=>t==='service_cost'||t==='operational'||t==='petty_cash'||t==='withdrawal'||t==='transfer_out'
const smsWithdrawals=bankData.filter(r=>isExpenseType(r.transaction_type))
const getSmsMatcher=(op)=>smsWithdrawals.find(s=>Math.abs(Number(s.amount||0)-op._amt)<=1&&op._date&&Math.abs(new Date(s.transaction_date)-new Date(op._date))<=dayMs)

// Suspicious: payments without any linked transaction
const suspiciousPayments=smsWithdrawals.filter(s=>{const amt=Number(s.amount||0);return amt>0&&!allOps.some(o=>Math.abs(o._amt-amt)<=1&&Math.abs(new Date(o._date)-new Date(s.transaction_date))<=dayMs)})

// Stats
const totalAll=allOps.reduce((s,o)=>s+o._amt,0)
const confirmedOps=allOps.filter(o=>getSmsMatcher(o))
const unconfirmedOps=allOps.filter(o=>!getSmsMatcher(o))

// Filter
const tabFiltered=tab==='all'?allOps:tab==='confirmed'?confirmedOps:tab==='unconfirmed'?unconfirmedOps:tab==='suspicious'?[]:allOps.filter(o=>o._src===tab)
const filtered=tabFiltered.filter(o=>!q||JSON.stringify(o).toLowerCase().includes(q.toLowerCase()))

// Confirm payment
const confirmPayment=async(op)=>{const table=op._src==='expense'?'expenses':op._src==='external'?'external_payments':op._src==='op_expense'?'operational_expenses':'invoice_payments'
await sb.from(table).update({payment_status:'confirmed',confirmed_by:user?.id,confirmed_at:new Date().toISOString()}).eq('id',op.id);toast('تم التأكيد');load()}

// Save forms
const saveOp=async()=>{setSaving(true);try{const d={...form};delete d._id;Object.keys(d).forEach(k=>{if(d[k]==='')d[k]=null});if(d.amount)d.amount=Number(d.amount);d.created_by=user?.id;await sb.from('operational_expenses').insert(d);toast('تم الحفظ');setPop(null);load()}catch(e){toast('خطأ')}setSaving(false)}

return<div style={{fontFamily:F,direction:'rtl'}}>
{/* Header */}
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
<div>
<div style={{fontSize:22,fontWeight:800,color:'var(--tx)'}}>المدفوعات والمصاريف</div>
<div style={{fontSize:11,color:'var(--tx5)',marginTop:4}}>متابعة عمليات السداد والتحقق من ربطها بالمعاملات</div>
</div>
<button onClick={()=>{setForm({amount:'',category:'other',description:'',date:new Date().toISOString().slice(0,10),payment_method:'cash',vendor_name:''});setPop('add')}} style={{height:34,padding:'0 16px',borderRadius:8,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.1)',color:C.gold,fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer'}}>+ إضافة مصروف</button>
</div>

{/* Warning: suspicious */}
{suspiciousPayments.length>0&&<div style={{padding:'14px 18px',borderRadius:12,background:'rgba(192,57,43,.06)',border:'1.5px solid rgba(192,57,43,.15)',marginBottom:14,display:'flex',alignItems:'center',gap:12}}>
<div style={{width:40,height:40,borderRadius:10,background:'rgba(192,57,43,.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,color:C.red,flexShrink:0}}>!</div>
<div style={{flex:1}}>
<div style={{fontSize:13,fontWeight:800,color:C.red}}>{suspiciousPayments.length} سحب بدون معاملة مسجلة</div>
<div style={{fontSize:10,color:'var(--tx5)',marginTop:2}}>عمليات سحب من البنك بدون مصروف أو فاتورة مرتبطة — إجمالي: {nm(suspiciousPayments.reduce((s,r)=>s+Number(r.amount||0),0))} ر.س</div>
</div>
<button onClick={()=>setTab('suspicious')} style={{height:30,padding:'0 12px',borderRadius:6,border:'1px solid rgba(192,57,43,.2)',background:'rgba(192,57,43,.08)',color:C.red,fontFamily:F,fontSize:9,fontWeight:700,cursor:'pointer'}}>عرض</button>
</div>}

{/* Stats */}
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:14}}>
{[[allOps.length,'إجمالي العمليات',C.gold,nm(totalAll)],[confirmedOps.length,'مؤكدة SMS',C.ok,nm(confirmedOps.reduce((s,o)=>s+o._amt,0))],[unconfirmedOps.length,'بدون تأكيد',unconfirmedOps.length>0?C.red:'var(--tx6)',nm(unconfirmedOps.reduce((s,o)=>s+o._amt,0))],[suspiciousPayments.length,'سحب مشبوه',suspiciousPayments.length>0?C.red:'var(--tx6)',nm(suspiciousPayments.reduce((s,r)=>s+Number(r.amount||0),0))]].map(([n,l,c,sub],i)=>
<div key={i} style={{padding:'12px 14px',borderRadius:10,background:c+'08',border:'1px solid '+c+'12',textAlign:'center'}}>
<div style={{fontSize:8,color:c}}>{l}</div>
<div style={{fontSize:20,fontWeight:900,color:c}}>{n}</div>
<div style={{fontSize:8,color:'var(--tx6)',marginTop:2}}>{sub} ر.س</div>
</div>)}
</div>

{/* Tabs */}
<div style={{display:'flex',gap:4,marginBottom:12,flexWrap:'wrap'}}>
{[['all','الكل',allOps.length],['confirmed','مؤكدة',confirmedOps.length],['unconfirmed','بدون تأكيد',unconfirmedOps.length],['suspicious','مشبوهة',suspiciousPayments.length],['invoice_pay','دفعات فواتير',allOps.filter(o=>o._src==='invoice_pay').length],['op_expense','مصاريف تشغيلية',allOps.filter(o=>o._src==='op_expense').length],['external','حوالات خارجية',allOps.filter(o=>o._src==='external').length]].map(([k,l,n])=>
<button key={k} onClick={()=>setTab(k)} style={{height:30,padding:'0 10px',borderRadius:7,border:'1px solid '+(tab===k?'rgba(201,168,76,.2)':'rgba(255,255,255,.05)'),background:tab===k?'rgba(201,168,76,.06)':'transparent',color:tab===k?C.gold:'var(--tx5)',fontFamily:F,fontSize:9,fontWeight:tab===k?700:500,cursor:'pointer'}}>{l} <span style={{opacity:.5}}>({n})</span></button>)}
</div>

{/* Search */}
<input value={q} onChange={e=>setQ(e.target.value)} placeholder="بحث بالوصف أو المبلغ أو المرجع..." style={{width:'100%',height:36,padding:'0 14px',border:'1px solid rgba(255,255,255,.08)',borderRadius:8,fontFamily:F,fontSize:11,color:'var(--tx)',background:'rgba(255,255,255,.03)',outline:'none',marginBottom:12,boxSizing:'border-box'}}/>

{/* List */}
{loading?<div style={{textAlign:'center',padding:50,color:'var(--tx5)'}}>...</div>:
tab==='suspicious'?<div style={{display:'flex',flexDirection:'column',gap:6}}>
<div style={{fontSize:12,fontWeight:700,color:C.red,marginBottom:6}}>سحوبات بدون معاملة مسجلة</div>
{suspiciousPayments.map(s=><div key={s.id} style={{padding:'12px 16px',borderRadius:10,background:'rgba(192,57,43,.03)',border:'1px solid rgba(192,57,43,.1)',display:'flex',alignItems:'center',gap:12}}>
<div style={{width:8,height:8,borderRadius:'50%',background:C.red,flexShrink:0}}/>
<div style={{flex:1}}>
<div style={{fontSize:12,fontWeight:700,color:C.red}}>{s.description?s.description.substring(0,60):'سحب غير مبرر'}</div>
<div style={{fontSize:9,color:'var(--tx5)',marginTop:2}}>{s.transaction_date} · {s.bank_name||''}{s.otp_message_id?' · 📱 SMS':''}</div>
</div>
<div style={{fontSize:16,fontWeight:800,color:C.red,direction:'ltr'}}>-{nm(s.amount)}</div>
</div>)}
{suspiciousPayments.length===0&&<div style={{textAlign:'center',padding:40,color:'var(--tx6)'}}>لا توجد عمليات مشبوهة</div>}
</div>
:filtered.length===0?<div style={{textAlign:'center',padding:50,color:'var(--tx6)'}}>لا توجد عمليات</div>:
<div style={{display:'flex',flexDirection:'column',gap:4}}>
{filtered.slice(0,50).map((op,i)=>{
const smsMatch=getSmsMatcher(op)
const sc=statusColors[op._status]||'var(--tx6)'
return<div key={op.id||i} onClick={()=>setDetailItem(op)} style={{padding:'12px 16px',borderRadius:10,background:'rgba(255,255,255,.015)',border:'1px solid rgba(255,255,255,.04)',display:'flex',alignItems:'center',gap:12,cursor:'pointer',transition:'.1s'}} onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(201,168,76,.12)'} onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,255,255,.04)'}>
{/* Status dot */}
<div style={{width:8,height:8,borderRadius:'50%',background:smsMatch?C.ok:C.red,flexShrink:0}}/>
{/* Info */}
<div style={{flex:1,minWidth:0}}>
<div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
<span style={{fontSize:12,fontWeight:700,color:'var(--tx)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{op._desc}</span>
<span style={{fontSize:8,fontWeight:600,padding:'2px 6px',borderRadius:4,background:sc+'15',color:sc,flexShrink:0}}>{statusLabels[op._status]||op._status}</span>
{smsMatch&&<span style={{fontSize:7,color:'#9b59b6',flexShrink:0}}>📱</span>}
</div>
<div style={{display:'flex',gap:8,fontSize:9,color:'var(--tx6)'}}>
{op._date&&<span>{op._date}</span>}
{op._txRef&&<span>#{op._txRef}</span>}
{op._facility&&<span>{op._facility}</span>}
{op._cat&&<span>{op._cat}</span>}
<span style={{color:'var(--tx6)',opacity:.5}}>{op._src==='invoice_pay'?'دفعة فاتورة':op._src==='external'?'حوالة خارجية':op._src==='op_expense'?'مصروف تشغيلي':'مصروف'}</span>
</div>
</div>
{/* Amount */}
<div style={{fontSize:15,fontWeight:800,color:C.red,direction:'ltr',flexShrink:0}}>-{nm(op._amt)}</div>
{/* Confirm button */}
{!smsMatch&&op._status!=='confirmed'&&<button onClick={e=>{e.stopPropagation();confirmPayment(op)}} style={{height:26,padding:'0 8px',borderRadius:5,border:'1px solid rgba(39,160,70,.15)',background:'rgba(39,160,70,.06)',color:C.ok,fontFamily:F,fontSize:8,fontWeight:700,cursor:'pointer',flexShrink:0}}>تأكيد</button>}
</div>})}
{filtered.length>50&&<div style={{fontSize:9,color:'var(--tx6)',textAlign:'center',padding:8}}>+{filtered.length-50} عملية أخرى</div>}
</div>}

{/* Detail Modal */}
{detailItem&&<div onClick={()=>setDetailItem(null)} style={{position:'fixed',inset:0,background:'rgba(10,10,10,.85)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'#1e1e1e',borderRadius:16,width:'min(480px,94vw)',maxHeight:'85vh',overflow:'auto',border:'1px solid rgba(201,168,76,.1)',direction:'rtl',fontFamily:F}}>
<div style={{height:3,background:'linear-gradient(90deg,transparent,'+C.gold+',transparent)'}}/>
<div style={{padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,.05)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<div style={{fontSize:16,fontWeight:800,color:'var(--tx)'}}>تفاصيل العملية</div>
<button onClick={()=>setDetailItem(null)} style={{width:30,height:30,borderRadius:8,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',color:'var(--tx5)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>×</button>
</div>
<div style={{padding:'16px 20px'}}>
{/* Amount */}
<div style={{textAlign:'center',padding:'16px 0',marginBottom:16,borderRadius:12,background:'rgba(192,57,43,.04)',border:'1px solid rgba(192,57,43,.08)'}}>
<div style={{fontSize:28,fontWeight:900,color:C.red,direction:'ltr'}}>-{nm(detailItem._amt)} <span style={{fontSize:12}}>ر.س</span></div>
</div>
{/* Status */}
<div style={{display:'flex',justifyContent:'center',gap:8,marginBottom:16}}>
{['pending','paid','confirmed'].map(s=><div key={s} style={{display:'flex',alignItems:'center',gap:4}}>
<div style={{width:20,height:20,borderRadius:'50%',border:'2px solid '+(detailItem._status===s||(['paid','confirmed'].includes(detailItem._status)&&s==='pending')||detailItem._status==='confirmed'&&s==='paid'?statusColors[s]:'rgba(255,255,255,.1)'),background:detailItem._status===s||(['paid','confirmed'].includes(detailItem._status)&&s==='pending')||detailItem._status==='confirmed'&&s==='paid'?statusColors[s]+'20':'transparent',display:'flex',alignItems:'center',justifyContent:'center'}}>
{(detailItem._status===s||(s==='pending'&&detailItem._status!=='pending')||(s==='paid'&&detailItem._status==='confirmed'))&&<div style={{width:8,height:8,borderRadius:'50%',background:statusColors[s]}}/>}
</div>
<span style={{fontSize:9,color:detailItem._status===s?statusColors[s]:'var(--tx6)'}}>{statusLabels[s]}</span>
{s!=='confirmed'&&<div style={{width:20,height:1,background:'rgba(255,255,255,.1)'}}/>}
</div>)}
</div>
{/* Info */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
{[['الوصف',detailItem._desc],['التاريخ',detailItem._date],['المرجع',detailItem._txRef],['المنشأة',detailItem._facility],['التصنيف',detailItem._cat||getCatAr(detailItem)],['النوع',detailItem._src==='invoice_pay'?'دفعة فاتورة':detailItem._src==='external'?'حوالة خارجية':'مصروف']].filter(([,v])=>v).map(([l,v],i)=>
<div key={i} style={{padding:'8px 10px',borderRadius:8,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.04)'}}>
<div style={{fontSize:8,color:'var(--tx6)',marginBottom:3}}>{l}</div>
<div style={{fontSize:11,fontWeight:600,color:'var(--tx3)'}}>{v}</div>
</div>)}
</div>
{/* SMS match */}
{(()=>{const m=getSmsMatcher(detailItem);return m?<div style={{padding:'10px 14px',borderRadius:8,background:'rgba(39,160,70,.03)',border:'1px solid rgba(39,160,70,.08)',marginBottom:16}}>
<div style={{fontSize:10,fontWeight:700,color:C.ok,marginBottom:4}}>📱 مؤكدة — رسالة بنكية مطابقة</div>
<div style={{fontSize:9,color:'var(--tx5)'}}>المبلغ: {nm(m.amount)} · التاريخ: {m.transaction_date} · البنك: {m.bank_name||'—'}</div>
</div>:<div style={{padding:'10px 14px',borderRadius:8,background:'rgba(192,57,43,.03)',border:'1px solid rgba(192,57,43,.08)',marginBottom:16}}>
<div style={{fontSize:10,fontWeight:700,color:C.red}}>بدون تأكيد SMS</div>
<div style={{fontSize:9,color:'var(--tx5)'}}>لم يتم العثور على رسالة بنكية مطابقة</div>
</div>})()}
{/* Actions */}
{detailItem._status!=='confirmed'&&<button onClick={()=>{confirmPayment(detailItem);setDetailItem(null)}} style={{width:'100%',height:40,borderRadius:10,border:'1px solid rgba(39,160,70,.2)',background:'rgba(39,160,70,.1)',color:C.ok,fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer'}}>تأكيد العملية يدوياً</button>}
</div>
</div>
</div>}

{/* Add modal */}
{pop&&<div onClick={()=>setPop(null)} style={{position:'fixed',inset:0,background:'rgba(10,10,10,.85)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
<div onClick={e=>e.stopPropagation()} style={{background:'#1e1e1e',borderRadius:14,width:'min(420px,90vw)',border:'1px solid rgba(201,168,76,.1)',direction:'rtl',fontFamily:F}}>
<div style={{height:3,background:'linear-gradient(90deg,transparent,'+C.gold+',transparent)'}}/>
<div style={{padding:'16px 20px',fontSize:16,fontWeight:800,color:'var(--tx)',borderBottom:'1px solid rgba(255,255,255,.05)'}}>إضافة مصروف</div>
<div style={{padding:'16px 20px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div style={{gridColumn:'1/-1'}}><div style={{fontSize:10,color:'var(--tx6)',marginBottom:4}}>المبلغ</div><input value={form.amount||''} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} type="number" style={{width:'100%',height:40,padding:'0 12px',borderRadius:8,border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.04)',color:'var(--tx)',fontFamily:F,fontSize:14,fontWeight:700,textAlign:'center',direction:'ltr',outline:'none',boxSizing:'border-box'}}/></div>
<div><div style={{fontSize:10,color:'var(--tx6)',marginBottom:4}}>الوصف</div><input value={form.description||''} onChange={e=>setForm(p=>({...p,description:e.target.value}))} style={{width:'100%',height:36,padding:'0 10px',borderRadius:8,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.03)',color:'var(--tx)',fontFamily:F,fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
<div><div style={{fontSize:10,color:'var(--tx6)',marginBottom:4}}>التاريخ</div><input type="date" value={form.date||''} onChange={e=>setForm(p=>({...p,date:e.target.value}))} style={{width:'100%',height:36,padding:'0 10px',borderRadius:8,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.03)',color:'var(--tx)',fontFamily:F,fontSize:11,direction:'ltr',outline:'none',boxSizing:'border-box'}}/></div>
<div><div style={{fontSize:10,color:'var(--tx6)',marginBottom:4}}>الجهة</div><input value={form.vendor_name||''} onChange={e=>setForm(p=>({...p,vendor_name:e.target.value}))} style={{width:'100%',height:36,padding:'0 10px',borderRadius:8,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.03)',color:'var(--tx)',fontFamily:F,fontSize:11,outline:'none',boxSizing:'border-box'}}/></div>
<div><div style={{fontSize:10,color:'var(--tx6)',marginBottom:4}}>التصنيف</div><select value={form.category||'other'} onChange={e=>setForm(p=>({...p,category:e.target.value}))} style={{width:'100%',height:36,padding:'0 10px',borderRadius:8,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.03)',color:'var(--tx)',fontFamily:F,fontSize:11,outline:'none',boxSizing:'border-box'}}>{Object.entries(catMap).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
</div>
<div style={{padding:'14px 20px',borderTop:'1px solid rgba(255,255,255,.05)',display:'flex',gap:8,flexDirection:'row-reverse'}}>
<button onClick={saveOp} disabled={saving} style={{flex:1,height:38,borderRadius:8,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.1)',color:C.gold,fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer',opacity:saving?.5:1}}>{saving?'...':'حفظ'}</button>
<button onClick={()=>setPop(null)} style={{height:38,padding:'0 16px',borderRadius:8,border:'1px solid rgba(255,255,255,.08)',background:'transparent',color:'var(--tx5)',fontFamily:F,fontSize:11,cursor:'pointer'}}>إلغاء</button>
</div>
</div>
</div>}
</div>}
