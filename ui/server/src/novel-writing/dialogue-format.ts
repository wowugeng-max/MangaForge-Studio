function isLikelyChapterTitleLine(line: string) {
  return /^#{0,6}\s*第[一二三四五六七八九十百千万两0-9]+章(?:\s|$|[：:《「【_ -])/.test(String(line || '').trim())
}

export function scanDialogueFormatRisks(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const firstContentLine = lines.findIndex(line => String(line || '').trim())
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; line: number }> = []
  lines.forEach((line, index) => {
    if (index === firstContentLine && isLikelyChapterTitleLine(line)) return
    const evidence = String(line || '').trim()
    if (!evidence) return
    const hasQuotedDialogue = /[“"「].+[”"」]/.test(evidence)
    if (!hasQuotedDialogue) return
    const standaloneDialogue = /^[“"「][^”"」]+[”"」][。！？!?，,；;：:]?$/.test(evidence)
    if (!standaloneDialogue) {
      hits.push({
        key: `dialogue_embedded_line_${index + 1}`,
        label: '对白格式扫描',
        status: 'warn',
        evidence,
        fix: '对白独立成行；把叙述动作、对白、对方反应拆成相邻自然段，不要把引号对白嵌在叙述段里。',
        line: index + 1,
      })
    }
    if (/(?:说(?:道|着|完)?|问道|答道|喊道|叫道|骂道|笑道|冷声道|沉声道|[\u4e00-\u9fa5]{1,6}道)[：:][“"「]|[”"」][，,。！？!?]?[他她我你]?(?:说(?:道|着|完)?|问道|答道|喊道|叫道|骂道|笑道|冷声道|沉声道)[。！？!?，,；;]?/.test(evidence)) {
      hits.push({
        key: `dialogue_mechanical_tag_line_${index + 1}`,
        label: '对白标签扫描',
        status: 'warn',
        evidence,
        fix: '减少机械“说道/她道/问道”标签，用动作或上下文承接说话人；两人连续对白优先靠内容区分。',
        line: index + 1,
      })
    }
  })
  return hits
}

export function scanDialogueQuoteStyleRisks(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const firstContentLine = lines.findIndex(line => String(line || '').trim())
  const doubleQuoteLines: Array<{ line: number; evidence: string }> = []
  const cornerQuoteLines: Array<{ line: number; evidence: string }> = []
  lines.forEach((line, index) => {
    if (index === firstContentLine && isLikelyChapterTitleLine(line)) return
    const evidence = String(line || '').trim()
    if (!evidence) return
    if (/["“][^"”]+["”]/.test(evidence)) doubleQuoteLines.push({ line: index + 1, evidence })
    if (/「[^」]+」/.test(evidence)) cornerQuoteLines.push({ line: index + 1, evidence })
  })
  if (!doubleQuoteLines.length || !cornerQuoteLines.length) return []
  return [{
    key: 'dialogue_quote_style_mixed',
    label: '对白引号风格扫描',
    status: 'warn' as const,
    evidence: [
      doubleQuoteLines[0]?.evidence,
      cornerQuoteLines[0]?.evidence,
    ].filter(Boolean).join(' / '),
    fix: '按项目/平台要求统一对白引号风格；番茄/短篇默认使用英文双引号，知乎盐言或项目指定时使用「」，同一章不要混用两套对白标记。',
    line: Math.min(doubleQuoteLines[0]?.line || Number.MAX_SAFE_INTEGER, cornerQuoteLines[0]?.line || Number.MAX_SAFE_INTEGER),
  }]
}
