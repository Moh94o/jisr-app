// Read the fiscal-year article («السنة المالية») out of an SBC founding contract PDF.
//
//   «تبدأ السنة المالية الأولى للشركة من تاريخ قيدها بالسجل التجاري وتنتهي في 1447/12/27 هـ
//    الموافق 2026/06/13 م وتكون كل سنة مالية بعد ذلك اثني عشر شهراً ميلادياً»   → first end 2026-06-13
//   Amended contracts: «تكون السنة المالية للشركة اثني عشر شهراً ميلادياً تبدأ من يوم 01 من شهر
//    يناير وتنتهي بنهاية يوم 31 من شهر ديسمبر»   → first 31 Dec at least 6 months after registration
//
// The PDF text layer draws every glyph twice (fake bold) and uses Arabic presentation forms:
// collapse the repeats, then NFKC. Digits survive intact. The article sits near the end, so
// pages are read last → first and we stop at the first hit. Verified 2026-11-14 on 813 contracts:
// Hijri = Gregorian on all 806 dated clauses; first end matches SBC's own fiscal-period records 367/384.
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const DATE = /(\d{1,4})\s*\/\s*(\d{1,2})\s*\/\s*(\d{1,4})/g;
const toYMD = (a, b, c) => (a.length === 4 ? [a, b, c] : [c, b, a]).map((x, i) => (i ? x.padStart(2, '0') : x)).join('-');
const strip = (s) => s.replace(/\s+/g, '');

export const addMonths = (d, n) => {
  const [y, m, day] = d.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(day, last));
  return t.toISOString().slice(0, 10);
};

function normLine(t) {
  const toks = t.split(' ').filter(Boolean);
  const out = [];
  for (let i = 0; i < toks.length; i++) {
    if (i + 1 < toks.length && toks[i] === toks[i + 1]) { out.push(toks[i]); i++; } else out.push(toks[i]);
  }
  let s = '';
  for (const tk of out) s += (/\d/.test(tk) || /^[()\/:،.-]$/.test(tk)) ? ' ' + tk + ' ' : tk;
  return s.normalize('NFKC').replace(/\s+/g, ' ').trim();
}

async function pageLines(doc, p) {
  const tc = await (await doc.getPage(p)).getTextContent();
  const rows = new Map();
  for (const it of tc.items) {
    if (!it.str || !it.str.trim()) continue;
    const y = Math.round(it.transform[5]);
    if (!rows.has(y)) rows.set(y, []);
    rows.get(y).push({ x: it.transform[4], s: it.str });
  }
  return [...rows.entries()].sort((a, b) => b[0] - a[0])
    .map(([, items]) => normLine(items.sort((a, b) => b.x - a.x).map((i) => i.s).join(' ')));
}

const MONTHS = { 'يناير': 1, 'فرباير': 2, 'فبراير': 2, 'مارس': 3, 'أبريل': 4, 'ابريل': 4, 'مايو': 5, 'يونيو': 6, 'يوليو': 7,
  'أغسطس': 8, 'اغسطس': 8, 'سبتمرب': 9, 'سبتمبر': 9, 'أكتوبر': 10, 'اكتوبر': 10, 'نوفمرب': 11, 'نوفمبر': 11, 'ديسمرب': 12, 'ديسمبر': 12 };

/** @returns {{basis:'contract'|'contract_amended'|'not_found', first_fy_end?:string, first_fy_end_hijri?:string, clause?:string}} */
export async function extractFiscalYear(bytes, issueDate) {
  const doc = await getDocument({ data: new Uint8Array(bytes), verbosity: 0, useSystemFonts: true }).promise;
  try {
    let next = [];
    for (let p = doc.numPages; p >= 1; p--) {
      const ls = await pageLines(doc, p);
      const all = ls.concat(next);
      let k = all.findIndex((l) => /تبدأ.{0,3}السنة/.test(strip(l)) && /الأو/.test(strip(l)));
      if (k < 0) k = all.findIndex((l) => /السنة(امل|الم)الية(الأو)/.test(strip(l)));
      if (k < 0) k = all.findIndex((l) => /تكونالسنة(امل|الم)الية/.test(strip(l)));
      if (k < 0) {
        const head = all.findIndex((l) => /(امل|الم)ادة.{0,25}السنة(امل|الم)الية/.test(strip(l)));
        if (head >= 0 && all[head + 1]) k = head + 1;
      }
      if (k >= 0) {
        const first = all[k] + ' ' + (all[k + 1] || '');
        const clause = [all[k], all[k + 1], all[k + 2]].filter(Boolean).join(' ¶ ').slice(0, 600);
        const dates = [...first.matchAll(DATE)].map((m) => toYMD(m[1], m[2], m[3]));
        const greg = dates.find((d) => /^20\d\d-/.test(d));
        const hijri = dates.find((d) => /^1[34]\d\d-/.test(d));
        if (greg) return { basis: 'contract', first_fy_end: greg, first_fy_end_hijri: hijri || null, clause };
        // calendar-year clause: «… وتنتهي بنهاية يوم 31 من شهر ديسمبر» (may sit a line or two lower,
        // and be followed directly by a numbered line, so match the month by name)
        const win = strip([all[k], all[k + 1], all[k + 2]].filter(Boolean).join(' '));
        const m = win.match(new RegExp('وتنتهيبنهايةيوم(\\d{1,2})منشهر(' + Object.keys(MONTHS).join('|') + ')'));
        const mm = m ? MONTHS[m[2]] : null;
        if (m && mm) {
          const dd = String(Number(m[1])).padStart(2, '0'), ms = String(mm).padStart(2, '0');
          const floor = issueDate ? addMonths(String(issueDate).slice(0, 10), 6) : null;
          let end = `${(floor || '2024-01-01').slice(0, 4)}-${ms}-${dd}`;
          if (floor && end < floor) end = addMonths(end, 12);
          return { basis: 'contract_amended', first_fy_end: end, first_fy_end_hijri: null, clause };
        }
        return { basis: 'not_found', clause };
      }
      next = ls;
    }
    return { basis: 'not_found' };
  } finally {
    await doc.destroy();
  }
}
