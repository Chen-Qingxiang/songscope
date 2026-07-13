import {
  annotationStatusSchema,
  annalsResponseSchema,
  assertionEvidenceResponseSchema,
  careerTimelineResponseSchema,
  corpusCatalogResponseSchema,
  corpusDivisionSchema,
  corpusUnitsResponseSchema,
  coverageResponseSchema,
  entityPassagesResponseSchema,
  eventResponseSchema,
  hasSidPrefix,
  passageDetailResponseSchema,
  passageReviewStatusSchema,
  personResponseSchema,
  searchResponseSchema,
  sidSchema,
  sourceResponseSchema,
  textSearchResponseSchema,
  unitPassagesResponseSchema
} from '@songscope/schema'
import type {
  AnnalsFilters,
  CareerFilters,
  PassagePagination,
  SongScopeRepository,
  TextSearchFilters
} from '@songscope/db/src/repository.js'

function json(body: unknown, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type'
    }
  })
}

function error(code: string, message: string, status: number) {
  return json({ error: code, message }, status)
}

function parseSid(value: string, prefix: 'person' | 'event' | 'assertion' | 'source') {
  const result = sidSchema.safeParse(value)
  return result.success && hasSidPrefix(result.data, prefix) ? result.data : null
}

function parseCareerFilters(url: URL): CareerFilters | Response {
  const filters: CareerFilters = {}
  for (const key of ['from', 'to'] as const) {
    const raw = url.searchParams.get(key)
    if (raw !== null) {
      const value = Number(raw)
      if (!Number.isInteger(value) || value < 900 || value > 2000) {
        return error('invalid_query', `${key} 必须是900至2000之间的整数年份`, 400)
      }
      filters[key] = value
    }
  }
  if (filters.from !== undefined && filters.to !== undefined && filters.from > filters.to) {
    return error('invalid_query', 'from 不得晚于 to', 400)
  }
  const place = url.searchParams.get('place')
  if (place) {
    const parsed = sidSchema.safeParse(place)
    if (!parsed.success || !hasSidPrefix(parsed.data, 'place')) return error('invalid_query', 'place 必须是有效地点SID', 400)
    filters.placeSid = parsed.data
  }
  const type = url.searchParams.get('type')
  const allowed = ['appointment', 'service', 'movement', 'political', 'disaster', 'disaster-response', 'residence']
  if (type) {
    if (!allowed.includes(type)) return error('invalid_query', `type 必须是 ${allowed.join('、')} 之一`, 400)
    filters.itemType = type
  }
  return filters
}

function parseNaturalNumber(url: URL, key: string, options: { minimum: number; maximum: number }): number | undefined | Response {
  const raw = url.searchParams.get(key)
  if (raw === null) return undefined
  const value = Number(raw)
  if (!Number.isInteger(value) || value < options.minimum || value > options.maximum) {
    return error('invalid_query', `${key} 必须是${options.minimum}至${options.maximum}之间的整数`, 400)
  }
  return value
}

function parsePagination(url: URL): PassagePagination | Response {
  const offset = parseNaturalNumber(url, 'offset', { minimum: 0, maximum: 1_000_000 })
  if (offset instanceof Response) return offset
  const limit = parseNaturalNumber(url, 'limit', { minimum: 1, maximum: 500 })
  if (limit instanceof Response) return limit
  return { offset, limit }
}

function parseTextSearchFilters(url: URL): TextSearchFilters | Response {
  const pagination = parsePagination(url)
  if (pagination instanceof Response) return pagination
  const filters: TextSearchFilters = pagination
  const division = url.searchParams.get('division')
  if (division) {
    const parsed = corpusDivisionSchema.safeParse(division)
    if (!parsed.success) return error('invalid_query', 'division 必须是本纪、志、表、列传或附录的规范值', 400)
    filters.division = parsed.data
  }
  const juan = parseNaturalNumber(url, 'juan', { minimum: 1, maximum: 496 })
  if (juan instanceof Response) return juan
  filters.juan = juan
  const status = url.searchParams.get('status')
  if (status) {
    const parsed = passageReviewStatusSchema.safeParse(status)
    if (!parsed.success) return error('invalid_query', 'status 必须是 raw 或 reviewed', 400)
    filters.status = parsed.data
  }
  return filters
}

function parseAnnalsFilters(url: URL): AnnalsFilters | Response {
  const fromJuan = parseNaturalNumber(url, 'fromJuan', { minimum: 14, maximum: 16 })
  if (fromJuan instanceof Response) return fromJuan
  const toJuan = parseNaturalNumber(url, 'toJuan', { minimum: 14, maximum: 16 })
  if (toJuan instanceof Response) return toJuan
  if (fromJuan !== undefined && toJuan !== undefined && fromJuan > toJuan) {
    return error('invalid_query', 'fromJuan 不得大于 toJuan', 400)
  }
  const status = url.searchParams.get('status')
  if (!status) return { fromJuan, toJuan }
  const parsed = annotationStatusSchema.safeParse(status)
  return parsed.success ? { fromJuan, toJuan, status: parsed.data } : error('invalid_query', 'status 必须是 candidate、reviewed 或 rejected', 400)
}

export function createRequestHandler(repository: SongScopeRepository) {
  return async function handle(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') return json({}, 204)
    if (request.method !== 'GET') return error('method_not_allowed', '仅支持 GET', 405)

    const url = new URL(request.url)
    const path = decodeURIComponent(url.pathname)
    try {
      if (path === '/health') {
        return json({ ok: true, service: 'songscope-api', datasetVersion: await repository.getDatasetVersion() })
      }

      if (path === '/api/corpus') {
        const result = await repository.getCorpusCatalog()
        return result ? json(corpusCatalogResponseSchema.parse(result)) : error('not_found', '未找到语料快照', 404)
      }

      const corpusUnitsMatch = path.match(/^\/api\/corpus\/([^/]+)\/units$/)
      if (corpusUnitsMatch) {
        const parsed = sidSchema.safeParse(corpusUnitsMatch[1])
        if (!parsed.success || !hasSidPrefix(parsed.data, 'source')) return error('invalid_sid', '来源项 SID 无效', 400)
        const result = await repository.getCorpusUnits(parsed.data)
        return result ? json(corpusUnitsResponseSchema.parse(result)) : error('not_found', '未找到语料来源项', 404)
      }

      const unitPassagesMatch = path.match(/^\/api\/units\/([^/]+)\/passages$/)
      if (unitPassagesMatch) {
        const parsed = sidSchema.safeParse(unitPassagesMatch[1])
        if (!parsed.success) return error('invalid_sid', '来源单元 SID 无效', 400)
        const pagination = parsePagination(url)
        if (pagination instanceof Response) return pagination
        const result = await repository.getUnitPassages(parsed.data, pagination)
        return result ? json(unitPassagesResponseSchema.parse(result)) : error('not_found', '未找到来源单元', 404)
      }

      const passageMatch = path.match(/^\/api\/passages\/([^/]+)$/)
      if (passageMatch) {
        const parsed = sidSchema.safeParse(passageMatch[1])
        if (!parsed.success) return error('invalid_sid', '来源段落 SID 无效', 400)
        const result = await repository.getPassage(parsed.data)
        return result ? json(passageDetailResponseSchema.parse(result)) : error('not_found', '未找到来源段落', 404)
      }

      if (path === '/api/search/text') {
        const query = url.searchParams.get('q')?.trim() ?? ''
        if (!query || query.length > 100) return error('invalid_query', 'q 必须为1至100个字符', 400)
        const filters = parseTextSearchFilters(url)
        if (filters instanceof Response) return filters
        return json(textSearchResponseSchema.parse(await repository.searchText(query, filters)))
      }

      const entityPassagesMatch = path.match(/^\/api\/entities\/([^/]+)\/passages$/)
      if (entityPassagesMatch) {
        const parsed = sidSchema.safeParse(entityPassagesMatch[1])
        if (!parsed.success) return error('invalid_sid', '实体 SID 无效', 400)
        const result = await repository.getEntityPassages(parsed.data)
        return result ? json(entityPassagesResponseSchema.parse(result)) : error('not_found', '未找到实体', 404)
      }

      if (path === '/api/research/annals') {
        const filters = parseAnnalsFilters(url)
        if (filters instanceof Response) return filters
        const result = await repository.getAnnals(filters)
        return result ? json(annalsResponseSchema.parse(result)) : error('not_found', '未找到纪事研究查询', 404)
      }

      const coverageMatch = path.match(/^\/api\/datasets\/([^/]+)\/coverage$/)
      if (coverageMatch) {
        const version = coverageMatch[1]
        if (!version || version.length > 120) return error('invalid_query', '数据版本无效', 400)
        const result = await repository.getCoverage(version === 'current' ? undefined : version)
        return result ? json(coverageResponseSchema.parse(result)) : error('not_found', '未找到数据版本覆盖报告', 404)
      }

      const careerMatch = path.match(/^\/api\/people\/([^/]+)\/(career|timeline)$/)
      if (careerMatch) {
        const sid = parseSid(careerMatch[1], 'person')
        if (!sid) return error('invalid_sid', '人物 SID 无效', 400)
        const filters = parseCareerFilters(url)
        if (filters instanceof Response) return filters
        const result = await repository.getCareer(sid, filters)
        if (!result) return error('not_found', '未找到人物', 404)
        return json(careerTimelineResponseSchema.parse(result))
      }

      const personMatch = path.match(/^\/api\/people\/([^/]+)$/)
      if (personMatch) {
        const sid = parseSid(personMatch[1], 'person')
        if (!sid) return error('invalid_sid', '人物 SID 无效', 400)
        const result = await repository.getPerson(sid)
        return result ? json(personResponseSchema.parse(result)) : error('not_found', '未找到人物', 404)
      }

      const eventMatch = path.match(/^\/api\/events\/([^/]+)$/)
      if (eventMatch) {
        const sid = parseSid(eventMatch[1], 'event')
        if (!sid) return error('invalid_sid', '事件 SID 无效', 400)
        const result = await repository.getEvent(sid)
        return result ? json(eventResponseSchema.parse(result)) : error('not_found', '未找到事件', 404)
      }

      const assertionMatch = path.match(/^\/api\/assertions\/([^/]+)\/evidence$/)
      if (assertionMatch) {
        const sid = parseSid(assertionMatch[1], 'assertion')
        if (!sid) return error('invalid_sid', '断言 SID 无效', 400)
        const result = await repository.getAssertionEvidence(sid)
        return result ? json(assertionEvidenceResponseSchema.parse(result)) : error('not_found', '未找到断言', 404)
      }

      const sourceMatch = path.match(/^\/api\/sources\/([^/]+)$/)
      if (sourceMatch) {
        const sid = parseSid(sourceMatch[1], 'source')
        if (!sid) return error('invalid_sid', '来源 SID 无效', 400)
        const result = await repository.getSource(sid)
        return result ? json(sourceResponseSchema.parse(result)) : error('not_found', '未找到来源', 404)
      }

      if (path === '/api/search') {
        const query = url.searchParams.get('q')?.trim() ?? ''
        if (!query || query.length > 100) return error('invalid_query', 'q 必须为1至100个字符', 400)
        return json(searchResponseSchema.parse(await repository.search(query)))
      }

      return error('not_found', '未找到接口', 404)
    } catch (caught) {
      console.error('SongScope API request failed', caught)
      return error('database_error', '数据库查询或响应校验失败', 500)
    }
  }
}
