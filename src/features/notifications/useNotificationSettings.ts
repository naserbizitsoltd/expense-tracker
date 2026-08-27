import { useCallback } from 'react'
import { appSettingsRepository, useLiveQuery } from '@/db'
import {
  DEFAULT_REMINDER_OFFSETS,
  getNotificationPermission,
  requestNotificationPermission,
  type NotificationPermissionState,
} from '@/services/notificationService'
import { APP_CONFIG } from '@/config/app.config'

/**
 * Reads/writes the notifications section of the singleton AppSettings
 * row. Enabling notifications requests browser permission exactly once
 * (see requestNotificationPermission) — if the user denies it, the
 * setting stays off and the caller can surface that via `permission`.
 */
export function useNotificationSettings() {
  const state = useLiveQuery(() => appSettingsRepository.get(), [])
  const settings = state.data

  const enabled = settings?.notificationsEnabled ?? false
  const reminderOffsetDays = settings?.reminderOffsetDays ?? DEFAULT_REMINDER_OFFSETS

  async function persist(patch: Partial<Pick<NonNullable<typeof settings>, 'notificationsEnabled' | 'reminderOffsetDays'>>) {
    const current = await appSettingsRepository.get()
    await appSettingsRepository.set({
      defaultCurrency: current?.defaultCurrency ?? APP_CONFIG.defaultCurrency,
      locale: current?.locale ?? 'en-US',
      theme: current?.theme ?? 'system',
      notificationsEnabled: current?.notificationsEnabled ?? false,
      reminderOffsetDays: current?.reminderOffsetDays ?? DEFAULT_REMINDER_OFFSETS,
      ...patch,
    })
  }

  const setEnabled = useCallback(async (next: boolean): Promise<NotificationPermissionState> => {
    let permission = getNotificationPermission()
    if (next && permission === 'default') {
      permission = await requestNotificationPermission()
    }
    // If the browser permission was denied, the toggle can't actually
    // turn notifications on — reflect that in what gets stored instead
    // of silently pretending it's enabled.
    await persist({ notificationsEnabled: next && permission !== 'denied' && permission !== 'unsupported' })
    return permission
  }, [])

  const setReminderOffsetDays = useCallback(async (offsets: number[]) => {
    await persist({ reminderOffsetDays: offsets.length > 0 ? offsets : DEFAULT_REMINDER_OFFSETS })
  }, [])

  return {
    enabled,
    reminderOffsetDays,
    permission: getNotificationPermission(),
    isLoading: state.isLoading,
    setEnabled,
    setReminderOffsetDays,
  }
}