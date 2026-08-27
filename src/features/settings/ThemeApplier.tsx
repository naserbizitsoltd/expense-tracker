import { useApplyTheme, useAppTheme } from './useAppTheme'

// Mounted once at the app root (see App.tsx). Renders nothing —
// purely subscribes to the stored theme preference and keeps the
// `.light` class on <html> in sync with it.
export function ThemeApplier() {
  const { theme } = useAppTheme()
  useApplyTheme(theme)
  return null
}