import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import PortalApp from './pages/portal/PortalApp.jsx'

// Routing: anything under /portal/* renders the public client portal
// instead of the staff-side App.
const isPortal = typeof window !== 'undefined' && window.location.pathname.startsWith('/portal')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isPortal ? <PortalApp /> : <App />}
  </React.StrictMode>
)
