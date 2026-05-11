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
