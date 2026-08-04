import React, { useState } from 'react'
import { ReloadOutlined, SettingOutlined, WarningOutlined } from '@ant-design/icons'
import { Alert, Button, Segmented, Select, Space, Tag, Tooltip, message } from 'antd'
import {
  CHAPTER_SOURCE_UI_REQUEST_TIMEOUT_MS,
  chapterSourceApi,
  chapterSourceHttpFailureDetails,
  type ChapterGenerationSourceView,
} from '../../api/mcp'
import {
  authorityUnknownState,
  commitConfirmedSource,
  confirmedAuthorityState,
  formatChapterSourceFailure,
  isChapterSourceAuthorityUnknownError,
  isStaleChapterSourceOperationError,
  refreshChapterSourceAuthority,
  type ChapterSourceAuthorityState,
  type ChapterSourceOperationToken,
} from './chapterGenerationSourceModel'
import { McpGenerationSourceStatus } from './McpGenerationSourceStatus'

export const CHAPTER_SOURCE_AUTHORITY_UNKNOWN_MESSAGE = '章节来源权威状态暂时无法确认，请重新获取'
export const CHAPTER_SOURCE_BUSY_MESSAGE = '当前章节任务正在运行，结束后可切换来源'

type ChapterSourceApi = Pick<typeof chapterSourceApi, 'get' | 'activate' | 'saveModel'>

export type ChapterGenerationSourceActionDependencies = {
  projectId: number
  getAuthority: () => ChapterSourceAuthorityState
  selectedModelId?: number
  beginSourceOperation: () => ChapterSourceOperationToken
  assertSourceOperationCurrent: (token: ChapterSourceOperationToken) => void
  onAuthorityChange: (state: ChapterSourceAuthorityState) => void
  onSelectedModelConfirmed: (id: number) => void
  onOpenSettings: () => void
  onPendingChange?: (pending: boolean, token: ChapterSourceOperationToken) => void
  notifyError?: (text: string) => void
  api?: Partial<ChapterSourceApi>
}

function isExplicitMcpBindingFailure(error: unknown) {
  const code = chapterSourceHttpFailureDetails(error)?.code
  return code === 'MCP_BINDING_INVALID'
    || code === 'MCP_BINDING_INCOMPLETE'
    || code === 'MCP_BINDING_REQUIRED'
}

function assertThen(
  deps: ChapterGenerationSourceActionDependencies,
  token: ChapterSourceOperationToken,
  effect: () => void,
) {
  deps.assertSourceOperationCurrent(token)
  effect()
}

function beginCurrentOperation(deps: ChapterGenerationSourceActionDependencies) {
  try {
    return deps.beginSourceOperation()
  } catch (error) {
    if (isStaleChapterSourceOperationError(error)) return null
    throw error
  }
}

export function createChapterGenerationSourceActions(
  deps: ChapterGenerationSourceActionDependencies,
) {
  const api: ChapterSourceApi = {
    get: deps.api?.get || chapterSourceApi.get,
    activate: deps.api?.activate || chapterSourceApi.activate,
    saveModel: deps.api?.saveModel || chapterSourceApi.saveModel,
  }
  const notifyError = deps.notifyError || ((text: string) => message.error(text))

  const finishPending = (token: ChapterSourceOperationToken) => {
    try {
      assertThen(deps, token, () => deps.onPendingChange?.(false, token))
    } catch (error) {
      if (!isStaleChapterSourceOperationError(error)) throw error
    }
  }

  const commit = async (
    request: () => Promise<ChapterGenerationSourceView>,
  ) => {
    const current = deps.getAuthority()
    if (!current.source || current.authorityUnknown) return
    const operationProjectId = deps.projectId
    const token = beginCurrentOperation(deps)
    if (!token) return
    assertThen(deps, token, () => deps.onPendingChange?.(true, token))
    try {
      const result = await commitConfirmedSource({
        current: current.source,
        request,
        readAuthoritative: () => api.get(operationProjectId, { timeout: CHAPTER_SOURCE_UI_REQUEST_TIMEOUT_MS }),
        assertCurrent: () => deps.assertSourceOperationCurrent(token),
      })
      assertThen(deps, token, () => deps.onAuthorityChange(confirmedAuthorityState(result.source)))
      const modelId = result.source.source.model.model_id
      if (modelId !== undefined) {
        assertThen(deps, token, () => deps.onSelectedModelConfirmed(modelId))
      }
    } catch (error) {
      if (isStaleChapterSourceOperationError(error)) return
      try {
        deps.assertSourceOperationCurrent(token)
      } catch (staleError) {
        if (isStaleChapterSourceOperationError(staleError)) return
        throw staleError
      }
      if (isChapterSourceAuthorityUnknownError(error)) {
        assertThen(deps, token, () => deps.onAuthorityChange(authorityUnknownState(current.source!, error)))
        assertThen(deps, token, () => notifyError(CHAPTER_SOURCE_AUTHORITY_UNKNOWN_MESSAGE))
        return
      }
      deps.assertSourceOperationCurrent(token)
      const publicMessage = formatChapterSourceFailure(error)
      assertThen(deps, token, () => notifyError(publicMessage))
      if (isExplicitMcpBindingFailure(error)) {
        assertThen(deps, token, deps.onOpenSettings)
      }
    } finally {
      finishPending(token)
    }
  }

  return {
    activate(active: 'model' | 'mcp') {
      return commit(() => api.activate(deps.projectId, active, { timeout: CHAPTER_SOURCE_UI_REQUEST_TIMEOUT_MS }))
    },
    saveModel(modelId: number) {
      if (!Number.isSafeInteger(modelId) || modelId <= 0) return Promise.resolve()
      return commit(() => api.saveModel(deps.projectId, modelId, { timeout: CHAPTER_SOURCE_UI_REQUEST_TIMEOUT_MS }))
    },
    async refresh() {
      const current = deps.getAuthority()
      if (!current.source || !current.authorityUnknown) return
      const operationProjectId = deps.projectId
      const token = beginCurrentOperation(deps)
      if (!token) return
      assertThen(deps, token, () => deps.onPendingChange?.(true, token))
      try {
        const result = await refreshChapterSourceAuthority({
          current,
          readAuthoritative: () => api.get(operationProjectId, { timeout: CHAPTER_SOURCE_UI_REQUEST_TIMEOUT_MS }),
          assertCurrent: () => deps.assertSourceOperationCurrent(token),
        })
        deps.assertSourceOperationCurrent(token)
        if (result.readError) return
        assertThen(deps, token, () => deps.onAuthorityChange(result.state))
        const modelId = result.state.source?.source.model.model_id
        if (modelId !== undefined) {
          assertThen(deps, token, () => deps.onSelectedModelConfirmed(modelId))
        }
      } catch (error) {
        if (!isStaleChapterSourceOperationError(error)) throw error
      } finally {
        finishPending(token)
      }
    },
  }
}

export function chapterSourceControlAvailability({
  authority,
  locallyBusy,
  pending,
}: {
  authority: ChapterSourceAuthorityState
  locallyBusy: boolean
  pending: boolean
}) {
  if (authority.authorityUnknown) {
    return { disabled: true, reason: CHAPTER_SOURCE_AUTHORITY_UNKNOWN_MESSAGE }
  }
  if (!authority.source) {
    return { disabled: true, reason: '章节来源加载失败，请重新加载项目' }
  }
  if (authority.source.locked || locallyBusy || pending) {
    return { disabled: true, reason: CHAPTER_SOURCE_BUSY_MESSAGE }
  }
  return { disabled: false, reason: '' }
}

export type ChapterGenerationSourceControlProps = {
  projectId: number
  authority: ChapterSourceAuthorityState
  modelOptions: Array<{ value: number; label: React.ReactNode }>
  selectedModelId?: number
  compact: boolean
  locallyBusy: boolean
  beginSourceOperation: () => ChapterSourceOperationToken
  assertSourceOperationCurrent: (token: ChapterSourceOperationToken) => void
  onAuthorityChange: (state: ChapterSourceAuthorityState) => void
  onSelectedModelConfirmed: (id: number) => void
  onOpenSettings: () => void
  pending?: boolean
  onPendingChange?: (pending: boolean, token: ChapterSourceOperationToken) => void
}

export function ChapterGenerationSourceControl({
  projectId,
  authority,
  modelOptions,
  selectedModelId,
  compact,
  locallyBusy,
  beginSourceOperation,
  assertSourceOperationCurrent,
  onAuthorityChange,
  onSelectedModelConfirmed,
  onOpenSettings,
  pending: controlledPending,
  onPendingChange,
}: ChapterGenerationSourceControlProps) {
  const [localPending, setLocalPending] = useState<{ projectId: number; pending: boolean }>({
    projectId,
    pending: false,
  })
  const pending = controlledPending ?? (localPending.projectId === projectId && localPending.pending)
  const source = authority.source
  const active = source?.source.active
  const availability = chapterSourceControlAvailability({ authority, locallyBusy, pending })
  const actions = createChapterGenerationSourceActions({
    projectId,
    getAuthority: () => authority,
    selectedModelId,
    beginSourceOperation,
    assertSourceOperationCurrent,
    onAuthorityChange,
    onSelectedModelConfirmed,
    onOpenSettings,
    onPendingChange: (nextPending, token) => {
      if (onPendingChange) onPendingChange(nextPending, token)
      else setLocalPending({ projectId, pending: nextPending })
    },
  })
  const modelDisabled = availability.disabled || active === 'mcp'
  const modelDisabledReason = active === 'mcp'
    ? '章节生产链当前由 MCP Agent 执行'
    : availability.reason

  const modelDetail = (isActive: boolean) => (
    <div className={`novel-chapter-source-detail ${isActive ? 'is-active' : 'is-inactive'}`}>
      <Space size={6}>
        <Tag color={isActive ? 'blue' : 'default'} bordered={false}>
          模型 API · {isActive ? '已启用' : '已停用'}
        </Tag>
        <Tooltip title={modelDisabledReason}>
          <span title={modelDisabledReason || undefined}>
            <Select
              className="novel-chapter-source-model novel-workspace-model-select"
              size="small"
              value={source?.source.model.model_id}
              onChange={value => { void actions.saveModel(Number(value)) }}
              options={modelOptions}
              popupMatchSelectWidth={440}
              placeholder="选择模型"
              disabled={modelDisabled || !isActive}
            />
          </span>
        </Tooltip>
      </Space>
    </div>
  )

  const mcpDetail = (isActive: boolean) => source?.source.mcp ? (
    <div className={`novel-chapter-source-detail ${isActive ? 'is-active' : 'is-inactive'}`}>
      <McpGenerationSourceStatus
        projectId={projectId}
        binding={source.source.mcp}
        active={isActive}
        compact={compact}
        disabled={availability.disabled}
        onOpenSettings={onOpenSettings}
      />
    </div>
  ) : (
    <div className={`novel-chapter-source-detail ${isActive ? 'is-active' : 'is-inactive'}`}>
      <Button size="small" icon={<SettingOutlined />} disabled={availability.disabled} onClick={onOpenSettings}>
        MCP Agent · 未配置{isActive ? '' : ' · 已停用'}
      </Button>
    </div>
  )

  return (
    <div
      className={`novel-chapter-source-control${compact ? ' is-compact' : ''}${availability.disabled ? ' is-busy' : ''}`}
      data-active-source={active || 'unknown'}
    >
      <Tooltip title={availability.reason}>
        <Segmented
          size="small"
          value={active}
          disabled={availability.disabled}
          options={[
            { value: 'model', label: 'API' },
            { value: 'mcp', label: 'MCP' },
          ]}
          onChange={value => { void actions.activate(value as 'model' | 'mcp') }}
        />
      </Tooltip>
      {source ? (
        <div className="novel-chapter-source-details">
          {active === 'model' ? modelDetail(true) : mcpDetail(true)}
          {!compact && (active === 'model' ? mcpDetail(false) : modelDetail(false))}
        </div>
      ) : (
        <Alert type="warning" showIcon icon={<WarningOutlined />} message="章节来源加载失败，请重新加载项目" />
      )}
      {authority.authorityUnknown && (
        <Alert
          type="warning"
          showIcon
          message={CHAPTER_SOURCE_AUTHORITY_UNKNOWN_MESSAGE}
          action={(
            <Button
              size="small"
              icon={<ReloadOutlined />}
              loading={pending}
              disabled={pending}
              onClick={() => { void actions.refresh() }}
            >
              重新获取
            </Button>
          )}
        />
      )}
    </div>
  )
}
