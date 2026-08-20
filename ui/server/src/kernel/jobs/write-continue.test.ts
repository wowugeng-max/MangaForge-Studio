import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  createNovelChapter,
  createNovelOutline,
  createNovelProject,
  deleteNovelChapter,
  deleteNovelOutline,
  updateNovelChapter,
} from '../../novel'
import { validateCreateKernelJob } from './run-job'

function seedStores(ws: string) {
  writeFileSync(join(ws, 'providers.json'), JSON.stringify([{ id: 'any', api_format: 'codex_responses', default_base_url: 'https://a/v1', custom_headers: {} }]))
  writeFileSync(join(ws, 'models.json'), JSON.stringify([{ id: 9, api_key_id: 5, provider: 'any', display_name: 'm', model_name: 'gpt-5.2' }]))
  writeFileSync(join(ws, 'keys.json'), JSON.stringify([{ id: 5, provider: 'any', key: 'sk', is_active: true }]))
}

async function seedContinue() {
  const ws = mkdtempSync(join(tmpdir(), 'write-cont-'))
  const project = await createNovelProject(ws, { title: '书' })
  await createNovelChapter(ws, {
    project_id: project.id, chapter_no: 1, title: '一', chapter_text: '已有正文',
  })
  const ch2 = await createNovelChapter(ws, {
    project_id: project.id, chapter_no: 2, title: '二', chapter_text: '',
  })
  const ch3 = await createNovelChapter(ws, {
    project_id: project.id, chapter_no: 3, title: '三', chapter_text: '',
  })
  await createNovelOutline(ws, {
    project_id: project.id, outline_type: 'chapter', title: '细纲2', summary: '细',
    raw_payload: { chapter_no: 2 },
  })
  const outline3 = await createNovelOutline(ws, {
    project_id: project.id, outline_type: 'chapter', title: '细纲3', summary: '细',
    raw_payload: { chapter_no: 3 },
  })
  seedStores(ws)
  const body = {
    project_id: project.id, subject_type: 'project' as const, subject_id: project.id,
    verb: 'write_continue', model_id: 9,
    verb_params: { from_chapter_no: 2, count: 2 },
  }
  return { ws, project, ch2, ch3, outline3, body }
}

describe('write_continue precheck', () => {
  test('rejects invalid from_chapter_no', async () => {
    const { ws, body } = await seedContinue()
    expect(((await validateCreateKernelJob(ws, {
      ...body, verb_params: { from_chapter_no: 0, count: 2 },
    }, { skipRuntimeCheck: true })) as any).code).toBe('VERB_PARAMS_INVALID')
    expect(((await validateCreateKernelJob(ws, {
      ...body, verb_params: { count: 2 },
    }, { skipRuntimeCheck: true })) as any).code).toBe('VERB_PARAMS_INVALID')
  })

  test('rejects chapter subject_type', async () => {
    const { ws, body, ch2 } = await seedContinue()
    expect(((await validateCreateKernelJob(ws, {
      ...body, subject_type: 'chapter', subject_id: ch2.id,
    }, { skipRuntimeCheck: true })) as any).code).toBe('SUBJECT_TYPE_MISMATCH')
  })

  test('rejects missing window chapter', async () => {
    const { ws, body, ch3 } = await seedContinue()
    await deleteNovelChapter(ws, ch3.id)
    expect(((await validateCreateKernelJob(ws, body, { skipRuntimeCheck: true })) as any).code)
      .toBe('CHAPTER_NOT_FOUND')
  })

  test('rejects window chapter that already has prose', async () => {
    const { ws, body, ch3 } = await seedContinue()
    await updateNovelChapter(ws, ch3.id, { chapter_text: '已有正文' })
    expect(((await validateCreateKernelJob(ws, body, { skipRuntimeCheck: true })) as any).code)
      .toBe('CHAPTER_HAS_PROSE')
  })

  test('rejects window chapter without matching outline', async () => {
    const { ws, body, outline3 } = await seedContinue()
    await deleteNovelOutline(ws, outline3.id)
    expect(((await validateCreateKernelJob(ws, body, { skipRuntimeCheck: true })) as any).code)
      .toBe('OUTLINE_MISSING')
  })

  test('allows placeholder or blank chapter 2 and returns normalized verbParamsJson', async () => {
    const { ws, body, ch2 } = await seedContinue()
    await updateNovelChapter(ws, ch2.id, { chapter_text: '【占位正文】' })
    const placeholder = await validateCreateKernelJob(ws, body, { skipRuntimeCheck: true })
    expect(placeholder.ok).toBe(true)
    await updateNovelChapter(ws, ch2.id, { chapter_text: '   ' })
    const blank = await validateCreateKernelJob(ws, body, { skipRuntimeCheck: true })
    expect(blank.ok).toBe(true)
    const ok = await validateCreateKernelJob(ws, body, { skipRuntimeCheck: true })
    expect(ok.ok).toBe(true)
    if (ok.ok) expect(ok.verbParamsJson).toContain('"count":2')
  })
})
