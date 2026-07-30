import React, { useEffect, useState } from 'react'
import { Button, InputNumber, Modal, Space, Typography, message } from 'antd'
import apiClient from '../../api/client'

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
}: {
  open: boolean
  projectId: number
  onClose: () => void
}) {
  const [timeoutSeconds, setTimeoutSeconds] = useState<number | null>(DEFAULT_TIMEOUT_SECONDS)
  const [storyStateMaxTokens, setStoryStateMaxTokens] = useState<number | null>(DEFAULT_STORY_STATE_MAX_TOKENS)
  const [loading, setLoading] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !projectId) return
    let active = true
    setTimeoutSeconds(DEFAULT_TIMEOUT_SECONDS)
    setStoryStateMaxTokens(DEFAULT_STORY_STATE_MAX_TOKENS)
    setLoadFailed(false)
    setLoading(true)
    apiClient.get(`/novel/projects/${projectId}/editor-revision-config`)
      .then(response => {
        if (active) {
          setTimeoutSeconds(normalizeProjectEditorRevisionTimeout(
            response.data?.config?.timeout_seconds,
          ))
          setStoryStateMaxTokens(normalizeProjectStoryStateMaxTokens(
            response.data?.config?.story_state_max_tokens,
          ))
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
    try {
      await apiClient.put(
        `/novel/projects/${projectId}/editor-revision-config`,
        buildEditorRevisionConfigPayload(timeoutSeconds, storyStateMaxTokens),
      )
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
    >
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
    </Modal>
  )
}
