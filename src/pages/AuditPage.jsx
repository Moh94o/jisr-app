import React,{useState,useEffect,useCallback} from 'react'
const F="'Cairo','Tajawal',sans-serif"
const C={gold:'#c9a84c',ok:'#27a046',red:'#c0392b',blue:'#3483b4'}
const nm=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2})

// Category name resolver
const catMap={rent:'إيجار',utilities:'كهرباء/ماء',telecom:'إنترنت/اتصالات',internet:'إنترنت/اتصالات',maintenance:'صيانة',insurance:'تأمين',office_supplies:'مستلزمات مكتبية',supplies:'مستلزمات',transport:'مواصلات',transportation:'مواصلات',marketing:'تسويق',legal:'قانوني',salary:'رواتب',salaries:'رواتب',gov_fee:'رسوم حكومية',government_fees:'رسوم حكومية',subscription:'اشتراكات',travel:'سفر',cleaning:'أدوات تنظيف',hospitality:'ضيافة',stationery:'قرطاسية',meals:'وجبات',miscellaneous:'متفرقات',other:'أخرى',bonuses:'مكافآت',social_insurance:'تأمينات اجتماعية',visa_fees:'رسوم تأشيرات',transfer_fees:'رسوم نقل كفالة'}
const getCatAr=(e)=>e.cat?.name_ar||catMap[e.category]||e.category||'أخرى'
const getCatParent=(e)=>{if(e.cat?.parent_type)return e.cat.parent_type;const m={rent:'office',utilities:'office',telecom:'office',internet:'office',maintenance:'office',insurance:'office',office_supplies:'office',supplies:'office',marketing:'office',legal:'office',subscription:'office',transport:'daily',transportation:'daily',travel:'daily',cleaning:'daily',hospitality:'daily',stationery:'daily',meals:'daily',miscellaneous:'daily',other:'daily',salary:'payroll',salaries:'payroll',bonuses:'payroll',social_insurance:'payroll',gov_fee:'transaction',government_fees:'transaction',visa_fees:'transaction',transfer_fees:'transaction'};return m[e.category]||'daily'}

// Detail Modal
function DetailModal({item,smsMsg,onClose,onApprove,onReject,onSaveNotes,onConfirm,user,isExpense}){
const[notes,setNotes]=useState(item?.notes||'')
const[rejReason,setRejReason]=useState('')
const[showReject,setShowReject]=useState(false)
if(!item)return null
const amt=Number(item.amount||item._amt||0)
return<div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(10,10,10,.85)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'#1e1e1e',borderRadius:16,width:'min(520px,94vw)',maxHeight:'85vh',overflow:'auto',border:'1px solid rgba(201,168,76,.1)',direction:'rtl',fontFamily:F}}>
{/* Gold bar */}
<div style={{height:3,background:'linear-gradient(90deg,transparent,'+C.gold+',transparent)'}}/>
{/* Header */}
<div style={{padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,.05)'}}>
<div style={{fontSize:16,fontWeight:800,color:'var(--tx)'}}>تفاصيل العملية</div>
<button onClick={onClose} style={{width:30,height:30,borderRadius:8,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',color:'var(--tx5)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>×</button>
</div>

<div style={{padding:'16px 20px'}}>
{/* Amount */}
<div style={{textAlign:'center',padding:'16px 0',marginBottom:16,borderRadius:12,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.04)'}}>
<div style={{fontSize:28,fontWeight:900,color:isExpense?C.red:C.ok,direction:'ltr'}}>{isExpense?'-':'+'}{nm(amt)} <span style={{fontSize:12}}>ر.س</span></div>
</div>

{/* Info grid */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
{[['التصنيف',item._cat||getCatAr(item)],['التاريخ',item._date||item.date||item.payment_date||item.transaction_date||'—'],['طريقة الدفع',item.payment_method==='cash'?'نقدي':item.payment_method==='bank_transfer'?'حوالة بنكية':item.payment_method||'—'],['المرجع',item.reference_number||item.payment_reference||'—'],['الوصف',item.description||item._desc||'—'],['الجهة',item.vendor_name||item.bank_name||'—']].map(([l,v],i)=>v&&v!=='—'?<div key={i} style={{padding:'8px 10px',borderRadius:8,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.04)'}}>
<div style={{fontSize:8,color:'var(--tx6)',marginBottom:3}}>{l}</div>
<div style={{fontSize:12,fontWeight:600,color:'var(--tx3)'}}>{v}</div>
</div>:null)}
</div>

{/* SMS Message */}
{smsMsg&&<div style={{marginBottom:16}}>
<div style={{fontSize:11,fontWeight:700,color:'#9b59b6',marginBottom:6}}>📱 رسالة البنك</div>
<div style={{padding:'10px 12px',borderRadius:8,background:'rgba(155,89,182,.03)',border:'1px solid rgba(155,89,182,.08)'}}>
<div style={{display:'flex',gap:8,fontSize:9,color:'var(--tx5)',marginBottom:6}}>
<span>{smsMsg.phone_from}</span><span>{smsMsg.person_name}</span>
<span>{smsMsg.created_at?new Date(smsMsg.created_at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):''}</span>
</div>
<pre style={{fontSize:10,color:'var(--tx3)',margin:0,whiteSpace:'pre-wrap',wordBreak:'break-all',lineHeight:1.8,fontFamily:F,direction:'ltr',textAlign:'left'}}>{smsMsg.message_body}</pre>
</div>
</div>}

{/* Confirmation trail */}
{(item.confirmed_at||item.approved_at||item.matched_at)&&<div style={{marginBottom:16}}>
<div style={{fontSize:11,fontWeight:700,color:C.ok,marginBottom:6}}>سجل التأكيد</div>
<div style={{padding:'8px 12px',borderRadius:8,background:'rgba(39,160,70,.03)',border:'1px solid rgba(39,160,70,.06)',fontSize:10,color:'var(--tx3)'}}>
{item.confirmed_at&&<div>تم التأكيد: {new Date(item.confirmed_at).toLocaleString('ar-SA')}</div>}
{item.approved_at&&<div>تم الاعتماد: {new Date(item.approved_at).toLocaleString('ar-SA')}</div>}
{item.matched_at&&<div>تم المطابقة: {new Date(item.matched_at).toLocaleString('ar-SA')}</div>}
{item.match_status&&<div>الحالة: {item.match_status==='matched'?'مطابقة':item.match_status==='pending'?'بانتظار':'غير مطابقة'}</div>}
</div>
</div>}

{/* Notes */}
<div style={{marginBottom:16}}>
<div style={{fontSize:11,fontWeight:700,color:'var(--tx4)',marginBottom:6}}>ملاحظات</div>
<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="أضف ملاحظة..." rows={3} style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.03)',color:'var(--tx)',fontFamily:F,fontSize:11,resize:'vertical',boxSizing:'border-box',outline:'none'}}/>
{notes!==(item?.notes||'')&&<button onClick={()=>onSaveNotes&&onSaveNotes(notes)} style={{marginTop:6,height:30,padding:'0 14px',borderRadius:6,border:'1px solid rgba(201,168,76,.15)',background:'rgba(201,168,76,.06)',color:C.gold,fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer'}}>حفظ الملاحظة</button>}
</div>

{/* Attachments placeholder */}
<div style={{marginBottom:16}}>
<div style={{fontSize:11,fontWeight:700,color:'var(--tx4)',marginBottom:6}}>المرفقات</div>
{(item.attachments||[]).length>0?<div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
{item.attachments.map((url,i)=><a key={i} href={url} target="_blank" rel="noreferrer" style={{fontSize:10,padding:'4px 10px',borderRadius:6,background:'rgba(52,131,180,.06)',border:'1px solid rgba(52,131,180,.1)',color:C.blue,textDecoration:'none'}}>مرفق {i+1}</a>)}
</div>:<div style={{fontSize:10,color:'var(--tx6)'}}>لا توجد مرفقات</div>}
</div>

{/* Approval buttons (for daily expenses) */}
{item.approval_status==='pending'&&onApprove&&<div style={{borderTop:'1px solid rgba(255,255,255,.05)',paddingTop:14}}>
{!showReject?<div style={{display:'flex',gap:8}}>
<button onClick={()=>onApprove(item.id)} style={{flex:1,height:40,borderRadius:10,border:'1px solid rgba(39,160,70,.2)',background:'rgba(39,160,70,.1)',color:C.ok,fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer'}}>اعتماد</button>
<button onClick={()=>setShowReject(true)} style={{flex:1,height:40,borderRadius:10,border:'1px solid rgba(192,57,43,.2)',background:'rgba(192,57,43,.08)',color:C.red,fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer'}}>رفض</button>
</div>:<div>
<textarea value={rejReason} onChange={e=>setRejReason(e.target.value)} placeholder="سبب الرفض..." rows={2} style={{width:'100%',padding:'8px 10px',borderRadius:6,border:'1px solid rgba(192,57,43,.15)',background:'rgba(192,57,43,.03)',color:'var(--tx)',fontFamily:F,fontSize:10,resize:'none',boxSizing:'border-box',outline:'none',marginBottom:6}}/>
<div style={{display:'flex',gap:6}}>
<button onClick={()=>onReject&&onReject(item.id,rejReason)} style={{flex:1,height:34,borderRadius:8,border:'1px solid rgba(192,57,43,.2)',background:'rgba(192,57,43,.1)',color:C.red,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer'}}>تأكيد الرفض</button>
<button onClick={()=>setShowReject(false)} style={{height:34,padding:'0 14px',borderRadius:8,border:'1px solid rgba(255,255,255,.08)',background:'transparent',color:'var(--tx5)',fontFamily:F,fontSize:11,cursor:'pointer'}}>إلغاء</button>
</div>
</div>}
</div>}

{/* Confirm button for SMS matching */}
{item.match_status==='pending'&&onConfirm&&<div style={{borderTop:'1px solid rgba(255,255,255,.05)',paddingTop:14,display:'flex',gap:8}}>
<button onClick={()=>onConfirm(item.id,'matched')} style={{flex:1,height:40,borderRadius:10,border:'1px solid rgba(39,160,70,.2)',background:'rgba(39,160,70,.1)',color:C.ok,fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer'}}>تأكيد المطابقة</button>
<button onClick={()=>onConfirm(item.id,'unmatched')} style={{height:40,padding:'0 16px',borderRadius:10,border:'1px solid rgba(192,57,43,.15)',background:'rgba(192,57,43,.06)',color:C.red,fontFamily:F,fontSize:11,fontWeight:600,cursor:'pointer'}}>غير مطابق</button>
</div>}
</div>
</div>
</div>}

// Expense list with grouping
function GroupedList({items,smsWithdrawals,smsMap,dayMs,toggleCat,expandedCats,prefix,onItemClick}){
// Match with SMS
const matched=[];const unmatched=[];const used=new Set()
for(const op of items){const m=smsWithdrawals.find(s=>!used.has(s.id)&&Math.abs(Number(s.amount||0)-op._amt)<=1&&op._date&&Math.abs(new Date(s.transaction_date)-new Date(op._date))<=dayMs)
if(m){matched.push({op,sms:m});used.add(m.id)}else{unmatched.push(op)}}

// Group by category
const grp={};items.forEach(op=>{const c=op._cat;if(!grp[c])grp[c]={items:[],total:0,matchedCount:0};grp[c].items.push(op);grp[c].total+=op._amt})
matched.forEach(({op})=>{const c=op._cat;if(grp[c])grp[c].matchedCount=(grp[c].matchedCount||0)+1})

return<div>
{/* Summary */}
<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:14}}>
<div style={{padding:'12px',borderRadius:10,background:'rgba(201,168,76,.04)',border:'1px solid rgba(201,168,76,.06)',textAlign:'center'}}>
<div style={{fontSize:8,color:C.gold}}>إجمالي</div><div style={{fontSize:18,fontWeight:900,color:C.gold}}>{items.length}</div><div style={{fontSize:9,color:'var(--tx6)'}}>{nm(items.reduce((s,o)=>s+o._amt,0))} ر.س</div>
</div>
<div style={{padding:'12px',borderRadius:10,background:'rgba(39,160,70,.04)',border:'1px solid rgba(39,160,70,.06)',textAlign:'center'}}>
<div style={{fontSize:8,color:C.ok}}>مؤكدة</div><div style={{fontSize:18,fontWeight:900,color:C.ok}}>{matched.length}</div>
</div>
<div style={{padding:'12px',borderRadius:10,background:unmatched.length>0?'rgba(192,57,43,.04)':'rgba(255,255,255,.02)',border:'1px solid '+(unmatched.length>0?'rgba(192,57,43,.06)':'rgba(255,255,255,.04)'),textAlign:'center'}}>
<div style={{fontSize:8,color:unmatched.length>0?C.red:'var(--tx6)'}}>بدون تأكيد</div><div style={{fontSize:18,fontWeight:900,color:unmatched.length>0?C.red:'var(--tx6)'}}>{unmatched.length}</div>
</div>
</div>

{unmatched.length>0&&<div style={{padding:'10px 14px',borderRadius:8,background:'rgba(192,57,43,.04)',border:'1px solid rgba(192,57,43,.08)',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
<div style={{fontSize:11,fontWeight:700,color:C.red}}>{unmatched.length} عملية بدون تأكيد SMS</div>
<div style={{fontSize:9,color:'var(--tx5)'}}>({nm(unmatched.reduce((s,o)=>s+o._amt,0))} ر.س)</div>
</div>}

{/* Grouped categories */}
<div style={{display:'flex',flexDirection:'column',gap:4}}>
{Object.entries(grp).sort((a,b)=>b[1].total-a[1].total).map(([cat,{items:catItems,total,matchedCount}])=>{
const key=prefix+'_'+cat
const isOpen=expandedCats.has(key)
return<div key={cat} style={{borderRadius:8,border:'1px solid rgba(255,255,255,.04)',overflow:'hidden'}}>
<div onClick={()=>toggleCat(key)} style={{padding:'10px 14px',background:'rgba(255,255,255,.015)',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}>
<div style={{display:'flex',alignItems:'center',gap:8}}>
<span style={{width:7,height:7,borderRadius:'50%',background:matchedCount===catItems.length?C.ok:matchedCount>0?'#e67e22':C.red}}/>
<span style={{fontSize:11,fontWeight:700,color:'var(--tx)'}}>{cat}</span>
<span style={{fontSize:8,color:'var(--tx6)'}}>({catItems.length})</span>
{matchedCount>0&&<span style={{fontSize:7,padding:'1px 5px',borderRadius:4,background:'rgba(39,160,70,.08)',color:C.ok}}>{matchedCount} مؤكدة</span>}
</div>
<div style={{display:'flex',alignItems:'center',gap:8}}>
<span style={{fontSize:12,fontWeight:800,color:C.red,direction:'ltr'}}>-{nm(total)}</span>
<span style={{fontSize:9,color:'var(--tx6)',transform:isOpen?'rotate(90deg)':'none',transition:'.2s'}}>▸</span>
</div>
</div>
{isOpen&&<div style={{padding:'4px 8px 8px'}}>
{catItems.map((op,i)=>{const isMatched=matched.some(m=>m.op===op)
return<div key={i} onClick={()=>onItemClick&&onItemClick(op,isMatched?matched.find(m=>m.op===op)?.sms:null)} style={{padding:'8px 10px',borderRadius:6,background:'rgba(255,255,255,.01)',marginBottom:2,display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',transition:'.1s'}} onMouseEnter={e=>e.currentTarget.style.background='rgba(201,168,76,.03)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,.01)'}>
<div style={{display:'flex',alignItems:'center',gap:6,flex:1,minWidth:0}}>
<span style={{width:6,height:6,borderRadius:'50%',background:isMatched?C.ok:C.red,opacity:.6,flexShrink:0}}/>
<span style={{fontSize:10,color:'var(--tx3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{op._desc}</span>
{isMatched&&<span style={{fontSize:7,color:'#9b59b6',flexShrink:0}}>📱</span>}
<span style={{fontSize:7,color:'var(--tx6)',flexShrink:0}}>{op._date}</span>
</div>
<span style={{fontSize:10,fontWeight:700,color:C.red,direction:'ltr',flexShrink:0}}>-{nm(op._amt)}</span>
</div>})}
</div>}
</div>})}
</div>
</div>}

// Daily expenses with approval
function DailyExpList({items,toggleCat,expandedCats,onItemClick,onApprove,onReject}){
const pending=items.filter(o=>o.approval_status==='pending')
const approved=items.filter(o=>o.approval_status==='approved')
const rejected=items.filter(o=>o.approval_status==='rejected')
const total=items.reduce((s,o)=>s+o._amt,0)

return<div>
<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:14}}>
<div style={{padding:'12px',borderRadius:10,background:'rgba(201,168,76,.04)',border:'1px solid rgba(201,168,76,.06)',textAlign:'center'}}>
<div style={{fontSize:8,color:C.gold}}>بانتظار الموافقة</div><div style={{fontSize:18,fontWeight:900,color:C.gold}}>{pending.length}</div>
</div>
<div style={{padding:'12px',borderRadius:10,background:'rgba(39,160,70,.04)',border:'1px solid rgba(39,160,70,.06)',textAlign:'center'}}>
<div style={{fontSize:8,color:C.ok}}>معتمدة</div><div style={{fontSize:18,fontWeight:900,color:C.ok}}>{approved.length}</div>
</div>
<div style={{padding:'12px',borderRadius:10,background:rejected.length>0?'rgba(192,57,43,.04)':'rgba(255,255,255,.02)',border:'1px solid '+(rejected.length>0?'rgba(192,57,43,.06)':'rgba(255,255,255,.04)'),textAlign:'center'}}>
<div style={{fontSize:8,color:rejected.length>0?C.red:'var(--tx6)'}}>مرفوضة</div><div style={{fontSize:18,fontWeight:900,color:rejected.length>0?C.red:'var(--tx6)'}}>{rejected.length}</div>
</div>
</div>

{pending.length>0&&<div style={{padding:'10px 14px',borderRadius:8,background:'rgba(201,168,76,.04)',border:'1px solid rgba(201,168,76,.1)',marginBottom:12}}>
<div style={{fontSize:11,fontWeight:700,color:C.gold}}>{pending.length} مصروف بانتظار اعتمادك</div>
<div style={{fontSize:9,color:'var(--tx5)'}}>إجمالي: {nm(pending.reduce((s,o)=>s+o._amt,0))} ر.س</div>
</div>}

{[['pending','بانتظار',C.gold,pending],['approved','معتمدة',C.ok,approved],['rejected','مرفوضة',C.red,rejected]].map(([k,label,clr,list])=>list.length>0&&<div key={k} style={{marginBottom:14}}>
<div style={{fontSize:11,fontWeight:700,color:clr,marginBottom:6}}>{label} ({list.length})</div>
<div style={{display:'flex',flexDirection:'column',gap:3}}>
{list.map((op,i)=><div key={i} onClick={()=>onItemClick&&onItemClick(op)} style={{padding:'10px 12px',borderRadius:8,background:'rgba(255,255,255,.015)',border:'1px solid rgba(255,255,255,.04)',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',transition:'.1s'}} onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(201,168,76,.15)'} onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,255,255,.04)'}>
<div style={{display:'flex',alignItems:'center',gap:8,flex:1}}>
<span style={{width:7,height:7,borderRadius:'50%',background:clr}}/>
<div>
<div style={{fontSize:11,fontWeight:600,color:'var(--tx)'}}>{op._desc}</div>
<div style={{fontSize:8,color:'var(--tx6)'}}>{op._cat} · {op._date}</div>
</div>
</div>
<div style={{display:'flex',alignItems:'center',gap:8}}>
<span style={{fontSize:12,fontWeight:800,color:C.red,direction:'ltr'}}>-{nm(op._amt)}</span>
{k==='pending'&&<div style={{display:'flex',gap:4}} onClick={e=>e.stopPropagation()}>
<button onClick={()=>onApprove(op.id)} style={{height:26,padding:'0 8px',borderRadius:5,border:'1px solid rgba(39,160,70,.15)',background:'rgba(39,160,70,.06)',color:C.ok,fontFamily:F,fontSize:9,fontWeight:700,cursor:'pointer'}}>اعتماد</button>
<button onClick={()=>onItemClick(op)} style={{height:26,padding:'0 8px',borderRadius:5,border:'1px solid rgba(192,57,43,.1)',background:'rgba(192,57,43,.04)',color:C.red,fontFamily:F,fontSize:9,fontWeight:700,cursor:'pointer'}}>رفض</button>
</div>}
</div>
</div>)}
</div>
</div>)}
</div>}

export default function AuditPage({sb,toast,user,lang,branchId}){
const[tab,setTab]=useState('cash_deposit')
const[bankData,setBankData]=useState([])
const[smsMap,setSmsMap]=useState({})
const[selDate,setSelDate]=useState(new Date().toISOString().slice(0,10))
const[expandedCats,setExpandedCats]=useState(new Set())
const[allPayments,setAllPayments]=useState([])
const[allExpenses,setAllExpenses]=useState([])
const[loading,setLoading]=useState(true)
const[detailItem,setDetailItem]=useState(null)
const[detailSms,setDetailSms]=useState(null)
const[advances,setAdvances]=useState([])
const[advExpenses,setAdvExpenses]=useState([])
const[showAddAdv,setShowAddAdv]=useState(false)
const[advForm,setAdvForm]=useState({employee_name:'',amount:'',purpose:''})
const[addExpAdv,setAddExpAdv]=useState(null)
const[advExpForm,setAdvExpForm]=useState({amount:'',description:'',date:new Date().toISOString().slice(0,10)})

const reload=useCallback(async()=>{
setLoading(true)
const[{data:br},{data:ip},{data:oe},{data:adv},{data:advE}]=await Promise.all([
sb.from('bank_reconciliation').select('*').is('deleted_at',null).order('transaction_date',{ascending:false}),
sb.from('invoice_payments').select('*').is('deleted_at',null).order('payment_date',{ascending:false}),
sb.from('operational_expenses').select('*,cat:expense_categories(id,name_ar,name_en,parent_type)').is('deleted_at',null).order('date',{ascending:false}),
sb.from('employee_advances').select('*').is('deleted_at',null).order('given_date',{ascending:false}),
sb.from('advance_expenses').select('*').order('date',{ascending:false})
])
setBankData(br||[]);setAllPayments(ip||[]);setAllExpenses(oe||[]);setAdvances(adv||[]);setAdvExpenses(advE||[])
const smsIds=(br||[]).filter(r=>r.otp_message_id).map(r=>r.otp_message_id)
if(smsIds.length>0){const{data:msgs}=await sb.from('otp_messages').select('id,message_body,phone_from,person_name,created_at').in('id',smsIds);const map={};(msgs||[]).forEach(m=>{map[m.id]=m});setSmsMap(map)}
setLoading(false)
},[sb])
useEffect(()=>{reload()},[reload])

const dayMs=86400000
const today=new Date().toISOString().slice(0,10)
const yesterday=(()=>{const d=new Date();d.setDate(d.getDate()-1);return d.toISOString().slice(0,10)})()
const toggleCat=c=>{const n=new Set(expandedCats);n.has(c)?n.delete(c):n.add(c);setExpandedCats(n)}
const isIncomeType=t=>t==='bank_transfer_in'||t==='cash_in'||t==='deposit'||t==='transfer_in'
const isExpenseType=t=>t==='service_cost'||t==='operational'||t==='petty_cash'||t==='withdrawal'||t==='transfer_out'

// Daily data
const dayPayments=allPayments.filter(p=>p.payment_date===selDate)
const dayExpenses=allExpenses.filter(e=>e.date===selDate)
const dayCashIncome=dayPayments.filter(p=>p.payment_method==='cash').reduce((s,p)=>s+Number(p.amount||0),0)
const dayBankIncome=dayPayments.filter(p=>p.payment_method!=='cash').reduce((s,p)=>s+Number(p.amount||0),0)
const dayTotalExp=dayExpenses.reduce((s,e)=>s+Number(e.amount||0),0)

// Deposits
const selDateObj=new Date(selDate)
const smsDeposits=bankData.filter(r=>isIncomeType(r.transaction_type)&&Math.abs(new Date(r.transaction_date)-selDateObj)<=dayMs)
const smsCash=smsDeposits.filter(r=>r.transaction_type!=='bank_transfer_in')
const smsBank=smsDeposits.filter(r=>r.transaction_type==='bank_transfer_in')
const expectedToday=dayCashIncome-dayTotalExp
const prevCash=allPayments.filter(p=>p.payment_date&&p.payment_date<selDate&&p.payment_method==='cash').reduce((s,p)=>s+Number(p.amount||0),0)
const prevExp=allExpenses.filter(e=>e.date&&e.date<selDate).reduce((s,e)=>s+Number(e.amount||0),0)
const prevDep=bankData.filter(r=>isIncomeType(r.transaction_type)&&r.transaction_date<selDate).reduce((s,r)=>s+Number(r.amount||0),0)
const carryover=Math.max(0,prevCash-prevExp-prevDep)
const expectedDeposit=Math.max(0,expectedToday)+carryover
const actualDep=smsCash.reduce((s,r)=>s+Number(r.amount||0),0)
const depositPct=expectedDeposit>0?Math.min(100,Math.round(actualDep/expectedDeposit*100)):0
const depStatus=expectedDeposit<=0?'none':actualDep>=expectedDeposit-1?'complete':actualDep>0?'partial':'pending'

const smsWithdrawals=bankData.filter(r=>isExpenseType(r.transaction_type))

// Tab data
const bankTransferPayments=allPayments.filter(p=>p.payment_method==='bank_transfer').map(p=>({...p,_type:'payment',_amt:Number(p.amount||0),_date:p.payment_date,_desc:p.notes||'دفعة فاتورة #'+(p.reference_number||''),_cat:'دفعة فاتورة'}))
const officeExps=allExpenses.filter(e=>getCatParent(e)==='office').map(e=>({...e,_type:'expense',_amt:Number(e.amount||0),_date:e.date,_desc:e.description||e.vendor_name||getCatAr(e),_cat:getCatAr(e)}))
const dailyExps=allExpenses.filter(e=>getCatParent(e)==='daily').map(e=>({...e,_type:'expense',_amt:Number(e.amount||0),_date:e.date,_desc:e.description||e.vendor_name||getCatAr(e),_cat:getCatAr(e)}))
const payrollExps=allExpenses.filter(e=>getCatParent(e)==='payroll').map(e=>({...e,_type:'expense',_amt:Number(e.amount||0),_date:e.date,_desc:e.description||e.vendor_name||getCatAr(e),_cat:getCatAr(e)}))
const txExps=allExpenses.filter(e=>getCatParent(e)==='transaction').map(e=>({...e,_type:'expense',_amt:Number(e.amount||0),_date:e.date,_desc:e.description||e.vendor_name||getCatAr(e),_cat:getCatAr(e)}))
const svcItems=[...bankTransferPayments,...txExps]

// Suspicious: bank withdrawals with no matching expense or payment
const suspiciousOps=smsWithdrawals.filter(s=>{const amt=Number(s.amount||0);if(!amt)return false;const hasMatch=allExpenses.some(e=>Math.abs(Number(e.amount||0)-amt)<=1&&Math.abs(new Date(e.date)-new Date(s.transaction_date))<=dayMs)||allPayments.some(p=>Math.abs(Number(p.amount||0)-amt)<=1&&Math.abs(new Date(p.payment_date)-new Date(s.transaction_date))<=dayMs);return!hasMatch})

// Advances summary
const openAdvances=advances.filter(a=>a.status==='open'||a.status==='partial')
const totalAdvBalance=openAdvances.reduce((s,a)=>s+Number(a.amount||0)-Number(a.spent_amount||0)-Number(a.returned_amount||0),0)

const tabDefs=[
{g:'الدخل',items:[{k:'cash_deposit',l:'إيداع نقدي',n:smsCash.length,bc:depStatus==='complete'?C.ok:depStatus==='partial'?'#e67e22':null},{k:'bank_transfer',l:'حوالة بنكية',n:smsBank.length}]},
{g:'المدفوعات',items:[{k:'service_pay',l:'سداد معاملات',n:svcItems.length},{k:'office_exp',l:'مصاريف مكتبية',n:officeExps.length},{k:'daily_exp',l:'مصاريف يومية',n:dailyExps.length},{k:'payroll',l:'رواتب',n:payrollExps.length}]},
{g:'أخرى',items:[{k:'advances',l:'العهد والسلف',n:openAdvances.length,bc:openAdvances.length>0?'#e67e22':null},{k:'bank_log',l:'سجل البنك',n:suspiciousOps.length,bc:suspiciousOps.length>0?C.red:null}]}
]

// Actions
const confirmMatch=async(id,status)=>{await sb.from('bank_reconciliation').update({match_status:status,confirmed_at:new Date().toISOString(),confirmed_by:user?.id}).eq('id',id);toast('تم');setDetailItem(null);reload()}
const approveExp=async(id)=>{await sb.from('operational_expenses').update({approval_status:'approved',approved_by:user?.id,approved_at:new Date().toISOString()}).eq('id',id);toast('تم الاعتماد');setDetailItem(null);reload()}
const rejectExp=async(id,reason)=>{await sb.from('operational_expenses').update({approval_status:'rejected',approved_by:user?.id,approved_at:new Date().toISOString(),rejection_reason:reason}).eq('id',id);toast('تم الرفض');setDetailItem(null);reload()}
const saveNotes=async(notes)=>{if(detailItem?.match_status!==undefined)await sb.from('bank_reconciliation').update({notes}).eq('id',detailItem.id)
else await sb.from('operational_expenses').update({description:notes}).eq('id',detailItem.id);toast('تم');reload()}
const openDetail=(item,sms)=>{setDetailItem(item);setDetailSms(sms?.otp_message_id?smsMap[sms.otp_message_id]:null)}

// Advance actions
const addAdvance=async()=>{if(!advForm.employee_name||!advForm.amount)return;await sb.from('employee_advances').insert({employee_name:advForm.employee_name,amount:Number(advForm.amount),purpose:advForm.purpose,given_by:user?.id,employee_id:user?.id});toast('تم إنشاء العهدة');setShowAddAdv(false);setAdvForm({employee_name:'',amount:'',purpose:''});reload()}
const addAdvExpense=async(advId)=>{if(!advExpForm.amount||!advExpForm.description)return;const amt=Number(advExpForm.amount);await sb.from('advance_expenses').insert({advance_id:advId,amount:amt,description:advExpForm.description,date:advExpForm.date});const adv=advances.find(a=>a.id===advId);if(adv){const newSpent=Number(adv.spent_amount||0)+amt;const remaining=Number(adv.amount)-newSpent-Number(adv.returned_amount||0);await sb.from('employee_advances').update({spent_amount:newSpent,status:remaining<=0?'settled':'partial'}).eq('id',advId)}toast('تم تسجيل المصروف');setAddExpAdv(null);setAdvExpForm({amount:'',description:'',date:new Date().toISOString().slice(0,10)});reload()}
const settleAdvance=async(advId)=>{const adv=advances.find(a=>a.id===advId);if(!adv)return;const remaining=Number(adv.amount)-Number(adv.spent_amount||0);await sb.from('employee_advances').update({returned_amount:remaining,status:'settled',settled_at:new Date().toISOString()}).eq('id',advId);toast('تم تسوية العهدة');reload()}

return<div style={{fontFamily:F,direction:'rtl'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
<div><div style={{fontSize:22,fontWeight:800,color:'var(--tx)'}}>التدقيق المالي</div><div style={{fontSize:11,color:'var(--tx5)',marginTop:4}}>التحقق من الإيداعات والمدفوعات</div></div>
</div>

{/* Daily summary */}
<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:14}}>
{[['+'+nm(dayCashIncome+dayBankIncome),'دخل اليوم',C.ok],['-'+nm(dayTotalExp),'صرف اليوم',C.red],[nm(dayCashIncome+dayBankIncome-dayTotalExp),'صافي اليوم',C.gold]].map(([v,l,c],i)=>
<div key={i} style={{padding:'10px 14px',borderRadius:10,background:c+'08',border:'1px solid '+c+'12',textAlign:'center'}}>
<div style={{fontSize:8,color:c}}>{l}</div><div style={{fontSize:16,fontWeight:800,color:c,direction:'ltr'}}>{v}</div>
</div>)}
</div>

{/* Layout */}
<div style={{display:'flex',gap:0}}>
<div style={{width:140,flexShrink:0,borderLeft:'1px solid rgba(255,255,255,.05)'}}>
{tabDefs.map(g=><div key={g.g}>
<div style={{fontSize:9,fontWeight:700,color:'var(--tx6)',padding:'10px 12px 4px'}}>{g.g}</div>
{g.items.map(t=><div key={t.k} onClick={()=>setTab(t.k)} style={{padding:'8px 12px',fontSize:11,fontWeight:tab===t.k?700:500,color:tab===t.k?C.gold:'rgba(255,255,255,.4)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',borderRight:tab===t.k?'2.5px solid '+C.gold:'2.5px solid transparent',background:tab===t.k?'rgba(201,168,76,.03)':'transparent'}}>
<span>{t.l}</span>
{t.n>0&&<span style={{fontSize:8,fontWeight:700,padding:'1px 6px',borderRadius:8,background:t.bc?t.bc+'20':'rgba(255,255,255,.08)',color:t.bc||'var(--tx6)'}}>{t.n}</span>}
</div>)}
</div>)}
</div>

<div style={{flex:1,paddingRight:14}}>
{loading?<div style={{textAlign:'center',padding:50,color:'var(--tx5)'}}>...</div>:

tab==='cash_deposit'?<div>
<div style={{fontSize:14,fontWeight:800,color:'var(--tx)',marginBottom:12}}>إيداع نقدي</div>
<div style={{display:'flex',gap:6,marginBottom:14,alignItems:'center',flexWrap:'wrap'}}>
{[['اليوم',today],['أمس',yesterday]].map(([l,d])=>
<button key={l} onClick={()=>setSelDate(d)} style={{height:30,padding:'0 12px',borderRadius:7,border:'1px solid '+(selDate===d?'rgba(201,168,76,.2)':'rgba(255,255,255,.06)'),background:selDate===d?'rgba(201,168,76,.08)':'transparent',color:selDate===d?C.gold:'var(--tx5)',fontFamily:F,fontSize:10,fontWeight:600,cursor:'pointer'}}>{l}</button>)}
<input type="date" value={selDate} onChange={e=>setSelDate(e.target.value)} style={{height:30,padding:'0 8px',borderRadius:7,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.03)',color:'var(--tx)',fontFamily:F,fontSize:10,direction:'ltr'}}/>
</div>
{/* Progress card */}
<div style={{padding:'18px 22px',borderRadius:14,background:'linear-gradient(135deg,rgba(52,131,180,.03),rgba(39,160,70,.03))',border:'1.5px solid '+(depStatus==='complete'?'rgba(39,160,70,.12)':depStatus==='partial'?'rgba(230,126,34,.12)':'rgba(255,255,255,.06)'),marginBottom:14}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
<span style={{fontSize:13,fontWeight:800,color:'var(--tx)'}}>حالة الإيداع</span>
<span style={{fontSize:11,fontWeight:700,padding:'3px 12px',borderRadius:6,background:depStatus==='complete'?C.ok+'15':depStatus==='partial'?'#e67e22'+'15':depStatus==='none'?'rgba(255,255,255,.04)':C.red+'15',color:depStatus==='complete'?C.ok:depStatus==='partial'?'#e67e22':depStatus==='none'?'var(--tx6)':C.red}}>{depStatus==='complete'?'مكتمل':depStatus==='partial'?'جزئي':depStatus==='none'?'لا يوجد':'لم يودع'}</span>
</div>
<div style={{height:8,borderRadius:4,background:'rgba(255,255,255,.06)',overflow:'hidden',marginBottom:10}}>
<div style={{height:'100%',width:depositPct+'%',borderRadius:4,background:depositPct>=100?C.ok:depositPct>=50?'#e67e22':depositPct>0?C.red:'transparent',transition:'.5s'}}/>
</div>
<div style={{display:'flex',justifyContent:'space-between',fontSize:10}}>
<div><span style={{color:'var(--tx6)'}}>المودع: </span><span style={{fontWeight:800,color:C.ok}}>{nm(actualDep)}</span></div>
<div><span style={{color:'var(--tx6)'}}>المطلوب: </span><span style={{fontWeight:800,color:C.blue}}>{nm(Math.max(0,expectedDeposit))}</span>{carryover>0&&<span style={{fontSize:8,color:'#e67e22'}}> (مرحّل {nm(carryover)})</span>}</div>
<div><span style={{color:'var(--tx6)'}}>المتبقي: </span><span style={{fontWeight:800,color:expectedDeposit-actualDep>1?C.red:C.ok}}>{nm(Math.max(0,expectedDeposit-actualDep))}</span></div>
</div>
</div>
{/* Deposit list */}
{smsCash.length>0&&<div style={{marginBottom:14}}>
<div style={{fontSize:11,fontWeight:700,color:'var(--tx3)',marginBottom:6}}>عمليات الإيداع ({smsCash.length})</div>
{smsCash.map(r=><div key={r.id} onClick={()=>openDetail(r,r)} style={{padding:'10px 12px',borderRadius:8,background:'rgba(39,160,70,.02)',border:'1px solid rgba(39,160,70,.05)',marginBottom:3,display:'flex',alignItems:'center',gap:10,cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(201,168,76,.15)'} onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(39,160,70,.05)'}>
<div style={{flex:1}}><div style={{fontSize:11,fontWeight:600,color:'var(--tx)'}}>{r.description?r.description.substring(0,50):'إيداع'}</div><div style={{fontSize:8,color:'var(--tx6)',marginTop:2}}>{r.bank_name} · {r.transaction_date}{r.otp_message_id&&' · 📱'}</div></div>
<span style={{fontSize:14,fontWeight:800,color:C.ok,direction:'ltr'}}>+{nm(r.amount)}</span>
</div>)}
</div>}
{/* Day breakdown */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div><div style={{fontSize:10,fontWeight:700,color:C.ok,marginBottom:4}}>مدفوعات ({dayPayments.length})</div>
{dayPayments.slice(0,5).map((p,i)=><div key={i} style={{padding:'5px 8px',borderRadius:5,background:'rgba(255,255,255,.02)',marginBottom:2,display:'flex',justifyContent:'space-between',fontSize:10}}><span style={{color:'var(--tx4)'}}>{p.payment_method==='cash'?'نقد':'تحويل'}</span><span style={{fontWeight:700,color:C.ok,direction:'ltr'}}>{nm(p.amount)}</span></div>)}
</div>
<div><div style={{fontSize:10,fontWeight:700,color:C.red,marginBottom:4}}>مصاريف ({dayExpenses.length})</div>
{dayExpenses.slice(0,5).map((e,i)=><div key={i} style={{padding:'5px 8px',borderRadius:5,background:'rgba(255,255,255,.02)',marginBottom:2,display:'flex',justifyContent:'space-between',fontSize:10}}><span style={{color:'var(--tx4)'}}>{getCatAr(e)}</span><span style={{fontWeight:700,color:C.red,direction:'ltr'}}>-{nm(e.amount)}</span></div>)}
</div>
</div>
</div>

:tab==='bank_transfer'?<div>
<div style={{fontSize:14,fontWeight:800,color:'var(--tx)',marginBottom:4}}>الحوالات البنكية</div>
<div style={{fontSize:10,color:'var(--tx5)',marginBottom:14}}>مطابقة دفعات الفواتير (حوالة بنكية) مع الحوالات الواردة من رسائل البنك — بالمبلغ + التاريخ + رقم المرجع</div>

{(()=>{
// Invoice payments marked as bank_transfer
const invoiceBT=allPayments.filter(p=>p.payment_method==='bank_transfer')
// SMS bank transfers (incoming)
const allSmsIncoming=[...smsBank,...bankData.filter(r=>r.transaction_type==='bank_transfer_in'&&!smsBank.some(s=>s.id===r.id))]

// Match: amount ±1 + date ±1 day + reference match
const matched=[];const unmatchedInv=[];const unmatchedSms=[];const usedSms=new Set()
for(const inv of invoiceBT){
const ref=(inv.reference_number||'').toLowerCase().trim()
const amt=Number(inv.amount||0)
const invDate=new Date(inv.payment_date||'')
// Try exact reference match first
let best=allSmsIncoming.find(s=>!usedSms.has(s.id)&&ref&&(s.reference_number||'').toLowerCase().includes(ref)&&Math.abs(Number(s.amount||0)-amt)<=1)
// Then amount+date match
if(!best)best=allSmsIncoming.find(s=>!usedSms.has(s.id)&&Math.abs(Number(s.amount||0)-amt)<=1&&Math.abs(new Date(s.transaction_date)-invDate)<=dayMs)
if(best){matched.push({inv,sms:best});usedSms.add(best.id)}else{unmatchedInv.push(inv)}
}
allSmsIncoming.filter(s=>!usedSms.has(s.id)).forEach(s=>unmatchedSms.push(s))

const totalInv=invoiceBT.reduce((s,p)=>s+Number(p.amount||0),0)
const totalSms=allSmsIncoming.reduce((s,r)=>s+Number(r.amount||0),0)

return<>
{/* Summary */}
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:14}}>
<div style={{padding:'12px',borderRadius:10,background:'rgba(52,131,180,.04)',border:'1px solid rgba(52,131,180,.06)',textAlign:'center'}}>
<div style={{fontSize:8,color:C.blue}}>فواتير حوالة</div>
<div style={{fontSize:18,fontWeight:900,color:C.blue}}>{invoiceBT.length}</div>
<div style={{fontSize:8,color:'var(--tx6)'}}>{nm(totalInv)} ر.س</div>
</div>
<div style={{padding:'12px',borderRadius:10,background:'rgba(155,89,182,.04)',border:'1px solid rgba(155,89,182,.06)',textAlign:'center'}}>
<div style={{fontSize:8,color:'#9b59b6'}}>حوالات SMS</div>
<div style={{fontSize:18,fontWeight:900,color:'#9b59b6'}}>{allSmsIncoming.length}</div>
<div style={{fontSize:8,color:'var(--tx6)'}}>{nm(totalSms)} ر.س</div>
</div>
<div style={{padding:'12px',borderRadius:10,background:'rgba(39,160,70,.04)',border:'1px solid rgba(39,160,70,.06)',textAlign:'center'}}>
<div style={{fontSize:8,color:C.ok}}>متطابقة</div>
<div style={{fontSize:18,fontWeight:900,color:C.ok}}>{matched.length}</div>
</div>
<div style={{padding:'12px',borderRadius:10,background:unmatchedInv.length>0?'rgba(192,57,43,.04)':'rgba(255,255,255,.02)',border:'1px solid '+(unmatchedInv.length>0?'rgba(192,57,43,.06)':'rgba(255,255,255,.04)'),textAlign:'center'}}>
<div style={{fontSize:8,color:unmatchedInv.length>0?C.red:'var(--tx6)'}}>بدون تأكيد</div>
<div style={{fontSize:18,fontWeight:900,color:unmatchedInv.length>0?C.red:'var(--tx6)'}}>{unmatchedInv.length}</div>
</div>
</div>

{/* Matched pairs */}
{matched.length>0&&<div style={{marginBottom:16}}>
<div style={{fontSize:12,fontWeight:700,color:C.ok,marginBottom:8}}>حوالات متطابقة ({matched.length})</div>
<div style={{display:'flex',flexDirection:'column',gap:6}}>
{matched.map(({inv,sms},i)=><div key={i} onClick={()=>openDetail({...inv,_amt:Number(inv.amount||0),_date:inv.payment_date,_desc:inv.notes||'دفعة فاتورة',_cat:'حوالة بنكية'},sms)} style={{borderRadius:10,border:'1px solid rgba(39,160,70,.08)',overflow:'hidden',cursor:'pointer',transition:'.15s'}} onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(201,168,76,.15)'} onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(39,160,70,.08)'}>
{/* Invoice side */}
<div style={{padding:'10px 14px',background:'rgba(39,160,70,.02)',display:'flex',alignItems:'center',gap:10}}>
<div style={{width:8,height:8,borderRadius:'50%',background:C.ok,flexShrink:0}}/>
<div style={{flex:1}}>
<div style={{display:'flex',alignItems:'center',gap:6}}>
<span style={{fontSize:11,fontWeight:700,color:'var(--tx)'}}>{inv.notes||'دفعة فاتورة'}</span>
{inv.reference_number&&<span style={{fontSize:8,fontWeight:600,padding:'2px 6px',borderRadius:4,background:'rgba(52,131,180,.08)',color:C.blue}}>#{inv.reference_number}</span>}
</div>
<div style={{display:'flex',gap:8,fontSize:8,color:'var(--tx6)',marginTop:2}}>
<span>فاتورة: {inv.payment_date}</span>
{inv.bank_name&&<span>{inv.bank_name}</span>}
</div>
</div>
<div style={{fontSize:15,fontWeight:800,color:C.ok,direction:'ltr'}}>+{nm(inv.amount)}</div>
</div>
{/* SMS match */}
<div style={{padding:'6px 14px',background:'rgba(155,89,182,.02)',borderTop:'1px solid rgba(39,160,70,.05)',display:'flex',alignItems:'center',gap:6,fontSize:9,color:'var(--tx5)'}}>
<span style={{color:'#9b59b6',fontWeight:600}}>📱</span>
<span>{sms.description?sms.description.substring(0,40):sms.bank_name||'حوالة واردة'}</span>
<span>·</span>
<span>{sms.transaction_date}</span>
{sms.reference_number&&<><span>·</span><span>#{sms.reference_number}</span></>}
<div style={{flex:1}}/>
<span style={{fontWeight:700,color:C.ok,direction:'ltr'}}>{nm(sms.amount)}</span>
</div>
</div>)}
</div>
</div>}

{/* Unmatched invoices */}
{unmatchedInv.length>0&&<div style={{marginBottom:16}}>
<div style={{fontSize:12,fontWeight:700,color:C.red,marginBottom:8}}>فواتير بدون حوالة مطابقة ({unmatchedInv.length})</div>
<div style={{padding:'10px 14px',borderRadius:8,background:'rgba(192,57,43,.04)',border:'1px solid rgba(192,57,43,.08)',marginBottom:8}}>
<div style={{fontSize:10,color:C.red,fontWeight:600}}>هذه الدفعات مسجلة كحوالة بنكية لكن لم يتم العثور على رسالة بنكية تؤكد الاستلام</div>
</div>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
{unmatchedInv.map((inv,i)=><div key={i} onClick={()=>openDetail({...inv,_amt:Number(inv.amount||0),_date:inv.payment_date,_desc:inv.notes||'دفعة فاتورة',_cat:'حوالة بنكية'},null)} style={{padding:'10px 14px',borderRadius:8,background:'rgba(192,57,43,.02)',border:'1px solid rgba(192,57,43,.06)',display:'flex',alignItems:'center',gap:10,cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(201,168,76,.15)'} onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(192,57,43,.06)'}>
<div style={{width:8,height:8,borderRadius:'50%',background:C.red,flexShrink:0}}/>
<div style={{flex:1}}>
<div style={{fontSize:11,fontWeight:700,color:'var(--tx)'}}>{inv.notes||'دفعة فاتورة'}{inv.reference_number?' — #'+inv.reference_number:''}</div>
<div style={{fontSize:8,color:'var(--tx6)',marginTop:2}}>{inv.payment_date}{inv.bank_name?' · '+inv.bank_name:''}</div>
</div>
<div style={{fontSize:14,fontWeight:800,color:C.red,direction:'ltr'}}>{nm(inv.amount)}</div>
</div>)}
</div>
</div>}

{/* Unmatched SMS (incoming transfers with no invoice) */}
{unmatchedSms.length>0&&<div>
<div style={{fontSize:12,fontWeight:700,color:'#e67e22',marginBottom:8}}>حوالات واردة بدون فاتورة ({unmatchedSms.length})</div>
<div style={{padding:'10px 14px',borderRadius:8,background:'rgba(230,126,34,.04)',border:'1px solid rgba(230,126,34,.08)',marginBottom:8}}>
<div style={{fontSize:10,color:'#e67e22',fontWeight:600}}>حوالات بنكية وصلت لكن لا يوجد فاتورة مسجلة كحوالة بنكية مرتبطة بها</div>
</div>
<div style={{display:'flex',flexDirection:'column',gap:4}}>
{unmatchedSms.map(s=><div key={s.id} onClick={()=>openDetail(s,s)} style={{padding:'10px 14px',borderRadius:8,background:'rgba(230,126,34,.02)',border:'1px solid rgba(230,126,34,.06)',display:'flex',alignItems:'center',gap:10,cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(201,168,76,.15)'} onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(230,126,34,.06)'}>
<span style={{fontSize:8,color:'#9b59b6'}}>📱</span>
<div style={{flex:1}}>
<div style={{fontSize:11,fontWeight:700,color:'var(--tx)'}}>{s.description?s.description.substring(0,50):'حوالة واردة'}</div>
<div style={{fontSize:8,color:'var(--tx6)',marginTop:2}}>{s.transaction_date} · {s.bank_name||''}{s.reference_number?' · #'+s.reference_number:''}</div>
</div>
<div style={{fontSize:14,fontWeight:800,color:'#e67e22',direction:'ltr'}}>+{nm(s.amount)}</div>
</div>)}
</div>
</div>}

{invoiceBT.length===0&&allSmsIncoming.length===0&&<div style={{textAlign:'center',padding:40,color:'var(--tx6)'}}>لا توجد حوالات بنكية</div>}
</>})()}
</div>

:tab==='service_pay'?<div>
<div style={{fontSize:14,fontWeight:800,color:'var(--tx)',marginBottom:12}}>سداد معاملات</div>
<div style={{fontSize:10,color:'var(--tx5)',marginBottom:14}}>دفعات الفواتير ورسوم المعاملات — يتم التحقق عبر رسالة البنك</div>
<GroupedList items={svcItems} smsWithdrawals={smsWithdrawals} smsMap={smsMap} dayMs={dayMs} toggleCat={toggleCat} expandedCats={expandedCats} prefix="svc" onItemClick={(op,sms)=>openDetail(op,sms)}/>
</div>

:tab==='office_exp'?<div>
<div style={{fontSize:14,fontWeight:800,color:'var(--tx)',marginBottom:12}}>مصاريف مكتبية</div>
<div style={{fontSize:10,color:'var(--tx5)',marginBottom:14}}>إيجار، كهرباء، إنترنت، صيانة — يتم التحقق عبر رسالة البنك</div>
<GroupedList items={officeExps} smsWithdrawals={smsWithdrawals} smsMap={smsMap} dayMs={dayMs} toggleCat={toggleCat} expandedCats={expandedCats} prefix="off" onItemClick={(op,sms)=>openDetail(op,sms)}/>
</div>

:tab==='daily_exp'?<div>
<div style={{fontSize:14,fontWeight:800,color:'var(--tx)',marginBottom:12}}>مصاريف يومية</div>
<div style={{fontSize:10,color:'var(--tx5)',marginBottom:14}}>تسجيل يدوي — يحتاج موافقة المدير</div>
<DailyExpList items={dailyExps} toggleCat={toggleCat} expandedCats={expandedCats} onItemClick={(op)=>openDetail(op,null)} onApprove={approveExp} onReject={rejectExp}/>
</div>

:tab==='payroll'?<div>
<div style={{fontSize:14,fontWeight:800,color:'var(--tx)',marginBottom:12}}>رواتب</div>
<div style={{fontSize:10,color:'var(--tx5)',marginBottom:14}}>رواتب الموظفين والتأمينات — يتم التحقق عبر رسالة البنك</div>
<GroupedList items={payrollExps} smsWithdrawals={smsWithdrawals} smsMap={smsMap} dayMs={dayMs} toggleCat={toggleCat} expandedCats={expandedCats} prefix="pay" onItemClick={(op,sms)=>openDetail(op,sms)}/>
</div>

:tab==='advances'?<div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
<div><div style={{fontSize:14,fontWeight:800,color:'var(--tx)'}}>العهد والسلف</div><div style={{fontSize:10,color:'var(--tx5)',marginTop:2}}>متابعة سلف الموظفين والمصروفات</div></div>
<button onClick={()=>setShowAddAdv(true)} style={{height:32,padding:'0 14px',borderRadius:8,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.08)',color:C.gold,fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer'}}>+ عهدة جديدة</button>
</div>

{/* Summary */}
<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:14}}>
<div style={{padding:'12px',borderRadius:10,background:'rgba(230,126,34,.04)',border:'1px solid rgba(230,126,34,.06)',textAlign:'center'}}>
<div style={{fontSize:8,color:'#e67e22'}}>عهد مفتوحة</div><div style={{fontSize:18,fontWeight:900,color:'#e67e22'}}>{openAdvances.length}</div>
</div>
<div style={{padding:'12px',borderRadius:10,background:'rgba(201,168,76,.04)',border:'1px solid rgba(201,168,76,.06)',textAlign:'center'}}>
<div style={{fontSize:8,color:C.gold}}>إجمالي المتبقي</div><div style={{fontSize:18,fontWeight:900,color:C.gold}}>{nm(totalAdvBalance)}</div>
</div>
<div style={{padding:'12px',borderRadius:10,background:'rgba(39,160,70,.04)',border:'1px solid rgba(39,160,70,.06)',textAlign:'center'}}>
<div style={{fontSize:8,color:C.ok}}>مسوّاة</div><div style={{fontSize:18,fontWeight:900,color:C.ok}}>{advances.filter(a=>a.status==='settled').length}</div>
</div>
</div>

{/* Advances list */}
{advances.map(adv=>{const spent=Number(adv.spent_amount||0);const returned=Number(adv.returned_amount||0);const total=Number(adv.amount);const remaining=total-spent-returned;const pct=total>0?Math.round((spent+returned)/total*100):0;const myExps=advExpenses.filter(e=>e.advance_id===adv.id)
return<div key={adv.id} style={{borderRadius:10,border:'1px solid '+(adv.status==='settled'?'rgba(39,160,70,.08)':'rgba(230,126,34,.08)'),marginBottom:8,overflow:'hidden'}}>
<div onClick={()=>toggleCat('adv_'+adv.id)} style={{padding:'12px 14px',background:adv.status==='settled'?'rgba(39,160,70,.02)':'rgba(230,126,34,.02)',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}>
<div style={{display:'flex',alignItems:'center',gap:10}}>
<div style={{width:36,height:36,borderRadius:10,background:adv.status==='settled'?'rgba(39,160,70,.08)':'rgba(230,126,34,.08)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:adv.status==='settled'?C.ok:'#e67e22'}}>{(adv.employee_name||'?')[0]}</div>
<div>
<div style={{fontSize:12,fontWeight:700,color:'var(--tx)'}}>{adv.employee_name}</div>
<div style={{fontSize:9,color:'var(--tx5)'}}>{adv.purpose||'عهدة'} · {adv.given_date}</div>
</div>
</div>
<div style={{display:'flex',alignItems:'center',gap:10}}>
<div style={{textAlign:'left'}}>
<div style={{fontSize:14,fontWeight:800,color:adv.status==='settled'?C.ok:'#e67e22',direction:'ltr'}}>{nm(remaining)} <span style={{fontSize:9}}>متبقي</span></div>
<div style={{fontSize:8,color:'var(--tx6)'}}>من {nm(total)}</div>
</div>
<span style={{fontSize:9,padding:'2px 8px',borderRadius:5,background:adv.status==='settled'?C.ok+'15':'#e67e22'+'15',color:adv.status==='settled'?C.ok:'#e67e22',fontWeight:600}}>{adv.status==='settled'?'مسوّاة':adv.status==='partial'?'جزئي':'مفتوحة'}</span>
<span style={{fontSize:9,color:'var(--tx6)',transform:expandedCats.has('adv_'+adv.id)?'rotate(90deg)':'none',transition:'.2s'}}>▸</span>
</div>
</div>
{/* Progress bar */}
<div style={{padding:'0 14px 8px',background:adv.status==='settled'?'rgba(39,160,70,.01)':'rgba(230,126,34,.01)'}}>
<div style={{height:4,borderRadius:2,background:'rgba(255,255,255,.06)',overflow:'hidden'}}><div style={{height:'100%',width:pct+'%',borderRadius:2,background:adv.status==='settled'?C.ok:'#e67e22'}}/></div>
</div>
{expandedCats.has('adv_'+adv.id)&&<div style={{padding:'8px 14px 14px',borderTop:'1px solid rgba(255,255,255,.04)'}}>
{/* Expense list */}
{myExps.length>0&&<div style={{marginBottom:10}}>
<div style={{fontSize:10,fontWeight:700,color:'var(--tx4)',marginBottom:4}}>المصروفات ({myExps.length})</div>
{myExps.map((e,i)=><div key={i} style={{padding:'6px 10px',borderRadius:6,background:'rgba(255,255,255,.02)',marginBottom:2,display:'flex',justifyContent:'space-between',fontSize:10}}>
<span style={{color:'var(--tx3)'}}>{e.description}</span>
<div style={{display:'flex',gap:8}}><span style={{color:'var(--tx6)'}}>{e.date}</span><span style={{fontWeight:700,color:C.red,direction:'ltr'}}>-{nm(e.amount)}</span></div>
</div>)}
</div>}
{/* Actions */}
{adv.status!=='settled'&&<div style={{display:'flex',gap:6}}>
<button onClick={()=>setAddExpAdv(addExpAdv===adv.id?null:adv.id)} style={{height:30,padding:'0 12px',borderRadius:6,border:'1px solid rgba(201,168,76,.15)',background:'rgba(201,168,76,.06)',color:C.gold,fontFamily:F,fontSize:9,fontWeight:700,cursor:'pointer'}}>+ مصروف</button>
<button onClick={()=>settleAdvance(adv.id)} style={{height:30,padding:'0 12px',borderRadius:6,border:'1px solid rgba(39,160,70,.15)',background:'rgba(39,160,70,.06)',color:C.ok,fontFamily:F,fontSize:9,fontWeight:700,cursor:'pointer'}}>تسوية (إرجاع الباقي)</button>
</div>}
{/* Add expense form */}
{addExpAdv===adv.id&&<div style={{marginTop:8,padding:'10px 12px',borderRadius:8,background:'rgba(201,168,76,.03)',border:'1px solid rgba(201,168,76,.06)'}}>
<div style={{display:'grid',gridTemplateColumns:'1fr 2fr 1fr',gap:6,marginBottom:6}}>
<input value={advExpForm.amount} onChange={e=>setAdvExpForm(p=>({...p,amount:e.target.value}))} placeholder="المبلغ" type="number" style={{height:32,padding:'0 8px',borderRadius:6,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.03)',color:'var(--tx)',fontFamily:F,fontSize:10,outline:'none'}}/>
<input value={advExpForm.description} onChange={e=>setAdvExpForm(p=>({...p,description:e.target.value}))} placeholder="الوصف" style={{height:32,padding:'0 8px',borderRadius:6,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.03)',color:'var(--tx)',fontFamily:F,fontSize:10,outline:'none'}}/>
<input type="date" value={advExpForm.date} onChange={e=>setAdvExpForm(p=>({...p,date:e.target.value}))} style={{height:32,padding:'0 6px',borderRadius:6,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.03)',color:'var(--tx)',fontFamily:F,fontSize:9,direction:'ltr',outline:'none'}}/>
</div>
<button onClick={()=>addAdvExpense(adv.id)} style={{height:30,padding:'0 14px',borderRadius:6,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.1)',color:C.gold,fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer'}}>حفظ</button>
</div>}
</div>}
</div>})}

{/* Add advance modal */}
{showAddAdv&&<div onClick={()=>setShowAddAdv(false)} style={{position:'fixed',inset:0,background:'rgba(10,10,10,.85)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
<div onClick={e=>e.stopPropagation()} style={{background:'#1e1e1e',borderRadius:14,width:'min(400px,90vw)',padding:'20px',border:'1px solid rgba(201,168,76,.1)',direction:'rtl',fontFamily:F}}>
<div style={{fontSize:16,fontWeight:800,color:'var(--tx)',marginBottom:14}}>عهدة جديدة</div>
<div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:14}}>
<input value={advForm.employee_name} onChange={e=>setAdvForm(p=>({...p,employee_name:e.target.value}))} placeholder="اسم الموظف" style={{height:38,padding:'0 12px',borderRadius:8,border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.03)',color:'var(--tx)',fontFamily:F,fontSize:12,outline:'none'}}/>
<input value={advForm.amount} onChange={e=>setAdvForm(p=>({...p,amount:e.target.value}))} placeholder="المبلغ" type="number" style={{height:38,padding:'0 12px',borderRadius:8,border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.03)',color:'var(--tx)',fontFamily:F,fontSize:12,outline:'none'}}/>
<input value={advForm.purpose} onChange={e=>setAdvForm(p=>({...p,purpose:e.target.value}))} placeholder="الغرض (اختياري)" style={{height:38,padding:'0 12px',borderRadius:8,border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.03)',color:'var(--tx)',fontFamily:F,fontSize:12,outline:'none'}}/>
</div>
<div style={{display:'flex',gap:8}}>
<button onClick={()=>setShowAddAdv(false)} style={{height:38,padding:'0 16px',borderRadius:8,border:'1px solid rgba(255,255,255,.08)',background:'transparent',color:'var(--tx5)',fontFamily:F,fontSize:11,cursor:'pointer'}}>إلغاء</button>
<button onClick={addAdvance} style={{flex:1,height:38,borderRadius:8,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.1)',color:C.gold,fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer'}}>إنشاء العهدة</button>
</div>
</div>
</div>}
</div>

:tab==='bank_log'?<div>
<div style={{fontSize:14,fontWeight:800,color:'var(--tx)',marginBottom:12}}>سجل العمليات البنكية</div>
<div style={{fontSize:10,color:'var(--tx5)',marginBottom:14}}>جميع العمليات البنكية من رسائل SMS — مع تنبيه للعمليات غير المبررة</div>

{/* Suspicious alert */}
{suspiciousOps.length>0&&<div style={{padding:'14px 16px',borderRadius:10,background:'rgba(192,57,43,.06)',border:'1.5px solid rgba(192,57,43,.15)',marginBottom:14,display:'flex',alignItems:'center',gap:10}}>
<div style={{width:36,height:36,borderRadius:10,background:'rgba(192,57,43,.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,color:C.red,flexShrink:0}}>!</div>
<div>
<div style={{fontSize:13,fontWeight:700,color:C.red}}>{suspiciousOps.length} سحب غير مبرر</div>
<div style={{fontSize:9,color:'var(--tx5)'}}>عمليات سحب من البنك بدون معاملة أو مصروف مسجل — إجمالي: {nm(suspiciousOps.reduce((s,r)=>s+Number(r.amount||0),0))} ر.س</div>
</div>
</div>}

{/* All bank operations */}
<div style={{display:'flex',flexDirection:'column',gap:4}}>
{bankData.slice(0,50).map(r=>{const isSusp=suspiciousOps.some(s=>s.id===r.id);const isInc=isIncomeType(r.transaction_type)
return<div key={r.id} onClick={()=>openDetail(r,r)} style={{padding:'10px 14px',borderRadius:8,background:isSusp?'rgba(192,57,43,.03)':'rgba(255,255,255,.015)',border:'1px solid '+(isSusp?'rgba(192,57,43,.1)':'rgba(255,255,255,.04)'),display:'flex',alignItems:'center',gap:10,cursor:'pointer',transition:'.1s'}} onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(201,168,76,.15)'} onMouseLeave={e=>e.currentTarget.style.borderColor=isSusp?'rgba(192,57,43,.1)':'rgba(255,255,255,.04)'}>
{isSusp&&<span style={{width:8,height:8,borderRadius:'50%',background:C.red,flexShrink:0}}/>}
{!isSusp&&<span style={{width:8,height:8,borderRadius:'50%',background:isInc?C.ok:'var(--tx6)',flexShrink:0}}/>}
<div style={{flex:1}}>
<div style={{fontSize:11,fontWeight:600,color:isSusp?C.red:'var(--tx)'}}>{r.description?r.description.substring(0,50):(isInc?'إيداع':'سحب')}{isSusp?' — غير مبرر':''}</div>
<div style={{fontSize:8,color:'var(--tx6)',marginTop:2}}>{r.transaction_date} · {r.bank_name||''}{r.otp_message_id?' · 📱':''}{r.match_status==='matched'?' · مطابق':''}</div>
</div>
<span style={{fontSize:12,fontWeight:800,color:isInc?C.ok:isSusp?C.red:'var(--tx4)',direction:'ltr'}}>{isInc?'+':'-'}{nm(r.amount)}</span>
</div>})}
{bankData.length>50&&<div style={{fontSize:9,color:'var(--tx6)',textAlign:'center',padding:8}}>+{bankData.length-50} عملية أخرى</div>}
</div>
</div>

:null}
</div>
</div>

{/* Detail Modal */}
{detailItem&&<DetailModal item={detailItem} smsMsg={detailSms} onClose={()=>{setDetailItem(null);setDetailSms(null)}} onApprove={tab==='daily_exp'?approveExp:null} onReject={tab==='daily_exp'?rejectExp:null} onSaveNotes={saveNotes} onConfirm={detailItem.match_status?confirmMatch:null} user={user} isExpense={!isIncomeType(detailItem.transaction_type||'')}/>}
</div>}
