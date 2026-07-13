# 参考标准与数据源

本页记录设计书目前直接借鉴的标准和宋史数据基础。引用这些项目不表示 SongScope 必须完整实现其全部模型。

## 通用语义与证据标准

### CIDOC Conceptual Reference Model

- 官网：<https://cidoc-crm.org/>
- ISO 21127:2023 对应的文化遗产信息交换参考本体。
- SongScope 借鉴：事件中心建模、时空实体、参与者、来源整合和跨数据集映射。

### W3C PROV-O

- 规范：<https://www.w3.org/TR/prov-o/>
- SongScope 借鉴：`Entity—Activity—Agent`、派生、引用、版本和加工活动的 provenance。

### Extended Date/Time Format（EDTF）

- Library of Congress：<https://www.loc.gov/standards/datetime/>
- SongScope 借鉴：不确定、近似、未知部分和开放区间的交换表达。

### OWL-Time

- W3C：<https://www.w3.org/TR/owl-time/>
- SongScope 借鉴：时间瞬间、区间、持续时间和时间关系的语义对齐。

### Linked Places Format

- 规范仓库：<https://github.com/LinkedPasts/linked-places-format>
- SongScope 借鉴：地名、类型、几何和地点关系的时态指称及 JSON-LD/GeoJSON 交换。

### SKOS

- W3C：<https://www.w3.org/TR/skos-reference/>
- SongScope 借鉴：受控词表、上下位概念、多语言标签和外部词表映射。

## 中国历史数据基础

### China Biographical Database（CBDB）

- 官网：<https://cbdb.hsites.harvard.edu/>
- 数据结构说明：<https://cbdb.hsites.harvard.edu/structure-cbdb>
- 重要启发：人物、地点、官僚系统、亲属、社会关系、机构和文本之间的关系模型；posting 的多官职、多地点结构；年号和模糊时间保存。
- 注意：导入与再发布必须遵守其数据许可和引用要求。

### China Historical GIS（CHGIS）

- 官网：<https://chgis.fas.harvard.edu/>
- 重要启发：历史行政区实例、有效期、隶属结构、治所点和边界数据。

### Chinese Text Project

- 官网：<https://ctext.org/>
- 用途：古籍全文检索、文本定位和后续文本处理；正式引用仍需记录具体版本与定位。

## 首批史料验证

### 《宋史》卷三百三十八·苏轼传

- 在线文本：<https://zh.wikisource.org/wiki/宋史/卷338>
- 用于验证：凤翔任官、杭州通判、密州/徐州/湖州迁徙、徐州水灾、乌台诗案、黄州安置及东坡名号等案例。
- 正式数据应进一步对照权威点校本、年谱、文集和编年史料。

## 设计立场

SongScope 第一阶段采用“领域关系型 schema + 标准映射层”：

- 不直接复制 CBDB；
- 不宣称取代 CIDOC CRM；
- 不要求整理者手写 RDF；
- 不把外部数据库的标准化结果当作原始史料；
- 保证核心对象未来可以导出或映射到通用语义标准。
