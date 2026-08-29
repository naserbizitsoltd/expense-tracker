import { z } from 'zod'

export const loanFormSchema = z
  .object({
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
    tenureMonthsInput: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || /^\d+$/.test(v), 'Enter a whole number of months')
      .refine((v) => !v || Number(v) > 0, 'Tenure must be greater than zero'),
    interestRateInput: z.string().trim().optional(),
    interestRateType: z.enum(['monthly', 'yearly']),
    notes: z.string().trim().max(200, 'Keep notes under 200 characters').optional(),
    hasProcessingFee: z.enum(['no', 'yes']),
    processingFeeInput: z.string().trim().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.direction !== 'taken' || values.hasProcessingFee !== 'yes') return
    if (!values.processingFeeInput || !/^\d+(\.\d{1,2})?$/.test(values.processingFeeInput)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['processingFeeInput'], message: 'Enter a valid fee amount' })
      return
    }
    const fee = Number(values.processingFeeInput)
    const principal = Number(values.principalInput || '0')
    if (fee <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['processingFeeInput'], message: 'Fee must be greater than zero' })
    } else if (principal > 0 && fee >= principal) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['processingFeeInput'], message: 'Fee must be less than the principal' })
    }
  })

export type LoanFormValues = z.infer<typeof loanFormSchema>

export const loanFormDefaults = (direction: 'given' | 'taken' = 'taken'): LoanFormValues => ({
  direction,
  counterpartyName: '',
  principalInput: '',
  accountId: '',
  startDate: new Date().toISOString().slice(0, 10),
  dueDate: '',
  tenureMonthsInput: '',
  interestRateInput: '',
  interestRateType: 'monthly',
  notes: '',
  hasProcessingFee: 'no',
  processingFeeInput: '',
})