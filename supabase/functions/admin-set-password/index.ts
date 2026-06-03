// admin-set-password — GM-only: set/reset another staff member's password.
// Updates the hashed auth password and keeps a plaintext copy in
// users.plain_password so the GM detail page can display the current password.
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
  const password = String(body.password ?? '')
  if (!userId) return err('bad_user', 'user_id مطلوب')
  if (password.length < 6) return err('bad_password', 'كلمة المرور 6 أحرف على الأقل')

  const { data: target } = await sb.from('users').select('auth_user_id').eq('id', userId).is('deleted_at', null).maybeSingle()
  if (!target?.auth_user_id) return err('not_found', 'المستخدم غير موجود')

  const { error } = await sb.auth.admin.updateUserById(target.auth_user_id, { password })
  if (error) return err('update_failed', error.message)
  // Mirror the new password into the GM-visible plaintext column.
  await sb.from('users').update({ plain_password: password }).eq('id', userId)
  return ok({ user_id: userId })
})
