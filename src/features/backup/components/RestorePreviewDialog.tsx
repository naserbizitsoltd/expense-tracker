import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { format } from 'date-fns'
import { Dialog, Button } from '@/components/ui'
import {
  BACKUP_SUMMARY_TABLES,
  BACKUP_TABLE_LABELS,
  type BackupPreview,
  type BackupTableName,
} from '@/db/backup'

interface RestorePreviewDialogProps {
  preview: BackupPreview | null
  isRestoring: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function RestorePreviewDialog({ preview, isRestoring, onCancel, onConfirm }: RestorePreviewDialogProps) {
  if (!preview) return null

  const { meta, counts, verification } = preview
  const hasWarnings = verification.issues.length > 0
  const summarySet = new Set<string>(BACKUP_SUMMARY_TABLES)
  const otherRecords = (Object.entries(counts) as [BackupTableName, number][])
    .filter(([name]) => !summarySet.has(name))
    .reduce((sum, [, count]) => sum + count, 0)

  return (
    <Dialog open={preview !== null} onClose={onCancel} title="Restore Backup?">
      <p className="text-sm text-muted-foreground">
        Backup from {format(meta.exportedAt, "MMM d, yyyy 'at' h:mm a")}. Your current app data will be replaced
        by the contents below. This cannot be undone.
      </p>

      <p className="mt-3 text-xs font-medium text-muted-foreground">Backup contains:</p>
      <div className="mt-1.5 flex flex-col gap-1.5 rounded-xl border border-border bg-surface-elevated px-3.5 py-3">
        {BACKUP_SUMMARY_TABLES.map((name) => (
          <div key={name} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{BACKUP_TABLE_LABELS[name]}</span>
            <span className="font-medium text-foreground">{counts[name].toLocaleString()}</span>
          </div>
        ))}
        {otherRecords > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Other records</span>
            <span className="font-medium text-foreground">{otherRecords.toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        {verification.ok ? (
          <>
            <ShieldCheck className="h-4 w-4 shrink-0 text-success" />
            <p className="text-xs font-medium text-success">This file passed structural verification</p>
          </>
        ) : (
          <>
            <AlertTriangle className="h-4 w-4 shrink-0 text-danger" />
            <p className="text-xs font-medium text-danger">This file has verification problems — restore with caution</p>
          </>
        )}
      </div>

      {hasWarnings && (
        <ul className="mt-2 flex flex-col gap-1">
          {verification.issues.map((issue, i) => (
            <li key={i} className={`text-xs ${issue.severity === 'error' ? 'text-danger' : 'text-muted-foreground'}`}>
              {issue.severity === 'error' ? '⚠ ' : 'ℹ '}
              {issue.message}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={isRestoring}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={isRestoring}>
          {isRestoring ? 'Restoring…' : 'Restore Backup'}
        </Button>
      </div>
    </Dialog>
  )
}