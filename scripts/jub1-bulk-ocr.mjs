#!/usr/bin/env node
/**
 * jub1-bulk-ocr — معالجة دفعية لصور سندات القبض اليدوية (JUB1).
 *
 * لكل صورة في المجلد:
 *   1. upload : رفع الصورة إلى التخزين + إنشاء صف jub1_receipts (مسودة) + ربط المرفق.
 *   2. submit : إرسال الصور إلى Claude عبر Batches API (نصف السعر) لقراءة الحقول.
 *   3. poll   : متابعة الدفعات حتى تنتهي وتطبيق النتائج على الصفوف (تعبئة الحقول).
 *   4. dupes  : تعليم أرقام السندات المكررة في review_note.
 *
 * الاستخدام:
 *   node scripts/jub1-bulk-ocr.mjs run    --dir "C:\\path\\to\\images" [--limit 8]
 *   node scripts/jub1-bulk-ocr.mjs status
 *   (أو مراحل منفصلة: upload / submit / poll / dupes بنفس الوسائط)
 *
 * الأسرار من scripts/.env.jub1 (انظر .env.jub1.example) أو من متغيرات البيئة:
 *   SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY  (+ اختيارياً SUPABASE_URL, IMAGES_DIR)
 *
 * قابل للاستئناف: الحالة تُحفظ في scripts/jub1-ocr-state.json — أعد التشغيل بأمان.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const here = path.dirname(fileURLToPath(import.meta.url))

// ── الإعداد ────────────────────────────────────────────────────────────────
loadDotEnv(path.join(here, '.env.jub1'))
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gcvshzutdslmdkwqwteh.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
const args = process.argv.slice(2)
const cmd = args[0] || 'status'
const argOf = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null }
const IMAGES_DIR = argOf('--dir') || process.env.IMAGES_DIR
const LIMIT = parseInt(argOf('--limit') || '0', 10) || Infinity
const STATE_FILE = path.join(here, 'jub1-ocr-state.json')
const JUB1_ENTITY = 'jub1_receipt'
const MODEL = 'claude-opus-4-8'
const BATCH_SIZE = 80          // صور لكل دفعة (حد الدفعة 256MB — بعد التصغير آمن جداً)
const MAX_EDGE = 2000          // تصغير أطول ضلع (يكفي لخط اليد ويخفض التكلفة)

if (!SERVICE_KEY) die('SUPABASE_SERVICE_ROLE_KEY غير موجود — ضعه في scripts/.env.jub1')
if (['submit', 'poll', 'run'].includes(cmd) && !ANTHROPIC_KEY) die('ANTHROPIC_API_KEY غير موجود — ضعه في scripts/.env.jub1')

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
const anthropic = ANTHROPIC_KEY ? new Anthropic({ apiKey: ANTHROPIC_KEY }) : null

// sharp اختياري — إن وُجد نصغّر الصور (يقلل التكلفة ويتفادى حد 5MB)، وإلا نرسل الأصل
let sharp = null
try { sharp = (await import('sharp')).default } catch { console.log('ℹ sharp غير مثبت — سترسل الصور بحجمها الأصلي (npm i -D sharp يُنصح به)') }

// ── مخطط الاستخراج + التعليمات (مطابق لدالة jub1-receipt-ocr) ─────────────
const buildSchema = (serviceNames) => ({
  type: 'object', additionalProperties: false,
  required: ['client_name', 'client_phone', 'client_id_no', 'agent_name', 'service_text', 'service_choice', 'quantity',
    'total_amount', 'receipt_amount', 'receipt_no', 'receipt_date', 'previous_receipt_nos', 'installments', 'uncertain_note'],
  properties: {
    client_name: { type: ['string', 'null'] },
    client_phone: { type: ['string', 'null'] },
    client_id_no: { type: ['string', 'null'] },
    agent_name: { type: ['string', 'null'] },
    service_text: { type: ['string', 'null'] },
    service_choice: serviceNames.length
      ? { anyOf: [{ type: 'null' }, { type: 'string', enum: serviceNames }], description: 'أقرب خدمة من قائمة النظام لما هو مكتوب على السند — null إن لم تستطع الجزم' }
      : { type: ['string', 'null'] },
    quantity: { type: ['integer', 'null'] },
    total_amount: { type: ['number', 'null'] },
    receipt_amount: { type: ['number', 'null'] },
    receipt_no: { type: ['string', 'null'] },
    receipt_date: { type: ['string', 'null'] },
    previous_receipt_nos: { type: 'array', items: { type: 'string' } },
    installments: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['label', 'amount'], properties: { label: { type: 'string' }, amount: { type: ['number', 'null'] } } } },
    uncertain_note: { type: ['string', 'null'] },
  },
})
const PROMPT = `هذه صورة سند قبض ورقي مكتوب بخط اليد (عربي) من مكتب خدمات عامة سعودي لخدمات العمالة (تأشيرات، نقل كفالة، تجديد إقامة…).
اقرأ السند بدقة واستخرج الحقول المطلوبة.

قواعد مهمة:
- أي حقل غير موجود أو غير مقروء بثقة ← أرجع null ولا تخمّن.
- الأرقام (جوال، هوية، مبالغ، أرقام سندات): حوّل الأرقام العربية ٠-٩ إلى إنجليزية 0-9.
- الجوال السعودي يبدأ بـ 05 وطوله 10 أرقام.
- رقم الهوية/الإقامة 10 خانات يبدأ بـ 1 أو 2.
- التاريخ: أرجعه ميلادياً بصيغة YYYY-MM-DD. إذا كان مكتوباً هجرياً (مثل 1446/…) حوّله للميلادي.
- فرّق بين «المبلغ الإجمالي للخدمة» (الاتفاق الكامل) و«مبلغ هذا السند» (المقبوض الآن). إذا لم يُذكر إلا مبلغ واحد واضح أنه المقبوض، ضعه في receipt_amount واترك total_amount كما تراه مناسباً (أو null).
- أرقام السندات السابقة: أي أرقام سندات قديمة مذكورة على الورقة غير رقم السند الحالي.
- إن كان هناك جدول/توزيع دفعات مكتوب (دفعة أولى، عند التأشيرة…) أرجعه في installments.
- إذا شككت في قراءة حقل معيّن لكنك أرجعته، اذكر ذلك باختصار في uncertain_note.`

// ── الحالة ─────────────────────────────────────────────────────────────────
const state = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : { files: {}, batches: [] }
const saveState = () => fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))

// ── مراحل التنفيذ ──────────────────────────────────────────────────────────
const PHASES = { upload, submit, poll, dupes, status, run }
if (!PHASES[cmd]) die(`أمر غير معروف: ${cmd} — المتاح: ${Object.keys(PHASES).join(' | ')}`)
await PHASES[cmd]()
saveState()
process.exit(0)

// ═══ 1. الرفع وإنشاء المسودات ═══
async function upload() {
  if (!IMAGES_DIR) die('حدد مجلد الصور: --dir "C:\\path" أو IMAGES_DIR في .env.jub1')
  const { data: br, error: brErr } = await sb.from('branches').select('id,branch_code').eq('branch_code', 'JUB1').maybeSingle()
  if (brErr || !br) die('تعذر إيجاد فرع JUB1: ' + (brErr?.message || 'غير موجود'))

  const all = fs.readdirSync(IMAGES_DIR).filter(f => /\.(jpe?g|png|webp)$/i.test(f)).sort()
  const skippedExt = fs.readdirSync(IMAGES_DIR).filter(f => !/\.(jpe?g|png|webp)$/i.test(f) && fs.statSync(path.join(IMAGES_DIR, f)).isFile())
  if (skippedExt.length) console.log(`⚠ تخطّي ${skippedExt.length} ملف بامتداد غير مدعوم (PDF/غيره):`, skippedExt.slice(0, 10).join(', '), skippedExt.length > 10 ? '…' : '')

  const todo = all.filter(f => !state.files[f]?.receipt_id).slice(0, LIMIT === Infinity ? undefined : LIMIT)
  console.log(`📁 ${all.length} صورة في المجلد — ${todo.length} تحتاج رفعاً`)

  let done = 0
  for (const name of todo) {
    const full = path.join(IMAGES_DIR, name)
    try {
      const { buf, mime } = await prepareImage(full)
      // صف المسودة أولاً (نحتاج المعرف لمسار التخزين)
      const { data: row, error: e1 } = await sb.from('jub1_receipts')
        .insert({ branch_id: br.id, review_status: 'draft', notes: `bulk-ocr: ${name}` })
        .select('id').single()
      if (e1) throw new Error('insert: ' + e1.message)
      const storagePath = `jub1_receipts/${row.id}/${Date.now()}_${name.replace(/[^\w.\-]+/g, '_')}`
      const { error: e2 } = await sb.storage.from('attachments').upload(storagePath, buf, { contentType: mime, upsert: false })
      if (e2) throw new Error('storage: ' + e2.message)
      const { data: pub } = sb.storage.from('attachments').getPublicUrl(storagePath)
      const { error: e3 } = await sb.from('attachments').insert({
        entity_type: JUB1_ENTITY, entity_id: row.id, file_name: name,
        file_url: pub?.publicUrl || storagePath, storage_path: storagePath,
        mime_type: mime, size_bytes: buf.length,
      })
      if (e3) throw new Error('attachment: ' + e3.message)
      state.files[name] = { receipt_id: row.id, ocr: 'pending' }
      done++
      if (done % 25 === 0) { saveState(); console.log(`  ⬆ ${done}/${todo.length}`) }
    } catch (e) {
      console.error(`  ✗ ${name}: ${e.message}`)
      state.files[name] = state.files[name] || {}
      state.files[name].upload_error = e.message
    }
  }
  saveState()
  console.log(`✔ اكتمل الرفع: ${done} — إجمالي المرفوع: ${Object.values(state.files).filter(x => x.receipt_id).length}`)
}

// ═══ 2. إرسال دفعات القراءة ═══
async function submit() {
  const pending = Object.entries(state.files).filter(([, v]) => v.receipt_id && v.ocr === 'pending')
  if (!pending.length) { console.log('لا توجد صور بانتظار القراءة'); return }
  console.log(`🧠 إرسال ${pending.length} صورة للقراءة (دفعات من ${BATCH_SIZE})`)

  // قائمة خدمات النظام تُعطى للنموذج ليختار منها مباشرة (service_choice)
  const services = await loadServices()
  const svcNames = services.map(s => s.value_ar)
  const schema = buildSchema(svcNames)
  const prompt = PROMPT + (svcNames.length ? `\n\nقائمة خدمات النظام — اختر في service_choice الأقرب لما هو مكتوب على السند (أو null إن لم تستطع الجزم):\n- ${svcNames.join('\n- ')}` : '')

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const chunk = pending.slice(i, i + BATCH_SIZE)
    const requests = []
    for (const [name, v] of chunk) {
      const full = path.join(IMAGES_DIR || '', name)
      if (!fs.existsSync(full)) { console.error(`  ✗ الملف غير موجود محلياً: ${name}`); continue }
      const { buf, mime } = await prepareImage(full)
      requests.push({
        custom_id: v.receipt_id,
        params: {
          model: MODEL, max_tokens: 16000,
          thinking: { type: 'adaptive' },
          output_config: { format: { type: 'json_schema', schema } },
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mime, data: buf.toString('base64') } },
              { type: 'text', text: prompt },
            ],
          }],
        },
      })
    }
    if (!requests.length) continue
    const batch = await anthropic.messages.batches.create({ requests })
    state.batches.push({ id: batch.id, status: batch.processing_status, count: requests.length })
    for (const [name] of chunk) if (state.files[name].ocr === 'pending') state.files[name].ocr = 'submitted'
    saveState()
    console.log(`  ▶ دفعة ${batch.id} — ${requests.length} صورة`)
  }
  console.log('✔ أُرسلت كل الدفعات — تابع بـ: node scripts/jub1-bulk-ocr.mjs poll')
}

// ═══ 3. المتابعة وتطبيق النتائج ═══
async function poll() {
  const open = () => state.batches.filter(b => b.status !== 'ended' || !b.applied)
  if (!open().length) { console.log('لا توجد دفعات مفتوحة'); return }

  while (open().length) {
    for (const b of state.batches) {
      if (b.status === 'ended' && b.applied) continue
      const info = await anthropic.messages.batches.retrieve(b.id)
      b.status = info.processing_status
      console.log(`  ⏳ ${b.id}: ${b.status} (نجح ${info.request_counts.succeeded}/${b.count})`)
      if (b.status === 'ended' && !b.applied) {
        await applyBatch(b)
        b.applied = true
        saveState()
      }
    }
    saveState()
    if (open().length) await sleep(60_000)
  }
  await dupes()
  console.log('✔ اكتملت القراءة والتطبيق')
}

async function applyBatch(b) {
  // خريطة receipt_id → اسم الملف (لتحديث الحالة المحلية)
  const byId = {}
  for (const [name, v] of Object.entries(state.files)) if (v.receipt_id) byId[v.receipt_id] = name

  // مطابقة الخدمة بأسماء lookup_items
  const services = await loadServices()

  let okCount = 0, errCount = 0
  for await (const res of await anthropic.messages.batches.results(b.id)) {
    const id = res.custom_id
    const name = byId[id]
    if (res.result.type !== 'succeeded') {
      errCount++
      await sb.from('jub1_receipts').update({ review_note: 'تعذّرت القراءة الآلية — أدخل الحقول يدوياً' }).eq('id', id)
      if (name) state.files[name].ocr = 'error'
      continue
    }
    const msg = res.result.message
    if (msg.stop_reason === 'refusal') { errCount++; if (name) state.files[name].ocr = 'error'; continue }
    let r = {}
    try { r = JSON.parse(msg.content.find(c => c.type === 'text')?.text || '{}') } catch { /* يبقى فارغاً */ }

    const svc = (r.service_choice && services.find(s => s.value_ar === r.service_choice)) || matchService(services, r.service_text)
    const notes = []
    if (r.uncertain_note) notes.push(r.uncertain_note)
    if (r.service_text && !svc) notes.push(`الخدمة على السند: «${r.service_text}» — لم تُطابَق، اخترها يدوياً`)

    const patch = {
      client_name: r.client_name || null,
      client_phone: normPhone(r.client_phone),
      client_id_no: digits(r.client_id_no) || null,
      agent_name: r.agent_name || null,
      service_item_id: svc?.id || null,
      service_code: svc?.code || null,
      quantity: Number.isInteger(r.quantity) && r.quantity > 0 ? r.quantity : null,
      total_amount: numOrNull(r.total_amount),
      primary_receipt_amount: numOrNull(r.receipt_amount),
      primary_receipt_no: digits(r.receipt_no) || (r.receipt_no || null),
      previous_receipt_nos: (r.previous_receipt_nos || []).join('، ') || null,
      receipt_date: /^\d{4}-\d{2}-\d{2}$/.test(r.receipt_date || '') ? r.receipt_date : null,
      installment_plan: (r.installments || []).map(x => ({ label: x.label || '', amount: x.amount })),
      review_note: notes.join(' | ') || null,
    }
    const { error } = await sb.from('jub1_receipts').update(patch).eq('id', id).eq('review_status', 'draft')
    if (error) { errCount++; console.error(`  ✗ تحديث ${id}: ${error.message}`) }
    else { okCount++; if (name) state.files[name].ocr = 'done' }
  }
  console.log(`  ✔ ${b.id}: طُبّق ${okCount}، أخطاء ${errCount}`)
}

// ═══ 4. تعليم التكرارات ═══
async function dupes() {
  const { data: rows } = await sb.from('jub1_receipts')
    .select('id,primary_receipt_no,review_note').is('deleted_at', null).not('primary_receipt_no', 'is', null)
  const byNo = {}
  for (const r of rows || []) { const k = String(r.primary_receipt_no).trim(); if (k) (byNo[k] ||= []).push(r) }
  let flagged = 0
  for (const [no, list] of Object.entries(byNo)) {
    if (list.length < 2) continue
    for (const r of list) {
      if ((r.review_note || '').includes('رقم سند مكرر')) continue
      const note = [(r.review_note || ''), `⚠ رقم سند مكرر (${no}) في ${list.length} إدخالات`].filter(Boolean).join(' | ')
      await sb.from('jub1_receipts').update({ review_note: note }).eq('id', r.id)
      flagged++
    }
  }
  console.log(`✔ فحص التكرار: عُلّم ${flagged} إدخالاً`)
}

// ═══ الحالة / الكل ═══
async function status() {
  const vals = Object.values(state.files)
  const c = (p) => vals.filter(p).length
  console.log(`الملفات المعروفة: ${vals.length}
  مرفوعة:        ${c(v => v.receipt_id)}
  بانتظار قراءة:  ${c(v => v.ocr === 'pending')}
  مُرسلة:         ${c(v => v.ocr === 'submitted')}
  مكتملة:         ${c(v => v.ocr === 'done')}
  أخطاء:          ${c(v => v.ocr === 'error' || v.upload_error)}
الدفعات: ${state.batches.map(b => `${b.id}:${b.status}${b.applied ? '✓' : ''}`).join('  ') || '—'}`)
}

async function run() { await upload(); await submit(); await poll(); await status() }

// ── أدوات ──────────────────────────────────────────────────────────────────
async function prepareImage(full) {
  const raw = fs.readFileSync(full)
  const ext = path.extname(full).toLowerCase()
  let mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
  if (!sharp) {
    if (raw.length > 4.5 * 1024 * 1024) throw new Error('الصورة أكبر من 4.5MB — ثبّت sharp للتصغير التلقائي')
    return { buf: raw, mime }
  }
  const buf = await sharp(raw).rotate().resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer()
  return { buf, mime: 'image/jpeg' }
}
async function loadServices() {
  const { data: cat } = await sb.from('lookup_categories').select('id').eq('name_ar', 'نوع الخدمة').maybeSingle()
  if (!cat) return []
  const { data } = await sb.from('lookup_items').select('id,value_ar,code,is_active').eq('category_id', cat.id)
  return (data || []).filter(x => x.is_active)
}
function matchService(services, txt) {
  const t = String(txt || '').trim()
  if (!t) return null
  return services.find(s => s.value_ar === t)
    || services.find(s => t.includes(s.value_ar) || s.value_ar.includes(t))
    || null
}
function digits(s) { return String(s ?? '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\D/g, '') }
function normPhone(s) {
  let p = digits(s)
  if (!p) return null
  if (p.startsWith('966')) p = '0' + p.slice(3)
  if (p.length === 9 && p.startsWith('5')) p = '0' + p
  return p || null
}
function numOrNull(v) { return typeof v === 'number' && isFinite(v) && v >= 0 ? v : null }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
function die(msg) { console.error('✗ ' + msg); process.exit(1) }
function loadDotEnv(file) {
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
