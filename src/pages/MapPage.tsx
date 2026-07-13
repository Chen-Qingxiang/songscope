import { SongMap } from '../components/SongMap'

export function MapPage() {
  return (
    <div className="page-stack">
      <header className="page-heading"><div><p className="eyebrow">Verified historical GIS projection</p><h1>杭州—密州—徐州—湖州—黄州轨迹</h1><p>地点来自正式 API；点位均标明解析状态，连线只表达有证据的先后地点，不伪装为实际道路或古代行政区边界。</p></div></header>
      <section className="panel"><SongMap /></section>
      <section className="method-grid">
        <article className="method-card"><span>01</span><h3>不覆盖原文</h3><p>“密州”“诸城县”“今山东诸城”分别存储，不把现代地名直接替换进史料。</p></article>
        <article className="method-card"><span>02</span><h3>行政区有时效</h3><p>地点隶属关系带起止时间，允许同一地名在不同时期属于不同层级。</p></article>
        <article className="method-card"><span>03</span><h3>坐标有可信度</h3><p>精确治所、近似区域与无法定位必须明确区分，避免地图制造虚假精确。</p></article>
      </section>
    </div>
  )
}
