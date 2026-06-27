import {
  createNovelChapter,
  createNovelCharacter,
  createNovelOutline,
  createNovelSettingEntity,
  createNovelWorldbuilding,
  listNovelChapters,
  updateNovelProject,
} from '../novel'
import { normalizeSettingAgentPayload } from './novel-setting-routes'

export function createNovelOriginalIncubatorService() {
  const buildOriginalIncubatorPrompt = (project: any, body: any) => [
    '任务：进行原创小说项目孵化，不依赖任何指定参考作品。请产出可直接落库的商业网文创作蓝图。',
    `项目标题：${project.title}`,
    `题材：${body.genre || project.genre || '未指定'}`,
    `目标平台/读者：${body.target_audience || project.target_audience || '通用网文读者'}`,
    `创意/要求：${body.idea || project.synopsis || ''}`,
    `候选方案数：${Math.max(1, Math.min(5, Number(body.variant_count || 1)))}`,
    project.reference_config?.project_seed ? '【已整理项目种子】' : '',
    project.reference_config?.project_seed ? JSON.stringify(project.reference_config.project_seed, null, 2).slice(0, 9000) : '',
    '',
    '请输出 JSON，字段：',
    'directions: array，当候选方案数大于 1 时输出多个方向，每项包含 direction_id,title,commercial_positioning,core_hook,differentiators,risks,first_10_chapters,score,selection_reason',
    'worldbuilding: {world_summary,rules,known_unknowns}',
    'characters: array，每项 name, role_type, archetype, age, gender, identity, faction, appearance, personality, abilities, items, knowledge_scope, information_boundaries, motivation, goal, conflict, backstory, secret, relationships, growth_arc, current_state',
    'outlines: array，至少包含 master 和 1-3 个 volume，每项 outline_type,title,summary,conflict_points,turning_points,hook,target_length',
    'chapters: array，生成前 30 章或指定 chapter_count 的章纲，每项 chapter_no,title,chapter_goal,chapter_summary,conflict,ending_hook,must_advance,forbidden_repeats',
    'setting_entities: array，专门用于设定工坊入库；每项 entity_type,name,summary,constraints_json,state_json,payload_json。entity_type 只能是 character/realm/ability/item/boss/rule/faction/location/foreshadowing/timeline。',
    'writing_bible: {promise,world_rules,mainline,volume_plan,style_lock,safety_policy,forbidden,target_reader_contract,genre_positioning_contract,core_contract_radar,reader_retention_contract,opening_strategy_contract}',
    'writing_bible.target_reader_contract: {reader_profile,reader_desires,emotional_gap,chapter_value_test,quality_checks}，必须回答“写给谁看、读者想看什么、本章给什么”。',
    'writing_bible.genre_positioning_contract: {genre_tags,platform,reader_psychology,core_hook,type_formula,selling_points,long_board,innovation_boundary,quality_checks}，必须包含“拉长板而非补短板”。',
    'writing_bible.core_contract_radar: {must_serve,no_drift,theme_unity_rules,repair_focus,periodic_drift_check}，periodic_drift_check.question 必须包含“当初吸引读者的卖点还在吗”。',
    'writing_bible.reader_retention_contract: {retention_double_engine,opening_hook_rule,ending_hook_rule,reward_randomness_rule,quality_checks}，opening_hook_rule 必须包含“前300字”，ending_hook_rule 必须留下下一章动作压力。',
    'writing_bible.opening_strategy_contract: {hook_type,opening_flow,mainline_graft,first_5_chapter_promise,threshold_ladder,forbidden_mixing,quality_checks}，hook_type 只能取“事件噱头/金手指噱头/人设噱头”之一；必须明确事件噱头和金手指噱头不能混用，写清前5章如何完成吸量承诺、何时嫁接主线、如何用 threshold_ladder 设门槛拉长剧情。',
    'commercial_positioning: {platform,reader_promise,selling_points,tropes,risks}',
    '',
    '必须只输出一个合法 JSON object，不要输出 Markdown、解释、代码块或空对象。',
    '如果无法完整生成，也必须至少输出 commercial_positioning、characters、outlines、chapters 四类内容；chapters 数量不得少于 5。',
    '要求：主角目标清晰，金手指/能力有代价，前 10 章追读钩子密集，分卷目标明确；创建阶段必须先立清目标读者、题材定位、核心承诺雷达、追读留存契约和开篇噱头策略，避免空泛设定或开篇承诺混乱。',
  ].join('\n')

  const normalizeIncubatorPayload = (payload: any, chapterCount: number) => {
    const directions = Array.isArray(payload?.directions) ? payload.directions : []
    const selectedDirection = payload?.selected_direction || directions.slice().sort((a: any, b: any) => Number(b.score || 0) - Number(a.score || 0))[0] || null
    return {
      directions,
      selected_direction: selectedDirection,
      worldbuilding: payload?.worldbuilding || selectedDirection?.worldbuilding || {},
      characters: Array.isArray(payload?.characters) ? payload.characters : (Array.isArray(selectedDirection?.characters) ? selectedDirection.characters : []),
      outlines: Array.isArray(payload?.outlines) ? payload.outlines : (Array.isArray(selectedDirection?.outlines) ? selectedDirection.outlines : []),
      chapters: (Array.isArray(payload?.chapters) ? payload.chapters : (Array.isArray(selectedDirection?.chapters) ? selectedDirection.chapters : [])).slice(0, chapterCount),
      setting_entities: Array.isArray(payload?.setting_entities)
        ? payload.setting_entities
        : (Array.isArray(selectedDirection?.setting_entities) ? selectedDirection.setting_entities : []),
      writing_bible: payload?.writing_bible || selectedDirection?.writing_bible || {},
      commercial_positioning: payload?.commercial_positioning || selectedDirection?.commercial_positioning || {},
    }
  }

  const storeOriginalIncubatorPayload = async (activeWorkspace: string, project: any, payload: any) => {
    if (payload.worldbuilding?.world_summary || payload.worldbuilding?.rules) {
      await createNovelWorldbuilding(activeWorkspace, {
        project_id: project.id,
        world_summary: payload.worldbuilding.world_summary || '',
        rules: payload.worldbuilding.rules || [],
        known_unknowns: payload.worldbuilding.known_unknowns || [],
        raw_payload: payload.worldbuilding,
      })
    }
    for (const character of payload.characters || []) {
      if (!character?.name) continue
      const createdCharacter = await createNovelCharacter(activeWorkspace, {
        project_id: project.id,
        name: String(character.name),
        role_type: character.role_type || character.role || '',
        archetype: character.archetype || '',
        motivation: character.motivation || '',
        goal: character.goal || '',
        conflict: character.conflict || '',
        appearance: character.appearance || '',
        personality: character.personality || [],
        abilities: character.abilities || [],
        backstory: character.backstory || '',
        secret: character.secret || '',
        relationships: character.relationships || [],
        growth_arc: character.growth_arc || '',
        current_state: {
          ...(character.current_state || {}),
          age: character.current_state?.age || character.age || '',
          gender: character.current_state?.gender || character.gender || '',
          identity: character.current_state?.identity || character.identity || '',
          faction: character.current_state?.faction || character.faction || '',
          items: character.current_state?.items || character.items || [],
          knowledge_scope: character.current_state?.knowledge_scope || character.knowledge_scope || [],
          information_boundaries: character.current_state?.information_boundaries || character.information_boundaries || [],
        },
        raw_payload: {
          ...character,
          profile: {
            age: character.age || character.current_state?.age || '',
            gender: character.gender || character.current_state?.gender || '',
            identity: character.identity || character.current_state?.identity || '',
            faction: character.faction || character.current_state?.faction || '',
          },
          items: character.items || character.current_state?.items || [],
        },
      })
      await createNovelSettingEntity(activeWorkspace, {
        project_id: project.id,
        entity_type: /反派|boss|敌|天尊|魔王/i.test(String(character.role_type || character.role || character.name || '')) ? 'boss' : 'character',
        name: String(character.name),
        summary: [character.identity, character.motivation, character.goal, character.conflict].filter(Boolean).join('；'),
        related_character_ids: [createdCharacter.id],
        constraints_json: {
          knowledge_scope: character.knowledge_scope || character.current_state?.knowledge_scope || [],
          information_boundaries: character.information_boundaries || character.current_state?.information_boundaries || [],
          behavior_limits: character.behavior_limits || [],
        },
        state_json: {
          ...(character.current_state || {}),
          age: character.current_state?.age || character.age || '',
          gender: character.current_state?.gender || character.gender || '',
          identity: character.current_state?.identity || character.identity || '',
          faction: character.current_state?.faction || character.faction || '',
          appearance: character.appearance || '',
          abilities: character.abilities || [],
          items: character.items || character.current_state?.items || [],
        },
        payload_json: { source: 'original_incubator_character', raw: character },
      } as any)
      for (const ability of Array.isArray(character.abilities) ? character.abilities : []) {
        const abilityName = typeof ability === 'string' ? ability : ability?.name
        if (!abilityName) continue
        await createNovelSettingEntity(activeWorkspace, {
          project_id: project.id,
          entity_type: 'ability',
          name: String(abilityName),
          summary: typeof ability === 'string' ? ability : String(ability?.summary || ability?.description || ''),
          related_character_ids: [createdCharacter.id],
          constraints_json: typeof ability === 'object' ? { cost: ability.cost, limit: ability.limit, condition: ability.condition } : {},
          state_json: { owner: character.name, status: 'available' },
          payload_json: { source: 'original_incubator_ability', raw: ability },
        } as any)
      }
    }
    for (const rule of Array.isArray(payload.worldbuilding?.rules) ? payload.worldbuilding.rules : []) {
      const name = typeof rule === 'string' ? rule.slice(0, 32) : String(rule?.name || rule?.title || '世界规则')
      await createNovelSettingEntity(activeWorkspace, {
        project_id: project.id,
        entity_type: 'rule',
        name,
        summary: typeof rule === 'string' ? rule : String(rule?.summary || rule?.description || ''),
        constraints_json: typeof rule === 'object' ? rule : {},
        state_json: {},
        payload_json: { source: 'original_incubator_world_rule', raw: rule },
      } as any)
    }
    for (const entity of normalizeSettingAgentPayload({ settings: payload.setting_entities || [] }, project.id)) {
      await createNovelSettingEntity(activeWorkspace, {
        ...entity,
        project_id: project.id,
        payload_json: { ...(entity.payload_json || {}), source: entity.payload_json?.source || 'original_incubator_setting_entity' },
      } as any)
    }
    for (const outline of payload.outlines || []) {
      if (!outline?.title) continue
      await createNovelOutline(activeWorkspace, {
        project_id: project.id,
        outline_type: outline.outline_type || 'volume',
        title: String(outline.title),
        summary: outline.summary || '',
        conflict_points: outline.conflict_points || [],
        turning_points: outline.turning_points || [],
        hook: outline.hook || '',
        target_length: outline.target_length || '',
        raw_payload: outline,
      })
    }
    const existingChapters = await listNovelChapters(activeWorkspace, project.id)
    for (const chapter of payload.chapters || []) {
      const chapterNo = Number(chapter.chapter_no || 0)
      if (!chapterNo || existingChapters.some(item => item.chapter_no === chapterNo)) continue
      await createNovelChapter(activeWorkspace, {
        project_id: project.id,
        chapter_no: chapterNo,
        title: chapter.title || `第${chapterNo}章`,
        chapter_goal: chapter.chapter_goal || '',
        chapter_summary: chapter.chapter_summary || '',
        conflict: chapter.conflict || '',
        ending_hook: chapter.ending_hook || '',
        raw_payload: {
          ...chapter,
          must_advance: chapter.must_advance || [],
          forbidden_repeats: chapter.forbidden_repeats || [],
        },
      })
    }
    return await updateNovelProject(activeWorkspace, project.id, {
      synopsis: project.synopsis || payload.commercial_positioning?.reader_promise || '',
      reference_config: {
        ...(project.reference_config || {}),
        writing_bible: {
          ...payload.writing_bible,
          updated_at: new Date().toISOString(),
        },
        commercial_positioning: payload.commercial_positioning,
        original_incubator_last_payload: payload,
      },
    } as any)
  }

  const isUsableIncubatorPayload = (payload: any) => Boolean(
    payload
      && (
        payload.selected_direction
        || (Array.isArray(payload.directions) && payload.directions.length > 0)
        || payload.worldbuilding?.world_summary
        || (Array.isArray(payload.characters) && payload.characters.length > 0)
        || (Array.isArray(payload.outlines) && payload.outlines.length > 0)
        || (Array.isArray(payload.chapters) && payload.chapters.length > 0)
        || payload.commercial_positioning?.reader_promise
        || (Array.isArray(payload.commercial_positioning?.selling_points) && payload.commercial_positioning.selling_points.length > 0)
      ),
  )

  return { buildOriginalIncubatorPrompt, normalizeIncubatorPayload, storeOriginalIncubatorPayload, isUsableIncubatorPayload }
}

export type NovelOriginalIncubatorService = ReturnType<typeof createNovelOriginalIncubatorService>
