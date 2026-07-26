function compactText(value: any, limit = 220) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

function proseBody(text: string) {
  return String(text || '').replace(/\r/g, '')
}

function pushFinding(
  out: any[],
  key: string,
  label: string,
  evidence: string,
  fix: string,
  severity: 'blocking' | 'advisory' = 'blocking',
) {
  out.push({
    key,
    pattern: key,
    label,
    status: severity === 'blocking' ? 'fail' : 'warn',
    severity,
    blocking: severity === 'blocking',
    evidence: compactText(evidence, 240),
    fix: compactText(fix, 280),
    remaining_risk: severity === 'blocking' ? '毒句式未清会破坏网文自然度并透支读者耐心' : '建议压缩套路化表达',
  })
}

/** oh-story v0.7 toxic patterns: reverse-not-is / voice-contrast / negation-parade / trailer-ending */
export function scanToxicAiPatterns(text: string) {
  const body = proseBody(text)
  const out: any[] = []
  if (!body.trim()) return out

  const reverseNotIs = body.match(/不是[^。！？\n]{0,24}而是[^。！？\n]{0,40}[。！？]?/g) || []
  for (const hit of reverseNotIs.slice(0, 4)) {
    pushFinding(
      out,
      'reverse_not_is',
      '“不是A而是B”毒句式',
      hit,
      '改成直接陈述事实或动作结果，不要用“不是…而是…”装深刻。',
    )
  }

  const voiceContrast = body.match(/(温柔|平静|淡淡|轻声|温和)[^。！？\n]{0,12}(却|但)[^。！？\n]{0,16}(锋利|冰冷|杀意|可怕|狠厉)/g) || []
  for (const hit of voiceContrast.slice(0, 3)) {
    pushFinding(
      out,
      'voice_contrast',
      '声线反差套路',
      hit,
      '用具体动作、停顿、物件或对话信息差表现压迫，不要标签化“温柔却锋利”。',
    )
  }

  const negationParade = body.match(/(没有|不再|不[会再能肯愿])[^。！？\n]{0,10}[，,][^。！？\n]{0,10}(没有|不再|不[会再能肯愿])[^。！？\n]{0,10}[，,][^。！？\n]{0,10}(没有|不再|不[会再能肯愿])/g) || []
  for (const hit of negationParade.slice(0, 3)) {
    pushFinding(
      out,
      'negation_parade',
      '否定排比毒句式',
      hit,
      '删掉连续否定排比，改成一个具体变化、代价或行动结果。',
    )
  }

  const tail = body.slice(Math.max(0, body.length - 420))
  const trailerEnding = tail.match(/(他不知道的是|这意味着|正是因为|更大的风暴|只是开始|故事才刚刚|命运的齿轮|这一切背后)/)
  if (trailerEnding) {
    pushFinding(
      out,
      'trailer_ending',
      '预告收尾/作者预告',
      trailerEnding[0],
      '章末用未解决动作、新信息、关系变化或现场风险收束，不要作者预告式收尾。',
    )
  }

  const quoteEmphasis = body.match(/[“「][^”」]{1,8}[”」]/g) || []
  if (quoteEmphasis.length >= 6) {
    pushFinding(
      out,
      'quote_emphasis_tic',
      '引号强调癖',
      quoteEmphasis.slice(0, 6).join('、'),
      '减少无功能引号强调，只在专名、口令或必要术语时保留。',
      'advisory',
    )
  }

  const parallelTriad = body.match(/(?:[^。！？\n]{2,12}[，,][^。！？\n]{2,12}[，,][^。！？\n]{2,12}[。！？])/g) || []
  const literaryParallel = parallelTriad.filter(hit => /不仅|而且|既是|也是|仿佛|犹如|宛若|这一刻|心中|不禁/.test(hit))
  for (const hit of literaryParallel.slice(0, 3)) {
    pushFinding(
      out,
      'literary_parallel_triad',
      '书面排比对仗',
      hit,
      '拆掉连续对仗排比，改成一个具体动作、一句口语对白或一个现场结果；不要用整齐三段把情绪说满。',
    )
  }

  const abstractEmotion = body.match(/[他她我][^。！？\n]{0,6}(?:感到|觉得|意识到|明白了|内心|心中涌起|一股|莫名)[^。！？\n]{0,20}/g) || []
  for (const hit of abstractEmotion.slice(0, 4)) {
    pushFinding(
      out,
      'abstract_emotion_telling',
      '抽象情绪告知',
      hit,
      '删掉“感到/意识到/心中涌起”，改成手、眼睛、呼吸、物件或对白的可见反应。',
    )
  }

  const polishedConnectors = (body.match(/(?:与此同时|不仅如此|更为重要的是|换句话说|总而言之|由此可见|不可否认|毋庸置疑)/g) || [])
  if (polishedConnectors.length >= 2) {
    pushFinding(
      out,
      'essay_connector_stack',
      '议论文连接词堆叠',
      polishedConnectors.slice(0, 6).join('、'),
      '删掉议论文连接词，直接写下一动作或下一信息；网文靠事件推进，不靠总结过渡。',
    )
  }

  return out
}

export function hasToxicAiSkipMarker(text: string) {
  return /<!--\s*去味[:：]跳过\s*-->/.test(String(text || ''))
}

export function summarizeToxicAiDebt(text: string) {
  if (hasToxicAiSkipMarker(text)) {
    return {
      version: 'oh_story_toxic_ai_debt_v1',
      skipped: true,
      blocking_count: 0,
      advisory_count: 0,
      findings: [],
      label: '已标记去味跳过',
    }
  }
  const findings = scanToxicAiPatterns(text)
  const blocking = findings.filter(item => item.severity === 'blocking' || item.status === 'fail')
  const advisory = findings.filter(item => item.severity === 'advisory' || item.status === 'warn')
  return {
    version: 'oh_story_toxic_ai_debt_v1',
    skipped: false,
    blocking_count: blocking.length,
    advisory_count: advisory.length,
    findings,
    label: blocking.length
      ? `毒句式欠账 ${blocking.length}`
      : advisory.length
        ? `毒句式提示 ${advisory.length}`
        : '毒句式清零',
  }
}
