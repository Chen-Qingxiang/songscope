import { NetworkGraph } from '../components/NetworkGraph'

export function NetworkPage() {
  return (
    <div className="page-stack">
      <header className="page-heading"><div><p className="eyebrow">Prosopography</p><h1>人物关系网络</h1><p>关系不是一根笼统的“认识”连线：亲属、识拔、唱和、同僚与政治分歧分别建模，并附时间与证据。</p></div></header>
      <section className="panel"><NetworkGraph /></section>
      <div className="legend-row"><span className="legend kinship">亲属</span><span className="legend mentor">识拔</span><span className="legend literary">文学</span><span className="legend political">政治</span><span className="legend colleague">同僚</span></div>
    </div>
  )
}
