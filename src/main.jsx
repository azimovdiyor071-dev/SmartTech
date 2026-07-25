import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { warmUp } from './services/api.js'

// Kick the backend awake as the app loads, so login/bootstrap feel instant.
warmUp()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
