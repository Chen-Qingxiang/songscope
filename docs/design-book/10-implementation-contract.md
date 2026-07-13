# 10　第一阶段实现契约

本章把设计书转化为下一轮代码工作的明确边界。

## 10.1 当前最优先任务

> 建立 `packages/schema` 与可运行的 PostgreSQL 核心 schema，并用苏轼四个案例完成端到端验证。

在这一任务完成前，不继续堆叠新的地图、仪表盘或网络动画。

## 10.2 必须实现的核心对象

### 身份与词表

- `entity_registry`
- `entity_alias`
- `external_identifier`
- `concept_scheme`
- `concept`

### 来源与证据

- `source_work`
- `source_manifestation`
- `source_item`
- `source_locator`
- `assertion`
- `evidence_link`
- `curation_activity`

### 时间与空间

- `temporal_extent`
- `era`
- `place`
- `administrative_unit`
- `place_name_attestation`
- `place_relation`
- `geometry`

### 领域对象

- `person`
- `institution`
- `office_concept`
- `office_instance`
- `event`
- `event_participation`
- `event_relation`
- `appointment_action`
- `appointment_component`
- `service_episode`
- `relation`
- `work`

## 10.3 Schema 交付物

```text
packages/schema/
├── src/
│   ├── ids.ts
│   ├── time.ts
│   ├── sources.ts
│   ├── assertions.ts
│   ├── places.ts
│   ├── people.ts
│   ├── events.ts
│   ├── offices.ts
│   ├── relations.ts
│   └── works.ts
├── vocabularies/
├── json-schema/
└── tests/

packages/db/
├── migrations/
├── seeds/
├── queries/
└── tests/
```

## 10.4 首批种子数据

只录入足以验证模型的高质量数据：

- 苏轼；
- 杭州、密州、徐州、湖州、黄州的历史行政实例；
- 通判杭州、徙知密州、徙知徐州、徙知湖州、黄州安置；
- 徐州洪水及治理；
- 乌台诗案复合事件；
- “东坡居士”名称形成；
- 《宋史》卷338的来源对象和段落定位；
- 至少一条来自另一来源的补充或冲突断言。

种子数据宁可只有几十条，也必须完整贯通证据链。

## 10.5 必须通过的自动测试

1. 所有 `sid` 唯一且类型前缀正确；
2. 所有 accepted 断言至少有一条支持证据；
3. source locator 必须指向存在的 source item；
4. 时间区间 start 不晚于 end；
5. 原始日期不能因归一化而丢失；
6. 行政隶属的有效期必须与两端对象相交；
7. appointment component 必须属于 appointment action；
8. service episode 不得被误认为必然由任命自动产生；
9. 事件参与角色必须来自受控词表；
10. 苏轼案例中的十项查询全部通过快照测试。

## 10.6 第一批查询

```sql
-- 某人在指定时间的全部身份成分
person_status_at(person_sid, date)

-- 某人的任命动作与实际任职阶段
career_of(person_sid)

-- 某事件的子事件、参与者、地点和证据
event_bundle(event_sid)

-- 某断言的支持、反对和限定证据
assertion_evidence(assertion_sid)

-- 某历史行政区在指定时间的名称、隶属和几何
historical_place_at(place_sid, date)

-- 某来源支持了哪些断言
assertions_from_source(source_sid)
```

## 10.7 API 最小端点

```text
GET /entities/:sid
GET /people/:sid/career
GET /events/:sid
GET /places/:sid?at=YYYY-MM-DD
GET /assertions/:sid/evidence
GET /sources/:sid/assertions
GET /search?q=
```

所有响应都必须包含 `datasetVersion` 和可选的 `evidenceSummary`。

## 10.8 前端改造要求

现有 demo 不必删除，但必须改为消费新数据投影：

- 时间轴显示精度和不确定性；
- 任职卡区分 appointment 与 service；
- 地图显示地点解析状态；
- 网络边显示生成依据；
- 所有卡片加入“查看证据”；
- 演示数据标记改为真实种子集版本。

## 10.9 暂不实现

第一阶段暂不：

- 批量导入全部 CBDB；
- 使用 Neo4j 作为主库；
- 构建完整 CIDOC CRM RDF；
- 自动发布未经审校的 AI 提取；
- 设计覆盖所有中国历史时期的终极本体；
- 大规模开发前端新视图。

这些不是被否定，而是必须建立在核心模型验证之后。

## 10.10 完成定义

只有当以下链路真正可运行，第一阶段才完成：

```text
《宋史》段落
→ SourceLocator
→ Assertion + Evidence
→ Appointment/Event/State
→ PostgreSQL 查询
→ API
→ 时间轴/地图详情
→ 一键返回原文定位
```

这一链路是 SongScope 从 demo 变成研究平台的分界线。
