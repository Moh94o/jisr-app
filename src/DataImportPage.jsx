import React, { useState, useEffect, useCallback } from 'react'
const F="'Cairo','Tajawal',sans-serif"
const C={gold:'#c9a84c',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}
const nm=v=>Number(v||0).toLocaleString('en-US')

export default function DataImportPage({sb,toast,user,lang}){
const T=(a,e)=>lang==='ar'?a:e
const[tab,setTab]=useState('overview')
const[batches,setBatches]=useState([]);const[receipts,setReceipts]=useState([]);const[clients,setClients]=useState([]);const[branches,setBranches]=useState([])
const[loading,setLoading]=useState(true)
// Receipt form
const[rcPop,setRcPop]=useState(null);const[rcForm,setRcForm]=useState({});const[saving,setSaving]=useState(false)
// Excel import
const[excelStep,setExcelStep]=useState(0);const[excelData,setExcelData]=useState([]);const[excelFile,setExcelFile]=useState('')
const[importing,setImporting]=useState(false)
// Link popup
const[linkPop,setLinkPop]=useState(null);const[linkInvoice,setLinkInvoice]=useState('');const[invoices,setInvoices]=useState([])

const load=useCallback(async()=>{setLoading(true)
const[b,r,c,br]=await Promise.all([
  sb.from('migration_batches').select('*').order('created_at',{ascending:false}),
  sb.from('receipt_vouchers').select('*,clients:client_id(name_ar)').is('deleted_at',null).order('receipt_date',{ascending:false}),
  sb.from('clients').select('id,name_ar').is('deleted_at',null).order('name_ar'),
  sb.from('branches').select('id,name_ar').is('deleted_at',null)
])
setBatches(b.data||[]);setReceipts(r.data||[]);setClients(c.data||[]);setBranches(br.data||[]);setLoading(false)
},[sb])
useEffect(()=>{load()},[load])

const saveReceipt=async()=>{setSaving(true);try{
  const row={receipt_number:rcForm.receipt_number,client_id:rcForm.client_id||null,client_name_manual:rcForm.client_name_manual||null,amount:Number(rcForm.amount),payment_method:rcForm.payment_method||'cash',bank_name:rcForm.bank_name||null,check_number:rcForm.check_number||null,receipt_date:rcForm.receipt_date,description:rcForm.description||null,service_type:rcForm.service_type||null,branch_id:rcForm.branch_id||null,entered_by:user?.id}
  if(rcPop==='new')await sb.from('receipt_vouchers').insert(row)
  else await sb.from('receipt_vouchers').update(row).eq('id',rcPop)
  toast(T('تم الحفظ','Saved'));setRcPop(null);load()
}catch(e){toast('خطأ: '+(e.message||'').slice(0,60))}setSaving(false)}

const linkReceipt=async(receiptId)=>{if(!linkInvoice)return
try{
  await sb.from('receipt_vouchers').update({invoice_id:linkInvoice,is_linked:true}).eq('id',receiptId)
  // Create invoice_payment from receipt
  const rc=receipts.find(r=>r.id===receiptId)
  if(rc)await sb.from('invoice_payments').insert({invoice_id:linkInvoice,amount:rc.amount,payment_method:rc.payment_method,payment_date:rc.receipt_date,data_source:'receipt',receipt_number:rc.receipt_number})
  toast(T('تم الربط','Linked'));setLinkPop(null);load()
}catch(e){toast('خطأ')}}

const rollbackBatch=async(id)=>{if(!confirm(T('هل تريد التراجع عن هذا الاستيراد؟ سيتم حذف كل البيانات المستوردة.','Rollback this import? All imported data will be deleted.')))return
  await sb.from('invoices').delete().eq('migration_batch_id',id)
  await sb.from('invoice_payments').delete().eq('migration_batch_id',id)
  await sb.from('migration_batches').update({status:'rolled_back',rolled_back_at:new Date().toISOString()}).eq('id',id)
  toast(T('تم التراجع','Rolled back'));load()}

// Excel CSV parse
const handleExcel=async(e)=>{const file=e.target.files?.[0];if(!file)return;setExcelFile(file.name)
  const text=await file.text();const lines=text.split('\n').filter(l=>l.trim())
  if(lines.length<2){toast(T('الملف فارغ','Empty'));return}
  const headers=lines[0].split(',').map(h=>h.trim().replace(/"/g,''))
  const rows=[];for(let i=1;i<lines.length;i++){const cols=lines[i].split(',').map(c=>c.trim().replace(/"/g,''));if(cols.length>=3)rows.push(cols)}
  setExcelData(rows);setExcelStep(2);e.target.value=''}

const doImport=async()=>{if(excelData.length===0)return;setImporting(true)
  try{
    const{data:batch}=await sb.from('migration_batches').insert({batch_name:T('استيراد ','Import ')+excelFile,source_type:'excel',source_file_name:excelFile,total_invoices:excelData.length,status:'completed',imported_at:new Date().toISOString(),imported_by:user?.id}).select().single()
    let cnt=0
    for(const row of excelData){
      const amt=parseFloat((row[2]||'0').replace(/[^0-9.-]/g,''));if(!amt||isNaN(amt))continue
      await sb.from('invoices').insert({invoice_number:'MIG-'+String(cnt+1).padStart(4,'0'),total_amount:amt,paid_amount:amt,remaining_amount:0,status:'paid',issue_date:row[3]||new Date().toISOString().slice(0,10),data_source:'migration',migration_batch_id:batch.id,original_reference:row[0]||'',created_by:user?.id})
      cnt++
    }
    await sb.from('migration_batches').update({total_invoices:cnt,total_amount:excelData.reduce((s,r)=>s+parseFloat((r[2]||'0').replace(/[^0-9.-]/g,'')||0),0)}).eq('id',batch.id)
    toast(T('تم استيراد '+cnt+' فاتورة','Imported '+cnt+' invoices'));setExcelStep(0);setExcelData([]);load()
  }catch(e){toast('خطأ: '+(e.message||'').slice(0,60))}setImporting(false)}

const svcTypes={transfer:T('نقل كفالة','Transfer'),iqama_renewal:T('تجديد إقامة','Iqama Renewal'),visa:T('تأشيرة','Visa'),recruitment:T('استقدام','Recruitment'),wp:T('رخصة عمل','Work Permit'),cr:T('سجل تجاري','CR'),other:T('أخرى','Other')}
const stClr={completed:C.ok,draft:C.gold,processing:C.blue,rolled_back:C.red}
const stLbl={completed:T('مكتمل','Done'),draft:T('مسودة','Draft'),processing:T('جاري','Processing'),rolled_back:T('تم التراجع','Rolled Back')}
const fS={width:'100%',height:40,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:F,fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',background:'rgba(255,255,255,.06)',textAlign:'right',boxSizing:'border-box'}
const totalReceipts=receipts.length;const linked=receipts.filter(r=>r.is_linked).length;const unlinked=totalReceipts-linked

if(loading)return<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>
return<div style={{fontFamily:F,direction:lang==='ar'?'rtl':'ltr'}}>
<div style={{fontSize:22,fontWeight:800,color:'var(--tx)',marginBottom:4}}>📥 {T('استيراد البيانات التاريخية','Historical Data Import')}</div>
<div style={{fontSize:12,color:'var(--tx4)',marginBottom:20}}>{T('استيراد فواتير من إكسل + إدخال سندات قبض ورقية','Import invoices from Excel + enter paper receipts')}</div>

{/* Layout: side tabs + content */}
<div style={{display:'flex',gap:0,minHeight:400}}>
{/* Side sub-tabs - RIGHT side in RTL */}
<div style={{width:120,flexShrink:0,borderLeft:lang==='ar'?'1px solid rgba(255,255,255,.06)':'none',borderRight:lang!=='ar'?'1px solid rgba(255,255,255,.06)':'none',padding:'4px 6px'}}>
{[{id:'overview',l:T('نظرة عامة','Overview'),ic:'📊'},{id:'excel',l:T('استيراد إكسل','Excel'),ic:'📊'},{id:'receipts',l:T('سندات القبض','Receipts'),ic:'📝',n:totalReceipts},{id:'batches',l:T('الدفعات','Batches'),ic:'📦',n:batches.length}].map(t=>
<div key={t.id} onClick={()=>setTab(t.id)} style={{padding:'8px 10px',borderRadius:8,marginBottom:2,fontSize:10,fontWeight:tab===t.id?700:500,color:tab===t.id?C.gold:'rgba(255,255,255,.3)',background:tab===t.id?'rgba(201,168,76,.06)':'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',borderRight:lang==='ar'&&tab===t.id?'2px solid '+C.gold:'2px solid transparent',borderLeft:lang!=='ar'&&tab===t.id?'2px solid '+C.gold:'2px solid transparent'}}>
<span style={{display:'flex',alignItems:'center',gap:4}}><span style={{fontSize:11}}>{t.ic}</span>{t.l}</span>
{t.n>0&&<span style={{fontSize:8,fontWeight:700,color:tab===t.id?C.gold:'rgba(255,255,255,.15)',background:tab===t.id?'rgba(201,168,76,.1)':'rgba(255,255,255,.04)',padding:'1px 5px',borderRadius:6}}>{t.n}</span>}
</div>)}
</div>
{/* Content */}
<div style={{flex:1}}>

{/* ═══ OVERVIEW ═══ */}
{tab==='overview'&&<div>
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:18}}>
{[[T('دفعات الاستيراد','Batches'),batches.length,C.gold,'📦'],[T('سندات قبض','Receipts'),totalReceipts,C.blue,'📝'],[T('مربوطة بفاتورة','Linked'),linked,C.ok,'🔗'],[T('بدون ربط','Unlinked'),unlinked,unlinked>0?'#e67e22':'#888','⚠']].map(([l,v,c,ic],i)=>
<div key={i} style={{padding:'14px',borderRadius:12,background:c+'08',border:'1px solid '+c+'15',textAlign:'center'}}>
<div style={{fontSize:16}}>{ic}</div><div style={{fontSize:22,fontWeight:800,color:c,marginTop:4}}>{v}</div><div style={{fontSize:9,color:c,opacity:.6}}>{l}</div>
</div>)}
</div>
{/* Quick actions */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<div onClick={()=>setTab('excel')} style={{padding:'20px',borderRadius:14,background:'rgba(201,168,76,.04)',border:'1px solid rgba(201,168,76,.1)',cursor:'pointer',textAlign:'center'}}>
<div style={{fontSize:28,marginBottom:8}}>📊</div>
<div style={{fontSize:14,fontWeight:700,color:C.gold}}>{T('استيراد من إكسل','Import from Excel')}</div>
<div style={{fontSize:11,color:'var(--tx5)',marginTop:4}}>{T('رفع ملف CSV/Excel بفواتير ودفعات','Upload CSV with invoices & payments')}</div>
</div>
<div onClick={()=>{setRcForm({receipt_number:'RC-'+String(totalReceipts+1).padStart(4,'0'),receipt_date:new Date().toISOString().slice(0,10),payment_method:'cash',amount:''});setRcPop('new')}} style={{padding:'20px',borderRadius:14,background:'rgba(52,131,180,.04)',border:'1px solid rgba(52,131,180,.1)',cursor:'pointer',textAlign:'center'}}>
<div style={{fontSize:28,marginBottom:8}}>📝</div>
<div style={{fontSize:14,fontWeight:700,color:C.blue}}>{T('إدخال سند قبض','Enter Receipt')}</div>
<div style={{fontSize:11,color:'var(--tx5)',marginTop:4}}>{T('إدخال سند قبض ورقي بالتاريخ الأصلي','Enter paper receipt with original date')}</div>
</div>
</div>
{/* Info box */}
<div style={{marginTop:16,padding:'14px 16px',borderRadius:10,background:'rgba(52,131,180,.04)',border:'1px solid rgba(52,131,180,.1)'}}>
<div style={{fontSize:11,fontWeight:700,color:C.blue,marginBottom:6}}>ℹ {T('كيف تشتغل البيانات التاريخية','How historical data works')}</div>
<div style={{fontSize:10,color:'var(--tx4)',lineHeight:1.8}}>
• {T('كل الإحصائيات تستخدم تاريخ الحدث الأصلي (مو تاريخ الإدخال)','All stats use original event date, not entry date')}<br/>
• {T('البيانات المستوردة تُعلّم تلقائياً — تقدر تفلترها في التقارير','Imported data is tagged — you can filter it in reports')}<br/>
• {T('تقدر تتراجع عن أي دفعة استيراد بضغطة زر','You can rollback any import batch with one click')}
</div>
</div>
</div>}

{/* ═══ EXCEL IMPORT ═══ */}
{tab==='excel'&&<div>
{excelStep===0&&<div style={{textAlign:'center',padding:'40px 20px'}}>
<div style={{fontSize:40,marginBottom:12}}>📊</div>
<div style={{fontSize:14,fontWeight:700,color:'var(--tx3)',marginBottom:8}}>{T('رفع ملف إكسل أو CSV','Upload Excel or CSV file')}</div>
<div style={{fontSize:11,color:'var(--tx5)',marginBottom:16}}>{T('الملف يجب أن يحتوي أعمدة: رقم الفاتورة، اسم العميل، المبلغ، التاريخ','File should have: invoice number, client name, amount, date')}</div>
<label style={{display:'inline-flex',alignItems:'center',gap:6,height:42,padding:'0 24px',borderRadius:10,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.1)',color:C.gold,fontFamily:F,fontSize:13,fontWeight:700,cursor:'pointer'}}>
📎 {T('اختر ملف','Choose File')}
<input type="file" accept=".csv,.txt,.xlsx" onChange={handleExcel} style={{display:'none'}}/>
</label>
</div>}
{excelStep===2&&<div>
<div style={{fontSize:13,fontWeight:700,color:'var(--tx3)',marginBottom:12}}>{T('معاينة البيانات','Data Preview')} — {excelData.length} {T('صف','rows')}</div>
<div style={{background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:12,overflow:'hidden',maxHeight:300,overflowY:'auto',marginBottom:16}}>
<table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
<tbody>{excelData.slice(0,10).map((row,i)=><tr key={i} style={{borderBottom:'1px solid var(--bd2)'}}>
{row.slice(0,5).map((c,j)=><td key={j} style={{padding:'8px 10px',color:'var(--tx3)'}}>{c}</td>)}
</tr>)}</tbody>
</table>
</div>
{excelData.length>10&&<div style={{fontSize:10,color:'var(--tx5)',marginBottom:12}}>+{excelData.length-10} {T('صف آخر','more rows')}</div>}
<div style={{padding:'12px 16px',borderRadius:10,background:'rgba(230,126,34,.06)',border:'1px solid rgba(230,126,34,.12)',marginBottom:16}}>
<span style={{fontSize:10,color:'#e67e22'}}>⚠ {T('هذه البيانات ستُعلّم كـ "مستوردة" ولن تؤثر على إحصائيات اليوم','Data will be tagged as "imported" and won\'t affect today\'s stats')}</span>
</div>
<div style={{display:'flex',gap:8}}>
<button onClick={()=>{setExcelStep(0);setExcelData([])}} style={{height:42,padding:'0 20px',borderRadius:10,border:'1px solid rgba(255,255,255,.1)',background:'transparent',color:'var(--tx4)',fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer'}}>{T('إلغاء','Cancel')}</button>
<button onClick={doImport} disabled={importing} style={{flex:1,height:42,borderRadius:10,border:'none',background:C.gold,color:'#111',fontFamily:F,fontSize:13,fontWeight:800,cursor:'pointer',opacity:importing?.6:1}}>{importing?'...':T('استيراد '+excelData.length+' فاتورة','Import '+excelData.length+' invoices')}</button>
</div>
</div>}
</div>}

{/* ═══ RECEIPTS ═══ */}
{tab==='receipts'&&<div>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
<span style={{fontSize:13,fontWeight:700,color:'var(--tx3)'}}>{totalReceipts} {T('سند قبض','receipts')} · {linked} {T('مربوط','linked')} · {unlinked} {T('بدون ربط','unlinked')}</span>
<button onClick={()=>{setRcForm({receipt_number:'RC-'+String(totalReceipts+1).padStart(4,'0'),receipt_date:new Date().toISOString().slice(0,10),payment_method:'cash',amount:''});setRcPop('new')}} style={{height:36,padding:'0 16px',borderRadius:8,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.1)',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer'}}>+ {T('سند قبض','Receipt')}</button>
</div>
{receipts.map(r=>{
return<div key={r.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderRadius:10,background:r.is_linked?'rgba(39,160,70,.03)':'rgba(255,255,255,.02)',border:'1px solid '+(r.is_linked?'rgba(39,160,70,.08)':'rgba(255,255,255,.06)'),marginBottom:6}}>
<div style={{width:36,height:36,borderRadius:10,background:r.is_linked?C.ok+'12':C.gold+'12',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>{r.is_linked?'🔗':'📝'}</div>
<div style={{flex:1}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
<span style={{fontSize:12,fontWeight:700,color:C.gold}}>{r.receipt_number}</span>
<span style={{fontSize:11,fontWeight:700,color:'var(--tx)'}}>{nm(r.amount)} {T('ر.س','SAR')}</span>
{r.is_linked&&<span style={{fontSize:8,padding:'1px 6px',borderRadius:4,background:C.ok+'12',color:C.ok}}>{T('مربوط','Linked')}</span>}
</div>
<div style={{fontSize:10,color:'var(--tx5)'}}>{r.clients?.name_ar||r.client_name_manual||'—'} · {r.receipt_date} · {r.payment_method==='cash'?T('نقدي','Cash'):r.payment_method==='bank_transfer'?T('تحويل','Transfer'):T('شيك','Check')}</div>
{r.description&&<div style={{fontSize:9,color:'var(--tx4)',marginTop:2}}>{r.description}</div>}
</div>
{!r.is_linked&&<button onClick={async()=>{setLinkPop(r.id);const{data}=await sb.from('invoices').select('id,invoice_number,total_amount,remaining_amount,clients:client_id(name_ar)').is('deleted_at',null).gt('remaining_amount',0).order('issue_date',{ascending:false}).limit(20);setInvoices(data||[])}} style={{height:30,padding:'0 12px',borderRadius:6,border:'1px solid rgba(201,168,76,.2)',background:'rgba(201,168,76,.08)',color:C.gold,fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer'}}>{T('ربط','Link')}</button>}
</div>})}
</div>}

{/* ═══ BATCHES ═══ */}
{tab==='batches'&&<div>
{batches.map(b=>{const sc=stClr[b.status]||'#888'
return<div key={b.id} style={{padding:'14px 16px',borderRadius:12,background:b.status==='rolled_back'?'rgba(192,57,43,.03)':'rgba(255,255,255,.02)',border:'1px solid var(--bd)',marginBottom:8}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
<div style={{display:'flex',alignItems:'center',gap:8}}>
<span style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>{b.batch_name}</span>
<span style={{fontSize:9,padding:'2px 8px',borderRadius:5,background:sc+'15',color:sc,fontWeight:600}}>{stLbl[b.status]}</span>
</div>
{b.status==='completed'&&<button onClick={()=>rollbackBatch(b.id)} style={{height:28,padding:'0 10px',borderRadius:6,border:'1px solid rgba(192,57,43,.2)',background:'rgba(192,57,43,.06)',color:C.red,fontFamily:F,fontSize:9,fontWeight:700,cursor:'pointer'}}>↩ {T('تراجع','Rollback')}</button>}
</div>
<div style={{fontSize:10,color:'var(--tx5)'}}>
{b.source_type==='excel'?'📊 ':' 📝 '}{b.total_invoices>0?b.total_invoices+' '+T('فاتورة','invoices')+' · ':''}{b.total_payments>0?b.total_payments+' '+T('دفعة','payments')+' · ':''}{nm(b.total_amount)} {T('ر.س','SAR')}
{b.imported_at&&<span> · {new Date(b.imported_at).toLocaleDateString('ar-SA',{month:'short',day:'numeric'})}</span>}
</div>
</div>})}
</div>}

</div>
</div>
{/* ═══ RECEIPT FORM POPUP ═══ */}
{rcPop&&<div onClick={()=>setRcPop(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.8)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(520px,96vw)',maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden',border:'1px solid var(--bd)'}}>
<div style={{height:3,background:`linear-gradient(90deg,transparent,${C.blue},transparent)`}}/>
<div style={{padding:'16px 22px',borderBottom:'1px solid var(--bd)',fontSize:14,fontWeight:800,color:'var(--tx)'}}>{rcPop==='new'?T('📝 إدخال سند قبض','📝 New Receipt'):T('تعديل سند','Edit Receipt')}</div>
<div style={{padding:'16px 22px',overflowY:'auto',display:'flex',flexDirection:'column',gap:10}}>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div><div style={{fontSize:10,color:'var(--tx4)',marginBottom:4}}>{T('رقم السند','Receipt #')} *</div><input value={rcForm.receipt_number||''} onChange={e=>setRcForm(p=>({...p,receipt_number:e.target.value}))} style={fS}/></div>
<div><div style={{fontSize:10,color:'var(--tx4)',marginBottom:4}}>{T('تاريخ السند','Receipt Date')} *</div><input type="date" value={rcForm.receipt_date||''} onChange={e=>setRcForm(p=>({...p,receipt_date:e.target.value}))} style={{...fS,direction:'ltr'}}/></div>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div><div style={{fontSize:10,color:'var(--tx4)',marginBottom:4}}>{T('العميل','Client')}</div><select value={rcForm.client_id||''} onChange={e=>setRcForm(p=>({...p,client_id:e.target.value}))} style={fS}><option value="">{T('— اختر أو اكتب يدوي —','— Select —')}</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name_ar}</option>)}</select></div>
<div><div style={{fontSize:10,color:'var(--tx4)',marginBottom:4}}>{T('المبلغ','Amount')} *</div><input type="number" value={rcForm.amount||''} onChange={e=>setRcForm(p=>({...p,amount:e.target.value}))} style={{...fS,direction:'ltr',textAlign:'center'}}/></div>
</div>
{!rcForm.client_id&&<div><div style={{fontSize:10,color:'var(--tx4)',marginBottom:4}}>{T('اسم العميل يدوي','Manual Client Name')}</div><input value={rcForm.client_name_manual||''} onChange={e=>setRcForm(p=>({...p,client_name_manual:e.target.value}))} style={fS}/></div>}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
<div><div style={{fontSize:10,color:'var(--tx4)',marginBottom:4}}>{T('طريقة الدفع','Payment')}</div><select value={rcForm.payment_method||'cash'} onChange={e=>setRcForm(p=>({...p,payment_method:e.target.value}))} style={fS}><option value="cash">{T('نقدي','Cash')}</option><option value="bank_transfer">{T('تحويل بنكي','Bank Transfer')}</option><option value="check">{T('شيك','Check')}</option></select></div>
<div><div style={{fontSize:10,color:'var(--tx4)',marginBottom:4}}>{T('الفرع','Branch')}</div><select value={rcForm.branch_id||''} onChange={e=>setRcForm(p=>({...p,branch_id:e.target.value}))} style={fS}><option value="">{T('— اختر —','—')}</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name_ar}</option>)}</select></div>
</div>
<div><div style={{fontSize:10,color:'var(--tx4)',marginBottom:4}}>{T('نوع الخدمة','Service Type')}</div><select value={rcForm.service_type||''} onChange={e=>setRcForm(p=>({...p,service_type:e.target.value}))} style={fS}><option value="">{T('— غير محدد —','—')}</option>{Object.entries(svcTypes).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
<div><div style={{fontSize:10,color:'var(--tx4)',marginBottom:4}}>{T('الوصف','Description')}</div><textarea value={rcForm.description||''} onChange={e=>setRcForm(p=>({...p,description:e.target.value}))} rows={2} style={{...fS,height:'auto',padding:12,resize:'vertical'}}/></div>
</div>
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',gap:8,justifyContent:'flex-end'}}>
<button onClick={()=>setRcPop(null)} style={{height:40,padding:'0 16px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:12,cursor:'pointer'}}>{T('إلغاء','Cancel')}</button>
<button onClick={saveReceipt} disabled={saving||!rcForm.amount||!rcForm.receipt_date} style={{height:40,padding:'0 24px',borderRadius:10,border:'none',background:C.blue,color:'#fff',fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer',opacity:saving?.6:1}}>{saving?'...':T('حفظ','Save')}</button>
{rcPop==='new'&&<button onClick={async()=>{await saveReceipt();setRcForm({receipt_number:'RC-'+String(totalReceipts+2).padStart(4,'0'),receipt_date:new Date().toISOString().slice(0,10),payment_method:'cash',amount:''});setRcPop('new')}} disabled={saving||!rcForm.amount} style={{height:40,padding:'0 20px',borderRadius:10,border:'none',background:C.ok,color:'#fff',fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer',opacity:saving?.6:1}}>{T('حفظ والتالي →','Save & Next →')}</button>}
</div>
</div></div>}

{/* ═══ LINK POPUP ═══ */}
{linkPop&&<div onClick={()=>setLinkPop(null)} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.8)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:'min(460px,96vw)',border:'1px solid var(--bd)',overflow:'hidden'}}>
<div style={{height:3,background:`linear-gradient(90deg,transparent,${C.gold},transparent)`}}/>
<div style={{padding:'16px 22px',borderBottom:'1px solid var(--bd)',fontSize:14,fontWeight:800,color:'var(--tx)'}}>🔗 {T('ربط سند القبض بفاتورة','Link Receipt to Invoice')}</div>
<div style={{padding:'16px 22px',maxHeight:300,overflowY:'auto'}}>
{invoices.length===0?<div style={{textAlign:'center',padding:20,color:'var(--tx5)'}}>{T('لا توجد فواتير غير مسددة','No unpaid invoices')}</div>:
invoices.map(inv=><div key={inv.id} onClick={()=>setLinkInvoice(inv.id)} style={{padding:'10px 12px',borderRadius:8,background:linkInvoice===inv.id?'rgba(201,168,76,.08)':'rgba(255,255,255,.02)',border:'1.5px solid '+(linkInvoice===inv.id?'rgba(201,168,76,.2)':'rgba(255,255,255,.06)'),marginBottom:4,cursor:'pointer',display:'flex',justifyContent:'space-between'}}>
<div><div style={{fontSize:11,fontWeight:700,color:C.gold}}>{inv.invoice_number}</div><div style={{fontSize:9,color:'var(--tx5)'}}>{inv.clients?.name_ar||'—'}</div></div>
<div style={{textAlign:'left'}}><div style={{fontSize:12,fontWeight:700,color:C.red}}>{nm(inv.remaining_amount)}</div><div style={{fontSize:8,color:'var(--tx5)'}}>{T('متبقي','remaining')}</div></div>
</div>)}
</div>
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'flex-end',gap:8}}>
<button onClick={()=>setLinkPop(null)} style={{height:38,padding:'0 16px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:12,cursor:'pointer'}}>{T('إلغاء','Cancel')}</button>
<button onClick={()=>linkReceipt(linkPop)} disabled={!linkInvoice} style={{height:38,padding:'0 20px',borderRadius:10,border:'none',background:C.gold,color:'#111',fontFamily:F,fontSize:12,fontWeight:700,cursor:'pointer',opacity:linkInvoice?1:.4}}>🔗 {T('ربط','Link')}</button>
</div>
</div></div>}
</div>}
