# 指纹合同管理 · 终审遗留项补齐 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 补齐 2026-07-26 规格里已设计、但在首轮实现中被终审裁定"可留后续"的项，主要是合同集详情入口与评分看板的若干显示缺陷。

**Architecture:** 服务端只做两处小扩展（job 完成时回填 `set_id`、聚合结果带上 target 与均值），其余全部是管理页的补齐。不改动写作链路，不改动合同解析优先级。

**Tech Stack:** TypeScript、bun、Express 4、React 18 + antd v5。

## Global Constraints

- 工作目录是 worktree `/Users/ruiyaosong/MangaForge-Studio/.worktrees/fingerprint-task6`（分支 `feature/fingerprint-contract-manager`）。**绝不可操作主仓库 `/Users/ruiyaosong/MangaForge-Studio`**（另一个并发会话在别的分支上工作）。
- 禁止 git 写操作 `stash`/`checkout`/`reset`/`merge`/`rebase`/`worktree`；只做 改文件 → 跑测试 → `git add` → `git commit`。不得改写 `ui/server/.workspace-config.json`。
- **不要跑 `bun run build:server`**（worktree 根目录缺 node_modules）。`bun run build:web` 可用。
- 服务端测试：`cd <worktree>/ui/server && bun test <相对路径>`；前端测试：`cd <worktree>/ui/web && bun test <相对路径>`。
- **写作行为必须零变更**：本批次不得触碰 `human-webnovel-resistance.ts`、`character-pov.ts`、两个入库点、`fingerprint-contract-resolver.ts`、`fingerprint-contract-refit.ts`。
- antd v5：`<Card variant="borderless">`、`Drawer destroyOnHidden`、`styles={{ body }}`；禁止 `bodyStyle=`、`<Card bordered={false}>`、`destroyOnClose`。页面已在 `ui/web/src/pages/antdV5Compatibility.test.ts` 的 migratedPages 中，该测试必须持续通过。
- 所有 Express handler 必须包 try/catch（bun 下未捕获 rejection 会杀进程）。
- 测试不得触网；用 `os.tmpdir()` 临时目录。
- 提交信息末尾加 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`。

## 回归基线（每个任务结束都要跑）

- 服务端指纹套件：`bun test src/fingerprint-contract-store.test.ts src/fingerprint-contract-scores.test.ts src/fingerprint-contract-jobs.test.ts src/workspace.test.ts src/routes/fingerprint-contracts.test.ts src/novel-writing/fingerprint-contract-resolver.test.ts src/novel-writing/fingerprint-contract-refit.test.ts src/novel-writing/resistance-admission-report.test.ts` → 基线 **80 pass**
- 写作链路（零变更验证）：`bun test src/novel-writing/human-webnovel-resistance.test.ts src/novel-writing/character-pov.test.ts src/novel-writing-service/` → 基线 **163 pass**
- 前端：`bun test src/pages/FingerprintContracts/ src/pages/antdV5Compatibility.test.ts src/pages/novel-workspace/workspaceUiShell.a-a.test.ts src/pages/novel-workspace/workspaceUiShell.b-a.test.ts src/pages/novel-workspace/workspaceUiShell.b-b.test.ts` → 基线 **97 pass**
- `bun run build:web` 必须成功

---

### Task 1: 服务端两处扩展（job 回填 set_id、聚合带 target 与均值）

**Files:**
- Modify: `ui/server/src/fingerprint-contract-scores.ts`（`aggregateFingerprintScores`）
- Modify: `ui/server/src/fingerprint-contract-scores.test.ts`
- Modify: `ui/server/src/routes/fingerprint-contracts.ts`（job 完成回调；reviews 按 review_type 取数）
- Modify: `ui/server/src/routes/fingerprint-contracts.test.ts`
- Modify: `ui/server/src/novel/repos/reviews.ts`（新增按 review_type 的查询）

**Interfaces:**
- Produces:
  - `listNovelReviewsByType(activeWorkspace: string, projectId: number, reviewType: string): Promise<NovelReviewRecord[]>` — 与既有 `listNovelReviews` 同形状，SQL 层加 `AND review_type = ?`
  - `aggregateFingerprintScores` 的 `check_pass_rates` 每项新增两个字段：`mean_value: number`（该指标 value 的均值，保留 3 位）、`target: number | [number, number] | null`（取该组最后一条记录里该 check 的 target；组内为空则 null）
  - job 完成时 `set_id` 被回填

- [ ] **Step 1: 写失败测试**

在 `ui/server/src/fingerprint-contract-scores.test.ts` 的 `aggregateFingerprintScores` describe 内追加：

```ts
  test('reports each check mean value and target alongside the pass rate', () => {
    const rows = [
      record({ contractScore: contractScore(9) }),
      record({ contractScore: contractScore(9, { dialogue_para_ratio: false }) }),
    ]
    const builtin = aggregateFingerprintScores(rows).find((r) => r.set_id === 'builtin')!
    const dialogue = builtin.check_pass_rates.find((c) => c.key === 'dialogue_para_ratio')!
    expect(dialogue.mean_value).toBeCloseTo(0.2, 5)
    expect(dialogue.target).toBe(0.35)
  })

  test('leaves target null when no row carried one', () => {
    const built = buildFingerprintScoreReviewRecord({
      projectId: 1,
      chapterId: 1,
      chapterNo: 1,
      setId: 'set-x',
      setLabel: 'X',
      contractName: null,
      locked: false,
      contractScore: { score: 0, pass: 0, total: 1, narrative_hard_pass: false, narrative_hard_hit: 1, checks: [] },
      textChars: 100,
      createdAt: '2026-07-27T00:00:00.000Z',
    })
    const out = aggregateFingerprintScores([built]).find((r) => r.set_id === 'set-x')!
    expect(out.check_pass_rates).toEqual([])
  })
```

在 `ui/server/src/routes/fingerprint-contracts.test.ts` 追加（沿用该文件既有的 `createRouteHarness` / `call` / `tempWorkspace` 手法）：

```ts
  test('generate job records the produced set id when it completes', async () => {
    const ws = await tempWorkspace()
    await writeSamples(join(ws, 'workspace', 'fingerprint-lib'), 4)
    const { app, handlers } = createRouteHarness()
    registerFingerprintContractRoutes(app, () => join(ws, 'workspace'))
    const started = await call(handlers.get('POST /api/fingerprint-contracts/generate'), {
      body: { mode: 'offline_refit', label: '回填测试' },
    })
    expect(started.statusCode).toBe(200)
    const jobId = started.body.job.id
    let job = started.body.job
    for (let i = 0; i < 60 && job.status !== 'completed' && job.status !== 'failed'; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50))
      job = (await call(handlers.get('GET /api/fingerprint-contracts/jobs/:jobId'), { params: { jobId } })).body.job
    }
    expect(job.status).toBe('completed')
    expect(job.set_id).toBe(jobId)
  })
```

其中 `writeSamples(libRoot, n)` 是你要在该测试文件里新增的小工具：在 `<libRoot>/human/urban/` 下写 n 个 `.txt` 样本（每个 30 段左右、含少量 `“…”` 对白行），内容随 index 变化即可。若该文件已有等价工具就复用。

- [ ] **Step 2: 运行测试确认失败**

Run: `cd <worktree>/ui/server && bun test src/fingerprint-contract-scores.test.ts src/routes/fingerprint-contracts.test.ts`
Expected: 3 条新测试失败 —— `mean_value`/`target` 为 undefined；job 的 `set_id` 为 undefined

- [ ] **Step 3: 实现**

`ui/server/src/fingerprint-contract-scores.ts` 的 `aggregateFingerprintScores`：把每个 check 的累积结构从 `{ pass, total }` 扩成 `{ pass, total, valueSum, target }`（`target` 每次覆盖为最新一条的 target），输出时补 `mean_value: stat.total ? Number((stat.valueSum / stat.total).toFixed(3)) : 0` 与 `target: stat.target ?? null`。

`ui/server/src/novel/repos/reviews.ts`：新增导出

```ts
export async function listNovelReviewsByType(activeWorkspace: string, projectId: number, reviewType: string) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    return (db.query(`
      SELECT
        id,
        project_id,
        CASE WHEN json_valid(payload) THEN CAST(json_extract(payload, '$.chapter_id') AS INTEGER) END AS chapter_id,
        CASE WHEN json_valid(payload) THEN CAST(json_extract(payload, '$.chapter_no') AS INTEGER) END AS chapter_no,
        review_type,
        status,
        summary,
        issues,
        payload,
        created_at
      FROM reviews
      WHERE project_id = ? AND review_type = ?
    `).all(projectId, reviewType) as any[]).map(reviewFromRow)
  } finally {
    db.close()
  }
}
```

若该 repo 文件有统一的 re-export 出口（先 grep `listNovelReviews` 看它从哪里被 import），把新函数一并导出，使 `routes/fingerprint-contracts.ts` 能按现有风格 import。

`ui/server/src/routes/fingerprint-contracts.ts`：
1. `GET /scores` 的取数改用 `listNovelReviewsByType(activeWorkspace, project.id, FINGERPRINT_SCORE_REVIEW_TYPE)`，删掉 JS 层的 `review_type` 过滤（**保留单项目 try/catch continue 的既有行为**）。
2. job 完成回调改为回填 set_id：`.then((result) => updateFingerprintContractJob(job.id, { status: 'completed', progress: '完成', set_id: result?.set_id }))`。

- [ ] **Step 4: 运行测试确认通过**

Run: `cd <worktree>/ui/server && bun test src/fingerprint-contract-scores.test.ts src/routes/fingerprint-contracts.test.ts`
Expected: 全绿

跑两组回归（服务端指纹套件 ≥80 pass、写作链路 163 pass / 0 fail）。

- [ ] **Step 5: 提交**

```bash
git add ui/server/src/fingerprint-contract-scores.ts ui/server/src/fingerprint-contract-scores.test.ts ui/server/src/routes/fingerprint-contracts.ts ui/server/src/routes/fingerprint-contracts.test.ts ui/server/src/novel/repos/reviews.ts
git commit -m "feat(fingerprint): report check target/mean, backfill job set id, query reviews by type

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: 合同集详情 Drawer

**Files:**
- Modify: `ui/web/src/pages/FingerprintContracts/index.tsx`
- Modify: `ui/web/src/pages/FingerprintContracts/fingerprintContractsModel.ts`
- Modify: `ui/web/src/pages/FingerprintContracts/fingerprintContractsModel.test.ts`

**Interfaces:**
- Consumes: `fingerprintContractApi.detail(id)` → `{ record, contract, meta }`（`contract` 含完整 `target`；builtin 的 `meta` 为 null）
- Produces:
  - `buildContractDetailRows(detail: any): Array<{ label: string; value: string }>` — 把 `contract.target` 的 9 个字段与 `meta` 的生成参数拍平成「标签 / 值」行，供 Drawer 里的描述列表渲染；区间字段渲染成 `0.483–0.699`，缺失值渲染成 `—`

- [ ] **Step 1: 写失败测试**

在 `fingerprintContractsModel.test.ts` 追加：

```ts
import { buildContractDetailRows } from './fingerprintContractsModel'

describe('buildContractDetailRows', () => {
  const detail = {
    record: { id: 'set-a', label: '离线 A', mode: 'offline_refit', sample_count: 810, created_at: '2026-07-27T00:00:00.000Z' },
    contract: {
      name: 'qidian_free_rank_human',
      built_from: ['a', 'b'],
      target: {
        cv_para: [0.483, 0.699],
        single_sentence_para_ratio: [0.792, 0.977],
        two_sentence_para_ratio: [0.021, 0.168],
        dialogue_para_ratio: [0.099, 0.328],
        max_mid_streak_max: 6,
        template_contrast_per_1k_max: 1,
        stock_adverb_per_1k_max: 1.5,
        clinical_hit_per_1k_max: 0.5,
        subject_ta_opener_ratio_max: 0.35,
      },
    },
    meta: { mode: 'offline_refit', sample_count: 810, genre_count: 12, inherited_prose_from: 'builtin' },
  }

  test('renders range targets as a dash-joined span and scalar targets as-is', () => {
    const rows = buildContractDetailRows(detail)
    const byLabel = Object.fromEntries(rows.map((r) => [r.label, r.value]))
    expect(byLabel['句长突发 cv']).toBe('0.483–0.699')
    expect(byLabel['他/姓名起句占比 上限']).toBe('0.35')
    expect(byLabel['合同名']).toBe('qidian_free_rank_human')
  })

  test('surfaces generation meta and the inherited-prose source', () => {
    const byLabel = Object.fromEntries(buildContractDetailRows(detail).map((r) => [r.label, r.value]))
    expect(byLabel['样本数']).toBe('810')
    expect(byLabel['题材合同数']).toBe('12')
    expect(byLabel['散文字段继承自']).toBe('builtin')
  })

  test('renders missing pieces as a dash instead of throwing', () => {
    const rows = buildContractDetailRows({ record: { id: 'builtin', label: '内置' }, contract: null, meta: null })
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((r) => typeof r.value === 'string')).toBe(true)
    expect(rows.some((r) => r.value === '—')).toBe(true)
  })

  test('returns an empty list for a null detail', () => {
    expect(buildContractDetailRows(null)).toEqual([])
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd <worktree>/ui/web && bun test src/pages/FingerprintContracts/fingerprintContractsModel.test.ts`
Expected: FAIL —— `buildContractDetailRows is not a function`

- [ ] **Step 3: 实现纯函数 + Drawer**

`fingerprintContractsModel.ts` 新增（标签用中文、与页面既有措辞一致；区间用 `–` U+2013 连接）：

```ts
const TARGET_LABELS: Array<{ key: string; label: string }> = [
  { key: 'cv_para', label: '句长突发 cv' },
  { key: 'single_sentence_para_ratio', label: '一句一段占比' },
  { key: 'two_sentence_para_ratio', label: '双句密段占比' },
  { key: 'dialogue_para_ratio', label: '对白段占比' },
  { key: 'max_mid_streak_max', label: '中句同带连续 上限' },
  { key: 'template_contrast_per_1k_max', label: '模板对比/千字 上限' },
  { key: 'stock_adverb_per_1k_max', label: '套话副词/千字 上限' },
  { key: 'clinical_hit_per_1k_max', label: '临床命中/千字 上限' },
  { key: 'subject_ta_opener_ratio_max', label: '他/姓名起句占比 上限' },
]

function formatTargetValue(value: any): string {
  if (Array.isArray(value) && value.length === 2) return `${value[0]}–${value[1]}`
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

export function buildContractDetailRows(detail: any): Array<{ label: string; value: string }> {
  if (!detail) return []
  const rows: Array<{ label: string; value: string }> = [
    { label: '合同集', value: formatTargetValue(detail.record?.label) },
    { label: '合同名', value: formatTargetValue(detail.contract?.name) },
    { label: '生成方式', value: formatTargetValue(detail.record?.mode) },
    { label: '生成时间', value: formatTargetValue(detail.record?.created_at) },
    { label: '样本数', value: formatTargetValue(detail.meta?.sample_count ?? detail.record?.sample_count) },
    { label: '题材合同数', value: formatTargetValue(detail.meta?.genre_count) },
    { label: '散文字段继承自', value: formatTargetValue(detail.meta?.inherited_prose_from) },
  ]
  for (const item of TARGET_LABELS) {
    rows.push({ label: item.label, value: formatTargetValue(detail.contract?.target?.[item.key]) })
  }
  return rows
}
```

`index.tsx`：
- 新增 state `detailOpen` / `detailLoading` / `detail`。
- 操作列在「锁定此份 / 解除锁定」与「删除」之间插入 `详情` 链接按钮：点击后 `setDetailOpen(true)`、`setDetailLoading(true)`，`await fingerprintContractApi.detail(row.id)` 填 `detail`，catch 里 `message.error(e?.response?.data?.error || '加载详情失败')`，finally 关 loading。
- 渲染 `<Drawer title="合同集详情" width={640} destroyOnHidden open={detailOpen} onClose={() => setDetailOpen(false)}>`，内部用 `<Table>`（`rowKey="label"`、`pagination={false}`、`size="small"`、两列「项 / 值」）渲染 `buildContractDetailRows(detail)`，`loading={detailLoading}`。
- Drawer 里再加一段只读说明：散文字段（提示词指令 / 规避 / 优先 / 朱雀硬门槛）继承自内置合同、不随重拟合改变。

- [ ] **Step 4: 运行测试与构建确认通过**

Run: `cd <worktree>/ui/web && bun test src/pages/FingerprintContracts/ src/pages/antdV5Compatibility.test.ts`
Expected: 全绿（含 antd v5 合规：Drawer 必须是 `destroyOnHidden`）

Run: `cd <worktree> && bun run build:web`
Expected: `✓ built`

- [ ] **Step 5: 提交**

```bash
git add ui/web/src/pages/FingerprintContracts/
git commit -m "feat(web): add contract set detail drawer

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: 评分看板与生成面板的显示缺陷

**Files:**
- Modify: `ui/web/src/pages/FingerprintContracts/index.tsx`
- Modify: `ui/web/src/pages/FingerprintContracts/fingerprintContractsModel.ts`
- Modify: `ui/web/src/pages/FingerprintContracts/fingerprintContractsModel.test.ts`

**Interfaces:**
- Consumes: Task 1 产出的 `check_pass_rates[].mean_value` 与 `.target`
- Produces:
  - `formatSamplesStatusText(status: { available?: boolean; count?: number; by_genre?: Record<string, number> } | null): string` — 生成样本状态文案，含按题材分布（题材数 >0 时追加 `按题材：urban 174 · xianxia 154 …`，按数量降序、最多 6 项，超出追加 `…`）
  - `buildCheckPassRateItems` 的返回项新增 `tooltip: string` 字段：`目标 <target> · 均值 <mean> · 采样 <n> 次`（target 为区间时渲染成 `0.099–0.328`，缺失渲染 `—`）

- [ ] **Step 1: 写失败测试**

在 `fingerprintContractsModel.test.ts` 追加：

```ts
import { formatSamplesStatusText } from './fingerprintContractsModel'

describe('formatSamplesStatusText', () => {
  test('lists the per-genre breakdown in descending order', () => {
    const text = formatSamplesStatusText({ available: true, count: 810, by_genre: { urban: 174, xianxia: 154, wuxia: 12 } })
    expect(text).toContain('810')
    expect(text.indexOf('urban 174')).toBeLessThan(text.indexOf('xianxia 154'))
    expect(text).toContain('wuxia 12')
  })

  test('explains the unavailable case without a breakdown', () => {
    const text = formatSamplesStatusText({ available: false, count: 0, by_genre: {} })
    expect(text).toContain('样本库为空')
    expect(text).not.toContain('按题材')
  })

  test('tolerates a null status', () => {
    expect(typeof formatSamplesStatusText(null)).toBe('string')
  })
})

describe('buildCheckPassRateItems tooltip', () => {
  test('includes target, mean and sample count', () => {
    const items = buildCheckPassRateItems({
      check_pass_rates: [
        { key: 'dialogue_para_ratio', pass_rate: 0.5, sample_count: 4, mean_value: 0.21, target: [0.099, 0.328] },
        { key: 'subject_ta_opener_ratio', pass_rate: 1, sample_count: 4, mean_value: 0.12, target: 0.35 },
      ],
    })
    expect(items[0].tooltip).toContain('0.099–0.328')
    expect(items[0].tooltip).toContain('0.21')
    expect(items[0].tooltip).toContain('4')
    expect(items[1].tooltip).toContain('0.35')
  })

  test('renders a dash when target and mean are absent', () => {
    const items = buildCheckPassRateItems({ check_pass_rates: [{ key: 'cv_para', pass_rate: 1, sample_count: 1 }] })
    expect(items[0].tooltip).toContain('—')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd <worktree>/ui/web && bun test src/pages/FingerprintContracts/fingerprintContractsModel.test.ts`
Expected: FAIL —— `formatSamplesStatusText is not a function`；tooltip 为 undefined

- [ ] **Step 3: 实现**

`fingerprintContractsModel.ts`：
- 新增 `formatSamplesStatusText`：不可用时返回含「样本库为空」与「样本因版权未入库，离线重拟合只能在有样本的机器上进行」的文案；可用时返回 `本地样本 <count> 条可用` + 按题材分布（降序、≤6 项、超出加 `…`）。
- `buildCheckPassRateItems` 每项补 `tooltip`，用与 `buildContractDetailRows` 相同的区间渲染规则（把区间格式化抽成一个共用的小函数，不要写两份）。

`index.tsx`：
1. **看板与下拉框脱钩**（终审 B4）：`load()` 里的 `fingerprintContractApi.scores()` 改成带上当前选中集 —— 即 `scores(selectedSetIdRef.current || undefined)`（用 ref 避免 `load` 依赖 state 造成闭包过期），或在 `load()` 完成后若 `selectedSetId` 非空则再调一次 `loadScores(selectedSetId)`。**要求**：在列表区点「启用 / 锁定 / 解除锁定 / 删除」后，明细表必须仍然只显示下拉框当前所选合同集的行。
2. **job 进度文字**（终审 B3）：`index.tsx:300` 的 `typeof job.progress === 'number' ? ...` 改成按字符串渲染：`job.progress ? ` · ${job.progress}` : ''`（服务端 progress 是 '排队中' / '加载本地样本' / '拟合全局合同（N 条样本）' / '完成' 这类文案）。
3. **样本状态文案**：Alert 的 message 改用 `formatSamplesStatusText(samplesStatus)`。
4. **指标 Tooltip**：`Tooltip title` 改用 `item.tooltip`。
5. **`online_fetch` 未接线标注**（终审 A8）：该 Radio 选项标签追加「（需在服务端手动运行 build 脚本）」，并在选中该模式时把生成按钮下方的说明切换为提示手动路径。
6. **selection 悬空提示**（终审 A7）：`load()` 读 `listRes.data.active`，当 `sets` 非空、`selection.active_set_id` 不是 `'builtin'`、且 `active` 为 null 时，在合同集列表上方渲染一个 `<Alert type="warning">`，说明当前启用的合同集已不存在、正回落到内置合同，建议重新选择一套。

- [ ] **Step 4: 运行测试与构建确认通过**

Run: `cd <worktree>/ui/web && bun test src/pages/FingerprintContracts/ src/pages/antdV5Compatibility.test.ts src/pages/novel-workspace/workspaceUiShell.a-a.test.ts src/pages/novel-workspace/workspaceUiShell.b-a.test.ts src/pages/novel-workspace/workspaceUiShell.b-b.test.ts`
Expected: 全绿（≥97 pass）

Run: `cd <worktree> && bun run build:web`
Expected: `✓ built`

- [ ] **Step 5: 提交**

```bash
git add ui/web/src/pages/FingerprintContracts/
git commit -m "fix(web): keep scoreboard scoped to the selected set, surface job progress and sample spread

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## 明确不做

- 让 `online_fetch` 真的起子进程抓取（保持手动路径，README 已说明）
- 题材自动选接线（仍只做预留）
- `fingerprintContractApi` 加泛型（纯类型体验，页面已在取值点做防御）
- `.workspace-config.json` 与 `package.json` 里机器特定绝对路径的整治（既有问题，涉及其它并发会话）
