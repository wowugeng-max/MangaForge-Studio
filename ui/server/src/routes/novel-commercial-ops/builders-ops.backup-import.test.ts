import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelProject, getNovelProject, listNovelProjects } from '../../novel'
import { resolveProseGenerationSource } from '../../novel-writing-service/generation-source/source-config'
import { importBackupAsNewProject } from './builders-ops'

const workspaces: string[] = []

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map(workspace => rm(workspace, { recursive: true, force: true })))
})

describe('novel backup imports', () => {
  test('imports an MCP-bound backup as model without duplicating its binding', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-backup-import-'))
    workspaces.push(workspace)
    const source = {
      version: 'prose_generation_source_v1' as const,
      type: 'mcp' as const,
      mcp: {
        server_id: 'backup-server',
        key_id: 17,
        adapter_id: 'backup-adapter',
        agent_id: 'backup-agent',
      },
    }
    const original = await createNovelProject(workspace, {
      title: '绑定源项目',
      reference_config: {
        prose_generation_source: source,
        references: [{ project_title: '普通参考项目', weight: 0.8, use_for: ['节奏'] }],
        strength: 'strong',
        notes: '保留普通参考配置',
        writing_preferences: { pacing: 'fast', forbidden_tropes: ['失忆'] },
      },
    })
    const originalBefore = structuredClone(await getNovelProject(workspace, original.id))
    const exportedAt = '2026-07-30T08:00:00.000Z'
    const originalFetch = globalThis.fetch
    let networkCalls = 0
    globalThis.fetch = (async () => {
      networkCalls += 1
      throw new Error('backup import must not call the network')
    }) as typeof fetch

    try {
      const result = await importBackupAsNewProject(workspace, {
        package_type: 'novel_project_backup',
        exported_at: exportedAt,
        project: {
          ...structuredClone(original),
          // An abnormal outer copy must not override the sanitized reference_config payload.
          prose_generation_source: structuredClone(source),
        },
        outlines: [],
        worldbuilding: [],
        characters: [],
        chapters: [],
      })
      const stored = await getNovelProject(workspace, result.project.id)

      expect(Object.prototype.hasOwnProperty.call(result.project.reference_config, 'prose_generation_source')).toBe(false)
      expect(Object.prototype.hasOwnProperty.call(stored?.reference_config, 'prose_generation_source')).toBe(false)
      expect(resolveProseGenerationSource(result.project)).toEqual({
        version: 'prose_generation_source_v1',
        type: 'model',
      })
      expect(resolveProseGenerationSource(stored)).toEqual({
        version: 'prose_generation_source_v1',
        type: 'model',
      })
      expect(stored?.reference_config).toMatchObject({
        references: [{ project_title: '普通参考项目', weight: 0.8, use_for: ['节奏'] }],
        strength: 'strong',
        notes: '保留普通参考配置',
        writing_preferences: { pacing: 'fast', forbidden_tropes: ['失忆'] },
        imported_from_backup: {
          source_project_id: original.id,
          source_title: original.title,
          exported_at: exportedAt,
          imported_at: expect.any(String),
        },
      })
      expect(await getNovelProject(workspace, original.id)).toEqual(originalBefore)
      expect((await listNovelProjects(workspace)).filter(project => (
        project.reference_config?.prose_generation_source?.type === 'mcp'
      )).map(project => project.id)).toEqual([original.id])
      expect(networkCalls).toBe(0)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
