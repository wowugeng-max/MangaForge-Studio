import React, { useEffect, useState } from 'react'
import { Button, Card, Descriptions, message, Space, Typography, Result, Tag, Select, Divider, Input, Table, Collapse } from 'antd'
import apiClient from '../api/client'
import { projectApi } from '../api/projects'
import { UI_COPY } from '../constants/uiCopy'

const { Title, Paragraph } = Typography
const STORAGE_KEY = 'mangaforge.pipeline.selection'

type PipelineSelection = { projectId?: number; episodeId?: string }
function loadSelection(): PipelineSelection { try { const raw = localStorage.getItem(STORAGE_KEY); if (!raw) return {}; return JSON.parse(raw) as PipelineSelection } catch { return {} } }
function saveSelection(selection: PipelineSelection) { localStorage.setItem(STORAGE_KEY, JSON.stringify(selection)) }

export default function PipelinePage() {
  const [preflightLoading, setPreflightLoading] = useState(false)
  const [runLoading, setRunLoading] = useState(false)
  const [preflightResult, setPreflightResult] = useState<any>(null)
  const [runResult, setRunResult] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>()
  const [episodeId, setEpisodeId] = useState('ep-002')

  useEffect(() => { const saved = loadSelection(); if (saved.projectId !== undefined) setSelectedProjectId(saved.projectId); if (saved.episodeId) setEpisodeId(saved.episodeId) }, [])
  useEffect(() => { saveSelection({ projectId: selectedProjectId, episodeId }) }, [selectedProjectId, episodeId])
  useEffect(() => { ;(async () => { try { const res = await projectApi.getAll(); const list = res.data.projects || res.data || []; setProjects(list); if (list.length > 0 && selectedProjectId === undefined) setSelectedProjectId(list[0].id) } catch { } })() }, [])

  const selectedProject = projects.find(p => p.id === selectedProjectId)
  const checkWorkspace = async () => { setPreflightLoading(true); try { const res = await apiClient.get('/workspace/preflight'); setPreflightResult(res.data); if (res.data.ok) message.success('工作区预检通过'); else message.warning('工作区预检未通过') } catch { message.error('预检失败') } finally { setPreflightLoading(false) } }
  const runAll = async () => { setRunLoading(true); try { const res = await apiClient.post('/pipeline/run-all', { projectId: selectedProjectId, episodeId, title: '雨夜失踪案·上', premise: '记者林岚在旧城区调查连续失踪案，线人何烬提供关键线索后突然失联。', framework: 'three-act', panels: 12, style: 'cinematic noir manga', consistency: 'high' }); setRunResult(res.data); if (res.data.ok) message.success('全流程已执行'); else message.warning('全流程执行完成，但有步骤失败') } catch { message.error('执行失败') } finally { setRunLoading(false) } }

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>{UI_COPY.pipelineTitle}</Title>
      <Paragraph type="secondary">{UI_COPY.pipelineSubtitle}</Paragraph>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <span>选择项目</span>
          <Select style={{ minWidth: 280 }} value={selectedProjectId} onChange={setSelectedProjectId} options={projects.map(p => ({ label: p.name, value: p.id }))} placeholder="请选择项目" />
          <span>Episode ID</span>
          <Input value={episodeId} onChange={(e) => setEpisodeId(e.target.value)} style={{ width: 180 }} />
          {selectedProject && <Tag color="blue">当前项目：{selectedProject.name}</Tag>}
        </Space>
      </Card>

      <Space style={{ marginBottom: 16 }}>
        <Button onClick={checkWorkspace} loading={preflightLoading}>预检工作区</Button>
        <Button type="primary" onClick={runAll} loading={runLoading} disabled={!selectedProjectId || !episodeId}>运行全流程</Button>
      </Space>

      {preflightResult && (
        <Card title="预检结果" style={{ marginBottom: 16 }}>
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="通过">{String(preflightResult.ok)}</Descriptions.Item>
            <Descriptions.Item label="workspace">{preflightResult.workspace}</Descriptions.Item>
            <Descriptions.Item label="缺失项">{(preflightResult.missing || []).join(', ') || '无'}</Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {runResult && (
        <Card title="运行结果">
          <Result status={runResult.ok ? 'success' : 'warning'} title={runResult.ok ? '执行完成' : '部分步骤失败'} subTitle={runResult.message} />

          {Array.isArray(runResult.autoRepair) && runResult.autoRepair.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Paragraph strong>自动修复步骤</Paragraph>
              <Space wrap>
                {runResult.autoRepair.map((step: string) => <Tag color="blue" key={step}>{step}</Tag>)}
              </Space>
            </div>
          )}

          <Descriptions bordered column={1} size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="projectId">{runResult.payload?.projectId ?? '无'}</Descriptions.Item>
            <Descriptions.Item label="episodeId">{runResult.payload?.episodeId ?? '无'}</Descriptions.Item>
            <Descriptions.Item label="workspace">{runResult.workspace}</Descriptions.Item>
            <Descriptions.Item label="预检缺失项">{(runResult.preflight?.missing || []).join(', ') || '无'}</Descriptions.Item>
          </Descriptions>

          <Divider />

          <Table size="small" pagination={false} dataSource={(runResult.steps || []).map((step: any, idx: number) => ({ ...step, key: idx }))} columns={[
            { title: '步骤', dataIndex: 'step', key: 'step' },
            { title: '状态', dataIndex: 'status', key: 'status', render: (v) => <Tag color={v === 'ok' ? 'green' : v === 'missing' ? 'orange' : 'red'}>{v}</Tag> },
            { title: '耗时(ms)', dataIndex: 'duration_ms', key: 'duration_ms', render: (v) => v ?? '-' },
            { title: '返回码', dataIndex: 'returncode', key: 'returncode', render: (v) => v ?? '-' },
          ]} />

          <Divider />

          <Collapse items={(runResult.steps || []).map((step: any, idx: number) => ({
            key: String(idx),
            label: `${step.step} · ${step.status}`,
            children: (
              <div>
                <Descriptions bordered column={1} size="small" style={{ marginBottom: 16 }}>
                  <Descriptions.Item label="command">{(step.command || []).join(' ')}</Descriptions.Item>
                  <Descriptions.Item label="duration_ms">{step.duration_ms ?? '-'}</Descriptions.Item>
                  <Descriptions.Item label="returncode">{step.returncode ?? '-'}</Descriptions.Item>
                </Descriptions>
                <Paragraph strong>stdout</Paragraph>
                <pre style={{ whiteSpace: 'pre-wrap', background: '#fafafa', padding: 16, borderRadius: 8, maxHeight: 220, overflow: 'auto' }}>{step.stdout || '无'}</pre>
                <Paragraph strong>stderr</Paragraph>
                <pre style={{ whiteSpace: 'pre-wrap', background: '#fff1f0', padding: 16, borderRadius: 8, maxHeight: 220, overflow: 'auto' }}>{step.stderr || '无'}</pre>
              </div>
            ),
          }))} />

          <Divider />

          <pre style={{ whiteSpace: 'pre-wrap', background: '#fafafa', padding: 16, borderRadius: 8, maxHeight: 480, overflow: 'auto' }}>{JSON.stringify(runResult, null, 2)}</pre>
        </Card>
      )}
    </div>
  )
}
