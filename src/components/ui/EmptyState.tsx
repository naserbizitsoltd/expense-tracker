import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-muted text-primary">{icon}</div>
      <div className="space-y-1.5">
        <p className="text-[15px] font-semibold text-foreground">{title}</p>
        {description && <p className="mx-auto max-w-[26ch] text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}