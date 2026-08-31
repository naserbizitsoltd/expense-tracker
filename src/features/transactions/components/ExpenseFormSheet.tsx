import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronRight, Plus, Trash2 } from 'lucide-react'
import { BottomSheet } from './BottomSheet'
import { AmountInput } from './AmountInput'
import { CategorySelectSheet } from './CategorySelectSheet'
import { PaymentSourceSelectSheet } from './PaymentSourceSelectSheet'
import { TagInput } from './TagInput'
import { CategoryIcon } from '@/lib/lucideIcon'
import { cn } from '@/lib/cn'
import { singleFlight } from '@/lib/singleFlight'
import { parseAmountInput } from '@/lib/money'
import { createExpense, createSplitExpense, updateTransaction } from '@/services/transactionService'
import { getUserMessage } from '@/db'
import { expenseFormSchema, expenseFormDefaults, type ExpenseFormValues } from '../expenseFormSchema'
import { useAllTags } from '../useTransactions'
import type { Account, Category, CreditCard, DebitCard, Transaction } from '@/types/entities'
import type { TransactionListItem } from '../useTransactions'

interface ExpenseFormSheetProps {
  open: boolean
  editing?: TransactionListItem | null
  onClose: () => void
  onSaved: (transaction: Transaction, category: Category, account: Account | null, creditCard?: CreditCard | null) => void
}

interface SplitLine {
  id: string
  category: Category | null
  amountInput: string
}

function newSplitLine(): SplitLine {
  return { id: crypto.randomUUID(), category: null, amountInput: '' }
}

const submitExpense = singleFlight(createExpense)
const submitSplitExpense = singleFlight(createSplitExpense)
const submitExpenseEdit = singleFlight(updateTransaction)

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function ExpenseFormSheet({ open, editing, onClose, onSaved }: ExpenseFormSheetProps) {
  const allTags = useAllTags()
  const [categorySheetOpen, setCategorySheetOpen] = useState(false)
  const [sourceSheetOpen, setSourceSheetOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [selectedCreditCard, setSelectedCreditCard] = useState<CreditCard | null>(null)
  const [selectedDebitCard, setSelectedDebitCard] = useState<{ debitCard: DebitCard; account: Account } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [isSplit, setIsSplit] = useState(false)
  const [splitLines, setSplitLines] = useState<SplitLine[]>([newSplitLine(), newSplitLine()])
  const [splitCategorySheetForLine, setSplitCategorySheetForLine] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: expenseFormDefaults(),
  })

  const amountInput = watch('amountInput')
  const sourceCurrency = selectedAccount?.currency ?? selectedDebitCard?.account.currency ?? selectedCreditCard?.currency ?? 'BDT'
  const isEditing = !!editing

  // Prefill the form whenever an "editing" transaction is handed in.
  // Split mode is never entered from an edit — each slice of a split
  // receipt is edited individually, like any other expense.
  useEffect(() => {
    if (!open) return
    if (editing) {
      const tx = editing.transaction
      const d = new Date(tx.date)
      reset({
        amountInput: (tx.amount / 100).toFixed(2),
        categoryId: tx.categoryId ?? '',
        accountId: tx.creditCardId ?? tx.accountId,
        date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
        description: tx.note ?? '',
        notes: '',
        tags: tx.tags ?? [],
      })
      setSelectedCategory(editing.category ?? null)
      setSelectedDebitCard(null)
      setTags(tx.tags ?? [])
      setIsSplit(false)
      setSplitLines([newSplitLine(), newSplitLine()])
      if (editing.creditCard) {
        setSelectedCreditCard(editing.creditCard)
        setSelectedAccount(null)
      } else {
        setSelectedCreditCard(null)
        setSelectedAccount(editing.account ?? null)
      }
    } else {
      reset(expenseFormDefaults())
      setSelectedCategory(null)
      setSelectedAccount(null)
      setSelectedCreditCard(null)
      setSelectedDebitCard(null)
      setTags([])
      setIsSplit(false)
      setSplitLines([newSplitLine(), newSplitLine()])
    }
  }, [open, editing, reset])

  function resetAndClose() {
    reset(expenseFormDefaults())
    setSelectedCategory(null)
    setSelectedAccount(null)
    setSelectedCreditCard(null)
    setSelectedDebitCard(null)
    setSubmitError(null)
    setTags([])
    setIsSplit(false)
    setSplitLines([newSplitLine(), newSplitLine()])
    onClose()
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!selectedAccount && !selectedCreditCard && !selectedDebitCard) return
    if (!isSplit && !selectedCategory) return

    setSubmitError(null)
    setIsSubmitting(true)
    try {
      const amount = parseAmountInput(values.amountInput, sourceCurrency)
      if (amount === null) {
        setSubmitError('Enter a valid amount.')
        return
      }

      const [year, month, day] = values.date.split('-').map(Number)
      const [hours, minutes] = values.time ? values.time.split(':').map(Number) : [12, 0]
      const date = new Date(year, (month ?? 1) - 1, day ?? 1, hours ?? 12, minutes ?? 0).getTime()
      const note = values.description?.trim() || values.notes?.trim() || ''

      if (isSplit) {
        const splits = splitLines.map((l) => ({
          categoryId: l.category?.id ?? '',
          amount: parseAmountInput(l.amountInput, sourceCurrency) ?? 0,
        }))
        if (splits.some((s) => !s.categoryId || s.amount <= 0)) {
          setSubmitError('Every split needs a category and an amount greater than zero.')
          return
        }
        const splitTotal = splits.reduce((sum, s) => sum + s.amount, 0)
        if (splitTotal !== amount) {
          setSubmitError('Split amounts must add up to the total.')
          return
        }

        const transactions = await submitSplitExpense(
          selectedCreditCard
            ? {
                creditCardId: selectedCreditCard.id,
                date,
                note,
                tags,
                splits,
              }
            : {
                accountId: (selectedDebitCard?.account.id ?? selectedAccount?.id) as string,
                debitCardId: selectedDebitCard?.debitCard.id ?? null,
                date,
                note,
                tags,
                splits,
              }
        )
        onSaved(
          transactions[0],
          (splitLines[0].category as Category) ?? undefined,
          selectedAccount ?? selectedDebitCard?.account ?? null,
          selectedCreditCard
        )
        resetAndClose()
        return
      }

      let transaction: Transaction
      if (editing) {
        // Payment source is locked during edit (see PaymentSourceSelectSheet
        // being disabled below) so we only ever send amount/category/date/note/tags.
        transaction = await submitExpenseEdit(editing.transaction.id, {
          amount,
          categoryId: selectedCategory!.id,
          date,
          note,
          tags,
        })
      } else {
        transaction = selectedCreditCard
          ? await submitExpense({
              creditCardId: selectedCreditCard.id,
              amount,
              categoryId: selectedCategory!.id,
              date,
              note,
              tags,
            })
          : selectedDebitCard
            ? await submitExpense({
                accountId: selectedDebitCard.account.id,
                debitCardId: selectedDebitCard.debitCard.id,
                amount,
                categoryId: selectedCategory!.id,
                date,
                note,
                tags,
              })
            : await submitExpense({
                accountId: selectedAccount!.id,
                amount,
                categoryId: selectedCategory!.id,
                date,
                note,
                tags,
              })
      }

      onSaved(transaction, selectedCategory!, selectedAccount ?? selectedDebitCard?.account ?? null, selectedCreditCard)
      resetAndClose()
    } catch (error) {
      setSubmitError(getUserMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  })

  const splitAssigned = splitLines.reduce((sum, l) => sum + (parseAmountInput(l.amountInput, sourceCurrency) ?? 0), 0)
  const splitTotal = parseAmountInput(amountInput, sourceCurrency) ?? 0
  const splitRemaining = splitTotal - splitAssigned

  const canSubmit =
    !isSubmitting &&
    (selectedAccount || selectedCreditCard || selectedDebitCard) &&
    (isSplit ? true : !!selectedCategory)

  return (
    <>
      <BottomSheet open={open} onClose={resetAndClose} title={isEditing ? 'Edit Expense' : 'Add Expense'}>
        <form onSubmit={onSubmit} className="flex flex-col gap-5 pb-1">
          <AmountInput
            value={amountInput}
            onChange={(v) => setValue('amountInput', v, { shouldValidate: true })}
            currency={sourceCurrency}
            error={errors.amountInput?.message}
          />

          {!isEditing && (
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-medium text-foreground">Split across categories</span>
              <button
                type="button"
                onClick={() => setIsSplit((s) => !s)}
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors',
                  isSplit ? 'bg-primary' : 'bg-surface-elevated border border-border'
                )}
              >
                <span
                  className={cn(
                    'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                    isSplit ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          )}

          {!isSplit ? (
            <>
              <button
                type="button"
                onClick={() => setCategorySheetOpen(true)}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface-elevated px-4 py-3.5 text-left"
              >
                {selectedCategory ? (
                  <>
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${selectedCategory.color}26` }}
                    >
                      <CategoryIcon name={selectedCategory.icon} size={16} color={selectedCategory.color} />
                    </span>
                    <span className="text-sm font-medium text-foreground">{selectedCategory.name}</span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">Select category</span>
                )}
                <ChevronRight size={18} className="ml-auto text-muted-foreground" />
              </button>
              {errors.categoryId && <p className="-mt-3 px-1 text-sm text-red-400">{errors.categoryId.message}</p>}
            </>
          ) : (
            <div className="flex flex-col gap-2">
              {splitLines.map((line) => (
                <div key={line.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSplitCategorySheetForLine(line.id)}
                    className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-surface-elevated px-3 py-2.5 text-left"
                  >
                    {line.category ? (
                      <>
                        <CategoryIcon name={line.category.icon} size={14} color={line.category.color} />
                        <span className="truncate text-sm text-foreground">{line.category.name}</span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Category</span>
                    )}
                  </button>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={line.amountInput}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d.]/g, '')
                      if (/^\d*\.?\d{0,2}$/.test(v)) {
                        setSplitLines((rows) => rows.map((r) => (r.id === line.id ? { ...r, amountInput: v } : r)))
                      }
                    }}
                    className="w-24 rounded-xl border border-border bg-surface-elevated px-3 py-2.5 text-right text-sm text-foreground outline-none"
                  />
                  {splitLines.length > 2 && (
                    <button
                      type="button"
                      aria-label="Remove split line"
                      onClick={() => setSplitLines((rows) => rows.filter((r) => r.id !== line.id))}
                      className="flex h-9 w-9 shrink-0 items-center justify-center text-muted-foreground"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setSplitLines((rows) => [...rows, newSplitLine()])}
                className="flex items-center gap-1.5 self-start px-1 py-1 text-sm font-medium text-primary"
              >
                <Plus size={16} /> Add category
              </button>
              <p className={cn('px-1 text-xs', splitRemaining === 0 ? 'text-muted-foreground' : 'text-danger')}>
                {splitRemaining === 0
                  ? 'Splits add up to the total.'
                  : `${splitRemaining > 0 ? 'Remaining to assign' : 'Over by'}: ${Math.abs(splitRemaining / 100).toFixed(2)}`}
              </p>
            </div>
          )}

          <button
            type="button"
            disabled={isEditing}
            onClick={() => setSourceSheetOpen(true)}
            className={cn(
              'flex items-center gap-3 rounded-2xl border border-border bg-surface-elevated px-4 py-3.5 text-left',
              isEditing && 'opacity-60'
            )}
          >
            {selectedAccount ? (
              <>
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${selectedAccount.color}26` }}
                >
                  <CategoryIcon name={selectedAccount.icon} size={16} color={selectedAccount.color} />
                </span>
                <span className="text-sm font-medium text-foreground">{selectedAccount.name}</span>
              </>
            ) : selectedDebitCard ? (
              <>
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${selectedDebitCard.debitCard.color}26` }}
                >
                  <CategoryIcon name={selectedDebitCard.debitCard.icon} size={16} color={selectedDebitCard.debitCard.color} />
                </span>
                <span className="text-sm font-medium text-foreground">
                  {selectedDebitCard.debitCard.name} •••• {selectedDebitCard.debitCard.last4}
                </span>
              </>
            ) : selectedCreditCard ? (
              <>
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${selectedCreditCard.color}26` }}
                >
                  <CategoryIcon name={selectedCreditCard.icon} size={16} color={selectedCreditCard.color} />
                </span>
                <span className="text-sm font-medium text-foreground">
                  {selectedCreditCard.name} •••• {selectedCreditCard.last4}
                </span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Pay from</span>
            )}
            {!isEditing && <ChevronRight size={18} className="ml-auto text-muted-foreground" />}
          </button>
          {isEditing && (
            <p className="-mt-3 px-1 text-xs text-muted-foreground">Payment source can't be changed once a transaction is created.</p>
          )}
          {errors.accountId && <p className="-mt-3 px-1 text-sm text-red-400">{errors.accountId.message}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block px-1 text-xs font-medium text-muted-foreground">Date</label>
              <input
                type="date"
                {...register('date')}
                className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/60"
              />
            </div>
            <div>
              <label className="mb-1.5 block px-1 text-xs font-medium text-muted-foreground">Time (optional)</label>
              <input
                type="time"
                {...register('time')}
                className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/60"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block px-1 text-xs font-medium text-muted-foreground">Description (optional)</label>
            <input
              type="text"
              placeholder="e.g. Lunch with colleagues"
              {...register('description')}
              className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/60"
            />
          </div>

          <div>
            <label className="mb-1.5 block px-1 text-xs font-medium text-muted-foreground">Tags (optional)</label>
            <TagInput value={tags} onChange={setTags} suggestions={allTags} />
          </div>

          <div>
            <label className="mb-1.5 block px-1 text-xs font-medium text-muted-foreground">Notes (optional)</label>
            <textarea
              rows={2}
              placeholder="Anything else worth remembering"
              {...register('notes')}
              className="w-full resize-none rounded-xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/60"
            />
          </div>

          {submitError && <p className="rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{submitError}</p>}

          <div className="pt-2">
            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                'w-full rounded-2xl py-4 text-center text-base font-semibold text-black transition-opacity',
                'bg-emerald-400',
                !canSubmit && 'opacity-50'
              )}
            >
              {isSubmitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Save Expense'}
            </button>
          </div>
        </form>
      </BottomSheet>

      <CategorySelectSheet
        open={categorySheetOpen}
        onClose={() => setCategorySheetOpen(false)}
        onSelect={(category) => {
          setSelectedCategory(category)
          setValue('categoryId', category.id, { shouldValidate: true })
        }}
      />
      <CategorySelectSheet
        open={splitCategorySheetForLine !== null}
        onClose={() => setSplitCategorySheetForLine(null)}
        onSelect={(category) => {
          setSplitLines((rows) => rows.map((r) => (r.id === splitCategorySheetForLine ? { ...r, category } : r)))
        }}
      />
      <PaymentSourceSelectSheet
        open={sourceSheetOpen}
        onClose={() => setSourceSheetOpen(false)}
        onSelect={(source) => {
          if (source.kind === 'account') {
            setSelectedAccount(source.account)
            setSelectedCreditCard(null)
            setSelectedDebitCard(null)
            setValue('accountId', source.account.id, { shouldValidate: true })
          } else if (source.kind === 'debitCard') {
            setSelectedDebitCard({ debitCard: source.debitCard, account: source.account })
            setSelectedAccount(null)
            setSelectedCreditCard(null)
            setValue('accountId', source.debitCard.id, { shouldValidate: true })
          } else {
            setSelectedCreditCard(source.creditCard)
            setSelectedAccount(null)
            setSelectedDebitCard(null)
            setValue('accountId', source.creditCard.id, { shouldValidate: true })
          }
        }}
      />
    </>
  )
}