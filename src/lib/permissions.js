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
//   • card:<tab>:<key>  → detail-page card visibility (default HIDDEN; an
//                         explicit `true` grants that one card to the user).
//   • office:<tab>      → { mode:'inherit'|'all'|'specific', ids:[branchId…] }
//                         per-tab office scope (default 'inherit' = account offices).

import { tabModule, MODULE_ACTIONS } from './permCatalog.js'
export { tabModule }

// Merge several roles' granular ui_visibility maps into one effective map for a
// user (called at login). PERMISSIVE union: a boolean hide/lock key resolves to
// `false` (hidden/locked) only when EVERY role sets it false — if any role leaves
// it open, the item stays visible. Object policies (office:/svc:/stats:) take the
// first role that defines them. The user's OWN ui_visibility is layered on top.
export const mergeRoleVis = (roleVisList) => {
  const list = (roleVisList || []).filter(v => v && typeof v === 'object')
  if (!list.length) return {}
  const keys = new Set()
  list.forEach(v => Object.keys(v).forEach(k => keys.add(k)))
  const out = {}
  for (const k of keys) {
    const objVal = list.map(v => v[k]).find(x => x && typeof x === 'object')
    if (objVal) { out[k] = objVal; continue }
    if (list.every(v => v[k] === false)) out[k] = false
  }
  return out
}

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

// The branches in which the user holds (module.action), derived from their
// per-branch role assignments (user.branchPerms, loaded at login from
// v_user_branch_permissions). Returns:
//   • null      → ALL branches (GM, an all-branches assignment, or a legacy
//                 primary role that grants it)
//   • []        → no access in any branch
//   • [ids…]    → only these branches
//   • undefined → branchPerms not loaded (caller should fall back to legacy)
export const permBranchScope = (user, module, action) => {
  if (isGM(user)) return null
  if (!Array.isArray(user?.branchPerms)) return undefined
  const rows = user.branchPerms.filter(r => r.module === module && r.action === action)
  if (!rows.length) return []
  if (rows.some(r => r.branch_id == null)) return null
  return Array.from(new Set(rows.map(r => r.branch_id)))
}

// Can the user perform `action` on a record belonging to `branchId`?
// GM ⇒ always. Otherwise: the action must be granted in a role whose branch
// scope covers `branchId` (or all branches). A record with no office is allowed
// as long as the user has the action somewhere.
export const canOnBranch = (user, module, action, branchId) => {
  if (isGM(user)) return true
  const scope = permBranchScope(user, module, action)
  if (scope === undefined) {             // legacy session — fall back
    if (!hasPerm(user, module, action)) return false
    if (branchId == null) return true
    return userOffices(user).includes(branchId)
  }
  if (scope === null) return true        // all branches
  if (!scope.length) return false        // no access anywhere
  if (branchId == null) return true      // record has no office
  return scope.includes(branchId)
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
  // home (the dashboard) is the universal landing page — always viewable so a
  // user is never dropped on a "no access" screen at login. The GM can still
  // hide the home tab for a role via ui_visibility if desired.
  facilities: 'facilities.view',
  workers: 'workers.view',
  temp_workers: 'workers.view',
  work_visas: 'workers.view',
  invoices: 'invoices.view',
  payments: 'payments.view',
  deposits: 'deposits.view',
  transfer_calc: 'quotations.view',
  renewal_calc: 'renewal_calc.view',
  admin_offices: 'admin_offices.view',
  admin_clients: 'admin_clients.view',
  admin_agents: 'admin_agents.view',
  admin_services: 'admin_services.view',
  admin_permissions: 'admin_permissions.view',
  admin_roles: 'admin_permissions.view',
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

// ── Section visibility (role-driven) ────────────────────────────────────
// A user "can see" a section when their role(s) grant its view/access action.
// This is the single gate that opens up the section's detail-page cards,
// fields, popups and wizard stages BY DEFAULT — the granular per-item toggles
// are demoted to exceptions (an explicit `false` hides/locks one item).
export const sectionViewable = (user, tabId) => {
  if (isGM(user)) return true
  const mod = tabModule(tabId)
  return hasPerm(user, mod, 'view') || hasPerm(user, mod, 'access')
}

// ── Detail-page card visibility ─────────────────────────────────────────
// ROLE-FIRST MODEL: a card is visible when the user can view the section,
// UNLESS the GM has explicitly hidden it for this user
// (users.ui_visibility['card:<tab>:<key>'] === false). GM ⇒ all.
export const cardVisible = (user, tabId, cardKey) => {
  if (isGM(user)) return true
  if (!sectionViewable(user, tabId)) return false
  return user?.ui_visibility?.[`card:${tabId}:${cardKey}`] !== false
}
// Convenience builder: a per-page predicate bound to one tab.
export const cardGate = (user, tabId) => (cardKey) => cardVisible(user, tabId, cardKey)

// ── Per-card action override ────────────────────────────────────────────
// Within a card, an individual action button (edit / add / delete / a special
// action) can be hidden for this user even when they hold the tab-level
// permission — letting the GM say "you may edit, but not THIS card".
// ROLE-FIRST: allowed by default; an explicit `false` excludes it on this card.
// users.ui_visibility['cardact:<tab>:<key>:<action>'] === false ⇒ excluded.
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

// ── Field-level gates ───────────────────────────────────────────────────
// Granularity below the card: every individual FIELD on a detail card / inside
// a modal / inside a wizard stage can be (a) hidden from view and (b) locked
// from editing, per user. Field keys are unique within a tab (see TAB_FIELDS in
// permCatalog.js). Both default DENIED; GM always bypasses.
//
// ROLE-FIRST MODEL (default visible/editable when the section is granted):
//   • field visibility → shown when the user can view the section, UNLESS
//                        users.ui_visibility['field:<tab>:<fieldKey>'] === false
//                        explicitly hides it. UI-enforced.
//   • field edit lock  → editable when the user can EDIT the section, UNLESS
//                        users.ui_visibility['fieldedit:<tab>:<fieldKey>'] === false
//                        (or the field is hidden). The DB enforce_field_locks()
//                        trigger mirrors this: it blocks a column only on an
//                        explicit per-user lock.
export const fieldVisible = (user, tabId, fieldKey) => {
  if (isGM(user)) return true
  if (!sectionViewable(user, tabId)) return false
  return user?.ui_visibility?.[`field:${tabId}:${fieldKey}`] !== false
}
// `action` is the capability the field's editability keys off — defaults to
// 'edit' (editing an existing record). Create-only wizards pass 'create' so a
// user who may build a new record (but not edit existing ones) can fill it in.
export const fieldEditable = (user, tabId, fieldKey, action = 'edit') => {
  if (isGM(user)) return true
  // Must be visible, the section must grant the capability, and the field must
  // not be explicitly locked for this user.
  if (!fieldVisible(user, tabId, fieldKey)) return false
  if (!hasPerm(user, tabModule(tabId), action)) return false
  return user?.ui_visibility?.[`fieldedit:${tabId}:${fieldKey}`] !== false
}
// Per-tab bound builders (mirror cardGate) — convenient inside one page.
export const fieldGate = (user, tabId) => (fieldKey) => fieldVisible(user, tabId, fieldKey)
export const fieldEditGate = (user, tabId) => (fieldKey) => fieldEditable(user, tabId, fieldKey)

// ── Modal / popup gate ──────────────────────────────────────────────────
// A whole popup (record-payment, edit-client, issue-iqama, …) opens by default
// when the user can view the section, UNLESS the GM has explicitly blocked it:
// users.ui_visibility['modal:<tab>:<modalKey>'] === false ⇒ blocked. The write
// the modal performs is still independently DB-gated by its action permission.
export const modalAllowed = (user, tabId, modalKey) => {
  if (isGM(user)) return true
  if (!sectionViewable(user, tabId)) return false
  return user?.ui_visibility?.[`modal:${tabId}:${modalKey}`] !== false
}

// ── Wizard-stage gate ───────────────────────────────────────────────────
// A step inside a multi-stage calculator (Kafala / renewal wizard) is visible
// by default when the section is granted, UNLESS explicitly hidden:
// users.ui_visibility['stage:<tab>:<stageKey>'] === false ⇒ hidden.
export const stageVisible = (user, tabId, stageKey) => {
  if (isGM(user)) return true
  if (!sectionViewable(user, tabId)) return false
  return user?.ui_visibility?.[`stage:${tabId}:${stageKey}`] !== false
}

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
  // An explicit per-user office override (advanced) wins.
  const { mode, ids } = tabOfficePolicy(user, tabId)
  if (mode === 'all') return null
  if (mode === 'specific') return ids
  // Default: the branches where the user's role(s) grant this tab's view/access.
  const mod = tabModule(tabId)
  let scope = permBranchScope(user, mod, 'view')
  if (scope === undefined) return userOffices(user)        // legacy session
  if (Array.isArray(scope) && scope.length === 0) {
    const acc = permBranchScope(user, mod, 'access')
    if (acc === null) return null
    if (Array.isArray(acc) && acc.length) return acc
  }
  return scope === null ? null : scope
}

// Can the user act within `branchId` for a given tab? null list ⇒ unrestricted.
export const canTabBranch = (user, tabId, branchId) => {
  if (isGM(user)) return true
  const offices = tabOffices(user, tabId)
  if (offices == null) return true        // unrestricted
  if (branchId == null) return true        // record has no office
  return offices.includes(branchId)
}

// ── Per-tab SERVICE-TYPE scope (which service types a user may see) ───────
// Stored in users.ui_visibility['svc:<tab>'] = { mode:'all'|'specific', ids:[lookup_item_id…] }.
// Default 'all'. Used by the Invoices list/stats (and enforced in the DB RPCs).
export const tabServicePolicy = (user, tabId) => {
  const raw = user?.ui_visibility?.[`svc:${tabId}`]
  if (raw && typeof raw === 'object' && raw.mode) {
    return { mode: raw.mode, ids: Array.isArray(raw.ids) ? raw.ids : [] }
  }
  return { mode: 'all', ids: [] }
}
// The concrete service-type ids the user may see. GM/all ⇒ null (no restriction).
export const tabServiceTypes = (user, tabId) => {
  if (isGM(user)) return null
  const { mode, ids } = tabServicePolicy(user, tabId)
  return mode === 'specific' ? ids : null
}
export const canTabService = (user, tabId, serviceTypeId) => {
  if (isGM(user)) return true
  const allowed = tabServiceTypes(user, tabId)
  if (allowed == null) return true
  if (serviceTypeId == null) return true
  return allowed.includes(serviceTypeId)
}

// ── Per-tab STAT-CARDS mode ──────────────────────────────────────────────
// users.ui_visibility['stats:<tab>'] ∈ 'real' | 'zero' | 'hidden'. Default
// 'real'. 'zero' shows the cards but always zeroed (also enforced in the stats
// RPC so the figures can't be read via the API); 'hidden' removes them.
export const statsMode = (user, tabId) => {
  if (isGM(user)) return 'real'
  const v = user?.ui_visibility?.[`stats:${tabId}`]
  return (v === 'zero' || v === 'hidden') ? v : 'real'
}
