import { useEffect, useMemo, useState } from 'react'
import { BookOpenText } from 'lucide-react'
import { fetchAssertionEvidence, fetchEvent, fetchResearchTimeline } from '../lib/researchApi'
import type { AssertionEvidenceResponse, EventResponse, ResearchTimelineItem, ResearchTimelineResponse } from '../lib/researchApi'
import type { EventKind } from '../types'
import { EvidenceDrawer } from './EvidenceDrawer'
import '../evidence.css'

const kindLabel: Record<EventKind | 'appointment', string> = {
  appointment: '除授 / 状态', politics: '政治', disaster: '灾害与治理', travel: '迁徙', literature: '文学', life: '生平'
}

const itemTypeLabel: Record<ResearchTimelineItem['itemType'], string> = {
  appointment: '任命动作',
  service: '实际任职',
  movement: '迁徙',
  political: '政治事件',
  disaster: '灾害事件',
  'disaster-response': '治理响应',
  residence: '居住状态'
}

function filterKind(itemType: ResearchTimelineItem['itemType']): EventKind | 'appointment' {
  if (itemType === 'movement') return 'travel'
  if (itemType === 'political') return 'politics'
  if (itemType === 'disaster' || itemType === 'disaster-response') return 'disaster'
  return 'appointment'
}

interface EventTimelineProps {
  selectedKinds?: Set<EventKind | 'appointment'>
  personId?: string
  compact?: boolean
}

export function EventTimeline({ selectedKinds, personId = 'su-shi', compact = false }: EventTimelineProps) {
  const [research, setResearch] = useState<ResearchTimelineResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)
  const [evidence, setEvidence] = useState<AssertionEvidenceResponse | null>(null)
  const [eventDetails, setEventDetails] = useState<EventResponse | null>(null)
  const [evidenceLoading, setEvidenceLoading] = useState(false)
  const [evidenceError, setEvidenceError] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (personId !== 'su-shi') {
      setApiError('该人物仍属于 prototype，尚未进入 v0.2 verified dataset。')
      setLoading(false)
      return
    }
    setLoading(true)
    fetchResearchTimeline('person:sushi')
      .then((result) => { setResearch(result); setApiError(null) })
      .catch((error: unknown) => setApiError(`无法读取正式数据：${error instanceof Error ? error.message : '未知错误'}。请运行 npm run dev:all。`))
      .finally(() => setLoading(false))
  }, [personId])

  async function openEvidence(item: ResearchTimelineItem) {
    setDrawerOpen(true)
    setEvidence(null)
    setEventDetails(null)
    setEvidenceError(null)
    setEvidenceLoading(true)
    try {
      const [evidenceResult, eventResult] = await Promise.all([
        fetchAssertionEvidence(item.evidenceSummary.assertionSid),
        item.id.startsWith('event:') ? fetchEvent(item.id).catch(() => null) : Promise.resolve(null)
      ])
      setEvidence(evidenceResult)
      setEventDetails(eventResult)
    } catch (error) {
      setEvidenceError(`无法读取证据：${error instanceof Error ? error.message : '未知错误'}。`)
    } finally {
      setEvidenceLoading(false)
    }
  }

  const visible = useMemo(() => {
    const items = (research?.items ?? []).filter((item) => !selectedKinds || selectedKinds.has(filterKind(item.itemType)))
    return compact ? items.slice(-7) : items
  }, [research, selectedKinds, compact])

  return (
    <div className="timeline-research-shell">
      <div className="timeline-main">
        {!compact && research && <div className="research-data-banner"><span>Verified dataset</span><strong>{research.datasetVersion}</strong><p>杭州—密州—徐州—湖州—黄州均来自 PostgreSQL 投影；任命、任职、迁徙、事件与居住状态分别显示。</p></div>}
        {loading && <div className="empty-state">正在加载苏轼正式仕宦数据……</div>}
        {apiError && <div className="research-data-banner fallback"><span>API error</span><p>{apiError}</p></div>}
        {!loading && !apiError && <div className="timeline">
          {visible.map((item) => {
            const kind = filterKind(item.itemType)
            return (
              <article className={`timeline-item evidence-backed item-${item.itemType}`} key={item.id}>
                <div className="timeline-year">{item.yearLabel}</div>
                <div className={`timeline-dot kind-${kind}`} />
                <div className="timeline-content">
                  <div className="timeline-meta">
                    <span className={`kind-pill kind-${kind}`}>{itemTypeLabel[item.itemType]}</span>
                    {item.place && <span>{item.place.name}</span>}
                    <span>精度：{item.precision}</span>
                    <span>性质：{item.uncertainty}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                  <button className="evidence-button" onClick={() => openEvidence(item)}><BookOpenText size={14} />查看证据（{item.evidenceSummary.evidenceCount}）</button>
                </div>
              </article>
            )
          })}
          {visible.length === 0 && <div className="empty-state">当前筛选条件下没有正式记录。</div>}
        </div>}
      </div>
      {drawerOpen && <EvidenceDrawer data={evidence} event={eventDetails} loading={evidenceLoading} error={evidenceError} onClose={() => setDrawerOpen(false)} />}
    </div>
  )
}
