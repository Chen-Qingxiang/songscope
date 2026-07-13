import { z } from 'zod'
import { sidSchema } from './ids.js'

export const sourceWorkSchema = z.object({
  sid: sidSchema,
  title: z.string().min(1),
  creator: z.string().min(1),
  workType: z.enum(['primary-source', 'scholarly-edition', 'database', 'digital-transcription'])
})

export const sourceItemSchema = z.object({
  sid: sidSchema,
  workSid: sidSchema,
  label: z.string().min(1),
  url: z.string().url().nullable(),
  citation: z.string().min(1)
})

export const sourceLocatorSchema = z.object({
  sid: sidSchema,
  sourceItemSid: sidSchema,
  locatorType: z.enum(['juan', 'line', 'paragraph', 'page', 'url-fragment']),
  locatorValue: z.string().min(1),
  quoteText: z.string().min(1).nullable()
})

export type SourceWork = z.infer<typeof sourceWorkSchema>
export type SourceItem = z.infer<typeof sourceItemSchema>
export type SourceLocator = z.infer<typeof sourceLocatorSchema>
