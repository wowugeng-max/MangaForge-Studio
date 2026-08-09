import { describe, expect, test } from 'bun:test'
import { access, mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  SkillParseError,
  parseSkillDocument,
  readOpenAIMetadata,
} from './frontmatter'
import {
  assertSafeRelativeSkillPath,
  loadSkillReferences,
  validateSkillPackArchiveEntry,
} from './path-safety'

function expectOrderedTokens(content: string, tokens: string[]) {
  let previousIndex = -1
  for (const token of tokens) {
    const index = content.indexOf(token)
    expect(index).toBeGreaterThanOrEqual(0)
    expect(index).toBeGreaterThan(previousIndex)
    previousIndex = index
  }
}

describe('canvas skill contracts and parser', () => {
  test('parses normalized frontmatter, infers directory name, and extracts explicit references only', () => {
    const raw = `---
name: Fancy H3 Prompt
description: Converts a rough idea into a video prompt
user-invocable: true
media_modes: [text_to_video, image_to_video]
trigger-words: [h3, video prompt]
argument-hint: "[style]"
arguments:
  - name: style
    description: Visual style
    required: false
---
# Prompt recipe

Read [the base guide](references/base-en.txt) and \`references/ref-en.txt\`.
Do not load references/implicit.txt or execute \`scripts/build.ts\`.
`
    const parsed = parseSkillDocument(raw, '/packs/demo/skills/fancy-dir/SKILL.md')
    const manifest = parsed.manifest

    expect(manifest.name).toBe('Fancy H3 Prompt')
    expect(manifest.directoryName).toBe('fancy-dir')
    expect(manifest.userInvocable).toBe(true)
    expect(manifest.mediaModes).toEqual(['text_to_video', 'image_to_video'])
    expect(manifest.triggerWords).toEqual(['h3', 'video prompt'])
    expect(manifest.argumentHint).toBe('[style]')
    expect(manifest.arguments).toEqual([
      { name: 'style', description: 'Visual style', required: false },
    ])
    expect(manifest.references).toEqual([
      'references/base-en.txt',
      'references/ref-en.txt',
    ])
    expect(parsed.references).toEqual(manifest.references)
    expect(manifest.body).toContain('scripts/build.ts')
  })

  test('keeps later markdown delimiters in the body', () => {
    const manifest = parseSkillDocument(
      '---\nname: delimiter-check\ndescription: test\n---\nBefore\n---\nAfter',
      '/packs/demo/skills/delimiter-check/SKILL.md',
    ).manifest
    expect(manifest.body).toBe('Before\n---\nAfter')
  })

  test('reads trigger words and media modes from nested metadata', () => {
    const parsed = parseSkillDocument(
      '---\nname: nested-fields\ndescription: test\nmetadata:\n  trigger-words: [cinematic, animate]\n  media_modes: [text_to_video]\n---\nbody',
      '/packs/demo/skills/nested-fields/SKILL.md',
    )
    expect(parsed.manifest.triggerWords).toEqual(['cinematic', 'animate'])
    expect(parsed.manifest.mediaModes).toEqual(['text_to_video'])
  })

  test('fails with typed errors for missing or malformed frontmatter', () => {
    expect(() => parseSkillDocument('# no delimiter', '/tmp/skills/x/SKILL.md')).toThrow(
      expect.objectContaining({ code: 'SKILL_FRONTMATTER_MISSING' }),
    )
    expect(() =>
      parseSkillDocument('---\nname: [broken\n---\nbody', '/tmp/skills/x/SKILL.md'),
    ).toThrow(SkillParseError)
    expect(() =>
      parseSkillDocument('---\nname: [broken\n---\nbody', '/tmp/skills/x/SKILL.md'),
    ).toThrow(expect.objectContaining({ code: 'SKILL_FRONTMATTER_INVALID' }))
    expect(() => parseSkillDocument('---\nname: missing-close\n', '/tmp/skills/x/SKILL.md')).toThrow(
      expect.objectContaining({ code: 'SKILL_FRONTMATTER_MISSING' }),
    )
  })

  test('reads only the supported OpenAI metadata keys', () => {
    expect(
      readOpenAIMetadata(`display_name: H3\nshort_description: Prompt helper\ndefault_prompt: "Use cinematic motion"\nmodel: secret`),
    ).toEqual({
      displayName: 'H3',
      shortDescription: 'Prompt helper',
      defaultPrompt: 'Use cinematic motion',
    })
  })

  test('rejects a SKILL.md body larger than 256 KiB', () => {
    const raw = `---\nname: too-large\ndescription: test\n---\n${'x'.repeat(256 * 1024)}`
    expect(() => parseSkillDocument(raw, '/tmp/skills/too-large/SKILL.md')).toThrow(
      expect.objectContaining({ code: 'SKILL_FILE_TOO_LARGE' }),
    )
  })

  test('accepts a SKILL.md whose complete UTF-8 document is exactly 256 KiB', () => {
    const header = '---\nname: exact-size\ndescription: test\n---\n'
    const targetBytes = 256 * 1024
    const raw = header + 'x'.repeat(targetBytes - Buffer.byteLength(header, 'utf8'))
    expect(Buffer.byteLength(raw, 'utf8')).toBe(targetBytes)
    expect(parseSkillDocument(raw, '/tmp/skills/exact-size/SKILL.md').manifest.name).toBe('exact-size')
  })

  test('parses and loads only the explicit references in the H3 fixture', async () => {
    const fixtureRoot = join(import.meta.dir, 'fixtures', 'h3-prompt-writing')
    const raw = await readFile(join(fixtureRoot, 'SKILL.md'), 'utf8')
    const parsed = parseSkillDocument(raw, join(fixtureRoot, 'SKILL.md'))
    const manifest = parsed.manifest
    const loaded = await loadSkillReferences(fixtureRoot, parsed.references)

    expect(manifest.name).toBe('h3-prompt-writing')
    expect(manifest.mediaModes).toEqual([])
    expect(loaded.map((item) => item.relativePath)).toEqual([
      'references/base-en.txt',
      'references/ref-en.txt',
    ])
    expect(loaded[0]?.content).toContain('H3_BASE_GUIDE_CONTRACT')
    expect(loaded[1]?.content).toContain('H3_REF_GUIDE_CONTRACT')
  })

  test('pins the checked-in H3 field order, alignment labels, timing, references, and negative prompt contract', async () => {
    const fixtureRoot = join(import.meta.dir, 'fixtures', 'h3-prompt-writing', 'references')
    const [base, fullReference] = await Promise.all([
      readFile(join(fixtureRoot, 'base-en.txt'), 'utf8'),
      readFile(join(fixtureRoot, 'ref-en.txt'), 'utf8'),
    ])

    expectOrderedTokens(base, [
      'integrated_multimodal_description:',
      'overall_soundscape:',
      'non_diegetic_music:',
    ])
    expect(base).toContain('[Shot 2] At 00:03.500, the camera cuts to...')
    expect(base).toContain('For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.')
    expect(base).toContain('FL2VA duration example: Picture 1 aligns with the 0.00-second mark and Picture 2 aligns with the 8.00-second mark.')
    expect(base).toContain('L2VA duration example: <Picture 1> aligns with the 6.00-second mark of the target video.')
    expect(base).toContain('negative_prompt: no deformed hands; no watermark: preserve punctuation / spacing')
    expect(base).toContain('Preserve negative_prompt punctuation and spacing exactly; do not rewrite or omit it.')

    expectOrderedTokens(fullReference, [
      'subject_definitions:',
      'summary:',
      'retention_analysis:',
      'detailed_description:',
      'overall_soundscape:',
      'non_diegetic_music:',
    ])
    expect(fullReference).toContain('Stable reference labels include <Subject 1>, <Picture 1>, <Video 1>, and <Audio 1>.')
    expect(fullReference).toContain('[Shot 2] At 00:03.000, ...')
    expect(fullReference).toContain('`fully_preserved`, `reference`, and `weak_reference`')
  })
})

describe('safe skill file loading', () => {
  test('loads explicit references in sorted order and enforces per-file and aggregate limits', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mf-skill-'))
    await mkdir(join(root, 'references'), { recursive: true })
    await writeFile(join(root, 'references', 'z.txt'), 'z-reference')
    await writeFile(join(root, 'references', 'a.txt'), 'a-reference')
    const loaded = await loadSkillReferences(root, ['references/z.txt', 'references/a.txt'])
    expect(loaded).toEqual([
      { relativePath: 'references/a.txt', content: 'a-reference', bytes: 11 },
      { relativePath: 'references/z.txt', content: 'z-reference', bytes: 11 },
    ])

    await writeFile(join(root, 'references', 'large.txt'), Buffer.alloc(512 * 1024 + 1))
    await expect(loadSkillReferences(root, ['references/large.txt'])).rejects.toThrow(
      expect.objectContaining({ code: 'SKILL_FILE_TOO_LARGE' }),
    )
    await writeFile(join(root, 'references', 'exact.txt'), Buffer.alloc(512 * 1024))
    await expect(loadSkillReferences(root, ['references/exact.txt'])).resolves.toHaveLength(1)
    await expect(loadSkillReferences(root, ['references/missing.txt'])).rejects.toThrow(
      expect.objectContaining({ code: 'SKILL_REFERENCE_MISSING' }),
    )

    const aggregatePaths: string[] = []
    for (let index = 0; index < 5; index += 1) {
      const relativePath = `references/aggregate-${index}.txt`
      aggregatePaths.push(relativePath)
      await writeFile(join(root, relativePath), Buffer.alloc(500 * 1024))
    }
    await expect(loadSkillReferences(root, aggregatePaths)).rejects.toThrow(
      expect.objectContaining({ code: 'SKILL_FILE_TOO_LARGE' }),
    )

    const exactAggregatePaths: string[] = []
    for (let index = 0; index < 4; index += 1) {
      const relativePath = `references/exact-aggregate-${index}.txt`
      exactAggregatePaths.push(relativePath)
      await writeFile(join(root, relativePath), Buffer.alloc(512 * 1024))
    }
    await expect(loadSkillReferences(root, exactAggregatePaths)).resolves.toHaveLength(4)
  })

  test('rejects traversal and symlink escape without executing files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mf-skill-'))
    const outside = await mkdtemp(join(tmpdir(), 'mf-outside-'))
    await writeFile(join(outside, 'secret.txt'), 'secret')
    await symlink(join(outside, 'secret.txt'), join(root, 'link.txt'))
    await expect(assertSafeRelativeSkillPath(root, '../secret.txt')).rejects.toThrow(
      expect.objectContaining({ code: 'SKILL_PATH_ESCAPE' }),
    )
    await expect(assertSafeRelativeSkillPath(root, 'link.txt')).rejects.toThrow(
      expect.objectContaining({ code: 'SKILL_PATH_ESCAPE' }),
    )

    const sentinel = join(root, 'executed.txt')
    await mkdir(join(root, 'scripts'))
    await writeFile(join(root, 'scripts', 'evil.js'), `await Bun.write(${JSON.stringify(sentinel)}, 'bad')`)
    const manifest = parseSkillDocument(
      '---\nname: inert-script\ndescription: test\n---\nDo not run `scripts/evil.js`.',
      join(root, 'SKILL.md'),
    ).manifest
    expect(manifest.references).toEqual([])
    await expect(access(sentinel)).rejects.toThrow()
  })

  test('validates archive paths, symlinks, and size limits', () => {
    expect(() => validateSkillPackArchiveEntry('../escape', 'file', 1)).toThrow(
      expect.objectContaining({ code: 'SKILL_ARCHIVE_PATH_ESCAPE' }),
    )
    expect(() => validateSkillPackArchiveEntry('/absolute', 'file', 1)).toThrow(
      expect.objectContaining({ code: 'SKILL_ARCHIVE_PATH_ESCAPE' }),
    )
    expect(() => validateSkillPackArchiveEntry('link', 'symlink', 0)).toThrow(
      expect.objectContaining({ code: 'SKILL_ARCHIVE_SYMLINK' }),
    )
    expect(() => validateSkillPackArchiveEntry('references/x.txt', 'file', 512 * 1024 + 1)).toThrow(
      expect.objectContaining({ code: 'SKILL_FILE_TOO_LARGE' }),
    )
    expect(() => validateSkillPackArchiveEntry('SKILL.md', 'file', 256 * 1024 + 1)).toThrow(
      expect.objectContaining({ code: 'SKILL_FILE_TOO_LARGE' }),
    )
  })
})
