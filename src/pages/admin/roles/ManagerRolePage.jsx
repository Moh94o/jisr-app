import React from 'react'
import { UserCheck } from 'lucide-react'
import CrPartyPage from './CrPartyShared.jsx'

export default function ManagerRolePage(props) {
  return <CrPartyPage {...props} config={{
    title: 'ملف المدير', color: '#b58cf5', Icon: UserCheck,
    roleType: 'manager', showOwnership: false, showPosition: true,
    emptyText: 'لا توجد منشآت مُدارة',
  }} />
}
