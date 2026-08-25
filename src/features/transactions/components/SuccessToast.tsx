import { useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { formatAmount } from '@/lib/money'
import { cn } from '@/lib/cn'
import type { CurrencyCode } from '@/types/money'

interface SuccessToastProps {
  message: string
  detail?: string // optional subtitle, e.g. "Bank → Cash"
  amount: number
  currency: CurrencyCode
  variant?: 'positive' | 'negative' | 'neutral' // neutral = transfer, no color/sign implied by amount
  onDismiss: () => void
}

export function SuccessToast({ message, detail, amount, currency, variant, onDismiss }: SuccessToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 2500)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const resolvedVariant: 'positive' | 'negative' | 'neutral' =
    variant ?? (amount > 0 ? 'positive' : amount < 0 ? 'negative' : 'neutral')

  return (
    <div className="fixed inset-x-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-[60] flex items-center gap-3 rounded-2xl bg-[#151b2b] px-4 py-3.5 shadow-2xl ring-1 ring-white/10 animate-in slide-in-from-bottom-4">
      <CheckCircle2 size={20} className="shrink-0 text-emerald-400" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{message}</p>
        {detail && <p className="truncate text-xs text-white/40">{detail}</p>}
      </div>
      <span
        className={cn(
          'shrink-0 text-sm font-semibold',
          resolvedVariant === 'positive' && 'text-emerald-400',
          resolvedVariant === 'negative' && 'text-rose-300/90',
          resolvedVariant === 'neutral' && 'text-white/70'
        )}
      >
        {resolvedVariant === 'positive' ? '+' : resolvedVariant === 'negative' ? '-' : ''}
        {formatAmount(Math.abs(amount), currency)}
      </span>
    </div>
  )
}