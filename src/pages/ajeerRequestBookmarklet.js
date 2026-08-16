/* ═══════════════════════════════════════════════════════════════════════════
   بوكماركت «رفع طلبات أجير» — زر لكل صف في جدول «رفع طلبات أجير»
   (تبويب «جداول العمل»).

   يبني رابطين لكل صف:
     · buildAjeerContractBookmarklet(v) → إصدار عقد جديد مع منشأة مستفيدة.
     · buildAjeerNoticeBookmarklet(v)   → إصدار تصريح لعامل على عقد ساري.

   السلسلة مُلتقَطة حيّاً من أجير (Laravel، نماذج POST عادية بـ_token — لا API):
     1) POST /contracts/create                       service=taqaul
     2) POST /contracts/create/taqaul                option=new | exist(+contract_id)
     3) POST /contracts/create/taqaul/beneficiary    labor_office · sequence_number
                                                     · unified_number  → يُنشئ المسوّدة
     4) POST /contracts/create/taqaul/{id}/information
            contract_description · estimated_cost · التواريخ
            · locations[0] = JSON {address,coordinates} · attachment (ملف إجباري)
     5) POST /contracts/create/taqaul/{id}/confirm
            locations[0] = «العنوان-الإحداثيات» (نص لا JSON!) + الإقرارَين
     6) POST /contracts/create/taqaul/{id}/notices   (مسار التصريح)
            notice_start_date · notice_end_date · locations[] = معرّف الموقع
            · laborers[<الإقامة>][id_number] = <الإقامة>

   رقم العقد المعروض = «26101» + المعرّف الداخلي (960997 → 26101960997).

   ⚠️ لا تضع تعليقات `//` داخل نص البوكماركت — يُصغَّر لسطر واحد فيبتلع ما بعده
   (نفس فخّ project_bookmarklet_minify_trap). التعليقات هنا خارج النص فقط.
   ═══════════════════════════════════════════════════════════════════════════ */

/* أدوات مشتركة تُحقن في أول كل بوكماركت (بلا تعليقات سطرية) */
const RUNTIME = `
var O='https://ajeer.qiwa.sa';
var esc=function(s){return String(s==null?'':s)};
var box=function(html){[].slice.call(document.querySelectorAll('[data-jisr-box]')).forEach(function(x){x.remove()});var d=document.createElement('div');d.setAttribute('data-jisr-box','1');d.style.cssText='position:fixed;z-index:2147483647;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;font-family:Cairo,Tajawal,sans-serif';var tb=(typeof TR!=='undefined'&&TR.length)?('<div style="margin-top:16px;padding-top:13px;border-top:1px solid #e8e8e8"><button data-jisr-tr style="font:inherit;font-size:13px;padding:7px 15px;border-radius:8px;border:0;background:#14213d;color:#fff;cursor:pointer">نسخ التتبّع الخام ('+TR.length+' طلب)</button> <span data-jisr-trmsg style="font-size:12px;opacity:.65"></span></div>'):'';
d.innerHTML='<div dir="rtl" style="background:#fff;color:#14213d;max-width:640px;width:94%;border-radius:14px;padding:22px 24px;box-shadow:0 18px 60px rgba(0,0,0,.35);font-size:15px;line-height:1.9">'+html+tb+'</div>';
var bt=d.querySelector('[data-jisr-tr]');
if(bt)bt.onclick=function(){var txt=TR.join('\\n\\n');var ms=d.querySelector('[data-jisr-trmsg]');
  var fb=function(){var ta=document.createElement('textarea');ta.value=txt;ta.setAttribute('dir','ltr');ta.style.cssText='width:100%;height:200px;margin-top:10px;font-family:monospace;font-size:11px;direction:ltr';bt.parentElement.appendChild(ta);ta.focus();ta.select();ms.textContent='انسخ يدوياً من الصندوق (Ctrl+A ثم Ctrl+C)'};
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(function(){ms.textContent='نُسخ '+txt.length+' حرف'},fb)}else{fb()}};
d.onclick=function(e){if(e.target===d)d.remove()};document.body.appendChild(d);return d};
var note=function(t){var d=document.createElement('div');d.style.cssText='position:fixed;z-index:2147483647;top:14px;left:50%;transform:translateX(-50%);background:#14213d;color:#fff;padding:9px 18px;border-radius:999px;font-family:Cairo,sans-serif;font-size:13px;box-shadow:0 6px 22px rgba(0,0,0,.3)';d.textContent=t;document.body.appendChild(d);return d};
var parse=function(t){return new DOMParser().parseFromString(t,'text/html')};
var tokOf=function(d){var m=d.querySelector('meta[name=csrf-token]');if(m&&m.content)return m.content;var i=d.querySelector('input[name=_token]');return i?i.value:''};
var deepMsg=function(o,dep){dep=dep||0;var out=[];if(o==null||dep>5)return out;
  if(typeof o==='string'){var v=o.trim();if(v.length>3&&/[\\u0600-\\u06FF]/.test(v))out.push(v);return out}
  if(Array.isArray(o)){o.forEach(function(x){out=out.concat(deepMsg(x,dep+1))});return out}
  if(typeof o==='object'){Object.keys(o).forEach(function(k){out=out.concat(deepMsg(o[k],dep+1))});return out}
  return out};
var uniq=function(a){var s=[];a.forEach(function(x){if(x&&s.indexOf(x)<0)s.push(x)});return s};
var errOf=function(d){
  var s=[];
  [].slice.call(d.querySelectorAll('.alert-danger,.alert--error,.alert.alert-error,[class*=alert][class*=danger],.invalid-feedback,.error__message,[class*=errorText],[class*=error__],span.error,li.error,.help-block,.text-danger,[role=alert]')).forEach(function(e){var t=e.innerText.replace(/\\s+/g,' ').trim();if(t)s.push(t)});
  if(!s.length){var b=((d.body?d.body.innerText:'')||'').replace(/\\s+/g,' ');
    var m=b.match(/(عفوا|عفواً|عذرا|عذراً|لا يمكن|غير مؤهل|غير مسجل|غير مرخص|يجب أن|يجب عليك|سبق|مرتبط بتصريح|لا يوجد|تعذر|تعذّر)[^.،]{0,170}/g);
    if(m)m.forEach(function(x){s.push(x.trim())})}
  var junk=/الأسئلة الشائعة|الاسئلة الشائعة|تسجيل الخروج|لوحة التحكم|إطلاق تجريبي|سياسة الخصوصية|جميع الحقوق/;
  s=s.map(function(x){return x.replace(junk,' ').replace(/\\s+/g,' ').trim()})
     .filter(function(x){return x.length>6});
  if(s.filter(function(x){return /حدث خطأ غير متوقع/.test(x)}).length)
    s=['أجير أعاد صفحة خطأ عامة («حدث خطأ غير متوقع») — رفض الطلب دون تحديد الحقل.'].concat(s.filter(function(x){return !/حدث خطأ غير متوقع/.test(x)}));
  return uniq(s).join('<br>').slice(0,460)};
var jsonErr=function(txt){var j=null;try{j=JSON.parse(txt)}catch(e){return ''}
  return uniq(deepMsg(j)).slice(0,4).join(' · ').slice(0,420)};
var who=function(d){var b=d.querySelector('#logOutDropdownButton');return b?b.innerText.replace(/\\s+/g,' ').trim().slice(0,60):'—'};
var fdShow=function(f){var a=[];f.forEach(function(v,k){if(k!=='_token')a.push(k+'='+(String(v).slice(0,26)||'(فارغ)'))});return a.join(' · ')};
var fail=function(step,s,f){
  var e=errOf(s.d);
  return '<b>فشل عند: '+step+'</b><br><br>'
    +(e?('<b>رد أجير:</b><br>'+e):'<b>أجير لم يُرجع أي رسالة.</b>')
    +'<br><br><small style="opacity:.7">الحساب: '+who(s.d)+'<br>توقف عند: '+s.u.replace(O,'')
    +(f?('<br>أُرسل: '+fdShow(f)):'')+'</small>';};
var svcGate=function(s,val,label){
  if(!/\\/contracts\\/create\\/?$/.test(s.u.replace(/[?#].*/,''))) return '';
  var rb=[].slice.call(s.d.querySelectorAll('input[name=service]')).filter(function(x){return x.value===val})[0];
  var lb=rb?(rb.closest('label')||rb.closest('.card')||rb.parentElement):null;
  var tx=lb?lb.innerText.replace(/\\s+/g,' ').trim():'';
  var mm=tx.match(/(عذرا|عذراً|عفوا|عفواً|لا يمكن|يجب عليك)[^.]{0,180}/);
  var why=mm?mm[0]:(errOf(s.d)||'');
  return '<b>أجير منع فتح خدمة «'+label+'»:</b><br>'+(why?why:'لم يتقدّم المعالج ولم يُرجع أجير رسالة.')
    +'<br><small style="opacity:.75">الحساب الحالي: '+who(s.d)+(rb&&rb.disabled?' — الخيار معطّل تماماً':'')+'. بدّل إلى حساب منشأة مؤهّلة ثم أعد المحاولة.</small>';};
var gate=function(d,u){if(/\\/profile\\/representatives/.test(u||'')||/يرجى تحديث قائمة المسؤولين/.test((d.body?d.body.innerText:'')||''))return 'المنشأة محجوبة ببوابة «تحديث قائمة المسؤولين» — حدّثها في أجير ثم أعد المحاولة.';return ''};
var TR=[];
var hdrs=function(h){var a=[];try{h.forEach(function(v,k){a.push(k+': '+v)})}catch(e){}return a.join('\\n')};
var bodyOf=function(fd){if(!fd)return '';var a=[];fd.forEach(function(v,k){a.push(k+'='+encodeURIComponent(v instanceof File?('[FILE '+v.name+' '+v.size+'b]'):String(v)))});return a.join('&')};
var rec=function(m,u,fd,r,t,ct){
  var s=String(t==null?'':t), cut=25000;
  TR.push('######## REQUEST #'+(TR.length+1)+' ########\\n'
    +m+' '+u.replace(O,'')+' HTTP/1.1\\nHost: ajeer.qiwa.sa\\n'
    +'Cookie: [HttpOnly — لا يمكن لجافاسكربت قراءتها؛ انسخها من DevTools إن لزم]\\n'
    +(fd?('Content-Type: '+(ct||'multipart/form-data')+'\\n'):'')
    +(ct==='application/json'?'X-Requested-With: XMLHttpRequest\\n':'')
    +'\\n'+bodyOf(fd)
    +'\\n\\n######## RESPONSE #'+(TR.length+1)+'  (final-url: '+r.url.replace(O,'')+') ########\\n'
    +'HTTP/1.1 '+r.status+' '+(r.statusText||'')+'\\n'+hdrs(r.headers)+'\\n\\n'
    +s.slice(0,cut)+(s.length>cut?('\\n[... قُصّ '+(s.length-cut)+' بايت]'):''));
};
var get=function(u){return fetch(u,{credentials:'include'}).then(function(r){return r.text().then(function(t){rec('GET',u,null,r,t);return{d:parse(t),u:r.url,ok:r.ok}})})};
var post=function(u,fd){return fetch(u,{method:'POST',credentials:'include',body:fd}).then(function(r){return r.text().then(function(t){rec('POST',u,fd,r,t);return{d:parse(t),u:r.url,ok:r.ok}})})};
var need=function(v,n){if(!String(v==null?'':v).trim())throw new Error('حقل ناقص في الصف: '+n);return String(v).trim()};
var findContract=async function(id){
  var f=await get(O+'/contracts'); var tk=tokOf(f.d); var hit=null;
  for(var p=0;p<3&&!hit;p++){
    var q=new FormData(); q.append('_token',tk);
    var r=await fetch(O+'/contracts/search?page='+p,{method:'POST',credentials:'include',body:q,headers:{'X-Requested-With':'XMLHttpRequest'}});
    if(!r.ok) return null;
    var j=null; try{j=await r.json()}catch(e){return null}
    var rows=(j&&j.data)||[];
    if(!rows.length) break;
    hit=rows.filter(function(x){return String(x.contract_number||'').indexOf(String(id))>=0||String(x.id||'')===String(id)})[0]||null;
  }
  return hit;
};
var blank=function(){var c=document.createElement('canvas');c.width=c.height=600;var x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,600,600);return new Promise(function(res){c.toBlob(function(b){res(new File([b],'contract.png',{type:'image/png'}))},'image/png')})};
`

/* المرحلتان الأوليان مشتركتان: اختيار الخدمة ثم نوع الطلب */
const STEP12 = `
var s0=await get(O+'/contracts/create');
var g=gate(s0.d,s0.u); if(g) throw new Error(g);
var t=tokOf(s0.d); if(!t) throw new Error('تعذّر قراءة رمز الجلسة — سجّل الدخول في أجير أولاً.');
var f1=new FormData(); f1.append('_token',t); f1.append('service','taqaul');
var s1=await post(O+'/contracts/create',f1);
var sg=svcGate(s1,'taqaul','تعاقد أجير'); if(sg) throw new Error(sg);
var t1=tokOf(s1.d); if(!t1) throw new Error(errOf(s1.d)||'فشلت الخطوة ١ (اختيار الخدمة).');
`

/* ── بوكماركت العقد ─────────────────────────────────────────────────────────
   v = { labor_office, sequence_number, unified_number, description,
         cost, start, end, address, coords, beneficiary }                     */
export function buildAjeerContractBookmarklet(v) {
  const P = JSON.stringify({
    lo: v.labor_office || '', sq: v.sequence_number || '', un: v.unified_number || '',
    ds: v.description || '', ct: v.cost || '', sd: v.start || '', ed: v.end || '',
    ad: v.address || '', co: v.coords || '', bn: v.beneficiary || '',
  })
  const code = `(async function(){
var P=${P};
${RUNTIME}
var _p2=sessionStorage.getItem('jisr_ajeer_cid');
if(_p2&&location.hostname==='ajeer.qiwa.sa'&&/\\/confirm/.test(location.pathname)){sessionStorage.removeItem('jisr_ajeer_cid');var n2=note('جارٍ تأكيد العقد…');try{var forms=[].slice.call(document.querySelectorAll('form'));var cf=forms.filter(function(x){return x.querySelector('[name=terms_agreement],[name=contract_disclaimer_agreement]')})[0]||forms.filter(function(x){return /post/i.test(x.method||'')&&!/logout/i.test(x.getAttribute('action')||'')})[0];if(!cf)throw new Error('لم يُعثر على نموذج التأكيد.');var c1=cf.querySelector('[name=contract_disclaimer_agreement]');var c2=cf.querySelector('[name=terms_agreement]');if(c1)c1.checked=true;if(c2)c2.checked=true;if(!c1){var hh=document.createElement('input');hh.type='hidden';hh.name='contract_disclaimer_agreement';hh.value='1';cf.appendChild(hh)}if(!c2){var hh2=document.createElement('input');hh2.type='hidden';hh2.name='terms_agreement';hh2.value='1';cf.appendChild(hh2)}n2.textContent='تم ✔ جارٍ الإرسال…';cf.submit()}catch(err){try{n2.remove()}catch(e){}box('<b style="color:#c0392b">تعذّر التأكيد</b><br>'+esc(err&&err.message?err.message:err))}return}
if(location.hostname!=='ajeer.qiwa.sa'){box('<b>افتح أجير أولاً</b><br>شغّل هذا الزر وأنت داخل <b>ajeer.qiwa.sa</b> بعد تسجيل الدخول.');return}
var n=note('جارٍ رفع طلب العقد…');
try{
${STEP12}
var f2=new FormData(); f2.append('_token',t1); f2.append('option','new');
var s2=await post(O+'/contracts/create/taqaul',f2);
var t2=tokOf(s2.d); if(!t2) throw new Error('فشلت الخطوة ٢ (نوع الطلب).');
var f3=new FormData(); f3.append('_token',t2);
f3.append('labor_office',need(P.lo,'مكتب العمل')); f3.append('sequence_number',need(P.sq,'الرقم التسلسلي')); f3.append('unified_number',need(P.un,'الرقم الموحّد'));
var s3=await post(O+'/contracts/create/taqaul/beneficiary',f3);
var e3=errOf(s3.d);
var id=(s3.u.match(/\\/taqaul\\/(\\d+)\\//)||[])[1];
if(!id) throw new Error(e3||'رُفض المستفيد — راجع مكتب العمل/التسلسلي/الموحّد أو أهلية المنشأة (النطاق).');
var t3=tokOf(s3.d);
var f4=new FormData(); f4.append('_token',t3);
f4.append('contract_description',need(P.ds,'نبذة عن العقد')); f4.append('estimated_cost',need(P.ct,'التكلفة التقديرية'));
f4.append('contract_start_date',need(P.sd,'بداية العقد')); f4.append('contract_end_date',need(P.ed,'نهاية العقد'));
f4.append('locations[0]',JSON.stringify({address:need(P.ad,'عنوان الموقع'),coordinates:need(P.co,'إحداثيات الموقع')}));
f4.append('attachment',await blank());
var s4=await post(O+'/contracts/create/taqaul/'+id+'/information',f4);
if(!/\\/confirm/.test(s4.u)) throw new Error(errOf(s4.d)||'فشلت خطوة بيانات العقد.');
var t4=tokOf(s4.d);
var cf=[].slice.call(s4.d.querySelectorAll('form')).filter(function(x){return x.querySelector('[name=terms_agreement]')})[0];
var f5=new FormData(); f5.append('_token',t4);
if(cf){[].slice.call(cf.querySelectorAll('input,select,textarea')).forEach(function(e){if(!e.name||e.name==='_token'||e.type==='submit'||e.type==='button'||e.type==='file')return;if(e.type==='radio'&&!e.checked)return;f5.append(e.name,e.type==='checkbox'?(e.value||'1'):e.value)})}
if(!f5.get('terms_agreement')){f5.set('contract_disclaimer_agreement','1');f5.set('terms_agreement','1')}
var s5=await post(O+'/contracts/create/taqaul/'+id+'/confirm',f5);
var no=(((s5.d.body?s5.d.body.innerText:'')||'').match(/رقم العقد هو\\s*(\\d+)/)||[])[1];
n.remove();
if(no){
  try{await navigator.clipboard.writeText(id)}catch(e){}
  box('<b style="color:#1e8449">تم إصدار العقد ✔</b><br>رقم العقد: <b style="font-family:monospace">'+esc(no)+'</b><br>المعرّف الداخلي: <b style="font-family:monospace">'+id+'</b> (نُسخ للحافظة) — الصقه في عمود «معرّف العقد» ليعمل زر التصريح.<br>المستفيد: '+esc(P.bn||P.un)+'<br><br>بانتظار قبول الطرف الثاني.');
}else{
  try{await navigator.clipboard.writeText(id)}catch(e){}
  sessionStorage.setItem('jisr_ajeer_cid',JSON.stringify({id:id,bn:P.bn||P.un}));
  box('<b style="color:#b9770e">خطوات 1-4 تمت — التأكيد يحتاج ضغطة يدوية</b><br>المعرّف: <b style="font-family:monospace">'+id+'</b> (نُسخ)<br><small style="opacity:.75">'+esc(errOf(s5.d)||'أجير لم يُظهر بانر الإصدار')+'</small><br><br><b>أكمل هكذا:</b><br>1. اضغط <a href="'+O+'/contracts/create/taqaul/'+id+'/confirm" style="color:#2471a3;font-weight:600">هنا لفتح صفحة التأكيد</a><br>2. اضغط زر «⚑ عقد» مرة ثانية على صفحة التأكيد');
}
}catch(err){ try{n.remove()}catch(e){} box('<b style="color:#c0392b">تعذّر رفع العقد</b><br>'+esc(err&&err.message?err.message:err)); }
})()`
  return 'javascript:' + encodeURIComponent(code.replace(/\n/g, ' '))
}

/* ── بوكماركت الإعارة (التعاقد بين المنشآت — tempwork) ──────────────────────
   مسار مستقل عن تعاقد أجير: بلا خطوة option، وبلا مواقع/مرفق/تكلفة، والعامل
   يُختار داخل نفس المعالج فيصدر العقد والتصريح معاً.
     1) POST /contracts/create                          service=tempwork
     2) POST /contracts/create/tempwork/beneficiary     labor_office · sequence
                                                        · unified → يُنشئ {id}
     3) POST /contracts/create/tempwork/{id}/type       notice_type (2=إعارة أجير)
     4) POST /contracts/create/tempwork/{id}/information
            contract_description (للقراءة فقط، يُقرأ من الصفحة)
            · contract_start_date · contract_duration (1..6) · use_unified_contract
     5) POST /contracts/create/tempwork/{id}/laborers   laborers[<الإقامة>][id_number]
     6) POST /contracts/create/tempwork/{id}/confirm    ثلاثة إقرارات، بلا locations
   رقم العقد المعروض = «26201» + المعرّف — ويُقرأ من بانر النجاح مباشرةً.
   v = { labor_office, sequence_number, unified_number, notice_type,
         start, duration, iqama, worker, beneficiary }                        */
export function buildAjeerSecondmentBookmarklet(v) {
  const P = JSON.stringify({
    lo: v.labor_office || '', sq: v.sequence_number || '', un: v.unified_number || '',
    nt: String(v.notice_type || '2').replace(/\D/g, '') || '2',
    sd: v.start || '', du: String(v.duration || '3').replace(/\D/g, '') || '3',
    iq: v.iqama || '', wn: v.worker || '', bn: v.beneficiary || '',
  })
  const code = `(async function(){
var P=${P};
${RUNTIME}
if(location.hostname!=='ajeer.qiwa.sa'){box('<b>افتح أجير أولاً</b><br>شغّل هذا الزر وأنت داخل <b>ajeer.qiwa.sa</b> بعد تسجيل الدخول.');return}
var n=note('جارٍ رفع طلب الإعارة…');
try{
var iq=need(P.iq,'رقم الإقامة');
var s0=await get(O+'/contracts/create');
var g=gate(s0.d,s0.u); if(g) throw new Error(g);
var t=tokOf(s0.d); if(!t) throw new Error('تعذّر قراءة رمز الجلسة — سجّل الدخول في أجير أولاً.');
var f1=new FormData(); f1.append('_token',t); f1.append('service','tempwork');
var s1=await post(O+'/contracts/create',f1);
var sg=svcGate(s1,'tempwork','التعاقد بين المنشآت'); if(sg) throw new Error(sg);
var t1=tokOf(s1.d); if(!t1) throw new Error(errOf(s1.d)||'فشلت الخطوة ١ (اختيار الخدمة).');
var f2=new FormData(); f2.append('_token',t1);
f2.append('labor_office',need(P.lo,'مكتب العمل')); f2.append('sequence_number',need(P.sq,'الرقم التسلسلي')); f2.append('unified_number',need(P.un,'الرقم الموحّد'));
var s2=await post(O+'/contracts/create/tempwork/beneficiary',f2);
var id=(s2.u.match(/\\/tempwork\\/(\\d+)\\//)||[])[1];
if(!id) throw new Error(fail('خطوة ٢ — المنشأة المستفيدة',s2,f2));
var t2=tokOf(s2.d);
var f3=new FormData(); f3.append('_token',t2); f3.append('notice_type',P.nt);
var s3=await post(O+'/contracts/create/tempwork/'+id+'/type',f3);
if(!/\\/information/.test(s3.u)) throw new Error(fail('خطوة ٣ — نوع التصريح',s3,f3));
var t3=tokOf(s3.d);
var dsc=s3.d.querySelector('[name=contract_description]');
var f4=new FormData(); f4.append('_token',t3);
f4.append('contract_description',dsc&&dsc.value?dsc.value:'إعارة أجير');
f4.append('contract_start_date',need(P.sd,'تاريخ بداية العقد'));
f4.append('contract_duration',P.du);
f4.append('use_unified_contract','1');
var s4=await post(O+'/contracts/create/tempwork/'+id+'/information',f4);
if(!/\\/laborers/.test(s4.u)) throw new Error(fail('خطوة ٤ — بيانات العقد',s4,f4));
var t4=tokOf(s4.d);
var jm='';
try{
  var jr=await fetch(O+'/contracts/tempwork/add/laborer/'+id,{method:'POST',credentials:'include',
    headers:{'Content-Type':'application/json','X-Requested-With':'XMLHttpRequest','X-CSRF-TOKEN':t4},
    body:JSON.stringify({id_number:iq,_token:t4,count:1,foreigners:0,notice_type_id:P.nt,contract_start_date:P.sd+' 00:00:00'})});
  var jt=await jr.text();
  var jfd=new FormData(); jfd.append('id_number',iq); jfd.append('count','1'); jfd.append('foreigners','0'); jfd.append('notice_type_id',P.nt); jfd.append('contract_start_date',P.sd+' 00:00:00');
  rec('POST',O+'/contracts/tempwork/add/laborer/'+id,jfd,jr,jt,'application/json');
  jm=jsonErr(jt);
  if(!jm&&!jr.ok) jm='رمز الاستجابة '+jr.status+' — '+String(jt).replace(/<[^>]*>/g,' ').replace(/\\s+/g,' ').trim().slice(0,200);
}catch(e){}
var f5=new FormData(); f5.append('_token',t4); f5.append('laborers['+iq+'][id_number]',iq);
var s5=await post(O+'/contracts/create/tempwork/'+id+'/laborers',f5);
if(!/\\/confirm/.test(s5.u)) throw new Error(fail('خطوة ٥ — اختيار العامل',s5,f5)+(jm?('<br><small style="opacity:.7">رد فحص العامل: '+jm+'</small>'):''));
var t5=tokOf(s5.d);
var cf=[].slice.call(s5.d.querySelectorAll('form')).filter(function(x){return x.querySelector('[name=terms_agreement]')})[0];
var f6=new FormData(); f6.append('_token',t5);
if(cf){[].slice.call(cf.querySelectorAll('input[type=checkbox]')).forEach(function(e){if(e.name)f6.append(e.name,e.value||'1')})}
if(!f6.get('terms_agreement')){f6.set('unified_contract_items_agreement','1');f6.set('contract_disclaimer_agreement','1');f6.set('terms_agreement','1')}
var s6=await post(O+'/contracts/create/tempwork/'+id+'/confirm',f6);
var no=(((s6.d.body?s6.d.body.innerText:'')||'').match(/رقم العقد هو\\s*(\\d+)/)||[])[1];
if(!no) throw new Error(fail('خطوة ٦ — التأكيد',s6,f6)+'<br><small style="opacity:.7">المسوّدة '+id+' ما زالت معلّقة — أكملها من «إصدار عقد».</small>');
n.remove();
try{await navigator.clipboard.writeText(no)}catch(e){}
box('<b style="color:#1e8449">تم إصدار عقد الإعارة ✔</b><br>رقم العقد: <b style="font-family:monospace">'+esc(no)+'</b> (نُسخ للحافظة)<br>المعرّف الداخلي: <b style="font-family:monospace">'+id+'</b><br>المنشأة المستفيدة: '+esc(P.bn||P.un)+'<br>العامل: '+esc(P.wn||iq)+' — <b style="font-family:monospace">'+iq+'</b><br>المدة: '+esc(P.du)+' أشهر من '+esc(P.sd)+'<br><br>بانتظار قبول المنشأة المستفيدة.');
}catch(err){ try{n.remove()}catch(e){} box('<b style="color:#c0392b">تعذّر رفع طلب الإعارة</b><br>'+esc(err&&err.message?err.message:err)); }
})()`
  return 'javascript:' + encodeURIComponent(code.replace(/\n/g, ' '))
}

/* ── بوكماركت التتبّع الخام ─────────────────────────────────────────────────
   يشغّل أول خطوات المعالج فقط ويعرض REQUEST/RESPONSE خاماً بزرّ نسخ — للتوثيق
   والتشخيص بأسلوب Burp. مستويان:
     depth='service' → GET /contracts/create ثم POST service=<svc>. **لا يُنشئ
                       مسوّدة** — مجرد تنقّل في المعالج.
     depth='draft'   → يكمل حتى POST .../beneficiary، وهي الخطوة التي **تُنشئ
                       المسوّدة** وتُرجع معرّفها في المسار. يقف بعدها مباشرةً
                       فلا يرفع عقداً ولا يؤكّد شيئاً.
   ما لا تراه جافاسكربت: ترويسة Cookie (HttpOnly) وما يضيفه المتصفح تلقائياً
   (User-Agent, Sec-*, حدّ multipart) — تُنسخ من DevTools إن لزمت.
   v = { service, depth, labor_office, sequence_number, unified_number }      */
export function buildAjeerTraceBookmarklet(v) {
  const SV = v.service === 'tempwork' ? 'tempwork' : 'taqaul'
  const DEEP = v.depth === 'draft'
  const P = JSON.stringify({
    lo: v.labor_office || '', sq: v.sequence_number || '', un: v.unified_number || '',
  })
  const code = `(async function(){
var P=${P};
${RUNTIME}
if(location.hostname!=='ajeer.qiwa.sa'){box('<b>افتح أجير أولاً</b><br>شغّل هذا الزر وأنت داخل <b>ajeer.qiwa.sa</b> بعد تسجيل الدخول.');return}
var n=note('جارٍ التقاط التتبّع…');
try{
var s0=await get(O+'/contracts/create');
var g=gate(s0.d,s0.u); if(g) throw new Error(g);
var t=tokOf(s0.d); if(!t) throw new Error('تعذّر قراءة رمز الجلسة — سجّل الدخول في أجير أولاً.');
var f1=new FormData(); f1.append('_token',t); f1.append('service','${SV}');
var s1=await post(O+'/contracts/create',f1);
var sg=svcGate(s1,'${SV}','${SV === 'tempwork' ? 'التعاقد بين المنشآت' : 'تعاقد أجير'}');
var id='', last=s1;
${DEEP ? `
if(sg) throw new Error(sg);
${SV === 'taqaul' ? `
var t1=tokOf(s1.d);
var f2=new FormData(); f2.append('_token',t1); f2.append('option','new');
var s2=await post(O+'/contracts/create/taqaul',f2);
var tb=tokOf(s2.d);
var f3=new FormData(); f3.append('_token',tb);
f3.append('labor_office',need(P.lo,'مكتب العمل')); f3.append('sequence_number',need(P.sq,'الرقم التسلسلي')); f3.append('unified_number',need(P.un,'الرقم الموحّد'));
var s3=await post(O+'/contracts/create/taqaul/beneficiary',f3); last=s3;
id=(s3.u.match(/\\\\/taqaul\\\\/(\\\\d+)\\\\//)||[])[1]||'';
` : `
var tb=tokOf(s1.d);
var f3=new FormData(); f3.append('_token',tb);
f3.append('labor_office',need(P.lo,'مكتب العمل')); f3.append('sequence_number',need(P.sq,'الرقم التسلسلي')); f3.append('unified_number',need(P.un,'الرقم الموحّد'));
var s3=await post(O+'/contracts/create/tempwork/beneficiary',f3); last=s3;
id=(s3.u.match(/\\\\/tempwork\\\\/(\\\\d+)\\\\//)||[])[1]||'';
`}` : ''}
n.remove();
var er=errOf(last.d);
box('<b>التتبّع جاهز — ${DEEP ? 'حتى إنشاء المسوّدة' : 'بلا إنشاء مسوّدة'}</b>'
 +'<br><small style="opacity:.75">الحساب: '+who(s0.d)+' · الخدمة: ${SV}</small>'
 +'<br><br>عدد الطلبات المسجّلة: <b>'+TR.length+'</b>'
 +'<br>آخر مسار: <span style="font-family:monospace">'+esc(last.u.replace(O,''))+'</span>'
 ${DEEP ? `+(id?('<br>معرّف المسوّدة المُنشأة: <b style="font-family:monospace">'+id+'</b>'):'<br><b style="color:#c0392b">لم تُنشأ مسوّدة</b>')` : `+(sg?'<br><b style="color:#c0392b">الخدمة محجوبة لهذا الحساب</b>':'')`}
 +(er?('<br><br><b>رسالة أجير:</b><br>'+er):'')
 +'<br><br><small style="opacity:.7">الترويسات التي لا تراها جافاسكربت (Cookie, User-Agent, Sec-*) اقرأها من DevTools ← Network.</small>');
}catch(err){ try{n.remove()}catch(e){} box('<b style="color:#c0392b">توقف التتبّع</b><br>'+esc(err&&err.message?err.message:err)); }
})()`
  return 'javascript:' + encodeURIComponent(code.replace(/\n/g, ' '))
}

/* ── بوكماركت فحص الأهلية عبر كل المنشآت ────────────────────────────────────
   أهلية أجير تختلف من منشأة لأخرى (النطاق، بوابة المسؤولين، اشتراك الخدمة)،
   فالفشل غالباً «الحساب المفتوح غير مؤهّل» لا خطأ في بيانات الصف. هذا الزر
   يقرأ حسابات المستخدم من صفحة الاختيار، يبدّل السياق لكل واحد، ويقرأ سبب
   المنع من ليبل الخدمة — فيقول أيّ منشأة تقدر ترفع الطلب فعلاً.
   ⚠️ يجب تشغيله من /auth/qiwa/login — القائمة تُرسم بالعميل ولا تُقرأ بالجلب. */
export function buildAjeerEligibilityScanBookmarklet(service) {
  const SV = service === 'taqaul' ? 'taqaul' : 'tempwork'
  const LB = SV === 'taqaul' ? 'تعاقد أجير' : 'التعاقد بين المنشآت'
  const code = `(async function(){
${RUNTIME}
if(location.hostname!=='ajeer.qiwa.sa'){box('<b>افتح أجير أولاً</b><br>شغّل هذا الزر داخل <b>ajeer.qiwa.sa</b>.');return}
var accs=[].slice.call(document.querySelectorAll('li.registration__account[data-number]'));
if(!accs.length){box('<b>شغّل هذا الزر من صفحة اختيار الحساب</b><br><br>افتح <a href="'+O+'/auth/qiwa/login" style="color:#2471a3;font-weight:600">صفحة اختيار الحساب</a> ثم اضغط الزر مرة أخرى.<br><small style="opacity:.75">قائمة المنشآت تُرسم بالعميل، فلا يمكن قراءتها من صفحة أخرى.</small>');return}
var list=accs.map(function(li){var e=li.querySelector('.registration__accountText');
  return {n:li.getAttribute('data-number'),t:li.getAttribute('data-type')||'establishment',nm:e?e.innerText.replace(/\\s+/g,' ').trim().slice(0,42):li.getAttribute('data-number')}});
var n=note('جارٍ فحص '+list.length+' منشأة…');
var rows=[];
try{
for(var i=0;i<list.length;i++){
  var a=list[i]; var ok=false, why='';
  n.textContent='فحص '+(i+1)+'/'+list.length+' — '+a.nm;
  try{
    var cur=await get(O+'/contracts/create');
    var fd=new FormData(); fd.append('_token',tokOf(cur.d));
    fd.append('number',a.n); fd.append('type',a.t); fd.append('page','/contracts/create');
    await post(O+'/auth/login',fd);
    var pg=await get(O+'/contracts/create');
    var g=gate(pg.d,pg.u);
    if(g){why='محجوبة ببوابة «تحديث قائمة المسؤولين»'}
    else{
      var rb=[].slice.call(pg.d.querySelectorAll('input[name=service]')).filter(function(x){return x.value==='${SV}'})[0];
      if(!rb){why='الخدمة لا تظهر لهذا الحساب'}
      else{
        var lb=rb.closest('label')||rb.closest('.card')||rb.parentElement;
        var tx=lb?lb.innerText.replace(/\\s+/g,' ').trim():'';
        var mm=tx.match(/(عذرا|عذراً|عفوا|عفواً|لا يمكن|يجب عليك)[^.]{0,140}/);
        if(mm){why=mm[0]} else if(rb.disabled){why='الخيار معطّل بلا رسالة'} else {ok=true}
      }
    }
  }catch(e){why='تعذّر الفحص — '+(e&&e.message?e.message:e)}
  rows.push({nm:a.nm,num:a.n,ok:ok,why:why});
}
n.remove();
var good=rows.filter(function(r){return r.ok});
box('<b>أهلية «${LB}»</b> — <b style="color:'+(good.length?'#1e8449':'#c0392b')+'">'+good.length+' مؤهّلة</b> من '+rows.length+
  '<div style="max-height:46vh;overflow:auto;margin-top:12px">'+
  rows.map(function(r){return '<div style="padding:7px 0;border-top:1px solid #eee">'+
    (r.ok?'<span style="color:#1e8449">✔</span> ':'<span style="color:#c0392b">✕</span> ')+esc(r.nm)+
    ' <span style="font-family:monospace;opacity:.6;font-size:13px">'+esc(r.num)+'</span>'+
    (r.ok?'':'<div style="opacity:.72;font-size:13px;padding-right:20px">'+esc(r.why)+'</div>')+'</div>'}).join('')+
  '</div><small style="opacity:.75;display:block;margin-top:10px">السياق النشط الآن هو آخر منشأة فُحصت — ارجع لصفحة الاختيار وادخل بالمنشأة المؤهّلة قبل تشغيل زر الطلب.</small>');
}catch(err){try{n.remove()}catch(e){} box('<b style="color:#c0392b">تعذّر الفحص</b><br>'+esc(err&&err.message?err.message:err))}
})()`
  return 'javascript:' + encodeURIComponent(code.replace(/\n/g, ' '))
}

/* ── بوكماركت فاتورة الإعارة ────────────────────────────────────────────────
   بعد قبول المنشأة المستفيدة للعقد، الإعارة لا تحتاج تصريحاً منفصلاً — تُصدَر
   فاتورتها مباشرةً. صفحة /payments/create تسرد التصاريح المستحقّة، كل صف
   `li.tableList__item` يحوي رقم الهوية ومربّعاً بمعرّف التصريح `tempwork[]`؛
   فنلتقط معرّف صف العامل برقم إقامته ثم:
     POST /payments/store   laborers=all · tempwork[]=<معرّف التصريح>
   النتيجة بانر «تم إصدار الفاتورة بنجاح، رقم الفاتورة هو N بمبلغ إجمالي M ريال»
   (تُسدَّد عبر سداد — رقم المفوتر 199 شركة تكامل).
   v = { iqama, worker }                                                      */
export function buildAjeerSecondmentInvoiceBookmarklet(v) {
  const P = JSON.stringify({ iq: v.iqama || '', wn: v.worker || '' })
  const code = `(async function(){
var P=${P};
${RUNTIME}
if(location.hostname!=='ajeer.qiwa.sa'){box('<b>افتح أجير أولاً</b><br>شغّل هذا الزر وأنت داخل <b>ajeer.qiwa.sa</b> بعد تسجيل الدخول.');return}
var n=note('جارٍ إصدار الفاتورة…');
try{
var iq=need(P.iq,'رقم الإقامة');
var s0=await get(O+'/payments/create');
var g=gate(s0.d,s0.u); if(g) throw new Error(g);
var t=tokOf(s0.d); if(!t) throw new Error('تعذّر قراءة رمز الجلسة — سجّل الدخول في أجير أولاً.');
var cbs=[].slice.call(s0.d.querySelectorAll('input[name="tempwork[]"]'));
if(!cbs.length) throw new Error('لا توجد تصاريح مستحقّة للفوترة في هذا الحساب — تأكّد أن المنشأة المستفيدة قبلت العقد، وأنك داخل حساب المنشأة المُعيرة.');
var mine=cbs.filter(function(c){var li=c.closest('li')||c.parentElement;return li&&li.innerText.indexOf(iq)>=0})[0];
if(!mine){
  var av=cbs.map(function(c){var li=c.closest('li')||c.parentElement;var m=(li?li.innerText:'').match(/\\d{10}/);return m?m[0]:'?'});
  throw new Error('لم يُعثر على تصريح للإقامة '+iq+' في قائمة الفوترة.<br><small style="opacity:.75">المتاح الآن: '+esc(av.join(' · '))+'</small>');
}
var li=mine.closest('li')||mine.parentElement;
var amt=((li?li.innerText:'').match(/(\\d[\\d,]*)\\s*ريال/)||[])[1]||'';
var f1=new FormData(); f1.append('_token',t); f1.append('laborers','all'); f1.append('tempwork[]',mine.value);
var s1=await post(O+'/payments/store',f1);
var txt=(s1.d.body?s1.d.body.innerText:'')||'';
var no=(txt.match(/رقم الفاتورة هو\\s*(\\d+)/)||[])[1];
if(!no) throw new Error(errOf(s1.d)||'لم يظهر تأكيد الإصدار — راجع «المدفوعات» في أجير للتحقق.');
var tot=(txt.match(/بمبلغ إجمالي\\s*([\\d,]+)/)||[])[1]||amt;
n.remove();
try{await navigator.clipboard.writeText(no)}catch(e){}
box('<b style="color:#1e8449">تم إصدار الفاتورة ✔</b><br>رقم الفاتورة: <b style="font-family:monospace">'+esc(no)+'</b> (نُسخ للحافظة)<br>المبلغ الإجمالي: <b>'+esc(tot)+' ريال</b> (شامل الضريبة)<br>العامل: '+esc(P.wn||iq)+' — <b style="font-family:monospace">'+iq+'</b><br><br>تُسدَّد عبر <b>سداد</b> — رقم المفوتر <b style="font-family:monospace">199</b> (شركة تكامل لخدمات الأعمال).');
}catch(err){ try{n.remove()}catch(e){} box('<b style="color:#c0392b">تعذّر إصدار الفاتورة</b><br>'+esc(err&&err.message?err.message:err)); }
})()`
  return 'javascript:' + encodeURIComponent(code.replace(/\n/g, ' '))
}

/* ── بوكماركت التصريح ───────────────────────────────────────────────────────
   v = { contract_id, iqama, notice_start, notice_end, worker }               */
export function buildAjeerNoticeBookmarklet(v) {
  const P = JSON.stringify({
    ci: String(v.contract_id || '').replace(/^26101/, ''), iq: v.iqama || '',
    sd: v.notice_start || '', ed: v.notice_end || '', wn: v.worker || '',
  })
  const code = `(async function(){
var P=${P};
${RUNTIME}
if(location.hostname!=='ajeer.qiwa.sa'){box('<b>افتح أجير أولاً</b><br>شغّل هذا الزر وأنت داخل <b>ajeer.qiwa.sa</b> بعد تسجيل الدخول.');return}
var n=note('جارٍ رفع طلب التصريح…');
try{
var ci=need(P.ci,'معرّف العقد'); var iq=need(P.iq,'رقم الإقامة');
${STEP12}
var f2=new FormData(); f2.append('_token',t1); f2.append('option','exist'); f2.append('contract_id',ci);
var s2=await post(O+'/contracts/create/taqaul',f2);
var wiz=(s2.u.match(/\\/contracts\\/create\\/taqaul\\/(\\d+)\\/notices/)||[])[1];
if(!wiz){
  var av=[].slice.call(s2.d.querySelectorAll('input[name=contract_id]')).map(function(i){return i.value});
  throw new Error((errOf(s2.d)||'العقد غير متاح لإصدار التصاريح.')+' — تأكد أن حالته «عقد مبرم» وأنك داخل حساب المنشأة صاحبته.'+(av.length?' العقود المتاحة في هذا الحساب: '+av.map(function(x){return '26101'+x}).join(' · '):' لا يوجد أي عقد قابل للتصاريح في هذا الحساب.'));
}
var t2=tokOf(s2.d);
var lin=s2.d.querySelectorAll('input[name="locations[]"]');
if(!lin.length) lin=s2.d.querySelectorAll('input[name^=locations]');
var locs=[].slice.call(lin).map(function(i){return i.value}).filter(function(v){return v});
if(!locs.length) throw new Error('العقد 26101'+wiz+' بلا مواقع عمل متاحة — غالباً لأنه ما زال «بانتظار قبول الطرف الثاني»، فمواقع العمل لا تُفعَّل إلا بعد القبول. تأكّد من حالته في «العقود»: إن كان «عقد مبرم» فالمشكلة أن العقد بلا موقع مسجّل، وإلا فانتظر القبول ثم أعد المحاولة.');
var f3=new FormData(); f3.append('_token',t2);
f3.append('notice_start_date',need(P.sd,'بداية التصريح')); f3.append('notice_end_date',need(P.ed,'نهاية التصريح'));
locs.forEach(function(l){f3.append('locations[]',l)});
f3.append('laborers['+iq+'][id_number]',iq);
var s3=await post(O+'/contracts/create/taqaul/'+wiz+'/notices',f3);
var e3=errOf(s3.d);
if(/create\\/taqaul\\/\\d+\\/notices/.test(s3.u)) throw new Error(e3||'لم يُقبل الطلب — تحقّق من رقم الإقامة (لا بد أن يكون على كفالتك ومؤهّلاً وغير مرتبط بتصريح ساري).');
if(e3) throw new Error(e3);
n.remove();
box('<b style="color:#1e8449">تم رفع التصريح ✔</b><br>العامل: '+esc(P.wn||iq)+' — <b style="font-family:monospace">'+iq+'</b><br>العقد: <b style="font-family:monospace">26101'+wiz+'</b><br>المدة: '+esc(P.sd)+' ← '+esc(P.ed)+'<br>مواقع: '+locs.length+'<br><br>راجع «التصاريح» للتأكد من الحالة.');
}catch(err){ try{n.remove()}catch(e){} box('<b style="color:#c0392b">تعذّر رفع التصريح</b><br>'+esc(err&&err.message?err.message:err)); }
})()`
  return 'javascript:' + encodeURIComponent(code.replace(/\n/g, ' '))
}
