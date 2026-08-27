// Resolves and applies the app's light/dark/system theme preference.
// The stored preference lives on the singleton AppSettings row (see
// appSettingsRepository) — this hook reads it, resolves 'system' to
// whatever the OS currently prefers, and toggles the `.light` class
// on <html> to match (see index.css's `.light` block). Every
// component already reads colors through the shared CSS variables,
// so applying the class here is the only place theme switching
// actually needs to happen.

import { useCallback, useEffect, useState } from 'react'
import { appSettingsRepository, useLiveQuery } from '@/db'
import { APP_CONFIG } from '@/config/app.config'
import type { AppSettings } from '@/types/entities'

type ThemePreference = AppSettings['theme']

function systemPrefersLight(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches
}

/** Reads the stored theme preference and lets the UI change it. */
export function useAppTheme() {
  const state = useLiveQuery(() => appSettingsRepository.get(), [])
  const theme: ThemePreference = state.data?.theme ?? 'system'

  const setTheme = useCallback(async (next: ThemePreference) => {
    const current = await appSettingsRepository.get()
    await appSettingsRepository.set({
      defaultCurrency: current?.defaultCurrency ?? APP_CONFIG.defaultCurrency,
      locale: current?.locale ?? 'en-US',
      theme: next,
      notificationsEnabled: current?.notificationsEnabled ?? false,
      reminderOffsetDays: current?.reminderOffsetDays ?? [1, 3, 7],
    })
  }, [])

  return { theme, isLoading: state.isLoading, setTheme }
}

/**
 * Applies the resolved theme to <html> and keeps it in sync with the
 * stored preference and (when set to 'system') the OS-level scheme.
 * Mounted once, globally — see ThemeApplier.
 */
export function useApplyTheme(theme: ThemePreference) {
  const [systemLight, setSystemLight] = useState(systemPrefersLight)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => setSystemLight(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const isLight = theme === 'light' || (theme === 'system' && systemLight)
    document.documentElement.classList.toggle('light', isLight)
  }, [theme, systemLight])
}