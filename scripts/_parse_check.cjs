// Parse-check every source jsx/js file via esbuild. Catches syntax breakage post-migration.
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue;
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) walk(fp, acc);
    else if (/\.(jsx|js)$/.test(e.name)) acc.push(fp);
  }
  return acc;
}
(async () => {
  const files = walk('src');
  let bad = 0;
  for (const f of files) {
    const code = fs.readFileSync(f, 'utf8');
    const loader = f.endsWith('.jsx') ? 'jsx' : 'js';
    try { await esbuild.transform(code, { loader }); }
    catch (e) { bad++; console.log('✗ ' + f.replace(/\\/g, '/') + '\n   ' + String(e.message).split('\n')[0]); }
  }
  console.log(`\n${files.length} files checked · ${bad} with syntax errors`);
  process.exit(bad ? 1 : 0);
})();
