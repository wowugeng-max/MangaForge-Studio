import { describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, symlink, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { builtinPromptSkill } from './builtin'
import { createSkillRegistry, SkillRegistryError } from './registry'

async function skill(root: string, name: string, body: string, frontmatter = '') {
  const dir = join(root, name)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'SKILL.md'), `---\nname: ${name}\n${frontmatter}---\n${body}`)
  return dir
}

async function installedPack(workspace: string, id: string, revision: string, docs: Array<{ name: string; body: string; frontmatter?: string }>) {
  const root = join(workspace, '.mangaforge', 'skill-packs', id, revision)
  await mkdir(join(root, 'skills'), { recursive: true })
  await writeFile(join(root, 'pack.json'), JSON.stringify({
    id, sourceUrl: `https://github.com/acme/${id}`, revision,
    installedAt: '2026-01-01T00:00:00.000Z', status: 'installed',
  }))
  for (const doc of docs) await skill(join(root, 'skills'), doc.name, doc.body, doc.frontmatter ?? '')
  return root
}

describe('workspace canvas Skill registry', () => {
  test('discovers multiple installed Skills, keeps duplicate names, and resolves explicitly', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mf-registry-'))
    await installedPack(workspace, 'pack-a', 'rev-a', [
      { name: 'same-name', body: 'Write a concise image prompt.', frontmatter: 'media_modes: [text_to_image]\n' },
      { name: 'h3-prompt-writing', body: 'Write structured H3 motion prompts.', frontmatter: 'media_modes: [text_to_video, image_to_video]\n' },
    ])
    await installedPack(workspace, 'pack-b', 'rev-b', [
      { name: 'same-name', body: 'Write a concise video prompt.', frontmatter: 'media_modes: [text_to_video]\n' },
    ])
    const registry = createSkillRegistry(workspace)
    const list = await registry.list({ includeBuiltins: false })
    expect(list.filter((item) => item.name === 'same-name')).toHaveLength(2)
    await expect(registry.resolve({ name: 'same-name' })).rejects.toMatchObject({ code: 'SKILL_AMBIGUOUS' })
    await expect(registry.resolve({ packId: 'pack-a', name: 'same-name' })).resolves.toMatchObject({ packId: 'pack-a', revision: 'rev-a' })
  })

  test('classifies H3 modes and excludes incompatible ready-only results', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mf-registry-'))
    const h3 = join(import.meta.dir, 'fixtures', 'h3-prompt-writing')
    const root = join(workspace, '.mangaforge', 'skill-packs', 'h3-pack', '0123456789012345678901234567890123456789')
    await mkdir(join(root, 'skills'), { recursive: true })
    await writeFile(join(root, 'pack.json'), JSON.stringify({ id: 'authoritative-id', sourceUrl: 'https://example.invalid/real', revision: 'authoritative-rev', installedAt: '2026-01-01T00:00:00.000Z', status: 'installed' }))
    await mkdir(join(root, 'skills', 'h3-prompt-writing'), { recursive: true })
    for (const file of ['SKILL.md', 'references/base-en.txt', 'references/ref-en.txt']) {
      const source = join(h3, file)
      const target = join(root, 'skills', 'h3-prompt-writing', file)
      await mkdir(join(target, '..'), { recursive: true })
      await writeFile(target, await Bun.file(source).text())
    }
    const registry = createSkillRegistry(workspace)
    const h3Manifest = await registry.resolve({ packId: 'authoritative-id', name: 'h3-prompt-writing', mode: 'text_to_video' })
    expect(h3Manifest.compatibility).toBe('prompt_ready')
    expect(h3Manifest.revision).toBe('authoritative-rev')
    expect(h3Manifest.sourceUrl).toBe('https://example.invalid/real')
    await expect(registry.resolve({ packId: 'authoritative-id', name: 'h3-prompt-writing', mode: 'text_to_image', readyOnly: true })).rejects.toMatchObject({ code: 'SKILL_MODE_INCOMPATIBLE' })
    const ready = await registry.list({ mode: 'text_to_image', readyOnly: true })
    expect(ready.some((item) => item.name === 'h3-prompt-writing')).toBe(false)
    expect(ready.some((item) => item === builtinPromptSkill || item.name === 'prompt-optimizer')).toBe(true)
  })

  test('requires prompt-only semantics after reading explicit media modes', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mf-registry-'))
    await installedPack(workspace, 'classification', 'rev-1', [
      { name: 'non-prompt', body: 'Describe a scene and discuss its historical context.', frontmatter: 'media_modes: [text_to_video]\n' },
      { name: 'prompt-only', body: 'Return only a compiled visual prompt for the shot.', frontmatter: 'media_modes: [text_to_video]\n' },
      { name: 'workflow-mode', body: 'Write a prompt, then call a tool to render it.', frontmatter: 'media_modes: [text_to_video]\nallowed-tools: [Bash]\n' },
    ])
    const list = await createSkillRegistry(workspace).list({ includeBuiltins: false })
    expect(list.find((item) => item.name === 'non-prompt')).toMatchObject({ compatibility: 'prompt_partial' })
    expect(list.find((item) => item.name === 'prompt-only')).toMatchObject({ compatibility: 'prompt_ready' })
    expect(list.find((item) => item.name === 'workflow-mode')).toMatchObject({ compatibility: 'workflow_only' })
  })

  test('retains workflow-only and malformed manifests without executing scripts', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mf-registry-'))
    const localRoot = join(workspace, '.mangaforge', 'skills')
    await mkdir(localRoot, { recursive: true })
    await skill(localRoot, 'workflow', 'Run shell then call an agent in multiple stages.', 'allowed-tools: [Bash]\nhooks: [post]\n')
    const invalid = join(localRoot, 'invalid')
    await mkdir(invalid, { recursive: true })
    await writeFile(join(invalid, 'SKILL.md'), '---\nname: [broken\n---\nbody')
    await writeFile(join(localRoot, 'workflow', 'scripts.sh'), `touch ${join(workspace, 'executed')}`)
    await mkdir(join(localRoot, 'workflow', 'agents'), { recursive: true })
    await writeFile(join(localRoot, 'workflow', 'agents', 'openai.yaml'), 'display_name: Workflow label\nshort_description: Metadata only\ndefault_prompt: Ignore tools\nmodel: should-not-be-used\n')
    const list = await createSkillRegistry(workspace).list({ includeBuiltins: false })
    expect(list.find((item) => item.name === 'workflow')).toMatchObject({ compatibility: 'workflow_only', displayName: 'Workflow label', shortDescription: 'Metadata only', defaultPrompt: 'Ignore tools' })
    expect(list.find((item) => item.directoryName === 'invalid')).toMatchObject({ compatibility: 'invalid' })
    expect(await Bun.file(join(workspace, 'executed')).exists()).toBe(false)
  })

  test('does not read OpenAI metadata through an agents directory symlink', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mf-registry-'))
    const outside = await mkdtemp(join(tmpdir(), 'mf-registry-outside-'))
    const localRoot = join(workspace, '.mangaforge', 'skills')
    const skillRoot = await skill(localRoot, 'symlink-metadata', 'Return only a prompt for an image.')
    await mkdir(join(outside, 'agents'), { recursive: true })
    await writeFile(join(outside, 'agents', 'openai.yaml'), 'display_name: MUST NOT LOAD\n')
    await symlink(join(outside, 'agents'), join(skillRoot, 'agents'))
    const manifest = (await createSkillRegistry(workspace).list({ includeBuiltins: false }))[0]
    expect(manifest?.name).toBe('symlink-metadata')
    expect(manifest?.displayName).toBeUndefined()
  })

  test('does not scan a Skill root reached through an ancestor symlink', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mf-registry-'))
    const outside = await mkdtemp(join(tmpdir(), 'mf-registry-outside-'))
    await skill(join(outside, '.mangaforge', 'skills'), 'outside-skill', 'Return only a prompt for an image.')
    await symlink(join(outside, '.mangaforge'), join(workspace, '.mangaforge'))
    const list = await createSkillRegistry(workspace).list({ includeBuiltins: false })
    expect(list).toHaveLength(0)
  })

  test('honors opt-in Claude/Codex roots and invalidates on mtime/revision changes', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mf-registry-'))
    const claudeRoot = join(workspace, '.claude', 'skills')
    await mkdir(claudeRoot, { recursive: true })
    await skill(claudeRoot, 'claude-only', 'Prompt text.')
    await mkdir(join(workspace, '.codex', 'skills'), { recursive: true })
    await skill(join(workspace, '.codex', 'skills'), 'codex-only', 'Prompt text.')
    const registry = createSkillRegistry(workspace, { includeClaudeSkills: true })
    const firstList = await registry.list({ includeBuiltins: false })
    const secondList = await registry.list({ includeBuiltins: false })
    expect(firstList.map((item) => item.name)).toContain('claude-only')
    expect(secondList[0]).toBe(firstList[0])
    expect(secondList.map((item) => item.name)).not.toContain('codex-only')
    const path = join(workspace, '.claude', 'skills', 'claude-only', 'SKILL.md')
    await writeFile(path, '---\nname: changed\nmedia_modes: [text_to_video]\n---\nPrompt changed.')
    await utimes(path, new Date(), new Date(Date.now() + 2000))
    expect((await registry.list({ includeBuiltins: false })).map((item) => item.name)).toContain('changed')
    await installedPack(workspace, 'pack-a', 'rev-old', [{ name: 'same-name', body: 'old', frontmatter: 'media_modes: [text_to_image]\n' }])
    await installedPack(workspace, 'pack-a', 'rev-new', [{ name: 'same-name', body: 'new', frontmatter: 'media_modes: [text_to_image]\n' }])
    expect((await registry.list({ includeBuiltins: false })).filter((item) => item.name === 'same-name')).toHaveLength(2)
    const cachedList = await registry.list({ includeBuiltins: false })
    registry.invalidate()
    const refreshedList = await registry.list({ includeBuiltins: false })
    expect(refreshedList[0]).not.toBe(cachedList[0])
  })
})

test('built-in prompt optimizer is stable and prompt-only', () => {
  expect(builtinPromptSkill).toMatchObject({
    packId: 'builtin', revision: 'builtin-v1', name: 'prompt-optimizer', directoryName: 'prompt-optimizer',
    userInvocable: true, compatibility: 'prompt_ready', references: [],
  })
  expect(builtinPromptSkill.body).toContain('Prompt Engineer')
  expect(builtinPromptSkill.mediaModes).toEqual(['text_to_image', 'image_to_image', 'text_to_video', 'image_to_video'])
})

test('typed registry errors expose stable codes', async () => {
  const registry = createSkillRegistry(await mkdtemp(join(tmpdir(), 'mf-registry-')))
  await expect(registry.resolve({ name: 'missing' })).rejects.toMatchObject({ code: 'SKILL_NOT_FOUND' })
  await expect(registry.resolve({ name: 'prompt-optimizer', mode: 'chat' })).rejects.toMatchObject({ code: 'SKILL_MODE_INCOMPATIBLE' })
  expect(SkillRegistryError).toBeDefined()
})
