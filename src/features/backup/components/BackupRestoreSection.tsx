import { useRef, useState } from 'react'
import { DownloadCloud, UploadCloud } from 'lucide-react'
import { Button, ConfirmationDialog, useToast } from '@/components/ui'
import { exportBackup, readAndValidateBackupFile, restoreBackup, type BackupPayload } from '@/db/backup'
import { getUserMessage } from '@/db/errors'

export function BackupRestoreSection() {
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [pendingBackup, setPendingBackup] = useState<BackupPayload | null>(null)

  async function handleExport() {
    setIsExporting(true)
    try {
      await exportBackup()
      showToast('Backup exported', 'success')
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
      const payload = await readAndValidateBackupFile(file)
      setPendingBackup(payload)
    } catch (error) {
      showToast(getUserMessage(error), 'error')
    }
  }

  async function handleConfirmRestore() {
    if (!pendingBackup) return
    setIsImporting(true)
    try {
      await restoreBackup(pendingBackup)
      showToast('Backup restored', 'success')
    } catch (error) {
      showToast(getUserMessage(error), 'error')
    } finally {
      setIsImporting(false)
      setPendingBackup(null)
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

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleFileSelected}
      />

      <ConfirmationDialog
        open={pendingBackup !== null}
        onClose={() => setPendingBackup(null)}
        onConfirm={handleConfirmRestore}
        title="Restore Backup?"
        description="Your current app data will be replaced by the backup data. This cannot be undone."
        confirmLabel="Restore"
        variant="danger"
      />
    </div>
  )
}