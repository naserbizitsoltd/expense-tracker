import { z } from 'zod'

export const dpsContributionFormSchema = z.object({
  amountInput: z
    .string()
    .trim()
    .min(1, 'Enter an amount')
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount, e.g. 5000')
    .refine((v) => Number(v) > 0, 'Amount must be greater than zero'),
  accountId: z.string().min(1, 'Choose an account'),
  date: z.string().min(1, 'Choose a date'), // yyyy-MM-dd
  notes: z.string().trim().max(200, 'Keep notes under 200 characters').optional(),
})

export type DpsContributionFormValues = z.infer<typeof dpsContributionFormSchema>

export const dpsContributionFormDefaults = (): DpsContributionFormValues => ({
  amountInput: '',
  accountId: '',
  date: new Date().toISOString().slice(0, 10),
  notes: '',
})