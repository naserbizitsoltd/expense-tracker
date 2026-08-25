import { z } from 'zod'

export const accountFormSchema = z.object({
  name: z.string().trim().min(1, 'Account name is required').max(60, 'Keep it under 60 characters'),
  presetKey: z.string().min(1),
  provider: z.string().trim().max(60, 'Keep it under 60 characters'),
  currency: z.enum(['BDT', 'USD', 'EUR', 'GBP', 'INR']),
  openingBalanceInput: z
    .string()
    .trim()
    .min(1, 'Opening balance is required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount, e.g. 1000 or 1000.50'),
  accountNumber: z.string().trim().max(40, 'Keep it under 40 characters'),
  notes: z.string().trim().max(200, 'Keep notes under 200 characters'),
  icon: z.string().min(1),
  color: z.string().min(1),
})

export type AccountFormValues = z.infer<typeof accountFormSchema>