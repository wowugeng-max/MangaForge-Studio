import { compileOhStoryCorePrompt } from './compile-prompt'
import { loadOhStoryCoreSuite } from './store'
import type { OhStoryCoreSkill, OhStoryCoreSkillId } from './types'

export const OH_STORY_CORE_NOT_INSTALLED = 'OH_STORY_CORE_NOT_INSTALLED'

export type OhStoryCoreAction = 'review' | 'deslop'

export type OhStoryCoreRunnerSuite = {
  revision: string
  skills: Record<string, OhStoryCoreSkill>
}

export type RunOhStoryCoreActionInput = {
  workspace: string
  project: { id: number; title: string }
  chapter: { id: number; chapter_no: number; chapter_text: string }
  action: OhStoryCoreAction
  executeAgent: (...args: any[]) => Promise<any>
  loadSuite?: (workspace: string) => OhStoryCoreRunnerSuite | null
  saveReview: (row: Record<string, any>) => Promise<{ id: number } | any>
  updateChapterText: (row: Record<string, any>) => Promise<any>
}

export type RunOhStoryCoreActionResult = {
  changed: boolean
  review_id?: number
  report_text?: string
  chapter_text?: string
}

const ACTION_SKILL: Record<OhStoryCoreAction, OhStoryCoreSkillId> = {
  review: 'story-review',
  deslop: 'story-deslop',
}

function throwNotInstalled(): never {
  throw Object.assign(new Error('oh-story core suite is not installed'), {
    code: OH_STORY_CORE_NOT_INSTALLED,
  })
}

function agentContent(result: any): string {
  return String(result?.content ?? result?.text ?? '')
}

export async function runOhStoryCoreAction(
  input: RunOhStoryCoreActionInput,
): Promise<RunOhStoryCoreActionResult> {
  const loadSuite = input.loadSuite || ((workspace: string) => loadOhStoryCoreSuite(workspace))
  const suite = loadSuite(input.workspace)
  const skillId = ACTION_SKILL[input.action]
  const skill = suite?.skills?.[skillId]
  if (!suite || !skill || !skillId) throwNotInstalled()

  const prompt = compileOhStoryCorePrompt({
    skillId,
    skillMarkdown: skill.skill_markdown,
    references: skill.references || [],
    chapterText: input.chapter.chapter_text,
    projectTitle: input.project.title,
  })

  const stage = input.action === 'deslop' ? 'humanize' : 'quality_review'
  const responseContract = input.action === 'deslop' ? 'humanize_prose' : 'quality_review_json'
  const agentId = input.action === 'deslop' ? 'prose-agent' : 'review-agent'
  const result = await input.executeAgent(
    stage,
    responseContract,
    agentId,
    input.project,
    { task: prompt },
    { activeWorkspace: input.workspace, skipMemory: true },
  )
  const content = agentContent(result)

  if (input.action === 'review') {
    const saved = await input.saveReview({
      project_id: input.project.id,
      review_type: 'oh_story_review',
      payload: {
        skill_id: skillId,
        revision: suite.revision,
        report_text: content,
        chapter_id: input.chapter.id,
        chapter_no: input.chapter.chapter_no,
      },
    })
    return {
      changed: false,
      review_id: saved?.id,
      report_text: content,
    }
  }

  await input.updateChapterText({
    id: input.chapter.id,
    chapter_id: input.chapter.id,
    project_id: input.project.id,
    chapter_text: content,
    source: 'oh_story_deslop',
  })
  const saved = await input.saveReview({
    project_id: input.project.id,
    review_type: 'oh_story_deslop',
    payload: {
      skill_id: skillId,
      revision: suite.revision,
      report_text: content,
      chapter_id: input.chapter.id,
      chapter_no: input.chapter.chapter_no,
    },
  })
  return {
    changed: true,
    review_id: saved?.id,
    chapter_text: content,
  }
}
