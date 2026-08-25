import { getCreditCardIcon } from '../creditCardConfig'
import { Badge } from '@/components/ui'
import { formatAmount } from '@/lib/money'
import type { CreditCard } from '@/types/entities'

interface CreditCardListItemProps {
  card: CreditCard
  onClick: () => void
}

export function CreditCardListItem({ card, onClick }: CreditCardListItemProps) {
  const Icon = getCreditCardIcon(card.icon)
  const availableCredit = card.creditLimit - card.outstandingBalance

  return (
    <button
      onClick={onClick}
      className="relative w-full overflow-hidden rounded-2xl p-4 text-left transition-transform active:scale-[0.98]"
      style={{ background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}cc 55%, #0b0f18 130%)` }}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />

      <div className="relative flex items-center justify-between">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-white">{card.name}</p>
          <p className="truncate text-xs text-white/70">{card.issuer}</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>

      <p className="relative mt-4 text-sm font-medium tracking-[0.2em] text-white/90">•••• {card.last4}</p>

      <div className="relative mt-4 grid grid-cols-3 gap-2">
        <Stat label="Limit" value={formatAmount(card.creditLimit, card.currency)} />
        <Stat label="Outstanding" value={formatAmount(card.outstandingBalance, card.currency)} />
        <Stat label="Available" value={formatAmount(availableCredit, card.currency)} />
      </div>

      {card.isArchived && (
        <div className="relative mt-3">
          <Badge variant="warning">Archived</Badge>
        </div>
      )}
    </button>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-white/60">{label}</p>
      <p className="truncate text-[13px] font-semibold tabular-nums text-white">{value}</p>
    </div>
  )
}