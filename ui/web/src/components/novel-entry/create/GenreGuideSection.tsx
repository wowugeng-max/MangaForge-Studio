import { Card, Space, Typography } from 'antd'
import { STEP0_SECTION_TITLES } from './createWizardCopy'

const { Text } = Typography

export function GenreGuideSection(props: {
  groups: Array<{ category: string; items: Array<{ framework: string }> }>
  selectedFramework?: string
  loading?: boolean
  onSelect: (framework: string) => void
}) {
  return (
    <Card
      size="small"
      title={STEP0_SECTION_TITLES.genre}
      extra={props.loading ? <Text type="secondary">加载中…</Text> : undefined}
      style={{ borderRadius: 12 }}
    >
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        {props.groups.map(group => (
          <div key={group.category}>
            <Text strong style={{ fontSize: 12, color: '#64748b' }}>{group.category}</Text>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              {group.items.map(item => {
                const active = props.selectedFramework === item.framework
                return (
                  <button
                    key={item.framework}
                    type="button"
                    onClick={() => props.onSelect(item.framework)}
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
    </Card>
  )
}
