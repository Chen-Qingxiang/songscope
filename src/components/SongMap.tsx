import { useEffect, useMemo, useState } from 'react'
import { BookOpenText } from 'lucide-react'
import { fetchAssertionEvidence, fetchEvent, fetchResearchTimeline } from '../lib/researchApi'
import type { AssertionEvidenceResponse, EventResponse, ResearchTimelineItem, ResearchTimelineResponse } from '../lib/researchApi'
import { EvidenceDrawer } from './EvidenceDrawer'

interface SongMapProps { compact?: boolean }

const width = 760
const height = 430
const padding = 42

function project(longitude: number, latitude: number) {
  const minLon = 110
  const maxLon = 122
  const minLat = 28
  const maxLat = 38
  return {
    x: padding + ((longitude - minLon) / (maxLon - minLon)) * (width - padding * 2),
    y: height - padding - ((latitude - minLat) / (maxLat - minLat)) * (height - padding * 2)
  }
}

export function SongMap({ compact = false }: SongMapProps) {
  const [career, setCareer] = useState<ResearchTimelineResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState('place:huangzhou')
  const [evidence, setEvidence] = useState<AssertionEvidenceResponse | null>(null)
  const [event, setEvent] = useState<EventResponse | null>(null)
  const [evidenceError, setEvidenceError] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    fetchResearchTimeline().then(setCareer).catch((caught: unknown) => setError(`无法读取正式地图数据：${caught instanceof Error ? caught.message : '未知错误'}。请运行 npm run dev:all。`))
  }, [])

  const routeItems = useMemo(() => {
    const result: ResearchTimelineItem[] = []
    const seen = new Set<string>()
    for (const item of career?.items ?? []) {
      if (!item.place || item.place.longitude === null || item.place.latitude === null) continue
      if (!['appointment', 'movement', 'residence'].includes(item.itemType) || seen.has(item.place.sid)) continue
      seen.add(item.place.sid)
      result.push(item)
    }
    return result
  }, [career])

  const places = useMemo(() => {
    const bySid = new Map<string, { item: ResearchTimelineItem; count: number }>()
    for (const item of career?.items ?? []) {
      if (!item.place || item.place.longitude === null || item.place.latitude === null) continue
      const current = bySid.get(item.place.sid)
      bySid.set(item.place.sid, { item: current?.item ?? item, count: (current?.count ?? 0) + 1 })
    }
    return [...bySid.values()]
  }, [career])

  const selected = places.find(({ item }) => item.place?.sid === selectedId)

  async function openEvidence(item: ResearchTimelineItem) {
    setDrawerOpen(true)
    setEvidence(null)
    setEvent(null)
    setEvidenceError(null)
    try {
      const [evidenceResult, eventResult] = await Promise.all([
        fetchAssertionEvidence(item.evidenceSummary.assertionSid),
        item.id.startsWith('event:') ? fetchEvent(item.id).catch(() => null) : Promise.resolve(null)
      ])
      setEvidence(evidenceResult)
      setEvent(eventResult)
    } catch (caught) {
      setEvidenceError(caught instanceof Error ? caught.message : '无法读取证据')
    }
  }

  if (error) return <div className="research-data-banner fallback"><span>API error</span><p>{error}</p></div>
  if (!career) return <div className="empty-state">正在加载正式地点投影……</div>

  return (
    <div className={`map-shell ${compact ? 'compact' : ''}`}>
      <svg className="song-map" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="苏轼杭州至黄州的证据化地点轨迹示意图">
        <defs>
          <pattern id="grid" width="38" height="38" patternUnits="userSpaceOnUse"><path d="M 38 0 L 0 0 0 38" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.12" /></pattern>
          <filter id="glow"><feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <rect width={width} height={height} rx="22" fill="url(#grid)" />
        {routeItems.map((item, index) => {
          if (index === 0 || !item.place || !routeItems[index - 1].place) return null
          const previous = routeItems[index - 1].place!
          const from = project(previous.longitude!, previous.latitude!)
          const to = project(item.place.longitude!, item.place.latitude!)
          return <path key={`${previous.sid}-${item.place.sid}`} className="route-line" d={`M${from.x} ${from.y} Q${(from.x + to.x) / 2} ${Math.min(from.y, to.y) - 24} ${to.x} ${to.y}`} />
        })}
        {places.map(({ item, count }) => {
          const place = item.place!
          const point = project(place.longitude!, place.latitude!)
          const active = place.sid === selectedId
          return <g key={place.sid} className={`map-point ${active ? 'active' : ''}`} onClick={() => setSelectedId(place.sid)} tabIndex={0} role="button" aria-label={`查看${place.name}`} onKeyDown={(keyboard) => keyboard.key === 'Enter' && setSelectedId(place.sid)}>
            {active && <circle cx={point.x} cy={point.y} r={15 + count} className="point-pulse" filter="url(#glow)" />}
            <circle cx={point.x} cy={point.y} r={5 + Math.min(count, 6)} className="point-core" />
            <text x={point.x + 10} y={point.y - 9}>{place.name}</text>
          </g>
        })}
      </svg>
      {!compact && selected?.item.place && <aside className="map-detail">
        <p className="eyebrow">Verified place projection</p>
        <h3>{selected.item.place.name}</h3>
        <p>{selected.item.place.note}</p>
        <dl>
          <div><dt>解析状态</dt><dd>{selected.item.place.resolutionStatus}</dd></div>
          <div><dt>关联正式记录</dt><dd>{selected.count} 条</dd></div>
          <div><dt>路线说明</dt><dd>地点先后示意线，不代表真实道路</dd></div>
        </dl>
        <button className="evidence-button" onClick={() => openEvidence(selected.item)}><BookOpenText size={14} />查看该地点记录证据</button>
      </aside>}
      {drawerOpen && <EvidenceDrawer data={evidence} event={event} loading={!evidence && !evidenceError} error={evidenceError} onClose={() => setDrawerOpen(false)} />}
    </div>
  )
}
