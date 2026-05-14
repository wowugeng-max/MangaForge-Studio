import type { NovelProjectRecord } from '../novel'

// ── Shared Prompt Fragments ──

export function baseNovelSystemPrompt(): string {
  return `你是一个专业小说创作 AI。你正在参与一部长篇连载小说的流水线创作。

核心原则：
- 保持叙事逻辑的严格一致，不得出现时间线冲突、人物状态矛盾、设定崩塌
- 每一章都必须是上一章节的**直接延续**，不得出现场景断层、角色凭空消失或复活
- 保持统一的叙事风格和语言质感，不要在不同章节间切换语气
- 伏笔必须提前规划并在合适的时机回收，不得出现"遗忘"的伏笔
- 角色行为必须符合其已设定的性格、动机和能力范围`
}

export function baseStructuredOutputPrompt(fields: string[]): string {
  return `\n请输出 JSON 格式，包含以下字段：${fields.join(', ')}。确保 JSON 可以被直接解析，不要包含任何额外文字。`
}

// ── Style Guardrails ──

export function buildStyleGuardrails(project: NovelProjectRecord): string {
  const parts: string[] = []
  if (project.genre) parts.push(`题材：${project.genre}`)
  if (project.target_audience) parts.push(`目标读者：${project.target_audience}`)
  if (project.length_target) parts.push(`篇幅目标：${project.length_target}`)
  if (project.style_tags && project.style_tags.length > 0) parts.push(`风格标签：${project.style_tags.join('、')}`)
  if (project.synopsis) parts.push(`简介/核心概念：${project.synopsis}`)
  return parts.length > 0 ? `\n\n【作品信息】\n${parts.join('\n')}` : ''
}

// ── Market Agent Prompt ──

export function buildMarketPrompt(project: NovelProjectRecord): string {
  return [
    '任务：分析当前小说的市场定位、受众偏好和章节节奏。',
    `作品标题：${project.title}`,
    project.synopsis ? `简介：${project.synopsis}` : '',
    '输出 JSON 格式，包含以下字段：',
    '  - genre_fit: 题材匹配度评价',
    '  - audience_fit: 受众匹配度评价',
    '  - hook_fit: 开篇抓力评价',
    '  - pacing_fit: 节奏评价',
    '  - recommendations: 建议数组',
    baseStructuredOutputPrompt(['genre_fit', 'audience_fit', 'hook_fit', 'pacing_fit', 'recommendations']),
  ].filter(Boolean).join('\n')
}

// ── World Agent Prompt ──

export function buildWorldPrompt(project: NovelProjectRecord, task: string): string {
  return [
    `任务：${task}`,
    `作品标题：${project.title}`,
    project.synopsis ? `简介：${project.synopsis}` : '',
    '',
    '请构建完整的世界观设定，包括：',
    '1. 世界概述（时代背景、核心规则）',
    '2. 力量/能力体系（规则、等级、限制）',
    '3. 势力与阵营（关系、利益冲突）',
    '4. 关键地点（地理、战略意义）',
    '5. 关键物品/道具（来源、能力、去向）',
    '6. 时间锚点（故事起点、关键时间节点）',
    '7. 已知未知（故事中角色和读者都不知道的秘密，即伏笔）',
    '',
    '输出 JSON 格式：',
    baseStructuredOutputPrompt(['world_summary', 'rules', 'factions', 'locations', 'systems', 'items', 'timeline_anchor', 'known_unknowns', 'version']),
  ].filter(Boolean).join('\n')
}

// ── Character Agent Prompt ──

export function buildCharacterPrompt(project: NovelProjectRecord, task: string): string {
  return [
    `任务：${task}`,
    `作品标题：${project.title}`,
    project.synopsis ? `简介：${project.synopsis}` : '',
    '',
    '请构建角色列表，每个角色包含：',
    '1. name: 角色名称',
    '2. role: 角色定位（主角/配角/反派/工具人）',
    '3. personality: 性格关键词（3-5个）',
    '4. motivation: 核心动机（驱动角色行动的根本原因）',
    '5. goal: 当前目标（在当前剧情中想要什么）',
    '6. abilities: 能力列表',
    '7. backstory: 简要背景',
    '8. relationships: 与其他角色的关系',
    '9. arc_hint: 角色弧光提示（这个角色会经历怎样的变化）',
    '',
    '输出 JSON 格式：',
    baseStructuredOutputPrompt(['characters']),
  ].filter(Boolean).join('\n')
}

// ── Outline Agent Prompt ──

export interface OutlinePromptParams {
  task?: string
  chapterCount?: number
  userOutline?: string          // 用户自定义大纲文本
  continueFrom?: number          // 从第几章之后继续生成
  existingChapters?: Array<any>  // 已有的章节数据（续写用）
}

export function buildOutlinePrompt(project: NovelProjectRecord, params: string | OutlinePromptParams): string {
  const opts = typeof params === 'string' ? { task: params } : params
  const parts: string[] = []

  parts.push(`任务：${opts.task || '生成大纲'}`)
  parts.push(`作品标题：${project.title}`)
  if (project.synopsis) parts.push(`简介：${project.synopsis}`)
  if (project.genre) parts.push(`题材：${project.genre}`)
  if (project.style_tags?.length) parts.push(`风格：${project.style_tags.join('、')}`)

  // 用户自定义大纲 — 在此基础上扩展
  if (opts.userOutline && opts.userOutline.trim()) {
    parts.push(`\n【用户提供的大纲（请在此基础上扩展完善）】`)
    parts.push(opts.userOutline.trim())
    parts.push('请保留用户大纲的核心情节和方向，将其扩展为完整的故事大纲。')
  }

  // 章节数量控制
  if (opts.chapterCount && opts.chapterCount > 0) {
    parts.push(`\n【章节数量要求】`)
    parts.push(`请生成恰好 ${opts.chapterCount} 章的粗略章纲。`)
  }

  // 续写模式：从已有章节继续
  if (opts.continueFrom && opts.continueFrom > 0) {
    parts.push(`\n【续写模式】`)
    parts.push(`前 ${opts.continueFrom} 章已经存在，请从第 ${opts.continueFrom + 1} 章开始继续生成。`)
    if (opts.existingChapters && opts.existingChapters.length > 0) {
      parts.push('已有章节摘要（续写必须基于此延续）：')
      for (const ch of opts.existingChapters) {
        parts.push(`  第${ch.chapter_no}章「${ch.title}」：${ch.chapter_summary || (ch.chapter_text || '').slice(0, 300)}`)
        if (ch.ending_hook) parts.push(`    结尾钩子：${ch.ending_hook}`)
      }
    }
  }

  parts.push('')
  parts.push('请构建完整的故事大纲，包括：')
  parts.push('1. master_outline: 整体故事走向概述（对象：title, summary, hook）')
  parts.push('2. volume_outlines: 分卷/分段大纲，每卷包含：')
  parts.push('   - title: 卷标题')
  parts.push('   - summary: 卷概述')
  parts.push('   - hook: 卷的核心冲突/悬念')
  parts.push('   - chapter_count: 预估章节数')
  parts.push('3. chapter_outlines: 每章简要大纲，包含：')
  parts.push('   - chapter_no: 章节号')
  parts.push('   - title: 章节标题')
  parts.push('   - summary: 本章核心事件')
  parts.push('   - conflict: 本章主要冲突')
  parts.push('   - ending_hook: 本章结尾悬念（用于衔接下一章）')
  parts.push('4. foreshadowing_plan: 伏笔计划')
  parts.push('   - plant_at: 在哪一章埋下伏笔')
  parts.push('   - payoff_at: 在哪一章回收')
  parts.push('   - description: 伏笔描述')
  parts.push('')
  parts.push('关键要求：章节之间必须有清晰的因果链条，前一章的 ending_hook 必须是下一章的起点。')
  parts.push(baseStructuredOutputPrompt(['master_outline', 'volume_outlines', 'chapter_outlines', 'foreshadowing_plan']))
  return parts.filter(Boolean).join('\n')
}

// ── Detail Outline Agent Prompt（细纲分化）──

export function buildDetailOutlinePrompt(
  project: NovelProjectRecord,
  chapterOutlines: Array<any>,
  worldbuilding: any,
  characters: Array<any>,
): string {
  const parts: string[] = []

  parts.push('任务：将粗略章纲扩写为场景级别的详细细纲')
  parts.push(`作品标题：${project.title}`)
  parts.push(`题材：${project.genre || '未知'}`)
  parts.push(`风格：${(project.style_tags || []).join('、') || '未指定'}`)

  // 世界观约束
  if (worldbuilding) {
    parts.push('\n【世界观约束】')
    if (worldbuilding.world_summary) parts.push(`概述：${worldbuilding.world_summary}`)
    if (Array.isArray(worldbuilding.rules)) parts.push(`核心规则：${worldbuilding.rules.join('；')}`)
    if (Array.isArray(worldbuilding.factions)) parts.push(`势力：${worldbuilding.factions.map((f: any) => f.name || f).join('、')}`)
    if (Array.isArray(worldbuilding.items)) parts.push(`关键物品：${worldbuilding.items.map((it: any) => `${it.name}(${it.description || it.ability || '待设定'})`).join('、')}`)
  }

  // 角色列表
  if (characters && characters.length > 0) {
    parts.push('\n【可用角色】')
    for (const char of characters) {
      const name = char.name || char.character_name || '未知'
      const role = char.role || ''
      const personality = Array.isArray(char.personality) ? char.personality.join('，') : (char.personality || '')
      const abilities = Array.isArray(char.abilities) ? char.abilities.join('、') : (char.abilities || '')
      parts.push(`  ${name} [${role}] 性格：${personality} 能力：${abilities}`)
    }
  }

  // 粗略章纲 — 这是细纲的基础
  if (chapterOutlines && chapterOutlines.length > 0) {
    parts.push('\n【粗略章纲（在此基础之上扩写）】')
    for (const ch of chapterOutlines) {
      const no = ch.chapter_no || '?'
      const title = ch.title || '无标题'
      const summary = ch.summary || ch.chapter_summary || ''
      const conflict = ch.conflict || ''
      const hook = ch.ending_hook || ''
      parts.push(`  第${no}章「${title}」`)
      if (summary) parts.push(`    核心事件：${summary}`)
      if (conflict) parts.push(`    冲突：${conflict}`)
      if (hook) parts.push(`    结尾钩子：${hook}`)
    }
  }

  // 伏笔计划
  if (chapterOutlines && chapterOutlines.length > 0 && chapterOutlines[0]?.foreshadowing_plan) {
    parts.push('\n【伏笔计划】')
    for (const fp of chapterOutlines[0].foreshadowing_plan) {
      parts.push(`  第${fp.plant_at}章埋 → 第${fp.payoff_at}章收：${fp.description}`)
    }
  }

  parts.push(`\n\n【输出要求】`)
  parts.push('将每一章扩写为详细的细纲，每章包含以下字段：')
  parts.push('  - chapter_no: 章节号（与粗纲对应）')
  parts.push('  - title: 章节标题')
  parts.push('  - summary: 本章核心事件概述（100字以内）')
  parts.push('  - conflict: 本章主要冲突')
  parts.push('  - scenes: 场景序列数组，每章至少2-4个场景。每个场景包含：')
  parts.push('    • location: 场景地点')
  parts.push('    • characters_present: 出场角色列表')
  parts.push('    • action: 场景内发生的具体事件（2-3句描述）')
  parts.push('    • emotional_tone: 情绪氛围（如：紧张、悬疑、温情、绝望）')
  parts.push('    • dialogue_focus: 对话焦点（本章场景中什么对话最重要）')
  parts.push('  - ending_hook: 本章结尾的悬念/转折点（下一章的入口）')
  parts.push('  - continuity_from_prev: 如何承接上一章——具体说明从上一章的什么状态、什么地点、什么情绪延续而来')
  parts.push('  - items_in_play: 本章涉及的关键物品（来自世界观的物品清单）')
  parts.push('  - foreshadowing: 本章埋下的伏笔（如有）')
  parts.push('  - timeline_note: 时间线说明（如："紧接上一章"、"三天后"、"同一晚更晚时候"）')

  parts.push('\n【关键约束】')
  parts.push('- 第一章的 continuity_from_prev 可以写"故事起点，无前章"')
  parts.push('- 从第二章开始，continuity_from_prev 必须具体引用上一章的 ending_hook')
  parts.push('- 每个场景的地点变化必须有过渡（不能瞬间从一个城市跳到另一个）')
  parts.push('- 角色的出场必须有合理理由（不能无缘无故出现在某个场景）')
  parts.push('- 物品的使用必须与世界规则一致（不能超出能力范围）')
  parts.push('- 情绪曲线：每章应该有起伏，不能全程高潮或全程平淡')
  parts.push('- 每章结尾的 ending_hook 要让读者"不得不看下一章"')

  parts.push('\n输出格式：JSON，包含字段 detail_chapters（数组）')
  parts.push(`⚠️ 不要返回 markdown 格式，必须是纯 JSON`)

  return parts.filter(Boolean).join('\n')
}

// ── Continuity Check Agent Prompt（连续性预检）──

export function buildContinuityCheckPrompt(
  project: NovelProjectRecord,
  detailChapters: Array<any>,
  worldbuilding: any,
  characters: Array<any>,
): string {
  const parts: string[] = []

  parts.push('任务：检查细纲中的连续性是否自洽。在正文创作之前发现并标记所有问题。')
  parts.push(`作品标题：${project.title}`)

  // 细纲
  if (detailChapters && detailChapters.length > 0) {
    parts.push(`\n【待检查的细纲（共 ${detailChapters.length} 章）】`)
    for (const ch of detailChapters) {
      const no = ch.chapter_no || '?'
      const title = ch.title || '无标题'
      const summary = ch.summary || ch.chapter_summary || ''
      const continuity = ch.continuity_from_prev || ''
      const hook = ch.ending_hook || ''
      const scenes = ch.scenes || []
      const items = ch.items_in_play || []
      const timeline = ch.timeline_note || ''
      parts.push(`\n  第${no}章「${title}」`)
      if (timeline) parts.push(`    时间线：${timeline}`)
      if (summary) parts.push(`    核心事件：${summary}`)
      if (continuity) parts.push(`    衔接说明：${continuity}`)
      parts.push(`    场景数：${scenes.length}`)
      for (const scene of scenes) {
        const loc = typeof scene === 'string' ? scene : (scene.location || '')
        const chars = typeof scene === 'object' && scene.characters_present ? scene.characters_present : []
        parts.push(`      → ${loc} [${Array.isArray(chars) ? chars.join('、') : chars}]`)
      }
      if (items.length > 0) parts.push(`    涉及物品：${Array.isArray(items) ? items.join('、') : items}`)
      if (hook) parts.push(`    结尾钩子：${hook}`)
    }
  }

  // 角色
  if (characters && characters.length > 0) {
    parts.push('\n【角色清单】')
    for (const char of characters) {
      const name = char.name || char.character_name || '未知'
      const abilities = Array.isArray(char.abilities) ? char.abilities.join('、') : ''
      parts.push(`  ${name}: ${abilities}`)
    }
  }

  // 物品
  if (worldbuilding && Array.isArray(worldbuilding.items)) {
    parts.push('\n【关键物品】')
    for (const item of worldbuilding.items) {
      parts.push(`  ${item.name}: ${item.description || item.ability || '待设定'}`)
    }
  }

  parts.push('\n【检查清单】')
  parts.push('请逐一检查以下问题：')
  parts.push('1. 衔接连续性：从第2章开始，每章的 continuity_from_prev 是否合理衔接了上一章的 ending_hook？')
  parts.push('2. 角色位置：角色在每章每章的位置变化是否合理？有没有凭空出现或消失？')
  parts.push('3. 角色能力：角色在细纲中的行为是否超出了其设定能力？')
  parts.push('4. 物品追踪：关键物品的出现、使用、丢失、找回是否有完整链路？')
  parts.push('5. 时间线：timeline_note 是否合理？有没有矛盾的时间跳跃？')
  parts.push('6. 伏笔：粗略章纲中的伏笔计划是否在细纲中有所体现？')
  parts.push('7. 情绪曲线：每章的情绪起伏是否合理？有没有章节全程平淡？')

  parts.push('\n输出格式：JSON，包含字段：')
  parts.push('  - continuity_issues: 发现的问题数组，每个问题包含：chapter_no, issue_type, description, severity(high/medium/low), suggested_fix')
  parts.push('  - continuity_fixes: 自动修复建议数组，每个建议包含：chapter_no, field, before, after')
  parts.push('  - is_ready_for_prose: boolean，所有 high 级别问题修复后才能为 true')
  parts.push(`⚠️ 不要返回 markdown 格式，必须是纯 JSON`)

  return parts.filter(Boolean).join('\n')
}

// ── Chapter Prompt（保留，用于 backward compatibility）──

export function buildChapterPrompt(project: NovelProjectRecord, task: string): string {
  return [
    `任务：${task}`,
    `作品标题：${project.title}`,
    project.synopsis ? `简介：${project.synopsis}` : '',
    '',
    '请为每一章生成详细的细纲，每章包含：',
    '1. chapter_no: 章节号',
    '2. title: 章节标题',
    '3. summary: 本章核心事件概述（100字以内）',
    '4. scenes: 场景列表',
    '5. conflict: 本章主要冲突',
    '6. ending_hook: 本章结尾悬念',
    '7. continuity_from_prev: 如何承接上一章',
    baseStructuredOutputPrompt(['chapters']),
  ].filter(Boolean).join('\n')
}

// ── Prose Agent Prompt (核心修复点) ──

export function buildProsePrompt(
  project: NovelProjectRecord,
  chapterDraft: Record<string, any>,
  context: {
    worldbuilding?: any;
    characters?: any;
    outline?: any;
    prevChapters?: Array<Record<string, any>>;
  },
): string {
  const parts: string[] = []

  parts.push(`任务：创作第 ${chapterDraft.chapter_no || '?'} 章正文`)
  parts.push(`作品标题：${project.title}`)
  parts.push(`章节标题：${chapterDraft.title || '无标题'}`)

  // 本章细纲 — 这是正文创作的蓝图
  const chapterSummary = chapterDraft.chapter_summary || chapterDraft.summary || ''
  const chapterConflict = chapterDraft.conflict || ''
  const chapterEndingHook = chapterDraft.ending_hook || ''
  const chapterScenes = chapterDraft.scenes || chapterDraft.scene_breakdown || []
  const chapterContinuityFromPrev = chapterDraft.continuity_from_prev || ''
  const chapterItemsInPlay = chapterDraft.items_in_play || []

  if (chapterSummary) parts.push(`\n【本章细纲】\n核心事件：${chapterSummary}`)
  if (chapterConflict) parts.push(`冲突焦点：${chapterConflict}`)
  if (chapterEndingHook) parts.push(`结尾悬念（本章结束时必须到达的状态）：${chapterEndingHook}`)
  if (chapterScenes.length > 0) {
    parts.push('场景序列：')
    for (const scene of chapterScenes) {
      const loc = typeof scene === 'string' ? scene : (scene.location || scene.title || JSON.stringify(scene))
      const action = typeof scene === 'object' && scene !== null ? (scene.action || scene.description || '') : ''
      const tone = typeof scene === 'object' && scene !== null ? (scene.emotional_tone || scene.tone || '') : ''
      parts.push(`  - ${loc}${action ? ' → ' + action : ''}${tone ? ' [' + tone + ']' : ''}`)
    }
  }
  if (chapterContinuityFromPrev) parts.push(`衔接说明：${chapterContinuityFromPrev}`)
  if (chapterItemsInPlay.length > 0) parts.push(`涉及物品：${Array.isArray(chapterItemsInPlay) ? chapterItemsInPlay.join('、') : chapterItemsInPlay}`)

  // 世界观设定 — 约束创作的边界
  if (context.worldbuilding) {
    const wb = context.worldbuilding
    const rules = Array.isArray(wb.rules) ? wb.rules.join('；') : (typeof wb.rules === 'string' ? wb.rules : '')
    const factions = Array.isArray(wb.factions) ? wb.factions.map((f: any) => f.name || f).join('、') : ''
    parts.push('\n【世界观约束】')
    if (wb.world_summary) parts.push(`概述：${wb.world_summary}`)
    if (rules) parts.push(`核心规则：${rules}`)
    if (factions) parts.push(`势力：${factions}`)
    // 物品清单
    if (Array.isArray(wb.items)) {
      const items = wb.items.map((it: any) => `${it.name}(${it.description || it.ability || ''})`).join('；')
      if (items) parts.push(`关键物品：${items}`)
    }
  }

  // 角色设定 — 每个角色的性格和状态决定了他们的行为
  if (context.characters) {
    const chars = Array.isArray(context.characters) ? context.characters : (context.characters.characters || [])
    if (chars.length > 0) {
      parts.push('\n【角色设定】')
      for (const char of chars) {
        const name = char.name || char.character_name || '未知'
        const role = char.role || ''
        const personality = Array.isArray(char.personality) ? char.personality.join('，') : (char.personality || '')
        const motivation = char.motivation || ''
        const goal = char.goal || ''
        const abilities = Array.isArray(char.abilities) ? char.abilities.join('、') : (char.abilities || '')
        parts.push(`  ${name} [${role}] 性格：${personality} 动机：${motivation} 目标：${goal} 能力：${abilities}`)
      }
    }
  }

  // ========== 最关键的部分：前章结尾状态 ==========
  if (context.prevChapters && context.prevChapters.length > 0) {
    // 取最近的一章作为直接衔接
    const lastChapter = context.prevChapters[context.prevChapters.length - 1]
    const lastText = lastChapter.chapter_text || ''

    // 提取上一章的结尾状态（最后 800 字）
    const endingText = lastText.length > 800 ? lastText.slice(-800) : lastText

    // 尝试提取上一章的结尾悬念
    const lastEndingHook = lastChapter.ending_hook || ''

    parts.push('\n【← 上一章衔接（必须从这里延续）】')
    parts.push(`上一章标题：第${lastChapter.chapter_no}章「${lastChapter.title || '无标题'}」`)

    if (lastEndingHook) {
      parts.push(`上一章结尾悬念：${lastEndingHook}`)
    }

    if (endingText) {
      parts.push(`上一章结尾场景（最后片段）：\n${endingText}`)
    }

    // 如果有更早的章节，提供摘要
    if (context.prevChapters.length > 1) {
      parts.push('\n更早的章节摘要：')
      for (const prev of context.prevChapters.slice(0, -1)) {
        const prevSummary = prev.chapter_summary || prev.summary || ''
        parts.push(`  第${prev.chapter_no}章「${prev.title}」：${prevSummary || (prev.chapter_text || '').slice(0, 200)}`)
      }
    }

    // 关键指令：告诉 LLM 如何衔接
    parts.push('\n⚠️ 衔接指令：')
    parts.push('- 本章的第一句话/第一个场景必须自然地延续上一章结尾的状态')
    parts.push('- 角色在上一章结尾的位置、情绪、手里的物品，在本章开始时必须一致')
    parts.push('- 不得出现"场景突然切换"而没有过渡')
    parts.push('- 如果上一章结尾有未完成的动作或对话，本章开头必须先完成它')
  }

  // 伏笔提示
  if (chapterDraft.foreshadowing) {
    parts.push(`\n【本章伏笔】${chapterDraft.foreshadowing}`)
  }

  // 全局写作约束
  parts.push(`\n\n【写作约束】`)
  parts.push(`1. 本章目标篇幅：${project.length_target === 'long' ? '4000-6000字' : project.length_target === 'short' ? '1500-2500字' : '2500-4000字'}`)
  parts.push(`2. 叙事风格：${(project.style_tags || []).join('、') || '第一人称/第三人称混合叙事'}`)
  parts.push(`3. 对话与描写的比例：对话驱动，描写为辅，每3段对话至少配1段环境/心理描写`)
  parts.push(`4. 不得出现 OOC（角色性格偏离）`)
  parts.push(`5. 不得使用"时间过得很快"、"几天后"之类的跳跃，必须有具体的过渡场景`)
  parts.push(`6. 本章结尾必须到达细纲中指定的 ending_hook 状态：${chapterEndingHook || '自然结束'}`)

  // 输出格式指令
  parts.push(`\n\n输出格式：JSON，包含字段 prose_chapters，其中每个元素包含：chapter_no, title, chapter_text, scene_breakdown, continuity_notes`)
  parts.push(`chapter_text 是完整的正文内容，使用纯文本格式（不要使用 markdown 标题等格式标记）`)
  parts.push(`scene_breakdown 是场景分解数组，每个元素包含 scene_no, description, characters_present`)
  parts.push(`continuity_notes 是连续性备注数组，说明本章如何与上一章衔接`)
  parts.push(`⚠️ 绝对不要返回 "# 第X章：标题" 这样的 markdown 格式，chapter_text 必须直接是正文内容`)

  return parts.join('\n')
}

// ── Platform Fit Agent Prompt ──

export function buildPlatformFitPrompt(
  project: NovelProjectRecord,
  context: { plan?: any; review?: any; prose?: any; chapters?: any[] },
): string {
  const chapters = context.chapters || []
  return [
    '任务：评估当前小说的平台适配度和市场潜力。',
    `作品标题：${project.title}`,
    project.genre ? `题材：${project.genre}` : '',
    `当前章节数：${chapters.length}`,
    `已产出正文章节：${chapters.filter((c: any) => c.chapter_text).length}`,
    '',
    '请评估以下维度：',
    '1. 题材在目标平台的匹配度',
    '2. 目标受众的精准度',
    '3. 开篇抓力（前3章的吸引力）',
    '4. 节奏和连载友好度',
    '5. 每章的质量检查（开头、冲突、悬念、留存）',
    '',
    '输出 JSON 格式：',
    baseStructuredOutputPrompt(['is_platform_ready', 'score', 'platform_type', 'market_positioning', 'strengths', 'risks', 'blocking_issues', 'recommendations', 'launch_advice', 'chapter_checks']),
  ].filter(Boolean).join('\n')
}

// ── Novel Seed (Fallback Content) ──

export function buildNovelSeed(project: NovelProjectRecord, prompt: string) {
  const requestedChapterCount = (() => {
    const m = String(prompt || '').match(/(\d{1,3})\s*章/)
    return m ? Number(m[1]) : 10
  })()

  return {
    world_summary: project.synopsis || `${project.title}的核心世界观待生成。`,
    rules: [],
    factions: [],
    locations: [],
    systems: [],
    timeline_anchor: '故事起点',
    known_unknowns: [],
    outline: {
      title: `${project.title}·暂定总纲`,
      summary: project.synopsis || '待根据项目设定生成完整故事总纲。',
      hook: `${project.title}的核心悬念待生成。`,
      chapter_count: requestedChapterCount,
    },
    volumeOutlines: [],
    chapters: [],
    characters: [],
    prompt,
    chapter_outlines: [],
    foreshadowing_plan: [],
  }
}

// ═══════════════════════════════════════════════════════════
// ── Knowledge Base: Writing Skill Extraction Prompts ──
// ═══════════════════════════════════════════════════════════

export function buildNovelAnalysisPrompt(novelTitle: string, novelText: string): string {
  return `你是一位资深的文学评论家和写作导师，精通网络小说和商业文学的写作技法。

任务：深入分析以下小说文本，提取其写作技巧、风格特征、结构设计等可复用的写作知识。

小说名称：${novelTitle}
分析文本（节选）：
"""
${novelText.slice(0, 12000)}
"""

优先从以下固定维度提炼，也允许你根据文本发现新的可复用维度并返回自定义 category：

1. character_design（人物设计）：人设模板、角色欲望、角色缺陷、人物关系、角色弧光、群像处理
2. story_design（故事设计）：核心矛盾、主线推进、阶段目标、爽点结构、冲突升级、反转设计
3. story_pacing（节奏设计）：起承转合、章节断点、高潮安排、情绪曲线、张弛节奏
4. foreshadowing（伏笔设计）：埋线手法、回收时机、多层伏笔嵌套、悬念钩子
5. ability_design（能力体系设计）：能力来源、成长曲线、能力限制、克制关系、体系层次
6. realm_design（境界设计）：境界命名、晋升条件、瓶颈机制、境界差距、资源消耗
7. worldbuilding（世界观设计）：世界规则、势力架构、地理/历史、社会秩序、制度设定
8. writing_style（写作风格）：语言质感、叙事视角、句式特征、修辞手法、叙述节奏
9. technique（写作技巧）：开篇钩子、场景切换、对话设计、信息披露、视角控制
10. volume_design（分卷设计）：卷结构规划、卷目标、跨卷衔接手法
11. genre_positioning（题材定位）：题材/子类型、平台气质、目标读者、商业卖点、读者期待
12. trope_design（套路设计）：流派套路、反套路、金手指模板、升级模板、日常模板
13. selling_point（卖点设计）：核心爽点、差异化卖点、标题/简介可提炼卖点、读者记忆点
14. reader_hook（读者钩子）：开章钩子、章末钩子、期待管理、追读驱动
15. emotion_design（情绪设计）：爽感、笑点、压抑释放、打脸、温情、紧张感
16. scene_design（场景设计）：高频场景、场景功能、场景调度、对话/动作组织
17. conflict_design（冲突设计）：人物冲突、制度冲突、资源冲突、价值观冲突、冲突升级
18. resource_economy（资源经济）：金钱、装备、修炼成本、价格梯度、资源获取与消耗闭环
19. reference_profile（参考作品画像）：全书核心公式、读者承诺、差异化卖点、可迁移结构
20. volume_architecture（分卷结构）：卷目标、卷内升级、阶段冲突、跨卷衔接
21. chapter_beat_template（章节节拍模板）：开章钩子、场景推进、爽点/笑点/压抑释放、章末钩子
22. character_function_matrix（角色功能矩阵）：主角、配角、对手、工具人、情绪承载者的功能位与关系张力
23. resource_economy_model（资源经济模型）：资源来源、价格梯度、消耗闭环、贫穷/稀缺如何驱动剧情
24. style_profile（文风画像）：叙述视角、句式密度、吐槽/幽默机制、心理描写与对白比例
25. payoff_model（爽点模型）：爽点触发条件、兑现节奏、压抑释放、奖励类型、追读驱动
26. prose_syntax_profile（文风句法）：句长分布、段落密度、修辞偏好、信息句/动作句比例
27. dialogue_mechanism（对话机制）：对话如何承载笑点、信息差、人设、冲突和节奏转场

输出 JSON 格式，是一个数组，每个元素包含以下字段：
  - category: 优先使用上述固定类别；如果文本出现更准确的新类别，也可以返回模型自定义类别（如 "faction_design"）
  - title: 知识条目的简短标题（如"开篇三行钩子法"）
  - content: 详细的分析内容和具体示例（200-500字）
  - tags: 相关标签数组（如 ["开篇", "钩子", "悬念"]）
  - genre_tags: 题材/子类型标签数组（如 ["都市修仙", "校园", "系统流"]）
  - trope_tags: 套路/卖点标签数组（如 ["贫穷流", "扮猪吃虎", "资源经济"]）
  - use_case: 这条知识适合用于什么写作任务（如 "开篇", "升级", "日常笑点", "能力设定", "章末钩子"）
  - evidence: 支撑分析的原文短证据或情节依据（不要超过 120 字）
  - chapter_range: 当前分析来源章节范围；如果无法判断，用空字符串
  - entities: 涉及的角色、势力、能力、物品、地点数组
  - confidence: 0-1 的置信度；文本证据越直接越高
  - weight: 重要程度 1-5（5 为最重要）

示例输出格式：
[
  {
    "category": "technique",
    "title": "开篇三行钩子法",
    "content": "该小说在开篇前三行即通过...（详细分析）",
    "tags": ["开篇", "钩子", "悬念"],
    "genre_tags": ["都市修仙"],
    "trope_tags": ["反差开局"],
    "use_case": "开篇",
    "evidence": "原文中主角一登场就遭遇...",
    "chapter_range": "第1章",
    "entities": ["主角"],
    "confidence": 0.82,
    "weight": 5
  },
  ...
]

⚠️ 绝对不要返回 markdown 格式，必须是纯 JSON 数组。
⚠️ 固定类别中凡是文本有依据的类别至少产出 1 条知识点，总共产出 14-32 条；不要为了凑类别编造文本不存在的内容。
⚠️ 如果文本来自连续多章或整本书，必须至少产出 reference_profile、chapter_beat_template、character_function_matrix、style_profile、payoff_model、prose_syntax_profile；如有分卷/阶段推进证据，产出 volume_architecture；如有金钱、装备、修炼成本、资源稀缺，产出 resource_economy_model；如对话承担笑点/信息差/冲突推进，产出 dialogue_mechanism。
⚠️ 新增 profile 类知识必须写成“可迁移蓝图”，不要只复述原剧情；同时在 content 里标明“可借鉴结构”和“避免照搬点”。
⚠️ tags 支持自由标签：请加入文本中真实出现或可概括出的标签，例如"人物设计"、"境界瓶颈"、"能力代价"、"章节钩子"。
⚠️ genre_tags/trope_tags 必须服务于后续创作检索，不要只复制 category 名称。
⚠️ 分析必须基于文本中的具体内容，引用原文片段作为佐证。`
}

// ── Knowledge Injection: Inject knowledge base into creation prompts ──

export function buildKnowledgeInjectionPrompt(
  projectGenre: string,
  taskType: string,
  knowledgeEntries: Array<{
    category: string
    title: string
    content: string
    weight: number
    genre_tags?: string[]
    trope_tags?: string[]
    use_case?: string
    evidence?: string
    chapter_range?: string
    source_project?: string
    reference_weight?: number
  }>,
): string {
  if (!knowledgeEntries.length) return ''

  const parts: string[] = []
  parts.push(`\n\n📚【写作知识库参考 — 根据你的题材"${projectGenre}"和当前任务"${taskType}"，以下是从优秀作品中提炼的写作知识：】\n`)

  // Group by category
  const groups: Record<string, typeof knowledgeEntries> = {}
  for (const entry of knowledgeEntries) {
    if (!groups[entry.category]) groups[entry.category] = []
    groups[entry.category].push(entry)
  }

  const categoryLabels: Record<string, string> = {
    character_design: '人物设计',
    story_design: '故事设计',
    realm_design: '境界设计',
    writing_style: '写作风格',
    technique: '写作技巧',
    foreshadowing: '伏笔设计',
    worldbuilding: '世界观设计',
    ability_design: '能力体系设计',
    story_pacing: '节奏设计',
    volume_design: '分卷设计',
    character_craft: '角色塑造',
    genre_positioning: '题材定位',
    trope_design: '套路设计',
    selling_point: '卖点设计',
    reader_hook: '读者钩子',
    emotion_design: '情绪设计',
    scene_design: '场景设计',
    conflict_design: '冲突设计',
    resource_economy: '资源经济',
    reference_profile: '参考作品画像',
    volume_architecture: '分卷结构',
    chapter_beat_template: '章节节拍模板',
    character_function_matrix: '角色功能矩阵',
    resource_economy_model: '资源经济模型',
    style_profile: '文风画像',
  }

  for (const [cat, entries] of Object.entries(groups)) {
    parts.push(`— ${categoryLabels[cat] || cat} —`)
    for (const entry of entries) {
      parts.push(`  💡 ${entry.title}（重要度: ${entry.weight}/5）`)
      const meta: string[] = []
      if (entry.source_project) meta.push(`参考:${entry.source_project}`)
      if (entry.reference_weight) meta.push(`权重:${Math.round(entry.reference_weight * 100)}%`)
      if (entry.use_case) meta.push(`用途:${entry.use_case}`)
      if (entry.genre_tags?.length) meta.push(`题材:${entry.genre_tags.join('、')}`)
      if (entry.trope_tags?.length) meta.push(`套路:${entry.trope_tags.join('、')}`)
      if (entry.chapter_range) meta.push(`依据:${entry.chapter_range}`)
      if (meta.length) parts.push(`    ${meta.join('；')}`)
      parts.push(`    ${entry.content.slice(0, 300)}`)
      if (entry.evidence) parts.push(`    证据：${entry.evidence.slice(0, 120)}`)
      parts.push('')
    }
  }

  parts.push('⚠️ 请注意：以上知识是参考蓝图，不是模板。只能借鉴结构、功能和节奏，禁止照搬原作品角色名、专有名词、具体桥段顺序和原文表达。')

  return parts.join('\n')
}
