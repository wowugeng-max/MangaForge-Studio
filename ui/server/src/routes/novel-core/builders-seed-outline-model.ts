import { ensureWorkspaceStructure } from '../../workspace'
import {
  appendNovelRun,
  createNovelChapter,
  createNovelCharacter,
  createNovelOutline,
  createNovelProject,
  createNovelProjectSeedDraft,
  createNovelSettingEntity,
  createNovelWorldbuilding,
  deleteNovelChapter,
  deleteNovelOutline,
  deleteNovelProject,
  deleteNovelProjectSeedDraft,
  getNovelChapter,
  getNovelProject,
  listChapterVersions,
  listNovelCharacters,
  listNovelChapters,
  listNovelWorkspaceChapters,
  listNovelOutlines,
  listNovelProjects,
  listNovelProjectSeedDrafts,
  listNovelWorldbuilding,
  rollbackChapterVersion,
  syncNovelChapterPlanByNumber,
  updateNovelCharacter,
  updateNovelChapter,
  updateNovelOutline,
  updateNovelProject,
  updateNovelWorldbuilding,
} from '../../novel'
import { executeNovelAgent, previewNovelKnowledgeInjection } from '../../llm'
import { extractLLMText, parseJsonLikePayload, safeJsonStringify } from '../novel-route-utils'
import { purgeMemoryPalaceProject } from '../../memory-service'
import { buildOhStoryGenreCatalogContract, formatOhStoryGenreCatalogPrompt, listOhStoryGenreCatalogGuides, matchOhStoryGenreCatalogGuide } from '../novel-genre-catalog'
import { buildOhStoryGenreCoreMechanicsContract, formatOhStoryGenreCoreMechanicsPrompt } from '../novel-genre-core-mechanics'
import { buildOhStoryPlotSpecialTopicsContract, formatOhStoryPlotSpecialTopicsPrompt } from '../novel-plot-special-topics'
import { buildOhStoryCharacterDesignContract, formatOhStoryCharacterDesignPrompt } from '../novel-character-design-contract'
import { buildOhStoryStoryPowerContract, formatOhStoryStoryPowerPrompt } from '../novel-story-power-contract'
import { buildOhStoryMainlineDefinitionContract, formatOhStoryMainlineDefinitionPrompt } from '../novel-mainline-definition-contract'
import { buildOhStoryLongformStructureContract, formatOhStoryLongformStructurePrompt } from '../novel-longform-structure-contract'
import { buildOhStoryDirectorForProjectSeed } from '../novel-oh-story-director'
import { normalizeSettingAgentPayload } from '../novel-setting-routes'
import { safeReportProjectSeedProgress, resolvePassA3VolumeStageStatus, sseData, type ProjectSeedProgressReporter } from '../novel-project-seed-progress'
import {
  buildProjectSeedFillGapsPrompt,
  extractFillGapsPatch,
  listProjectSeedGapTargets,
  mergeSeedPreferRicher,
} from '../novel-project-seed-fill-gaps'



import {
  annotateOutlineScaffoldDiagnostics,
  asSeedArray,
  describeLengthTarget,
  extractJsonProperty,
  firstSeedArray,
  firstSeedText,
  foreshadowingLooksLikeLocalScaffold,
  normalizeLengthTarget,
  parseNestedSeed,
  projectSeedNeedsOutlineExpansion,
  projectSeedOutlinesLookLikeLocalScaffold,
  requiredFirst30ChapterCount,
  resultContentPreview,
  resultContentText,
  stripLocalScaffoldOutlines,
} from './builders-seed-helpers'
import {
  attachProjectSeedDirector,
  buildProjectSeedDiagnostics,
  hasUsableProjectSeed,
  normalizeProjectSeedPayload,
  repairProjectSeedGaps,
  projectSeedNeedsOutlineExpansion,
} from './builders-seed-normalize'

export function buildProjectSeedFirst30OutlinePrompt(seed: any, idea = '', requestedTitle = '', lengthTarget = 'medium') {
  const root = stripLocalScaffoldOutlines(seed)
  const count = requiredFirst30ChapterCount(lengthTarget)
  const storyCard = {
    title: firstSeedText(requestedTitle, root.title),
    genre: root.genre,
    sub_genres: root.sub_genres,
    logline: root.logline,
    synopsis: root.synopsis,
    core_premise: root.core_premise,
    main_conflict: root.main_conflict,
    protagonist: root.protagonist,
    antagonist: root.antagonist,
    characters: asSeedArray(root.characters).slice(0, 12),
    character_pool: root.character_pool,
    worldbuilding: root.worldbuilding,
    plot_engine: root.plot_engine,
    commercial_positioning: root.commercial_positioning,
    writing_bible: root.writing_bible,
    existing_volume_outlines: asSeedArray(root.volume_outlines).slice(0, 8),
    existing_chapter_outlines: asSeedArray(root.chapter_outlines).slice(0, 8),
  }
  return [
    '任务：只为当前小说项目生成“分卷大纲 + 前N章细纲”。只输出 JSON object，不要 Markdown，不要解释。',
    requestedTitle ? `作品名：${requestedTitle}` : '',
    describeLengthTarget(lengthTarget),
    '',
    '【用户原始想法】',
    String(idea || root.raw_idea || '').slice(0, 8000),
    '',
    '【已确定的项目骨架（不要推翻主角名/核心因果/金手指限制）】',
    safeJsonStringify(storyCard, 2, 18000),
    '',
    '输出字段：',
    `{`,
    `  "volume_outlines": [ { "title","goal","summary","hook","chapter_count" } ],`,
    `  "chapter_outlines": [ { "chapter_no","title","summary","conflict","ending_hook","must_advance","forbidden_repeats" } ],`,
    `  "first30_plan": { "chapters_1_3","chapters_4_10","chapters_11_30" }`,
    `}`,
    '',
    '硬性要求：',
    `1. 本轮优先完整输出 volume_outlines + chapter_outlines；chapter_outlines 必须覆盖第1-${count}章，chapter_no 从 1 连续递增。`,
    '2. 每一章标题、summary、conflict、ending_hook 必须只属于本故事，禁止通用模板章名（如：异常入局、旧法失准、药铺夜问、开局规则验证、第N章压力升级）。',
    '3. 1-3章兑现开篇承诺；4-10章完成试读闭环；11-30章抬高赌注并蓄势付费点（短篇按对应章数压缩）。',
    '4. 章与章必须因果递进：上一章 ending_hook 要能自然接下一章。',
    '5. volume_outlines 至少按篇幅给出完整分卷方向，标题与摘要不得套用“开局规则验证/第一敌手入局”等本地模板。',
    '6. 本轮不要输出 foreshadowing_plan（伏笔会另一次调用生成）。',
    '7. 不要生成正文；输出必须是可解析 JSON。',
  ].filter(Boolean).join('\n')
}


export function extractOutlineFieldsFromModelPayload(payload: any) {
  const root = parseNestedSeed(payload)
  const bags = [
    root,
    parseNestedSeed(root.data),
    parseNestedSeed(root.result),
    parseNestedSeed(root.output),
    parseNestedSeed(root.seed),
    parseNestedSeed(root.project_seed),
    parseNestedSeed(root.outline),
    parseNestedSeed(root.outlines),
    parseNestedSeed(root.master_outline),
    parseNestedSeed(root.project),
  ]
  let chapter_outlines: any[] = []
  let volume_outlines: any[] = []
  let foreshadowing_plan: any[] = []
  let first30_plan: any = {}
  for (const bag of bags) {
    if (!bag || typeof bag !== 'object') continue
    const chapters = firstSeedArray(
      bag.chapter_outlines,
      bag.chapters,
      bag.first_30_chapters,
      bag.first30_chapters,
      bag.detail_chapters,
    )
    const volumes = firstSeedArray(bag.volume_outlines, bag.volumes, bag.volumeOutlines)
    const foreshadowing = asSeedArray(bag.foreshadowing_plan).length
      ? asSeedArray(bag.foreshadowing_plan)
      : asSeedArray(bag.foreshadowing)
    const plan = parseNestedSeed(bag.first30_plan || bag.first_30_plan)
    if (chapters.length && chapters.length >= chapter_outlines.length) chapter_outlines = chapters
    if (volumes.length && volumes.length >= volume_outlines.length) volume_outlines = volumes
    if (foreshadowing.length && foreshadowing.length >= foreshadowing_plan.length) foreshadowing_plan = foreshadowing
    if (Object.keys(plan).length) first30_plan = { ...first30_plan, ...plan }
  }

  const tryExtractFromText = (raw: string) => {
    if (!raw || typeof raw !== 'string') return
    const chapterProp = extractJsonProperty(raw, 'chapter_outlines') || extractJsonProperty(raw, 'chapters')
    const volumeProp = extractJsonProperty(raw, 'volume_outlines') || extractJsonProperty(raw, 'volumes')
    const foreshadowProp = extractJsonProperty(raw, 'foreshadowing_plan') || extractJsonProperty(raw, 'foreshadowing')
    const planProp = extractJsonProperty(raw, 'first30_plan') || extractJsonProperty(raw, 'first_30_plan')
    if (Array.isArray(chapterProp) && chapterProp.length > chapter_outlines.length) chapter_outlines = chapterProp
    if (Array.isArray(volumeProp) && volumeProp.length > volume_outlines.length) volume_outlines = volumeProp
    if (Array.isArray(foreshadowProp) && foreshadowProp.length > foreshadowing_plan.length) foreshadowing_plan = foreshadowProp
    const plan = parseNestedSeed(planProp)
    if (Object.keys(plan).length) first30_plan = { ...first30_plan, ...plan }
  }

  // 文本兜底：从 raw string / content 字段抽数组（截断 JSON 时 partial parse 常会丢数组）
  if (!chapter_outlines.length || !volume_outlines.length || !foreshadowing_plan.length) {
    if (typeof payload === 'string') tryExtractFromText(payload)
    if (root && typeof root === 'object') {
      tryExtractFromText(firstSeedText(root.raw_content, root.content, root.text, root.message))
      // 对象 stringify 后再抽一次，兼容嵌套奇怪但仍含字段的返回
      try {
        tryExtractFromText(JSON.stringify(root))
      } catch {
        // ignore
      }
    }
  }
  return { chapter_outlines, volume_outlines, foreshadowing_plan, first30_plan }
}

function buildProjectSeedChapterOutlineOnlyPrompt(seed: any, idea = '', requestedTitle = '', lengthTarget = 'medium', startNo = 1, endNo = 30) {
  const root = stripLocalScaffoldOutlines(seed)
  const storyCard = {
    title: firstSeedText(requestedTitle, root.title),
    genre: root.genre,
    logline: root.logline,
    synopsis: root.synopsis,
    main_conflict: root.main_conflict,
    protagonist: root.protagonist,
    antagonist: root.antagonist,
    worldbuilding: root.worldbuilding,
    plot_engine: root.plot_engine,
    volume_outlines: asSeedArray(root.volume_outlines).slice(0, 8),
  }
  return [
    `任务：只生成第${startNo}-${endNo}章 chapter_outlines。只输出 JSON object，不要 Markdown。`,
    requestedTitle ? `作品名：${requestedTitle}` : '',
    describeLengthTarget(lengthTarget),
    '',
    '【故事骨架】',
    safeJsonStringify(storyCard, 2, 14000),
    '',
    '【用户想法】',
    String(idea || root.raw_idea || '').slice(0, 6000),
    '',
    '输出：',
    `{ "chapter_outlines": [ { "chapter_no","title","summary","conflict","ending_hook","must_advance" } ] }`,
    '',
    `硬性要求：必须输出 chapter_no=${startNo} 到 ${endNo} 的连续章节；标题和摘要必须只属于本故事；禁止异常入局/药铺夜问/开局规则验证等模板章名；不要输出伏笔、分卷、正文。`,
  ].filter(Boolean).join('\n')
}


export function buildProjectSeedVolumeOutlineOnlyPrompt(seed: any, idea = '', requestedTitle = '', lengthTarget = 'medium') {
  const root = stripLocalScaffoldOutlines(seed)
  const minVolumes = normalizeLengthTarget(lengthTarget) === 'short' ? 2 : 3
  return [
    '任务：只为当前小说生成 volume_outlines。只输出 JSON object，不要 Markdown，不要解释。',
    requestedTitle || root.title ? `作品名：${firstSeedText(requestedTitle, root.title)}` : '',
    describeLengthTarget(lengthTarget),
    '',
    '【用户原始想法】',
    String(idea || root.raw_idea || '').slice(0, 6000),
    '',
    '【故事骨架】',
    safeJsonStringify({
      title: firstSeedText(requestedTitle, root.title),
      genre: root.genre,
      logline: root.logline,
      synopsis: root.synopsis,
      core_premise: root.core_premise,
      main_conflict: root.main_conflict,
      protagonist: root.protagonist,
      antagonist: root.antagonist,
      worldbuilding: root.worldbuilding,
      plot_engine: root.plot_engine,
      existing_chapter_outlines: asSeedArray(root.chapter_outlines).slice(0, 10),
    }, 2, 14000),
    '',
    '输出：',
    '{ "volume_outlines": [ { "title","goal","summary","hook","chapter_count" } ] }',
    '',
    '硬性要求：',
    `1. 至少 ${minVolumes} 卷，标题与摘要必须只属于本故事，禁止“开局规则验证 / 第一敌手入局 / 阶段决局”等本地模板卷名。`,
    '2. 每卷写清阶段目标、阶段冲突、本卷结尾钩子；chapter_count 合理。',
    '3. 本轮不要输出 chapter_outlines、foreshadowing_plan、正文。',
  ].filter(Boolean).join('\n')
}

async function generateProjectSeedFirst30OutlinesWithModel(
  activeWorkspace: string,
  seed: any,
  idea: string,
  modelId: string,
  requestedTitle = '',
  requestedLengthTarget = '',
  onProgress?: ProjectSeedProgressReporter,
) {
  const base = stripLocalScaffoldOutlines(seed)
  const lengthTarget = normalizeLengthTarget(requestedLengthTarget || base.length_target) || 'medium'
  const count = requiredFirst30ChapterCount(lengthTarget)
  const projectStub = {
    id: 0,
    title: requestedTitle || base.title || '前30章细纲生成',
    genre: base.genre || '',
    sub_genres: base.sub_genres || [],
    synopsis: base.synopsis || idea.slice(0, 500),
    length_target: lengthTarget,
    target_audience: base.target_audience || '',
    style_tags: base.style_tags || [],
    commercial_tags: base.commercial_tags || [],
    reference_config: {},
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const runOutlineAgent = async (prompt: string, maxTokens = 12000, temperature = 0.42) => {
    return executeNovelAgent('outline-agent', projectStub as any, {
      // 完整任务 prompt，禁止再套 buildOutlinePrompt（会重新塞回伏笔/总纲，挤掉分卷与章纲）
      task: prompt,
      authoritativeTask: true,
    }, {
      activeWorkspace,
      modelId,
      maxTokens,
      temperature,
      skipMemory: true,
      responseMode: 'non_stream',
    })
  }

  const payloadFromResult = (result: any) => {
    const content = resultContentText(result)
    const fromOutput = (result as any)?.output
    if (fromOutput && typeof fromOutput === 'object' && !Array.isArray(fromOutput)) return fromOutput
    return parseJsonLikePayload(fromOutput)
      || parseJsonLikePayload(content)
      || (typeof fromOutput === 'string' ? fromOutput : null)
      || content
      || {}
  }

  const normalizeChapters = (items: any[]) => asSeedArray(items)
    .map((item, index) => {
      const record = parseNestedSeed(item)
      return {
        ...record,
        chapter_no: Number(record.chapter_no || record.chapter_number || record.chapterNo || index + 1) || index + 1,
        title: firstSeedText(record.title, record.name),
        summary: firstSeedText(record.summary, record.chapter_goal, record.goal, record.synopsis),
        conflict: firstSeedText(record.conflict),
        ending_hook: firstSeedText(record.ending_hook, record.hook),
        must_advance: firstSeedText(record.must_advance, record.summary, record.chapter_goal),
        source: 'model',
        scaffold: false,
      }
    })
    .filter(item => firstSeedText(item.title, item.summary))
    .sort((a, b) => Number(a.chapter_no) - Number(b.chapter_no))

  const normalizeVolumes = (items: any[]) => asSeedArray(items)
    .map(item => ({ ...parseNestedSeed(item), source: 'model', scaffold: false }))
    .filter(item => firstSeedText(item.title, item.summary, item.goal))

  const normalizeForeshadowing = (items: any[]) => asSeedArray(items)
    .map(item => {
      if (typeof item === 'string') {
        return { name: firstSeedText(item), description: firstSeedText(item), source: 'model', scaffold: false }
      }
      const record = parseNestedSeed(item)
      return {
        ...record,
        name: firstSeedText(record.name, record.title),
        plant_at: firstSeedText(record.plant_at, record.plant_chapter, record.plant),
        payoff_at: firstSeedText(record.payoff_at, record.payoff_chapter, record.payoff),
        description: firstSeedText(record.description, record.surface, record.summary),
        true_meaning: firstSeedText(record.true_meaning, record.truth),
        source: 'model',
        scaffold: false,
      }
    })
    .filter(item => firstSeedText(item.name, item.description) && !foreshadowingLooksLikeLocalScaffold(item))

  const passNotes: string[] = []
  const passErrors: string[] = []

  // Pass A: 分卷 + 前N章细纲（不带伏笔，避免长输出互相挤掉）
  safeReportProjectSeedProgress(onProgress, {
    stage: 'outlines',
    status: 'running',
    progress: 0.3,
    detail: 'pass_a',
  })
  const outlinePrompt = buildProjectSeedFirst30OutlinePrompt(base, idea, requestedTitle || base.title, lengthTarget)
  let outlineResult: any = null
  try {
    outlineResult = await runOutlineAgent(outlinePrompt, 14000, 0.42)
    if ((outlineResult as any)?.error) passErrors.push(`pass_a:${String((outlineResult as any).error).slice(0, 240)}`)
  } catch (error: any) {
    passErrors.push(`pass_a_throw:${String(error?.message || error).slice(0, 240)}`)
    outlineResult = { error: String(error?.message || error), content: '' }
  }
  const outlineRaw = payloadFromResult(outlineResult)
  const outlineExtracted = extractOutlineFieldsFromModelPayload(outlineRaw)
  // 兼容 normalize 路径
  const outlineNormalized = normalizeProjectSeedPayload(outlineRaw, idea, lengthTarget)
  let modelChapters = normalizeChapters(
    outlineExtracted.chapter_outlines.length ? outlineExtracted.chapter_outlines : outlineNormalized.chapter_outlines,
  )
  let modelVolumes = normalizeVolumes(
    outlineExtracted.volume_outlines.length ? outlineExtracted.volume_outlines : outlineNormalized.volume_outlines,
  )
  let first30Plan = {
    ...parseNestedSeed(base.first30_plan),
    ...parseNestedSeed(outlineExtracted.first30_plan),
    ...parseNestedSeed(outlineNormalized.first30_plan),
  }
  passNotes.push(`pass_a chapters=${modelChapters.length} volumes=${modelVolumes.length}`)
  safeReportProjectSeedProgress(onProgress, {
    stage: 'outlines',
    status: 'running',
    progress: 0.45,
    detail: 'pass_a',
    outline_chapter_count: modelChapters.length,
    outline_volume_count: modelVolumes.length,
  })

  // Pass A2: 若章纲仍不足，拆段补生成（oh-story 细纲分步思路）
  if (modelChapters.length < Math.min(12, count)) {
    safeReportProjectSeedProgress(onProgress, {
      stage: 'outlines',
      status: 'running',
      progress: 0.5,
      detail: 'pass_a2',
      outline_chapter_count: modelChapters.length,
      outline_volume_count: modelVolumes.length,
    })
    const mid = Math.ceil(count / 2)
    try {
      const part1Result = await runOutlineAgent(
        buildProjectSeedChapterOutlineOnlyPrompt(base, idea, requestedTitle || base.title, lengthTarget, 1, mid),
        10000,
        0.4,
      )
      if ((part1Result as any)?.error) passErrors.push(`pass_a2_1:${String((part1Result as any).error).slice(0, 200)}`)
      const part1 = extractOutlineFieldsFromModelPayload(payloadFromResult(part1Result))
      const part1Chapters = normalizeChapters(part1.chapter_outlines)

      const part2Result = await runOutlineAgent(
        buildProjectSeedChapterOutlineOnlyPrompt(
          { ...base, chapter_outlines: part1Chapters, volume_outlines: modelVolumes },
          idea,
          requestedTitle || base.title,
          lengthTarget,
          mid + 1,
          count,
        ),
        10000,
        0.4,
      )
      if ((part2Result as any)?.error) passErrors.push(`pass_a2_2:${String((part2Result as any).error).slice(0, 200)}`)
      const part2 = extractOutlineFieldsFromModelPayload(payloadFromResult(part2Result))
      const part2Chapters = normalizeChapters(part2.chapter_outlines)
      const merged = [...part1Chapters, ...part2Chapters]
      if (merged.length > modelChapters.length) modelChapters = merged
      passNotes.push(`pass_a2 chapters=${modelChapters.length} (p1=${part1Chapters.length}, p2=${part2Chapters.length})`)
      safeReportProjectSeedProgress(onProgress, {
        stage: 'outlines',
        status: 'running',
        progress: 0.55,
        detail: 'pass_a2',
        outline_chapter_count: modelChapters.length,
        outline_volume_count: modelVolumes.length,
      })
    } catch (error: any) {
      passErrors.push(`pass_a2_throw:${String(error?.message || error).slice(0, 240)}`)
    }
  }

  // Pass A3: 分卷仍空时单独生成（不与 30 章挤同一响应）
  if (!modelVolumes.length) {
    safeReportProjectSeedProgress(onProgress, {
      stage: 'volumes',
      status: 'running',
      progress: 0.6,
      detail: 'pass_a3',
      outline_chapter_count: modelChapters.length,
      outline_volume_count: modelVolumes.length,
    })
    try {
      const volumeResult = await runOutlineAgent(
        buildProjectSeedVolumeOutlineOnlyPrompt(
          { ...base, chapter_outlines: modelChapters },
          idea,
          requestedTitle || base.title,
          lengthTarget,
        ),
        5000,
        0.4,
      )
      if ((volumeResult as any)?.error) passErrors.push(`pass_a3:${String((volumeResult as any).error).slice(0, 200)}`)
      const volumeExtracted = extractOutlineFieldsFromModelPayload(payloadFromResult(volumeResult))
      const volumeNormalized = normalizeProjectSeedPayload(payloadFromResult(volumeResult), idea, lengthTarget)
      const nextVolumes = normalizeVolumes(
        volumeExtracted.volume_outlines.length ? volumeExtracted.volume_outlines : volumeNormalized.volume_outlines,
      )
      if (nextVolumes.length) modelVolumes = nextVolumes
      passNotes.push(`pass_a3 volumes=${modelVolumes.length}`)
    } catch (error: any) {
      passErrors.push(`pass_a3_throw:${String(error?.message || error).slice(0, 240)}`)
    }
    const a3Status = resolvePassA3VolumeStageStatus(modelVolumes.length)
    safeReportProjectSeedProgress(onProgress, {
      stage: 'volumes',
      status: a3Status,
      progress: 0.65,
      detail: modelVolumes.length > 0 ? 'pass_a3' : 'pass_a3 volumes still empty',
      outline_chapter_count: modelChapters.length,
      outline_volume_count: modelVolumes.length,
    })
  }

  // Pass B: 伏笔单独生成（不挤占章纲 token）
  let modelForeshadowing = normalizeForeshadowing(asSeedArray(base.foreshadowing_plan))
  safeReportProjectSeedProgress(onProgress, {
    stage: 'foreshadowing',
    status: 'running',
    progress: 0.75,
    detail: 'pass_b',
    outline_chapter_count: modelChapters.length,
    outline_volume_count: modelVolumes.length,
    outline_foreshadowing_count: modelForeshadowing.length,
  })
  try {
    const foreshadowPrompt = [
      '任务：只为当前小说生成 foreshadowing_plan。只输出 JSON object。',
      `作品：${firstSeedText(requestedTitle, base.title)}`,
      '',
      '【故事骨架】',
      safeJsonStringify({
        title: firstSeedText(requestedTitle, base.title),
        logline: base.logline,
        synopsis: base.synopsis,
        protagonist: base.protagonist,
        antagonist: base.antagonist,
        worldbuilding: base.worldbuilding,
        volume_outlines: modelVolumes.slice(0, 6),
        chapter_outlines: modelChapters.slice(0, 12),
      }, 2, 12000),
      '',
      '输出：{ "foreshadowing_plan": [ { "name","plant_at","payoff_at","description","true_meaning" } ] }',
      '要求：至少 6 条；必须绑定本故事专有人物/规则/地点；禁止异兽/规则异常、知识来源破绽、规则代价、禁忌边界等模板伏笔名。',
      '本轮不要输出 volume_outlines、chapter_outlines、正文。',
    ].join('\n')
    const foreshadowResult = await runOutlineAgent(foreshadowPrompt, 5000, 0.4)
    if ((foreshadowResult as any)?.error) passErrors.push(`pass_b:${String((foreshadowResult as any).error).slice(0, 200)}`)
    const foreshadowExtracted = extractOutlineFieldsFromModelPayload(payloadFromResult(foreshadowResult))
    const nextForeshadowing = normalizeForeshadowing(foreshadowExtracted.foreshadowing_plan)
    if (nextForeshadowing.length) modelForeshadowing = nextForeshadowing
    passNotes.push(`pass_b foreshadowing=${modelForeshadowing.length}`)
    safeReportProjectSeedProgress(onProgress, {
      stage: 'foreshadowing',
      status: 'completed',
      progress: 0.85,
      detail: 'pass_b',
      outline_chapter_count: modelChapters.length,
      outline_volume_count: modelVolumes.length,
      outline_foreshadowing_count: modelForeshadowing.length,
    })
  } catch (error: any) {
    passErrors.push(`pass_b_throw:${String(error?.message || error).slice(0, 240)}`)
  }

  let nextSeed = {
    ...base,
    volume_outlines: modelVolumes.length ? modelVolumes : asSeedArray(base.volume_outlines),
    chapter_outlines: modelChapters.length ? modelChapters : [],
    foreshadowing_plan: modelForeshadowing.length ? modelForeshadowing : asSeedArray(base.foreshadowing_plan).filter(item => !foreshadowingLooksLikeLocalScaffold(item)),
    first30_plan: first30Plan,
  }
  // 只剥离明确本地模板，不误杀 source=model
  nextSeed = stripLocalScaffoldOutlines(nextSeed)
  nextSeed = repairProjectSeedGaps(nextSeed, idea)
  nextSeed = attachProjectSeedDirector(nextSeed)

  const chapterCount = asSeedArray(nextSeed.chapter_outlines).length
  const volumeCount = asSeedArray(nextSeed.volume_outlines).length
  const ok = chapterCount >= Math.min(8, count) && volumeCount > 0 && !projectSeedOutlinesLookLikeLocalScaffold(nextSeed)
  const diagnostics = annotateOutlineScaffoldDiagnostics(nextSeed, {
    ...buildProjectSeedDiagnostics(nextSeed, idea, outlineResult),
    status: ok ? 'outlines_generated_by_model' : 'needs_model_outline',
    usable: hasUsableProjectSeed(nextSeed),
    outlines_generated_by_model: ok,
    outline_chapter_count: chapterCount,
    outline_volume_count: volumeCount,
    outline_foreshadowing_count: asSeedArray(nextSeed.foreshadowing_plan).length,
    outline_raw_preview: resultContentPreview(outlineResult).slice(0, 1500),
    outline_pass_notes: passNotes,
    outline_pass_errors: passErrors,
    required_outline_chapter_count: count,
    recovery_strategy: 'dedicated_first30_outline_model_pass_split',
    suggestion: ok
      ? `已由模型生成分卷 ${volumeCount} 个、前30章细纲 ${chapterCount} 章。`
      : `模型细纲仍不足（当前章纲 ${chapterCount}/${count}，分卷 ${volumeCount}）。${passErrors.length ? `调用异常：${passErrors[0]}。` : ''}系统未使用本地模板填充。请重试或换更强模型。`,
  })
  return {
    seed: attachProjectSeedDirector({ ...nextSeed, seed_diagnostics: diagnostics }),
    result: outlineResult,
    seed_diagnostics: diagnostics,
    ok,
  }
}

export async function ensureProjectSeedModelOutlines(
  activeWorkspace: string,
  seed: any,
  idea: string,
  modelId: string | undefined,
  requestedTitle = '',
  requestedLengthTarget = '',
  previousResult: any = null,
  onProgress?: ProjectSeedProgressReporter,
) {
  let current = stripLocalScaffoldOutlines(seed)
  let diagnostics = annotateOutlineScaffoldDiagnostics(current, current.seed_diagnostics || buildProjectSeedDiagnostics(current, idea, previousResult))
  if (!projectSeedNeedsOutlineExpansion(current)) {
    return {
      seed: attachProjectSeedDirector({ ...current, seed_diagnostics: diagnostics }),
      result: previousResult,
      seed_diagnostics: diagnostics,
    }
  }
  if (!modelId) {
    diagnostics = annotateOutlineScaffoldDiagnostics(current, {
      ...diagnostics,
      status: 'needs_model_outline',
      suggestion: '缺少模型，无法生成前30章细纲。请选择模型后重新生成。',
    })
    return {
      seed: attachProjectSeedDirector({ ...current, chapter_outlines: [], volume_outlines: asSeedArray(current.volume_outlines), seed_diagnostics: diagnostics }),
      result: previousResult,
      seed_diagnostics: diagnostics,
    }
  }
  const generated = await generateProjectSeedFirst30OutlinesWithModel(
    activeWorkspace,
    current,
    idea,
    modelId,
    requestedTitle,
    requestedLengthTarget || current.length_target,
    onProgress,
  )
  return {
    seed: generated.seed,
    result: generated.result || previousResult,
    seed_diagnostics: generated.seed_diagnostics,
  }
}

