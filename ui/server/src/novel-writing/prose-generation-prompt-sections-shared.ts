export function asArray(value: any) {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

export function joinList(value: any, separator = '；') {
  return asArray(value).filter(Boolean).join(separator)
}

export function compactPromptText(value: any, fallback = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim()
}

export function uniquePromptStrings(values: any, limit = 6) {
  const seen = new Set<string>()
  return asArray(values)
    .map((item: any) => compactPromptText(item))
    .filter((item: string) => {
      if (!item || seen.has(item)) return false
      seen.add(item)
      return true
    })
    .slice(0, limit)
}

export const OH_STORY_PROSE_CRAFT_REQUIRED_FIELDS = [
  'pov_rules',
  'expression_rules/body_detail_rules',
  'scene_weaving_rules',
  'subject_name_rhythm_rules',
  'indirect_description_rules',
  'three_camera_rules',
  'then_what_rules',
  'core_emotion_alignment_rules',
  'baimiao_sensory_rules',
  'dynamic_description_rules',
  'shot_rhythm_rules',
  'transition_bridge_rules',
  'rhythm_rules',
  'object_number_rules',
  'section_structure_rules',
  'section_density_rules',
  'anti_padding_rules',
  'concept_anchor_rules',
  'description_limits',
  'anti_ai_smell_rules',
  'quality_checks',
]

export function compactProseCraftItems(values: any, limit = 2) {
  return asArray(values)
    .map((item: any) => compactPromptText(item))
    .filter(Boolean)
    .slice(0, limit)
    .join('；')
}

export function formatProseCraftPromptSnippet(contract: any = {}) {
  const sceneAnchors = compactProseCraftItems(contract.scene_anchors || contract.sceneAnchors, 6)
  const qualityChecks = compactProseCraftItems(contract.quality_checks || contract.qualityChecks, 4)
  return [
    '硬性要求：执行 chapter_target.prose_craft_contract；这是来自 oh-story writing-craft/style-craft 的正文工艺短口径，正文必须用可见动作、身体细节、感官锚点、物件/数字和镜头节奏交付情绪。',
    '写作四要点：深度限知；身体细节替代情绪词；三维度揉进（发生/感知/身体反应）；一动一静控制节奏，关键道具和具体数字必须承担剧情或情绪功能。',
    '字段口径：subject_name_rhythm_rules=主语与名字节奏，段首、场景切换、多人同场、视角重置点名，同一动作链/同一段内部段中用代词/省略流动，优先用“他/她”、动作承接或省略主语，不要连续多句都以同一角色名开头，避免每句报名字和指代不清；indirect_description_rules=间接描写法，正面描写只是铺垫，侧面反应才是爽点，不要直接宣布，用配角动作/围观者判断/对手失态/环境变化证明。',
    '镜头口径：three_camera_rules=三机位法，机位1贴主角近景动作/表情/身体感受，机位2给外部反应或环境反馈，机位3只补冲突触发的必要设定；shot_rhythm_rules=镜头与分镜思维，远景/中景/近景/特写按信息、关系、风险和情绪变化切换，冲突用短句、短段、密集动作。',
    '推进口径：then_what_rules=“然后呢”基点法，每段信息点后立刻接动作、发现、反应、选择、风险或新疑问；core_emotion_alignment_rules=核心情绪对齐，情节、人设、冲突和每个细节都服务本章情绪目标、读者回报或全书核心情绪。',
    '画面口径：baimiao_sensory_rules=白描/五感，用最少的字写准信息和情绪，关键场景两到三种感官且必须服务情绪、动作、规则或危险；dynamic_description_rules=动态描写优于静态描写，人物用动作和反应展现，环境在角色行动中穿插点染。',
    '转场与小节：transition_bridge_rules=场景切换与转场，用相似物/相似五感/相似情绪，时间跳转靠动作或物件，空间跳转靠声音或光影；section_structure_rules=小节内部结构，一个主事件 + 3-5 个子事件 + 一个情绪变化 + 一条读者新获知的信息 + 必要 3-5 轮对话交锋，小节结尾留一个钩子，下一节开头快速接续，情绪跨节递进。',
    '控水与新概念：section_density_rules=小节密度诊断，偏短不得加环境描写，先查子事件三维度，再补身体动作、感官细节、对话交锋、阻碍/反应/发现/递进或 2-3 句简短回忆；concept_anchor_rules=新概念锚点，新名词/新设定/新道具首次出现必须有动作反应、对话半句或物理后果；description_limits=水分控制，删掉这段后读者不会困惑的环境、心理、旁白、回忆和重复信息必须删除或压缩。',
    '去AI味：anti_ai_smell_rules=扫描高危词、章末总结体、叠加式描写和心理告知；仿佛/犹如/一丝/一抹/深吸一口气/眼中闪过/嘴角勾起等模板表达高频出现时改成动作、物件、对话或白描。',
    `字段清单：${OH_STORY_PROSE_CRAFT_REQUIRED_FIELDS.join(', ')}；交稿自检必须输出 prose_craft_checks，并用正文证据检查深度限知、身体细节、三维度揉进、间接描写/侧面反应、三机位、然后呢、核心情绪、白描五感、动态描写、镜头转场、小节结构、新概念锚点、水分控制和去AI味。`,
    sceneAnchors ? `本章工艺锚点：${sceneAnchors}` : '',
    qualityChecks ? `prose_craft_checks 摘录：${qualityChecks}` : '',
  ].filter(Boolean)
}

export function formatQualityAuditPhaseChecklist(items: any[] = []) {
  return asArray(items)
    .map((item: any) => {
      const phase = compactPromptText(item?.phase)
      const receipts = uniquePromptStrings(item?.receipt_keys || item?.receiptKeys || [], 6)
      if (!phase || !receipts.length) return ''
      return `${phase} -> ${receipts.join('/')}`
    })
    .filter(Boolean)
    .join('；')
}

export function formatDialogueExecutionChecklist(items: any) {
  return asArray(items)
    .map((item: any) => [
      `场景${item.scene_no ?? item.sceneNo ?? ''} ${compactPromptText(item.scene)}`.trim(),
      item.mode ? `mode=${item.mode}` : '',
      asArray(item.speaker_agendas || item.speakerAgendas).length ? `speaker_agendas=${joinList(item.speaker_agendas || item.speakerAgendas, '/')}` : '',
      asArray(item.line_functions || item.lineFunctions).length ? `line_functions=${joinList(item.line_functions || item.lineFunctions, '/')}` : '',
      asArray(item.emotion_flow || item.emotionFlow).length ? `emotion_flow=${joinList(item.emotion_flow || item.emotionFlow, '/')}` : '',
      asArray(item.information_strategy || item.informationStrategy).length ? `information_strategy=${joinList(item.information_strategy || item.informationStrategy, '/')}` : '',
      asArray(item.voice_differentiation || item.voiceDifferentiation).length ? `voice_differentiation=${joinList(item.voice_differentiation || item.voiceDifferentiation, '/')}` : '',
      asArray(item.forbidden_patterns || item.forbiddenPatterns).length ? `forbidden=${joinList(item.forbidden_patterns || item.forbiddenPatterns, '/')}` : '',
      asArray(item.receipt_keys || item.receiptKeys).length ? `receipt_keys=${joinList(item.receipt_keys || item.receiptKeys, ',')}` : '',
    ].filter(Boolean).join('｜'))
    .filter(Boolean)
    .join('；')
}

