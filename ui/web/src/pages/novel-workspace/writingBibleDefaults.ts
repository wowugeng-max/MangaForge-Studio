type StyleLock = Record<string, any>

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
