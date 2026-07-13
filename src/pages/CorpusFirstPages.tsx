import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Check, ChevronLeft, ChevronRight, Copy, Download, ExternalLink, Search } from 'lucide-react'
import { EvidenceDrawer } from '../components/EvidenceDrawer'
import '../evidence.css'
import {
  fetchAnnals,
  fetchAssertionEvidence,
  fetchCorpusCatalog,
  fetchCorpusCoverage,
  fetchEntityPassages,
  fetchUnitPassages,
  searchCorpusText,
  type AnnalsResponse,
  type AssertionEvidenceResponse,
  type CorpusCatalogResponse,
  type CoverageResponse,
  type EntityPassagesResponse,
  type TextSearchResponse,
  type UnitPassagesResponse
} from '../lib/researchApi'
import type { CorpusDivision } from '@songscope/schema'

export interface RouteParams {
  q?: string
  division?: string
  juan?: string
  passage?: string
  status?: string
  focus?: string
}

export type Navigate = (view: string, params?: RouteParams) => void

const divisionLabels: Record<CorpusDivision, string> = {
  benji: '本纪', zhi: '志', biao: '表', liezhuan: '列传', appendix: '附录'
}

function PageHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return <header className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{children}</p></div></header>
}

function LoadState({ loading, error }: { loading: boolean; error: string | null }) {
  if (loading) return <div className="panel empty-state">正在读取固定语料投影……</div>
  if (error) return <div className="panel error-panel"><strong>数据读取失败</strong><p>{error}</p><p>系统不会回退到演示数据。</p></div>
  return null
}

function ContextLine({ value }: { value: { datasetVersion: string; corpusVersion: string; snapshotSid: string } }) {
  return <div className="context-line"><span>数据集 {value.datasetVersion}</span><span>语料 {value.corpusVersion}</span><code>{value.snapshotSid}</code></div>
}

function useAsyncValue<T>(loader: () => Promise<T>, dependencies: unknown[]) {
  const [value, setValue] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let current = true
    setLoading(true)
    setError(null)
    loader().then((result) => { if (current) setValue(result) })
      .catch((caught) => { if (current) setError(caught instanceof Error ? caught.message : '未知错误') })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
    // Callers provide stable primitive dependencies for request replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)
  return { value, loading, error }
}

export function HomePage({ navigate }: { navigate: Navigate }) {
  const { value: catalog, loading, error } = useAsyncValue(fetchCorpusCatalog, [])
  const [query, setQuery] = useState('')
  function submit(event: FormEvent) {
    event.preventDefault()
    if (query.trim()) navigate('search', { q: query.trim() })
  }
  return <div className="page-stack">
    <section className="corpus-hero">
      <div><p className="eyebrow">宋史数字研究平台 · Corpus first</p><h1>从《宋史》原文出发</h1><p>浏览固定版本的 496 卷电子转录，以稳定段落检索、回看证据并重放研究查询。候选标注与已接受断言分层显示。</p>
        <form className="hero-search" onSubmit={submit}><Search size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="检索《宋史》原文，例如：徙知" /><button>检索原文</button></form>
      </div><div className="corpus-seal">观宋</div>
    </section>
    <LoadState loading={loading} error={error} />
    {catalog && <>
      <ContextLine value={catalog} />
      <section className="coverage-strip">
        {([['预期', catalog.coverage.expected], ['发现', catalog.coverage.discovered], ['取得', catalog.coverage.acquired], ['校验', catalog.coverage.validated], ['可检索', catalog.coverage.searchable], ['已审核', catalog.coverage.reviewed]] as const)
          .map(([label, count]) => <div key={label}><strong>{count}</strong><span>{label}卷</span></div>)}
      </section>
      <section className="panel"><div className="panel-header"><div><p className="eyebrow">Corpus structure</p><h2>按篇类进入原文</h2></div><span className="panel-note">总计 496 卷</span></div>
        <div className="division-grid">{catalog.divisions.map((division) => <button key={division.division} onClick={() => navigate('corpus', { division: division.division })}><span>{division.labelOriginal}</span><strong>{divisionLabels[division.division]}</strong><small>{division.volumeCount} 卷</small></button>)}</div>
      </section>
      <div className="two-column-grid">
        <section className="panel research-callout"><p className="eyebrow">Structured slice</p><h2>神宗本纪：卷十四至十六</h2><p>以原文段落顺序和原始纪年为骨架，展示规则生成的候选标注；不把候选词项当作历史事实，也不补造公历日期。</p><button className="primary-button" onClick={() => navigate('annals')}>打开纪事切片</button></section>
        <section className="panel research-callout"><p className="eyebrow">Reproducible query</p><h2>“徙知”出现在哪里？</h2><p>统计单位是精确文本命中，而非事件、人物或任命数量。结果可回到段落并导出版本元数据。</p><button className="secondary-button" onClick={() => navigate('search', { q: '徙知' })}>运行全文查询</button></section>
      </div>
    </>}
  </div>
}

function volumeForJuan(catalog: CorpusCatalogResponse, juan: number) {
  return catalog.divisions.flatMap((division) => division.volumes).find((volume) => volume.juan === juan)
}

export function CorpusPage({ params, navigate }: { params: RouteParams; navigate: Navigate }) {
  const { value: catalog, loading: catalogLoading, error: catalogError } = useAsyncValue(fetchCorpusCatalog, [])
  const juan = params.juan ? Number(params.juan) : null
  const volume = catalog && juan ? volumeForJuan(catalog, juan) : null
  const { value: reader, loading: readerLoading, error: readerError } = useAsyncValue(
    () => volume ? fetchUnitPassages(volume.unitSid, { limit: 500 }) : Promise.resolve(null),
    [volume?.unitSid]
  )
  const division = (params.division && Object.hasOwn(divisionLabels, params.division) ? params.division : 'benji') as CorpusDivision
  const [mode, setMode] = useState<'source' | 'readable'>('source')
  const [copied, setCopied] = useState(false)
  const [evidence, setEvidence] = useState<AssertionEvidenceResponse | null>(null)
  const [evidenceLoading, setEvidenceLoading] = useState(false)
  const [evidenceError, setEvidenceError] = useState<string | null>(null)
  const activeIndex = useMemo(() => {
    if (!reader) return -1
    if (!params.passage) return 0
    return reader.passages.findIndex((passage) => passage.sid === params.passage)
  }, [reader, params.passage])
  const active = reader && activeIndex >= 0 ? reader.passages[activeIndex] : null
  const selectedDivision = catalog?.divisions.find((item) => item.division === division)

  async function openEvidence(assertionSid: string) {
    setEvidenceLoading(true); setEvidenceError(null); setEvidence(null)
    try { setEvidence(await fetchAssertionEvidence(assertionSid)) }
    catch (caught) { setEvidenceError(caught instanceof Error ? caught.message : '证据读取失败') }
    finally { setEvidenceLoading(false) }
  }

  async function copyCitation() {
    if (!active || !reader) return
    const citation = `《宋史》卷${active.juan}，第${active.sequenceIndex}段，中文维基文库 revision ${reader.source.revisionId}，SongScope passage ${active.sid}`
    await navigator.clipboard.writeText(citation)
    setCopied(true); window.setTimeout(() => setCopied(false), 1400)
  }

  return <div className="page-stack">
    <PageHeading eyebrow="Source reader" title="史料">按固定目录与 revision 阅读《宋史》电子转录。原始文本、可读投影、候选标注和正式断言各自保持边界。</PageHeading>
    <LoadState loading={catalogLoading} error={catalogError} />
    {catalog && !juan && <>
      <ContextLine value={catalog} />
      <div className="division-tabs">{catalog.divisions.map((item) => <button key={item.division} className={division === item.division ? 'active' : ''} onClick={() => navigate('corpus', { division: item.division })}>{divisionLabels[item.division]} <span>{item.volumeCount}</span></button>)}</div>
      <section className="volume-grid">{selectedDivision?.volumes.map((item) => <button key={item.unitSid} onClick={() => navigate('corpus', { division, juan: String(item.juan) })}><strong>卷{item.juan}</strong><span>{item.labelOriginal}</span><small>{item.passageCount} 段 · revision {item.revisionId}</small></button>)}</section>
    </>}
    {juan && <LoadState loading={readerLoading} error={readerError ?? (!volume ? '目录中没有这一卷。' : null)} />}
    {reader && active && <div className="reader-shell">
      <aside className="reader-index"><button className="text-button" onClick={() => navigate('corpus', { division: active.division })}>← 返回{divisionLabels[active.division]}目录</button><h2>卷{active.juan}</h2><p>{reader.unit.labelOriginal}</p><label>段落<select value={active.sequenceIndex} onChange={(event) => { const passage = reader.passages[Number(event.target.value) - 1]; if (passage) navigate('corpus', { division: passage.division, juan: String(passage.juan), passage: passage.sid }) }}>{reader.passages.map((passage) => <option key={passage.sid} value={passage.sequenceIndex}>第 {passage.sequenceIndex} 段</option>)}</select></label><div className="reader-metadata"><span>revision {reader.source.revisionId}</span><span>{reader.source.pageTitle}</span><span>{active.reviewStatus === 'reviewed' ? '已审核' : '原始分段，未审核'}</span></div></aside>
      <div className="reader-main"><div className="reader-toolbar"><div><button className={mode === 'source' ? 'active' : ''} onClick={() => setMode('source')}>原始文本</button><button className={mode === 'readable' ? 'active' : ''} onClick={() => setMode('readable')}>可读投影</button></div><button onClick={copyCitation}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? '已复制' : '复制稳定引用'}</button></div>
        <article className="source-passage"><p className="passage-number">卷{active.juan} · 第{active.sequenceIndex}段</p><pre>{mode === 'source' ? active.sourceText : active.normalizedText ?? active.sourceText}</pre></article>
        <nav className="passage-nav"><button disabled={activeIndex === 0} onClick={() => { const item = reader.passages[activeIndex - 1]; if (item) navigate('corpus', { division: item.division, juan: String(item.juan), passage: item.sid }) }}><ChevronLeft size={16} />上一段</button><button disabled={activeIndex === reader.passages.length - 1} onClick={() => { const item = reader.passages[activeIndex + 1]; if (item) navigate('corpus', { division: item.division, juan: String(item.juan), passage: item.sid }) }}>下一段<ChevronRight size={16} /></button></nav>
        <section className="reader-detail"><h3>候选标注与审核状态</h3><p>自动规则只生成 candidate annotation；它们不是已确认实体或历史断言。</p>{active.annotations.length ? <div className="annotation-list">{active.annotations.map((item) => <span key={item.sid}><strong>{item.surfaceText}</strong>{item.annotationType} · {item.status}</span>)}</div> : <p className="muted-copy">本段不在卷十四至十六的规则标注范围内，或没有规则命中。</p>}</section>
        {active.locators.length > 0 && <section className="reader-detail"><h3>正式证据回链</h3>{active.locators.map((locator) => <article className="locator-card" key={locator.locatorSid}><strong>{locator.locatorValue}</strong><p>{locator.quoteText}</p><div>{locator.assertions.map((assertion) => <button key={assertion.assertionSid} onClick={() => openEvidence(assertion.assertionSid)}>{assertion.status} · {assertion.assertionSid}</button>)}</div></article>)}</section>}
        <section className="source-license"><div><strong>来源与许可</strong><p>{reader.source.pageTitle} · revision {reader.source.revisionId}</p><p>{reader.source.license.name}</p></div><div><a href={reader.source.attributionUrl} target="_blank" rel="noreferrer">固定版本与署名 <ExternalLink size={14} /></a><a href={reader.source.historyUrl} target="_blank" rel="noreferrer">页面历史 <ExternalLink size={14} /></a></div></section>
        <ContextLine value={reader} />
      </div>
      {(evidence || evidenceLoading || evidenceError) && <EvidenceDrawer data={evidence} loading={evidenceLoading} error={evidenceError} onClose={() => { setEvidence(null); setEvidenceError(null) }} />}
    </div>}
  </div>
}

function csvEscape(value: unknown) {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

function saveFile(name: string, content: string, type: string) {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([content], { type }))
  link.download = name
  link.click()
  URL.revokeObjectURL(link.href)
}

export function SearchPage({ params, navigate }: { params: RouteParams; navigate: Navigate }) {
  const [query, setQuery] = useState(params.q ?? '')
  const [division, setDivision] = useState(params.division ?? '')
  const [juan, setJuan] = useState(params.juan ?? '')
  const [status, setStatus] = useState(params.status ?? '')
  useEffect(() => { setQuery(params.q ?? ''); setDivision(params.division ?? ''); setJuan(params.juan ?? ''); setStatus(params.status ?? '') }, [params.q, params.division, params.juan, params.status])
  const { value: result, loading, error } = useAsyncValue(
    () => params.q ? searchCorpusText(params.q, {
      division: params.division as CorpusDivision | undefined,
      juan: params.juan ? Number(params.juan) : undefined,
      status: params.status as 'raw' | 'reviewed' | undefined,
      limit: 500
    }) : Promise.resolve(null),
    [params.q, params.division, params.juan, params.status]
  )
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!query.trim()) return
    navigate('search', { q: query.trim(), division: division || undefined, juan: juan || undefined, status: status || undefined })
  }
  function exportResult(format: 'json' | 'csv') {
    if (!result) return
    if (format === 'json') saveFile(`songscope-${result.query}.json`, JSON.stringify(result, null, 2), 'application/json')
    else {
      const columns = result.exportMetadata.columns
      const rows = result.results.map((row) => columns.map((column) => csvEscape(row[column as keyof typeof row])).join(','))
      saveFile(`songscope-${result.query}.csv`, [columns.join(','), ...rows].join('\n'), 'text/csv;charset=utf-8')
    }
  }
  return <div className="page-stack"><PageHeading eyebrow="Literal text search" title="检索">查询固定《宋史》原文中的精确、非重叠文本出现。结果统计单位是“文本命中”，不是事件或任命。</PageHeading>
    <form className="search-form panel" onSubmit={submit}><label className="query-field"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入原文词语" /></label><label>篇类<select value={division} onChange={(event) => setDivision(event.target.value)}><option value="">全部</option>{Object.entries(divisionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>卷次<input inputMode="numeric" value={juan} onChange={(event) => setJuan(event.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="1–496" /></label><label>审核状态<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">全部</option><option value="raw">raw</option><option value="reviewed">reviewed</option></select></label><button className="primary-button">运行查询</button></form>
    {params.q && <LoadState loading={loading} error={error} />}
    {result && <><div className="results-heading"><div><strong>{result.pagination.total}</strong><span> 个文本命中 · 当前显示 {result.results.length}</span></div><div><button onClick={() => exportResult('csv')}><Download size={14} />CSV</button><button onClick={() => exportResult('json')}><Download size={14} />JSON</button></div></div><ContextLine value={result} />
      <section className="result-table"><div className="result-row result-head"><span>定位</span><span>命中上下文</span><span>状态</span></div>{result.results.map((item, index) => <button className="result-row" key={`${item.passageSid}-${item.matchStart}-${index}`} onClick={() => navigate('corpus', { division: item.division, juan: String(item.juan), passage: item.passageSid })}><span>卷{item.juan} · 段{item.sequenceIndex}<small>{divisionLabels[item.division]}</small></span><p>{item.context}</p><span><b>{item.occurrenceType}</b><small>{item.reviewStatus} · r{item.sourceRevisionId}</small></span></button>)}</section>
      <section className="query-definition"><strong>查询定义</strong><p>{result.exportMetadata.statisticalUnit}；检索范围 {result.coverage.searchable}/{result.coverage.expected} 卷。命中跨度使用 Unicode code point 偏移。</p><code>{result.exportMetadata.queryId}@{result.exportMetadata.queryVersion}</code></section>
    </>}
  </div>
}

export function AnnalsPage({ params, navigate }: { params: RouteParams; navigate: Navigate }) {
  const { value, loading, error } = useAsyncValue(() => fetchAnnals({ status: 'candidate' }), [])
  const rows = value?.rows.filter((row) => params.focus !== 'appointment' || row.candidateCounts['appointment-action'] > 0) ?? []
  return <div className="page-stack"><PageHeading eyebrow="Source-order annals" title="纪事">神宗本纪卷十四至十六的原文顺序投影。原始纪年与候选词项用于定位，不推定无法从来源确定的公历月日。</PageHeading><LoadState loading={loading} error={error} />
    {value && <><ContextLine value={value} /><section className="query-definition"><strong>{value.query.title}</strong><p>{value.query.scope}</p><code>{value.query.id}@{value.query.version} · 统计单位：{value.query.statisticalUnit}</code></section>
      <div className="annals-tools"><button className={!params.focus ? 'active' : ''} onClick={() => navigate('annals')}>全部段落</button><button className={params.focus === 'appointment' ? 'active' : ''} onClick={() => navigate('annals', { focus: 'appointment' })}>有除授动作词候选</button><span>{rows.length} 行</span></div>
      <section className="annals-table">{rows.map((row) => <button key={row.passageSid} onClick={() => navigate('corpus', { division: 'benji', juan: String(row.juan), passage: row.passageSid })}><span className="annals-locator">卷{row.juan}<small>第 {row.sequenceIndex} 段</small></span><div>{row.chronology.length > 0 && <div className="chronology-row">{row.chronology.map((item) => <strong key={item.sid}>{item.surfaceText}</strong>)}</div>}<p>{row.normalizedText ?? row.sourceText}</p><small>候选：纪年 {row.candidateCounts.chronology} · 人物 {row.candidateCounts.person} · 地点 {row.candidateCounts.place} · 除授动作 {row.candidateCounts['appointment-action']}</small></div><span className="row-status">candidate<br />r{row.sourceRevisionId}</span></button>)}</section>
    </>}
  </div>
}

export function EntitiesPage({ navigate }: { navigate: Navigate }) {
  const { value, loading, error } = useAsyncValue(() => fetchEntityPassages('person:sushi'), [])
  const [evidence, setEvidence] = useState<AssertionEvidenceResponse | null>(null)
  const [evidenceLoading, setEvidenceLoading] = useState(false)
  const [evidenceError, setEvidenceError] = useState<string | null>(null)
  async function openEvidence(sid: string) {
    setEvidenceLoading(true); setEvidenceError(null)
    try { setEvidence(await fetchAssertionEvidence(sid)) } catch (caught) { setEvidenceError(caught instanceof Error ? caught.message : '证据读取失败') } finally { setEvidenceLoading(false) }
  }
  return <div className="page-stack"><PageHeading eyebrow="Entity backlinks" title="实体">实体页分别列出字符串出现、已消歧标注与 accepted assertion 证据回链；三者不能相互替代。</PageHeading><LoadState loading={loading} error={error} />
    {value && <><ContextLine value={value} /><section className="entity-heading panel"><div><p className="eyebrow">v0.2 regression entity</p><h2>{value.entity.label}</h2><code>{value.entity.sid}</code></div><p>苏轼仅作为既有人工整理数据的回归案例，不再是平台首页或全局默认中心。</p></section><div className="entity-layers">
      <EntityLayer title="原文字符串出现" count={value.stringOccurrences.length} note="只说明字符序列出现，未必已经消歧。">{value.stringOccurrences.map((item, index) => <button key={`${item.passageSid}-${item.matchStart}-${index}`} onClick={() => navigate('corpus', { division: item.division, juan: String(item.juan), passage: item.passageSid })}>卷{item.juan} · 段{item.sequenceIndex}<span>{item.context}</span></button>)}</EntityLayer>
      <EntityLayer title="已消歧标注" count={value.resolvedAnnotations.length} note="只有 targetEntitySid 已明确指向本实体的标注。">{value.resolvedAnnotations.map((item) => <button key={item.annotation.sid} onClick={() => navigate('corpus', { juan: String(item.juan), passage: item.passageSid })}>卷{item.juan} · {item.annotation.surfaceText}<span>{item.annotation.status}</span></button>)}</EntityLayer>
      <EntityLayer title="已接受断言的证据回链" count={value.acceptedAssertions.length} note="既有人工整理 assertion，经 supporting evidence 回到卷338稳定段落。">{value.acceptedAssertions.map((item) => <article key={`${item.assertionSid}-${item.passageSid}`}><button onClick={() => navigate('corpus', { juan: '338', passage: item.passageSid })}>{item.assertionSid}<span>{item.predicate} · {item.passageSid}</span></button><button className="text-button" onClick={() => openEvidence(item.assertionSid)}>查看完整证据链</button></article>)}</EntityLayer>
    </div></>}
    {(evidence || evidenceLoading || evidenceError) && <EvidenceDrawer data={evidence} loading={evidenceLoading} error={evidenceError} onClose={() => { setEvidence(null); setEvidenceError(null) }} />}
  </div>
}

function EntityLayer({ title, count, note, children }: { title: string; count: number; note: string; children: ReactNode }) {
  return <section className="panel entity-layer"><div className="panel-header"><div><h2>{title}</h2><p>{note}</p></div><strong>{count}</strong></div><div className="layer-list">{count ? children : <p className="muted-copy">当前固定数据中没有这一层记录。</p>}</div></section>
}

export function ResearchQueriesPage({ navigate }: { navigate: Navigate }) {
  const queries = [
    { id: 'Q01', title: '神宗本纪原始纪年条目', unit: 'source passage', coverage: '卷14–16', action: () => navigate('annals') },
    { id: 'Q02', title: '全部固定语料中的“徙知”', unit: 'exact text occurrence', coverage: '496卷', action: () => navigate('search', { q: '徙知' }) },
    { id: 'Q03', title: '神宗本纪除授动作词候选', unit: 'candidate annotation / passage', coverage: '卷14–16', action: () => navigate('annals', { focus: 'appointment' }) },
    { id: 'Q04', title: '苏轼的 passage 反查', unit: 'occurrence / annotation / assertion link', coverage: '全语料与卷338正式切片', action: () => navigate('entities') },
    { id: 'Q05', title: '语料覆盖与数据质量', unit: 'corpus volume', coverage: '预期496卷', action: () => navigate('dataset') }
  ]
  return <div className="page-stack"><PageHeading eyebrow="Versioned research" title="研究查询">每个查询明确范围、统计单位、版本和追溯路径。默认输出表格；不会用装饰性图表掩盖数据边界。</PageHeading><section className="query-cards">{queries.map((query) => <article key={query.id}><span>{query.id}</span><h2>{query.title}</h2><dl><div><dt>统计单位</dt><dd>{query.unit}</dd></div><div><dt>覆盖范围</dt><dd>{query.coverage}</dd></div></dl><button className="primary-button" onClick={query.action}>运行并查看结果</button></article>)}</section></div>
}

export function DatasetPage() {
  const { value, loading, error } = useAsyncValue(fetchCorpusCoverage, [])
  return <div className="page-stack"><PageHeading eyebrow="Version and provenance" title="数据版本">查看固定快照、逐卷取得状态、校验覆盖、许可与当前人工审核边界。</PageHeading><LoadState loading={loading} error={error} />
    {value && <><ContextLine value={value} /><section className="coverage-detail panel"><div className="coverage-ring"><strong>{value.coverage.searchable}/{value.coverage.expected}</strong><span>卷可检索</span></div><div className="coverage-table">{Object.entries({ expected: value.coverage.expected, discovered: value.coverage.discovered, acquired: value.coverage.acquired, validated: value.coverage.validated, segmented: value.coverage.segmented, searchable: value.coverage.searchable, reviewed: value.coverage.reviewed, candidateAnnotations: value.coverage.candidateAnnotations }).map(([key, count]) => <div key={key}><span>{key}</span><strong>{count}</strong></div>)}</div></section>
      <div className="two-column-grid"><section className="panel"><p className="eyebrow">Source snapshot</p><h2>{value.source.title}</h2><dl className="metadata-list"><div><dt>载体</dt><dd>{value.source.provider}</dd></div><div><dt>目录 revision</dt><dd>{value.source.directoryRevisionId}</dd></div><div><dt>许可</dt><dd>{value.source.license.name}</dd></div></dl><div className="link-row"><a href={value.source.canonicalUrl} target="_blank" rel="noreferrer">目录页 <ExternalLink size={13} /></a><a href={value.source.historyUrl} target="_blank" rel="noreferrer">历史页 <ExternalLink size={13} /></a><a href={value.source.license.url} target="_blank" rel="noreferrer">许可 <ExternalLink size={13} /></a></div></section><section className="panel"><p className="eyebrow">Coverage anomalies</p><h2>缺失与异常</h2>{value.coverage.anomalies.length ? value.coverage.anomalies.map((item, index) => <p key={`${item.kind}-${index}`}>{item.kind} · {item.juan ?? '未定位'} · {item.message}</p>) : <div className="quality-ok"><Check size={24} /><strong>固定快照无缺卷、重复、空文本或分段异常</strong><p>这不表示转录内容已经完成学术校勘；当前 reviewed 卷数仍为 {value.coverage.reviewed}。</p></div>}</section></div>
      <section className="query-definition"><strong>解释边界</strong><p>validated/searchable 表示机器校验和检索投影可用；reviewed 才表示完成相应人工审核。候选标注共 {value.coverage.candidateAnnotations} 条，均不自动成为 accepted assertion。</p></section>
    </>}
  </div>
}
