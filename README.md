# 观宋 · SongScope v0.3

SongScope 是一个证据可追溯、可统计、可校勘的宋史数字研究平台。v0.3 的默认研究对象是固定版本的《宋史》原文语料，而不是某一位人物或装饰性可视化。

当前版本提供：496 卷中文维基文库《宋史》固定转录、39,924 个稳定 passage、全文检索、卷十四至十六神宗本纪候选标注、卷338既有 accepted assertion 证据回链、版本化研究查询和覆盖报告。

在线只读版：<https://chen-qingxiang.github.io/songscope/>。GitHub Pages 使用从同一固定输入生成、经共享 schema 校验的静态研究投影；不需要运行 API 或 PostgreSQL，也不会回退到 demo 数据。

规范性设计见 [`docs/design-book/README.md`](docs/design-book/README.md)，v0.3 产品定义见 [`docs/design-book/11-corpus-first-product.md`](docs/design-book/11-corpus-first-product.md)，实施契约与实录见 [`docs/implementation-v0.3.md`](docs/implementation-v0.3.md) 和 [`docs/v0.3-progress.md`](docs/v0.3-progress.md)。

## 当前数据边界

| 层次 | v0.3 覆盖 | 状态 |
| --- | --- | --- |
| 原始语料 | 《宋史》目录及卷1—496 | 496 卷均已取得、校验、分段并可检索 |
| 稳定定位 | 逐卷 `SourceItem`、`SourceUnit`、`SourcePassage` | 39,924 passages，保留 revision、checksum、许可和署名入口 |
| 连续结构化切片 | 卷14—16神宗本纪 | 1,340 条规则生成的 candidate annotation；reviewed 为0 |
| 既有正式回归集 | 苏轼杭州至黄州、徐州洪水、乌台诗案等 | v0.2 的19条 accepted assertion、57条 evidence link 保留 |
| passage 证据迁移 | 《宋史》卷338旧 locator | 映射到 revision 1458054 的稳定 passages 20、21、23、24 |

`candidate` 不是历史断言，`validated/searchable` 也不等于人工校勘完成。v0.3 没有把新增自动抽取结果升级为 `accepted`。

## 一条命令启动

前置条件：Node.js 22+、Docker Desktop（含 Docker Compose）。

```bash
npm install
npm run dev:all
```

`dev:all` 会启动 PostGIS 16，执行 migration，校验并导入 curated 数据与固定 corpus，然后启动 API 和 Vite：

- 前端：<http://localhost:5173/songscope/>
- API 健康检查：<http://localhost:8787/health>

按 `Ctrl+C` 停止 API 与前端；数据库容器会保留。需要停止数据库时运行 `docker compose stop db`。

## 手动启动

```bash
docker compose up -d db
```

设置数据库连接，例如 PowerShell：

```powershell
$env:DATABASE_URL='postgres://songscope:songscope@localhost:5432/songscope'
```

然后运行：

```bash
npm run db:reset
npm run dev:api
npm run dev
```

`.env.example` 只包含无秘密的本地默认值；不要提交 `.env`、密码或 Token。

## Corpus 工作流

网络获取、固定输入和离线使用严格分离：

```text
network acquisition
→ versioned local snapshot + manifest
→ offline validation/import/build
```

命令：

```bash
npm run corpus:acquire    # 唯一需要联网的步骤；显式更新固定快照
npm run corpus:validate   # 只读本地快照并校验跨文件引用、checksum、跨度和覆盖
npm run corpus:coverage   # 输出机器可读 coverage report
npm run corpus:import     # 从本地快照幂等写入 PostgreSQL
npm run corpus:static     # 生成 API 等价的静态研究投影到 public/corpus/
```

固定输入位于 `data/corpus/songshi-wikisource/`：

```text
manifest.json
directory.json
units.json
coverage.json
volumes/001.json … 496.json
```

当前 snapshot SID 是 `corpus:snapshot:songshi-wikisource:f3b6041f6161819b`，corpus version 是 `songshi-wikisource-r2535238-f3b6041f6161`。目录固定 revision `2535238`，每个卷页另有各自的 page ID、revision ID、URL、history URL、attribution URL、许可和正文 checksum。

正常的 `db:reset`、测试和 build 不访问网络。`public/corpus/` 是可重复生成的构建产物，不进入 Git；前端按卷和检索分片懒加载，完整语料不会进入首屏 JavaScript bundle。

## Curated data 工作流

v0.2 人工整理的正式回归数据位于 `data/curated/`。修改后运行：

```bash
npm run data:validate
npm run data:import
```

校验覆盖 SID 唯一与引用完整性、accepted assertion 的 supporting evidence、appointment/service 分离、原始日期和换算方法。导入在事务内确定性重建；失败回滚，重复执行不产生重复记录。

## 研究界面

v0.3 的六个一级入口是：

- **史料**：按本纪、志、表、列传浏览卷与 passage，查看原始文本、可读投影、相邻段落、revision、候选标注、证据回链和稳定引用；
- **检索**：精确原文检索，支持篇类、卷次、审核状态过滤，以及带版本和 passage SID 的 CSV/JSON 导出；
- **纪事**：卷14—16神宗本纪的原文顺序投影，不生成来源无法支持的伪精确公历日期；
- **实体**：分开显示字符串出现、已消歧标注和 accepted assertion 证据回链；
- **研究查询**：运行有明确范围、统计单位和版本的代表性查询；
- **数据版本**：查看 expected/discovered/acquired/validated/segmented/searchable/reviewed、异常、来源和许可。

旧 `songData.ts` 总览、地图和人物网络 prototype 已从正式运行代码删除。苏轼只作为既有人工整理模型与证据链的回归实体保留。

## API

Corpus-first 稳定端点：

```text
GET /api/corpus
GET /api/corpus/:sourceItemSid/units
GET /api/units/:sid/passages?offset=&limit=
GET /api/passages/:sid
GET /api/search/text?q=&division=&juan=&status=&offset=&limit=
GET /api/entities/:sid/passages
GET /api/research/annals?fromJuan=&toJuan=&status=
GET /api/datasets/:version/coverage
```

v0.2 兼容端点继续提供人物、仕宦、事件、断言证据、来源和实体搜索：

```text
GET /health
GET /api/people/:sid
GET /api/people/:sid/career
GET /api/events/:sid
GET /api/assertions/:sid/evidence
GET /api/sources/:sid
GET /api/search?q=
```

全部成功研究响应包含 `datasetVersion`；corpus 响应还包含 `corpusVersion` 与 `snapshotSid`。输出经 `packages/schema` 运行时校验。无效查询返回400，不存在记录返回404，数据库或响应校验错误返回明确500；API 错误不会回退到 prototype。

## 验证

设置可用 `DATABASE_URL` 后运行完整门槛：

```bash
npm run verify
```

等价于：

```bash
npm run corpus:validate
npm run data:validate
npm run typecheck
npm test
npm run test:db
npm run build
```

涉及数据库变更时，还必须从空 PostGIS 数据库执行：

```bash
npm run db:reset
npm run corpus:import
npm run data:import
npm run corpus:import
```

比较第二次导入前后的 dataset/corpus hash、passage 和 annotation 数量，确认幂等。数据库测试在没有 `DATABASE_URL` 时会 skip；这不满足发布门槛，CI 和正式验收必须看到真实执行的通过结果。

## 来源、许可与限制

原作是脱脱等编纂的元代《宋史》。电子转录来自中文维基文库，当前逐页元数据记录为 CC BY-SA 4.0，并保留固定 revision、页面历史和署名入口。代码采用 [MIT License](LICENSE)；语料再利用仍须遵守载体的署名与相同方式共享要求。

中文维基文库是协作式 digital transcription，不能替代权威点校本。全文可检索不等于人工审校；自动实体、纪年、官职、除授和事件词候选可能误报或漏报。v0.3 不承诺全书实体消歧、完整公历换算、跨史料校勘或全宋社会史覆盖。

地点、日期、官职、任命、任职阶段和因果解释仍遵守设计书的分层规则：无法确定时明确标记 unknown、approximate、inferred 或 disputed，不从搜索摘要或模型输出制造历史事实。
