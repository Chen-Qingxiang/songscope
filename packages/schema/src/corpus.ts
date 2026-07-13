import { z } from 'zod'
import { sidSchema } from './ids.js'

export const corpusDivisionSchema = z.enum(['benji', 'zhi', 'biao', 'liezhuan', 'appendix'])
export const sourceUnitTypeSchema = z.enum(['work_division', 'juan', 'chapter', 'section'])
export const passageReviewStatusSchema = z.enum(['raw', 'reviewed'])
export const annotationStatusSchema = z.enum(['candidate', 'reviewed', 'rejected'])
export const annotationTypeSchema = z.enum([
  'chronology', 'person', 'place', 'institution', 'office', 'appointment-action', 'event-term'
])

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/)

export const corpusLicenseSchema = z.object({
  spdxId: z.literal('CC-BY-SA-4.0'),
  name: z.literal('Creative Commons Attribution-Share Alike 4.0'),
  url: z.string().url(),
  attributionRequired: z.literal(true)
})

export const corpusSourceItemSchema = z.object({
  sid: sidSchema,
  workSid: sidSchema,
  provider: z.literal('Chinese Wikisource'),
  pageTitle: z.string().min(1),
  pageId: z.number().int().positive(),
  revisionId: z.number().int().positive(),
  revisionTimestamp: z.string().datetime(),
  canonicalUrl: z.string().url(),
  historyUrl: z.string().url(),
  attributionUrl: z.string().url(),
  contentModel: z.string().min(1),
  license: corpusLicenseSchema,
  retrievedAt: z.string().datetime(),
  sourceTextChecksum: sha256Schema,
  sourceTextBytes: z.number().int().positive()
})

export const corpusDirectoryEntrySchema = z.object({
  juan: z.number().int().min(1).max(496),
  pageTitle: z.string().min(1),
  labelOriginal: z.string().min(1),
  division: corpusDivisionSchema,
  sequenceIndex: z.number().int().min(1),
  externalAnchor: z.string().min(1)
})

export const sourceUnitSchema = z.object({
  sid: sidSchema,
  sourceItemSid: sidSchema,
  parentUnitSid: sidSchema.nullable(),
  unitType: sourceUnitTypeSchema,
  division: corpusDivisionSchema,
  juan: z.number().int().min(1).max(496).nullable(),
  labelOriginal: z.string().min(1),
  labelNormalized: z.string().min(1),
  sequenceIndex: z.number().int().nonnegative(),
  externalAnchor: z.string().min(1).nullable()
})

export const sourcePassageSchema = z.object({
  sid: sidSchema,
  sourceUnitSid: sidSchema,
  sequenceIndex: z.number().int().min(1),
  sourceText: z.string().min(1),
  normalizedText: z.string().min(1).nullable(),
  checksum: sha256Schema,
  segmentationMethod: z.literal('wikitext-blocks'),
  segmentationVersion: z.literal('1.0.0'),
  reviewStatus: passageReviewStatusSchema
})

export const textAnnotationSchema = z.object({
  sid: sidSchema,
  passageSid: sidSchema,
  startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().positive(),
  offsetUnit: z.literal('unicode-code-point'),
  surfaceText: z.string().min(1),
  annotationType: annotationTypeSchema,
  targetEntitySid: sidSchema.nullable(),
  normalizedValue: z.string().min(1).nullable(),
  status: annotationStatusSchema,
  method: z.string().min(1),
  curationActivitySid: sidSchema
}).refine((value) => value.endOffset > value.startOffset, {
  message: 'annotation endOffset must be greater than startOffset'
})

export const corpusDirectoryFileSchema = z.object({
  schemaVersion: z.literal('0.3.0'),
  sourceItem: corpusSourceItemSchema,
  sourceText: z.string().min(1),
  entries: z.array(corpusDirectoryEntrySchema).length(496)
})

export const corpusVolumeFileSchema = z.object({
  schemaVersion: z.literal('0.3.0'),
  sourceItem: corpusSourceItemSchema,
  unit: sourceUnitSchema,
  sourceText: z.string().min(1),
  passages: z.array(sourcePassageSchema).min(1),
  annotations: z.array(textAnnotationSchema)
})

export const corpusProcessingSchema = z.object({
  acquisitionVersion: z.literal('1.0.0'),
  segmentationVersion: z.literal('1.0.0'),
  annotationVersion: z.literal('1.0.0')
})

export const corpusManifestSchema = z.object({
  schemaVersion: z.literal('0.3.0'),
  corpusVersion: z.string().min(1),
  snapshotSid: sidSchema,
  contentHash: sha256Schema,
  workSid: sidSchema,
  directoryRevisionId: z.literal(2535238),
  expectedVolumes: z.literal(496),
  processing: corpusProcessingSchema,
  directory: corpusSourceItemSchema,
  pages: z.array(corpusSourceItemSchema).length(496)
})

export const corpusCoverageAnomalySchema = z.object({
  kind: z.enum(['missing', 'duplicate', 'acquisition-error', 'empty-text', 'invalid', 'unsegmented', 'unsearchable']),
  juan: z.number().int().min(1).max(496).nullable(),
  pageTitle: z.string().nullable(),
  message: z.string().min(1)
})

export const corpusCoverageSchema = z.object({
  schemaVersion: z.literal('0.3.0'),
  corpusVersion: z.string().min(1),
  snapshotSid: sidSchema,
  expected: z.literal(496),
  discovered: z.number().int().min(0).max(496),
  acquired: z.number().int().min(0).max(496),
  validated: z.number().int().min(0).max(496),
  segmented: z.number().int().min(0).max(496),
  searchable: z.number().int().min(0).max(496),
  reviewed: z.number().int().nonnegative(),
  candidateAnnotations: z.number().int().nonnegative(),
  anomalies: z.array(corpusCoverageAnomalySchema)
})

export const corpusUnitsFileSchema = z.object({
  schemaVersion: z.literal('0.3.0'),
  snapshotSid: sidSchema,
  units: z.array(sourceUnitSchema).min(501)
})

export type CorpusDivision = z.infer<typeof corpusDivisionSchema>
export type CorpusSourceItem = z.infer<typeof corpusSourceItemSchema>
export type CorpusDirectoryEntry = z.infer<typeof corpusDirectoryEntrySchema>
export type SourceUnit = z.infer<typeof sourceUnitSchema>
export type SourcePassage = z.infer<typeof sourcePassageSchema>
export type TextAnnotation = z.infer<typeof textAnnotationSchema>
export type CorpusDirectoryFile = z.infer<typeof corpusDirectoryFileSchema>
export type CorpusVolumeFile = z.infer<typeof corpusVolumeFileSchema>
export type CorpusManifest = z.infer<typeof corpusManifestSchema>
export type CorpusCoverage = z.infer<typeof corpusCoverageSchema>
export type CorpusUnitsFile = z.infer<typeof corpusUnitsFileSchema>
