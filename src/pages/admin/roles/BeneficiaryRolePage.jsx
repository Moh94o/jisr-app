import React from 'react'
import { UserCheck } from 'lucide-react'
import CrPartyPage from './CrPartyShared.jsx'

export default function BeneficiaryRolePage(props) {
  return <CrPartyPage {...props} config={{
    title: 'ملف المستفيد', color: '#e3b341', Icon: UserCheck,
    roleType: 'beneficiary', showOwnership: false, showPosition: false,
    emptyText: 'لا توجد منشآت مستفيد منها',
  }} />
}
