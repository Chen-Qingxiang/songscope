import { NetworkGraph } from '../components/NetworkGraph'

export function NetworkPage() {
  return (
    <div className="page-stack">
      <header className="page-heading"><div><p className="eyebrow">Prototype · 尚未迁移</p><h1>人物关系网络原型</h1><p>本视图仍使用明确标注的 prototype 数据，不属于 v0.2 verified dataset；不得作为正式研究结论引用。</p></div></header>
      <section className="panel"><NetworkGraph /></section>
      <div className="legend-row"><span className="legend kinship">亲属</span><span className="legend mentor">识拔</span><span className="legend literary">文学</span><span className="legend political">政治</span><span className="legend colleague">同僚</span></div>
    </div>
  )
}
