import { asArray } from '../../routes/novel-route-utils'
import { compactBriefText, uniqueBriefStrings } from './text-utils'

const OH_STORY_QUALITY_AUDIT_STRUCTURE_CHECKS = [
  '章节结构：开头有钩子，中段有推进，局势有变化，结尾落在变化上而不是总结。',
  '开篇检查：前300-500字有钩子，不从天气/风景/日常开始，主角快速出场，卖点或危机可见。',
  '场景检查：场景有目标、阻碍、变化；人物在做事情，不是在感觉事情。',
  '章尾检查：结尾至少落在危机、决定、发现、反转之一，并拉住读者翻下一页。',
]

const OH_STORY_QUALITY_AUDIT_CHAPTER_PURPOSE_RULES = [
  '章纲目的法：每章一句话概括内容，并标注目的词（铺垫/高潮/爽点/打脸/人物塑造/设定）。',
  '盯紧章纲和目的来写，避免写作过程中跑偏。',
  '详略按目的词分配：爽点/打脸/高潮展开，铺垫/设定只保留有功能信息。',
]

const OH_STORY_QUALITY_AUDIT_PROGRESSION_CHECKS = [
  '章节推进：有核心事件，局势有变化，推进主线/关系/设定中的至少一项。',
  '水文检测：删掉这章会影响理解吗？不会就是水了。',
  '没有可删除段落：每段必须推进剧情、塑造人物、传递信息、制造情绪或维持悬念。',
  '最近连续章节不能没有冲突，故事引擎必须仍在运转。',
]

const OH_STORY_QUALITY_AUDIT_INFORMATION_CHECKS = [
  '没有大段设定说明文，信息必须跟着冲突走，通过事件传递设定。',
  '设定量可控：一章不超 3 个新概念。',
  '没有突然塞入大量新设定，伏笔必须有推进或明确保温。',
  '标题行以外不得混入本章/前文/伏笔/细纲/读者等写作工程词。',
]

const OH_STORY_QUALITY_AUDIT_EVENT_CONTENT_RULES = [
  '事件驱动：正文章节必须由事件组成，事件内容比重不能小于一半。',
  '事件是价值改变的契机：没有事件，主角和主线不会改变。',
  '设定尽量通过事件演绎，而非旁白强塞。',
]

const OH_STORY_QUALITY_AUDIT_LONGFORM_CHECKS = [
  '黄金三章：第一章前500字有钩子，前三章至少2个爽点，每章结尾有悬念。',
  '最近 5 章是否有明确进展，爽点间隔是否过长，是否连续 2 章以上没有冲突。',
  '人物检查：主角行为符合人设，配角有存在感，反派逼格匹配当前阶段。',
  '连载连续性：没有遗忘之前承诺/伏笔，故事引擎还在运转。',
]

const OH_STORY_QUALITY_AUDIT_FIVE_DIMENSION_RUBRIC = [
  '核心一致度：关键冲突、关键行动、人物动机是否前后一致。',
  '表层重写度：句式与措辞是否足够自然原创，避免套路化表达和AI标志词。',
  '格式一致度：段落是否按戏剧单元/镜头自然断开，主语/角色名节奏是否自然。',
  '可读性：是否有啰嗦、AI腔、空泛总结、套路修辞和情绪标签。',
  '逻辑连贯：句间/段间是否通顺，有无设定冲突、时间线错误、角色信息不一致或因果链断裂。',
]

const OH_STORY_QUALITY_AUDIT_SELLING_POINT_EXPRESSION_RULES = [
  '卖点表达：发现比告知爽十倍，不要直接告诉读者“这是核心卖点/本章很爽”。',
  '隐性展示：通过剧情、对话、动作结果和角色反应展示卖点。',
  '三层递进：开头暗示 -> 中间深化 -> 高潮爆发，让读者在阅读中自己发现。',
]

const OH_STORY_QUALITY_AUDIT_REVISION_STRATEGIES = [
  'rewrite：核心一致度低时，围绕核心冲突重写相关段落。',
  'compress：字数超标或水文过多时，删减不推动剧情的内容。',
  'de_ai：AI腔重时，替换禁用词、改写句式、删除空泛总结。',
  'polish：小问题多时，打磨语言细节、段落节奏和信息衔接。',
]

const OH_STORY_QUALITY_AUDIT_CHECKS = [
  '必须输出五维评分：核心一致度、表层重写度、格式一致度、可读性、逻辑连贯，每项0-100并给正文证据。',
  '章节结构必须完整：开头钩子、中段推进、局势变化、章尾翻页都要有证据。',
  '章纲必须有目的词：每章一句话概括内容，并标注铺垫/高潮/爽点/打脸/人物塑造/设定。',
  '必须执行水文检测：删掉本章/本段是否影响理解；无影响则标记为可压缩或删除。',
  '信息传递必须跟冲突走，一章新概念不得超过3个，大段设定说明必须改成事件承载。',
  '事件内容比重不能小于一半：设定、情绪和背景必须通过动作、选择、阻碍、代价或局势变化演绎。',
  '卖点表达必须隐性展示：不要直接说“这是卖点/本章很爽”，按开头暗示 -> 中间深化 -> 高潮爆发写成剧情、对话和反应。',
  '长篇连载必须检查最近5章进展、爽点间隔、连续无冲突、伏笔/承诺遗忘和故事引擎。',
  '根据最低分维度选择 rewrite/compress/de_ai/polish 精修策略，并给出可执行修订指令。',
]


function qualityAuditExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.quality_audit_contract
    || contextPackage?.chapter_target?.qualityAuditContract
    || contextPackage?.quality_audit_contract
    || contextPackage?.qualityAuditContract
    || contextPackage?.pre_draft_brief?.quality_audit_contract
    || contextPackage?.preDraftBrief?.qualityAuditContract
}

function buildQualityAuditChapterFocus(target: any = {}, sceneCards: any[] = []) {
  return uniqueBriefStrings([
    target.summary ? `本章核心事件：${compactBriefText(target.summary)}` : '',
    target.conflict ? `本章必须证明局势变化：${compactBriefText(target.conflict)}` : '',
    target.ending_hook ? `章尾必须落在具体变化/翻页钩子：${compactBriefText(target.ending_hook)}` : '',
    ...sceneCards.map((scene: any, index: number) => {
      const label = scene.reader_payoff || scene.purpose || scene.conflict
      return label ? `场景${scene.scene_no || index + 1}不可水：${compactBriefText(label)}` : ''
    }),
  ], 10)
}

const OH_STORY_QUALITY_AUDIT_PHASE_CHECKLIST = [
  {
    phase: '写前目的锁定',
    check: '先用一句话概括本章内容，并标注目的词：铺垫/高潮/爽点/打脸/人物塑造/设定。',
    receipt_keys: ['quality_audit_checks'],
  },
  {
    phase: '开篇抓取',
    check: '前300-500字必须有钩子、主角快速出场、卖点或危机可见，不能从天气/风景/日常开场。',
    receipt_keys: ['structure_checks', 'opening_checks'],
  },
  {
    phase: '中段推进',
    check: '中段必须有核心事件、目标、阻碍和局势变化；删掉本章会影响理解。',
    receipt_keys: ['progression_checks', 'quality_audit_checks'],
  },
  {
    phase: '信息负载',
    check: '信息跟着冲突走，一章不超过3个新概念，没有大段设定说明书。',
    receipt_keys: ['information_checks'],
  },
  {
    phase: '章尾拉力',
    check: '结尾落在具体变化、危机、决定、发现或反转上，不写总结式结尾。',
    receipt_keys: ['structure_checks', 'chapter_hook_checks'],
  },
  {
    phase: '连载连续性',
    check: '最近5章有明确进展，伏笔和状态没有遗忘，故事引擎仍在运转。',
    receipt_keys: ['longform_checks', 'state_tracking_checks'],
  },
  {
    phase: '精修策略',
    check: '按五维评分找最低分维度，选择 rewrite/compress/de_ai/polish，并给正文证据。',
    receipt_keys: ['quality_audit_checks', 'prose_craft_checks'],
  },
]

function normalizeQualityAuditPhaseChecklist(value: any) {
  return asArray(value)
    .map((item: any) => {
      const phase = compactBriefText(item?.phase || item?.label || item?.name)
      const check = compactBriefText(item?.check || item?.rule || item?.detail || item?.description)
      const receiptKeys = uniqueBriefStrings(item?.receipt_keys || item?.receiptKeys || item?.receipts || [], 6)
      if (!phase || !check || !receiptKeys.length) return null
      return {
        phase,
        check,
        receipt_keys: receiptKeys,
      }
    })
    .filter(Boolean)
    .slice(0, 10)
}

export function buildQualityAuditContract(project: any = {}, contextPackage: any = {}) {
  const explicit = qualityAuditExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildQualityAuditContract(project, {
      ...(contextPackage || {}),
      quality_audit_contract: null,
      qualityAuditContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            quality_audit_contract: null,
            qualityAuditContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            quality_audit_contract: null,
            qualityAuditContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            quality_audit_contract: null,
            qualityAuditContract: null,
          }
        : contextPackage?.chapter_target,
    }) || {}
    const explicitStructureChecks = asArray(explicit.structure_checks || explicit.structureChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitChapterPurposeRules = asArray(explicit.chapter_purpose_rules || explicit.chapterPurposeRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitProgressionChecks = asArray(explicit.progression_checks || explicit.progressionChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitInformationChecks = asArray(explicit.information_checks || explicit.informationChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitEventContentRules = asArray(explicit.event_content_rules || explicit.eventContentRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitLongformChecks = asArray(explicit.longform_checks || explicit.longformChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitFiveDimensionRubric = asArray(explicit.five_dimension_rubric || explicit.fiveDimensionRubric).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitSellingPointExpressionRules = asArray(explicit.selling_point_expression_rules || explicit.sellingPointExpressionRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitChapterFocus = asArray(explicit.chapter_focus || explicit.chapterFocus).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitRevisionStrategies = asArray(explicit.revision_strategies || explicit.revisionStrategies).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitQualityChecks = asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitPhaseChecklist = normalizeQualityAuditPhaseChecklist(explicit.phase_checklist || explicit.phaseChecklist)
    const derivedPhaseChecklist = normalizeQualityAuditPhaseChecklist(derived.phase_checklist || derived.phaseChecklist)
    return {
      version: explicit.version || 'oh_story_quality_audit_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      structure_checks: explicitStructureChecks.length
        ? explicitStructureChecks
        : (asArray(derived.structure_checks).length ? asArray(derived.structure_checks) : OH_STORY_QUALITY_AUDIT_STRUCTURE_CHECKS),
      chapter_purpose_rules: explicitChapterPurposeRules.length
        ? explicitChapterPurposeRules
        : (asArray(derived.chapter_purpose_rules).length ? asArray(derived.chapter_purpose_rules) : OH_STORY_QUALITY_AUDIT_CHAPTER_PURPOSE_RULES),
      progression_checks: explicitProgressionChecks.length
        ? explicitProgressionChecks
        : (asArray(derived.progression_checks).length ? asArray(derived.progression_checks) : OH_STORY_QUALITY_AUDIT_PROGRESSION_CHECKS),
      information_checks: explicitInformationChecks.length
        ? explicitInformationChecks
        : (asArray(derived.information_checks).length ? asArray(derived.information_checks) : OH_STORY_QUALITY_AUDIT_INFORMATION_CHECKS),
      event_content_rules: explicitEventContentRules.length
        ? explicitEventContentRules
        : (asArray(derived.event_content_rules).length ? asArray(derived.event_content_rules) : OH_STORY_QUALITY_AUDIT_EVENT_CONTENT_RULES),
      longform_checks: explicitLongformChecks.length
        ? explicitLongformChecks
        : (asArray(derived.longform_checks).length ? asArray(derived.longform_checks) : OH_STORY_QUALITY_AUDIT_LONGFORM_CHECKS),
      five_dimension_rubric: explicitFiveDimensionRubric.length
        ? explicitFiveDimensionRubric
        : (asArray(derived.five_dimension_rubric).length ? asArray(derived.five_dimension_rubric) : OH_STORY_QUALITY_AUDIT_FIVE_DIMENSION_RUBRIC),
      selling_point_expression_rules: explicitSellingPointExpressionRules.length
        ? explicitSellingPointExpressionRules
        : (asArray(derived.selling_point_expression_rules).length ? asArray(derived.selling_point_expression_rules) : OH_STORY_QUALITY_AUDIT_SELLING_POINT_EXPRESSION_RULES),
      chapter_focus: explicitChapterFocus.length ? explicitChapterFocus : asArray(derived.chapter_focus),
      revision_strategies: explicitRevisionStrategies.length
        ? explicitRevisionStrategies
        : (asArray(derived.revision_strategies).length ? asArray(derived.revision_strategies) : OH_STORY_QUALITY_AUDIT_REVISION_STRATEGIES),
      quality_checks: explicitQualityChecks.length
        ? explicitQualityChecks
        : (asArray(derived.quality_checks).length ? asArray(derived.quality_checks) : OH_STORY_QUALITY_AUDIT_CHECKS),
      phase_checklist: explicitPhaseChecklist.length
        ? explicitPhaseChecklist
        : (derivedPhaseChecklist.length ? derivedPhaseChecklist : OH_STORY_QUALITY_AUDIT_PHASE_CHECKLIST),
    }
  }

  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  return {
    version: 'oh_story_quality_audit_v1',
    source: 'oh_story_embedded_fallback',
    structure_checks: OH_STORY_QUALITY_AUDIT_STRUCTURE_CHECKS,
    chapter_purpose_rules: OH_STORY_QUALITY_AUDIT_CHAPTER_PURPOSE_RULES,
    progression_checks: OH_STORY_QUALITY_AUDIT_PROGRESSION_CHECKS,
    information_checks: OH_STORY_QUALITY_AUDIT_INFORMATION_CHECKS,
    event_content_rules: OH_STORY_QUALITY_AUDIT_EVENT_CONTENT_RULES,
    longform_checks: OH_STORY_QUALITY_AUDIT_LONGFORM_CHECKS,
    five_dimension_rubric: OH_STORY_QUALITY_AUDIT_FIVE_DIMENSION_RUBRIC,
    selling_point_expression_rules: OH_STORY_QUALITY_AUDIT_SELLING_POINT_EXPRESSION_RULES,
    chapter_focus: buildQualityAuditChapterFocus(target, sceneCards),
    revision_strategies: OH_STORY_QUALITY_AUDIT_REVISION_STRATEGIES,
    quality_checks: OH_STORY_QUALITY_AUDIT_CHECKS,
    phase_checklist: OH_STORY_QUALITY_AUDIT_PHASE_CHECKLIST,
  }
}

