-- SQLite migration draft for MangaForge Studio novel workspace
-- Based on docs/schema.md

PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  genre TEXT DEFAULT '',
  sub_genres TEXT DEFAULT '[]',
  length_target TEXT DEFAULT 'medium',
  target_audience TEXT DEFAULT '',
  style_tags TEXT DEFAULT '[]',
  commercial_tags TEXT DEFAULT '[]',
  status TEXT DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

CREATE TABLE IF NOT EXISTS worldbuilding (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  world_summary TEXT DEFAULT '',
  rules TEXT DEFAULT '[]',
  factions TEXT DEFAULT '[]',
  locations TEXT DEFAULT '[]',
  systems TEXT DEFAULT '[]',
  timeline_anchor TEXT DEFAULT '',
  known_unknowns TEXT DEFAULT '[]',
  version INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_worldbuilding_project_id ON worldbuilding(project_id);
CREATE INDEX IF NOT EXISTS idx_worldbuilding_project_version ON worldbuilding(project_id, version);

CREATE TABLE IF NOT EXISTS characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  role_type TEXT DEFAULT '',
  archetype TEXT DEFAULT '',
  motivation TEXT DEFAULT '',
  goal TEXT DEFAULT '',
  conflict TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_characters_project_id ON characters(project_id);
CREATE INDEX IF NOT EXISTS idx_characters_name ON characters(name);

CREATE TABLE IF NOT EXISTS outlines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  outline_type TEXT NOT NULL DEFAULT 'master',
  title TEXT NOT NULL,
  summary TEXT DEFAULT '',
  conflict_points TEXT DEFAULT '[]',
  turning_points TEXT DEFAULT '[]',
  hook TEXT DEFAULT '',
  parent_id INTEGER DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES outlines(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_outlines_project_id ON outlines(project_id);
CREATE INDEX IF NOT EXISTS idx_outlines_parent_id ON outlines(parent_id);
CREATE INDEX IF NOT EXISTS idx_outlines_type ON outlines(outline_type);

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
  continuity_notes TEXT DEFAULT '[]',
  status TEXT DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (outline_id) REFERENCES outlines(id) ON DELETE SET NULL,
  UNIQUE(project_id, chapter_no)
);

CREATE INDEX IF NOT EXISTS idx_chapters_project_id ON chapters(project_id);
CREATE INDEX IF NOT EXISTS idx_chapters_outline_id ON chapters(outline_id);
CREATE INDEX IF NOT EXISTS idx_chapters_chapter_no ON chapters(chapter_no);
CREATE INDEX IF NOT EXISTS idx_chapters_status ON chapters(status);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  review_type TEXT NOT NULL,
  status TEXT NOT NULL,
  summary TEXT DEFAULT '',
  issues TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reviews_project_id ON reviews(project_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_type ON reviews(review_type);

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

CREATE INDEX IF NOT EXISTS idx_runs_project_id ON runs(project_id);
CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs(created_at);
CREATE INDEX IF NOT EXISTS idx_runs_type ON runs(run_type);
CREATE INDEX IF NOT EXISTS idx_runs_step_name ON runs(step_name);

COMMIT;
