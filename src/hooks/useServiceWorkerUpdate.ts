import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

export function useServiceWorkerUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [updateFn, setUpdateFn] = useState<((reload?: boolean) => Promise<void>) | null>(null)

  useEffect(() => {
    const update = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true)
      },
    })
    setUpdateFn(() => update)
  }, [])

  return {
    needRefresh,
    applyUpdate: () => updateFn?.(true),
    dismissUpdate: () => setNeedRefresh(false),
  }
}