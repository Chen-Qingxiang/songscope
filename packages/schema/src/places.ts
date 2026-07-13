import { z } from 'zod'
import { sidSchema } from './ids.js'

export const placeSchema = z.object({
  sid: sidSchema,
  preferredName: z.string().min(1),
  historicalName: z.string().min(1),
  placeType: z.enum(['prefecture', 'county', 'capital', 'region']),
  longitude: z.number().min(-180).max(180).nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  geometryStatus: z.enum(['historical-boundary', 'seat-point', 'modern-proxy', 'unresolved']),
  note: z.string().min(1)
})

export type Place = z.infer<typeof placeSchema>
