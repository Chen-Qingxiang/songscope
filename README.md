# 观宋 · SongScope v0.2

SongScope 是一个证据可追溯、可统计、可校勘的宋史数字研究平台。v0.2 以苏轼为首个可本地使用的纵向样本，正式数据覆盖杭州、密州、徐州、湖州、黄州连续仕宦，以及徐州洪水、乌台诗案和黄州安置。

在线只读版可直接打开：<https://chen-qingxiang.github.io/songscope/>。GitHub Pages 构建会内置 `data/curated/` 的 verified 数据快照，因此浏览地图、时间轴、搜索和证据链不需要在本地运行 Node.js、PostgreSQL 或 `npm run dev`。

项目规范见 [`docs/design-book/README.md`](docs/design-book/README.md)，本轮架构判断见 [`docs/implementation-v0.2.md`](docs/implementation-v0.2.md)。

## 一条命令启动

前置条件：Node.js 22+、Docker Desktop（含 Docker Compose）。

```bash
npm install
npm run dev:all
```

`dev:all` 会：

1. 启动 PostGIS 16；
2. 执行全部 migration；
3. 校验并导入 `data/curated/`；
4. 启动 API 和 Vite 前端。

打开：

- 前端：<http://localhost:5173/songscope/>
- API 健康检查：<http://localhost:8787/health>

按 `Ctrl+C` 停止 API 和前端。数据库容器保留，便于下次启动；需要停止时运行 `docker compose stop db`。

## 手动启动

```bash
docker compose up -d db
```

设置数据库连接：

```powershell
$env:DATABASE_URL='postgres://songscope:songscope@localhost:5432/songscope'
```

```bash
npm run db:reset
npm run dev:api
npm run dev
```

`.env.example` 只记录无秘密的本地默认值。项目不自动提交或读取 `.env`。

## Curated data 工作流

人工整理的正式史料位于：

```text
data/curated/
  people/
  places/
  offices/
  sources/
  passages/
  assertions/
  events/
  appointments/
  service-episodes/
```

这些 JSON 文件是 v0.2 种子史料的主要维护入口；`packages/db/seeds/001_mizhou.sql` 只保留为 v0.1 历史参考，不再由 `db:seed` 使用。

增加或修改记录后运行：

```bash
npm run data:validate
npm run data:import
```

校验会报告具体字段路径，并检查：SID 唯一与引用完整性、accepted assertion 的 supporting evidence、appointment/service 分离、原始日期和换算方法。导入在单一事务内重建数据集；失败会回滚，重复执行不会产生重复记录，内容哈希和 dataset version 会保持一致。

## 正式数据范围

- 通判杭州；
- 徙知密州、徙知徐州、徙知湖州；
- 徐州洪水与苏轼组织防洪两个相互关联的事件；
- 乌台诗案父事件、逮捕、台狱审讯与黄州处分子事件；
- 黄州团练副使官名、本州安置状态、赴黄州迁徙和黄州实际居住；
- appointment action、appointment component、service/residence episode、event、assertion、evidence 和 source locator 完整分层。

人物网络与部分总览统计仍明确标记为 `prototype`，不属于 verified dataset，不应作为研究结论引用。

## API

稳定端点：

```text
GET /health
GET /api/people/:sid
GET /api/people/:sid/career
GET /api/events/:sid
GET /api/assertions/:sid/evidence
GET /api/sources/:sid
GET /api/search?q=
```

career 支持 `from`、`to`、`place`、`type` 过滤；`/timeline` 暂作为兼容别名。所有成功研究响应包含 `datasetVersion`，输出由 `packages/schema` 运行时校验。无效 SID/查询返回 400，不存在记录返回 404，数据库或响应校验错误返回明确 500。

## 验证

有可用 `DATABASE_URL` 时执行完整门槛：

```bash
npm run verify
```

等价于：

```bash
npm run data:validate
npm run typecheck
npm test
npm run test:db
npm run build
```

数据库变更还应从空数据库执行 `npm run db:reset`，再重复运行 `npm run data:import` 验证幂等性。GitHub CI 使用 PostGIS 16 完成同样流程。

## 故障排查

### 找不到 Docker

若 `npm run dev:all` 提示找不到 Docker CLI，请安装并启动 Docker Desktop，确认 `docker --version` 与 `docker compose version` 可用，然后重新运行。脚本不会在 Docker 缺失时把 demo 数据伪装成正式结果。

### 端口被占用

- PostgreSQL：检查 `5432`；
- API：可设置 `API_PORT`；
- Vite：会提示备用端口，按终端给出的 URL 打开。

### 前端显示 API error

访问 <http://localhost:8787/health>。若失败，检查 `DATABASE_URL`、容器健康状态，并重新执行 `npm run db:reset`、`npm run dev:api`。正式苏轼视图不会静默回退到 prototype。

### 本地 Node 进程内存不足

避免同时并行启动多个 TypeScript 构建进程；顺序运行验证。必要时临时设置 `NODE_OPTIONS=--max-old-space-size=4096`，但不得用跳过 typecheck 或 build 代替修复。

## 史料范围

首要来源是《宋史》卷三百三十八·苏轼传；另以苏辙《亡兄子瞻端明墓志铭》（《栾城集》后集卷二十二）互证，并用李正平《苏轼法书》中可定位的年谱样章进行年级归一。每一条正式记录均保存具体卷次/段落或页码、原文摘录、整理说明、日期精度和换算方法。

地点坐标均标记为现代对应近似点，不表示北宋行政区边界。迁徙连线只表示来源支持的地点先后，不表示实际道路。

## License

代码采用 [MIT License](LICENSE)。历史数据再利用还须遵守各来源载体的授权与引用要求。
