# SongScope v0.2 实施计划

## 审计结论

当前 `main` 已贯通《宋史》卷 338“徙知密州”的最小证据链，但正式事实层只有一条 appointment 和一条推断 service episode。其余苏轼履历、地图、人物概要与搜索主要来自 `src/data/songData.ts` 的 prototype 数据。API 仅覆盖人物、单一时间轴、事件和断言证据，且前端在 API 失败时会静默混入 demo 数据。

现有 PostgreSQL/PostGIS、共享 Zod schema、repository 和 React 视图可以继续扩展，不需要全项目重写。v0.2 将保持三层边界：

1. `data/curated/` 是人工维护的版本化史料入口；
2. PostgreSQL/PostGIS 是受约束的事实层；
3. repository/API 和前端是可重建投影，不反向成为史料来源。

## 数据与模型判断

- 采用按实体类型拆分的 JSON 文件；由 `packages/schema` 的 dataset schema 一次校验跨文件引用、SID、accepted assertion 的支持证据和 appointment/service 分离。
- 导入器使用单事务、稳定 SID 与 `ON CONFLICT ... DO UPDATE`，并删除当前数据集版本管理范围内已经移除的记录，从而保证空库重建和重复导入结果一致。
- 保留原始历史日期表达、归一化边界、精度、认识状态、换算方法与说明。只由年号或编年映射得到年份时不生成月日。
- v0.2 不引入通用 EAV 替代强类型表；只补足真实苏轼案例需要的事件父子关系、事件关系、参与者、任命组件、任职/居住状态、来源反查和数据集版本。
- 《宋史》卷 338 的可定位原文是首要证据。电子转录本与点校本书目属于同一作品的不同载体，只有确有独立真实来源时才计作第二来源；不以重复载体凑双来源。
- 地图点明确标记为历史治所近似点或现代对应近似点，不表示古代行政区边界；路线只表示有证据的地点先后连接。

## 实施里程碑

### 1. Curated data 与导入

- 扩展共享 schema，加入 curated dataset、API response 和跨记录校验。
- 建立 `data/curated/{people,places,offices,sources,passages,assertions,events,appointments,service-episodes}`。
- 增加 `data:validate`、`data:import`、`db:reset`，以 curated data 替代手写历史 seed 作为主要维护入口。

### 2. 正式苏轼数据

- 建立杭州通判、密州/徐州/湖州徙知、乌台诗案、黄州团练副使与本州安置、黄州居住状态。
- 将徐州洪水与防洪响应建成相互关联的独立事件；将乌台诗案建成父事件和可查询子事件。
- 为每条正式时间轴记录建立 assertion、supporting evidence 和 source locator；精度不足时保留 year precision 与整理说明。

### 3. 查询与 API

- repository 支持人物、career、appointment components、service episode、复合事件、来源反查、证据角色、筛选、搜索与 dataset metadata。
- 提供并校验 `/health`、`/api/people/:sid`、`/api/people/:sid/career`、`/api/events/:sid`、`/api/assertions/:sid/evidence`、`/api/sources/:sid`、`/api/search?q=`。
- 统一 400/404/500 响应，并让成功响应包含 `datasetVersion`。

### 4. 前端

- 正式苏轼人物概要、五地时间轴、地图轨迹、事件关系、证据抽屉和来源详情全部由 API 提供。
- appointment、service、movement、political、disaster response 和 residence 使用不同标签；显示日期精度、推断/争议与地点解析状态。
- API 不可用时显示启动指引；本轮正式范围不回退到 demo。未迁移视图继续存在时必须明确标为 prototype。

### 5. 开发体验、验证与交付

- 增加 `dev:all`、`verify`、`.env.example`、README 启动和故障排查说明。
- 补齐 schema、curated validation、幂等导入、PostGIS、repository、API 和前端适配测试。
- 从空库执行 migration/import，两次导入比对确定性；运行 typecheck、unit、DB、build 并完成代码与数据自审。
- 分里程碑提交；GitHub 可用时推送 PR，等待并修复 CI，全部绿色后合并。

## 基线（2026-07-13，Australia/Sydney）

- `npm test`：通过，3 个测试文件、8 个测试。
- `npm run typecheck`：当前桌面进程在约 100 MB V8 heap 时 `Zone Allocation failed`；属于本地 Node 运行时内存限制，代码诊断尚未开始。
- `npm run build`：同样因本地 V8 heap 限制失败。
- `npm run test:db`：未执行；当前 shell 找不到 `docker`、`podman`、`psql` 或本机 PostgreSQL 服务。CI 已配置 PostGIS 16，可作为数据库验证环境；本地仍需提供清晰诊断和启动说明。

以上环境问题不改变质量门槛；实现完成后仍须取得对应的有效验证结果。
