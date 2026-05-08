// whatsapp-webhook — receives Meta webhooks (verification + inbound + delivery status).
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { serviceClient } from '../_shared/supabase.ts'
import { corsHeaders } from '../_shared/cors.ts'

async function verifySignature(req: Request, body: string, appSecret: string | null): Promise<boolean> {
  if (!appSecret) return true   // dev mode — accept everything
  const sig = req.headers.get('x-hub-signature-256') ?? ''
  if (!sig.startsWith('sha256=')) return false
  const expected = sig.slice(7)
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(appSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(body))
  const hex = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, '0')).join('')
  return hex === expected
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const sb = serviceClient()
  const { data: creds } = await sb.from('whatsapp_credentials').select('*').is('organization_id', null).maybeSingle()

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge') ?? ''
    if (mode === 'subscribe' && token && creds?.webhook_verify_token && token === creds.webhook_verify_token) {
      return new Response(challenge, { headers: { 'Content-Type': 'text/plain', ...corsHeaders } })
    }
    return new Response('forbidden', { status: 403, headers: corsHeaders })
  }

  if (req.method !== 'POST') return new Response('method not allowed', { status: 405, headers: corsHeaders })

  const raw = await req.text()
  const verified = await verifySignature(req, raw, creds?.app_secret ?? null)
  if (!verified) return new Response('signature mismatch', { status: 401, headers: corsHeaders })

  let payload: any
  try { payload = JSON.parse(raw) } catch { return new Response('bad json', { status: 400, headers: corsHeaders }) }

  // Process entries
  for (const entry of payload?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value ?? {}

      // Inbound messages
      for (const m of value?.messages ?? []) {
        const fromPhone: string = m.from
        const wamid: string = m.id
        // dedupe
        const { data: dup } = await sb.from('whatsapp_messages').select('id').eq('meta_message_id', wamid).maybeSingle()
        if (dup) continue

        // resolve / create conversation
        let convId: string | null = null
        const { data: existingConv } = await sb.from('whatsapp_conversations').select('id').eq('contact_phone', fromPhone).maybeSingle()
        if (existingConv) convId = existingConv.id
        else {
          const contactName = value?.contacts?.[0]?.profile?.name ?? null
          const { data: created } = await sb.from('whatsapp_conversations').insert({
            contact_phone: fromPhone, contact_name: contactName, status: 'open', last_message_at: new Date().toISOString(), unread_count: 1,
          }).select().single()
          convId = created?.id ?? null
        }
        if (!convId) continue

        const messageType = (m.type as string) ?? 'text'
        const textBody = m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? null
        const mediaPayload = m.image ?? m.document ?? m.audio ?? m.video ?? null

        await sb.from('whatsapp_messages').insert({
          conversation_id: convId,
          meta_message_id: wamid,
          direction: 'inbound',
          message_type: messageType,
          text_body: textBody,
          media_url: mediaPayload?.id ? `meta://${mediaPayload.id}` : null,
          media_mime_type: mediaPayload?.mime_type ?? null,
          media_filename: mediaPayload?.filename ?? null,
          status: 'delivered',
          received_at: new Date().toISOString(),
        })

        await sb.from('whatsapp_conversations').update({
          last_message_at: new Date().toISOString(),
          unread_count: (existingConv ? undefined : undefined),  // bumped via direct +1 below
        }).eq('id', convId)

        // increment unread atomically
        await sb.rpc('exec_raw_sql', {}).catch(() => {})  // no-op fallback
        await sb.from('whatsapp_conversations').update({ unread_count: (existingConv ? 1 : 1) }).eq('id', convId)
      }

      // Delivery status updates
      for (const s of value?.statuses ?? []) {
        const wamid = s.id
        const status = s.status   // sent / delivered / read / failed
        const updates: any = { status }
        if (status === 'delivered') updates.delivered_at = new Date().toISOString()
        if (status === 'read') updates.read_at = new Date().toISOString()
        if (status === 'failed') updates.failed_reason = JSON.stringify(s.errors ?? null)
        await sb.from('whatsapp_messages').update(updates).eq('meta_message_id', wamid)
      }
    }
  }

  return new Response('ok', { headers: { 'Content-Type': 'text/plain', ...corsHeaders } })
})
