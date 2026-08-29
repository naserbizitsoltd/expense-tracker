import { useState } from 'react'
import { format } from 'date-fns'
import { Pencil, Archive, ArchiveRestore, Trash2, Receipt, TrendingUp, TrendingDown, Scale, History } from 'lucide-react'
import { AppShell } from '@/layouts/AppShell'
import { Avatar, Button, IconButton, Card, BalanceCard, BottomSheet, ConfirmationDialog, EmptyState, LoadingState, useToast } from '@/components/ui'
import { AccountForm } from '../components/AccountForm'
import { ReconcileAccountSheet } from '../components/ReconcileAccountSheet'
import { ReconciliationHistorySheet } from '../components/ReconciliationHistorySheet'
import { useAccount } from '../useAccounts'
import { useAccountTransactions } from '../useAccountTransactions'
import { useReconciliationHistory } from '../useReconciliation'
import { AccountTransactionRow } from '../components/AccountTransactionRow'
import { accountRepository } from '@/db'
import { deleteTransaction } from '@/services/transactionService'
import { isAccountReconcilable } from '@/services/accountReconciliationService'
import { getAccountIcon } from '../accountConfig'
import { formatAmount } from '@/lib/money'

interface AccountDetailsPageProps {
  accountId: string
  onBack: () => void
}

export function AccountDetailsPage({ accountId, onBack }: AccountDetailsPageProps) {
  const { account, isLoading } = useAccount(accountId)
  const { showToast } = useToast() // <-- Added this line
  const {
    items: transactionItems,
    totalIncome,
    totalExpense,
    isLoading: isTransactionsLoading,
  } = useAccountTransactions(accountId)
  const [editOpen, setEditOpen] = useState(false)
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null)
  const [reconcileOpen, setReconcileOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const { lastReconciledAt } = useReconciliationHistory(accountId)
  const transactionCount: number | null = isTransactionsLoading ? null : transactionItems.length

  if (isLoading) {
    return (
      <AppShell title="Account" headerBack={onBack}>
        <p className="py-12 text-center text-sm text-muted-foreground">Loading...</p>
      </AppShell>
    )
  }

  if (!account) {
    return (
      <AppShell title="Account" headerBack={onBack}>
        <EmptyState icon={<Receipt className="h-6 w-6" />} title="Account not found" description="It may have been deleted." />
      </AppShell>
    )
  }

  const acc = account
  const Icon = getAccountIcon(acc.icon)
  const hasHistory = (transactionCount ?? 0) > 0

  async function toggleArchive() {
    try {
      await accountRepository.update(acc.id, { isArchived: !acc.isArchived })
      showToast(acc.isArchived ? 'Account restored' : 'Account archived', 'success')
    } catch {
      showToast('Could not update the account. Please try again.', 'error')
    }
  }

  async function deleteAccount() {
    try {
      await accountRepository.delete(acc.id)
      showToast('Account deleted', 'success')
      onBack()
    } catch {
      showToast('Could not delete the account. Please try again.', 'error')
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
      title={acc.name}
      headerBack={onBack}
      headerAction={
        <IconButton aria-label="Edit account" onClick={() => setEditOpen(true)}>
          <Pencil className="h-[18px] w-[18px]" />
        </IconButton>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 py-1 text-center">
          <Avatar icon={<Icon className="h-7 w-7" />} color={acc.color} size="xl" />
          <p className="text-sm font-semibold text-foreground">{acc.name}</p>
          <p className="-mt-2 text-xs text-muted-foreground">{typeLabel(acc.type)}</p>
        </div>

        <BalanceCard label="Current balance" amount={formatAmount(acc.balance, acc.currency)} />

        <div className="grid grid-cols-2 gap-3">
          <Card className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
              <TrendingUp className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Total income</p>
              <p className="truncate text-sm font-semibold tabular-nums text-foreground">
                {isTransactionsLoading ? '—' : formatAmount(totalIncome, acc.currency)}
              </p>
            </div>
          </Card>
          <Card className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger/15 text-danger">
              <TrendingDown className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Total expenses</p>
              <p className="truncate text-sm font-semibold tabular-nums text-foreground">
                {isTransactionsLoading ? '—' : formatAmount(totalExpense, acc.currency)}
              </p>
            </div>
          </Card>
        </div>

        <Card padding="none" className="flex flex-col divide-y divide-border">
          <DetailRow label="Type" value={typeLabel(acc.type)} />
          {acc.provider && <DetailRow label="Provider" value={acc.provider} />}
          <DetailRow label="Opening balance" value={formatAmount(acc.openingBalance, acc.currency)} />
          <DetailRow label="Currency" value={acc.currency} />
          {acc.accountNumber && <DetailRow label="Account number" value={acc.accountNumber} />}
          <DetailRow label="Status" value={acc.isArchived ? 'Archived' : 'Active'} />
          {isAccountReconcilable(acc) && (
            <DetailRow label="Last reconciled" value={lastReconciledAt ? format(lastReconciledAt, 'MMM d, yyyy') : 'Never'} />
          )}
          <DetailRow label="Created" value={format(acc.createdAt, 'MMM d, yyyy')} />
          <DetailRow
            label="Last activity"
            value={transactionItems.length > 0 ? format(transactionItems[0].transaction.date, 'MMM d, yyyy') : 'No activity yet'}
          />
          <DetailRow label="Transactions" value={transactionCount === null ? '—' : String(transactionCount)} />
        </Card>

        {acc.notes && (
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
            <p className="mt-1.5 text-sm text-foreground">{acc.notes}</p>
          </Card>
        )}

        <section className="flex flex-col gap-1">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent transactions</p>

          {isTransactionsLoading && <LoadingState label="Loading transactions..." />}

          {!isTransactionsLoading && transactionItems.length === 0 && (
            <EmptyState
              icon={<Receipt className="h-6 w-6" />}
              title="No transactions yet"
              description="Transactions for this account will show up here as soon as you add one."
            />
          )}

          {!isTransactionsLoading && transactionItems.length > 0 && (
            <Card padding="sm" className="flex flex-col divide-y divide-border">
              {transactionItems.map((item) => (
                <AccountTransactionRow
                  key={item.transaction.id}
                  {...item}
                  onDelete={() => setTransactionToDelete(item.transaction.id)}
                />
              ))}
            </Card>
          )}
        </section>

        <div className="flex flex-col gap-2 pb-2">
          {isAccountReconcilable(acc) && !acc.isArchived && (
            <Button variant="secondary" onClick={() => setReconcileOpen(true)}>
              <Scale className="h-4 w-4" /> Reconcile account
            </Button>
          )}
          {isAccountReconcilable(acc) && (
            <Button variant="ghost" onClick={() => setHistoryOpen(true)}>
              <History className="h-4 w-4" /> Reconciliation history
            </Button>
          )}
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Edit account
          </Button>
          <Button variant="secondary" onClick={() => (acc.isArchived ? toggleArchive() : setArchiveConfirmOpen(true))}>
            {acc.isArchived ? (
              <>
                <ArchiveRestore className="h-4 w-4" /> Restore account
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" /> Archive account
              </>
            )}
          </Button>
          {!hasHistory && (
            <Button variant="danger" onClick={() => setDeleteConfirmOpen(true)}>
              <Trash2 className="h-4 w-4" /> Delete account
            </Button>
          )}
        </div>
      </div>

      <BottomSheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit Account">
        <AccountForm account={acc} onDone={() => setEditOpen(false)} hasTransactions={hasHistory} />
      </BottomSheet>

      <ReconcileAccountSheet
        open={reconcileOpen}
        onClose={() => setReconcileOpen(false)}
        account={acc}
        onReconciled={(record) =>
          showToast(record.difference === 0 ? 'Reconciliation recorded — no adjustment needed' : 'Account reconciled', 'success')
        }
      />

      <ReconciliationHistorySheet open={historyOpen} onClose={() => setHistoryOpen(false)} account={acc} />

      <ConfirmationDialog
        open={archiveConfirmOpen}
        onClose={() => setArchiveConfirmOpen(false)}
        onConfirm={toggleArchive}
        title="Archive this account?"
        description="Existing transactions will be kept. Archived accounts are hidden from active lists and won't be available for new expenses, income, or transfers — you can restore them anytime."
        confirmLabel="Archive"
      />

      <ConfirmationDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={deleteAccount}
        title="Delete this account?"
        description="This account has no transaction history, so it can be safely deleted. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />

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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

function typeLabel(type: string): string {
  switch (type) {
    case 'bank': return 'Bank account'
    case 'cash': return 'Cash'
    case 'mobile_wallet': return 'Mobile wallet'
    case 'card': return 'Credit card'
    case 'savings': return 'Savings'
    default: return 'Other'
  }
}