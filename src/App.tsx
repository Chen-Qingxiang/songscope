import { useEffect, useState, type FormEvent } from 'react'
import { BookOpenText, Code2, Database, FileSearch, House, Menu, Rows3, Search, TableProperties, Users, X } from 'lucide-react'
import {
  AnnalsPage,
  CorpusPage,
  DatasetPage,
  EntitiesPage,
  HomePage,
  ResearchQueriesPage,
  SearchPage,
  type Navigate,
  type RouteParams
} from './pages/CorpusFirstPages'

const navItems = [
  { id: 'corpus', label: '史料', icon: BookOpenText },
  { id: 'search', label: '检索', icon: FileSearch },
  { id: 'annals', label: '纪事', icon: Rows3 },
  { id: 'entities', label: '实体', icon: Users },
  { id: 'queries', label: '研究查询', icon: TableProperties },
  { id: 'dataset', label: '数据版本', icon: Database }
] as const

interface RouteState {
  view: string
  params: RouteParams
}

function readRoute(): RouteState {
  const search = new URLSearchParams(window.location.search)
  const view = search.get('view') ?? 'home'
  const params: RouteParams = {}
  for (const key of ['q', 'division', 'juan', 'passage', 'status', 'focus'] as const) {
    const value = search.get(key)
    if (value) params[key] = value
  }
  return { view, params }
}

function App() {
  const [route, setRoute] = useState<RouteState>(readRoute)
  const [menuOpen, setMenuOpen] = useState(false)
  const [topQuery, setTopQuery] = useState('')

  useEffect(() => {
    const update = () => setRoute(readRoute())
    window.addEventListener('popstate', update)
    return () => window.removeEventListener('popstate', update)
  }, [])

  const navigate: Navigate = (view, params = {}) => {
    const search = new URLSearchParams({ view })
    for (const [key, value] of Object.entries(params)) if (value) search.set(key, value)
    window.history.pushState({}, '', `${window.location.pathname}?${search}`)
    setRoute({ view, params })
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function submitTopSearch(event: FormEvent) {
    event.preventDefault()
    if (!topQuery.trim()) return
    navigate('search', { q: topQuery.trim() })
    setTopQuery('')
  }

  const content = route.view === 'corpus' ? <CorpusPage params={route.params} navigate={navigate} />
    : route.view === 'search' ? <SearchPage params={route.params} navigate={navigate} />
      : route.view === 'annals' ? <AnnalsPage params={route.params} navigate={navigate} />
        : route.view === 'entities' ? <EntitiesPage navigate={navigate} />
          : route.view === 'queries' ? <ResearchQueriesPage navigate={navigate} />
            : route.view === 'dataset' ? <DatasetPage />
              : <HomePage navigate={navigate} />

  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
      <button className="brand brand-button" onClick={() => navigate('home')}><div className="brand-seal">宋</div><div><strong>观宋</strong><span>SongScope</span></div></button>
      <nav>{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={route.view === id ? 'active' : ''} onClick={() => navigate(id)}><Icon size={18} /><span>{label}</span></button>)}</nav>
      <div className="sidebar-footer"><p>CORPUS-FIRST v0.3</p><strong>《宋史》固定语料</strong><span>496卷 · 原文可追溯 · 候选与正式数据分层</span><button onClick={() => navigate('home')}><House size={15} /> 返回首页</button><a href="https://github.com/Chen-Qingxiang/songscope" target="_blank" rel="noreferrer"><Code2 size={16} /> GitHub</a></div>
    </aside>
    {menuOpen && <button className="sidebar-backdrop" aria-label="关闭菜单" onClick={() => setMenuOpen(false)} />}
    <main className="main-area">
      <header className="topbar"><button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="打开菜单">{menuOpen ? <X /> : <Menu />}</button><form className="search-box" onSubmit={submitTopSearch}><Search size={17} /><input value={topQuery} onChange={(event) => setTopQuery(event.target.value)} placeholder="检索《宋史》原文…" /><button aria-label="提交检索"><Search size={15} /></button></form><div className="topbar-status"><span className="status-dot" />固定语料 · 研究数据分层</div></header>
      <div className="content-wrap">{content}</div>
    </main>
  </div>
}

export default App
