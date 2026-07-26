import React from 'react'
import { BookOutlined, ExperimentOutlined, SettingOutlined } from '@ant-design/icons'
import { Button, Card, Col, Row, Space, Typography } from 'antd'

const { Title, Text } = Typography

export function WorkspaceCenterEmptyProject({
  selectedProject,
  incubatingOriginal,
  planning,
  onRunOriginalIncubator,
  onOpenReferenceConfig,
  onRunPlan,
  onOpenWritingBibleEditor,
  onCreateOutline,
  onCreateChapter,
}: {
  selectedProject?: any
  incubatingOriginal?: boolean
  planning?: boolean
  onRunOriginalIncubator: () => void
  onOpenReferenceConfig: () => void
  onRunPlan: () => void
  onOpenWritingBibleEditor: () => void
  onCreateOutline: () => void
  onCreateChapter: () => void
}) {
  return (
    <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 32 }}>
      <div style={{ maxWidth: 860, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ marginBottom: 8 }}>开始创作《{selectedProject?.title}》</Title>
          <Text type="secondary">
            先选择原创或参考路线，再建立写作圣经、章节规划和正文生产流水线。
          </Text>
        </div>
        <Text type="secondary" style={{ display: 'block', marginBottom: 32 }}>
          推荐按以下路径起步；后续左侧生产向导会持续提示下一步。
        </Text>
        <Row gutter={24} justify="center">
          {[
            {
              icon: <ExperimentOutlined />,
              title: '原创孵化',
              desc: '从题材定位、读者承诺、世界观、主角和前 30 章章纲开始。',
              btn: <Button type="primary" loading={incubatingOriginal} onClick={onRunOriginalIncubator}> 生成原创方案</Button>,
            },
            {
              icon: <BookOutlined />,
              title: '参考仿写',
              desc: '先配置参考作品，提炼节奏、结构和爽点模型，再进入安全迁移。',
              btn: <Button onClick={onOpenReferenceConfig}> 配置参考作品</Button>,
            },
            {
              icon: <SettingOutlined />,
              title: '手动起步',
              desc: '人工创建大纲、写作圣经或第一章，适合已有完整构思的项目。',
              btn: (
                <Space>
                  <Button loading={planning} onClick={onRunPlan}> AI 规划</Button>
                  <Button onClick={onOpenWritingBibleEditor}> 写作圣经</Button>
                  <Button onClick={onCreateOutline}> 创建大纲</Button>
                  <Button onClick={onCreateChapter}> 第一章</Button>
                </Space>
              ),
            },
          ].map(card => (
            <Col key={card.title} xs={24} md={8}>
              <Card hoverable style={{ borderRadius: 8, height: '100%' }}
                styles={{ body: { padding: 20, display: 'flex', flexDirection: 'column', height: '100%' } }}>
                <div style={{ fontSize: 28, color: '#1677ff', marginBottom: 12 }}>{card.icon}</div>
                <Title level={5} style={{ marginTop: 0 }}>{card.title}</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 18, minHeight: 66 }}>{card.desc}</Text>
                <div style={{ marginTop: 'auto' }}>
                {card.btn}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  )
}
