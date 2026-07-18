import {
  buildDeepDraftReviewModel,
  repairDeepDraftReviewModelGaps,
} from '../deepDraftReviewModel'
import { GENRES, LENGTH_TARGETS } from './createWizardOptions'

function asStringArray(value: any): string[] {
  if (!Array.isArray(value)) return []
  return value.map(item => String(item || '').trim()).filter(Boolean)
}

function firstText(...values: any[]) {
  return values.map(value => String(value || '').trim()).find(Boolean) || ''
}

function asObject(value: any) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function buildDeepDraftReviewForUi(seed: any) {
  const model = buildDeepDraftReviewModel(seed)
  return repairDeepDraftReviewModelGaps(model, seed)
}

function inferGenreFromText(text: string) {
  if (/修仙|仙门|仙道|天尊|长生|古神|外神|神祇|王朝|皇子/.test(text)) return '仙侠'
  if (/异能|灵气|武魂|斗气|神魔|玄幻/.test(text)) return '玄幻'
  if (/都市|公司|学校|职场/.test(text)) return '都市'
  if (/末世|丧尸|灾变/.test(text)) return '末世'
  if (/星际|飞船|AI|人工智能|科幻/.test(text)) return '科幻'
  if (/悬疑|推理|凶案|诡案/.test(text)) return '悬疑'
  return ''
}

function normalizeProjectSeedForUi(payload: any) {
  const root = asObject(payload)
  const rawPayload = asObject(root.raw_payload)
  const source = [root.project_seed, root.seed, root.project, root.novel_project, root.data, root.result, root, rawPayload]
    .map(asObject)
    .find(item => firstText(item.title, item.project_title, item.book_title, item.synopsis, item.summary, item.logline, item.core_premise) || item.worldbuilding || item.protagonist) || root
  const masterOutline = asObject(source.master_outline || root.master_outline || rawPayload.master_outline)
  const rawText = `${JSON.stringify(root).slice(0, 5000)} ${String(root.raw_idea || '').slice(0, 5000)}`
  const commercial = asObject(source.commercial_positioning || root.commercial_positioning || rawPayload.commercial_positioning)
  const worldbuilding = asObject(source.worldbuilding || root.worldbuilding || rawPayload.worldbuilding)
  const plotEngine = asObject(source.plot_engine || root.plot_engine || rawPayload.plot_engine)
  return {
    ...source,
    title: firstText(source.title, source.project_title, source.book_title, source.name, source.working_title, masterOutline.title),
    genre: firstText(source.genre, source.main_genre, source.category, inferGenreFromText(rawText)),
    sub_genres: asStringArray(source.sub_genres).length ? asStringArray(source.sub_genres) : asStringArray(source.genre_tags || source.tags),
    target_audience: firstText(source.target_audience, source.audience, commercial.platform),
    length_target: firstText(source.length_target, source.length, 'medium'),
    style_tags: asStringArray(source.style_tags).length ? asStringArray(source.style_tags) : asStringArray(source.tone_tags),
    commercial_tags: asStringArray(source.commercial_tags).length ? asStringArray(source.commercial_tags) : asStringArray(commercial.selling_points || commercial.tropes),
    synopsis: firstText(source.synopsis, source.project_summary, source.summary, masterOutline.summary, commercial.reader_promise, source.core_premise, source.logline),
    logline: firstText(source.logline, source.hook, masterOutline.hook, commercial.reader_promise),
    core_premise: firstText(source.core_premise, source.premise, source.setting, source.summary, masterOutline.summary),
    main_conflict: firstText(source.main_conflict, source.conflict, plotEngine.long_term_goal, masterOutline.hook),
    protagonist: asObject(source.protagonist || root.protagonist || rawPayload.protagonist),
    antagonist: asObject(source.antagonist || root.antagonist || rawPayload.antagonist),
    worldbuilding,
    plot_engine: plotEngine,
    writing_bible: asObject(source.writing_bible || root.writing_bible || rawPayload.writing_bible),
    volume_outlines: Array.isArray(source.volume_outlines) ? source.volume_outlines : (Array.isArray(root.volume_outlines) ? root.volume_outlines : (Array.isArray(rawPayload.volume_outlines) ? rawPayload.volume_outlines : [])),
    chapter_outlines: Array.isArray(source.chapter_outlines) ? source.chapter_outlines : (Array.isArray(root.chapter_outlines) ? root.chapter_outlines : (Array.isArray(rawPayload.chapter_outlines) ? rawPayload.chapter_outlines : [])),
    foreshadowing_plan: Array.isArray(source.foreshadowing_plan) ? source.foreshadowing_plan : (Array.isArray(root.foreshadowing_plan) ? root.foreshadowing_plan : (Array.isArray(rawPayload.foreshadowing_plan) ? rawPayload.foreshadowing_plan : [])),
    characters: Array.isArray(source.characters) ? source.characters : (Array.isArray(root.characters) ? root.characters : (Array.isArray(rawPayload.characters) ? rawPayload.characters : [])),
    open_questions: asStringArray(source.open_questions).length ? asStringArray(source.open_questions) : (asStringArray(source.questions).length ? asStringArray(source.questions) : asStringArray(rawPayload.open_questions || rawPayload.questions)),
    next_steps: asStringArray(source.next_steps).length ? asStringArray(source.next_steps) : (asStringArray(source.suggested_next_steps).length ? asStringArray(source.suggested_next_steps) : asStringArray(rawPayload.next_steps || rawPayload.suggested_next_steps)),
    raw_payload: root.raw_payload || root,
  }
}

function normalizeLengthTarget(value: any) {
  const raw = String(value || '').trim()
  return LENGTH_TARGETS.some(item => item.value === raw) ? raw : 'medium'
}

function pickGenre(value: any) {
  const raw = String(value || '').trim()
  if (GENRES.some(item => item.value === raw)) return raw
  const matched = GENRES.find(item => raw.includes(item.value))
  return matched?.value || raw || '其他'
}

function seedDiagnosticsNeedReview(value: any) {
  const status = String(value?.status || '').trim()
  return status === 'needs_author_review' || status === 'needs_model_expansion'
}

