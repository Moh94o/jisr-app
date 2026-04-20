// ═══ Service Detection & SVG Logos ═══
// Maps sender domains/keywords to service info with inline SVG logos.
// Avatar styles: solid (colored bg + white text), white (white bg + brand text),
// tinted (soft bg + brand text). All share gloss highlight + inner border polish.

const GLOSS = '<path d="M0 11 Q0 0 11 0 L29 0 Q40 0 40 11 L40 21 L0 21 Z" fill="#fff" opacity=".16"/>'
const BORDER_W = '<rect x=".5" y=".5" width="39" height="39" rx="10.5" fill="none" stroke="#fff" stroke-opacity=".24"/>'
const BORDER = (c, o='.3') => `<rect x=".5" y=".5" width="39" height="39" rx="10.5" fill="none" stroke="${c}" stroke-opacity="${o}"/>`
const AF = 'Cairo,Tajawal,sans-serif'

// Colored background + white text (government / strong brand)
const solid = (bg, ar, en, o={}) => (s=40) => {
  const { arY=19, enY=31, arSize=13, enSize=6.5, letter=0.8, extra='' } = o
  return `<svg width="${s}" height="${s}" viewBox="0 0 40 40"><rect width="40" height="40" rx="11" fill="${bg}"/>${GLOSS}${BORDER_W}${ar?`<text x="20" y="${arY}" text-anchor="middle" font-size="${arSize}" font-weight="900" fill="#fff" font-family="${AF}">${ar}</text>`:''}${en?`<text x="20" y="${enY}" text-anchor="middle" font-size="${enSize}" font-weight="800" fill="#fff" fill-opacity=".95" font-family="Arial" letter-spacing="${letter}">${en}</text>`:''}${extra}</svg>`
}

// White background + brand-color text (premium gov feel)
const white = (fg, ar, en, o={}) => (s=40) => {
  const { arY=19, enY=31, arSize=13, enSize=6.5, letter=0.8, extra='' } = o
  return `<svg width="${s}" height="${s}" viewBox="0 0 40 40"><rect width="40" height="40" rx="11" fill="#fff"/>${BORDER(fg,'.35')}${ar?`<text x="20" y="${arY}" text-anchor="middle" font-size="${arSize}" font-weight="900" fill="${fg}" font-family="${AF}">${ar}</text>`:''}${en?`<text x="20" y="${enY}" text-anchor="middle" font-size="${enSize}" font-weight="800" fill="${fg}" fill-opacity=".78" font-family="Arial" letter-spacing="${letter}">${en}</text>`:''}${extra}</svg>`
}

// Soft tinted background + brand-color text (subtle, secondary services)
const tinted = (fg, ar, en, o={}) => (s=40) => {
  const { arY=19, enY=31, arSize=13, enSize=6.5, letter=0.8, extra='' } = o
  return `<svg width="${s}" height="${s}" viewBox="0 0 40 40"><rect width="40" height="40" rx="11" fill="${fg}" fill-opacity=".14"/>${BORDER(fg,'.32')}${ar?`<text x="20" y="${arY}" text-anchor="middle" font-size="${arSize}" font-weight="900" fill="${fg}" font-family="${AF}">${ar}</text>`:''}${en?`<text x="20" y="${enY}" text-anchor="middle" font-size="${enSize}" font-weight="800" fill="${fg}" fill-opacity=".82" font-family="Arial" letter-spacing="${letter}">${en}</text>`:''}${extra}</svg>`
}

// Stripe decoration for bank logos (positioned between AR and EN text)
const stripe = (c='#fff', o='.85') => `<rect x="11" y="22" width="18" height="1.6" rx=".8" fill="${c}" fill-opacity="${o}"/>`

const SERVICES = {
  // ── Government ──
  qiwa:       { name: 'قوى', domain: 'QIWA.SA', cat: 'gov', color: '#2563EB', abbr: 'قوى',
                logo: white('#2563EB', 'قوى', 'QIWA', { arY: 30, enY: 14, arSize: 15, enSize: 7, letter: 1.4 }) },
  absher:     { name: 'أبشر', domain: 'ABSHER.SA', cat: 'gov', color: '#3B82F6', abbr: 'أبشر',
                logo: white('#3B82F6', 'أبشر', 'ABSHER', { arSize: 14, enSize: 5.5, letter: 1.2 }) },
  nafath:     { name: 'نفاذ', domain: 'NAFATH.SA', cat: 'gov', color: '#2EA39C', abbr: 'نفاذ',
                logo: solid('#2EA39C', 'نفاذ', 'NAFATH', { arSize: 13, enSize: 6.5, letter: 1 }) },
  moi:        { name: 'وزارة الداخلية', domain: 'MOI.GOV.SA', cat: 'gov', color: '#1a5c3a', abbr: 'داخلية',
                logo: white('#1a5c3a', 'داخلية', 'MOI', { arSize: 11, enSize: 5.5, letter: 1.3 }) },
  muqeem:     { name: 'مقيم', domain: 'MUQEEM.SA', cat: 'gov', color: '#F28C28', abbr: 'مقيم',
                logo: solid('#F28C28', 'مقيم', 'MUQEEM', { arSize: 13, enSize: 6, letter: 1 }) },
  gosi:       { name: 'التأمينات', domain: 'GOSI.GOV.SA', cat: 'gov', color: '#00796B', abbr: 'GOSI',
                logo: solid('#00796B', 'التأمينات', 'GOSI', { arY: 30, enY: 14, arSize: 9, enSize: 8, letter: 1.6 }) },
  tawakkalna: { name: 'توكلنا', domain: 'TAWAKKALNA.SA', cat: 'gov', color: '#00897B', abbr: 'توكلنا',
                logo: tinted('#00897B', 'توكلنا', null, { arY: 24, arSize: 11 }) },
  mol:        { name: 'وزارة العمل', domain: 'MOL.GOV.SA', cat: 'gov', color: '#2e7d32', abbr: 'العمل',
                logo: tinted('#2e7d32', 'العمل', null, { arY: 24, arSize: 12 }) },

  // ── Banks ── (filled with stripe accent)
  rajhi:  { name: 'الراجحي', domain: 'ALRAJHIBANK.COM', cat: 'bank', color: '#004D40', abbr: 'الراجحي',
            logo: solid('#004D40', 'الراجحي', 'RAJHI', { arY: 17, enY: 33, arSize: 8.5, enSize: 6.5, letter: 1.4, extra: stripe() }) },
  ahli:   { name: 'الأهلي', domain: 'SNB.COM', cat: 'bank', color: '#006A4E', abbr: 'SNB',
            logo: solid('#006A4E', 'الأهلي', 'SNB', { arY: 17, enY: 33, arSize: 9, enSize: 8, letter: 2, extra: stripe() }) },
  riyad:  { name: 'بنك الرياض', domain: 'RIYADBANK.COM', cat: 'bank', color: '#7B2D8E', abbr: 'الرياض',
            logo: solid('#7B2D8E', 'الرياض', 'RIYAD', { arY: 17, enY: 33, arSize: 9, enSize: 6.5, letter: 1.4, extra: stripe() }) },
  bilad:  { name: 'بنك البلاد', domain: 'BANKALBILAD.COM', cat: 'bank', color: '#B71C1C', abbr: 'البلاد',
            logo: solid('#B71C1C', 'البلاد', 'BILAD', { arY: 17, enY: 33, arSize: 9, enSize: 6.5, letter: 1.4, extra: stripe() }) },
  stcpay: { name: 'STC Pay', domain: 'STCPAY.COM', cat: 'bank', color: '#4A148C', abbr: 'STC',
            logo: solid('#4A148C', null, 'stc·pay', { enY: 24, enSize: 10, letter: 0.5 }) },

  // ── Default ──
  _default: { name: 'غير معروف', domain: '', cat: 'other', color: '#9b59b6',
    logo: (s=40)=>`<svg width="${s}" height="${s}" viewBox="0 0 40 40"><rect width="40" height="40" rx="11" fill="#9b59b6" fill-opacity=".14"/>${BORDER('#9b59b6','.32')}<circle cx="20" cy="16" r="4.5" fill="none" stroke="#9b59b6" stroke-width="1.6"/><path d="M12 30 C12 24.5 15 22.5 20 22.5 C25 22.5 28 24.5 28 30" fill="none" stroke="#9b59b6" stroke-width="1.6" stroke-linecap="round"/></svg>` }
}

// Extra inline service builders for long-tail detections
const mkGov = (fg, ar, en) => en
  ? tinted(fg, ar, en, { arY: 17, enY: 33, arSize: 9, enSize: 6.5, letter: 1.2 })
  : tinted(fg, ar, null, { arY: 24, arSize: 11 })

export function detectService(sender, body) {
  const s = (sender || '').toLowerCase()
  const b = (body || '').toLowerCase()
  // Body-based overrides for generic senders
  if (b.includes('بوابة مقيم') || b.includes('muqeem portal') || b.includes('مقيم.sa')) return SERVICES.muqeem
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
  if (s.includes('iam') || s.includes('nafath') || s.includes('nfath') || s.includes('نفاذ')) return SERVICES.nafath
  if (s.includes('jawazat') || s.includes('جوازات')) return { ...SERVICES._default, name: 'الجوازات', domain: 'MOI-JAWAZAT', cat: 'gov', color: '#1a5c3a', logo: tinted('#1a5c3a', 'الجوازات', null, { arY: 24, arSize: 10 }) }
  if (s.includes('moroor') || s.includes('مرور')) return { ...SERVICES._default, name: 'المرور', domain: 'MOI-MOROOR', cat: 'gov', color: '#2E7D32', logo: tinted('#2E7D32', 'المرور', null, { arY: 24, arSize: 12 }) }
  if (s.includes('moj') || s.includes('العدل')) return { ...SERVICES._default, name: 'وزارة العدل', domain: 'MOJ.GOV.SA', cat: 'gov', color: '#00695C', logo: tinted('#00695C', 'العدل', null, { arY: 24, arSize: 12 }) }
  if (s.includes('mc.gov') || s.includes('التجارة')) return { ...SERVICES._default, name: 'وزارة التجارة', domain: 'MC.GOV.SA', cat: 'gov', color: '#1B5E20', logo: tinted('#1B5E20', 'التجارة', null, { arY: 24, arSize: 11 }) }
  if (s.includes('sbc')) return { ...SERVICES._default, name: 'المركز السعودي للأعمال', domain: 'SBC.SA', cat: 'gov', color: '#1565C0', logo: tinted('#1565C0', 'المركز', 'SBC', { arY: 17, enY: 33, arSize: 10, enSize: 7, letter: 1.4 }) }
  if (s.includes('eastchamber') || s.includes('abhacci') || s.includes('الغرفة') || s.includes('chamber')) return { ...SERVICES._default, name: 'الغرفة التجارية', domain: 'CHAMBER', cat: 'gov', color: '#0D47A1', logo: tinted('#0D47A1', 'الغرفة', 'CHAMBER', { arY: 17, enY: 33, arSize: 10, enSize: 5.5, letter: 1.4 }) }
  if (s.includes('efaa') || s.includes('إيفاء')) return { ...SERVICES._default, name: 'إيفاء', domain: 'EFAA.SA', cat: 'gov', color: '#AD1457', logo: tinted('#AD1457', 'إيفاء', null, { arY: 24, arSize: 12 }) }
  if (s.includes('hrsd') || s.includes('ajeer') || s.includes('أجير')) return { ...SERVICES._default, name: 'أجير', domain: 'HRSD.GOV.SA', cat: 'gov', color: '#00838F', logo: tinted('#00838F', 'أجير', null, { arY: 24, arSize: 13 }) }
  if (s.includes('zatca') || s.includes('الزكاة')) return { ...SERVICES._default, name: 'هيئة الزكاة', domain: 'ZATCA.GOV.SA', cat: 'gov', color: '#4E342E', logo: tinted('#4E342E', 'الزكاة', null, { arY: 24, arSize: 11 }) }
  if (s.includes('mudad') || s.includes('مدد')) return { ...SERVICES._default, name: 'مدد', domain: 'MUDAD.SA', cat: 'gov', color: '#0D47A1', logo: tinted('#0D47A1', 'مدد', 'MUDAD', { arY: 17, enY: 33, arSize: 13, enSize: 6, letter: 1.4 }) }
  if (s.includes('monshaat') || s.includes('منشآت')) return { ...SERVICES._default, name: 'منشآت', domain: 'MONSHAAT.GOV.SA', cat: 'gov', color: '#00796B', logo: tinted('#00796B', 'منشآت', null, { arY: 24, arSize: 11 }) }
  if (s.includes('spl') || s.includes('البريد')) return { ...SERVICES._default, name: 'البريد السعودي', domain: 'SPL.SA', cat: 'other', color: '#1B5E20', logo: tinted('#1B5E20', 'البريد', 'SPL', { arY: 17, enY: 33, arSize: 10, enSize: 7, letter: 1.6 }) }
  if (s.includes('tameeni') || s.includes('تأميني')) return { ...SERVICES._default, name: 'تأميني', domain: 'TAMEENI.COM', cat: 'other', color: '#E65100', logo: tinted('#E65100', 'تأميني', null, { arY: 24, arSize: 11 }) }
  if (s.includes('tamm') || s.includes('تم')) return { ...SERVICES._default, name: 'تمّ', domain: 'TAMM.SA', cat: 'gov', color: '#00897B', logo: tinted('#00897B', 'تمّ', null, { arY: 25, arSize: 15 }) }
  if (s.includes('kahraba') || s.includes('كهرباء')) return { ...SERVICES._default, name: 'الكهرباء', domain: 'SE.COM.SA', cat: 'other', color: '#F57F17', logo: tinted('#F57F17', 'الكهرباء', null, { arY: 24, arSize: 10 }) }
  if (s.includes('civildef') || s.includes('الدفاع المدني')) return { ...SERVICES._default, name: 'الدفاع المدني', domain: 'CIVILDEF', cat: 'gov', color: '#BF360C', logo: tinted('#BF360C', 'الدفاع', 'CIVIL DEF', { arY: 17, enY: 33, arSize: 10, enSize: 5.5, letter: 1.2 }) }
  if (s.includes('aramex') || s.includes('أرامكس')) return { ...SERVICES._default, name: 'أرامكس', domain: 'ARAMEX.COM', cat: 'other', color: '#E53935', logo: tinted('#E53935', 'أرامكس', null, { arY: 24, arSize: 10 }) }
  if (s.includes('google') || s.includes('جوجل')) return { ...SERVICES._default, name: 'جوجل', domain: 'GOOGLE.COM', cat: 'other', color: '#4285F4', logo: (s=40)=>`<svg width="${s}" height="${s}" viewBox="0 0 40 40"><rect width="40" height="40" rx="11" fill="#fff"/>${BORDER('#4285F4','.35')}<text x="20" y="27" text-anchor="middle" font-size="18" font-weight="900" fill="#4285F4" font-family="Arial">G</text></svg>` }
  if (s.includes('momah') || s.includes('الإسكان')) return { ...SERVICES._default, name: 'وزارة الإسكان', domain: 'MOMAH.GOV.SA', cat: 'gov', color: '#5D4037', logo: tinted('#5D4037', 'الإسكان', null, { arY: 24, arSize: 10 }) }
  if (s.includes('freelance') || s.includes('العمل الحر')) return { ...SERVICES._default, name: 'العمل الحر', domain: 'FREELANCE.SA', cat: 'gov', color: '#00ACC1', logo: tinted('#00ACC1', 'العمل الحر', null, { arY: 24, arSize: 9 }) }
  if (s.includes('worldofss')) return { ...SERVICES._default, name: 'خدمات حكومية', domain: 'WORLDOFSS', cat: 'gov', color: '#37474F', logo: tinted('#37474F', 'خدمات', null, { arY: 24, arSize: 11 }) }
  if (s.includes('sdb')) return { ...SERVICES._default, name: 'بنك التنمية', domain: 'SDB.GOV.SA', cat: 'bank', color: '#1A237E', logo: solid('#1A237E', 'التنمية', 'SDB', { arY: 17, enY: 33, arSize: 9, enSize: 7.5, letter: 1.6, extra: stripe() }) }
  if (s.includes('mobily') || s.includes('موبايلي')) return { ...SERVICES._default, name: 'موبايلي', domain: 'MOBILY.COM', cat: 'other', color: '#6A1B9A', logo: tinted('#6A1B9A', 'موبايلي', 'MOBILY', { arY: 17, enY: 33, arSize: 9, enSize: 6, letter: 1.2 }) }
  if (s.includes('stc') && !s.includes('pay')) return { ...SERVICES._default, name: 'STC', domain: 'STC.COM', cat: 'other', color: '#4A148C', logo: solid('#4A148C', null, 'stc', { enY: 26, enSize: 15, letter: 0.5 }) }
  if (s.includes('zain') || s.includes('زين')) return { ...SERVICES._default, name: 'زين', domain: 'ZAIN.COM', cat: 'other', color: '#7B1FA2', logo: solid('#7B1FA2', 'زين', 'ZAIN', { arSize: 14, enSize: 6, letter: 1.4 }) }
  if (s.includes('inma') || s.includes('انماء') || s.includes('الإنماء') || s.includes('alinma')) return { ...SERVICES._default, name: 'بنك الإنماء', domain: 'ALINMA.COM', cat: 'bank', color: '#00695c', logo: solid('#00695c', 'الإنماء', 'INMA', { arY: 17, enY: 33, arSize: 9, enSize: 7, letter: 1.6, extra: stripe() }) }
  if (s.includes('bank') || s.includes('pay') || s.includes('mada')) return { ...SERVICES._default, name: sender || 'بنك', domain: sender || '', cat: 'bank', color: '#e67e22' }
  if (s.includes('gov')) return { ...SERVICES._default, name: sender || 'حكومي', domain: sender || '', cat: 'gov', color: '#1abc9c' }
  return { ...SERVICES._default, name: sender || 'غير معروف', domain: sender || '' }
}

export default SERVICES
