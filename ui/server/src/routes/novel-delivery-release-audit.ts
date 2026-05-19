import { exportWordCount } from './novel-delivery-export-renderer'
import { parseJsonLikePayload, stableTextHash } from './novel-route-utils'

export function getDeliveryReleasePolicy(project: any) {
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

export function buildDeliveryReleaseAudit(project: any, payload: any, chapters: any[], reviews: any[]) {
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

export function buildReleaseRepairTasks(releaseAudit: any) {
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
