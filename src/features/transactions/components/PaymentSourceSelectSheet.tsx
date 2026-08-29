import { BottomSheet } from './BottomSheet'
import { CategoryIcon } from '@/lib/lucideIcon'
import { formatAmount } from '@/lib/money'
import { useActiveAccounts } from '../useTransactions'
import { useCreditCards } from '@/features/credit-cards/useCreditCards'
import { useDebitCards } from '@/features/debit-cards/useDebitCards'
import type { Account, CreditCard, DebitCard } from '@/types/entities'

export type PaymentSource =
  | { kind: 'account'; account: Account }
  | { kind: 'creditCard'; creditCard: CreditCard }
  | { kind: 'debitCard'; debitCard: DebitCard; account: Account }

interface PaymentSourceSelectSheetProps {
  open: boolean
  onClose: () => void
  onSelect: (source: PaymentSource) => void
  title?: string
}

export function PaymentSourceSelectSheet({ open, onClose, onSelect, title = 'Pay from' }: PaymentSourceSelectSheetProps) {
  const { accounts, isLoading: accountsLoading } = useActiveAccounts()
  const { activeCards, isLoading: cardsLoading } = useCreditCards()
  const { activeCards: activeDebitCards, accountsById, isLoading: debitCardsLoading } = useDebitCards()
  const isLoading = accountsLoading || cardsLoading || debitCardsLoading

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>}

      {!isLoading && accounts.length === 0 && activeCards.length === 0 && activeDebitCards.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">No active accounts, debit cards, or credit cards yet. Add one first.</p>
      )}

      {!isLoading && accounts.length > 0 && (
        <div className="flex flex-col gap-2 pb-3">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Money Accounts</p>
          {accounts.map((account) => (
            <button
              key={account.id}
              onClick={() => {
                onSelect({ kind: 'account', account })
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
                {account.provider && <span className="block truncate text-xs text-muted-foreground">{account.provider}</span>}
              </span>
              <span className="shrink-0 text-sm font-semibold text-foreground/80">
                {formatAmount(account.balance, account.currency)}
              </span>
            </button>
          ))}
        </div>
      )}

            {!isLoading && activeDebitCards.length > 0 && (
        <div className="flex flex-col gap-2 pb-3">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Debit Cards</p>
          {activeDebitCards.map((debitCard) => {
            const account = accountsById.get(debitCard.accountId)
            if (!account) return null
            return (
              <button
                key={debitCard.id}
                onClick={() => {
                  onSelect({ kind: 'debitCard', debitCard, account })
                  onClose()
                }}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface-elevated px-4 py-3 text-left active:scale-[0.98] transition-transform"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${debitCard.color}26` }}
                >
                  <CategoryIcon name={debitCard.icon} size={18} color={debitCard.color} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {debitCard.name} •••• {debitCard.last4}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">Linked: {account.name}</span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-foreground/80">
                  {formatAmount(account.balance, account.currency)}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {!isLoading && activeCards.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Credit Cards</p>
          {activeCards.map((card) => {
            const availableCredit = card.creditLimit - card.outstandingBalance
            return (
              <button
                key={card.id}
                onClick={() => {
                  onSelect({ kind: 'creditCard', creditCard: card })
                  onClose()
                }}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface-elevated px-4 py-3 text-left active:scale-[0.98] transition-transform"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${card.color}26` }}
                >
                  <CategoryIcon name={card.icon} size={18} color={card.color} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {card.name} •••• {card.last4}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {formatAmount(availableCredit, card.currency)} available
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </BottomSheet>
  )
}