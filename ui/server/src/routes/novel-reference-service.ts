import { createNovelReview, listNovelReviews } from '../novel'
import { previewNovelKnowledgeInjection } from '../llm'
import { listKnowledge } from '../knowledge-base'
import { asArray, clampScore, getSafetyPolicy, parseJsonLikePayload } from './novel-route-utils'

export function createNovelReferenceService() {
  const collectCopyGuardTerms = (preview: any) => {
    const terms = new Set<string>()
    for (const entry of Array.isArray(preview?.entries) ? preview.entries : []) {
      for (const entity of Array.isArray(entry.entities) ? entry.entities : []) {
        const value = String(entity || '').trim()
        if (value.length >= 2 && value.length <= 24) terms.add(value)
      }
      const evidence = String(entry.evidence || '')
      for (const match of evidence.matchAll(/[《》【】「」“”]?([\u4e00-\u9fa5A-Za-z0-9]{2,16})[《》【】「」“”]?/g)) {
        const value = String(match[1] || '').trim()
        if (value.length >= 3 && !/章节|结构|角色|剧情|主角|读者|情绪|世界|设定|参考|避免|借鉴|模板/.test(value)) terms.add(value)
      }
    }
    return Array.from(terms).slice(0, 80)
  }

  const buildReferenceQualityAssessment = (preview: any, hits: string[]) => {
    const entries = Array.isArray(preview?.entries) ? preview.entries : []
    const activeReferences = Array.isArray(preview?.active_references) ? preview.active_references : []
    const warnings = Array.isArray(preview?.warnings) ? preview.warnings : []
    const averageAvoidCoverage = activeReferences.length
      ? activeReferences.reduce((sum: number, ref: any) => sum + Math.min(1, (Array.isArray(ref?.avoid) ? ref.avoid.length : 0) / 4), 0) / activeReferences.length * 100
      : 0
    const averageDimensionCoverage = activeReferences.length
      ? activeReferences.reduce((sum: number, ref: any) => sum + Math.min(1, (Array.isArray(ref?.dimensions) ? ref.dimensions.length : 0) / 4), 0) / activeReferences.length * 100
      : 0
    const referenceCoverage = activeReferences.length
      ? clampScore((entries.length / Math.max(1, activeReferences.length * 4)) * 100)
      : (entries.length ? 60 : 0)
    const injectionScore = clampScore(Math.min(100, (entries.length / Math.max(1, activeReferences.length * 3 || 3)) * 100) - warnings.length * 6)
    const copySafetyScore = clampScore(100 - hits.length * 14 - warnings.length * 5)
    const originalityScore = clampScore(copySafetyScore * 0.65 + averageAvoidCoverage * 0.25 + averageDimensionCoverage * 0.1)
    const overallScore = clampScore(
      referenceCoverage * 0.2 +
      injectionScore * 0.25 +
      copySafetyScore * 0.3 +
      originalityScore * 0.25,
    )
    return {
      overall_score: overallScore,
      risk_level: overallScore >= 80 ? 'low' : overallScore >= 55 ? 'medium' : 'high',
      reference_coverage_score: referenceCoverage,
      injection_score: injectionScore,
      copy_safety_score: copySafetyScore,
      originality_score: originalityScore,
      avoid_coverage_score: clampScore(averageAvoidCoverage),
      dimension_coverage_score: clampScore(averageDimensionCoverage),
      injected_entry_count: entries.length,
      active_reference_count: activeReferences.length,
      copy_hit_count: hits.length,
      warning_count: warnings.length,
      recommendations: [
        referenceCoverage < 70 ? '补齐参考项目的可注入画像知识，避免生成时只拿到配置而拿不到蓝图。' : '',
        injectionScore < 70 ? '生成前先做参考预览，确认当前任务能命中足够知识条目。' : '',
        copySafetyScore < 75 ? '正文出现参考实体或证据词，建议替换专名、桥段顺序和原文表达。' : '',
        originalityScore < 75 ? '增加避免照搬项，并把参考维度限定在结构、节奏、角色功能和文风机制。' : '',
      ].filter(Boolean),
    }
  }

  const getReferenceSafetyDecision = (project: any, referenceReport: any) => {
    const safety = getSafetyPolicy(project)
    const quality = referenceReport?.quality_assessment || {}
    const hits = asArray(referenceReport?.copy_guard?.hits)
    const score = Number(quality.overall_score || 0)
    const blocked = safety.enforce_on_generate && (score < safety.min_quality_score || hits.length > safety.max_copy_hits)
    return {
      blocked,
      safety,
      score,
      copy_hit_count: hits.length,
      reasons: [
        score < safety.min_quality_score ? `参考安全评分 ${score} 低于阈值 ${safety.min_quality_score}` : '',
        hits.length > safety.max_copy_hits ? `照搬命中 ${hits.length} 超过阈值 ${safety.max_copy_hits}` : '',
      ].filter(Boolean),
    }
  }

  const explainReferenceSafety = (referenceReport: any, safetyDecision: any) => {
    const quality = referenceReport?.quality_assessment || {}
    const hits = asArray(referenceReport?.copy_guard?.hits)
    const entries = asArray(referenceReport?.injected_entries)
    return {
      score: safetyDecision?.score ?? Number(quality.overall_score || 0),
      risk_level: quality.risk_level || (safetyDecision?.blocked ? 'high' : 'low'),
      copy_hit_count: hits.length,
      learned_layers: {
        allowed: safetyDecision?.safety?.allowed || [],
        cautious: safetyDecision?.safety?.cautious || [],
        forbidden: safetyDecision?.safety?.forbidden || [],
      },
      evidence: {
        injected_entry_count: entries.length,
        copy_hits: hits,
        injection_score: quality.injection_score,
        copy_safety_score: quality.copy_safety_score,
        originality_score: quality.originality_score,
      },
      rewrite_suggestions: [
        hits.length ? '替换疑似复用词和专有名词，改写事件触发顺序。' : '',
        Number(quality.copy_safety_score || 100) < 75 ? '保留节奏功能，重写场景目标、障碍来源和人物选择。' : '',
        Number(quality.originality_score || 100) < 75 ? '增加当前项目独有的世界规则、代价机制或角色动机。' : '',
        '只迁移节奏、结构、爽点安排和信息密度，不迁移具体桥段、角色名、专有设定和原句。',
      ].filter(Boolean),
      blocked_reasons: safetyDecision?.reasons || [],
    }
  }

  const buildMigrationAudit = (project: any, referenceReport: any, safetyExplanation: any) => ({
    project_id: project.id,
    learning_layers: safetyExplanation?.learned_layers || getSafetyPolicy(project),
    learned: {
      rhythm_structure: asArray(referenceReport?.injected_entries).filter((entry: any) => /beat|节奏|结构|chapter|style|pacing/.test(`${entry.category || ''} ${entry.title || ''}`)).slice(0, 12),
      style_density: asArray(referenceReport?.injected_entries).filter((entry: any) => /style|syntax|dialogue|文风|句法|对话/.test(`${entry.category || ''} ${entry.title || ''}`)).slice(0, 12),
      payoff_emotion: asArray(referenceReport?.injected_entries).filter((entry: any) => /payoff|emotion|爽点|情绪|hook/.test(`${entry.category || ''} ${entry.title || ''}`)).slice(0, 12),
    },
    avoided: getSafetyPolicy(project).forbidden,
    risk: {
      score: safetyExplanation?.score ?? null,
      copy_hits: safetyExplanation?.evidence?.copy_hits || [],
      suggestions: safetyExplanation?.rewrite_suggestions || [],
    },
  })

  const buildReferenceUsageReport = async (activeWorkspace: string, project: any, taskType: string, generatedText = '') => {
    const preview = await previewNovelKnowledgeInjection(project, taskType)
    const terms = collectCopyGuardTerms(preview)
    const text = String(generatedText || '')
    const hits = terms.filter(term => text.includes(term)).slice(0, 20)
    const qualityAssessment = buildReferenceQualityAssessment(preview, hits)
    const report = {
      task_type: taskType,
      strength: preview.strength,
      strength_label: preview.strength_label,
      active_references: preview.active_references,
      injected_entries: (preview.entries || []).map((entry: any) => ({
        id: entry.id,
        title: entry.title,
        category: entry.category,
        source_project: entry.source_project,
        reference_weight: entry.reference_weight,
        match_reason: entry.match_reason,
      })),
      knowledge_snapshot_entry_ids: (preview.entries || []).map((entry: any) => entry.id).filter(Boolean),
      copy_guard: {
        checked_terms: terms.length,
        hits,
        status: hits.length ? 'warn' : 'ok',
      },
      warnings: preview.warnings || [],
      quality_assessment: qualityAssessment,
    }
    const shouldWarn = hits.length > 0 || qualityAssessment.overall_score < 70
    const safetyDecision = getReferenceSafetyDecision(project, report)
    const safetyExplanation = explainReferenceSafety(report, safetyDecision)
    ;(report as any).safety_decision = safetyDecision
    ;(report as any).safety_explanation = safetyExplanation
    ;(report as any).migration_audit = buildMigrationAudit(project, report, safetyExplanation)
    await createNovelReview(activeWorkspace, {
      project_id: project.id,
      review_type: 'reference_report',
      status: shouldWarn || safetyDecision.blocked ? 'warn' : 'ok',
      summary: `参考报告：${preview.strength_label || '-'}，注入 ${preview.entries?.length || 0} 条，质量评分 ${qualityAssessment.overall_score}${hits.length ? `，疑似照搬 ${hits.length} 项` : ''}`,
      issues: [
        ...safetyDecision.reasons,
        ...hits.map(term => `正文出现参考实体/证据词：${term}`),
        ...qualityAssessment.recommendations,
      ],
      payload: JSON.stringify(report),
    })
    return report
  }

  const buildReferenceMigrationDryPlan = (project: any, chapter: any, preview: any, safety: any) => ({
    allowed_learning_layers: safety.allowed,
    cautious_layers: safety.cautious,
    forbidden_transfer_layers: safety.forbidden,
    chapter_specific_plan: {
      chapter_no: chapter.chapter_no,
      title: chapter.title,
      learn: ['章节节奏', '结构功能', '爽点密度', '信息揭示节拍', '情绪曲线'],
      rewrite: ['场景目标', '障碍来源', '人物选择', '事件顺序', '设定名词', '具体桥段'],
      active_reference_count: preview.active_references?.length || 0,
      injected_entry_count: preview.entries?.length || 0,
    },
    rewrite_boundaries: ['不使用参考作品角色名、专有设定、原句、核心梗。', '参考作品只能作为节奏和结构功能样本。'],
    copy_guard_terms: collectCopyGuardTerms(preview).slice(0, 20),
    generation_prompt_addendum: '只学习参考作品的节奏、结构功能、爽点密度和信息揭示方式；所有具体事件、设定、角色、表达、桥段和顺序必须换成当前项目自有内容。',
  })

  const getReferenceMigrationPlanForChapter = async (activeWorkspace: string, project: any, chapter: any) => {
    const reviews = await listNovelReviews(activeWorkspace, project.id)
    const latest = reviews
      .filter(item => item.review_type === 'reference_migration_plan')
      .map(item => parseJsonLikePayload(item.payload) || {})
      .find(payload => Number(payload.chapter_id || 0) === Number(chapter.id))
    if (latest?.plan) return latest.plan
    const preview = await previewNovelKnowledgeInjection(project, '正文创作')
    return buildReferenceMigrationDryPlan(project, chapter, preview, getSafetyPolicy(project))
  }

  const simpleTextSimilarity = (a: string, b: string) => {
    const grams = (text: string) => {
      const clean = String(text || '').replace(/\s/g, '')
      const set = new Set<string>()
      for (let i = 0; i < clean.length - 2; i += 1) set.add(clean.slice(i, i + 3))
      return set
    }
    const left = grams(a)
    const right = grams(b)
    if (!left.size || !right.size) return 0
    let inter = 0
    for (const item of left) if (right.has(item)) inter += 1
    return clampScore((inter / Math.max(left.size, right.size)) * 100)
  }

  const diffTexts = (before: string, after: string) => {
    const beforeParas = String(before || '').split(/\n+/).map(item => item.trim()).filter(Boolean)
    const afterParas = String(after || '').split(/\n+/).map(item => item.trim()).filter(Boolean)
    const max = Math.max(beforeParas.length, afterParas.length)
    const changes = []
    for (let i = 0; i < max; i += 1) {
      if (beforeParas[i] !== afterParas[i]) changes.push({ index: i + 1, before: beforeParas[i] || '', after: afterParas[i] || '' })
      if (changes.length >= 80) break
    }
    return {
      before_length: before.length,
      after_length: after.length,
      paragraph_changes: changes,
      change_count: changes.length,
      similarity_score: simpleTextSimilarity(before, after),
    }
  }

  const extractStructureTokens = (value: any) => {
    const text = typeof value === 'string' ? value : JSON.stringify(value || {})
    return Array.from(new Set(String(text || '')
      .replace(/[^\p{L}\p{N}_\u4e00-\u9fa5]+/gu, ' ')
      .split(/\s+/)
      .map(item => item.trim())
      .filter(item => item.length >= 2)
      .slice(0, 120)))
  }

  const overlapScore = (left: string[], right: string[]) => {
    if (!left.length || !right.length) return 0
    const rightSet = new Set(right)
    const hits = left.filter(item => rightSet.has(item))
    return clampScore((hits.length / Math.min(left.length, right.length)) * 100)
  }

  const buildStructuralSimilarityReport = (chapter: any, referenceReport: any) => {
    const entries = asArray(referenceReport?.injected_entries)
    const sceneTokens = extractStructureTokens(chapter.scene_breakdown || chapter.scene_list || [])
    const chapterTokens = extractStructureTokens({
      title: chapter.title,
      goal: chapter.chapter_goal,
      summary: chapter.chapter_summary,
      conflict: chapter.conflict,
      ending_hook: chapter.ending_hook,
    })
    const referenceTokens = extractStructureTokens(entries.map((entry: any) => ({
      title: entry.title,
      category: entry.category,
      reason: entry.match_reason,
      source: entry.source_project,
    })))
    const categoryCounts = entries.reduce((acc: Record<string, number>, entry: any) => {
      const key = String(entry.category || 'unknown')
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
    const sceneOrderRisk = overlapScore(sceneTokens, referenceTokens)
    const roleFunctionRisk = clampScore(overlapScore(chapterTokens, referenceTokens) * 0.7 + Number(categoryCounts.character_function_matrix || 0) * 4)
    const payoffStructureRisk = clampScore(Number(categoryCounts.payoff_model || 0) * 8 + Number(categoryCounts.chapter_beat_template || 0) * 5)
    const entityOverlapRisk = clampScore(Number(referenceReport?.copy_guard?.hits?.length || 0) * 18)
    const overall = clampScore((sceneOrderRisk * 0.28) + (roleFunctionRisk * 0.24) + (payoffStructureRisk * 0.28) + (entityOverlapRisk * 0.2))
    return {
      overall_structural_risk: overall,
      scene_order_risk: sceneOrderRisk,
      role_function_risk: roleFunctionRisk,
      payoff_structure_risk: payoffStructureRisk,
      entity_overlap_risk: entityOverlapRisk,
      category_counts: categoryCounts,
      inspected_scene_token_count: sceneTokens.length,
      risk_level: overall >= 70 ? 'high' : overall >= 45 ? 'medium' : 'low',
      suggestions: [
        sceneOrderRisk > 45 ? '重排场景目标和信息揭示顺序，不沿用参考作品节拍顺序。' : '',
        roleFunctionRisk > 45 ? '替换角色功能分工和行为选择，让冲突来自本项目独有动机。' : '',
        payoffStructureRisk > 45 ? '保留爽点密度，但更换爽点触发条件、代价和回收方式。' : '',
        entityOverlapRisk > 0 ? '替换命中的参考专名、证据词和高辨识度表达。' : '',
      ].filter(Boolean),
    }
  }

  const buildReferenceCoverageReport = async (project: any) => {
    const categories = [
      { key: 'reference_profile', label: '作品画像', required: true },
      { key: 'volume_architecture', label: '分卷结构', required: true },
      { key: 'chapter_beat_template', label: '章节节奏', required: true },
      { key: 'character_function_matrix', label: '角色功能', required: true },
      { key: 'payoff_model', label: '爽点模板', required: true },
      { key: 'style_profile', label: '文风样本', required: true },
      { key: 'prose_syntax_profile', label: '句法样本', required: false },
      { key: 'dialogue_mechanism', label: '对话机制', required: false },
      { key: 'resource_economy_model', label: '资源经济', required: false },
    ]
    const references = asArray(project.reference_config?.references).filter((item: any) => String(item.project_title || '').trim())
    const rows = await Promise.all(references.map(async (ref: any) => {
      const title = String(ref.project_title || '').trim()
      const categoryRows = await Promise.all(categories.map(async category => {
        const count = (await listKnowledge(category.key, { project_title: title }).catch(() => [])).length
        return { ...category, count, ready: count > 0 || !category.required }
      }))
      const requiredRows = categoryRows.filter(item => item.required)
      const score = requiredRows.length ? Math.round((requiredRows.filter(item => item.count > 0).length / requiredRows.length) * 100) : 100
      return {
        project_title: title,
        weight: Number(ref.weight || 0.7),
        dimensions: asArray(ref.dimensions),
        avoid: asArray(ref.avoid),
        score,
        status: score >= 80 ? 'ready' : score >= 50 ? 'partial' : 'insufficient',
        categories: categoryRows,
        missing_required: requiredRows.filter(item => item.count <= 0).map(item => item.key),
      }
    }))
    const overallScore = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : 100
    return {
      references: rows,
      overall_score: overallScore,
      ready: rows.every(row => row.score >= 80),
      recommendations: [
        !rows.length ? '当前没有配置参考作品，可走原创生产流程。' : '',
        rows.some(row => row.missing_required.includes('reference_profile')) ? '先补齐作品画像，否则模型只能拿到零散知识。' : '',
        rows.some(row => row.missing_required.includes('chapter_beat_template')) ? '补齐章节节奏模板，仿写才会学到节拍而不是桥段。' : '',
        rows.some(row => row.missing_required.includes('character_function_matrix')) ? '补齐角色功能矩阵，避免照搬角色名或人设。' : '',
        rows.some(row => row.missing_required.includes('style_profile')) ? '补齐文风样本，原创和仿写都需要稳定表达参数。' : '',
      ].filter(Boolean),
    }
  }

  return {
    collectCopyGuardTerms,
    buildReferenceUsageReport,
    getReferenceSafetyDecision,
    explainReferenceSafety,
    buildReferenceMigrationDryPlan,
    getReferenceMigrationPlanForChapter,
    diffTexts,
    buildStructuralSimilarityReport,
    buildMigrationAudit,
    buildReferenceCoverageReport,
  }
}

export type NovelReferenceService = ReturnType<typeof createNovelReferenceService>
