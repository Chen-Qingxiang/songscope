# 07　来源、断言与证据模型

## 7.1 最重要的原则

SongScope 不直接储存“无来源事实”。正式知识必须能够回答：

> 谁根据哪一份材料的哪个位置，以何种方法，提出了什么陈述？

## 7.2 来源的四层结构

### SourceWork：抽象作品

例如《宋史》《续资治通鉴长编》《东坡集》《苏轼年谱》。

### SourceExpression：文本形态或修订形态

例如某一校点本、不同卷次编排、修订版。

### SourceManifestation：具体出版物或数字版本

例如中华书局点校本、影印本、某数据库电子文本。

### SourceItem：具体文件、卷册、页面图像或抓取快照

用于稳定定位和复现。

第一阶段可以简化实现，但概念上必须能区分“《宋史》这部书”和“某网站上的《宋史》文本”。

## 7.3 SourceLocator

```text
SourceLocator
- source_item_id
- volume
- juan
- chapter
- page
- column
- line_start
- line_end
- paragraph
- anchor
- quote
- checksum
```

网页 URL 只能是辅助入口，不能替代卷、页、行或段落定位。网页内容可能变化。

## 7.4 Assertion

断言采用“带限定的陈述”模型：

```text
Assertion
- sid
- subject_id
- predicate_id
- object_entity_id OR literal_value
- valid_time_id
- spatial_context_id
- status
- asserted_by
- asserted_at
- method_id
```

不要无限制使用 EAV。常用领域对象仍写入强类型表；`Assertion` 用于保存来源陈述、争议、限定和证据链，并可生成或验证领域投影。

## 7.5 EvidenceLink

```text
EvidenceLink
- assertion_id
- source_locator_id
- evidence_role
- evidential_basis
- directness
- certainty
- curator_note
```

`evidence_role`：

- supports
- contradicts
- qualifies
- mentions
- derives_from
- corrects

`evidential_basis`：

- explicit_statement
- contextual_inference
- chronological_inference
- prosopographical_match
- spatial_match
- textual_variant
- algorithmic_extraction
- secondary_scholarship

## 7.6 断言状态

- `raw`：从文本或外部数据导入，尚未审校；
- `reviewed`：已由整理者检查；
- `accepted`：作为当前默认研究解释；
- `contested`：存在实质争议；
- `rejected`：保留记录但不采纳；
- `superseded`：被更细或更正的断言替代。

“accepted”不意味着永恒真理，只表示当前项目版本中的默认投影选择。

## 7.7 不确定性不是单一分数

不建议只用 `confidence = 0.83`。至少区分：

- 来源文本是否明确；
- 人物或地点消歧是否可靠；
- 日期换算是否可靠；
- 语义分类是否可靠；
- 多来源是否独立；
- 整理者是否做了推断。

可以提供面向排序的综合分数，但必须保留分项理由。

## 7.8 来源之间的独立性

五部后世著作都抄自同一材料，不等于五条独立证据。

```text
SourceRelation
- source_a
- relation_type
- source_b
- evidence
```

关系包括：

- copied_from
- quoted_from
- abridged_from
- revised_from
- translated_from
- shares_source_with

统计“来源数量”时应能控制传抄依赖。

## 7.9 数据加工来源

自动提取、人工修订、日期换算和实体合并本身也需要 provenance：

```text
CurationActivity
- input_entities
- output_entities
- agent
- software_version
- rule_set
- timestamp
```

这与 W3C PROV-O 的 `Entity—Activity—Agent` 思路对齐。

## 7.10 AI 使用规则

AI 可以：

- 提取候选实体和事件；
- 提出消歧候选；
- 生成结构化草稿；
- 比较来源异同；
- 帮助编写查询与解释。

AI 不可以在没有可定位来源的情况下直接把生成内容写成 `accepted` 断言。

每次 AI 导入必须保存：

- 模型与版本；
- prompt 或任务模板版本；
- 输入来源；
- 输出时间；
- 人工复核状态。

## 7.11 可追溯界面

任何详情页都应提供：

```text
显示结论
→ 查看组成记录
→ 查看断言
→ 查看证据定位
→ 打开来源或图像
→ 查看整理说明与冲突断言
```

证据追溯不是后台管理功能，而是前端研究体验的一部分。
