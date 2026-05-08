// portal-otp-verify — validates the OTP and returns Supabase auth tokens.
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

function constantTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

serve(async (req) => {
  const pf = preflight(req); if (pf) return pf
  if (req.method !== 'POST') return err('method_not_allowed', 'POST only', 405)

  const body = await req.json().catch(() => ({}))
  const phone = normalizeSAPhone(body.phone || '')
  const code = String(body.code ?? '')
  if (!phone) return err('bad_phone', 'رقم الجوال غير صحيح')
  if (!/^\d{6}$/.test(code)) return err('bad_code', 'الرمز يجب أن يكون 6 أرقام')

  const sb = serviceClient()
  // pull most recent un-consumed otp
  const { data: otp } = await sb.from('client_portal_otp_codes')
    .select('*')
    .eq('phone', phone)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!otp) return err('no_code', 'لا يوجد رمز نشط لهذا الرقم — اطلب رمزاً جديداً')
  if (new Date(otp.expires_at) < new Date()) return err('expired', 'انتهت صلاحية الرمز — اطلب رمزاً جديداً')
  if (otp.attempts >= otp.max_attempts) return err('locked', 'تم تجاوز عدد المحاولات — اطلب رمزاً جديداً')

  const expectedHash = await sha256Hex(code + ':' + phone)
  if (!constantTimeEq(expectedHash, otp.code_hash)) {
    await sb.from('client_portal_otp_codes').update({ attempts: otp.attempts + 1 }).eq('id', otp.id)
    return err('wrong_code', 'الرمز غير صحيح')
  }

  // mark consumed
  await sb.from('client_portal_otp_codes').update({ consumed_at: new Date().toISOString() }).eq('id', otp.id)

  // resolve / create auth user for this phone
  const { data: cpu } = await sb.from('client_portal_users').select('*').eq('phone', phone).eq('is_active', true).maybeSingle()
  if (!cpu) return err('not_found', 'لا يوجد حساب مسجل لهذا الرقم')

  // Lookup auth user by user_id; if missing, generate a new auth user using a synthetic email.
  let authUserId = cpu.user_id as string | null
  let email = cpu.email as string | null

  if (!authUserId) {
    if (!email) email = `portal_${phone.replace('+','')}@portal.jisr.app`
    const { data: created, error: ce } = await sb.auth.admin.createUser({
      email,
      phone: phone,
      email_confirm: true,
      user_metadata: { portal: true, client_id: cpu.client_id, full_name_ar: cpu.full_name_ar },
    })
    if (ce) return err('auth_create_failed', ce.message, 500)
    authUserId = created.user!.id
    await sb.from('client_portal_users').update({ user_id: authUserId, email, accepted_at: new Date().toISOString() }).eq('id', cpu.id)
  }

  // Issue a magic link token (best available admin path) and exchange to a real session.
  const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
    type: 'magiclink', email: email!,
  })
  if (linkErr) return err('link_failed', linkErr.message, 500)
  const hashed = (linkData?.properties as any)?.hashed_token
  if (!hashed) return err('link_missing_token', 'magic link token missing')
  const { data: sessionData, error: vErr } = await sb.auth.verifyOtp({
    type: 'magiclink', token_hash: hashed,
  })
  if (vErr || !sessionData?.session) return err('verify_failed', vErr?.message ?? 'no session', 500)

  // bookkeeping
  await sb.from('client_portal_users').update({ last_login_at: new Date().toISOString() }).eq('id', cpu.id)

  return ok({
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
    expires_at: sessionData.session.expires_at,
    portal_user: { id: cpu.id, full_name_ar: cpu.full_name_ar, client_id: cpu.client_id },
  })
})
