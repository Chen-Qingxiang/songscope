import { ExternalLink, X } from 'lucide-react'
import type { AssertionEvidenceResponse } from '../lib/researchApi'

interface EvidenceDrawerProps {
  data: AssertionEvidenceResponse | null
  loading: boolean
  error: string | null
  onClose: () => void
}

export function EvidenceDrawer({ data, loading, error, onClose }: EvidenceDrawerProps) {
  return (
    <aside className="evidence-drawer" aria-live="polite">
      <div className="evidence-drawer-header">
        <div><p className="eyebrow">Evidence chain</p><h2>史料与断言</h2></div>
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
          </section>
          <div className="evidence-list">
            {data.evidence.map((item) => (
              <article key={`${item.locator.sid}-${item.stance}`}>
                <div className="evidence-title"><span>{item.stance}</span><strong>{item.source.title}</strong></div>
                <p className="source-citation">{item.source.citation}</p>
                <dl><div><dt>定位</dt><dd>{item.locator.value}</dd></div><div><dt>载体</dt><dd>{item.source.item}</dd></div></dl>
                {item.locator.quote && <blockquote>{item.locator.quote}</blockquote>}
                <p>{item.note}</p>
                {item.source.url && <a href={item.source.url} target="_blank" rel="noreferrer">查看原始文本 <ExternalLink size={13} /></a>}
              </article>
            ))}
          </div>
          <p className="dataset-version">数据版本：{data.datasetVersion}</p>
        </>
      )}
    </aside>
  )
}
