# 08　存储、查询与系统架构

## 8.1 当前技术决策

第一阶段以 **PostgreSQL + PostGIS** 作为事实层，而不是直接以图数据库或 RDF 三元组库作为唯一存储。

原因：

- 强类型领域记录更易校验；
- 时间区间、空间查询和统计聚合成熟；
- 导入、事务、版本迁移和完整性约束可靠；
- 绝大多数目标查询可以由 SQL 高效完成；
- 可以从关系型事实层生成图投影、JSON-LD 和 RDF。

知识图谱是一种语义结构和查询投影，不等于必须先选 Neo4j 或三元组库。

## 8.2 三层数据架构

```text
Evidence layer
  source / locator / raw extraction / assertion / curation activity

Domain layer
  person / place / office / event / appointment / relation / work

Projection layer
  timeline / map / graph / statistics / search index / API response
```

### Evidence layer

尽量追加式保存，保留冲突和版本历史。

### Domain layer

由审校后的断言形成强类型记录，支持约束与高效查询。

### Projection layer

可重建，不作为唯一事实来源。

## 8.3 Monorepo 结构

```text
apps/
  web/                 研究界面
  api/                 查询、编辑与导入 API
  worker/              ETL、索引、批处理

packages/
  schema/              数据类型、Zod/JSON Schema、词表
  db/                  SQL schema、迁移、查询
  ontology/            与 CIDOC CRM、PROV-O、SKOS 等映射
  importers/           CBDB、CHGIS、CSV、文本抽取
  research-queries/    可复现研究查询
  ui/                  通用可视化组件

data/
  seeds/               小型审校种子数据
  vocabularies/        版本化词表
  fixtures/            测试案例

docs/
  design-book/
  adr/                  架构决策记录
```

## 8.4 Schema 定义

同一概念只允许有一个规范定义源。建议：

1. PostgreSQL migration 定义数据库约束；
2. `packages/schema` 定义 TypeScript 类型和运行时校验；
3. 自动生成 OpenAPI/JSON Schema；
4. 词表以版本化 YAML/CSV 管理并导入数据库；
5. 测试确保数据库、API 和前端类型不漂移。

## 8.5 查询 API

第一阶段采用 REST 或类型化 RPC 均可，不急于 GraphQL。必须先稳定以下查询语义：

- 按对象获取详情及证据；
- 按时间区间、地点和类型筛选事件；
- 获取人物在某一时点的全部身份状态；
- 获取事件参与者和子事件；
- 获取关系网络并限定时间窗与证据级别；
- 获取冲突断言；
- 获取来源覆盖和数据质量指标；
- 执行版本化研究查询。

GraphQL 可在实体关系稳定后增加，避免将尚未成熟的内部表结构直接暴露为公共 API。

## 8.6 图投影

图节点和边从领域层生成：

```text
Node: Person, Place, Office, Work, Event, Institution
Edge: participated_in, held_office, located_at, authored, kin_of ...
```

每条投影边必须携带：

- 构成记录 ID；
- 时间范围；
- 证据状态；
- 生成规则版本。

图数据库可以作为缓存或分析副本，但不得成为无法回溯的第二事实源。

## 8.7 全文与语义搜索

搜索分为：

- 规范字段搜索；
- 古今字形、简繁、异体和别名搜索；
- 古籍全文搜索；
- 实体链接搜索；
- 向量语义搜索。

向量结果只能用于发现材料和推荐候选，不能替代可定位的文本证据。

## 8.8 导入流水线

```text
Fetch
→ Preserve raw snapshot
→ Parse
→ Normalize text
→ Extract candidate records
→ Resolve identity
→ Validate schema
→ Human review
→ Promote assertions
→ Build projections
```

每一步都保存输入、输出、软件版本和错误报告。

## 8.9 版本与发布

数据发布采用版本号和不可变快照：

```text
schema_version
vocabulary_version
dataset_version
importer_version
projection_version
```

研究结果必须引用具体 dataset version，而不是笼统引用“SongScope 数据库”。

## 8.10 测试层级

- schema 单元测试；
- ID 唯一性与引用完整性；
- 时间区间合法性；
- 地点有效期与行政关系；
- 断言必须具有证据；
- 官职组件与任职状态约束；
- importer golden tests；
- 关键研究查询快照；
- 前端证据追溯端到端测试。
