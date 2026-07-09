function isLikelyChapterTitleLine(line: string) {
  return /^#{0,6}\s*第[一二三四五六七八九十百千万两0-9]+章(?:\s|$|[：:《「【_ -])/.test(String(line || '').trim())
}

function proseBodyWithoutTitleLine(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const firstContentLine = lines.findIndex(line => String(line || '').trim())
  if (firstContentLine >= 0 && isLikelyChapterTitleLine(lines[firstContentLine])) {
    lines.splice(firstContentLine, 1)
  }
  return lines.join('\n').trim()
}

const ENDING_HOOK_SIGNAL_PATTERN = /死|血|敲门|门外|敲|广播|规则|倒计时|必须(?:在|去|把|拿|杀|救|选|打开|交出|找到)|不能(?:再|让|离开|进入|打开)|如果|否则|发现|看见|露出|响起|停在|名字|名单|选择|代价|真相|危机|危险|突然|问|[？！!?“「]/
const ENDING_SUMMARY_UPLIFT_PATTERN = /经历了这一切|终于(?:明白|意识到|懂得)|明白(?:了)?|意识到|新的开始|才刚刚开始|未来(?:还有|会|将|可期)|前途无量|充满希望|更大的挑战|命运|宿命|注定(?:无人入眠|不会平静|改变)|这只是(?:一个)?开始|从此|就这样|生活的真谛|人生就是这样|放手才是最好的选择|一切都变了|崭新的一页|岁月如流水般悄然流逝|岁月如流水/
const ENDING_FINAL_SLOGAN_PATTERN = /生活的真谛|人生就是这样|放手才是最好的选择|未来可期|前途无量|充满希望|注定(?:无人入眠|不会平静|改变)|一切都变了|崭新的一页|岁月如流水般悄然流逝|岁月如流水/

export function scanEndingSummaryRisks(text: string) {
  const body = proseBodyWithoutTitleLine(text)
  const compactBody = body.replace(/\s+/g, '')
  const tail = compactBody.slice(-160)
  const evidence = body.replace(/\s+/g, ' ').slice(-240).trim()
  const hits: Array<{ gate: 'F'; pattern: string; status: 'warn'; evidence: string; fix: string }> = []
  if (!body) return hits
  ENDING_SUMMARY_UPLIFT_PATTERN.lastIndex = 0
  ENDING_FINAL_SLOGAN_PATTERN.lastIndex = 0
  ENDING_HOOK_SIGNAL_PATTERN.lastIndex = 0
  const hasSummaryUplift = ENDING_SUMMARY_UPLIFT_PATTERN.test(tail)
  const hasFinalSlogan = ENDING_FINAL_SLOGAN_PATTERN.test(tail)
  if (!hasSummaryUplift || (ENDING_HOOK_SIGNAL_PATTERN.test(tail) && !hasFinalSlogan)) return hits
  hits.push({
    gate: 'F',
    pattern: '章末总结升华/感悟收束',
    status: 'warn',
    evidence,
    fix: '删掉章末感悟、升华、“新的开始”或“岁月如流水”式感慨；这种感慨式结尾可以直接删掉，或改成读者可见的具体钩子：物件变化、门外声音、名单异常、倒计时、危险动作、未回答问题或角色必须立刻做出的选择。',
  })
  return hits
}
