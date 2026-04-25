// Maps raw `phone_from` values (gateway IDs, shortcodes) to Arabic labels,
// a coarse category, a tone name matching the global palette, and a Lucide
// icon name resolved at render time. Unknown senders fall through to a
// neutral "other" entry.
import {
  Shield, Landmark, Banknote, Briefcase, Building2, Globe, Mail, MessageSquare,
  Truck, Car, FileText, Stethoscope,
} from 'lucide-react'

const M = {
  // Gov / security
  'MOI.GOV.SA':   { label: 'وزارة الداخلية', cat: 'gov', tone: 'info', Icon: Shield },
  'MOI-Jawazat':  { label: 'الجوازات',       cat: 'gov', tone: 'info', Icon: Shield },
  'Absher':       { label: 'أبشر',            cat: 'gov', tone: 'info', Icon: Shield },
  'CivilDef':     { label: 'الدفاع المدني',   cat: 'gov', tone: 'info', Icon: Shield },
  'NAFATH':       { label: 'نفاذ',            cat: 'gov', tone: 'info', Icon: Shield },
  // Labor / social insurance
  'Qiwa':         { label: 'قوى',             cat: 'service', tone: 'success', Icon: Briefcase },
  'GOSI':         { label: 'التأمينات',       cat: 'service', tone: 'success', Icon: Landmark },
  'AJEER-HRSD':   { label: 'أجير',            cat: 'service', tone: 'success', Icon: Briefcase },
  'Muqawil':      { label: 'مقاول',           cat: 'service', tone: 'success', Icon: Briefcase },
  'Muqeem':       { label: 'مقيم',            cat: 'service', tone: 'success', Icon: Briefcase },
  'MUQEEM':       { label: 'مقيم',            cat: 'service', tone: 'success', Icon: Briefcase },
  'ZATCA':        { label: 'الزكاة والضريبة', cat: 'service', tone: 'success', Icon: Landmark },
  // Banks / fintech
  'AlRajhiBank':  { label: 'الراجحي',         cat: 'bank', tone: 'gold', Icon: Banknote },
  'SNB-AlAhli':   { label: 'الأهلي',          cat: 'bank', tone: 'gold', Icon: Banknote },
  'urpay':        { label: 'يو باي',          cat: 'bank', tone: 'gold', Icon: Banknote },
  // Insurance / logistics / misc
  'ACIG':         { label: 'أسيج للتأمين',    cat: 'other', tone: 'gold', Icon: Stethoscope },
  'SBC':          { label: 'سابك',            cat: 'other', tone: 'neutral', Icon: Building2 },
  'SPL':          { label: 'البريد السعودي',  cat: 'other', tone: 'neutral', Icon: Truck },
  'Worldofss':    { label: 'خدمات عالمية',    cat: 'other', tone: 'neutral', Icon: Globe },
}

export const SMS_CATEGORIES = [
  { key: 'all',     label: 'الكل' },
  { key: 'gov',     label: 'حكومية' },
  { key: 'service', label: 'خدمات' },
  { key: 'bank',    label: 'بنوك' },
  { key: 'other',   label: 'أخرى' },
]

// Legacy short keys used by otp_persons.default_senders / disabled_senders.
// Maps to 1+ phone_from values so the allowed/denied status transfers cleanly
// from the account config onto actual incoming messages.
export const LEGACY_SENDER_KEYS = {
  moi:     ['MOI.GOV.SA', 'MOI-Jawazat', 'Absher', 'CivilDef'],
  qiwa:    ['Qiwa'],
  nafath:  ['NAFATH'],
  gosi:    ['GOSI'],
  muqeem:  ['Muqeem', 'MUQEEM'],
  banks:   ['AlRajhiBank', 'SNB-AlAhli', 'urpay'],
  chamber: [],
  other:   [],
}

export function resolveSender(phoneFrom) {
  if (!phoneFrom) return { label: '—', cat: 'other', tone: 'neutral', Icon: MessageSquare }
  const hit = M[phoneFrom]
  if (hit) return hit
  // Phone numbers (starts with + or digits) → unknown shortcode
  if (/^[+\d]/.test(phoneFrom)) {
    return { label: phoneFrom, cat: 'other', tone: 'neutral', Icon: Mail }
  }
  return { label: phoneFrom, cat: 'other', tone: 'neutral', Icon: MessageSquare }
}

// Decides whether a given phone_from is within the allowed/denied sets from
// otp_persons. Treats `allowed` as an allow-list only when it's non-empty.
export function senderAllowedState(phoneFrom, { allowed = [], disabled = [] } = {}) {
  const reverse = Object.entries(LEGACY_SENDER_KEYS)
    .flatMap(([k, arr]) => arr.map(v => [v, k]))
  const legacyKey = Object.fromEntries(reverse)[phoneFrom]
  const inAllowed = allowed?.length
    ? allowed.includes(legacyKey) || allowed.includes('other')
    : true
  const inDisabled = disabled?.includes(legacyKey)
  if (inDisabled) return 'denied'
  if (inAllowed) return 'allowed'
  return 'not_listed'
}
