# SongScope Working Agreements

## Mission

SongScope（观宋）不是普通历史百科或可视化演示，而是一个证据可追溯、可以统计、可以校勘的宋史数字研究平台。

项目的规范性设计位于 `docs/design-book/`。修改核心数据模型前必须阅读相关章节。代码实现与设计书冲突时，不得静默改变模型；应更新设计书并说明理由。

## Historical data rules

* 不得生成无来源的历史事实。
* 不得从搜索摘要直接录入正式数据。
* 不得虚构具体月份、日期、坐标、官职或因果关系。
* 史料原文、标准化结果、研究者解释必须分层保存。
* 任命动作与实际任职阶段必须分开。
* 官、职、差遣、阶、爵与处分身份不得压缩为单一 title。
* accepted assertion 必须至少有一条 supporting evidence。
* 不同来源存在冲突时应并存记录，不得静默覆盖。
* 无法确定的内容应明确标记 unknown、approximate、inferred 或 disputed。
* 所有前端历史陈述必须能够回溯到 assertion、evidence 和 source locator。

## Engineering rules

* 保持 TypeScript strict。
* 继续使用 PostgreSQL + PostGIS 作为事实层。
* 使用共享 schema 校验数据库输入、API 输出和前端投影。
* 优先扩展现有架构，不进行没有必要的全项目重写。
* 用户界面使用简体中文；代码标识符使用英文。
* 不提交 `.env`、密码、Token 或其他秘密。
* 新增生产依赖前先确认现有依赖是否已经可以完成任务。
* 覆盖范围内的正式数据不得静默回退到 demo 数据。
* 数据导入必须可重复执行，数据库重建结果必须确定。

## Validation

修改完成后至少运行：

```bash
npm run typecheck
npm test
npm run test:db
npm run build
```

涉及数据库时，还必须从空数据库执行 migration 和 seed。

任何失败都应修复；不要通过删除测试、降低类型检查或跳过验证来获得绿色结果。

## Git workflow

* 从最新 `main` 创建功能分支。
* 在有意义的里程碑提交代码。
* 不修改或重写已有历史提交。
* 最终保持工作区干净。
* PR 描述必须列出数据来源、模型变化、测试结果和仍存在的限制。
* 只有本地检查和 GitHub CI 全部通过后才能合并。
