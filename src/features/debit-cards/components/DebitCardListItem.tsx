import { getDebitCardIcon } from '../debitCardConfig'
import { Badge } from '@/components/ui'
import { formatAmount } from '@/lib/money'
import type { Account, DebitCard } from '@/types/entities'

interface DebitCardListItemProps {
  card: DebitCard
  account: Account | undefined
  onClick: () => void
}

// Deliberately outlined, not filled-gradient like CreditCardListItem —
// signals "owned money" rather than a liability.
export function DebitCardListItem({ card, account, onClick }: DebitCardListItemProps) {
  const Icon = getDebitCardIcon(card.icon)

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border-2 bg-surface px-4 py-3.5 text-left transition-transform active:scale-[0.98]"
      style={{ borderColor: `${card.color}55` }}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${card.color}20`, color: card.color }}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{card.name}</p>
        <p className="truncate text-xs tracking-widest text-muted-foreground">•••• {card.last4}</p>
        <p className="truncate text-xs text-muted-foreground">Linked: {account ? account.name : 'Unknown account'}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Available</p>
        <p className="text-sm font-semibold tabular-nums text-foreground">
          {account ? formatAmount(account.balance, account.currency) : '—'}
        </p>
        {card.isArchived && <Badge variant="warning">Archived</Badge>}
      </div>
    </button>
  )
}