// ═══ جسر — أدوات مساعدة v2 ═══

// Reference numbers (invoice no / transfer-quote no) are shown WITHOUT dashes everywhere.
// Display/copy only — the stored value keeps its dashes for navigation, search and DB lookups.
export const noDash = (v) => String(v ?? '').replace(/-/g, '');

// ═══ UI-9: تصدير Excel ═══
export async function exportToExcel(data, columns, fileName = 'export') {
  if (!data?.length) return;
  const BOM = '\uFEFF';
  const headers = columns.map(c => c[1] || c[0]);
  const keys = columns.map(c => c[0]);
  const rows = data.map(row => keys.map(k => {
    const v = row[k];
    if (v === null || v === undefined) return '';
    if (typeof v === 'boolean') return v ? 'نعم' : 'لا';
    return String(v).replace(/"/g, '""');
  }));
  const csv = BOM + [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${fileName}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ═══ UI-8: استيراد Excel/CSV ═══
export function importFromCSV(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) { reject(new Error('الملف فارغ')); return; }
        const headers = parseCSVLine(lines[0]);
        const data = lines.slice(1).map(line => {
          const vals = parseCSVLine(line);
          const obj = {};
          headers.forEach((h, i) => { obj[h.trim()] = vals[i]?.trim() || '' });
          return obj;
        });
        resolve({ headers, data });
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error('خطأ في قراءة الملف'));
    reader.readAsText(file, 'UTF-8');
  });
}

function parseCSVLine(line) {
  const result = []; let current = ''; let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (inQuotes && line[i + 1] === '"') { current += '"'; i++; } else { inQuotes = !inQuotes; } }
    else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
    else { current += ch; }
  }
  result.push(current);
  return result;
}

// ═══ UI-4: طباعة PDF ═══
export function printContent(title, htmlContent, lang = 'ar') {
  const w = window.open('', '_blank');
  w.document.write(`<html dir="${lang === 'ar' ? 'rtl' : 'ltr'}"><head>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
body{font-family:'Cairo',sans-serif;padding:40px;color:#333;max-width:800px;margin:0 auto;font-size:12px;line-height:1.8}
h1{font-size:18px;text-align:center;color:#B07D00;border-bottom:2px solid #B07D00;padding-bottom:10px;margin-bottom:20px}
table{width:100%;border-collapse:collapse;margin:12px 0}
th{background:#f5f5f5;padding:8px 10px;border:1px solid #ddd;font-weight:600;font-size:11px}
td{padding:6px 10px;border:1px solid #eee;font-size:11px}
tr:nth-child(even){background:#fafafa}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-bottom:2px solid #B07D00;padding-bottom:15px}
.logo{font-size:24px;font-weight:600;color:#B07D00}
.info{font-size:10px;color:#888}
.footer{text-align:center;font-size:9px;color:#aaa;margin-top:30px;border-top:1px solid #eee;padding-top:10px}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600}
.amount{font-size:16px;font-weight:600;color:#27a046;text-align:center;margin:10px 0}
@media print{body{padding:20px}}
</style></head><body>
<div class="header"><div class="logo">تأشيرة البناء والإنشاء</div><div class="info">Visa Albina &amp; Alinsha<br>${new Date().toLocaleDateString('ar-SA')}</div></div>
<h1>${title}</h1>
${htmlContent}
<div class="footer">طُبع بتاريخ ${new Date().toLocaleDateString('ar-SA')} — تأشيرة البناء والإنشاء — هذا مستند إلكتروني</div>
</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 300);
}

// ═══ UI-10: كشف حساب عميل ═══
export function generateClientStatement(client, invoices, payments, lang = 'ar') {
  const T = (ar, en) => lang === 'ar' ? ar : en;
  let balance = 0;
  const rows = [];
  invoices.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).forEach(inv => {
    balance += Number(inv.total_amount || 0);
    rows.push({ date: inv.created_at?.slice(0, 10), type: T('فاتورة', 'Invoice'), ref: inv.invoice_number, debit: Number(inv.total_amount || 0), credit: 0, balance });
    (payments || []).filter(p => p.invoice_id === inv.id).sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date)).forEach(pay => {
      balance -= Number(pay.amount || 0);
      rows.push({ date: pay.payment_date, type: T('دفعة', 'Payment'), ref: pay.payment_method || '', debit: 0, credit: Number(pay.amount || 0), balance });
    });
  });
  return rows;
}

// ═══ UI-12: كشف التكرار ═══
export async function checkDuplicate(sb, table, field, value, excludeId = null) {
  if (!value || !value.trim()) return null;
  let query = sb.from(table).select('id,name_ar,' + field).eq(field, value.trim()).is('deleted_at', null);
  if (excludeId) query = query.neq('id', excludeId);
  const { data } = await query.limit(1).maybeSingle();
  return data;
}

// ═══ سجل تعديل بيانات العميل — يقارن القيم قبل/بعد ويبني مصفوفة التغييرات ═══
// prev/next: كائن العميل (name_ar, id_number, phone, nationality_id). nationalities: قائمة الجنسيات لاشتقاق الاسم.
// يعيد مصفوفة [{ field, from, to }] للحقول المتغيّرة فقط (from/to نصوص جاهزة للعرض)، أو [] إن لا تغيير.
export function clientEditChanges(prev, next, nationalities = []) {
  const natName = (id) => {
    if (!id) return '';
    const n = (nationalities || []).find(x => String(x.id) === String(id));
    return n ? (n.name_ar || n.name_en || '') : '';
  };
  const digits = (v) => String(v ?? '').replace(/\D/g, '');
  const defs = [
    { field: 'name', from: prev?.name_ar || '', to: next?.name_ar || '' },
    { field: 'id', from: digits(prev?.id_number), to: digits(next?.id_number) },
    { field: 'phone', from: digits(prev?.phone), to: digits(next?.phone) },
    { field: 'nationality', from: natName(prev?.nationality_id), to: natName(next?.nationality_id) },
  ];
  return defs
    .filter(d => String(d.from) !== String(d.to))
    .map(({ field, from, to }) => ({ field, from: from || '', to: to || '' }));
}

// ═══ UI-6: اختصارات لوحة المفاتيح ═══
export function setupKeyboardShortcuts(handlers) {
  const listener = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      if (e.key === 'Escape') { e.target.blur(); return; }
      return;
    }
    const key = `${e.ctrlKey || e.metaKey ? 'ctrl+' : ''}${e.shiftKey ? 'shift+' : ''}${e.key.toLowerCase()}`;
    if (handlers[key]) { e.preventDefault(); handlers[key](); }
  };
  document.addEventListener('keydown', listener);
  return () => document.removeEventListener('keydown', listener);
}

// ═══ BIZ-7: حساب نطاقات ═══
export function calculateNitaqat(totalWorkers, saudiWorkers, facilitySize) {
  if (!totalWorkers || totalWorkers === 0) return { percentage: 0, color: 'red', label: 'غير محسوب' };
  const pct = (saudiWorkers / totalWorkers) * 100;
  const thresholds = facilitySize === 'small' 
    ? { platinum: 40, green_high: 27, green_mid: 20, green_low: 13, yellow: 7 }
    : facilitySize === 'medium'
    ? { platinum: 46, green_high: 33, green_mid: 26, green_low: 20, yellow: 13 }
    : { platinum: 53, green_high: 40, green_mid: 33, green_low: 26, yellow: 20 };
  
  if (pct >= thresholds.platinum) return { percentage: pct, color: 'platinum', label: 'بلاتيني' };
  if (pct >= thresholds.green_high) return { percentage: pct, color: 'green_high', label: 'أخضر مرتفع' };
  if (pct >= thresholds.green_mid) return { percentage: pct, color: 'green_mid', label: 'أخضر متوسط' };
  if (pct >= thresholds.green_low) return { percentage: pct, color: 'green_low', label: 'أخضر منخفض' };
  if (pct >= thresholds.yellow) return { percentage: pct, color: 'yellow', label: 'أصفر' };
  return { percentage: pct, color: 'red', label: 'أحمر' };
}

