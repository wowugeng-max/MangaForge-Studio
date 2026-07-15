import React from 'react'
import { Space, Tag } from 'antd'

export function CreateStepHeader(props: {
  title: string
  tags: Array<{ label: string; ok: boolean }>
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{props.title}</div>
      {props.tags.length > 0 && (
        <Space wrap>
          {props.tags.map(tag => (
            <Tag key={tag.label} color={tag.ok ? 'green' : 'default'} bordered={false}>
              {tag.label}
            </Tag>
          ))}
        </Space>
      )}
    </div>
  )
}
