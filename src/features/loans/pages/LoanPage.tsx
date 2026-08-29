import { useState } from 'react'
import { Plus, HandCoins, Trash2, Receipt, Banknote } from 'lucide-react'
import { format } from 'date-fns'
import { AppShell } from '@/layouts/AppShell'
import {
  Button,
  BottomSheet,
  BalanceCard,
  Card,
  Badge,
  EmptyState,
  LoadingState,
  ConfirmationDialog,
  useToast,
} from '@/components/ui'
import { useLoans, useLoan } from '../useLoans'
import { useLoanRepayments } from '../useLoanRepayments'
import { useAccounts } from '@/features/accounts/useAccounts'
import { LoanListItem } from '../components/LoanListItem'
import { LoanForm } from '../components/LoanForm'
import { LoanRepaymentSheet } from '../components/LoanRepaymentSheet'
import { LoanRepaymentRow } from '../components/LoanRepaymentRow'
import { loanRepository } from '@/db'
import { loanDirectionLabel, loanOutstandingLabel } from '../loanConfig'
import { formatAmount } from '@/lib/money'
import { APP_CONFIG } from '@/config/app.config'
import { getLoanAmountReceived } from '@/services/loanService'

interface LoanPageProps {
  onBack: () => void
}

export function LoanPage({ onBack }: LoanPageProps) {
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null)

  if (selectedLoanId) {
    return <LoanDetails loanId={selectedLoanId} onBack={() => setSelectedLoanId(null)} />
  }
  return <LoanList onBack={onBack} onOpenLoan={setSelectedLoanId} />
}

function LoanList({ onBack, onOpenLoan }: { onBack: () => void; onOpenLoan: (id: string) => void }) {
  const { takenLoans, givenLoans, outstandingByLoan, totalBorrowedOutstanding, totalReceivable, isLoading } = useLoans()
  const [addOpen, setAddOpen] = useState(false)
  const [addDirection, setAddDirection] = useState<'given' | 'taken'>('taken')

  const hasAny = takenLoans.length > 0 || givenLoans.length > 0

  return (
    <AppShell
      title="Loans"
      headerBack={onBack}
      fab={
        <Button
          size="lg"
          className="h-14 w-14 rounded-full p-0 shadow-lg"
          aria-label="Add loan"
          onClick={() => {
            setAddDirection('taken')
            setAddOpen(true)
          }}
        >
          <Plus className="h-6 w-6" />
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-3">
          <BalanceCard label="Borrowed (owed)" amount={formatAmount(totalBorrowedOutstanding, APP_CONFIG.defaultCurrency)} />
          <BalanceCard label="Lent (receivable)" amount={formatAmount(totalReceivable, APP_CONFIG.defaultCurrency)} />
        </div>

        {isLoading && <LoadingState label="Loading loans..." />}

        {!isLoading && !hasAny && (
          <EmptyState
            icon={<HandCoins className="h-6 w-6" />}
            title="No loans yet"
            description="Track money you've borrowed or lent, separately from your regular income and expenses."
            action={
              <Button
                onClick={() => {
                  setAddDirection('taken')
                  setAddOpen(true)
                }}
              >
                Add Loan
              </Button>
            }
          />
        )}

        {!isLoading && takenLoans.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Borrowed</p>
            <div className="flex flex-col gap-2">
              {takenLoans.map((loan) => (
                <LoanListItem
                  key={loan.id}
                  loan={loan}
                  outstanding={outstandingByLoan[loan.id] ?? loan.principal}
                  onClick={() => onOpenLoan(loan.id)}
                />
              ))}
            </div>
          </section>
        )}

        {!isLoading && givenLoans.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lent / Receivable</p>
            <div className="flex flex-col gap-2">
              {givenLoans.map((loan) => (
                <LoanListItem
                  key={loan.id}
                  loan={loan}
                  outstanding={outstandingByLoan[loan.id] ?? loan.principal}
                  onClick={() => onOpenLoan(loan.id)}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title="Add Loan">
        <LoanForm initialDirection={addDirection} onDone={() => setAddOpen(false)} />
      </BottomSheet>
    </AppShell>
  )
}

function LoanDetails({ loanId, onBack }: { loanId: string; onBack: () => void }) {
  const { loan, isLoading } = useLoan(loanId)
  const { repayments, principalPaid, interestPaid, outstanding, isLoading: isRepaymentsLoading } = useLoanRepayments(loanId)
  const { accounts } = useAccounts()
  const { showToast } = useToast()
  const [repayOpen, setRepayOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  if (isLoading) {
    return (
      <AppShell title="Loan" headerBack={onBack}>
        <LoadingState label="Loading..." />
      </AppShell>
    )
  }

  if (!loan) {
    return (
      <AppShell title="Loan" headerBack={onBack}>
        <EmptyState icon={<HandCoins className="h-6 w-6" />} title="Loan not found" description="It may have been deleted." />
      </AppShell>
    )
  }

  const account = accounts.find((a) => a.id === loan.accountId)
  const accountsById = new Map(accounts.map((a) => [a.id, a]))
  const progressPct = loan.principal > 0 ? Math.min(100, Math.round((principalPaid / loan.principal) * 100)) : 0
  const isClosed = loan.status === 'closed'

  const amountReceived = getLoanAmountReceived(loan)
  const remainingPrincipal = Math.max(0, loan.principal - principalPaid)
  const totalCost = loan.processingFee + interestPaid
  const hasCost = loan.processingFee > 0 || interestPaid > 0

  async function deleteLoan() {
    try {
      await loanRepository.delete(loan!.id)
      showToast('Loan deleted', 'success')
      onBack()
    } catch {
      showToast('Could not delete the loan. Please try again.', 'error')
    }
  }

  return (
    <AppShell title={loan.counterpartyName} headerBack={onBack}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 py-1 text-center">
          <p className="text-sm font-semibold text-foreground">{loan.counterpartyName}</p>
          <p className="-mt-1 text-xs text-muted-foreground">{loanDirectionLabel(loan.direction)} loan</p>
          <Badge variant={isClosed ? 'default' : loan.status === 'defaulted' ? 'danger' : 'success'}>
            {isClosed ? 'Closed' : loan.status === 'defaulted' ? 'Defaulted' : 'Active'}
          </Badge>
        </div>

        <BalanceCard label={loanOutstandingLabel(loan.direction)} amount={formatAmount(outstanding, loan.currency)} />

        <Card>
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-semibold tabular-nums text-foreground">
              {formatAmount(principalPaid, loan.currency)} repaid
            </p>
            <p className="text-xs text-muted-foreground">of {formatAmount(loan.principal, loan.currency)}</p>
          </div>
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="mt-1.5 text-xs font-medium text-muted-foreground">{progressPct}%</p>
        </Card>

        {loan.direction === 'taken' && (
          <Card padding="none" className="flex flex-col divide-y divide-border">
            <p className="px-4 pt-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Borrowing</p>
            <DetailRow label="Original principal" value={formatAmount(loan.principal, loan.currency)} />
            <DetailRow label="Processing fee" value={formatAmount(loan.processingFee, loan.currency)} />
            <DetailRow label="Amount received" value={formatAmount(amountReceived, loan.currency)} />
          </Card>
        )}

        <Card padding="none" className="flex flex-col divide-y divide-border">
          <p className="px-4 pt-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Repayment</p>
          <DetailRow label="Principal paid" value={formatAmount(principalPaid, loan.currency)} />
          <DetailRow label="Interest paid" value={formatAmount(interestPaid, loan.currency)} />
          <DetailRow label="Remaining principal" value={formatAmount(remainingPrincipal, loan.currency)} />
          <DetailRow label="Total paid" value={formatAmount(principalPaid + interestPaid, loan.currency)} />
          <DetailRow label="Remaining payable" value={formatAmount(outstanding, loan.currency)} />
        </Card>

        {hasCost && (
          <Card padding="none" className="flex flex-col divide-y divide-border">
            <p className="px-4 pt-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cost</p>
            <DetailRow label="Processing fee" value={formatAmount(loan.processingFee, loan.currency)} />
            <DetailRow label="Interest" value={formatAmount(interestPaid, loan.currency)} />
            <DetailRow label="Total borrowing cost" value={formatAmount(totalCost, loan.currency)} />
          </Card>
        )}

        <Card padding="none" className="flex flex-col divide-y divide-border">
          <DetailRow label="Account" value={account?.name ?? '—'} />
          <DetailRow label="Start date" value={format(loan.startDate, 'MMM d, yyyy')} />
          <DetailRow label="Due date" value={loan.dueDate ? format(loan.dueDate, 'MMM d, yyyy') : '—'} />
          <DetailRow label="Tenure" value={loan.tenureMonths != null ? `${loan.tenureMonths} months` : '—'} />
          <DetailRow
            label="Interest rate"
            value={loan.interestRate != null ? `${loan.interestRate}% / ${loan.interestRateType === 'monthly' ? 'month' : 'year'}` : '—'}
          />
          <DetailRow label="Status" value={isClosed ? 'Closed' : loan.status === 'defaulted' ? 'Defaulted' : 'Active'} />
        </Card>

        {loan.notes && (
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
            <p className="mt-1.5 text-sm text-foreground">{loan.notes}</p>
          </Card>
        )}

        <section className="flex flex-col gap-1">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Repayment History</p>

          {isRepaymentsLoading && <LoadingState label="Loading repayments..." />}

          {!isRepaymentsLoading && repayments.length === 0 && (
            <EmptyState
              icon={<Receipt className="h-6 w-6" />}
              title="No repayments yet"
              description="Repayments against this loan will show up here."
            />
          )}

          {!isRepaymentsLoading && repayments.length > 0 && (
            <Card padding="sm" className="flex flex-col divide-y divide-border">
              {repayments.map((r) => (
                <LoanRepaymentRow key={r.id} repayment={r} account={accountsById.get(r.accountId)} currency={loan.currency} />
              ))}
            </Card>
          )}
        </section>

        <div className="flex flex-col gap-2 pb-2">
          {!isClosed && (
            <Button onClick={() => setRepayOpen(true)}>
              <Banknote className="h-4 w-4" /> Repay
            </Button>
          )}
          {repayments.length === 0 && (
            <Button variant="danger" onClick={() => setDeleteConfirmOpen(true)}>
              <Trash2 className="h-4 w-4" /> Delete loan
            </Button>
          )}
        </div>
      </div>

      <LoanRepaymentSheet
        open={repayOpen}
        onClose={() => setRepayOpen(false)}
        loan={loan}
        outstanding={outstanding}
        onRepaid={(repayment, account) => {
          showToast(`${formatAmount(repayment.amount, loan.currency)} recorded${account ? ` · ${account.name}` : ''}`, 'success')
          setRepayOpen(false)
        }}
      />

      <ConfirmationDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={deleteLoan}
        title="Delete this loan?"
        description="This loan has no repayment history, so it can be safely deleted. This cannot be undone."
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