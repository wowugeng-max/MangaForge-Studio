import { describe, expect, test } from 'bun:test'
import type { NovelRunRecord } from '../../novel'
import type {
  EditorRevisionCheckpoint,
  EditorRevisionPhase,
  EditorRevisionPhaseState,
} from './editor-revision-contract'
import { revisionTextHash } from './revision-candidate-admission'
import {
  buildEditorRevisionDiagnostics,
  buildPublicEditorRevisionRun,
} from './revision-run-view'

const SOURCE_TEXT = '不可泄漏的源章节正文'
const CANDIDATE_TEXT = '完整候选正文'
const FULL_CONTEXT = '不可泄漏的完整 context package'
const RENDERED_PROMPT = '不可泄漏的 rendered prompt'

function initialCheckpoint(): EditorRevisionCheckpoint {
  const phases = [
    'generate_candidate',
    'admit_candidate',
    'persist_chapter',
    'post_quality',
    'sync_current_story_state',
    'record_continuity_warning',
    'completed',
  ] as const
  return {
    schema_version: 1,
    phase: 'generate_candidate',
    phases: Object.fromEntries(phases.map(phase => [phase, {
      status: 'pending',
      attempt: 0,
    }])) as Record<EditorRevisionPhase, EditorRevisionPhaseState>,
    prose_persisted: false,
    warnings: [],
  }
}

function canonicalInput() {
  return {
    schema_version: 1,
    project_id: 3,
    chapter_id: 7,
    chapter_no: 12,
    chapter_title: '门后名单',
    review_id: 9,
    source_chapter_updated_at: '2030-01-01T00:00:00.000Z',
    source_text: SOURCE_TEXT,
    source_text_hash: revisionTextHash(SOURCE_TEXT),
    source_char_count: SOURCE_TEXT.replace(/\s/g, '').length,
    source_review: { id: 9, review_type: 'prose_quality' },
    report: { must_fix: ['收紧章末钩子'] },
    context_package: { previous_chapter: FULL_CONTEXT },
    revision_mode: 'from_report',
    revision_strategy: 'surgical_patch',
    user_prompt: RENDERED_PROMPT,
    model_id: 11,
    auto_quality_check: true,
    auto_story_state: true,
    created_at: '2030-01-01T00:00:00.000Z',
  }
}

function runWithCheckpoint(
  checkpoint: EditorRevisionCheckpoint,
  status: NovelRunRecord['status'] = 'running',
): NovelRunRecord {
  return {
    id: 41,
    project_id: 3,
    run_type: 'editor_revision',
    step_name: 'chapter-12',
    status,
    input_ref: JSON.stringify(canonicalInput()),
    output_ref: JSON.stringify(checkpoint),
    error_message: '',
    scope_key: 'chapter:7',
    created_at: '2030-01-01T00:00:00.000Z',
    updated_at: '2030-01-01T00:00:02.000Z',
  }
}

function runWithCandidate(candidateText = CANDIDATE_TEXT): NovelRunRecord {
  const checkpoint = initialCheckpoint()
  checkpoint.phase = 'admit_candidate'
  checkpoint.phases.generate_candidate = {
    status: 'completed',
    attempt: 1,
    completed_at: '2030-01-01T00:00:01.000Z',
    summary: {
      diagnostics: {
        finish_reason: 'stop',
        content_length: candidateText.length,
        content_preview: candidateText,
        provider_messages: [candidateText],
      },
    },
  }
  checkpoint.phases.admit_candidate = {
    status: 'completed',
    attempt: 1,
    completed_at: '2030-01-01T00:00:02.000Z',
    summary: {
      source_char_count: SOURCE_TEXT.length,
      candidate_char_count: candidateText.length,
      candidate_text: candidateText,
    },
  }
  checkpoint.candidate = {
    text: candidateText,
    hash: revisionTextHash(candidateText),
    char_count: candidateText.replace(/\s/g, '').length,
    applied_patches: [{ replacement: candidateText }],
    diagnostics: { candidate_text: candidateText },
  }
  return runWithCheckpoint(checkpoint)
}

describe('editor revision public run view', () => {
  test('returns the exact public status contract without prose, prompt, context, or raw refs', () => {
    const run = runWithCandidate()
    const view = buildPublicEditorRevisionRun(run)

    expect(view).toMatchObject({
      id: run.id,
      run_type: 'editor_revision',
      status: 'running',
      chapter_id: 7,
      chapter_no: 12,
      chapter_title: '门后名单',
      phase: 'admit_candidate',
      phase_label: '安全检查',
      prose_persisted: false,
      quality: null,
      story_state: null,
      warnings: [],
      error: null,
      progress: null,
      can_cancel: true,
      can_retry: false,
      can_continue: false,
      repair_task_link: null,
      linked_task_closure: null,
      chapter_generation_source: null,
      created_at: '2030-01-01T00:00:00.000Z',
      updated_at: '2030-01-01T00:00:02.000Z',
    })
    expect(Object.keys(view).sort()).toEqual([
      'can_cancel',
      'can_continue',
      'can_retry',
      'chapter_id',
      'chapter_no',
      'chapter_title',
      'chapter_generation_source',
      'created_at',
      'error',
      'id',
      'linked_task_closure',
      'phase',
      'phase_label',
      'phases',
      'progress',
      'prose_persisted',
      'quality',
      'repair_task_link',
      'run_type',
      'status',
      'story_state',
      'updated_at',
      'warnings',
    ].sort())
    const serialized = JSON.stringify(view)
    for (const secret of [CANDIDATE_TEXT, SOURCE_TEXT, FULL_CONTEXT, RENDERED_PROMPT, 'input_ref', 'output_ref', 'provider_messages']) {
      expect(serialized).not.toContain(secret)
    }
    expect(view.phases.generate_candidate.summary).toEqual({
      finish_reason: 'stop',
      content_length: CANDIDATE_TEXT.length,
    })
    expect(view.phases.admit_candidate.summary).toEqual({
      source_char_count: SOURCE_TEXT.length,
      candidate_char_count: CANDIDATE_TEXT.length,
    })
  })

  test('exposes only bounded chapter task provenance and drops source secrets', () => {
    const checkpoint = initialCheckpoint()
    ;(checkpoint as any).chapter_generation_source = {
      task_id: 'revision-task-1',
      source: 'mcp',
      source_fingerprint: 'sha256:public-source-fingerprint',
      context_version: 'context-v1',
      model_id: 217,
      key_id: 991,
      server_id: 'PRIVATE_SERVER',
      session_id: 'PRIVATE_SESSION',
      raw_prompt: RENDERED_PROMPT,
      key: 'PRIVATE_KEY',
    }
    const view = buildPublicEditorRevisionRun(runWithCheckpoint(checkpoint))

    expect((view as any).chapter_generation_source).toEqual({
      task_id: 'revision-task-1',
      source: 'mcp',
      source_fingerprint: 'sha256:public-source-fingerprint',
      context_version: 'context-v1',
      model_id: 217,
    })
    const serialized = JSON.stringify(view)
    for (const secret of ['PRIVATE_SERVER', 'PRIVATE_SESSION', 'PRIVATE_KEY', RENDERED_PROMPT, 'key_id', 'raw_prompt']) {
      expect(serialized).not.toContain(secret)
    }
  })

  test('exposes only linked repair task identity and closure acknowledgement state', () => {
    const run = runWithCandidate()
    const input = JSON.parse(String(run.input_ref || '{}'))
    input.repair_task_link = {
      run_id: 77,
      task_index: 2,
      task: {
        title: '不可泄漏的修复任务',
        private_evidence: FULL_CONTEXT,
      },
    }
    run.input_ref = JSON.stringify(input)
    const checkpoint = JSON.parse(String(run.output_ref || '{}'))
    checkpoint.linked_task_closure = { status: 'pending' }
    run.output_ref = JSON.stringify(checkpoint)

    const view = buildPublicEditorRevisionRun(run)

    expect(view).toMatchObject({
      repair_task_link: { run_id: 77, task_index: 2 },
      linked_task_closure: { status: 'pending' },
    })
    const serialized = JSON.stringify(view)
    expect(serialized).not.toContain('不可泄漏的修复任务')
    expect(serialized).not.toContain(FULL_CONTEXT)
    expect(serialized).not.toContain('private_evidence')
  })

  test('reconstructs linked closure acknowledgement without durable extra fields', () => {
    const checkpoint = initialCheckpoint()
    checkpoint.phase = 'completed'
    for (const phase of Object.keys(checkpoint.phases) as EditorRevisionPhase[]) {
      checkpoint.phases[phase] = { status: 'completed', attempt: 1 }
    }
    checkpoint.candidate = {
      text: CANDIDATE_TEXT,
      hash: revisionTextHash(CANDIDATE_TEXT),
      char_count: CANDIDATE_TEXT.replace(/\s/g, '').length,
      applied_patches: [],
      diagnostics: {},
    }
    checkpoint.prose_persisted = true
    checkpoint.completed_at = '2030-01-01T00:00:05.000Z'

    for (const [closure, expected] of [
      [
        { status: 'pending', task: { secret: FULL_CONTEXT }, arbitrary: RENDERED_PROMPT },
        { status: 'pending' },
      ],
      [
        {
          status: 'completed',
          completed_at: '2030-01-01T00:00:06.000Z',
          task: { secret: FULL_CONTEXT },
          arbitrary: RENDERED_PROMPT,
        },
        { status: 'completed', completed_at: '2030-01-01T00:00:06.000Z' },
      ],
    ] as const) {
      const withClosure = structuredClone(checkpoint)
      ;(withClosure as any).linked_task_closure = closure
      const run = runWithCheckpoint(withClosure, 'completed')
      const view = buildPublicEditorRevisionRun(run)
      const diagnostics = buildEditorRevisionDiagnostics(run)

      expect(view.linked_task_closure).toEqual(expected)
      const serialized = JSON.stringify({ view, diagnostics })
      expect(serialized).not.toContain(FULL_CONTEXT)
      expect(serialized).not.toContain(RENDERED_PROMPT)
      expect(serialized).not.toContain('arbitrary')
      expect(serialized).not.toContain('"task":')
    }

    const malformed = structuredClone(checkpoint)
    ;(malformed as any).linked_task_closure = {
      status: 'completed',
      completed_at: 'not-a-date',
      arbitrary: FULL_CONTEXT,
    }
    const malformedRun = runWithCheckpoint(malformed, 'completed')
    expect(buildPublicEditorRevisionRun(malformedRun).linked_task_closure).toBeNull()
    expect(JSON.stringify(buildEditorRevisionDiagnostics(malformedRun))).not.toContain(FULL_CONTEXT)
  })

  test('publishes a bounded convergence summary for linked terminal reconciliation', () => {
    const checkpoint = initialCheckpoint()
    checkpoint.phase = 'completed'
    for (const phase of Object.keys(checkpoint.phases) as EditorRevisionPhase[]) {
      checkpoint.phases[phase] = { status: 'completed', attempt: 1 }
    }
    checkpoint.phases.record_continuity_warning.summary = {
      convergence_review_id: 93,
    }
    checkpoint.candidate = {
      text: CANDIDATE_TEXT,
      hash: revisionTextHash(CANDIDATE_TEXT),
      char_count: CANDIDATE_TEXT.replace(/\s/g, '').length,
      applied_patches: [],
      diagnostics: {},
    }
    checkpoint.prose_persisted = true
    checkpoint.delivery_risk_convergence = {
      review_id: 93,
      status: 'cleared',
      label: '风险已清零',
      before_count: 2,
      after_count: 0,
      resolved_count: 2,
      residual_count: 0,
      added_count: 0,
      next_actions: [FULL_CONTEXT],
    }
    checkpoint.completed_at = '2030-01-01T00:00:05.000Z'

    const view = buildPublicEditorRevisionRun(runWithCheckpoint(checkpoint, 'completed'))

    expect(view.phases.record_continuity_warning.summary).toMatchObject({
      convergence_review_id: 93,
      delivery_risk_convergence: {
        status: 'cleared',
        label: '风险已清零',
        before_count: 2,
        after_count: 0,
        resolved_count: 2,
        residual_count: 0,
        added_count: 0,
      },
    })
    expect(JSON.stringify(view)).not.toContain(FULL_CONTEXT)
    expect(JSON.stringify(view)).not.toContain('next_actions')
  })

  test('derives retry, continue, cancel, and restart-required actions from durable state', () => {
    const queued = buildPublicEditorRevisionRun(runWithCheckpoint(initialCheckpoint(), 'queued'))
    expect(queued).toMatchObject({ can_cancel: true, can_retry: false, can_continue: false })

    const failedBeforeCommit = initialCheckpoint()
    failedBeforeCommit.phases.generate_candidate = { status: 'failed', attempt: 1, error_code: 'PROVIDER_FAILED', error: 'provider failed' }
    failedBeforeCommit.error = { code: 'PROVIDER_FAILED', message: 'provider failed' }
    expect(buildPublicEditorRevisionRun(runWithCheckpoint(failedBeforeCommit, 'failed'))).toMatchObject({
      can_cancel: false,
      can_retry: true,
      can_continue: false,
    })

    const failedAfterCommit = initialCheckpoint()
    failedAfterCommit.phase = 'post_quality'
    failedAfterCommit.phases.generate_candidate = { status: 'completed', attempt: 1 }
    failedAfterCommit.phases.admit_candidate = { status: 'completed', attempt: 1 }
    failedAfterCommit.phases.persist_chapter = { status: 'completed', attempt: 1 }
    failedAfterCommit.phases.post_quality = { status: 'failed', attempt: 1, error_code: 'QUALITY_FAILED', error: 'quality failed' }
    failedAfterCommit.candidate = {
      text: CANDIDATE_TEXT,
      hash: revisionTextHash(CANDIDATE_TEXT),
      char_count: CANDIDATE_TEXT.replace(/\s/g, '').length,
      applied_patches: [],
      diagnostics: {},
    }
    failedAfterCommit.prose_persisted = true
    failedAfterCommit.error = { code: 'QUALITY_FAILED', message: 'quality failed' }
    expect(buildPublicEditorRevisionRun(runWithCheckpoint(failedAfterCommit, 'failed'))).toMatchObject({
      can_cancel: false,
      can_retry: false,
      can_continue: true,
    })

    const restartRequired = structuredClone(failedBeforeCommit)
    restartRequired.phases.generate_candidate.error_code = 'SOURCE_VERSION_CHANGED'
    restartRequired.error = { code: 'SOURCE_VERSION_CHANGED', message: 'source changed' }
    expect(buildPublicEditorRevisionRun(runWithCheckpoint(restartRequired, 'failed'))).toMatchObject({
      can_cancel: false,
      can_retry: false,
      can_continue: false,
    })

    expect(buildPublicEditorRevisionRun(runWithCheckpoint(initialCheckpoint(), 'cancel_requested'))).toMatchObject({
      can_cancel: false,
      can_retry: false,
      can_continue: false,
    })
  })

  test('exposes failed candidate evidence only in diagnostics and still omits immutable source/context', () => {
    const checkpoint = initialCheckpoint()
    checkpoint.phase = 'admit_candidate'
    checkpoint.phases.generate_candidate = {
      status: 'completed',
      attempt: 1,
      summary: {
        diagnostics: {
          finish_reason: 'max_tokens',
          content_length: CANDIDATE_TEXT.length,
          content_preview: '候选预览',
          provider_result_ref: 'provider-result://revision-41',
          source_text: SOURCE_TEXT,
        },
      },
    }
    checkpoint.phases.admit_candidate = {
      status: 'failed',
      attempt: 1,
      error_code: 'REVISION_CANDIDATE_TOO_SHORT',
      error: 'candidate too short',
    }
    checkpoint.error = {
      code: 'REVISION_CANDIDATE_TOO_SHORT',
      message: 'candidate too short',
      diagnostics: {
        rejected_candidate: {
          text: CANDIDATE_TEXT,
          hash: revisionTextHash(CANDIDATE_TEXT),
          char_count: CANDIDATE_TEXT.length,
        },
        finish_reason: 'max_tokens',
        provider_result_ref: 'provider-result://revision-41',
        source_text: SOURCE_TEXT,
        context_package: FULL_CONTEXT,
      },
    }
    const run = runWithCheckpoint(checkpoint, 'failed')

    const publicView = buildPublicEditorRevisionRun(run)
    const diagnostics = buildEditorRevisionDiagnostics(run)

    expect(JSON.stringify(publicView)).not.toContain(CANDIDATE_TEXT)
    expect(diagnostics).toMatchObject({
      id: run.id,
      chapter_id: 7,
      error: { code: 'REVISION_CANDIDATE_TOO_SHORT', message: '修订候选明显短于原文' },
      rejected_candidate: {
        text: CANDIDATE_TEXT,
        hash: revisionTextHash(CANDIDATE_TEXT),
        char_count: CANDIDATE_TEXT.length,
      },
      generation: {
        finish_reason: 'max_tokens',
        content_length: CANDIDATE_TEXT.length,
        content_preview: '候选预览',
        provider_result_ref: 'provider-result://revision-41',
      },
    })
    const serialized = JSON.stringify(diagnostics)
    expect(serialized).toContain(CANDIDATE_TEXT)
    expect(serialized).not.toContain(SOURCE_TEXT)
    expect(serialized).not.toContain(FULL_CONTEXT)
    expect(serialized).not.toContain(RENDERED_PROMPT)
    expect(serialized).not.toContain('input_ref')
    expect(serialized).not.toContain('output_ref')
  })

  test('uses controlled public error, warning, and reason values for coherent failed runs', () => {
    const checkpoint = initialCheckpoint()
    checkpoint.phase = 'post_quality'
    checkpoint.phases.generate_candidate = {
      status: 'completed',
      attempt: 1,
      summary: {
        diagnostics: {
          finish_reason: 'max_tokens',
          incomplete_reason: FULL_CONTEXT,
          content_length: CANDIDATE_TEXT.length,
          content_preview: '候选安全预览',
          raw_keys: [SOURCE_TEXT],
          stream_tail: [{
            type: RENDERED_PROMPT,
            keys: [FULL_CONTEXT],
            preview: CANDIDATE_TEXT,
          }],
          provider_result_ref: 'provider-result://safe-41',
        },
      },
    }
    checkpoint.phases.admit_candidate = {
      status: 'completed',
      attempt: 1,
      summary: {
        source_char_count: SOURCE_TEXT.length,
        candidate_char_count: CANDIDATE_TEXT.length,
        applied_patch_count: 0,
        unapplied_patch_count: 1,
        unapplied_patch_reasons: [{
          type: `replacement-${SOURCE_TEXT}`,
          reason: `provider-${FULL_CONTEXT}`,
        }],
      },
    }
    checkpoint.phases.persist_chapter = {
      status: 'completed',
      attempt: 1,
      summary: { commit_status: 'committed', review_id: 77 },
    }
    checkpoint.phases.post_quality = {
      status: 'failed',
      attempt: 1,
      error_code: `PROVIDER_${SOURCE_TEXT}`,
      error: `provider echoed ${RENDERED_PROMPT}`,
      summary: {
        reason: `provider-${SOURCE_TEXT}`,
        review_id: 88,
        score: 72,
      },
    }
    checkpoint.candidate = {
      text: CANDIDATE_TEXT,
      hash: revisionTextHash(CANDIDATE_TEXT),
      char_count: CANDIDATE_TEXT.replace(/\s/g, '').length,
      applied_patches: [],
      diagnostics: {},
    }
    checkpoint.prose_persisted = true
    checkpoint.post_quality = { review_id: 88, score: 72 }
    checkpoint.warnings = [
      { code: 'POST_QUALITY_NEEDS_REVISION', message: `provider warning ${FULL_CONTEXT}` },
      { code: `WARNING_${SOURCE_TEXT}`, message: `provider warning ${CANDIDATE_TEXT}` },
    ]
    checkpoint.error = {
      code: 'REVISION_LLM_TIMEOUT',
      message: `provider echoed ${CANDIDATE_TEXT}`,
    }
    const run = runWithCheckpoint(checkpoint, 'failed')

    const view = buildPublicEditorRevisionRun(run)
    const diagnostics = buildEditorRevisionDiagnostics(run)

    expect(view).toMatchObject({
      status: 'failed',
      chapter_id: 7,
      error: {
        code: 'REVISION_LLM_TIMEOUT',
        message: 'editor revision model call timed out',
      },
      warnings: [{
        code: 'POST_QUALITY_NEEDS_REVISION',
        message: '修订后质检仍建议人工复查',
      }],
      phases: {
        generate_candidate: {
          summary: {
            finish_reason: 'max_tokens',
            incomplete_reason: 'unknown',
            content_length: CANDIDATE_TEXT.length,
          },
        },
        post_quality: {
          error_code: 'REVISION_FAILED',
          error: 'editor revision failed',
          summary: { review_id: 88, score: 72 },
        },
      },
    })
    expect(view.phases.post_quality.summary).not.toHaveProperty('reason')
    expect(view.phases.admit_candidate.summary).not.toHaveProperty('unapplied_patch_reasons')
    expect(diagnostics).toMatchObject({
      error: {
        code: 'REVISION_LLM_TIMEOUT',
        message: 'editor revision model call timed out',
      },
      generation: {
        finish_reason: 'max_tokens',
        incomplete_reason: 'unknown',
        content_preview: '候选安全预览',
        provider_result_ref: 'provider-result://safe-41',
      },
      admission: {
        source_char_count: SOURCE_TEXT.length,
        candidate_char_count: CANDIDATE_TEXT.length,
        unapplied_patch_count: 1,
      },
    })
    expect(view.phases.generate_candidate.summary).not.toHaveProperty('raw_keys')
    expect((diagnostics.generation as any)?.raw_keys).toBeUndefined()
    expect((diagnostics.generation as any)?.stream_tail).toBeUndefined()
    expect((diagnostics.admission as any)?.unapplied_patch_reasons).toBeUndefined()

    const serialized = JSON.stringify({ view, diagnostics })
    for (const protectedText of [SOURCE_TEXT, CANDIDATE_TEXT, RENDERED_PROMPT, FULL_CONTEXT]) {
      expect(serialized).not.toContain(protectedText)
    }
  })

  test('fails safe for malformed legacy refs without throwing or echoing them', () => {
    const run: NovelRunRecord = {
      id: 99,
      project_id: 3,
      run_type: 'editor_revision',
      step_name: 'legacy',
      status: 'success',
      input_ref: `legacy input ${SOURCE_TEXT} ${RENDERED_PROMPT}`,
      output_ref: `legacy output ${CANDIDATE_TEXT} ${FULL_CONTEXT}`,
      error_message: `legacy provider error ${CANDIDATE_TEXT}`,
      created_at: '2030-01-01T00:00:00.000Z',
    }

    expect(() => buildPublicEditorRevisionRun(run)).not.toThrow()
    const view = buildPublicEditorRevisionRun(run)
    expect(view).toMatchObject({
      id: 99,
      run_type: 'editor_revision',
      status: 'failed',
      progress: null,
      can_cancel: false,
      can_retry: false,
      can_continue: false,
      error: { code: 'REVISION_RUN_MALFORMED' },
    })
    const serialized = JSON.stringify(view)
    for (const secret of [SOURCE_TEXT, CANDIDATE_TEXT, FULL_CONTEXT, RENDERED_PROMPT, 'input_ref', 'output_ref']) {
      expect(serialized).not.toContain(secret)
    }
  })

  test.each([
    {
      label: 'source text hash mismatch',
      mutate: (run: NovelRunRecord) => {
        const input = JSON.parse(String(run.input_ref || '{}'))
        input.source_text_hash = revisionTextHash(`${SOURCE_TEXT}已变更`)
        run.input_ref = JSON.stringify(input)
      },
    },
    {
      label: 'source character count mismatch',
      mutate: (run: NovelRunRecord) => {
        const input = JSON.parse(String(run.input_ref || '{}'))
        input.source_char_count += 1
        run.input_ref = JSON.stringify(input)
      },
    },
    {
      label: 'empty immutable source text',
      mutate: (run: NovelRunRecord) => {
        const input = JSON.parse(String(run.input_ref || '{}'))
        input.source_text = ''
        input.source_text_hash = revisionTextHash('')
        input.source_char_count = 0
        run.input_ref = JSON.stringify(input)
      },
    },
    {
      label: 'non-integer model id',
      mutate: (run: NovelRunRecord) => {
        const input = JSON.parse(String(run.input_ref || '{}'))
        input.model_id = 11.5
        run.input_ref = JSON.stringify(input)
      },
    },
    {
      label: 'chapter scope mismatch',
      mutate: (run: NovelRunRecord) => {
        run.scope_key = 'chapter:999'
      },
    },
  ])('fails safe for durable $label without exposing private revision data', ({ mutate }) => {
    const run = runWithCandidate()
    mutate(run)

    const view = buildPublicEditorRevisionRun(run)
    const diagnostics = buildEditorRevisionDiagnostics(run)

    expect(view).toMatchObject({
      status: 'failed',
      chapter_id: 0,
      progress: null,
      can_cancel: false,
      can_retry: false,
      can_continue: false,
      error: { code: 'REVISION_RUN_MALFORMED' },
    })
    expect(diagnostics).toMatchObject({
      status: 'failed',
      chapter_id: 0,
      error: { code: 'REVISION_RUN_MALFORMED' },
      rejected_candidate: null,
      generation: null,
      admission: null,
    })
    const serialized = JSON.stringify({ view, diagnostics })
    for (const secret of [SOURCE_TEXT, CANDIDATE_TEXT, FULL_CONTEXT, RENDERED_PROMPT, 'input_ref', 'output_ref']) {
      expect(serialized).not.toContain(secret)
    }
  })

  test('keeps a valid revision input compatible when model id is omitted', () => {
    const run = runWithCandidate()
    const input = JSON.parse(String(run.input_ref || '{}'))
    delete input.model_id
    run.input_ref = JSON.stringify(input)

    expect(buildPublicEditorRevisionRun(run)).toMatchObject({
      status: 'running',
      chapter_id: 7,
      can_cancel: true,
      error: null,
    })
  })
})
