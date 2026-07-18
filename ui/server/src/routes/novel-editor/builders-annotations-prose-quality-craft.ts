import {
  pushAnnotation,
  qualityContractChecks,
  qualityContractMessage,
  qualityContractMissedRows,
  sceneCardDirectiveCheckKey,
} from './builders'
import type { ProseQualityAnnotationContext } from './builders-annotations-prose-quality-types'

export function appendProseQualityCraftAnnotations(ctx: ProseQualityAnnotationContext) {
  const { review, payload, items, statuses, resolveChapter, pushReviewIssues, pushDeliveryRiskAnnotation, reviewPayload } = ctx
    const emotionalArcFailureChecks = qualityContractChecks(payload, 'emotional_arc_checks', 'emotionalArcChecks')
    if (emotionalArcFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = emotionalArcFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '情绪弧',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'emotional_arc_gap',
        severity: 'high',
        category: 'emotional_arc',
        title: `情绪弧缺口 ${emotionalArcFailureChecks.length}`,
        message: qualityContractMessage(emotionalArcFailureChecks, '情绪弧检查存在未清 fail/warn 项。'),
        action: '按 emotional_arc_checks 回修正文：把平静、调动、释放、爽感写成可追踪递进；压迫必须落到现场选择，反制必须通过动作、对白、旁观反馈或状态变化外化。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `情绪弧缺口 ${emotionalArcFailureChecks.length}`,
          missed_count: emotionalArcFailureChecks.length,
          missed: qualityContractMissedRows(emotionalArcFailureChecks),
          checks: emotionalArcFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const chapterHookFailureChecks = qualityContractChecks(payload, 'chapter_hook_checks', 'chapterHookChecks')
    if (chapterHookFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = chapterHookFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '章级钩子',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'chapter_hook_gap',
        severity: 'high',
        category: 'chapter_hook',
        title: `章级钩子缺口 ${chapterHookFailureChecks.length}`,
        message: qualityContractMessage(chapterHookFailureChecks, '章级钩子检查存在未清 fail/warn 项。'),
        action: '按 chapter_hook_checks 回修正文：重做前100字章首钩子和最后约100字章尾翻页钩子；钩子必须形成具体问题、压力、兑现路径或下一章行动，不得是假悬念、低风险钩或机械降神。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `章级钩子缺口 ${chapterHookFailureChecks.length}`,
          missed_count: chapterHookFailureChecks.length,
          missed: qualityContractMissedRows(chapterHookFailureChecks),
          checks: chapterHookFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const paragraphHookFailureChecks = qualityContractChecks(payload, 'paragraph_hook_checks', 'paragraphHookChecks')
    if (paragraphHookFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = paragraphHookFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '段落级钩子',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'paragraph_hook_gap',
        severity: 'high',
        category: 'paragraph_hook',
        title: `段落级钩子缺口 ${paragraphHookFailureChecks.length}`,
        message: qualityContractMessage(paragraphHookFailureChecks, '段落级钩子检查存在未清 fail/warn 项。'),
        action: '按 paragraph_hook_checks 回修正文：每3-5段必须出现信息、风险、情绪或关系变化；补段落级钩子11种、钩子组合、对话情绪递进和围观者层级，修掉假悬念、低风险钩和同类型连用。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `段落级钩子缺口 ${paragraphHookFailureChecks.length}`,
          missed_count: paragraphHookFailureChecks.length,
          missed: qualityContractMissedRows(paragraphHookFailureChecks),
          checks: paragraphHookFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const suspenseFailureChecks = qualityContractChecks(payload, 'suspense_checks', 'suspenseChecks')
    if (suspenseFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = suspenseFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '悬念编排',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'suspense_gap',
        severity: 'high',
        category: 'suspense',
        title: `悬念编排缺口 ${suspenseFailureChecks.length}`,
        message: qualityContractMessage(suspenseFailureChecks, '悬念编排检查存在未清 fail/warn 项。'),
        action: '按 suspense_checks 回修正文：补疑问、误导、答案和新期待的悬念循环；先提出具体问题，再给可信提示或误导，公布局部答案后立起新期待，避免假悬念、谜语人拖延和信息延迟过久。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `悬念编排缺口 ${suspenseFailureChecks.length}`,
          missed_count: suspenseFailureChecks.length,
          missed: qualityContractMissedRows(suspenseFailureChecks),
          checks: suspenseFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const assetLinkageFailureChecks = qualityContractChecks(payload, 'asset_linkage_checks', 'assetLinkageChecks')
    if (assetLinkageFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = assetLinkageFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '资产挂钩',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'asset_linkage_gap',
        severity: 'high',
        category: 'asset_linkage',
        title: `资产挂钩缺口 ${assetLinkageFailureChecks.length}`,
        message: qualityContractMessage(assetLinkageFailureChecks, '资产挂钩检查存在未清 fail/warn 项。'),
        action: '按 asset_linkage_checks 回修正文：消灭孤立资产，让关键资产绑定功能、归属、触发条件、限制、后果和状态变化；每个资产至少接到本章目标、冲突、回报或章尾钩子之一，设定信息必须随使用、质疑、触发、误判或代价反馈释放。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `资产挂钩缺口 ${assetLinkageFailureChecks.length}`,
          missed_count: assetLinkageFailureChecks.length,
          missed: qualityContractMissedRows(assetLinkageFailureChecks),
          checks: assetLinkageFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const dialogueFailureChecks = qualityContractChecks(payload, 'dialogue_checks', 'dialogueChecks')
    if (dialogueFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = dialogueFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '对白质量',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'dialogue_gap',
        severity: 'high',
        category: 'dialogue',
        title: `对白质量缺口 ${dialogueFailureChecks.length}`,
        message: qualityContractMessage(dialogueFailureChecks, '对白质量检查存在未清 fail/warn 项。'),
        action: '按 dialogue_checks 回修正文：让每句对白承担推进剧情、增加期待或展示人设之一；补潜台词、议程、声线差异、权力博弈、信息嵌入和情绪递进，把说明书式对白改成借口、试探、回避、动作反应或信息差拉扯。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `对白质量缺口 ${dialogueFailureChecks.length}`,
          missed_count: dialogueFailureChecks.length,
          missed: qualityContractMissedRows(dialogueFailureChecks),
          checks: dialogueFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const plotDynamicsFailureChecks = qualityContractChecks(payload, 'plot_dynamics_checks', 'plotDynamicsChecks')
    if (plotDynamicsFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = plotDynamicsFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '剧情动力',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'plot_dynamics_gap',
        severity: 'high',
        category: 'plot_dynamics',
        title: `剧情动力缺口 ${plotDynamicsFailureChecks.length}`,
        message: qualityContractMessage(plotDynamicsFailureChecks, '剧情动力检查存在未清 fail/warn 项。'),
        action: '按 plot_dynamics_checks 回修正文：补目标、阻碍、行动、代价/反馈、新期待的最小剧情循环；需要时重构假胜、崩解、A/B情绪交替、多线错峰或悬置收尾，让本章推进变成可见行动链。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `剧情动力缺口 ${plotDynamicsFailureChecks.length}`,
          missed_count: plotDynamicsFailureChecks.length,
          missed: qualityContractMissedRows(plotDynamicsFailureChecks),
          checks: plotDynamicsFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const characterRelationFailureChecks = qualityContractChecks(payload, 'character_relation_checks', 'characterRelationChecks')
    if (characterRelationFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = characterRelationFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '角色关系',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'character_relation_gap',
        severity: 'high',
        category: 'character_relation',
        title: `角色关系缺口 ${characterRelationFailureChecks.length}`,
        message: qualityContractMessage(characterRelationFailureChecks, '角色关系检查存在未清 fail/warn 项。'),
        action: '按 character_relation_checks 回修正文：补关系类型、关系考验/变化、主角独立目标、目标归属、角色不止恋爱、配角期待枢纽、配角主动行动、态度变化和阶段匹配；主角必须保留自己的诉求、主动选择和代价，关系线要让目标摩擦或互补。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `角色关系缺口 ${characterRelationFailureChecks.length}`,
          missed_count: characterRelationFailureChecks.length,
          missed: qualityContractMissedRows(characterRelationFailureChecks),
          checks: characterRelationFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const characterBehaviorFailureChecks = qualityContractChecks(payload, 'character_behavior_checks', 'characterBehaviorChecks')
    if (characterBehaviorFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = characterBehaviorFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '角色行为',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'character_behavior_gap',
        severity: 'high',
        category: 'character_behavior',
        title: `角色行为缺口 ${characterBehaviorFailureChecks.length}`,
        message: qualityContractMessage(characterBehaviorFailureChecks, '角色行为检查存在未清 fail/warn 项。'),
        action: '按 character_behavior_checks 回修正文：补主角行为三必须、动机链、动机具体性、三层标签反差、人设强关联、展示优于告知、记忆锚点、配角功能、反派内在逻辑、反派分量、反派自我叙事和反派层级退场；动机必须落到具体事件、情感理由、触发变化和代价。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `角色行为缺口 ${characterBehaviorFailureChecks.length}`,
          missed_count: characterBehaviorFailureChecks.length,
          missed: qualityContractMissedRows(characterBehaviorFailureChecks),
          checks: characterBehaviorFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const coreContractFailureChecks = qualityContractChecks(payload, 'core_contract_checks', 'coreContractChecks')
    if (coreContractFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = coreContractFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '核心契约',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'core_contract_gap',
        severity: 'high',
        category: 'core_contract',
        title: `核心契约缺口 ${coreContractFailureChecks.length}`,
        message: qualityContractMessage(coreContractFailureChecks, '核心契约检查存在未清 fail/warn 项。'),
        action: '按 core_contract_checks 回修正文：守住全书核心承诺、主线服务、不得漂移红线和主题统一；把 repair_focus 写成可见事件、角色选择、代价、规则判定、主线推进或章末问题，小情绪必须服从全书核心情绪。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `核心契约缺口 ${coreContractFailureChecks.length}`,
          missed_count: coreContractFailureChecks.length,
          missed: qualityContractMissedRows(coreContractFailureChecks),
          checks: coreContractFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const revisionReceiptFailureChecks = qualityContractChecks(payload, 'revision_receipt_checks', 'revisionReceiptChecks')
    if (revisionReceiptFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = revisionReceiptFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '修订回执',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'revision_receipt_gap',
        severity: 'high',
        category: 'revision_receipt',
        title: `修订回执缺口 ${revisionReceiptFailureChecks.length}`,
        message: qualityContractMessage(revisionReceiptFailureChecks, '修订回执检查存在未清 fail/warn 项。'),
        action: '按 revision_receipt_checks 回修：逐条对齐 delivery_risk_receipts、prose revision 要求和实际改动，补齐 revision_receipts.required_action、repair_segment、applied_fix、changed_evidence；changed_evidence 必须能在修订后正文定位。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `修订回执缺口 ${revisionReceiptFailureChecks.length}`,
          missed_count: revisionReceiptFailureChecks.length,
          missed: qualityContractMissedRows(revisionReceiptFailureChecks),
          checks: revisionReceiptFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const deslopRepairFailureChecks = qualityContractChecks(payload, 'deslop_repair_checks', 'deslopRepairChecks')
    if (deslopRepairFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = deslopRepairFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '去AI味修复',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'deslop_repair_gap',
        severity: 'high',
        category: 'deslop_repair',
        title: `去AI味修复缺口 ${deslopRepairFailureChecks.length}`,
        message: qualityContractMessage(deslopRepairFailureChecks, '去AI味修复检查存在未清 fail/warn 项。'),
        action: '按 deslop_repair_checks 回修：逐条处理 story-deslop Gate A-G 残留，重写模板化对白、抽象心理、堆叠描写或AI腔，并在 deslop_repair_receipts.changed_evidence 中引用修订后正文证据。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `去AI味修复缺口 ${deslopRepairFailureChecks.length}`,
          missed_count: deslopRepairFailureChecks.length,
          missed: qualityContractMissedRows(deslopRepairFailureChecks),
          checks: deslopRepairFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const proseMetaFailureChecks = qualityContractChecks(payload, 'prose_meta_checks', 'proseMetaChecks')
    if (proseMetaFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = proseMetaFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '正文元叙事',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'prose_meta_gap',
        severity: 'high',
        category: 'prose_meta',
        title: `正文元叙事缺口 ${proseMetaFailureChecks.length}`,
        message: qualityContractMessage(proseMetaFailureChecks, '正文元叙事检查存在未清 fail/warn 项。'),
        action: '按 prose_meta_checks 回修正文：删除作者说明、创作术语、章节意图旁白和元叙事提示，把铺垫、反转、伏笔和解释改成角色现场证据、误判、行动后果或可定位信息变化。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `正文元叙事缺口 ${proseMetaFailureChecks.length}`,
          missed_count: proseMetaFailureChecks.length,
          missed: qualityContractMissedRows(proseMetaFailureChecks),
          checks: proseMetaFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const serialRiskRepairFailureChecks = qualityContractChecks(payload, 'serial_risk_repair_checks', 'serialRiskRepairChecks')
    if (serialRiskRepairFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = serialRiskRepairFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '连续风险修复',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'serial_risk_repair_gap',
        severity: 'high',
        category: 'serial_risk_repair',
        title: `连续风险修复缺口 ${serialRiskRepairFailureChecks.length}`,
        message: qualityContractMessage(serialRiskRepairFailureChecks, '连续风险修复检查存在未清 fail/warn 项。'),
        action: '按 serial_risk_repair_checks 回修正文：补齐安全批量、场景承接、连续生产风险的修复回执，并把场景承接变化、状态变化或风险解除证据落到正文可定位内容。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `连续风险修复缺口 ${serialRiskRepairFailureChecks.length}`,
          missed_count: serialRiskRepairFailureChecks.length,
          missed: qualityContractMissedRows(serialRiskRepairFailureChecks),
          checks: serialRiskRepairFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const chapterHookQualityFailureChecks = qualityContractChecks(payload, 'chapter_hook_quality_checks', 'chapterHookQualityChecks')
    if (chapterHookQualityFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = chapterHookQualityFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '章钩质量',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'chapter_hook_quality_gap',
        severity: 'high',
        category: 'chapter_hook_quality',
        title: `章钩质量缺口 ${chapterHookQualityFailureChecks.length}`,
        message: qualityContractMessage(chapterHookQualityFailureChecks, '章钩质量检查存在未清 fail/warn 项。'),
        action: '按 chapter_hook_quality_checks 回修正文：章首必须用现场异常、危险、选择、冲突、对话逼问或规则触发拉住读者；章尾必须留下具体问题、危险、发现、选择或下一章行动压力，并和后续行动直接相连。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `章钩质量缺口 ${chapterHookQualityFailureChecks.length}`,
          missed_count: chapterHookQualityFailureChecks.length,
          missed: qualityContractMissedRows(chapterHookQualityFailureChecks),
          checks: chapterHookQualityFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const continuityHeatFailureChecks = qualityContractChecks(payload, 'continuity_heat_checks', 'continuityHeatChecks')
    if (continuityHeatFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = continuityHeatFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '连续性热度',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'continuity_heat_gap',
        severity: 'high',
        category: 'continuity_heat',
        title: `连续性热度缺口 ${continuityHeatFailureChecks.length}`,
        message: qualityContractMessage(continuityHeatFailureChecks, '连续性热度检查存在未清 fail/warn 项。'),
        action: '按 continuity_heat_checks 回修正文：hot 元素必须推进，warm 元素必须有效触达，cold 回收前必须升温，archived 不得误激活；避免只点名伏笔、只说以后再说或让休眠线突然解题。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `连续性热度缺口 ${continuityHeatFailureChecks.length}`,
          missed_count: continuityHeatFailureChecks.length,
          missed: qualityContractMissedRows(continuityHeatFailureChecks),
          checks: continuityHeatFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const conflictStructureFailureChecks = qualityContractChecks(payload, 'conflict_structure_checks', 'conflictStructureChecks')
    if (conflictStructureFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = conflictStructureFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '冲突结构',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'conflict_structure_gap',
        severity: 'high',
        category: 'conflict_structure',
        title: `冲突结构缺口 ${conflictStructureFailureChecks.length}`,
        message: qualityContractMessage(conflictStructureFailureChecks, '冲突结构检查存在未清 fail/warn 项。'),
        action: '按 conflict_structure_checks 回修正文：补阻止者、有进无出、死亡赌注/退出代价、黏结剂、言语到行动再到激烈对抗的升级阶梯、明确胜负结果、压势不压人、主角主动破局、矛盾网和下一冲突种子。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `冲突结构缺口 ${conflictStructureFailureChecks.length}`,
          missed_count: conflictStructureFailureChecks.length,
          missed: qualityContractMissedRows(conflictStructureFailureChecks),
          checks: conflictStructureFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const bridgeUnitFailureChecks = qualityContractChecks(payload, 'bridge_unit_checks', 'bridgeUnitChecks')
    if (bridgeUnitFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = bridgeUnitFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '桥段节奏',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'bridge_unit_gap',
        severity: 'high',
        category: 'bridge_unit',
        title: `桥段节奏缺口 ${bridgeUnitFailureChecks.length}`,
        message: qualityContractMessage(bridgeUnitFailureChecks, '桥段节奏检查存在未清 fail/warn 项。'),
        action: '按 bridge_unit_checks 回修正文：确认四章一桥段位置，补连续期待、目标推进、章尾新目标、高潮中埋钩子或连续小期待；连续2章没有目标推进时提高冲突密度，连续2章只爆点时补关系、伏笔、状态承接余波。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `桥段节奏缺口 ${bridgeUnitFailureChecks.length}`,
          missed_count: bridgeUnitFailureChecks.length,
          missed: qualityContractMissedRows(bridgeUnitFailureChecks),
          checks: bridgeUnitFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const reversalFailureChecks = qualityContractChecks(payload, 'reversal_checks', 'reversalChecks')
    if (reversalFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = reversalFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '反转设计',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'reversal_gap',
        severity: 'high',
        category: 'reversal',
        title: `反转设计缺口 ${reversalFailureChecks.length}`,
        message: qualityContractMessage(reversalFailureChecks, '反转设计检查存在未清 fail/warn 项。'),
        action: '按 reversal_checks 回修正文：补足3处暗示、公平误导、反转类型、揭示时机、揭示后影响和打脸节奏；删除天降反转、作弊新信息和大段解释独白。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `反转设计缺口 ${reversalFailureChecks.length}`,
          missed_count: reversalFailureChecks.length,
          missed: qualityContractMissedRows(reversalFailureChecks),
          checks: reversalFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const showdownFailureChecks = qualityContractChecks(payload, 'showdown_checks', 'showdownChecks')
    if (showdownFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = showdownFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '高潮对抗',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'showdown_gap',
        severity: 'high',
        category: 'showdown',
        title: `高潮对抗缺口 ${showdownFailureChecks.length}`,
        message: qualityContractMessage(showdownFailureChecks, '高潮对抗检查存在未清 fail/warn 项。'),
        action: '按 showdown_checks 回修正文：补爽点释放、底牌管理、三压一爆三震、舞台层级、传递通道、震惊分层、战斗/智斗服务爽点、以弱胜强逻辑、三层破局和急-缓-急情绪节奏。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `高潮对抗缺口 ${showdownFailureChecks.length}`,
          missed_count: showdownFailureChecks.length,
          missed: qualityContractMissedRows(showdownFailureChecks),
          checks: showdownFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const openingFailureChecks = qualityContractChecks(payload, 'opening_checks', 'openingChecks')
    if (openingFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = openingFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '开篇设计',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'opening_gap',
        severity: 'high',
        category: 'opening',
        title: `开篇设计缺口 ${openingFailureChecks.length}`,
        message: qualityContractMessage(openingFailureChecks, '开篇设计检查存在未清 fail/warn 项。'),
        action: '按 opening_checks 回修正文：重做300字内主角登场、1000字内爽点/期待点、三大基点、开头五要诀（简单、不偏、快、爽、不平）、主角目标与本文卖点、信息分批释放；删除大段背景、天气风景、序章楔子和详细世界观。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `开篇设计缺口 ${openingFailureChecks.length}`,
          missed_count: openingFailureChecks.length,
          missed: qualityContractMissedRows(openingFailureChecks),
          checks: openingFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const proseCraftFailureChecks = qualityContractChecks(payload, 'prose_craft_checks', 'proseCraftChecks')
    if (proseCraftFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const directiveCheck = proseCraftFailureChecks.find(check => sceneCardDirectiveCheckKey(check))
      const firstCheck = directiveCheck || proseCraftFailureChecks[0] || {}
      const sceneCardDirectiveKind = sceneCardDirectiveCheckKey(firstCheck)
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '正文工艺',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: sceneCardDirectiveKind || 'prose_craft_gap',
        severity: 'high',
        category: 'prose_craft',
        title: `正文工艺缺口 ${proseCraftFailureChecks.length}`,
        message: qualityContractMessage(proseCraftFailureChecks, '正文工艺检查存在未清 fail/warn 项。'),
        action: '按 prose_craft_checks 回修正文：修深度限知、身体细节替代情绪词、连续内心独白、全场远景概括、三维度揉进、一动一静、道具/数字功能和环境交互；删除上帝视角、堆叠式描写、抽象心理总结、无交互环境和胶水词过渡。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `正文工艺缺口 ${proseCraftFailureChecks.length}`,
          missed_count: proseCraftFailureChecks.length,
          missed: qualityContractMissedRows(proseCraftFailureChecks),
          checks: proseCraftFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const punctuationToneFailureChecks = qualityContractChecks(payload, 'punctuation_tone_checks', 'punctuationToneChecks')
    if (punctuationToneFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = punctuationToneFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '语气标点',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'punctuation_tone_gap',
        severity: 'high',
        category: 'punctuation_tone',
        title: `语气标点缺口 ${punctuationToneFailureChecks.length}`,
        message: qualityContractMessage(punctuationToneFailureChecks, '语气标点检查存在未清 fail/warn 项。'),
        action: '按 punctuation_tone_checks 回修正文：修通篇句号化、随机标点堆砌、省略号/破折号硬停顿、质问/爆发/迟疑标点错配和角色声线同质；用动作打断、换行、短句或冒号落点承接语气。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `语气标点缺口 ${punctuationToneFailureChecks.length}`,
          missed_count: punctuationToneFailureChecks.length,
          missed: qualityContractMissedRows(punctuationToneFailureChecks),
          checks: punctuationToneFailureChecks,
          review_type: review.review_type,
        },
      })
    }
}
