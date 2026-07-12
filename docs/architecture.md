# Architecture

## 目标

SongScope 首先是一套“史实与证据层”，其次才是可视化网站。界面可以重做，数据模型必须允许长期积累。

## v0.1 架构

```text
src/data/songData.ts       人工整理的类型化演示数据
src/types.ts               核心实体接口
src/lib/data.ts            查询、聚合与搜索选择器
src/components             时间轴、地图、网络等可复用视图
src/pages                  研究页面
```

当前版本是静态前端，优点是零部署依赖、数据结构清晰、便于快速验证。下一阶段建议演进为：

```text
apps/web          React / Next.js 前端
apps/api          查询 API 与导入任务
packages/schema   共享类型、校验规则与本体
packages/ui       可视化组件
packages/etl      CBDB、CHGIS、古籍文本导入与清洗
storage           PostgreSQL + PostGIS
search            全文检索与古汉语实体识别索引
```

## 为什么先做纵向切片

横向铺开整个宋史会很快产生大量没有经过验证的薄数据。以苏轼为样板，可以一次检验：

- 官职与差遣是否能够正确拆分；
- 历史地点是否能表达沿革与不确定性；
- 事件与作品怎样共享时间和地点；
- 人际关系是否需要方向、时效与证据；
- 图表是否能够回到原始记录。

结构成立后，再批量扩展到其他人物和专题。
