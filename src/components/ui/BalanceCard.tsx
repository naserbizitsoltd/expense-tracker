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

      <div className="relative z-[2] mt-3 h-[2.4rem] overflow-hidden">
        {/* Key on `hidden` only, not on `amount`. Keying on the amount
           string meant every recalculation (DPS/loan totals often update
           a couple of times in a row while data streams in) retriggered
           an exit+enter cycle, and if the value changed again before that
           cycle finished, AnimatePresence could end up with nothing
           mounted — a blank card. Keying on `hidden` keeps the show/hide
           cross-fade but lets the number itself just update in place. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={hidden ? 'hidden' : 'value'}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="text-[2.1rem] font-bold leading-none tracking-tight tabular-nums text-white"
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