import React, { useEffect, useState } from 'react'
import { Button, Card, Col, Input, message, Row, Space, Tag, Typography } from 'antd'
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import apiClient from '../api/client'
import NovelCreateWizard from '../components/NovelCreateWizard'

const { Title, Text } = Typography

export default function NovelStudio() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [searchText, setSearchText] = useState('')

  const loadProjects = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get('/novel/projects')
      setProjects(Array.isArray(res.data) ? res.data : [])
    } catch {
      message.error('无法加载小说项目')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProjects() }, [])

  const handleWizardSuccess = (projectId: number) => {
    setWizardOpen(false)
    loadProjects()
    // Auto-navigate to the new project's workspace
    navigate(`/novel/workspace/${projectId}`)
  }

  const handleWizardCancel = () => {
    setWizardOpen(false)
  }

  const filteredProjects = projects.filter(project => {
    const q = searchText.trim().toLowerCase()
    if (!q) return true
    return [project.title, project.genre, project.status, project.target_audience].filter(Boolean).some((v: any) => String(v).toLowerCase().includes(q))
  })

  const stats = {
    total: projects.length,
    draft: projects.filter(p => p.status === 'draft').length,
    active: projects.filter(p => p.status && p.status !== 'draft').length,
  }

  return (
    <div style={{ minHeight: '100vh', padding: 24, background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)' }}>
      <Card bordered={false} style={{ borderRadius: 24, boxShadow: '0 20px 60px rgba(15,23,42,0.08)', overflow: 'hidden' }} bodyStyle={{ padding: 0 }}>
        <div style={{ padding: 28, borderBottom: '1px solid rgba(148,163,184,0.16)', background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))' }}>
          <Row justify="space-between" align="middle" gutter={24}>
            <Col flex="auto">
              <Space direction="vertical" size={4}>
                <Space align="center" size={10}>
                  <div style={{ width: 40, height: 40, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, #60a5fa, #7c3aed)', color: '#fff', boxShadow: '0 12px 24px rgba(99,102,241,0.24)' }}>📚</div>
                  <div>
                    <Title level={3} style={{ margin: 0 }}>小说项目大厅</Title>
                    <Text type="secondary">先选项目，再进入单项目工作台继续写作。</Text>
                  </div>
                </Space>
                <Space wrap>
                  <Tag color="blue" bordered={false}>项目总数 {stats.total}</Tag>
                  <Tag color="gold" bordered={false}>草稿 {stats.draft}</Tag>
                  <Tag color="green" bordered={false}>进行中 {stats.active}</Tag>
                </Space>
              </Space>
            </Col>
            <Col>
              <Space>
                <Button icon={<ReloadOutlined />} onClick={loadProjects} loading={loading} style={{ borderRadius: 12 }}>刷新</Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setWizardOpen(true)} style={{ borderRadius: 12, boxShadow: '0 10px 24px rgba(24, 144, 255, 0.25)' }}>新建小说项目</Button>
              </Space>
            </Col>
          </Row>
        </div>

        <div style={{ padding: 24 }}>
          <Card size="small" title="项目检索" style={{ borderRadius: 18, marginBottom: 16 }}>
            <Input prefix={<SearchOutlined />} value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="搜索项目标题、题材、状态、目标读者" allowClear />
          </Card>

          {filteredProjects.length === 0 ? (
            <Card style={{ borderRadius: 18, textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
              <Title level={5}>暂无小说项目</Title>
              <Text type="secondary">点击上方「新建小说项目」开始创作你的第一部小说。</Text>
            </Card>
          ) : (
            <Row gutter={16}>
              {filteredProjects.map(project => (
                <Col xs={24} md={12} xl={8} key={project.id} style={{ marginBottom: 16 }}>
                  <Card
                    hoverable
                    style={{ borderRadius: 18, height: '100%' }}
                    bodyStyle={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                    onClick={() => navigate(`/novel/workspace/${project.id}`)}
                  >
                    <Space direction="vertical" style={{ width: '100%' }} size={6}>
                      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                        <Title level={5} style={{ margin: 0 }}>{project.title}</Title>
                        <Tag color={project.status === 'draft' ? 'gold' : 'green'} bordered={false}>{project.status || 'draft'}</Tag>
                      </Space>
                      <Text type="secondary">{project.genre || '未设置题材'}</Text>
                    </Space>
                    <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
                      <div>篇幅目标：{project.length_target || '-'}</div>
                      <div>目标读者：{project.target_audience || '-'}</div>
                      <div>风格标签：{Array.isArray(project.style_tags) ? project.style_tags.join(' / ') : '-'}</div>
                    </div>
                    {project.synopsis && (
                      <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                        "{project.synopsis}"
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>点击进入工作台</Text>
                      <Button type="primary" size="small" style={{ borderRadius: 10 }} onClick={(e) => { e.stopPropagation(); navigate(`/novel/workspace/${project.id}`) }}>进入</Button>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </div>
      </Card>

      <NovelCreateWizard
        open={wizardOpen}
        onCancel={handleWizardCancel}
        onSuccess={handleWizardSuccess}
      />
    </div>
  )
}
