import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createPool } from '@songscope/db/src/client.js'
import { PostgresSongScopeRepository } from '@songscope/db/src/repository.js'
import { createRequestHandler } from './app.js'

const pool = createPool()
const handle = createRequestHandler(new PostgresSongScopeRepository(pool))
const port = Number(process.env.API_PORT ?? 8787)

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  try {
    const request = new Request(`http://${req.headers.host ?? `localhost:${port}`}${req.url ?? '/'}`, {
      method: req.method,
      headers: req.headers as HeadersInit
    })
    const response = await handle(request)
    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((value, key) => { responseHeaders[key] = value })
    res.writeHead(response.status, responseHeaders)
    res.end(Buffer.from(await response.arrayBuffer()))
  } catch (error) {
    console.error(error)
    res.writeHead(500, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: 'internal_error' }))
  }
})

server.listen(port, () => console.log(`SongScope API listening on http://localhost:${port}`))

async function shutdown() {
  server.close()
  await pool.end()
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
