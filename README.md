# 观宋 · SongScope

> 基于人物、时间、地点、制度、事件与证据的宋史数字研究平台。

SongScope 的目标不是制作一张静态年表，而是建立一套可以持续扩展、可以回到史料证据、能够支持统计分析与可视化研究的宋史数据基础设施。

当前 `v0.1` 是一个可运行的纵向原型：以苏轼为样板，把人物、地点、事件、除授、关系、作品和来源放进统一的数据层，并提供总览、时间轴、历史地图、人物网络与数据模型五个研究视图。

## 《观宋设计书》

[`docs/design-book/README.md`](docs/design-book/README.md) 是项目的最高层设计规范。它定义：

- 宋史知识中的实体、事件、状态、关系、断言、证据与研究投影；
- 稳定 ID、异名、受控词表与外部数据库对齐；
- 年号、模糊日期、相对时间和换算结果的保存方式；
- 历史行政区、地名、治所、几何与现代对应之间的区别；
- 官、职、差遣、除授动作与实际任职阶段的分层模型；
- 来源版本、段落定位、冲突断言和 AI 导入的可追溯规则；
- PostgreSQL/PostGIS 事实层及下一阶段 schema 实现契约。

后续代码、数据库、导入器、API 和可视化都应遵循该设计书；重大模型变更需要同时更新设计书并以真实史料案例验证。

## 当前功能

- **研究总览**：实体数量、事件类型分布与研究问题入口
- **生涯时间轴**：叠加除授、政治、灾害、迁徙、文学和生平事件
- **历史地图原型**：展示苏轼主要任职及贬居轨迹
- **人物关系网络**：区分亲属、识拔、文学、同僚与政治关系
- **可追溯数据模型**：每条记录保留来源、可信度与说明
- **全局搜索**：搜索人物、地点、事件和作品
- **数据完整性测试**：检查 ID 唯一性和实体引用

## 本地运行

```bash
npm install
npm run dev
```

质量检查：

```bash
npm run typecheck
npm test
npm run build
```

## 数据模型

概念层的主干为：

```text
Entity / Concept
       │
Event / State ── Participation / Relation
       │
    Assertion
       │
Evidence / Source
       │
Projection: timeline / map / graph / statistics
```

详见：

- **[`docs/design-book/README.md`](docs/design-book/README.md)** — 项目规范与完整目录
- [`docs/architecture.md`](docs/architecture.md) — 当前原型架构
- [`docs/data-model.md`](docs/data-model.md) — 早期模型摘要
- [`docs/roadmap.md`](docs/roadmap.md)
- [`docs/research-principles.md`](docs/research-principles.md)

## 重要说明

当前界面数据仍主要用于验证产品结构和交互，尚非可直接发表的完整学术数据。正式扩充必须：

1. 逐条回到原始史料或可靠数据库；
2. 区分史料原文、标准化结果和研究者判断；
3. 记录日期、地点及关系的精度、不确定性和转换方法；
4. 对相互矛盾的记载并存建模，而非静默覆盖；
5. 让所有统计图、地图点和网络边能够回溯到断言与证据。

## 下一阶段

按照设计书的[第一阶段实现契约](docs/design-book/10-implementation-contract.md)，下一步是建立 `packages/schema`、PostgreSQL/PostGIS 核心表和苏轼真实种子数据，贯通以下链路：

```text
史料段落
→ SourceLocator
→ Assertion + Evidence
→ Appointment / Event / State
→ 查询 API
→ 时间轴、地图与证据详情
```

## 远景

- 宋代官员除授与职业路径
- 科举、家族与社会流动
- 文人交游、党争和政治网络
- 人物迁徙、贬谪与历史地图
- 灾害、赈济和地方治理
- 诗词、文章、书信和用典网络
- 战争、外交、财政、物价与行政区划

## License

代码采用 [MIT License](LICENSE)。历史数据的再利用须同时遵守各原始来源的授权和引用要求。
