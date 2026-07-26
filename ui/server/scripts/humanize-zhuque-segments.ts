/**
 * Closed-loop: rewrite only Zhuque pure-AI / high-risk segments on finished prose.
 * System path — not chapter特调.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { getNovelProject } from '../src/novel'
import { createNovelProductionService } from '../src/routes/novel-production-service'
import { createNovelReferenceService } from '../src/routes/novel-reference-service'
import { createNovelWritingService } from '../src/routes/novel-writing-service'
import { countProseChars } from '../src/novel-writing/word-target'
import { buildAigcRiskHeatmap, selectHighRiskRewriteWindows } from '../src/novel-writing/humanize-risk-segment'
import { sanitizeDetectorHostileStock } from '../src/novel-writing/human-webnovel-resistance'

const WORKSPACE = resolve(import.meta.dir, '../../../workspace')
const PROJECT_ID = Number(process.env.PROJECT_ID || 4) || 4
const MODEL_ID = Number(process.env.MODEL_ID || 237) || 237
const IN_TEXT = process.env.IN_TEXT || resolve(WORKSPACE, 'zhuque-inputs/ch1-pov-36-r69.txt')
const IN_REPORT = process.env.IN_REPORT || resolve(WORKSPACE, 'zhuque-inputs/ch1-pov-36-r69-zhuque.json')
const OUT_DIR = process.env.OUT_DIR || '/tmp/mf-ch1-pov-36-r70-closed'
const OUT_NAME = process.env.OUT_NAME || 'ch1-pov-36-r70.txt'

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const source = readFileSync(IN_TEXT, 'utf8')
  const report = JSON.parse(readFileSync(IN_REPORT, 'utf8'))
  const segments = Array.isArray(report.segments) ? report.segments : []
  const project = await getNovelProject(WORKSPACE, PROJECT_ID)
  if (!project) throw new Error(`project ${PROJECT_ID} not found`)

  const heat = buildAigcRiskHeatmap(source, { zhuqueSegments: segments })
  const windows = selectHighRiskRewriteWindows(heat)
  writeFileSync(resolve(OUT_DIR, 'pre_heatmap.json'), JSON.stringify({ heat: { high: heat.high_risk_count, total: heat.total_score }, windows }, null, 2))

  const production = createNovelProductionService()
  const reference = createNovelReferenceService()
  const writing: any = createNovelWritingService({
    getProject: async (workspace, id) => getNovelProject(workspace, id),
    production,
    reference,
  })
  if (typeof writing.runHumanizePostProcess !== 'function') {
    throw new Error('runHumanizePostProcess not exposed on writing service')
  }

  const result = await writing.runHumanizePostProcess(
    WORKSPACE,
    project,
    { chapter_no: 1, note: 'zhuque_closed_loop' },
    source,
    MODEL_ID,
    {
      enable_humanize_postprocess: true,
      humanize_mode: 'risk_segment',
      zhuque_segments: segments,
      max_risk_windows: 6,
      risk_rewrite_rounds: 2,
    },
  )

  const finalText = String(result?.final_text || source)
  const sanitizedFallback = sanitizeDetectorHostileStock(source)
  writeFileSync(resolve(OUT_DIR, 'after_prose.txt'), finalText)
  writeFileSync(resolve(OUT_DIR, 'humanize_postprocess.json'), JSON.stringify(result?.report || result, null, 2))
  writeFileSync(resolve(WORKSPACE, 'zhuque-inputs', OUT_NAME), finalText)
  writeFileSync(resolve(WORKSPACE, 'zhuque-inputs', OUT_NAME.replace(/\.txt$/, '-humanize.json')), JSON.stringify(result?.report || result, null, 2))
  // also emit sanitize-only baseline
  writeFileSync(resolve(WORKSPACE, 'zhuque-inputs', OUT_NAME.replace(/\.txt$/, 'b-sanitize-only.txt').replace('r70b', 'r70').replace('r70.txt', 'r69b-sanitize-only.txt')), sanitizedFallback)

  console.log(JSON.stringify({
    phase: 'done',
    in: IN_TEXT,
    out: resolve(WORKSPACE, 'zhuque-inputs', OUT_NAME),
    before_chars: countProseChars(source),
    after_chars: countProseChars(finalText),
    changed: finalText !== source,
    high_risk: heat.high_risk_count,
    windows: windows.length,
    report_stages: (result?.report?.stages || []).map((s: any) => s.stage),
  }, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
