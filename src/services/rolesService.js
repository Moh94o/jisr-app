import { getSupabase } from '../lib/supabase.js'

// Translate common Postgres errors into Arabic messages.
export function humanizeDbError(e) {
  const code = e?.code
  if (code === '23505') return 'يوجد سجل نشط حالياً لنفس الشخص في هذه المنشأة بنفس الدور. أنهِ السجل السابق أولاً.'
  if (code === '23503') return 'لا يمكن الحذف — السجل مستخدم في سجلات أخرى'
  if (code === '23514') return 'لا يمكن تنفيذ العملية — السجل محمي'
  return e?.message || 'حدث خطأ'
}

// ═══════════════════════════════════════════════════════════════════
// Global single-record roles (users / clients / brokers / workers)
// ═══════════════════════════════════════════════════════════════════

async function _getSingle(table, personId) {
  const sb = getSupabase()
  const { data } = await sb.from(table).select('*').eq('person_id', personId).is('deleted_at', null).maybeSingle()
  return data
}

async function _createSingle(table, payload) {
  const sb = getSupabase()
  const { data, error } = await sb.from(table).insert(payload).select().single()
  if (error) throw error
  return data
}

async function _updateSingle(table, id, payload) {
  const sb = getSupabase()
  const { data, error } = await sb.from(table).update(payload).eq('id', id).select().single()
  if (error) throw error
  return data
}

async function _softDeleteSingle(table, id) {
  const sb = getSupabase()
  const { error } = await sb.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export const getUser        = (personId) => _getSingle('users', personId)
export const createUser     = (payload)  => _createSingle('users', payload)
export const updateUser     = (id, p)    => _updateSingle('users', id, p)
export const deleteUser     = (id)       => _softDeleteSingle('users', id)

// ═══════════════════════════════════════════════════════════════════
// Role catalog + user_roles junction (many-to-many)
// ═══════════════════════════════════════════════════════════════════

export async function listRoles() {
  const sb = getSupabase()
  const { data, error } = await sb.from('roles')
    .select('id, name_ar, name_en, color, is_active')
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('name_ar')
  // `roles` table isn't built yet — return [] until it exists instead of throwing.
  if (error) return []
  return data || []
}

export async function listUserRoleIds(userId) {
  if (!userId) return []
  const sb = getSupabase()
  const { data, error } = await sb.from('user_roles')
    .select('role_id')
    .eq('user_id', userId)
  // `user_roles` table isn't built yet — return [] until it exists instead of throwing.
  if (error) return []
  return (data || []).map(r => r.role_id)
}

// Diff current vs desired role set and apply INSERT/DELETE in the junction table.
export async function syncUserRoles(userId, desiredRoleIds) {
  const sb = getSupabase()
  const current = await listUserRoleIds(userId)
  const desired = Array.from(new Set(desiredRoleIds || []))
  const toAdd = desired.filter(id => !current.includes(id))
  const toRemove = current.filter(id => !desired.includes(id))

  if (toAdd.length) {
    const rows = toAdd.map(role_id => ({ user_id: userId, role_id }))
    const { error } = await sb.from('user_roles').insert(rows)
    if (error) throw error
  }
  if (toRemove.length) {
    const { error } = await sb.from('user_roles').delete()
      .eq('user_id', userId).in('role_id', toRemove)
    if (error) throw error
  }
}

export const getClient      = (personId) => _getSingle('clients', personId)
export const createClient   = (payload)  => _createSingle('clients', payload)
export const updateClient   = (id, p)    => _updateSingle('clients', id, p)
export const deleteClient   = (id)       => _softDeleteSingle('clients', id)

export const getBroker      = (personId) => _getSingle('brokers', personId)
export const createBroker   = (payload)  => _createSingle('brokers', payload)
export const updateBroker   = (id, p)    => _updateSingle('brokers', id, p)
export const deleteBroker   = (id)       => _softDeleteSingle('brokers', id)

export const getWorker      = (personId) => _getSingle('workers', personId)
export const createWorker   = (payload)  => _createSingle('workers', payload)
export const updateWorker   = (id, p)    => _updateSingle('workers', id, p)
export const deleteWorker   = (id)       => _softDeleteSingle('workers', id)

// ═══════════════════════════════════════════════════════════════════
// Per-facility CR parties (owner / beneficiary / manager)
// Uses a single table `facility_cr_parties` with role_type discriminator.
// ═══════════════════════════════════════════════════════════════════

export async function listCrParties(personId, roleType) {
  const sb = getSupabase()
  const { data, error } = await sb.from('facility_cr_parties')
    .select('id, facility_id, role_type, ownership_percentage, position_title, is_primary, start_date, end_date, is_active, notes, facility:facilities(id, name_ar, cr_number)')
    .eq('person_id', personId)
    .eq('role_type', roleType)
    .order('is_active', { ascending: false })
    .order('start_date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createCrParty(payload) {
  const sb = getSupabase()
  const { data, error } = await sb.from('facility_cr_parties').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateCrParty(id, payload) {
  const sb = getSupabase()
  const { data, error } = await sb.from('facility_cr_parties').update(payload).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function endCrParty(id) {
  const sb = getSupabase()
  const today = new Date().toISOString().slice(0, 10)
  const { error } = await sb.from('facility_cr_parties')
    .update({ end_date: today, is_active: false })
    .eq('id', id)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════════════
// Facility supervisors (GOSI)
// ═══════════════════════════════════════════════════════════════════

export async function listSupervisors(personId) {
  const sb = getSupabase()
  const { data, error } = await sb.from('facility_supervisors')
    .select('id, facility_id, gosi_username, access_level, start_date, end_date, is_active, notes, facility:facilities(id, name_ar, cr_number)')
    .eq('person_id', personId)
    .order('is_active', { ascending: false })
    .order('start_date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createSupervisor(payload) {
  const sb = getSupabase()
  const { data, error } = await sb.from('facility_supervisors').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateSupervisor(id, payload) {
  const sb = getSupabase()
  const { data, error } = await sb.from('facility_supervisors').update(payload).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function endSupervisor(id) {
  const sb = getSupabase()
  const today = new Date().toISOString().slice(0, 10)
  const { error } = await sb.from('facility_supervisors').update({ end_date: today, is_active: false }).eq('id', id)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════════════
// Saudization placements (weekly rotations)
// ═══════════════════════════════════════════════════════════════════

export async function listSaudization(personId) {
  const sb = getSupabase()
  const { data, error } = await sb.from('saudization_placements')
    .select('id, facility_id, week_start, week_end, placement_type, monthly_salary, is_active, notes, facility:facilities(id, name_ar, cr_number)')
    .eq('person_id', personId)
    .order('week_start', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createSaudization(payload) {
  const sb = getSupabase()
  const { data, error } = await sb.from('saudization_placements').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateSaudization(id, payload) {
  const sb = getSupabase()
  const { data, error } = await sb.from('saudization_placements').update(payload).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteSaudization(id) {
  const sb = getSupabase()
  const { error } = await sb.from('saudization_placements').delete().eq('id', id)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════════════
// Shared: list active facilities (for the facility picker in modals)
// ═══════════════════════════════════════════════════════════════════

export async function listFacilities() {
  const sb = getSupabase()
  const { data } = await sb.from('facilities').select('id, name_ar, cr_number').is('deleted_at', null).order('name_ar')
  return data || []
}

// ═══════════════════════════════════════════════════════════════════
// Person role flags — mark a person as eligible for a CR-party role
// (owner/manager/beneficiary/supervisor) without requiring a facility.
// Lets these persons appear in role dropdowns even when not yet linked.
// ═══════════════════════════════════════════════════════════════════

export async function getPersonRoleFlag(personId, roleType) {
  const sb = getSupabase()
  const { data } = await sb.from('person_role_flags')
    .select('person_id').eq('person_id', personId).eq('role_type', roleType).maybeSingle()
  return !!data
}

export async function setPersonRoleFlag(personId, roleType) {
  const sb = getSupabase()
  const { error } = await sb.from('person_role_flags')
    .upsert({ person_id: personId, role_type: roleType }, { onConflict: 'person_id,role_type' })
  if (error) throw error
}

export async function removePersonRoleFlag(personId, roleType) {
  const sb = getSupabase()
  const { error } = await sb.from('person_role_flags')
    .delete().eq('person_id', personId).eq('role_type', roleType)
  if (error) throw error
}

// Returns persons whose `roles_summary` contains the Arabic label for the
// given role_type — covers BOTH actual facility relationships AND flagged-only.
export async function listPersonsByRole(roleType) {
  const sb = getSupabase()
  const ROLE_AR = { owner: 'مالك', manager: 'مدير', beneficiary: 'مستفيد', supervisor: 'مشرف', tracker: 'معقب' }
  const ar = ROLE_AR[roleType]
  if (!ar) return []
  // v_person_profile / roles_summary aren't built yet — returns [] until the view exists.
  return []
}

// ═══════════════════════════════════════════════════════════════════
// SMS Forwarder — sms_forwarders row linked to persons.id (1:1)
// (Wraps smsForwarderService for legacy callers in this file.)
// ═══════════════════════════════════════════════════════════════════

export async function getSmsForwarder(personId) {
  const sb = getSupabase()
  const { data } = await sb
    .from('sms_forwarders')
    .select('*, person:persons(id, name_ar, name_en, personal_phone)')
    .eq('person_id', personId)
    .is('deleted_at', null)
    .maybeSingle()
  return data
}

// Schema enforces person_id NOT NULL UNIQUE — there is no "unlinked" forwarder.
// Returning [] keeps callers safe; the legacy "link existing" flow has been removed.
export async function listUnlinkedSmsForwarders() {
  return []
}

export async function createSmsForwarder({ personId, deviceKey, notes = null }) {
  if (!personId) throw new Error('personId is required')
  if (!deviceKey || deviceKey.length < 8) throw new Error('device_key must be at least 8 characters')
  const sb = getSupabase()
  const { data, error } = await sb
    .from('sms_forwarders')
    .insert({ person_id: personId, device_key: deviceKey, notes })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSmsForwarder(id, payload) {
  const sb = getSupabase()
  const { data, error } = await sb.from('sms_forwarders').update(payload).eq('id', id).select().single()
  if (error) throw error
  return data
}

// person_id is NOT NULL on sms_forwarders, so link/unlink no longer apply.
export async function linkSmsForwarder() { throw new Error('linkSmsForwarder removed — schema requires person_id at insert time') }
export async function unlinkSmsForwarder() { throw new Error('unlinkSmsForwarder removed — schema requires person_id at insert time') }

export async function deleteSmsForwarder(id) {
  // Soft-delete: deleted_at preserves messages/audit trail; FK ON DELETE
  // cascades only run on hard DELETE, which we avoid for forwarders.
  const sb = getSupabase()
  const { error } = await sb.from('sms_forwarders').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function countSmsMessages(forwarderId) {
  if (!forwarderId) return 0
  const sb = getSupabase()
  const { count } = await sb.from('sms_messages')
    .select('id', { count: 'exact', head: true })
    .eq('forwarder_id', forwarderId)
    .is('deleted_at', null)
  return count || 0
}

// Computed stats — replaces the old v_sms_forwarder_stats view.
// Returns the same shape callers expect: { total_messages, otp_messages, services_count, daily_14d }.
export async function getSmsForwarderStats(forwarderId, { days = 14 } = {}) {
  if (!forwarderId) return null
  const sb = getSupabase()
  const since = new Date(); since.setDate(since.getDate() - days)
  const { data, error } = await sb
    .from('sms_messages')
    .select('id, otp_code, service_key, received_at')
    .eq('forwarder_id', forwarderId)
    .gte('received_at', since.toISOString())
    .is('deleted_at', null)
  if (error) throw error
  const rows = data || []
  // 14-day daily bucket
  const byDay = {}
  for (let i = 0; i < days; i++) {
    const d = new Date(); d.setDate(d.getDate() - i)
    byDay[d.toISOString().slice(0, 10)] = 0
  }
  rows.forEach(r => {
    const d = (r.received_at || '').slice(0, 10)
    if (d in byDay) byDay[d]++
  })
  return {
    total_messages: rows.length,
    otp_messages: rows.filter(r => r.otp_code).length,
    services_count: new Set(rows.map(r => r.service_key).filter(Boolean)).size,
    daily_14d: Object.entries(byDay).map(([date, count]) => ({ date, count })).reverse(),
  }
}

// Paginated messages feed for a forwarder.
export async function listSmsMessages(forwarderId, { from = 0, size = 50, phoneFrom, onlyOtp, days } = {}) {
  if (!forwarderId) return []
  const sb = getSupabase()
  let q = sb
    .from('sms_messages')
    .select('*')
    .eq('forwarder_id', forwarderId)
    .is('deleted_at', null)
    .order('received_at', { ascending: false })
    .range(from, from + size - 1)
  if (phoneFrom) q = q.eq('phone_from', phoneFrom)
  if (onlyOtp) q = q.not('otp_code', 'is', null)
  if (days) {
    const cutoff = new Date(Date.now() - days * 86400_000).toISOString()
    q = q.gte('received_at', cutoff)
  }
  const { data, error } = await q
  if (error) throw error
  return data || []
}
