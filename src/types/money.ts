// All monetary amounts are stored as integers in the smallest currency
// unit (e.g. paisa for BDT, cents for USD) to avoid floating-point errors.

export type CurrencyCode = 'BDT' | 'USD' | 'EUR' | 'GBP' | 'INR'

export interface Money {
  amount: number // integer, smallest unit (e.g. poisha/cents)
  currency: CurrencyCode
}

const MINOR_UNIT_DIGITS: Record<CurrencyCode, number> = {
  BDT: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
  INR: 2,
}

export function createMoney(amount: number, currency: CurrencyCode): Money {
  if (!Number.isInteger(amount)) {
    throw new Error(`Money amount must be an integer (smallest unit). Got: ${amount}`)
  }
  return { amount, currency }
}

export function toDecimal(money: Money): number {
  const digits = MINOR_UNIT_DIGITS[money.currency]
  return money.amount / 10 ** digits
}

export function fromDecimal(decimal: number, currency: CurrencyCode): Money {
  const digits = MINOR_UNIT_DIGITS[currency]
  return createMoney(Math.round(decimal * 10 ** digits), currency)
}

export function formatMoney(money: Money, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: money.currency,
  }).format(toDecimal(money))
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot add different currencies: ${a.currency} + ${b.currency}`)
  }
  return createMoney(a.amount + b.amount, a.currency)
}

export function subtractMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot subtract different currencies: ${a.currency} - ${b.currency}`)
  }
  return createMoney(a.amount - b.amount, a.currency)
}