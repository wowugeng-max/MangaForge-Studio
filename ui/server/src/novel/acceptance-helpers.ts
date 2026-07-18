import type { Database } from 'bun:sqlite'
import type { NovelStore } from './types'
import {
  projectFromRow, worldbuildingFromRow, characterFromRow, chapterFromRow, chapterVersionFromRow,
  settingEntityFromRow, chapterSettingUsageFromRow,
} from './row-mappers'
import { jsonText, textValue, nowIso, safeJsonText } from './json'

export function changedAcceptanceRecords<T extends { id: number }>(before: T[], after: T[]) {
  const beforeById = new Map(before.map(record => [record.id, record]))
  return after.filter(record => safeJsonText(beforeById.get(record.id)) !== safeJsonText(record))
}

export function removedAcceptanceRecordIds<T extends { id: number }>(before: T[], after: T[]) {
  const afterIds = new Set(after.map(record => record.id))
  return before.filter(record => !afterIds.has(record.id)).map(record => record.id)
}

export function persistNovelChapterAcceptanceDelta(db: Database, before: NovelStore, after: NovelStore) {
  const run = (sql: string, params: any[]) => db.query(sql).run(...params)
  for (const p of changedAcceptanceRecords(before.projects, after.projects)) {
    run(`UPDATE projects SET title=?,genre=?,sub_genres=?,synopsis=?,length_target=?,target_audience=?,style_tags=?,commercial_tags=?,reference_config=?,status=?,created_at=?,updated_at=? WHERE id=?`, [
      p.title,p.genre||'',jsonText(p.sub_genres),p.synopsis||'',p.length_target||'medium',p.target_audience||'',jsonText(p.style_tags),jsonText(p.commercial_tags),jsonText(p.reference_config, {}),p.status||'draft',p.created_at||nowIso(),p.updated_at||nowIso(),p.id,
    ])
  }
  for (const w of changedAcceptanceRecords(before.worldbuilding, after.worldbuilding)) {
    run(`INSERT INTO worldbuilding (id,project_id,world_summary,rules,factions,locations,systems,items,timeline_anchor,known_unknowns,version,raw_payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET project_id=excluded.project_id,world_summary=excluded.world_summary,rules=excluded.rules,factions=excluded.factions,locations=excluded.locations,systems=excluded.systems,items=excluded.items,timeline_anchor=excluded.timeline_anchor,known_unknowns=excluded.known_unknowns,version=excluded.version,raw_payload=excluded.raw_payload,created_at=excluded.created_at,updated_at=excluded.updated_at`, [
      w.id,w.project_id,w.world_summary||'',jsonText(w.rules),jsonText(w.factions),jsonText(w.locations),jsonText(w.systems),jsonText(w.items),textValue(w.timeline_anchor),jsonText(w.known_unknowns),w.version||1,jsonText(w.raw_payload || w, {}),w.created_at||nowIso(),w.updated_at||nowIso(),
    ])
  }
  for (const c of changedAcceptanceRecords(before.characters, after.characters)) {
    run(`INSERT INTO characters (id,project_id,name,role,role_type,archetype,personality,motivation,goal,conflict,abilities,backstory,relationships,relationship_graph,growth_arc,arc_hint,current_state,secret,appearance,status,version,raw_payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET project_id=excluded.project_id,name=excluded.name,role=excluded.role,role_type=excluded.role_type,archetype=excluded.archetype,personality=excluded.personality,motivation=excluded.motivation,goal=excluded.goal,conflict=excluded.conflict,abilities=excluded.abilities,backstory=excluded.backstory,relationships=excluded.relationships,relationship_graph=excluded.relationship_graph,growth_arc=excluded.growth_arc,arc_hint=excluded.arc_hint,current_state=excluded.current_state,secret=excluded.secret,appearance=excluded.appearance,status=excluded.status,version=excluded.version,raw_payload=excluded.raw_payload,created_at=excluded.created_at,updated_at=excluded.updated_at`, [
      c.id,c.project_id,c.name,c.role||'',c.role_type||c.role||'',c.archetype||'',jsonText(c.personality),c.motivation||'',c.goal||'',c.conflict||'',jsonText(c.abilities),c.backstory||'',jsonText(c.relationships),jsonText(c.relationship_graph, {}),c.growth_arc||'',c.arc_hint||'',jsonText(c.current_state, {}),c.secret||'',c.appearance||'',c.status||'active',c.version||1,jsonText(c.raw_payload || c, {}),c.created_at||c.updated_at||nowIso(),c.updated_at||nowIso(),
    ])
  }
  for (const c of changedAcceptanceRecords(before.chapters, after.chapters)) {
    run(`UPDATE chapters SET project_id=?,outline_id=?,chapter_no=?,title=?,chapter_goal=?,chapter_summary=?,conflict=?,ending_hook=?,chapter_text=?,scene_breakdown=?,scene_list=?,continuity_notes=?,items_in_play=?,foreshadowing=?,timeline_note=?,status=?,version=?,published_at=?,raw_payload=?,created_at=?,updated_at=? WHERE id=?`, [
      c.project_id,c.outline_id ?? null,c.chapter_no,c.title,c.chapter_goal||'',c.chapter_summary||'',c.conflict||'',c.ending_hook||'',c.chapter_text||'',jsonText(c.scene_breakdown),jsonText(c.scene_list || c.scene_breakdown),jsonText(c.continuity_notes),jsonText(c.items_in_play),jsonText(c.foreshadowing),c.timeline_note||'',c.status||'draft',c.version||1,c.published_at||null,jsonText(c.raw_payload || c, {}),c.created_at||nowIso(),c.updated_at||nowIso(),c.id,
    ])
  }
  for (const v of changedAcceptanceRecords(before.chapter_versions, after.chapter_versions)) {
    run('INSERT INTO chapter_versions (id,chapter_id,project_id,version_no,chapter_text,scene_breakdown,continuity_notes,source,created_at) VALUES (?,?,?,?,?,?,?,?,?)', [
      v.id,v.chapter_id,v.project_id,v.version_no,v.chapter_text||'',jsonText(v.scene_breakdown||[]),jsonText(v.continuity_notes||[]),v.source||'manual_edit',v.created_at||nowIso(),
    ])
  }
  for (const r of changedAcceptanceRecords(before.reviews, after.reviews)) {
    run('INSERT INTO reviews (id,project_id,review_type,status,summary,issues,payload,created_at) VALUES (?,?,?,?,?,?,?,?)', [
      r.id,r.project_id,r.review_type,r.status,r.summary||'',jsonText(r.issues||[]),r.payload||'',r.created_at||nowIso(),
    ])
  }
  for (const s of changedAcceptanceRecords(before.setting_entities, after.setting_entities)) {
    run(`INSERT INTO setting_entities (id,project_id,entity_type,name,summary,status,visibility,first_chapter_no,last_chapter_no,related_character_ids,related_chapter_ids,related_entity_ids,constraints_json,state_json,payload_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET project_id=excluded.project_id,entity_type=excluded.entity_type,name=excluded.name,summary=excluded.summary,status=excluded.status,visibility=excluded.visibility,first_chapter_no=excluded.first_chapter_no,last_chapter_no=excluded.last_chapter_no,related_character_ids=excluded.related_character_ids,related_chapter_ids=excluded.related_chapter_ids,related_entity_ids=excluded.related_entity_ids,constraints_json=excluded.constraints_json,state_json=excluded.state_json,payload_json=excluded.payload_json,created_at=excluded.created_at,updated_at=excluded.updated_at`, [
      s.id,s.project_id,s.entity_type||'rule',s.name,s.summary||'',s.status||'active',s.visibility||'public',s.first_chapter_no ?? null,s.last_chapter_no ?? null,jsonText(s.related_character_ids, []),jsonText(s.related_chapter_ids, []),jsonText(s.related_entity_ids, []),jsonText(s.constraints_json, {}),jsonText(s.state_json, {}),jsonText(s.payload_json || s, {}),s.created_at||nowIso(),s.updated_at||nowIso(),
    ])
  }
  for (const id of removedAcceptanceRecordIds(before.chapter_setting_usage, after.chapter_setting_usage)) {
    run('DELETE FROM chapter_setting_usage WHERE id=?', [id])
  }
  for (const u of changedAcceptanceRecords(before.chapter_setting_usage, after.chapter_setting_usage)) {
    run(`INSERT INTO chapter_setting_usage (id,project_id,chapter_id,entity_id,usage_type,required,allowed,forbidden,reveal_level,expected_state_change,actual_state_change,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET project_id=excluded.project_id,chapter_id=excluded.chapter_id,entity_id=excluded.entity_id,usage_type=excluded.usage_type,required=excluded.required,allowed=excluded.allowed,forbidden=excluded.forbidden,reveal_level=excluded.reveal_level,expected_state_change=excluded.expected_state_change,actual_state_change=excluded.actual_state_change,created_at=excluded.created_at,updated_at=excluded.updated_at`, [
      u.id,u.project_id,u.chapter_id,u.entity_id,u.usage_type||'allowed',u.required ? 1 : 0,u.allowed === false ? 0 : 1,u.forbidden ? 1 : 0,u.reveal_level||'none',jsonText(u.expected_state_change, {}),jsonText(u.actual_state_change, {}),u.created_at||nowIso(),u.updated_at||nowIso(),
    ])
  }
}

export function loadAcceptanceWorkingSet(db: Database, chapterId: number): { store: NovelStore; chapterIndex: number; projectIndex: number } | null {
  const chapterRow = db.query('SELECT * FROM chapters WHERE id = ? LIMIT 1').get(chapterId) as any
  if (!chapterRow) return null
  const chapter = chapterFromRow(chapterRow)
  const projectRow = db.query('SELECT * FROM projects WHERE id = ? LIMIT 1').get(chapter.project_id) as any
  if (!projectRow) return null
  const project = projectFromRow(projectRow)
  const projectId = project.id
  const store: NovelStore = {
    projects: [project],
    worldbuilding: (db.query('SELECT * FROM worldbuilding WHERE project_id = ?').all(projectId) as any[]).map(worldbuildingFromRow),
    characters: (db.query('SELECT * FROM characters WHERE project_id = ?').all(projectId) as any[]).map(characterFromRow),
    outlines: [],
    chapters: [chapter],
    chapter_versions: (db.query('SELECT * FROM chapter_versions WHERE chapter_id = ?').all(chapter.id) as any[]).map(chapterVersionFromRow),
    reviews: [],
    runs: [],
    setting_entities: (db.query('SELECT * FROM setting_entities WHERE project_id = ?').all(projectId) as any[]).map(settingEntityFromRow),
    chapter_setting_usage: (db.query('SELECT * FROM chapter_setting_usage WHERE project_id = ?').all(projectId) as any[]).map(chapterSettingUsageFromRow),
  }
  return { store, chapterIndex: 0, projectIndex: 0 }
}
