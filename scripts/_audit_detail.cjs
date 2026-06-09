const fs = require('fs');
const p = process.argv[2];
const wrap = JSON.parse(fs.readFileSync(p, 'utf8'));
const data = wrap.result || wrap;
const effort = { none: 0, low: 0, medium: 0, high: 0 };
const byEffortNonCompliant = { low: 0, medium: 0, high: 0 };
let viewish = 0, formish = 0, confirmish = 0;
const rows = [];
for (const f of data) {
  const fn = f.file.split('\\proj\\').pop().replace(/\\/g, '/');
  for (const m of (f.modals || [])) {
    effort[m.effort] = (effort[m.effort] || 0) + 1;
    if (m.status !== 'formkit') byEffortNonCompliant[m.effort] = (byEffortNonCompliant[m.effort] || 0) + 1;
    const blob = (m.name + ' ' + m.handrolledParts + ' ' + m.migrationNotes).toLowerCase();
    let kind = 'form';
    if (/confirm|delete|deactivate|تأكيد|حذف/.test(blob) && /confirm/.test(m.handrolledParts)) { kind = 'confirm'; confirmish++; }
    else if (/view|detail|panel|tabs|عرض|tab rail|key\/value|read-only|info row/.test(blob)) { kind = 'view'; viewish++; }
    else formish++;
    rows.push({ fn, name: m.name.slice(0, 60), status: m.status, effort: m.effort, kind });
  }
}
console.log('EFFORT (all):', JSON.stringify(effort));
console.log('EFFORT (non-compliant only):', JSON.stringify(byEffortNonCompliant));
console.log('KIND: form=' + formish + '  view=' + viewish + '  confirm=' + confirmish);
console.log('\n--- non-compliant modals by kind ---');
for (const k of ['confirm', 'form', 'view']) {
  const list = rows.filter(r => r.kind === k && r.status !== 'formkit');
  console.log('\n### ' + k.toUpperCase() + ' (' + list.length + ')');
  for (const r of list) console.log('  [' + r.effort.padEnd(6) + '] ' + r.status.padEnd(10) + ' ' + r.fn.replace('src/', '').padEnd(38) + ' ' + r.name);
}
