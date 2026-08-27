import { useState } from 'react'
import { Plus, Wallet, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Archive, ChevronDown, ChevronUp } from 'lucide-react'
import { AppShell } from '@/layouts/AppShell'
import { BottomNav } from '@/layouts/BottomNav'
import { Button, BottomSheet, BalanceCard, EmptyState, LoadingState } from '@/components/ui'
import { useAccounts } from '../useAccounts'
import { AccountForm } from '../components/AccountForm'
import { AccountListItem } from '../components/AccountListItem'
import { accountGroupLabel } from '../accountConfig'
import { formatAmount } from '@/lib/money'
import { APP_CONFIG } from '@/config/app.config'
import { ExpenseFormSheet } from '@/features/transactions/components/ExpenseFormSheet'
import { IncomeFormSheet } from '@/features/transactions/components/IncomeFormSheet'
import { TransferFormSheet } from '@/features/transactions/components/TransferFormSheet'
import { SuccessToast } from '@/features/transactions/components/SuccessToast'
import type { Account, Category, Transaction } from '@/types/entities'

interface AccountsPageProps {
  activeNav: string
  onNavChange: (key: string) => void
  onOpenMenu: () => void
  onOpenAccount: (id: string) => void
}

const GROUP_ORDER = ['Cash & Wallets', 'Bank Accounts', 'Credit', 'Other']

type QuickActionFeedback =
  | { kind: 'income' | 'expense'; transaction: Transaction; category: Category; account: Account | null }
  | { kind: 'transfer'; transaction: Transaction; fromAccount: Account; toAccount: Account }

export function AccountsPage({ activeNav, onNavChange, onOpenMenu, onOpenAccount }: AccountsPageProps) {
  const { activeAccounts, archivedAccounts, totalBalance, isLoading } = useAccounts()
  const [showArchived, setShowArchived] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [incomeOpen, setIncomeOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [feedback, setFeedback] = useState<QuickActionFeedback | null>(null)
  const grouped = GROUP_ORDER.map((label) => ({
    label,
    accounts: activeAccounts.filter((a) => accountGroupLabel(a.type) === label),
  })).filter((g) => g.accounts.length > 0)

  return (
    <AppShell
      title="Accounts"
      subtitle={`${activeAccounts.length} active`}
      headerMenu={onOpenMenu}
      bottomNav={<BottomNav active={activeNav} onChange={onNavChange} />}
      fab={
        <Button size="lg" className="h-14 w-14 rounded-full p-0 shadow-lg" aria-label="Add account" onClick={() => setAddOpen(true)}>
          <Plus className="h-6 w-6" />
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <BalanceCard label="Total Available" amount={formatAmount(totalBalance, APP_CONFIG.defaultCurrency)} />

        <div className="grid grid-cols-3 gap-2.5">
          <button
            onClick={() => setIncomeOpen(true)}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-surface py-3 text-xs font-semibold text-foreground transition-colors active:bg-surface-elevated"
          >
            <ArrowDownCircle className="h-5 w-5 text-success" />
            Income
          </button>
          <button
            onClick={() => setExpenseOpen(true)}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-surface py-3 text-xs font-semibold text-foreground transition-colors active:bg-surface-elevated"
          >
            <ArrowUpCircle className="h-5 w-5 text-danger" />
            Expense
          </button>
          <button
            onClick={() => setTransferOpen(true)}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-surface py-3 text-xs font-semibold text-foreground transition-colors active:bg-surface-elevated"
          >
            <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
            Transfer
          </button>
        </div>

        {isLoading && <LoadingState label="Loading accounts..." />}

        {!isLoading && activeAccounts.length === 0 && (
          <EmptyState
            icon={<Wallet className="h-6 w-6" />}
            title="No accounts yet"
            description="Add your bank, cash, or mobile wallet accounts to start tracking your money."
            action={<Button onClick={() => setAddOpen(true)}>Add Account</Button>}
          />
        )}

        {grouped.map((group) => (
          <section key={group.label} className="flex flex-col gap-2.5">
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</p>
            <div className="flex flex-col gap-2">
              {group.accounts.map((account) => (
                <AccountListItem key={account.id} account={account} onClick={() => onOpenAccount(account.id)} />
              ))}
            </div>
          </section>
        ))}

        {archivedAccounts.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <button
              onClick={() => setShowArchived((v) => !v)}
              className="flex w-full items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              <span className="flex items-center gap-1.5">
                <Archive className="h-3.5 w-3.5" />
                Archived Accounts ({archivedAccounts.length})
              </span>
              {showArchived ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {showArchived && (
              <div className="flex flex-col gap-2">
                {archivedAccounts.map((account) => (
                  <AccountListItem key={account.id} account={account} onClick={() => onOpenAccount(account.id)} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title="Add Account">
        <AccountForm onDone={() => setAddOpen(false)} />
      </BottomSheet>

      <ExpenseFormSheet
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        onSaved={(transaction, category, account) => setFeedback({ kind: 'expense', transaction, category, account })}
      />
      <IncomeFormSheet
        open={incomeOpen}
        onClose={() => setIncomeOpen(false)}
        onSaved={(transaction, category, account) => setFeedback({ kind: 'income', transaction, category, account })}
      />
      <TransferFormSheet
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        onSaved={(transaction, fromAccount, toAccount) => setFeedback({ kind: 'transfer', transaction, fromAccount, toAccount })}
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
    </AppShell>
  )
}