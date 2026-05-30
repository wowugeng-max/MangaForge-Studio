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

function normalizeCharacter(value: any, fallbackRole = ''): DeepDraftCharacter | null {
  const record = asObject(value)
  const name = firstText(record.name, record.title)
  const role = firstText(record.role_type, record.role, record.identity, fallbackRole)
  const goal = firstText(record.goal, record.motivation, record.summary, record.pressure)
  if (!name && !role && !goal) return null
  return { name, role, goal }
}

function normalizeVolume(value: any): DeepDraftVolume | null {
  const record = asObject(value)
  const title = firstText(record.title, record.name)
  const goal = firstText(record.goal, record.direction, record.summary, record.note)
  if (!title && !goal) return null
  return { title, goal }
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

export function buildDeepDraftReviewModel(seed: any): DeepDraftReviewModel {
  const root = asObject(seed)
  const worldbuilding = asObject(root.worldbuilding)
  const characters = [
    normalizeCharacter(root.protagonist, '主角'),
    normalizeCharacter(root.antagonist, '反派'),
    ...(Array.isArray(root.characters) ? root.characters.map(normalizeCharacter) : []),
  ].filter(Boolean) as DeepDraftCharacter[]

  return {
    basics: {
      title: firstText(root.title, root.project_title, root.book_title),
      genre: firstText(root.genre, root.main_genre, root.category),
      pitch: firstText(root.logline, root.hook, root.reader_promise, root.core_premise),
      synopsis: firstText(root.synopsis, root.project_summary, root.summary, root.core_premise),
    },
    world: {
      summary: firstText(worldbuilding.world_summary, worldbuilding.summary, root.world_summary, root.setting),
      powerSystem: firstText(worldbuilding.power_system, root.power_system, root.progression_engine),
    },
    characters,
    volumes: Array.isArray(root.volume_outlines) ? root.volume_outlines.map(normalizeVolume).filter(Boolean) as DeepDraftVolume[] : [],
    chapters: Array.isArray(root.chapter_outlines) ? root.chapter_outlines.map(normalizeChapter).filter(Boolean) as DeepDraftChapter[] : [],
    continuity: {
      foreshadowing: joinListItems(root.foreshadowing_plan, ['name', 'title', 'hook']),
      openQuestions: Array.isArray(root.open_questions) ? root.open_questions.map((item: any) => firstText(item)).filter(Boolean).join('\n') : '',
    },
  }
}

export function deepDraftReviewModelToSeed(seed: any, model: DeepDraftReviewModel) {
  const root = asObject(seed)
  const characters = model.characters.filter(character => firstText(character.name, character.role, character.goal))
  const protagonist = characters[0]
  const antagonist = characters[1]

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
    foreshadowing_plan: splitLines(model.continuity.foreshadowing).map(line => ({ name: line })),
    open_questions: splitLines(model.continuity.openQuestions),
  }
}
