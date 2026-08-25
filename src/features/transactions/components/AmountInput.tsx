import { forwardRef } from 'react'
import { currencySymbol } from '@/lib/money'
import { cn } from '@/lib/cn'
import type { CurrencyCode } from '@/types/money'

interface AmountInputProps {
  value: string
  onChange: (value: string) => void
  currency: CurrencyCode
  error?: string
  onBlur?: () => void
  name?: string
}

// Large, one-hand-friendly numeric amount field. inputMode="decimal"
// brings up the Android numeric keyboard directly, no keyboard
// switching needed mid-entry.
export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(function AmountInput(
  { value, onChange, currency, error, onBlur, name },
  ref
) {
  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 rounded-2xl border bg-white/5 px-5 py-4 transition-colors',
          error ? 'border-red-500/60' : 'border-white/10 focus-within:border-emerald-400/60'
        )}
      >
        <span className="text-2xl font-semibold text-white/40">{currencySymbol(currency)}</span>
        <input
          ref={ref}
          name={name}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          value={value}
          onChange={(e) => {
            const next = e.target.value.replace(/[^\d.]/g, '')
            // allow only one decimal point, max 2 decimal places while typing
            if (/^\d*\.?\d{0,2}$/.test(next)) onChange(next)
          }}
          onBlur={onBlur}
          className="w-full bg-transparent text-3xl font-semibold tracking-tight text-white outline-none placeholder:text-white/25"
        />
      </div>
      {error && <p className="mt-1.5 px-1 text-sm text-red-400">{error}</p>}
    </div>
  )
})