import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  fullScreen?: boolean
}

// Self-contained modern bottom sheet: dark backdrop, slide-up panel,
// rounded top corners, safe-area aware. No portal dependency, so it
// works regardless of your app's root DOM structure.
export function BottomSheet({ open, onClose, title, children, fullScreen }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
      />
      <div
        className={cn(
          'relative flex flex-col bg-[#0f1420] shadow-2xl',
          fullScreen ? 'h-[100dvh] rounded-none' : 'max-h-[90dvh] rounded-t-3xl'
        )}
      >
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/70 active:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
          {children}
        </div>
      </div>
    </div>
  )
}