import { describe, expect, test } from 'bun:test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readSkillSettings, writeSkillSettings } from './settings'

describe('skill settings', () => {
  test('falls back for missing or malformed files and roundtrips numeric id', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mf-settings-'))
    expect(await readSkillSettings(workspace)).toEqual({ skill_compiler_model_id: null })
    await writeFile(join(workspace, 'bad.json'), '{')
    await writeSkillSettings(workspace, 42)
    expect(await readSkillSettings(workspace)).toEqual({ skill_compiler_model_id: 42 })
    await writeFile(join(workspace, '.mangaforge/skill-settings.json'), '{"skill_compiler_model_id":"bad"}')
    expect(await readSkillSettings(workspace)).toEqual({ skill_compiler_model_id: null })
  })
})
