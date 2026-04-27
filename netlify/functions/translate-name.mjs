// Transliterate Saudi personal names between Arabic and English using Claude.
// Returns { translated } on success, or { translated: null } when the API key
// is missing or the call fails — the frontend keeps the field as-is in that
// case, letting the user type manually.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body, statusCode = 200) => ({
  statusCode,
  headers: { ...cors, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

const SYSTEM_PROMPT = `You convert Saudi personal names between Arabic and English. Output the most common, idiomatic spelling that a Saudi person would actually use on their passport, ID, or LinkedIn — NOT a literal letter-by-letter transliteration.

Hard rules:
- No hyphens, no diacritics, no quotes, no punctuation.
- Capitalize each English word (Title Case).
- Preserve word count and word order.
- Tribal/family "ال" prefix becomes "Al" attached to the next word: اليامي → Alyami, القحطاني → Alqahtani, الغامدي → Alghamdi, الحربي → Alharbi, الشهري → Alshehri, العتيبي → Alotaibi, الدوسري → Aldosari, الزهراني → Alzahrani, الشمري → Alshammari, الرشيدي → Alrashidi.
- Use the standard Saudi/Gulf spelling for given names — never invent letter maps:
  محمد → Mohammed, أحمد → Ahmed, علي → Ali, خالد → Khalid, سعد → Saad, يوسف → Yousef, إبراهيم → Ibrahim, سلمان → Salman, فيصل → Faisal, عبدالله → Abdullah, عبدالرحمن → Abdulrahman, عبدالعزيز → Abdulaziz, طلال → Talal, فهد → Fahad, ماجد → Majed, بدر → Badr, ناصر → Nasser, سعود → Saud, تركي → Turki, مهدي → Mahdi, هاني → Hani, زياد → Ziyad, راكان → Rakan, ريان → Rayan, نواف → Nawaf, مشعل → Meshal, سلطان → Sultan, وليد → Waleed, عمر → Omar, زيد → Zaid, حسن → Hassan, حسين → Hussain, جابر → Jaber, سامي → Sami, عادل → Adel, مازن → Mazen, ياسر → Yasser, فاطمة → Fatima, عائشة → Aisha, مريم → Mariam, سارة → Sarah, نورة → Noura, هند → Hind, ريم → Reem, لمى → Lama, دانة → Dana, شهد → Shahad, جوري → Jouri, ليان → Layan.
- For names not in the list, follow the same conventions: short vowels usually become a/e/i/o/u based on standard pronunciation (not silent), final ي → i, final ة → a, ش → sh, خ → kh, ظ/ض → z/d, ع → drop or use single quote (prefer drop in everyday names), غ → gh, ث → th, ذ → dh.
- When converting English → Arabic, output the standard Arabic form a Saudi would write on official documents (no Latin letters, no numbers).

Reply with ONLY the converted name on a single line. No prose, no quotes, no punctuation, no explanation.`

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' }
  if (event.httpMethod !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  let body
  try { body = JSON.parse(event.body || '{}') } catch { return json({ error: 'bad_json' }, 400) }

  const text = String(body.text || '').trim()
  const source = body.source === 'en' ? 'en' : 'ar'
  if (!text) return json({ translated: null, reason: 'empty_text' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return json({ translated: null, reason: 'no_key' })

  const direction = source === 'ar' ? 'Arabic to English' : 'English to Arabic'
  const userPrompt = `Transliterate this name from ${direction}:\n${text}`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 50,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })
    if (!res.ok) return json({ translated: null, reason: 'api_error', status: res.status })
    const data = await res.json()
    const reply = (data.content || []).map(c => c.text || '').join('').trim()
    if (!reply) return json({ translated: null, reason: 'empty_reply' })

    const cleaned = reply.split('\n')[0].replace(/^["'`]+|["'`.,;:!?]+$/g, '').trim()
    if (!cleaned) return json({ translated: null, reason: 'empty_after_clean' })

    if (source === 'ar' && !/^[a-zA-Z\s'-]+$/.test(cleaned)) return json({ translated: null, reason: 'bad_charset', raw: reply })
    if (source === 'en' && !/^[\u0600-\u06FF\s]+$/.test(cleaned)) return json({ translated: null, reason: 'bad_charset', raw: reply })

    return json({ translated: cleaned, source: 'claude' })
  } catch (e) {
    return json({ translated: null, reason: 'exception', error: String(e.message || e).slice(0, 200) })
  }
}
