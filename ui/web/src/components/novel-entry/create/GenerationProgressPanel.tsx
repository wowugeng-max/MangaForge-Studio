import React from 'react'
import { Progress, Space, Typography } from 'antd'
import type { ProjectSeedStreamState } from './projectSeedStreamTypes'
import { STEP0_SECTION_TITLES } from './createWizardCopy'

const { Text } = Typography

export function GenerationProgressPanel({ state }: { state: ProjectSeedStreamState }) {
  return (
    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 12 }}>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Text strong>{STEP0_SECTION_TITLES.progress}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>正在生成详细草稿</Text>
        <Progress percent={Math.round((state.progress || 0) * 100)} showInfo size="small" />
        <div style={{ display: 'grid', gap: 6 }}>
          {state.steps.map(step => {
            const mark = step.status === 'completed' ? '✅' : step.status === 'running' ? '⏳' : step.status === 'error' ? '❌' : '○'
            const color = step.status === 'running'
              ? '#1677ff'
              : step.status === 'error'
                ? '#ef4444'
                : step.status === 'pending'
                  ? '#94a3b8'
                  : undefined
            return (
              <div key={step.key} style={{ color, fontWeight: step.status === 'running' ? 700 : 400, fontSize: 12 }}>
                {mark} {step.label}
                {step.detail ? <div style={{ color: '#64748b', fontWeight: 400, marginLeft: 18 }}>{step.detail}</div> : null}
              </div>
            )
          })}
        </div>
        {state.error ? <Text type="danger">{state.error}</Text> : null}
      </Space>
    </div>
  )
}
