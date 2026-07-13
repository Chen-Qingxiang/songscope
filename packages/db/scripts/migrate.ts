import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createPool } from '../src/client.js'

const directory = resolve(process.cwd(), 'packages/db/migrations')
const files = (await readdir(directory)).filter((file) => /^\d+.*\.sql$/.test(file)).sort()
const pool = createPool()

try {
  for (const file of files) {
    const sql = await readFile(resolve(directory, file), 'utf8')
    await pool.query(sql)
    console.log(`Applied packages/db/migrations/${file}`)
  }
} finally {
  await pool.end()
}
