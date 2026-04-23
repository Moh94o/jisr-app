import React,{useState,useEffect,useCallback} from 'react'
import OfficialStampBadge from './components/ui/OfficialStampBadge.jsx'
const F="'Cairo',sans-serif"
const C={dk:'#171717',fm:'#1e1e1e',gold:'#D4A017',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}
const num=v=>Number(v||0).toLocaleString('en-US')
const stClr={paid:'#27a046',partial:'#D4A017',unpaid:'#c0392b',cancelled:'#666',overpaid:'#3483b4'}
const stLabel={paid:'مسدّدة',partial:'سداد جزئي',unpaid:'غير مسدّدة',cancelled:'ملغاة',overpaid:'سداد زائد'}

export default function InvoicePage({sb,user,toast,lang}){
const isAr=lang!=='en';const T=(a,e)=>isAr?a:e
const isGM=!user?.roles||user?.roles?.name_ar==='المدير العام'||user?.roles?.name_en==='General Manager'
const[invs,setInvs]=useState([]);const[loading,setLoading]=useState(true)
const[q,setQ]=useState('');const[filter,setFilter]=useState('all')
const[popup,setPopup]=useState(null);const[payPop,setPayPop]=useState(null);const[viewPop,setViewPop]=useState(null);const[delPop,setDelPop]=useState(null)
const[form,setForm]=useState({});const[payF,setPayF]=useState({amount:'',method:'cash',date:'',reference:'',bank:'',notes:''})
const[saving,setSaving]=useState(false);const[clients,setClients]=useState([]);const[brokersList,setBrokers]=useState([])
const[step,setStep]=useState(1);const[payments,setPayments]=useState([]);const[viewTab,setViewTab]=useState('info');const[installments,setInstallments]=useState([]);const[invoiceItems,setInvoiceItems]=useState([])
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
sb.from('worker_transfers').select('id,total_cost,client_charge,profit,status,workers:worker_id(name_ar,iqama_number),facilities:facility_id(name_ar)').is('deleted_at',null).order('created_at',{ascending:false}).then(({data})=>{window._transferCalcs=data||[]})
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

// Open forms
const openAdd=()=>{setForm({client_id:'',broker_id:'',total_amount:'',discount_amount:'0',vat_amount:'0',status:'unpaid',issue_date:today,notes:'',service:'',worker_name:'',worker_iqama:'',pay_system:'full',installments_count:'1',installments:[],pay_method:'cash',paid_now:'',nationality:'',occupation:'',gender:'',_clientMode:'existing',_clientQ:'',_newName:'',_newNameEn:'',_newId:'',_newPhone:'',visa_count:'1',iqama_expiry:'',company_unn:'',ajeer_facility:'',ajeer_duration:'',ajeer_city:'',service_desc:'',embassy:'',visa_type:'permanent',renewal_duration:'',internal_notes:'',transfer_calc_id:'',_tcQ:'',_workerIsClient:false});setStep(1);setPopup('add')}
const openEdit=(inv)=>{setForm({_id:inv.id,client_id:inv.client_id||'',broker_id:inv.broker_id||'',total_amount:inv.total_amount||'',discount_amount:inv.discount_amount||'0',vat_amount:inv.vat_amount||'0',status:inv.status||'unpaid',issue_date:inv.issue_date||'',notes:inv.notes||''});setStep(1);setPopup('edit')}
const openView=async(inv)=>{await loadPayments(inv.id);const[instR,itemsR]=await Promise.all([sb.from('invoice_installments').select('*').eq('invoice_id',inv.id).is('deleted_at',null).order('installment_order'),sb.from('invoice_items').select('*').eq('invoice_id',inv.id).order('sort_order')]);setInstallments(instR.data||[]);setInvoiceItems(itemsR.data||[]);setViewTab('info');setViewPop(inv)}
const openPay=(inv)=>{setPayF({_id:inv.id,amount:'',method:'cash',date:today,reference:'',bank:'',notes:'',max:inv.remaining_amount||0,inv_num:inv.invoice_number,client:inv.clients?.name_ar});setPayPop(inv)}

// Save invoice
const svcToCategory={visa_perm:'PERM_VISA',visa_temp:'TEMP_VISA',transfer:'TRANSFER',renew:'IQAMA_RENEW',ajeer:'AJEER',other:'OTHER'}
const saveInv=async()=>{
if(!form.total_amount){toast('أدخل المبلغ الكلي');return}
// Handle new client
let clientId=form.client_id
if(form._workerIsClient){
// Create client from worker data
if(!form.worker_name){toast('أدخل بيانات العامل أولاً في خطوة التفاصيل');return}
setSaving(true)
try{const{data:nc,error:ce}=await sb.from('clients').insert({name_ar:form.worker_name,id_number:form.worker_iqama||null,phone:form.worker_phone||null,status:'active',created_by:user?.id,branch_id:user?.branch_id}).select('*').single()
if(ce)throw ce;clientId=nc.id}catch(e){toast('خطأ إنشاء العميل: '+e.message?.slice(0,50));setSaving(false);return}
}else if(form._clientMode==='new'){
if(!form._newName||!form._newId||!form._newPhone){toast('أكمل بيانات العميل الجديد');return}
setSaving(true)
try{const{data:nc,error:ce}=await sb.from('clients').insert({name_ar:form._newName,name_en:form._newNameEn||null,id_number:form._newId,phone:form._newPhone,status:'active',created_by:user?.id,branch_id:user?.branch_id}).select('*').single()
if(ce)throw ce;clientId=nc.id;toast('تم إنشاء العميل')}catch(e){toast('خطأ إنشاء العميل: '+e.message?.slice(0,50));setSaving(false);return}
}
if(!clientId){toast('اختر العميل');setSaving(false);return}
setSaving(true)
try{
const net=(Number(form.total_amount)||0)-(Number(form.discount_amount)||0)+(Number(form.vat_amount)||0)
const paidNow=Number(form.paid_now)||0
const rem=Math.max(0,net-paidNow)
const st=rem<=0?'paid':paidNow>0?'partial':'unpaid'
const p={client_id:clientId,broker_id:form.broker_id||null,total_amount:Number(form.total_amount),discount_amount:Number(form.discount_amount)||0,vat_amount:Number(form.vat_amount)||0,net_amount:net,paid_amount:paidNow,remaining_amount:rem,status:st,issue_date:form.issue_date||null,payment_method:form.pay_method||'cash',service_category:svcToCategory[form.service]||'OTHER',payment_terms_type:form.pay_system||'full',notes:form.notes||null}
if(popup==='add'){p.created_by=user?.id;p.branch_id=user?.branch_id||null
const{error,data:newInv}=await sb.from('invoices').insert(p).select('*').single()
if(error){toast('خطأ: '+error.message);setSaving(false);return}
// Save initial payment if paid_now > 0
if(paidNow>0){await sb.from('invoice_payments').insert({invoice_id:newInv.id,amount:paidNow,payment_method:form.pay_method||'cash',payment_date:form.issue_date||new Date().toISOString().slice(0,10),notes:'دفعة أولية عند إصدار الفاتورة',created_by:user?.id})}
// Save installments if installment system
if(form.pay_system==='installment'&&form.installments?.length>0){const instData=form.installments.map((inst,i)=>({invoice_id:newInv.id,installment_order:i+1,amount:Number(inst.amount)||0,notes:inst.condition==='initial'?'دفعة أولية':inst.condition==='after_delegate'?'بعد التوكيل':inst.condition==='on_iqama'?'عند إصدار/تجديد الإقامة':inst.condition==='on_completion'?'عند الإنجاز':'دفعة أخيرة',status:i===0&&paidNow>=Number(inst.amount)?'paid':'pending',paid_date:i===0&&paidNow>=Number(inst.amount)?form.issue_date:null,created_by:user?.id}));await sb.from('invoice_installments').insert(instData)}
toast('تم إصدار الفاتورة بنجاح ✓')
// WhatsApp
if(clientId){const{data:cl}=await sb.from('clients').select('name_ar,phone').eq('id',clientId).single()
if(cl?.phone){const ph=cl.phone.replace(/\D/g,'').replace(/^0/,'966');if(confirm(T('إرسال واتساب للعميل بالفاتورة الجديدة؟','Send WhatsApp?'))){const msg=encodeURIComponent('السلام عليكم '+cl.name_ar+'\n\n✓ تم إصدار فاتورة جديدة\nرقم: '+(newInv?.invoice_number||'')+'\nالمبلغ: '+num(net)+' ريال'+(paidNow>0?'\nالمستلم: '+num(paidNow)+' ريال\nالمتبقي: '+num(rem)+' ريال':'')+'\n\nجسر للأعمال');window.open('https://wa.me/'+ph+'?text='+msg,'_blank');sb.from('whatsapp_log').insert({phone:ph,client_id:form.client_id,event_type:'invoice_created',message_ar:'فاتورة جديدة '+(newInv?.invoice_number||''),entity_id:newInv?.id,sent_by:user?.id}).then(()=>{})}}}
}else{
p.updated_by=user?.id;delete p.paid_amount;delete p.remaining_amount;delete p.status
const{error}=await sb.from('invoices').update(p).eq('id',form._id);if(error){toast('خطأ: '+error.message);setSaving(false);return}toast('تم تعديل الفاتورة')}
setPopup(null);load()
}catch(e){toast('خطأ: '+(e.message||'').slice(0,80))}
setSaving(false)}

// Delete invoice with reason
const delInv=async()=>{
setSaving(true)
const{error}=await sb.from('invoices').update({deleted_at:new Date().toISOString(),deleted_by:user?.id,deleted_reason:delPop.reason||null}).eq('id',delPop.id)
if(error)toast('خطأ');else{toast('تم حذف الفاتورة');load()}
setDelPop(null);setSaving(false)}

// Save payment
const savePay=async()=>{
if(!payF.amount||Number(payF.amount)<=0){toast('أدخل مبلغ الدفعة');return}
if(Number(payF.amount)>payF.max){toast('المبلغ أكبر من المتبقي ('+num(payF.max)+' ر.س)');return}
setSaving(true)
const{error:e1}=await sb.from('invoice_payments').insert({invoice_id:payPop.id,amount:Number(payF.amount),payment_method:payF.method,payment_date:payF.date,reference_number:payF.reference||null,bank_name:payF.bank||null,notes:payF.notes||null,collected_by_user_id:user?.id,created_by:user?.id})
if(e1){toast('خطأ: '+e1.message);setSaving(false);return}
const newPaid=(payPop.paid_amount||0)+Number(payF.amount);const newRem=(payPop.remaining_amount||0)-Number(payF.amount)
const newStatus=newRem<=0?'paid':newPaid>0?'partial':'unpaid'
await sb.from('invoices').update({paid_amount:newPaid,remaining_amount:Math.max(0,newRem),status:newStatus,updated_by:user?.id}).eq('id',payPop.id)
toast('تم تسجيل الدفعة بنجاح');
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
// Shared styles
const fieldS={width:'100%',height:42,padding:'0 14px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:F,fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',background:'rgba(255,255,255,.07)'}
const lblS={fontSize:11,fontWeight:600,color:'var(--tx3)',marginBottom:5}
const overlayS={position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}
const popupS={background:'var(--sf)',borderRadius:16,maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.4)',border:'1px solid rgba(212,160,23,.12)'}
const headS={background:'var(--bg)',padding:'14px 22px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}
const closeS={width:28,height:28,borderRadius:8,background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.12)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}
const goldBtnS={height:42,padding:'0 22px',borderRadius:10,background:'rgba(212,160,23,.12)',border:'1px solid rgba(212,160,23,.2)',color:C.gold,fontFamily:F,fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}
const ghostBtnS={height:42,padding:'0 18px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:F,fontSize:13,fontWeight:600,cursor:'pointer'}

return<div style={{fontFamily:F,paddingTop:0}}>
{/* ═══ HEADER: office filter (top-left abs) + centered title + subtitle + period row ═══ */}
<div style={{marginBottom:8,position:'relative'}}>
{isGM&&branches.length>0&&(()=>{const sel=branches.find(b=>b.id===officeFilter)
const items=[{id:'',label:T('كل المكاتب','All offices')},...branches.map(b=>({id:b.id,label:b.name_ar||b.code||b.id.slice(0,6)}))]
return<div style={{position:'absolute',top:-2,left:0,display:'inline-flex',zIndex:2}}>
<div style={{position:'relative'}}>
<button onClick={()=>setOfficeDropOpen(o=>!o)} style={{height:34,padding:'0 12px',borderRadius:8,background:'#141414',border:'1px solid '+(officeDropOpen?'rgba(212,160,23,.35)':'rgba(255,255,255,.06)'),color:sel?C.gold:'var(--tx2)',fontFamily:F,fontSize:10,fontWeight:700,outline:'none',cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'space-between',gap:7,minWidth:105,transition:'.15s'}}>
<span style={{flex:1,textAlign:'center'}}>{sel?(sel.name_ar||sel.code||sel.id.slice(0,6)):T('كل المكاتب','All offices')}</span>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{transition:'.2s',transform:officeDropOpen?'rotate(180deg)':'none',flexShrink:0}}><polyline points="6 9 12 15 18 9"/></svg>
</button>
{officeDropOpen&&<><div onClick={()=>setOfficeDropOpen(false)} style={{position:'fixed',inset:0,zIndex:1}}/>
<div style={{position:'absolute',top:40,left:0,minWidth:140,background:'#141414',border:'1px solid rgba(255,255,255,.08)',borderRadius:10,padding:6,zIndex:3,boxShadow:'0 10px 30px rgba(0,0,0,.5)'}}>
{items.map(it=>{const active=it.id===officeFilter
return<div key={it.id||'__all__'} onClick={()=>{setOfficeFilter(it.id);setOfficeDropOpen(false)}} style={{padding:'9px 14px',fontSize:11,fontWeight:700,color:active?C.gold:'var(--tx2)',background:active?'rgba(212,160,23,.1)':'transparent',borderRadius:7,cursor:'pointer',textAlign:'center',transition:'.12s',whiteSpace:'nowrap'}} onMouseEnter={e=>{if(!active)e.currentTarget.style.background='rgba(255,255,255,.04)'}} onMouseLeave={e=>{if(!active)e.currentTarget.style.background='transparent'}}>{it.label}</div>})}
</div></>}
</div>
</div>})()}
<div style={{fontSize:24,fontWeight:800,color:'rgba(255,255,255,.93)',letterSpacing:'-.3px'}}>{T('لوحة الفواتير','Invoices Dashboard')}</div>
<div style={{fontSize:12,color:'var(--tx4)',marginTop:8}}>{T('إدارة الفواتير والمدفوعات اليومية','Daily invoices and payments management')}</div>
<div style={{display:'flex',alignItems:'center',gap:6,marginTop:10,marginBottom:0}}>
<div style={{display:'flex',alignItems:'center',gap:8}}>
<span style={{width:6,height:6,borderRadius:'50%',background:C.gold}}/>
<span style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,.58)'}}>{T('الفترة','Period')}</span>
</div>
<div style={{flex:1}}/>
{(()=>{const order=[['monthly',T('شهري','Monthly')],['weekly',T('أسبوعي','Weekly')],['daily',T('يومي','Daily')]]
const idx=order.findIndex(([k])=>k===statsPeriod)
const cycle=(dir)=>{const next=idx+dir;if(next<0||next>=order.length)return;setStatsPeriod(order[next][0]);setPeriodOffset(0)}
const atStart=idx===0,atEnd=idx===order.length-1
const btnStyle=(dis)=>({width:26,height:26,borderRadius:7,border:'1px solid rgba(255,255,255,.04)',background:'#1a1a1a',color:'var(--tx3)',cursor:dis?'not-allowed':'pointer',opacity:dis?.35:1,display:'inline-flex',alignItems:'center',justifyContent:'center',padding:0})
return<div style={{display:'flex',alignItems:'center',gap:6}}>
<button disabled={atEnd} onClick={()=>cycle(1)} title={T('التالي','Next')} style={btnStyle(atEnd)}>
<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
</button>
<span style={{fontSize:11.5,fontWeight:700,color:C.gold,minWidth:64,textAlign:'center'}}>{order[idx][1]}</span>
<button disabled={atStart} onClick={()=>cycle(-1)} title={T('السابق','Previous')} style={btnStyle(atStart)}>
<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
</button>
</div>})()}
<button onClick={openAdd} style={{height:32,padding:'0 12px',borderRadius:8,background:'rgba(212,160,23,.1)',border:'1px solid rgba(212,160,23,.3)',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6,marginInlineStart:10}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
{T('إصدار فاتورة','New Invoice')}
</button>
</div>
</div>
{/* Scoped styles for inputs to avoid global gold focus ring */}
<style>{`
input.iv-noring.iv-noring.iv-noring.iv-noring,
input.iv-noring.iv-noring.iv-noring.iv-noring:not(:placeholder-shown),
select.iv-noring.iv-noring.iv-noring.iv-noring,
textarea.iv-noring.iv-noring.iv-noring.iv-noring{
  border-color:rgba(255,255,255,.08)!important;
  box-shadow:none!important;
}
select.iv-noring.iv-noring.iv-noring.iv-noring{
  background-color:#141414!important;
  border-color:rgba(255,255,255,.06)!important;
}
input.iv-noring.iv-noring.iv-noring.iv-noring:focus,
select.iv-noring.iv-noring.iv-noring.iv-noring:focus,
textarea.iv-noring.iv-noring.iv-noring.iv-noring:focus{
  border-color:rgba(255,255,255,.2)!important;
  box-shadow:none!important;
}
input[type="date"].iv-noring.iv-noring.iv-noring.iv-noring::-webkit-calendar-picker-indicator{filter:invert(70%) sepia(60%) saturate(500%) hue-rotate(20deg)}
`}</style>

{/* ═══ KPI dashboard cards ═══ */}
{(()=>{const glassCard={background:'#141414',border:'1px solid rgba(255,255,255,.06)',borderRadius:14,padding:'10px 12px',position:'relative',overflow:'hidden',transition:'.2s'}
const innerBox={background:'#1a1a1a',border:'1px solid rgba(255,255,255,.04)'}
return<div style={{display:'grid',gridTemplateColumns:'minmax(0,2.6fr) minmax(0,1fr)',gap:14,marginBottom:22}}>
{/* Wide card: status counts + collection rate + chart */}
<div style={glassCard} onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)'}} onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)'}}>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 2fr',gap:8,marginBottom:8,alignItems:'center'}}>
{[{l:T('مسدّدة','Paid'),v:sts.pdc,c:C.ok},{l:T('جزئي','Partial'),v:sts.prc,c:C.gold},{l:T('غير مسدّدة','Unpaid'),v:sts.uc,c:C.red}].map(s=>(
<div key={s.l} style={{padding:'7px 12px',borderRadius:10,...innerBox,display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
<div style={{display:'flex',alignItems:'center',gap:6}}>
<span style={{width:6,height:6,borderRadius:'50%',background:s.c,boxShadow:'0 0 5px '+s.c}}/>
<div style={{fontSize:18,fontWeight:900,color:s.c,letterSpacing:'-.3px',direction:'ltr',lineHeight:1}}>{s.v}</div>
</div>
<div style={{fontSize:10.5,color:'var(--tx2)',fontWeight:700}}>{s.l}</div>
</div>))}
<div style={{minWidth:0,padding:'0 6px',display:'flex',alignItems:'center',gap:10}}>
<span style={{fontSize:11,color:'var(--tx2)',fontWeight:600,whiteSpace:'nowrap'}}>{T('نسبة التحصيل','Collection rate')}</span>
<div style={{flex:1,height:7,borderRadius:5,background:'rgba(255,255,255,.06)',overflow:'hidden',position:'relative'}}>
<div style={{width:collectionPct+'%',height:'100%',background:`linear-gradient(90deg, ${C.ok}cc, ${C.ok})`,borderRadius:5,transition:'.4s',boxShadow:'0 0 8px '+C.ok+'66'}}/>
</div>
<span style={{fontSize:13,fontWeight:900,color:C.ok,direction:'ltr'}}>{collectionPct}%</span>
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
{['paid','due'].map((k)=>{const c=k==='paid'?C.ok:C.red;const last=ptsOf(k)[n-1];return<circle key={k} cx={last[0]} cy={last[1]} r="4" fill="#1a1a1a" stroke={c} strokeWidth="2"/>})}
</svg>
</div>
})()}
</div>
{/* Narrow card: avg invoice value */}
<div style={{...glassCard,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6}} onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)'}} onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)'}}>
<span style={{fontSize:12.5,fontWeight:700,color:'var(--tx2)',letterSpacing:'.1px'}}>{T('متوسط قيمة الفاتورة','Avg invoice value')}</span>
<div style={{display:'flex',alignItems:'baseline',gap:8,marginTop:2}}>
<span style={{fontSize:56,fontWeight:900,color:C.gold,letterSpacing:'-1.4px',lineHeight:1,textShadow:`0 0 22px ${C.gold}33`,direction:'ltr'}}>{num(avgInvoiceValue)}</span>
<span style={{fontSize:16,fontWeight:800,color:C.gold,opacity:.75}}>{T('ريال','SAR')}</span>
</div>
<div style={{fontSize:11.5,fontWeight:700,color:'var(--tx4)',letterSpacing:'.3px'}}>{T('عبر '+activeInvCount+' فاتورة','Across '+activeInvCount+' invoices')}</div>
</div>
</div>})()}

{/* ═══ Search + Advanced filter ═══ */}
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,flexWrap:'wrap'}}>
<div style={{flex:1,minWidth:240,position:'relative'}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{position:'absolute',right:isAr?12:'auto',left:isAr?'auto':12,top:'50%',transform:'translateY(-50%)',color:'rgba(255,255,255,.4)'}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
<input className="iv-noring" value={q} onChange={e=>setQ(e.target.value)} placeholder={T('ابحث برقم الفاتورة أو اسم العميل أو الجوال...','Search by invoice no, client name, or phone...')} style={{width:'100%',height:38,padding:isAr?'0 36px 0 14px':'0 14px 0 36px',background:'#141414',border:'1px solid rgba(255,255,255,.06)',borderRadius:10,fontFamily:F,fontSize:12,fontWeight:600,color:'var(--tx)',outline:'none',direction:isAr?'rtl':'ltr',boxSizing:'border-box'}}/>
</div>
<button onClick={()=>setAdvOpen(o=>!o)} style={{height:38,padding:'0 14px',borderRadius:10,border:'1px solid '+(advOpen||Object.values(advFilter).some(Boolean)?'rgba(212,160,23,.45)':'rgba(255,255,255,.06)'),background:advOpen||Object.values(advFilter).some(Boolean)?'rgba(212,160,23,.1)':'#141414',color:advOpen||Object.values(advFilter).some(Boolean)?C.gold:'rgba(255,255,255,.7)',fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6,flexShrink:0}}>
<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
{T('بحث متقدم','Advanced Search')}
{Object.values(advFilter).filter(Boolean).length>0&&<span style={{background:C.gold,color:'#000',fontSize:9,fontWeight:800,padding:'1px 6px',borderRadius:999}}>{Object.values(advFilter).filter(Boolean).length}</span>}
</button>
{q&&<button onClick={()=>setQ('')} style={{height:38,padding:'0 12px',borderRadius:10,border:'1px solid rgba(192,57,43,.3)',background:'rgba(192,57,43,.08)',color:C.red,cursor:'pointer',fontFamily:F,fontSize:11,fontWeight:700,flexShrink:0}}>{T('مسح','Clear')}</button>}
</div>
{advOpen&&(()=>{const inS={width:'100%',height:36,padding:'0 10px',border:'1px solid rgba(255,255,255,.08)',borderRadius:8,background:'rgba(0,0,0,.2)',color:'var(--tx)',fontFamily:F,fontSize:12,outline:'none'};const dateS={...inS,colorScheme:'dark',direction:'ltr',textAlign:'center'};const numS={...inS,direction:'ltr',textAlign:'center'};const selS={...inS,colorScheme:'dark',cursor:'pointer'};const lblS={fontSize:10.5,color:'var(--tx5)',fontWeight:700,marginBottom:4}
return<div style={{marginBottom:14,padding:'14px 16px',background:'var(--bg)',border:'1px solid rgba(212,160,23,.18)',borderRadius:12}}>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12}}>
<div><div style={lblS}>{T('من تاريخ','From')}</div><input className="iv-noring" type="date" value={advFilter.from} onChange={e=>setAdvFilter(f=>({...f,from:e.target.value}))} style={dateS}/></div>
<div><div style={lblS}>{T('إلى تاريخ','To')}</div><input className="iv-noring" type="date" value={advFilter.to} onChange={e=>setAdvFilter(f=>({...f,to:e.target.value}))} style={dateS}/></div>
<div><div style={lblS}>{T('الحالة','Status')}</div>
<select className="iv-noring" value={advFilter.status} onChange={e=>setAdvFilter(f=>({...f,status:e.target.value}))} style={selS}>
<option value="">{T('الكل','All')}</option>
<option value="paid">{T('مسدّدة','Paid')}</option>
<option value="partial">{T('جزئي','Partial')}</option>
<option value="unpaid">{T('غير مسدّدة','Unpaid')}</option>
<option value="cancelled">{T('ملغاة','Cancelled')}</option>
</select></div>
<div><div style={lblS}>{T('نوع الخدمة','Service Type')}</div>
<select className="iv-noring" value={advFilter.service} onChange={e=>setAdvFilter(f=>({...f,service:e.target.value}))} style={selS}>
<option value="">{T('الكل','All')}</option>
{Object.entries(svcLabelAr).map(([k,v])=><option key={k} value={k}>{v}</option>)}
</select></div>
<div><div style={lblS}>{T('العميل','Client')}</div>
<select className="iv-noring" value={advFilter.client} onChange={e=>setAdvFilter(f=>({...f,client:e.target.value}))} style={selS}>
<option value="">{T('الكل','All')}</option>
{clients.map(c=><option key={c.id} value={c.id}>{c.name_ar}</option>)}
</select></div>
<div><div style={lblS}>{T('المبلغ — أقل','Amount — Min')}</div><input className="iv-noring" type="number" value={advFilter.amountMin} onChange={e=>setAdvFilter(f=>({...f,amountMin:e.target.value}))} placeholder="0" style={numS}/></div>
<div><div style={lblS}>{T('المبلغ — أعلى','Amount — Max')}</div><input className="iv-noring" type="number" value={advFilter.amountMax} onChange={e=>setAdvFilter(f=>({...f,amountMax:e.target.value}))} placeholder="∞" style={numS}/></div>
<div style={{display:'flex',alignItems:'flex-end'}}><button onClick={()=>setAdvFilter({from:'',to:'',service:'',client:'',amountMin:'',amountMax:'',status:''})} style={{width:'100%',height:36,borderRadius:8,border:'1px solid rgba(192,57,43,.25)',background:'rgba(192,57,43,.06)',color:C.red,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer'}}>{T('مسح الفلاتر','Clear filters')}</button></div>
</div>
</div>})()}

{/* ═══ INVOICE LIST — TIMELINE (grouped by day) ═══ */}
{loading?<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>{T('جاري تحميل الفواتير...','Loading...')}</div>:
filtered.length===0?<div style={{textAlign:'center',padding:60,color:'var(--tx6)'}}>{T('لا توجد فواتير مطابقة','No invoices match')}</div>:
<div>
{groupOrder.map((dateKey,gi)=>{
const items=groups[dateKey]
const isToday=dateKey===today
const dayPaid=items.filter(i=>i.status==='paid').length
const dayPartial=items.filter(i=>i.status==='partial').length
const dayUnpaid=items.filter(i=>i.status==='unpaid').length

return<div key={dateKey} style={{marginBottom:22}}>
{/* Day header */}
<div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
<div style={{width:10,height:10,borderRadius:'50%',background:isToday?C.gold:'rgba(255,255,255,.18)',border:isToday?'2px solid rgba(212,160,23,.25)':'none',flexShrink:0}}/>
<div style={{fontSize:13,fontWeight:700,color:isToday?C.gold:'rgba(255,255,255,.65)'}}>{dayLabel(dateKey)}</div>
<div style={{fontSize:10,color:'var(--tx5)'}}>{dayFull(dateKey)}</div>
<div style={{flex:1,height:1,background:'rgba(255,255,255,.07)'}}/>
<div style={{display:'flex',gap:6,fontSize:9,fontWeight:600}}>
<span style={{color:'var(--tx5)'}}>{items.length} {T('فاتورة','inv')}</span>
{dayPaid>0&&<span style={{color:'rgba(39,174,96,.6)'}}>{dayPaid} {T('مسدّدة','paid')}</span>}
{dayPartial>0&&<span style={{color:C.gold}}>{dayPartial} {T('جزئي','partial')}</span>}
{dayUnpaid>0&&<span style={{color:'rgba(192,57,43,.6)'}}>{dayUnpaid} {T('غير مسدّدة','unpaid')}</span>}
</div>
</div>

{/* Cards — TC 3-column layout: identity | stamp | total */}
<div style={{display:'flex',flexDirection:'column',gap:6,paddingInlineStart:20,borderInlineStart:'2px solid '+(isToday?'rgba(212,160,23,.15)':'rgba(255,255,255,.07)')}}>
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
return<div key={inv.id} onClick={()=>openView(inv)} style={{background:'linear-gradient(180deg,rgba(0,0,0,.3) 0%,rgba(0,0,0,.2) 100%)',borderRadius:16,overflow:'visible',transition:'.25s cubic-bezier(.4,0,.2,1)',border:'1px solid rgba(255,255,255,.07)',position:'relative',cursor:'pointer',padding:'18px 22px',display:'grid',gridTemplateColumns:'1fr auto auto',gap:22,alignItems:'center'}}
onMouseEnter={e=>{e.currentTarget.style.borderColor=sc+'55';e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 10px 30px rgba(0,0,0,.3), 0 0 0 1px '+sc+'25'}}
onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,.07)';e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none'}}>
{/* Section 1: Identity + Tags */}
<div style={{minWidth:0,display:'flex',flexDirection:'column',gap:8}}>
<div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
<span style={{fontSize:14,fontWeight:800,color:'var(--tx)',whiteSpace:'nowrap',letterSpacing:'.15px'}}>{inv.clients?.name_ar||T('بدون عميل','No client')}</span>
<CopyBtn val={inv.clients?.name_ar||''}/>
<span style={{width:3,height:3,borderRadius:'50%',background:'var(--tx6)',opacity:.5}}/>
<span style={{display:'inline-flex',alignItems:'center',gap:5}}>
<span style={{fontSize:12,color:sc,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",direction:'ltr',letterSpacing:'.4px'}}>#{inv.invoice_number||'—'}</span>
<CopyBtn val={String(inv.invoice_number||'')}/>
</span>
</div>
<div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',fontSize:11,color:'var(--tx5)'}}>
{inv.clients?.phone&&<span style={{display:'inline-flex',alignItems:'center',gap:6}}>
<span style={{fontFamily:"'JetBrains Mono',monospace",direction:'ltr',color:'var(--tx2)',fontWeight:700,fontSize:13,letterSpacing:'.3px'}}>{inv.clients.phone}</span>
<CopyBtn val={inv.clients.phone}/>
</span>}
{inv.clients?.phone&&<span style={{width:3,height:3,borderRadius:'50%',background:'var(--tx6)',opacity:.5}}/>}
<span style={{display:'inline-flex',alignItems:'center',gap:4,fontWeight:500}}>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
{relTime}
</span>
</div>
{tags.length>0&&<div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center',fontSize:11,color:'rgba(255,255,255,.8)',fontWeight:600,letterSpacing:'.2px'}}>
{tags.map((tag,i)=><React.Fragment key={i}>{i>0&&<span style={{width:3,height:3,borderRadius:'50%',background:'rgba(255,255,255,.3)'}}/>}<span>{tag}</span></React.Fragment>)}
</div>}
</div>

{/* Section 2: Official stamp */}
<div style={{display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,padding:'0 6px'}}>
<div style={{transform:'scale(.85)',transformOrigin:'center'}}>
<OfficialStampBadge status={stLabel[inv.status]||inv.status} branchCode={branch?.code} date={inv.issue_date} color={sc} rotate={-5}/>
</div>
</div>

{/* Section 3: Total + paid/remaining */}
<div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5,flexShrink:0,borderInlineStart:'1px dashed rgba(255,255,255,.18)',paddingInlineStart:22}}>
<div style={{fontSize:11,color:C.gold,opacity:.75,fontWeight:800,letterSpacing:'1.5px'}}>{T('الإجمالي','TOTAL')}</div>
<div style={{lineHeight:1,fontVariantNumeric:'tabular-nums',textAlign:'center'}}><bdi style={{fontSize:28,fontWeight:900,color:C.gold,letterSpacing:'-.6px'}}>{num(Math.round(total))}</bdi> <span style={{fontSize:13,fontWeight:700,color:C.gold,opacity:.7,letterSpacing:'.3px'}}>{T('ريال','SAR')}</span></div>
{inv.status!=='paid'&&inv.status!=='cancelled'&&<div style={{display:'flex',alignItems:'center',gap:8,marginTop:3,fontSize:10,fontWeight:700}}>
<span style={{color:paid>0?C.ok:'var(--tx6)'}}>{T('مدفوع','Paid')}: {num(paid)}</span>
<span style={{width:1,height:10,background:'rgba(255,255,255,.08)'}}/>
<span style={{color:rem>0?(inv.status==='partial'?C.gold:C.red):C.ok}}>{T('متبقي','Due')}: {num(rem)}</span>
</div>}
</div>
</div>})}
</div>
</div>})}
</div>}

{/* ═══ ADD/EDIT INVOICE — 6-STEP WIZARD ═══ */}
{popup&&<div onClick={()=>setPopup(null)} style={overlayS}>
<div onClick={e=>e.stopPropagation()} style={{...popupS,width:700,maxHeight:'92vh'}}>
<div style={{background:'var(--bg)',flexShrink:0}}>
<div style={{padding:'14px 22px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<div style={{display:'flex',alignItems:'center',gap:10}}>
<div style={{padding:'4px 12px',borderRadius:6,background:'rgba(212,160,23,.08)',border:'1px solid rgba(212,160,23,.12)',display:'flex',alignItems:'center',gap:6}}><div style={{width:3,height:14,borderRadius:2,background:C.gold}}/><span style={{fontSize:10,fontWeight:600,color:'rgba(255,255,255,.65)'}}>مكتب</span></div>
<div><div style={{fontSize:16,fontWeight:800,color:'var(--tx)'}}>{popup==='add'?'إصدار فاتورة':'تعديل الفاتورة'}</div>
<div style={{fontSize:9,color:'var(--tx4)'}}>يرجى تعبئة البيانات بعناية ودقة</div></div>
</div>
<button onClick={()=>setPopup(null)} style={closeS}>✕</button>
</div>
<div style={{display:'flex',padding:'8px 22px 14px',gap:0}}>
{[['الخدمة',1],['العميل',2],['التفاصيل',3],['الدفع',4],['إضافي',5],['مراجعة',6]].map(([l,n])=>{const isA=step===n,isD=step>n;return<div key={n} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4,cursor:'pointer',opacity:isA?1:isD?.7:.35}} onClick={()=>n<=step&&setStep(n)}><div style={{width:22,height:22,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,background:isA||isD?C.gold:'rgba(255,255,255,.1)',color:isA||isD?C.dk:'rgba(255,255,255,.42)',transition:'.3s',boxShadow:isA?'0 0 0 4px rgba(212,160,23,.15)':'none'}}>{isD?<svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>:n}</div><span style={{fontSize:9,fontWeight:isA?700:500,color:isA?C.gold:'rgba(255,255,255,.42)'}}>{l}</span></div>})}
</div>
</div>
<div style={{flex:1,overflowY:'auto',padding:'18px 22px'}}>
{step===2&&<div>
<div style={{fontSize:14,fontWeight:700,color:'var(--tx)',marginBottom:4,display:'flex',alignItems:'center',gap:6}}>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>العميل</div>
<div style={{fontSize:10,color:'var(--tx4)',marginBottom:14}}>يرجى تحديد بيانات العميل</div>

{/* Worker = Client toggle (for ajeer/transfer/renew) */}
{(form.service==='ajeer'||form.service==='transfer'||form.service==='renew')&&<div style={{padding:'12px 14px',borderRadius:10,background:'rgba(52,131,180,.04)',border:'1px solid rgba(52,131,180,.1)',marginBottom:14,display:'flex',alignItems:'center',gap:10}}>
<div onClick={()=>setForm(p=>({...p,_workerIsClient:!p._workerIsClient,_clientMode:!p._workerIsClient?'worker':'existing'}))} style={{width:40,height:22,borderRadius:11,background:form._workerIsClient?C.blue:'rgba(255,255,255,.15)',cursor:'pointer',position:'relative',transition:'.2s',flexShrink:0}}>
<div style={{width:18,height:18,borderRadius:'50%',background:'#fff',position:'absolute',top:2,transition:'.2s',...(form._workerIsClient?{left:20}:{left:2})}}/></div>
<div><div style={{fontSize:12,fontWeight:700,color:form._workerIsClient?C.blue:'var(--tx3)'}}>العامل هو نفسه العميل</div>
<div style={{fontSize:9,color:'var(--tx5)'}}>بيانات العامل ستُستخدم كبيانات العميل تلقائياً</div></div>
</div>}

{/* Worker is client → skip client selection */}
{form._workerIsClient&&<div style={{padding:'14px',borderRadius:10,background:'rgba(39,160,70,.03)',border:'1px solid rgba(39,160,70,.1)'}}>
<div style={{fontSize:12,fontWeight:700,color:C.ok,marginBottom:6,display:'flex',alignItems:'center',gap:6}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.ok} strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>سيتم استخدام بيانات العامل كعميل</div>
<div style={{fontSize:10,color:'var(--tx4)',lineHeight:1.8}}>عند إدخال بيانات العامل في الخطوة التالية سيتم إنشاء/ربط سجل عميل تلقائياً بنفس البيانات</div>
</div>}

{/* Normal client selection */}
{!form._workerIsClient&&<>
{/* Client mode toggle */}
<div style={{display:'flex',gap:8,marginBottom:16}}>{[['existing','عميل حالي','🔄'],['new','عميل جديد','➕']].map(([k,l,ico])=>
<div key={k} onClick={()=>setForm(p=>({...p,_clientMode:k,client_id:k==='new'?'':p.client_id}))} style={{flex:1,padding:'12px',borderRadius:10,border:'1.5px solid '+((form._clientMode||'existing')===k?'rgba(212,160,23,.4)':'rgba(255,255,255,.1)'),background:(form._clientMode||'existing')===k?'rgba(212,160,23,.12)':'rgba(255,255,255,.04)',cursor:'pointer',textAlign:'center'}}>
<div style={{fontSize:12,fontWeight:700,color:(form._clientMode||'existing')===k?C.gold:'rgba(255,255,255,.5)'}}>{ico} {l}</div></div>)}</div>
{/* Search */}
<div style={{fontSize:12,fontWeight:700,color:'var(--tx3)',marginBottom:8}}>يرجى البحث واختيار العميل</div>
<div style={{position:'relative',marginBottom:12}}>
<input value={form._clientQ||''} onChange={e=>setForm(p=>({...p,_clientQ:e.target.value}))} placeholder="ابحث بالاسم أو رقم الهوية أو الجوال ..." style={{...fieldS,textAlign:'right',paddingLeft:40}}/>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="2" style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)'}}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
</div>

{/* Results */}
<div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:280,overflowY:'auto',scrollbarWidth:'thin'}}>
{clients.filter(c=>{const q=(form._clientQ||'').toLowerCase();if(!q)return true;return (c.name_ar||'').includes(q)||(c.name_en||'').toLowerCase().includes(q)||(c.id_number||'').includes(q)||(c.phone||'').includes(q)}).map(c=>{
const sel=form.client_id===c.id
return<div key={c.id} onClick={()=>setForm(p=>({...p,client_id:c.id}))} style={{padding:'14px 16px',borderRadius:12,border:'1.5px solid '+(sel?'rgba(212,160,23,.4)':'rgba(255,255,255,.08)'),background:sel?'rgba(212,160,23,.06)':'rgba(255,255,255,.02)',cursor:'pointer',transition:'.15s'}}>
<div style={{display:'flex',alignItems:'center',gap:12}}>
<div style={{width:42,height:42,borderRadius:12,background:sel?'rgba(212,160,23,.15)':'rgba(255,255,255,.05)',border:'1px solid '+(sel?'rgba(212,160,23,.25)':'rgba(255,255,255,.08)'),display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:sel?C.gold:'var(--tx4)',flexShrink:0}}>{(c.name_ar||'?')[0]}</div>
<div style={{flex:1}}>
<div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
<span style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>{c.name_ar}</span>
{c.is_vip&&<span style={{fontSize:8,padding:'1px 5px',borderRadius:4,background:'rgba(212,160,23,.15)',color:C.gold,fontWeight:700}}>VIP</span>}
</div>
{c.name_en&&<div style={{fontSize:10,color:'var(--tx4)',marginBottom:2}}>{c.name_en}</div>}
<div style={{display:'flex',gap:12,fontSize:10,color:'var(--tx5)'}}>
{c.id_number&&<span style={{direction:'ltr'}}>🪪 {c.id_number}</span>}
{c.phone&&<span style={{direction:'ltr'}}>📱 {c.phone}</span>}
</div>
</div>
{sel&&<div style={{width:28,height:28,borderRadius:'50%',background:C.ok+'20',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.ok} strokeWidth="3"><path d="M5 12l5 5L19 7"/></svg></div>}
</div></div>})}
{clients.filter(c=>{const q=(form._clientQ||'').toLowerCase();if(!q)return true;return (c.name_ar||'').includes(q)||(c.name_en||'').toLowerCase().includes(q)||(c.id_number||'').includes(q)||(c.phone||'').includes(q)}).length===0&&<div style={{textAlign:'center',padding:20,color:'var(--tx6)',fontSize:11}}>لا توجد نتائج</div>}
</div>

{/* Selected client info */}
{form.client_id&&<div style={{marginTop:12,padding:'12px 14px',background:'rgba(39,160,70,.03)',borderRadius:10,border:'1px solid rgba(39,160,70,.1)',display:'flex',alignItems:'center',gap:8}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.ok} strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
<span style={{fontSize:11,fontWeight:700,color:C.ok}}>تم اختيار: {clients.find(c=>c.id===form.client_id)?.name_ar}</span>
<button onClick={()=>setForm(p=>({...p,client_id:''}))} style={{marginRight:'auto',fontSize:9,color:C.red,background:'rgba(192,57,43,.08)',border:'1px solid rgba(192,57,43,.1)',borderRadius:5,padding:'3px 8px',cursor:'pointer',fontFamily:F}}>تغيير</button>
</div>}
</>}

{!form._workerIsClient&&form._clientMode==='new'&&<div style={{padding:'14px',borderRadius:10,border:'1px solid rgba(52,131,180,.12)',background:'rgba(52,131,180,.03)'}}>
<div style={{fontSize:12,fontWeight:700,color:C.blue,marginBottom:10}}>بيانات العميل الجديد</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div><div style={lblS}>الاسم بالعربي <span style={{color:C.red}}>*</span></div><input value={form._newName||''} onChange={e=>setForm(p=>({...p,_newName:e.target.value}))} placeholder="الاسم الثلاثي" style={fieldS}/></div>
<div><div style={lblS}>الاسم بالإنجليزي</div><input value={form._newNameEn||''} onChange={e=>setForm(p=>({...p,_newNameEn:e.target.value}))} placeholder="Full Name" style={{...fieldS,direction:'ltr',textAlign:'left'}}/></div>
<div><div style={lblS}>رقم الهوية <span style={{color:C.red}}>*</span></div><input value={form._newId||''} onChange={e=>setForm(p=>({...p,_newId:e.target.value}))} placeholder="10 أرقام" style={{...fieldS,direction:'ltr',textAlign:'left'}}/></div>
<div><div style={lblS}>الجوال <span style={{color:C.red}}>*</span></div><input value={form._newPhone||''} onChange={e=>setForm(p=>({...p,_newPhone:e.target.value}))} placeholder="05XXXXXXXX" style={{...fieldS,direction:'ltr',textAlign:'left'}}/></div>
</div>
</div>}
</div>}
{step===1&&<div><div style={{fontSize:14,fontWeight:700,color:'var(--tx)',marginBottom:4}}>الخدمة أو الطلب</div><div style={{fontSize:10,color:'var(--tx4)',marginBottom:14}}>يرجى اختيار الخدمة/الطلب</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>{[['تأشيرة عمل','visa_perm','🪪'],['نقل كفالة','transfer','🔄'],['تجديد إقامة','renew','🔃'],['عقد أجير','ajeer','📋'],['خدمات أخرى','other','📦']].map(([l,k,ico])=><div key={k} onClick={()=>setForm(p=>({...p,service:k,transfer_calc_id:''}))} style={{padding:'14px 12px',borderRadius:12,border:'1.5px solid '+(form.service===k?'rgba(212,160,23,.4)':'rgba(255,255,255,.1)'),background:form.service===k?'rgba(212,160,23,.12)':'rgba(255,255,255,.04)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,transition:'.2s'}}><span style={{fontSize:16}}>{ico}</span><span style={{fontSize:12,fontWeight:700,color:form.service===k?C.gold:'rgba(255,255,255,.55)'}}>{l}</span></div>)}</div>
{/* Transfer: search حسبة التنازل */}
{form.service==='transfer'&&<div style={{borderTop:'1px solid rgba(255,255,255,.06)',paddingTop:14}}>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx2)',marginBottom:4,display:'flex',alignItems:'center',gap:6}}>🔄 {T('نقل الكفالة','Transfer')}</div>
<div style={{fontSize:10,color:'var(--tx4)',marginBottom:10}}>يرجى البحث واختيار حسبة التنازل المناسبة</div>
<input value={form._tcQ||''} onChange={e=>setForm(p=>({...p,_tcQ:e.target.value}))} placeholder="ابحث برقم أو اسم..." style={{...fieldS,textAlign:'right',marginBottom:10}}/>
{(()=>{const tcs=(window._transferCalcs||[]).filter(t=>!form._tcQ||(t.workers?.name_ar||'').includes(form._tcQ)||(t.workers?.iqama_number||'').includes(form._tcQ));return tcs.length>0?<div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:200,overflowY:'auto'}}>{tcs.map(t=><div key={t.id} onClick={()=>setForm(p=>({...p,transfer_calc_id:t.id,total_amount:String(t.client_charge||t.total_cost||0),worker_name:t.workers?.name_ar||'',worker_iqama:t.workers?.iqama_number||''}))} style={{padding:'12px 14px',borderRadius:10,border:'1.5px solid '+(form.transfer_calc_id===t.id?'rgba(212,160,23,.4)':'rgba(255,255,255,.08)'),background:form.transfer_calc_id===t.id?'rgba(212,160,23,.06)':'rgba(255,255,255,.02)',cursor:'pointer',display:'flex',alignItems:'center',gap:10}}>
<div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:'var(--tx2)'}}>{t.workers?.name_ar||'عامل'}</div>
<div style={{fontSize:10,color:'var(--tx5)',direction:'ltr'}}>{t.workers?.iqama_number||''}</div></div>
<div style={{fontSize:14,fontWeight:800,color:C.gold}}>{num(t.client_charge||t.total_cost||0)}</div>
{form.transfer_calc_id===t.id&&<span style={{fontSize:14,color:C.ok}}>✓</span>}
</div>)}</div>:<div style={{textAlign:'center',padding:20,color:'var(--tx6)',fontSize:11}}>لا توجد حسبات تنازل</div>})()}
</div>}
{/* Visa: number of visas */}
{form.service==='visa_perm'&&<div style={{borderTop:'1px solid rgba(255,255,255,.06)',paddingTop:14}}>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx2)',marginBottom:8}}>🪪 التأشيرة</div>
<div style={{fontSize:11,color:'var(--tx3)',marginBottom:6}}>عدد التأشيرات المطلوبة</div>
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:12}}>{[['1','تأشيرة واحدة'],['2','تأشيرتان'],['3','ثلاث تأشيرات'],['4','أربع تأشيرات']].map(([k,l])=><div key={k} onClick={()=>setForm(p=>({...p,visa_count:k}))} style={{padding:'10px 8px',borderRadius:10,border:'1.5px solid '+(form.visa_count===k?'rgba(212,160,23,.4)':'rgba(255,255,255,.1)'),background:form.visa_count===k?'rgba(212,160,23,.1)':'rgba(255,255,255,.04)',cursor:'pointer',textAlign:'center'}}><span style={{fontSize:11,fontWeight:700,color:form.visa_count===k?C.gold:'rgba(255,255,255,.5)',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}><span style={{width:18,height:18,borderRadius:'50%',background:form.visa_count===k?C.gold:'rgba(255,255,255,.12)',color:form.visa_count===k?'#171717':'rgba(255,255,255,.4)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800}}>{k}</span>{l}</span></div>)}</div>
</div>}
</div>}
{step===3&&<div><div style={{fontSize:14,fontWeight:700,color:'var(--tx)',marginBottom:4}}>التفاصيل</div><div style={{fontSize:10,color:'var(--tx4)',marginBottom:14}}>تفاصيل الخدمة المختارة</div>
{/* Worker details (common) */}
<div style={{fontSize:12,fontWeight:700,color:'var(--tx3)',marginBottom:8,display:'flex',alignItems:'center',gap:6}}>👤 بيانات العامل</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
<div><div style={lblS}>اسم العامل</div><input value={form.worker_name||''} onChange={e=>setForm(p=>({...p,worker_name:e.target.value}))} placeholder="الاسم الثنائي" style={fieldS}/></div>
<div><div style={lblS}>رقم الإقامة</div><input value={form.worker_iqama||''} onChange={e=>setForm(p=>({...p,worker_iqama:e.target.value}))} placeholder="أدخل الرقم" style={{...fieldS,direction:'ltr',textAlign:'left'}}/></div>
</div>
{/* Transfer/Renew: iqama expiry + company */}
{(form.service==='transfer'||form.service==='renew')&&<>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
<div><div style={lblS}>تاريخ انتهاء الإقامة</div><input value={form.iqama_expiry||''} onChange={e=>setForm(p=>({...p,iqama_expiry:e.target.value}))} type="date" style={{...fieldS,direction:'ltr'}}/></div>
<div><div style={lblS}>الرقم الموحد للشركة</div><input value={form.company_unn||''} onChange={e=>setForm(p=>({...p,company_unn:e.target.value}))} placeholder="الرقم الموحد" style={{...fieldS,direction:'ltr',textAlign:'left'}}/></div>
</div>
{form.service==='renew'&&<div style={{marginBottom:14}}><div style={lblS}>مدة تجديد الإقامة</div><select value={form.renewal_duration||''} onChange={e=>setForm(p=>({...p,renewal_duration:e.target.value}))} style={{...fieldS,textAlign:'right'}}><option value="">اختر</option><option value="3">3 أشهر</option><option value="6">6 أشهر</option><option value="12">سنة</option><option value="24">سنتين</option></select></div>}
</>}
{/* Ajeer: company + duration + city */}
{form.service==='ajeer'&&<>
<div style={{fontSize:12,fontWeight:700,color:'var(--tx3)',marginBottom:8,display:'flex',alignItems:'center',gap:6}}>📋 بيانات عقد أجير</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
<div><div style={lblS}>اسم المنشأة</div><input value={form.ajeer_facility||''} onChange={e=>setForm(p=>({...p,ajeer_facility:e.target.value}))} placeholder="اسم المنشأة بالعربية" style={fieldS}/></div>
<div><div style={lblS}>الرقم الموحد</div><input value={form.company_unn||''} onChange={e=>setForm(p=>({...p,company_unn:e.target.value}))} placeholder="الرقم الموحد" style={{...fieldS,direction:'ltr',textAlign:'left'}}/></div>
<div><div style={lblS}>المدة</div><select value={form.ajeer_duration||''} onChange={e=>setForm(p=>({...p,ajeer_duration:e.target.value}))} style={{...fieldS,textAlign:'right'}}><option value="">اختر</option><option value="3">3 أشهر</option><option value="6">6 أشهر</option><option value="12">سنة</option></select></div>
<div><div style={lblS}>المدينة</div><input value={form.ajeer_city||''} onChange={e=>setForm(p=>({...p,ajeer_city:e.target.value}))} placeholder="المدينة" style={fieldS}/></div>
</div></>}
{/* Other services: description */}
{form.service==='other'&&<>
<div style={{fontSize:12,fontWeight:700,color:'var(--tx3)',marginBottom:8,display:'flex',alignItems:'center',gap:6}}>📦 بيانات الخدمة</div>
<div style={{marginBottom:14}}><div style={lblS}>وصف الخدمة</div><textarea value={form.service_desc||''} onChange={e=>setForm(p=>({...p,service_desc:e.target.value}))} rows={3} placeholder="الجهة الحكومية أو الخاصة - وصف مختصر للخدمة - المدة الزمنية..." style={{...fieldS,height:'auto',padding:12,resize:'vertical',textAlign:'right'}}/></div>
</>}
{/* Visa: nationality, occupation, gender */}
{(form.service==='visa_perm')&&<>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:14}}>
<div><div style={lblS}>الجنسية</div><select value={form.nationality||''} onChange={e=>setForm(p=>({...p,nationality:e.target.value}))} style={{...fieldS,textAlign:'right'}}><option value="">اختر</option><option>بنغلاديشي</option><option>هندي</option><option>باكستاني</option><option>فلبيني</option><option>إثيوبي</option><option>نيبالي</option><option>مصري</option><option>يمني</option><option>سوداني</option><option>أخرى</option></select></div>
<div><div style={lblS}>المهنة</div><select value={form.occupation||''} onChange={e=>setForm(p=>({...p,occupation:e.target.value}))} style={{...fieldS,textAlign:'right'}}><option value="">اختر</option><option>عامل</option><option>سائق خاص</option><option>سائق شاحنة</option><option>سائق النقل العام</option><option>عامل منزلي</option><option>طباخ</option><option>مزارع</option><option>فني</option><option>تحميل وتنزيل</option><option>أخرى</option></select></div>
<div><div style={lblS}>الجنس</div><select value={form.gender||''} onChange={e=>setForm(p=>({...p,gender:e.target.value}))} style={{...fieldS,textAlign:'right'}}><option value="">اختر</option><option>ذكر</option><option>أنثى</option></select></div>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<div><div style={lblS}>السفارة</div><input value={form.embassy||''} onChange={e=>setForm(p=>({...p,embassy:e.target.value}))} placeholder="مثل: الخرطوم، جاكرتا" style={fieldS}/></div>
<div><div style={lblS}>نوع التأشيرة</div><select value={form.visa_type||''} onChange={e=>setForm(p=>({...p,visa_type:e.target.value}))} style={{...fieldS,textAlign:'right'}}><option value="permanent">دائمة</option><option value="temporary_3">مؤقتة - 3 أشهر</option><option value="temporary_6">مؤقتة - 6 أشهر</option></select></div>
</div>
</>}
{/* Common: company UNN for visa/other */}
{(form.service==='visa_perm'||form.service==='other')&&<div style={{marginTop:12}}><div style={lblS}>الرقم الموحد للشركة</div><input value={form.company_unn||''} onChange={e=>setForm(p=>({...p,company_unn:e.target.value}))} placeholder="الرقم الموحد" style={{...fieldS,direction:'ltr',textAlign:'left'}}/></div>}
</div>}
{step===4&&<div><div style={{fontSize:14,fontWeight:700,color:'var(--tx)',marginBottom:4}}>بيانات الفاتورة</div><div style={{fontSize:10,color:'var(--tx4)',marginBottom:14}}>تفاصيل عملية الدفع والأقساط</div>
{/* Payment system toggle */}
<div style={{fontSize:12,fontWeight:700,color:'var(--tx3)',marginBottom:8}}>نظام الدفع</div>
<div style={{display:'flex',gap:8,marginBottom:16}}>{[['full','الدفع كاملاً','💰'],['installment','الدفع بالتقسيط','📋']].map(([k,l,ico])=><div key={k} onClick={()=>setForm(p=>({...p,pay_system:k,installments_count:k==='full'?'1':p.installments_count||'2'}))} style={{flex:1,padding:'14px',borderRadius:12,border:'1.5px solid '+(form.pay_system===k?'rgba(212,160,23,.4)':'rgba(255,255,255,.1)'),background:form.pay_system===k?'rgba(212,160,23,.12)':'rgba(255,255,255,.04)',cursor:'pointer',textAlign:'center'}}><div style={{fontSize:14,marginBottom:4}}>{ico}</div><div style={{fontSize:12,fontWeight:700,color:form.pay_system===k?C.gold:'rgba(255,255,255,.5)'}}>{l}</div></div>)}</div>
{/* Installment count */}
{form.pay_system==='installment'&&<><div style={{fontSize:12,fontWeight:700,color:'var(--tx3)',marginBottom:8}}>عدد الأقساط</div>
<div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>{[['2','قسطان'],['3','ثلاثة أقساط'],['4','أربعة أقساط'],['5','خمسة أقساط'],['6','ستة أقساط']].map(([k,l])=><div key={k} onClick={()=>{setForm(p=>{const inst=[...Array(Number(k))].map((_,i)=>({amount:'',condition:i===0?'initial':i===1?'after_delegate':'on_iqama',date:''}));return{...p,installments_count:k,installments:inst}})}} style={{padding:'10px 16px',borderRadius:10,border:'1.5px solid '+(form.installments_count===k?'rgba(212,160,23,.4)':'rgba(255,255,255,.1)'),background:form.installments_count===k?'rgba(212,160,23,.1)':'rgba(255,255,255,.04)',cursor:'pointer'}}><div style={{fontSize:11,fontWeight:700,color:form.installments_count===k?C.gold:'rgba(255,255,255,.5)',display:'flex',alignItems:'center',gap:4}}><span style={{width:20,height:20,borderRadius:'50%',background:form.installments_count===k?C.gold:'rgba(255,255,255,.15)',color:form.installments_count===k?'#171717':'rgba(255,255,255,.4)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800}}>{k}</span>{l}</div></div>)}</div></>}
{/* Total amount */}
<div style={{fontSize:12,fontWeight:700,color:'var(--tx3)',marginBottom:8}}>القيمة الإجمالية</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:16}}>
<div><div style={lblS}>المبلغ الإجمالي <span style={{color:C.red}}>*</span></div><input value={form.total_amount} onChange={e=>setForm(p=>({...p,total_amount:e.target.value}))} type="number" placeholder="0" style={{...fieldS,direction:'ltr',textAlign:'left',fontSize:16,fontWeight:800}}/></div>
<div><div style={lblS}>الخصم</div><input value={form.discount_amount} onChange={e=>setForm(p=>({...p,discount_amount:e.target.value}))} type="number" placeholder="0" style={{...fieldS,direction:'ltr',textAlign:'left'}}/></div>
<div><div style={lblS}>ضريبة ق.م</div><input value={form.vat_amount} onChange={e=>setForm(p=>({...p,vat_amount:e.target.value}))} type="number" placeholder="0" style={{...fieldS,direction:'ltr',textAlign:'left'}}/></div>
</div>
{/* Installment details */}
{form.pay_system==='installment'&&form.installments&&<><div style={{fontSize:12,fontWeight:700,color:'var(--tx3)',marginBottom:8}}>تفاصيل الأقساط</div>
{form.installments.map((inst,idx)=><div key={idx} style={{padding:'14px 16px',borderRadius:12,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.02)',marginBottom:10}}>
<div style={{fontSize:12,fontWeight:700,color:C.gold,marginBottom:10,display:'flex',alignItems:'center',gap:6}}><span style={{width:22,height:22,borderRadius:'50%',background:C.gold,color:'#171717',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800}}>{idx+1}</span>{T('القسط ','Inst ')}{idx===0?T('الأول','1st'):idx===1?T('الثاني','2nd'):idx===2?T('الثالث','3rd'):(idx+1)}</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div><div style={{fontSize:9,color:'var(--tx4)',marginBottom:3}}>المبلغ</div><input value={inst.amount} onChange={e=>{const a=[...form.installments];a[idx]={...a[idx],amount:e.target.value};setForm(p=>({...p,installments:a}))}} type="number" placeholder="0" style={{...fieldS,direction:'ltr',textAlign:'left',height:38}}/></div>
<div><div style={{fontSize:9,color:'var(--tx4)',marginBottom:3}}>الاستحقاق</div><select value={inst.condition} onChange={e=>{const a=[...form.installments];a[idx]={...a[idx],condition:e.target.value};setForm(p=>({...p,installments:a}))}} style={{...fieldS,textAlign:'right',height:38}}><option value="initial">دفعة أولية</option><option value="after_delegate">بعد التوكيل</option><option value="on_iqama">عند إصدار/تجديد الإقامة</option><option value="on_completion">عند الإنجاز</option><option value="final">دفعة أخيرة</option></select></div>
</div></div>)}
<div style={{textAlign:'center',padding:'10px',fontSize:12}}><span style={{fontWeight:700,color:'var(--tx3)'}}>مجموع الأقساط: </span><span style={{fontWeight:800,color:C.gold}}>{num(form.installments.reduce((s,i)=>s+Number(i.amount||0),0))} SAR</span>
{Number(form.total_amount)>0&&<span style={{color:Number(form.total_amount)==form.installments.reduce((s,i)=>s+Number(i.amount||0),0)?C.ok:C.red,marginRight:8,fontSize:11}}> {Number(form.total_amount)==form.installments.reduce((s,i)=>s+Number(i.amount||0),0)?'✓ مطابق':'✗ غير مطابق لمبلغ الفاتورة '+num(form.total_amount)}</span>}</div></>}
{/* Payment method & received */}
<div style={{fontSize:12,fontWeight:700,color:'var(--tx3)',marginBottom:8,marginTop:8}}>تفاصيل عملية الاستلام</div>
<div style={{display:'flex',gap:8,marginBottom:12}}>{[['cash','نقداً','💵'],['bank_transfer','حوالة بنكية','🏦']].map(([k,l,ico])=><div key={k} onClick={()=>setForm(p=>({...p,pay_method:k}))} style={{flex:1,padding:'12px 14px',borderRadius:10,border:'1.5px solid '+(form.pay_method===k?'rgba(212,160,23,.3)':'rgba(255,255,255,.1)'),background:form.pay_method===k?'rgba(212,160,23,.1)':'transparent',cursor:'pointer',textAlign:'center',fontSize:12,fontWeight:600,color:form.pay_method===k?C.gold:'rgba(255,255,255,.48)'}}>{ico} {l}</div>)}</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<div><div style={lblS}>المبلغ المستلم الآن</div><input value={form.paid_now||''} onChange={e=>setForm(p=>({...p,paid_now:e.target.value}))} type="number" placeholder="0" style={{...fieldS,direction:'ltr',textAlign:'left'}}/></div>
<div><div style={lblS}>تاريخ الإصدار</div><input value={form.issue_date} onChange={e=>setForm(p=>({...p,issue_date:e.target.value}))} type="date" style={{...fieldS,direction:'ltr'}}/></div>
</div>
<div style={{padding:'14px 16px',background:'rgba(39,160,70,.03)',borderRadius:12,border:'1px solid rgba(39,160,70,.08)',marginTop:12}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:11,color:'var(--tx4)'}}>الإجمالي</span><span style={{fontSize:16,fontWeight:800,color:'var(--tx)',direction:'ltr'}}>{num((Number(form.total_amount)||0)-(Number(form.discount_amount)||0)+(Number(form.vat_amount)||0))} ر.س</span></div><div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:10,color:'var(--tx4)'}}>المستلم</span><span style={{fontSize:12,fontWeight:700,color:'rgba(39,174,96,.7)',direction:'ltr'}}>{num(Number(form.paid_now)||0)} ر.س</span></div><div style={{height:1,background:'rgba(255,255,255,.07)',margin:'6px 0'}}/><div style={{display:'flex',justifyContent:'space-between'}}><span style={{fontSize:11,fontWeight:600,color:'var(--tx3)'}}>المتبقي على العميل</span><span style={{fontSize:14,fontWeight:800,color:C.gold,direction:'ltr'}}>{num(Math.max(0,(Number(form.total_amount)||0)-(Number(form.discount_amount)||0)+(Number(form.vat_amount)||0)-(Number(form.paid_now)||0)))} ر.س</span></div></div></div>}
{step===5&&<div><div style={{fontSize:14,fontWeight:700,color:'var(--tx)',marginBottom:4}}>إضافي</div><div style={{fontSize:10,color:'var(--tx4)',marginBottom:14}}>الوسيط والملاحظات</div><div style={{marginBottom:12}}><div style={lblS}>الوسيط / المندوب</div><select value={form.broker_id} onChange={e=>setForm(p=>({...p,broker_id:e.target.value}))} style={{...fieldS,textAlign:'right'}}><option value="">ابحث باسم أو رقم جوال الوسيط...</option>{brokersList.map(b=><option key={b.id} value={b.id}>{b.name_ar}</option>)}</select></div><div style={{marginBottom:12}}><div style={lblS}>ملاحظات الفاتورة</div><div style={{fontSize:8,color:'var(--tx5)',marginBottom:4}}>ملاحظات تظهر في الفاتورة</div><textarea value={form.notes||''} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2} placeholder="أي ملاحظات أو شروط تريد إضافتها..." style={{...fieldS,height:'auto',padding:12,resize:'vertical',textAlign:'right'}}/></div><div><div style={lblS}>ملاحظات داخلية <span style={{fontSize:8,color:'var(--tx5)'}}>(لا تظهر للعميل)</span></div><textarea value={form.internal_notes||''} onChange={e=>setForm(p=>({...p,internal_notes:e.target.value}))} rows={2} placeholder="ملاحظات خاصة بالمكتب فقط..." style={{...fieldS,height:'auto',padding:12,resize:'vertical',textAlign:'right'}}/></div></div>}
{step===6&&<div><div style={{fontSize:14,fontWeight:700,color:'var(--tx)',marginBottom:4}}>مراجعة الفاتورة</div><div style={{fontSize:10,color:'var(--tx4)',marginBottom:14}}>تأكد من صحة البيانات قبل الإصدار</div>
{[['العميل',clients.find(c=>c.id===form.client_id)?.name_ar||'—'],
['الخدمة',{visa_perm:'تأشيرة عمل',transfer:'نقل كفالة',renew:'تجديد إقامة',ajeer:'عقد أجير',other:'خدمات أخرى'}[form.service]||form.service||'—'],
...(form.worker_name?[['العامل',form.worker_name+(form.worker_iqama?' — '+form.worker_iqama:'')]]:[]),
['الوسيط',brokersList.find(b=>b.id===form.broker_id)?.name_ar||'بدون'],
['نظام الدفع',form.pay_system==='installment'?'تقسيط ('+form.installments_count+' أقساط)':'دفع كامل'],
['المبلغ الكلي',num(form.total_amount)+' ر.س'],
...(Number(form.discount_amount)>0?[['الخصم',num(form.discount_amount)+' ر.س']]:[]),
['الصافي',num((Number(form.total_amount)||0)-(Number(form.discount_amount)||0)+(Number(form.vat_amount)||0))+' ر.س'],
['المستلم الآن',num(form.paid_now||0)+' ر.س'],
['المتبقي',num(Math.max(0,(Number(form.total_amount)||0)-(Number(form.discount_amount)||0)+(Number(form.vat_amount)||0)-(Number(form.paid_now)||0)))+' ر.س'],
['طريقة الدفع',form.pay_method==='cash'?'نقداً':'حوالة بنكية'],
['تاريخ الإصدار',form.issue_date||'—']].map(([k,v],i)=><div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--bd)'}}><span style={{fontSize:11,color:'var(--tx4)'}}>{k}</span><span style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,.82)'}}>{v}</span></div>)}
{form.pay_system==='installment'&&form.installments?.length>0&&<div style={{marginTop:12,padding:'12px 14px',borderRadius:10,background:'rgba(212,160,23,.04)',border:'1px solid rgba(212,160,23,.08)'}}>
<div style={{fontSize:11,fontWeight:700,color:C.gold,marginBottom:8}}>جدول الأقساط</div>
{form.installments.map((inst,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:11}}>
<span style={{color:'var(--tx4)'}}>القسط {i+1}: {inst.condition==='initial'?'دفعة أولية':inst.condition==='after_delegate'?'بعد التوكيل':inst.condition==='on_iqama'?'عند الإقامة':'عند الإنجاز'}</span>
<span style={{fontWeight:700,color:C.gold}}>{num(inst.amount)} ر.س</span></div>)}
</div>}
{form.notes&&<div style={{marginTop:10,padding:'8px 12px',background:'rgba(255,255,255,.05)',borderRadius:8,fontSize:10,color:'var(--tx4)'}}>{form.notes}</div>}
</div>}
</div>
<div style={{padding:'14px 22px',borderTop:'1px solid rgba(255,255,255,.07)',display:'flex',justifyContent:'space-between',flexShrink:0}}>
{step<6?<button onClick={()=>setStep(s=>Math.min(6,s+1))} style={{...goldBtnS,minWidth:140,gap:8}}><span>التالي</span><span style={{fontSize:14}}>←</span></button>:<button onClick={saveInv} disabled={saving} style={{...goldBtnS,minWidth:160,opacity:saving?.7:1}}>{saving?'جاري الإصدار...':popup==='add'?'إصدار الفاتورة ✓':'حفظ التعديلات'}</button>}
{step>1?<button onClick={()=>setStep(s=>Math.max(1,s-1))} style={{...ghostBtnS,display:'flex',alignItems:'center',gap:6}}><span style={{fontSize:14}}>→</span><span>السابق</span></button>:<button onClick={()=>setPopup(null)} style={ghostBtnS}>إلغاء</button>}
</div>
</div></div>}

{/* ═══ PAYMENT POPUP ═══ */}
{payPop&&<div onClick={()=>setPayPop(null)} style={overlayS}>
<div onClick={e=>e.stopPropagation()} style={{...popupS,width:500}}>
<div style={headS}>
<div style={{display:'flex',alignItems:'center',gap:10}}>
<div style={{width:34,height:34,borderRadius:10,background:'rgba(39,174,96,.08)',display:'flex',alignItems:'center',justifyContent:'center'}}>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(39,174,96,.7)" strokeWidth="1.5"><rect x="2" y="5" width="20" height="14" rx="3"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
</div>
<div><div style={{color:'var(--tx)',fontSize:14,fontWeight:700}}>تسجيل دفعة جديدة</div>
<div style={{fontSize:9,color:'var(--tx4)'}}>الفاتورة #{payF.inv_num} — {payF.client}</div></div>
</div>
<button onClick={()=>setPayPop(null)} style={closeS}>✕</button>
</div>
<div style={{padding:'18px 22px'}}>
<div style={{padding:'10px 14px',background:'rgba(212,160,23,.08)',borderRadius:10,border:'1px solid rgba(212,160,23,.1)',marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<span style={{fontSize:11,fontWeight:600,color:'var(--tx4)'}}>المبلغ المتبقي</span>
<span style={{fontSize:16,fontWeight:800,color:C.gold,direction:'ltr'}}>{num(payF.max)} ر.س</span>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<div><div style={lblS}>المبلغ <span style={{color:C.red}}>*</span></div><input value={payF.amount} onChange={e=>setPayF(p=>({...p,amount:e.target.value}))} type="number" placeholder="0.00" style={{...fieldS,direction:'ltr',textAlign:'left'}}/></div>
<div><div style={lblS}>طريقة الدفع</div>
<select value={payF.method} onChange={e=>setPayF(p=>({...p,method:e.target.value}))} style={{...fieldS,textAlign:'right'}}>
<option value="cash">نقداً</option><option value="bank_transfer">حوالة بنكية</option></select></div>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:12}}>
<div><div style={lblS}>التاريخ</div><input value={payF.date} onChange={e=>setPayF(p=>({...p,date:e.target.value}))} type="date" style={{...fieldS,direction:'ltr'}}/></div>
<div><div style={lblS}>رقم المرجع</div><input value={payF.reference} onChange={e=>setPayF(p=>({...p,reference:e.target.value}))} placeholder="اختياري" style={{...fieldS,direction:'ltr',textAlign:'left'}}/></div>
</div>
<div style={{marginTop:12}}><div style={lblS}>ملاحظات</div>
<textarea value={payF.notes} onChange={e=>setPayF(p=>({...p,notes:e.target.value}))} rows={2} placeholder="ملاحظات إضافية ..." style={{...fieldS,height:'auto',padding:12,resize:'vertical',textAlign:'right'}}/></div>
</div>
<div style={{padding:'14px 22px',borderTop:'1px solid rgba(255,255,255,.07)',display:'flex',justifyContent:'space-between',flexDirection:'row-reverse'}}>
<button onClick={savePay} disabled={saving} style={{...goldBtnS,minWidth:140,opacity:saving?.7:1}}>{saving?'جاري التسجيل...':'تسجيل الدفعة'}</button>
<button onClick={()=>setPayPop(null)} style={ghostBtnS}>إلغاء</button>
</div></div></div>}

{/* ═══ VIEW POPUP ═══ */}
{viewPop&&(()=>{const v=viewPop;const stClr=v.status==='paid'?C.ok:v.status==='partial'?C.gold:C.red;const paidPct=Number(v.total_amount)>0?Math.round(Number(v.paid_amount||0)/Number(v.total_amount)*100):0;const daysUntilDue=v.due_date?Math.ceil((new Date(v.due_date)-new Date())/86400000):null;const isOverdue=v.status!=='paid'&&daysUntilDue!==null&&daysUntilDue<0
return<div onClick={()=>setViewPop(null)} style={overlayS}>
<div onClick={e=>e.stopPropagation()} style={{...popupS,width:860,height:'min(600px,88vh)'}}>
<div style={headS}>
<div style={{display:'flex',alignItems:'center',gap:12,flex:1}}>
<div style={{width:44,height:44,borderRadius:12,background:stClr+'12',border:'1.5px solid '+stClr+'25',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{v.status==='paid'?'✓':v.status==='partial'?'◐':'○'}</div>
<div style={{flex:1}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
<span style={{fontSize:16,fontWeight:800,color:'var(--tx)'}}>#{v.invoice_number}</span>
<span style={{fontSize:9,padding:'3px 10px',borderRadius:6,background:stClr+'12',color:stClr,fontWeight:700}}>{statusLabels[v.status]||v.status}</span>
{isOverdue&&<span style={{fontSize:9,padding:'3px 8px',borderRadius:6,background:C.red+'12',color:C.red,fontWeight:700}}>متأخرة {Math.abs(daysUntilDue)} يوم</span>}
</div>
<div style={{fontSize:11,color:'var(--tx4)'}}>{v.clients?.name_ar||'—'} · {svcLabelAr[v.service_category]||v.service_category||''}</div>
{/* Progress bar */}
<div style={{display:'flex',alignItems:'center',gap:8,marginTop:6}}>
<div style={{flex:1,maxWidth:180,height:4,borderRadius:2,background:'rgba(255,255,255,.06)',overflow:'hidden'}}><div style={{height:'100%',width:paidPct+'%',borderRadius:2,background:paidPct>=100?C.ok:paidPct>0?C.gold:C.red}}/></div>
<span style={{fontSize:10,fontWeight:700,color:paidPct>=100?C.ok:C.gold}}>{paidPct}% {paidPct>=100?'مسدد':'محصّل'}</span>
</div>
</div></div>
<button onClick={()=>setViewPop(null)} style={closeS}>✕</button>
</div>
<div style={{flex:1,display:'flex',overflow:'hidden'}}>
<div style={{width:140,background:'var(--bg)',borderLeft:'1px solid rgba(255,255,255,.04)',padding:'12px 8px',flexShrink:0}}>
{[{id:'info',l:'📋 البيانات'},{id:'financial',l:'💰 المالية'},{id:'payments',l:'💳 المدفوعات',n:payments.length},{id:'installments',l:'📅 الأقساط',n:installments.length}].map(t=><div key={t.id} onClick={()=>setViewTab(t.id)} style={{padding:'10px 10px',borderRadius:8,marginBottom:3,fontSize:10,fontWeight:viewTab===t.id?700:500,color:viewTab===t.id?C.gold:'rgba(255,255,255,.38)',background:viewTab===t.id?'rgba(212,160,23,.08)':'transparent',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}><span>{t.l}</span>{t.n>0&&<span style={{fontSize:9,fontWeight:700,color:viewTab===t.id?C.gold:'rgba(255,255,255,.2)',background:viewTab===t.id?'rgba(212,160,23,.15)':'rgba(255,255,255,.04)',padding:'1px 6px',borderRadius:4}}>{t.n}</span>}</div>)}
</div>
<div className="dash-content" style={{flex:1,overflowY:'auto',padding:'18px 22px'}}>
{/* ── TAB: البيانات (Enhanced) ── */}
{viewTab==='info'&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
{/* Client card */}
{v.clients?.name_ar&&<div style={{background:'rgba(212,160,23,.04)',border:'1px solid rgba(212,160,23,.1)',borderRadius:10,padding:'12px 14px',display:'flex',alignItems:'center',gap:12}}>
<div style={{width:36,height:36,borderRadius:10,background:C.gold+'15',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:C.gold}}>{v.clients.name_ar[0]}</div>
<div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:'var(--tx)'}}>{v.clients.name_ar}</div>{v.clients.phone&&<div style={{fontSize:10,color:'var(--tx5)',direction:'ltr',marginTop:1}}>{v.clients.phone}</div>}</div>
{v.brokers?.name_ar&&<div style={{textAlign:'center'}}><div style={{fontSize:9,color:'var(--tx5)'}}>الوسيط</div><div style={{fontSize:10,fontWeight:600,color:C.blue}}>{v.brokers.name_ar}</div></div>}
</div>}
{/* Details grid - only non-empty fields */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
{[['🔢 رقم الفاتورة',v.invoice_number],['📋 نوع الخدمة',svcLabelAr[v.service_category]||v.service_category],['💳 طريقة الدفع',v.payment_method==='cash'?'نقداً':v.payment_method==='bank_transfer'?'حوالة بنكية':v.payment_method||'—'],['📅 تاريخ الإصدار',v.issue_date?new Date(v.issue_date).toLocaleDateString('ar-SA',{year:'numeric',month:'short',day:'numeric'}):'—'],['⏰ تاريخ الاستحقاق',v.due_date?new Date(v.due_date).toLocaleDateString('ar-SA',{year:'numeric',month:'short',day:'numeric'}):'—']].filter(([,val])=>val&&val!=='—').map(([l,val],i)=><div key={i} style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'10px 14px',border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:9,color:'var(--tx5)',marginBottom:4}}>{l}</div><div style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,.85)'}}>{val}</div></div>)}
</div>
{/* Invoice items */}
{invoiceItems.length>0&&<div style={{background:'rgba(255,255,255,.02)',borderRadius:10,border:'1px solid rgba(255,255,255,.04)',overflow:'hidden'}}>
<div style={{padding:'10px 14px',borderBottom:'1px solid var(--bd)',fontSize:11,fontWeight:700,color:'var(--tx)'}}>📦 بنود الفاتورة ({invoiceItems.length})</div>
{invoiceItems.map((item,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 14px',borderBottom:i<invoiceItems.length-1?'1px solid var(--bd2)':'none'}}>
<div style={{flex:1}}><div style={{fontSize:11,fontWeight:600,color:'var(--tx3)'}}>{item.description_ar||item.description_en||'—'}</div>{item.quantity>1&&<span style={{fontSize:9,color:'var(--tx5)'}}>{item.quantity} × {num(item.unit_price)}</span>}</div>
<div style={{fontSize:12,fontWeight:700,color:C.gold}}>{num(item.unit_price*item.quantity)} ر.س</div>
</div>)}
</div>}
{v.notes&&<div style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'12px 14px',border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:9,color:'var(--tx5)',marginBottom:5}}>📝 ملاحظات</div><div style={{fontSize:12,color:'rgba(255,255,255,.7)',lineHeight:1.8}}>{v.notes}</div></div>}
</div>}
{/* ── TAB: المالية (Enhanced) ── */}
{viewTab==='financial'&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
<div style={{background:'rgba(212,160,23,.06)',borderRadius:12,padding:'16px',border:'1px solid rgba(212,160,23,.1)',textAlign:'center'}}><div style={{fontSize:9,color:'rgba(212,160,23,.6)',marginBottom:5}}>الإجمالي</div><div style={{fontSize:22,fontWeight:900,color:C.gold}}>{num(v.total_amount)}</div></div>
<div style={{background:'rgba(39,160,70,.06)',borderRadius:12,padding:'16px',border:'1px solid rgba(39,160,70,.1)',textAlign:'center'}}><div style={{fontSize:9,color:'rgba(39,160,70,.6)',marginBottom:5}}>المدفوع</div><div style={{fontSize:22,fontWeight:900,color:C.ok}}>{num(v.paid_amount)}</div></div>
<div style={{background:Number(v.remaining_amount)>0?'rgba(192,57,43,.06)':'rgba(39,160,70,.06)',borderRadius:12,padding:'16px',border:'1px solid '+(Number(v.remaining_amount)>0?'rgba(192,57,43,.1)':'rgba(39,160,70,.1)'),textAlign:'center'}}><div style={{fontSize:9,color:Number(v.remaining_amount)>0?'rgba(192,57,43,.6)':'rgba(39,160,70,.6)',marginBottom:5}}>المتبقي</div><div style={{fontSize:22,fontWeight:900,color:Number(v.remaining_amount)>0?C.red:C.ok}}>{num(v.remaining_amount)}</div></div>
</div>
{/* Big progress bar */}
<div style={{background:'rgba(255,255,255,.03)',borderRadius:10,padding:14,border:'1px solid rgba(255,255,255,.04)'}}>
<div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:10,color:'var(--tx4)'}}>نسبة السداد</span><span style={{fontSize:12,fontWeight:800,color:paidPct>=100?C.ok:paidPct>0?C.gold:C.red}}>{paidPct}%</span></div>
<div style={{height:8,borderRadius:4,background:'rgba(255,255,255,.06)',overflow:'hidden'}}><div style={{height:'100%',width:paidPct+'%',borderRadius:4,background:paidPct>=100?C.ok:paidPct>50?C.gold:C.red,transition:'width .5s'}}/></div>
{isOverdue&&<div style={{fontSize:10,color:C.red,marginTop:6}}>⚠ متأخرة عن السداد بـ {Math.abs(daysUntilDue)} يوم</div>}
{!isOverdue&&daysUntilDue!==null&&daysUntilDue>0&&v.status!=='paid'&&<div style={{fontSize:10,color:C.gold,marginTop:6}}>⏰ متبقي {daysUntilDue} يوم على الاستحقاق</div>}
</div>
{Number(v.discount_amount)>0&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'10px 14px',border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:9,color:'var(--tx5)',marginBottom:4}}>الخصم</div><div style={{fontSize:14,fontWeight:700,color:C.gold}}>{num(v.discount_amount)} ر.س</div></div>
<div style={{background:'rgba(255,255,255,.025)',borderRadius:10,padding:'10px 14px',border:'1px solid rgba(255,255,255,.03)'}}><div style={{fontSize:9,color:'var(--tx5)',marginBottom:4}}>الضريبة</div><div style={{fontSize:14,fontWeight:700,color:'rgba(255,255,255,.7)'}}>{num(v.vat_amount)} ر.س</div></div>
</div>}
{/* Items breakdown */}
{invoiceItems.length>0&&<div style={{background:'rgba(255,255,255,.02)',borderRadius:10,border:'1px solid rgba(255,255,255,.04)',overflow:'hidden'}}>
<div style={{padding:'10px 14px',borderBottom:'1px solid var(--bd)',fontSize:10,fontWeight:700,color:'var(--tx4)'}}>تفصيل البنود</div>
{invoiceItems.map((item,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 14px',borderBottom:i<invoiceItems.length-1?'1px solid var(--bd2)':'none',fontSize:11}}><span style={{color:'var(--tx3)'}}>{item.description_ar||'—'}</span><span style={{fontWeight:700,color:C.gold}}>{num(item.unit_price*item.quantity)}</span></div>)}
</div>}
</div>}
{/* ── TAB: المدفوعات (Enhanced) ── */}
{viewTab==='payments'&&<div>
{payments.length===0?<div style={{textAlign:'center',padding:40}}>
{v.status==='paid'?<><div style={{fontSize:32,marginBottom:8}}>✅</div><div style={{fontSize:12,color:C.ok,fontWeight:600}}>تم السداد بالكامل</div><div style={{fontSize:10,color:'var(--tx5)',marginTop:4}}>لا توجد دفعات مفصّلة مسجلة</div></>:<><div style={{fontSize:32,marginBottom:8}}>💳</div><div style={{fontSize:12,color:'var(--tx5)'}}>لا توجد دفعات مسجّلة بعد</div></>}
</div>:
payments.map((pay,pi)=><div key={pi} style={{display:'flex',gap:12,padding:'12px 14px',background:'rgba(39,160,70,.03)',borderRadius:10,marginBottom:6,border:'1px solid rgba(39,160,70,.08)',alignItems:'center'}}>
<div style={{width:32,height:32,borderRadius:8,background:C.ok+'15',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:C.ok,flexShrink:0}}>{pi+1}</div>
<div style={{flex:1}}><div style={{fontSize:14,fontWeight:800,color:C.ok}}>{num(pay.amount)} ر.س</div><div style={{fontSize:9,color:'var(--tx5)',marginTop:2}}>{pay.payment_method==='cash'?'💵 نقداً':'🏦 حوالة بنكية'}{pay.reference_number?' — '+pay.reference_number:''}</div></div>
<div style={{textAlign:'left',direction:'ltr'}}><div style={{fontSize:11,fontWeight:600,color:'var(--tx3)'}}>{pay.payment_date?new Date(pay.payment_date).toLocaleDateString('ar-SA',{month:'short',day:'numeric'}):'—'}</div>{pay.notes&&<div style={{fontSize:9,color:'var(--tx5)'}}>{pay.notes}</div>}</div>
</div>)}
</div>}
{/* ── TAB: الأقساط (Enhanced) ── */}
{viewTab==='installments'&&<div>
{installments.length===0?<div style={{textAlign:'center',padding:40}}>
<div style={{fontSize:32,marginBottom:8}}>📅</div>
<div style={{fontSize:12,color:'var(--tx5)'}}>فاتورة بدفعة واحدة — لا يوجد جدولة أقساط</div>
</div>:
<div>{/* Summary */}
<div style={{display:'flex',gap:8,marginBottom:12}}>
<span style={{fontSize:10,padding:'4px 10px',borderRadius:6,background:C.ok+'08',color:C.ok,border:'1px solid '+C.ok+'15'}}>{installments.filter(i=>i.status==='paid').length} مسدد</span>
<span style={{fontSize:10,padding:'4px 10px',borderRadius:6,background:C.gold+'08',color:C.gold,border:'1px solid '+C.gold+'15'}}>{installments.filter(i=>i.status!=='paid').length} معلّق</span>
</div>
{installments.map((inst,ii)=>{const isPaid=inst.status==='paid';const isLate=!isPaid&&inst.due_date&&new Date(inst.due_date)<new Date()
return<div key={ii} style={{display:'flex',gap:12,padding:'12px 14px',background:isPaid?'rgba(39,160,70,.03)':isLate?'rgba(192,57,43,.03)':'rgba(255,255,255,.02)',borderRadius:10,marginBottom:6,border:'1px solid '+(isPaid?'rgba(39,160,70,.08)':isLate?'rgba(192,57,43,.1)':'rgba(255,255,255,.05)'),alignItems:'center'}}>
<div style={{width:30,height:30,borderRadius:'50%',background:isPaid?C.ok+'20':isLate?C.red+'15':C.gold+'15',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:isPaid?C.ok:isLate?C.red:C.gold,flexShrink:0}}>{isPaid?'✓':inst.installment_order}</div>
<div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:'var(--tx2)'}}>{num(inst.amount)} ر.س</div><div style={{fontSize:10,color:'var(--tx5)',marginTop:1}}>{inst.due_date?new Date(inst.due_date).toLocaleDateString('ar-SA',{year:'numeric',month:'short',day:'numeric'}):'—'}</div></div>
<div style={{fontSize:10,fontWeight:700,color:isPaid?C.ok:isLate?C.red:C.gold,background:(isPaid?C.ok:isLate?C.red:C.gold)+'12',padding:'3px 10px',borderRadius:6}}>{isPaid?'مسدد ✓':isLate?'متأخر ❗':'مستحق ⏰'}</div>
</div>})}</div>}
</div>}
</div></div>
<div style={{padding:'14px 22px',borderTop:'1px solid rgba(255,255,255,.07)',display:'flex',gap:8,justifyContent:'center'}}>
<button onClick={()=>{setViewPop(null);openEdit(v)}} style={{...goldBtnS,flex:1}}>✎ تعديل</button>
{v.status!=='paid'&&<button onClick={()=>{setViewPop(null);openPay(v)}} style={{...goldBtnS,flex:1,background:C.ok}}>+ تسجيل دفعة</button>}
<button onClick={()=>printInvoice(v)} style={{...goldBtnS,flex:1,background:'rgba(155,89,182,.12)',border:'1px solid rgba(155,89,182,.2)',color:'#9b59b6'}}>🖨️ طباعة</button>
<button onClick={()=>{setViewPop(null);setDelPop(v)}} style={{...goldBtnS,flex:1,background:'rgba(192,57,43,.1)',border:'1px solid rgba(192,57,43,.25)',color:C.red}}>🗑 حذف</button>
<button onClick={()=>setViewPop(null)} style={{...ghostBtnS,flex:1}}>إغلاق</button>
</div></div></div>})()}

{/* ═══ DELETE CONFIRMATION ═══ */}
{delPop&&<div onClick={()=>setDelPop(null)} style={overlayS}>
<div onClick={e=>e.stopPropagation()} style={{...popupS,width:420}}>
<div style={{...headS,background:'linear-gradient(to left,rgba(80,20,20,.9),rgba(120,30,30,.9))'}}>
<div style={{color:'var(--tx)',fontSize:14,fontWeight:700}}>حذف الفاتورة</div>
<button onClick={()=>setDelPop(null)} style={closeS}>✕</button>
</div>
<div style={{padding:'22px 22px',textAlign:'center'}}>
<div style={{width:48,height:48,borderRadius:'50%',background:'rgba(192,57,43,.08)',border:'2px solid rgba(192,57,43,.15)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px'}}>
<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="5" y="6" width="14" height="14" rx="2" fill="rgba(192,57,43,.1)" stroke={C.red} strokeWidth="1.5"/><path d="M3 6h18" stroke={C.red} strokeWidth="1.5" strokeLinecap="round"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke={C.red} strokeWidth="1.5" opacity=".5"/></svg>
</div>
<div style={{fontSize:14,fontWeight:700,color:C.red,marginBottom:4}}>حذف الفاتورة #{delPop.invoice_number}؟</div>
<div style={{fontSize:11,color:'var(--tx4)',lineHeight:1.8,marginBottom:14}}>هذا الإجراء لا يمكن التراجع عنه</div>
<div style={{textAlign:'right',marginBottom:8}}><div style={{fontSize:11,fontWeight:600,color:'var(--tx3)',marginBottom:5}}>سبب الحذف <span style={{color:C.red}}>*</span></div>
<textarea value={delPop.reason||''} onChange={e=>setDelPop(p=>({...p,reason:e.target.value}))} rows={2} placeholder="اكتب سبب الحذف..." style={{width:'100%',padding:10,border:'1.5px solid rgba(192,57,43,.15)',borderRadius:8,fontFamily:F,fontSize:12,color:'var(--tx)',background:'rgba(255,255,255,.05)',outline:'none',resize:'vertical',textAlign:'right'}}/></div>
</div>
<div style={{padding:'14px 22px',borderTop:'1px solid rgba(255,255,255,.07)',display:'flex',gap:10,justifyContent:'center'}}>
<button onClick={delInv} disabled={saving||!delPop.reason?.trim()} style={{height:42,padding:'0 22px',borderRadius:10,border:'none',background:C.red,color:'#fff',fontFamily:F,fontSize:13,fontWeight:700,cursor:'pointer',flex:1,opacity:saving||!delPop.reason?.trim()?.7:1}}>تأكيد الحذف</button>
<button onClick={()=>setDelPop(null)} style={{...ghostBtnS,flex:1}}>تراجع</button>
</div></div></div>}

{/* Animation */}
<style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
</div>}
