import { z } from 'zod'

const dayOfMonth = z
  .string()
  .trim()
  .refine((v) => v === '' || /^([1-9]|[12]\d|3[01])$/.test(v), 'Enter a day between 1 and 31')

export const creditCardFormSchema = z.object({
  name: z.string().trim().min(1, 'Card name is required').max(60, 'Keep it under 60 characters'),
  issuer: z.string().trim().min(1, 'Provider is required').max(60, 'Keep it under 60 characters'),
  last4: z
    .string()
    .trim()
    .regex(/^\d{4}$/, 'Enter exactly 4 digits'),
  currency: z.enum(['BDT', 'USD', 'EUR', 'GBP', 'INR']),
  creditLimitInput: z
    .string()
    .trim()
    .min(1, 'Credit limit is required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount, e.g. 100000 or 100000.00')
    .refine((v) => Number(v) > 0, 'Credit limit must be greater than 0'),
  outstandingBalanceInput: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount, e.g. 0 or 0.00'),
  billingCycleDayInput: dayOfMonth,
  dueDayInput: dayOfMonth,
  interestRateInput: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d+(\.\d{1,2})?$/.test(v), 'Enter a valid interest rate, e.g. 2.5'),
  icon: z.string().min(1),
  color: z.string().min(1),
})

export type CreditCardFormValues = z.infer<typeof creditCardFormSchema>