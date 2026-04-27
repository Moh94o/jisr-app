// Normalize a Saudi mobile to canonical +9665XXXXXXXX form, or null if invalid.
// Accepts: "+9665XXXXXXXX", "9665XXXXXXXX", "05XXXXXXXX", "5XXXXXXXX",
// and tolerates spaces/dashes/parentheses.
export function normalizeSaudiMobile(input) {
  if (!input) return null
  const digits = String(input).replace(/\D/g, '')
  if (digits.startsWith('966') && digits.length === 12 && digits[3] === '5') return '+' + digits
  if (digits.startsWith('05') && digits.length === 10) return '+966' + digits.substring(1)
  if (digits.startsWith('5') && digits.length === 9) return '+966' + digits
  return null
}

export function validateSaudiMobile(input) {
  const normalized = normalizeSaudiMobile(input)
  return Boolean(normalized) && /^\+9665[0-9]{8}$/.test(normalized)
}

// "+9665XXXXXXXX" → "+966 5•• ••• •XXXX"
export function maskSaudiPhone(phone) {
  if (!phone || !phone.startsWith('+966')) return phone || ''
  const last4 = phone.slice(-4)
  return `+966 5•• ••• •${last4}`
}
