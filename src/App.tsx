import { useMemo, useState } from 'react'
import { Clock3, Database, Code2, Home, Map, Menu, Network, Search, X } from 'lucide-react'
import { DashboardPage } from './pages/DashboardPage'
import { MapPage } from './pages/MapPage'
import { ModelPage } from './pages/ModelPage'
import { NetworkPage } from './pages/NetworkPage'
import { TimelinePage } from './pages/TimelinePage'
import { searchableItems } from './lib/data'

const navItems = [
  { id: 'dashboard', label: '总览', icon: Home },
  { id: 'timeline', label: '时间轴', icon: Clock3 },
  { id: 'map', label: '历史地图', icon: Map },
  { id: 'network', label: '人物网络', icon: Network },
  { id: 'model', label: '数据模型', icon: Database }
]

function App() {
  const [page, setPage] = useState('dashboard')
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return []
    return searchableItems().filter((item) => `${item.label} ${item.text}`.toLowerCase().includes(normalized)).slice(0, 7)
  }, [query])

  const content = page === 'timeline' ? <TimelinePage /> : page === 'map' ? <MapPage /> : page === 'network' ? <NetworkPage /> : page === 'model' ? <ModelPage /> : <DashboardPage onNavigate={setPage} />

  function navigate(id: string) {
    setPage(id)
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="brand"><div className="brand-seal">宋</div><div><strong>观宋</strong><span>SongScope</span></div></div>
        <nav>{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? 'active' : ''} onClick={() => navigate(id)}><Icon size={18} /><span>{label}</span></button>)}</nav>
        <div className="sidebar-footer"><p>DATASET</p><strong>Demo v0.1</strong><span>以苏轼为纵向样板</span><a href="https://github.com/Chen-Qingxiang/songscope" target="_blank" rel="noreferrer"><Code2 size={16} /> GitHub</a></div>
      </aside>
      {menuOpen && <button className="sidebar-backdrop" aria-label="关闭菜单" onClick={() => setMenuOpen(false)} />}

      <main className="main-area">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="打开菜单">{menuOpen ? <X /> : <Menu />}</button>
          <div className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索人物、地点、事件或作品…" />{query && <button onClick={() => setQuery('')}><X size={15} /></button>}
            {query && <div className="search-results">{results.length ? results.map((item) => <button key={`${item.type}-${item.id}`} onClick={() => setQuery('')}><span>{item.type}</span><strong>{item.label}</strong><p>{item.text}</p></button>) : <div className="search-empty">没有找到匹配记录</div>}</div>}
          </div>
          <div className="topbar-status"><span className="status-dot" />结构化演示数据</div>
        </header>
        <div className="content-wrap">{content}</div>
      </main>
    </div>
  )
}

export default App
