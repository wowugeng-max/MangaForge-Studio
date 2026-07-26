import { asArray } from '../routes/novel-route-utils'
import { GENRE_PROSE_CARDS, type GenreProseCardData } from './genre-prose-cards-data'

export type GenreProseCard = {
  id: string
  title: string
  aliases: string[]
  confidence: '高' | '中' | '低'
  core: string
  main_goal: string
  conflict_engine: string
  payoff_focus: string
  emotion_chain: string
  scene_grain: string
  prose_landing: string
  phase_play: string
  forbidden_drift: string
  opening_hook?: string
  dialogue_voice?: string
  ending_hook?: string
  chapter_tradeoff?: string
  rhythm_density?: string
  source_file?: string
  platform?: string
}

function asCard(row: GenreProseCardData): GenreProseCard {
  return {
    id: row.id,
    title: row.title,
    aliases: [...row.aliases],
    confidence: row.confidence as GenreProseCard['confidence'],
    core: row.core,
    main_goal: row.main_goal,
    conflict_engine: row.conflict_engine,
    payoff_focus: row.payoff_focus,
    emotion_chain: row.emotion_chain,
    scene_grain: row.scene_grain,
    prose_landing: row.prose_landing,
    phase_play: row.phase_play,
    forbidden_drift: row.forbidden_drift,
    opening_hook: row.opening_hook,
    dialogue_voice: row.dialogue_voice,
    ending_hook: row.ending_hook,
    chapter_tradeoff: row.chapter_tradeoff,
    rhythm_density: row.rhythm_density,
    source_file: row.source_file,
    platform: row.platform,
  }
}

function normalize(value: any) {
  return String(value || '').toLowerCase().replace(/\s+/g, '')
}

export function listGenreProseCards() {
  return GENRE_PROSE_CARDS.map(asCard)
}

export function matchGenreProseCard(input: any = {}): GenreProseCard | null {
  const blob = normalize([
    input.genre,
    input.title,
    input.tags,
    asArray(input.genre_tags || input.genreTags).join(' '),
    input.summary,
  ].join(' '))
  if (!blob) return null
  let best: { card: GenreProseCard; score: number } | null = null
  for (const raw of GENRE_PROSE_CARDS) {
    const card = asCard(raw)
    let score = 0
    if (blob.includes(normalize(card.title))) score += 6
    for (const alias of card.aliases) {
      if (blob.includes(normalize(alias))) score += 3
    }
    // confidence tie-break
    if (card.confidence === '高') score += 0.2
    if (score > 0 && (!best || score > best.score)) best = { card, score }
  }
  return best?.card || null
}

export function buildGenreProseCardContract(input: any = {}) {
  const card = matchGenreProseCard(input)
  if (!card) {
    return {
      version: 'oh_story_genre_prose_card_v1',
      matched: false,
      card: null,
      quality_checks: ['未匹配到题材散文卡，写作前需人工确认题材落点'],
      corpus_size: GENRE_PROSE_CARDS.length,
    }
  }
  return {
    version: 'oh_story_genre_prose_card_v1',
    matched: true,
    card,
    corpus_size: GENRE_PROSE_CARDS.length,
    quality_checks: [
      `正文必须服务题材核心：${card.core.slice(0, 120)}`,
      `冲突发动机：${card.conflict_engine}`,
      `爽点定位：${card.payoff_focus}`,
      `禁止漂移：${card.forbidden_drift}`,
      card.chapter_tradeoff ? `本章取舍：${card.chapter_tradeoff}` : '',
    ].filter(Boolean),
  }
}

export function formatGenreProseCardPrompt(contract: any = {}, options: { compact?: boolean } = {}) {
  const card = contract?.card
  if (!card) return '【题材散文卡】未匹配，保持通用网文工艺，不套机械模板。'
  if (options.compact) {
    return [
      '【oh-story 题材散文卡】',
      `题材: ${card.title}（${card.confidence}）`,
      `核心: ${String(card.core || '').slice(0, 180)}`,
      `冲突: ${card.conflict_engine}`,
      `落点: ${card.prose_landing}`,
      `禁止: ${card.forbidden_drift}`,
    ].join('\n')
  }
  return [
    '【oh-story 题材散文卡】',
    `题材: ${card.title}（置信度${card.confidence}；平台${card.platform || '通用'}）`,
    `核心: ${card.core}`,
    `冲突发动机: ${card.conflict_engine}`,
    `爽点/情绪: ${card.payoff_focus}`,
    `场景颗粒: ${card.scene_grain}`,
    `正文落点: ${card.prose_landing}`,
    `开场抓手: ${card.opening_hook || ''}`,
    `章尾钩子: ${card.ending_hook || ''}`,
    `前中后期: ${card.phase_play}`,
    `节奏密度: ${card.rhythm_density || ''}`,
    `本章取舍: ${card.chapter_tradeoff || ''}`,
    `禁止漂移: ${card.forbidden_drift}`,
    '约束: 题材卡只用于内部校准，不得把卡名/置信度/证据摘要写进正文。',
  ].filter(Boolean).join('\n')
}
