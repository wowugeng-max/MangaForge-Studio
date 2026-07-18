import {
  anchorMatchScore,
  normalizedMatchText,
} from '../../novel-writing/text-matching'
import {
  asArray,
  compactText,
} from '../../routes/novel-route-utils'
import {
  compactBriefText,
} from '../quality/text-utils'
import {
  firstDefined,
} from './core-handoff-sync-reports'
import {
  nextBatchBriefFromContext,
  normalizeStoryUnitContext,
} from '../quality/memory-longform-contracts'
import {
  normalizeStoryUnitSyncBeat,
  storyUnitForbiddenTouched,
  storyUnitSyncBeatMatch,
} from '../../novel-writing/story-unit-basics'
import {
  contextWithChapterRawPreDraftForSync,
} from './quality-sync-reports-benchmark'

export function storyUnitContextFromContext(contextPackage: any, chapter: any = {}) {
  const target = contextPackage?.chapter_target || contextPackage?.chapterTarget || {}
  return normalizeStoryUnitContext(
    target?.story_unit_context
      || target?.storyUnitContext
      || contextPackage?.story_unit_context
      || contextPackage?.storyUnitContext
      || contextPackage?.pre_draft_brief?.story_unit_context
      || contextPackage?.pre_draft_brief?.storyUnitContext
      || contextPackage?.preDraftBrief?.story_unit_context
      || contextPackage?.preDraftBrief?.storyUnitContext
      || chapter?.raw_payload?.pre_draft_brief?.story_unit_context
      || chapter?.raw_payload?.pre_draft_brief?.storyUnitContext
      || chapter?.raw_payload?.preDraftBrief?.story_unit_context
      || chapter?.raw_payload?.preDraftBrief?.storyUnitContext
      || chapter?.raw_payload?.story_unit_context
      || chapter?.raw_payload?.storyUnitContext,
    Number(chapter?.chapter_no || target?.chapter_no || target?.chapterNo || 0),
  )
}

export function buildStoryUnitSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const storyUnit = storyUnitContextFromContext(contextPackage, chapter)
  if (!storyUnit) {
    return {
      report_id: `story-unit-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
      chapter_id: chapter?.id || null,
      chapter_no: chapter?.chapter_no || null,
      score: null,
      status: 'ok',
      label: '剧情单元未计划',
      summary: '本章没有明确剧情单元任务，不做单元职责复盘。',
      missed_count: 0,
      rushed_count: 0,
      forbidden_count: 0,
      story_unit: null,
      planned: [],
      delivered: [],
      missed: [],
      rushed_ahead: [],
      forbidden_touched: [],
      next_actions: [],
    }
  }

  const role = compactBriefText(storyUnit.current_chapter_role)
  const roleText = normalizedMatchText(role)
  const roleRequired = [
    /入口|开场|进场/.test(role)
      ? normalizeStoryUnitSyncBeat('entry_hook', '入口钩子', storyUnit.entry_hook || role, 'story_unit', 50)
      : null,
    /高潮|回报|兑现|打脸|结算/.test(role)
      ? normalizeStoryUnitSyncBeat('mini_climax_payoff', '小高潮/回报', storyUnit.mini_climax_payoff || role, 'story_unit', 58)
      : null,
    /出单元|出场|收束|转入|承接下一|下一段/.test(role)
      ? normalizeStoryUnitSyncBeat('exit_hook', '出单元钩子', storyUnit.exit_hook || role, 'story_unit', 58)
      : null,
    /压力|升级|推进|冲突/.test(role)
      ? normalizeStoryUnitSyncBeat('pressure_escalation', '压力升级', asArray(storyUnit.pressure_escalation)[0] || role, 'story_unit', 50)
      : null,
  ].filter(Boolean)
  const fallbackRequired = roleRequired.length
    ? []
    : [
        normalizeStoryUnitSyncBeat('current_chapter_role', '当前职责', role || storyUnit.unit_goal, 'story_unit', 46),
      ].filter(Boolean)
  const setupOptional = asArray(storyUnit.setup_and_storyline)
    .slice(0, 3)
    .map((item: any, index: number) => normalizeStoryUnitSyncBeat(`setup_and_storyline_${index + 1}`, '伏笔/剧情线', item, 'story_unit_setup', 48))
    .filter(Boolean)
  const required = [...roleRequired, ...fallbackRequired]
  const planned = [...required, ...setupOptional]
  const checkedRequired = required.map(item => storyUnitSyncBeatMatch(item, chapterText))
  const checkedOptional = setupOptional.map(item => storyUnitSyncBeatMatch(item, chapterText))
  const delivered = [...checkedRequired, ...checkedOptional].filter(item => item.delivered)
  const missed = checkedRequired.filter(item => !item.delivered)
  const rushCandidates = [
    !/高潮|回报|兑现|打脸|结算/.test(role)
      ? normalizeStoryUnitSyncBeat('mini_climax_payoff', '后段小高潮', storyUnit.mini_climax_payoff, 'story_unit_rush', 58)
      : null,
    !/出单元|收束|转入/.test(role)
      ? normalizeStoryUnitSyncBeat('exit_hook', '出单元钩子', storyUnit.exit_hook, 'story_unit_rush', 58)
      : null,
  ].filter(Boolean)
  const rushedAhead = rushCandidates
    .map(item => storyUnitSyncBeatMatch(item, chapterText))
    .filter(item => item.delivered)
  const forbiddenTouched = asArray(storyUnit.forbidden_advance)
    .slice(0, 6)
    .map((item: any, index: number) => normalizeStoryUnitSyncBeat(`forbidden_advance_${index + 1}`, '禁抢跑', item, 'story_unit_forbidden', 42))
    .filter(Boolean)
    .map(item => storyUnitForbiddenTouched(item, chapterText))
    .filter(item => item.touched)

  const missedCount = missed.length
  const rushedCount = rushedAhead.length
  const forbiddenCount = forbiddenTouched.length
  const status = missedCount || rushedCount || forbiddenCount ? 'warn' : 'ok'
  const score = Math.max(0, Math.min(100, Math.round(100 - missedCount * 24 - rushedCount * 22 - forbiddenCount * 28)))
  const riskParts = [
    missedCount ? `单元漏写 ${missedCount}` : '',
    rushedCount ? `单元抢跑 ${rushedCount}` : '',
    forbiddenCount ? `禁抢跑 ${forbiddenCount}` : '',
  ].filter(Boolean)

  return {
    report_id: `story-unit-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: status === 'ok' ? '剧情单元 OK' : riskParts.join(' · '),
    summary: status === 'ok'
      ? '本章已完成当前剧情单元职责，且未明显提前消费后段小高潮或出单元钩子。'
      : `本章剧情单元职责存在 ${missedCount + rushedCount + forbiddenCount} 项风险。`,
    missed_count: missedCount,
    rushed_count: rushedCount,
    forbidden_count: forbiddenCount,
    story_unit: {
      title: storyUnit.title,
      chapter_range_label: storyUnit.chapter_range_label,
      current_chapter_role: storyUnit.current_chapter_role,
      unit_goal: storyUnit.unit_goal,
    },
    role_key: roleText,
    planned,
    delivered,
    missed,
    rushed_ahead: rushedAhead,
    forbidden_touched: forbiddenTouched,
    next_actions: status === 'ok'
      ? ['保持剧情单元任务书、正文生成和交稿复盘闭环。']
      : [
          '下一次修订优先补足当前剧情单元职责 missed 项，尤其是入口钩子、压力升级或本章回报。',
          '把 rushed_ahead 和 forbidden_touched 中的后段内容改成暗示、误导或延迟兑现，不要在本章提前解决。',
      ],
  }
}

const volumeBeatPattern = /小高潮|中高潮|卷末|高潮|爆点|转折|反转|大回报|强冲突|阶段收束|收束|破局|打脸|揭底|真相|压轴/

export function volumeBeatBriefFromContext(contextPackage: any, chapter: any = {}) {
  const syncContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const target = syncContextPackage?.chapter_target || {}
  const brief = syncContextPackage?.pre_draft_brief || syncContextPackage?.preDraftBrief || {}
  return {
    explicit: target.volume_beat_brief || target.volumeBeatBrief || brief.volume_beat_brief || brief.volumeBeatBrief || {},
    nextBatch: nextBatchBriefFromContext(contextPackage, brief, chapter) || {},
    sceneCards: [
      ...asArray(target.scene_cards || target.sceneCards),
      ...asArray(brief.scene_briefs || brief.sceneBriefs),
    ],
  }
}

export function normalizeVolumeBeat(key: string, label: string, value: any, source = 'volume_beat') {
  const text = compactText(value, 180)
  return text ? { key, label, text, source } : null
}

export function uniqueVolumeBeats(items: any[]) {
  const seen = new Set<string>()
  const rows: any[] = []
  for (const item of items.filter(Boolean)) {
    const key = normalizedMatchText(item.text)
    if (!key || seen.has(key)) continue
    seen.add(key)
    rows.push(item)
  }
  return rows
}

export function volumeBeatMatch(beat: any, chapterText: string) {
  const match = anchorMatchScore(beat.text, chapterText)
  const threshold = beat.key === 'current_chapter_role' ? 44 : 70
  return {
    ...beat,
    score: match.score,
    evidence: match.matched,
    delivered: match.score >= threshold,
  }
}

export function buildVolumeBeatSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const beatContext = volumeBeatBriefFromContext(contextPackage, chapter)
  const currentRole = firstDefined(
    beatContext.explicit.current_chapter_role,
    beatContext.explicit.currentChapterRole,
    beatContext.explicit.chapter_role,
    beatContext.explicit.chapterRole,
    beatContext.nextBatch.current_chapter_role,
    beatContext.nextBatch.currentChapterRole,
  )
  const explicitBeats = [
    normalizeVolumeBeat('volume_goal', '卷级目标', beatContext.explicit.volume_goal || beatContext.explicit.volumeGoal || beatContext.explicit.goal),
    normalizeVolumeBeat('climax_promise', '高潮承诺', beatContext.explicit.climax_promise || beatContext.explicit.climaxPromise || beatContext.explicit.climax),
    ...asArray(beatContext.explicit.required_beats || beatContext.explicit.requiredBeats).map((item: any, index: number) => normalizeVolumeBeat(`required_beat_${index + 1}`, '爆点动作', item)),
  ].filter(Boolean)
  const hasExplicitVolumeBeat = explicitBeats.length > 0 || volumeBeatPattern.test(currentRole)
  const sceneBeats = beatContext.sceneCards.flatMap((card: any, index: number) => {
    const candidates = [
      normalizeVolumeBeat(`turning_point_${index + 1}`, '转折点', card?.turning_point || card?.turningPoint || card?.turn || card?.reversal, 'scene_card'),
      normalizeVolumeBeat(`reader_payoff_${index + 1}`, '读者回报', card?.reader_payoff || card?.readerPayoff || card?.payoff || card?.reader_reward || card?.readerReward, 'scene_card'),
      normalizeVolumeBeat(`ending_hook_${index + 1}`, '钩子推进', card?.ending_hook_seed || card?.endingHookSeed || card?.ending_hook || card?.endingHook, 'scene_card'),
    ].filter(Boolean)
    return hasExplicitVolumeBeat ? candidates : candidates.filter(item => volumeBeatPattern.test(item.text))
  })
  const planned = uniqueVolumeBeats([
    volumeBeatPattern.test(currentRole) ? normalizeVolumeBeat('current_chapter_role', '本章爆点职责', currentRole) : null,
    ...explicitBeats,
    ...sceneBeats,
  ])
  const checked = planned.map(item => volumeBeatMatch(item, chapterText))
  const delivered = checked.filter(item => item.delivered)
  const missed = checked.filter(item => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    planned.length ? (delivered.length / planned.length) * 100 : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'

  return {
    report_id: `volume-beat-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: planned.length === 0 ? '爆点未计划' : status === 'ok' ? '爆点 OK' : `爆点漏兑现 ${missedCount}`,
    summary: planned.length === 0
      ? '本章没有明确卷级高潮或爆点承诺。'
      : status === 'ok'
        ? '本章卷级爆点、转折和读者回报已基本兑现。'
        : `本章有 ${missedCount} 项卷级爆点或小高潮承诺未在正文中充分兑现。`,
    missed_count: missedCount,
    planned,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持卷级爆点预算、章节任务书和正文兑现闭环。']
      : [
          '下一次修订优先补足卷级爆点 missed 项，把小高潮/中高潮/卷末爆点写成可见行动、反转和回报。',
          '如果正文只铺信息没有兑现转折，优先补现场冲突、选择代价、反制结果和章末升级。',
        ],
  }
}

