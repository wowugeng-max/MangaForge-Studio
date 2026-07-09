import { anchorMatchScore } from './text-matching'

function compactText(value: any, limit = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

export function normalizeSignatureSceneBrief(value: any) {
  const source = value?.signature_scene_brief || value?.rollingPlan || value?.rolling_plan || value || {}
  const signatureScene = compactText(source.signature_scene || source.signatureScene || source.ip_scene || source.ipScene || source.visual_scene || source.visualScene || source.memorable_scene || source.memorableScene)
  const sceneRepairTarget = compactText(source.scene_repair_target || source.sceneRepairTarget || source.scene_gap_repair || source.sceneGapRepair || source.repair_target || source.repairTarget)
  const readerPayoff = compactText(source.reader_payoff || source.readerPayoff || source.reader_reward || source.readerReward || source.commercial_payoff || source.commercialPayoff || source.payoff)
  const storylineService = compactText(source.storyline_service || source.storylineService || source.mainline_service || source.mainlineService || source.storyline_advance || source.storylineAdvance || source.mainline_progress || source.mainlineProgress)
  const hasContent = signatureScene || sceneRepairTarget || readerPayoff || storylineService
  if (!hasContent) return null
  return {
    signature_scene: signatureScene,
    scene_repair_target: sceneRepairTarget,
    reader_payoff: readerPayoff,
    storyline_service: storylineService,
    source: compactText(source.source) || 'rolling_plan',
  }
}

export function normalizeSignatureSceneSyncBeat(key: string, label: string, text: any, threshold = 58) {
  const normalizedText = compactText(text, 180)
  return normalizedText ? { key, label, text: normalizedText, threshold } : null
}

export function signatureSceneSyncBeatMatch(beat: any, chapterText: string) {
  const match = anchorMatchScore(beat.text, chapterText)
  const delivered = match.score >= Number(beat.threshold || 58)
  return {
    ...beat,
    score: match.score,
    evidence: match.matched,
    delivered,
  }
}
