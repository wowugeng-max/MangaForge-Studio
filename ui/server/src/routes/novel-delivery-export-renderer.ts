import JSZip from 'jszip'

export type NovelExportFormat = 'txt' | 'markdown' | 'docx' | 'epub'

export function exportWordCount(text?: string) {
  return String(text || '').replace(/\s/g, '').length
}

export function sanitizeExportFilename(value: any) {
  return String(value || 'novel-project')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'novel-project'
}

function exportLine(format: NovelExportFormat, text = '') {
  return format === 'markdown' ? text : text
}

export function normalizeExportFormat(value: any): NovelExportFormat {
  const raw = String(value || '').toLowerCase()
  if (raw === 'docx') return 'docx'
  if (raw === 'epub') return 'epub'
  return raw === 'md' || raw === 'markdown' ? 'markdown' : 'txt'
}

function xmlEscape(value: any) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function htmlEscape(value: any) {
  return xmlEscape(value)
}

export function renderNovelTextExport(payload: any, format: Extract<NovelExportFormat, 'txt' | 'markdown'>) {
  const { project, stats, groups, warnings, generated_at: generatedAt } = payload
  const lines: string[] = []
  if (format === 'markdown') {
    lines.push(`# ${project.title}`, '')
    if (project.synopsis) lines.push(`> ${project.synopsis}`, '')
    lines.push('## 交付信息', '')
    lines.push(`- 类型：${project.genre || '未设置'}`)
    lines.push(`- 目标读者：${project.target_audience || '未设置'}`)
    lines.push(`- 篇幅目标：${project.length_target || '未设置'}`)
    lines.push(`- 章节：${stats.written_count}/${stats.chapter_count} 已写，缺失 ${stats.missing_count}`)
    lines.push(`- 字数：${stats.word_count}`)
    lines.push(`- 生成时间：${generatedAt}`, '')
    if (warnings.length) {
      lines.push('## 交付警告', '')
      warnings.forEach((warning: string) => lines.push(`- ${warning}`))
      lines.push('')
    }
    for (const group of groups) {
      if (groups.length > 1 || group.id) {
        lines.push(`## ${group.id ? `第${group.order}卷 ` : ''}${group.title || '未分卷章节'}`, '')
        if (group.summary) lines.push(`${group.summary}`, '')
      }
      for (const chapter of group.chapters) {
        const title = chapter.title || '未命名'
        const text = String(chapter.chapter_text || '').trim()
        lines.push(`### 第${chapter.chapter_no}章 ${title}`, '')
        if (!text) lines.push('> [缺正文]', '')
        else {
          if (text.includes('【占位正文】')) lines.push('> [占位正文警告：本章可能尚未完成]', '')
          lines.push(text, '')
        }
      }
    }
  } else {
    lines.push(`《${project.title}》`, '')
    if (project.synopsis) lines.push(`简介：${project.synopsis}`, '')
    lines.push('【交付信息】')
    lines.push(`类型：${project.genre || '未设置'}`)
    lines.push(`目标读者：${project.target_audience || '未设置'}`)
    lines.push(`篇幅目标：${project.length_target || '未设置'}`)
    lines.push(`章节：${stats.written_count}/${stats.chapter_count} 已写，缺失 ${stats.missing_count}`)
    lines.push(`字数：${stats.word_count}`)
    lines.push(`生成时间：${generatedAt}`, '')
    if (warnings.length) {
      lines.push('【交付警告】')
      warnings.forEach((warning: string) => lines.push(`- ${warning}`))
      lines.push('')
    }
    for (const group of groups) {
      if (groups.length > 1 || group.id) {
        lines.push(`===== ${group.id ? `第${group.order}卷 ` : ''}${group.title || '未分卷章节'} =====`)
        if (group.summary) lines.push(group.summary)
        lines.push('')
      }
      for (const chapter of group.chapters) {
        const title = chapter.title || '未命名'
        const text = String(chapter.chapter_text || '').trim()
        lines.push(`第${chapter.chapter_no}章 ${title}`, '')
        if (!text) lines.push('[缺正文]', '')
        else {
          if (text.includes('【占位正文】')) lines.push('[占位正文警告：本章可能尚未完成]', '')
          lines.push(text, '')
        }
      }
    }
  }
  return lines.map(line => exportLine(format, line)).join('\n').replace(/\n{4,}/g, '\n\n\n')
}

function docxParagraph(text: string, style = '') {
  const styleXml = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''
  const runs = String(text || '').split(/\n/).map(part => `<w:r><w:t xml:space="preserve">${xmlEscape(part)}</w:t></w:r>`).join('')
  return `<w:p>${styleXml}${runs}</w:p>`
}

export async function renderDocxExport(payload: any) {
  const zip = new JSZip()
  const paragraphs: string[] = []
  paragraphs.push(docxParagraph(payload.project.title, 'Title'))
  paragraphs.push(docxParagraph(`章节：${payload.stats.written_count}/${payload.stats.chapter_count} 已写，字数：${payload.stats.word_count}`, 'Subtitle'))
  if (payload.project.synopsis) paragraphs.push(docxParagraph(`简介：${payload.project.synopsis}`))
  if (payload.warnings.length) {
    paragraphs.push(docxParagraph('交付警告', 'Heading1'))
    payload.warnings.forEach((warning: string) => paragraphs.push(docxParagraph(`- ${warning}`)))
  }
  for (const group of payload.groups) {
    if (payload.groups.length > 1 || group.id) paragraphs.push(docxParagraph(`${group.id ? `第${group.order}卷 ` : ''}${group.title || '未分卷章节'}`, 'Heading1'))
    if (group.summary) paragraphs.push(docxParagraph(group.summary))
    for (const chapter of group.chapters) {
      const text = String(chapter.chapter_text || '').trim()
      paragraphs.push(docxParagraph(`第${chapter.chapter_no}章 ${chapter.title || '未命名'}`, 'Heading2'))
      if (!text) paragraphs.push(docxParagraph('[缺正文]'))
      else {
        if (text.includes('【占位正文】')) paragraphs.push(docxParagraph('[占位正文警告：本章可能尚未完成]'))
        text.split(/\n{2,}/).map(part => part.trim()).filter(Boolean).forEach(part => paragraphs.push(docxParagraph(part)))
      }
    }
  }
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`)
  zip.folder('_rels')?.file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`)
  zip.folder('word')?.file('document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`)
  zip.folder('word')?.file('styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="44"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:rPr><w:color w:val="666666"/><w:sz w:val="24"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style></w:styles>`)
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

function chapterXhtml(chapter: any) {
  const text = String(chapter.chapter_text || '').trim()
  const paragraphs = text
    ? text.split(/\n{2,}/).map(part => `<p>${htmlEscape(part.trim()).replace(/\n/g, '<br/>')}</p>`).join('\n')
    : '<p>[缺正文]</p>'
  return `<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" lang="zh-CN"><head><title>${htmlEscape(`第${chapter.chapter_no}章 ${chapter.title || '未命名'}`)}</title><style>body{font-family:serif;line-height:1.8;} h1{font-size:1.4em;} p{text-indent:2em;margin:0 0 .8em;}</style></head><body><h1>第${chapter.chapter_no}章 ${htmlEscape(chapter.title || '未命名')}</h1>${text.includes('【占位正文】') ? '<p>[占位正文警告：本章可能尚未完成]</p>' : ''}${paragraphs}</body></html>`
}

export async function renderEpubExport(payload: any) {
  const zip = new JSZip()
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })
  zip.folder('META-INF')?.file('container.xml', `<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`)
  const oebps = zip.folder('OEBPS')
  const chapters = payload.groups.flatMap((group: any) => group.chapters)
  oebps?.file('title.xhtml', `<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" lang="zh-CN"><head><title>${htmlEscape(payload.project.title)}</title></head><body><h1>${htmlEscape(payload.project.title)}</h1><p>字数：${payload.stats.word_count}</p><p>章节：${payload.stats.written_count}/${payload.stats.chapter_count}</p>${payload.project.synopsis ? `<p>${htmlEscape(payload.project.synopsis)}</p>` : ''}</body></html>`)
  chapters.forEach((chapter: any, index: number) => {
    oebps?.file(`chapter-${index + 1}.xhtml`, chapterXhtml(chapter))
  })
  const manifestItems = [
    '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
    '<item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>',
    ...chapters.map((_chapter: any, index: number) => `<item id="chapter-${index + 1}" href="chapter-${index + 1}.xhtml" media-type="application/xhtml+xml"/>`),
  ]
  const spineItems = ['<itemref idref="title"/>', ...chapters.map((_chapter: any, index: number) => `<itemref idref="chapter-${index + 1}"/>`)]
  oebps?.file('content.opf', `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="bookid">novel-${payload.project.id}-${Date.now()}</dc:identifier><dc:title>${htmlEscape(payload.project.title)}</dc:title><dc:language>zh-CN</dc:language><dc:creator>MangaForge Studio</dc:creator><meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}</meta></metadata><manifest>${manifestItems.join('')}</manifest><spine>${spineItems.join('')}</spine></package>`)
  oebps?.file('nav.xhtml', `<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="zh-CN"><head><title>目录</title></head><body><nav epub:type="toc"><h1>目录</h1><ol><li><a href="title.xhtml">封面信息</a></li>${chapters.map((chapter: any, index: number) => `<li><a href="chapter-${index + 1}.xhtml">第${chapter.chapter_no}章 ${htmlEscape(chapter.title || '未命名')}</a></li>`).join('')}</ol></nav></body></html>`)
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

export function formatContentType(format: NovelExportFormat) {
  if (format === 'markdown') return 'text/markdown; charset=utf-8'
  if (format === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (format === 'epub') return 'application/epub+zip'
  return 'text/plain; charset=utf-8'
}

export function formatExtension(format: NovelExportFormat) {
  if (format === 'markdown') return 'md'
  return format
}
