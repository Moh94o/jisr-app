// Packs qiwa-sync-extension/ into qiwa-sync-extension.zip for the Chrome Web Store.
// Dependency-free (node:zlib + a minimal zip writer). Only the files the extension
// actually loads are included — no README/STORE.md/build.mjs.
//
// Run:  npm run pack:ext
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { deflateRawSync, crc32 } from 'node:zlib'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = join(root, 'qiwa-sync-extension')

// sweep.generated.js is derived from the bookmarklet — regenerate so the package never ships stale.
execFileSync(process.execPath, [join(dir, 'build.mjs')], { stdio: 'inherit' })

const files = ['manifest.json', 'background.js', 'login.js', 'bridge.js', 'sweep.generated.js', 'popup.html', 'popup.js']
for (const f of readdirSync(join(dir, 'icons'))) if (f.endsWith('.png')) files.push('icons/' + f)

const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'))
for (const f of files) if (!existsSync(join(dir, f))) throw new Error('pack: missing ' + f)
for (const i of Object.values(manifest.icons || {})) if (!files.includes(i)) throw new Error('pack: manifest icon not packed: ' + i)

const entries = []
const chunks = []
let offset = 0
const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b }
const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return b }
for (const name of files) {
  const data = readFileSync(join(dir, name))
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
console.log(`packed ${files.length} files → ${out} (v${manifest.version})`)
