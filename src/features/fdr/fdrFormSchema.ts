import { z } from 'zod'

export const fdrFormSchema = z.object({
  name: z.string().trim().min(1, 'Enter an FDR name').max(60, 'Keep it under 60 characters'),
  institution: z.string().trim().min(1, 'Enter a bank or provider').max(60, 'Keep it under 60 characters'),
  referenceNumber: z.string().trim().max(40, 'Keep it under 40 characters').optional(),
  accountId: z.string().min(1, 'Choose a source account'),
  principalInput: z
    .string()
    .trim()
    .min(1, 'Enter a principal amount')
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount, e.g. 100000')
    .refine((v) => Number(v) > 0, 'Amount must be greater than zero'),
  tenurePreset: z.string().min(1, 'Choose a tenure'),
  tenureMonthsInput: z
    .string()
    .trim()
    .min(1, 'Enter the number of months')
    .regex(/^\d+$/, 'Enter a whole number')
    .refine((v) => Number(v) > 0, 'Must be greater than zero'),
  startDate: z.string().min(1, 'Choose a start date'), // yyyy-MM-dd
  maturityDate: z.string().optional(), // yyyy-MM-dd, optional
  interestRateInput: z.string().trim().optional(),
  maturityAmountInput: z.string().trim().optional(), // optional explicit maturity amount
  notes: z.string().trim().max(200, 'Keep notes under 200 characters').optional(),
})

export type FdrFormValues = z.infer<typeof fdrFormSchema>

export const fdrFormDefaults = (): FdrFormValues => ({
  name: '',
  institution: '',
  referenceNumber: '',
  accountId: '',
  principalInput: '',
  tenurePreset: '12',
  tenureMonthsInput: '12',
  startDate: new Date().toISOString().slice(0, 10),
  maturityDate: '',
  interestRateInput: '',
  maturityAmountInput: '',
  notes: '',
})