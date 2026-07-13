# ADR 001：v0.3《宋史》语料快照存储

- 状态：accepted
- 日期：2026-07-13
- 决策范围：SongScope v0.3 中文维基文库《宋史》语料

## 背景

v0.3 要求正常校验、数据库重建、测试、构建和 GitHub Pages 静态投影不访问网络。目录页和每个逐卷页面必须固定 revision、正文校验值、许可与署名入口，因此“运行时重新请求当前网页”不满足可复现要求。

实施前通过中文维基文库 MediaWiki API 对固定目录 revision `2535238` 做了只读审计：

- 目录 page ID 为 `11371`；
- 发现卷001至卷496，共496卷；
- 没有缺卷、重复卷或无法解析的页面；
- 496个当前逐卷 revision 均可通过 revision ID 固定；
- 逐卷 wikitext 的 revision size 合计 `16,720,043` bytes，约 `15.95 MiB`；
- 最大单卷约 `105 KiB`；
- `siteinfo.rightsinfo` 返回 `Creative Commons Attribution-Share Alike 4.0`，许可入口为 <https://creativecommons.org/licenses/by-sa/4.0/deed.zh>。

API 审计入口：<https://zh.wikisource.org/w/api.php>。实际快照仍须逐页保存 page ID、revision ID、revision timestamp、canonical URL、history URL、license、attribution URL 与 checksum，不能只依赖本 ADR 的统计。

## 决定

v0.3 的单一固定快照直接进入 Git，位于 `data/corpus/songshi-wikisource/`：

```text
directory.json
manifest.json
coverage.json
units.json
volumes/001.json ... 496.json
```

理由：

1. 约16 MiB原始正文加派生 JSON 尚未达到需要对象存储、Git LFS 或运行时下载的规模；
2. Git 直接保存能让 migration、import、测试、静态投影和离线开发使用完全相同的输入；
3. 每卷独立 JSON 便于差异审阅、按卷加载和将来按 revision 生成新快照；
4. 不新增生产依赖，也不改变当前部署方式。

`manifest.json` 的 corpus content hash 由目录 revision、处理规则版本、逐页 revision 与正文 checksum 的规范序列计算，不包含会随运行时间变化的字段。相同上游 revision 的重复 acquisition 必须保留首次 `retrievedAt` 并产生相同内容；上游 revision 变化时不得静默覆盖。

## 许可边界

- 仓库代码继续采用 MIT License；
- `data/corpus/songshi-wikisource/` 中来自中文维基文库的转录及其派生分段按适用的 CC BY-SA 4.0 条款再利用；
- corpus 目录提供独立许可与署名说明；
- 每个页面记录 canonical URL 和 history/attribution URL；
- 《宋史》抽象作品的公有领域状态与网页整理、标点及修订贡献的许可分开记录。

## 后果

- v0.3 clone 体积会增加，但无需联网即可复现；
- 后续上游更新应形成新的 snapshot，而不是修改旧 SID 的含义；
- 若未来多版本累计导致仓库不可接受地增长，再另立 ADR 评估内容寻址对象存储；本决定不预先引入该复杂度；
- GitHub Pages 不得把全量语料打入首页 JavaScript bundle，应生成按卷或按索引分片的静态资产。
