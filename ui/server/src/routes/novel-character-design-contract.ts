function asObject(value: any): any {
  if (!value) return {}
  if (typeof value === 'object') return value
  if (typeof value !== 'string') return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function firstText(...values: any[]) {
  for (const value of values) {
    const text = String(value || '').trim()
    if (text) return text
  }
  return ''
}

function uniqueTexts(values: any[], limit = 12) {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const text = String(value || '').trim()
    if (!text || seen.has(text)) continue
    seen.add(text)
    result.push(text)
    if (result.length >= limit) break
  }
  return result
}

export function buildOhStoryCharacterDesignContract(...inputs: any[]) {
  const objects = inputs.map(input => asObject(input))
  const existing = objects.map(item => asObject(item?.character_design_contract || item?.characterDesignContract || item?.writing_bible?.character_design_contract || item?.writingBible?.characterDesignContract)).find(item => Object.keys(item).length) || {}
  const characters = objects
    .flatMap(item => (Array.isArray(item?.characters) ? item.characters : []))
    .filter(item => item && typeof item === 'object')
  const protagonist = objects.map(item => asObject(item?.protagonist)).find(item => Object.keys(item).length) || {}
  const antagonist = objects.map(item => asObject(item?.antagonist)).find(item => Object.keys(item).length) || {}
  const protagonistName = firstText(protagonist.name, characters.find((item: any) => /主角|protagonist/i.test(String(item?.role_type || item?.role || '')))?.name, '主角')
  const antagonistName = firstText(antagonist.name, characters.find((item: any) => /反派|对手|boss|antagonist|rival/i.test(String(item?.role_type || item?.role || item?.identity || '')))?.name, '阶段反派')
  return {
    source: 'oh_story_character_design_methods_v1',
    route: 'project_creation_and_role_cards',
    role_design_focus: uniqueTexts([
      `${protagonistName}：先立身份标签、表现标签、内核标签，再让行为反差服务核心卖点。`,
      `${antagonistName}：反派不是纯恶，必须有自己的目标、旧痛、优势和致命缺陷。`,
      '重要配角先定功能，再决定是否立体化。',
    ], 8),
    layered_tag_rules: [
      '每个重要角色必须有三层标签：身份标签、表现标签、内核标签；至少一层制造反差。',
      '三层标签不能只写在设定表里，必须能转成亮牌时刻、行为对比或关系阶段变化。',
      '行为反差进阶：亲密/信任加深后，早期调戏、冷漠或防备可以退化，形成感情深化张力。',
    ],
    association_rules: [
      '按强/中/弱关联拆人设：强关联直接影响剧情走向、核心梗装逼爽点或人物碰撞。',
      '每个重要角色至少 3 个强关联设定；外貌、爱好、身高体重等弱关联只能做记忆补充，不能喧宾夺主。',
      '角色卡必须标出每个强关联会触发哪类冲突、资源、误判、爽点或关系变化。',
    ],
    role_card_schema: [
      '角色定位',
      '身份标签',
      '表现标签',
      '内核标签',
      '外貌特征',
      '核心目标',
      '核心动机',
      '致命弱点',
      '口头禅/标志动作',
      '三层标签反差',
      '强关联设定至少 3 个',
      '记忆点',
      '退场方式/长期功能',
    ],
    supporting_role_rules: [
      '配角功能先于厚度：每个配角必须说明配角功能，如替主角说话、替主角发狠、搞笑缓冲、提供信息、制造阻碍或做任务基地。',
      '功能性配角不要强行立体化；光环不得超过主角，必须服务主角展示和剧情推进。',
      '群像出场必须有功能，没有功能的角色不要出场；高人气角色每 3-5 章出场一次时必须带来新信息或新功能。',
    ],
    antagonist_design_rules: [
      '反派也有梦想：在反派眼中他是自己故事的主人公。',
      '反派必须有立场、利益、方法和追求，不写纯粹的恶。',
      '反派优势即致命缺陷，旧痛/创伤和理念冲突要能驱动后续对抗。',
    ],
    protagonist_alignment_rules: [
      '金手指绑架人设：金手指不只是能力，必须让主角性格、行为选择和道德爽感合理化。',
      '以梗为中心塑造人设：用具体可重复的行为梗、口头禅或反应模式替代“杀伐果断/热血”等空标签。',
      '主角可以犯错但不能因蠢、圣母心泛滥、实力不匹配或自暴自弃犯错。',
    ],
    immersion_safety_rules: [
      '代入感维护靠情感链条不断，不能让大段设定说明或角色无法理解的选择打断节奏。',
      '紧张题材不能给主角可随时解决危机的强力靠山；靠山存在削弱紧迫感时标记为靠山过度。',
      '安全感必须匹配题材：危机感题材保留压力，爽文题材保留可控反制。',
    ],
    quality_checks: [
      '角色是否有三层标签且至少一层反差。',
      '强关联设定是否达到 3 个以上，并能驱动剧情。',
      '角色卡是否包含定位、目标、动机、弱点、口头禅/标志动作、记忆点和长期功能。',
      '配角是否有明确功能且不抢主角风头。',
      '反派是否有自己的逻辑、追求、旧痛和理念冲突。',
      '金手指、身份、性格和主角行为是否高度统一。',
      '代入感和安全感是否匹配题材，是否存在靠山过度。',
    ],
    ...existing,
  }
}

export function formatOhStoryCharacterDesignPrompt(contract: any) {
  return [
    '【oh-story 角色设计合同】',
    '请把下列内容写入 writing_bible.character_design_contract，并让 protagonist、antagonist、characters、setting_entities 中的角色卡与它一致：',
    JSON.stringify(contract, null, 2),
  ].join('\n')
}
