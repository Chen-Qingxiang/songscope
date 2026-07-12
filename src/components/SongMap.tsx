import { useMemo, useState } from 'react'
import { appointments, events, places } from '../data/songData'
import { placeById } from '../lib/data'

interface SongMapProps {
  compact?: boolean
}

const width = 760
const height = 430
const padding = 42

function project(longitude: number, latitude: number) {
  const minLon = 101
  const maxLon = 122
  const minLat = 18
  const maxLat = 39
  return {
    x: padding + ((longitude - minLon) / (maxLon - minLon)) * (width - padding * 2),
    y: height - padding - ((latitude - minLat) / (maxLat - minLat)) * (height - padding * 2)
  }
}

export function SongMap({ compact = false }: SongMapProps) {
  const eventCount = useMemo(() => {
    const counts = new Map<string, number>()
    events.forEach((event) => event.placeId && counts.set(event.placeId, (counts.get(event.placeId) ?? 0) + 1))
    appointments.forEach((item) => item.placeId && counts.set(item.placeId, (counts.get(item.placeId) ?? 0) + 1))
    return counts
  }, [])
  const [selectedId, setSelectedId] = useState('huangzhou')
  const selected = placeById.get(selectedId)

  return (
    <div className={`map-shell ${compact ? 'compact' : ''}`}>
      <svg className="song-map" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="苏轼主要活动地点示意图">
        <defs>
          <pattern id="grid" width="38" height="38" patternUnits="userSpaceOnUse">
            <path d="M 38 0 L 0 0 0 38" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.12" />
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <rect width={width} height={height} rx="22" fill="url(#grid)" />
        <path className="map-river" d="M110 145 C230 165, 270 115, 385 150 S590 165, 680 115" />
        <path className="map-river minor" d="M340 75 C360 160, 335 230, 390 350" />
        {appointments
          .filter((appointment) => appointment.placeId)
          .sort((a, b) => a.startYear - b.startYear)
          .map((appointment, index, list) => {
            if (index === 0) return null
            const previous = placeById.get(list[index - 1].placeId!)
            const current = placeById.get(appointment.placeId!)
            if (!previous || !current) return null
            const from = project(previous.longitude, previous.latitude)
            const to = project(current.longitude, current.latitude)
            return <path key={`${previous.id}-${current.id}-${index}`} className="route-line" d={`M${from.x} ${from.y} Q${(from.x + to.x) / 2} ${Math.min(from.y, to.y) - 24} ${to.x} ${to.y}`} />
          })}
        {places.map((place) => {
          const point = project(place.longitude, place.latitude)
          const count = eventCount.get(place.id) ?? 0
          const active = place.id === selectedId
          return (
            <g key={place.id} className={`map-point ${active ? 'active' : ''}`} onClick={() => setSelectedId(place.id)} tabIndex={0} role="button" aria-label={`查看${place.name}`} onKeyDown={(event) => event.key === 'Enter' && setSelectedId(place.id)}>
              {active && <circle cx={point.x} cy={point.y} r={15 + count} className="point-pulse" filter="url(#glow)" />}
              <circle cx={point.x} cy={point.y} r={5 + Math.min(count, 6)} className="point-core" />
              <text x={point.x + 10} y={point.y - 9}>{place.name}</text>
            </g>
          )
        })}
      </svg>
      {!compact && selected && (
        <aside className="map-detail">
          <p className="eyebrow">历史地点</p>
          <h3>{selected.historicalName}</h3>
          <p>{selected.summary}</p>
          <dl>
            <div><dt>现代对应</dt><dd>{selected.modernName}</dd></div>
            <div><dt>关联记录</dt><dd>{eventCount.get(selected.id) ?? 0} 条</dd></div>
            <div><dt>坐标说明</dt><dd>现代城市近似点</dd></div>
          </dl>
        </aside>
      )}
    </div>
  )
}
