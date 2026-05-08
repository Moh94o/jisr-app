// portal-otp-request — generate OTP, send via WhatsApp, store hashed code.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { serviceClient } from '../_shared/supabase.ts'
import { ok, err, preflight } from '../_shared/cors.ts'

function normalizeSAPhone(input: string): string | null {
  let p = String(input ?? '').replace(/[\s\-()]/g, '')
  if (p.startsWith('+966')) p = p.slice(4)
  else if (p.startsWith('966')) p = p.slice(3)
  else if (p.startsWith('0')) p = p.slice(1)
  if (!/^\d{9}$/.test(p)) return null
  return '+966' + p
}

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
}

serve(async (req) => {
  const pf = preflight(req); if (pf) return pf
  if (req.method !== 'POST') return err('method_not_allowed', 'POST only', 405)

  const body = await req.json().catch(() => ({}))
  const phone = normalizeSAPhone(body.phone || '')
  if (!phone) return err('bad_phone', 'رقم الجوال غير صحيح')

  const sb = serviceClient()

  // Rate limit: max 5 codes per 15 minutes per phone
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const { data: recent } = await sb.from('client_portal_otp_codes').select('id').eq('phone', phone).gt('created_at', cutoff)
  if ((recent?.length ?? 0) >= 5) return err('rate_limit', 'محاولات كثيرة — انتظر قليلاً', 429)

  // Always answer success (don't reveal whether the phone is registered)
  const { data: portalUser } = await sb.from('client_portal_users').select('id, full_name_ar').eq('phone', phone).eq('is_active', true).maybeSingle()
  if (!portalUser) return ok({ sent: true })   // generic success — no info leak

  // 6-digit code
  const code = String(Math.floor(100000 + Math.random() * 900000))
  const codeHash = await sha256Hex(code + ':' + phone)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

  await sb.from('client_portal_otp_codes').insert({
    phone, code_hash: codeHash, expires_at: expiresAt,
    ip_address: req.headers.get('x-forwarded-for') ?? null,
    user_agent: req.headers.get('user-agent') ?? null,
  })

  // Send via WhatsApp template
  try {
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
      body: JSON.stringify({
        to_phone: phone,
        template_name: 'otp_login_v1',
        language: 'ar',
        variables: { '1': code },
        reference_type: 'portal_otp',
      }),
    })
  } catch (e) {
    console.error('whatsapp-send failed', e)
  }

  return ok({ sent: true })
})
