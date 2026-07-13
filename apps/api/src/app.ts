import {
  assertionEvidenceResponseSchema,
  careerTimelineResponseSchema,
  eventResponseSchema,
  hasSidPrefix,
  personResponseSchema,
  searchResponseSchema,
  sidSchema,
  sourceResponseSchema
} from '@songscope/schema'
import type { CareerFilters, SongScopeRepository } from '@songscope/db/src/repository.js'

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
