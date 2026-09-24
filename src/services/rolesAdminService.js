import { getSupabase } from '../lib/supabase.js'

// ════════════════════════════════════════════════════════════════════════
// rolesAdminService — manage the ROLE catalog and each role's permission set.
// A role is a named bundle of module.action capabilities (rows in
// role_permissions). Users are assigned one or more roles (user_roles); the
// app reads the union via v_user_effective_permissions. This service powers the
// «الأدوار والصلاحيات» admin page (RolesAdminPage).
// ════════════════════════════════════════════════════════════════════════

// All active roles with their permission-count and assigned-user-count, so the
// list cards can show "12 صلاحية · 3 مستخدمين" without N extra queries.
export async function listRolesWithStats() {
  const sb = getSupabase()
  const [rRes, rpRes, urRes] = await Promise.all([
    sb.from('roles').select('id,name_ar,name_en,color,description,is_active,is_system,ui_visibility').order('is_system', { ascending: false }).order('name_ar'),
    sb.from('role_permissions').select('role_id'),
    sb.from('user_roles').select('role_id'),
  ])
  const permCount = {}; (rpRes.data || []).forEach(r => { permCount[r.role_id] = (permCount[r.role_id] || 0) + 1 })
  const userCount = {}; (urRes.data || []).forEach(r => { userCount[r.role_id] = (userCount[r.role_id] || 0) + 1 })
  return (rRes.data || []).map(r => ({
    ...r,
    perm_count: permCount[r.id] || 0,
    user_count: userCount[r.id] || 0,
  }))
}

// The full permission catalog (DB is authoritative — role_permissions stores
// these ids), grouped by module and sorted for the editor grid.
export async function listPermissionCatalog() {
  const sb = getSupabase()
  const { data, error } = await sb.from('permissions')
    .select('id,module,action,label_ar,label_en,module_label_ar,module_icon,module_sort,sort_order')
    .eq('is_active', true)
    .order('module_sort').order('sort_order')
  if (error) throw error
  const groups = {}
  ;(data || []).forEach(p => {
    if (!groups[p.module]) groups[p.module] = { module: p.module, label_ar: p.module_label_ar, icon: p.module_icon, sort: p.module_sort, perms: [] }
    groups[p.module].perms.push(p)
  })
  return Object.values(groups).sort((a, b) => a.sort - b.sort)
}

// المستخدمون الذين يحملون هذا الدور — عبر user_roles **أو** الدور الأساسي
// (users.role_id)، فالنظام يستعمل الاثنين. الاسم من جدول الأشخاص الموحّد،
// ويُجلب على حدة لا كتضمينٍ (embed) تجنّباً لعودة null متى حجبت RLS العلاقة.
export async function listRoleUsers(roleId) {
  if (!roleId) return []
  const sb = getSupabase()
  const [urRes, primRes] = await Promise.all([
    sb.from('user_roles').select('user_id').eq('role_id', roleId),
    sb.from('users').select('id').eq('role_id', roleId),
  ])
  const ids = Array.from(new Set([
    ...(urRes.data || []).map(r => r.user_id),
    ...(primRes.data || []).map(r => r.id),
  ].filter(Boolean)))
  if (!ids.length) return []
  const { data: us, error } = await sb.from('users')
    .select('id,email,person_id')
    .in('id', ids)
    .is('deleted_at', null)
  if (error) throw error
  const pids = Array.from(new Set((us || []).map(u => u.person_id).filter(Boolean)))
  let pmap = new Map()
  if (pids.length) {
    const { data: ps } = await sb.from('persons').select('id,name_ar,name_en').in('id', pids)
    pmap = new Map((ps || []).map(p => [p.id, p]))
  }
  return (us || [])
    .map(u => ({ id: u.id, email: u.email, name: pmap.get(u.person_id)?.name_ar || pmap.get(u.person_id)?.name_en || u.email }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'ar'))
}

export async function createRole({ name_ar, name_en, color, ui_visibility }) {
  const sb = getSupabase()
  const row = { name_ar, name_en: name_en || null, color: color || null, is_active: true }
  // دورٌ جديد يُولد مغلقاً بالكامل: كل مفاتيح الإظهار مطفأة صراحةً (طلب المستخدم).
  if (ui_visibility && Object.keys(ui_visibility).length) row.ui_visibility = ui_visibility
  const { data, error } = await sb.from('roles').insert(row).select().single()
  if (error) throw error
  return data
}

export async function updateRole(id, patch) {
  const sb = getSupabase()
  const { data, error } = await sb.from('roles').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

// Delete a role. Refuses for system roles and roles still assigned to users.
// Clears its permission grants first, then removes the role row.
export async function deleteRole(id) {
  const sb = getSupabase()
  const { data: role } = await sb.from('roles').select('is_system').eq('id', id).maybeSingle()
  if (role?.is_system) {
    const e = new Error('لا يمكن حذف دور نظامي'); e.code = 'role_system'; throw e
  }
  const { data: assigned } = await sb.from('user_roles').select('user_id').eq('role_id', id).limit(1)
  if (assigned?.length) {
    const e = new Error('لا يمكن حذف دور مُسند لمستخدمين — أزِل الدور عنهم أولاً')
    e.code = 'role_in_use'
    throw e
  }
  const { error: rpErr } = await sb.from('role_permissions').delete().eq('role_id', id)
  if (rpErr) throw rpErr
  const { error } = await sb.from('roles').delete().eq('id', id)
  if (error) throw error
}
