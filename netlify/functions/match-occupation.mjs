// Match a free-text occupation (e.g. from Muqeem) to the closest entry in the
// occupations table using Claude. Accepts a raw text + the candidate list and
// returns the matching id + name. Falls back to an exact/substring match when
// the API key is missing or the call fails.

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

function localFallback(raw, occupations) {
  const r = String(raw || '').trim()
  if (!r || !Array.isArray(occupations) || !occupations.length) return null
  const rLower = r.toLowerCase()
  const exact = occupations.find(o => (o.name_ar || '').trim() === r || (o.name_en || '').toLowerCase() === rLower)
  if (exact) return exact
  const contains = occupations.find(o => (o.name_ar || '').includes(r) || r.includes(o.name_ar || '') || (o.name_en && rLower.includes(o.name_en.toLowerCase())))
  return contains || null
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' }
  if (event.httpMethod !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  let body
  try { body = JSON.parse(event.body || '{}') } catch { return json({ error: 'bad_json' }, 400) }

  const raw = String(body.raw || '').trim()
  const occupations = Array.isArray(body.occupations) ? body.occupations : []
  if (!raw) return json({ match: null, reason: 'empty_raw' })
  if (!occupations.length) return json({ match: null, reason: 'empty_list' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    const fb = localFallback(raw, occupations)
    return json({ match: fb, source: 'fallback_no_key' })
  }

  // Keep the list compact — only id + Arabic + English names.
  const list = occupations.slice(0, 1200).map(o => ({
    id: o.id,
    ar: o.name_ar || '',
    en: o.name_en || '',
  }))

  const prompt = `You are matching an Arabic occupation title (returned by a Saudi government system called Muqeem) to the closest entry in our occupations table.

Input occupation: "${raw}"

Candidate occupations (pick the single best match by meaning, not just text similarity):
${list.map((o, i) => `${i + 1}. id=${o.id} | ar="${o.ar}"${o.en ? ` | en="${o.en}"` : ''}`).join('\n')}

Rules:
- Match semantically (e.g. "سائق" matches "سائق خاص" or "سائق نقل" — pick the most generic/common one when the input is ambiguous).
- If none of the candidates plausibly represents the input, return null.
- Reply with ONLY a JSON object on a single line, no prose, no code fences.

Reply format:
{"id":"<uuid-or-null>","confidence":<0-1>}`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-7',
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      const fb = localFallback(raw, occupations)
      return json({ match: fb, source: 'fallback_api_error', status: res.status, error: errBody.slice(0, 300) })
    }
    const data = await res.json()
    const text = (data.content || []).map(c => c.text || '').join('').trim()
    const jsonMatch = text.match(/\{[^}]+\}/)
    if (!jsonMatch) {
      const fb = localFallback(raw, occupations)
      return json({ match: fb, source: 'fallback_parse_error', raw_reply: text.slice(0, 200) })
    }
    let parsed
    try { parsed = JSON.parse(jsonMatch[0]) } catch {
      const fb = localFallback(raw, occupations)
      return json({ match: fb, source: 'fallback_json_error' })
    }
    if (!parsed.id || parsed.id === 'null') return json({ match: null, source: 'claude_no_match', confidence: parsed.confidence })
    const conf = typeof parsed.confidence === 'number' ? parsed.confidence : 0
    if (conf < 0.5) return json({ match: null, source: 'claude_low_confidence', confidence: conf })
    const matched = occupations.find(o => o.id === parsed.id)
    if (!matched) return json({ match: null, source: 'claude_unknown_id' })
    return json({ match: matched, source: 'claude', confidence: conf })
  } catch (e) {
    const fb = localFallback(raw, occupations)
    return json({ match: fb, source: 'fallback_exception', error: String(e.message || e).slice(0, 200) })
  }
}
