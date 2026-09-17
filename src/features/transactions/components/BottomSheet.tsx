import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useKeyboardInset } from '@/hooks/useKeyboardInset'

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
//
// The keyboard inset below reserves space at the bottom whenever the
// on-screen keyboard is up, so a sheet containing a text field (search,
// notes, amount) shrinks instead of being covered by the keys.
export function BottomSheet({ open, onClose, title, children, fullScreen }: BottomSheetProps) {
  const keyboardInset = useKeyboardInset(open)

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ paddingBottom: keyboardInset || undefined }}
    >
      <button
        aria-label="Close"
        onClick={onClose}
        className="sheet-backdrop-in absolute inset-0 bg-black/60"
      />
      <div
        className={cn(
          'sheet-panel-in relative flex min-h-0 flex-col bg-surface-elevated shadow-2xl',
          fullScreen ? 'h-full rounded-none' : 'max-h-[90%] rounded-t-2xl'
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-muted-foreground active:bg-border"
          >
            <X size={18} />
          </button>
        </div>
        <div
          className="flex-1 overflow-y-auto overscroll-contain px-5 pt-4"
          style={{
            // Safe-area padding is only meaningful when the keyboard is down;
            // with it up the inset already lifted the panel clear of the edge.
            paddingBottom: keyboardInset
              ? '0.75rem'
              : 'max(1.25rem, env(safe-area-inset-bottom))',
          }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}