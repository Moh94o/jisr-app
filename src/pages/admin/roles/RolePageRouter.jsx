import React, { useEffect, useState, useCallback } from 'react'
import * as personsService from '../../../services/personsService.js'
import UserRolePage from './UserRolePage.jsx'
import ClientRolePage from './ClientRolePage.jsx'
import BrokerRolePage from './BrokerRolePage.jsx'
import WorkerRolePage from './WorkerRolePage.jsx'
import OwnerRolePage from './OwnerRolePage.jsx'
import BeneficiaryRolePage from './BeneficiaryRolePage.jsx'
import ManagerRolePage from './ManagerRolePage.jsx'
import SupervisorRolePage from './SupervisorRolePage.jsx'
import TrackerRolePage from './TrackerRolePage.jsx'
import SaudizationRolePage from './SaudizationRolePage.jsx'
import SmsForwarderRolePage from './SmsForwarderRolePage.jsx'

const F = "'Cairo','Tajawal',sans-serif"
const GOLD = '#D4A017'

export default function RolePageRouter({ roleKey, personId, onBack, toast, countries, branches, idTypes, genders, user }) {
  const [person, setPerson] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { profile, person } = await personsService.getPerson(personId)
      setProfile(profile); setPerson(person)
    } catch (e) {
      toast?.('خطأ: ' + (e.message || ''))
    } finally { setLoading(false) }
  }, [personId, toast])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div style={{ padding: 80, textAlign: 'center', color: 'var(--tx4)', fontFamily: F }}>
        <div style={{ display: 'inline-block', width: 30, height: 30,
          border: `3px solid rgba(212,160,23,.15)`, borderTopColor: GOLD,
          borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <div style={{ marginTop: 14, fontSize: 12, fontWeight: 700 }}>جاري التحميل...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!person || !profile) return null

  const shared = { person, profile, onBack, toast, countries, branches, idTypes, genders, user, reload: load }

  switch (roleKey) {
    case 'user':        return <UserRolePage {...shared} />
    case 'client':      return <ClientRolePage {...shared} />
    case 'broker':      return <BrokerRolePage {...shared} />
    case 'worker':      return <WorkerRolePage {...shared} />
    case 'owner':       return <OwnerRolePage {...shared} />
    case 'beneficiary': return <BeneficiaryRolePage {...shared} />
    case 'manager':     return <ManagerRolePage {...shared} />
    case 'supervisor':  return <SupervisorRolePage {...shared} />
    case 'tracker':     return <TrackerRolePage {...shared} />
    case 'saudization': return <SaudizationRolePage {...shared} />
    case 'sms_forwarder': return <SmsForwarderRolePage {...shared} />
    default: return null
  }
}
