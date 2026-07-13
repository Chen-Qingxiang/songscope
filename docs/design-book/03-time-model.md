# 03　时间模型

## 3.1 原则

宋史时间绝不能只用一个 `date` 字段。

必须同时容纳：

- 公历精确日期；
- 年、月、日精度不同的日期；
- 年号纪年；
- 干支日；
- “春”“冬”“是岁”“未几”等相对表达；
- 起止时间不完整的区间；
- 只能确定先后顺序、不能确定年份的事件；
- 不同来源给出的冲突日期；
- 研究者换算出来的日期及其方法。

## 3.2 TemporalExtent

统一时间对象：

```text
TemporalExtent
- id
- original_text
- calendar_system
- era_id
- era_year
- lunar_month
- leap_month
- lunar_day
- sexagenary_day
- normalized_start
- normalized_end
- precision
- qualification
- conversion_method
- conversion_version
- source_locator_id
- note
```

### `normalized_start` 与 `normalized_end`

它们表示该时间表达可能覆盖的边界，不是假装精确。

例如“熙宁七年”：

```text
original_text: 熙寧七年
precision: year
normalized_start: 1074-01-01
normalized_end: 1074-12-31
```

若完成可靠的中西历换算，可以用该年号年的真实农历边界；若没有，则必须标记转换方法为粗略年份映射。

## 3.3 精度与不确定性分开

`precision` 描述信息粒度：

- day
- month
- season
- year
- reign_period
- dynasty
- ordered_only
- unknown

`qualification` 描述认识状态：

- exact
- approximate
- uncertain
- approximate_and_uncertain
- inferred
- disputed

“只知道年份”不等于“不确定”；它可能是确定的年级精度。

## 3.4 区间

任职、居住和灾害通常是区间，而非单点。

区间必须区分：

- 已知开始、已知结束；
- 已知开始、结束未知；
- 开始未知、已知结束；
- 开放式持续；
- 两端均为估计；
- 只知道先后次序。

系统内部可以采用 EDTF 兼容表达作为交换格式，例如：

```text
1074/1076?       结束年不确定
1079-08~/..      约于八月开始，结束开放
../1080          仅知不晚于 1080
```

但数据库仍应拆成可索引字段，而不是只保存一串 EDTF 文本。

## 3.5 中国传统历法层

需要独立的：

```text
Era
- polity_id
- ruler_id
- era_name
- start_date
- end_date
- ordinal
```

以及转换记录：

```text
CalendarConversion
- source_temporal_id
- target_calendar
- result_start
- result_end
- algorithm
- dataset_version
- confidence
```

转换结果是派生数据，不能覆盖原始纪年。

## 3.6 相对时间

史料常用：

- 未几
- 明年
- 既而
- 是月
- 后三日
- 居三年

应建模为相对于另一时间对象的约束：

```text
TemporalRelation
- subject_temporal_id
- relation_type
- object_temporal_id
- offset_value
- offset_unit
- certainty
```

关系类型可包括：

- before / after
- meets
- overlaps
- during
- starts / finishes
- approximately_after
- sequence_before

仅知道顺序时，不应生成虚构年份。

## 3.7 事件时间与记载时间

必须区分：

- `valid_time`：历史事件何时发生或状态何时成立；
- `recorded_time`：来源何时写成；
- `published_time`：该版本何时刊刻或出版；
- `ingested_time`：数据何时进入 SongScope；
- `asserted_time`：整理者何时提出该断言。

否则会把南宋人对北宋事件的回忆与北宋同时记录混为一谈。

## 3.8 查询规则

任何按年份统计的查询必须声明：

- 使用起始年、结束年、中点还是区间展开；
- 是否包含不确定日期；
- 是否按原始纪年或换算公历；
- 如何处理跨年事件；
- 如何处理仅有顺序的信息。

图表标题或元数据中必须公开这些选择。
