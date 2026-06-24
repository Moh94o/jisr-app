// Emits a per-file enforcement-wiring spec (JSON) from permCatalog.js.
import { MODULE_ACTIONS, TAB_CARDS, tabModule } from '../src/lib/permCatalog.js'

// file → { userProp, importPath, tabs:[tabId] }
const FILES = [
  { file: 'src/FacilitiesPage.jsx', importPath: './lib/permissions.js', tabs: ['facilities'] },
  { file: 'src/WorkforcePage.jsx', importPath: './lib/permissions.js', tabs: ['workers'] },
  { file: 'src/TempWorkforcePage.jsx', importPath: './lib/permissions.js', tabs: ['temp_workers'] },
  { file: 'src/WorkVisasPage.jsx', importPath: './lib/permissions.js', tabs: ['work_visas'] },
  { file: 'src/InvoicePage.jsx', importPath: './lib/permissions.js', tabs: ['invoices'] },
  { file: 'src/pages/PaymentsPage.jsx', importPath: '../lib/permissions.js', tabs: ['payments'] },
  { file: 'src/pages/ExternalPaymentsPage.jsx', importPath: '../lib/permissions.js', tabs: ['ext_payments'] },
  { file: 'src/pages/DepositsPage.jsx', importPath: '../lib/permissions.js', tabs: ['deposits'] },
  { file: 'src/pages/RenewalCalcPage.jsx', importPath: '../lib/permissions.js', tabs: ['renewal_calc'] },
  { file: 'src/pages/admin/ClientsPage.jsx', importPath: '../../lib/permissions.js', tabs: ['admin_clients'] },
  { file: 'src/pages/admin/AgentsPage.jsx', importPath: '../../lib/permissions.js', tabs: ['admin_agents'] },
  { file: 'src/BranchesPage.jsx', importPath: './lib/permissions.js', tabs: ['admin_offices'] },
  { file: 'src/BankAccountsPage.jsx', importPath: './lib/permissions.js', tabs: ['admin_bank_accounts'] },
  { file: 'src/ServiceAdminPage.jsx', importPath: './lib/permissions.js', tabs: ['admin_services'] },
  { file: 'src/pages/FeesAdminPage.jsx', importPath: '../lib/permissions.js', tabs: ['admin_fees'] },
  { file: 'src/SettingsPage.jsx', importPath: './lib/permissions.js', tabs: ['settings_fields'] },
]

const out = FILES.map(f => ({
  file: f.file,
  importPath: f.importPath,
  tabs: f.tabs.map(tabId => {
    const mod = tabModule(tabId)
    const acts = (MODULE_ACTIONS[mod] || []).filter(a => a.kind !== 'view')
    return {
      tabId,
      module: mod,
      gateActions: acts.map(a => ({ code: `${mod}.${a.action}`, label: a.label_ar, kind: a.kind })),
      cards: (TAB_CARDS[tabId] || []).map(c => ({ key: c.key, label: c.label_ar })),
    }
  }),
}))
console.log(JSON.stringify(out, null, 2))
