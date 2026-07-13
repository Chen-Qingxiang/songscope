import { z } from 'zod'

export const sidPrefixes = [
  'person', 'place', 'office', 'event', 'service', 'source', 'locator',
  'assertion', 'time', 'concept', 'curation'
] as const

export type SidPrefix = (typeof sidPrefixes)[number]
export type Sid = `${SidPrefix}:${string}`

export const sidSchema = z.string().min(3).refine(
  (value) => sidPrefixes.some((prefix) => value.startsWith(`${prefix}:`)),
  'SID must use a registered SongScope prefix'
).transform((value) => value as Sid)

export function hasSidPrefix(value: string, prefix: SidPrefix): boolean {
  return value.startsWith(`${prefix}:`)
}
