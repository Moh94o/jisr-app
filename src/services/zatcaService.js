// ZATCA service — wraps Supabase calls for the e-invoicing module.
// The actual signing & submission to ZATCA happens in Edge Functions
// (zatca-sign-and-submit / zatca-onboard) which require the private key
// material that lives in Supabase Vault.
import { getSupabase } from '../lib/supabase.js'

export async function getCredentials() {
  const sb = getSupabase()
  const { data, error } = await sb.from('zatca_credentials').select('*').is('organization_id', null).maybeSingle()
  if (error) throw error
  return data
}

export async function upsertCredentials(payload) {
  const sb = getSupabase()
  const existing = await getCredentials()
  if (existing) {
    const { data, error } = await sb.from('zatca_credentials').update(payload).eq('id', existing.id).select().single()
    if (error) throw error
    return data
  }
  const { data, error } = await sb.from('zatca_credentials').insert({ organization_id: null, ...payload }).select().single()
  if (error) throw error
  return data
}

export async function listZatcaInvoices({ status, from, to, limit = 100 } = {}) {
  const sb = getSupabase()
  let q = sb.from('zatca_invoices').select('*').order('created_at', { ascending: false }).limit(limit)
  if (status) q = q.eq('status', status)
  if (from) q = q.gte('created_at', from)
  if (to) q = q.lte('created_at', to)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function getZatcaInvoice(id) {
  const sb = getSupabase()
  const { data, error } = await sb.from('zatca_invoices').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function getApiLog(zatcaInvoiceId, limit = 20) {
  const sb = getSupabase()
  const { data, error } = await sb.from('zatca_api_log').select('*')
    .eq('zatca_invoice_id', zatcaInvoiceId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

// Calls the zatca-sign-and-submit Edge Function (must be deployed separately).
export async function submitInvoice(invoiceId) {
  const sb = getSupabase()
  const { data, error } = await sb.functions.invoke('zatca-sign-and-submit', {
    body: { invoice_id: invoiceId },
  })
  if (error) throw error
  return data
}

export async function retryFailed(zatcaInvoiceId) {
  const sb = getSupabase()
  const { data, error } = await sb.functions.invoke('zatca-sign-and-submit', {
    body: { zatca_invoice_id: zatcaInvoiceId, retry: true },
  })
  if (error) throw error
  return data
}

export async function startOnboarding({ otp }) {
  const sb = getSupabase()
  const { data, error } = await sb.functions.invoke('zatca-onboard', {
    body: { otp },
  })
  if (error) throw error
  return data
}

// Simple ZATCA QR generator (TLV) — used as a pre-signing fallback so the UI
// can show a working QR for new invoices that haven't gone through the
// edge function yet. ZATCA Phase 2 requires the additional Tag 6/7/8/9 from
// the signed XML; that part is filled in once the edge function returns.
function tlv(tag, value) {
  const enc = new TextEncoder().encode(value)
  const out = new Uint8Array(enc.length + 2)
  out[0] = tag
  out[1] = enc.length
  out.set(enc, 2)
  return out
}

export function buildBasicQr({ sellerName, vatNumber, isoTimestamp, totalWithVat, vatAmount }) {
  const parts = [
    tlv(1, sellerName || ''),
    tlv(2, vatNumber || ''),
    tlv(3, isoTimestamp || new Date().toISOString()),
    tlv(4, String(totalWithVat ?? 0)),
    tlv(5, String(vatAmount ?? 0)),
  ]
  const total = parts.reduce((s, p) => s + p.length, 0)
  const merged = new Uint8Array(total)
  let offset = 0
  for (const p of parts) { merged.set(p, offset); offset += p.length }
  // base64
  let bin = ''
  merged.forEach(b => { bin += String.fromCharCode(b) })
  return btoa(bin)
}
