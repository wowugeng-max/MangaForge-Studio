# 小说引擎数据模型设计 v0.1

## 目标

为小说引擎建立稳定、可扩展、可回溯的数据模型，支撑：

- 短中长篇小说创作
- 多 agent 协作
- 大纲 / 细纲 / 章节生成
- 百万字级别长篇管理
- 小说到分镜的结构化输出
- 与漫剧生产链路的对接

---

## 设计原则

1. **分层存储**
   - 作品、世界观、角色、章节、事件分开管理
   - 避免单一大 JSON 塞满所有内容

2. **版本化**
   - 所有关键对象都应支持版本记录
   - 方便回溯与分支创作

3. **结构化优先**
   - 不把正文当唯一核心
   - 大纲、事件、角色关系、时间线同样重要

4. **可压缩摘要**
   - 长篇无法依赖全量上下文
   - 所以要保留摘要层与索引层

5. **面向下游输出**
   - 每个章节都应能导出为分镜输入
   - 结构设计必须为漫剧链路服务

---

## 核心对象

### 1. NovelProject（作品）

代表一部小说的总容器。

#### 关键字段
- `id`
- `title`
- `genre`
- `sub_genres`
- `length_target`
- `target_audience`
- `style_tags`
- `commercial_tags`
- `status`
- `created_at`
- `updated_at`

#### 说明
这是最顶层对象，所有其它内容都挂在作品之下。

---

### 2. NovelWorldbuilding（世界观）

记录作品世界的规则与约束。

#### 关键字段
- `project_id`
- `world_summary`
- `rules`
- `factions`
- `locations`
- `systems`
- `timeline_anchor`
- `known_unknowns`
- `version`

#### 说明
世界观必须支持扩展和修订，尤其是长篇写作中可能不断补充设定。

---

### 3. NovelCharacter（角色）

记录角色设定和状态。

#### 关键字段
- `project_id`
- `name`
- `role_type`
- `archetype`
- `motivation`
- `goal`
- `conflict`
- `relationship_graph`
- `growth_arc`
- `current_state`
- `secret`
- `appearance`
- `abilities`
- `status`
- `version`

#### 说明
角色不是静态信息，而是随着章节推进不断演化的状态体。

---

### 4. NovelOutline（大纲）

分层大纲结构，支持总纲 / 卷纲 / 章纲。

#### 关键字段
- `project_id`
- `outline_type`（`master` / `volume` / `chapter`）
- `parent_id`
- `title`
- `summary`
- `beats`
- `conflict_points`
- `turning_points`
- `hook`
- `target_length`
- `version`

#### 说明
大纲是长篇稳定性的核心，必须支持树形结构。

---

### 5. NovelChapter（章节）

记录章节正文与章节结构。

#### 关键字段
- `project_id`
- `chapter_no`
- `title`
- `chapter_goal`
- `chapter_summary`
- `scene_list`
- `chapter_text`
- `conflict`
- `ending_hook`
- `status`
- `version`
- `published_at`

#### 说明
章节对象应同时存正文和结构化信息，方便后续分镜转换。

---

### 6. NovelEvent（事件）

用于记录故事中的关键事件流。

#### 关键字段
- `project_id`
- `event_id`
- `chapter_no`
- `event_type`
- `summary`
- `participants`
- `impact`
- `timestamp_in_story`
- `resolved`
- `version`

#### 说明
事件表是长篇连续性的核心，可用于回溯、审校、伏笔管理。

---

### 7. NovelForeshadowing（伏笔）

专门管理伏笔和回收。

#### 关键字段
- `project_id`
- `foreshadow_id`
- `origin_chapter`
- `description`
- `expected_resolution`
- `status`
- `resolved_in_chapter`
- `importance`

#### 说明
百万字级别作品如果没有伏笔系统，极易失控。

---

### 8. NovelTimeline（时间线）

记录故事内时间流转。

#### 关键字段
- `project_id`
- `timeline_id`
- `story_time`
- `chapter_no`
- `event_id`
- `description`
- `order_index`

#### 说明
用于保证事件顺序、人物年龄、状态变化不冲突。

---

### 9. NovelMemorySnapshot（记忆快照）

用于长篇上下文压缩与恢复。

#### 关键字段
- `project_id`
- `snapshot_type`
- `content`
- `coverage`
- `created_at`
- `source_range`
- `version`

#### 说明
记忆快照可分为：
- 世界观快照
- 角色快照
- 事件快照
- 章节快照
- 卷级摘要

---

### 10. NovelRunRecord（运行记录）

记录每次生成 / 修订 / 校验的执行过程。

#### 关键字段
- `project_id`
- `run_type`
- `step_name`
- `status`
- `input_ref`
- `output_ref`
- `duration_ms`
- `error_message`
- `created_at`

#### 说明
这是可追溯开发和创作过程的关键对象。

---

## 建议关系图

```text
NovelProject
├── NovelWorldbuilding
├── NovelCharacter[]
├── NovelOutline[]
├── NovelChapter[]
├── NovelEvent[]
├── NovelForeshadowing[]
├── NovelTimeline[]
├── NovelMemorySnapshot[]
└── NovelRunRecord[]
```

---

## 面向多 Agent 的数据流

### 1. 市场分析 Agent
输入：题材偏好、用户画像、历史热门模式
输出：题材建议、结构建议、风格建议

### 2. 主编 Agent
输入：市场分析结果、用户目标
输出：作品定位、创作策略、内容限制

### 3. 世界观 Agent
输入：作品定位
输出：世界观对象、规则、势力、地点

### 4. 角色 Agent
输入：世界观、作品定位
输出：角色对象、关系图、成长线

### 5. 大纲 Agent
输入：世界观、角色
输出：总纲 / 卷纲 / 章纲

### 6. 章节 Agent
输入：章纲、角色状态、历史摘要
输出：章节正文、事件流、伏笔更新

### 7. 审校 Agent
输入：章节结果、事件流、时间线
输出：一致性修订建议

### 8. 分镜 Agent
输入：章节结构、场景列表
输出：分镜脚本、画布输入

---

## 长篇支持的关键字段

### 必须长期维护
- `current_state`
- `growth_arc`
- `relationship_graph`
- `timeline`
- `foreshadowing`
- `memory_snapshot`
- `version`

### 必须持续压缩
- 章节摘要
- 卷摘要
- 角色摘要
- 事件摘要
- 世界观摘要

---

## 建议的存储策略

### 主表 + 子表
不要把所有内容堆在一个 JSON 中。

建议：
- 主表存核心字段
- 子表存扩展内容
- 长文本与正文单独存储
- 历史版本单独存储

### 结构化文本
正文虽然是文本，但至少要附带：
- 章节目标
- 场景切分
- 角色参与
- 事件列表
- 钩子信息

---

## 与分镜链路的对接字段

章节对象建议额外提供：
- `scene_list`
- `shot_candidates`
- `visual_keywords`
- `emotion_curve`
- `camera_hints`
- `art_direction`

这样可以直接进入后续分镜与无限画布流程。

---

## 版本演进建议

### v0.1
- 定义核心数据模型
- 完成项目 / 世界观 / 角色 / 大纲 / 章节 CRUD

### v0.2
- 接入多 agent 写作流程
- 引入事件 / 时间线 / 伏笔

### v0.3
- 支持长篇记忆快照
- 支持连续性审校

### v0.4
- 对接分镜输出
- 对接无限画布

### v0.5
- 加入热门题材分析与知识吸收

---

## 备注

这份数据模型会作为后续后端实现、前端页面设计和多 agent 调度的共同基础。后续如果需要，可以继续拆出：
- `novel-roadmap-005-api-design.md`
- `novel-roadmap-006-agent-workflow.md`
- `novel-roadmap-007-ui-spec.md`
