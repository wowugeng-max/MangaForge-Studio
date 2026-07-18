import type { Express } from 'express'
import {
  createNovelCharacter,
  createNovelReview,
  createNovelSettingEntity,
  deleteNovelSettingEntity,
  listNovelChapterSettingUsage,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelSettingEntities,
  listNovelWorldbuilding,
  replaceNovelChapterSettingUsage,
  updateNovelChapterSettingUsage,
  updateNovelSettingEntity,
} from '../novel'
import { executeNovelAgent } from '../llm'
import { formatReviewIssueForStorage, getNovelPayload, parseJsonLikePayload, safeJsonStringify } from './novel-route-utils'
import { buildSettingRelationshipGraph } from './novel-setting-relationship-graph'


export function buildSettingAgentPrompt(project: any, worldbuilding: any[] = [], characters: any[] = [], outlines: any[] = [], existing: any[] = []) {
  return [
    '任务：你是 setting-agent，负责为商业长篇小说生成和补全“设定工坊”资产池。只输出 JSON，不要解释。',
    `作品标题：${project.title || '未命名作品'}`,
    `篇幅目标：${project.length_target || 'longform'}`,
    '',
    '必须构建可长期连载复用的设定系统，而不是只写世界观摘要。重点包括：',
    '1. 能力体系：能力来源、能力名、拥有者、代价、限制、克制关系、升级路径。',
    '2. 境界/等级体系：阶段名称、晋升条件、瓶颈、资源消耗、战力差距。',
    '3. 物品体系：关键物品、归属规则、消耗/损坏、位置、禁用条件。',
    '4. 势力体系：组织目标、资源、敌友关系、行动边界、登场阶段。',
    '5. Boss/反派阶梯：每卷或阶段的对手、行动逻辑、压迫方式、失败代价。',
    '6. 规则/地点/时间线/伏笔：触发条件、禁忌、揭示范围、回收章节。',
    '7. 剧情线工坊：主线、支线、角色线、感情/关系线、势力线、伏笔线；每条线必须写推进规则、当前状态、最近推进章节、下一次应推进章节、禁揭内容和预期回报。',
    '',
    '【现有项目资料】',
    JSON.stringify({ project, worldbuilding, characters, outlines: outlines.slice(0, 120), existing_settings: existing.slice(0, 120) }, null, 2).slice(0, 20000),
    '',
    '输出 JSON 字段：',
    'settings: array，每项包含 entity_type,name,summary,status,visibility,first_chapter_no,last_chapter_no,constraints_json,state_json,payload_json。',
    '也可以额外输出 ability_system{abilities}, realm_system{realms}, item_system{items}, faction_system{factions}, boss_ladder{bosses}, rules, locations, timeline, foreshadowing；系统会归一化入库。',
    '剧情线可以输出 storylines，也可以分开输出 mainlines, subplots, character_arcs, relationship_arcs, faction_arcs, foreshadowing_arcs。',
    '剧情线字段建议包含 name,summary,priority,start_chapter_no,end_chapter_no,related_characters,related_factions,related_foreshadowing,advance_rule,taboo,forbidden_reveal,current_state,last_advanced_chapter,next_advance_chapter,payoff_status,expected_payoff。',
    'entity_type 只能是 character/realm/ability/item/boss/rule/faction/location/foreshadowing/timeline/mainline/subplot/character_arc/relationship_arc/faction_arc/foreshadowing_arc。',
    '每个能力、物品、规则、Boss 必须写 constraints_json；每个已登场或可追踪对象必须写 state_json。',
  ].join('\n')
}

export function buildSettingRelationshipRepairPrompt(project: any, settings: any[] = [], diagnostics: any[] = [], graph: any = {}) {
  const isolatedIds = new Set(diagnostics.filter(item => item?.type === 'isolated_key_asset').map(item => Number(item.entity_id || 0)).filter(Boolean))
  const isolatedAssets = settings
    .filter(item => isolatedIds.has(Number(item.id)))
    .map(item => ({
      id: item.id,
      entity_type: item.entity_type,
      name: item.name,
      summary: item.summary,
      first_chapter_no: item.first_chapter_no,
      state_json: item.state_json,
      payload_json: item.payload_json,
      constraints_json: item.constraints_json,
    }))
  const candidateTargets = settings
    .filter(item => !isolatedIds.has(Number(item.id)) || ['character', 'mainline', 'subplot', 'foreshadowing_arc', 'faction_arc', 'relationship_arc', 'faction'].includes(String(item.entity_type || '')))
    .map(item => ({
      id: item.id,
      entity_type: item.entity_type,
      name: item.name,
      summary: item.summary,
      first_chapter_no: item.first_chapter_no,
      state_json: item.state_json,
      payload_json: item.payload_json,
    }))
  return [
    '任务：relationship repair。你是 setting-agent，负责把孤立设定资产挂到已有核心资产上。只输出 JSON，不要解释。',
    `作品标题：${project.title || '未命名作品'}`,
    '',
    '输出字段：patches(array)。每项必须包含 source_id, target_id, patch_type, relation_type, reason, confidence。',
    'patch_type 只能使用：related_entity_ids, state_owner, state_abilities, state_realm, state_faction, state_relationships, payload_related_characters, payload_related_factions, payload_related_foreshadowing。',
    '写法规则：',
    '- 通用弱关联或 Boss/物品/势力/伏笔挂主线：用 related_entity_ids。',
    '- 能力/物品缺归属：用 state_owner，target 必须是角色或势力。',
    '- 角色挂能力/境界/势力：用 state_abilities/state_realm/state_faction。',
    '- 人物关系只能 character → character；剧情线挂角色/势力/伏笔必须由 mainline/subplot/character_arc/relationship_arc/faction_arc/foreshadowing_arc 发起。',
    '- 剧情线挂角色/势力/伏笔：用 payload_related_characters/payload_related_factions/payload_related_foreshadowing。',
    '- 只有有明确叙事理由才输出；不要为了消除孤立而强连。',
    '',
    '【孤立资产】',
    JSON.stringify(isolatedAssets, null, 2).slice(0, 12000),
    '',
    '【可挂钩候选】',
    JSON.stringify(candidateTargets, null, 2).slice(0, 14000),
    '',
    '【关系诊断摘要】',
    JSON.stringify({ diagnostics, summary: graph?.summary || {} }, null, 2).slice(0, 4000),
  ].join('\n')
}

