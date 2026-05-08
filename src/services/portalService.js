// Client Portal — service module.
// All login/OTP flows go through Edge Functions because they need
// the service role to issue tokens. The client (browser) never sees keys.
import { getSupabase } from '../lib/supabase.js'

export async function requestOtp(phone) {
  const sb = getSupabase()
  const { data, error } = await sb.functions.invoke('portal-otp-request', { body: { phone } })
  if (error) throw error
  return data
}

export async function verifyOtp(phone, code) {
  const sb = getSupabase()
  const { data, error } = await sb.functions.invoke('portal-otp-verify', { body: { phone, code } })
  if (error) throw error
  // The edge function returns access/refresh tokens — sign the supabase client in.
  if (data?.access_token && data?.refresh_token) {
    await sb.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token })
  }
  return data
}

export async function inviteClient({ clientId, phone, fullNameAr, email, isPrimary }) {
  const sb = getSupabase()
  const { data, error } = await sb.functions.invoke('portal-invite-client', {
    body: { client_id: clientId, phone, full_name_ar: fullNameAr, email, is_primary: !!isPrimary },
  })
  if (error) throw error
  return data
}

export async function listPortalUsers(clientId) {
  const sb = getSupabase()
  let q = sb.from('client_portal_users').select('*').order('created_at', { ascending: false })
  if (clientId) q = q.eq('client_id', clientId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function deactivatePortalUser(id) {
  const sb = getSupabase()
  const { error } = await sb.from('client_portal_users').update({ is_active: false }).eq('id', id)
  if (error) throw error
}

// Portal-side helpers (what an authenticated portal user can fetch)
export async function getMyClient() {
  const sb = getSupabase()
  const { data: clientId, error: e1 } = await sb.rpc('portal_my_client_id')
  if (e1) throw e1
  if (!clientId) return null
  const { data, error } = await sb.from('clients').select('*, person:persons(name_ar, name_en, phone_primary, id_number)').eq('id', clientId).single()
  if (error) throw error
  return data
}

export async function getDashboardCounts() {
  const sb = getSupabase()
  const { data, error } = await sb.rpc('portal_dashboard_counts')
  if (error) throw error
  return data?.[0] || { active_transactions: 0, unpaid_invoices: 0, unpaid_amount: 0, expiring_documents: 0 }
}

export async function listMyTransactions() {
  const sb = getSupabase()
  const { data: clientId } = await sb.rpc('portal_my_client_id')
  if (!clientId) return []
  const { data, error } = await sb.from('transactions').select('*').eq('client_id', clientId).is('deleted_at', null).order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function listMyInvoices() {
  const sb = getSupabase()
  const { data: clientId } = await sb.rpc('portal_my_client_id')
  if (!clientId) return []
  const { data, error } = await sb.from('invoices').select('*').eq('client_id', clientId).is('deleted_at', null).order('issue_date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function listMyUploads() {
  const sb = getSupabase()
  const { data: clientId } = await sb.rpc('portal_my_client_id')
  if (!clientId) return []
  const { data, error } = await sb.from('client_portal_uploads').select('*').eq('client_id', clientId).order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function uploadDocument({ file, documentType, descriptionAr, referenceType, referenceId }) {
  const sb = getSupabase()
  const { data: clientId } = await sb.rpc('portal_my_client_id')
  if (!clientId) throw new Error('غير مصرح')
  const path = `portal-uploads/${clientId}/${Date.now()}_${file.name}`
  const { error: upErr } = await sb.storage.from('portal-uploads').upload(path, file, { cacheControl: '3600', upsert: false })
  if (upErr) throw upErr
  const { data: pub } = sb.storage.from('portal-uploads').getPublicUrl(path)
  const { data, error } = await sb.from('client_portal_uploads').insert({
    client_id: clientId,
    file_url: pub?.publicUrl || path,
    file_name: file.name,
    file_size_bytes: file.size,
    mime_type: file.type,
    document_type: documentType || null,
    description_ar: descriptionAr || null,
    reference_type: referenceType || null,
    reference_id: referenceId || null,
    status: 'pending',
  }).select().single()
  if (error) throw error
  return data
}

export async function listPendingUploads() {
  const sb = getSupabase()
  const { data, error } = await sb.from('client_portal_uploads').select('*, client:clients(id, person:persons(name_ar))').eq('status', 'pending').order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function reviewUpload(id, { status, rejection_reason }) {
  const sb = getSupabase()
  const { data, error } = await sb.from('client_portal_uploads').update({
    status,
    rejection_reason: rejection_reason || null,
    reviewed_at: new Date().toISOString(),
  }).eq('id', id).select().single()
  if (error) throw error
  return data
}
