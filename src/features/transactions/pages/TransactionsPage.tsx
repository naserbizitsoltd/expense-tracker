import { useState } from 'react'
import { Plus, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight } from 'lucide-react'
import { BottomSheet } from '../components/BottomSheet'
import { ExpenseFormSheet } from '../components/ExpenseFormSheet'
import { IncomeFormSheet } from '../components/IncomeFormSheet'
import { TransferFormSheet } from '../components/TransferFormSheet'
import { TransactionRow } from '../components/TransactionRow'
import { EmptyTransactionsState } from '../components/EmptyTransactionsState'
import { SuccessToast } from '../components/SuccessToast'
import { useTransactionsList } from '../useTransactions'
import type { Account, Category, Transaction } from '@/types/entities'

type SavedFeedback =
  | { kind: 'income' | 'expense'; transaction: Transaction; category: Category; account: Account | null }
  | { kind: 'transfer'; transaction: Transaction; fromAccount: Account; toAccount: Account }

export function TransactionsPage() {
  const { items, isLoading } = useTransactionsList()
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [expenseFormOpen, setExpenseFormOpen] = useState(false)
  const [incomeFormOpen, setIncomeFormOpen] = useState(false)
  const [transferFormOpen, setTransferFormOpen] = useState(false)
  const [feedback, setFeedback] = useState<SavedFeedback | null>(null)

  return (
    <div className="flex min-h-full flex-col px-4 pb-24 pt-6">
      <div className="mb-4 flex items-center justify-between px-1">
        <h1 className="text-xl font-semibold text-white">Transactions</h1>
        <button
          onClick={() => setAddMenuOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400 text-black active:scale-95 transition-transform"
          aria-label="Add transaction"
        >
          <Plus size={20} />
        </button>
      </div>

      {isLoading && <p className="px-1 text-sm text-white/40">Loading…</p>}

            {!isLoading && items && items.length === 0 && (
        <EmptyTransactionsState
          onAddExpense={() => setExpenseFormOpen(true)}
          onAddIncome={() => setIncomeFormOpen(true)}
          onAddTransfer={() => setTransferFormOpen(true)}
        />
      )}

      {!isLoading && items && items.length > 0 && (
        <div className="divide-y divide-white/5 rounded-2xl bg-white/[0.02] px-3">
          {items.map((item) => (
            <TransactionRow key={item.transaction.id} {...item} />
          ))}
        </div>
      )}

      <BottomSheet open={addMenuOpen} onClose={() => setAddMenuOpen(false)} title="Add Transaction">
        <div className="flex flex-col gap-3 pb-2">
          <button
            type="button"
            onClick={() => {
              setAddMenuOpen(false)
              setIncomeFormOpen(true)
            }}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left active:scale-[0.98] transition-transform"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-400/15">
              <ArrowDownCircle size={20} className="text-emerald-400" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-white">Income</span>
              <span className="block text-xs text-white/40">Money you received</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAddMenuOpen(false)
              setExpenseFormOpen(true)
            }}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left active:scale-[0.98] transition-transform"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-400/15">
              <ArrowUpCircle size={20} className="text-rose-300" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-white">Expense</span>
              <span className="block text-xs text-white/40">Money you spent</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAddMenuOpen(false)
              setTransferFormOpen(true)
            }}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left active:scale-[0.98] transition-transform"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
              <ArrowLeftRight size={20} className="text-white/70" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-white">Transfer</span>
              <span className="block text-xs text-white/40">Move money between accounts</span>
            </span>
          </button>
        </div>
      </BottomSheet>

      <ExpenseFormSheet
        open={expenseFormOpen}
        onClose={() => setExpenseFormOpen(false)}
        onSaved={(transaction, category, account) =>
          setFeedback({ kind: 'expense', transaction, category, account })
        }
      />
      <IncomeFormSheet
        open={incomeFormOpen}
        onClose={() => setIncomeFormOpen(false)}
        onSaved={(transaction, category, account) =>
          setFeedback({ kind: 'income', transaction, category, account })
        }
      />
      <TransferFormSheet
        open={transferFormOpen}
        onClose={() => setTransferFormOpen(false)}
        onSaved={(transaction, fromAccount, toAccount) =>
          setFeedback({ kind: 'transfer', transaction, fromAccount, toAccount })
        }
      />

      {feedback && feedback.kind !== 'transfer' && (
        <SuccessToast
          message={feedback.kind === 'income' ? 'Income added' : 'Expense added'}
          amount={feedback.kind === 'income' ? feedback.transaction.amount : -feedback.transaction.amount}
          currency={feedback.transaction.currency}
          onDismiss={() => setFeedback(null)}
        />
      )}
      {feedback && feedback.kind === 'transfer' && (
        <SuccessToast
          message="Transfer completed"
          detail={`${feedback.fromAccount.name} → ${feedback.toAccount.name}`}
          amount={feedback.transaction.amount}
          currency={feedback.transaction.currency}
          variant="neutral"
          onDismiss={() => setFeedback(null)}
        />
      )}
    </div>
  )
}