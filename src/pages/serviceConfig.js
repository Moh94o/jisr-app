// ═══ Service Detection & SVG Logos ═══
// Maps sender domains/keywords to service info with inline SVG logos

const SERVICES = {
  // Government — official brand colors
  qiwa: { name: 'منصة قوى', domain: 'QIWA.SA', cat: 'gov', color: '#00a651', abbr: 'قوى',
    logo: (s=40)=>`<svg width="${s}" height="${s}" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#00a65120"/><text x="20" y="17" text-anchor="middle" font-size="11" font-weight="900" fill="#00a651" font-family="Arial">QIWA</text><text x="20" y="30" text-anchor="middle" font-size="10" font-weight="800" fill="#00a651" font-family="Cairo">قوى</text></svg>` },
  absher: { name: 'أبشر', domain: 'ABSHER.SA', cat: 'gov', color: '#006838', abbr: 'أبشر',
    logo: (s=40)=>`<svg width="${s}" height="${s}" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#00683820"/><text x="20" y="25" text-anchor="middle" font-size="12" font-weight="900" fill="#006838" font-family="Cairo">أبشر</text></svg>` },
  nafath: { name: 'نفاذ', domain: 'NAFATH.SA', cat: 'gov', color: '#1B998B', abbr: 'نفاذ',
    logo: (s=40)=>`<svg width="${s}" height="${s}" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#1B998B20"/><circle cx="20" cy="16" r="6" fill="none" stroke="#1B998B" stroke-width="2"/><path d="M20 10 A6 6 0 0 1 26 16" fill="none" stroke="#1B998B" stroke-width="3" stroke-linecap="round"/><text x="20" y="34" text-anchor="middle" font-size="8" font-weight="800" fill="#1B998B" font-family="Cairo">نفاذ</text></svg>` },
  moi: { name: 'وزارة الداخلية', domain: 'MOI.GOV.SA', cat: 'gov', color: '#1a5c3a', abbr: 'داخلية',
    logo: (s=40)=>`<svg width="${s}" height="${s}" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#1a5c3a18"/><path d="M20 6 L30 13 V22 C30 28 20 34 20 34 C20 34 10 28 10 22 V13 Z" fill="#1a5c3a15" stroke="#1a5c3a" stroke-width="1.5"/><text x="20" y="23" text-anchor="middle" font-size="8" font-weight="900" fill="#1a5c3a" font-family="Cairo">داخلية</text></svg>` },
  muqeem: { name: 'مقيم', domain: 'MUQEEM.SA', cat: 'gov', color: '#0d7c4a', abbr: 'مقيم',
    logo: (s=40)=>`<svg width="${s}" height="${s}" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#0d7c4a20"/><text x="20" y="25" text-anchor="middle" font-size="12" font-weight="900" fill="#0d7c4a" font-family="Cairo">مقيم</text></svg>` },
  gosi: { name: 'التأمينات', domain: 'GOSI.GOV.SA', cat: 'gov', color: '#00796B', abbr: 'GOSI',
    logo: (s=40)=>`<svg width="${s}" height="${s}" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#00796B20"/><text x="20" y="18" text-anchor="middle" font-size="10" font-weight="900" fill="#00796B" font-family="Arial">GOSI</text><text x="20" y="30" text-anchor="middle" font-size="8" font-weight="700" fill="#00796B" font-family="Cairo">التأمينات</text></svg>` },
  tawakkalna: { name: 'توكلنا', domain: 'TAWAKKALNA.SA', cat: 'gov', color: '#00897B', abbr: 'توكلنا',
    logo: (s=40)=>`<svg width="${s}" height="${s}" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#00897B20"/><text x="20" y="25" text-anchor="middle" font-size="11" font-weight="900" fill="#00897B" font-family="Cairo">توكلنا</text></svg>` },
  mol: { name: 'وزارة العمل', domain: 'MOL.GOV.SA', cat: 'gov', color: '#2e7d32', abbr: 'العمل',
    logo: (s=40)=>`<svg width="${s}" height="${s}" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#2e7d3220"/><text x="20" y="25" text-anchor="middle" font-size="11" font-weight="900" fill="#2e7d32" font-family="Cairo">العمل</text></svg>` },

  // Banks — official brand colors
  rajhi: { name: 'الراجحي', domain: 'ALRAJHIBANK.COM', cat: 'bank', color: '#004D40', abbr: 'الراجحي',
    logo: (s=40)=>`<svg width="${s}" height="${s}" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#004D4020"/><text x="20" y="18" text-anchor="middle" font-size="8" font-weight="900" fill="#004D40" font-family="Cairo">الراجحي</text><rect x="8" y="22" width="24" height="2" rx="1" fill="#004D40"/><rect x="12" y="26" width="16" height="6" rx="1" fill="#004D40" opacity=".3"/></svg>` },
  ahli: { name: 'الأهلي', domain: 'SNB.COM', cat: 'bank', color: '#006A4E', abbr: 'SNB',
    logo: (s=40)=>`<svg width="${s}" height="${s}" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#006A4E20"/><text x="20" y="18" text-anchor="middle" font-size="12" font-weight="900" fill="#006A4E" font-family="Arial">SNB</text><text x="20" y="30" text-anchor="middle" font-size="8" font-weight="700" fill="#006A4E" font-family="Cairo">الأهلي</text></svg>` },
  riyad: { name: 'بنك الرياض', domain: 'RIYADBANK.COM', cat: 'bank', color: '#7B2D8E', abbr: 'الرياض',
    logo: (s=40)=>`<svg width="${s}" height="${s}" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#7B2D8E20"/><text x="20" y="18" text-anchor="middle" font-size="7" font-weight="800" fill="#7B2D8E" font-family="Cairo">بنك الرياض</text><rect x="10" y="22" width="20" height="2" rx="1" fill="#7B2D8E"/><text x="20" y="34" text-anchor="middle" font-size="8" font-weight="700" fill="#7B2D8E" font-family="Arial">RIYAD</text></svg>` },
  bilad: { name: 'بنك البلاد', domain: 'BANKALBILAD.COM', cat: 'bank', color: '#B71C1C', abbr: 'البلاد',
    logo: (s=40)=>`<svg width="${s}" height="${s}" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#B71C1C20"/><text x="20" y="18" text-anchor="middle" font-size="7" font-weight="800" fill="#B71C1C" font-family="Cairo">بنك البلاد</text><rect x="10" y="22" width="20" height="2" rx="1" fill="#B71C1C"/><text x="20" y="34" text-anchor="middle" font-size="8" font-weight="700" fill="#B71C1C" font-family="Arial">BILAD</text></svg>` },
  stcpay: { name: 'STC Pay', domain: 'STCPAY.COM', cat: 'bank', color: '#4A148C', abbr: 'STC',
    logo: (s=40)=>`<svg width="${s}" height="${s}" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#4A148C20"/><text x="20" y="18" text-anchor="middle" font-size="12" font-weight="900" fill="#4A148C" font-family="Arial">stc</text><text x="20" y="30" text-anchor="middle" font-size="9" font-weight="800" fill="#4A148C" font-family="Arial">pay</text></svg>` },

  // Default
  _default: { name: 'غير معروف', domain: '', cat: 'other', color: '#9b59b6',
    logo: (s=40)=>`<svg width="${s}" height="${s}" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#9b59b618"/><circle cx="20" cy="16" r="5" fill="none" stroke="#9b59b6" stroke-width="1.5"/><path d="M12 30 C12 24 15 22 20 22 C25 22 28 24 28 30" fill="none" stroke="#9b59b6" stroke-width="1.5"/></svg>` }
}

export function detectService(sender) {
  const s = (sender || '').toLowerCase()
  if (s.includes('qiwa') || s.includes('mol.gov')) return SERVICES.qiwa
  if (s.includes('absher')) return SERVICES.absher
  if (s.includes('nafath') || s.includes('nfath')) return SERVICES.nafath
  if (s.includes('muqeem') || s.includes('mqeem')) return SERVICES.muqeem
  if (s.includes('gosi') || s.includes('taminat')) return SERVICES.gosi
  if (s.includes('tawakkalna') || s.includes('twklna')) return SERVICES.tawakkalna
  if (s.includes('moi') || s.includes('dakhili')) return SERVICES.moi
  if (s.includes('mol') && !s.includes('qiwa')) return SERVICES.mol
  if (s.includes('rajhi')) return SERVICES.rajhi
  if (s.includes('ahli') || s.includes('snb')) return SERVICES.ahli
  if (s.includes('riyad')) return SERVICES.riyad
  if (s.includes('bilad')) return SERVICES.bilad
  if (s.includes('stc') && s.includes('pay')) return SERVICES.stcpay
  if (s.includes('inma') || s.includes('انماء') || s.includes('الإنماء') || s.includes('alinma')) return { ...SERVICES._default, name: 'بنك الإنماء', domain: 'ALINMA.COM', cat: 'bank', color: '#00695c', logo: (sz=40)=>`<svg width="${sz}" height="${sz}" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#00695c18"/><circle cx="20" cy="20" r="10" fill="none" stroke="#00695c" stroke-width="2"/><text x="20" y="25" text-anchor="middle" font-size="10" font-weight="900" fill="#00695c">INM</text></svg>` }
  if (s.includes('bank') || s.includes('pay') || s.includes('mada')) return { ...SERVICES._default, name: sender || 'بنك', domain: sender || '', cat: 'bank', color: '#e67e22' }
  if (s.includes('gov')) return { ...SERVICES._default, name: sender || 'حكومي', domain: sender || '', cat: 'gov', color: '#1abc9c' }
  return { ...SERVICES._default, name: sender || 'غير معروف', domain: sender || '' }
}

export default SERVICES
