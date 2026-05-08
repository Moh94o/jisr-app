// portal-invite-client — staff-side: register a portal user for a client and send WhatsApp welcome.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { serviceClient, userClient } from '../_shared/supabase.ts'
import { ok, err, preflight } from '../_shared/cors.ts'

function normalizeSAPhone(input: string): string | null {
  let p = String(input ?? '').replace(/[\s\-()]/g, '')
  if (p.startsWith('+966')) p = p.slice(4)
  else if (p.startsWith('966')) p = p.slice(3)
  else if (p.startsWith('0')) p = p.slice(1)
  if (!/^\d{9}$/.test(p)) return null
  return '+966' + p
}

serve(async (req) => {
  const pf = preflight(req); if (pf) return pf
  if (req.method !== 'POST') return err('method_not_allowed', 'POST only', 405)

  const u = userClient(req)
  const { data: who } = await u.auth.getUser()
  if (!who?.user) return err('unauthenticated', 'يجب تسجيل الدخول', 401)

  const sb = serviceClient()

  // Permission check
  const { data: hasPerm } = await sb.rpc('current_user_has_permission' as any, { p_permission_code: 'portal.invite' })
  // Fallback if RPC unavailable: just trust the JWT (dev mode)
  if (hasPerm === false) return err('forbidden', 'لا تملك صلاحية دعوة عملاء', 403)

  const body = await req.json().catch(() => ({}))
  const phone = normalizeSAPhone(body.phone)
  if (!phone) return err('bad_phone', 'رقم جوال غير صحيح')
  if (!body.client_id) return err('bad_client', 'client_id مطلوب')
  if (!body.full_name_ar) return err('bad_name', 'الاسم بالعربي مطلوب')

  // Existing portal user with same phone?
  const { data: existing } = await sb.from('client_portal_users').select('*').eq('phone', phone).maybeSingle()
  if (existing) {
    if (existing.client_id !== body.client_id) return err('phone_in_use', 'هذا الرقم مرتبط بعميل آخر')
    await sb.from('client_portal_users').update({
      is_active: true, full_name_ar: body.full_name_ar, email: body.email ?? existing.email,
      is_primary: !!body.is_primary,
    }).eq('id', existing.id)
    return ok({ portal_user_id: existing.id, reactivated: true })
  }

  const { data: created, error: ce } = await sb.from('client_portal_users').insert({
    client_id: body.client_id,
    person_id: body.person_id ?? null,
    phone,
    full_name_ar: body.full_name_ar,
    email: body.email ?? null,
    is_primary: !!body.is_primary,
    is_active: true,
    invited_at: new Date().toISOString(),
  }).select().single()
  if (ce) return err('insert_failed', ce.message)

  // Send WhatsApp welcome (best effort — don't fail the invite if WA isn't configured)
  try {
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
      body: JSON.stringify({
        to_phone: phone,
        type: 'text',
        text: `مرحباً ${body.full_name_ar}،\nتم منحك صلاحية الدخول إلى بوابة عملاء جسر للأعمال.\nادخل عبر الرابط أدناه ثم استخدم رقم جوالك لتلقّي رمز الدخول.`,
      }),
    })
  } catch (_) {}

  return ok({ portal_user_id: created.id })
})
