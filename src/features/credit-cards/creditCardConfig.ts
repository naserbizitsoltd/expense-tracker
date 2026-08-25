import { CreditCard, Landmark, Wallet, Banknote, type LucideIcon } from 'lucide-react'

export const CREDIT_CARD_COLORS = [
  '#6366f1',
  '#22c55e',
  '#4f7fff',
  '#f59e0b',
  '#e2136e',
  '#8c3494',
  '#f97316',
  '#64748b',
]

export const DEFAULT_CREDIT_CARD_COLOR = CREDIT_CARD_COLORS[0]

export const CREDIT_CARD_ICON_OPTIONS = ['CreditCard', 'Landmark', 'Wallet', 'Banknote']
export const DEFAULT_CREDIT_CARD_ICON = 'CreditCard'

const CREDIT_CARD_ICONS: Record<string, LucideIcon> = { CreditCard, Landmark, Wallet, Banknote }

export function getCreditCardIcon(name: string): LucideIcon {
  return CREDIT_CARD_ICONS[name] ?? CreditCard
}