import React from 'react'
import { UserCheck } from 'lucide-react'
import CrPartyPage from './CrPartyShared.jsx'

export default function OwnerRolePage(props) {
  return <CrPartyPage {...props} config={{
    title: 'ملف المالك', color: '#e5867a', Icon: UserCheck,
    roleType: 'owner', showOwnership: true, showPosition: false,
    emptyText: 'لا توجد منشآت مملوكة',
  }} />
}
