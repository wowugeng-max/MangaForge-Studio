function compactText(value: any, fallback = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim()
}

function collectText(...values: any[]) {
  return values.flatMap(value => {
    if (!value) return []
    if (Array.isArray(value)) return value.map(item => collectText(item)).flat()
    if (typeof value === 'object') return Object.values(value).map(item => collectText(item)).flat()
    return [compactText(value)]
  }).filter(Boolean)
}

function asObject(value: any) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function explicitContract(...values: any[]) {
  for (const value of values) {
    const object = asObject(value)
    if (object.source === 'oh_story_outline_structure_theory_v1' || object.version === 'oh_story_longform_structure_v1') return object
    const nested = asObject(
      object?.longform_structure_contract
      || object?.writing_bible?.longform_structure_contract
      || object?.writingBible?.longformStructureContract,
    )
    if (Object.keys(nested).length) return nested
  }
  return {}
}

function inferStructureMode(rawText: string, lengthHint = '') {
  const text = `${rawText} ${lengthHint}`
  if (/短篇|单元剧|日常|无敌|轻松|short/.test(text)) return '一级结构：单元剧串联，核心爽点+讨喜人设+单元舞台。'
  if (/超长|epic|300万|五卷|多卷|长篇|long|升级|悬疑|规则|副本|修仙|仙侠|玄幻/.test(text)) return '二级结构：每卷是完整故事，卷内小故事套娃铺垫大故事。'
  return '二级结构优先；中篇可按一级单元剧加阶段主线过渡。'
}

export function buildOhStoryLongformStructureContract(...inputs: any[]) {
  const existing = explicitContract(...inputs)
  const rawText = collectText(...inputs).join('｜')
  const lengthHint = collectText(...inputs.map(input => input?.length_target || input?.lengthTarget)).join(' ')
  const structureMode = compactText(existing.structure_mode || existing.structureMode, inferStructureMode(rawText, lengthHint))

  return {
    source: existing.source || 'oh_story_outline_structure_theory_v1',
    version: existing.version || 'oh_story_longform_structure_v1',
    route: existing.route || 'project_longform_skeleton_gate',
    structure_mode: structureMode,
    structure_level_rules: [
      '创建阶段必须先选择一级/二级/三级结构：短篇或无敌日常可用一级单元剧，长篇/超长篇优先二级结构，三级结构只在全书强统一因果时使用。',
      '二级结构要求每卷是完整故事，卷内每个部分本身也是小故事，小故事有爽点并暗中铺垫大故事。',
      '结构层级必须匹配题材和篇幅，不能把短篇硬扩成长篇，也不能让长篇只靠孤立单元剧串联。',
    ],
    five_act_causal_chain_rules: [
      '五幕式必须有五环：开局埋因、发展果+因、转折质变、行动白热化、结局收束。',
      '因果链不能跳步、不能乱序；上一环的果必须发展为下一环的因。',
      '转折的因必须提前埋下，不能靠突然出现的新设定或巧合解决。',
    ],
    outline_expansion_rules: [
      '五级大纲逐层展开：1级统筹全文，2级是一条主线故事，3级是具体剧情，4/5级只用于局部推演。',
      '下一级服务上一级；长篇项目默认不超过3级展开，避免5级细节把主线推散。',
      '从上往下推大纲：先全书主线，再分卷，再前30章；不要从零碎桥段反推全书主线。',
    ],
    architecture_choice_rules: [
      '强主线适合升级、悬疑、规则、副本和复仇：每卷完整三幕式，每幕又有小三幕式，所有支线推动主线。',
      '弱主线适合无敌、日常、轻喜或人设驱动：单元剧各自完整，但必须有核心爽点+讨喜人设+单元舞台串联。',
      '过渡型可以开局弱主线、后期逐渐过渡为强主线，但大钩子必须先铺垫，不能突然换书。',
    ],
    sixth_act_afterglow_rules: [
      '网文第六幕余波必须处理明线与暗线：明线是战力/资源/权限晋升，暗线是社会对主角认知定位的变化。',
      '明线高于暗线时才有装逼冲突；小失衡给小装逼，大失衡给大装逼，余波要让环境、他人或时间证明主角确实变强。',
      '少让主角主动证明“我很强”，多让旁观者、制度、对手失态、待遇变化或后续资源告诉社会认知被拉高。',
    ],
    volume_framework_rules: [
      '每卷目的必须先写清：来到新地方/新阶段到底要争什么、取什么、证明什么。',
      '每卷必须设置大高潮结尾，且高潮要回收本卷主问题并推出下一卷钩子。',
      '卷内小故事要服务卷级目标，不能只为了凑篇幅换敌人、换地图或换设定。',
    ],
    line_layout_rules: [
      '布局三到四条线即可：主线推动目标，感情线或关系线制造牵引，一两条支线/暗线埋伏笔。',
      '支线必须与主线有关，否则是废线；支线人物身份设定必须自然服务主线。',
      '大钩子不间断：一个大钩子断了，必须马上接另一个，不能出现期待空窗。',
    ],
    map_transition_rules: [
      '换地图前先用顶层框架法设整张地图的顶层势力作为柱子，再向下延展区域、小家族、小宗门、功法宝物。',
      '刻度尺思维：提前设计顶层实力表现力标杆，开头 boss、中期 boss、后期 boss 必须有清晰差距。',
      '人际关系先行：去下一个地图前先把关系、势力、旧线或传说铺出去，人际关系动了 -> 主角再动。',
    ],
    retention_methods: [
      '升级不只打斗实力，还包括地位、金钱、权限和社会认知。',
      '资源困境是长篇留存引擎：主角谋求资源时必须带出目标、代价和选择。',
      '设置大目标、小目标和假目标，假目标可以不实现，但必须勾起期待。',
      '解密按冰山一角 -> 层层拨开迷雾推进，不能一次性讲完设定。',
    ],
    quality_checks: [
      '结构层级是否匹配题材和篇幅。',
      '五幕因果链是否完整，无跳步、无乱序。',
      '强主线/弱主线/过渡型选择是否匹配题材和读者期待。',
      '转折的因是否提前埋下。',
      '障碍难度是否递增。',
      '第六幕余波是否让明线晋升和暗线社会认知同步。',
      '大钩子是否不间断。',
      '支线是否服务主线。',
      '五级展开是否下级服务上级且长篇不超过3级。',
      '换地图是否有人际关系先行和顶层势力柱子。',
    ],
    ...existing,
  }
}

export function formatOhStoryLongformStructurePrompt(contract: any) {
  return [
    '【oh-story 长篇结构骨架合同】',
    '请把下列内容写入 writing_bible.longform_structure_contract，并让 master_outline、volume_outlines、chapter_outlines、foreshadowing_plan 与它一致：',
    JSON.stringify(contract, null, 2),
  ].join('\n')
}
