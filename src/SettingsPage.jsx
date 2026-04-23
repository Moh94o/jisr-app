import React,{useState,useEffect,useCallback} from 'react'
const F="'Cairo',sans-serif"
const C={dk:'#171717',fm:'#1e1e1e',gold:'#D4A017',red:'#c0392b',blue:'#3483b4',ok:'#27a046'}

// ═══ Components OUTSIDE main function (prevents re-creation) ═══
const fS={width:'100%',height:42,padding:'0 14px',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,fontFamily:F,fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',background:'rgba(255,255,255,.07)',textAlign:'center'}
const bS={height:36,padding:'0 16px',borderRadius:8,border:'1px solid rgba(212,160,23,.2)',background:'rgba(212,160,23,.12)',color:C.gold,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5}

const ArrowIcon=({isOpen})=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{transition:'.2s',transform:isOpen?'rotate(90deg)':'none',opacity:.7,flexShrink:0}}><polyline points="9 18 15 12 9 6"/></svg>

const EditIcon=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>

const DelIcon=()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>

const EditBtn=({onClick})=><button onClick={e=>{e.stopPropagation();onClick()}} className="jisr-icon-btn jisr-edit-btn" title="تعديل" style={{width:32,height:32,borderRadius:9,border:'1px solid rgba(212,160,23,.22)',background:'linear-gradient(145deg, rgba(212,160,23,.14), rgba(212,160,23,.06))',color:C.gold,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'.18s',flexShrink:0}}><EditIcon/></button>

const DelBtn=({onClick})=><button onClick={e=>{e.stopPropagation();onClick()}} className="jisr-icon-btn jisr-del-btn" title="حذف" style={{width:32,height:32,borderRadius:9,border:'1px solid rgba(192,57,43,.22)',background:'linear-gradient(145deg, rgba(192,57,43,.14), rgba(192,57,43,.05))',color:C.red,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'.18s',flexShrink:0}}><DelIcon/></button>

const CopyIcon=()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>

const CopyBtn=({text,toast,isAr})=><button type="button" onClick={e=>{e.stopPropagation();e.preventDefault();if(!text)return;try{navigator.clipboard.writeText(String(text));toast&&toast(isAr?'تم النسخ':'Copied')}catch{toast&&toast(isAr?'تعذر النسخ':'Copy failed')}}} className="jisr-copy-btn" title={isAr?'نسخ':'Copy'} style={{width:20,height:20,borderRadius:5,border:'none',background:'transparent',color:'rgba(255,255,255,.35)',cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',padding:0,flexShrink:0,transition:'.15s'}}><CopyIcon/></button>

const BadgeStatus=({v,isAr})=><span style={{fontSize:10,fontWeight:600,padding:'3px 8px',borderRadius:6,background:v?'rgba(39,160,70,.1)':'rgba(255,255,255,.05)',color:v?C.ok:'rgba(255,255,255,.3)'}}>{v?(isAr?'نشطة':'Active'):(isAr?'معطّلة':'Inactive')}</span>

const MetaText=({t})=><span style={{fontSize:10,color:'var(--tx5)',direction:'ltr'}}>{t}</span>

// ═══ Delete Confirmation Popup ═══
function DeletePopup({isAr,onConfirm,onCancel,itemName}){
return<div onClick={onCancel} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.8)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1001,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:420,overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.5)',border:'1px solid rgba(192,57,43,.15)'}}>
<div style={{height:3,background:'linear-gradient(90deg,transparent,'+C.red+' 30%,#e74c3c 50%,'+C.red+' 70%,transparent)'}}/>
<div style={{padding:'28px 24px',textAlign:'center'}}>
<div style={{width:56,height:56,borderRadius:'50%',background:'rgba(192,57,43,.08)',border:'2px solid rgba(192,57,43,.15)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
</div>
<div style={{fontSize:16,fontWeight:700,color:C.red,marginBottom:8}}>{isAr?'تأكيد الحذف':'Confirm Delete'}</div>
<div style={{fontSize:13,color:'var(--tx3)',lineHeight:1.8,marginBottom:4}}>{isAr?'هل أنت متأكد من حذف':'Are you sure you want to delete'}</div>
{itemName&&<div style={{fontSize:14,fontWeight:700,color:'var(--tx2)',marginBottom:4}}>"{itemName}"</div>}
<div style={{fontSize:11,color:'var(--tx5)',marginBottom:20}}>{isAr?'هذا الإجراء لا يمكن التراجع عنه':'This action cannot be undone'}</div>
<div style={{display:'flex',gap:10,justifyContent:'center'}}>
<button onClick={onConfirm} style={{height:42,padding:'0 24px',borderRadius:10,border:'none',background:C.red,color:'#fff',fontFamily:F,fontSize:13,fontWeight:700,cursor:'pointer',flex:1}}>{isAr?'نعم، احذف':'Yes, Delete'}</button>
<button onClick={onCancel} style={{height:42,padding:'0 24px',borderRadius:10,border:'1.5px solid rgba(255,255,255,.1)',background:'transparent',color:'var(--tx3)',fontFamily:F,fontSize:13,fontWeight:600,cursor:'pointer',flex:1}}>{isAr?'إلغاء':'Cancel'}</button>
</div></div></div></div>}

// ═══ Custom Select Dropdown ═══
function CustomSelect({value,onChange,options,placeholder,style:sx}){
const[open,setOpen]=useState(false)
const ref=React.useRef(null)
const[pos,setPos]=useState({top:0,left:0,width:0})
const selected=options.find(o=>String(o.v)===String(value))
React.useEffect(()=>{if(!open)return;const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h)},[open])
const handleOpen=()=>{if(ref.current){const r=ref.current.getBoundingClientRect();setPos({top:r.bottom+4,left:r.left,width:r.width})};setOpen(!open)}
return<div ref={ref} style={{position:'relative',...sx}}>
<div onClick={handleOpen} style={{...fS,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',background:open?'rgba(255,255,255,.1)':'rgba(255,255,255,.07)',borderColor:open?'rgba(212,160,23,.35)':'rgba(255,255,255,.12)'}}>
<span style={{color:selected?'rgba(255,255,255,.95)':'rgba(255,255,255,.3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,textAlign:'center'}}>{selected?selected.l:placeholder||'— اختر —'}</span>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,transition:'.2s',transform:open?'rotate(180deg)':'none'}}><polyline points="6 9 12 15 18 9"/></svg>
</div>
{open&&<div style={{position:'fixed',top:pos.top,left:pos.left,width:pos.width,background:'#252525',border:'1px solid rgba(255,255,255,.15)',borderRadius:10,overflow:'hidden',zIndex:9999,maxHeight:200,overflowY:'auto',boxShadow:'0 12px 32px rgba(0,0,0,.6)'}}>
{options.map(o=><div key={o.v} onClick={()=>{onChange(String(o.v));setOpen(false)}} style={{padding:'10px 14px',fontSize:13,fontWeight:String(o.v)===String(value)?700:500,color:String(o.v)===String(value)?C.gold:'rgba(255,255,255,.8)',background:String(o.v)===String(value)?'rgba(212,160,23,.08)':'transparent',cursor:'pointer',borderBottom:'1px solid var(--bd2)',textAlign:'center',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>{o.l}{String(o.v)===String(value)&&<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}</div>)}
</div>}
</div>}

// ═══ Form Popup — defined outside to prevent focus loss ═══
function FormPopup({title,fields,form,setForm,onSave,onClose,saving,isAr}){
return<div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(14,14,14,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<div onClick={e=>e.stopPropagation()} style={{background:'var(--sf)',borderRadius:16,width:520,maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 48px rgba(0,0,0,.4)',border:'1px solid var(--bd)'}}>
<div style={{height:3,background:'linear-gradient(90deg,transparent,'+C.gold+' 30%,#dcc06e 50%,'+C.gold+' 70%,transparent)',flexShrink:0}}/>
<div style={{background:'var(--bg)',padding:'16px 22px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
<div style={{fontSize:15,fontWeight:700,color:'var(--tx)'}}>{title}</div>
<button onClick={onClose} style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',color:'var(--tx3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
</div>
<div style={{flex:1,overflowY:'auto',padding:'18px 22px'}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
{fields.map(f=><div key={f.k} style={{gridColumn:f.w?'1/-1':undefined}}>
<div style={{fontSize:12,fontWeight:600,color:'var(--tx3)',marginBottom:5}}>{f.l}{f.r&&<span style={{color:C.red}}> *</span>}</div>
{f.opts&&f.btn?<div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{f.opts.map(o=>{const on=String(form[f.k])===String(o.v);return<button key={o.v} type="button" onClick={()=>setForm(p=>({...p,[f.k]:o.v}))} style={{flex:1,minWidth:0,height:42,padding:'0 14px',borderRadius:10,border:'1.5px solid '+(on?(o.v==='true'||o.v===true?'rgba(39,160,70,.55)':(o.v==='false'||o.v===false?'rgba(192,57,43,.45)':'rgba(212,160,23,.5)')):'rgba(255,255,255,.1)'),background:on?(o.v==='true'||o.v===true?'rgba(39,160,70,.18)':(o.v==='false'||o.v===false?'rgba(192,57,43,.12)':'rgba(212,160,23,.12)')):'transparent',color:on?(o.v==='true'||o.v===true?'#34c759':(o.v==='false'||o.v===false?'#e06157':C.gold)):'var(--tx4)',fontFamily:F,fontSize:12,fontWeight:on?700:600,cursor:'pointer',transition:'.15s'}}>{o.l}</button>})}</div>:
f.opts?<CustomSelect value={form[f.k]||''} onChange={v=>setForm(p=>({...p,[f.k]:v}))} options={f.opts} placeholder={isAr?'— اختر —':'— Select —'}/>:
f.w?<textarea value={form[f.k]||''} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} rows={2} style={{...fS,height:'auto',padding:12,resize:'vertical'}}/>:
<input value={form[f.k]||''} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} style={fS}/>}
</div>)}
</div></div>
<div style={{padding:'14px 22px',borderTop:'1px solid var(--bd)',display:'flex',justifyContent:'space-between',flexDirection:'row-reverse',flexShrink:0}}>
<button onClick={onSave} disabled={saving} style={{...bS,height:42,minWidth:130,opacity:saving?.6:1}}>{saving?'...':(form._id?(isAr?'حفظ':'Save'):(isAr?'إضافة':'Add'))}</button>
<button onClick={onClose} style={{height:42,padding:'0 18px',background:'transparent',color:'var(--tx4)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:10,fontFamily:F,fontSize:12,fontWeight:600,cursor:'pointer'}}>{isAr?'إلغاء':'Cancel'}</button>
</div></div></div>}

// ═══ OccupationFormPopup — styled to match KafalaCalculator modal ═══
const kFS={width:'100%',height:38,padding:'0 14px',border:'1px solid rgba(255,255,255,.05)',borderRadius:9,fontFamily:F,fontSize:13,fontWeight:600,color:'var(--tx)',outline:'none',background:'rgba(0,0,0,.18)',boxSizing:'border-box',boxShadow:'inset 0 1px 2px rgba(0,0,0,.2)',textAlign:'center',transition:'.2s'}
const KLbl=({children,req})=><div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.58)',marginBottom:3,textAlign:'start'}}>{children}{req&&<span style={{color:C.red}}> *</span>}</div>
const KInp=({value,onChange,placeholder,dir,maxLength})=><input value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder} type="text" maxLength={maxLength} style={{...kFS,textAlign:'center',direction:dir||'rtl'}}/>

function OccupationFormPopup({form,setForm,onSave,onClose,saving,isAr,sb,toast,onSaved,kind='occupation',regions=[],cities=[]}){
const [savedFlash,setSavedFlash]=useState(false)
const [localSaving,setLocalSaving]=useState(false)
const isNat=kind==='nationality'
const isEmb=kind==='embassy'
const isReg=kind==='region'
const isCity=kind==='city'
const isDist=kind==='district'
const isGeo=isReg||isCity||isDist
const tbl=isNat?'nationalities':isEmb?'embassies':isReg?'regions':isCity?'cities':isDist?'districts':'occupations'
const L={
edit:isEmb?(isAr?'تعديل سفارة':'Edit Embassy'):isNat?(isAr?'تعديل جنسية':'Edit Nationality'):isReg?(isAr?'تعديل منطقة':'Edit Region'):isCity?(isAr?'تعديل مدينة':'Edit City'):isDist?(isAr?'تعديل حي':'Edit District'):(isAr?'تعديل مهنة':'Edit Occupation'),
add:isEmb?(isAr?'إضافة سفارة':'Add Embassy'):isNat?(isAr?'إضافة جنسية':'Add Nationality'):isReg?(isAr?'إضافة منطقة':'Add Region'):isCity?(isAr?'إضافة مدينة':'Add City'):isDist?(isAr?'إضافة حي':'Add District'):(isAr?'إضافة مهنة':'Add Occupation'),
info:isEmb?(isAr?'بيانات السفارة':'Embassy Info'):isNat?(isAr?'بيانات الجنسية':'Nationality Info'):isReg?(isAr?'بيانات المنطقة':'Region Info'):isCity?(isAr?'بيانات المدينة':'City Info'):isDist?(isAr?'بيانات الحي':'District Info'):(isAr?'بيانات المهنة':'Occupation Info'),
nameArLabel:isEmb?(isAr?'اسم المدينة بالعربي':'City Name (Arabic)'):(isAr?'الاسم بالعربي':'Name (Arabic)'),
nameEnLabel:isEmb?(isAr?'اسم المدينة بالإنجليزي':'City Name (English)'):(isAr?'الاسم بالإنجليزي':'Name (English)'),
nameArPh:isEmb?(isAr?'مثال: الرياض':'مدينة ...'):isNat?(isAr?'مثال: سعودي':'سعودي ...'):isReg?(isAr?'مثال: الرياض':'منطقة ...'):isCity?(isAr?'مثال: الرياض':'مدينة ...'):isDist?(isAr?'مثال: النزهة':'حي ...'):(isAr?'مثال: أخصائي تسويق':'أخصائي ...'),
nameEnPh:isEmb?'e.g. Riyadh':isNat?'e.g. Saudi':isReg?'e.g. Riyadh':isCity?'e.g. Riyadh':isDist?'e.g. Al Nuzha':'e.g. Marketing Specialist',
codePh:isReg||isCity?(isAr?'مثال: RYD':'e.g. RYD'):isDist?(isAr?'رمز':'code'):isEmb||isNat?(isAr?'رمز':'code'):'6-digit code',
savedEdit:isEmb?(isAr?'تم تعديل السفارة':'Embassy updated'):isNat?(isAr?'تم تعديل الجنسية':'Nationality updated'):isReg?(isAr?'تم تعديل المنطقة':'Region updated'):isCity?(isAr?'تم تعديل المدينة':'City updated'):isDist?(isAr?'تم تعديل الحي':'District updated'):(isAr?'تم تعديل المهنة':'Occupation updated'),
savedAdd:isEmb?(isAr?'تم حفظ السفارة':'Embassy saved'):isNat?(isAr?'تم حفظ الجنسية':'Nationality saved'):isReg?(isAr?'تم حفظ المنطقة':'Region saved'):isCity?(isAr?'تم حفظ المدينة':'City saved'):isDist?(isAr?'تم حفظ الحي':'District saved'):(isAr?'تم حفظ المهنة':'Occupation saved')
}
const handleSave=async()=>{
setLocalSaving(true)
try{
const d={...form}
delete d._table;delete d._id
Object.keys(d).forEach(k=>{if(d[k]==='')d[k]=null})
if(d.is_active!==undefined&&d.is_active!==null)d.is_active=d.is_active==='true'
if(d.saudi_only!==undefined&&d.saudi_only!==null)d.saudi_only=d.saudi_only==='true'
if(d.sort_order)d.sort_order=parseInt(d.sort_order,10)||null
if(d.qiwa_id)d.qiwa_id=parseInt(d.qiwa_id,10)||null
let savedId=form._id
if(form._id){const{error}=await sb.from(tbl).update(d).eq('id',form._id);if(error)throw error}
else{const{data:ins,error}=await sb.from(tbl).insert(d).select('id').single();if(error)throw error;savedId=ins?.id}
// Auto-resequence so sort_order stays unique 1..N
const newSort=d.sort_order
if(newSort&&savedId){
const{data:all}=await sb.from(tbl).select('id,sort_order').is('deleted_at',null).order('sort_order',{nullsFirst:false}).order('name_ar')
const others=(all||[]).filter(x=>x.id!==savedId)
const pos=Math.max(0,Math.min(newSort-1,others.length))
others.splice(pos,0,{id:savedId,sort_order:newSort})
const origMap=new Map((all||[]).map(x=>[x.id,x.sort_order]))
const updates=[]
others.forEach((it,idx)=>{const nv=idx+1;if(origMap.get(it.id)!==nv)updates.push({id:it.id,sort_order:nv})})
for(const u of updates){await sb.from(tbl).update({sort_order:u.sort_order}).eq('id',u.id)}
}
setSavedFlash(true)
setTimeout(()=>{setSavedFlash(false);onSaved&&onSaved();onClose()},1400)
}catch(e){const msg=(e.message||'').toLowerCase();const dup=msg.includes('duplicate')||msg.includes('unique')||e.code==='23505';toast&&toast(dup?(isAr?'الرمز مستخدم مسبقاً':'Code already exists'):('خطأ: '+(e.message||'').slice(0,80)))}
setLocalSaving(false)
}
const isSaving=localSaving||saving
const btn=(val,cur,onClick,label,kind)=>{const on=String(cur)===String(val);const col=kind==='ok'?'#27a046':kind==='err'?'#e06157':C.gold;const bg=kind==='ok'?'rgba(39,160,70,.18)':kind==='err'?'rgba(192,57,43,.12)':'rgba(212,160,23,.12)';const bd=kind==='ok'?'rgba(39,160,70,.55)':kind==='err'?'rgba(192,57,43,.45)':'rgba(212,160,23,.5)';return<button type="button" onClick={onClick} style={{flex:1,height:38,borderRadius:9,border:'1px solid '+(on?bd:'rgba(255,255,255,.05)'),background:on?bg:'rgba(0,0,0,.18)',color:on?col:'rgba(255,255,255,.58)',fontFamily:F,fontSize:13,fontWeight:on?700:600,cursor:'pointer',transition:'.2s'}}>{label}</button>}
return<div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(10,10,10,.8)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16}}>
<style>{`.occ-nav-btn{height:40px;padding:0 6px;background:transparent;border:none;color:#D4A017;font-family:${F};font-size:14px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:10px;transition:.2s}.occ-nav-btn .nav-ico{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);display:flex;align-items:center;justify-content:center;transition:.2s;color:#D4A017}.occ-nav-btn:hover .nav-ico{background:#D4A017;color:#000}.occ-nav-btn:hover .nav-ico{transform:translateX(-4px)}.occ-nav-btn:disabled{opacity:.5;cursor:not-allowed}.occ-nav-btn:disabled .nav-ico{background:rgba(212,160,23,.1);color:#D4A017;transform:none}`}</style>
<div onClick={e=>e.stopPropagation()} style={{background:'#1a1a1a',borderRadius:18,width:isNat?880:720,maxWidth:'95vw',display:'flex',flexDirection:'column',overflow:'visible',boxShadow:'0 24px 60px rgba(0,0,0,.5)',border:'1px solid rgba(212,160,23,.08)',position:'relative'}}>
<div dir={isAr?'rtl':'ltr'} style={{fontFamily:F,color:'rgba(255,255,255,.85)',display:'flex',flexDirection:'column',height:'100%',overflow:'visible'}}>
{/* Header */}
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 20px 18px',flexShrink:0,direction:isAr?'rtl':'ltr'}}>
<div style={{display:'flex',alignItems:'center',gap:10}}>
<div style={{width:36,height:36,borderRadius:8,background:'rgba(212,160,23,.08)',border:'1px solid rgba(212,160,23,.2)',display:'flex',alignItems:'center',justifyContent:'center',color:C.gold}}>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7h-3V5a2 2 0 0 0-2-2h-6a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><line x1="9" y1="7" x2="15" y2="7"/></svg>
</div>
<div style={{fontSize:20,fontWeight:800,color:'rgba(255,255,255,.95)'}}>{form._id?L.edit:L.add}</div>
</div>
<button onClick={onClose} style={{width:36,height:36,borderRadius:10,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.06)',color:'rgba(255,255,255,.5)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
</div>
{/* Content */}
<div style={{flex:1,overflow:'visible',padding:'6px 16px 10px'}}>
<div style={{borderRadius:12,border:'1.5px solid rgba(212,160,23,.35)',padding:'18px 14px 14px',position:'relative',marginTop:10}}>
<div style={{position:'absolute',top:-9,[isAr?'right':'left']:14,background:'#1a1a1a',padding:'0 8px',fontSize:12,fontWeight:800,color:C.gold,display:'inline-flex',alignItems:'center',gap:6}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7h-3V5a2 2 0 0 0-2-2h-6a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/></svg>
<span>{L.info}</span>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
{isCity&&<div style={{gridColumn:'1 / span 2'}}>
<KLbl req>{isAr?'المنطقة':'Region'}</KLbl>
<select value={form.region_id||''} onChange={e=>setForm(p=>({...p,region_id:e.target.value}))} style={{...kFS,textAlign:'center',direction:isAr?'rtl':'ltr',appearance:'none',cursor:'pointer'}}>
<option value="">{isAr?'— اختر المنطقة —':'— Select region —'}</option>
{regions.map(r=><option key={r.id} value={r.id}>{r.name_ar}{r.name_en?' · '+r.name_en:''}</option>)}
</select>
</div>}
{isDist&&<div style={{gridColumn:'1 / span 2'}}>
<KLbl req>{isAr?'المدينة':'City'}</KLbl>
<select value={form.city_id||''} onChange={e=>setForm(p=>({...p,city_id:e.target.value}))} style={{...kFS,textAlign:'center',direction:isAr?'rtl':'ltr',appearance:'none',cursor:'pointer'}}>
<option value="">{isAr?'— اختر المدينة —':'— Select city —'}</option>
{regions.map(r=>{const rc=cities.filter(c=>c.region_id===r.id);if(!rc.length)return null;return<optgroup key={r.id} label={r.name_ar}>{rc.map(c=><option key={c.id} value={c.id}>{c.name_ar}{c.name_en?' · '+c.name_en:''}</option>)}</optgroup>})}
</select>
</div>}
<div>
<KLbl req>{L.nameArLabel}</KLbl>
<KInp value={form.name_ar} onChange={v=>setForm(p=>({...p,name_ar:v.replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]/g,'')}))} placeholder={L.nameArPh}/>
</div>
<div>
<KLbl>{L.nameEnLabel}</KLbl>
<KInp value={form.name_en} onChange={v=>setForm(p=>({...p,name_en:v.replace(/[^a-zA-Z\s'\-().]/g,'')}))} placeholder={L.nameEnPh} dir="ltr"/>
</div>
<div>
<KLbl req={!isGeo}>{isAr?'الرمز':'Code'}</KLbl>
<KInp value={form.code} onChange={v=>setForm(p=>({...p,code:v}))} placeholder={L.codePh} dir="ltr"/>
</div>
{!isGeo&&<div>
<KLbl>{isAr?'كود قوى':'Qiwa ID'}</KLbl>
<KInp value={form.qiwa_id} onChange={v=>setForm(p=>({...p,qiwa_id:v.replace(/\D/g,'')}))} placeholder="0000" dir="ltr"/>
</div>}
{isNat&&<div>
<KLbl>{isAr?'اسم الدولة بالعربي':'Country (Arabic)'}</KLbl>
<KInp value={form.country_name_ar} onChange={v=>setForm(p=>({...p,country_name_ar:v}))} placeholder={isAr?'مثال: السعودية':'—'}/>
</div>}
{isNat&&<div>
<KLbl>{isAr?'اسم الدولة بالإنجليزي':'Country (English)'}</KLbl>
<KInp value={form.country_name_en} onChange={v=>setForm(p=>({...p,country_name_en:v}))} placeholder="e.g. Saudi Arabia" dir="ltr"/>
</div>}
{isNat&&<div style={{gridColumn:'1 / span 2'}}>
<KLbl>{isAr?'رابط العلم':'Flag URL'}</KLbl>
<KInp value={form.flag_url} onChange={v=>setForm(p=>({...p,flag_url:v}))} placeholder="https://flagcdn.com/w320/sa.png" dir="ltr"/>
</div>}
{!isGeo&&<div>
<KLbl>{isAr?'التصنيف':'Classification'}</KLbl>
<KInp value={form.classification} onChange={v=>setForm(p=>({...p,classification:v}))} placeholder={isAr?'—':'—'}/>
</div>}
<div>
<KLbl>{isAr?'الترتيب':'Sort Order'}</KLbl>
<KInp value={form.sort_order} onChange={v=>setForm(p=>({...p,sort_order:v.replace(/\D/g,'')}))} placeholder="0" dir="ltr"/>
</div>
{!isGeo&&<div>
<KLbl>{isAr?'سعودي فقط':'Saudi Only'}</KLbl>
<div style={{display:'flex',gap:8}}>
{btn('true',form.saudi_only,()=>setForm(p=>({...p,saudi_only:'true'})),isAr?'نعم':'Yes','ok')}
{btn('false',form.saudi_only,()=>setForm(p=>({...p,saudi_only:'false'})),isAr?'لا':'No','err')}
</div>
</div>}
<div>
<KLbl>{isAr?'الحالة':'Status'}</KLbl>
<div style={{display:'flex',gap:8}}>
{btn('true',form.is_active,()=>setForm(p=>({...p,is_active:'true'})),isAr?'نشط':'Active','ok')}
{btn('false',form.is_active,()=>setForm(p=>({...p,is_active:'false'})),isAr?'معطّل':'Inactive','err')}
</div>
</div>
</div>
</div>
</div>
{/* Footer */}
<div style={{display:'flex',justifyContent:'flex-end',padding:'8px 20px 12px',flexShrink:0,direction:isAr?'rtl':'ltr'}}>
<button onClick={handleSave} disabled={isSaving||!form.name_ar||(!isGeo&&!form.code)||(isCity&&!form.region_id)||(isDist&&!form.city_id)} className="occ-nav-btn">
<span>{isSaving?(isAr?'جار الحفظ…':'Saving…'):(form._id?(isAr?'تعديل':'Update'):(isAr?'إضافة':'Add'))}</span>
<span className="nav-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
</button>
</div>
{/* Saved Flash Overlay */}
{savedFlash&&<div style={{position:'absolute',inset:0,background:'#1a1a1a',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,zIndex:10,borderRadius:18}}>
<div style={{width:72,height:72,borderRadius:'50%',background:'rgba(39,160,70,.15)',border:'2px solid rgba(39,160,70,.5)',display:'flex',alignItems:'center',justifyContent:'center',color:'#27a046',animation:'occ-pop .3s ease-out'}}>
<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
</div>
<div style={{fontSize:16,fontWeight:800,color:'rgba(255,255,255,.95)'}}>{form._id?L.savedEdit:L.savedAdd}</div>
<style>{`@keyframes occ-pop{from{transform:scale(.5);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
</div>}
</div>
</div>
</div>
}

// ═══ Main Component ═══
export default function SettingsPage({sb,toast,user,lang,onTabChange,defaultMainTab}){
const isAr=lang!=='en'
const[mainTab,setMainTab]=useState(defaultMainTab||'general_group')
const[tab,setTab]=useState(()=>{
const g=(defaultMainTab==='fields_group')?{id:'fields_group',first:'categories'}:{id:'general_group',first:'general'}
return g.first
})
const[sData,setSData]=useState([]);const[sLoading,setSLoading]=useState(true)
const[regions,setRegions]=useState([]);const[cities,setCities]=useState([]);const[districtsList,setDistrictsList]=useState([])
const[lLists,setLLists]=useState([]);const[lItems,setLItems]=useState([]);const[occupationsList,setOccupationsList]=useState([]);const[natList,setNatList]=useState([]);const[embList,setEmbList]=useState([])
const[docs,setDocs]=useState([])
const[loading,setLoading]=useState(false)
const[q,setQ]=useState('');const[pop,setPop]=useState(null)
const[form,setForm]=useState({});const[saving,setSaving]=useState(false)
const[listFilter,setListFilter]=useState('')
const[open,setOpen]=useState({})
const[delTarget,setDelTarget]=useState(null)
const[subSvcs,setSubSvcs]=useState([])
const[subSteps,setSubSteps]=useState([])
const[tplts,setTplts]=useState([])
const[tplLinks,setTplLinks]=useState([])
const[instPlans,setInstPlans]=useState([])
const[msList,setMsList]=useState([])
const[svcSubTab,setSvcSubTab]=useState('services');const[stepFieldCounts,setStepFieldCounts]=useState({});const[txnCounts,setTxnCounts]=useState({});const[svcCatFilter,setSvcCatFilter]=useState('all')
const[muqeemCreds,setMuqeemCreds]=useState({username:'',password:'',updated_at:null})
const[muqeemInputs,setMuqeemInputs]=useState({username:'',password:''})
const[muqeemShowPw,setMuqeemShowPw]=useState(false)
const[muqeemSaving,setMuqeemSaving]=useState(false)
const[muqeemEditing,setMuqeemEditing]=useState(false)
const[sbcCreds,setSbcCreds]=useState({username:'',password:'',updated_at:null})
const[sbcInputs,setSbcInputs]=useState({username:'',password:''})
const[sbcShowPw,setSbcShowPw]=useState(false)
const[sbcSaving,setSbcSaving]=useState(false)
const[sbcEditing,setSbcEditing]=useState(false)

const toggle=id=>setOpen(p=>({...p,[id]:!p[id]}))
useEffect(()=>{onTabChange&&onTabChange({tab,svcSubTab})},[tab,svcSubTab,onTabChange])

const loadAll=useCallback(async()=>{
setLoading(true)
const[s,rg,ct,ll,li,dc,sv,ss,tp,tl,di,oc,nat,emb]=await Promise.all([
sb.from('system_settings').select('*').order('category').order('setting_key'),
sb.from('regions').select('*').order('sort_order').order('name_ar'),
sb.from('cities').select('*').order('sort_order').order('name_ar'),
sb.from('lookup_categories').select('*').order('sort_order').order('name_ar'),
sb.from('lookup_items').select('*').order('sort_order'),
sb.from('documents').select('*').is('deleted_at',null).order('created_at',{ascending:false}).limit(200),
sb.from('sub_services').select('*').order('sort_order').order('name_ar'),
sb.from('sub_service_steps').select('*').order('step_order'),
sb.from('transaction_templates').select('*').order('sort_order').order('name_ar'),
sb.from('template_sub_services').select('*').order('step_order'),
sb.from('districts').select('*').order('sort_order').order('name_ar'),
sb.from('occupations').select('*').is('deleted_at',null).order('sort_order',{nullsFirst:false}).order('name_ar'),
sb.from('nationalities').select('*').is('deleted_at',null).order('sort_order',{nullsFirst:false}).order('name_ar'),
sb.from('embassies').select('*').is('deleted_at',null).order('name_ar')
])
setSData(s.data||[]);setSLoading(false);setRegions(rg.data||[]);setCities(ct.data||[]);setDistrictsList(di.data||[])
setLLists(ll.data||[]);setLItems(li.data||[]);setDocs(dc.data||[]);setSubSvcs(sv.data||[]);setSubSteps(ss.data||[]);setTplts(tp.data||[]);setTplLinks(tl.data||[])
setOccupationsList(oc.data||[]);setNatList(nat.data||[]);setEmbList(emb.data||[])
// Load step_fields counts per step and txn counts per service
sb.from('step_fields').select('step_id').then(({data:sfData})=>{const counts={};(sfData||[]).forEach(f=>{counts[f.step_id]=(counts[f.step_id]||0)+1});setStepFieldCounts(counts)})
sb.from('transactions').select('service_id').is('deleted_at',null).then(({data:txData})=>{const counts={};(txData||[]).forEach(t=>{if(t.service_id)counts[t.service_id]=(counts[t.service_id]||0)+1});setTxnCounts(counts)})
sb.from('service_installment_plans').select('*').order('installment_order').then(({data})=>setInstPlans(data||[]))
sb.from('service_type_milestones').select('*').eq('is_active',true).order('sort_order').then(({data})=>setMsList(data||[]))
sb.from('muqeem_credentials').select('username,password,updated_at').eq('id','default').maybeSingle().then(({data})=>{const d=data||{username:'',password:'',updated_at:null};setMuqeemCreds(d);setMuqeemInputs({username:d.username||'',password:d.password||''})})
sb.from('sbc_credentials').select('username,password,updated_at').eq('id','default').maybeSingle().then(({data})=>{const d=data||{username:'',password:'',updated_at:null};setSbcCreds(d);setSbcInputs({username:d.username||'',password:d.password||''})})
setLoading(false)
},[sb])
useEffect(()=>{loadAll()},[loadAll])

const saveSetting=async(key,val)=>{const{error}=await sb.from('system_settings').update({setting_value:val,updated_at:new Date().toISOString()}).eq('setting_key',key);if(error)toast('خطأ');else toast(isAr?'تم الحفظ':'Saved')}
const saveMuqeemCreds=async()=>{const u=(muqeemInputs.username||'').trim();const p=(muqeemInputs.password||'').trim();if(!u||!p){toast(isAr?'املأ الحقلين':'Fill both fields');return}setMuqeemSaving(true);const{error}=await sb.from('muqeem_credentials').upsert({id:'default',username:u,password:p,updated_at:new Date().toISOString(),updated_by:user?.id||null});setMuqeemSaving(false);if(error){toast('خطأ: '+error.message?.slice(0,80));return}setMuqeemCreds({username:u,password:p,updated_at:new Date().toISOString()});setMuqeemEditing(false);setMuqeemShowPw(false);toast(isAr?'تم حفظ بيانات دخول مقيم':'Muqeem credentials saved')}
const cancelMuqeemEdit=()=>{setMuqeemInputs({username:muqeemCreds.username||'',password:muqeemCreds.password||''});setMuqeemEditing(false);setMuqeemShowPw(false)}
const saveSbcCreds=async()=>{const u=(sbcInputs.username||'').trim();const p=(sbcInputs.password||'').trim();if(!u||!p){toast(isAr?'املأ الحقلين':'Fill both fields');return}setSbcSaving(true);const{error}=await sb.from('sbc_credentials').upsert({id:'default',username:u,password:p,updated_at:new Date().toISOString(),updated_by:user?.id||null});setSbcSaving(false);if(error){toast('خطأ: '+error.message?.slice(0,80));return}setSbcCreds({username:u,password:p,updated_at:new Date().toISOString()});setSbcEditing(false);setSbcShowPw(false);toast(isAr?'تم حفظ بيانات دخول المركز السعودي':'SBC credentials saved')}
const cancelSbcEdit=()=>{setSbcInputs({username:sbcCreds.username||'',password:sbcCreds.password||''});setSbcEditing(false);setSbcShowPw(false)}
const saveForm=async()=>{setSaving(true);try{const t=form._table;const id=form._id;const d={...form};delete d._table;delete d._id;Object.keys(d).forEach(k=>{if(d[k]==='')d[k]=null})
if(d.is_active!==undefined&&d.is_active!==null)d.is_active=d.is_active==='true'
if(d.is_system!==undefined&&d.is_system!==null)d.is_system=d.is_system==='true'
if(d.is_conditional!==undefined&&d.is_conditional!==null)d.is_conditional=d.is_conditional==='true'
if(id){const{error}=await sb.from(t).update(d).eq('id',id);if(error)throw error;toast(isAr?'تم التعديل':'Updated')}
else{if(['documents'].includes(t))d.created_by=user?.id;const{error}=await sb.from(t).insert(d);if(error)throw error;toast(isAr?'تمت الإضافة':'Added')}
setPop(null);loadAll()}catch(e){toast('خطأ: '+e.message?.slice(0,80))}setSaving(false)}
const confirmDel=async()=>{if(!delTarget)return;const{table,id}=delTarget
if(table==='documents'){await sb.from(table).update({deleted_at:new Date().toISOString()}).eq('id',id)}
else if(table==='occupations'){await sb.from(table).update({deleted_at:new Date().toISOString()}).eq('id',id)
const{data:rest}=await sb.from('occupations').select('id').is('deleted_at',null).order('sort_order',{nullsFirst:false}).order('name_ar')
if(rest){await Promise.all(rest.map((r,i)=>sb.from('occupations').update({sort_order:i+1}).eq('id',r.id)))}}
else if(table==='nationalities'){await sb.from(table).update({deleted_at:new Date().toISOString()}).eq('id',id)
const{data:rest}=await sb.from('nationalities').select('id').is('deleted_at',null).order('sort_order',{nullsFirst:false}).order('name_ar')
if(rest){await Promise.all(rest.map((r,i)=>sb.from('nationalities').update({sort_order:i+1}).eq('id',r.id)))}}
else if(table==='embassies'){await sb.from(table).update({deleted_at:new Date().toISOString()}).eq('id',id)}
else{await sb.from(table).delete().eq('id',id)}
toast(isAr?'تم الحذف':'Deleted');setDelTarget(null);loadAll()}
const askDel=(table,id,name)=>setDelTarget({table,id,name})

const getRef=(val,list,ak='name_ar',ek='name_en')=>{if(!val)return'—';const r=list.find(x=>x.id===val);return r?(isAr?r[ak]:r[ek]||r[ak]):'—'}

const secS={display:'flex',alignItems:'center',gap:8,padding:'10px 0',fontSize:13,fontWeight:700,color:'rgba(255,255,255,.6)'}
const cardS={background:'var(--bg)',border:'1px solid var(--bd)',borderRadius:14,overflow:'hidden'}
const parentRow={display:'flex',alignItems:'center',gap:10,padding:'12px 16px',cursor:'pointer',borderBottom:'1px solid var(--bd2)',transition:'.1s'}
const childRow={display:'flex',alignItems:'center',gap:10,padding:'9px 16px 9px 42px',borderBottom:'1px solid rgba(255,255,255,.02)',background:'rgba(255,255,255,.015)'}

const tabGroups=[
{id:'general_group',l:'الإعدادات العامة',le:'General Settings',tabs:[
{id:'general',l:'إعدادات البرنامج',le:'Program Settings'},
{id:'services',l:'الخدمات والمعاملات',le:'Services & Transactions'},
{id:'documents',l:'الوثائق',le:'Documents'},
]},
{id:'fields_group',l:'الحقول',le:'Fields',tabs:[
{id:'categories',l:'حقول عامة',le:'General Fields'},
{id:'occupations',l:'المهن',le:'Occupations'},
{id:'nationalities',l:'الجنسيات والسفارات',le:'Nationalities & Embassies'},
{id:'regions_cities',l:'المناطق والمدن',le:'Regions & Cities'},
]},
]
const tabs=tabGroups.flatMap(g=>g.tabs)
const currentGroup=tabGroups.find(g=>g.id===mainTab)||tabGroups[0]

const popFields={
r:[{k:'name_ar',l:isAr?'الاسم بالعربي':'Name (Arabic)',r:1},{k:'name_en',l:isAr?'الاسم بالإنجليزي':'Name (English)',d:1},{k:'code',l:isAr?'الرمز':'Code',d:1},{k:'sort_order',l:isAr?'الترتيب':'Sort',d:1},{k:'is_active',l:isAr?'الحالة':'Status',opts:[{v:'true',l:isAr?'نشطة':'Active'},{v:'false',l:isAr?'معطّلة':'Inactive'}]}],
c:[{k:'name_ar',l:isAr?'الاسم بالعربي':'Name (Arabic)',r:1},{k:'name_en',l:isAr?'الاسم بالإنجليزي':'Name (English)',d:1},{k:'code',l:isAr?'الرمز':'Code',d:1},{k:'sort_order',l:isAr?'الترتيب':'Sort',d:1},{k:'is_active',l:isAr?'الحالة':'Status',opts:[{v:'true',l:isAr?'نشطة':'Active'},{v:'false',l:isAr?'معطّلة':'Inactive'}]}],
co:[{k:'name_ar',l:isAr?'اسم الدولة بالعربي':'Country (Arabic)',r:1},{k:'name_en',l:isAr?'اسم الدولة بالإنجليزي':'Country (English)',d:1},{k:'nationality_ar',l:isAr?'الجنسية بالعربي':'Nationality (Arabic)'},{k:'nationality_en',l:isAr?'الجنسية بالإنجليزي':'Nationality (English)',d:1},{k:'code',l:isAr?'كود الدولة':'Code',d:1},{k:'flag_emoji',l:isAr?'العلم':'Flag',d:1},{k:'sort_order',l:isAr?'الترتيب':'Sort',d:1},{k:'is_active',l:isAr?'الحالة':'Status',opts:[{v:'true',l:isAr?'نشطة':'Active'},{v:'false',l:isAr?'معطّلة':'Inactive'}]}],
em:[{k:'city_ar',l:isAr?'المدينة بالعربي':'City (Arabic)',r:1},{k:'city_en',l:isAr?'المدينة بالإنجليزي':'City (English)',d:1},{k:'sort_order',l:isAr?'الترتيب':'Sort',d:1},{k:'is_active',l:isAr?'الحالة':'Status',opts:[{v:'true',l:isAr?'نشطة':'Active'},{v:'false',l:isAr?'معطّلة':'Inactive'}]}],
ll:[{k:'category_key',l:isAr?'المفتاح (إنجليزي)':'Key (English)',r:1,d:1},{k:'name_ar',l:isAr?'الاسم بالعربي':'Name (Arabic)',r:1},{k:'name_en',l:isAr?'الاسم بالإنجليزي':'Name (English)',d:1},{k:'sort_order',l:isAr?'الترتيب':'Sort Order',d:1},{k:'is_system',l:isAr?'نظامي':'System',opts:[{v:'true',l:isAr?'نعم':'Yes'},{v:'false',l:isAr?'لا':'No'}]},{k:'is_active',l:isAr?'الحالة':'Status',opts:[{v:'true',l:isAr?'نشطة':'Active'},{v:'false',l:isAr?'معطّلة':'Inactive'}]}],
li:[{k:'value_ar',l:isAr?'القيمة بالعربي':'Value (Arabic)',r:1},{k:'value_en',l:isAr?'القيمة بالإنجليزي':'Value (English)',d:1},{k:'code',l:isAr?'الرمز':'Code',d:1},{k:'sort_order',l:isAr?'الترتيب':'Sort',d:1}],
bnk:[{k:'value_ar',l:isAr?'اسم البنك بالعربي':'Bank Name (Arabic)',r:1},{k:'value_en',l:isAr?'بالإنجليزي':'English',d:1},{k:'code',l:isAr?'الرمز':'Code',d:1},{k:'type_id',l:isAr?'نوع البنك':'Bank Type',opts:lItems.filter(i=>{const bl=lLists.find(l=>l.category_key==='bank_type');return bl&&i.category_id===bl.id}).map(i=>({v:i.id,l:i.value_ar}))},{k:'sort_order',l:isAr?'الترتيب':'Sort',d:1}],
di:[{k:'name_ar',l:isAr?'اسم الحي بالعربي':'District (Arabic)',r:1},{k:'name_en',l:isAr?'اسم الحي بالإنجليزي':'District (English)',d:1},{k:'code',l:isAr?'الرمز':'Code',d:1},{k:'sort_order',l:isAr?'الترتيب':'Sort',d:1}],
doc:[{k:'title',l:isAr?'العنوان':'Title',r:1},{k:'document_type',l:isAr?'النوع':'Type'},{k:'entity_type',l:isAr?'نوع الكيان':'Entity Type'},{k:'description',l:isAr?'الوصف':'Description',w:1}],
sv:[{k:'name_ar',l:isAr?'اسم الخدمة بالعربي':'Service (Arabic)',r:1},{k:'name_en',l:isAr?'بالإنجليزي':'English',d:1},{k:'code',l:isAr?'الرمز':'Code',d:1},{k:'category',l:isAr?'التصنيف':'Category'},{k:'service_scope',l:isAr?'النوع':'Scope',opts:[{v:'client',l:isAr?'خارجي (عميل)':'Client'},{v:'internal',l:isAr?'داخلي':'Internal'},{v:'office',l:isAr?'مكتب':'Office'}]},{k:'default_price',l:isAr?'السعر الافتراضي':'Default Price',d:1},{k:'gov_fee',l:isAr?'الرسوم الحكومية':'Gov. Fee',d:1},{k:'is_free',l:isAr?'مجانية':'Free',opts:[{v:'true',l:isAr?'نعم (مجاني)':'Yes (Free)'},{v:'false',l:isAr?'لا (بفلوس)':'No (Paid)'}]},{k:'vat_included',l:isAr?'شامل الضريبة':'VAT Included',opts:[{v:'true',l:isAr?'نعم':'Yes'},{v:'false',l:isAr?'لا':'No'}]},{k:'show_in_request_popup',l:isAr?'تظهر في رفع طلب':'Show in Request',opts:[{v:'true',l:isAr?'نعم':'Yes'},{v:'false',l:isAr?'لا':'No'}]},{k:'requires_client',l:isAr?'يتطلب عميل':'Requires Client',opts:[{v:'true',l:isAr?'نعم':'Yes'},{v:'false',l:isAr?'لا':'No'}]},{k:'requires_worker',l:isAr?'يتطلب عامل':'Requires Worker',opts:[{v:'true',l:isAr?'نعم':'Yes'},{v:'false',l:isAr?'لا':'No'}]},{k:'requires_facility',l:isAr?'يتطلب منشأة':'Requires Facility',opts:[{v:'true',l:isAr?'نعم':'Yes'},{v:'false',l:isAr?'لا':'No'}]},{k:'sort_order',l:isAr?'الترتيب':'Sort',d:1},{k:'is_active',l:isAr?'الحالة':'Status',opts:[{v:'true',l:isAr?'نشطة':'Active'},{v:'false',l:isAr?'معطّلة':'Inactive'}]},{k:'pricing_notes',l:isAr?'ملاحظات التسعير':'Pricing Notes'},{k:'description_ar',l:isAr?'وصف الخدمة':'Description',w:1},{k:'notes',l:isAr?'ملاحظات':'Notes',w:1}],
ss:[{k:'name_ar',l:isAr?'اسم الخطوة':'Step (Arabic)',r:1},{k:'name_en',l:isAr?'بالإنجليزي':'English',d:1},{k:'step_order',l:isAr?'الترتيب':'Order',r:1,d:1},{k:'is_required',l:isAr?'مطلوبة':'Required',opts:[{v:'true',l:isAr?'نعم':'Yes'},{v:'false',l:isAr?'لا':'No'}]},{k:'sadad_requirement',l:isAr?'متطلب سداد':'SADAD',opts:[{v:'none',l:isAr?'بدون':'None'},{v:'required_blocking',l:isAr?'مطلوب (حظر)':'Blocking'},{v:'required_before_complete',l:isAr?'قبل الإنهاء':'Before Complete'}]},{k:'default_sadad_amount',l:isAr?'مبلغ سداد':'Amount',d:1},{k:'description',l:isAr?'الوصف':'Description',w:1}],
tp:[{k:'name_ar',l:isAr?'اسم القالب بالعربي':'Template (Arabic)',r:1},{k:'name_en',l:isAr?'بالإنجليزي':'English',d:1},{k:'code',l:isAr?'الرمز':'Code',d:1},{k:'transaction_type',l:isAr?'نوع المعاملة':'Type',opts:[{v:'recruitment',l:isAr?'استقدام':'Recruitment'},{v:'transfer',l:isAr?'نقل خدمات':'Transfer'},{v:'exit',l:isAr?'خروج':'Exit'},{v:'renewal',l:isAr?'تجديد':'Renewal'},{v:'other',l:isAr?'أخرى':'Other'}]},{k:'sort_order',l:isAr?'الترتيب':'Sort',d:1},{k:'is_active',l:isAr?'الحالة':'Status',opts:[{v:'true',l:isAr?'نشط':'Active'},{v:'false',l:isAr?'معطّل':'Inactive'}]},{k:'notes',l:isAr?'ملاحظات':'Notes',w:1}],
tl:[{k:'sub_service_id',l:isAr?'الخدمة الفرعية':'Sub Service',r:1,opts:subSvcs.map(s=>({v:s.id,l:isAr?s.name_ar:s.name_en||s.name_ar}))},{k:'step_order',l:isAr?'الترتيب':'Order',r:1,d:1},{k:'step_group',l:isAr?'مجموعة تبديل':'Swap Group',d:1},{k:'is_conditional',l:isAr?'شرطية؟':'Conditional?',opts:[{v:'false',l:isAr?'لا':'No'},{v:'true',l:isAr?'نعم':'Yes'}]},{k:'condition_note',l:isAr?'وصف الشرط':'Condition Note',w:1}],
ip:[{k:'service_id',l:isAr?'الخدمة':'Service',r:1,opts:subSvcs.map(s=>({v:s.id,l:isAr?s.name_ar:s.name_en||s.name_ar}))},{k:'label_ar',l:isAr?'اسم القسط':'Label (AR)',r:1},{k:'label_en',l:isAr?'بالإنجليزي':'Label (EN)',d:1},{k:'installment_order',l:isAr?'الترتيب':'Order',r:1,d:1},{k:'percentage',l:isAr?'النسبة %':'Percentage',d:1},{k:'fixed_amount',l:isAr?'مبلغ ثابت':'Fixed Amount',d:1},{k:'due_type',l:isAr?'نوع الاستحقاق':'Due Type',r:1,opts:[{v:'on_request',l:isAr?'عند رفع الطلب':'On Request'},{v:'after_days',l:isAr?'بعد عدد أيام':'After Days'},{v:'on_milestone',l:isAr?'عند إنجاز مرحلة':'On Milestone'},{v:'on_completion',l:isAr?'عند اكتمال المعاملة':'On Completion'}]},{k:'due_days',l:isAr?'عدد الأيام':'Days',d:1},{k:'milestone_id',l:isAr?'المرحلة':'Milestone',opts:[{v:'',l:'—'},...msList.map(m=>({v:m.id,l:m.name_ar}))]},{k:'is_active',l:isAr?'الحالة':'Status',opts:[{v:'true',l:isAr?'نشط':'Active'},{v:'false',l:isAr?'معطّل':'Inactive'}]}],
occ:[{k:'name_ar',l:isAr?'الاسم بالعربي':'Name (Arabic)',r:1},{k:'name_en',l:isAr?'الاسم بالإنجليزي':'Name (English)',d:1},{k:'code',l:isAr?'الرمز':'Code',d:1},{k:'classification',l:isAr?'التصنيف':'Classification',d:1},{k:'sort_order',l:isAr?'الترتيب':'Sort',d:1},{k:'saudi_only',l:isAr?'سعودي فقط':'Saudi Only',btn:1,opts:[{v:'false',l:isAr?'لا':'No'},{v:'true',l:isAr?'نعم':'Yes'}]},{k:'is_active',l:isAr?'الحالة':'Status',btn:1,opts:[{v:'true',l:isAr?'نشط':'Active'},{v:'false',l:isAr?'معطّل':'Inactive'}]}]
}
const popTitles={
r:form._id?(isAr?'تعديل منطقة':'Edit Region'):(isAr?'إضافة منطقة':'Add Region'),
c:form._id?(isAr?'تعديل مدينة':'Edit City'):(isAr?'إضافة مدينة':'Add City'),
co:form._id?(isAr?'تعديل دولة':'Edit Country'):(isAr?'إضافة دولة':'Add Country'),
em:form._id?(isAr?'تعديل سفارة':'Edit Embassy'):(isAr?'إضافة سفارة':'Add Embassy'),
ll:form._id?(isAr?'تعديل خانة':'Edit Category'):(isAr?'إضافة خانة':'Add Category'),
li:form._id?(isAr?'تعديل عنصر':'Edit Item'):(isAr?'إضافة عنصر':'Add Item'),
bnk:form._id?(isAr?'تعديل بنك':'Edit Bank'):(isAr?'إضافة بنك':'Add Bank'),
di:form._id?(isAr?'تعديل حي':'Edit District'):(isAr?'إضافة حي':'Add District'),
doc:form._id?(isAr?'تعديل وثيقة':'Edit Document'):(isAr?'إضافة وثيقة':'Add Document'),
sv:form._id?(isAr?'تعديل خدمة فرعية':'Edit Sub Service'):(isAr?'إضافة خدمة فرعية':'Add Sub Service'),
ss:form._id?(isAr?'تعديل خطوة':'Edit Step'):(isAr?'إضافة خطوة':'Add Step'),
tp:form._id?(isAr?'تعديل قالب':'Edit Template'):(isAr?'إضافة قالب معاملة':'Add Template'),
tl:form._id?(isAr?'تعديل ربط':'Edit Link'):(isAr?'ربط خدمة فرعية بقالب':'Link Sub Service'),
ip:form._id?(isAr?'تعديل قسط':'Edit Installment'):(isAr?'إضافة قسط جديد':'Add Installment'),
occ:form._id?(isAr?'تعديل مهنة':'Edit Occupation'):(isAr?'إضافة مهنة':'Add Occupation')
}

const fLItems=lItems.filter(i=>{if(listFilter&&i.category_id!==listFilter)return false;if(q)return(i.value_ar||'').includes(q)||(i.value_en||'').toLowerCase().includes(q.toLowerCase());return true})

return<div>
<style>{`
.jisr-icon-btn:hover{transform:translateY(-1px)}
.jisr-edit-btn:hover{background:linear-gradient(145deg,rgba(212,160,23,.28),rgba(212,160,23,.14))!important;border-color:rgba(212,160,23,.5)!important;box-shadow:0 4px 12px rgba(212,160,23,.18)}
.jisr-edit-btn:active{transform:translateY(0)}
.jisr-del-btn:hover{background:linear-gradient(145deg,rgba(192,57,43,.3),rgba(192,57,43,.12))!important;border-color:rgba(192,57,43,.55)!important;color:#e06157!important;box-shadow:0 4px 12px rgba(192,57,43,.2)}
.jisr-del-btn:active{transform:translateY(0)}
.jisr-list-row{transition:background .18s ease,box-shadow .18s ease}
.jisr-list-row:hover{background:rgba(212,160,23,.045)}
.jisr-list-row:last-child{border-bottom:none!important}
.jisr-drag-handle{transition:fill .18s ease,transform .18s ease}
.jisr-list-row:hover .jisr-drag-handle{fill:rgba(212,160,23,.9)!important;transform:scale(1.08)}
.jisr-copy-btn:hover{color:rgba(212,160,23,.95)!important}
.jisr-copy-btn:active{transform:scale(.9)}
`}</style>
<div style={{marginBottom:20}}>
<div style={{fontSize:20,fontWeight:700,color:'rgba(255,255,255,.93)'}}>{isAr?'الإعدادات والتصنيفات':'Settings & Categories'}</div>
<div style={{fontSize:12,color:'var(--tx4)',marginTop:6}}>{isAr?'إدارة البيانات الأساسية والتصنيفات':'Manage core data & categories'}</div>
</div>

{!defaultMainTab&&<div style={{display:'flex',gap:6,marginBottom:0,overflowX:'auto',scrollbarWidth:'none'}}>
{tabGroups.map(g=><div key={g.id} onClick={()=>{setMainTab(g.id);setTab(g.tabs[0].id);setQ('');setListFilter('')}} style={{padding:'10px 18px',fontSize:13,fontWeight:mainTab===g.id?800:600,color:mainTab===g.id?C.gold:'rgba(255,255,255,.55)',background:mainTab===g.id?'rgba(212,160,23,.08)':'transparent',border:'1px solid '+(mainTab===g.id?'rgba(212,160,23,.3)':'rgba(255,255,255,.06)'),borderBottom:'none',borderRadius:'8px 8px 0 0',cursor:'pointer',transition:'.15s',whiteSpace:'nowrap',flexShrink:0}}>{isAr?g.l:g.le}</div>)}
</div>}
<div style={{display:'flex',gap:0,marginBottom:20,borderTop:defaultMainTab?'none':'1px solid var(--bd)',borderBottom:'1px solid var(--bd)',overflowX:'auto',scrollbarWidth:'none',background:defaultMainTab?'transparent':'rgba(255,255,255,.015)'}}>
{currentGroup.tabs.map(t=><div key={t.id} onClick={()=>{setTab(t.id);setQ('');setListFilter('')}} style={{padding:'10px 16px',fontSize:12,fontWeight:tab===t.id?700:500,color:tab===t.id?C.gold:'rgba(255,255,255,.42)',borderBottom:tab===t.id?'2px solid '+C.gold:'2px solid transparent',cursor:'pointer',transition:'.15s',whiteSpace:'nowrap',flexShrink:0}}>{isAr?t.l:t.le}</div>)}
</div>

{tab==='general'&&<>
{/* ── Muqeem bot credentials — read by the DigitalOcean bot every cycle ── */}
<style>{`.muq-edit-btn{border-color:rgba(212,160,23,.45);color:rgba(212,160,23,.75);background:var(--bg);transition:.15s}.muq-edit-btn:hover{border-color:${C.gold};color:${C.gold}}.muq-save-btn{border-color:rgba(39,160,70,.5);color:rgba(39,160,70,.85);background:var(--bg);transition:.15s}.muq-save-btn:hover{border-color:${C.ok};color:${C.ok}}.muq-cancel-btn{border-color:rgba(192,57,43,.45);color:rgba(192,57,43,.8);background:var(--bg);transition:.15s}.muq-cancel-btn:hover{border-color:${C.red};color:${C.red}}.muq-in[data-editing] input:not([type=checkbox]):not([type=radio]):not([type=hidden]){border:1.5px solid rgba(255,255,255,.08)!important;box-shadow:none!important}.muq-in[data-editing] input:focus:not([type=checkbox]):not([type=radio]):not([type=hidden]){border-color:rgba(255,255,255,.22)!important}`}</style>
<div style={{marginBottom:26,marginTop:14}}>
<div style={{...secS,marginBottom:4}}><span style={{width:6,height:6,borderRadius:'50%',background:'#F28C28'}}/>{isAr?'بيانات دخول مقيم (البوت)':'Muqeem Bot Credentials'}</div>
{muqeemCreds.updated_at&&<div style={{fontSize:10,color:'var(--tx5)',fontWeight:500,textAlign:isAr?'right':'left',marginBottom:8,paddingRight:16,paddingLeft:16}}>{isAr?'آخر تحديث: ':'Last updated: '}{new Date(muqeemCreds.updated_at).toLocaleString('en-GB')}</div>}
<div className="muq-in" data-editing={muqeemEditing?'true':'false'} style={{position:'relative',padding:'26px 10px 10px',borderRadius:12,background:'rgba(255,255,255,.02)',border:'1px solid '+(muqeemEditing?'rgba(212,160,23,.35)':'rgba(255,255,255,.1)'),display:'flex',flexDirection:'column',gap:8}}>
{muqeemEditing
?<div style={{position:'absolute',top:-12,left:12,zIndex:2,display:'inline-flex',alignItems:'center',gap:6}}>
<button onClick={saveMuqeemCreds} disabled={muqeemSaving||!muqeemInputs.username||!muqeemInputs.password} title={isAr?'حفظ التعديلات':'Save changes'} className="muq-save-btn" style={{height:24,padding:'0 12px',border:'1px solid',borderRadius:6,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:5,opacity:(muqeemSaving||!muqeemInputs.username||!muqeemInputs.password)?0.5:1}}>
<span>{muqeemSaving?(isAr?'جارِ الحفظ...':'Saving...'):(isAr?'حفظ':'Save')}</span>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
</button>
<button onClick={cancelMuqeemEdit} title={isAr?'إلغاء التعديل بدون حفظ':'Cancel without saving'} className="muq-cancel-btn" style={{height:24,padding:'0 12px',border:'1px solid',borderRadius:6,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:5}}>
<span>{isAr?'إلغاء التعديل':'Cancel'}</span>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
</button>
</div>
:<button onClick={()=>{setMuqeemInputs({username:muqeemCreds.username||'',password:muqeemCreds.password||''});setMuqeemEditing(true)}} title={isAr?'تعديل بيانات مقيم':'Edit Muqeem credentials'} className="muq-edit-btn" style={{position:'absolute',top:-12,left:12,height:24,padding:'0 12px',border:'1px dashed',borderRadius:6,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer',zIndex:2,display:'inline-flex',alignItems:'center',gap:5}}>
<span>{isAr?'تعديل':'Edit'}</span>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
</button>}
<div style={{display:'flex',flexDirection:'column',gap:8,pointerEvents:muqeemEditing?'auto':'none',filter:muqeemEditing?'none':'saturate(.75)'}}>
<div style={{padding:'10px 14px',fontSize:11,color:'var(--tx5)',lineHeight:1.7,background:'rgba(242,140,40,.04)',border:'1px solid rgba(255,255,255,.04)',borderRadius:8}}>{isAr?'يستخدمها البوت على DigitalOcean لتسجيل الدخول إلى مقيم كل 10 دقائق. أي تغيير هنا يتم تطبيقه في الدورة التالية للبوت تلقائياً.':'Used by the DigitalOcean bot to log into Muqeem every 10 minutes. Changes here are picked up on the bot\'s next cycle automatically.'}</div>
<div style={{display:'flex',alignItems:'center',gap:14,padding:12,borderRadius:8,background:'rgba(0,0,0,.2)',border:'1px solid rgba(255,255,255,.04)'}}>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:13,fontWeight:600,color:'var(--tx)',marginBottom:2}}>{isAr?'اسم المستخدم':'Username'}</div>
<div style={{fontSize:10,color:'var(--tx5)',fontFamily:'monospace',direction:'ltr',textAlign:'right'}}>MUQEEM_USERNAME</div>
</div>
<input value={muqeemInputs.username} onChange={e=>setMuqeemInputs(p=>({...p,username:e.target.value}))} readOnly={!muqeemEditing} autoComplete="off" style={{width:260,height:36,padding:'0 12px',borderRadius:8,fontFamily:F,fontSize:12,fontWeight:600,color:'var(--tx)',background:'rgba(255,255,255,.05)',outline:'none',direction:'ltr',textAlign:'center'}}/>
</div>
<div style={{display:'flex',alignItems:'center',gap:14,padding:12,borderRadius:8,background:'rgba(0,0,0,.2)',border:'1px solid rgba(255,255,255,.04)'}}>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:13,fontWeight:600,color:'var(--tx)',marginBottom:2}}>{isAr?'كلمة المرور':'Password'}</div>
<div style={{fontSize:10,color:'var(--tx5)',fontFamily:'monospace',direction:'ltr',textAlign:'right'}}>MUQEEM_PASSWORD</div>
</div>
<div style={{position:'relative',width:260}}>
<input type={muqeemShowPw?'text':'password'} value={muqeemInputs.password} onChange={e=>setMuqeemInputs(p=>({...p,password:e.target.value}))} readOnly={!muqeemEditing} autoComplete="new-password" style={{width:'100%',height:36,padding:'0 38px 0 12px',borderRadius:8,fontFamily:F,fontSize:12,fontWeight:600,color:'var(--tx)',background:'rgba(255,255,255,.05)',outline:'none',direction:'ltr',textAlign:'center',boxSizing:'border-box'}}/>
<button type="button" onClick={()=>setMuqeemShowPw(s=>!s)} style={{position:'absolute',top:'50%',left:8,transform:'translateY(-50%)',width:24,height:24,borderRadius:6,border:'none',background:'transparent',color:'var(--tx5)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}} title={muqeemShowPw?(isAr?'إخفاء':'Hide'):(isAr?'إظهار':'Show')}>
{muqeemShowPw?<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
</button>
</div>
</div>
</div>
</div>
</div>

{/* ── SBC (Saudi Business Center) bot credentials — same pattern as Muqeem ── */}
<div style={{marginBottom:26}}>
<div style={{...secS,marginBottom:4}}><span style={{width:6,height:6,borderRadius:'50%',background:'#D4A017'}}/>{isAr?'بيانات دخول المركز السعودي للأعمال (البوت)':'SBC Bot Credentials'}</div>
{sbcCreds.updated_at&&<div style={{fontSize:10,color:'var(--tx5)',fontWeight:500,textAlign:isAr?'right':'left',marginBottom:8,paddingRight:16,paddingLeft:16}}>{isAr?'آخر تحديث: ':'Last updated: '}{new Date(sbcCreds.updated_at).toLocaleString('en-GB')}</div>}
<div className="muq-in" data-editing={sbcEditing?'true':'false'} style={{position:'relative',padding:'26px 10px 10px',borderRadius:12,background:'rgba(255,255,255,.02)',border:'1px solid '+(sbcEditing?'rgba(212,160,23,.35)':'rgba(255,255,255,.1)'),display:'flex',flexDirection:'column',gap:8}}>
{sbcEditing
?<div style={{position:'absolute',top:-12,left:12,zIndex:2,display:'inline-flex',alignItems:'center',gap:6}}>
<button onClick={saveSbcCreds} disabled={sbcSaving||!sbcInputs.username||!sbcInputs.password} title={isAr?'حفظ التعديلات':'Save changes'} className="muq-save-btn" style={{height:24,padding:'0 12px',border:'1px solid',borderRadius:6,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:5,opacity:(sbcSaving||!sbcInputs.username||!sbcInputs.password)?0.5:1}}>
<span>{sbcSaving?(isAr?'جارِ الحفظ...':'Saving...'):(isAr?'حفظ':'Save')}</span>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
</button>
<button onClick={cancelSbcEdit} title={isAr?'إلغاء التعديل بدون حفظ':'Cancel without saving'} className="muq-cancel-btn" style={{height:24,padding:'0 12px',border:'1px solid',borderRadius:6,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:5}}>
<span>{isAr?'إلغاء التعديل':'Cancel'}</span>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
</button>
</div>
:<button onClick={()=>{setSbcInputs({username:sbcCreds.username||'',password:sbcCreds.password||''});setSbcEditing(true)}} title={isAr?'تعديل بيانات المركز السعودي':'Edit SBC credentials'} className="muq-edit-btn" style={{position:'absolute',top:-12,left:12,height:24,padding:'0 12px',border:'1px dashed',borderRadius:6,fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer',zIndex:2,display:'inline-flex',alignItems:'center',gap:5}}>
<span>{isAr?'تعديل':'Edit'}</span>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
</button>}
<div style={{display:'flex',flexDirection:'column',gap:8,pointerEvents:sbcEditing?'auto':'none',filter:sbcEditing?'none':'saturate(.75)'}}>
<div style={{padding:'10px 14px',fontSize:11,color:'var(--tx5)',lineHeight:1.7,background:'rgba(212,160,23,.04)',border:'1px solid rgba(255,255,255,.04)',borderRadius:8}}>{isAr?'يستخدمها البوت للدخول إلى نفاذ ثم بوابة تيسير (المركز السعودي للأعمال). رمز التحقق يصل إلى قاعدة البيانات تلقائياً.':'Used by the bot to log into Nafath then Tayseer (SBC). The OTP arrives in the database automatically.'}</div>
<div style={{display:'flex',alignItems:'center',gap:14,padding:12,borderRadius:8,background:'rgba(0,0,0,.2)',border:'1px solid rgba(255,255,255,.04)'}}>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:13,fontWeight:600,color:'var(--tx)',marginBottom:2}}>{isAr?'اسم المستخدم (هوية نفاذ)':'Username (Nafath ID)'}</div>
<div style={{fontSize:10,color:'var(--tx5)',fontFamily:'monospace',direction:'ltr',textAlign:'right'}}>SBC_USERNAME</div>
</div>
<input value={sbcInputs.username} onChange={e=>setSbcInputs(p=>({...p,username:e.target.value}))} readOnly={!sbcEditing} autoComplete="off" style={{width:260,height:36,padding:'0 12px',borderRadius:8,fontFamily:F,fontSize:12,fontWeight:600,color:'var(--tx)',background:'rgba(255,255,255,.05)',outline:'none',direction:'ltr',textAlign:'center'}}/>
</div>
<div style={{display:'flex',alignItems:'center',gap:14,padding:12,borderRadius:8,background:'rgba(0,0,0,.2)',border:'1px solid rgba(255,255,255,.04)'}}>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:13,fontWeight:600,color:'var(--tx)',marginBottom:2}}>{isAr?'كلمة المرور':'Password'}</div>
<div style={{fontSize:10,color:'var(--tx5)',fontFamily:'monospace',direction:'ltr',textAlign:'right'}}>SBC_PASSWORD</div>
</div>
<div style={{position:'relative',width:260}}>
<input type={sbcShowPw?'text':'password'} value={sbcInputs.password} onChange={e=>setSbcInputs(p=>({...p,password:e.target.value}))} readOnly={!sbcEditing} autoComplete="new-password" style={{width:'100%',height:36,padding:'0 38px 0 12px',borderRadius:8,fontFamily:F,fontSize:12,fontWeight:600,color:'var(--tx)',background:'rgba(255,255,255,.05)',outline:'none',direction:'ltr',textAlign:'center',boxSizing:'border-box'}}/>
<button type="button" onClick={()=>setSbcShowPw(s=>!s)} style={{position:'absolute',top:'50%',left:8,transform:'translateY(-50%)',width:24,height:24,borderRadius:6,border:'none',background:'transparent',color:'var(--tx5)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0}} title={sbcShowPw?(isAr?'إخفاء':'Hide'):(isAr?'إظهار':'Show')}>
{sbcShowPw?<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
</button>
</div>
</div>
</div>
</div>
</div>

{/* GENERAL — system_settings categories */}
{sLoading?<div style={{textAlign:'center',padding:60,color:'var(--tx5)'}}>...</div>:
[{k:'general',l:'معلومات الموقع',le:'Website Info'},
{k:'invoice',l:'الفوترة والبادئات',le:'Invoicing & Prefixes'},
{k:'defaults',l:'القيم الافتراضية',le:'Defaults'},
{k:'reminders',l:'التنبيهات (أيام قبل الانتهاء)',le:'Reminders'},
{k:'system',l:'النظام والأمان',le:'System & Security'}
].map(cat=>{const items=sData.filter(s=>s.category===cat.k);if(!items.length)return null;return<div key={cat.k} style={{marginBottom:20}}>
<div style={{...secS,marginBottom:8}}><span style={{width:6,height:6,borderRadius:'50%',background:cat.k==='reminders'?C.red:cat.k==='system'?C.blue:C.gold}}/>{isAr?cat.l:cat.le}<span style={{fontSize:10,color:'var(--tx5)'}}>{items.length}</span></div>
<div style={cardS}>{items.map((s,i)=><div key={s.id} style={{display:'flex',alignItems:'center',padding:'12px 18px',borderBottom:i<items.length-1?'1px solid rgba(255,255,255,.04)':'none',gap:14}}>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:13,fontWeight:600,color:'var(--tx)',marginBottom:2}}>{isAr?s.label_ar:s.label_en||s.setting_key}</div>
<div style={{fontSize:10,color:'var(--tx5)',fontFamily:'monospace',direction:'ltr'}}>{s.setting_key}</div>
</div>
{s.input_type==='boolean'?
<div style={{display:'flex',gap:4}}>
{[{v:'true',l:isAr?'نعم':'Yes'},{v:'false',l:isAr?'لا':'No'}].map(o=>{const on=s.setting_value===o.v;return<button key={o.v} onClick={()=>{saveSetting(s.setting_key,o.v);setSData(p=>p.map(x=>x.id===s.id?{...x,setting_value:o.v}:x))}} style={{height:32,padding:'0 14px',borderRadius:8,border:on?'1.5px solid rgba(212,160,23,.4)':'1.5px solid rgba(255,255,255,.1)',background:on?'rgba(212,160,23,.15)':'transparent',color:on?C.gold:'var(--tx5)',fontFamily:F,fontSize:11,fontWeight:on?700:500,cursor:'pointer'}}>{o.l}</button>})}
</div>
:s.input_type==='textarea'?
<textarea defaultValue={s.setting_value||''} onBlur={e=>saveSetting(s.setting_key,e.target.value)} rows={2} style={{width:260,padding:'8px 12px',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:8,fontFamily:F,fontSize:12,fontWeight:600,color:'var(--tx)',background:'rgba(255,255,255,.05)',outline:'none',resize:'vertical',direction:s.setting_key.includes('_ar')||s.setting_key.includes('label')?'rtl':'ltr'}}/>
:s.input_type==='number'?
<input type="number" defaultValue={s.setting_value||''} onBlur={e=>saveSetting(s.setting_key,e.target.value)} style={{width:120,height:36,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:8,fontFamily:F,fontSize:13,fontWeight:700,color:C.gold,background:'rgba(255,255,255,.05)',outline:'none',textAlign:'center',direction:'ltr'}}/>
:
<input defaultValue={s.setting_value||''} onBlur={e=>saveSetting(s.setting_key,e.target.value)} style={{width:260,height:36,padding:'0 12px',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:8,fontFamily:F,fontSize:12,fontWeight:600,color:'var(--tx)',background:'rgba(255,255,255,.05)',outline:'none',direction:s.setting_key.includes('_ar')?'rtl':'ltr',textAlign:s.setting_key.includes('_ar')?'right':'left'}}/>
}
</div>)}</div>
</div>})}</>}

{/* REGIONS & CITIES — designed like Nationalities & Embassies */}
{tab==='regions_cities'&&(()=>{
const qLower=(q||'').toLowerCase()
const regMatchChild=new Set()
if(q){
  cities.forEach(c=>{if((c.name_ar||'').includes(q)||(c.name_en||'').toLowerCase().includes(qLower)||(c.code||'').includes(q))regMatchChild.add(c.region_id)})
  districtsList.forEach(d=>{const city=cities.find(c=>c.id===d.city_id);if(city&&((d.name_ar||'').includes(q)||(d.name_en||'').toLowerCase().includes(qLower)||(d.code||'').includes(q)))regMatchChild.add(city.region_id)})
}
const filtered=q?regions.filter(r=>(r.name_ar||'').includes(q)||(r.name_en||'').toLowerCase().includes(qLower)||(r.code||'').includes(q)||regMatchChild.has(r.id)):regions
const onDragStart=(e,idx)=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(idx))}
const onDragOver=(e)=>{e.preventDefault();e.dataTransfer.dropEffect='move'}
const onDrop=async(e,dropIdx)=>{
  e.preventDefault()
  const fromIdx=parseInt(e.dataTransfer.getData('text/plain'),10)
  if(isNaN(fromIdx)||fromIdx===dropIdx||q)return
  const next=[...regions]
  const[moved]=next.splice(fromIdx,1)
  next.splice(dropIdx,0,moved)
  setRegions(next.map((o,i)=>({...o,sort_order:i+1})))
  for(let i=0;i<next.length;i++){await sb.from('regions').update({sort_order:i+1}).eq('id',next[i].id)}
}
return<>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,gap:12,flexWrap:'wrap'}}>
<div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}><span style={{width:8,height:8,borderRadius:'50%',background:C.gold}}/><span style={{fontSize:16,fontWeight:800,color:'rgba(255,255,255,.95)'}}>{isAr?'المناطق والمدن والأحياء':'Regions, Cities & Districts'}</span><span style={{fontSize:11,color:'var(--tx5)'}}>{(q?filtered.length:regions.length)} {isAr?'منطقة':'regions'} · {cities.length} {isAr?'مدينة':'cities'}</span></div>
<div style={{display:'flex',gap:8,alignItems:'center',flex:'1 1 280px',minWidth:0,justifyContent:'flex-end'}}>
<div style={{position:'relative',flex:'1 1 200px',minWidth:160,maxWidth:460}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{position:'absolute',top:'50%',right:isAr?12:'auto',left:isAr?'auto':12,transform:'translateY(-50%)',pointerEvents:'none'}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
<input value={q} onChange={e=>setQ(e.target.value)} placeholder={isAr?'ابحث بالعربي أو الإنجليزي أو الكود...':'Search AR/EN/code...'} style={{width:'100%',height:36,padding:isAr?'0 34px 0 12px':'0 12px 0 34px',borderRadius:8,border:'1px solid rgba(255,255,255,.12)',background:'rgba(0,0,0,.25)',color:'var(--tx)',fontFamily:F,fontSize:12,outline:'none',minWidth:0,boxSizing:'border-box'}}/>
</div>
<button onClick={()=>{const maxOrder=regions.reduce((m,o)=>Math.max(m,Number(o.sort_order)||0),0);setForm({_table:'regions',name_ar:'',name_en:'',code:'',sort_order:String(maxOrder+1),is_active:'true'});setPop('r')}} style={{...bS,height:36,flexShrink:0}}>{isAr?'منطقة':'Region'} +</button>
</div></div>
<div style={cardS}>{filtered.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)',fontSize:12}}>{isAr?'لا توجد مناطق':'No regions'}</div>:<>
{filtered.map((r,idx)=>{const rActive=r.is_active!==false;const toggleRegion=async()=>{const next=!rActive;setRegions(p=>p.map(o=>o.id===r.id?{...o,is_active:next}:o));await sb.from('regions').update({is_active:next}).eq('id',r.id)};const rc=cities.filter(c=>c.region_id===r.id);const citiesKey='r_'+r.id;const citiesOpen=!!open[citiesKey]||(q&&regMatchChild.has(r.id));const addCity=()=>{const maxOrder=rc.reduce((m,o)=>Math.max(m,Number(o.sort_order)||0),0);setForm({_table:'cities',region_id:r.id,name_ar:'',name_en:'',code:'',sort_order:String(maxOrder+1),is_active:'true'});setPop('c')};return<div key={r.id}>
<div className="jisr-list-row" draggable={!q} onDragStart={e=>onDragStart(e,idx)} onDragOver={onDragOver} onDrop={e=>onDrop(e,idx)} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',borderBottom:citiesOpen?'1px solid rgba(212,160,23,.15)':'1px solid rgba(255,255,255,.05)',cursor:q?'default':'grab',opacity:rActive?1:0.55,flexWrap:'wrap'}}>
{!q&&<svg className="jisr-drag-handle" width="16" height="24" viewBox="0 0 16 24" fill="rgba(255,255,255,.45)" style={{flexShrink:0,cursor:'grab'}} aria-label="drag"><circle cx="3" cy="6" r="1.1"/><circle cx="8" cy="6" r="1.1"/><circle cx="13" cy="6" r="1.1"/><circle cx="3" cy="12" r="1.1"/><circle cx="8" cy="12" r="1.1"/><circle cx="13" cy="12" r="1.1"/><circle cx="3" cy="18" r="1.1"/><circle cx="8" cy="18" r="1.1"/><circle cx="13" cy="18" r="1.1"/></svg>}
<span style={{display:'inline-flex',alignItems:'baseline',fontSize:15,fontWeight:800,color:C.gold,direction:'ltr',minWidth:32,textAlign:'center',justifyContent:'center',flexShrink:0,letterSpacing:.2}}><span style={{opacity:.5,fontWeight:700,fontSize:11,marginInlineEnd:2}}>#</span>{r.sort_order||'—'}</span>
<div style={{flex:'1 1 180px',display:'flex',flexDirection:'column',gap:2,minWidth:140,alignItems:'flex-start'}}>
<div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
<span style={{fontSize:14,fontWeight:700,color:'rgba(255,255,255,.95)'}}>{r.name_ar}</span>
<CopyBtn text={r.name_ar} toast={toast} isAr={isAr}/>
</div>
{r.name_en&&<div style={{display:'flex',alignItems:'center',gap:6}}><span style={{fontSize:12,color:'rgba(255,255,255,.65)',direction:'ltr'}}>{r.name_en}</span><CopyBtn text={r.name_en} toast={toast} isAr={isAr}/></div>}
</div>
<div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0,marginInlineStart:'auto',flexWrap:'wrap',justifyContent:'flex-end'}}>
{r.code&&<span style={{fontSize:11,color:'rgba(255,255,255,.7)',fontFamily:'monospace',direction:'ltr',background:'rgba(255,255,255,.06)',padding:'3px 8px',borderRadius:5,flexShrink:0}}>{r.code}</span>}
<button type="button" onClick={(e)=>{e.stopPropagation();toggleRegion()}} title={rActive?(isAr?'نشطة (تظهر في القوائم)':'Active (visible in dropdowns)'):(isAr?'إخفاء من القوائم':'Hide from dropdowns')} style={{width:36,height:20,borderRadius:999,border:'none',background:rActive?'#27a046':'rgba(255,255,255,.15)',cursor:'pointer',position:'relative',transition:'.2s',padding:0,flexShrink:0}}>
<span style={{position:'absolute',width:16,height:16,borderRadius:'50%',background:'#fff',top:2,right:rActive?2:18,transition:'.2s',boxShadow:'0 1px 3px rgba(0,0,0,.3)'}}/>
</button>
<button type="button" onClick={e=>{e.stopPropagation();toggle(citiesKey)}} title={isAr?'المدن':'Cities'} style={{display:'inline-flex',alignItems:'center',gap:5,height:28,padding:'0 10px',borderRadius:7,border:'1px solid '+(citiesOpen?'rgba(52,131,180,.5)':'rgba(52,131,180,.22)'),background:citiesOpen?'rgba(52,131,180,.15)':'rgba(52,131,180,.07)',color:'rgba(52,131,180,.95)',fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer',flexShrink:0,transition:'.15s'}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1"/></svg>
<span>{rc.length}</span>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{transition:'.18s',transform:citiesOpen?'rotate(180deg)':'none'}}><polyline points="6 9 12 15 18 9"/></svg>
</button>
<div style={{display:'flex',gap:4,flexShrink:0}}>
<EditBtn onClick={()=>{setForm({_table:'regions',_id:r.id,name_ar:r.name_ar||'',name_en:r.name_en||'',code:r.code||'',sort_order:r.sort_order||'',is_active:String(r.is_active!==false)});setPop('r')}}/>
<DelBtn onClick={()=>askDel('regions',r.id,r.name_ar)}/>
</div></div></div>
{citiesOpen&&<div style={{background:'rgba(52,131,180,.03)',borderBottom:'1px solid rgba(255,255,255,.05)',padding:'6px 16px 10px'}}>
{rc.length===0?<div style={{padding:'10px 44px',color:'var(--tx6)',fontSize:11}}>{isAr?'لا توجد مدن لهذه المنطقة':'No cities for this region'}</div>:
rc.map(c=>{const cActive=c.is_active!==false;const toggleCity=async()=>{const next=!cActive;setCities(p=>p.map(x=>x.id===c.id?{...x,is_active:next}:x));await sb.from('cities').update({is_active:next}).eq('id',c.id)};const cd=districtsList.filter(d=>d.city_id===c.id);const distKey='c_'+c.id;const distOpen=!!open[distKey];return<div key={c.id}>
<div style={{display:'flex',alignItems:'center',gap:10,padding:'7px 14px 7px 20px',borderBottom:distOpen?'1px dashed rgba(39,160,70,.18)':'1px dashed rgba(255,255,255,.04)',opacity:cActive?1:0.55,flexWrap:'wrap'}}>
<div style={{width:5,height:5,borderRadius:'50%',background:'rgba(52,131,180,.7)',flexShrink:0}}/>
<div style={{flex:'1 1 180px',display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
<span style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,.85)'}}>{c.name_ar}</span>
<CopyBtn text={c.name_ar} toast={toast} isAr={isAr}/>
{c.name_en&&<span style={{fontSize:11,color:'var(--tx5)',direction:'ltr'}}>{c.name_en}</span>}
{c.code&&<span style={{fontSize:10,color:'rgba(255,255,255,.55)',fontFamily:'monospace',direction:'ltr',background:'rgba(255,255,255,.04)',padding:'2px 6px',borderRadius:4}}>{c.code}</span>}
</div>
<button type="button" onClick={(ev)=>{ev.stopPropagation();toggleCity()}} title={cActive?(isAr?'نشطة':'Active'):(isAr?'معطّلة':'Inactive')} style={{width:32,height:18,borderRadius:999,border:'none',background:cActive?'#27a046':'rgba(255,255,255,.15)',cursor:'pointer',position:'relative',transition:'.2s',padding:0,flexShrink:0}}>
<span style={{position:'absolute',width:14,height:14,borderRadius:'50%',background:'#fff',top:2,right:cActive?2:16,transition:'.2s',boxShadow:'0 1px 3px rgba(0,0,0,.3)'}}/>
</button>
<button type="button" onClick={e=>{e.stopPropagation();toggle(distKey)}} title={isAr?'الأحياء':'Districts'} style={{display:'inline-flex',alignItems:'center',gap:5,height:26,padding:'0 9px',borderRadius:6,border:'1px solid '+(distOpen?'rgba(39,160,70,.5)':'rgba(39,160,70,.22)'),background:distOpen?'rgba(39,160,70,.15)':'rgba(39,160,70,.07)',color:'rgba(39,160,70,.95)',fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer',flexShrink:0,transition:'.15s'}}>
<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
<span>{cd.length}</span>
<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{transition:'.18s',transform:distOpen?'rotate(180deg)':'none'}}><polyline points="6 9 12 15 18 9"/></svg>
</button>
<div style={{display:'flex',gap:4,flexShrink:0}}>
<EditBtn onClick={()=>{setForm({_table:'cities',_id:c.id,name_ar:c.name_ar||'',name_en:c.name_en||'',code:c.code||'',region_id:c.region_id||r.id,sort_order:c.sort_order||'',is_active:String(c.is_active!==false)});setPop('c')}}/>
<DelBtn onClick={()=>askDel('cities',c.id,c.name_ar)}/>
</div></div>
{distOpen&&<div style={{background:'rgba(39,160,70,.02)',padding:'6px 28px 10px'}}>
{cd.length===0?<div style={{padding:'10px 28px',color:'var(--tx6)',fontSize:11}}>{isAr?'لا توجد أحياء لهذه المدينة':'No districts for this city'}</div>:
cd.map(d=>{const dActive=d.is_active!==false;const toggleDist=async()=>{const next=!dActive;setDistrictsList(p=>p.map(x=>x.id===d.id?{...x,is_active:next}:x));await sb.from('districts').update({is_active:next}).eq('id',d.id)};return<div key={d.id} style={{display:'flex',alignItems:'center',gap:10,padding:'6px 12px',borderBottom:'1px dotted rgba(255,255,255,.04)',opacity:dActive?1:0.5,flexWrap:'wrap'}}>
<span style={{width:3,height:3,borderRadius:'50%',background:C.ok,flexShrink:0}}/>
<div style={{flex:'1 1 150px',display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
<span style={{fontSize:12,color:'rgba(255,255,255,.72)'}}>{d.name_ar}</span>
<CopyBtn text={d.name_ar} toast={toast} isAr={isAr}/>
{d.name_en&&<span style={{fontSize:10,color:'var(--tx6)',direction:'ltr'}}>{d.name_en}</span>}
{d.code&&<span style={{fontSize:9,color:'var(--tx6)',fontFamily:'monospace',direction:'ltr',background:'rgba(255,255,255,.04)',padding:'2px 5px',borderRadius:4}}>{d.code}</span>}
</div>
<button type="button" onClick={(ev)=>{ev.stopPropagation();toggleDist()}} title={dActive?(isAr?'نشط':'Active'):(isAr?'معطّل':'Inactive')} style={{width:28,height:16,borderRadius:999,border:'none',background:dActive?'#27a046':'rgba(255,255,255,.15)',cursor:'pointer',position:'relative',transition:'.2s',padding:0,flexShrink:0}}>
<span style={{position:'absolute',width:12,height:12,borderRadius:'50%',background:'#fff',top:2,right:dActive?2:14,transition:'.2s',boxShadow:'0 1px 3px rgba(0,0,0,.3)'}}/>
</button>
<div style={{display:'flex',gap:3,flexShrink:0}}>
<EditBtn onClick={()=>{setForm({_table:'districts',_id:d.id,city_id:d.city_id||c.id,name_ar:d.name_ar||'',name_en:d.name_en||'',code:d.code||'',sort_order:d.sort_order||'',is_active:String(d.is_active!==false)});setPop('di')}}/>
<DelBtn onClick={()=>askDel('districts',d.id,d.name_ar)}/>
</div></div>})}
<div style={{padding:'8px 12px 2px 28px'}}>
<button type="button" onClick={()=>{const maxOrder=cd.reduce((m,o)=>Math.max(m,Number(o.sort_order)||0),0);setForm({_table:'districts',city_id:c.id,name_ar:'',name_en:'',code:'',sort_order:String(maxOrder+1),is_active:'true'});setPop('di')}} style={{display:'inline-flex',alignItems:'center',gap:6,height:28,padding:'0 12px',borderRadius:7,border:'1px dashed rgba(39,160,70,.45)',background:'rgba(39,160,70,.08)',color:'rgba(39,160,70,.95)',fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer',transition:'.15s'}}>
<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
<span>{isAr?'إضافة حي':'Add District'}</span>
</button>
</div>
</div>}
</div>})}
<div style={{padding:'8px 14px 2px 20px'}}>
<button type="button" onClick={addCity} style={{display:'inline-flex',alignItems:'center',gap:6,height:30,padding:'0 14px',borderRadius:8,border:'1px dashed rgba(52,131,180,.45)',background:'rgba(52,131,180,.08)',color:'rgba(52,131,180,.95)',fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer',transition:'.15s'}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
<span>{isAr?'إضافة مدينة':'Add City'}</span>
</button>
</div>
</div>}
</div>})}
</>}</div>
</>})()}

{/* OCCUPATIONS */}
{tab==='occupations'&&(()=>{
const filtered=q?occupationsList.filter(i=>(i.name_ar||'').includes(q)||(i.name_en||'').toLowerCase().includes(q.toLowerCase())||(i.code||'').includes(q)):occupationsList
const maxShow=2000
const shown=filtered.slice(0,maxShow)
const onDragStart=(e,idx)=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(idx))}
const onDragOver=(e)=>{e.preventDefault();e.dataTransfer.dropEffect='move'}
const onDrop=async(e,dropIdx)=>{
e.preventDefault()
const fromIdx=parseInt(e.dataTransfer.getData('text/plain'),10)
if(isNaN(fromIdx)||fromIdx===dropIdx||q)return
const next=[...occupationsList]
const[moved]=next.splice(fromIdx,1)
next.splice(dropIdx,0,moved)
setOccupationsList(next.map((o,i)=>({...o,sort_order:i+1})))
const updates=next.map((o,i)=>({id:o.id,sort_order:i+1}))
const affected=updates.filter((u,i)=>occupationsList[i]?.id!==u.id||occupationsList[i]?.sort_order!==u.sort_order)
if(affected.length){
const rowsToPersist=affected.map(u=>({id:u.id,sort_order:u.sort_order}))
for(const row of rowsToPersist){await sb.from('occupations').update({sort_order:row.sort_order}).eq('id',row.id)}
}
}
return<>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,gap:12,flexWrap:'wrap'}}>
<div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}><span style={{width:8,height:8,borderRadius:'50%',background:C.gold}}/><span style={{fontSize:16,fontWeight:800,color:'rgba(255,255,255,.95)'}}>{isAr?'المهن':'Occupations'}</span><span style={{fontSize:11,color:'var(--tx5)'}}>{(q?filtered.length:occupationsList.length)} {isAr?'مهنة':'occupations'}</span></div>
<div style={{display:'flex',gap:8,alignItems:'center',flex:'1 1 280px',minWidth:0,justifyContent:'flex-end'}}>
<div style={{position:'relative',flex:'1 1 200px',minWidth:160,maxWidth:460}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{position:'absolute',top:'50%',right:isAr?12:'auto',left:isAr?'auto':12,transform:'translateY(-50%)',pointerEvents:'none'}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
<input value={q} onChange={e=>setQ(e.target.value)} placeholder={isAr?'ابحث بالعربي أو الإنجليزي أو الكود...':'Search AR/EN/code...'} style={{width:'100%',height:36,padding:isAr?'0 34px 0 12px':'0 12px 0 34px',borderRadius:8,border:'1px solid rgba(255,255,255,.12)',background:'rgba(0,0,0,.25)',color:'var(--tx)',fontFamily:F,fontSize:12,outline:'none',minWidth:0,boxSizing:'border-box'}}/>
</div>
<button onClick={()=>{const maxOrder=occupationsList.reduce((m,o)=>Math.max(m,Number(o.sort_order)||0),0);setForm({_table:'occupations',name_ar:'',name_en:'',code:'',qiwa_id:'',classification:'',saudi_only:'false',is_active:'true',sort_order:String(maxOrder+1)});setPop('occ')}} style={{...bS,height:36,flexShrink:0}}>{isAr?'مهنة':'Occupation'} +</button>
</div></div>
<div style={cardS}>{filtered.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)',fontSize:12}}>{isAr?'لا توجد مهن':'No occupations'}</div>:<>
{shown.map((it,idx)=>{const active=it.is_active!==false;const toggleActive=async()=>{const next=!active;setOccupationsList(p=>p.map(o=>o.id===it.id?{...o,is_active:next}:o));await sb.from('occupations').update({is_active:next}).eq('id',it.id)};return<div key={it.id} className="jisr-list-row" draggable={!q} onDragStart={e=>onDragStart(e,idx)} onDragOver={onDragOver} onDrop={e=>onDrop(e,idx)} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',borderBottom:'1px solid rgba(255,255,255,.05)',cursor:q?'default':'grab',opacity:active?1:0.55,flexWrap:'wrap'}}>
{!q&&<svg className="jisr-drag-handle" width="16" height="24" viewBox="0 0 16 24" fill="rgba(255,255,255,.45)" style={{flexShrink:0,cursor:'grab'}} aria-label="drag"><circle cx="3" cy="6" r="1.1"/><circle cx="8" cy="6" r="1.1"/><circle cx="13" cy="6" r="1.1"/><circle cx="3" cy="12" r="1.1"/><circle cx="8" cy="12" r="1.1"/><circle cx="13" cy="12" r="1.1"/><circle cx="3" cy="18" r="1.1"/><circle cx="8" cy="18" r="1.1"/><circle cx="13" cy="18" r="1.1"/></svg>}
<span style={{display:'inline-flex',alignItems:'baseline',fontSize:15,fontWeight:800,color:C.gold,direction:'ltr',minWidth:32,textAlign:'center',justifyContent:'center',flexShrink:0,letterSpacing:.2}}><span style={{opacity:.5,fontWeight:700,fontSize:11,marginInlineEnd:2}}>#</span>{it.sort_order||'—'}</span>
<div style={{flex:'1 1 180px',display:'flex',flexDirection:'column',gap:2,minWidth:140,alignItems:'flex-start'}}>
<div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
<span style={{fontSize:14,fontWeight:700,color:'rgba(255,255,255,.95)'}}>{it.name_ar}</span>
<CopyBtn text={it.name_ar} toast={toast} isAr={isAr}/>
{it.saudi_only&&<span style={{fontSize:10,color:'#27a046',background:'rgba(0,108,53,.15)',border:'1px solid rgba(0,108,53,.45)',padding:'2px 8px',borderRadius:5,fontWeight:700,flexShrink:0}}>{isAr?'سعودي فقط':'Saudi only'}</span>}
</div>
{it.name_en&&<div style={{display:'flex',alignItems:'center',gap:6}}><span style={{fontSize:12,color:'rgba(255,255,255,.65)',direction:'ltr'}}>{it.name_en}</span><CopyBtn text={it.name_en} toast={toast} isAr={isAr}/></div>}
</div>
<div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0,marginInlineStart:'auto',flexWrap:'wrap',justifyContent:'flex-end'}}>
{it.code&&<span style={{fontSize:11,color:'rgba(255,255,255,.7)',fontFamily:'monospace',direction:'ltr',background:'rgba(255,255,255,.06)',padding:'3px 8px',borderRadius:5,flexShrink:0}}>{it.code}</span>}
<button type="button" onClick={(e)=>{e.stopPropagation();toggleActive()}} title={active?(isAr?'نشط (يظهر في القوائم)':'Active (visible in dropdowns)'):(isAr?'إخفاء من القوائم':'Hide from dropdowns')} style={{width:36,height:20,borderRadius:999,border:'none',background:active?'#27a046':'rgba(255,255,255,.15)',cursor:'pointer',position:'relative',transition:'.2s',padding:0,flexShrink:0}}>
<span style={{position:'absolute',width:16,height:16,borderRadius:'50%',background:'#fff',top:2,right:active?2:18,transition:'.2s',boxShadow:'0 1px 3px rgba(0,0,0,.3)'}}/>
</button>
<div style={{display:'flex',gap:4,flexShrink:0}}>
<EditBtn onClick={()=>{setForm({_table:'occupations',_id:it.id,name_ar:it.name_ar||'',name_en:it.name_en||'',code:it.code||'',qiwa_id:it.qiwa_id||'',classification:it.classification||'',saudi_only:String(it.saudi_only===true),is_active:String(it.is_active!==false),sort_order:it.sort_order||''});setPop('occ')}}/>
<DelBtn onClick={()=>askDel('occupations',it.id,it.name_ar)}/>
</div></div></div>})}
{filtered.length>maxShow&&<div style={{textAlign:'center',padding:16,color:'var(--tx6)',fontSize:11}}>{isAr?`… و ${filtered.length-maxShow} مهنة أخرى. استخدم البحث لتضييق النتائج.`:`… and ${filtered.length-maxShow} more. Use search to narrow.`}</div>}
</>}</div>
</>})()}

{/* NATIONALITIES (dedicated table) */}
{tab==='nationalities'&&(()=>{
const qLower=(q||'').toLowerCase()
const natMatchEmb=new Set()
if(q){embList.forEach(e=>{if((e.name_ar||'').includes(q)||(e.name_en||'').toLowerCase().includes(qLower))natMatchEmb.add(e.nationality_id)})}
const filtered=q?natList.filter(i=>(i.name_ar||'').includes(q)||(i.name_en||'').toLowerCase().includes(qLower)||(i.code||'').includes(q)||(i.country_name_ar||'').includes(q)||(i.country_name_en||'').toLowerCase().includes(qLower)||natMatchEmb.has(i.id)):natList
const maxShow=2000
const shown=filtered.slice(0,maxShow)
const onDragStart=(e,idx)=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(idx))}
const onDragOver=(e)=>{e.preventDefault();e.dataTransfer.dropEffect='move'}
const onDrop=async(e,dropIdx)=>{
e.preventDefault()
const fromIdx=parseInt(e.dataTransfer.getData('text/plain'),10)
if(isNaN(fromIdx)||fromIdx===dropIdx||q)return
const next=[...natList]
const[moved]=next.splice(fromIdx,1)
next.splice(dropIdx,0,moved)
setNatList(next.map((o,i)=>({...o,sort_order:i+1})))
const updates=next.map((o,i)=>({id:o.id,sort_order:i+1}))
const affected=updates.filter((u,i)=>natList[i]?.id!==u.id||natList[i]?.sort_order!==u.sort_order)
if(affected.length){
const rowsToPersist=affected.map(u=>({id:u.id,sort_order:u.sort_order}))
for(const row of rowsToPersist){await sb.from('nationalities').update({sort_order:row.sort_order}).eq('id',row.id)}
}
}
return<>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,gap:12,flexWrap:'wrap'}}>
<div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}><span style={{width:8,height:8,borderRadius:'50%',background:C.gold}}/><span style={{fontSize:16,fontWeight:800,color:'rgba(255,255,255,.95)'}}>{isAr?'الجنسيات والسفارات':'Nationalities & Embassies'}</span><span style={{fontSize:11,color:'var(--tx5)'}}>{(q?filtered.length:natList.length)} {isAr?'جنسية':'nationalities'}</span></div>
<div style={{display:'flex',gap:8,alignItems:'center',flex:'1 1 280px',minWidth:0,justifyContent:'flex-end'}}>
<div style={{position:'relative',flex:'1 1 200px',minWidth:160,maxWidth:460}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{position:'absolute',top:'50%',right:isAr?12:'auto',left:isAr?'auto':12,transform:'translateY(-50%)',pointerEvents:'none'}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
<input value={q} onChange={e=>setQ(e.target.value)} placeholder={isAr?'ابحث بالعربي أو الإنجليزي أو الكود...':'Search AR/EN/code...'} style={{width:'100%',height:36,padding:isAr?'0 34px 0 12px':'0 12px 0 34px',borderRadius:8,border:'1px solid rgba(255,255,255,.12)',background:'rgba(0,0,0,.25)',color:'var(--tx)',fontFamily:F,fontSize:12,outline:'none',minWidth:0,boxSizing:'border-box'}}/>
</div>
<button onClick={()=>{const maxOrder=natList.reduce((m,o)=>Math.max(m,Number(o.sort_order)||0),0);setForm({_table:'nationalities',name_ar:'',name_en:'',code:'',qiwa_id:'',country_name_ar:'',country_name_en:'',flag_url:'',classification:'',saudi_only:'false',is_active:'true',sort_order:String(maxOrder+1)});setPop('nat')}} style={{...bS,height:36,flexShrink:0}}>{isAr?'جنسية':'Nationality'} +</button>
</div></div>
<div style={cardS}>{filtered.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)',fontSize:12}}>{isAr?'لا توجد جنسيات':'No nationalities'}</div>:<>
{shown.map((it,idx)=>{const active=it.is_active!==false;const toggleActive=async()=>{const next=!active;setNatList(p=>p.map(o=>o.id===it.id?{...o,is_active:next}:o));await sb.from('nationalities').update({is_active:next}).eq('id',it.id)};const embs=embList.filter(e=>e.nationality_id===it.id);const embKey='nat_'+it.id;const embOpen=!!open[embKey]||(q&&natMatchEmb.has(it.id));const addEmbassy=()=>{setForm({_table:'embassies',nationality_id:it.id,name_ar:'',name_en:'',code:'',qiwa_id:'',classification:'',saudi_only:'false',is_active:'true',sort_order:''});setPop('emb')};return<div key={it.id}>
<div className="jisr-list-row" draggable={!q} onDragStart={e=>onDragStart(e,idx)} onDragOver={onDragOver} onDrop={e=>onDrop(e,idx)} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',borderBottom:embOpen?'1px solid rgba(212,160,23,.15)':'1px solid rgba(255,255,255,.05)',cursor:q?'default':'grab',opacity:active?1:0.55,flexWrap:'wrap'}}>
{!q&&<svg className="jisr-drag-handle" width="16" height="24" viewBox="0 0 16 24" fill="rgba(255,255,255,.45)" style={{flexShrink:0,cursor:'grab'}} aria-label="drag"><circle cx="3" cy="6" r="1.1"/><circle cx="8" cy="6" r="1.1"/><circle cx="13" cy="6" r="1.1"/><circle cx="3" cy="12" r="1.1"/><circle cx="8" cy="12" r="1.1"/><circle cx="13" cy="12" r="1.1"/><circle cx="3" cy="18" r="1.1"/><circle cx="8" cy="18" r="1.1"/><circle cx="13" cy="18" r="1.1"/></svg>}
<span style={{display:'inline-flex',alignItems:'baseline',fontSize:15,fontWeight:800,color:C.gold,direction:'ltr',minWidth:32,textAlign:'center',justifyContent:'center',flexShrink:0,letterSpacing:.2}}><span style={{opacity:.5,fontWeight:700,fontSize:11,marginInlineEnd:2}}>#</span>{it.sort_order||'—'}</span>
<div style={{flex:'1 1 180px',display:'flex',flexDirection:'column',gap:2,minWidth:140,alignItems:'flex-start'}}>
<div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
<span style={{fontSize:14,fontWeight:700,color:'rgba(255,255,255,.95)'}}>{it.name_ar}</span>
<CopyBtn text={it.name_ar} toast={toast} isAr={isAr}/>
{it.country_name_ar&&<span style={{fontSize:10,color:'rgba(212,160,23,.85)',background:'rgba(212,160,23,.08)',padding:'2px 8px',borderRadius:5,flexShrink:0}}>{it.country_name_ar}</span>}
{it.flag_url&&<img src={it.flag_url} width={24} height={16} style={{borderRadius:2,objectFit:'cover',flexShrink:0}} alt='' onError={e=>{e.target.style.display='none'}}/>}
{it.saudi_only&&<span style={{fontSize:10,color:'#27a046',background:'rgba(0,108,53,.15)',border:'1px solid rgba(0,108,53,.45)',padding:'2px 8px',borderRadius:5,fontWeight:700,flexShrink:0}}>{isAr?'سعودي فقط':'Saudi only'}</span>}
</div>
{it.name_en&&<div style={{display:'flex',alignItems:'center',gap:6}}><span style={{fontSize:12,color:'rgba(255,255,255,.65)',direction:'ltr'}}>{it.name_en}</span><CopyBtn text={it.name_en} toast={toast} isAr={isAr}/></div>}
</div>
<div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0,marginInlineStart:'auto',flexWrap:'wrap',justifyContent:'flex-end'}}>
{it.code&&<span style={{fontSize:11,color:'rgba(255,255,255,.7)',fontFamily:'monospace',direction:'ltr',background:'rgba(255,255,255,.06)',padding:'3px 8px',borderRadius:5,flexShrink:0}}>{it.code}</span>}
<button type="button" onClick={(e)=>{e.stopPropagation();toggleActive()}} title={active?(isAr?'نشطة (تظهر في القوائم)':'Active (visible in dropdowns)'):(isAr?'إخفاء من القوائم':'Hide from dropdowns')} style={{width:36,height:20,borderRadius:999,border:'none',background:active?'#27a046':'rgba(255,255,255,.15)',cursor:'pointer',position:'relative',transition:'.2s',padding:0,flexShrink:0}}>
<span style={{position:'absolute',width:16,height:16,borderRadius:'50%',background:'#fff',top:2,right:active?2:18,transition:'.2s',boxShadow:'0 1px 3px rgba(0,0,0,.3)'}}/>
</button>
<button type="button" onClick={e=>{e.stopPropagation();toggle(embKey)}} title={isAr?'السفارات':'Embassies'} style={{display:'inline-flex',alignItems:'center',gap:5,height:28,padding:'0 10px',borderRadius:7,border:'1px solid '+(embOpen?'rgba(52,131,180,.5)':'rgba(52,131,180,.22)'),background:embOpen?'rgba(52,131,180,.15)':'rgba(52,131,180,.07)',color:'rgba(52,131,180,.95)',fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer',flexShrink:0,transition:'.15s'}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
<span>{embs.length}</span>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{transition:'.18s',transform:embOpen?'rotate(180deg)':'none'}}><polyline points="6 9 12 15 18 9"/></svg>
</button>
<div style={{display:'flex',gap:4,flexShrink:0}}>
<EditBtn onClick={()=>{setForm({_table:'nationalities',_id:it.id,name_ar:it.name_ar||'',name_en:it.name_en||'',code:it.code||'',qiwa_id:it.qiwa_id||'',country_name_ar:it.country_name_ar||'',country_name_en:it.country_name_en||'',flag_url:it.flag_url||'',classification:it.classification||'',saudi_only:String(it.saudi_only===true),is_active:String(it.is_active!==false),sort_order:it.sort_order||''});setPop('nat')}}/>
<DelBtn onClick={()=>askDel('nationalities',it.id,it.name_ar)}/>
</div></div></div>
{embOpen&&<div style={{background:'rgba(52,131,180,.03)',borderBottom:'1px solid rgba(255,255,255,.05)',padding:'6px 16px 10px'}}>
{embs.length===0?<div style={{padding:'10px 44px',color:'var(--tx6)',fontSize:11}}>{isAr?'لا توجد سفارات لهذه الجنسية':'No embassies for this nationality'}</div>:
embs.map(e=>{const eAct=e.is_active!==false;const toggleEmb=async()=>{const next=!eAct;setEmbList(p=>p.map(x=>x.id===e.id?{...x,is_active:next}:x));await sb.from('embassies').update({is_active:next}).eq('id',e.id)};return<div key={e.id} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 14px 7px 44px',borderBottom:'1px dashed rgba(255,255,255,.04)',opacity:eAct?1:0.55}}>
<div style={{width:5,height:5,borderRadius:'50%',background:'rgba(52,131,180,.7)',flexShrink:0}}/>
<div style={{flex:1,display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
<span style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,.85)'}}>{e.name_ar}</span>
{e.name_en&&<span style={{fontSize:11,color:'var(--tx5)',direction:'ltr'}}>{e.name_en}</span>}
{e.code&&<span style={{fontSize:10,color:'rgba(255,255,255,.55)',fontFamily:'monospace',direction:'ltr',background:'rgba(255,255,255,.04)',padding:'2px 6px',borderRadius:4}}>{e.code}</span>}
</div>
<button type="button" onClick={(ev)=>{ev.stopPropagation();toggleEmb()}} title={eAct?(isAr?'نشطة':'Active'):(isAr?'معطّلة':'Inactive')} style={{width:32,height:18,borderRadius:999,border:'none',background:eAct?'#27a046':'rgba(255,255,255,.15)',cursor:'pointer',position:'relative',transition:'.2s',padding:0,flexShrink:0}}>
<span style={{position:'absolute',width:14,height:14,borderRadius:'50%',background:'#fff',top:2,right:eAct?2:16,transition:'.2s',boxShadow:'0 1px 3px rgba(0,0,0,.3)'}}/>
</button>
<div style={{display:'flex',gap:4,flexShrink:0}}>
<EditBtn onClick={()=>{setForm({_table:'embassies',_id:e.id,nationality_id:e.nationality_id||it.id,name_ar:e.name_ar||'',name_en:e.name_en||'',code:e.code||'',qiwa_id:e.qiwa_id||'',classification:e.classification||'',saudi_only:String(e.saudi_only===true),is_active:String(e.is_active!==false),sort_order:e.sort_order||''});setPop('emb')}}/>
<DelBtn onClick={()=>askDel('embassies',e.id,e.name_ar)}/>
</div></div>})}
<div style={{padding:'8px 14px 2px 44px'}}>
<button type="button" onClick={addEmbassy} style={{display:'inline-flex',alignItems:'center',gap:6,height:30,padding:'0 14px',borderRadius:8,border:'1px dashed rgba(52,131,180,.45)',background:'rgba(52,131,180,.08)',color:'rgba(52,131,180,.95)',fontFamily:F,fontSize:11,fontWeight:700,cursor:'pointer',transition:'.15s'}}>
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
<span>{isAr?'إضافة سفارة':'Add Embassy'}</span>
</button>
</div>
</div>}
</div>})}
{filtered.length>maxShow&&<div style={{textAlign:'center',padding:16,color:'var(--tx6)',fontSize:11}}>{isAr?`… و ${filtered.length-maxShow} جنسية أخرى. استخدم البحث لتضييق النتائج.`:`… and ${filtered.length-maxShow} more. Use search to narrow.`}</div>}
</>}</div>
</>})()}

{/* CATEGORIES & ITEMS */}
{tab==='categories'&&<>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
<div style={secS}><span style={{width:6,height:6,borderRadius:'50%',background:C.gold}}/>{isAr?'الخانات والعناصر':'Categories & Items'}<span style={{fontSize:10,color:'var(--tx5)'}}>{lLists.length} {isAr?'خانة':'categories'} · {lItems.length} {isAr?'عنصر':'items'}</span></div>
<div style={{display:'flex',gap:6}}>
<button onClick={()=>{setForm({_table:'lookup_categories',category_key:'',name_ar:'',name_en:'',sort_order:'',is_system:'false',is_active:'true'});setPop('ll')}} style={bS}>{isAr?'خانة':'Category'} +</button>
</div></div>
<div style={cardS}>{lLists.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)',fontSize:12}}>{isAr?'لا توجد خانات':'No categories'}</div>:
lLists.map(ll=>{const li2=lItems.filter(i=>i.category_id===ll.id);const io=open['ll_'+ll.id];return<div key={ll.id}>
<div style={parentRow} onClick={()=>toggle('ll_'+ll.id)}>
<ArrowIcon isOpen={io}/>
<div style={{flex:1}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
<span style={{fontSize:14,fontWeight:700,color:'var(--tx)'}}>{ll.name_ar}</span>
<span style={{fontSize:11,color:'var(--tx5)',direction:'ltr'}}>{ll.name_en||''}</span>
{ll.is_system&&<span style={{fontSize:9,color:C.gold,background:'rgba(212,160,23,.1)',padding:'2px 6px',borderRadius:6}}>نظامي</span>}
</div>
<div style={{display:'flex',alignItems:'center',gap:6}}>
<span style={{fontSize:10,color:'var(--tx4)',fontFamily:'monospace',direction:'ltr'}}>{ll.category_key}</span>
<span style={{width:3,height:3,borderRadius:'50%',background:'rgba(255,255,255,.12)'}}/>
<span style={{fontSize:10,color:'var(--tx5)',background:'rgba(255,255,255,.06)',padding:'2px 8px',borderRadius:8}}>{li2.length} {isAr?'عنصر':'items'}</span>
</div>
</div>
<div style={{display:'flex',gap:4}} onClick={e=>e.stopPropagation()}>
<button onClick={()=>{const isBnk=ll.category_key==='bank_name';setForm({_table:'lookup_items',value_ar:'',value_en:'',code:'',sort_order:'',category_id:ll.id,...(isBnk?{type_id:''}:{})});setPop(isBnk?'bnk':'li')}} style={{height:28,padding:'0 10px',borderRadius:8,border:'1px solid rgba(52,131,180,.25)',background:'rgba(52,131,180,.1)',color:C.blue,fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>{isAr?'عنصر':'Item'}</button>
<EditBtn onClick={()=>{setForm({_table:'lookup_categories',_id:ll.id,category_key:ll.category_key||'',name_ar:ll.name_ar||'',name_en:ll.name_en||'',sort_order:ll.sort_order||'',is_system:String(ll.is_system===true),is_active:String(ll.is_active!==false)});setPop('ll')}}/>
{!ll.is_system&&<DelBtn onClick={()=>askDel('lookup_categories',ll.id,ll.name_ar)}/>}
</div></div>
{io&&<div style={{background:'rgba(255,255,255,.015)'}}>{li2.length===0?<div style={{...childRow,color:'var(--tx6)',fontSize:11}}>{isAr?'لا توجد عناصر':'No items'}</div>:
li2.map(it=>{const isBnk=ll.category_key==='bank_name';const typeName=isBnk&&it.type_id?lItems.find(x=>x.id===it.type_id)?.value_ar:'';return<div key={it.id} style={childRow}>
<div style={{width:4,height:4,borderRadius:'50%',background:C.blue,flexShrink:0}}/>
<div style={{flex:1,display:'flex',alignItems:'center',gap:8}}>
<span style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,.7)'}}>{it.value_ar}</span>
<span style={{fontSize:10,color:'var(--tx5)',direction:'ltr'}}>{it.value_en||''}</span>
<span style={{fontSize:10,color:'var(--tx6)',fontFamily:'monospace',direction:'ltr'}}>{it.code||''}</span>
{typeName&&<span style={{fontSize:9,color:C.gold,background:'rgba(212,160,23,.08)',padding:'2px 6px',borderRadius:6}}>{typeName}</span>}
</div>
{it.sort_order!=null&&<MetaText t={'#'+it.sort_order}/>}
<div style={{display:'flex',gap:4}}>
<EditBtn onClick={()=>{setForm({_table:'lookup_items',_id:it.id,category_id:it.category_id||'',value_ar:it.value_ar||'',value_en:it.value_en||'',code:it.code||'',sort_order:it.sort_order||'',...(isBnk?{type_id:it.type_id||''}:{})});setPop(isBnk?'bnk':'li')}}/>
<DelBtn onClick={()=>askDel('lookup_items',it.id,it.value_ar)}/>
</div></div>})}</div>}
</div>})}</div></>}


{/* DOCUMENTS */}
{tab==='documents'&&<>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
<div style={secS}><span style={{width:6,height:6,borderRadius:'50%',background:C.gold}}/>{isAr?'الوثائق':'Documents'}<MetaText t={'— '+docs.length}/></div>
<button onClick={()=>{setForm({_table:'documents',title:'',document_type:'',entity_type:'',description:''});setPop('doc')}} style={bS}>{isAr?'وثيقة':'Document'} +</button>
</div>
<div style={cardS}>
<table style={{width:'100%',borderCollapse:'collapse',fontFamily:F}}>
<thead><tr style={{background:'rgba(255,255,255,.04)',borderBottom:'1px solid rgba(255,255,255,.08)'}}>
<th style={{padding:'12px 16px',textAlign:'right',fontSize:11,fontWeight:600,color:'var(--tx4)',width:36}}>#</th>
<th style={{padding:'12px 16px',textAlign:'right',fontSize:11,fontWeight:600,color:'var(--tx4)'}}>العنوان</th>
<th style={{padding:'12px 16px',textAlign:'right',fontSize:11,fontWeight:600,color:'var(--tx4)'}}>النوع</th>
<th style={{padding:'12px 16px',textAlign:'right',fontSize:11,fontWeight:600,color:'var(--tx4)'}}>الكيان</th>
<th style={{padding:'12px',textAlign:'center',width:80}}></th>
</tr></thead>
<tbody>{docs.length===0?<tr><td colSpan={5} style={{textAlign:'center',padding:40,color:'var(--tx6)',fontSize:12}}>{isAr?'لا توجد وثائق':'No documents'}</td></tr>:
docs.map((d,i)=><tr key={d.id} style={{borderBottom:'1px solid var(--bd2)'}}>
<td style={{padding:'12px 16px',fontSize:11,color:'var(--tx5)'}}>{i+1}</td>
<td style={{padding:'12px 16px',fontSize:13,fontWeight:600,color:'var(--tx2)'}}>{d.title||'—'}</td>
<td style={{padding:'12px 16px',fontSize:12,color:'rgba(255,255,255,.6)'}}>{d.document_type||'—'}</td>
<td style={{padding:'12px 16px',fontSize:12,color:'rgba(255,255,255,.6)'}}>{d.entity_type||'—'}</td>
<td style={{padding:'8px',textAlign:'center'}}><div style={{display:'flex',gap:4,justifyContent:'center'}}>
<EditBtn onClick={()=>{setForm({_table:'documents',_id:d.id,title:d.title||'',document_type:d.document_type||'',entity_type:d.entity_type||'',description:d.description||''});setPop('doc')}}/>
<DelBtn onClick={()=>askDel('documents',d.id,d.title)}/>
</div></td></tr>)}</tbody></table></div></>}

{/* SERVICES */}
{tab==='services'&&<>
{/* Sub-tabs: side list */}
<div style={{display:'flex',gap:0}}>
<div style={{width:80,flexShrink:0,borderLeft:isAr?'1px solid rgba(255,255,255,.05)':'none',borderRight:!isAr?'1px solid rgba(255,255,255,.05)':'none',paddingTop:2}}>
{[{id:'services',l:'الخدمات',le:'Services'},{id:'installments',l:'الأقساط',le:'Installments'},{id:'templates',l:'المعاملات',le:'Transactions'}].map(st=><div key={st.id} onClick={()=>setSvcSubTab(st.id)} style={{padding:'6px 8px',fontSize:10,fontWeight:svcSubTab===st.id?700:500,color:svcSubTab===st.id?C.gold:'rgba(255,255,255,.3)',cursor:'pointer',borderRight:isAr&&svcSubTab===st.id?'2px solid '+C.gold:'2px solid transparent',borderLeft:!isAr&&svcSubTab===st.id?'2px solid '+C.gold:'2px solid transparent',transition:'.1s'}}>{isAr?st.l:st.le}</div>)}
</div>
<div style={{flex:1,paddingRight:isAr?8:0,paddingLeft:!isAr?8:0}}>

{/* ═══ SERVICES — GROUPED BY CATEGORY ═══ */}
{svcSubTab==='services'&&(()=>{
const categories=[...new Set(subSvcs.map(s=>s.category||'أخرى'))].sort();const catCounts={};categories.forEach(c=>{catCounts[c]=subSvcs.filter(s=>(s.category||'أخرى')===c).length})
const filteredSvcs=svcCatFilter==='all'?subSvcs:subSvcs.filter(s=>(s.category||'أخرى')===svcCatFilter)
const readyCount=subSvcs.filter(sv=>{const steps=subSteps.filter(s=>s.sub_service_id===sv.id);return steps.length>0&&steps.some(st=>stepFieldCounts[st.id]>0)}).length
const noStepCount=subSvcs.filter(sv=>subSteps.filter(s=>s.sub_service_id===sv.id).length===0).length
return<>
{/* Stats summary */}
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:14}}>
{[[isAr?'إجمالي الخدمات':'Total',subSvcs.length,C.gold],[isAr?'جاهزة (فيها حقول)':'Ready',readyCount,C.ok],[isAr?'بدون خطوات':'No Steps',noStepCount,C.red],[isAr?'خارجية / داخلية':'Ext/Int',subSvcs.filter(s=>s.service_scope==='client').length+' / '+subSvcs.filter(s=>s.service_scope!=='client').length,C.blue]].map(([l,v,c],i)=>
<div key={i} style={{padding:'10px 12px',borderRadius:10,background:c+'08',border:'1px solid '+c+'15'}}>
<div style={{fontSize:9,color:c,opacity:.7}}>{l}</div>
<div style={{fontSize:18,fontWeight:800,color:c}}>{v}</div>
</div>)}
</div>

<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}}>
<div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
<div style={secS}><span style={{width:6,height:6,borderRadius:'50%',background:C.gold}}/>{isAr?'الخدمات الفرعية':'Sub Services'}<MetaText t={filteredSvcs.length+' '+(isAr?'خدمة':'services')}/></div>
{/* Category filter chips */}
<div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
<span onClick={()=>setSvcCatFilter('all')} style={{fontSize:9,padding:'3px 8px',borderRadius:6,cursor:'pointer',fontWeight:svcCatFilter==='all'?700:500,color:svcCatFilter==='all'?C.gold:'rgba(255,255,255,.35)',background:svcCatFilter==='all'?'rgba(212,160,23,.08)':'rgba(255,255,255,.04)',border:svcCatFilter==='all'?'1px solid rgba(212,160,23,.15)':'1px solid rgba(255,255,255,.06)'}}>{isAr?'الكل':'All'}</span>
{categories.map(c=><span key={c} onClick={()=>setSvcCatFilter(c)} style={{fontSize:9,padding:'3px 8px',borderRadius:6,cursor:'pointer',fontWeight:svcCatFilter===c?700:500,color:svcCatFilter===c?C.gold:'rgba(255,255,255,.35)',background:svcCatFilter===c?'rgba(212,160,23,.08)':'rgba(255,255,255,.04)',border:svcCatFilter===c?'1px solid rgba(212,160,23,.15)':'1px solid rgba(255,255,255,.06)'}}>{c} ({catCounts[c]})</span>)}
</div>
</div>
<button onClick={()=>{setForm({_table:'sub_services',name_ar:'',name_en:'',service_scope:'client',sort_order:'',notes:''});setPop('sv')}} style={bS}>{isAr?'خدمة فرعية':'Sub Service'} +</button>
</div>

{/* Grouped services */}
{svcCatFilter==='all'?categories.map(cat=>{const catSvcs=subSvcs.filter(s=>(s.category||'أخرى')===cat);if(catSvcs.length===0)return null;const catOpen=open['cat_'+cat]!==false
return<div key={cat} style={{marginBottom:12}}>
{/* Category header */}
<div onClick={()=>setOpen(p=>({...p,['cat_'+cat]:!catOpen}))} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',borderRadius:10,background:'rgba(212,160,23,.04)',border:'1px solid rgba(212,160,23,.08)',cursor:'pointer',marginBottom:catOpen?6:0}}>
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{transform:catOpen?'rotate(90deg)':'',transition:'.2s'}}><polyline points="9 6 15 12 9 18" stroke={C.gold} strokeWidth="2.5"/></svg>
<span style={{fontSize:12,fontWeight:700,color:C.gold}}>{cat}</span>
<span style={{fontSize:10,color:'rgba(212,160,23,.5)'}}>{catSvcs.length} {isAr?'خدمة':'svc'}</span>
<div style={{flex:1}}/>
<span style={{fontSize:9,color:C.ok}}>{catSvcs.filter(sv=>{const steps=subSteps.filter(s=>s.sub_service_id===sv.id);return steps.length>0&&steps.some(st=>stepFieldCounts[st.id]>0)}).length} {isAr?'جاهزة':'ready'}</span>
</div>
{catOpen&&<div style={cardS}>{catSvcs.map(sv=>{const svSt=subSteps.filter(s=>s.sub_service_id===sv.id);const io=open['sv_'+sv.id];const hasFields=svSt.some(st=>stepFieldCounts[st.id]>0);const txnCount=txnCounts[sv.id]||0
return<div key={sv.id}>
<div style={parentRow} onClick={()=>toggle('sv_'+sv.id)}>
<ArrowIcon isOpen={io}/>
<div style={{flex:1}}>
<div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3,flexWrap:'wrap'}}>
<span style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>{sv.name_ar}</span>
<span style={{fontSize:10,color:'var(--tx5)',direction:'ltr'}}>{sv.name_en||''}</span>
<span style={{fontSize:9,color:sv.service_scope==='client'?C.gold:C.blue,background:sv.service_scope==='client'?'rgba(212,160,23,.08)':'rgba(52,131,180,.08)',padding:'2px 6px',borderRadius:6}}>{sv.service_scope==='client'?(isAr?'خارجي':'External'):(isAr?'داخلي':'Internal')}</span>
{/* Readiness indicator */}
{svSt.length>0&&hasFields&&<span style={{fontSize:8,color:C.ok,background:'rgba(39,160,70,.08)',padding:'2px 6px',borderRadius:6}}>✓ {isAr?'جاهزة':'Ready'}</span>}
{svSt.length>0&&!hasFields&&<span style={{fontSize:8,color:'#e67e22',background:'rgba(230,126,34,.08)',padding:'2px 6px',borderRadius:6}}>⚠ {isAr?'بدون حقول':'No Fields'}</span>}
{svSt.length===0&&<span style={{fontSize:8,color:C.red,background:'rgba(192,57,43,.08)',padding:'2px 6px',borderRadius:6}}>✗ {isAr?'بدون خطوات':'No Steps'}</span>}
</div>
<div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
<span style={{fontSize:10,color:'var(--tx5)',background:'rgba(255,255,255,.06)',padding:'2px 8px',borderRadius:8}}>{svSt.length} {isAr?'خطوة':'steps'}</span>
{sv.expected_sla_days&&<span style={{fontSize:9,color:'rgba(255,255,255,.3)'}}>SLA: {sv.expected_sla_days}{isAr?'ي':'d'}</span>}
{sv.default_price>0&&<span style={{fontSize:9,color:C.ok}}>{sv.default_price} {isAr?'ر.س':'SAR'}</span>}
{sv.platform_code&&<span style={{fontSize:8,color:C.blue,background:'rgba(52,131,180,.06)',padding:'1px 5px',borderRadius:4}}>{sv.platform_code}</span>}
{txnCount>0&&<span style={{fontSize:9,color:C.gold,background:'rgba(212,160,23,.06)',padding:'2px 6px',borderRadius:6}}>{txnCount} {isAr?'معاملة':'txn'}</span>}
</div>
</div>
<div style={{display:'flex',gap:4}} onClick={e=>e.stopPropagation()}>
<button onClick={()=>{setForm({_table:'sub_service_steps',step_name_ar:'',step_name_en:'',step_order:'',sadad_requirement:'none',default_sadad_amount:'',sub_service_id:sv.id});setPop('ss')}} style={{height:28,padding:'0 10px',borderRadius:8,border:'1px solid rgba(52,131,180,.25)',background:'rgba(52,131,180,.1)',color:C.blue,fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>{isAr?'خطوة':'Step'}</button>
<EditBtn onClick={()=>{setForm({_table:'sub_services',_id:sv.id,name_ar:sv.name_ar||'',name_en:sv.name_en||'',service_scope:sv.service_scope||'client',sort_order:sv.sort_order||'',notes:sv.notes||''});setPop('sv')}}/>
<DelBtn onClick={()=>askDel('sub_services',sv.id,sv.name_ar)}/>
</div></div>
{io&&<div style={{background:'rgba(255,255,255,.015)'}}>
{svSt.length===0?<div style={{...childRow,color:'var(--tx6)',fontSize:11}}>{isAr?'لا توجد خطوات':'No steps'}</div>:
svSt.map(st=>{const fCount=stepFieldCounts[st.id]||0;return<div key={st.id} style={childRow}>
<span style={{fontSize:11,fontWeight:700,color:C.gold,width:20,textAlign:'center',flexShrink:0}}>{st.step_order}</span>
<div style={{flex:1,display:'flex',alignItems:'center',gap:8}}>
<span style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,.7)'}}>{st.step_name_ar}</span>
<span style={{fontSize:10,color:'var(--tx5)',direction:'ltr'}}>{st.step_name_en||''}</span>
{fCount>0&&<span style={{fontSize:8,color:C.ok,background:'rgba(39,160,70,.06)',padding:'1px 5px',borderRadius:4}}>{fCount} {isAr?'حقل':'fields'}</span>}
{fCount===0&&<span style={{fontSize:8,color:'rgba(255,255,255,.2)'}}>—</span>}
</div>
{st.sadad_requirement!=='none'&&<span style={{fontSize:9,color:C.red,background:'rgba(192,57,43,.08)',padding:'2px 7px',borderRadius:6}}>{st.sadad_requirement==='required_blocking'?(isAr?'سداد (حظر)':'Blocking'):st.sadad_requirement==='required_one_step_grace'?(isAr?'سداد (مهلة)':'Grace'):(isAr?'سداد قبل الإنهاء':'Before Complete')}{st.default_sadad_amount?' · '+st.default_sadad_amount:''}</span>}
<div style={{display:'flex',gap:4}}>
<EditBtn onClick={()=>{setForm({_table:'sub_service_steps',_id:st.id,sub_service_id:st.sub_service_id||'',step_name_ar:st.step_name_ar||'',step_name_en:st.step_name_en||'',step_order:st.step_order||'',sadad_requirement:st.sadad_requirement||'none',default_sadad_amount:st.default_sadad_amount||''});setPop('ss')}}/>
<DelBtn onClick={()=>askDel('sub_service_steps',st.id,st.step_name_ar)}/>
</div></div>})}
</div>}
</div>})}</div>}
</div>})
/* Single category filter view */
:<div style={cardS}>{filteredSvcs.map(sv=>{const svSt=subSteps.filter(s=>s.sub_service_id===sv.id);const io=open['sv_'+sv.id];const hasFields=svSt.some(st=>stepFieldCounts[st.id]>0);const txnCount=txnCounts[sv.id]||0
return<div key={sv.id}>
<div style={parentRow} onClick={()=>toggle('sv_'+sv.id)}>
<ArrowIcon isOpen={io}/>
<div style={{flex:1}}>
<div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3,flexWrap:'wrap'}}>
<span style={{fontSize:13,fontWeight:700,color:'var(--tx)'}}>{sv.name_ar}</span>
<span style={{fontSize:10,color:'var(--tx5)',direction:'ltr'}}>{sv.name_en||''}</span>
<span style={{fontSize:9,color:sv.service_scope==='client'?C.gold:C.blue,background:sv.service_scope==='client'?'rgba(212,160,23,.08)':'rgba(52,131,180,.08)',padding:'2px 6px',borderRadius:6}}>{sv.service_scope==='client'?(isAr?'خارجي':'External'):(isAr?'داخلي':'Internal')}</span>
{svSt.length>0&&hasFields&&<span style={{fontSize:8,color:C.ok,background:'rgba(39,160,70,.08)',padding:'2px 6px',borderRadius:6}}>✓ {isAr?'جاهزة':'Ready'}</span>}
{svSt.length>0&&!hasFields&&<span style={{fontSize:8,color:'#e67e22',background:'rgba(230,126,34,.08)',padding:'2px 6px',borderRadius:6}}>⚠ {isAr?'بدون حقول':'No Fields'}</span>}
{svSt.length===0&&<span style={{fontSize:8,color:C.red,background:'rgba(192,57,43,.08)',padding:'2px 6px',borderRadius:6}}>✗ {isAr?'بدون خطوات':'No Steps'}</span>}
</div>
<div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
<span style={{fontSize:10,color:'var(--tx5)',background:'rgba(255,255,255,.06)',padding:'2px 8px',borderRadius:8}}>{svSt.length} {isAr?'خطوة':'steps'}</span>
{sv.expected_sla_days&&<span style={{fontSize:9,color:'rgba(255,255,255,.3)'}}>SLA: {sv.expected_sla_days}{isAr?'ي':'d'}</span>}
{sv.default_price>0&&<span style={{fontSize:9,color:C.ok}}>{sv.default_price} {isAr?'ر.س':'SAR'}</span>}
{sv.platform_code&&<span style={{fontSize:8,color:C.blue,background:'rgba(52,131,180,.06)',padding:'1px 5px',borderRadius:4}}>{sv.platform_code}</span>}
{txnCount>0&&<span style={{fontSize:9,color:C.gold,background:'rgba(212,160,23,.06)',padding:'2px 6px',borderRadius:6}}>{txnCount} {isAr?'معاملة':'txn'}</span>}
</div>
</div>
<div style={{display:'flex',gap:4}} onClick={e=>e.stopPropagation()}>
<button onClick={()=>{setForm({_table:'sub_service_steps',step_name_ar:'',step_name_en:'',step_order:'',sadad_requirement:'none',default_sadad_amount:'',sub_service_id:sv.id});setPop('ss')}} style={{height:28,padding:'0 10px',borderRadius:8,border:'1px solid rgba(52,131,180,.25)',background:'rgba(52,131,180,.1)',color:C.blue,fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>{isAr?'خطوة':'Step'}</button>
<EditBtn onClick={()=>{setForm({_table:'sub_services',_id:sv.id,name_ar:sv.name_ar||'',name_en:sv.name_en||'',service_scope:sv.service_scope||'client',sort_order:sv.sort_order||'',notes:sv.notes||''});setPop('sv')}}/>
<DelBtn onClick={()=>askDel('sub_services',sv.id,sv.name_ar)}/>
</div></div>
{io&&<div style={{background:'rgba(255,255,255,.015)'}}>
{svSt.length===0?<div style={{...childRow,color:'var(--tx6)',fontSize:11}}>{isAr?'لا توجد خطوات':'No steps'}</div>:
svSt.map(st=>{const fCount=stepFieldCounts[st.id]||0;return<div key={st.id} style={childRow}>
<span style={{fontSize:11,fontWeight:700,color:C.gold,width:20,textAlign:'center',flexShrink:0}}>{st.step_order}</span>
<div style={{flex:1,display:'flex',alignItems:'center',gap:8}}>
<span style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,.7)'}}>{st.step_name_ar}</span>
<span style={{fontSize:10,color:'var(--tx5)',direction:'ltr'}}>{st.step_name_en||''}</span>
{fCount>0&&<span style={{fontSize:8,color:C.ok,background:'rgba(39,160,70,.06)',padding:'1px 5px',borderRadius:4}}>{fCount} {isAr?'حقل':'fields'}</span>}
</div>
{st.sadad_requirement!=='none'&&<span style={{fontSize:9,color:C.red,background:'rgba(192,57,43,.08)',padding:'2px 7px',borderRadius:6}}>{st.sadad_requirement==='required_blocking'?(isAr?'سداد (حظر)':'Blocking'):st.sadad_requirement==='required_one_step_grace'?(isAr?'سداد (مهلة)':'Grace'):(isAr?'سداد قبل الإنهاء':'Before Complete')}{st.default_sadad_amount?' · '+st.default_sadad_amount:''}</span>}
<div style={{display:'flex',gap:4}}>
<EditBtn onClick={()=>{setForm({_table:'sub_service_steps',_id:st.id,sub_service_id:st.sub_service_id||'',step_name_ar:st.step_name_ar||'',step_name_en:st.step_name_en||'',step_order:st.step_order||'',sadad_requirement:st.sadad_requirement||'none',default_sadad_amount:st.default_sadad_amount||''});setPop('ss')}}/>
<DelBtn onClick={()=>askDel('sub_service_steps',st.id,st.step_name_ar)}/>
</div></div>})}
</div>}
</div>})}</div>}
</>})()}

{/* ═══ TRANSACTION TEMPLATES — WITH STATS ═══ */}
{svcSubTab==='templates'&&<>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
<div style={secS}><span style={{width:6,height:6,borderRadius:'50%',background:C.gold}}/>{isAr?'قوالب المعاملات':'Transaction Templates'}<MetaText t={tplts.length+' '+(isAr?'قالب':'templates')}/></div>
<div style={{display:'flex',gap:6}}>
<button onClick={()=>{setForm({_table:'transaction_templates',name_ar:'',name_en:'',service_scope:'client',sort_order:'',notes:''});setPop('tp')}} style={bS}>{isAr?'قالب':'Template'} +</button>
</div></div>
<div style={cardS}>{tplts.length===0?<div style={{textAlign:'center',padding:40,color:'var(--tx6)',fontSize:12}}>{isAr?'لا توجد قوالب':'No templates'}</div>:
tplts.map(tp=>{const tpLinks=tplLinks.filter(l=>l.template_id===tp.id).sort((a,b)=>a.step_order-b.step_order);const io=open['tp_'+tp.id]
// Count transactions using this template's service_category
const tplTxnCount=Object.values(txnCounts).reduce((s,v)=>s+v,0)>0?tpLinks.reduce((s,lk)=>s+(txnCounts[lk.sub_service_id]||0),0):0
return<div key={tp.id}>
<div style={parentRow} onClick={()=>toggle('tp_'+tp.id)}>
<ArrowIcon isOpen={io}/>
<div style={{flex:1}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
<span style={{fontSize:14,fontWeight:700,color:'var(--tx)'}}>{tp.name_ar}</span>
<span style={{fontSize:11,color:'var(--tx5)',direction:'ltr'}}>{tp.name_en||''}</span>
<span style={{fontSize:9,color:tp.service_scope==='client'?C.gold:C.blue,background:tp.service_scope==='client'?'rgba(212,160,23,.08)':'rgba(52,131,180,.08)',padding:'2px 6px',borderRadius:6}}>{tp.service_scope==='client'?(isAr?'خارجي':'External'):(isAr?'داخلي':'Internal')}</span>
</div>
<div style={{display:'flex',alignItems:'center',gap:6}}>
<span style={{fontSize:10,color:'var(--tx5)',background:'rgba(255,255,255,.06)',padding:'2px 8px',borderRadius:8}}>{tpLinks.length} {isAr?'خدمة فرعية':'sub services'}</span>
{tplTxnCount>0&&<span style={{fontSize:9,color:C.gold,background:'rgba(212,160,23,.06)',padding:'2px 6px',borderRadius:6}}>{tplTxnCount} {isAr?'معاملة':'txn'}</span>}
</div>
</div>
<div style={{display:'flex',gap:4}} onClick={e=>e.stopPropagation()}>
<button onClick={()=>{setForm({_table:'template_sub_services',sub_service_id:'',step_order:'',step_group:'',is_conditional:'false',condition_note:'',template_id:tp.id});setPop('tl')}} style={{height:28,padding:'0 10px',borderRadius:8,border:'1px solid rgba(52,131,180,.25)',background:'rgba(52,131,180,.1)',color:C.blue,fontFamily:F,fontSize:10,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>{isAr?'ربط خدمة':'Link'}</button>
<EditBtn onClick={()=>{setForm({_table:'transaction_templates',_id:tp.id,name_ar:tp.name_ar||'',name_en:tp.name_en||'',service_scope:tp.service_scope||'client',sort_order:tp.sort_order||'',notes:tp.notes||''});setPop('tp')}}/>
<DelBtn onClick={()=>askDel('transaction_templates',tp.id,tp.name_ar)}/>
</div></div>
{io&&<div style={{background:'rgba(255,255,255,.015)'}}>
{tpLinks.length===0?<div style={{...childRow,color:'var(--tx6)',fontSize:11}}>{isAr?'لا توجد خدمات مربوطة':'No linked services'}</div>:
tpLinks.map(lk=>{const sv=subSvcs.find(s=>s.id===lk.sub_service_id);return<div key={lk.id} style={childRow}>
<span style={{fontSize:11,fontWeight:700,color:C.gold,width:20,textAlign:'center',flexShrink:0}}>{lk.step_order}</span>
<div style={{flex:1,display:'flex',alignItems:'center',gap:8}}>
<span style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,.7)'}}>{sv?sv.name_ar:'—'}</span>
<span style={{fontSize:10,color:'var(--tx5)',direction:'ltr'}}>{sv?sv.name_en:''}</span>
</div>
{lk.is_conditional&&<span style={{fontSize:9,color:'rgba(212,160,23,.7)',background:'rgba(212,160,23,.08)',padding:'2px 7px',borderRadius:6}}>{isAr?'شرطي':'Conditional'}{lk.condition_note?' · '+lk.condition_note.slice(0,30):''}</span>}
{lk.step_group&&<span style={{fontSize:9,color:C.blue,background:'rgba(52,131,180,.08)',padding:'2px 7px',borderRadius:6}}>{isAr?'مجموعة':'Group'} {lk.step_group}</span>}
<div style={{display:'flex',gap:4}}>
<EditBtn onClick={()=>{setForm({_table:'template_sub_services',_id:lk.id,template_id:lk.template_id||'',sub_service_id:lk.sub_service_id||'',step_order:lk.step_order||'',step_group:lk.step_group||'',is_conditional:String(lk.is_conditional||false),condition_note:lk.condition_note||''});setPop('tl')}}/>
<DelBtn onClick={()=>askDel('template_sub_services',lk.id,sv?.name_ar)}/>
</div></div>})}
</div>}
</div>})}</div></>}

{/* ═══ INSTALLMENT PLANS — PER SERVICE ═══ */}
{svcSubTab==='installments'&&<>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
<div style={{fontSize:14,fontWeight:700,color:'var(--tx)'}}>{isAr?'خطط الأقساط لكل خدمة':'Installment Plans per Service'}</div>
<button onClick={()=>{setForm({_table:'service_installment_plans',service_id:'',label_ar:'',label_en:'',installment_order:'1',percentage:'',fixed_amount:'',due_type:'on_request',due_days:'',is_active:'true'});setPop('ip')}} style={bS}>+ {isAr?'إضافة قسط':'Add Plan'}</button>
</div>
<div style={{fontSize:10,color:'var(--tx4)',marginBottom:14}}>{isAr?'حدد لكل خدمة كم قسط ومتى يحل كل قسط (عند الطلب، بعد أيام، عند إنجاز مرحلة، عند الاكتمال)':'Define installment count and due conditions per service'}</div>

{/* Group by service */}
{(()=>{
const svcsWithPlans=[...new Set(instPlans.map(p=>p.service_id))]
const svcsAll=subSvcs.filter(s=>Number(s.default_price||0)>0||svcsWithPlans.includes(s.id))
return<div style={cardS}>
{svcsAll.length===0&&<div style={{padding:20,textAlign:'center',fontSize:11,color:'var(--tx5)'}}>{isAr?'لا توجد خدمات مدفوعة':'No paid services'}</div>}
{svcsAll.map(sv=>{
const plans=instPlans.filter(p=>p.service_id===sv.id).sort((a,b)=>(a.installment_order||0)-(b.installment_order||0))
const isOpen=open['ip_'+sv.id]
return<div key={sv.id}>
<div onClick={()=>toggle('ip_'+sv.id)} style={{...parentRow,justifyContent:'space-between'}}>
<div style={{display:'flex',alignItems:'center',gap:8,flex:1}}>
<ArrowIcon isOpen={isOpen}/>
<span style={{fontSize:12,fontWeight:700,color:'var(--tx)'}}>{sv.name_ar}</span>
<span style={{fontSize:9,color:C.gold,fontWeight:600}}>{sv.default_price?sv.default_price+' ر.س':''}</span>
</div>
<div style={{display:'flex',alignItems:'center',gap:8}}>
{plans.length>0?<span style={{fontSize:9,padding:'2px 8px',borderRadius:5,background:'rgba(39,160,70,.08)',color:C.ok,fontWeight:600}}>{plans.length} {isAr?'قسط':'inst'}</span>
:<span style={{fontSize:9,padding:'2px 8px',borderRadius:5,background:'rgba(255,255,255,.05)',color:'var(--tx5)',fontWeight:500}}>{isAr?'دفع كامل':'Full pay'}</span>}
<button onClick={e=>{e.stopPropagation();setForm({_table:'service_installment_plans',service_id:sv.id,label_ar:'',label_en:'',installment_order:String(plans.length+1),percentage:'',fixed_amount:'',due_type:'on_request',due_days:'',is_active:'true'});setPop('ip')}} style={{width:24,height:24,borderRadius:6,border:'1px solid rgba(212,160,23,.15)',background:'rgba(212,160,23,.06)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:C.gold,fontFamily:F}}>+</button>
</div>
</div>
{isOpen&&plans.length>0&&<div>
{plans.map((pl,idx)=>{
const dueLabel=pl.due_type==='on_request'?(isAr?'عند رفع الطلب':'On request'):pl.due_type==='after_days'?(isAr?'بعد '+pl.due_days+' يوم':'After '+pl.due_days+' days'):pl.due_type==='on_milestone'?(msList.find(m=>m.id===pl.milestone_id)?.name_ar||(isAr?'مرحلة':'Milestone')):(isAr?'عند الاكتمال':'On completion')
return<div key={pl.id} style={childRow}>
<div style={{width:20,height:20,borderRadius:'50%',background:C.gold,color:C.dk,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:800,flexShrink:0}}>{pl.installment_order||idx+1}</div>
<div style={{flex:1}}>
<span style={{fontSize:12,fontWeight:600,color:'var(--tx)'}}>{pl.label_ar}</span>
<div style={{display:'flex',gap:10,marginTop:2,fontSize:9,color:'var(--tx5)'}}>
{pl.percentage>0&&<span>{pl.percentage}%</span>}
{pl.fixed_amount>0&&<span>{pl.fixed_amount} ر.س</span>}
<span style={{color:C.blue}}>{dueLabel}</span>
</div>
</div>
<BadgeStatus v={pl.is_active} isAr={isAr}/>
<EditBtn onClick={()=>{setForm({_table:'service_installment_plans',_id:pl.id,service_id:pl.service_id,label_ar:pl.label_ar||'',label_en:pl.label_en||'',installment_order:pl.installment_order||'',percentage:pl.percentage||'',fixed_amount:pl.fixed_amount||'',due_type:pl.due_type||'on_request',due_days:pl.due_days||'',milestone_id:pl.milestone_id||'',is_active:String(pl.is_active!==false)});setPop('ip')}}/>
<DelBtn onClick={()=>askDel('service_installment_plans',pl.id,pl.label_ar)}/>
</div>})}
</div>}
{isOpen&&plans.length===0&&<div style={{padding:'12px 42px',fontSize:10,color:'var(--tx5)'}}>{isAr?'لم يتم تعريف أقساط — سيكون الدفع كاملاً':'No installments defined — full payment'}</div>}
</div>})}
</div>})()}
</>}

</div></div>
</>}


{/* FORM POPUP */}
{pop==='occ'&&<OccupationFormPopup form={form} setForm={setForm} onClose={()=>setPop(null)} saving={saving} isAr={isAr} sb={sb} toast={toast} onSaved={loadAll}/>}
{pop==='nat'&&<OccupationFormPopup kind="nationality" form={form} setForm={setForm} onClose={()=>setPop(null)} saving={saving} isAr={isAr} sb={sb} toast={toast} onSaved={loadAll}/>}
{pop==='emb'&&<OccupationFormPopup kind="embassy" form={form} setForm={setForm} onClose={()=>setPop(null)} saving={saving} isAr={isAr} sb={sb} toast={toast} onSaved={loadAll}/>}
{pop==='r'&&<OccupationFormPopup kind="region" form={form} setForm={setForm} onClose={()=>setPop(null)} saving={saving} isAr={isAr} sb={sb} toast={toast} onSaved={loadAll}/>}
{pop==='c'&&<OccupationFormPopup kind="city" regions={regions} form={form} setForm={setForm} onClose={()=>setPop(null)} saving={saving} isAr={isAr} sb={sb} toast={toast} onSaved={loadAll}/>}
{pop==='di'&&<OccupationFormPopup kind="district" regions={regions} cities={cities} form={form} setForm={setForm} onClose={()=>setPop(null)} saving={saving} isAr={isAr} sb={sb} toast={toast} onSaved={loadAll}/>}
{pop&&!['occ','nat','emb','r','c','di'].includes(pop)&&popFields[pop]&&<FormPopup title={popTitles[pop]} fields={popFields[pop]} form={form} setForm={setForm} onSave={saveForm} onClose={()=>setPop(null)} saving={saving} isAr={isAr}/>}

{/* DELETE POPUP */}
{delTarget&&<DeletePopup isAr={isAr} itemName={delTarget.name} onConfirm={confirmDel} onCancel={()=>setDelTarget(null)}/>}

</div>}
