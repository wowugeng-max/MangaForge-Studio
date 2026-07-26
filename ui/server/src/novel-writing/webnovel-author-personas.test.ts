import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import {
  buildDeAiPolishMasterPersona,
  buildSeniorWebnovelAuthorPersona,
  resolveWebnovelGenreLabel,
} from './webnovel-author-personas'
import { buildProsePrompt } from '../llm/prompts-prose'
import { buildFocusedProseRevisionPrompt } from './prose-quality-loop-prompts'
import { buildMemePolishPrompt } from './prose-prompt-builders'
import { runProseQualityLoop } from './prose-quality-loop'

describe('webnovel author personas', () => {
  test('resolves genre labels from project fields', () => {
    expect(resolveWebnovelGenreLabel({ genre: '都市悬疑' })).toBe('都市')
    expect(resolveWebnovelGenreLabel({ genre: '修仙长生' })).toBe('仙侠')
    expect(resolveWebnovelGenreLabel({ style_tags: ['玄幻', '升级'] })).toBe('玄幻')
  })

  test('draft persona includes senior author and detector goal', () => {
    const text = buildSeniorWebnovelAuthorPersona({ genre: '都市' })
    expect(text).toContain('资深网文作者')
    expect(text).toContain('专攻都市')
    expect(text).toContain('朱雀')
    expect(text).toContain('20%')
  })

  test('revise persona is de-AI polish master', () => {
    const text = buildDeAiPolishMasterPersona({ genre: '仙侠' })
    expect(text).toContain('去AI润色大师')
    expect(text).toContain('仙侠')
    expect(text).toContain('保持原意')
  })

  test('wired into draft / revise / meme polish prompts', () => {
    const draft = buildProsePrompt(
      { title: '测试书', genre: '都市悬疑' } as any,
      { chapter_no: 1, title: '第一章' },
      {},
    )
    expect(draft).toContain('资深网文作者')
    expect(draft).toContain('都市')

    const revise = buildFocusedProseRevisionPrompt({
      coreContract: {},
      chapterText: '他推开门。',
      blockingFindings: [],
      round: 1,
      project: { genre: '都市' },
    } as any)
    expect(revise).toContain('去AI润色大师')

    const meme = buildMemePolishPrompt(
      { title: '测试书', genre: '仙侠' },
      { chapter_target: { chapter_no: 1, title: '试写' } },
      '他拔剑。',
    )
    expect(meme).toContain('去AI润色大师')
    expect(meme).toContain('仙侠')
  })

  test('GENRE_ALIASES patterns typing passes tsc (#31)', () => {
    const tsc = resolve(import.meta.dir, '../../../web/node_modules/.bin/tsc')
    const file = resolve(import.meta.dir, 'webnovel-author-personas.ts')
    const proc = Bun.spawnSync([tsc, '--noEmit', '--target', 'es2020', '--module', 'esnext', '--skipLibCheck', file])
    const out = `${proc.stdout.toString()}\n${proc.stderr.toString()}`
    expect(out).not.toContain('TS2740')
    expect(out).not.toContain('TS2339')
    expect(proc.exitCode).toBe(0)
  })

  test('quality revision persona follows typed input.project genre through runProseQualityLoop (#29)', async () => {
    const sixDims = {
      continuity: 7,
      core_promise_agency: 7,
      conflict_causality: 7,
      payoff_hook: 7,
      prose_style: 7,
      fact_setting_safety: 8,
    }
    const runOnce = async (project: any) => {
      let captured = ''
      await runProseQualityLoop({
        initialText: '初稿：江澈站着等。'.repeat(80),
        minScore: 78,
        coreContract: { chapter_no: 3 },
        maxRevisionRounds: 1,
        project,
        scan: () => ({ hard_failures: [] }),
        review: async ({ text }) => (text.startsWith('初稿')
          ? {
              score: 70,
              score_scale: '0-100',
              dimensions: sixDims,
              findings: [{
                key: 'agency',
                severity: 'S2',
                dimension: 'core_promise_agency',
                evidence: '江澈站着等。',
                required_change: '让江澈主动破围',
                acceptance_test: '包围因主角动作改变',
              }],
            }
          : { score: 86, score_scale: '0-100', publishable: true, dimensions: sixDims, findings: [] }),
        revise: async ({ prompt }) => {
          captured = prompt
          return { final_text: '修订：江澈踏碎路面，借飞石逼退第一排追兵。'.repeat(80) }
        },
      })
      return captured
    }
    const xianxiaPrompt = await runOnce({ genre: '仙侠修真' })
    const urbanPrompt = await runOnce({ genre: '都市悬疑' })
    expect(xianxiaPrompt).toContain('熟悉仙侠连载口吻')
    expect(urbanPrompt).toContain('熟悉都市连载口吻')

    // project 必须是正式声明的输入字段，且生产调用方要把 project 接进来
    const loopSource = readFileSync(resolve(import.meta.dir, 'prose-quality-loop-run.ts'), 'utf8')
    expect(loopSource).not.toContain('(input as any).project')
    expect(loopSource).not.toContain('(input as any).novelProject')
    const inputTypeStart = loopSource.indexOf('export async function runProseQualityLoop(input: {')
    const inputTypeEnd = loopSource.indexOf('})', inputTypeStart)
    expect(loopSource.slice(inputTypeStart, inputTypeEnd)).toContain('project?:')
    const callerSource = readFileSync(
      resolve(import.meta.dir, '../novel-writing-service/service/generate-chapter-quality-prestore-loop.ts'),
      'utf8',
    )
    const callStart = callerSource.indexOf('qualityLoop = await runProseQualityLoop({')
    expect(callStart).toBeGreaterThan(-1)
    const callBlock = callerSource.slice(callStart, callerSource.indexOf('scan:', callStart))
    expect(callBlock).toMatch(/\bproject\b/)
  })
})
