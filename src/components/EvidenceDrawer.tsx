import { useState } from 'react'
import { ExternalLink, X } from 'lucide-react'
import { fetchSource } from '../lib/researchApi'
import type { AssertionEvidenceResponse, EventResponse, SourceResponse } from '../lib/researchApi'

interface EvidenceDrawerProps {
  data: AssertionEvidenceResponse | null
  event?: EventResponse | null
  loading: boolean
  error: string | null
  onClose: () => void
}

export function EvidenceDrawer({ data, event, loading, error, onClose }: EvidenceDrawerProps) {
  const [source, setSource] = useState<SourceResponse | null>(null)
  const [sourceError, setSourceError] = useState<string | null>(null)

  async function openSource(sourceSid: string) {
    setSource(null)
    setSourceError(null)
    try { setSource(await fetchSource(sourceSid)) }
    catch (caught) { setSourceError(caught instanceof Error ? caught.message : '无法读取来源详情') }
  }

  return (
    <aside className="evidence-drawer" aria-live="polite">
      <div className="evidence-drawer-header">
        <div><p className="eyebrow">Evidence chain</p><h2>史料、断言与事件结构</h2></div>
        <button onClick={onClose} aria-label="关闭证据面板"><X size={18} /></button>
      </div>
      {loading && <p className="evidence-state">正在读取证据链……</p>}
      {error && <p className="evidence-state error">{error}</p>}
      {data && (
        <>
          <section className="assertion-summary">
            <div><span>断言</span><code>{data.assertion.sid}</code></div>
            <div><span>状态</span><strong>{data.assertion.status}</strong></div>
            <div><span>置信度</span><strong>{Math.round(data.assertion.confidence * 100)}%</strong></div>
            <p>{data.assertion.rationale}</p>
            {data.assertion.date && <dl>
              <div><dt>原始日期</dt><dd>{data.assertion.date.original}</dd></div>
              <div><dt>精度 / 性质</dt><dd>{data.assertion.date.precision} / {data.assertion.date.uncertainty}</dd></div>
              <div><dt>归一范围</dt><dd>{data.assertion.date.normalizedStart ?? '未知'} — {data.assertion.date.normalizedEnd ?? '未知'}</dd></div>
              <div><dt>换算方法</dt><dd>{data.assertion.date.conversionMethod}</dd></div>
            </dl>}
          </section>

          {event && <section className="assertion-summary">
            <p className="eyebrow">Event bundle</p>
            <h3>{event.event.label}</h3>
            <p>{event.event.description}</p>
            {event.appointment && <div><strong>任命动作：</strong>{event.appointment.rawExpression}<p>{event.appointment.note}</p>{event.appointment.components.map((component) => <p key={`${component.officeSid}-${component.componentType}`}>{component.componentType}：{component.rawExpression}（{component.officeCategory}）</p>)}</div>}
            {event.participants.length > 0 && <p><strong>参与者：</strong>{event.participants.map((item) => `${item.label}（${item.role}）`).join('、')}</p>}
            {event.children.length > 0 && <div><strong>子事件：</strong>{event.children.map((item) => <p key={item.sid}>{item.label} · {item.eventType}</p>)}</div>}
            {event.relations.length > 0 && <div><strong>事件关系：</strong>{event.relations.map((item) => <p key={`${item.direction}-${item.relationType}-${item.event.sid}`}>{item.relationType} → {item.event.label}：{item.note}</p>)}</div>}
          </section>}

          <div className="evidence-list">
            {data.evidence.map((item) => (
              <article key={`${item.locator.sid}-${item.stance}`}>
                <div className="evidence-title"><span>{item.stance}</span><strong>{item.source.title}</strong></div>
                <p className="source-citation">{item.source.citation}</p>
                <dl><div><dt>定位</dt><dd>{item.locator.value}</dd></div><div><dt>载体</dt><dd>{item.source.item}</dd></div></dl>
                {item.locator.quote && <blockquote>{item.locator.quote}</blockquote>}
                <p>{item.note}</p>
                <div className="hero-actions">
                  <button className="text-button" onClick={() => openSource(item.source.sid)}>来源详情</button>
                  {item.source.url && <a href={item.source.url} target="_blank" rel="noreferrer">查看原始文本 <ExternalLink size={13} /></a>}
                </div>
              </article>
            ))}
          </div>

          {sourceError && <p className="evidence-state error">{sourceError}</p>}
          {source && <section className="assertion-summary">
            <p className="eyebrow">Source detail</p>
            <h3>{source.source.title}</h3>
            <p>{source.source.creator} · {source.source.workType}</p>
            <p>本来源包含 {source.items.reduce((sum, item) => sum + item.locators.length, 0)} 个定位，支持或限定 {source.assertions.length} 条断言链接。</p>
            {source.items.map((item) => <div key={item.sid}><strong>{item.label}</strong><p>{item.citation}</p></div>)}
          </section>}
          <p className="dataset-version">数据版本：{data.datasetVersion}</p>
        </>
      )}
    </aside>
  )
}
