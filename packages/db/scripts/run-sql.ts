import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createPool } from '../src/client.js'

const file = process.argv[2]
if (!file) throw new Error('Usage: tsx packages/db/scripts/run-sql.ts <file>')
const pool = createPool()
try {
  const sql = await readFile(resolve(process.cwd(), file), 'utf8')
  await pool.query(sql)
  console.log(`Applied ${file}`)
} finally {
  await pool.end()
}
