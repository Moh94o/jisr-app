// Supabase-backed persistence for ServiceAdminPage state.
//
// State lives in browser localStorage for synchronous reads (existing
// helpers like isServiceActive, getPricingFor depend on sync access),
// and is mirrored to public.system_settings rows whose setting_key
// starts with "svc_admin_" so the configuration survives across
// devices and browser data wipes.

import { getSupabase } from './supabase.js'

// localStorage key -> system_settings.setting_key
export const SVC_ADMIN_KEY_MAP = {
  jisr_service_overrides:     'svc_admin_service_overrides',
  jisr_branch_overrides:      'svc_admin_branch_overrides',
  visaPricingMin_permanent:   'svc_admin_pricing_visa_permanent',
  visaPricingMin_temporary:   'svc_admin_pricing_visa_temporary',
  kafalaPricingConfig:        'svc_admin_pricing_kafala',
  iqamaRenewalPricingConfig:  'svc_admin_pricing_iqama',
  servicesPricingConfig:      'svc_admin_pricing_services',
}

const TABLE = 'system_settings'

export async function fetchAllSvcAdminSettings() {
  const sb = getSupabase()
  const { data, error } = await sb
    .from(TABLE)
    .select('setting_key, setting_value')
    .like('setting_key', 'svc_admin_%')
  if (error) throw error
  const out = {}
  for (const row of data || []) {
    try { out[row.setting_key] = JSON.parse(row.setting_value) }
    catch { /* ignore malformed row */ }
  }
  return out
}

export async function saveSvcAdminSetting(localKey, value) {
  const settingKey = SVC_ADMIN_KEY_MAP[localKey]
  if (!settingKey) return { skipped: true }
  const sb = getSupabase()
  const { error } = await sb
    .from(TABLE)
    .upsert(
      { setting_key: settingKey, setting_value: JSON.stringify(value), updated_at: new Date().toISOString() },
      { onConflict: 'setting_key' }
    )
  if (error) throw error
  return { saved: true }
}

// One-shot hydration: pull every svc_admin_* row into localStorage so
// synchronous readers see remote state. If a key exists locally but not
// remotely (first run after this feature ships), push the local value up
// so existing browser-only configuration migrates into the DB.
export async function hydrateSvcAdminFromDb() {
  let remote
  try { remote = await fetchAllSvcAdminSettings() }
  catch (e) { console.warn('[svcAdminSync] hydrate failed', e); return { hydrated: 0, migrated: 0, error: e } }

  let hydrated = 0
  let migrated = 0
  for (const [localKey, settingKey] of Object.entries(SVC_ADMIN_KEY_MAP)) {
    if (remote[settingKey] !== undefined) {
      localStorage.setItem(localKey, JSON.stringify(remote[settingKey]))
      hydrated++
    } else {
      // No remote row — migrate local data up if present and non-empty.
      const localRaw = localStorage.getItem(localKey)
      if (!localRaw) continue
      try {
        const parsed = JSON.parse(localRaw)
        const isEmpty = parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Object.keys(parsed).length === 0
        if (isEmpty) continue
        await saveSvcAdminSetting(localKey, parsed)
        migrated++
      } catch (e) {
        console.warn('[svcAdminSync] migrate failed for', localKey, e)
      }
    }
  }
  return { hydrated, migrated }
}
