import { asArray } from '../../routes/novel-route-utils'
import { compactBriefText, uniqueBriefStrings } from './text-utils'

const NEW_CONCEPT_USAGE_HINTS = [
  'new',
  'new_concept',
  'introduce',
  'introduced',
  'first_appearance',
  'first_introduced',
  'setup_new',
  '新增',
  '新设定',
  '首次',
  '首次引入',
  '引入',
]

function isExplicitNewConceptUsage(row: any) {
  if (!row || typeof row !== 'object') return false
  if (row.is_new === true || row.isNew === true || row.new_concept === true || row.newConcept === true || row.first_introduced === true || row.firstIntroduced === true) return true
  const fields = [
    row.usage_type,
    row.usageType,
    row.status,
    row.novelty,
    row.stage,
    row.introduction_stage,
    row.introductionStage,
    row.intent,
  ].map(value => String(value || '').toLowerCase())
  return fields.some(value => NEW_CONCEPT_USAGE_HINTS.some(hint => value.includes(hint.toLowerCase())))
}

export function scanNewConceptOverloadRisks(contextPackage: any = {}) {
  const rows = [
    ...asArray(contextPackage?.setting_context?.chapter_usage || contextPackage?.setting_context?.chapterUsage),
    ...asArray(contextPackage?.storyline_context?.chapter_usage || contextPackage?.storyline_context?.chapterUsage),
  ]
  const concepts = uniqueBriefStrings(rows
    .filter((row: any) => isExplicitNewConceptUsage(row))
    .filter((row: any) => String(row?.usage_type || row?.usageType || '').toLowerCase() !== 'forbidden')
    .map((row: any) => compactBriefText(row?.name || row?.title || row?.label || row?.summary || row))
    .filter(Boolean), 12)

  if (concepts.length <= 3) return []
  return [{
    key: 'quality_audit_new_concept_overload',
    label: '新概念负载',
    status: 'fail',
    evidence: `本章明确新增概念 ${concepts.length} 个：${concepts.join('、')}`,
    fix: '最多保留 3 个本章必须新增的概念，其余改为已有资产状态变化、延后到后续章节，或并入冲突中的一句可见信息。',
    strategy: 'compress',
  }]
}

function regexEscapeLiteral(value: string) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function explicitNewConceptNames(contextPackage: any = {}) {
  const rows = [
    ...asArray(contextPackage?.setting_context?.chapter_usage || contextPackage?.setting_context?.chapterUsage),
    ...asArray(contextPackage?.storyline_context?.chapter_usage || contextPackage?.storyline_context?.chapterUsage),
    ...asArray(contextPackage?.chapter_target?.setting_usage || contextPackage?.chapter_target?.settingUsage),
    ...asArray(contextPackage?.chapterTarget?.setting_usage || contextPackage?.chapterTarget?.settingUsage),
  ]
  return uniqueBriefStrings(rows
    .filter((row: any) => isExplicitNewConceptUsage(row))
    .filter((row: any) => String(row?.usage_type || row?.usageType || '').toLowerCase() !== 'forbidden')
    .map((row: any) => compactBriefText(row?.name || row?.title || row?.label || row?.summary || row))
    .filter(Boolean), 8)
}

function newConceptHasImmediateAnchor(name: string, chapterText: string) {
  const text = String(chapterText || '')
  const escaped = regexEscapeLiteral(name)
  if (!escaped || !text.includes(name)) return true
  const firstIndex = text.indexOf(name)
  const windowText = text.slice(Math.max(0, firstIndex - 90), firstIndex + name.length + 140)
  const actionBefore = new RegExp(`(?:把|将|用|拿起|握住|按住|贴上|碰到|触到|递出|塞进|嵌进)[^。！？\\n]{0,24}${escaped}`).test(windowText)
  const actionAfter = new RegExp(`${escaped}[^。！？\\n]{0,36}(?:按|贴|嵌|亮|烫|裂|炸|浮出|显出|响|刺|割|锁住|打开|吐出|弹出|改变|暴露|找回)`).test(windowText)
  const consequence = /(?:记忆碎片|画面|鼻血|血|红光|冷光|裂纹|倒计时|印记|缺页|证据|位置)[^。！？\n]{0,36}(?:炸开|浮出|显出|亮起|烫|刺|锁住|打开|改变|暴露)/.test(windowText)
  const usefulDialogue = /“[^”]{0,60}(?:能|会|用来|可以|拿它|靠它|找回|打开|封住|锁住|证明|定位|暴露)[^”]{0,30}”/.test(windowText)
  return actionBefore || actionAfter || consequence || usefulDialogue
}

export function scanNewConceptAnchorRisks(contextPackage: any = {}, chapterText = '') {
  const names = explicitNewConceptNames(contextPackage)
  if (!names.length) return []
  const text = String(chapterText || '')
  const risks = names
    .filter(name => text.includes(name))
    .filter(name => !newConceptHasImmediateAnchor(name, text))
  if (!risks.length) return []
  const explanationOnly = /(?:源于|来历|原理|分为|等级|制度|设定以后|后续再解释|以后会有用)/.test(text)
  return [{
    key: 'prose_craft_new_concept_anchor_missing',
    label: '新概念锚点缺失',
    status: 'warn',
    evidence: `本章新增概念缺少动作/对话/物理后果锚点：${risks.join('、')}${explanationOnly ? '；正文偏向来历/原理解释' : ''}`,
    fix: '给新名词/新设定补当下作用锚点：用角色动作反应、对话半句或物理后果带出功能，例如按上、触发、炸开、浮出、刺痛、亮起、暴露证据或改变选择；删掉整段来历/原理/等级说明。',
  }]
}

const SCALE_ANCHOR_TERMS = /月俸|年薪|工资|房租|米价|饭钱|普通人|外门弟子|杂役|伙计|账房|凡人|庶民|散修|一天|一年|十年|百年|三百年|家产|铺子|一顿饭|一间房|一条街|收入|成本|代价|日常|饭馆|客栈|入门丹|养活|倾家荡产/
const ECONOMIC_SCALE_PATTERN = /[一二三四五六七八九十百千万亿零〇两\d]+(?:\.\d+)?(?:万|百万|千万|亿)?(?:灵石|金币|银票|银子|铜钱|两|积分|贡献点|现金|存款|资产|债务|元|块)/g
const POWER_SCALE_PATTERN = /(?:战力|境界|等级|修为|气血|灵力|武力|精神力|评级|品阶)[^。！？\n，,；;]{0,18}[一二三四五六七八九十百千万亿零〇两\d]+(?:\.\d+)?(?:万|百万|千万|亿)?(?:点|级|阶|品|星|层)?|[一二三四五六七八九十百千万亿零〇两\d]+(?:\.\d+)?(?:万|百万|千万|亿)(?:点|级|阶|品|星)/g

export function scanEconomicPowerScaleAnchorRisks(text: string) {
  const rawText = String(text || '')
  if (!rawText.trim()) return []

  const hits: string[] = []
  const patterns = [ECONOMIC_SCALE_PATTERN, POWER_SCALE_PATTERN]
  for (const pattern of patterns) {
    pattern.lastIndex = 0
    for (const match of rawText.matchAll(pattern)) {
      const value = compactBriefText(match[0])
      if (!value) continue
      const index = typeof match.index === 'number' ? match.index : rawText.indexOf(match[0])
      const window = rawText.slice(Math.max(0, index - 80), Math.min(rawText.length, index + match[0].length + 80))
      if (SCALE_ANCHOR_TERMS.test(window)) continue
      hits.push(value)
      if (hits.length >= 4) break
    }
    if (hits.length >= 4) break
  }

  const riskyScales = uniqueBriefStrings(hits, 4)
  if (!riskyScales.length) return []
  return [{
    key: 'quality_audit_scale_anchor_missing',
    label: '经济/战力尺度锚点',
    status: 'warn',
    evidence: `出现大额经济或战力尺度但缺少普通人锚点：${riskyScales.join('、')}`,
    fix: '补普通人收入、月俸/年薪、日常成本、修炼代价或旁观者职业反应，让金额/战力有可感知的日常尺度。',
    strategy: 'polish',
  }]
}

