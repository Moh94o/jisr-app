import React, { useEffect, useMemo, useRef, useState } from 'react'

const F = "'Cairo','Tajawal',sans-serif"
const MONO = "ui-monospace, 'JetBrains Mono', Menlo, monospace"
const C = {
  gold: '#D4A017',
  bg: '#1e1e1e', card: '#222', cardAlt: '#1a1a1a', cardDeep: '#141414',
  brd: 'rgba(255,255,255,.13)', brdSoft: 'rgba(255,255,255,.07)',
  text: '#eee', mute: 'rgba(255,255,255,.55)', muted2: 'rgba(255,255,255,.4)',
  green: '#27a046', greenBg: 'rgba(39,160,70,.12)', greenSoft: 'rgba(39,160,70,.06)',
  blue:  '#3483b4', blueBg:  'rgba(52,131,180,.12)', blueSoft:  'rgba(52,131,180,.06)',
  amber: '#eab308', amberBg: 'rgba(234,179,8,.12)',
  red:   '#e87265', redBg:   'rgba(192,57,43,.14)', redSoft:   'rgba(192,57,43,.05)',
  purple:'#bb8fce', purpleBg:'rgba(187,143,206,.12)',
}

const STORAGE_KEY = 'jisr_exemption_linkage_v3'

/* ─── Seed data — الربط.csv (week of 2026-05-17) ────────────────
   Strict one-to-one rows. Multi-receiver granters were split into
   separate rows (and are flagged automatically as duplicates).      */
const SEED_ROWS = [
  // [gOwner, gQiwa, gGosi, gUnified, rOwner, rQiwa, rGosi, rUnified]
  ['رفعه','15-4027689','656099321','7050852552','غدي','18-4051850','657268003','7051799927'],
  ['رفعه','18-4045372','656331372','7051043532','سحر','18-4072703','660669973','7054291609'],
  ['رفعه','18-4045393','656332123','7051044027','العنود','18-4062205','658840452','7052980096'],
  ['رفعه','18-4051436','657228036','7051766132','فن التعامل الذكي','18-4070035','660272852','7053980178'],
  ['رفعه','15-4027224','655848932','7050652408','مهدي','6-4025979','651856442','7042738109'],
  // ─ rows 8-15: granter had 2 receivers → split (will flag as duplicates) ─
  ['رفعه','15-4027246','655851232','7050654230','سحر','18-4070792','660386386','7054070268'],
  ['رفعه','15-4027246','655851232','7050654230','سحر','18-4072429','660642110','7054269092'],
  ['رفعه','15-4027254','655852697','7050654305','مهدي','18-4035595','654494223','7049541597'],
  ['رفعه','15-4027254','655852697','7050654305','سحر','18-4072389','660637524','7054265629'],
  ['رفعه','15-4027690','656099348','7050852370','سحر','18-4072632','660663304','7054286112'],
  ['رفعه','15-4027690','656099348','7050852370','سحر','18-4072767','660687467','7054301945'],
  ['رفعه','18-4045370','656331321','7051043573','سحر','18-4072465','660645489','7054272609'],
  ['رفعه','18-4045370','656331321','7051043573','سحر','18-4072768','660687564','7054301978'],
  ['رفعه','18-4045373','656331380','7051043540','سحر','18-4072445','660644245','7054271288'],
  ['رفعه','18-4045373','656331380','7051043540','سحر','18-4072784','660688285','7054302737'],
  ['رفعه','18-4045374','656331402','7051043367','سحر','18-4072450','660644903','7054271536'],
  ['رفعه','18-4045374','656331402','7051043367','سحر','18-4072763','660687351','7054301762'],
  ['رفعه','18-4045375','656331674','7051043623','سحر','18-4072388','660637710','7054265611'],
  ['رفعه','18-4045375','656331674','7051043623','سحر','18-4072771','660687815','7054302133'],
  ['رفعه','18-4045380','656331704','7051043722','رفعه','18-4058077','658240404','7052525842'],
  ['رفعه','18-4045380','656331704','7051043722','سحر','18-4072774','660688153','7054302281'],
  // ─ continued ─
  ['رفعه','15-4027702','656101040','7050853535','سحر','18-4071695','660512284','7054171447'],
  ['رفعه','15-4027703','656101113','7050853758','سحر','18-4072765','660687521','7054301804'],
  ['رفعه','15-4028334','656329394','7051043359','سحر','18-4072764','660687386','7054301788'],
  ['رفعه','18-4044949','656257482','7050983506','سحر','18-4072773','660687939','7054302257'],
  ['رفعه','18-4044952','656257555','7050983498','سحر','18-4072770','660687068','7054302091'],
  ['رفعه','15-4027697','656100753','7050853691','سحر','18-4072789','660688579','7054302729'],
  ['رفعه','18-4044964','656258179','7050983852','فلاح','18-4060655','658652141','7052825457'],
  ['رفعه','18-4044993','656259183','7050983936','سحر','18-4072785','660688293','7054302752'],
  ['رفعه','18-4045368','656331267','7051043433','سحر','18-4071920','660555498','7054202101'],
  ['رفعه','18-4045371','656331348','7051043474','سحر','18-4071862','660546995','7054195578'],
  ['رفعه','18-4045377','656331658','7051043680','سحر','18-4070875','660393420','7054076273'],
  ['رفعه','18-4044957','656257814','7050983647','سحر','18-4072772','660688137','7054302232'],
  ['رفعه','18-4044989','656259051','7050984660','سحر','18-4072769','660687785','7054302034'],
  ['رفعه','15-4027711','656102225','7050853865','سحر','18-4072776','660687688','7054302323'],
  ['رفعه','15-4027729','656108614','7050860241','سحر','18-4072775','660687653','7054302307'],
  ['رفعه','15-4027733','656114134','7050852404','سحر','18-4070796','660386270','7054070557'],
  ['رفعه','18-4044954','656257733','7050983787','سحر','18-4072791','660688846','7054303172'],
  ['رفعه','18-4044962','656258063','7050983639','سحر','18-4072783','660688277','7054302711'],
  ['رفعه','18-4044968','656258217','7050983860','سحر','18-4070998','660408630','7054088898'],
  ['رفعه','18-4044971','656258241','7050983894','مهدي','18-4035584','654494371','7049541522'],
  ['رفعه','18-4044973','656258330','7050984132','انجود','18-4048709','656843616','7051460603'],
  ['رفعه','18-4044974','656258357','7050984025','انجود','18-4049123','656914629','7051515414'],
  ['رفعه','18-4044977','656258489','7050984009','فلاح','18-4060661','658651404','7052825689'],
  ['رفعه','18-4044984','656258888','7050984694','شركة نبض الاستدامه','6-4063179','660705147','7054315648'],
  ['رفعه','18-4044985','656258985','7050984819','شركة ساره صالح','18-4071147','660432507','7054107581'],
  ['رفعه','18-4044988','656259043','7050984546','شركة ضخمه الاصول','6-4063262','660726713','7054333302'],
  ['رفعه','18-4044996','656259426','7050985113','شركة حافه الاقراط','6-4063180','660705155','7054315697'],
  ['رفعه','18-4045078','656270306','7050995138','شركة شريان التقدم','6-4063261','660726292','7054333294'],
  ['رفعه','15-4027704','656101105','7050853717','سحر','18-4072082','660577343','7054221713'],
  ['رفعه','15-4027705','656101156','7050853733','سحر','18-4071900','660552073','7054200014'],
  ['رفعه','15-4027707','656101253','7050854129','انجود','18-4048705','656843551','7051460587'],
  ['رفعه','18-4045100','656274131','7050998355','مهدي','18-4030213','653370229','7043720643'],
  ['رفعه','18-4045369','656329378','7051043383','العنود','18-4062945','658899279','7053030016'],
  ['مهدي','18-4026853','652320759','7043037923','رفعه','15-4027232','655850848','7050653877'],
  ['مهدي','18-4026863','652321275','7043038244','سحر','18-4072430','660641955','7054269167'],
  ['مهدي','18-4030146','653351178','7043704571','سحر','18-4071899','660552804','7054199927'],
  ['مهدي','18-4035764','654526044','7049567626','علي بوش','18-4070153','660290249','7053993627'],
  ['مهدي','6-4019841','650526708','7041873675','سحر','18-4072436','660642676','7054270355'],
  ['مهدي','6-4019843','650526864','7041873790','سحر','18-4071518','660485775','7054150417'],
  ['مهدي','6-4019845','650527151','7040243706','سحر','18-4072438','660643400','7054270314'],
  ['مهدي','6-4019848','650526767','7039882530','سحر','18-4072446','660644512','7054271338'],
  ['مهدي','6-4020860','650729331','7042013180','سحر','18-4072461','660644865','7054272336'],
  ['مهدي','6-4020863','650729978','7042013214','سحر','18-4072464','660645942','7054272617'],
  ['مهدي','6-4020864','650729536','7042013248','سحر','18-4071513','660485228','7054150011'],
  ['مهدي','6-4020865','650729994','7042013289','شركة الاصدقاء المحترمون','18-4070034','660272844','7053980160'],
  ['مهدي','6-4020866','650730097','7039560342','رفعه','18-4047691','656682671','7051334758'],
  ['مهدي','6-4019854','650527399','7041873915','سحر','18-4072080','660577548','7054221739'],
  ['مهدي','6-4020867','650729544','7040118247','سحر','18-4070680','660374388','7054060608'],
  ['مهدي','6-4020868','650730011','7042013339','مهدي','18-4026864','652320929','7039748079'],
  ['مهدي','6-4021048','650730208','7040052651','شركة دانه نواعم','6-4063264','660726764','7054333427'],
  ['مهدي','6-4021049','650729900','7042013511','شركة قوس','6-4063265','660726993','7054333948'],
  ['مهدي','6-4021050','650730232','7042013537','غدي','18-4055221','657785903','7052194771'],
  ['مهدي','6-4021290','650812425','7042064803','العنود','18-4062936','658899368','7053029893'],
  ['مهدي','6-4021291','650812328','7042064787','سحر','18-4071919','660555234','7054202069'],
  ['مهدي','6-4021314','650817710','7042068283','سحر','18-4071910','660553223','7054200444'],
  ['مهدي','6-4021326','650819047','7042069158','سحر','18-4071898','660552472','7054199968'],
  ['مهدي','6-4021338','650820096','7039615138','سحر','18-4072081','660576843','7054221747'],
  ['مهدي','6-4021347','650730224','7040140985','سحر','18-4071722','660514783','7054173278'],
  ['مهدي','6-4021348','650729919','7040274404','سحر','18-4071874','660550011','7054197640'],
  ['مهدي','6-4021543','650865618','7042069364','سحر','18-4071876','660550380','7054197632'],
  ['مهدي','6-4025888','651821436','7042715412','','','',''], // no receiver
  ['مهدي','6-4025971','651854547','7042737549','العنود','18-4062192','658840398','7052979825'],
  ['مهدي','6-4026012','651859719','7042740386','غدي','18-4064713','659116480','7053208042'],
  ['مهدي','6-4026016','651860040','7039937516','رفعه','18-4048828','656862815','7051474323'],
  ['مهدي','6-4026043','651861578','7039619403','رفعه','15-4027701','656100877','7050853881'],
  ['مهدي','6-4026064','651863317','7040017704','رفعه','18-4049634','656925396','7051524754'],
  ['مهدي','6-4026652','651997496','7042827613','سحر','18-4071901','660552987','7054200022'],
  ['مهدي','6-4026653','651996988','7042827621','سحر','18-4071897','660552936','7054199893'],
  ['مهدي','6-4026654','651997232','7042827654','سحر','18-4071838','660546774','7054195289'],
  ['مهدي','6-4026655','651996996','7042827704','سحر','18-4071834','660546170','7054194597'],
  ['مهدي','6-4026656','651997321','7042827738','سحر','18-4072164','660591931','7054232777'],
  ['مهدي','6-4026657','651997364','7042827761','سحر','18-4072693','660669698','7054291419'],
  ['مهدي','6-4026658','651997402','7042827829','سحر','18-4072466','660645470','7054272641'],
  ['مهدي','6-4026659','651997577','7042827886','سحر','18-4071876','660553533','7054200030'],
  ['مهدي','6-4026660','651997593','7042827902','سحر','18-4072507','660648070','7054274571'],
  ['مهدي','6-4019842','650526694','7041873717','سحر','18-4072695','660669353','7054291435'],
  ['مهدي','6-4026703','652004032','7039978445','سحر','18-4072694','660669256','7054291450'],
  // ─ Orphan section: granter known only by unified number ─
  ['','','','7051920747','سحر','18-4072591','660659218','7054283283'],
  ['','','','7051957798','سحر','18-4072594','660658807','7054283341'],
  ['','','','7051961741','سحر','18-4072593','660659307','7054283325'],
  ['','','','7051920374','سحر','18-4072595','660659269','7054283382'],
  ['','','','7052062754','سحر','18-4072590','660658475','7054283226'],
  ['','','','7052054207','سحر','18-4072633','660663061','7054286054'],
  ['','','','7051920242','سحر','18-4072640','660664629','7054287474'],
  ['','','','7051789290','سحر','18-4072424','660641351','7054268441'],
  ['','','','7051484736','سحر','18-4072420','660641319','7054268474'],
  ['','','','7051477466','سحر','18-4072421','660641327','7054268516'],
  ['','','','7051463060','سحر','18-4072428','660641920','7054269100'],
  ['','','','7051462914','سحر','18-4072444','660644504','7054271320'],
  ['','','','7042422183','سحر','18-4072452','660644911','7054271551'],
  ['','','','7039769729','سحر','18-4072467','660646140','7054272567'],
  ['','','','7042245105','سحر','18-4072470','660645853','7054272807'],
  ['','','','7050745152','سحر','18-4072469','660646183','7054272880'],
  ['','','','7040153160','سحر','18-4072473','660646264','7054273052'],
  // ─ Bottom section ─
  ['مهدي','6-4026649','651997178','7042827514','سحر','18-4072697','660669264','7054291468'],
  ['مهدي','6-4021052','650730216','7042013495','سحر','18-4072698','660669272','7054291476'],
  ['رفعه','18-4044990','656259140','7050984900','سحر','18-4072708','660670025','7054291708'],
  ['رفعه','18-4045077','656270292','7050995179','','','',''], // no receiver
  ['رفعه','18-4044980','656258624','7050984199','العنود','18-4062220','658840517','7052980302'],
]

const mkParty = (owner='', qiwa='', gosi='', unified='') => ({
  owner: owner||'',
  qiwa: (qiwa||'').replace(/\s+/g,''),
  gosi: gosi||'',
  unified: unified||'',
})

const seedState = () => ({
  updatedAt: '2026-05-17',
  rows: SEED_ROWS.map(([go,gq,gg,gu,ro,rq,rgi,ru]) => ({
    granter: mkParty(go,gq,gg,gu),
    receiver: mkParty(ro,rq,rgi,ru),
  })),
})

/* ─── localStorage ─── */
const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedState()
    const v = JSON.parse(raw)
    if (!v?.rows || !Array.isArray(v.rows)) return seedState()
    return v
  } catch { return seedState() }
}
const saveState = (s) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch {} }

const fmtDate = (iso) => {
  if (!iso) return '—'
  try {
    const d = new Date(iso); if (isNaN(d)) return iso
    const dd = String(d.getDate()).padStart(2,'0')
    const mm = String(d.getMonth()+1).padStart(2,'0')
    return `${d.getFullYear()}/${mm}/${dd}`
  } catch { return iso }
}

/* ─── CSV import: supports BOTH single-row layout and legacy dual layout
   (granter cols 0..3, receiver cols 5..8, optional secondary receiver cols 12..15) */
const parseCsv = (text) => {
  const lines = text.replace(/^﻿/,'').split(/\r?\n/)
  const out = []
  let started = false
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    if (!raw || !raw.trim()) continue
    const cells = raw.split(',').map(c => c.trim())
    // Skip the first 1-2 header rows
    if (!started) {
      const looksHeader = /المنشآت|المنشات|المالك|قوى|التأمين|الرقم/.test(raw)
      if (looksHeader && i < 3) continue
      started = true
    }
    const g = mkParty(cells[0], cells[1], cells[2], cells[3])
    const r1 = mkParty(cells[5], cells[6], cells[7], cells[8])
    const r2 = mkParty(cells[12], cells[13], cells[14], cells[15])
    const hasG = g.owner||g.qiwa||g.gosi||g.unified
    const hasR1 = r1.owner||r1.qiwa||r1.gosi||r1.unified
    const hasR2 = r2.owner||r2.qiwa||r2.gosi||r2.unified
    if (!hasG && !hasR1 && !hasR2) continue
    if (hasR1 || !hasR2) out.push({ granter: g, receiver: r1 })
    if (hasR2) out.push({ granter: g, receiver: r2 })
  }
  return out
}

/* ─── Status computation ─── */
const STATUS = {
  ok:        { color: C.green,  label: 'سليم',              short: '✓' },
  dupG:      { color: C.red,    label: 'مانحة مكررة',       short: '⚠' },
  dupR:      { color: C.amber,  label: 'مستقبلة مكررة',     short: '⚠' },
  noR:       { color: C.muted2, label: 'بدون مستقبلة',      short: '—' },
  orphan:    { color: C.purple, label: 'بدون مانحة معروفة', short: 'ⓘ' },
}

const computeStatus = (rows) => {
  const gCount = {}, rCount = {}
  rows.forEach(r => {
    if (r.granter.qiwa)  gCount[r.granter.qiwa]  = (gCount[r.granter.qiwa]||0) + 1
    if (r.receiver.qiwa) rCount[r.receiver.qiwa] = (rCount[r.receiver.qiwa]||0) + 1
  })
  return rows.map(r => {
    const flags = []
    const noR     = !r.receiver.qiwa && !r.receiver.unified && !r.receiver.gosi
    const orphan  = !r.granter.qiwa  && !r.granter.gosi && r.granter.unified
    const dupG    = !!r.granter.qiwa  && gCount[r.granter.qiwa]  > 1
    const dupR    = !!r.receiver.qiwa && rCount[r.receiver.qiwa] > 1
    if (dupG)    flags.push('dupG')
    if (dupR)    flags.push('dupR')
    if (noR)     flags.push('noR')
    if (orphan)  flags.push('orphan')
    return { flags, primary: flags[0] || 'ok' }
  })
}

/* ─── UI atoms ─── */
const Pill = ({ children, color, bg, size='md' }) => (
  <span style={{
    display:'inline-flex', alignItems:'center', gap:4,
    padding: size==='sm' ? '2px 7px' : '3px 9px',
    borderRadius:999, fontSize: size==='sm'?10.5:11.5, fontWeight:700, color,
    background: bg || `${color}1a`, border:`1px solid ${color}44`,
    whiteSpace:'nowrap', flexShrink:0,
  }}>{children}</span>
)

const Field = ({ value, onChange, mono, placeholder, toast, color = C.text, width, copyable = true, align = 'right' }) => {
  const [edit, setEdit] = useState(false)
  const [v, setV] = useState(value || '')
  useEffect(() => { setV(value || '') }, [value])
  if (edit) return (
    <input
      autoFocus value={v}
      onChange={e => setV(e.target.value)}
      onBlur={() => { setEdit(false); if (v !== value) onChange(v) }}
      onKeyDown={e => { if (e.key==='Enter') e.currentTarget.blur(); if (e.key==='Escape'){ setV(value||''); setEdit(false) } }}
      style={{
        background:'#0a0a0a', border:`1px solid ${C.gold}`, color:C.text, borderRadius:5,
        padding:'2px 6px', fontFamily: mono ? MONO : F, fontSize: 12, width: width||'100%',
        minWidth: 70, outline:'none', textAlign: align,
      }}
    />
  )
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:2, minWidth:0, width, maxWidth:'100%' }}>
      <span
        onClick={() => setEdit(true)} title={value || 'انقر للتعديل'}
        style={{
          cursor:'text', padding:'2px 5px', borderRadius:4, color: value ? color : C.muted2,
          fontFamily: mono ? MONO : F, fontSize: mono ? 11.5 : 12,
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
          direction: mono ? 'ltr' : 'inherit',
          background: value ? 'transparent' : 'rgba(255,255,255,.02)',
          border: value ? '1px solid transparent' : `1px dashed ${C.brdSoft}`,
          flex: 1, minWidth: 0,
        }}
      >{value || placeholder || '—'}</span>
      {copyable && value && (
        <button onClick={() => { try { navigator.clipboard.writeText(String(value)); toast?.('تم النسخ ✓','ok') } catch{} }}
          title="نسخ"
          style={{ background:'transparent', border:'none', color:C.muted2, cursor:'pointer',
            padding:'0 3px', borderRadius:3, fontSize:11, lineHeight:1, flexShrink:0 }}>⧉</button>
      )}
    </span>
  )
}

const KV = ({ label, color, children }) => (
  <span style={{ display:'inline-flex', alignItems:'baseline', gap:5, minWidth:0, flex:'1 1 auto' }}>
    <span style={{ color:C.muted2, fontSize:9.5, fontFamily:F, flexShrink:0 }}>{label}</span>
    <span style={{ minWidth:0, flex:1 }}>{children}</span>
  </span>
)

const PartyBlock = ({ p, onChange, color, toast, accentBg }) => (
  <div style={{
    background: accentBg, border:`1px solid ${color}22`, borderRadius:8, padding:'7px 10px',
    display:'flex', flexDirection:'column', gap:5, minWidth: 0,
  }}>
    {/* row 1: owner */}
    <div style={{ display:'flex', alignItems:'center', minWidth:0 }}>
      <Field value={p.owner} onChange={v => onChange({ ...p, owner: v })} placeholder="المالك" color={C.text} toast={toast} copyable={false} />
    </div>
    {/* row 2: numbers */}
    <div style={{
      display:'flex', alignItems:'center', gap:6, minWidth:0, flexWrap:'wrap',
      paddingTop:5, borderTop:`1px dashed ${C.brdSoft}`,
    }}>
      <KV label="قوى">
        <Field value={p.qiwa} mono onChange={v => onChange({ ...p, qiwa: v.replace(/\s+/g,'') })} placeholder="—" toast={toast} />
      </KV>
      <KV label="تأمين">
        <Field value={p.gosi} mono onChange={v => onChange({ ...p, gosi: v })} placeholder="—" toast={toast} />
      </KV>
      <KV label="موحّد">
        <Field value={p.unified} mono onChange={v => onChange({ ...p, unified: v })} placeholder="—" toast={toast} />
      </KV>
    </div>
  </div>
)

const Stat = ({ label, value, color, bg }) => (
  <div style={{
    background: bg, border:`1px solid ${color}33`, borderRadius:11, padding:'10px 13px',
    display:'flex', alignItems:'center', justifyContent:'space-between',
  }}>
    <div style={{ fontSize:12, color:C.mute }}>{label}</div>
    <div style={{ fontSize:20, fontWeight:800, color, fontFamily:MONO }}>{value}</div>
  </div>
)

/* ───── Linkage row ───── */
const LinkRow = ({ idx, row, status, onChange, onDelete, toast }) => {
  const s = STATUS[status.primary]
  const updateG = (g) => onChange({ ...row, granter: g })
  const updateR = (r) => onChange({ ...row, receiver: r })
  const borderLeft = status.primary === 'ok' ? `1px solid ${C.brd}` : `3px solid ${s.color}`
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.brd}`, borderInlineStart: borderLeft,
      borderRadius: 10, padding: '8px 12px',
      display:'grid', gridTemplateColumns: '32px auto 1fr 30px 1fr 30px',
      alignItems:'center', columnGap: 10, rowGap: 4,
    }}>
      {/* # */}
      <div style={{
        width:32, height:24, borderRadius:6, background:'#0f0f0f', border:`1px solid ${C.brdSoft}`,
        color:C.muted2, fontSize:11, fontFamily:MONO,
        display:'inline-flex', alignItems:'center', justifyContent:'center',
      }}>{idx + 1}</div>

      {/* Status */}
      <div title={status.flags.map(f => STATUS[f].label).join(' · ') || 'سليم'} style={{ display:'inline-flex' }}>
        <Pill color={s.color} size="sm">{s.short} {s.label}</Pill>
      </div>

      {/* Granter */}
      <PartyBlock p={row.granter} onChange={updateG} color={C.green} toast={toast} accentBg={C.greenSoft} />

      {/* arrow */}
      <div style={{ color: C.gold, fontSize: 22, textAlign:'center', lineHeight:1, fontWeight:600 }}>←</div>

      {/* Receiver */}
      <PartyBlock p={row.receiver} onChange={updateR} color={C.blue} toast={toast} accentBg={C.blueSoft} />

      {/* delete */}
      <button onClick={() => { if (confirm('حذف هذا الربط؟')) onDelete() }}
        title="حذف"
        style={{ background:'transparent', border:`1px solid rgba(192,57,43,.4)`, color:'#e87265',
          padding:'4px 10px', borderRadius:6, cursor:'pointer', fontSize:14, lineHeight:1,
          justifySelf:'center' }}>×</button>
    </div>
  )
}

/* ═══════ MAIN PAGE ═══════ */
export default function ExemptionLinkagePage({ toast }) {
  const [state, setState] = useState(loadState)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all') // all|ok|dupG|dupR|noR|orphan
  const fileRef = useRef(null)

  useEffect(() => { saveState(state) }, [state])

  const updateRow = (i, r) => setState(s => ({ ...s, rows: s.rows.map((x,j) => j===i ? r : x) }))
  const deleteRow = (i)    => setState(s => ({ ...s, rows: s.rows.filter((_,j) => j!==i) }))
  const addRow = () => setState(s => ({
    ...s, rows: [{ granter: mkParty(), receiver: mkParty() }, ...s.rows],
  }))

  /* derived: per-row status */
  const statuses = useMemo(() => computeStatus(state.rows), [state.rows])

  const counts = useMemo(() => {
    const c = { total: state.rows.length, ok:0, dupG:0, dupR:0, noR:0, orphan:0 }
    statuses.forEach(s => {
      if (s.flags.length === 0) c.ok++
      if (s.flags.includes('dupG')) c.dupG++
      if (s.flags.includes('dupR')) c.dupR++
      if (s.flags.includes('noR')) c.noR++
      if (s.flags.includes('orphan')) c.orphan++
    })
    return c
  }, [statuses])

  /* filtering */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.rows.map((r, i) => ({ r, i, s: statuses[i] })).filter(({ r, s }) => {
      if (filter !== 'all') {
        if (filter === 'ok' && s.flags.length > 0) return false
        if (filter !== 'ok' && !s.flags.includes(filter)) return false
      }
      if (!q) return true
      const hit = (p) => (
        (p.owner||'').toLowerCase().includes(q) ||
        (p.qiwa||'').toLowerCase().includes(q) ||
        (p.gosi||'').includes(q) ||
        (p.unified||'').includes(q)
      )
      return hit(r.granter) || hit(r.receiver)
    })
  }, [state.rows, statuses, query, filter])

  /* IMPORT */
  const onImport = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const rows = parseCsv(String(reader.result || ''))
      if (!rows?.length) { toast?.('فشل قراءة الملف','err'); return }
      if (!confirm(`سيتم استبدال البيانات الحالية بـ ${rows.length} صف ربط. متابعة؟`)) return
      setState({ updatedAt: new Date().toISOString().slice(0,10), rows })
      toast?.(`تم استيراد ${rows.length} ربط ✓`,'ok')
    }
    reader.readAsText(file, 'utf-8')
    e.target.value = ''
  }

  /* EXPORT — flat one-row-per-linkage */
  const onExport = () => {
    const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s }
    const head1 = ['المنشأة المانحة','','','','','المنشأة المستقبلة','','','']
    const head2 = ['المالك','قوى','التأمينات','الرقم الموحد','','المالك','قوى','التأمينات','الرقم الموحد']
    const rows = [head1, head2, ...state.rows.map(r => [
      r.granter.owner, r.granter.qiwa, r.granter.gosi, r.granter.unified, '',
      r.receiver.owner, r.receiver.qiwa, r.receiver.gosi, r.receiver.unified,
    ])]
    const csv = '﻿' + rows.map(r => r.map(esc).join(',')).join('\r\n')
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `الإعفاء-والربط-${state.updatedAt}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const onReset = () => {
    if (!confirm('استعادة بيانات الأسبوع الأصلية؟ سيتم فقدان كل التعديلات.')) return
    setState(seedState())
    toast?.('تمت استعادة البيانات الأصلية','ok')
  }

  const onEditDate = () => {
    const v = prompt('تاريخ آخر تحديث (YYYY-MM-DD)', state.updatedAt)
    if (!v) return
    setState(s => ({ ...s, updatedAt: v }))
  }

  const FilterChip = ({ id, label, color, count }) => (
    <button onClick={() => setFilter(id)} style={{
      background: filter===id ? `${color}28` : 'transparent',
      border: `1px solid ${filter===id ? color : C.brd}`,
      color: filter===id ? color : C.mute,
      padding:'5px 12px', borderRadius:999, cursor:'pointer', fontFamily:F, fontSize:11.5, fontWeight:600,
      display:'inline-flex', alignItems:'center', gap:5,
    }}>{label} <span style={{ fontFamily:MONO, fontSize:10.5, opacity:.7 }}>{count}</span></button>
  )

  return (
    <div dir="rtl" style={{ padding:'16px 22px 24px', fontFamily:F, color:C.text, minHeight:'100vh' }}>
      {/* HEADER */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        gap:12, marginBottom:14, flexWrap:'wrap',
      }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <h1 style={{ fontSize:22, fontWeight:800, color:C.gold, margin:0 }}>الإعفاء والربط</h1>
            <Pill color={C.gold}>تحديث أسبوعي</Pill>
          </div>
          <div style={{ fontSize:12.5, color:C.mute, marginTop:6, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <span>كل صف ربط واحد لواحد — الرقم الموحد للمانحة يُستخدم كرقم استقدام للمستقبلة.</span>
            <span style={{ color:C.muted2 }}>·</span>
            <button onClick={onEditDate} style={{
              background:'transparent', border:`1px dashed ${C.brd}`, color:C.mute,
              padding:'3px 9px', borderRadius:8, cursor:'pointer', fontFamily:F, fontSize:11.5,
            }}>آخر تحديث: <strong style={{color:C.text}}>{fmtDate(state.updatedAt)}</strong></button>
          </div>
        </div>

        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button onClick={() => fileRef.current?.click()} style={{
            background:C.gold, color:'#1a1a1a', border:'none', padding:'8px 16px',
            borderRadius:9, cursor:'pointer', fontFamily:F, fontSize:13, fontWeight:700,
          }}>↑ استيراد CSV</button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onImport} style={{ display:'none' }} />
          <button onClick={onExport} style={{
            background:'transparent', border:`1px solid ${C.brd}`, color:C.mute,
            padding:'8px 14px', borderRadius:9, cursor:'pointer', fontFamily:F, fontSize:12.5,
          }}>↓ تصدير</button>
          <button onClick={onReset} style={{
            background:'transparent', border:`1px solid rgba(192,57,43,.5)`, color:'#e87265',
            padding:'8px 14px', borderRadius:9, cursor:'pointer', fontFamily:F, fontSize:12.5,
          }}>↺ استعادة الأصل</button>
        </div>
      </div>

      {/* STATS */}
      <div style={{
        display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(165px, 1fr))', gap:10, marginBottom:14,
      }}>
        <Stat label="إجمالي الروابط" value={counts.total}  color={C.gold}   bg="rgba(212,160,23,.10)" />
        <Stat label="سليم"           value={counts.ok}     color={C.green}  bg={C.greenBg} />
        <Stat label="مانحة مكررة"    value={counts.dupG}   color={C.red}    bg={C.redBg} />
        <Stat label="مستقبلة مكررة"  value={counts.dupR}   color={C.amber}  bg={C.amberBg} />
        <Stat label="بدون مستقبلة"   value={counts.noR}    color={C.muted2} bg="rgba(255,255,255,.04)" />
        <Stat label="بدون مانحة"     value={counts.orphan} color={C.purple} bg={C.purpleBg} />
      </div>

      {/* TOOLBAR */}
      <div style={{ marginBottom:12, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <div style={{ flex:'1 1 280px', position:'relative', minWidth:240 }}>
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="ابحث بالمالك أو رقم قوى أو التأمينات أو الرقم الموحد…"
            style={{
              width:'100%', background:C.cardAlt, border:`1px solid ${C.brd}`, color:C.text,
              padding:'10px 14px', borderRadius:10, fontFamily:F, fontSize:13, outline:'none',
            }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{
              position:'absolute', left:8, top:'50%', transform:'translateY(-50%)',
              background:'transparent', border:'none', color:C.mute, cursor:'pointer', fontSize:16,
            }}>×</button>
          )}
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          <FilterChip id="all"    label="الكل"           color={C.gold}   count={counts.total} />
          <FilterChip id="ok"     label="سليم"           color={C.green}  count={counts.ok} />
          <FilterChip id="dupG"   label="مانحة مكررة"    color={C.red}    count={counts.dupG} />
          <FilterChip id="dupR"   label="مستقبلة مكررة"  color={C.amber}  count={counts.dupR} />
          <FilterChip id="noR"    label="بدون مستقبلة"   color={C.muted2} count={counts.noR} />
          <FilterChip id="orphan" label="بدون مانحة"     color={C.purple} count={counts.orphan} />
        </div>
        <button onClick={addRow} style={{
          background:`${C.green}1f`, border:`1px solid ${C.green}55`, color:C.green,
          padding:'8px 14px', borderRadius:9, cursor:'pointer', fontFamily:F, fontSize:12.5, fontWeight:700,
        }}>+ ربط جديد</button>
      </div>

      {/* TABLE HEADER */}
      <div style={{
        display:'grid', gridTemplateColumns:'32px auto 1fr 30px 1fr 30px',
        alignItems:'center', columnGap:10, padding:'6px 12px', marginBottom:6,
        color:C.muted2, fontSize:11, fontWeight:700,
      }}>
        <div style={{ textAlign:'center' }}>#</div>
        <div>الحالة</div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <Pill color={C.green} size="sm">↑ مانحة</Pill>
          <span style={{ color:C.muted2, fontWeight:400 }}>المالك · قوى · التأمينات · الرقم الموحد</span>
        </div>
        <div></div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <Pill color={C.blue} size="sm">↓ مستقبلة</Pill>
          <span style={{ color:C.muted2, fontWeight:400 }}>المالك · قوى · التأمينات · الرقم الموحد</span>
        </div>
        <div style={{ textAlign:'center' }}>حذف</div>
      </div>

      {/* ROWS */}
      {filtered.length === 0 ? (
        <div style={{
          padding:'40px 20px', textAlign:'center', color:C.muted2, fontSize:13,
          background:C.cardAlt, border:`1px dashed ${C.brd}`, borderRadius:12,
        }}>لا توجد نتائج مطابقة</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {filtered.map(({ r, i, s }) => (
            <LinkRow key={i} idx={i} row={r} status={s}
              onChange={(nr) => updateRow(i, nr)}
              onDelete={() => deleteRow(i)}
              toast={toast} />
          ))}
        </div>
      )}

      {/* INFO */}
      <div style={{
        marginTop:14, padding:'10px 14px', background:'rgba(192,57,43,.06)',
        border:`1px dashed ${C.red}55`, borderRadius:10, color:C.mute, fontSize:12,
      }}>
        ⚠ يجب أن يكون الربط <strong style={{color:C.text}}>واحد لواحد</strong>. عند ظهور نفس المانحة في صفّين أو أكثر تُعَلَّم
        كـ <strong style={{color:C.red}}>«مانحة مكررة»</strong>؛ ونفس الشيء للمستقبلة المكررة. الرقم الموحد للمانحة هو رقم
        الاستقدام للمستقبلة.
      </div>
    </div>
  )
}
