import type { Express } from 'express'
import JSZip from 'jszip'
import {
  appendNovelRun,
  createNovelReview,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelRuns,
  listNovelWorldbuilding,
  updateNovelProject,
  updateNovelRun,
} from '../novel'
import { executeNovelAgent } from '../llm'
import { asArray, clampScore, getNovelPayload, getVolumePlan, parseJsonLikePayload } from './novel-route-utils'

type ProjectControlRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
  getStoredOrBuiltWritingBible: (workspace: string, project: any) => Promise<any>
  getStoryState: (project: any) => any
  buildProductionDashboard: (project: any, chapters: any[], outlines: any[], characters: any[], reviews: any[], runs: any[]) => any
  buildProductionMetrics: (chapters: any[], reviews: any[], runs: any[]) => any
  buildCommercialReadiness: (project: any, chapters: any[], outlines: any[], characters: any[], reviews: any[], runs: any[]) => any
  getApprovalPolicy: (project: any) => any
  getProductionBudget: (project: any) => any
  getProductionBudgetDecision: (project: any, runs: any[]) => any
  getQualityGate: (project: any) => any
  getAgentPromptConfig: (project: any) => any
  buildAgentConfigSnapshot: (project: any, preferredModelId?: number) => any
  buildChapterContextPackage: (workspace: string, project: any, chapter: any, chapters: any[], worldbuilding: any[], characters: any[], outlines: any[], reviews: any[]) => Promise<any>
  buildReferenceUsageReport: (workspace: string, project: any, taskType: string, generatedText?: string) => Promise<any>
  buildStructuralSimilarityReport: (chapter: any, referenceReport: any) => any
}

type NovelExportFormat = 'txt' | 'markdown' | 'docx' | 'epub'

function exportWordCount(text?: string) {
  return String(text || '').replace(/\s/g, '').length
}

function stableTextHash(value: any) {
  const text = String(value || '')
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function compactControlText(value: any, limit = 600) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

function normalizeGeneratedWritingBible(project: any, payload: any, fallback: any = {}) {
  const styleLock = payload?.style_lock || fallback?.style_lock || {}
  const safety = payload?.safety_policy || fallback?.safety_policy || project.reference_config?.safety || {}
  return {
    ...(fallback || {}),
    project: {
      ...(fallback?.project || {}),
      ...(payload?.project || {}),
      title: project.title,
      genre: payload?.project?.genre || project.genre || fallback?.project?.genre || '',
      synopsis: payload?.project?.synopsis || project.synopsis || fallback?.project?.synopsis || '',
      target_audience: payload?.project?.target_audience || project.target_audience || fallback?.project?.target_audience || '',
      style_tags: asArray(payload?.project?.style_tags).length ? asArray(payload.project.style_tags) : (project.style_tags || fallback?.project?.style_tags || []),
      length_target: payload?.project?.length_target || project.length_target || fallback?.project?.length_target || '',
    },
    promise: String(payload?.promise || fallback?.promise || project.synopsis || ''),
    world_summary: String(payload?.world_summary || fallback?.world_summary || ''),
    world_rules: asArray(payload?.world_rules).length ? payload.world_rules : asArray(fallback?.world_rules),
    mainline: payload?.mainline || fallback?.mainline || {},
    volume_plan: asArray(payload?.volume_plan).length ? payload.volume_plan : asArray(fallback?.volume_plan),
    characters: asArray(payload?.characters).length ? payload.characters : asArray(fallback?.characters),
    style_lock: {
      ...(styleLock || {}),
      narrative_person: String(styleLock?.narrative_person || ''),
      sentence_length: String(styleLock?.sentence_length || ''),
      dialogue_ratio: String(styleLock?.dialogue_ratio || ''),
      banter_density: String(styleLock?.banter_density || ''),
      payoff_density: String(styleLock?.payoff_density || ''),
      description_density: String(styleLock?.description_density || ''),
      chapter_word_range: String(styleLock?.chapter_word_range || ''),
      banned_words: asArray(styleLock?.banned_words),
      preferred_words: asArray(styleLock?.preferred_words),
      ending_policy: String(styleLock?.ending_policy || ''),
      banned_shortcuts: asArray(styleLock?.banned_shortcuts),
    },
    safety_policy: {
      ...(safety || {}),
      allowed: asArray(safety?.allowed),
      cautious: asArray(safety?.cautious),
      forbidden: asArray(safety?.forbidden),
    },
    forbidden: asArray(payload?.forbidden).length ? payload.forbidden : asArray(safety?.forbidden || fallback?.forbidden),
    commercial_positioning: payload?.commercial_positioning || fallback?.commercial_positioning || {},
    generation_rules: asArray(payload?.generation_rules).length ? payload.generation_rules : asArray(fallback?.generation_rules),
    updated_at: new Date().toISOString(),
  }
}

function sanitizeExportFilename(value: any) {
  return String(value || 'novel-project')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'novel-project'
}

function exportLine(format: NovelExportFormat, text = '') {
  return format === 'markdown' ? text : text
}

function normalizeExportFormat(value: any): NovelExportFormat {
  const raw = String(value || '').toLowerCase()
  if (raw === 'docx') return 'docx'
  if (raw === 'epub') return 'epub'
  return raw === 'md' || raw === 'markdown' ? 'markdown' : 'txt'
}

function xmlEscape(value: any) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function htmlEscape(value: any) {
  return xmlEscape(value)
}

function getExportRange(query: any) {
  const start = Number(query.start_chapter || query.start || 0)
  const end = Number(query.end_chapter || query.end || 0)
  return {
    start_chapter: Number.isFinite(start) && start > 0 ? start : 0,
    end_chapter: Number.isFinite(end) && end > 0 ? end : 0,
    include_unwritten: String(query.include_unwritten ?? '1') !== '0',
  }
}

function getDeliveryReleasePolicy(project: any) {
  const gate = project?.reference_config?.quality_gate || {}
  const raw = project?.reference_config?.delivery_release_policy || {}
  return {
    min_quality_score: Number(raw.min_quality_score ?? gate.min_score ?? 78),
    max_similarity_risk: Number(raw.max_similarity_risk ?? 35),
    require_quality_report: raw.require_quality_report !== false,
    require_similarity_report: raw.require_similarity_report !== false,
    require_continuity_notes: raw.require_continuity_notes !== false,
    require_ending_hook: raw.require_ending_hook !== false,
    max_missing_chapters: Number(raw.max_missing_chapters ?? 0),
    max_placeholder_chapters: Number(raw.max_placeholder_chapters ?? 0),
    max_high_continuity_issues: Number(raw.max_high_continuity_issues ?? 0),
  }
}

function latestChapterReviewPayload(reviews: any[], chapter: any, types: string[]) {
  return reviews
    .filter(item => types.includes(item.review_type))
    .map(item => ({ review: item, payload: parseJsonLikePayload(item.payload) || {} }))
    .filter(item => {
      const payload = item.payload
      const chapterId = Number(
        payload.chapter_id
        || payload.report?.chapter_id
        || payload.quality_card?.chapter_id
        || payload.context_package?.chapter?.id
        || payload.context_package?.chapter_target?.id
        || payload.reference_report?.chapter_id
        || 0,
      )
      const chapterNo = Number(
        payload.chapter_no
        || payload.report?.chapter_no
        || payload.quality_card?.chapter_no
        || payload.context_package?.chapter?.chapter_no
        || payload.context_package?.chapter_target?.chapter_no
        || payload.reference_report?.chapter_no
        || 0,
      )
      return chapterId === Number(chapter.id) || chapterNo === Number(chapter.chapter_no)
    })
    .sort((a, b) => String(b.review.created_at || '').localeCompare(String(a.review.created_at || '')))[0] || null
}

function extractDeliveryQualityScore(payload: any) {
  return Number(
    payload.self_check?.review?.score
    || payload.report?.overall_score
    || payload.quality_card?.overall_score
    || payload.review?.score
    || 0,
  ) || null
}

function extractSimilarityRisk(payload: any) {
  return Number(
    payload.report?.overall_risk_score
    || payload.overall_risk_score
    || payload.reference_report?.overall_risk_score
    || 0,
  ) || null
}

function releaseChapterGroupStages() {
  return [
    { key: 'context', label: '章节目标确认/续写上下文包', status: 'pending' },
    { key: 'scene_cards', label: '场景卡生成/人工确认', status: 'pending' },
    { key: 'migration_plan', label: '参考迁移计划', status: 'pending' },
    { key: 'draft', label: '段落级正文生成', status: 'pending' },
    { key: 'review', label: '章节级自检', status: 'pending' },
    { key: 'revise', label: '二次修订', status: 'pending' },
    { key: 'safety', label: '仿写安全阈值', status: 'pending' },
    { key: 'store', label: '入库版本', status: 'pending' },
    { key: 'story_state', label: '记忆状态机更新', status: 'pending' },
  ]
}

function buildOutlineAncestorVolume(outlines: any[]) {
  const byId = new Map<number, any>()
  outlines.forEach(outline => byId.set(Number(outline.id), outline))
  const resolve = (outlineId: any) => {
    let current = byId.get(Number(outlineId))
    const seen = new Set<number>()
    while (current && !seen.has(Number(current.id))) {
      seen.add(Number(current.id))
      if (current.outline_type === 'volume') return current
      current = byId.get(Number(current.parent_id || 0))
    }
    return null
  }
  return resolve
}

function buildNovelExportPayload(project: any, chapters: any[], outlines: any[], options: any = {}) {
  const range = {
    start_chapter: Number(options.start_chapter || 0),
    end_chapter: Number(options.end_chapter || 0),
    include_unwritten: options.include_unwritten !== false,
  }
  const allSortedChapters = chapters
    .slice()
    .sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
  const sortedChapters = allSortedChapters
    .filter(chapter => !range.start_chapter || Number(chapter.chapter_no || 0) >= range.start_chapter)
    .filter(chapter => !range.end_chapter || Number(chapter.chapter_no || 0) <= range.end_chapter)
    .filter(chapter => range.include_unwritten || String(chapter.chapter_text || '').trim())
  const volumes = getVolumePlan(outlines)
  const resolveVolume = buildOutlineAncestorVolume(outlines)
  const volumeRows = volumes.map((volume, index) => ({
    ...volume,
    order: index + 1,
    chapters: [] as any[],
  }))
  const volumeById = new Map(volumeRows.map(volume => [Number(volume.id), volume]))
  const ungrouped = { id: 0, title: '未分卷章节', summary: '', order: volumeRows.length + 1, chapters: [] as any[] }

  for (const chapter of sortedChapters) {
    const volume = resolveVolume(chapter.outline_id)
    const target = volume ? volumeById.get(Number(volume.id)) : null
    ;(target || ungrouped).chapters.push(chapter)
  }
  const groups = [...volumeRows.filter(volume => volume.chapters.length > 0), ...(ungrouped.chapters.length ? [ungrouped] : [])]
  const written = sortedChapters.filter(chapter => String(chapter.chapter_text || '').trim())
  const placeholders = sortedChapters.filter(chapter => String(chapter.chapter_text || '').includes('【占位正文】'))
  const missing = sortedChapters.filter(chapter => !String(chapter.chapter_text || '').trim())
  const wordCount = sortedChapters.reduce((sum, chapter) => sum + exportWordCount(chapter.chapter_text), 0)
  const warnings = [
    missing.length ? `有 ${missing.length} 章缺少正文：${missing.slice(0, 12).map(chapter => `第${chapter.chapter_no}章`).join('、')}${missing.length > 12 ? '……' : ''}` : '',
    placeholders.length ? `有 ${placeholders.length} 章仍包含占位正文标记。` : '',
    sortedChapters.length === 0 ? '项目还没有章节，导出内容只包含项目信息。' : '',
    range.start_chapter || range.end_chapter ? `当前为范围导出：${range.start_chapter || '开头'}-${range.end_chapter || '末尾'}。` : '',
  ].filter(Boolean)
  const gateBlockers = [
    sortedChapters.length === 0 ? '没有可交付章节。' : '',
    missing.length ? '存在缺正文章节。' : '',
    placeholders.length ? '存在占位正文。' : '',
  ].filter(Boolean)
  return {
    project: {
      id: project.id,
      title: project.title || '未命名项目',
      genre: project.genre || '',
      target_audience: project.target_audience || '',
      length_target: project.length_target || '',
      synopsis: project.synopsis || '',
      style_tags: Array.isArray(project.style_tags) ? project.style_tags : [],
      commercial_tags: Array.isArray(project.commercial_tags) ? project.commercial_tags : [],
      status: project.status || '',
      updated_at: project.updated_at || '',
    },
    stats: {
      total_project_chapter_count: allSortedChapters.length,
      chapter_count: sortedChapters.length,
      written_count: written.length,
      missing_count: missing.length,
      placeholder_count: placeholders.length,
      word_count: wordCount,
      volume_count: groups.filter(group => group.id).length,
      completion_rate: sortedChapters.length ? Math.round((written.length / sortedChapters.length) * 100) : 0,
    },
    gate: {
      status: gateBlockers.length ? 'blocked' : warnings.length ? 'warning' : 'ready',
      blockers: gateBlockers,
      warnings,
      can_export: sortedChapters.length > 0,
    },
    range,
    groups,
    warnings,
    generated_at: new Date().toISOString(),
  }
}

function buildDeliveryManifest(payload: any, chapters: any[], reviews: any[]) {
  const exportChapterIds = new Set(payload.groups.flatMap((group: any) => group.chapters.map((chapter: any) => Number(chapter.id))))
  return chapters
    .filter(chapter => exportChapterIds.has(Number(chapter.id)))
    .sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
    .map(chapter => {
      const qualityPayload = latestChapterReviewPayload(reviews, chapter, ['prose_quality', 'editor_report'])?.payload || {}
      const similarityPayload = latestChapterReviewPayload(reviews, chapter, ['similarity_report'])?.payload || {}
      const text = String(chapter.chapter_text || '')
      return {
        chapter_id: chapter.id,
        chapter_no: chapter.chapter_no,
        title: chapter.title || '未命名',
        version: chapter.version || 1,
        updated_at: chapter.updated_at || '',
        word_count: exportWordCount(text),
        text_hash: stableTextHash(text),
        has_text: Boolean(text.trim()),
        has_placeholder: text.includes('【占位正文】'),
        has_ending_hook: Boolean(chapter.ending_hook),
        continuity_note_count: Array.isArray(chapter.continuity_notes) ? chapter.continuity_notes.length : 0,
        quality_score: extractDeliveryQualityScore(qualityPayload),
        similarity_risk: extractSimilarityRisk(similarityPayload),
        similarity_decision: similarityPayload.report?.decision || similarityPayload.decision || '',
      }
    })
}

function buildDeliveryReleaseAudit(project: any, payload: any, chapters: any[], reviews: any[]) {
  const policy = getDeliveryReleasePolicy(project)
  const manifest = buildDeliveryManifest(payload, chapters, reviews)
  const blockers: any[] = []
  const warnings: any[] = []
  const checks: any[] = []
  const addCheck = (key: string, label: string, passed: boolean, severity: 'blocker' | 'warning', message: string, action: string, meta: any = {}) => {
    const item = { key, label, status: passed ? 'pass' : severity, message: passed ? '通过' : message, action, ...meta }
    checks.push(item)
    if (!passed && severity === 'blocker') blockers.push(item)
    if (!passed && severity === 'warning') warnings.push(item)
  }

  addCheck('chapters_present', '有可交付章节', manifest.length > 0, 'blocker', '没有可交付章节。', '先生成或选择至少一章正文。')
  addCheck(
    'missing_chapters',
    '缺正文控制',
    Number(payload.stats.missing_count || 0) <= policy.max_missing_chapters,
    'blocker',
    `缺正文 ${payload.stats.missing_count || 0} 章，超过正式发布阈值 ${policy.max_missing_chapters}。`,
    '回到章节目录补齐缺失正文，或关闭“包含缺正文占位”。',
    { count: payload.stats.missing_count || 0 },
  )
  addCheck(
    'placeholder_chapters',
    '占位正文控制',
    Number(payload.stats.placeholder_count || 0) <= policy.max_placeholder_chapters,
    'blocker',
    `占位正文 ${payload.stats.placeholder_count || 0} 章，超过正式发布阈值 ${policy.max_placeholder_chapters}。`,
    '进入质量面板定位占位章节并重写。',
    { count: payload.stats.placeholder_count || 0 },
  )

  const missingQuality = manifest.filter(item => item.has_text && !item.quality_score)
  const lowQuality = manifest.filter(item => item.has_text && item.quality_score !== null && Number(item.quality_score) < policy.min_quality_score)
  addCheck(
    'quality_reports',
    '章节质量报告齐全',
    !policy.require_quality_report || missingQuality.length === 0,
    'blocker',
    `${missingQuality.length} 章缺少质量报告。`,
    '在质量评测基准面板运行项目质量基准测试。',
    { chapters: missingQuality.slice(0, 12).map(item => item.chapter_no) },
  )
  addCheck(
    'quality_threshold',
    `章节质量 >= ${policy.min_quality_score}`,
    lowQuality.length === 0,
    'blocker',
    `${lowQuality.length} 章质量低于 ${policy.min_quality_score}。`,
    '进入版本评审或编辑报告，对低分章节做二次修订。',
    { chapters: lowQuality.slice(0, 12).map(item => ({ chapter_no: item.chapter_no, score: item.quality_score })) },
  )

  const missingSimilarity = manifest.filter(item => item.has_text && item.similarity_risk === null)
  const highSimilarity = manifest.filter(item => item.has_text && item.similarity_risk !== null && Number(item.similarity_risk) > policy.max_similarity_risk)
  addCheck(
    'similarity_reports',
    '相似度报告齐全',
    !policy.require_similarity_report || missingSimilarity.length === 0,
    'blocker',
    `${missingSimilarity.length} 章缺少相似度报告。`,
    '对正式交付范围内章节运行相似度检测。',
    { chapters: missingSimilarity.slice(0, 12).map(item => item.chapter_no) },
  )
  addCheck(
    'similarity_threshold',
    `相似风险 <= ${policy.max_similarity_risk}`,
    highSimilarity.length === 0,
    'blocker',
    `${highSimilarity.length} 章相似风险超过 ${policy.max_similarity_risk}。`,
    '运行参考迁移计划并改写高风险桥段。',
    { chapters: highSimilarity.slice(0, 12).map(item => ({ chapter_no: item.chapter_no, risk: item.similarity_risk })) },
  )

  const missingHooks = manifest.filter(item => item.has_text && !item.has_ending_hook)
  const missingContinuityNotes = manifest.filter(item => item.has_text && item.continuity_note_count === 0)
  addCheck(
    'ending_hooks',
    '章末钩子齐全',
    !policy.require_ending_hook || missingHooks.length === 0,
    'warning',
    `${missingHooks.length} 章缺少章末钩子。`,
    '补齐章末钩子，提升续读和连载体验。',
    { chapters: missingHooks.slice(0, 12).map(item => item.chapter_no) },
  )
  addCheck(
    'continuity_notes',
    '连续性备注齐全',
    !policy.require_continuity_notes || missingContinuityNotes.length === 0,
    'warning',
    `${missingContinuityNotes.length} 章缺少连续性备注。`,
    '补齐角色、道具、伏笔和时间线变化记录。',
    { chapters: missingContinuityNotes.slice(0, 12).map(item => item.chapter_no) },
  )

  const storyState = project?.reference_config?.story_state || {}
  const writtenMax = Math.max(0, ...manifest.filter(item => item.has_text).map(item => Number(item.chapter_no || 0)))
  const storyStateStale = writtenMax && Number(storyState.last_updated_chapter || 0) < writtenMax
  addCheck(
    'story_state_fresh',
    '状态机同步',
    !storyStateStale,
    'warning',
    `故事状态机只更新到第 ${storyState.last_updated_chapter || 0} 章，落后正式范围至第 ${writtenMax} 章。`,
    '运行状态机更新或人工校正故事状态。',
  )

  const rangeText = payload.range.start_chapter || payload.range.end_chapter
    ? `${payload.range.start_chapter || '开头'}-${payload.range.end_chapter || '末尾'}`
    : '全书'
  const score = Math.max(0, 100 - blockers.length * 14 - warnings.length * 5)
  const packageManifest = {
    package_id: `release-${project.id}-${Date.now()}`,
    title: payload.project.title,
    range: payload.range,
    range_label: rangeText,
    generated_at: payload.generated_at,
    stats: payload.stats,
    policy,
    chapters: manifest,
    text_hash: stableTextHash(manifest.map(item => `${item.chapter_no}:${item.text_hash}:${item.version}`).join('|')),
  }
  return {
    status: blockers.length ? 'blocked' : warnings.length ? 'warning' : 'ready',
    can_release: blockers.length === 0,
    score,
    policy,
    checks,
    blockers,
    warnings,
    next_actions: [...blockers, ...warnings].slice(0, 8).map(item => item.action),
    manifest: packageManifest,
  }
}

function uniqueNumbers(values: any[]) {
  return [...new Set(values.map(value => Number(value || 0)).filter(Boolean))]
}

function buildReleaseRepairTasks(releaseAudit: any) {
  const chapters = Array.isArray(releaseAudit?.manifest?.chapters) ? releaseAudit.manifest.chapters : []
  const byNo = new Map(chapters.map((chapter: any) => [Number(chapter.chapter_no), chapter]))
  const checks = Array.isArray(releaseAudit?.checks) ? releaseAudit.checks : []
  const check = (key: string) => checks.find((item: any) => item.key === key) || null
  const tasks: any[] = []
  const pushTask = (task: any) => {
    const chapterNos = uniqueNumbers(task.chapter_nos || [])
    if (task.scope === 'chapters' && !chapterNos.length) return
    tasks.push({
      id: `${task.type}-${tasks.length + 1}`,
      status: 'queued',
      priority: task.priority || 'medium',
      ...task,
      chapter_nos: chapterNos,
      chapter_ids: uniqueNumbers(chapterNos.map(no => byNo.get(no)?.chapter_id)),
      count: chapterNos.length || task.count || 0,
    })
  }

  const missingText = chapters.filter((chapter: any) => !chapter.has_text).map((chapter: any) => chapter.chapter_no)
  const placeholders = chapters.filter((chapter: any) => chapter.has_placeholder).map((chapter: any) => chapter.chapter_no)
  const missingQuality = check('quality_reports')?.chapters || chapters.filter((chapter: any) => chapter.has_text && !chapter.quality_score).map((chapter: any) => chapter.chapter_no)
  const lowQuality = (check('quality_threshold')?.chapters || [])
    .map((item: any) => typeof item === 'object' ? item.chapter_no : item)
  const missingSimilarity = check('similarity_reports')?.chapters || chapters.filter((chapter: any) => chapter.has_text && chapter.similarity_risk === null).map((chapter: any) => chapter.chapter_no)
  const highSimilarity = (check('similarity_threshold')?.chapters || [])
    .map((item: any) => typeof item === 'object' ? item.chapter_no : item)
  const missingHooks = check('ending_hooks')?.chapters || chapters.filter((chapter: any) => chapter.has_text && !chapter.has_ending_hook).map((chapter: any) => chapter.chapter_no)
  const missingContinuityNotes = check('continuity_notes')?.chapters || chapters.filter((chapter: any) => chapter.has_text && chapter.continuity_note_count === 0).map((chapter: any) => chapter.chapter_no)
  const rewriteNos = uniqueNumbers([...missingText, ...placeholders, ...lowQuality, ...highSimilarity])

  pushTask({
    type: 'rewrite_chapters',
    title: '重写缺失/占位/低质/高相似章节',
    scope: 'chapters',
    priority: 'high',
    chapter_nos: rewriteNos,
    action: '已自动创建可执行章节群任务；在任务中心执行或启动后台 worker。',
    repair_route: 'chapter_group_generation',
  })
  pushTask({
    type: 'quality_reports',
    title: '补齐章节质量报告',
    scope: 'chapters',
    priority: 'high',
    chapter_nos: missingQuality,
    action: '对这些章节运行正文质检/编辑报告，正式发布前必须有质量分。',
    repair_route: 'quality_batch',
  })
  pushTask({
    type: 'similarity_reports',
    title: '补齐章节相似度报告',
    scope: 'chapters',
    priority: 'high',
    chapter_nos: missingSimilarity,
    action: '对这些章节运行相似度检测，确认没有照搬参考作品。',
    repair_route: 'similarity_batch',
  })
  pushTask({
    type: 'reference_migration',
    title: '处理高相似风险章节',
    scope: 'chapters',
    priority: 'high',
    chapter_nos: highSimilarity,
    action: '运行参考迁移计划并重写事件、障碍和信息揭示顺序。',
    repair_route: 'reference_migration',
  })
  pushTask({
    type: 'ending_hooks',
    title: '补齐章末钩子',
    scope: 'chapters',
    priority: 'medium',
    chapter_nos: missingHooks,
    action: '人工或通过编辑报告补齐章末钩子，提升续读。',
    repair_route: 'manual_chapter_edit',
  })
  pushTask({
    type: 'continuity_notes',
    title: '补齐连续性备注',
    scope: 'chapters',
    priority: 'medium',
    chapter_nos: missingContinuityNotes,
    action: '补齐角色、道具、伏笔和时间线变化记录。',
    repair_route: 'manual_chapter_edit',
  })
  if (checks.some((item: any) => item.key === 'story_state_fresh' && item.status !== 'pass')) {
    tasks.push({
      id: `story_state-${tasks.length + 1}`,
      type: 'story_state',
      title: '同步故事状态机',
      scope: 'project',
      priority: 'medium',
      status: 'queued',
      count: 1,
      chapter_nos: [],
      chapter_ids: [],
      action: '运行状态机更新或人工校正故事状态。',
      repair_route: 'story_state_editor',
    })
  }

  return tasks
}

function buildDeterministicReleaseQuality(chapter: any, contextPackage: any) {
  const text = String(chapter.chapter_text || '')
  const wordCount = exportWordCount(text)
  const sceneCount = Array.isArray(chapter.scene_breakdown) ? chapter.scene_breakdown.length : 0
  const preflight = contextPackage?.preflight || {}
  const warnings = Array.isArray(preflight.warnings) ? preflight.warnings : []
  const checks = Array.isArray(preflight.checks) ? preflight.checks : []
  const checkOk = (key: string) => checks.find((item: any) => item.key === key)?.ok === true
  const issues = [
    !text.trim() ? { severity: 'high', description: '缺少章节正文' } : null,
    text.includes('【占位正文】') ? { severity: 'high', description: '正文仍包含占位标记' } : null,
    !chapter.ending_hook ? { severity: 'medium', description: '缺少章末钩子' } : null,
    !Array.isArray(chapter.continuity_notes) || chapter.continuity_notes.length === 0 ? { severity: 'medium', description: '缺少连续性备注' } : null,
    wordCount < 800 && text.trim() ? { severity: 'medium', description: '正文篇幅偏短，可能不是完整章节' } : null,
    ...warnings.slice(0, 6).map((warning: string) => ({ severity: 'low', description: warning })),
  ].filter(Boolean)
  const score = clampScore(
    (text.trim() ? 42 : 0)
    + (wordCount >= 1800 ? 18 : wordCount >= 800 ? 10 : 0)
    + (chapter.chapter_goal || chapter.chapter_summary ? 10 : 0)
    + (chapter.conflict ? 8 : 0)
    + (chapter.ending_hook ? 8 : 0)
    + (sceneCount ? 7 : 0)
    + (Array.isArray(chapter.continuity_notes) && chapter.continuity_notes.length ? 7 : 0)
    + (checkOk('previous_continuity') ? 5 : 0)
    - (text.includes('【占位正文】') ? 30 : 0)
  )
  return {
    score,
    passed: score >= 78 && !issues.some((issue: any) => issue.severity === 'high'),
    word_count: wordCount,
    issues,
    dimensions: {
      text_complete: Boolean(text.trim()) && !text.includes('【占位正文】'),
      chapter_goal: Boolean(chapter.chapter_goal || chapter.chapter_summary),
      conflict: Boolean(chapter.conflict),
      ending_hook: Boolean(chapter.ending_hook),
      scene_count: sceneCount,
      continuity_note_count: Array.isArray(chapter.continuity_notes) ? chapter.continuity_notes.length : 0,
    },
  }
}

async function executeReleaseBatchRun(activeWorkspace: string, project: any, run: any, ctx: ProjectControlRoutesContext, options: any = {}) {
  const payload = parseJsonLikePayload(run.output_ref) || {}
  const targetChapterNos = Array.isArray(payload.target_chapter_nos) ? payload.target_chapter_nos.map((item: any) => Number(item)).filter(Boolean) : []
  const maxItems = Math.max(1, Math.min(100, Number(options.max_items || targetChapterNos.length || 50)))
  const [chapters, worldbuilding, characters, outlines, reviews] = await Promise.all([
    listNovelChapters(activeWorkspace, project.id),
    listNovelWorldbuilding(activeWorkspace, project.id),
    listNovelCharacters(activeWorkspace, project.id),
    listNovelOutlines(activeWorkspace, project.id),
    listNovelReviews(activeWorkspace, project.id),
  ])
  const targets = chapters
    .filter(chapter => targetChapterNos.includes(Number(chapter.chapter_no || 0)))
    .sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
    .slice(0, maxItems)
  const startedAt = Date.now()
  await updateNovelRun(activeWorkspace, run.id, {
    status: 'running',
    output_ref: JSON.stringify({ ...payload, phase: '发布批量任务执行中', started_at: new Date().toISOString(), processed: 0 }),
  })
  const results: any[] = []
  for (const chapter of targets) {
    try {
      if (run.run_type === 'release_quality_batch') {
        const contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
        const review = buildDeterministicReleaseQuality(chapter, contextPackage)
        const saved = await createNovelReview(activeWorkspace, {
          project_id: project.id,
          review_type: 'prose_quality',
          status: review.passed ? 'ok' : 'warn',
          summary: `发布前质检评分 ${review.score}`,
          issues: review.issues.map((issue: any) => `${issue.severity}｜${issue.description}`),
          payload: JSON.stringify({ chapter_id: chapter.id, chapter_no: chapter.chapter_no, context_package: contextPackage, self_check: { review }, source: 'release_quality_batch', run_id: run.id }),
        })
        results.push({ chapter_id: chapter.id, chapter_no: chapter.chapter_no, status: 'success', score: review.score, review_id: saved.id })
      } else if (run.run_type === 'release_similarity_batch') {
        const referenceReport = await ctx.buildReferenceUsageReport(activeWorkspace, project, '发布前相似度检测', chapter.chapter_text || '')
        const quality = referenceReport.quality_assessment || {}
        const structuralRisk = clampScore(100 - Number(quality.originality_score || 100))
        const structuralReport = ctx.buildStructuralSimilarityReport(chapter, referenceReport)
        const combinedStructuralRisk = clampScore((structuralRisk * 0.45) + (Number(structuralReport.overall_structural_risk || 0) * 0.55))
        const copyHitCount = Array.isArray(referenceReport.copy_guard?.hits) ? referenceReport.copy_guard.hits.length : 0
        const report = {
          chapter_id: chapter.id,
          chapter_no: chapter.chapter_no,
          overall_risk_score: clampScore((copyHitCount * 12) + combinedStructuralRisk * 0.55),
          term_hits: referenceReport.copy_guard?.hits || [],
          copy_safety_score: quality.copy_safety_score,
          originality_score: quality.originality_score,
          structural_similarity_risk: combinedStructuralRisk,
          structural_report: structuralReport,
          decision: Number(quality.copy_safety_score || 100) < 75 || combinedStructuralRisk > 45 ? 'needs_rewrite' : 'pass',
          suggestions: [
            ...(referenceReport.copy_guard?.hits?.length ? ['替换疑似复用专名和证据词。'] : []),
            combinedStructuralRisk > 45 ? '调整场景目标、障碍来源、信息揭示顺序和角色选择。' : '',
            ...((structuralReport.suggestions || []) as any[]),
          ].filter(Boolean),
        }
        const saved = await createNovelReview(activeWorkspace, {
          project_id: project.id,
          review_type: 'similarity_report',
          status: report.decision === 'pass' ? 'ok' : 'warn',
          summary: `发布前相似度风险 ${report.overall_risk_score}`,
          issues: report.suggestions,
          payload: JSON.stringify({ report, reference_report: referenceReport, source: 'release_similarity_batch', run_id: run.id }),
        })
        results.push({ chapter_id: chapter.id, chapter_no: chapter.chapter_no, status: 'success', risk: report.overall_risk_score, review_id: saved.id })
      }
    } catch (error: any) {
      results.push({ chapter_id: chapter.id, chapter_no: chapter.chapter_no, status: 'failed', error: String(error?.message || error) })
    }
    await updateNovelRun(activeWorkspace, run.id, {
      status: 'running',
      output_ref: JSON.stringify({ ...payload, phase: `已处理 ${results.length}/${targets.length}`, target_chapter_nos: targetChapterNos, results, processed: results.length }),
      duration_ms: Date.now() - startedAt,
    })
  }
  const failed = results.filter(item => item.status === 'failed')
  const updated = await updateNovelRun(activeWorkspace, run.id, {
    status: failed.length ? 'failed' : 'success',
    output_ref: JSON.stringify({
      ...payload,
      phase: failed.length ? '发布批量任务存在失败项' : '发布批量任务执行完成',
      target_chapter_nos: targetChapterNos,
      results,
      processed: results.length,
      success: results.length - failed.length,
      failed: failed.length,
      completed_at: new Date().toISOString(),
    }),
    duration_ms: Date.now() - startedAt,
    error_message: failed.map(item => `第${item.chapter_no}章：${item.error}`).join('\n'),
  })
  return { run: updated, results, failed }
}

async function createReleaseRepairQueueRun(activeWorkspace: string, project: any, chapters: any[], outlines: any[], reviews: any[], body: any = {}) {
  const payload = buildNovelExportPayload(project, chapters, outlines, getExportRange(body || {}))
  const releaseAudit = buildDeliveryReleaseAudit(project, payload, chapters, reviews)
  const repairTasks = buildReleaseRepairTasks(releaseAudit)
  const relatedRuns: any[] = []
  const runnableRuns: any[] = []
  const chapterByNo = new Map(chapters.map(chapter => [Number(chapter.chapter_no), chapter]))
  const rewriteTask = repairTasks.find(task => task.type === 'rewrite_chapters')
  if (rewriteTask?.chapter_nos?.length) {
    const selected = rewriteTask.chapter_nos
      .map((chapterNo: number) => chapterByNo.get(Number(chapterNo)))
      .filter(Boolean)
      .sort((a: any, b: any) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
    const firstNo = selected[0]?.chapter_no || 0
    const lastNo = selected[selected.length - 1]?.chapter_no || firstNo
    const groupOutput = {
      chapter_ids: selected.map((chapter: any) => chapter.id),
      chapters: selected.map((chapter: any) => ({
        id: chapter.id,
        chapter_no: chapter.chapter_no,
        title: chapter.title,
        status: 'pending',
        release_repair_reason: '发布审核修复队列',
        scenes: Array.isArray(chapter.scene_breakdown) ? chapter.scene_breakdown : [],
        stages: releaseChapterGroupStages(),
      })),
      current_index: 0,
      mode: 'release_repair',
      production_mode: body.production_mode || 'draft_review_revise_store',
      policy: {
        stop_on_failure: true,
        require_scene_confirmation: false,
        quality_threshold: getDeliveryReleasePolicy(project).min_quality_score,
        production_mode: body.production_mode || 'draft_review_revise_store',
        regenerate: true,
      },
      release_repair_queue: true,
      source_audit_hash: releaseAudit.manifest.text_hash,
    }
    const groupRun = await appendNovelRun(activeWorkspace, {
      project_id: project.id,
      run_type: 'chapter_group_generation',
      step_name: `release-repair-chapter-${firstNo}-${lastNo}`,
      status: 'ready',
      input_ref: JSON.stringify({ source: 'release_repair_queue', ...body }),
      output_ref: JSON.stringify(groupOutput),
    })
    relatedRuns.push({ run_id: groupRun.id, run_type: groupRun.run_type, action: 'rewrite_chapters', execute_endpoint: `/api/novel/projects/${project.id}/chapter-groups/${groupRun.id}/execute` })
  }
  const qualityTask = repairTasks.find(task => task.type === 'quality_reports')
  if (qualityTask?.chapter_nos?.length) {
    const qualityRun = await appendNovelRun(activeWorkspace, {
      project_id: project.id,
      run_type: 'release_quality_batch',
      step_name: `release-quality-${qualityTask.count}`,
      status: 'queued',
      input_ref: JSON.stringify({ source: 'release_repair_queue', model_id: body.model_id || null, range: payload.range }),
      output_ref: JSON.stringify({ task: qualityTask, phase: '等待批量质检执行', target_chapter_nos: qualityTask.chapter_nos, suggested_endpoint: `/api/novel/projects/${project.id}/benchmark` }),
    })
    runnableRuns.push(qualityRun)
    relatedRuns.push({ run_id: qualityRun.id, run_type: qualityRun.run_type, action: 'quality_reports', suggested_endpoint: `/api/novel/projects/${project.id}/benchmark` })
  }
  const similarityTask = repairTasks.find(task => task.type === 'similarity_reports')
  if (similarityTask?.chapter_nos?.length) {
    const similarityRun = await appendNovelRun(activeWorkspace, {
      project_id: project.id,
      run_type: 'release_similarity_batch',
      step_name: `release-similarity-${similarityTask.count}`,
      status: 'queued',
      input_ref: JSON.stringify({ source: 'release_repair_queue', model_id: body.model_id || null, range: payload.range }),
      output_ref: JSON.stringify({ task: similarityTask, phase: '等待批量相似度检测执行', target_chapter_nos: similarityTask.chapter_nos, suggested_endpoint_template: `/api/novel/chapters/:chapterId/similarity-report` }),
    })
    runnableRuns.push(similarityRun)
    relatedRuns.push({ run_id: similarityRun.id, run_type: similarityRun.run_type, action: 'similarity_reports', suggested_endpoint_template: `/api/novel/chapters/:chapterId/similarity-report` })
  }
  const queueRun = await appendNovelRun(activeWorkspace, {
    project_id: project.id,
    run_type: 'release_repair_queue',
    step_name: `release-repair-${new Date().toISOString().slice(0, 10)}`,
    status: relatedRuns.length ? 'ready' : 'success',
    input_ref: JSON.stringify({ range: payload.range, source_audit_hash: releaseAudit.manifest.text_hash }),
    output_ref: JSON.stringify({
      phase: relatedRuns.length ? '已生成发布修复子任务' : '没有需要排队的修复项',
      release_audit: {
        status: releaseAudit.status,
        score: releaseAudit.score,
        can_release: releaseAudit.can_release,
        blocker_count: releaseAudit.blockers.length,
        warning_count: releaseAudit.warnings.length,
      },
      tasks: repairTasks,
      related_runs: relatedRuns,
      progress: relatedRuns.length ? 5 : 100,
      created_at: new Date().toISOString(),
    }),
  })
  await createNovelReview(activeWorkspace, {
    project_id: project.id,
    review_type: 'release_repair_queue',
    status: relatedRuns.length ? 'queued' : 'ok',
    summary: `发布修复队列：${repairTasks.length} 类任务，${relatedRuns.length} 个子任务`,
    issues: repairTasks.map(task => `${task.title}：${task.count || 1}`),
    payload: JSON.stringify({ run_id: queueRun.id, tasks: repairTasks, related_runs: relatedRuns, release_audit: releaseAudit }),
  })
  return { queueRun, repairTasks, relatedRuns, runnableRuns, releaseAudit, payload }
}

function renderNovelTextExport(payload: any, format: Extract<NovelExportFormat, 'txt' | 'markdown'>) {
  const { project, stats, groups, warnings, generated_at: generatedAt } = payload
  const lines: string[] = []
  if (format === 'markdown') {
    lines.push(`# ${project.title}`, '')
    if (project.synopsis) lines.push(`> ${project.synopsis}`, '')
    lines.push('## 交付信息', '')
    lines.push(`- 类型：${project.genre || '未设置'}`)
    lines.push(`- 目标读者：${project.target_audience || '未设置'}`)
    lines.push(`- 篇幅目标：${project.length_target || '未设置'}`)
    lines.push(`- 章节：${stats.written_count}/${stats.chapter_count} 已写，缺失 ${stats.missing_count}`)
    lines.push(`- 字数：${stats.word_count}`)
    lines.push(`- 生成时间：${generatedAt}`, '')
    if (warnings.length) {
      lines.push('## 交付警告', '')
      warnings.forEach((warning: string) => lines.push(`- ${warning}`))
      lines.push('')
    }
    for (const group of groups) {
      if (groups.length > 1 || group.id) {
        lines.push(`## ${group.id ? `第${group.order}卷 ` : ''}${group.title || '未分卷章节'}`, '')
        if (group.summary) lines.push(`${group.summary}`, '')
      }
      for (const chapter of group.chapters) {
        const title = chapter.title || '未命名'
        const text = String(chapter.chapter_text || '').trim()
        lines.push(`### 第${chapter.chapter_no}章 ${title}`, '')
        if (!text) lines.push('> [缺正文]', '')
        else {
          if (text.includes('【占位正文】')) lines.push('> [占位正文警告：本章可能尚未完成]', '')
          lines.push(text, '')
        }
      }
    }
  } else {
    lines.push(`《${project.title}》`, '')
    if (project.synopsis) lines.push(`简介：${project.synopsis}`, '')
    lines.push('【交付信息】')
    lines.push(`类型：${project.genre || '未设置'}`)
    lines.push(`目标读者：${project.target_audience || '未设置'}`)
    lines.push(`篇幅目标：${project.length_target || '未设置'}`)
    lines.push(`章节：${stats.written_count}/${stats.chapter_count} 已写，缺失 ${stats.missing_count}`)
    lines.push(`字数：${stats.word_count}`)
    lines.push(`生成时间：${generatedAt}`, '')
    if (warnings.length) {
      lines.push('【交付警告】')
      warnings.forEach((warning: string) => lines.push(`- ${warning}`))
      lines.push('')
    }
    for (const group of groups) {
      if (groups.length > 1 || group.id) {
        lines.push(`===== ${group.id ? `第${group.order}卷 ` : ''}${group.title || '未分卷章节'} =====`)
        if (group.summary) lines.push(group.summary)
        lines.push('')
      }
      for (const chapter of group.chapters) {
        const title = chapter.title || '未命名'
        const text = String(chapter.chapter_text || '').trim()
        lines.push(`第${chapter.chapter_no}章 ${title}`, '')
        if (!text) lines.push('[缺正文]', '')
        else {
          if (text.includes('【占位正文】')) lines.push('[占位正文警告：本章可能尚未完成]', '')
          lines.push(text, '')
        }
      }
    }
  }
  return lines.map(line => exportLine(format, line)).join('\n').replace(/\n{4,}/g, '\n\n\n')
}

function docxParagraph(text: string, style = '') {
  const styleXml = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''
  const runs = String(text || '').split(/\n/).map(part => `<w:r><w:t xml:space="preserve">${xmlEscape(part)}</w:t></w:r>`).join('')
  return `<w:p>${styleXml}${runs}</w:p>`
}

async function renderDocxExport(payload: any) {
  const zip = new JSZip()
  const paragraphs: string[] = []
  paragraphs.push(docxParagraph(payload.project.title, 'Title'))
  paragraphs.push(docxParagraph(`章节：${payload.stats.written_count}/${payload.stats.chapter_count} 已写，字数：${payload.stats.word_count}`, 'Subtitle'))
  if (payload.project.synopsis) paragraphs.push(docxParagraph(`简介：${payload.project.synopsis}`))
  if (payload.warnings.length) {
    paragraphs.push(docxParagraph('交付警告', 'Heading1'))
    payload.warnings.forEach((warning: string) => paragraphs.push(docxParagraph(`- ${warning}`)))
  }
  for (const group of payload.groups) {
    if (payload.groups.length > 1 || group.id) paragraphs.push(docxParagraph(`${group.id ? `第${group.order}卷 ` : ''}${group.title || '未分卷章节'}`, 'Heading1'))
    if (group.summary) paragraphs.push(docxParagraph(group.summary))
    for (const chapter of group.chapters) {
      const text = String(chapter.chapter_text || '').trim()
      paragraphs.push(docxParagraph(`第${chapter.chapter_no}章 ${chapter.title || '未命名'}`, 'Heading2'))
      if (!text) paragraphs.push(docxParagraph('[缺正文]'))
      else {
        if (text.includes('【占位正文】')) paragraphs.push(docxParagraph('[占位正文警告：本章可能尚未完成]'))
        text.split(/\n{2,}/).map(part => part.trim()).filter(Boolean).forEach(part => paragraphs.push(docxParagraph(part)))
      }
    }
  }
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`)
  zip.folder('_rels')?.file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`)
  zip.folder('word')?.file('document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`)
  zip.folder('word')?.file('styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="44"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:rPr><w:color w:val="666666"/><w:sz w:val="24"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style></w:styles>`)
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

function chapterXhtml(chapter: any) {
  const text = String(chapter.chapter_text || '').trim()
  const paragraphs = text
    ? text.split(/\n{2,}/).map(part => `<p>${htmlEscape(part.trim()).replace(/\n/g, '<br/>')}</p>`).join('\n')
    : '<p>[缺正文]</p>'
  return `<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" lang="zh-CN"><head><title>${htmlEscape(`第${chapter.chapter_no}章 ${chapter.title || '未命名'}`)}</title><style>body{font-family:serif;line-height:1.8;} h1{font-size:1.4em;} p{text-indent:2em;margin:0 0 .8em;}</style></head><body><h1>第${chapter.chapter_no}章 ${htmlEscape(chapter.title || '未命名')}</h1>${text.includes('【占位正文】') ? '<p>[占位正文警告：本章可能尚未完成]</p>' : ''}${paragraphs}</body></html>`
}

async function renderEpubExport(payload: any) {
  const zip = new JSZip()
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })
  zip.folder('META-INF')?.file('container.xml', `<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`)
  const oebps = zip.folder('OEBPS')
  const chapters = payload.groups.flatMap((group: any) => group.chapters)
  oebps?.file('title.xhtml', `<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" lang="zh-CN"><head><title>${htmlEscape(payload.project.title)}</title></head><body><h1>${htmlEscape(payload.project.title)}</h1><p>字数：${payload.stats.word_count}</p><p>章节：${payload.stats.written_count}/${payload.stats.chapter_count}</p>${payload.project.synopsis ? `<p>${htmlEscape(payload.project.synopsis)}</p>` : ''}</body></html>`)
  chapters.forEach((chapter: any, index: number) => {
    oebps?.file(`chapter-${index + 1}.xhtml`, chapterXhtml(chapter))
  })
  const manifestItems = [
    '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
    '<item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>',
    ...chapters.map((_chapter: any, index: number) => `<item id="chapter-${index + 1}" href="chapter-${index + 1}.xhtml" media-type="application/xhtml+xml"/>`),
  ]
  const spineItems = ['<itemref idref="title"/>', ...chapters.map((_chapter: any, index: number) => `<itemref idref="chapter-${index + 1}"/>`)]
  oebps?.file('content.opf', `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="bookid">novel-${payload.project.id}-${Date.now()}</dc:identifier><dc:title>${htmlEscape(payload.project.title)}</dc:title><dc:language>zh-CN</dc:language><dc:creator>MangaForge Studio</dc:creator><meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}</meta></metadata><manifest>${manifestItems.join('')}</manifest><spine>${spineItems.join('')}</spine></package>`)
  oebps?.file('nav.xhtml', `<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="zh-CN"><head><title>目录</title></head><body><nav epub:type="toc"><h1>目录</h1><ol><li><a href="title.xhtml">封面信息</a></li>${chapters.map((chapter: any, index: number) => `<li><a href="chapter-${index + 1}.xhtml">第${chapter.chapter_no}章 ${htmlEscape(chapter.title || '未命名')}</a></li>`).join('')}</ol></nav></body></html>`)
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

function formatContentType(format: NovelExportFormat) {
  if (format === 'markdown') return 'text/markdown; charset=utf-8'
  if (format === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (format === 'epub') return 'application/epub+zip'
  return 'text/plain; charset=utf-8'
}

function formatExtension(format: NovelExportFormat) {
  if (format === 'markdown') return 'md'
  return format
}

export function registerNovelProjectControlRoutes(app: Express, ctx: ProjectControlRoutesContext) {
  app.get('/api/novel/projects/:id/export-preview', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const payload = buildNovelExportPayload(project, chapters, outlines, getExportRange(req.query))
      const releaseAudit = buildDeliveryReleaseAudit(project, payload, chapters, reviews)
      const exportRecords = reviews
        .filter(item => item.review_type === 'delivery_export')
        .slice()
        .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
        .slice(0, 8)
        .map(item => ({ id: item.id, status: item.status, summary: item.summary, created_at: item.created_at, payload: parseJsonLikePayload(item.payload) || {} }))
      const releaseLocks = reviews
        .filter(item => item.review_type === 'delivery_release_lock')
        .slice()
        .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
        .slice(0, 8)
        .map(item => ({ id: item.id, status: item.status, summary: item.summary, created_at: item.created_at, payload: parseJsonLikePayload(item.payload) || {} }))
      res.json({
        ok: true,
        export: {
          project: payload.project,
          stats: payload.stats,
          gate: payload.gate,
          release_audit: releaseAudit,
          range: payload.range,
          warnings: payload.warnings,
          records: exportRecords,
          release_locks: releaseLocks,
          generated_at: payload.generated_at,
        },
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/export', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const format = normalizeExportFormat(req.query.format)
      const [chapters, outlines] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
      ])
      const payload = buildNovelExportPayload(project, chapters, outlines, getExportRange(req.query))
      const content = format === 'docx'
        ? await renderDocxExport(payload)
        : format === 'epub'
          ? await renderEpubExport(payload)
          : renderNovelTextExport(payload, format)
      const filename = `${sanitizeExportFilename(project.title)}-${new Date().toISOString().slice(0, 10)}.${formatExtension(format)}`
      await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'delivery_export',
        status: payload.gate.status === 'ready' ? 'ok' : payload.gate.status,
        summary: `导出 ${format.toUpperCase()}：${payload.stats.written_count}/${payload.stats.chapter_count} 章，${payload.stats.word_count} 字`,
        issues: [...payload.gate.blockers, ...payload.warnings],
        payload: JSON.stringify({
          format,
          filename,
          stats: payload.stats,
          gate: payload.gate,
          range: payload.range,
          generated_at: payload.generated_at,
        }),
      })
      res.setHeader('Content-Type', formatContentType(format))
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`)
      res.send(content)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/release-lock', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const payload = buildNovelExportPayload(project, chapters, outlines, getExportRange(req.body || {}))
      const releaseAudit = buildDeliveryReleaseAudit(project, payload, chapters, reviews)
      const force = Boolean(req.body?.force)
      if (!releaseAudit.can_release && !force) {
        return res.status(409).json({
          ok: false,
          error: 'release gate blocked',
          release_audit: releaseAudit,
        })
      }
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'delivery_release_lock',
        status: releaseAudit.can_release ? 'ok' : 'forced',
        summary: `发布包锁定：${releaseAudit.manifest.range_label}，${releaseAudit.manifest.stats.written_count}/${releaseAudit.manifest.stats.chapter_count} 章，评分 ${releaseAudit.score}`,
        issues: [...releaseAudit.blockers, ...releaseAudit.warnings].map((item: any) => `${item.label}：${item.message}`),
        payload: JSON.stringify({
          audit: releaseAudit,
          manifest: releaseAudit.manifest,
          forced: force && !releaseAudit.can_release,
          locked_at: new Date().toISOString(),
        }),
      })
      const locks = Array.isArray(project.reference_config?.delivery_release_locks) ? project.reference_config.delivery_release_locks : []
      const lockSummary = {
        review_id: saved.id,
        package_id: releaseAudit.manifest.package_id,
        range: releaseAudit.manifest.range,
        range_label: releaseAudit.manifest.range_label,
        stats: releaseAudit.manifest.stats,
        score: releaseAudit.score,
        status: saved.status,
        text_hash: releaseAudit.manifest.text_hash,
        locked_at: saved.created_at,
      }
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: {
          ...(project.reference_config || {}),
          latest_delivery_release_lock: lockSummary,
          delivery_release_locks: [lockSummary, ...locks].slice(0, 20),
        },
      } as any)
      res.json({ ok: true, release_lock: lockSummary, review: saved, release_audit: releaseAudit, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/release-repair-plan', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const payload = buildNovelExportPayload(project, chapters, outlines, getExportRange(req.query))
      const releaseAudit = buildDeliveryReleaseAudit(project, payload, chapters, reviews)
      const repairTasks = buildReleaseRepairTasks(releaseAudit)
      res.json({
        ok: true,
        release_audit: releaseAudit,
        repair_plan: {
          status: repairTasks.length ? 'needs_repair' : 'clean',
          task_count: repairTasks.length,
          tasks: repairTasks,
          summary: {
            high: repairTasks.filter(task => task.priority === 'high').length,
            medium: repairTasks.filter(task => task.priority === 'medium').length,
            chapter_task_count: repairTasks.filter(task => task.scope === 'chapters').reduce((sum, task) => sum + Number(task.count || 0), 0),
          },
        },
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/release-repair-queue', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const { queueRun, repairTasks, relatedRuns, releaseAudit } = await createReleaseRepairQueueRun(activeWorkspace, project, chapters, outlines, reviews, req.body || {})
      res.json({ ok: true, run: queueRun, repair_plan: { tasks: repairTasks, related_runs: relatedRuns }, release_audit: releaseAudit })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/release-repair-auto', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const queue = await createReleaseRepairQueueRun(activeWorkspace, project, chapters, outlines, reviews, req.body || {})
      const executed: any[] = []
      for (const run of queue.runnableRuns) {
        const result = await executeReleaseBatchRun(activeWorkspace, project, run, ctx, req.body || {})
        executed.push({
          run_id: result.run?.id || run.id,
          run_type: run.run_type,
          status: result.run?.status || 'unknown',
          processed: result.results.length,
          failed: result.failed.length,
        })
      }
      const [latestChapters, latestOutlines, latestReviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const exportPayload = buildNovelExportPayload(project, latestChapters, latestOutlines, queue.payload.range)
      const releaseAudit = buildDeliveryReleaseAudit(project, exportPayload, latestChapters, latestReviews)
      await updateNovelRun(activeWorkspace, queue.queueRun.id, {
        status: releaseAudit.can_release ? 'success' : executed.some(item => item.status === 'failed') ? 'failed' : 'ready',
        output_ref: JSON.stringify({
          ...(parseJsonLikePayload(queue.queueRun.output_ref) || {}),
          phase: executed.length ? '已执行自动发布修复并重新审核' : '没有可自动执行的发布修复项',
          progress: releaseAudit.can_release ? 100 : 65,
          auto_executed_runs: executed,
          latest_release_audit: {
            status: releaseAudit.status,
            score: releaseAudit.score,
            can_release: releaseAudit.can_release,
            blocker_count: releaseAudit.blockers.length,
            warning_count: releaseAudit.warnings.length,
          },
          updated_at: new Date().toISOString(),
        }),
      })
      res.json({
        ok: true,
        run: queue.queueRun,
        auto_executed_runs: executed,
        repair_plan: { tasks: queue.repairTasks, related_runs: queue.relatedRuns },
        release_audit: releaseAudit,
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/release-repair-runs/:runId/execute', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const runs = await listNovelRuns(activeWorkspace, project.id)
      const run = runs.find(item => item.id === Number(req.params.runId))
      if (!run || !['release_quality_batch', 'release_similarity_batch'].includes(run.run_type)) {
        return res.status(404).json({ error: 'release repair batch run not found' })
      }
      const result = await executeReleaseBatchRun(activeWorkspace, project, run, ctx, req.body || {})
      const [chapters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const range = parseJsonLikePayload(run.input_ref)?.range || getExportRange(req.body || {})
      const exportPayload = buildNovelExportPayload(project, chapters, outlines, range)
      const releaseAudit = buildDeliveryReleaseAudit(project, exportPayload, chapters, reviews)
      res.json({ ok: true, ...result, release_audit: releaseAudit })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/writing-bible', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      res.json({ ok: true, writing_bible: await ctx.getStoredOrBuiltWritingBible(activeWorkspace, project), generated: !project.reference_config?.writing_bible })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/writing-bible/generate', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const modelId = req.body?.model_id ? String(req.body.model_id) : undefined
      if (!modelId) return res.status(400).json({ error: 'model_id is required' })
      const [worldbuilding, characters, outlines, chapters, reviews] = await Promise.all([
        listNovelWorldbuilding(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelChapters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const fallback = await ctx.getStoredOrBuiltWritingBible(activeWorkspace, project)
      const material = {
        project: {
          title: project.title,
          genre: project.genre || '',
          sub_genres: project.sub_genres || [],
          synopsis: project.synopsis || '',
          target_audience: project.target_audience || '',
          length_target: project.length_target || '',
          style_tags: project.style_tags || [],
          commercial_tags: project.commercial_tags || [],
        },
        existing_writing_bible: fallback,
        worldbuilding: worldbuilding.slice(0, 6).map(item => ({
          summary: item.world_summary || '',
          rules: item.rules || [],
          systems: item.systems || null,
          factions: item.factions || [],
          locations: item.locations || [],
          timeline_anchor: item.timeline_anchor || '',
        })),
        characters: characters.slice(0, 20).map(item => ({
          name: item.name,
          role: item.role_type || item.role || '',
          goal: item.goal || '',
          motivation: item.motivation || '',
          conflict: item.conflict || '',
          appearance: item.appearance || '',
          abilities: item.abilities || [],
          relationships: item.relationships || [],
          secret: item.secret || '',
          growth_arc: item.growth_arc || '',
          current_state: item.current_state || {},
          profile: item.raw_payload?.profile || {},
        })),
        outlines: outlines.slice(0, 40).map(item => ({
          type: item.outline_type,
          title: item.title,
          summary: item.summary || '',
          hook: item.hook || '',
          conflict_points: item.conflict_points || [],
          turning_points: item.turning_points || [],
          target_length: item.target_length || '',
        })),
        chapters: chapters.slice(0, 30).map(item => ({
          chapter_no: item.chapter_no,
          title: item.title,
          goal: item.chapter_goal || '',
          summary: item.chapter_summary || '',
          conflict: item.conflict || '',
          ending_hook: item.ending_hook || '',
          text_excerpt: compactControlText(item.chapter_text, 900),
        })),
        latest_reviews: reviews.slice(-12).map(item => ({
          type: item.review_type,
          status: item.status,
          summary: item.summary,
          issues: item.issues || [],
        })),
        reference_config: {
          safety: project.reference_config?.safety || {},
          style_lock: project.reference_config?.style_lock || {},
          active_references: project.reference_config?.active_references || [],
        },
      }
      const prompt = [
        '任务：根据现有小说项目材料生成一份可直接用于商业级自动写作工作台的“写作圣经”。只输出 JSON。',
        '要求：不要空字段；材料不足时可以合理推断，但必须保持可执行、具体、可约束后续生成。',
        '写作圣经用于后续章节生成、质检、修订、仿写安全和长篇一致性控制。',
        '必须输出字段：',
        '{',
        '  "project": {"title","genre","synopsis","target_audience","style_tags","length_target"},',
        '  "promise": "读者承诺/核心卖点，100-300字",',
        '  "world_summary": "世界观摘要",',
        '  "world_rules": ["稳定世界规则，包含力量体系/禁忌/代价/社会秩序"],',
        '  "mainline": {"core_conflict","protagonist_drive","antagonist_pressure","long_term_question","ending_direction","must_payoff":[]},',
        '  "volume_plan": [{"title","goal","phase_conflict","turning_points":[],"payoff","risk"}],',
        '  "characters": [{"name","role","desire","fear","secret","arc","voice","do_not_violate":[]}],',
        '  "style_lock": {"narrative_person","sentence_length","dialogue_ratio","banter_density","payoff_density","description_density","chapter_word_range","ending_policy","banned_words":[],"preferred_words":[],"banned_shortcuts":[]},',
        '  "safety_policy": {"allowed":[],"cautious":[],"forbidden":[]},',
        '  "forbidden": ["禁止重复/禁止写法/禁止设定漂移"],',
        '  "commercial_positioning": {"selling_points":[],"target_reader_emotion":[],"chapter_hook_model","retention_strategy"},',
        '  "generation_rules": ["每章生成必须遵守的硬规则"]',
        '}',
        '【项目材料】',
        JSON.stringify(material, null, 2).slice(0, 18000),
      ].join('\n')
      const result = await executeNovelAgent('outline-agent', project, { task: prompt }, {
        activeWorkspace,
        modelId,
        maxTokens: 6500,
        temperature: 0.35,
        responseMode: 'non_stream',
        skipMemory: true,
      })
      if ((result as any).error) return res.status(502).json({ error: (result as any).error, result })
      const payload = getNovelPayload(result)
      const writingBible = normalizeGeneratedWritingBible(project, payload, fallback)
      let updated = project
      if (req.body?.save !== false) {
        updated = await updateNovelProject(activeWorkspace, project.id, {
          reference_config: {
            ...(project.reference_config || {}),
            writing_bible: writingBible,
          },
        } as any) || project
        await appendNovelRun(activeWorkspace, {
          project_id: project.id,
          run_type: 'writing_bible',
          step_name: 'generate',
          status: 'success',
          input_ref: JSON.stringify({ model_id: modelId, save: req.body?.save !== false }),
          output_ref: JSON.stringify({ writing_bible_hash: stableTextHash(JSON.stringify(writingBible)), modelName: (result as any).modelName }),
        })
      }
      res.json({ ok: true, writing_bible: writingBible, project: updated, result })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/projects/:id/writing-bible', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const writingBible = req.body?.writing_bible || req.body || {}
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: {
          ...(project.reference_config || {}),
          writing_bible: { ...writingBible, updated_at: new Date().toISOString() },
        },
      } as any)
      res.json({ ok: true, writing_bible: updated?.reference_config?.writing_bible || writingBible, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/story-state', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      res.json({ ok: true, story_state: ctx.getStoryState(project) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/projects/:id/story-state', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const storyState = req.body?.story_state || req.body || {}
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: {
          ...(project.reference_config || {}),
          story_state: { ...storyState, manually_corrected_at: new Date().toISOString() },
        },
      } as any)
      await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'story_state',
        status: 'ok',
        summary: '故事状态机已人工校正',
        issues: [],
        payload: JSON.stringify({ manual: true, story_state: updated?.reference_config?.story_state || storyState }),
      })
      res.json({ ok: true, story_state: updated?.reference_config?.story_state || storyState, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/production-dashboard', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, characters, reviews, runs] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
        listNovelRuns(activeWorkspace, project.id),
      ])
      res.json({ ok: true, dashboard: ctx.buildProductionDashboard(project, chapters, outlines, characters, reviews, runs) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/production-metrics', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, reviews, runs] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
        listNovelRuns(activeWorkspace, project.id),
      ])
      res.json({ ok: true, metrics: ctx.buildProductionMetrics(chapters, reviews, runs) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/commercial-readiness', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, characters, reviews, runs] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
        listNovelRuns(activeWorkspace, project.id),
      ])
      res.json({ ok: true, readiness: ctx.buildCommercialReadiness(project, chapters, outlines, characters, reviews, runs) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/continuity-audit', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, characters, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const sorted = [...chapters].sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
      const state = ctx.getStoryState(project)
      const issues: any[] = []
      const titleMap = new Map<string, any[]>()
      for (const chapter of sorted) {
        const title = String(chapter.title || '').trim()
        if (title) titleMap.set(title, [...(titleMap.get(title) || []), chapter])
        if (chapter.chapter_no > 1) {
          const prev = sorted.filter(item => Number(item.chapter_no || 0) < Number(chapter.chapter_no || 0)).slice(-1)[0]
          if (chapter.chapter_text && !prev?.chapter_text && !prev?.ending_hook) {
            issues.push({ type: 'timeline_gap', severity: 'high', chapter_no: chapter.chapter_no, title: chapter.title, message: '当前章已有正文，但上一章缺正文和结尾钩子。', action: '补齐上一章正文或结尾钩子后再继续生成。' })
          }
          if (!chapter.continuity_notes?.length && chapter.chapter_text) {
            issues.push({ type: 'continuity_note_missing', severity: 'medium', chapter_no: chapter.chapter_no, title: chapter.title, message: '章节正文已存在，但缺连续性备注。', action: '补充本章结束后的角色、道具、伏笔和时间线变化。' })
          }
        }
        if (chapter.chapter_text && !chapter.ending_hook) {
          issues.push({ type: 'missing_hook', severity: 'medium', chapter_no: chapter.chapter_no, title: chapter.title, message: '章节缺章末钩子。', action: '补充下一章驱动力。' })
        }
      }
      for (const [title, rows] of titleMap.entries()) {
        if (rows.length > 1) {
          issues.push({ type: 'duplicate_title', severity: 'low', chapter_no: rows[0].chapter_no, title, message: `重复章节标题：${rows.map(item => `第${item.chapter_no}章`).join('、')}`, action: '确认是否为占位标题，避免目录混淆。' })
        }
      }
      const writtenMax = Math.max(0, ...sorted.filter(chapter => chapter.chapter_text).map(chapter => Number(chapter.chapter_no || 0)))
      if (writtenMax && Number(state.last_updated_chapter || 0) < writtenMax) {
        issues.push({ type: 'story_state_stale', severity: 'high', chapter_no: writtenMax, title: '', message: `故事状态机只更新到第${state.last_updated_chapter || 0}章，落后正文至第${writtenMax}章。`, action: '运行状态机更新或人工校正故事状态。' })
      }
      const characterNames = new Set(characters.map(char => String(char.name || '').trim()).filter(Boolean))
      const positions = state.character_positions || {}
      for (const name of Object.keys(positions)) {
        if (characterNames.size && !characterNames.has(name)) {
          issues.push({ type: 'unknown_character_state', severity: 'low', chapter_no: 0, title: '', message: `状态机包含未建角色卡：${name}`, action: '创建角色卡或清理状态机冗余角色。' })
        }
      }
      const repeated = Array.isArray(state.recent_repeated_information) ? state.recent_repeated_information : []
      for (const item of repeated.slice(0, 8)) {
        issues.push({ type: 'repeated_information', severity: 'medium', chapter_no: 0, title: '', message: `近期重复信息：${String(item)}`, action: '后续章节避免再次解释该信息，改为推进新信息。' })
      }
      const stateReviews = reviews.filter(item => item.review_type === 'story_state').slice(-10).map(item => parseJsonLikePayload(item.payload) || {})
      const unresolved = state.unresolved_conflicts || state.open_questions || []
      for (const item of (Array.isArray(unresolved) ? unresolved : Object.values(unresolved)).slice(0, 10)) {
        issues.push({ type: 'open_thread', severity: 'medium', chapter_no: 0, title: '', message: `未关闭线索/问题：${String(item)}`, action: '在滚动规划里安排回收或延期。' })
      }
      const severityWeight: Record<string, number> = { high: 12, medium: 6, low: 2 }
      const riskScore = Math.min(100, issues.reduce((sum, item) => sum + (severityWeight[item.severity] || 4), 0))
      res.json({
        ok: true,
        audit: {
          project_id: project.id,
          score: Math.max(0, 100 - riskScore),
          risk_score: riskScore,
          issue_count: issues.length,
          high_count: issues.filter(item => item.severity === 'high').length,
          medium_count: issues.filter(item => item.severity === 'medium').length,
          low_count: issues.filter(item => item.severity === 'low').length,
          issues,
          state_review_samples: stateReviews.length,
          recommendations: [
            issues.some(item => item.type === 'story_state_stale') ? '优先更新故事状态机，避免角色位置、道具归属和伏笔漂移。' : '',
            issues.some(item => item.type === 'timeline_gap') ? '先修补章节间空洞，再批量生成后续章节。' : '',
            issues.some(item => item.type === 'missing_hook') ? '补齐已写章节的章末钩子，提高续写上下文稳定性。' : '',
            repeated.length ? '清理近期重复信息，减少水文和反复解释。' : '',
          ].filter(Boolean),
        },
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/approval-policy', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      res.json({ ok: true, policy: ctx.getApprovalPolicy(project) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/projects/:id/approval-policy', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const policy = { ...ctx.getApprovalPolicy(project), ...(req.body?.policy || req.body || {}) }
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: { ...(project.reference_config || {}), approval_policy: policy },
      } as any)
      res.json({ ok: true, policy, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/production-budget', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const runs = await listNovelRuns(activeWorkspace, project.id)
      res.json({ ok: true, budget: ctx.getProductionBudget(project), decision: ctx.getProductionBudgetDecision(project, runs) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/projects/:id/production-budget', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const budget = { ...ctx.getProductionBudget(project), ...(req.body?.budget || req.body || {}) }
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: { ...(project.reference_config || {}), production_budget: budget },
      } as any)
      res.json({ ok: true, budget, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/quality-gate', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      res.json({ ok: true, gate: ctx.getQualityGate(project) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/projects/:id/quality-gate', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const gate = { ...ctx.getQualityGate(project), ...(req.body?.gate || req.body || {}) }
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: { ...(project.reference_config || {}), quality_gate: gate },
      } as any)
      res.json({ ok: true, gate, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/agent-config', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      res.json({
        ok: true,
        config: ctx.getAgentPromptConfig(project),
        snapshot: ctx.buildAgentConfigSnapshot(project, Number(req.query.model_id || 0) || undefined),
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/projects/:id/agent-config', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const prev = ctx.getAgentPromptConfig(project)
      const previousVersion = {
        version: prev.version,
        prompts: prev.prompts || {},
        project_overrides_enabled: prev.project_overrides_enabled !== false,
        updated_at: prev.updated_at || '',
        archived_at: new Date().toISOString(),
      }
      const config = {
        ...prev,
        ...(req.body?.config || req.body || {}),
        version: Number(prev.version || 1) + 1,
        updated_at: new Date().toISOString(),
        history: [previousVersion, ...((prev.history || []) as any[])].slice(0, 30),
      }
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: { ...(project.reference_config || {}), agent_prompt_config: config },
      } as any)
      res.json({ ok: true, config, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/agent-config/snapshot', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const snapshot = ctx.buildAgentConfigSnapshot(project, Number(req.body?.model_id || 0) || undefined)
      res.json({
        ok: true,
        snapshot,
        replay_plan: {
          project_id: project.id,
          model_strategy: snapshot.model_strategy,
          approval_policy: snapshot.approval_policy,
          agent_prompt_version: snapshot.agent_prompt_version,
          writing_bible_hash: snapshot.writing_bible_hash,
          note: '该快照用于复现生成环境；重新执行时仍会调用当前可用模型，因此输出不保证逐字一致。',
        },
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}
