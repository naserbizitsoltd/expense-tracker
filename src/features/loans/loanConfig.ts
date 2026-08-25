import { Landmark, User, Building2, HandCoins, Banknote, type LucideIcon } from 'lucide-react'

export const LOAN_COLORS = [
  '#6366f1',
  '#22c55e',
  '#4f7fff',
  '#f59e0b',
  '#e2136e',
  '#8c3494',
  '#f97316',
  '#64748b',
]

export const DEFAULT_LOAN_COLOR = LOAN_COLORS[0]

export const LOAN_ICON_OPTIONS = ['Landmark', 'User', 'Building2', 'HandCoins', 'Banknote']
export const DEFAULT_LOAN_ICON = 'HandCoins'

const LOAN_ICONS: Record<string, LucideIcon> = { Landmark, User, Building2, HandCoins, Banknote }

export function getLoanIcon(name: string): LucideIcon {
  return LOAN_ICONS[name] ?? HandCoins
}

export function loanDirectionLabel(direction: 'given' | 'taken'): string {
  return direction === 'taken' ? 'Borrowed' : 'Lent'
}

// Label for the amount still owed, phrased from the app-user's point of view.
export function loanOutstandingLabel(direction: 'given' | 'taken'): string {
  return direction === 'taken' ? 'Outstanding' : 'Receivable'
}

// Label for which account a disbursement/repayment moves against.
export function loanAccountLabel(direction: 'given' | 'taken', action: 'disburse' | 'repay'): string {
  if (action === 'disburse') {
    return direction === 'taken' ? 'Receive into' : 'Pay from'
  }
  return direction === 'taken' ? 'Pay from' : 'Receive into'
}