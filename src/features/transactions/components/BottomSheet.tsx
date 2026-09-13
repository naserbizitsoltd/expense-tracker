import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
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
// rounded top corners, safe-area aware.
//
// Rendered via a portal straight onto document.body — not nested inside
// the page tree. `position: fixed` only anchors to the real viewport if
// NO ancestor has a CSS transform (or will-change: transform) applied; if
// one does, `fixed` silently re-anchors to that ancestor's box instead.
// Our page-swap animations apply a transform to every page's wrapper, so
// without the portal this sheet would render scoped to that wrapper and
// end up sitting behind the bottom nav / FAB instead of covering the
// whole screen.
export function BottomSheet({ open, onClose, title, children, fullScreen }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
      />
      <div
        className={cn(
          'relative flex flex-col bg-surface-elevated shadow-2xl',
          fullScreen ? 'h-[100dvh] rounded-none' : 'max-h-[90dvh] rounded-t-2xl'
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-muted-foreground active:bg-border"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}