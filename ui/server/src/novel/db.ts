import { Database } from 'bun:sqlite'
import { dbPathFromEnv, getNovelDbPath, sqliteBusyTimeoutMs } from './paths'
import { backfillNovelRunPipelineSummaries } from './storage-compaction'

export function openDb(activeWorkspace: string) {
  const db = new Database(dbPathFromEnv() || getNovelDbPath(activeWorkspace))
  db.exec(`PRAGMA busy_timeout = ${sqliteBusyTimeoutMs()}`)
  return db
}

export function tableExists(db: Database, name: string) { return !!db.query("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name) }

export function hasColumn(db: Database, table: string, column: string) {
  return (db.query(`PRAGMA table_info(${table})`).all() as any[]).some(item => item.name === column)
}

export function addColumnIfMissing(db: Database, table: string, column: string, definition: string) {
  if (!hasColumn(db, table, column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
}

export function ensureSqliteSchema(db: Database) {
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
  pipeline_chapter_failure_count INTEGER DEFAULT NULL,
  pipeline_open_task_count INTEGER DEFAULT NULL,
  pipeline_task_count INTEGER DEFAULT NULL,
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
CREATE INDEX IF NOT EXISTS idx_chapters_project_chapter_no ON chapters(project_id, chapter_no);
CREATE INDEX IF NOT EXISTS idx_chapters_outline_id ON chapters(outline_id);
CREATE INDEX IF NOT EXISTS idx_chapters_chapter_no ON chapters(chapter_no);
CREATE INDEX IF NOT EXISTS idx_chapter_versions_chapter_id ON chapter_versions(chapter_id);
CREATE INDEX IF NOT EXISTS idx_reviews_project_id ON reviews(project_id);
CREATE INDEX IF NOT EXISTS idx_runs_project_id ON runs(project_id);
CREATE INDEX IF NOT EXISTS idx_runs_project_created_at ON runs(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_seed_drafts_updated_at ON project_seed_drafts(updated_at);
CREATE INDEX IF NOT EXISTS idx_setting_entities_project_type ON setting_entities(project_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_setting_entities_project_name ON setting_entities(project_id, name);
CREATE INDEX IF NOT EXISTS idx_chapter_setting_usage_chapter ON chapter_setting_usage(chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_setting_usage_entity ON chapter_setting_usage(entity_id);
CREATE INDEX IF NOT EXISTS idx_chapter_setting_usage_project_chapter ON chapter_setting_usage(project_id, chapter_id);
`)
  for (const [table, columns] of Object.entries({
    projects: [['synopsis', "TEXT DEFAULT ''"], ['reference_config', "TEXT DEFAULT '{}'"]],
    worldbuilding: [['items', "TEXT DEFAULT '[]'"], ['raw_payload', "TEXT DEFAULT '{}'"]],
    characters: [['role', "TEXT DEFAULT ''"], ['personality', "TEXT DEFAULT '[]'"], ['abilities', "TEXT DEFAULT '[]'"], ['backstory', "TEXT DEFAULT ''"], ['relationships', "TEXT DEFAULT '[]'"], ['relationship_graph', "TEXT DEFAULT '{}'"], ['growth_arc', "TEXT DEFAULT ''"], ['arc_hint', "TEXT DEFAULT ''"], ['current_state', "TEXT DEFAULT '{}'"], ['secret', "TEXT DEFAULT ''"], ['appearance', "TEXT DEFAULT ''"], ['status', "TEXT DEFAULT 'active'"], ['version', 'INTEGER DEFAULT 1'], ['raw_payload', "TEXT DEFAULT '{}'"], ['created_at', "TEXT DEFAULT ''"]],
    outlines: [['beats', "TEXT DEFAULT '[]'"], ['target_length', "TEXT DEFAULT ''"], ['version', 'INTEGER DEFAULT 1'], ['raw_payload', "TEXT DEFAULT '{}'"], ['created_at', "TEXT DEFAULT ''"]],
    chapters: [['scene_list', "TEXT DEFAULT '[]'"], ['items_in_play', "TEXT DEFAULT '[]'"], ['foreshadowing', "TEXT DEFAULT '[]'"], ['timeline_note', "TEXT DEFAULT ''"], ['version', 'INTEGER DEFAULT 1'], ['published_at', 'TEXT DEFAULT NULL'], ['raw_payload', "TEXT DEFAULT '{}'"]],
    reviews: [['payload', "TEXT DEFAULT ''"], ['status', "TEXT DEFAULT 'ok'"]],
    runs: [['pipeline_chapter_failure_count', 'INTEGER DEFAULT NULL'], ['pipeline_open_task_count', 'INTEGER DEFAULT NULL'], ['pipeline_task_count', 'INTEGER DEFAULT NULL']],
    project_seed_drafts: [['review_model', "TEXT DEFAULT '{}'"], ['diagnostics', "TEXT DEFAULT '{}'"], ['model_id', 'INTEGER DEFAULT NULL'], ['source', "TEXT DEFAULT 'deep_draft'"]],
    setting_entities: [['payload_json', "TEXT DEFAULT '{}'"], ['state_json', "TEXT DEFAULT '{}'"], ['constraints_json', "TEXT DEFAULT '{}'"]],
    chapter_setting_usage: [['expected_state_change', "TEXT DEFAULT '{}'"], ['actual_state_change', "TEXT DEFAULT '{}'"]],
  } as Record<string, Array<[string, string]>>)) {
    if (!tableExists(db, table)) continue
    for (const [column, definition] of columns) addColumnIfMissing(db, table, column, definition)
  }
  backfillNovelRunPipelineSummaries(db)
}

export function nullableSqliteBoolean(value: any) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['false', '0', 'no', 'failed', 'fail'].includes(normalized)) return false
    if (['true', '1', 'yes', 'passed', 'pass', 'ok'].includes(normalized)) return true
  }
  return Boolean(value)
}
