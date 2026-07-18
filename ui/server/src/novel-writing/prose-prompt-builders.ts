import type { ProseWordTargetEvaluation } from './word-target'
import { buildProsePromptContextSnapshot, prosePromptJson } from './prose-prompt-context'

function sanitizeJsonValue(value: any, seen = new WeakSet<object>(), depth = 0): any {
  if (value == null || typeof value !== 'object') return value
  if (seen.has(value)) return '[Circular]'
  if (depth >= 24) return '[MaxDepth]'
  seen.add(value)
  if (Array.isArray(value)) {
    const output = value.slice(0, 200).map(item => sanitizeJsonValue(item, seen, depth + 1))
    seen.delete(value)
    return output
  }
  const output: Record<string, any> = {}
  for (const [key, item] of Object.entries(value).slice(0, 200)) {
    output[key] = sanitizeJsonValue(item, seen, depth + 1)
  }
  seen.delete(value)
  return output
}

function stringifyPromptJsonSafely(value: any, space?: number, maxChars = 8000) {
  try {
    const text = JSON.stringify(sanitizeJsonValue(value), null, space)
    if (text === undefined) return 'null'
    return maxChars > 0 && text.length > maxChars ? text.slice(0, maxChars) : text
  } catch {
    return JSON.stringify(String(value ?? ''))
  }
}

function proseContextPromptJson(contextPackage: any, maxChars = 7000) {
  return prosePromptJson(buildProsePromptContextSnapshot(contextPackage || {}), maxChars)
}

function openingHandoffPromptBlock(contextPackage: any) {
  const snapshot = buildProsePromptContextSnapshot(contextPackage || {})
  const target: any = snapshot.chapter_target || {}
  const rawTarget: any = mergedPromptChapterTargetPreferRuntime(contextPackage || {})
  const firstScene = target.scene_cards?.[0] || {}
  const batch: any = snapshot.batch_preflight || {}
  const openingContract = {
    chapter_handoff_contract: batch.chapter_handoff_contract || batch.chapterHandoffContract || rawTarget.chapter_handoff_contract || rawTarget.chapterHandoffContract,
    opening_obligations: rawTarget.opening_obligations || rawTarget.openingObligations,
    must_deliver: rawTarget.must_deliver || rawTarget.mustDeliver,
    keep_alive: rawTarget.keep_alive || rawTarget.keepAlive,
    overdue: rawTarget.overdue,
    opening_actions: batch.delivery_risk_carry_over?.opening_actions || batch.deliveryRiskCarryOver?.openingActions,
  }
  const hasOpeningContract = Object.values(openingContract).some(value => Array.isArray(value) ? value.length > 0 : Boolean(value))
  const requiredAnchors = Array.isArray(rawTarget.requiredHandoffAnchors || rawTarget.required_handoff_anchors || target.requiredHandoffAnchors)
    ? (rawTarget.requiredHandoffAnchors || rawTarget.required_handoff_anchors || target.requiredHandoffAnchors)
    : []
  if (!target.previous_handoff && !firstScene.transition_from_previous && !hasOpeningContract && !requiredAnchors.length) return ''
  return [
    '【不可丢失的章首交接】',
    target.previous_handoff ? `上一章最后一幕：${target.previous_handoff}` : '',
    firstScene.transition_from_previous ? `第一场因果桥：${firstScene.transition_from_previous}` : '',
    requiredAnchors.length ? `交接锚点（前300字必须命中）：${requiredAnchors.slice(0, 8).join('、')}` : '',
    hasOpeningContract ? `章首执行合同：${stringifyPromptJsonSafely(openingContract, 0, 3200)}` : '',
    '开篇必须先接住上一章未完成动作；若本章目标包含“解决危机后进入新地点/新副本”，禁止把新地点直接写成第一句。',
    '改稿或润色后的开篇必须保留上一章地点、在场人物、关键持有物/状态和未完成动作，或明确写出合法的时间/空间转移及因果桥；不得为制造强钩子无桥接另起危机。',
  ].filter(Boolean).join('\n')
}

function mergedPromptChapterTargetPreferRuntime(contextPackage: any = {}) {
  const runtimeTarget = contextPackage?.chapterTarget || {}
  const merged = {
    ...(contextPackage?.chapter_target || {}),
    ...runtimeTarget,
  }
  const runtimeHas = (field: string) => Object.prototype.hasOwnProperty.call(runtimeTarget, field) && runtimeTarget[field] !== undefined
  const aliasPairs = [
    ['chapterNo', 'chapter_no'],
    ['endingHook', 'ending_hook'],
    ['previousHandoff', 'previous_handoff'],
    ['wordTarget', 'word_target'],
    ['sceneCards', 'scene_cards'],
  ]
  for (const [camelField, snakeField] of aliasPairs) {
    if (!runtimeHas(camelField)) continue
    merged[snakeField] = runtimeTarget[camelField]
  }
  return merged
}

export function buildProseWordTargetExpansionPrompt(project: any, contextPackage: any, chapterText: string, evaluation: ProseWordTargetEvaluation, options: any = {}) {
  const chapterTarget = mergedPromptChapterTargetPreferRuntime(contextPackage)
  const target = chapterTarget?.word_target || chapterTarget?.wordTarget || {}
  const attempt = Number(options.attempt || 1)
  const maxAttempts = Number(options.maxAttempts || 1)
  const deficit = Math.max(0, Number(evaluation.deficit || 0))
  const targetCount = Number(evaluation.target || target.target || 0)
  const underNinetyPercent = targetCount > 0 && Number(evaluation.actual || 0) < Math.ceil(targetCount * 0.9)
  return [
    '任务：将本章正文扩写到商业网文标准章节长度。',
    `作品标题：${project.title || '未命名作品'}`,
    `目标章节：第${chapterTarget?.chapter_no || chapterTarget?.chapterNo || '?'}章《${chapterTarget?.title || '无标题'}》`,
    maxAttempts > 1 ? `这是第 ${attempt} 轮补写，共最多 ${maxAttempts} 轮。` : '',
    `当前正文约 ${evaluation.actual} 字，目标 ${evaluation.target || target.target || 4200} 字，至少 ${evaluation.min || target.min || 3200} 字，可接受上限 ${evaluation.max || target.max || 5200} 字。`,
    deficit > 0 ? `当前仍缺至少 ${deficit} 字；本轮必须优先补足缺口，再检查章节结尾是否自然。` : '',
    underNinetyPercent ? 'oh-story 90% 字数门禁：当前低于目标 90%，先回到 chapter_blueprint 补充更多子事件/情节点，再把新增子事件写成正文；优先把承载爽点/卖点的情节点展开成具体事例，过渡点保持带过，爽点/卖点优先保扩，不得均匀注水。' : '',
    underNinetyPercent ? '蓝图回补回执：输出 expansion_blueprint_patch，字段 added_beats(array, 新增情节点), expanded_beats(array, 原情节点补充的子事件), compressed_beats(array, 过渡点保持带过的理由)；每项必须写 beat_no/scene_no/action/function_tag/payoff 或 reason。' : '',
    '硬性要求：不得删改已有效内容，不得把正文改成大纲、摘要或设定说明；必须保留本章主线、角色状态、章末钩子和已经成立的连续性。',
    '扩写重点：扩写动作过程、选择代价、对话交锋、章末钩子铺垫；补足每个场景的行动链、反应链、信息变化和后果，不要靠堆砌环境描写凑字数。',
    'oh-story 扩写守恒：不得用环境描写、重复情绪或内心独白凑字数；优先补感官细节、身体动作、对话交锋、阻碍/反应/发现/递进，每段只补 1-2 个有功能细节；不新增支线、设定、关系或时间线。',
    '场景回执要求：scene_breakdown 必须保留并更新 scene_start_anchor、scene_end_anchor 和 scene_card_receipts；scene_start_anchor/scene_end_anchor 必须摘自扩写后对应场景正文，scene_card_receipts.evidence 必须引用扩写后对应场景证据，不得借用其他场景。',
    '如果原文有跳跃、略写或只写结果的段落，请在原位置自然补充过程；如果对话过少，请补充带冲突目标的对话；如果章末钩子过弱，请强化但不要开启下一章剧情。',
    '',
    '【结构化上下文包】',
    proseContextPromptJson(contextPackage, 7000),
    '',
    '【当前过短正文】',
    chapterText.slice(0, 18000),
    '',
    underNinetyPercent
      ? '输出 JSON，包含 prose_chapters 数组。数组只能有一项，且必须包含 chapter_no, title, chapter_text, scene_breakdown, continuity_notes, expansion_blueprint_patch。scene_breakdown 必须保留并更新 scene_start_anchor、scene_end_anchor 和 scene_card_receipts。chapter_text 必须返回扩写后的完整正文，不要只返回新增段落，不要 markdown 标题。'
      : '输出 JSON，包含 prose_chapters 数组。数组只能有一项，且必须包含 chapter_no, title, chapter_text, scene_breakdown, continuity_notes。scene_breakdown 必须保留并更新 scene_start_anchor、scene_end_anchor 和 scene_card_receipts。chapter_text 必须返回扩写后的完整正文，不要只返回新增段落，不要 markdown 标题。',
  ].filter(Boolean).join('\n')
}

export function buildProseWordTargetContractionPrompt(project: any, contextPackage: any, chapterText: string, evaluation: ProseWordTargetEvaluation, options: any = {}) {
  const chapterTarget = mergedPromptChapterTargetPreferRuntime(contextPackage)
  const target = chapterTarget?.word_target || chapterTarget?.wordTarget || {}
  const attempt = Number(options.attempt || 1)
  const maxAttempts = Number(options.maxAttempts || 1)
  const max = Number(evaluation.max || target.max || 5200)
  const min = Number(evaluation.min || target.min || 3200)
  const targetCount = Number(evaluation.target || target.target || 4200)
  const safeMax = Math.max(min, Math.min(max, Math.round((targetCount + max) / 2)))
  const excess = Math.max(0, Number(evaluation.actual || 0) - max)
  const requiredReduction = Math.max(0, Number(evaluation.actual || 0) - safeMax)
  const laterAttempt = attempt > 1
  return [
    '任务：将本章正文压缩到商业网文标准章节长度。',
    `作品标题：${project.title || '未命名作品'}`,
    `目标章节：第${chapterTarget?.chapter_no || chapterTarget?.chapterNo || '?'}章《${chapterTarget?.title || '无标题'}》`,
    maxAttempts > 1 ? `这是第 ${attempt} 轮压缩，共最多 ${maxAttempts} 轮。` : '',
    `当前正文约 ${evaluation.actual} 字，目标 ${targetCount} 字，可接受范围 ${min}-${max} 字。`,
    '唯一计数口径：chapter_text 去掉所有空白字符后的程序字符数，包括全角空格等不可见空白；不按中文词数、token 或估算字数计数。',
    `压缩验收：建议落在 ${min}-${safeMax} 字，绝不能超过 ${max} 字；如果不确定，宁可靠近 ${targetCount} 字，不要贴着上限写。`,
    requiredReduction > 0 ? `硬删减预算：本轮至少净删 ${requiredReduction} 个字符，输出前必须按上述口径自检 chapter_text。` : '',
    excess > 0 ? `当前至少超出 ${excess} 字；本轮必须压到上限以内，优先压到目标附近。` : '',
    laterAttempt ? '上一轮仍超上限，本轮不得只做换词和局部删句；改用场景功能保真的重构式压缩。' : '',
    laterAttempt ? '重构规则：每个场景只保留一条完整行动链，把重复的感官、解释、反应和对话合并进行动或后果；保留事件功能不等于保留原句。' : '',
    '硬性要求：不得删主线事实、角色状态、章末钩子、关键设定触发、爽点回报和已经成立的连续性。',
    '压缩优先级：删除重复解释、设定说明、空泛心理、环境铺陈、同义反复；合并功能相同的对话、动作、反应和旁白。',
    '保留优先级：开篇钩子、每张场景卡的目标/阻碍/转折/回报、主角选择与代价、角色关系变化、关键信息增量、章末翻页钩子。',
    'oh-story 压缩守恒：只压水分，不压事件功能；一事一段，段落仍保持网文可读节奏；不能把正文改成大纲、摘要或设定说明。',
    '场景回执要求：scene_breakdown 必须保留并更新 scene_start_anchor、scene_end_anchor 和 scene_card_receipts；scene_card_receipts.evidence 必须引用压缩后仍存在的正文证据。',
    '',
    '【结构化上下文包】',
    proseContextPromptJson(contextPackage, 7000),
    '',
    '【当前过长正文】',
    chapterText,
    '',
    `最终硬验收：chapter_text 按去空白字符口径必须为 ${min}-${safeMax} 个字符；超过 ${max} 即整个输出作废。`,
    '输出 JSON，包含 prose_chapters 数组。数组只能有一项，且必须包含 chapter_no, title, chapter_text, scene_breakdown, continuity_notes。scene_breakdown 必须保留并更新 scene_start_anchor、scene_end_anchor 和 scene_card_receipts。额外输出 contraction_report: {removed_types(array), preserved_story_functions(array), preserved_receipts(array), non_whitespace_character_count(number)}。chapter_text 必须返回压缩后的完整正文，不要只返回删减说明，不要 markdown 标题。',
  ].filter(Boolean).join('\n')
}

export function buildCommercialEditorRewritePrompt(project: any, contextPackage: any, chapterText: string, options: any = {}) {
  const chapterTarget = mergedPromptChapterTargetPreferRuntime(contextPackage)
  const target = chapterTarget?.word_target || chapterTarget?.wordTarget || {}
  return [
    '任务：商业主编改稿。你不是重新写新剧情，而是在保留本章事实、人物状态和设定约束的前提下，把初稿改成更像可连载商业网文的版本。',
    `作品标题：${project.title || '未命名作品'}`,
    `目标章节：第${chapterTarget?.chapter_no || chapterTarget?.chapterNo || '?'}章《${chapterTarget?.title || '无标题'}》`,
    target?.target ? `字数约束：目标 ${target.target} 字，可接受范围 ${target.min}-${target.max} 字。改稿后不得低于下限，不能为追求精炼而明显缩短。` : '',
    options?.phase ? `改稿阶段：${options.phase}` : '',
    '',
    openingHandoffPromptBlock(contextPackage),
    '',
    '【主编改稿重点】',
    '1. 开篇钩子：前 300 字必须给出事故、异常、危险、欲望或反常信息，不要平铺醒来和解释。',
    '2. 人物声音：主角、智者、求生者等角色说话方式要可区分；减少通用惊讶、通用冷静和旁白替角色总结。',
    '3. 规则压力：把规则的触发条件、倒计时、违规代价和角色选择压力写成可见事件。',
    '4. 恐怖具象化：少用“诡异、阴森、压抑”等空泛词，多写声音、光线、物体、身体反应和空间变化。',
    '5. 爽点密度：每 800-1200 字至少有一次信息推进、能力展示、危机反制、关系变化或小回收。',
    '6. 章末钩子：结尾必须把 ending_hook 或 scene_cards.ending_hook_seed 强化成下一章非看不可的问题。',
    '7. 删除模板句：删掉“不是那么简单”“拉开序幕”“已然”等模板化总结，替换成具体动作和后果。',
    '8. 不得改写主线事实，不得新增破坏后续大纲的设定；setting_context 的 forbidden/knowledge_scope 必须遵守。',
    '9. 如果 chapter_target.meme_strategy 存在，只能按其 allowed_functions 做克制型网感表达；不得直接复刻 meme_bank 中的原梗或流行语。',
    '10. 必须保留并更新 scene_breakdown 中的 scene_start_anchor、scene_end_anchor 和 scene_card_receipts；scene_start_anchor/scene_end_anchor 必须摘自改稿后对应场景正文，scene_card_receipts.evidence 必须引用改稿后对应场景证据，不得借用其他场景。',
    '11. oh-story 自然改稿底线：按“动作 -> 对话 -> 情绪反应 -> 动作”重排可读性；对话要像人说话，心情不写心里话，章尾不搞大升华，打斗不写流水账；只把抽象总结改成动作、对白、感官或后果。',
    '12. 修订守恒：不得改写主线事实，不得新增支线、设定、关系或时间线；只能压缩水文、补足缺过程的动作/对话/反应、替换 AI 腔表达，并保留原本有效的伏笔、钩子、角色状态和设定边界。',
    '',
    '【结构化上下文包】',
    proseContextPromptJson(contextPackage, 7000),
    '',
    '【待改稿正文】',
    chapterText.slice(0, 22000),
    '',
    '输出 JSON，包含 prose_chapters 数组。数组只能有一项，且必须包含 chapter_no, title, chapter_text, scene_breakdown, continuity_notes；scene_breakdown 必须保留并更新 scene_start_anchor、scene_end_anchor、scene_card_receipts；同时输出 editor_report，说明 applied_changes(array)、remaining_risks(array)、word_count_estimate(number)。chapter_text 必须是改稿后的完整正文，不要 markdown 标题。',
  ].filter(Boolean).join('\n')
}

export function buildMemePolishPrompt(project: any, contextPackage: any, chapterText: string, options: any = {}) {
  const chapterTarget = contextPackage?.chapter_target || contextPackage?.chapterTarget || {}
  const memeStrategy = options?.memeStrategy
    || chapterTarget?.meme_strategy
    || chapterTarget?.memeStrategy
    || {}
  return [
    '任务：克制型网感润色。只允许做语言层润色，不允许重写剧情。',
    `作品标题：${project.title || '未命名作品'}`,
    `目标章节：第${chapterTarget?.chapter_no || chapterTarget?.chapterNo || '?'}章《${chapterTarget?.title || '无标题'}》`,
    '',
    '硬性边界：',
    '1. 不得修改剧情线、设定状态、人物状态、章节事件、章节号和章末钩子方向。',
    '1A. 不得修改设定状态，不得修改人物状态，不得把语言润色变成剧情重写。',
    '2. 热梗只抽象为吐槽节奏、情绪共鸣、角色口吻、评论区传播点，不得直接复刻原句。',
    '3. 严肃死亡、恐怖压迫、关键情绪爆点和高压反转处默认降低网感，不插科打诨。',
    '4. 如果素材不适合本章，必须拒绝使用，并在 rejected_memes 说明。',
    '5. 必须保留并更新 scene_breakdown 中的 scene_start_anchor、scene_end_anchor 和 scene_card_receipts；scene_start_anchor/scene_end_anchor 必须摘自润色后对应场景正文，scene_card_receipts.evidence 必须引用润色后对应场景证据，不得借用其他场景。',
    '6. oh-story 网感边界：网感不能覆盖自然写法；对话要像人说话，心情不写心里话，章尾不搞大升华；不得为了梗改角色声线、情绪基调、章末钩子或场景因果。',
    '',
    openingHandoffPromptBlock(contextPackage),
    '',
    '【本章网感策略】',
    stringifyPromptJsonSafely(memeStrategy, 2, 5000),
    '',
    '【结构化上下文包】',
    proseContextPromptJson(contextPackage, 6000),
    '',
    '【待润色正文】',
    chapterText.slice(0, 22000),
    '',
    '输出 JSON，包含 prose_chapters 数组。数组只能有一项，包含 chapter_no,title,chapter_text,scene_breakdown,continuity_notes；scene_breakdown 必须保留并更新 scene_start_anchor、scene_end_anchor、scene_card_receipts；同时输出 meme_polish_report: {used_meme_functions(array), rejected_memes(array), immersion_risks(array), changed_plot(boolean)}。chapter_text 必须是润色后的完整正文。',
  ].filter(Boolean).join('\n')
}

export function buildReadabilityReviewPrompt(project: any, contextPackage: any, chapterText: string) {
  const chapterTarget = contextPackage?.chapter_target || contextPackage?.chapterTarget || {}
  return [
    '任务：对最终章节做可读性/网感复检，只评估，不改稿。',
    `作品标题：${project.title || '未命名作品'}`,
    `目标章节：第${chapterTarget?.chapter_no || chapterTarget?.chapterNo || '?'}章《${chapterTarget?.title || '无标题'}》`,
    '',
    '请重点检查：',
    '1. 开篇 300 字是否有钩子，是否快速给出异常、危险、欲望或反常信息。',
    '2. 每个场景是否有场景目标、阻碍、转折、回报。',
    '3. 段落是否过长、说明是否过密、连续环境描写是否过多。',
    '4. 对话比例是否支撑冲突推进。',
    '5. 人物口吻差异是否明确，主角、智者、配角不能都像旁白。',
    '6. 爽点/信息增量密度是否足够，是否每 800-1200 字有推进或回报。',
    '7. 章末翻页是否有力：最后 300 字是否形成下一章非看不可的危险、选择、反转、未解答案或利益诱惑。',
    '8. 网感是否克制：只使用吐槽节奏、情绪共鸣、角色口吻和传播点，不直接堆梗。',
    '9. AI味/deslop 扫描：检查高频套话、章末总结体、抽象心理、说明书式对话、过度工整排比、解释腔/上帝视角；必须给出原文证据和可执行去AI味方向。',
    '10. oh-story 快速自检口诀：一事一段，镜头自然断；对话要像人说话；心情不写心里话；章尾不搞大升华；打斗不写流水账。命中时必须写入 ai_smell.pattern_hits 或 issues，并给出原文证据。',
    '',
    '【结构化上下文包】',
    proseContextPromptJson(contextPackage, 6000),
    '',
    '【最终正文】',
    chapterText.slice(0, 18000),
    '',
    '输出 JSON，字段 readability_score(0-100), passed(boolean), opening_hook_score, ending_hook_score, scene_readability_score, paragraph_density_score, dialogue_voice_score, payoff_density_score, meme_sense:{intensity,used_functions(array),rejected_memes(array),immersion_risks(array)}, ai_smell:{level("无"|"轻度"|"中度"|"重度"),pattern_hits(array of {type,evidence,location}),rewrite_tactics(array)}, issues(array), suggestions(array)。只返回 JSON。',
  ].join('\n')
}
