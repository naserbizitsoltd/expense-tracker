import { ArrowDownCircle, ArrowUpCircle, PiggyBank, CreditCard, HandCoins, Lock, Wallet2, type LucideIcon } from 'lucide-react'
import type { CalendarEventType } from '@/services/calendarService'

export interface CalendarEventTypeConfig {
  label: string
  icon: LucideIcon
  color: string
}

export const CALENDAR_EVENT_CONFIG: Record<CalendarEventType, CalendarEventTypeConfig> = {
  recurring_income: { label: 'Income', icon: ArrowUpCircle, color: '#22c55e' },
  recurring_expense: { label: 'Expense', icon: ArrowDownCircle, color: '#f43f5e' },
  dps_installment: { label: 'DPS Installment', icon: PiggyBank, color: '#6366f1' },
  dps_maturity: { label: 'DPS Maturity', icon: PiggyBank, color: '#8b5cf6' },
  loan_payment: { label: 'Loan', icon: HandCoins, color: '#f59e0b' },
  credit_card_due: { label: 'Credit Card', icon: CreditCard, color: '#e2136e' },
  fdr_maturity: { label: 'FDR Maturity', icon: Lock, color: '#0ea5e9' },
  budget_deadline: { label: 'Budget Deadline', icon: Wallet2, color: '#64748b' },
}