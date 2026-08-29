import { BottomSheet } from './BottomSheet'
import { CategoryIcon } from '@/lib/lucideIcon'
import { formatAmount } from '@/lib/money'
import { useActiveAccounts } from '../useTransactions'
import type { Account } from '@/types/entities'

interface AccountSelectSheetProps {
  open: boolean
  onClose: () => void
  onSelect: (account: Account) => void
  title?: string
  excludeAccountId?: string
}

export function AccountSelectSheet({
  open,
  onClose,
  onSelect,
  title = 'Pay from',
  excludeAccountId,
}: AccountSelectSheetProps) {
  const { accounts: allAccounts, isLoading } = useActiveAccounts()
  const accounts = excludeAccountId ? allAccounts.filter((a) => a.id !== excludeAccountId) : allAccounts

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading accounts…</p>}

      {!isLoading && accounts.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {excludeAccountId
            ? 'No other active accounts available. Add one from Accounts first.'
            : 'No active accounts yet. Add one from Accounts first.'}
        </p>
      )}

      <div className="flex flex-col gap-2 pb-2">
        {accounts.map((account) => (
          <button
            key={account.id}
            onClick={() => {
              onSelect(account)
              onClose()
            }}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface-elevated px-4 py-3 text-left active:scale-[0.98] transition-transform"
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${account.color}26` }}
            >
              <CategoryIcon name={account.icon} size={18} color={account.color} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">{account.name}</span>
              {account.provider && (
                <span className="block truncate text-xs text-muted-foreground">{account.provider}</span>
              )}
            </span>
            <span className="shrink-0 text-sm font-semibold text-foreground/80">
              {formatAmount(account.balance, account.currency)}
            </span>
          </button>
        ))}
      </div>
    </BottomSheet>
  )
}