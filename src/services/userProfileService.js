import { getSupabase } from '../lib/supabase.js'

// ═══════════════════════════════════════════════════════════════════
// Permissions — v_user_permissions_summary aggregates per-module
// (role-inherited, user-granted, user-denied) into a single jsonb array.
// ═══════════════════════════════════════════════════════════════════

export async function listUserPermissionsSummary(userId) {
  if (!userId) return []
  const sb = getSupabase()
  const { data, error } = await sb
    .from('v_user_permissions_summary')
    .select('*')
    .eq('user_id', userId)
  // View not built yet — fall back to empty list instead of throwing.
  if (error) return []
  return data || []
}

// Upsert a user-specific permission override (or remove it). Passing null as
// `isGranted` deletes the row so the user falls back to whatever their role says.
export async function setUserPermission(userId, permissionId, isGranted) {
  const sb = getSupabase()
  if (isGranted == null) {
    const { error } = await sb
      .from('user_permissions')
      .delete()
      .eq('user_id', userId)
      .eq('permission_id', permissionId)
    if (error) throw error
    return
  }
  const { error } = await sb
    .from('user_permissions')
    .upsert(
      { user_id: userId, permission_id: permissionId, is_granted: isGranted },
      { onConflict: 'user_id,permission_id' }
    )
  if (error) throw error
}

// Check whether the viewer has a single permission (module.action). Used to
// gate the permission-toggle interaction.
export async function hasEffectivePermission(userId, module, action) {
  if (!userId) return false
  const sb = getSupabase()
  const { data, error } = await sb
    .from('v_user_effective_permissions')
    .select('is_granted')
    .eq('user_id', userId)
    .eq('module', module)
    .eq('action', action)
    .eq('is_granted', true)
    .maybeSingle()
  if (error) return false
  return !!data
}

// ═══════════════════════════════════════════════════════════════════
// Activity feed — v_user_activity_feed is pre-sorted by created_at DESC
// with pre-computed action_label_ar / action_tone / seconds_ago so the
// client doesn't format timestamps or translate actions.
// ═══════════════════════════════════════════════════════════════════

export async function listUserActivity(userId, { from = 0, size = 50, action, entityType, days } = {}) {
  if (!userId) return []
  const sb = getSupabase()
  let q = sb
    .from('v_user_activity_feed')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, from + size - 1)
  if (action) q = q.eq('action', action)
  if (entityType) q = q.eq('entity_type', entityType)
  if (days) {
    const cutoff = new Date(Date.now() - days * 86400_000).toISOString()
    q = q.gte('created_at', cutoff)
  }
  const { data, error } = await q
  // View not built yet — fall back to empty list instead of throwing.
  if (error) return []
  return data || []
}
