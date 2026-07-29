import { afterEach, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { Database } from 'bun:sqlite'
import { countProseChars } from '../novel-writing/word-target'
import { revisionTextHash } from './revision-hash'
import type {
  NovelChapterRecord,
  NovelChapterVersionRecord,
  NovelReviewRecord,
  NovelRunRecord,
} from './types'
import { detectEditorRevisionDamage } from './editor-revision-damage-audit'

const repoRoot = resolve(import.meta.dir, '../../../..')
const temporaryWorkspaces: string[] = []

afterEach(async () => {
  await Promise.all(temporaryWorkspaces.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

function chapter(overrides: Partial<NovelChapterRecord> = {}): NovelChapterRecord {
  return {
    id: 11,
    project_id: 7,
    chapter_no: 4,
    title: '第四章',
    chapter_text: '现'.repeat(243),
    scene_breakdown: [],
    scene_list: [],
    continuity_notes: [],
    items_in_play: [],
    foreshadowing: [],
    raw_payload: {},
    created_at: '2030-01-01T00:00:00.000Z',
    updated_at: '2030-01-03T00:00:00.000Z',
    ...overrides,
  }
}

function version(overrides: Partial<NovelChapterVersionRecord> = {}): NovelChapterVersionRecord {
  return {
    id: 21,
    chapter_id: 11,
    project_id: 7,
    version_no: 3,
    chapter_text: '旧'.repeat(5910),
    scene_breakdown: [],
    continuity_notes: [],
    source: 'repair',
    created_at: '2030-01-02T00:00:00.000Z',
    ...overrides,
  }
}

function review(overrides: Partial<NovelReviewRecord> = {}): NovelReviewRecord {
  return {
    id: 31,
    project_id: 7,
    review_type: 'editor_revision',
    status: 'ok',
    summary: '',
    issues: [],
    payload: JSON.stringify({ chapter_id: 11 }),
    created_at: '2030-01-02T00:00:00.000Z',
    ...overrides,
  }
}

function run(overrides: Partial<NovelRunRecord> = {}): NovelRunRecord {
  return {
    id: 41,
    project_id: 7,
    run_type: 'editor_revision',
    step_name: 'chapter-4',
    status: 'completed',
    input_ref: JSON.stringify({ chapter_id: 11 }),
    output_ref: '',
    created_at: '2030-01-02T00:00:00.000Z',
    ...overrides,
  }
}

function detect(overrides: Partial<Parameters<typeof detectEditorRevisionDamage>[0]> = {}) {
  return detectEditorRevisionDamage({
    chapters: [chapter()],
    versions: [version()],
    reviews: [review()],
    runs: [],
    ...overrides,
  })
}

function currentPreview(text: string) {
  const [evidence] = detect({ chapters: [chapter({ chapter_text: text })] })
  if (!evidence) throw new Error('expected damaged chapter evidence')
  return evidence.diff_summary.current_preview
}

function detectReviewReference(input: {
  chapterId: number
  value: unknown
  key?: 'chapter_id' | 'chapterId'
  directPayload?: boolean
}) {
  const payload = { [input.key || 'chapter_id']: input.value }
  return detect({
    chapters: [chapter({ id: input.chapterId })],
    versions: [version({ chapter_id: input.chapterId })],
    reviews: [review({ payload: input.directPayload ? payload as any : JSON.stringify(payload) })],
    runs: [],
  })
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const item of Object.values(value as Record<string, unknown>)) deepFreeze(item)
  }
  return value
}

describe('detectEditorRevisionDamage', () => {
  test('reports a 5910-character repair snapshot shortened to 243 characters', () => {
    const currentText = '现'.repeat(243)
    const versionText = '旧'.repeat(5910)
    const [evidence] = detect({
      chapters: [chapter({ chapter_text: currentText })],
      versions: [version({ chapter_text: versionText })],
    })

    expect(evidence).toMatchObject({
      project_id: 7,
      chapter_id: 11,
      chapter_no: 4,
      current_hash: revisionTextHash(currentText),
      current_char_count: 243,
      suggested_version_id: 21,
      suggested_version_hash: revisionTextHash(versionText),
      suggested_version_char_count: 5910,
      editor_revision_review_ids: [31],
      editor_revision_run_ids: [],
      diff_summary: {
        removed_chars: 5667,
        added_chars: 0,
      },
    })
    expect(evidence.ratio).toBe(243 / 5910)
    expect(evidence.ratio).toBeLessThan(0.7)
  })

  test('does not report an exact 70 percent ratio', () => {
    expect(detect({
      chapters: [chapter({ chapter_text: '现'.repeat(700) })],
      versions: [version({ chapter_text: '旧'.repeat(1000) })],
    })).toEqual([])
  })

  test('does not report healthy 90 percent prose', () => {
    expect(detect({
      chapters: [chapter({ chapter_text: '现'.repeat(900) })],
      versions: [version({ chapter_text: '旧'.repeat(1000) })],
    })).toEqual([])
  })

  test('does not report manual shortening without editor revision evidence', () => {
    expect(detect({ reviews: [], runs: [] })).toEqual([])
    expect(detect({
      reviews: [review({ review_type: 'manual_edit' })],
      runs: [run({ run_type: 'manual_edit' })],
    })).toEqual([])
  })

  test('does not report a chapter without a repair version', () => {
    expect(detect({
      versions: [version({ source: 'manual_edit' })],
    })).toEqual([])
  })

  test('accepts review and run evidence at both inclusive time boundaries and rejects evidence after 24 hours', () => {
    expect(detect({ reviews: [], runs: [run()] })).toHaveLength(1)
    const results = detect({
      reviews: [
        review({ id: 9, created_at: '2030-01-02T00:00:00.000Z' }),
        review({ id: 3, payload: JSON.stringify({ chapterId: 11 }), created_at: '2030-01-03T00:00:00.000Z' }),
        review({ id: 9, created_at: '2030-01-02T12:00:00.000Z' }),
        review({ id: 7, created_at: '2030-01-01T23:59:59.999Z' }),
        review({ id: 10, created_at: '2030-01-03T00:00:00.001Z' }),
        review({ id: 11, payload: JSON.stringify({ chapter_id: 999 }) }),
      ],
      runs: [
        run({ id: 8, created_at: '2030-01-02T00:00:00.000Z' }),
        run({ id: 2, input_ref: JSON.stringify({ chapterId: 11 }), created_at: '2030-01-03T00:00:00.000Z' }),
        run({ id: 8, created_at: '2030-01-02T06:00:00.000Z' }),
        run({ id: 6, created_at: '2030-01-01T23:59:59.999Z' }),
        run({ id: 12, created_at: '2030-01-03T00:00:00.001Z' }),
        run({ id: 13, input_ref: JSON.stringify({ chapter_id: 999 }) }),
      ],
    })

    expect(results).toHaveLength(1)
    expect(results[0].editor_revision_review_ids).toEqual([3, 9])
    expect(results[0].editor_revision_run_ids).toEqual([2, 8])
  })

  test('accepts only positive safe-integer chapter ids and canonical decimal strings', () => {
    expect(detectReviewReference({ chapterId: 11, value: 11 })).toHaveLength(1)
    expect(detectReviewReference({ chapterId: Number.MAX_SAFE_INTEGER, value: Number.MAX_SAFE_INTEGER })).toHaveLength(1)
    expect(detect({
      reviews: [],
      runs: [run({ input_ref: JSON.stringify({ chapterId: '11' }) })],
    })).toHaveLength(1)
    expect(detectReviewReference({
      chapterId: Number.MAX_SAFE_INTEGER,
      value: String(Number.MAX_SAFE_INTEGER),
      key: 'chapterId',
    })).toHaveLength(1)

    const malformed = [
      { label: 'boolean', chapterId: 1, value: true },
      { label: 'array', chapterId: 11, value: [11] },
      { label: 'object', chapterId: 11, value: { valueOf: () => 11 }, directPayload: true },
      { label: 'float', chapterId: 11.5, value: 11.5 },
      { label: 'zero', chapterId: 0, value: 0 },
      { label: 'negative', chapterId: -11, value: -11 },
      { label: 'unsafe integer', chapterId: Number.MAX_SAFE_INTEGER + 1, value: Number.MAX_SAFE_INTEGER + 1 },
      { label: 'padded string', chapterId: 11, value: ' 11 ' },
      { label: 'decimal string', chapterId: 11, value: '11.0' },
      { label: 'exponent string', chapterId: 11, value: '1.1e1' },
      { label: 'plus string', chapterId: 11, value: '+11' },
      { label: 'leading-zero string', chapterId: 11, value: '011' },
    ]
    const incorrectlyAccepted = malformed
      .filter(item => detectReviewReference(item).length > 0)
      .map(item => item.label)

    expect(incorrectlyAccepted).toEqual([])
  })

  test('selects the highest repair version number and ignores newer manual versions', () => {
    const lowerRepair = version({ id: 51, version_no: 1, chapter_text: '低'.repeat(1000) })
    const highestRepair = version({ id: 53, version_no: 7, chapter_text: '高'.repeat(5910) })
    const newerManual = version({ id: 99, version_no: 99, source: 'manual_edit', chapter_text: '手'.repeat(9000) })
    const [evidence] = detect({
      versions: [highestRepair, newerManual, lowerRepair],
    })

    expect(evidence.suggested_version_id).toBe(53)
    expect(evidence.suggested_version_char_count).toBe(5910)
  })

  test('does not mutate deeply frozen inputs and previews only compact first and last 120 characters', () => {
    const currentText = `  开头\n${'现'.repeat(300)}\n结尾  `
    const versionText = `  旧开头\n${'旧'.repeat(5910)}\n旧结尾  `
    const input = deepFreeze({
      chapters: [chapter({ chapter_text: currentText })],
      versions: [version({ chapter_text: versionText })],
      reviews: [review()],
      runs: [run()],
    })
    const before = JSON.stringify(input)
    const [evidence] = detectEditorRevisionDamage(input)

    expect(JSON.stringify(input)).toBe(before)
    const compactCurrent = currentText.replace(/\s+/g, ' ').trim()
    const compactVersion = versionText.replace(/\s+/g, ' ').trim()
    expect(evidence.diff_summary.current_preview).toBe(`${compactCurrent.slice(0, 120)}…${compactCurrent.slice(-120)}`)
    expect(evidence.diff_summary.version_preview).toBe(`${compactVersion.slice(0, 120)}…${compactVersion.slice(-120)}`)
    expect(evidence.diff_summary.current_preview).not.toContain(compactCurrent)
    expect(evidence.diff_summary.version_preview).not.toContain(compactVersion)
    expect(evidence.diff_summary.current_preview).not.toMatch(/\n|\s{2,}/)
    expect(evidence.diff_summary.version_preview).not.toMatch(/\n|\s{2,}/)
    expect(countProseChars(currentText)).toBe(evidence.current_char_count)
  })

  test('does not reproduce a short full text when the omitted character is an ellipsis', () => {
    expect(currentPreview('a…b')).not.toBe('a…b')
  })

  test('does not reproduce a single ellipsis character', () => {
    expect(currentPreview('…')).toBe('')
  })

  test('omits two characters when a 241-character middle omission is itself an ellipsis', () => {
    const source = `${'a'.repeat(120)}…${'b'.repeat(120)}`
    expect(source).toHaveLength(241)
    expect(currentPreview(source)).toBe(`${'a'.repeat(120)}…${'b'.repeat(119)}`)
    expect(currentPreview(source)).not.toBe(source)
  })
})

async function createCliFixture() {
  const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-damage-audit-'))
  temporaryWorkspaces.push(workspace)
  const dbPath = join(workspace, 'novel.sqlite')
  const damagedCurrentText = '现'.repeat(243)
  const damagedVersionText = '旧'.repeat(5910)
  const db = new Database(dbPath)
  try {
    db.exec(`
      CREATE TABLE projects (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE chapters (
        id INTEGER PRIMARY KEY,
        project_id INTEGER NOT NULL,
        chapter_no INTEGER NOT NULL,
        title TEXT NOT NULL,
        chapter_text TEXT DEFAULT '',
        scene_breakdown TEXT DEFAULT '[]',
        scene_list TEXT DEFAULT '[]',
        continuity_notes TEXT DEFAULT '[]',
        items_in_play TEXT DEFAULT '[]',
        foreshadowing TEXT DEFAULT '[]',
        raw_payload TEXT DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE chapter_versions (
        id INTEGER PRIMARY KEY,
        chapter_id INTEGER NOT NULL,
        project_id INTEGER NOT NULL,
        version_no INTEGER NOT NULL,
        chapter_text TEXT DEFAULT '',
        scene_breakdown TEXT DEFAULT '[]',
        continuity_notes TEXT DEFAULT '[]',
        source TEXT DEFAULT 'manual_edit',
        created_at TEXT NOT NULL
      );
      CREATE TABLE reviews (
        id INTEGER PRIMARY KEY,
        project_id INTEGER NOT NULL,
        review_type TEXT NOT NULL,
        status TEXT NOT NULL,
        summary TEXT DEFAULT '',
        issues TEXT DEFAULT '[]',
        payload TEXT DEFAULT '',
        created_at TEXT NOT NULL
      );
      CREATE TABLE runs (
        id INTEGER PRIMARY KEY,
        project_id INTEGER NOT NULL,
        run_type TEXT NOT NULL,
        step_name TEXT NOT NULL,
        status TEXT NOT NULL,
        input_ref TEXT DEFAULT '',
        output_ref TEXT DEFAULT '',
        duration_ms INTEGER DEFAULT 0,
        error_message TEXT DEFAULT '',
        created_at TEXT NOT NULL
      );
    `)
    const insertProject = db.query('INSERT INTO projects (id, title, updated_at) VALUES (?, ?, ?)')
    insertProject.run(1, '损坏项目', '2030-01-03T00:00:00.000Z')
    insertProject.run(2, '无关健康项目', '2030-01-03T00:00:00.000Z')
    const insertChapter = db.query(`
      INSERT INTO chapters (
        id, project_id, chapter_no, title, chapter_text, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    insertChapter.run(10, 1, 1, '受损章节', damagedCurrentText, '2030-01-01T00:00:00.000Z', '2030-01-03T00:00:00.000Z')
    insertChapter.run(110, 2, 1, '健康章节', '健'.repeat(900), '2030-01-01T00:00:00.000Z', '2030-01-03T00:00:00.000Z')
    const insertVersion = db.query(`
      INSERT INTO chapter_versions (
        id, chapter_id, project_id, version_no, chapter_text, source, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    insertVersion.run(20, 10, 1, 1, damagedVersionText, 'repair', '2030-01-02T00:00:00.000Z')
    insertVersion.run(120, 110, 2, 1, '康'.repeat(1000), 'repair', '2030-01-02T00:00:00.000Z')
    const insertReview = db.query(`
      INSERT INTO reviews (id, project_id, review_type, status, payload, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    insertReview.run(30, 1, 'editor_revision', 'ok', JSON.stringify({ chapter_id: 10 }), '2030-01-02T00:00:00.000Z')
    insertReview.run(130, 2, 'editor_revision', 'ok', JSON.stringify({ chapter_id: 110 }), '2030-01-02T00:00:00.000Z')
    const insertRun = db.query(`
      INSERT INTO runs (id, project_id, run_type, step_name, status, input_ref, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    insertRun.run(40, 1, 'editor_revision', 'chapter-1', 'completed', JSON.stringify({ chapterId: 10 }), '2030-01-02T00:00:00.000Z')
    insertRun.run(140, 2, 'editor_revision', 'chapter-1', 'completed', JSON.stringify({ chapterId: 110 }), '2030-01-02T00:00:00.000Z')
  } finally {
    db.close()
  }
  return { workspace, dbPath, damagedCurrentText, damagedVersionText }
}

async function databaseSnapshot(dbPath: string) {
  const [bytes, details] = await Promise.all([
    readFile(dbPath),
    stat(dbPath, { bigint: true }),
  ])
  return {
    sha256: createHash('sha256').update(bytes).digest('hex'),
    size: details.size.toString(),
    mtimeNs: details.mtimeNs.toString(),
  }
}

async function runCli(args: string[]) {
  const child = Bun.spawn({
    cmd: [process.execPath, 'scripts/audit-editor-revision-damage.ts', ...args],
    cwd: repoRoot,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  return { exitCode, stdout, stderr }
}

describe('audit-editor-revision-damage CLI', () => {
  test('reports exact damaged evidence, isolates projects, and leaves the database unchanged', async () => {
    const { workspace, dbPath, damagedCurrentText, damagedVersionText } = await createCliFixture()
    const packageJson = JSON.parse(await readFile(join(repoRoot, 'package.json'), 'utf8'))
    const before = await databaseSnapshot(dbPath)
    const exactEvidence = {
      project_id: 1,
      chapter_id: 10,
      chapter_no: 1,
      current_hash: revisionTextHash(damagedCurrentText),
      current_char_count: 243,
      suggested_version_id: 20,
      suggested_version_hash: revisionTextHash(damagedVersionText),
      suggested_version_char_count: 5910,
      ratio: 243 / 5910,
      editor_revision_review_ids: [30],
      editor_revision_run_ids: [40],
      diff_summary: {
        removed_chars: 5667,
        added_chars: 0,
        current_preview: `${'现'.repeat(120)}…${'现'.repeat(120)}`,
        version_preview: `${'旧'.repeat(120)}…${'旧'.repeat(120)}`,
      },
    }

    expect(packageJson.scripts['audit:editor-revision-damage']).toBe('bun scripts/audit-editor-revision-damage.ts')
    const unfiltered = await runCli(['--workspace', workspace])
    expect(unfiltered.exitCode, unfiltered.stderr).toBe(0)
    const unfilteredOutput = {
      workspace,
      project_id: null,
      damaged_count: 1,
      evidence: [exactEvidence],
      restore_performed: false,
    }
    expect(JSON.parse(unfiltered.stdout)).toEqual(unfilteredOutput)
    expect(unfiltered.stdout).toBe(`${JSON.stringify(unfilteredOutput, null, 2)}\n`)

    const filtered = await runCli(['--workspace', workspace, '--project-id', '1'])
    expect(filtered.exitCode, filtered.stderr).toBe(0)
    const filteredOutput = {
      workspace,
      project_id: 1,
      damaged_count: 1,
      evidence: [exactEvidence],
      restore_performed: false,
    }
    expect(JSON.parse(filtered.stdout)).toEqual(filteredOutput)
    expect(filtered.stdout).toBe(`${JSON.stringify(filteredOutput, null, 2)}\n`)

    const unrelated = await runCli(['--workspace', workspace, '--project-id', '2'])
    expect(unrelated.exitCode, unrelated.stderr).toBe(0)
    const unrelatedOutput = {
      workspace,
      project_id: 2,
      damaged_count: 0,
      evidence: [],
      restore_performed: false,
    }
    expect(JSON.parse(unrelated.stdout)).toEqual(unrelatedOutput)
    expect(unrelated.stdout).toBe(`${JSON.stringify(unrelatedOutput, null, 2)}\n`)
    expect(await databaseSnapshot(dbPath)).toEqual(before)
  })

  test('rejects a missing workspace argument and relative workspace paths', async () => {
    const missing = await runCli([])
    expect(missing.exitCode).not.toBe(0)
    expect(missing.stderr).toMatch(/workspace/i)

    const relative = await runCli(['--workspace', 'relative/workspace'])
    expect(relative.exitCode).not.toBe(0)
    expect(relative.stderr).toMatch(/absolute|绝对/i)
  })

  test('rejects unknown and restore or apply style flags', async () => {
    const { workspace } = await createCliFixture()
    for (const flag of ['--unknown-flag', '--restore', '--restore-damage', '--apply', '--apply-repair']) {
      const result = await runCli(['--workspace', workspace, flag])
      expect(result.exitCode, flag).not.toBe(0)
      expect(result.stderr, flag).toMatch(/unknown|restore|apply|不支持/i)
    }
  })

  test('rejects missing novel.sqlite and invalid project ids', async () => {
    const emptyWorkspace = await mkdtemp(join(tmpdir(), 'mangaforge-damage-audit-empty-'))
    temporaryWorkspaces.push(emptyWorkspace)
    const missingDb = await runCli(['--workspace', emptyWorkspace])
    expect(missingDb.exitCode).not.toBe(0)
    expect(missingDb.stderr).toMatch(/novel\.sqlite/i)

    const { workspace } = await createCliFixture()
    for (const projectId of ['0', '-1', '1.5', 'not-a-number']) {
      const result = await runCli(['--workspace', workspace, '--project-id', projectId])
      expect(result.exitCode, projectId).not.toBe(0)
      expect(result.stderr, projectId).toMatch(/project[-_ ]id|project id/i)
    }
  })
})
