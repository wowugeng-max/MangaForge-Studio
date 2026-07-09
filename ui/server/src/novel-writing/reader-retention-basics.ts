import { anchorMatchScore } from './text-matching'

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value === undefined || value === null || value === '') return []
  return [value]
}

function compactText(value: any, limit = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

function firstDefined(...values: any[]) {
  return values.find(value => value !== undefined && value !== null && value !== '')
}

export function normalizeRetentionBeat(key: string, label: string, value: any, matchScope: 'opening' | 'tail' | 'full' = 'full') {
  const text = compactText(value, 180)
  return text ? { key, label, text, match_scope: matchScope } : null
}

export function retentionBeatMatch(beat: any, chapterText: string) {
  const scopedText = beat.match_scope === 'opening'
    ? chapterText.slice(0, 900)
    : beat.match_scope === 'tail'
      ? chapterText.slice(-1200)
      : chapterText
  const match = anchorMatchScore(beat.text, scopedText)
  const threshold = beat.match_scope === 'tail' ? 48 : 44
  return {
    ...beat,
    score: match.score,
    evidence: match.matched,
    delivered: match.score >= threshold,
  }
}

export function normalizeHookAddictionModelCheck(value: any, chapterText: string) {
  const raw = typeof value === 'string' ? { trigger: value } : (value || {})
  const steps = [
    { step: 'trigger', label: '触发', text: compactText(firstDefined(raw.trigger, raw.desire, raw.want, raw.opening_hook), 180) },
    { step: 'action', label: '行动', text: compactText(firstDefined(raw.action, raw.simple_action, raw.scene_action), 180) },
    { step: 'reward', label: '奖励', text: compactText(firstDefined(raw.reward, raw.surprising_reward, raw.random_reward, raw.payoff), 180) },
    { step: 'investment', label: '投入', text: compactText(firstDefined(raw.investment, raw.reader_investment, raw.asset, raw.status_change), 180) },
  ]
  if (!steps.some(item => item.text)) return null

  const checked = steps.map(item => {
    if (!item.text) {
      return {
        ...item,
        score: 0,
        evidence: [],
        delivered: false,
      }
    }
    const match = anchorMatchScore(item.text, chapterText)
    return {
      ...item,
      score: match.score,
      evidence: match.matched,
      delivered: match.score >= 58,
    }
  })
  const deliveredSteps = checked.filter(item => item.delivered)
  const missedSteps = checked.filter(item => !item.delivered)
  const delivered = missedSteps.length === 0

  return {
    key: 'hook_addiction_model',
    label: 'Hook上瘾模型',
    text: '触发 -> 行动 -> 奖励 -> 投入',
    match_scope: 'full',
    score: delivered ? 90 : Math.round((deliveredSteps.length / checked.length) * 100),
    evidence: checked.flatMap(item => asArray(item.evidence)).slice(0, 12),
    delivered,
    steps: checked,
    missed_steps: missedSteps.map(item => item.label),
    missed_items: missedSteps.map(item => item.text || item.label),
  }
}

export function normalizeRetentionDoubleEngineCheck(value: any, chapterText: string) {
  const raw = typeof value === 'string' ? { emotion_engine: value } : (value || {})
  const engines = [
    { step: 'emotion_engine', label: '情绪引擎', text: compactText(firstDefined(raw.emotion_engine, raw.emotionEngine, raw.emotion, raw.reader_emotion), 180) },
    { step: 'hunger_engine', label: '饥饿引擎', text: compactText(firstDefined(raw.hunger_engine, raw.hungerEngine, raw.hunger, raw.information_gap), 180) },
    { step: 'onion_layers', label: '剥洋葱', text: compactText(firstDefined(raw.onion_layers, raw.onionLayers, raw.onion, raw.layered_question), 220) },
  ]
  if (!engines.some(item => item.text)) return null
  const checked = engines.map(item => {
    if (!item.text) {
      return {
        ...item,
        score: 0,
        evidence: [],
        delivered: false,
      }
    }
    const match = anchorMatchScore(item.text, chapterText)
    return {
      ...item,
      score: match.score,
      evidence: match.matched,
      delivered: match.score >= 58,
    }
  })
  const deliveredEngines = checked.filter(item => item.delivered)
  const missedEngines = checked.filter(item => !item.delivered)
  const delivered = missedEngines.length === 0
  return {
    key: 'retention_double_engine',
    label: '留存双引擎',
    text: '情绪 + 饥饿',
    match_scope: 'full',
    score: delivered ? 90 : Math.round((deliveredEngines.length / checked.length) * 100),
    evidence: checked.flatMap(item => asArray(item.evidence)).slice(0, 12),
    delivered,
    steps: checked,
    missed_steps: missedEngines.map(item => item.label),
    missed_items: missedEngines.map(item => item.text || item.label),
  }
}

export function normalizeRetentionPillarsCheck(value: any, chapterText: string) {
  const raw = typeof value === 'string' ? { goal_stack: value } : (value || {})
  const pillars = [
    { step: 'upgrade', label: '升级', text: compactText(firstDefined(raw.upgrade, raw.growth, raw.level_up, raw.levelUp), 180) },
    { step: 'resource_pressure', label: '资源困境', text: compactText(firstDefined(raw.resource_pressure, raw.resourcePressure, raw.resource_dilemma, raw.resourceDilemma), 180) },
    { step: 'goal_stack', label: '目标', text: compactText(firstDefined(raw.goal_stack, raw.goalStack, raw.goals), 220) },
    { step: 'mystery_unlock', label: '解密', text: compactText(firstDefined(raw.mystery_unlock, raw.mysteryUnlock, raw.decryption), 180) },
  ].filter(item => Boolean(item.text))
  if (!pillars.length) return null
  const checked = pillars.map(item => {
    const match = anchorMatchScore(item.text, chapterText)
    return {
      ...item,
      score: match.score,
      evidence: match.matched,
      delivered: match.score >= 48,
    }
  })
  const deliveredPillars = checked.filter(item => item.delivered)
  const missedPillars = checked.filter(item => !item.delivered)
  const requiredCount = Math.min(2, checked.length)
  const delivered = deliveredPillars.length >= requiredCount
  return {
    key: 'retention_pillars',
    label: '留存四大支柱',
    text: '升级、资源困境、目标、解密',
    match_scope: 'full',
    score: checked.length ? Math.round((deliveredPillars.length / checked.length) * 100) : 0,
    evidence: checked.flatMap(item => asArray(item.evidence)).slice(0, 12),
    delivered,
    steps: checked,
    missed_steps: missedPillars.map(item => item.label),
    missed_items: missedPillars.map(item => item.text || item.label),
  }
}
