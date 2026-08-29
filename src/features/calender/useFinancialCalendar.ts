import { useMemo, useState } from 'react'
import { addMonths, endOfMonth, startOfMonth } from 'date-fns'
import {
  recurringTransactionRepository,
  dpsRepository,
  loanRepository,
  creditCardRepository,
  fdrRepository,
  budgetRepository,
  accountRepository,
  useLiveQuery,
} from '@/db'
import { buildCalendarEvents, type CalendarEvent } from '@/services/calendarService'
import type { Account } from '@/types/entities'

/** Reactive Financial Calendar data for a single visible month, with prev/next/today navigation. */
export function useFinancialCalendarMonth(initialMonth: number = Date.now()) {
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(initialMonth).getTime())

  const rangeStart = monthAnchor
  const rangeEnd = endOfMonth(monthAnchor).getTime()

  const recurringState = useLiveQuery(() => recurringTransactionRepository.getAll(), [])
  const dpsState = useLiveQuery(() => dpsRepository.getAll(), [])
  const loanState = useLiveQuery(() => loanRepository.getAll(), [])
  const creditCardState = useLiveQuery(() => creditCardRepository.getAll(), [])
  const fdrState = useLiveQuery(() => fdrRepository.getAll(), [])
  const budgetState = useLiveQuery(() => budgetRepository.getAll(), [])
  const accountState = useLiveQuery(() => accountRepository.getAll(), [])

  const accountsById = useMemo<Record<string, Account>>(() => {
    const map: Record<string, Account> = {}
    for (const a of accountState.data ?? []) map[a.id] = a
    return map
  }, [accountState.data])

  const events = useMemo<CalendarEvent[]>(
    () =>
      buildCalendarEvents({
        recurring: recurringState.data ?? [],
        dpsList: dpsState.data ?? [],
        loans: loanState.data ?? [],
        creditCards: creditCardState.data ?? [],
        fdrs: fdrState.data ?? [],
        budgets: budgetState.data ?? [],
        accountsById,
        rangeStart,
        rangeEnd,
        now: Date.now(),
      }),
    [
      recurringState.data,
      dpsState.data,
      loanState.data,
      creditCardState.data,
      fdrState.data,
      budgetState.data,
      accountsById,
      rangeStart,
      rangeEnd,
    ]
  )

  const isLoading =
    recurringState.isLoading ||
    dpsState.isLoading ||
    loanState.isLoading ||
    creditCardState.isLoading ||
    fdrState.isLoading ||
    budgetState.isLoading ||
    accountState.isLoading

  return {
    monthAnchor,
    rangeStart,
    rangeEnd,
    events,
    isLoading,
    goToPreviousMonth: () => setMonthAnchor((m) => startOfMonth(addMonths(m, -1)).getTime()),
    goToNextMonth: () => setMonthAnchor((m) => startOfMonth(addMonths(m, 1)).getTime()),
    goToToday: () => setMonthAnchor(startOfMonth(Date.now()).getTime()),
  }
}