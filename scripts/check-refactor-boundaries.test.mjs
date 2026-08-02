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
  test('passes within boundaries and excludes re-exports from the direct declaration count', () => {
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
          target: 'src/legacy-service.ts',
          allowed_importers: ['src/legacy-service.test.ts'],
        },
      ],
    }))
    writeFile(root, 'src/legacy-service.ts', [
      'export function first() {}',
      'export type Second = string',
      "export * from './canonical-service'",
      'const hidden = 1',
    ].join('\n'))
    writeFile(root, 'src/canonical-service.ts', 'export const canonical = true\n')
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
          target: 'src/legacy-service.ts',
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

  test('resolves literal relative module specifiers to one legacy target', () => {
    const root = makeTempRepo()
    writeFile(root, 'refactor-boundaries.json', JSON.stringify({
      scan_roots: ['src'],
      legacy_imports: [
        {
          target: 'src/routes/legacy-service.ts',
          allowed_importers: [],
        },
      ],
    }))
    writeFile(root, 'src/routes/legacy-service.ts', 'export const legacy = true\n')
    writeFile(root, 'src/routes/same-level.ts', "import { legacy } from './legacy-service'\n")
    writeFile(root, 'src/routes/nested/parent.ts', "import { legacy } from '../legacy-service'\n")
    writeFile(root, 'src/routes/explicit-extension.ts', "import { legacy } from './legacy-service.ts'\n")
    writeFile(root, 'src/routes/dynamic.ts', "const legacy = await import('./legacy-service')\n")
    writeFile(root, 'src/routes/required.cjs', "const legacy = require('./legacy-service')\n")
    writeFile(root, 'src/routes/export-from.ts', "export { legacy } from './legacy-service'\n")
    writeFile(root, 'src/routes/side-effect.ts', "import './legacy-service'\n")

    const result = runBoundaryCheck(root)
    const output = `${result.stdout}\n${result.stderr}`

    expect(result.status).toBe(1)
    for (const importer of [
      'src/routes/same-level.ts',
      'src/routes/nested/parent.ts',
      'src/routes/explicit-extension.ts',
      'src/routes/dynamic.ts',
      'src/routes/required.cjs',
      'src/routes/export-from.ts',
      'src/routes/side-effect.ts',
    ]) {
      expect(output).toContain(`${importer} imports`)
    }
  })

  test('ignores the same basename when it resolves to another package or ordinary text', () => {
    const root = makeTempRepo()
    writeFile(root, 'refactor-boundaries.json', JSON.stringify({
      scan_roots: ['src'],
      legacy_imports: [
        {
          target: 'src/routes/legacy-service.ts',
          allowed_importers: [],
        },
      ],
    }))
    writeFile(root, 'src/routes/legacy-service.ts', 'export const legacy = true\n')
    writeFile(root, 'src/legacy-service/index.ts', 'export const canonical = true\n')
    writeFile(root, 'src/package-consumer.ts', [
      "import { canonical } from './legacy-service'",
      "const documentation = \"import './routes/legacy-service'\"",
      "// import './routes/legacy-service'",
    ].join('\n'))

    const result = runBoundaryCheck(root)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('[refactor-boundaries] ok')
  })

  test('fails closed for every invalid legacy target configuration', () => {
    const cases = []

    {
      const root = makeTempRepo()
      cases.push({ name: 'empty target', root, rule: { target: '' } })
    }
    {
      const root = makeTempRepo()
      cases.push({ name: 'module-only schema', root, rule: { module: './legacy-service' } })
    }
    {
      const root = makeTempRepo()
      const outsideRoot = makeTempRepo()
      const outsideFile = path.join(outsideRoot, 'legacy-service.ts')
      writeFile(outsideRoot, 'legacy-service.ts', 'export const outside = true\n')
      cases.push({ name: 'absolute target', root, rule: { target: outsideFile } })
      cases.push({ name: 'lexical parent escape', root, rule: { target: path.relative(root, outsideFile) } })
    }
    {
      const root = makeTempRepo()
      writeFile(root, 'src/placeholder.ts', 'export const placeholder = true\n')
      cases.push({ name: 'directory target', root, rule: { target: 'src' } })
      cases.push({ name: 'missing target', root, rule: { target: 'src/missing.ts' } })
    }

    const outcomes = cases.map(({ name, root, rule }) => {
      writeFile(root, 'refactor-boundaries.json', JSON.stringify({
        scan_roots: ['src'],
        legacy_imports: [{ ...rule, allowed_importers: [] }],
      }))
      const result = runBoundaryCheck(root)
      return {
        name,
        status: result.status,
        invalidTarget: `${result.stdout}\n${result.stderr}`.includes('invalid legacy import target'),
      }
    })

    expect(outcomes).toEqual(cases.map(({ name }) => ({ name, status: 1, invalidTarget: true })))
  })

  test('rejects an in-repo symlink target whose real path escapes the root', () => {
    const root = makeTempRepo()
    const outsideRoot = makeTempRepo()
    const outsideFile = path.join(outsideRoot, 'legacy-service.ts')
    writeFile(outsideRoot, 'legacy-service.ts', 'export const outside = true\n')
    writeFile(root, 'refactor-boundaries.json', JSON.stringify({
      scan_roots: ['src'],
      legacy_imports: [{ target: 'src/legacy-link.ts', allowed_importers: [] }],
    }))
    fs.mkdirSync(path.join(root, 'src'), { recursive: true })
    try {
      fs.symlinkSync(outsideFile, path.join(root, 'src/legacy-link.ts'))
    } catch (error) {
      if (process.platform === 'win32') return
      throw error
    }

    const result = runBoundaryCheck(root)
    const output = `${result.stdout}\n${result.stderr}`

    expect(result.status).toBe(1)
    expect(output).toContain('invalid legacy import target')
  })

  test('matches Bun runtime extension remaps and scans mts and cts importers', () => {
    const root = makeTempRepo()
    writeFile(root, 'refactor-boundaries.json', JSON.stringify({
      scan_roots: ['src'],
      legacy_imports: [
        { target: 'src/legacy-service.ts', allowed_importers: [] },
        { target: 'src/legacy-module.mts', allowed_importers: [] },
      ],
    }))
    writeFile(root, 'src/legacy-service.ts', 'export const legacy = true\n')
    writeFile(root, 'src/legacy-module.mts', 'export const legacyModule = true\n')
    writeFile(root, 'src/js-remap.ts', "import { legacy } from './legacy-service.js'\n")
    writeFile(root, 'src/mjs-remap.ts', "import { legacyModule } from './legacy-module.mjs'\n")
    writeFile(root, 'src/cts-importer.cts', "import { legacy } from './legacy-service'\n")

    const result = runBoundaryCheck(root)
    const output = `${result.stdout}\n${result.stderr}`

    expect(result.status).toBe(1)
    expect(output).toContain('src/js-remap.ts imports ./legacy-service.js')
    expect(output).toContain('src/mjs-remap.ts imports ./legacy-module.mjs')
    expect(output).toContain('src/cts-importer.cts imports ./legacy-service')
  })

  test('prefers an exact runtime extension file over a remapped TypeScript basename', () => {
    const root = makeTempRepo()
    writeFile(root, 'refactor-boundaries.json', JSON.stringify({
      scan_roots: ['src'],
      legacy_imports: [{ target: 'src/legacy-service.ts', allowed_importers: [] }],
    }))
    writeFile(root, 'src/legacy-service.ts', 'export const legacy = true\n')
    writeFile(root, 'src/legacy-service.js', 'export const canonical = true\n')
    writeFile(root, 'src/consumer.ts', "import { canonical } from './legacy-service.js'\n")

    const result = runBoundaryCheck(root)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('[refactor-boundaries] ok')
  })

  test('ignores member calls and template raw text that resemble module loading', () => {
    const root = makeTempRepo()
    writeFile(root, 'refactor-boundaries.json', JSON.stringify({
      scan_roots: ['src'],
      legacy_imports: [{ target: 'src/legacy-service.ts', allowed_importers: [] }],
    }))
    writeFile(root, 'src/legacy-service.ts', 'export const legacy = true\n')
    writeFile(root, 'src/consumer.ts', [
      "loader.import('./legacy-service')",
      "loader.require('./legacy-service')",
      "const raw = `import('./legacy-service')`",
    ].join('\n'))

    const result = runBoundaryCheck(root)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('[refactor-boundaries] ok')
  })

  test('decodes escaped relative literals and scans dynamic imports in template expressions', () => {
    const root = makeTempRepo()
    writeFile(root, 'refactor-boundaries.json', JSON.stringify({
      scan_roots: ['src'],
      legacy_imports: [{ target: 'src/legacy-service.ts', allowed_importers: [] }],
    }))
    writeFile(root, 'src/legacy-service.ts', 'export const legacy = true\n')
    writeFile(root, 'src/hex-escape.ts', "import { legacy } from '\\x2e/legacy-service'\n")
    writeFile(root, 'src/unicode-escape.ts', "import { legacy } from '\\u002e/legacy-service'\n")
    writeFile(root, 'src/codepoint-escape.ts', "import { legacy } from '\\u{2e}/legacy-service'\n")
    writeFile(root, 'src/template-expression.ts', "const loaded = `${await import('./legacy-service')}`\n")
    writeFile(root, 'src/nested-template-expression.ts', "const loaded = `${`nested ${await import('./legacy-service')}`}`\n")

    const result = runBoundaryCheck(root)
    const output = `${result.stdout}\n${result.stderr}`

    expect(result.status).toBe(1)
    for (const importer of [
      'src/hex-escape.ts',
      'src/unicode-escape.ts',
      'src/codepoint-escape.ts',
      'src/template-expression.ts',
      'src/nested-template-expression.ts',
    ]) {
      expect(output).toContain(`${importer} imports`)
    }
  })

  test('fails safely for invalid string escapes without executing text', () => {
    const root = makeTempRepo()
    writeFile(root, 'refactor-boundaries.json', JSON.stringify({
      scan_roots: ['src'],
      legacy_imports: [{ target: 'src/legacy-service.ts', allowed_importers: [] }],
    }))
    writeFile(root, 'src/legacy-service.ts', 'export const legacy = true\n')
    writeFile(root, 'src/invalid-escape.ts', "import '\\u{110000}/legacy-service'\n")

    const result = runBoundaryCheck(root)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('[refactor-boundaries] ok')
  })

  test('counts export type declarations but excludes every re-export form', () => {
    const root = makeTempRepo()
    writeFile(root, 'refactor-boundaries.json', JSON.stringify({
      files: [{
        path: 'src/public.ts',
        max_lines: 4,
        max_exported_declarations: 1,
      }],
    }))
    writeFile(root, 'src/public.ts', [
      'export type Direct = string',
      "export type { Imported } from './canonical'",
      "export { value } from './canonical'",
      "export * from './canonical'",
    ].join('\n'))

    const result = runBoundaryCheck(root)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('[refactor-boundaries] ok')
  })
})
