import { toDecimal, fromDecimal } from '@/types/money'
import type { CurrencyCode } from '@/types/money'

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  BDT: '৳',
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
}

export function currencySymbol(currency: CurrencyCode): string {
  return CURRENCY_SYMBOLS[currency]
}

// Symbol-first display formatting for an integer smallest-unit amount,
// e.g. formatAmount(12545050, 'BDT') -> "৳ 125,450.50"
export function formatAmount(amountMinorUnits: number, currency: CurrencyCode): string {
  const decimal = toDecimal({ amount: amountMinorUnits, currency })
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(decimal))
  const sign = decimal < 0 ? '-' : ''
  return `${sign}${currencySymbol(currency)} ${formatted}`
}

// Parses a user-typed amount string (digits + up to 2 decimal places,
// commas allowed) into an integer in the smallest currency unit.
// Returns null when the string isn't a valid non-negative amount.
export function parseAmountInput(value: string, currency: CurrencyCode = 'BDT'): number | null {
  const cleaned = value.replace(/,/g, '').trim()
  if (cleaned === '' || !/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const decimal = Number(cleaned)
  if (Number.isNaN(decimal) || decimal < 0) return null
  return fromDecimal(decimal, currency).amount
}