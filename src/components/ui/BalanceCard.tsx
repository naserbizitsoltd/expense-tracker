import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'grain-overlay gradient-hero relative overflow-hidden rounded-2xl p-6 text-white shadow-[var(--shadow-glow)]',
        className
      )}
    >
      {/* soft floating orbs for depth */}
      <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-black/10 blur-3xl" />

      <div className="relative z-[2] flex items-center justify-between">
        <p className="text-[13px] font-medium text-white/80">{label}</p>
        <button
          onClick={() => setHidden((h) => !h)}
          aria-label={hidden ? 'Show balance' : 'Hide balance'}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 active:scale-90"
        >
          {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      <div className="relative z-[2] mt-3 min-h-[2.4rem] overflow-visible">
        {/* Key on `hidden` only, not on `amount` (recalculating totals used
           to retrigger the cross-fade and could leave nothing mounted).
           `clamp()` replaces a fixed 2.1rem size: in a half-width card
           (Loans/DPS use two side by side) a longer formatted amount like
           "৳ 26,314.84" doesn't fit on one line at 2.1rem, wraps to a
           second line, and the old fixed-height `overflow-hidden` wrapper
           sliced that second line down to a sliver — which is the
           "dashes under the ৳ symbol" bug. `min-h` + `overflow-visible`
           mean that even if a value is still too long to fit on one line
           after the clamp, it wraps and stays fully visible instead of
           being clipped. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={hidden ? 'hidden' : 'value'}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="text-[clamp(1.15rem,6vw,2.1rem)] font-bold leading-tight tracking-tight tabular-nums text-white"
          >
            {hidden ? '••••••' : amount}
          </motion.p>
        </AnimatePresence>
      </div>

      {trend && (
        <p
          className={cn(
            'relative z-[2] mt-3 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white'
          )}
        >
          {trend.positive ? '↑' : '↓'} {trend.value}
        </p>
      )}
    </motion.div>
  )
}