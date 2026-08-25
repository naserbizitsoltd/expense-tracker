import { useEffect, useRef, useState } from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { cn } from '@/lib/cn'

export function OfflineIndicator() {
  const isOnline = useOnlineStatus()
  const [visible, setVisible] = useState(!isOnline)
  const [mode, setMode] = useState<'offline' | 'online'>(isOnline ? 'online' : 'offline')
  const mounted = useRef(false)

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    if (isOnline) {
      setMode('online')
      setVisible(true)
      const t = setTimeout(() => setVisible(false), 2500)
      return () => clearTimeout(t)
    }
    setMode('offline')
    setVisible(true)
  }, [isOnline])

  if (!visible) return null

  return (
    <div className="safe-top pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-2">
      <div
        className={cn(
          'animate-fade-in pointer-events-auto flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur',
          mode === 'offline'
            ? 'border-warning/30 bg-warning/10 text-warning'
            : 'border-success/30 bg-success/10 text-success'
        )}
      >
        {mode === 'offline' ? <WifiOff className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}
        {mode === 'offline' ? 'Offline' : 'Back online'}
      </div>
    </div>
  )
}