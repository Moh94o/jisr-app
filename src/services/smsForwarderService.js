import { getSupabase } from '../lib/supabase.js'

// ════════════════════════════════════════════════════════════
// Error translation — single source of truth for Arabic messages.
// ════════════════════════════════════════════════════════════

export function translateSmsError(error) {
  if (!error) return 'خطأ غير معروف'
  const code = error.code
  const msg = error.message || ''

  if (code === '23505') {
    if (msg.includes('device_key')) return 'مفتاح الجهاز مستخدم مسبقاً'
    if (msg.includes('person_label') || msg.includes('sms_forwarders_person_label_unique'))
      return 'هذا الشخص لديه حساب بنفس التسمية. اختر تسمية مختلفة.'
    return 'القيمة موجودة مسبقاً'
  }
  if (code === '23503') return 'الشخص أو المستخدم المرتبط غير موجود'
  if (code === '23514') {
    if (msg.includes('device_key_min_length')) return 'مفتاح الجهاز يجب أن لا يقل عن 8 أحرف'
    if (msg.includes('otp_code_length')) return 'رمز OTP يجب أن يكون بين 3 و 20 حرف'
    if (msg.includes('message_body_length')) return 'نص الرسالة طويل جداً (الحد الأقصى 2000 حرف)'
    if (msg.includes('notes_max_length')) return 'الملاحظات طويلة جداً (الحد الأقصى 2000 حرف)'
    return 'القيمة لا تستوفي شروط الصحة'
  }
  if (code === '42501') return 'ليس لديك صلاحية لتنفيذ هذا الإجراء'
  return msg
}

// ════════════════════════════════════════════════════════════
// Forwarders
// ════════════════════════════════════════════════════════════

// Returns ALL forwarders for a person (sorted newest first). Pass
// includeDeleted: true to also include soft-deleted rows.
export async function listForwardersByPerson(personId, { includeDeleted = false } = {}) {
  if (!personId) return []
  const sb = getSupabase()
  let q = sb
    .from('sms_forwarders')
    .select('*')
    .eq('person_id', personId)
    .order('created_at', { ascending: false })
  if (!includeDeleted) q = q.is('deleted_at', null)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

// Quick count of active (non-deleted) forwarders for the badge.
export async function countActiveForwardersByPerson(personId) {
  if (!personId) return 0
  const sb = getSupabase()
  const { count, error } = await sb
    .from('sms_forwarders')
    .select('id', { count: 'exact', head: true })
    .eq('person_id', personId)
    .eq('is_active', true)
    .is('deleted_at', null)
  if (error) throw error
  return count || 0
}

// Batch version: returns Map<personId, count> for many persons in one round-trip.
export async function countForwardersForPersons(personIds) {
  if (!personIds?.length) return new Map()
  const sb = getSupabase()
  const { data, error } = await sb
    .from('sms_forwarders')
    .select('person_id, is_active, deleted_at')
    .in('person_id', personIds)
  if (error) throw error
  const map = new Map()
  ;(data || []).forEach(r => {
    if (r.deleted_at) return
    if (!r.is_active) return
    map.set(r.person_id, (map.get(r.person_id) || 0) + 1)
  })
  return map
}

// DEPRECATED — multiple forwarders per person are now allowed. Returns the
// most recently created active forwarder so legacy callers keep working.
export async function getForwarderByPersonId(personId) {
  const list = await listForwardersByPerson(personId)
  return list.find(f => f.is_active) || list[0] || null
}

export async function listForwarders({ activeOnly = true } = {}) {
  const sb = getSupabase()
  let q = sb
    .from('sms_forwarders')
    .select('*, person:persons(id, name_ar, name_en, personal_phone)')
    .is('deleted_at', null)
  if (activeOnly) q = q.eq('is_active', true)
  const { data, error } = await q.order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createForwarder({
  personId, deviceKey, label = null, notes = null,
  shortNameAr, shortNameEn = null,
}) {
  if (!personId) throw new Error('personId is required')
  if (!deviceKey || deviceKey.length < 8) throw new Error('device_key must be at least 8 characters')
  if (!shortNameAr || !shortNameAr.trim()) throw new Error('short_name_ar is required')
  const sb = getSupabase()
  const { data, error } = await sb
    .from('sms_forwarders')
    .insert({
      person_id: personId,
      device_key: deviceKey,
      label: label || null,
      notes: notes || null,
      short_name_ar: shortNameAr.trim(),
      short_name_en: shortNameEn ? shortNameEn.trim() : null,
      is_active: true,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// Resolve short name based on UI language. Falls back to short_name_ar
// when English is missing, then to label, then to "حساب".
export function resolveForwarderShortName(forwarder, lang = 'ar') {
  if (!forwarder) return ''
  if (lang === 'en') {
    return forwarder.short_name_en || forwarder.short_name_ar || forwarder.label || 'Account'
  }
  return forwarder.short_name_ar || forwarder.label || 'حساب'
}

export async function updateForwarder(forwarderId, patch) {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('sms_forwarders')
    .update(patch)
    .eq('id', forwarderId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateForwarderLabel(forwarderId, label) {
  return updateForwarder(forwarderId, { label: label || null })
}

export async function toggleForwarderActive(forwarderId, isActive) {
  return updateForwarder(forwarderId, { is_active: !!isActive })
}

export async function regenerateDeviceKey(forwarderId) {
  const newKey = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : ('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
      }))
  const updated = await updateForwarder(forwarderId, { device_key: newKey })
  return { forwarder: updated, deviceKey: newKey }
}

export async function softDeleteForwarder(forwarderId) {
  const sb = getSupabase()
  const { error } = await sb
    .from('sms_forwarders')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', forwarderId)
  if (error) throw error
}

export async function reactivateForwarder(forwarderId) {
  return updateForwarder(forwarderId, { deleted_at: null })
}

// Returns the UTC ISO instant corresponding to "today's" midnight in Riyadh
// (Asia/Riyadh = UTC+3, no DST).
function startOfTodayRiyadhISO() {
  const now = new Date()
  const riyadhFrame = new Date(now.getTime() + 3 * 60 * 60 * 1000)
  riyadhFrame.setUTCHours(0, 0, 0, 0)
  return new Date(riyadhFrame.getTime() - 3 * 60 * 60 * 1000).toISOString()
}

// Stats for a single forwarder — used in list rows + manage modal.
export async function getForwarderStats(forwarderId) {
  if (!forwarderId) return { messageCount: 0, messagesToday: 0, lastMessageAt: null }
  const sb = getSupabase()
  const todayStart = startOfTodayRiyadhISO()
  const [
    { count, error: countErr },
    { count: todayCount, error: todayErr },
    { data: lastMsg, error: lastErr },
  ] = await Promise.all([
    sb.from('sms_messages')
      .select('id', { count: 'exact', head: true })
      .eq('forwarder_id', forwarderId)
      .is('deleted_at', null),
    sb.from('sms_messages')
      .select('id', { count: 'exact', head: true })
      .eq('forwarder_id', forwarderId)
      .is('deleted_at', null)
      .gte('received_at', todayStart),
    sb.from('sms_messages')
      .select('received_at')
      .eq('forwarder_id', forwarderId)
      .is('deleted_at', null)
      .order('received_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  if (countErr) throw countErr
  if (todayErr) throw todayErr
  if (lastErr) throw lastErr
  return {
    messageCount: count || 0,
    messagesToday: todayCount || 0,
    lastMessageAt: lastMsg?.received_at || null,
  }
}

// ════════════════════════════════════════════════════════════
// Messages
// ════════════════════════════════════════════════════════════

export async function listMessages(forwarderId, { limit = 50, offset = 0 } = {}) {
  if (!forwarderId) return []
  const sb = getSupabase()
  const { data, error } = await sb
    .from('sms_messages')
    .select('*')
    .eq('forwarder_id', forwarderId)
    .is('deleted_at', null)
    .order('received_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) throw error
  return data || []
}

export async function getMessageStats(forwarderId, { days = 14 } = {}) {
  if (!forwarderId) {
    return { total: 0, otpCount: 0, serviceCount: 0, dailyCounts: groupByDay([], days) }
  }
  const sb = getSupabase()
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await sb
    .from('sms_messages')
    .select('id, otp_code, service_key, received_at')
    .eq('forwarder_id', forwarderId)
    .gte('received_at', since.toISOString())
    .is('deleted_at', null)
  if (error) throw error

  const rows = data || []
  const total = rows.length
  const otpCount = rows.filter(m => m.otp_code).length
  const services = new Set(rows.map(m => m.service_key).filter(Boolean))
  const dailyCounts = groupByDay(rows, days)

  return { total, otpCount, serviceCount: services.size, dailyCounts }
}

function groupByDay(messages, days) {
  const result = {}
  for (let i = 0; i < days; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    result[d.toISOString().slice(0, 10)] = 0
  }
  messages.forEach(m => {
    const day = (m.received_at || '').slice(0, 10)
    if (day in result) result[day]++
  })
  return Object.entries(result)
    .map(([date, count]) => ({ date, count }))
    .reverse()
}

// ════════════════════════════════════════════════════════════
// Views (read receipts)
// ════════════════════════════════════════════════════════════

export async function markMessageViewed(messageId, userId) {
  if (!messageId || !userId) return
  const sb = getSupabase()
  const { error } = await sb
    .from('sms_message_views')
    .upsert(
      { message_id: messageId, user_id: userId },
      { onConflict: 'message_id,user_id', ignoreDuplicates: true }
    )
  if (error) throw error
}

// Returns Set of message_ids the user has viewed (for a list of messages).
export async function listViewedMessageIds(messageIds, userId) {
  if (!userId || !messageIds?.length) return new Set()
  const sb = getSupabase()
  const { data, error } = await sb
    .from('sms_message_views')
    .select('message_id')
    .eq('user_id', userId)
    .in('message_id', messageIds)
  if (error) throw error
  return new Set((data || []).map(r => r.message_id))
}

// ════════════════════════════════════════════════════════════
// Copy log (audit trail — IMMUTABLE table, insert only)
// ════════════════════════════════════════════════════════════

// copyType: 'otp' | 'body'
export async function logCopy(messageId, userId, copyType) {
  if (!['otp', 'body'].includes(copyType)) {
    throw new Error(`Invalid copy_type: ${copyType}`)
  }
  const sb = getSupabase()
  // Update last-copy snapshot on the message itself (best-effort).
  await sb
    .from('sms_messages')
    .update({ copied_at: new Date().toISOString(), copied_by: userId })
    .eq('id', messageId)

  const { error } = await sb
    .from('sms_copy_log')
    .insert({ message_id: messageId, user_id: userId, copy_type: copyType })
  if (error) throw error
}

// ════════════════════════════════════════════════════════════
// Classifications (tags)
// ════════════════════════════════════════════════════════════

export async function addClassification(messageId, classification) {
  const sb = getSupabase()
  const { error } = await sb
    .from('sms_message_classifications')
    .insert({ message_id: messageId, classification })
  // 23505 = unique violation — ignore (already classified)
  if (error && error.code !== '23505') throw error
}

export async function removeClassification(messageId, classification) {
  const sb = getSupabase()
  const { error } = await sb
    .from('sms_message_classifications')
    .delete()
    .eq('message_id', messageId)
    .eq('classification', classification)
  if (error) throw error
}

export async function listClassifications(messageId) {
  if (!messageId) return []
  const sb = getSupabase()
  const { data, error } = await sb
    .from('sms_message_classifications')
    .select('*')
    .eq('message_id', messageId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

// Returns Map<message_id, string[]> for a list of messages.
export async function listClassificationsForMessages(messageIds) {
  if (!messageIds?.length) return new Map()
  const sb = getSupabase()
  const { data, error } = await sb
    .from('sms_message_classifications')
    .select('message_id, classification')
    .in('message_id', messageIds)
  if (error) throw error
  const map = new Map()
  ;(data || []).forEach(r => {
    if (!map.has(r.message_id)) map.set(r.message_id, [])
    map.get(r.message_id).push(r.classification)
  })
  return map
}

// ════════════════════════════════════════════════════════════
// Service catalog (lookup_items where category=sms_service)
// ════════════════════════════════════════════════════════════

let _smsServiceCategoryId = null
async function getSmsServiceCategoryId() {
  if (_smsServiceCategoryId) return _smsServiceCategoryId
  const sb = getSupabase()
  const { data, error } = await sb
    .from('lookup_categories')
    .select('id')
    .eq('category_key', 'sms_service')
    .maybeSingle()
  if (error) throw error
  _smsServiceCategoryId = data?.id || null
  return _smsServiceCategoryId
}

export async function listSmsServices() {
  const categoryId = await getSmsServiceCategoryId()
  if (!categoryId) return []
  const sb = getSupabase()
  const { data, error } = await sb
    .from('lookup_items')
    .select('id, code, value_ar, value_en, metadata, sort_order')
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .order('sort_order', { nullsFirst: false })
  if (error) throw error
  return (data || []).map(item => ({
    ...item,
    color: item.metadata?.color || '#888',
  }))
}

// ════════════════════════════════════════════════════════════
// Forwarder permissions (admin only)
// ════════════════════════════════════════════════════════════

export async function listForwarderPermissions(forwarderId) {
  if (!forwarderId) return []
  const sb = getSupabase()
  const { data, error } = await sb
    .from('sms_forwarder_permissions')
    .select('*, user:users(id, person:persons(name_ar, name_en))')
    .eq('forwarder_id', forwarderId)
  if (error) throw error
  return data || []
}

export async function setForwarderPermission({
  forwarderId, userId, permissionLevel, senderFilterMode = 'all', senderList = [],
}) {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('sms_forwarder_permissions')
    .upsert({
      forwarder_id: forwarderId,
      user_id: userId,
      permission_level: permissionLevel,
      sender_filter_mode: senderFilterMode,
      sender_list: senderList,
    }, { onConflict: 'forwarder_id,user_id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removeForwarderPermission(forwarderId, userId) {
  const sb = getSupabase()
  const { error } = await sb
    .from('sms_forwarder_permissions')
    .delete()
    .eq('forwarder_id', forwarderId)
    .eq('user_id', userId)
  if (error) throw error
}
