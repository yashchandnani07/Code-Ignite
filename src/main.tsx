import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Must run before any Monaco <Editor /> component mounts.
// Configures self-hosted Monaco so it works in Brave/Comet (they block CDN loads).
import './monacoSetup'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
