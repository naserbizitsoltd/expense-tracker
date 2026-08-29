import { useState } from 'react'
import { Plus, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight } from 'lucide-react'
import { AppShell } from '@/layouts/AppShell'
import { BottomNav } from '@/layouts/BottomNav'
import { BottomSheet } from '../components/BottomSheet'
import { ExpenseFormSheet } from '../components/ExpenseFormSheet'
import { IncomeFormSheet } from '../components/IncomeFormSheet'
import { TransferFormSheet } from '../components/TransferFormSheet'
import { TransactionRow } from '../components/TransactionRow'
import { EmptyTransactionsState } from '../components/EmptyTransactionsState'
import { SuccessToast } from '../components/SuccessToast'
import { useTransactionsList, type TransactionListItem } from '../useTransactions'
import { ConfirmationDialog, useToast } from '@/components/ui'
import { deleteTransaction } from '@/services/transactionService'
import { CreditCardPaymentSheet } from '@/features/credit-cards/components/CreditCardPaymentSheet'
import type { Account, Category, Transaction } from '@/types/entities'

type SavedFeedback =
  | { kind: 'income' | 'expense'; transaction: Transaction; category: Category; account: Account | null; mode: 'added' | 'updated' }
  | { kind: 'transfer'; transaction: Transaction; fromAccount: Account; toAccount: Account; mode: 'added' | 'updated' }
  | { kind: 'credit_card'; transaction: Transaction; account: Account; mode: 'added' | 'updated' }

interface TransactionsPageProps {
  activeNav: string
  onNavChange: (key: string) => void
  onOpenMenu: () => void
}

export function TransactionsPage({ activeNav, onNavChange, onOpenMenu }: TransactionsPageProps) {
  const { items, isLoading } = useTransactionsList()
  const { showToast } = useToast()
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [expenseFormOpen, setExpenseFormOpen] = useState(false)
  const [incomeFormOpen, setIncomeFormOpen] = useState(false)
  const [transferFormOpen, setTransferFormOpen] = useState(false)
  const [creditCardEditOpen, setCreditCardEditOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TransactionListItem | null>(null)
  const [feedback, setFeedback] = useState<SavedFeedback | null>(null)
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null)

  function handleEdit(item: TransactionListItem) {
    setEditingItem(item)
    switch (item.transaction.type) {
      case 'expense':
        setExpenseFormOpen(true)
        break
      case 'income':
        setIncomeFormOpen(true)
        break
      case 'transfer':
        setTransferFormOpen(true)
        break
      case 'credit_card':
        if (item.creditCard) setCreditCardEditOpen(true)
        break
    }
  }

  async function confirmDeleteTransaction() {
    if (!transactionToDelete) return
    try {
      await deleteTransaction(transactionToDelete)
      showToast('Transaction deleted', 'success')
    } catch {
      showToast('Could not delete the transaction. Please try again.', 'error')
    } finally {
      setTransactionToDelete(null)
    }
  }

  return (
    <AppShell
      title="Transactions"
      headerMenu={onOpenMenu}
      bottomNav={<BottomNav active={activeNav} onChange={onNavChange} />}
      headerAction={
        <button
          onClick={() => setAddMenuOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-95 transition-transform"
          aria-label="Add transaction"
        >
          <Plus size={20} />
        </button>
      }
    >
      {isLoading && <p className="px-1 text-sm text-muted-foreground">Loading…</p>}

      {!isLoading && items && items.length === 0 && (
        <EmptyTransactionsState
          onAddExpense={() => setExpenseFormOpen(true)}
          onAddIncome={() => setIncomeFormOpen(true)}
          onAddTransfer={() => setTransferFormOpen(true)}
        />
      )}

      {!isLoading && items && items.length > 0 && (
        <div className="divide-y divide-border rounded-2xl bg-surface px-3">
          {items.map((item) => (
            <TransactionRow
              key={item.transaction.id}
              {...item}
              onEdit={() => handleEdit(item)}
              onDelete={() => setTransactionToDelete(item.transaction.id)}
            />
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
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface-elevated px-4 py-4 text-left active:scale-[0.98] transition-transform"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/15">
              <ArrowDownCircle size={20} className="text-success" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-foreground">Income</span>
              <span className="block text-xs text-muted-foreground">Money you received</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAddMenuOpen(false)
              setExpenseFormOpen(true)
            }}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface-elevated px-4 py-4 text-left active:scale-[0.98] transition-transform"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/15">
              <ArrowUpCircle size={20} className="text-danger" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-foreground">Expense</span>
              <span className="block text-xs text-muted-foreground">Money you spent</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAddMenuOpen(false)
              setTransferFormOpen(true)
            }}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface-elevated px-4 py-4 text-left active:scale-[0.98] transition-transform"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-muted">
              <ArrowLeftRight size={20} className="text-primary" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-foreground">Transfer</span>
              <span className="block text-xs text-muted-foreground">Move money between accounts</span>
            </span>
          </button>
        </div>
      </BottomSheet>

      <ExpenseFormSheet
        open={expenseFormOpen}
        editing={editingItem && editingItem.transaction.type === 'expense' ? editingItem : null}
        onClose={() => {
          setExpenseFormOpen(false)
          setEditingItem(null)
        }}
        onSaved={(transaction, category, account) =>
          setFeedback({ kind: 'expense', transaction, category, account, mode: editingItem ? 'updated' : 'added' })
        }
      />
      <IncomeFormSheet
        open={incomeFormOpen}
        editing={editingItem && editingItem.transaction.type === 'income' ? editingItem : null}
        onClose={() => {
          setIncomeFormOpen(false)
          setEditingItem(null)
        }}
        onSaved={(transaction, category, account) =>
          setFeedback({ kind: 'income', transaction, category, account, mode: editingItem ? 'updated' : 'added' })
        }
      />
      <TransferFormSheet
        open={transferFormOpen}
        editing={editingItem && editingItem.transaction.type === 'transfer' ? editingItem : null}
        onClose={() => {
          setTransferFormOpen(false)
          setEditingItem(null)
        }}
        onSaved={(transaction, fromAccount, toAccount) =>
          setFeedback({ kind: 'transfer', transaction, fromAccount, toAccount, mode: editingItem ? 'updated' : 'added' })
        }
      />

      {editingItem?.transaction.type === 'credit_card' && editingItem.creditCard && (
        <CreditCardPaymentSheet
          open={creditCardEditOpen}
          card={editingItem.creditCard}
          editing={editingItem}
          onClose={() => {
            setCreditCardEditOpen(false)
            setEditingItem(null)
          }}
          onPaid={(transaction, account) =>
            setFeedback({ kind: 'credit_card', transaction, account, mode: 'updated' })
          }
        />
      )}

      {feedback && (feedback.kind === 'income' || feedback.kind === 'expense') && (
        <SuccessToast
          message={
            feedback.mode === 'updated'
              ? feedback.kind === 'income' ? 'Income updated' : 'Expense updated'
              : feedback.kind === 'income' ? 'Income added' : 'Expense added'
          }
          amount={feedback.kind === 'income' ? feedback.transaction.amount : -feedback.transaction.amount}
          currency={feedback.transaction.currency}
          onDismiss={() => setFeedback(null)}
        />
      )}
      {feedback && feedback.kind === 'transfer' && (
        <SuccessToast
          message={feedback.mode === 'updated' ? 'Transfer updated' : 'Transfer completed'}
          detail={`${feedback.fromAccount.name} → ${feedback.toAccount.name}`}
          amount={feedback.transaction.amount}
          currency={feedback.transaction.currency}
          variant="neutral"
          onDismiss={() => setFeedback(null)}
        />
      )}
      {feedback && feedback.kind === 'credit_card' && (
        <SuccessToast
          message="Payment updated"
          amount={feedback.transaction.amount}
          currency={feedback.transaction.currency}
          variant="neutral"
          onDismiss={() => setFeedback(null)}
        />
      )}

      <ConfirmationDialog
        open={transactionToDelete !== null}
        onClose={() => setTransactionToDelete(null)}
        onConfirm={confirmDeleteTransaction}
        title="Delete this transaction?"
        description="Deleting this transaction will reverse its effect on your account balance. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </AppShell>
  )
}