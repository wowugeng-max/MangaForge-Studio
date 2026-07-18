import { asArray, buildLLMResultDiagnostics, clampScore, extractLLMText, getNovelPayload, getSafetyPolicy, normalizeIssue, parseJsonLikePayload, safeJsonStringify } from '../novel-route-utils'
import {
  annotationKey,
  buildApprovalBlockerBrief,
  compactAuditText,
  countItems,
  countPayloadNumber,
  deliveryRiskMissedCount,
  deliveryRiskMissedMessage,
  deslopRepairReceiptCount,
  deslopRepairReceiptMessage,
  endingHookScore,
  hasWeakEndingHook,
  hasWeakOpeningHook,
  hasWeakPayoffDensity,
  hasWeakSceneProgression,
  latestAnnotationStatus,
  openingHandoffMisses,
  openingHookScore,
  payoffDensityScore,
  preDraftExecutionChecks,
  preDraftExecutionMessage,
  preDraftExecutionMissedRows,
  pushAnnotation,
  qualityAuditFailureChecks,
  qualityAuditMessage,
  qualityAuditRepairReceiptCount,
  qualityAuditRepairReceiptMessage,
  qualityAuditSeverity,
  qualityContractChecks,
  qualityContractMessage,
  qualityContractMissedRows,
  sceneCardDirectiveCheckKey,
  sceneCardReceiptAuditChecks,
  sceneCardReceiptAuditMessage,
  sceneReadabilityScore,
  sourceReadinessChecks,
  sourceReadinessMessage,
  sourceReadinessMissedRows,
  stateTrackingChecks,
  stateTrackingMessage,
  stateTrackingMissedRows,
  storyUnitSyncRiskCount,
} from './builders'

import {
  DELIVERY_RISK_ANNOTATION_CATEGORIES,
  annotationTaskTitle,
  deliveryRiskAnnotationPriority,
  existingReviewAnnotationRepairKeys,
  existingStorylineDiffDecisionTaskKeys
} from './builders-annotations'

export function buildReviewAnnotationRepairTasks(annotations: any[], runs: any[] = [], options: any = {}) {
  const existingKeys = existingReviewAnnotationRepairKeys(runs)
  const tasks: any[] = []
  let skippedExisting = 0
  let skippedResolved = 0
  const limit = Math.max(1, Math.min(120, Number(options.limit || 60)))

  for (const annotation of annotations || []) {
    if (!DELIVERY_RISK_ANNOTATION_CATEGORIES.has(String(annotation?.category || ''))) continue
    if (annotation.status === 'resolved') {
      skippedResolved += 1
      continue
    }
    const annotationKey = String(annotation.key || '').trim()
    if (annotationKey && existingKeys.has(annotationKey)) {
      skippedExisting += 1
      continue
    }
    const isApprovalBlocker = String(annotation.category || '') === 'approval_blocker'
    const isSceneCardReceipt = String(annotation.category || '') === 'scene_card_receipt'
    const isDeslopRepairReceipt = String(annotation.category || '') === 'deslop_repair_receipt'
    const isRevisionCascadeImpact = String(annotation.category || '') === 'revision_cascade_impact'
    const isRevisionScopeGuard = String(annotation.category || '') === 'revision_scope_guard'
    const isProseRevisionReceipt = String(annotation.category || '') === 'prose_revision_receipt'
    const isQualityAuditRepairReceipt = String(annotation.category || '') === 'quality_audit_repair_receipt'
    const isQualityAudit = String(annotation.category || '') === 'quality_audit'
    const isSourceReadiness = String(annotation.category || '') === 'source_readiness'
    const isStateTracking = String(annotation.category || '') === 'state_tracking'
    const isStyleBoundary = String(annotation.category || '') === 'style_boundary'
    const isInformationFlow = String(annotation.category || '') === 'information_flow'
    const isExpectationThreshold = String(annotation.category || '') === 'expectation_threshold'
    const isStoryLoop = String(annotation.category || '') === 'story_loop'
    const isEmotionalArc = String(annotation.category || '') === 'emotional_arc'
    const isChapterHook = String(annotation.category || '') === 'chapter_hook'
    const isParagraphHook = String(annotation.category || '') === 'paragraph_hook'
    const isSuspense = String(annotation.category || '') === 'suspense'
    const isAssetLinkage = String(annotation.category || '') === 'asset_linkage'
    const isDialogue = String(annotation.category || '') === 'dialogue'
    const isPlotDynamics = String(annotation.category || '') === 'plot_dynamics'
    const isCharacterRelation = String(annotation.category || '') === 'character_relation'
    const isCharacterBehavior = String(annotation.category || '') === 'character_behavior'
    const isConflictStructure = String(annotation.category || '') === 'conflict_structure'
    const isBridgeUnit = String(annotation.category || '') === 'bridge_unit'
    const isReversal = String(annotation.category || '') === 'reversal'
    const isShowdown = String(annotation.category || '') === 'showdown'
    const isOpening = String(annotation.category || '') === 'opening'
    const isProseCraft = String(annotation.category || '') === 'prose_craft'
    const isPunctuationTone = String(annotation.category || '') === 'punctuation_tone'
    const isContentRubric = String(annotation.category || '') === 'content_rubric'
    const isTargetReader = String(annotation.category || '') === 'target_reader'
    const isGenrePositioning = String(annotation.category || '') === 'genre_positioning'
    const isFemaleAudience = String(annotation.category || '') === 'female_audience'
    const isUpgradeRhythm = String(annotation.category || '') === 'upgrade_rhythm'
    const isChapterStructure = String(annotation.category || '') === 'chapter_structure'
    const isChapterProgression = String(annotation.category || '') === 'chapter_progression'
    const isInformationLoad = String(annotation.category || '') === 'information_load'
    const isLongformContinuity = String(annotation.category || '') === 'longform_continuity'
    const isCoreContract = String(annotation.category || '') === 'core_contract'
    const isContinuityHeat = String(annotation.category || '') === 'continuity_heat'
    const isRevisionReceipt = String(annotation.category || '') === 'revision_receipt'
    const isDeslopRepair = String(annotation.category || '') === 'deslop_repair'
    const isProseMeta = String(annotation.category || '') === 'prose_meta'
    const isSerialRiskRepair = String(annotation.category || '') === 'serial_risk_repair'
    const isChapterHookQuality = String(annotation.category || '') === 'chapter_hook_quality'
    const isReaderRetentionCheck = String(annotation.category || '') === 'reader_retention'
      && String(annotation.kind || '') === 'reader_retention_gap'
    const isIntentConfirmation = String(annotation.category || '') === 'intent_confirmation'
    const isBenchmarkRecall = String(annotation.category || '') === 'benchmark_recall'
    tasks.push({
      task_type: 'repair_quality',
      issue_type: String(annotation.kind || annotation.source || 'delivery_risk'),
      severity: annotation.severity || 'medium',
      chapter_id: annotation.chapter_id || null,
      chapter_no: Number(annotation.chapter_no || 0) || null,
      title: annotationTaskTitle(annotation),
      message: annotation.message || annotation.title || '交稿风险需要处理。',
      action: annotation.action || '按交稿风险批注修订正文，补回核心、追读、回报、创新、剧情线或可读性缺口。',
      acceptance_criteria: [
        ...(isApprovalBlocker ? ['入库阻断已经解除，章节可重新进入验收或入库'] : []),
        ...(isSceneCardReceipt ? [
          '场景回执复检清零，scene_card_receipt 相关质量检查不再失败',
          '对应场景的 scene_start_anchor、scene_end_anchor 和 scene_card_receipts 已按修订后正文重写',
          'scene_card_receipts.evidence 可在对应场景正文定位，且不得借用其他场景证据',
        ] : []),
        ...(isDeslopRepairReceipt ? [
          'deslop_repair_receipt_sync 复检通过，missed_count=0',
          'deslop_repair_receipts 逐条对应 deslop_checks 或 story-deslop Gate A-G 原 fail/warn 项',
          'deslop_repair_receipts.changed_evidence 能在修订后正文定位',
        ] : []),
        ...(isRevisionCascadeImpact ? [
          'revision_cascade_impact_sync 复检通过，missed_count=0',
          '后续章节已同步修订后的伏笔、时间线、角色状态、资产归属或关系边界',
          'revision_receipts.cascade_impacts 的 evidence/source_excerpt 能定位到修订后正文证据',
        ] : []),
        ...(isRevisionScopeGuard ? [
          'revision_scope_guard_sync 复检通过，missed_count=0',
          '修订前后字数差异回到 max(原文 30%, 800 字) 警戒线内',
          '没有为了润色大幅删掉伏笔、钩子、角色特征、情节推进或必要转折',
        ] : []),
        ...(isProseRevisionReceipt ? [
          'prose_revision_receipt_sync 复检通过，missed_count=0',
          'revision_receipts 逐条对应 delivery_risk_receipts 的失败项',
          '每条 revision_receipts 都写清 required_action、repair_segment、applied_fix 和 changed_evidence',
        ] : []),
        ...(isQualityAuditRepairReceipt ? [
          'quality_audit_repair_receipt_sync 复检通过，missed_count=0',
          'quality_audit_repair_receipts 逐条对应 quality_audit_checks 中原 fail/warn 项',
          'quality_audit_repair_receipts.changed_evidence 能在修订后正文定位',
        ] : []),
        ...(isQualityAudit ? [
          'quality_audit_checks 里的 fail/warn 项已清零',
          '修订说明中写明本章一句话概括、目的词详略、水文压缩、信息流或五维低分项的处理证据',
          '若策略为 rewrite/compress/de_ai/polish，修订稿已按对应策略完成且没有引入新设定漂移',
        ] : []),
        ...(isSourceReadiness ? [
          'source_readiness_checks 复检通过，missed_count=0',
          '角色状态、相关伏笔/前史、世界约束和资产状态已经在正文中可见承接',
          'missing/warn 来源没有被写成既定事实，ready 来源有明确动作、对白、信息变化或状态回填证据',
        ] : []),
        ...(isStateTracking ? [
          'state_tracking_checks 复检通过，missed_count=0',
          '角色状态、伏笔状态、资产归属、关系边界和世界规则已经与正文事实一致',
          '昏迷、失效、未获得、未揭示或受限状态没有被直接写成可用结果',
        ] : []),
        ...(isStyleBoundary ? [
          'style_boundary_checks 复检通过，missed_count=0',
          '过近的参照句式、桥段节奏、套话和模板化表达已经改写为本章动作链和角色口吻',
          '没有复制标杆原句、专有设定、角色名、核心梗或可识别桥段',
        ] : []),
        ...(isInformationFlow ? [
          'information_flow_checks 复检通过，missed_count=0',
          '线索、解释、误判、反转和信息揭示顺序已经跟冲突、动作、选择和代价同步释放',
          '没有提前泄底、补丁式旁白、上下文过载或把关键信息脱离场景冲突单独说明',
        ] : []),
        ...(isExpectationThreshold ? [
          'expectation_threshold_checks 复检通过，missed_count=0',
          '章末已经形成读者必须继续阅读的具体问题、悬念、代价、选择压力或回报承诺',
          '期待不是只靠氛围、旁白或口号维持，而是落到可见事件和下一章追问',
        ] : []),
        ...(isStoryLoop ? [
          'story_loop_checks 复检通过，missed_count=0',
          '本章设问、阻碍、选择、代价、回报和新问题形成可追踪闭环',
          '至少推进一个答案碎片或状态变化，并把残留问题自然挂到下一章',
        ] : []),
        ...(isEmotionalArc ? [
          'emotional_arc_checks 复检通过，missed_count=0',
          '平静、调动、释放、爽感形成可追踪递进，压迫和反制都落到正文现场',
          '关键情绪变化通过动作、对白、旁观反馈、关系反馈或状态变化外化，而不是只靠解释规则或心理总结',
        ] : []),
        ...(isChapterHook ? [
          'chapter_hook_checks 复检通过，missed_count=0',
          '前100字章首钩子和最后约100字章尾翻页钩子都已形成具体问题、压力或行动牵引',
          '钩子有明确兑现路径，没有假悬念、机械降神、低风险钩、过度留白或同类型连用',
        ] : []),
        ...(isParagraphHook ? [
          'paragraph_hook_checks 复检通过，missed_count=0',
          '每3-5段都有信息、风险、情绪或关系变化，关键冲突段落有可指认的微钩子',
          '段落级钩子包含钩子组合、对话情绪递进或围观者层级，不再连续停留在环境、姿态或静态说明',
        ] : []),
        ...(isSuspense ? [
          'suspense_checks 复检通过，missed_count=0',
          '疑问、误导、答案、新期待形成悬念循环',
          '悬念推进落到正文可见信息变化、误判修正、局部答案或新压力，避免假悬念、谜语人拖延和信息延迟过久',
        ] : []),
        ...(isAssetLinkage ? [
          'asset_linkage_checks 复检通过，missed_count=0',
          '关键资产已经绑定功能、归属、触发条件、限制、后果和状态变化',
          '每个资产至少接到本章目标、冲突、回报或章尾钩子之一，设定信息通过使用、质疑、触发、误判或代价反馈释放',
        ] : []),
        ...(isDialogue ? [
          'dialogue_checks 复检通过，missed_count=0',
          '每句对白至少承担推进剧情、增加期待或展示人设之一',
          '潜台词、议程、声线差异、权力博弈、信息嵌入和情绪递进已经落成正文可定位对白或动作反应',
        ] : []),
        ...(isPlotDynamics ? [
          'plot_dynamics_checks 复检通过，missed_count=0',
          '目标、阻碍、行动、代价/反馈、新期待形成可追踪最小剧情循环',
          '假胜、崩解、A/B情绪交替、多线错峰或悬置收尾等原缺口已落成正文可见行动链和状态变化',
        ] : []),
        ...(isCharacterRelation ? [
          'character_relation_checks 复检通过，missed_count=0',
          '关系类型、关系考验/变化、主角独立目标、目标归属、角色不止恋爱和配角主动行动已落成正文证据',
          '主角保留自己的诉求、主动选择和代价，关系线与主角目标形成摩擦、互补或阶段性变化',
        ] : []),
        ...(isCharacterBehavior ? [
          'character_behavior_checks 复检通过，missed_count=0',
          '动机链、动机具体性、主角行为三必须、三层标签反差、人设强关联和展示证据已落成正文',
          '配角功能、反派内在逻辑、反派分量、自我叙事或层级退场等原缺口已补成可定位行动、选择、威胁或代价',
        ] : []),
        ...(isConflictStructure ? [
          'conflict_structure_checks 复检通过，missed_count=0',
          '阻止者、有进无出、退出代价/死亡赌注、黏结剂、行动阻拦和明确胜负结果已落成正文',
          '矛盾网保持2-3条互相关联的矛盾线，解决一条后已激活或加深另一条，并留下下一冲突种子',
        ] : []),
        ...(isBridgeUnit ? [
          'bridge_unit_checks 复检通过，missed_count=0',
          '本章四章一桥段位置、连续期待、目标推进、高潮时长和阶段衔接已经落成正文',
          '兑现旧期待前先挂新期待；章尾有新目标、高潮中埋钩子或连续小期待，疲劳修复不再断档',
        ] : []),
        ...(isReversal ? [
          'reversal_checks 复检通过，missed_count=0',
          '反转类型、至少3处公平暗示、误导技巧、揭示时机和非作弊性已经落成正文',
          '揭示后影响、情绪冲击和打脸节奏可定位，且没有天降反转、作弊新信息或大段解释独白',
        ] : []),
        ...(isShowdown ? [
          'showdown_checks 复检通过，missed_count=0',
          '爽点释放、底牌管理、三压一爆三震、舞台层级、传递通道和震惊分层已经落成正文',
          '战斗/智斗服务爽点，以弱胜强逻辑、三层破局和急-缓-急情绪节奏可定位',
        ] : []),
        ...(isOpening ? [
          'opening_checks 复检通过，missed_count=0',
          '300字内主角登场，1000字内出现爽点、危机或明确期待点',
          '开头五要诀（简单、不偏、快、爽、不平）已落成正文，且删除大段背景、纯天气风景、序章楔子和详细世界观',
        ] : []),
        ...(isProseCraft ? [
          'prose_craft_checks 复检通过，missed_count=0',
          '深度限知、身体细节、环境交互、镜头对象、一动一静和道具/数字功能已落成正文',
          '删除上帝视角、全场/所有人远景概括、连续内心独白、堆叠式描写、抽象心理总结和胶水词过渡',
        ] : []),
        ...(isPunctuationTone ? [
          'punctuation_tone_checks 复检通过，missed_count=0',
          '标点服务质问、试探、爆发、迟疑、信息揭示和人物声线，不再通篇句号化或随机堆砌',
          '删除省略号/破折号硬停顿、论文式长分号链和同质化语气，用动作打断、换行、短句或冒号落点承接',
        ] : []),
        ...(isContentRubric ? [
          'content_rubric_checks 复检通过，missed_count=0',
          '正文已经回答黄金三问：读者为什么翻下一页、本章改变了什么、哪个正文证据支持判断',
          '核心卖点、冲突推进、情绪曲线、角色动机、最小剧情循环、高潮构建和章末期待已落成可定位正文证据',
        ] : []),
        ...(isTargetReader ? [
          'target_reader_checks 复检通过，missed_count=0',
          '目标读者画像、读者渴望、平台口味、本章命中点和可见读者回报已经落成正文证据',
          '核心痛苦、深层情结、高频情绪关键词和未满足需求已经写成冲突压力、角色选择、即时反馈或尊严/安全感/掌控感补偿',
          '修订稿通过 oh-story 自嗨判定法：写给谁看、读者想看什么、本章给了什么，三问都有正文证据',
        ] : []),
        ...(isGenrePositioning ? [
          'genre_positioning_checks 复检通过，missed_count=0',
          '题材标签、核心梗、类型公式、金手指贴合、必备场景和平台适配已经落成正文证据',
          '题材长板被强化而不是补短板稀释核心卖点，同一卖点至少扩成 3 个角度的正文证据',
          '书名简介正文三位一体：正文兑现书名/简介承诺，没有挂羊头卖狗肉或微创新过量',
        ] : []),
        ...(isFemaleAudience ? [
          'female_audience_checks 复检通过，missed_count=0',
          '安全感、代入感、女主主动性、主情绪和平台对位已经落成正文证据',
          '女主自己做决定、自己推进，并在关键节点承担代价或获得被认可、被珍视、被尊重的回馈',
          '感情线双轴踩在事业/成长节点上，虐后有反转或糖，货板与书名简介正文保持一致',
        ] : []),
        ...(isUpgradeRhythm ? [
          'upgrade_rhythm_checks 复检通过，missed_count=0',
          '升级前压制、升级后变化、即时反馈、延迟反馈和新门槛已经落成正文可定位证据',
          '金手指功能、触发条件、奖励、限制和升级规则足够简单，读者能从动作反馈中一眼看懂',
          '升级不是只给奖励，而是同时带来资格变化、能力边界、多维成长或排行榜/层级压力',
        ] : []),
        ...(isChapterStructure ? [
          'structure_checks 复检通过，missed_count=0',
          '开头钩子、中段推进、局势变化和章尾翻页已经落成正文可定位证据',
          '结尾落到新的发现、危机、选择或反转，而不是复述、解释或总结',
        ] : []),
        ...(isChapterProgression ? [
          'progression_checks 复检通过，missed_count=0',
          '修订稿能证明删掉这章会影响理解，至少留下证据、选择、代价、关系变化、设定位移或主线位移之一',
          '等待、旧设定复述、原地解释和不改变局势的段落已经压缩或改造成行动推进',
        ] : []),
        ...(isInformationLoad ? [
          'information_checks 复检通过，missed_count=0',
          '新概念压缩到 3 个以内，设定信息通过行动、质疑、触发、证据核对或冲突反馈释放',
          '没有在行动前大段解释规则，信息传递跟着冲突和角色目标走',
        ] : []),
        ...(isLongformContinuity ? [
          'longform_checks 复检通过，missed_count=0',
          '最近 5 章进展、爽点间隔、阶段目标和下一阶段牵引已经在正文或修订说明中可定位',
          '本章承接前文状态并推动后续，不再连续多章只解释背景或原地等待',
        ] : []),
        ...(isCoreContract ? [
          'core_contract_checks 复检通过，missed_count=0',
          '全书核心承诺、主线服务、不得漂移红线和主题统一已经落成正文可定位证据',
          '小情绪服从全书核心情绪，章尾问题回到主线推进、规则判定、角色选择或读者承诺',
        ] : []),
        ...(isContinuityHeat ? [
          'continuity_heat_checks 复检通过，missed_count=0',
          'hot 元素推进、warm 元素保温、cold 回收前升温、archived 休眠边界已经落成正文证据',
          '伏笔、关系和期待不再只点名不推进，也没有用未升温的冷线突然解题',
        ] : []),
        ...(isRevisionReceipt ? [
          'revision_receipt_checks 复检通过，missed_count=0',
          'revision_receipts 逐条对应 delivery_risk_receipts、prose revision 要求或本次修订风险',
          '每条 revision_receipts 都包含 required_action、repair_segment、applied_fix 和可定位的 changed_evidence',
        ] : []),
        ...(isDeslopRepair ? [
          'deslop_repair_checks 复检通过，missed_count=0',
          'story-deslop Gate A-G 原 fail/warn 残留已经逐条回修',
          'deslop_repair_receipts.changed_evidence 能在修订后正文中定位到对白、动作、描写或叙述变化',
        ] : []),
        ...(isProseMeta ? [
          'prose_meta_checks 复检通过，missed_count=0',
          '正文中的作者说明、创作术语、章节意图旁白和元叙事提示已经删除',
          '原本的铺垫、伏笔或反转说明已经改成角色现场证据、误判、行动后果或信息变化',
        ] : []),
        ...(isSerialRiskRepair ? [
          'serial_risk_repair_checks 复检通过，missed_count=0',
          'scene_serial_risk_repair_receipt 或连续生产风险修复回执已经补齐',
          '场景承接变化、状态变化或风险解除证据能在修订后正文定位',
        ] : []),
        ...(isChapterHookQuality ? [
          'chapter_hook_quality_checks 复检通过，missed_count=0',
          '章首和章尾都已经形成现场触发的具体问题、压力、选择或行动牵引',
          '章尾钩子和下一章行动直接相连，没有只用总结、氛围或空泛预告收束',
        ] : []),
        ...(isReaderRetentionCheck ? [
          'reader_retention_checks 复检通过，missed_count=0',
          '前300字钩子、可见爽点、信息缺口和章末追读已经落成正文可定位证据',
          '留存双引擎的情绪 + 饥饿同时落地：情绪快速代入，饥饿用信息差植入问号并剥洋葱卡住关键信息',
          'Hook上瘾模型的触发、行动、奖励、投入已经形成闭环，奖励随机性和沉没投入有正文证据',
        ] : []),
        ...(isIntentConfirmation ? [
          'intent_confirmation_checks 或写前执行回执复检通过，missed_count=0',
          '情绪目标、章节意图、关键承接和章尾推动力已落成正文可见事件或状态变化',
          'oh_story_delivery_receipts.delivery_risk_receipts 或 pre_draft_execution_receipts 引用修订后正文证据',
        ] : []),
        ...(isBenchmarkRecall ? [
          'benchmark_recall_checks 或文风召回回执复检通过，missed_count=0',
          '对标模块、节奏参照、对白比例、动作链和情绪转折已在正文中兑现',
          '没有复制参照文本原句、桥段、专有设定、角色名或核心梗',
        ] : []),
        '修订后重新运行章节质量复检，质量分不低于78',
        '重新同步故事状态，确认核心、追读、回报、创新、剧情线和可读性风险没有新增',
        '交稿风险批注标记为已处理，或风险收敛复盘显示该风险清零',
      ],
      task_status: 'open',
      source: 'review_annotation_risk',
      annotation_key: annotationKey,
      annotation_source: annotation.source,
      annotation_category: annotation.category,
      source_label: annotation.source_label,
      review_id: annotation.review_id || null,
      created_from_annotation_at: annotation.created_at || '',
      payload: annotation.payload || {},
      ...(isSourceReadiness ? { source_readiness_sync: annotation.payload || {} } : {}),
      ...(isStateTracking ? { state_tracking_sync: annotation.payload || {} } : {}),
      ...(isStyleBoundary ? { style_boundary_sync: annotation.payload || {} } : {}),
      ...(isInformationFlow ? { information_flow_sync: annotation.payload || {} } : {}),
      ...(isExpectationThreshold ? { expectation_threshold_sync: annotation.payload || {} } : {}),
      ...(isStoryLoop ? { story_loop_sync: annotation.payload || {} } : {}),
      ...(isEmotionalArc ? { emotional_arc_sync: annotation.payload || {} } : {}),
      ...(isChapterHook ? { chapter_hook_sync: annotation.payload || {} } : {}),
      ...(isParagraphHook ? { paragraph_hook_sync: annotation.payload || {} } : {}),
      ...(isSuspense ? { suspense_sync: annotation.payload || {} } : {}),
      ...(isAssetLinkage ? { asset_linkage_sync: annotation.payload || {} } : {}),
      ...(isDialogue ? { dialogue_sync: annotation.payload || {} } : {}),
      ...(isPlotDynamics ? { plot_dynamics_sync: annotation.payload || {} } : {}),
      ...(isCharacterRelation ? { character_relation_sync: annotation.payload || {} } : {}),
      ...(isCharacterBehavior ? { character_behavior_sync: annotation.payload || {} } : {}),
      ...(isConflictStructure ? { conflict_structure_sync: annotation.payload || {} } : {}),
      ...(isBridgeUnit ? { bridge_unit_sync: annotation.payload || {} } : {}),
      ...(isReversal ? { reversal_sync: annotation.payload || {} } : {}),
      ...(isShowdown ? { showdown_sync: annotation.payload || {} } : {}),
      ...(isOpening ? { opening_sync: annotation.payload || {} } : {}),
      ...(isProseCraft ? { prose_craft_sync: annotation.payload || {} } : {}),
      ...(isPunctuationTone ? { punctuation_tone_sync: annotation.payload || {} } : {}),
      ...(isContentRubric ? { content_rubric_sync: annotation.payload || {} } : {}),
      ...(isTargetReader ? { target_reader_sync: annotation.payload || {} } : {}),
      ...(isGenrePositioning ? { genre_positioning_sync: annotation.payload || {} } : {}),
      ...(isFemaleAudience ? { female_audience_sync: annotation.payload || {} } : {}),
      ...(isUpgradeRhythm ? { upgrade_rhythm_sync: annotation.payload || {} } : {}),
      ...(isChapterStructure ? { chapter_structure_sync: annotation.payload || {} } : {}),
      ...(isChapterProgression ? { chapter_progression_sync: annotation.payload || {} } : {}),
      ...(isInformationLoad ? { information_load_sync: annotation.payload || {} } : {}),
      ...(isLongformContinuity ? { longform_continuity_sync: annotation.payload || {} } : {}),
      ...(isCoreContract ? { core_contract_check_sync: annotation.payload || {} } : {}),
      ...(isContinuityHeat ? { continuity_heat_sync: annotation.payload || {} } : {}),
      ...(isRevisionReceipt ? { revision_receipt_check_sync: annotation.payload || {} } : {}),
      ...(isDeslopRepair ? { deslop_repair_check_sync: annotation.payload || {} } : {}),
      ...(isProseMeta ? { prose_meta_sync: annotation.payload || {} } : {}),
      ...(isSerialRiskRepair ? { serial_risk_repair_sync: annotation.payload || {} } : {}),
      ...(isChapterHookQuality ? { chapter_hook_quality_sync: annotation.payload || {} } : {}),
      ...(isReaderRetentionCheck ? { reader_retention_check_sync: annotation.payload || {} } : {}),
      ...(isIntentConfirmation ? { intent_confirmation_sync: annotation.payload || {} } : {}),
      ...(isBenchmarkRecall ? { benchmark_recall_sync: annotation.payload || {} } : {}),
      ...(String(annotation.kind || annotation.source || '') === 'recovery_evidence_mismatch'
        ? { recovery_evidence_review: annotation.payload || {} }
        : {}),
    })
  }

  tasks.sort((a, b) => deliveryRiskAnnotationPriority({ category: a.annotation_category }) - deliveryRiskAnnotationPriority({ category: b.annotation_category })
    || String(b.created_from_annotation_at || '').localeCompare(String(a.created_from_annotation_at || '')))

  return {
    tasks: tasks.slice(0, limit),
    total_candidates: tasks.length,
    skipped_existing: skippedExisting,
    skipped_resolved: skippedResolved,
  }
}

export function buildStorylineDiffDecisionRepairTasks(reviews: any[], runs: any[] = [], options: any = {}) {
  const existingKeys = existingStorylineDiffDecisionTaskKeys(runs)
  const tasks: any[] = []
  let skippedExisting = 0
  let skippedIgnored = 0
  const limit = Math.max(1, Math.min(120, Number(options.limit || 60)))

  for (const review of reviews || []) {
    if (review?.review_type !== 'storyline_diff_decision') continue
    const payload = parseJsonLikePayload(review.payload) || {}
    const decision = String(payload.decision || '').trim()
    const decisionKey = String(payload.decision_key || '').trim()
    if (!decisionKey) continue
    if (decision === 'false_positive') {
      skippedIgnored += 1
      continue
    }
    if (!['revise_prose', 'accept_as_plan'].includes(decision)) continue
    if (existingKeys.has(decisionKey)) {
      skippedExisting += 1
      continue
    }
    const chapterNo = Number(payload.chapter_no || 0) || null
    const entityName = compactAuditText(payload.entity_name || '未命名剧情线', 120)
    const summary = compactAuditText(payload.summary || review.summary || '剧情线差异需要处理。', 500)
    const isPlanSync = decision === 'accept_as_plan'
    tasks.push({
      task_type: isPlanSync ? 'repair_assets' : 'repair_quality',
      issue_type: isPlanSync ? 'storyline_diff_accept_as_plan' : 'storyline_diff_revise_prose',
      severity: isPlanSync ? 'medium' : 'high',
      chapter_id: Number(payload.chapter_id || 0) || null,
      chapter_no: chapterNo,
      title: `${chapterNo ? `第${chapterNo}章` : '章节'}《${entityName}》${isPlanSync ? '同步计划' : '回修正文'}`,
      message: summary,
      action: isPlanSync
        ? `接受为新计划：打开资料设定，把“${entityName}”的额外推进写入剧情线计划，并调整后续章节承接。`
        : `回修正文：按已记录决策修订第${chapterNo || '-'}章，把“${entityName}”的计划推进写成可见行动、状态变化或结果回收。`,
      acceptance_criteria: isPlanSync
        ? [
          '资料设定或大纲已纳入这次额外推进，并明确后续承接章节',
          '重新运行剧情线同步复盘，确认该推进不再作为计划外风险出现',
          '确认新计划不破坏全书核心承诺、禁揭边界和当前卷爆点节奏',
        ]
        : [
          '修订后重新运行章节质量复检，质量分不低于78',
          '修订后重新运行剧情线同步复盘，确认漏推或禁揭风险清零',
          '重新同步故事状态，确认主线、伏笔和禁揭边界没有新增偏移',
        ],
      task_status: 'open',
      source: 'storyline_diff_decision',
      decision_key: decisionKey,
      decision,
      decision_label: payload.decision_label || (isPlanSync ? '接受为新计划' : '回修正文'),
      entity_id: Number(payload.entity_id || 0) || null,
      entity_name: entityName,
      entity_type: compactAuditText(payload.entity_type, 80),
      risk_type: compactAuditText(payload.risk_type, 80),
      risk_label: compactAuditText(payload.risk_label, 80),
      review_id: review.id || null,
      created_from_decision_at: review.created_at || payload.decided_at || '',
      payload,
    })
  }

  tasks.sort((a, b) => (a.decision === 'revise_prose' ? 0 : 1) - (b.decision === 'revise_prose' ? 0 : 1)
    || Number(a.chapter_no || 999999) - Number(b.chapter_no || 999999)
    || String(b.created_from_decision_at || '').localeCompare(String(a.created_from_decision_at || '')))

  return {
    tasks: tasks.slice(0, limit),
    total_candidates: tasks.length + skippedExisting,
    skipped_existing: skippedExisting,
    skipped_ignored: skippedIgnored,
  }
}
