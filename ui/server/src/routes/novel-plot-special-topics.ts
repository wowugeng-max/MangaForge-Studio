export type OhStoryPlotSpecialTopicsContract = {
  source: 'oh_story_plot_special_topics_v1'
  matched_topics: string[]
  goldfinger_design_rules: string[]
  goldfinger_advanced_rules: string[]
  brainstorm_framework_rules: string[]
  genre_boundary_rules: string[]
  market_benchmark_rules: string[]
  benchmark_selection_rules: string[]
  fanfic_original_rhythm_rules: string[]
  urban_high_martial_rules: string[]
  identity_behavior_rules: string[]
  love_line_rules: string[]
  character_story_deepening_rules: string[]
  adaptation_rules: string[]
  launch_checkpoint_rules: string[]
  faction_motivation_rules: string[]
  faction_hand_rules: string[]
  common_problem_diagnostics: string[]
  three_book_fusion_rules: string[]
  quality_checks: string[]
}

function compactTopicInput(value: any): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function topicText(inputs: any[]) {
  return inputs.map(compactTopicInput).join(' ')
}

function appendIfMatched(output: string[], text: string, topic: string, pattern: RegExp) {
  if (pattern.test(text) && !output.includes(topic)) output.push(topic)
}

function inferMatchedTopics(text: string) {
  const topics = [
    '题材边界感',
    '扫榜与对标书选择',
    '身份行为论',
    '阵营剧情/手牌法',
  ]
  appendIfMatched(topics, text, '金手指拆分与战力防崩', /金手指|系统|抽卡|面板|熟练度|加点|商城|兑换|词条|战力/)
  appendIfMatched(topics, text, '金手指进阶/错位系统', /错位|反套路|极道|系统/)
  appendIfMatched(topics, text, '脑洞文完整框架', /脑洞|核心梗|创意|系统|金手指|点子/)
  appendIfMatched(topics, text, '都市高武情节模板', /都市高武|高武|武道|武馆|军校|联考|全国高考|治安局|军部/)
  appendIfMatched(topics, text, '同人vs原创节奏', /同人|IP|原著|名场面|原创/)
  appendIfMatched(topics, text, '爱情线提纯', /爱情|恋爱|后宫|女主|男主|CP|感情线|青梅|校花/)
  appendIfMatched(topics, text, '三万字卡点倒推', /三万字|上架|卡点|高潮|首秀/)
  appendIfMatched(topics, text, '剧情改编三步法', /改编|原型|桥段|对照/)
  appendIfMatched(topics, text, '三本书融合为新故事', /融合|对标书|竞品|扫榜|拆书/)
  return topics
}

export function buildOhStoryPlotSpecialTopicsContract(...inputs: any[]): OhStoryPlotSpecialTopicsContract {
  const text = topicText(inputs)
  return {
    source: 'oh_story_plot_special_topics_v1',
    matched_topics: inferMatchedTopics(text),
    goldfinger_design_rules: [
      '金手指拆分成面板/不倒退/重复提升，再按题材重新拼接成可循环的行动机制。',
      '后期金手指不能只剩品质提升一个维度，必须保留词条、功能、品质等多维成长。',
      '战力防崩先查三件事：升级线是否清楚、金手指是否多维、社会环境是否有酒馆/师门/朋友/情报组织等关系支撑。',
    ],
    goldfinger_advanced_rules: [
      '错位系统要制造时间、空间或对象错位，落差必须足够大，且戏剧性必须是目标读者期待的。',
      '系统反套路不能只展示“反”的噱头，还要展示主角如何利用反套路获得爽点。',
      '加点、熟练度、抽卡、商城/兑换等系统类型要和世界压迫度、资源目标和主角行为方式匹配。',
    ],
    brainstorm_framework_rules: [
      '脑洞文按得到点子->匹配题材->构建框架->设计剧情推进，不要跳步。',
      '金手指核心机制使用条件-反馈模型：单条件单反馈、单条件阶段反馈、条件升级反馈，并允许概率反馈或子能力反馈。',
      '每个小剧情按铺垫起点->困难出现->金手指/实力发挥作用->爽点释放运行，小循环里要铺垫中循环和大循环期待。',
    ],
    genre_boundary_rules: [
      '先确认题材边界：同题材精品到万订之间的共同元素，就是目标读者买账的边界。',
      '题材边界内做到极致比越界创新更重要；上下文不足时不突破边界，先交付核心期待。',
      '金手指核心卖点循环必须在题材边界内，读者冲着什么进来，后续就持续给什么。',
    ],
    market_benchmark_rules: [
      '市场扫描优先看同平台、同题材、同类型、非头部光环作品，以获得可复用结构样本。',
      '拆书前先确定一个维度：人设、节奏、对比手法、悬念、冲突拉扯或情绪链条，每次只拆一个维度。',
      '不以个人喜好判断对标价值，只判断作品能否提供可复用的结构、情绪或节奏模块。',
    ],
    benchmark_selection_rules: [
      '对标书优先选择精品到万订之间、套路框架易懂、题材经过市场验证的书。',
      '排除强品牌/强粉丝基础头部作品、刚火题材跟风书、个人风格极强的好书。',
      '选3-10本同平台、同题材、同类型样本，提取核心卖点、读者评论和高频剧情模式后再定主对标。',
    ],
    fanfic_original_rhythm_rules: [
      '同人自带期待感和爽感，可以少铺垫；原创前期小爽即可，先快速重复核心套路拉住读者。',
      '原创节奏递进可按开头1万字一个剧情x3，再2万字一个剧情x2，再3万字一个剧情x2，再8万字xN。',
      '行文自检：一句话能说清就不过多解释，与主线无关的剧情尽量少写，反复描述同一件事要删。',
    ],
    urban_high_martial_rules: [
      '都市高武所有目标必须和钱挂钩，没钱寸步难行，有钱打遍天下。',
      '目标池优先从物质、学业、职业发展、亲情、感情、激励中组合，并把升级收益换算成钱/资源/资格。',
      '学校、武馆、警局、竞争赛事都要提供可执行事件：月考、联考、武馆联赛、治安局任务、军部资格等。',
      '换地图公式：高中->大学，武馆->天下第一武道会，武道厅->中央武道厅，蓝星->其他星域。',
    ],
    identity_behavior_rules: [
      '写章节前确认收、放、压、起；高潮结束后的第二章也必须处理余波和下一轮期待。',
      '主角身份确定后，行为必须受身份约束；越级行动会破坏代入感和结构可信度。',
      '强情绪开局必须有后续升级能力支撑，后续大节点至少在代价、范围、真相或关系破裂上升级一个维度。',
    ],
    love_line_rules: [
      '爱情线核心梗二选一：特定戏剧性爱情过程，或特定人设/关系互动模式。',
      '互动模式一旦建立要持续到全文最后，改变互动模式等于改变读者追看的核心观感。',
      '爱情线为主时，事业线必须服务相识、关系改变、情敌/长辈考验或互动升温。',
    ],
    character_story_deepening_rules: [
      '主线清楚但需要新鲜感时，优先向人设深化：列出人物相处关系、欲望差异和互动模式，再映射成情节点。',
      '复杂阴谋、多层推理和智斗适合向故事深化，但难度更高，需要更强因果和信息链。',
    ],
    adaptation_rules: [
      '剧情改编三步法：通过矛盾找目标和原型->纵向对照桥段并换成自己的书况->按节奏、情绪、悬念、人物动机验收。',
      '只复用功能位和结构，不复用具体桥段、专有设定、角色名或原句；世界观、人物关系、金手指境况不同才算改到不一样。',
    ],
    launch_checkpoint_rules: [
      '三万字卡点倒推：先确定上架高潮场景，再从卡点一步步倒推开头剧情。',
      '三万字内无关卡点的装逼打脸一个字不要写。',
      '核心反派、阶段目标和关键爽点都要围绕三万字卡点设计。',
    ],
    faction_motivation_rules: [
      '阵营剧情从四种模式中选：主角->敌方，友军->敌方->主角->敌方，主角->敌方a->敌方bcd，主角->友军。',
      '第三方阵营不只是围观震惊，还要完善逻辑，衡量反派和主角方高人的行为是否合理。',
      '动机从人设锚点出发，情绪层层铺垫并波浪式推进，不能一路压抑或一路爽到底。',
    ],
    faction_hand_rules: [
      '阵营手牌法：按实力高低排序各阵营角色，逐级递进，主角最后出手碾压。',
      '基础版用不同立场角色对同一事件的不同态度加先抑后扬；进阶版按观众->配角A->配角B->敌人C->主角碾压->大BOSS。',
      '升级文可把功法/法宝替代知识/科技，把战斗特点替代台词，把登台替代开会。',
    ],
    common_problem_diagnostics: [
      '选错题材：题材缝合、难度过高或不适配，修正方向是扫榜分析题材门槛。',
      '不知好坏：自嗨、忐忑或无法判断质量，修正方向是建立节奏/情绪/悬念等具体评判维度。',
      '不研究市场：内容源于自我认知，修正方向是扫同题材榜上书并提取读者评论需求关键词。',
      '不用套路：一拍脑袋全凭感觉写，修正方向是拆书总结题材通用套路和可复用结构模板。',
    ],
    three_book_fusion_rules: [
      '三本书融合必须选同平台、同题材、同类型且近期数据/评论可验证的对标书。',
      '每本书提取300-500字梗概、核心梗、卖点结构和读者评论关键词。',
      '融合只复用核心梗、节奏、情绪触发、人物关系等功能位，不复用具体桥段。',
      '输出新故事核心后，先用200字概括验证核心矛盾、情绪钩子、金手指展示，三项至少满足两项。',
    ],
    quality_checks: [
      '金手指是否拆成多个元素，且后期仍有多维成长。',
      '题材边界是否明确，金手指核心循环是否在边界内。',
      '每个剧情是否有主线、过渡或小循环功能。',
      '阵营冲突模式、第三方逻辑和动机铺垫是否明确。',
      '爱情线如涉及，核心梗是否二选一且互动模式稳定。',
      '对标书是否同平台、同题材、同类型，且拆书每次只拆一个维度。',
    ],
  }
}

export function formatOhStoryPlotSpecialTopicsPrompt(contract: OhStoryPlotSpecialTopicsContract) {
  return [
    '【oh-story 特殊题材操作契约】',
    '请把下列内容写入 writing_bible.plot_special_topics_contract，并让 core_hook、commercial_positioning、plot_engine、volume_outlines、chapter_outlines 与它一致；只启用 matched_topics 命中的专题，但 quality_checks 必须全局执行：',
    JSON.stringify(contract, null, 2),
  ].join('\n')
}
