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
    framework: '小三/婚恋',
    keywords: ['小三', '婚恋', '出轨', '伴侣出轨', '第三者', '渣男', '离婚', '转移财产', '家暴', 'PUA'],
    contract: {
      reader_promise: '发现伴侣出轨或算计后冷静觉醒、暗中布局、独立反击，完成惩恶扬善和新生释放。',
      structure_beats: [
        '日常压迫/不公→发现出轨/算计→决定离开→事业重建→渣男纠缠→反击→报应→新生活',
        '短篇压缩为暗示裂痕→蛛丝马迹→确认但冷静→暗中布局→摊牌→法律/经济独立和新生。',
      ],
      must_have_scenes: [
        '婚恋日常里的压迫或不公细节',
        '发现过程要有悬念，靠蛛丝马迹逐步确认',
        '女主冷静布局而不是崩溃失控',
        '法律、经济或舆论层面的反击与报应',
      ],
      emotional_rhythm: [
        '憋屈→震惊/愤怒→痛到清醒→成长爽→打脸宣泄→治愈',
      ],
      pitfalls: [
        '妻子要有策略不是傻白甜。',
        '发现过程要有悬念，不能开局直接摊牌失去张力。',
      ],
      quality_checks: [
        '发现过程要有悬念',
        '暗中布局必须有可见证据和阶段目标',
        '每2000字至少一个悬念/反转/信息差钩子',
      ],
    },
  },
  {
    framework: '世情',
    keywords: ['世情', '极品亲戚', '奇葩', '恶霸', '老实人', '熟人社会', '恶有恶报', '农村', '小镇', '家族'],
    contract: {
      reader_promise: '熟人社会里善良者被奇葩或恶霸欺压，靠细节累积憋屈，再用反击和报应释放公平感。',
      structure_beats: [
        '奇葩登场→欺压升级→压力顶峰→第一次反击→反扑→打脸→报应→善有善报',
        '短篇压缩为困境→暴露事件→周围人态度→忍还是争→冲突升级→反转→人心揭示。',
      ],
      must_have_scenes: [
        '熟人社会压力和围观群众态度',
        '反派超常理恶行但落在生活细节',
        '老实人第一次越过忍让边界',
        '恶有恶报和人心揭示',
      ],
      emotional_rhythm: [
        '气愤→憋屈→极度不平→初爽→紧张反扑→高潮打脸→治愈',
      ],
      pitfalls: [
        '靠细节不靠大事件。',
        '人物不能非黑即白，围观群众态度要有现实摇摆。',
      ],
      quality_checks: [
        '靠细节不靠大事件',
        '反派恶行要具体且有生活代入感',
        '每2000字至少一个悬念/反转/信息差钩子',
      ],
    },
  },
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
    framework: '死人文学',
    keywords: ['死人文学', '被虐至死', '虐至死', '死后追悔', '追悔莫及', '来不及', '女主死亡'],
    contract: {
      reader_promise: '女主死亡后真相层层揭开，男主追悔和报应共同制造“来不及”的痛感余韵。',
      structure_beats: [
        '层层虐待→女主死亡→后悔开始→真相发现→幕后黑手→报应→因果终结→余韵结局',
        '短篇压缩为死亡事实→死者视角→最放不下的事→回忆现实交叉→真相反转→安静余韵。',
      ],
      must_have_scenes: [
        '女主死亡事实或不可逆代价',
        '生者状态和迟来的不安',
        '真相揭开后男主痛不欲生',
        '因果报应与无法挽回的安静画面',
      ],
      emotional_rhythm: [
        '极度压抑→悲痛→不安→痛心→愤怒→爽痛混合→意难平',
      ],
      pitfalls: [
        '核心是来不及，不能靠热闹反转冲淡不可挽回。',
        '情绪要克制，越克制越扎心。',
      ],
      quality_checks: [
        '核心是来不及',
        '死者影响必须大于生前解释',
        '结尾情绪对位到意难平或余韵',
        '每2000字至少一个悬念/反转/信息差钩子',
      ],
    },
  },
  {
    framework: '霸总/甜宠',
    keywords: ['霸总', '甜宠', '宠溺', '豪门', '特殊相遇', '闺蜜震惊', '极致甜'],
    contract: {
      reader_promise: '特殊相遇后用高密度宠溺、身份资源和轻阻力制造甜爽满足。',
      structure_beats: [
        '相遇→追求→确认→外部阻力→化解',
        '短篇压缩为女主困境→相遇→男主展露兴趣→宠溺震惊→危机轻松化解→极致甜场景。',
      ],
      must_have_scenes: [
        '男主被女主某个特质吸引',
        '用身份/财富/资源做别人做不到的宠',
        '闺蜜或旁观者震惊强化甜爽',
        '外部阻力被共同化解并升温关系',
      ],
      emotional_rhythm: [
        '新鲜→甜/爽→满足→轻紧张→治愈释放',
      ],
      pitfalls: [
        '甜的密度决定粘性。',
        '阻力不能太强写成虐，也不能太弱没有张力。',
        '女主不能花瓶，要有独立闪光点。',
      ],
      quality_checks: [
        '甜的密度决定粘性',
        '宠要用别人做不到的方式落成场景',
        '每2000字至少一个悬念/反转/信息差钩子',
      ],
    },
  },
  {
    framework: '脑洞文',
    keywords: ['脑洞文', '脑洞', '独特金手指', '创意设定', '聊天群', '系统', '核心梗'],
    contract: {
      reader_promise: '用独特金手指或创意设定作为核心卖点，题材只是外壳，一切围绕这个点子的遐想空间展开。',
      structure_beats: [
        '获得点子→判断潜力→选适配题材→加工情绪缺口→设计金手指骨相→构建卖点→主线→单元剧情循环',
        '一级结构循环要重复模式但升级对象、场景和规模。',
      ],
      must_have_scenes: [
        '核心梗第一次以行动方式展示',
        '金手指触发条件或阶段升级规则',
        '围绕一个套路展开的单元故事',
        '对象/场景/规模升级后的同模式新爽点',
      ],
      emotional_rhythm: [
        '好奇→验证→爽点展开→规模升级→新遐想',
      ],
      pitfalls: [
        '核心梗决定赛道，不能只堆设定。',
        '全盘照抄必扑，题材选择必须服务点子。',
      ],
      quality_checks: [
        '核心梗决定赛道',
        '金手指规则明确，使用有限制，后期不崩',
        '每2000字至少一个悬念/反转/信息差钩子',
      ],
    },
  },
  {
    framework: '凡人流',
    keywords: ['凡人流', '无天赋', '低劣天赋', '谨慎算计', '利弊权衡', '逃跑优先'],
    contract: {
      reader_promise: '普通或低劣天赋主角在残酷修仙世界靠谨慎、准备和利弊权衡活下来并反制强者。',
      structure_beats: [
        '小配角出场→小配角故事→透露副本信息→主角权衡利弊后决定进入',
        '每次行动前给出风险、收益、退路和准备成本。',
      ],
      must_have_scenes: [
        '主角没有显赫天赋或强背景',
        '进入副本前的利弊权衡',
        '靠准备和信息差规避正面对抗',
        '配角有独立利益考量而非工具人',
      ],
      emotional_rhythm: [
        '谨慎观察→权衡风险→小心试探→准备碾压→余患未尽',
      ],
      pitfalls: [
        '主角谨慎必须真实，不能嘴上谨慎行为疯狂。',
        '金手指微弱或没有，爽点来自智商和准备。',
      ],
      quality_checks: [
        '利弊权衡是核心模式',
        '主角谨慎必须落实到行动和退路',
        '每2000字至少一个悬念/反转/信息差钩子',
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
    framework: '历史/架空历史',
    keywords: ['历史', '架空历史', '穿越到历史', '历史节点', '科举', '军史', '种田', '非遗', '古代'],
    contract: {
      reader_promise: '穿越或重生到历史节点，利用现代知识和信息差解决危机、打脸质疑者并改变命运。',
      structure_beats: [
        '穿越到关键时刻→面临危机→利用现代知识/信息差解决→打脸质疑者→历史轨迹改变→获得新地位',
        '长篇按科举、军史、经营/种田、国潮/非遗等子类型稳定升级爽点。',
      ],
      must_have_scenes: [
        '穿越或重生到关键历史/架空节点',
        '现代知识解决当下危机',
        '质疑者被结果打脸',
        '新地位或历史轨迹变化带出后续目标',
      ],
      emotional_rhythm: [
        '危机压迫→信息差期待→解决爽→民族/历史共鸣→新地位期待',
      ],
      pitfalls: [
        '大部分读者是云爱好者，爽感优先于还原度。',
        '架空可降低考据门槛，但核心逻辑要自洽。',
      ],
      quality_checks: [
        '现代认知信息差=最大金手指',
        '历史知识必须落成解决问题的行动',
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
    framework: '同人流派',
    keywords: ['同人流派', '同人', '已知世界', '新变量', '名场面改写', 'IP世界', '原著'],
    contract: {
      reader_promise: '在平台允许且用户明确目标 IP 时，只抽取已知世界、新主角变量和名场面改写的结构爽点。',
      structure_beats: [
        '已知世界 + 新变量 + 名场面改写',
        '主角进入熟悉世界→变量改变名场面→围观震惊/遗憾弥补→新事件继续放大变量。',
      ],
      must_have_scenes: [
        '用户明确的目标 IP 或已知世界边界',
        '新主角变量首次改变原有局面',
        '名场面改写但不牺牲爽感',
        '装逼背后的亲情、救赎或遗憾弥补',
      ],
      emotional_rhythm: [
        '熟悉感→变量期待→名场面反转→震惊/后悔/释然→下一名场面期待',
      ],
      pitfalls: [
        '不保留具体 IP 清单；只保留结构功能。',
        '爽第一，不为硬核还原牺牲阅读快感。',
      ],
      quality_checks: [
        '已知世界 + 新变量 + 名场面改写',
        '不能照搬原著专有设定、角色名、桥段或原句',
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
  {
    framework: '长生流',
    keywords: ['长生流', '长生', '沧海桑田', '代际传承', '时移世易', '熬时间'],
    contract: {
      reader_promise: '长生主角旁观和参与沧海桑田，用时间碾压、代际传承和凡俗时期的人情重量制造独特爽感。',
      structure_beats: [
        '凡俗时期充分展开→时间流逝改变人和秩序→主角以长生视角介入→代际传承/分层世界延续期待',
        '保持时间碾压感，避免进入修仙后退化成普通升级文。',
      ],
      must_have_scenes: [
        '凡俗时期最好看，先写足普通人的欲望和代价',
        '主角见证熟悉人事被时间改变',
        '时间碾压感带来的破局或遗憾',
        '代际传承或分层世界打开新阶段',
      ],
      emotional_rhythm: [
        '凡俗烟火→时移世易→沧桑遗憾→长生破局→新一代期待',
      ],
      pitfalls: [
        '开始修仙后容易失去“熬时间”意义，变成寻常修仙文。',
        '必须保持时间碾压感和凡俗情感重量。',
      ],
      quality_checks: [
        '凡俗时期最好看',
        '长生卖点必须保持时间碾压感',
        '每2000字至少一个悬念/反转/信息差钩子',
      ],
    },
  },
  {
    framework: '无限流',
    keywords: ['无限流', '游戏副本', '副本式', '20-30章', '二十章一个副本'],
    contract: {
      reader_promise: '游戏副本式结构持续提供新规则、新危机和阶段通关爽点，并用现实主线保底串联。',
      structure_beats: [
        '20-30章一个副本，每个副本自成一故事',
        '副本进入→规则/目标确认→死亡或失败样本→主角破局→通关奖励/现实主线推进。',
      ],
      must_have_scenes: [
        '明确副本目标和失败代价',
        '副本内独立故事与关键 NPC/机制',
        '通关线和错误路径同时存在',
        '现实主线或长期谜团回扣',
      ],
      emotional_rhythm: [
        '新奇→压迫→试错→反转破局→通关释放→下一副本期待',
      ],
      pitfalls: [
        '每个副本要自成故事，不能只是换皮关卡。',
        '现实主线必须保底串联副本，避免散。',
      ],
      quality_checks: [
        '20-30章一个副本',
        '每个副本自成一故事并回扣现实主线',
        '每2000字至少一个悬念/反转/信息差钩子',
      ],
    },
  },
  {
    framework: '西幻/骑士文',
    keywords: ['西幻', '骑士文', '骑士', '铁匠学徒', '马奴', 'DND', '巫师式', '种田领主'],
    contract: {
      reader_promise: '用东方玄幻升级内核换成西幻外衣，借骑士晋升体系和低位努力制造稳定成长爽感。',
      structure_beats: [
        '低位开局→凿壁偷光式努力→骑士/巫师体系入门→资源与身份晋升→领地或更高地图展开',
        '推荐从马奴、铁匠学徒、领地底层等低位开始，逐步放大世界。',
      ],
      must_have_scenes: [
        '主角从低位身份进入西幻秩序',
        '骑士自带晋升属性或巫师/领主体系首次展示',
        '努力和资源交换带来第一次晋升',
        '领地、种田或更高阶层打开新地图',
      ],
      emotional_rhythm: [
        '低位压迫→努力期待→第一次晋升→身份变化爽→更大世界期待',
      ],
      pitfalls: [
        '西幻=东方玄幻内核换皮，不能只堆陌生名词。',
        '不写日式奇幻，优先 DND 式/巫师式/种田领主文。',
      ],
      quality_checks: [
        '骑士自带晋升属性',
        '开篇从低位开始并用事件带出世界观',
        '每2000字至少一个悬念/反转/信息差钩子',
      ],
    },
  },
  {
    framework: '新媒体文',
    keywords: ['新媒体文', '新媒体', '装逼解气', '情绪对', '用梗', '爽感文'],
    contract: {
      reader_promise: '一切为情绪服务，用现实逻辑制造不爽，再用装逼、愤怒和解气快速释放。',
      structure_beats: [
        '现实矛盾→不爽情绪→强弱/虐爽反差→装逼或愤怒反击→解气释放→下一信息差期待',
        '双向结构=强+虐，核心三重点是用梗、节奏、情绪。',
      ],
      must_have_scenes: [
        '源于现实逻辑的矛盾',
        '读者能立刻懂的不爽点',
        '主角强势反击或装逼解气',
        '极致信息差制造下一步期待',
      ],
      emotional_rhythm: [
        '不爽→装逼/愤怒→解气→继续期待',
      ],
      pitfalls: [
        '矛盾必须源于现实逻辑，不能无根硬虐。',
        '梗要服务情绪和节奏，不能只堆网络段子。',
      ],
      quality_checks: [
        '一切为情绪服务',
        '第一情绪对是不爽→装逼/愤怒→解气',
        '每2000字至少一个悬念/反转/信息差钩子',
      ],
    },
  },
  {
    framework: '搞笑文',
    keywords: ['搞笑文', '搞笑', '玩梗', '段子', '反套路'],
    contract: {
      reader_promise: '在逻辑规则内出人预料，用化用后的梗和主角周围人的善意保持轻松爽感。',
      structure_beats: [
        '建立规则→符合逻辑的反常选择→出人预料的笑点→爽感或关系推进→下一次反差',
        '玩梗要化用内核，不照搬表层台词。',
      ],
      must_have_scenes: [
        '先建立读者能理解的规则或处境',
        '主角在规则内做出反预期选择',
        '玩梗后推进关系、情节或人物',
        '身边人无条件对主角好的温暖锚点',
      ],
      emotional_rhythm: [
        '理解规则→预期建立→反常爆笑→爽或暖→新反差期待',
      ],
      pitfalls: [
        '搞笑必须符合逻辑，规则之内出人预料。',
        '玩梗要化用内核不是照搬。',
      ],
      quality_checks: [
        '搞笑必须符合逻辑',
        '笑点必须推进情节或深化人物',
        '每2000字至少一个悬念/反转/信息差钩子',
      ],
    },
  },
  {
    framework: '悬疑',
    keywords: ['悬疑', '推理', '真相', '谜案', '铺垫', '氛围'],
    contract: {
      reader_promise: '靠铺垫、氛围和信息释放节奏制造悬疑感，让读者持续追问真相而不是只看刺激场面。',
      structure_beats: [
        '异常钩子→线索铺垫→误导/新疑点→局部真相→更大谜团→情绪落点',
        '悬疑感来自信息节奏和氛围，不靠血腥暴力硬撑。',
      ],
      must_have_scenes: [
        '开局异常或不可解释事件',
        '可回收的线索铺垫',
        '误导但公平的信息差',
        '局部真相揭露后带出更大问题',
      ],
      emotional_rhythm: [
        '不安→好奇→误判→发现→更大疑问→阶段释放',
      ],
      pitfalls: [
        '非靠血腥暴力营造悬疑感。',
        '信息释放节奏要控好，不能一次讲透。',
      ],
      quality_checks: [
        '信息释放节奏要控好',
        '铺垫和回收必须公平可追溯',
        '每2000字至少一个悬念/反转/信息差钩子',
      ],
    },
  },
  {
    framework: '后悔流',
    keywords: ['后悔流', '后悔对象', '退婚', '事业选择', '人生抉择'],
    contract: {
      reader_promise: '把后悔对象从老套退婚爱情扩展到事业选择、人生抉择或价值背叛，让失去后的追悔更有新包装。',
      structure_beats: [
        '错误选择/背叛→主角离开或成长→对方发现代价→追悔补救失败→新价值落定',
        '后悔的对象可以是爱情、事业选择、人生抉择、亲情或阵营判断。',
      ],
      must_have_scenes: [
        '对方做出不可挽回的错误选择',
        '主角离开后获得新位置或新价值',
        '后悔方看见失去的具体代价',
        '补救失败或价值重排的结尾落点',
      ],
      emotional_rhythm: [
        '憋屈/失望→离开→成长爽→对方追悔→拒绝/重排→释放',
      ],
      pitfalls: [
        '避免退婚等老套外衣，需创新包装。',
        '后悔不能只靠口头忏悔，必须付出具体代价。',
      ],
      quality_checks: [
        '后悔对象可从爱情转为事业选择/人生抉择',
        '追悔必须有可见代价和失败风险',
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
  const scoredRoutes = GENRE_CATALOG_ROUTES
    .map((route, index) => ({
      route,
      index,
      score: route.keywords.reduce((total, keyword) => {
        const normalizedKeyword = keyword.toLowerCase()
        return normalized.includes(normalizedKeyword) ? total + normalizedKeyword.length : total
      }, 0),
    }))
    .filter(item => item.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
  return scoredRoutes[0]?.route
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


export type OhStoryGenreCatalogGuide = {
  framework: string
  keywords: string[]
  reader_promise: string
  structure_beats: string[]
  must_have_scenes: string[]
  emotional_rhythm: string[]
  pitfalls: string[]
  quality_checks: string[]
  category_hint: string
}

function categoryHintForFramework(framework: string) {
  if (/婚恋|小三|甜宠|霸总|追妻|后悔|死人/.test(framework)) return '女频/情感'
  if (/规则怪谈|无限|悬疑|死人/.test(framework)) return '高压求生/智斗'
  if (/仙侠|玄幻|凡人|都市高武|西幻|长生/.test(framework)) return '升级成长'
  if (/历史|文娱|新媒体|同人|脑洞|搞笑|世情/.test(framework)) return '题材外壳/脑洞'
  return '通用长篇'
}

export function listOhStoryGenreCatalogGuides(): OhStoryGenreCatalogGuide[] {
  return GENRE_CATALOG_ROUTES.map(route => ({
    framework: route.framework,
    keywords: [...route.keywords],
    reader_promise: route.contract.reader_promise,
    structure_beats: [...route.contract.structure_beats],
    must_have_scenes: [...route.contract.must_have_scenes],
    emotional_rhythm: [...route.contract.emotional_rhythm],
    pitfalls: [...route.contract.pitfalls],
    quality_checks: [...route.contract.quality_checks],
    category_hint: categoryHintForFramework(route.framework),
  }))
}

export function matchOhStoryGenreCatalogGuide(...inputs: any[]): OhStoryGenreCatalogGuide | null {
  const text = inputs
    .flatMap(input => Array.isArray(input) ? input : [input])
    .filter(input => input !== undefined && input !== null)
    .map(input => typeof input === 'string' ? input : JSON.stringify(input))
    .join('\n')
  const route = firstMatchedRoute(text)
  if (!route) return null
  return {
    framework: route.framework,
    keywords: [...route.keywords],
    reader_promise: route.contract.reader_promise,
    structure_beats: [...route.contract.structure_beats],
    must_have_scenes: [...route.contract.must_have_scenes],
    emotional_rhythm: [...route.contract.emotional_rhythm],
    pitfalls: [...route.contract.pitfalls],
    quality_checks: [...route.contract.quality_checks],
    category_hint: categoryHintForFramework(route.framework),
  }
}
