import {
  evaluateLaunchpadReadiness,
  extractLaunchpadFieldsFromSeed,
  type LaunchpadReadiness,
} from '../../components/novel-entry/launchpadModel'

export type NovelLobbyActionKind = 'hook' | 'first30' | 'longform' | 'write' | 'planning'

export interface NovelLobbyProjectCard {
  project: any
  chapterCount: number
  writtenWords: number
  writtenWordsLabel: string
  nextAction: string
  actionKind: NovelLobbyActionKind
  riskTags: string[]
  statusLabel: string
}

export interface NovelLobbyGovernanceCard {
  project: any
  title: string
  description: string
  actionLabel: string
  actionKind: NovelLobbyActionKind
  riskTags: string[]
}

export interface NovelLobbyModel {
  featuredProject: NovelLobbyProjectCard | null
  governanceCards: NovelLobbyGovernanceCard[]
  projectCards: NovelLobbyProjectCard[]
}

type AnyRecord = Record<string, any>

function asObject(value: any): AnyRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function asFiniteNumber(value: any) {
  const normalized = Number(value)
  return Number.isFinite(normalized) && normalized > 0 ? normalized : 0
}

function firstText(...values: any[]) {
  return values.map(value => String(value || '').trim()).find(Boolean) || ''
}

function hasText(value: any) {
  return firstText(value).length > 0
}

function getSeed(project: AnyRecord) {
  return asObject(asObject(project.reference_config).project_seed)
}

function inferReadiness(project: AnyRecord, seed: AnyRecord) {
  const fields = extractLaunchpadFieldsFromSeed(seed)
  return evaluateLaunchpadReadiness(fields, seed, firstText(project.length_target))
}

function inferRiskTags(readiness: LaunchpadReadiness) {
  const risks: string[] = []

  if (!readiness.sellable.ready) risks.push('缺读者承诺')
  if (!readiness.first30.ready) risks.push('缺前30章计划')
  if (!readiness.longform.ready) risks.push('缺长线承载')

  return risks.length > 0 ? risks : ['规划可继续']
}

function inferAction(seed: AnyRecord, readiness: LaunchpadReadiness, chapterCount: number) {
  if (!readiness.sellable.ready) {
    return { actionKind: 'hook' as const, nextAction: '补商业钩子' }
  }

  if (!readiness.first30.ready) {
    return { actionKind: 'first30' as const, nextAction: '完善前30章启动计划' }
  }

  if (!readiness.longform.ready) {
    return { actionKind: 'longform' as const, nextAction: '补长线承载' }
  }

  if (chapterCount > 0) {
    return { actionKind: 'write' as const, nextAction: `继续第${chapterCount + 1}章` }
  }

  return {
    actionKind: 'planning' as const,
    nextAction: firstText(seed.first_writing_task, '进入故事规划'),
  }
}

function formatWrittenWords(writtenWords: number) {
  if (writtenWords <= 0) return '未统计'
  if (writtenWords >= 10000) return `${(writtenWords / 10000).toFixed(1)}万字`
  return `${writtenWords}字`
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    active: '连载中',
    completed: '已完结',
    draft: '草稿',
    paused: '暂停',
    archived: '归档',
  }

  return labels[status] || firstText(status, '未标记')
}

function buildProjectCard(projectValue: any): NovelLobbyProjectCard {
  const project = asObject(projectValue)
  const seed = getSeed(project)
  const chapterCount = asFiniteNumber(project.chapter_count)
  const writtenWords = asFiniteNumber(project.written_words)
  const readiness = inferReadiness(project, seed)
  const riskTags = inferRiskTags(readiness)
  const action = inferAction(seed, readiness, chapterCount)

  return {
    project: projectValue,
    chapterCount,
    writtenWords,
    writtenWordsLabel: formatWrittenWords(writtenWords),
    nextAction: action.nextAction,
    actionKind: action.actionKind,
    riskTags,
    statusLabel: statusLabel(firstText(project.status)),
  }
}

function actionRank(actionKind: NovelLobbyActionKind) {
  const ranks: Record<NovelLobbyActionKind, number> = {
    write: 5,
    first30: 4,
    longform: 3,
    hook: 2,
    planning: 1,
  }

  return ranks[actionKind]
}

function compareFeaturedProject(left: NovelLobbyProjectCard, right: NovelLobbyProjectCard) {
  const actionDelta = actionRank(right.actionKind) - actionRank(left.actionKind)
  if (actionDelta !== 0) return actionDelta
  return right.chapterCount - left.chapterCount
}

function buildGovernanceCard(card: NovelLobbyProjectCard): NovelLobbyGovernanceCard {
  const title = firstText(card.project?.title, '未命名作品')
  const details = [
    card.statusLabel,
    card.chapterCount > 0 ? `${card.chapterCount}章` : '未开写',
    card.writtenWordsLabel,
  ]

  return {
    project: card.project,
    title,
    description: details.join(' / '),
    actionLabel: card.actionKind === 'planning' && card.riskTags.includes('规划可继续')
      ? '进入故事规划'
      : card.nextAction,
    actionKind: card.actionKind,
    riskTags: card.riskTags,
  }
}

function isProjectLike(project: any) {
  if (!project || typeof project !== 'object' || Array.isArray(project)) return false

  const record = asObject(project)
  const id = Number(record.id)

  return Number.isFinite(id)
    || hasText(record.title)
    || record.reference_config != null
    || record.chapter_count != null
}

export function buildNovelLobbyModel(projects: any[]): NovelLobbyModel {
  const validProjects = Array.isArray(projects) ? projects.filter(isProjectLike) : []
  const projectCards = validProjects.map(buildProjectCard)
  const featuredProject = [...projectCards].sort(compareFeaturedProject)[0] || null

  return {
    featuredProject,
    governanceCards: projectCards.slice(0, 6).map(buildGovernanceCard),
    projectCards,
  }
}
