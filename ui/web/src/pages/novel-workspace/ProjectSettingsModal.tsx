import React, { useEffect, useState } from 'react'
import { Button, Divider, InputNumber, Modal, Select, Space, Switch, Typography, message } from 'antd'
import apiClient from '../../api/client'
import { McpGenerationSourcePanel } from './McpGenerationSourcePanel'
import { ChapterGenerationSourceControl } from './ChapterGenerationSourceControl'
import type {
  ChapterSourceAuthorityState,
  ChapterSourceOperationToken,
} from './chapterGenerationSourceModel'
import {
  DEFAULT_FICTION_HUMANIZER_MODE,
  DEFAULT_WRITING_SKILLS_ENABLED,
  WRITING_SKILL_CATALOG,
  normalizeWritingSkillsModelId,
  resolveWritingSkillsEnabled,
  writingSkillsSettingsPayload,
  type FictionHumanizerMode,
  type WritingSkillEnabledMap,
} from './writingSkillsModel'

const { Text } = Typography
const MIN_TIMEOUT_SECONDS = 60
const MAX_TIMEOUT_SECONDS = 600
const DEFAULT_TIMEOUT_SECONDS = 600
const MIN_STORY_STATE_MAX_TOKENS = 1000
const MAX_STORY_STATE_MAX_TOKENS = 262144
const DEFAULT_STORY_STATE_MAX_TOKENS = 9000

export function normalizeProjectEditorRevisionTimeout(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_TIMEOUT_SECONDS
  return Math.min(MAX_TIMEOUT_SECONDS, Math.max(MIN_TIMEOUT_SECONDS, Math.trunc(value)))
}

export function isEditorRevisionTimeoutValid(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value >= MIN_TIMEOUT_SECONDS
    && value <= MAX_TIMEOUT_SECONDS
}

export function normalizeProjectStoryStateMaxTokens(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_STORY_STATE_MAX_TOKENS
  return Math.min(MAX_STORY_STATE_MAX_TOKENS, Math.max(MIN_STORY_STATE_MAX_TOKENS, Math.trunc(value)))
}

export function isStoryStateMaxTokensValid(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value >= MIN_STORY_STATE_MAX_TOKENS
    && value <= MAX_STORY_STATE_MAX_TOKENS
}

export function buildEditorRevisionConfigPayload(timeoutSeconds: unknown, storyStateMaxTokens: unknown) {
  if (!isEditorRevisionTimeoutValid(timeoutSeconds)) throw new Error('invalid editor revision timeout')
  if (!isStoryStateMaxTokensValid(storyStateMaxTokens)) throw new Error('invalid story state max tokens')
  return {
    config: {
      timeout_seconds: timeoutSeconds,
      story_state_max_tokens: storyStateMaxTokens,
    },
  }
}

export function ProjectSettingsModal({
  open,
  projectId,
  onClose,
  authority,
  modelOptions,
  selectedModelId,
  locallyBusy,
  beginSourceOperation,
  assertSourceOperationCurrent,
  onAuthorityChange,
  onSelectedModelConfirmed,
  sourcePending,
  onSourcePendingChange,
  onWritingSkillsSaved,
}: {
  open: boolean
  projectId: number
  onClose: () => void
  authority: ChapterSourceAuthorityState
  modelOptions: Array<{ value: number; label: React.ReactNode }>
  selectedModelId?: number
  locallyBusy: boolean
  beginSourceOperation: () => ChapterSourceOperationToken
  assertSourceOperationCurrent: (token: ChapterSourceOperationToken) => void
  onAuthorityChange: (state: ChapterSourceAuthorityState) => void
  onSelectedModelConfirmed: (id: number) => void
  sourcePending: boolean
  onSourcePendingChange: (pending: boolean, token: ChapterSourceOperationToken) => void
  onWritingSkillsSaved?: (next: {
    enabled: WritingSkillEnabledMap
    fiction_humanizer_mode: FictionHumanizerMode
  }) => void
}) {
  const [timeoutSeconds, setTimeoutSeconds] = useState<number | null>(DEFAULT_TIMEOUT_SECONDS)
  const [storyStateMaxTokens, setStoryStateMaxTokens] = useState<number | null>(DEFAULT_STORY_STATE_MAX_TOKENS)
  const [writingSkillsEnabled, setWritingSkillsEnabled] = useState<WritingSkillEnabledMap>(DEFAULT_WRITING_SKILLS_ENABLED)
  const [fictionHumanizerMode, setFictionHumanizerMode] = useState<FictionHumanizerMode>(DEFAULT_FICTION_HUMANIZER_MODE)
  const [writingSkillsModelId, setWritingSkillsModelId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !projectId) return
    let active = true
    setTimeoutSeconds(DEFAULT_TIMEOUT_SECONDS)
    setStoryStateMaxTokens(DEFAULT_STORY_STATE_MAX_TOKENS)
    setWritingSkillsEnabled(DEFAULT_WRITING_SKILLS_ENABLED)
    setFictionHumanizerMode(DEFAULT_FICTION_HUMANIZER_MODE)
    setWritingSkillsModelId(null)
    setLoadFailed(false)
    setLoading(true)
    Promise.all([
      apiClient.get(`/novel/projects/${projectId}/editor-revision-config`),
      apiClient.get(`/novel/projects/${projectId}/writing-skills-config`),
    ])
      .then(([revision, skills]) => {
        if (active) {
          setTimeoutSeconds(normalizeProjectEditorRevisionTimeout(
            revision.data?.config?.timeout_seconds,
          ))
          setStoryStateMaxTokens(normalizeProjectStoryStateMaxTokens(
            revision.data?.config?.story_state_max_tokens,
          ))
          const resolvedWritingSkills = resolveWritingSkillsEnabled({
            override: skills.data?.config,
          })
          setWritingSkillsEnabled(resolvedWritingSkills.enabled)
          setFictionHumanizerMode(resolvedWritingSkills.fiction_humanizer_mode)
          setWritingSkillsModelId(normalizeWritingSkillsModelId(skills.data?.config?.model_id))
        }
      })
      .catch(error => {
        if (active) {
          setLoadFailed(true)
          message.error(error?.response?.data?.error || '项目设置加载失败')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [open, projectId])

  const save = async () => {
    if (
      loadFailed
      || !isEditorRevisionTimeoutValid(timeoutSeconds)
      || !isStoryStateMaxTokensValid(storyStateMaxTokens)
    ) return
    setSaving(true)
    const writingSkillsConfig = writingSkillsSettingsPayload(
      writingSkillsEnabled,
      fictionHumanizerMode,
      writingSkillsModelId,
    )
    try {
      await Promise.all([
        apiClient.put(
          `/novel/projects/${projectId}/editor-revision-config`,
          buildEditorRevisionConfigPayload(timeoutSeconds, storyStateMaxTokens),
        ),
        apiClient.put(
          `/novel/projects/${projectId}/writing-skills-config`,
          writingSkillsConfig,
        ),
      ])
      onWritingSkillsSaved?.(writingSkillsConfig)
      message.success('项目设置已保存')
      onClose()
    } catch (error: any) {
      message.error(error?.response?.data?.error || '项目设置保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="项目设置"
      open={open}
      onCancel={onClose}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button
          key="save"
          type="primary"
          loading={saving}
          disabled={loading || loadFailed || !isEditorRevisionTimeoutValid(timeoutSeconds) || !isStoryStateMaxTokensValid(storyStateMaxTokens)}
          onClick={save}
        >
          保存
        </Button>,
      ]}
      width={900}
    >
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Text strong>当前章节来源</Text>
        <ChapterGenerationSourceControl
          projectId={projectId}
          authority={authority}
          modelOptions={modelOptions}
          selectedModelId={selectedModelId}
          compact={false}
          locallyBusy={locallyBusy}
          beginSourceOperation={beginSourceOperation}
          assertSourceOperationCurrent={assertSourceOperationCurrent}
          onAuthorityChange={onAuthorityChange}
          onSelectedModelConfirmed={onSelectedModelConfirmed}
          onOpenSettings={() => {}}
          pending={sourcePending}
          onPendingChange={onSourcePendingChange}
        />
      </Space>
      <Divider />
      <Text strong>MCP 绑定配置</Text>
      <McpGenerationSourcePanel
        open={open}
        projectId={projectId}
        authority={authority}
        locallyBusy={locallyBusy}
        beginSourceOperation={beginSourceOperation}
        assertSourceOperationCurrent={assertSourceOperationCurrent}
        onAuthorityChange={onAuthorityChange}
        pending={sourcePending}
        onPendingChange={onSourcePendingChange}
      />
      <Divider />
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Text strong>质检与修订</Text>
        <Space align="center" wrap>
          <Text>单次模型调用超时</Text>
          <InputNumber
            aria-label="单次模型调用超时"
            min={60}
            max={600}
            precision={0}
            value={timeoutSeconds}
            onChange={value => setTimeoutSeconds(value)}
            addonAfter="秒"
            disabled={loading || loadFailed}
          />
        </Space>
        <Text type="secondary">
          每个模型阶段最多等待该时长；一次修订包含多个阶段，总耗时可能更长。
        </Text>
        <Space align="center" wrap>
          <Text>故事状态输出上限</Text>
          <InputNumber
            aria-label="故事状态输出上限"
            min={1000}
            max={262144}
            step={512}
            precision={0}
            value={storyStateMaxTokens}
            onChange={value => setStoryStateMaxTokens(value)}
            addonAfter="token"
            disabled={loading || loadFailed}
          />
        </Space>
        {storyStateMaxTokens !== null && storyStateMaxTokens > 64_000 && (
          <Text type="warning">较高预算可能增加调用耗时与成本。</Text>
        )}
        <Text type="secondary">
          只控制修订后当前章故事状态同步的单次模型输出预算，不控制正文长度，也不会扩展到全部章节。
        </Text>
      </Space>
      <Divider />
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Text strong>去 AI 味写作 skill</Text>
        <Text type="secondary">
          项目默认。生成时可在写作条临时覆盖；修订只读这里。
        </Text>
        {WRITING_SKILL_CATALOG.map(skill => (
          <Space key={skill.id} align="start">
            <Switch
              checked={writingSkillsEnabled[skill.id]}
              aria-label={skill.label}
              disabled={loading || loadFailed}
              onChange={checked => setWritingSkillsEnabled(current => ({
                ...current,
                [skill.id]: checked,
              }))}
            />
            {skill.id === 'fiction-humanizer-zh' && (
              <Select
                aria-label="小说去AI味档位"
                value={fictionHumanizerMode}
                options={[
                  { value: 'polish', label: '精修' },
                  { value: 'rewrite', label: '重写' },
                ]}
                disabled={!writingSkillsEnabled['fiction-humanizer-zh'] || loading || loadFailed}
                onChange={setFictionHumanizerMode}
                style={{ width: 88 }}
              />
            )}
            <Space direction="vertical" size={0}>
              <Text>{skill.label}</Text>
              <Text type="secondary">{skill.description}</Text>
            </Space>
          </Space>
        ))}
        <Space align="center" wrap>
          <Text>写作skill模型</Text>
          <Select
            aria-label="写作skill模型"
            value={writingSkillsModelId}
            options={[
              { value: null as number | null, label: '跟随项目模型' },
              ...modelOptions,
            ]}
            disabled={loading || loadFailed}
            onChange={value => setWritingSkillsModelId(value ?? null)}
            style={{ width: 220 }}
          />
        </Space>
        <Text type="secondary">
          所有写作 skill 轮次共用该模型；跟随项目模型时使用修订阶段/项目首选模型。
        </Text>
      </Space>
    </Modal>
  )
}
