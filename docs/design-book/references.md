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

## 《宋史》可检索语料载体

### 中文维基文库《宋史》

- 目录页：<https://zh.wikisource.org/wiki/宋史>
- v0.3 目录基线：<https://zh.wikisource.org/w/index.php?title=宋史&oldid=2535238>
- 目录结构：本纪、志、表、列传、附录，共列 496 卷。
- 产品用途：作为 v0.3 可固定、可全文检索的电子转录载体，并为逐卷 passage 提供页面与 revision 定位。
- 研究限制：协作式电子转录不是权威点校本；页面文字、标点、转换和修订状态必须与抽象作品分层记录。
- 原作状态：目录页标示元代《宋史》原作在全世界属于公有领域。
- 网页再利用：目录页标示站点文字按 CC BY-SA 4.0 提供，并提示附加条款可能适用；Wikimedia 使用条款要求重用社区页面时保留适用许可和合理署名。
- 许可说明：<https://zh.wikisource.org/zh-hans/Wikisource:版权信息/全文>
- Wikimedia 使用条款：<https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use>

每次 acquisition 必须逐页保存 canonical URL、page ID、revision ID、历史或署名入口、适用许可和 checksum。不能仅凭本页的概括替代逐页核查，也不能把网页转录与现代点校本视为同一 manifestation。

## 首批史料验证

### 《宋史》卷三百三十八·苏轼传

- 在线文本：<https://zh.wikisource.org/wiki/宋史/卷338>
- 用于验证：凤翔任官、杭州通判、密州/徐州/湖州迁徙、徐州水灾、乌台诗案、黄州安置及东坡名号等案例。
- 正式数据应进一步对照权威点校本、年谱、文集和编年史料。

### 《宋史》卷十四至卷十六·神宗本纪

- 在线目录：<https://zh.wikisource.org/wiki/宋史#本紀>
- 用于 v0.3：建立连续本纪 passage、原始纪年浏览、全文检索、候选标注和纪事投影。
- 新增自动抽取内容在人工审核前只能是 candidate annotation 或 proposed assertion。

## 设计立场

SongScope 第一阶段采用“领域关系型 schema + 标准映射层”：

- 不直接复制 CBDB；
- 不宣称取代 CIDOC CRM；
- 不要求整理者手写 RDF；
- 不把外部数据库的标准化结果当作原始史料；
- 保证核心对象未来可以导出或映射到通用语义标准。
