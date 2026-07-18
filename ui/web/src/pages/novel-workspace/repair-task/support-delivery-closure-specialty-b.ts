import {
  type AnyRecord,
  firstText,
  objectValue,
} from './utils'
import {
  repairTaskIssueType,
} from './support'
import {
  normalizeDeliveryRiskContext,
  qualityContractClosurePlan,
} from './support-normalize'
import {
  deterministicProseCleanupResidualsFromQuality,
  qualityContractResidualsFromQuality,
} from './quality-contract'
import {
  sourceReadinessResidualsFromQuality,
  stateTrackingResidualsFromQuality,
} from './support-normalize-repairs'

type ClosurePlan = {
  taskStatus: string
  annotationStatus: string
  annotationKey: string
  note: string
}

/** Specialty quality-domain closure plans (source readiness through reader retention). */
export function tryBuildSpecialtyQualityClosurePlanB(
  task: AnyRecord,
  revisionResult: AnyRecord = {},
): ClosurePlan | null {
  const isSuspenseRepair = firstText(task?.issue_type, task?.issueType) === 'suspense_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'suspense'
  if (isSuspenseRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'suspense_checks', 'suspenseChecks', '悬念编排')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `悬念编排已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `悬念编排复检通过${scoreText}，suspense_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `悬念编排仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isAssetLinkageRepair = firstText(task?.issue_type, task?.issueType) === 'asset_linkage_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'asset_linkage'
  if (isAssetLinkageRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'asset_linkage_checks', 'assetLinkageChecks', '资产挂钩')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `资产挂钩已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `资产挂钩复检通过${scoreText}，asset_linkage_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `资产挂钩仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isDialogueRepair = firstText(task?.issue_type, task?.issueType) === 'dialogue_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'dialogue'
  if (isDialogueRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'dialogue_checks', 'dialogueChecks', '对白质量')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `对白质量已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `对白质量复检通过${scoreText}，dialogue_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `对白质量仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isPlotDynamicsRepair = firstText(task?.issue_type, task?.issueType) === 'plot_dynamics_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'plot_dynamics'
  if (isPlotDynamicsRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'plot_dynamics_checks', 'plotDynamicsChecks', '剧情动力')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `剧情动力已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `剧情动力复检通过${scoreText}，plot_dynamics_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `剧情动力仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isCharacterRelationRepair = firstText(task?.issue_type, task?.issueType) === 'character_relation_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'character_relation'
  if (isCharacterRelationRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'character_relation_checks', 'characterRelationChecks', '角色关系')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `角色关系已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `角色关系复检通过${scoreText}，character_relation_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `角色关系仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isCharacterBehaviorRepair = firstText(task?.issue_type, task?.issueType) === 'character_behavior_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'character_behavior'
  if (isCharacterBehaviorRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'character_behavior_checks', 'characterBehaviorChecks', '角色行为')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `角色行为已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `角色行为复检通过${scoreText}，character_behavior_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `角色行为仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isConflictStructureRepair = firstText(task?.issue_type, task?.issueType) === 'conflict_structure_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'conflict_structure'
  if (isConflictStructureRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'conflict_structure_checks', 'conflictStructureChecks', '冲突结构')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `冲突结构已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `冲突结构复检通过${scoreText}，conflict_structure_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `冲突结构仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isBridgeUnitRepair = firstText(task?.issue_type, task?.issueType) === 'bridge_unit_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'bridge_unit'
  if (isBridgeUnitRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'bridge_unit_checks', 'bridgeUnitChecks', '桥段节奏')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `桥段节奏已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `桥段节奏复检通过${scoreText}，bridge_unit_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `桥段节奏仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isReversalRepair = firstText(task?.issue_type, task?.issueType) === 'reversal_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'reversal'
  if (isReversalRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'reversal_checks', 'reversalChecks', '反转设计')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `反转设计已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `反转设计复检通过${scoreText}，reversal_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `反转设计仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isShowdownRepair = firstText(task?.issue_type, task?.issueType) === 'showdown_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'showdown'
  if (isShowdownRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'showdown_checks', 'showdownChecks', '高潮对抗')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `高潮对抗已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `高潮对抗复检通过${scoreText}，showdown_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `高潮对抗仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isOpeningRepair = firstText(task?.issue_type, task?.issueType) === 'opening_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'opening'
  if (isOpeningRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'opening_checks', 'openingChecks', '开篇设计')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `开篇设计已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `开篇设计复检通过${scoreText}，opening_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `开篇设计仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isProseCraftRepair = firstText(task?.issue_type, task?.issueType) === 'prose_craft_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'prose_craft'
  if (isProseCraftRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'prose_craft_checks', 'proseCraftChecks', '正文工艺')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `正文工艺已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `正文工艺复检通过${scoreText}，prose_craft_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `正文工艺仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isPunctuationToneRepair = firstText(task?.issue_type, task?.issueType) === 'punctuation_tone_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'punctuation_tone'
  if (isPunctuationToneRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'punctuation_tone_checks', 'punctuationToneChecks', '语气标点')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `语气标点已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `语气标点复检通过${scoreText}，punctuation_tone_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `语气标点仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isContentRubricRepair = firstText(task?.issue_type, task?.issueType) === 'content_rubric_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'content_rubric'
  if (isContentRubricRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'content_rubric_checks', 'contentRubricChecks', '内容基准')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `内容基准已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `内容基准复检通过${scoreText}，content_rubric_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `内容基准仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isTargetReaderRepair = firstText(task?.issue_type, task?.issueType) === 'target_reader_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'target_reader'
  if (isTargetReaderRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'target_reader_checks', 'targetReaderChecks', '目标读者')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `目标读者已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `目标读者复检通过${scoreText}，target_reader_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `目标读者仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isGenrePositioningRepair = firstText(task?.issue_type, task?.issueType) === 'genre_positioning_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'genre_positioning'
  if (isGenrePositioningRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'genre_positioning_checks', 'genrePositioningChecks', '题材定位')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `题材定位已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `题材定位复检通过${scoreText}，genre_positioning_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `题材定位仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isFemaleAudienceRepair = firstText(task?.issue_type, task?.issueType) === 'female_audience_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'female_audience'
  if (isFemaleAudienceRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'female_audience_checks', 'femaleAudienceChecks', '女频长篇')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `女频长篇已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `女频长篇复检通过${scoreText}，female_audience_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `女频长篇仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  return null
}
