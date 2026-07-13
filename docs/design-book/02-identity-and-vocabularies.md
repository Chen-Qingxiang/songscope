# 02　身份系统与受控词表

## 2.1 身份与名称必须分离

“苏轼”是一个名称，不是数据库身份。人物可能有：

- 本名：蘇軾；
- 字：子瞻、和仲；
- 号：東坡居士；
- 谥号：文忠；
- 异体与简繁：苏轼 / 蘇軾；
- 文献中的代称：东坡、苏子瞻；
- 外部数据库标识：CBDB、Wikidata 等。

因此核心对象必须使用不依赖名称的稳定 ID。

## 2.2 三层标识

每个核心对象采用三层标识：

### 内部主键 `id`

数据库内部使用 UUIDv7 或等价的不可变主键。不得展示为主要引用格式。

### 公共稳定标识 `sid`

采用类型前缀和顺序号：

```text
ss:P000001    Person
ss:L000001    Place
ss:A000001    Administrative unit
ss:O000001    Office
ss:E000001    Event
ss:W000001    Work
ss:S000001    Source object
ss:C000001    Controlled concept
ss:R000001    Relation
ss:X000001    Assertion
```

规则：

- 一经公开不得重用；
- 合并对象时保留旧 ID，并指向新对象；
- 删除只做 tombstone，不物理抹除已公开身份；
- 类型变化通常创建新对象并声明关系，不直接改前缀。

### 可读别名 `slug`

```text
person/su-shi-1037
place/meishan
work/shui-diao-ge-tou-ming-yue-ji-shi-you
```

别名用于 URL、搜索和人工维护，可以重定向，但不是永久身份。

## 2.3 名称模型

```text
NameAttestation
- entity_id
- name_text_original
- name_text_normalized
- script
- language
- name_type
- temporal_extent
- source_locator_id
- certainty
- is_preferred_for_context
```

`name_type` 示例：

- personal_name
- courtesy_name
- style_name
- posthumous_name
- temple_name
- reign_title
- place_name
- office_title
- abbreviation
- variant_character
- modern_label

“首选名称”必须带语境，例如：简体中文界面首选“苏轼”，展示史料原文时首选“蘇軾”。不能把一个名称永久写死为全系统唯一首选。

## 2.4 消歧与合并

系统必须支持四种状态：

- `identified`：确认是同一对象；
- `possible_match`：可能相同，证据不足；
- `distinct`：已确认不是同一对象；
- `merged`：旧对象已并入目标对象。

严禁仅凭同名、同地或相近年代自动合并人物。

合并操作必须记录：

```text
IdentityDecision
- candidate_ids
- decision
- decided_by
- decided_at
- rationale
- evidence_ids
- reversible
```

## 2.5 外部 ID

外部标识单独保存：

```text
ExternalIdentifier
- entity_id
- authority
- external_id
- external_url
- match_status
- checked_at
- note
```

典型 authority：

- CBDB
- CHGIS
- Wikidata
- VIAF
- Chinese Text Project
- local_gazetteer_catalogue

外部 ID 是对齐关系，不应成为内部主键；外部数据库可能修订、拆分或合并记录。

## 2.6 受控词表

关系类型、事件类型、官职类别、来源类型等不得任意输入自由文本。采用版本化受控词表：

```text
Concept
- sid
- scheme
- pref_label_zh_hans
- pref_label_zh_hant
- pref_label_en
- broader_id
- definition
- valid_from
- valid_to
- status
- external_mapping
```

主要词表：

- `event-types`
- `participant-roles`
- `relation-types`
- `office-categories`
- `appointment-actions`
- `place-types`
- `source-types`
- `evidence-roles`
- `certainty-levels`
- `work-genres`

## 2.7 词表不是历史实体

“知州”作为职官概念与某次具体任职不同；“蝗灾”作为事件类型与密州某年蝗灾不同。

必须区分：

```text
Concept: 蝗灾（灾害类型）
Event: 熙宁年间密州蝗灾（具体发生）
```

```text
Office concept: 知州
Appointment component: 苏轼被任为密州知州
Service state: 苏轼实际治理密州的时间段
```

## 2.8 文本规范化

所有文本至少保存：

- 原文；
- Unicode 规范化文本；
- 简繁转换结果（如生成）；
- 标点版本；
- 分词或实体识别结果（如生成）；
- 转换工具和版本。

任何自动简繁转换不得覆盖原文。异体字归一只能作为搜索索引或派生字段。
