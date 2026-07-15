import React from 'react'
import { Card, Space, Typography } from 'antd'
import { STEP0_SECTION_TITLES } from './createWizardCopy'
import { PRIMARY_GENRE_OPTIONS } from '../genreCatalogGuide'

const { Text } = Typography

export function GenreGuideSection(props: {
  primaryGenre?: string
  onPrimaryChange: (genre: string) => void
  groups: Array<{ category: string; items: Array<{ framework: string }> }>
  selectedFramework?: string
  loading?: boolean
  onSelectFramework: (framework: string) => void
}) {
  return (
    <Card
      size="small"
      title={STEP0_SECTION_TITLES.genre}
      extra={props.loading ? <Text type="secondary">加载中…</Text> : undefined}
      style={{ borderRadius: 12 }}
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <div>
          <Text strong style={{ fontSize: 12, color: '#64748b' }}>主题材</Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            {PRIMARY_GENRE_OPTIONS.map(item => {
              const active = props.primaryGenre === item.value
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => props.onPrimaryChange(item.value)}
                  style={{
                    border: active ? '1px solid #1677ff' : '1px solid #e5e7eb',
                    background: active ? '#eff6ff' : '#fff',
                    borderRadius: 999,
                    padding: '4px 10px',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: active ? 700 : 400,
                  }}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <Text strong style={{ fontSize: 12, color: '#64748b' }}>
            玩法框架{props.primaryGenre ? `（按「${props.primaryGenre}」筛选）` : '（先选主题材更准）'}
          </Text>
          {props.groups.length === 0 ? (
            <Text type="secondary" style={{ display: 'block', marginTop: 6, fontSize: 12 }}>
              当前主题材暂无对应热门玩法，仍可只按主题材生成。
            </Text>
          ) : (
            <Space direction="vertical" size={10} style={{ width: '100%', marginTop: 6 }}>
              {props.groups.map(group => (
                <div key={group.category}>
                  <Text style={{ fontSize: 12, color: '#94a3b8' }}>{group.category}</Text>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                    {group.items.map(item => {
                      const active = props.selectedFramework === item.framework
                      return (
                        <button
                          key={item.framework}
                          type="button"
                          onClick={() => props.onSelectFramework(item.framework)}
                          style={{
                            border: active ? '1px solid #1677ff' : '1px solid #e5e7eb',
                            background: active ? '#eff6ff' : '#fff',
                            borderRadius: 999,
                            padding: '4px 10px',
                            cursor: 'pointer',
                            fontSize: 12,
                          }}
                        >
                          {item.framework}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </Space>
          )}
        </div>
      </Space>
    </Card>
  )
}
