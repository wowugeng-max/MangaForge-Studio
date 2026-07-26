
import { mkdirSync, writeFileSync } from "fs"
import { join, resolve } from "path"
import { getNovelProject, listNovelChapters } from "../src/novel"
import { createNovelProductionService } from "../src/routes/novel-production-service"
import { createNovelReferenceService } from "../src/routes/novel-reference-service"
import { createNovelWritingService } from "../src/routes/novel-writing-service"
import { countProseChars } from "../src/novel-writing/word-target"
import { buildModelFamilyStrategy, resolveModelRuntimeIdentity } from "../src/novel-writing/model-family-strategy"
import { sanitizeDetectorHostileStock } from "../src/novel-writing/human-webnovel-resistance"

const WORKSPACE = resolve(import.meta.dir, "../../../workspace")
const PROJECT_ID = 4
const CHAPTER_ID = 91
const MODEL_ID = Number(process.env.MODEL_ID || 36)
const EXPAND = process.env.EXPAND !== "0"
// Zhuque-first: skip multi-round quality revise (Claude proxy revise hangs); keep humanize postprocess.
const MAX_QUALITY_REVISION_ROUNDS = Number(process.env.MAX_QUALITY_REVISION_ROUNDS ?? 0)
const OUT = process.env.OUT_DIR || "/tmp/mf-ch1-pov-36-r72"
mkdirSync(OUT, { recursive: true })
mkdirSync(resolve(WORKSPACE, "zhuque-inputs"), { recursive: true })

const stages: any[] = []
const production = createNovelProductionService()
const reference = createNovelReferenceService()
const writing = createNovelWritingService({
  getProject: async (workspace, id) => getNovelProject(workspace, id),
  production,
  reference,
})

const project = await getNovelProject(WORKSPACE, PROJECT_ID)
const identity = resolveModelRuntimeIdentity({ activeWorkspace: WORKSPACE, modelId: MODEL_ID })
const family = buildModelFamilyStrategy(identity)
console.log(JSON.stringify({
  phase: "start",
  model_id: MODEL_ID,
  family: family.family,
  write_mode: family.write_mode,
  expand: EXPAND,
  max_quality_revision_rounds: MAX_QUALITY_REVISION_ROUNDS,
}, null, 2))

const result: any = await writing.generateChapterForGroup(WORKSPACE, PROJECT_ID, CHAPTER_ID, {
  model_id: MODEL_ID,
  production_mode: "draft_only",
  word_target_mode: "standard",
  expand: EXPAND,
  max_quality_revision_rounds: MAX_QUALITY_REVISION_ROUNDS,
  auto_repair_missing_material: true,
  approvals: { safety: { approved: true }, scene_cards: { approved: true } },
  onStage: async (key: string, payload: any = {}) => {
    const entry = { at: new Date().toISOString(), key, ...payload }
    // avoid mega stages.json if chapter_text present
    const slim = { ...entry }
    if (typeof slim.chapter_text === "string" && slim.chapter_text.length > 200) {
      slim.chapter_text = `[omitted ${slim.chapter_text.length} chars]`
    }
    if (typeof slim.final_text === "string" && slim.final_text.length > 200) {
      slim.final_text = `[omitted ${slim.final_text.length} chars]`
    }
    stages.push(slim)
    writeFileSync(join(OUT, "stages.json"), JSON.stringify(stages, null, 2))
    console.log("[stage]", JSON.stringify({
      at: entry.at,
      key,
      status: payload?.status,
      word_count: payload?.word_count,
      model_family: payload?.model_family,
      model_write_mode: payload?.model_write_mode,
      model_name: payload?.model_name,
      phase: payload?.phase,
      round: payload?.round,
    }))
    if (key === "draft" && payload?.status === "success" && payload?.prompt_diagnostics) {
      writeFileSync(join(OUT, "draft_prompt_diagnostics.json"), JSON.stringify(payload.prompt_diagnostics, null, 2))
    }
    if (key === "humanize_postprocess" && payload?.report) {
      writeFileSync(join(OUT, "humanize_postprocess.json"), JSON.stringify(payload.report, null, 2))
    }
    const maybeText = String(payload?.chapter_text || payload?.final_text || payload?.text || "")
    if (maybeText && countProseChars(maybeText) >= 800) {
      writeFileSync(join(OUT, `snapshot_${key}.txt`), maybeText)
      writeFileSync(join(OUT, "latest_prose.txt"), maybeText)
    }
  },
})

const chapters = await listNovelChapters(WORKSPACE, PROJECT_ID)
const after = chapters.find((c: any) => c.id === CHAPTER_ID)
const prose = String(after?.chapter_text || result?.chapter?.chapter_text || result?.chapter_text || result?.final_text || "")
const cleaned = sanitizeDetectorHostileStock(prose)
writeFileSync(join(OUT, "after_prose.txt"), prose)
writeFileSync(join(OUT, "after_prose_sanitized.txt"), cleaned)
writeFileSync(join(OUT, "report.json"), JSON.stringify(result, null, 2))
writeFileSync(resolve(WORKSPACE, "zhuque-inputs/ch1-pov-36-r72.txt"), cleaned)
writeFileSync(resolve(WORKSPACE, "zhuque-inputs/ch1-pov-36-r72-raw.txt"), prose)
writeFileSync(join(OUT, "stages.json"), JSON.stringify(stages, null, 2))
console.log(JSON.stringify({
  phase: "done",
  chars: countProseChars(prose),
  sanitized_chars: countProseChars(cleaned),
  family: family.family,
  expand: EXPAND,
  max_quality_revision_rounds: MAX_QUALITY_REVISION_ROUNDS,
  admission_status: result?.admission_status,
}, null, 2))
