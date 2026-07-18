import { asArray } from '../novel-route-utils'
import {
  preDraftExecutionChecks,
  preDraftExecutionMessage,
  preDraftExecutionMissedRows,
  pushAnnotation,
  qualityContractChecks,
  qualityContractMessage,
  qualityContractMissedRows,
} from './builders'
import type { ProseQualityAnnotationContext } from './builders-annotations-prose-quality-types'

export function appendProseQualityAudienceAnnotations(ctx: ProseQualityAnnotationContext) {
  const { review, payload, items, statuses, resolveChapter, pushReviewIssues, pushDeliveryRiskAnnotation, reviewPayload } = ctx
    const contentRubricFailureChecks = qualityContractChecks(payload, 'content_rubric_checks', 'contentRubricChecks')
    if (contentRubricFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = contentRubricFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '内容基准',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'content_rubric_gap',
        severity: 'high',
        category: 'content_rubric',
        title: `内容基准缺口 ${contentRubricFailureChecks.length}`,
        message: qualityContractMessage(contentRubricFailureChecks, '内容基准检查存在未清 fail/warn 项。'),
        action: '按 content_rubric_checks 回修正文：补核心卖点、冲突推进、情绪曲线、钩子与期待、角色动机、对话质量、设定一致性、自然文字证据、最小剧情循环和高潮构建；必须回答读者为什么翻下一页、本章改变了什么、正文证据在哪里。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `内容基准缺口 ${contentRubricFailureChecks.length}`,
          missed_count: contentRubricFailureChecks.length,
          missed: qualityContractMissedRows(contentRubricFailureChecks),
          checks: contentRubricFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const targetReaderFailureChecks = qualityContractChecks(payload, 'target_reader_checks', 'targetReaderChecks')
    if (targetReaderFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = targetReaderFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '目标读者',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'target_reader_gap',
        severity: 'high',
        category: 'target_reader',
        title: `目标读者缺口 ${targetReaderFailureChecks.length}`,
        message: qualityContractMessage(targetReaderFailureChecks, '目标读者检查存在未清 fail/warn 项。'),
        action: '按 target_reader_checks 回修正文：补清目标读者画像、读者渴望、情绪缺口、本章命中点、平台口味和可见读者回报；情绪缺口必须把核心痛苦、深层情结、高频情绪关键词和未满足需求写成冲突压力、角色选择、即时反馈或尊严/安全感/掌控感补偿。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `目标读者缺口 ${targetReaderFailureChecks.length}`,
          missed_count: targetReaderFailureChecks.length,
          missed: qualityContractMissedRows(targetReaderFailureChecks),
          checks: targetReaderFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const genrePositioningFailureChecks = qualityContractChecks(payload, 'genre_positioning_checks', 'genrePositioningChecks')
    if (genrePositioningFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = genrePositioningFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '题材定位',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'genre_positioning_gap',
        severity: 'high',
        category: 'genre_positioning',
        title: `题材定位缺口 ${genrePositioningFailureChecks.length}`,
        message: qualityContractMessage(genrePositioningFailureChecks, '题材定位检查存在未清 fail/warn 项。'),
        action: '按 genre_positioning_checks 回修正文：校准题材标签、核心梗、类型公式、金手指贴合、必备场景、微创新边界、长板聚焦和书名简介正文三位一体；拉长题材长板而非补短板，删除稀释核心卖点的支线，把同一卖点扩成至少 3 个角度的正文证据。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `题材定位缺口 ${genrePositioningFailureChecks.length}`,
          missed_count: genrePositioningFailureChecks.length,
          missed: qualityContractMissedRows(genrePositioningFailureChecks),
          checks: genrePositioningFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const femaleAudienceFailureChecks = qualityContractChecks(payload, 'female_audience_checks', 'femaleAudienceChecks')
    if (femaleAudienceFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = femaleAudienceFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '女频长篇',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'female_audience_gap',
        severity: 'high',
        category: 'female_audience',
        title: `女频长篇缺口 ${femaleAudienceFailureChecks.length}`,
        message: qualityContractMessage(femaleAudienceFailureChecks, '女频长篇检查存在未清 fail/warn 项。'),
        action: '按 female_audience_checks 回修正文：补安全感锚点、代入感、女主主动性、主情绪、感情线双轴、虐后反转或糖、平台对位和货板一致；把女主被动改成女主自己做决定、自己推进，把感情升级踩到事业/成长节点上，并控制连续虐戏剂量。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `女频长篇缺口 ${femaleAudienceFailureChecks.length}`,
          missed_count: femaleAudienceFailureChecks.length,
          missed: qualityContractMissedRows(femaleAudienceFailureChecks),
          checks: femaleAudienceFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const upgradeRhythmFailureChecks = qualityContractChecks(payload, 'upgrade_rhythm_checks', 'upgradeRhythmChecks')
    if (upgradeRhythmFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = upgradeRhythmFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '升级节奏',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'upgrade_rhythm_gap',
        severity: 'high',
        category: 'upgrade_rhythm',
        title: `升级节奏缺口 ${upgradeRhythmFailureChecks.length}`,
        message: qualityContractMessage(upgradeRhythmFailureChecks, '升级节奏检查存在未清 fail/warn 项。'),
        action: '按 upgrade_rhythm_checks 回修正文：补升级前后对比、即时反馈、延迟反馈、新门槛、金手指功能触发奖励规则和多维成长；金手指简单是核心，升级必须写成读者一眼能懂的动作反馈、资格变化、能力边界和下一层压力。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `升级节奏缺口 ${upgradeRhythmFailureChecks.length}`,
          missed_count: upgradeRhythmFailureChecks.length,
          missed: qualityContractMissedRows(upgradeRhythmFailureChecks),
          checks: upgradeRhythmFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const chapterStructureFailureChecks = qualityContractChecks(payload, 'structure_checks', 'structureChecks')
    if (chapterStructureFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = chapterStructureFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '章节结构',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'chapter_structure_gap',
        severity: 'high',
        category: 'chapter_structure',
        title: `章节结构缺口 ${chapterStructureFailureChecks.length}`,
        message: qualityContractMessage(chapterStructureFailureChecks, '章节结构检查存在未清 fail/warn 项。'),
        action: '按 structure_checks 回修正文：补开头钩子、中段推进、局势变化和章尾翻页；开头必须给具体异常/证据/危机，中段用行动推动局势，结尾落到新的发现、危机、选择或反转，而不是总结。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `章节结构缺口 ${chapterStructureFailureChecks.length}`,
          missed_count: chapterStructureFailureChecks.length,
          missed: qualityContractMissedRows(chapterStructureFailureChecks),
          checks: chapterStructureFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const chapterProgressionFailureChecks = qualityContractChecks(payload, 'progression_checks', 'progressionChecks')
    if (chapterProgressionFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = chapterProgressionFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '章节推进',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'chapter_progression_gap',
        severity: 'high',
        category: 'chapter_progression',
        title: `章节推进缺口 ${chapterProgressionFailureChecks.length}`,
        message: qualityContractMessage(chapterProgressionFailureChecks, '章节推进检查存在未清 fail/warn 项。'),
        action: '按 progression_checks 回修正文：证明删掉这章会影响理解；补本章不可删除的证据、选择、代价、关系变化、设定位移或主线位移，并压缩等待、复述、原地解释和不改变局势的段落。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `章节推进缺口 ${chapterProgressionFailureChecks.length}`,
          missed_count: chapterProgressionFailureChecks.length,
          missed: qualityContractMissedRows(chapterProgressionFailureChecks),
          checks: chapterProgressionFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const informationLoadFailureChecks = qualityContractChecks(payload, 'information_checks', 'informationChecks')
    if (informationLoadFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = informationLoadFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '信息负载',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'information_load_gap',
        severity: 'high',
        category: 'information_load',
        title: `信息负载缺口 ${informationLoadFailureChecks.length}`,
        message: qualityContractMessage(informationLoadFailureChecks, '信息负载检查存在未清 fail/warn 项。'),
        action: '按 information_checks 回修正文：压缩新概念到 3 个以内，把设定说明改成角色行动、质疑、触发、证据核对或冲突反馈中的可见信息；信息必须跟着冲突走，不得在行动前大段解释规则。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `信息负载缺口 ${informationLoadFailureChecks.length}`,
          missed_count: informationLoadFailureChecks.length,
          missed: qualityContractMissedRows(informationLoadFailureChecks),
          checks: informationLoadFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const longformContinuityFailureChecks = qualityContractChecks(payload, 'longform_checks', 'longformChecks')
    if (longformContinuityFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = longformContinuityFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '长篇连续性',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'longform_continuity_gap',
        severity: 'high',
        category: 'longform_continuity',
        title: `长篇连续性缺口 ${longformContinuityFailureChecks.length}`,
        message: qualityContractMessage(longformContinuityFailureChecks, '长篇连续性检查存在未清 fail/warn 项。'),
        action: '按 longform_checks 回修正文：检查最近 5 章是否有明确进展、爽点间隔是否过长、本章是否承接前文并推动后续；补阶段位移、状态变化、爽点回报和下一阶段牵引，避免连续多章只解释背景。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `长篇连续性缺口 ${longformContinuityFailureChecks.length}`,
          missed_count: longformContinuityFailureChecks.length,
          missed: qualityContractMissedRows(longformContinuityFailureChecks),
          checks: longformContinuityFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const readerRetentionFailureChecks = qualityContractChecks(payload, 'reader_retention_checks', 'readerRetentionChecks')
    if (readerRetentionFailureChecks.length > 0) {
      const chapter = resolveChapter(payload)
      const firstCheck = readerRetentionFailureChecks[0] || {}
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '追读雷达',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'reader_retention_gap',
        severity: 'high',
        category: 'reader_retention',
        title: `追读雷达缺口 ${readerRetentionFailureChecks.length}`,
        message: qualityContractMessage(readerRetentionFailureChecks, '追读雷达检查存在未清 fail/warn 项。'),
        action: '按 reader_retention_checks 回修正文：补前300字钩子、可见爽点、信息缺口、章末追读、留存双引擎的情绪 + 饥饿，以及 Hook上瘾模型的触发、行动、奖励、投入；饥饿缺口必须用信息差植入问号并剥洋葱卡住关键信息，奖励缺口必须补奖励随机性和沉没投入。',
        created_at: review.created_at,
        payload: {
          ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
          status: 'warn',
          label: `追读雷达缺口 ${readerRetentionFailureChecks.length}`,
          missed_count: readerRetentionFailureChecks.length,
          missed: qualityContractMissedRows(readerRetentionFailureChecks),
          checks: readerRetentionFailureChecks,
          review_type: review.review_type,
        },
      })
    }
    const intentConfirmationChecks = preDraftExecutionChecks(payload, 'intent_confirmation_checks', 'intentConfirmationChecks')
    if (intentConfirmationChecks.length > 0) {
      const chapter = resolveChapter(payload)
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '意图确认',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'intent_confirmation_gap',
        severity: 'high',
        category: 'intent_confirmation',
        title: `意图确认缺口 ${intentConfirmationChecks.length}`,
        message: preDraftExecutionMessage(intentConfirmationChecks) || '写前意图确认没有在正文中形成可验证证据。',
        action: '按写前意图确认回执回修正文：把情绪目标、章节意图、关键承接和章尾推动力改成正文可见事件、选择、动作、对白、关系反馈或物品状态变化。',
        created_at: review.created_at,
        payload: {
          status: 'warn',
          label: `意图确认缺口 ${intentConfirmationChecks.length}`,
          missed_count: intentConfirmationChecks.length,
          missed: preDraftExecutionMissedRows(intentConfirmationChecks),
          checks: intentConfirmationChecks,
          review_type: review.review_type,
        },
      })
    }
    const benchmarkRecallChecks = preDraftExecutionChecks(payload, 'benchmark_recall_checks', 'benchmarkRecallChecks')
    if (benchmarkRecallChecks.length > 0) {
      const chapter = resolveChapter(payload)
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '文风召回',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'benchmark_recall_gap',
        severity: 'high',
        category: 'benchmark_recall',
        title: `文风召回缺口 ${benchmarkRecallChecks.length}`,
        message: preDraftExecutionMessage(benchmarkRecallChecks) || '写前文风召回没有在正文中形成可验证证据。',
        action: '按写前文风召回回执回修正文：把对标模块、节奏参照、文风召回和表达方法改成正文中的节拍分配、对白比例、动作链和情绪转折，禁止复制参照文本原句或桥段。',
        created_at: review.created_at,
        payload: {
          status: 'warn',
          label: `文风召回缺口 ${benchmarkRecallChecks.length}`,
          missed_count: benchmarkRecallChecks.length,
          missed: preDraftExecutionMissedRows(benchmarkRecallChecks),
          checks: benchmarkRecallChecks,
          review_type: review.review_type,
        },
      })
    }
    pushReviewIssues(review, payload, asArray(reviewPayload.issues), {
      source: 'prose_quality',
      source_label: '正文质检',
      category: 'quality',
      severity: Number(reviewPayload.score || 100) < 65 ? 'high' : 'medium',
    })
    if (Number(reviewPayload.score || 100) < 78) {
      const chapter = resolveChapter(payload)
      pushAnnotation(items, statuses, {
        source: 'prose_quality',
        source_label: '正文质检',
        review_id: review.id,
        chapter_id: chapter?.id,
        chapter_no: chapter?.chapter_no,
        kind: 'low_quality_score',
        severity: Number(reviewPayload.score || 0) < 65 ? 'high' : 'medium',
        category: 'quality',
        title: `质量分 ${reviewPayload.score || 0} 低于阈值`,
        message: review.summary || `章节质量分 ${reviewPayload.score || 0}`,
        action: '进入章节修订，补齐目标、冲突、节奏或章末钩子。',
        created_at: review.created_at,
        payload: { score: reviewPayload.score },
      })
    }
}
