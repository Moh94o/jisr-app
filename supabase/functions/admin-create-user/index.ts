// admin-create-user — GM-only: create a staff account from inside the app.
// No signup/confirmation email is sent (email_confirm:true). The account is
// created inactive (is_active=false) and is activated later from the Users page.
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

  // Caller must be an active General Manager — account creation is GM-only.
  const { data: caller } = await sb.from('users')
    .select('id, is_active, role:roles!users_role_id_fkey(name_ar,name_en)')
    .eq('auth_user_id', who.user.id).is('deleted_at', null).maybeSingle()
  const role: any = caller?.role
  const isGM = !!caller?.is_active && (role?.name_ar === 'المدير العام' || role?.name_en === 'General Manager')
  if (!isGM) return err('forbidden', 'هذه الصلاحية للمدير العام فقط', 403)

  const body = await req.json().catch(() => ({}))
  const email = String(body.email ?? '').toLowerCase().trim()
  const password = String(body.password ?? '')
  const nameAr = String(body.name_ar ?? '').trim()
  const nameEn = String(body.name_en ?? '').trim()
  const idNumber = String(body.id_number ?? '').replace(/\D/g, '')
  const phone = normalizeSAPhone(body.personal_phone ?? '')
  const idTypeCode = body.id_type_code === 'national_id' ? 'national_id' : 'iqama'
  const nationalityId = body.nationality_id || null
  const roleId = body.role_id || null
  const branchIds: string[] = Array.isArray(body.branch_ids) ? body.branch_ids.filter(Boolean) : []
  const branchId = body.branch_id || branchIds[0] || null

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err('bad_email', 'البريد الإلكتروني غير صحيح')
  if (password.length < 6) return err('bad_password', 'كلمة المرور 6 أحرف على الأقل')
  if (!nameAr) return err('bad_name', 'الاسم بالعربي مطلوب')
  if (!/^\d{10}$/.test(idNumber)) return err('bad_id', 'رقم الهوية يجب أن يكون 10 أرقام')
  if (!nationalityId) return err('bad_nat', 'الجنسية مطلوبة')
  if (!phone) return err('bad_phone', 'رقم الجوال غير صحيح')

  // Pre-flight uniqueness so we never create an orphan auth user.
  const [{ data: dupId }, { data: dupEmail }, { data: dupPhone }] = await Promise.all([
    sb.from('persons').select('id').eq('id_number', idNumber).is('deleted_at', null).limit(1),
    sb.from('users').select('id').eq('email', email).is('deleted_at', null).limit(1),
    sb.from('users').select('id').eq('personal_phone', phone).is('deleted_at', null).limit(1),
  ])
  if (dupId?.length) return err('dup_id', 'رقم الهوية مسجل مسبقاً')
  if (dupEmail?.length) return err('dup_email', 'البريد الإلكتروني مسجّل مسبقاً')
  if (dupPhone?.length) return err('dup_phone', 'رقم الجوال مسجّل مسبقاً')

  // Create the auth user already-confirmed → Supabase sends no email.
  const { data: created, error: ce } = await sb.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (ce || !created?.user) return err('auth_failed', ce?.message || 'تعذّر إنشاء حساب المصادقة')

  // persons + users rows (register_new_user sets is_active=false → pending activation).
  const { error: rpcErr } = await sb.rpc('register_new_user', {
    p_auth_user_id: created.user.id,
    p_name_ar: nameAr, p_name_en: nameEn || null,
    p_id_number: idNumber, p_id_type_code: idTypeCode,
    p_nationality_id: nationalityId, p_personal_phone: phone,
    p_email: email, p_branch_id: branchId,
  })
  if (rpcErr) {
    await sb.auth.admin.deleteUser(created.user.id).catch(() => {})
    return err('profile_failed', rpcErr.message)
  }

  // Apply GM choices: role (register_new_user defaults to Employee) + the full office set.
  // Keep a plaintext copy of the password so the GM can view it on the detail page.
  const patch: Record<string, unknown> = { plain_password: password }
  if (roleId) patch.role_id = roleId
  patch.branch_ids = branchIds.length ? branchIds : (branchId ? [branchId] : [])
  await sb.from('users').update(patch).eq('auth_user_id', created.user.id)

  return ok({ auth_user_id: created.user.id })
})
