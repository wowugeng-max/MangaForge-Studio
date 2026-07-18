import { asArray } from '../../routes/novel-route-utils'
import { compactBriefText } from './text-utils'
import { preDraftReceiptCheckNeedsCarryOver } from './platform-carry-over'

export function proseQualitySerialRiskRepairRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.serial_risk_repair_checks || review?.serialRiskRepairChecks),
    ...asArray(selfCheck?.serial_risk_repair_checks || selfCheck?.serialRiskRepairChecks),
    ...asArray(payload?.serial_risk_repair_checks || payload?.serialRiskRepairChecks),
  ]
  return checks
    .filter(preDraftReceiptCheckNeedsCarryOver)
    .map((check: any) => {
      const label = compactBriefText(check?.label || check?.key || check?.name, '近章风险修复')
      const riskType = compactBriefText(check?.risk_type || check?.riskType || check?.type)
      const repairReceipt = compactBriefText(check?.repair_receipt || check?.repairReceipt || check?.receipt || check?.delivered_evidence || check?.deliveredEvidence)
      const continuityChange = compactBriefText(check?.continuity_change || check?.continuityChange)
      const stateChange = compactBriefText(check?.state_change || check?.stateChange)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || check?.required_action || check?.requiredAction || remainingRisk)
      const action = compactBriefText([
        `serial_risk_repair_checks.${label}`,
        riskType ? `risk_type=${riskType}` : '',
        repairReceipt ? `repair_receipt=${repairReceipt}` : '',
        continuityChange ? `continuity_change=${continuityChange}` : '',
        stateChange ? `state_change=${stateChange}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !riskType && !repairReceipt && !continuityChange && !stateChange && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        risk_type: riskType,
        repair_receipt: repairReceipt,
        continuity_change: continuityChange,
        state_change: stateChange,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}
