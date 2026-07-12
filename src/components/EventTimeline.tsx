import { appointments, events } from '../data/songData'
import { personById, placeById, primaryName } from '../lib/data'
import type { EventKind } from '../types'

const kindLabel: Record<EventKind | 'appointment', string> = {
  appointment: '除授',
  politics: '政治',
  disaster: '灾害',
  travel: '迁徙',
  literature: '文学',
  life: '生平'
}

interface EventTimelineProps {
  selectedKinds?: Set<EventKind | 'appointment'>
  personId?: string
  compact?: boolean
}

export function EventTimeline({ selectedKinds, personId = 'su-shi', compact = false }: EventTimelineProps) {
  const merged = [
    ...events
      .filter((event) => event.personIds.includes(personId))
      .map((event) => ({
        id: event.id,
        year: event.year,
        kind: event.kind as EventKind | 'appointment',
        title: event.title,
        summary: event.summary,
        placeId: event.placeId,
        people: event.personIds
      })),
    ...appointments
      .filter((appointment) => appointment.personId === personId)
      .map((appointment) => ({
        id: appointment.id,
        year: appointment.startYear,
        kind: 'appointment' as const,
        title: `${appointment.action}：${appointment.duty}`,
        summary: appointment.summary,
        placeId: appointment.placeId,
        people: [appointment.personId]
      }))
  ]
    .filter((item) => !selectedKinds || selectedKinds.has(item.kind))
    .sort((a, b) => a.year - b.year)

  const visible = compact ? merged.slice(-7) : merged

  return (
    <div className="timeline">
      {visible.map((item) => (
        <article className="timeline-item" key={item.id}>
          <div className="timeline-year">{item.year}</div>
          <div className={`timeline-dot kind-${item.kind}`} />
          <div className="timeline-content">
            <div className="timeline-meta">
              <span className={`kind-pill kind-${item.kind}`}>{kindLabel[item.kind]}</span>
              {item.placeId && <span>{placeById.get(item.placeId)?.name}</span>}
            </div>
            <h3>{item.title}</h3>
            <p>{item.summary}</p>
            {!compact && item.people.length > 1 && (
              <div className="people-row">涉及：{item.people.map(primaryName).join('、')}</div>
            )}
          </div>
        </article>
      ))}
      {visible.length === 0 && <div className="empty-state">当前筛选条件下没有事件。</div>}
      <span className="sr-only">当前人物：{personById.get(personId)?.names[0].text}</span>
    </div>
  )
}
