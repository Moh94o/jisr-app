// zatca-sign-and-submit — generates UBL XML, attaches QR, calls Reporting/Clearance.
//
// PRODUCTION NOTE
// The actual UBL+XAdES signing requires a deterministic c14n11 implementation
// and ECDSA secp256k1 signature for QR Tag-7. This file ships a working
// pipeline that:
//   • produces a Phase-2 minimum UBL skeleton
//   • generates a basic TLV QR (Tags 1-5 only — sufficient for sandbox)
//   • POSTs to ZATCA's reporting endpoint and persists the response
// Replace the marked sections with real signing before going live.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { serviceClient, userClient } from '../_shared/supabase.ts'
import { ok, err, preflight } from '../_shared/cors.ts'

const ZATCA_BASE = (env: string) =>
  env === 'production'
    ? 'https://gw-fatoora.zatca.gov.sa/e-invoicing/core'
    : 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal'

function tlv(tag: number, value: string): Uint8Array {
  const bytes = new TextEncoder().encode(value)
  const out = new Uint8Array(bytes.length + 2)
  out[0] = tag; out[1] = bytes.length
  out.set(bytes, 2)
  return out
}

function tlvBase64(parts: Uint8Array[]): string {
  const total = parts.reduce((s, p) => s + p.length, 0)
  const merged = new Uint8Array(total)
  let off = 0
  for (const p of parts) { merged.set(p, off); off += p.length }
  let bin = ''
  merged.forEach(b => { bin += String.fromCharCode(b) })
  return btoa(bin)
}

async function sha256B64(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  let bin = ''
  new Uint8Array(buf).forEach(b => { bin += String.fromCharCode(b) })
  return btoa(bin)
}

serve(async (req) => {
  const pf = preflight(req); if (pf) return pf
  if (req.method !== 'POST') return err('method_not_allowed', 'POST only', 405)

  const u = userClient(req)
  const { data: who } = await u.auth.getUser()
  if (!who?.user) return err('unauthenticated', 'يجب تسجيل الدخول', 401)

  const body = await req.json().catch(() => ({}))
  const invoiceId = body.invoice_id as string
  const isRetry = !!body.retry
  const sb = serviceClient()

  const { data: creds } = await sb.from('zatca_credentials').select('*').is('organization_id', null).maybeSingle()
  if (!creds || !creds.is_active) return err('not_active', 'ZATCA غير مفعّل — أكمل onboarding أولاً')

  let invoice: any
  if (invoiceId) {
    const { data } = await sb.from('invoices').select('*').eq('id', invoiceId).maybeSingle()
    invoice = data
  } else if (body.zatca_invoice_id && isRetry) {
    const { data: zi } = await sb.from('zatca_invoices').select('*').eq('id', body.zatca_invoice_id).maybeSingle()
    if (zi) {
      const { data } = await sb.from('invoices').select('*').eq('id', zi.invoice_id).maybeSingle()
      invoice = data
    }
  }
  if (!invoice) return err('invoice_not_found', 'الفاتورة غير موجودة')

  // Resolve client info defensively
  let clientName = ''
  let clientPhone: string | null = null
  let clientVat: string | null = null
  if (invoice.client_id) {
    const { data: c } = await sb.from('clients').select('*, person:persons(name_ar, phone_primary)').eq('id', invoice.client_id).maybeSingle()
    clientName = c?.person?.name_ar ?? ''
    clientPhone = c?.person?.phone_primary ?? null
    clientVat = c?.vat_number ?? null
  }

  const totalWithVat = Number(invoice.total_amount ?? invoice.total ?? 0)
  const vatAmount = Number(invoice.vat_amount ?? 0)
  const issueDate = invoice.issue_date ?? invoice.invoice_date ?? new Date().toISOString().slice(0, 10)
  const isSimplified = !clientVat || totalWithVat < 1000

  // ICV / PIH
  const { data: icvData } = await sb.rpc('next_zatca_icv', { p_org_id: null })
  const icv = Number(icvData ?? 1)

  const { data: prevZi } = await sb.from('zatca_invoices').select('invoice_hash').is('organization_id', null).order('icv', { ascending: false }).limit(1).maybeSingle()
  const pih = prevZi?.invoice_hash ?? '0'.repeat(64)

  // Minimal UBL skeleton (REPLACE with full UBL 2.1 generator)
  const invoiceUuid = crypto.randomUUID()
  const ublXml = buildMinimalUbl({
    invoiceNumber: invoice.invoice_number ?? invoice.invoice_no ?? invoice.id,
    uuid: invoiceUuid,
    issueDate,
    sellerVat: creds.vat_number,
    sellerName: creds.registration_name_ar,
    buyerName: clientName,
    buyerPhone: clientPhone,
    totalWithVat,
    vatAmount,
    icv,
    pih,
    isSimplified,
  })

  const invoiceHash = await sha256B64(ublXml)

  // QR (Tags 1..5 only — sandbox-acceptable)
  const isoTs = new Date(issueDate + 'T00:00:00Z').toISOString()
  const qrBase64 = tlvBase64([
    tlv(1, creds.registration_name_ar ?? ''),
    tlv(2, creds.vat_number ?? ''),
    tlv(3, isoTs),
    tlv(4, totalWithVat.toFixed(2)),
    tlv(5, vatAmount.toFixed(2)),
  ])

  // Persist zatca_invoice row
  const { data: zi, error: insErr } = await sb.from('zatca_invoices').insert({
    organization_id: null,
    invoice_id: invoice.id,
    invoice_uuid: invoiceUuid,
    icv,
    pih,
    invoice_hash: invoiceHash,
    invoice_type_code: '388',
    is_simplified: isSimplified,
    xml_signed: ublXml,                   // for now: unsigned XML; replace with signed
    qr_base64: qrBase64,
    status: 'submitted',
    submitted_at: new Date().toISOString(),
  }).select().single()
  if (insErr) return err('persist_failed', insErr.message, 500)

  // Submit to ZATCA reporting endpoint
  const env = creds.environment ?? 'sandbox'
  const endpoint = isSimplified
    ? `${ZATCA_BASE(env)}/invoices/reporting/single`
    : `${ZATCA_BASE(env)}/invoices/clearance/single`
  const cert = env === 'production' ? creds.pcsid_certificate : creds.csid_certificate
  const secret = env === 'production' ? creds.pcsid_secret : creds.csid_secret
  const auth = `Basic ${btoa(`${cert ?? ''}:${secret ?? ''}`)}`

  const t0 = Date.now()
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', 'Accept-Language': 'ar', 'Accept-Version': 'V2',
      'Authorization': auth, ...(isSimplified ? {} : { 'Clearance-Status': '1' }),
    },
    body: JSON.stringify({ invoiceHash, uuid: invoiceUuid, invoice: btoa(ublXml) }),
  }).catch((e) => ({ ok: false, status: 0, async json() { return { error: String(e) } } } as any))
  const respBody = await resp.json().catch(() => ({}))
  const duration = Date.now() - t0

  await sb.from('zatca_api_log').insert({
    organization_id: null,
    zatca_invoice_id: zi.id,
    endpoint, http_method: 'POST',
    request_payload: { invoiceUuid, isSimplified },
    response_status: resp.status, response_body: respBody, duration_ms: duration,
  })

  let newStatus = 'failed'
  if (resp.status === 200) newStatus = isSimplified ? 'reported' : 'cleared'
  else if (resp.status === 202) newStatus = isSimplified ? 'reported' : 'cleared'

  await sb.from('zatca_invoices').update({
    status: newStatus,
    zatca_status_code: respBody?.clearanceStatus ?? respBody?.reportingStatus ?? null,
    zatca_warnings: respBody?.validationResults?.warningMessages ?? null,
    zatca_errors: respBody?.validationResults?.errorMessages ?? null,
    zatca_cleared_xml: respBody?.clearedInvoice ?? null,
    cleared_at: newStatus === 'cleared' ? new Date().toISOString() : null,
    reported_at: newStatus === 'reported' ? new Date().toISOString() : null,
    last_error: newStatus === 'failed' ? JSON.stringify(respBody?.validationResults?.errorMessages ?? respBody) : null,
    retry_count: isRetry ? (zi.retry_count ?? 0) + 1 : zi.retry_count,
  }).eq('id', zi.id)

  return ok({
    zatca_invoice_id: zi.id, status: newStatus, qr_base64: qrBase64,
    cleared: newStatus === 'cleared', reported: newStatus === 'reported',
  })
})

function buildMinimalUbl(p: {
  invoiceNumber: string; uuid: string; issueDate: string;
  sellerVat: string; sellerName: string; buyerName: string; buyerPhone: string | null;
  totalWithVat: number; vatAmount: number; icv: number; pih: string; isSimplified: boolean;
}): string {
  const taxable = p.totalWithVat - p.vatAmount
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${escapeXml(p.invoiceNumber)}</cbc:ID>
  <cbc:UUID>${p.uuid}</cbc:UUID>
  <cbc:IssueDate>${p.issueDate}</cbc:IssueDate>
  <cbc:IssueTime>00:00:00</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="${p.isSimplified ? '0200000' : '0100000'}">388</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>
  <cac:AdditionalDocumentReference><cbc:ID>ICV</cbc:ID><cbc:UUID>${p.icv}</cbc:UUID></cac:AdditionalDocumentReference>
  <cac:AdditionalDocumentReference><cbc:ID>PIH</cbc:ID><cac:Attachment><cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${p.pih}</cbc:EmbeddedDocumentBinaryObject></cac:Attachment></cac:AdditionalDocumentReference>
  <cac:AccountingSupplierParty><cac:Party>
    <cac:PartyTaxScheme><cbc:CompanyID>${escapeXml(p.sellerVat)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>
    <cac:PartyLegalEntity><cbc:RegistrationName>${escapeXml(p.sellerName)}</cbc:RegistrationName></cac:PartyLegalEntity>
  </cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party>
    <cac:PartyLegalEntity><cbc:RegistrationName>${escapeXml(p.buyerName ?? '')}</cbc:RegistrationName></cac:PartyLegalEntity>
  </cac:Party></cac:AccountingCustomerParty>
  <cac:TaxTotal><cbc:TaxAmount currencyID="SAR">${p.vatAmount.toFixed(2)}</cbc:TaxAmount></cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="SAR">${taxable.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="SAR">${taxable.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="SAR">${p.totalWithVat.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="SAR">${p.totalWithVat.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="PCE">1</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="SAR">${taxable.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item><cbc:Name>خدمة</cbc:Name></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="SAR">${taxable.toFixed(2)}</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>
</Invoice>`
}

function escapeXml(s: string): string {
  return String(s ?? '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]!))
}
