import { useState } from 'react'
import { Download, RefreshCw, X } from 'lucide-react'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { useServiceWorkerUpdate } from '@/hooks/useServiceWorkerUpdate'
import { OfflineIndicator } from './OfflineIndicator'
import { Button } from '@/components/ui'

const INSTALL_DISMISS_KEY = 'expense-tracker:install-prompt-dismissed'

export function PwaStatusLayer() {
  const { needRefresh, applyUpdate, dismissUpdate } = useServiceWorkerUpdate()
  const { canInstall, promptInstall } = useInstallPrompt()
  const [installDismissed, setInstallDismissed] = useState(
    () => localStorage.getItem(INSTALL_DISMISS_KEY) === '1'
  )

  const dismissInstall = () => {
    localStorage.setItem(INSTALL_DISMISS_KEY, '1')
    setInstallDismissed(true)
  }

  const showUpdate = needRefresh
  const showInstall = !showUpdate && canInstall && !installDismissed

  return (
    <>
      <OfflineIndicator />
      {(showUpdate || showInstall) && (
        <div className="safe-bottom animate-slide-up fixed inset-x-0 bottom-20 z-40 mx-auto flex max-w-md px-4">
          <div className="card-shadow flex w-full items-center gap-3 rounded-xl border border-border bg-surface-elevated p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-muted text-primary">
              {showUpdate ? <RefreshCw className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {showUpdate ? 'Update available' : 'Install Expense Tracker'}
              </p>
              <p className="text-xs text-muted-foreground">
                {showUpdate
                  ? 'Your data is safe. Reload to get the latest version.'
                  : 'Add to your home screen for quick access.'}
              </p>
            </div>
            <Button size="sm" onClick={showUpdate ? applyUpdate : promptInstall}>
              {showUpdate ? 'Reload' : 'Install'}
            </Button>
            <button
              onClick={showUpdate ? dismissUpdate : dismissInstall}
              aria-label="Dismiss"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}