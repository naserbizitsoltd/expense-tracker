import type { ReactNode } from 'react'
import { ArrowLeft, Menu } from 'lucide-react'
import { cn } from '@/lib/cn'

interface AppShellProps {
  title: string
  subtitle?: string
  children: ReactNode
  headerBack?: () => void
  headerMenu?: () => void
  headerAction?: ReactNode
  bottomNav?: ReactNode
  fab?: ReactNode
  className?: string
}

export function AppShell({ 
  title, 
  subtitle, 
  children, 
  headerBack, 
  headerMenu,
  headerAction, 
  bottomNav, 
  fab, 
  className 
}: AppShellProps) {
  return (
    <div className="gradient-mesh relative flex min-h-dvh flex-col bg-background text-foreground">
      <header className="safe-top glass-surface sticky top-0 z-30 border-b border-border/70">
        <div className="mx-auto flex h-16 max-w-md items-center gap-3 px-4">
          {!headerBack && headerMenu && (
            <button
              onClick={headerMenu}
              aria-label="Open menu"
              className="-ml-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface-elevated active:scale-90"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          {headerBack && (
            <button
              onClick={headerBack}
              aria-label="Back"
              className="-ml-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface-elevated active:scale-90"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[1.0625rem] font-semibold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {headerAction}
        </div>
      </header>

      <main className={cn('relative z-[1] mx-auto w-full max-w-md flex-1 px-4 pb-8 pt-5', bottomNav && 'pb-28', className)}>
        {children}
      </main>

      {fab && <div className="safe-bottom fixed bottom-24 right-4 z-40 mx-auto max-w-md">{fab}</div>}

      {bottomNav}
    </div>
  )
}