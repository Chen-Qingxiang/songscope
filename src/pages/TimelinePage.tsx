import { useState } from 'react'
import { EventTimeline } from '../components/EventTimeline'
import type { EventKind } from '../types'

const filters: Array<{ value: EventKind | 'appointment'; label: string }> = [
  { value: 'appointment', label: '除授' },
  { value: 'politics', label: '政治' },
  { value: 'disaster', label: '灾害' },
  { value: 'travel', label: '迁徙' },
  { value: 'literature', label: '文学' },
  { value: 'life', label: '生平' }
]

export function TimelinePage() {
  const [selectedKinds, setSelectedKinds] = useState(new Set(filters.map((filter) => filter.value)))
  function toggle(value: EventKind | 'appointment') {
    const next = new Set(selectedKinds)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    setSelectedKinds(next)
  }

  return (
    <div className="page-stack">
      <header className="page-heading"><div><p className="eyebrow">Chronology</p><h1>人物生涯时间轴</h1><p>把除授、迁徙、政治事件、灾害与作品放在同一条可筛选的时间线上。</p></div><div className="person-chip"><span>当前人物</span><strong>苏轼 · 1037–1101</strong></div></header>
      <section className="filter-bar">
        {filters.map((filter) => <button key={filter.value} className={selectedKinds.has(filter.value) ? 'active' : ''} onClick={() => toggle(filter.value)}><span className={`filter-dot kind-${filter.value}`} />{filter.label}</button>)}
      </section>
      <section className="panel"><EventTimeline selectedKinds={selectedKinds} /></section>
    </div>
  )
}
