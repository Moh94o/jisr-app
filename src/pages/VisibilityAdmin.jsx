import React from 'react'
import { Eye, EyeOff } from 'lucide-react'

const F = `'Cairo','Tajawal',sans-serif`
const C = { gold: '#D4A017', ok: '#27a046', red: '#c0392b' }

const VIS_KEY = 'jisr_visibility'
const LOCKED = ['admin_hub', 'admin_visibility']

export function getVisibility() {
  try { return JSON.parse(localStorage.getItem(VIS_KEY) || '{}') } catch { return {} }
}
export function isItemVisible(id) {
  if (LOCKED.includes(id)) return true
  const cfg = getVisibility()
  return cfg[id] !== false
}

export default function VisibilityAdmin({ lang, toast, nav, hubTabs, visibility, onChange }) {
  const isAr = (lang || 'ar') === 'ar'
  const update = (id, visible) => {
    if (LOCKED.includes(id)) return
    const next = { ...visibility, [id]: visible }
    onChange(next)
    toast && toast(isAr ? (visible ? 'تم إظهار التبويب' : 'تم إخفاء التبويب') : (visible ? 'Shown' : 'Hidden'))
  }
  const get = id => visibility[id] !== false
  const showAll = () => { onChange({}); toast && toast(isAr ? 'تم إظهار كل التبويبات' : 'All shown') }
  const hideAllExcept = (keepIds) => {
    const next = {}
    const allIds = [...nav.map(n => n.id), ...Object.values(hubTabs).flat().map(t => t.id), 'fab_service_request', 'fab_transfer_calc']
    allIds.forEach(id => { next[id] = keepIds.includes(id) })
    onChange(next)
    toast && toast(isAr ? 'تم تطبيق العرض المبسّط' : 'Minimal view applied')
  }

  const FAB_BUTTONS = [
    { id: 'fab_service_request', l: isAr ? 'زر طلب خدمة' : 'Service Request Button' },
    { id: 'fab_transfer_calc', l: isAr ? 'زر حسبة التنازل' : 'Transfer Calc Button' }
  ]

  const Toggle = ({ id, label, disabled }) => {
    const on = get(id)
    const locked = LOCKED.includes(id) || disabled
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 14px', borderRadius: 9, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)', opacity: locked ? .6 : 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: on ? 'var(--tx)' : 'var(--tx4)', fontSize: 13, fontWeight: 600 }}>{label}</span>
          {locked && <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 5, background: 'rgba(212,160,23,.1)', color: C.gold, fontWeight: 700 }}>{isAr ? 'دائم' : 'Always'}</span>}
        </div>
        <button type="button" disabled={locked} onClick={() => update(id, !on)}
          style={{ width: 44, height: 22, borderRadius: 999, border: 'none', background: on ? C.ok : 'rgba(255,255,255,.15)', cursor: locked ? 'not-allowed' : 'pointer', position: 'relative', padding: 0, transition: '.2s', flexShrink: 0 }}>
          <span style={{ position: 'absolute', width: 16, height: 16, borderRadius: '50%', background: '#fff', top: 3, [isAr ? 'right' : 'left']: on ? 3 : 25, transition: '.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {on ? <Eye size={9} color={C.ok} strokeWidth={3} /> : <EyeOff size={9} color="#999" strokeWidth={3} />}
          </span>
        </button>
      </div>
    )
  }

  const fieldset = { borderRadius: 12, border: '1.5px solid rgba(212,160,23,.25)', padding: '18px 14px 14px', position: 'relative' }
  const legend = { position: 'absolute', top: -9, right: 14, background: 'var(--bg,#111)', padding: '0 8px', fontSize: 12, fontWeight: 800, color: C.gold, fontFamily: F }
  const quickBtn = { height: 34, padding: '0 14px', borderRadius: 8, border: '1px solid rgba(212,160,23,.25)', background: 'rgba(212,160,23,.06)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer' }

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, direction: isAr ? 'rtl' : 'ltr', fontFamily: F }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--tx)' }}>{isAr ? 'التبويبات المرئية' : 'Visible Tabs'}</div>
        <div style={{ fontSize: 11, color: 'var(--tx5)', marginTop: 2 }}>{isAr ? 'تحكم بظهور التبويبات والصفحات للموظفين' : 'Control which tabs are shown to employees'}</div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={showAll} style={quickBtn}>{isAr ? 'إظهار الكل' : 'Show all'}</button>
        <button type="button" onClick={() => hideAllExcept(['admin_hub', 'admin_visibility', 'finance_hub', 'transfer_calc', 'otp_messages', 'fab_transfer_calc'])}
          style={{ ...quickBtn, borderColor: 'rgba(39,160,70,.3)', background: 'rgba(39,160,70,.06)', color: C.ok }}>
          {isAr ? 'عرض مبسّط (التنازل + الرسائل فقط)' : 'Minimal (Transfer Calc + SMS only)'}
        </button>
      </div>

      {/* Sidebar items */}
      <div style={fieldset}>
        <div style={legend}>{isAr ? 'القائمة الجانبية' : 'Sidebar Items'}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
          {nav.map(n => {
            const subs = hubTabs[n.id] || []
            return (
              <div key={n.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Toggle id={n.id} label={n.l} />
                {subs.length > 0 && (
                  <div style={{ [isAr ? 'paddingRight' : 'paddingLeft']: 20, display: 'flex', flexDirection: 'column', gap: 4, borderRight: isAr ? '2px solid rgba(212,160,23,.12)' : undefined, borderLeft: isAr ? undefined : '2px solid rgba(212,160,23,.12)', marginRight: isAr ? 8 : undefined, marginLeft: isAr ? undefined : 8 }}>
                    {subs.map(t => <Toggle key={t.id} id={t.id} label={t.l} />)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick action buttons */}
      <div style={fieldset}>
        <div style={legend}>{isAr ? 'الأزرار السريعة' : 'Quick Action Buttons'}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
          {FAB_BUTTONS.map(b => <Toggle key={b.id} id={b.id} label={b.l} />)}
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--tx5)', textAlign: 'center', padding: '8px 0' }}>
        {isAr ? 'التغييرات تُحفظ فوراً وتُطبّق على جميع المستخدمين' : 'Changes save instantly and apply to all users'}
      </div>
    </div>
  )
}
