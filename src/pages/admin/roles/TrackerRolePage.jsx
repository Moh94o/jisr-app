import React, { useEffect, useState, useCallback } from 'react'
import { UserCheck, BadgeCheck, CheckCircle2, X } from 'lucide-react'
import RoleLayout from './RoleLayout.jsx'
import { AddBtn, EmptyState, C } from './RoleUI.jsx'
import * as rolesService from '../../../services/rolesService.js'

const F = "'Cairo','Tajawal',sans-serif"
const CYAN = '#06b6d4'

function AssignedPill({ text, onUnassign }) {
  const okColor = C.ok
  return (
    <div style={{ display: 'inline-flex', alignItems: 'stretch', height: 38,
      borderRadius: 10, overflow: 'hidden',
      border: `1px solid ${okColor}55`, background: `${okColor}14`,
      boxShadow: `inset 0 0 0 1px ${okColor}1a, 0 0 12px ${okColor}18` }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '0 14px', color: okColor, fontFamily: F, fontSize: 12, fontWeight: 800 }}>
        <CheckCircle2 size={14} strokeWidth={2.5} />
        {text}
      </div>
      <button onClick={onUnassign} title="إلغاء التعيين"
        style={{ width: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          border: 'none', borderInlineStart: `1px solid ${okColor}33`,
          background: 'transparent', padding: 0,
          color: okColor, cursor: 'pointer', transition: '.15s' }}
        onMouseEnter={e => { e.currentTarget.style.background = `${okColor}22` }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
        <X size={13} strokeWidth={2.5} />
      </button>
    </div>
  )
}

export default function TrackerRolePage({ person, onBack, toast, reload }) {
  const [isMarked, setIsMarked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const flag = await rolesService.getPersonRoleFlag(person.id, 'tracker')
      setIsMarked(flag)
    } catch (e) { toast?.(rolesService.humanizeDbError(e)) }
    finally { setLoading(false) }
  }, [person.id, toast])

  useEffect(() => { load() }, [load])

  const onAssign = async () => {
    if (isMarked || marking) return
    setMarking(true)
    try {
      await rolesService.setPersonRoleFlag(person.id, 'tracker')
      setIsMarked(true)
      toast?.('تم تعيين الشخص كمعقب — الآن يظهر في قوائم المعقبين')
      reload?.()
    } catch (e) { toast?.(rolesService.humanizeDbError(e)) }
    finally { setMarking(false) }
  }
  const onUnassign = async () => {
    if (marking) return
    setMarking(true)
    try {
      await rolesService.removePersonRoleFlag(person.id, 'tracker')
      setIsMarked(false)
      toast?.('تم إلغاء تعيين الشخص كمعقب')
      reload?.()
    } catch (e) { toast?.(rolesService.humanizeDbError(e)) }
    finally { setMarking(false) }
  }

  return (
    <RoleLayout title="ملف المعقب" subtitle={person?.name_ar} color={CYAN} onBack={onBack}
      actions={isMarked
        ? <AssignedPill text="معيّن كمعقب" onUnassign={onUnassign} />
        : <AddBtn text="تعيين كمعقب" onClick={onAssign} color={CYAN} Icon={BadgeCheck} iconAfter />}>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx5)' }}>جاري التحميل...</div>
      ) : (
        <EmptyState text={isMarked
          ? 'تم تعيين هذا الشخص كمعقب — يظهر الآن في القوائم المنسدلة لاختيار المعقبين عند ربطه بمعاملة أو سجل.'
          : 'لم يُعيّن بعد. اضغط "تعيين كمعقب" لجعله متاحاً في قوائم اختيار المعقبين.'} />
      )}
    </RoleLayout>
  )
}
