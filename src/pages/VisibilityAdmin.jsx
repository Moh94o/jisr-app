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

