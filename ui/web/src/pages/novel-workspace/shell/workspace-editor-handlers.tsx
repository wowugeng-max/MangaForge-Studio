import { message } from 'antd'
import type { EditorKind } from '../EditorModal'
import {
  formatJsonField,
  formatListField,
  parseJsonField,
  parseListField,
} from './workspace-editor-fields'

export type EditorHandlerDeps = {
  apiClient: any
  editorForm: any
  editorItem: any
  editorKind: any
  flushPendingSave: any
  loadProjectModules: any
  projectId: any
  setEditorItem: any
  setEditorKind: any
  worldbuilding: any
}

export function createEditorHandlers(deps: EditorHandlerDeps) {
  const apiClient = deps.apiClient
  const editorForm = deps.editorForm
  const editorItem = deps.editorItem
  const editorKind = deps.editorKind
  const flushPendingSave = deps.flushPendingSave
  const loadProjectModules = deps.loadProjectModules
  const projectId = deps.projectId
  const setEditorItem = deps.setEditorItem
  const setEditorKind = deps.setEditorKind
  const worldbuilding = deps.worldbuilding

  const openEditor = (kind: EditorKind, item?: any) => {
    const currentItem = item || (kind === 'worldbuilding' ? worldbuilding[0] : null)
    setEditorItem(currentItem || null)
    if (kind === 'worldbuilding') {
      const data = currentItem || {
        world_summary: '', rules: [], timeline_anchor: '', known_unknowns: [], version: 1,
      }
      editorForm.setFieldsValue({
        ...data,
        rules: formatListField(data.rules),
        timeline_anchor: formatListField(data.timeline_anchor),
        known_unknowns: formatListField(data.known_unknowns),
      })
    } else if (kind === 'character') {
      const data = currentItem || { name: '', role_type: '', archetype: '', motivation: '', goal: '', conflict: '' }
      const state = data.current_state || {}
      const profile = data.raw_payload?.profile || {}
      editorForm.setFieldsValue({
        ...data,
        role_type: data.role_type || data.role || '',
        age: state.age ?? profile.age ?? '',
        gender: profile.gender || state.gender || '',
        identity: profile.identity || state.identity || '',
        faction: profile.faction || state.faction || '',
        personality: formatListField(data.personality),
        abilities: formatListField(data.abilities),
        items: formatListField(state.items || state.inventory || data.raw_payload?.items),
        knowledge_scope: formatListField(state.knowledge_scope || state.known_facts),
        information_boundaries: formatListField(state.information_boundaries),
        relationships: formatJsonField(data.relationships || []),
        current_state: formatJsonField(state || {}),
      })
    } else if (kind === 'outline') {
      const data = currentItem || {
        outline_type: 'master', title: '', summary: '', conflict_points: [],
        turning_points: [], hook: '', parent_id: null,
      }
      editorForm.setFieldsValue({
        ...data,
        conflict_points: formatListField(data.conflict_points),
        turning_points: formatListField(data.turning_points),
      })
    } else if (kind === 'chapter') {
      const data = currentItem || {
        chapter_no: 1, title: '', chapter_goal: '', chapter_summary: '',
        conflict: '', ending_hook: '', outline_id: null, chapter_text: '',
      }
      editorForm.setFieldsValue({
        ...data,
        must_advance: formatListField(data.raw_payload?.must_advance),
        forbidden_repeats: formatListField(data.raw_payload?.forbidden_repeats),
        scene_breakdown: formatJsonField(data.scene_list || data.scene_breakdown || []),
      })
    }
    setEditorKind(kind)
  }


  const submitEditor = async () => {
    if (!await flushPendingSave()) return
    const v = await editorForm.validateFields()
    try {
      if (editorKind === 'worldbuilding') {
        const payload = {
          project_id: projectId,
          world_summary: v.world_summary || '',
          rules: parseListField(v.rules),
          timeline_anchor: v.timeline_anchor || '',
          known_unknowns: parseListField(v.known_unknowns),
          version: Number(v.version || 1),
        }
        if (editorItem?.id) await apiClient.put(`/novel/worldbuilding/${editorItem.id}`, payload)
        else await apiClient.post(`/novel/projects/${projectId}/worldbuilding`, payload)
      } else if (editorKind === 'character') {
        const baseState = parseJsonField(v.current_state, {})
        const nextCurrentState = {
          ...(baseState && typeof baseState === 'object' && !Array.isArray(baseState) ? baseState : {}),
          age: v.age || baseState?.age || '',
          gender: v.gender || baseState?.gender || '',
          identity: v.identity || baseState?.identity || '',
          faction: v.faction || baseState?.faction || '',
          items: parseListField(v.items),
          knowledge_scope: parseListField(v.knowledge_scope),
          information_boundaries: parseListField(v.information_boundaries),
        }
        const payload = {
          project_id: projectId, name: v.name,
          role_type: v.role_type || '', archetype: v.archetype || '',
          motivation: v.motivation || '', goal: v.goal || '', conflict: v.conflict || '',
          personality: parseListField(v.personality),
          abilities: parseListField(v.abilities),
          appearance: v.appearance || '',
          backstory: v.backstory || '',
          secret: v.secret || '',
          growth_arc: v.growth_arc || '',
          arc_hint: v.arc_hint || '',
          relationships: parseJsonField(v.relationships, []),
          current_state: nextCurrentState,
          raw_payload: {
            ...(editorItem?.raw_payload || {}),
            profile: {
              ...((editorItem?.raw_payload || {}).profile || {}),
              age: v.age || '',
              gender: v.gender || '',
              identity: v.identity || '',
              faction: v.faction || '',
            },
            items: parseListField(v.items),
          },
        }
        if (editorItem?.id) await apiClient.put(`/novel/characters/${editorItem.id}`, payload)
        else await apiClient.post('/novel/characters', payload)
      } else if (editorKind === 'outline') {
        const payload = {
          project_id: projectId,
          outline_type: v.outline_type || 'master', title: v.title,
          summary: v.summary || '',
          conflict_points: parseListField(v.conflict_points),
          turning_points: parseListField(v.turning_points),
          hook: v.hook || '', parent_id: v.parent_id ?? null,
        }
        if (editorItem?.id) await apiClient.put(`/novel/outlines/${editorItem.id}`, payload)
        else await apiClient.post('/novel/outlines', payload)
      } else if (editorKind === 'chapter') {
        const payload = {
          project_id: projectId,
          chapter_no: Number(v.chapter_no || 1), title: v.title,
          chapter_goal: v.chapter_goal || '', chapter_summary: v.chapter_summary || '',
          conflict: v.conflict || '', ending_hook: v.ending_hook || '',
          status: editorItem?.status || 'draft', outline_id: v.outline_id ?? null,
          chapter_text: v.chapter_text || '',
          scene_breakdown: parseJsonField(v.scene_breakdown, []),
          scene_list: parseJsonField(v.scene_breakdown, []),
          raw_payload: {
            ...(editorItem?.raw_payload || {}),
            must_advance: parseListField(v.must_advance),
            forbidden_repeats: parseListField(v.forbidden_repeats),
          },
        }
        if (editorItem?.id) await apiClient.put(`/novel/chapters/${editorItem.id}`, payload)
        else await apiClient.post('/novel/chapters', { ...payload, scene_breakdown: [], continuity_notes: [] })
      }
      message.success('已保存')
      setEditorKind(null)
      setEditorItem(null)
      await loadProjectModules()
    } catch { message.error('保存失败') }
  }


  return {
    openEditor,
    submitEditor,
  }
}
