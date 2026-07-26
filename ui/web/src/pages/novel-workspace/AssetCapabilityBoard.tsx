import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Checkbox, Collapse, Empty, List, Space, Table, Tag, Typography, message } from 'antd'
import {
  ClusterOutlined,
  ProfileOutlined,
  ReloadOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  BookOutlined,
  LinkOutlined,
} from '@ant-design/icons'
import apiClient from '../../api/client'
import './AssetCapabilityBoard.css'

const { Text, Title } = Typography

type BoardProps = {
  projectId: number
  activeChapter?: any | null
  selectedModelId?: number
  onAssetsChanged?: () => void
}

function readinessColor(value?: string) {
  if (value === 'ready') return 'green'
  if (value === 'partial') return 'gold'
  return 'red'
}

function severityColor(value?: string) {
  if (value === 'high') return 'red'
  if (value === 'warn') return 'orange'
  return 'blue'
}

function emotionColor(value?: string) {
  if (value === '正面') return 'green'
  if (value === '负面') return 'red'
  if (value === '混合') return 'gold'
  return 'default'
}

function lifecycleColor(value?: string) {
  if (value === '已过期') return 'red'
  if (value === '已埋') return 'orange'
  if (value === '未埋') return 'blue'
  if (value === '已回收') return 'green'
  return 'default'
}

export function AssetCapabilityBoard({
  projectId,
  activeChapter,
  selectedModelId,
  onAssetsChanged,
}: BoardProps) {
  const [loading, setLoading] = useState(false)
  const [actionKey, setActionKey] = useState('')
  const [overview, setOverview] = useState<any>(null)
  const [selectedIntakeKeys, setSelectedIntakeKeys] = useState<string[]>([])

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const res = await apiClient.get(`/novel/projects/${projectId}/assets/overview`, {
        params: activeChapter?.id ? { chapter_id: activeChapter.id } : undefined,
      })
      setOverview(res.data || null)
      setSelectedIntakeKeys([])
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '资产能力面板加载失败')
    } finally {
      setLoading(false)
    }
  }, [projectId, activeChapter?.id])

  useEffect(() => {
    void load()
  }, [load])

  const characterStatus = overview?.character_status
  const storyRelations = overview?.story_relations
  const foreshadow = overview?.foreshadow_lifecycle
  const chapterBrief = overview?.chapter_brief
  const graphRelations = overview?.relations
  const intakeQueue = overview?.intake_queue
  const gapAudit = overview?.gap_audit
  const chapterPack = overview?.chapter_pack

  const materializeRelations = async () => {
    setActionKey('materialize')
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/assets/story-relations/materialize`, {
        model_id: selectedModelId,
      })
      message.success(
        `关系主表物化完成：新建 ${res.data?.summary?.created ?? 0}，更新 ${res.data?.summary?.updated ?? 0}`,
      )
      await load()
      onAssetsChanged?.()
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '关系主表物化失败')
    } finally {
      setActionKey('')
    }
  }

  const fillGaps = async () => {
    setActionKey('fill')
    try {
      const before = gapAudit?.summary?.total_gaps
      const res = await apiClient.post(`/novel/projects/${projectId}/assets/fill-gaps`, {
        model_id: selectedModelId,
      })
      const after = res.data?.audit_after?.summary?.total_gaps
      message.success(`缺口补齐完成：缺口 ${before ?? '-'} → ${after ?? '-'}`)
      await load()
      onAssetsChanged?.()
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '缺口补齐失败')
    } finally {
      setActionKey('')
    }
  }

  const applyIntake = async () => {
    const items = (intakeQueue?.items || []).filter((item: any) => selectedIntakeKeys.includes(item._key))
    if (!items.length) {
      message.warning('请先勾选要入库的资产')
      return
    }
    setActionKey('intake')
    try {
      await apiClient.post(`/novel/projects/${projectId}/assets/intake-queue/apply`, {
        assets: items,
      })
      message.success(`已确认入库 ${items.length} 项`)
      await load()
      onAssetsChanged?.()
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '入库失败')
    } finally {
      setActionKey('')
    }
  }

  const storyRelationColumns = useMemo(() => [
    { title: '角色 A', dataIndex: 'party_a', key: 'party_a', width: 100 },
    { title: '角色 B', dataIndex: 'party_b', key: 'party_b', width: 100 },
    {
      title: '类型',
      dataIndex: 'story_relation_type',
      key: 'story_relation_type',
      width: 70,
      render: (value: string) => <Tag bordered={false}>{value || '未知'}</Tag>,
    },
    {
      title: '情感',
      dataIndex: 'emotion',
      key: 'emotion',
      width: 70,
      render: (value: string) => <Tag color={emotionColor(value)} bordered={false}>{value || '中性'}</Tag>,
    },
    {
      title: '当前状态',
      dataIndex: 'current_status',
      key: 'current_status',
      ellipsis: true,
    },
    {
      title: '变化节点',
      dataIndex: 'change_nodes',
      key: 'change_nodes',
      width: 220,
      render: (nodes: any[]) => {
        const list = Array.isArray(nodes) ? nodes : []
        if (!list.length) return <Text type="secondary">—</Text>
        return (
          <Text type="secondary">
            {list.slice(-2).map((item: any) => `第${item.chapter_no || '?'}章 ${item.note || ''}`).join('；')}
          </Text>
        )
      },
    },
  ], [])

  const foreshadowColumns = useMemo(() => [
    { title: '伏笔', dataIndex: 'name', key: 'name', width: 160, ellipsis: true },
    {
      title: '状态',
      dataIndex: 'lifecycle',
      key: 'lifecycle',
      width: 80,
      render: (value: string) => <Tag color={lifecycleColor(value)} bordered={false}>{value}</Tag>,
    },
    {
      title: '埋设/到期',
      key: 'window',
      width: 110,
      render: (_: any, row: any) => (
        <Text type="secondary">
          {row.plant_chapter_no ? `第${row.plant_chapter_no}章` : '—'}
          {' → '}
          {row.expected_resolve_chapter_no ? `第${row.expected_resolve_chapter_no}章` : '—'}
        </Text>
      ),
    },
    {
      title: '重要度',
      dataIndex: 'importance',
      key: 'importance',
      width: 60,
    },
    {
      title: '摘要',
      dataIndex: 'summary',
      key: 'summary',
      ellipsis: true,
    },
  ], [])

  return (
    <div className="asset-capability-board">
      <div className="asset-capability-toolbar">
        <Space direction="vertical" size={2} style={{ flex: 1 }}>
          <Title level={5} style={{ margin: 0 }}>资产能力（oh-story 真相层）</Title>
          <Text type="secondary">
            优先：关系主表 · 角色状态 · 伏笔生命周期 · 本章速记。图边诊断降为辅助。
          </Text>
        </Space>
        <Space wrap>
          <Button
            size="small"
            className="novel-btn-crystal novel-btn-crystal-local"
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => void load()}
          >
            刷新
          </Button>
          <Button
            size="small"
            className={`novel-btn-crystal novel-btn-crystal-local${actionKey === 'materialize' ? ' novel-btn-crystal-running' : ''}`}
            icon={<LinkOutlined />}
            loading={actionKey === 'materialize'}
            disabled={Boolean(actionKey) && actionKey !== 'materialize'}
            onClick={() => void materializeRelations()}
          >
            物化关系主表
          </Button>
          <Button
            size="small"
            className={`novel-btn-crystal novel-btn-crystal-model${actionKey === 'fill' ? ' novel-btn-crystal-running' : ''}`}
            icon={<RocketOutlined />}
            loading={actionKey === 'fill'}
            disabled={!selectedModelId || (Boolean(actionKey) && actionKey !== 'fill')}
            onClick={() => void fillGaps()}
          >
            缺口一键补齐
          </Button>
        </Space>
      </div>

      <Card
        size="small"
        className="asset-capability-card asset-capability-relations"
        title={<Space><LinkOutlined />故事关系主表</Space>}
        extra={<Text type="secondary">{storyRelations?.summary?.total || 0} 条 · 变化节点 {storyRelations?.summary?.with_change_nodes || 0}</Text>}
      >
        {!storyRelations?.rows?.length ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无故事关系。先同步故事状态，或点“物化关系主表”。"
          />
        ) : (
          <Table
            size="small"
            rowKey={(row: any) => row.id || row.pair_key}
            pagination={{ pageSize: 8, hideOnSinglePage: true }}
            columns={storyRelationColumns as any}
            dataSource={storyRelations.rows}
          />
        )}
      </Card>

      <div className="asset-capability-grid">
        <Card
          size="small"
          className="asset-capability-card"
          title={<Space><TeamOutlined />角色状态快照</Space>}
          extra={(
            <Text type="secondary">
              就绪 {characterStatus?.summary?.ready || 0} / {characterStatus?.summary?.total || 0}
            </Text>
          )}
        >
          {!characterStatus?.characters?.length ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无角色状态" />
          ) : (
            <List
              size="small"
              dataSource={characterStatus.characters.slice(0, 10)}
              renderItem={(item: any) => (
                <List.Item className="asset-capability-list-item">
                  <div className="asset-capability-row">
                    <Space wrap size={6}>
                      <Text strong>{item.name}</Text>
                      <Tag color={readinessColor(item.readiness)} bordered={false}>{item.readiness}</Tag>
                      {item.identity ? <Tag bordered={false}>{item.identity}</Tag> : null}
                    </Space>
                    <Text type="secondary" className="asset-capability-line">
                      {(item.relationships || []).slice(0, 2).join('；') || item.summary || '无关系摘要'}
                    </Text>
                    {item.missing_fields?.length ? (
                      <Text className="asset-capability-line">缺：{item.missing_fields.join('、')}</Text>
                    ) : null}
                  </div>
                </List.Item>
              )}
            />
          )}
        </Card>

        <Card
          size="small"
          className="asset-capability-card"
          title={<Space><BookOutlined />伏笔生命周期</Space>}
          extra={<Text type="secondary">开放 {foreshadow?.summary?.open || 0} · 过期 {foreshadow?.summary?.expired || 0} · 将到期 {foreshadow?.summary?.due_soon || 0}</Text>}
        >
          {!foreshadow?.rows?.length ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无长线伏笔（章钩子已隐藏）" />
          ) : (
            <Table
              size="small"
              rowKey={(row: any) => row.id || row.name}
              pagination={{ pageSize: 6, hideOnSinglePage: true }}
              columns={foreshadowColumns as any}
              dataSource={foreshadow.rows.slice(0, 30)}
            />
          )}
          {foreshadow?.summary?.chapter_hooks_hidden ? (
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              已隐藏章末钩子 {foreshadow.summary.chapter_hooks_hidden} 条（不算核心伏笔）
            </Text>
          ) : null}
        </Card>

        <Card
          size="small"
          className="asset-capability-card"
          title={<Space><ProfileOutlined />本章速记</Space>}
          extra={<Text type="secondary">{chapterBrief?.chapter_no ? `第${chapterBrief.chapter_no}章` : (activeChapter?.chapter_no ? `第${activeChapter.chapter_no}章` : '未选章')}</Text>}
        >
          {!chapterBrief ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="选择章节后显示 oh-story 本节速记" />
          ) : (
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <div>
                <Text strong>角色状态</Text>
                {(chapterBrief.character_states || []).length ? (
                  <List
                    size="small"
                    dataSource={chapterBrief.character_states}
                    renderItem={(item: any) => (
                      <List.Item style={{ padding: '4px 0' }}>
                        <Text>{item.name}：{item.line || '—'}</Text>
                      </List.Item>
                    )}
                  />
                ) : <Text type="secondary">无</Text>}
              </div>
              <div>
                <Text strong>关键关系</Text>
                {(chapterBrief.relations || []).length ? (
                  <List
                    size="small"
                    dataSource={chapterBrief.relations}
                    renderItem={(item: any) => (
                      <List.Item style={{ padding: '4px 0' }}>
                        <Text>{item.pair} · {item.type}/{item.emotion} · {item.status}</Text>
                      </List.Item>
                    )}
                  />
                ) : <Text type="secondary">无</Text>}
              </div>
              <div>
                <Text strong>相关伏笔</Text>
                {(chapterBrief.foreshadowing || []).length ? (
                  <List
                    size="small"
                    dataSource={chapterBrief.foreshadowing}
                    renderItem={(item: any) => (
                      <List.Item style={{ padding: '4px 0' }}>
                        <Text>[{item.lifecycle}] {item.name}：{item.summary}</Text>
                      </List.Item>
                    )}
                  />
                ) : <Text type="secondary">无</Text>}
              </div>
              {(chapterBrief.unresolved_conflicts || []).length ? (
                <div>
                  <Text strong>未决冲突</Text>
                  <div className="asset-capability-tags">
                    {chapterBrief.unresolved_conflicts.map((item: string) => (
                      <Tag key={item} bordered={false}>{item}</Tag>
                    ))}
                  </div>
                </div>
              ) : null}
            </Space>
          )}
        </Card>

        <Card
          size="small"
          className="asset-capability-card"
          title={<Space><SafetyCertificateOutlined />设定缺口</Space>}
          extra={<Text type="secondary">{gapAudit?.summary?.total_gaps || 0} 项</Text>}
        >
          {!gapAudit?.gaps?.length ? (
            <Alert type="success" showIcon message="暂无明显资产缺口" />
          ) : (
            <List
              size="small"
              dataSource={gapAudit.gaps.slice(0, 10)}
              renderItem={(item: any) => (
                <List.Item className="asset-capability-list-item">
                  <div className="asset-capability-row">
                    <Space wrap size={6}>
                      <Tag color={severityColor(item.severity)} bordered={false}>{item.severity}</Tag>
                      <Text strong>{item.title}</Text>
                    </Space>
                    <Text type="secondary" className="asset-capability-line">{item.detail}</Text>
                    <Text className="asset-capability-line">操作：{item.fix_hint}</Text>
                  </div>
                </List.Item>
              )}
            />
          )}
        </Card>
      </div>

      <Collapse
        size="small"
        className="asset-capability-secondary"
        items={[
          {
            key: 'intake',
            label: `新资产确认队列（${intakeQueue?.items?.length || 0}）`,
            children: !intakeQueue?.items?.length ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无待确认资产" />
            ) : (
              <>
                <List
                  size="small"
                  dataSource={intakeQueue.items}
                  renderItem={(item: any) => (
                    <List.Item className="asset-capability-list-item">
                      <Checkbox
                        checked={selectedIntakeKeys.includes(item._key)}
                        onChange={(event) => {
                          const checked = event.target.checked
                          setSelectedIntakeKeys(prev => checked
                            ? [...prev, item._key]
                            : prev.filter(key => key !== item._key))
                        }}
                      >
                        <Space direction="vertical" size={0}>
                          <Space size={6} wrap>
                            <Text strong>{item.name}</Text>
                            <Tag bordered={false}>{item.entity_type}</Tag>
                            {item.chapter_no ? <Tag bordered={false}>第{item.chapter_no}章</Tag> : null}
                          </Space>
                          <Text type="secondary">{item.summary || item.evidence || '无摘要'}</Text>
                        </Space>
                      </Checkbox>
                    </List.Item>
                  )}
                />
                <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 8 }}>
                  <Button
                    size="small"
                    className="novel-btn-crystal novel-btn-crystal-display"
                    onClick={() => setSelectedIntakeKeys((intakeQueue.items || []).map((item: any) => item._key))}
                  >
                    全选
                  </Button>
                  <Button
                    size="small"
                    className={`novel-btn-crystal novel-btn-crystal-local${actionKey === 'intake' ? ' novel-btn-crystal-running' : ''}`}
                    loading={actionKey === 'intake'}
                    disabled={Boolean(actionKey) && actionKey !== 'intake'}
                    onClick={() => void applyIntake()}
                  >
                    批量确认入库
                  </Button>
                </Space>
              </>
            ),
          },
          {
            key: 'chapter-pack',
            label: `本章资产包（设定 ${chapterPack?.summary?.setting_count || 0}）`,
            children: !chapterPack ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="选择章节后显示" />
            ) : (
              <Space direction="vertical" size={6} style={{ width: '100%' }}>
                {Object.entries(chapterPack.settings_by_type || {}).map(([type, list]: any) => (
                  <div key={type}>
                    <Text strong>{type}</Text>
                    <div className="asset-capability-tags">
                      {(list || []).slice(0, 10).map((item: any) => (
                        <Tag key={`${type}-${item.id || item.name}`} bordered={false}>{item.name}</Tag>
                      ))}
                    </div>
                  </div>
                ))}
              </Space>
            ),
          },
          {
            key: 'graph',
            label: `图边诊断（辅助，${graphRelations?.summary?.total || 0} 条边 / 孤立 ${graphRelations?.summary?.isolated_key_asset_count || 0}）`,
            children: (
              <Table
                size="small"
                rowKey="id"
                pagination={{ pageSize: 6, hideOnSinglePage: true }}
                dataSource={(graphRelations?.rows || []).slice(0, 30)}
                locale={{ emptyText: '暂无图边' }}
                columns={[
                  { title: 'A', dataIndex: 'source_name', width: 120 },
                  { title: '关系', dataIndex: 'relation_type', width: 120 },
                  { title: 'B', dataIndex: 'target_name', width: 120 },
                  { title: '置信', dataIndex: 'confidence', width: 80 },
                ] as any}
              />
            ),
          },
        ]}
      />
    </div>
  )
}
