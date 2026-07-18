# Novel Store SQL Repos 设计

**日期：** 2026-07-18  
**状态：** 已确认  
**范围：** 拆除 `mutateNovelStore` 整库重写，按实体定点 SQL 仓储化，并拆分 `ui/server/src/novel.ts` 巨石模块。

---

## 1. 背景与问题

当前 novel 持久化虽已用 SQLite，但大量写路径仍走：

1. `loadStoreFromOpenDb`：`SELECT *` 装入全部 projects / chapters / reviews / runs ...
2. 内存中改一行
3. `replaceStoreInOpenDb`：`DELETE` 全表 + 全量 `INSERT`

实测影响（project 3 量级）：

| 指标 | 观察 |
|---|---|
| DB 体积 | ~90MB，其中 reviews ~63MB |
| reviews 行数 | ~3300+ |
| 整库物化 | 文本 ~31MB → 对象约 100MB+ |
| 写时峰值 | physical footprint peak ~525MB |
| 空闲 | 可回落到 ~100MB+ |

已部分 SQL 化的样板：

- `createNovelReview` → 单表 `INSERT`
- `appendNovelRun` → 单表 `INSERT`
- `mergeNovelChapterRawPayload` → 定点读改写
- list 侧 project-scoped 查询 + memory contract 测试

未完成的主因是 **写路径仍以 `NovelStore` 内存镜像为中心**。

---

## 2. 目标

1. **全部实体写路径**改为定点 SQL，生产代码不再调用 `mutateNovelStore` / 热路径 `replaceStoreInOpenDb`。
2. **跨表原子写**（尤其 `commitNovelChapterAcceptance`）在同一事务内用多条定点 SQL 完成，禁止整库 `structuredClone`。
3. **模块化**：`ui/server/src/novel.ts` 变为兼容 re-export；实现拆到 `ui/server/src/novel/`。
4. **测试模块化**：拆分 `novel.test.ts` 巨石，按 repo/领域单测；增加源码级合约防止回归。
5. **对外 API 兼容**：routes / frontend 继续 `from '../novel'` 或等价 barrel，业务语义不变。

## 3. 非目标

- 不改写作业务规则（空正文保护、版本快照、acceptance 校验等）。
- 本轮不拆 `novel-writing-service.ts`（约 4.8 万行）。
- 不引入新的 ORM。
- 不强制在本轮做 review 历史清理/归档（可后续独立做）。
- 不改变 `novel.sqlite` 表结构（除非现有路径已隐含需要且测试覆盖）。

---

## 4. 架构

### 4.1 原则

```text
withNovelWorkspaceMutation (进程内锁)
  └─ openDb + BEGIN IMMEDIATE
       ├─ 只读需要的行
       ├─ normalize / 业务 guard
       ├─ 定点 INSERT / UPDATE / DELETE
       └─ COMMIT
```

- **单实体写**：单表定点 SQL
- **跨实体写**：同一事务多表定点 SQL
- **ID**：优先 `lastInsertRowid`；需要预知 id 时用单表 `MAX(id)+1`
- **锁**：保留 `withNovelWorkspaceMutation` + `BEGIN IMMEDIATE`
- **遗留 JSON 导入**：仅 `legacy-import` 可全量写入，命名隔离，禁止业务调用

### 4.2 目标目录

```text
ui/server/src/novel/
  index.ts                 # 公共 re-export
  types.ts                 # Novel*Record / options / acceptance input
  db.ts                    # paths, openDb, ensureSqliteSchema, indexes
  lock.ts                  # mutation lock + withNovelWorkspaceMutation
  json.ts                  # parseDbJson / jsonText / compact helpers 入口
  normalize/
    project.ts
    worldbuilding.ts
    character.ts
    outline.ts
    chapter.ts
    review.ts
    run.ts
    setting-entity.ts
    chapter-setting-usage.ts
    project-seed-draft.ts
  repos/
    projects.ts
    worldbuilding.ts
    characters.ts
    outlines.ts
    chapters.ts
    chapter-versions.ts
    reviews.ts
    runs.ts
    setting-entities.ts
    chapter-setting-usage.ts
    project-seed-drafts.ts
  acceptance.ts            # commitNovelChapterAcceptance
  legacy-import.ts         # novel-store.json → sqlite（仅迁移）
  compaction.ts            # 历史 payload 压缩
  pipeline-snapshot.ts     # 只读聚合查询
  row-mappers.ts           # *FromRow helpers

ui/server/src/novel.ts     # export * from './novel' （兼容层， ideally <50 行）
```

### 4.3 模块职责

| 模块 | 职责 | 不得做 |
|---|---|---|
| `db.ts` | 连接、schema、索引 | 业务 mutate |
| `lock.ts` | 工作区写锁 | 直接 SQL 业务 |
| `normalize/*` | 记录规范化、compact | 打开数据库 |
| `repos/*` | 单表/弱关联 CRUD | 整库 load |
| `acceptance.ts` | 跨表入库事务 | 整库 clone |
| `legacy-import.ts` | 一次性导入 | 被热路径调用 |
| `index.ts` | 稳定导出面 | 塞业务实现 |

### 4.4 写路径范式

```ts
export async function updateNovelChapter(
  activeWorkspace: string,
  chapterId: number,
  data: Partial<NovelChapterRecord>,
  options: UpdateNovelChapterOptions = {},
) {
  return withNovelWorkspaceMutation(activeWorkspace, async () => {
    const db = openDb(activeWorkspace)
    try {
      ensureSqliteSchema(db)
      db.exec('BEGIN IMMEDIATE')
      const current = selectChapterById(db, chapterId)
      if (!current) {
        db.exec('COMMIT')
        return null
      }
      // empty-prose guard + normalize ...
      if (shouldCreateVersion) insertChapterVersion(db, snapshot)
      updateChapterRow(db, next)
      db.exec('COMMIT')
      return next
    } catch (error) {
      try { db.exec('ROLLBACK') } catch { /* ignore */ }
      throw error
    } finally {
      db.close()
    }
  })
}
```

### 4.5 Acceptance 目标流

现状：

```text
load 全库 → structuredClone 全库 → 内存改 → diff → 写回
```

目标：

```text
BEGIN IMMEDIATE
  SELECT chapter / project（必要行）
  校验 immutable 引用
  UPDATE chapter
  INSERT chapter_version（如需）
  INSERT reviews[]
  UPSERT setting_entities / usage
  UPDATE project（如有）
  INSERT worldbuilding/character creates（如有）
COMMIT
```

禁止为 acceptance 装载全部 reviews/runs。

---

## 5. 实体迁移清单

| 实体 | 函数 | 现状 | 目标 |
|---|---|---|---|
| projects | list/get/create/update/delete | create/update/delete 走 mutate | 全 SQL repo |
| worldbuilding | list/create/update | create/update 走 mutate | 全 SQL repo |
| characters | list/create/update | create/update 走 mutate | 全 SQL repo |
| outlines | list/create/update/delete | 写路径 mutate | 全 SQL repo |
| chapters | list/workspace/get/create/update/upsert/delete | 写路径 mutate | 全 SQL repo |
| chapter_versions | list/create/rollback | mutate | 全 SQL repo |
| reviews | list/summary/get/create | create 已 SQL | 迁入 `repos/reviews.ts` |
| runs | list/summary/append/update | append 已 SQL；update mutate | 全 SQL repo |
| setting_entities | list/create/update/delete | mutate | 全 SQL repo |
| chapter_setting_usage | list/replace/update | mutate | 全 SQL repo |
| project_seed_drafts | list/create/delete | 部分 SQL | 全 SQL repo |
| acceptance | commitNovelChapterAcceptance | 整库 load+clone | 定点事务 |
| legacy | import json | replaceStore | 仅 legacy 命名隔离 |
| mutateNovelStore | 全部调用方 | 核心问题 | **删除** |

最终：生产代码 `mutateNovelStore(` / 热路径 `replaceStoreInOpenDb(` 为 **0**。

---

## 6. 兼容性

1. 保留 `ui/server/src/novel.ts`：
   ```ts
   export * from './novel'
   ```
2. 公开类型与函数名不变。
3. routes 尽量零改；若需改 import，允许改为 `from '../novel'` 继续工作。
4. 测试 hook（`getNovelMutationTestHook` / phase）语义保留：
   - `after_mutation_lock_acquired`
   - 去掉 `before_full_store_write` 或改为 `before_sql_commit`（实现期二选一并更新测试）

---

## 7. 测试策略

### 7.1 结构

```text
ui/server/src/novel/
  mutation-contract.test.ts
  list-memory-contract.test.ts
  repos/chapters.test.ts
  repos/reviews.test.ts
  repos/runs.test.ts
  repos/projects.test.ts
  ...
  acceptance.test.ts
  legacy-import.test.ts
  compaction.test.ts
```

`ui/server/src/novel.test.ts` 行为测试迁出后删除或缩成 re-export 引导注释。

### 7.2 必须覆盖

1. **Repo 隔离**：`updateNovelChapter` 不改动 reviews 行数与其他项目数据。
2. **空正文保护**：manual_edit 默认不可用空正文覆盖已有正文。
3. **版本快照**：正文变更生成 version；无变更不生成。
4. **Acceptance 原子性**：成功全写；中途失败全回滚。
5. **源码合约**：
   - 热路径函数不得包含 `loadStoreFromOpenDb` / `replaceStoreInOpenDb` / `mutateNovelStore`
   - list 查询保持 project-scoped（迁入现有 memory contract）
6. **兼容 API**：`import { updateNovelChapter } from '../novel'` 仍可用。

### 7.3 性能验证（手工/可选）

- fixture 插入大量 reviews 后执行 `updateNovelChapter`
- 观察不应再出现“整库 DELETE/INSERT reviews”行为
- 写一章后 physical footprint 峰值应显著低于改造前（经验：不再轻易 500MB+）

---

## 8. 实施阶段

| 阶段 | 内容 | 完成定义 |
|---|---|---|
| 0 | `novel/` 骨架 + types/db/lock/json + 兼容 re-export | 行为不变，测试绿 |
| 1 | reviews/runs repo 迁入（已有 SQL） | 样板与目录稳定 |
| 2 | chapters + versions 全 SQL | 写章热路径脱离整库 |
| 3 | acceptance 定点事务 | 入库无整库 clone |
| 4 | projects/characters/outlines/worldbuilding | 创建与设定写路径 SQL 化 |
| 5 | settings/usage/seed-drafts/deletes | 剩余实体完成 |
| 6 | 删除 mutate/replace 热路径 + 合约锁死 + 拆 monotest | 架构收口 |
| 7 | 回归验证 | bun 相关测试绿；手工写章观察内存 |

每阶段独立可提交；总目标一轮工程内完成，不长期双轨。

---

## 9. 风险与缓解

| 风险 | 缓解 |
|---|---|
| acceptance 漏字段 | 先迁移现有 acceptance 测试，再改实现 |
| normalize 行为漂移 | 先原样搬迁 normalize，禁止顺手改语义 |
| ID 竞态 | 全程 mutation lock + `BEGIN IMMEDIATE` |
| 大挪移冲突 | facade 先行，分阶段搬函数 |
| 测试遗漏 | 旧 `novel.test.ts` 用例按文件迁移，删除前 diff 覆盖清单 |
| legacy import 误用 | 函数名 `importLegacyNovelStoreIfNeeded` 仅内部；合约禁止业务文件引用 `replaceStore*` |

---

## 10. 成功标准

- [ ] 生产写路径 0 次 `mutateNovelStore` / 热路径 `replaceStoreInOpenDb`
- [ ] `ui/server/src/novel.ts` 仅为兼容 re-export
- [ ] 单 repo 文件体量可控（目标 <600 行）
- [ ] 测试按模块拆分，无 1900+ 行巨石 novel 单测作为唯一归属
- [ ] 现有相关 bun test 通过
- [ ] 写章/入库内存尖刺明显下降

---

## 11. 后续可选项（本设计不包含）

- review 历史归档 / TTL
- `raw_payload` snake/camel 双键消除
- `novel-writing-service.ts` 拆分
- runs input/output 外置 blob 存储
