import { executeNovelAgentChain as defaultExecuteNovelAgentChain } from '../llm'
import { listNovelChapters } from '../novel'
import { extractAgentPlanningChapters, summarizeAgentChainStatus, syncAgentExecutionToNovelStore } from './novel-agent-sync-service'

const PLANNING_AGENT_CHAIN = [
  'market-agent',
  'world-agent',
  'character-agent',
  'outline-agent',
  'detail-outline-agent',
  'continuity-check-agent',
]

type EnsurePlanningOptions = {
  start_chapter?: number
  target_chapter?: number
  chapter_count?: number
  continue_from?: number
  model_id?: number
  missing_chapter_nos?: number[]
  user_outline?: string
}

type EnsurePlanningDeps = {
  executeNovelAgentChain?: (...args: any[]) => Promise<any>
}

function buildExistingChapterContext(chapters: any[], continueFrom: number) {
  if (!continueFrom) return []
  return chapters
    .filter(chapter => Number(chapter.chapter_no || 0) <= continueFrom)
    .slice(-8)
    .map(chapter => ({
      chapter_no: chapter.chapter_no,
      title: chapter.title,
      chapter_summary: chapter.chapter_summary || '',
      ending_hook: chapter.ending_hook || '',
      chapter_text: String(chapter.chapter_text || '').slice(0, 2000),
    }))
}

export function createChapterPlanningEnsureService(deps: EnsurePlanningDeps = {}) {
  const executeNovelAgentChain = deps.executeNovelAgentChain || defaultExecuteNovelAgentChain
  return async function ensureChapterPlanningForRange(activeWorkspace: string, project: any, options: EnsurePlanningOptions = {}) {
    const startNo = Math.max(1, Number(options.start_chapter || 1))
    const targetNo = Math.max(startNo, Number(options.target_chapter || startNo))
    const chapterCount = Math.max(1, Number(options.chapter_count || targetNo - startNo + 1))
    const continueFrom = Math.max(0, Number(options.continue_from ?? (startNo > 1 ? startNo - 1 : 0)))
    const rangeLabel = startNo === targetNo ? `第 ${startNo} 章` : `第 ${startNo}-${targetNo} 章`
    const userOutline = String(options.user_outline || '').trim()
      || `请重点补齐${rangeLabel}的章节目标、核心冲突、结尾钩子和场景拆分。`
    const storedChapters = await listNovelChapters(activeWorkspace, project.id)
    const existingChapters = buildExistingChapterContext(storedChapters, continueFrom)
    const execution = await executeNovelAgentChain(
      project,
      `请为无人值守自动写作补齐${rangeLabel}的可执行章节规划，输出必须能直接支撑后续场景卡和正文生成。`,
      activeWorkspace,
      options.model_id,
      PLANNING_AGENT_CHAIN,
      {
        chapterCount,
        continueFrom,
        userOutline,
        existingChapters,
      },
    )
    const chainSummary = summarizeAgentChainStatus(execution?.results || [])
    const requestedNos = new Set((options.missing_chapter_nos || [])
      .map(chapterNo => Number(chapterNo || 0))
      .filter(Boolean))
    const chapterFilter = (chapter: any) => {
      const chapterNo = Number(chapter?.chapter_no || chapter?.chapterNo || 0)
      return chapterNo >= startNo && chapterNo <= targetNo && (requestedNos.size === 0 || requestedNos.has(chapterNo))
    }
    const syncResult = await syncAgentExecutionToNovelStore(
      activeWorkspace,
      project,
      `请为无人值守自动写作补齐${rangeLabel}的可执行章节规划，输出必须能直接支撑后续场景卡和正文生成。`,
      execution,
      { chapterFilter, runSource: 'unattended_goal' },
    )
    const plannedChapters = extractAgentPlanningChapters(execution)
      .filter((chapter: any) => chapter.chapter_no >= startNo && chapter.chapter_no <= targetNo)
      .filter((chapter: any) => requestedNos.size === 0 || requestedNos.has(chapter.chapter_no))
    const repairedChapters = syncResult.synced.chapters

    const ok = repairedChapters.length > 0 && chainSummary.status !== 'failed'
    return {
      ok,
      status: ok ? 'success' : chainSummary.status === 'failed' ? 'failed' : 'warn',
      chain_status: chainSummary,
      repaired_chapters: repairedChapters,
      detail_chapters: plannedChapters,
      missing_chapter_nos: options.missing_chapter_nos || [],
      error: ok ? '' : chainSummary.error || '规划链未返回可落库的章节细纲',
    }
  }
}

export const ensureChapterPlanningForRange = createChapterPlanningEnsureService()
