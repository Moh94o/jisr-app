import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const F = "'Cairo', sans-serif";
const C = { gold: '#c9a84c', red: '#c0392b', blue: '#3483b4', ok: '#27a046' };
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
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx4)', marginBottom: 5 }}>{l}{r && <span style={{ color: C.red }}> *</span>}</div>
    {opts ? <select value={val} onChange={onChange} style={fS}><option value="">—</option>{opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select>
      : w === 'ta' ? <textarea value={val} onChange={onChange} rows={3} style={{ ...fS, height: 'auto', padding: 10, resize: 'vertical', textAlign: d ? 'left' : 'right', direction: d ? 'ltr' : 'rtl' }} />
        : <input type={tp || 'text'} placeholder={ph || ''} value={val} onChange={onChange} style={{ ...fS, direction: d ? 'ltr' : 'rtl', textAlign: d ? 'left' : 'right' }} />}
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
  const now = new Date();
  const bU = users.filter(u => u.branch_id === viewRow.branch_id);
  const bB = banks.filter(a => a.branch_id === viewRow.branch_id);
  const brContracts = contracts.filter(c => c.branch_id === viewRow.branch_id);
  const brBills = bills.filter(b => b.branch_id === viewRow.branch_id);
  const rentC = brContracts.filter(c => c.contract_type === 'rent');
  const elecC = brContracts.filter(c => c.contract_type === 'electricity');
  const netC = brContracts.filter(c => c.contract_type === 'internet');
  const waterC = brContracts.filter(c => c.contract_type === 'water');
  const totalContracts = brContracts.length;
  const licDays = viewRow.license_expiry_date ? Math.ceil((new Date(viewRow.license_expiry_date) - now) / 86400000) : null;
  const cdDays = viewRow.civil_defense_expiry ? Math.ceil((new Date(viewRow.civil_defense_expiry) - now) / 86400000) : null;
  const dClr = d => d === null ? '#555' : d < 0 ? C.red : d < 30 ? '#e67e22' : d < 90 ? '#e8c547' : C.ok;
  const totalBalance = bB.reduce((s, a) => s + Number(a.current_balance || 0), 0);
  const dayNames = { sat: 'السبت', sun: 'الأحد', mon: 'الاثنين', tue: 'الثلاثاء', wed: 'الأربعاء', thu: 'الخميس', fri: 'الجمعة' };
  const SH = ({ t, c }) => <div style={{ fontSize: 12, fontWeight: 700, color: c || C.gold, marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid ' + (c || C.gold) + '20' }}>{t}</div>;
  const HealthBar = ({ days, label }) => { const c = dClr(days); const pct = days === null ? 0 : days < 0 ? 0 : Math.min(100, days / 365 * 100); return <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: c + '08', border: '1px solid ' + c + '15' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}><span style={{ fontSize: 11, fontWeight: 700, color: c }}>{label}</span><span style={{ fontSize: 12, fontWeight: 800, color: c }}>{days === null ? '—' : days < 0 ? 'منتهية!' : days + ' يوم متبقي'}</span></div><div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}><div style={{ height: '100%', width: pct + '%', borderRadius: 3, background: c, transition: 'width .3s' }} /></div></div>; };
  const roleClr = { 'المدير العام': '#e8c547', 'مدير فرع': '#85B7EB', 'محاسب': '#AFA9EC', 'موظف استقبال': '#5DCAA5' };
  const vt = [
    { id: 'info', l: 'البيانات' }, { id: 'permits', l: 'التراخيص' },
    { id: 'utilities', l: 'المرافق', n: totalContracts },
    { id: 'staff', l: 'الموظفين', n: bU.length }, { id: 'stats', l: 'الإحصائيات' },
    { id: 'banks', l: 'الحسابات', n: bB.length }
  ];

  return <div onClick={() => setViewRow(null)} style={{ position: 'fixed', inset: 0, background: 'var(--overlayBg,rgba(14,14,14,.8))', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 16 }}>
    <div onClick={e => e.stopPropagation()} style={{ background: 'var(--sf)', borderRadius: 16, width: 'min(920px,95vw)', height: 'min(650px,88vh)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 48px rgba(0,0,0,.4)', border: '1px solid rgba(201,168,76,.15)' }}>
      {/* Header */}
      <div style={{ background: 'var(--bg)', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(201,168,76,.12)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: viewRow.is_active !== false ? 'rgba(39,160,70,.08)' : 'rgba(153,153,153,.08)', border: '1.5px solid ' + (viewRow.is_active !== false ? 'rgba(39,160,70,.12)' : 'rgba(153,153,153,.1)'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={viewRow.is_active !== false ? C.ok : '#999'} strokeWidth="1.5"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" /></svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--tx)' }}>{viewRow.name_ar}</div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: viewRow.is_active !== false ? 'rgba(39,160,70,.1)' : 'rgba(153,153,153,.1)', color: viewRow.is_active !== false ? C.ok : '#999' }}>{viewRow.is_active !== false ? 'نشط' : 'معطّل'}</span>
            </div>
            {viewRow.name_en && <div style={{ fontSize: 12, color: 'var(--tx4)', direction: 'ltr' }}>{viewRow.name_en}</div>}
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              {viewRow.code && <span style={{ fontSize: 10, color: C.gold, background: 'rgba(201,168,76,.08)', padding: '1px 8px', borderRadius: 4, direction: 'ltr', fontWeight: 600 }}>{viewRow.code}</span>}
              {viewRow.city_name && <span style={{ fontSize: 10, color: 'var(--tx4)' }}>{viewRow.region_name} — {viewRow.city_name}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => openEdit(viewRow)} style={{ height: 32, padding: '0 16px', borderRadius: 8, border: '1px solid rgba(201,168,76,.2)', background: 'rgba(201,168,76,.08)', color: C.gold, fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>تعديل</button>
          <button onClick={() => setViewRow(null)} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--hoverBg)', border: '1px solid var(--bd)', color: 'var(--tx4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
      </div>
      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ width: 140, background: 'var(--bg)', borderLeft: '1px solid var(--bd2)', padding: '12px 6px', flexShrink: 0, overflowY: 'auto', scrollbarWidth: 'none' }}>
          {vt.map(t => <div key={t.id} onClick={() => setViewTab(t.id)} style={{ padding: '10px 10px', borderRadius: 8, marginBottom: 3, fontSize: 11, fontWeight: viewTab === t.id ? 700 : 500, color: viewTab === t.id ? C.gold : 'var(--tx4)', background: viewTab === t.id ? 'rgba(201,168,76,.08)' : 'transparent', border: viewTab === t.id ? '1px solid rgba(201,168,76,.12)' : '1px solid transparent', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: '.15s' }}>
            <span>{t.l}</span>{t.n !== undefined && <span style={{ fontSize: 9, fontWeight: 700, color: viewTab === t.id ? C.gold : 'var(--tx6)', background: viewTab === t.id ? 'rgba(201,168,76,.15)' : 'var(--hoverBg,rgba(255,255,255,.04))', padding: '1px 6px', borderRadius: 4, minWidth: 18, textAlign: 'center' }}>{t.n}</span>}
          </div>)}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', scrollbarWidth: 'none' }}>

          {/* ═══ TAB 1: البيانات ═══ */}
          {viewTab === 'info' && <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div><SH t="المعلومات الأساسية" c={C.gold} /><div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginBottom: 8 }}><IB l="الاسم" v={viewRow.name_ar} toast={toast} /></div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}><IB l="بالإنجليزي" v={viewRow.name_en} toast={toast} /><IB l="الكود" v={viewRow.code} copy toast={toast} /><IB l="الجوال" v={viewRow.phone} copy toast={toast} /></div></div>
            <div><SH t="المدير" c={C.blue} />{viewRow.manager_user_name ? <div style={{ background: 'rgba(52,131,180,.04)', borderRadius: 10, padding: '12px 16px', border: '1px solid rgba(52,131,180,.08)', display: 'flex', alignItems: 'center', gap: 12 }}><div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(52,131,180,.1)', border: '1px solid rgba(52,131,180,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: C.blue }}>{(viewRow.manager_user_name || '?')[0]}</div><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{viewRow.manager_user_name}</div></div></div> : <div style={{ fontSize: 11, color: 'var(--tx5)' }}>لم يتم تعيين مدير</div>}</div>
            <div><SH t="العنوان" c={C.ok} /><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><IB l="المنطقة" v={viewRow.region_name} toast={toast} /><IB l="المدينة" v={viewRow.city_name} toast={toast} /><IB l="الحي" v={viewRow.district_name} toast={toast} /><IB l="رقم المبنى" v={viewRow.building_number} toast={toast} /></div><div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginTop: 8 }}><IB l="الشارع" v={viewRow.street} toast={toast} /><IB l="الرمز البريدي" v={viewRow.postal_code} copy toast={toast} /></div>{viewRow.location_url && <a href={viewRow.location_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, padding: '10px 16px', borderRadius: 10, background: 'rgba(52,131,180,.06)', border: '1px solid rgba(52,131,180,.12)', color: C.blue, textDecoration: 'none', fontSize: 12, fontWeight: 700 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>فتح في Google Maps ↗</a>}</div>
            <div><SH t="الدوام" c="#9b59b6" /><div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}><IB l="أيام العمل" v={(() => { const days = viewRow.working_days || []; return Array.isArray(days) ? days.map(d => dayNames[d] || d).join('، ') : '—'; })()} toast={toast} /></div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}><IB l="بداية الدوام" v={viewRow.work_start_time?.slice(0, 5)} toast={toast} /><IB l="نهاية الدوام" v={viewRow.work_end_time?.slice(0, 5)} toast={toast} /></div></div>
          </div>}

          {/* ═══ TAB 2: التراخيص ═══ */}
          {viewTab === 'permits' && <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div><SH t="رخصة بلدي" c={C.gold} /><HealthBar days={licDays} label="الرخصة البلدية" /><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><IB l="رقم الرخصة" v={viewRow.municipal_license_number} copy toast={toast} /><IB l="رقم الطلب" v={viewRow.baladi_request_number} copy toast={toast} /><IB l="النشاط" v={viewRow.activity_name} toast={toast} /><IB l="المساحة" v={viewRow.shop_area_sqm ? viewRow.shop_area_sqm + ' م²' : null} toast={toast} /><IB l="تاريخ الإصدار" v={viewRow.license_issue_date} toast={toast} /><IB l={'تاريخ الانتهاء'} v={viewRow.license_expiry_date} toast={toast} /><IB l="البلدية" v={viewRow.municipality_name} toast={toast} /></div></div>
            <div><SH t="شهادة السلامة (الدفاع المدني)" c={C.blue} /><HealthBar days={cdDays} label="شهادة الدفاع المدني" /><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><IB l="رقم الشهادة" v={viewRow.civil_defense_cert_number} copy toast={toast} /><IB l="تاريخ الانتهاء" v={viewRow.civil_defense_expiry} toast={toast} /><IB l="الأمانة" v={viewRow.authority_name} toast={toast} /></div></div>
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
                {isManager && <span style={{ fontSize: 9, color: C.gold, background: 'rgba(201,168,76,.1)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>المدير</span>}
              </div>;
            })}</div>}</div>}

          {/* ═══ TAB 5: الإحصائيات ═══ */}
          {viewTab === 'stats' && <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div><SH t="التشغيل" c={C.ok} /><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[['منشآت', viewRow.facilities_count, C.blue], ['عمال', viewRow.workers_count, C.ok], ['نشطين', viewRow.active_workers, C.ok]].map(([l, v, c], i) => <div key={i} style={{ padding: 14, borderRadius: 10, background: c + '08', border: '1px solid ' + c + '15', textAlign: 'center' }}><div style={{ fontSize: 9, color: c, opacity: .7, marginBottom: 6 }}>{l}</div><div style={{ fontSize: 22, fontWeight: 900, color: c }}>{v || 0}</div></div>)}
            </div></div>
            <div><SH t="المعاملات" c={C.blue} /><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[['معاملات', viewRow.transactions_count, C.gold], ['مكتملة', viewRow.completed_txn, C.ok], ['عملاء', viewRow.clients_count, '#9b59b6']].map(([l, v, c], i) => <div key={i} style={{ padding: 14, borderRadius: 10, background: c + '08', border: '1px solid ' + c + '15', textAlign: 'center' }}><div style={{ fontSize: 9, color: c, opacity: .7, marginBottom: 6 }}>{l}</div><div style={{ fontSize: 22, fontWeight: 900, color: c }}>{v || 0}</div></div>)}
            </div></div>
            <div><SH t="المالية" c={C.gold} /><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[['إيرادات', nm(viewRow.total_revenue), C.gold], ['محصّل', nm(viewRow.collected_amount), C.ok], ['مصروفات', nm(viewRow.total_expenses), C.red]].map(([l, v, c], i) => <div key={i} style={{ padding: 18, borderRadius: 12, background: c + '06', border: '1px solid ' + c + '12', textAlign: 'center' }}><div style={{ fontSize: 9, color: c, opacity: .7, marginBottom: 8 }}>{l}</div><div style={{ fontSize: 22, fontWeight: 900, color: c }}>{v}</div><div style={{ fontSize: 8, color: c, opacity: .4, marginTop: 4 }}>ر.س</div></div>)}
            </div></div>
          </div>}

          {/* ═══ TAB 6: الحسابات البنكية ═══ */}
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
                    {a.is_primary && <span style={{ fontSize: 9, color: C.gold, background: 'rgba(201,168,76,.1)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>رئيسي</span>}
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
      <button onClick={() => setFilter('all')} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 10, fontWeight: filter === 'all' ? 700 : 500, color: filter === 'all' ? C.gold : 'var(--tx4)', background: filter === 'all' ? 'rgba(201,168,76,.08)' : 'transparent', border: filter === 'all' ? '1px solid rgba(201,168,76,.15)' : '1px solid rgba(255,255,255,.06)', cursor: 'pointer', fontFamily: F }}>الكل ({banks.length})</button>
      {branches.map(br => <button key={br.branch_id} onClick={() => setFilter(br.branch_id)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 10, fontWeight: filter === br.branch_id ? 700 : 500, color: filter === br.branch_id ? C.gold : 'var(--tx4)', background: filter === br.branch_id ? 'rgba(201,168,76,.08)' : 'transparent', border: filter === br.branch_id ? '1px solid rgba(201,168,76,.15)' : '1px solid rgba(255,255,255,.06)', cursor: 'pointer', fontFamily: F }}>{br.name_ar}</button>)}
    </div>
    {/* Filters Row 2: Bank + Purpose */}
    <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ fontSize: 10, color: 'var(--tx5)', marginLeft: 4 }}>الغرض:</span>
      <button onClick={() => setPurposeFilter('all')} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 10, fontWeight: purposeFilter === 'all' ? 700 : 500, color: purposeFilter === 'all' ? C.gold : 'var(--tx4)', background: purposeFilter === 'all' ? 'rgba(201,168,76,.08)' : 'transparent', border: purposeFilter === 'all' ? '1px solid rgba(201,168,76,.15)' : '1px solid rgba(255,255,255,.06)', cursor: 'pointer', fontFamily: F }}>الكل ({filtered.length})</button>
      {purposeNames.map(p => { const cnt = filtered.filter(b => (b.account_purpose || 'عام') === p).length; return <button key={p} onClick={() => setPurposeFilter(p)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 10, fontWeight: purposeFilter === p ? 700 : 500, color: purposeFilter === p ? C.gold : 'var(--tx4)', background: purposeFilter === p ? 'rgba(201,168,76,.08)' : 'transparent', border: purposeFilter === p ? '1px solid rgba(201,168,76,.15)' : '1px solid rgba(255,255,255,.06)', cursor: 'pointer', fontFamily: F }}>{purposeMap[p] || p} ({cnt})</button>; })}
      <span style={{ fontSize: 10, color: 'var(--tx5)', marginRight: 8, marginLeft: 12 }}>البنك:</span>
      <button onClick={() => setBankFilter('all')} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 10, fontWeight: bankFilter === 'all' ? 700 : 500, color: bankFilter === 'all' ? C.gold : 'var(--tx4)', background: bankFilter === 'all' ? 'rgba(201,168,76,.08)' : 'transparent', border: bankFilter === 'all' ? '1px solid rgba(201,168,76,.15)' : '1px solid rgba(255,255,255,.06)', cursor: 'pointer', fontFamily: F }}>الكل</button>
      {bankNames.map(n => <button key={n} onClick={() => setBankFilter(n)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 10, fontWeight: bankFilter === n ? 700 : 500, color: bankFilter === n ? C.gold : 'var(--tx4)', background: bankFilter === n ? 'rgba(201,168,76,.08)' : 'transparent', border: bankFilter === n ? '1px solid rgba(201,168,76,.15)' : '1px solid rgba(255,255,255,.06)', cursor: 'pointer', fontFamily: F }}>{n}</button>)}
    </div>
    {filtered2.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--tx6)' }}>لا توجد حسابات</div> :
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(380px,1fr))', gap: 14 }}>{filtered2.map(a => {
        const br = branches.find(b => b.branch_id === a.branch_id); const bal = Number(a.current_balance || 0); const minA = Number(a.min_balance_alert || 0); const isLow = minA > 0 && bal <= minA;
        return <div key={a.id} onClick={() => { setViewAcct(a); setAcctTab('data'); setTxnFilter('all'); }} style={{ background: 'var(--bg)', border: '1px solid ' + (isLow ? 'rgba(192,57,43,.2)' : 'var(--bd)'), borderRadius: 14, overflow: 'hidden', cursor: 'pointer', transition: '.15s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,.2)'} onMouseLeave={e => e.currentTarget.style.borderColor = isLow ? 'rgba(192,57,43,.2)' : 'var(--bd)'}>
          {isLow && <div style={{ padding: '5px 14px', background: 'rgba(192,57,43,.06)', borderBottom: '1px solid rgba(192,57,43,.1)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.red }} />
            <span style={{ fontSize: 9, fontWeight: 600, color: C.red }}>رصيد منخفض</span>
          </div>}
          <div style={{ padding: '14px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: isLow ? 'rgba(192,57,43,.08)' : 'rgba(201,168,76,.08)', border: '1px solid ' + (isLow ? 'rgba(192,57,43,.12)' : 'rgba(201,168,76,.12)'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isLow ? C.red : C.gold} strokeWidth="1.5"><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M2 10h20" /></svg></div>
                <div><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{a.bank_name}</div>{a.account_name && <div style={{ fontSize: 10, color: 'var(--tx4)' }}>{a.account_name}</div>}</div>
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {a.account_purpose && <span style={{ fontSize: 8, padding: '2px 7px', borderRadius: 4, background: (purposeClr[a.account_purpose] || '#888') + '12', border: '1px solid ' + (purposeClr[a.account_purpose] || '#888') + '20', color: purposeClr[a.account_purpose] || '#888', fontWeight: 600 }}>{purposeMap[a.account_purpose] || a.account_purpose}</span>}
                {a.is_primary && <span style={{ fontSize: 8, padding: '2px 7px', borderRadius: 4, background: 'rgba(201,168,76,.1)', border: '1px solid rgba(201,168,76,.15)', color: C.gold, fontWeight: 700 }}>رئيسي</span>}
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
        <div onClick={e => e.stopPropagation()} style={{ background: 'var(--sf)', borderRadius: 16, width: 'min(920px,95vw)', height: 'min(650px,88vh)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 48px rgba(0,0,0,.4)', border: '1px solid rgba(201,168,76,.15)' }}>
          {/* Header */}
          <div style={{ background: 'var(--bg)', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(201,168,76,.12)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(201,168,76,.08)', border: '1.5px solid rgba(201,168,76,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.5"><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M2 10h20" /></svg></div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--tx)' }}>{a.bank_name}</span>
                  {a.is_primary && <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 5, background: 'rgba(201,168,76,.1)', color: C.gold, fontWeight: 700 }}>رئيسي</span>}
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
              <button onClick={() => { setViewAcct(null); setForm({ _id: a.id, bank_name: a.bank_name || '', account_name: a.account_name || '', account_number: a.account_number || '', iban: a.iban || '', swift_code: a.swift_code || '', branch_id: a.branch_id || '', is_primary: String(a.is_primary || false), is_active: String(a.is_active !== false), notes: a.notes || '' }); setPop(true); }} style={{ height: 32, padding: '0 16px', borderRadius: 8, border: '1px solid rgba(201,168,76,.2)', background: 'rgba(201,168,76,.08)', color: C.gold, fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>تعديل</button>
              <button onClick={() => setViewAcct(null)} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--hoverBg)', border: '1px solid var(--bd)', color: 'var(--tx4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
          </div>
          {/* Body */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <div style={{ width: 140, background: 'var(--bg)', borderLeft: '1px solid var(--bd2)', padding: '12px 6px', flexShrink: 0, overflowY: 'auto', scrollbarWidth: 'none' }}>
              {atabs.map(t => <div key={t.id} onClick={() => setAcctTab(t.id)} style={{ padding: '10px 10px', borderRadius: 8, marginBottom: 3, fontSize: 11, fontWeight: acctTab === t.id ? 700 : 500, color: acctTab === t.id ? C.gold : 'var(--tx4)', background: acctTab === t.id ? 'rgba(201,168,76,.08)' : 'transparent', border: acctTab === t.id ? '1px solid rgba(201,168,76,.12)' : '1px solid transparent', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: '.15s' }}>
                <span>{t.l}</span>{t.n !== undefined && t.n > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: acctTab === t.id ? C.gold : 'var(--tx6)', background: acctTab === t.id ? 'rgba(201,168,76,.15)' : 'rgba(255,255,255,.04)', padding: '1px 6px', borderRadius: 4, minWidth: 18, textAlign: 'center' }}>{t.n}</span>}
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
                  {[['all', 'الكل', txns.length], ['deposit', 'إيداع', txns.filter(t => t.transaction_type === 'deposit').length], ['withdrawal', 'سحب', txns.filter(t => t.transaction_type === 'withdrawal').length], ['transfer_in', 'وارد', txns.filter(t => t.transaction_type === 'transfer_in').length], ['transfer_out', 'صادر', txns.filter(t => t.transaction_type === 'transfer_out').length]].map(([k, l, n]) => <button key={k} onClick={() => setTxnFilter(k)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 10, fontWeight: txnFilter === k ? 700 : 500, color: txnFilter === k ? C.gold : 'var(--tx4)', background: txnFilter === k ? 'rgba(201,168,76,.08)' : 'transparent', border: txnFilter === k ? '1px solid rgba(201,168,76,.15)' : '1px solid rgba(255,255,255,.06)', cursor: 'pointer', fontFamily: F }}>{l} ({n})</button>)}
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
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--sf)', borderRadius: 16, width: 'min(560px,95vw)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid rgba(201,168,76,.12)' }}>
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
          <button onClick={saveBankAccount} disabled={saving} style={{ height: 42, padding: '0 24px', borderRadius: 10, border: '1px solid rgba(201,168,76,.2)', background: 'rgba(201,168,76,.12)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: saving ? .6 : 1 }}>{saving ? '...' : 'حفظ'}</button>
          <button onClick={() => setPop(false)} style={{ height: 42, padding: '0 18px', background: 'transparent', color: 'var(--tx4)', border: '1.5px solid var(--bd)', borderRadius: 10, fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>إلغاء</button>
        </div>
      </div>
    </div>}
  </div>;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN EXPORT — BranchesPage
   ═══════════════════════════════════════════════════════════════ */
export default function BranchesPage({ sb, toast, user, lang }) {
  const T = (a, e) => (lang !== 'en' ? a : e);
  const [branches, setBranches] = useState([]); const [users, setUsers] = useState([]); const [banks, setBanks] = useState([]);
  const [regions, setRegions] = useState([]); const [cities, setCities] = useState([]);
  const [contracts, setContracts] = useState([]); const [docs, setDocs] = useState([]); const [bills, setBills] = useState([]);
  const [lookups, setLookups] = useState({});
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState('branches'); const [viewRow, setViewRow] = useState(null);
  const [pop, setPop] = useState(false); const [form, setForm] = useState({}); const [saving, setSaving] = useState(false); const [wizStep, setWizStep] = useState(0);
  const [districtsList, setDistrictsList] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [br, u, ba, rg, ct, cn, dc, bl, lk, di] = await Promise.all([
      sb.from('branch_stats').select('*'),
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
    setBranches(br.data || []); setUsers(u.data || []); setBanks(ba.data || []);
    setRegions(rg.data || []); setCities(ct.data || []); setContracts(cn.data || []);
    setDocs(dc.data || []); setBills(bl.data || []); setDistrictsList(di.data || []);
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
      Object.keys(d).forEach(k => {
        if (d[k] === '') d[k] = null;
        if (k === 'is_active') d[k] = d[k] === 'true' || d[k] === true;
        if (['shop_area_sqm'].includes(k) && d[k]) d[k] = Number(d[k]);
      });
      if (d.metadata && typeof d.metadata === 'string') try { d.metadata = JSON.parse(d.metadata); } catch { d.metadata = {}; }
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
    setForm({ name_ar: '', name_en: '', code: '', region_id: '', city_id: '', phone: '+966', is_active: 'true', manager_user_id: '', working_days: ['sun','mon','tue','wed','thu'], work_start_time: '08:00', work_end_time: '17:00', municipal_license_number: '', baladi_request_number: '', baladi_user_id: '', activity_id: '', municipal_license_status: '', license_issue_date: '', license_expiry_date: '', shop_area_sqm: '', municipality_id: '', authority_id: '', civil_defense_cert_number: '', civil_defense_expiry: '', civil_defense_status: '', district_id: '', building_number: '', street: '', postal_code: '', location_url: '', notes: '', metadata: '{}' });
    setWizStep(0); setPop(true);
  };

  const openEdit = r => {
    setForm({ _id: r.branch_id, name_ar: r.name_ar || '', name_en: r.name_en || '', code: r.code || '', region_id: r.region_id || '', city_id: r.city_id || '', phone: r.phone || '+966', is_active: String(r.is_active), manager_user_id: r.manager_user_id || '', working_days: r.working_days || ['sun','mon','tue','wed','thu'], work_start_time: r.work_start_time?.slice(0, 5) || '08:00', work_end_time: r.work_end_time?.slice(0, 5) || '17:00', municipal_license_number: r.municipal_license_number || '', baladi_request_number: r.baladi_request_number || '', baladi_user_id: r.baladi_user_id || '', activity_id: r.activity_id || '', municipal_license_status: r.municipal_license_status === 'active' || r.municipal_license_status === 'expired' ? '' : (r.municipal_license_status || ''), license_issue_date: r.license_issue_date || '', license_expiry_date: r.license_expiry_date || '', shop_area_sqm: String(r.shop_area_sqm || ''), municipality_id: r.municipality_id || '', authority_id: r.authority_id || '', civil_defense_cert_number: r.civil_defense_cert_number || '', civil_defense_expiry: r.civil_defense_expiry || '', civil_defense_status: r.civil_defense_status === 'active' || r.civil_defense_status === 'expired' ? '' : (r.civil_defense_status || ''), district_id: r.district_id || '', building_number: r.building_number || '', street: r.street || '', postal_code: r.postal_code || '', location_url: r.location_url || '', notes: r.notes || '', metadata: JSON.stringify(r.metadata || {}, null, 2) });
    setWizStep(0); setPop(true); setViewRow(null);
  };

  const totalRev = branches.reduce((s, b) => s + Number(b.total_revenue || 0), 0);
  const wfP = { form, setForm };
  const isEdit = !!form._id;
  // ADD wizard = 3 steps only (no license/safety — those are edited from branch detail)
  const addSteps = [
    { id: 'basic', l: 'البيانات الأساسية', ico: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6' },
    { id: 'address', l: 'العنوان والموقع', ico: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' },
    { id: 'extra', l: 'ملاحظات', ico: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' }
  ];
  const wizSteps = isEdit ? [] : addSteps;
  const step = wizSteps[wizStep] || wizSteps[0];

  return <div>
    {/* Header */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
      <div><div style={{ fontSize: 22, fontWeight: 800, color: 'var(--tx)' }}>المكاتب</div><div style={{ fontSize: 12, color: 'var(--tx4)', marginTop: 4 }}>إدارة المكاتب والفروع</div></div>
      <button onClick={openAdd} style={{ height: 38, padding: '0 20px', borderRadius: 10, border: '1px solid rgba(201,168,76,.2)', background: 'rgba(201,168,76,.12)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ مكتب</button>
    </div>

    {/* Sub-tabs: side list */}
    <div style={{ display: 'flex', gap: 0 }}>
    <div style={{ width: 90, flexShrink: 0, borderLeft: lang === 'ar' ? '1px solid rgba(255,255,255,.05)' : 'none', borderRight: lang !== 'ar' ? '1px solid rgba(255,255,255,.05)' : 'none', paddingTop: 2 }}>
      {[['branches', 'المكاتب', branches.length], ['bank_accounts', 'الحسابات البنكية', banks.length]].map(([k, l, n]) => <div key={k} onClick={() => setMainTab(k)} style={{ padding: '6px 8px', fontSize: 10, fontWeight: mainTab === k ? 700 : 500, color: mainTab === k ? C.gold : 'rgba(255,255,255,.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRight: lang === 'ar' && mainTab === k ? '2px solid ' + C.gold : '2px solid transparent', borderLeft: lang !== 'ar' && mainTab === k ? '2px solid ' + C.gold : '2px solid transparent', transition: '.1s' }}><span>{l}</span>{n > 0 && <span style={{ fontSize: 7, fontWeight: 700, color: 'rgba(255,255,255,.2)', padding: '0 4px' }}>{n}</span>}</div>)}
    </div>
    <div style={{ flex: 1, paddingRight: lang === 'ar' ? 8 : 0, paddingLeft: lang !== 'ar' ? 8 : 0 }}>

    {/* Branches tab */}
    {mainTab === 'branches' && <>
      {/* Stats header badge */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.gold }}>{branches.length} فرع</span>
        <span style={{ fontSize: 10, color: 'var(--tx5)' }}>·</span>
        <span style={{ fontSize: 11, color: C.ok }}>{branches.filter(b => b.is_active !== false).length} نشط</span>
        <span style={{ fontSize: 10, color: 'var(--tx5)' }}>·</span>
        <span style={{ fontSize: 11, color: '#999' }}>{branches.filter(b => b.is_active === false).length} معطّل</span>
      </div>
      {loading ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--tx6)' }}>...</div> :
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 14 }}>
          {branches.map(b => {
            const isActive = b.is_active !== false;
            const now = new Date();
            const licDays = b.license_expiry_date ? Math.ceil((new Date(b.license_expiry_date) - now) / 86400000) : null;
            const cdDays = b.civil_defense_expiry ? Math.ceil((new Date(b.civil_defense_expiry) - now) / 86400000) : null;
            const licClr = licDays === null ? '#555' : licDays < 0 ? C.red : licDays < 30 ? '#e67e22' : licDays < 90 ? C.gold : C.ok;
            const cdClr = cdDays === null ? '#555' : cdDays < 0 ? C.red : cdDays < 30 ? '#e67e22' : cdDays < 90 ? C.gold : C.ok;
            const borderClr = !isActive ? 'rgba(153,153,153,.15)' : (licDays !== null && licDays < 30) ? 'rgba(192,57,43,.2)' : 'rgba(39,160,70,.15)';
            const licAlert = licDays !== null && licDays > 0 && licDays <= 30;
            return <div key={b.branch_id} onClick={() => { setViewRow(b); }} style={{ background: 'var(--bg)', border: '1.5px solid ' + borderClr, borderRadius: 14, overflow: 'hidden', cursor: 'pointer', transition: '.15s', opacity: isActive ? 1 : .6 }} onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,.2)'} onMouseLeave={e => e.currentTarget.style.borderColor = borderClr}>
              {/* Alert banner */}
              {licAlert && <div style={{ padding: '5px 14px', background: 'rgba(192,57,43,.06)', borderBottom: '1px solid rgba(192,57,43,.1)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
                <span style={{ fontSize: 9, fontWeight: 600, color: C.red }}>رخصة بلدية تنتهي خلال {licDays} يوماً</span>
              </div>}
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
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{b.name_ar}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: isActive ? 'rgba(39,160,70,.1)' : 'rgba(153,153,153,.1)', color: isActive ? C.ok : '#999' }}>{isActive ? 'نشط' : 'معطّل'}</span>
                  </div>
                  {b.code && <div style={{ fontSize: 10, color: 'var(--tx5)', direction: 'ltr' }}>{b.code}</div>}
                </div>
                <div onClick={e => { e.stopPropagation(); openEdit(b); }} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid rgba(201,168,76,.15)', background: 'rgba(201,168,76,.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                </div>
              </div>
              {/* 4 Indicators */}
              <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,.04)', background: 'rgba(255,255,255,.01)' }}>
                {[
                  [b.workers_count || 0, 'عامل', C.ok],
                  [b.facilities_count || 0, 'منشأة', C.blue],
                  [licDays === null ? '—' : licDays < 0 ? 'منتهية' : licDays + ' يوم', 'الرخصة', licClr],
                  [cdDays === null ? '—' : cdDays < 0 ? 'منتهية' : cdDays + ' أيام', 'الدفاع المدني', cdClr]
                ].map(([val, lbl, clr], i) => <div key={i} style={{ flex: 1, padding: '8px 6px', textAlign: 'center', borderLeft: i > 0 ? '1px solid rgba(255,255,255,.03)' : 'none' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: clr, lineHeight: 1, marginBottom: 3 }}>{val}</div>
                  <div style={{ fontSize: 7, fontWeight: 600, color: clr, opacity: .7 }}>{lbl}</div>
                </div>)}
              </div>
              {/* Footer: Manager + Working hours */}
              <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,.015)' }}>
                {b.manager_user_name ? <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  <span style={{ fontSize: 9, color: C.gold }}>{b.manager_user_name}</span>
                </div> : <span />}
                {(b.work_start_time || b.work_end_time) ? <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                  <span style={{ fontSize: 9, color: 'var(--tx5)', direction: 'ltr' }}>{(b.work_start_time || '').slice(0, 5)} - {(b.work_end_time || '').slice(0, 5)}</span>
                  <span style={{ fontSize: 8, color: 'var(--tx6)' }}>الدوام</span>
                </div> : <span />}
              </div>
            </div>;
          })}
        </div>}
    </>}

    {mainTab === 'bank_accounts' && <BankAccountsTab sb={sb} toast={toast} user={user} lang={lang} branches={branches} banks={banks} contracts={contracts} docs={docs} reload={load} />}
    </div></div>

    <BranchDetailModal viewRow={viewRow} setViewRow={setViewRow} openEdit={openEdit} del={del} users={users} banks={banks} contracts={contracts} bills={bills} docs={docs} toast={toast} T={T} />

    {/* ═══ Wizard Modal ═══ */}
    {pop && <div onClick={() => setPop(false)} style={{ position: 'fixed', inset: 0, background: 'var(--overlayBg,rgba(14,14,14,.8))', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--sf)', borderRadius: 16, width: 'min(720px,95vw)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid rgba(201,168,76,.12)' }}>
        <div style={{ height: 3, background: 'linear-gradient(90deg,transparent,' + C.gold + ' 30%,#dcc06e 50%,' + C.gold + ' 70%,transparent)' }} />
        <div style={{ background: 'var(--bg)', padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--bd2)' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>{isEdit ? 'تعديل بيانات المكتب' : 'إضافة مكتب جديد'}</div>
          <button onClick={() => setPop(false)} style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--hoverBg)', border: '1px solid var(--bd)', color: 'var(--tx4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        {!isEdit && <div style={{ display: 'flex', padding: '0 22px', background: 'var(--bg)', borderBottom: '1px solid var(--bd2)', gap: 0 }}>
          {wizSteps.map((s, i) => <div key={s.id} onClick={() => setWizStep(i)} style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', borderBottom: wizStep === i ? '2.5px solid ' + C.gold : '2.5px solid transparent', transition: 'all .2s' }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: wizStep === i ? 'rgba(201,168,76,.12)' : i < wizStep ? 'rgba(39,160,70,.08)' : 'var(--hoverBg)', border: '1.5px solid ' + (wizStep === i ? 'rgba(201,168,76,.25)' : i < wizStep ? 'rgba(39,160,70,.15)' : 'var(--bd2)'), display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={wizStep === i ? C.gold : i < wizStep ? C.ok : 'var(--tx5)'} strokeWidth="1.8"><path d={s.ico} /></svg></div>
            <span style={{ fontSize: 10, fontWeight: wizStep === i ? 700 : 500, color: wizStep === i ? C.gold : i < wizStep ? C.ok : 'var(--tx5)', whiteSpace: 'nowrap' }}>{s.l}</span>
          </div>)}
        </div>}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', scrollbarWidth: 'none' }}>
          {/* Step 1: Basic */}
          {(isEdit || step.id === 'basic') && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <WF k="name_ar" l="الاسم بالعربي" r {...wfP} />
            <WF k="name_en" l="الاسم بالإنجليزي" d {...wfP} />
            <WF k="region_id" l="المنطقة" r opts={regions.map(r => ({ v: r.id, l: r.name_ar }))} form={form} setForm={v => { setForm(v); }} />
            <div><div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx4)', marginBottom: 5 }}>المدينة <span style={{ color: C.red }}>*</span></div>
              <select value={form.city_id || ''} onChange={e => updateCode(e.target.value)} style={fS}><option value="">—</option>{cities.filter(c => !form.region_id || c.region_id === form.region_id).map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}</select></div>
            <WF k="code" l="كود المكتب" d ph="RYD01-03" {...wfP} />
            <WF k="phone" l="الجوال (+966)" d ph="+966501234567" {...wfP} />
            <WF k="manager_user_id" l="المدير المسؤول" opts={users.map(u => ({ v: u.id, l: u.name_ar }))} {...wfP} />
            <WF k="is_active" l="الحالة" opts={[{ v: 'true', l: 'نشط' }, { v: 'false', l: 'غير نشط' }]} {...wfP} />
            <div style={{ gridColumn: '1/-1' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx4)', marginBottom: 5 }}>أيام العمل</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {[['sat','السبت'],['sun','الأحد'],['mon','الاثنين'],['tue','الثلاثاء'],['wed','الأربعاء'],['thu','الخميس'],['fri','الجمعة']].map(([k,l]) => {
                  const days = Array.isArray(form.working_days) ? form.working_days : [];
                  const on = days.includes(k);
                  return <button key={k} type="button" onClick={() => setForm(p => ({ ...p, working_days: on ? days.filter(d => d !== k) : [...days, k] }))} style={{ height: 36, padding: '0 14px', borderRadius: 8, border: on ? '1.5px solid rgba(201,168,76,.4)' : '1.5px solid rgba(255,255,255,.1)', background: on ? 'rgba(201,168,76,.15)' : 'rgba(255,255,255,.04)', color: on ? C.gold : 'var(--tx5)', fontFamily: F, fontSize: 12, fontWeight: on ? 700 : 500, cursor: 'pointer', transition: '.15s' }}>{l}</button>;
                })}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <WF k="work_start_time" l="بداية الدوام" d tp="time" {...wfP} />
              <WF k="work_end_time" l="نهاية الدوام" d tp="time" {...wfP} />
            </div>
          </div>}
          {/* ADD Step 2 / EDIT: Address */}
          {(isEdit || step?.id === 'address') && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {!isEdit && <div style={{ gridColumn: '1/-1', padding: '12px 16px', borderRadius: 10, background: 'rgba(52,131,180,.04)', border: '1px solid rgba(52,131,180,.08)', marginBottom: 4 }}><div style={{ fontSize: 12, fontWeight: 600, color: C.blue, marginBottom: 4 }}>العنوان والموقع</div></div>}
            {isEdit && <div style={{ gridColumn: '1/-1', fontSize: 13, fontWeight: 700, color: C.blue, paddingBottom: 6, borderBottom: '1px solid rgba(52,131,180,.12)', marginBottom: 4 }}>العنوان والموقع</div>}
            <WF k="district_id" l="الحي" opts={distOpts(form.city_id)} {...wfP} />
            <WF k="building_number" l="رقم المبنى" d {...wfP} />
            <WF k="street" l="الشارع" ph="شارع حائل" {...wfP} />
            <WF k="postal_code" l="الرمز البريدي" d ph="32416" {...wfP} />
            <WF k="location_url" l="رابط Google Maps" d w={true} ph="https://maps.google.com/..." {...wfP} />
          </div>}
          {/* EDIT ONLY: رخصة بلدي */}
          {isEdit && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 }}>
            <div style={{ gridColumn: '1/-1', fontSize: 13, fontWeight: 700, color: C.ok, paddingBottom: 6, borderBottom: '1px solid rgba(39,160,70,.12)', marginBottom: 4 }}>رخصة بلدي</div>
            <WF k="municipal_license_number" l="رقم الرخصة" d ph="470220637006" {...wfP} />
            <WF k="baladi_request_number" l="رقم الطلب" d ph="4750787127" {...wfP} />
            <WF k="baladi_user_id" l="حساب بلدي (المستخدم)" opts={users.map(u => ({ v: u.id, l: u.name_ar }))} {...wfP} />
            <WF k="activity_id" l="النشاط التجاري" opts={lkOpts('cr_activities')} {...wfP} />
            <WF k="municipal_license_status" l="حالة يدوية (اختياري)" opts={[{ v: '', l: 'تلقائي' }, { v: 'pending', l: 'قيد الإصدار' }, { v: 'issue', l: 'مشكلة' }]} {...wfP} />
            <WF k="license_issue_date" l="تاريخ الإصدار" d tp="date" {...wfP} />
            <WF k="license_expiry_date" l="تاريخ الانتهاء" d tp="date" {...wfP} />
            <WF k="shop_area_sqm" l="مساحة المحل م²" d tp="number" ph="25" {...wfP} />
            <WF k="municipality_id" l="البلدية" opts={lkOpts('municipality')} {...wfP} />
          </div>}
          {/* EDIT ONLY: السلامة */}
          {isEdit && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 }}>
            <div style={{ gridColumn: '1/-1', fontSize: 13, fontWeight: 700, color: '#e67e22', paddingBottom: 6, borderBottom: '1px solid rgba(230,126,34,.12)', marginBottom: 4 }}>السلامة والدفاع المدني</div>
            <WF k="authority_id" l="الأمانة" opts={lkOpts('municipality_authority')} {...wfP} />
            <WF k="civil_defense_cert_number" l="رقم شهادة السلامة" d ph="CD-DMM-2025-1105" {...wfP} />
            <WF k="civil_defense_expiry" l="تاريخ انتهاء السلامة" d tp="date" {...wfP} />
            <WF k="civil_defense_status" l="حالة يدوية (اختياري)" opts={[{ v: '', l: 'تلقائي' }, { v: 'pending', l: 'قيد الإصدار' }, { v: 'issue', l: 'مشكلة' }]} {...wfP} />
          </div>}
          {/* ADD Step 3 / EDIT: Notes */}
          {(isEdit || step?.id === 'extra') && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: isEdit ? 20 : 0 }}>
            {isEdit && <div style={{ gridColumn: '1/-1', fontSize: 13, fontWeight: 700, color: 'var(--tx4)', paddingBottom: 6, borderBottom: '1px solid var(--bd2)', marginBottom: 4 }}>ملاحظات</div>}
            <WF k="notes" l="ملاحظات" w="ta" {...wfP} />
            <WF k="metadata" l="بيانات إضافية JSON" w="ta" d {...wfP} />
          </div>}
        </div>
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {!isEdit && wizStep > 0 && <button onClick={() => setWizStep(p => p - 1)} style={{ height: 42, padding: '0 20px', borderRadius: 10, border: '1.5px solid var(--bd)', background: 'transparent', color: 'var(--tx4)', fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>السابق</button>}
            <button onClick={() => setPop(false)} style={{ height: 42, padding: '0 18px', background: 'transparent', color: 'var(--tx5)', border: '1px solid var(--bd2)', borderRadius: 10, fontFamily: F, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>إلغاء</button>
          </div>
          <div>
            {!isEdit && wizStep < wizSteps.length - 1 ? <button onClick={() => setWizStep(p => p + 1)} style={{ height: 42, padding: '0 24px', borderRadius: 10, border: '1px solid rgba(201,168,76,.2)', background: 'rgba(201,168,76,.12)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>التالي<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg></button>
              : <button onClick={saveBranch} disabled={saving} style={{ height: 42, padding: '0 28px', borderRadius: 10, border: '1px solid rgba(201,168,76,.3)', background: 'rgba(201,168,76,.15)', color: C.gold, fontFamily: F, fontSize: 13, fontWeight: 800, cursor: 'pointer', opacity: saving ? .6 : 1 }}>{saving ? '...' : isEdit ? 'حفظ التعديلات' : 'إضافة المكتب'}</button>}
          </div>
        </div>
      </div>
    </div>}
  </div>;
}
