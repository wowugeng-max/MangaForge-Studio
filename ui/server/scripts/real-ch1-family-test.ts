/**
 * Real project chapter-1 rewrite test with model-family strategy (Gemini Flash).
 * Project: 都市迷雾·三章实测-2026-07-19 0647
 */
import { mkdirSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { getNovelProject, listNovelChapters } from '../src/novel'
import { createNovelProductionService } from '../src/routes/novel-production-service'
import { createNovelReferenceService } from '../src/routes/novel-reference-service'
import { createNovelWritingService } from '../src/routes/novel-writing-service'
import { countProseChars, evaluateProseWordTarget, resolveChapterWordTarget } from '../src/novel-writing/word-target'
import { scanWebNovelParagraphShapeRisks, scanParagraphWallTextRisks } from '../src/novel-writing/prose-craft-scans'
import { scanBannedWordLeaks } from '../src/novel-writing/deslop-scans'
import { scanToxicAiPatterns } from '../src/novel-writing/toxic-ai-pattern-scans'
import { buildChapterProgressBudget } from '../src/novel-writing/chapter-progress-budget'
import { buildModelFamilyStrategy } from '../src/novel-writing/model-family-strategy'

const WORKSPACE = resolve(import.meta.dir, '../../../workspace')
const PROJECT_ID = 4
const CHAPTER_ID = 91
const MODEL_ID = Number(process.env.MODEL_ID || 237) || 237
const MODEL_NAME = process.env.MODEL_NAME || 'gemini-3.6-flash'
const OUT = process.env.OUT_DIR || '/tmp/mf-ch1-pov-36-r10'

function scoreProse(prose: string, chapter: any, wordTarget: any) {
  const chars = countProseChars(prose)
  const word = evaluateProseWordTarget(prose, wordTarget)
  const progress = buildChapterProgressBudget({
    chapterText: prose,
    currentChapter: chapter,
    currentPlan: {
      goal: chapter.chapter_goal || chapter.goal,
      summary: chapter.chapter_summary || chapter.summary,
      conflict: chapter.conflict,
      ending_hook: chapter.ending_hook,
      must_advance: chapter.raw_payload?.must_advance || chapter.must_advance,
    },
  })
  const para = scanWebNovelParagraphShapeRisks(prose)
  const walls = scanParagraphWallTextRisks(prose)
  const banned = scanBannedWordLeaks(prose)
  const toxic = scanToxicAiPatterns(prose)
  const lines = prose.split(/\n/).map(l => l.trim()).filter(Boolean)
  const bodyLines = lines.filter(l => !/^第\d+章/.test(l))
  const singleSentenceRatio = bodyLines.length
    ? bodyLines.filter(l => (l.match(/[。！？!?]/g) || []).length <= 1).length / bodyLines.length
    : 0
  // r8: allow mixed 2-sentence dense blocks; hard-fail only on craft fail hits / wall text
  const paragraph_pass = singleSentenceRatio >= 0.70
    && para.filter((i: any) => i.status === 'fail').length === 0
    && walls.length <= 1
  const deai_pass = banned.filter((i: any) => i.status === 'fail').length === 0
  const progress_pass = !progress.overrun && !progress.underrun
  const dialogueParas = bodyLines.filter(l => /^[“"「]/.test(l)).length
  const dialogue_para_ratio = bodyLines.length ? dialogueParas / bodyLines.length : 0
  // #63: 与 prose-fingerprint-lib 的 two_sentence_para_ratio 同口径 —— 完整句（去空白后 ≥2 字符）
  // 计数恰好为 2；排除三句以上密段与"？！"这类双标点单句。旧口径（≥2 个句末标点）会系统性
  // 高估，而第 63 行对照的 r10 区间正是按库口径拟合的。
  const twoSentenceParas = bodyLines.filter(l => {
    const sents = (l.match(/[^。！？!?]+[。！？!?]/g) || []).filter(s => s.replace(/\s+/g, '').length >= 2)
    return sents.length === 2
  }).length
  const two_sentence_ratio = bodyLines.length ? twoSentenceParas / bodyLines.length : 0
  return {
    word_count: chars,
    word_pass: word.passed,
    dialogue_para_ratio: Number(dialogue_para_ratio.toFixed(3)),
    two_sentence_ratio: Number(two_sentence_ratio.toFixed(3)),
    fingerprint_r10_pass: dialogue_para_ratio >= 0.116 && dialogue_para_ratio <= 0.343 && two_sentence_ratio >= 0.032 && two_sentence_ratio <= 0.162 && singleSentenceRatio >= 0.811,
    word_target: word,
    progress_pass,
    progress_summary: progress.summary || progress.prompt_summary || null,
    progress_overrun: progress.overrun,
    progress_underrun: progress.underrun,
    single_sentence_ratio: Number(singleSentenceRatio.toFixed(3)),
    paragraph_pass,
    deai_pass,
    deai_warns: [
      ...banned.filter((i: any) => i.status === 'warn' || i.status === 'fail').slice(0, 8).map((i: any) => i.pattern || i.key),
      ...toxic.slice(0, 4).map((i: any) => i.key || i.label),
    ],
    overall_pass: Boolean(word.passed && progress_pass && paragraph_pass && deai_pass),
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  const project = await getNovelProject(WORKSPACE, PROJECT_ID)
  if (!project) throw new Error(`project ${PROJECT_ID} not found in ${WORKSPACE}`)
  const chapters = await listNovelChapters(WORKSPACE, PROJECT_ID)
  const chapter = chapters.find(item => item.id === CHAPTER_ID)
  if (!chapter) throw new Error(`chapter ${CHAPTER_ID} not found`)

  const family = buildModelFamilyStrategy({
    model_name: MODEL_NAME,
    provider_id: 'gemini',
    model_id: MODEL_ID,
  })

  writeFileSync(join(OUT, 'before_prose.txt'), String(chapter.chapter_text || ''))
  writeFileSync(join(OUT, 'chapter_meta.json'), JSON.stringify({
    project: { id: project.id, title: project.title, genre: project.genre },
    chapter: {
      id: chapter.id,
      chapter_no: chapter.chapter_no,
      title: chapter.title,
      chapter_goal: chapter.chapter_goal,
      chapter_summary: chapter.chapter_summary,
      conflict: chapter.conflict,
      ending_hook: chapter.ending_hook,
      before_chars: countProseChars(String(chapter.chapter_text || '')),
    },
    family,
  }, null, 2))

  const stages: any[] = []
  const production = createNovelProductionService()
  const reference = createNovelReferenceService()
  const writing = createNovelWritingService({
    getProject: async (workspace, id) => getNovelProject(workspace, id),
    production,
    reference,
  })

  console.log(JSON.stringify({
    phase: 'start',
    workspace: WORKSPACE,
    project: project.title,
    chapter: `${chapter.chapter_no}:${chapter.title}`,
    model_id: MODEL_ID,
    family: family.family,
    write_mode: family.write_mode,
    rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
  }, null, 2))

  const started = Date.now()
  let result: any
  try {
    result = await writing.generateChapterForGroup(WORKSPACE, PROJECT_ID, CHAPTER_ID, {
      model_id: MODEL_ID,
      production_mode: 'draft_only',
      word_target_mode: 'standard',
      auto_repair_missing_material: true,
      approvals: {
        safety: { approved: true },
        scene_cards: { approved: true },
      },
      onStage: async (key: string, payload: any = {}) => {
        const row = {
          at: new Date().toISOString(),
          key,
          status: payload?.status,
          model_family: payload?.model_family,
          model_write_mode: payload?.model_write_mode,
          model_name: payload?.model_name,
          word_count: payload?.word_count,
          chars: payload?.chars,
          error: payload?.error,
          detail: payload?.detail || payload?.progress || undefined,
          report: key === 'humanize_postprocess' ? payload?.report : undefined,
        }
        stages.push(row)
        console.log('[stage]', JSON.stringify(row))
        writeFileSync(join(OUT, 'stages.json'), JSON.stringify(stages, null, 2))
        if (key === 'humanize_postprocess' && payload?.report) {
          writeFileSync(join(OUT, 'humanize_postprocess.json'), JSON.stringify(payload.report, null, 2))
        }
      },
    })
  } catch (error: any) {
    const residual = String(
      error?.chapter_text
      || error?.finalText
      || error?.prose
      || error?.text
      || error?.details?.chapter_text
      || error?.details?.final_text
      || error?.details?.finalText
      || error?.details?.prose
      || error?.details?.text
      || error?.admission_failure?.details?.chapter_text
      || error?.cause?.chapter_text
      || error?.cause?.finalText
      || error?.cause?.details?.chapter_text
      || '',
    )
    if (residual.trim()) writeFileSync(join(OUT, 'after_prose.txt'), residual)
    const fail = {
      phase: 'failed',
      latency_ms: Date.now() - started,
      error: String(error?.message || error),
      code: error?.code,
      stages,
      residual_chars: residual.replace(/\s+/g, '').length,
      rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    }
    writeFileSync(join(OUT, 'report.json'), JSON.stringify(fail, null, 2))
    console.error(JSON.stringify(fail, null, 2))
    process.exit(1)
  }

  const afterChapters = await listNovelChapters(WORKSPACE, PROJECT_ID)
  const after = afterChapters.find(item => item.id === CHAPTER_ID)
  const prose = String(after?.chapter_text || result?.chapter?.chapter_text || result?.finalText || '')
  const wordTarget = resolveChapterWordTarget(project, after || chapter, { word_target_mode: 'standard' })
  const score = scoreProse(prose, after || chapter, wordTarget)
  writeFileSync(join(OUT, 'after_prose.txt'), prose)
  const report = {
    phase: 'done',
    latency_ms: Date.now() - started,
    model_id: MODEL_ID,
    family,
    stages,
    result_keys: result && typeof result === 'object' ? Object.keys(result) : [],
    admission: result?.admission || result?.prose_admission || null,
    humanize_postprocess: result?.humanize_postprocess || null,
    status: result?.status || after?.status || null,
    score,
    preview: prose.slice(0, 500),
    tail: prose.slice(-400),
    rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
  }
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  if (!score.overall_pass) process.exitCode = 2
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
