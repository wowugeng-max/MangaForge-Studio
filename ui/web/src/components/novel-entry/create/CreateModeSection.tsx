import React from 'react'
import { Card } from 'antd'
import { CREATE_MODE_LABELS, STEP0_SECTION_TITLES } from './createWizardCopy'

export type CreateWizardMode = keyof typeof CREATE_MODE_LABELS

const MODE_ORDER: CreateWizardMode[] = ['manual', 'deep_draft']

export function CreateModeSection(props: {
  value: CreateWizardMode
  onChange: (mode: CreateWizardMode) => void
}) {
  return (
    <Card size="small" title={STEP0_SECTION_TITLES.mode} style={{ borderRadius: 12, background: '#fbfdff' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        {MODE_ORDER.map(key => {
          const item = CREATE_MODE_LABELS[key]
          const active = props.value === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => props.onChange(key)}
              style={{
                textAlign: 'left',
                padding: 12,
                borderRadius: 10,
                border: active ? '1px solid #1677ff' : '1px solid #e5e7eb',
                background: active ? '#eff6ff' : '#fff',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{item.title}</div>
              <div style={{ color: '#666', fontSize: 12, lineHeight: 1.45 }}>{item.hint}</div>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
