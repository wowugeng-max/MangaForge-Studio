import {
  scanDialogueBreathRisks,
  scanDialoguePowerBalanceRisks,
  scanDialogueVoiceSamenessRisks,
} from '../../novel-writing/dialogue-balance'

import {
  normalizeDialogueAuditCheck,
  normalizeDialogueDriveCheck,
  normalizeDialogueGoalCheck,
  normalizeDialogueInformationEmbedCheck,
  normalizeDialoguePowerCheck,
  normalizeDialogueSubtextCheck,
  normalizeDialogueVoiceCheck,
} from '../../novel-writing/dialogue-contract-basics'

import {
  scanDialogueDensityRisks,
  scanDialogueProtagonistLineEconomyRisks,
  scanDialogueQuestionAnswerLoopRisks,
} from '../../novel-writing/dialogue-economy'

import {
  scanDialogueEasyPersuasionRisks,
  scanDialogueEmotionContinuityRisks,
} from '../../novel-writing/dialogue-emotion'

import {
  scanDialogueFormatRisks,
  scanDialogueQuoteStyleRisks,
} from '../../novel-writing/dialogue-format'

import {
  scanDialogueFunctionalFillerRisks,
} from '../../novel-writing/dialogue-functional'

import {
  scanDialogueDetachedJokeRisks,
  scanDialogueFlatCallbackRisks,
  scanDialogueHighPressureMemeRisks,
  scanDialogueHollowHumorPayoffRisks,
} from '../../novel-writing/dialogue-humor'

import {
  scanDialogueInfodumpRisks,
} from '../../novel-writing/dialogue-infodump'

import {
  scanDialogueEmptyPraiseRisks,
  scanDialogueJudgmentQuestionRisks,
  scanDialogueSubtextAgendaRisks,
} from '../../novel-writing/dialogue-intent'

import {
  normalizeDialogueSupportingSpeakerLimitCheck,
} from '../../novel-writing/dialogue-supporting-speakers'

import {
  scanDialogueToneRisks,
} from '../../novel-writing/dialogue-tone'

import {
  asArray,
} from '../../routes/novel-route-utils'

import {
  buildDialogueContract,
} from '../quality/continuity-dialogue-contracts'

import {
  compactBriefText,
} from '../quality/text-utils'

import {
  contextWithChapterRawPreDraftForSync,
} from './quality-sync-reports-benchmark'

export function dialogueContractForSync(contextPackage: any = {}, chapter: any = {}) {
  return buildDialogueContract(contextWithChapterRawPreDraftForSync(contextPackage, chapter)) || {}
}

export function buildDialogueFunctionalFillerCheck(chapterText: string) {
  const risks = scanDialogueFunctionalFillerRisks(chapterText)
  if (!risks.length) return null
  return {
    key: 'dialogue_functional_filler',
    label: '可删除对白',
    text: '每句对白必须承载推进剧情、增加期待感或展示人设之一；删掉这段对话后情节、期待和情绪都不受影响，则判定为水字数。',
    expected: '每句对白必须承载推进剧情、增加期待感或展示人设之一；删掉这段对话后情节、期待和情绪都不受影响，则判定为水字数。',
    score: Math.max(0, 100 - risks.length * 28),
    evidence: risks.map((item: any) => compactBriefText(item.evidence || item.fix || item.label)).filter(Boolean).slice(0, 8),
    delivered: false,
    status: 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: `正文触发 ${risks.length} 段对白删除测试风险。`,
    repair_instruction: '按 oh-story 对话删除测试修复：删掉这段对话后如果情节还能推进、期待感还在、情绪还到位，就直接删；必须保留时，把寒暄、附和、夸赞或复述改成新信息、悬念、行动、关系变化或角色独有声线。',
  }
}

export function buildDialogueDeterministicCheck(chapterText: string) {
  const risks = [
    ...scanDialogueToneRisks(chapterText),
    ...scanDialogueFormatRisks(chapterText),
    ...scanDialogueQuoteStyleRisks(chapterText),
    ...scanDialoguePowerBalanceRisks(chapterText),
    ...scanDialogueProtagonistLineEconomyRisks(chapterText),
    ...scanDialogueQuestionAnswerLoopRisks(chapterText),
    ...scanDialogueJudgmentQuestionRisks(chapterText),
    ...scanDialogueSubtextAgendaRisks(chapterText),
    ...scanDialogueEmptyPraiseRisks(chapterText),
    ...scanDialogueEmotionContinuityRisks(chapterText),
    ...scanDialogueEasyPersuasionRisks(chapterText),
    ...scanDialogueHighPressureMemeRisks(chapterText),
    ...scanDialogueDetachedJokeRisks(chapterText),
    ...scanDialogueFlatCallbackRisks(chapterText),
    ...scanDialogueHollowHumorPayoffRisks(chapterText),
    ...scanDialogueVoiceSamenessRisks(chapterText),
    ...scanDialogueBreathRisks(chapterText),
    ...scanDialogueDensityRisks(chapterText),
    ...scanDialogueInfodumpRisks(chapterText),
  ]
  if (!risks.length) return null
  return {
    key: 'dialogue_forbidden',
    label: '对白硬伤',
    text: '对白不得变成说明书、一问一答、同腔、空泛夸赞、容易说服、权力关系错位、对白墙或格式混乱。',
    expected: '对白不得变成说明书、一问一答、同腔、空泛夸赞、容易说服、权力关系错位、对白墙或格式混乱。',
    score: Math.max(0, 100 - risks.length * 10),
    evidence: risks.map((item: any) => compactBriefText(item.evidence || item.fix || item.label)).filter(Boolean).slice(0, 8),
    delivered: false,
    status: 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: `正文触发 ${risks.length} 项对白确定性风险。`,
    repair_instruction: '按 oh-story dialogue-mastery 修复：删说明书式对白，补潜台词、议程、声线差异、权力博弈和动作换气；情绪场景里逐句回应上一句对方的情绪状态，不能在恐惧/崩溃/求助后直接切流程；高压/生死/悲痛/严肃 beat 中让轻快声线让位，梗只在安全或喘息 beat 放；普通幽默来自角色欲望、偏见、固执或误判，不能脱离剧情讲段子；铺垫要短，回报要清晰，余波比包袱本身更重要；回调必须升级，至少更尴尬、更公开或更严重。',
  }
}

export function dialoguePriority(missed: any[]) {
  if (missed.some(item => item.key === 'supporting_speaker_limit_rules')) return '优先控配角台词人数'
  if (missed.some(item => item.key === 'dialogue_functional_filler')) return '优先删可删除对白'
  if (missed.some(item => item.key === 'dialogue_forbidden')) return '优先清对白硬伤'
  if (missed.some(item => item.key === 'dialogue_drive_rules')) return '优先补对白三功能'
  if (missed.some(item => item.key === 'information_embed_rules')) return '优先修信息嵌入'
  if (missed.some(item => item.key === 'dialogue_audit_rules')) return '优先做对话审计'
  if (missed.some(item => item.key === 'voice_differentiation_rules')) return '优先修声线差异'
  if (missed.some(item => item.key === 'subtext_agenda_rules')) return '优先补潜台词与议程'
  if (missed.some(item => item.key === 'power_length_rules')) return '优先补权力博弈'
  if (missed.some(item => item.key === 'dialogue_goals')) return '优先补对白目标'
  return ''
}

export function buildDialogueSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const mergedContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  const contract = dialogueContractForSync(contextPackage, chapter)
  const checks = [
    normalizeDialogueGoalCheck(contract.dialogue_goals || contract.dialogueGoals, contract.key_lines || contract.keyLines, contract.relationship_moves || contract.relationshipMoves, chapterText),
    normalizeDialoguePowerCheck(contract.power_length_rules || contract.powerLengthRules || contract.mode_playbooks || contract.modePlaybooks, chapterText),
    normalizeDialogueSubtextCheck(contract.subtext_agenda_rules || contract.subtextAgendaRules, chapterText),
    normalizeDialogueDriveCheck(contract.dialogue_drive_rules || contract.dialogueDriveRules, chapterText),
    normalizeDialogueInformationEmbedCheck(contract.information_embed_rules || contract.informationEmbedRules, chapterText),
    normalizeDialogueAuditCheck(contract.dialogue_audit_rules || contract.dialogueAuditRules, chapterText),
    buildDialogueFunctionalFillerCheck(chapterText),
    normalizeDialogueVoiceCheck(contract.voice_anchors || contract.voiceAnchors || contract.voice_differentiation_rules || contract.voiceDifferentiationRules, chapterText),
    normalizeDialogueSupportingSpeakerLimitCheck(contract.supporting_speaker_limit_rules || contract.supportingSpeakerLimitRules, mergedContextPackage, chapterText),
    buildDialogueDeterministicCheck(chapterText),
  ].filter(Boolean)
  const delivered = checks.filter((item: any) => item.delivered)
  const missed = checks.filter((item: any) => !item.delivered)
  const missedCount = missed.length
  const score = Math.max(0, Math.min(100, Math.round(
    checks.length ? checks.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / checks.length : 82,
  )))
  const status = missedCount > 0 || score < 78 ? 'warn' : 'ok'
  const priorityRepair = dialoguePriority(missed)

  return {
    report_id: `dialogue-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: checks.length === 0 ? '对白质量未配置' : status === 'ok' ? '对白质量 OK' : `对白缺口 ${missedCount}`,
    summary: checks.length === 0
      ? '本章没有配置 dialogue_contract，建议补充对白目标、权力博弈、潜台词与议程、对白三功能、信息嵌入、对话审计、声线差异和对白硬伤扫描。'
      : status === 'ok'
        ? '正文已基本兑现对白目标、权力博弈、潜台词与议程、对白三功能、信息嵌入、对话审计、声线差异和对白硬伤扫描。'
        : `正文有 ${missedCount} 项对白质量缺口，${priorityRepair || '优先修声线差异、潜台词与议程和说明书式对白'}。`,
    missed_count: missedCount,
    priority_repair: priorityRepair,
    quality_checks: asArray(contract.quality_checks || contract.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean).slice(0, 8),
    planned: checks,
    delivered,
    missed,
    next_actions: status === 'ok'
      ? ['保持对白质量：每句对白继续承担推进剧情、增加期待或展示人设；信息用角色语气、立场、追问、误导或动作承接；对话结尾继续预示下一步节奏，并保持声线差异和权力博弈。']
      : [
          '下一章必须补对白：删说明书式对白和问答式一问一答，让角色带着借口、试探、回避和行动反应说话。',
          '按权力地位重排句长：主角/掌控者短句亮底牌，被压制方长句辩解；每句对白至少承担推进剧情、增加期待或展示人设之一；信息型配角不能当科普嘴；让对话结尾预示接下来的节奏变化；同时拆出角色声线差异和动作换气；同一场景最多保留 3 个配角发言，其余合并为旁观反应、动作或叙事概括。',
      ],
  }
}

