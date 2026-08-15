// ops-chat-translate — ترجمة رسائل محادثة «اكسلات العمليات» إلى أي لغة.
//
// Body:
//   { text: string, target: 'ar'|'en'|'ur'|'hi'|'bn'|'ne'|'tl'|'id', message_id?: uuid }
// Response:
//   { ok: true, data: { text, source_lang, cached, provider } }
//
// الترجمات تُخزَّن في ops_chat_translations (message_id × lang) فلا تتكرّر الكلفة.
// المزوّد: Claude (ANTHROPIC_API_KEY) — يفهم مصطلحات العمل والأسماء العربية.
// احتياطي: Google Cloud Translation (GOOGLE_TRANSLATE_API_KEY) إن لم يوجد مفتاح Claude.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import Anthropic from 'npm:@anthropic-ai/sdk'
import { serviceClient } from '../_shared/supabase.ts'
import { ok, err, preflight } from '../_shared/cors.ts'

const LANG_NAMES: Record<string, string> = {
  ar: 'Arabic', en: 'English', ur: 'Urdu', hi: 'Hindi',
  bn: 'Bengali', ne: 'Nepali', tl: 'Filipino (Tagalog)', id: 'Indonesian',
}

const SYSTEM = `You translate short workplace chat messages for a Saudi labour-services company (visas, iqama renewal, sponsorship transfer, GOSI, Qiwa, Muqeem).

Rules:
- Output ONLY the translation. No preamble, no quotes, no notes, no explanation.
- Keep numbers, ID numbers, dates, invoice numbers, column names, and proper nouns exactly as written.
- Keep the tone of a short work message. Do not add or remove information.
- If the text is already in the target language, return it unchanged.
- Preserve any [row: …] / [column: …] reference markers verbatim.`

async function translateWithClaude(text: string, target: string, apiKey: string) {
  const client = new Anthropic({ apiKey })
  const params: any = {
    model: 'claude-opus-5',
    max_tokens: 4096,
    // ترجمة قصيرة: أقل جهد يكفي ويقلّل زمن الاستجابة داخل المحادثة.
    // المخطَّط يضمن حقلاً واحداً نظيفاً — بلا مقدّمات ولا بدايات مكرَّرة.
    output_config: {
      effort: 'low',
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: { translation: { type: 'string' } },
          required: ['translation'],
          additionalProperties: false,
        },
      },
    },
    system: SYSTEM,
    messages: [{
      role: 'user',
      content: `Translate the message below into ${LANG_NAMES[target] || target}.\n\n<message>\n${text}\n</message>`,
    }],
  }
  const res = await client.messages.create(params)
  if (res.stop_reason === 'refusal') throw new Error('translation_refused')
  const raw = (res.content || [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('')
    .trim()
  if (!raw) throw new Error('empty_translation')
  let out = raw
  try { out = String(JSON.parse(raw).translation ?? '').trim() } catch { /* نص عادي */ }
  if (!out) throw new Error('empty_translation')
  return out
}

async function translateWithGoogle(text: string, target: string, apiKey: string) {
  const r = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, target, format: 'text' }),
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(d?.error?.message || `google_http_${r.status}`)
  const t = d?.data?.translations?.[0]
  if (!t?.translatedText) throw new Error('empty_translation')
  return String(t.translatedText)
}

serve(async (req) => {
  const pf = preflight(req); if (pf) return pf
  if (req.method !== 'POST') return err('method_not_allowed', 'POST only', 405)

  let body: any
  try { body = await req.json() } catch { return err('bad_json', 'Invalid JSON body') }

  const text = String(body?.text ?? '').trim()
  const target = String(body?.target ?? '').trim()
  const messageId: string | null = body?.message_id ?? null
  if (!text) return err('no_text', 'text is required')
  if (!LANG_NAMES[target]) return err('bad_target', `target must be one of: ${Object.keys(LANG_NAMES).join(', ')}`)
  if (text.length > 6000) return err('too_long', 'Message too long to translate')

  const sb = serviceClient()

  // ذاكرة الترجمات: نفس الرسالة بنفس اللغة تُقرأ ولا تُترجم ثانية
  if (messageId) {
    const { data: hit } = await sb.from('ops_chat_translations')
      .select('text,provider').eq('message_id', messageId).eq('lang', target).maybeSingle()
    if (hit?.text) return ok({ text: hit.text, source_lang: null, cached: true, provider: hit.provider })
  }

  // المفاتيح: جدول app_secrets أولاً (يُقرأ بمفتاح الخدمة، ونقدر نحدّثه من SQL)،
  // ثم أسرار Supabase كاحتياطي. حذف الصف من app_secrets يُرجع القراءة للسرّ.
  const { data: secretRows } = await sb.from('app_secrets')
    .select('name,value').in('name', ['ANTHROPIC_API_KEY', 'GOOGLE_TRANSLATE_API_KEY'])
  const dbSecret = (n: string) => (secretRows || []).find((r: any) => r.name === n)?.value || null

  const anthropicKey = dbSecret('ANTHROPIC_API_KEY') || Deno.env.get('ANTHROPIC_API_KEY')
  const googleKey = dbSecret('GOOGLE_TRANSLATE_API_KEY') || Deno.env.get('GOOGLE_TRANSLATE_API_KEY')
  if (!anthropicKey && !googleKey) {
    return err('not_configured',
      'الترجمة غير مفعّلة — أضف ANTHROPIC_API_KEY في جدول app_secrets أو في أسرار Supabase.', 400)
  }

  let translated: string
  let provider: string
  try {
    if (anthropicKey) { translated = await translateWithClaude(text, target, anthropicKey); provider = 'claude' }
    else { translated = await translateWithGoogle(text, target, googleKey!); provider = 'google' }
  } catch (e) {
    // لو فشل Claude ووُجد مفتاح Google، جرّب الاحتياطي قبل الاستسلام
    if (anthropicKey && googleKey) {
      try { translated = await translateWithGoogle(text, target, googleKey); provider = 'google' }
      catch (e2) { return err('translate_failed', (e2 as Error).message, 502) }
    } else {
      return err('translate_failed', (e as Error).message, 502)
    }
  }

  if (messageId) {
    await sb.from('ops_chat_translations')
      .upsert({ message_id: messageId, lang: target, text: translated, provider }, { onConflict: 'message_id,lang' })
  }

  return ok({ text: translated, source_lang: null, cached: false, provider })
})
