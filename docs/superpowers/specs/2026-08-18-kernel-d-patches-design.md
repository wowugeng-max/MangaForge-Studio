# 内核 D 后置补丁（短 spec）

日期：2026-08-18  
状态：已落地  
对照：`2026-08-15-codex-kernel-vault-design.md` v1.2「尚未落地 D」  
实现计划：`docs/superpowers/plans/2026-08-18-kernel-d-patches.md`

三项彼此独立，可按计划任务顺序合入。不做动词 4+、不改开书向导、不改 Codex 源码。

## 1. `$HOME` 硬隔离

- 每个候选的 Codex 子进程 `HOME` 必须指向该候选 **job 目录**（`jobs/{job_id}/candidates/{candidate_id}/`），不是用户真实 `$HOME`。
- `CODEX_HOME` 仍是 `{jobDir}/codex-home`。禁止靠 `--ignore-user-config`（0.147 `app-server` 拒绝该旗标）。
- 目的：切断 `$HOME/.agents/skills` 个人技能发现，以及 `$HOME/.codex` 用户配置泄漏。
- `mergeCodexRpcEnv`：`{ PATH, HOME: process.env.HOME, ...input.env }`，后写覆盖。会话层必须把 `HOME: jobDir` 放进 `input.env`。
- 探针会话一律同样隔离：`probe.ts` 两处 `startCodexSession`（握手/技能探针与 spawn 探针）与生产同环境。会话层默认 `HOME = isolatedHome || join(codexHome, '..')` 已覆盖探针（其 `codexHome` 本就在探针临时目录里）；显式传 `isolatedHome` 仅为可读与测试锁定。否则 `$HOME/.agents/skills` 仍会漏进探针的 skills/list。

## 2. full 审稿 spawn 结构门

- 新门 id：`require_spawn_evidence`。失败码：`NO_SPAWN`。候选状态：`gated`（与 `SOLO_FALLBACK` 同类，不是 `failed`）。
- 只挂在 `oh-story-core.story-review.full`（及其拷贝了该 `gates` 数组的实例）。其它动词/合同不跑此门。
- 判定：`extractSpawnEvidence` 的 `subagent_threads.length >= 1`。证据面仍是 `thread/started` 的 `parentThreadId` **或** `item.type=collabAgentToolCall` 且 `item.tool=spawnAgent`。
- 收存后跑；`commit` 重跑时从候选 `metadata.spawn_evidence` 读入，不得因 commit 漏传证据而误 gated。
- `reject_solo_fallback` 仍保留。零 spawn 即使报告写 `Fallback: none` 也 gated。
- `review_chapter` 模板 `allowed_gates` 加入 `require_spawn_evidence`；`template_gates` 不加（非 oh-story full 的审稿包不必 spawn）。
- 事件形状敏感（0.147 已修过一次 spawn 证据匹配）。启用前提：探针 ④ 在锁定版本上为绿（与本门共用 `extractSpawnEvidence`）。回滚路径：批量误 `NO_SPAWN`（如 Codex 升级又改事件形状）时，从 full 实例 `gates` 摘掉 `require_spawn_evidence` 即可恢复，零代码。
- 验收含一次真机 full 审稿：四 reviewer 正常 spawn 不得误 gated。

## 3. 旧阻塞桥接下线

- `POST /api/novel/oh-story/core/{review,deslop,apply}` 不再 `createAndRunKernelJob` 并阻塞至终态。
- 三条路由仍注册，立即 **410** `{ ok: false, code: 'ROUTE_REMOVED', error: '请改用 POST /api/kernel/jobs' }`。
- 保留 `GET /api/novel/oh-story/core` 与 `POST /api/novel/oh-story/core/install`。
- 不删 `runOhStoryCoreAction` 单测文件（旧 runner 仍可作单元夹具）；产品 HTTP 不得再走它。
- 新 UI 已打 `/kernel/jobs`。本项只拆服务端阻塞桥。
- 同步修订动词 spec（`2026-08-16-novel-workbench-verb-contracts-design.md`）三处失真表述：「与现网合同」的「旧路由继续转调、行为不变」、「Job API 与数据流」的「第一期仍可阻塞至终态」、分期表「3 收编现网」验收「现网三按钮行为不变」。

## 非目标

- 不把 spawn 门升到开书 / 去AI / 改稿 / 扩纲。
- 不删除 GET/install。
- 不实现 `$HOME` 之外的容器级隔离。
- 不为 C 动词写代码。
