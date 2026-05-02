import { getSupabase } from '../lib/supabase.js'

const PAGE_SIZE = 20

// Role labels — match strings produced by v_person_profile.roles_summary
export const ROLE_LABELS = ['مستخدم', 'عميل', 'وسيط', 'عامل', 'مالك', 'مدير', 'مستفيد', 'مشرف', 'سعودة']

// Map a persons-table row to the shape the UI expects (compat shim for the
// missing `v_person_profile` view — fields the view would have aggregated
// are filled with safe defaults until the view exists). Pass userMap to
// link person→user via persons.id = users.person_id; if a match exists,
// the profile gets user_id and 'مستخدم' added to roles_summary.
function toProfile(p, userMap) {
  if (!p) return null
  const userId = userMap ? userMap.get(p.id) || null : null
  const roles = userId ? ['مستخدم'] : []
  return {
    ...p,
    person_id: p.id,
    user_id: userId,
    roles_summary: roles,
  }
}

async function fetchUserMap(sb, personIds) {
  if (!personIds.length) return new Map()
  const { data } = await sb.from('users')
    .select('id,person_id')
    .in('person_id', personIds)
    .is('deleted_at', null)
  return new Map((data || []).map(u => [u.person_id, u.id]))
}

export async function listAllPersons() {
  const sb = getSupabase()
  if (!sb) return { rows: [] }
  const { data, error } = await sb.from('persons').select('*').order('created_at', { ascending: false })
  if (error) throw error
  const rows = data || []
  const userMap = await fetchUserMap(sb, rows.map(r => r.id))
  return { rows: rows.map(r => toProfile(r, userMap)) }
}

export async function listPersons({ search = '', role = '', page = 1 } = {}) {
  const sb = getSupabase()
  if (!sb) return { rows: [], count: 0 }
  let q = sb.from('persons').select('*', { count: 'exact' })
  if (search) {
    const s = search.replace(/[%,]/g, '')
    q = q.or(`name_ar.ilike.%${s}%,name_en.ilike.%${s}%,id_number.ilike.%${s}%,phone_primary.ilike.%${s}%`)
  }
  // Role filter relies on roles_summary from v_person_profile — no-op until the view exists.
  q = q.order('name_ar', { ascending: true })
  q = q.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
  const { data, count, error } = await q
  if (error) throw error
  const rows = data || []
  const userMap = await fetchUserMap(sb, rows.map(r => r.id))
  return { rows: rows.map(r => toProfile(r, userMap)), count: count || 0, pageSize: PAGE_SIZE }
}

export async function getPerson(personId) {
  const sb = getSupabase()
  const [{ data: personRow }, { data: userRow }] = await Promise.all([
    sb.from('persons').select('*').eq('id', personId).maybeSingle(),
    sb.from('users').select('id').eq('person_id', personId).is('deleted_at', null).maybeSingle(),
  ])
  const userMap = new Map(userRow ? [[personId, userRow.id]] : [])
  // Transform both — UI reads phone_primary off `person`, not just `profile`.
  return { profile: toProfile(personRow, userMap), person: toProfile(personRow, userMap) }
}

export async function listOwnedFacilities(personId) {
  const sb = getSupabase()
  const { data } = await sb.from('facility_cr_parties')
    .select('id, facility_id, ownership_percentage, is_primary, start_date, end_date, is_active, position_title, facility:facilities(id, name_ar, cr_number)')
    .eq('person_id', personId)
    .eq('role_type', 'owner')
    .eq('is_active', true)
    .is('end_date', null)
  return (data || []).map(r => ({
    assignment_id: r.id,
    facility_id: r.facility_id,
    facility_name_ar: r.facility?.name_ar,
    ownership_percentage: r.ownership_percentage,
    is_primary: r.is_primary,
  }))
}

export async function listManagedFacilities(personId) {
  const sb = getSupabase()
  const { data } = await sb.from('facility_cr_parties')
    .select('id, facility_id, position_title, is_primary, start_date, end_date, is_active, facility:facilities(id, name_ar, cr_number)')
    .eq('person_id', personId)
    .eq('role_type', 'manager')
    .eq('is_active', true)
    .is('end_date', null)
  return (data || []).map(r => ({
    assignment_id: r.id,
    facility_id: r.facility_id,
    facility_name_ar: r.facility?.name_ar,
    manager_type: r.position_title,
    is_primary: r.is_primary,
  }))
}

export async function isIdNumberTaken(idNumber, excludeId = null) {
  const sb = getSupabase()
  if (!idNumber) return false
  let q = sb.from('persons').select('id').eq('id_number', idNumber)
  if (excludeId) q = q.neq('id', excludeId)
  const { data } = await q.limit(1)
  return (data || []).length > 0
}

export async function isPhoneTaken(phone, excludeId = null) {
  const sb = getSupabase()
  if (!phone) return false
  let q = sb.from('persons').select('id').eq('phone_primary', phone)
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

export async function deletePerson(id) {
  const sb = getSupabase()
  const { error } = await sb.from('persons').delete().eq('id', id)
  if (error) throw error
}

export async function loadReferenceData() {
  const sb = getSupabase()
  if (!sb) return { countries: [], branches: [], idTypes: [], genders: [] }
  const [natsR, branchesR, lookupsR] = await Promise.all([
    // Project uses `nationalities` (not `countries`). Alias name_ar → nationality_ar
    // so the UI's flag/nationality lookup keeps working unchanged.
    sb.from('nationalities').select('id,code,name_ar,name_en,country_name_ar,country_name_en,flag_url')
      .eq('is_active', true).order('sort_order', { nullsFirst: false }).order('name_ar'),
    sb.from('branches').select('id,branch_code').eq('is_active', true).order('branch_code'),
    sb.from('lookup_items')
      .select('id,code,value_ar,value_en,sort_order,category:lookup_categories!inner(category_key)')
      .eq('is_active', true)
      .in('category.category_key', ['id_type', 'gender'])
      .order('sort_order', { nullsFirst: false }),
  ])
  const countries = (natsR.data || []).map(n => ({
    ...n,
    nationality_ar: n.name_ar,
    nationality_en: n.name_en,
  }))
  const lookups = lookupsR.data || []
  const idTypes = lookups.filter(l => l.category?.category_key === 'id_type')
  const genders = lookups.filter(l => l.category?.category_key === 'gender')
  return { countries, branches: branchesR.data || [], idTypes, genders }
}
