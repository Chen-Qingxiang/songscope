export type Certainty = 'high' | 'medium' | 'low'

export interface NameVariant {
  text: string
  kind: 'primary' | 'courtesy' | 'art-name' | 'posthumous' | 'variant'
}

export interface Person {
  id: string
  names: NameVariant[]
  birthYear: number
  deathYear: number
  nativePlaceId?: string
  roles: string[]
  summary: string
  sourceIds: string[]
}

export interface Place {
  id: string
  name: string
  historicalName: string
  modernName: string
  latitude: number
  longitude: number
  level: 'capital' | 'prefecture' | 'county' | 'region'
  summary: string
  sourceIds: string[]
}

export type EventKind = 'appointment' | 'politics' | 'disaster' | 'travel' | 'literature' | 'life'

export interface HistoricalEvent {
  id: string
  title: string
  year: number
  endYear?: number
  kind: EventKind
  personIds: string[]
  placeId?: string
  summary: string
  certainty: Certainty
  sourceIds: string[]
}

export interface Appointment {
  id: string
  personId: string
  startYear: number
  endYear?: number
  office: string
  duty: string
  placeId?: string
  action: '除' | '授' | '迁' | '徙' | '召' | '贬' | '罢' | '复'
  summary: string
  certainty: Certainty
  sourceIds: string[]
}

export type RelationKind = 'kinship' | 'mentor' | 'friendship' | 'literary' | 'colleague' | 'political'

export interface Relation {
  id: string
  sourcePersonId: string
  targetPersonId: string
  kind: RelationKind
  label: string
  startYear?: number
  endYear?: number
  summary: string
  certainty: Certainty
  sourceIds: string[]
}

export interface Work {
  id: string
  title: string
  authorId: string
  year: number
  genre: '诗' | '词' | '文' | '书信' | '奏议'
  placeId?: string
  excerpt?: string
  themes: string[]
  sourceIds: string[]
}

export interface Source {
  id: string
  title: string
  type: 'primary' | 'database' | 'gazetteer' | 'reference'
  url?: string
  citation: string
  note: string
}
