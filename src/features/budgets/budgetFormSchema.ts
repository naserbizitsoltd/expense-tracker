import { z } from 'zod'

export const budgetPeriods = ['weekly', 'monthly', 'yearly', 'custom'] as const

export const budgetFormSchema = z
  .object({
    name: z.string().trim().max(60, 'Keep it under 60 characters').optional(),
    amountInput: z
      .string()
      .trim()
      .min(1, 'Enter an amount')
      .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount, e.g. 10000 or 10000.50')
      .refine((v) => Number(v) > 0, 'Amount must be greater than zero'),
    isOverall: z.boolean(),
    categoryId: z.string().optional(),
        period: z.enum(budgetPeriods),
    startDate: z.string().min(1, 'Choose a start date'),
    endDate: z.string().optional(),
    notes: z.string().trim().max(200, 'Keep notes under 200 characters').optional(),
  })
  .refine((v) => v.isOverall || (v.categoryId && v.categoryId.length > 0), {
    message: 'Choose a category',
    path: ['categoryId'],
  })
  .refine((v) => v.period !== 'custom' || (v.endDate && v.endDate.length > 0), {
    message: 'Choose an end date for a custom period',
    path: ['endDate'],
  })

export type BudgetFormValues = z.infer<typeof budgetFormSchema>

export const budgetFormDefaults = (): BudgetFormValues => ({
  name: '',
  amountInput: '',
  isOverall: false,
  categoryId: '',
  period: 'monthly',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  notes: '',
})