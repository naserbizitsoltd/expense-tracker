import { useRef, useState } from 'react'
import { DownloadCloud, UploadCloud } from 'lucide-react'
import { Button, useToast } from '@/components/ui'
import {
  exportBackup,
  previewBackup,
  restoreBackup,
  type BackupExportResult,
  type BackupPayload,
  type BackupPreview,
} from '@/db/backup'
import { getUserMessage } from '@/db/errors'
import { OldBackupWarning } from './OldBackupWarning'
import { BackupResultDialog } from './BackupResultDialog'
import { RestorePreviewDialog } from './RestorePreviewDialog'

export function BackupRestoreSection() {
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [exportResult, setExportResult] = useState<BackupExportResult | null>(null)
  const [pendingBackup, setPendingBackup] = useState<{ payload: BackupPayload; preview: BackupPreview } | null>(
    null
  )

  async function handleExport() {
    setIsExporting(true)
    try {
      const result = await exportBackup()
      setExportResult(result)
      if (!result.verification.ok) {
        showToast('Backup saved, but verification found issues — check the details', 'error')
      }
    } catch (error) {
      showToast(getUserMessage(error), 'error')
    } finally {
      setIsExporting(false)
    }
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // allow re-selecting the same file next time
    if (!file) return

    try {
      const { payload, preview } = await previewBackup(file)
      setPendingBackup({ payload, preview })
    } catch (error) {
      showToast(getUserMessage(error), 'error')
    }
  }

  async function handleConfirmRestore() {
    if (!pendingBackup) return
    setIsImporting(true)
    try {
      await restoreBackup(pendingBackup.payload)
      showToast('Backup restored', 'success')
      setPendingBackup(null)
    } catch (error) {
      // The restore transaction rolled back on failure — existing data
      // is untouched, so leave the preview open rather than dismissing it.
      showToast(getUserMessage(error), 'error')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-sm font-semibold text-foreground">Backup & Restore</p>
      <p className="mt-0.5 text-xs text-muted-foreground">Save all your data to a file, or restore from one</p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button variant="secondary" size="sm" className="flex-1" onClick={handleExport} disabled={isExporting}>
          <DownloadCloud className="h-4 w-4" />
          {isExporting ? 'Exporting…' : 'Export Backup'}
        </Button>
        <Button variant="secondary" size="sm" className="flex-1" onClick={handleImportClick} disabled={isImporting}>
          <UploadCloud className="h-4 w-4" />
          {isImporting ? 'Restoring…' : 'Import Backup'}
        </Button>
      </div>

      <div className="mt-3">
        <OldBackupWarning />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleFileSelected}
      />

      <BackupResultDialog result={exportResult} onClose={() => setExportResult(null)} />

      <RestorePreviewDialog
        preview={pendingBackup?.preview ?? null}
        isRestoring={isImporting}
        onCancel={() => setPendingBackup(null)}
        onConfirm={handleConfirmRestore}
      />
    </div>
  )
}