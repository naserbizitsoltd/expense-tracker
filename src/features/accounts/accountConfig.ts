import type { AccountType } from '@/types/entities'
import { Landmark, Wallet, Smartphone, CreditCard, PiggyBank, MoreHorizontal, type LucideIcon } from 'lucide-react'

// The 7 quick-pick presets from the product spec. "type" is the stored
// AccountType; bKash/Nagad/Rocket all map to 'mobile_wallet' and are told
// apart by `provider`. Presets only decide the *default* icon/color/name —
// the user can still change provider, color, etc. in the form.
export interface AccountTypePreset {
  key: string
  label: string
  type: AccountType
  defaultProvider: string
  defaultIcon: string
  defaultColor: string
}

export const ACCOUNT_TYPE_PRESETS: AccountTypePreset[] = [
  { key: 'bank', label: 'Bank Account', type: 'bank', defaultProvider: '', defaultIcon: 'Landmark', defaultColor: '#22c55e' },
  { key: 'cash', label: 'Cash Wallet', type: 'cash', defaultProvider: '', defaultIcon: 'Wallet', defaultColor: '#f59e0b' },
  { key: 'bkash', label: 'bKash', type: 'mobile_wallet', defaultProvider: 'bKash', defaultIcon: 'Smartphone', defaultColor: '#e2136e' },
  { key: 'nagad', label: 'Nagad', type: 'mobile_wallet', defaultProvider: 'Nagad', defaultIcon: 'Smartphone', defaultColor: '#f7941d' },
  { key: 'rocket', label: 'Rocket', type: 'mobile_wallet', defaultProvider: 'Rocket', defaultIcon: 'Smartphone', defaultColor: '#8c3494' },
  { key: 'card', label: 'Credit Card', type: 'card', defaultProvider: '', defaultIcon: 'CreditCard', defaultColor: '#6366f1' },
  { key: 'other', label: 'Other', type: 'other', defaultProvider: '', defaultIcon: 'MoreHorizontal', defaultColor: '#64748b' },
]

const ACCOUNT_ICONS: Record<string, LucideIcon> = {
  Landmark,
  Wallet,
  Smartphone,
  CreditCard,
  PiggyBank,
  MoreHorizontal,
}

export function getAccountIcon(name: string): LucideIcon {
  return ACCOUNT_ICONS[name] ?? MoreHorizontal
}

// Grouping used on the Accounts screen.
export function accountGroupLabel(type: AccountType): string {
  switch (type) {
    case 'cash':
    case 'mobile_wallet':
      return 'Cash & Wallets'
    case 'bank':
    case 'savings':
      return 'Bank Accounts'
    case 'card':
      return 'Credit'
    default:
      return 'Other'
  }
}