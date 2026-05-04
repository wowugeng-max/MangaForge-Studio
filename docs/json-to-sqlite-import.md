# JSON → SQLite 导入脚本草案

本文档描述如何将当前 `workspace/novel-store.json` 迁移到 SQLite 数据库。它的目标是：

- 保留当前数据
- 保持关联关系正确
- 尽量不影响现有前端和 API
- 为后续逐步切换写入源做准备

---

## 输入数据

当前 JSON 存储包含以下顶层集合：

- `projects`
- `worldbuilding`
- `characters`
- `outlines`
- `chapters`
- `reviews`
- `runs`

---

## 导入目标表

- `projects`
- `worldbuilding`
- `characters`
- `outlines`
- `chapters`
- `reviews`
- `runs`

---

## 导入原则

1. **优先保留原始 ID**
   - 如果数据库允许，可直接使用 JSON 中的 `id`
   - 这样外键关系更容易保持一致

2. **按依赖顺序导入**
   - 先导入 `projects`
   - 再导入依赖 `project_id` 的表
   - `outlines` 在 `chapters` 之前导入

3. **数组字段序列化为 JSON 字符串**
   - 例如 `sub_genres`、`style_tags`、`rules`、`scene_breakdown`
   - 导入时写成 `TEXT` / `JSON` 字段

4. **时间字段统一格式**
   - 建议统一为 ISO 8601 字符串
   - SQLite 中可存为 `TEXT`

---

## 推荐导入顺序

### 1. `projects`

先导入项目表，因为其他所有记录都依赖它。

### 2. `worldbuilding`

按 `project_id` 导入。

### 3. `characters`

按 `project_id` 导入。

### 4. `outlines`

按 `project_id` 导入，同时保留 `parent_id`。

### 5. `chapters`

按 `project_id` 导入，同时保留 `outline_id`。

### 6. `reviews`

按 `project_id` 导入。

### 7. `runs`

按 `project_id` 导入。

---

## 伪代码流程

```text
read novel-store.json
parse JSON
open sqlite connection
BEGIN TRANSACTION

for each project in projects:
  insert project

for each record in worldbuilding:
  insert worldbuilding

for each record in characters:
  insert characters

for each record in outlines:
  insert outlines

for each record in chapters:
  insert chapters

for each record in reviews:
  insert reviews

for each record in runs:
  insert runs

COMMIT
```

---

## Node.js / TypeScript 导入脚本草案

```ts
import { readFile } from 'fs/promises'
import Database from 'better-sqlite3'

async function main() {
  const raw = await readFile('workspace/novel-store.json', 'utf8')
  const store = JSON.parse(raw)
  const db = new Database('workspace/novel.sqlite')

  const insertProject = db.prepare(`
    INSERT INTO projects (
      id, title, genre, sub_genres, length_target,
      target_audience, style_tags, commercial_tags,
      status, created_at, updated_at
    ) VALUES (
      @id, @title, @genre, @sub_genres, @length_target,
      @target_audience, @style_tags, @commercial_tags,
      @status, @created_at, @updated_at
    )
  `)

  const insertWorldbuilding = db.prepare(`
    INSERT INTO worldbuilding (
      id, project_id, world_summary, rules, factions,
      locations, systems, timeline_anchor, known_unknowns,
      version, created_at, updated_at
    ) VALUES (
      @id, @project_id, @world_summary, @rules, @factions,
      @locations, @systems, @timeline_anchor, @known_unknowns,
      @version, @created_at, @updated_at
    )
  `)

  // ...其他表的 insert 语句同理...

  const tx = db.transaction(() => {
    for (const project of store.projects || []) {
      insertProject.run({
        ...project,
        sub_genres: JSON.stringify(project.sub_genres || []),
        style_tags: JSON.stringify(project.style_tags || []),
        commercial_tags: JSON.stringify(project.commercial_tags || []),
      })
    }

    for (const record of store.worldbuilding || []) {
      insertWorldbuilding.run({
        ...record,
        rules: JSON.stringify(record.rules || []),
        factions: JSON.stringify(record.factions || []),
        locations: JSON.stringify(record.locations || []),
        systems: JSON.stringify(record.systems || []),
        known_unknowns: JSON.stringify(record.known_unknowns || []),
      })
    }

    // ...继续导入 characters / outlines / chapters / reviews / runs
  })

  tx()
  db.close()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
```

---

## 关键实现细节

### 1. JSON 字段序列化

导入 SQLite 前应统一处理为字符串：

- `sub_genres`
- `style_tags`
- `commercial_tags`
- `rules`
- `factions`
- `locations`
- `systems`
- `known_unknowns`
- `conflict_points`
- `turning_points`
- `scene_breakdown`
- `continuity_notes`
- `issues`

### 2. 外键顺序

必须保证：

- `projects` 先导入
- `outlines` 在 `chapters` 前导入
- `parent_id` 所引用的大纲记录在同一批导入中已经存在

### 3. 去重策略

如果未来支持重复导入，建议：

- 以 `id` 作为主键覆盖或跳过
- 或先清库后导入

目前最稳妥的是：
- 只执行一次迁移
- 迁移前备份 JSON 和 SQLite 文件

### 4. 事务包裹

必须使用事务：

- 任一条插入失败时回滚
- 避免半套数据导入成功

---

## 校验建议

导入完成后，至少检查以下内容：

- 项目数是否一致
- 章节数是否一致
- 外键是否全部可查
- `parent_id` 是否正确
- `outline_id` 是否正确
- `chapter_no` 是否连续或符合原始数据

---

## 迁移完成后的建议

迁移完成后，建议保留以下文件：

- `workspace/novel-store.json` 作为迁移备份
- `docs/sqlite-migration.sql` 作为建库草案
- `docs/json-to-sqlite-import.md` 作为迁移说明

---

## 总结

这份导入草案的原则是：

1. 先建表
2. 再按顺序导入
3. 用事务保证一致性
4. 保留 JSON 字段为字符串
5. 尽量保留原始 ID

这样可以最大限度保证迁移平滑且可回滚。
