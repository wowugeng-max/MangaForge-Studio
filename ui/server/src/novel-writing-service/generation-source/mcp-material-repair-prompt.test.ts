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

test('the real MCP compiler forbids unrequested chapter fields even when they echo current values', () => {
  const project = {
    id: 3,
    title: '灰塔校时局',
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
    preflight: {
      checks: [{ key: 'ending_hook', ok: false, severity: 'high', fix: '补齐章末钩子' }],
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

  expect(compiled).toContain('chapter_patch 字段白名单：{"direct_fields":["ending_hook"],"raw_payload_fields":[],"pre_draft_brief_fields":[]}')
  expect(compiled).toContain('未列出的字段（包括与当前值相同的 title）也禁止返回。')
  expect(compiled).toContain('输出合同只描述字段类型，不扩大本次字段白名单。')
})

test('the real MCP compiler requires chapter setting usage references to close over settings', () => {
  const project = { id: 3, title: '灰塔校时局', reference_config: {} }
  const chapter = { id: 9, project_id: 3, chapter_no: 1, title: '停摆前一分钟', raw_payload: {} }
  const contextPackage = {
    preflight: {
      checks: [
        { key: 'setting_workshop', ok: false, severity: 'high', fix: '补齐设定工坊' },
        { key: 'chapter_setting_usage', ok: false, severity: 'high', fix: '补齐本章设定调用' },
      ],
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

  expect(compiled).toContain('章节设定调用必须闭合：每个 forbidden 不为 true 的 chapter_setting_usage 条目必须使用已有 settings 的 entity_id，或让 usage.entity_name + usage.entity_type 与本次返回的 settings.name + settings.entity_type 完全相同。事件、剧情钩子、悬念文本、未知项或地点描述只有在本次 settings 中作为真实设定实体返回时才能被引用；否则必须省略该非禁揭调用条目。forbidden 为 true 的命名禁揭项按本地严格契约处理，不要求伪造普通 settings 实体。')
})
