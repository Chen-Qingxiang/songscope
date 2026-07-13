import { useEffect, useMemo, useState } from 'react'
import { BookOpenText } from 'lucide-react'
import { appointments, events } from '../data/songData'
import { personById, placeById, primaryName } from '../lib/data'
import { fetchAssertionEvidence, fetchResearchTimeline } from '../lib/researchApi'
import type { AssertionEvidenceResponse, ResearchTimelineResponse } from '../lib/researchApi'
import type { EventKind } from '../types'
import { EvidenceDrawer } from './EvidenceDrawer'
import '../evidence.css'

const kindLabel: Record<EventKind | 'appointment', string> = {
  appointment: '除授', politics: '政治', disaster: '灾害', travel: '迁徙', literature: '文学', life: '生平'
}

interface EventTimelineProps {
  selectedKinds?: Set<EventKind | 'appointment'>
  personId?: string
  compact?: boolean
}

interface TimelineItem {
  id: string
  year: number
  yearLabel?: string
  kind: EventKind | 'appointment'
  title: string
  summary: string
  placeId?: string
  placeName?: string
  people: string[]
  precision?: string
  uncertainty?: string
  assertionSid?: string
  evidenceCount?: number
  itemType?: 'appointment' | 'service'
}

export function EventTimeline({ selectedKinds, personId = 'su-shi', compact = false }: EventTimelineProps) {
  const [research, setResearch] = useState<ResearchTimelineResponse | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [evidence, setEvidence] = useState<AssertionEvidenceResponse | null>(null)
  const [evidenceLoading, setEvidenceLoading] = useState(false)
  const [evidenceError, setEvidenceError] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (personId !== 'su-shi') return
    fetchResearchTimeline('person:sushi')
      .then((result) => { setResearch(result); setApiError(null) })
      .catch(() => setApiError('研究 API 未连接，当前仍显示原型数据。运行数据库与 API 后可查看完整证据链。'))
  }, [personId])

  async function openEvidence(assertionSid: string) {
    setDrawerOpen(true)
    setEvidence(null)
    setEvidenceError(null)
    setEvidenceLoading(true)
    try { setEvidence(await fetchAssertionEvidence(assertionSid)) }
    catch { setEvidenceError('无法读取证据；请确认 SongScope API 正在运行。') }
    finally { setEvidenceLoading(false) }
  }

  const merged = useMemo<TimelineItem[]>(() => {
    const demoAppointments = appointments
      .filter((appointment) => appointment.personId === personId)
      .filter((appointment) => !(research && appointment.id === 'appt-1074-mizhou'))
      .map((appointment) => ({
        id: appointment.id, year: appointment.startYear, kind: 'appointment' as const,
        title: `${appointment.action}：${appointment.duty}`, summary: appointment.summary,
        placeId: appointment.placeId, people: [appointment.personId]
      }))

    const researchItems: TimelineItem[] = (research?.items ?? []).map((item) => ({
      id: item.id, year: item.year, yearLabel: item.yearLabel, kind: 'appointment',
      title: item.title, summary: item.summary, placeName: item.place?.name,
      people: [personId], precision: item.precision, uncertainty: item.uncertainty,
      assertionSid: item.evidenceSummary.assertionSid,
      evidenceCount: item.evidenceSummary.evidenceCount, itemType: item.itemType
    }))

    return [
      ...events.filter((event) => event.personIds.includes(personId)).map((event) => ({
        id: event.id, year: event.year, kind: event.kind as EventKind | 'appointment',
        title: event.title, summary: event.summary, placeId: event.placeId, people: event.personIds
      })),
      ...demoAppointments,
      ...researchItems
    ].filter((item) => !selectedKinds || selectedKinds.has(item.kind)).sort((a, b) => a.year - b.year || a.id.localeCompare(b.id))
  }, [personId, research, selectedKinds])

  const visible = compact ? merged.slice(-7) : merged

  return (
    <div className="timeline-research-shell">
      <div className="timeline-main">
        {!compact && research && <div className="research-data-banner"><span>真实种子集</span><strong>{research.datasetVersion}</strong><p>密州除授记录来自数据库投影；任命动作与实际任职阶段分开显示。</p></div>}
        {!compact && apiError && <div className="research-data-banner fallback"><span>Fallback</span><p>{apiError}</p></div>}
        <div className="timeline">
          {visible.map((item) => (
            <article className={`timeline-item ${item.assertionSid ? 'evidence-backed' : ''}`} key={item.id}>
              <div className="timeline-year">{item.yearLabel ?? item.year}</div>
              <div className={`timeline-dot kind-${item.kind}`} />
              <div className="timeline-content">
                <div className="timeline-meta">
                  <span className={`kind-pill kind-${item.kind}`}>{item.itemType === 'service' ? '任职阶段' : kindLabel[item.kind]}</span>
                  {(item.placeName || item.placeId) && <span>{item.placeName ?? placeById.get(item.placeId!)?.name}</span>}
                  {item.precision && <span>精度：{item.precision}</span>}
                  {item.uncertainty && <span>性质：{item.uncertainty}</span>}
                </div>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                {item.assertionSid && !compact && <button className="evidence-button" onClick={() => openEvidence(item.assertionSid!)}><BookOpenText size={14} />查看证据（{item.evidenceCount}）</button>}
                {!compact && item.people.length > 1 && <div className="people-row">涉及：{item.people.map(primaryName).join('、')}</div>}
              </div>
            </article>
          ))}
          {visible.length === 0 && <div className="empty-state">当前筛选条件下没有事件。</div>}
          <span className="sr-only">当前人物：{personById.get(personId)?.names[0].text}</span>
        </div>
      </div>
      {drawerOpen && <EvidenceDrawer data={evidence} loading={evidenceLoading} error={evidenceError} onClose={() => setDrawerOpen(false)} />}
    </div>
  )
}
