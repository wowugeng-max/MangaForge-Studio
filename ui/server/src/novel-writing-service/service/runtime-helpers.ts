import { safeJsonStringify } from '../quality/paragraph-prose-context'

export function buildHeuristicSettingUsage(chapter: any, settings: any[]) {
  const chapterText = [
    chapter.title,
    chapter.chapter_goal,
    chapter.chapter_summary,
    chapter.conflict,
    chapter.ending_hook,
    safeJsonStringify(chapter.raw_payload || {}, undefined, 0),
  ].join(' ')
  return settings.map((setting: any) => {
    const settingText = [
      setting.name,
      setting.summary,
      JSON.stringify(setting.constraints_json || {}),
      JSON.stringify(setting.state_json || {}),
    ].join(' ')
    let score = 0
    const name = String(setting.name || '')
    if (name && chapterText.includes(name)) score += 40
    for (const token of settingText.split(/[\s,，。；;、/|]+/).filter(item => item.length >= 2).slice(0, 50)) {
      if (chapterText.includes(token)) score += 2
    }
    if (['character', 'boss', 'rule'].includes(setting.entity_type)) score += 4
    if (['ability', 'item', 'foreshadowing'].includes(setting.entity_type)) score += 2
    return { setting, score }
  })
    .filter(item => item.score >= 6)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map(({ setting, score }, index) => ({
      entity_id: setting.id,
      usage_type: index < 4 || score >= 30 ? 'required' : 'allowed',
      required: index < 4 || score >= 30,
      allowed: true,
      forbidden: false,
      reveal_level: setting.visibility === 'hidden' || setting.visibility === 'spoiler' ? 'hint' : 'partial',
      expected_state_change: { reason: `生成前自动匹配：与本章目标/摘要/冲突相似度 ${score}` },
    }))
}

export function selectProseForChapter(payload: any, chapter: any) {
  const targetNo = Number(chapter?.chapter_no || 0)
  const proseArr = Array.isArray(payload?.prose_chapters) ? payload.prose_chapters : []
  const matched = proseArr.find((item: any) => Number(item?.chapter_no || 0) === targetNo)
  if (matched) return matched
  if (proseArr.length === 1) {
    const onlyNo = Number(proseArr[0]?.chapter_no || 0)
    if (!onlyNo || onlyNo === targetNo) return proseArr[0]
    throw new Error(`模型返回的正文章节与目标不一致：目标第${targetNo}章，返回第${onlyNo}章`)
  }
  if (proseArr.length > 1) {
    const foundNos = proseArr.map((item: any) => item?.chapter_no).filter(Boolean).join('、') || '无'
    throw new Error(`模型返回的正文章节与目标不一致：目标第${targetNo}章，返回章节号为：${foundNos}`)
  }
  const topLevelNo = Number(payload?.chapter_no || 0)
  if (topLevelNo && topLevelNo !== targetNo) {
    throw new Error(`模型返回的正文章节与目标不一致：目标第${targetNo}章，返回第${topLevelNo}章`)
  }
  return payload || {}
}

export function throwIfAborted(options: any = {}) {
  if (options?.abortSignal?.aborted || options?.signal?.aborted) {
    throw Object.assign(new Error('Request canceled'), { code: 'REQUEST_CANCELED' })
  }
}

export function isAbortError(error: any) {
  const message = String(error?.message || error || '').toLowerCase()
  return error?.code === 'REQUEST_CANCELED'
    || error?.name === 'AbortError'
    || message.includes('request canceled')
    || message.includes('aborted')
    || message.includes('abort')
}
