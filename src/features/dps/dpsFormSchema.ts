import { z } from 'zod'

export const dpsFormSchema = z
  .object({
    // 'existing' unlocks the opening-snapshot fields below for a DPS
    // that already had installments/interest before being tracked here.
    mode: z.enum(['new', 'existing']),
    name: z.string().trim().min(1, 'Enter a DPS name').max(60, 'Keep it under 60 characters'),
    institution: z.string().trim().min(1, 'Enter a bank or provider').max(60, 'Keep it under 60 characters'),
    referenceNumber: z.string().trim().max(40, 'Keep it under 40 characters').optional(),
    accountId: z.string().min(1, 'Choose a linked account'),
    monthlyInstallmentInput: z
      .string()
      .trim()
      .min(1, 'Enter a monthly installment amount')
      .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount, e.g. 5000')
      .refine((v) => Number(v) > 0, 'Amount must be greater than zero'),
    tenureMonthsInput: z
      .string()
      .trim()
      .min(1, 'Enter the number of installments')
      .regex(/^\d+$/, 'Enter a whole number')
      .refine((v) => Number(v) > 0, 'Must be greater than zero'),
    startDate: z.string().min(1, 'Choose a start date'), // yyyy-MM-dd
    maturityDate: z.string().optional(), // yyyy-MM-dd, optional
    interestRateInput: z.string().trim().optional(),
    notes: z.string().trim().max(200, 'Keep notes under 200 characters').optional(),
    // Existing DPS only — mirrors AccountForm's openingBalance: a
    // starting snapshot, never a fabricated set of past contributions.
    openingInstallmentsPaidInput: z.string().trim().optional(),
    openingDepositedAmountInput: z.string().trim().optional(),
    openingInterestEarnedInput: z.string().trim().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.mode !== 'existing') return

    if (!values.openingInstallmentsPaidInput || !/^\d+$/.test(values.openingInstallmentsPaidInput)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['openingInstallmentsPaidInput'],
        message: 'Enter how many installments have already been paid',
      })
    } else {
      const tenure = Number(values.tenureMonthsInput)
      const paid = Number(values.openingInstallmentsPaidInput)
      if (Number.isInteger(tenure) && paid > tenure) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['openingInstallmentsPaidInput'],
          message: "Can't exceed the total number of installments",
        })
      }
    }

    if (!values.openingDepositedAmountInput || !/^\d+(\.\d{1,2})?$/.test(values.openingDepositedAmountInput)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['openingDepositedAmountInput'],
        message: 'Enter the amount already deposited',
      })
    }

    if (values.openingInterestEarnedInput && !/^\d+(\.\d{1,2})?$/.test(values.openingInterestEarnedInput)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['openingInterestEarnedInput'],
        message: 'Enter a valid amount, e.g. 2000',
      })
    }
  })

export type DpsFormValues = z.infer<typeof dpsFormSchema>

export const dpsFormDefaults = (): DpsFormValues => ({
  mode: 'new',
  name: '',
  institution: '',
  referenceNumber: '',
  accountId: '',
  monthlyInstallmentInput: '',
  tenureMonthsInput: '',
  startDate: new Date().toISOString().slice(0, 10),
  maturityDate: '',
  interestRateInput: '',
  notes: '',
  openingInstallmentsPaidInput: '',
  openingDepositedAmountInput: '',
  openingInterestEarnedInput: '',
})