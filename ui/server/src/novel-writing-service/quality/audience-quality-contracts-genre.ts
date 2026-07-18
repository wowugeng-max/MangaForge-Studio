import { asArray } from '../../routes/novel-route-utils'
import { compactBriefText, uniqueBriefStrings } from './text-utils'

const OH_STORY_GENRE_POSITIONING_READER_PSYCHOLOGY = [
  '题材必须对应明确读者心理：缺钱、缺尊严、缺掌控、缺安全感、缺认可或缺关系补偿。',
  '都市系统/逆袭长篇优先抓中年危机、经济压力、被轻视后的翻盘、生活技能变现和低谷反弹。',
  '每章至少让一个读者心理在正文中被压中，并用行动回报释放，不能只停留在设定说明。',
]

const OH_STORY_GENRE_POSITIONING_CORE_HOOK_RULES = [
  '核心梗必须一句话说清，并能在本章场景里被看见。',
  '核心梗要同时包含题材标签、主角处境、金手指/能力和读者情绪回报。',
  '本章场景要重复强化核心梗的可感知形态，例如系统评价+主角吐槽、现实订单验证、公开反打或生活化收益。',
]

const OH_STORY_GENRE_POSITIONING_GOLDFINGER_FIT_RULES = [
  '金手指必须贴合主角生活/职业/处境，不能像外挂说明书一样凭空降临。',
  '奖励、代价和升级反馈要落到现实问题、职业技能、关系处境或资源变化里。',
  '金手指越强，越要用具体任务、失败风险和现实后果限制它。',
]

const OH_STORY_GENRE_POSITIONING_MICRO_INNOVATION_RULES = [
  '微创新最多3个，必须服务题材模板，不得推翻读者对类型文的基础期待。',
  '创新优先放在核心梗表达、职业/场景组合、反馈口吻或回报形式上。',
  '模板内创新可以新鲜，模板外炫技会造成读者误判题材。',
]

const OH_STORY_GENRE_POSITIONING_MICRO_INNOVATION_702010_RULES = [
  '70%来自过去经历和记忆：用共同代际记忆、流行文化、类型阅读记忆和熟悉生活细节稳住模板底座。',
  '20%来自当前生活状态：把工作、爱好、感情、家庭压力、消费处境或平台读者当下情绪嵌入角色处境。',
  '10%来自时事热点话题和趋势：只取能服务题材承诺的热点点缀，不能让热点盖过核心梗和类型期待。',
]

const OH_STORY_GENRE_POSITIONING_MICRO_INNOVATION_METHODS = [
  '精炼法：把已有套路做到极致，删掉噪音，让核心爽点更清晰、更可复述。',
  '升级法：框架不变但元素升级，把既有卖点推到更高压力、更强回报或更可见场面。',
  '加料法：在已有框架里加一个兼容元素，例如职业、关系、场景、反馈口吻或现实压力。',
  '反套路法：只反转读者熟悉套路中的一个小点，最终仍兑现类型期待。',
  '组合法：组合两个兼容套路制造新鲜感，避免引入第三个分散主线的卖点。',
]

const OH_STORY_GENRE_POSITIONING_LONGBOARD_FOCUS_RULES = [
  '拉长板而非补短板：优先强化题材长板、核心卖点、目标情绪和最高频爽点。',
  '不得为补短板引入会稀释核心卖点的支线。',
  '开书前检查：核心卖点背后的情绪清晰，同一卖点能延展出至少 3 个角度，题材长板与现有素材/对标资产匹配。',
]

const OH_STORY_GENRE_POSITIONING_QUALITY_CHECKS = [
  '书名简介内容三位一体：书名承诺、简介卖点和正文第一批场景必须指向同一题材。',
  '题材标签必须和核心桥段一致，禁止挂羊头卖狗肉。',
  '读者心理、核心梗、金手指、主角身份和平台口味必须互相支撑。',
  '本章必须出现至少一个题材必备场景或同等功能场景。',
  '微创新不得超过3个，且不能压过类型模板。',
  '公式对位：所用公式必须与题材标签、篇幅和读者期待匹配，没有混用不相关公式。',
  '情绪节拍完整：情绪曲线、必选场景、核心规则和篇幅范围必须进入本章或本批计划。',
  '钩子密度达标：按题材公式设置章节/小节钩子，开头3秒抓住核心冲突或信息炸弹。',
]

const OH_STORY_GENRE_WRITING_FORMULA_ROUTES = [
  {
    match: [/现代|都市|公司|婚礼|股东|豪门|背叛/, /复仇|打脸|证据|求饶|羞辱|背叛/],
    formula: '公式一：现代复仇/打脸（6章）：当众背叛 -> 冷静处理 -> 对方反扑 -> 揭示真相 -> 求饶 -> 加冕。',
    scenes: ['当众羞辱开场', '冷静到可怕的反击', '标志性动作', '逐层揭露证据', '反派自曝', '隐藏伏笔回收'],
    rules: ['主角永不失态；用动作替代情绪；对方越歇斯底里主角越平静；先让反派得意再翻转。'],
  },
  {
    match: [/古代|宅斗|侯府|嫡女|庶女|圣旨|后院/, /身份|反转|信物|回归|被弃|软禁/],
    formula: '公式二：古代宅斗/身份反转（8节）：被弃回归 -> 后院交锋 -> 身份初露 -> 被软禁 -> 身份揭露 -> 反击推进 -> 对方反扑 -> 最终碾压。',
    scenes: ['回归羞辱', '被冤枉被打', '信物展示', '身份揭露名场面', '妹妹恶毒递进', '父母偏心加码'],
    rules: ['分步揭露身份；压抑3节释放1节；父母用偏心写，不只写坏。'],
  },
  {
    match: [/虐恋|灵魂|魂魄|死亡证明|开棺|血书/, /复仇|渣男|小三|害死|保小不保大/],
    formula: '公式三：虐恋复仇/灵魂视角（7节）：死亡回溯 -> 虐待现场 -> 小三虚伪 -> 开棺真相 -> 舆论反转 -> 崩溃现场 -> 收尾。',
    scenes: ['保小不保大', '家人被打与小三享受的对比', '孩子一句话击穿防线', '定时发布证据', '开棺', '渣男崩溃'],
    rules: ['灵魂视角能看见但无法阻止；现在和三年前回忆交替；小三每句话都是毒。'],
  },
  {
    match: [/都市|现代|中年|维修|离婚|失业|订单|生活/, /系统|面板|奖励|任务|礼包|评价/],
    formula: '公式四：都市系统/逆袭长篇（前3章）：离婚+系统激活 -> 系统面板+新手奖励 -> 离婚后+新装备。',
    scenes: ['中年危机够惨', '系统面板讽刺数据', '新手礼包立刻见效', '前妻后悔伏笔', '隐藏装备', '子女关系'],
    rules: ['系统评价+主角吐槽是核心笑点；每章结尾必有系统奖励；生活化细节建真实感。'],
  },
  {
    match: [/玄幻|仙侠|修仙|宗门|灵根|秘境/, /重生|逆袭|前世|被害|反常/],
    formula: '公式六：玄幻仙侠/重生逆袭（19章）：前世被害 -> 重生关键节点 -> 反常行动 -> 对手自疑 -> 助力出现 -> 瓦解反派 -> 最终决战。',
    scenes: ['前世死亡详细残忍', '重生后第一件事反常', '对手自我怀疑', '逐步揭露前世真相', '关键助力者有排面'],
    rules: ['不做和前世一样的事就是最大金手指；用反常行为制造信息差。'],
  },
  {
    match: [/年代|七零|八零|大团结|赤脚医生/, /双重生|替罪羊|渣男|前世|复仇/],
    formula: '公式七：年代重生/双重复仇（19章）：前世被利用 -> 双重生 -> 选新路 -> 男主登场 -> 揭发罪行 -> 证据递进 -> 身份揭露 -> 后悔收尾。',
    scenes: ['前世付出导语交代清', '双重生博弈', '年代细节', '男主看似缺陷实则完美', '渣男崩溃'],
    rules: ['年代感靠真实历史细节；双重生=双重信息战；渣男绝望反衬女主洒脱。'],
  },
  {
    match: [/宫闱|宫斗|宅斗|女帝|替嫁|京城/, /称帝|改革|家族被害|反攻|布局/],
    formula: '公式八：宫闱宅斗/女帝逆袭（19章）：家族被害 -> 被迫替嫁 -> 暗中布局 -> 带走资源 -> 积蓄力量 -> 发现阴谋 -> 反攻京城 -> 称帝改革。',
    scenes: ['家族被害够惨', '替嫁展示智慧', '带走家产转折', '每步布局有合理动机', '反攻名场面', '称帝后改革'],
    rules: ['主角从不解释计划，让读者自己猜；布局要有回顾时恍然大悟效果。'],
  },
  {
    match: [/悬疑|超自然|鬼|怨气|犯罪|伪装成人/],
    formula: '公式九：现代悬疑/超自然视角（18章）：设定鬼伪装成人 -> 被骗入局 -> 怨气升级 -> 揭露网络 -> 找幕后 -> 前世死因 -> 双重惩罚。',
    scenes: ['设定一句话说清', '被骗后不慌反喜', '鬼视角信息差', '升级解锁前世记忆', '双重惩罚'],
    rules: ['鬼视角是独特卖点；悬疑线和复仇线交织；每章结尾有反转或新发现。'],
  },
  {
    match: [/架空|历史|性别反转|追妻|火葬场/, /不原谅|离开|配偶|偏心|白月光/],
    formula: '公式十：架空历史/性别反转（19章）：被误解 -> 配偶偏心 -> 失望放弃 -> 决定离开 -> 离开后变好 -> 配偶后悔 -> 不原谅。',
    scenes: ['开篇被冤枉或被打', '白月光型情敌', '主角离开干净利落', '配偶后悔递进', '主角不原谅'],
    rules: ['核心是不被珍惜的人选择离开；配偶后悔越详细，读者不原谅越坚决。'],
  },
  {
    match: [/重生|前世/, /离婚|前夫|投资|复仇|逆袭/],
    formula: '公式十二：重生复仇/离婚逆袭（10章）：前世被害 -> 重生关键节点 -> 冷静离婚 -> 拿走财富 -> 投资成功 -> 前夫后悔 -> 坚决拒绝 -> 华丽蜕变。',
    scenes: ['前世死法和前夫直接相关', '重生后第一反应笑了', '离婚干脆要钱要利', '投资展示智慧', '前夫后悔递进'],
    rules: ['冷静是最大武器；每个决定有前世记忆支撑；投资线和感情线分开。'],
  },
  {
    match: [/总裁|豪门|虐恋|秘书旅行/, /白月光|渣男|追悔|觉醒|死遁/],
    formula: '公式十三：总裁豪门/白月光虐恋（8-11章）：虐建立矛盾 -> 觉醒离开 -> 真相揭露 -> 追悔被拒 -> 新生活治愈。',
    scenes: ['开篇信息炸弹', '白月光羞辱女主', '临界事件', '监控/证据/白月光自曝', '渣男追悔被拒'],
    rules: ['虐30%、觉醒15%、爽35%、治愈20%；伤害递进但爽按序释放不能乱序。'],
  },
  {
    match: [/女频|男频/, /复仇|打脸|审判|碾压/],
    formula: '公式十四：女频 vs 男频复仇/打脸：女频重信息差与心声，男频重行动碾压和当众身份揭露。',
    scenes: ['女频3句内建立核心矛盾', '男频第一段最大屈辱', '公开审判式打脸', '称呼改变或身份揭露'],
    rules: ['女频反派每500字升级一次；男频隐忍短、靠行动展示能力；高潮必须有公开碾压。'],
  },
  {
    match: [/宫闱|宅斗|寡嫂|隐忍|腹黑|孩子扶养/],
    formula: '公式十五：宫闱宅斗/隐忍腹黑型（8章）：主动入局 -> 以退为进 -> 借力打力 -> 静待自毁 -> 意外之喜 -> 釜底抽薪 -> 设局收网 -> 终极反转。',
    scenes: ['开篇反常行为', '情敌自毁三连', '每次让步都是布局', '结尾内心独白揭示真相'],
    rules: ['主角从不主动出手；每次情敌犯错后主角都是受害者或好人。'],
  },
  {
    match: [/追夫|不原谅|继父|妻子|天台对峙/],
    formula: '公式十六：追夫火葬场/不原谅型（8章）：发现真相 -> 彻底死心 -> 妻子失控 -> 被虐 -> 决然离开 -> 丑闻曝光 -> 重逢 -> 不原谅。',
    scenes: ['第N次制造绝望', '撞见真相', '妻子的无所谓', '继父出卖妻子', '新恋人对比', '天台对峙BE'],
    rules: ['男主越冷静越有力；妻子后悔越详细读者越觉得活该；不原谅比强行HE更有力量。'],
  },
  {
    match: [/年代|七零|八零|冲喜|大房/, /医术|银针|植物人|公公|癌症/],
    formula: '公式十七：年代重生/医术复仇型（8章）：前世极惨 -> 金手指展示 -> 以退为进 -> 丈夫醒来 -> 感情推进 -> 收网布局 -> 复仇高潮 -> BE但圆满。',
    scenes: ['前世极惨层层递进', '医术金手指', '贵人相助', '丈夫反转', '公公葬礼抓大房', 'BE结局'],
    rules: ['年代感靠细节；医术要有专业性；BE是得到一切但失去最重要的人。'],
  },
  {
    match: [/灵魂|魂魄/, /家庭|亲情|病中|祭祖|产后|手术|面子/],
    formula: '公式十八：灵魂视角家庭虐文（5章）：病中被虐 -> 旁观真相 -> 证据浮出 -> 审判清算 -> 重生暖心。',
    scenes: ['身体最脆弱时遭最大伤害', '魂魄慢慢飘起', '配角拱火', '手机/日记/监控暴露真相', '重生到温暖家庭'],
    rules: ['灵魂视角能看到但无法阻止；身体细节必须具体；结尾用温暖对比。'],
  },
  {
    match: [/细节|线索|钥匙扣|发票|香水|避孕套|调查|证据链/, /调查|微小|钥匙扣|发票|香水|避孕套|系统取证|证据链系统/],
    formula: '公式十九：细节线索驱动型复仇（8-13章）：发现异常 -> 暗中调查 -> 布局反击 -> 公开对峙 -> 连环反击。',
    scenes: ['一个触发细节', '职业优势展示', '证据链系统构建', '笑着点头时刻', '反向利用对方棋子'],
    rules: ['超短章节制；主角永远冷静；证据逐章释放；背叛层层加码。'],
  },
  {
    match: [/嫁祸|遗产|假意顺从|给你吧|移民|既要又要/],
    formula: '公式二十：反套路嫁祸型重生（7章）：重生假意顺从 -> 暗中布局 -> 小试锋芒 -> 冲突升级 -> 身份揭露 -> 收网 -> 华丽退场。',
    scenes: ['给你吧时刻', '白月光三连试探', '渣男既要又要', '身份揭露名场面', '头也不回式离开'],
    rules: ['给你就是最好的惩罚；前世记忆每章穿插一小段；最大蔑视是漠视。'],
  },
  {
    match: [/公开|当众|股东|家族寿宴|公司大堂|婚礼|审判|监控|证据/, /打脸|审判|揭露|证据|背叛|羞辱/],
    formula: '公式二十一：公开审判式打脸：设定竞技场 -> 反派先赢 -> 主角冷静 -> 逐层揭露 -> 反派崩溃 -> 驱逐台词 -> 背影离场。',
    scenes: ['公开竞技场', '反派当众宣布胜利', '主角标志性冷静', '逐层揭露证据', '反派逐级崩溃', '背影离场'],
    rules: ['必须公开；反派先赢；证据一张一张甩；全场死寂中头也不回。'],
  },
]

function inferOhStoryGenreWritingFormulaRoutes(rawText = '') {
  return OH_STORY_GENRE_WRITING_FORMULA_ROUTES
    .filter(route => route.match.every(pattern => pattern.test(rawText)))
    .slice(0, 4)
}

function genrePositioningExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.genre_positioning_contract
    || contextPackage?.chapter_target?.genrePositioningContract
    || contextPackage?.genre_positioning_contract
    || contextPackage?.genrePositioningContract
    || contextPackage?.pre_draft_brief?.genre_positioning_contract
    || contextPackage?.preDraftBrief?.genrePositioningContract
}

function inferGenrePositioningProfile(project: any = {}, contextPackage: any = {}) {
  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const writingBible = contextPackage?.writing_bible || project?.reference_config?.writing_bible || {}
  const commercial = writingBible?.commercial_positioning || project?.reference_config?.writing_bible?.commercial_positioning || {}
  const genreText = compactBriefText(project?.genre || contextPackage?.project?.genre || writingBible?.genre || target.genre)
  const rawText = [
    project?.title,
    genreText,
    project?.target_audience,
    project?.synopsis,
    writingBible?.golden_finger,
    writingBible?.goldenFinger,
    writingBible?.protagonist_identity,
    writingBible?.protagonistIdentity,
    commercial?.innovation_hook,
    ...asArray(commercial?.selling_points || commercial?.sellingPoints),
    target.summary,
    target.conflict,
    ...sceneCards.flatMap((scene: any) => [scene.title, scene.purpose, scene.conflict, scene.reader_payoff, scene.ending_hook_seed]),
  ].filter(Boolean).join(' ')
  const formulaRoutes = inferOhStoryGenreWritingFormulaRoutes(rawText)
  const hasUrban = /都市|现代|职场|生活|离婚|失业|维修|订单/.test(rawText)
  const hasSystem = /系统|面板|奖励|任务|礼包|评价/.test(rawText)
  const hasComeback = /逆袭|翻盘|反打|打脸|崛起|低谷|报废|证明/.test(rawText)
  const genreLabel = hasUrban && hasSystem
    ? `都市系统/${hasComeback ? '逆袭' : '成长'}长篇`
    : compactBriefText(genreText || project?.title || '类型网文长篇')
  const readerPsychology = uniqueBriefStrings([
    /中年|离婚|失业|经济|压力|报废/.test(rawText) ? '中年危机、经济压力和被轻视后的翻盘补偿。' : '',
    /尊严|看不起|质疑|前妻|上司|客户/.test(rawText) ? '尊严修复：被质疑后用现实成果反证自己。' : '',
    /系统|面板|评价|数据/.test(rawText) ? '掌控感：把混乱生活量化成可升级、可验证、可反击的目标。' : '',
    ...OH_STORY_GENRE_POSITIONING_READER_PSYCHOLOGY,
  ], 8)
  const genreFormula = uniqueBriefStrings([
    ...formulaRoutes.map(route => route.formula),
    hasSystem ? '系统面板+新手奖励+现实任务反馈。' : '',
    hasComeback ? '低谷压迫 -> 核心梗触发 -> 小胜兑现 -> 新门槛出现。' : '',
    hasUrban ? '生活困境/职业场景 -> 金手指介入 -> 现实收益验证。' : '',
    compactBriefText(commercial?.innovation_hook),
  ], 8)
  const coreHookRules = uniqueBriefStrings([
    ...formulaRoutes.flatMap(route => route.rules),
    ...OH_STORY_GENRE_POSITIONING_CORE_HOOK_RULES,
    ...asArray(commercial?.selling_points || commercial?.sellingPoints),
    ...sceneCards.map((scene: any) => scene.purpose || scene.reader_payoff),
  ], 10)
  const mustHaveScenes = uniqueBriefStrings([
    ...formulaRoutes.flatMap(route => route.scenes),
    hasSystem ? '系统面板首次给出刺眼评价或任务。' : '',
    hasSystem ? '新手奖励立刻改变一个现实困境。' : '',
    hasComeback ? '质疑者/压力源在场，主角用结果反证。' : '',
    ...sceneCards.map((scene: any, index: number) => `场景${scene.scene_no || index + 1}：${compactBriefText(scene.title || scene.purpose || scene.reader_payoff)}`),
  ], 10)
  return {
    genre_label: genreLabel,
    reader_psychology: readerPsychology,
    genre_formula: genreFormula,
    core_hook_rules: coreHookRules,
    goldfinger_fit_rules: OH_STORY_GENRE_POSITIONING_GOLDFINGER_FIT_RULES,
    micro_innovation_rules: OH_STORY_GENRE_POSITIONING_MICRO_INNOVATION_RULES,
    micro_innovation_702010_rules: OH_STORY_GENRE_POSITIONING_MICRO_INNOVATION_702010_RULES,
    micro_innovation_methods: OH_STORY_GENRE_POSITIONING_MICRO_INNOVATION_METHODS,
    longboard_focus_rules: OH_STORY_GENRE_POSITIONING_LONGBOARD_FOCUS_RULES,
    must_have_scenes: mustHaveScenes,
    platform_fit_rules: [
      '平台口味必须和章节节奏一致：番茄偏快节奏、强回报、清晰冲突和短周期爽点。',
      '题材定位必须在开篇、场景目标和章尾钩子反复被验证。',
      '禁止挂羊头卖狗肉：标题/简介承诺系统逆袭，正文就必须持续交付系统逆袭的桥段。',
    ],
  }
}

export function buildGenrePositioningContract(project: any = {}, contextPackage: any = {}) {
  const writingBible = contextPackage?.writing_bible || project?.reference_config?.writing_bible || {}
  const explicit = genrePositioningExplicitContract(contextPackage)
    || writingBible?.genre_positioning_contract
    || writingBible?.genrePositioningContract
    || project?.reference_config?.genre_positioning_contract
    || project?.reference_config?.genrePositioningContract
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derivedProject = {
      ...(project || {}),
      reference_config: {
        ...(project?.reference_config || {}),
        genre_positioning_contract: null,
        genrePositioningContract: null,
        writing_bible: {
          ...(project?.reference_config?.writing_bible || {}),
          genre_positioning_contract: null,
          genrePositioningContract: null,
        },
      },
    }
    const derived = buildGenrePositioningContract(derivedProject, {
      ...(contextPackage || {}),
      genre_positioning_contract: null,
      genrePositioningContract: null,
      writing_bible: contextPackage?.writing_bible
        ? {
            ...(contextPackage.writing_bible || {}),
            genre_positioning_contract: null,
            genrePositioningContract: null,
          }
        : contextPackage?.writing_bible,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            genre_positioning_contract: null,
            genrePositioningContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            genre_positioning_contract: null,
            genrePositioningContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            genre_positioning_contract: null,
            genrePositioningContract: null,
          }
        : contextPackage?.chapter_target,
    })
    const explicitGenreTags = uniqueBriefStrings(explicit.genre_tags || explicit.genreTags || [], 8)
    const explicitGenreLabel = compactBriefText(explicit.genre_label || explicit.genreLabel || explicitGenreTags.join('/'))
    const explicitReaderPsychology = asArray(explicit.reader_psychology || explicit.readerPsychology).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitGenreFormula = asArray(explicit.genre_formula || explicit.genreFormula || explicit.type_formula || explicit.typeFormula).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitCoreHookRules = asArray(explicit.core_hook_rules || explicit.coreHookRules)
      .concat(asArray(explicit.selling_points || explicit.sellingPoints))
      .concat(compactBriefText(explicit.core_hook || explicit.coreHook))
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
    const explicitGoldfingerFitRules = asArray(explicit.goldfinger_fit_rules || explicit.goldfingerFitRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitMicroInnovationRules = asArray(explicit.micro_innovation_rules || explicit.microInnovationRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitMicroInnovation702010Rules = asArray(explicit.micro_innovation_702010_rules || explicit.microInnovation702010Rules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitMicroInnovationMethods = asArray(explicit.micro_innovation_methods || explicit.microInnovationMethods).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitLongboardFocusRules = asArray(explicit.longboard_focus_rules || explicit.longboardFocusRules)
      .concat(compactBriefText(explicit.long_board || explicit.longBoard))
      .concat(compactBriefText(explicit.innovation_boundary || explicit.innovationBoundary))
      .map((item: any) => compactBriefText(item))
      .filter(Boolean)
    const explicitMustHaveScenes = asArray(explicit.must_have_scenes || explicit.mustHaveScenes).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitPlatformFitRules = asArray(explicit.platform_fit_rules || explicit.platformFitRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_genre_positioning_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      genre_tags: explicitGenreTags.length ? explicitGenreTags : asArray(derived.genre_tags),
      platform: compactBriefText(explicit.platform || derived.platform),
      selling_points: uniqueBriefStrings(explicit.selling_points || explicit.sellingPoints || derived.selling_points || [], 8),
      genre_label: explicitGenreLabel || derived.genre_label,
      reader_psychology: explicitReaderPsychology.length ? explicitReaderPsychology : asArray(derived.reader_psychology),
      genre_formula: explicitGenreFormula.length ? explicitGenreFormula : asArray(derived.genre_formula),
      core_hook_rules: explicitCoreHookRules.length
        ? explicitCoreHookRules
        : asArray(derived.core_hook_rules).length ? asArray(derived.core_hook_rules) : OH_STORY_GENRE_POSITIONING_CORE_HOOK_RULES,
      goldfinger_fit_rules: explicitGoldfingerFitRules.length
        ? explicitGoldfingerFitRules
        : asArray(derived.goldfinger_fit_rules).length ? asArray(derived.goldfinger_fit_rules) : OH_STORY_GENRE_POSITIONING_GOLDFINGER_FIT_RULES,
      micro_innovation_rules: explicitMicroInnovationRules.length
        ? explicitMicroInnovationRules
        : asArray(derived.micro_innovation_rules).length ? asArray(derived.micro_innovation_rules) : OH_STORY_GENRE_POSITIONING_MICRO_INNOVATION_RULES,
      micro_innovation_702010_rules: explicitMicroInnovation702010Rules.length
        ? explicitMicroInnovation702010Rules
        : asArray(derived.micro_innovation_702010_rules).length ? asArray(derived.micro_innovation_702010_rules) : OH_STORY_GENRE_POSITIONING_MICRO_INNOVATION_702010_RULES,
      micro_innovation_methods: explicitMicroInnovationMethods.length
        ? explicitMicroInnovationMethods
        : asArray(derived.micro_innovation_methods).length ? asArray(derived.micro_innovation_methods) : OH_STORY_GENRE_POSITIONING_MICRO_INNOVATION_METHODS,
      longboard_focus_rules: explicitLongboardFocusRules.length
        ? explicitLongboardFocusRules
        : asArray(derived.longboard_focus_rules).length ? asArray(derived.longboard_focus_rules) : OH_STORY_GENRE_POSITIONING_LONGBOARD_FOCUS_RULES,
      must_have_scenes: explicitMustHaveScenes.length ? explicitMustHaveScenes : asArray(derived.must_have_scenes),
      platform_fit_rules: explicitPlatformFitRules.length ? explicitPlatformFitRules : asArray(derived.platform_fit_rules),
      quality_checks: asArray(explicit.quality_checks || explicit.qualityChecks).length
        ? asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
        : OH_STORY_GENRE_POSITIONING_QUALITY_CHECKS,
      revision_priorities: asArray(explicit.revision_priorities || explicit.revisionPriorities).length
        ? asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
        : ['校准题材标签', '补核心梗场景', '让金手指贴合主角生活/职业', '压缩模板外创新', '修书名简介内容错位'],
    }
  }

  const profile = inferGenrePositioningProfile(project, contextPackage)
  return {
    version: 'oh_story_genre_positioning_v1',
    source: 'oh_story_embedded_fallback',
    ...profile,
    quality_checks: OH_STORY_GENRE_POSITIONING_QUALITY_CHECKS,
    revision_priorities: ['校准题材标签', '补核心梗场景', '让金手指贴合主角生活/职业', '压缩模板外创新', '修书名简介内容错位'],
  }
}

