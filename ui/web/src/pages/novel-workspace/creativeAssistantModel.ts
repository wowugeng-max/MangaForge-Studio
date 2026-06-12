export type CreativeAssistantModeKey =
  | 'prose_review'
  | 'next_chapter'
  | 'outline_expand'
  | 'foreshadowing'
  | 'character_arc'
  | 'system_design'
  | 'research_cards'

export type CreativeAssistantMode = {
  key: CreativeAssistantModeKey
  label: string
  description: string
}

export type CreativeAssistCard = {
  id: string
  type: string
  title: string
  intent: string
  reason: string
  suggestion: string
  risk: string
  applies_to: string
  action: string
}

export type CreativeAssistResult = {
  mode: CreativeAssistantModeKey
  summary: string
  context_status: string[]
  cards: CreativeAssistCard[]
  research_cards: any[]
  warnings: string[]
}

export type CreativeAssistantContextChip = {
  key: string
  label: string
  tone: 'ready' | 'warn' | 'neutral'
}

export const CREATIVE_ASSISTANT_MODES: CreativeAssistantMode[] = [
  { key: 'prose_review', label: '正文评析', description: '分析当前正文、节奏、钩子、人物声音和修改方向。' },
  { key: 'next_chapter', label: '下一章', description: '从当前结尾出发给出下一章多分支写法。' },
  { key: 'outline_expand', label: '后续大纲', description: '扩展未来章节、卷级转折和长线推进路线。' },
  { key: 'foreshadowing', label: '伏笔', description: '设计埋线、误导、回收时机和禁提前揭示点。' },
  { key: 'character_arc', label: '人物剧情', description: '补人物选择、成长节点、关系变化和剧情线推动。' },
  { key: 'system_design', label: '能力物品', description: '设计能力、物品、势力和资源体系的规则与代价。' },
  { key: 'research_cards', label: '联网资料', description: '把关键词或 URL 转成创作资料卡和安全借鉴边界。' },
]

function text(value: any, fallback = '') {
  const normalized = String(value || fallback || '').replace(/\s+/g, ' ').trim()
  return normalized
}

function compact(value: any, limit = 120, fallback = '') {
  const normalized = text(value, fallback)
  return normalized.length > limit ? `${normalized.slice(0, limit)}…` : normalized
}

function asArray(value: any) {
  return Array.isArray(value) ? value : []
}

function promiseOf(project: any) {
  return compact(
    project?.reference_config?.writing_bible?.promise
      || project?.reference_config?.style_lock?.reader_promise
      || project?.synopsis
      || project?.title,
    80,
    '当前作品核心承诺',
  )
}

function chapterLabel(chapter: any) {
  if (!chapter) return '当前项目'
  return `第${chapter.chapter_no || '?'}章《${chapter.title || '未命名'}》`
}

function card(mode: CreativeAssistantModeKey, index: number, patch: Partial<CreativeAssistCard>): CreativeAssistCard {
  return {
    id: patch.id || `${mode}-fallback-${index}`,
    type: patch.type || 'idea',
    title: patch.title || '创作建议',
    intent: patch.intent || '帮助作者获得下一步选择。',
    reason: patch.reason || '当前材料可以继续扩展，但需要作者确认方向。',
    suggestion: patch.suggestion || '先保留正史边界，再扩展多个可选写法。',
    risk: patch.risk || '不要在未确认前写入正史。',
    applies_to: patch.applies_to || 'current_project',
    action: patch.action || 'copy',
  }
}

export function buildCreativeAssistantFallbackCards(
  mode: CreativeAssistantModeKey,
  input: {
    project?: any
    activeChapter?: any
    characters?: any[]
    outlines?: any[]
    reviews?: any[]
    selectedText?: string
  },
): CreativeAssistCard[] {
  const project = input.project || {}
  const chapter = input.activeChapter || null
  const characters = asArray(input.characters)
  const outlines = asArray(input.outlines)
  const label = chapterLabel(chapter)
  const promise = promiseOf(project)
  const selected = compact(input.selectedText || chapter?.chapter_text, 100, '当前还没有可分析正文')
  const protagonist = compact(characters[0]?.name, 32, '主角')
  const endingHook = compact(chapter?.ending_hook, 80, '章末问题尚未锁定')
  const route = compact(outlines[0]?.summary || outlines[0]?.title, 80, '后续路线尚未展开')

  if (mode === 'prose_review') {
    return [
      card(mode, 1, {
        type: 'evaluation',
        title: `${label}正文读感拆解`,
        reason: `当前样本：${selected}`,
        suggestion: '优先检查开篇钩子、角色行动、信息增量、冲突升级和章末追读，每轮只挑一个最影响读者继续看的问题改。',
        risk: '不要为了节奏删掉已经成立的设定证据和人物选择代价。',
        applies_to: 'current_prose',
        action: 'turn_into_revision_task',
      }),
    ]
  }

  if (mode === 'next_chapter') {
    return [
      card(mode, 1, {
        type: 'branch',
        title: '安全续写分支',
        reason: `当前钩子：${endingHook}`,
        suggestion: `${protagonist}先处理章末异常的直接后果，再发现更高层规则或敌对势力的边缘证据。`,
        risk: '不要在下一章过早解释最终真相。',
        applies_to: 'next_chapter',
      }),
      card(mode, 2, {
        type: 'commercial_pull',
        title: '强追读分支',
        reason: `读者承诺：${promise}`,
        suggestion: '下一章前 300 字先给出可见危机或收益诱惑，中段让主角做有代价选择，结尾留下更具体的问题。',
        risk: '强刺激不能绕开主角能动性。',
        applies_to: 'next_chapter_opening',
      }),
    ]
  }

  if (mode === 'outline_expand') {
    return [
      card(mode, 1, {
        type: 'outline',
        title: '未来五章推进骨架',
        reason: `当前长线锚点：${route}`,
        suggestion: '按「问题扩大 -> 代价显形 -> 小回收 -> 关系转折 -> 新阶段入口」设计未来五章。',
        risk: '不要让未来路线只扩大设定而没有角色选择。',
        applies_to: 'future_outline',
        action: 'open_outline_editor',
      }),
    ]
  }

  if (mode === 'foreshadowing') {
    return [
      card(mode, 1, {
        type: 'foreshadowing',
        title: '双层伏笔方案',
        reason: `可转伏笔线索：${endingHook}`,
        suggestion: '设计一条 2-3 章回收的小伏笔和一条 20 章以上回收的大伏笔，并为每条写清禁提前揭示点。',
        risk: '伏笔不能只靠旁白说明，必须落在物品、选择、台词或场景异常上。',
        applies_to: 'foreshadowing_arc',
        action: 'open_story_assets',
      }),
    ]
  }

  if (mode === 'character_arc') {
    return [
      card(mode, 1, {
        type: 'character_arc',
        title: `${protagonist}的下一次选择`,
        reason: `当前作品承诺「${promise}」需要角色用行动兑现。`,
        suggestion: '给角色一个不能同时保全收益、关系和秘密的选择，并让配角立场因此发生细微变化。',
        risk: '不要只写心理活动，必须有可见行动和后果。',
        applies_to: 'character_arc',
        action: 'open_character_editor',
      }),
    ]
  }

  if (mode === 'system_design') {
    return [
      card(mode, 1, {
        type: 'system_rule',
        title: '能力/物品体系的代价闭环',
        reason: '能力、物品和势力体系需要限制，才会持续产生冲突。',
        suggestion: '为核心能力或物品补三项：触发条件、使用代价、失败后果；再写一个能被读者看见的利用场景。',
        risk: '不要新增无上限能力，避免破坏后续危机。',
        applies_to: 'system_design',
        action: 'open_story_assets',
      }),
    ]
  }

  return [
    card(mode, 1, {
      type: 'research',
      title: '资料卡生成',
      reason: `资料需要服务作品承诺：${promise}`,
      suggestion: '提炼事实细节、可视化元素、职业/制度约束和可转化冲突；只学习抽象机制，不迁移具体桥段和专名。',
      risk: '联网资料不能直接变成照搬设定或原句。',
      applies_to: 'research_cards',
    }),
  ]
}

export function buildCreativeAssistantContextChips(input: {
  project?: any
  activeChapter?: any
  selectedText?: string
  contextPackage?: any
  reviews?: any[]
}): CreativeAssistantContextChip[] {
  const chips: CreativeAssistantContextChip[] = []
  if (input.activeChapter) chips.push({ key: 'chapter', label: '当前章', tone: 'ready' })
  if (text(input.selectedText)) chips.push({ key: 'selection', label: '选中文本', tone: 'ready' })
  if (input.project?.reference_config?.writing_bible) chips.push({ key: 'writing_bible', label: '写作圣经', tone: 'ready' })
  if (input.contextPackage) chips.push({ key: 'context_package', label: '上下文包', tone: 'ready' })
  if (asArray(input.reviews).some(review => review.review_type === 'prose_quality' || review.review_type === 'editor_report')) {
    chips.push({ key: 'reviews', label: '质检', tone: 'ready' })
  }
  if (asArray(input.project?.reference_config?.references).length > 0) chips.push({ key: 'references', label: '参考', tone: 'ready' })
  return chips
}

export function normalizeCreativeAssistPayload(payload: any): CreativeAssistResult {
  const raw = payload?.assist || payload || {}
  const mode = CREATIVE_ASSISTANT_MODES.some(item => item.key === raw.mode)
    ? raw.mode as CreativeAssistantModeKey
    : 'prose_review'
  const cards = asArray(raw.cards).map((item, index) => card(mode, index + 1, {
    id: item?.id || `${mode}-card-${index + 1}`,
    type: item?.type,
    title: item?.title,
    intent: item?.intent,
    reason: item?.reason,
    suggestion: item?.suggestion,
    risk: item?.risk,
    applies_to: item?.applies_to || item?.appliesTo,
    action: item?.action || 'copy',
  }))

  return {
    mode,
    summary: text(raw.summary, cards[0]?.title || '已生成创作参谋建议'),
    context_status: asArray(raw.context_status || raw.contextStatus).map(String),
    cards,
    research_cards: asArray(raw.research_cards || raw.researchCards),
    warnings: asArray(raw.warnings).map(String),
  }
}
