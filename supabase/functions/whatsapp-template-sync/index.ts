// whatsapp-template-sync — pull approved templates from Meta and upsert.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { serviceClient } from '../_shared/supabase.ts'
import { ok, err, preflight } from '../_shared/cors.ts'

const META_API = `https://graph.facebook.com/${Deno.env.get('META_GRAPH_API_VERSION') ?? 'v18.0'}`

serve(async (req) => {
  const pf = preflight(req); if (pf) return pf
  const sb = serviceClient()
  const { data: creds } = await sb.from('whatsapp_credentials').select('*').is('organization_id', null).maybeSingle()
  if (!creds) return err('not_configured', 'WhatsApp credentials not set')

  const url = `${META_API}/${creds.business_account_id}/message_templates?limit=100`
  const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${creds.access_token_secret}` } })
  if (!resp.ok) return err('meta_error', await resp.text(), resp.status)
  const json: any = await resp.json()

  let upserted = 0
  for (const tpl of json?.data ?? []) {
    await sb.from('whatsapp_templates').upsert({
      organization_id: null,
      meta_template_id: tpl.id,
      name: tpl.name,
      category: tpl.category,
      language: tpl.language,
      status: tpl.status,
      components: tpl.components,
      variables_count: countVars(tpl.components),
      approved_at: tpl.status === 'APPROVED' ? new Date().toISOString() : null,
      rejected_reason: tpl.status === 'REJECTED' ? (tpl.rejected_reason ?? null) : null,
    }, { onConflict: 'organization_id,name,language' })
    upserted++
  }
  return ok({ upserted })
})

function countVars(components: any[]): number {
  let n = 0
  for (const c of components ?? []) {
    const text = (c?.text as string) ?? ''
    const matches = text.match(/\{\{\d+\}\}/g)
    if (matches) n = Math.max(n, matches.length)
  }
  return n
}
