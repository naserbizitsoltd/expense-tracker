import { AppShell } from '@/layouts/AppShell'
import { NotificationsSection } from '@/features/notifications/components/NotificationsSection'
import { BackupRestoreSection } from '@/features/backup/components/BackupRestoreSection'
import { ThemeSection } from '../components/ThemeSection'

interface SettingsPageProps {
  onBack: () => void
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  return (
    <AppShell title="Settings" headerBack={onBack}>
      <div className="flex flex-col gap-4">
        <ThemeSection />
        <NotificationsSection />
        <BackupRestoreSection />
      </div>
    </AppShell>
  )
}