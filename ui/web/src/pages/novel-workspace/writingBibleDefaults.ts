type StyleLock = Record<string, any>
type StyleSample = Record<string, any>

export const COMMERCIAL_WEB_NOVEL_STYLE_LOCK_DEFAULTS = {
  narrative_person: '第三人称有限视角为主，紧贴主角即时判断；关键情绪段可短暂内心独白，避免全知解释。',
  sentence_length: '短中句为主，长句只用于高潮铺压；单段控制在2-4句，动作、反应、信息按快切推进。',
  dialogue_ratio: '35%-45%，对白承担冲突、信息差、笑点和推进，不写寒暄型对白。',
  banter_density: '中等偏高：紧张场景用短吐槽泄压，但不拆恐怖、战斗或悬疑张力。',
  payoff_density: '高密度：每800-1200字至少一次小爽点、反转、收获或信息差揭示，每章结尾保留升级钩子。',
  description_density: '低到中：环境描写只服务规则、危险、情绪和线索，避免静态大段铺陈。',
  chapter_word_range: '标准章2800-3500字；高潮、战斗、阶段收束可写8000-10000字长章。',
  ending_policy: '每章末必须留下选择、危机、奖励、身份、规则反转或新目标之一，推动下一章点击。',
  banned_words: [
    '一股莫名的感觉',
    '说不清道不明',
    '命运的齿轮开始转动',
    '仿佛一切都在掌控之中',
    '无意义的“只见”开头',
    '无设定支撑的“不可名状”',
    '无必要的“与此同时”切镜',
  ],
  preferred_words: [
    '规则',
    '代价',
    '倒计时',
    '奖励',
    '线索',
    '破局',
    '反转',
    '升级',
    '压迫感',
    '信息差',
    '名场面',
    '钩子',
    '爽点回收',
  ],
  banned_shortcuts: [
    '用梦境、误会或巧合取消已经发生的代价',
    '用旁白总结替代角色行动和冲突推进',
    '连续两章只解释设定不制造选择和变化',
    '为了拖字数重复同一条规则、同一段震惊或同一轮吐槽',
  ],
}

export const COMMERCIAL_WEB_NOVEL_STYLE_SAMPLE_BANK_DEFAULTS = [
  {
    sample_key: '高压反打节奏',
    scene_function: '规则压迫、战斗压迫或强敌逼迫后的反制场景',
    narrative_rhythm: '先用短段落制造压迫，再让主角做可见选择，最后给一记小反打或信息增量。',
    sentence_pattern: '短中句为主，解释压短；动作、反应、规则反馈交替出现。',
    dialogue_ratio: '25%-40%',
    voice_rules: [
      '主角口吻要有压迫下的判断和一点锋利反应，不用旁白替他解释勇敢。',
      '配角对白只承担阻拦、质疑、补刀或暴露信息差。',
    ],
    abstract_usage: '只学习压迫 -> 判断 -> 行动 -> 反馈 -> 小回报的节奏，不复制任何原句、桥段、角色名或专有设定。',
    unsafe_direct_phrases: ['原句不能照搬', '不得复制样章桥段、角色名、专有设定和核心梗'],
    applicable_scenes: ['高压反打', '规则压迫', '战斗反制', '强敌逼迫'],
    avoid_scenes: ['纯背景说明', '低压日常过场', '重大情感告别'],
    suitable_genres: ['玄幻', '都市异能', '规则怪谈', '悬疑', '无限流'],
    forbidden_scenes: ['严肃死亡收束', '重大情感告别'],
  },
  {
    sample_key: '对白交锋推进',
    scene_function: '双方试探、信息差拉扯、关系变化和轻度网感泄压',
    narrative_rhythm: '对白短促推进，每两到三轮对白必须产生信息增量、关系变化或冲突升级。',
    sentence_pattern: '对白句短，动作句压缩；少用解释型心理描写，用停顿、动作和反问表现态度。',
    dialogue_ratio: '35%-55%',
    voice_rules: [
      '主角不说空话，每句要么试探底牌，要么反压对方，要么暴露当前选择。',
      '吐槽只做半拍泄压，不能拆掉危险、反转或情绪爆点。',
    ],
    abstract_usage: '只学习对白功能、回合节奏和角色口吻差异，不复制样章金句或热梗原句。',
    unsafe_direct_phrases: ['原句不能照搬', '热梗原句不能复刻', '不得把样章台词换名搬运'],
    applicable_scenes: ['对白交锋', '信息差试探', '关系变化', '轻度泄压'],
    avoid_scenes: ['纯动作无信息差', '强反转揭示前一刻', '主角重大代价落地时'],
    suitable_genres: ['都市', '轻小说', '规则怪谈', '玄幻', '科幻'],
    forbidden_scenes: ['强反转揭示前一刻', '主角重大代价落地时'],
  },
  {
    sample_key: '章末追读钩子',
    scene_function: '章节最后 300-600 字制造继续阅读理由',
    narrative_rhythm: '先兑现本章小回报，再抛出新问题、危险、身份变化或奖励代价，最后停在选择或反常信息上。',
    sentence_pattern: '短句收束，章末最后三段不大段解释；让问题、动作或异常物件压住结尾。',
    dialogue_ratio: '15%-35%',
    voice_rules: [
      '章末不总结主题，用角色当下反应和下一步目标留住读者。',
      '最后一句优先落在危机、奖励、身份、规则反转或新目标。',
    ],
    abstract_usage: '只学习回报后加钩子的结构和停顿方式，不复制样章结尾句或具体悬念。',
    unsafe_direct_phrases: ['原句不能照搬', '不得复制样章结尾句', '不得复制样章具体悬念设计'],
    applicable_scenes: ['章末追读钩子', '小回报后升级', '新问题抛出', '身份变化'],
    avoid_scenes: ['正文中段解释', '严肃死亡收束后立即玩梗'],
    suitable_genres: ['玄幻', '都市', '规则怪谈', '悬疑', '科幻', '历史'],
    forbidden_scenes: [],
  },
]

function hasContent(value: any) {
  if (Array.isArray(value)) return value.length > 0
  return String(value || '').trim().length > 0
}

export function mergeCommercialWebNovelStyleDefaults(styleLock: StyleLock = {}) {
  const next: StyleLock = { ...(styleLock || {}) }
  for (const [key, value] of Object.entries(COMMERCIAL_WEB_NOVEL_STYLE_LOCK_DEFAULTS)) {
    if (!hasContent(next[key])) next[key] = Array.isArray(value) ? [...value] : value
  }
  return next
}

export function mergeCommercialWebNovelStyleSampleDefaults(samples: StyleSample[] = []) {
  if (Array.isArray(samples) && samples.length > 0) return samples
  return COMMERCIAL_WEB_NOVEL_STYLE_SAMPLE_BANK_DEFAULTS.map(sample => ({
    ...sample,
    voice_rules: [...sample.voice_rules],
    unsafe_direct_phrases: [...sample.unsafe_direct_phrases],
    applicable_scenes: [...sample.applicable_scenes],
    avoid_scenes: [...sample.avoid_scenes],
    suitable_genres: [...sample.suitable_genres],
    forbidden_scenes: [...sample.forbidden_scenes],
  }))
}
