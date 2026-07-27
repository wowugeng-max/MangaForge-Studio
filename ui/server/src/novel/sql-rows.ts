import type { Database } from 'bun:sqlite'
import type {
  NovelProjectRecord, NovelWorldbuildingRecord, NovelCharacterRecord, NovelOutlineRecord,
  NovelChapterRecord, NovelChapterVersionRecord, NovelSettingEntityRecord, NovelChapterSettingUsageRecord,
  NovelRunRecord,
} from './types'
import { openDb, ensureSqliteSchema } from './db'
import { withNovelWorkspaceMutation } from './lock'
import { importLegacyNovelStoreIfNeeded } from './legacy-import'
import { getNovelMutationTestHook } from '../novel-test-support'
import { jsonText, textValue, nowIso } from './json'

export function nextTableId(db: Database, table: string): number {
  return Number((db.query(`SELECT COALESCE(MAX(id), 0) + 1 AS id FROM ${table}`).get() as any)?.id || 1)
}

export function insertProjectRow(db: Database, p: NovelProjectRecord) {
  db.query('INSERT INTO projects (id,title,genre,sub_genres,synopsis,length_target,target_audience,style_tags,commercial_tags,reference_config,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
    p.id, p.title, p.genre || '', jsonText(p.sub_genres), p.synopsis || '', p.length_target || 'medium', p.target_audience || '', jsonText(p.style_tags), jsonText(p.commercial_tags), jsonText(p.reference_config, {}), p.status || 'draft', p.created_at || nowIso(), p.updated_at || nowIso(),
  )
}

export function updateProjectRow(db: Database, p: NovelProjectRecord) {
  db.query('UPDATE projects SET title=?,genre=?,sub_genres=?,synopsis=?,length_target=?,target_audience=?,style_tags=?,commercial_tags=?,reference_config=?,status=?,created_at=?,updated_at=? WHERE id=?').run(
    p.title, p.genre || '', jsonText(p.sub_genres), p.synopsis || '', p.length_target || 'medium', p.target_audience || '', jsonText(p.style_tags), jsonText(p.commercial_tags), jsonText(p.reference_config, {}), p.status || 'draft', p.created_at || nowIso(), p.updated_at || nowIso(), p.id,
  )
}

export function insertWorldbuildingRow(db: Database, w: NovelWorldbuildingRecord) {
  db.query('INSERT INTO worldbuilding (id,project_id,world_summary,rules,factions,locations,systems,items,timeline_anchor,known_unknowns,version,raw_payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
    w.id, w.project_id, w.world_summary || '', jsonText(w.rules), jsonText(w.factions), jsonText(w.locations), jsonText(w.systems), jsonText(w.items), textValue(w.timeline_anchor), jsonText(w.known_unknowns), w.version || 1, jsonText(w.raw_payload || w, {}), w.created_at || nowIso(), w.updated_at || nowIso(),
  )
}

export function updateWorldbuildingRow(db: Database, w: NovelWorldbuildingRecord) {
  db.query('UPDATE worldbuilding SET project_id=?,world_summary=?,rules=?,factions=?,locations=?,systems=?,items=?,timeline_anchor=?,known_unknowns=?,version=?,raw_payload=?,created_at=?,updated_at=? WHERE id=?').run(
    w.project_id, w.world_summary || '', jsonText(w.rules), jsonText(w.factions), jsonText(w.locations), jsonText(w.systems), jsonText(w.items), textValue(w.timeline_anchor), jsonText(w.known_unknowns), w.version || 1, jsonText(w.raw_payload || w, {}), w.created_at || nowIso(), w.updated_at || nowIso(), w.id,
  )
}

export function insertCharacterRow(db: Database, c: NovelCharacterRecord) {
  db.query('INSERT INTO characters (id,project_id,name,role,role_type,archetype,personality,motivation,goal,conflict,abilities,backstory,relationships,relationship_graph,growth_arc,arc_hint,current_state,secret,appearance,status,version,raw_payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
    c.id, c.project_id, c.name, c.role || '', c.role_type || c.role || '', c.archetype || '', jsonText(c.personality), c.motivation || '', c.goal || '', c.conflict || '', jsonText(c.abilities), c.backstory || '', jsonText(c.relationships), jsonText(c.relationship_graph, {}), c.growth_arc || '', c.arc_hint || '', jsonText(c.current_state, {}), c.secret || '', c.appearance || '', c.status || 'active', c.version || 1, jsonText(c.raw_payload || c, {}), c.created_at || c.updated_at || nowIso(), c.updated_at || nowIso(),
  )
}

export function updateCharacterRow(db: Database, c: NovelCharacterRecord) {
  db.query('UPDATE characters SET project_id=?,name=?,role=?,role_type=?,archetype=?,personality=?,motivation=?,goal=?,conflict=?,abilities=?,backstory=?,relationships=?,relationship_graph=?,growth_arc=?,arc_hint=?,current_state=?,secret=?,appearance=?,status=?,version=?,raw_payload=?,created_at=?,updated_at=? WHERE id=?').run(
    c.project_id, c.name, c.role || '', c.role_type || c.role || '', c.archetype || '', jsonText(c.personality), c.motivation || '', c.goal || '', c.conflict || '', jsonText(c.abilities), c.backstory || '', jsonText(c.relationships), jsonText(c.relationship_graph, {}), c.growth_arc || '', c.arc_hint || '', jsonText(c.current_state, {}), c.secret || '', c.appearance || '', c.status || 'active', c.version || 1, jsonText(c.raw_payload || c, {}), c.created_at || c.updated_at || nowIso(), c.updated_at || nowIso(), c.id,
  )
}

export function insertOutlineRow(db: Database, o: NovelOutlineRecord) {
  db.query('INSERT INTO outlines (id,project_id,outline_type,title,summary,beats,conflict_points,turning_points,hook,target_length,version,parent_id,raw_payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
    o.id, o.project_id, o.outline_type || 'master', o.title, o.summary || '', jsonText(o.beats), jsonText(o.conflict_points), jsonText(o.turning_points), o.hook || '', o.target_length || '', o.version || 1, o.parent_id ?? null, jsonText(o.raw_payload || o, {}), o.created_at || nowIso(), o.updated_at || nowIso(),
  )
}

export function updateOutlineRow(db: Database, o: NovelOutlineRecord) {
  db.query('UPDATE outlines SET project_id=?,outline_type=?,title=?,summary=?,beats=?,conflict_points=?,turning_points=?,hook=?,target_length=?,version=?,parent_id=?,raw_payload=?,created_at=?,updated_at=? WHERE id=?').run(
    o.project_id, o.outline_type || 'master', o.title, o.summary || '', jsonText(o.beats), jsonText(o.conflict_points), jsonText(o.turning_points), o.hook || '', o.target_length || '', o.version || 1, o.parent_id ?? null, jsonText(o.raw_payload || o, {}), o.created_at || nowIso(), o.updated_at || nowIso(), o.id,
  )
}

export function insertChapterRow(db: Database, c: NovelChapterRecord) {
  db.query('INSERT INTO chapters (id,project_id,outline_id,chapter_no,title,chapter_goal,chapter_summary,conflict,ending_hook,chapter_text,scene_breakdown,scene_list,continuity_notes,items_in_play,foreshadowing,timeline_note,status,version,published_at,raw_payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
    c.id, c.project_id, c.outline_id ?? null, c.chapter_no, c.title, c.chapter_goal || '', c.chapter_summary || '', c.conflict || '', c.ending_hook || '', c.chapter_text || '', jsonText(c.scene_breakdown), jsonText(c.scene_list || c.scene_breakdown), jsonText(c.continuity_notes), jsonText(c.items_in_play), jsonText(c.foreshadowing), c.timeline_note || '', c.status || 'draft', c.version || 1, c.published_at || null, jsonText(c.raw_payload || c, {}), c.created_at || nowIso(), c.updated_at || nowIso(),
  )
}

export function updateChapterRow(db: Database, c: NovelChapterRecord) {
  db.query('UPDATE chapters SET project_id=?,outline_id=?,chapter_no=?,title=?,chapter_goal=?,chapter_summary=?,conflict=?,ending_hook=?,chapter_text=?,scene_breakdown=?,scene_list=?,continuity_notes=?,items_in_play=?,foreshadowing=?,timeline_note=?,status=?,version=?,published_at=?,raw_payload=?,created_at=?,updated_at=? WHERE id=?').run(
    c.project_id, c.outline_id ?? null, c.chapter_no, c.title, c.chapter_goal || '', c.chapter_summary || '', c.conflict || '', c.ending_hook || '', c.chapter_text || '', jsonText(c.scene_breakdown), jsonText(c.scene_list || c.scene_breakdown), jsonText(c.continuity_notes), jsonText(c.items_in_play), jsonText(c.foreshadowing), c.timeline_note || '', c.status || 'draft', c.version || 1, c.published_at || null, jsonText(c.raw_payload || c, {}), c.created_at || nowIso(), c.updated_at || nowIso(), c.id,
  )
}

export function insertChapterVersionRow(db: Database, v: NovelChapterVersionRecord) {
  db.query('INSERT INTO chapter_versions (id,chapter_id,project_id,version_no,chapter_text,scene_breakdown,continuity_notes,source,created_at) VALUES (?,?,?,?,?,?,?,?,?)').run(
    v.id, v.chapter_id, v.project_id, v.version_no, v.chapter_text || '', jsonText(v.scene_breakdown || []), jsonText(v.continuity_notes || []), v.source || 'manual_edit', v.created_at || nowIso(),
  )
}

export function insertSettingEntityRow(db: Database, s: NovelSettingEntityRecord) {
  db.query('INSERT INTO setting_entities (id,project_id,entity_type,name,summary,status,visibility,first_chapter_no,last_chapter_no,related_character_ids,related_chapter_ids,related_entity_ids,constraints_json,state_json,payload_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
    s.id, s.project_id, s.entity_type || 'rule', s.name, s.summary || '', s.status || 'active', s.visibility || 'public', s.first_chapter_no ?? null, s.last_chapter_no ?? null, jsonText(s.related_character_ids, []), jsonText(s.related_chapter_ids, []), jsonText(s.related_entity_ids, []), jsonText(s.constraints_json, {}), jsonText(s.state_json, {}), jsonText(s.payload_json || s, {}), s.created_at || nowIso(), s.updated_at || nowIso(),
  )
}

export function updateSettingEntityRow(db: Database, s: NovelSettingEntityRecord) {
  db.query('UPDATE setting_entities SET project_id=?,entity_type=?,name=?,summary=?,status=?,visibility=?,first_chapter_no=?,last_chapter_no=?,related_character_ids=?,related_chapter_ids=?,related_entity_ids=?,constraints_json=?,state_json=?,payload_json=?,created_at=?,updated_at=? WHERE id=?').run(
    s.project_id, s.entity_type || 'rule', s.name, s.summary || '', s.status || 'active', s.visibility || 'public', s.first_chapter_no ?? null, s.last_chapter_no ?? null, jsonText(s.related_character_ids, []), jsonText(s.related_chapter_ids, []), jsonText(s.related_entity_ids, []), jsonText(s.constraints_json, {}), jsonText(s.state_json, {}), jsonText(s.payload_json || s, {}), s.created_at || nowIso(), s.updated_at || nowIso(), s.id,
  )
}

export function insertChapterSettingUsageRow(db: Database, u: NovelChapterSettingUsageRecord) {
  db.query('INSERT INTO chapter_setting_usage (id,project_id,chapter_id,entity_id,usage_type,required,allowed,forbidden,reveal_level,expected_state_change,actual_state_change,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
    u.id, u.project_id, u.chapter_id, u.entity_id, u.usage_type || 'allowed', u.required ? 1 : 0, u.allowed === false ? 0 : 1, u.forbidden ? 1 : 0, u.reveal_level || 'none', jsonText(u.expected_state_change, {}), jsonText(u.actual_state_change, {}), u.created_at || nowIso(), u.updated_at || nowIso(),
  )
}

export function updateChapterSettingUsageRow(db: Database, u: NovelChapterSettingUsageRecord) {
  db.query('UPDATE chapter_setting_usage SET project_id=?,chapter_id=?,entity_id=?,usage_type=?,required=?,allowed=?,forbidden=?,reveal_level=?,expected_state_change=?,actual_state_change=?,created_at=?,updated_at=? WHERE id=?').run(
    u.project_id, u.chapter_id, u.entity_id, u.usage_type || 'allowed', u.required ? 1 : 0, u.allowed === false ? 0 : 1, u.forbidden ? 1 : 0, u.reveal_level || 'none', jsonText(u.expected_state_change, {}), jsonText(u.actual_state_change, {}), u.created_at || nowIso(), u.updated_at || nowIso(), u.id,
  )
}

export function updateRunRow(db: Database, r: NovelRunRecord) {
  db.query('UPDATE runs SET project_id=?,run_type=?,step_name=?,status=?,input_ref=?,output_ref=?,duration_ms=?,error_message=?,pipeline_chapter_failure_count=?,pipeline_open_task_count=?,pipeline_task_count=?,scope_key=?,updated_at=?,lease_owner=?,lease_expires_at=?,cancel_requested_at=?,created_at=? WHERE id=?').run(
    r.project_id, r.run_type, r.step_name, r.status, r.input_ref || '', r.output_ref || '', r.duration_ms || 0, r.error_message || '', r.pipeline_chapter_failure_count ?? null, r.pipeline_open_task_count ?? null, r.pipeline_task_count ?? null, r.scope_key ?? null, r.updated_at ?? null, r.lease_owner ?? null, r.lease_expires_at ?? null, r.cancel_requested_at ?? null, r.created_at || nowIso(), r.id,
  )
}

export async function withNovelDbWrite<T>(activeWorkspace: string, writer: (db: Database) => T, operation = 'mutation'): Promise<T> {
  return withNovelWorkspaceMutation(activeWorkspace, async () => {
    await importLegacyNovelStoreIfNeeded(activeWorkspace)
    const testHook = getNovelMutationTestHook()
    if (testHook) await testHook({ activeWorkspace, phase: 'before_full_store_write', operation })
    const db = openDb(activeWorkspace)
    let committed = false
    try {
      ensureSqliteSchema(db)
      db.exec('BEGIN IMMEDIATE')
      const result = writer(db)
      db.exec('COMMIT')
      committed = true
      return result
    } catch (error) {
      if (!committed) {
        try { db.exec('ROLLBACK') } catch { /* ignore */ }
      }
      throw error
    } finally {
      db.close()
    }
  }, operation)
}
