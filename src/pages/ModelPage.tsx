import { sources } from '../data/songData'

const entities = [
  { name: 'Person', zh: '人物', fields: '姓名异体 · 生卒 · 籍贯 · 身份' },
  { name: 'Place', zh: '地点', fields: '原文地名 · 行政沿革 · 坐标 · 可信度' },
  { name: 'Event', zh: '事件', fields: '时间 · 类型 · 地点 · 参与者 · 因果线索' },
  { name: 'Appointment', zh: '除授', fields: '官 · 职 · 差遣 · 动作 · 任所 · 起止' },
  { name: 'Relation', zh: '关系', fields: '双方 · 类型 · 时间 · 方向 · 证据' },
  { name: 'Work', zh: '作品', fields: '作者 · 年代 · 地点 · 文体 · 主题 · 唱和' },
  { name: 'Source', zh: '来源', fields: '书目 · 卷次 · 原文位置 · 版本 · 备注' }
]

export function ModelPage() {
  return (
    <div className="page-stack">
      <header className="page-heading"><div><p className="eyebrow">Data architecture</p><h1>一套可以扩展到整个宋史的数据骨架</h1><p>界面只是研究视图；真正长期有价值的是可追溯、可修订、能表达不确定性的事实层。</p></div></header>
      <section className="entity-grid">
        {entities.map((entity, index) => <article className="entity-card" key={entity.name}><span>{String(index + 1).padStart(2, '0')}</span><p className="eyebrow">{entity.name}</p><h2>{entity.zh}</h2><p>{entity.fields}</p></article>)}
      </section>
      <section className="panel provenance-panel">
        <header className="panel-header"><div><p className="eyebrow">Prototype source catalogue</p><h2>旧版来源目录示意</h2></div><span className="panel-note">正式来源请从时间轴证据抽屉查看</span></header>
        <div className="source-list">
          {sources.map((source) => <article key={source.id}><div><span className={`source-type ${source.type}`}>{source.type}</span><h3>{source.title}</h3></div><p>{source.note}</p>{source.url && <a href={source.url} target="_blank" rel="noreferrer">打开来源 ↗</a>}</article>)}
        </div>
      </section>
      <section className="principles-grid">
        <article><strong>原始事实与解释分离</strong><p>史料所载、标准化结果和研究者判断分别保存。</p></article>
        <article><strong>允许矛盾并存</strong><p>不同来源的日期或官职不强行覆盖，而以断言和证据表达。</p></article>
        <article><strong>所有图都能回到来源</strong><p>统计值、地图点和网络边都应可追溯到具体记录。</p></article>
      </section>
    </div>
  )
}
