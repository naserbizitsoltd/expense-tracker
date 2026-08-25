import { CreditCard, Landmark, Wallet, Smartphone, type LucideIcon } from 'lucide-react'

export const DEBIT_CARD_COLORS = ['#0ea5e9', '#22c55e', '#4f7fff', '#14b8a6', '#6366f1', '#64748b', '#0891b2', '#059669']
export const DEFAULT_DEBIT_CARD_COLOR = DEBIT_CARD_COLORS[0]

export const DEBIT_CARD_ICON_OPTIONS = ['CreditCard', 'Landmark', 'Wallet', 'Smartphone']
export const DEFAULT_DEBIT_CARD_ICON = 'CreditCard'

const DEBIT_CARD_ICONS: Record<string, LucideIcon> = { CreditCard, Landmark, Wallet, Smartphone }

export function getDebitCardIcon(name: string): LucideIcon {
  return DEBIT_CARD_ICONS[name] ?? CreditCard
}

export const EXPIRY_MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const month = i + 1
  return { value: String(month), label: String(month).padStart(2, '0') }
})

export function expiryYearOptions(): { value: string; label: string }[] {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 16 }, (_, i) => {
    const year = currentYear + i
    return { value: String(year), label: String(year) }
  })
}