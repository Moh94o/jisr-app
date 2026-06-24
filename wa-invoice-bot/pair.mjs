// One-time pairing helper: brings up the WhatsApp session (LocalAuth, same path the
// real bot uses) and writes the QR as a PNG data URL + lifecycle status to files so the
// agent can display the QR in chat and detect when pairing completes. Stop after READY.
import pkg from 'whatsapp-web.js'
const { Client, LocalAuth } = pkg
import QRCode from 'qrcode'
import qrt from 'qrcode-terminal'
import fs from 'fs'

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] },
})

client.on('qr', async q => {
  try {
    const dataUrl = await QRCode.toDataURL(q, { width: 320, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
    fs.writeFileSync('qr.dataurl.txt', dataUrl)
    fs.writeFileSync('qr.txt', q)
    fs.writeFileSync('status.txt', 'QR ' + new Date().toISOString())
    console.clear()
    console.log('\n  امسح هذا الرمز بجوال رقم المكتب:')
    console.log('  WhatsApp ← Linked Devices ← Link a device\n')
    qrt.generate(q, { small: true })
    console.log('\n  (يتجدد تلقائياً — انتظر حتى يكتمل الربط)')
  } catch (e) { console.log('qr err', e.message) }
})
client.on('authenticated', () => { fs.writeFileSync('status.txt', 'AUTHENTICATED'); console.log('[auth] ok') })
client.on('auth_failure', m => { fs.writeFileSync('status.txt', 'AUTH_FAILURE ' + m); console.log('[auth] fail', m) })
client.on('ready', async () => {
  try {
    const chats = await client.getChats()
    const groups = chats.filter(c => c.isGroup).map(g => ({ name: g.name, id: g.id._serialized }))
    fs.writeFileSync('groups.json', JSON.stringify(groups, null, 2))
    fs.writeFileSync('status.txt', 'READY')
    console.log('[ready] groups=', groups.length)
  } catch (e) { console.log('ready err', e.message) }
})
client.on('disconnected', r => { fs.writeFileSync('status.txt', 'DISCONNECTED ' + r) })

console.log('pairing started — waiting for QR…')
client.initialize()
