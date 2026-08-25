import { z } from 'zod'

export const recurringFrequencies = ['daily', 'weekly', 'monthly', 'yearly'] as const

export const recurringFormSchema = z
  .object({
    templateType: z.enum(['expense', 'income']),
    amountInput: z
      .string()
      .trim()
      .min(1, 'Enter an amount')
      .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount, e.g. 350 or 350.50')
      .refine((v) => Number(v) > 0, 'Amount must be greater than zero'),
    categoryId: z.string().min(1, 'Choose a category'),
    accountId: z.string().min(1, 'Choose an account'),
    frequency: z.enum(recurringFrequencies),
    startDate: z.string().min(1, 'Choose a start date'), // yyyy-MM-dd
    endDate: z.string().optional(), // yyyy-MM-dd, empty = no end date
    description: z.string().trim().max(80, 'Keep it under 80 characters').optional(),
    notes: z.string().trim().max(200, 'Keep notes under 200 characters').optional(),
  })
  .refine((data) => !data.endDate || data.endDate >= data.startDate, {
    message: 'End date cannot be before start date',
    path: ['endDate'],
  })

export type RecurringFormValues = z.infer<typeof recurringFormSchema>

export const recurringFormDefaults = (templateType: 'expense' | 'income' = 'expense'): RecurringFormValues => ({
  templateType,
  amountInput: '',
  categoryId: '',
  accountId: '',
  frequency: 'monthly',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  description: '',
  notes: '',
})