import { z } from 'zod'

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(40, 'Keep it under 40 characters'),
  type: z.enum(['expense', 'income']),
  icon: z.string().min(1, 'Choose an icon'),
  color: z.string().min(1, 'Choose a color'),
  description: z.string().trim().max(120, 'Keep the description under 120 characters'),
})

export type CategoryFormValues = z.infer<typeof categoryFormSchema>