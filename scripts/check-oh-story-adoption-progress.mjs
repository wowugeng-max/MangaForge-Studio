import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname)
const docPath = path.join(repoRoot, 'docs', 'oh-story-adoption-progress.md')
const referencesDir = process.env.OH_STORY_REFERENCES_DIR
  || '/private/tmp/oh-story-claudecode/skills/story-long-write/references'

const allowedStates = new Set(['integrated', 'partial', 'todo', 'deferred'])

function fail(message) {
  console.error(`[oh-story-progress] ${message}`)
  process.exit(1)
}

if (!fs.existsSync(referencesDir)) {
  fail(`references directory not found: ${referencesDir}. Set OH_STORY_REFERENCES_DIR to the oh-story story-long-write/references path.`)
}

if (!fs.existsSync(docPath)) {
  fail(`progress document not found: ${path.relative(repoRoot, docPath)}`)
}

const referenceFiles = fs.readdirSync(referencesDir)
  .filter(file => file.endsWith('.md'))
  .sort()

const doc = fs.readFileSync(docPath, 'utf8')
const summaryMatch = doc.match(/<!--\s*oh-story-progress-summary\s*(\{[\s\S]*?\})\s*-->/)
if (!summaryMatch) {
  fail('missing oh-story-progress-summary JSON comment')
}

let summary
try {
  summary = JSON.parse(summaryMatch[1])
} catch (error) {
  fail(`invalid oh-story-progress-summary JSON: ${error.message}`)
}

const rows = []
for (const line of doc.split(/\r?\n/)) {
  if (!line.startsWith('|')) continue
  if (/^\|\s*-+/.test(line)) continue
  const cells = line.split('|').slice(1, -1).map(cell => cell.trim())
  if (cells[0] === 'Reference file') continue
  if (!cells[0]?.endsWith('.md')) continue
  rows.push({ file: cells[0], state: cells[1] })
}

const duplicates = rows
  .map(row => row.file)
  .filter((file, index, files) => files.indexOf(file) !== index)
if (duplicates.length) {
  fail(`duplicate reference rows: ${Array.from(new Set(duplicates)).join(', ')}`)
}

const rowFiles = rows.map(row => row.file).sort()
const missing = referenceFiles.filter(file => !rowFiles.includes(file))
const extra = rowFiles.filter(file => !referenceFiles.includes(file))
if (missing.length) fail(`missing reference rows: ${missing.join(', ')}`)
if (extra.length) fail(`unknown reference rows: ${extra.join(', ')}`)

const counts = { integrated: 0, partial: 0, todo: 0, deferred: 0 }
for (const row of rows) {
  if (!allowedStates.has(row.state)) {
    fail(`invalid state for ${row.file}: ${row.state || '(empty)'}`)
  }
  counts[row.state] += 1
}

const expected = {
  reference_total: referenceFiles.length,
  integrated: counts.integrated,
  partial: counts.partial,
  todo: counts.todo,
  deferred: counts.deferred,
  remaining_references: counts.partial + counts.todo + counts.deferred,
}

for (const [key, value] of Object.entries(expected)) {
  if (summary[key] !== value) {
    fail(`summary.${key} is ${summary[key]}, expected ${value}`)
  }
}

if (!Number.isFinite(summary.estimated_hours_remaining) || summary.estimated_hours_remaining < 0) {
  fail('summary.estimated_hours_remaining must be a non-negative number')
}

if (!Number.isFinite(summary.estimated_working_days_remaining) || summary.estimated_working_days_remaining < 0) {
  fail('summary.estimated_working_days_remaining must be a non-negative number')
}

console.log(`[oh-story-progress] ok: ${referenceFiles.length} references, ${counts.integrated} integrated, ${counts.partial} partial, ${counts.todo} todo, ${counts.deferred} deferred.`)
