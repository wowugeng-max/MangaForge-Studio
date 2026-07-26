import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Card, Drawer, Empty, Input, Modal, Radio, Select, Space, Table, Tag, Tooltip, Typography, message } from 'antd'
import { fingerprintContractApi } from '../../api/fingerprintContracts'
import { CHECK_LABELS, buildCheckPassRateItems, buildContractDetailRows, buildContractSetRows, canApplyJobUpdate, formatSamplesStatusText, nextJobPollDelayMs, shouldResumeJobPolling, type ContractSetRow } from './fingerprintContractsModel'

const { Text } = Typography
const JOB_STORAGE_KEY = 'fingerprint.contract.last_job_id'

let activePollingJobId: string | null = null

export default function FingerprintContracts() {
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<ContractSetRow[]>([])
  const [samplesStatus, setSamplesStatus] = useState<any>(null)
  const [aggregates, setAggregates] = useState<any[]>([])
  const [scoreRows, setScoreRows] = useState<any[]>([])
  const [selectedSetId, setSelectedSetId] = useState('')
  const [job, setJob] = useState<any>(null)
  const [generating, setGenerating] = useState(false)
  const [mode, setMode] = useState<'offline_refit' | 'online_fetch'>('offline_refit')
  const [label, setLabel] = useState('')
  const [notes, setNotes] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<any>(null)
  const [danglingActive, setDanglingActive] = useState(false)

  const mountedRef = useRef(true)
  const pollTokenRef = useRef(0)
  const myJobIdRef = useRef<string | null>(null)
  const selectedSetIdRef = useRef('')

  useEffect(() => {
    selectedSetIdRef.current = selectedSetId
  }, [selectedSetId])

  const load = async () => {
    setLoading(true)
    try {
      const [listRes, samplesRes, scoresRes] = await Promise.all([
        fingerprintContractApi.list(),
        fingerprintContractApi.samplesStatus(),
        fingerprintContractApi.scores(selectedSetIdRef.current || undefined),
      ])
      const sets = Array.isArray(listRes.data?.sets) ? listRes.data.sets : []
      const selectionData = listRes.data?.selection || null
      const activeSetId = String(selectionData?.active_set_id || 'builtin')
      const targets = Object.fromEntries(sets.map((s: any) => [s.id, s.target_summary]))
      const aggregatesData = Array.isArray(scoresRes.data?.aggregates) ? scoresRes.data.aggregates : []
      setRows(buildContractSetRows({ sets, selection: selectionData, aggregates: aggregatesData, targets }))
      setSamplesStatus(samplesRes.data || null)
      setAggregates(aggregatesData)
      setScoreRows(Array.isArray(scoresRes.data?.rows) ? scoresRes.data.rows : [])
      setSelectedSetId((prev) => prev || activeSetId)
      setDanglingActive(sets.length > 0 && activeSetId !== 'builtin' && listRes.data?.active == null)
    } catch {
      message.error('加载指纹合同失败')
    } finally {
      setLoading(false)
    }
  }

  const loadScores = async (setId: string) => {
    try {
      const { data } = await fingerprintContractApi.scores(setId)
      setAggregates(Array.isArray(data?.aggregates) ? data.aggregates : [])
      setScoreRows(Array.isArray(data?.rows) ? data.rows : [])
    } catch {
      message.error('加载评分看板失败')
    }
  }

  const pollJob = async (initial: any, token: number) => {
    let current = initial
    let failures = 0
    while (true) {
      const delay = nextJobPollDelayMs(current, failures)
      if (delay == null) break
      await new Promise((resolve) => setTimeout(resolve, delay))
      if (!canApplyJobUpdate(mountedRef.current, token, pollTokenRef.current)) break
      try {
        const { data } = await fingerprintContractApi.job(current.id)
        current = data.job
        if (!canApplyJobUpdate(mountedRef.current, token, pollTokenRef.current)) break
        setJob(current)
        failures = 0
      } catch {
        failures += 1
      }
    }
    return current
  }

  const finishJob = async (finalJob: any) => {
    if (!mountedRef.current) return
    if (finalJob?.status === 'completed') message.success('合同生成完成')
    else if (finalJob?.status === 'failed') message.error(finalJob?.error || '合同生成失败')
    if (finalJob?.status === 'completed' || finalJob?.status === 'failed') {
      try { localStorage.removeItem(JOB_STORAGE_KEY) } catch { /* private mode */ }
    }
    await load()
  }

  const runJobPolling = async (initial: any) => {
    const token = ++pollTokenRef.current
    const jobId = String(initial.id)
    activePollingJobId = jobId
    myJobIdRef.current = jobId
    try {
      const final = await pollJob(initial, token)
      if (canApplyJobUpdate(mountedRef.current, token, pollTokenRef.current)) {
        await finishJob(final)
      }
    } finally {
      if (activePollingJobId === jobId) activePollingJobId = null
      if (myJobIdRef.current === jobId) myJobIdRef.current = null
    }
  }

  const generate = async () => {
    setGenerating(true)
    try {
      const { data } = await fingerprintContractApi.generate({ mode, label: label || undefined, notes: notes || undefined })
      if (mountedRef.current) setJob(data.job)
      try { localStorage.setItem(JOB_STORAGE_KEY, String(data.job.id)) } catch { /* private mode */ }
      await runJobPolling(data.job)
    } catch (e: any) {
      if (mountedRef.current) message.error(e?.response?.data?.error || '操作失败')
    } finally {
      if (mountedRef.current) setGenerating(false)
    }
  }

  useEffect(() => {
    mountedRef.current = true
    load()
    let savedJobId = ''
    try { savedJobId = localStorage.getItem(JOB_STORAGE_KEY) || '' } catch { /* private mode */ }
    if (shouldResumeJobPolling(savedJobId || null, activePollingJobId)) {
      ;(async () => {
        try {
          const { data } = await fingerprintContractApi.job(savedJobId)
          const initial = data.job
          if (!initial || !mountedRef.current) return
          setJob(initial)
          if (initial.status === 'queued' || initial.status === 'running') {
            setGenerating(true)
            await runJobPolling(initial)
            if (mountedRef.current) setGenerating(false)
          } else {
            try { localStorage.removeItem(JOB_STORAGE_KEY) } catch { /* private mode */ }
          }
        } catch {
          try { localStorage.removeItem(JOB_STORAGE_KEY) } catch { /* private mode */ }
        }
      })()
    }
    return () => {
      mountedRef.current = false
      if (myJobIdRef.current && activePollingJobId === myJobIdRef.current) {
        activePollingJobId = null
      }
    }
  }, [])

  const activate = async (id: string) => {
    try {
      await fingerprintContractApi.putSelection({ active_set_id: id })
      message.success('已切换合同集')
      await load()
    } catch (e: any) {
      message.error(e?.response?.data?.error || '操作失败')
    }
  }

  const lockSet = async (id: string) => {
    try {
      await fingerprintContractApi.putSelection({ locked: { set_id: id, key: 'active' } })
      message.success('已锁定合同集')
      await load()
    } catch (e: any) {
      message.error(e?.response?.data?.error || '操作失败')
    }
  }

  const unlockSet = async () => {
    try {
      await fingerprintContractApi.putSelection({ locked: null })
      message.success('已解除锁定')
      await load()
    } catch (e: any) {
      message.error(e?.response?.data?.error || '操作失败')
    }
  }

  const viewDetail = async (id: string) => {
    setDetailOpen(true)
    setDetailLoading(true)
    try {
      const { data } = await fingerprintContractApi.detail(id)
      setDetail(data)
    } catch (e: any) {
      message.error(e?.response?.data?.error || '加载详情失败')
    } finally {
      setDetailLoading(false)
    }
  }

  const confirmDelete = (record: ContractSetRow) => {
    Modal.confirm({
      title: `删除合同集「${record.label}」？`,
      content: '删除后无法恢复；内置合同或正被启用/锁定的合同集无法删除。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await fingerprintContractApi.remove(record.id)
          message.success('已删除')
          await load()
        } catch (e: any) {
          message.error(e?.response?.data?.error || '操作失败')
        }
      },
    })
  }

  const selectedAggregate = useMemo(
    () => aggregates.find((a: any) => String(a?.set_id) === selectedSetId) || null,
    [aggregates, selectedSetId],
  )

  const setColumns = [
    {
      title: '标签',
      key: 'label',
      render: (_: any, record: ContractSetRow) => (
        <Space size={6} wrap>
          <span>{record.label}</span>
          {record.is_active && <Tag color="green">启用中</Tag>}
          {record.is_locked && <Tag color="orange">已锁定</Tag>}
          {record.is_builtin && <Tag>内置</Tag>}
        </Space>
      ),
    },
    { title: '模式', dataIndex: 'mode', key: 'mode' },
    {
      title: '生成时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v: string) => (v ? new Date(v).toLocaleString() : '-'),
    },
    { title: '样本数', dataIndex: 'sample_count', key: 'sample_count' },
    {
      title: 'ta_max',
      dataIndex: 'ta_max',
      key: 'ta_max',
      render: (v: number | null) => (v == null ? '—' : v),
    },
    {
      title: '评分',
      key: 'score',
      render: (_: any, record: ContractSetRow) => (record.average_score == null
        ? '—'
        : `${(record.average_score * 100).toFixed(1)}% · ${record.chapter_count} 章`),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: ContractSetRow) => (
        <Space wrap>
          {!record.is_active && <Button size="small" onClick={() => activate(record.id)}>启用</Button>}
          {!record.is_locked && <Button size="small" onClick={() => lockSet(record.id)}>锁定此份</Button>}
          {record.is_locked && <Button size="small" onClick={() => unlockSet()}>解除锁定</Button>}
          <Button size="small" type="link" onClick={() => viewDetail(record.id)}>详情</Button>
          {!record.is_builtin && <Button size="small" danger onClick={() => confirmDelete(record)}>删除</Button>}
        </Space>
      ),
    },
  ]

  const scoreDetailRows = scoreRows.map((row: any, index: number) => ({ ...row, __key: index }))

  return (
    <div style={{ padding: 32, minHeight: '100%' }}>
      <Space direction="vertical" style={{ width: '100%' }} size={24}>
        <Card variant="borderless" title="合同集">
          {danglingActive && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message="当前启用的合同集已不存在，已回落到内置合同，请重新选择一套合同集。"
            />
          )}
          <Table
            rowKey="id"
            loading={loading}
            pagination={false}
            dataSource={rows}
            columns={setColumns}
          />
        </Card>

        <Card variant="borderless" title="生成合同">
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Alert
              type={samplesStatus?.available ? 'info' : 'warning'}
              showIcon
              message={formatSamplesStatusText(samplesStatus)}
            />
            <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)}>
              <Radio value="offline_refit">离线重拟合（推荐）</Radio>
              <Radio value="online_fetch">联网抓取（耗时长、依赖站点，需在服务端手动运行 build 脚本）</Radio>
            </Radio.Group>
            <Input
              placeholder="标签（可选）"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              style={{ maxWidth: 360 }}
            />
            <Input.TextArea
              placeholder="备注（可选）"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
            {job && (
              <Text type="secondary">
                最近任务：{job.status}
                {job.progress ? ` · ${job.progress}` : ''}
                {job.status === 'failed' && job.error ? ` · ${job.error}` : ''}
              </Text>
            )}
            <Button
              type="primary"
              loading={generating}
              disabled={mode === 'offline_refit' && !samplesStatus?.available}
              onClick={generate}
            >
              开始生成
            </Button>
            {mode === 'online_fetch' && (
              <Text type="secondary">联网抓取尚未接线：这里只会记录一条说明性失败任务，请改为在服务端手动运行 build 脚本完成抓取与拟合。</Text>
            )}
          </Space>
        </Card>

        <Card variant="borderless" title="评分看板">
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Select
              style={{ width: 280 }}
              value={selectedSetId || undefined}
              placeholder="选择合同集"
              onChange={(value) => { setSelectedSetId(value); loadScores(value) }}
              options={rows.map((r) => ({ label: r.label, value: r.id }))}
            />
            {selectedAggregate && (
              <>
                <Space>
                  <Tag color="blue">均分 {(Number(selectedAggregate.average_score || 0) * 100).toFixed(1)}%</Tag>
                  <Tag>{Number(selectedAggregate.chapter_count || 0)} 章</Tag>
                </Space>
                <Space wrap>
                  {buildCheckPassRateItems(selectedAggregate).map((item) => (
                    <Tooltip key={item.key} title={item.tooltip}>
                      <Tag color={item.tone === 'good' ? 'green' : item.tone === 'warn' ? 'orange' : 'red'}>
                        {item.label} {(item.pass_rate * 100).toFixed(0)}%
                      </Tag>
                    </Tooltip>
                  ))}
                </Space>
              </>
            )}
            {scoreDetailRows.length ? (
              <Table
                rowKey="__key"
                dataSource={scoreDetailRows}
                pagination={{ pageSize: 10 }}
                columns={[
                  { title: '项目', dataIndex: 'project_id', key: 'project_id' },
                  { title: '章号', dataIndex: 'chapter_no', key: 'chapter_no', render: (v: number | null) => (v == null ? '-' : v) },
                  {
                    title: '得分',
                    dataIndex: 'score',
                    key: 'score',
                    render: (v: number | null) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`),
                  },
                  {
                    title: '未达标项',
                    dataIndex: 'failing',
                    key: 'failing',
                    render: (v: string[]) => (Array.isArray(v) && v.length
                      ? v.map((k) => CHECK_LABELS[k] || k).join(', ')
                      : '-'),
                  },
                ]}
              />
            ) : (
              <Empty description="尚无评分记录：新章节入库后自动累积" />
            )}
          </Space>
        </Card>
      </Space>

      <Drawer
        title="合同集详情"
        width={640}
        destroyOnHidden
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <Alert
            type="info"
            showIcon
            message="散文字段（提示词指令 / 规避 / 优先 / 朱雀硬门槛）继承自内置合同、不随重拟合改变；重拟合仅重算下表中的统计门槛值。"
          />
          <Table
            rowKey="label"
            loading={detailLoading}
            pagination={false}
            size="small"
            dataSource={buildContractDetailRows(detail)}
            columns={[
              { title: '项', dataIndex: 'label', key: 'label' },
              { title: '值', dataIndex: 'value', key: 'value' },
            ]}
          />
        </Space>
      </Drawer>
    </div>
  )
}
