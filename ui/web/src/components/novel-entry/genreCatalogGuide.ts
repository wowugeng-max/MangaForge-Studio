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

export const PRIMARY_GENRE_OPTIONS = [
  { value: '都市', label: '都市' },
  { value: '悬疑', label: '悬疑' },
  { value: '玄幻', label: '玄幻' },
  { value: '仙侠', label: '仙侠' },
  { value: '科幻', label: '科幻' },
  { value: '历史', label: '历史' },
  { value: '奇幻', label: '奇幻' },
  { value: '武侠', label: '武侠' },
  { value: '言情', label: '言情' },
  { value: '末世', label: '末世' },
  { value: '穿越', label: '穿越' },
  { value: '系统', label: '系统流' },
  { value: '其他', label: '其他' },
] as const

export function genreFrameworkToPrimaryGenre(framework: string) {
  if (/仙侠\/玄幻|玄幻/.test(framework) && !/^仙侠$/.test(framework)) return '玄幻'
  if (/仙侠|凡人|长生/.test(framework)) return '仙侠'
  if (/都市高武|都市|文娱|新媒体|脑洞/.test(framework)) return '都市'
  if (/规则怪谈|无限|悬疑/.test(framework)) return '悬疑'
  if (/历史/.test(framework)) return '历史'
  if (/西幻/.test(framework)) return '奇幻'
  if (/婚恋|甜宠|霸总|追妻|后悔|死人|世情/.test(framework)) return '言情'
  if (/同人/.test(framework)) return '其他'
  if (/科幻/.test(framework)) return '科幻'
  if (/武侠/.test(framework)) return '武侠'
  if (/末世/.test(framework)) return '末世'
  if (/穿越|重生/.test(framework)) return '穿越'
  if (/系统/.test(framework)) return '系统'
  return '其他'
}

export function frameworkMatchesPrimaryGenre(framework: string, primaryGenre: string) {
  const primary = String(primaryGenre || '').trim()
  if (!primary) return true
  const mapped = genreFrameworkToPrimaryGenre(framework)
  if (mapped === primary) return true
  // 玄幻/仙侠互通
  if ((primary === '玄幻' || primary === '仙侠') && (mapped === '玄幻' || mapped === '仙侠' || /仙侠|玄幻|凡人|长生/.test(framework))) return true
  if (primary === '都市' && /都市|文娱|新媒体|脑洞|高武/.test(framework)) return true
  if (primary === '悬疑' && /悬疑|规则怪谈|无限|推理|怪谈/.test(framework)) return true
  if (primary === '言情' && /婚恋|甜宠|霸总|追妻|后悔|死人|世情/.test(framework)) return true
  if (primary === '系统' && /脑洞|系统/.test(framework)) return true
  if (primary === '穿越' && /重生|穿越|归来/.test(framework)) return true
  if (primary === '其他') return true
  return false
}

export function filterGenreCatalogGuidesByPrimary(
  guides: GenreCatalogGuide[],
  primaryGenre: string,
) {
  const primary = String(primaryGenre || '').trim()
  if (!primary) return guides
  const filtered = guides.filter(guide => frameworkMatchesPrimaryGenre(guide.framework, primary))
  return filtered.length ? filtered : guides
}

export function primaryGenreLockText(primaryGenre: string) {
  const primary = String(primaryGenre || '').trim()
  if (!primary) return ''
  const forbidMap: Record<string, string> = {
    都市: '禁止写成仙侠/修真/灵气境界/宗门飞升体系；世界必须落在当代或近当代都市社会（可含隐藏异能，但外壳与日常场景仍是都市）。',
    悬疑: '禁止写成仙侠修真升级文；核心必须是谜题、线索、真相、推理或信息差压力。',
    言情: '禁止写成纯修仙升级主线；关系推进、情感确认与人物互动必须是主轴。',
    科幻: '禁止写成古典仙侠；冲突应依托科技、未来社会或科幻设定。',
    历史: '禁止写成现代都市爽文外壳；时代制度、历史语境与势力逻辑必须站得住。',
    奇幻: '禁止写成东方式修真境界通胀；冲突应依托奇幻世界规则。',
    末世: '禁止写成太平修仙日常；资源、秩序崩坏与生存压力必须在场。',
    系统: '系统/金手指必须服务选定主类，不得无故漂到无关的仙侠地图。',
    仙侠: '以仙侠修真为核心，不要漂成现代都市言情或纯悬疑本格。',
    玄幻: '以玄幻升级/异界冲突为核心，不要漂成现代都市日常文。',
  }
  return [
    `【主题材硬约束：${primary}】`,
    `genre 字段必须输出「${primary}」（或同义主类），不得漂到其他主类。`,
    forbidMap[primary] || `所有世界观、分卷、前30章细纲与伏笔必须服务「${primary}」主类。`,
  ].join('\n')
}

export function isSeedGenreAligned(seedGenre: any, primaryGenre: string) {
  const primary = String(primaryGenre || '').trim()
  const seed = String(seedGenre || '').trim()
  if (!primary || !seed) return !primary
  if (seed === primary) return true
  if ((primary === '玄幻' || primary === '仙侠') && (seed === '玄幻' || seed === '仙侠')) return true
  if (primary === '都市' && /都市|现实|职场|异能/.test(seed)) return true
  if (primary === '悬疑' && /悬疑|推理|怪谈|无限/.test(seed)) return true
  return seed.includes(primary) || primary.includes(seed)
}

export function buildGenreGuideIdeaPrefix(
  guide: GenreCatalogGuide | null | undefined,
  primaryGenre = '',
) {
  const primaryLock = primaryGenreLockText(primaryGenre || (guide ? genreFrameworkToPrimaryGenre(guide.framework) : ''))
  if (!guide) return primaryLock
  return [
    primaryLock,
    `【oh-story 类型框架：${guide.framework}】`,
    `读者承诺：${guide.reader_promise}`,
    `必备场景：${guide.must_have_scenes.slice(0, 3).join('；')}`,
    `避坑：${guide.pitfalls.slice(0, 2).join('；')}`,
    primaryGenre ? `主题材与玩法必须一致：主类=${primaryGenre || genreFrameworkToPrimaryGenre(guide.framework)}，玩法=${guide.framework}` : '',
  ].filter(Boolean).join('\n')
}
