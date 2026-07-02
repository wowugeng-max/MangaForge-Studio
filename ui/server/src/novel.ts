import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { Database } from 'bun:sqlite'

export type NovelReferenceConfig = {
  references?: Array<{ project_title: string; weight?: number; use_for?: string[]; dimensions?: string[]; avoid?: string[] }>
  strength?: 'light' | 'balanced' | 'strong'
  notes?: string
  style_lock?: any
  safety?: any
  story_state?: any
  writing_bible?: any
  generation_pipeline?: any
  [key: string]: any
}
export type NovelProjectRecord = { id: number; title: string; genre?: string; sub_genres?: string[]; synopsis?: string; length_target?: string; target_audience?: string; style_tags?: string[]; commercial_tags?: string[]; reference_config?: NovelReferenceConfig; status?: string; created_at?: string; updated_at: string }
export type NovelWorldbuildingRecord = { id: number; project_id: number; world_summary?: string; rules?: any; factions?: any[]; locations?: any[]; systems?: any; items?: any[]; timeline_anchor?: any; known_unknowns?: any[]; version?: number; raw_payload?: any; created_at: string; updated_at: string }
export type NovelCharacterRecord = { id: number; project_id: number; name: string; role?: string; role_type?: string; archetype?: string; personality?: any; motivation?: string; goal?: string; conflict?: string; abilities?: any[]; backstory?: string; relationships?: any; relationship_graph?: any; growth_arc?: string; arc_hint?: string; current_state?: any; secret?: string; appearance?: string; status?: string; version?: number; raw_payload?: any; created_at?: string; updated_at: string }
export type NovelOutlineRecord = { id: number; project_id: number; outline_type?: string; title: string; summary?: string; beats?: any[]; conflict_points?: string[]; turning_points?: string[]; hook?: string; target_length?: string; version?: number; parent_id?: number | null; raw_payload?: any; created_at?: string; updated_at: string }
export type NovelChapterRecord = { id: number; project_id: number; chapter_no: number; title: string; chapter_goal?: string; chapter_summary?: string; conflict?: string; ending_hook?: string; chapter_text?: string; scene_breakdown?: any[]; scene_list?: any[]; continuity_notes?: string[]; items_in_play?: any[]; foreshadowing?: any; timeline_note?: string; status?: string; version?: number; published_at?: string | null; outline_id?: number | null; raw_payload?: any; created_at?: string; updated_at: string }
export type NovelChapterVersionSource = 'manual_edit' | 'agent_execute' | 'repair' | 'rollback'
export type NovelChapterVersionRecord = { id: number; chapter_id: number; project_id: number; version_no: number; chapter_text: string; scene_breakdown: any[]; continuity_notes: string[]; source: NovelChapterVersionSource; created_at: string }
export type NovelReviewRecord = { id: number; project_id: number; review_type: string; status: string; summary: string; issues: string[]; created_at: string; payload?: string }
export type NovelRunRecord = { id: number; project_id: number; run_type: string; step_name: string; status: string; input_ref?: string; output_ref?: string; duration_ms?: number; error_message?: string; created_at: string }
export type NovelProjectSeedDraftRecord = { id: number; title: string; idea?: string; seed: any; review_model?: any; diagnostics?: any; model_id?: number | null; source?: string; created_at: string; updated_at: string }
export type NovelSettingEntityRecord = {
  id: number
  project_id: number
  entity_type: string
  name: string
  summary?: string
  status?: string
  visibility?: string
  first_chapter_no?: number | null
  last_chapter_no?: number | null
  related_character_ids?: number[]
  related_chapter_ids?: number[]
  related_entity_ids?: number[]
  constraints_json?: any
  state_json?: any
  payload_json?: any
  created_at?: string
  updated_at: string
}
export type NovelChapterSettingUsageRecord = {
  id: number
  project_id: number
  chapter_id: number
  entity_id: number
  usage_type?: string
  required?: boolean
  allowed?: boolean
  forbidden?: boolean
  reveal_level?: string
  expected_state_change?: any
  actual_state_change?: any
  created_at?: string
  updated_at: string
}

type NovelStore = { projects: NovelProjectRecord[]; worldbuilding: NovelWorldbuildingRecord[]; characters: NovelCharacterRecord[]; outlines: NovelOutlineRecord[]; chapters: NovelChapterRecord[]; chapter_versions: NovelChapterVersionRecord[]; reviews: NovelReviewRecord[]; runs: NovelRunRecord[]; setting_entities: NovelSettingEntityRecord[]; chapter_setting_usage: NovelChapterSettingUsageRecord[] }

function nowIso() { return new Date().toISOString() }
function getNovelStorePath(activeWorkspace: string) { return join(activeWorkspace, 'novel-store.json') }
function getNovelDbPath(activeWorkspace: string) { return join(activeWorkspace, 'novel.sqlite') }
function toStringArray(value: any, fallback: string[] = []) { return Array.isArray(value) ? value.map(item => String(item)).filter(Boolean) : fallback }
function toAnyArray(value: any, fallback: any[] = []) { return Array.isArray(value) ? value : fallback }
function toJsonable(value: any, fallback: any = null) { return value === undefined ? fallback : value }
function jsonText(value: any, fallback: any = []) { return JSON.stringify(value === undefined ? fallback : value) }
function textValue(value: any, fallback = '') { return value === undefined || value === null ? fallback : (typeof value === 'string' ? value : JSON.stringify(value)) }
function normalizeStore(store: Partial<NovelStore> | null | undefined): NovelStore { return { projects: Array.isArray(store?.projects) ? store!.projects : [], worldbuilding: Array.isArray(store?.worldbuilding) ? store!.worldbuilding : [], characters: Array.isArray(store?.characters) ? store!.characters : [], outlines: Array.isArray(store?.outlines) ? store!.outlines : [], chapters: Array.isArray(store?.chapters) ? store!.chapters : [], chapter_versions: Array.isArray(store?.chapter_versions) ? store!.chapter_versions : [], reviews: Array.isArray(store?.reviews) ? store!.reviews : [], runs: Array.isArray(store?.runs) ? store!.runs : [], setting_entities: Array.isArray(store?.setting_entities) ? store!.setting_entities : [], chapter_setting_usage: Array.isArray(store?.chapter_setting_usage) ? store!.chapter_setting_usage : [] } }
async function readJsonStore(activeWorkspace: string): Promise<NovelStore> { try { return normalizeStore(JSON.parse(await readFile(getNovelStorePath(activeWorkspace), 'utf8')) as Partial<NovelStore>) } catch { return normalizeStore(null) } }
async function writeJsonStore(activeWorkspace: string, store: NovelStore) { await writeFile(getNovelStorePath(activeWorkspace), `${JSON.stringify(normalizeStore(store), null, 2)}\n`, 'utf8') }
function dbPathFromEnv() { const raw = process.env.SQLITE_DATABASE_URL || process.env.DATABASE_URL || ''; if (!raw) return ''; if (raw.startsWith('file:')) return raw.slice(5).split('?', 1)[0]; return raw }
function openDb(activeWorkspace: string) { return new Database(dbPathFromEnv() || getNovelDbPath(activeWorkspace)) }
function parseDbArray(value: any) { try { return value ? JSON.parse(String(value)) : [] } catch { return [] } }
function parseDbJson(value: any, fallback: any = null) { try { return value ? JSON.parse(String(value)) : fallback } catch { return fallback } }
function tableExists(db: Database, name: string) { return !!db.query("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name) }
function hasColumn(db: Database, table: string, column: string) {
  return (db.query(`PRAGMA table_info(${table})`).all() as any[]).some(item => item.name === column)
}
function addColumnIfMissing(db: Database, table: string, column: string, definition: string) {
  if (!hasColumn(db, table, column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
}
function ensureSqliteSchema(db: Database) {
  db.exec(`
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  genre TEXT DEFAULT '',
  sub_genres TEXT DEFAULT '[]',
  synopsis TEXT DEFAULT '',
  length_target TEXT DEFAULT 'medium',
  target_audience TEXT DEFAULT '',
  style_tags TEXT DEFAULT '[]',
  commercial_tags TEXT DEFAULT '[]',
  reference_config TEXT DEFAULT '{}',
  status TEXT DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS worldbuilding (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  world_summary TEXT DEFAULT '',
  rules TEXT DEFAULT '[]',
  factions TEXT DEFAULT '[]',
  locations TEXT DEFAULT '[]',
  systems TEXT DEFAULT '[]',
  items TEXT DEFAULT '[]',
  timeline_anchor TEXT DEFAULT '',
  known_unknowns TEXT DEFAULT '[]',
  version INTEGER DEFAULT 1,
  raw_payload TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT '',
  role_type TEXT DEFAULT '',
  archetype TEXT DEFAULT '',
  personality TEXT DEFAULT '[]',
  motivation TEXT DEFAULT '',
  goal TEXT DEFAULT '',
  conflict TEXT DEFAULT '',
  abilities TEXT DEFAULT '[]',
  backstory TEXT DEFAULT '',
  relationships TEXT DEFAULT '[]',
  relationship_graph TEXT DEFAULT '{}',
  growth_arc TEXT DEFAULT '',
  arc_hint TEXT DEFAULT '',
  current_state TEXT DEFAULT '{}',
  secret TEXT DEFAULT '',
  appearance TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  version INTEGER DEFAULT 1,
  raw_payload TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS outlines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  outline_type TEXT NOT NULL DEFAULT 'master',
  title TEXT NOT NULL,
  summary TEXT DEFAULT '',
  beats TEXT DEFAULT '[]',
  conflict_points TEXT DEFAULT '[]',
  turning_points TEXT DEFAULT '[]',
  hook TEXT DEFAULT '',
  target_length TEXT DEFAULT '',
  version INTEGER DEFAULT 1,
  parent_id INTEGER DEFAULT NULL,
  raw_payload TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES outlines(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS chapters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  outline_id INTEGER DEFAULT NULL,
  chapter_no INTEGER NOT NULL,
  title TEXT NOT NULL,
  chapter_goal TEXT DEFAULT '',
  chapter_summary TEXT DEFAULT '',
  conflict TEXT DEFAULT '',
  ending_hook TEXT DEFAULT '',
  chapter_text TEXT DEFAULT '',
  scene_breakdown TEXT DEFAULT '[]',
  scene_list TEXT DEFAULT '[]',
  continuity_notes TEXT DEFAULT '[]',
  items_in_play TEXT DEFAULT '[]',
  foreshadowing TEXT DEFAULT '[]',
  timeline_note TEXT DEFAULT '',
  status TEXT DEFAULT 'draft',
  version INTEGER DEFAULT 1,
  published_at TEXT DEFAULT NULL,
  raw_payload TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (outline_id) REFERENCES outlines(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS chapter_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chapter_id INTEGER NOT NULL,
  project_id INTEGER NOT NULL,
  version_no INTEGER NOT NULL DEFAULT 1,
  chapter_text TEXT DEFAULT '',
  scene_breakdown TEXT DEFAULT '[]',
  continuity_notes TEXT DEFAULT '[]',
  source TEXT DEFAULT 'manual_edit',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  review_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ok',
  summary TEXT DEFAULT '',
  issues TEXT DEFAULT '[]',
  payload TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  run_type TEXT NOT NULL,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL,
  input_ref TEXT DEFAULT '',
  output_ref TEXT DEFAULT '',
  duration_ms INTEGER DEFAULT 0,
  error_message TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS project_seed_drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  idea TEXT DEFAULT '',
  seed TEXT NOT NULL DEFAULT '{}',
  review_model TEXT DEFAULT '{}',
  diagnostics TEXT DEFAULT '{}',
  model_id INTEGER DEFAULT NULL,
  source TEXT DEFAULT 'deep_draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS setting_entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  entity_type TEXT NOT NULL,
  name TEXT NOT NULL,
  summary TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  visibility TEXT DEFAULT 'public',
  first_chapter_no INTEGER DEFAULT NULL,
  last_chapter_no INTEGER DEFAULT NULL,
  related_character_ids TEXT DEFAULT '[]',
  related_chapter_ids TEXT DEFAULT '[]',
  related_entity_ids TEXT DEFAULT '[]',
  constraints_json TEXT DEFAULT '{}',
  state_json TEXT DEFAULT '{}',
  payload_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS chapter_setting_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  chapter_id INTEGER NOT NULL,
  entity_id INTEGER NOT NULL,
  usage_type TEXT DEFAULT 'allowed',
  required INTEGER DEFAULT 0,
  allowed INTEGER DEFAULT 1,
  forbidden INTEGER DEFAULT 0,
  reveal_level TEXT DEFAULT 'none',
  expected_state_change TEXT DEFAULT '{}',
  actual_state_change TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
  FOREIGN KEY (entity_id) REFERENCES setting_entities(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);
CREATE INDEX IF NOT EXISTS idx_worldbuilding_project_id ON worldbuilding(project_id);
CREATE INDEX IF NOT EXISTS idx_characters_project_id ON characters(project_id);
CREATE INDEX IF NOT EXISTS idx_outlines_project_id ON outlines(project_id);
CREATE INDEX IF NOT EXISTS idx_outlines_parent_id ON outlines(parent_id);
CREATE INDEX IF NOT EXISTS idx_chapters_project_id ON chapters(project_id);
CREATE INDEX IF NOT EXISTS idx_chapters_outline_id ON chapters(outline_id);
CREATE INDEX IF NOT EXISTS idx_chapters_chapter_no ON chapters(chapter_no);
CREATE INDEX IF NOT EXISTS idx_chapter_versions_chapter_id ON chapter_versions(chapter_id);
CREATE INDEX IF NOT EXISTS idx_reviews_project_id ON reviews(project_id);
CREATE INDEX IF NOT EXISTS idx_runs_project_id ON runs(project_id);
CREATE INDEX IF NOT EXISTS idx_project_seed_drafts_updated_at ON project_seed_drafts(updated_at);
CREATE INDEX IF NOT EXISTS idx_setting_entities_project_type ON setting_entities(project_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_setting_entities_project_name ON setting_entities(project_id, name);
CREATE INDEX IF NOT EXISTS idx_chapter_setting_usage_chapter ON chapter_setting_usage(chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_setting_usage_entity ON chapter_setting_usage(entity_id);
`)
  for (const [table, columns] of Object.entries({
    projects: [['synopsis', "TEXT DEFAULT ''"], ['reference_config', "TEXT DEFAULT '{}'"]],
    worldbuilding: [['items', "TEXT DEFAULT '[]'"], ['raw_payload', "TEXT DEFAULT '{}'"]],
    characters: [['role', "TEXT DEFAULT ''"], ['personality', "TEXT DEFAULT '[]'"], ['abilities', "TEXT DEFAULT '[]'"], ['backstory', "TEXT DEFAULT ''"], ['relationships', "TEXT DEFAULT '[]'"], ['relationship_graph', "TEXT DEFAULT '{}'"], ['growth_arc', "TEXT DEFAULT ''"], ['arc_hint', "TEXT DEFAULT ''"], ['current_state', "TEXT DEFAULT '{}'"], ['secret', "TEXT DEFAULT ''"], ['appearance', "TEXT DEFAULT ''"], ['status', "TEXT DEFAULT 'active'"], ['version', 'INTEGER DEFAULT 1'], ['raw_payload', "TEXT DEFAULT '{}'"], ['created_at', "TEXT DEFAULT ''"]],
    outlines: [['beats', "TEXT DEFAULT '[]'"], ['target_length', "TEXT DEFAULT ''"], ['version', 'INTEGER DEFAULT 1'], ['raw_payload', "TEXT DEFAULT '{}'"], ['created_at', "TEXT DEFAULT ''"]],
    chapters: [['scene_list', "TEXT DEFAULT '[]'"], ['items_in_play', "TEXT DEFAULT '[]'"], ['foreshadowing', "TEXT DEFAULT '[]'"], ['timeline_note', "TEXT DEFAULT ''"], ['version', 'INTEGER DEFAULT 1'], ['published_at', 'TEXT DEFAULT NULL'], ['raw_payload', "TEXT DEFAULT '{}'"]],
    reviews: [['payload', "TEXT DEFAULT ''"], ['status', "TEXT DEFAULT 'ok'"]],
    project_seed_drafts: [['review_model', "TEXT DEFAULT '{}'"], ['diagnostics', "TEXT DEFAULT '{}'"], ['model_id', 'INTEGER DEFAULT NULL'], ['source', "TEXT DEFAULT 'deep_draft'"]],
    setting_entities: [['payload_json', "TEXT DEFAULT '{}'"], ['state_json', "TEXT DEFAULT '{}'"], ['constraints_json', "TEXT DEFAULT '{}'"]],
    chapter_setting_usage: [['expected_state_change', "TEXT DEFAULT '{}'"], ['actual_state_change', "TEXT DEFAULT '{}'"]],
  } as Record<string, Array<[string, string]>>)) {
    if (!tableExists(db, table)) continue
    for (const [column, definition] of columns) addColumnIfMissing(db, table, column, definition)
  }
}
function loadStoreFromOpenDb(db: Database): NovelStore {
  ensureSqliteSchema(db)
  try {
    const projects = db.query('SELECT * FROM projects ORDER BY updated_at DESC').all() as any[]
    const worldbuilding = db.query('SELECT * FROM worldbuilding').all() as any[]
    const characters = db.query('SELECT * FROM characters').all() as any[]
    const outlines = db.query('SELECT * FROM outlines').all() as any[]
    const chapters = db.query('SELECT * FROM chapters ORDER BY chapter_no ASC').all() as any[]
    const chapterVersions = db.query('SELECT * FROM chapter_versions ORDER BY created_at DESC').all() as any[]
    const reviews = db.query('SELECT * FROM reviews').all() as any[]
    const runs = db.query('SELECT * FROM runs ORDER BY created_at DESC').all() as any[]
    const settingEntities = db.query('SELECT * FROM setting_entities ORDER BY entity_type ASC, name ASC').all() as any[]
    const chapterSettingUsage = db.query('SELECT * FROM chapter_setting_usage ORDER BY updated_at DESC').all() as any[]
    return {
      projects: projects.map(item => ({ ...item, sub_genres: parseDbArray(item.sub_genres), style_tags: parseDbArray(item.style_tags), commercial_tags: parseDbArray(item.commercial_tags), reference_config: parseDbJson(item.reference_config, {}) })),
      worldbuilding: worldbuilding.map(item => ({ ...item, rules: parseDbJson(item.rules, []), factions: parseDbArray(item.factions), locations: parseDbArray(item.locations), systems: parseDbJson(item.systems, []), items: parseDbArray(item.items), timeline_anchor: parseDbJson(item.timeline_anchor, item.timeline_anchor || ''), known_unknowns: parseDbArray(item.known_unknowns), raw_payload: parseDbJson(item.raw_payload, {}) })),
      characters: characters.map(item => ({ ...item, personality: parseDbJson(item.personality, []), abilities: parseDbArray(item.abilities), relationships: parseDbJson(item.relationships, []), relationship_graph: parseDbJson(item.relationship_graph, {}), current_state: parseDbJson(item.current_state, {}), raw_payload: parseDbJson(item.raw_payload, {}) })),
      outlines: outlines.map(item => ({ ...item, beats: parseDbArray(item.beats), conflict_points: parseDbArray(item.conflict_points), turning_points: parseDbArray(item.turning_points), raw_payload: parseDbJson(item.raw_payload, {}) })),
      chapters: chapters.map(item => ({ ...item, scene_breakdown: parseDbArray(item.scene_breakdown), scene_list: parseDbArray(item.scene_list), continuity_notes: parseDbArray(item.continuity_notes), items_in_play: parseDbArray(item.items_in_play), foreshadowing: parseDbJson(item.foreshadowing, []), raw_payload: parseDbJson(item.raw_payload, {}) })),
      chapter_versions: chapterVersions.map(item => ({ ...item, scene_breakdown: parseDbArray(item.scene_breakdown), continuity_notes: parseDbArray(item.continuity_notes) })),
      reviews: reviews.map(item => ({ ...item, issues: parseDbArray(item.issues), payload: item.payload || '' })),
      runs,
      setting_entities: settingEntities.map(item => ({ ...item, related_character_ids: parseDbArray(item.related_character_ids).map(Number).filter(Boolean), related_chapter_ids: parseDbArray(item.related_chapter_ids).map(Number).filter(Boolean), related_entity_ids: parseDbArray(item.related_entity_ids).map(Number).filter(Boolean), constraints_json: parseDbJson(item.constraints_json, {}), state_json: parseDbJson(item.state_json, {}), payload_json: parseDbJson(item.payload_json, {}) })),
      chapter_setting_usage: chapterSettingUsage.map(item => ({ ...item, required: Boolean(item.required), allowed: item.allowed !== 0, forbidden: Boolean(item.forbidden), expected_state_change: parseDbJson(item.expected_state_change, {}), actual_state_change: parseDbJson(item.actual_state_change, {}) })),
    }
  } catch (error) {
    if (String(error).includes('no such table')) return normalizeStore(null)
    throw error
  }
}
function storeScore(store: NovelStore) { return Object.values(store).reduce((sum, value) => sum + (Array.isArray(value) ? value.length : 0), 0) }
async function readStore(activeWorkspace: string): Promise<NovelStore> {
  const db = openDb(activeWorkspace)
  try {
    const dbStore = loadStoreFromOpenDb(db)
    const jsonStore = await readJsonStore(activeWorkspace)
    if (storeScore(jsonStore) > storeScore(dbStore)) {
      db.close()
      await writeStore(activeWorkspace, jsonStore)
      const migrated = openDb(activeWorkspace)
      try { return loadStoreFromOpenDb(migrated) } finally { migrated.close() }
    }
    return dbStore
  } finally {
    try { db.close() } catch { /* already closed during migration */ }
  }
}
async function writeStore(activeWorkspace: string, store: NovelStore) {
  const normalized = normalizeStore(store)
  const db = openDb(activeWorkspace)
  let committed = false
  try {
    ensureSqliteSchema(db)
    db.exec('BEGIN')
    for (const table of ['chapter_setting_usage','setting_entities','runs','reviews','chapter_versions','chapters','outlines','characters','worldbuilding','projects']) db.exec(`DELETE FROM ${table}`)
    const insert = (sql: string, params: any[]) => db.query(sql).run(...params)
    for (const p of normalized.projects) insert('INSERT INTO projects (id,title,genre,sub_genres,synopsis,length_target,target_audience,style_tags,commercial_tags,reference_config,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [p.id,p.title,p.genre||'',jsonText(p.sub_genres),p.synopsis||'',p.length_target||'medium',p.target_audience||'',jsonText(p.style_tags),jsonText(p.commercial_tags),jsonText(p.reference_config, {}),p.status||'draft',p.created_at||nowIso(),p.updated_at||nowIso()])
    for (const w of normalized.worldbuilding) insert('INSERT INTO worldbuilding (id,project_id,world_summary,rules,factions,locations,systems,items,timeline_anchor,known_unknowns,version,raw_payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [w.id,w.project_id,w.world_summary||'',jsonText(w.rules),jsonText(w.factions),jsonText(w.locations),jsonText(w.systems),jsonText(w.items),textValue(w.timeline_anchor),jsonText(w.known_unknowns),w.version||1,jsonText(w.raw_payload || w, {}),w.created_at||nowIso(),w.updated_at||nowIso()])
    for (const c of normalized.characters) insert('INSERT INTO characters (id,project_id,name,role,role_type,archetype,personality,motivation,goal,conflict,abilities,backstory,relationships,relationship_graph,growth_arc,arc_hint,current_state,secret,appearance,status,version,raw_payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [c.id,c.project_id,c.name,c.role||'',c.role_type||c.role||'',c.archetype||'',jsonText(c.personality),c.motivation||'',c.goal||'',c.conflict||'',jsonText(c.abilities),c.backstory||'',jsonText(c.relationships),jsonText(c.relationship_graph, {}),c.growth_arc||'',c.arc_hint||'',jsonText(c.current_state, {}),c.secret||'',c.appearance||'',c.status||'active',c.version||1,jsonText(c.raw_payload || c, {}),c.created_at||c.updated_at||nowIso(),c.updated_at||nowIso()])
    for (const o of normalized.outlines) insert('INSERT INTO outlines (id,project_id,outline_type,title,summary,beats,conflict_points,turning_points,hook,target_length,version,parent_id,raw_payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [o.id,o.project_id,o.outline_type||'master',o.title,o.summary||'',jsonText(o.beats),jsonText(o.conflict_points),jsonText(o.turning_points),o.hook||'',o.target_length||'',o.version||1,o.parent_id ?? null,jsonText(o.raw_payload || o, {}),o.created_at||nowIso(),o.updated_at||nowIso()])
    for (const c of normalized.chapters) insert('INSERT INTO chapters (id,project_id,outline_id,chapter_no,title,chapter_goal,chapter_summary,conflict,ending_hook,chapter_text,scene_breakdown,scene_list,continuity_notes,items_in_play,foreshadowing,timeline_note,status,version,published_at,raw_payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [c.id,c.project_id,c.outline_id ?? null,c.chapter_no,c.title,c.chapter_goal||'',c.chapter_summary||'',c.conflict||'',c.ending_hook||'',c.chapter_text||'',jsonText(c.scene_breakdown),jsonText(c.scene_list || c.scene_breakdown),jsonText(c.continuity_notes),jsonText(c.items_in_play),jsonText(c.foreshadowing),c.timeline_note||'',c.status||'draft',c.version||1,c.published_at||null,jsonText(c.raw_payload || c, {}),c.created_at||nowIso(),c.updated_at||nowIso()])
    for (const v of normalized.chapter_versions) insert('INSERT INTO chapter_versions (id,chapter_id,project_id,version_no,chapter_text,scene_breakdown,continuity_notes,source,created_at) VALUES (?,?,?,?,?,?,?,?,?)', [v.id,v.chapter_id,v.project_id,v.version_no,v.chapter_text||'',JSON.stringify(v.scene_breakdown||[]),JSON.stringify(v.continuity_notes||[]),v.source||'manual_edit',v.created_at||nowIso()])
    for (const r of normalized.reviews) insert('INSERT INTO reviews (id,project_id,review_type,status,summary,issues,payload,created_at) VALUES (?,?,?,?,?,?,?,?)', [r.id,r.project_id,r.review_type,r.status,r.summary||'',JSON.stringify(r.issues||[]),r.payload||'',r.created_at||nowIso()])
    for (const r of normalized.runs) insert('INSERT INTO runs (id,project_id,run_type,step_name,status,input_ref,output_ref,duration_ms,error_message,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)', [r.id,r.project_id,r.run_type,r.step_name,r.status,r.input_ref||'',r.output_ref||'',r.duration_ms||0,r.error_message||'',r.created_at||nowIso()])
    for (const s of normalized.setting_entities) insert('INSERT INTO setting_entities (id,project_id,entity_type,name,summary,status,visibility,first_chapter_no,last_chapter_no,related_character_ids,related_chapter_ids,related_entity_ids,constraints_json,state_json,payload_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [s.id,s.project_id,s.entity_type||'rule',s.name,s.summary||'',s.status||'active',s.visibility||'public',s.first_chapter_no ?? null,s.last_chapter_no ?? null,jsonText(s.related_character_ids, []),jsonText(s.related_chapter_ids, []),jsonText(s.related_entity_ids, []),jsonText(s.constraints_json, {}),jsonText(s.state_json, {}),jsonText(s.payload_json || s, {}),s.created_at||nowIso(),s.updated_at||nowIso()])
    for (const u of normalized.chapter_setting_usage) insert('INSERT INTO chapter_setting_usage (id,project_id,chapter_id,entity_id,usage_type,required,allowed,forbidden,reveal_level,expected_state_change,actual_state_change,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [u.id,u.project_id,u.chapter_id,u.entity_id,u.usage_type||'allowed',u.required ? 1 : 0,u.allowed === false ? 0 : 1,u.forbidden ? 1 : 0,u.reveal_level||'none',jsonText(u.expected_state_change, {}),jsonText(u.actual_state_change, {}),u.created_at||nowIso(),u.updated_at||nowIso()])
    db.exec('COMMIT')
    committed = true
    await writeJsonStore(activeWorkspace, normalized)
  } catch (e) { if (!committed) db.exec('ROLLBACK'); throw e } finally { db.close() }
}
function normalizeReferenceConfig(value: any): NovelReferenceConfig {
  const raw = value && typeof value === 'object' ? value : {}
  const references = Array.isArray(raw.references)
    ? raw.references.map((item: any) => ({
      project_title: String(item?.project_title || item?.projectTitle || '').trim(),
      weight: Math.max(0.1, Math.min(1, Number(item?.weight || 0.7) || 0.7)),
      use_for: toStringArray(item?.use_for || item?.useFor),
      dimensions: toStringArray(item?.dimensions),
      avoid: toStringArray(item?.avoid),
    })).filter((item: any) => item.project_title)
    : []
  const strength = raw.strength === 'light' || raw.strength === 'strong' ? raw.strength : 'balanced'
  return {
    ...raw,
    references,
    strength,
    notes: String(raw.notes || ''),
  }
}
function normalizeProjectRecord(data: Partial<NovelProjectRecord>, existing?: Partial<NovelProjectRecord>): NovelProjectRecord { const ts = nowIso(); return { id: Number(existing?.id || data.id || 0), title: String(data.title ?? existing?.title ?? '未命名小说'), genre: String(data.genre ?? existing?.genre ?? ''), sub_genres: toStringArray(data.sub_genres ?? existing?.sub_genres), synopsis: String(data.synopsis ?? existing?.synopsis ?? ''), length_target: String(data.length_target ?? existing?.length_target ?? 'medium'), target_audience: String(data.target_audience ?? existing?.target_audience ?? ''), style_tags: toStringArray(data.style_tags ?? existing?.style_tags), commercial_tags: toStringArray(data.commercial_tags ?? existing?.commercial_tags), reference_config: normalizeReferenceConfig(data.reference_config ?? existing?.reference_config), status: String(data.status ?? existing?.status ?? 'draft'), created_at: String(existing?.created_at ?? data.created_at ?? ts), updated_at: String(existing?.updated_at ?? data.updated_at ?? ts) } }
function normalizeWorldbuildingRecord(data: Partial<NovelWorldbuildingRecord>, existing?: Partial<NovelWorldbuildingRecord>): NovelWorldbuildingRecord {
  const raw = { ...(existing?.raw_payload || {}), ...(data.raw_payload || {}), ...data }
  return {
    id: Number(existing?.id || data.id || 0),
    project_id: Number(data.project_id ?? existing?.project_id ?? 0),
    world_summary: String(data.world_summary ?? existing?.world_summary ?? ''),
    rules: toJsonable(data.rules ?? existing?.rules, []),
    factions: toAnyArray(data.factions ?? existing?.factions),
    locations: toAnyArray(data.locations ?? existing?.locations),
    systems: toJsonable(data.systems ?? existing?.systems, []),
    items: toAnyArray((data as any).items ?? existing?.items),
    timeline_anchor: toJsonable(data.timeline_anchor ?? existing?.timeline_anchor, ''),
    known_unknowns: toAnyArray(data.known_unknowns ?? existing?.known_unknowns),
    version: Number(data.version ?? existing?.version ?? 1),
    raw_payload: raw,
    created_at: String(existing?.created_at ?? data.created_at ?? nowIso()),
    updated_at: String(data.updated_at ?? nowIso()),
  }
}
function normalizeCharacterRecord(data: Partial<NovelCharacterRecord>, existing?: Partial<NovelCharacterRecord>): NovelCharacterRecord {
  const raw = { ...(existing?.raw_payload || {}), ...(data.raw_payload || {}), ...data }
  const role = String(data.role ?? data.role_type ?? existing?.role ?? existing?.role_type ?? '')
  return {
    id: Number(existing?.id || data.id || 0),
    project_id: Number(data.project_id ?? existing?.project_id ?? 0),
    name: String(data.name ?? existing?.name ?? '未命名角色'),
    role,
    role_type: String(data.role_type ?? existing?.role_type ?? role),
    archetype: String(data.archetype ?? existing?.archetype ?? ''),
    personality: toJsonable(data.personality ?? existing?.personality, []),
    motivation: String(data.motivation ?? existing?.motivation ?? ''),
    goal: String(data.goal ?? existing?.goal ?? ''),
    conflict: String(data.conflict ?? existing?.conflict ?? ''),
    abilities: toAnyArray(data.abilities ?? existing?.abilities),
    backstory: String(data.backstory ?? existing?.backstory ?? ''),
    relationships: toJsonable(data.relationships ?? existing?.relationships, []),
    relationship_graph: toJsonable(data.relationship_graph ?? existing?.relationship_graph, {}),
    growth_arc: String(data.growth_arc ?? existing?.growth_arc ?? ''),
    arc_hint: String(data.arc_hint ?? existing?.arc_hint ?? ''),
    current_state: toJsonable(data.current_state ?? existing?.current_state, {}),
    secret: String(data.secret ?? existing?.secret ?? ''),
    appearance: String(data.appearance ?? existing?.appearance ?? ''),
    status: String(data.status ?? existing?.status ?? 'active'),
    version: Number(data.version ?? existing?.version ?? 1),
    raw_payload: raw,
    created_at: String(existing?.created_at ?? data.created_at ?? nowIso()),
    updated_at: String(data.updated_at ?? nowIso()),
  }
}
function normalizeOutlineRecord(data: Partial<NovelOutlineRecord>, existing?: Partial<NovelOutlineRecord>): NovelOutlineRecord {
  const raw = { ...(existing?.raw_payload || {}), ...(data.raw_payload || {}), ...data }
  return {
    id: Number(existing?.id || data.id || 0),
    project_id: Number(data.project_id ?? existing?.project_id ?? 0),
    outline_type: String(data.outline_type ?? existing?.outline_type ?? 'master'),
    title: String(data.title ?? existing?.title ?? '未命名大纲'),
    summary: String(data.summary ?? existing?.summary ?? ''),
    beats: toAnyArray(data.beats ?? existing?.beats),
    conflict_points: toStringArray(data.conflict_points ?? existing?.conflict_points),
    turning_points: toStringArray(data.turning_points ?? existing?.turning_points),
    hook: String(data.hook ?? existing?.hook ?? ''),
    target_length: String(data.target_length ?? existing?.target_length ?? ''),
    version: Number(data.version ?? existing?.version ?? 1),
    parent_id: data.parent_id ?? existing?.parent_id ?? null,
    raw_payload: raw,
    created_at: String(existing?.created_at ?? data.created_at ?? nowIso()),
    updated_at: String(data.updated_at ?? nowIso()),
  }
}
function normalizeChapterRecord(data: Partial<NovelChapterRecord>, existing?: Partial<NovelChapterRecord>): NovelChapterRecord {
  const raw = { ...(existing?.raw_payload || {}), ...(data.raw_payload || {}), ...data }
  const sceneBreakdown = toAnyArray(data.scene_breakdown ?? data.scene_list ?? existing?.scene_breakdown ?? existing?.scene_list)
  return {
    id: Number(existing?.id || data.id || 0),
    project_id: Number(data.project_id ?? existing?.project_id ?? 0),
    chapter_no: Number(data.chapter_no ?? existing?.chapter_no ?? 1),
    title: String(data.title ?? existing?.title ?? '第一章'),
    chapter_goal: String(data.chapter_goal ?? existing?.chapter_goal ?? ''),
    chapter_summary: String(data.chapter_summary ?? existing?.chapter_summary ?? ''),
    conflict: String(data.conflict ?? existing?.conflict ?? ''),
    ending_hook: String(data.ending_hook ?? existing?.ending_hook ?? ''),
    chapter_text: String(data.chapter_text ?? existing?.chapter_text ?? ''),
    scene_breakdown: sceneBreakdown,
    scene_list: toAnyArray(data.scene_list ?? existing?.scene_list ?? sceneBreakdown),
    continuity_notes: toStringArray(data.continuity_notes ?? existing?.continuity_notes),
    items_in_play: toAnyArray(data.items_in_play ?? existing?.items_in_play),
    foreshadowing: toJsonable(data.foreshadowing ?? existing?.foreshadowing, []),
    timeline_note: String(data.timeline_note ?? existing?.timeline_note ?? ''),
    status: String(data.status ?? existing?.status ?? 'draft'),
    version: Number(data.version ?? existing?.version ?? 1),
    published_at: data.published_at ?? existing?.published_at ?? null,
    outline_id: data.outline_id ?? existing?.outline_id ?? null,
    raw_payload: raw,
    created_at: String(existing?.created_at ?? data.created_at ?? nowIso()),
    updated_at: String(data.updated_at ?? nowIso()),
  }
}
function normalizeReviewRecord(data: Partial<NovelReviewRecord>, existing?: Partial<NovelReviewRecord>): NovelReviewRecord { return { id: Number(existing?.id || data.id || 0), project_id: Number(data.project_id ?? existing?.project_id ?? 0), review_type: String(data.review_type ?? existing?.review_type ?? 'continuity'), status: String(data.status ?? existing?.status ?? 'ok'), summary: String(data.summary ?? existing?.summary ?? ''), issues: toStringArray(data.issues ?? existing?.issues), created_at: String(existing?.created_at ?? data.created_at ?? nowIso()), payload: String(data.payload ?? existing?.payload ?? '') } }
function normalizeRunRecord(data: Partial<NovelRunRecord>, existing?: Partial<NovelRunRecord>): NovelRunRecord { return { id: Number(existing?.id || data.id || 0), project_id: Number(data.project_id ?? existing?.project_id ?? 0), run_type: String(data.run_type ?? existing?.run_type ?? 'plan'), step_name: String(data.step_name ?? existing?.step_name ?? 'step'), status: String(data.status ?? existing?.status ?? 'pending'), input_ref: String(data.input_ref ?? existing?.input_ref ?? ''), output_ref: String(data.output_ref ?? existing?.output_ref ?? ''), duration_ms: Number(data.duration_ms ?? existing?.duration_ms ?? 0), error_message: String(data.error_message ?? existing?.error_message ?? ''), created_at: String(existing?.created_at ?? data.created_at ?? nowIso()) } }
function normalizeProjectSeedDraftRecord(data: Partial<NovelProjectSeedDraftRecord>, existing?: Partial<NovelProjectSeedDraftRecord>): NovelProjectSeedDraftRecord {
  const seed = data.seed ?? existing?.seed ?? {}
  const title = String(data.title ?? existing?.title ?? seed?.title ?? seed?.project_title ?? '未命名孵化草稿').trim() || '未命名孵化草稿'
  return {
    id: Number(existing?.id || data.id || 0),
    title,
    idea: String(data.idea ?? existing?.idea ?? ''),
    seed,
    review_model: data.review_model ?? existing?.review_model ?? {},
    diagnostics: data.diagnostics ?? existing?.diagnostics ?? {},
    model_id: data.model_id === undefined ? (existing?.model_id ?? null) : (data.model_id === null ? null : Number(data.model_id) || null),
    source: String(data.source ?? existing?.source ?? 'deep_draft'),
    created_at: String(existing?.created_at ?? data.created_at ?? nowIso()),
    updated_at: String(data.updated_at ?? nowIso()),
  }
}
function projectSeedDraftFromRow(row: any): NovelProjectSeedDraftRecord {
  return {
    id: Number(row.id || 0),
    title: String(row.title || ''),
    idea: String(row.idea || ''),
    seed: parseDbJson(row.seed, {}),
    review_model: parseDbJson(row.review_model, {}),
    diagnostics: parseDbJson(row.diagnostics, {}),
    model_id: row.model_id === null || row.model_id === undefined ? null : Number(row.model_id) || null,
    source: String(row.source || 'deep_draft'),
    created_at: String(row.created_at || ''),
    updated_at: String(row.updated_at || ''),
  }
}
function normalizeSettingEntityRecord(data: Partial<NovelSettingEntityRecord>, existing?: Partial<NovelSettingEntityRecord>): NovelSettingEntityRecord {
  const raw = { ...(existing?.payload_json || {}), ...(data.payload_json || {}), ...data }
  return {
    id: Number(existing?.id || data.id || 0),
    project_id: Number(data.project_id ?? existing?.project_id ?? 0),
    entity_type: String(data.entity_type ?? existing?.entity_type ?? 'rule'),
    name: String(data.name ?? existing?.name ?? '未命名设定'),
    summary: String(data.summary ?? existing?.summary ?? ''),
    status: String(data.status ?? existing?.status ?? 'active'),
    visibility: String(data.visibility ?? existing?.visibility ?? 'public'),
    first_chapter_no: data.first_chapter_no ?? existing?.first_chapter_no ?? null,
    last_chapter_no: data.last_chapter_no ?? existing?.last_chapter_no ?? null,
    related_character_ids: toAnyArray(data.related_character_ids ?? existing?.related_character_ids).map(Number).filter(Boolean),
    related_chapter_ids: toAnyArray(data.related_chapter_ids ?? existing?.related_chapter_ids).map(Number).filter(Boolean),
    related_entity_ids: toAnyArray(data.related_entity_ids ?? existing?.related_entity_ids).map(Number).filter(Boolean),
    constraints_json: toJsonable(data.constraints_json ?? existing?.constraints_json, {}),
    state_json: toJsonable(data.state_json ?? existing?.state_json, {}),
    payload_json: raw,
    created_at: String(existing?.created_at ?? data.created_at ?? nowIso()),
    updated_at: String(data.updated_at ?? nowIso()),
  }
}
function normalizeChapterSettingUsageRecord(data: Partial<NovelChapterSettingUsageRecord>, existing?: Partial<NovelChapterSettingUsageRecord>): NovelChapterSettingUsageRecord {
  return {
    id: Number(existing?.id || data.id || 0),
    project_id: Number(data.project_id ?? existing?.project_id ?? 0),
    chapter_id: Number(data.chapter_id ?? existing?.chapter_id ?? 0),
    entity_id: Number(data.entity_id ?? existing?.entity_id ?? 0),
    usage_type: String(data.usage_type ?? existing?.usage_type ?? (data.forbidden ? 'forbidden' : data.required ? 'required' : 'allowed')),
    required: Boolean(data.required ?? existing?.required ?? false),
    allowed: data.allowed ?? existing?.allowed ?? true,
    forbidden: Boolean(data.forbidden ?? existing?.forbidden ?? false),
    reveal_level: String(data.reveal_level ?? existing?.reveal_level ?? 'none'),
    expected_state_change: toJsonable(data.expected_state_change ?? existing?.expected_state_change, {}),
    actual_state_change: toJsonable(data.actual_state_change ?? existing?.actual_state_change, {}),
    created_at: String(existing?.created_at ?? data.created_at ?? nowIso()),
    updated_at: String(data.updated_at ?? nowIso()),
  }
}
function dedupById<T extends { id: number | string }>(items: T[]): T[] {
  const seen = new Set<number | string>()
  return items.filter(item => {
    const key = item.id
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
export async function listNovelProjects(activeWorkspace: string) { const store = await readStore(activeWorkspace); return dedupById(store.projects).sort((a, b) => b.updated_at.localeCompare(a.updated_at)) }
export async function createNovelProject(activeWorkspace: string, data: Partial<NovelProjectRecord>) { const store = await readStore(activeWorkspace); const project = normalizeProjectRecord(data, { id: store.projects.reduce((max, item) => Math.max(max, item.id), 0) + 1 }); store.projects.push(project); await writeStore(activeWorkspace, store); return project }
export async function getNovelProject(activeWorkspace: string, id: number) { const store = await readStore(activeWorkspace); return store.projects.find(item => item.id === id) || null }
export async function updateNovelProject(activeWorkspace: string, id: number, data: Partial<NovelProjectRecord>) { const store = await readStore(activeWorkspace); const idx = store.projects.findIndex(item => item.id === id); if (idx < 0) return null; const current = store.projects[idx]; const updated = normalizeProjectRecord(data, { ...current, id, updated_at: nowIso() }); store.projects[idx] = { ...current, ...updated, updated_at: nowIso() }; await writeStore(activeWorkspace, store); return store.projects[idx] }
export async function listNovelWorldbuilding(activeWorkspace: string, projectId: number) { const store = await readStore(activeWorkspace); return dedupById(store.worldbuilding.filter(item => item.project_id === projectId)) }
export async function createNovelWorldbuilding(activeWorkspace: string, data: Partial<NovelWorldbuildingRecord>) { const store = await readStore(activeWorkspace); const record = normalizeWorldbuildingRecord(data, { id: store.worldbuilding.reduce((max, item) => Math.max(max, item.id), 0) + 1 }); store.worldbuilding.push(record); await writeStore(activeWorkspace, store); return record }
export async function updateNovelWorldbuilding(activeWorkspace: string, id: number, data: Partial<NovelWorldbuildingRecord>) { const store = await readStore(activeWorkspace); const idx = store.worldbuilding.findIndex(item => item.id === id); if (idx < 0) return null; const current = store.worldbuilding[idx]; store.worldbuilding[idx] = normalizeWorldbuildingRecord(data, current); await writeStore(activeWorkspace, store); return store.worldbuilding[idx] }
export async function listNovelCharacters(activeWorkspace: string, projectId: number) { const store = await readStore(activeWorkspace); return dedupById(store.characters.filter(item => item.project_id === projectId)) }
export async function createNovelCharacter(activeWorkspace: string, data: Partial<NovelCharacterRecord>) { const store = await readStore(activeWorkspace); const record = normalizeCharacterRecord(data, { id: store.characters.reduce((max, item) => Math.max(max, item.id), 0) + 1 }); store.characters.push(record); await writeStore(activeWorkspace, store); return record }
export async function updateNovelCharacter(activeWorkspace: string, id: number, data: Partial<NovelCharacterRecord>) { const store = await readStore(activeWorkspace); const idx = store.characters.findIndex(item => item.id === id); if (idx < 0) return null; const current = store.characters[idx]; store.characters[idx] = normalizeCharacterRecord(data, current); await writeStore(activeWorkspace, store); return store.characters[idx] }
export async function listNovelSettingEntities(activeWorkspace: string, projectId: number, entityType?: string) { const store = await readStore(activeWorkspace); return dedupById(store.setting_entities.filter(item => item.project_id === projectId && (!entityType || item.entity_type === entityType))).sort((a, b) => String(a.entity_type || '').localeCompare(String(b.entity_type || '')) || String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN')) }
export async function createNovelSettingEntity(activeWorkspace: string, data: Partial<NovelSettingEntityRecord>) { const store = await readStore(activeWorkspace); const record = normalizeSettingEntityRecord(data, { id: store.setting_entities.reduce((max, item) => Math.max(max, item.id), 0) + 1 }); store.setting_entities.push(record); await writeStore(activeWorkspace, store); return record }
export async function updateNovelSettingEntity(activeWorkspace: string, id: number, data: Partial<NovelSettingEntityRecord>) { const store = await readStore(activeWorkspace); const idx = store.setting_entities.findIndex(item => item.id === id); if (idx < 0) return null; const current = store.setting_entities[idx]; store.setting_entities[idx] = normalizeSettingEntityRecord(data, current); await writeStore(activeWorkspace, store); return store.setting_entities[idx] }
export async function deleteNovelSettingEntity(activeWorkspace: string, id: number) { const store = await readStore(activeWorkspace); const entity = store.setting_entities.find(item => item.id === id); if (!entity) return false; store.setting_entities = store.setting_entities.filter(item => item.id !== id); store.chapter_setting_usage = store.chapter_setting_usage.filter(item => item.entity_id !== id); await writeStore(activeWorkspace, store); return true }
export async function listNovelChapterSettingUsage(activeWorkspace: string, projectId: number, chapterId?: number) { const store = await readStore(activeWorkspace); return dedupById(store.chapter_setting_usage.filter(item => item.project_id === projectId && (!chapterId || item.chapter_id === chapterId))) }
export async function replaceNovelChapterSettingUsage(activeWorkspace: string, projectId: number, chapterId: number, usage: Partial<NovelChapterSettingUsageRecord>[]) { const store = await readStore(activeWorkspace); store.chapter_setting_usage = store.chapter_setting_usage.filter(item => !(item.project_id === projectId && item.chapter_id === chapterId)); let nextId = store.chapter_setting_usage.reduce((max, item) => Math.max(max, item.id), 0) + 1; const records = usage.map(item => normalizeChapterSettingUsageRecord({ ...item, project_id: projectId, chapter_id: chapterId }, { id: nextId++ })).filter(item => item.entity_id > 0); store.chapter_setting_usage.push(...records); await writeStore(activeWorkspace, store); return records }
export async function updateNovelChapterSettingUsage(activeWorkspace: string, id: number, data: Partial<NovelChapterSettingUsageRecord>) { const store = await readStore(activeWorkspace); const idx = store.chapter_setting_usage.findIndex(item => item.id === id); if (idx < 0) return null; const current = store.chapter_setting_usage[idx]; store.chapter_setting_usage[idx] = normalizeChapterSettingUsageRecord(data, current); await writeStore(activeWorkspace, store); return store.chapter_setting_usage[idx] }
export async function listNovelOutlines(activeWorkspace: string, projectId: number) { const store = await readStore(activeWorkspace); return dedupById(store.outlines.filter(item => item.project_id === projectId)) }
export async function createNovelOutline(activeWorkspace: string, data: Partial<NovelOutlineRecord>) { const store = await readStore(activeWorkspace); const record = normalizeOutlineRecord(data, { id: store.outlines.reduce((max, item) => Math.max(max, item.id), 0) + 1 }); store.outlines.push(record); await writeStore(activeWorkspace, store); return record }
export async function updateNovelOutline(activeWorkspace: string, id: number, data: Partial<NovelOutlineRecord>) { const store = await readStore(activeWorkspace); const idx = store.outlines.findIndex(item => item.id === id); if (idx < 0) return null; const current = store.outlines[idx]; store.outlines[idx] = normalizeOutlineRecord(data, current); await writeStore(activeWorkspace, store); return store.outlines[idx] }
export async function listNovelChapters(activeWorkspace: string, projectId: number) { const store = await readStore(activeWorkspace); return dedupById(store.chapters.filter(item => item.project_id === projectId)).sort((a, b) => a.chapter_no - b.chapter_no) }
export async function createNovelChapter(activeWorkspace: string, data: Partial<NovelChapterRecord>) { const store = await readStore(activeWorkspace); const record = normalizeChapterRecord(data, { id: store.chapters.reduce((max, item) => Math.max(max, item.id), 0) + 1 }); store.chapters.push(record); await writeStore(activeWorkspace, store); return record }
export async function upsertNovelChapterByNumber(activeWorkspace: string, data: Partial<NovelChapterRecord>) {
  const projectId = Number(data.project_id || 0)
  const chapterNo = Number(data.chapter_no || 0)
  const existing = (await listNovelChapters(activeWorkspace, projectId)).find(item => Number(item.chapter_no) === chapterNo)
  if (existing) return updateNovelChapter(activeWorkspace, existing.id, data, { createVersion: false })
  return createNovelChapter(activeWorkspace, data)
}
function outlineChapterNo(outline: Partial<NovelOutlineRecord>) {
  const raw = outline.raw_payload || {}
  const rawNo = Number((raw as any).chapter_no || (raw as any).chapterNo || (raw as any).future100?.chapter_no || (raw as any).rollingPlan?.chapter_no || 0)
  if (rawNo) return rawNo
  const match = String(outline.title || '').match(/第\s*(\d+)\s*章/)
  return match ? Number(match[1]) : 0
}
function cleanChapterPlanTitle(chapterNo: number, title: any) {
  const text = String(title || '').trim()
  if (!text) return `第${chapterNo}章`
  return text
    .replace(new RegExp(`^第\\s*${chapterNo}\\s*章[\\s:：、-]*`), '')
    .replace(/^第\s*\d+\s*章[\s:：、-]*/, '')
    .trim() || `第${chapterNo}章`
}
function chapterPlanOutlineTitle(chapterNo: number, title: any) {
  const cleanTitle = cleanChapterPlanTitle(chapterNo, title)
  return cleanTitle === `第${chapterNo}章` ? cleanTitle : `第${chapterNo}章 ${cleanTitle}`
}
function chapterPlanOutlineSummary(data: Partial<NovelChapterRecord>) {
  return [
    data.chapter_goal ? `目标：${data.chapter_goal}` : '',
    data.chapter_summary ? `摘要：${data.chapter_summary}` : '',
  ].filter(Boolean).join('\n')
}
export async function syncNovelChapterPlanByNumber(activeWorkspace: string, data: Partial<NovelChapterRecord>, options: {
  parent_id?: number | null
  source?: string
} = {}) {
  const projectId = Number(data.project_id || 0)
  const chapterNo = Number(data.chapter_no || 0)
  if (!projectId || !chapterNo) return null
  const cleanTitle = cleanChapterPlanTitle(chapterNo, data.title)
  const existingChapters = await listNovelChapters(activeWorkspace, projectId)
  const existingChapter = existingChapters.find(item => Number(item.chapter_no) === chapterNo)
  const outlines = await listNovelOutlines(activeWorkspace, projectId)
  const preferredOutlineId = Number(data.outline_id || existingChapter?.outline_id || 0)
  const existingOutline = outlines.find(outline => Number(outline.id) === preferredOutlineId && String(outline.outline_type || '') === 'chapter')
    || outlines
      .filter(outline => String(outline.outline_type || '') === 'chapter' && outlineChapterNo(outline) === chapterNo)
      .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')) || Number(b.id || 0) - Number(a.id || 0))[0]
    || null
  const source = options.source || (data.raw_payload as any)?.source || (data.raw_payload as any)?.agent_sync?.source || 'chapter_plan'
  const outlineData: Partial<NovelOutlineRecord> = {
    project_id: projectId,
    outline_type: 'chapter',
    parent_id: options.parent_id ?? existingOutline?.parent_id ?? null,
    title: chapterPlanOutlineTitle(chapterNo, cleanTitle),
    summary: chapterPlanOutlineSummary(data),
    conflict_points: data.conflict ? [String(data.conflict)] : [],
    turning_points: toAnyArray((data.raw_payload as any)?.must_advance ?? (data.raw_payload as any)?.rollingPlan?.payoff ?? []),
    hook: String(data.ending_hook || ''),
    raw_payload: {
      ...(existingOutline?.raw_payload || {}),
      ...(data.raw_payload || {}),
      source,
      chapter_no: chapterNo,
      synced_from_chapter_plan_at: nowIso(),
    },
  }
  const outline = existingOutline?.id
    ? await updateNovelOutline(activeWorkspace, existingOutline.id, outlineData)
    : await createNovelOutline(activeWorkspace, outlineData)
  if (!outline) return null
  const chapter = await upsertNovelChapterByNumber(activeWorkspace, {
    ...data,
    project_id: projectId,
    outline_id: outline.id,
    chapter_no: chapterNo,
    title: cleanTitle,
    raw_payload: {
      ...(data.raw_payload || {}),
      source,
      chapter_outline_id: outline.id,
      chapter_no: chapterNo,
    },
  } as Partial<NovelChapterRecord>)
  return { outline, chapter }
}
type UpdateNovelChapterOptions = { createVersion?: boolean; versionSource?: NovelChapterVersionSource; forceVersion?: boolean }
function versionedChapterSnapshotChanged(current: NovelChapterRecord, next: NovelChapterRecord) {
  return (
    String(current.chapter_text || '') !== String(next.chapter_text || '') ||
    JSON.stringify(current.scene_breakdown || []) !== JSON.stringify(next.scene_breakdown || []) ||
    JSON.stringify(current.continuity_notes || []) !== JSON.stringify(next.continuity_notes || [])
  )
}
function createChapterVersionRecord(store: NovelStore, data: Partial<NovelChapterVersionRecord>): NovelChapterVersionRecord { return { id: store.chapter_versions.reduce((max, item) => Math.max(max, item.id), 0) + 1, chapter_id: Number(data.chapter_id || 0), project_id: Number(data.project_id || 0), version_no: Number(data.version_no || 1), chapter_text: String(data.chapter_text || ''), scene_breakdown: toAnyArray(data.scene_breakdown), continuity_notes: toStringArray(data.continuity_notes), source: data.source || 'manual_edit', created_at: String(data.created_at || nowIso()) } }
export async function appendChapterVersion(activeWorkspace: string, data: Partial<NovelChapterVersionRecord>) { const store = await readStore(activeWorkspace); const record = createChapterVersionRecord(store, data); store.chapter_versions.push(record); await writeStore(activeWorkspace, store); return record }
export async function listChapterVersions(activeWorkspace: string, chapterId: number) { const store = await readStore(activeWorkspace); return store.chapter_versions.filter(item => item.chapter_id === chapterId).sort((a, b) => b.version_no - a.version_no) }
export async function rollbackChapterVersion(activeWorkspace: string, chapterId: number, versionId: number) { const store = await readStore(activeWorkspace); const idx = store.chapters.findIndex(item => item.id === chapterId); const version = store.chapter_versions.find(item => item.id === versionId && item.chapter_id === chapterId); if (idx < 0 || !version) return null; const current = store.chapters[idx]; store.chapter_versions.push(createChapterVersionRecord(store, { chapter_id: current.id, project_id: current.project_id, version_no: store.chapter_versions.filter(v => v.chapter_id === current.id).length + 1, chapter_text: current.chapter_text || '', scene_breakdown: current.scene_breakdown || [], continuity_notes: current.continuity_notes || [], source: 'rollback' })); store.chapters[idx] = { ...current, chapter_text: version.chapter_text, scene_breakdown: version.scene_breakdown || [], continuity_notes: version.continuity_notes || [], updated_at: nowIso() }; await writeStore(activeWorkspace, store); return store.chapters[idx] }
export async function updateNovelChapter(activeWorkspace: string, chapterId: number, data: Partial<NovelChapterRecord>, options: UpdateNovelChapterOptions = {}) { const store = await readStore(activeWorkspace); const idx = store.chapters.findIndex(item => item.id === chapterId); if (idx < 0) return null; const current = store.chapters[idx]; const updated = normalizeChapterRecord(data, { ...current, id: current.id, updated_at: nowIso() }); const next = { ...current, ...updated, updated_at: nowIso() }; const shouldCreateVersion = options.createVersion !== false && (options.forceVersion || versionedChapterSnapshotChanged(current, next)); if (shouldCreateVersion) store.chapter_versions.push(createChapterVersionRecord(store, { chapter_id: current.id, project_id: current.project_id, version_no: store.chapter_versions.filter(v => v.chapter_id === current.id).length + 1, chapter_text: current.chapter_text || '', scene_breakdown: current.scene_breakdown || [], continuity_notes: current.continuity_notes || [], source: options.versionSource || 'manual_edit' })); store.chapters[idx] = next; await writeStore(activeWorkspace, store); return store.chapters[idx] }
export async function deleteNovelChapter(activeWorkspace: string, chapterId: number) { const store = await readStore(activeWorkspace); const chapter = store.chapters.find(item => item.id === chapterId); if (!chapter) return false; store.chapters = store.chapters.filter(item => item.id !== chapterId); store.chapter_versions = store.chapter_versions.filter(item => item.chapter_id !== chapterId); await writeStore(activeWorkspace, store); return true }
export async function deleteNovelOutline(activeWorkspace: string, outlineId: number) { const store = await readStore(activeWorkspace); const outline = store.outlines.find(item => item.id === outlineId); if (!outline) return false; store.outlines = store.outlines.filter(item => item.id !== outlineId); store.chapters = store.chapters.map(chapter => chapter.outline_id === outlineId ? { ...chapter, outline_id: null } : chapter); await writeStore(activeWorkspace, store); return true }
export async function deleteNovelProject(activeWorkspace: string, projectId: number) { const store = await readStore(activeWorkspace); const project = store.projects.find(item => item.id === projectId); if (!project) return false; store.projects = store.projects.filter(item => item.id !== projectId); store.worldbuilding = store.worldbuilding.filter(item => item.project_id !== projectId); store.characters = store.characters.filter(item => item.project_id !== projectId); store.outlines = store.outlines.filter(item => item.project_id !== projectId); store.chapters = store.chapters.filter(item => item.project_id !== projectId); store.chapter_versions = store.chapter_versions.filter(item => item.project_id !== projectId); store.reviews = store.reviews.filter(item => item.project_id !== projectId); store.runs = store.runs.filter(item => item.project_id !== projectId); store.setting_entities = store.setting_entities.filter(item => item.project_id !== projectId); store.chapter_setting_usage = store.chapter_setting_usage.filter(item => item.project_id !== projectId); await writeStore(activeWorkspace, store); return true }
export async function listNovelReviews(activeWorkspace: string, projectId: number) { const store = await readStore(activeWorkspace); return store.reviews.filter(item => item.project_id === projectId) }
export async function createNovelReview(activeWorkspace: string, data: Partial<NovelReviewRecord>) { const store = await readStore(activeWorkspace); const record = normalizeReviewRecord(data, { id: store.reviews.reduce((max, item) => Math.max(max, item.id), 0) + 1 }); store.reviews.push(record); await writeStore(activeWorkspace, store); return record }
export async function listNovelRuns(activeWorkspace: string, projectId: number) { const store = await readStore(activeWorkspace); return store.runs.filter(item => item.project_id === projectId).sort((a, b) => b.created_at.localeCompare(a.created_at)) }
export async function appendNovelRun(activeWorkspace: string, data: Partial<NovelRunRecord>) { const store = await readStore(activeWorkspace); const record = normalizeRunRecord(data, { id: store.runs.reduce((max, item) => Math.max(max, item.id), 0) + 1 }); store.runs.push(record); await writeStore(activeWorkspace, store); return record }
export async function updateNovelRun(activeWorkspace: string, id: number, data: Partial<NovelRunRecord>) { const store = await readStore(activeWorkspace); const idx = store.runs.findIndex(item => item.id === id); if (idx < 0) return null; store.runs[idx] = normalizeRunRecord(data, store.runs[idx]); await writeStore(activeWorkspace, store); return store.runs[idx] }
export async function listNovelProjectSeedDrafts(activeWorkspace: string) {
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const rows = db.query('SELECT * FROM project_seed_drafts ORDER BY updated_at DESC, id DESC').all() as any[]
    return rows.map(projectSeedDraftFromRow)
  } finally {
    db.close()
  }
}
export async function createNovelProjectSeedDraft(activeWorkspace: string, data: Partial<NovelProjectSeedDraftRecord>) {
  const draft = normalizeProjectSeedDraftRecord(data)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const result = db.query('INSERT INTO project_seed_drafts (title,idea,seed,review_model,diagnostics,model_id,source,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').run(
      draft.title,
      draft.idea || '',
      jsonText(draft.seed, {}),
      jsonText(draft.review_model, {}),
      jsonText(draft.diagnostics, {}),
      draft.model_id ?? null,
      draft.source || 'deep_draft',
      draft.created_at,
      draft.updated_at,
    ) as any
    const id = Number(result?.lastInsertRowid || (db.query('SELECT last_insert_rowid() AS id').get() as any)?.id || 0)
    const row = db.query('SELECT * FROM project_seed_drafts WHERE id=?').get(id) as any
    return projectSeedDraftFromRow(row)
  } finally {
    db.close()
  }
}
export async function deleteNovelProjectSeedDraft(activeWorkspace: string, id: number) {
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const result = db.query('DELETE FROM project_seed_drafts WHERE id=?').run(id) as any
    return Number(result?.changes || 0) > 0
  } finally {
    db.close()
  }
}
