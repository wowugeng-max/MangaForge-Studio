# Chapter Acceptance Desk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a strict post-draft chapter acceptance desk inside the writing cockpit.

**Architecture:** Keep the feature inside the existing writing cockpit. Add a pure `chapterAcceptanceDesk` model built from the selected chapter, review records, and story state, render it in the current cockpit panel when the chapter has prose, and route its actions through existing workspace handlers and REST-backed flows. Do not add a new top-level page, backend aggregation endpoint, or persistent acceptance table in this iteration.

**Tech Stack:** React, TypeScript, Ant Design, Bun test, existing REST handlers.

---

## File Structure

- Modify `ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts`
  Add acceptance desk fixtures and pure model tests before implementation.
- Modify `ui/web/src/pages/novel-workspace/writingCockpitModel.ts`
  Add action keys, acceptance model types, review parsing helpers, latest-review selection, quality extraction, state sync inference, and `chapterAcceptanceDesk` output.
- Modify `ui/web/src/pages/novel-workspace/WritingCockpitPanel.tsx`
  Add `ChapterAcceptanceDesk` and switch between acceptance and planning desks inside the same cockpit area.
- Modify `ui/web/src/pages/NovelProjectWorkspace.tsx`
  Pass `reviews` into `buildWritingCockpitModel`, add target-aware quality refresh, find the latest editor report review by ID for revision, expose editor reports / quality / version history panels, and navigate to the next chapter after acceptance.

## Task 1: Acceptance Model Tests

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts`

- [ ] **Step 1: Add review fixtures near the existing fixtures**

Insert these helpers after `sceneCardChapter`:

```ts
const acceptedProject = {
  ...project,
  reference_config: {
    ...project.reference_config,
    story_state: {
      ...project.reference_config.story_state,
      last_updated_chapter: 1,
    },
  },
}

function proseQualityReview(overrides: Record<string, any> = {}) {
  const payload = {
    chapter_id: 101,
    self_check: {
      review: {
        score: 82,
        passed: true,
        status: 'pass',
        issues: [],
        must_fix: [],
        optional_improvements: [],
        revision_directives: [],
        needs_revision: false,
      },
    },
    ...overrides.payload,
  }

  return {
    id: overrides.id || 201,
    review_type: 'prose_quality',
    status: overrides.status || 'ok',
    summary: overrides.summary || '质量通过，节奏和钩子可交稿。',
    created_at: overrides.created_at || '2026-05-24T00:00:00.000Z',
    payload: JSON.stringify(payload),
    ...overrides.record,
  }
}

function editorReportReview(overrides: Record<string, any> = {}) {
  const payload = {
    chapter_id: 101,
    report: {
      overall_score: 68,
      summary: '章末钩子不足，需要强化收束压力。',
      must_fix: ['章末钩子不足'],
      optional_improvements: ['压缩解释'],
      one_click_revision_prompt: '强化章末钩子',
    },
    ...overrides.payload,
  }

  return {
    id: overrides.id || 301,
    review_type: 'editor_report',
    status: overrides.status || 'ready',
    summary: overrides.summary || '编辑报告指出章末钩子不足。',
    created_at: overrides.created_at || '2026-05-24T00:10:00.000Z',
    payload: JSON.stringify(payload),
    ...overrides.record,
  }
}

function editorRevisionReview(overrides: Record<string, any> = {}) {
  const payload = {
    chapter_id: 101,
    source_review_id: 301,
    revision_summary: '强化章末钩子，并压缩解释段落。',
    applied_patches: [{ start: 10, end: 20, replacement: '新的章末压力段落' }],
    ...overrides.payload,
  }

  return {
    id: overrides.id || 401,
    review_type: 'editor_revision',
    status: overrides.status || 'applied',
    summary: overrides.summary || '已应用章末钩子修订。',
    created_at: overrides.created_at || '2026-05-24T00:20:00.000Z',
    payload: JSON.stringify(payload),
    ...overrides.record,
  }
}
```

- [ ] **Step 2: Add failing tests for the acceptance states**

Append these tests inside the existing `describe('buildWritingCockpitModel', () => { ... })` block:

```ts
  test('acceptance desk stays hidden for a chapter without prose', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[1],
      materialScore: { score: 82, can_generate: true },
      reviews: [],
    })

    expect(model.chapterAcceptanceDesk.visible).toBe(false)
    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('hidden')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('refresh_context_package')
  })

  test('prose chapter without a quality review needs quality check', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [],
    })

    expect(model.chapterAcceptanceDesk.visible).toBe(true)
    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_quality_check')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('refresh_current_quality')
    expect(model.primaryActionKey).toBe('refresh_current_quality')
    expect(model.topStatus.primaryActionKey).toBe('refresh_current_quality')
  })

  test('low quality score requires an editor report before delivery', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              review: {
                score: 72,
                passed: false,
                status: 'fail',
                issues: [{ severity: 'medium', message: '中段拖沓' }],
                must_fix: [],
                optional_improvements: ['压缩中段解释'],
                revision_directives: ['压缩中段解释'],
                needs_revision: true,
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_revision')
    expect(model.chapterAcceptanceDesk.qualityScore).toBe(72)
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('create_editor_report')
  })

  test('must-fix quality issues require revision', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              review: {
                score: 84,
                passed: false,
                status: 'warn',
                issues: [{ severity: 'high', message: '主角决策动机断裂' }],
                must_fix: ['主角决策动机断裂'],
                optional_improvements: [],
                revision_directives: ['补足主角决策动机'],
                needs_revision: true,
              },
            },
          },
        }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_revision')
    expect(model.chapterAcceptanceDesk.mustFix).toContain('主角决策动机断裂')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('create_editor_report')
  })

  test('latest editor report with must-fix issues recommends applying revision', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({
          payload: {
            self_check: {
              review: {
                score: 72,
                passed: false,
                status: 'fail',
                issues: [],
                must_fix: ['章末钩子不足'],
                optional_improvements: [],
                revision_directives: ['强化章末钩子'],
                needs_revision: true,
              },
            },
          },
        }),
        editorReportReview({ id: 301 }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_revision')
    expect(model.chapterAcceptanceDesk.latestEditorReportId).toBe(301)
    expect(model.chapterAcceptanceDesk.latestEditorReportSummary).toContain('章末钩子')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('apply_editor_revision')
  })

  test('revision after latest quality review requires a fresh recheck', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview({ created_at: '2026-05-24T00:00:00.000Z' }),
        editorReportReview({ created_at: '2026-05-24T00:10:00.000Z' }),
        editorRevisionReview({ created_at: '2026-05-24T00:20:00.000Z' }),
      ],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_recheck')
    expect(model.chapterAcceptanceDesk.latestRevisionSummary).toContain('强化章末钩子')
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('refresh_current_quality')
  })

  test('passing quality with stale story state needs state sync', () => {
    const staleProject = {
      ...project,
      reference_config: {
        ...project.reference_config,
        story_state: {
          ...project.reference_config.story_state,
          last_updated_chapter: 0,
        },
      },
    }

    const model = buildWritingCockpitModel({
      project: staleProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview()],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_state_sync')
    expect(model.chapterAcceptanceDesk.storyStateSynced).toBe(false)
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('sync_story_state')
    expect(model.primaryActionKey).toBe('sync_story_state')
  })

  test('passing quality with synchronized story state is ready to accept', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [proseQualityReview()],
    })

    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('ready_to_accept')
    expect(model.chapterAcceptanceDesk.storyStateSynced).toBe(true)
    expect(model.chapterAcceptanceDesk.recommendedAcceptanceAction.key).toBe('accept_chapter_and_continue')
    expect(model.primaryActionKey).toBe('accept_chapter_and_continue')
  })

  test('accepted prose chapter does not route back to draft generation', () => {
    const model = buildWritingCockpitModel({
      project: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      contextPackage,
      diagnostics: {
        preflight: { ready: true, blockers: [] },
        material_score: { score: 88, can_generate: true },
      },
      materialScore: { score: 88, can_generate: true },
      reviews: [proseQualityReview()],
    })

    expect(model.nextChapter?.chapterNo).toBe(1)
    expect(model.draftPipeline.state).toBe('draft_generated')
    expect(model.chapterAcceptanceDesk.visible).toBe(true)
    expect(model.primaryActionKey).not.toBe('write_draft')
    expect(model.topStatus.primaryActionKey).toBe('accept_chapter_and_continue')
  })
```

- [ ] **Step 3: Update existing prose-chapter expectations to the new gate**

In the existing test named `an active chapter that already has prose selects revision`, replace these assertions:

```ts
    expect(model.recommendedRole).toBe('revision_editor')
    expect(model.modelTeam.recommendedRole).toBe('revision_editor')
    expect(model.primaryActionKey).toBe('review_draft')
    expect(model.topStatus.primaryActionKey).toBe('review_draft')
```

with:

```ts
    expect(model.recommendedRole).toBe('revision_editor')
    expect(model.modelTeam.recommendedRole).toBe('revision_editor')
    expect(model.chapterAcceptanceDesk.visible).toBe(true)
    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_quality_check')
    expect(model.primaryActionKey).toBe('refresh_current_quality')
    expect(model.topStatus.primaryActionKey).toBe('refresh_current_quality')
```

Rename the existing test named `stale story state routes active prose chapter to canon update before revision` to:

```ts
  test('stale story state on active prose chapter still requires quality check first', () => {
```

Then replace its final assertions:

```ts
    expect(model.readiness.warnings.map(check => check.key)).toContain('story_state_stale')
    expect(model.primaryActionKey).toBe('update_canon')
    expect(model.recommendedRole).toBe('continuity_auditor')
```

with:

```ts
    expect(model.readiness.warnings.map(check => check.key)).toContain('story_state_stale')
    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_quality_check')
    expect(model.primaryActionKey).toBe('refresh_current_quality')
    expect(model.recommendedRole).toBe('revision_editor')
```

- [ ] **Step 4: Run the focused test and verify it fails for missing model fields**

Run:

```bash
bun run test:writing-cockpit
```

Expected: FAIL with TypeScript or assertion errors mentioning `reviews`, `chapterAcceptanceDesk`, or the new action keys.

- [ ] **Step 5: Commit the failing tests**

Run:

```bash
git add ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts
git commit -m "test: add chapter acceptance desk model cases"
```

## Task 2: Pure Acceptance Model

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/writingCockpitModel.ts`
- Test: `ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts`

- [ ] **Step 1: Extend action keys and labels**

Add these keys to `WritingCockpitActionKey`:

```ts
  | 'refresh_current_quality'
  | 'create_editor_report'
  | 'apply_editor_revision'
  | 'sync_story_state'
  | 'accept_chapter_and_continue'
  | 'open_editor_reports'
  | 'open_version_history'
```

Add these labels to `ACTION_LABELS`:

```ts
  refresh_current_quality: '复检当前版本',
  create_editor_report: '生成编辑报告',
  apply_editor_revision: '生成修订稿',
  sync_story_state: '同步故事状态',
  accept_chapter_and_continue: '验收并进入下一章',
  open_editor_reports: '查看编辑报告',
  open_version_history: '查看版本历史',
```

- [ ] **Step 2: Add acceptance model types after `ChapterPlanningDeskModel`**

Insert:

```ts
export type ChapterAcceptanceStatus =
  | 'hidden'
  | 'needs_quality_check'
  | 'needs_revision'
  | 'needs_recheck'
  | 'needs_state_sync'
  | 'ready_to_accept'
  | 'delivered'

export interface ChapterAcceptanceDeskModel {
  visible: boolean
  acceptanceStatus: ChapterAcceptanceStatus
  statusLabel: string
  acceptanceReasons: string[]
  qualityScore: number | null
  qualityStatus: string
  mustFix: string[]
  optionalImprovements: string[]
  latestQualityReviewId: any
  latestEditorReportId: any
  latestRevisionReviewId: any
  latestEditorReportSummary: string
  latestRevisionSummary: string
  storyStateSynced: boolean
  recommendedAcceptanceAction: {
    key: WritingCockpitActionKey
    label: string
  }
  secondaryActions: Array<{
    key: WritingCockpitActionKey
    label: string
  }>
  shouldAutoExpandAcceptance: boolean
}
```

Then add `chapterAcceptanceDesk: ChapterAcceptanceDeskModel` to `WritingCockpitModel`, immediately after `chapterPlanningDesk`.

- [ ] **Step 3: Add reviews to the build input**

Add this field to `BuildWritingCockpitModelInput`:

```ts
  reviews?: AnyRecord[] | null
```

- [ ] **Step 4: Add parsing and extraction helpers before `buildChapterPlanningDesk`**

Insert this code after `chapterSceneCards`:

```ts
const QUALITY_PASS_THRESHOLD = 78

function parsePayload(value: any): AnyRecord {
  if (!value) return {}
  if (typeof value === 'object') return value
  if (typeof value !== 'string') return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function reviewPayload(review: AnyRecord): AnyRecord {
  return parsePayload(review?.payload || review?.raw_payload)
}

function reviewChapterId(review: AnyRecord) {
  const payload = reviewPayload(review)
  return firstNonEmpty(
    payload?.chapter_id,
    payload?.chapterId,
    payload?.chapter?.id,
    review?.chapter_id,
    review?.chapterId,
  )
}

function reviewBelongsToChapter(review: AnyRecord, chapter?: AnyRecord | null) {
  if (!chapter) return false
  const reviewId = text(reviewChapterId(review))
  const chapterId = text(chapter?.id)
  return Boolean(reviewId && chapterId && reviewId === chapterId)
}

function reviewType(review: AnyRecord) {
  return text(review?.review_type || review?.type || review?.kind).toLowerCase()
}

function createdTime(review: AnyRecord) {
  const timestamp = Date.parse(text(review?.created_at || review?.updated_at))
  return Number.isFinite(timestamp) ? timestamp : 0
}

function latestReview(reviews: AnyRecord[], chapter: AnyRecord | null, type: string) {
  const matches = reviews
    .map((review, index) => ({ review, index }))
    .filter(item => reviewBelongsToChapter(item.review, chapter) && reviewType(item.review) === type)
  if (!matches.length) return null
  matches.sort((a, b) => {
    const timeDiff = createdTime(b.review) - createdTime(a.review)
    if (timeDiff !== 0) return timeDiff
    return b.index - a.index
  })
  return matches[0].review
}

function qualityPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.self_check?.review || payload?.review || payload?.quality || payload?.result || {}
}

function reportPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.report || payload?.editor_report || payload?.result || {}
}

function revisionPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.revision || payload?.result || payload
}

function extractQualityScore(quality: AnyRecord) {
  const score = Number(quality?.score || quality?.overall_score || quality?.quality_score || 0)
  return Number.isFinite(score) && score > 0 ? score : null
}

function issueText(issue: any) {
  if (typeof issue === 'string') return text(issue)
  return firstNonEmpty(issue?.message, issue?.summary, issue?.detail, issue?.text, issue?.title)
}

function hasHighSeverityIssue(issue: any) {
  if (typeof issue === 'string') return false
  const severity = text(issue?.severity || issue?.level || issue?.grade).toLowerCase()
  return severity === 'high' || severity === 'critical' || severity === 'blocker' || severity === 'must_fix'
}

function extractMustFix(quality: AnyRecord, report: AnyRecord) {
  const fromQuality = [
    ...stringArray(quality?.must_fix),
    ...stringArray(quality?.mustFix),
    ...stringArray(quality?.revision_directives),
  ]
  const fromHighIssues = arrayValue(quality?.issues).filter(hasHighSeverityIssue).map(issueText).filter(Boolean)
  const fromReport = [
    ...stringArray(report?.must_fix),
    ...stringArray(report?.mustFix),
  ]
  return Array.from(new Set([...fromQuality, ...fromHighIssues, ...fromReport])).slice(0, 5)
}

function extractOptionalImprovements(quality: AnyRecord, report: AnyRecord) {
  const items = [
    ...stringArray(quality?.optional_improvements),
    ...stringArray(quality?.optionalImprovements),
    ...stringArray(report?.optional_improvements),
    ...stringArray(report?.optionalImprovements),
  ]
  return Array.from(new Set(items)).slice(0, 5)
}

function buildHiddenAcceptanceDesk(): ChapterAcceptanceDeskModel {
  return {
    visible: false,
    acceptanceStatus: 'hidden',
    statusLabel: '等待正文',
    acceptanceReasons: ['本章还没有正文，先完成章节计划和初稿。'],
    qualityScore: null,
    qualityStatus: '',
    mustFix: [],
    optionalImprovements: [],
    latestQualityReviewId: null,
    latestEditorReportId: null,
    latestRevisionReviewId: null,
    latestEditorReportSummary: '',
    latestRevisionSummary: '',
    storyStateSynced: false,
    recommendedAcceptanceAction: { key: 'write_draft', label: ACTION_LABELS.write_draft },
    secondaryActions: [],
    shouldAutoExpandAcceptance: false,
  }
}

function buildChapterAcceptanceDesk(args: {
  nextChapter: AnyRecord | null
  cockpitChapter: WritingCockpitChapter | null
  reviews: AnyRecord[]
  storyState: AnyRecord
}): ChapterAcceptanceDeskModel {
  if (!args.nextChapter || !hasProse(args.nextChapter)) return buildHiddenAcceptanceDesk()

  const latestQuality = latestReview(args.reviews, args.nextChapter, 'prose_quality')
  const latestReport = latestReview(args.reviews, args.nextChapter, 'editor_report')
  const latestRevision = latestReview(args.reviews, args.nextChapter, 'editor_revision')
  const quality = qualityPayload(latestQuality)
  const report = reportPayload(latestReport)
  const revision = revisionPayload(latestRevision)
  const score = extractQualityScore(quality)
  const qualityStatus = firstNonEmpty(quality?.status, latestQuality?.status)
  const mustFix = extractMustFix(quality, report)
  const optionalImprovements = extractOptionalImprovements(quality, report)
  const storyStateSynced = Number(args.storyState?.last_updated_chapter || 0) >= Number(args.nextChapter?.chapter_no || 0)
  const revisionNeedsRecheck = Boolean(
    latestQuality
    && latestRevision
    && createdTime(latestRevision) > createdTime(latestQuality),
  )
  const scoreNeedsRevision = score !== null && score < QUALITY_PASS_THRESHOLD
  const qualityNeedsRevision = Boolean(
    scoreNeedsRevision
    || mustFix.length > 0
    || quality?.needs_revision === true
    || quality?.passed === false,
  )
  const secondaryActions = [
    { key: 'review_draft' as const, label: '查看质量卡' },
    { key: 'open_editor_reports' as const, label: ACTION_LABELS.open_editor_reports },
    { key: 'open_version_history' as const, label: ACTION_LABELS.open_version_history },
  ]

  if (!latestQuality) {
    return {
      visible: true,
      acceptanceStatus: 'needs_quality_check',
      statusLabel: '需复检',
      acceptanceReasons: ['本章已有正文，但还没有当前章节的质量复检记录。'],
      qualityScore: null,
      qualityStatus,
      mustFix,
      optionalImprovements,
      latestQualityReviewId: null,
      latestEditorReportId: latestReport?.id || null,
      latestRevisionReviewId: latestRevision?.id || null,
      latestEditorReportSummary: firstNonEmpty(report?.summary, latestReport?.summary),
      latestRevisionSummary: firstNonEmpty(revision?.revision_summary, latestRevision?.summary),
      storyStateSynced,
      recommendedAcceptanceAction: { key: 'refresh_current_quality', label: ACTION_LABELS.refresh_current_quality },
      secondaryActions,
      shouldAutoExpandAcceptance: true,
    }
  }

  if (revisionNeedsRecheck) {
    return {
      visible: true,
      acceptanceStatus: 'needs_recheck',
      statusLabel: '修订后需复检',
      acceptanceReasons: ['本章已有修订记录，修订时间晚于最新质量复检。'],
      qualityScore: score,
      qualityStatus,
      mustFix,
      optionalImprovements,
      latestQualityReviewId: latestQuality?.id || null,
      latestEditorReportId: latestReport?.id || null,
      latestRevisionReviewId: latestRevision?.id || null,
      latestEditorReportSummary: firstNonEmpty(report?.summary, latestReport?.summary),
      latestRevisionSummary: firstNonEmpty(revision?.revision_summary, latestRevision?.summary),
      storyStateSynced,
      recommendedAcceptanceAction: { key: 'refresh_current_quality', label: '复检修订稿' },
      secondaryActions,
      shouldAutoExpandAcceptance: true,
    }
  }

  if (qualityNeedsRevision) {
    const hasReportFix = Boolean(latestReport && extractMustFix({}, report).length > 0)
    const key: WritingCockpitActionKey = hasReportFix ? 'apply_editor_revision' : 'create_editor_report'
    return {
      visible: true,
      acceptanceStatus: 'needs_revision',
      statusLabel: '需修订',
      acceptanceReasons: [
        scoreNeedsRevision ? `质量分 ${score} 低于 ${QUALITY_PASS_THRESHOLD}` : '',
        mustFix.length > 0 ? `必须修复：${mustFix.slice(0, 2).join('；')}` : '',
      ].filter(Boolean).slice(0, 3),
      qualityScore: score,
      qualityStatus,
      mustFix,
      optionalImprovements,
      latestQualityReviewId: latestQuality?.id || null,
      latestEditorReportId: latestReport?.id || null,
      latestRevisionReviewId: latestRevision?.id || null,
      latestEditorReportSummary: firstNonEmpty(report?.summary, latestReport?.summary),
      latestRevisionSummary: firstNonEmpty(revision?.revision_summary, latestRevision?.summary),
      storyStateSynced,
      recommendedAcceptanceAction: { key, label: ACTION_LABELS[key] },
      secondaryActions,
      shouldAutoExpandAcceptance: true,
    }
  }

  if (!storyStateSynced) {
    return {
      visible: true,
      acceptanceStatus: 'needs_state_sync',
      statusLabel: '需同步故事状态',
      acceptanceReasons: [`故事状态还没有同步到第 ${args.nextChapter.chapter_no} 章。`],
      qualityScore: score,
      qualityStatus,
      mustFix,
      optionalImprovements,
      latestQualityReviewId: latestQuality?.id || null,
      latestEditorReportId: latestReport?.id || null,
      latestRevisionReviewId: latestRevision?.id || null,
      latestEditorReportSummary: firstNonEmpty(report?.summary, latestReport?.summary),
      latestRevisionSummary: firstNonEmpty(revision?.revision_summary, latestRevision?.summary),
      storyStateSynced,
      recommendedAcceptanceAction: { key: 'sync_story_state', label: ACTION_LABELS.sync_story_state },
      secondaryActions,
      shouldAutoExpandAcceptance: true,
    }
  }

  return {
    visible: true,
    acceptanceStatus: 'ready_to_accept',
    statusLabel: '可验收',
    acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
    qualityScore: score,
    qualityStatus,
    mustFix,
    optionalImprovements,
    latestQualityReviewId: latestQuality?.id || null,
    latestEditorReportId: latestReport?.id || null,
    latestRevisionReviewId: latestRevision?.id || null,
    latestEditorReportSummary: firstNonEmpty(report?.summary, latestReport?.summary),
    latestRevisionSummary: firstNonEmpty(revision?.revision_summary, latestRevision?.summary),
    storyStateSynced,
    recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: ACTION_LABELS.accept_chapter_and_continue },
    secondaryActions,
    shouldAutoExpandAcceptance: false,
  }
}
```

- [ ] **Step 5: Build the desk in `buildWritingCockpitModel`**

Inside `buildWritingCockpitModel`, replace the current early primary-action block:

```ts
  const { role, action } = resolvePrimaryAction({
    writingBibleReady,
    hasChapter,
    chapterOutlineReady,
    materialsReady,
    nextHasProse,
    storyStateReady,
  })
```

with no code at that location. The primary action now needs the acceptance desk, so it is resolved after `cockpitNextChapter`, `chapterPlanningDesk`, and `chapterAcceptanceDesk` exist.

After `chapterPlanningDesk` is created, add:

```ts
  const reviews = arrayValue(input.reviews)
  const chapterAcceptanceDesk = buildChapterAcceptanceDesk({
    nextChapter,
    cockpitChapter: cockpitNextChapter,
    reviews,
    storyState,
  })
```

Then add the new primary action resolution immediately after that desk:

```ts
  const fallbackPrimary = resolvePrimaryAction({
    writingBibleReady,
    hasChapter,
    chapterOutlineReady,
    materialsReady,
    nextHasProse,
    storyStateReady,
  })
  const acceptanceAction = chapterAcceptanceDesk.visible
    ? chapterAcceptanceDesk.recommendedAcceptanceAction.key
    : null
  const primary = acceptanceAction
    ? { role: 'revision_editor' as WritingCockpitRole, action: acceptanceAction }
    : fallbackPrimary
  const { role, action } = primary
```

Return `chapterAcceptanceDesk` immediately after `chapterPlanningDesk`.

- [ ] **Step 6: Keep planner routing from overriding prose acceptance**

In `buildChapterPlanningDesk`, preserve its existing return values, but acceptance routing owns the cockpit primary action when `chapterAcceptanceDesk.visible` is true. This means the existing planning desk test for prose can still inspect `chapterPlanningDesk.recommendedPlannerAction.key`, while `model.primaryActionKey` and `model.topStatus.primaryActionKey` now point to acceptance.

- [ ] **Step 7: Run focused tests**

Run:

```bash
bun run test:writing-cockpit
```

Expected: PASS.

- [ ] **Step 8: Commit the model**

Run:

```bash
git add ui/web/src/pages/novel-workspace/writingCockpitModel.ts ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts
git commit -m "feat: model chapter acceptance desk"
```

## Task 3: Render Acceptance Desk UI

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/WritingCockpitPanel.tsx`

- [ ] **Step 1: Add icons for acceptance actions**

Extend the Ant Design icon import with:

```ts
  HistoryOutlined,
  RetweetOutlined,
```

Update `actionIcon`:

```ts
  if (key === 'refresh_current_quality') return <FileSearchOutlined />
  if (key === 'create_editor_report') return <AuditOutlined />
  if (key === 'apply_editor_revision') return <RetweetOutlined />
  if (key === 'sync_story_state') return <SafetyOutlined />
  if (key === 'accept_chapter_and_continue') return <CheckCircleOutlined />
  if (key === 'open_version_history') return <HistoryOutlined />
```

- [ ] **Step 2: Add acceptance colors and value formatting**

Insert after `plannerColor`:

```ts
function acceptanceColor(status: string) {
  if (status === 'ready_to_accept' || status === 'delivered') return 'green'
  if (status === 'needs_state_sync') return 'cyan'
  if (status === 'needs_recheck') return 'blue'
  if (status === 'needs_revision') return 'red'
  if (status === 'needs_quality_check') return 'gold'
  return 'default'
}

function qualityScoreText(value: number | null) {
  return value === null ? '未复检' : `${value} 分`
}
```

- [ ] **Step 3: Add `ChapterAcceptanceDesk` before `WritingCockpitPanel`**

Insert:

```tsx
function ChapterAcceptanceDesk({
  model,
  loading,
  onAction,
}: {
  model: WritingCockpitModel
  loading: boolean
  onAction: (key: WritingCockpitActionKey) => void
}) {
  const desk = model.chapterAcceptanceDesk
  const [expanded, setExpanded] = useState(desk.shouldAutoExpandAcceptance)

  useEffect(() => {
    setExpanded(desk.shouldAutoExpandAcceptance)
  }, [desk.shouldAutoExpandAcceptance, model.nextChapter?.id, desk.acceptanceStatus])

  return (
    <div
      style={{
        border: `1px solid ${desk.acceptanceStatus === 'ready_to_accept' ? '#d9f7be' : '#ffccc7'}`,
        borderRadius: 8,
        padding: 12,
        width: '100%',
        minWidth: 0,
      }}
    >
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Row gutter={[12, 8]} align="middle">
          <Col xs={24} lg={14} style={{ minWidth: 0 }}>
            <Space wrap size={[6, 4]}>
              <Tag color={acceptanceColor(desk.acceptanceStatus)} bordered={false}>{desk.statusLabel}</Tag>
              <Tag bordered={false}>质量：{qualityScoreText(desk.qualityScore)}</Tag>
              <Tag bordered={false}>故事状态：{desk.storyStateSynced ? '已同步' : '待同步'}</Tag>
            </Space>
            <Paragraph ellipsis={{ rows: expanded ? 3 : 1 }} style={{ ...wrapTextStyle, margin: '6px 0 0', fontSize: 12 }}>
              {desk.acceptanceReasons.slice(0, 3).join('；')}
            </Paragraph>
          </Col>
          <Col xs={24} lg={10}>
            <Space wrap style={{ justifyContent: 'flex-end', width: '100%' }}>
              <Button size="small" onClick={() => setExpanded(value => !value)}>
                {expanded ? '收起交稿台' : '展开交稿台'}
              </Button>
              <Button
                type={desk.acceptanceStatus === 'ready_to_accept' ? 'primary' : 'default'}
                size="small"
                loading={loading}
                icon={actionIcon(desk.recommendedAcceptanceAction.key, model.modelTeam.recommendedRole)}
                onClick={() => onAction(desk.recommendedAcceptanceAction.key)}
                style={{ whiteSpace: 'normal', height: 'auto', lineHeight: 1.25 }}
              >
                {desk.recommendedAcceptanceAction.label}
              </Button>
            </Space>
          </Col>
        </Row>

        {expanded && (
          <Row gutter={[12, 10]}>
            <Col xs={24} lg={10} style={{ minWidth: 0 }}>
              <div style={{ background: '#fafafa', borderRadius: 6, padding: 10, minWidth: 0 }}>
                <Text strong style={{ ...wrapTextStyle, marginBottom: 6 }}>编辑摘要</Text>
                <Space direction="vertical" size={6} style={{ width: '100%', minWidth: 0 }}>
                  <Text type="secondary" style={wrapTextStyle}>质量状态：{compactPlanValue(desk.qualityStatus, '未复检')}</Text>
                  <Text type="secondary" style={wrapTextStyle}>编辑报告：{compactPlanValue(desk.latestEditorReportSummary, '尚未生成编辑报告')}</Text>
                  <Text type="secondary" style={wrapTextStyle}>最近修订：{compactPlanValue(desk.latestRevisionSummary, '尚未生成修订稿')}</Text>
                </Space>
              </div>
            </Col>
            <Col xs={24} lg={14} style={{ minWidth: 0 }}>
              <div style={{ background: '#fafafa', borderRadius: 6, padding: 10, minWidth: 0 }}>
                <Text strong style={{ ...wrapTextStyle, marginBottom: 6 }}>交稿问题</Text>
                <Space direction="vertical" size={8} style={{ width: '100%', minWidth: 0 }}>
                  {desk.mustFix.length > 0 ? (
                    <Space wrap size={[4, 4]}>
                      {desk.mustFix.slice(0, 5).map(item => (
                        <Tag key={item} color="red" bordered={false}>{item}</Tag>
                      ))}
                    </Space>
                  ) : (
                    <Text type="secondary" style={wrapTextStyle}>没有必须修复项。</Text>
                  )}
                  {desk.optionalImprovements.length > 0 && (
                    <Space wrap size={[4, 4]}>
                      {desk.optionalImprovements.slice(0, 5).map(item => (
                        <Tag key={item} color="blue" bordered={false}>{item}</Tag>
                      ))}
                    </Space>
                  )}
                  <Space wrap size={[6, 6]}>
                    {desk.secondaryActions.map(action => (
                      <Button
                        key={action.key}
                        size="small"
                        disabled={loading}
                        icon={actionIcon(action.key, model.modelTeam.recommendedRole)}
                        onClick={() => onAction(action.key)}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </Space>
                </Space>
              </div>
            </Col>
          </Row>
        )}
      </Space>
    </div>
  )
}
```

- [ ] **Step 4: Switch desk rendering**

Replace:

```tsx
          <ChapterPlanningDesk model={model} loading={loading} onAction={onAction} />
```

with:

```tsx
          {model.chapterAcceptanceDesk.visible ? (
            <ChapterAcceptanceDesk model={model} loading={loading} onAction={onAction} />
          ) : (
            <ChapterPlanningDesk model={model} loading={loading} onAction={onAction} />
          )}
```

- [ ] **Step 5: Run build verification**

Run:

```bash
bun run build:web
```

Expected: PASS.

- [ ] **Step 6: Commit the UI**

Run:

```bash
git add ui/web/src/pages/novel-workspace/WritingCockpitPanel.tsx
git commit -m "feat: render chapter acceptance desk"
```

## Task 4: Wire Workspace Actions

**Files:**
- Modify: `ui/web/src/pages/NovelProjectWorkspace.tsx`

- [ ] **Step 1: Pass review records into the cockpit model**

In the `buildWritingCockpitModel` call, add:

```ts
    reviews,
```

Then add `reviews` to the `useMemo` dependency array.

- [ ] **Step 2: Add target-aware prose quality refresh**

Insert this helper near `refreshActiveProseQuality`:

```ts
  const refreshProseQualityForChapter = async (chapterId: number, source = 'manual_refresh') => {
    const chapter = sortedChapters.find(item => Number(item.id) === Number(chapterId))
      || (Number(activeChapter?.id) === Number(chapterId) ? activeChapter : null)
    if (!chapter?.id) return
    if (Number(activeChapter?.id) !== Number(chapterId)) {
      const saved = await selectChapterForWriting(chapterId)
      if (!saved) return
    }
    await refreshActiveProseQuality(source)
  }
```

This helper intentionally selects the target chapter before using the existing active-chapter refresh flow.

- [ ] **Step 3: Add review lookup helpers for cockpit actions**

Insert immediately after the `useMemo` that builds `writingCockpitModel`:

```ts
  const findReviewById = (reviewId: any) => (
    reviews.find(review => String(review.id) === String(reviewId)) || null
  )

  const latestCockpitEditorReport = () => {
    const reviewId = writingCockpitModel.chapterAcceptanceDesk.latestEditorReportId
    return reviewId ? findReviewById(reviewId) : null
  }
```

- [ ] **Step 4: Add next chapter navigation helper**

Insert before `handleWritingCockpitAction`:

```ts
  const acceptCockpitChapterAndContinue = async () => {
    const currentNo = Number(writingCockpitModel.nextChapter?.chapterNo || 0)
    const next = sortedChapters.find(chapter => Number(chapter.chapter_no || 0) > currentNo && !String(chapter.chapter_text || '').replace(/\s/g, '').trim())
      || sortedChapters.find(chapter => Number(chapter.chapter_no || 0) > currentNo)
      || null

    if (!next?.id) {
      message.success('本章已达到交稿条件，当前项目暂无下一章。')
      return
    }

    setWorkspaceArea('chapterWriting')
    const saved = await selectChapterForWriting(Number(next.id))
    if (saved) message.success(`已进入第 ${next.chapter_no} 章。`)
  }
```

- [ ] **Step 5: Add acceptance action cases**

Add these cases to `handleWritingCockpitAction`:

```ts
      case 'refresh_current_quality':
        setWorkspaceArea('chapterWriting')
        if (targetChapterId) {
          void refreshProseQualityForChapter(targetChapterId, 'writing_cockpit')
        } else if (activeChapter) {
          void refreshActiveProseQuality('writing_cockpit')
        }
        break
      case 'create_editor_report':
        setWorkspaceArea('chapterWriting')
        if (targetChapterId) {
          void createEditorReportForChapter(targetChapterId)
        } else {
          void createEditorReport()
        }
        break
      case 'apply_editor_revision': {
        setWorkspaceArea('chapterWriting')
        const report = latestCockpitEditorReport()
        if (!report) {
          message.warning('还没有可用于修订的编辑报告。')
          setRightPanelOpen(true)
          setRightPanelTab('editorReports')
          break
        }
        void applyEditorRevision(report, { skipConfirm: true })
        break
      }
      case 'sync_story_state':
        openStoryStateEditor()
        break
      case 'accept_chapter_and_continue':
        void acceptCockpitChapterAndContinue()
        break
      case 'open_editor_reports':
        setRightPanelOpen(true)
        setRightPanelTab('editorReports')
        break
      case 'open_version_history':
        setWorkspaceArea('chapterWriting')
        if (targetChapterId && Number(activeChapter?.id) !== targetChapterId) {
          void selectChapterForWriting(targetChapterId)
        }
        setRightPanelOpen(true)
        setRightPanelTab('versions')
        break
```

- [ ] **Step 6: Ensure TypeScript covers all action keys**

After adding the switch cases, TypeScript should not report unhandled action key type errors in `NovelProjectWorkspace.tsx`, `WritingCockpitPanel.tsx`, or `writingCockpitModel.ts`.

- [ ] **Step 7: Run workspace and build checks**

Run:

```bash
bun run test:writing-cockpit
bun run test:planning-workspace
bun run build:web
```

Expected: all PASS.

- [ ] **Step 8: Commit action wiring**

Run:

```bash
git add ui/web/src/pages/NovelProjectWorkspace.tsx ui/web/src/pages/novel-workspace/writingCockpitModel.ts ui/web/src/pages/novel-workspace/WritingCockpitPanel.tsx
git commit -m "feat: wire chapter acceptance desk actions"
```

## Task 5: Final Verification

**Files:**
- Inspect: `ui/web/src/pages/novel-workspace/writingCockpitModel.ts`
- Inspect: `ui/web/src/pages/novel-workspace/WritingCockpitPanel.tsx`
- Inspect: `ui/web/src/pages/NovelProjectWorkspace.tsx`
- Inspect: `ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts`

- [ ] **Step 1: Run focused tests**

Run:

```bash
bun run test:writing-cockpit
bun run test:planning-workspace
```

Expected: all PASS.

- [ ] **Step 2: Run web build**

Run:

```bash
bun run build:web
```

Expected: PASS.

- [ ] **Step 3: Check whitespace and patch health**

Run:

```bash
git diff --check
```

Expected: no output and exit code 0.

- [ ] **Step 4: Inspect final git state**

Run:

```bash
git status --short --branch
```

Expected: branch ahead by the acceptance-desk commits, with no unstaged or staged files.

- [ ] **Step 5: Manual browser smoke test**

Start or reuse the local server, open the novel workspace, and verify:

1. Selecting a chapter without正文 shows the planning desk.
2. Selecting a chapter with正文 shows the chapter acceptance desk.
3. The desk shows exactly one primary delivery action.
4. The quality, editor report, revision, story state, and continue actions route to existing UI flows.
5. Accepting a ready chapter moves to the next chapter instead of generating prose again.

## Self-Review Notes

- Spec coverage: The plan covers the post-draft gate, cockpit-only placement, review selection rules, strict state order, target-aware action routing, no backend aggregation endpoint, no acceptance table, and the requested verification commands.
- Type consistency: New action keys are introduced in `WritingCockpitActionKey`, `ACTION_LABELS`, panel icons, model output, and workspace routing. The model exposes `latestEditorReportId` so revision can call `applyEditorRevision(report)`.
- Risk controls: Quality refresh selects the target chapter first, revision uses an existing review object, story state sync opens the existing editor, and acceptance only navigates to the next chapter.
