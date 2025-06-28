import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './mobile-fixes.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { LocationProvider } from './contexts/LocationContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <LocationProvider>
    <App />
      </LocationProvider>
    </AuthProvider>
  </StrictMode>,
)
