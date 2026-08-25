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
      {isLoading && <p className="py-8 text-center text-sm text-white/40">Loading…</p>}

      {!isLoading && accounts.length === 0 && activeCards.length === 0 && activeDebitCards.length === 0 && (
        <p className="py-8 text-center text-sm text-white/40">No active accounts, debit cards, or credit cards yet. Add one first.</p>
      )}

      {!isLoading && accounts.length > 0 && (
        <div className="flex flex-col gap-2 pb-3">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-white/40">Money Accounts</p>
          {accounts.map((account) => (
            <button
              key={account.id}
              onClick={() => {
                onSelect({ kind: 'account', account })
                onClose()
              }}
              className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-left active:scale-[0.98] transition-transform"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${account.color}26` }}
              >
                <CategoryIcon name={account.icon} size={18} color={account.color} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block truncate text-sm font-medium text-white">{account.name}</span>
                {account.provider && <span className="block truncate text-xs text-white/40">{account.provider}</span>}
              </span>
              <span className="shrink-0 text-sm font-semibold text-white/80">
                {formatAmount(account.balance, account.currency)}
              </span>
            </button>
          ))}
        </div>
      )}

            {!isLoading && activeDebitCards.length > 0 && (
        <div className="flex flex-col gap-2 pb-3">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-white/40">Debit Cards</p>
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
                className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-left active:scale-[0.98] transition-transform"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${debitCard.color}26` }}
                >
                  <CategoryIcon name={debitCard.icon} size={18} color={debitCard.color} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-sm font-medium text-white">
                    {debitCard.name} •••• {debitCard.last4}
                  </span>
                  <span className="block truncate text-xs text-white/40">Linked: {account.name}</span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-white/80">
                  {formatAmount(account.balance, account.currency)}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {!isLoading && activeCards.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-white/40">Credit Cards</p>
          {activeCards.map((card) => {
            const availableCredit = card.creditLimit - card.outstandingBalance
            return (
              <button
                key={card.id}
                onClick={() => {
                  onSelect({ kind: 'creditCard', creditCard: card })
                  onClose()
                }}
                className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-left active:scale-[0.98] transition-transform"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${card.color}26` }}
                >
                  <CategoryIcon name={card.icon} size={18} color={card.color} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-sm font-medium text-white">
                    {card.name} •••• {card.last4}
                  </span>
                  <span className="block truncate text-xs text-white/40">
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