// One-shot refactor: extract printInvoice's document builder from InvoicePage.jsx
// into a shared pure-JS module (src/lib/invoicePrint.js) imported by BOTH the React
// print button and the WhatsApp invoice bot. Slices exact source ranges — no retyping.
import fs from 'fs'

const ROOT = 'C:/dev/jisr-app'
const SRC = `${ROOT}/src/InvoicePage.jsx`
const OUT = `${ROOT}/src/lib/invoicePrint.js`

const lines = fs.readFileSync(SRC, 'utf8').split(/\r?\n/)
const at = (a, b) => lines.slice(a - 1, b).join('\n') // 1-based inclusive

// ── dependency blocks (verbatim slices) ──
const C_BLK        = at(14, 18)   // const C = {...}
const FMTPHONE_BLK = at(35, 40)   // const fmtPhone = ...
const SVCTHEME_BLK = at(68, 78)   // const SVC_THEME = {...}
const SVCTHEMEFOR  = at(82, 86)   // const svcThemeFor = ...
const BASECODE_BLK = at(88, 89)   // VISA_SVC_CODES + baseSvcCode

// ── the builder body: from `const rtl=...` (3642) to the html2 closing line (4278) ──
const BODY = at(3642, 4278)

const moduleSrc = `// ⚠ AUTO-EXTRACTED from InvoicePage.jsx printInvoice() by scripts/extract-invoice-print.mjs.
// Pure JS (no React / no DOM). Returns the full Royal Black & Gold 2-page A4 invoice
// HTML document string. Shared by the React print button and the WhatsApp invoice bot
// (rendered to PDF headlessly via Puppeteer). Keep this the single source of truth for
// the invoice design — edit here, both consumers update.
import { noDash } from './utils.js'
import { TXN_SERVICES } from '../pages/txnServices.js'

${C_BLK}
${FMTPHONE_BLK}
${SVCTHEME_BLK}
${SVCTHEMEFOR}
${BASECODE_BLK}

export function buildInvoiceDoc(inv, data, printLang = 'ar') {
${BODY}

  return html2
}
`

fs.writeFileSync(OUT, moduleSrc, 'utf8')

// ── refactor InvoicePage.jsx: replace the 661-line printInvoice with a thin wrapper ──
const printBlock = at(4280, 4300) // iframe print logic (kept browser-side)
const wrapper = [
  "const printInvoice = (inv, data, printLang = 'ar') => {",
  "  const html2 = buildInvoiceDoc(inv, data, printLang)",
  "  const invoiceNo = noDash(inv.invoice_no || '')",
  printBlock,
  "}",
].join('\n')

let out = lines.slice()
// replace function lines 3641..4301 (1-based, inclusive) -> wrapper
out.splice(3641 - 1, 4301 - 3641 + 1, wrapper)
// add the import right after the TXN_SERVICES import (original line 11)
out.splice(11, 0, "import { buildInvoiceDoc } from './lib/invoicePrint.js'")
fs.writeFileSync(SRC, out.join('\n'), 'utf8')

console.log('OK invoicePrint.js bytes=', moduleSrc.length)
console.log('OK InvoicePage.jsx lines:', lines.length, '->', out.length)
