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
//
// Two further per-user controls live in `users.ui_visibility` (JSONB, already
// loaded on the user at login) and are read here:
//   • card:<tab>:<key>  → detail-page card visibility (default VISIBLE; an
//                         explicit `false` hides that one card for the user).
//   • office:<tab>      → { mode:'inherit'|'all'|'specific', ids:[branchId…] }
//                         per-tab office scope (default 'inherit' = account offices).

import { tabModule, MODULE_ACTIONS } from './permCatalog.js'
export { tabModule }

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
  temp_workers: 'workers.view',
  work_visas: 'workers.view',
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

// ── Tab-scoped action check ─────────────────────────────────────────────
// Check an action on a tab using that tab's catalog module. e.g.
// canTab(user, 'facilities', 'create'). GM ⇒ always.
export const canTab = (user, tabId, action) =>
  isGM(user) || hasPerm(user, tabModule(tabId), action)

// ── Detail-page card visibility ─────────────────────────────────────────
// A card on a record's detail page is visible unless the GM explicitly hid it
// for this user (users.ui_visibility['card:<tab>:<key>'] === false). GM ⇒ all.
export const cardVisible = (user, tabId, cardKey) => {
  if (isGM(user)) return true
  return user?.ui_visibility?.[`card:${tabId}:${cardKey}`] !== false
}
// Convenience builder: a per-page predicate bound to one tab.
export const cardGate = (user, tabId) => (cardKey) => cardVisible(user, tabId, cardKey)

// ── Per-card action override ────────────────────────────────────────────
// Within a card, an individual action button (edit / add / delete / a special
// action) can be hidden for this user even when they hold the tab-level
// permission — letting the GM say "you may edit, but not THIS card".
// Stored in users.ui_visibility['cardact:<tab>:<key>:<action>'] === false.
// Default ALLOWED (true); GM always true.
export const cardActionAllowed = (user, tabId, cardKey, action) => {
  if (isGM(user)) return true
  return user?.ui_visibility?.[`cardact:${tabId}:${cardKey}:${action}`] !== false
}

// The button-level gate for an action inside a card. Two cases, decided
// automatically by whether the action is a grantable tab permission:
//   • Granted action (create/edit/delete/sync and the module's specials):
//     the user must HOLD the tab permission AND not have it excluded on this card.
//   • In-card-only button (add_comment, check_insurance, toggle, distribute…):
//     pure per-card visibility — shown unless excluded on this card.
// This is the single helper a detail card should use to render any button.
export const canCardAction = (user, tabId, cardKey, action) => {
  if (isGM(user)) return true
  if (!cardActionAllowed(user, tabId, cardKey, action)) return false
  const mod = tabModule(tabId)
  const isGrantable = (MODULE_ACTIONS[mod] || []).some(a => a.action === action)
  return isGrantable ? hasPerm(user, mod, action) : true
}
// Alias kept for clarity at call sites.
export const canCardBtn = canCardAction

// ── Per-tab office scope ────────────────────────────────────────────────
// Returns the office policy for a tab: { mode, ids }. `mode` is
// 'inherit' (use the account's offices), 'all' (every office) or 'specific'.
export const tabOfficePolicy = (user, tabId) => {
  const raw = user?.ui_visibility?.[`office:${tabId}`]
  if (raw && typeof raw === 'object' && raw.mode) {
    return { mode: raw.mode, ids: Array.isArray(raw.ids) ? raw.ids : [] }
  }
  return { mode: 'inherit', ids: [] }
}

// The concrete list of office ids a user may operate in for a tab. GM ⇒ null
// (meaning "no restriction — all offices"). For non-GM: 'all' ⇒ null,
// 'specific' ⇒ the chosen ids, 'inherit' ⇒ the account's own offices.
export const tabOffices = (user, tabId) => {
  if (isGM(user)) return null
  const { mode, ids } = tabOfficePolicy(user, tabId)
  if (mode === 'all') return null
  if (mode === 'specific') return ids
  return userOffices(user)
}

// Can the user act within `branchId` for a given tab? null list ⇒ unrestricted.
export const canTabBranch = (user, tabId, branchId) => {
  if (isGM(user)) return true
  const offices = tabOffices(user, tabId)
  if (offices == null) return true        // unrestricted
  if (branchId == null) return true        // record has no office
  return offices.includes(branchId)
}
