export interface DeepDraftBasics {
  title: string
  genre: string
  pitch: string
  synopsis: string
}

export interface DeepDraftWorld {
  summary: string
  powerSystem: string
}

export interface DeepDraftCharacter {
  name: string
  role: string
  goal: string
}

export interface DeepDraftVolume {
  title: string
  goal: string
}

export interface DeepDraftChapter {
  chapterNo: number
  title: string
  goal: string
}

export interface DeepDraftContinuity {
  foreshadowing: string
  openQuestions: string
}

export interface DeepDraftReviewModel {
  basics: DeepDraftBasics
  world: DeepDraftWorld
  characters: DeepDraftCharacter[]
  volumes: DeepDraftVolume[]
  chapters: DeepDraftChapter[]
  continuity: DeepDraftContinuity
}

export interface SeedRecoveryDiagnosticsView {
  visible: boolean
  type: 'info' | 'warning' | 'success'
  title: string
  message: string
  retainedFragments: string[]
  missingFields: string[]
  generatedFields: string[]
}

type SeedRecord = Record<string, any>

function asObject(value: any): SeedRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function firstText(...values: any[]) {
  return values.map(value => String(value || '').trim()).find(Boolean) || ''
}

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
}

function stringArray(value: any) {
  return Array.isArray(value) ? value.map(item => String(item || '').trim()).filter(Boolean) : []
}

const PLACEHOLDER_CHARACTER_NAMES = new Set([
  '怎么',
  '如何',
  '什么',
  '为何',
  '为什么',
  '哪里',
  '哪个',
  '这些',
  '已有',
  '根据',
  '主角',
  '反派',
  '阶段对手',
  '竞争者',
  '反派/竞争者',
])

function cleanCharacterName(value: any) {
  const raw = firstText(value)
  if (!raw || PLACEHOLDER_CHARACTER_NAMES.has(raw)) return ''
  if (/^(怎么|如何|什么|为何|为什么|哪里|哪个)/.test(raw)) return ''
  return raw
}

export function buildSeedRecoveryDiagnosticsView(seed: any, responseDiagnostics: any = null): SeedRecoveryDiagnosticsView {
  const responseRecord = asObject(responseDiagnostics)
  const seedRecord = asObject(asObject(seed).seed_diagnostics)
  const diagnostics = Object.keys(responseRecord).length ? responseRecord : seedRecord
  const status = firstText(diagnostics.status)
  if (!status || status === 'ready') {
    return {
      visible: false,
      type: 'success',
      title: '',
      message: '',
      retainedFragments: [],
      missingFields: [],
      generatedFields: [],
    }
  }
  const retainedFragments = stringArray(diagnostics.retained_fragments).slice(0, 4)
  const missingFields = stringArray(diagnostics.missing_fields).slice(0, 8)
  const generatedFields = stringArray(diagnostics.generated_fields).slice(0, 8)
  const isRecovered = status === 'recovered_by_model'
  return {
    visible: true,
    type: isRecovered ? 'info' : 'warning',
    title: isRecovered ? '薄返回已自动补齐为可审阅种子' : '已保留薄返回中的有效材料',
    message: firstText(
      diagnostics.suggestion,
      isRecovered
        ? '模型首轮返回偏薄，系统已保留有效线索并完成二次补种子。'
        : '模型返回偏薄，系统已保留有效信息并生成可编辑草稿，请先审阅补强。',
    ),
    retainedFragments,
    missingFields,
    generatedFields,
  }
}

function joinListItems(value: any, fields: string[]) {
  if (!Array.isArray(value)) return ''
  return value
    .map(item => {
      const record = asObject(item)
      const main = firstText(...fields.map(field => record[field]), item)
      const detail = firstText(record.payoff, record.note, record.summary)
      return detail ? `${main} -> ${detail}` : main
    })
    .filter(Boolean)
    .join('\n')
}

function joinForeshadowingItems(value: any) {
  if (!Array.isArray(value)) return ''
  return value
    .map(item => {
      if (typeof item === 'string') return firstText(item)
      const record = asObject(item)
      const name = firstText(record.name, record.title)
      const plant = firstText(record.plant_at, record.plant_chapter, record.plant)
      const payoff = firstText(record.payoff_at, record.payoff_chapter, record.payoff)
      const description = firstText(record.description, record.surface, record.summary, record.hook)
      const truth = firstText(record.true_meaning, record.truth)
      if (name && (plant || payoff || description)) {
        return [
          name,
          plant ? `埋设：${plant}` : '',
          payoff ? `回收：${payoff}` : '',
          description ? `表层：${description}` : '',
          truth ? `真相：${truth}` : '',
        ].filter(Boolean).join('｜')
      }
      return firstText(description, name, item)
    })
    .filter(Boolean)
    .join('\n')
}

function joinConfirmationItems(value: any) {
  if (!Array.isArray(value)) return ''
  return value
    .map(item => {
      const record = asObject(item)
      const label = firstText(record.label, record.key, record.question)
      const answer = firstText(record.answer, record.suggestion, record.value)
      if (label && answer) return `${label}：${answer}`
      return firstText(record.question, record.answer, item)
    })
    .filter(Boolean)
    .join('\n')
}

function normalizeCharacter(value: any, fallbackRole = ''): DeepDraftCharacter | null {
  const record = asObject(value)
  const rawName = firstText(record.name, record.title)
  if (rawName && !cleanCharacterName(rawName)) return null
  const name = cleanCharacterName(rawName)
  const hasCharacterSignal = firstText(name, record.role_type, record.role, record.identity, record.goal, record.motivation, record.summary, record.pressure)
  if (!hasCharacterSignal) return null
  const role = firstText(record.role_type, record.role, record.identity, fallbackRole)
  const goal = firstText(record.goal, record.motivation, record.summary, record.pressure)
  return { name, role, goal }
}

function characterRecordLooksTemplate(value: any) {
  const record = asObject(value)
  const rawName = firstText(record.name, record.title)
  if (rawName && !cleanCharacterName(rawName)) return true
  const text = firstText(record.role_type, record.role, record.identity, record.goal, record.motivation, record.summary, record.pressure)
  return /反派\/竞争者|阶段对手|阻止主角取得第一阶段真相|破解.+核心规则|待作者审阅补强|由模型二次补种子细化/.test(text)
}

function preferCharacterRecord(primary: any, fallback: any) {
  const primaryRecord = asObject(primary)
  const fallbackRecord = asObject(fallback)
  const primaryName = cleanCharacterName(firstText(primaryRecord.name, primaryRecord.title))
  const fallbackName = cleanCharacterName(firstText(fallbackRecord.name, fallbackRecord.title))
  if (fallbackName && (!primaryName || characterRecordLooksTemplate(primaryRecord))) {
    return { ...primaryRecord, ...fallbackRecord }
  }
  return { ...fallbackRecord, ...primaryRecord }
}

function normalizeVolume(value: any): DeepDraftVolume | null {
  const record = asObject(value)
  const title = firstText(record.title, record.name)
  const goal = firstText(record.goal, record.direction, record.summary, record.note)
  if (!title && !goal) return null
  return { title, goal }
}

function outlineRecordLooksTemplate(value: any, kind: 'volume' | 'chapter') {
  const record = asObject(value)
  const text = firstText(record.title, record.name, record.summary, record.goal, record.chapter_goal, record.synopsis)
  if (!text) return false
  if (/开篇承诺验证|第\d+阶段长线扩容/.test(text)) return true
  if (/异象开端|第\d+章压力升级/.test(text)) return true
  if (/主角在已有线索基础上|围绕.+继续扩展地图/.test(text)) return true
  return kind === 'chapter' && /主角接触.+第一条异常规则/.test(text)
}

function preferOutlineRecords(primary: any, fallback: any, kind: 'volume' | 'chapter') {
  const primaryItems = Array.isArray(primary) ? primary : []
  const fallbackItems = Array.isArray(fallback) ? fallback : []
  if (!primaryItems.length) return fallbackItems
  if (fallbackItems.length && primaryItems.every(item => outlineRecordLooksTemplate(item, kind))) {
    return fallbackItems
  }
  return primaryItems
}

function chapterNo(value: SeedRecord, index: number) {
  const raw = Number(value.chapter_no || value.chapter_number || value.no || value.index)
  return Number.isFinite(raw) && raw > 0 ? raw : index + 1
}

function normalizeChapter(value: any, index: number): DeepDraftChapter | null {
  const record = asObject(value)
  const title = firstText(record.title, record.name, `第${chapterNo(record, index)}章`)
  const goal = firstText(record.chapter_goal, record.goal, record.summary, record.synopsis)
  if (!title && !goal) return null
  return { chapterNo: chapterNo(record, index), title, goal }
}

function mergeIndexedRecords<T extends Record<string, any>>(
  original: any,
  edits: T[],
  normalize: (record: T, base: SeedRecord, index: number) => SeedRecord,
) {
  const originals = Array.isArray(original) ? original.map(asObject) : []
  return edits
    .map((edit, index) => normalize(edit, originals[index] || {}, index))
    .filter(record => Object.values(record).some(value => String(value || '').trim()))
}

function dedupeCharacters(characters: DeepDraftCharacter[]) {
  const seen = new Set<string>()
  return characters.filter(character => {
    const key = firstText(character.name, character.role, character.goal)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function chapterAnchor(chapters: DeepDraftChapter[], index: number, fallbackNo: number) {
  const chapter = chapters[index]
  if (!chapter) return `第${fallbackNo}章`
  return chapter.title ? `第${chapter.chapterNo || fallbackNo}章《${chapter.title}》` : `第${chapter.chapterNo || fallbackNo}章`
}

function buildReviewForeshadowingLines(model: DeepDraftReviewModel, seed: any) {
  const root = asObject(seed)
  const protagonist = model.characters[0]
  const antagonist = model.characters[1]
  const support = model.characters[2]
  const protagonistName = firstText(protagonist?.name, asObject(root.protagonist).name, '主角')
  const antagonistName = firstText(antagonist?.name, asObject(root.antagonist).name, '主要对手')
  const supportName = firstText(support?.name, '关键同伴')
  const title = firstText(model.basics.title, root.title, '本书')
  const ruleName = firstText(model.world.powerSystem, model.world.summary, model.basics.pitch, `${title}核心规则`)
  const worldHook = firstText(model.world.summary, model.basics.synopsis, model.basics.pitch, title)
  const firstVolume = firstText(model.volumes[0]?.title, model.volumes[0]?.goal, '第一卷')
  const secondVolume = firstText(model.volumes[1]?.title, model.volumes[1]?.goal, '第二卷')
  const chapterHooks = model.chapters
    .slice(0, 12)
    .map((chapter, index) => ({
      no: chapter.chapterNo || index + 1,
      title: firstText(chapter.title, `第${chapter.chapterNo || index + 1}章`),
      goal: firstText(chapter.goal, chapter.title, `第${chapter.chapterNo || index + 1}章事件`),
    }))
  const pickChapter = (index: number, fallbackNo: number) => {
    const chapter = chapterHooks[index]
    if (!chapter) return `第${fallbackNo}章`
    return chapter.title ? `第${chapter.no}章《${chapter.title}》` : `第${chapter.no}章`
  }
  const pickGoal = (index: number, fallback: string) => firstText(chapterHooks[index]?.goal, fallback)

  // 基于当前书名/人物/章节生成可编辑草稿，避免固定“异兽/规则异常”词表。
  return [
    [`${title}异常开端`, `${protagonistName}在${pickGoal(0, '开局事件')}中第一次确认${ruleName}与常识冲突。`, `${worldHook}背后另有更大规则层。`],
    [`${protagonistName}的信息差`, `${protagonistName}使用只有自己知道的细节推进局面。`, `${antagonistName}会因此锁定其异常来源。`],
    [`${ruleName}的代价`, `${protagonistName}第一次兑现${ruleName}后留下可见代价。`, '代价会在首卷高潮前集中爆发。'],
    [`${antagonistName}的旧账`, `${antagonistName}对${protagonistName}的反应快得反常。`, `${antagonistName}掌握与${title}相关的旧线索。`],
    [`${supportName}的见证`, `${supportName}记住${protagonistName}一次关键选择。`, '该选择会成为后续立场与冲突证据。'],
    [`${firstVolume}隐藏入口`, pickGoal(3, '中段事件') + '里出现一件未解释的关键物证/地点。', `它通往${secondVolume}的真正入口。`],
    [`错误胜利`, `${protagonistName}靠错误理解取得一次小胜。`, '回收时会证明真正规则更残酷。'],
    [`首卷债务`, `${pickChapter(5, 6)}给出爽点但留下未还清的债务。`, `${firstVolume}结尾必须用更大回报偿还。`],
    [`${title}主线谜面`, `${firstVolume}收束前露出一句只属于${title}的核心真相。`, '这是长线主线的第一行答案。'],
    [`不可回头的选择`, `${protagonistName}在${pickChapter(8, 9)}做出不可逆选择。`, '该选择会改写人物关系与后续地图。'],
  ].map(([name, surface, truth], index) => {
    const plant = pickChapter(index % Math.max(chapterHooks.length, 1), index + 1)
    const payoff = pickChapter(Math.min(index + 4, Math.max(chapterHooks.length - 1, 0)), index + 8)
    return `${name}｜埋设：${plant}｜回收：${payoff}｜表层：${surface}｜真相：${truth}`
  })
}

function buildReviewConfirmationLines(model: DeepDraftReviewModel, seed: any) {
  const root = asObject(seed)
  const protagonist = model.characters[0]
  const protagonistName = firstText(protagonist?.name, asObject(root.protagonist).name, '主角')
  const protagonistGoal = firstText(protagonist?.goal, model.basics.pitch, model.basics.synopsis, `破解${model.basics.title || '本书'}的核心规则`)
  const ruleName = firstText(model.world.powerSystem, model.world.summary, model.basics.pitch, `${model.basics.title || '本书'}核心规则`)
  const firstVolumeGoal = firstText(model.volumes[0]?.goal, model.volumes[0]?.title, '完成第一卷阶段承诺')
  return [
    `最终欲望：${protagonistName}最终想要${protagonistGoal}；道德底线是不主动牺牲无辜者换取升级；不可退让目标是守住知识来源和第一批重要同伴。`,
    `规则代价：${ruleName}每次使用都会增加暴露、反噬或因果债；禁忌是不能无验证地套用旧知识；长期扩容边界是个人破局、残篇、势力、地图和世界真相逐级扩大。`,
    `第一卷爽点回报：${protagonistName}用前文埋下的规则线索完成公开破局，兑现“${firstVolumeGoal}”，同时打开更大地图和更危险敌意。`,
  ]
}

function isConfirmationLine(line: string) {
  return /^(最终欲望|道德底线|不可退让目标|规则代价|禁忌边界|长期扩容边界|第一卷爽点回报|主角底线|首卷回报)[:：]/.test(line.trim())
}

function confirmationLineToRecord(line: string) {
  const [label, ...rest] = line.split(/[:：]/)
  return {
    label: firstText(label, '确认项'),
    answer: rest.join('：').trim() || line,
    source: 'deep_draft_review',
  }
}

function foreshadowingLineToRecord(line: string) {
  const plantAt = line.match(/埋设[:：]\s*([^｜|]+)/)?.[1]?.trim() || ''
  const payoffAt = line.match(/回收[:：]\s*([^｜|]+)/)?.[1]?.trim() || ''
  if (!plantAt && !payoffAt) return { name: line }
  return {
    name: firstText(line.split(/[｜|]/)[0], '伏笔'),
    plant_at: plantAt,
    payoff_at: payoffAt,
    description: line,
    source: 'deep_draft_review',
  }
}

export function repairDeepDraftReviewModelGaps(model: DeepDraftReviewModel, seed: any = {}): DeepDraftReviewModel {
  const foreshadowingLines = splitLines(model.continuity.foreshadowing)
  const questionLines = splitLines(model.continuity.openQuestions)
  const needsConfirmationRepair = questionLines.length === 0 || questionLines.some(line => /^请确认/.test(line))
  return {
    ...model,
    continuity: {
      foreshadowing: foreshadowingLines.length ? model.continuity.foreshadowing : buildReviewForeshadowingLines(model, seed).join('\n'),
      openQuestions: needsConfirmationRepair ? buildReviewConfirmationLines(model, seed).join('\n') : model.continuity.openQuestions,
    },
  }
}

export function buildDeepDraftReviewModel(seed: any): DeepDraftReviewModel {
  const root = asObject(seed)
  const rawPayload = asObject(root.raw_payload)
  const worldbuilding = { ...asObject(rawPayload.worldbuilding), ...asObject(root.worldbuilding) }
  const rawProtagonist = asObject(rawPayload.protagonist)
  const rawAntagonist = asObject(rawPayload.antagonist)
  const rawCharacters = Array.isArray(rawPayload.characters) ? rawPayload.characters : []
  const rawVolumes = Array.isArray(rawPayload.volume_outlines) ? rawPayload.volume_outlines : []
  const rawChapters = Array.isArray(rawPayload.chapter_outlines) ? rawPayload.chapter_outlines : []
  const rawForeshadowing = Array.isArray(rawPayload.foreshadowing_plan) ? rawPayload.foreshadowing_plan : []
  const rawQuestions = Array.isArray(rawPayload.open_questions) ? rawPayload.open_questions : []
  const rawConfirmations = Array.isArray(rawPayload.author_confirmations) ? rawPayload.author_confirmations : []
  const rootCharacters = Array.isArray(root.characters) ? root.characters : []
  const rootCharacterModels = rootCharacters.map(normalizeCharacter).filter(Boolean) as DeepDraftCharacter[]
  const rawCharacterModels = rawCharacters.map(normalizeCharacter).filter(Boolean) as DeepDraftCharacter[]
  const characters = dedupeCharacters([
    normalizeCharacter(preferCharacterRecord(root.protagonist, rawProtagonist), '主角'),
    normalizeCharacter(preferCharacterRecord(root.antagonist, rawAntagonist), '反派'),
    ...(rootCharacterModels.length > 0 ? rootCharacterModels : rawCharacterModels),
  ].filter(Boolean) as DeepDraftCharacter[])
  const volumes = preferOutlineRecords(root.volume_outlines, rawVolumes, 'volume')
  const chapters = preferOutlineRecords(root.chapter_outlines, rawChapters, 'chapter')
  const foreshadowing = Array.isArray(root.foreshadowing_plan) && root.foreshadowing_plan.length > 0 ? root.foreshadowing_plan : rawForeshadowing
  const openQuestions = Array.isArray(root.open_questions) && root.open_questions.length > 0 ? root.open_questions : rawQuestions
  const authorConfirmations = Array.isArray(root.author_confirmations) && root.author_confirmations.length > 0 ? root.author_confirmations : rawConfirmations

  return {
    basics: {
      title: firstText(root.title, root.project_title, root.book_title, rawPayload.title, rawPayload.project_title, rawPayload.book_title),
      genre: firstText(root.genre, root.main_genre, root.category, rawPayload.genre, rawPayload.main_genre, rawPayload.category),
      pitch: firstText(root.logline, root.hook, root.reader_promise, root.core_premise, rawPayload.logline, rawPayload.hook, rawPayload.reader_promise, rawPayload.core_premise),
      synopsis: firstText(root.synopsis, root.project_summary, root.summary, root.core_premise, rawPayload.synopsis, rawPayload.project_summary, rawPayload.summary, rawPayload.core_premise),
    },
    world: {
      summary: firstText(worldbuilding.world_summary, worldbuilding.summary, root.world_summary, root.setting, rawPayload.world_summary, rawPayload.setting),
      powerSystem: firstText(worldbuilding.power_system, root.power_system, root.progression_engine, rawPayload.power_system, rawPayload.progression_engine),
    },
    characters,
    volumes: volumes.map(normalizeVolume).filter(Boolean) as DeepDraftVolume[],
    chapters: chapters.map(normalizeChapter).filter(Boolean) as DeepDraftChapter[],
    continuity: {
      foreshadowing: joinForeshadowingItems(foreshadowing),
      openQuestions: openQuestions.map((item: any) => firstText(item)).filter(Boolean).join('\n') || joinConfirmationItems(authorConfirmations),
    },
  }
}

export function deepDraftReviewModelToSeed(seed: any, model: DeepDraftReviewModel) {
  const root = asObject(seed)
  const characters = model.characters.filter(character => firstText(character.name, character.role, character.goal))
  const protagonist = characters[0]
  const antagonist = characters[1]
  const continuityLines = splitLines(model.continuity.openQuestions)
  const authorConfirmations = continuityLines.filter(isConfirmationLine).map(confirmationLineToRecord)
  const openQuestions = continuityLines.filter(line => !isConfirmationLine(line))

  return {
    ...root,
    title: model.basics.title,
    genre: model.basics.genre,
    logline: model.basics.pitch,
    synopsis: model.basics.synopsis,
    worldbuilding: {
      ...asObject(root.worldbuilding),
      world_summary: model.world.summary,
      power_system: model.world.powerSystem,
    },
    protagonist: protagonist
      ? {
          ...asObject(root.protagonist),
          name: protagonist.name,
          role_type: protagonist.role,
          goal: protagonist.goal,
        }
      : asObject(root.protagonist),
    antagonist: antagonist
      ? {
          ...asObject(root.antagonist),
          name: antagonist.name,
          role_type: antagonist.role,
          goal: antagonist.goal,
        }
      : asObject(root.antagonist),
    characters: mergeIndexedRecords(root.characters, characters, (character, base) => ({
      ...base,
      name: character.name,
      role_type: character.role,
      goal: character.goal,
    })),
    volume_outlines: mergeIndexedRecords(root.volume_outlines, model.volumes, (volume, base) => ({
      ...base,
      title: volume.title,
      goal: volume.goal,
    })),
    chapter_outlines: mergeIndexedRecords(root.chapter_outlines, model.chapters, (chapter, base, index) => ({
      ...base,
      chapter_no: chapter.chapterNo || index + 1,
      title: chapter.title,
      chapter_goal: chapter.goal,
    })),
    foreshadowing_plan: splitLines(model.continuity.foreshadowing).map(foreshadowingLineToRecord),
    author_confirmations: authorConfirmations,
    open_questions: openQuestions,
  }
}
