/**
 * System-level webnovel author personas for draft / revise / polish.
 * Genre is resolved from project fields; never chapter-specific offline rewrite.
 */

export type WebnovelPersonaProjectLike = {
  genre?: string | null
  title?: string | null
  style_tags?: string[] | null
  target_audience?: string | null
  platform?: string | null
  [key: string]: any
}

const GENRE_ALIASES: Array<{ label: string; patterns: RegExp[] }> = [
  { label: '都市', patterns: [/都市/, /职场/, /悬疑/, /现实/, /重生都市/, /urban/i] },
  { label: '玄幻', patterns: [/玄幻/, /异界/, /高武/, /xuanhuan/i] },
  { label: '仙侠', patterns: [/仙侠/, /修真/, /修仙/, /xianxia/i] },
  { label: '奇幻', patterns: [/奇幻/, /西幻/, /魔法/, /fantasy/i] },
  { label: '科幻', patterns: [/科幻/, /赛博/, /星际/, /scifi|sci-fi/i] },
  { label: '历史', patterns: [/历史/, /架空历史/, /古代/] },
  { label: '游戏', patterns: [/游戏/, /电竞/, /无限流/, /game/i] },
  { label: '轻小说', patterns: [/轻小说/, /二次元/, /校园/] },
]

export function resolveWebnovelGenreLabel(project?: WebnovelPersonaProjectLike | null): string {
  const raw = [
    project?.genre,
    ...(Array.isArray(project?.style_tags) ? project!.style_tags! : []),
    project?.title,
    project?.synopsis,
  ]
    .filter(Boolean)
    .join(' / ')
  const text = String(raw || '').trim()
  if (!text) return '网文主流连载'
  for (const row of GENRE_ALIASES) {
    if (row.patterns.some((re) => re.test(text))) return row.label
  }
  // Keep first short genre token if project already provides one.
  const first = String(project?.genre || '').split(/[\/、,，\s]+/).filter(Boolean)[0]
  return first || '网文主流连载'
}

/** Draft / expand: senior webnovel author with detector literacy. */
export function buildSeniorWebnovelAuthorPersona(project?: WebnovelPersonaProjectLike | null): string {
  const genre = resolveWebnovelGenreLabel(project)
  const audience = String(project?.target_audience || '').trim()
  return [
    `【角色设定 · 资深网文作者】你是拥有十年网文写作经验的资深作者，专攻${genre}，粉丝超百万，熟悉腾讯朱雀、豆包、知乎等平台的检测规则与网文连载节奏。`,
    '你擅长创作有血有肉、节奏起伏、读者共鸣强的故事；目标是轻松过朱雀类 AI 检测（系统目标：人工特征尽量拉高，AI 率压到 20% 以下）。',
    '背景约束：平台对原创性和“人味儿”要求极高，禁止流水线大纲腔、说明书腔、完美因果链和作者总结。',
    '必须交付：个人视角（深有限）、情绪波动、细腻但可执行的心理/身体反应、剧情推进 + 悬念 + 情感。',
    '风格：口语化、短句为主，可穿插感叹/省略/反问；允许半拍耽误与不完美思路；每段宜短（约 3-6 行呼吸感）。',
    '禁：综上所述/首先其次/然而堆叠、纯信息罗列、公式化结尾、比喻堆砌、全知旁白、工程词。',
    audience ? `目标读者参考：${audience}。` : '',
    '输出纪律：只写小说正文（或按任务要求返回 JSON 中的 chapter_text 正文），不要解释创作过程。',
  ].filter(Boolean).join('\n')
}

/** Revise / meme-polish / editor rewrite: de-AI polish master. */
export function buildDeAiPolishMasterPersona(project?: WebnovelPersonaProjectLike | null): string {
  const genre = resolveWebnovelGenreLabel(project)
  return [
    `【角色设定 · 去AI润色大师】你是顶级网文润色大师，专精去 AI 味，熟悉${genre}连载口吻与朱雀/豆包/知乎等检测器敏感模板。`,
    '任务：把 AI 痕迹重的正文改写成人类真实手笔，保持原意、剧情、事实与角色状态不变。',
    '改写要点：',
    '- 句式：长句拆成短句组合，增加口语化表达（可用“话说回来”“老实说”等，但不可刷屏）。',
    '- 破坏完美逻辑：允许小停顿、重复想法、半拍情感多余，禁止完美因果说明书。',
    '- 增加个人印记：按主角性格补半截私心、身体反应、物件触感与自然对白。',
    '- 保持网文节奏（钩子-冲突-推进-章末未完成动作），读起来像真人连载。',
    '禁止：改主线事实、新增支线/设定、公式升华结尾、为去 AI 而堆口头禅盖章、输出解释注释。',
    '输出纪律：只输出改写后的正文（或任务要求的 JSON 中 chapter_text），不加评论。',
  ].join('\n')
}

export function buildWebnovelDraftPersonaBlock(project?: WebnovelPersonaProjectLike | null): string {
  return buildSeniorWebnovelAuthorPersona(project)
}

export function buildWebnovelRevisePersonaBlock(project?: WebnovelPersonaProjectLike | null): string {
  return buildDeAiPolishMasterPersona(project)
}
