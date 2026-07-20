import React, { useMemo } from 'react'
import { Button, Card, Col, Empty, Row, Space, Tag, Typography } from 'antd'
import { CheckCircleOutlined, EditOutlined, PlayCircleOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { buildNovelLobbyModel, type NovelLobbyProjectCard } from './novelLobbyModel'

const { Title, Text, Paragraph } = Typography

interface NovelLobbyDashboardProps {
  projects: any[]
  onOpenProject: (projectId: number) => void
  onCreateProject: () => void
}

function getActionIcon(actionKind: NovelLobbyProjectCard['actionKind']) {
  if (actionKind === 'write') return <PlayCircleOutlined />
  if (actionKind === 'planning') return <EditOutlined />
  if (actionKind === 'hook') return <ThunderboltOutlined />
  return <CheckCircleOutlined />
}

function getRiskColor(tag: string) {
  return tag === '规划可继续' ? 'green' : 'gold'
}

function getProjectId(project: any) {
  const projectId = Number(project?.id)
  return Number.isFinite(projectId) ? projectId : null
}

export default function NovelLobbyDashboard({ projects, onOpenProject, onCreateProject }: NovelLobbyDashboardProps) {
  const model = useMemo(() => buildNovelLobbyModel(projects), [projects])
  const featured = model.featuredProject

  const openProject = (project: any) => {
    const projectId = getProjectId(project)
    if (projectId == null) return
    onOpenProject(projectId)
  }

  if (!featured) {
    return (
      <Card style={{ borderRadius: 12, marginBottom: 16 }}>
        <Empty description="还没有小说项目">
          <Button type="primary" onClick={onCreateProject}>新建小说</Button>
        </Empty>
      </Card>
    )
  }

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      <Col xs={24} lg={10}>
        <Card
          style={{ borderRadius: 12, height: '100%' }}
          bodyStyle={{ minHeight: 272, display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Text type="secondary" strong>继续</Text>
            <Title level={4} style={{ margin: 0, wordBreak: 'break-word' }}>
              {featured.project?.title || '未命名作品'}
            </Title>
            <Paragraph style={{ margin: 0, color: '#475569' }} ellipsis={{ rows: 2 }}>
              {featured.nextAction}
            </Paragraph>
          </Space>

          <Space wrap size={[6, 6]}>
            <Tag color="blue" bordered={false}>{featured.statusLabel}</Tag>
            <Tag bordered={false}>已写 {featured.writtenChapterCount}/{featured.chapterCount}章</Tag>
            <Tag color="cyan" bordered={false}>{featured.writtenWordsLabel}</Tag>
            <Tag color="purple" bordered={false}>{featured.project?.length_target || '未设篇幅'}</Tag>
          </Space>

          <Space direction="vertical" style={{ width: '100%', marginTop: 'auto' }} size={8}>
            <Button
              type="primary"
              block
              icon={<PlayCircleOutlined />}
              onClick={() => openProject(featured.project)}
              style={{ minHeight: 40, whiteSpace: 'normal' }}
            >
              {featured.nextAction}
            </Button>
            <Button block onClick={onCreateProject} style={{ minHeight: 40 }}>
              新建小说
            </Button>
          </Space>
        </Card>
      </Col>

      <Col xs={24} lg={14}>
        <Card
          title="最近项目动作"
          style={{ borderRadius: 12, height: '100%' }}
          bodyStyle={{ minHeight: 272 }}
        >
          <Row gutter={[12, 12]}>
            {model.governanceCards.slice(0, 3).map((card, index) => (
              <Col xs={24} md={8} key={`${card.project?.id || 'project'}-${index}`}>
                <Card
                  size="small"
                  style={{ borderRadius: 10, height: '100%' }}
                  bodyStyle={{ minHeight: 188, display: 'flex', flexDirection: 'column', gap: 10 }}
                >
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Text strong style={{ display: 'block', wordBreak: 'break-word' }}>{card.title}</Text>
                    <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.6 }}>
                      {card.description}
                    </Text>
                  </Space>
                  <Space wrap size={[4, 4]}>
                    {card.riskTags.map(tag => (
                      <Tag key={tag} color={getRiskColor(tag)} bordered={false}>{tag}</Tag>
                    ))}
                  </Space>
                  <Button
                    block
                    icon={getActionIcon(card.actionKind)}
                    onClick={() => openProject(card.project)}
                    style={{ marginTop: 'auto', minHeight: 36, whiteSpace: 'normal' }}
                  >
                    {card.actionLabel}
                  </Button>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      </Col>
    </Row>
  )
}
