// Packs the LOGIN-ONLY Chrome Web Store build of qiwa-sync-extension/ into
// qiwa-sync-extension.zip. Dependency-free (node:zlib + a minimal zip writer).
//
// The store package is deliberately narrower than the dev extension: only the
// «الدخول لقوى» feature (login.js + bridge.js). The sync sweep, the cookie bridge,
// the popup and the Supabase/cookies/declarativeNetRequest permissions stay out —
// the store listing describes login only, and undisclosed functionality is a
// Web Store policy violation. The full extension (sync + login) is still loaded
// unpacked from qiwa-sync-extension/ as before.
//
// Run:  npm run pack:ext
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { deflateRawSync, crc32 } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'qiwa-sync-extension')
const dev = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'))

// Store build only listens on the production Jisr origin (no localhost).
const PROD_ORIGINS = dev.content_scripts[0].matches.filter((m) => m.startsWith('https://'))
if (!PROD_ORIGINS.length) throw new Error('pack: no https Jisr origin in content_scripts.matches')

const manifest = {
  manifest_version: 3,
  name: 'جسر — الدخول لقوى',
  version: dev.version,
  description: 'تسجيل الدخول إلى قوى من داخل جسر برقم الهوية وكلمة المرور ورمز الجوال.',
  permissions: ['storage', 'cookies', 'declarativeNetRequest', 'webRequest'],
  host_permissions: ['https://*.qiwa.sa/*'],
  icons: dev.icons,
  background: { service_worker: 'background.js', type: 'module' },
  content_scripts: [{ matches: PROD_ORIGINS, js: ['bridge.js'], run_at: 'document_start' }],
}

const files = [
  { name: 'manifest.json', data: Buffer.from(JSON.stringify(manifest, null, 2) + '\n') },
  { name: 'background.js', data: Buffer.from("import './login.js'\n") },
]
for (const f of ['login.js', 'bridge.js']) {
  if (!existsSync(join(dir, f))) throw new Error('pack: missing ' + f)
  files.push({ name: f, data: readFileSync(join(dir, f)) })
}
for (const f of readdirSync(join(dir, 'icons'))) if (f.endsWith('.png')) files.push({ name: 'icons/' + f, data: readFileSync(join(dir, 'icons', f)) })
for (const i of Object.values(manifest.icons || {})) if (!files.some((f) => f.name === i)) throw new Error('pack: manifest icon not packed: ' + i)

const entries = []
const chunks = []
let offset = 0
const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b }
const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return b }
for (const { name, data } of files) {
  const comp = deflateRawSync(data, { level: 9 })
  const crc = crc32(data)
  const nameBuf = Buffer.from(name, 'utf8')
  // 0x0800 = UTF-8 names; fixed DOS date 2026-01-01 so the zip is reproducible.
  const local = Buffer.concat([u32(0x04034b50), u16(20), u16(0x0800), u16(8), u16(0), u16(0x5A21), u32(crc), u32(comp.length), u32(data.length), u16(nameBuf.length), u16(0), nameBuf])
  chunks.push(local, comp)
  entries.push({ nameBuf, crc, csize: comp.length, size: data.length, offset })
  offset += local.length + comp.length
}
const cdStart = offset
for (const e of entries) {
  const cd = Buffer.concat([u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(8), u16(0), u16(0x5A21), u32(e.crc), u32(e.csize), u32(e.size), u16(e.nameBuf.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(e.offset), e.nameBuf])
  chunks.push(cd)
  offset += cd.length
}
chunks.push(Buffer.concat([u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length), u32(offset - cdStart), u32(cdStart), u16(0)]))

const out = join(root, 'qiwa-sync-extension.zip')
writeFileSync(out, Buffer.concat(chunks))
console.log(`packed ${files.length} files (login-only) → ${out} (v${manifest.version}, origins: ${PROD_ORIGINS.join(', ')})`)
