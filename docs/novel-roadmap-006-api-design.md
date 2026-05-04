# 小说引擎 API 设计 v0.1

## 目标

为小说引擎定义稳定、清晰、可扩展的 API，支撑：

- 小说项目管理
- 世界观管理
- 角色管理
- 大纲生成
- 章节生成
- 审校与修订
- 分镜输出
- 运行历史追踪

---

## 设计原则

1. **资源化设计**
   - 作品、世界观、角色、大纲、章节都作为独立资源

2. **生成与保存分离**
   - 生成接口负责产出结果
   - 保存接口负责持久化

3. **支持草稿 / 正式稿**
   - 生成结果先进入草稿态
   - 用户确认后再固化

4. **支持长篇迭代**
   - 所有接口都必须允许基于历史状态继续生成或修订

5. **面向前端和 worker 统一使用**
   - 前端页面和多 agent worker 都应使用同一套接口语义

---

## 基础前缀

建议统一使用：

```text
/api/novel
```

---

## 资源接口

### 1. 小说项目

#### `GET /api/novel/projects`
获取项目列表。

#### `POST /api/novel/projects`
创建小说项目。

#### `GET /api/novel/projects/:id`
获取项目详情。

#### `PUT /api/novel/projects/:id`
更新项目。

#### `DELETE /api/novel/projects/:id`
删除项目。

#### 建议字段
- `title`
- `genre`
- `sub_genres`
- `length_target`
- `target_audience`
- `style_tags`
- `commercial_tags`
- `status`

---

### 2. 世界观

#### `GET /api/novel/projects/:id/worldbuilding`
获取世界观。

#### `POST /api/novel/projects/:id/worldbuilding`
创建世界观。

#### `PUT /api/novel/projects/:id/worldbuilding`
更新世界观。

#### 建议字段
- `world_summary`
- `rules`
- `factions`
- `locations`
- `systems`
- `timeline_anchor`
- `known_unknowns`

---

### 3. 角色

#### `GET /api/novel/projects/:id/characters`
获取角色列表。

#### `POST /api/novel/projects/:id/characters`
创建角色。

#### `GET /api/novel/projects/:id/characters/:characterId`
获取角色详情。

#### `PUT /api/novel/projects/:id/characters/:characterId`
更新角色。

#### `DELETE /api/novel/projects/:id/characters/:characterId`
删除角色。

#### 建议字段
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

---

### 4. 大纲

#### `GET /api/novel/projects/:id/outlines`
获取大纲列表。

#### `POST /api/novel/projects/:id/outlines`
创建大纲草稿。

#### `GET /api/novel/projects/:id/outlines/:outlineId`
获取大纲详情。

#### `PUT /api/novel/projects/:id/outlines/:outlineId`
更新大纲。

#### `DELETE /api/novel/projects/:id/outlines/:outlineId`
删除大纲。

#### `POST /api/novel/projects/:id/outlines/generate`
生成大纲。

#### 建议输入
- `outline_type`
- `parent_id`
- `theme`
- `target_length`
- `worldbuilding_id`
- `character_ids`
- `market_reference`

#### 建议输出
- `title`
- `summary`
- `beats`
- `conflict_points`
- `turning_points`
- `hook`

---

### 5. 章节

#### `GET /api/novel/projects/:id/chapters`
获取章节列表。

#### `POST /api/novel/projects/:id/chapters`
创建章节草稿。

#### `GET /api/novel/projects/:id/chapters/:chapterId`
获取章节详情。

#### `PUT /api/novel/projects/:id/chapters/:chapterId`
更新章节。

#### `DELETE /api/novel/projects/:id/chapters/:chapterId`
删除章节。

#### `POST /api/novel/projects/:id/chapters/generate`
生成章节。

#### `POST /api/novel/projects/:id/chapters/:chapterId/revise`
修订章节。

#### `POST /api/novel/projects/:id/chapters/:chapterId/continue`
基于已有章节继续生成。

#### 建议输入
- `chapter_no`
- `outline_id`
- `target_length`
- `tone`
- `style`
- `history_snapshot_id`

#### 建议输出
- `chapter_goal`
- `chapter_summary`
- `scene_list`
- `chapter_text`
- `conflict`
- `ending_hook`

---

### 6. 事件 / 伏笔 / 时间线

#### `GET /api/novel/projects/:id/events`
获取事件列表。

#### `POST /api/novel/projects/:id/events`
创建事件记录。

#### `GET /api/novel/projects/:id/foreshadowing`
获取伏笔列表。

#### `POST /api/novel/projects/:id/foreshadowing`
创建伏笔。

#### `GET /api/novel/projects/:id/timeline`
获取时间线。

#### `POST /api/novel/projects/:id/timeline`
创建时间线记录。

---

## 生成接口

### 1. 市场分析

#### `POST /api/novel/analyze-market`
输入热门题材或用户偏好，输出市场分析结果。

#### 输入示例
- `genre`
- `target_audience`
- `theme`
- `sample_titles`

#### 输出示例
- `trend_summary`
- `common_structures`
- `hot_patterns`
- `risk_notes`
- `suggested_positioning`

---

### 2. 整体规划

#### `POST /api/novel/plan`
生成作品规划。

#### 输入
- `project_id`
- `market_analysis_id`
- `brief`
- `length_target`

#### 输出
- `positioning`
- `worldbuilding_plan`
- `character_plan`
- `outline_plan`
- `chapter_strategy`

---

### 3. 世界观生成

#### `POST /api/novel/worldbuild`
生成世界观草案。

#### 输入
- `project_id`
- `brief`
- `genre`
- `theme`

#### 输出
- `world_summary`
- `rules`
- `factions`
- `locations`
- `systems`

---

### 4. 角色生成

#### `POST /api/novel/characters/generate`
生成角色集合。

#### 输入
- `project_id`
- `worldbuilding_id`
- `outline_id`
- `count`

#### 输出
- 角色列表
- 关系图建议
- 成长线建议

---

### 5. 大纲生成

#### `POST /api/novel/outlines/generate`
生成总纲 / 卷纲 / 章纲。

#### 输入
- `project_id`
- `worldbuilding_id`
- `character_ids`
- `target_length`
- `outline_type`

#### 输出
- 大纲树
- 节点摘要
- 冲突点
- 钩子

---

### 6. 章节生成

#### `POST /api/novel/chapters/generate`
生成章节草稿。

#### 输入
- `project_id`
- `outline_id`
- `chapter_no`
- `history_snapshot_id`
- `style`

#### 输出
- 章节正文
- 章节摘要
- 场景列表
- 角色参与信息
- 伏笔记录

---

### 7. 审校 / 修订

#### `POST /api/novel/review`
对大纲或章节进行一致性审校。

#### 输入
- `project_id`
- `target_type`
- `target_id`

#### 输出
- 冲突列表
- 修订建议
- 风险等级
- 修订后的内容草案

---

### 8. 分镜输出

#### `POST /api/novel/storyboard`
把章节或场景转成分镜输入。

#### 输入
- `project_id`
- `chapter_id`
- `scene_filter`

#### 输出
- `scene_cards`
- `visual_keywords`
- `emotion_curve`
- `camera_hints`
- `node_candidates`

---

### 9. 导出

#### `POST /api/novel/export`
导出小说成果。

#### 输入
- `project_id`
- `format`
  - `markdown`
  - `json`
  - `docx`
  - `storyboard-input`

#### 输出
- 文件链接
- 导出摘要
- 产物路径

---

## 运行与历史接口

### `GET /api/novel/runs`
获取运行历史。

### `GET /api/novel/runs/:id`
获取单次运行详情。

### `POST /api/novel/runs/:id/retry`
重试一次运行。

### `POST /api/novel/runs/:id/stop`
停止一次运行。

---

## 前端与 worker 共用原则

前端页面和 worker 应共享一套语义：

- 同一份 project 状态
- 同一份 worldbuilding
- 同一份 chapter 状态
- 同一份 run record
- 同一份 snapshot

避免前后端各存一份，导致写作状态分裂。

---

## 分页与过滤建议

所有列表接口建议支持：
- `page`
- `pageSize`
- `status`
- `version`
- `keyword`
- `sort`

---

## 错误格式建议

建议统一返回：

```json
{
  "error": {
    "code": "NOVEL_CHAPTER_CONFLICT",
    "message": "章节与既有时间线冲突",
    "details": {}
  }
}
```

---

## 第一版实现优先级

### P0
- 项目 CRUD
- 世界观 CRUD
- 角色 CRUD
- 大纲生成
- 章节生成

### P1
- 审校接口
- 运行历史
- 导出接口

### P2
- 分镜输出
- 市场分析
- 重试 / 停止

---

## 备注

这份 API 设计会随着 `restored-src` 后端接入方式继续微调，但总体目标是：
- 对前端稳定
- 对 worker 统一
- 对长篇可扩展
- 对下游分镜友好
