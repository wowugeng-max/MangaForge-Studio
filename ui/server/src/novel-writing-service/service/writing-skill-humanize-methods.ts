import {
  acceptWritingSkillCandidate,
  chunkWritingSkillChapter,
  compileWritingSkillPassPrompt,
  isBuiltinWritingSkillId,
  listInstalledWritingSkillPacks,
  loadInstalledWritingSkillPrompt,
  pickWritingSkillsOverride,
  resolveWritingSkillStageLabel,
  resolveWritingSkillsEnabled,
  type InstalledWritingSkillPack,
  type InstalledWritingSkillPrompt,
  type WritingSkillHumanizeReport,
  type WritingSkillId,
  type WritingSkillPassReport,
} from '../../novel-writing/writing-skills'
import { redactAndBoundCredentialText } from '../../novel-writing/credential-redaction'
import { selectFingerprintAdvisoryProse } from '../../novel-writing/human-webnovel-resistance'
import { countProseChars, proseMaxTokensForWordTarget } from '../../novel-writing/word-target'
import { assertCompleteProseTransportResult } from '../quality/prose-transport-admission'
import { getNovelPayload } from '../../routes/novel-route-utils'
import { throwIfAborted } from './runtime-helpers'
import { executeChapterStage } from '../generation-source/types'

export const WRITING_SKILL_HUMANIZE_VERSION = 'writing_skill_humanize_v2'
export const WRITING_SKILL_HUMANIZE_DEFER_REASON = 'deferred_until_oh_story_core_eval'
export type { WritingSkillHumanizeReport } from '../../novel-writing/writing-skills'

const DEFAULT_WORD_TARGET = {
  mode: 'standard' as const,
  target: 4200,
  min: 3780,
  max: 4620,
  label: '标准章',
  rangeText: '',
}

function extractChapterText(payload: any): string {
  const chapters = Array.isArray(payload?.prose_chapters)
    ? payload.prose_chapters
    : Array.isArray(payload?.proseChapters)
      ? payload.proseChapters
      : []
  const first = chapters[0] || payload || {}
  return String(
    first?.chapter_text
    || first?.chapterText
    || payload?.chapter_text
    || payload?.chapterText
    || payload?.text
    || '',
  )
}

function emptyReport(text: string, extra: Partial<WritingSkillHumanizeReport> = {}): WritingSkillHumanizeReport {
  const chars = countProseChars(text)
  return {
    version: WRITING_SKILL_HUMANIZE_VERSION,
    fiction_humanizer_mode: 'polish',
    enabled_ids: [],
    enabled: false,
    skipped: true,
    accepted: true,
    changed: false,
    warnings: [],
    before_chars: chars,
    after_chars: chars,
    chunk_count: 0,
    passes: [],
    ...extra,
  }
}

function isChapterTaskCancellation(error: any): boolean {
  const code = String(error?.code || '').toUpperCase()
  return ['REQUEST_CANCELED', 'MCP_CANCELLED', 'ABORT_ERR'].includes(code)
    || error?.name === 'AbortError'
}

export function createWritingSkillHumanizeMethods(deps: {
  executeAgent: (...args: any[]) => any
  getStageModelId: (...args: any[]) => any
  getStageTemperature: (...args: any[]) => any
}) {
  const rewriteChunk = async (input: {
    activeWorkspace: string
    project: any
    contextPackage: any
    chunk: { index: number; total: number; text: string }
    skillId: WritingSkillId
    mode: 'polish' | 'rewrite'
    wordTarget: any
    modelId?: number
    skillModelId?: number
    installedPrompt?: InstalledWritingSkillPrompt
    options: any
  }): Promise<string> => {
    const {
      activeWorkspace,
      project,
      contextPackage,
      chunk,
      skillId,
      mode,
      wordTarget,
      modelId,
      skillModelId,
      options,
    } = input
    throwIfAborted(options)
    const execution = options.chapterTaskExecution
    const reviseModelId = execution
      ? (execution.source === 'model' ? skillModelId : undefined)
      : (skillModelId ?? deps.getStageModelId(project, 'revise', modelId))
    const task = compileWritingSkillPassPrompt({
      skillId,
      mode,
      sourceText: chunk.text,
      project,
      contextPackage,
      chunk,
      installed: input.installedPrompt,
    })
    const result = await executeChapterStage({
      execution: options.chapterTaskExecution,
      fallback: deps.executeAgent,
      stage: 'humanize',
      responseContract: 'humanize_prose',
      agentId: 'prose-agent',
      project,
      context: {
        task,
        upstreamContext: contextPackage,
      },
      options: {
        activeWorkspace,
        modelId: reviseModelId ? String(reviseModelId) : undefined,
        maxTokens: proseMaxTokensForWordTarget(wordTarget),
        temperature: deps.getStageTemperature(project, 'revise', 0.35),
        skipMemory: true,
        signal: options.abortSignal,
        timeoutMs: options.llmTimeoutMs || 180000,
      },
    })
    assertCompleteProseTransportResult(result, 'PROSE_REVISION_TRUNCATED')
    const payload = getNovelPayload(result)
    let out = extractChapterText(payload)
    if (!out.trim()) {
      out = String((result as any)?.text || (result as any)?.content || payload || '')
    }
    return String(out || '').trim()
  }

  const runWritingSkillHumanizePass = async (
    activeWorkspace: string,
    project: any,
    contextPackage: any,
    sourceText: string,
    modelId?: number,
    options: any = {},
  ) => {
    const source = String(sourceText || '')
    let installedPacks: InstalledWritingSkillPack[] = []
    try {
      installedPacks = await listInstalledWritingSkillPacks(activeWorkspace)
    } catch {
      installedPacks = []
    }
    const resolved = resolveWritingSkillsEnabled({
      project,
      override: pickWritingSkillsOverride(options),
      installed: installedPacks,
    })
    if (!resolved.ids.length) {
      return {
        final_text: source,
        report: emptyReport(source, {
          reason: 'all_skills_disabled',
          enabled_ids: [],
          fiction_humanizer_mode: resolved.fiction_humanizer_mode,
        }),
      }
    }

    const wordTarget = contextPackage?.chapter_target?.word_target
      || contextPackage?.chapterTarget?.word_target
      || DEFAULT_WORD_TARGET
    const fingerprintSelect = options.fingerprintSelect || selectFingerprintAdvisoryProse
    const warnings: string[] = []
    const passes: WritingSkillPassReport[] = []
    let currentText = source

    for (const [passIndex, id] of resolved.ids.entries()) {
      throwIfAborted(options)
      let installedPrompt: InstalledWritingSkillPrompt | undefined
      if (!isBuiltinWritingSkillId(id)) {
        const pack = installedPacks.find(item => item.id === id)
        let loadError: unknown
        try {
          installedPrompt = pack ? loadInstalledWritingSkillPrompt(pack) : undefined
        } catch (error) {
          loadError = error
        }
        // Unreadable after resolve admitted it (uninstalled mid-run, bounds
        // exceeded, missing files): record an honest failed pass and continue.
        if (!installedPrompt) {
          const message = String((loadError as any)?.message || loadError || '')
          const beforeChars = countProseChars(currentText)
          passes.push({
            id,
            accepted: false,
            reason: message.startsWith('writing_skill_pack_bounds_exceeded')
              ? redactAndBoundCredentialText(message, 240)
              : 'writing_skill_pack_unreadable',
            before_chars: beforeChars,
            after_chars: beforeChars,
            chunk_count: 0,
          })
          continue
        }
      }
      await options.onSkillProgress?.(id, {
        index: passIndex + 1,
        total: resolved.ids.length,
        label: resolveWritingSkillStageLabel(id, installedPacks),
      })
      const passInput = currentText
      const beforeChars = countProseChars(passInput)
      const chunks = chunkWritingSkillChapter(passInput)
      try {
        const rewritten: string[] = []
        for (const chunk of chunks) {
          const chunkText = await rewriteChunk({
            activeWorkspace,
            project,
            contextPackage,
            chunk,
            skillId: id,
            mode: resolved.fiction_humanizer_mode,
            wordTarget,
            modelId,
            skillModelId: resolved.model_id,
            installedPrompt,
            options,
          })
          if (!chunkText) throw new Error('writing_skill_empty_candidate')
          rewritten.push(chunkText)
        }
        const gate = acceptWritingSkillCandidate({
          sourceText: passInput,
          candidateText: rewritten.join('\n\n'),
          enabledIds: [id],
          wordTarget,
          contextPackage,
        })
        if (!gate.accepted) {
          passes.push({
            id,
            ...(id === 'fiction-humanizer-zh' ? { mode: resolved.fiction_humanizer_mode } : {}),
            accepted: false,
            reason: gate.reason,
            before_chars: beforeChars,
            after_chars: beforeChars,
            chunk_count: chunks.length,
          })
          continue
        }

        currentText = gate.text
        const fingerprint = fingerprintSelect(passInput, currentText, { stage: 'writing_skill_humanize' })
        if (!fingerprint.accepted) {
          warnings.push(fingerprint.reason || 'writing_skill_fingerprint')
        }
        currentText = fingerprint.text
        passes.push({
          id,
          ...(id === 'fiction-humanizer-zh' ? { mode: resolved.fiction_humanizer_mode } : {}),
          accepted: true,
          before_chars: beforeChars,
          after_chars: countProseChars(currentText),
          chunk_count: chunks.length,
        })
      } catch (error: any) {
        if (isChapterTaskCancellation(error)) throw error
        currentText = passInput
        passes.push({
          id,
          ...(id === 'fiction-humanizer-zh' ? { mode: resolved.fiction_humanizer_mode } : {}),
          accepted: false,
          reason: redactAndBoundCredentialText(
            String(error?.message || error || ''),
            240,
          ) || 'writing_skill_pass_failed',
          before_chars: beforeChars,
          after_chars: beforeChars,
          chunk_count: chunks.length,
        })
      }
    }

    const changed = currentText !== source
    return {
      final_text: currentText,
      report: {
        version: WRITING_SKILL_HUMANIZE_VERSION,
        fiction_humanizer_mode: resolved.fiction_humanizer_mode,
        enabled_ids: resolved.ids,
        enabled: true,
        skipped: false,
        accepted: true,
        changed,
        warnings,
        before_chars: countProseChars(source),
        after_chars: countProseChars(currentText),
        chunk_count: passes.reduce((sum, pass) => sum + pass.chunk_count, 0),
        ...(resolved.model_id !== undefined
          && (!options.chapterTaskExecution || options.chapterTaskExecution.source === 'model')
          ? { model_id: resolved.model_id }
          : {}),
        passes,
      } satisfies WritingSkillHumanizeReport,
    }
  }

  return { runWritingSkillHumanizePass }
}
