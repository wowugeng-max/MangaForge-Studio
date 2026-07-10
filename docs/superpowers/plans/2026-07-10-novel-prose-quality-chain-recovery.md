# MangaForge 小说正文质量链路恢复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让请求级 oh-story 约束、写前硬门禁、48,000 字符正文核心合同、最多两轮独立复检和失败关闭的质量门禁共同决定章节正文能否生成与入库，并以项目 1 的真实第 10 章证明质量恢复到第 1-3 章基线。

**Architecture:** 在统一正文服务边界先合并请求约束并构建不可变 `ProseGenerationContract`，所有后续阶段只读取该快照。正文 prompt 由 section 注册表按 `required/full/compact/reference/omitted` 编译；写后由一个可注入扫描、审查和修订回调的两轮质量循环控制，最终质量决定在参考安全检查和任何正文/故事状态写入之前再次断言。

**Tech Stack:** Bun、TypeScript、Bun test、Express、Bun SQLite、现有 `executeNovelAgent` / `generateNovelChapterProse` 运行时、Gemini `gemini-3.5-flash`（模型 ID 217）。

---

## File Map

- Create: `ui/server/src/novel-writing/prose-generation-contract.ts`
  - 请求约束压缩与合并、合同 key 归一化、不可变生成合同、写前 gate decision。
- Create: `ui/server/src/novel-writing/prose-generation-contract.test.ts`
  - snake/camel 请求字段、不可变快照、`allow_incomplete` 不绕过硬门禁、场景卡前后两阶段门禁。
- Create: `ui/server/src/novel-writing/prose-contract-prompt.ts`
  - section 注册表编译、导演选择落地、48,000 字符预算、诊断和超预算错误。
- Create: `ui/server/src/novel-writing/prose-contract-prompt.test.ts`
  - required 保留、未选合同缺席、降级顺序、required 溢出失败、诊断字符数。
- Create: `ui/server/src/novel-writing/prose-quality-loop.ts`
  - 六维 finding、硬失败分类、聚焦审查/修订 prompt、最多两轮修订、复检失败关闭、审批边界。
- Create: `ui/server/src/novel-writing/prose-quality-loop.test.ts`
  - fresh scan/recheck、两轮上限、复检异常、硬失败不可审批、通过后的存储断言。
- Modify: `ui/server/src/routes/novel-oh-story-director.ts`
  - `strict_ready=false` 阻断，合同 key 统一，最多选择四个风险合同。
- Modify: `ui/server/src/routes/novel-oh-story-director.test.ts`
  - 将导演 readiness 和选择预算改成行为断言。
- Modify: `ui/server/src/novel-writing/prose-quality-contracts.ts`
  - 扩充修订稿可用性检查，拒绝非中文、工程附录、标题边界错误、截断和无实质变化。
- Modify: `ui/server/src/novel-writing/prose-quality-contracts.test.ts`
  - 覆盖新增的修订稿拒绝原因。
- Modify: `ui/server/src/routes/novel-writing-service.ts`
  - 统一上下文重建、合同快照、prompt 编译、质量循环、最终入库断言和诊断输出。
- Modify: `ui/server/src/routes/novel-writing-service.test.ts`
  - 删除“复检超时仍接受”和 generic approval 绕过硬失败的源码断言，新增可执行行为测试。
- Modify: `ui/server/src/routes/novel-generation-routes.ts`
  - HTTP body 作为统一服务 options 传递；不再自动批准新生成场景卡；删除不可达的第二套正文编排。
- Modify: `ui/server/src/routes/novel-generation-routes.test.ts`
  - 用 options 适配器行为测试替换请求透传/自动审批源码字符串断言。
- Modify: `ui/server/src/llm/executor.ts`
  - 识别已预算正文任务，避免再次拼接未受控正文上下文，并把 usage 交给 prompt 诊断。
- Modify: `ui/server/src/novel-writing/prose-prompt-context.ts`
  - 保留 180,000 字符工具供非正文辅助任务；正文不再调用它。
- Create: `scripts/validate-novel-prose-quality-recovery.ts`
  - 数据库备份、章节哈希、正常链路生成、确定性检查、两次匿名真实模型评分和阈值判定。
- Create: `scripts/validate-novel-prose-quality-recovery.test.ts`
  - 七维评分聚合和阈值边界的纯计算测试。
- Create: `artifacts/novel-prose-quality-recovery/.gitkeep`
  - 验收报告目录；报告本身按时间生成且不包含密钥或完整 prompt。
- Modify: `docs/superpowers/specs/2026-07-10-novel-prose-quality-chain-recovery-design.md`
  - 记录规格已批准和最终验收报告链接。

### Task 1: 建立不可变生成合同和请求约束合并

**Files:**
- Create: `ui/server/src/novel-writing/prose-generation-contract.ts`
- Create: `ui/server/src/novel-writing/prose-generation-contract.test.ts`
- Modify: `ui/server/src/routes/novel-generation-routes.ts:95-353`

- [ ] **Step 1: 写请求合并、key 归一化和不可变快照的失败测试**

```ts
import { describe, expect, test } from 'bun:test'
import {
  buildProseGenerationContract,
  mergeProseGenerationRequestOverrides,
  normalizeProseContractKey,
} from './prose-generation-contract'

describe('prose generation contract', () => {
  test('merges snake and camel request constraints into both context levels', () => {
    const merged = mergeProseGenerationRequestOverrides(
      { chapter_target: { chapter_no: 10, title: '合围' }, preflight: { ready: true, strict_ready: true } },
      {
        chapter_launch_gate: { status: 'blocked', summary: '承接项缺失' },
        longformCompass: { readerPromise: '超人以行动碾碎怪谈规则' },
        batchPreflight: {
          deliveryRiskCarryOver: { items: ['接住第九章合围'] },
          chapterHandoffContract: { previousHandoff: '追捕队封死四面出口。' },
        },
        million_word_runway: { mode: 'single_chapter' },
      },
    )

    expect(merged.chapter_launch_gate.status).toBe('blocked')
    expect(merged.chapter_target.chapter_launch_gate.status).toBe('blocked')
    expect(merged.longform_compass.readerPromise).toContain('超人')
    expect(merged.chapter_target.delivery_risk_carry_over.items[0]).toContain('第九章')
    expect(merged.chapter_target.previous_handoff).toContain('封死四面出口')
    expect(merged.chapter_target.million_word_runway.mode).toBe('single_chapter')
  })

  test('normalizes aliases and removes only a terminal contract suffix', () => {
    expect(normalizeProseContractKey('quality_audit_contract')).toBe('quality_audit')
    expect(normalizeProseContractKey('characterBehaviorContract')).toBe('character_behavior')
    expect(normalizeProseContractKey('story_power')).toBe('story_power')
  })

  test('clones and freezes the contract without freezing the caller context', () => {
    const context = {
      chapter_target: { chapter_no: 10, title: '合围', scene_cards: [{ scene_no: 1, goal: '破开包围' }] },
      preflight: { ready: true, strict_ready: true },
      oh_story_director: { readiness: 'ready', selected_contracts: [] },
    }
    const contract = buildProseGenerationContract(context)

    context.chapter_target.title = '调用方后改标题'
    expect(contract.chapter.title).toBe('合围')
    expect(Object.isFrozen(contract)).toBe(true)
    expect(Object.isFrozen(contract.context.chapter_target)).toBe(true)
    expect(() => { (contract.context.chapter_target as any).title = '非法修改' }).toThrow()
  })
})
```

- [ ] **Step 2: 运行测试确认模块尚不存在**

Run: `cd ui/server && bun test src/novel-writing/prose-generation-contract.test.ts`

Expected: FAIL with `Cannot find module './prose-generation-contract'`.

- [ ] **Step 3: 实现规范化、压缩、合并和只读快照**

```ts
import { getChapterLaunchGateBlocker } from './prose-quality-contracts'

export const PROSE_PROMPT_MAX_CHARS = 48_000
export const PROSE_RISK_CONTRACT_LIMIT = 4

export type ProsePreDraftGateCode =
  | 'PROSE_PREFLIGHT_BLOCKED'
  | 'PROSE_STRICT_PREFLIGHT_BLOCKED'
  | 'PROSE_LAUNCH_GATE_BLOCKED'
  | 'PROSE_OH_STORY_GATE_BLOCKED'
  | 'PROSE_SCENE_CARDS_BLOCKED'

export interface ProsePreDraftGateDecision {
  passed: boolean
  code: ProsePreDraftGateCode | ''
  reasons: string[]
  details?: any
}

export interface ProseGenerationContract {
  version: 'prose_generation_contract_v1'
  chapter: Readonly<{
    id: number
    chapter_no: number
    title: string
    goal: string
    summary: string
    conflict: string
    ending_hook: string
    previous_handoff: any
    word_target: any
    scene_cards: readonly any[]
  }>
  preflight: Readonly<any>
  director: Readonly<any>
  context: Readonly<any>
}

const OVERRIDE_FIELDS = [
  ['longform_compass', 'longformCompass'],
  ['longform_battle_context', 'longformBattleContext'],
  ['next_batch_brief', 'nextBatchBrief'],
  ['chapter_launch_gate', 'chapterLaunchGate'],
  ['batch_preflight', 'batchPreflight'],
  ['million_word_runway', 'millionWordRunway'],
] as const

function compactText(value: any, maxChars = 900) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  return text.length <= maxChars ? text : text.slice(0, maxChars)
}

export function compactProseGenerationOverride(value: any, depth = 0): any {
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'string') return compactText(value, depth > 1 ? 420 : 900)
  if (Array.isArray(value)) return value.slice(0, depth > 1 ? 12 : 20).map(item => compactProseGenerationOverride(item, depth + 1))
  if (typeof value !== 'object' || depth >= 6) return compactText(JSON.stringify(value), 420)
  const dropped = new Set(['context_package', 'contextPackage', 'raw_payload', 'rawPayload', 'debug', 'pipeline'])
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !dropped.has(key))
      .slice(0, depth > 1 ? 30 : 50)
      .map(([key, item]) => [key, compactProseGenerationOverride(item, depth + 1)]),
  )
}

function firstField(source: any, snake: string, camel: string) {
  return source?.[snake] ?? source?.[camel]
}

export function mergeProseGenerationRequestOverrides(contextPackage: any, request: any = {}) {
  const merged = { ...contextPackage, chapter_target: { ...(contextPackage?.chapter_target || {}) } }
  for (const [snake, camel] of OVERRIDE_FIELDS) {
    const raw = firstField(request, snake, camel)
    if (raw == null) continue
    const value = compactProseGenerationOverride(raw)
    merged[snake] = value
    merged.chapter_target[snake] = value
  }
  const batch = merged.batch_preflight || merged.chapter_target.batch_preflight
  if (batch) {
    const carry = compactProseGenerationOverride(firstField(batch, 'delivery_risk_carry_over', 'deliveryRiskCarryOver'))
    const handoff = compactProseGenerationOverride(firstField(batch, 'chapter_handoff_contract', 'chapterHandoffContract'))
    const previous = firstField(handoff, 'previous_handoff', 'previousHandoff')
    if (carry) merged.delivery_risk_carry_over = merged.chapter_target.delivery_risk_carry_over = carry
    if (handoff) merged.chapter_handoff_contract = merged.chapter_target.chapter_handoff_contract = handoff
    if (previous) merged.previous_handoff = merged.chapter_target.previous_handoff = previous
  }
  return merged
}

export function normalizeProseContractKey(value: any) {
  return String(value ?? '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase()
    .replace(/_contract$/, '')
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (!value || typeof value !== 'object' || seen.has(value as object)) return value
  seen.add(value as object)
  Object.values(value as any).forEach(item => deepFreeze(item, seen))
  return Object.freeze(value)
}

function cloneValue<T>(value: T): T {
  return structuredClone(value)
}

export function buildProseGenerationContract(contextPackage: any): ProseGenerationContract {
  const context = cloneValue(contextPackage || {})
  const target = { ...(context.chapter_target || {}), ...(context.chapterTarget || {}) }
  return deepFreeze({
    version: 'prose_generation_contract_v1',
    chapter: {
      id: Number(target.id || 0),
      chapter_no: Number(target.chapter_no ?? target.chapterNo ?? 0),
      title: String(target.title || ''),
      goal: String(target.goal || target.chapter_goal || ''),
      summary: String(target.summary || ''),
      conflict: String(target.conflict || ''),
      ending_hook: String(target.ending_hook || target.endingHook || ''),
      previous_handoff: target.previous_handoff ?? target.previousHandoff ?? null,
      word_target: target.word_target ?? target.wordTarget ?? null,
      scene_cards: target.scene_cards ?? target.sceneCards ?? [],
    },
    preflight: context.preflight || {},
    director: context.oh_story_director || context.ohStoryDirector || {},
    context,
  })
}
```

- [ ] **Step 4: 让旧 route compaction API 委托新模块，保持调用方兼容**

```ts
import { compactProseGenerationOverride } from '../novel-writing/prose-generation-contract'

export function compactGenerationRequestOverride(value: any) {
  return compactProseGenerationOverride(value)
}
```

删除 route 内重复的递归 compaction 实现，但保留这个导出，现有调用方和测试不需要一次性改名。

- [ ] **Step 5: 运行合同测试**

Run: `cd ui/server && bun test src/novel-writing/prose-generation-contract.test.ts src/routes/novel-generation-routes.test.ts`

Expected: PASS; route 现有 compaction 测试继续通过。

- [ ] **Step 6: 提交生成合同基础**

```bash
git add ui/server/src/novel-writing/prose-generation-contract.ts ui/server/src/novel-writing/prose-generation-contract.test.ts ui/server/src/routes/novel-generation-routes.ts
git commit -m "feat(novel): add immutable prose generation contract"
```

### Task 2: 恢复 director strict readiness 和写前硬门禁

**Files:**
- Modify: `ui/server/src/novel-writing/prose-generation-contract.ts`
- Modify: `ui/server/src/novel-writing/prose-generation-contract.test.ts`
- Modify: `ui/server/src/routes/novel-oh-story-director.ts:253-300,390-465`
- Modify: `ui/server/src/routes/novel-oh-story-director.test.ts`

- [ ] **Step 1: 写 strict readiness、director、launch gate 和 scene card 两阶段门禁测试**

```ts
import { buildOhStoryDirectorForPreDraft } from '../routes/novel-oh-story-director'
import { evaluateProsePreDraftGate } from './prose-generation-contract'

test('treats strict_ready false as blocking after repair', () => {
  const director = buildOhStoryDirectorForPreDraft({
    preflight: {
      ready: true,
      strict_ready: false,
      checks: [{ key: 'continuity', ok: false, severity: 'medium', label: '连续性材料' }],
      warnings: ['连续性材料不足'],
      blockers: [],
    },
    chapter_target: { story_power_contract: { promise: '行动破局' } },
  })

  expect(director.readiness).toBe('needs_repair')
  expect(director.required_repairs.map(item => item.key)).toContain('pre_draft_strict_readiness')
})

test('does not let allow_incomplete bypass hard pre-draft gates', () => {
  const context = {
    chapter_target: { chapter_no: 10, scene_cards: [{ scene_no: 1 }] },
    preflight: { ready: true, strict_ready: true },
    chapter_launch_gate: { status: 'blocked', summary: '第九章合围没有承接动作' },
    oh_story_director: { readiness: 'ready', required_repairs: [] },
  }
  const decision = evaluateProsePreDraftGate(buildProseGenerationContract(context), {
    requireSceneCards: true,
    allowIncomplete: true,
  })

  expect(decision).toMatchObject({ passed: false, code: 'PROSE_LAUNCH_GATE_BLOCKED' })
})

test('allows scene-card generation only after all other hard gates pass', () => {
  const contract = buildProseGenerationContract({
    chapter_target: { chapter_no: 10, scene_cards: [] },
    preflight: { ready: true, strict_ready: true },
    oh_story_director: { readiness: 'ready', required_repairs: [] },
  })

  expect(evaluateProsePreDraftGate(contract, { requireSceneCards: false }).passed).toBe(true)
  expect(evaluateProsePreDraftGate(contract, { requireSceneCards: true }).code).toBe('PROSE_SCENE_CARDS_BLOCKED')
})
```

- [ ] **Step 2: 运行测试确认 strict_ready 当前仍错误放行**

Run: `cd ui/server && bun test src/novel-writing/prose-generation-contract.test.ts src/routes/novel-oh-story-director.test.ts`

Expected: FAIL because the director returns `ready` and `evaluateProsePreDraftGate` is not implemented.

- [ ] **Step 3: 在 director 中把 strict gap 转成 required repair**

```ts
  const strictReady = preflight?.strict_ready !== false
  const strictFailures = asArray(preflight?.checks).filter((item: any) => item?.ok === false && item?.severity !== 'low')
  const blockingIssues = [
    ...blockers.map((message: unknown) => ({ message, source: 'preflight.blockers' })),
    ...(preflightReady ? [] : warnings.map((message: unknown) => ({ message, source: 'preflight.warnings' }))),
    ...(!strictReady ? [{
      message: strictFailures.map((item: any) => item?.fix || item?.label || item?.key).filter(Boolean).join('；') || 'strict preflight is not ready',
      source: 'preflight.strict_ready',
      repairKey: 'pre_draft_strict_readiness',
    }] : []),
  ]
```

在生成 `required_repairs` 时保留显式 `repairKey`，使 strict gap 不会被普通 warning 分组吞掉；`preflight.ready=true` 也不改变该判断。

- [ ] **Step 4: 统一 director 合同 key 并限制最多四项**

```ts
import { normalizeProseContractKey, PROSE_RISK_CONTRACT_LIMIT } from '../novel-writing/prose-generation-contract'

const candidates: Array<OhStoryDirectorContractSelection & { priority: number }> = []
const select = (key: string, detailLevel: OhStoryDirectorContractSelection['detail_level'], reason: string, priority: number) => {
  const normalizedKey = normalizeProseContractKey(key)
  if (!normalizedKey || selected_contracts.some(item => item.key === normalizedKey)) return
  candidates.push({ key: normalizedKey, reason, detail_level: detailLevel, priority })
}

const CONTRACT_RISK_PATTERNS: Array<{ key: string; pattern: RegExp; priority: number }> = [
  { key: 'continuity_heat', pattern: /承接|连续性|上一章|状态|时间线/, priority: 100 },
  { key: 'story_power', pattern: /核心承诺|故事力|主线|回报|目标/, priority: 95 },
  { key: 'character_behavior', pattern: /主角|角色|人设|行为|能动性/, priority: 90 },
  { key: 'conflict_structure', pattern: /冲突|阻碍|升级|因果|场景变化/, priority: 85 },
  { key: 'chapter_hook', pattern: /钩子|追读|章末|翻页/, priority: 80 },
  { key: 'dialogue', pattern: /对白|口吻|台词|声线/, priority: 75 },
  { key: 'prose_craft', pattern: /文风|AI味|段落|句式|叙事/, priority: 70 },
  { key: 'quality_audit', pattern: /质量|退化|截断|格式|语言/, priority: 65 },
  { key: 'fact_setting_safety', pattern: /设定|事实|来源|安全/, priority: 60 },
  { key: 'longform_structure', pattern: /长线|长篇|卷|批次|航线/, priority: 55 },
]
const warningText = asArray(input?.preflight?.warnings).map(issueText).join('\n')
const availableKeys = Object.keys(chapterTarget)
  .filter(key => /(?:_contract|Contract)$/.test(key) && chapterTarget[key])
  .map(normalizeProseContractKey)
for (const key of unique(availableKeys)) {
  const risk = CONTRACT_RISK_PATTERNS.find(item => item.key === key)
  const matched = Boolean(risk?.pattern.test(warningText))
  select(key, matched ? 'full' : 'reference', matched ? `Preflight risk matched ${key}` : `Available chapter contract ${key}`, (risk?.priority || 20) + (matched ? 100 : 0))
}
const selected = candidates
  .sort((left, right) => right.priority - left.priority || left.key.localeCompare(right.key))
  .slice(0, PROSE_RISK_CONTRACT_LIMIT)
selected_contracts.push(...selected.map(({ priority: _priority, ...item }) => item))
for (const item of selected_contracts) budget[item.detail_level].push(item.key)
const selectedKeys = new Set(selected_contracts.map(item => item.key))
for (const key of unique(availableKeys).filter(item => !selectedKeys.has(item))) {
  suppressed_contracts.push({ key, reason: 'Not selected for this chapter risk budget', detail_level: 'reference' })
  budget.omit.push(key)
}
```

可用合同从 `chapter_target` 中所有以 `Contract` 或 `_contract` 结尾的非核心字段收集；风险 warning 命中时提高优先级，未命中但本章明确携带的合同使用 `reference`。`budget.omit` 写规范 key，不再混用 `longform_structure_contract` 和 `longform_structure`。

- [ ] **Step 5: 实现单一顺序的写前 gate decision**

```ts
export function evaluateProsePreDraftGate(
  contract: ProseGenerationContract,
  options: { requireSceneCards?: boolean; allowIncomplete?: boolean } = {},
): ProsePreDraftGateDecision {
  const preflight = contract.preflight || {}
  if (preflight.ready !== true) {
    return { passed: false, code: 'PROSE_PREFLIGHT_BLOCKED', reasons: asReasonList(preflight.blockers, preflight.warnings), details: preflight }
  }
  if (preflight.strict_ready === false) {
    const failures = (Array.isArray(preflight.checks) ? preflight.checks : []).filter((item: any) => item?.ok === false && item?.severity !== 'low')
    return { passed: false, code: 'PROSE_STRICT_PREFLIGHT_BLOCKED', reasons: asReasonList(failures.map((item: any) => item?.fix || item?.label || item?.key)), details: failures }
  }
  const launchBlocker = getChapterLaunchGateBlocker(
    contract.context.chapter_launch_gate
      || contract.context.chapterLaunchGate
      || contract.context.chapter_target?.chapter_launch_gate
      || contract.context.chapterTarget?.chapterLaunchGate,
  )
  if (launchBlocker) {
    return { passed: false, code: 'PROSE_LAUNCH_GATE_BLOCKED', reasons: [launchBlocker.summary], details: launchBlocker }
  }
  if (['needs_repair', 'needs_user_confirmation', 'auto_repairing', 'blocked'].includes(String(contract.director?.readiness || ''))) {
    return {
      passed: false,
      code: 'PROSE_OH_STORY_GATE_BLOCKED',
      reasons: (contract.director?.required_repairs || []).map((item: any) => String(item?.detail || item?.label || item?.key)).filter(Boolean),
      details: contract.director,
    }
  }
  if (options.requireSceneCards !== false && contract.chapter.scene_cards.length === 0) {
    return { passed: false, code: 'PROSE_SCENE_CARDS_BLOCKED', reasons: ['正文生成前必须有本章场景卡'] }
  }
  return { passed: true, code: '', reasons: [] }
}
```

同一模块中定义错误原因压缩，保证每个失败决定至少有一条可审计原因：

```ts
function asReasonList(...values: any[]) {
  const rows = values
    .flatMap(value => Array.isArray(value) ? value : [value])
    .map(value => String(value?.detail || value?.fix || value?.label || value?.message || value || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  return rows.length ? Array.from(new Set(rows)).slice(0, 12) : ['写前门禁未通过']
}
```

`options.allowIncomplete` 故意不参与硬门禁判断，只保留在签名中证明调用者无法借它改写结果。

- [ ] **Step 6: 运行导演和合同测试**

Run: `cd ui/server && bun test src/routes/novel-oh-story-director.test.ts src/novel-writing/prose-generation-contract.test.ts`

Expected: PASS; selected contract 数量均不超过 4，所有 key 都不带 `_contract` 后缀。

- [ ] **Step 7: 提交写前强门禁**

```bash
git add ui/server/src/routes/novel-oh-story-director.ts ui/server/src/routes/novel-oh-story-director.test.ts ui/server/src/novel-writing/prose-generation-contract.ts ui/server/src/novel-writing/prose-generation-contract.test.ts
git commit -m "fix(novel): fail closed on strict prose preflight"
```

### Task 3: 建立 48K section 级正文 prompt 编译器

**Files:**
- Create: `ui/server/src/novel-writing/prose-contract-prompt.ts`
- Create: `ui/server/src/novel-writing/prose-contract-prompt.test.ts`
- Modify: `ui/server/src/novel-writing/prose-prompt-context.ts:1,276-311`

- [ ] **Step 1: 写 required、选择、降级、omit 和溢出测试**

```ts
import { describe, expect, test } from 'bun:test'
import { compileProseContractPrompt, ProseCorePromptBudgetError } from './prose-contract-prompt'

const required = [
  { key: 'task', text: 'CORE_TASK' },
  { key: 'chapter', text: 'CORE_CHAPTER' },
  { key: 'output', text: 'CORE_OUTPUT' },
]

test('keeps required sections and omits every unselected risk contract', () => {
  const result = compileProseContractPrompt({
    requiredSections: required,
    contractSections: [
      { key: 'dialogue', full: 'DIALOGUE_FULL', compact: 'DIALOGUE_COMPACT', reference: 'DIALOGUE_REF' },
      { key: 'quality_audit', full: 'QUALITY_FULL', compact: 'QUALITY_COMPACT', reference: 'QUALITY_REF' },
    ],
    director: {
      selected_contracts: [{ key: 'dialogue_contract', detail_level: 'compact', reason: '对白风险' }],
      prompt_budget_plan: { compact: ['dialogue_contract'], omit: ['quality_audit_contract'] },
    },
  })

  expect(result.prompt).toContain('CORE_TASK')
  expect(result.prompt).toContain('DIALOGUE_COMPACT')
  expect(result.prompt).not.toContain('DIALOGUE_FULL')
  expect(result.prompt).not.toContain('QUALITY_')
  expect(result.diagnostics.selected_contract_keys).toEqual(['dialogue'])
  expect(result.diagnostics.omitted_contract_keys).toContain('quality_audit')
})

test('downgrades optional sections but never truncates required sections', () => {
  const result = compileProseContractPrompt({
    maxChars: 120,
    requiredSections: [{ key: 'task', text: 'R'.repeat(70) }],
    contractSections: [{ key: 'dialogue', full: 'F'.repeat(80), compact: 'C'.repeat(30), reference: 'REF' }],
    director: { selected_contracts: [{ key: 'dialogue', detail_level: 'full', reason: '对白风险' }] },
  })

  expect(result.prompt).toContain('R'.repeat(70))
  expect(result.prompt).toContain('C'.repeat(30))
  expect(result.prompt.length).toBeLessThanOrEqual(120)
  expect(result.diagnostics.downgrades).toEqual([{ key: 'dialogue', from: 'full', to: 'compact' }])
})

test('fails when required sections alone exceed the budget', () => {
  expect(() => compileProseContractPrompt({
    maxChars: 48_000,
    requiredSections: [{ key: 'chapter', text: '章'.repeat(48_001) }],
    contractSections: [],
    director: { selected_contracts: [] },
  })).toThrow(ProseCorePromptBudgetError)

  try {
    compileProseContractPrompt({
      maxChars: 48_000,
      requiredSections: [{ key: 'chapter', text: '章'.repeat(48_001) }],
      contractSections: [],
      director: { selected_contracts: [] },
    })
  } catch (error: any) {
    expect(error.code).toBe('PROSE_CORE_PROMPT_BUDGET_EXCEEDED')
    expect(error.diagnostics.required_chars).toBeGreaterThan(48_000)
  }
})
```

- [ ] **Step 2: 运行测试确认编译器不存在**

Run: `cd ui/server && bun test src/novel-writing/prose-contract-prompt.test.ts`

Expected: FAIL with `Cannot find module './prose-contract-prompt'`.

- [ ] **Step 3: 实现 prompt section 类型、预算错误和编译算法**

```ts
import { normalizeProseContractKey, PROSE_PROMPT_MAX_CHARS, PROSE_RISK_CONTRACT_LIMIT } from './prose-generation-contract'

export type ProsePromptDetailLevel = 'full' | 'compact' | 'reference'

export interface ProseRequiredPromptSection {
  key: string
  text: string | string[]
}

export interface ProseRiskPromptSection {
  key: string
  full: string | string[]
  compact: string | string[]
  reference: string | string[]
}

export interface ProsePromptDiagnostics {
  prompt_chars: number
  required_chars: number
  selected_contract_keys: string[]
  omitted_contract_keys: string[]
  section_chars: Record<string, number>
  downgrades: Array<{ key: string; from: ProsePromptDetailLevel; to: ProsePromptDetailLevel }>
  budget_chars: number
}

export class ProseCorePromptBudgetError extends Error {
  code = 'PROSE_CORE_PROMPT_BUDGET_EXCEEDED'
  constructor(public diagnostics: ProsePromptDiagnostics) {
    super(`正文核心 prompt ${diagnostics.required_chars} 字符超过预算 ${diagnostics.budget_chars}`)
  }
}

function sectionText(value: string | string[]) {
  return (Array.isArray(value) ? value : [value]).map(item => String(item || '').trim()).filter(Boolean).join('\n')
}

function appendWithinBudget(parts: string[], text: string, maxChars: number) {
  const separator = parts.length ? 1 : 0
  if (parts.join('\n').length + separator + text.length > maxChars) return false
  parts.push(text)
  return true
}

export function compileProseContractPrompt(input: {
  requiredSections: ProseRequiredPromptSection[]
  contractSections: ProseRiskPromptSection[]
  director: any
  maxChars?: number
}) {
  const maxChars = input.maxChars || PROSE_PROMPT_MAX_CHARS
  const requiredRows = input.requiredSections.map(section => ({ key: section.key, text: sectionText(section.text) })).filter(row => row.text)
  const requiredPrompt = requiredRows.map(row => row.text).join('\n')
  const sectionChars = Object.fromEntries(requiredRows.map(row => [row.key, row.text.length]))
  const selectedRows = (input.director?.selected_contracts || input.director?.selectedContracts || [])
    .slice(0, PROSE_RISK_CONTRACT_LIMIT)
    .map((item: any) => ({
      key: normalizeProseContractKey(item?.key),
      level: (item?.detail_level || item?.detailLevel || 'reference') as ProsePromptDetailLevel,
    }))
    .filter((item: any) => item.key)
  const sectionByKey = new Map(input.contractSections.map(section => [normalizeProseContractKey(section.key), section]))
  const diagnostics: ProsePromptDiagnostics = {
    prompt_chars: requiredPrompt.length,
    required_chars: requiredPrompt.length,
    selected_contract_keys: selectedRows.map((item: any) => item.key),
    omitted_contract_keys: input.contractSections.map(section => normalizeProseContractKey(section.key)).filter(key => !selectedRows.some((item: any) => item.key === key)),
    section_chars: sectionChars,
    downgrades: [],
    budget_chars: maxChars,
  }
  if (requiredPrompt.length > maxChars) throw new ProseCorePromptBudgetError(diagnostics)

  const parts = requiredRows.map(row => row.text)
  const fallback: Record<ProsePromptDetailLevel, ProsePromptDetailLevel[]> = {
    full: ['full', 'compact', 'reference'],
    compact: ['compact', 'reference'],
    reference: ['reference'],
  }
  for (const selected of selectedRows) {
    const section = sectionByKey.get(selected.key)
    if (!section) continue
    for (const level of fallback[selected.level]) {
      const text = sectionText(section[level])
      if (!text || !appendWithinBudget(parts, text, maxChars)) continue
      diagnostics.section_chars[`contract:${selected.key}:${level}`] = text.length
      if (level !== selected.level) diagnostics.downgrades.push({ key: selected.key, from: selected.level, to: level })
      break
    }
  }
  const prompt = parts.join('\n')
  diagnostics.prompt_chars = prompt.length
  return { prompt, diagnostics }
}
```

- [ ] **Step 4: 明确旧 180K helper 不再是正文入口**

在 `prose-prompt-context.ts` 把常量改名为 `AUXILIARY_PROSE_PROMPT_MAX_CHARS`，并给 `buildBoundedProsePrompt` 增加一句注释，说明它仅供 expansion/contraction 等辅助任务兼容；`buildParagraphProseContext` 在 Task 4 中移除对它的调用。

- [ ] **Step 5: 运行编译器和旧 prompt context 测试**

Run: `cd ui/server && bun test src/novel-writing/prose-contract-prompt.test.ts src/novel-writing/prose-prompt-context.test.ts`

Expected: PASS; 48K 测试不依赖字符串尾部裁剪。

- [ ] **Step 6: 提交 prompt 编译器**

```bash
git add ui/server/src/novel-writing/prose-contract-prompt.ts ui/server/src/novel-writing/prose-contract-prompt.test.ts ui/server/src/novel-writing/prose-prompt-context.ts
git commit -m "feat(novel): compile prose prompts from director budget"
```

### Task 4: 把统一服务接到生成合同和真实 prompt 预算

**Files:**
- Modify: `ui/server/src/routes/novel-writing-service.ts:27-171,832-840,39985-41061,44562-44772`
- Modify: `ui/server/src/routes/novel-writing-service.test.ts`
- Modify: `ui/server/src/routes/novel-generation-routes.ts:591-612,1476-1625`
- Modify: `ui/server/src/routes/novel-generation-routes.test.ts:560-650,710-812`
- Modify: `ui/server/src/llm/executor.ts:838-940`

- [ ] **Step 1: 写 route options 适配器行为测试，证明请求字段和审批原样进入服务**

```ts
import { buildStandaloneProseServiceOptions } from './novel-generation-routes'

test('passes prose constraints to the unified service without auto approving scene cards', () => {
  const body = {
    project_id: 1,
    model_id: 217,
    chapter_launch_gate: { status: 'blocked', summary: '缺承接' },
    longform_compass: { reader_promise: '行动破局' },
    batch_preflight: { delivery_risk_carry_over: { items: ['接合围'] } },
    approvals: { safety: { approved: true } },
  }
  const options = buildStandaloneProseServiceOptions(body, {
    modelId: 217,
    autoRepairQualityGate: false,
    onStage: async () => {},
    abortSignal: new AbortController().signal,
  })

  expect(options.chapter_launch_gate.status).toBe('blocked')
  expect(options.longform_compass.reader_promise).toBe('行动破局')
  expect(options.batch_preflight.delivery_risk_carry_over.items[0]).toBe('接合围')
  expect(options.approvals.safety.approved).toBe(true)
  expect(options.approvals.scene_cards).toBeUndefined()
})
```

- [ ] **Step 2: 写服务准备函数行为测试，证明 launch gate 在 draft callback 前阻断**

```ts
import { prepareProseGenerationContract } from './novel-writing-service'

test('recomputes director after request merge and blocks before draft invocation', async () => {
  let draftCalls = 0
  const prepared = prepareProseGenerationContract(
    {
      chapter_target: { chapter_no: 10, scene_cards: [{ scene_no: 1 }] },
      preflight: { ready: true, strict_ready: true, checks: [], warnings: [], blockers: [] },
    },
    { chapter_launch_gate: { status: 'blocked', summary: '第九章追捕合围未承接' }, allow_incomplete: true },
  )

  await expect(prepared.runAfterGate(async () => { draftCalls += 1 })).rejects.toMatchObject({
    code: 'PROSE_LAUNCH_GATE_BLOCKED',
  })
  expect(draftCalls).toBe(0)
  expect(prepared.contract.context.chapter_target.chapter_launch_gate.status).toBe('blocked')
})
```

- [ ] **Step 3: 运行 route/service 测试确认旧 options helper 和准备函数缺失**

Run: `cd ui/server && bun test src/routes/novel-generation-routes.test.ts src/routes/novel-writing-service.test.ts -t "request merge|passes prose constraints|recomputes director"`

Expected: FAIL because `buildStandaloneProseServiceOptions` and `prepareProseGenerationContract` are not exported.

- [ ] **Step 4: 实现统一准备函数并在每次上下文重建后使用**

```ts
export function prepareProseGenerationContract(baseContext: any, options: any = {}) {
  const contextPackage = attachOhStoryDirectorToContextPackage(
    mergeProseGenerationRequestOverrides(baseContext, options),
  )
  const contract = buildProseGenerationContract(contextPackage)
  const runAfterGate = async <T>(callback: (contract: ProseGenerationContract) => Promise<T>, requireSceneCards = true) => {
    const decision = evaluateProsePreDraftGate(contract, { requireSceneCards, allowIncomplete: options.allow_incomplete === true })
    if (!decision.passed) {
      throw Object.assign(new Error(decision.reasons.join('；') || '章节生成写前门禁未通过'), {
        code: decision.code,
        gateDecision: decision,
        contextPackage,
        generationContract: contract,
      })
    }
    return callback(contract)
  }
  return { contextPackage, contract, runAfterGate }
}
```

在 `generateChapterForGroup` 初建、材料修复后重建、场景卡生成后重建三处都调用该函数。场景卡模型前使用 `requireSceneCards=false`；正文模型前使用 `requireSceneCards=true`。删除 `options.allow_incomplete` 对 `ready`、launch gate 和 scene card 的条件分支。

- [ ] **Step 5: 建立 required sections 和风险 section 注册表**

```ts
function buildProseCorePromptSections(project: any, contract: ProseGenerationContract) {
  const target = contract.chapter
  const context = contract.context
  const preflightChecks = (Array.isArray(contract.preflight?.checks) ? contract.preflight.checks : [])
    .filter((item: any) => item?.ok === false)
    .slice(0, 8)
    .map((item: any) => ({ key: item?.key, severity: item?.severity, label: item?.label }))
  const directorSnapshot = {
    readiness: contract.director?.readiness,
    primary_action: contract.director?.primary_action,
    required_repairs: (contract.director?.required_repairs || []).slice(0, 6),
    selected_contracts: (contract.director?.selected_contracts || []).slice(0, 4),
  }
  const launchGateSnapshot = context?.chapter_launch_gate
    || context?.chapterLaunchGate
    || context?.chapter_target?.chapter_launch_gate
    || context?.chapterTarget?.chapterLaunchGate
    || null
  return [
    { key: 'task', text: [
      '任务：只生成当前目标章节的完整简体中文小说正文。',
      '正文优先于回执；不得输出分析、任务说明、工程字段或其他章节。',
    ] },
    { key: 'chapter', text: [
      `作品：${project.title}`,
      `章节：第${target.chapter_no}章《${target.title || '无标题'}》`,
      `目标：${target.goal || target.summary}`,
      `冲突：${target.conflict}`,
      `读者回报与章末钩子：${target.ending_hook}`,
      `字数：${JSON.stringify(target.word_target || {})}`,
    ] },
    { key: 'handoff', text: target.previous_handoff ? ['【上一章尾段承接】', String(target.previous_handoff)] : [] },
    { key: 'scene-causality', text: ['【场景卡因果链】', JSON.stringify(target.scene_cards.map(compactProseSceneCard), null, 2)] },
    { key: 'gate', text: ['【开写门禁通过快照】', JSON.stringify({
      preflight: { ready: contract.preflight?.ready, strict_ready: contract.preflight?.strict_ready, failed_checks: preflightChecks },
      director: directorSnapshot,
      chapter_launch_gate: launchGateSnapshot,
    }, null, 2)] },
    { key: 'core-promise', text: buildRequiredCorePromiseSection(context) },
    { key: 'safety-style', text: [
      '不得新增上下文没有授权的事实；真实职业、法律、医疗、技术和地理事实不确定时改成架空或待验证线索。',
      '不得出现 prompt、合同、回执、字段名、读者分析、上一章/本章等写作工程语言。',
      '不得复制参考样章原句、专名或桥段；只迁移抽象节奏和功能。',
    ] },
    { key: 'output', text: [
      '输出 JSON：{"prose_chapters":[{"chapter_no":目标章节号,"title":"章节标题","chapter_text":"完整正文","scene_breakdown":[],"continuity_notes":[]}]}。',
      'prose_chapters 只能有一项；chapter_text 不含 Markdown 标题、解释或附录。',
    ] },
  ]
}

function buildRequiredCorePromiseSection(context: any) {
  const target = context?.chapter_target || {}
  const bible = context?.writing_bible || {}
  return [
    '【不可变核心承诺】',
    JSON.stringify({
      reader_promise: target?.core_contract_radar?.reader_promise || bible?.reader_promise || bible?.promise || '',
      core_conflict: target?.core_contract_radar?.core_conflict || bible?.core_conflict || bible?.mainline?.core_conflict || '',
      mainline_service: target?.chapter_blueprint?.plot_lines?.mainline || target?.mainline_service || target?.summary || '',
      protagonist_agency: target?.chapter_blueprint?.writing_intent || target?.protagonist_agency || '关键结果必须来自主角可见选择和行动',
      style_boundary: target?.style_boundary_contract?.hard_constraints || context?.style_lock || {},
    }, null, 2),
  ]
}

function riskSection(key: string, value: string | string[]): ProseRiskPromptSection {
  const lines = (Array.isArray(value) ? value : [value]).map(item => String(item || '').trim()).filter(Boolean)
  const title = prosePromptText(lines[0] || key, 180)
  const rules = lines.slice(1).map(item => prosePromptText(item, 700)).filter(Boolean)
  return {
    key,
    full: lines,
    compact: [title, ...rules.slice(0, 5)],
    reference: [`${title}：仅执行本章直接相关边界；不得引入合同外事实。`],
  }
}

function buildProseRiskPromptSections(context: any): ProseRiskPromptSection[] {
  const contract = (key: string) => getContextContract(context, `${key}_contract`)
  const target = context?.chapter_target || {}
  return [
    riskSection('platform_rubric', buildPlatformRubricPromptSection(target.platform_rubric)),
    riskSection('content_rubric', buildContentRubricPromptSection(target.content_rubric)),
    riskSection('target_reader', buildTargetReaderPromptSection(contract('target_reader'))),
    riskSection('genre_positioning', buildGenrePositioningPromptSection(contract('genre_positioning'))),
    riskSection('plot_special_topics', buildPlotSpecialTopicsPromptSection(contract('plot_special_topics'))),
    riskSection('female_audience', buildFemaleAudiencePromptSection(contract('female_audience'))),
    riskSection('upgrade_rhythm', buildUpgradeRhythmPromptSection(contract('upgrade_rhythm'))),
    riskSection('conflict_structure', buildConflictStructurePromptSection(contract('conflict_structure'))),
    riskSection('story_loop', buildStoryLoopPromptSection(contract('story_loop'))),
    riskSection('emotional_arc', buildEmotionalArcPromptSection(contract('emotional_arc'))),
    riskSection('chapter_hook', buildChapterHookPromptSection(contract('chapter_hook'))),
    riskSection('paragraph_hook', buildParagraphHookPromptSection(contract('paragraph_hook'))),
    riskSection('suspense', buildSuspensePromptSection(contract('suspense'))),
    riskSection('reversal', buildReversalPromptSection(contract('reversal'))),
    riskSection('showdown', buildShowdownPromptSection(contract('showdown'))),
    riskSection('bridge_unit', buildBridgeUnitPromptSection(contract('bridge_unit'))),
    riskSection('plot_framework', buildPlotFrameworkPromptSection(contract('plot_framework'))),
    riskSection('opening', buildOpeningPromptSection(contract('opening'))),
    riskSection('prose_craft', buildProseCraftPromptSection(contract('prose_craft'))),
    riskSection('punctuation_tone', buildPunctuationTonePromptSection(contract('punctuation_tone'))),
    riskSection('quality_audit', buildQualityAuditPromptSection(contract('quality_audit'))),
    riskSection('dialogue', buildDialoguePromptSection(contract('dialogue'))),
    riskSection('plot_dynamics', buildPlotDynamicsPromptSection(contract('plot_dynamics'))),
    riskSection('story_power', buildStoryPowerPromptSection(contract('story_power'))),
    riskSection('continuity_heat', buildContinuityHeatPromptSection(contract('continuity_heat'))),
    riskSection('character_relation', buildCharacterRelationPromptSection(contract('character_relation'))),
    riskSection('character_behavior', buildCharacterBehaviorPromptSection(contract('character_behavior'))),
    riskSection('asset_linkage', buildAssetLinkagePromptSection(contract('asset_linkage'), context?.relationship_graph?.diagnostics || [])),
    riskSection('state_tracking', buildStateTrackingPromptSection(contract('state_tracking'))),
    riskSection('intent_confirmation', buildIntentConfirmationPromptSection(contract('intent_confirmation'))),
    riskSection('benchmark_recall', buildBenchmarkRecallPromptSection(target.benchmark_recall_brief)),
    riskSection('style_boundary', buildStyleBoundaryPromptSection(contract('style_boundary'))),
    riskSection('information_flow', buildInformationFlowPromptSection(contract('information_flow'))),
    riskSection('expectation_threshold', buildExpectationThresholdPromptSection(contract('expectation_threshold'))),
    riskSection('delivery_risk', buildDeliveryRiskCarryOverPromptSection(target.delivery_risk_carry_over)),
    riskSection('longform_structure', buildLongformCompassPromptSection(target.longform_compass)),
    riskSection('longform_battle', buildLongformBattleContextPromptSection(target.longform_battle_context)),
    riskSection('governance_recheck', buildGovernanceRecheckPromptSection(target.governance_recheck_memory)),
  ].filter(section => section.full.length > 0)
}
```

`riskSection` 从 builder 的完整行生成 `full`，保留前 3-6 条执行规则生成 `compact`，并用标题加一句边界生成 `reference`。其他旧 section 按同一明确 key 补进注册表；未被 director 选择就不进入 prompt。

- [ ] **Step 6: 用编译器替换正文的 `buildBoundedProsePrompt`**

```ts
const compileParagraphProseContext = (
  project: any,
  generationContractOrContext: ProseGenerationContract | any,
  migrationPlan: any = null,
  chapterDraft: any = null,
) => {
  const contract = generationContractOrContext?.version === 'prose_generation_contract_v1'
    ? generationContractOrContext
    : buildProseGenerationContract(attachOhStoryDirectorToContextPackage(generationContractOrContext))
  const requiredSections = buildProseCorePromptSections(project, contract)
  if (migrationPlan?.generation_prompt_addendum) {
    requiredSections.splice(requiredSections.length - 1, 0, {
      key: 'reference-migration-boundary',
      text: prosePromptText(migrationPlan.generation_prompt_addendum, 700),
    })
  }
  return compileProseContractPrompt({
    requiredSections,
    contractSections: buildProseRiskPromptSections(contract.context),
    director: contract.director,
  })
}

const buildParagraphProseContext = (
  project: any,
  generationContractOrContext: ProseGenerationContract | any,
  migrationPlan: any = null,
  chapterDraft: any = null,
) => compileParagraphProseContext(project, generationContractOrContext, migrationPlan, chapterDraft).prompt
```

调用方改成：

```ts
const compiledPrompt = compileParagraphProseContext(project, generationContract, migrationPlan, chapter)
await onStage('draft', { status: 'running', prompt_diagnostics: compiledPrompt.diagnostics })
const draftResult = await generateNovelChapterProseRuntime(project, chapter, {
  worldbuilding,
  characters,
  outline: outlines,
  prevChapters,
  contextPackage,
  migrationPlan,
  paragraphTask: compiledPrompt.prompt,
  promptDiagnostics: compiledPrompt.diagnostics,
  boundedProseContract: true,
  maxTokens: proseMaxTokensForWordTarget(wordTarget),
  abortSignal: options.abortSignal,
  llmTimeoutMs: options.llmTimeoutMs,
} as any, activeWorkspace, ctx.production.getStageModelId(project, 'draft', preferredModelId))
```

`buildParagraphProseContext` 继续返回 `string`，避免破坏现有 prompt 行为测试；service 另行返回 `compileParagraphProseContext` 供统一生成链路读取 `{ prompt, diagnostics }`。把 `GenerationRoutesContext.buildParagraphProseContext` 的错误 `string[]` 标注修正为 `string`；删除旧 route 分支后 route 不再直接编译正文 prompt。

- [ ] **Step 7: 让 executor 尊重已预算正文任务并回传 usage**

`generateNovelChapterProse` 在 `boundedProseContract=true` 时仍保留基础系统指令和最多 4,000 字符 upstream 摘要，但不重复注入完整 worldbuilding/characters/outline；memory 和 knowledge 分别限制为 4,000 字符，避免绕过 section 预算。返回对象增加：

```ts
return {
  ...finalResponse,
  prose_prompt_diagnostics: {
    ...(context as any).promptDiagnostics,
    model_usage: finalResponse?.usage || finalResponse?.raw?.usage || null,
  },
}
```

- [ ] **Step 8: 删除独立 route 的第二套不可达正文编排并停止自动批准场景卡**

```ts
export function buildStandaloneProseServiceOptions(body: any, runtime: {
  modelId?: number
  autoRepairQualityGate: boolean
  onStage: (key: string, payload?: any) => Promise<void>
  abortSignal: AbortSignal
}) {
  return {
    ...(body || {}),
    ...(runtime.modelId ? { model_id: runtime.modelId } : {}),
    auto_repair_quality_gate: runtime.autoRepairQualityGate,
    approvals: body?.approvals || {},
    onStage: runtime.onStage,
    abortSignal: runtime.abortSignal,
  }
}
```

route 只调用这个适配器和 `ctx.generateChapterForGroup`。删除 `if (ctx.generateChapterForGroup)` 之后从 `listNovelChapters` 开始的旧编排分支；将 `generateChapterForGroup` 设为 `GenerationRoutesContext` 必填。已有场景卡直接走服务；新生成/强制重建场景卡由项目 `approvalPolicy` 判断，不注入 `{ approved: true }`。

service 用明确布尔值区分既有卡和本轮新卡：

```ts
let generatedSceneCardsThisRun = false
if (!generationContract.chapter.scene_cards.length || options.force_scene_cards === true) {
  const sceneResult = await runAfterPreSceneGate(() => generateSceneCardsForChapter(activeWorkspace, project, contextPackage, preferredModelId, llmControlOptions))
  if (sceneResult.sceneCards.length > 0) generatedSceneCardsThisRun = true
}
if (
  generatedSceneCardsThisRun
  && ctx.production.approvalRequired(approvalPolicy, 'scene_cards', approvals, { count: generationContract.chapter.scene_cards.length })
) {
  throw ctx.production.buildApprovalError('scene_cards', '新生成的场景卡等待人工确认', { count: generationContract.chapter.scene_cards.length })
}
```

既有卡不触发新的审批；`force_scene_cards=true` 必定按新卡处理。

- [ ] **Step 9: 运行 prompt、route、director 聚焦测试**

Run: `cd ui/server && bun test src/novel-writing/prose-generation-contract.test.ts src/novel-writing/prose-contract-prompt.test.ts src/routes/novel-oh-story-director.test.ts src/routes/novel-generation-routes.test.ts src/novel-writing/prose-generation-prompt-sections.test.ts src/novel-writing/prose-prompt-builders.test.ts`

Expected: PASS; 新测试确认 `prompt.length <= 48000` 且 omitted 合同标记字符串不在 prompt 中。

- [ ] **Step 10: 提交统一服务和 prompt 接线**

```bash
git add ui/server/src/routes/novel-writing-service.ts ui/server/src/routes/novel-writing-service.test.ts ui/server/src/routes/novel-generation-routes.ts ui/server/src/routes/novel-generation-routes.test.ts ui/server/src/llm/executor.ts
git commit -m "fix(novel): enforce prose contract before draft generation"
```

### Task 5: 建立六维质量 finding 和失败关闭决策

**Files:**
- Create: `ui/server/src/novel-writing/prose-quality-loop.ts`
- Create: `ui/server/src/novel-writing/prose-quality-loop.test.ts`
- Modify: `ui/server/src/novel-writing/prose-quality-contracts.ts:101-125`
- Modify: `ui/server/src/novel-writing/prose-quality-contracts.test.ts`

- [ ] **Step 1: 写 finding 限额、证据、硬失败和审批边界测试**

```ts
import { describe, expect, test } from 'bun:test'
import {
  buildProseQualityDecision,
  normalizeProseQualityReview,
  assertProseQualityCanStore,
} from './prose-quality-loop'

test('keeps at most six blocking and four advisory findings', () => {
  const review = normalizeProseQualityReview({
    score: 84,
    findings: [
      ...Array.from({ length: 8 }, (_, index) => ({ key: `b${index}`, severity: 'S2', dimension: 'conflict_causality', evidence: `证据${index}`, required_change: '补行动结果', acceptance_test: '场景状态发生改变' })),
      ...Array.from({ length: 7 }, (_, index) => ({ key: `a${index}`, severity: 'S3', dimension: 'prose_style', evidence: `建议${index}`, required_change: '压缩句子', acceptance_test: '句子自然' })),
    ],
  })

  expect(review.blocking_findings).toHaveLength(6)
  expect(review.advisory_findings).toHaveLength(4)
})

test('does not classify an evidence-free model opinion as a hard finding', () => {
  const review = normalizeProseQualityReview({
    score: 90,
    findings: [{ key: 'vague', severity: 'S1', dimension: 'continuity', evidence: '', required_change: '重写', acceptance_test: '更好' }],
  })
  expect(review.blocking_findings).toHaveLength(0)
  expect(review.advisory_findings[0].severity).toBe('S3')
})

test('never allows generic approval to waive deterministic or S1/S2 hard failures', () => {
  const decision = buildProseQualityDecision({
    review: normalizeProseQualityReview({
      score: 92,
      findings: [{ key: 'agency', severity: 'S2', dimension: 'core_promise_agency', evidence: '江澈全程等待救援。', required_change: '让江澈主动破局', acceptance_test: '关键结果来自主角选择' }],
    }),
    deterministicScan: { hard_failures: [{ key: 'non_chinese_leak', message: '正文出现连续英文段落' }] },
    minScore: 78,
  })

  expect(decision.passed).toBe(false)
  expect(decision.approvable).toBe(false)
  expect(() => assertProseQualityCanStore(decision, { approved: true })).toThrowError(/硬质量门禁/)
})

test('allows approval only for advisory or score-only failure', () => {
  const decision = buildProseQualityDecision({
    review: normalizeProseQualityReview({ score: 76, findings: [] }),
    deterministicScan: { hard_failures: [] },
    minScore: 78,
  })
  expect(decision.approvable).toBe(true)
  expect(assertProseQualityCanStore(decision, { approved: true })).toBe(true)
})
```

- [ ] **Step 2: 运行测试确认质量模块不存在**

Run: `cd ui/server && bun test src/novel-writing/prose-quality-loop.test.ts`

Expected: FAIL with `Cannot find module './prose-quality-loop'`.

- [ ] **Step 3: 实现六维类型、normalizer 和硬失败决策**

```ts
export type ProseQualityDimension =
  | 'continuity'
  | 'core_promise_agency'
  | 'conflict_causality'
  | 'payoff_hook'
  | 'prose_style'
  | 'fact_setting_safety'

export type ProseQualitySeverity = 'S1' | 'S2' | 'S3'

export interface ProseQualityFinding {
  key: string
  severity: ProseQualitySeverity
  dimension: ProseQualityDimension
  evidence: string
  required_change: string
  acceptance_test: string
}

export interface ProseQualityDecision {
  passed: boolean
  approvable: boolean
  score: number
  min_score: number
  hard_failures: Array<{ key: string; message: string; source: 'deterministic' | 'llm' | 'recheck' }>
  advisory_failures: string[]
}

const DIMENSIONS = new Set<ProseQualityDimension>([
  'continuity',
  'core_promise_agency',
  'conflict_causality',
  'payoff_hook',
  'prose_style',
  'fact_setting_safety',
])

function text(value: any, maxChars = 500) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxChars)
}

export function normalizeProseQualityReview(payload: any) {
  const findings = (Array.isArray(payload?.findings) ? payload.findings : [])
    .map((item: any, index: number): ProseQualityFinding => {
      const evidence = text(item?.evidence)
      const requestedSeverity = String(item?.severity || 'S3').toUpperCase()
      const normalizedSeverity: ProseQualitySeverity = requestedSeverity === 'S1' || requestedSeverity === 'S2' ? requestedSeverity : 'S3'
      return {
        key: text(item?.key || `finding_${index + 1}`, 100),
        severity: !evidence && (normalizedSeverity === 'S1' || normalizedSeverity === 'S2') ? 'S3' : normalizedSeverity,
        dimension: DIMENSIONS.has(item?.dimension) ? item.dimension : 'prose_style',
        evidence,
        required_change: text(item?.required_change || item?.requiredChange),
        acceptance_test: text(item?.acceptance_test || item?.acceptanceTest),
      }
    })
    .filter((item: ProseQualityFinding) => item.key && item.required_change && item.acceptance_test)
  return {
    score: Math.max(0, Math.min(100, Number(payload?.score || 0))),
    publishable: payload?.publishable === true,
    dimensions: payload?.dimensions || {},
    blocking_findings: findings.filter(item => item.severity === 'S1' || item.severity === 'S2').slice(0, 6),
    advisory_findings: findings.filter(item => item.severity === 'S3').slice(0, 4),
  }
}

export function buildProseQualityDecision(input: { review: any; deterministicScan: any; minScore: number }): ProseQualityDecision {
  const deterministic = (input.deterministicScan?.hard_failures || []).map((item: any) => ({
    key: text(item?.key, 100),
    message: text(item?.message || item?.evidence || item?.key),
    source: 'deterministic' as const,
  }))
  const llm = (input.review?.blocking_findings || []).map((item: ProseQualityFinding) => ({
    key: item.key,
    message: `${item.dimension}：${item.evidence}；${item.required_change}`,
    source: 'llm' as const,
  }))
  const hardFailures = [...deterministic, ...llm]
  const score = Number(input.review?.score || 0)
  const advisory = [
    ...(score < input.minScore ? [`质检评分 ${score} 低于 ${input.minScore}`] : []),
    ...(input.review?.advisory_findings || []).map((item: ProseQualityFinding) => `${item.key}：${item.required_change}`),
  ]
  return {
    passed: hardFailures.length === 0 && score >= input.minScore,
    approvable: hardFailures.length === 0,
    score,
    min_score: input.minScore,
    hard_failures: hardFailures,
    advisory_failures: advisory,
  }
}

export function assertProseQualityCanStore(decision: ProseQualityDecision, approval: any = {}) {
  if (decision.passed) return true
  if (approval?.approved === true && decision.approvable) return true
  const code = decision.hard_failures.some(item => item.key === 'quality_recheck_unavailable')
    ? 'PROSE_QUALITY_RECHECK_UNAVAILABLE'
    : 'PROSE_QUALITY_GATE_BLOCKED'
  throw Object.assign(new Error(decision.approvable ? '章节质量评分未获批准，正文未入库' : '章节硬质量门禁未通过，正文未入库'), {
    code,
    qualityDecision: decision,
  })
}
```

- [ ] **Step 4: 扩充 `selectUsableRevisionText` 的结构检查**

新增第三个 options 参数并保持旧调用兼容：

```ts
export function selectUsableRevisionText(currentText: string, revisionLike: any = {}, options: {
  chapterNo?: number
  blockingFindings?: any[]
} = {}) {
  const current = String(currentText || '')
  const rawCandidate = String(revisionLike?.final_text || revisionLike?.finalText || '')
  const stripped = stripProseEngineeringAppendix(rawCandidate)
  const candidate = stripped.text
  if (!candidate.trim()) return { text: current, accepted: false, reason: '' }
  if (stripped.changed && stripped.removed_line_count > 0) return { text: current, accepted: false, reason: '修订稿包含写作工程附录' }
  if (looksLikeNonChineseProse(candidate)) return { text: current, accepted: false, reason: '修订稿包含连续非中文正文' }
  if (looksTruncated(candidate)) return { text: current, accepted: false, reason: '修订稿疑似截断' }
  if (options.chapterNo && containsWrongChapterBoundary(candidate, options.chapterNo)) return { text: current, accepted: false, reason: '修订稿混入其他章节或标题边界' }
  const unchangedEvidence = (options.blockingFindings || []).filter(item => item?.evidence && current.includes(item.evidence) && candidate.includes(item.evidence))
  if (unchangedEvidence.length === (options.blockingFindings || []).length && unchangedEvidence.length > 0) {
    return { text: current, accepted: false, reason: '修订稿没有改变任何 blocking finding 证据' }
  }
  return selectRevisionByLength(current, candidate)
}
```

`looksLikeNonChineseProse` 使用连续 24 个拉丁字母词和非中文占比阈值；`looksTruncated` 检查未闭合 JSON/Markdown 围栏、末尾反斜杠、明显半句和小于当前稿 65%；标题边界只拦截非目标章节标记，不拦截故事内自然数字。

- [ ] **Step 5: 运行质量决策和修订选择测试**

Run: `cd ui/server && bun test src/novel-writing/prose-quality-loop.test.ts src/novel-writing/prose-quality-contracts.test.ts`

Expected: PASS.

- [ ] **Step 6: 提交质量决策基础**

```bash
git add ui/server/src/novel-writing/prose-quality-loop.ts ui/server/src/novel-writing/prose-quality-loop.test.ts ui/server/src/novel-writing/prose-quality-contracts.ts ui/server/src/novel-writing/prose-quality-contracts.test.ts
git commit -m "feat(novel): add fail-closed prose quality decisions"
```

### Task 6: 实现最多两轮定向修订和每轮独立复检

**Files:**
- Modify: `ui/server/src/novel-writing/prose-quality-loop.ts`
- Modify: `ui/server/src/novel-writing/prose-quality-loop.test.ts`

- [ ] **Step 1: 写 fresh scan/recheck、两轮上限和复检异常测试**

```ts
import { runProseQualityLoop } from './prose-quality-loop'

const sixDimensionScores = {
  continuity: 7,
  core_promise_agency: 7,
  conflict_causality: 7,
  payoff_hook: 7,
  prose_style: 7,
  fact_setting_safety: 8,
}

test('runs a fresh deterministic scan and independent review after revision', async () => {
  const scans: string[] = []
  const reviews: string[] = []
  const result = await runProseQualityLoop({
    initialText: '初稿：江澈站着等。'.repeat(80),
    minScore: 78,
    scan: text => {
      scans.push(text)
      return { hard_failures: text.startsWith('初稿') ? [{ key: 'agency', message: '主角没有行动' }] : [] }
    },
    review: async ({ text }) => {
      reviews.push(text)
      return text.startsWith('初稿')
        ? { score: 70, dimensions: sixDimensionScores, findings: [{ key: 'agency', severity: 'S2', dimension: 'core_promise_agency', evidence: '江澈站着等。', required_change: '让江澈主动破围', acceptance_test: '包围因主角动作改变' }] }
        : { score: 86, dimensions: { ...sixDimensionScores, core_promise_agency: 9, payoff_hook: 9 }, publishable: true, findings: [] }
    },
    revise: async () => ({ final_text: '修订：江澈踏碎路面，借飞石逼退第一排追兵。'.repeat(80) }),
  })

  expect(scans).toHaveLength(2)
  expect(reviews).toHaveLength(2)
  expect(reviews[1]).toBe(result.final_text)
  expect(result.decision.passed).toBe(true)
  expect(result.rounds).toHaveLength(1)
})

test('stops after two failed revision rounds', async () => {
  let revisionCalls = 0
  const result = await runProseQualityLoop({
    initialText: '主角等待。'.repeat(120),
    minScore: 78,
    scan: () => ({ hard_failures: [] }),
    review: async () => ({ score: 70, dimensions: sixDimensionScores, findings: [{ key: 'agency', severity: 'S2', dimension: 'core_promise_agency', evidence: '主角等待。', required_change: '主动行动', acceptance_test: '主角改变结果' }] }),
    revise: async ({ round }) => {
      revisionCalls += 1
      return { final_text: `第${round}轮修订：主角仍在等待。`.repeat(120) }
    },
  })

  expect(revisionCalls).toBe(2)
  expect(result.rounds).toHaveLength(2)
  expect(result.decision.passed).toBe(false)
})

test('fails closed when an independent recheck is unavailable', async () => {
  let reviewCalls = 0
  await expect(runProseQualityLoop({
    initialText: '初稿问题。'.repeat(120),
    minScore: 78,
    scan: () => ({ hard_failures: [] }),
    review: async () => {
      reviewCalls += 1
      if (reviewCalls > 1) throw new Error('timeout')
      return { score: 70, dimensions: sixDimensionScores, findings: [{ key: 'hook', severity: 'S2', dimension: 'payoff_hook', evidence: '初稿问题。', required_change: '补章末新问题', acceptance_test: '末段形成明确翻页理由' }] }
    },
    revise: async () => ({ final_text: '修订正文带来新的追捕令。'.repeat(120) }),
  })).rejects.toMatchObject({ code: 'PROSE_QUALITY_RECHECK_UNAVAILABLE' })
})
```

- [ ] **Step 2: 运行测试确认循环尚未实现**

Run: `cd ui/server && bun test src/novel-writing/prose-quality-loop.test.ts`

Expected: FAIL because `runProseQualityLoop` is not exported.

- [ ] **Step 3: 实现聚焦六维审查 prompt**

```ts
export function buildFocusedProseReviewPrompt(input: {
  coreContract: any
  chapterText: string
  deterministicScan: any
}) {
  return [
    '任务：独立审查小说正文，只判断正文证据，不评价回执是否齐全。',
    '六维：continuity；core_promise_agency；conflict_causality；payoff_hook；prose_style；fact_setting_safety。',
    'S1/S2 必须引用正文中的可定位短句；没有证据只能给 S3 advisory。',
    '最多 6 个 blocking findings、4 个 advisory findings。分数不能覆盖硬失败。',
    `不可变核心合同：${JSON.stringify(input.coreContract, null, 2)}`,
    `确定性扫描：${JSON.stringify(input.deterministicScan, null, 2)}`,
    `正文：\n${input.chapterText}`,
    '只输出 JSON：{"score":0,"publishable":false,"dimensions":{"continuity":0,"core_promise_agency":0,"conflict_causality":0,"payoff_hook":0,"prose_style":0,"fact_setting_safety":0},"findings":[{"key":"","severity":"S1|S2|S3","dimension":"","evidence":"正文短句","required_change":"可执行改法","acceptance_test":"复检条件"}]}',
  ].join('\n')
}
```

- [ ] **Step 4: 实现只携带核心合同、全文和 blocking findings 的修订 prompt**

```ts
export function buildFocusedProseRevisionPrompt(input: {
  coreContract: any
  chapterText: string
  blockingFindings: ProseQualityFinding[]
  round: number
}) {
  return [
    `任务：执行第 ${input.round} 轮正文定向修订，返回完整章节正文。`,
    '只修复列出的 blocking findings；保留已经通过的维度、既有事实、角色状态、场景顺序和章末承诺。',
    '不得输出审查说明、工程附录、Markdown 标题或下一章。',
    `不可变核心合同：${JSON.stringify(input.coreContract, null, 2)}`,
    `blocking findings：${JSON.stringify(input.blockingFindings.slice(0, 6), null, 2)}`,
    `当前完整正文：\n${input.chapterText}`,
    '只输出 JSON：{"chapter_text":"完整修订正文","revision_receipts":[{"key":"finding key","changed_evidence":"修后正文短句"}]}',
  ].join('\n')
}
```

- [ ] **Step 5: 验证每次 review 都含六维结构化结果**

```ts
export function isUsableProseQualityReviewPayload(value: any) {
  if (!value || typeof value !== 'object' || !Number.isFinite(Number(value.score))) return false
  const dimensions = value.dimensions
  return Boolean(dimensions && typeof dimensions === 'object' && [
    'continuity',
    'core_promise_agency',
    'conflict_causality',
    'payoff_hook',
    'prose_style',
    'fact_setting_safety',
  ].every(key => Number.isFinite(Number(dimensions[key]))))
}

function deterministicFindings(scan: any): ProseQualityFinding[] {
  return (scan?.hard_failures || []).slice(0, 6).map((item: any, index: number) => ({
    key: text(item?.key || `deterministic_${index + 1}`, 100),
    severity: 'S1',
    dimension: /fact|setting|language/i.test(String(item?.key || '')) ? 'fact_setting_safety' : 'prose_style',
    evidence: text(item?.evidence || item?.message || item?.key),
    required_change: text(item?.required_change || item?.fix || item?.message || '修复确定性硬失败'),
    acceptance_test: `重新运行确定性扫描后不再出现 ${text(item?.key, 100)}`,
  }))
}
```

初审返回空对象、缺 score 或缺任一维度时抛 `PROSE_REVIEW_FAILED`；修订后的任何一轮出现同样问题时抛 `PROSE_QUALITY_RECHECK_UNAVAILABLE`。空结构结果不能退化成 score 0 的可审批失败。

- [ ] **Step 6: 实现两轮循环和 recheck error**

```ts
export async function runProseQualityLoop(input: {
  initialText: string
  minScore: number
  coreContract?: any
  maxRevisionRounds?: number
  scan: (text: string) => any | Promise<any>
  review: (input: { text: string; scan: any; round: number; prompt: string }) => Promise<any>
  revise: (input: { text: string; review: any; round: number; prompt: string }) => Promise<any>
}) {
  const maxRounds = Math.min(2, Math.max(0, input.maxRevisionRounds ?? 2))
  const rounds: any[] = []
  let finalText = String(input.initialText || '')
  let scan = await input.scan(finalText)
  const initialPayload = await input.review({
    text: finalText,
    scan,
    round: 0,
    prompt: buildFocusedProseReviewPrompt({ coreContract: input.coreContract, chapterText: finalText, deterministicScan: scan }),
  })
  if (!isUsableProseQualityReviewPayload(initialPayload)) {
    throw Object.assign(new Error('正文初审没有返回完整六维结果'), { code: 'PROSE_REVIEW_FAILED' })
  }
  let review = normalizeProseQualityReview(initialPayload)
  let decision = buildProseQualityDecision({ review, deterministicScan: scan, minScore: input.minScore })

  for (let round = 1; !decision.passed && round <= maxRounds; round += 1) {
    const blockingFindings = [...deterministicFindings(scan), ...review.blocking_findings].slice(0, 6)
    if (blockingFindings.length === 0) break
    const revision = await input.revise({
      text: finalText,
      review,
      round,
      prompt: buildFocusedProseRevisionPrompt({ coreContract: input.coreContract, chapterText: finalText, blockingFindings, round }),
    })
    const selection = selectUsableRevisionText(finalText, revision, {
      chapterNo: Number(input.coreContract?.chapter_no || 0),
      blockingFindings,
    })
    rounds.push({ round, revision, selection })
    if (!selection.accepted) continue
    finalText = selection.text
    scan = await input.scan(finalText)
    try {
      const recheckPayload = await input.review({
        text: finalText,
        scan,
        round,
        prompt: buildFocusedProseReviewPrompt({ coreContract: input.coreContract, chapterText: finalText, deterministicScan: scan }),
      })
      if (!isUsableProseQualityReviewPayload(recheckPayload)) throw new Error('missing six-dimension review payload')
      review = normalizeProseQualityReview(recheckPayload)
    } catch (error) {
      throw Object.assign(new Error(`正文第 ${round} 轮修订后的独立复检不可用`), {
        code: 'PROSE_QUALITY_RECHECK_UNAVAILABLE',
        cause: error,
        candidate_chars: finalText.replace(/\s+/g, '').length,
        rounds,
      })
    }
    decision = buildProseQualityDecision({ review, deterministicScan: scan, minScore: input.minScore })
  }
  return { final_text: finalText, final_scan: scan, final_review: review, decision, rounds }
}
```

- [ ] **Step 7: 补充空结构复检的失败测试**

```ts
test('treats an empty structured recheck as unavailable', async () => {
  let reviewCalls = 0
  await expect(runProseQualityLoop({
    initialText: '初稿问题。'.repeat(120),
    minScore: 78,
    scan: () => ({ hard_failures: [] }),
    review: async () => {
      reviewCalls += 1
      return reviewCalls === 1
        ? {
            score: 70,
            dimensions: { continuity: 7, core_promise_agency: 6, conflict_causality: 7, payoff_hook: 6, prose_style: 7, fact_setting_safety: 8 },
            findings: [{ key: 'hook', severity: 'S2', dimension: 'payoff_hook', evidence: '初稿问题。', required_change: '补章末问题', acceptance_test: '末段形成翻页理由' }],
          }
        : {}
    },
    revise: async () => ({ final_text: '修订正文带来新的追捕令。'.repeat(120) }),
  })).rejects.toMatchObject({ code: 'PROSE_QUALITY_RECHECK_UNAVAILABLE' })
})
```

- [ ] **Step 8: 运行质量循环测试**

Run: `cd ui/server && bun test src/novel-writing/prose-quality-loop.test.ts src/novel-writing/prose-quality-contracts.test.ts`

Expected: PASS; scan/review 调用次数分别为初稿一次加每个被接受修订一次，revision 调用不超过 2。

- [ ] **Step 9: 提交两轮闭环**

```bash
git add ui/server/src/novel-writing/prose-quality-loop.ts ui/server/src/novel-writing/prose-quality-loop.test.ts
git commit -m "feat(novel): add bounded prose revision and recheck loop"
```

### Task 7: 用新质量循环替换 legacy fallback，并保护入库与故事状态

**Files:**
- Modify: `ui/server/src/routes/novel-writing-service.ts:2354-2420,42015-42340,42420-42880,44954-45410,46094-46165`
- Modify: `ui/server/src/routes/novel-writing-service.test.ts:54477-54569,54884-54896`
- Modify: `ui/server/src/routes/novel-route-utils.ts:684-704`

- [ ] **Step 1: 写服务适配层的两轮失败、复检异常和存储回调测试**

将质量执行器注入 `createNovelWritingService`：

```ts
type NovelWritingRuntime = {
  generateChapterProse?: typeof generateNovelChapterProse
  executeAgent?: typeof executeNovelAgent
  buildChapterContext?: (input: {
    workspace: string
    project: any
    chapter: any
    chapters: any[]
    worldbuilding: any[]
    characters: any[]
    outlines: any[]
    reviews: any[]
  }) => Promise<any>
  hooks?: {
    beforeChapterStore?: (input: { chapterId: number; finalText: string }) => void
    beforeStoryState?: (input: { chapterId: number; finalText: string }) => void
  }
}
```

测试使用真实临时 SQLite store 和 fake runtime。核心断言如下：

```ts
const qualityScores = {
  continuity: 7,
  core_promise_agency: 6,
  conflict_causality: 7,
  payoff_hook: 6,
  prose_style: 7,
  fact_setting_safety: 8,
}

test('blocks a request launch gate before any scene-card, draft, review, or revision model call', async () => {
  const harness = await createProsePipelineHarness({ draftText: '不会被调用' })
  await expect(harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
    model_id: 217,
    allow_incomplete: true,
    chapter_launch_gate: { status: 'blocked', summary: '第九章合围承接项缺失' },
  })).rejects.toMatchObject({ code: 'PROSE_LAUNCH_GATE_BLOCKED' })

  expect(harness.modelCalls).toEqual({ scene_cards: 0, draft: 0, review: 0, revision: 0 })
})

test('rebuilds after material repair and still blocks strict preflight before model invocation', async () => {
  const harness = await createProsePipelineHarness({
    contextSequence: [
      { preflight: { ready: false, strict_ready: false, checks: [], blockers: ['材料缺失'], warnings: [] } },
      { preflight: { ready: true, strict_ready: false, checks: [{ key: 'continuity', ok: false, severity: 'medium', label: '连续性材料' }], blockers: [], warnings: ['连续性材料不足'] } },
    ],
  })
  await expect(harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
    model_id: 217,
    auto_repair_missing_material: true,
  })).rejects.toMatchObject({ code: 'PROSE_STRICT_PREFLIGHT_BLOCKED' })
  expect(harness.modelCalls.draft).toBe(0)
  expect(harness.modelCalls.review).toBe(0)
})

test('does not store chapter text or story state after two failed revisions', async () => {
  const harness = await createProsePipelineHarness({
    draftText: '江澈站在包围圈里等待。'.repeat(180),
    reviewPayloads: Array.from({ length: 3 }, () => ({
      score: 72,
      dimensions: qualityScores,
      findings: [{ key: 'agency', severity: 'S2', dimension: 'core_promise_agency', evidence: '江澈站在包围圈里等待。', required_change: '让江澈主动破围', acceptance_test: '追捕阵型因主角动作改变' }],
    })),
    revisionTexts: [
      '第一轮仍然等待。'.repeat(220),
      '第二轮仍然等待。'.repeat(220),
    ],
  })

  await expect(harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
    model_id: 217,
    auto_repair_quality_gate: true,
  })).rejects.toMatchObject({ code: 'PROSE_QUALITY_GATE_BLOCKED' })

  const stored = (await listNovelChapters(harness.workspace, harness.project.id)).find(item => item.id === harness.chapter.id)
  expect(stored?.chapter_text || '').toBe('')
  expect(harness.storyStateCalls).toBe(0)
  expect(harness.revisionCalls).toBe(2)
})

test('keeps recheck exceptions failed and ignores a hard-gate approval', async () => {
  const harness = await createProsePipelineHarness({
    draftText: '初稿问题。'.repeat(220),
    reviewPayloads: [{ score: 70, dimensions: qualityScores, findings: [{ key: 'hook', severity: 'S2', dimension: 'payoff_hook', evidence: '初稿问题。', required_change: '补章末问题', acceptance_test: '末段形成翻页理由' }] }],
    revisionTexts: ['修订正文。'.repeat(240)],
    recheckError: new Error('review timeout'),
  })

  await expect(harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
    model_id: 217,
    auto_repair_quality_gate: true,
    approvals: { quality_gate: { approved: true } },
  })).rejects.toMatchObject({ code: 'PROSE_QUALITY_RECHECK_UNAVAILABLE' })
  expect(harness.storeCalls).toBe(0)
  expect(harness.storyStateCalls).toBe(0)
})

test('stores one coherent final text, version, director, receipts, and story state after a passing recheck', async () => {
  const finalText = '江澈踏碎路面，借飞石逼退第一排追兵。'.repeat(220)
  const harness = await createProsePipelineHarness({
    draftText: '江澈站在包围圈里等待。'.repeat(180),
    reviewPayloads: [
      { score: 72, dimensions: qualityScores, findings: [{ key: 'agency', severity: 'S2', dimension: 'core_promise_agency', evidence: '江澈站在包围圈里等待。', required_change: '让江澈主动破围', acceptance_test: '追捕阵型因主角动作改变' }] },
      { score: 88, dimensions: { ...qualityScores, core_promise_agency: 9, payoff_hook: 9 }, publishable: true, findings: [] },
    ],
    revisionTexts: [finalText],
  })

  const result = await harness.service.generateChapterForGroup(harness.workspace, harness.project.id, harness.chapter.id, {
    model_id: 217,
    auto_repair_quality_gate: true,
  })
  const stored = (await listNovelChapters(harness.workspace, harness.project.id)).find(item => item.id === harness.chapter.id)
  const versions = await listChapterVersions(harness.workspace, harness.chapter.id)

  expect(stored?.chapter_text).toBe(finalText)
  expect(Number(stored?.version || 0)).toBeGreaterThanOrEqual(Number(harness.chapter.version || 0))
  expect(versions[0]?.source).toBe('repair')
  expect(stored?.raw_payload?.oh_story_director).toEqual(result.post_draft_director)
  expect(stored?.raw_payload?.oh_story_delivery_receipts).toEqual(result.oh_story_delivery_receipts)
  expect(harness.storyStateTexts).toEqual([finalText])
})
```

`createProsePipelineHarness` 创建含 worldbuilding、主角、前章正文、目标章既有场景卡的临时项目；fake `buildChapterContext` 可按 `contextSequence` 返回修复前后上下文；fake `executeAgent` 根据 prompt 是六维审查还是定向修订返回队列数据；fake reference safety 始终通过；runtime hooks 记录最终章节写入和故事状态调用。

- [ ] **Step 2: 运行测试确认旧 fallback/approval 路径仍会放行**

Run: `cd ui/server && bun test src/routes/novel-writing-service.test.ts -t "does not store chapter text|keeps recheck exceptions failed"`

Expected: FAIL; 旧实现会调用 `buildAcceptedQualityRepairFallbackReview` 或允许 `approvals.quality_gate.approved` 覆盖 hard failure。

- [ ] **Step 3: 给 service 注入可测试的模型 runtime**

```ts
export function createNovelWritingService(ctx: {
  getProject: (workspace: string, id: number) => Promise<any>
  production: NovelProductionService
  reference: NovelReferenceService
  runtime?: NovelWritingRuntime
}) {
  const executeAgent = ctx.runtime?.executeAgent || executeNovelAgent
  const generateChapterProseRuntime = ctx.runtime?.generateChapterProse || generateNovelChapterProse
```

`generateChapterForGroup` 读取上下文时优先调用 `ctx.runtime?.buildChapterContext`，否则调用现有 `buildChapterContextPackage`；最终 `updateNovelChapter` 和 `updateStoryStateMachine` 前分别触发可选 hook。只替换 service 内 agent/draft/测试 hook，不改变 production/reference 公共接口。测试 fake 不触碰 provider 配置。

```ts
const buildGenerationContext = async () => ctx.runtime?.buildChapterContext
  ? ctx.runtime.buildChapterContext({ workspace: activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews })
  : buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)

ctx.runtime?.hooks?.beforeChapterStore?.({ chapterId: chapter.id, finalText })
const storagePatch = buildChapterProseStoragePatch({
  chapter,
  generatedTitlePatch,
  finalText,
  finalContinuityNotes,
  finalSceneBreakdown,
  ohStoryDeliveryReceipts,
  postDraftDirector,
})
const storageOptions = { versionSource: resolveChapterProseVersionSource({ revisionEligible: true, selfCheck, editorRewrite }) }
const updated = await updateNovelChapter(activeWorkspace, chapter.id, storagePatch, storageOptions)

ctx.runtime?.hooks?.beforeStoryState?.({ chapterId: chapter.id, finalText })
const reviewContext = buildProseReviewContextPackage(contextPackage, finalSceneBreakdown, wordTargetExpansionPatches)
const storyStateUpdate = await updateStoryStateMachine(activeWorkspace, project, updated || chapter, reviewContext, finalText, preferredModelId, llmControlOptions)
```

- [ ] **Step 4: 用现有确定性扫描器构建统一 scan callback**

```ts
const scanProseForQualityLoop = (text: string, contextPackage: any, wordTarget: any) => {
  const cleanup = buildDeterministicProseCleanupReport(contextPackage?.chapter_target || {}, text)
  const word = evaluateProseWordTarget(text, wordTarget)
  const cleanupHardTypes = new Set(['model_degeneration', 'prose_meta', 'prose_format'])
  const cleanupHardFailures = (cleanup.categories || [])
    .filter((category: any) => category?.has_blocking === true || cleanupHardTypes.has(String(category?.type || '')))
    .map((category: any) => ({
      key: `deterministic_${category.type}`,
      message: `${category.label}：${(category.evidence || []).join('；')}`,
      status: 'fail',
      severity: 'blocking',
    }))
  const hardFailures = [
    ...scanProseLanguageRisks(text),
    ...scanProseMetaLeaks(text),
    ...scanModelDegenerationRisks(text),
    ...scanProseFormatRisks(text),
    ...scanBannedWordLeaks(text),
    ...cleanupHardFailures,
    ...(!word.passed ? [{ key: 'word_target', message: `正文 ${word.actual} 字，不在 ${word.min}-${word.max} 字范围` }] : []),
  ]
    .filter((item: any) => item?.status === 'fail' || item?.severity === 'critical' || item?.severity === 'high' || item?.blocking === true || item?.key === 'word_target')
    .map((item: any) => ({ key: item?.key || 'deterministic_prose', message: item?.evidence || item?.message || item?.fix || item?.key }))
  return { hard_failures: hardFailures, cleanup, word_target: word }
}
```

明确把非中文、工程元信息、模型退化、截断、确定性格式硬失败和字数范围放进 `hard_failures`；风格建议保留在 diagnostics，不因单一启发式低风险项阻断。

- [ ] **Step 5: 在 editor/meme/字数调整完成后运行唯一权威质量循环**

```ts
const qualityLoop = await runProseQualityLoop({
  initialText: finalText,
  minScore: qualityThreshold,
  coreContract: buildFocusedQualityCoreContract(generationContract),
  maxRevisionRounds: 2,
  scan: text => scanProseForQualityLoop(text, contextPackage, wordTarget),
  review: async ({ prompt, round }) => {
    const result = await executeAgent('review-agent', project, { task: prompt }, {
      activeWorkspace,
      modelId: String(ctx.production.getStageModelId(project, 'review', preferredModelId) || ''),
      maxTokens: 2600,
      temperature: 0.15,
      skipMemory: true,
      signal: options.abortSignal,
      timeoutMs: qualityRepairTimeoutMs,
    })
    if ((result as any)?.error) throw Object.assign(new Error(String((result as any).error)), { code: round > 0 ? 'PROSE_QUALITY_RECHECK_UNAVAILABLE' : 'PROSE_REVIEW_FAILED' })
    return getNovelPayload(result)
  },
  revise: async ({ prompt }) => {
    const result = await executeAgent('prose-agent', project, { task: prompt }, {
      activeWorkspace,
      modelId: String(ctx.production.getStageModelId(project, 'review', preferredModelId) || ''),
      maxTokens: proseMaxTokensForWordTarget(wordTarget),
      temperature: 0.25,
      skipMemory: true,
      signal: options.abortSignal,
      timeoutMs: qualityRepairTimeoutMs,
    })
    const payload = getNovelPayload(result)
    return { ...payload, final_text: payload?.chapter_text || payload?.final_text || extractPlainProseFallback(result, 800) }
  },
})
finalText = qualityLoop.final_text
selfCheck = buildLegacyCompatibleSelfCheck(qualityLoop)
```

兼容视图只服务现有 review record/sync report，不重新决定门禁：

```ts
function buildLegacyCompatibleSelfCheck(qualityLoop: any) {
  const acceptedRound = [...qualityLoop.rounds].reverse().find((item: any) => item?.selection?.accepted)
  return {
    final_text: qualityLoop.final_text,
    revised: Boolean(acceptedRound),
    revision: acceptedRound?.revision || null,
    review: {
      score: qualityLoop.final_review.score,
      needs_revision: !qualityLoop.decision.passed,
      revised: Boolean(acceptedRound),
      issues: qualityLoop.decision.hard_failures.map((item: any) => ({
        severity: 'critical',
        category: 'prose',
        issue: item.message,
        evidence: [item.message],
        fix: '按六维 finding 和确定性复检结果修订正文',
      })),
      prose_quality_v2: {
        review: qualityLoop.final_review,
        deterministic_scan: qualityLoop.final_scan,
        decision: qualityLoop.decision,
      },
    },
  }
}
```

把每个已接受 round 的 `revision_receipts` 合并回最终回执，但不相信 receipt 自述作为门禁证据：

```ts
ohStoryDeliveryReceipts = {
  ...(ohStoryDeliveryReceipts || {}),
  revision_receipts: [
    ...asArray(ohStoryDeliveryReceipts?.revision_receipts),
    ...qualityLoop.rounds
      .filter((item: any) => item?.selection?.accepted)
      .flatMap((item: any) => asArray(item?.revision?.revision_receipts || item?.revision?.revisionReceipts)),
  ],
}
```

删除初审失败后的 `runProseRevisionFromExistingReview`/`qualityRecheck` fallback 分支，以及会额外触发第三次质量修订的 cleanup repair 分支。legacy sync report 可以读取 `selfCheck` 兼容视图，但不再参与权威 gate。

- [ ] **Step 6: 删除接受型复检 fallback**

完整删除 `buildAcceptedQualityRepairFallbackReview`。任何 revision 后 review 超时、解析失败或空结构结果都抛 `PROSE_QUALITY_RECHECK_UNAVAILABLE`；不得生成 `passed=true`、`score=threshold` 或 `revised=true` 的替代 review。

- [ ] **Step 7: 在参考安全前后都断言新质量决定**

```ts
assertProseQualityCanStore(qualityLoop.decision, approvals?.quality_gate)
const referenceReport = await ctx.reference.buildReferenceUsageReport(activeWorkspace, project, '正文创作', finalText)
const safetyDecision = ctx.reference.getReferenceSafetyDecision(project, referenceReport)
if (safetyDecision.blocked) {
  throw Object.assign(new Error('仿写安全阈值未通过'), { code: 'REFERENCE_SAFETY_BLOCKED', referenceReport, safetyDecision })
}
assertProseQualityCanStore(qualityLoop.decision, approvals?.quality_gate)
```

只有这两次断言之后才调用 `updateNovelChapter`，故事状态更新仍严格位于章节写入成功之后。失败 run 只记录裁剪后的 `qualityLoop.decision`、round 摘要和 prompt diagnostics，不持久化完整候选正文。

- [ ] **Step 8: 更新 generic quality utility 的 v2 兼容分支**

```ts
export function getQualityGateDecision(project: any, review: any, safetyDecision: any = null) {
  if (review?.prose_quality_v2?.decision) {
    const decision = review.prose_quality_v2.decision
    const safetyReasons = safetyDecision?.blocked ? [`仿写安全未通过：${(safetyDecision.reasons || []).join('；')}`] : []
    return {
      ...decision,
      passed: decision.passed && safetyReasons.length === 0,
      reasons: [...decision.hard_failures.map((item: any) => item.message), ...decision.advisory_failures, ...safetyReasons],
    }
  }
  return getLegacyQualityGateDecision(project, review, safetyDecision)
}
```

其他非正文流程仍走 legacy 分支；正文 v2 不再因为缺 `next_chapter_quality_plan` 或回执数组而虚假失败。

- [ ] **Step 9: 将 prompt、质量轮次和 usage 诊断写进 run output**

服务成功返回增加：

```ts
prompt_diagnostics: {
  ...compiledPrompt.diagnostics,
  model_usage: draftResult?.usage || draftResult?.raw?.usage || null,
},
quality_loop: {
  rounds: qualityLoop.rounds.map(item => ({ round: item.round, accepted: item.selection.accepted, reason: item.selection.reason })),
  decision: qualityLoop.decision,
},
post_draft_director: postDraftDirector,
oh_story_delivery_receipts: ohStoryDeliveryReceipts,
```

失败 error 增加相同裁剪字段；不得写完整 prompt、API key 或失败候选全文。

- [ ] **Step 10: 运行服务行为测试和相关质量测试**

Run: `cd ui/server && bun test src/routes/novel-writing-service.test.ts src/novel-writing/prose-quality-loop.test.ts src/novel-writing/deterministic-prose-cleanup.test.ts src/novel-writing/chapter-prose-storage-patch.test.ts`

Expected: PASS; 原“复检超时仍接受”测试已改为期望 `PROSE_QUALITY_RECHECK_UNAVAILABLE`，两轮失败测试确认正文/故事状态均未写入。

- [ ] **Step 11: 提交质量闭环接线**

```bash
git add ui/server/src/routes/novel-writing-service.ts ui/server/src/routes/novel-writing-service.test.ts ui/server/src/routes/novel-route-utils.ts
git commit -m "fix(novel): fail closed after prose quality recheck"
```

### Task 8: 完成回归测试、构建和源码约束清理

**Files:**
- Modify: `ui/server/src/routes/novel-writing-service.test.ts`
- Modify: `ui/server/src/routes/novel-generation-routes.test.ts`
- Modify: `ui/server/src/novel-writing/prose-generation-prompt-sections.test.ts`
- Modify: `ui/server/src/novel-writing/prose-prompt-builders.test.ts`

- [ ] **Step 1: 搜索并移除与新合同冲突的源码字符串测试**

Run: `rg -n "buildAcceptedQualityRepairFallbackReview|keeps accepted quality repair|approved: true|buildBoundedProsePrompt|180000|runProseSelfReviewAndRevision" ui/server/src/routes/novel-writing-service.test.ts ui/server/src/routes/novel-generation-routes.test.ts ui/server/src/novel-writing/*.test.ts`

Expected: 只剩需要改写的 legacy 断言；逐项换成 Task 1-7 的行为测试或删除已经由行为测试覆盖的重复源码扫描。

- [ ] **Step 2: 运行恢复链路聚焦套件**

Run: `cd ui/server && bun test src/novel-writing/prose-generation-contract.test.ts src/novel-writing/prose-contract-prompt.test.ts src/novel-writing/prose-quality-loop.test.ts src/novel-writing/prose-quality-contracts.test.ts src/novel-writing/deterministic-prose-cleanup.test.ts src/routes/novel-oh-story-director.test.ts src/routes/novel-generation-routes.test.ts src/routes/novel-writing-service.test.ts`

Expected: PASS with zero failed tests.

- [ ] **Step 3: 运行完整小说 server 回归**

Run: `bun run test:novel-server`

Expected: PASS with zero failed tests; scene cards、字数、参考安全、SSE heartbeat、版本和故事状态现有测试保持通过。

- [ ] **Step 4: 运行 server build 和边界检查**

Run: `bun run check:refactor-boundaries && bun run build:server`

Expected: both commands exit 0; Bun build produces `/private/tmp/mangaforge-server-check.js`.

- [ ] **Step 5: 检查 prompt 的真实项目静态诊断**

增加一个只读测试，加载临时上下文中 30 个合同并由 director 选择 4 个，断言：

```ts
expect(compiled.diagnostics.selected_contract_keys.length).toBeLessThanOrEqual(4)
expect(compiled.diagnostics.prompt_chars).toBeLessThanOrEqual(48_000)
expect(compiled.prompt).toContain('【上一章尾段承接】')
expect(compiled.prompt).toContain('【场景卡因果链】')
expect(compiled.prompt).not.toContain('UNSELECTED_CONTRACT_SENTINEL')
```

Run: `cd ui/server && bun test src/novel-writing/prose-contract-prompt.test.ts -t "realistic contract set"`

Expected: PASS.

- [ ] **Step 6: 确认用户 provider 配置没有被改写或 staged**

Run: `git status --short && git diff -- workspace/providers.json`

Expected: `workspace/providers.json` 仍只显示用户把 Gemini base URL 改为 `http://localhost:7860/v1` 的现有修改；它不在 staged changes 中。

- [ ] **Step 7: 提交回归测试清理**

```bash
git add ui/server/src/routes/novel-writing-service.test.ts ui/server/src/routes/novel-generation-routes.test.ts ui/server/src/novel-writing/prose-generation-prompt-sections.test.ts ui/server/src/novel-writing/prose-prompt-builders.test.ts
git commit -m "test(novel): cover prose quality chain behavior"
```

### Task 9: 建立可复现的真实模型第 10 章验收器

**Files:**
- Create: `scripts/validate-novel-prose-quality-recovery.ts`
- Create: `artifacts/novel-prose-quality-recovery/.gitkeep`
- Modify: `package.json`

- [ ] **Step 1: 写验收器的纯计算测试**

把评分聚合导出，并在 `scripts/validate-novel-prose-quality-recovery.test.ts` 写：

```ts
import { describe, expect, test } from 'bun:test'
import { evaluateBlindScoreThresholds } from './validate-novel-prose-quality-recovery'

test('accepts candidate within baseline quality tolerances', () => {
  const dimensions = ['opening_hook', 'causal_progress', 'protagonist_agency', 'conflict_payoff', 'continuity', 'prose_naturalness', 'ending_hook']
  const baseline = dimensions.map(dimension => ({ dimension, scores: [8, 8, 7, 8, 8, 8] }))
  const candidate = dimensions.map(dimension => ({ dimension, scores: [7.5, 8] }))
  const result = evaluateBlindScoreThresholds(baseline, candidate, [true, true])

  expect(result.overall_delta).toBeGreaterThanOrEqual(-0.5)
  expect(result.dimension_failures).toEqual([])
  expect(result.publishable_pass).toBe(true)
  expect(result.passed).toBe(true)
})
```

- [ ] **Step 2: 运行测试确认验收器不存在**

Run: `bun test scripts/validate-novel-prose-quality-recovery.test.ts`

Expected: FAIL with module-not-found.

- [ ] **Step 3: 实现数据库备份和第 1-9 章 SHA-256 快照**

```ts
import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join, resolve } from 'node:path'
import { Database } from 'bun:sqlite'
import { executeNovelAgent } from '../ui/server/src/llm/executor'
import { getNovelPayload } from '../ui/server/src/routes/novel-route-utils'
import { getNovelProject, listNovelChapters, listNovelCharacters } from '../ui/server/src/novel'
import { scanProseFormatRisks, scanProseLanguageRisks } from '../ui/server/src/novel-writing/prose-format'
import { scanModelDegenerationRisks, scanProseMetaLeaks } from '../ui/server/src/novel-writing/prose-meta'
import { evaluateProseWordTarget, resolveChapterWordTarget } from '../ui/server/src/novel-writing/word-target'
import { scanRepeatedReactionRisks, scanRepeatedSubjectRisks } from '../ui/server/src/routes/novel-writing-service'

const root = resolve(import.meta.dir, '..')
const workspace = resolve(process.env.MANGAFORGE_WORKSPACE || join(root, 'workspace'))
const artifactDir = resolve(process.env.PROSE_VALIDATION_DIR || join(root, 'artifacts/novel-prose-quality-recovery'))
const backupRoot = resolve(process.env.PROSE_VALIDATION_BACKUP_DIR || '/private/tmp/mangaforge-prose-validation-backups')
const projectId = Number(process.env.PROSE_VALIDATION_PROJECT_ID || 1)
const modelId = String(process.env.PROSE_VALIDATION_MODEL_ID || 217)

function hashText(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

async function backupNovelDatabase(stamp: string) {
  await mkdir(artifactDir, { recursive: true })
  const backupDir = join(backupRoot, stamp)
  await mkdir(backupDir, { recursive: true })
  const sourcePath = join(workspace, 'novel.sqlite')
  const db = new Database(sourcePath, { readonly: true })
  try {
    await writeFile(join(backupDir, 'novel.sqlite'), db.serialize())
  } finally {
    db.close()
  }
  for (const file of ['novel.sqlite-wal', 'novel.sqlite-shm']) {
    await copyFile(join(workspace, file), join(backupDir, file)).catch(error => {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    })
  }
  return backupDir
}
```

脚本启动时断言项目标题为《怪谈世界：我是超人，怪谈你随意》、第 1-3 章非空、第 10 章为空，并记录第 1-9 章 `{chapter_no, sha256, chars}`。

- [ ] **Step 4: 通过正常 HTTP 统一链路生成第 10 章**

```ts
async function request(path: string, init: RequestInit = {}) {
  const baseUrl = process.env.MANGAFORGE_API_URL || 'http://127.0.0.1:8787/api'
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  })
  const text = await response.text()
  const payload = text ? JSON.parse(text) : null
  if (!response.ok) throw Object.assign(new Error(`${response.status}: ${text.slice(0, 600)}`), { payload })
  return payload
}

const generated = await request(`/novel/chapters/${chapter10.id}/generate-prose`, {
  method: 'POST',
  body: JSON.stringify({
    project_id: projectId,
    model_id: Number(modelId),
    auto_repair_missing_material: true,
    auto_repair_quality_gate: true,
  }),
})
```

请求体不含 `allow_incomplete`，不含 `approvals.quality_gate`，也不伪造 gate override。响应必须有 `prompt_diagnostics.prompt_chars <= 48000`、`quality_loop.decision.passed=true` 和非空 `chapter.chapter_text`。

- [ ] **Step 5: 实现确定性验收和历史哈希保护**

重新读取 chapters 并断言第 1-9 章哈希与生成前完全一致；对第 10 章调用生产中的 deterministic scan helpers，阻断以下任一结果：非中文连续片段、工程词、模型退化、重复崩坏、截断、字数越界、deterministic hard failure。另检查第 10 章首 600 字与第 9 章尾段存在人物/追捕/包围状态的承接证据。

```ts
const afterChapters = await listNovelChapters(workspace, projectId)
for (const row of beforeHashes) {
  const current = afterChapters.find(chapter => chapter.chapter_no === row.chapter_no)
  if (!current || hashText(current.chapter_text || '') !== row.sha256) {
    throw new Error(`历史正文哈希改变：第 ${row.chapter_no} 章`)
  }
}
const storedCandidate = afterChapters.find(chapter => chapter.chapter_no === 10)
if (!storedCandidate?.chapter_text) throw new Error('第 10 章没有通过正常链路入库')
const deterministicChecks = [
  ...scanProseLanguageRisks(storedCandidate.chapter_text),
  ...scanProseMetaLeaks(storedCandidate.chapter_text),
  ...scanModelDegenerationRisks(storedCandidate.chapter_text),
  ...scanProseFormatRisks(storedCandidate.chapter_text),
  ...scanRepeatedSubjectRisks(storedCandidate.chapter_text),
  ...scanRepeatedReactionRisks(storedCandidate.chapter_text),
]
const hardChecks = deterministicChecks.filter(item => item?.status === 'fail' || item?.severity === 'blocking' || item?.blocking === true)
if (hardChecks.length) throw Object.assign(new Error('第 10 章仍有确定性硬失败'), { hardChecks })
const candidateWordTarget = resolveChapterWordTarget(project, storedCandidate, {})
const candidateWordEvaluation = evaluateProseWordTarget(storedCandidate.chapter_text, candidateWordTarget)
if (!candidateWordEvaluation.passed) throw new Error(`第 10 章字数 ${candidateWordEvaluation.actual} 不在 ${candidateWordEvaluation.min}-${candidateWordEvaluation.max}`)
const chapter9Tail = String(afterChapters.find(chapter => chapter.chapter_no === 9)?.chapter_text || '').slice(-1200)
const chapter10Opening = storedCandidate.chapter_text.slice(0, 600)
const characterNames = (await listNovelCharacters(workspace, projectId)).map(character => character.name).filter(Boolean)
if (!hasChapterNinePursuitHandoff(chapter9Tail, chapter10Opening, characterNames)) throw new Error('第 10 章开篇没有可定位的第 9 章合围承接证据')

function hasChapterNinePursuitHandoff(tail: string, opening: string, names: string[]) {
  const tailNames = names.filter(name => tail.includes(name))
  const sharesCharacter = tailNames.some(name => opening.includes(name))
  const tailHasCrisis = /追捕|包围|合围|封锁|围住|退路|追兵/.test(tail)
  const openingHasCrisis = /追捕|包围|合围|封锁|围住|退路|追兵/.test(opening)
  return sharesCharacter && tailHasCrisis && openingHasCrisis
}
```

`hasChapterNinePursuitHandoff` 要求第 10 章开篇至少复现一个第 9 章尾段角色锚点和一个危机词；最终仍由 Task 10 人工抽查判断语义承接，不把词面命中当成质量证明。

- [ ] **Step 6: 用真实模型执行两次不同顺序的匿名七维评审**

```ts
const dimensionKeys = [
  'opening_hook',
  'causal_progress',
  'protagonist_agency',
  'conflict_payoff',
  'continuity',
  'prose_naturalness',
  'ending_hook',
]
const orders = [
  [10, 1, 3, 2],
  [2, 10, 1, 3],
]

async function blindReview(order: number[]) {
  const labels = ['A', 'B', 'C', 'D']
  const samples = order.map((chapterNo, index) => ({
    label: labels[index],
    text: chapterByNo.get(chapterNo)?.chapter_text || '',
  }))
  const task = [
    '你是中文商业网文终审。以下四个匿名章节来自同一作品，不得猜测生成方式或章节序号。',
    '按 opening_hook、causal_progress、protagonist_agency、conflict_payoff、continuity、prose_naturalness、ending_hook 七维各给 1-10 分。',
    '每维必须引用正文短句；另给 publishable(boolean) 和 materially_below_publishable_baseline(boolean)。',
    JSON.stringify(samples),
    '只输出 JSON：{"samples":[{"label":"A","scores":{"opening_hook":0,"causal_progress":0,"protagonist_agency":0,"conflict_payoff":0,"continuity":0,"prose_naturalness":0,"ending_hook":0},"evidence":{},"publishable":false,"materially_below_publishable_baseline":false}]}',
  ].join('\n')
  const result = await executeNovelAgent('review-agent', project, { task }, {
    activeWorkspace: workspace,
    modelId,
    temperature: 0.1,
    maxTokens: 5000,
    skipMemory: true,
    responseMode: 'non_stream',
    timeoutMs: 300_000,
  })
  return { order, payload: getNovelPayload(result), usage: result.usage || result.raw?.usage || null }
}
```

- [ ] **Step 7: 实现阈值判定并写不含密钥的 JSON 报告**

`evaluateBlindScoreThresholds` 计算：candidate overall average、三个 baseline 章节 overall average、delta；每维 candidate 两次均值与 baseline 六个样本的最小值。通过条件固定为：overall delta `>= -0.5`；每维 candidate `>= baseline dimension minimum - 1.0`；两次 candidate 均 `publishable=true` 且 `materially_below_publishable_baseline=false`。

```ts
type DimensionScoreRow = { dimension: string; scores: number[] }

function mean(values: number[]) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function evaluateBlindScoreThresholds(
  baseline: DimensionScoreRow[],
  candidate: DimensionScoreRow[],
  publishableChecks: boolean[],
) {
  const candidateByDimension = new Map(candidate.map(row => [row.dimension, row.scores]))
  const dimensionMargins = baseline.map(row => {
    const baselineMinimum = Math.min(...row.scores)
    const candidateAverage = mean(candidateByDimension.get(row.dimension) || [])
    return {
      dimension: row.dimension,
      baseline_minimum: baselineMinimum,
      candidate_average: candidateAverage,
      required_minimum: baselineMinimum - 1,
      margin: candidateAverage - (baselineMinimum - 1),
    }
  })
  const baselineOverall = mean(baseline.flatMap(row => row.scores))
  const candidateOverall = mean(candidate.flatMap(row => row.scores))
  const overallDelta = candidateOverall - baselineOverall
  const dimensionFailures = dimensionMargins.filter(row => row.margin < 0)
  const publishablePass = publishableChecks.length >= 2 && publishableChecks.every(Boolean)
  return {
    baseline_overall: baselineOverall,
    candidate_overall: candidateOverall,
    overall_delta: overallDelta,
    dimension_margins: dimensionMargins,
    dimension_failures: dimensionFailures,
    publishable_pass: publishablePass,
    passed: overallDelta >= -0.5 && dimensionFailures.length === 0 && publishablePass,
  }
}
```

报告字段：时间、项目/模型 ID 和模型名、备份目录、前后哈希、prompt diagnostics、quality decision、deterministic scan 摘要、两次匿名评审及聚合阈值。过滤 `api_key`、Authorization header、完整 prompt 和 provider secret。

- [ ] **Step 8: 增加脚本命令并运行计算测试**

`package.json` 增加：

```json
"validate:novel-prose-quality": "bun scripts/validate-novel-prose-quality-recovery.ts"
```

Run: `bun test scripts/validate-novel-prose-quality-recovery.test.ts`

Expected: PASS.

- [ ] **Step 9: 提交验收器**

```bash
git add scripts/validate-novel-prose-quality-recovery.ts scripts/validate-novel-prose-quality-recovery.test.ts artifacts/novel-prose-quality-recovery/.gitkeep package.json
git commit -m "test(novel): add real-model prose quality validation"
```

### Task 10: 执行真实模型验收并完成证据复核

**Files:**
- Generate: `artifacts/novel-prose-quality-recovery/validation-<timestamp>.json`
- Modify: `docs/superpowers/specs/2026-07-10-novel-prose-quality-chain-recovery-design.md`

- [ ] **Step 1: 确认本地 Gemini proxy 和应用 runtime 健康**

Run: `lsof -nP -iTCP:7860 -sTCP:LISTEN`

Expected: a listener exists on `127.0.0.1:7860` or `*:7860`.

Run: `bun -e "import { executeNovelAgent } from './ui/server/src/llm/executor.ts'; import { getNovelProject } from './ui/server/src/novel.ts'; const p=await getNovelProject('./workspace',1); const r=await executeNovelAgent('review-agent',p,{task:'只输出 JSON：{\"ok\":true}'},{activeWorkspace:'./workspace',modelId:'217',maxTokens:64,temperature:0,skipMemory:true,responseMode:'non_stream',timeoutMs:60000}); console.log(JSON.stringify({ok:!!r.output,modelName:r.modelName,usage:r.usage||r.raw?.usage||null}))"`

Expected: JSON reports `ok: true`; output must not include the API key.

- [ ] **Step 2: 启动独立端口的应用 server**

Run: `PORT=8797 HOST=127.0.0.1 bun ui/server/src/index.ts`

Expected: process remains running and `curl -fsS http://127.0.0.1:8797/api/status` returns status JSON. Keep this process active through Step 4.

- [ ] **Step 3: 执行正常生产链路真实验收**

Run: `MANGAFORGE_API_URL=http://127.0.0.1:8797/api PROSE_VALIDATION_PROJECT_ID=1 PROSE_VALIDATION_MODEL_ID=217 bun run validate:novel-prose-quality`

Expected: exit 0 and print only the report path plus compact summary; generation gate passes without override, prompt chars are at most 48,000, chapters 1-9 hashes are unchanged, deterministic scan has no hard failure, and both blinded evaluations meet all thresholds.

- [ ] **Step 4: 人工抽查第 9 章末尾和第 10 章全文**

Run: `bun -e "import { listNovelChapters } from './ui/server/src/novel.ts'; const c=await listNovelChapters('./workspace',1); const c9=c.find(x=>x.chapter_no===9); const c10=c.find(x=>x.chapter_no===10); console.log('CH9_TAIL\n'+String(c9.chapter_text).slice(-1200)+'\n\nCH10\n'+String(c10.chapter_text))"`

Expected manual checks:

- 第 10 章前 300 字直接承接第 9 章高阶追捕合围，没有另起无关环境开场。
- 江澈以可见选择和行动改变围堵局面，核心结果不由配角代办。
- 冲突至少经历一次受阻、代价或反制，并给出本章可感知回报。
- 正文没有合同、prompt、回执、字段、读者分析等工程语言，没有连续外语和总结式章末预告。
- 末段形成新的具体问题或威胁，不是截断或抽象升华。

- [ ] **Step 5: 复跑最终验证命令**

Run: `bun run test:novel-server && bun run check:refactor-boundaries && bun run build:server`

Expected: all commands exit 0 after the real-model run; no generated database state breaks server tests.

- [ ] **Step 6: 在规格中记录验收报告和最终结果**

把设计文档状态改为“已实施并通过真实模型验收”，追加报告相对路径、生成章节号、prompt chars、revision rounds、blind overall delta、各维最小 margin、章节 1-9 哈希保护结果和人工抽查结论。不得粘贴 API key、完整 prompt 或 provider secret。

- [ ] **Step 7: 检查最终 diff 和用户配置边界**

Run: `git status --short && git diff --stat && git diff -- workspace/providers.json`

Expected: 代码、测试、计划/规格和验收报告为本任务变更；`workspace/providers.json` 保持用户原有未 staged 修改，没有其他 workspace 数据文件被 stage。

- [ ] **Step 8: 提交验收证据**

```bash
git add docs/superpowers/specs/2026-07-10-novel-prose-quality-chain-recovery-design.md artifacts/novel-prose-quality-recovery/validation-*.json
git commit -m "docs: record novel prose quality recovery validation"
```

## Final Verification Checklist

- [ ] `strict_ready=false` 在材料修复后仍返回 `PROSE_STRICT_PREFLIGHT_BLOCKED`。
- [ ] request overrides 在每次上下文重建后重新合并，并重新计算 director。
- [ ] `allow_incomplete` 不能绕过 preflight、strict preflight、launch gate、director 或 scene cards 硬门禁。
- [ ] 新生成/强制重建的 scene cards 不被独立 route 自动批准。
- [ ] director 最多选择 4 个规范合同 key，未选合同文本不在正文 prompt 中。
- [ ] required prompt 超预算返回 `PROSE_CORE_PROMPT_BUDGET_EXCEEDED`，没有尾部截断继续生成。
- [ ] 初稿及每轮修订后都运行新的 deterministic scan 和独立 LLM review，revision 总数不超过 2。
- [ ] review/revision prompt 只围绕六维正文证据和最多 6 个 blocking findings，不要求大规模回执填充。
- [ ] recheck timeout/parse error 返回 `PROSE_QUALITY_RECHECK_UNAVAILABLE`，不存在接受型 fallback。
- [ ] hard failure 即使有 `approvals.quality_gate.approved` 也不写章节正文或故事状态。
- [ ] 成功路径使用同一最终文本写正文、版本、director/receipts 和故事状态。
- [ ] 真实第 10 章通过正常链路、确定性检查、两次匿名七维评审和人工承接抽查。
- [ ] 第 1-9 章 SHA-256 不变，`workspace/providers.json` 用户改动未被覆盖或 staged。
