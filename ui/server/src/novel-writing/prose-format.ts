import { countProseChars } from './word-target'

function compactBriefText(value: any, fallback = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim()
}

function isLikelyChapterTitleLine(line: string) {
  return /^#{0,6}\s*第[一二三四五六七八九十百千万两0-9]+章(?:\s|$|[：:《「【_ -])/.test(String(line || '').trim())
}

function proseBodyWithoutTitleLine(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const firstContentLine = lines.findIndex(line => String(line || '').trim())
  if (firstContentLine >= 0 && isLikelyChapterTitleLine(lines[firstContentLine])) {
    lines.splice(firstContentLine, 1)
  }
  return lines.join('\n')
}

function splitProseSentences(text: string) {
  return (proseBodyWithoutTitleLine(text).replace(/\s+/g, '').match(/[^。！？!?]+[。！？!?]?/g) || [])
    .map(sentence => sentence.trim())
    .filter(sentence => countProseChars(sentence) >= 4)
}

const PUNCTUATION_HARD_PAUSE_PATTERN = /…+|\.{3,}|——|—|--+/g
const PUNCTUATION_RANDOM_PILE_PATTERN = /[!?？！]{3,}|[!?？！]{2,}(?=[”」'"]?$)/g
const CJK_PROSE_PATTERN = /[\u3400-\u9fff]/g
const LATIN_PROSE_PATTERN = /[A-Za-zÀ-ÖØ-öø-ÿ]+/g
const PORTUGUESE_SIGNAL_PATTERN = /\b(?:que|não|uma|com|para|está|você|ele|ela|dos|das|sua|seu|como|onde|silêncio|pergaminho|farmácia)\b/i
const PROSE_LANGUAGE_RISK_KEYS = new Set(['language_drift_latin_fragment', 'language_drift_non_chinese'])

export function scanProseLanguageRisks(text: string) {
  const body = proseBodyWithoutTitleLine(text).replace(/\s+/g, '')
  const cjkCount = (body.match(CJK_PROSE_PATTERN) || []).length
  const latinWords = body.match(LATIN_PROSE_PATTERN) || []
  const latinCharCount = latinWords.join('').length
  const lowercaseLatinFragments = latinWords
    .filter(word => /^[a-z]{2,}$/.test(word))
    .slice(0, 8)
  if (cjkCount >= 10 && lowercaseLatinFragments.length > 0) {
    return [{
      key: 'language_drift_latin_fragment',
      label: '中文正文夹杂英文碎片',
      status: 'fail',
      severity: 'blocking',
      evidence: lowercaseLatinFragments.join('、'),
      fix: '把夹在中文正文中的英文粘连词、翻译残留或拼音改成自然简体中文；不得输出葡萄牙语、英语或拼音正文，必要专名除外。',
      remaining_risk: '中文网文正文中仍有外语碎片，会破坏阅读沉浸。',
    }]
  }
  const totalSignalCount = cjkCount + latinCharCount
  if (totalSignalCount < 80) return []
  const cjkRatio = cjkCount / totalSignalCount
  const latinRatio = latinCharCount / totalSignalCount
  const looksPortuguese = PORTUGUESE_SIGNAL_PATTERN.test(String(text || ''))
  if (cjkRatio >= 0.45 || latinRatio < 0.45) return []
  return [{
    key: 'language_drift_non_chinese',
    label: '正文语言漂移',
    status: 'fail',
    severity: 'blocking',
    evidence: compactBriefText(String(text || '').slice(0, 240)),
    fix: looksPortuguese
      ? 'chapter_text 必须使用简体中文网文正文重写；不得输出葡萄牙语、英语或拼音正文，外国词只允许作为故事内必要专名少量出现。'
      : 'chapter_text 必须使用简体中文网文正文重写；不得输出外语、拼音或翻译腔正文，外国词只允许作为故事内必要专名少量出现。',
    remaining_risk: '当前正文主体不是简体中文，无法交付中文网文阅读体验。',
  }]
}

export function scanPunctuationToneRisks(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const firstContentLine = lines.findIndex(line => String(line || '').trim())
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; line: number }> = []
  lines.forEach((line, index) => {
    if (index === firstContentLine && isLikelyChapterTitleLine(line)) return
    const evidence = String(line || '').trim()
    if (!evidence) return
    PUNCTUATION_HARD_PAUSE_PATTERN.lastIndex = 0
    if (PUNCTUATION_HARD_PAUSE_PATTERN.test(evidence)) {
      hits.push({
        key: `punctuation_hard_pause_line_${index + 1}`,
        label: '语气标点谱系扫描',
        status: 'warn',
        evidence,
        fix: '把省略号、破折号或连续英文点改成动作停顿、短句、逗号、句号或换行；不要用硬标点制造犹豫、打断或拖长。',
        line: index + 1,
      })
    }
    PUNCTUATION_RANDOM_PILE_PATTERN.lastIndex = 0
    if (PUNCTUATION_RANDOM_PILE_PATTERN.test(evidence)) {
      hits.push({
        key: `punctuation_random_pile_line_${index + 1}`,
        label: '语气标点谱系扫描',
        status: 'warn',
        evidence,
        fix: '清理无功能问号/感叹号堆砌，只在质问、爆发或反问峰值保留有功能的单个标点，并用动作或短句承接情绪。',
        line: index + 1,
      })
    }
  })
  return hits
}

export function scanPeriodMonotonyRisks(text: string) {
  const sentences = splitProseSentences(text)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; line: number }> = []
  for (let index = 0; index <= sentences.length - 8; index += 1) {
    const window = sentences.slice(index, index + 8)
    const allPeriod = window.every(sentence => /。$/.test(sentence))
    const hasToneVariation = window.some(sentence => /[？！!?“「]/.test(sentence))
    if (!allPeriod || hasToneVariation) continue
    hits.push({
      key: 'punctuation_period_monotony',
      label: '通篇句号化扫描',
      status: 'warn',
      evidence: compactBriefText(window.join(''), 240),
      fix: '避免通篇句号化压平语气；按人物声线和情绪功能加入质问、反问、短促追问、爆点感叹、动作停顿或单句成段，让标点服务压迫、试探、爆发和迟疑。',
      line: index + 1,
    })
    break
  }
  return hits
}

export function scanProseFormatRisks(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const firstContentLine = lines.findIndex(line => String(line || '').trim())
  const bodyStart = firstContentLine >= 0 && isLikelyChapterTitleLine(lines[firstContentLine])
    ? firstContentLine + 1
    : Math.max(firstContentLine, 0)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string; line: number }> = []
  const chapterMarkerRows = lines
    .map((line, index) => {
      const evidence = String(line || '').trim()
      if (/^###\s*\d+[.．]\s*$/.test(evidence)) return { line: index + 1, style: '###1.', evidence }
      if (/^###\s*第[一二三四五六七八九十百千万两0-9]+章(?:\s|$)/.test(evidence)) return { line: index + 1, style: '###第一章', evidence }
      if (/^\d+[.．](?:\s|$)/.test(evidence)) return { line: index + 1, style: '1.', evidence }
      if (/^第[一二三四五六七八九十百千万两0-9]+章(?:\s|$|[：:《「【_ -])/.test(evidence)) return { line: index + 1, style: '第X章', evidence }
      return null
    })
    .filter(Boolean) as Array<{ line: number; style: string; evidence: string }>
  const markerStyles = new Set(chapterMarkerRows.map(row => row.style))
  if (chapterMarkerRows.length >= 2 && markerStyles.size > 1) {
    hits.push({
      key: 'format_chapter_marker_mixed',
      label: '章节标记格式扫描',
      status: 'warn',
      evidence: compactBriefText(chapterMarkerRows.map(row => row.evidence).join(' / '), 240),
      fix: '全文统一一种章节标记格式：只使用 ###1.、###第一章、1. 或项目指定格式中的一种，不要混用短篇小节、中文章节和纯数字标记。',
      line: chapterMarkerRows[0].line,
    })
  }
  let bodyStarted = false
  let previousBlank = false
  lines.forEach((line, index) => {
    if (index < bodyStart) return
    const raw = String(line || '')
    const evidence = raw.trim()
    if (!evidence) {
      if (previousBlank) {
        hits.push({
          key: `format_blank_line_${index + 1}`,
          label: '正文格式扫描',
          status: 'warn',
          evidence: '多余空行',
          fix: '合并多余空行；网文段落之间保留一个空行即可，不要出现两个以上连续空行。',
          line: index + 1,
        })
      }
      if (bodyStarted || index >= bodyStart) previousBlank = true
      return
    }
    bodyStarted = true
    previousBlank = false
    if (/^[\s　]+/.test(raw)) {
      hits.push({
        key: `format_indentation_line_${index + 1}`,
        label: '正文格式扫描',
        status: 'warn',
        evidence,
        fix: '删除段首缩进和全角空格，平台会自行处理排版；正文行直接从文字或对话开始。',
        line: index + 1,
      })
    }
    if (/^(#{1,6}\s|>\s|[-*+]\s|```|---+$)/.test(evidence) || /\*\*[^*]+\*\*|__[^_]+__|`[^`]+`/.test(evidence)) {
      hits.push({
        key: `format_markdown_line_${index + 1}`,
        label: '正文格式扫描',
        status: 'warn',
        evidence,
        fix: '删除正文 Markdown 标记；除章节/小节标记外，正文不使用标题、加粗、引用、列表、代码或分隔线语法。',
        line: index + 1,
      })
    }
  })
  return hits
}

function getYamlFrontMatterEndIndex(lines: string[]) {
  if (!lines[0] || String(lines[0]).trim() !== '---') return -1
  let sawYamlField = false
  for (let index = 1; index < Math.min(lines.length, 40); index += 1) {
    const trimmed = String(lines[index] || '').trim()
    if (trimmed === '---') return sawYamlField ? index : -1
    if (/^[A-Za-z0-9_-]+:\s*/.test(trimmed)) sawYamlField = true
  }
  return -1
}

export function maskYamlFrontMatterForProseScans(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const yamlFrontMatterEndIndex = getYamlFrontMatterEndIndex(lines)
  if (yamlFrontMatterEndIndex < 0) return String(text || '')
  return lines
    .map((line, index) => (index <= yamlFrontMatterEndIndex ? '' : String(line || '')))
    .join('\n')
}

export function normalizeDeterministicProseFormat(text: string) {
  const rules = new Set<string>()
  let changeCount = 0
  const lines = String(text || '').split(/\r?\n/)
  const yamlFrontMatterEndIndex = getYamlFrontMatterEndIndex(lines)
  const firstContentLine = lines.findIndex(line => String(line || '').trim())
  const bodyStart = firstContentLine >= 0 && isLikelyChapterTitleLine(lines[firstContentLine])
    ? firstContentLine + 1
    : Math.max(firstContentLine, 0)
  const nextLines: string[] = []
  let previousBlank = false
  lines.forEach((line, index) => {
    let next = String(line || '')
    if (yamlFrontMatterEndIndex >= 0 && index <= yamlFrontMatterEndIndex) {
      nextLines.push(next)
      return
    }
    if (index >= bodyStart && !next.trim()) {
      if (previousBlank) {
        rules.add('blank_lines_removed')
        changeCount += 1
        return
      }
      previousBlank = true
      nextLines.push('')
      if (next !== '') {
        rules.add('blank_line_trimmed')
        changeCount += 1
      }
      return
    }
    previousBlank = false
    if (index >= bodyStart && /^[\s　]+/.test(next)) {
      const trimmed = next.replace(/^[\s　]+/, '')
      if (trimmed !== next) {
        rules.add('indentation_removed')
        changeCount += 1
        next = trimmed
      }
    }
    if (index >= bodyStart) {
      const replacements: Array<{ pattern: RegExp; replacement: string; rule: string }> = [
        { pattern: /^\s*>\s*/, replacement: '', rule: 'markdown_quote_marker_removed' },
        { pattern: /^\s*[-*+]\s+/, replacement: '', rule: 'markdown_list_marker_removed' },
        { pattern: /\*\*([^*]+)\*\*/g, replacement: '$1', rule: 'markdown_bold_removed' },
        { pattern: /__([^_]+)__/g, replacement: '$1', rule: 'markdown_bold_removed' },
        { pattern: /`([^`]+)`/g, replacement: '$1', rule: 'markdown_code_marker_removed' },
      ]
      for (const { pattern, replacement, rule } of replacements) {
        next = next.replace(pattern, (...args: any[]) => {
          const original = args[0]
          const replaced = typeof replacement === 'string'
            ? replacement.replace(/\$(\d+)/g, (_match, groupIndex) => args[Number(groupIndex)] || '')
            : replacement
          if (replaced !== original) {
            rules.add(rule)
            changeCount += 1
          }
          return replaced
        })
      }
      if (/^\s*---+\s*$/.test(next) || /^\s*```\s*$/.test(next)) {
        rules.add('markdown_block_marker_removed')
        changeCount += 1
        return
      }
    }
    nextLines.push(next)
  })
  const normalized = nextLines.join('\n')
  return {
    text: normalized,
    changed: normalized !== String(text || ''),
    change_count: changeCount,
    rules: Array.from(rules),
  }
}

export function normalizeDeterministicProseLanguageFragments(text: string) {
  const rules = new Set<string>()
  let changeCount = 0
  const lines = String(text || '').split(/\r?\n/)
  const yamlFrontMatterEndIndex = getYamlFrontMatterEndIndex(lines)
  let inFence = false
  const replacements: Array<{ pattern: RegExp; replacement: string; rule: string }> = [
    { pattern: /([\u3400-\u9fff])\s+and\s+([\u3400-\u9fff])/g, replacement: '$1和$2', rule: 'latin_and_to_chinese' },
    { pattern: /([\u3400-\u9fff])\s+or\s+([\u3400-\u9fff])/g, replacement: '$1或$2', rule: 'latin_or_to_chinese' },
    { pattern: /([\u3400-\u9fff])\s+of\s*([\u3400-\u9fff])/gi, replacement: '$1的$2', rule: 'latin_of_to_chinese' },
    { pattern: /([\u3400-\u9fff])\s+but\s+([\u3400-\u9fff])/g, replacement: '$1，但$2', rule: 'latin_but_to_chinese' },
    { pattern: /([，,。！？!?；;：:\s])but\s+([\u3400-\u9fff])/g, replacement: '$1但$2', rule: 'latin_but_to_chinese' },
    { pattern: /(^|[，,。！？!?；;：:\s])his\s*(?=[\u3400-\u9fff])/gi, replacement: '$1他的', rule: 'latin_pronoun_to_chinese' },
    { pattern: /(^|[，,。！？!?；;：:\s])her\s*(?=[\u3400-\u9fff])/gi, replacement: '$1她的', rule: 'latin_pronoun_to_chinese' },
    { pattern: /(^|[，,。！？!?；;：:\s])its\s*(?=[\u3400-\u9fff])/gi, replacement: '$1它的', rule: 'latin_pronoun_to_chinese' },
    { pattern: /空气[中里]?弥漫(?:着|起|开)?([^。！？!?\n]{1,80})([。！？!?])/g, replacement: '$1压进喉咙$2', rule: 'ai_scene_template_grounded' },
  ]
  const nextLines = lines.map((line, index) => {
    let next = String(line || '')
    if (next.trim().startsWith('```')) {
      inFence = !inFence
      return next
    }
    if (inFence || (yamlFrontMatterEndIndex >= 0 && index <= yamlFrontMatterEndIndex)) return next
    for (const { pattern, replacement, rule } of replacements) {
      next = next.replace(pattern, (...args: any[]) => {
        const original = args[0]
        const replaced = replacement.replace(/\$(\d+)/g, (_match, groupIndex) => args[Number(groupIndex)] || '')
        if (replaced !== original) {
          rules.add(rule)
          changeCount += 1
        }
        return replaced
      })
    }
    return next
  })
  const normalized = nextLines.join('\n')
  return {
    text: normalized,
    changed: normalized !== String(text || ''),
    change_count: changeCount,
    rules: Array.from(rules),
  }
}

export function normalizeProseQualityRepairResidue(text: string) {
  const rules = new Set<string>()
  let changeCount = 0
  const lines = String(text || '').split(/\r?\n/)
  const yamlFrontMatterEndIndex = getYamlFrontMatterEndIndex(lines)
  let inFence = false
  const replacements: Array<{ pattern: RegExp; replacement: string; rule: string }> = [
    { pattern: /([\u3400-\u9fff])\s+and\s+([\u3400-\u9fff])/g, replacement: '$1和$2', rule: 'latin_and_to_chinese' },
    { pattern: /([\u3400-\u9fff])\s+or\s+([\u3400-\u9fff])/g, replacement: '$1或$2', rule: 'latin_or_to_chinese' },
    { pattern: /([\u3400-\u9fff])\s+of\s*([\u3400-\u9fff])/gi, replacement: '$1的$2', rule: 'latin_of_to_chinese' },
    { pattern: /([\u3400-\u9fff])\s+but\s+([\u3400-\u9fff])/g, replacement: '$1，但$2', rule: 'latin_but_to_chinese' },
    { pattern: /微微(?=鼓胀)/g, replacement: '', rule: 'quality_repair_weak_adverb_removed' },
    { pattern: /缓缓(?=收回|收手)/g, replacement: '', rule: 'quality_repair_weak_adverb_removed' },
    { pattern: /轻轻(?=敲|敲击)/g, replacement: '', rule: 'quality_repair_weak_adverb_removed' },
    { pattern: /没有一丝(?=多余)/g, replacement: '没有', rule: 'quality_repair_weak_quantifier_removed' },
    { pattern: /犹如实质的(?=毒液)/g, replacement: '像泼下的', rule: 'quality_repair_stock_metaphor_grounded' },
  ]
  const nextLines = lines.map((line, index) => {
    let next = String(line || '')
    if (next.trim().startsWith('```')) {
      inFence = !inFence
      return next
    }
    if (inFence || (yamlFrontMatterEndIndex >= 0 && index <= yamlFrontMatterEndIndex)) return next
    for (const { pattern, replacement, rule } of replacements) {
      next = next.replace(pattern, (...args: any[]) => {
        const original = args[0]
        const replaced = replacement.replace(/\$(\d+)/g, (_match, groupIndex) => args[Number(groupIndex)] || '')
        if (replaced !== original) {
          rules.add(rule)
          changeCount += 1
        }
        return replaced
      })
    }
    return next
  })
  const normalized = nextLines.join('\n')
  return {
    text: normalized,
    changed: normalized !== String(text || ''),
    change_count: changeCount,
    rules: Array.from(rules),
  }
}

export function normalizeDeterministicProseDeslopTerms(text: string) {
  const rules = new Set<string>()
  let changeCount = 0
  const lines = String(text || '').split(/\r?\n/)
  const yamlFrontMatterEndIndex = getYamlFrontMatterEndIndex(lines)
  let inFence = false
  const replacements: Array<{ pattern: RegExp; replacement: string; rule: string }> = [
    { pattern: /微微(?=一僵|一震|僵住|发僵|皱眉|抬头|低头|点头|摇头|一顿|顿住|发抖|颤动|收紧|松开|侧身|偏头)/g, replacement: '', rule: 'weak_adverb_removed' },
    { pattern: /缓缓(?=收回|抬起|落下|推开|合上|转身|开口|走近|退后|举起|放下|转动|移动|伸出|闭合|褪去|散去)/g, replacement: '', rule: 'weak_adverb_removed' },
    { pattern: /轻轻(?=敲|推|放|碰|按|扣|合上|压住|点头|摇头|叹气)/g, replacement: '', rule: 'weak_adverb_removed' },
    { pattern: /淡淡(?=开口|说道|说|看|扫|笑|问)/g, replacement: '', rule: 'weak_adverb_removed' },
    { pattern: /剧烈地(?=摇晃|蠕动|抽搐|颤动|起伏|震颤)/g, replacement: '', rule: 'weak_adverb_removed' },
    { pattern: /在(?:这|那)一瞬间/g, replacement: '这时', rule: 'instant_adverb_grounded' },
    { pattern: /(?:这|那)一瞬间/g, replacement: '这时', rule: 'instant_adverb_grounded' },
    { pattern: /无声地(?=跟|走|靠|贴|退|绕|移动|滑|伸|探|裂|裂开|张开|合拢)/g, replacement: '', rule: 'weak_adverb_removed' },
    { pattern: /不远不近地(?=跟随|跟|随)/g, replacement: '隔着几步', rule: 'weak_adverb_removed' },
    { pattern: /[，,]带着/g, replacement: '，领着', rule: 'with_phrase_grounded' },
    { pattern: /无声炸开[，,]顺着/g, replacement: '炸开，沿着', rule: 'mechanical_action_chain_grounded' },
    { pattern: /顺着([^。！？!?；;\n]{1,24})瞬间钻入/g, replacement: '沿着$1钻进', rule: 'mechanical_action_chain_grounded' },
    { pattern: /瞬间钻入/g, replacement: '钻进', rule: 'mechanical_action_chain_grounded' },
    { pattern: /砸在([^。！？!?；;\n，,]{1,40})[，,]嗤地一声蚀出深坑[，,]冒出([^。！？!?；;\n]{1,40})/g, replacement: '砸在$1。青砖嗤地蚀出深坑，$2', rule: 'mechanical_parallel_sentence_split' },
    { pattern: /又看向([^，,。！？!?；;\n]{1,40})[，,]兜帽阴影下的([^，,。！？!?；;\n]{1,24})剧烈蠕动着[，,]却([^。！？!?；;\n]{1,30})/g, replacement: '视线落向$1。兜帽阴影下的$2动了动，却$3', rule: 'mechanical_parallel_sentence_split' },
    { pattern: /(江哲)收回右手[，,]五指在掌心攥紧[，,]遮住了?([^。！？!?；;\n]{1,40})/g, replacement: '$1收回右手。五指攥紧，遮住$2', rule: 'mechanical_parallel_sentence_split' },
    { pattern: /这老头显然看出了黑袍男人的意图[，,]对方在拿他当筹码[，,]逼([^。！？!?；;\n]{1,50})/g, replacement: '老头盯住黑袍男人。对方拿他当筹码，逼$1', rule: 'mechanical_parallel_sentence_split' },
    { pattern: /老陈胸前的墨斑再次剧烈地收缩[，,]勒得他喉咙里发出微弱的声响[，,]再也说不出一个字/g, replacement: '老陈胸前的墨斑再次收紧。喉咙里挤出一点气音，他再也说不出字', rule: 'mechanical_parallel_sentence_split' },
    { pattern: /他转过身[，,]一步踏碎了地上的石板[，,]毅然迈步走向了([^。！？!?；;\n]{1,60})/g, replacement: '他转过身。脚下石板碎开，他迈向$1', rule: 'mechanical_parallel_sentence_split' },
    { pattern: /几道比白衣祭司更强横、带着恐怖威压的猩红复眼[，,]此刻正一只只睁开[，,]贪婪而阴冷地俯瞰着下方街区/g, replacement: '几道比白衣祭司更强的猩红复眼在雾顶睁开。下方街区被红光扫过', rule: 'mechanical_parallel_sentence_split' },
    { pattern: /但江哲面无表情地迈出一步[，,]右掌稳稳地贴在了青铜右盘上[，,]掌心与金属表面接触/g, replacement: '江哲迈出一步。右掌贴上青铜右盘', rule: 'mechanical_parallel_sentence_split' },
    { pattern: /无数绿色的数据流(?:疯狂|急速|极速)闪烁[，,]甚至因为数据过载而发出了极其微弱的滋滋声[，,]镜片表面甚至出现了一道细微的裂纹/g, replacement: '镜片里的绿色数据流急速闪烁。细裂纹爬上镜片', rule: 'mechanical_parallel_sentence_split' },
    { pattern: /江哲的超人视力清晰地看到[，,]天平的左盘上[，,]已经开始有一根根由([^。！？!?；;\n]{1,24})凝聚而成的([^。！？!?；;\n]{1,24})在浮现/g, replacement: '天平左盘浮出一根根$1凝成的$2', rule: 'perception_filter_sentence_grounded' },
    { pattern: /那些死线在空气中发出滋滋的腐蚀声[，,]凡是触碰到的物质[，,]无论是([^，,。！？!?；;\n]{1,24})还是([^，,。！？!?；;\n]{1,24})(?:[，,]都会被[^。！？!?；;\n]+)?/g, replacement: '死线擦过空气，滋滋作响。$1和$2被黑痕咬住', rule: 'universal_clause_grounded' },
    { pattern: /那些足以在瞬间将([^，,。！？!?；;\n]{1,24})消融成黑水的死线[，,]在接触到([^，,。！？!?；;\n]{1,24})的一瞬间[，,]却像找不到入口的毒虫/g, replacement: '那些足以把$1消融成黑水的死线，刚碰到$2就失去入口', rule: 'instant_metaphor_grounded' },
    { pattern: /甚至连([^，,。！？!?；;\n]{1,40})[，,]也只是在([^，,。！？!?；;\n]{1,24})停留了不到半秒[，,]便被彻底压进皮下[，,]转化为([^。！？!?；;\n]{1,40})/g, replacement: '$1只在$2停了半秒。皮下多出$3', rule: 'explanation_connector_removed' },
    { pattern: /甚至连([^，,。！？!?；;\n]{1,40})[，,]也只是在([^，,。！？!?；;\n]{1,24})停留了不到半秒[，,]便被彻底压进皮下/g, replacement: '$1只在$2停了半秒。黑痕压进皮下', rule: 'explanation_connector_removed' },
    { pattern: /阴冷的潮汐/g, replacement: '潮声', rule: 'stock_visual_phrase_grounded' },
    { pattern: /闪烁着光芒/g, replacement: '明灭', rule: 'stock_visual_phrase_grounded' },
    { pattern: /宛如一条咆哮的银龙/g, replacement: '银线绞成一束', rule: 'stock_metaphor_grounded' },
    { pattern: /像([^。！？!?；;，,\n]{1,18})般/g, replacement: '$1一样', rule: 'stock_metaphor_grounded' },
    { pattern: /狠狠地(?=扎|刺|砸|撞|压|按|踩)/g, replacement: '', rule: 'stock_metaphor_grounded' },
    { pattern: /喉咙里发出低哑的嗬嗬声/g, replacement: '喉咙里挤出破碎气音', rule: 'stock_throat_sound_grounded' },
    { pattern: /疯狂(?=汇聚|聚拢|律动|蔓延|扩散|翻涌|蠕动|闪烁)/g, replacement: '急速', rule: 'frenzy_adverb_grounded' },
    { pattern: /疯狂地(?=朝|向|往|钻|蔓延|扩散|翻涌)/g, replacement: '', rule: 'frenzy_adverb_grounded' },
    { pattern: /冰冷的?(?=判定|结果|数字|名单|规则|回执|提示|记录|编号|结论|事实)/g, replacement: '', rule: 'abstract_cold_result_grounded' },
    { pattern: /[，,]\s*不带一丝杂质/g, replacement: '', rule: 'absolute_purity_grounded' },
    { pattern: /不带一丝杂质/g, replacement: '线条清楚', rule: 'absolute_purity_grounded' },
    { pattern: /不带半点温度地/g, replacement: '', rule: 'abstract_cold_result_grounded' },
    { pattern: /不带半点温度/g, replacement: '板着脸', rule: 'abstract_cold_result_grounded' },
    { pattern: /冰冷的?/g, replacement: '', rule: 'cold_banned_term_removed' },
    { pattern: /隐约(?=露出|显出|浮出|出现|透出|传来|看见|听见)/g, replacement: '', rule: 'vague_visibility_grounded' },
    { pattern: /(^|[。！？!?；;\n]\s*)[^。！？!?；;，,\n]{1,8}(?:终于|这才|忽然|突然)?(?:明白|意识到)[，,]/g, replacement: '$1', rule: 'mental_telling_prefix_removed' },
    { pattern: /原来([^。！？!?；;\n]{1,40})[，,]不仅是([^。！？!?；;\n]{1,30})[，,]更是/g, replacement: '$1是$2，也是', rule: 'contrast_explanation_simplified' },
    { pattern: /那不是(?:普通|物理意义上|偶然)[^。！？!?；;\n]{1,50}[，,](?:而)?是/g, replacement: '', rule: 'contrast_explanation_simplified' },
    { pattern: /这并非[^。！？!?；;\n]{1,40}[，,](?:而)?是/g, replacement: '这', rule: 'contrast_explanation_simplified' },
    { pattern: /并非[^。！？!?；;\n]{1,40}[，,](?:而)?是/g, replacement: '', rule: 'contrast_explanation_simplified' },
    { pattern: /不仅如此[，,]/g, replacement: '', rule: 'explanation_connector_removed' },
    { pattern: /这意味着[，,]/g, replacement: '', rule: 'explanation_connector_removed' },
    { pattern: /这个(?:发现|意外的收获)让[^。！？!?；;\n]{1,16}心中大定[。！？!?]/g, replacement: '', rule: 'mental_telling_sentence_removed' },
  ]
  const nextLines = lines.map((line, index) => {
    let next = String(line || '')
    if (next.trim().startsWith('```')) {
      inFence = !inFence
      return next
    }
    if (inFence || (yamlFrontMatterEndIndex >= 0 && index <= yamlFrontMatterEndIndex)) return next
    for (const { pattern, replacement, rule } of replacements) {
      next = next.replace(pattern, (...args: any[]) => {
        const original = args[0]
        const replaced = replacement.replace(/\$(\d+)/g, (_match, groupIndex) => args[Number(groupIndex)] || '')
        if (replaced !== original) {
          rules.add(rule)
          changeCount += 1
        }
        return replaced
      })
    }
    return next
  })
  const normalized = nextLines.join('\n')
  return {
    text: normalized,
    changed: normalized !== String(text || ''),
    change_count: changeCount,
    rules: Array.from(rules),
  }
}

export function filterResolvedProseLanguageRiskChecks(checks: any[] = [], text: string) {
  const remainingRiskKeys = new Set(scanProseLanguageRisks(text).map((item: any) => String(item?.key || '')))
  return (Array.isArray(checks) ? checks : []).filter((check: any) => {
    const key = String(check?.key || '')
    if (!PROSE_LANGUAGE_RISK_KEYS.has(key)) return true
    return remainingRiskKeys.has(key)
  })
}

export function resolveProseLanguageRiskReview(review: any, text: string) {
  if (!review || typeof review !== 'object') return review
  const snakeChecks = Array.isArray(review.quality_audit_checks) ? review.quality_audit_checks : null
  const camelChecks = Array.isArray(review.qualityAuditChecks) ? review.qualityAuditChecks : null
  const nextSnakeChecks = snakeChecks ? filterResolvedProseLanguageRiskChecks(snakeChecks, text) : null
  const nextCamelChecks = camelChecks ? filterResolvedProseLanguageRiskChecks(camelChecks, text) : null
  const snakeChanged = Boolean(snakeChecks && nextSnakeChecks && nextSnakeChecks.length !== snakeChecks.length)
  const camelChanged = Boolean(camelChecks && nextCamelChecks && nextCamelChecks.length !== camelChecks.length)
  if (!snakeChanged && !camelChanged) return review
  return {
    ...review,
    ...(snakeChecks ? { quality_audit_checks: nextSnakeChecks } : {}),
    ...(camelChecks ? { qualityAuditChecks: nextCamelChecks } : {}),
  }
}

const ENGINEERING_APPENDIX_MARKER_PATTERN = /oh_story_delivery_receipts|delivery_receipts|chapter_blueprint|scene_card_receipts|delivery_risk_receipts|pre_draft_execution_receipts|revision_receipts|quality_audit_repair_receipts|target_emotion|beat_sequence|artifact_protocol_receipts/

export function stripProseEngineeringAppendix(text: string) {
  const source = String(text || '')
  const lines = source.split(/\r?\n/)
  let appendixStart = -1
  for (let index = 0; index < lines.length; index += 1) {
    const evidence = String(lines[index] || '').trim()
    const lookAhead = lines.slice(index, index + 8).join('\n')
    if (/^---+$/.test(evidence) && ENGINEERING_APPENDIX_MARKER_PATTERN.test(lookAhead)) {
      appendixStart = index
      break
    }
    if (/^#{2,}\s*/.test(evidence) && ENGINEERING_APPENDIX_MARKER_PATTERN.test(evidence)) {
      appendixStart = index
      break
    }
  }
  if (appendixStart < 0) {
    return {
      text: source,
      changed: false,
      removed_line_count: 0,
    }
  }
  const nextText = lines.slice(0, appendixStart).join('\n').replace(/\s+$/g, '')
  return {
    text: nextText,
    changed: nextText !== source,
    removed_line_count: lines.length - appendixStart,
  }
}

export function normalizeDeterministicProsePunctuation(text: string) {
  const rules = new Set<string>()
  let changeCount = 0
  const lines = String(text || '').split(/\r?\n/)
  const yamlFrontMatterEndIndex = getYamlFrontMatterEndIndex(lines)
  let inFence = false
  const nextLines = lines.map((line, index) => {
    let next = String(line || '')
    if (next.trim().startsWith('```')) {
      inFence = !inFence
      return next
    }
    if (inFence) {
      return next
    }
    if (yamlFrontMatterEndIndex >= 0 && index <= yamlFrontMatterEndIndex) {
      return next
    }
    if (/^\s*---+\s*$/.test(next)) {
      rules.add('standalone_rule_line_removed')
      changeCount += 1
      return ''
    }
    const replacements: Array<{ pattern: RegExp; replacement: string | ((match: string) => string); rule: string }> = [
      { pattern: /\d+(?:\.\d+)?\s*(?:——|--|—|–|-)\s*\d+(?:\.\d+)?/g, replacement: match => match.replace(/\s*(?:——|--|—|–|-)\s*/, '到'), rule: 'numeric_range_to_chinese' },
      { pattern: /^(\s*)(?:…+|\.{3,}|——|—|--+)/g, replacement: match => match.match(/^\s*/)?.[0] || '', rule: 'leading_pause_removed' },
      { pattern: /([「『（(“‘])(?:…+|\.{3,}|——|—|--+)/g, replacement: match => match.slice(0, 1), rule: 'opening_pause_removed' },
      { pattern: /([^，,。.!！?？;；:：…])(?:…+|\.{3,}|——|—|--+)(["”」』])/g, replacement: match => match.replace(/(?:…+|\.{3,}|——|—|--+)/, '。'), rule: 'closing_quote_pause_to_period' },
      { pattern: /(?:…+|\.{3,}|——|—|--+)(?=\s*(?:因为|原来|这是|那是|也就是|换句话|说白了|所谓|答案|原因|结果|真相|问题在于))/g, replacement: '：', rule: 'explanation_pause_to_colon' },
      { pattern: /(?:原因|答案|真相|结果|结论|问题|选择|意思)(?:…+|\.{3,}|——|—|--+)/g, replacement: match => match.replace(/(?:…+|\.{3,}|——|—|--+)/, '：'), rule: 'explanation_pause_to_colon' },
      { pattern: /(?:…+|\.{3,}|——|—|--+)(?=\s*(?:[，,。.!！?？;；:：、…"“”'‘’」』）)]))/g, replacement: '', rule: 'punctuation_adjacent_pause_removed' },
      { pattern: /([，,。.!！?？;；:：…])(?:…+|\.{3,}|——|—|--+)/g, replacement: match => match.replace(/(?:…+|\.{3,}|——|—|--+)/, ''), rule: 'punctuation_adjacent_pause_removed' },
      { pattern: /([^，,。.!！?？;；:：…])(?:…+|\.{3,}|——|—|--+)\s*$/g, replacement: match => match.replace(/(?:…+|\.{3,}|——|—|--+)\s*$/, '。'), rule: 'terminal_pause_to_period' },
      { pattern: /([，,。.!！?？;；:：…])(?:…+|\.{3,}|——|—|--+)\s*$/g, replacement: match => match.replace(/(?:…+|\.{3,}|——|—|--+)\s*$/, ''), rule: 'terminal_pause_removed' },
      { pattern: /…+|\.{3,}/g, replacement: '，', rule: 'ellipsis_to_comma' },
      { pattern: /——|—|--+/g, replacement: '，', rule: 'dash_to_comma' },
    ]
    for (const { pattern, replacement, rule } of replacements) {
      next = next.replace(pattern, (...args: any[]) => {
        const original = args[0]
        const replacementText = typeof replacement === 'function' ? replacement(original) : replacement
        if (replacementText !== original) {
          rules.add(rule)
          changeCount += 1
        }
        return replacementText
      })
    }
    return next
  })
  const normalized = nextLines.join('\n').replace(/，([。！？!?])/g, '$1')
  return {
    text: normalized,
    changed: normalized !== String(text || ''),
    change_count: changeCount,
    rules: Array.from(rules),
  }
}
