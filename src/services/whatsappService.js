// WhatsApp service — wraps the WhatsApp Cloud API tables.
import { getSupabase } from '../lib/supabase.js'

export async function getCredentials() {
  const sb = getSupabase()
  const { data, error } = await sb.from('whatsapp_credentials').select('*').is('organization_id', null).maybeSingle()
  if (error) throw error
  return data
}

export async function upsertCredentials(payload) {
  const sb = getSupabase()
  const existing = await getCredentials()
  if (existing) {
    const { data, error } = await sb.from('whatsapp_credentials').update(payload).eq('id', existing.id).select().single()
    if (error) throw error
    return data
  }
  const { data, error } = await sb.from('whatsapp_credentials').insert({ organization_id: null, ...payload }).select().single()
  if (error) throw error
  return data
}

export async function listTemplates() {
  const sb = getSupabase()
  const { data, error } = await sb.from('whatsapp_templates').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function syncTemplatesFromMeta() {
  const sb = getSupabase()
  const { data, error } = await sb.functions.invoke('whatsapp-template-sync', { body: {} })
  if (error) throw error
  return data
}

export async function listConversations({ status, search, limit = 100 } = {}) {
  const sb = getSupabase()
  let q = sb.from('whatsapp_conversations').select('*, client:clients(id, person:persons(name_ar, name_en))').order('last_message_at', { ascending: false }).limit(limit)
  if (status) q = q.eq('status', status)
  if (search) q = q.or(`contact_phone.ilike.%${search}%,contact_name.ilike.%${search}%`)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function listMessages(conversationId, limit = 200) {
  const sb = getSupabase()
  const { data, error } = await sb.from('whatsapp_messages').select('*').eq('conversation_id', conversationId)
    .order('sent_at', { ascending: true }).limit(limit)
  if (error) throw error
  return data || []
}

export async function sendTemplate({ toPhone, templateName, language = 'ar', variables = {}, referenceType, referenceId }) {
  const sb = getSupabase()
  const { data, error } = await sb.functions.invoke('whatsapp-send', {
    body: {
      to_phone: toPhone,
      template_name: templateName,
      language,
      variables,
      reference_type: referenceType,
      reference_id: referenceId,
    }
  })
  if (error) throw error
  return data
}

export async function sendFreeText({ conversationId, body }) {
  const sb = getSupabase()
  const { data, error } = await sb.functions.invoke('whatsapp-send', {
    body: { conversation_id: conversationId, type: 'text', text: body }
  })
  if (error) throw error
  return data
}

export async function markRead(conversationId) {
  const sb = getSupabase()
  const { error } = await sb.from('whatsapp_conversations').update({ unread_count: 0 }).eq('id', conversationId)
  if (error) throw error
}
