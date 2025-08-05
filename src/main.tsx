import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './i18n'

// Disable console.log in production
if (import.meta.env.PROD) {
  console.log = () => {}
  console.debug = () => {}
  // Add other console methods if needed
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
