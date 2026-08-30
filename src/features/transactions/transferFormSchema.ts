import { z } from 'zod'

export const transferFormSchema = z
  .object({
    amountInput: z
      .string()
      .trim()
      .min(1, 'Enter an amount')
      .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount, e.g. 5000 or 5000.50')
      .refine((v) => Number(v) > 0, 'Amount must be greater than zero'),
    fromAccountId: z.string().min(1, 'Choose a source account'),
    toAccountId: z.string().min(1, 'Choose a destination account'),
    date: z.string().min(1, 'Choose a date'), // yyyy-MM-dd
    time: z.string().trim().optional(),
    description: z.string().trim().max(80, 'Keep it under 80 characters').optional(),
    notes: z.string().trim().max(200, 'Keep notes under 200 characters').optional(),
    hasTransferCharge: z.boolean(),
    chargeAmountInput: z.string().trim().optional(),
  })
  .refine((v) => v.fromAccountId === '' || v.toAccountId === '' || v.fromAccountId !== v.toAccountId, {
    message: 'From and To accounts must be different',
    path: ['toAccountId'],
  })
  .superRefine((v, ctx) => {
    if (!v.hasTransferCharge) return
    const raw = v.chargeAmountInput?.trim() ?? ''
    if (raw === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter the transfer charge amount', path: ['chargeAmountInput'] })
      return
    }
    if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid amount, e.g. 10 or 10.50', path: ['chargeAmountInput'] })
      return
    }
    if (Number(raw) <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Charge must be greater than zero', path: ['chargeAmountInput'] })
    }
  })

export type TransferFormValues = z.infer<typeof transferFormSchema>

export const transferFormDefaults = (): TransferFormValues => ({
  amountInput: '',
  fromAccountId: '',
  toAccountId: '',
  date: new Date().toISOString().slice(0, 10),
  time: '',
  description: '',
  notes: '',
  hasTransferCharge: false,
  chargeAmountInput: '',
})