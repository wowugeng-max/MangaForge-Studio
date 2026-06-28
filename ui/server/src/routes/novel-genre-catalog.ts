export type OhStoryGenreCatalogContract = {
  source: 'oh_story_genre_catalog_v1'
  matched_framework: string
  route_reason: string
  reader_promise: string
  structure_beats: string[]
  must_have_scenes: string[]
  emotional_rhythm: string[]
  pitfalls: string[]
  quality_checks: string[]
}

type GenreCatalogRoute = {
  framework: string
  keywords: string[]
  contract: Omit<OhStoryGenreCatalogContract, 'source' | 'matched_framework' | 'route_reason'>
}

const GENRE_CATALOG_ROUTES: GenreCatalogRoute[] = [
  {
    framework: '规则怪谈',
    keywords: ['规则怪谈', '规则副本', '怪谈', '副本', '国运', '直播求生'],
    contract: {
      reader_promise: '类无限流副本求生，靠规则破解、代价压力、信息差和反制爽点留住读者。',
      structure_beats: [
        '背景故事→规则包装→通关线+dead end',
        '别人死→主角装/破局→揭露→升华',
        '每个副本都要有独立规则、死亡样本、通关线和现实主线回扣',
      ],
      must_have_scenes: [
        '玩家被抽入规则副本',
        '主角第一次读规则并发现漏洞或矛盾',
        '别人违反规则付出代价，主角用信息差反制',
        '副本真相揭露并带出下一层规则压力',
      ],
      emotional_rhythm: [
        '恐惧/压迫→发现规则→试错代价→智斗反制→揭露释放',
        '番茄主流走爽文路线，惊悚感必须服务破局爽感',
      ],
      pitfalls: [
        '智斗和金手指负责包合理外衣，不能只靠作者解释让规则成立。',
        '不能写成纯打怪；规则、代价、漏洞、通关线必须被行动验证。',
      ],
      quality_checks: [
        '题材定位必须明确为规则副本求生，不能只挂怪谈标签。',
        '每2000字至少一个悬念/反转/信息差钩子',
        '有读者知道但角色不知道、或角色知道但对手不知道的信息差设计。',
      ],
    },
  },
  {
    framework: '仙侠/玄幻',
    keywords: ['仙侠', '玄幻', '修仙', '剑修', '宗门', '废材', '灵根', '功法'],
    contract: {
      reader_promise: '主角从低谷崛起，在清晰力量体系中完成升级、反击、清算和新地图期待。',
      structure_beats: [
        '打击降临→冲突深化→第一次反击→最大危机→突破成长→致命一击→报应清算→新征程',
        '短篇压缩为世界规则+主角位置→修炼转折/正面交锋→终极对决和留白',
      ],
      must_have_scenes: [
        '主角遭遇重大打击或低谷处境',
        '金手指/传承/体质首次验证但暴露限制',
        '同辈或阶段反派被策略性击败',
        '地图逐层展开，阶段胜利后打开更大世界',
      ],
      emotional_rhythm: [
        '压抑/悲愤→初爽→极度紧张→逆袭→清算→期待',
        '冲突落在情与选择上，战斗服务人物和代价。',
      ],
      pitfalls: [
        '力量体系清晰，不能后期崩坏。',
        '金手指独特有限制，不能无限开挂。',
        '战斗有策略非纯数值，不能只比境界。',
        '地图逐层展开，不能一开始铺满世界观名词。',
      ],
      quality_checks: [
        '力量体系清晰',
        '金手指独特有限制',
        '战斗有策略非纯数值',
        '地图逐层展开',
        '每2000字至少一个悬念/反转/信息差钩子',
      ],
    },
  },
  {
    framework: '重生复仇',
    keywords: ['重生', '复仇', '前世', '惨死', '报仇', '复盘'],
    contract: {
      reader_promise: '前世惨死后利用信息差分层复仇，打脸递进，并在复仇中补上遗憾。',
      structure_beats: [
        '前世惨死真相→重生认知→前世今生交织→逐层复仇+新问题→反扑/信任危机→终极布局→报应→新生活',
        '短篇用重生节点→两个打脸名场面→终极复仇和新生压缩。',
      ],
      must_have_scenes: [
        '前世惨死或关键背叛的强钩子',
        '重生后第一个不同选择',
        '小反派、中反派、大反派分层暴露',
        '前世未知真相或暗牌翻开',
      ],
      emotional_rhythm: [
        '震惊/愤怒→期待→信息差碾压→悬念反扑→宣泄→释然',
      ],
      pitfalls: [
        '不能太顺利，要有变数和反扑。',
        '前世闪回有选择地释放，不能开局倒完。',
      ],
      quality_checks: [
        '打脸分层递进',
        '信息差必须转化为行动优势和代价选择',
        '每2000字至少一个悬念/反转/信息差钩子',
      ],
    },
  },
  {
    framework: '都市高武',
    keywords: ['都市高武', '高武', '武道', '武馆', '武者', '气血', '军部'],
    contract: {
      reader_promise: '底层学生或武者靠金钱驱动、升级打怪和分层地图持续变强。',
      structure_beats: [
        '底层处境→金手指→第一次展示→学校/武馆/治安/大学/军部/星际逐层换地图',
        '短篇用经济困境→金手指触发→实力提升碾压→阶段胜利和更大世界暗示。',
      ],
      must_have_scenes: [
        '经济困境或底层处境压迫',
        '金手指首次触发并能换算为实力/资源',
        '学校、武馆、治安或联赛中的第一次展示',
        '更强对手出现但主角不惧，带出下一层地图',
      ],
      emotional_rhythm: [
        '憋屈→变强期待→碾压初爽→更高层压力→阶段释放',
      ],
      pitfalls: [
        '金钱驱动要反复挂钩，不能只做背景。',
        '换地图要用过渡人物连接，不能硬切。',
      ],
      quality_checks: [
        '前三章必须完成底层处境→金手指→第一次展示',
        '升级资源、战力层级和地图层级要同步推进',
        '每2000字至少一个悬念/反转/信息差钩子',
      ],
    },
  },
  {
    framework: '文娱/娱乐圈',
    keywords: ['文娱', '娱乐圈', '华娱', '韩娱', '明星', '综艺', '导演', '歌手', '演员'],
    contract: {
      reader_promise: '才华展示+围观者震惊，靠反应链、作品展示和日常化学反应制造爽感。',
      structure_beats: [
        '才艺展示→观众/评委/对手反应链→资源或名声升级→新舞台',
        '主线之间用配角情景剧和普通人特质降低距离感。',
      ],
      must_have_scenes: [
        '主角才华首次公开展示',
        '观众、评委、对手、业内人的递进反应链',
        '资源升级或舆论反转',
        '日常互动展现角色普通人特质',
      ],
      emotional_rhythm: [
        '被低估→展示→震惊扩散→认可/资源升级→下一次期待',
      ],
      pitfalls: [
        '架空虚构明星可降低真人争议风险。',
        '金手指要模糊化或自洽，避免后期先知性冲突。',
      ],
      quality_checks: [
        '才艺展示必须是核心装逼场景',
        '反应链要覆盖观众/评委/对手/业内至少两类人',
        '每2000字至少一个悬念/反转/信息差钩子',
      ],
    },
  },
  {
    framework: '追妻火葬场',
    keywords: ['追妻', '火葬场', '离婚', '前夫', '后悔', '不回头'],
    contract: {
      reader_promise: '先虐后爽，男人后悔但女人不回头，以离开、新生、追悔和拒绝形成情绪释放。',
      structure_beats: [
        '女主痛苦现状→虐待加深→心死离开→独立新生→男主追悔→事业成长→反复拒绝→结局释放',
        '短篇用建压40%→爆点35%→落定25%压缩。',
      ],
      must_have_scenes: [
        '女主被冷暴力/背叛/轻视的具体事件',
        '女主平静离开或心死决断',
        '男主意识到失去并开始追悔',
        '至少两次复合请求被拒绝',
      ],
      emotional_rhythm: [
        '压抑→悲愤→决绝→解脱爽→追悔痛快→打脸释放',
      ],
      pitfalls: [
        '前期虐越狠后期越爽，但女主不能失去主体性。',
        '丈夫视角悔恨要有冲击，女主视角要坚决。',
      ],
      quality_checks: [
        '女主离开后不回头是核心',
        '后悔和拒绝必须反复强化，不要过早和解',
        '每2000字至少一个悬念/反转/信息差钩子',
      ],
    },
  },
]

const GENERIC_GENRE_CATALOG_CONTRACT: OhStoryGenreCatalogContract = {
  source: 'oh_story_genre_catalog_v1',
  matched_framework: '待模型根据题材路由确认',
  route_reason: '用户输入未命中内置高频框架；必须先按题材路由表选择最接近框架，再补齐结构比例、情绪节拍和必备场景。',
  reader_promise: '先确认题材核心承诺，再让目标读者、开篇钩子、分卷结构和章节钩子服务同一长板。',
  structure_beats: [
    '长篇优先使用对应题材的8节点/5阶段/分层地图结构；短篇使用建压→爆点→落定三幕压缩。',
    '每个阶段都要说明读者情绪从哪里来、靠什么事件释放。',
  ],
  must_have_scenes: [
    '题材核心承诺的开局展示',
    '主角第一次主动行动或能力验证',
    '阶段反派/阻力的明确反扑',
    '下一阶段钩子的可见承诺',
  ],
  emotional_rhythm: [
    '压抑/悬念/期待→行动验证→爆发/反转→释放/新期待',
  ],
  pitfalls: [
    '不能只写题材标签，必须落到场景、结构比例和读者情绪。',
    '不能混搭到稀释核心长板。',
  ],
  quality_checks: [
    '题材定位正确',
    '结构比例达标',
    '情绪节拍完整',
    '每2000字至少一个悬念/反转/信息差钩子',
  ],
}

function normalizeGenreText(value: string) {
  return value.toLowerCase()
}

function firstMatchedRoute(input: string) {
  const normalized = normalizeGenreText(input)
  return GENRE_CATALOG_ROUTES.find(route => route.keywords.some(keyword => normalized.includes(keyword.toLowerCase())))
}

export function buildOhStoryGenreCatalogContract(...inputs: any[]): OhStoryGenreCatalogContract {
  const text = inputs
    .flatMap(input => Array.isArray(input) ? input : [input])
    .filter(input => input !== undefined && input !== null)
    .map(input => typeof input === 'string' ? input : JSON.stringify(input))
    .join('\n')
  const route = firstMatchedRoute(text)
  if (!route) return { ...GENERIC_GENRE_CATALOG_CONTRACT }
  return {
    source: 'oh_story_genre_catalog_v1',
    matched_framework: route.framework,
    route_reason: `命中 ${route.framework} 题材目录路由。`,
    ...route.contract,
  }
}

export function formatOhStoryGenreCatalogPrompt(contract: OhStoryGenreCatalogContract) {
  return [
    '【oh-story 题材目录契约】',
    '请把下列内容写入 writing_bible.genre_positioning_contract.genre_catalog_contract，并让 commercial_positioning、volume_outlines、chapter_outlines 与它一致：',
    JSON.stringify(contract, null, 2),
  ].join('\n')
}
