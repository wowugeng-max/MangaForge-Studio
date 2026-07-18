import {
  REQUIRED_QUALITY_DIMENSIONS,
  compactQualityText,
  isFiniteQualityNumericValue,
} from './prose-quality-loop-core'
import type { ProseQualityFinding } from './prose-quality-loop-core'

export function buildFocusedProseReviewPrompt(input: {
  coreContract: any
  chapterText: string
  deterministicScan: any
}) {
  return [
    '任务：独立审查小说正文，只判断正文证据，不评价回执是否齐全。',
    `六维：${REQUIRED_QUALITY_DIMENSIONS.join('；')}。`,
    '分制合同：总体分 score 必须使用 0-100 分制，并固定输出 score_scale="0-100"；六个维度分别使用 0-10 分制。不得使用 5 分制或把维度平均值直接写入 score。',
    'S1/S2 必须引用正文中的可定位短句；没有证据只能给 S3 advisory。',
    '确定性扫描标为 advisory 或 status=warn 的词句只保留风格诊断；同一词句已被代码判为 advisory 时，不得仅凭同一词句命中升级为 S1/S2，最多给 S3。',
    '最多 6 个 blocking findings、4 个 advisory findings。分数不能覆盖硬失败。',
    `不可变核心合同：${JSON.stringify(input.coreContract || {}, null, 2)}`,
    `确定性扫描：${JSON.stringify(input.deterministicScan || {}, null, 2)}`,
    `正文：\n${String(input.chapterText || '')}`,
    '只输出 JSON：{"score":0,"score_scale":"0-100","publishable":false,"dimensions":{"continuity":0,"core_promise_agency":0,"conflict_causality":0,"payoff_hook":0,"prose_style":0,"fact_setting_safety":0},"findings":[{"key":"","severity":"S1|S2|S3","dimension":"","evidence":"正文短句","required_change":"可执行改法","acceptance_test":"复检条件"}]}',
  ].join('\n')
}

export function buildFocusedProseRevisionPrompt(input: {
  coreContract: any
  chapterText: string
  blockingFindings: ProseQualityFinding[]
  round: number
}) {
  return [
    `任务：执行第 ${input.round} 轮正文定向修订，返回完整章节正文。`,
    '只修复列出的 blocking findings；保留已经通过的维度、既有事实、角色状态、场景顺序和章末承诺。',
    '修订完成后必须对修订后全文重新扫描，不得只检查 finding 原句；不得新增小写英文粘连词、工程词或非中文正文。',
    '全文残留自检：不得留下“微微鼓胀”“没有一丝多余”“缓缓收回”“轻轻敲击”“犹如实质的毒液”这类已知修订残留；改成具体动作、事实或后果。',
    '不得输出审查说明、工程附录、Markdown 标题或下一章。',
    `不可变核心合同：${JSON.stringify(input.coreContract || {}, null, 2)}`,
    `blocking findings：${JSON.stringify((input.blockingFindings || []).slice(0, 6), null, 2)}`,
    `当前完整正文：\n${String(input.chapterText || '')}`,
    '只输出 JSON：{"chapter_text":"完整修订正文","revision_receipts":[{"key":"finding key","changed_evidence":"修后正文短句"}]}',
  ].join('\n')
}


export function isUsableProseQualityReviewPayload(value: any) {
  if (!value || typeof value !== 'object' || !isFiniteQualityNumericValue(value.score)) return false
  const score = Number(value.score)
  const scoreScale = compactQualityText(value.score_scale ?? value.scoreScale, 20)
  if (score < 0 || score > 100) return false
  if (scoreScale && scoreScale !== '0-100') return false
  if (!scoreScale && score > 0 && score <= 10) return false
  const dimensions = value.dimensions
  return Boolean(
    dimensions
      && typeof dimensions === 'object'
      && REQUIRED_QUALITY_DIMENSIONS.every(key => {
        if (!isFiniteQualityNumericValue(dimensions[key])) return false
        const dimensionScore = Number(dimensions[key])
        return Number.isFinite(dimensionScore) && dimensionScore >= 0 && dimensionScore <= 10
      }),
  )
}

