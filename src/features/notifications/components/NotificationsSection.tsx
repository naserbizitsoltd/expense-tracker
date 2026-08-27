import { useState } from 'react'
import { AlertTriangle, Bell, BellOff, BellRing } from 'lucide-react'
import { useToast } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useNotificationSettings } from '../useNotificationSettings'
import { useNotificationCenter } from '../useReminders'
import type { NotificationLogEntry } from '@/types/entities'

const OFFSET_OPTIONS = [1, 3, 7]

export function NotificationsSection() {
  const { enabled, reminderOffsetDays, permission, isLoading, setEnabled, setReminderOffsetDays } =
    useNotificationSettings()
  const { recent } = useNotificationCenter()
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)

  async function handleToggle() {
    setBusy(true)
    try {
      const wasEnabled = enabled
      const result = await setEnabled(!wasEnabled)
      if (!wasEnabled && result === 'denied') {
        showToast('Notifications are blocked in your browser/device settings.', 'error')
      } else if (!wasEnabled && result === 'granted') {
        showToast('Notifications enabled', 'success')
      } else if (wasEnabled) {
        showToast('Notifications turned off', 'info')
      }
    } finally {
      setBusy(false)
    }
  }

  function toggleOffset(day: number) {
    const next = reminderOffsetDays.includes(day)
      ? reminderOffsetDays.filter((d) => d !== day)
      : [...reminderOffsetDays, day]
    setReminderOffsetDays(next)
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-muted text-primary">
          {enabled ? <BellRing className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          <p className="text-xs text-muted-foreground">Reminders for bills, DPS, FDR, loans & goals</p>
        </div>
        <button
          onClick={handleToggle}
          disabled={busy || isLoading}
          role="switch"
          aria-checked={enabled}
          aria-label={enabled ? 'Disable notifications' : 'Enable notifications'}
          className={cn(
            'relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50',
            enabled ? 'bg-primary' : 'bg-white/10'
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform',
              enabled ? 'translate-x-5' : 'translate-x-0.5'
            )}
          />
        </button>
      </div>

      {permission === 'denied' && (
        <p className="flex items-start gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Notification permission is blocked. Enable it from your browser or device settings, then turn this back
          on.
        </p>
      )}

      {enabled && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">Remind me</p>
          <div className="flex gap-2">
            {OFFSET_OPTIONS.map((day) => {
              const active = reminderOffsetDays.includes(day)
              return (
                <button
                  key={day}
                  onClick={() => toggleOffset(day)}
                  className={cn(
                    'flex-1 rounded-xl border px-2 py-2 text-center text-xs font-semibold transition-colors',
                    active ? 'border-primary bg-primary-muted text-primary' : 'border-border text-muted-foreground'
                  )}
                >
                  {day} day{day === 1 ? '' : 's'} before
                </button>
              )
            })}
          </div>
        </div>
      )}

      {enabled && recent.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Bell className="h-3.5 w-3.5" /> Recent reminders
          </p>
                    {recent.slice(0, 5).map((entry: NotificationLogEntry) => (
            <div key={entry.id} className="flex items-center gap-2 text-xs">
              <span className="min-w-0 flex-1 truncate text-foreground">{entry.title}</span>
              <span className="shrink-0 truncate text-muted-foreground">{entry.body}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}