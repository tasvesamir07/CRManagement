import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Unregister any active service workers to prevent caching/reconnect issues
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

// Wake up the backend server on first load (handles Render/Hosting cold starts)
const apiUrl = import.meta.env.VITE_API_URL || ''
if (apiUrl) {
  fetch(`${apiUrl.replace(/\/+$/, '')}/health`, { method: 'GET', mode: 'no-cors', keepalive: true }).catch(() => {})
  setInterval(() => {
    fetch(`${apiUrl.replace(/\/+$/, '')}/health`, { method: 'GET', mode: 'no-cors' }).catch(() => {})
  }, 5 * 60 * 1000)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
