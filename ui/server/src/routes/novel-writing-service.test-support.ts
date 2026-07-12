import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  createNovelChapter,
  createNovelCharacter,
  createNovelProject,
  createNovelWorldbuilding,
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

export function buildPipelineProse(opening: string, action: string) {
  const subjects = ['江澈', '顾遥', '短发追兵', '巷口队长', '楼顶观察手']
  const locations = ['路灯下', '旧墙边', '排水沟旁', '铁门前', '消防梯口']
  const consequences = ['封锁线向东偏移', '通讯频道短暂失声', '后排脚步乱了一拍', '出口露出半步空隙', '楼顶的手电偏离目标']
  const sentences = [opening]
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
  repairedContextPackageOverride?: any
  requireStagedContextCandidates?: boolean
  referenceService?: any
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
      quality_gate: {
        enabled: options.qualityGateEnabled !== false,
        min_score: 78,
        require_revision_before_store: true,
        max_critical_issues: 0,
        max_high_issues: 0,
      },
    },
  })
  await createNovelWorldbuilding(workspace, {
    project_id: project.id,
    world_summary: '追捕队以怪谈通讯频道同步封锁，江澈的行动会直接改变包围结构。',
    rules: ['频道失联时，追捕队会按最后一道命令继续收紧。'],
  })
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
    '倒数压到最后三秒，江澈停在围墙阴影里等待。',
    '只看着追捕队继续收紧包围',
  )
  const reviewPayloads = [...(options.reviewPayloads || [])]
  const revisionTexts = [...(options.revisionTexts || [])]
  const revisionResults = [...(options.revisionResults || [])]
  const modelCalls = { scene_cards: 0, draft: 0, review: 0, revision: 0, editor: 0, meme: 0, contraction: 0, expansion: 0, story_state: 0, other: 0 }
  const storyStateTexts: string[] = []
  const memoryTexts: string[] = []
  const commitOrder: string[] = []
  const draftOptions: any[] = []
  let storeCalls = 0
  let storyStateCalls = 0
  let qualityReviewCalls = 0
  let contextCalls = 0
  const contextInputs: any[] = []

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
    },
    continuity: {
      previous_chapter: {
        chapter_no: 9,
        title: '四面封巷',
        ending_hook: '所有耳机同时传出幕后指挥者的倒数。',
        ending_excerpt: '红灯同时亮起，追捕队从四面压进旧巷。江澈听见耳机里的倒数，只剩铁门后那条路还没有完全合拢。',
      },
    },
    ...(options.contextPackageOverride || {}),
  }

  const executeAgent = async (_agent: string, _project: any, input: any) => {
    const task = String(input?.task || '')
    if (task.startsWith('任务：为当前章节生成可人工确认的场景卡')) {
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
    if (task.startsWith('任务：将本章正文压缩')) {
      modelCalls.contraction += 1
      if (options.contractionError) throw options.contractionError
      return { parsed: {}, finish_reason: 'stop', modelName: 'fake-contraction' } as any
    }
    if (task.startsWith('任务：将本章正文扩写')) {
      modelCalls.expansion += 1
      if (options.expansionError) throw options.expansionError
      return { parsed: {}, finish_reason: 'stop', modelName: 'fake-expansion' } as any
    }
    if (task.startsWith('任务：克制型网感润色')) {
      modelCalls.meme += 1
      if (options.memeResult !== undefined) return options.memeResult
      return { parsed: { chapter_text: options.memeText || draftText, meme_polish_report: { changed_plot: false } }, modelName: 'fake-meme' } as any
    }
    if (task.includes('商业主编')) {
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
    if (task.startsWith('任务：独立审查小说正文') || task.startsWith('任务：对刚生成的小说章节进行章节级自检')) {
      modelCalls.review += 1
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
    if (task.startsWith('任务：执行第') || task.startsWith('任务：根据自检结果修订本章正文')) {
      modelCalls.revision += 1
      if (revisionResults.length) return revisionResults.shift()
      const text = revisionTexts.shift() || draftText
      return { parsed: { chapter_text: text, revision_receipts: [{ key: 'agency', changed_evidence: text.slice(0, 80) }] }, modelName: 'fake-reviser' } as any
    }
    if (task.includes('state_delta')) {
      modelCalls.story_state += 1
      if (options.storyStateError) throw options.storyStateError
      return { parsed: options.storyStatePayload || { state_delta: { open_questions: ['幕后指挥者为何知道江澈旧名'] }, character_updates: [], setting_updates: [], storyline_updates: [] }, modelName: 'fake-state' } as any
    }
    modelCalls.other += 1
    return { parsed: {}, modelName: 'fake-other' } as any
  }

  const service = createWritingService({
    getProject: async () => project,
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
        draftOptions.push(args[3])
        return options.draftResult !== undefined
          ? options.draftResult
          : { parsed: { chapter_no: 10, chapter_text: draftText }, modelName: 'fake-draft', usage: { input_tokens: 100, output_tokens: 200 } } as any
      },
      storeChapterProseMemory: async (_project: any, _chapterNo: number, finalText: string) => {
        commitOrder.push('memory')
        memoryTexts.push(finalText)
        if (options.memoryError) throw options.memoryError
      },
      executeAgent: executeAgent as any,
      hooks: {
        beforeChapterStore: ({ finalText }) => {
          storeCalls += 1
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
    memoryTexts,
    commitOrder,
    draftOptions,
    contextInputs,
    get storeCalls() { return storeCalls },
    get storyStateCalls() { return storyStateCalls },
  }
}
