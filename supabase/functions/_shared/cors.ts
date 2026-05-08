// Shared CORS headers for edge functions called from the browser.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature-256',
}

export function ok<T>(data: T, init: ResponseInit = {}) {
  return new Response(JSON.stringify({ ok: true, data }), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...corsHeaders, ...(init.headers || {}) },
  })
}

export function err(code: string, message: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

export function preflight(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  return null
}
