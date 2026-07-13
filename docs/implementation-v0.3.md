# SongScope v0.3 实施契约：Corpus-first 《宋史》纪事索引

## 1. 契约状态

- 状态：`approved-for-implementation`
- 目标版本：`0.3.0`
- 产品规范：[`design-book/11-corpus-first-product.md`](design-book/11-corpus-first-product.md)
- 前置基线：v0.2 苏轼杭州至黄州证据集
- 适用范围：下一轮 corpus-first 功能分支

本文件定义一个可在单个长任务中完成和验证的纵向切片，不代表 SongScope 的最终形态。

## 2. 唯一目标

> 将 SongScope 从以苏轼为默认中心的展示型原型，改造成以《宋史》原文浏览、检索、稳定段落、证据反查和版本化研究查询为主流程的 v0.3 最小可用产品。

本轮不是“再增加一个全文页面”。原文 passage 必须成为数据库、API、前端、断言和导出的共同定位基础。

## 3. 批准的数据范围

### 3.1 原始语料层

| 项目 | v0.3 决定 |
| --- | --- |
| 抽象作品 | 脱脱等《宋史》 |
| 电子转录载体 | 中文维基文库《宋史》目录及逐卷页面 |
| 目录入口 | <https://zh.wikisource.org/wiki/宋史> |
| 目录基线 | 固定 revision `2535238`；实现时还必须记录 API 返回的 page/revision 元数据 |
| 预期结构 | 本纪、志、表、列传、附录；496 卷 |
| 实际导入 | 固定目录 revision 中发现且能取得有效文本的所有卷页 |
| 缺失处理 | 生成机器可读 coverage report；获取失败、缺卷、重复和空文本不得静默忽略 |
| 原作状态 | 元代《宋史》原作属于公有领域；仍须保留作者和作品信息 |
| 网页文字 | 按中文维基文库页面标示处理署名与 CC BY-SA 4.0 等适用条款；逐页保留 URL/历史入口和许可元数据 |
| 研究地位 | digital transcription；不是权威点校本，不自动产生 accepted assertion |

来源许可依据与再利用注意见 [`design-book/references.md`](design-book/references.md)。如实际页面的页脚、历史页或许可标记与本契约不同，以逐页记录的适用条款为准并更新契约，不得静默抓取。

来源对象的边界固定如下：目录页和每个逐卷页分别是一个 revision-specific `SourceItem`；`manifest.json` 及其内容哈希定义一次 `CorpusSnapshot`，负责把目录 item、逐卷 item、缺失项和处理规则绑定为同一可复现输入。目录 revision `2535238` 只固定目录结构，不替代逐卷页面各自的 revision。

### 3.2 连续结构化层

首个结构化范围：

- 《宋史》卷十四：本纪第十四，神宗一；
- 《宋史》卷十五：本纪第十五，神宗二；
- 《宋史》卷十六：本纪第十六，神宗三。

本轮对这三卷完成：

- 稳定 passage 分段与顺序；
- 原始纪年表达候选标注；
- 人物、地点、机构、官职和事件词候选标注；
- 除授动作词候选标注；
- 至少一种可复现的纪事投影；
- 人工审核状态和候选/正式数据隔离。

自动抽取结果只能是 `candidate` annotation 或 `proposed` assertion。除既有 v0.2 人工整理记录外，本任务不得自行把新增历史断言标为 `accepted`。

### 3.3 既有正式回归层

v0.2 苏轼数据继续保留：

- 作为 appointment/service/event/evidence 模型回归集；
- 卷338 现有 locator 必须迁移或映射到 passage；
- 既有 accepted assertion 不得因 passage 迁移失去支持证据；
- 苏轼可以作为专题入口，但不得继续是首页、全局状态、默认时间轴或唯一人物路径。

### 3.4 Prototype 层

`src/data/songData.ts` 及其衍生统计不得继续进入正式运行路径。

若旧组件仍需用于开发参考，应移入明确的 fixture/prototype 边界，且不能：

- 在生产首页提供数字；
- 在 API 或静态部署失败时伪装成正式数据；
- 与 verified/candidate 数据合并显示；
- 被搜索、导出或研究查询使用。

## 4. 获取、固定与导入

### 4.1 三步分离

```text
network acquisition
→ versioned local snapshot + manifest
→ offline validation/import/build
```

建议脚本边界：

```text
npm run corpus:acquire     # 显式联网，更新固定快照
npm run corpus:validate    # 只读本地快照
npm run corpus:import      # 只读本地快照，写 PostgreSQL
npm run corpus:coverage    # 生成/核对覆盖报告
```

正常 `db:reset`、测试和 build 不得访问网络。

### 4.2 本地快照

建议目录：

```text
data/corpus/songshi-wikisource/
  manifest.json
  coverage.json
  units.json
  volumes/
    001.json
    ...
    496.json
```

具体拆分可以根据仓库体积调整，但必须满足：

- 文本输入进入版本控制或等价的固定、可校验构建输入；
- `manifest.json` 保存目录 revision、每页 page ID、revision ID、canonical URL、retrieval metadata、license、attribution URL、checksum 和状态；
- `coverage.json` 保存 expected/discovered/acquired/validated/segmented/searchable 的数量和异常明细；
- 重复运行 acquisition 且上游 revision 未变时，不产生内容漂移；
- acquisition 发现 revision 变化时，不覆盖而不报告；
- importer 不读取实时网页。

若完整文本不适合直接提交 Git，应先提交明确 ADR，选择带内容寻址、校验和与可复现下载的替代存储；不得临时依赖“运行时再抓一次”。

### 4.3 内容处理

获取层允许去除 MediaWiki 导航模板和页面装饰，但必须：

- 保存或能重建载体正文；
- 记录抽取规则与版本；
- 不把简繁转换结果写回 source text；
- 不用模型改写、补字或补标点；
- 保留无法解析的文本并报告，不静默删除；
- 对卷名、篇类和顺序使用目录结构，不靠模型猜测。

## 5. Schema 与数据库交付物

### 5.1 共享 schema

新增或扩展 `packages/schema`，至少表达：

- corpus/source item revision metadata；
- `CorpusSnapshot` 或具有同等约束的 manifest projection；
- `SourceUnit`；
- `SourcePassage`；
- `TextAnnotation`；
- corpus coverage report；
- passage search/detail API projection；
- entity-to-passage backlink；
- research query result and export metadata。

所有 corpus JSON、数据库输入、API 输出和静态前端投影继续使用同一规范 schema 校验。

### 5.2 PostgreSQL

在现有事实层上增量迁移，至少支持：

```text
source_item revision/license metadata
corpus_snapshot and source_item membership
source_unit hierarchy and sequence
source_passage text and checksum
text_annotation span and review status
passage-aware source_locator
passage/entity/assertion indexes
full-text search projection
corpus coverage metadata
```

约束：

- 继续使用 PostgreSQL + PostGIS；
- 不用一张通用 EAV 表替代强类型领域表；
- `SourcePassage` 删除或更新不得使 accepted evidence 悬空；
- 一个逐卷 `SourceItem` 只能属于声明了它的 snapshot，且 page ID、revision ID 与 checksum 必须匹配 manifest；
- `work_division` unit 可以由目录 item 承载，逐卷 `juan` unit 可以由对应卷页 item 承载；跨 item 父子关系必须显式校验作品、snapshot 和目录成员一致；
- passage 的 `(unit, sequence)` 唯一；
- annotation 的文本跨度必须落在 passage 内，surface text 必须与跨度一致；
- accepted assertion 仍必须至少有一条 supporting evidence；
- candidate annotation 不等于 assertion；
- 原有 SID 保持稳定，卷338 locator 迁移必须可追踪。

### 5.3 建议 SID

在不破坏现有 SID 规则的前提下使用可读、稳定的来源型 SID，例如：

```text
source:work:songshi
source:item:songshi-wikisource:index:r2535238
source:item:songshi-wikisource:juan014:r<revisionId>
source:unit:songshi-wikisource:index:r2535238:benji
source:unit:songshi-wikisource:juan014:r<revisionId>
source:passage:songshi-wikisource:juan014:r<revisionId>:0001
corpus:snapshot:songshi-wikisource:<manifestHash>
```

SID 不得包含会随页面标题格式化或简繁转换变化的临时文本。同一固定 revision 和分段规则的 SID 必须稳定；上游 revision 变化时生成新的 revision-specific item、unit 和 passage，旧证据定位继续保留，不得让原 SID 静默指向新文本。

## 6. API 契约

稳定端点至少包括：

```text
GET /api/corpus
GET /api/corpus/:sourceItemSid/units
GET /api/units/:sid/passages
GET /api/passages/:sid
GET /api/search/text?q=&division=&juan=&status=
GET /api/entities/:sid/passages
GET /api/research/annals?from=&to=&status=
GET /api/datasets/:version/coverage
```

可以在实现中调整路径命名，但必须覆盖相同查询语义，并在 README 中记录。

响应要求：

- 全部成功响应包含 `datasetVersion`；
- corpus 响应还包含 source revision 或 corpus snapshot version；
- 搜索响应返回上下文、passage SID、卷次、顺序和命中跨度；
- 文本搜索结果明确标为 occurrence，不得称作事件或任命统计；
- passage detail 返回原文、层级、相邻 passage、标注、相关断言、来源和许可/署名入口；
- entity backlink 区分字符串候选、已消歧标注和 accepted assertion；
- coverage 响应列出缺失和异常，不只返回百分比；
- API 错误不得回退到 prototype。

## 7. 前端交付物

### 7.1 一级导航

v0.3 一级导航采用：

- 史料；
- 检索；
- 纪事；
- 实体；
- 研究查询；
- 数据版本。

时间轴、地图、网络和数据模型不再作为固定一级产品入口。

### 7.2 首页

首页必须优先显示：

- 《宋史》原文搜索；
- 本纪、志、表、列传入口；
- 当前 corpus snapshot 和数据集版本；
- expected/discovered/acquired/validated/searchable/reviewed 覆盖摘要；
- 神宗本纪结构化切片入口；
- 代表性研究查询。

首页不得显示来自 prototype 的人物、地点、作品或关系统计。

### 7.3 史料阅读页

必须支持：

- 按篇类与卷浏览；
- passage 顺序阅读；
- 上一段/下一段；
- 显示原始文本而非只显示现代摘要；
- 显示卷次、页面 revision、数据版本和稳定引用；
- 显示候选标注、审核状态和整理说明；
- 跳转实体、断言和相关 passage；
- 查看许可与署名入口。

### 7.4 检索页

必须支持：

- 原文检索；
- 篇类、卷次和审核状态过滤；
- 命中上下文；
- 结果总数和覆盖范围；
- 可分享或可重放的查询参数；
- CSV/JSON 导出，包含 passage SID、定位、原文上下文、状态和版本。

### 7.5 纪事与研究查询

神宗本纪纪事页以原始纪年和 passage 顺序为骨架。不能确定公历月日时，不生成伪精确日期。

正式研究查询至少包括：

1. 神宗本纪卷十四至十六的原始纪年条目；
2. 全部固定语料中的“徙知”文本命中；
3. 神宗本纪中的除授动作词候选及审核状态；
4. 某实体在神宗本纪与既有卷338切片中的 passage 反查；
5. corpus 覆盖和数据质量报告。

表格是默认结果。只有查询定义、覆盖范围和追溯链完整时，才增加时间轴或其他可视化。

### 7.6 静态部署

GitHub Pages 可以使用由同一 schema 校验、从同一固定输入生成的静态研究投影，但必须：

- 与 API 模式共享响应 schema；
- 显示相同 dataset/corpus version；
- 不混入 prototype；
- 搜索和 passage 导航在静态模式下具有明确支持范围；
- 构建静态数据的命令可复现。

## 8. 代表性端到端验收

### 场景 A：从目录阅读

```text
首页
→ 本纪
→ 卷十四 神宗一
→ 任一 passage
→ 查看原文、卷次、revision、前后文、标注和状态
→ 复制稳定引用
```

### 场景 B：从全文命中研究

```text
检索“徙知”
→ 查看全部已固定语料中的文本命中
→ 按篇类或卷过滤
→ 打开上下文 passage
→ 区分词语命中、候选 appointment 与 accepted assertion
→ 导出带版本和定位的结果
```

### 场景 C：从既有断言返回原文

```text
打开现有“苏轼徙知密州” accepted assertion
→ 查看 supporting evidence
→ 打开卷338对应 passage
→ 查看来源 revision、原文和稳定定位
→ 返回断言
```

### 场景 D：理解覆盖范围

```text
打开数据版本
→ 查看预期496卷
→ 查看实际发现、取得、校验、分段和可检索数量
→ 查看缺失/异常卷清单
→ 查看神宗本纪候选、reviewed、accepted 数量
```

## 9. 自动测试

除 AGENTS.md 既有门槛外，至少增加：

1. 固定 source item revision 和 license/attribution metadata 完整；
2. manifest SID、page ID、revision ID 和 checksum 唯一且稳定；
3. coverage expected/discovered/acquired/validated/segmented/searchable 数量一致且异常可追踪；
4. passage `(unit, sequence)` 唯一，checksum 与 source text 一致；
5. 相同输入重复分段产生相同 SID 与顺序；
6. annotation offsets 有效且 surface text 匹配；
7. candidate annotation 不会进入 accepted assertion 投影；
8. 既有 accepted assertion 全部仍有 supporting evidence；
9. 卷338旧 locator 可以解析到 passage；
10. “徙知”搜索结果被标为 occurrence；
11. 搜索过滤与总数快照正确；
12. passage 相邻导航、实体反查和断言反查正确；
13. API 与静态投影均通过共享 schema；
14. 正式前端不导入 prototype runtime 数据；
15. 空库 migration/import 与第二次 import 的内容哈希一致。

## 10. 实施 checkpoints

### Checkpoint 0：基线与计划

- 从最新 `main` 创建功能分支；
- 审计 v0.2 API、静态数据路径、数据库和 prototype 依赖；
- 运行能运行的基线验证；
- 确认 corpus 获取计划、预计体积和许可元数据；
- 若预计快照不适合 Git，先提交 ADR，不得边写边临时改存储策略。

### Checkpoint 1：语料 schema 与固定输入

- 完成共享 corpus schema；
- 完成 acquisition、manifest、coverage 和本地快照；
- 对卷十四至十六及卷338完成稳定 passage；
- 验证重复获取和重复分段稳定。

### Checkpoint 2：数据库与导入

- 新增 migration、约束和索引；
- 完成 corpus importer；
- 迁移卷338 locator；
- 从空库重建并验证幂等性。

### Checkpoint 3：查询与 API

- 完成目录、卷、passage、全文搜索、实体反查、纪事和 coverage 查询；
- 完成共享 API schema 和错误处理；
- 完成 API 测试。

### Checkpoint 4：研究界面

- 替换一级导航和首页；
- 完成史料阅读、检索、passage、纪事、实体反查、研究查询和数据版本页面；
- 隔离 prototype；
- 完成 API 与 GitHub Pages 静态投影双路径。

### Checkpoint 5：验证与交付

- 更新 README、roadmap、设计书和来源说明；
- 运行完整验证；
- 检查 UI 中每项历史陈述的回溯链；
- 检查覆盖率、状态标签和许可署名；
- 形成限制清单和干净工作区。

每个 checkpoint 应形成有意义的提交和简短进度记录。

## 11. 验证命令

至少运行：

```bash
npm run corpus:validate
npm run data:validate
npm run typecheck
npm test
npm run test:db
npm run build
```

涉及数据库时还必须：

```bash
npm run db:reset
npm run corpus:import
npm run data:import
npm run corpus:import
```

比较第二次导入前后的 corpus/dataset content hash，证明幂等性。若最终脚本边界与建议命名不同，README 必须给出等价命令，且 `npm run verify` 应覆盖全部非联网验证。

## 12. 完成定义

只有以下条件全部满足，v0.3 才算完成：

1. 首页以《宋史》史料、检索和覆盖范围为中心；
2. 固定目录中的实际可用卷页已取得、校验并形成 coverage report；
3. 用户能浏览篇类、卷和 passage，并看到原文、revision、状态和稳定引用；
4. 用户能全文搜索并明确区分 occurrence、candidate 和 accepted assertion；
5. 卷十四至十六形成连续纪事阅读和候选标注切片；
6. 既有卷338苏轼 accepted 数据可从断言返回 passage，且证据链无回归；
7. 实体可以反查 passage；研究查询可以导出版本和定位；
8. 正式运行路径不再依赖 `src/data/songData.ts` prototype；
9. API 与 GitHub Pages 静态模式消费同一受校验投影；
10. 空库重建、重复导入和全部验证命令通过；
11. 文档准确描述实际覆盖、许可、审核状态和限制；
12. 工作区干净，里程碑提交清晰。

## 13. 必须暂停的情况

只有出现以下情况才应暂停并请求用户决定：

- 中文维基文库逐页实际许可与本契约无法相容；
- 496 卷快照体积要求选择 Git 之外的持久存储；
- source revision 无法可靠固定；
- 卷十四至十六的载体文本缺失或严重损坏，无法形成连续切片；
- 需要改变 `Assertion`、`Evidence`、`TemporalExtent` 或 `Appointment` 的既有语义；
- 需要新增会显著改变部署或运维方式的生产依赖。

普通实现困难、测试失败或需要多轮修复不构成降低完成标准的理由。

## 14. 已知限制

- 中文维基文库是协作式电子转录，不能替代权威点校本；
- 全文可检索覆盖不等于结构化或人工审校覆盖；
- 神宗本纪是朝廷纪事视角，不等于宋代社会全貌；
- 自动实体和事件候选可能有大量误报与漏报；
- v0.3 不承诺完整公历换算、全书消歧或跨史料校勘；
- 新增候选只有经人工审核后才能进入 accepted 数据。
