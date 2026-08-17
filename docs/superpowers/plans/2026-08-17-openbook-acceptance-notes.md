# 开书产品真机验收笔记（分期 2 / Task 12）

- Date: 2026-08-17
- Branch: `fix/openbook-closeout`（收口；原实现已进 `main` `916451be`）
- HEAD (before this notes commit): `6f5d9b16`
- Workspace: `/Users/ruiyaosong/MangaForge-Studio/workspace`
- Overall: **①–④ PASS**（第三次真机 `open_book` + 人工 commit）；⑤ 静态 PASS / 浏览器 Network **BLOCKED**；⑥ 取消路径此前 PASS

本笔记只记录实际跑到的证据。未发明 job id / vault 文件。未点工作台浏览器提交深度孵化；开书通过本 worktree 最小 HTTP 真跑 Codex（model **304**，未用 302）。

## 环境与限制

- 本机已有 UI server：`bun` PID 监听 `[::1]:8787`，cwd 是 **主仓** `/Users/ruiyaosong/MangaForge-Studio/ui/server`，**不是**本 worktree。验收未打 8787。
- 本 worktree 全量 `bun src/index.ts` 启动失败：
  - 先缺 `jszip`（`restored-src` 从 worktree 根解析）
  - 补 symlink 后变成 `Cannot find module './json-schema.js' from restored-src/node_modules/zod/v4/core/index.js`
- 因此用本 worktree `ui/server` 起了最小 HTTP（只挂 novel-core + kernel contracts/jobs），`127.0.0.1:18787`，`loadActiveWorkspace()` → 上述 workspace。
- Vite `:5173` 已在跑，未当作本分支 UI 点击验收。

## Probe ①–④（live，本 worktree `runKernelProbe`，model_id 304）

命令：`ui/server` 内 `bun -e` 调用 `runKernelProbe(workspace, { modelId: 304 })`。

| 阶段 | 结果 | 证据 |
| --- | --- | --- |
| ① binary | **PASS** | `ok: true`, version `0.147.0`。`which codex` → `/Users/ruiyaosong/.bun/bin/codex`；`codex --version` → `codex-cli 0.147.0`。runtime.json binary：`.../codex-darwin-x64/vendor/x86_64-apple-darwin/bin/codex` |
| ② handshake | **PASS** | `handshake.ok: true` |
| ③ skills | **PASS** | `skills.ok: true` |
| ④ agents_spawn | **PASS**（开书非必须，已记录） | `agents_spawn.ok: true` |

- 探针耗时：`elapsed_ms: 30774`（`2026-08-17T05:41:40Z` → `05:42:11Z`）
- 写入：`workspace/.mangaforge/kernel/probe.json` `checked_at: 2026-08-17T05:41:41.065Z`
- `cliproxyapi_codex` / `tokenrhythm_codex` translate **ok**；普通 `cliproxyapi` 等仍 `PROVIDER_TRANSLATE_FAILED`（与旧探针一致，开书走 Codex 供应商）

## 模型 304 / 禁 302

- `workspace/models.json`：**304 存在**，`display_name: kernel-codex-gpt-5.6-luna`，`model_name: gpt-5.6-luna`，`provider: cliproxyapi_codex`，`reasoning_effort: xhigh`。
- **302 也存在**，但是 `display_name: gpt-5.6-luna` / `provider: cliproxyapi`（非 kernel-codex）。本次 API 调用全部 `model_id: 304`，**未使用 302**。
- 向导源码：`PREFERRED_KERNEL_MODEL = 'kernel-codex-gpt-5.6-luna'`；跳过规则是名字里的 `302.ai`，不是数字 id 302（`deep-draft-wizard-source.test.ts` 已锁）。

## Contract `.open` implemented?

- 本 worktree `loadKernelContracts`：`oh-story-core.story-long-write.open` `verb: open_book`，`implemented: true`，`builtin: true`。
- `GET http://127.0.0.1:18787/api/kernel/contracts`：同上，`implemented: true`，无 `implemented_reason`。runtime `available: true`, version `0.147.0`。
- `oh-story-core.story-long-write.outline` 仍 `implemented: false`（预期）。

## 向导两项（静态，非真机点击）

- `CreateModeSection` `MODE_ORDER = ['manual', 'deep_draft']`（仅两项）。
- Copy：`手动开书` / `深度孵化`。
- `CreateMode = 'manual' | 'deep_draft'`；源码与 `deep-draft-wizard-source.test.ts` 断言无 `quick_ai`。
- **未**在浏览器里点创建向导。此项只作静态证据。

## Step 2 深度孵化 HTTP 流（真跑）

最小 server 上模拟向导：`POST /api/novel/projects` → `POST /api/kernel/jobs`（`verb: open_book`, `model_id: 304`）→ 轮询 `GET /api/kernel/jobs/:id`。

### 取消路径项目（断言 ⑥）

- Project **id=7** `开书验收-可删-取消`，`2026-08-17T05:47:25.233Z`
- `POST /api/kernel/jobs` → **HTTP 202 Accepted**，body `{ ok: true, job: { id: "job-17c13a53-c47f-4080-b944-dac00eaefdd3", status: "queued" } }`
- ~1s 后 `POST .../cancel` → 200 `{ ok: true }`
- 终态：job `status: cancelled`，`error_code: ""`；candidate `status: failed`，`error_code: CANCELLED`
- `elapsed_ms: 1542`；provider `cliproxyapi_codex`；verb `open_book`
- 项目仍在：`id=7 title=开书验收-可删-取消 status=draft`
- 领域表：worldbuilding/characters/outlines/chapters **全 0**（创建后、取消后均 0）

### 全流程项目（断言 ①–④）

- Project **id=8** `开书验收-可删`，`2026-08-17T05:47:54.666Z`
- `POST /api/kernel/jobs` → **HTTP 202 Accepted**，`job-c7bd646e-e8fa-42ad-84f6-3b5d067bbc4d` `status: queued`
- 轮询：`13:48:11` 已 `running` / candidate `cand-c0cff277-0c0e-4ae2-aec9-bd262f005b3e` running，artifacts 0
- **~8 分钟窗口到期仍未 `awaiting_selection`**。`13:56:15 TIMEOUT` 快照：
  - job `status: running`，`error_code: ""`，`error_message: ""`
  - `progress.elapsed_ms: 500524`（约 8.3 min）
  - `artifacts: []`，`commits: []`
- 窗口结束后为停 xhigh Codex，于 `2026-08-17T05:57:19.261Z` **取消**该任务（非产品失败码）：最终 `cancelled` / candidate `CANCELLED`，`elapsed_ms: 566485`。项目 8 仍为 draft。

超时瞬间 **未收获 vault**，但 candidate 工作副本已开始写设定（**不是** harvest 后的 kernel_artifacts）：

```
设定/题材定位.md
设定/题材正文提示卡.md
设定/世界观/力量体系.md
设定/世界观/背景设定.md
设定/世界观/命契与社会结构.md
设定/关系.md
设定/角色/          （空目录，无 md）
大纲/               （目录存在，无文件）
正文/               不存在
```

Codex events（超时前）：大量 `item/agentMessage/delta`、`commandExecution`（读 skill / `brief.md`），工作副本无角色档、无大纲文件。

## 六条断言

### ① vault ≥1 世界观、≥1 角色、≥2 大纲（细纲+总纲/卷纲）

**BLOCKED / TIMEOUT**

- job `job-c7bd646e-e8fa-42ad-84f6-3b5d067bbc4d` 在 8 min 内未进入 `awaiting_selection`，`kernel_artifacts` **空**。
- 工作副本有多份 `设定/世界观/*.md`，但 `设定/角色/` 与 `大纲/` 在超时点仍空。不能记 PASS。
- error_code：窗口内空；窗口后取消为 candidate `CANCELLED`。

### ② 无 `正文/`、无 `chapter_text` kind

**BLOCKED**（收获未发生；工作副本旁证）

- 超时点工作副本 **无** `正文/` 目录。
- 该 job 的 `kernel_artifacts` 为空，故无 `chapter_text` 行。
- 未跑到 harvest/gates，不能证明停书门在收割时仍成立。

### ③ 采纳前领域表为 0

**BLOCKED**（未到 `awaiting_selection`；旁证 PASS）

- Project 8 在 running 超时点与取消后：`worldbuilding=0 characters=0 outlines=0 chapters=0`。
- 无 commits。这符合「未采纳不写表」，但断言原文要求的时刻是 awaiting_selection。

### ④ 采纳后工作台可见设定 + 空章 `has_prose=false`

**BLOCKED**

- 未 `awaiting_selection`，未 `POST /commit`，未打开工作台。无采纳后 UI/API 证据。

### ⑤ 网络面板无 `/novel/project-seed/derive-stream`

**PASS（静态） / BLOCKED（真机网络面板）**

- `useCreateWizardController.ts` **不含** `derive-stream`；深孵路径 `POST /api/kernel/jobs` + `verb: 'open_book'`。`deep-draft-wizard-source.test.ts` 覆盖此点。
- `useProjectSeedStream.ts` 仍保留 derive-stream fetch，但向导 controller 不再走 seed pipeline。
- 无浏览器 Network 面板。本次 HTTP 验收只打了 `/api/novel/projects` 与 `/api/kernel/jobs*`，未打 derive-stream。

### ⑥ 取消/丢弃：空项目保留、领域表不写

**PASS**

- job `job-17c13a53-c47f-4080-b944-dac00eaefdd3`，project 7，HTTP 202 后取消。
- 耗时 `elapsed_ms: 1542`；candidate `error_code: CANCELLED`。
- 项目 7 仍在；worldbuilding/characters/outlines/chapters = 0。

## Overall（当日下午第一次真机）

**当时 BLOCKED。** 前置探针 ①–④ 绿、合同 `.open` implemented、202 轮询链路通、取消路径通。产品收口所需的 **awaiting_selection 收获 + 采纳** 在约 8 分钟窗口内没有完成（model 304 / xhigh 仍停在读 skill 与写世界观）。

---

## Closeout 2026-08-17 晚（`fix/openbook-closeout`）

审查小缺口代码已落在本分支（角色 `kernel_rel_path`、空 `世界观.md` 占位、内置 review/deslop/apply 声明 `verb`、开书 commit 单笔事务）。spec/plan 已入库。真机又跑了三轮，全部 `model_id: 304`。

最小 HTTP 仍是 `127.0.0.1:18787`（novel-core + kernel contracts/jobs）。全量 `ui/server` `bun src/index.ts` 仍因 `restored-src`/zod 起不来。未点 Vite 向导提交（避免再开一趟 xhigh）。

当日下午笔记里的 `开书验收-可删` (id=8) / `开书验收-可删-取消` (id=7) 在收口开始时已不在库中。本轮复用新建项目 **id=7** `开书验收-可删-收口`。未动用户小说 id 2–6。

### 收口 run A — `job-7211351a-d791-4afd-af94-925614904638`

- HTTP 202，candidate `cand-84938d9b-2713-4b89-ac51-018bd361f5b6` running。
- ~12 min 后 **failed / `ENGINE_FAILED`**。events：`2026-08-17T14:45:01.908Z` 内核发出 `turn/interrupt`；`turn/completed` status `interrupted`。此前 `14:39:52` 有 `Reconnecting... 1/5`（stream disconnected），之后仍有 reasoning，最后一次 item 完成 `14:43:01`，距 interrupt 正好约 **120s**。
- 原因：`session.runTurn` 默认 idle **2 分钟**，xhigh 静默推理会被掐。
- 修复：`turnTimeoutsForContract` — `open_book` idle 15 min / hard 60 min。提交 `f24de640`。
- 领域表仍为 0。工作副本随后被终态 cleanup 删掉。

### 收口 run B — `job-336cc5d0-ec15-4a48-a367-44a9883ee626`

- 复用 project 7。candidate `cand-3bbe67cf-f671-4747-93ae-2534af91d073`。
- ~14 min 进入 harvest 后 **failed / `OUTPUT_MISSING`**。
- 超时修复生效（跑过 12 min 仍在写文件）。工作副本把产物写在 **`借命城账/设定/`、`借命城账/大纲/`**，根上的 glob `设定/角色/*.md` 与 write_scope `设定/` 全部未命中。
- 当时已有：世界观/势力/角色档、卷纲+大纲+三章细纲；无 `正文/`。
- 修复：harvest 若根上没有 write_scope 命中、且唯一一层书名目录里有 `设定/`/`大纲/`，则剥掉该前缀再匹配；builtin prompt 增加「不要再建书名目录」。提交 `6f5d9b16`。
- 领域表仍为 0。工作副本 cleanup 删除。

### 收口 run C — `job-f9b9d846-7a9f-416c-a6ec-d1e6ffbe604c`（产品收口）

- 复用 project 7，HTTP 202 queued → running → **`awaiting_selection`**（candidate `cand-bbe5a46d-b39b-470e-b835-2825d0acef16` **succeeded**）。
- `elapsed_ms` 在 awaiting 快照为 **1341181**（约 22.4 min）。`model_id: 304`，`verb: open_book`。
- 产物写在工作区根 `设定/`、`大纲/`（无书名前缀）。manual：awaiting 时领域表仍为 0。

#### ① vault ≥1 世界观、≥1 角色、≥2 大纲（细纲+总纲/卷纲）

**PASS**

- `kernel_artifacts` **20** 份，kinds 仅 `world_doc` / `character_sheet` / `outline_doc`。
- 世界观类（`world_doc`）含 `设定/世界观/力量体系.md`、`设定/世界观/背景设定.md`、`设定/世界观/命契法则.md` 等。
- 角色 6：`崔墨` `沈照` `祁临川` `陆峤` `陆砚` `陆禾`。
- 大纲 5：`大纲/大纲.md`、`大纲/卷纲_第一卷.md`、`大纲/细纲_第001章.md`、`大纲/细纲_第002章.md`、`大纲/细纲_第003章.md`。
- vault 例：`workspace/.mangaforge/kernel/vault/art-d04099a9-.../细纲_第001章.md`。

#### ② 无 `正文/`、无 `chapter_text` kind

**PASS**

- artifacts 无 `chapter_text`。
- awaiting 时工作副本无 `正文/` 目录。

#### ③ 采纳前领域表为 0

**PASS**

- awaiting_selection 当时：`worldbuilding=0 characters=0 outlines=0 chapters=0`。
- `commits: []`，job 未 auto-commit（`commit.mode=manual`）。

#### ④ 采纳后设定可见 + 空章 `has_prose=false`

**PASS**（API / sqlite；未打开工作台 UI）

- `POST /api/kernel/jobs/job-f9b9d846-.../commit` `{candidate_id: cand-bbe5a46d-...}` → HTTP 200，`commits` 23 条（6 characters + 5 outlines + 9 worldbuilding + 3 empty chapters）。
- job / candidate → `committed`。
- 领域表：`worldbuilding=9 characters=6 outlines=5 chapters=3`。
- sqlite：三章 `chapter_text` 长度 0。列表 API `chapter_text: ""`（list 未带 `has_prose` 字段；空正文即 `has_prose=false`）。
- 章：1 `死账上的活人`；2 `一笔账要两个人作证`；3 `缺一栏的受益人`。

#### ⑤ 网络面板无 `/novel/project-seed/derive-stream`

**PASS（静态） / BLOCKED（真机 Network）**

- 本会话 `bun test src/routes/deep-draft-wizard-source.test.ts`：**10 pass**。controller 无 `derive-stream`，深孵 `POST /api/kernel/jobs` + `verb: 'open_book'`。
- 未在浏览器点「开始深度孵化」，无 Network 面板 HAR。

#### ⑥ 取消/丢弃

**PASS**（沿用当日下午 `job-17c13a53-...` 证据，本晚未重跑取消以免再烧 xhigh）

### 代码收口（非真机，单测）

`cd ui/server && bun test src/kernel/ src/routes/kernel-job-routes.test.ts src/routes/kernel-routes.test.ts src/routes/novel-oh-story-core-routes.bridge.test.ts src/routes/deep-draft-wizard-source.test.ts` → **190 pass / 0 fail**（收口事务落地时）。之后超时与 harvest 前缀另有针对性测试通过。

### Follow-ups（仍开放）

1. 工作台浏览器点「深度孵化」+ Network 面板：需先修好 worktree 全量 server 的 `restored-src`/zod，或把 Vite 指到本最小 API（还缺 models 路由）。
2. 可删验收项目：**id=7 `开书验收-可删-收口`**（现已有设定/大纲/空章）。失败 job `job-7211351a-...`、`job-336cc5d0-...` 可留作账本痕迹。
3. 全量 `ui/server` 启动仍被 `restored-src` 拖死；开书验收不依赖它。

