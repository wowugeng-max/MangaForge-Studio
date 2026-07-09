function asArray(value: any): any[] {
  return Array.isArray(value) ? value : []
}

function compactBriefText(value: any, fallback = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim()
}

function normalizeChapterTitleForUniqueness(title: string) {
  return String(title || '')
    .replace(/^第[一二三四五六七八九十百千万两0-9]+章[\s：:《「【_ -]*/, '')
    .replace(/[《》「」【】\[\]（）()_\-\s]/g, '')
    .trim()
}

export function buildChapterTitleUniquenessReport(chapters: any[] = [], currentChapter: any = {}) {
  const normalizedTitle = normalizeChapterTitleForUniqueness(currentChapter?.title)
  const currentId = currentChapter?.id
  const currentNo = Number(currentChapter?.chapter_no || 0)
  if (!normalizedTitle) {
    return {
      status: 'warn',
      normalized_title: '',
      duplicates: [],
      fix: '本章标题为空，需按本章核心事件、冲突或章尾钩子命名。',
    }
  }

  const duplicates = asArray(chapters)
    .filter((item: any) => {
      if (currentId != null && item?.id === currentId) return false
      if (currentId == null && currentNo > 0 && Number(item?.chapter_no || 0) === currentNo) return false
      return normalizeChapterTitleForUniqueness(item?.title) === normalizedTitle
    })
    .map((item: any) => ({
      id: item?.id || null,
      chapter_no: Number(item?.chapter_no || 0) || null,
      title: String(item?.title || ''),
    }))

  return {
    status: duplicates.length ? 'warn' : 'ok',
    normalized_title: normalizedTitle,
    duplicates,
    fix: duplicates.length
      ? '标题与既有章节重复，需按本章核心事件、冲突转折、关键资产或章尾钩子改名，并同步章节标题。'
      : '',
  }
}

export function buildChapterTitleUniquenessSyncReport(chapters: any[] = [], currentChapter: any = {}) {
  const report = buildChapterTitleUniquenessReport(chapters, currentChapter)
  const duplicates = asArray(report.duplicates).map((item: any) => ({
    id: item?.id || null,
    chapter_no: Number(item?.chapter_no || 0) || null,
    title: String(item?.title || ''),
  }))
  const missingTitle = !String(report.normalized_title || '').trim()
  const missed = missingTitle
    ? [{
        chapter_no: Number(currentChapter?.chapter_no || 0) || null,
        title: String(currentChapter?.title || ''),
        issue: '本章标题为空或无法用于去重。',
      }]
    : duplicates
  const missedCount = missed.length
  const ok = String(report.status || '').toLowerCase() === 'ok' && missedCount === 0
  const nextActions = ok
    ? ['保持章节标题与本章核心事件、冲突转折、关键资产或章尾钩子一致，后续章节继续避免复用同名标题。']
    : [report.fix || '下一章必须先修标题：按本章核心事件、冲突转折、关键资产或章尾钩子改名，并同步章节标题。']
  return {
    report_id: 'chapter_title_uniqueness_sync',
    chapter_id: currentChapter?.id || null,
    chapter_no: Number(currentChapter?.chapter_no || 0) || null,
    status: ok ? 'ok' : 'warn',
    label: ok ? '章节标题去重 OK' : `章节标题重复 ${Math.max(1, missedCount)}`,
    summary: ok
      ? '本章标题未与既有章节重复。'
      : missingTitle
        ? '本章标题为空，无法形成可追踪的章节识别。'
        : `本章标题与既有章节重复 ${duplicates.length} 项。`,
    normalized_title: report.normalized_title || '',
    planned: [{
      key: 'chapter_title_unique',
      label: '章节标题唯一',
      text: '章节标题必须能区分本章核心事件、冲突转折、关键资产或章尾钩子。',
    }],
    delivered: ok ? [{
      chapter_no: Number(currentChapter?.chapter_no || 0) || null,
      title: String(currentChapter?.title || ''),
      normalized_title: report.normalized_title || '',
    }] : [],
    duplicates,
    missed,
    missed_count: Math.max(0, missedCount),
    next_actions: nextActions,
  }
}

export function buildGeneratedChapterTitlePatch(currentChapter: any = {}, titleUniquenessReport: any = {}, generatedTitle: any = '') {
  if (String(titleUniquenessReport?.status || '').toLowerCase() !== 'warn') return {}
  const title = compactBriefText(generatedTitle)
  if (!title) return {}
  const currentNormalized = normalizeChapterTitleForUniqueness(currentChapter?.title)
  const generatedNormalized = normalizeChapterTitleForUniqueness(title)
  if (!generatedNormalized || generatedNormalized === currentNormalized) return {}
  const duplicateNormalized = new Set(asArray(titleUniquenessReport?.duplicates).map((item: any) => normalizeChapterTitleForUniqueness(item?.title)).filter(Boolean))
  if (duplicateNormalized.has(generatedNormalized)) return {}
  return { title }
}
