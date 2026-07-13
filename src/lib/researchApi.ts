export interface EvidenceSummary {
  assertionSid: string
  accepted: boolean
  evidenceCount: number
  sourceTitles: string[]
  locatorLabels: string[]
}

export interface ResearchTimelineItem {
  id: string
  itemType: 'appointment' | 'service'
  year: number
  yearLabel: string
  precision: string
  uncertainty: string
  title: string
  summary: string
  place: { sid: string; name: string; resolutionStatus: string } | null
  evidenceSummary: EvidenceSummary
}

export interface ResearchTimelineResponse {
  datasetVersion: string
  person: { sid: string; name: string }
  items: ResearchTimelineItem[]
}

export interface AssertionEvidenceResponse {
  datasetVersion: string
  assertion: {
    sid: string
    subjectSid: string
    predicate: string
    status: string
    confidence: number
    rationale: string
  }
  evidence: Array<{
    stance: string
    note: string
    locator: { sid: string; type: string; value: string; quote: string | null }
    source: { title: string; item: string; citation: string; url: string | null }
  }>
}

const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api'

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBase}${path}`)
  if (!response.ok) throw new Error(`SongScope API returned ${response.status}`)
  return response.json() as Promise<T>
}

export function fetchResearchTimeline(personSid = 'person:sushi') {
  return getJson<ResearchTimelineResponse>(`/people/${encodeURIComponent(personSid)}/timeline`)
}

export function fetchAssertionEvidence(assertionSid: string) {
  return getJson<AssertionEvidenceResponse>(`/assertions/${encodeURIComponent(assertionSid)}/evidence`)
}
