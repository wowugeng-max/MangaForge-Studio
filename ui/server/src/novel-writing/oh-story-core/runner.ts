import { ohStoryChapterTextHash } from './chapter-text-hash'
import { compileOhStoryApplyPrompt } from './compile-apply-prompt'
import { compileOhStoryCorePrompt } from './compile-prompt'
import {
  blockingDeslopFindings,
  defaultNormalizeDeslopText,
  defaultScanDeslopText,
  deslopPassNote,
  OH_STORY_DESLOP_MAX_ROUNDS,
  parseDeslopAiGrade,
  requiredDeslopRounds,
  type DeslopFinding,
  type DeslopNormalizeResult,
  type DeslopScanResult,
} from './deslop-file-mode'
import { ohStoryApplyRewroteTooMuch } from './paragraph-retention'
import { ohStoryReviewMatchesChapterText, parseOhStoryReviewPayload } from './review-match'
import { hasStoryDeslopScripts, loadOhStoryCoreSuite } from './store'
import type { OhStoryCoreSkill, OhStoryCoreSkillId } from './types'

export const OH_STORY_CORE_NOT_INSTALLED = 'OH_STORY_CORE_NOT_INSTALLED'
export const OH_STORY_CORE_EMPTY_OUTPUT = 'OH_STORY_CORE_EMPTY_OUTPUT'
export const OH_STORY_CORE_NOT_PROSE = 'OH_STORY_CORE_NOT_PROSE'
export const OH_STORY_APPLY_NO_REVIEW = 'OH_STORY_APPLY_NO_REVIEW'
export const OH_STORY_APPLY_STALE_REVIEW = 'OH_STORY_APPLY_STALE_REVIEW'
export const OH_STORY_APPLY_REWROTE_TOO_MUCH = 'OH_STORY_APPLY_REWROTE_TOO_MUCH'

export type OhStoryCoreAction = 'review' | 'deslop' | 'apply'

export type OhStoryCoreRunnerSuite = {
  revision: string
  skills: Record<string, OhStoryCoreSkill>
}

export type RunOhStoryCoreActionInput = {
  workspace: string
  project: { id: number; title: string }
  chapter: { id: number; chapter_no: number; chapter_text: string }
  action: OhStoryCoreAction
  modelId?: number | string
  executeAgent: (...args: any[]) => Promise<any>
  loadSuite?: (workspace: string) => OhStoryCoreRunnerSuite | null
  findLatestOhStoryReview?: (input: {
    workspace: string
    projectId: number
    chapterId: number
  }) => Promise<any | null>
  saveReview: (row: Record<string, any>) => Promise<{ id: number } | any>
  updateChapterText: (row: Record<string, any>) => Promise<any>
  scanDeslopText?: (text: string, phase: 'prescan' | 'rescan') => Promise<DeslopScanResult>
  normalizeDeslopText?: (text: string) => Promise<DeslopNormalizeResult>
}

export type RunOhStoryCoreActionResult = {
  changed: boolean
  review_id?: number
  report_text?: string
  chapter_text?: string
}

const ACTION_SKILL: Record<Exclude<OhStoryCoreAction, 'apply'>, OhStoryCoreSkillId> = {
  review: 'story-review',
  deslop: 'story-deslop',
}

function throwNotInstalled(): never {
  throw Object.assign(new Error('oh-story core suite is not installed'), {
    code: OH_STORY_CORE_NOT_INSTALLED,
  })
}

function agentContent(result: any): string {
  return String(result?.content ?? result?.text ?? '').trim()
}

function requireAgentContent(result: any): string {
  const content = agentContent(result)
  if (content) return content
  const detail = String(result?.error || '').trim()
  throw Object.assign(new Error(detail || 'oh-story core returned empty output'), {
    code: OH_STORY_CORE_EMPTY_OUTPUT,
  })
}

function looksLikeDeslopReport(text: string): boolean {
  const head = text.slice(0, 240)
  return /AI味检测报告|去AI味润色报告|故事审查报告/.test(head)
}

function throwNotProse(): never {
  throw Object.assign(new Error('oh-story deslop returned a report instead of chapter prose'), {
    code: OH_STORY_CORE_NOT_PROSE,
  })
}

export function extractOhStoryDeslopChapterText(content: string): string {
  const raw = String(content || '').trim()
  if (!raw) throwNotProse()
  const marker = raw.match(/(?:^|\n)#{2,3}\s*润色后全文\s*\n+/)
  if (marker && marker.index != null) {
    const prose = raw.slice(marker.index + marker[0].length).trim()
    if (!prose || looksLikeDeslopReport(prose)) throwNotProse()
    return prose
  }
  if (looksLikeDeslopReport(raw)) throwNotProse()
  return raw
}

export function extractOhStoryApplyChapterText(content: string): string {
  const raw = String(content || '').trim()
  if (!raw) throwNotProse()
  const marker = raw.match(/(?:^|\n)#{2,3}\s*修订后全文\s*\n+/)
  if (marker && marker.index != null) {
    const prose = raw.slice(marker.index + marker[0].length).trim()
    if (!prose || looksLikeDeslopReport(prose)) throwNotProse()
    return prose
  }
  if (looksLikeDeslopReport(raw)) throwNotProse()
  return raw
}

export async function runOhStoryCoreAction(
  input: RunOhStoryCoreActionInput,
): Promise<RunOhStoryCoreActionResult> {
  if (input.action === 'apply') {
    const review = await (input.findLatestOhStoryReview?.({
      workspace: input.workspace,
      projectId: input.project.id,
      chapterId: input.chapter.id,
    }) ?? null)
    if (!review) {
      throw Object.assign(new Error('先对本稿重新审稿'), { code: OH_STORY_APPLY_NO_REVIEW })
    }
    if (!ohStoryReviewMatchesChapterText(review, input.chapter.chapter_text)) {
      throw Object.assign(new Error('先对本稿重新审稿'), { code: OH_STORY_APPLY_STALE_REVIEW })
    }
    const reportText = String(parseOhStoryReviewPayload(review).report_text || '').trim()
    const prompt = compileOhStoryApplyPrompt({
      projectTitle: input.project.title,
      chapterText: input.chapter.chapter_text,
      reportText,
    })
    const result = await input.executeAgent(
      'humanize',
      'humanize_prose',
      'prose-agent',
      input.project,
      { task: prompt },
      {
        activeWorkspace: input.workspace,
        skipMemory: true,
        ...(input.modelId ? { modelId: String(input.modelId) } : {}),
      },
    )
    const content = requireAgentContent(result)
    const chapterText = extractOhStoryApplyChapterText(content)
    if (ohStoryApplyRewroteTooMuch(input.chapter.chapter_text, chapterText)) {
      throw Object.assign(new Error('这次改动太大，像整章重写。请再试一次'), {
        code: OH_STORY_APPLY_REWROTE_TOO_MUCH,
      })
    }
    await input.updateChapterText({
      id: input.chapter.id,
      chapter_id: input.chapter.id,
      project_id: input.project.id,
      chapter_text: chapterText,
      source: 'oh_story_apply',
    })
    const saved = await input.saveReview({
      project_id: input.project.id,
      review_type: 'oh_story_apply',
      payload: {
        source_review_id: review.id,
        chapter_id: input.chapter.id,
        chapter_no: input.chapter.chapter_no,
        chapter_text_hash: ohStoryChapterTextHash(input.chapter.chapter_text),
        report_text: content,
      },
    })
    return { changed: true, review_id: saved?.id, chapter_text: chapterText }
  }

  const loadSuite = input.loadSuite || ((workspace: string) => loadOhStoryCoreSuite(workspace))
  const suite = loadSuite(input.workspace)
  const skillId = ACTION_SKILL[input.action]
  const skill = suite?.skills?.[skillId]
  if (!suite || !skill || !skillId) throwNotInstalled()

  const runAgent = async (chapterText: string, scriptFindings?: string) => {
    const prompt = compileOhStoryCorePrompt({
      skillId,
      skillMarkdown: skill.skill_markdown,
      references: skill.references || [],
      chapterText,
      projectTitle: input.project.title,
      scriptFindings,
    })
    const stage = input.action === 'deslop' ? 'humanize' : 'quality_review'
    const responseContract = input.action === 'deslop' ? 'humanize_prose' : 'quality_review_json'
    const agentId = input.action === 'deslop' ? 'prose-agent' : 'review-agent'
    return requireAgentContent(await input.executeAgent(
      stage,
      responseContract,
      agentId,
      input.project,
      { task: prompt },
      {
        activeWorkspace: input.workspace,
        skipMemory: true,
        ...(input.modelId ? { modelId: String(input.modelId) } : {}),
      },
    ))
  }

  if (input.action === 'review') {
    const content = await runAgent(input.chapter.chapter_text)
    const saved = await input.saveReview({
      project_id: input.project.id,
      review_type: 'oh_story_review',
      payload: {
        skill_id: skillId,
        revision: suite.revision,
        report_text: content,
        chapter_id: input.chapter.id,
        chapter_no: input.chapter.chapter_no,
        chapter_text_hash: ohStoryChapterTextHash(input.chapter.chapter_text),
      },
    })
    return {
      changed: false,
      review_id: saved?.id,
      report_text: content,
    }
  }

  if (!input.scanDeslopText && !hasStoryDeslopScripts(input.workspace)) throwNotInstalled()
  const scan = input.scanDeslopText || ((text, phase) => (
    defaultScanDeslopText(input.workspace, input.chapter.id, text, phase)
  ))
  const normalize = input.normalizeDeslopText || ((text) => (
    defaultNormalizeDeslopText(input.workspace, input.chapter.id, text)
  ))

  let chapterText = input.chapter.chapter_text
  const reports: string[] = []
  const scriptLogs: Array<{ phase: string; findings: DeslopFinding[]; log: string }> = []
  const prescan = await scan(chapterText, 'prescan')
  scriptLogs.push({ phase: 'prescan', findings: prescan.findings, log: prescan.log })

  let rounds = 0
  let requiredRounds = 1
  while (rounds < OH_STORY_DESLOP_MAX_ROUNDS) {
    const findings = rounds === 0 ? prescan.findings : (await scan(chapterText, 'rescan')).findings
    if (rounds > 0) {
      scriptLogs.push({ phase: `rescan-${rounds + 1}`, findings, log: '' })
      const needSkillPass = rounds < requiredRounds
      const needScriptPass = blockingDeslopFindings(findings).length > 0
      if (!needSkillPass && !needScriptPass) break
    }
    const passNote = deslopPassNote(rounds + 1)
    const content = await runAgent(
      chapterText,
      [passNote, JSON.stringify(findings, null, 2)].filter(Boolean).join('\n'),
    )
    reports.push(content)
    chapterText = extractOhStoryDeslopChapterText(content)
    rounds += 1
    if (rounds === 1) requiredRounds = requiredDeslopRounds(parseDeslopAiGrade(content))
  }

  const normalized = await normalize(chapterText)
  chapterText = normalized.text
  scriptLogs.push({ phase: 'normalize', findings: [], log: normalized.log })

  await input.updateChapterText({
    id: input.chapter.id,
    chapter_id: input.chapter.id,
    project_id: input.project.id,
    chapter_text: chapterText,
    source: 'oh_story_deslop',
  })
  const saved = await input.saveReview({
    project_id: input.project.id,
    review_type: 'oh_story_deslop',
    payload: {
      skill_id: skillId,
      revision: suite.revision,
      report_text: reports.join('\n\n---\n\n'),
      chapter_id: input.chapter.id,
      chapter_no: input.chapter.chapter_no,
      file_mode: true,
      rounds,
      script_logs: scriptLogs,
    },
  })
  return {
    changed: true,
    review_id: saved?.id,
    chapter_text: chapterText,
  }
}
