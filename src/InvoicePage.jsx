import React,{useState,useEffect,useCallback} from 'react'
import OfficialStampBadge from './components/ui/OfficialStampBadge.jsx'
const F="'Cairo','Tajawal',sans-serif"
const C={gold:'#D4A017',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}
const num=v=>Number(v||0).toLocaleString('en-US')
const stClr={paid:'#27a046',partial:'#D4A017',unpaid:'#c0392b',cancelled:'#666',overpaid:'#3483b4'}
const stLabel={paid:'مسدّدة',partial:'سداد جزئي',unpaid:'غير مسدّدة',cancelled:'ملغاة',overpaid:'سداد زائد'}

export default function InvoicePage({sb,user,toast,lang}){
const isAr=lang!=='en';const T=(a,e)=>isAr?a:e
const isGM=!user?.roles||user?.roles?.name_ar==='المدير العام'||user?.roles?.name_en==='General Manager'
const[invs,setInvs]=useState([]);const[loading,setLoading]=useState(true)
const[q,setQ]=useState('');const[filter,setFilter]=useState('all')
const[payPop,setPayPop]=useState(null);const[viewPop,setViewPop]=useState(null);const[delPop,setDelPop]=useState(null)
const[payF,setPayF]=useState({amount:'',method:'cash',date:'',reference:'',bank:'',notes:''})
const[saving,setSaving]=useState(false);const[clients,setClients]=useState([]);const[brokersList,setBrokers]=useState([])
const[payments,setPayments]=useState([]);const[viewTab,setViewTab]=useState('info');const[installments,setInstallments]=useState([]);const[invoiceItems,setInvoiceItems]=useState([])
const[branches,setBranches]=useState([])
const[aging,setAging]=useState([])
const[officeFilter,setOfficeFilter]=useState(()=>isGM?'':(user?.branch_id||''))
const[officeDropOpen,setOfficeDropOpen]=useState(false)
const[statsPeriod,setStatsPeriod]=useState('daily')
const[periodOffset,setPeriodOffset]=useState(0)
const[advOpen,setAdvOpen]=useState(false)
const[advFilter,setAdvFilter]=useState({from:'',to:'',service:'',client:'',amountMin:'',amountMax:'',status:''})

const load=useCallback(async()=>{
setLoading(true)
const[inv,br,ag]=await Promise.all([
sb.from('invoices').select('*,clients:client_id(name_ar,name_en,phone),brokers:broker_id(name_ar)').is('deleted_at',null).order('created_at',{ascending:false}),
sb.from('branches').select('id,name_ar').is('deleted_at',null).order('name_ar'),
sb.from('v_receivables_aging').select('*')
])
setInvs(inv.data||[]);setBranches(br.data||[]);setAging(ag.data||[]);setLoading(false)
},[sb])

useEffect(()=>{load()
sb.from('clients').select('id,name_ar,name_en,phone,id_number').is('deleted_at',null).order('name_ar').then(({data})=>setClients(data||[]))
sb.from('brokers').select('id,name_ar').is('deleted_at',null).order('name_ar').then(({data})=>setBrokers(data||[]))
// _transferCalcs is set but never read — leaving the legacy global empty for any external consumers.
window._transferCalcs=[]
},[load,sb])

// Load payments for a specific invoice
const loadPayments=async(invId)=>{
const{data}=await sb.from('invoice_payments').select('*').eq('invoice_id',invId).is('deleted_at',null).order('payment_date',{ascending:false})
setPayments(data||[])
}

// Stats
const today=new Date().toISOString().split('T')[0]

// Office scope: non-GM locked to their branch; GM can filter by officeFilter
const inOfficeScope=(inv)=>{
const rb=inv.branch_id
if(!isGM)return !user?.branch_id||!rb||rb===user.branch_id
if(!officeFilter)return true
return rb===officeFilter
}
const periodInvs=invs.filter(inOfficeScope)
const sts={
total:periodInvs.reduce((s,i)=>s+(i.total_amount||0),0),
paid:periodInvs.reduce((s,i)=>s+(i.paid_amount||0),0),
outstanding:periodInvs.reduce((s,i)=>s+(i.remaining_amount||0),0),
net:periodInvs.reduce((s,i)=>s+(i.net_amount||0),0),
count:periodInvs.length,
pdc:periodInvs.filter(i=>i.status==='paid').length,
prc:periodInvs.filter(i=>i.status==='partial').length,
uc:periodInvs.filter(i=>i.status==='unpaid').length,
cc:periodInvs.filter(i=>i.status==='cancelled').length
}

// Filter + Search + Advanced
const filtered=periodInvs.filter(i=>{
if(filter!=='all'&&i.status!==filter)return false
if(advFilter.status&&i.status!==advFilter.status)return false
if(advFilter.from&&i.issue_date&&i.issue_date<advFilter.from)return false
if(advFilter.to&&i.issue_date&&i.issue_date>advFilter.to)return false
if(advFilter.service&&i.service_category!==advFilter.service)return false
if(advFilter.client&&i.client_id!==advFilter.client)return false
if(advFilter.amountMin&&Number(i.total_amount||0)<Number(advFilter.amountMin))return false
if(advFilter.amountMax&&Number(i.total_amount||0)>Number(advFilter.amountMax))return false
if(!q)return true
const s=q.toLowerCase()
return(i.invoice_number||'').toLowerCase().includes(s)||(i.clients?.name_ar||'').includes(s)||(i.clients?.name_en||'').toLowerCase().includes(s)||(i.brokers?.name_ar||'').includes(s)||String(i.total_amount||'').includes(s)||(i.clients?.phone||'').includes(s)
})

// Derived stats for KPI dashboard
const totalIssued=periodInvs.filter(i=>i.status!=='cancelled').reduce((s,i)=>s+Number(i.total_amount||0),0)
const totalPaid=periodInvs.filter(i=>i.status!=='cancelled').reduce((s,i)=>s+Number(i.paid_amount||0),0)
const collectionPct=totalIssued>0?Math.round(totalPaid/totalIssued*100):0
const activeInvCount=periodInvs.filter(i=>i.status!=='cancelled').length
const avgInvoiceValue=activeInvCount>0?Math.round(totalIssued/activeInvCount):0

// Period series for paid vs due chart (7 buckets, shiftable by periodOffset)
const periodBuckets=7
const nowMs=Date.now()
const bucketMs=statsPeriod==='daily'?86400000:statsPeriod==='weekly'?7*86400000:30*86400000
const offsetShift=periodOffset*periodBuckets*bucketMs
const periodSeries=(()=>{
const result=Array.from({length:periodBuckets},()=>({paid:0,due:0,total:0}))
periodInvs.forEach(inv=>{if(inv.status==='cancelled')return
const d=new Date((inv.issue_date||inv.created_at||'').slice(0,10)+'T12:00:00')
if(isNaN(d))return
const age=Math.floor((nowMs-d.getTime()-offsetShift)/bucketMs)
if(age<0||age>=periodBuckets)return
const idx=periodBuckets-1-age
result[idx].paid+=Number(inv.paid_amount||0)
result[idx].due+=Number(inv.remaining_amount||0)
result[idx].total+=Number(inv.total_amount||0)})
return result
})()

const branchMap=Object.fromEntries(branches.map(b=>[b.id,b]))

// Group by date
const groups={}
const groupOrder=[]
filtered.forEach(inv=>{
const key=(inv.issue_date||'').slice(0,10)||'بدون تاريخ'
if(!groups[key]){groups[key]=[];groupOrder.push(key)}
groups[key].push(inv)
})

const dayNames=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']
const monthNames=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const dayLabel=(key)=>{
if(key===today)return'اليوم'
try{const d=new Date(key+'T12:00:00');return dayNames[d.getDay()]}catch{return key}
}
const dayFull=(key)=>{
try{const d=new Date(key+'T12:00:00');return d.getDate()+' '+monthNames[d.getMonth()]+' '+d.getFullYear()}catch{return key}
}

const openView=async(inv)=>{await loadPayments(inv.id);const[instR,itemsR]=await Promise.all([sb.from('invoice_installments').select('*').eq('invoice_id',inv.id).is('deleted_at',null).order('installment_order'),sb.from('invoice_items').select('*').eq('invoice_id',inv.id).order('sort_order')]);setInstallments(instR.data||[]);setInvoiceItems(itemsR.data||[]);setViewTab('info');setViewPop(inv)}
const openPay=(inv)=>{setPayF({_id:inv.id,amount:'',method:'cash',date:today,reference:'',bank:'',notes:'',max:inv.remaining_amount||0,inv_num:inv.invoice_number,client:inv.clients?.name_ar});setPayPop(inv)}


// Delete invoice with reason
const delInv=async()=>{
setSaving(true)
const{error}=await sb.from('invoices').update({deleted_at:new Date().toISOString(),deleted_by:user?.id,deleted_reason:delPop.reason||null}).eq('id',delPop.id)
if(error)toast(T('خطأ','Error'));else{toast(T('تم حذف الفاتورة','Invoice deleted'));load()}
setDelPop(null);setSaving(false)}

// Save payment
const savePay=async()=>{
if(!payF.amount||Number(payF.amount)<=0){toast(T('أدخل مبلغ الدفعة','Enter payment amount'));return}
if(Number(payF.amount)>payF.max){toast(T('المبلغ أكبر من المتبقي (','Amount exceeds remaining (')+num(payF.max)+T(' ر.س)',' SAR)'));return}
setSaving(true)
const{error:e1}=await sb.from('invoice_payments').insert({invoice_id:payPop.id,amount:Number(payF.amount),payment_method:payF.method,payment_date:payF.date,reference_number:payF.reference||null,bank_name:payF.bank||null,notes:payF.notes||null,collected_by_user_id:user?.id,created_by:user?.id})
if(e1){toast(T('خطأ: ','Error: ')+e1.message);setSaving(false);return}
const newPaid=(payPop.paid_amount||0)+Number(payF.amount);const newRem=(payPop.remaining_amount||0)-Number(payF.amount)
const newStatus=newRem<=0?'paid':newPaid>0?'partial':'unpaid'
await sb.from('invoices').update({paid_amount:newPaid,remaining_amount:Math.max(0,newRem),status:newStatus,updated_by:user?.id}).eq('id',payPop.id)
toast(T('تم تسجيل الدفعة بنجاح','Payment recorded'));
// Auto WhatsApp notification
const cl=payPop.clients;const ph=cl?.phone?.replace(/\D/g,'').replace(/^0/,'966')
if(ph&&confirm(T('إرسال إشعار واتساب للعميل؟','Send WhatsApp to client?'))){
const msg=encodeURIComponent(`السلام عليكم ${cl.name_ar}\n\n✅ تم استلام دفعة بمبلغ ${num(Number(payF.amount))} ريال\n\nفاتورة: ${payPop.invoice_number}\nالمدفوع الآن: ${num(newPaid)} ريال\nالمتبقي: ${num(Math.max(0,newRem))} ريال\nالحالة: ${newStatus==='paid'?'مدفوعة بالكامل ✅':newStatus==='partial'?'مدفوعة جزئياً':'غير مدفوعة'}\n\nشكراً لكم — جسر للأعمال`)
window.open('https://wa.me/'+ph+'?text='+msg,'_blank')
sb.from('whatsapp_log').insert({phone:ph,client_id:payPop.client_id,event_type:'payment_received',message_ar:'دفعة '+num(Number(payF.amount))+' — فاتورة '+payPop.invoice_number,entity_id:payPop.id,sent_by:user?.id}).then(()=>{})
}
// Print receipt
if(confirm(T('طباعة إيصال تحصيل؟','Print receipt?'))){const w=window.open('','_blank');w.document.write('<html dir="rtl"><head><style>body{font-family:Cairo,sans-serif;padding:40px;color:#333;max-width:400px;margin:0 auto}h2{font-size:16px;text-align:center;border-bottom:2px solid #D4A017;padding-bottom:10px;color:#D4A017}table{width:100%;margin:12px 0}td{padding:6px 0;font-size:12px;border-bottom:1px solid #eee}td:first-child{color:#888;width:35%}td:last-child{font-weight:700;text-align:left;direction:ltr}.amt{font-size:20px;text-align:center;color:#27a046;font-weight:800;margin:16px 0}.footer{text-align:center;font-size:9px;color:#aaa;margin-top:30px;border-top:1px solid #eee;padding-top:10px}</style></head><body>');w.document.write('<h2>إيصال تحصيل — جسر للأعمال</h2>');w.document.write('<div class="amt">'+num(Number(payF.amount))+' ر.س</div>');w.document.write('<table><tr><td>العميل</td><td>'+(cl?.name_ar||'—')+'</td></tr><tr><td>رقم الفاتورة</td><td>'+payPop.invoice_number+'</td></tr><tr><td>المبلغ المدفوع</td><td>'+num(Number(payF.amount))+' ر.س</td></tr><tr><td>طريقة الدفع</td><td>'+(payF.method==='cash'?'نقداً':'حوالة بنكية')+'</td></tr>'+(payF.reference?'<tr><td>رقم المرجع</td><td>'+payF.reference+'</td></tr>':'')+'<tr><td>التاريخ</td><td>'+(payF.date||new Date().toISOString().slice(0,10))+'</td></tr><tr><td>إجمالي المدفوع</td><td>'+num(newPaid)+' ر.س</td></tr><tr><td>المتبقي</td><td>'+num(Math.max(0,newRem))+' ر.س</td></tr><tr><td>الحالة</td><td>'+(newStatus==='paid'?'مدفوعة بالكامل ✅':'مدفوعة جزئياً')+'</td></tr></table>');w.document.write('<div class="footer">طُبع بتاريخ '+new Date().toLocaleDateString('ar-SA')+' — جسر للأعمال<br>هذا إيصال إلكتروني ولا يحتاج توقيع</div></body></html>');w.document.close();w.print()}
setPayPop(null);load();setSaving(false)}

const statusColors={paid:'rgba(39,174,96,.85)',partial:C.gold,unpaid:C.red,cancelled:'rgba(255,255,255,.25)',overpaid:C.blue}
const statusLabels={paid:'مسددة بالكامل',partial:'سداد جزئي',unpaid:'بانتظار السداد',cancelled:'ملغاة',overpaid:'سداد زائد'}
const orderStatusLabels={draft:{l:'مسودة',c:'#888'},pending:{l:'بانتظار المراجعة',c:'#e67e22'},in_progress:{l:'قيد التنفيذ',c:'#3483b4'},completed:{l:'مكتمل',c:'#27a046'},on_hold:{l:'معلّق',c:'#9b59b6'},cancelled:{l:'ملغي',c:'#c0392b'},issue:{l:'يوجد مشكلة',c:'#c0392b'}}
const svcLabelAr={PERM_VISA:'تأشيرة دائمة',TEMP_VISA:'تأشيرة مؤقتة',TRANSFER:'نقل خدمات',TRANSFER_RENEW:'تجديد نقل كفالة',IQAMA_NEW:'إصدار إقامة',IQAMA_RENEW:'تجديد إقامة',AJEER:'عقد أجير',SAUDIZATION:'سعودة',OTHER:'خدمات أخرى',external:'خدمات خارجية',internal:'خدمات داخلية',office:'خدمات مكتبية',client_transaction:'معاملة عميل',CR_OPEN:'إصدار سجل تجاري',CR_EDIT:'تعديل سجل تجاري',CR_DELETE:'شطب سجل تجاري',WP_NEW:'إصدار رخصة عمل',WP_REN:'تجديد رخصة عمل',GOSI_REG:'تسجيل تأمينات',VISA_REC:'تأشيرة استقدام',VISA_VIS:'تأشيرة زيارة'}
const pct=(inv)=>inv.total_amount>0?Math.round((inv.paid_amount||0)/inv.total_amount*100):0

const printInvoice=(inv)=>{
const cl=inv.clients||{};const w=window.open('','_blank')
sb.from('invoice_payments').select('*').eq('invoice_id',inv.id).is('deleted_at',null).order('payment_date').then(({data:pays})=>{
sb.from('invoice_installments').select('*').eq('invoice_id',inv.id).is('deleted_at',null).order('installment_order').then(({data:insts})=>{
const pmts=pays||[];const installments=insts||[];const paidAmts=pmts.map(p=>num(p.amount)).join(' ,')
const stBar=inv.status==='paid'?['#27a046','مدفوعة بالكامل — Fully paid']:inv.status==='partial'?['#D4A017','مدفوعة جزئياً — Partially paid']:['#c0392b','غير مدفوعة — Unpaid']
const svcLabel={PERM_VISA:'تأشيرة عمل — Work Visa',TEMP_VISA:'تأشيرة مؤقتة — Temp Visa',TRANSFER:'نقل كفالة — Sponsorship Transfer',IQAMA_RENEW:'تجديد إقامة — Iqama Renewal',AJEER:'عقد أجير — Ajeer',OTHER:'خدمات أخرى — Other'}
w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><style>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Cairo',sans-serif;color:#222;font-size:11px;background:#fff}
.p{max-width:780px;margin:0 auto;padding:20px 28px}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;padding-bottom:8px;border-bottom:3px solid #D4A017}
.on{font-size:18px;font-weight:800}.oa{font-size:9px;color:#555;line-height:1.6}
.lg{font-size:28px;font-weight:900;color:#D4A017}.ls{font-size:8px;color:#999;letter-spacing:1px}
.br{background:#2c3e50;color:#fff;text-align:center;padding:6px;border-radius:4px;margin-bottom:6px;font-size:11px;font-weight:700}
.sb{text-align:center;padding:8px;border-radius:4px;margin-bottom:10px;font-size:14px;font-weight:800}
.ir{display:flex;justify-content:space-between;padding:2px 0;font-size:10px}.il{color:#888}.iv{font-weight:700}
.rg{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
.rb{border:1px solid #ddd;border-radius:6px;padding:10px 12px}
.rb h4{font-size:8px;color:#999;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;padding-bottom:3px;border-bottom:1px solid #eee}
.ab{background:#f5f3ec;border:2px solid #D4A017;border-radius:8px;text-align:center;padding:14px;margin-bottom:12px}
.ab h3{font-size:10px;color:#555;margin-bottom:4px;font-weight:600}.ab .bg{font-size:26px;font-weight:900;color:#222}
table{width:100%;border-collapse:collapse;margin-bottom:10px;font-size:10px}
th{background:#4a6fa5;color:#fff;padding:6px 8px;font-weight:700;border:1px solid #3d5d8f;text-align:center;font-size:9px}
td{padding:6px 8px;border:1px solid #ddd;text-align:center}tr:nth-child(even){background:#f9f9f9}
.gt th{background:#D4A017;border-color:#b8963d}
.sm{border:2px solid #D4A017;border-radius:6px;overflow:hidden;margin-bottom:10px}
.sh{background:#D4A017;color:#fff;padding:6px 12px;font-size:11px;font-weight:700;display:flex;justify-content:space-between}
.sr{display:flex;justify-content:space-between;padding:6px 12px;font-size:11px;border-bottom:1px solid #f0f0f0}.sr:last-child{border:none}
.st{background:#f8f6f0;font-size:13px;font-weight:800}
.sp{background:#e8f5e9;color:#27a046;font-size:8px;font-weight:700;padding:2px 6px;border-radius:3px;display:inline-block}
.su{background:#fce4ec;color:#c0392b;font-size:8px;font-weight:700;padding:2px 6px;border-radius:3px;display:inline-block}
.spt{background:#fff8e1;color:#D4A017;font-size:8px;font-weight:700;padding:2px 6px;border-radius:3px;display:inline-block}
.nt{background:#fff8e1;border:1px solid #f0d36e;border-radius:4px;padding:6px 10px;font-size:8px;color:#8a6d00;margin:10px 0;text-align:center;line-height:1.8}
.ft{padding-top:6px;border-top:2px solid #D4A017;font-size:7px;color:#bbb;display:flex;justify-content:space-between}
@media print{body{padding:0}.p{padding:12px 20px}}
</style></head><body><div class="p">
<div class="hdr"><div style="width:35%;text-align:right"><div class="on">جسر للأعمال</div><div class="oa">خدمات مكاتب الاستقدام<br>المملكة العربية السعودية</div></div>
<div style="width:30%;text-align:center"><div class="lg">جسر</div><div class="ls">JISR BUSINESS</div></div>
<div style="width:35%;text-align:left;direction:ltr"><div class="on" style="font-size:14px">Jisr Business</div><div class="oa">Recruitment Services<br>Saudi Arabia</div></div></div>
<div class="br">${svcLabel[inv.service_category]||inv.service_category||'خدمات مكتبية'}</div>
<div class="sb" style="background:${stBar[0]}18;color:${stBar[0]};border:1.5px solid ${stBar[0]}40">${stBar[1]}</div>
<div style="display:flex;justify-content:space-between;font-size:9px;color:#666;margin-bottom:8px"><div>تاريخ الإيصال: <b>${inv.issue_date||'—'}</b></div><div style="direction:ltr">Receipt No: <b>${inv.invoice_number||'—'}</b></div></div>
<div class="rg"><div class="rb"><h4>مفوتر إلى — Bill To</h4>
<div class="ir"><span class="il">الاسم</span><span class="iv">${cl.name_ar||'—'}</span></div>
${cl.name_en?'<div class="ir"><span class="il">Name</span><span class="iv">'+cl.name_en+'</span></div>':''}
${cl.id_number?'<div class="ir"><span class="il">الهوية — ID</span><span class="iv" style="direction:ltr">'+cl.id_number+'</span></div>':''}
<div class="ir"><span class="il">الجوال — Phone</span><span class="iv" style="direction:ltr">${cl.phone||'—'}</span></div></div>
<div class="rb"><h4>بيانات الفاتورة</h4>
<div class="ir"><span class="il">رقم الفاتورة</span><span class="iv">${inv.invoice_number||'—'}</span></div>
<div class="ir"><span class="il">تاريخ الإصدار</span><span class="iv">${inv.issue_date||'—'}</span></div>
<div class="ir"><span class="il">تاريخ الاستحقاق</span><span class="iv">${inv.due_date||'—'}</span></div>
<div class="ir"><span class="il">الحالة</span><span class="iv"><span class="${inv.status==='paid'?'sp':inv.status==='partial'?'spt':'su'}">${inv.status==='paid'?'مدفوعة':inv.status==='partial'?'جزئي':'غير مدفوعة'}</span></span></div></div></div>
<div class="ab"><h3>المبلغ المستلم لهذا الإيصال — Amount Received For This Receipt</h3><div class="bg">﷼ ${num(inv.paid_amount||0)}</div></div>
${pmts.length>0||installments.length>0?`<div style="font-size:11px;font-weight:700;padding:6px 0;border-bottom:2px solid #D4A017;margin-bottom:6px">تفاصيل الدفع — Payment Details</div>
${paidAmts?'<table style="margin-bottom:6px"><tr style="background:#f5f5f5"><td style="text-align:right;font-weight:700;border:1px solid #ddd;padding:6px 10px">سجل الدفعات المستلمة الفعلية<br><span style="font-size:8px;color:#888">Record of actual received payments</span></td><td style="direction:ltr;font-weight:700;border:1px solid #ddd;padding:6px 10px">'+paidAmts+'</td></tr></table>':''}
<div style="font-size:11px;font-weight:700;padding:6px 0;border-bottom:2px solid #D4A017;margin-bottom:6px">جدول الأقساط — Payment Schedule</div>
<table class="gt"><thead><tr><th>#</th><th>القيمة<br>Amount</th><th>الاستحقاق<br>Due Condition</th><th>تاريخ الاستحقاق<br>Due Date</th><th>المبلغ المسدد<br>Amount Paid</th><th>الطريقة<br>Method</th><th>الحالة<br>Status</th></tr></thead><tbody>
${installments.length>0?installments.map((inst,i)=>{const pd=inst.status==='paid';const pm=pmts[i];return'<tr><td>'+(i+1)+'</td><td>'+num(inst.amount)+' ريال</td><td>'+(inst.notes||'—')+'</td><td>'+(inst.due_date||pm?.payment_date||'—')+'</td><td>'+(pd?num(pm?.amount||inst.amount)+' ريال':'—')+'</td><td>'+(pd?(pm?.payment_method==='cash'?'نقداً<br>Cash':'حوالة بنكية<br>Bank'):'—')+'</td><td>'+(pd?'<span class="sp">مدفوع كاملاً<br>Fully paid</span>':inst.status==='partial'?'<span class="spt">مدفوع جزئياً<br>Partially paid</span>':'<span class="su">في الانتظار<br>Pending</span>')+'</td></tr>'}).join('')
:pmts.map((p,i)=>'<tr><td>'+(i+1)+'</td><td>'+num(p.amount)+' ريال</td><td>'+(i===0?'دفعة أولية<br>Initial payment':'دفعة '+(i+1)+'<br>Payment '+(i+1))+'</td><td>'+(p.payment_date||'—')+'</td><td>'+num(p.amount)+' ريال</td><td>'+(p.payment_method==='cash'?'نقداً<br>Cash':'حوالة بنكية<br>Bank Transfer')+'</td><td><span class="sp">مدفوع كاملاً<br>Fully paid</span></td></tr>').join('')}
</tbody></table>`:''}
<div class="sm"><div class="sh"><span>ملخص الفاتورة — Invoice Summary</span></div>
<div class="sr"><span>المبلغ الإجمالي — Total Amount</span><span><b><u>${num(inv.total_amount)}</u></b> &nbsp; <b>SAR</b> &nbsp;&nbsp; ريال &nbsp; <b><u>${num(inv.total_amount)}</u></b></span></div>
${Number(inv.discount_amount)>0?'<div class="sr"><span>الخصم — Discount</span><span style="color:#D4A017"><b>-'+num(inv.discount_amount)+'</b> SAR</span></div>':''}
<div class="sr"><span style="color:#27a046">المبلغ المدفوع — Paid Amount</span><span style="color:#27a046"><b>${num(inv.paid_amount||0)}</b> &nbsp; <b>SAR</b> &nbsp;&nbsp; ريال &nbsp; <b>${num(inv.paid_amount||0)}</b></span></div>
<div class="sr st"><span style="color:#c0392b">المبلغ المتبقي — Remaining Amount</span><span style="color:#c0392b"><b>${num(inv.remaining_amount||0)}</b> &nbsp; <b>SAR</b> &nbsp;&nbsp; ريال &nbsp; <b>${num(inv.remaining_amount||0)}</b></span></div></div>
<div class="nt">إشعار هام: المكتب غير مسؤول عن أي مدفوعات بدون فاتورة رسمية. يجب على العميل طلب فاتورة لجميع تعاملاته<br>Important Notice: Office not responsible for payments without official invoice. Client must request invoice for all transactions</div>
<div class="ft"><span>جسر للأعمال — Jisr Business</span><span>طُبعت بتاريخ ${new Date().toLocaleDateString('ar-SA')} — ${new Date().toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'})}</span></div>
</div></body></html>`)
w.document.close();setTimeout(()=>w.print(),400)})})}
const fieldS={width:'100%',height:40,padding:'0 14px',background:'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',border:'1px solid rgba(255,255,255,.06)',borderRadius:11,fontFamily:F,fontSize:14,fontWeight:400,color:'var(--tx)',outline:'none',boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'}
const lblS={fontSize:12,fontWeight:600,color:'var(--tx3)',marginBottom:6}
const overlayS={position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}
const popupS={background:'linear-gradient(160deg,#333 0%,#2A2A2A 50%,#232323 100%)',backdropFilter:'blur(20px) saturate(160%)',WebkitBackdropFilter:'blur(20px) saturate(160%)',borderRadius:16,maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)',border:'1px solid rgba(255,255,255,.08)'}
const headS={background:'linear-gradient(180deg,rgba(0,0,0,.18),rgba(0,0,0,.06))',padding:'16px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0,borderBottom:'1px solid rgba(255,255,255,.06)'}
const closeS={width:30,height:30,borderRadius:10,background:'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',border:'1px solid rgba(255,255,255,.06)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'}
const goldBtnS={height:40,padding:'0 18px',borderRadius:11,border:'1px solid rgba(212,160,23,.45)',background:'linear-gradient(180deg,rgba(212,160,23,.22) 0%,rgba(212,160,23,.10) 100%)',color:C.gold,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:'0 2px 8px rgba(212,160,23,.18), inset 0 1px 0 rgba(212,160,23,.18)',transition:'.2s'}
const ghostBtnS={height:40,padding:'0 18px',background:'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',color:'var(--tx4)',border:'1px solid rgba(255,255,255,.06)',borderRadius:11,fontFamily:F,fontSize:12,fontWeight:500,cursor:'pointer',boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'}

return<div style={{fontFamily:F,paddingTop:0}}>
<div style={{marginBottom:24,display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:14,flexWrap:'wrap',position:'relative'}}>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:24,fontWeight:600,color:'rgba(255,255,255,.93)',letterSpacing:'-.3px',lineHeight:1.2}}>{T('لوحة الفواتير','Invoices Dashboard')}</div>
<div style={{fontSize:13,fontWeight:500,color:'var(--tx4)',marginTop:12,lineHeight:1.6}}>{T('إدارة الفواتير والمدفوعات اليومية','Daily invoices and payments management')}</div>
<div style={{display:'flex',alignItems:'center',gap:10,marginTop:14}}>
<div style={{display:'flex',alignItems:'center',gap:8}}>
<span style={{width:6,height:6,borderRadius:'50%',background:C.gold,boxShadow:'0 0 5px '+C.gold}}/>
<span style={{fontSize:13,fontWeight:600,color:'var(--tx3)'}}>{T('الفترة','Period')}</span>
</div>
{(()=>{const order=[['monthly',T('شهري','Monthly')],['weekly',T('أسبوعي','Weekly')],['daily',T('يومي','Daily')]]
const idx=order.findIndex(([k])=>k===statsPeriod)
const cycle=(dir)=>{const next=idx+dir;if(next<0||next>=order.length)return;setStatsPeriod(order[next][0]);setPeriodOffset(0)}
const atStart=idx===0,atEnd=idx===order.length-1
const btnStyle=(dis)=>({width:28,height:28,borderRadius:10,border:'1px solid rgba(255,255,255,.06)',background:'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',color:'var(--tx3)',cursor:dis?'not-allowed':'pointer',opacity:dis?.35:1,display:'inline-flex',alignItems:'center',justifyContent:'center',padding:0,boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'})
return<div style={{display:'flex',alignItems:'center',gap:8}}>
<button disabled={atEnd} onClick={()=>cycle(1)} title={T('التالي','Next')} style={btnStyle(atEnd)}>
<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
</button>
<span style={{fontSize:12,fontWeight:600,color:C.gold,minWidth:64,textAlign:'center'}}>{order[idx][1]}</span>
<button disabled={atStart} onClick={()=>cycle(-1)} title={T('السابق','Previous')} style={btnStyle(atStart)}>
<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
</button>
</div>})()}
</div>
</div>
{isGM&&branches.length>0&&(()=>{const sel=branches.find(b=>b.id===officeFilter)
const items=[{id:'',label:T('كل المكاتب','All offices')},...branches.map(b=>({id:b.id,label:b.name_ar||b.code||b.id.slice(0,6)}))]
return<div style={{position:'relative'}}>
<button onClick={()=>setOfficeDropOpen(o=>!o)} style={{height:40,padding:'0 14px',borderRadius:11,border:officeDropOpen?'1px solid rgba(212,160,23,.45)':'1px solid rgba(255,255,255,.06)',background:officeDropOpen?'linear-gradient(180deg,rgba(212,160,23,.16),rgba(212,160,23,.08))':'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',color:sel?C.gold:'rgba(255,255,255,.78)',fontFamily:F,fontSize:12,fontWeight:500,outline:'none',cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'space-between',gap:10,minWidth:130,boxShadow:officeDropOpen?'0 2px 8px rgba(212,160,23,.18), inset 0 1px 0 rgba(212,160,23,.18)':'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s'}}>
<span style={{flex:1,textAlign:'center'}}>{sel?(sel.name_ar||sel.code||sel.id.slice(0,6)):T('كل المكاتب','All offices')}</span>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{transition:'.2s',transform:officeDropOpen?'rotate(180deg)':'none',flexShrink:0}}><polyline points="6 9 12 15 18 9"/></svg>
</button>
{officeDropOpen&&<><div onClick={()=>setOfficeDropOpen(false)} style={{position:'fixed',inset:0,zIndex:1}}/>
<div style={{position:'absolute',top:46,insetInlineEnd:0,minWidth:160,background:'linear-gradient(160deg,#333 0%,#2A2A2A 50%,#232323 100%)',border:'1px solid rgba(255,255,255,.08)',borderRadius:11,padding:6,zIndex:3,boxShadow:'0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06)'}}>
{items.map(it=>{const active=it.id===officeFilter
return<div key={it.id||'__all__'} onClick={()=>{setOfficeFilter(it.id);setOfficeDropOpen(false)}} style={{padding:'9px 14px',fontSize:12,fontWeight:600,color:active?C.gold:'var(--tx2)',background:active?'rgba(212,160,23,.1)':'transparent',borderRadius:8,cursor:'pointer',textAlign:'center',transition:'.12s',whiteSpace:'nowrap'}} onMouseEnter={e=>{if(!active)e.currentTarget.style.background='rgba(255,255,255,.04)'}} onMouseLeave={e=>{if(!active)e.currentTarget.style.background='transparent'}}>{it.label}</div>})}
</div></>}
</div>})()}
</div>
<style>{`
input.iv-noring.iv-noring.iv-noring.iv-noring,
input.iv-noring.iv-noring.iv-noring.iv-noring:not(:placeholder-shown),
select.iv-noring.iv-noring.iv-noring.iv-noring,
textarea.iv-noring.iv-noring.iv-noring.iv-noring{
  border-color:rgba(255,255,255,.06)!important;
  box-shadow:0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)!important;
}
input.iv-noring.iv-noring.iv-noring.iv-noring:focus,
select.iv-noring.iv-noring.iv-noring.iv-noring:focus,
textarea.iv-noring.iv-noring.iv-noring.iv-noring:focus{
  border-color:rgba(212,160,23,.35)!important;
  box-shadow:0 2px 8px rgba(212,160,23,.12), inset 0 1px 0 rgba(255,255,255,.05)!important;
}
input[type="date"].iv-noring.iv-noring.iv-noring.iv-noring::-webkit-calendar-picker-indicator{filter:invert(70%) sepia(60%) saturate(500%) hue-rotate(20deg)}
`}</style>

{(()=>{const glassCard={background:'linear-gradient(160deg,#333 0%,#2A2A2A 50%,#232323 100%)',backdropFilter:'blur(20px) saturate(160%)',WebkitBackdropFilter:'blur(20px) saturate(160%)',border:'1px solid rgba(255,255,255,.08)',borderRadius:16,boxShadow:'0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)',padding:'10px 12px',position:'relative',overflow:'hidden',transition:'.2s'}
const pillBox={background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',border:'1px solid rgba(255,255,255,.06)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 4px rgba(0,0,0,.22)'}
return<div style={{display:'grid',gridTemplateColumns:'minmax(0,2.6fr) minmax(0,1fr)',gap:14,marginBottom:14}}>
<div style={glassCard} onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)'}} onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)'}}>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 2fr',gap:10,marginBottom:8,alignItems:'center'}}>
{[{l:T('مسدّدة','Paid'),v:sts.pdc,c:C.ok},{l:T('جزئي','Partial'),v:sts.prc,c:C.gold},{l:T('غير مسدّدة','Unpaid'),v:sts.uc,c:C.red}].map(s=>(
<div key={s.l} style={{padding:'7px 12px',borderRadius:10,...pillBox,display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
<div style={{display:'flex',alignItems:'center',gap:6}}>
<span style={{width:6,height:6,borderRadius:'50%',background:s.c,boxShadow:'0 0 5px '+s.c}}/>
<div style={{fontSize:20,fontWeight:700,color:s.c,letterSpacing:'-.3px',direction:'ltr',lineHeight:1}}>{s.v}</div>
</div>
<div style={{fontSize:12,color:'var(--tx2)',fontWeight:600}}>{s.l}</div>
</div>))}
<div style={{minWidth:0,padding:'0 6px',display:'flex',alignItems:'center',gap:10}}>
<span style={{fontSize:12,color:'var(--tx2)',fontWeight:600,whiteSpace:'nowrap'}}>{T('نسبة التحصيل','Collection rate')}</span>
<div style={{flex:1,height:7,borderRadius:5,background:'rgba(255,255,255,.06)',overflow:'hidden',position:'relative'}}>
<div style={{width:collectionPct+'%',height:'100%',background:`linear-gradient(90deg, ${C.ok}cc, ${C.ok})`,borderRadius:5,transition:'.4s',boxShadow:'0 0 8px '+C.ok+'66'}}/>
</div>
<span style={{fontSize:13,fontWeight:700,color:C.ok,direction:'ltr'}}>{collectionPct}%</span>
</div>
</div>
{/* Smooth chart — paid vs due */}
{(()=>{const n=periodSeries.length;if(n<2)return null
const W=560,H=88,padL=26,padR=12,padT=12,padB=12
const cw=W-padL-padR,ch=H-padT-padB
const mx=Math.max(1,...periodSeries.flatMap(p=>[p.paid,p.due]))
const niceMx=Math.max(100,Math.ceil(mx/100)*100)
const xAt=i=>(padL+(i/(n-1))*cw).toFixed(1)
const yAt=v=>(padT+ch-(v/niceMx)*ch).toFixed(1)
const smooth=(pts)=>{if(pts.length<2)return ''
let d='M'+pts[0][0]+','+pts[0][1]
for(let i=0;i<pts.length-1;i++){const[x0,y0]=pts[Math.max(0,i-1)],[x1,y1]=pts[i],[x2,y2]=pts[i+1],[x3,y3]=pts[Math.min(pts.length-1,i+2)]
const t=.22
const c1x=x1+(x2-x0)*t,c1y=y1+(y2-y0)*t
const c2x=x2-(x3-x1)*t,c2y=y2-(y3-y1)*t
d+=' C'+c1x.toFixed(1)+','+c1y.toFixed(1)+' '+c2x.toFixed(1)+','+c2y.toFixed(1)+' '+x2+','+y2}
return d}
const ptsOf=(k)=>periodSeries.map((p,i)=>[Number(xAt(i)),Number(yAt(p[k]))])
const lineP=(k)=>smooth(ptsOf(k))
const areaP=(k)=>{const p=ptsOf(k);if(p.length<2)return '';return smooth(p)+' L'+p[p.length-1][0]+','+(padT+ch)+' L'+p[0][0]+','+(padT+ch)+' Z'}
const yTicks=[0,niceMx/2,niceMx]
const fmtTick=v=>v>=1000?Math.round(v/1000)+'k':String(Math.round(v))
return<div style={{padding:'6px 10px'}}>
<svg width="100%" viewBox={`0 0 ${W} ${H-padB+14}`} preserveAspectRatio="none" style={{display:'block',height:90}}>
<defs>
<linearGradient id="inv-gp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.ok} stopOpacity=".35"/><stop offset="100%" stopColor={C.ok} stopOpacity="0"/></linearGradient>
<linearGradient id="inv-gd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.red} stopOpacity=".3"/><stop offset="100%" stopColor={C.red} stopOpacity="0"/></linearGradient>
</defs>
{yTicks.map((t,i)=><g key={i}>
<line x1={padL} x2={W-padR} y1={yAt(t)} y2={yAt(t)} stroke="rgba(255,255,255,.05)" strokeWidth="1"/>
<text x={padL-6} y={Number(yAt(t))+3} fontSize="9" fill="rgba(255,255,255,.3)" textAnchor="end" fontFamily="'Cairo',sans-serif">{fmtTick(t)}</text>
</g>)}
<path d={areaP('paid')} fill="url(#inv-gp)"/><path d={lineP('paid')} fill="none" stroke={C.ok} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
<path d={areaP('due')} fill="url(#inv-gd)"/><path d={lineP('due')} fill="none" stroke={C.red} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
{['paid','due'].map((k)=>{const c=k==='paid'?C.ok:C.red;const last=ptsOf(k)[n-1];return<circle key={k} cx={last[0]} cy={last[1]} r="4" fill="#2A2A2A" stroke={c} strokeWidth="2"/>})}
</svg>
</div>
})()}
</div>
<div style={{...glassCard,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6}} onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)'}} onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)'}}>
<span style={{fontSize:13,fontWeight:600,color:'var(--tx2)',letterSpacing:'.1px'}}>{T('متوسط قيمة الفاتورة','Avg invoice value')}</span>
<div style={{display:'flex',alignItems:'baseline',gap:8,marginTop:2}}>
<span style={{fontSize:54,fontWeight:700,color:C.gold,letterSpacing:'-1.2px',lineHeight:1,textShadow:`0 0 22px ${C.gold}33`,direction:'ltr'}}>{num(avgInvoiceValue)}</span>
<span style={{fontSize:16,fontWeight:600,color:C.gold,opacity:.75}}>{T('ريال','SAR')}</span>
</div>
<div style={{fontSize:12,fontWeight:600,color:'var(--tx4)',letterSpacing:'.3px'}}>{T('عبر '+activeInvCount+' فاتورة','Across '+activeInvCount+' invoices')}</div>
</div>
</div>})()}

<div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14,flexWrap:'wrap'}}>
<div style={{flex:1,minWidth:240,position:'relative'}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{position:'absolute',right:isAr?12:'auto',left:isAr?'auto':12,top:'50%',transform:'translateY(-50%)',color:'rgba(255,255,255,.4)'}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
<input className="iv-noring" value={q} onChange={e=>setQ(e.target.value)} placeholder={T('ابحث برقم الفاتورة أو اسم العميل أو الجوال...','Search by invoice no, client name, or phone...')} style={{width:'100%',height:40,padding:isAr?'0 36px 0 14px':'0 14px 0 36px',background:'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',border:'1px solid rgba(255,255,255,.06)',borderRadius:11,fontFamily:F,fontSize:14,fontWeight:400,color:'var(--tx)',outline:'none',boxShadow:'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s',direction:isAr?'rtl':'ltr',boxSizing:'border-box'}}/>
</div>
{(()=>{const advActive=advOpen||Object.values(advFilter).some(Boolean)
return<button onClick={()=>setAdvOpen(o=>!o)} style={{height:40,padding:'0 14px',borderRadius:11,border:advActive?'1px solid rgba(212,160,23,.45)':'1px solid rgba(255,255,255,.06)',background:advActive?'linear-gradient(180deg,rgba(212,160,23,.16),rgba(212,160,23,.08))':'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',color:advActive?C.gold:'rgba(255,255,255,.78)',fontFamily:F,fontSize:12,fontWeight:500,cursor:'pointer',display:'flex',alignItems:'center',gap:10,boxShadow:advActive?'0 2px 8px rgba(212,160,23,.18), inset 0 1px 0 rgba(212,160,23,.18)':'0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',transition:'.2s',flexShrink:0}}>
<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
{T('بحث متقدم','Advanced Search')}
{Object.values(advFilter).filter(Boolean).length>0&&<span style={{background:C.gold,color:'#000',fontSize:10,fontWeight:700,padding:'1px 6px',borderRadius:999}}>{Object.values(advFilter).filter(Boolean).length}</span>}
</button>})()}
{q&&<button onClick={()=>setQ('')} style={{height:40,padding:'0 14px',borderRadius:11,border:'1px solid rgba(192,57,43,.3)',background:'linear-gradient(180deg,rgba(192,57,43,.16),rgba(192,57,43,.08))',color:C.red,cursor:'pointer',fontFamily:F,fontSize:12,fontWeight:500,flexShrink:0,boxShadow:'0 2px 8px rgba(192,57,43,.18), inset 0 1px 0 rgba(192,57,43,.18)',transition:'.2s'}}>{T('مسح','Clear')}</button>}
</div>
{advOpen&&(()=>{const inS={width:'100%',height:38,padding:'0 12px',border:'1px solid rgba(255,255,255,.06)',borderRadius:10,background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',color:'var(--tx)',fontFamily:F,fontSize:12,fontWeight:500,outline:'none',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 4px rgba(0,0,0,.22)'};const dateS={...inS,colorScheme:'dark',direction:'ltr',textAlign:'center'};const numS={...inS,direction:'ltr',textAlign:'center'};const selS={...inS,colorScheme:'dark',cursor:'pointer'};const advLblS={fontSize:12,color:'var(--tx3)',fontWeight:600,marginBottom:6}
return<div style={{marginBottom:14,padding:'16px 18px',background:'linear-gradient(160deg,#333 0%,#2A2A2A 50%,#232323 100%)',backdropFilter:'blur(20px) saturate(160%)',WebkitBackdropFilter:'blur(20px) saturate(160%)',border:'1px solid rgba(255,255,255,.08)',borderRadius:16,boxShadow:'0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}}>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12}}>
<div><div style={advLblS}>{T('من تاريخ','From')}</div><input className="iv-noring" type="date" value={advFilter.from} onChange={e=>setAdvFilter(f=>({...f,from:e.target.value}))} style={dateS}/></div>
<div><div style={advLblS}>{T('إلى تاريخ','To')}</div><input className="iv-noring" type="date" value={advFilter.to} onChange={e=>setAdvFilter(f=>({...f,to:e.target.value}))} style={dateS}/></div>
<div><div style={advLblS}>{T('الحالة','Status')}</div>
<select className="iv-noring" value={advFilter.status} onChange={e=>setAdvFilter(f=>({...f,status:e.target.value}))} style={selS}>
<option value="">{T('الكل','All')}</option>
<option value="paid">{T('مسدّدة','Paid')}</option>
<option value="partial">{T('جزئي','Partial')}</option>
<option value="unpaid">{T('غير مسدّدة','Unpaid')}</option>
<option value="cancelled">{T('ملغاة','Cancelled')}</option>
</select></div>
<div><div style={advLblS}>{T('نوع الخدمة','Service Type')}</div>
<select className="iv-noring" value={advFilter.service} onChange={e=>setAdvFilter(f=>({...f,service:e.target.value}))} style={selS}>
<option value="">{T('الكل','All')}</option>
{Object.entries(svcLabelAr).map(([k,v])=><option key={k} value={k}>{v}</option>)}
</select></div>
<div><div style={advLblS}>{T('العميل','Client')}</div>
<select className="iv-noring" value={advFilter.client} onChange={e=>setAdvFilter(f=>({...f,client:e.target.value}))} style={selS}>
<option value="">{T('الكل','All')}</option>
{clients.map(c=><option key={c.id} value={c.id}>{c.name_ar}</option>)}
</select></div>
<div><div style={advLblS}>{T('المبلغ — أقل','Amount — Min')}</div><input className="iv-noring" type="number" value={advFilter.amountMin} onChange={e=>setAdvFilter(f=>({...f,amountMin:e.target.value}))} placeholder="0" style={numS}/></div>
<div><div style={advLblS}>{T('المبلغ — أعلى','Amount — Max')}</div><input className="iv-noring" type="number" value={advFilter.amountMax} onChange={e=>setAdvFilter(f=>({...f,amountMax:e.target.value}))} placeholder="∞" style={numS}/></div>
<div style={{display:'flex',alignItems:'flex-end'}}><button onClick={()=>setAdvFilter({from:'',to:'',service:'',client:'',amountMin:'',amountMax:'',status:''})} style={{width:'100%',height:38,borderRadius:10,border:'1px solid rgba(192,57,43,.3)',background:'linear-gradient(180deg,rgba(192,57,43,.16),rgba(192,57,43,.08))',color:C.red,fontFamily:F,fontSize:12,fontWeight:500,cursor:'pointer',boxShadow:'0 2px 8px rgba(192,57,43,.18), inset 0 1px 0 rgba(192,57,43,.18)',transition:'.2s'}}>{T('مسح الفلاتر','Clear filters')}</button></div>
</div>
</div>})()}

{loading?<div style={{textAlign:'center',padding:60,color:'var(--tx5)',fontSize:13,fontWeight:500}}>{T('جاري تحميل الفواتير...','Loading...')}</div>:
filtered.length===0?<div style={{textAlign:'center',padding:60,color:'var(--tx6)',fontSize:13,fontWeight:500}}>{T('لا توجد فواتير مطابقة','No invoices match')}</div>:
<div>
{groupOrder.map((dateKey,gi)=>{
const items=groups[dateKey]
const isToday=dateKey===today
const dayPaid=items.filter(i=>i.status==='paid').length
const dayPartial=items.filter(i=>i.status==='partial').length
const dayUnpaid=items.filter(i=>i.status==='unpaid').length

return<div key={dateKey} style={{marginBottom:22}}>
<div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
<div style={{width:10,height:10,borderRadius:'50%',background:isToday?C.gold:'rgba(255,255,255,.18)',flexShrink:0,boxShadow:isToday?'0 0 8px '+C.gold+'55':'none'}}/>
<div style={{fontSize:13,fontWeight:600,color:isToday?C.gold:'rgba(255,255,255,.65)'}}>{dayLabel(dateKey)}</div>
<div style={{fontSize:11,fontWeight:500,color:'var(--tx5)'}}>{dayFull(dateKey)}</div>
<div style={{flex:1,height:1,background:'rgba(255,255,255,.07)'}}/>
<div style={{display:'flex',gap:8,fontSize:11,fontWeight:500}}>
<span style={{color:'var(--tx5)'}}>{items.length} {T('فاتورة','inv')}</span>
{dayPaid>0&&<span style={{color:'rgba(39,174,96,.6)'}}>{dayPaid} {T('مسدّدة','paid')}</span>}
{dayPartial>0&&<span style={{color:C.gold}}>{dayPartial} {T('جزئي','partial')}</span>}
{dayUnpaid>0&&<span style={{color:'rgba(192,57,43,.6)'}}>{dayUnpaid} {T('غير مسدّدة','unpaid')}</span>}
</div>
</div>

<div style={{display:'flex',flexDirection:'column',gap:8,paddingInlineStart:20,borderInlineStart:'2px solid '+(isToday?'rgba(212,160,23,.15)':'rgba(255,255,255,.07)')}}>
{items.map((inv,ii)=>{
const sc=stClr[inv.status]||'#999'
const rem=Number(inv.remaining_amount||0)
const paid=Number(inv.paid_amount||0)
const total=Number(inv.total_amount||0)
const dueDate=inv.due_date?new Date(inv.due_date+'T00:00:00'):null
const nowDate=new Date()
const isOverdue=dueDate&&inv.status!=='paid'&&inv.status!=='cancelled'&&dueDate<nowDate
const daysLeft=dueDate&&inv.status!=='paid'&&inv.status!=='cancelled'?Math.ceil((dueDate-nowDate)/86400000):null
const relTime=(()=>{if(!inv.created_at)return'—';const h=Math.floor((Date.now()-new Date(inv.created_at).getTime())/3600000);if(h<1)return T('الآن','just now');if(h<24)return T('منذ '+h+'س',h+'h ago');const d=Math.floor(h/24);return d===1?T('أمس','yesterday'):T('منذ '+d+' يوم',d+'d ago')})()
const tags=[]
if(inv.service_category&&svcLabelAr[inv.service_category])tags.push(svcLabelAr[inv.service_category])
if(inv.brokers?.name_ar)tags.push('⟡ '+inv.brokers.name_ar)
if(isOverdue)tags.push(T('متأخر '+Math.abs(daysLeft)+' يوم','Overdue '+Math.abs(daysLeft)+'d'))
else if(daysLeft!==null&&daysLeft>=0&&daysLeft<=7)tags.push(T('يستحق خلال '+daysLeft+' يوم','Due in '+daysLeft+'d'))
const branch=branchMap[inv.branch_id]
const CopyBtn=({val})=><button onClick={e=>{e.stopPropagation();navigator.clipboard.writeText(val);toast&&toast(T('تم النسخ','Copied'))}} title={T('نسخ','Copy')} style={{width:18,height:18,background:'transparent',border:'none',cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',padding:0,color:'var(--tx6)',flexShrink:0,opacity:.55}} onMouseEnter={e=>{e.currentTarget.style.color=C.gold;e.currentTarget.style.opacity=1}} onMouseLeave={e=>{e.currentTarget.style.color='var(--tx6)';e.currentTarget.style.opacity=.55}}>
<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
</button>
return<div key={inv.id} onClick={()=>openView(inv)} style={{background:'linear-gradient(160deg,#333 0%,#2A2A2A 50%,#232323 100%)',backdropFilter:'blur(20px) saturate(160%)',WebkitBackdropFilter:'blur(20px) saturate(160%)',borderRadius:16,overflow:'visible',transition:'.25s cubic-bezier(.4,0,.2,1)',border:'1px solid rgba(255,255,255,.08)',boxShadow:'0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)',position:'relative',cursor:'pointer',padding:'18px 22px',display:'grid',gridTemplateColumns:'1fr auto auto',gap:22,alignItems:'center'}}
onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 16px 36px rgba(0,0,0,.42), 0 4px 10px rgba(0,0,0,.22), 0 0 0 1px '+sc+'33, inset 0 1px 0 rgba(255,255,255,.08)'}}
onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'}}>
<div style={{minWidth:0,display:'flex',flexDirection:'column',gap:8}}>
<div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
<span style={{fontSize:14,fontWeight:600,color:'var(--tx)',whiteSpace:'nowrap',letterSpacing:'.15px'}}>{inv.clients?.name_ar||T('بدون عميل','No client')}</span>
<CopyBtn val={inv.clients?.name_ar||''}/>
<span style={{width:3,height:3,borderRadius:'50%',background:'var(--tx6)',opacity:.5}}/>
<span style={{display:'inline-flex',alignItems:'center',gap:5}}>
<span style={{fontSize:12,color:sc,fontWeight:600,fontFamily:"'JetBrains Mono',monospace",direction:'ltr',letterSpacing:'.4px'}}>#{inv.invoice_number||'—'}</span>
<CopyBtn val={String(inv.invoice_number||'')}/>
</span>
<span style={{fontSize:10,fontWeight:600,padding:'4px 10px',borderRadius:6,background:sc+'15',color:sc,display:'inline-flex',alignItems:'center',gap:5}}>
<span style={{width:5,height:5,borderRadius:'50%',background:sc}}/>{stLabel[inv.status]||inv.status}
</span>
</div>
<div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',fontSize:12,color:'var(--tx5)'}}>
{inv.clients?.phone&&<span style={{display:'inline-flex',alignItems:'center',gap:6}}>
<span style={{fontFamily:"'JetBrains Mono',monospace",direction:'ltr',color:'var(--tx2)',fontWeight:500,fontSize:13,letterSpacing:'.3px'}}>{inv.clients.phone}</span>
<CopyBtn val={inv.clients.phone}/>
</span>}
{inv.clients?.phone&&<span style={{width:3,height:3,borderRadius:'50%',background:'var(--tx6)',opacity:.5}}/>}
<span style={{display:'inline-flex',alignItems:'center',gap:4,fontWeight:500}}>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
{relTime}
</span>
</div>
{tags.length>0&&<div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center',fontSize:12,color:'rgba(255,255,255,.8)',fontWeight:500,letterSpacing:'.2px'}}>
{tags.map((tag,i)=><React.Fragment key={i}>{i>0&&<span style={{width:3,height:3,borderRadius:'50%',background:'rgba(255,255,255,.3)'}}/>}<span>{tag}</span></React.Fragment>)}
</div>}
</div>

<div style={{display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,padding:'0 6px'}}>
<div style={{transform:'scale(.85)',transformOrigin:'center'}}>
<OfficialStampBadge status={stLabel[inv.status]||inv.status} branchCode={branch?.code} date={inv.issue_date} color={sc} rotate={-5}/>
</div>
</div>

<div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5,flexShrink:0,borderInlineStart:'1px dashed rgba(255,255,255,.18)',paddingInlineStart:22}}>
<div style={{fontSize:11,color:C.gold,opacity:.75,fontWeight:600,letterSpacing:'1.5px'}}>{T('الإجمالي','TOTAL')}</div>
<div style={{lineHeight:1,fontVariantNumeric:'tabular-nums',textAlign:'center'}}><bdi style={{fontSize:28,fontWeight:700,color:C.gold,letterSpacing:'-.6px'}}>{num(Math.round(total))}</bdi> <span style={{fontSize:13,fontWeight:600,color:C.gold,opacity:.7,letterSpacing:'.3px'}}>{T('ريال','SAR')}</span></div>
{inv.status!=='paid'&&inv.status!=='cancelled'&&<div style={{display:'flex',alignItems:'center',gap:8,marginTop:3,fontSize:11,fontWeight:600}}>
<span style={{color:paid>0?C.ok:'var(--tx6)'}}>{T('مدفوع','Paid')}: {num(paid)}</span>
<span style={{width:1,height:10,background:'rgba(255,255,255,.08)'}}/>
<span style={{color:rem>0?(inv.status==='partial'?C.gold:C.red):C.ok}}>{T('متبقي','Due')}: {num(rem)}</span>
</div>}
</div>
</div>})}
</div>
</div>})}
</div>}


{payPop&&<div onClick={()=>setPayPop(null)} style={overlayS}>
<div onClick={e=>e.stopPropagation()} style={{...popupS,width:500}}>
<div style={headS}>
<div style={{display:'flex',alignItems:'center',gap:10}}>
<div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(180deg,rgba(39,174,96,.16),rgba(39,174,96,.08))',border:'1px solid rgba(39,174,96,.25)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05)'}}>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.ok} strokeWidth="1.5"><rect x="2" y="5" width="20" height="14" rx="3"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
</div>
<div><div style={{color:'var(--tx)',fontSize:14,fontWeight:600}}>تسجيل دفعة جديدة</div>
<div style={{fontSize:11,fontWeight:500,color:'var(--tx4)',marginTop:2}}>الفاتورة #{payF.inv_num} — {payF.client}</div></div>
</div>
<button onClick={()=>setPayPop(null)} style={closeS}>✕</button>
</div>
<div style={{padding:'18px 22px'}}>
<div style={{padding:'10px 14px',background:'linear-gradient(180deg,rgba(212,160,23,.16),rgba(212,160,23,.08))',borderRadius:11,border:'1px solid rgba(212,160,23,.25)',marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center',boxShadow:'inset 0 1px 0 rgba(212,160,23,.18)'}}>
<span style={{fontSize:12,fontWeight:600,color:'var(--tx3)'}}>المبلغ المتبقي</span>
<span style={{fontSize:18,fontWeight:700,color:C.gold,direction:'ltr',letterSpacing:'-.3px'}}>{num(payF.max)} ر.س</span>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<div><div style={lblS}>المبلغ <span style={{color:C.red}}>*</span></div><input className="iv-noring" value={payF.amount} onChange={e=>setPayF(p=>({...p,amount:e.target.value}))} type="number" placeholder="0.00" style={{...fieldS,direction:'ltr',textAlign:'left'}}/></div>
<div><div style={lblS}>طريقة الدفع</div>
<select className="iv-noring" value={payF.method} onChange={e=>setPayF(p=>({...p,method:e.target.value}))} style={{...fieldS,textAlign:'right',cursor:'pointer'}}>
<option value="cash">نقداً</option><option value="bank_transfer">حوالة بنكية</option></select></div>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:12}}>
<div><div style={lblS}>التاريخ</div><input className="iv-noring" value={payF.date} onChange={e=>setPayF(p=>({...p,date:e.target.value}))} type="date" style={{...fieldS,direction:'ltr'}}/></div>
<div><div style={lblS}>رقم المرجع</div><input className="iv-noring" value={payF.reference} onChange={e=>setPayF(p=>({...p,reference:e.target.value}))} placeholder="اختياري" style={{...fieldS,direction:'ltr',textAlign:'left'}}/></div>
</div>
<div style={{marginTop:12}}><div style={lblS}>ملاحظات</div>
<textarea className="iv-noring" value={payF.notes} onChange={e=>setPayF(p=>({...p,notes:e.target.value}))} rows={2} placeholder="ملاحظات إضافية ..." style={{...fieldS,height:'auto',padding:12,resize:'vertical',textAlign:'right'}}/></div>
</div>
<div style={{padding:'14px 22px',borderTop:'1px solid rgba(255,255,255,.06)',display:'flex',justifyContent:'space-between',flexDirection:'row-reverse'}}>
<button onClick={savePay} disabled={saving} style={{...goldBtnS,minWidth:140,opacity:saving?.7:1}}>{saving?'جاري التسجيل...':'تسجيل الدفعة'}</button>
<button onClick={()=>setPayPop(null)} style={ghostBtnS}>إلغاء</button>
</div></div></div>}

{viewPop&&(()=>{const v=viewPop;const stClr=v.status==='paid'?C.ok:v.status==='partial'?C.gold:C.red;const paidPct=Number(v.total_amount)>0?Math.round(Number(v.paid_amount||0)/Number(v.total_amount)*100):0;const daysUntilDue=v.due_date?Math.ceil((new Date(v.due_date)-new Date())/86400000):null;const isOverdue=v.status!=='paid'&&daysUntilDue!==null&&daysUntilDue<0
return<div onClick={()=>setViewPop(null)} style={overlayS}>
<div onClick={e=>e.stopPropagation()} style={{...popupS,width:860,height:'min(600px,88vh)'}}>
<div style={headS}>
<div style={{display:'flex',alignItems:'center',gap:12,flex:1}}>
<div style={{width:44,height:44,borderRadius:12,background:'linear-gradient(180deg,'+stClr+'22,'+stClr+'10)',border:'1px solid '+stClr+'40',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0,color:stClr,boxShadow:'inset 0 1px 0 rgba(255,255,255,.06)'}}>{v.status==='paid'?'✓':v.status==='partial'?'◐':'○'}</div>
<div style={{flex:1}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
<span style={{fontSize:16,fontWeight:600,color:'var(--tx)'}}>#{v.invoice_number}</span>
<span style={{fontSize:10,fontWeight:600,padding:'4px 10px',borderRadius:6,background:stClr+'15',color:stClr,display:'inline-flex',alignItems:'center',gap:5}}>
<span style={{width:5,height:5,borderRadius:'50%',background:stClr}}/>{statusLabels[v.status]||v.status}
</span>
{isOverdue&&<span style={{fontSize:10,fontWeight:600,padding:'4px 10px',borderRadius:6,background:C.red+'15',color:C.red,display:'inline-flex',alignItems:'center',gap:5}}>
<span style={{width:5,height:5,borderRadius:'50%',background:C.red}}/>متأخرة {Math.abs(daysUntilDue)} يوم
</span>}
</div>
<div style={{fontSize:12,fontWeight:500,color:'var(--tx4)'}}>{v.clients?.name_ar||'—'} · {svcLabelAr[v.service_category]||v.service_category||''}</div>
<div style={{display:'flex',alignItems:'center',gap:8,marginTop:6}}>
<div style={{flex:1,maxWidth:180,height:4,borderRadius:2,background:'rgba(255,255,255,.06)',overflow:'hidden'}}><div style={{height:'100%',width:paidPct+'%',borderRadius:2,background:paidPct>=100?C.ok:paidPct>0?C.gold:C.red,transition:'.5s'}}/></div>
<span style={{fontSize:11,fontWeight:600,color:paidPct>=100?C.ok:C.gold}}>{paidPct}% {paidPct>=100?'مسدد':'محصّل'}</span>
</div>
</div></div>
<button onClick={()=>setViewPop(null)} style={closeS}>✕</button>
</div>
<div style={{flex:1,display:'flex',overflow:'hidden'}}>
<div style={{width:148,background:'rgba(0,0,0,.18)',borderLeft:'1px solid rgba(255,255,255,.06)',padding:'12px 8px',flexShrink:0}}>
{[{id:'info',l:'📋 البيانات'},{id:'financial',l:'💰 المالية'},{id:'payments',l:'💳 المدفوعات',n:payments.length},{id:'installments',l:'📅 الأقساط',n:installments.length}].map(t=><div key={t.id} onClick={()=>setViewTab(t.id)} style={{padding:'10px 12px',borderRadius:10,marginBottom:4,fontSize:12,fontWeight:viewTab===t.id?600:500,color:viewTab===t.id?C.gold:'rgba(255,255,255,.55)',background:viewTab===t.id?'linear-gradient(180deg,rgba(212,160,23,.16),rgba(212,160,23,.08))':'transparent',border:viewTab===t.id?'1px solid rgba(212,160,23,.45)':'1px solid transparent',boxShadow:viewTab===t.id?'inset 0 1px 0 rgba(212,160,23,.18)':'none',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',transition:'.2s'}}><span>{t.l}</span>{t.n>0&&<span style={{fontSize:10,fontWeight:600,color:viewTab===t.id?C.gold:'rgba(255,255,255,.45)',background:viewTab===t.id?'rgba(212,160,23,.18)':'rgba(255,255,255,.06)',padding:'1px 7px',borderRadius:6}}>{t.n}</span>}</div>)}
</div>
<div className="dash-content" style={{flex:1,overflowY:'auto',padding:'18px 22px'}}>
{viewTab==='info'&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
{v.clients?.name_ar&&<div style={{background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',border:'1px solid rgba(212,160,23,.18)',borderRadius:11,padding:'12px 14px',display:'flex',alignItems:'center',gap:12,boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 4px rgba(0,0,0,.22)'}}>
<div style={{width:38,height:38,borderRadius:10,background:'linear-gradient(180deg,rgba(212,160,23,.22),rgba(212,160,23,.10))',border:'1px solid rgba(212,160,23,.35)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:600,color:C.gold,boxShadow:'inset 0 1px 0 rgba(212,160,23,.18)'}}>{v.clients.name_ar[0]}</div>
<div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:'var(--tx)'}}>{v.clients.name_ar}</div>{v.clients.phone&&<div style={{fontSize:11,fontWeight:500,color:'var(--tx5)',direction:'ltr',marginTop:2}}>{v.clients.phone}</div>}</div>
{v.brokers?.name_ar&&<div style={{textAlign:'center'}}><div style={{fontSize:11,fontWeight:500,color:'var(--tx5)'}}>الوسيط</div><div style={{fontSize:12,fontWeight:600,color:C.blue}}>{v.brokers.name_ar}</div></div>}
</div>}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
{[['🔢 رقم الفاتورة',v.invoice_number],['📋 نوع الخدمة',svcLabelAr[v.service_category]||v.service_category],['💳 طريقة الدفع',v.payment_method==='cash'?'نقداً':v.payment_method==='bank_transfer'?'حوالة بنكية':v.payment_method||'—'],['📅 تاريخ الإصدار',v.issue_date?new Date(v.issue_date).toLocaleDateString('ar-SA',{year:'numeric',month:'short',day:'numeric'}):'—'],['⏰ تاريخ الاستحقاق',v.due_date?new Date(v.due_date).toLocaleDateString('ar-SA',{year:'numeric',month:'short',day:'numeric'}):'—']].filter(([,val])=>val&&val!=='—').map(([l,val],i)=><div key={i} style={{background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',borderRadius:11,padding:'10px 14px',border:'1px solid rgba(255,255,255,.06)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 4px rgba(0,0,0,.22)'}}><div style={{fontSize:11,fontWeight:500,color:'var(--tx5)',marginBottom:5}}>{l}</div><div style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,.85)'}}>{val}</div></div>)}
</div>
{invoiceItems.length>0&&<div style={{background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',borderRadius:11,border:'1px solid rgba(255,255,255,.06)',overflow:'hidden',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 4px rgba(0,0,0,.22)'}}>
<div style={{padding:'10px 14px',borderBottom:'1px solid rgba(255,255,255,.06)',fontSize:12,fontWeight:600,color:'var(--tx2)'}}>📦 بنود الفاتورة ({invoiceItems.length})</div>
{invoiceItems.map((item,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 14px',borderBottom:i<invoiceItems.length-1?'1px solid rgba(255,255,255,.04)':'none'}}>
<div style={{flex:1}}><div style={{fontSize:12,fontWeight:500,color:'var(--tx3)'}}>{item.description_ar||item.description_en||'—'}</div>{item.quantity>1&&<span style={{fontSize:11,color:'var(--tx5)'}}>{item.quantity} × {num(item.unit_price)}</span>}</div>
<div style={{fontSize:12,fontWeight:600,color:C.gold,direction:'ltr'}}>{num(item.unit_price*item.quantity)} ر.س</div>
</div>)}
</div>}
{v.notes&&<div style={{background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',borderRadius:11,padding:'12px 14px',border:'1px solid rgba(255,255,255,.06)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 4px rgba(0,0,0,.22)'}}><div style={{fontSize:11,fontWeight:500,color:'var(--tx5)',marginBottom:6}}>📝 ملاحظات</div><div style={{fontSize:12,fontWeight:500,color:'var(--tx2)',lineHeight:1.8}}>{v.notes}</div></div>}
</div>}
{viewTab==='financial'&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
<div style={{background:'linear-gradient(180deg,rgba(212,160,23,.16),rgba(212,160,23,.06))',borderRadius:11,padding:'16px',border:'1px solid rgba(212,160,23,.25)',textAlign:'center',boxShadow:'inset 0 1px 0 rgba(212,160,23,.18), 0 2px 4px rgba(0,0,0,.22)'}}><div style={{fontSize:11,fontWeight:600,color:C.gold,opacity:.75,marginBottom:6}}>الإجمالي</div><div style={{fontSize:22,fontWeight:700,color:C.gold,letterSpacing:'-.4px',direction:'ltr'}}>{num(v.total_amount)}</div></div>
<div style={{background:'linear-gradient(180deg,rgba(39,160,70,.16),rgba(39,160,70,.06))',borderRadius:11,padding:'16px',border:'1px solid rgba(39,160,70,.25)',textAlign:'center',boxShadow:'inset 0 1px 0 rgba(39,160,70,.18), 0 2px 4px rgba(0,0,0,.22)'}}><div style={{fontSize:11,fontWeight:600,color:C.ok,opacity:.75,marginBottom:6}}>المدفوع</div><div style={{fontSize:22,fontWeight:700,color:C.ok,letterSpacing:'-.4px',direction:'ltr'}}>{num(v.paid_amount)}</div></div>
<div style={{background:Number(v.remaining_amount)>0?'linear-gradient(180deg,rgba(192,57,43,.16),rgba(192,57,43,.06))':'linear-gradient(180deg,rgba(39,160,70,.16),rgba(39,160,70,.06))',borderRadius:11,padding:'16px',border:'1px solid '+(Number(v.remaining_amount)>0?'rgba(192,57,43,.25)':'rgba(39,160,70,.25)'),textAlign:'center',boxShadow:'inset 0 1px 0 '+(Number(v.remaining_amount)>0?'rgba(192,57,43,.18)':'rgba(39,160,70,.18)')+', 0 2px 4px rgba(0,0,0,.22)'}}><div style={{fontSize:11,fontWeight:600,color:Number(v.remaining_amount)>0?C.red:C.ok,opacity:.75,marginBottom:6}}>المتبقي</div><div style={{fontSize:22,fontWeight:700,color:Number(v.remaining_amount)>0?C.red:C.ok,letterSpacing:'-.4px',direction:'ltr'}}>{num(v.remaining_amount)}</div></div>
</div>
<div style={{background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',borderRadius:11,padding:14,border:'1px solid rgba(255,255,255,.06)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 4px rgba(0,0,0,.22)'}}>
<div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:12,fontWeight:600,color:'var(--tx3)'}}>نسبة السداد</span><span style={{fontSize:13,fontWeight:700,color:paidPct>=100?C.ok:paidPct>0?C.gold:C.red,direction:'ltr'}}>{paidPct}%</span></div>
<div style={{height:8,borderRadius:4,background:'rgba(255,255,255,.06)',overflow:'hidden'}}><div style={{height:'100%',width:paidPct+'%',borderRadius:4,background:paidPct>=100?C.ok:paidPct>50?C.gold:C.red,transition:'width .5s',boxShadow:'0 0 8px '+(paidPct>=100?C.ok:paidPct>50?C.gold:C.red)+'66'}}/></div>
{isOverdue&&<div style={{fontSize:11,fontWeight:500,color:C.red,marginTop:8}}>⚠ متأخرة عن السداد بـ {Math.abs(daysUntilDue)} يوم</div>}
{!isOverdue&&daysUntilDue!==null&&daysUntilDue>0&&v.status!=='paid'&&<div style={{fontSize:11,fontWeight:500,color:C.gold,marginTop:8}}>⏰ متبقي {daysUntilDue} يوم على الاستحقاق</div>}
</div>
{Number(v.discount_amount)>0&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div style={{background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',borderRadius:11,padding:'10px 14px',border:'1px solid rgba(255,255,255,.06)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 4px rgba(0,0,0,.22)'}}><div style={{fontSize:11,fontWeight:500,color:'var(--tx5)',marginBottom:5}}>الخصم</div><div style={{fontSize:14,fontWeight:600,color:C.gold,direction:'ltr'}}>{num(v.discount_amount)} ر.س</div></div>
<div style={{background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',borderRadius:11,padding:'10px 14px',border:'1px solid rgba(255,255,255,.06)',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 4px rgba(0,0,0,.22)'}}><div style={{fontSize:11,fontWeight:500,color:'var(--tx5)',marginBottom:5}}>الضريبة</div><div style={{fontSize:14,fontWeight:600,color:'var(--tx2)',direction:'ltr'}}>{num(v.vat_amount)} ر.س</div></div>
</div>}
{invoiceItems.length>0&&<div style={{background:'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',borderRadius:11,border:'1px solid rgba(255,255,255,.06)',overflow:'hidden',boxShadow:'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 4px rgba(0,0,0,.22)'}}>
<div style={{padding:'10px 14px',borderBottom:'1px solid rgba(255,255,255,.06)',fontSize:11,fontWeight:600,color:'var(--tx3)',letterSpacing:'.3px'}}>تفصيل البنود</div>
{invoiceItems.map((item,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 14px',borderBottom:i<invoiceItems.length-1?'1px solid rgba(255,255,255,.04)':'none',fontSize:12}}><span style={{color:'var(--tx3)'}}>{item.description_ar||'—'}</span><span style={{fontWeight:600,color:C.gold,direction:'ltr'}}>{num(item.unit_price*item.quantity)}</span></div>)}
</div>}
</div>}
{viewTab==='payments'&&<div>
{payments.length===0?<div style={{textAlign:'center',padding:40}}>
{v.status==='paid'?<><div style={{fontSize:32,marginBottom:8}}>✅</div><div style={{fontSize:13,color:C.ok,fontWeight:600}}>تم السداد بالكامل</div><div style={{fontSize:11,fontWeight:500,color:'var(--tx5)',marginTop:6}}>لا توجد دفعات مفصّلة مسجلة</div></>:<><div style={{fontSize:32,marginBottom:8}}>💳</div><div style={{fontSize:13,fontWeight:500,color:'var(--tx5)'}}>لا توجد دفعات مسجّلة بعد</div></>}
</div>:
payments.map((pay,pi)=><div key={pi} style={{display:'flex',gap:12,padding:'12px 14px',background:'linear-gradient(180deg,rgba(39,160,70,.10),rgba(39,160,70,.04))',borderRadius:11,marginBottom:6,border:'1px solid rgba(39,160,70,.18)',alignItems:'center',boxShadow:'inset 0 1px 0 rgba(39,160,70,.10)'}}>
<div style={{width:32,height:32,borderRadius:10,background:'linear-gradient(180deg,'+C.ok+'25,'+C.ok+'10)',border:'1px solid '+C.ok+'40',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:600,color:C.ok,flexShrink:0,boxShadow:'inset 0 1px 0 rgba(255,255,255,.08)'}}>{pi+1}</div>
<div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:C.ok,direction:'ltr'}}>{num(pay.amount)} ر.س</div><div style={{fontSize:11,fontWeight:500,color:'var(--tx5)',marginTop:2}}>{pay.payment_method==='cash'?'💵 نقداً':'🏦 حوالة بنكية'}{pay.reference_number?' — '+pay.reference_number:''}</div></div>
<div style={{textAlign:'left',direction:'ltr'}}><div style={{fontSize:12,fontWeight:600,color:'var(--tx3)'}}>{pay.payment_date?new Date(pay.payment_date).toLocaleDateString('ar-SA',{month:'short',day:'numeric'}):'—'}</div>{pay.notes&&<div style={{fontSize:11,fontWeight:500,color:'var(--tx5)'}}>{pay.notes}</div>}</div>
</div>)}
</div>}
{viewTab==='installments'&&<div>
{installments.length===0?<div style={{textAlign:'center',padding:40}}>
<div style={{fontSize:32,marginBottom:8}}>📅</div>
<div style={{fontSize:13,fontWeight:500,color:'var(--tx5)'}}>فاتورة بدفعة واحدة — لا يوجد جدولة أقساط</div>
</div>:
<div>
<div style={{display:'flex',gap:8,marginBottom:12}}>
<span style={{fontSize:10,fontWeight:600,padding:'4px 10px',borderRadius:6,background:C.ok+'15',color:C.ok,display:'inline-flex',alignItems:'center',gap:5}}>
<span style={{width:5,height:5,borderRadius:'50%',background:C.ok}}/>{installments.filter(i=>i.status==='paid').length} مسدد
</span>
<span style={{fontSize:10,fontWeight:600,padding:'4px 10px',borderRadius:6,background:C.gold+'15',color:C.gold,display:'inline-flex',alignItems:'center',gap:5}}>
<span style={{width:5,height:5,borderRadius:'50%',background:C.gold}}/>{installments.filter(i=>i.status!=='paid').length} معلّق
</span>
</div>
{installments.map((inst,ii)=>{const isPaid=inst.status==='paid';const isLate=!isPaid&&inst.due_date&&new Date(inst.due_date)<new Date()
const ic=isPaid?C.ok:isLate?C.red:C.gold
return<div key={ii} style={{display:'flex',gap:12,padding:'12px 14px',background:'linear-gradient(180deg,'+ic+'10,'+ic+'04)',borderRadius:11,marginBottom:6,border:'1px solid '+ic+'25',alignItems:'center',boxShadow:'inset 0 1px 0 '+ic+'10'}}>
<div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(180deg,'+ic+'25,'+ic+'10)',border:'1px solid '+ic+'40',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:600,color:ic,flexShrink:0,boxShadow:'inset 0 1px 0 rgba(255,255,255,.08)'}}>{isPaid?'✓':inst.installment_order}</div>
<div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:'var(--tx2)',direction:'ltr'}}>{num(inst.amount)} ر.س</div><div style={{fontSize:11,fontWeight:500,color:'var(--tx5)',marginTop:2}}>{inst.due_date?new Date(inst.due_date).toLocaleDateString('ar-SA',{year:'numeric',month:'short',day:'numeric'}):'—'}</div></div>
<span style={{fontSize:10,fontWeight:600,padding:'4px 10px',borderRadius:6,background:ic+'15',color:ic,display:'inline-flex',alignItems:'center',gap:5}}>
<span style={{width:5,height:5,borderRadius:'50%',background:ic}}/>{isPaid?'مسدد':isLate?'متأخر':'مستحق'}
</span>
</div>})}</div>}
</div>}
</div></div>
<div style={{padding:'14px 22px',borderTop:'1px solid rgba(255,255,255,.06)',display:'flex',gap:8,justifyContent:'center'}}>
{v.status!=='paid'&&<button onClick={()=>{setViewPop(null);openPay(v)}} style={{height:40,padding:'0 18px',borderRadius:11,border:'1px solid rgba(39,174,96,.45)',background:'linear-gradient(180deg,rgba(39,174,96,.22) 0%,rgba(39,174,96,.10) 100%)',color:C.ok,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:'0 2px 8px rgba(39,174,96,.18), inset 0 1px 0 rgba(39,174,96,.18)',transition:'.2s',flex:1}}>+ تسجيل دفعة</button>}
<button onClick={()=>printInvoice(v)} style={{height:40,padding:'0 18px',borderRadius:11,border:'1px solid rgba(155,89,182,.45)',background:'linear-gradient(180deg,rgba(155,89,182,.22) 0%,rgba(155,89,182,.10) 100%)',color:'#9b59b6',fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:'0 2px 8px rgba(155,89,182,.18), inset 0 1px 0 rgba(155,89,182,.18)',transition:'.2s',flex:1}}>🖨️ طباعة</button>
<button onClick={()=>{setViewPop(null);setDelPop(v)}} style={{height:40,padding:'0 18px',borderRadius:11,border:'1px solid rgba(192,57,43,.45)',background:'linear-gradient(180deg,rgba(192,57,43,.22) 0%,rgba(192,57,43,.10) 100%)',color:C.red,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:'0 2px 8px rgba(192,57,43,.18), inset 0 1px 0 rgba(192,57,43,.18)',transition:'.2s',flex:1}}>🗑 حذف</button>
<button onClick={()=>setViewPop(null)} style={{...ghostBtnS,flex:1}}>إغلاق</button>
</div></div></div>})()}

{delPop&&<div onClick={()=>setDelPop(null)} style={overlayS}>
<div onClick={e=>e.stopPropagation()} style={{...popupS,width:420}}>
<div style={{...headS,background:'linear-gradient(180deg,rgba(192,57,43,.18),rgba(192,57,43,.06))',borderBottom:'1px solid rgba(192,57,43,.25)'}}>
<div style={{color:C.red,fontSize:14,fontWeight:600}}>حذف الفاتورة</div>
<button onClick={()=>setDelPop(null)} style={closeS}>✕</button>
</div>
<div style={{padding:'22px 22px',textAlign:'center'}}>
<div style={{width:50,height:50,borderRadius:'50%',background:'linear-gradient(180deg,rgba(192,57,43,.16),rgba(192,57,43,.06))',border:'1px solid rgba(192,57,43,.35)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',boxShadow:'inset 0 1px 0 rgba(192,57,43,.18), 0 2px 8px rgba(0,0,0,.22)'}}>
<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="5" y="6" width="14" height="14" rx="2" fill="rgba(192,57,43,.1)" stroke={C.red} strokeWidth="1.5"/><path d="M3 6h18" stroke={C.red} strokeWidth="1.5" strokeLinecap="round"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke={C.red} strokeWidth="1.5" opacity=".5"/></svg>
</div>
<div style={{fontSize:14,fontWeight:600,color:C.red,marginBottom:5}}>حذف الفاتورة #{delPop.invoice_number}؟</div>
<div style={{fontSize:12,fontWeight:500,color:'var(--tx4)',lineHeight:1.8,marginBottom:14}}>هذا الإجراء لا يمكن التراجع عنه</div>
<div style={{textAlign:'right',marginBottom:8}}><div style={{fontSize:12,fontWeight:600,color:'var(--tx3)',marginBottom:6}}>سبب الحذف <span style={{color:C.red}}>*</span></div>
<textarea className="iv-noring" value={delPop.reason||''} onChange={e=>setDelPop(p=>({...p,reason:e.target.value}))} rows={2} placeholder="اكتب سبب الحذف..." style={{width:'100%',padding:12,border:'1px solid rgba(192,57,43,.25)',borderRadius:11,fontFamily:F,fontSize:13,fontWeight:400,color:'var(--tx)',background:'linear-gradient(180deg,rgba(192,57,43,.08),rgba(192,57,43,.02))',outline:'none',resize:'vertical',textAlign:'right',boxShadow:'inset 0 1px 0 rgba(255,255,255,.04), 0 2px 8px rgba(0,0,0,.18)'}}/></div>
</div>
<div style={{padding:'14px 22px',borderTop:'1px solid rgba(255,255,255,.06)',display:'flex',gap:10,justifyContent:'center'}}>
<button onClick={delInv} disabled={saving||!delPop.reason?.trim()} style={{height:40,padding:'0 18px',borderRadius:11,border:'1px solid rgba(192,57,43,.45)',background:'linear-gradient(180deg,rgba(192,57,43,.32) 0%,rgba(192,57,43,.16) 100%)',color:'#fff',fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer',flex:1,opacity:saving||!delPop.reason?.trim()?.7:1,boxShadow:'0 2px 8px rgba(192,57,43,.28), inset 0 1px 0 rgba(255,255,255,.10)',transition:'.2s'}}>تأكيد الحذف</button>
<button onClick={()=>setDelPop(null)} style={{...ghostBtnS,flex:1}}>تراجع</button>
</div></div></div>}

{/* Animation */}
<style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
</div>}
