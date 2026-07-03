# oh-story Director Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a stage-aware oh-story director layer that turns MangaForge's existing oh-story contracts, gates, receipts, and repairs into one clear readiness state, one primary action, scoped prompt-budget selection, and cleaner task-center status.

**Architecture:** Start with a pure server-side director model that normalizes stage, readiness, blocker category, selected contracts, prompt budget, and evidence. Attach that model to existing project seed, pre-draft context, prose generation, and post-draft outputs without adding a new page or database table. Then teach the web models to prefer the director object for one main workspace status, task grouping, and acceptance carry-over.

**Tech Stack:** Bun, TypeScript, existing server route helpers under `ui/server/src/routes`, existing React/Ant Design workspace models under `ui/web/src/pages/novel-workspace`, focused `bun test` suites, and `bun run check`.

---

## File Map

- Create: `ui/server/src/routes/novel-oh-story-director.ts`
  - Pure helper module for director types and normalization functions.
  - No database or network access.
- Create: `ui/server/src/routes/novel-oh-story-director.test.ts`
  - Focused unit tests for stage readiness, blocker categories, prompt budget, and post-draft diagnosis.
- Modify: `ui/server/src/routes/novel-core-routes.ts`
  - Attach `oh_story_director` to project seed preview/materialization payloads where seed readiness is already known.
- Modify: `ui/server/src/routes/novel-core-routes.test.ts`
  - Verify project creation/deep-incubation payloads expose director readiness without weakening existing oh-story seed contracts.
- Modify: `ui/server/src/routes/novel-writing-service.ts`
  - Attach director objects to context packages, prose-generation prompt inputs, stored raw payloads, and post-draft quality outputs.
  - Use director prompt-budget selections before the existing bounded prompt fallback.
- Modify: `ui/server/src/routes/novel-writing-service.test.ts`
  - Verify pre-draft blocker collapse, auto-repair categories, prompt-budget selection, and post-draft carry-over classification.
- Modify: `ui/web/src/pages/novel-workspace/writingCockpitModel.ts`
  - Prefer director readiness and primary action when present.
- Modify: `ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts`
  - Verify one visible status and one primary action for ready, repairable, blocked, and carry-over states.
- Modify: `ui/web/src/pages/novel-workspace/TaskCenterDrawer.tsx`
  - Add director stage/blocking metadata to run cards and group/sort helpers while preserving existing lifecycle, execution mode, and timeline fields.
- Modify: `ui/web/src/pages/novel-workspace/TaskCenterDrawer.test.ts`
  - Verify stage grouping, automatic/manual labeling, start/end timestamps, and blocking status.
- Modify: `ui/web/src/pages/novel-workspace/autoCreationDirectorModel.ts`
  - Feed director primary action into the existing auto-creation director surface instead of creating another visible entry.
- Modify: `ui/web/src/pages/novel-workspace/autoCreationDirectorModel.test.ts`
  - Verify the existing director workspace uses the response-level director object when available.
- Modify: `docs/oh-story-adoption-progress.md`
  - Add a dated note that oh-story migration is moving from reference absorption to orchestration tuning, without changing the 38/38 integrated reference count.

---

### Task 1: Server Director Core Model

**Files:**
- Create: `ui/server/src/routes/novel-oh-story-director.ts`
- Create: `ui/server/src/routes/novel-oh-story-director.test.ts`

- [ ] **Step 1: Write failing tests for normalized director outputs**

Create `ui/server/src/routes/novel-oh-story-director.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import {
  buildOhStoryDirectorForPostDraft,
  buildOhStoryDirectorForPreDraft,
  buildOhStoryDirectorForProjectSeed,
  classifyOhStoryDirectorBlocker,
  selectOhStoryDirectorContracts,
} from './novel-oh-story-director'

describe('oh-story director core', () => {
  test('marks complete project seeds as ready and keeps optional gaps deferred', () => {
    const director = buildOhStoryDirectorForProjectSeed({
      title: '星火令',
      synopsis: '少年带着失效星火令进入边境学院，发现星火令能改写势力手牌。',
      logline: '失效令牌成为改写边境秩序的唯一钥匙。',
      main_conflict: '主角要查清星火令来源，边境三方势力要夺令灭口。',
      protagonist: { name: '林澈', goal: '查明父亲失踪真相' },
      worldbuilding: { world_summary: '边境学院由军府、商盟、旧神教共同控制。', rules: ['星火令只能改写一次阵营手牌'] },
      writing_bible: {
        target_reader_contract: { reader_profile: '男频升级爽文读者' },
        story_power_contract: { quality_checks: ['目标阻碍动作反馈期待'] },
        character_design_contract: { character_pool_tiers: ['protagonist', 'primary_supporting'] },
        longform_structure_contract: { structure_mode: '二级结构' },
      },
      chapter_outlines: [{ chapter_no: 1, title: '失效令牌', summary: '林澈被迫入局', conflict: '军府扣人', ending_hook: '星火令亮起' }],
      character_pool: {
        protagonist: [{ name: '林澈' }],
        primary_supporting: [{ name: '许照夜' }, { name: '唐眉' }, { name: '周砚' }],
        antagonist_primary: [{ name: '沈归墟', antagonist_logic: { desire: '夺回旧神令权' } }],
      },
    })

    expect(director.stage).toBe('project_creation')
    expect(director.readiness).toBe('ready')
    expect(director.primary_action.key).toBe('enter_workspace')
    expect(director.required_repairs).toHaveLength(0)
    expect(director.deferred_repairs.some(item => item.key === 'chapter_runway_depth')).toBe(true)
  })

  test('collapses scattered pre-draft warnings into canonical blocker categories', () => {
    expect(classifyOhStoryDirectorBlocker('文风召回来源缺失：Step 2.3 source_paths_missing')).toBe('missing_source_evidence')
    expect(classifyOhStoryDirectorBlocker('本章细纲/蓝图：补齐本章蓝图核心字段')).toBe('missing_blueprint')
    expect(classifyOhStoryDirectorBlocker('追踪/时间线.md 缺少本章当前时间地点')).toBe('missing_context')
    expect(classifyOhStoryDirectorBlocker('先确认主角是否更换阵营后再写')).toBe('manual_confirmation_required')
  })

  test('selects compact contracts and omits unrelated longform contracts for a local chapter risk', () => {
    const selection = selectOhStoryDirectorContracts({
      stage: 'drafting',
      chapter_target: {
        conflict: '主角需要当场反制巡考扣押',
        story_power_contract: { quality_checks: ['目标阻碍动作反馈期待'] },
        character_behavior_contract: { quality_checks: ['主角不能因蠢犯错'] },
        longform_structure_contract: { quality_checks: ['五幕因果链'] },
      },
      preflight: { warnings: ['场景卡戏剧单元缺目标、阻碍、变化'] },
    })

    expect(selection.selected_contracts.map(item => item.key)).toContain('story_power')
    expect(selection.selected_contracts.map(item => item.key)).toContain('character_behavior')
    expect(selection.prompt_budget_plan.compact).toContain('story_power')
    expect(selection.prompt_budget_plan.omit).toContain('longform_structure_contract')
  })

  test('separates post-draft blockers from next-chapter carry-over', () => {
    const director = buildOhStoryDirectorForPostDraft({
      quality: {
        deslop_gate_diagnostics: { failed_count: 0 },
        story_power_sync: { status: 'warn', missed: [{ key: 'feedback', fix: '下一章开篇补代价反馈' }] },
        delivery_risk_receipt_sync: { missed_count: 1, items: [{ key: 'ending_hook', remaining_risk: '章末钩子未兑现' }] },
      },
      receipts: {
        revision_receipts: [{ required_action: '补对白口吻', applied_fix: '已完成', changed_evidence: '“你别碰那枚令。”' }],
      },
    })

    expect(director.stage).toBe('post_draft')
    expect(director.acceptance).toBe('accepted_with_carryover')
    expect(director.primary_action.key).toBe('continue_next_chapter')
    expect(director.carryover_findings.map(item => item.key)).toContain('story_power')
    expect(director.blocking_findings.map(item => item.key)).not.toContain('story_power')
  })
})
```

- [ ] **Step 2: Run the new test and verify it fails**

Run:

```bash
bun test ui/server/src/routes/novel-oh-story-director.test.ts
```

Expected: FAIL because `ui/server/src/routes/novel-oh-story-director.ts` does not exist.

- [ ] **Step 3: Implement the pure director helper**

Create `ui/server/src/routes/novel-oh-story-director.ts`:

```ts
export type OhStoryDirectorStage = 'project_creation' | 'pre_draft' | 'drafting' | 'post_draft' | 'handoff'
export type OhStoryDirectorReadiness = 'ready' | 'needs_repair' | 'needs_user_confirmation' | 'auto_repairing' | 'blocked'
export type OhStoryDirectorBlockerCategory =
  | 'missing_materials'
  | 'missing_blueprint'
  | 'missing_context'
  | 'missing_source_evidence'
  | 'manual_confirmation_required'
  | 'quality_revision_required'

export type OhStoryDirectorAction = {
  key: string
  label: string
  mode: 'automatic' | 'manual'
}

export type OhStoryDirectorRepair = {
  key: string
  category: OhStoryDirectorBlockerCategory
  label: string
  detail: string
  blocking: boolean
}

export type OhStoryDirectorContractSelection = {
  key: string
  reason: string
  detail_level: 'full' | 'compact' | 'reference'
}

export type OhStoryDirectorPromptBudgetPlan = {
  full: string[]
  compact: string[]
  reference: string[]
  omit: string[]
}

export type OhStoryDirectorEvidence = {
  key: string
  status: 'ready' | 'missing' | 'warn' | 'blocked' | 'resolved'
  source: string
  detail?: string
}

export type OhStoryDirector = {
  stage: OhStoryDirectorStage
  readiness: OhStoryDirectorReadiness
  acceptance?: 'accepted' | 'accepted_with_carryover' | 'needs_revision'
  primary_action: OhStoryDirectorAction
  blocking_summary: string
  required_repairs: OhStoryDirectorRepair[]
  deferred_repairs: OhStoryDirectorRepair[]
  selected_contracts: OhStoryDirectorContractSelection[]
  suppressed_contracts?: OhStoryDirectorContractSelection[]
  prompt_budget_plan: OhStoryDirectorPromptBudgetPlan
  evidence: OhStoryDirectorEvidence[]
  blocking_findings?: OhStoryDirectorRepair[]
  carryover_findings?: OhStoryDirectorRepair[]
  resolved_findings?: OhStoryDirectorRepair[]
}

function asArray(value: any): any[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function hasObject(value: any) {
  return Boolean(value && typeof value === 'object' && Object.keys(value).length)
}

function text(value: any) {
  return String(value || '').trim()
}

function hasAny(value: any) {
  if (Array.isArray(value)) return value.length > 0
  if (value && typeof value === 'object') return Object.keys(value).length > 0
  return Boolean(text(value))
}

export function classifyOhStoryDirectorBlocker(raw: any): OhStoryDirectorBlockerCategory {
  const value = text(raw)
  if (/确认|人工|选择|是否|改纲|更换|替换|主线方向|核心承诺/.test(value)) return 'manual_confirmation_required'
  if (/source_paths_missing|文风召回|对标|样章|来源|证据/.test(value)) return 'missing_source_evidence'
  if (/蓝图|细纲|任务书|场景卡|scene.?card|chapter_blueprint/i.test(value)) return 'missing_blueprint'
  if (/追踪|时间线|上下文|当前时间|当前地点|状态摘要|handoff/i.test(value)) return 'missing_context'
  return 'missing_materials'
}

function repair(key: string, category: OhStoryDirectorBlockerCategory, label: string, detail: string, blocking = true): OhStoryDirectorRepair {
  return { key, category, label, detail, blocking }
}

function evidence(key: string, status: OhStoryDirectorEvidence['status'], source: string, detail = ''): OhStoryDirectorEvidence {
  return detail ? { key, status, source, detail } : { key, status, source }
}

function basePromptBudget(overrides: Partial<OhStoryDirectorPromptBudgetPlan> = {}): OhStoryDirectorPromptBudgetPlan {
  return {
    full: overrides.full || [],
    compact: overrides.compact || [],
    reference: overrides.reference || [],
    omit: overrides.omit || [],
  }
}

export function buildOhStoryDirectorForProjectSeed(seed: any = {}): OhStoryDirector {
  const required: OhStoryDirectorRepair[] = []
  const deferred: OhStoryDirectorRepair[] = []
  const bible = seed.writing_bible || seed.writingBible || {}
  if (!text(seed.synopsis) && !text(seed.logline) && !text(seed.core_premise)) {
    required.push(repair('premise', 'missing_materials', '补项目核心承诺', '缺少 synopsis/logline/core_premise，无法判断作品卖点。'))
  }
  if (!text(seed.main_conflict)) {
    required.push(repair('main_conflict', 'manual_confirmation_required', '确认主线矛盾', '缺少 main_conflict，自动补齐可能改变作品方向。'))
  }
  if (!hasObject(seed.protagonist)) {
    required.push(repair('protagonist', 'missing_materials', '补主角卡', '缺少 protagonist，无法进入正文生产。'))
  }
  if (!hasObject(seed.worldbuilding)) {
    required.push(repair('worldbuilding', 'missing_materials', '补世界规则', '缺少 worldbuilding，正文容易失去边界。'))
  }
  if (!hasAny(seed.chapter_outlines)) {
    required.push(repair('chapter_runway', 'missing_blueprint', '补章节跑道', '缺少 chapter_outlines，无法定位第一章任务书。'))
  } else if (asArray(seed.chapter_outlines).length < 10) {
    deferred.push(repair('chapter_runway_depth', 'missing_blueprint', '扩展章节跑道', '章节跑道不足 10 章，短期可写但不利于连续生产。', false))
  }
  if (!hasObject(bible.target_reader_contract)) {
    required.push(repair('target_reader_contract', 'missing_materials', '补目标读者合同', '缺少 target_reader_contract，无法判断读者承诺。'))
  }
  if (!hasObject(bible.story_power_contract)) {
    required.push(repair('story_power_contract', 'missing_materials', '补故事力合同', '缺少 story_power_contract，无法约束目标/阻碍/动作/反馈/期待。'))
  }
  const rolePool = seed.character_pool || seed.characterPool || {}
  if (!hasAny(seed.characters) && !hasObject(rolePool)) {
    deferred.push(repair('role_pool', 'missing_materials', '补角色池', '缺少角色池会降低后续关系线和反派压力，但不必阻塞项目创建。', false))
  }

  const needsUser = required.some(item => item.category === 'manual_confirmation_required')
  const readiness: OhStoryDirectorReadiness = required.length === 0 ? 'ready' : needsUser ? 'needs_user_confirmation' : 'needs_repair'
  return {
    stage: 'project_creation',
    readiness,
    primary_action: readiness === 'ready'
      ? { key: 'enter_workspace', label: '进入工作台', mode: 'automatic' }
      : needsUser
        ? { key: 'ask_user_confirmation', label: '确认关键设定', mode: 'manual' }
        : { key: 'repair_project_seed', label: '补齐项目材料', mode: 'automatic' },
    blocking_summary: required.map(item => item.label).join('；'),
    required_repairs: required,
    deferred_repairs: deferred,
    selected_contracts: [],
    prompt_budget_plan: basePromptBudget({ full: ['project_seed'], compact: ['writing_bible'], reference: ['oh_story_contracts'] }),
    evidence: [
      evidence('premise', required.some(item => item.key === 'premise') ? 'missing' : 'ready', 'project_seed'),
      evidence('chapter_outlines', required.some(item => item.key === 'chapter_runway') ? 'missing' : 'ready', 'project_seed.chapter_outlines'),
      evidence('writing_bible', hasObject(bible) ? 'ready' : 'missing', 'project_seed.writing_bible'),
    ],
  }
}

export function selectOhStoryDirectorContracts(contextPackage: any = {}) {
  const target = contextPackage.chapter_target || contextPackage.chapterTarget || {}
  const warnings = asArray(contextPackage.preflight?.warnings)
  const selected: OhStoryDirectorContractSelection[] = []
  const compact: string[] = []
  const omit: string[] = []
  const addCompact = (key: string, reason: string) => {
    if (selected.some(item => item.key === key)) return
    selected.push({ key, reason, detail_level: 'compact' })
    compact.push(key)
  }
  if (hasObject(target.story_power_contract) || warnings.some(item => /戏剧|目标|阻碍|动作|反馈|故事力/.test(text(item)))) {
    addCompact('story_power', '本章需要目标、阻碍、动作、反馈和期待落地。')
  }
  if (hasObject(target.character_behavior_contract) || warnings.some(item => /角色|人物|OOC|主角/.test(text(item)))) {
    addCompact('character_behavior', '本章存在角色行为或人设执行风险。')
  }
  if (hasObject(target.plot_special_topics_contract)) addCompact('plot_special_topics', '本章涉及特殊题材约束。')
  if (hasObject(target.longform_structure_contract) && !warnings.some(item => /分卷|长线|结构|换地图/.test(text(item)))) {
    omit.push('longform_structure_contract')
  }
  return {
    selected_contracts: selected,
    suppressed_contracts: omit.map(key => ({ key, reason: '本章局部生成不需要完整长篇结构合同。', detail_level: 'reference' as const })),
    prompt_budget_plan: basePromptBudget({
      full: ['chapter_blueprint', 'last_chapter_ending'],
      compact,
      omit,
    }),
  }
}

export function buildOhStoryDirectorForPreDraft(contextPackage: any = {}): OhStoryDirector {
  const preflight = contextPackage.preflight || {}
  const rawBlockers = [...asArray(preflight.blockers), ...asArray(preflight.warnings)]
  const repairs = rawBlockers.map((item, index) => {
    const category = classifyOhStoryDirectorBlocker(item)
    return repair(`pre_draft_${category}_${index}`, category, category, text(item))
  })
  const needsUser = repairs.some(item => item.category === 'manual_confirmation_required')
  const selection = selectOhStoryDirectorContracts({ ...contextPackage, stage: 'pre_draft' })
  const readiness: OhStoryDirectorReadiness = repairs.length === 0 ? 'ready' : needsUser ? 'blocked' : 'needs_repair'
  return {
    stage: 'pre_draft',
    readiness,
    primary_action: readiness === 'ready'
      ? { key: 'generate_prose', label: '生成正文', mode: 'automatic' }
      : needsUser
        ? { key: 'confirm_missing_choice', label: '确认缺口', mode: 'manual' }
        : { key: 'repair_pre_draft_materials', label: '补齐并继续', mode: 'automatic' },
    blocking_summary: repairs.slice(0, 3).map(item => item.detail).join('；'),
    required_repairs: repairs,
    deferred_repairs: [],
    selected_contracts: selection.selected_contracts,
    suppressed_contracts: selection.suppressed_contracts,
    prompt_budget_plan: selection.prompt_budget_plan,
    evidence: [
      evidence('preflight', repairs.length ? 'warn' : 'ready', 'contextPackage.preflight'),
      evidence('chapter_blueprint', hasObject(contextPackage.chapter_blueprint || contextPackage.chapterBlueprint || contextPackage.chapter_target?.chapter_blueprint) ? 'ready' : 'missing', 'contextPackage.chapter_blueprint'),
    ],
  }
}

export function buildOhStoryDirectorForPostDraft(args: any = {}): OhStoryDirector {
  const quality = args.quality || {}
  const blocking: OhStoryDirectorRepair[] = []
  const carryover: OhStoryDirectorRepair[] = []
  const resolved: OhStoryDirectorRepair[] = []
  if (Number(quality.deslop_gate_diagnostics?.failed_count || 0) > 0) {
    blocking.push(repair('deslop', 'quality_revision_required', '去AI味门禁未过', '去AI味硬门禁失败，需要本章修订。'))
  }
  if (Number(quality.delivery_risk_receipt_sync?.missed_count || 0) > 1) {
    blocking.push(repair('delivery_risk_receipts', 'quality_revision_required', '交付回执缺失', '交付风险回执缺失过多，需要回修。'))
  }
  if (quality.story_power_sync?.status === 'warn') {
    carryover.push(repair('story_power', 'missing_context', '故事力续航', '故事力风险可转入下一章开篇动作。', false))
  }
  for (const receipt of asArray(args.receipts?.revision_receipts)) {
    if (text(receipt.changed_evidence)) resolved.push(repair('revision_receipt', 'quality_revision_required', '修订回执已闭环', text(receipt.changed_evidence), false))
  }
  const acceptance = blocking.length ? 'needs_revision' : carryover.length ? 'accepted_with_carryover' : 'accepted'
  return {
    stage: 'post_draft',
    readiness: blocking.length ? 'blocked' : 'ready',
    acceptance,
    primary_action: acceptance === 'needs_revision'
      ? { key: 'run_revision', label: '修订本章', mode: 'automatic' }
      : { key: 'continue_next_chapter', label: '继续下一章', mode: 'automatic' },
    blocking_summary: blocking.map(item => item.label).join('；'),
    required_repairs: blocking,
    deferred_repairs: carryover,
    selected_contracts: [],
    prompt_budget_plan: basePromptBudget({ full: ['chapter_text'], compact: ['quality_findings', 'delivery_receipts'] }),
    evidence: [evidence('post_draft_quality', blocking.length ? 'blocked' : carryover.length ? 'warn' : 'ready', 'quality')],
    blocking_findings: blocking,
    carryover_findings: carryover,
    resolved_findings: resolved,
  }
}
```

- [ ] **Step 4: Run test and verify it passes**

Run:

```bash
bun test ui/server/src/routes/novel-oh-story-director.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/routes/novel-oh-story-director.ts ui/server/src/routes/novel-oh-story-director.test.ts
git commit -m "feat: add oh-story director core model"
```

---

### Task 2: Project Creation Director Readiness

**Files:**
- Modify: `ui/server/src/routes/novel-core-routes.ts`
- Modify: `ui/server/src/routes/novel-core-routes.test.ts`

- [ ] **Step 1: Write failing core-route tests**

Append tests near the existing project seed prompt/materialization tests in `ui/server/src/routes/novel-core-routes.test.ts`:

```ts
test('materialized project seed carries oh-story director readiness', async () => {
  const seed = repairProjectSeedGaps({
    title: '星火令',
    synopsis: '少年带着失效星火令进入边境学院。',
    logline: '失效令牌改写边境秩序。',
    main_conflict: '主角查父亲失踪，三方势力夺令。',
    protagonist: { name: '林澈', goal: '查明父亲失踪真相' },
    worldbuilding: { world_summary: '边境学院三方共治。', rules: ['星火令只能改写一次阵营手牌'] },
    writing_bible: {
      target_reader_contract: { reader_profile: '男频升级爽文读者' },
      story_power_contract: { quality_checks: ['目标阻碍动作反馈期待'] },
      character_design_contract: { character_pool_tiers: ['protagonist'] },
      longform_structure_contract: { structure_mode: '二级结构' },
    },
    chapter_outlines: [{ chapter_no: 1, title: '失效令牌', summary: '林澈被扣押', conflict: '巡考夺令', ending_hook: '令牌亮起' }],
  }, '星火令')

  expect(seed.oh_story_director.stage).toBe('project_creation')
  expect(seed.oh_story_director.readiness).toBe('ready')
  expect(seed.oh_story_director.primary_action.key).toBe('enter_workspace')
})

test('thin project seed director asks for confirmation instead of silently changing the mainline', () => {
  const seed = repairProjectSeedGaps({
    title: '星火令',
    synopsis: '少年捡到令牌。',
    protagonist: { name: '林澈' },
    worldbuilding: { world_summary: '边境学院' },
    writing_bible: { target_reader_contract: { reader_profile: '男频' }, story_power_contract: {} },
    chapter_outlines: [{ chapter_no: 1, title: '失效令牌' }],
  }, '星火令')

  expect(seed.oh_story_director.readiness).toBe('needs_user_confirmation')
  expect(seed.oh_story_director.primary_action.key).toBe('ask_user_confirmation')
  expect(seed.oh_story_director.required_repairs.map((item: any) => item.key)).toContain('main_conflict')
})
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
bun test ui/server/src/routes/novel-core-routes.test.ts --test-name-pattern "director"
```

Expected: FAIL because `repairProjectSeedGaps` does not attach `oh_story_director`.

- [ ] **Step 3: Attach project seed director**

Modify `ui/server/src/routes/novel-core-routes.ts`:

```ts
import { buildOhStoryDirectorForProjectSeed } from './novel-oh-story-director'
```

Inside `repairProjectSeedGaps(seed, idea)`, after the repaired seed has writing-bible contracts and chapter outlines normalized, return the existing seed with this extra field:

```ts
const repaired = {
  ...existingRepairedSeed,
  oh_story_director: buildOhStoryDirectorForProjectSeed(existingRepairedSeed),
}
return repaired
```

Use the actual local variable name already returned by `repairProjectSeedGaps`; do not duplicate the full repair function. The important invariant is that `buildOhStoryDirectorForProjectSeed` receives the final repaired seed, not the raw model response.

- [ ] **Step 4: Preserve existing seed outputs**

Run:

```bash
bun test ui/server/src/routes/novel-core-routes.test.ts --test-name-pattern "director|layered.*character|project seed prompt"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/routes/novel-core-routes.ts ui/server/src/routes/novel-core-routes.test.ts
git commit -m "feat: add project seed director readiness"
```

---

### Task 3: Pre-Draft Director And Auto-Repair Collapse

**Files:**
- Modify: `ui/server/src/routes/novel-writing-service.ts`
- Modify: `ui/server/src/routes/novel-writing-service.test.ts`

- [ ] **Step 1: Write failing tests for pre-draft director payloads**

Append focused tests near the existing preflight/context-package tests in `ui/server/src/routes/novel-writing-service.test.ts`:

```ts
test('pre-draft director collapses warnings into one repair action', () => {
  const contextPackage = {
    preflight: {
      ready: false,
      warnings: [
        '文风召回来源缺失：Step 2.3 source_paths_missing',
        '追踪/时间线.md 缺少本章当前时间地点',
        '本章细纲/蓝图：补齐本章蓝图核心字段',
      ],
    },
    chapter_target: {
      chapter_blueprint: { objective: '夺回星火令', conflict: '巡考扣押' },
      story_power_contract: { quality_checks: ['目标阻碍动作反馈期待'] },
    },
  }

  const director = buildOhStoryDirectorForPreDraft(contextPackage)

  expect(director.stage).toBe('pre_draft')
  expect(director.readiness).toBe('needs_repair')
  expect(director.primary_action.key).toBe('repair_pre_draft_materials')
  expect(director.required_repairs.map(item => item.category)).toEqual(expect.arrayContaining([
    'missing_source_evidence',
    'missing_context',
    'missing_blueprint',
  ]))
  expect(director.blocking_summary).not.toContain('undefined')
})

test('pre-draft director blocks only manual confirmation choices', () => {
  const director = buildOhStoryDirectorForPreDraft({
    preflight: {
      warnings: ['先确认主角是否更换阵营后再写正文。'],
    },
  })

  expect(director.readiness).toBe('blocked')
  expect(director.primary_action.mode).toBe('manual')
  expect(director.primary_action.key).toBe('confirm_missing_choice')
})
```

If `buildOhStoryDirectorForPreDraft` is not exported to this test file yet, import it from `./novel-oh-story-director`.

- [ ] **Step 2: Run tests and verify current integration fails**

Run:

```bash
bun test ui/server/src/routes/novel-writing-service.test.ts --test-name-pattern "pre-draft director"
```

Expected: helper-level tests pass after Task 1, but existing generated context packages still do not expose `oh_story_director`. Add an additional failing integration assertion to the most relevant context-package test:

```ts
expect(contextPackage.oh_story_director.stage).toBe('pre_draft')
```

- [ ] **Step 3: Attach director object to context packages**

In `ui/server/src/routes/novel-writing-service.ts`, import:

```ts
import { buildOhStoryDirectorForPreDraft } from './novel-oh-story-director'
```

Where the prose context package is assembled, after `preflight` and `chapter_target` are present, add:

```ts
const ohStoryDirector = buildOhStoryDirectorForPreDraft(contextPackage)
contextPackage.oh_story_director = ohStoryDirector
contextPackage.ohStoryDirector = ohStoryDirector
```

If the function currently returns object literals in several branches, use a small local helper:

```ts
function attachOhStoryDirectorToContextPackage(contextPackage: any) {
  const director = buildOhStoryDirectorForPreDraft(contextPackage)
  return {
    ...contextPackage,
    oh_story_director: director,
    ohStoryDirector: director,
  }
}
```

Then wrap only the final context-package return paths. Do not mutate unrelated intermediate diagnostics.

- [ ] **Step 4: Verify pre-draft tests**

Run:

```bash
bun test ui/server/src/routes/novel-writing-service.test.ts --test-name-pattern "pre-draft director|context package|unattended character repair"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/routes/novel-writing-service.ts ui/server/src/routes/novel-writing-service.test.ts
git commit -m "feat: attach pre-draft oh-story director"
```

---

### Task 4: Prompt Budget Selection Before Prose Generation

**Files:**
- Modify: `ui/server/src/routes/novel-writing-service.ts`
- Modify: `ui/server/src/routes/novel-writing-service.test.ts`

- [ ] **Step 1: Write failing prompt-budget tests**

Add tests near prose prompt compaction tests in `ui/server/src/routes/novel-writing-service.test.ts`:

```ts
test('prose prompt uses director budget to include compact contracts and omit unrelated full contracts', () => {
  const contextPackage = {
    oh_story_director: {
      stage: 'drafting',
      selected_contracts: [
        { key: 'story_power', reason: '本章需要目标阻碍动作反馈', detail_level: 'compact' },
      ],
      suppressed_contracts: [
        { key: 'longform_structure_contract', reason: '本章局部生成不需要完整长篇结构合同', detail_level: 'reference' },
      ],
      prompt_budget_plan: {
        full: ['chapter_blueprint', 'last_chapter_ending'],
        compact: ['story_power'],
        reference: [],
        omit: ['longform_structure_contract'],
      },
    },
    chapter_target: {
      chapter_blueprint: { objective: '夺回星火令', conflict: '巡考扣押' },
      story_power_contract: { story_power_dimensions: ['目标、阻碍、动作、反馈、期待'] },
      longform_structure_contract: { five_act_causal_chain_rules: ['开局埋因、发展果+因、转折质变'] },
    },
  }

  const prompt = buildProseGenerationPromptForTest({
    project: { title: '星火令', length_target: 'medium', style_tags: [] },
    chapter: { chapter_no: 2, title: '巡考夺令', chapter_summary: '林澈反制巡考', conflict: '巡考扣押', ending_hook: '令牌亮起' },
    contextPackage,
  })

  expect(prompt).toContain('【oh-story 总导演】')
  expect(prompt).toContain('story_power')
  expect(prompt).toContain('本章需要目标阻碍动作反馈')
  expect(prompt).not.toContain('开局埋因、发展果+因、转折质变')
})
```

If there is no `buildProseGenerationPromptForTest`, add a small test-only export that calls the existing prose prompt builder used by generation. Keep it local to test needs and do not create a second prompt path.

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
bun test ui/server/src/routes/novel-writing-service.test.ts --test-name-pattern "director budget"
```

Expected: FAIL because prose prompt does not yet include director summary or use `prompt_budget_plan.omit`.

- [ ] **Step 3: Add compact director prompt block**

In `ui/server/src/routes/novel-writing-service.ts`, add a helper near `buildProsePromptContextSnapshot`:

```ts
function buildOhStoryDirectorPromptBlock(contextPackage: any = {}) {
  const director = contextPackage.oh_story_director || contextPackage.ohStoryDirector || {}
  if (!director.stage) return ''
  const selected = asArray(director.selected_contracts)
    .map((item: any) => `${item.key}: ${item.reason || item.detail_level || 'selected'}`)
    .slice(0, 8)
  const suppressed = asArray(director.suppressed_contracts)
    .map((item: any) => `${item.key}: ${item.reason || '本轮省略'}`)
    .slice(0, 6)
  const budget = director.prompt_budget_plan || director.promptBudgetPlan || {}
  return [
    '【oh-story 总导演】',
    `阶段：${director.stage}`,
    `主动作：${director.primary_action?.label || director.primaryAction?.label || ''}`,
    selected.length ? `本轮启用：${selected.join('；')}` : '',
    suppressed.length ? `本轮省略：${suppressed.join('；')}` : '',
    budget.full?.length ? `full：${budget.full.join('、')}` : '',
    budget.compact?.length ? `compact：${budget.compact.join('、')}` : '',
    budget.omit?.length ? `omit：${budget.omit.join('、')}` : '',
  ].filter(Boolean).join('\n')
}
```

Add the block to the prose prompt before broad context dumps:

```ts
const directorBlock = buildOhStoryDirectorPromptBlock(contextPackage)
if (directorBlock) sections.push(directorBlock)
```

When serializing contract-heavy context, exclude keys listed in `prompt_budget_plan.omit` from the compact context snapshot:

```ts
const omit = new Set(asArray(director.prompt_budget_plan?.omit || director.promptBudgetPlan?.omit).map(String))
if (!omit.has('longform_structure_contract')) {
  // keep existing longform contract summary
}
```

Apply this only to optional contract summaries. Do not omit `chapter_blueprint`, last-chapter ending, current chapter target, characters in scene, or required continuity.

- [ ] **Step 4: Verify prompt-budget and regression tests**

Run:

```bash
bun test ui/server/src/routes/novel-writing-service.test.ts --test-name-pattern "director budget|bounded prose prompt|oh-story delivery receipts|context window"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add ui/server/src/routes/novel-writing-service.ts ui/server/src/routes/novel-writing-service.test.ts
git commit -m "feat: apply oh-story director prompt budget"
```

---

### Task 5: Writing Cockpit One Status And One Primary Action

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/writingCockpitModel.ts`
- Modify: `ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts`

- [ ] **Step 1: Write failing web-model tests**

Add tests near `describe('buildWritingCockpitModel', ...)` in `ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts`:

```ts
test('uses oh-story director pre-draft readiness as one main writing action', () => {
  const model = buildWritingCockpitModel({
    selectedProject: project,
    outlines,
    chapters,
    activeChapter: chapters[1],
    materialScore: { score: 82, can_generate: true },
    runs: [],
    contextPackage: {
      ...contextPackage,
      preflight: { ready: false, warnings: ['本章细纲/蓝图缺核心字段'] },
      oh_story_director: {
        stage: 'pre_draft',
        readiness: 'needs_repair',
        primary_action: { key: 'repair_pre_draft_materials', label: '补齐并继续', mode: 'automatic' },
        blocking_summary: '本章蓝图缺核心字段',
        required_repairs: [{ key: 'blueprint', category: 'missing_blueprint', label: '补蓝图', detail: '本章蓝图缺核心字段', blocking: true }],
        deferred_repairs: [],
        selected_contracts: [],
        prompt_budget_plan: { full: [], compact: [], reference: [], omit: [] },
        evidence: [],
      },
    },
  })

  expect(model.chapterPlanningDesk.statusLabel).toBe('需要修复')
  expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('repair_materials')
  expect(model.chapterPlanningDesk.recommendedPlannerAction.label).toBe('补齐并继续')
  expect(model.chapterPlanningDesk.reasons).toEqual(['本章蓝图缺核心字段'])
})

test('uses oh-story director ready state to avoid duplicate guidance', () => {
  const model = buildWritingCockpitModel({
    selectedProject: project,
    outlines,
    chapters,
    activeChapter: chapters[1],
    materialScore: { score: 82, can_generate: true },
    runs: [],
    contextPackage: {
      ...contextPackage,
      preflight: { ready: true },
      oh_story_director: {
        stage: 'pre_draft',
        readiness: 'ready',
        primary_action: { key: 'generate_prose', label: '生成正文', mode: 'automatic' },
        blocking_summary: '',
        required_repairs: [],
        deferred_repairs: [],
        selected_contracts: [],
        prompt_budget_plan: { full: [], compact: [], reference: [], omit: [] },
        evidence: [],
      },
    },
  })

  expect(model.chapterPlanningDesk.statusLabel).toBe('可继续')
  expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('confirm_plan_and_write_draft')
})
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
bun test ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts --test-name-pattern "director"
```

Expected: FAIL because the web model ignores `oh_story_director`.

- [ ] **Step 3: Add director normalization to writing cockpit**

In `ui/web/src/pages/novel-workspace/writingCockpitModel.ts`, add:

```ts
function normalizeOhStoryDirector(value: AnyRecord | null | undefined) {
  const director = value?.oh_story_director || value?.ohStoryDirector || null
  return director && typeof director === 'object' ? director as AnyRecord : null
}

function directorPlannerAction(director: AnyRecord | null): { key: WritingCockpitActionKey, label: string } | null {
  const action = director?.primary_action || director?.primaryAction
  const key = text(action?.key)
  if (!key) return null
  if (key === 'generate_prose') return { key: 'confirm_plan_and_write_draft', label: text(action.label, ACTION_LABELS.confirm_plan_and_write_draft) }
  if (key === 'repair_pre_draft_materials') return { key: 'repair_materials', label: text(action.label, '补齐并继续') }
  if (key === 'confirm_missing_choice') return { key: 'open_generation_diagnostics', label: text(action.label, ACTION_LABELS.open_generation_diagnostics) }
  return null
}
```

At the top of the planning desk builder, before older scattered blocker branches, check director state:

```ts
const director = normalizeOhStoryDirector(args.contextPackage)
const directorAction = directorPlannerAction(director)
if (director && directorAction) {
  const requiredRepairs = arrayValue(director.required_repairs || director.requiredRepairs)
  if (director.readiness === 'ready') {
    return {
      readiness: 'ready',
      statusLabel: '可继续',
      contextPackageStatus: contextStatus,
      scenePlanStatus,
      reasons: ['总导演判断本章写前材料可用。'],
      recommendedPlannerAction: directorAction,
      shouldAutoExpandPlanner: false,
      writePreparationBrief,
      episodePlan,
      sceneCards,
      qualityContinuitySceneMap,
    }
  }
  return {
    readiness: director.readiness === 'blocked' ? 'blocked' : 'needs_context',
    statusLabel: director.readiness === 'blocked' ? '需要确认' : '需要修复',
    contextPackageStatus: contextStatus,
    scenePlanStatus,
    reasons: [text(director.blocking_summary), ...requiredRepairs.map((item: AnyRecord) => text(item.detail || item.label))].filter(Boolean).slice(0, 3),
    recommendedPlannerAction: directorAction,
    shouldAutoExpandPlanner: true,
    writePreparationBrief,
    episodePlan,
    sceneCards,
    qualityContinuitySceneMap,
  }
}
```

Preserve old branches as fallback when no director object exists.

- [ ] **Step 4: Verify writing cockpit tests**

Run:

```bash
bun test ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts --test-name-pattern "director|missing writing bible|material score|ready delivered chapter"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add ui/web/src/pages/novel-workspace/writingCockpitModel.ts ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts
git commit -m "feat: surface oh-story director in writing cockpit"
```

---

### Task 6: Task Center Stage Grouping And Blocking Metadata

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/TaskCenterDrawer.tsx`
- Modify: `ui/web/src/pages/novel-workspace/TaskCenterDrawer.test.ts`

- [ ] **Step 1: Write failing task-center tests**

Add tests near `describe('buildTaskRunCardModel', ...)` in `ui/web/src/pages/novel-workspace/TaskCenterDrawer.test.ts`:

```ts
test('summarizes oh-story director stage, blocking status and lifecycle metadata', () => {
  const model = buildTaskRunCardModel({
    run_type: 'generate_prose',
    status: 'completed',
    created_at: '2026-07-03T01:00:00.000Z',
    started_at: '2026-07-03T01:01:00.000Z',
    completed_at: '2026-07-03T01:05:00.000Z',
    input: { unattended: true },
    payload: {
      oh_story_director: {
        stage: 'pre_draft',
        readiness: 'needs_repair',
        primary_action: { key: 'repair_pre_draft_materials', label: '补齐并继续', mode: 'automatic' },
        required_repairs: [{ key: 'blueprint', label: '补蓝图', blocking: true }],
      },
    },
  })

  expect(model.execution.key).toBe('auto')
  expect(model.directorStage?.key).toBe('pre_draft')
  expect(model.directorStage?.label).toBe('写前准备')
  expect(model.blocking.key).toBe('blocking')
  expect(model.timeline.find(item => item.key === 'started')?.value).toContain('2026')
  expect(model.timeline.find(item => item.key === 'ended')?.value).toContain('2026')
})
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
bun test ui/web/src/pages/novel-workspace/TaskCenterDrawer.test.ts --test-name-pattern "director stage"
```

Expected: FAIL because `TaskRunCardModel` has no `directorStage` or `blocking`.

- [ ] **Step 3: Extend task run card model**

In `ui/web/src/pages/novel-workspace/TaskCenterDrawer.tsx`, extend `TaskRunCardModel`:

```ts
directorStage?: {
  key: string
  label: string
  color: TaskRunCardTone
}
blocking: {
  key: 'blocking' | 'non_blocking'
  label: string
  color: TaskRunCardTone
}
```

Add helpers:

```ts
function taskRunDirectorPayload(run: any) {
  const { input, output } = taskRunPayloads(run)
  return output?.oh_story_director
    || output?.ohStoryDirector
    || input?.oh_story_director
    || input?.ohStoryDirector
    || output?.contextPackage?.oh_story_director
    || output?.contextPackage?.ohStoryDirector
    || null
}

function taskRunDirectorStage(run: any): TaskRunCardModel['directorStage'] {
  const director = taskRunDirectorPayload(run)
  const stage = String(director?.stage || '').trim()
  const labels: Record<string, string> = {
    project_creation: '项目创建',
    pre_draft: '写前准备',
    drafting: '正文生成',
    post_draft: '写后诊断',
    handoff: '章节交接',
  }
  if (!stage) return undefined
  return { key: stage, label: labels[stage] || stage, color: stage === 'post_draft' ? 'gold' : 'blue' }
}

function taskRunBlockingState(run: any): TaskRunCardModel['blocking'] {
  const director = taskRunDirectorPayload(run)
  const required = arrayValue(director?.required_repairs || director?.requiredRepairs)
  const blocking = required.some((item: any) => item?.blocking !== false)
    || ['blocked', 'needs_repair', 'needs_user_confirmation'].includes(String(director?.readiness || '').toLowerCase())
  return blocking
    ? { key: 'blocking', label: '阻塞进度', color: 'red' }
    : { key: 'non_blocking', label: '不阻塞', color: 'default' }
}
```

Set these fields in `buildTaskRunCardModel`.

Update `TaskRunCard` tags to show director stage and blocking state next to lifecycle/execution tags.

- [ ] **Step 4: Verify task center tests**

Run:

```bash
bun test ui/web/src/pages/novel-workspace/TaskCenterDrawer.test.ts --test-name-pattern "director stage|buildTaskRunCardModel"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add ui/web/src/pages/novel-workspace/TaskCenterDrawer.tsx ui/web/src/pages/novel-workspace/TaskCenterDrawer.test.ts
git commit -m "feat: show oh-story director task metadata"
```

---

### Task 7: Post-Draft Acceptance And Existing Auto Director Integration

**Files:**
- Modify: `ui/server/src/routes/novel-writing-service.ts`
- Modify: `ui/server/src/routes/novel-writing-service.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/autoCreationDirectorModel.ts`
- Modify: `ui/web/src/pages/novel-workspace/autoCreationDirectorModel.test.ts`
- Modify: `docs/oh-story-adoption-progress.md`

- [ ] **Step 1: Write failing post-draft server tests**

Add a focused test in `ui/server/src/routes/novel-writing-service.test.ts`:

```ts
test('stores post-draft oh-story director with blocker and carry-over separation', () => {
  const director = buildOhStoryDirectorForPostDraft({
    quality: {
      deslop_gate_diagnostics: { failed_count: 0 },
      story_power_sync: { status: 'warn', missed: [{ key: 'feedback' }] },
      delivery_risk_receipt_sync: { missed_count: 0 },
    },
    receipts: { revision_receipts: [{ changed_evidence: '林澈把令牌扣回掌心。' }] },
  })

  expect(director.acceptance).toBe('accepted_with_carryover')
  expect(director.primary_action.key).toBe('continue_next_chapter')
  expect(director.carryover_findings?.[0].key).toBe('story_power')
  expect(director.required_repairs).toHaveLength(0)
})
```

Then add an integration assertion to the prose storage or review payload test that already verifies `oh_story_delivery_receipts`:

```ts
expect(storedChapter.raw_payload.oh_story_director.stage).toBe('post_draft')
expect(storedChapter.raw_payload.oh_story_director.acceptance).toMatch(/accepted|needs_revision/)
```

- [ ] **Step 2: Run server tests and verify integration fails**

Run:

```bash
bun test ui/server/src/routes/novel-writing-service.test.ts --test-name-pattern "post-draft oh-story director|delivery receipts"
```

Expected: helper-level test passes after Task 1, integration assertion fails until storage attaches the post-draft director.

- [ ] **Step 3: Attach post-draft director to stored chapter payloads**

In `ui/server/src/routes/novel-writing-service.ts`, import `buildOhStoryDirectorForPostDraft`. After quality review/self-check/revision payloads are known and before raw payload storage, compute:

```ts
const postDraftDirector = buildOhStoryDirectorForPostDraft({
  quality: qualityPayload,
  receipts: ohStoryDeliveryReceipts,
})
```

Store it under:

```ts
raw_payload: {
  ...rawPayload,
  oh_story_director: postDraftDirector,
  ohStoryDirector: postDraftDirector,
}
```

Preserve existing `oh_story_delivery_receipts` and do not replace quality payloads.

- [ ] **Step 4: Write failing auto-director model test**

Add a test in `ui/web/src/pages/novel-workspace/autoCreationDirectorModel.test.ts`:

```ts
test('uses post-draft oh-story director carry-over as the recommended continuation action', () => {
  const model = buildAutoCreationDirectorModel({
    planning: basePlanning,
    writing: {
      ...baseWriting,
      chapterAcceptanceDesk: {
        ...baseWriting.chapterAcceptanceDesk,
        visible: true,
        recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: '继续下一章' },
      },
    },
    activeTasks: [],
    selectedModelId: 12,
    storyState: { last_updated_chapter: 2 },
    chapters: [{
      id: 2,
      chapter_no: 2,
      title: '巡考夺令',
      status: 'drafted',
      raw_payload: {
        oh_story_director: {
          stage: 'post_draft',
          readiness: 'ready',
          acceptance: 'accepted_with_carryover',
          primary_action: { key: 'continue_next_chapter', label: '继续下一章', mode: 'automatic' },
          carryover_findings: [{ key: 'story_power', label: '故事力续航', detail: '下一章开篇补代价反馈', blocking: false }],
          required_repairs: [],
          deferred_repairs: [],
          selected_contracts: [],
          prompt_budget_plan: { full: [], compact: ['quality_carryover'], reference: [], omit: [] },
          evidence: [],
        },
      },
    }],
    reviews: [],
    runRecords: [],
  } as any)

  expect(model.recommendedAction.key).toBe('continue_next_chapter')
  expect(model.summary).toContain('下一章')
})
```

- [ ] **Step 5: Integrate director action into auto-creation model**

In `ui/web/src/pages/novel-workspace/autoCreationDirectorModel.ts`, add a helper near other chapter handoff helpers:

```ts
function latestChapterOhStoryDirector(chapters: AnyRecord[]) {
  return [...arrayValue(chapters)]
    .sort((a, b) => Number(b.chapter_no || 0) - Number(a.chapter_no || 0))
    .map(chapter => chapter?.raw_payload?.oh_story_director || chapter?.raw_payload?.ohStoryDirector)
    .find(item => item && typeof item === 'object') || null
}
```

When choosing `recommendedAction`, before falling back to generic writing/acceptance actions, prefer a post-draft director with `acceptance === 'accepted_with_carryover'` or `acceptance === 'accepted'`:

```ts
const chapterDirector = latestChapterOhStoryDirector(chapters)
if (chapterDirector?.stage === 'post_draft' && chapterDirector?.primary_action?.key === 'continue_next_chapter') {
  recommendedAction = writingAction('accept_chapter_and_continue', text(chapterDirector.primary_action.label, '继续下一章'))
}
```

Do not override stronger blockers such as failed generation, unresolved repair queue, or manual confirmation.

- [ ] **Step 6: Update oh-story progress note**

In `docs/oh-story-adoption-progress.md`, add under "Next Priority Queue":

```md
The 38-reference migration remains complete. The next product slice is orchestration: the oh-story director layer stages existing contracts, gates, receipts, and repairs so the workspace exposes one readiness state, one primary action, and scoped prompt-budget selection instead of raw rule accumulation.
```

Do not change the summary JSON counts.

- [ ] **Step 7: Verify full targeted suite**

Run:

```bash
bun test ui/server/src/routes/novel-oh-story-director.test.ts
bun test ui/server/src/routes/novel-core-routes.test.ts --test-name-pattern "director|project seed prompt"
bun test ui/server/src/routes/novel-writing-service.test.ts --test-name-pattern "director|delivery receipts|bounded prose prompt"
bun test ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts --test-name-pattern "director|buildWritingCockpitModel"
bun test ui/web/src/pages/novel-workspace/TaskCenterDrawer.test.ts --test-name-pattern "director stage|buildTaskRunCardModel"
bun test ui/web/src/pages/novel-workspace/autoCreationDirectorModel.test.ts --test-name-pattern "oh-story director|recommended continuation"
```

Expected: all targeted tests PASS.

- [ ] **Step 8: Commit**

```bash
git add ui/server/src/routes/novel-writing-service.ts ui/server/src/routes/novel-writing-service.test.ts ui/web/src/pages/novel-workspace/autoCreationDirectorModel.ts ui/web/src/pages/novel-workspace/autoCreationDirectorModel.test.ts docs/oh-story-adoption-progress.md
git commit -m "feat: close oh-story director post-draft loop"
```

---

### Task 8: Final Verification

**Files:**
- No new files unless verification reveals a defect.

- [ ] **Step 1: Run focused server and web suites**

Run:

```bash
bun test ui/server/src/routes/novel-oh-story-director.test.ts
bun run test:novel-server
bun run test:writing-cockpit
```

Expected: PASS. If a focused test times out because of existing unrelated suite size, run the exact failing file and document the timeout with the passing focused tests.

- [ ] **Step 2: Run build check**

Run:

```bash
bun run check
```

Expected: PASS. Existing Vite chunk-size warnings are acceptable; TypeScript/build failures are not.

- [ ] **Step 3: Inspect git diff**

Run:

```bash
git status --short
git diff --stat
git diff --check
```

Expected: only director-layer files and docs changed for this implementation slice, no whitespace errors.

- [ ] **Step 4: Final commit if verification required fixes**

If Step 1-3 required fixes after Task 7, commit them:

```bash
git add <fixed-files>
git commit -m "fix: stabilize oh-story director layer"
```

If no fixes were required, do not create an empty commit.

---

## Rollout Notes

- This plan deliberately avoids a new database table. The director object starts as response/raw-payload data so it can prove product value before schema migration.
- The existing bounded prompt builder remains as a safety net. The director prompt budget should reduce prompt size before the bounded fallback trims text.
- The existing `AutoCreationDirectorWorkspace` remains the visible surface for automatic production. The new director object should feed it, not compete with it.
- The existing task center already tracks lifecycle, execution mode, and timestamps. Extend those models rather than creating a parallel task UI.
- Do not remove existing oh-story contracts or receipt checks in this slice. This upgrade stages and scopes them.

## Completion Criteria

The implementation is complete when current code proves:

- project seed outputs carry `oh_story_director.stage === "project_creation"`;
- pre-draft context packages carry `oh_story_director.stage === "pre_draft"`;
- prose prompts include a compact `【oh-story 总导演】` block and omit selected full contracts when the director budget says to omit them;
- writing cockpit uses the director for one readiness state and one primary action when present;
- task center shows director stage, automatic/manual mode, lifecycle times, and blocking status;
- post-draft stored payloads separate revision blockers from next-chapter carry-over;
- targeted tests, `bun run test:novel-server`, `bun run test:writing-cockpit`, and `bun run check` pass or any pre-existing unrelated failures are explicitly documented.
