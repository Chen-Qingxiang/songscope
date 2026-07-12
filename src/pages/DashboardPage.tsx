import { BookOpenText, Database, MapPinned, Network, UsersRound } from 'lucide-react'
import { EventTimeline } from '../components/EventTimeline'
import { SongMap } from '../components/SongMap'
import { StatCard } from '../components/StatCard'
import { datasetStats, eventKindCounts } from '../lib/data'

export function DashboardPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const chartData = eventKindCounts()
  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">宋史可视化数据平台 · MVP 0.1</p>
          <h1>从史料，到可计算的宋代</h1>
          <p className="hero-copy">以人物、时间、地点、制度与事件为骨架，把年谱、官制、历史地图和社会网络连接在同一个可追溯的数据层上。</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => onNavigate('timeline')}>浏览苏轼生涯</button>
            <button className="secondary-button" onClick={() => onNavigate('model')}>查看数据模型</button>
          </div>
        </div>
        <div className="seal-mark" aria-hidden="true"><span>观</span><span>宋</span></div>
      </section>

      <section className="stats-grid">
        <StatCard icon={UsersRound} label="人物" value={datasetStats.people} detail="传记与关系节点" />
        <StatCard icon={MapPinned} label="地点" value={datasetStats.places} detail="历史地名与坐标" />
        <StatCard icon={Database} label="事件" value={datasetStats.events} detail="生平、政治与除授" />
        <StatCard icon={Network} label="关系" value={datasetStats.relations} detail="亲属、文学与政治" />
        <StatCard icon={BookOpenText} label="作品" value={datasetStats.works} detail="可连接创作情境" />
      </section>

      <section className="two-column-grid">
        <article className="panel chart-panel">
          <header className="panel-header"><div><p className="eyebrow">数据概览</p><h2>当前记录构成</h2></div><span className="panel-note">演示集</span></header>
          <div className="bar-chart" aria-label="当前记录构成柱状图">
            {chartData.map((item) => {
              const max = Math.max(...chartData.map((entry) => entry.count))
              return (
                <div className="bar-column" key={item.kind}>
                  <div className="bar-value">{item.count}</div>
                  <div className="bar-track"><span style={{ height: `${Math.max(8, (item.count / max) * 100)}%` }} /></div>
                  <div className="bar-label">{item.label}</div>
                </div>
              )
            })}
          </div>
        </article>
        <article className="panel question-panel">
          <header className="panel-header"><div><p className="eyebrow">研究镜头</p><h2>平台将能回答什么？</h2></div></header>
          <div className="question-list">
            <div><span>01</span><p>苏轼每次外任、召还与贬谪之间，空间距离和政治环境如何变化？</p></div>
            <div><span>02</span><p>同年、师生、亲属和文学交游，哪类关系最能解释仕途路径？</p></div>
            <div><span>03</span><p>旱、蝗、水患发生之后，地方官采取了什么措施，响应速度如何？</p></div>
            <div><span>04</span><p>一项官职通常由什么职位迁入，又通往哪些中央或地方差遣？</p></div>
          </div>
        </article>
      </section>

      <section className="panel map-panel-home">
        <header className="panel-header"><div><p className="eyebrow">空间轨迹</p><h2>苏轼主要任职与贬居地点</h2></div><button className="text-button" onClick={() => onNavigate('map')}>打开地图 →</button></header>
        <SongMap compact />
      </section>

      <section className="panel">
        <header className="panel-header"><div><p className="eyebrow">时间切片</p><h2>苏轼生涯的关键记录</h2></div><button className="text-button" onClick={() => onNavigate('timeline')}>完整时间轴 →</button></header>
        <EventTimeline compact />
      </section>
    </div>
  )
}
