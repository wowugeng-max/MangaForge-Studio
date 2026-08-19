import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelChapter, createNovelProject } from '../../novel'
import { validateCreateKernelJob } from './run-job'

function seedStores(ws: string) {
  writeFileSync(join(ws, 'providers.json'), JSON.stringify([{ id: 'any', api_format: 'codex_responses', default_base_url: 'https://a/v1', custom_headers: {} }]))
  writeFileSync(join(ws, 'models.json'), JSON.stringify([{ id: 9, api_key_id: 5, provider: 'any', display_name: 'm', model_name: 'gpt-5.2' }]))
  writeFileSync(join(ws, 'keys.json'), JSON.stringify([{ id: 5, provider: 'any', key: 'sk', is_active: true }]))
}

async function seedRewrite() {
  const ws = mkdtempSync(join(tmpdir(), 'rewrite-ch-'))
  const project = await createNovelProject(ws, { title: '书' })
  const filled = await createNovelChapter(ws, {
    project_id: project.id, chapter_no: 1, title: '一', chapter_text: '旧稿正文',
  })
  const other = await createNovelChapter(ws, {
    project_id: project.id, chapter_no: 2, title: '二', chapter_text: '另一章旧稿',
  })
  seedStores(ws)
  const body = {
    project_id: project.id, subject_type: 'chapter' as const, subject_id: filled.id,
    verb: 'rewrite_chapter', model_id: 9,
  }
  return { ws, project, filled, other, body }
}

describe('rewrite_chapter precheck', () => {
  test('rejects missing chapter, empty, placeholder; allows prose without outline', async () => {
    const { ws, project, body } = await seedRewrite()
    expect(((await validateCreateKernelJob(ws, { ...body, subject_id: 999999 }, { skipRuntimeCheck: true })) as any).code)
      .toBe('CHAPTER_NOT_FOUND')
    const empty = await createNovelChapter(ws, { project_id: project.id, chapter_no: 3, title: '三', chapter_text: '' })
    expect(((await validateCreateKernelJob(ws, { ...body, subject_id: empty.id }, { skipRuntimeCheck: true })) as any).code)
      .toBe('CHAPTER_NO_PROSE')
    const blank = await createNovelChapter(ws, { project_id: project.id, chapter_no: 4, title: '四', chapter_text: '   ' })
    expect(((await validateCreateKernelJob(ws, { ...body, subject_id: blank.id }, { skipRuntimeCheck: true })) as any).code)
      .toBe('CHAPTER_NO_PROSE')
    const placeholder = await createNovelChapter(ws, {
      project_id: project.id, chapter_no: 5, title: '五', chapter_text: '【占位正文】',
    })
    expect(((await validateCreateKernelJob(ws, { ...body, subject_id: placeholder.id }, { skipRuntimeCheck: true })) as any).code)
      .toBe('CHAPTER_NO_PROSE')
    const ok = await validateCreateKernelJob(ws, { ...body, user_brief: { length_target: '自定义 1800 字' } }, { skipRuntimeCheck: true })
    expect(ok.ok).toBe(true)
    if (ok.ok) {
      expect(ok.contracts.map(c => c.id)).toEqual(['oh-story-core.story-long-write.rewrite'])
      expect(ok.briefJson).toContain('自定义 1800 字')
    }
  })
})
