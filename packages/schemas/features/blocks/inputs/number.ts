import { z } from 'zod'
import { optionBaseSchema, blockBaseSchema } from '../baseSchemas'
import { defaultButtonLabel } from './constants'
import { InputBlockType } from './enums'
import { textInputOptionsBaseSchema } from './text'
import { variableStringSchema } from '../../utils'

export const numberInputOptionsSchema = optionBaseSchema
  .merge(textInputOptionsBaseSchema)
  .merge(
    z.object({
      min: z.number().or(variableStringSchema).optional(),
      max: z.number().or(variableStringSchema).optional(),
      step: z.number().or(variableStringSchema).optional(),
    })
  )

export const numberInputSchema = blockBaseSchema.merge(
  z.object({
    type: z.enum([InputBlockType.NUMBER]),
    options: numberInputOptionsSchema,
  })
)

export const defaultNumberInputOptions: NumberInputOptions = {
  labels: { button: defaultButtonLabel, placeholder: 'Type a number...' },
}

export type NumberInputBlock = z.infer<typeof numberInputSchema>
export type NumberInputOptions = z.infer<typeof numberInputOptionsSchema>
