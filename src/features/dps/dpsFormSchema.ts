import { z } from 'zod'

export const dpsFormSchema = z.object({
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
})

export type DpsFormValues = z.infer<typeof dpsFormSchema>

export const dpsFormDefaults = (): DpsFormValues => ({
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
})