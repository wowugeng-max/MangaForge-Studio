import React, { useEffect, useState } from 'react'
import { Button, InputNumber, Modal, Space, Typography, message } from 'antd'
import apiClient from '../../api/client'

const { Text } = Typography
const MIN_TIMEOUT_SECONDS = 60
const MAX_TIMEOUT_SECONDS = 600
const DEFAULT_TIMEOUT_SECONDS = 600

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

export function buildEditorRevisionConfigPayload(value: unknown) {
  if (!isEditorRevisionTimeoutValid(value)) throw new Error('invalid editor revision timeout')
  return { config: { timeout_seconds: value } }
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
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !projectId) return
    let active = true
    setTimeoutSeconds(DEFAULT_TIMEOUT_SECONDS)
    setLoading(true)
    apiClient.get(`/novel/projects/${projectId}/editor-revision-config`)
      .then(response => {
        if (active) {
          setTimeoutSeconds(normalizeProjectEditorRevisionTimeout(
            response.data?.config?.timeout_seconds,
          ))
        }
      })
      .catch(error => {
        if (active) message.error(error?.response?.data?.error || '项目设置加载失败')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [open, projectId])

  const save = async () => {
    if (!isEditorRevisionTimeoutValid(timeoutSeconds)) return
    setSaving(true)
    try {
      await apiClient.put(
        `/novel/projects/${projectId}/editor-revision-config`,
        buildEditorRevisionConfigPayload(timeoutSeconds),
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
          disabled={loading || !isEditorRevisionTimeoutValid(timeoutSeconds)}
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
            disabled={loading}
          />
        </Space>
        <Text type="secondary">
          每个模型阶段最多等待该时长；一次修订包含多个阶段，总耗时可能更长。
        </Text>
      </Space>
    </Modal>
  )
}
