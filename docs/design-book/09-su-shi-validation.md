# 09　苏轼案例验证

本章用《宋史》卷三百三十八中的几条简短记载验证模型。目的不是完成苏轼年谱，而是证明同一模型能够表达除授、实际任职、灾害治理、政治案件、贬谪和作品活动。

## 9.1 案例一：“徙知密州”

原文上下文先记苏轼通判杭州，继而“徙知密州”。

### 不合格记录

```json
{
  "person": "苏轼",
  "year": 1074,
  "office": "密州知州"
}
```

问题：

- “徙”这一任命动作丢失；
- 不知道由何职迁来；
- 不知道任命时间和实际到任是否相同；
- “知密州”被现代化成“密州知州”；
- 1074 是否来自原文还是年号换算不明；
- 没有来源定位。

### 合格结构

```yaml
appointment_action:
  sid: ss:E000101
  type: transfer_appointment
  appointee: ss:P000001
  original_phrase: 徙知密州
  temporal_extent: ss:T000101
  source_locator: ss:SL000101

components:
  - category: functional_assignment
    office_concept: ss:O000210       # 知州/知某州
    jurisdiction: ss:A000330         # 该时段的密州行政区实例
    original_title: 知密州

service_episode:
  status: probable_service
  derived_from: ss:E000101
  start: unresolved
  end: bounded_by_next_transfer
```

如果其他来源提供到任日期、离任日期或寄禄官信息，应新增断言和组件，不覆盖这条来源记录。

## 9.2 案例二：徐州水灾与治理

《宋史》记“徙知徐州”，继而叙述河决、城危、苏轼组织军民筑堤守城。

### 事件结构

```text
Event: 徐州洪水
  type: flood
  place: 徐州及城下
  cause/process: 河决曹村、汇于城下
  affected object: 徐州城、居民

Event: 苏轼组织徐州防洪
  type: disaster_response
  responded_to: 徐州洪水
  participants:
    苏轼 — local_official / organizer
    武卫营卒长 — military_coordinator
    军卒 — labour_force
    富民与居民 — affected_group
  actions:
    阻止富民出城
    请求禁军协力
    筑东南长堤
    分堵守城
    奏请增筑故城、为木岸
```

由此可以研究：

- 灾害与响应是否同年；
- 地方官采取何类措施；
- 军事机构如何参与地方治理；
- 该事件在苏轼作品、奏议和地方志中还有哪些互证。

## 9.3 案例三：湖州、乌台诗案与黄州安置

原文依次包括：

1. “徙知湖州”；
2. 上表谢恩并以诗托讽；
3. 御史摘取表语与诗句；
4. 逮赴台狱、长期审讯；
5. “以黄州团练副使安置”；
6. 在黄州筑室东坡，自号东坡居士。

### 复合事件

```text
乌台诗案 EventCluster
├── 湖州谢表及诗文被解释为讪谤
├── 御史弹劾
├── 逮捕入狱
├── 审讯
├── 判决/处分
└── 黄州安置
```

### 身份变化

```text
AppointmentAction:
  type: punitive_assignment
  original_phrase: 以黄州团练副使安置

AppointmentComponent 1:
  office_title: 黄州团练副使
  category: military_or_honorary_title
  functional_status: non-governing

AppointmentComponent 2:
  status: 安置
  category: punitive_status
  location: 黄州

Service/Residence State:
  person: 苏轼
  state: relegated_residence
  place: 黄州
  created_by: 判决/处分事件
```

这里特别验证：官名、处分和实际生活状态不能合并成一列。

## 9.4 案例四：“东坡居士”名称的形成

“自号东坡居士”不是人物出生时就具有的静态别名。

应建成：

```text
NameAdoptionEvent
- person: 苏轼
- adopted_name: 东坡居士
- place_context: 黄州东坡
- temporal_extent: 黄州居住期间
- source: 《宋史》卷338相关段落
```

随后形成带有效期或首见时间的 `NameAttestation`。

这使系统能回答：某个号在何时、何地、何种人生处境下出现，而不只是列出别名。

## 9.5 冲突场景

假设：

- 《宋史》只给出事件次序；
- 某年谱给出具体月份；
- 现代论文认为年谱月份有误；
- CBDB 提供一个标准化西历年份。

SongScope 应保存四条断言，并分别标记：

- 原始明载；
- 年谱编排；
- 学术修正；
- 外部数据库归一结果。

人物时间轴默认展示当前 accepted 解释，同时允许切换查看全部来源日期。

## 9.6 通过标准

核心模型只有在以下查询均能返回可追溯结果时，才算通过苏轼案例：

1. 列出苏轼从杭州到密州、徐州、湖州、黄州的身份与地点变化；
2. 区分每次任命动作和实际任职状态；
3. 显示同一时段并存的官、职、差遣和处分身份；
4. 从徐州水灾跳转到治理措施、参与者和来源；
5. 从乌台诗案跳转到子事件、诗文、弹劾者、处分和黄州居住状态；
6. 查看“东坡居士”名称的首次语境和证据；
7. 对每个时间点显示原始纪年、换算时间、精度和争议；
8. 从地图上的地点反查行政区实例与历史有效期；
9. 从任何结论打开来源定位；
10. 在不修改 schema 的情况下继续加入惠州、儋州阶段。
