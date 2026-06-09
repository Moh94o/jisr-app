const fs = require('fs');
const p = process.argv[2];
let raw = fs.readFileSync(p, 'utf8');
const wrap = JSON.parse(raw);
const data = wrap.result || wrap;
const tot = { formkit: 0, partial: 0, handrolled: 0 };
const fileRows = [];
for (const f of data) {
  const fn = f.file.split('\\proj\\').pop().replace(/\\/g, '/');
  const c = { formkit: 0, partial: 0, handrolled: 0 };
  for (const m of (f.modals || [])) c[m.status] = (c[m.status] || 0) + 1;
  tot.formkit += c.formkit; tot.partial += c.partial; tot.handrolled += c.handrolled;
  fileRows.push({ fn, imports: f.importsFormKit, n: f.modalCount || (f.modals || []).length, c });
}
fileRows.sort((a, b) => (b.c.handrolled * 2 + b.c.partial) - (a.c.handrolled * 2 + a.c.partial));
console.log('FILE'.padEnd(44) + ' imp total  fk/part/hand');
for (const r of fileRows) {
  console.log(r.fn.padEnd(44), (r.imports ? 'Y' : '-').padStart(3), String(r.n).padStart(4), '  ', `${r.c.formkit}/${r.c.partial}/${r.c.handrolled}`);
}
console.log('\nTOTALS  formkit=' + tot.formkit + '  partial=' + tot.partial + '  handrolled=' + tot.handrolled + '  (modals=' + (tot.formkit + tot.partial + tot.handrolled) + ')');
