import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { BottomSheet } from '@/features/transactions/components/BottomSheet'
import { AmountInput } from '@/features/transactions/components/AmountInput'
import { AccountSelectSheet } from '@/features/transactions/components/AccountSelectSheet'
import { CategoryIcon } from '@/lib/lucideIcon'
import { cn } from '@/lib/cn'
import { parseAmountInput, formatAmount } from '@/lib/money'
import { addMoneyToGoal, withdrawFromGoal } from '@/services/goalService'
import { getUserMessage } from '@/db'
import type { Account, Goal } from '@/types/entities'

interface GoalMoneyFormSheetProps {
  open: boolean
  onClose: () => void
  goal: Goal | null
  mode: 'contribution' | 'withdrawal'
  onSaved: () => void
}

export function GoalMoneyFormSheet({ open, onClose, goal, mode, onSaved }: GoalMoneyFormSheetProps) {
  const isWithdrawal = mode === 'withdrawal'
  const [accountSheetOpen, setAccountSheetOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [amountInput, setAmountInput] = useState('')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setSelectedAccount(null)
    setAmountInput('')
    setNote('')
    setError(null)
  }, [open, mode, goal?.id])

  if (!goal) return null

  async function handleSubmit() {
    if (!goal || !selectedAccount) return
    setError(null)
    const amount = parseAmountInput(amountInput, selectedAccount.currency)
    if (amount === null) {
      setError('Enter a valid amount.')
      return
    }
    setIsSubmitting(true)
    try {
      const input = { goalId: goal.id, accountId: selectedAccount.id, amount, note: note.trim() }
      if (isWithdrawal) await withdrawFromGoal(input)
      else await addMoneyToGoal(input)
      onSaved()
      onClose()
    } catch (e) {
      setError(getUserMessage(e))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title={isWithdrawal ? `Withdraw from ${goal.name}` : `Add money to ${goal.name}`}>
        <div className="flex flex-col gap-5 pb-1">
          <AmountInput value={amountInput} onChange={setAmountInput} currency={selectedAccount?.currency ?? goal.currency} />

          {isWithdrawal && (
            <p className="-mt-3 px-1 text-xs text-white/40">
              Available to withdraw: {formatAmount(goal.currentAmount, goal.currency)}
            </p>
          )}

          <button
            type="button"
            onClick={() => setAccountSheetOpen(true)}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-left"
          >
            {selectedAccount ? (
              <>
                <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: `${selectedAccount.color}26` }}>
                  <CategoryIcon name={selectedAccount.icon} size={16} color={selectedAccount.color} />
                </span>
                <span className="text-sm font-medium text-white">{selectedAccount.name}</span>
              </>
            ) : (
              <span className="text-sm text-white/40">{isWithdrawal ? 'Withdraw to account' : 'From account'}</span>
            )}
            <ChevronRight size={18} className="ml-auto text-white/30" />
          </button>

          <div>
            <label className="mb-1.5 block px-1 text-xs font-medium text-white/50">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What's this for"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-emerald-400/60"
            />
          </div>

          {error && <p className="rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{error}</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedAccount || !amountInput}
            className={cn(
              'w-full rounded-2xl py-4 text-center text-base font-semibold text-black transition-opacity',
              'bg-emerald-400',
              (isSubmitting || !selectedAccount || !amountInput) && 'opacity-50'
            )}
          >
            {isSubmitting ? 'Saving…' : isWithdrawal ? 'Withdraw' : 'Add Money'}
          </button>
        </div>
      </BottomSheet>

      <AccountSelectSheet
        open={accountSheetOpen}
        onClose={() => setAccountSheetOpen(false)}
        onSelect={setSelectedAccount}
        title={isWithdrawal ? 'Withdraw to' : 'From account'}
      />
    </>
  )
}