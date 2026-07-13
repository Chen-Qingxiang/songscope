import { spawn } from 'node:child_process'

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const databaseUrl = process.env.DATABASE_URL ?? 'postgres://songscope:songscope@localhost:5432/songscope'

function run(command: string, args: string[], env = process.env): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', env, shell: false })
    child.on('error', reject)
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} exited with ${code}`)))
  })
}

async function waitForDatabase() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      await run('docker', ['compose', 'exec', '-T', 'db', 'pg_isready', '-U', 'songscope', '-d', 'songscope'])
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }
  throw new Error('PostgreSQL/PostGIS did not become ready within 60 seconds')
}

try {
  await run('docker', ['--version'])
} catch {
  throw new Error('找不到 Docker CLI。请安装并启动 Docker Desktop，然后重新运行 npm run dev:all。')
}

await run('docker', ['compose', 'up', '-d', 'db'])
await waitForDatabase()
const env = { ...process.env, DATABASE_URL: databaseUrl }
await run(npm, ['run', 'db:reset'], env)

const api = spawn(npm, ['run', 'dev:api'], { stdio: 'inherit', env, shell: false })
const web = spawn(npm, ['run', 'dev'], { stdio: 'inherit', env, shell: false })

console.log('SongScope v0.2: web http://localhost:5173/songscope/ · API http://localhost:8787/health')

function shutdown() {
  api.kill()
  web.kill()
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

await Promise.race([
  new Promise<void>((resolve, reject) => api.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`API exited with ${code}`)))),
  new Promise<void>((resolve, reject) => web.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`Web exited with ${code}`))))
])
shutdown()
