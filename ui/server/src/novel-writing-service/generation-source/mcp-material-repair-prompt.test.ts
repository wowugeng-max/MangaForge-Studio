import { expect, test } from 'bun:test'
import {
  buildMaterialRepairTask,
  resolveMaterialRepairPlan,
} from '../service/material-repair-contract'
import {
  compileMcpAgentPrompt,
} from './mcp-generation-source'

test('the real MCP compiler preserves the authoritative material JSON contract without outline schema', () => {
  const project = {
    id: 3,
    title: '灰塔校时局',
    genre: '悬疑',
    synopsis: '调查每天丢失的一分钟。',
    reference_config: {},
  }
  const chapter = {
    id: 9,
    project_id: 3,
    chapter_no: 1,
    title: '停摆前一分钟',
    raw_payload: {},
  }
  const contextPackage = {
    writing_bible: { premise: '每天丢失一分钟' },
    story_state: {},
    continuity: {},
    preflight: {
      checks: [{ key: 'worldbuilding', ok: false, severity: 'high', fix: '补齐世界规则' }],
    },
  }
  const task = buildMaterialRepairTask({
    plan: resolveMaterialRepairPlan(contextPackage),
    project,
    chapter,
    contextPackage,
    chapters: [chapter],
    worldbuilding: [],
    characters: [],
    outlines: [],
    reviews: [],
    settings: [],
    chapterSettingUsage: [],
    projectSettingUsage: [],
    identity: {
      project_identity_hash: `sha256:${'1'.repeat(64)}`,
      chapter_identity_hash: `sha256:${'2'.repeat(64)}`,
      source_identity_hash: `sha256:${'3'.repeat(64)}`,
      context_identity_hash: `sha256:${'4'.repeat(64)}`,
    },
  })

  const compiled = compileMcpAgentPrompt('outline-agent', project, {
    task,
    authoritativeTask: true,
  })

  expect(compiled).toContain('任务：一次性补齐本章写作前置材料。只输出 JSON，不生成正文。')
  expect(compiled).toContain('仅允许输出 chapter_patch, worldbuilding, characters')
  expect(compiled).toContain('source_readiness 必须是 JSON 对象数组；数组元素不得是字符串化 JSON。')
  expect(compiled).toContain('【输出合同】')
  for (const outlineField of [
    'master_outline',
    'volume_outlines',
    'chapter_outlines',
    'foreshadowing_plan',
  ]) {
    expect(compiled).not.toContain(outlineField)
  }
})
