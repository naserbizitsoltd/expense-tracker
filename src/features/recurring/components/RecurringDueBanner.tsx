import { useState } from 'react'
import { AlertCircle, Repeat, ChevronRight, Check, X as XIcon } from 'lucide-react'
import { format } from 'date-fns'
import { BottomSheet, useToast } from '@/components/ui'
import { AccountSelectSheet } from '@/features/transactions/components/AccountSelectSheet'
import { formatAmount } from '@/lib/money'
import { cn } from '@/lib/cn'
import { getUserMessage, recurringTransactionRepository } from '@/db'
import { generateDueOccurrence, skipDueOccurrence, processDueRecurringTransactions } from '@/services/recurringService'
import { useRecurringDue } from '../useRecurringDue'
import type { Account } from '@/types/entities'

export function RecurringDueBanner() {
  const { rows, isLoading } = useRecurringDue()
  const { showToast } = useToast()
  const [open, setOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [changingAccountFor, setChangingAccountFor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (isLoading || rows.length === 0) return null

  async function handleGenerate(ruleId: string) {
    setBusyId(ruleId)
    setError(null)
    try {
      const { generated, reason } = await generateDueOccurrence(ruleId)
      if (!generated) {
        setError(
          reason === 'insufficient_balance'
            ? 'Insufficient balance — skip, change the account, or top up and try again.'
            : 'This recurring transaction could not be generated right now.'
        )
      } else {
        showToast('Recurring transaction generated', 'success')
      }
    } catch (e) {
      setError(getUserMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  async function handleSkip(ruleId: string) {
    setBusyId(ruleId)
    setError(null)
    try {
      await skipDueOccurrence(ruleId)
      showToast('Occurrence skipped', 'info')
    } catch (e) {
      setError(getUserMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  async function handleGenerateAll() {
    setBusyId('__all__')
    setError(null)
    try {
      const count = await processDueRecurringTransactions()
      showToast(
        count > 0
          ? `Generated ${count} recurring transaction${count === 1 ? '' : 's'}`
          : 'Nothing generated — check items below for insufficient balance',
        count > 0 ? 'success' : 'info'
      )
    } catch (e) {
      setError(getUserMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  async function handleChangeAccount(ruleId: string, account: Account) {
    try {
      await recurringTransactionRepository.update(ruleId, { accountId: account.id, currency: account.currency })
      setChangingAccountFor(null)
      showToast(`Switched to ${account.name}`, 'info')
    } catch (e) {
      setError(getUserMessage(e))
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="safe-top fixed inset-x-0 top-0 z-40 mx-auto flex w-full max-w-md items-center gap-3 border-b border-amber-400/20 bg-amber-400/10 px-4 py-2.5 text-left backdrop-blur"
      >
        <AlertCircle size={16} className="shrink-0 text-amber-300" />
        <span className="flex-1 text-xs font-medium text-amber-200">
          {rows.length} recurring transaction{rows.length === 1 ? '' : 's'} due
        </span>
        <ChevronRight size={16} className="text-amber-300/60" />
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Recurring transactions due">
        <div className="flex flex-col gap-3 pb-1">
          {error && <p className="rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{error}</p>}

          <button
            onClick={handleGenerateAll}
            disabled={busyId !== null}
            className="rounded-2xl bg-emerald-400 py-3 text-center text-sm font-semibold text-black disabled:opacity-50"
          >
            {busyId === '__all__' ? 'Generating…' : 'Generate all due'}
          </button>

          <div className="flex flex-col gap-2">
            {rows.map(({ rule, occurrenceDate, insufficientBalance, accountName }) => {
              const isIncome = rule.templateType === 'income'
              const busy = busyId === rule.id
              return (
                <div
                  key={rule.id}
                  className="flex flex-col gap-2 rounded-2xl border border-border bg-surface px-4 py-3.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface">
                      <Repeat size={16} className="text-muted-foreground" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {rule.note || (isIncome ? 'Income' : 'Expense')}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {accountName ?? 'Unknown account'} · Due {format(occurrenceDate, 'd MMM')}
                      </p>
                    </div>
                    <span className={cn('text-sm font-semibold', isIncome ? 'text-emerald-400' : 'text-rose-300/90')}>
                      {isIncome ? '+' : '-'}
                      {formatAmount(rule.amount, rule.currency)}
                    </span>
                  </div>

                  {insufficientBalance && (
                    <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">
                      Insufficient balance in {accountName ?? 'this account'}.
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleGenerate(rule.id)}
                      disabled={busy || insufficientBalance}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-400/15 py-2 text-xs font-semibold text-emerald-300 disabled:opacity-40"
                    >
                      <Check size={14} /> Generate
                    </button>
                    {insufficientBalance && (
                      <button
                        onClick={() => setChangingAccountFor(rule.id)}
                        disabled={busy}
                        className="flex-1 rounded-xl bg-surface py-2 text-xs font-semibold text-muted-foreground"
                      >
                        Change account
                      </button>
                    )}
                    <button
                      onClick={() => handleSkip(rule.id)}
                      disabled={busy}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-surface py-2 text-xs font-semibold text-muted-foreground disabled:opacity-40"
                    >
                      <XIcon size={14} /> Skip
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </BottomSheet>

      <AccountSelectSheet
        open={changingAccountFor !== null}
        onClose={() => setChangingAccountFor(null)}
        onSelect={(account) => changingAccountFor && handleChangeAccount(changingAccountFor, account)}
        title="Pay from"
      />
    </>
  )
}