import { z } from 'zod'

export const debitCardFormSchema = z.object({
  name: z.string().trim().min(1, 'Card name is required').max(60, 'Keep it under 60 characters'),
  provider: z.string().trim().min(1, 'Provider is required').max(60, 'Keep it under 60 characters'),
  last4: z.string().trim().regex(/^\d{4}$/, 'Enter exactly 4 digits'),
  accountId: z.string().min(1, 'Choose a linked account'),
  expiryMonth: z.string().trim(),
  expiryYear: z.string().trim(),
  icon: z.string().min(1),
  color: z.string().min(1),
})

export type DebitCardFormValues = z.infer<typeof debitCardFormSchema>