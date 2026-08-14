# Writing Skill Full Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the condensed one-shot writing-skill pass with sequential full-chapter passes that feed each enabled vendor SKILL.md (plus matching references), using a polish/rewrite mode for fiction-humanizer-zh and target-based length gates.

**Architecture:** Keep the existing registry in `ui/server/src/novel-writing/writing-skills/`. Vendor the three GitHub skills into `vendor/`. Compile one prompt per skill, run them in fixed order on the whole chapter, accept or roll back per pass, and never let fingerprint veto a kept rewrite. Generation may override enabled flags and mode; revision reads project defaults only.

**Tech Stack:** TypeScript, bun:test, Express project-config routes, Ant Design Switch/Select.

**Spec:** `docs/superpowers/specs/2026-08-13-writing-skill-full-pass-design.md`

**Commit policy:** This repo’s user rule wins over the skill’s “commit every task” default. Skip every Commit step unless the user explicitly asks to commit.

---

## File map

Create:

- `ui/server/src/novel-writing/writing-skills/vendor/**` — frozen SKILL.md + references + `SOURCE.md`
- `ui/server/src/novel-writing/writing-skills/load-vendor.ts` — read and strip vendor markdown
- `ui/server/src/novel-writing/writing-skills/load-vendor.test.ts`
- `ui/server/src/novel-writing/writing-skills/length-bounds.ts` — target-based min/max
- `ui/server/src/novel-writing/writing-skills/length-bounds.test.ts`
- `ui/server/src/novel-writing/writing-skills/chunk-chapter.ts` — 12000 / 6000–8000 splitter
- `ui/server/src/novel-writing/writing-skills/chunk-chapter.test.ts`

Modify:

- `ui/server/src/novel-writing/writing-skills/types.ts` — mode + v2 report types
- `ui/server/src/novel-writing/writing-skills/registry.ts` — mode default + per-skill progress labels
- `ui/server/src/novel-writing/writing-skills/resolve-enabled.ts` — resolve `fiction_humanizer_mode`
- `ui/server/src/novel-writing/writing-skills/compile-pass-prompt.ts` — one skill + full vendor text
- `ui/server/src/novel-writing/writing-skills/accept-candidate.ts` — new bounds; no ±15%; no fingerprint veto
- `ui/server/src/novel-writing/writing-skills/index.ts` — re-exports
- `ui/server/src/novel-writing-service/service/writing-skill-humanize-methods.ts` — sequential runner, v2 report
- `ui/server/src/novel-writing-service/service/generate-chapter-post-draft-finalize.ts` — v2 + per-skill progress
- `ui/server/src/routes/novel-project-config-routes.ts` — persist mode
- `ui/server/src/routes/novel-editor/revision-writing-skill-humanize.ts` — apply via `changed`
- `ui/server/src/routes/novel-editor/revision-worker.ts` — v2 skipped report; still no generation override
- `ui/server/src/routes/novel-editor/builders-revision-prompts.ts` — stop injecting condensed 轻改 rules
- `ui/server/src/routes/novel-generation/builders.ts` — optional per-skill label
- `ui/web/src/pages/novel-workspace/writingSkillsModel.ts` — mode resolve + payload
- `ui/web/src/pages/novel-workspace/ProjectSettingsModal.tsx` — 精修/重写 next to 小说去AI味
- `ui/web/src/pages/novel-workspace/workspace-center-editor-controls.tsx` — generation override for mode
- `ui/web/src/pages/novel-workspace/useNovelProjectWorkspaceUiState.ts` — include mode in generation payload
- `ui/web/src/pages/novel-workspace/shell/use-novel-workspace-base-model.tsx` — hydrate mode from project

Do not touch:

- `ui/server/src/skills` canvas installer
- `ChapterTaskStage` enum
- server standard-chapter target 4200 in `word-target.ts`

---

### Task 1: Vendor the three skills into the repo

**Files:**
- Create: `ui/server/src/novel-writing/writing-skills/vendor/SOURCE.md`
- Create: the seven markdown files listed below
- Create: `ui/server/src/novel-writing/writing-skills/load-vendor.ts`
- Test: `ui/server/src/novel-writing/writing-skills/load-vendor.test.ts`

Download only these files (do not copy `scripts/`, `agents/`, README, or LICENSE into the runtime tree):

```
vendor/fiction-humanizer-zh/SKILL.md
vendor/fiction-humanizer-zh/references/ai-fiction-patterns.md
vendor/fiction-humanizer-zh/references/scene-rewrite.md
vendor/fiction-humanizer-zh/references/chapter-checklist.md
vendor/fiction-humanizer-zh/references/genre-notes.md
vendor/remove-ai-flavor/SKILL.md
vendor/humanizer-zh/SKILL.md
```

URLs (main at plan time; record the blob SHA you actually downloaded in `SOURCE.md`):

- https://raw.githubusercontent.com/deedeekong07-alt/fiction-humanizer-zh/main/SKILL.md
- https://raw.githubusercontent.com/deedeekong07-alt/fiction-humanizer-zh/main/references/ai-fiction-patterns.md
- https://raw.githubusercontent.com/deedeekong07-alt/fiction-humanizer-zh/main/references/scene-rewrite.md
- https://raw.githubusercontent.com/deedeekong07-alt/fiction-humanizer-zh/main/references/chapter-checklist.md
- https://raw.githubusercontent.com/deedeekong07-alt/fiction-humanizer-zh/main/references/genre-notes.md
- https://raw.githubusercontent.com/B1lli/remove-ai-flavor-writing-skill/main/SKILL.md
- https://raw.githubusercontent.com/op7418/Humanizer-zh/main/SKILL.md

- [ ] **Step 1: Write the failing loader test**

```ts
import { describe, expect, test } from 'bun:test'
import { loadVendorSkillMarkdown, stripVendorSkillMarkdown } from './load-vendor'

describe('loadVendorSkillMarkdown', () => {
  test('loads fiction-humanizer skill without frontmatter or star/audit chrome', () => {
    const text = loadVendorSkillMarkdown('fiction-humanizer-zh')
    expect(text).toContain('# 中文小说去 AI 味')
    expect(text).toContain('## Workflow')
    expect(text).toContain('## Edit Modes')
    expect(text).not.toMatch(/^---/)
    expect(text).not.toContain('name: fiction-humanizer-zh')
  })

  test('loads fiction-humanizer references by name', () => {
    const patterns = loadVendorSkillMarkdown('fiction-humanizer-zh', 'ai-fiction-patterns.md')
    const scene = loadVendorSkillMarkdown('fiction-humanizer-zh', 'scene-rewrite.md')
    const checklist = loadVendorSkillMarkdown('fiction-humanizer-zh', 'chapter-checklist.md')
    const genre = loadVendorSkillMarkdown('fiction-humanizer-zh', 'genre-notes.md')
    expect(patterns.length).toBeGreaterThan(200)
    expect(scene.length).toBeGreaterThan(200)
    expect(checklist.length).toBeGreaterThan(200)
    expect(genre.length).toBeGreaterThan(200)
  })

  test('strips remove-ai-flavor star and local audit sections', () => {
    const text = loadVendorSkillMarkdown('remove-ai-flavor')
    expect(text).toContain('# Remove AI Flavor')
    expect(text).toContain('Binary Contrast Shells')
    expect(text).not.toContain('gh repo star')
    expect(text).not.toContain('python3 scripts/audit_ai_flavor.py')
  })

  test('strips humanizer-zh frontmatter, allowed-tools, score table, and dual output format', () => {
    const text = loadVendorSkillMarkdown('humanizer-zh')
    expect(text).toContain('# Humanizer-zh')
    expect(text).toContain('删除填充短语')
    expect(text).not.toContain('allowed-tools')
    expect(text).not.toContain('## 质量评分')
    expect(text).not.toContain('所做更改的简要总结')
  })

  test('stripVendorSkillMarkdown is idempotent on already-stripped text', () => {
    const once = stripVendorSkillMarkdown('---\nname: x\n---\n# Title\n\n## Star\nplease star\n')
    expect(once).toBe('# Title')
    expect(stripVendorSkillMarkdown(once)).toBe('# Title')
  })
})
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `cd ui/server && bun test src/novel-writing/writing-skills/load-vendor.test.ts`

Expected: FAIL because `./load-vendor` does not exist.

- [ ] **Step 3: Download vendor files and write the loader**

```bash
BASE=ui/server/src/novel-writing/writing-skills/vendor
mkdir -p "$BASE/fiction-humanizer-zh/references" "$BASE/remove-ai-flavor" "$BASE/humanizer-zh"
curl -fsSL https://raw.githubusercontent.com/deedeekong07-alt/fiction-humanizer-zh/main/SKILL.md \
  -o "$BASE/fiction-humanizer-zh/SKILL.md"
curl -fsSL https://raw.githubusercontent.com/deedeekong07-alt/fiction-humanizer-zh/main/references/ai-fiction-patterns.md \
  -o "$BASE/fiction-humanizer-zh/references/ai-fiction-patterns.md"
curl -fsSL https://raw.githubusercontent.com/deedeekong07-alt/fiction-humanizer-zh/main/references/scene-rewrite.md \
  -o "$BASE/fiction-humanizer-zh/references/scene-rewrite.md"
curl -fsSL https://raw.githubusercontent.com/deedeekong07-alt/fiction-humanizer-zh/main/references/chapter-checklist.md \
  -o "$BASE/fiction-humanizer-zh/references/chapter-checklist.md"
curl -fsSL https://raw.githubusercontent.com/deedeekong07-alt/fiction-humanizer-zh/main/references/genre-notes.md \
  -o "$BASE/fiction-humanizer-zh/references/genre-notes.md"
curl -fsSL https://raw.githubusercontent.com/B1lli/remove-ai-flavor-writing-skill/main/SKILL.md \
  -o "$BASE/remove-ai-flavor/SKILL.md"
curl -fsSL https://raw.githubusercontent.com/op7418/Humanizer-zh/main/SKILL.md \
  -o "$BASE/humanizer-zh/SKILL.md"
```

Write `SOURCE.md` with repo URLs, `ref: main`, download date `2026-08-13`, and the note “runtime never fetches GitHub.”

Implement `load-vendor.ts`:

```ts
import { readFileSync } from 'fs'
import { join } from 'path'
import type { WritingSkillId } from './types'

const VENDOR_ROOT = join(import.meta.dir, 'vendor')

const SKILL_DIR: Record<WritingSkillId, string> = {
  'fiction-humanizer-zh': 'fiction-humanizer-zh',
  'remove-ai-flavor': 'remove-ai-flavor',
  'humanizer-zh': 'humanizer-zh',
}

export function stripVendorSkillMarkdown(raw: string): string {
  let text = String(raw || '').replace(/^\uFEFF/, '')
  text = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
  text = text.replace(/\r?\n## Optional Local Audit\r?\n[\s\S]*?(?=\r?\n## |\s*$)/i, '\n')
  text = text.replace(/\r?\n## Star\r?\n[\s\S]*$/i, '\n')
  text = text.replace(/\r?\n## 输出格式\r?\n[\s\S]*?(?=\r?\n## |\s*$)/g, '\n')
  text = text.replace(/\r?\n## 质量评分\r?\n[\s\S]*?(?=\r?\n## 完整示例|\r?\n## 参考|\s*$)/g, '\n')
  return text.replace(/\n{3,}/g, '\n\n').trim()
}

export function loadVendorSkillMarkdown(id: WritingSkillId, referenceFile?: string): string {
  const dir = SKILL_DIR[id]
  const rel = referenceFile
    ? join(dir, 'references', referenceFile)
    : join(dir, 'SKILL.md')
  const raw = readFileSync(join(VENDOR_ROOT, rel), 'utf8')
  return stripVendorSkillMarkdown(raw)
}
```

- [ ] **Step 4: Re-run the loader tests**

Run: `cd ui/server && bun test src/novel-writing/writing-skills/load-vendor.test.ts`

Expected: PASS. If a heading differs from the live snapshot, assert the heading that is actually in the downloaded file; do not rewrite the vendor markdown.

- [ ] **Step 5: Commit** (skip unless the user asked)

```bash
git add ui/server/src/novel-writing/writing-skills/vendor ui/server/src/novel-writing/writing-skills/load-vendor.ts ui/server/src/novel-writing/writing-skills/load-vendor.test.ts
git commit -m "$(cat <<'EOF'
Add vendored writing-skill markdown for full-pass prompts.

EOF
)"
```

---

### Task 2: Resolve fiction-humanizer mode

**Files:**
- Modify: `ui/server/src/novel-writing/writing-skills/types.ts`
- Modify: `ui/server/src/novel-writing/writing-skills/registry.ts`
- Modify: `ui/server/src/novel-writing/writing-skills/resolve-enabled.ts`
- Modify: `ui/server/src/novel-writing/writing-skills/resolve-enabled.test.ts`
- Modify: `ui/server/src/novel-writing/writing-skills/index.ts`

- [ ] **Step 1: Extend the existing resolve tests**

Add these cases to `resolve-enabled.test.ts` (keep the current enabled-flag tests):

```ts
import { DEFAULT_FICTION_HUMANIZER_MODE } from './registry'
import { resolveWritingSkillsEnabled } from './resolve-enabled'

test('defaults fiction_humanizer_mode to polish', () => {
  expect(resolveWritingSkillsEnabled().fiction_humanizer_mode).toBe(DEFAULT_FICTION_HUMANIZER_MODE)
})

test('reads project mode and ignores illegal values', () => {
  expect(resolveWritingSkillsEnabled({
    project: { reference_config: { writing_skills: { fiction_humanizer_mode: 'rewrite' } } },
  }).fiction_humanizer_mode).toBe('rewrite')

  expect(resolveWritingSkillsEnabled({
    project: { reference_config: { writing_skills: { fiction_humanizer_mode: 'light' } } },
  }).fiction_humanizer_mode).toBe('polish')
})

test('generation override wins for mode without flipping omitted enabled keys', () => {
  const resolved = resolveWritingSkillsEnabled({
    project: {
      reference_config: {
        writing_skills: {
          enabled: { 'humanizer-zh': true },
          fiction_humanizer_mode: 'polish',
        },
      },
    },
    override: { fiction_humanizer_mode: 'rewrite' },
  })
  expect(resolved.fiction_humanizer_mode).toBe('rewrite')
  expect(resolved.enabled['humanizer-zh']).toBe(true)
  expect(resolved.ids).toEqual(['fiction-humanizer-zh', 'remove-ai-flavor', 'humanizer-zh'])
})
```

- [ ] **Step 2: Run and confirm the new cases fail**

Run: `cd ui/server && bun test src/novel-writing/writing-skills/resolve-enabled.test.ts`

Expected: FAIL on `fiction_humanizer_mode` (property missing).

- [ ] **Step 3: Implement types, registry, and resolve**

In `types.ts`, add mode onto the existing shapes (do not rename `resolveWritingSkillsEnabled`):

```ts
export type FictionHumanizerMode = 'polish' | 'rewrite'

export type WritingSkillsConfig = {
  enabled?: Record<string, unknown>
  fiction_humanizer_mode?: unknown
}

export type WritingSkillsResolveInput = {
  project?: {
    reference_config?: {
      writing_skills?: WritingSkillsConfig
    }
  } | null
  override?: WritingSkillsConfig | Record<string, unknown> | null
}

export type ResolvedWritingSkills = {
  enabled: WritingSkillEnabledMap
  ids: WritingSkillId[]
  fiction_humanizer_mode: FictionHumanizerMode
}
```

In `registry.ts`:

```ts
export const DEFAULT_FICTION_HUMANIZER_MODE: FictionHumanizerMode = 'polish'

export const WRITING_SKILL_STAGE_LABEL: Record<WritingSkillId, string> = {
  'fiction-humanizer-zh': '写作skill · 小说去AI味',
  'remove-ai-flavor': '写作skill · 去句壳',
  'humanizer-zh': '写作skill · 维基去AI词',
}

export function isFictionHumanizerMode(value: unknown): value is FictionHumanizerMode {
  return value === 'polish' || value === 'rewrite'
}
```

In `resolve-enabled.ts`, read mode from the same object that holds `enabled`. Project first, then override. Illegal / missing → `polish`.

```ts
function asConfigRecord(value: unknown): WritingSkillsConfig | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as WritingSkillsConfig
}

function resolveMode(...layers: Array<unknown>): FictionHumanizerMode {
  let mode = DEFAULT_FICTION_HUMANIZER_MODE
  for (const layer of layers) {
    const config = asConfigRecord(layer)
    if (isFictionHumanizerMode(config?.fiction_humanizer_mode)) {
      mode = config.fiction_humanizer_mode
    }
  }
  return mode
}
```

`asEnabledRecord` stays as-is (it already unwraps `.enabled`). `pickWritingSkillsOverride` still returns `options?.writing_skills ?? options?.writingSkills`.

Export the new symbols from `index.ts`.

- [ ] **Step 4: Re-run resolve tests**

Run: `cd ui/server && bun test src/novel-writing/writing-skills/resolve-enabled.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit** (skip unless the user asked)

---

### Task 3: Target-based length bounds

**Files:**
- Create: `ui/server/src/novel-writing/writing-skills/length-bounds.ts`
- Test: `ui/server/src/novel-writing/writing-skills/length-bounds.test.ts`

Do **not** reuse `resolveRevisionCandidateLengthBounds`. That helper uses the chapter target *min* as a floor once the source is already above it (3780 for a standard 4200 chapter). This pass uses the spec floor: `max(800, ceil(source * 0.70))`, then 2700 for standard chapters.

- [ ] **Step 1: Write failing bounds tests**

```ts
import { describe, expect, test } from 'bun:test'
import { resolveWritingSkillLengthBounds } from './length-bounds'

const standard = { mode: 'standard' as const, target: 4200, min: 3780, max: 4620, label: '标准章', rangeText: '3780-4620 字' }

describe('resolveWritingSkillLengthBounds', () => {
  test('lets a 3500-char standard chapter grow to 4300 and rejects 800', () => {
    const bounds = resolveWritingSkillLengthBounds({
      sourceChars: 3500,
      wordTarget: standard,
    })
    expect(bounds.min).toBe(2700)
    expect(bounds.max).toBe(4620)
    expect(3500 >= bounds.min && 4300 <= bounds.max).toBe(true)
    expect(800 >= bounds.min).toBe(false)
  })

  test('uses 70% of source when that is higher than 2700', () => {
    const bounds = resolveWritingSkillLengthBounds({
      sourceChars: 4000,
      wordTarget: standard,
    })
    expect(bounds.min).toBe(2800)
    expect(bounds.max).toBe(4620)
  })

  test('forces under-2700 standard drafts to grow', () => {
    const bounds = resolveWritingSkillLengthBounds({
      sourceChars: 2000,
      wordTarget: standard,
    })
    expect(bounds.min).toBe(2700)
    expect(bounds.max).toBe(4620)
  })

  test('caps over-target chapters to about 5% slack', () => {
    const bounds = resolveWritingSkillLengthBounds({
      sourceChars: 4712,
      wordTarget: standard,
    })
    expect(bounds.min).toBe(Math.max(800, Math.ceil(4712 * 0.70), 2700))
    expect(bounds.max).toBe(4712 + Math.max(200, Math.floor(4712 * 0.05)))
  })

  test('does not apply the 2700 floor to long or custom chapters', () => {
    const long = resolveWritingSkillLengthBounds({
      sourceChars: 2000,
      wordTarget: { mode: 'long', target: 10000, min: 9000, max: 11000, label: '长章', rangeText: '' },
    })
    expect(long.min).toBe(Math.max(800, Math.ceil(2000 * 0.70)))
    expect(long.max).toBe(11000)

    const custom = resolveWritingSkillLengthBounds({
      sourceChars: 2000,
      wordTarget: { mode: 'custom', target: 1500, min: 1350, max: 1650, label: '自定义', rangeText: '' },
    })
    expect(custom.min).toBe(Math.max(800, Math.ceil(2000 * 0.70)))
    expect(custom.max).toBe(Math.max(Math.floor(2000 * 1.30), 1650))
  })

  test('falls back to ±30% when no word target exists', () => {
    const bounds = resolveWritingSkillLengthBounds({ sourceChars: 1000 })
    expect(bounds.min).toBe(800)
    expect(bounds.max).toBe(1300)
  })
})
```

- [ ] **Step 2: Run and confirm FAIL**

Run: `cd ui/server && bun test src/novel-writing/writing-skills/length-bounds.test.ts`

Expected: FAIL because the module is missing.

- [ ] **Step 3: Implement bounds**

```ts
import type { ChapterWordTarget } from '../word-target'

export const WRITING_SKILL_HARD_FLOOR = 800
export const WRITING_SKILL_STANDARD_FLOOR = 2700
export const WRITING_SKILL_GROWTH_RATIO = 1.30
export const WRITING_SKILL_SHRINK_RATIO = 0.70
export const WRITING_SKILL_OVER_TARGET_SLACK_RATIO = 0.05
export const WRITING_SKILL_OVER_TARGET_SLACK_MIN = 200

export function resolveWritingSkillLengthBounds(input: {
  sourceChars: number
  wordTarget?: Pick<ChapterWordTarget, 'mode' | 'min' | 'max' | 'target'> | null
}): { min: number; max: number } {
  const source = Math.max(0, Math.floor(Number(input.sourceChars) || 0))
  const sourceFloor = Math.max(WRITING_SKILL_HARD_FLOOR, Math.ceil(source * WRITING_SKILL_SHRINK_RATIO))
  const sourceCeil = Math.floor(source * WRITING_SKILL_GROWTH_RATIO)
  const mode = String(input.wordTarget?.mode || '')
  const targetMax = Math.max(0, Math.floor(Number(input.wordTarget?.max || 0)))
  const hasTarget = Boolean(input.wordTarget && (targetMax || input.wordTarget.target))
  const standardFloor = mode === 'long' || mode === 'custom' ? 0 : WRITING_SKILL_STANDARD_FLOOR
  const min = Math.max(sourceFloor, standardFloor)

  if (!hasTarget) {
    return { min, max: Math.max(min, sourceCeil) }
  }
  if (targetMax > 0 && source > targetMax) {
    const slack = Math.max(WRITING_SKILL_OVER_TARGET_SLACK_MIN, Math.floor(source * WRITING_SKILL_OVER_TARGET_SLACK_RATIO))
    return { min, max: source + slack }
  }
  return { min, max: Math.max(sourceCeil, targetMax) }
}
```

Missing `mode` on a target object counts as standard (apply 2700).

Export `resolveWritingSkillLengthBounds` from `ui/server/src/novel-writing/writing-skills/index.ts`.

- [ ] **Step 4: Re-run bounds tests**

Run: `cd ui/server && bun test src/novel-writing/writing-skills/length-bounds.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit** (skip unless the user asked)

---

### Task 4: Accept candidate with the new gate

**Files:**
- Modify: `ui/server/src/novel-writing/writing-skills/accept-candidate.ts`
- Modify: `ui/server/src/novel-writing/writing-skills/accept-candidate.test.ts`

Fingerprint stays out of this function. The runner records fingerprint warnings later.

- [ ] **Step 1: Replace the accept tests**

Keep the author-soul test. Change length cases to use an explicit word target:

```ts
import { describe, expect, test } from 'bun:test'
import { acceptWritingSkillCandidate } from './accept-candidate'

const SOURCE_3500 = '林序沿着走廊往前走，纸条边角硌着手指。'.repeat(80)
const GROW_4300 = `${SOURCE_3500}${'他听见灯管又响了一下，没有回头。'.repeat(20)}`
const COLLAPSE_800 = '林序走了。他没有停。走廊空了。'.repeat(20)
const standard = { mode: 'standard' as const, target: 4200, min: 3780, max: 4620, label: '标准章', rangeText: '' }

describe('acceptWritingSkillCandidate', () => {
  test('accepts a 3500-to-4300 polish against the standard chapter target', () => {
    const gate = acceptWritingSkillCandidate({
      sourceText: SOURCE_3500,
      candidateText: GROW_4300,
      enabledIds: ['fiction-humanizer-zh'],
      wordTarget: standard,
    })
    expect(gate.accepted).toBe(true)
    expect(gate.text).toBe(GROW_4300.replace(/^\s+|\s+$/g, ''))
  })

  test('rejects an 800-char collapse of a 3500-char standard chapter', () => {
    const gate = acceptWritingSkillCandidate({
      sourceText: SOURCE_3500,
      candidateText: COLLAPSE_800,
      enabledIds: ['fiction-humanizer-zh'],
      wordTarget: standard,
    })
    expect(gate.accepted).toBe(false)
    expect(gate.text).toBe(SOURCE_3500)
    expect(gate.reason).toBe('writing_skill_length')
  })

  test('rejects author-soul leakage only when humanizer-zh is enabled', () => {
    const leaked = `${SOURCE_3500}我真的不知道该怎么看待。`
    const withSafety = acceptWritingSkillCandidate({
      sourceText: SOURCE_3500,
      candidateText: leaked,
      enabledIds: ['humanizer-zh'],
      wordTarget: standard,
    })
    expect(withSafety.accepted).toBe(false)
    expect(withSafety.reason).toBe('writing_skill_author_soul')

    const withoutSafety = acceptWritingSkillCandidate({
      sourceText: SOURCE_3500,
      candidateText: leaked,
      enabledIds: ['fiction-humanizer-zh'],
      wordTarget: standard,
    })
    expect(withoutSafety.accepted).toBe(true)
  })
})
```

If `SOURCE_3500` is not actually ~3500 compact chars, adjust the repeat count so `countProseChars(SOURCE_3500)` is 3400–3600 before asserting.

- [ ] **Step 2: Run and confirm FAIL**

Run: `cd ui/server && bun test src/novel-writing/writing-skills/accept-candidate.test.ts`

Expected: FAIL because the current gate still uses ±15% via `acceptHumanizePostProcessCandidate`.

- [ ] **Step 3: Rewrite accept-candidate**

```ts
import { stripHumanizeChatWrapper } from '../humanize-dual-pass'
import { selectContinuitySafeProseCandidate } from '../prose-candidate-continuity'
import { countProseChars, type ChapterWordTarget } from '../word-target'
import { resolveWritingSkillLengthBounds } from './length-bounds'
import type { WritingSkillId } from './types'

const AUTHOR_SOUL_RE = /我真的不知道|我一直在想|让我困扰的是|我不知道该怎么看待|作为作者/
const CHAT_SHELL_RE = /^(好的|当然|以下是|改写后的正文[:：])/m

export function hasAuthorSoulLeak(sourceText: string, candidateText: string): boolean {
  const source = String(sourceText || '')
  const candidate = String(candidateText || '')
  if (!AUTHOR_SOUL_RE.test(candidate)) return false
  return !AUTHOR_SOUL_RE.test(source)
}

export function acceptWritingSkillCandidate(input: {
  sourceText: string
  candidateText: string
  enabledIds: WritingSkillId[]
  wordTarget?: ChapterWordTarget | null
  contextPackage?: any
}): { text: string; accepted: boolean; reason: string } {
  const source = String(input.sourceText || '')
  const candidate = stripHumanizeChatWrapper(String(input.candidateText || '')).trim()
  if (!candidate) {
    return { text: source, accepted: false, reason: 'writing_skill_empty_candidate' }
  }
  if (CHAT_SHELL_RE.test(candidate) && !CHAT_SHELL_RE.test(source)) {
    return { text: source, accepted: false, reason: 'writing_skill_chat_shell' }
  }
  if (input.enabledIds.includes('humanizer-zh') && hasAuthorSoulLeak(source, candidate)) {
    return { text: source, accepted: false, reason: 'writing_skill_author_soul' }
  }
  const chars = countProseChars(candidate)
  const bounds = resolveWritingSkillLengthBounds({
    sourceChars: countProseChars(source),
    wordTarget: input.wordTarget
      || input.contextPackage?.chapter_target?.word_target
      || input.contextPackage?.chapterTarget?.word_target
      || null,
  })
  if (chars < bounds.min || chars > bounds.max) {
    return { text: source, accepted: false, reason: 'writing_skill_length' }
  }
  if (input.contextPackage) {
    const continuity = selectContinuitySafeProseCandidate(
      source,
      candidate,
      input.contextPackage,
      { candidate_stage: 'writing_skill_humanize' },
    )
    if (!continuity.accepted) {
      return {
        text: source,
        accepted: false,
        reason: continuity.warning?.code || 'writing_skill_continuity',
      }
    }
  }
  return { text: candidate, accepted: true, reason: '' }
}
```

- [ ] **Step 4: Re-run accept tests**

Run: `cd ui/server && bun test src/novel-writing/writing-skills/accept-candidate.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit** (skip unless the user asked)

---

### Task 5: Compile one full-skill prompt

**Files:**
- Modify: `ui/server/src/novel-writing/writing-skills/compile-pass-prompt.ts`
- Modify: `ui/server/src/novel-writing/writing-skills/compile-pass-prompt.test.ts`

The function signature changes from `{ enabledIds }` to `{ skillId, mode, sourceText, project, contextPackage, chunk }`. Delete condensed directive tables. Stop exporting a useful `compileWritingSkillRevisionDirectives` — make it return `''` so leftover imports compile, then remove call sites in Task 9.

- [ ] **Step 1: Replace compile-pass-prompt tests**

```ts
import { describe, expect, test } from 'bun:test'
import { compileWritingSkillPassPrompt } from './compile-pass-prompt'

const SOURCE = '林序把门带上，沿着走廊继续往前。'

describe('compileWritingSkillPassPrompt', () => {
  test('polish prompt includes full skill, three fixed refs, and no 轻改 default', () => {
    const prompt = compileWritingSkillPassPrompt({
      skillId: 'fiction-humanizer-zh',
      mode: 'polish',
      sourceText: SOURCE,
    })
    expect(prompt).toContain('只输出改写后正文')
    expect(prompt).toContain('档位：精修')
    expect(prompt).toContain('可重排段落')
    expect(prompt).toContain('必须补铺垫')
    expect(prompt).toContain('# 中文小说去 AI 味')
    expect(prompt).toContain('## Workflow')
    expect(prompt).toContain('【参考 · ai-fiction-patterns.md】')
    expect(prompt).toContain('【参考 · scene-rewrite.md】')
    expect(prompt).toContain('【参考 · chapter-checklist.md】')
    expect(prompt).not.toContain('【参考 · genre-notes.md】')
    expect(prompt).not.toContain('轻改：保留原段落顺序')
    expect(prompt).not.toContain('±15%')
    expect(prompt).toContain(SOURCE)
    expect(prompt).not.toContain('# Remove AI Flavor')
  })

  test('rewrite mode and genre notes appear when requested', () => {
    const prompt = compileWritingSkillPassPrompt({
      skillId: 'fiction-humanizer-zh',
      mode: 'rewrite',
      sourceText: SOURCE,
      project: { genre: '规则怪谈' },
    })
    expect(prompt).toContain('档位：重写')
    expect(prompt).toContain('可重构场景链')
    expect(prompt).toContain('【参考 · genre-notes.md】')
  })

  test('remove-ai-flavor does not include fiction-humanizer references', () => {
    const prompt = compileWritingSkillPassPrompt({
      skillId: 'remove-ai-flavor',
      sourceText: SOURCE,
    })
    expect(prompt).toContain('# Remove AI Flavor')
    expect(prompt).not.toContain('【参考 · ai-fiction-patterns.md】')
    expect(prompt).not.toContain('档位：')
  })

  test('humanizer-zh adds the fiction safety sleeve', () => {
    const prompt = compileWritingSkillPassPrompt({
      skillId: 'humanizer-zh',
      sourceText: SOURCE,
    })
    expect(prompt).toContain('# Humanizer-zh')
    expect(prompt).toContain('【小说安全套 · humanizer-zh】')
    expect(prompt).toContain('禁止第一人称作者旁白')
    expect(prompt).not.toContain('## 质量评分')
  })

  test('chunk hint names the segment index', () => {
    const prompt = compileWritingSkillPassPrompt({
      skillId: 'remove-ai-flavor',
      sourceText: SOURCE,
      chunk: { index: 1, total: 2 },
    })
    expect(prompt).toContain('这是第 2/2 段')
    expect(prompt).toContain('前后文已锁定')
  })
})
```

- [ ] **Step 2: Run and confirm FAIL**

Run: `cd ui/server && bun test src/novel-writing/writing-skills/compile-pass-prompt.test.ts`

Expected: FAIL on the new `skillId` argument / missing vendor headings.

- [ ] **Step 3: Rewrite the compiler**

```ts
import { loadVendorSkillMarkdown } from './load-vendor'
import type { FictionHumanizerMode, WritingSkillId } from './types'

const SHARED_FICTION_CONTRACT = [
  '【总合同】',
  '不改主线、人物关系、时间线、已有伏笔和关键设定。',
  '不编造原文没有的经历、数据、笑话或个人轶事。',
  '不输出分析、清单、评分或 markdown。',
  '只输出改写后正文。',
]

const HUMANIZER_ZH_FICTION_SAFETY = [
  '【小说安全套 · humanizer-zh】',
  '禁止第一人称作者旁白（“我一直在想”“我真的不知道该怎么看待”“让我困扰的是”）。',
  '禁止为了“注入灵魂”编造原文没有的经历或作者评论。',
  '禁止改主线。只用角色动作、对白和现场细节补质感，不用作者“我”。',
]

function resolveGenre(project?: any, contextPackage?: any): string {
  return String(
    project?.genre
    || contextPackage?.project?.genre
    || contextPackage?.writing_bible?.genre
    || '',
  ).trim()
}

function modeLines(mode: FictionHumanizerMode): string[] {
  if (mode === 'rewrite') {
    return [
      '档位：重写。',
      '可重构场景链，仍锁人物、设定和章节功能。',
    ]
  }
  return [
    '档位：精修。',
    '可重排段落，必须补铺垫、过程、余波。',
  ]
}

export function compileWritingSkillPassPrompt(input: {
  skillId: WritingSkillId
  mode?: FictionHumanizerMode
  sourceText: string
  project?: any
  contextPackage?: any
  chunk?: { index: number; total: number }
}): string {
  const mode = input.mode === 'rewrite' ? 'rewrite' : 'polish'
  const title = input.project?.title ? `项目：${input.project.title}` : ''
  const chunk = input.chunk && input.chunk.total > 1
    ? `这是第 ${input.chunk.index + 1}/${input.chunk.total} 段，前后文已锁定，不要改本章未给出的情节。`
    : ''
  const parts = [
    `任务：按 ${input.skillId} 对小说正文做去 AI 味改写。只输出改写后正文。`,
    title,
    input.skillId === 'fiction-humanizer-zh' ? modeLines(mode).join('') : '',
    ...SHARED_FICTION_CONTRACT,
    chunk,
    '【SKILL.md】',
    loadVendorSkillMarkdown(input.skillId),
  ]
  if (input.skillId === 'fiction-humanizer-zh') {
    for (const file of ['ai-fiction-patterns.md', 'scene-rewrite.md', 'chapter-checklist.md']) {
      parts.push(`【参考 · ${file}】`, loadVendorSkillMarkdown('fiction-humanizer-zh', file))
    }
    if (resolveGenre(input.project, input.contextPackage)) {
      parts.push('【参考 · genre-notes.md】', loadVendorSkillMarkdown('fiction-humanizer-zh', 'genre-notes.md'))
    }
  }
  if (input.skillId === 'humanizer-zh') parts.push(...HUMANIZER_ZH_FICTION_SAFETY)
  parts.push('【原文】', String(input.sourceText || '').trim())
  return parts.filter(Boolean).join('\n')
}

export function compileWritingSkillRevisionDirectives(_enabledIds: WritingSkillId[] = []): string {
  return ''
}
```

- [ ] **Step 4: Re-run compile tests**

Run: `cd ui/server && bun test src/novel-writing/writing-skills/compile-pass-prompt.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit** (skip unless the user asked)

---

### Task 6: Chunk only above 12000 chars

**Files:**
- Create: `ui/server/src/novel-writing/writing-skills/chunk-chapter.ts`
- Test: `ui/server/src/novel-writing/writing-skills/chunk-chapter.test.ts`

- [ ] **Step 1: Write failing chunk tests**

```ts
import { describe, expect, test } from 'bun:test'
import { countProseChars } from '../word-target'
import { chunkWritingSkillChapter } from './chunk-chapter'

describe('chunkWritingSkillChapter', () => {
  test('keeps a normal chapter as one chunk', () => {
    const text = '林序把门带上。\n\n走廊里只剩灯管声。'.repeat(80)
    expect(countProseChars(text)).toBeLessThan(12000)
    const chunks = chunkWritingSkillChapter(text)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toMatchObject({ index: 0, total: 1, text })
  })

  test('splits a 13000-char chapter on blank lines into 6000-8000 char pieces', () => {
    const block = `${'林序继续往前走，纸条边角硌着手指。'.repeat(40)}\n\n`
    const text = block.repeat(20)
    expect(countProseChars(text)).toBeGreaterThan(12000)
    const chunks = chunkWritingSkillChapter(text)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks[0].total).toBe(chunks.length)
    for (const chunk of chunks) {
      const chars = countProseChars(chunk.text)
      expect(chars).toBeGreaterThanOrEqual(4000)
      expect(chars).toBeLessThanOrEqual(8000)
    }
    expect(chunks.map(item => item.text).join('\n\n')).toContain('林序继续往前走')
  })
})
```

- [ ] **Step 2: Run and confirm FAIL**

Run: `cd ui/server && bun test src/novel-writing/writing-skills/chunk-chapter.test.ts`

Expected: FAIL because the module is missing.

- [ ] **Step 3: Implement the splitter**

```ts
import { countProseChars } from '../word-target'

export const WRITING_SKILL_CHUNK_THRESHOLD = 12000
export const WRITING_SKILL_CHUNK_TARGET = 7000
export const WRITING_SKILL_CHUNK_MAX = 8000

export type WritingSkillChunk = {
  index: number
  total: number
  text: string
}

export function chunkWritingSkillChapter(text: string): WritingSkillChunk[] {
  const source = String(text || '')
  if (countProseChars(source) <= WRITING_SKILL_CHUNK_THRESHOLD) {
    return [{ index: 0, total: 1, text: source }]
  }
  const paras = source.replace(/\r/g, '').split(/\n\n+/)
  const packed: string[] = []
  let buf: string[] = []
  let bufChars = 0
  const flush = () => {
    if (!buf.length) return
    packed.push(buf.join('\n\n'))
    buf = []
    bufChars = 0
  }
  for (const para of paras) {
    const chars = countProseChars(para)
    if (bufChars > 0 && bufChars + chars > WRITING_SKILL_CHUNK_MAX) flush()
    if (chars > WRITING_SKILL_CHUNK_MAX) {
      flush()
      packed.push(para)
      continue
    }
    buf.push(para)
    bufChars += chars
    if (bufChars >= WRITING_SKILL_CHUNK_TARGET) flush()
  }
  flush()
  return packed.map((item, index) => ({ index, total: packed.length, text: item }))
}
```

Export `chunkWritingSkillChapter` from `ui/server/src/novel-writing/writing-skills/index.ts`.

- [ ] **Step 4: Re-run chunk tests**

Run: `cd ui/server && bun test src/novel-writing/writing-skills/chunk-chapter.test.ts`

Expected: PASS. If the 13000-char fixture is slightly under/over, change only the repeat count.

- [ ] **Step 5: Commit** (skip unless the user asked)

---

### Task 7: Sequential runner and v2 report

**Files:**
- Modify: `ui/server/src/novel-writing/writing-skills/types.ts` (add report types if not already there)
- Modify: `ui/server/src/novel-writing/writing-skills/index.ts`
- Modify: `ui/server/src/novel-writing-service/service/writing-skill-humanize-methods.ts`
- Modify: `ui/server/src/novel-writing-service/service/writing-skill-humanize-methods.test.ts`

Replace `WRITING_SKILL_HUMANIZE_VERSION` with `'writing_skill_humanize_v2'`. Delete `WRITING_SKILL_CHUNK_LIMIT = 1800`. Raise `maxTokens` with `proseMaxTokensForWordTarget`; do **not** keep the current `Math.min(4000, … source+240)` cap.

- [ ] **Step 1: Replace runner tests**

```ts
import { describe, expect, test } from 'bun:test'
import { createWritingSkillHumanizeMethods } from './writing-skill-humanize-methods'

const SOURCE = `${'林序把门带上，沿着走廊继续往前。纸条边角硌着手指。'.repeat(70)}`
const PASS_A = `${SOURCE}灯管又响了一下。`
const PASS_B = `${PASS_A}他没有回头。`

function makeMethods(onTask: (task: string) => string | Promise<string>) {
  const calls: string[] = []
  const methods = createWritingSkillHumanizeMethods({
    executeAgent: async (_agent: any, _project: any, payload: any) => {
      const task = String(payload?.task || '')
      calls.push(task)
      return { text: await onTask(task) }
    },
    getStageModelId: () => undefined,
    getStageTemperature: (_project: any, _stage: any, fallback: number) => fallback,
  })
  return { methods, calls }
}

const standardTarget = {
  chapter_target: {
    word_target: { mode: 'standard', target: 4200, min: 3780, max: 4620 },
  },
}

describe('writing skill humanize methods', () => {
  test('skips the LLM when every skill is off', async () => {
    const { methods, calls } = makeMethods(() => 'should not run')
    const result = await methods.runWritingSkillHumanizePass(
      '/tmp/ws',
      { reference_config: { writing_skills: { enabled: {
        'fiction-humanizer-zh': false,
        'remove-ai-flavor': false,
        'humanizer-zh': false,
      } } } },
      standardTarget,
      SOURCE,
    )
    expect(calls).toEqual([])
    expect(result.final_text).toBe(SOURCE)
    expect(result.report).toMatchObject({
      version: 'writing_skill_humanize_v2',
      skipped: true,
      accepted: true,
      changed: false,
      enabled_ids: [],
      passes: [],
    })
  })

  test('runs enabled skills in order with full vendor prompts', async () => {
    const { methods, calls } = makeMethods(task => {
      if (task.includes('fiction-humanizer-zh')) return PASS_A
      if (task.includes('remove-ai-flavor')) return PASS_B
      throw new Error(`unexpected skill prompt: ${task.slice(0, 80)}`)
    })
    const result = await methods.runWritingSkillHumanizePass(
      '/tmp/ws',
      { genre: '规则怪谈', reference_config: { writing_skills: { fiction_humanizer_mode: 'rewrite' } } },
      standardTarget,
      SOURCE,
    )
    expect(calls).toHaveLength(2)
    expect(calls[0]).toContain('# 中文小说去 AI 味')
    expect(calls[0]).toContain('档位：重写')
    expect(calls[0]).toContain('【参考 · genre-notes.md】')
    expect(calls[0]).not.toContain('轻改：保留原段落顺序')
    expect(calls[1]).toContain('# Remove AI Flavor')
    expect(calls[1]).toContain(PASS_A)
    expect(calls[1]).not.toContain('# 中文小说去 AI 味')
    expect(result.final_text).toBe(PASS_B)
    expect(result.report).toMatchObject({
      version: 'writing_skill_humanize_v2',
      accepted: true,
      changed: true,
      fiction_humanizer_mode: 'rewrite',
      enabled_ids: ['fiction-humanizer-zh', 'remove-ai-flavor'],
    })
    expect(result.report.passes).toEqual([
      expect.objectContaining({ id: 'fiction-humanizer-zh', mode: 'rewrite', accepted: true, chunk_count: 1 }),
      expect.objectContaining({ id: 'remove-ai-flavor', accepted: true, chunk_count: 1 }),
    ])
  })

  test('keeps the previous pass when the middle skill throws and continues', async () => {
    const { methods, calls } = makeMethods(task => {
      if (task.includes('fiction-humanizer-zh')) return PASS_A
      if (task.includes('remove-ai-flavor')) throw new Error('provider down')
      return `${PASS_A}维基轮不应运行`
    })
    const result = await methods.runWritingSkillHumanizePass(
      '/tmp/ws',
      { reference_config: { writing_skills: { enabled: { 'humanizer-zh': false } } } },
      standardTarget,
      SOURCE,
    )
    expect(calls).toHaveLength(2)
    expect(result.final_text).toBe(PASS_A)
    expect(result.report.accepted).toBe(true)
    expect(result.report.changed).toBe(true)
    expect(result.report.passes[0].accepted).toBe(true)
    expect(result.report.passes[1].accepted).toBe(false)
  })

  test('does not roll back an accepted rewrite when fingerprint fails', async () => {
    const { methods } = makeMethods(() => PASS_A)
    const result = await methods.runWritingSkillHumanizePass(
      '/tmp/ws',
      {},
      standardTarget,
      SOURCE,
      undefined,
      {
        writing_skills: { enabled: { 'remove-ai-flavor': false, 'humanizer-zh': false } },
        fingerprintSelect: () => ({ accepted: false, reason: 'fingerprint_continuity_failed', text: SOURCE }),
      },
    )
    expect(result.final_text).toBe(PASS_A)
    expect(result.report.accepted).toBe(true)
    expect(result.report.changed).toBe(true)
    expect(result.report.warnings).toEqual(['fingerprint_continuity_failed'])
  })
})
```

If `SOURCE` / `PASS_A` fail the length gate, grow them so both sit between 2700 and 4620 compact chars.

- [ ] **Step 2: Run and confirm FAIL**

Run: `cd ui/server && bun test src/novel-writing-service/service/writing-skill-humanize-methods.test.ts`

Expected: FAIL (still one combined prompt / v1 report / fingerprint rollback).

- [ ] **Step 3: Rewrite the runner**

Public types:

```ts
export const WRITING_SKILL_HUMANIZE_VERSION = 'writing_skill_humanize_v2'

export type WritingSkillPassReport = {
  id: WritingSkillId
  mode?: FictionHumanizerMode
  accepted: boolean
  reason?: string
  before_chars: number
  after_chars: number
  chunk_count: number
}

export type WritingSkillHumanizeReport = {
  version: string
  fiction_humanizer_mode: FictionHumanizerMode
  enabled_ids: WritingSkillId[]
  enabled: boolean
  skipped?: boolean
  accepted: boolean
  changed: boolean
  reason?: string
  error?: string
  warnings: string[]
  before_chars: number
  after_chars: number
  chunk_count: number
  passes: WritingSkillPassReport[]
}
```

Loop `resolved.ids` in catalog order. For each id:

1. `throwIfAborted(options)`
2. `options.onSkillProgress?.(id)` if provided
3. `chunkWritingSkillChapter(currentText)`
4. Rewrite each chunk with `compileWritingSkillPassPrompt({ skillId: id, mode: resolved.fiction_humanizer_mode, sourceText: chunk.text, project, contextPackage, chunk })`
5. If any chunk throws / returns empty, mark the pass `accepted: false`, keep `currentText`, continue
6. Stitch with `\n\n`
7. `acceptWritingSkillCandidate({ sourceText: currentText, candidateText: stitched, enabledIds: [id], contextPackage, wordTarget })`
8. On accept: `currentText = gate.text`. Then `selectFingerprintSafeProse(passInput, currentText, { stage: 'writing_skill_humanize' })`. If `!fingerprint.accepted`, push `fingerprint.reason` into `warnings` and **keep** `currentText`.
9. On reject: keep `currentText` as the pass input

`maxTokens` for each request:

```ts
maxTokens: proseMaxTokensForWordTarget(
  contextPackage?.chapter_target?.word_target
  || contextPackage?.chapterTarget?.word_target
  || { mode: 'standard', target: 4200, min: 3780, max: 4620, label: '标准章', rangeText: '' },
)
```

Allow `options.fingerprintSelect` in tests; default to `selectFingerprintSafeProse`.

Top-level report:

- `accepted: true` when the loop finished (including all-disabled skip)
- `changed: passes.some(p => p.accepted && p.after_chars !== p.before_chars)` or `final_text !== source`
- `chunk_count`: sum of per-pass `chunk_count`
- If `chapterTaskExecution` is present and the error is a task cancel, rethrow. Other per-pass errors stay inside that pass.

- [ ] **Step 4: Re-run runner tests**

Run: `cd ui/server && bun test src/novel-writing-service/service/writing-skill-humanize-methods.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit** (skip unless the user asked)

---

### Task 8: Generation finalize progress + v2 failure report

**Files:**
- Modify: `ui/server/src/novel-writing-service/service/generate-chapter-post-draft-finalize.ts`
- Modify: `ui/server/src/novel-writing-service/service/generate-chapter-post-draft-finalize.test.ts`
- Modify: `ui/server/src/routes/novel-generation/builders.ts`
- Modify: `ui/server/src/routes/novel-generation/builders.mcp.test.ts`

- [ ] **Step 1: Update the finalize / label tests**

In `generate-chapter-post-draft-finalize.test.ts`, keep the existing two cases. Change only what must change:

- success path may emit extra `writing_skill_humanize` / `running` events with `skill_id`
- assert at least one running payload has `label: '写作skill · 小说去AI味'` when the mock runner calls `options.onSkillProgress?.('fiction-humanizer-zh')`
- failure report `version` is `writing_skill_humanize_v2` and includes `changed: false`, `warnings: []`, `passes: []`

Update the success mock:

```ts
runWritingSkillHumanizePass: async (_ws, _project, _ctx, sourceText, _model, options) => {
  skillInput = sourceText
  await options?.onSkillProgress?.('fiction-humanizer-zh')
  return {
    final_text: skilled,
    report: {
      version: 'writing_skill_humanize_v2',
      accepted: true,
      changed: true,
      skipped: false,
      enabled_ids: ['fiction-humanizer-zh'],
      passes: [{ id: 'fiction-humanizer-zh', accepted: true }],
    },
  }
}
```

In `builders.mcp.test.ts` keep:

```ts
expect(standaloneProseServiceStageLabel('writing_skill_humanize')).toBe('写作skill去AI味')
```

and add:

```ts
import { WRITING_SKILL_STAGE_LABEL } from '../../novel-writing/writing-skills'
expect(WRITING_SKILL_STAGE_LABEL['fiction-humanizer-zh']).toBe('写作skill · 小说去AI味')
```

- [ ] **Step 2: Run and confirm the new assertions fail**

Run:

```
cd ui/server && bun test src/novel-writing-service/service/generate-chapter-post-draft-finalize.test.ts src/routes/novel-generation/builders.mcp.test.ts
```

Expected: FAIL on v2 fields / missing `onSkillProgress`.

- [ ] **Step 3: Wire finalize**

Pass `onSkillProgress` into the runner:

```ts
onSkillProgress: async (skillId) => {
  await onStage('writing_skill_humanize', {
    status: 'running',
    skill_id: skillId,
    label: WRITING_SKILL_STAGE_LABEL[skillId],
  })
}
```

Catch-block report:

```ts
{
  version: WRITING_SKILL_HUMANIZE_VERSION,
  fiction_humanizer_mode: 'polish',
  enabled_ids: [],
  enabled: true,
  accepted: false,
  changed: false,
  skipped: false,
  warnings: [],
  passes: [],
  reason: 'writing_skill_humanize_failed',
  error: formatAdmissionError(error, 240),
  before_chars: 0,
  after_chars: 0,
  chunk_count: 0,
}
```

Still rethrow when `llmControlOptions.chapterTaskExecution` is set.

Export `WRITING_SKILL_STAGE_LABEL` from `writing-skills/index.ts` if not already.

- [ ] **Step 4: Re-run finalize and builders tests**

Run the same command as Step 2.

Expected: PASS.

- [ ] **Step 5: Commit** (skip unless the user asked)

---

### Task 9: Project config, revision apply, stop condensed prompt injection

**Files:**
- Modify: `ui/server/src/routes/novel-project-config-routes.ts`
- Modify: `ui/server/src/routes/novel-project-config-routes.test.ts`
- Modify: `ui/server/src/routes/novel-editor/revision-writing-skill-humanize.ts`
- Modify: `ui/server/src/routes/novel-editor/revision-writing-skill-humanize.test.ts`
- Modify: `ui/server/src/routes/novel-editor/revision-worker.ts`
- Modify: `ui/server/src/routes/novel-editor/builders-revision-prompts.ts`
- Modify: `ui/server/src/routes/novel-editor-routes.revision-safeguards.test.ts`

Revision worker already omits `writing_skills` from the runner options (see `revision-worker.test.ts` around the `skillCalls[0][5]?.writing_skills` assertion). Keep that. Only the skipped-report shape and apply helper change.

- [ ] **Step 1: Write / update failing tests**

Config GET for a legacy project must now return mode:

```ts
expect(response.body).toEqual({
  ok: true,
  config: {
    enabled: {
      'fiction-humanizer-zh': true,
      'remove-ai-flavor': true,
      'humanizer-zh': false,
    },
    fiction_humanizer_mode: 'polish',
  },
})
```

Add a PUT case that persists `fiction_humanizer_mode: 'rewrite'` and ignores `fiction_humanizer_mode: 'light'`.

Revision apply: a v2 report with `accepted: true`, `changed: true` still replaces the candidate. A v2 report with `accepted: true`, `changed: false` keeps the admitted text. Failure report version is `writing_skill_humanize_v2`.

Safeguards: replace the two injection tests.

```ts
test('does not inject condensed writing-skill rules into full revision prompts', () => {
  const prompt = buildEditorRevisionPrompt({
    project: {
      title: '超人的规则怪谈世界',
      reference_config: { writing_skills: { enabled: { 'humanizer-zh': true } } },
    },
    chapter: { chapter_text: '林序把门带上。\n\n走廊里只剩灯管声。' },
    report: { must_fix: ['去掉总结腔'] },
    revisionMode: 'from_report',
    userPrompt: '',
  })
  expect(prompt).not.toContain('去 AI 味写作 skill')
  expect(prompt).not.toContain('轻改：保留原段落顺序')
  expect(prompt).not.toContain('±15%')
})
```

Keep the opening-structural test as `not.toContain('去 AI 味写作 skill')`.

- [ ] **Step 2: Run and confirm FAIL**

Run:

```
cd ui/server && bun test \
  src/routes/novel-project-config-routes.test.ts \
  src/routes/novel-editor/revision-writing-skill-humanize.test.ts \
  src/routes/novel-editor-routes.revision-safeguards.test.ts
```

Expected: FAIL on missing mode / leftover injection string.

- [ ] **Step 3: Implement**

GET:

```ts
const resolved = resolveWritingSkillsEnabled({ project })
res.json({
  ok: true,
  config: {
    enabled: resolved.enabled,
    fiction_humanizer_mode: resolved.fiction_humanizer_mode,
  },
})
```

PUT: normalize enabled as today; resolve mode from `requestConfig.fiction_humanizer_mode`; write both keys under `writing_skills`; return both keys.

`applyWritingSkillHumanizeToRevisionCandidate`:

```ts
const changed = Boolean(
  report?.changed
  ?? (report?.accepted && !report?.skipped && finalText && finalText !== input.candidate.text),
)
if (!report || !changed || !finalText) {
  return { candidate: input.candidate, report: report || writingSkillHumanizeFailureReport(...) }
}
```

`writingSkillHumanizeFailureReport` uses v2 fields (`changed: false`, `warnings: []`, `passes: []`, `fiction_humanizer_mode: 'polish'`).

In `revision-worker.ts`, the runner-missing skipped report becomes v2 with `changed: false`.

In `builders-revision-prompts.ts`, delete `writingSkillRevisionBlock` and its two insertions. Remove the `compileWritingSkillRevisionDirectives` / `resolveWritingSkillsEnabled` imports if unused.

- [ ] **Step 4: Re-run the three test files plus the revision worker skill cases**

Run the Step 2 command and:

```
cd ui/server && bun test src/routes/novel-editor/revision-worker.test.ts
```

Expected: PASS. Update any leftover `writing_skill_humanize_v1` mocks in `revision-worker.test.ts` only if they assert version strictly.

- [ ] **Step 5: Commit** (skip unless the user asked)

---

### Task 10: Settings UI and generation-bar mode

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/writingSkillsModel.ts`
- Modify: `ui/web/src/pages/novel-workspace/writingSkillsModel.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/ProjectSettingsModal.tsx`
- Modify: `ui/web/src/pages/novel-workspace/ProjectSettingsModal.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/workspace-center-editor-controls.tsx`
- Modify: `ui/web/src/pages/novel-workspace/useNovelProjectWorkspaceUiState.ts`
- Modify: `ui/web/src/pages/novel-workspace/shell/use-novel-workspace-base-model.tsx`
- Modify: workspace prop plumbing that already carries `writingSkillsEnabled` (same files as the first version: `WorkspaceCenter.tsx`, `workspace-view-props-area.ts`, `workspace-area-view.tsx`, `build-novel-workspace-ready-runtime.tsx`)

Mirror the server resolve rules in the web model. Do not import server files into the web bundle.

- [ ] **Step 1: Update web tests first**

`writingSkillsModel.test.ts`:

```ts
expect(resolveWritingSkillsEnabled().fiction_humanizer_mode).toBe('polish')
expect(writingSkillsPayload(DEFAULT_WRITING_SKILLS_ENABLED, 'rewrite')).toEqual({
  writing_skills: {
    enabled: DEFAULT_WRITING_SKILLS_ENABLED,
    fiction_humanizer_mode: 'rewrite',
  },
})
```

Source-scan assertions:

```ts
expect(controls).toContain('fictionHumanizerMode')
expect(controls).toContain('精修')
expect(controls).toContain('重写')
expect(uiState).toContain('writingSkillsPayload(writingSkillsEnabled, fictionHumanizerMode)')
expect(modal).toContain('fiction_humanizer_mode')
expect(modal).toContain('精修')
expect(modal).toContain('重写')
```

Add the same strings to `ProjectSettingsModal.test.ts` next to the existing `/writing-skills-config` assertions.

- [ ] **Step 2: Run and confirm FAIL**

Run:

```
cd ui/web && bun test \
  src/pages/novel-workspace/writingSkillsModel.test.ts \
  src/pages/novel-workspace/ProjectSettingsModal.test.ts
```

Expected: FAIL on missing mode / 精修.

- [ ] **Step 3: Implement UI**

`writingSkillsModel.ts`: add `FictionHumanizerMode`, `DEFAULT_FICTION_HUMANIZER_MODE = 'polish'`, resolve mode the same way as the server, and:

```ts
export function writingSkillsPayload(
  enabled: WritingSkillEnabledMap,
  mode: FictionHumanizerMode = DEFAULT_FICTION_HUMANIZER_MODE,
) {
  return { writing_skills: { enabled, fiction_humanizer_mode: mode } }
}
```

`ProjectSettingsModal.tsx`:

- state `fictionHumanizerMode`
- load from `skills.data?.config`
- save `{ enabled, fiction_humanizer_mode }`
- beside the 小说去AI味 switch, render a `Select` (`aria-label="小说去AI味档位"`) with `精修` / `重写`
- `disabled` when that skill is off, or when `loading || loadFailed`

`workspace-center-editor-controls.tsx` — extend the existing control:

```ts
export function WorkspaceCenterWritingSkillsControl({
  writingSkillsEnabled,
  onWritingSkillsEnabledChange,
  fictionHumanizerMode,
  onFictionHumanizerModeChange,
}: {
  writingSkillsEnabled?: WritingSkillEnabledMap
  onWritingSkillsEnabledChange?: (enabled: WritingSkillEnabledMap) => void
  fictionHumanizerMode?: FictionHumanizerMode
  onFictionHumanizerModeChange?: (mode: FictionHumanizerMode) => void
}) {
  const current = writingSkillsEnabled || DEFAULT_WRITING_SKILLS_ENABLED
  const mode = fictionHumanizerMode || DEFAULT_FICTION_HUMANIZER_MODE
  const modeDisabled = !current['fiction-humanizer-zh']
  return (
    <div className="novel-word-target-control novel-writing-skills-control" aria-label="去AI味写作skill">
      {WRITING_SKILL_CATALOG.map(skill => (
        <Tooltip key={skill.id} title={skill.description}>
          <Button
            size="small"
            type="default"
            className={`novel-word-preset novel-btn-crystal ${current[skill.id] ? 'novel-btn-crystal-local is-selected' : 'novel-btn-crystal-display'}`}
            onClick={() => onWritingSkillsEnabledChange?.({
              ...current,
              [skill.id]: !current[skill.id],
            })}
          >
            {skill.label}
          </Button>
        </Tooltip>
      ))}
      {(['polish', 'rewrite'] as const).map(item => (
        <Button
          key={item}
          size="small"
          disabled={modeDisabled}
          aria-label={item === 'polish' ? '精修' : '重写'}
          className={`novel-word-preset novel-btn-crystal ${!modeDisabled && mode === item ? 'novel-btn-crystal-local is-selected' : 'novel-btn-crystal-display'}`}
          onClick={() => onFictionHumanizerModeChange?.(item)}
        >
          {item === 'polish' ? '精修' : '重写'}
        </Button>
      ))}
    </div>
  )
}
```

Thread the two new props through the same files that already pass `writingSkillsEnabled`:

- `useNovelProjectWorkspaceUiState.ts`: add `fictionHumanizerMode` state; `chapterWordTargetPayload` calls `writingSkillsPayload(writingSkillsEnabled, fictionHumanizerMode)`
- `use-novel-workspace-base-model.tsx`: hydrate both fields from `resolveWritingSkillsEnabled({ project: selectedProject })`
- `WorkspaceCenter.tsx`, `workspace-view-props-area.ts`, `workspace-area-view.tsx`, `build-novel-workspace-ready-runtime.tsx`: pass `fictionHumanizerMode` and `onFictionHumanizerModeChange` next to the existing enabled props

Hydrate from the selected project:

```ts
const resolved = resolveWritingSkillsEnabled({ project: selectedProject })
setWritingSkillsEnabled(resolved.enabled)
setFictionHumanizerMode(resolved.fiction_humanizer_mode)
```

- [ ] **Step 4: Re-run web tests**

Run the Step 2 command.

Expected: PASS.

- [ ] **Step 5: Commit** (skip unless the user asked)

---

### Task 11: Regression sweep

**Files:** any test still mentioning `writing_skill_humanize_v1`, `轻改：保留原段落顺序`, `WRITING_SKILL_CHUNK_LIMIT`, `enabledIds:`, or `±15%` inside writing-skill files.

- [ ] **Step 1: Search**

```
cd /Users/ruiyaosong/MangaForge-Studio
rg -n "writing_skill_humanize_v1|WRITING_SKILL_CHUNK_LIMIT|轻改：保留原段落顺序|compileWritingSkillPassPrompt\\(\\{[^}]*enabledIds" \
  ui/server/src/novel-writing/writing-skills \
  ui/server/src/novel-writing-service/service \
  ui/server/src/routes/novel-editor \
  ui/web/src/pages/novel-workspace
```

Fix leftover production references. Test mocks may keep v1 only if the apply helper still accepts them via the `changed ?? (accepted && !skipped)` fallback.

- [ ] **Step 2: Run the focused suite**

```
cd ui/server && bun test \
  src/novel-writing/writing-skills/load-vendor.test.ts \
  src/novel-writing/writing-skills/resolve-enabled.test.ts \
  src/novel-writing/writing-skills/length-bounds.test.ts \
  src/novel-writing/writing-skills/accept-candidate.test.ts \
  src/novel-writing/writing-skills/compile-pass-prompt.test.ts \
  src/novel-writing/writing-skills/chunk-chapter.test.ts \
  src/novel-writing-service/service/writing-skill-humanize-methods.test.ts \
  src/novel-writing-service/service/generate-chapter-post-draft-finalize.test.ts \
  src/routes/novel-project-config-routes.test.ts \
  src/routes/novel-editor/revision-writing-skill-humanize.test.ts \
  src/routes/novel-editor/revision-worker.test.ts \
  src/routes/novel-editor-routes.revision-safeguards.test.ts \
  src/routes/novel-generation/builders.mcp.test.ts

cd ui/web && bun test \
  src/pages/novel-workspace/writingSkillsModel.test.ts \
  src/pages/novel-workspace/ProjectSettingsModal.test.ts
```

Expected: all PASS.

- [ ] **Step 3: Commit** (skip unless the user asked)

---

## Spec coverage

| Spec item | Task |
| --- | --- |
| Sequential full-chapter passes, fixed order | 7 |
| polish / rewrite only on fiction-humanizer-zh, default polish | 2, 5, 10 |
| Full SKILL.md + matching refs, no runtime GitHub | 1, 5 |
| genre-notes only when project has genre | 5, 7 |
| No default 轻改 / ±15% | 5, 9 |
| Chunk only above 12000, 6000–8000 scene packs | 6, 7 |
| Target-based length gate + 2700 standard floor + 5% over-target slack | 3, 4 |
| Per-pass failure keeps previous text and continues | 7 |
| Cancel / lease / chapterTaskExecution still abort | 7, 8 |
| Fingerprint warning only | 7 |
| Continuity + humanizer-zh soul leak | 4 |
| v2 report with `passes`, `changed`, `warnings` | 7, 8, 9 |
| Progress event `writing_skill_humanize` with per-skill label | 8 |
| Config GET/PUT mode | 9 |
| Generation override; revision project-only | 7, 9, 10 |
| Remove condensed revision-prompt injection | 9 |
| No canvas installer, no new ChapterTaskStage, no 4200 retarget | file map |

## Type names locked by this plan

- `FictionHumanizerMode = 'polish' \| 'rewrite'`
- `resolveWritingSkillsEnabled` return adds `fiction_humanizer_mode`
- `compileWritingSkillPassPrompt({ skillId, mode, sourceText, project, contextPackage, chunk })`
- `resolveWritingSkillLengthBounds({ sourceChars, wordTarget })` → `{ min, max }`
- `chunkWritingSkillChapter(text)` → `{ index, total, text }[]`
- `WRITING_SKILL_HUMANIZE_VERSION = 'writing_skill_humanize_v2'`
- `WritingSkillHumanizeReport` / `WritingSkillPassReport`
- `options.onSkillProgress?.(skillId)`
- `options.fingerprintSelect` test seam
- `writingSkillsPayload(enabled, mode)`
