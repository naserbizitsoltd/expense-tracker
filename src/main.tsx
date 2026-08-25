import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { seedDefaultCategories } from './db/seed'

// Recurring transactions are never generated automatically. The
// RecurringDueBanner (mounted in App.tsx) reactively detects due
// occurrences and lets the user Generate / Skip / Generate all due.
seedDefaultCategories()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)