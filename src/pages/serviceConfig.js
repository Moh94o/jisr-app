// ═══ Service Detection & SVG Logos ═══
// Maps sender domains/keywords to service info with inline SVG logos

const SERVICES = {
  // Government
  qiwa: { name: 'منصة قوى', domain: 'MOL.GOV.SA', cat: 'gov', color: '#00a651',
    logo: (s=40)=>`<svg width="${s}" height="${s}" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#00a65118"/><text x="20" y="26" text-anchor="middle" font-size="22" font-weight="900" fill="#00a651" font-family="Arial">Q</text></svg>` },
  absher: { name: 'أبشر', domain: 'MOI.GOV.SA', cat: 'gov', color: '#1a6b3c',
    logo: (s=40)=>`<svg width="${s}" height="${s}" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#1a6b3c18"/><path d="M20 8 L28 14 V24 C28 29 20 33 20 33 C20 33 12 29 12 24 V14 Z" fill="none" stroke="#1a6b3c" stroke-width="2"/><path d="M16 20 L19 23 L25 17" fill="none" stroke="#1a6b3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>` },
  nafath: { name: 'نفاذ', domain: 'IAM.GOV.SA', cat: 'gov', color: '#2d6b4f',
    logo: (s=40)=>`<svg width="${s}" height="${s}" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#2d6b4f18"/><circle cx="20" cy="20" r="8" fill="none" stroke="#2d6b4f" stroke-width="2"/><path d="M20 12 A8 8 0 0 1 28 20" fill="none" stroke="#2d6b4f" stroke-width="3" stroke-linecap="round"/><circle cx="20" cy="20" r="3" fill="#2d6b4f"/></svg>` },
  moi: { name: 'وزارة الداخلية', domain: 'MOI.GOV.SA', cat: 'gov', color: '#1a5c3a',
    logo: (s=40)=>`<svg width="${s}" height="${s}" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#1a5c3a18"/><path d="M20 6 L30 13 V22 C30 28 20 34 20 34 C20 34 10 28 10 22 V13 Z" fill="none" stroke="#1a5c3a" stroke-width="2"/><path d="M20 14 V22 M16 18 H24" stroke="#1a5c3a" stroke-width="2" stroke-linecap="round"/></svg>` },
  muqeem: { name: 'مقيم', domain: 'MOI.GOV.SA', cat: 'gov', color: '#0d7c4a',
    logo: (s=40)=>`<svg width="${s}" height="${s}" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#0d7c4a18"/><circle cx="20" cy="15" r="5" fill="none" stroke="#0d7c4a" stroke-width="2"/><path d="M12 30 C12 24 16 21 20 21 C24 21 28 24 28 30" fill="none" stroke="#0d7c4a" stroke-width="2" stroke-linecap="round"/></svg>` },
  gosi: { name: 'التأمينات', domain: 'GOSI.GOV.SA', cat: 'gov', color: '#0e6e45',
    logo: (s=40)=>`<svg width="${s}" height="${s}" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#0e6e4518"/><rect x="12" y="18" width="16" height="14" rx="2" fill="none" stroke="#0e6e45" stroke-width="2"/><path d="M14 18 V14 A6 6 0 0 1 26 14 V18" fill="none" stroke="#0e6e45" stroke-width="2"/><circle cx="20" cy="25" r="2" fill="#0e6e45"/></svg>` },
  tawakkalna: { name: 'توكلنا', domain: 'SDAIA.GOV.SA', cat: 'gov', color: '#00695c',
    logo: (s=40)=>`<svg width="${s}" height="${s}" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#00695c18"/><path d="M20 10 L26 16 L20 22 L14 16 Z" fill="none" stroke="#00695c" stroke-width="2"/><path d="M20 22 V30 M16 26 H24" stroke="#00695c" stroke-width="2" stroke-linecap="round"/></svg>` },
  mol: { name: 'وزارة العمل', domain: 'MOL.GOV.SA', cat: 'gov', color: '#2e7d32',
    logo: (s=40)=>`<svg width="${s}" height="${s}" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#2e7d3218"/><rect x="11" y="16" width="18" height="16" rx="2" fill="none" stroke="#2e7d32" stroke-width="2"/><path d="M15 16 V12 A5 5 0 0 1 25 12 V16" fill="none" stroke="#2e7d32" stroke-width="2"/><line x1="20" y1="22" x2="20" y2="26" stroke="#2e7d32" stroke-width="2" stroke-linecap="round"/></svg>` },

  // Banks
  rajhi: { name: 'الراجحي', domain: 'ALRAJHIBANK.COM', cat: 'bank', color: '#006b3f',
    logo: (s=40)=>`<svg width="${s}" height="${s}" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#006b3f18"/><rect x="10" y="22" width="20" height="3" rx="1" fill="#006b3f"/><rect x="13" y="14" width="3" height="8" rx="1" fill="#006b3f"/><rect x="19" y="14" width="3" height="8" rx="1" fill="#006b3f"/><rect x="25" y="14" width="3" height="8" rx="1" fill="#006b3f"/><path d="M10 12 L20 7 L30 12" fill="none" stroke="#006b3f" stroke-width="2"/><rect x="10" y="27" width="20" height="3" rx="1" fill="#006b3f" opacity=".5"/></svg>` },
  ahli: { name: 'الأهلي', domain: 'SNB.COM', cat: 'bank', color: '#00693e',
    logo: (s=40)=>`<svg width="${s}" height="${s}" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#00693e18"/><circle cx="20" cy="20" r="10" fill="none" stroke="#00693e" stroke-width="2"/><text x="20" y="25" text-anchor="middle" font-size="12" font-weight="900" fill="#00693e">SNB</text></svg>` },
  riyad: { name: 'بنك الرياض', domain: 'RIYADBANK.COM', cat: 'bank', color: '#6a1b9a',
    logo: (s=40)=>`<svg width="${s}" height="${s}" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#6a1b9a18"/><circle cx="20" cy="20" r="10" fill="none" stroke="#6a1b9a" stroke-width="2"/><text x="20" y="25" text-anchor="middle" font-size="11" font-weight="800" fill="#6a1b9a">RB</text></svg>` },
  bilad: { name: 'بنك البلاد', domain: 'BANKALBILAD.COM', cat: 'bank', color: '#c62828',
    logo: (s=40)=>`<svg width="${s}" height="${s}" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#c6282818"/><circle cx="20" cy="20" r="10" fill="none" stroke="#c62828" stroke-width="2"/><text x="20" y="25" text-anchor="middle" font-size="11" font-weight="800" fill="#c62828">BB</text></svg>` },
  stcpay: { name: 'STC Pay', domain: 'STC.COM', cat: 'bank', color: '#6a1b9a',
    logo: (s=40)=>`<svg width="${s}" height="${s}" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#6a1b9a18"/><text x="20" y="24" text-anchor="middle" font-size="10" font-weight="900" fill="#6a1b9a">STC</text><text x="20" y="33" text-anchor="middle" font-size="8" fill="#6a1b9a" opacity=".6">PAY</text></svg>` },

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
  if (s.includes('bank') || s.includes('pay') || s.includes('mada')) return { ...SERVICES._default, name: sender || 'بنك', domain: sender || '', cat: 'bank', color: '#e67e22' }
  if (s.includes('gov')) return { ...SERVICES._default, name: sender || 'حكومي', domain: sender || '', cat: 'gov', color: '#1abc9c' }
  return { ...SERVICES._default, name: sender || 'غير معروف', domain: sender || '' }
}

export default SERVICES
