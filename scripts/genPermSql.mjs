// Emits idempotent SQL to seed public.permissions from permCatalog.js.
// Uses ON CONFLICT (module, action) so existing rows (and their grant FKs)
// are preserved — only labels/sort/icon are refreshed and new rows added.
import { MODULE_ACTIONS, MODULE_META } from '../src/lib/permCatalog.js'

const esc = (s) => String(s).replace(/'/g, "''")
const rows = []
for (const [mod, actions] of Object.entries(MODULE_ACTIONS)) {
  const meta = MODULE_META[mod] || { label_ar: mod, icon: 'settings', sort: 999 }
  actions.forEach((a, i) => {
    rows.push(
      `('${esc(mod)}', '${esc(meta.label_ar)}', '${esc(meta.icon)}', ${meta.sort}, ` +
      `'${esc(a.action)}', '${esc(a.label_ar)}', ${i * 10}, true)`
    )
  })
}

const sql = `-- Auto-generated from src/lib/permCatalog.js — idempotent catalog seed.
INSERT INTO public.permissions
  (module, module_label_ar, module_icon, module_sort, action, label_ar, sort_order, is_active)
VALUES
${rows.join(',\n')}
ON CONFLICT (module, action) DO UPDATE SET
  module_label_ar = EXCLUDED.module_label_ar,
  module_icon     = EXCLUDED.module_icon,
  module_sort     = EXCLUDED.module_sort,
  label_ar        = EXCLUDED.label_ar,
  sort_order      = EXCLUDED.sort_order,
  is_active       = true;
`
console.log(sql)
console.error(`-- generated ${rows.length} permission rows across ${Object.keys(MODULE_ACTIONS).length} modules`)
