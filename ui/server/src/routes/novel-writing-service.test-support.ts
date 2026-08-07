import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  createNovelChapter,
  createNovelCharacter,
  createNovelProject,
  createNovelWorldbuilding,
  getNovelProject,
} from '../novel'

function countProseChars(value: string) {
  return String(value || '').replace(/\s+/g, '').length
}

export const proseQualityScores = {
  continuity: 7,
  core_promise_agency: 6,
  conflict_causality: 7,
  payoff_hook: 6,
  prose_style: 7,
  fact_setting_safety: 8,
}

export type ProsePipelineTaskKind =
  | 'scene_cards'
  | 'contraction'
  | 'expansion'
  | 'meme'
  | 'editor'
  | 'quality_review'
  | 'readability_review'
  | 'structured_review'
  | 'quality_revision'
  | 'humanize'
  | 'story_state'
  | 'other'

export function classifyProsePipelineTask(agent: string, taskInput: string): ProsePipelineTaskKind {
  const task = String(taskInput || '')
  const payloadSeparators = [
    '【结构化上下文包】',
    '【当前过短正文】',
    '【当前过长正文】',
    '【待改稿正文】',
    '【待润色正文】',
    '【最终正文】',
    '【原文片段】',
    '【原文窗口】',
    '【章节正文】',
    '【待审校正文】',
    '【初稿正文】',
  ]
  for (const rawLine of task.split(/\r\n?|\n/)) {
    const line = rawLine.trimStart()
    if (payloadSeparators.some(separator => line.startsWith(separator))) break
    if (agent === 'outline-agent' && line.startsWith('任务：为当前章节生成可人工确认的场景卡')) return 'scene_cards'
    if (agent === 'prose-agent' && line.startsWith('任务：将本章正文压缩')) return 'contraction'
    if (agent === 'prose-agent' && line.startsWith('任务：将本章正文扩写')) return 'expansion'
    if (agent === 'prose-agent' && line.startsWith('任务：克制型网感润色')) return 'meme'
    if (agent === 'prose-agent' && line.startsWith('任务：商业主编改稿')) return 'editor'
    if (agent === 'review-agent' && (
      line.startsWith('任务：独立审查小说正文')
      || line.startsWith('任务：对刚生成的小说章节进行章节级自检')
    )) return 'quality_review'
    if (agent === 'review-agent' && line.startsWith('任务：对最终章节做可读性/网感复检')) return 'readability_review'
    if (agent === 'review-agent' && line.startsWith('任务：只补缺失的 oh-story 结构化自检字段')) return 'structured_review'
    if (agent === 'prose-agent' && (
      line.startsWith('任务：执行第')
      || line.startsWith('任务：根据自检结果修订本章正文')
    )) return 'quality_revision'
    if (agent === 'prose-agent' && (
      line.startsWith('任务：对小说正文片段执行 Humanize Pass')
      || line.startsWith('任务：对人工特征不足窗口做')
      || line.startsWith('任务：对高风险正文窗口做')
    )) return 'humanize'
    if (agent === 'review-agent' && line.startsWith('任务：从刚入库的章节正文中提取故事状态机增量')) return 'story_state'
  }
  return 'other'
}

/** Matches harness previous-chapter ending so opening continuity admission can pass. */
export const PIPELINE_HANDOFF_CONTINUATION =
  '红灯同时亮起，追捕队从四面压进旧巷。江澈听见耳机里的倒数，立刻撞开铁门。'

/** Clears strong-handoff opening admission so tests can isolate later gates (shape / quality / proper nouns). */
export function withoutOpeningHandoffGuard(override: Record<string, any> = {}) {
  const chapterTarget = {
    previous_handoff: '',
    previousHandoff: '',
    requiredHandoffAnchors: [],
    required_handoff_anchors: [],
    ...(override.chapter_target || override.chapterTarget || {}),
  }
  const continuity = {
    previous_chapter: null,
    previousChapter: null,
    ...(override.continuity || {}),
  }
  const {
    chapter_target: _chapterTarget,
    chapterTarget: _chapterTargetCamel,
    continuity: _continuity,
    ...rest
  } = override
  return {
    ...rest,
    chapter_target: chapterTarget,
    continuity,
  }
}

export function buildPipelineProse(opening: string, action: string) {
  const subjects = ['江澈', '顾遥', '短发追兵', '巷口队长', '楼顶观察手']
  const locations = ['路灯下', '旧墙边', '排水沟旁', '铁门前', '消防梯口']
  const consequences = ['封锁线向东偏移', '通讯频道短暂失声', '后排脚步乱了一拍', '出口露出半步空隙', '楼顶的手电偏离目标']
  const rawOpening = String(opening || '').trim()
  const connectedOpening = (
    rawOpening.includes('追捕队从四面压进旧巷')
    || rawOpening.includes('耳机里的倒数')
    || rawOpening.includes('红灯同时亮起')
  )
    ? rawOpening
    : `${PIPELINE_HANDOFF_CONTINUATION}${rawOpening}`
  const sentences = [connectedOpening]
  for (let index = 0; countProseChars(sentences.join('')) < 960; index += 1) {
    sentences.push(`${subjects[index % subjects.length]}在${locations[index % locations.length]}${action}，${index + 1}号标记随即熄灭，${consequences[index % consequences.length]}。`)
  }
  return sentences.join('')
}

type ProsePipelineHarnessOptions = {
  chapterWordTarget?: any
  draftText?: string
  draftResult?: any
  editorText?: string
  editorResult?: any
  editorSceneBreakdown?: any[]
  editorContinuityNotes?: string[]
  memeText?: string
  memeResult?: any
  enableMemePolish?: boolean
  reviewPayloads?: any[]
  revisionTexts?: string[]
  revisionResults?: any[]
  recheckError?: Error
  contractionError?: Error
  expansionError?: Error
  memoryError?: Error
  contextPackageOverride?: any
  storyStatePayload?: any
  storyStateError?: Error
  qualityGateEnabled?: boolean
  initialSceneCards?: any[]
  sceneCardsPayload?: any[]
  afterCommitError?: Error
  postCommitSyncError?: Error
  admissionMetadataError?: Error
  repairedContextPackageOverride?: any
  requireStagedContextCandidates?: boolean
  referenceService?: any
  humanizeResult?: any | ((sourceText: string) => any)
  chapterGenerationSource?: any
  omitInitialWorldbuilding?: boolean
  readProjectFromStore?: boolean
}

export async function createProsePipelineHarness(
  createWritingService: (ctx: any) => any,
  options: ProsePipelineHarnessOptions = {},
) {
  const workspace = mkdtempSync(join(tmpdir(), 'mangaforge-prose-quality-loop-'))
  const project = await createNovelProject(workspace, {
    title: '怪谈世界：我是超人，怪谈你随意',
    genre: '规则怪谈',
    synopsis: '江澈以超人之力主动打穿怪谈规则。',
    reference_config: {
      chapter_word_target: options.chapterWordTarget || { mode: 'custom', target: 1000 },
      ...(options.chapterGenerationSource ? {
        chapter_generation_source: options.chapterGenerationSource,
      } : {}),
      quality_gate: {
        enabled: options.qualityGateEnabled !== false,
        min_score: 78,
        require_revision_before_store: true,
        max_critical_issues: 0,
        max_high_issues: 0,
      },
    },
  })
  if (!options.omitInitialWorldbuilding) {
    await createNovelWorldbuilding(workspace, {
      project_id: project.id,
      world_summary: '追捕队以怪谈通讯频道同步封锁，江澈的行动会直接改变包围结构。',
      rules: ['频道失联时，追捕队会按最后一道命令继续收紧。'],
    })
  }
  await createNovelCharacter(workspace, {
    project_id: project.id,
    name: '江澈',
    role_type: '主角',
    current_state: { location: '旧城巷口', goal: '打穿追捕圈并夺取频道' },
  })
  await createNovelChapter(workspace, {
    project_id: project.id,
    chapter_no: 9,
    title: '四面封巷',
    chapter_summary: '追捕队从四面封死旧城出口。',
    ending_hook: '所有耳机同时传出幕后指挥者的倒数。',
    chapter_text: '红灯同时亮起，追捕队从四面压进旧巷。江澈听见耳机里的倒数，只剩铁门后那条路还没有完全合拢。',
  })
  const chapter = await createNovelChapter(workspace, {
    project_id: project.id,
    chapter_no: 10,
    title: '打穿合围',
    chapter_goal: '江澈主动打穿追捕圈并夺取指挥频道。',
    chapter_summary: '江澈利用封锁线的联动缺口反向追踪幕后指挥者。',
    conflict: '双层追捕线互相掩护，铁门后的退路正在闭合。',
    ending_hook: '幕后指挥者用顾遥的声音叫出江澈旧名。',
    scene_list: options.initialSceneCards ?? [{
      scene_no: 1,
      title: '铁门破围',
      purpose: '夺下追捕通讯器',
      goal: '打乱双层封锁线',
      obstacle: '追捕队互相掩护',
      conflict: '铁门即将闭合',
      action: '江澈主动撞断路灯制造盲区',
      turn: '通讯器里传出顾遥的声音',
      payoff: '锁定幕后频道',
      ending_hook_seed: '指挥者叫出江澈旧名',
    }],
  })

  const draftText = options.draftText || buildPipelineProse(
    '江澈没有停在阴影里等待，直接切入追捕线。',
    '主动打乱包围并夺取通讯器',
  )
  const reviewPayloads = [...(options.reviewPayloads || [])]
  const revisionTexts = [...(options.revisionTexts || [])]
  const revisionResults = [...(options.revisionResults || [])]
  const modelCalls = { scene_cards: 0, draft: 0, review: 0, revision: 0, editor: 0, meme: 0, contraction: 0, expansion: 0, story_state: 0, other: 0 }
  const storyStateTexts: string[] = []
  const humanizeTexts: string[] = []
  const qualityReviewTasks: string[] = []
  const readabilityReviewTasks: string[] = []
  const qualityRevisionTasks: string[] = []
  const storeTexts: string[] = []
  const memoryTexts: string[] = []
  const commitOrder: string[] = []
  const draftOptions: any[] = []
  const draftContexts: any[] = []
  let storeCalls = 0
  let storyStateCalls = 0
  let qualityReviewCalls = 0
  let contextCalls = 0
  const contextInputs: any[] = []

  const contextOverride = options.contextPackageOverride || {}
  const {
    chapter_target: chapterTargetOverride,
    chapterTarget: chapterTargetCamelOverride,
    continuity: continuityOverride,
    ...contextPackageRestOverride
  } = contextOverride
  const contextPackage = {
    preflight: { ready: true, strict_ready: true, checks: [], warnings: [], blockers: [] },
    chapter_target: {
      id: chapter.id,
      chapter_no: chapter.chapter_no,
      title: chapter.title,
      goal: chapter.chapter_goal,
      summary: chapter.chapter_summary,
      conflict: chapter.conflict,
      ending_hook: chapter.ending_hook,
      previous_handoff: '追捕队从四面封死旧巷，耳机里的倒数只剩三秒。',
      scene_cards: chapter.scene_list,
      core_contract_radar: {
        reader_promise: '江澈必须以可见选择和行动碾碎怪谈规则。',
        core_conflict: '人的主动选择对抗怪谈封锁。',
      },
      longform_compass: {
        reader_promise: '每章核心结果必须由江澈主动争取。',
        no_drift: ['不得等待配角代办破局结果。'],
      },
      ...(options.enableMemePolish ? { meme_strategy: { intensity: '低', meme_bank: ['稳住'] } } : {}),
      ...(chapterTargetOverride || chapterTargetCamelOverride || {}),
    },
    continuity: {
      previous_chapter: {
        chapter_no: 9,
        title: '四面封巷',
        ending_hook: '所有耳机同时传出幕后指挥者的倒数。',
        ending_excerpt: '红灯同时亮起，追捕队从四面压进旧巷。江澈听见耳机里的倒数，只剩铁门后那条路还没有完全合拢。',
      },
      ...(continuityOverride || {}),
    },
    ...contextPackageRestOverride,
  }

  const executeAgent = async (_agent: string, _project: any, input: any) => {
    const task = String(input?.task || '')
    const taskKind = classifyProsePipelineTask(_agent, task)
    if (taskKind === 'scene_cards') {
      modelCalls.scene_cards += 1
      return {
        parsed: {
          scene_cards: options.sceneCardsPayload || [{
            scene_no: 1,
            title: '铁门破围',
            purpose: '夺下追捕通讯器',
            goal: '打乱双层封锁线',
            obstacle: '追捕队互相掩护',
            conflict: '铁门即将闭合',
            action: '江澈主动撞断路灯制造盲区',
            turn: '通讯器里传出顾遥的声音',
            payoff: '锁定幕后频道',
            ending_hook_seed: '指挥者叫出江澈旧名',
          }],
        },
        modelName: 'fake-scene-cards',
      } as any
    }
    if (taskKind === 'contraction') {
      modelCalls.contraction += 1
      if (options.contractionError) throw options.contractionError
      return { parsed: {}, finish_reason: 'stop', modelName: 'fake-contraction' } as any
    }
    if (taskKind === 'expansion') {
      modelCalls.expansion += 1
      if (options.expansionError) throw options.expansionError
      return { parsed: {}, finish_reason: 'stop', modelName: 'fake-expansion' } as any
    }
    if (taskKind === 'meme') {
      modelCalls.meme += 1
      if (options.memeResult !== undefined) return options.memeResult
      return { parsed: { chapter_text: options.memeText || draftText, meme_polish_report: { changed_plot: false } }, modelName: 'fake-meme' } as any
    }
    if (taskKind === 'editor') {
      modelCalls.editor += 1
      if (options.editorResult !== undefined) return options.editorResult
      return {
        parsed: {
          chapter_text: options.editorText || draftText,
          scene_breakdown: options.editorSceneBreakdown || [],
          continuity_notes: options.editorContinuityNotes || [],
          editor_report: { passed: true },
        },
        modelName: 'fake-editor',
      } as any
    }
    if (taskKind === 'quality_review') {
      modelCalls.review += 1
      qualityReviewTasks.push(task)
      qualityReviewCalls += 1
      if (options.recheckError && qualityReviewCalls > 1) throw options.recheckError
      const payload = reviewPayloads.shift() || {
        score: 88,
        publishable: true,
        dimensions: { ...proseQualityScores, core_promise_agency: 9, payoff_hook: 9 },
        findings: [],
      }
      return { parsed: payload, modelName: 'fake-reviewer' } as any
    }
    if (taskKind === 'readability_review') {
      readabilityReviewTasks.push(task)
      return {
        parsed: {
          readability_score: 92,
          passed: true,
          opening_hook_score: 90,
          ending_hook_score: 91,
        },
        modelName: 'fake-readability-reviewer',
      } as any
    }
    if (taskKind === 'quality_revision') {
      modelCalls.revision += 1
      qualityRevisionTasks.push(task)
      if (revisionResults.length) return revisionResults.shift()
      const text = revisionTexts.shift() || draftText
      return { parsed: { chapter_text: text, revision_receipts: [{ key: 'agency', changed_evidence: text.slice(0, 80) }] }, modelName: 'fake-reviser' } as any
    }
    if (taskKind === 'story_state') {
      modelCalls.story_state += 1
      if (options.storyStateError) throw options.storyStateError
      return { parsed: options.storyStatePayload || { state_delta: { open_questions: ['幕后指挥者为何知道江澈旧名'] }, character_updates: [], setting_updates: [], storyline_updates: [] }, modelName: 'fake-state' } as any
    }
    modelCalls.other += 1
    return { parsed: {}, modelName: 'fake-other' } as any
  }

  const service = createWritingService({
    getProject: async (_workspace: string, projectId: number) => options.readProjectFromStore
      ? getNovelProject(workspace, projectId)
      : project,
    production: {
      buildAgentConfigSnapshot: () => ({ model_id: 217 }),
      getApprovalPolicy: () => ({}),
      getStageModelId: () => 217,
      getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
      approvalRequired: () => false,
      buildApprovalError: (type: string, message: string, details: any) => Object.assign(new Error(message), { code: `APPROVAL_REQUIRED_${type.toUpperCase()}`, details }),
    } as any,
    reference: options.referenceService || {
      getReferenceMigrationPlanForChapter: async () => ({}),
      buildReferenceUsageReport: async () => ({ quality_assessment: { risk_level: 'low' } }),
      getReferenceSafetyDecision: () => ({ blocked: false, score: 100, copy_hit_count: 0, reasons: [] }),
      explainReferenceSafety: () => 'safe',
      buildMigrationAudit: () => ({ passed: true }),
    } as any,
    runtime: {
      buildChapterContext: async (input: any) => {
        contextCalls += 1
        contextInputs.push(input)
        const hasStagedCandidates = Array.isArray(input?.settings)
          && input.settings.some((setting: any) => Number(setting?.id || 0) < 0)
          && Array.isArray(input?.chapterSettingUsage)
          && input.chapterSettingUsage.some((usage: any) => Number(usage?.entity_id || 0) < 0)
        if (contextCalls > 1 && options.requireStagedContextCandidates && !hasStagedCandidates) return contextPackage
        return contextCalls > 1 && options.repairedContextPackageOverride
          ? { ...contextPackage, ...options.repairedContextPackageOverride }
          : contextPackage
      },
      generateChapterProse: async (...args: any[]) => {
        modelCalls.draft += 1
        draftContexts.push(args[2])
        draftOptions.push(args[3])
        return options.draftResult !== undefined
          ? options.draftResult
          : { parsed: { chapter_no: 10, chapter_text: draftText }, modelName: 'fake-draft', usage: { input_tokens: 100, output_tokens: 200 } } as any
      },
      runHumanizePostProcess: options.humanizeResult === undefined
        ? undefined
        : async (_workspace: string, _project: any, _context: any, sourceText: string) => {
            humanizeTexts.push(sourceText)
            return typeof options.humanizeResult === 'function'
              ? options.humanizeResult(sourceText)
              : options.humanizeResult
          },
      storeChapterProseMemory: async (_project: any, _chapterNo: number, finalText: string) => {
        commitOrder.push('memory')
        memoryTexts.push(finalText)
        if (options.memoryError) throw options.memoryError
      },
      mergeChapterRawPayload: options.admissionMetadataError
        ? async () => { throw options.admissionMetadataError }
        : undefined,
      executeAgent: executeAgent as any,
      hooks: {
        beforeChapterStore: ({ finalText }) => {
          storeCalls += 1
          storeTexts.push(finalText)
          if (!finalText) throw new Error('empty final text')
        },
        beforeStoryState: ({ finalText }) => {
          storyStateCalls += 1
          storyStateTexts.push(finalText)
        },
        afterChapterCommit: () => {
          commitOrder.push('commit')
          if (options.afterCommitError) throw options.afterCommitError
        },
        beforePostCommitSync: () => {
          if (options.postCommitSyncError) throw options.postCommitSyncError
        },
      },
    },
  })

  return {
    workspace,
    project,
    chapter,
    service,
    modelCalls,
    storyStateTexts,
    humanizeTexts,
    qualityReviewTasks,
    readabilityReviewTasks,
    qualityRevisionTasks,
    storeTexts,
    memoryTexts,
    commitOrder,
    draftOptions,
    draftContexts,
    contextInputs,
    get storeCalls() { return storeCalls },
    get storyStateCalls() { return storyStateCalls },
  }
}
