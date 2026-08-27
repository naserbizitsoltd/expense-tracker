import { useNotificationCenter } from '../useReminders'

// Mounted once in App.tsx (alongside RecurringDueBanner) so reminder
// detection runs on every app start/resume and whenever recurring/
// DPS/FDR/loan/goal data changes, regardless of which screen is open.
// Renders nothing — all it does is keep useNotificationCenter's effect
// alive.
export function NotificationRunner() {
  useNotificationCenter()
  return null
}