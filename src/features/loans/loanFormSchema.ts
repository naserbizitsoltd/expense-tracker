import { z } from 'zod'

export const loanFormSchema = z.object({
  direction: z.enum(['given', 'taken']),
  counterpartyName: z.string().trim().min(1, 'Enter a name').max(60, 'Keep it under 60 characters'),
  principalInput: z
    .string()
    .trim()
    .min(1, 'Enter an amount')
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount, e.g. 100000')
    .refine((v) => Number(v) > 0, 'Amount must be greater than zero'),
  accountId: z.string().min(1, 'Choose an account'),
  startDate: z.string().min(1, 'Choose a start date'), // yyyy-MM-dd
  dueDate: z.string().optional(), // yyyy-MM-dd, optional
  interestRateInput: z.string().trim().optional(),
  notes: z.string().trim().max(200, 'Keep notes under 200 characters').optional(),
})

export type LoanFormValues = z.infer<typeof loanFormSchema>

export const loanFormDefaults = (direction: 'given' | 'taken' = 'taken'): LoanFormValues => ({
  direction,
  counterpartyName: '',
  principalInput: '',
  accountId: '',
  startDate: new Date().toISOString().slice(0, 10),
  dueDate: '',
  interestRateInput: '',
  notes: '',
})