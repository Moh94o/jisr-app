import React from 'react'

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * Skeleton — shared shimmer placeholders for page loading states.
 *
 * One source of truth for the "جارٍ التحميل" experience used across every tab.
 * Visually identical to the hand-rolled skeletons on the Facilities / Workforce
 * pages (same card chrome, same shimmer gradient, same table chrome) so the
 * whole app loads the same way.
 *
 * Usage:
 *   import PageSkeleton from './components/ui/Skeleton.jsx'
 *
 *   // Table page WITH KPI cards (cards are hidden while loading):
 *   if (initialLoading) return <PageSkeleton cards={3} columns={6} rows={8} />
 *
 *   // Table page WHERE the stat cards render regardless of loading
 *   // (skeleton only the table, so the real cards aren't duplicated):
 *   {loading ? <PageSkeleton cards={0} columns={5} /> : <Table/>}
 *
 *   // List / card-stack page (deposits feed, sync rows, settings list…):
 *   {loading ? <PageSkeleton variant="list" listRows={6} /> : <List/>}
 *
 *   // A single inline shimmer bar anywhere:
 *   <Shimmer w="60%" h={14} />
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Animations are namespaced (sk-*) so they never collide with a page's own
// fac-shimmer / wf-shimmer keyframes. Injected once per PageSkeleton mount.
const SK_KEYFRAMES = `@keyframes sk-shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}@keyframes sk-spin{to{transform:rotate(360deg)}}`

const shimmerBase = {
  display: 'inline-block', borderRadius: 6,
  background: 'linear-gradient(90deg, rgba(255,255,255,.04) 25%, rgba(255,255,255,.11) 37%, rgba(255,255,255,.04) 63%)',
  backgroundSize: '400% 100%', animation: 'sk-shimmer 1.4s ease infinite',
}

// A single animated placeholder bar.
export const Shimmer = ({ w = '100%', h = 11, r = 6, style }) => (
  <span style={{ ...shimmerBase, width: w, height: h, borderRadius: r, ...style }} />
)

// KPI / stat card placeholders — same chrome as the real KPI cards.
export function SkeletonCards({ count = 3, cols = 'repeat(auto-fit, minmax(260px, 1fr))', minHeight = 150 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 14, marginBottom: 24 }}>
      <style>{SK_KEYFRAMES}</style>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ padding: '18px 22px', borderRadius: 16, background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.05)', minHeight, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10 }}>
          <Shimmer w="42%" h={16} />
          <Shimmer w="55%" h={34} />
          <Shimmer w="70%" h={11} />
        </div>
      ))}
    </div>
  )
}

// Invoice-style KPI strip placeholder — the asymmetric 3-card hero+sidebar+breakdown
// strip used on Invoices / Payments / Transfer-Calc (grid 2.2fr 1fr 1.5fr, minHeight 190).
// `breakdownRows` controls how many label rows the right-hand breakdown card shows.
export function StatStripSkeleton({ breakdownRows = 6, cols = '2.2fr 1fr 1.5fr' }) {
  const card = { borderRadius: 16, background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.05)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)', minHeight: 190 }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 14, marginBottom: 24 }}>
      <style>{SK_KEYFRAMES}</style>
      {/* Hero — big number */}
      <div style={{ ...card, padding: '18px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Shimmer w={10} h={10} r={999} /><Shimmer w="30%" h={22} /></div>
        <Shimmer w="55%" h={40} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)' }}><Shimmer w="30%" h={10} /><Shimmer w="12%" h={12} /></div>
      </div>
      {/* Sidebar — 2 stacked KPIs */}
      <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
        {[0, 1].map(i => (
          <div key={i} style={{ flex: 1, padding: '12px 16px', borderTop: i ? '1px solid rgba(255,255,255,.06)' : 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
            <Shimmer w="60%" h={11} /><Shimmer w="35%" h={18} />
          </div>
        ))}
      </div>
      {/* Breakdown card */}
      <div style={{ ...card, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><Shimmer w="40%" h={11} /><Shimmer w="20%" h={11} /></div>
        <Shimmer w="100%" h={8} r={999} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '8px 16px', marginTop: 2 }}>
          {Array.from({ length: breakdownRows }).map((_, i) => <span key={i} style={{ display: 'flex', gap: 7, alignItems: 'center' }}><Shimmer w={14} h={10} /><Shimmer w="70%" h={10} /></span>)}
        </div>
      </div>
    </div>
  )
}

// Table rows placeholder. `columns` may be a number (even widths) or an array
// of CSS widths (e.g. ['30%','14%','24%','17%','15%']) to mirror a real table.
export function SkeletonTable({ columns = 5, rows = 8 }) {
  const cols = Array.isArray(columns)
    ? columns
    : Array.from({ length: columns }).map(() => `${(100 / columns).toFixed(2)}%`)
  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,.06)', background: '#161616' }}>
      <style>{SK_KEYFRAMES}</style>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: cols.join(' '), alignItems: 'center', gap: 8, padding: '13px 12px', borderBottom: i < rows - 1 ? '1px solid rgba(255,255,255,.03)' : 'none' }}>
          {cols.map((_, j) => {
            // The first column gets a two-line name block; the rest a single bar
            // — mirrors the real tables (name + sub-line, then plain cells).
            if (j === 0) return <div key={j} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}><Shimmer w="72%" /><Shimmer w="45%" h={8} /></div>
            return <div key={j} style={{ display: 'flex', justifyContent: 'center' }}><Shimmer w={`${55 + (j * 9) % 28}%`} /></div>
          })}
        </div>
      ))}
    </div>
  )
}

// List / card-stack placeholder — for feeds and non-table pages.
export function SkeletonList({ rows = 6 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <style>{SK_KEYFRAMES}</style>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 14, background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.05)' }}>
          <Shimmer w={44} h={44} r={12} />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Shimmer w="38%" h={13} />
            <Shimmer w="62%" h={10} />
          </div>
          <Shimmer w={72} h={26} r={8} />
        </div>
      ))}
    </div>
  )
}

// Optional inline header badge — the small spinning "جارٍ التحميل…" pill that
// some heroes show beside the title while data loads.
export function LoadingBadge({ label = 'جارٍ التحميل…' }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--tx4)', whiteSpace: 'nowrap' }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="2.4" strokeLinecap="round" style={{ animation: 'sk-spin .8s linear infinite' }}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      {label}
    </span>
  )
}

/*
 * The page-level skeleton: optional KPI cards + a table (default) or a list.
 *   variant   'table' | 'list'   (default 'table')
 *   cards     number of KPI card placeholders above the body (default 0)
 *   columns   number OR array of CSS widths for the table (default 5)
 *   rows      table rows (default 8)
 *   listRows  list rows when variant='list' (default 6)
 */
export default function PageSkeleton({ variant = 'table', cards = 0, columns = 5, rows = 8, listRows = 6 }) {
  return (
    <div style={{ fontFamily: "'Cairo','Tajawal',sans-serif" }}>
      <style>{SK_KEYFRAMES}</style>
      {cards > 0 && <SkeletonCards count={cards} />}
      {variant === 'list' ? <SkeletonList rows={listRows} /> : <SkeletonTable columns={columns} rows={rows} />}
    </div>
  )
}
