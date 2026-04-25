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
  if (error) throw error
  return data || []
}

export async function listUserRoleIds(userId) {
  if (!userId) return []
  const sb = getSupabase()
  const { data, error } = await sb.from('user_roles')
    .select('role_id')
    .eq('user_id', userId)
  if (error) throw error
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
  const { data } = await sb.from('v_person_profile')
    .select('person_id, name_ar, name_en, id_number, phone_primary, roles_summary, role_flags')
    .contains('roles_summary', [ar])
    .order('name_ar')
  return data || []
}

// ═══════════════════════════════════════════════════════════════════
// SMS Forwarder (otp_persons row linked to persons.id)
// ═══════════════════════════════════════════════════════════════════

export async function getSmsForwarder(personId) {
  const sb = getSupabase()
  const { data } = await sb.from('otp_persons').select('*').eq('person_id', personId).maybeSingle()
  return data
}

// Search unlinked otp_persons rows so the user can pick an existing entry to link.
export async function listUnlinkedSmsForwarders() {
  const sb = getSupabase()
  const { data } = await sb.from('otp_persons').select('id, name, full_name_ar, phone, is_active').is('person_id', null).order('name')
  return data || []
}

export async function createSmsForwarder(payload) {
  const sb = getSupabase()
  const { data, error } = await sb.from('otp_persons').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateSmsForwarder(id, payload) {
  const sb = getSupabase()
  const { data, error } = await sb.from('otp_persons').update(payload).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function linkSmsForwarder(otpPersonId, personId) {
  const sb = getSupabase()
  const { error } = await sb.from('otp_persons').update({ person_id: personId }).eq('id', otpPersonId)
  if (error) throw error
}

export async function unlinkSmsForwarder(id) {
  const sb = getSupabase()
  const { error } = await sb.from('otp_persons').update({ person_id: null }).eq('id', id)
  if (error) throw error
}

export async function deleteSmsForwarder(id) {
  const sb = getSupabase()
  // Messages and permissions reference this otp_person — clean them up first.
  await sb.from('otp_messages').delete().eq('person_id', id)
  await sb.from('otp_permissions').delete().eq('person_id', id)
  const { error } = await sb.from('otp_persons').delete().eq('id', id)
  if (error) throw error
}

export async function countSmsMessages(otpPersonId) {
  const sb = getSupabase()
  const { count } = await sb.from('otp_messages').select('id', { count: 'exact', head: true }).eq('person_id', otpPersonId)
  return count || 0
}

// Aggregated stats from v_sms_forwarder_stats (totals, per-sender breakdown
// as jsonb, 14-day daily counts). One row per otp_persons.id.
export async function getSmsForwarderStats(otpPersonId) {
  if (!otpPersonId) return null
  const sb = getSupabase()
  const { data, error } = await sb
    .from('v_sms_forwarder_stats')
    .select('*')
    .eq('otp_person_id', otpPersonId)
    .maybeSingle()
  if (error) throw error
  return data
}

// Paginated messages feed (v_sms_messages_feed) with filter helpers.
export async function listSmsMessages(otpPersonId, { from = 0, size = 50, phoneFrom, onlyOtp, days } = {}) {
  if (!otpPersonId) return []
  const sb = getSupabase()
  let q = sb
    .from('v_sms_messages_feed')
    .select('*')
    .eq('person_id', otpPersonId)
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
