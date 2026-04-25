import React from 'react'
import { UserCheck, BadgeCheck } from 'lucide-react'
import CrPartyPage from './CrPartyShared.jsx'

export default function BeneficiaryRolePage(props) {
  return <CrPartyPage {...props} config={{
    title: 'ملف المستفيد', color: '#e3b341', Icon: UserCheck,
    roleType: 'beneficiary', showOwnership: false, showPosition: false,
    emptyText: 'لا توجد منشآت مستفيد منها',
    simpleAdd: true,
    addText: 'تعيين كمستفيد',
    addIcon: BadgeCheck,
    addIconAfter: true,
    assignedText: 'معيّن كمستفيد',
    simpleAddToast: 'تم تعيين الشخص كمستفيد — الآن يظهر في قوائم المستفيدين عند ربطه بمنشأة',
    simpleUnassignToast: 'تم إلغاء تعيين الشخص كمستفيد',
  }} />
}
