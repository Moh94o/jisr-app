// Renders the invoice HTML (from the shared buildInvoiceDoc) to a vector A4 PDF buffer
// via headless Chromium. printBackground + preferCSSPageSize are required for the
// dark/gold design and the @page A4 sizing.
import puppeteer from 'puppeteer'

let browser = null
async function getBrowser() {
  if (!browser || !browser.connected) {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  }
  return browser
}

export async function renderInvoicePdf(html) {
  const b = await getBrowser()
  const page = await b.newPage()
  try {
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60000 })
    return await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })
  } finally {
    await page.close().catch(() => {})
  }
}

export async function closeBrowser() {
  try { await browser?.close() } catch {}
  browser = null
}
