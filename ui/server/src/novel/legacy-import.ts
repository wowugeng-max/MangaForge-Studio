import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import type { Database } from 'bun:sqlite'
import type {
  NovelStore, NovelProjectRecord, NovelWorldbuildingRecord, NovelCharacterRecord, NovelOutlineRecord,
  NovelChapterRecord, NovelChapterVersionRecord, NovelReviewRecord, NovelRunRecord, NovelSettingEntityRecord,
  NovelChapterSettingUsageRecord,
} from './types'
import { openDb, ensureSqliteSchema } from './db'
import { getNovelStorePath } from './paths'
import { withNovelWorkspaceMutation, assertNovelWorkspaceMutationHeld } from './lock'
import { jsonText, textValue, nowIso } from './json'
import {
  projectFromRow, worldbuildingFromRow, characterFromRow, outlineFromRow, chapterFromRow, chapterVersionFromRow,
  reviewFromRow, settingEntityFromRow, chapterSettingUsageFromRow,
} from './row-mappers'
import { normalizeRunRecord } from './normalize'

export function normalizeStore(store: Partial<NovelStore> | null | undefined): NovelStore { return { projects: Array.isArray(store?.projects) ? store!.projects : [], worldbuilding: Array.isArray(store?.worldbuilding) ? store!.worldbuilding : [], characters: Array.isArray(store?.characters) ? store!.characters : [], outlines: Array.isArray(store?.outlines) ? store!.outlines : [], chapters: Array.isArray(store?.chapters) ? store!.chapters : [], chapter_versions: Array.isArray(store?.chapter_versions) ? store!.chapter_versions : [], reviews: Array.isArray(store?.reviews) ? store!.reviews : [], runs: Array.isArray(store?.runs) ? store!.runs : [], setting_entities: Array.isArray(store?.setting_entities) ? store!.setting_entities : [], chapter_setting_usage: Array.isArray(store?.chapter_setting_usage) ? store!.chapter_setting_usage : [] } }

export async function readJsonStore(activeWorkspace: string): Promise<NovelStore> { try { return normalizeStore(JSON.parse(await readFile(getNovelStorePath(activeWorkspace), 'utf8')) as Partial<NovelStore>) } catch { return normalizeStore(null) } }

export function loadStoreFromOpenDb(db: Database): NovelStore {
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
      projects: projects.map(projectFromRow),
      worldbuilding: worldbuilding.map(worldbuildingFromRow),
      characters: characters.map(characterFromRow),
      outlines: outlines.map(outlineFromRow),
      chapters: chapters.map(chapterFromRow),
      chapter_versions: chapterVersions.map(chapterVersionFromRow),
      reviews: reviews.map(reviewFromRow),
      runs,
      setting_entities: settingEntities.map(settingEntityFromRow),
      chapter_setting_usage: chapterSettingUsage.map(chapterSettingUsageFromRow),
    }
  } catch (error) {
    if (String(error).includes('no such table')) return normalizeStore(null)
    throw error
  }
}

export function storeScore(store: NovelStore) { return Object.values(store).reduce((sum, value) => sum + (Array.isArray(value) ? value.length : 0), 0) }

export async function readStore(activeWorkspace: string): Promise<NovelStore> {
  const db = openDb(activeWorkspace)
  try {
    const dbStore = loadStoreFromOpenDb(db)
    if (storeScore(dbStore) > 0) return dbStore
    const jsonStore = await readJsonStore(activeWorkspace)
    if (storeScore(jsonStore) > storeScore(dbStore)) {
      db.close()
      return withNovelWorkspaceMutation(activeWorkspace, async () => {
        await importLegacyNovelStoreIfNeeded(activeWorkspace, jsonStore)
        const migrated = openDb(activeWorkspace)
        try { return loadStoreFromOpenDb(migrated) } finally { migrated.close() }
      })
    }
    return dbStore
  } finally {
    try { db.close() } catch { /* already closed during migration */ }
  }
}

export async function ensureLegacyNovelStoreImportedForRead(activeWorkspace: string) {
  if (!existsSync(getNovelStorePath(activeWorkspace))) return
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    if (db.query('SELECT 1 AS present FROM projects LIMIT 1').get()) return
  } finally {
    db.close()
  }
  const jsonStore = await readJsonStore(activeWorkspace)
  if (storeScore(jsonStore) === 0) return
  await withNovelWorkspaceMutation(activeWorkspace, () => importLegacyNovelStoreIfNeeded(activeWorkspace, jsonStore), 'legacy-read-import')
}

export function replaceStoreInOpenDb(db: Database, store: NovelStore) {
  const normalized = normalizeStore(store)
  for (const table of ['chapter_setting_usage','setting_entities','runs','reviews','chapter_versions','chapters','outlines','characters','worldbuilding','projects']) db.exec(`DELETE FROM ${table}`)
  const insert = (sql: string, params: any[]) => db.query(sql).run(...params)
    for (const p of normalized.projects) insert('INSERT INTO projects (id,title,genre,sub_genres,synopsis,length_target,target_audience,style_tags,commercial_tags,reference_config,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [p.id,p.title,p.genre||'',jsonText(p.sub_genres),p.synopsis||'',p.length_target||'medium',p.target_audience||'',jsonText(p.style_tags),jsonText(p.commercial_tags),jsonText(p.reference_config, {}),p.status||'draft',p.created_at||nowIso(),p.updated_at||nowIso()])
    for (const w of normalized.worldbuilding) insert('INSERT INTO worldbuilding (id,project_id,world_summary,rules,factions,locations,systems,items,timeline_anchor,known_unknowns,version,raw_payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [w.id,w.project_id,w.world_summary||'',jsonText(w.rules),jsonText(w.factions),jsonText(w.locations),jsonText(w.systems),jsonText(w.items),textValue(w.timeline_anchor),jsonText(w.known_unknowns),w.version||1,jsonText(w.raw_payload || w, {}),w.created_at||nowIso(),w.updated_at||nowIso()])
    for (const c of normalized.characters) insert('INSERT INTO characters (id,project_id,name,role,role_type,archetype,personality,motivation,goal,conflict,abilities,backstory,relationships,relationship_graph,growth_arc,arc_hint,current_state,secret,appearance,status,version,raw_payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [c.id,c.project_id,c.name,c.role||'',c.role_type||c.role||'',c.archetype||'',jsonText(c.personality),c.motivation||'',c.goal||'',c.conflict||'',jsonText(c.abilities),c.backstory||'',jsonText(c.relationships),jsonText(c.relationship_graph, {}),c.growth_arc||'',c.arc_hint||'',jsonText(c.current_state, {}),c.secret||'',c.appearance||'',c.status||'active',c.version||1,jsonText(c.raw_payload || c, {}),c.created_at||c.updated_at||nowIso(),c.updated_at||nowIso()])
    for (const o of normalized.outlines) insert('INSERT INTO outlines (id,project_id,outline_type,title,summary,beats,conflict_points,turning_points,hook,target_length,version,parent_id,raw_payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [o.id,o.project_id,o.outline_type||'master',o.title,o.summary||'',jsonText(o.beats),jsonText(o.conflict_points),jsonText(o.turning_points),o.hook||'',o.target_length||'',o.version||1,o.parent_id ?? null,jsonText(o.raw_payload || o, {}),o.created_at||nowIso(),o.updated_at||nowIso()])
    for (const c of normalized.chapters) insert('INSERT INTO chapters (id,project_id,outline_id,chapter_no,title,chapter_goal,chapter_summary,conflict,ending_hook,chapter_text,scene_breakdown,scene_list,continuity_notes,items_in_play,foreshadowing,timeline_note,status,version,published_at,raw_payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [c.id,c.project_id,c.outline_id ?? null,c.chapter_no,c.title,c.chapter_goal||'',c.chapter_summary||'',c.conflict||'',c.ending_hook||'',c.chapter_text||'',jsonText(c.scene_breakdown),jsonText(c.scene_list || c.scene_breakdown),jsonText(c.continuity_notes),jsonText(c.items_in_play),jsonText(c.foreshadowing),c.timeline_note||'',c.status||'draft',c.version||1,c.published_at||null,jsonText(c.raw_payload || c, {}),c.created_at||nowIso(),c.updated_at||nowIso()])
    for (const v of normalized.chapter_versions) insert('INSERT INTO chapter_versions (id,chapter_id,project_id,version_no,chapter_text,scene_breakdown,continuity_notes,source,created_at) VALUES (?,?,?,?,?,?,?,?,?)', [v.id,v.chapter_id,v.project_id,v.version_no,v.chapter_text||'',jsonText(v.scene_breakdown||[]),jsonText(v.continuity_notes||[]),v.source||'manual_edit',v.created_at||nowIso()])
    for (const r of normalized.reviews) insert('INSERT INTO reviews (id,project_id,review_type,status,summary,issues,payload,created_at) VALUES (?,?,?,?,?,?,?,?)', [r.id,r.project_id,r.review_type,r.status,r.summary||'',jsonText(r.issues||[]),r.payload||'',r.created_at||nowIso()])
    for (const rawRun of normalized.runs) {
      const r = normalizeRunRecord(rawRun)
      insert('INSERT INTO runs (id,project_id,run_type,step_name,status,input_ref,output_ref,duration_ms,error_message,pipeline_chapter_failure_count,pipeline_open_task_count,pipeline_task_count,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [r.id,r.project_id,r.run_type,r.step_name,r.status,r.input_ref||'',r.output_ref||'',r.duration_ms||0,r.error_message||'',r.pipeline_chapter_failure_count ?? 0,r.pipeline_open_task_count ?? 0,r.pipeline_task_count ?? 0,r.created_at||nowIso()])
    }
    for (const s of normalized.setting_entities) insert('INSERT INTO setting_entities (id,project_id,entity_type,name,summary,status,visibility,first_chapter_no,last_chapter_no,related_character_ids,related_chapter_ids,related_entity_ids,constraints_json,state_json,payload_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [s.id,s.project_id,s.entity_type||'rule',s.name,s.summary||'',s.status||'active',s.visibility||'public',s.first_chapter_no ?? null,s.last_chapter_no ?? null,jsonText(s.related_character_ids, []),jsonText(s.related_chapter_ids, []),jsonText(s.related_entity_ids, []),jsonText(s.constraints_json, {}),jsonText(s.state_json, {}),jsonText(s.payload_json || s, {}),s.created_at||nowIso(),s.updated_at||nowIso()])
  for (const u of normalized.chapter_setting_usage) insert('INSERT INTO chapter_setting_usage (id,project_id,chapter_id,entity_id,usage_type,required,allowed,forbidden,reveal_level,expected_state_change,actual_state_change,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [u.id,u.project_id,u.chapter_id,u.entity_id,u.usage_type||'allowed',u.required ? 1 : 0,u.allowed === false ? 0 : 1,u.forbidden ? 1 : 0,u.reveal_level||'none',jsonText(u.expected_state_change, {}),jsonText(u.actual_state_change, {}),u.created_at||nowIso(),u.updated_at||nowIso()])
}

export async function importLegacyNovelStoreIfNeeded(activeWorkspace: string, knownJsonStore?: NovelStore) {
  assertNovelWorkspaceMutationHeld(activeWorkspace)
  const jsonStore = knownJsonStore || await readJsonStore(activeWorkspace)
  if (storeScore(jsonStore) === 0) return
  const db = openDb(activeWorkspace)
  let committed = false
  try {
    ensureSqliteSchema(db)
    db.exec('BEGIN IMMEDIATE')
    if (storeScore(loadStoreFromOpenDb(db)) === 0) replaceStoreInOpenDb(db, jsonStore)
    db.exec('COMMIT')
    committed = true
  } catch (error) {
    if (!committed) {
      try { db.exec('ROLLBACK') } catch { /* transaction may not have started */ }
    }
    throw error
  } finally {
    db.close()
  }
}
