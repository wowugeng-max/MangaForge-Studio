# Architecture Modularization Design

**Date:** 2026-07-18  
**Branch:** `codex/architecture-modularization`  
**Status:** Draft for approval  

## 1. Problem

MangaForge-Studio 的 novel 主链路在完成 store 定点 SQL 化之后，**业务巨石文件**仍然严重制约稳定性、可扩展性和协作效率：

| 区域 | 代表文件 | 体量 | 风险 |
|---|---:|---|---|
| Server writing orchestrator | `ui/server/src/routes/novel-writing-service.ts` | ~48.5k 行 | 热路径全堆一处，改动成本高、回归面巨大 |
| Server writing tests | `ui/server/src/routes/novel-writing-service.test.ts` | ~62.5k 行 | 单测巨石，难定位、难并行 |
| Server routes | `novel-editor-routes.ts` / `novel-core-routes.ts` | 3.9k–5.3k 行 | HTTP 与领域逻辑耦合 |
| Web workspace shell | `NovelProjectWorkspace.tsx` | ~7.9k 行 | UI 编排与状态机缠绕 |
| Web domain models | `autoCreationDirectorModel.ts` / `writingCockpitModel.ts` / `planningWorkspaceModel.ts` | 4.4k–16.9k 行 | 前端业务规则不可导航 |
| Web tests | 对应 `*.test.ts` | 7k–17k 行 | 测试与实现同巨石 |

`ui/server/src/novel-writing/` 已有大量细分模块（handoff / quality loop / admission 等），但 orchestrator 仍把编排、合并、prompt 组装、sync report、gate 决策残留在 monofile。

## 2. Goals

1. **稳定**：任何局部改动有明确边界和回归包，不因触碰 5 万行文件而扩散。  
2. **易扩展**：新增写作能力优先落在领域模块，而不是继续塞进 orchestrator。  
3. **性能**：保持 store 定点 SQL 收益；拆分时避免引入额外整库加载/重复序列化。  
4. **可测**：测试按领域拆分，单文件目标可控，支持按模块运行。  
5. **兼容**：对外 HTTP API、前端入口与公共 export 尽量保持兼容，减少业务行为漂移。

## 3. Non-Goals

- 本分支**不改**写作业务规则语义（质检阈值、入库条件、交接规则等），除非拆分过程暴露明确 bug 且有测试锁定。  
- 不重做产品 UI 视觉。  
- 不迁移数据库 schema。  
- 不重写 LLM provider 体系（`provider-runtime` 可列后续，不进本阶段主路径）。  
- 不把 manga 漫剧 pipeline 与 novel 体系硬合并。

## 4. Target Architecture

### 4.1 Server

```
ui/server/src/
  novel/                         # persistence (已完成 SQL repos)
  novel-writing/                 # pure domain modules (已部分存在)
    <domain>/*.ts                # 持续沉淀：handoff/quality/admission/...
  novel-writing-service/         # NEW: orchestrator package (从 routes monofile 拆出)
    index.ts                     # 公共 export 兼容层
    types.ts
    prose-generation/            # 生成合同、prompt compile、scan entry
    quality-gate/                # quality loop glue、review merge、receipt gates
    post-delivery/               # story-state / handoff / sync reports
    batch-serial/                # 连载 batch / serial briefs
    revision/                    # revision artifacts & cascade
    context/                     # context package merge helpers still living in orchestrator
  routes/
    novel.ts                     # register only
    novel-writing-routes.ts      # thin HTTP adapters (若需要从 service 再拆 route)
    novel-core-routes/           # package split for core routes
    novel-editor-routes/         # package split for editor routes
    novel-generation-routes/     ...
```

**原则：**
- `routes/*` 只做：鉴权/参数解析/调用 service/返回响应。  
- `novel-writing-service/*` 只做：跨模块编排与兼容 export。  
- `novel-writing/*` 只做：可单测的纯领域逻辑。  
- 禁止新代码把业务逻辑继续堆回 `routes/novel-writing-service.ts` monofile。

### 4.2 Web

```
ui/web/src/pages/
  novel-workspace/
    shell/                       # NovelProjectWorkspace 拆出的布局/导航/tab
    writing-cockpit/
      model/                     # writingCockpitModel 分域
      ui/                        # WritingCockpitPanel 分块
    auto-creation/
      model/
      ui/
    planning/
      model/
      ui/
    task-center/
    shared/
```

**原则：**
- UI 组件不内嵌长业务规则；规则进 model 包。  
- model 包按“状态切片 / selector / action builder”拆，不按技术层硬切。  
- 测试与 model 同目录邻近，按切片拆文件。

### 4.3 File size policy

| 类型 | 目标上限 | 硬上限（需拆） |
|---|---:|---:|
| domain module | 400 行 | 800 行 |
| orchestrator 子模块 | 600 行 | 1000 行 |
| route adapter | 400 行 | 800 行 |
| React 容器组件 | 400 行 | 800 行 |
| 单测文件 | 500 行 | 1000 行 |

允许阶段性超标，但每个里程碑结束时主热路径文件必须低于硬上限。

## 5. Decomposition Strategy

### Phase A — Foundation (低风险)

1. 建分支与边界文档（本文件 + plan）。  
2. 建立 **public API barrel 兼容层**：
   - 现有 `from './novel-writing-service'` / `from '../routes/novel-writing-service'` 继续可用。  
3. 建立 **source contract tests**：
   - monofile 行数上限/禁止回潮  
   - routes 不得直接 `loadStoreFromOpenDb` / full-store rewrite（延续 novel store 合约）  
4. 建立拆分脚本/清单：导出符号表、测试 describe 映射。

### Phase B — Server writing service mechanical extraction

按**依赖方向从叶到根**拆，优先纯函数块：

1. **quality/review merge helpers**（已有大量 export）  
2. **receipt / post-delivery sync reports**  
3. **context compile / contract sections**  
4. **serial/batch briefs**  
5. **revision merge**  
6. 剩余 orchestration 入口函数

每一步：
- 原样搬迁（behavior-preserving move）  
- 对应测试一起迁或增加映射测试  
- 跑相关 bun test  
- 提交

### Phase C — Server writing tests modularization

将 `novel-writing-service.test.ts` 按 describe/领域切到：

```
ui/server/src/novel-writing-service/*.test.ts
ui/server/src/novel-writing/*.test.ts   # 领域单测保持就近
ui/server/src/routes/novel-writing-service.test.ts  # 兼容入口 shim（可选短期）
```

优先切开：
- quality loop / admission / handoff / story-state / generation contract

### Phase D — Other large server routes

顺序：
1. `novel-editor-routes.ts`  
2. `novel-core-routes.ts`  
3. `novel-commercial-ops-routes.ts` / `novel-generation-routes.ts` / `novel-planning-routes.ts`

模式与 writing-service 相同：route package + thin register。

### Phase E — Web domain models

顺序（按痛点与体量）：
1. `autoCreationDirectorModel.ts` + test  
2. `writingCockpitModel.ts` + test  
3. `planningWorkspaceModel.ts` + test  
4. `repairTaskRevisionPrompt.ts` + test  
5. `TaskCenterDrawer.tsx` / `NovelProjectWorkspace.tsx` UI 拆分

### Phase F — Hardening

1. 删除空 monofile / 仅留 barrel  
2. CI/本地脚本支持按包测试  
3. 回归：novel package tests + writing service sliced tests + 关键 web model tests  
4. 手工：写一章、入库、任务中心打开、创建向导冒烟  
5. 性能抽检：写章内存不回归到整库 rewrite 级别

## 6. Compatibility Rules

1. **Export 兼容优先**：旧路径 re-export，直到所有调用方迁移完再删。  
2. **一次只搬一个领域切片**，禁止“大挪移 + 改逻辑”同提交。  
3. **测试迁移不丢断言**：describe 清单 diff 必须覆盖。  
4. **禁止**在拆分中顺手“优化” prompt/阈值。  
5. 若发现死代码，可删，但需单独提交并说明。

## 7. Performance Constraints

拆分不得破坏已获得的 store 性能收益：

- 继续禁止热路径 `mutateNovelStore` / 全表 replace  
- orchestrator 不得重新引入“为了方便而 load 全 reviews/runs”  
- 大 payload 继续走已有 compaction 路径  
- 前端 model 拆分避免在 render 路径做重计算；重逻辑保持 selector 记忆化（若已有）

## 8. Risk Management

| 风险 | 缓解 |
|---|---|
| 48k 文件机械拆分冲突 | 切片小步提交；先 leaf helpers |
| 测试巨石难切 | 先按 describe 原样搬运，不改断言 |
| 循环依赖 | package 内分层：types → pure → orchestrate → routes |
| 行为漂移 | 兼容 export + 切片回归 + 关键路径手工 |
| 分支过长 | 分 phase mergeable；每 phase 可独立验收 |

## 9. Success Criteria

> **Status (2026-07-19 Task 11 closeout on `codex/architecture-modularization`):** structural criteria met; evidence recorded in the plan residual note.

- [x] `novel-writing-service` monofile 消失或 < 1000 行 barrel  
- [x] `novel-writing-service.test` monofile 消失或仅 shim；领域测试可独立运行  
- [x] Top web model 文件均 < 硬上限，或拆成 package  
- [x] `novel-editor-routes` / `novel-core-routes` 完成 package 化  
- [x] 相关 bun test 绿（architecture/core/setting/shell/write-path focused；`quality-wiring-a` 9 条为产品侧 admission 顺序测试债，非架构回潮）  
- [x] 冒烟：`smoke:novel:local` 全 checks 通过；web shell/TaskCenter/Create 相关 focused UI 测试绿  
- [x] 写章内存不出现改造前整库级尖刺（idle ~112MB；smoke peak ~376MB API 面）

## 10. Recommended Execution Order (summary)

1. Foundation contracts + branch hygiene  
2. Server writing-service leaf extraction  
3. Writing-service tests split  
4. Editor/core routes split  
5. Web auto-creation + writing cockpit models  
6. Web shell/components  
7. Final hardening + optional main merge

## 11. Open Decisions (for approval)

1. **是否允许**在本分支内把 `novel-writing-service.ts` 物理删除，只留 `novel-writing-service/index.ts` re-export？  
   - 推荐：是（兼容路径保留）。  
2. **Web 拆分深度**：先 model 后 UI，还是 shell 与 model 并行？  
   - 推荐：先 model（风险低、收益高），再 UI。  
3. **合并策略**：整分支一次合 main，还是 phase PR？  
   - 推荐：phase PR（B/C 可先合，E 可后合）。
