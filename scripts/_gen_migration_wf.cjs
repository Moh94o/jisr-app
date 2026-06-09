const fs = require('fs');
const NOTES = require('./_notes.json');
const ROOT = 'C:/Users/mahdi/OneDrive/Desktop/jisr app/proj/';

const API = `FORMKIT API (import from the ui FormKit module; path depends on file depth — match sibling imports already in the file):
TOKENS: F (font family), C (colors: gold/ok/red/blue/modal/modal2/inputBg/line/tx/tx2/tx3/tx4/tx5), TS, FW, IS, IST, H, R, SP, W, GRID (2-col auto-grid), FULL (full-row span), sF (base field style).
SHELL: <Modal open onClose title subtitle Icon width variant footer errorMsg scroll headerExtra> ... </Modal>
  - variant: 'create'(gold) | 'edit'(blue) | 'delete'(red) | 'add'(green); or accent='#hex'.
  - WIZARD: pass pages={[{title, valid, error, content}]} + onSubmit + submitting + submitLabel; Modal renders its own stepper + Back/Next/Save footer (no manual footer needed). valid:false disables Next/Save.
  - TABS (free-access view/detail panels): pass tabs={[{label, Icon, content}]}; optional controlled tab/onTab. Body scrolls automatically.
  - SUCCESS: pass success={<SuccessView .../>} to show success inside the same modal (no jump).
  - hideHeader, height, closeOnOverlay available.
SECTIONS: <ModalSection Icon label hint>...</ModalSection> (titled bordered card, color follows modal variant). Alias: KCard.
BUTTON: <ActionButton Icon onClick disabled dir="back"|"fwd" variant="primary"|"ghost" color>label</ActionButton>
FIELDS (each renders its own label+error; common props: label, req, error, hint, value, onChange, full):
  TextField(filter:'ar'|'en', upper, maxLength, dir, placeholder), NumberField(min,max), CurrencyField(unit), PhoneField(+966 9-digit), IdField(prefix,maxLength10), TextArea(rows), FileField(accept),
  Select({value,onChange,options,getKey,getLabel,getSub,renderCell,renderSelected,searchable,placeholder}), MultiSelect(value=array of keys),
  DateField (yyyy-mm-dd + calendar), TimeField (HH:MM 24h store, 12h picker), ColorField (swatches+custom), Switch(checked,onChange,color), Segmented({options:[{v,l,c,sub}]}), YesNo, Checkbox(checked,onChange), RadioGroup({options:[{v,l}]}), Stepper(min,max,step).
READ-ONLY: <InfoRow label value Icon color mono copy/> inside <InfoGrid>...</InfoGrid> — for detail panels.
SUCCESS VIEW: <SuccessView title subtitle code codeSub rows={[{label,value,color,mono,copy}]} compareRows children/>
CONFIRM: <ConfirmDialog open onConfirm onCancel title message itemName confirmText cancelText danger/>
TOAST: <Toast open type='success'|'error'|'info'|'delete' message onClose duration/>
HELPERS: Dropdown (engine behind Select), Flag(code), ScrollBox(maxHeight) for the ONE scrollable region inside a modal, fmtDate/fmtDateLong/fmtTime12/fmtThousands/countWords.`;

const PROMPT = (rel, notes) => `You are migrating ALL hand-rolled / partially-migrated modals in ONE React JSX file to the app's canonical FormKit design system, so that editing FormKit propagates to every popup. Faithfulness is paramount: change ONLY presentation, never behavior.

FILE TO MIGRATE: ${ROOT}${rel.replace(/\\//g, '\\\\')}

${API}

AUDIT — the specific modals in THIS file and the migration plan for each:
${notes}

HARD RULES:
1. PRESERVE ALL BEHAVIOR EXACTLY: state variables, validation logic, submit/save handlers, the exact data payload sent to the backend (supabase), permissions checks, side effects, open/close wiring, success/error flows, navigation. You are ONLY swapping the visual shell + inputs + buttons for FormKit equivalents. If unsure whether something is behavior or presentation, keep it.
2. Migrate ONLY modal components DEFINED in THIS file. If a modal/component is IMPORTED from another file, DO NOT touch it (another agent owns it). Report any you skipped for this reason.
3. Skip DEAD/unreachable code (e.g. components never rendered, gated behind \`false\`). Do not migrate it; just report it.
4. Do NOT edit FormKit.jsx. Only import from it. Use the SAME relative import path style as other imports already in this file (compute correct ../ depth).
5. For DUPLICATED local select/dropdown/date-picker/calendar primitives (CustomSelect, NiceSelect, Sel, Drop, KSelect, DatePick, CalendarPopup, etc.): the goal is single-source-of-truth. PREFER replacing their call-sites with FormKit Select/MultiSelect/DateField/TimeField. If call-sites are too many/varied to do safely, INSTEAD re-implement the local primitive's body as a THIN WRAPPER that delegates to the FormKit component while preserving its existing prop signature — then delete the old bespoke styling. Either way FormKit becomes the source of truth. Pick the safest faithful option.
6. Use the right FormKit feature: pages for step wizards, tabs for free-access view/detail panels, success/SuccessView for success states, ConfirmDialog for confirms, Toast for toast notifications. Match variant color to the action (create/edit/delete/add).
7. Keep all Arabic labels, RTL, hints, and option lists identical. Match existing field types (phone→PhoneField, id→IdField, money→CurrencyField, color→ColorField, time→TimeField, date→DateField).
8. Remove now-unused local style objects/helpers/state that the migration makes dead, but ONLY if clearly unused afterward.

AFTER EDITING — you MUST verify the file still parses. Run this Bash command (adjust the path) and fix until it prints OK:
  cd /c/dev/jisr-app && node -e "require('esbuild').transform(require('fs').readFileSync('${rel}','utf8'),{loader:'jsx'}).then(()=>console.log('OK')).catch(e=>{console.error(e.message);process.exit(1)})"
Iterate until it prints OK. Do not finish with a broken file.

Then return the structured summary object.`;

const SCHEMA = {
  type: 'object',
  properties: {
    file: { type: 'string' },
    compiles: { type: 'boolean', description: 'did the esbuild parse check pass after your edits' },
    modalsMigrated: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          approach: { type: 'string', description: 'what FormKit components replaced what; wrapper vs call-site swap' },
        },
        required: ['name', 'approach'],
      },
    },
    importedSkipped: { type: 'string', description: 'modal components skipped because imported from elsewhere' },
    deadSkipped: { type: 'string', description: 'dead/unreachable modals skipped' },
    behaviorRisks: { type: 'string', description: 'any place where behavior MIGHT have shifted, or uncertainty needing human review — be honest' },
    linesChanged: { type: 'string', description: 'rough sense of edit size' },
  },
  required: ['file', 'compiles', 'modalsMigrated', 'behaviorRisks'],
};

const FILES = Object.keys(NOTES);
const NOTES_LITERAL = JSON.stringify(NOTES);

const script = `export const meta = {
  name: 'formkit-modal-migration',
  description: 'Migrate every hand-rolled modal across the app to FormKit (one agent per file)',
  phases: [{ title: 'Migrate', detail: '28 files, one agent each, behavior-preserving' }],
}

const NOTES = ${NOTES_LITERAL}
const ROOT = ${JSON.stringify(ROOT)}
const FILES = ${JSON.stringify(FILES)}

const API = ${JSON.stringify(API)}

const SCHEMA = ${JSON.stringify(SCHEMA)}

const buildPrompt = (rel) => {
  const notes = NOTES[rel]
  return \`You are migrating ALL hand-rolled / partially-migrated modals in ONE React JSX file to the app's canonical FormKit design system, so that editing FormKit propagates to every popup. Faithfulness is paramount: change ONLY presentation, never behavior.

FILE TO MIGRATE: \${ROOT}\${rel}

\${API}

AUDIT — the specific modals in THIS file and the migration plan for each:
\${notes}

HARD RULES:
1. PRESERVE ALL BEHAVIOR EXACTLY: state, validation, submit/save handlers, exact backend (supabase) payloads, permission checks, side effects, open/close wiring, success/error flows, navigation. You are ONLY swapping the visual shell + inputs + buttons for FormKit equivalents. When unsure if something is behavior vs presentation, keep it.
2. Migrate ONLY modal components DEFINED in THIS file. If a modal is IMPORTED from another file, DO NOT touch it. Report skipped imports.
3. Skip DEAD/unreachable code; report it, don't migrate.
4. Do NOT edit FormKit.jsx — only import from it, matching the relative import path style already used in this file.
5. For DUPLICATED local select/dropdown/date/calendar primitives: prefer replacing call-sites with FormKit Select/MultiSelect/DateField/TimeField; if too invasive, re-implement the local primitive as a THIN WRAPPER delegating to the FormKit component while preserving its prop signature. Either way FormKit becomes the source of truth. Delete dead bespoke styling.
6. Use the right feature: pages=wizard, tabs=view/detail panel, success/SuccessView=success, ConfirmDialog=confirm, Toast=toast. Match variant to action (create/edit/delete/add).
7. Keep all Arabic labels, RTL, hints, option lists identical. Match field types (phone→PhoneField, id→IdField, money→CurrencyField, color→ColorField, time→TimeField, date→DateField).
8. Remove now-dead local styles/helpers/state only if clearly unused after.

AFTER EDITING you MUST verify parse. Run (fix until OK):
  cd /c/dev/jisr-app && node -e "require('esbuild').transform(require('fs').readFileSync('\${rel}','utf8'),{loader:'jsx'}).then(()=>console.log('OK')).catch(e=>{console.error(e.message);process.exit(1)})"
Do not finish with a broken file. Then return the structured summary.\`
}

phase('Migrate')

const raw = await parallel(FILES.map(rel => () =>
  agent(buildPrompt(rel), {
    label: rel.replace(/^src\\//, '').replace(/\\.jsx$/, ''),
    schema: SCHEMA,
    phase: 'Migrate',
  })
))

return raw.filter(Boolean)
`;

fs.writeFileSync('scripts/_migration_wf.js', script);
console.log('wrote scripts/_migration_wf.js  (' + script.length + ' chars, ' + FILES.length + ' files)');
