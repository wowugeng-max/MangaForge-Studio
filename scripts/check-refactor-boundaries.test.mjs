import { afterEach, describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname)
const scriptPath = path.join(repoRoot, 'scripts', 'check-refactor-boundaries.mjs')
const tempRoots = []

function makeTempRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mangaforge-refactor-boundaries-'))
  tempRoots.push(root)
  return root
}

function writeFile(root, relativePath, text) {
  const filePath = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, text)
}

function runBoundaryCheck(root, configPath = 'refactor-boundaries.json') {
  return spawnSync(process.execPath, [
    scriptPath,
    '--root',
    root,
    '--config',
    path.join(root, configPath),
  ], {
    encoding: 'utf8',
  })
}

afterEach(() => {
  while (tempRoots.length) {
    fs.rmSync(tempRoots.pop(), { recursive: true, force: true })
  }
})

describe('check-refactor-boundaries', () => {
  test('passes when monitored files stay within line/export/import boundaries', () => {
    const root = makeTempRepo()
    writeFile(root, 'refactor-boundaries.json', JSON.stringify({
      files: [
        {
          path: 'src/legacy-service.ts',
          max_lines: 5,
          max_exported_declarations: 2,
        },
      ],
      legacy_imports: [
        {
          module: './legacy-service',
          allowed_importers: ['src/legacy-service.test.ts'],
        },
      ],
    }))
    writeFile(root, 'src/legacy-service.ts', [
      'export function first() {}',
      'export type Second = string',
      'const hidden = 1',
    ].join('\n'))
    writeFile(root, 'src/legacy-service.test.ts', "import { first } from './legacy-service'\n")

    const result = runBoundaryCheck(root)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('[refactor-boundaries] ok')
  })

  test('fails when a file grows, adds exports, or gains a new legacy importer', () => {
    const root = makeTempRepo()
    writeFile(root, 'refactor-boundaries.json', JSON.stringify({
      files: [
        {
          path: 'src/legacy-service.ts',
          max_lines: 2,
          max_exported_declarations: 1,
        },
      ],
      legacy_imports: [
        {
          module: './legacy-service',
          allowed_importers: ['src/legacy-service.test.ts'],
        },
      ],
    }))
    writeFile(root, 'src/legacy-service.ts', [
      'export function first() {}',
      'export const second = 2',
      'const third = 3',
    ].join('\n'))
    writeFile(root, 'src/new-route.ts', "import { first } from './legacy-service'\n")

    const result = runBoundaryCheck(root)
    const output = `${result.stdout}\n${result.stderr}`

    expect(result.status).toBe(1)
    expect(output).toContain('src/legacy-service.ts has 3 lines, max 2')
    expect(output).toContain('src/legacy-service.ts has 2 exported declarations, max 1')
    expect(output).toContain('src/new-route.ts imports ./legacy-service')
  })
})
