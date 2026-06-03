// admin-set-email — GM-only: change another staff member's login email.
// Updates the Supabase Auth email (so the user can sign in with it) and mirrors
// it into users.email. Without this, editing users.email alone would leave the
// auth email — which signInWithPassword checks — out of sync.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { serviceClient, userClient } from '../_shared/supabase.ts'
import { ok, err, preflight } from '../_shared/cors.ts'

serve(async (req) => {
  const pf = preflight(req); if (pf) return pf
  if (req.method !== 'POST') return err('method_not_allowed', 'POST only', 405)

  const u = userClient(req)
  const { data: who } = await u.auth.getUser()
  if (!who?.user) return err('unauthenticated', 'يجب تسجيل الدخول', 401)

  const sb = serviceClient()
  const { data: caller } = await sb.from('users')
    .select('id, is_active, role:roles!users_role_id_fkey(name_ar,name_en)')
    .eq('auth_user_id', who.user.id).is('deleted_at', null).maybeSingle()
  const role: any = caller?.role
  const isGM = !!caller?.is_active && (role?.name_ar === 'المدير العام' || role?.name_en === 'General Manager')
  if (!isGM) return err('forbidden', 'هذه الصلاحية للمدير العام فقط', 403)

  const body = await req.json().catch(() => ({}))
  const userId = String(body.user_id ?? '')
  const email = String(body.email ?? '').toLowerCase().trim()
  if (!userId) return err('bad_user', 'user_id مطلوب')
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err('bad_email', 'البريد الإلكتروني غير صحيح')

  const { data: target } = await sb.from('users').select('auth_user_id').eq('id', userId).is('deleted_at', null).maybeSingle()
  if (!target?.auth_user_id) return err('not_found', 'المستخدم غير موجود')

  // Reject if another account already uses this email.
  const { data: dup } = await sb.from('users').select('id').eq('email', email).neq('id', userId).limit(1)
  if (dup?.length) return err('dup_email', 'البريد الإلكتروني مسجّل مسبقاً')

  // Update the auth email already-confirmed → no verification email is sent.
  const { error } = await sb.auth.admin.updateUserById(target.auth_user_id, { email, email_confirm: true })
  if (error) return err('update_failed', error.message)
  // Mirror into the profile row.
  await sb.from('users').update({ email }).eq('id', userId)
  return ok({ user_id: userId, email })
})
