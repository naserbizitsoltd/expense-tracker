import { getAccountIcon } from '../accountConfig'
import { Avatar, Badge } from '@/components/ui'
import { formatAmount } from '@/lib/money'
import type { Account } from '@/types/entities'

interface AccountListItemProps {
  account: Account
  onClick: () => void
}

export function AccountListItem({ account, onClick }: AccountListItemProps) {
  const Icon = getAccountIcon(account.icon)

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left transition-colors active:bg-surface-elevated"
    >
      <Avatar icon={<Icon className="h-5 w-5" />} color={account.color} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{account.name}</p>
        <p className="truncate text-xs text-muted-foreground">{account.provider ? account.provider : typeLabel(account.type)}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <p className="text-sm font-semibold tabular-nums text-foreground">{formatAmount(account.balance, account.currency)}</p>
        {account.isArchived && <Badge variant="warning">Archived</Badge>}
      </div>
    </button>
  )
}

function typeLabel(type: Account['type']): string {
  switch (type) {
    case 'bank': return 'Bank account'
    case 'cash': return 'Cash'
    case 'mobile_wallet': return 'Mobile wallet'
    case 'card': return 'Credit card'
    case 'savings': return 'Savings'
    default: return 'Other'
  }
}