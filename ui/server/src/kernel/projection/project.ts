import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  getNovelChapter, listNovelChapters, listNovelCharacters, listNovelOutlines,
  listNovelReviewsByType, listNovelWorldbuilding,
} from '../../novel'
import {
  latestOhStoryReviewForChapter, ohStoryReviewMatchesChapterText, parseOhStoryReviewPayload,
} from '../../novel-writing/oh-story-core/review-match'
import type { KernelContract } from '../contracts/schema'
import { listCommittedTrackingDocPaths } from '../db'
import type { KernelPromptVars } from '../template'
import { chapterRelPath, padChapterNo, safeChapterTitle } from './naming'

export type ProjectKernelSubjectInput = {
  workspace: string
  projectId: number
  chapterId: number
  contract: KernelContract
  projectDir: string
}

function writeProjected(projectDir: string, relPath: string, content: string, files: string[]) {
  const target = join(projectDir, relPath)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, content)
  files.push(relPath)
}

const SURGICAL_HEADER = [
  '# 改稿指令',
  '',
  '只落实下方审稿报告中的可执行「修改建议」。',
  '禁止整章重写、禁止风格通篇抛光、禁止改动与建议无关的段落。',
  '',
  '---',
  '',
].join('\n')

export async function projectKernelSubject(input: ProjectKernelSubjectInput): Promise<{ vars: KernelPromptVars; files: string[] }> {
  const { workspace, projectId, chapterId, contract, projectDir } = input
  const mounts = contract.projection.mounts
  if (mounts.includes('canvas_node')) {
    throw Object.assign(new Error('canvas_node projection is not implemented'), { code: 'CONTRACT_NOT_IMPLEMENTED' })
  }
  const chapter = await getNovelChapter(workspace, chapterId, projectId)
  if (!chapter) throw Object.assign(new Error('chapter not found'), { code: 'CHAPTER_NOT_FOUND' })

  const files: string[] = []
  const pad = padChapterNo(Number(chapter.chapter_no))
  const currentRel = chapterRelPath(Number(chapter.chapter_no), String(chapter.title || ''))
  let previousRel = ''
  const chapters = await listNovelChapters(workspace, projectId)
  const previous = chapters
    .filter((item: any) => Number(item.chapter_no) < Number(chapter.chapter_no))
    .sort((a: any, b: any) => Number(b.chapter_no) - Number(a.chapter_no))[0]

  if (mounts.includes('current_chapter')) {
    writeProjected(projectDir, currentRel, String(chapter.chapter_text || ''), files)
  }
  if (mounts.includes('previous_chapter') && previous) {
    previousRel = chapterRelPath(Number(previous.chapter_no), String(previous.title || ''))
    writeProjected(projectDir, previousRel, String(previous.chapter_text || ''), files)
  }
  if (mounts.includes('outline')) {
    const outlines = await listNovelOutlines(workspace, projectId)
    const master = outlines.filter((o: any) => String(o.outline_type || 'master') === 'master')
    const detail = outlines.filter((o: any) => String(o.outline_type || 'master') !== 'master')
    const renderOutline = (rows: any[]) => rows.map(o => `# ${o.title}\n\n${String(o.summary || '')}`.trim()).join('\n\n---\n\n') || '（空）'
    writeProjected(projectDir, '大纲/总纲.md', renderOutline(master), files)
    writeProjected(projectDir, '大纲/细纲.md', renderOutline(detail), files)
    const chapterCard = (row: any) => [
      `# 第${padChapterNo(Number(row.chapter_no))}章 ${String(row.title || '')}`,
      `目标：${String(row.chapter_goal || '')}`,
      `概要：${String(row.chapter_summary || '')}`,
      `冲突：${String(row.conflict || '')}`,
      `章末钩子：${String(row.ending_hook || '')}`,
    ].join('\n')
    writeProjected(projectDir, `大纲/第${pad}章.md`, chapterCard(chapter), files)
    if (previous) writeProjected(projectDir, `大纲/第${padChapterNo(Number(previous.chapter_no))}章.md`, chapterCard(previous), files)
  }
  if (mounts.includes('characters')) {
    for (const character of await listNovelCharacters(workspace, projectId)) {
      const body = [
        `# ${character.name}`,
        `定位：${String(character.role || '')}`,
        `动机：${String(character.motivation || '')}`,
        `目标：${String(character.goal || '')}`,
        `背景：${String(character.backstory || '')}`,
      ].join('\n')
      writeProjected(projectDir, `设定/角色/${safeChapterTitle(String(character.name || ''))}.md`, body, files)
    }
  }
  if (mounts.includes('world')) {
    const worlds = await listNovelWorldbuilding(workspace, projectId)
    const body = worlds.map((w: any) => String(w.world_summary || '')).filter(Boolean).join('\n\n') || '（空）'
    writeProjected(projectDir, '设定/世界观.md', body, files)
  }
  if (mounts.includes('tracking')) {
    const docs = listCommittedTrackingDocPaths(workspace, projectId)
    if (docs.length) {
      for (const doc of docs) {
        const target = join(projectDir, doc.rel_path)
        if (existsSync(doc.vault_path) && !existsSync(target)) {
          mkdirSync(dirname(target), { recursive: true })
          copyFileSync(doc.vault_path, target)
          files.push(doc.rel_path)
        }
      }
    }
    if (!files.some(f => f === '追踪/伏笔.md')) {
      writeProjected(projectDir, '追踪/伏笔.md', '# 伏笔\n\n开放项：无\n', files)
    }
    if (!files.some(f => f.startsWith('追踪/逐章记录/'))) {
      writeProjected(projectDir, `追踪/逐章记录/第${pad}章.md`, `# 第${pad}章 逐章记录\n\n开放项：无\n`, files)
    }
  }

  let reviewPath = ''
  if (mounts.includes('review_report')) {
    const reviews = await listNovelReviewsByType(workspace, projectId, 'oh_story_review')
    const review = latestOhStoryReviewForChapter(reviews, chapterId)
    if (!review) throw Object.assign(new Error('先对本稿重新审稿'), { code: 'OH_STORY_APPLY_NO_REVIEW' })
    if (!ohStoryReviewMatchesChapterText(review, String(chapter.chapter_text || ''))) {
      throw Object.assign(new Error('先对本稿重新审稿'), { code: 'OH_STORY_APPLY_STALE_REVIEW' })
    }
    const reportText = String(parseOhStoryReviewPayload(review).report_text || '')
    reviewPath = `审稿/第${pad}章.md`
    writeProjected(projectDir, reviewPath, reportText, files)
    if (contract.capability === 'rewrite') {
      writeProjected(projectDir, '改稿/指令.md', SURGICAL_HEADER + reportText, files)
    }
  }

  const vars: KernelPromptVars = {
    scope_files: currentRel,
    chapter_no: String(chapter.chapter_no),
    chapter_pad: pad,
    chapter_title: String(chapter.title || ''),
    previous_chapter_file: previousRel,
    report_path: `审稿/第${pad}章.md`,
    review_path: reviewPath,
    skill_name: contract.skill_name,
  }
  return { vars, files }
}
