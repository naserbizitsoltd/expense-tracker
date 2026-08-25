import { z } from 'zod'
import { CATEGORY_COLORS } from '@/features/categories/categoryConfig'

export const goalFormSchema = z.object({
  name: z.string().trim().min(1, 'Enter a goal name').max(60, 'Keep it under 60 characters'),
  targetAmountInput: z
    .string()
    .trim()
    .min(1, 'Enter a target amount')
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount, e.g. 100000')
    .refine((v) => Number(v) > 0, 'Target must be greater than zero'),
  targetDate: z.string().optional(),
  icon: z.string().min(1, 'Choose an icon'),
  color: z.string().min(1, 'Choose a color'),
  notes: z.string().trim().max(200, 'Keep notes under 200 characters').optional(),
})

export type GoalFormValues = z.infer<typeof goalFormSchema>

export const goalFormDefaults = (): GoalFormValues => ({
  name: '',
  targetAmountInput: '',
  targetDate: '',
  icon: 'PiggyBank',
  color: CATEGORY_COLORS[0],
  notes: '',
})