# 指纹合同管理（生成 / 留档 / 切换 / 评分看板）设计

日期：2026-07-26
状态：待评审

## 背景与目标

指纹合同（`workspace/fingerprint-lib/contracts/`）是写作流水线的统计门槛与提示词指令来源，目前只有一份 `active-contract.json`，重拟合只能靠脚本，无 UI、无历史、无评分反馈。本功能提供：

1. 顶级管理页面（与「模型管理」「厂商中枢」平级）+ 写作工作台内只读「当前合同」卡片与跳转。
2. 页面上生成新合同：默认离线重拟合（只用本地已存样本），联网抓取作为显式选项保留。
3. 每次生成产出一个**合同集**留档，可切换启用；内置合同集为默认且不可删除。
4. 全局切换 + 可「强制锁定单份合同」；题材自动选择**只做数据与接口预留，不接线**（本期零行为变更：流水线继续只用全局合同）。
5. 评分记录：正文**入库时**记一条（每章一条），含总分与 9 项统计指标明细；页面按合同集聚合展示均分与逐指标通过率。

## 已确认的决策

| 决策点 | 结论 |
|---|---|
| 入口 | 顶级页面 `/fingerprint-contracts` + 工作台 ops 工具箱只读卡片 |
| 生成方式 | 可选：`offline_refit`（默认）/ `online_fetch`（显式选择） |
| 评分粒度 | 每章一条 + 9 指标逐项通过率对比 |
| 切换作用域 | 全局切换合同集；支持强制锁定单份；题材自动选仅预留 |
| 评分时机 | 入库时（admission 硬门禁处，此处已在计算全量报告，零额外成本） |

## 硬约束（来自已踩过的坑）

- **生成新合同时，散文字段必须从内置合同继承**：`prompt_directives`(24)/`avoid`(17)/`prefer`(12)/`narrative_hard` 是历史富化内容，仓库中没有代码能重新生成（`buildHumanFingerprintContract` 只产出 7/7/5 条）。生成 = 只重算 `target` 数值 + 更新指令中嵌入数值的行（如「他/姓名起句占比 ≤X」）。此约束必须有回归测试。
- **评分记录必须用新的 `review_type`**：`prose_quality` 的 payload 在持久化时会被 `compactProseQualityPayloadForStorage` 按白名单重写，塞进去会被静默丢弃。
- 评分 payload 必须显式带 `chapter_id` 与 `chapter_no`（reviews 表按 `json_extract(payload, ...)` 推导章归属）。
- `evaluateHumanWebnovelResistance` 返回的 `contract_score` 实际形状与类型声明不符（恒非 null、多 `narrative_hard_pass`/`narrative_hard_hit`、checks 有第 10 项 `zhuque_narrative_hard`），需先补显式 `FingerprintContractScore` 类型。
- 无合同时 `contract_score` 退化为单项形状（total=1，只有 zhuque_narrative_hard），聚合与 UI 必须容忍缺列。

## 数据模型

`workspace/fingerprint-lib/` 下新增（与现有 contracts/ 同级，随现有 root 解析逻辑定位，非 per-activeWorkspace）：

```
contract-sets/
  index.json          # 注册表：[{ id, label, created_at, mode: 'builtin'|'offline_refit'|'online_fetch',
                      #            sample_count, notes, source_set_id? }]
  <set-id>/
    active-contract.json
    by-genre/<slug>.json   # 12 个题材合同（预留，本期流水线不消费）
    meta.json              # 生成参数快照（模式、样本数、耗时、指标口径版本）
contract-selection.json    # { active_set_id: string, locked?: { set_id: string, key: 'active' | slug } }
```

- **内置合同集** `id='builtin'`：虚拟条目，内容直接指向现有 `contracts/` 目录（git 已跟踪），只读、不可删除。`contract-selection.json` 缺失时默认 `{ active_set_id: 'builtin' }`。
- 新生成的合同集目录默认不入 git（用户可自行 `git add`）。
- 删除合同集：`builtin` 拒绝；被 `active_set_id`/`locked` 引用的集也拒绝（先切换再删）。

## 合同解析收口（resolver）

新建 `ui/server/src/novel-writing/fingerprint-contract-resolver.ts`（同步 API，与现有 loader 一致）：

```ts
resolveFingerprintContract(options?: { genre?: string | null }): FingerprintContract | null
resolveFingerprintContractInfo(): { set_id, set_label, contract_name, locked: boolean } | null
```

解析顺序：读 selection → 有 `locked` 则直接加载锁定的那份（绕过题材选择）→ 否则按 `active_set_id` 定位集 → genre 有值且题材文件存在则用之（**本期调用方不传 genre，行为等同全局**）→ 退全局 `active-contract.json` → 集缺失/文件损坏退 `builtin` → 仍失败返回 null（与现状降级一致）。

三个既有入口全部改走 resolver：

1. `prose-fingerprint-lib.loadFingerprintContract` → 内部委托 resolver（保留旧签名做兼容壳），顺带删除硬编码绝对路径 `/Users/ruiyaosong/...`（候选 roots 保留相对推导）。
2. `character-pov.ts:664` 的私有 loader → 改调 resolver。
3. `human-webnovel-resistance.ts:58` 的 `loadActiveFingerprintContract` → 改调 resolver。

`model-family-strategy.ts` 的无参 `buildR76PromptDirectives()` 不改——它经 2/3 已收口。

## 评分记录

**接入点**：入库硬门禁处——`generate-chapter-full-production-store.ts:215` 与 `generate-chapter-draft-mode-store.ts:172` 调用的 `buildResistanceAdmissionHardFailures(finalText)`。将其扩展为返回 `{ hardFailures, report }`（或新增伴生函数），从 `report.contract_score` 取分，**不额外多算一遍**。

**记录通道**：复用 `storeGeneratedReviewRecord` 入队（随章节验收一起原子提交）。

```
review_type: 'fingerprint_contract_score'
status: pass 比例 ≥2/3 → 'passed'，否则 'attention'
summary: '指纹 7/9 · <合同集label> · 第N章'
payload: {
  chapter_id, chapter_no, project_id,
  set_id, set_label, contract_name, locked,
  score, pass, total,
  checks: [{ key, ok, value, target }],       // 9 项 + zhuque_narrative_hard
  narrative_hard_pass, narrative_hard_hit,
  text_chars, created_at
}
```

无合同（resolver 返回 null）时仍记录（退化形状），checks 缺列由聚合端容忍。

## 服务端 API

新文件 `ui/server/src/fingerprint-contract-store.ts`（provider-store 四段式惯例：`get*Path(root)` + read/write + normalize + 默认值兜底；写子目录前自行 `mkdir recursive`——现有 store 均无 mkdir，是已知坑）+ `ui/server/src/routes/fingerprint-contracts.ts`（在 `index.ts` 注册一行）。全部 handler 带 try/catch（`res.status(500).json({ error: String(error?.message || error) })`，bun 下未捕获 rejection 会杀进程）。字面量路由注册在 `/:id` 之前。

```
GET    /api/fingerprint-contracts                 # 列表：注册表 + 每集摘要（ta_max 等关键 target 值）
GET    /api/fingerprint-contracts/active          # 当前生效信息（工作台卡片用）
GET    /api/fingerprint-contracts/samples-status  # 本地样本库状态 { available, count, by_genre }
POST   /api/fingerprint-contracts/generate        # { mode, label?, notes? } → { job_id }
GET    /api/fingerprint-contracts/jobs/:jobId     # 生成任务状态/进度/错误
PUT    /api/fingerprint-contracts/selection       # { active_set_id } 或 { locked: {...} | null }
GET    /api/fingerprint-contracts/scores          # ?set_id= → 聚合 + 明细行
GET    /api/fingerprint-contracts/:id             # 详情（target 全字段、meta）
DELETE /api/fingerprint-contracts/:id             # builtin/被引用 → 400
```

**生成 job**：进程内 job 表（Map + 状态 queued/running/completed/failed，参照知识投喂 job 范式）。
- `offline_refit`：读 `human/` 样本 → `createFingerprintSample` 逐条测量 → `buildHumanFingerprintContract` 拟合 `target` → 散文字段从 builtin 继承 + 更新嵌数值指令行 → 写入新集目录。样本目录缺失/为空 → job 直接 failed，错误信息含样本路径说明。页面在生成区显示 samples-status，样本不可用时禁用离线按钮。
- `online_fetch`：子进程跑现有 `build-qidian-fingerprint-lib.ts`（其自身更新样本与旧位置合同），成功后把 `contracts/` 快照进新集目录。UI 上标注风险提示（耗时长、依赖站点可用性）。脚本失败 → 不创建集。
- 同一时间只允许一个生成 job（重复触发 409）。

**评分聚合**：reviews 表按 `review_type='fingerprint_contract_score'` 跨项目查询（限当前激活工作区的 novel 库；repo 层加一个按 review_type 的查询），按 `payload.set_id` 分组：章节数、均分、9+1 项各自通过率、最近 N 条明细（项目/章号/分数/未达标项）。

## 前端

**顶级页面** `ui/web/src/pages/FingerprintContracts/index.tsx`（目录式，同目录放纯逻辑 model + 测试）：

- 路由：`router.tsx` lazy 声明 + `path: 'fingerprint-contracts'`（Layout children 内，不进 `/novel` 分支）。
- 导航：`Layout.tsx` 菜单 items 管理区加条目 + `getSelectedKey()` 补 `startsWith('/fingerprint-contracts')`（两处必须同步，漏改高亮会回落）。
- 区块一 · 合同集列表：Table（rowKey=id），列：标签/模式/生成时间/样本数/关键 target 摘要/评分摘要（均分·章数）/操作（启用｜锁定此份｜详情｜删除）。当前启用行高亮 Tag；builtin 行禁删。
- 区块二 · 生成：samples-status 展示（可用样本数、按题材分布）；模式选择（默认离线）；label/notes 输入；触发后 2s 轮询 job（照知识投喂范式，job id 存 localStorage 续接）。
- 区块三 · 评分看板：选合同集 → 汇总 Tag 行（均分/章数/通过率）+ 9+1 指标逐项 Tag（通过率 %，Tooltip 放 target 与均值）+ 最近章节明细表。展示范式照搬「样章效果回收」区块（汇总 Tag + 指标 Tag + Tooltip 详情）。
- API 封装 `ui/web/src/api/fingerprintContracts.ts`（照 providers.ts 薄包装）。
- antd v5 合规（页面加入 `antdV5Compatibility.test.ts` 的 migratedPages）：`Card variant="borderless"`、`Drawer destroyOnHidden`、`styles={{ body }}`。

**工作台卡片**：只改 `workspace-deferred-surfaces-ops-toolbox.tsx` 一个文件——Alert 之后插入 `<Card size="small" title="当前指纹合同">`，组件内自取数（该文件已 import 而未使用的 `apiClient`），显示 集label/合同名/是否锁定，`Link` 跳转管理页。不动 props 三件套。该文件已登记在 `workspaceUiShellSource` 拼接列表中，源码级契约测试可直接断言新卡片。

## 错误处理与边界

- selection 指向不存在的集 → resolver 退 builtin，页面显示修复提示。
- 合同 JSON 损坏 → resolver 按现状降级（null），评分记录退化形状。
- `express.json` limit 5mb：合同 JSON ~50KB，无风险；生成结果不经请求体传输（服务端落盘）。
- 工作区切换（`/api/workspace/switch`）不影响合同（合同为仓库级共享，与现状一致，文档注明）。

## 测试策略（全程 TDD）

- store：mkdtemp 临时目录，注册表读写/normalize 兜底/builtin 虚拟条目/删除保护。
- resolver：selection 缺失→builtin；锁定绕过题材；集损坏降级链；与旧 `loadFingerprintContract` 兼容壳等价性。
- 生成（离线）：**散文字段继承回归测试**（新集 directives/avoid/prefer 与 builtin 逐条一致、仅嵌数值行更新）；target 用固定小样本目录拟合可复现；样本缺失 → failed job。
- 评分：admission 处只算一遍报告的断言（mock evaluate 计数）；payload 含 chapter_id/chapter_no；无合同退化形状；聚合通过率计算（纯函数单测）。
- 路由：`createRouteHarness` 假 app 范式；字面量路由先于 `/:id` 的顺序断言。
- 前端：纯逻辑 model 单测（聚合行构造、job 轮询状态机）；antdV5 合规列表；toolbox 卡片进 workspaceUiShell 源码断言。

## 明确不做（YAGNI）

- 题材自动选接线（预留数据与 genre 参数，不改流水线调用方）。
- 历史章节评分回溯（无持久化数据可回溯）。
- 合同字段的在线编辑器（只看不改；改合同 = 生成新集）。
- 每轮质检的中间评分记录（只记入库版）。
- per-project 合同绑定。
