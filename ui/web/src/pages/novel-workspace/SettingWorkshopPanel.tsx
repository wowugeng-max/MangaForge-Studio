import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Card, Checkbox, Empty, Form, Input, InputNumber, List, message, Modal, Segmented, Select, Space, Tabs, Tag, Typography } from 'antd'
import apiClient from '../../api/client'
import { displayValue } from './utils'
import {
  buildCompactSettingTags,
  buildUsageSummary,
  filterSettingsForUsage,
  normalizeUsageType,
  revealSegmentOptions,
  type SettingUsageFilter,
  usageFilterOptions,
  usageSegmentOptions,
} from './settingUsageWorkbenchModel'
import './SettingWorkshopPanel.css'

import {
  EMPTY_INITIAL_SETTINGS,
  discoveredAssetKey,
  objectToRows,
  parseReviewPayload,
  reviewChapterId,
  rowsToObject,
  settingTypes,
  splitList,
  typeLabel,
  usageFromMap,
  type SettingWorkshopActionKey,
} from './settingWorkshopHelpers'

const { Text, Paragraph } = Typography

import {
  useSettingWorkshopModel,
} from './use-setting-workshop-model'

export function SettingWorkshopPanel({
  projectId,
  activeChapter,
  selectedModelId,
  initialSettings = EMPTY_INITIAL_SETTINGS,
  layout = 'compact',
  focusDiscoveredAssetsToken = 0,
  onAssetsApplied,
}: {
  projectId: number
  activeChapter?: any | null
  selectedModelId?: number
  initialSettings?: any[]
  layout?: 'compact' | 'workspace'
  focusDiscoveredAssetsToken?: number
  onAssetsApplied?: () => void
}) {

  const {
    activeType,
    activeUsageFilter,
    activeUsageFilterLabel,
    applySelectedDiscoveredAssets,
    applySelectedStateUpdates,
    assetDispositionDrafts,
    commandClass,
    deleteSetting,
    disabledForAction,
    discoveredAssets,
    discoveredAssetsRef,
    editing,
    editorOpen,
    form,
    grouped,
    incubateSettings,
    incubateStorylines,
    isActionBusy,
    isActionLoading,
    load,
    loading,
    mergeTargetOptions,
    openEditor,
    pendingStateUpdates,
    runConsistencyCheck,
    saveUsage,
    selectedDiscoveredAssetKeys,
    selectedStateUpdateKeys,
    setActiveType,
    setActiveUsageFilter,
    setAssetDispositionDrafts,
    setDiscoveredAssets,
    setEditorOpen,
    setPendingStateUpdates,
    setSelectedDiscoveredAssetKeys,
    setSelectedStateUpdateKeys,
    settings,
    submitSetting,
    suggestChapterUsage,
    suggestStorylineUsage,
    updateAssetDispositionDraft,
    updateUsage,
    usage,
    usageMap,
    usageSummary,
  } = useSettingWorkshopModel({
    projectId,
    activeChapter,
    selectedModelId,
    initialSettings,
    layout,
    focusDiscoveredAssetsToken,
    onAssetsApplied,
  })

  return (
    <Space className={`setting-workshop-panel setting-workshop-panel-${layout}`} direction="vertical" size={layout === 'workspace' ? 14 : 8}>
      <Alert
        type="info"
        showIcon
        message="设定工坊"
        description="把角色、境界、能力、物品、Boss、规则等精细设定结构化，再由本章调用面板决定生成时必须使用、允许使用或禁止揭露的内容。"
      />
      <Space wrap size={6}>
        <Button size="small" type="primary" disabled={isActionBusy} onClick={() => openEditor()}>新增设定</Button>
        <Button size="small" className={commandClass('incubate_settings')} onClick={() => incubateSettings(false)} loading={isActionLoading('incubate_settings')} disabled={disabledForAction('incubate_settings')}>从项目资料补齐</Button>
        <Button size="small" className={commandClass('incubate_settings_model', true)} onClick={() => incubateSettings(true)} loading={isActionLoading('incubate_settings_model')} disabled={disabledForAction('incubate_settings_model', !selectedModelId)}>模型提炼设定</Button>
        <Button size="small" className={commandClass('incubate_storylines')} onClick={() => incubateStorylines(false)} loading={isActionLoading('incubate_storylines')} disabled={disabledForAction('incubate_storylines')}>补齐剧情线</Button>
        <Button size="small" className={commandClass('incubate_storylines_model', true)} onClick={() => incubateStorylines(true)} loading={isActionLoading('incubate_storylines_model')} disabled={disabledForAction('incubate_storylines_model', !selectedModelId)}>模型孵化剧情线</Button>
        <Button size="small" className={commandClass('suggest_usage')} onClick={() => suggestChapterUsage(false)} loading={isActionLoading('suggest_usage')} disabled={disabledForAction('suggest_usage', !activeChapter?.id)}>本章快速匹配</Button>
        <Button size="small" className={commandClass('suggest_usage_model', true)} onClick={() => suggestChapterUsage(true)} loading={isActionLoading('suggest_usage_model')} disabled={disabledForAction('suggest_usage_model', !activeChapter?.id || !selectedModelId)}>模型匹配本章</Button>
        <Button size="small" className={commandClass('suggest_storyline')} onClick={() => suggestStorylineUsage(false)} loading={isActionLoading('suggest_storyline')} disabled={disabledForAction('suggest_storyline', !activeChapter?.id)}>匹配剧情线</Button>
        <Button size="small" className={commandClass('suggest_storyline_model', true)} onClick={() => suggestStorylineUsage(true)} loading={isActionLoading('suggest_storyline_model')} disabled={disabledForAction('suggest_storyline_model', !activeChapter?.id || !selectedModelId)}>模型匹配剧情线</Button>
        <Button size="small" className={commandClass('consistency_check', true)} onClick={runConsistencyCheck} loading={isActionLoading('consistency_check')} disabled={disabledForAction('consistency_check', !activeChapter?.chapter_text)}>检查本章</Button>
        <Button size="small" onClick={load} loading={loading} disabled={isActionBusy}>刷新</Button>
      </Space>

      <section className="setting-workshop-usage-board" aria-label="本章设定调用确认">
        <div className="setting-workshop-usage-board-header">
          <div className="setting-workshop-usage-board-title">
            <Text strong>{activeChapter ? `第${activeChapter.chapter_no}章 · ${activeChapter.title || activeChapter.name || '本章调用确认'}` : '本章调用确认'}</Text>
            <Text type="secondary">写正文前确认资产出现、隐藏、推进和回收。</Text>
          </div>
          <Button
            size="small"
            type="primary"
            onClick={saveUsage}
            loading={isActionLoading('save_usage')}
            disabled={disabledForAction('save_usage', !activeChapter?.id)}
          >
            保存本章调用
          </Button>
        </div>
        <div className="setting-workshop-usage-metrics">
          <Tag color="blue" bordered={false}>已配置 {usageSummary.configured}</Tag>
          <Tag color="green" bordered={false}>必用 {usageSummary.required}</Tag>
          <Tag color="red" bordered={false}>禁揭 {usageSummary.forbidden}</Tag>
          <Tag color="purple" bordered={false}>推进 {usageSummary.advance}</Tag>
          <Tag color="cyan" bordered={false}>埋线 {usageSummary.plant}</Tag>
          <Tag color="gold" bordered={false}>回收 {usageSummary.payoff}</Tag>
          <Tag bordered={false}>暂停 {usageSummary.pause}</Tag>
        </div>
        <div className="setting-workshop-filter-strip" role="list" aria-label="按本章调用状态筛选设定资产">
          {usageFilterOptions.map(option => (
            <Button
              key={option.key}
              size="small"
              type={activeUsageFilter === option.key ? 'primary' : 'default'}
              onClick={() => setActiveUsageFilter(option.key)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </section>

      {discoveredAssets.length > 0 && (
        <div ref={discoveredAssetsRef} className="setting-workshop-discovered-anchor">
        <Card
          size="small"
          title={`新资产候选 ${discoveredAssets.length}`}
          extra={(
            <Space size={4}>
              <Button size="small" type="link" onClick={() => setSelectedDiscoveredAssetKeys(discoveredAssets.map(item => item._key))}>全选</Button>
              <Button size="small" type="link" onClick={() => setSelectedDiscoveredAssetKeys([])}>清空</Button>
            </Space>
          )}
        >
          <List
            size="small"
            dataSource={discoveredAssets}
            renderItem={(item: any) => (
              <List.Item>
                <Space align="start" style={{ width: '100%' }}>
                  <Checkbox
                    checked={selectedDiscoveredAssetKeys.includes(item._key)}
                    onChange={event => setSelectedDiscoveredAssetKeys(prev => event.target.checked ? [...prev, item._key] : prev.filter(key => key !== item._key))}
                  />
                  <Space direction="vertical" size={2} style={{ flex: 1 }}>
                    <Space size={4} wrap>
                      <Text strong>{item.name}</Text>
                      <Tag bordered={false}>{typeLabel(item.entity_type)}</Tag>
                      {item.first_chapter_no && <Tag color="blue" bordered={false}>第{item.first_chapter_no}章</Tag>}
                    </Space>
                    <Text style={{ fontSize: 12 }}>{item.summary || '暂无摘要'}</Text>
                    {item.evidence && <Text type="secondary" style={{ fontSize: 12 }}>证据：{displayValue(item.evidence).slice(0, 140)}</Text>}
                    {(item.constraints_json && Object.keys(item.constraints_json).length > 0) && <Text type="secondary" style={{ fontSize: 12 }}>约束：{displayValue(item.constraints_json).slice(0, 120)}</Text>}
                    <Space size={6} wrap>
                      <Select
                        size="small"
                        value={assetDispositionDrafts[item._key]?.disposition || 'confirm'}
                        style={{ width: 116 }}
                        options={[
                          { value: 'confirm', label: '确认入库' },
                          { value: 'rename', label: '改名入库' },
                          { value: 'merge', label: '合并已有' },
                          { value: 'cameo', label: '一次性过场' },
                        ]}
                        onChange={value => updateAssetDispositionDraft(item._key, { disposition: value, target_name: value === 'rename' ? (assetDispositionDrafts[item._key]?.target_name || item.name) : undefined })}
                      />
                      {(assetDispositionDrafts[item._key]?.disposition === 'rename') && (
                        <Input
                          size="small"
                          value={assetDispositionDrafts[item._key]?.target_name || item.name}
                          style={{ width: 180 }}
                          placeholder="入库名称"
                          onChange={event => updateAssetDispositionDraft(item._key, { disposition: 'rename', target_name: event.target.value })}
                        />
                      )}
                      {(assetDispositionDrafts[item._key]?.disposition === 'merge') && (
                        <Select
                          size="small"
                          showSearch
                          value={assetDispositionDrafts[item._key]?.merge_target_id}
                          style={{ width: 220 }}
                          placeholder="选择已有资产"
                          options={mergeTargetOptions}
                          optionFilterProp="label"
                          onChange={value => updateAssetDispositionDraft(item._key, { disposition: 'merge', merge_target_id: value })}
                        />
                      )}
                    </Space>
                  </Space>
                </Space>
              </List.Item>
            )}
          />
          <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>已选择 {selectedDiscoveredAssetKeys.length} 项，长期资产入库；误判同源合并；临时地点和过场元素只留审计。</Text>
            <Space size={6}>
              <Button size="small" disabled={isActionBusy} onClick={() => { setDiscoveredAssets([]); setSelectedDiscoveredAssetKeys([]); setAssetDispositionDrafts({}) }}>暂不处理</Button>
              <Button size="small" type="primary" loading={isActionLoading('apply_discovered_assets')} disabled={disabledForAction('apply_discovered_assets')} onClick={applySelectedDiscoveredAssets}>执行处置</Button>
            </Space>
          </Space>
        </Card>
        </div>
      )}

      {pendingStateUpdates.length > 0 && (
        <Card
          size="small"
          title={`待确认状态变更 ${pendingStateUpdates.length}`}
          extra={(
            <Space size={4}>
              <Button size="small" type="link" onClick={() => setSelectedStateUpdateKeys(pendingStateUpdates.map(item => item._key))}>全选</Button>
              <Button size="small" type="link" onClick={() => setSelectedStateUpdateKeys([])}>清空</Button>
            </Space>
          )}
        >
          <List
            size="small"
            dataSource={pendingStateUpdates}
            renderItem={(item: any) => (
              <List.Item>
                <Space align="start" style={{ width: '100%' }}>
                  <Checkbox
                    checked={selectedStateUpdateKeys.includes(item._key)}
                    onChange={event => setSelectedStateUpdateKeys(prev => event.target.checked ? [...prev, item._key] : prev.filter(key => key !== item._key))}
                  />
                  <Space direction="vertical" size={2} style={{ flex: 1 }}>
                    <Space size={4} wrap>
                      <Text strong>{item.name}</Text>
                      <Tag bordered={false}>{typeLabel(item.entity_type)}</Tag>
                      <Tag color="blue" bordered={false}>第{item.chapter_no}章</Tag>
                    </Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>当前：{displayValue(item.current_state || {}).slice(0, 120)}</Text>
                    <Text style={{ fontSize: 12 }}>变更：{displayValue(item.actual_state_change || {}).slice(0, 160)}</Text>
                    {item.reason && <Text type="secondary" style={{ fontSize: 12 }}>原因：{item.reason}</Text>}
                  </Space>
                </Space>
              </List.Item>
            )}
          />
          <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>已选择 {selectedStateUpdateKeys.length} 项</Text>
            <Space size={6}>
              <Button size="small" disabled={isActionBusy} onClick={() => { setPendingStateUpdates([]); setSelectedStateUpdateKeys([]) }}>暂不处理</Button>
              <Button size="small" type="primary" loading={isActionLoading('apply_state_updates')} disabled={disabledForAction('apply_state_updates')} onClick={applySelectedStateUpdates}>应用选中变更</Button>
            </Space>
          </Space>
        </Card>
      )}

      <Tabs
        activeKey={activeType}
        onChange={setActiveType}
        size="small"
        items={settingTypes.map(item => {
          const typeSettings = filterSettingsForUsage(settings, usageMap, item.value, activeUsageFilter)
          return {
            key: item.value,
            label: `${item.label}${grouped[item.value]?.length ? ` ${grouped[item.value].length}` : ''}`,
            children: typeSettings.length ? (
              <List
                className="setting-workshop-asset-list"
                size="small"
                dataSource={typeSettings}
                renderItem={(setting: any) => {
                  const current = usageFromMap(usageMap, setting)
                  const compactTags = buildCompactSettingTags(setting)
                  const usageType = normalizeUsageType(current)
                  return (
                    <List.Item>
                      <article className={`setting-workshop-asset-card setting-workshop-asset-${usageType}`}>
                        <header className="setting-workshop-asset-header">
                          <div className="setting-workshop-asset-titleblock">
                            <Space size={6} wrap>
                              <Text strong className="setting-workshop-asset-name">{setting.name}</Text>
                              <Tag bordered={false}>{typeLabel(setting.entity_type)}</Tag>
                              {setting.status && <Tag bordered={false}>{setting.status === 'active' ? '启用' : setting.status === 'retired' ? '退场' : '草稿'}</Tag>}
                              {setting.visibility && <Tag color={setting.visibility === 'spoiler' ? 'red' : setting.visibility === 'hidden' ? 'gold' : 'blue'} bordered={false}>{setting.visibility === 'public' ? '公开' : setting.visibility === 'hidden' ? '隐藏' : '剧透'}</Tag>}
                              {setting.first_chapter_no && <Tag bordered={false}>初登 第{setting.first_chapter_no}章</Tag>}
                              {setting.last_chapter_no && <Tag bordered={false}>末次 第{setting.last_chapter_no}章</Tag>}
                            </Space>
                            <Paragraph className="setting-workshop-asset-summary" ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}>
                              {setting.summary || '暂无摘要'}
                            </Paragraph>
                          </div>
                          <Space size={4} className="setting-workshop-asset-actions">
                            <Button size="small" type="link" onClick={() => openEditor(setting)}>编辑</Button>
                            <Button size="small" type="link" danger onClick={() => deleteSetting(setting)}>删除</Button>
                          </Space>
                        </header>

                        <div className="setting-workshop-asset-controls">
                          <div className="setting-workshop-control-row">
                            <Text type="secondary">用途</Text>
                            <Segmented
                              className="setting-workshop-usage-segment"
                              size="small"
                              value={usageType}
                              options={usageSegmentOptions}
                              onChange={value => updateUsage(setting, { usage_type: String(value) })}
                            />
                          </div>
                          <div className="setting-workshop-control-row">
                            <Text type="secondary">揭示</Text>
                            <Segmented
                              className="setting-workshop-reveal-segment"
                              size="small"
                              value={current.reveal_level || 'none'}
                              options={revealSegmentOptions}
                              onChange={value => updateUsage(setting, { reveal_level: String(value) })}
                            />
                          </div>
                        </div>

                        {compactTags.length > 0 && (
                          <div className="setting-workshop-asset-tags">
                            {compactTags.map(tag => (
                              <Tag key={`${tag.group}:${tag.label}`} color={tag.group === 'constraint' ? 'volcano' : 'geekblue'} bordered={false}>
                                {tag.label}
                              </Tag>
                            ))}
                          </div>
                        )}

                        <details className="setting-workshop-state-change">
                          <summary>本章状态变化</summary>
                          <Input.TextArea
                            size="small"
                            rows={2}
                            placeholder="例如：断臂神纹首次灼痛；某物品转移给迟正"
                            value={displayValue(current.expected_state_change || '')}
                            onChange={e => updateUsage(setting, { expected_state_change: e.target.value ? { note: e.target.value } : {} })}
                          />
                        </details>
                      </article>
                    </List.Item>
                  )
                }}
              />
            ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`${typeLabel(item.value)}没有命中「${activeUsageFilterLabel}」的设定`} />,
          }
        })}
      />

      <Modal
        open={editorOpen}
        title={editing?.id ? '编辑设定' : '新增设定'}
        onCancel={() => setEditorOpen(false)}
        onOk={submitSetting}
        width={720}
        okText="保存"
      >
        <Form form={form} layout="vertical">
          <Space style={{ width: '100%' }} align="start">
            <Form.Item name="entity_type" label="类型" rules={[{ required: true }]} style={{ width: 150 }}>
              <Select options={settingTypes} />
            </Form.Item>
            <Form.Item name="name" label="名称" rules={[{ required: true }]} style={{ width: 260 }}>
              <Input />
            </Form.Item>
            <Form.Item name="visibility" label="可见性" style={{ width: 120 }}>
              <Select options={[{ value: 'public', label: '公开' }, { value: 'hidden', label: '隐藏' }, { value: 'spoiler', label: '剧透' }]} />
            </Form.Item>
          </Space>
          <Form.Item name="summary" label="摘要">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Space style={{ width: '100%' }} align="start">
            <Form.Item name="first_chapter_no" label="首次章节" style={{ width: 130 }}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="last_chapter_no" label="末次章节" style={{ width: 130 }}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="status" label="状态" style={{ width: 130 }}>
              <Select options={[{ value: 'active', label: '启用' }, { value: 'retired', label: '已退场' }, { value: 'draft', label: '草稿' }]} />
            </Form.Item>
          </Space>
          <Form.Item name="aliases" label="别名 / 提及词">
            <Input.TextArea rows={2} placeholder={'每行一个，例如：断臂少年\n黑桑县弃子'} />
          </Form.Item>
          <Form.Item label="关键属性">
            <Form.List name="attribute_rows">
              {(fields, { add, remove }) => (
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  {fields.map(field => (
                    <Space key={field.key} align="start" style={{ width: '100%' }}>
                      <Form.Item {...field} name={[field.name, 'key']} style={{ width: 180, marginBottom: 0 }}>
                        <Input placeholder="属性名，例如：身份" />
                      </Form.Item>
                      <Form.Item {...field} name={[field.name, 'value']} style={{ flex: 1, marginBottom: 0 }}>
                        <Input placeholder="属性值，例如：黑桑县药童" />
                      </Form.Item>
                      <Button size="small" danger onClick={() => remove(field.name)}>删除</Button>
                    </Space>
                  ))}
                  <Button size="small" onClick={() => add({ key: '', value: '' })}>添加属性</Button>
                </Space>
              )}
            </Form.List>
          </Form.Item>
          <Form.Item label="硬性约束">
            <Form.List name="constraint_rows">
              {(fields, { add, remove }) => (
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  {fields.map(field => (
                    <Space key={field.key} align="start" style={{ width: '100%' }}>
                      <Form.Item {...field} name={[field.name, 'key']} style={{ width: 180, marginBottom: 0 }}>
                        <Input placeholder="约束项，例如：knowledge_scope" />
                      </Form.Item>
                      <Form.Item {...field} name={[field.name, 'value']} style={{ flex: 1, marginBottom: 0 }}>
                        <Input.TextArea rows={1} autoSize={{ minRows: 1, maxRows: 3 }} placeholder="约束内容；数组/对象可粘贴 JSON" />
                      </Form.Item>
                      <Button size="small" danger onClick={() => remove(field.name)}>删除</Button>
                    </Space>
                  ))}
                  <Button size="small" onClick={() => add({ key: '', value: '' })}>添加约束</Button>
                </Space>
              )}
            </Form.List>
          </Form.Item>
          <Form.Item label="当前状态">
            <Form.List name="state_rows">
              {(fields, { add, remove }) => (
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  {fields.map(field => (
                    <Space key={field.key} align="start" style={{ width: '100%' }}>
                      <Form.Item {...field} name={[field.name, 'key']} style={{ width: 180, marginBottom: 0 }}>
                        <Input placeholder="状态项，例如：owner" />
                      </Form.Item>
                      <Form.Item {...field} name={[field.name, 'value']} style={{ flex: 1, marginBottom: 0 }}>
                        <Input.TextArea rows={1} autoSize={{ minRows: 1, maxRows: 3 }} placeholder="状态值，例如：迟正；数组/对象可粘贴 JSON" />
                      </Form.Item>
                      <Button size="small" danger onClick={() => remove(field.name)}>删除</Button>
                    </Space>
                  ))}
                  <Button size="small" onClick={() => add({ key: '', value: '' })}>添加状态</Button>
                </Space>
              )}
            </Form.List>
          </Form.Item>
          <Form.Item name="source_note" label="来源备注">
            <Input.TextArea rows={2} placeholder="例如：来自第 12 章人工补充；从角色卡同步" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}
