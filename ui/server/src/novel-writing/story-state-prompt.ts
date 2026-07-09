import {
  buildStoryStateSyncContextPackage,
  verifiedSceneBreakdownForStateSync,
} from './scene-card-execution-scans'

export function buildStoryStatePrompt(project: any, contextPackage: any, chapterText: string) {
  const verifiedSceneBreakdown = verifiedSceneBreakdownForStateSync(contextPackage, chapterText)
  const storyStateContextPackage = buildStoryStateSyncContextPackage(contextPackage, chapterText)
  return [
    '任务：从刚入库的章节正文中提取故事状态机增量，用于后续章节续写。只提取事实，不要推测。',
    '重点：角色状态必须是“全状态增量”，用于防止后续章节出现年龄、外貌、能力、持有物、认知范围、位置和伤势漂移。',
    `作品标题：${project.title}`,
    '',
    '【生成上下文】',
    JSON.stringify(storyStateContextPackage, null, 2).slice(0, 6000),
    '',
    verifiedSceneBreakdown.length ? '【已验证场景回执 scene_card_receipts】' : '',
    verifiedSceneBreakdown.length ? '这些回执来自正文生成/修订后的 scene_breakdown，且已通过确定性证据复核；只能作为定位线索，仍必须以章节正文为事实来源。将已验证回执中的目标推进、状态变化、关系变化、物品归属、伏笔推进、章尾拉力转成 state_delta、character_updates、setting_updates、storyline_updates 和 next_chapter_priorities。' : '',
    verifiedSceneBreakdown.length ? JSON.stringify(verifiedSceneBreakdown, null, 2).slice(0, 4000) : '',
    '',
    '【章节正文】',
    chapterText.slice(0, 14000),
    '',
    '输出 JSON，字段：',
    'state_delta: {timeline, current_time, active_locations, character_positions, character_relationships, relationship_graph, known_secrets, secret_visibility, item_ownership, resource_status, foreshadowing_status, payoff_queue, mainline_progress, volume_progress, unresolved_conflicts, open_questions, recent_repeated_information, next_chapter_priorities, layered_memory_context, progress_summary, daily_context_snapshot}',
    'state_delta.timeline/current_time/active_locations 要尽量带 source_excerpt 或 evidence：timeline 可用对象数组 {event/source_excerpt}，active_locations 可用对象数组 {name/source_excerpt}；如果 current_time 是字符串，也必须在 timeline 或 location 相关记录中补正文原句证据。',
    'state_delta.layered_memory_context: 按 oh-story 已写内容分层摘要输出完整可覆盖版本，字段包含 recent_chapter_details(array, 只保留最近5章详记，每项写第X章+事件+状态变化+伏笔), ten_chapter_summaries(array, 每10章概要), volume_overview(array, 卷级总览), archive_refs(array, 追踪/归档/第XXX-YYY章.md 等归档索引), red_lines(array)。超过30章时必须维护；每50章或卷结束时保留最近5章详记，将更早内容压缩进 archive_refs 和 ten_chapter_summaries；不足30章也可输出最近章节详记。',
    'state_delta.progress_summary: 按 oh-story Step 4「追踪/上下文.md」输出本章完成后的日更断点摘要，字段包含 last_completed_chapter, updated_at, completed_chapter_count, completed_word_count, active_foreshadowing_count, recent_changed_characters, next_outline_status, notes。notes 是注意事项，只写需要下一章记住的关键决策或变更，不复制详细伏笔表、时间线表或角色状态表。',
    'state_delta.daily_context_snapshot: 按 oh-story 完成后自动更新「追踪/上下文.md」输出本章结束后的续写快照，字段包含 current_chapter, current_scene, current_emotion_target, writing_changes, pending_clues。daily_context_snapshot 只保存追踪/上下文.md 的进度元信息和下一章承接摘要，不得复制详细伏笔表、时间线表或角色状态表。current_scene 写下一章开篇必须承接的具体现场；current_emotion_target 写下一章开场要延续或反转的情绪目标；writing_changes 写本章新增且会影响后续的事实变化；pending_clues 写仍未解决但必须保留的线索。',
    'character_updates: array，每项包含 name,current_state,source_excerpt 或 evidence。current_state 可包含 age, location, physical_condition, appearance_delta, outfit, items, item_changes, ability_status, resource_status, emotional_state, relationship_attitudes, knowledge_scope, newly_learned, information_boundaries, secrets_known, injuries, goals, next_intent, last_seen_chapter；source_excerpt/evidence 必须引用本章正文中支撑该状态变化的原句。',
    'setting_updates: array，每项包含 entity_id 或 name, entity_type, state_delta, actual_state_change, source_excerpt 或 evidence。用于更新设定工坊里的境界、能力、物品、Boss、规则、伏笔、地点、时间线等状态；source_excerpt/evidence 必须引用本章正文中支撑资产归属、可见性、触发条件、限制、风险、后果、时间或地点变化的原句。',
    'storyline_updates: array，每项包含 entity_id 或 name, entity_type, actual_state_change, summary。只输出正文明确推进、埋线、回收或触碰的剧情线，entity_type 只能是 mainline/subplot/character_arc/relationship_arc/faction_arc/foreshadowing_arc。',
    'discovered_assets: array，每项包含 entity_type,name,summary,evidence,source_excerpt,first_chapter_no,constraints_json,state_json。只收录正文中新出现且应纳入长期管理的资产，entity_type 只能是 character/item/ability/faction/location/foreshadowing。',
    'ip_scene_candidates: array，每项包含 title,summary,visual_hook,adaptation_value,spread_point,evidence,source_excerpt,tags。只收录正文已经写出来、可视化强、适合短剧/漫剧/IP改编或评论区传播的标志性场面；普通过场、纯解释和没有画面冲突的片段不要收录。',
    '只写正文明确出现或可由本章直接确定的状态；不知道就不要补。',
    'next_chapter_priorities: array',
    '只返回 JSON。',
  ].join('\n')
}
