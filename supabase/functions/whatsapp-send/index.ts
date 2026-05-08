// whatsapp-send — sends a WhatsApp message via Meta Cloud API.
// Body shape:
//   { to_phone, template_name, language?, variables: object, reference_type?, reference_id? }
//   { conversation_id, type: 'text', text }       (free text, only valid in 24h window)
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { serviceClient } from '../_shared/supabase.ts'
import { ok, err, preflight } from '../_shared/cors.ts'

const META_API = `https://graph.facebook.com/${Deno.env.get('META_GRAPH_API_VERSION') ?? 'v18.0'}`

serve(async (req) => {
  const pf = preflight(req); if (pf) return pf
  if (req.method !== 'POST') return err('method_not_allowed', 'POST only', 405)

  let body: any
  try { body = await req.json() } catch { return err('bad_json', 'Invalid JSON body') }

  const sb = serviceClient()
  const { data: creds } = await sb.from('whatsapp_credentials').select('*').is('organization_id', null).maybeSingle()
  if (!creds || !creds.is_active) return err('not_configured', 'WhatsApp credentials not configured or inactive', 400)
  const token = creds.access_token_secret
  if (!token) return err('no_token', 'access_token_secret missing', 400)

  // Resolve / create conversation
  let conversationId: string | null = body.conversation_id ?? null
  let toPhone: string | null = body.to_phone ?? null

  if (conversationId && !toPhone) {
    const { data: conv } = await sb.from('whatsapp_conversations').select('contact_phone').eq('id', conversationId).maybeSingle()
    toPhone = conv?.contact_phone ?? null
  }
  if (!toPhone) return err('no_recipient', 'Either to_phone or conversation_id is required')

  if (!conversationId) {
    const { data: conv } = await sb.from('whatsapp_conversations').select('id').eq('contact_phone', toPhone).maybeSingle()
    if (conv) conversationId = conv.id
    else {
      const { data: created, error: ce } = await sb.from('whatsapp_conversations').insert({
        contact_phone: toPhone, status: 'open', last_message_at: new Date().toISOString(),
      }).select().single()
      if (ce) return err('conv_create_failed', ce.message)
      conversationId = created!.id
    }
  }

  // Build Meta payload
  let metaPayload: any
  if (body.type === 'text' || body.text) {
    metaPayload = {
      messaging_product: 'whatsapp',
      to: toPhone.replace(/^\+/, ''),
      type: 'text',
      text: { body: String(body.text ?? '') },
    }
  } else if (body.template_name) {
    const lang = body.language ?? 'ar'
    const vars = body.variables ?? {}
    const params = Object.keys(vars)
      .sort((a, b) => Number(a) - Number(b))
      .map(k => ({ type: 'text', text: String(vars[k]) }))
    metaPayload = {
      messaging_product: 'whatsapp',
      to: toPhone.replace(/^\+/, ''),
      type: 'template',
      template: {
        name: body.template_name,
        language: { code: lang },
        components: params.length ? [{ type: 'body', parameters: params }] : [],
      }
    }
  } else {
    return err('bad_body', 'Either text or template_name required')
  }

  // Call Meta
  const resp = await fetch(`${META_API}/${creds.phone_number_id}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(metaPayload),
  })
  const respBody = await resp.json().catch(() => ({}))
  const wamid = respBody?.messages?.[0]?.id ?? null

  // Find template id (if any)
  let templateId: string | null = null
  if (body.template_name) {
    const { data: tpl } = await sb.from('whatsapp_templates').select('id').eq('name', body.template_name).eq('language', body.language ?? 'ar').maybeSingle()
    templateId = tpl?.id ?? null
  }

  // Persist message
  const { error: insErr } = await sb.from('whatsapp_messages').insert({
    conversation_id: conversationId,
    meta_message_id: wamid,
    direction: 'outbound',
    message_type: body.template_name ? 'template' : 'text',
    text_body: body.text ?? null,
    template_id: templateId,
    template_variables: body.variables ?? null,
    status: resp.ok ? 'sent' : 'failed',
    failed_reason: resp.ok ? null : JSON.stringify(respBody?.error ?? respBody),
    reference_type: body.reference_type ?? null,
    reference_id: body.reference_id ?? null,
    sent_at: new Date().toISOString(),
  })
  if (insErr) console.error('insert message failed', insErr)

  await sb.from('whatsapp_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId!)

  if (!resp.ok) return err('meta_error', JSON.stringify(respBody), 502)
  return ok({ wamid, conversation_id: conversationId })
})
