import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// Dev-only middleware that runs the same Netlify function locally.
// In production Netlify hosts the function at /.netlify/functions/* — this
// plugin mirrors that route during `vite dev` so we don't need `netlify dev`.
const netlifyFunctionsDevPlugin = () => ({
  name: 'netlify-functions-dev',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url || !req.url.startsWith('/.netlify/functions/')) return next()
      const slug = req.url.split('?')[0].replace('/.netlify/functions/', '')
      if (!/^[\w-]+$/.test(slug)) return next()

      const fnFile = path.resolve(process.cwd(), 'netlify', 'functions', `${slug}.mjs`)
      let mod
      try {
        mod = await import(`${pathToFileURL(fnFile).href}?t=${Date.now()}`)
      } catch (e) {
        return next()
      }
      if (typeof mod.handler !== 'function') return next()

      let raw = ''
      req.setEncoding('utf8')
      req.on('data', chunk => { raw += chunk })
      req.on('end', async () => {
        try {
          const result = await mod.handler({ httpMethod: req.method, body: raw, headers: req.headers })
          res.statusCode = result.statusCode || 200
          for (const [k, v] of Object.entries(result.headers || {})) res.setHeader(k, v)
          res.end(result.body || '')
        } catch (e) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'dev middleware: ' + (e?.message || String(e)) }))
        }
      })
      req.on('error', err => {
        res.statusCode = 500
        res.end(JSON.stringify({ error: 'request error: ' + err.message }))
      })
    })
  },
})

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const k of ['ANTHROPIC_API_KEY']) {
    if (env[k] && !process.env[k]) process.env[k] = env[k]
  }
  return {
    plugins: [react(), netlifyFunctionsDevPlugin()],
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-charts': ['recharts'],
            'vendor-supabase': ['@supabase/supabase-js']
          }
        }
      }
    }
  }
})
