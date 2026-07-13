# 05　事件与关系模型

## 5.1 事件是历史叙事与计算之间的桥梁

历史文献通常以行动和变化叙事。统计分析则需要结构化时间、参与者、地点和类型。`Event` 将二者连接起来。

```text
Event
- sid
- event_type_id
- label
- description
- temporal_extent_id
- primary_place_id
- parent_event_id
- status
```

`label` 是方便阅读的标题，不承担完整语义。完整语义来自事件类型、参与角色、地点、时间和断言。

## 5.2 事件参与者

```text
EventParticipation
- event_id
- participant_id
- role_type_id
- ordinal
- side_id
- temporal_extent_id
- assertion_id
```

同一人物在事件中可以有多个角色。例如苏轼在乌台诗案中先是被弹劾对象，后是被捕者、受审者和被处分者。

## 5.3 复合事件

复杂事件使用父子结构和事件间关系：

```text
乌台诗案
├── 御史弹劾
├── 逮赴台狱
├── 审讯
├── 判决
└── 黄州安置
```

事件关系包括：

- part_of
- caused
- enabled
- responded_to
- followed
- contradicted
- commemorated
- reported

“因果”必须有证据或研究判断来源，不能由时间先后自动推出。

## 5.4 灾害事件

灾害至少包含：

```text
DisasterProfile
- event_id
- hazard_type_id
- affected_geometry_id
- severity_scheme
- severity_value
- affected_population
- crop_or_infrastructure
- duration
```

治理措施建成独立事件，通过 `responded_to` 连接：

- 赈粜
- 发仓
- 蠲免
- 捕蝗
- 修堤
- 调兵
- 安置流民
- 祈雨或祭祀

这样才能计算响应时长、措施组合和不同官员的治理差异。

## 5.5 Relation 不是万能边

只有在关系本身具有跨时间持续性或社会分类意义时，才建立 `Relation`。

```text
Relation
- sid
- relation_type_id
- subject_id
- object_id
- temporal_extent_id
- directionality
- status
```

关系的证据通过断言层管理。

### 应由事件表达的情况

- A 在某日写信给 B；
- A 推荐 B 担任某职；
- A 弹劾 B；
- A 与 B 同席宴饮；
- A 为 B 作墓志。

这些首先是事件。系统可以再从多个事件推导“长期通信”“识拔关系”等关系视图。

### 可以直接建为关系的情况

- 父子、兄弟、婚姻；
- 师生；
- 同年；
- 制度性隶属；
- 作品版本派生；
- 行政区包含。

即使是直接关系，也应尽可能保留成立事件或证据。

## 5.6 对称、逆向与派生

词表必须定义：

- 是否有方向；
- 逆关系是什么；
- 是否对称；
- 是否传递；
- 是否允许自动生成逆边。

例如：

```text
student_of inverse teacher_of
sibling_of symmetric
part_of transitive (谨慎限定对象类型与有效期)
recommended 不对称、不可传递
```

自动生成的逆边是派生数据，不能被当成另一条独立史料证据。

## 5.7 关系强度

关系强度不能只靠主观打分。优先保存可解释指标：

- 有证据的互动次数；
- 互动时间跨度；
- 共同任职时长；
- 书信或唱和数量；
- 来源独立性；
- 关系类型。

网络图可以根据研究目的计算权重，但必须公开算法。

## 5.8 事件去重

不同来源描述的可能是同一事件，也可能是连续事件。采用 `EventCluster`：

```text
EventCluster
- candidate_event_ids
- resolution_status
- preferred_event_id
- rationale
```

在确认前保留多个事件记录，不因日期和人物相近就自动合并。
