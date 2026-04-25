import { getSupabase } from '../lib/supabase.js'

const PAGE_SIZE = 20

// Role labels — match strings produced by v_person_profile.roles_summary
export const ROLE_LABELS = ['مستخدم', 'عميل', 'وسيط', 'عامل', 'مالك', 'مدير', 'مستفيد', 'مشرف', 'سعودة']

export async function listAllPersons() {
  const sb = getSupabase()
  if (!sb) return { rows: [] }
  const { data, error } = await sb.from('v_person_profile').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return { rows: data || [] }
}

export async function listPersons({ search = '', role = '', page = 1 } = {}) {
  const sb = getSupabase()
  if (!sb) return { rows: [], count: 0 }
  let q = sb.from('v_person_profile').select('*', { count: 'exact' })
  if (search) {
    const s = search.replace(/[%,]/g, '')
    q = q.or(`name_ar.ilike.%${s}%,name_en.ilike.%${s}%,id_number.ilike.%${s}%,phone_primary.ilike.%${s}%`)
  }
  if (role) q = q.contains('roles_summary', [role])
  q = q.order('name_ar', { ascending: true })
  q = q.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
  const { data, count, error } = await q
  if (error) throw error
  return { rows: data || [], count: count || 0, pageSize: PAGE_SIZE }
}

export async function getPerson(personId) {
  const sb = getSupabase()
  const [profileR, personR] = await Promise.all([
    sb.from('v_person_profile').select('*').eq('person_id', personId).maybeSingle(),
    sb.from('persons').select('*').eq('id', personId).maybeSingle(),
  ])
  return { profile: profileR.data, person: personR.data }
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
  const [countriesR, branchesR, lookupsR] = await Promise.all([
    sb.from('countries').select('id,code,name_ar,name_en,nationality_ar,nationality_en,flag_emoji')
      .eq('is_active', true).order('sort_order', { nullsFirst: false }).order('nationality_ar'),
    sb.from('branches').select('id,code').eq('is_active', true).order('code'),
    sb.from('lookup_items')
      .select('id,code,value_ar,value_en,sort_order,category:lookup_categories!inner(category_key)')
      .eq('is_active', true)
      .in('category.category_key', ['id_type', 'gender'])
      .order('sort_order', { nullsFirst: false }),
  ])
  const lookups = lookupsR.data || []
  const idTypes = lookups.filter(l => l.category?.category_key === 'id_type')
  const genders = lookups.filter(l => l.category?.category_key === 'gender')
  return { countries: countriesR.data || [], branches: branchesR.data || [], idTypes, genders }
}
