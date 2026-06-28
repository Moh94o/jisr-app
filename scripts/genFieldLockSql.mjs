// Emits idempotent SQL to sync public.field_lock_map from permCatalog.js and
// (re)attach the enforce_field_locks() trigger to every table that owns a
// lockable field. Single source of truth = TAB_FIELDS (lockableFields()).
//   node scripts/genFieldLockSql.mjs   →  prints SQL to stdout
import { lockableFields } from '../src/lib/permCatalog.js'

const esc = (s) => String(s).replace(/'/g, "''")
const rows = lockableFields()
const tuples = rows.map(f => `('${esc(f.table)}','${esc(f.col)}','${esc(f.tab)}','${esc(f.key)}')`)
const tables = [...new Set(rows.map(f => f.table))]

const sql = `-- Auto-generated from src/lib/permCatalog.js lockableFields() — idempotent.
-- 1) drop map rows no longer in the catalog
delete from public.field_lock_map fl
where not exists (
  select 1 from (values
${tuples.map(t => '    ' + t).join(',\n')}
  ) as v(table_name, column_name, tab, field_key)
  where v.table_name = fl.table_name and v.column_name = fl.column_name
    and v.tab = fl.tab and v.field_key = fl.field_key
);
-- 2) upsert the current catalog map
insert into public.field_lock_map (table_name, column_name, tab, field_key) values
${tuples.join(',\n')}
on conflict (table_name, column_name, tab, field_key) do nothing;
-- 3) (re)attach the guard trigger to every owning table
${tables.map(t => `select public._attach_field_lock_trigger('${esc(t)}');`).join('\n')}
`
console.log(sql)
console.error(`-- ${rows.length} column-lock rows across ${tables.length} tables: ${tables.join(', ')}`)
