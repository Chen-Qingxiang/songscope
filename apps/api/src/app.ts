import { careerTimelineResponseSchema } from '@songscope/schema'
import type { SongScopeRepository } from '@songscope/db/src/repository.js'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type'
    }
  })
}

export function createRequestHandler(repository: SongScopeRepository) {
  return async function handle(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') return json({}, 204)
    if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405)

    const url = new URL(request.url)
    const path = decodeURIComponent(url.pathname)
    if (path === '/health') return json({ ok: true, service: 'songscope-api' })

    const timelineMatch = path.match(/^\/api\/people\/(person:[^/]+)\/timeline$/)
    if (timelineMatch) {
      const result = await repository.getCareer(timelineMatch[1])
      if (!result) return json({ error: 'not_found' }, 404)
      return json(careerTimelineResponseSchema.parse(result))
    }

    const personMatch = path.match(/^\/api\/people\/(person:[^/]+)$/)
    if (personMatch) {
      const result = await repository.getPerson(personMatch[1])
      return result ? json(result) : json({ error: 'not_found' }, 404)
    }

    const eventMatch = path.match(/^\/api\/events\/(event:[^/]+)$/)
    if (eventMatch) {
      const result = await repository.getEvent(eventMatch[1])
      return result ? json(result) : json({ error: 'not_found' }, 404)
    }

    const assertionMatch = path.match(/^\/api\/assertions\/(assertion:[^/]+)\/evidence$/)
    if (assertionMatch) {
      const result = await repository.getAssertionEvidence(assertionMatch[1])
      return result ? json(result) : json({ error: 'not_found' }, 404)
    }

    return json({ error: 'not_found' }, 404)
  }
}
