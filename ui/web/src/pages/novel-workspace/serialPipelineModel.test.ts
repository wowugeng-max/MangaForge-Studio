import { describe, expect, test } from 'bun:test'
import { buildSerialPipelineViewModel } from './serialPipelineModel'

describe('serial pipeline view model', () => {
  const basePipeline = {
    project_id: 1,
    current_stage: 'delivery_acceptance',
    primary_action: { key: 'refresh_current_quality', label: '复检当前正文', workspace_area: 'qualityRevision' },
    summary: '正文写完后先跑质量复检和编辑报告。',
    stages: [
      {
        key: 'creation_contract',
        label: '创建契约',
        status: 'done',
        summary: '读者承诺已就绪。',
        action: { key: 'open_writing_bible', label: '完善创作契约', workspace_area: 'storyAssets' },
        checks: [{ key: 'reader_promise', label: '读者承诺', status: 'pass', detail: '已有可用创作契约。' }],
      },
      {
        key: 'delivery_acceptance',
        label: '交稿验收',
        status: 'active',
        summary: '正文写完后先跑质量复检和编辑报告。',
        action: { key: 'refresh_current_quality', label: '复检当前正文', workspace_area: 'qualityRevision' },
        checks: [{ key: 'quality', label: '质量复检', status: 'blocked', detail: '当前正文缺少通过的质量复检。' }],
        agent_steps: [
          {
            key: 'prose_quality_review',
            label: '质量复检',
            agent: 'prose-quality',
            description: '检查可读性、节奏、爽点兑现和基础质量分。',
            action_key: 'refresh_current_quality',
            workspace_area: 'qualityRevision',
          },
          {
            key: 'editor_report',
            label: '编辑报告',
            agent: 'editor-report',
            description: '把质量问题拆成有证据的可执行修订意见。',
            action_key: 'refresh_current_quality',
            workspace_area: 'qualityRevision',
          },
        ],
      },
    ],
    updated_at: '2026-06-21T00:00:00.000Z',
  }

  test('maps backend stages to compact display cards', () => {
    const model = buildSerialPipelineViewModel(basePipeline)

    expect(model.visible).toBe(true)
    expect(model.currentStageLabel).toBe('交稿验收')
    expect(model.primaryAction.key).toBe('refresh_current_quality')
    expect(model.stageCards[0]).toMatchObject({
      key: 'creation_contract',
      tone: 'done',
      statusLabel: '已完成',
    })
    expect(model.stageCards[1]).toMatchObject({
      key: 'delivery_acceptance',
      tone: 'active',
      statusLabel: '当前步骤',
      blockerCount: 1,
    })
    expect(model.currentIssues).toEqual([
      { label: '质量复检', status: 'blocked', detail: '当前正文缺少通过的质量复检。' },
    ])
    expect(model.currentAgentSteps.map(step => step.label)).toEqual(['质量复检', '编辑报告'])
    expect(model.stageCards[1].agentSteps[0]).toMatchObject({
      key: 'prose_quality_review',
      agent: 'prose-quality',
      actionKey: 'refresh_current_quality',
    })
  })

  test('builds a current blocker repair guide from the active stage', () => {
    const model = buildSerialPipelineViewModel(basePipeline)

    expect(model.repairGuide).toMatchObject({
      title: '当前阻塞修复向导',
      severity: 'blocked',
      blockerLabel: '交稿验收：质量复检',
      reason: '当前正文缺少通过的质量复检。',
      repairAreaLabel: '质检修订',
      repairActionLabel: '复检当前正文',
      verificationLabel: '复检、修订和状态同步完成后，回到流水线确认交稿验收通过。',
    })
  })

  test('returns an invisible fallback for missing pipeline data', () => {
    const model = buildSerialPipelineViewModel(null)

    expect(model.visible).toBe(false)
    expect(model.stageCards).toEqual([])
    expect(model.currentIssues).toEqual([])
    expect(model.currentAgentSteps).toEqual([])
    expect(model.primaryAction.key).toBe('')
    expect(model.repairGuide).toBeNull()
  })
})
