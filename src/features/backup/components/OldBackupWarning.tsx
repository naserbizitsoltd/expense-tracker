import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { differenceInDays, formatDistanceToNow } from 'date-fns'
import { metadataRepository, useLiveQuery } from '@/db'

// Non-blocking nudge only — never triggers a backup itself. 14 days
// mirrors a "check in every couple of weeks" cadence without being
// alarmist for an app that isn't touched daily.
const STALE_BACKUP_DAYS = 14

export function OldBackupWarning() {
  const { data: metadata } = useLiveQuery(() => metadataRepository.get(), [])

  // "Now" is captured in an effect, not read inline during render, so
  // rendering itself stays pure.
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => setNow(Date.now()), [])

  if (!metadata || now === null) return null

  const lastBackupAt = metadata.lastBackupAt

  if (lastBackupAt !== null) {
    const daysSince = differenceInDays(now, lastBackupAt)
    if (daysSince < STALE_BACKUP_DAYS) return null
  }

  const message =
    lastBackupAt === null
      ? "You haven't created a backup yet. Consider creating one so your data isn't only on this device."
      : `Your last backup was ${formatDistanceToNow(lastBackupAt, { addSuffix: true })}. Consider creating a new backup.`

  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-warning/20 bg-warning/10 px-3.5 py-3">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <p className="text-xs text-warning">{message}</p>
    </div>
  )
}