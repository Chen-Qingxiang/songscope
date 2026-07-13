import { z } from 'zod'
import { annotationStatusSchema, annotationTypeSchema, corpusDivisionSchema, passageReviewStatusSchema } from './corpus.js'
import { sidSchema } from './ids.js'

export const corpusContextSchema = z.object({
  datasetVersion: z.string().min(1),
  corpusVersion: z.string().min(1),
  snapshotSid: sidSchema
})

export const corpusCoverageProjectionSchema = z.object({
  expected: z.number().int().nonnegative(),
  discovered: z.number().int().nonnegative(),
  acquired: z.number().int().nonnegative(),
  validated: z.number().int().nonnegative(),
  segmented: z.number().int().nonnegative(),
  searchable: z.number().int().nonnegative(),
  reviewed: z.number().int().nonnegative(),
  candidateAnnotations: z.number().int().nonnegative(),
  anomalies: z.array(z.object({
    kind: z.string().min(1),
    juan: z.number().int().nullable(),
    pageTitle: z.string().nullable(),
    message: z.string().min(1)
  }))
})

export const corpusSourceProjectionSchema = z.object({
  workSid: sidSchema,
  title: z.string().min(1),
  provider: z.string().min(1),
  directoryRevisionId: z.number().int().positive(),
  canonicalUrl: z.string().url(),
  historyUrl: z.string().url(),
  license: z.object({ spdxId: z.string(), name: z.string(), url: z.string().url() })
})

export const volumeSummarySchema = z.object({
  unitSid: sidSchema,
  sourceItemSid: sidSchema,
  juan: z.number().int().min(1).max(496),
  division: corpusDivisionSchema,
  labelOriginal: z.string().min(1),
  labelNormalized: z.string().min(1),
  revisionId: z.number().int().positive(),
  passageCount: z.number().int().nonnegative(),
  candidateAnnotationCount: z.number().int().nonnegative()
})

export const corpusCatalogResponseSchema = corpusContextSchema.extend({
  source: corpusSourceProjectionSchema,
  coverage: corpusCoverageProjectionSchema,
  divisions: z.array(z.object({
    sid: sidSchema,
    division: corpusDivisionSchema,
    labelOriginal: z.string().min(1),
    labelNormalized: z.string().min(1),
    volumeCount: z.number().int().nonnegative(),
    volumes: z.array(volumeSummarySchema)
  }))
})

export const corpusUnitsResponseSchema = corpusContextSchema.extend({
  sourceItemSid: sidSchema,
  units: z.array(z.object({
    sid: sidSchema,
    parentUnitSid: sidSchema.nullable(),
    unitType: z.string().min(1),
    division: corpusDivisionSchema,
    juan: z.number().int().nullable(),
    labelOriginal: z.string().min(1),
    labelNormalized: z.string().min(1),
    sequenceIndex: z.number().int().nonnegative()
  }))
})

export const annotationProjectionSchema = z.object({
  sid: sidSchema,
  startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().positive(),
  offsetUnit: z.literal('unicode-code-point'),
  surfaceText: z.string().min(1),
  annotationType: annotationTypeSchema,
  targetEntitySid: sidSchema.nullable(),
  normalizedValue: z.string().nullable(),
  status: annotationStatusSchema,
  method: z.string().min(1)
})

export const locatorPassageProjectionSchema = z.object({
  locatorSid: sidSchema,
  locatorValue: z.string().min(1),
  quoteText: z.string().nullable(),
  mappingSequence: z.number().int().positive(),
  assertions: z.array(z.object({
    assertionSid: sidSchema,
    subjectSid: sidSchema,
    predicate: z.string().min(1),
    status: z.string().min(1),
    stance: z.string().min(1)
  }))
})

export const passageProjectionSchema = z.object({
  sid: sidSchema,
  unitSid: sidSchema,
  juan: z.number().int().min(1).max(496),
  division: corpusDivisionSchema,
  sequenceIndex: z.number().int().positive(),
  sourceText: z.string().min(1),
  normalizedText: z.string().nullable(),
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
  reviewStatus: passageReviewStatusSchema,
  annotations: z.array(annotationProjectionSchema),
  locators: z.array(locatorPassageProjectionSchema)
})

export const passageSourceProjectionSchema = z.object({
  sourceItemSid: sidSchema,
  pageTitle: z.string().min(1),
  pageId: z.number().int().positive(),
  revisionId: z.number().int().positive(),
  revisionTimestamp: z.string().datetime(),
  canonicalUrl: z.string().url(),
  historyUrl: z.string().url(),
  attributionUrl: z.string().url(),
  license: z.object({ spdxId: z.string(), name: z.string(), url: z.string().url() })
})

export const unitPassagesResponseSchema = corpusContextSchema.extend({
  unit: volumeSummarySchema,
  source: passageSourceProjectionSchema,
  pagination: z.object({ offset: z.number().int().nonnegative(), limit: z.number().int().positive(), total: z.number().int().nonnegative() }),
  passages: z.array(passageProjectionSchema)
})

export const passageDetailResponseSchema = corpusContextSchema.extend({
  passage: passageProjectionSchema,
  source: passageSourceProjectionSchema,
  stableCitation: z.string().min(1),
  previous: z.object({ sid: sidSchema, sequenceIndex: z.number().int().positive() }).nullable(),
  next: z.object({ sid: sidSchema, sequenceIndex: z.number().int().positive() }).nullable()
})

export const textSearchFiltersSchema = z.object({
  division: corpusDivisionSchema.nullable(),
  juan: z.number().int().min(1).max(496).nullable(),
  status: passageReviewStatusSchema.nullable()
})

export const textSearchOccurrenceSchema = z.object({
  occurrenceType: z.literal('occurrence'),
  passageSid: sidSchema,
  unitSid: sidSchema,
  juan: z.number().int().min(1).max(496),
  division: corpusDivisionSchema,
  sequenceIndex: z.number().int().positive(),
  context: z.string().min(1),
  matchStart: z.number().int().nonnegative(),
  matchEnd: z.number().int().positive(),
  reviewStatus: passageReviewStatusSchema,
  sourceRevisionId: z.number().int().positive()
})

export const researchExportMetadataSchema = z.object({
  queryId: z.string().min(1),
  queryVersion: z.string().min(1),
  datasetVersion: z.string().min(1),
  corpusVersion: z.string().min(1),
  snapshotSid: sidSchema,
  statisticalUnit: z.string().min(1),
  columns: z.array(z.string().min(1))
})

export const textSearchResponseSchema = corpusContextSchema.extend({
  query: z.string().min(1),
  occurrenceLabel: z.literal('文本命中'),
  filters: textSearchFiltersSchema,
  pagination: z.object({ offset: z.number().int().nonnegative(), limit: z.number().int().positive(), total: z.number().int().nonnegative() }),
  results: z.array(textSearchOccurrenceSchema),
  coverage: corpusCoverageProjectionSchema,
  exportMetadata: researchExportMetadataSchema
})

export const entityPassagesResponseSchema = corpusContextSchema.extend({
  entity: z.object({ sid: sidSchema, label: z.string().min(1), entityType: z.string().min(1) }),
  stringOccurrences: z.array(textSearchOccurrenceSchema),
  resolvedAnnotations: z.array(z.object({ annotation: annotationProjectionSchema, passageSid: sidSchema, juan: z.number().int() })),
  acceptedAssertions: z.array(z.object({
    assertionSid: sidSchema,
    subjectSid: sidSchema,
    predicate: z.string().min(1),
    locatorSid: sidSchema,
    passageSid: sidSchema,
    stance: z.string().min(1)
  }))
})

export const annalsResponseSchema = corpusContextSchema.extend({
  query: z.object({
    id: z.literal('shenzong-annals-v1'),
    version: z.literal('1.0.0'),
    title: z.string().min(1),
    scope: z.string().min(1),
    statisticalUnit: z.literal('source passage'),
    fromJuan: z.number().int().min(14).max(16),
    toJuan: z.number().int().min(14).max(16),
    annotationStatus: annotationStatusSchema.nullable()
  }),
  rows: z.array(z.object({
    passageSid: sidSchema,
    unitSid: sidSchema,
    juan: z.number().int().min(14).max(16),
    sequenceIndex: z.number().int().positive(),
    sourceText: z.string().min(1),
    normalizedText: z.string().nullable(),
    chronology: z.array(annotationProjectionSchema),
    candidateCounts: z.record(annotationTypeSchema, z.number().int().nonnegative()),
    sourceRevisionId: z.number().int().positive()
  })),
  exportMetadata: researchExportMetadataSchema
})

export const coverageResponseSchema = corpusContextSchema.extend({
  source: corpusSourceProjectionSchema,
  coverage: corpusCoverageProjectionSchema
})

export const corpusSearchShardSchema = corpusContextSchema.extend({
  fromJuan: z.number().int().min(1).max(496),
  toJuan: z.number().int().min(1).max(496),
  passages: z.array(z.object({
    passageSid: sidSchema,
    unitSid: sidSchema,
    juan: z.number().int().min(1).max(496),
    division: corpusDivisionSchema,
    sequenceIndex: z.number().int().positive(),
    sourceText: z.string().min(1),
    normalizedText: z.string().nullable(),
    reviewStatus: passageReviewStatusSchema,
    sourceRevisionId: z.number().int().positive()
  }))
})

export const corpusStaticIndexSchema = corpusContextSchema.extend({
  generatedFrom: z.literal('fixed-local-corpus-snapshot'),
  shards: z.array(z.object({
    file: z.string().regex(/^search\/\d{3}-\d{3}\.json$/),
    fromJuan: z.number().int().min(1).max(496),
    toJuan: z.number().int().min(1).max(496),
    passageCount: z.number().int().positive()
  }))
})

export type CorpusCatalogResponse = z.infer<typeof corpusCatalogResponseSchema>
export type AnnotationProjection = z.infer<typeof annotationProjectionSchema>
export type CorpusUnitsResponse = z.infer<typeof corpusUnitsResponseSchema>
export type UnitPassagesResponse = z.infer<typeof unitPassagesResponseSchema>
export type PassageDetailResponse = z.infer<typeof passageDetailResponseSchema>
export type TextSearchResponse = z.infer<typeof textSearchResponseSchema>
export type TextSearchOccurrence = z.infer<typeof textSearchOccurrenceSchema>
export type EntityPassagesResponse = z.infer<typeof entityPassagesResponseSchema>
export type AnnalsResponse = z.infer<typeof annalsResponseSchema>
export type CoverageResponse = z.infer<typeof coverageResponseSchema>
export type CorpusSearchShard = z.infer<typeof corpusSearchShardSchema>
export type CorpusStaticIndex = z.infer<typeof corpusStaticIndexSchema>
