import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PortalApp from './pages/portal/PortalApp.jsx'

// Routing: anything under /portal/* renders the public client portal
// instead of the staff-side App.
const isPortal = typeof window !== 'undefined' && window.location.pathname.startsWith('/portal')

// Sandbox banner: visible on every view when running against the dev/test Supabase project
// (npm run sandbox → .env.sandbox sets VITE_ENV_LABEL) so test data is never mistaken for production.
function SandboxBadge() {
  if (!import.meta.env.VITE_ENV_LABEL) return null
  return (
    <div style={{
      position: 'fixed', bottom: 12, left: 12, zIndex: 999999, pointerEvents: 'none',
      background: 'rgba(192,57,43,.92)', color: '#fff', fontFamily: "'Cairo',sans-serif",
      fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 10,
      boxShadow: '0 4px 18px rgba(0,0,0,.45)', letterSpacing: '.3px', direction: 'rtl'
    }}>
      ⚠ بيئة تجريبية — البيانات هنا للتجربة فقط
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isPortal ? <PortalApp /> : <App />}
    <SandboxBadge />
  </React.StrictMode>
)
