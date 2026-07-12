import { useState } from 'react'
import { people, relations } from '../data/songData'
import { primaryName } from '../lib/data'

const positions: Record<string, { x: number; y: number }> = {
  'su-shi': { x: 360, y: 225 },
  'su-zhe': { x: 185, y: 112 },
  'su-xun': { x: 105, y: 250 },
  'ouyang-xiu': { x: 245, y: 355 },
  'wang-anshi': { x: 520, y: 92 },
  'sima-guang': { x: 625, y: 210 },
  'huang-tingjian': { x: 525, y: 360 },
  'qin-guan': { x: 380, y: 402 },
  'zhang-dun': { x: 700, y: 345 },
  'shen-kuo': { x: 690, y: 88 }
}

const relationClass: Record<string, string> = {
  kinship: 'kinship', mentor: 'mentor', friendship: 'friendship', literary: 'literary', colleague: 'colleague', political: 'political'
}

export function NetworkGraph() {
  const [selectedId, setSelectedId] = useState('su-shi')
  const selected = people.find((person) => person.id === selectedId)
  const connected = new Set(relations.filter((relation) => relation.sourcePersonId === selectedId || relation.targetPersonId === selectedId).flatMap((relation) => [relation.sourcePersonId, relation.targetPersonId]))

  return (
    <div className="network-layout">
      <svg className="network-graph" viewBox="0 0 800 470" role="img" aria-label="苏轼人物关系示意网络">
        {relations.map((relation) => {
          const from = positions[relation.sourcePersonId]
          const to = positions[relation.targetPersonId]
          const highlighted = relation.sourcePersonId === selectedId || relation.targetPersonId === selectedId
          return <line key={relation.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} className={`network-edge ${relationClass[relation.kind]} ${highlighted ? 'highlighted' : ''}`} />
        })}
        {people.map((person) => {
          const point = positions[person.id]
          const active = person.id === selectedId
          const muted = selectedId !== 'su-shi' && !connected.has(person.id)
          return (
            <g key={person.id} className={`network-node ${active ? 'active' : ''} ${muted ? 'muted' : ''}`} onClick={() => setSelectedId(person.id)} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && setSelectedId(person.id)}>
              <circle cx={point.x} cy={point.y} r={person.id === 'su-shi' ? 30 : 23} />
              <text x={point.x} y={point.y + 4}>{primaryName(person.id)}</text>
            </g>
          )
        })}
      </svg>
      {selected && (
        <aside className="network-detail">
          <p className="eyebrow">人物节点</p>
          <h3>{primaryName(selected.id)}</h3>
          <p>{selected.summary}</p>
          <div className="tag-row">{selected.roles.map((role) => <span key={role}>{role}</span>)}</div>
          <div className="relationship-list">
            {relations.filter((relation) => relation.sourcePersonId === selected.id || relation.targetPersonId === selected.id).map((relation) => {
              const otherId = relation.sourcePersonId === selected.id ? relation.targetPersonId : relation.sourcePersonId
              return <div key={relation.id}><strong>{primaryName(otherId)}</strong><span>{relation.label}</span></div>
            })}
          </div>
        </aside>
      )}
    </div>
  )
}
