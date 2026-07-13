import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('v0.3 formal runtime boundary', () => {
  it('uses the six corpus-first primary navigation entries', () => {
    const app = readFileSync('src/App.tsx', 'utf8')
    for (const label of ['史料', '检索', '纪事', '实体', '研究查询', '数据版本']) {
      expect(app).toContain(`label: '${label}'`)
    }
    for (const legacy of ['时间轴', '历史地图', '人物网络', '数据模型']) {
      expect(app).not.toContain(`label: '${legacy}'`)
    }
  })

  it('does not retain the prototype songData runtime or import it from the formal entry graph', () => {
    expect(existsSync('src/data/songData.ts')).toBe(false)
    for (const path of ['src/App.tsx', 'src/pages/CorpusFirstPages.tsx', 'src/lib/researchApi.ts']) {
      expect(readFileSync(path, 'utf8')).not.toContain('songData')
    }
  })

  it('keeps generated corpus files out of the initial application source bundle', () => {
    const adapter = readFileSync('src/lib/researchApi.ts', 'utf8')
    expect(adapter).not.toMatch(/from ['"].*data\/corpus/)
    expect(adapter).toContain('getStaticCorpusJson')
    expect(readFileSync('package.json', 'utf8')).toContain('npm run corpus:static && tsc -b && vite build')
  })
})
