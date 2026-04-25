import React from 'react'
import { UserCheck, BadgeCheck } from 'lucide-react'
import CrPartyPage from './CrPartyShared.jsx'

export default function OwnerRolePage(props) {
  return <CrPartyPage {...props} config={{
    title: 'ملف المالك', color: '#e5867a', Icon: UserCheck,
    roleType: 'owner', showOwnership: true, showPosition: false,
    emptyText: 'لا توجد منشآت مملوكة',
    simpleAdd: true,
    addText: 'تعيين كمالك',
    addIcon: BadgeCheck,
    addIconAfter: true,
    assignedText: 'معيّن كمالك',
    simpleAddToast: 'تم تعيين الشخص كمالك — الآن يظهر في قوائم الملاك عند ربطه بمنشأة',
    simpleUnassignToast: 'تم إلغاء تعيين الشخص كمالك',
  }} />
}
