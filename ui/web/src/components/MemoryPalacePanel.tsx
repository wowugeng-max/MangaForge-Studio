import React, { useEffect, useMemo, useState } from 'react'
import { Button, Card, Col, Popconfirm, Row, Space, Tag, Tooltip, Typography, message } from 'antd'
import { ArrowRightOutlined, DatabaseOutlined, DeleteOutlined, ReloadOutlined, SyncOutlined } from '@ant-design/icons'
import apiClient from '../api/client'

const { Text } = Typography

interface MemoryPalacePanelProps {
  onOpenProject?: (projectId: number) => void
}

export default function MemoryPalacePanel({ onOpenProject }: MemoryPalacePanelProps) {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const stats = useMemo(() => ({
    projects: projects.length,
    memories: projects.reduce((sum, project) => sum + Number(project.memory_count || 0), 0),
    facts: projects.reduce((sum, project) => sum + Number(project.fact_count || 0), 0),
    issues: projects.reduce((sum, project) => sum + Number(project.continuity_issue_count || 0), 0),
  }), [projects])

  const loadProjects = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get('/novel/memory-palace/projects')
      setProjects(Array.isArray(res.data?.projects) ? res.data.projects : [])
    } catch {
      setProjects([])
      message.error('无法加载记忆宫殿')
    } finally {
      setLoading(false)
    }
  }

  const deleteProjectMemory = async (project: any) => {
    const projectId = Number(project.project_id || 0)
    if (!projectId) return
    setDeletingId(projectId)
    try {
      await apiClient.delete(`/novel/memory-palace/projects/${projectId}`, {
        data: { project_title: project.project_title || undefined },
      })
      await loadProjects()
      message.success('已删除该项目的记忆数据')
    } catch (error: any) {
      message.error(error?.response?.data?.error || '删除失败')
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card size="small" style={{ borderRadius: 8, background: 'linear-gradient(135deg, #f8fbff 0%, #ffffff 100%)' }}>
        <Row gutter={12}>
          <Col span={6}>
            <Text type="secondary" style={{ fontSize: 12 }}>项目</Text>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>{stats.projects}</div>
          </Col>
          <Col span={6}>
            <Text type="secondary" style={{ fontSize: 12 }}>记忆</Text>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1677ff' }}>{stats.memories}</div>
          </Col>
          <Col span={6}>
            <Text type="secondary" style={{ fontSize: 12 }}>事实</Text>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#16a34a' }}>{stats.facts}</div>
          </Col>
          <Col span={6}>
            <Text type="secondary" style={{ fontSize: 12 }}>问题</Text>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#f97316' }}>{stats.issues}</div>
          </Col>
        </Row>
      </Card>

      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
        <Text type="secondary">跨项目管理写作记忆、抽取事实和连续性问题。</Text>
        <Tooltip title="刷新列表">
          <Button icon={<ReloadOutlined />} loading={loading} onClick={loadProjects} />
        </Tooltip>
      </Space>

      {loading && projects.length === 0 ? (
        <Card style={{ borderRadius: 8, textAlign: 'center', borderStyle: 'dashed' }}>
          <SyncOutlined style={{ animation: 'spin 1s linear infinite', color: '#1677ff' }} />
          <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>加载中...</Text>
        </Card>
      ) : projects.length === 0 ? (
        <Card style={{ borderRadius: 8, textAlign: 'center', borderStyle: 'dashed' }}>
          <DatabaseOutlined style={{ fontSize: 28, color: '#94a3b8' }} />
          <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>暂无记忆数据</Text>
        </Card>
      ) : (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {projects.map(project => {
            const projectId = Number(project.project_id || 0)
            return (
              <Card
                key={projectId || project.project_title}
                size="small"
                title={project.project_title || `项目 ${projectId}`}
                style={{ borderRadius: 8 }}
                extra={
                  <Space size={4}>
                    {onOpenProject && projectId > 0 && (
                      <Tooltip title="进入项目工作台">
                        <Button size="small" type="text" icon={<ArrowRightOutlined />} onClick={() => onOpenProject(projectId)} />
                      </Tooltip>
                    )}
                    <Popconfirm
                      title="删除记忆"
                      description={`确定删除「${project.project_title || projectId}」在记忆宫殿中的所有数据吗？`}
                      onConfirm={() => deleteProjectMemory(project)}
                      okText="删除"
                      okButtonProps={{ danger: true }}
                    >
                      <Button size="small" danger type="text" icon={<DeleteOutlined />} loading={deletingId === projectId} />
                    </Popconfirm>
                  </Space>
                }
              >
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Space size={[6, 4]} wrap>
                    <Tag color="blue" bordered={false}>记忆 {project.memory_count || 0}</Tag>
                    <Tag color="green" bordered={false}>事实 {project.fact_count || 0}</Tag>
                    <Tag color="orange" bordered={false}>问题 {project.continuity_issue_count || 0}</Tag>
                  </Space>
                  {project.last_updated_at && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      更新于 {project.last_updated_at}
                    </Text>
                  )}
                </Space>
              </Card>
            )
          })}
        </Space>
      )}
    </Space>
  )
}
