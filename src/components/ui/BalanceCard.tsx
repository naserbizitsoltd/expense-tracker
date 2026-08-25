import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'

interface BalanceCardProps {
  label: string
  amount: string
  trend?: { value: string; positive: boolean }
  className?: string
}

export function BalanceCard({ label, amount, trend, className }: BalanceCardProps) {
  const [hidden, setHidden] = useState(false)

  return (
    <div
      className={cn('elevated-shadow relative overflow-hidden rounded-[1.75rem] border border-border/60 p-6', className)}
      style={{ background: 'linear-gradient(155deg, var(--primary-muted) 0%, var(--surface) 65%)' }}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30 blur-3xl"
        style={{ background: 'var(--primary)' }}
        aria-hidden="true"
      />
      <div className="relative flex items-center justify-between">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        <button
          onClick={() => setHidden((h) => !h)}
          aria-label={hidden ? 'Show balance' : 'Hide balance'}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <p className="relative mt-2.5 text-[2.1rem] font-bold leading-none tracking-tight tabular-nums text-foreground">
        {hidden ? '••••••' : amount}
      </p>
      {trend && (
        <p className={cn('relative mt-3 inline-flex items-center gap-1 text-xs font-semibold', trend.positive ? 'text-success' : 'text-danger')}>
          {trend.positive ? '↑' : '↓'} {trend.value}
        </p>
      )}
    </div>
  )
}