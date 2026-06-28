import { buildOhStoryGenreCatalogContract } from './novel-genre-catalog'

export type OhStoryGenreCoreMechanicsContract = {
  source: 'oh_story_genre_core_mechanics_v1'
  matched_framework: string
  core_hook_layers: string[]
  core_hook_loop_model: string[]
  chapter_loop_rules: string[]
  micro_innovation_rules: string[]
  conflict_network_rules: string[]
  goldfinger_worldview_fit: {
    worldview_type: string
    pressure_feature: string
    recommended_goldfinger: string
    fit_rules: string[]
    risk_patches: string[]
  }
  threshold_escalation_rules: string[]
  career_love_balance_rules: string[]
  tone_and_drift_rules: string[]
  validation_examples: string[]
  quality_checks: string[]
}

type MechanicsPreset = {
  worldview_type: string
  pressure_feature: string
  recommended_goldfinger: string
  fit_rules: string[]
  risk_patches: string[]
  loop_examples: string[]
  validation_examples: string[]
}

const GENRE_MECHANICS_PRESETS: Record<string, MechanicsPreset> = {
  都市高武: {
    worldview_type: '常规升级流',
    pressure_feature: '换地图升级，学校/武馆/治安/大学/军部/星际逐层抬高门槛。',
    recommended_goldfinger: '碎片化/解锁型',
    fit_rules: [
      '金手指必须把底层处境、挣钱需求、战力成长和地图晋升连成同一行动链。',
      '每次解锁都要带来即时变化、延迟反馈和新门槛，不能只给数值弹窗。',
    ],
    risk_patches: [
      '功能单一金手指必须补资源、对手、地图或人际反馈，否则解决矛盾模式会单一。',
      '走出新手村后仍停留低级对比对象，会造成题材核心偏移。',
    ],
    loop_examples: [
      '底层处境→金手指反馈→第一次展示→新对手/新地图→更高收益目标。',
      '排行榜或联赛只负责介绍新对手和装逼余震，不能替代主线目标。',
    ],
    validation_examples: [
      '前三章必须能看见底层处境、金手指触发、第一次展示。',
      '第一个升级单元要证明后一个爽点在影响力/层级/收获/认知至少一个维度上超过前一个。',
    ],
  },
  '仙侠/玄幻': {
    worldview_type: '常规升级流',
    pressure_feature: '宗门、境界、地图和反派维度递升。',
    recommended_goldfinger: '碎片化/解锁型',
    fit_rules: [
      '金手指必须服务力量体系、修炼限制和阶段危机，不能脱离世界压迫度。',
      '升级不是主线本身，主线要落成一件具体事。',
    ],
    risk_patches: [
      '只剩品质/数值/境界单线提升时，补词条、功能、条件或代价维度。',
      '换地图不能清空旧角色资产，否则核心情绪会断。',
    ],
    loop_examples: [
      '低谷打击→能力验证→同辈反击→长辈/宗门压力→突破并打开新地图。',
    ],
    validation_examples: [
      '每个修炼单元至少说明目标、对手、代价、收获和下一门槛。',
      '战斗胜利必须体现策略、代价或关系变化，不能只比境界。',
    ],
  },
  规则怪谈: {
    worldview_type: '高压规则求生',
    pressure_feature: '规则、死亡样本、通关线和 dead end 同时压迫主角。',
    recommended_goldfinger: '认知差异/信息操控型',
    fit_rules: [
      '金手指必须帮助主角发现、验证或利用规则，而不是跳过规则。',
      '主角视角理所当然与旁人视角不可思议要形成张力。',
    ],
    risk_patches: [
      '功能单一金手指要用副本规则、死亡样本和现实主线补变化。',
      '只讲规则不行动验证，会变成作者解释而不是剧情。',
    ],
    loop_examples: [
      '规则公布→他人误判/死亡→主角验证漏洞→反制通关→副本真相回扣现实主线。',
    ],
    validation_examples: [
      '每个副本至少有一条通关线、一条错误路径和一次信息差反制。',
      '每章至少有规则期待、死亡压力、漏洞发现或通关爽点之一。',
    ],
  },
  脑洞文: {
    worldview_type: '轻中压创意设定流',
    pressure_feature: '读者主要追看核心点子的遐想空间和变奏升级。',
    recommended_goldfinger: '核心机制+副功能引出剧情',
    fit_rules: [
      '核心梗=金手指最核心的使用方式+读者最想看的爽点模式。',
      '创造阶段按金手指→金手指+角色→+设定→四类全创推进，不要跨阶段。',
    ],
    risk_patches: [
      '核心梗用完不升级会审美疲劳，必须变奏场景、对象和条件。',
      '全盘照抄必扑，微创新必须在人物、人物关系、情节内完成。',
    ],
    loop_examples: [
      '点子验证→情绪缺口→核心机制使用→奖励/信息差→更大场景复用。',
    ],
    validation_examples: [
      '核心卖点要能拆出至少5个不重复的剧情展开方向。',
      '创新点最多3个，且能用足够素材支撑。',
    ],
  },
  凡人流: {
    worldview_type: '高压谨慎生存流',
    pressure_feature: '阶层、资源、信息和生命风险都压迫低天赋主角。',
    recommended_goldfinger: '微弱或无金手指，靠准备和信息差',
    fit_rules: [
      '金手指若存在必须微弱、有限制，并服务谨慎算计。',
      '利弊权衡是核心模式，每次行动要有收益、风险和退路。',
    ],
    risk_patches: [
      '嘴上谨慎但行为疯狂会破坏题材核心。',
      '配角必须有独立利益考量，不能只做主角垫脚石。',
    ],
    loop_examples: [
      '配角线索→副本信息→利弊权衡→准备入局→信息差或准备碾压。',
    ],
    validation_examples: [
      '主角每次冒险前必须说清为什么值得、失败怎么退。',
      '爽点来自智商和准备，不来自无代价越级硬打。',
    ],
  },
}

const DEFAULT_MECHANICS_PRESET: MechanicsPreset = {
  worldview_type: '按题材压迫度确认',
  pressure_feature: '先判断世界观是极道高压、常规升级、轻松日常还是创意设定流。',
  recommended_goldfinger: '金手指与世界观压迫度匹配',
  fit_rules: [
    '极道高压适合无条件强行升级；常规升级适合碎片化/解锁型；轻松日常适合人际关系/种田型。',
    '功能单一金手指只适合强压迫世界观，其他题材硬用必须找补。',
  ],
  risk_patches: [
    '金手指发展不能破坏全文基调。',
    '卖点偏移时要回到书名、简介、开头前3章传递的承诺。',
  ],
  loop_examples: [
    '核心卖点→情绪套路→具体剧情→期待/爽点循环→阈值递升。',
  ],
  validation_examples: [
    '核心梗必须能用一句话说清读者翻开最想看什么。',
    '卖点至少拆出5个不重复的剧情展开方向。',
  ],
}

function buildPreset(framework: string) {
  return GENRE_MECHANICS_PRESETS[framework] || DEFAULT_MECHANICS_PRESET
}

export function buildOhStoryGenreCoreMechanicsContract(...inputs: any[]): OhStoryGenreCoreMechanicsContract {
  const catalog = buildOhStoryGenreCatalogContract(...inputs)
  const preset = buildPreset(catalog.matched_framework)
  return {
    source: 'oh_story_genre_core_mechanics_v1',
    matched_framework: catalog.matched_framework,
    core_hook_layers: [
      '主题(立意)→题材核心(吸引力)→核心情绪(体验链条)',
      '核心梗=金手指最核心的使用方式+读者最想看的爽点模式。',
      '核心卖点→情绪套路→具体剧情。',
    ],
    core_hook_loop_model: [
      '不断循环型：每个一级结构运行一次，变奏场景/对象/条件。',
      '只运行一次型：围绕一个核心情绪分阶段推进。',
      ...preset.loop_examples,
    ],
    chapter_loop_rules: [
      '每章至少有期待点或爽点之一，或处在期待点和爽点之间。',
      '某章既无期待点也无爽点，前一爽点已结束且没有拉起新期待，就是断期待。',
      '每个剧情单元都必须展示核心梗，不能挂羊头卖狗肉。',
    ],
    micro_innovation_rules: [
      '微创新不超3个。',
      '创新范围限制在人物、人物关系、情节，不能超出模板内容边界。',
      '70%来自过去经历和记忆，20%来自当前生活状态，10%来自时事热点话题和趋势。',
      '可选手法：精炼法、升级法、加料法、反套路法、组合法。',
    ],
    conflict_network_rules: [
      '纵向+横向+交叉矛盾至少各有1条在运作。',
      '编织顺序：定地图→定阵营→定角色→填充纵横矛盾→推理交叉矛盾。',
      '主角目标必须让读者觉得有意义，不能靠清空旧角色资产制造换地图。',
    ],
    goldfinger_worldview_fit: {
      worldview_type: preset.worldview_type,
      pressure_feature: preset.pressure_feature,
      recommended_goldfinger: preset.recommended_goldfinger,
      fit_rules: [
        '金手指类型与世界观压迫特征对应。',
        ...preset.fit_rules,
      ],
      risk_patches: preset.risk_patches,
    },
    threshold_escalation_rules: [
      '后一个爽点在影响力/层级/收获/认知至少一个维度上超过前一个。',
      '递升失效信号：读者对相似规模爽点不再反应、主角升级无差异化展示、人际网没随等级变化。',
      '每阶段完成后必须打开更高难度目标或更大情绪缺口。',
    ],
    career_love_balance_rules: [
      '事业线是长篇骨架，爱情线是藤蔓。',
      '事业线为主的文爱情线最多占一成，且必须为事业线服务。',
      '主线要落成一件事，升级只是达成目标的行为，不能顶替主线本身。',
    ],
    tone_and_drift_rules: [
      '全文基调必须贯穿如一，金手指发展不能破坏基调。',
      '书名、简介、开头前3章传递的卖点必须与实际内容一致。',
      '核心梗太多、立意不明确、核心梗用完不升级、挂羊头卖狗肉都是偏移预警。',
    ],
    validation_examples: preset.validation_examples,
    quality_checks: [
      '核心梗明确：能用一句话说出读者翻开最想看什么。',
      '三层递进齐全：主题、题材核心、核心情绪都有定义。',
      '每章不离梗：至少有期待点或爽点之一。',
      '微创新不超3个。',
      '冲突三层铺满。',
      '金手指匹配世界观。',
      '爽点阈值递升。',
      '基调贯穿。',
      '卖点不偏移。',
    ],
  }
}

export function formatOhStoryGenreCoreMechanicsPrompt(contract: OhStoryGenreCoreMechanicsContract) {
  return [
    '【oh-story 题材核心机制契约】',
    '请把下列内容写入 writing_bible.genre_positioning_contract.genre_core_mechanics_contract，并让 core_hook、type_formula、plot_engine、volume_outlines、chapter_outlines 与它一致：',
    JSON.stringify(contract, null, 2),
  ].join('\n')
}
