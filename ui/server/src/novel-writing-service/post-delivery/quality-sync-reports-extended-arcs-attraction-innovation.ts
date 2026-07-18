import {
  asArray,
} from '../../routes/novel-route-utils'
import {
  chapterAttractionPriority,
  normalizeAttractionDimension,
} from '../../novel-writing/chapter-attraction-basics'
import {
  innovationBeatMatch,
  normalizeInnovationBeat,
} from '../../novel-writing/innovation-basics'
import {
  normalizeSignatureSceneBrief,
  normalizeSignatureSceneSyncBeat,
  signatureSceneSyncBeatMatch,
} from '../../novel-writing/signature-scene-basics'
import {
  retentionBriefFromContext,
  contextWithChapterRawPreDraftForSync,
} from './quality-sync-reports-benchmark'
import {
  sceneDriveExpectation,
} from './quality-sync-reports-extended'

export function buildChapterAttractionReviewReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const syncContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const target = syncContextPackage?.chapter_target || {}
  const retentionBrief = retentionBriefFromContext(contextPackage, chapter)
  const dimensions = [
    normalizeAttractionDimension('opening_hook', '开篇钩子', retentionBrief.opening_hook || retentionBrief.openingHook || target.opening_hook || target.openingHook || target.summary, chapterText, { openingOnly: true, threshold: 44 }),
    normalizeAttractionDimension('scene_drive', '场景推进', sceneDriveExpectation(syncContextPackage, chapter) || target.conflict || target.core_conflict || target.coreConflict, chapterText, { threshold: 40 }),
    normalizeAttractionDimension('payoff_density', '爽点密度', retentionBrief.payoff_promise || retentionBrief.payoffPromise || target.reader_payoff || target.readerPayoff || target.payoff, chapterText, { threshold: 42 }),
    normalizeAttractionDimension('page_turn', '章末翻页', retentionBrief.ending_question || retentionBrief.endingQuestion || target.ending_hook || target.endingHook, chapterText, { tailOnly: true, threshold: 42 }),
    normalizeAttractionDimension('spread_scene', '传播场面', retentionBrief.short_drama_scene || retentionBrief.shortDramaScene || target.signature_scene_brief?.signature_scene || target.signatureSceneBrief?.signatureScene || target.ip_scene_hook || target.ipSceneHook, chapterText, { threshold: 42 }),
  ]
  const weak = dimensions.filter(item => item.status === 'warn')
  const score = Math.max(0, Math.min(100, Math.round(dimensions.reduce((sum, item) => sum + Number(item.score || 0), 0) / Math.max(1, dimensions.length))))
  const status = weak.length > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = chapterAttractionPriority(dimensions)
  return {
    report_id: `chapter-attraction-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: status === 'ok' ? '吸引力 OK' : `吸引力缺口 ${weak.length}`,
    summary: status === 'ok'
      ? '本章开篇钩子、场景推进、爽点密度、章末翻页和传播场面已形成连续读者拉力。'
      : `本章有 ${weak.length} 项吸引力执行缺口，${priorityRepair || '优先处理读者翻页动力'}。`,
    weak_count: weak.length,
    priority_repair: priorityRepair,
    dimensions,
    weak_dimensions: weak,
    next_actions: status === 'ok'
      ? ['保持当前章的读者拉力执行结构，并在下一章继续承接章末问题。']
      : [
          '前300字必须尽快给出异常、危险、欲望或反常信息。',
          '每个场景补齐目标、阻碍、转折、回报，避免纯解释或纯氛围过场。',
          '最后300字必须留下下一章非看不可的危险、选择、反转或未解答案。',
          '补出可视化传播场面和短周期爽点，让读者能复述本章最有记忆点的一幕。',
        ],
  }
}

export function innovationBriefFromContext(contextPackage: any, chapter: any = {}) {
  const syncContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const target = syncContextPackage?.chapter_target || {}
  const brief = syncContextPackage?.pre_draft_brief || syncContextPackage?.preDraftBrief || {}
  return target.innovation_brief || target.innovationBrief || brief.innovation_brief || brief.innovationBrief || {}
}

export function buildInnovationSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const innovationBrief = innovationBriefFromContext(contextPackage, chapter)
  const planned = [
    normalizeInnovationBeat('chapter_angle', '创新角度', innovationBrief.chapter_angle || innovationBrief.chapterAngle),
    ...asArray(innovationBrief.execution_points || innovationBrief.executionPoints).map((item: any, index: number) => normalizeInnovationBeat(`execution_point_${index + 1}`, '执行点', item)),
    ...asArray(innovationBrief.differentiation_guardrails || innovationBrief.differentiationGuardrails).map((item: any, index: number) => normalizeInnovationBeat(`differentiation_guardrail_${index + 1}`, '差异护栏', item)),
    ...asArray(innovationBrief.ip_adaptation_hooks || innovationBrief.ipAdaptationHooks).map((item: any, index: number) => normalizeInnovationBeat(`ip_adaptation_hook_${index + 1}`, 'IP化场面', item)),
  ].filter(Boolean)
  const checked = planned.map(item => innovationBeatMatch(item, chapterText))
  const delivered = checked.filter(item => item.delivered)
  const missed = checked.filter(item => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    planned.length ? (delivered.length / planned.length) * 100 : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'

  return {
    report_id: `innovation-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: status === 'ok' ? '创新 OK' : `创新缺口 ${missedCount}`,
    summary: status === 'ok'
      ? '本章创新角度、执行点、差异护栏和可视化场面已基本落地。'
      : `创新执行有 ${missedCount} 项未在正文中充分兑现。`,
    missed_count: missedCount,
    planned,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持开写任务书的创新执行和写后复盘闭环。']
      : [
          '下一次修订优先补足创新执行 missed 项，避免把本章写成普通套路章。',
          '把创新角度转成可见选择、机制反差、规则代价或 IP 化场面，不要只靠旁白解释卖点。',
      ],
  }
}

export function signatureSceneBriefFromContext(contextPackage: any, chapter: any = {}) {
  const syncContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  return normalizeSignatureSceneBrief(
    syncContextPackage?.chapter_target?.signature_scene_brief
      || syncContextPackage?.chapter_target?.signatureSceneBrief
      || syncContextPackage?.signature_scene_brief
      || syncContextPackage?.signatureSceneBrief
      || syncContextPackage?.pre_draft_brief?.signature_scene_brief
      || syncContextPackage?.pre_draft_brief?.signatureSceneBrief
      || syncContextPackage?.preDraftBrief?.signature_scene_brief
      || syncContextPackage?.preDraftBrief?.signatureSceneBrief
      || chapter?.raw_payload?.signature_scene_brief
      || chapter?.raw_payload?.signatureSceneBrief,
  )
}

export function buildSignatureSceneSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const signatureSceneBrief = signatureSceneBriefFromContext(contextPackage, chapter)
  const planned = [
    normalizeSignatureSceneSyncBeat('signature_scene', '标志性场面', signatureSceneBrief?.signature_scene, 58),
    normalizeSignatureSceneSyncBeat('scene_repair_target', '补位目标', signatureSceneBrief?.scene_repair_target, 50),
    normalizeSignatureSceneSyncBeat('reader_payoff', '读者回报', signatureSceneBrief?.reader_payoff, 42),
    normalizeSignatureSceneSyncBeat('storyline_service', '剧情线服务', signatureSceneBrief?.storyline_service, 50),
  ].filter(Boolean)

  if (!planned.length) {
    return {
      report_id: `signature-scene-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
      chapter_id: chapter?.id || null,
      chapter_no: chapter?.chapter_no || null,
      score: null,
      status: 'ok',
      label: '强场面未计划',
      summary: '本章没有明确标志性强场面补位任务，不做兑现复盘。',
      planned_count: 0,
      missed_count: 0,
      planned: [],
      delivered: [],
      missed: [],
      next_actions: ['后续如近10章强场面覆盖不足，先在滚动规划和开写任务书中补标志性场面。'],
    }
  }

  const rawChecked = planned.map(item => signatureSceneSyncBeatMatch(item, chapterText))
  const signatureDelivered = rawChecked.some(item => item.key === 'signature_scene' && item.delivered)
  const checked = rawChecked.map(item => {
    if (item.key !== 'scene_repair_target' || item.delivered || !signatureDelivered) return item
    return {
      ...item,
      score: Math.max(Number(item.score || 0), 80),
      evidence: ['标志性场面已落地'],
      delivered: true,
    }
  })
  const delivered = checked.filter(item => item.delivered)
  const missed = checked.filter(item => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round((delivered.length / planned.length) * 100)))
  const signatureSceneMissed = missed.some(item => item.key === 'signature_scene')
  const status = signatureSceneMissed || missedCount > 0 || score < 78 ? 'warn' : 'ok'

  return {
    report_id: `signature-scene-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: status === 'ok' ? '强场面 OK' : `强场面漏写 ${missedCount}`,
    summary: status === 'ok'
      ? '本章开写任务书里的标志性场面、补位目标、读者回报和剧情线服务已基本落地。'
      : `标志性强场面补位有 ${missedCount} 项未在正文中充分兑现。`,
    planned_count: planned.length,
    missed_count: missedCount,
    planned,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持强场面补位从滚动规划到正文交稿的兑现闭环。']
      : [
          '下一次修订优先补回开写任务书指定的标志性场面，把它写成可视化动作、空间冲突、规则代价或公开反转。',
          '不要只补气氛描写；必须让 scene_repair_target、reader_payoff 和 storyline_service 在正文事件中可见。',
      ],
  }
}

