// ═══ جسر — أدوات مساعدة v2 ═══

// Reference numbers (invoice no / transfer-quote no) are shown WITHOUT dashes everywhere.
// Display/copy only — the stored value keeps its dashes for navigation, search and DB lookups.
export const noDash = (v) => String(v ?? '').replace(/-/g, '');

// ═══ اسم المكتب في القوائم — «النك نيم · الكود» (أو أحدهما إن نقص الآخر) ═══
// b: صف مكتب فيه branch_code و name_ar (النك نيم). يُستخدم في كل دروب داون للمكاتب/الفروع.
// النك نيم أولاً كي يستقرّ يميناً في الواجهة العربية، والكود بعده على اليسار.
// يُنظَّف النك نيم من بادئة «مكتب» ولاحقة «[n]» لأن رقمها مكرّر داخل الكود نفسه.
// النك نيم وحده بعد التنظيف — لعرضه بجانب الكود في الكروت والعناوين.
export const branchNick = (b) => String(b?.name_ar || b?.nickname || '').trim()
  .replace(/^مكتب\s+/, '').replace(/\s*\[\d+\]\s*$/, '').trim();

export const branchLabel = (b) => {
  if (!b) return '—';
  const nick = branchNick(b);
  const code = String(b.branch_code || '').trim();
  const base = nick && code ? `${nick} | ${code}` : (nick || code || String(b.id || '—'));
  // مكتب تجريبي/تعليمي: وسم واضح حيثما توفّرت الراية (لا أثر لها إن لم تُجلب).
  return b.is_test ? `${base} | تجريبي` : base;
};

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
    ...(next && 'phone2' in next ? [{ field: 'phone2', from: digits(prev?.phone2), to: digits(next?.phone2) }] : []),
    ...(next && 'phone3' in next ? [{ field: 'phone3', from: digits(prev?.phone3), to: digits(next?.phone3) }] : []),
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

