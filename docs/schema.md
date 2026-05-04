# 小说工作台 Schema 说明

本文档定义当前小说工作台的数据结构，用于指导 JSON 存储、接口实现，以及后续迁移到 SQLite / PostgreSQL。

## 设计目标

- 以 `project` 为中心组织所有创作数据
- 保持内容结构清晰，便于编辑、审校、追踪流程
- 先兼容现有 JSON 存储，再为正式数据库迁移做准备

---

## 1. `projects`

### 用途
表示一个小说创作项目。

### 字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | number | 项目 ID |
| `title` | string | 项目标题 |
| `genre` | string | 题材 |
| `sub_genres` | string[] | 子题材 |
| `length_target` | string | 篇幅目标 |
| `target_audience` | string | 目标读者 |
| `style_tags` | string[] | 风格标签 |
| `commercial_tags` | string[] | 商业标签 |
| `status` | string | 项目状态 |
| `updated_at` | string | 最后更新时间 |
| `created_at` | string | 创建时间 |

### 常见取值

- `length_target`: `short` / `medium` / `long` / `epic`
- `status`: `draft` / `active` / `done` / `archived`

---

## 2. `worldbuilding`

### 用途
记录世界观设定、规则、阵营、地点和系统信息。

### 字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | number | 世界观记录 ID |
| `project_id` | number | 关联项目 ID |
| `world_summary` | string | 世界摘要 |
| `rules` | string[] | 规则列表 |
| `factions` | any[] | 阵营 / 势力 |
| `locations` | any[] | 地点 |
| `systems` | any[] | 系统设定 |
| `timeline_anchor` | string | 时间锚点 |
| `known_unknowns` | string[] | 已知未知项 |
| `version` | number | 版本号 |
| `created_at` | string | 创建时间 |
| `updated_at` | string | 更新时间 |

### 建议

后续正式化时，`factions`、`locations`、`systems` 可以拆成独立结构或 JSONB 字段。

---

## 3. `characters`

### 用途
记录角色设定。

### 字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | number | 角色 ID |
| `project_id` | number | 关联项目 ID |
| `name` | string | 角色名 |
| `role_type` | string | 角色定位 |
| `archetype` | string | 角色原型 |
| `motivation` | string | 动机 |
| `goal` | string | 目标 |
| `conflict` | string | 冲突 |
| `updated_at` | string | 更新时间 |
| `created_at` | string | 创建时间 |

### 建议扩展字段

- `age`
- `gender`
- `appearance`
- `relationship`
- `status_arc`

---

## 4. `outlines`

### 用途
记录总纲、卷纲、章纲等结构信息。

### 字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | number | 大纲 ID |
| `project_id` | number | 关联项目 ID |
| `outline_type` | string | 类型：`master` / `volume` / `chapter` |
| `title` | string | 标题 |
| `summary` | string | 概要 |
| `conflict_points` | string[] | 冲突点 |
| `turning_points` | string[] | 转折点 |
| `hook` | string | 钩子 |
| `parent_id` | number \| null | 父级大纲 ID |
| `updated_at` | string | 更新时间 |
| `created_at` | string | 创建时间 |

### 说明

`outlines` 是树形结构，`parent_id` 用于表示层级关系。

---

## 5. `chapters`

### 用途
记录章节结构与正文内容，是正文创作的核心数据。

### 字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | number | 章节 ID |
| `project_id` | number | 关联项目 ID |
| `outline_id` | number \| null | 所属大纲 |
| `chapter_no` | number | 章节序号 |
| `title` | string | 章节标题 |
| `chapter_goal` | string | 章节目标 |
| `chapter_summary` | string | 章节摘要 |
| `conflict` | string | 冲突 |
| `ending_hook` | string | 结尾钩子 |
| `chapter_text` | string | 正文 |
| `scene_breakdown` | any[] | 分场结构 |
| `continuity_notes` | string[] | 连贯性备注 |
| `status` | string | 状态 |
| `updated_at` | string | 更新时间 |
| `created_at` | string | 创建时间 |

### 常见取值

- `status`: `draft` / `reviewing` / `published`

### 约束建议

- `UNIQUE(project_id, chapter_no)`

---

## 6. `reviews`

### 用途
记录连续性审校、修复摘要与问题列表。

### 字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | number | 审校记录 ID |
| `project_id` | number | 关联项目 ID |
| `review_type` | string | 审校类型 |
| `status` | string | 结果状态 |
| `summary` | string | 摘要 |
| `issues` | string[] | 问题列表 |
| `created_at` | string | 创建时间 |

### 常见取值

- `review_type`: `continuity` / `repair`
- `status`: `ok` / `warning` / `failed`

---

## 7. `runs`

### 用途
记录规划、执行、修复等流程运行日志。

### 字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | number | 运行记录 ID |
| `project_id` | number | 关联项目 ID |
| `run_type` | string | 运行类型 |
| `step_name` | string | 步骤名 |
| `status` | string | 状态 |
| `input_ref` | string | 输入引用 |
| `output_ref` | string | 输出引用 |
| `duration_ms` | number | 耗时 |
| `error_message` | string | 错误信息 |
| `created_at` | string | 创建时间 |

### 常见取值

- `run_type`: `plan` / `agent_execute` / `repair`
- `status`: `pending` / `running` / `success` / `failed`

---

## 关系总览

- `projects` 1 --- N `worldbuilding`
- `projects` 1 --- N `characters`
- `projects` 1 --- N `outlines`
- `projects` 1 --- N `chapters`
- `projects` 1 --- N `reviews`
- `projects` 1 --- N `runs`

### 层级关系

- `outlines.parent_id` -> `outlines.id`
- `chapters.outline_id` -> `outlines.id`

---

## JSON 字段建议

以下字段当前可先保留为 JSON / TEXT 存储：

- `projects.sub_genres`
- `projects.style_tags`
- `projects.commercial_tags`
- `worldbuilding.rules`
- `worldbuilding.factions`
- `worldbuilding.locations`
- `worldbuilding.systems`
- `worldbuilding.known_unknowns`
- `outlines.conflict_points`
- `outlines.turning_points`
- `chapters.scene_breakdown`
- `chapters.continuity_notes`
- `reviews.issues`

---

## 推荐迁移顺序

### 第一阶段

- 维持现有 JSON 接口不变
- 用本清单稳定字段定义

### 第二阶段

- 迁移 `projects`、`outlines`、`chapters`、`reviews`、`runs` 到 SQLite

### 第三阶段

- 视项目规模，再考虑 PostgreSQL + JSONB

---

## 总结

这套 schema 可以视为一个以 `project` 为中心的结构化创作模型，覆盖：

- 世界观
- 角色
- 大纲
- 章节
- 审校
- 运行记录

它已经足够支撑当前产品，并为后续数据库迁移打下基础。
