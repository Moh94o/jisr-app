import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const F = "'Cairo', sans-serif";
const C = { gold: '#D4A017', red: '#c0392b', blue: '#3483b4', ok: '#27a046' };
const nm = v => Number(v || 0).toLocaleString('en-US');
const fS = { width: '100%', height: 42, padding: '0 14px', border: '1.5px solid var(--inputBd,rgba(255,255,255,.12))', borderRadius: 10, fontFamily: F, fontSize: 13, fontWeight: 600, color: 'var(--tx)', outline: 'none', background: 'var(--inputBg,rgba(255,255,255,.07))' };

function IB({ l, v, copy, toast }) {
  return <div style={{ background: 'var(--hoverBg,rgba(255,255,255,.025))', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--bd2,rgba(255,255,255,.04))' }}>
    <div style={{ fontSize: 10, color: 'var(--tx5,rgba(255,255,255,.28))', marginBottom: 6 }}>{l}</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', direction: copy ? 'ltr' : 'inherit' }}>{v || '—'}</div>
      {copy && v && <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(String(v)); toast?.('تم النسخ'); }} style={{ width: 20, height: 20, borderRadius: 5, border: 'none', background: 'var(--hoverBg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: 9, color: 'var(--tx5)' }}>⎘</button>}
    </div>
  </div>;
}

function WF({ k, l, r, d, w, opts, ph, tp, form, setForm, prefix }) {
  const val = form[k] || '';
  const onChange = e => {
    let v = e.target.value;
    if (prefix && !v.startsWith(prefix)) v = prefix + v.replace(prefix, '');
    setForm(p => ({ ...p, [k]: v }));
  };
  return <div style={{ gridColumn: w === true || w === 'ta' ? '1/-1' : undefined }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.58)', marginBottom: 5, textAlign: 'start' }}>{l}{r && <span style={{ color: C.red }}> *</span>}</div>
    {opts ? <select value={val} onChange={onChange} style={fS}><option value="">—</option>{opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select>
      : w === 'ta' ? <textarea value={val} onChange={onChange} rows={3} style={{ ...fS, height: 'auto', padding: 10, resize: 'vertical', textAlign: d ? 'left' : 'right', direction: d ? 'ltr' : 'rtl' }} />
        : <input type={tp || 'text'} placeholder={ph || ''} value={val} onChange={onChange} style={{ ...fS, direction: d ? 'ltr' : 'rtl', textAlign: d ? 'left' : 'right' }} />}
  </div>;
}

// Custom styled select button (matches Kafala Calculator حالة المقيم design)
function CustomSel({ k, l, r, w, opts, ph, form, setForm, onSelect }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const val = form[k] || '';
  const selected = (opts || []).find(o => o.v === val);
  const displayText = selected ? selected.l : (ph || '—');
  const handleSelect = v => {
    if (onSelect) onSelect(v);
    else setForm(p => ({ ...p, [k]: v }));
    setOpen(false);
  };
  const computePos = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const maxH = 240;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    setPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      maxHeight: Math.max(120, Math.min(maxH, spaceBelow)),
    });
  };
  useEffect(() => {
    if (!open) return;
    computePos();
    const h = () => computePos();
    window.addEventListener('resize', h); window.addEventListener('scroll', h, true);
    return () => { window.removeEventListener('resize', h); window.removeEventListener('scroll', h, true); };
  }, [open]);
  return <div style={{ gridColumn: w === true ? '1/-1' : undefined }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.58)', marginBottom: 5, textAlign: 'start' }}>{l}{r && <span style={{ color: C.red }}> *</span>}</div>
    <div style={{ position: 'relative', width: '100%' }}>
      <button ref={btnRef} type="button" onClick={() => setOpen(o => !o)} style={{
        width: '100%', height: 42, padding: '0 32px',
        border: '1px solid rgba(255,255,255,.08)', borderRadius: 9,
        fontFamily: F, fontSize: 13, fontWeight: 600,
        color: selected ? 'var(--tx)' : 'var(--tx5)',
        background: 'rgba(0,0,0,.18)',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)',
        textAlign: 'center', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 6, position: 'relative', outline: 'none'
      }}>
        <span style={{ flex: 1, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayText}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="2.5" style={{ position: 'absolute', left: 12, top: '50%', transform: open ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)', transition: 'transform .2s' }}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && pos && <>
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />
        <div style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, background: '#1a1a1a', border: '1px solid rgba(212,160,23,.25)', borderRadius: 9, zIndex: 9999, maxHeight: pos.maxHeight, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,.4)', scrollbarWidth: 'none' }}>
          {(opts || []).length === 0 && <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--tx5)', textAlign: 'center' }}>لا توجد خيارات</div>}
          {(opts || []).map(opt => (
            <div key={opt.v} onClick={() => handleSelect(opt.v)} style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, fontWeight: opt.v === val ? 700 : 500, color: opt.v === val ? C.gold : 'var(--tx)', background: opt.v === val ? 'rgba(212,160,23,.08)' : 'transparent', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,.03)' }}>{opt.l}</div>
          ))}
        </div>
      </>}
    </div>
  </div>;
}

// Phone input with +966 prefix box (exactly matches Kafala Calculator design)
function PhoneField({ k, l, r, w, form, setForm }) {
  const digits = (form[k] || '').replace('+966', '').replace(/\D/g, '');
  return <div style={{ gridColumn: w === true ? '1/-1' : undefined }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.58)', marginBottom: 5, textAlign: 'start' }}>{l}{r && <span style={{ color: C.red }}> *</span>}</div>
    <div className="kc-phone-wrap" style={{ display: 'flex', direction: 'ltr', border: '1px solid rgba(255,255,255,.08)', borderRadius: 9, overflow: 'hidden', background: 'rgba(0,0,0,.18)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)', height: 42, transition: 'border-color .2s' }}>
      <div style={{ height: '100%', padding: '0 10px', background: 'rgba(255,255,255,.04)', borderRight: '1px solid rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 700, color: C.gold, flexShrink: 0 }}>+966</div>
      <input placeholder="5X XXX XXXX" maxLength={9} value={digits} onChange={e => {
        const v = e.target.value.replace(/\D/g, '').slice(0, 9);
        setForm(p => ({ ...p, [k]: v ? '+966' + v : '' }));
      }} style={{ width: '100%', height: '100%', padding: '0 12px', borderWidth: 0, borderStyle: 'none', background: 'transparent', fontFamily: "'Cairo','Tajawal',sans-serif", fontSize: 13, fontWeight: 600, color: 'var(--tx)', outline: 'none', textAlign: 'left' }}/>
    </div>
    <style>{`.kc-phone-wrap:focus-within{border-color:rgba(255,255,255,.18)!important}.kc-phone-wrap input{border-width:0!important}`}</style>
  </div>;
}

function ContractCard({ c, color, toast }) {
  const cyLbl = { monthly: 'شهري', quarterly: 'ربع سنوي', semi_annual: 'نصف سنوي', annual: 'سنوي' };
  const isExp = c.contract_end && new Date(c.contract_end) < new Date();
  const isSoon = c.contract_end && !isExp && (new Date(c.contract_end) - new Date()) / 86400000 < 30;
  return <div style={{ background: 'var(--hoverBg)', borderRadius: 12, padding: 16, border: '1px solid ' + (isExp ? 'rgba(192,57,43,.15)' : isSoon ? 'rgba(230,126,34,.15)' : 'var(--bd2)'), marginBottom: 10 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx2)' }}>{c.provider_name}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {isExp && <span style={{ fontSize: 9, color: C.red, background: 'rgba(192,57,43,.1)', padding: '2px 6px', borderRadius: 4 }}>منتهي</span>}
        {isSoon && <span style={{ fontSize: 9, color: '#e67e22', background: 'rgba(230,126,34,.1)', padding: '2px 6px', borderRadius: 4 }}>ينتهي قريباً</span>}
        <span style={{ fontSize: 18, fontWeight: 800, color }}>{nm(c.amount)}</span>
        <span style={{ fontSize: 10, color: 'var(--tx5)' }}>{cyLbl[c.payment_cycle] || c.payment_cycle}</span>
      </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
      {c.contract_start && <IB l="بداية العقد" v={c.contract_start} toast={toast} />}
      {c.contract_end && <IB l="نهاية العقد" v={c.contract_end} toast={toast} />}
      {c.next_payment_date && <IB l="السداد القادم" v={c.next_payment_date} toast={toast} />}
      {c.ejar_contract_number && <IB l="رقم عقد إيجار" v={c.ejar_contract_number} copy toast={toast} />}
      {c.lessor_name && <IB l="اسم المؤجر" v={c.lessor_name} toast={toast} />}
      {c.lessor_phone && <IB l="جوال المؤجر" v={c.lessor_phone} copy toast={toast} />}
      {c.broker_name && <IB l="الوسيط العقاري" v={c.broker_name} toast={toast} />}
      {c.annual_rent && <IB l="الإيجار السنوي" v={nm(c.annual_rent) + ' ر.س'} toast={toast} />}
      {c.account_number && <IB l="رقم الحساب" v={c.account_number} copy toast={toast} />}
      {c.meter_number && <IB l="رقم العداد" v={c.meter_number} copy toast={toast} />}
      {c.service_speed && <IB l="الباقة / السرعة" v={c.service_speed} toast={toast} />}
      {c.last_bill_amount && <IB l="آخر فاتورة" v={nm(c.last_bill_amount) + ' ر.س'} toast={toast} />}
      {c.avg_monthly_cost && <IB l="المتوسط الشهري" v={nm(c.avg_monthly_cost) + ' ر.س'} toast={toast} />}
    </div>
  </div>;
}

function BillChart({ contractIds, brBills, color, label }) {
  const data = contractIds.flatMap(cid => brBills.filter(b => b.contract_id === cid))
    .reduce((acc, b) => { const ex = acc.find(x => x.month === b.bill_month); if (ex) { ex.amount += Number(b.amount || 0); ex.consumption += Number(b.consumption || 0); } else { acc.push({ month: b.bill_month, label: b.bill_month?.slice(5), amount: Number(b.amount || 0), consumption: Number(b.consumption || 0) }); } return acc; }, []).sort((a, b) => a.month.localeCompare(b.month));
  if (!data.length) return null;
  const ts = { background: 'var(--sf,#1e1e1e)', border: '1px solid var(--bd,#333)', borderRadius: 8, fontSize: 12, fontFamily: F };
  return <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: 'var(--hoverBg)', border: '1px solid var(--bd2)' }}>
    <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 12 }}>سجل الفواتير — {label}</div>
    <ResponsiveContainer width="100%" height={200}><BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" /><XAxis dataKey="label" tick={{ fill: 'var(--tx5,#666)', fontSize: 10 }} axisLine={false} /><YAxis tick={{ fill: 'var(--tx5,#666)', fontSize: 10 }} axisLine={false} width={50} /><Tooltip contentStyle={ts} formatter={v => [nm(Math.round(v)) + ' ر.س', 'المبلغ']} /><Bar dataKey="amount" fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} /></BarChart></ResponsiveContainer>
    {data.some(d => d.consumption > 0) && <ResponsiveContainer width="100%" height={140}><BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" /><XAxis dataKey="label" tick={{ fill: 'var(--tx5,#666)', fontSize: 10 }} axisLine={false} /><YAxis tick={{ fill: 'var(--tx5,#666)', fontSize: 10 }} axisLine={false} width={50} /><Tooltip contentStyle={ts} formatter={v => [nm(Math.round(v)) + ' kWh', 'الاستهلاك']} /><Bar dataKey="consumption" fill="#3498db" radius={[4, 4, 0, 0]} maxBarSize={40} /></BarChart></ResponsiveContainer>}
  </div>;
}

function UtilityTab({ contracts: utC, brBills, color, emptyMsg, summaryLabel, toast }) {
  if (!utC.length) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--tx6)' }}>{emptyMsg}</div>;
  const total = utC.reduce((s, c) => s + Number(c.annual_rent || c.amount || 0), 0);
  return <>
    <div style={{ padding: '12px 16px', borderRadius: 10, background: color + '08', border: '1px solid ' + color + '14', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 12, color }}>{summaryLabel}</span><span style={{ fontSize: 18, fontWeight: 900, color }}>{nm(total)} ر.س</span></div>
    {utC.map(c => <ContractCard key={c.id} c={c} color={color} toast={toast} />)}
    <BillChart contractIds={utC.map(c => c.id)} brBills={brBills} color={color} label={summaryLabel} />
  </>;
}

function DocsList({ docs, entityType, entityId }) {
  const filtered = (docs || []).filter(d => d.entity_type === entityType && d.entity_id === entityId);
  if (!filtered.length) return null;
  return <div style={{ marginTop: 16 }}>
    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>المستندات<span style={{ fontSize: 10, fontWeight: 600, color: C.blue, background: 'rgba(52,131,180,.1)', padding: '2px 8px', borderRadius: 4 }}>{filtered.length}</span></div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{filtered.map(d => <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 8, background: 'var(--hoverBg)', border: '1px solid var(--bd2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(52,131,180,.08)', border: '1px solid rgba(52,131,180,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></svg></div><div><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)' }}>{d.document_name || d.file_name}</div>{d.notes && <div style={{ fontSize: 9, color: 'var(--tx5)', marginTop: 2 }}>{d.notes}</div>}</div></div>
      {d.expiry_date && <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 4, color: new Date(d.expiry_date) < new Date() ? C.red : C.ok, background: new Date(d.expiry_date) < new Date() ? 'rgba(192,57,43,.08)' : 'rgba(39,160,70,.08)' }}>{d.expiry_date}</span>}
    </div>)}</div>
  </div>;
}

/* ═══ Status Badge ═══ */
function StatusBadge({ status, alert }) {
  const s = alert || status;
  const colors = { active: C.ok, ok: C.ok, expired: C.red, expiring_soon: '#e67e22', pending: C.gold, issue: C.red };
  const labels = { active: 'سارية', ok: 'سارية', expired: 'منتهية', expiring_soon: 'تنتهي قريباً', pending: 'قيد الإصدار', issue: 'مشكلة' };
  const c = colors[s] || 'var(--tx5)';
  return <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 4, color: c, background: c + '15' }}>{labels[s] || s}</span>;
}

/* ═══ Expense Info Box ═══ */
function ExpenseInfo({ amount, date, sadad, count, label, color }) {
  if (!amount && !count) return null;
  return <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: 10, background: color + '06', border: '1px solid ' + color + '12' }}>
    <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 10 }}>سجل المدفوعات — {label}</div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
      {amount && <div style={{ textAlign: 'center', padding: 8, borderRadius: 8, background: 'var(--hoverBg)' }}><div style={{ fontSize: 9, color: 'var(--tx5)', marginBottom: 4 }}>آخر دفعة</div><div style={{ fontSize: 16, fontWeight: 800, color }}>{nm(amount)} ر.س</div></div>}
      {date && <div style={{ textAlign: 'center', padding: 8, borderRadius: 8, background: 'var(--hoverBg)' }}><div style={{ fontSize: 9, color: 'var(--tx5)', marginBottom: 4 }}>التاريخ</div><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>{date}</div></div>}
      {sadad && <div style={{ textAlign: 'center', padding: 8, borderRadius: 8, background: 'var(--hoverBg)' }}><div style={{ fontSize: 9, color: 'var(--tx5)', marginBottom: 4 }}>رقم سداد</div><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)', direction: 'ltr' }}>{sadad}</div></div>}
    </div>
    {count > 0 && <div style={{ marginTop: 8, fontSize: 10, color: 'var(--tx5)', textAlign: 'center' }}>إجمالي المدفوعات: {count}</div>}
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   BRANCH DETAIL MODAL
   ═══════════════════════════════════════════════════════════════ */
function BranchDetailModal({ viewRow, setViewRow, openEdit, del, users, banks, contracts, bills, docs, toast, T }) {
  const [viewTab, setViewTab] = useState('info');
  const [openUtil, setOpenUtil] = useState(null);
  if (!viewRow) return null;
  const branchKey = viewRow.id || viewRow.branch_id;
  const bU = users.filter(u => u.branch_id === branchKey);
  const bB = banks.filter(a => a.branch_id === branchKey);
  const brContracts = contracts.filter(c => c.branch_id === branchKey);
  const brBills = bills.filter(b => b.branch_id === branchKey);
  const rentC = brContracts.filter(c => c.contract_type === 'rent');
  const elecC = brContracts.filter(c => c.contract_type === 'electricity');
  const netC = brContracts.filter(c => c.contract_type === 'internet');
  const waterC = brContracts.filter(c => c.contract_type === 'water');
  const totalContracts = brContracts.length;
  const totalBalance = bB.reduce((s, a) => s + Number(a.current_balance || 0), 0);
  const SH = ({ t, c }) => <div style={{ fontSize: 12, fontWeight: 700, color: c || C.gold, marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid ' + (c || C.gold) + '20' }}>{t}</div>;
  const roleClr = { 'المدير العام': '#e8c547', 'مدير فرع': '#85B7EB', 'محاسب': '#AFA9EC', 'موظف استقبال': '#5DCAA5' };
  const vt = [
    { id: 'info', l: 'البيانات' },
    { id: 'utilities', l: 'المرافق', n: totalContracts },
    { id: 'staff', l: 'الموظفين', n: bU.length },
    { id: 'banks', l: 'الحسابات', n: bB.length }
  ];

  return <div onClick={() => setViewRow(null)} style={{ position: 'fixed', inset: 0, background: 'var(--overlayBg,rgba(14,14,14,.8))', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 16 }}>
    <div onClick={e => e.stopPropagation()} style={{ background: 'var(--sf)', borderRadius: 16, width: 'min(920px,95vw)', height: 'min(650px,88vh)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 48px rgba(0,0,0,.4)', border: '1px solid rgba(212,160,23,.15)' }}>
      {/* Header */}
      <div style={{ background: 'var(--bg)', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(212,160,23,.12)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: viewRow.is_active !== false ? 'rgba(39,160,70,.08)' : 'rgba(153,153,153,.08)', border: '1.5px solid ' + (viewRow.is_active !== false ? 'rgba(39,160,70,.12)' : 'rgba(153,153,153,.1)'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={viewRow.is_active !== false ? C.ok : '#999'} strokeWidth="1.5"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" /></svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--tx)' }}>{viewRow.display_name || viewRow.code || '—'}</div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: viewRow.is_active !== false ? 'rgba(39,160,70,.1)' : 'rgba(153,153,153,.1)', color: viewRow.is_active !== false ? C.ok : '#999' }}>{viewRow.is_active !== false ? 'نشط' : 'معطّل'}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              {viewRow.city_name && <span style={{ fontSize: 10, color: 'var(--tx4)' }}>{viewRow.region_name} — {viewRow.city_name}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => openEdit(viewRow)} style={{ height: 32, padding: '0 16px', borderRadius: 8, border: '1px solid rgba(212,160,23,.2)', background: 'rgba(212,160,23,.08)', color: C.gold, fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>تعديل</button>
          <button onClick={() => setViewRow(null)} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--hoverBg)', border: '1px solid var(--bd)', color: 'var(--tx4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
      </div>
      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ width: 140, background: 'var(--bg)', borderLeft: '1px solid var(--bd2)', padding: '12px 6px', flexShrink: 0, overflowY: 'auto', scrollbarWidth: 'none' }}>
          {vt.map(t => <div key={t.id} onClick={() => setViewTab(t.id)} style={{ padding: '10px 10px', borderRadius: 8, marginBottom: 3, fontSize: 11, fontWeight: viewTab === t.id ? 700 : 500, color: viewTab === t.id ? C.gold : 'var(--tx4)', background: viewTab === t.id ? 'rgba(212,160,23,.08)' : 'transparent', border: viewTab === t.id ? '1px solid rgba(212,160,23,.12)' : '1px solid transparent', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: '.15s' }}>
            <span>{t.l}</span>{t.n !== undefined && <span style={{ fontSize: 9, fontWeight: 700, color: viewTab === t.id ? C.gold : 'var(--tx6)', background: viewTab === t.id ? 'rgba(212,160,23,.15)' : 'var(--hoverBg,rgba(255,255,255,.04))', padding: '1px 6px', borderRadius: 4, minWidth: 18, textAlign: 'center' }}>{t.n}</span>}
          </div>)}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', scrollbarWidth: 'none' }}>

          {/* ═══ TAB 1: البيانات ═══ */}
          {viewTab === 'info' && <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div><SH t="المعلومات الأساسية" c={C.gold} /><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><IB l="الكود" v={viewRow.code} copy toast={toast} /><IB l="الجوال" v={viewRow.phone} copy toast={toast} /></div></div>
            <div><SH t="المدير" c={C.blue} />{viewRow.manager_user_name ? <div style={{ background: 'rgba(52,131,180,.04)', borderRadius: 10, padding: '12px 16px', border: '1px solid rgba(52,131,180,.08)', display: 'flex', alignItems: 'center', gap: 12 }}><div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(52,131,180,.1)', border: '1px solid rgba(52,131,180,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: C.blue }}>{(viewRow.manager_user_name || '?')[0]}</div><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{viewRow.manager_user_name}</div></div></div> : <div style={{ fontSize: 11, color: 'var(--tx5)' }}>لم يتم تعيين مدير</div>}</div>
            <div><SH t="العنوان" c={C.ok} /><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><IB l="المنطقة" v={viewRow.region_name} toast={toast} /><IB l="المدينة" v={viewRow.city_name} toast={toast} /><IB l="الحي" v={viewRow.district_name} toast={toast} /><IB l="رقم المبنى" v={viewRow.building_number} toast={toast} /></div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}><IB l="الشارع" v={viewRow.street} toast={toast} /><IB l="Street (EN)" v={viewRow.street_en} toast={toast} /></div><div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginTop: 8 }}><IB l="الرمز البريدي" v={viewRow.postal_code} copy toast={toast} /></div></div>
          </div>}

          {/* ═══ TAB 3: المرافق (Accordion) ═══ */}
          {viewTab === 'utilities' && <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[['rent', 'الإيجار', C.gold, rentC], ['electricity', 'الكهرباء', '#e67e22', elecC], ['internet', 'الإنترنت', C.blue, netC], ['water', 'الماء', C.ok, waterC]].map(([type, label, color, cList]) => {
              const isOpen = openUtil === type;
              const cBills = brBills.filter(b => cList.some(c => c.id === b.contract_id));
              const totalAmt = cList.reduce((s, c) => s + Number(c.amount || c.annual_rent || 0), 0);
              return <div key={type} style={{ borderRadius: 12, border: '1px solid ' + (isOpen ? color + '25' : 'rgba(255,255,255,.04)'), overflow: 'hidden', transition: '.2s' }}>
                <div onClick={() => setOpenUtil(isOpen ? null : type)} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: isOpen ? color + '06' : 'transparent', borderRight: '4px solid ' + color }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)', flex: 1 }}>{label}</span>
                  {cList.length > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: color, background: color + '12', padding: '2px 8px', borderRadius: 5 }}>{totalAmt > 0 ? nm(totalAmt) + ' ر.س' : cList.length}</span>}
                  {cList.length === 0 && <span style={{ fontSize: 9, color: 'var(--tx5)' }}>—</span>}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '.2s' }}><polyline points="6 9 12 15 18 9" stroke={color} strokeWidth="2.5" fill="none" /></svg>
                </div>
                {isOpen && <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,.04)' }}>
                  {cList.length === 0 ? <div style={{ textAlign: 'center', padding: 20, color: 'var(--tx6)', fontSize: 11 }}>لا توجد عقود</div> :
                    cList.map(c => <div key={c.id} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <IB l="المزود" v={c.provider_name || c.lessor_name} toast={toast} />
                        <IB l="المبلغ" v={c.amount || c.annual_rent ? nm(c.amount || c.annual_rent) + ' ر.س' : null} toast={toast} />
                        {c.account_number && <IB l="رقم الحساب" v={c.account_number} copy toast={toast} />}
                        {c.meter_number && <IB l="رقم العداد" v={c.meter_number} copy toast={toast} />}
                        {c.ejar_contract_number && <IB l="رقم عقد إيجار" v={c.ejar_contract_number} copy toast={toast} />}
                        {c.service_speed && <IB l="السرعة" v={c.service_speed} toast={toast} />}
                        <IB l="البداية" v={c.contract_start} toast={toast} />
                        <IB l="النهاية" v={c.contract_end} toast={toast} />
                        {c.next_payment_date && <IB l="السداد القادم" v={c.next_payment_date} toast={toast} />}
                      </div>
                      {cBills.filter(b => b.contract_id === c.id).length > 0 && <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: color, marginBottom: 6 }}>سجل الفواتير ({cBills.filter(b => b.contract_id === c.id).length})</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, fontSize: 9 }}>
                          <div style={{ padding: '4px 8px', background: 'rgba(255,255,255,.04)', fontWeight: 600, color: 'var(--tx4)' }}>الشهر</div>
                          <div style={{ padding: '4px 8px', background: 'rgba(255,255,255,.04)', fontWeight: 600, color: 'var(--tx4)' }}>المبلغ</div>
                          <div style={{ padding: '4px 8px', background: 'rgba(255,255,255,.04)', fontWeight: 600, color: 'var(--tx4)' }}>الاستهلاك</div>
                          {cBills.filter(b => b.contract_id === c.id).slice(0, 6).map((b, i) => <React.Fragment key={i}>
                            <div style={{ padding: '4px 8px', color: 'var(--tx5)', borderBottom: '1px solid rgba(255,255,255,.02)' }}>{b.bill_month}</div>
                            <div style={{ padding: '4px 8px', color: color, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,.02)' }}>{nm(b.amount)}</div>
                            <div style={{ padding: '4px 8px', color: 'var(--tx5)', borderBottom: '1px solid rgba(255,255,255,.02)' }}>{b.consumption || '—'}</div>
                          </React.Fragment>)}
                        </div>
                      </div>}
                    </div>)}
                </div>}
              </div>;
            })}
          </div>}

          {/* ═══ TAB 4: الموظفين ═══ */}
          {viewTab === 'staff' && <div>{bU.length === 0 ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--tx6)' }}>لا يوجد موظفين</div> :
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{bU.map(u => {
              const rc = roleClr[u.role_name] || roleClr[u.roles?.name_ar] || '#888';
              const isManager = viewRow.manager_user_id === u.id;
              return <div key={u.id} style={{ background: 'var(--hoverBg,rgba(255,255,255,.025))', borderRadius: 10, padding: '12px 16px', border: '1px solid var(--bd2,rgba(255,255,255,.04))', display: 'flex', alignItems: 'center', gap: 12, borderRight: '3px solid ' + rc }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: rc + '15', border: '1px solid ' + rc + '25', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: rc, flexShrink: 0 }}>{(u.name_ar || '?')[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx2)' }}>{u.name_ar}</div>
                  <div style={{ fontSize: 10, color: rc, marginTop: 2 }}>{u.role_name || u.roles?.name_ar || '—'}</div>
                </div>
                {isManager && <span style={{ fontSize: 9, color: C.gold, background: 'rgba(212,160,23,.1)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>المدير</span>}
              </div>;
            })}</div>}</div>}

          {/* ═══ TAB: الحسابات البنكية ═══ */}
          {viewTab === 'banks' && <div>
            {bB.length > 0 && <div style={{ padding: '16px 18px', borderRadius: 12, background: 'rgba(39,160,70,.04)', border: '1px solid rgba(39,160,70,.1)', marginBottom: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: C.ok, opacity: .7, marginBottom: 6 }}>إجمالي الأرصدة</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: C.ok }}>{nm(totalBalance)}</div>
              <div style={{ fontSize: 9, color: C.ok, opacity: .4, marginTop: 4 }}>ر.س</div>
            </div>}
            {bB.length === 0 ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--tx6)' }}>لا توجد حسابات</div> :
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{bB.map(a => {
                const lowBal = a.min_balance_alert && Number(a.current_balance || 0) < Number(a.min_balance_alert);
                return <div key={a.id} style={{ background: 'var(--hoverBg,rgba(255,255,255,.025))', borderRadius: 12, padding: '14px 16px', border: '1px solid ' + (lowBal ? 'rgba(230,126,34,.15)' : 'var(--bd2,rgba(255,255,255,.04))') }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx2)' }}>{a.bank_name}</span>
                      {a.account_purpose && <span style={{ fontSize: 8, color: 'var(--tx5)', background: 'rgba(255,255,255,.04)', padding: '2px 6px', borderRadius: 4 }}>{a.account_purpose}</span>}
                    </div>
                    {a.is_primary && <span style={{ fontSize: 9, color: C.gold, background: 'rgba(212,160,23,.1)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>رئيسي</span>}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: lowBal ? '#e67e22' : C.ok, marginBottom: 8 }}>{nm(a.current_balance || 0)} <span style={{ fontSize: 10, opacity: .5 }}>ر.س</span></div>
                  {lowBal && <div style={{ fontSize: 9, color: '#e67e22', background: 'rgba(230,126,34,.06)', padding: '4px 8px', borderRadius: 5, marginBottom: 8, display: 'inline-block' }}>رصيد منخفض — الحد الأدنى {nm(a.min_balance_alert)}</div>}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <IB l="رقم الحساب" v={a.account_number} copy toast={toast} />
                    <IB l="سويفت" v={a.swift_code} copy toast={toast} />
                  </div>
                  <div style={{ marginTop: 8 }}><IB l="الآيبان" v={a.iban} copy toast={toast} /></div>
                </div>;
              })}</div>}
          </div>}

        </div>
      </div>
    </div>
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   BANK ACCOUNTS TAB
   ═══════════════════════════════════════════════════════════════ */
function BankAccountsTab({ sb, toast, user, lang, branches, banks, docs, reload }) {
  const T = (a, e) => lang !== 'en' ? a : e;
  const [pop, setPop] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');
  const [recon, setRecon] = useState([]);
  const [viewAcct, setViewAcct] = useState(null);
  const [acctTab, setAcctTab] = useState('data');
  const [txnFilter, setTxnFilter] = useState('all');
  useEffect(() => { sb.from('bank_reconciliation').select('*').is('deleted_at', null).order('transaction_date', { ascending: false }).then(({ data }) => setRecon(data || [])); }, [sb]);
  const filtered = filter === 'all' ? banks : banks.filter(b => b.branch_id === filter);
  const saveBankAccount = async () => {
    setSaving(true);
    try { const d = { ...form }; const id = d._id; delete d._id; delete d._table; Object.keys(d).forEach(k => { if (d[k] === '') d[k] = null; if (k === 'is_primary' || k === 'is_active') d[k] = d[k] === 'true' || d[k] === true; });
      if (id) { d.updated_by = user?.id; await sb.from('bank_accounts').update(d).eq('id', id); } else { d.created_by = user?.id; await sb.from('bank_accounts').insert(d); }
      toast(T('تم', 'Saved')); setPop(false); reload(); } catch (e) { toast('خطأ: ' + e.message?.slice(0, 60)); } setSaving(false);
  };
  const purposeMap = { deposit: 'إيداع عملاء', sadad: 'سداد مدفوعات', transfer: 'حوالات خارجية', salary: 'رواتب موظفين', savings: 'ادخار' };
  const hasAlert = banks.some(b => Number(b.current_balance || 0) <= Number(b.min_balance_alert || 0) && Number(b.min_balance_alert) > 0);
  const alertCount = banks.filter(b => Number(b.current_balance || 0) <= Number(b.min_balance_alert || 0) && Number(b.min_balance_alert) > 0).length;

  const totalBal = banks.reduce((s, b) => s + Number(b.current_balance || 0), 0);
  const purposeGroups = {};
  banks.forEach(b => { const p = b.account_purpose || 'عام'; if (!purposeGroups[p]) purposeGroups[p] = { count: 0, total: 0 }; purposeGroups[p].count++; purposeGroups[p].total += Number(b.current_balance || 0); });
  const purposeArr = Object.entries(purposeGroups).sort((a, b) => b[1].total - a[1].total);
  const maxPurpose = Math.max(...purposeArr.map(([, v]) => v.total), 1);
  const purposeClr = { 'إيداع': C.ok, 'سداد': C.red, 'تحويلات': C.blue, 'رواتب': '#9b59b6', 'ادخار': C.gold, 'عام': '#888' };
  const [bankFilter, setBankFilter] = useState('all');
  const [purposeFilter, setPurposeFilter] = useState('all');
  const bankNames = [...new Set(banks.map(b => b.bank_name).filter(Boolean))];
  const purposeNames = [...new Set(banks.map(b => b.account_purpose || 'عام').filter(Boolean))];
  const filtered2 = filtered.filter(b => {
    if (bankFilter !== 'all' && b.bank_name !== bankFilter) return false;
    if (purposeFilter !== 'all' && (b.account_purpose || 'عام') !== purposeFilter) return false;
    return true;
  });

  return <div>
    {/* 3 Stat Cards */}
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, marginBottom: 20 }}>
      {/* Total Balance */}
      <div style={{ padding: '20px 24px', borderRadius: 14, background: 'linear-gradient(135deg,rgba(39,160,70,.08),rgba(39,160,70,.02))', border: '1px solid rgba(39,160,70,.15)', minWidth: 200, textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.ok, marginBottom: 8 }}>إجمالي الأرصدة</div>
        <div style={{ fontSize: 32, fontWeight: 900, color: C.ok, direction: 'ltr' }}>{nm(totalBal)} <span style={{ fontSize: 12, fontWeight: 500 }}>ر.س</span></div>
        <div style={{ fontSize: 9, color: 'var(--tx5)', marginTop: 6 }}>آخر تحديث: {new Date().toISOString().slice(0, 10)}</div>
        <div style={{ fontSize: 10, color: 'var(--tx5)', marginTop: 4 }}>{filtered2.length} حساب معروض</div>
      </div>
      {/* Distribution by Purpose */}
      <div style={{ padding: '16px 20px', borderRadius: 14, background: 'rgba(52,131,180,.04)', border: '1px solid rgba(52,131,180,.1)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, marginBottom: 12 }}>التوزيع حسب الغرض</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {purposeArr.map(([p, v]) => { const pc = purposeClr[p] || '#888'; return <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: 'var(--tx3)', minWidth: 80, textAlign: 'right' }}>{purposeMap[p] || p} ({v.count})</span>
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,.04)', overflow: 'hidden' }}><div style={{ height: '100%', width: (v.total / maxPurpose * 100) + '%', borderRadius: 3, background: pc }} /></div>
            <span style={{ fontSize: 10, fontWeight: 700, color: pc, minWidth: 70, direction: 'ltr' }}>{nm(v.total)}</span>
          </div>; })}
        </div>
      </div>
      {/* Alerts */}
      <div style={{ padding: '16px 20px', borderRadius: 14, background: hasAlert ? 'rgba(192,57,43,.04)' : 'rgba(255,255,255,.02)', border: '1px solid ' + (hasAlert ? 'rgba(192,57,43,.1)' : 'rgba(255,255,255,.04)'), minWidth: 140 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: hasAlert ? C.red : 'var(--tx4)', marginBottom: 12 }}>التنبيهات</div>
        {alertCount > 0 ? <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.red }} />
          <span style={{ fontSize: 11, color: C.red, fontWeight: 700 }}>{alertCount} حساب بدون رصيد</span>
        </div> : <div style={{ fontSize: 10, color: 'var(--tx5)' }}>لا توجد تنبيهات</div>}
        <div style={{ fontSize: 9, color: 'var(--tx5)', marginTop: 8 }}>{banks.length} حساب معروض</div>
      </div>
    </div>
    {/* Filters Row 1: Branch */}
    <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ fontSize: 10, color: 'var(--tx5)', marginLeft: 4 }}>الفرع:</span>
      <button onClick={() => setFilter('all')} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 10, fontWeight: filter === 'all' ? 700 : 500, color: filter === 'all' ? C.gold : 'var(--tx4)', background: filter === 'all' ? 'rgba(212,160,23,.08)' : 'transparent', border: filter === 'all' ? '1px solid rgba(212,160,23,.15)' : '1px solid rgba(255,255,255,.06)', cursor: 'pointer', fontFamily: F }}>الكل ({banks.length})</button>
      {branches.map(br => <button key={br.branch_id} onClick={() => setFilter(br.branch_id)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 10, fontWeight: filter === br.branch_id ? 700 : 500, color: filter === br.branch_id ? C.gold : 'var(--tx4)', background: filter === br.branch_id ? 'rgba(212,160,23,.08)' : 'transparent', border: filter === br.branch_id ? '1px solid rgba(212,160,23,.15)' : '1px solid rgba(255,255,255,.06)', cursor: 'pointer', fontFamily: F }}>{br.name_ar}</button>)}
    </div>
    {/* Filters Row 2: Bank + Purpose */}
    <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ fontSize: 10, color: 'var(--tx5)', marginLeft: 4 }}>الغرض:</span>
      <button onClick={() => setPurposeFilter('all')} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 10, fontWeight: purposeFilter === 'all' ? 700 : 500, color: purposeFilter === 'all' ? C.gold : 'var(--tx4)', background: purposeFilter === 'all' ? 'rgba(212,160,23,.08)' : 'transparent', border: purposeFilter === 'all' ? '1px solid rgba(212,160,23,.15)' : '1px solid rgba(255,255,255,.06)', cursor: 'pointer', fontFamily: F }}>الكل ({filtered.length})</button>
      {purposeNames.map(p => { const cnt = filtered.filter(b => (b.account_purpose || 'عام') === p).length; return <button key={p} onClick={() => setPurposeFilter(p)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 10, fontWeight: purposeFilter === p ? 700 : 500, color: purposeFilter === p ? C.gold : 'var(--tx4)', background: purposeFilter === p ? 'rgba(212,160,23,.08)' : 'transparent', border: purposeFilter === p ? '1px solid rgba(212,160,23,.15)' : '1px solid rgba(255,255,255,.06)', cursor: 'pointer', fontFamily: F }}>{purposeMap[p] || p} ({cnt})</button>; })}
      <span style={{ fontSize: 10, color: 'var(--tx5)', marginRight: 8, marginLeft: 12 }}>البنك:</span>
      <button onClick={() => setBankFilter('all')} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 10, fontWeight: bankFilter === 'all' ? 700 : 500, color: bankFilter === 'all' ? C.gold : 'var(--tx4)', background: bankFilter === 'all' ? 'rgba(212,160,23,.08)' : 'transparent', border: bankFilter === 'all' ? '1px solid rgba(212,160,23,.15)' : '1px solid rgba(255,255,255,.06)', cursor: 'pointer', fontFamily: F }}>الكل</button>
      {bankNames.map(n => <button key={n} onClick={() => setBankFilter(n)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 10, fontWeight: bankFilter === n ? 700 : 500, color: bankFilter === n ? C.gold : 'var(--tx4)', background: bankFilter === n ? 'rgba(212,160,23,.08)' : 'transparent', border: bankFilter === n ? '1px solid rgba(212,160,23,.15)' : '1px solid rgba(255,255,255,.06)', cursor: 'pointer', fontFamily: F }}>{n}</button>)}
    </div>
    {filtered2.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--tx6)' }}>لا توجد حسابات</div> :
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(380px,1fr))', gap: 14 }}>{filtered2.map(a => {
        const br = branches.find(b => b.branch_id === a.branch_id); const bal = Number(a.current_balance || 0); const minA = Number(a.min_balance_alert || 0); const isLow = minA > 0 && bal <= minA;
        return <div key={a.id} onClick={() => { setViewAcct(a); setAcctTab('data'); setTxnFilter('all'); }} style={{ background: 'var(--bg)', border: '1px solid ' + (isLow ? 'rgba(192,57,43,.2)' : 'var(--bd)'), borderRadius: 14, overflow: 'hidden', cursor: 'pointer', transition: '.15s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(212,160,23,.2)'} onMouseLeave={e => e.currentTarget.style.borderColor = isLow ? 'rgba(192,57,43,.2)' : 'var(--bd)'}>
          {isLow && <div style={{ padding: '5px 14px', background: 'rgba(192,57,43,.06)', borderBottom: '1px solid rgba(192,57,43,.1)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.red }} />
            <span style={{ fontSize: 9, fontWeight: 600, color: C.red }}>رصيد منخفض</span>
          </div>}
          <div style={{ padding: '14px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: isLow ? 'rgba(192,57,43,.08)' : 'rgba(212,160,23,.08)', border: '1px solid ' + (isLow ? 'rgba(192,57,43,.12)' : 'rgba(212,160,23,.12)'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isLow ? C.red : C.gold} strokeWidth="1.5"><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M2 10h20" /></svg></div>
                <div><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{a.bank_name}</div>{a.account_name && <div style={{ fontSize: 10, color: 'var(--tx4)' }}>{a.account_name}</div>}</div>
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {a.account_purpose && <span style={{ fontSize: 8, padding: '2px 7px', borderRadius: 4, background: (purposeClr[a.account_purpose] || '#888') + '12', border: '1px solid ' + (purposeClr[a.account_purpose] || '#888') + '20', color: purposeClr[a.account_purpose] || '#888', fontWeight: 600 }}>{purposeMap[a.account_purpose] || a.account_purpose}</span>}
                {a.is_primary && <span style={{ fontSize: 8, padding: '2px 7px', borderRadius: 4, background: 'rgba(212,160,23,.1)', border: '1px solid rgba(212,160,23,.15)', color: C.gold, fontWeight: 700 }}>رئيسي</span>}
              </div>
            </div>
            {br && <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="1.5"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" /></svg>
              <span style={{ fontSize: 9, color: 'var(--tx5)' }}>{br.name_ar}</span>
            </div>}
          </div>
          {/* Balance */}
          <div style={{ padding: '14px 18px', background: isLow ? 'rgba(192,57,43,.03)' : 'rgba(39,160,70,.03)', borderTop: '1px solid ' + (isLow ? 'rgba(192,57,43,.06)' : 'rgba(39,160,70,.06)'), borderBottom: '1px solid ' + (isLow ? 'rgba(192,57,43,.06)' : 'rgba(39,160,70,.06)') }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: isLow ? C.red : C.ok }}>الرصيد</span>
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: isLow ? '#e67e22' : C.ok, direction: 'ltr' }}>{nm(bal)} <span style={{ fontSize: 10, fontWeight: 500 }}>ر.س</span></span>
                {a.balance_updated_at && <div style={{ fontSize: 8, color: 'var(--tx5)', marginTop: 2 }}>آخر تحديث: {String(a.balance_updated_at).slice(0, 10)}</div>}
              </div>
            </div>
          </div>
          {/* Account details */}
          <div style={{ padding: '10px 18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <IB l="رقم الحساب" v={a.account_number} copy toast={toast} />
              <IB l="سويفت" v={a.swift_code} copy toast={toast} />
            </div>
            <div style={{ marginTop: 8 }}><IB l="الآيبان" v={a.iban} copy toast={toast} /></div>
          </div>
        </div>;
      })}</div>}
    {/* Bank Account Detail Side Panel */}
    {viewAcct && (() => {
      const a = viewAcct;
      const br = branches.find(b => b.branch_id === a.branch_id);
      const bal = Number(a.current_balance || 0);
      const txns = recon.filter(r => r.bank_account_id === a.id);
      const payments = [];
      const totalIn = txns.filter(t => t.amount > 0).reduce((s, t) => s + Number(t.amount), 0);
      const totalOut = txns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
      const matched = txns.filter(t => t.match_status === 'matched').length;
      const pending = txns.filter(t => t.match_status === 'pending').length;
      const matchPct = txns.length > 0 ? Math.round(matched / txns.length * 100) : 0;
      const filteredTxns = txnFilter === 'all' ? txns : txns.filter(t => {
        if (txnFilter === 'deposit') return t.transaction_type === 'deposit';
        if (txnFilter === 'withdrawal') return t.transaction_type === 'withdrawal';
        if (txnFilter === 'transfer_in') return t.transaction_type === 'transfer_in';
        if (txnFilter === 'transfer_out') return t.transaction_type === 'transfer_out';
        return true;
      });
      const txnIcon = { deposit: '↓', withdrawal: '↑', transfer_in: '←', transfer_out: '→' };
      const txnClr = { deposit: C.ok, withdrawal: C.red, transfer_in: C.blue, transfer_out: '#e67e22' };
      const txnLbl = { deposit: 'إيداع', withdrawal: 'سحب', transfer_in: 'تحويل وارد', transfer_out: 'تحويل صادر' };
      const SH2 = ({ t, c }) => <div style={{ fontSize: 12, fontWeight: 700, color: c || C.gold, marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid ' + (c || C.gold) + '20' }}>{t}</div>;
      const atabs = [{ id: 'data', l: 'البيانات' }, { id: 'txns', l: 'الحركات', n: txns.length }, { id: 'payments', l: 'المدفوعات', n: 0 }, { id: 'recon', l: 'التسويات', n: pending }];
      return <div onClick={() => setViewAcct(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(14,14,14,.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 16 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: 'var(--sf)', borderRadius: 16, width: 'min(920px,95vw)', height: 'min(650px,88vh)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 48px rgba(0,0,0,.4)', border: '1px solid rgba(212,160,23,.15)' }}>
          {/* Header */}
          <div style={{ background: 'var(--bg)', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(212,160,23,.12)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(212,160,23,.08)', border: '1.5px solid rgba(212,160,23,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.5"><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M2 10h20" /></svg></div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--tx)' }}>{a.bank_name}</span>
                  {a.is_primary && <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 5, background: 'rgba(212,160,23,.1)', color: C.gold, fontWeight: 700 }}>رئيسي</span>}
                  {a.account_purpose && <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 5, background: (purposeClr[a.account_purpose] || '#888') + '12', color: purposeClr[a.account_purpose] || '#888', fontWeight: 600 }}>{purposeMap[a.account_purpose] || a.account_purpose}</span>}
                </div>
                {a.account_name && <div style={{ fontSize: 12, color: 'var(--tx4)' }}>{a.account_name}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {br && <span style={{ fontSize: 10, color: 'var(--tx5)' }}>{br.name_ar}</span>}
                  <span style={{ fontSize: 10, color: 'var(--tx5)', direction: 'ltr' }}>{a.account_number}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => { setViewAcct(null); setForm({ _id: a.id, bank_name: a.bank_name || '', account_name: a.account_name || '', account_number: a.account_number || '', iban: a.iban || '', swift_code: a.swift_code || '', branch_id: a.branch_id || '', is_primary: String(a.is_primary || false), is_active: String(a.is_active !== false), notes: a.notes || '' }); setPop(true); }} style={{ height: 32, padding: '0 16px', borderRadius: 8, border: '1px solid rgba(212,160,23,.2)', background: 'rgba(212,160,23,.08)', color: C.gold, fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>تعديل</button>
              <button onClick={() => setViewAcct(null)} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--hoverBg)', border: '1px solid var(--bd)', color: 'var(--tx4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
          </div>
          {/* Body */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <div style={{ width: 140, background: 'var(--bg)', borderLeft: '1px solid var(--bd2)', padding: '12px 6px', flexShrink: 0, overflowY: 'auto', scrollbarWidth: 'none' }}>
              {atabs.map(t => <div key={t.id} onClick={() => setAcctTab(t.id)} style={{ padding: '10px 10px', borderRadius: 8, marginBottom: 3, fontSize: 11, fontWeight: acctTab === t.id ? 700 : 500, color: acctTab === t.id ? C.gold : 'var(--tx4)', background: acctTab === t.id ? 'rgba(212,160,23,.08)' : 'transparent', border: acctTab === t.id ? '1px solid rgba(212,160,23,.12)' : '1px solid transparent', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: '.15s' }}>
                <span>{t.l}</span>{t.n !== undefined && t.n > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: acctTab === t.id ? C.gold : 'var(--tx6)', background: acctTab === t.id ? 'rgba(212,160,23,.15)' : 'rgba(255,255,255,.04)', padding: '1px 6px', borderRadius: 4, minWidth: 18, textAlign: 'center' }}>{t.n}</span>}
              </div>)}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', scrollbarWidth: 'none' }}>

              {/* TAB 1: البيانات */}
              {acctTab === 'data' && <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Balance card */}
                <div style={{ padding: '20px', borderRadius: 14, background: 'rgba(39,160,70,.04)', border: '1.5px solid rgba(39,160,70,.12)', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: C.ok, opacity: .7, marginBottom: 8 }}>الرصيد الحالي</div>
                  <div style={{ fontSize: 34, fontWeight: 900, color: C.ok, direction: 'ltr' }}>{nm(bal)} <span style={{ fontSize: 12, fontWeight: 500 }}>ر.س</span></div>
                  <div style={{ fontSize: 9, color: 'var(--tx5)', marginTop: 6 }}>آخر تحديث: {a.balance_updated_at ? String(a.balance_updated_at).slice(0, 10) : new Date().toISOString().slice(0, 10)}</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 12 }}>
                    <div><div style={{ fontSize: 16, fontWeight: 800, color: C.ok }}>{nm(totalIn)}</div><div style={{ fontSize: 9, color: C.ok, opacity: .6 }}>وارد (هذا الشهر)</div></div>
                    <div style={{ width: 1, background: 'rgba(255,255,255,.06)' }} />
                    <div><div style={{ fontSize: 16, fontWeight: 800, color: '#e67e22' }}>{nm(totalOut)}</div><div style={{ fontSize: 9, color: '#e67e22', opacity: .6 }}>صادر (هذا الشهر)</div></div>
                  </div>
                </div>
                {/* Info */}
                <div><SH2 t="معلومات الحساب" c={C.gold} /><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><IB l="اسم البنك" v={a.bank_name} toast={toast} /><IB l="اسم الحساب" v={a.account_name} toast={toast} /><IB l="رقم الحساب" v={a.account_number} copy toast={toast} /><IB l="رمز سويفت" v={a.swift_code} copy toast={toast} /></div><div style={{ marginTop: 8 }}><IB l="الآيبان (IBAN)" v={a.iban} copy toast={toast} /></div></div>
                {/* Classification */}
                <div><SH2 t="التصنيف" c={C.ok} /><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><IB l="الغرض" v={purposeMap[a.account_purpose] || a.account_purpose || 'عام'} toast={toast} /><IB l="النوع" v={a.account_type || 'جاري'} toast={toast} />{br && <IB l="الفرع" v={br.name_ar} toast={toast} />}{a.min_balance_alert && <IB l="الحد الأدنى للتنبيه" v={nm(a.min_balance_alert) + ' ر.س'} toast={toast} />}</div></div>
                {/* Quick summary */}
                <div><SH2 t="ملخص سريع" c={C.blue} /><div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                  {[['مطابقة', matched, C.ok], ['معلّقة', pending, pending > 0 ? '#e67e22' : 'var(--tx5)'], ['حركة', txns.length, C.gold], ['دفعة', 0, 'var(--tx5)']].map(([l, v, c], i) => <div key={i} style={{ padding: 12, borderRadius: 10, background: c === 'var(--tx5)' ? 'rgba(255,255,255,.02)' : c + '08', border: '1px solid ' + (c === 'var(--tx5)' ? 'rgba(255,255,255,.04)' : c + '12'), textAlign: 'center' }}><div style={{ fontSize: 20, fontWeight: 900, color: c }}>{v}</div><div style={{ fontSize: 8, color: c, opacity: .7, marginTop: 4 }}>{l}</div></div>)}
                </div></div>
              </div>}

              {/* TAB 2: الحركات */}
              {acctTab === 'txns' && <div>
                {/* Summary cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                  {[['إجمالي الوارد', nm(totalIn), C.ok], ['إجمالي الصادر', nm(totalOut), '#e67e22'], ['الصافي', (totalIn - totalOut >= 0 ? '+' : '') + nm(totalIn - totalOut), totalIn - totalOut >= 0 ? C.ok : C.red]].map(([l, v, c], i) => <div key={i} style={{ padding: 14, borderRadius: 10, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.04)', textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 800, color: c }}>{v}</div><div style={{ fontSize: 9, color: c, opacity: .6, marginTop: 4 }}>{l}</div></div>)}
                </div>
                {/* Filter chips */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 14, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  {[['all', 'الكل', txns.length], ['deposit', 'إيداع', txns.filter(t => t.transaction_type === 'deposit').length], ['withdrawal', 'سحب', txns.filter(t => t.transaction_type === 'withdrawal').length], ['transfer_in', 'وارد', txns.filter(t => t.transaction_type === 'transfer_in').length], ['transfer_out', 'صادر', txns.filter(t => t.transaction_type === 'transfer_out').length]].map(([k, l, n]) => <button key={k} onClick={() => setTxnFilter(k)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 10, fontWeight: txnFilter === k ? 700 : 500, color: txnFilter === k ? C.gold : 'var(--tx4)', background: txnFilter === k ? 'rgba(212,160,23,.08)' : 'transparent', border: txnFilter === k ? '1px solid rgba(212,160,23,.15)' : '1px solid rgba(255,255,255,.06)', cursor: 'pointer', fontFamily: F }}>{l} ({n})</button>)}
                </div>
                {/* Transaction list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {filteredTxns.length === 0 ? <div style={{ textAlign: 'center', padding: 30, color: 'var(--tx6)' }}>لا توجد حركات</div> :
                    filteredTxns.map(t => { const c = txnClr[t.transaction_type] || '#888'; const isIn = Number(t.amount) > 0; return <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.03)' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: c + '12', border: '1px solid ' + c + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: c, flexShrink: 0 }}>{txnIcon[t.transaction_type] || '•'}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)', marginBottom: 2 }}>{t.description}</div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: 9, color: 'var(--tx5)', direction: 'ltr' }}>{t.transaction_date}</span>
                          <span style={{ fontSize: 9, color: 'var(--tx5)', direction: 'ltr' }}>{t.reference_number}</span>
                          <span style={{ fontSize: 8, padding: '1px 6px', borderRadius: 3, background: t.match_status === 'matched' ? 'rgba(39,160,70,.08)' : 'rgba(230,126,34,.08)', color: t.match_status === 'matched' ? C.ok : '#e67e22', fontWeight: 600 }}>{t.match_status === 'matched' ? 'مطابق' : 'معلّق'}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'left', flexShrink: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: isIn ? C.ok : C.red }}>{isIn ? '+' : ''}{nm(t.amount)}</div>
                        <div style={{ fontSize: 8, color: isIn ? C.ok : C.red, opacity: .6 }}>{txnLbl[t.transaction_type] || '—'}</div>
                      </div>
                    </div>; })}
                </div>
              </div>}

              {/* TAB 3: المدفوعات */}
              {acctTab === 'payments' && <div>
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--tx6)', fontSize: 11 }}>سيتم ربط المدفوعات بالحساب البنكي قريباً</div>
              </div>}

              {/* TAB 4: التسويات */}
              {acctTab === 'recon' && <div>
                {/* Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                  {[['مطابقة', matched, C.ok], ['معلّقة', pending, pending > 0 ? '#e67e22' : 'var(--tx5)'], ['نسبة المطابقة', matchPct + '%', matchPct >= 80 ? C.ok : matchPct >= 50 ? '#e67e22' : C.red]].map(([l, v, c], i) => <div key={i} style={{ padding: 14, borderRadius: 10, background: c === 'var(--tx5)' ? 'rgba(255,255,255,.02)' : c + '08', border: '1px solid ' + (c === 'var(--tx5)' ? 'rgba(255,255,255,.04)' : c + '12'), textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 900, color: c }}>{v}</div><div style={{ fontSize: 9, color: c, opacity: .7, marginTop: 4 }}>{l}</div></div>)}
                </div>
                {/* Progress bar */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex', background: 'rgba(255,255,255,.06)' }}>
                    <div style={{ width: matchPct + '%', background: C.ok, transition: 'width .3s' }} />
                    <div style={{ width: (100 - matchPct) + '%', background: '#e67e22', transition: 'width .3s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 9, color: C.ok }}>مطابقة {matched}/{txns.length}</span>
                    <span style={{ fontSize: 9, color: '#e67e22' }}>معلّقة {pending}/{txns.length}</span>
                  </div>
                </div>
                {/* Pending transactions */}
                {pending > 0 && <><SH2 t={'حركات تحتاج مطابقة (' + pending + ')'} c="#e67e22" />
                  {txns.filter(t => t.match_status === 'pending').map(t => { const isIn = Number(t.amount) > 0; return <div key={t.id} style={{ background: 'rgba(230,126,34,.03)', borderRadius: 10, padding: '12px 16px', border: '1px solid rgba(230,126,34,.08)', marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)' }}>{t.description}</div><div style={{ fontSize: 9, color: 'var(--tx5)', marginTop: 2 }}>{t.transaction_date}  {t.reference_number}</div></div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: isIn ? C.ok : C.red }}>{isIn ? '+' : ''}{nm(t.amount)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button style={{ flex: 1, height: 32, borderRadius: 8, border: '1px solid rgba(39,160,70,.2)', background: 'rgba(39,160,70,.06)', color: C.ok, fontFamily: F, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>مطابقة مع فاتورة</button>
                      <button style={{ flex: 1, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)', color: 'var(--tx4)', fontFamily: F, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>مطابقة يدوية</button>
                      <button style={{ height: 32, padding: '0 12px', borderRadius: 8, border: '1px solid rgba(192,57,43,.15)', background: 'rgba(192,57,43,.04)', color: C.red, fontFamily: F, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>تنازع</button>
                    </div>
                  </div>; })}</>}
                {/* Matched transactions */}
                {matched > 0 && <><SH2 t={'حركات مطابقة (' + matched + ')'} c={C.ok} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {txns.filter(t => t.match_status === 'matched').slice(0, 4).map(t => { const isIn = Number(t.amount) > 0; const c = txnClr[t.transaction_type] || '#888'; return <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,.015)' }}>
                      <span style={{ fontSize: 12, color: c }}>{txnIcon[t.transaction_type]}</span>
                      <span style={{ flex: 1, fontSize: 11, color: 'var(--tx3)' }}>{t.description}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: isIn ? C.ok : C.red }}>{isIn ? '+' : ''}{nm(t.amount)}</span>
                    </div>; })}
                    {matched > 4 && <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--tx5)', padding: 8 }}>+ {matched - 4} حركات أخرى</div>}
                  </div></>}
              </div>}

            </div>
          </div>
        </div>
      </div>;
    })()}
    {pop && <div onClick={() => setPop(false)} style={{ position: 'fixed', inset: 0, background: 'var(--overlayBg)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--sf)', borderRadius: 16, width: 'min(560px,95vw)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid rgba(212,160,23,.12)' }}>
        <div style={{ height: 3, background: 'linear-gradient(90deg,transparent,' + C.gold + ',transparent)' }} />
        <div style={{ background: 'var(--bg)', padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>{form._id ? 'تعديل' : 'إضافة حساب'}</div><button onClick={() => setPop(false)} style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--hoverBg)', border: '1px solid var(--bd)', color: 'var(--tx4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button></div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[{ k: 'bank_name', l: 'البنك', r: 1 }, { k: 'account_name', l: 'اسم الحساب' }, { k: 'account_number', l: 'رقم الحساب', d: 1 }, { k: 'iban', l: 'الآيبان', d: 1, w: 1 }, { k: 'swift_code', l: 'سويفت', d: 1 }, { k: 'branch_id', l: 'المكتب', opts: branches.map(b => ({ v: b.branch_id, l: b.name_ar })) }, { k: 'is_primary', l: 'رئيسي', opts: [{ v: 'true', l: 'نعم' }, { v: 'false', l: 'لا' }] }, { k: 'is_active', l: 'نشط', opts: [{ v: 'true', l: 'نعم' }, { v: 'false', l: 'لا' }] }, { k: 'notes', l: 'ملاحظات', w: 1 }].map(f => <div key={f.k} style={{ gridColumn: f.w ? '1/-1' : undefined }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx4)', marginBottom: 5 }}>{f.l}{f.r && <span style={{ color: C.red }}> *</span>}</div>
            {f.opts ? <select value={form[f.k] || ''} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} style={fS}><option value="">—</option>{f.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select>
              : f.w ? <textarea value={form[f.k] || ''} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} rows={2} style={{ ...fS, height: 'auto', padding: 10, resize: 'vertical' }} />
                : <input value={form[f.k] || ''} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} style={{ ...fS, direction: f.d ? 'ltr' : 'rtl' }} />}
          </div>)}
        </div></div>
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', flexDirection: 'row-reverse' }}>
          <button onClick={saveBankAccount} disabled={saving} style={{ height: 42, padding: '0 24px', borderRadius: 10, border: '1px solid rgba(212,160,23,.2)', background: 'rgba(212,160,23,.12)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving ? .6 : 1 }}>{saving ? '...' : 'حفظ'}</button>
          <button onClick={() => setPop(false)} style={{ height: 42, padding: '0 18px', background: 'transparent', color: 'var(--tx4)', border: '1.5px solid var(--bd)', borderRadius: 10, fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>إلغاء</button>
        </div>
      </div>
    </div>}
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN EXPORT — BranchesPage
   ═══════════════════════════════════════════════════════════════ */
export default function BranchesPage({ sb, toast, user, lang, showStaff, singleTab, AdminPage, adminProps }) {
  const T = (a, e) => (lang !== 'en' ? a : e);
  const [branches, setBranches] = useState([]); const [users, setUsers] = useState([]); const [banks, setBanks] = useState([]);
  const [regions, setRegions] = useState([]); const [cities, setCities] = useState([]);
  const [contracts, setContracts] = useState([]); const [docs, setDocs] = useState([]); const [bills, setBills] = useState([]);
  const [lookups, setLookups] = useState({});
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState(singleTab || 'branches'); const [viewRow, setViewRow] = useState(null);
  const [pop, setPop] = useState(false); const [form, setForm] = useState({}); const [saving, setSaving] = useState(false); const [wizStep, setWizStep] = useState(0);
  const [districtsList, setDistrictsList] = useState([]);
  const [searchQ, setSearchQ] = useState('');
  const [advOpen, setAdvOpen] = useState(false);
  const [filters, setFilters] = useState({ region_id: '', city_id: '', is_active: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const [br, u, ba, rg, ct, cn, dc, bl, lk, di] = await Promise.all([
      sb.from('branches').select('*').is('deleted_at', null),
      sb.from('users').select('id,name_ar,name_en,branch_id').is('deleted_at', null),
      sb.from('bank_accounts').select('*').is('is_active', true),
      sb.from('regions').select('id,name_ar').is('is_active', true).order('name_ar'),
      sb.from('cities').select('id,name_ar,code,region_id').is('is_active', true).order('name_ar'),
      sb.from('branch_contracts').select('*').is('deleted_at', null).order('contract_type'),
      sb.from('documents').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
      sb.from('contract_bills').select('*').order('bill_month'),
      sb.from('lookup_items').select('id,category_id,value_ar,code,sort_order,type_id,lookup_categories!inner(category_key)').is('is_active', true).order('sort_order'),
      sb.from('districts').select('id,name_ar,city_id').is('is_active', true).order('name_ar')
    ]);
    const regionsData = rg.data || [];
    const citiesData = ct.data || [];
    const usersData = u.data || [];
    const districtsData = di.data || [];
    // Map branches to include computed display fields
    const branchesData = (br.data || []).map(b => ({
      ...b,
      branch_id: b.id,
      display_name: b.code || '—',
      region_name: regionsData.find(r => r.id === b.region_id)?.name_ar || '',
      city_name: citiesData.find(c => c.id === b.city_id)?.name_ar || '',
      district_name: districtsData.find(d => d.id === b.district_id)?.name_ar || '',
      manager_user_name: usersData.find(x => x.id === b.manager_user_id)?.name_ar || '',
      workers_count: usersData.filter(x => x.branch_id === b.id).length,
    }));
    setBranches(branchesData); setUsers(usersData); setBanks(ba.data || []);
    setRegions(regionsData); setCities(citiesData); setContracts(cn.data || []);
    setDocs(dc.data || []); setBills(bl.data || []); setDistrictsList(districtsData);
    // Group lookups by category_key
    const lkMap = {};
    (lk.data || []).forEach(item => {
      const key = item.lookup_categories?.category_key;
      if (key) { if (!lkMap[key]) lkMap[key] = []; lkMap[key].push(item); }
    });
    setLookups(lkMap);
    setLoading(false);
  }, [sb]);
  useEffect(() => { load(); }, [load]);

  const lkOpts = (key) => (lookups[key] || []).map(i => ({ v: i.id, l: i.value_ar }));
  const distOpts = (cityId) => districtsList.filter(d => !cityId || d.city_id === cityId).map(d => ({ v: d.id, l: d.name_ar }));

  const saveBranch = async () => {
    setSaving(true);
    try {
      const d = { ...form }; const id = d._id; delete d._id;
      // Strip any stale display/computed fields that aren't real columns
      ['display_name','region_name','city_name','district_name','manager_user_name','workers_count','branch_id'].forEach(k => delete d[k]);
      Object.keys(d).forEach(k => {
        if (d[k] === '') d[k] = null;
        if (k === 'is_active') d[k] = d[k] === 'true' || d[k] === true;
      });
      if (id) { d.updated_by = user?.id; const { error } = await sb.from('branches').update(d).eq('id', id); if (error) throw error; toast('تم التعديل'); }
      else { d.created_by = user?.id; const { error } = await sb.from('branches').insert(d); if (error) throw error; toast('تمت الإضافة'); }
      setPop(false); load();
    } catch (e) { toast('خطأ: ' + e.message?.slice(0, 80)); }
    setSaving(false);
  };

  const del = async id => { if (!confirm('حذف؟')) return; await sb.from('branches').update({ deleted_at: new Date().toISOString() }).eq('id', id); toast('تم'); load(); setViewRow(null); };

  // Auto-generate code from city
  const updateCode = (cityId) => {
    const city = cities.find(c => c.id === cityId);
    if (city?.code) {
      const existing = branches.filter(b => b.code?.startsWith(city.code)).length;
      const num = String(existing + 1).padStart(2, '0');
      setForm(p => ({ ...p, city_id: cityId, code: city.code + '-' + num, district_id: '' }));
    } else {
      setForm(p => ({ ...p, city_id: cityId, district_id: '' }));
    }
  };

  const openAdd = () => {
    setForm({ code: '', region_id: '', city_id: '', district_id: '', phone: '', manager_user_id: '', building_number: '', street: '', street_en: '', postal_code: '', is_active: true });
    setWizStep(0); setPop(true);
  };

  const openEdit = r => {
    setForm({ _id: r.id || r.branch_id, code: r.code || '', region_id: r.region_id || '', city_id: r.city_id || '', district_id: r.district_id || '', phone: r.phone || '', manager_user_id: r.manager_user_id || '', building_number: r.building_number || '', street: r.street || '', street_en: r.street_en || '', postal_code: r.postal_code || '', is_active: r.is_active !== false });
    setWizStep(0); setPop(true); setViewRow(null);
  };

  const wfP = { form, setForm };
  const isEdit = !!form._id;
  // Single-step form — all fields shown at once in one card
  const wizSteps = [{ id: 'all', l: 'بيانات المكتب' }];
  const step = wizSteps[0];

  return <div style={{position:'relative',fontFamily:"'Cairo',sans-serif",paddingTop:20}}>
    {/* Header — matches OTP Messages / Transfer Calc style */}
    <div style={{ marginBottom: 22, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--tx)' }}>{singleTab==='staff'?(lang==='ar'?'الموظفين':'Staff'):singleTab==='branches'?(lang==='ar'?'المكاتب':'Offices'):(lang==='ar'?'المكاتب والموظفين':'Offices & Staff')}</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', marginTop: 6 }}>{singleTab==='staff'?(lang==='ar'?'إدارة الموظفين وصلاحياتهم':'Manage staff and permissions'):singleTab==='branches'?(lang==='ar'?'إدارة المكاتب والفروع':'Manage offices and branches'):(lang==='ar'?'إدارة المكاتب والفروع والموظفين':'Manage offices, branches, and staff')}</div>
      </div>
      {mainTab === 'branches' && <button onClick={openAdd} className="add-branch-btn" style={{ height: 40, padding: '0 18px', borderRadius: 10, background: 'rgba(212,160,23,.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .2s', fontFamily: F }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#D4A017', fontFamily: lang==='en'?"'Inter','Cairo',sans-serif":"'Noto Kufi Arabic','Cairo',sans-serif", letterSpacing: -.3, lineHeight: 1 }}>{lang==='ar'?'إضافة مكتب':'Add Office'}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>}
    </div>
    <style>{`.add-branch-btn:hover{background:rgba(212,160,23,.14)!important}`}</style>

    {/* Sub-tabs: side list */}
    <div style={{ display: 'flex', gap: 0 }}>
    {!singleTab && <div style={{ width: 90, flexShrink: 0, borderLeft: lang === 'ar' ? '1px solid rgba(255,255,255,.05)' : 'none', borderRight: lang !== 'ar' ? '1px solid rgba(255,255,255,.05)' : 'none', paddingTop: 2 }}>
      {[['branches', 'المكاتب', branches.length], ['bank_accounts', 'البنكية', banks.length], ...(showStaff ? [['staff', 'الموظفين', 0],['attendance_tab', 'الحضور', 0],['roles', 'الأدوار', 0]] : [])].map(([k, l, n]) => <div key={k} onClick={() => setMainTab(k)} style={{ padding: '6px 8px', fontSize: 10, fontWeight: mainTab === k ? 700 : 500, color: mainTab === k ? C.gold : 'rgba(255,255,255,.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRight: lang === 'ar' && mainTab === k ? '2px solid ' + C.gold : '2px solid transparent', borderLeft: lang !== 'ar' && mainTab === k ? '2px solid ' + C.gold : '2px solid transparent', transition: '.1s' }}><span>{l}</span>{n > 0 && <span style={{ fontSize: 7, fontWeight: 700, color: 'rgba(255,255,255,.2)', padding: '0 4px' }}>{n}</span>}</div>)}
    </div>}
    <div style={{ flex: 1, paddingRight: lang === 'ar' && !singleTab ? 8 : 0, paddingLeft: lang !== 'ar' && !singleTab ? 8 : 0 }}>

    {/* Branches tab */}
    {mainTab === 'branches' && <>
      {/* KPI dashboard cards */}
      {(() => {
        const activeBr = branches.filter(b => b.is_active !== false).length
        const inactiveBr = branches.filter(b => b.is_active === false).length
        const totalUsers = users.length
        const iconBox = (i, c) => <div style={{ width: 30, height: 30, borderRadius: 8, background: c + '18', color: c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i}</div>
        const I = {
          building: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="22" x2="9" y2="17"/><line x1="15" y1="22" x2="15" y2="17"/><line x1="9" y1="7" x2="9" y2="7"/><line x1="15" y1="7" x2="15" y2="7"/><line x1="9" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="15" y2="12"/></svg>,
          check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
          shield: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="1" fill="currentColor"/></svg>,
          users: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
        }
        return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, marginBottom: 20 }}>
          {/* Total branches */}
          <div style={{ background: 'var(--bg)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: '16px 18px', transition: '.18s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold + '35'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.25)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx4)' }}>{lang==='ar'?'إجمالي المكاتب':'Total Offices'}</span>
              {iconBox(I.building, C.gold)}
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.gold, lineHeight: 1, marginBottom: 10, direction: 'ltr', textAlign: lang==='en'?'left':'right' }}>{branches.length}</div>
            <div style={{ display: 'flex', height: 5, borderRadius: 4, overflow: 'hidden', background: 'rgba(255,255,255,.04)', gap: 1 }}>
              {activeBr > 0 && <div style={{ flex: activeBr, background: C.ok }} />}
              {inactiveBr > 0 && <div style={{ flex: inactiveBr, background: '#666' }} />}
            </div>
          </div>

          {/* Active branches */}
          <div style={{ background: 'var(--bg)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: '16px 18px', transition: '.18s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.ok + '35'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.25)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx4)' }}>{lang==='ar'?'المكاتب النشطة':'Active Offices'}</span>
              {iconBox(I.check, C.ok)}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10, direction: 'ltr', justifyContent: lang==='en'?'flex-start':'flex-end' }}>
              <span style={{ fontSize: 24, fontWeight: 900, color: C.gold, lineHeight: 1 }}>{activeBr}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx5)' }}>/ {branches.length}</span>
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--tx5)', fontWeight: 600 }}>{inactiveBr > 0 ? <><span style={{ color: '#999', fontWeight: 800 }}>{inactiveBr}</span> {lang==='ar'?'معطّل':'inactive'}</> : (lang==='ar'?'جميع المكاتب نشطة':'all offices active')}</div>
          </div>

          {/* Total staff */}
          <div style={{ background: 'var(--bg)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: '16px 18px', transition: '.18s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.blue + '35'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.25)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx4)' }}>{lang==='ar'?'الموظفين':'Staff'}</span>
              {iconBox(I.users, C.blue)}
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.gold, lineHeight: 1, marginBottom: 10, direction: 'ltr', textAlign: lang==='en'?'left':'right' }}>{totalUsers}</div>
            <div style={{ fontSize: 10.5, color: 'var(--tx5)', fontWeight: 600 }}>{branches.length > 0 ? <><span style={{ color: 'var(--tx3)', fontWeight: 800 }}>{(totalUsers / branches.length).toFixed(1)}</span> {lang==='ar'?'موظف لكل مكتب':'staff per office'}</> : '—'}</div>
          </div>
        </div>
      })()}

      {/* ═══ Search + Advanced Filters ═══ */}
      {(() => {
        const q = searchQ.trim().toLowerCase();
        const hasFilters = filters.region_id || filters.city_id || filters.is_active !== '';
        const filteredBranches = branches.filter(b => {
          if (q) {
            const match = (b.code || '').toLowerCase().includes(q)
              || (b.city_name || '').toLowerCase().includes(q)
              || (b.region_name || '').toLowerCase().includes(q)
              || (b.district_name || '').toLowerCase().includes(q)
              || (b.manager_user_name || '').toLowerCase().includes(q)
              || (b.street || '').toLowerCase().includes(q)
              || (b.phone || '').includes(q);
            if (!match) return false;
          }
          if (filters.region_id && b.region_id !== filters.region_id) return false;
          if (filters.city_id && b.city_id !== filters.city_id) return false;
          if (filters.is_active !== '' && (b.is_active !== false) !== (filters.is_active === 'true')) return false;
          return true;
        });
        const resetFilters = () => { setFilters({ region_id: '', city_id: '', is_active: '' }); setSearchQ(''); };
        return <>
          <style>{`.brs-search-input:focus{border-color:rgba(212,160,23,.3)!important;background:rgba(0,0,0,.25)!important}.brs-adv-btn:hover{background:rgba(212,160,23,.12)!important;border-color:rgba(212,160,23,.25)!important}`}</style>
          <div style={{ marginBottom: 14, display: 'flex', gap: 10, alignItems: 'stretch', flexWrap: 'wrap' }}>
            {/* Search input */}
            <div style={{ flex: '1 1 260px', position: 'relative', minWidth: 200 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" style={{ position: 'absolute', [lang==='ar'?'right':'left']: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input className="brs-search-input" value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder={lang==='ar'?'ابحث بالكود، المدينة، المدير، الجوال…':'Search by code, city, manager, phone…'} style={{ width: '100%', height: 42, [lang==='ar'?'paddingRight':'paddingLeft']: 40, [lang==='ar'?'paddingLeft':'paddingRight']: searchQ ? 40 : 14, border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, fontFamily: F, fontSize: 13, fontWeight: 500, color: 'var(--tx)', background: 'rgba(0,0,0,.18)', outline: 'none', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)', transition: '.2s', boxSizing: 'border-box' }}/>
              {searchQ && <button onClick={() => setSearchQ('')} style={{ position: 'absolute', [lang==='ar'?'left':'right']: 10, top: '50%', transform: 'translateY(-50%)', width: 22, height: 22, borderRadius: 6, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.06)', color: 'var(--tx5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg></button>}
            </div>
            {/* Advanced search toggle */}
            <button onClick={() => setAdvOpen(v => !v)} className="brs-adv-btn" style={{ height: 42, padding: '0 16px', borderRadius: 10, border: '1px solid ' + (advOpen || hasFilters ? 'rgba(212,160,23,.35)' : 'rgba(255,255,255,.08)'), background: advOpen || hasFilters ? 'rgba(212,160,23,.08)' : 'rgba(0,0,0,.18)', color: advOpen || hasFilters ? C.gold : 'var(--tx3)', fontFamily: F, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: '.2s', flexShrink: 0, boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              <span>{lang==='ar'?'بحث متقدم':'Advanced'}</span>
              {hasFilters && <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold, boxShadow: '0 0 6px rgba(212,160,23,.6)' }}/>}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transition: 'transform .25s', transform: advOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>
          {/* Advanced filters panel */}
          {advOpen && <div style={{ marginBottom: 14, padding: '14px 16px', background: 'rgba(212,160,23,.03)', border: '1px solid rgba(212,160,23,.12)', borderRadius: 12, animation: 'brs-fade .2s ease' }}>
            <style>{`@keyframes brs-fade{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10, marginBottom: 10 }}>
              {/* Region filter */}
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,.58)', marginBottom: 5 }}>{lang==='ar'?'المنطقة':'Region'}</div>
                <select value={filters.region_id} onChange={e => setFilters(f => ({ ...f, region_id: e.target.value, city_id: '' }))} style={{ width: '100%', height: 38, padding: '0 12px', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, fontFamily: F, fontSize: 12, fontWeight: 600, color: 'var(--tx)', background: 'rgba(0,0,0,.18)', outline: 'none', cursor: 'pointer' }}>
                  <option value="">{lang==='ar'?'جميع المناطق':'All Regions'}</option>
                  {regions.map(r => <option key={r.id} value={r.id}>{r.name_ar}</option>)}
                </select>
              </div>
              {/* City filter */}
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,.58)', marginBottom: 5 }}>{lang==='ar'?'المدينة':'City'}</div>
                <select value={filters.city_id} onChange={e => setFilters(f => ({ ...f, city_id: e.target.value }))} style={{ width: '100%', height: 38, padding: '0 12px', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, fontFamily: F, fontSize: 12, fontWeight: 600, color: 'var(--tx)', background: 'rgba(0,0,0,.18)', outline: 'none', cursor: 'pointer' }}>
                  <option value="">{lang==='ar'?'جميع المدن':'All Cities'}</option>
                  {cities.filter(c => !filters.region_id || c.region_id === filters.region_id).map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                </select>
              </div>
              {/* Status filter */}
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,.58)', marginBottom: 5 }}>{lang==='ar'?'الحالة':'Status'}</div>
                <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,.18)', borderRadius: 8, padding: 2, border: '1px solid rgba(255,255,255,.08)', height: 38, boxSizing: 'border-box' }}>
                  {[['', 'الكل', 'var(--tx3)'], ['true', 'نشط', C.ok], ['false', 'معطّل', C.red]].map(([v, l, c]) => (
                    <button key={v} onClick={() => setFilters(f => ({ ...f, is_active: v }))} style={{ flex: 1, borderRadius: 6, border: 'none', background: filters.is_active === v ? c + '22' : 'transparent', color: filters.is_active === v ? c : 'var(--tx5)', fontFamily: F, fontSize: 11, fontWeight: filters.is_active === v ? 800 : 600, cursor: 'pointer', transition: '.15s' }}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.05)' }}>
              <div style={{ fontSize: 11, color: 'var(--tx5)' }}>
                {lang==='ar'
                  ? <><span style={{ fontWeight: 800, color: C.gold }}>{filteredBranches.length}</span> نتيجة من أصل <span style={{ fontWeight: 800 }}>{branches.length}</span></>
                  : <><span style={{ fontWeight: 800, color: C.gold }}>{filteredBranches.length}</span> of <span style={{ fontWeight: 800 }}>{branches.length}</span></>}
              </div>
              {(hasFilters || searchQ) && <button onClick={resetFilters} style={{ height: 30, padding: '0 14px', borderRadius: 7, background: 'transparent', border: '1px solid rgba(255,255,255,.1)', color: 'var(--tx4)', fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                {lang==='ar'?'إعادة تعيين':'Reset'}
              </button>}
            </div>
          </div>}

      {loading ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--tx6)' }}>...</div> :
        filteredBranches.length === 0 ? <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--tx5)', background: 'rgba(255,255,255,.02)', border: '1px dashed rgba(255,255,255,.08)', borderRadius: 14 }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="1.5" style={{ marginBottom: 10 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{lang==='ar'?'لا توجد نتائج':'No results'}</div>
          <div style={{ fontSize: 11 }}>{lang==='ar'?'جرّب تعديل البحث أو مسح الفلاتر':'Try adjusting your search or clearing filters'}</div>
        </div> :
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 14 }}>
          {filteredBranches.map(b => {
            const isActive = b.is_active !== false;
            const borderClr = !isActive ? 'rgba(153,153,153,.15)' : 'rgba(39,160,70,.15)';
            return <div key={b.id} onClick={() => { setViewRow(b); }} style={{ background: 'var(--bg)', border: '1.5px solid ' + borderClr, borderRadius: 14, overflow: 'hidden', cursor: 'pointer', transition: '.15s', opacity: isActive ? 1 : .6 }} onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(212,160,23,.2)'} onMouseLeave={e => e.currentTarget.style.borderColor = borderClr}>
              {!isActive && <div style={{ padding: '5px 14px', background: 'rgba(153,153,153,.04)', borderBottom: '1px solid rgba(153,153,153,.08)' }}>
                <span style={{ fontSize: 9, fontWeight: 600, color: '#999' }}>معطّل</span>
              </div>}
              {/* Header */}
              <div style={{ padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: isActive ? 'rgba(39,160,70,.08)' : 'rgba(153,153,153,.08)', border: '1px solid ' + (isActive ? 'rgba(39,160,70,.12)' : 'rgba(153,153,153,.1)'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isActive ? C.ok : '#999'} strokeWidth="1.5"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" /></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{b.display_name || b.code || '—'}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: isActive ? 'rgba(39,160,70,.1)' : 'rgba(153,153,153,.1)', color: isActive ? C.ok : '#999' }}>{isActive ? 'نشط' : 'معطّل'}</span>
                  </div>
                  {(b.city_name || b.region_name) && <div style={{ fontSize: 10, color: 'var(--tx5)' }}>{[b.city_name, b.region_name].filter(Boolean).join(' · ')}</div>}
                </div>
                <div onClick={e => { e.stopPropagation(); openEdit(b); }} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid rgba(212,160,23,.15)', background: 'rgba(212,160,23,.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                </div>
              </div>
              {/* Indicators */}
              <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,.04)', background: 'rgba(255,255,255,.01)' }}>
                {[
                  [b.workers_count || 0, 'موظفين', C.ok],
                  [b.phone || '—', 'الجوال', C.blue],
                ].map(([val, lbl, clr], i) => <div key={i} style={{ flex: 1, padding: '8px 6px', textAlign: 'center', borderLeft: i > 0 ? '1px solid rgba(255,255,255,.03)' : 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: clr, lineHeight: 1.2, marginBottom: 3, direction: typeof val === 'string' && val.startsWith('+') ? 'ltr' : 'inherit' }}>{val}</div>
                  <div style={{ fontSize: 8, fontWeight: 600, color: clr, opacity: .7 }}>{lbl}</div>
                </div>)}
              </div>
              {/* Footer: Manager */}
              {b.manager_user_name && <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,.03)', display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,.015)' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                <span style={{ fontSize: 9, color: C.gold }}>{b.manager_user_name}</span>
              </div>}
            </div>;
          })}
        </div>}
        </>;
      })()}
    </>}

    {mainTab === 'bank_accounts' && <BankAccountsTab sb={sb} toast={toast} user={user} lang={lang} branches={branches} banks={banks} contracts={contracts} docs={docs} reload={load} />}
    {['staff','performance','attendance_tab','roles'].includes(mainTab) && AdminPage && <AdminPage {...adminProps} defaultTab={mainTab==='staff'?'users':mainTab} />}
    </div></div>

    <BranchDetailModal viewRow={viewRow} setViewRow={setViewRow} openEdit={openEdit} del={del} users={users} banks={banks} contracts={contracts} bills={bills} docs={docs} toast={toast} T={T} />

    {/* Wizard Modal — Kafala Calculator design */}
    {pop && <div onClick={() => setPop(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <style>{`.br-wiz-scroll::-webkit-scrollbar{width:0;display:none}.br-wiz-scroll{scrollbar-width:none;-ms-overflow-style:none}.br-wiz input,.br-wiz select,.br-wiz textarea{width:100%;height:42px;padding:0 14px!important;border:1px solid rgba(255,255,255,.08)!important;border-radius:9px!important;font-family:${F};font-size:13px!important;font-weight:600;color:var(--tx);outline:none;background:rgba(0,0,0,.18)!important;box-sizing:border-box;box-shadow:inset 0 1px 2px rgba(0,0,0,.2);text-align:center!important;transition:.2s}.br-wiz textarea{height:auto!important;min-height:80px!important;padding:10px 14px!important}.br-wiz input:focus,.br-wiz select:focus,.br-wiz textarea:focus,.br-wiz input:not(:placeholder-shown):not([type=checkbox]):not([type=radio]){border-color:rgba(255,255,255,.08)!important}.br-wiz input:-webkit-autofill,.br-wiz input:-webkit-autofill:hover,.br-wiz input:-webkit-autofill:focus,.br-wiz input:-webkit-autofill:active{-webkit-box-shadow:0 0 0 30px rgba(15,15,15,1) inset!important;-webkit-text-fill-color:var(--tx)!important;border-color:rgba(255,255,255,.08)!important;caret-color:var(--tx)!important;transition:background-color 9999s ease-in-out 0s}.br-wiz .wf-lbl{font-size:11px!important;font-weight:700!important;color:rgba(255,255,255,.58)!important;margin-bottom:5px!important;text-align:start!important}.br-wiz .kc-phone-wrap{background:rgba(0,0,0,.18)!important;box-shadow:inset 0 1px 2px rgba(0,0,0,.2)!important;border-radius:9px!important}.br-wiz .kc-phone-wrap input{padding:0 12px!important;border:none!important;background:transparent!important;box-shadow:none!important;text-align:left!important;border-radius:0!important}.br-wiz .kc-phone-wrap:focus-within{border-color:rgba(255,255,255,.08)!important}`}</style>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a1a', borderRadius: 18, width: 720, maxWidth: '95vw', maxHeight: '95vh', display: 'flex', flexDirection: 'column', overflow: 'visible', boxShadow: '0 24px 60px rgba(0,0,0,.5)', border: '1px solid rgba(212,160,23,.08)' }}>
        <div dir={lang === 'en' ? 'ltr' : 'rtl'} style={{ fontFamily: F, color: 'rgba(255,255,255,.85)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          {/* Header — icon + title + close */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px 18px', flexShrink: 0, direction: lang === 'en' ? 'ltr' : 'rtl' }}>
            <div style={{ textAlign: lang === 'en' ? 'left' : 'right', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(212,160,23,.08)', border: '1px solid rgba(212,160,23,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gold }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="22" x2="9" y2="17"/><line x1="15" y1="22" x2="15" y2="17"/><line x1="9" y1="7" x2="9" y2="7"/><line x1="15" y1="7" x2="15" y2="7"/><line x1="9" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="15" y2="12"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,.95)', fontFamily: F }}>{isEdit ? (lang==='ar'?'تعديل بيانات المكتب':'Edit Office') : (lang==='ar'?'إضافة مكتب جديد':'Add New Office')}</div>
              </div>
            </div>
            <button onClick={() => setPop(false)} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)', color: 'rgba(255,255,255,.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="إغلاق">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div className="br-wiz br-wiz-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'visible', padding: '8px 16px 12px' }}>
          <div style={{ borderRadius: 12, border: '1.5px solid rgba(212,160,23,.35)', padding: '18px 14px 14px', position: 'relative', marginTop: 10 }}>
            <div style={{ position: 'absolute', top: -9, [lang === 'en' ? 'left' : 'right']: 14, background: '#1a1a1a', padding: '0 8px', fontSize: 12, fontWeight: 800, color: C.gold, fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/></svg>
              <span>بيانات المكتب</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {/* Row 1: Region + City + Code */}
              <CustomSel k="region_id" l="المنطقة" r opts={regions.map(r => ({ v: r.id, l: r.name_ar }))} ph="اختر المنطقة…" {...wfP} />
              <CustomSel k="city_id" l="المدينة" r opts={cities.filter(c => !form.region_id || c.region_id === form.region_id).map(c => ({ v: c.id, l: c.name_ar }))} ph="اختر المدينة…" onSelect={updateCode} {...wfP} />
              <WF k="code" l="كود المكتب" d ph="RYD01" {...wfP} />
              {/* Row 2: District + Street + Street EN */}
              <CustomSel k="district_id" l="الحي" opts={distOpts(form.city_id)} ph="اختر الحي…" {...wfP} />
              <WF k="street" l="الشارع" ph="شارع حائل" {...wfP} />
              <WF k="street_en" l="الشارع (إنجليزي)" d ph="Hail Street" {...wfP} />
              {/* Row 3: Postal + Building + Manager */}
              <WF k="postal_code" l="الرمز البريدي" d ph="32416" {...wfP} />
              <WF k="building_number" l="رقم المبنى" d {...wfP} />
              <CustomSel k="manager_user_id" l="المدير المسؤول" opts={users.map(u => ({ v: u.id, l: u.name_ar }))} ph="اختر المدير…" {...wfP} />
              {/* Row 4: Phone spans 2 cols + optional Status */}
              <div style={{ gridColumn: isEdit ? 'span 2' : '1/-1' }}><PhoneField k="phone" l="رقم الجوال" {...wfP} /></div>
              {isEdit && <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.58)', marginBottom: 5, textAlign: 'start' }}>الحالة</div>
                <div style={{ display: 'flex', gap: 3, background: 'rgba(0,0,0,.18)', borderRadius: 9, padding: 3, border: '1px solid rgba(255,255,255,.08)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)', height: 42, boxSizing: 'border-box' }}>
                  <button type="button" onClick={() => setForm(p => ({ ...p, is_active: true }))} style={{ flex: 1, borderRadius: 6, border: 'none', background: form.is_active === true ? 'rgba(39,160,70,.15)' : 'transparent', color: form.is_active === true ? C.ok : 'var(--tx5)', fontFamily: F, fontSize: 12, fontWeight: form.is_active === true ? 800 : 600, cursor: 'pointer', transition: '.15s' }}>نشط</button>
                  <button type="button" onClick={() => setForm(p => ({ ...p, is_active: false }))} style={{ flex: 1, borderRadius: 6, border: 'none', background: form.is_active === false ? 'rgba(192,57,43,.15)' : 'transparent', color: form.is_active === false ? C.red : 'var(--tx5)', fontFamily: F, fontSize: 12, fontWeight: form.is_active === false ? 800 : 600, cursor: 'pointer', transition: '.15s' }}>معطّل</button>
                </div>
              </div>}
            </div>
          </div>
          </div>
        {/* Footer — save button (matches Kafala إصدار/التالي style) */}
        <style>{`.br-nav-btn{height:40px;padding:0 6px;background:transparent;border:none;color:#D4A017;font-family:${F};font-size:14px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:10px;transition:.2s}.br-nav-btn .nav-ico{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);display:flex;align-items:center;justify-content:center;transition:.2s;color:#D4A017}.br-nav-btn:hover .nav-ico{background:#D4A017;color:#000}.br-nav-btn:hover .nav-ico{transform:translateX(4px)}.br-nav-btn:disabled{opacity:.5;cursor:not-allowed}`}</style>
        <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexShrink: 0, direction: lang === 'en' ? 'ltr' : 'rtl' }}>
          <button onClick={saveBranch} disabled={saving} className="br-nav-btn">
            <span>{saving ? '...' : isEdit ? (lang==='ar'?'حفظ':'Save') : (lang==='ar'?'إضافة':'Add')}</span>
            <span className="nav-ico">
              {isEdit ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>}
            </span>
          </button>
        </div>
        </div>
      </div>
    </div>}
  </div>;
}
