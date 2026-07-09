import { anchorMatchScore } from './text-matching'
import { countProseChars } from './word-target'

function asArray<T = any>(value: T | T[] | null | undefined): T[] {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

function compactBriefText(value: any, fallback = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim()
}

function proseBodyWithoutTitleLine(text: string) {
  return String(text || '').replace(/^第[^\n]{1,40}\n+/, '').trim()
}

function proseParagraphsWithoutTitle(text: string) {
  return proseBodyWithoutTitleLine(text)
    .split(/\n\s*\n+/)
    .map(paragraph => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function mergedContextChapterTarget(contextPackage: any = {}) {
  const runtimeTarget = contextPackage?.chapterTarget || {}
  const merged = {
    ...(contextPackage?.chapter_target || {}),
    ...runtimeTarget,
  }
  if (Object.prototype.hasOwnProperty.call(runtimeTarget, 'sceneCards') && runtimeTarget.sceneCards !== undefined) {
    merged.scene_cards = runtimeTarget.sceneCards
  }
  return merged
}

function uniqueBriefStrings(values: any, limit = 12) {
  const seen = new WeakSet<object>()
  const flattenBriefValues = (value: any, depth = 0): any[] => {
    if (depth > 6) return []
    if (Array.isArray(value)) return value.flatMap(item => flattenBriefValues(item, depth + 1))
    if (value && typeof value === 'object') {
      if (seen.has(value)) return []
      seen.add(value)
      return Object.values(value).flatMap(item => flattenBriefValues(item, depth + 1))
    }
    return value ? [value] : []
  }
  return Array.from(new Set(flattenBriefValues(values)
    .map(value => compactBriefText(value))
    .filter(Boolean))).slice(0, limit)
}

function sceneCardConsumptionParts(scene: any) {
  return uniqueBriefStrings([
    scene?.title,
    scene?.purpose,
    scene?.conflict,
    scene?.reader_payoff || scene?.readerPayoff || scene?.payoff || scene?.reader_reward,
    scene?.turning_point || scene?.turningPoint,
    scene?.reversal,
    scene?.ending_hook_seed || scene?.endingHookSeed || scene?.ending_hook,
    ...asArray(scene?.required_beats || scene?.requiredBeats),
    ...asArray(scene?.action_beats || scene?.actionBeats),
    ...asArray(scene?.required_information || scene?.requiredInformation),
  ], 10)
}

function sceneCardExecutionDirectiveParts(scene: any) {
  const directives = [
    ...asArray(scene?.dialogue_goals || scene?.dialogueGoals || scene?.dialogue_contract_goals || scene?.dialogueContractGoals),
    ...asArray(scene?.concept_anchor_rules || scene?.conceptAnchorRules || scene?.new_concept_anchor_rules || scene?.newConceptAnchorRules),
    ...asArray(scene?.prose_craft_directives || scene?.proseCraftDirectives || scene?.prose_craft_rules || scene?.proseCraftRules),
    scene?.relationship_progression_plan || scene?.relationshipProgressionPlan,
    scene?.relationship_buffer_zone || scene?.relationshipBufferZone,
    scene?.supporting_character_action || scene?.supportingCharacterAction,
    scene?.attitude_shift_checkpoint || scene?.attitudeShiftCheckpoint,
    scene?.relationship_next_hook || scene?.relationshipNextHook,
    scene?.showoff_stage_chain || scene?.showoffStageChain,
    scene?.spectator_interest_shift || scene?.spectatorInterestShift,
    scene?.secondary_showoff_effect || scene?.secondaryShowoffEffect,
    scene?.combat_result_type || scene?.combatResultType,
    scene?.combat_dimension_plan || scene?.combatDimensionPlan,
    scene?.combat_reversal_plan || scene?.combatReversalPlan,
  ].map((item: any) => compactBriefText(item)).filter(Boolean)
  return uniqueBriefStrings(directives.filter(item => {
    if (/^(不得|不能|不要|禁止|严禁|避免|不可)/.test(item)) return false
    return /新概念|新名词|新设定|首次出现|动作反应|对话半句|物理后果|作用锚点|对白|对话|潜台词|说漏|逼问|声线|科普嘴|关系类型|关系边界|关系阶段|关系推进|配角攻略缓冲区|信息差|地位差距|亲密度差距|信任程度|配角主动行动|独立目标|态度变化|旁观|质疑|拒绝|试探|协助|设限|关系下一轮|任务基地|下一轮期待|群众层|中间层|核心层|这跟我有关系|利益|目标|站队|计划|二级装逼|公开舞台|公开打脸|长老席|旁观者|战斗维度|心\/体\/技|反派出A|主角提前准备B|预判反制|反预判|碾压|以弱胜强|逃走进入第二阶段/.test(item)
  }), 10)
}

function sceneCardForbiddenDirectiveViolations(scene: any, chapterText: string) {
  const forbiddenDirectives = uniqueBriefStrings([
    ...asArray(scene?.dialogue_goals || scene?.dialogueGoals || scene?.dialogue_contract_goals || scene?.dialogueContractGoals),
    ...asArray(scene?.prose_craft_directives || scene?.proseCraftDirectives || scene?.prose_craft_rules || scene?.proseCraftRules),
  ].map((item: any) => compactBriefText(item)).filter(item => /^(不得|不能|不要|禁止|严禁|避免|不可)/.test(item)), 10)
  if (!forbiddenDirectives.length) return []
  const text = String(chapterText || '')
  const violations: string[] = []
  const hasExpositionDump = /源于|来自|留下来的|祭司制度|制度|原理|具体用法|后续再解释|分为[一二三四五六七八九十百千万\d]+|[一二三四五六七八九十百千万\d]+阶[一二三四五六七八九十百千万\d]+品|等级|品级/.test(text)
  const hasInfodumpTransition = /是[^。！？!?]{0,18}(?:留下来的|一种|用于|可以|能够)|源于[^。！？!?]{0,40}|分为[^。！？!?]{0,30}/.test(text)
  for (const directive of forbiddenDirectives) {
    const forbidsExposition = /整段|来历|等级|解释|原理|科普|说明书|设定说明/.test(directive)
    if (forbidsExposition && hasExpositionDump && hasInfodumpTransition) {
      violations.push(directive)
    }
  }
  return uniqueBriefStrings(violations, 8)
}

export function buildSceneCardConsumptionChecks(contextPackage: any = {}, chapterText: string) {
  const target = mergedContextChapterTarget(contextPackage)
  const sceneCards = [
    ...asArray(target.scene_cards || target.sceneCards),
    ...asArray(contextPackage?.pre_draft_brief?.scene_briefs || contextPackage?.preDraftBrief?.sceneBriefs),
  ]
  const checks: Array<{ key: string; label: string; status: 'warn'; score: number; evidence: string; fix: string; matched: string[] }> = []
  sceneCards.forEach((scene: any, index: number) => {
    const sceneNo = scene?.scene_no || scene?.sceneNo || index + 1
    const forbiddenViolations = sceneCardForbiddenDirectiveViolations(scene, chapterText)
    if (forbiddenViolations.length > 0) {
      checks.push({
        key: `scene_card_${sceneNo}_forbidden_directives`,
        label: '场景卡禁令执行',
        status: 'warn',
        score: 24,
        evidence: `场景${sceneNo}《${compactBriefText(scene?.title || scene?.purpose || '', 36)}》违反场景卡禁令：${compactBriefText(forbiddenViolations.join('；'), 180)}；正文出现整段来历/等级解释或说明书式科普。`,
        fix: '删掉说明书式来历、原理和等级解释，改成角色当下动作反应、对话半句、物理后果或证据判断变化。',
        matched: forbiddenViolations,
      })
    }
    const directiveParts = sceneCardExecutionDirectiveParts(scene)
    if (directiveParts.length > 0) {
      const directiveMatches = directiveParts.map(part => ({ part, match: anchorMatchScore(part, chapterText) }))
      const missedDirectives = directiveMatches.filter(item => item.match.score < 35 || item.match.matched.length === 0)
      if (missedDirectives.length > 0) {
        const combinedDirectiveScore = Math.round(directiveMatches.reduce((sum, item) => sum + item.match.score, 0) / Math.max(1, directiveMatches.length))
        checks.push({
          key: `scene_card_${sceneNo}_execution_directives`,
          label: '场景卡执行指令',
          status: 'warn',
          score: combinedDirectiveScore,
          evidence: `场景${sceneNo}《${compactBriefText(scene?.title || scene?.purpose || '', 36)}》未充分兑现 oh-story 执行指令：${compactBriefText(missedDirectives.map(item => item.part).join('；'), 180)}`,
          fix: '按场景卡补回对白目标、新概念锚点、角色关系推进、公开舞台层级、旁观者利益变化和战斗反制：用角色差异化对话、潜台词、动作反应、对话半句、物理后果、配角主动行动、缓冲区、态度变化、群众层/中间层/核心层反应、利益站队变化、心/体/技维度和预判反制证明执行，不要只写来历说明或旁白概括。',
          matched: directiveMatches.flatMap(item => asArray(item.match.matched).map((match: any) => String(match))).slice(0, 8),
        })
      }
    }
    const parts = sceneCardConsumptionParts(scene)
    const expected = parts.join('；')
    if (!expected) return
    const partMatches = parts.map(part => ({ part, match: anchorMatchScore(part, chapterText) }))
    const deliveredParts = partMatches.filter(item => item.match.score >= 35 && item.match.matched.length > 0)
    if (deliveredParts.length >= 2) return
    const combinedScore = partMatches.length
      ? Math.round(partMatches.reduce((sum, item) => sum + item.match.score, 0) / partMatches.length)
      : 0
    checks.push({
      key: `scene_card_${sceneNo}_consumption`,
      label: '场景卡消费检查',
      status: 'warn',
      score: combinedScore,
      evidence: `场景${sceneNo}《${compactBriefText(scene?.title || scene?.purpose || expected, 36)}》未充分落地：${compactBriefText(expected, 180)}`,
      fix: '按场景卡补回目的、冲突、读者回报、转折或章尾种子，写成可见动作、对话、规则触发、代价反馈或关系变化，不要只在旁白里概括。',
      matched: deliveredParts.flatMap(item => asArray(item.match.matched).map((match: any) => String(match))).slice(0, 8),
    })
  })
  return checks
}

function generatedSceneBreakdownFromContext(contextPackage: any = {}) {
  const target = mergedContextChapterTarget(contextPackage)
  const generatedScenes = [
    ...asArray(contextPackage?.generated_scene_breakdown || contextPackage?.generatedSceneBreakdown),
    ...asArray(target?.generated_scene_breakdown || target?.generatedSceneBreakdown),
  ]
  const fallbackScenes = [
    ...asArray(contextPackage?.scene_breakdown || contextPackage?.sceneBreakdown),
    ...asArray(target?.scene_breakdown || target?.sceneBreakdown),
  ]
  const scenes = generatedScenes.length ? generatedScenes : fallbackScenes
  const seen = new Set<string>()
  return scenes.filter((scene: any, index: number) => {
    const sceneNo = String(scene?.scene_no || scene?.sceneNo || index + 1)
    const label = compactBriefText(scene?.title || scene?.purpose || scene?.summary || '', 60)
    const key = `${sceneNo}::${label}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function sceneCardReceiptEvidenceParts(receipts: any[]) {
  return uniqueBriefStrings(receipts.flatMap(receipt => [
    ...asArray(receipt?.evidence || receipt?.source_excerpt || receipt?.sourceExcerpt || receipt?.changed_evidence || receipt?.changedEvidence),
    receipt?.evidence_text,
    receipt?.evidenceText,
    receipt?.source_excerpt,
    receipt?.sourceExcerpt,
    receipt?.changed_evidence,
    receipt?.changedEvidence,
  ]), 12)
}

function sceneCardReceiptsFromContext(contextPackage: any = {}) {
  return [
    contextPackage?.chapter_target?.delivery_receipts,
    contextPackage?.chapter_target?.oh_story_delivery_receipts,
    contextPackage?.chapterTarget?.delivery_receipts,
    contextPackage?.chapterTarget?.ohStoryDeliveryReceipts,
    contextPackage?.delivery_receipts,
    contextPackage?.oh_story_delivery_receipts,
  ]
    .flatMap((source: any) => asArray(source?.scene_card_receipts || source?.sceneCardReceipts))
}

function sceneCardReceiptBreakdownFromContext(contextPackage: any = {}) {
  const breakdown = generatedSceneBreakdownFromContext(contextPackage)
  if (breakdown.length) return breakdown
  return sceneCardReceiptsFromContext(contextPackage).map((receipt: any, index: number) => ({
    scene_no: receipt?.scene_no || receipt?.sceneNo || index + 1,
    title: receipt?.title || receipt?.scene_title || receipt?.sceneTitle || receipt?.label || `场景${index + 1}`,
    scene_card_receipts: receipt,
    __stored_delivery_receipt: true,
  }))
}

function firstNonEmptySceneValue(...values: any[]) {
  return values.find(value => String(value || '').trim())
}

function sceneCardReceiptScopeText(scene: any = {}, chapterText: string) {
  const explicitSceneText = firstNonEmptySceneValue(
    scene?.scene_text,
    scene?.sceneText,
    scene?.prose_excerpt,
    scene?.proseExcerpt,
    scene?.chapter_text,
    scene?.chapterText,
    scene?.text,
    scene?.content,
  )
  if (explicitSceneText) {
    return { text: String(explicitSceneText), scoped: true, source: 'scene_text' }
  }

  const startAnchor = firstNonEmptySceneValue(scene?.scene_start_anchor, scene?.sceneStartAnchor, scene?.start_anchor, scene?.startAnchor)
  const endAnchor = firstNonEmptySceneValue(scene?.scene_end_anchor, scene?.sceneEndAnchor, scene?.end_anchor, scene?.endAnchor)
  const sourceText = String(chapterText || '')
  if (startAnchor && endAnchor) {
    const start = sourceText.indexOf(String(startAnchor))
    const end = sourceText.indexOf(String(endAnchor), start >= 0 ? start : 0)
    if (start >= 0 && end >= start) {
      return { text: sourceText.slice(start, end + String(endAnchor).length), scoped: true, source: 'scene_anchor' }
    }
  }

  return { text: sourceText, scoped: false, source: 'chapter_text' }
}

function sceneCardReceiptHasScopeBoundary(scene: any = {}) {
  const explicitSceneText = firstNonEmptySceneValue(
    scene?.scene_text,
    scene?.sceneText,
    scene?.prose_excerpt,
    scene?.proseExcerpt,
    scene?.chapter_text,
    scene?.chapterText,
    scene?.text,
    scene?.content,
  )
  const startAnchor = firstNonEmptySceneValue(scene?.scene_start_anchor, scene?.sceneStartAnchor, scene?.start_anchor, scene?.startAnchor)
  const endAnchor = firstNonEmptySceneValue(scene?.scene_end_anchor, scene?.sceneEndAnchor, scene?.end_anchor, scene?.endAnchor)
  return Boolean(explicitSceneText || (startAnchor && endAnchor))
}

function evidenceOffsetInText(evidence: any, chapterText: string) {
  const part = compactBriefText(evidence)
  const sourceText = String(chapterText || '')
  if (!part || !sourceText) return -1
  const exactIndex = sourceText.indexOf(part)
  if (exactIndex >= 0) return exactIndex
  const compactIndex = sourceText.replace(/\s+/g, ' ').indexOf(part)
  if (compactIndex >= 0) return compactIndex
  const cjk = part.replace(/[^\u3400-\u9fff]/g, '')
  for (let length = Math.min(18, cjk.length); length >= 6; length -= 1) {
    for (let index = 0; index <= cjk.length - length; index += 1) {
      const needle = cjk.slice(index, index + length)
      const found = sourceText.indexOf(needle)
      if (found >= 0) return found
    }
  }
  return -1
}

function orderedEvidenceScopeForScene(breakdown: any[], sceneIndex: number, chapterText: string) {
  const sourceText = String(chapterText || '')
  const offsets = breakdown.map((scene: any) => {
    const rawReceipts = scene?.scene_card_receipts || scene?.sceneCardReceipts
    const receipts = Array.isArray(rawReceipts)
      ? rawReceipts
      : rawReceipts && typeof rawReceipts === 'object'
        ? [rawReceipts]
        : []
    const evidenceParts = sceneCardReceiptEvidenceParts(receipts)
    const located = evidenceParts
      .map(part => evidenceOffsetInText(part, sourceText))
      .filter(offset => offset >= 0)
    return located.length ? Math.min(...located) : -1
  })
  if (offsets.some(offset => offset < 0)) return null
  for (let index = 1; index < offsets.length; index += 1) {
    if (offsets[index] <= offsets[index - 1]) return null
  }
  const start = offsets[sceneIndex]
  const end = offsets[sceneIndex + 1] > start ? offsets[sceneIndex + 1] : sourceText.length
  if (start < 0 || end <= start) return null
  return {
    text: sourceText.slice(start, end),
    scoped: true,
    source: 'ordered_receipt_evidence',
  }
}

function sceneCardReceiptRows(scene: any = {}) {
  const rawReceipts = scene?.scene_card_receipts || scene?.sceneCardReceipts
  return Array.isArray(rawReceipts)
    ? rawReceipts
    : rawReceipts && typeof rawReceipts === 'object'
      ? [rawReceipts]
      : []
}

function allBoundedSceneReceiptScopesAreStale(breakdown: any[], chapterText: string) {
  if (breakdown.length <= 1) return false
  const scopedScenes = breakdown.filter(scene => sceneCardReceiptRows(scene).length > 0)
  if (scopedScenes.length !== breakdown.length) return false
  return scopedScenes.every(scene => sceneCardReceiptHasScopeBoundary(scene) && !sceneCardReceiptScopeText(scene, chapterText).scoped)
}

function allSceneReceiptEvidenceMatchesChapter(breakdown: any[], chapterText: string) {
  return breakdown.every(scene => {
    const evidenceParts = sceneCardReceiptEvidenceParts(sceneCardReceiptRows(scene))
    if (!evidenceParts.length) return false
    return evidenceParts.some(part => anchorMatchScore(part, chapterText).score >= 35)
  })
}

export function scanSceneCardReceiptRisks(contextPackage: any = {}, chapterText: string) {
  const breakdown = sceneCardReceiptBreakdownFromContext(contextPackage)
  const checks: Array<{ key: string; label: string; status: 'fail'; evidence: string; fix: string; scene_no: number; fields?: string[]; matched?: string[] }> = []
  if (!breakdown.length) return checks
  const allScopesStaleButEvidenceLocated = allBoundedSceneReceiptScopesAreStale(breakdown, chapterText)
    && allSceneReceiptEvidenceMatchesChapter(breakdown, chapterText)

  const deliveredFields = [
    ['delivered', 'delivered', '整体交付'],
    ['goal_obstacle_change_delivered', 'goalObstacleChangeDelivered', '目标/阻碍/状态变化'],
    ['purpose_tag_delivered', 'purposeTagDelivered', '目的词'],
    ['density_level_delivered', 'densityLevelDelivered', '疏密'],
    ['sensory_anchor_delivered', 'sensoryAnchorDelivered', '感知锚点'],
    ['serial_risk_repairs_delivered', 'serialRiskRepairsDelivered', '近章风险修复'],
    ['required_beats_delivered', 'requiredBeatsDelivered', 'required_beats'],
    ['action_beats_delivered', 'actionBeatsDelivered', 'action_beats'],
    ['dialogue_goals_delivered', 'dialogueGoalsDelivered', '对白目标'],
    ['style_directives_delivered', 'styleDirectivesDelivered', '文风指令'],
    ['benchmark_recall_directives_delivered', 'benchmarkRecallDirectivesDelivered', '文风召回指令'],
    ['concept_anchor_rules_delivered', 'conceptAnchorRulesDelivered', '新概念锚点'],
    ['prose_craft_directives_delivered', 'proseCraftDirectivesDelivered', '正文工艺指令'],
    ['showoff_stage_chain_delivered', 'showoffStageChainDelivered', '公开舞台层级'],
    ['spectator_interest_shift_delivered', 'spectatorInterestShiftDelivered', '旁观者利益变化'],
    ['secondary_showoff_effect_delivered', 'secondaryShowoffEffectDelivered', '二级装逼效果'],
    ['combat_result_type_delivered', 'combatResultTypeDelivered', '战斗结果类型'],
    ['combat_dimension_plan_delivered', 'combatDimensionPlanDelivered', '战斗维度计划'],
    ['combat_reversal_plan_delivered', 'combatReversalPlanDelivered', '战斗反转计划'],
  ] as const

  breakdown.forEach((scene: any, index: number) => {
    const sceneNo = Number(scene?.scene_no || scene?.sceneNo || index + 1) || index + 1
    const sceneLabel = compactBriefText(scene?.title || scene?.purpose || `场景${sceneNo}`, 36)
    const receipts = sceneCardReceiptRows(scene)

    if (!receipts.length) {
      checks.push({
        key: `scene_card_receipt_${sceneNo}_missing`,
        label: '场景卡回执证据复核',
        status: 'fail',
        scene_no: sceneNo,
        evidence: `场景${sceneNo}《${sceneLabel}》缺少 scene_card_receipts，无法确认场景卡目标、目的词、疏密、感知锚点和风险修复是否真正兑现。`,
        fix: '重新生成或修订 scene_breakdown，为每个场景补 scene_card_receipts，并用正文中的动作、对话、信息变化或关系变化作为 evidence。',
      })
      return
    }

    const failedFields = deliveredFields
      .filter(([snake, camel]) => receipts.some(receipt => receipt?.[snake] === false || receipt?.[camel] === false))
      .map(([, , label]) => label)

    if (failedFields.length) {
      checks.push({
        key: `scene_card_receipt_${sceneNo}_undelivered`,
        label: '场景卡回执证据复核',
        status: 'fail',
        scene_no: sceneNo,
        fields: failedFields,
        evidence: `场景${sceneNo}《${sceneLabel}》scene_card_receipts 标记未兑现：${failedFields.join('、')}。`,
        fix: '按 delivered=false 的字段修正文，再重写 scene_card_receipts；无法补足时保留 delivered=false 并写清 remaining_risk。',
      })
      return
    }

    const evidenceParts = sceneCardReceiptEvidenceParts(receipts)
    if (!evidenceParts.length) {
      checks.push({
        key: `scene_card_receipt_${sceneNo}_evidence_empty`,
        label: '场景卡回执证据复核',
        status: 'fail',
        scene_no: sceneNo,
        evidence: `场景${sceneNo}《${sceneLabel}》scene_card_receipts 没有 evidence(array)，无法证明 delivered=true。`,
        fix: '为 scene_card_receipts.evidence 补正文原句或场景变化证据；不能只写“已完成”。',
      })
      return
    }

    const isStoredDeliveryReceipt = scene?.__stored_delivery_receipt === true

    if (!isStoredDeliveryReceipt && breakdown.length > 1 && !sceneCardReceiptHasScopeBoundary(scene)) {
      checks.push({
        key: `scene_card_receipt_${sceneNo}_scope_missing`,
        label: '场景卡回执证据复核',
        status: 'fail',
        scene_no: sceneNo,
        evidence: `场景${sceneNo}《${sceneLabel}》缺少 scene_start_anchor/scene_end_anchor 或 scene_text，无法判断 scene_card_receipts.evidence 是否属于对应场景。`,
        fix: '重新生成或修订 scene_breakdown，为每个场景补场景边界：scene_start_anchor、scene_end_anchor，或直接提供 scene_text/prose_excerpt。',
      })
      return
    }

    let scope = sceneCardReceiptScopeText(scene, chapterText)
    if (!isStoredDeliveryReceipt && breakdown.length > 1 && !scope.scoped && sceneCardReceiptHasScopeBoundary(scene)) {
      scope = orderedEvidenceScopeForScene(breakdown, index, chapterText) || scope
      if (!scope.scoped && allScopesStaleButEvidenceLocated) {
        scope = { text: String(chapterText || ''), scoped: true, source: 'chapter_evidence_fallback' }
      }
    }
    if (!isStoredDeliveryReceipt && breakdown.length > 1 && !scope.scoped) {
      checks.push({
        key: `scene_card_receipt_${sceneNo}_scope_invalid`,
        label: '场景卡回执证据复核',
        status: 'fail',
        scene_no: sceneNo,
        evidence: `场景${sceneNo}《${sceneLabel}》scene_start_anchor/scene_end_anchor 无法定位到正文对应场景，不能验证 scene_card_receipts.evidence 是否属于该场景。`,
        fix: '修正场景锚点，使 scene_start_anchor 和 scene_end_anchor 能在正文中定位对应场景；或提供 scene_text/prose_excerpt 后再复核回执证据。',
      })
      return
    }
    const evidenceMatches = evidenceParts.map(part => ({
      part,
      match: anchorMatchScore(part, scope.text),
      chapterMatch: scope.scoped ? anchorMatchScore(part, chapterText) : null,
    }))
    const matched = evidenceMatches.filter(item => item.match.score >= 35 && item.match.matched.length > 0)
    if (matched.length) return

    const chapterMatched = scope.scoped
      ? evidenceMatches.filter(item => item.chapterMatch && item.chapterMatch.score >= 35 && item.chapterMatch.matched.length > 0)
      : []
    if (chapterMatched.length) {
      checks.push({
        key: `scene_card_receipt_${sceneNo}_evidence_out_of_scene`,
        label: '场景卡回执证据复核',
        status: 'fail',
        scene_no: sceneNo,
        evidence: `场景${sceneNo}《${sceneLabel}》scene_card_receipts 的 evidence 出现在正文其他位置，但不在对应场景文本中：${compactBriefText(evidenceParts.join('；'), 220)}`,
        fix: '把 evidence 对应的动作、对话、信息变化或关系变化补进对应场景，或重写该场景 scene_card_receipts，避免借用其他场景的证据。',
        matched: chapterMatched.flatMap(item => asArray(item.chapterMatch?.matched).map((match: any) => String(match))).slice(0, 8),
      })
      return
    }

    checks.push({
      key: `scene_card_receipt_${sceneNo}_evidence_missing`,
      label: '场景卡回执证据复核',
      status: 'fail',
      scene_no: sceneNo,
      evidence: `场景${sceneNo}《${sceneLabel}》scene_card_receipts 声称已兑现，但 evidence 不在正文中：${compactBriefText(evidenceParts.join('；'), 220)}`,
      fix: '不能信任回执自述；要么把 evidence 对应的动作、对话、信息变化或关系变化补进正文，要么把对应 delivered 改为 false 并写 remaining_risk。',
      matched: evidenceMatches.flatMap(item => asArray(item.match.matched).map((match: any) => String(match))).slice(0, 8),
    })
  })
  return checks
}

export function buildSceneCardReceiptSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const breakdown = sceneCardReceiptBreakdownFromContext(contextPackage)
  const missed = scanSceneCardReceiptRisks(contextPackage, chapterText).map((item: any) => ({
    key: item.key,
    label: item.label,
    text: item.fix,
    evidence: item.evidence,
    scene_no: item.scene_no,
    fields: item.fields || [],
    status: 'warn',
  }))
  const missedCount = missed.length
  const sceneCount = breakdown.length
  const status = missedCount > 0 ? 'warn' : 'ok'
  return {
    report_id: `scene-card-receipts-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    status,
    label: sceneCount === 0 ? '场景回执未配置' : status === 'ok' ? '场景回执 OK' : `场景回执缺口 ${missedCount}`,
    summary: sceneCount === 0
      ? '本章没有可复核的 scene_card_receipts。'
      : status === 'ok'
        ? `已复核 ${sceneCount} 个场景的 scene_card_receipts，回执证据能在对应场景正文中定位。`
        : `正文有 ${missedCount} 项场景卡回执证据未闭环。`,
    scene_count: sceneCount,
    missed_count: missedCount,
    missed,
    next_actions: status === 'ok'
      ? ['保持 scene_card_receipts 闭环：delivered 字段、场景边界和 evidence 必须能对应到正文。']
      : [
          '修订对应场景正文，补齐 scene_card_receipts 中 delivered=false、证据缺失、证据跨场景或场景边界缺失的问题。',
          '重写 scene_start_anchor、scene_end_anchor 和 scene_card_receipts.evidence，确保 evidence 引用对应场景中的动作、对白、信息变化、关系变化、声线或新概念锚点。',
        ],
  }
}

export function selectVerifiedSceneBreakdownUpdate(currentBreakdown: any[] = [], candidateBreakdown: any = [], chapterText: string = '') {
  const candidate = Array.isArray(candidateBreakdown) ? candidateBreakdown : []
  if (!candidate.length) return currentBreakdown
  const risks = scanSceneCardReceiptRisks({ generated_scene_breakdown: candidate }, String(chapterText || ''))
  return risks.length ? currentBreakdown : candidate
}

export function verifiedSceneBreakdownForStateSync(contextPackage: any = {}, chapterText: string = '') {
  const breakdown = generatedSceneBreakdownFromContext(contextPackage)
  if (!breakdown.length) return []
  const risks = scanSceneCardReceiptRisks({ generated_scene_breakdown: breakdown }, String(chapterText || ''))
  const blockedSceneNos = new Set(risks.map((risk: any) => Number(risk?.scene_no || 0)).filter(Boolean))
  return breakdown.filter((scene: any, index: number) => {
    const sceneNo = Number(scene?.scene_no || scene?.sceneNo || index + 1) || index + 1
    return !blockedSceneNos.has(sceneNo)
  })
}

export function buildStoryStateSyncContextPackage(contextPackage: any = {}, chapterText: string = '') {
  const verifiedSceneBreakdown = verifiedSceneBreakdownForStateSync(contextPackage, chapterText)
  if (!generatedSceneBreakdownFromContext(contextPackage).length) return contextPackage
  return {
    ...contextPackage,
    generated_scene_breakdown: verifiedSceneBreakdown,
    generatedSceneBreakdown: undefined,
    chapter_target: {
      ...(contextPackage?.chapter_target || {}),
      generated_scene_breakdown: verifiedSceneBreakdown,
      generatedSceneBreakdown: undefined,
    },
    chapterTarget: contextPackage?.chapterTarget
      ? {
        ...(contextPackage.chapterTarget || {}),
        generated_scene_breakdown: verifiedSceneBreakdown,
        generatedSceneBreakdown: verifiedSceneBreakdown,
      }
      : contextPackage?.chapterTarget,
  }
}

export function scanSceneSensoryAnchorRisks(contextPackage: any = {}, chapterText: string) {
  const target = mergedContextChapterTarget(contextPackage)
  const sceneCards = [
    ...asArray(target.scene_cards || target.sceneCards),
    ...asArray(contextPackage?.pre_draft_brief?.scene_briefs || contextPackage?.preDraftBrief?.sceneBriefs),
  ].filter((scene: any) => compactBriefText(scene?.sensory_anchor || scene?.sensoryAnchor))
  const paragraphs = proseParagraphsWithoutTitle(chapterText)
  if (!sceneCards.length || !paragraphs.length) return []

  const anchorRows = sceneCards.map((scene: any, index: number) => {
    const parts = sceneCardConsumptionParts(scene)
    let best = { index: -1, score: 0 }
    paragraphs.forEach((paragraph, paragraphIndex) => {
      const score = parts.reduce((max, part) => Math.max(max, anchorMatchScore(part, paragraph).score), 0)
      if (score > best.score) best = { index: paragraphIndex, score }
    })
    return { scene, sceneIndex: index, paragraphIndex: best.score >= 35 ? best.index : -1, score: best.score }
  })

  const checks: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; sensory_anchor: string; scene_no: number; matched: string[] }> = []
  anchorRows.forEach(row => {
    const { scene, paragraphIndex } = row
    const sensoryAnchor = compactBriefText(scene?.sensory_anchor || scene?.sensoryAnchor)
    if (!sensoryAnchor) return
    const sceneNo = Number(scene?.scene_no || scene?.sceneNo || row.sceneIndex + 1) || row.sceneIndex + 1
    const nextAnchorIndex = anchorRows
      .map(item => item.paragraphIndex)
      .filter(index => index > paragraphIndex)
      .sort((a, b) => a - b)[0]
    const scopedParagraphs = paragraphIndex >= 0
      ? paragraphs.slice(
          Math.max(0, paragraphIndex - 1),
          nextAnchorIndex != null ? nextAnchorIndex : Math.min(paragraphs.length, paragraphIndex + 4),
        )
      : paragraphs
    const scopedText = scopedParagraphs.join(' ')
    const match = anchorMatchScore(sensoryAnchor, scopedText)
    if (match.score >= 35 && match.matched.length >= 2) return

    const sceneLabel = compactBriefText(scene?.title || scene?.purpose || `场景${sceneNo}`, 36)
    checks.push({
      key: `scene_sensory_anchor_${sceneNo}_missing`,
      label: '场景感知锚点执行检查',
      status: 'warn',
      scene_no: sceneNo,
      sensory_anchor: sensoryAnchor,
      evidence: `场景${sceneNo}《${sceneLabel}》规划 sensory_anchor「${compactBriefText(sensoryAnchor, 120)}」，但正文窗口缺少对应感知落点：${compactBriefText(scopedText, 220)}`,
      fix: '把 sensory_anchor 改写成主角主动注意到的感知细节，并让它参与动作、规则、危险或对话判断；删掉只负责氛围的装饰性场景描写。',
      matched: asArray(match.matched).map((item: any) => String(item)).slice(0, 8),
    })
  })
  return checks
}

export function scanSceneSerialRiskRepairRisks(contextPackage: any = {}, chapterText: string) {
  const target = mergedContextChapterTarget(contextPackage)
  const sceneCards = [
    ...asArray(target.scene_cards || target.sceneCards),
    ...asArray(contextPackage?.pre_draft_brief?.scene_briefs || contextPackage?.preDraftBrief?.sceneBriefs),
  ].filter((scene: any) => {
    return asArray(scene?.serial_risk_repairs || scene?.serialRiskRepairs || scene?.risk_repairs || scene?.riskRepairs).length
      || compactBriefText(scene?.recent_fatigue_action || scene?.recentFatigueAction || scene?.fatigue_repair_action || scene?.fatigueRepairAction)
  })
  const paragraphs = proseParagraphsWithoutTitle(chapterText)
  if (!sceneCards.length || !paragraphs.length) return []

  const anchorRows = sceneCards.map((scene: any, index: number) => {
    const parts = sceneCardConsumptionParts(scene)
    let best = { index: -1, score: 0 }
    paragraphs.forEach((paragraph, paragraphIndex) => {
      const score = parts.reduce((max, part) => Math.max(max, anchorMatchScore(part, paragraph).score), 0)
      if (score > best.score) best = { index: paragraphIndex, score }
    })
    return { scene, sceneIndex: index, paragraphIndex: best.score >= 35 ? best.index : -1, score: best.score }
  })

  const requirementRules = [
    { label: '目标推进', trigger: /目标|推进|主线|进展|下一步/, evidence: /目标|推进|下一步|决定|必须|前往|转向|打开|拿到|进入|钥匙|线索|禁库|资格|门槛/ },
    { label: '阻碍升级', trigger: /阻碍|升级|反制|更大|压力|代价|门槛/, evidence: /阻止|反制|升级|更大|压力|代价|门槛|受阻|逼|不能|必须|危险|威胁/ },
    { label: '新信息', trigger: /新信息|新证据|证据|线索|真相|情报|发现/, evidence: /新证据|证据|线索|真相|情报|发现|指出|露出|亮出|账册|印|名单|记录/ },
    { label: '关系/世界调剂', trigger: /关系|盟友|同伴|立场|世界|规则|地图|势力/, evidence: /关系|盟友.{0,16}(站|跟|递|改口|倒向|支持|承诺|信任)|同伴.{0,16}(站|跟|递|支持)|站到|跟你走|递出|改口|倒向|规则|地图|势力|世界/ },
    { label: '冲突冷却', trigger: /冷却|余波|承接|善后|喘息|收束/, evidence: /冷却|余波|善后|喘息|收束|沉默|后果|代价|伤口|休整|交接|收起|退开/ },
  ]

  const checks: Array<{ key: string; label: string; status: 'warn'; scene_no: number; evidence: string; fix: string; matched: string[] }> = []
  anchorRows.forEach(row => {
    const { scene, paragraphIndex } = row
    const action = compactBriefText(scene?.recent_fatigue_action || scene?.recentFatigueAction || scene?.fatigue_repair_action || scene?.fatigueRepairAction)
    const riskRepairs = asArray(scene?.serial_risk_repairs || scene?.serialRiskRepairs || scene?.risk_repairs || scene?.riskRepairs)
      .map((item: any) => compactBriefText(typeof item === 'string' ? item : item?.key || item?.risk || JSON.stringify(item)))
      .filter(Boolean)
    if (!action) return

    const sceneNo = Number(scene?.scene_no || scene?.sceneNo || row.sceneIndex + 1) || row.sceneIndex + 1
    const nextAnchorIndex = anchorRows
      .map(item => item.paragraphIndex)
      .filter(index => index > paragraphIndex)
      .sort((a, b) => a - b)[0]
    const scopedParagraphs = paragraphIndex >= 0
      ? paragraphs.slice(
          Math.max(0, paragraphIndex - 1),
          nextAnchorIndex != null ? nextAnchorIndex : Math.min(paragraphs.length, paragraphIndex + 4),
        )
      : paragraphs
    const scopedText = scopedParagraphs.join(' ')
    const requiredRules = requirementRules.filter(rule => rule.trigger.test(action))
    const missingRequirements = requiredRules.filter(rule => !rule.evidence.test(scopedText)).map(rule => rule.label)
    const actionMatch = anchorMatchScore(action, scopedText)
    const actionMissing = requiredRules.length === 0 && (actionMatch.score < 35 || actionMatch.matched.length < 2)
    if (!missingRequirements.length && !actionMissing) return

    const sceneLabel = compactBriefText(scene?.title || scene?.purpose || `场景${sceneNo}`, 36)
    checks.push({
      key: `scene_serial_risk_repair_${sceneNo}_missing`,
      label: '场景近章风险修复检查',
      status: 'warn',
      scene_no: sceneNo,
      evidence: `场景${sceneNo}《${sceneLabel}》标注风险修复${riskRepairs.length ? `「${riskRepairs.join('、')}」` : ''}，recent_fatigue_action「${compactBriefText(action, 160)}」，但正文窗口缺少${missingRequirements.length ? missingRequirements.join('、') : '对应动作证据'}：${compactBriefText(scopedText, 240)}`,
      fix: '按 scene_cards.serial_risk_repairs 和 recent_fatigue_action 补成可见事件：目标推进、阻碍升级、新信息、关系/世界调剂或冲突冷却至少要在对应场景里有动作、对话、信息变化、关系反应或余波承接证据。',
      matched: asArray(actionMatch.matched).map((item: any) => String(item)).slice(0, 8),
    })
  })
  return checks
}
