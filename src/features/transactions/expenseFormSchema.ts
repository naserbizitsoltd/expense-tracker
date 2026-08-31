import { z } from 'zod'

export const expenseFormSchema = z.object({
  amountInput: z
    .string()
    .trim()
    .min(1, 'Enter an amount')
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount, e.g. 350 or 350.50')
    .refine((v) => Number(v) > 0, 'Amount must be greater than zero'),
    categoryId: z.string().optional(),
  accountId: z.string().min(1, 'Choose a payment source'),
  date: z.string().min(1, 'Choose a date'), // yyyy-MM-dd
  time: z.string().trim().optional(),
  description: z.string().trim().max(80, 'Keep it under 80 characters').optional(),
  notes: z.string().trim().max(200, 'Keep notes under 200 characters').optional(),
  tags: z.array(z.string()).optional(),
})

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>

export const expenseFormDefaults = (): ExpenseFormValues => ({
  amountInput: '',
  categoryId: '',
  accountId: '',
  date: new Date().toISOString().slice(0, 10),
  time: '',
  description: '',
  notes: '',
  tags: [],
})