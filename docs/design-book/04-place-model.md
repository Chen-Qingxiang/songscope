# 04　空间与历史地名模型

## 4.1 四个不能混为一谈的东西

以“密州”为例，至少要区分：

1. 史料中出现的字符串“密州”；
2. 某一时期名为密州的行政区实例；
3. 行政治所所在的具体聚落或坐标；
4. 与其大致对应的现代地区。

因此 `name = 密州, lat = ..., lon = ...` 远远不够。

## 4.2 Place 与 AdministrativeUnit

### Place

表示具有相对持续空间身份的地点，例如山川、城市聚落、建筑地点、港口、墓地。

### AdministrativeUnit

表示某一有效期内具有名称、类别、隶属和可能边界的行政辖区。

```text
AdministrativeUnit
- sid
- place_id
- admin_type_id
- polity_id
- valid_time
- seat_place_id
- geometry_id
```

名称变化、行政层级变化或边界显著变化时，应创建新的历史实例或新的时态断言，而不是覆盖旧记录。

## 4.3 PlaceAttestation

史料对地点的每次指称保存为：

```text
PlaceAttestation
- place_or_admin_id
- original_name
- normalized_name
- name_type
- valid_time
- source_locator_id
- certainty
- context_text
```

一个地点可以有多个异名；一个地名也可能指向多个候选地点。

## 4.4 地点关系

```text
PlaceRelation
- subject_id
- relation_type
- object_id
- valid_time
- assertion_id
```

关系包括：

- part_of / contains
- administrative_superior_of
- seat_of
- near
- north_of / south_of
- crossed_by
- same_location_as
- successor_of / predecessor_of
- uncertainly_identified_with

行政隶属必须有有效期。不能以北宋末年的路州县结构解释整个宋代。

## 4.5 几何对象

```text
Geometry
- geometry_type
- geojson
- valid_time
- method
- accuracy_meters
- certainty
- source_id
```

几何可能是：

- 点：治所、建筑、墓址；
- 线：河流、道路、行程；
- 面：行政区、灾害范围、战区；
- 模糊区域：只能确定在某县或某河段。

坐标必须声明代表什么：行政治所点、现代城市中心、推定地点，还是史料所描述区域的质心。

## 4.6 不确定地点

允许以下情况长期存在：

- 只知道地点名称，不知道具体是哪一个同名地点；
- 只知道位于某州县；
- 有两个候选地点；
- 现代对应存在争议；
- 坐标来自算法或近似匹配。

```text
PlaceResolution
- attestation_id
- candidate_place_id
- probability_or_rank
- method
- evidence
- status
```

不要为了地图上必须出现一个点而强行选择。

## 4.7 人物与地点的关系必须有类型

人物“与某地有关”没有研究意义。至少区分：

- 籍贯
- 出生
- 居住
- 任职
- 旅行经过
- 被贬安置
- 葬地
- 置产
- 写作
- 交游
- 战斗
- 奉使

这些关系优先通过具体事件或状态产生，而不是手工维护一条笼统边。

## 4.8 路线

人物迁徙路线是推导结果：

```text
MovementEvent
- person_id
- origin_id
- destination_id
- temporal_extent
- route_geometry_id (optional)
- purpose
- evidence
```

若只知道先后地点，不知道真实道路，地图只能画“地点间连接”并明确标注为示意线，不能伪装为旅行路径。

## 4.9 与外部地名库对齐

SongScope 应保存 CHGIS、CBDB 地址码和其他地名库标识，但保留自己的断言与消歧层。

Linked Places 的时态名称、几何、类型和关系结构可作为导出格式参考。内部模型不要求完全复制其 JSON-LD 结构。
