export type GenreCatalogGuide = {
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

/** Compact fallback when API is unavailable — mirrors oh-story high-frequency routes. */
export const FALLBACK_GENRE_CATALOG_GUIDES: GenreCatalogGuide[] = [
  {
    framework: '规则怪谈',
    keywords: ['规则怪谈', '规则副本', '怪谈', '副本', '国运', '直播求生'],
    reader_promise: '类无限流副本求生，靠规则破解、代价压力、信息差和反制爽点留住读者。',
    structure_beats: ['背景故事→规则包装→通关线+dead end', '别人死→主角装/破局→揭露→升华'],
    must_have_scenes: ['玩家被抽入规则副本', '主角第一次读规则并发现漏洞', '别人违规则付代价，主角信息差反制', '副本真相揭露并带出下一层压力'],
    emotional_rhythm: ['恐惧/压迫→发现规则→试错代价→智斗反制→揭露释放'],
    pitfalls: ['不能只靠作者解释让规则成立', '不能写成纯打怪'],
    quality_checks: ['题材定位必须明确为规则副本求生', '有信息差设计'],
    category_hint: '高压求生/智斗',
  },
  {
    framework: '都市高武',
    keywords: ['都市高武', '武道', '宗门', '隐世', '武道大会', '都市异能'],
    reader_promise: '都市外壳下的武道升级与势力对抗，靠战力差、打脸和地图扩张留存。',
    structure_beats: ['低位受压→觉醒/机缘→小地图打脸→更大势力→资源争夺→阶段封神'],
    must_have_scenes: ['都市日常压迫', '第一次越级反杀', '宗门/势力规则展示', '阶段战力结算'],
    emotional_rhythm: ['憋屈→机缘→爽打→危机→更大爽'],
    pitfalls: ['不能只有装逼没有代价', '地图升级后要换对手层级'],
    quality_checks: ['每阶段都有可见战力账本', '打脸服务主线资源/地位变化'],
    category_hint: '升级成长',
  },
  {
    framework: '仙侠/玄幻',
    keywords: ['仙侠', '玄幻', '修仙', '灵气', '宗门', '飞升'],
    reader_promise: '修炼升级、机缘争夺和大道冲突，用境界门槛与长线目标承载连载。',
    structure_beats: ['入门→小成→外出历练→宗门大比→秘境→更大界域'],
    must_have_scenes: ['境界规则展示', '机缘争夺', '生死战与突破', '宿敌/大道压力'],
    emotional_rhythm: ['渴望→受挫→机缘→爆发→新渴望'],
    pitfalls: ['境界通胀过快', '只升级不讲代价'],
    quality_checks: ['升级必须改变处境', '每卷有明确地图与敌人层级'],
    category_hint: '升级成长',
  },
  {
    framework: '脑洞文',
    keywords: ['脑洞', '金手指', '系统', '创意设定'],
    reader_promise: '用独特金手指或创意设定作为核心卖点，题材只是外壳。',
    structure_beats: ['获得点子→判断潜力→选适配题材→加工情绪缺口→设计金手指骨相→主线循环'],
    must_have_scenes: ['点子首次兑现', '规则边界展示', '点子带来的麻烦', '点子升级'],
    emotional_rhythm: ['好奇→验证→上瘾→危机→更大兑现'],
    pitfalls: ['全盘照抄必扑', '题材选择必须服务点子'],
    quality_checks: ['金手指规则可复述', '每章至少一次点子兑现或新限制'],
    category_hint: '题材外壳/脑洞',
  },
  {
    framework: '重生复仇',
    keywords: ['重生', '复仇', '归来', '前世'],
    reader_promise: '带着前世信息差重活，在关键节点改命、布局和复仇。',
    structure_beats: ['前世恨点→重生→关键节点改写→敌人反扑→清算→新局'],
    must_have_scenes: ['前世创伤锚点', '第一次改命成功', '信息差打脸', '最终清算'],
    emotional_rhythm: ['恨→冷静→爽改→惊险→大清算'],
    pitfalls: ['信息差不能无脑全知', '复仇要有阶段目标'],
    quality_checks: ['每个改命点服务最终清算', '敌人也有学习能力'],
    category_hint: '信息差/复仇',
  },
  {
    framework: '霸总/甜宠',
    keywords: ['霸总', '甜宠', '宠文', '豪门'],
    reader_promise: '强势偏爱与情绪安抚，靠撒糖、护短和关系确认制造上头感。',
    structure_beats: ['相遇→误解→偏爱展示→危机→关系确认→更甜'],
    must_have_scenes: ['强势护短', '公开/私下偏爱', '第三者压力', '关系名分确认'],
    emotional_rhythm: ['心动→甜→酸→更甜'],
    pitfalls: ['霸总不能只凶不宠', '女主不能只有花瓶功能'],
    quality_checks: ['每章至少一处明确偏爱动作', '冲突最终服务关系升温'],
    category_hint: '女频/情感',
  },
  {
    framework: '悬疑',
    keywords: ['悬疑', '推理', '案件', '真相'],
    reader_promise: '用谜题、线索和反转牵引追读，真相揭露带来智力与情绪双重释放。',
    structure_beats: ['案发→调查→线索矛盾→假真相→反转→终局'],
    must_have_scenes: ['强钩子案发', '关键线索投放', '误导与反转', '真相代价'],
    emotional_rhythm: ['好奇→紧张→怀疑→震惊→释然'],
    pitfalls: ['不能靠角色突然全知', '线索必须可回看'],
    quality_checks: ['每章至少新增有效信息或压力', '反转有前置埋点'],
    category_hint: '高压求生/智斗',
  },
  {
    framework: '历史/架空历史',
    keywords: ['历史', '架空', '科举', '朝堂', '军史'],
    reader_promise: '借历史舞台写权谋、军功、科举或经营升级，用制度与人情共同施压。',
    structure_beats: ['入局→制度考验→资源积累→政治/军事冲突→名位跃迁'],
    must_have_scenes: ['制度规则展示', '人情网络', '关键考核/战役', '权力再分配'],
    emotional_rhythm: ['谨慎→布局→博弈→险胜→更大棋局'],
    pitfalls: ['不能只有现代人嘴炮', '制度约束必须真实起作用'],
    quality_checks: ['升级改变权位资源', '冲突落在具体制度接口'],
    category_hint: '题材外壳/脑洞',
  },
]

function normalizeText(value: any) {
  return String(value || '').trim().toLowerCase()
}

export function matchGenreCatalogGuide(
  guides: GenreCatalogGuide[],
  ...inputs: any[]
): GenreCatalogGuide | null {
  const text = inputs.map(normalizeText).filter(Boolean).join('\n')
  if (!text) return null
  const scored = guides
    .map((guide, index) => ({
      guide,
      index,
      score: guide.keywords.reduce((total, keyword) => {
        const key = normalizeText(keyword)
        return key && text.includes(key) ? total + key.length : total
      }, 0),
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
  return scored[0]?.guide || null
}

export function groupGenreCatalogGuides(guides: GenreCatalogGuide[]) {
  const groups = new Map<string, GenreCatalogGuide[]>()
  for (const guide of guides) {
    const key = guide.category_hint || '通用长篇'
    const list = groups.get(key) || []
    list.push(guide)
    groups.set(key, list)
  }
  return Array.from(groups.entries()).map(([category, items]) => ({ category, items }))
}

export function genreFrameworkToPrimaryGenre(framework: string) {
  if (/仙侠|玄幻|凡人|长生/.test(framework)) return '玄幻'
  if (/都市高武|都市|文娱|新媒体|脑洞/.test(framework)) return '都市'
  if (/规则怪谈|无限|悬疑/.test(framework)) return '悬疑'
  if (/历史/.test(framework)) return '历史'
  if (/西幻/.test(framework)) return '奇幻'
  if (/婚恋|甜宠|霸总|追妻|后悔|死人|世情/.test(framework)) return '言情'
  if (/同人/.test(framework)) return '其他'
  return '其他'
}

export function buildGenreGuideIdeaPrefix(guide: GenreCatalogGuide | null | undefined) {
  if (!guide) return ''
  return [
    `【oh-story 类型框架：${guide.framework}】`,
    `读者承诺：${guide.reader_promise}`,
    `必备场景：${guide.must_have_scenes.slice(0, 3).join('；')}`,
    `避坑：${guide.pitfalls.slice(0, 2).join('；')}`,
  ].join('\n')
}
