import { getSupabase } from '../lib/supabase.js'

const PAGE_SIZE = 20

export const ROLE_LABELS = ['موظف مكتب', 'عامل', 'وسيط', 'عميل', 'مدير منشأة', 'مالك منشأة']

// Full list (no server filter/pagination) — used by the Transfer-Calc-style page
// that does all filtering + date grouping in memory. Persons are low-cardinality
// (hundreds, not millions) so one query is simpler than server-side pagination.
export async function listAllPersons() {
  const sb = getSupabase()
  if (!sb) return { rows: [] }
  const { data, error } = await sb.from('v_person_profile').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return { rows: data || [] }
}

export async function listPersons({ search = '', role = '', status = '', branch = '', page = 1 } = {}) {
  const sb = getSupabase()
  if (!sb) return { rows: [], count: 0 }
  let q = sb.from('v_person_profile').select('*', { count: 'exact' })
  if (search) {
    const s = search.replace(/[%,]/g, '')
    q = q.or(`full_name_ar.ilike.%${s}%,full_name_en.ilike.%${s}%,id_number.ilike.%${s}%,phone.ilike.%${s}%`)
  }
  if (role) q = q.contains('roles_summary', [role])
  if (status) q = q.eq('status', status)
  if (branch) q = q.eq('branch_id', branch)
  q = q.order('full_name_ar', { ascending: true })
  q = q.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
  const { data, count, error } = await q
  if (error) throw error
  return { rows: data || [], count: count || 0, pageSize: PAGE_SIZE }
}

export async function getPerson(personId) {
  const sb = getSupabase()
  const [profileR, personR] = await Promise.all([
    sb.from('v_person_profile').select('*').eq('person_id', personId).maybeSingle(),
    sb.from('persons').select('*').eq('id', personId).is('deleted_at', null).maybeSingle(),
  ])
  return { profile: profileR.data, person: personR.data }
}

export async function listOwnedFacilities(personId) {
  const sb = getSupabase()
  const { data } = await sb.from('v_facility_owners_active').select('*').eq('person_id', personId)
  return data || []
}

export async function listManagedFacilities(personId) {
  const sb = getSupabase()
  const { data } = await sb.from('v_facility_managers_active').select('*').eq('person_id', personId)
  return data || []
}

export async function isIdNumberTaken(idNumber, excludeId = null) {
  const sb = getSupabase()
  if (!idNumber) return false
  let q = sb.from('persons').select('id').eq('id_number', idNumber).is('deleted_at', null)
  if (excludeId) q = q.neq('id', excludeId)
  const { data } = await q.limit(1)
  return (data || []).length > 0
}

export async function createPerson(payload) {
  const sb = getSupabase()
  const { data, error } = await sb.from('persons').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updatePerson(id, payload) {
  const sb = getSupabase()
  const { data, error } = await sb.from('persons').update(payload).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function archivePerson(id) {
  const sb = getSupabase()
  const { error } = await sb.from('persons').update({ status: 'archived' }).eq('id', id)
  if (error) throw error
}

export async function unarchivePerson(id) {
  const sb = getSupabase()
  const { error } = await sb.from('persons').update({ status: 'active' }).eq('id', id)
  if (error) throw error
}

export async function loadReferenceData() {
  const sb = getSupabase()
  if (!sb) return { countries: [], branches: [] }
  const [countriesR, branchesR] = await Promise.all([
    sb.from('countries').select('id,name_ar,name_en,nationality_ar,nationality_en,flag_emoji')
      .eq('is_active', true).order('sort_order', { nullsFirst: false }).order('nationality_ar'),
    sb.from('branches').select('id,code').is('deleted_at', null).eq('is_active', true).order('code'),
  ])
  return { countries: countriesR.data || [], branches: branchesR.data || [] }
}
