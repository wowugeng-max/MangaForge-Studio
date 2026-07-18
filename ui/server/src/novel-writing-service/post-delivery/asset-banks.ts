import { asArray, parseJsonLikePayload } from '../../routes/novel-route-utils'

export const DISCOVERED_ASSET_TYPES = ['character', 'item', 'ability', 'faction', 'location', 'foreshadowing']

export function normalizeDiscoveredAssets(assets: any[] = [], options: {
  existingCharacters?: any[]
  existingSettings?: any[]
  chapter?: any
} = {}) {
  const existingCharacterNames = new Set((options.existingCharacters || []).map(item => String(item?.name || '').trim()).filter(Boolean))
  const existingSettingKeys = new Set((options.existingSettings || []).map(item => `${item?.entity_type}:${String(item?.name || '').trim()}`).filter(Boolean))
  const seen = new Set<string>()
  const chapterNo = Number(options.chapter?.chapter_no || 0) || null
  const chapterId = Number(options.chapter?.id || 0) || null
  const normalized: any[] = []

  for (const asset of asArray(assets)) {
    const entityType = String(asset?.entity_type || asset?.type || '')
    const name = String(asset?.name || asset?.title || '').trim()
    if (!DISCOVERED_ASSET_TYPES.includes(entityType) || !name) continue
    if (entityType === 'character' && existingCharacterNames.has(name)) continue
    const key = `${entityType}:${name}`
    if (existingSettingKeys.has(key) || seen.has(key)) continue
    seen.add(key)
    const suggestedState = asset?.state_json || asset?.suggested_state || asset?.state || {}
    normalized.push({
      entity_type: entityType,
      name,
      summary: String(asset?.summary || asset?.description || asset?.role || asset?.effect || '').trim(),
      evidence: String(asset?.evidence || asset?.quote || asset?.source_text || '').trim(),
      source_excerpt: String(asset?.source_excerpt || asset?.quote || asset?.evidence || '').trim(),
      first_chapter_no: asset?.first_chapter_no ?? chapterNo,
      constraints_json: asset?.constraints_json || asset?.constraints || {},
      state_json: {
        ...(suggestedState && typeof suggestedState === 'object' && !Array.isArray(suggestedState) ? suggestedState : {}),
        ...(chapterNo ? { first_seen_chapter: chapterNo } : {}),
      },
      payload_json: {
        source: 'story_state_discovered_asset',
        source_chapter_id: chapterId,
        source_chapter_no: chapterNo,
        raw: asset,
      },
    })
  }
  return normalized
}

export function normalizeIpSceneCandidates(candidates: any[] = [], chapter: any = {}) {
  const normalized: any[] = []
  const seen = new Set<string>()
  const chapterNo = Number(chapter?.chapter_no || 0) || null
  const chapterId = Number(chapter?.id || 0) || null

  for (const candidate of asArray(candidates)) {
    const title = String(candidate?.title || candidate?.name || '').trim()
    const summary = String(candidate?.summary || candidate?.description || '').trim()
    if (!title || !summary) continue
    const key = title.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    normalized.push({
      title,
      summary,
      visual_hook: String(candidate?.visual_hook || candidate?.visual || candidate?.image_hook || '').trim(),
      adaptation_value: String(candidate?.adaptation_value || candidate?.ip_value || candidate?.short_drama_value || '').trim(),
      spread_point: String(candidate?.spread_point || candidate?.comment_point || candidate?.discussion_point || '').trim(),
      evidence: String(candidate?.evidence || candidate?.quote || '').trim(),
      source_excerpt: String(candidate?.source_excerpt || candidate?.excerpt || candidate?.evidence || '').trim(),
      tags: asArray(candidate?.tags).map((item: any) => String(item || '').trim()).filter(Boolean).slice(0, 8),
      chapter_id: chapterId,
      chapter_no: chapterNo,
      payload_json: {
        source: 'story_state_ip_scene_intake',
        source_chapter_id: chapterId,
        source_chapter_no: chapterNo,
        raw: candidate,
      },
    })
  }

  return normalized
}

export function normalizeMemeBank(rawBank: any[] = []) {
  const normalized: any[] = []
  const seen = new Set<string>()
  for (const raw of asArray(rawBank)) {
    const memeKey = String(raw?.meme_key || raw?.key || raw?.name || raw?.title || '').trim()
    const functionText = String(raw?.function || raw?.usage_function || raw?.emotion_function || raw?.purpose || '').trim()
    const directPhrases = [
      ...asArray(raw?.unsafe_direct_phrases),
      ...asArray(raw?.direct_phrases),
      raw?.direct_phrase,
      raw?.phrase,
    ].map((item: any) => String(item || '').trim()).filter(Boolean)
    if (!memeKey || (!functionText && directPhrases.length === 0 && !String(raw?.abstract_usage || '').trim())) continue
    const key = memeKey.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const abstractUsage = String(raw?.abstract_usage || raw?.usage || '').trim()
    normalized.push({
      meme_key: memeKey,
      function: functionText || '情绪共鸣/传播点',
      tone: String(raw?.tone || raw?.voice || '轻度').trim(),
      suitable_genres: asArray(raw?.suitable_genres || raw?.genres).map((item: any) => String(item || '').trim()).filter(Boolean),
      unsafe_direct_phrases: Array.from(new Set(directPhrases)),
      abstract_usage: [
        abstractUsage || `${functionText || memeKey} 只转化为吐槽节奏、角色口吻或情绪功能。`,
        '不直接复刻原句。',
      ].join('').replace(/。+/g, '。'),
      expires_at: String(raw?.expires_at || raw?.expire_at || '').trim(),
      forbidden_scenes: asArray(raw?.forbidden_scenes || raw?.禁用场景).map((item: any) => String(item || '').trim()).filter(Boolean),
      risk_level: String(raw?.risk_level || raw?.过期风险 || 'medium').trim(),
    })
  }
  return normalized
}

export function normalizeStyleSampleBank(rawBank: any[] = []) {
  const normalized: any[] = []
  const seen = new Set<string>()
  for (const raw of asArray(rawBank)) {
    const sampleKey = String(raw?.sample_key || raw?.key || raw?.name || raw?.title || '').trim()
    if (!sampleKey) continue
    const key = sampleKey.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    const sceneFunction = String(raw?.scene_function || raw?.function || raw?.usage_function || raw?.purpose || '').trim()
    const narrativeRhythm = String(raw?.narrative_rhythm || raw?.rhythm || raw?.pacing || '').trim()
    const sentencePattern = String(raw?.sentence_pattern || raw?.sentence_density || raw?.sentence_length || '').trim()
    const dialogueRatio = String(raw?.dialogue_ratio || raw?.dialogue_density || '').trim()
    const voiceRules = asArray(raw?.voice_rules || raw?.character_voice || raw?.voice)
      .map((item: any) => String(item || '').trim())
      .filter(Boolean)
    const applicableScenes = Array.from(new Set(asArray(
      raw?.applicable_scenes || raw?.applicableScenes || raw?.suitable_scenes || raw?.apply_to || raw?.适用场景,
    ).map((item: any) => String(item || '').trim()).filter(Boolean)))
    const avoidScenes = Array.from(new Set([
      ...asArray(raw?.avoid_scenes || raw?.avoidScenes || raw?.unsuitable_scenes || raw?.not_for || raw?.不适用场景),
      ...asArray(raw?.forbidden_scenes || raw?.禁用场景),
    ].map((item: any) => String(item || '').trim()).filter(Boolean)))
    const selectionReason = String(raw?.selection_reason || raw?.selectionReason || raw?.match_reason || raw?.命中理由 || '').trim()
    const abstractUsage = String(raw?.abstract_usage || raw?.usage || '').trim()
    const unsafeDirectPhrases = [
      ...asArray(raw?.unsafe_direct_phrases),
      ...asArray(raw?.unsafeDirectPhrases),
      ...asArray(raw?.forbidden_copy),
      ...asArray(raw?.forbiddenCopy),
      ...asArray(raw?.direct_phrases),
      ...asArray(raw?.directPhrases),
      raw?.direct_phrase,
      raw?.directPhrase,
      raw?.forbidden_phrase,
      raw?.forbiddenPhrase,
    ].map((item: any) => String(item || '').trim()).filter(Boolean)
    const sourceChapterNo = Number(raw?.source_chapter_no ?? raw?.sourceChapterNo ?? 0) || null
    const sourceChapterId = Number(raw?.source_chapter_id ?? raw?.sourceChapterId ?? 0) || null
    const sourceQualityScore = Number(raw?.source_quality_score ?? raw?.sourceQualityScore ?? raw?.quality_score ?? 0)

    normalized.push({
      sample_key: sampleKey,
      scene_function: sceneFunction || '叙述节奏样本',
      narrative_rhythm: narrativeRhythm || '按本章场景压力调整节奏',
      sentence_pattern: sentencePattern || '短中句结合，解释压短',
      dialogue_ratio: dialogueRatio || '按冲突需要控制对白比例',
      voice_rules: voiceRules,
      abstract_usage: [
        abstractUsage || sceneFunction || narrativeRhythm || `${sampleKey} 的表达方法`,
        '；只学习节奏、句式密度、对白比例和情绪转折，不学习具体桥段、设定和原句。',
      ].join('').replace(/；+/g, '；'),
      unsafe_direct_phrases: Array.from(new Set(unsafeDirectPhrases)),
      applicable_scenes: applicableScenes,
      avoid_scenes: avoidScenes,
      ...(selectionReason ? { selection_reason: selectionReason } : {}),
      suitable_genres: asArray(raw?.suitable_genres || raw?.genres).map((item: any) => String(item || '').trim()).filter(Boolean),
      forbidden_scenes: asArray(raw?.forbidden_scenes || raw?.禁用场景).map((item: any) => String(item || '').trim()).filter(Boolean),
      ...(sourceChapterNo ? { source_chapter_no: sourceChapterNo } : {}),
      ...(sourceChapterId ? { source_chapter_id: sourceChapterId } : {}),
      ...(Number.isFinite(sourceQualityScore) && sourceQualityScore > 0 ? { source_quality_score: sourceQualityScore } : {}),
    })
  }
  return normalized
}

export function normalizeChapterBenchmarkSampleBank(rawBank: any[] = []) {
  const normalized: any[] = []
  const seen = new Set<string>()
  for (const raw of asArray(rawBank)) {
    const sampleKey = String(raw?.sample_key || raw?.key || raw?.name || raw?.title || '').trim()
    if (!sampleKey) continue
    const key = sampleKey.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    const openingHook = String(raw?.opening_hook || raw?.openingHook || raw?.hook || '').trim()
    const conflictPattern = String(raw?.conflict_pattern || raw?.conflictPattern || raw?.conflict || '').trim()
    const payoffPattern = String(raw?.payoff_pattern || raw?.payoffPattern || raw?.payoff || '').trim()
    const endingHookPattern = String(raw?.ending_hook_pattern || raw?.endingHookPattern || raw?.ending_hook || '').trim()
    const sceneBudgetPattern = String(raw?.scene_budget_pattern || raw?.sceneBudgetPattern || raw?.scene_budget || raw?.structure || '').trim()
    const dialoguePattern = String(raw?.dialogue_pattern || raw?.dialoguePattern || raw?.dialogue || '').trim()
    const visualPattern = String(raw?.visual_pattern || raw?.visualPattern || raw?.visual_scene || '').trim()
    const abstractUsage = String(raw?.abstract_usage || raw?.usage || '').trim()
    const doNotCopy = [
      ...asArray(raw?.do_not_copy),
      ...asArray(raw?.doNotCopy),
      ...asArray(raw?.forbidden_copy),
      ...asArray(raw?.forbiddenCopy),
      ...asArray(raw?.unsafe_direct_phrases),
      ...asArray(raw?.unsafeDirectPhrases),
      raw?.source_excerpt,
      raw?.sample_text,
      raw?.direct_phrase,
      raw?.directPhrase,
    ].map((item: any) => String(item || '').trim()).filter(Boolean)

    normalized.push({
      sample_key: sampleKey,
      genre: String(raw?.genre || raw?.type || '').trim(),
      quality_axes: Array.from(new Set([
        ...asArray(raw?.quality_axes || raw?.axes),
        openingHook ? '开篇钩子' : '',
        conflictPattern ? '冲突推进' : '',
        payoffPattern ? '爽点兑现' : '',
        endingHookPattern ? '章末追读' : '',
        sceneBudgetPattern ? '场景节拍' : '',
        dialoguePattern ? '对白节奏' : '',
        visualPattern ? '场面可视化' : '',
      ].map((item: any) => String(item || '').trim()).filter(Boolean))),
      opening_hook: openingHook || '开篇 300 字内给出异常、危险、欲望或反常信息',
      conflict_pattern: conflictPattern || '每个场景都有目标、阻碍、转折和可见代价',
      payoff_pattern: payoffPattern || '把爽点写成行动结果、信息增量或情绪回报',
      ending_hook_pattern: endingHookPattern || '章末保留一个读者必须继续看的未解问题',
      scene_budget_pattern: sceneBudgetPattern || '按开局钩子、冲突升级、回报反转、章末钩子分配篇幅',
      dialogue_pattern: dialoguePattern || '对白必须推动冲突、试探信息或暴露关系变化',
      visual_pattern: visualPattern || '关键场面要有空间、动作、道具或规则反馈，便于短剧/漫剧转化',
      abstract_usage: [
        abstractUsage || '对照样例的章节结构、冲突节拍、爽点密度和章末追读设计。',
        '只学习章节结构、信息密度、冲突节拍、爽点兑现和章末钩子，不学习具体桥段、设定和原句。',
      ].join('').replace(/。+/g, '。'),
      do_not_copy: Array.from(new Set([
        ...doNotCopy,
        '不得复制样例桥段、角色名、专有设定和原句',
        '不得把样例剧情替换成本章剧情',
      ])),
    })
  }
  return normalized
}

export function resolveMemeBank(project: any, contextPackage: any = {}) {
  return normalizeMemeBank([
    ...asArray(project?.reference_config?.meme_bank),
    ...asArray(project?.reference_config?.writing_bible?.meme_bank),
    ...asArray(contextPackage?.writing_bible?.meme_bank),
  ])
}

export function resolveStyleSampleBank(project: any, contextPackage: any = {}) {
  return normalizeStyleSampleBank([
    ...asArray(project?.reference_config?.style_sample_bank),
    ...asArray(project?.reference_config?.writing_bible?.style_sample_bank),
    ...asArray(contextPackage?.writing_bible?.style_sample_bank),
  ])
}

export function resolveChapterBenchmarkSampleBank(project: any, contextPackage: any = {}) {
  return normalizeChapterBenchmarkSampleBank([
    ...asArray(project?.reference_config?.chapter_benchmark_sample_bank),
    ...asArray(project?.reference_config?.writing_bible?.chapter_benchmark_sample_bank),
    ...asArray(contextPackage?.writing_bible?.chapter_benchmark_sample_bank),
  ])
}

export function buildStyleSampleSelectionSignals(contextPackage: any = {}) {
  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards || target.scenes)
  const endingHook = String(target.ending_hook || target.endingHook || '').trim()
  const text = [
    target.title,
    target.summary,
    target.goal,
    target.chapter_goal,
    target.conflict,
    endingHook,
    ...sceneCards.flatMap((card: any) => [
      card?.title,
      card?.purpose,
      card?.summary,
      card?.conflict,
      card?.reader_payoff,
      card?.ending_hook_seed,
    ]),
  ].map(item => String(item || '')).join(' ')
  const signals = new Set<string>()
  if (/规则|危机|压迫|反打|反制|强敌|战斗|冲突|围堵|压制|破局/.test(text)) {
    signals.add('规则压迫')
    signals.add('高压反打')
    signals.add('危机压迫')
    signals.add('战斗反制')
  }
  if (/对白|交锋|试探|信息差|质问|谈判|阻止|争执|斗嘴/.test(text)) {
    signals.add('对白交锋')
    signals.add('信息差试探')
    signals.add('关系变化')
  }
  if (/线索|揭秘|真相|秘密|身份|伏笔|令牌|证据/.test(text)) {
    signals.add('线索揭秘')
    signals.add('伏笔回收')
    signals.add('新问题抛出')
  }
  if (/情感|告别|关系|和解|背叛|选择|代价/.test(text)) {
    signals.add('情感爆点')
    signals.add('重大情感告别')
  }
  if (/解释|背景|设定|铺垫|过场/.test(text)) {
    signals.add('纯背景说明')
    signals.add('低压日常过场')
  }
  if (endingHook) {
    signals.add('章末追读钩子')
    signals.add('新问题抛出')
  }
  return { text, signals }
}

function styleSampleEffectivenessRows(contextPackage: any = {}) {
  const report = contextPackage?.style_sample_effectiveness
    || contextPackage?.styleSampleEffectiveness
    || contextPackage?.chapter_target?.style_sample_effectiveness
    || contextPackage?.chapter_target?.styleSampleEffectiveness
    || {}
  return asArray(report?.samples || report?.items || report)
}

export function styleSampleEffectivenessForSample(sample: any, contextPackage: any = {}) {
  const key = String(sample?.sample_key || '').trim()
  if (!key) return null
  return styleSampleEffectivenessRows(contextPackage)
    .find((item: any) => String(item?.sample_key || item?.sampleKey || '').trim() === key) || null
}

export function styleSampleEffectivenessAdjustment(effectiveness: any) {
  if (!effectiveness) return 0
  const usage = Number(effectiveness.usage_count || effectiveness.usageCount || 0) || 0
  if (usage <= 0) return 0
  const hitRate = Number(effectiveness.hit_rate ?? effectiveness.hitRate ?? 0) || 0
  const missedCount = Number(effectiveness.missed_count || effectiveness.missedCount || 0) || 0
  const copyRiskCount = Number(effectiveness.copy_risk_count || effectiveness.copyRiskCount || 0) || 0
  const averageStyleScore = Number(effectiveness.average_style_score || effectiveness.averageStyleScore || 0) || 0
  const riskLabel = String(effectiveness.risk_label || effectiveness.riskLabel || '')
  let adjustment = 0
  if (hitRate >= 95) adjustment += 14
  else if (hitRate >= 85) adjustment += 10
  else if (hitRate >= 75) adjustment += 5
  else if (hitRate > 0 && hitRate < 60) adjustment -= 12
  if (riskLabel === '表现稳定') adjustment += 8
  if (riskLabel === '需复盘') adjustment -= 14
  adjustment -= Math.min(18, missedCount * 3)
  adjustment -= Math.min(24, copyRiskCount * 12)
  if (averageStyleScore >= 88) adjustment += 4
  if (averageStyleScore > 0 && averageStyleScore < 70) adjustment -= 4
  return adjustment
}

export function styleSampleEffectivenessShouldAvoid(effectiveness: any) {
  if (!effectiveness) return false
  const usage = Number(effectiveness.usage_count || effectiveness.usageCount || 0) || 0
  if (usage < 2) return false
  const hitRate = Number(effectiveness.hit_rate ?? effectiveness.hitRate ?? 0) || 0
  const missedCount = Number(effectiveness.missed_count || effectiveness.missedCount || 0) || 0
  const copyRiskCount = Number(effectiveness.copy_risk_count || effectiveness.copyRiskCount || 0) || 0
  const riskLabel = String(effectiveness.risk_label || effectiveness.riskLabel || '')
  return copyRiskCount > 0 || missedCount >= 3 || riskLabel === '需复盘' || (hitRate > 0 && hitRate < 60)
}

export function styleSampleEffectivenessReason(effectiveness: any) {
  if (!effectiveness) return ''
  const usage = Number(effectiveness.usage_count || effectiveness.usageCount || 0) || 0
  if (usage <= 0) return ''
  const hitRate = Number(effectiveness.hit_rate ?? effectiveness.hitRate ?? 0) || 0
  const missedCount = Number(effectiveness.missed_count || effectiveness.missedCount || 0) || 0
  const copyRiskCount = Number(effectiveness.copy_risk_count || effectiveness.copyRiskCount || 0) || 0
  const riskLabel = String(effectiveness.risk_label || effectiveness.riskLabel || '')
  return [
    hitRate > 0 ? `历史命中率${hitRate}%` : '',
    riskLabel,
    missedCount > 0 ? `历史缺口${missedCount}` : '',
    copyRiskCount > 0 ? `照搬风险${copyRiskCount}` : '',
  ].filter(Boolean).join('；')
}

export function latestStyleSelectionReviewPayload(reviews: any[] = [], chapter: any, reviewType: string, payloadKey = '') {
  const chapterId = Number(chapter?.id || 0)
  const chapterNo = Number(chapter?.chapter_no || 0)
  const review = asArray(reviews)
    .filter((item: any) => item?.review_type === reviewType)
    .filter((item: any) => {
      const payload = parseJsonLikePayload(item?.payload) || {}
      return Number(item?.chapter_id || 0) === chapterId
        || Number(payload?.chapter_id || payload?.chapterId || 0) === chapterId
        || Number(payload?.chapter_no || payload?.chapterNo || 0) === chapterNo
    })
    .slice()
    .sort((a: any, b: any) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0]
  const payload = parseJsonLikePayload(review?.payload) || {}
  return payloadKey ? (payload[payloadKey] || payload?.result?.[payloadKey] || payload) : payload
}

export function styleSelectionChapterQualityScore(chapter: any, reviews: any[] = []) {
  const payload = latestStyleSelectionReviewPayload(reviews, chapter, 'prose_quality')
  const score = Number(payload?.self_check?.review?.score ?? payload?.review?.score ?? payload?.score ?? 0)
  return Number.isFinite(score) ? score : 0
}

export function styleSelectionChapterStrategy(chapter: any) {
  return chapter?.raw_payload?.pre_draft_brief?.style_sample_strategy
    || chapter?.raw_payload?.pre_draft_brief?.styleSampleStrategy
    || chapter?.raw_payload?.preDraftBrief?.style_sample_strategy
    || chapter?.raw_payload?.preDraftBrief?.styleSampleStrategy
    || chapter?.raw_payload?.context_package?.pre_draft_brief?.style_sample_strategy
    || chapter?.raw_payload?.context_package?.pre_draft_brief?.styleSampleStrategy
    || chapter?.raw_payload?.context_package?.preDraftBrief?.style_sample_strategy
    || chapter?.raw_payload?.context_package?.preDraftBrief?.styleSampleStrategy
    || chapter?.raw_payload?.context_package?.chapter_target?.style_sample_strategy
    || chapter?.raw_payload?.context_package?.chapter_target?.styleSampleStrategy
    || {}
}

export function styleSelectionItemSampleKey(item: any) {
  return String(item?.sample_key || item?.sampleKey || item?.key || '').trim()
}

export function styleSelectionRoundAverage(values: number[]) {
  const valid = values.filter(value => Number.isFinite(value) && value > 0)
  if (!valid.length) return 0
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length)
}

