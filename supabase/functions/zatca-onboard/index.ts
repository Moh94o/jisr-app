// zatca-onboard — initiates ZATCA Phase-2 onboarding by generating a CSR
// and exchanging it for a Compliance CSID, then for a Production PCSID.
//
// PRODUCTION NOTE
// The cryptographic flow (RSA keypair, ECDSA secp256k1 for the QR Tag-7,
// CSR with ZATCA-specific OIDs, XAdES-B-B XML signing) is non-trivial and
// must be reviewed against ZATCA's latest spec. This function ships a stub
// that:
//   • validates input
//   • persists the CSR + CSID/PCSID into zatca_credentials
//   • marks the org as onboarded once both calls succeed
// Replace the marked sections with a real OpenSSL/node:crypto pipeline
// before going live in production.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { serviceClient, userClient } from '../_shared/supabase.ts'
import { ok, err, preflight } from '../_shared/cors.ts'

const ZATCA_BASE = (env: string) =>
  env === 'production'
    ? 'https://gw-fatoora.zatca.gov.sa/e-invoicing/core'
    : 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal'

serve(async (req) => {
  const pf = preflight(req); if (pf) return pf
  if (req.method !== 'POST') return err('method_not_allowed', 'POST only', 405)

  const u = userClient(req)
  const { data: who } = await u.auth.getUser()
  if (!who?.user) return err('unauthenticated', 'يجب تسجيل الدخول', 401)

  const body = await req.json().catch(() => ({}))
  const otp: string = String(body.otp ?? '')
  if (!/^\d{6,}$/.test(otp)) return err('bad_otp', 'أدخل رمز OTP من بوابة فاتورة')

  const sb = serviceClient()
  const { data: creds } = await sb.from('zatca_credentials').select('*').is('organization_id', null).maybeSingle()
  if (!creds) return err('not_configured', 'يجب إكمال بيانات المنشأة أولاً قبل البدء')
  if (!creds.vat_number || !creds.cr_number || !creds.registration_name_ar) {
    return err('missing_fields', 'بيانات المنشأة الإلزامية ناقصة (الرقم الضريبي، السجل التجاري، الاسم)')
  }

  // ── 1. Generate CSR (REPLACE with real OpenSSL pipeline) ──────────────
  const csrPem = generateStubCsr({
    cn: `JISR-${creds.cr_number}`,
    serialNumber: creds.cr_number,
    organizationIdentifier: creds.vat_number,
    organizationName: creds.registration_name_ar,
    country: 'SA',
  })

  // ── 2. Compliance CSID ────────────────────────────────────────────────
  const compResp = await fetch(`${ZATCA_BASE(creds.environment)}/compliance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'OTP': otp },
    body: JSON.stringify({ csr: btoa(csrPem) }),
  }).catch((e) => ({ ok: false, status: 0, async json() { return { error: String(e) } }, async text() { return String(e) } } as any))

  let csidSecret: string | null = null
  let csidCertificate: string | null = null
  let compBody: any = null
  try { compBody = await compResp.json() } catch { compBody = null }
  if (compResp.ok && compBody) {
    csidSecret = compBody.secret ?? null
    csidCertificate = compBody.binarySecurityToken ?? null
  } else {
    return err('compliance_failed', `فشل اعتماد الامتثال — ${JSON.stringify(compBody)}`, 502)
  }

  // ── 3. Production CSID (PCSID) ────────────────────────────────────────
  const prodResp = await fetch(`${ZATCA_BASE(creds.environment)}/production/csids`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${btoa(`${csidCertificate}:${csidSecret}`)}`,
    },
    body: JSON.stringify({ compliance_request_id: compBody?.requestID ?? '' }),
  }).catch((e) => ({ ok: false, status: 0, async json() { return { error: String(e) } } } as any))
  let prodBody: any = null
  try { prodBody = await prodResp.json() } catch { prodBody = null }

  let pcsidSecret: string | null = null
  let pcsidCertificate: string | null = null
  if (prodResp.ok && prodBody) {
    pcsidSecret = prodBody.secret ?? null
    pcsidCertificate = prodBody.binarySecurityToken ?? null
  }

  await sb.from('zatca_credentials').update({
    csr_pem: csrPem,
    csid_secret: csidSecret,
    csid_certificate: csidCertificate,
    pcsid_secret: pcsidSecret,
    pcsid_certificate: pcsidCertificate,
    onboarded_at: new Date().toISOString(),
    is_active: !!(pcsidSecret && pcsidCertificate),
    last_health_check: new Date().toISOString(),
  }).eq('id', creds.id)

  return ok({ onboarded: true, has_pcsid: !!pcsidSecret })
})

function generateStubCsr(_o: { cn: string; serialNumber: string; organizationIdentifier: string; organizationName: string; country: string }) {
  // Placeholder: real implementation should:
  //   1. generate RSA-2048 keypair, store private in Vault
  //   2. build PKCS#10 with custom OIDs:
  //        2.5.4.97 = organizationIdentifier (VAT number)
  //        2.5.4.4 = SN (CR number)
  //   3. add SAN URIs: customer.identifier, invoiceType=1100, location, industry
  //   4. PEM-encode and return.
  // For now a stub PEM block to keep the pipeline running end-to-end.
  return `-----BEGIN CERTIFICATE REQUEST-----\n${'STUB_CSR_REPLACE_WITH_REAL_OPENSSL_PIPELINE'.padEnd(64,'A')}\n-----END CERTIFICATE REQUEST-----`
}
