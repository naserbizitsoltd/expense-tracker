import { AppShell } from '@/layouts/AppShell'
import { NotificationsSection } from '@/features/notifications/components/NotificationsSection'

interface SettingsPageProps {
  onBack: () => void
}

// Intentionally minimal — the app has no other user-configurable
// settings yet. This page exists to host the Notifications section
// (see task spec); do not fold general app settings into it without a
// separate spec for those.
export function SettingsPage({ onBack }: SettingsPageProps) {
  return (
    <AppShell title="Settings" headerBack={onBack}>
      <div className="flex flex-col gap-4">
        <NotificationsSection />
      </div>
    </AppShell>
  )
}