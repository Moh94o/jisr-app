const fs = require('fs');
const p = process.argv[2];
const wrap = JSON.parse(fs.readFileSync(p, 'utf8'));
const data = wrap.result || wrap;
// experimental / dead-code files to EXCLUDE per user choice
const EXCLUDE = new Set([
  'src/pages/NafathLoginVariants.jsx',
  'src/pages/SbcFacilityVariants.jsx',
  'src/pages/NafathInAppLogin.jsx',
  'src/pages/SbcRequests.jsx',
  'src/pages/VisibilityAdmin.jsx',
  'src/pages/admin/roles/UserPermissionsCard.jsx',
]);
const NOTES = {};
for (const f of data) {
  const fn = f.file.split('\\proj\\').pop().replace(/\\/g, '/');
  if (EXCLUDE.has(fn)) continue;
  const nc = (f.modals || []).filter(m => m.status !== 'formkit');
  if (!nc.length) continue;
  let txt = '';
  for (const m of nc) {
    txt += `• [${m.effort}] ${m.name} (~lines ${m.lines || '?'}) — status:${m.status}; hand-rolled:${m.handrolledParts || 'n/a'}\n  PLAN: ${m.migrationNotes}\n`;
  }
  NOTES[fn] = txt.trim();
}
fs.writeFileSync('scripts/_notes.json', JSON.stringify(NOTES, null, 0));
console.log('files:', Object.keys(NOTES).length);
console.log(Object.keys(NOTES).join('\n'));
