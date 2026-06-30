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

export async function getRolePermissionIds(roleId) {
  if (!roleId) return []
  const sb = getSupabase()
  const { data, error } = await sb.from('role_permissions').select('permission_id').eq('role_id', roleId)
  if (error) throw error
  return (data || []).map(r => r.permission_id)
}

// Grant or revoke a single permission for a role (toggle).
export async function setRolePermission(roleId, permissionId, granted) {
  const sb = getSupabase()
  if (granted) {
    const { error } = await sb.from('role_permissions')
      .upsert({ role_id: roleId, permission_id: permissionId }, { onConflict: 'role_id,permission_id' })
    if (error) throw error
  } else {
    const { error } = await sb.from('role_permissions')
      .delete().eq('role_id', roleId).eq('permission_id', permissionId)
    if (error) throw error
  }
}

// Grant/revoke a batch of permissions in one go (e.g. "select all in section").
export async function setRolePermissionsBatch(roleId, permissionIds, granted) {
  const sb = getSupabase()
  const ids = Array.from(new Set(permissionIds || []))
  if (!ids.length) return
  if (granted) {
    const rows = ids.map(permission_id => ({ role_id: roleId, permission_id }))
    const { error } = await sb.from('role_permissions').upsert(rows, { onConflict: 'role_id,permission_id' })
    if (error) throw error
  } else {
    const { error } = await sb.from('role_permissions').delete().eq('role_id', roleId).in('permission_id', ids)
    if (error) throw error
  }
}

export async function createRole({ name_ar, name_en, color }) {
  const sb = getSupabase()
  const { data, error } = await sb.from('roles')
    .insert({ name_ar, name_en: name_en || null, color: color || null, is_active: true })
    .select().single()
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
  await sb.from('role_permissions').delete().eq('role_id', id)
  const { error } = await sb.from('roles').delete().eq('id', id)
  if (error) throw error
}
