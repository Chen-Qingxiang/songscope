# 06　官制、除授与仕宦模型

## 6.1 为什么这是核心难题

宋代官员身份往往同时包含：

- 寄禄官或阶官；
- 职名、馆职、学士职；
- 实际差遣；
- 勋、爵、食邑；
- 临时使命；
- 权、试、判、知、兼、提举等限定；
- 任所和辖区；
- 正式任命与实际到任之间的差异。

把“尚书祠部员外郎、直史馆、知密州”压成一个 `title` 字符串，会失去制度结构和职业路径分析能力。

## 6.2 四个层次

### OfficeConcept：制度中的职位概念

例如：知州、通判、翰林学士、团练副使。

```text
OfficeConcept
- sid
- canonical_label
- office_category
- definition
- valid_time
- polity_id
```

### OfficeInstance：特定时期制度结构中的职位节点

同一名称在不同改革阶段可能权责不同。

```text
OfficeInstance
- office_concept_id
- institution_id
- rank_id
- superior_office_id
- jurisdiction_type
- valid_time
```

### AppointmentAction：朝廷或有权主体作出的除授动作

```text
AppointmentAction
- event_id
- appointee_id
- action_type_id
- appointing_authority_id
- document_id
- temporal_extent_id
```

动作词包括：

- 除、授、拜
- 迁、转、进
- 改、徙
- 兼、权、试、判
- 罢、免、落、夺
- 贬、安置、编管
- 复、起、召还
- 辞、乞、未赴

### ServiceEpisode：实际任职或身份状态

```text
ServiceEpisode
- person_id
- appointment_action_id
- start_time
- end_time
- service_status
- location_id
- end_reason_event_id
```

`AppointmentAction` 不自动等于 `ServiceEpisode`。可能存在：

- 受命但未赴；
- 辞免获准；
- 任命后隔月到任；
- 同时兼多个职；
- 只保留虚衔而无实际职掌；
- 史料只记除授，不知是否实际任职。

## 6.3 AppointmentBundle

一次诏命可能同时改变多个身份成分：

```text
AppointmentBundle
- appointment_action_id
- component_id
- component_type
- office_instance_id
- modifier_id
- location_id
- sequence
```

例如“以黄州团练副使安置”至少包含：

- 身份成分：黄州团练副使；
- 处分性质：贬谪后的散官/虚衔语境；
- 行政措施：安置；
- 地点：黄州；
- 触发事件：乌台诗案判决；
- 实际状态：在黄州居住、受限制。

不能把它简单解释为“担任黄州团练副使并主持军务”。

## 6.4 官、职、差遣等类别

第一版词表至少区分：

- `rank_office`：寄禄官、阶官；
- `functional_assignment`：实际差遣；
- `literary_title`：馆职、学士职；
- `honorary_office`：荣衔或虚衔；
- `military_title`；
- `censorial_office`；
- `commission`：使职和临时使命；
- `noble_title`：爵位；
- `merit_title`：勋；
- `stipend_title`：食邑等；
- `punitive_status`：安置、编管等处分状态。

具体分类必须根据宋代制度研究继续细化，系统不得假定现代“职位名称=工作内容”。

## 6.5 任所与官署

差遣可以关联：

- 行政区；
- 官署或机构；
- 多个辖区；
- 巡历区域；
- 中央而无地方任所。

一个 posting 可能包含多个官职成分和多个地址，CBDB 的 postings 结构也明确处理这种多对多关系。SongScope 应保留该能力。

## 6.6 顺序信息

年谱有时只能确定任官顺序。`ServiceEpisode` 和 `AppointmentAction` 应支持：

```text
sequence_index
sequence_within_source
before_event_id
after_event_id
```

不应为排序方便虚构年份。

## 6.7 仕宦路径查询

模型完成后必须能稳定回答：

- 某人每次除授动作及其依据；
- 每个时期同时拥有的全部官、职、差遣和身份；
- 正式任命与实际任职之间的差异；
- 中央与地方之间的流动；
- 由某类职位通向宰执的常见路径；
- 贬谪后到起复的时长；
- 某职位在制度改革前后的变化；
- 同一诏命同时改变了哪些身份成分。

## 6.8 最低录入标准

每条正式仕宦记录至少需要：

- 人物；
- 动作类型或任职状态类型；
- 官职原文；
- 标准化官职概念（可暂未解析）；
- 时间原文与标准化范围；
- 地点原文与标准化地点（如适用）；
- 来源与定位；
- 解析状态；
- 可信度和整理说明。
