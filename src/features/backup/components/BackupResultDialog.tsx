import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { Dialog, Button } from '@/components/ui'
import {
  BACKUP_SUMMARY_TABLES,
  BACKUP_TABLE_LABELS,
  type BackupExportResult,
  type BackupTableName,
} from '@/db/backup'

interface BackupResultDialogProps {
  result: BackupExportResult | null
  onClose: () => void
}

export function BackupResultDialog({ result, onClose }: BackupResultDialogProps) {
  if (!result) return null

  const { verification } = result
  const summarySet = new Set<string>(BACKUP_SUMMARY_TABLES)
  const otherRecords = (Object.entries(result.counts) as [BackupTableName, number][])
    .filter(([name]) => !summarySet.has(name))
    .reduce((sum, [, count]) => sum + count, 0)

  return (
    <Dialog open={result !== null} onClose={onClose} title="Backup Successful">
      <div className="flex items-center gap-2 text-success">
        <CheckCircle2 className="h-5 w-5" />
        <p className="text-sm font-semibold">Backup Successful</p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {format(result.exportedAt, "MMM d, yyyy 'at' h:mm a")}
      </p>

      <div className="mt-4 flex flex-col gap-1.5 rounded-xl border border-border bg-surface-elevated px-3.5 py-3">
        {BACKUP_SUMMARY_TABLES.map((name) => (
          <div key={name} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{BACKUP_TABLE_LABELS[name]}</span>
            <span className="font-medium text-foreground">{result.counts[name].toLocaleString()}</span>
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
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            <p className="text-sm font-medium text-success">Backup Verified</p>
          </>
        ) : (
          <>
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
            <p className="text-sm font-medium text-warning">Backup saved, but verification found issues</p>
          </>
        )}
      </div>

      {verification.issues.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {verification.issues.map((issue, i) => (
            <li key={i} className="text-xs text-muted-foreground">
              {issue.severity === 'error' ? '⚠ ' : 'ℹ '}
              {issue.message}
            </li>
          ))}
        </ul>
      )}

      {verification.checksumValid && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Checksum recorded — this file can be verified as unchanged later.
        </p>
      )}

      <div className="mt-5 flex justify-end">
        <Button onClick={onClose}>Done</Button>
      </div>
    </Dialog>
  )
}