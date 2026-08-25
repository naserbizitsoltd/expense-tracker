import { z } from 'zod'

export const creditCardPaymentFormSchema = z.object({
  amountInput: z
    .string()
    .trim()
    .min(1, 'Enter an amount')
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount, e.g. 5000 or 5000.50')
    .refine((v) => Number(v) > 0, 'Amount must be greater than zero'),
  accountId: z.string().min(1, 'Choose a source account'),
  date: z.string().min(1, 'Choose a date'), // yyyy-MM-dd
  time: z.string().trim().optional(),
  notes: z.string().trim().max(200, 'Keep notes under 200 characters').optional(),
})

export type CreditCardPaymentFormValues = z.infer<typeof creditCardPaymentFormSchema>

export const creditCardPaymentFormDefaults = (): CreditCardPaymentFormValues => ({
  amountInput: '',
  accountId: '',
  date: new Date().toISOString().slice(0, 10),
  time: '',
  notes: '',
})