// Centralised permission checks for the app's role/permission system.
//
// The logged-in `user` object carries `user.perms` — an array of
// { module, action, is_granted, branch_scope, branch_id } rows loaded at login
// from the `v_user_effective_permissions` view (App.jsx). Roles are multi-valued
// (user_roles junction); the view already unions every role's grants, so here we
// only read the flattened `perms` array.
//
// المدير العام (General Manager) always bypasses every check.
// Operational roles are scoped to the user's own office(s) — a permission applies
// to a record only when that record's office is one of the user's offices.

export const isGM = (user) =>
  user?.role?.name_ar === 'المدير العام' || user?.role?.name_en === 'General Manager'

// The offices a user belongs to (multi-office `branch_ids`, falling back to the
// single `primary_branch_id`). Used to scope operational permissions.
export const userOffices = (user) => {
  const ids = Array.isArray(user?.branch_ids) && user.branch_ids.length
    ? user.branch_ids
    : [user?.primary_branch_id]
  return ids.filter(Boolean)
}

// Does the user hold a permission at all (ignoring office scope)? GM ⇒ always true.
export const hasPerm = (user, module, action) =>
  isGM(user) || (Array.isArray(user?.perms) &&
    user.perms.some(p => p.module === module && p.action === action && p.is_granted !== false))

// Can the user perform `action` on a record belonging to `branchId`?
// GM ⇒ always. Otherwise needs the permission AND (the record has no office, or
// the record's office is one of the user's offices).
export const canOnBranch = (user, module, action, branchId) => {
  if (isGM(user)) return true
  if (!hasPerm(user, module, action)) return false
  if (branchId == null) return true
  return userOffices(user).includes(branchId)
}

// Convenience: check a "module.action" code string. GM ⇒ always true.
// The action is everything after the first dot (some action codes contain dots,
// mirroring current_user_has_permission() in the DB).
export const can = (user, code) => {
  if (isGM(user)) return true
  if (!code) return true
  const dot = code.indexOf('.')
  if (dot === -1) return hasPerm(user, code, '')
  return hasPerm(user, code.slice(0, dot), code.slice(dot + 1))
}

// Sidebar page id → the "view"/"access" permission code that gates it.
// Pages absent from this map are never permission-gated (always allowed).
// Note: the transfer-calc tab is gated by the `quotations` module (the active
// quote/transfer domain); the standalone `transfer_calc` module is a legacy
// duplicate and is intentionally not used here.
export const PAGE_VIEW_PERM = {
  home: 'home.view',
  facilities: 'facilities.view',
  workers: 'workers.view',
  invoices: 'invoices.view',
  payments: 'payments.view',
  deposits: 'deposits.view',
  transfer_calc: 'quotations.view',
  admin_offices: 'admin_offices.view',
  admin_clients: 'admin_clients.view',
  admin_agents: 'admin_agents.view',
  admin_services: 'admin_services.view',
  admin_permissions: 'admin_permissions.view',
  settings_fields: 'settings_fields.view',
  sync_hub: 'sync_hub.access',
  sync_log: 'sync_hub.access',
}

// Does the user have view/access permission for a sidebar page id? GM ⇒ always.
export const canViewPage = (user, pageId) => {
  if (isGM(user)) return true
  const code = PAGE_VIEW_PERM[pageId]
  return code ? can(user, code) : true
}
