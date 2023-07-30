import { z } from 'zod'
import {
  optionBaseSchema,
  blockBaseSchema,
  credentialsBaseSchema,
} from '../../baseSchemas'
import { InputBlockType } from '../enums'
import { PaymentProvider } from './enums'

export type CreditCardDetails = {
  number: string
  exp_month: string
  exp_year: string
  cvc: string
}

const addressSchema = z.object({
  country: z.string().optional(),
  line1: z.string().optional(),
  line2: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
})

export const paymentInputOptionsSchema = optionBaseSchema.merge(
  z.object({
    provider: z.nativeEnum(PaymentProvider),
    labels: z.object({
      button: z.string(),
      success: z.string().optional(),
    }),
    additionalInformation: z
      .object({
        description: z.string().optional(),
        name: z.string().optional(),
        email: z.string().optional(),
        phoneNumber: z.string().optional(),
        address: addressSchema.optional(),
      })
      .optional(),
    credentialsId: z.string().optional(),
    currency: z.string(),
    amount: z.string().optional(),
    retryMessageContent: z.string().optional(),
  })
)

export const paymentInputRuntimeOptionsSchema = z.object({
  paymentIntentSecret: z.string(),
  amountLabel: z.string(),
  publicKey: z.string(),
})

export const paymentInputSchema = blockBaseSchema.merge(
  z.object({
    type: z.enum([InputBlockType.PAYMENT]),
    options: paymentInputOptionsSchema,
  })
)

export const stripeCredentialsSchema = z
  .object({
    type: z.literal('stripe'),
    data: z.object({
      live: z.object({
        secretKey: z.string(),
        publicKey: z.string(),
      }),
      test: z.object({
        secretKey: z.string().optional(),
        publicKey: z.string().optional(),
      }),
    }),
  })
  .merge(credentialsBaseSchema)

export const defaultPaymentInputOptions: PaymentInputOptions = {
  provider: PaymentProvider.STRIPE,
  labels: { button: 'Pay', success: 'Success' },
  retryMessageContent: 'Payment failed. Please, try again.',
  currency: 'USD',
}

export type PaymentInputBlock = z.infer<typeof paymentInputSchema>
export type PaymentInputOptions = z.infer<typeof paymentInputOptionsSchema>
export type PaymentInputRuntimeOptions = z.infer<
  typeof paymentInputRuntimeOptionsSchema
>
export type StripeCredentials = z.infer<typeof stripeCredentialsSchema>
export type PaymentAddress = NonNullable<
  PaymentInputOptions['additionalInformation']
>['address']
