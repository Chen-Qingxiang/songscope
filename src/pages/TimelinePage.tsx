import { useEffect, useState } from 'react'
import { EventTimeline } from '../components/EventTimeline'
import { fetchPerson, type PersonResponse } from '../lib/researchApi'
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
  const [person, setPerson] = useState<PersonResponse | null>(null)
  const [personError, setPersonError] = useState<string | null>(null)

  useEffect(() => {
    fetchPerson().then(setPerson).catch((error: unknown) => setPersonError(error instanceof Error ? error.message : '无法读取人物'))
  }, [])
  function toggle(value: EventKind | 'appointment') {
    const next = new Set(selectedKinds)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    setSelectedKinds(next)
  }

  return (
    <div className="page-stack">
      <header className="page-heading"><div><p className="eyebrow">Verified biography</p><h1>{person?.name ?? '苏轼'}仕宦研究页</h1><p>{person?.summary ?? (personError ? `人物 API 错误：${personError}` : '正在读取人物概要……')}</p></div><div className="person-chip"><span>当前人物</span><strong>{person ? `${person.name} · ${person.birthYear}–${person.deathYear}` : 'person:sushi'}</strong><small>{person?.datasetVersion}</small></div></header>
      <section className="filter-bar">
        {filters.map((filter) => <button key={filter.value} className={selectedKinds.has(filter.value) ? 'active' : ''} onClick={() => toggle(filter.value)}><span className={`filter-dot kind-${filter.value}`} />{filter.label}</button>)}
      </section>
      <section className="panel"><EventTimeline selectedKinds={selectedKinds} /></section>
    </div>
  )
}
