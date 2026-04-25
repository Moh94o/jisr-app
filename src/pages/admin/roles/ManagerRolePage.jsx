import React from 'react'
import { UserCheck, BadgeCheck } from 'lucide-react'
import CrPartyPage from './CrPartyShared.jsx'

export default function ManagerRolePage(props) {
  return <CrPartyPage {...props} config={{
    title: 'ملف المدير', color: '#b58cf5', Icon: UserCheck,
    roleType: 'manager', showOwnership: false, showPosition: true,
    emptyText: 'لا توجد منشآت مُدارة',
    simpleAdd: true,
    addText: 'تعيين كمدير',
    addIcon: BadgeCheck,
    addIconAfter: true,
    assignedText: 'معيّن كمدير',
    simpleAddToast: 'تم تعيين الشخص كمدير — الآن يظهر في قوائم المدراء عند ربطه بمنشأة',
    simpleUnassignToast: 'تم إلغاء تعيين الشخص كمدير',
  }} />
}
