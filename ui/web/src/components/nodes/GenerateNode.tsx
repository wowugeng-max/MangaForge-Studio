import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Position, type NodeProps, type ReactFlowState, useReactFlow, useStore, useUpdateNodeInternals } from 'reactflow'
import { useParams } from 'react-router-dom'
import { Button, Checkbox, Collapse, Input, InputNumber, Segmented, Select, Space, Spin, Switch, Tag, Tooltip, Typography, message, Slider } from 'antd'
import { DownOutlined, PlayCircleOutlined, SaveOutlined, StopOutlined, StarFilled } from '@ant-design/icons'
import apiClient from '../../api/client'
import {
  compileSkillPreview,
  installSkillPack,
  listSkills,
  readSkillSettings,
  type CanvasSkillApiError,
  type CanvasSkillCompileResult,
  type CanvasSkillMediaMode,
  type CanvasSkillSettings,
  type CanvasSkillSummary,
} from '../../api/skills'
import { nodeRegistry } from '../../utils/nodeRegistry'
import { createSSEClient, type SSEClient, type SSEMessage } from '../../utils/sse'
import { useCanvasStore } from '../../stores/canvasStore'
import { useAssetLibraryStore } from '../../stores/assetLibraryStore'
import CameraControl, { buildCameraPromptSuffix } from '../CameraControl'
import CameraMovement from '../CameraMovement'
import { ASPECT_RATIOS as SHARED_ASPECT_RATIOS, getAspectRatioSize, type AspectRatioValue } from '../AspectRatioSelector'
import { BaseNode } from './BaseNode'
import { TypedHandle } from './TypedHandle'
import { NodeConfigToolbar } from './NodeConfigToolbar'
import { expandFissionAndDistribute } from '../../pages/canvasFission'
import { pickMediaResultContent } from '../../utils/mediaResult'
import { buildAssetMediaUrl } from '../../utils/assetMedia'

import {
  DEFAULT_ROLE,
  GENERATE_NODE_ASPECT_RATIO_OPTIONS,
  GENERATE_NODE_REFERENCE_ROLE_OPTIONS,
  GENERATE_NODE_ROUTING_STRATEGY_OPTIONS,
  GENERATE_NODE_SKILL_TARGET_MODE_OPTIONS,
  MODES,
  PRESET_ROLES,
  areGenerateNodeIncomingContextSnapshotsEqual,
  buildGenerateNodeAssetPayload,
  buildGenerateNodeCanonicalReferenceBindings,
  buildGenerateNodeCompilerSelectorModel,
  buildGenerateNodeReferenceBindingsFingerprint,
  buildGenerateNodeReferenceBindingsLocalFingerprint,
  buildGenerateNodeIncomingContextSnapshot,
  buildGenerateNodeReferencePersistencePayload,
  buildGenerateNodeRequestPayload,
  buildGenerateNodeResultWithFission,
  buildGenerateNodeSkillCompileAssets,
  buildGenerateNodeSkillCompileRequest,
  buildGenerateNodeSkillIdentity,
  beginGenerateNodeSkillReadyListRequest,
  cancelGenerateNodeChatSkillRun,
  completeGenerateNodeRunAfterEffects,
  createGenerateNodePreviewRequestTracker,
  createGenerateNodeRunTracker,
  createGenerateNodeSkillListRequestCoordinator,
  freezeGenerateNodeExecutionReferences,
  getGenerateNodeAspectRatioSize,
  isGenerateNodeCompilerModelEligible,
  isGenerateNodeMuted,
  normalizeGenerateNodeCommandSkillArgumentsByCommand,
  normalizeGenerateNodeCompilerModelId,
  normalizeGenerateNodeImageUrl,
  normalizeGenerateNodeSkillCompileAudit,
  normalizeGenerateNodeSkillTargetMode,
  parseGenerateNodeExecutionCompatibilityError,
  parseCanvasSkillCommand,
  normalizeSelectOptions,
  pickQuickParams,
  reconcileGenerateNodeReferenceBindings,
  reorderGenerateNodeReferenceBindings,
  resolveGenerateNodeSkillSelection,
  resolveGenerateNodeSkillArguments,
  resolveGenerateNodeSkillCompileMode,
  resolveGenerateNodeSkillInstallApplication,
  resolveGenerateNodeSkillInstallOutcome,
  resolveGenerateNodeSkillTargetTransition,
  filterGenerateNodeCompatibleSkills,
  resolveGenerateNodeExecutionBlockState,
  resolveGenerateNodeEffectiveCompilerReferenceBindings,
  resolveGenerateNodeEffectiveReferenceValidationError,
  resolveGenerateNodeInitialRunStatus,
  resolveGenerateNodeCompilerModelIdForSource,
  resolveGenerateNodePreviewMediaSrc,
  resolveGenerateNodeResultReferenceBindings,
  resolveGenerateNodeChatSkillPreviewCached,
  resolveGenerateNodeSourceAssetIds,
  resolveGenerateNodeSourceContent,
  runGenerateNodeChatSkillCompilation,
  settleGenerateNodeChatSkillRun,
  settleGenerateNodeSkillReadyListRequest,
  shouldFilterGenerateNodeCompilerImages,
  shouldInvalidateGenerateNodeInitialCompileAudit,
  updateGenerateNodeReferenceBindingRole,
} from './generate-node-model'
import type {
  GenerateNodeCommandSkillArgumentsByCommand,
  GenerateNodeExecutionCompatibilityError,
  GenerateNodeReferenceBinding,
  GenerateNodeReferenceRole,
  GenerateNodeReferenceValidationState,
  GenerateNodeRunToken,
  GenerateNodeSkillTargetMode,
  GenerateNodeSkillTargetTransitionOrigin,
} from './generate-node-model'

export {
  GENERATE_NODE_ASPECT_RATIO_OPTIONS,
  GENERATE_NODE_REFERENCE_ROLE_OPTIONS,
  GENERATE_NODE_ROUTING_STRATEGY_OPTIONS,
  GENERATE_NODE_SKILL_TARGET_MODE_OPTIONS,
  GenerateNodeReferenceError,
  MAX_GENERATE_NODE_REFERENCE_IMAGES,
  getGenerateNodeAspectRatioSize,
  normalizeGenerateNodeImageUrl,
  parseCanvasSkillCommand,
  normalizeSelectOptions,
  pickQuickParams,
  resolveGenerateNodePreviewMediaSrc,
  resolveGenerateNodeSourceContent,
  resolveGenerateNodeSourceAssetIds,
  isGenerateNodeMuted,
  buildGenerateNodeAssetPayload,
  buildGenerateNodeCanonicalReferenceBindings,
  normalizeGenerateNodeGenerationPacket,
  buildGenerateNodeResultWithFission,
  buildGenerateNodeRequestPayload,
  buildGenerateNodeIncomingContextSnapshot,
  buildGenerateNodeReferencePayload,
  buildGenerateNodeReferenceBindingsFingerprint,
  buildGenerateNodeReferenceBindingsLocalFingerprint,
  buildGenerateNodeReferencePersistencePayload,
  buildGenerateNodeSkillCompileAssets,
  buildGenerateNodeSkillCompileRequest,
  buildGenerateNodeSkillIdentity,
  beginGenerateNodeSkillReadyListRequest,
  cancelGenerateNodeChatSkillRun,
  completeGenerateNodeRunAfterEffects,
  createGenerateNodePreviewRequestTracker,
  createGenerateNodeRunTracker,
  createGenerateNodeSkillListRequestCoordinator,
  freezeGenerateNodeExecutionReferences,
  areGenerateNodeIncomingContextSnapshotsEqual,
  normalizeGenerateNodeCommandSkillArgumentsByCommand,
  normalizeGenerateNodeCompilerModelId,
  normalizeGenerateNodeSkillCompileAudit,
  normalizeGenerateNodeSkillTargetMode,
  normalizeGenerateNodeReferenceBindings,
  parseGenerateNodeExecutionCompatibilityError,
  reconcileGenerateNodeReferenceBindings,
  reorderGenerateNodeReferenceBindings,
  resolveGenerateNodeExecutionBlockState,
  resolveGenerateNodeEffectiveCompilerReferenceBindings,
  resolveGenerateNodeEffectiveReferenceValidationError,
  resolveGenerateNodeInitialRunStatus,
  resolveGenerateNodeSkillSelection,
  resolveGenerateNodeSkillArguments,
  resolveGenerateNodeSkillCompileMode,
  resolveGenerateNodeSkillInstallApplication,
  resolveGenerateNodeSkillInstallOutcome,
  resolveGenerateNodeSkillTargetTransition,
  filterGenerateNodeCompatibleSkills,
  resolveGenerateNodeResultReferenceBindings,
  resolveGenerateNodeChatSkillPreviewCached,
  runGenerateNodeChatSkillCompilation,
  settleGenerateNodeChatSkillRun,
  settleGenerateNodeSkillReadyListRequest,
  shouldInvalidateGenerateNodeInitialCompileAudit,
  updateGenerateNodeReferenceBindingRole,
  validateGenerateNodeReferenceBindingsForExecution,
} from './generate-node-model'
export type {
  GenerateNodeCommandSkillArgumentsByCommand,
  GenerateNodeExecutionCompatibilityError,
  GenerateNodeIncomingAsset,
  GenerateNodeReferenceBinding,
  GenerateNodeReferenceErrorCode,
  GenerateNodeReferenceRole,
  GenerateNodeReferenceType,
  GenerateNodeReferenceValidationState,
  GenerateNodeRunToken,
  GenerateNodeSkillIdentity,
  GenerateNodeSkillInstallOutcome,
  GenerateNodeSkillListRequestChannel,
  GenerateNodeSkillListRequestToken,
  GenerateNodeSkillSelectionError,
  GenerateNodeSkillTargetMode,
  GenerateNodeSkillTargetTransitionOrigin,
  GenerateNodeUnresolvedReferenceSource,
} from './generate-node-model'

const { TextArea } = Input
const { Text } = Typography

const SKILL_MEDIA_MODES = new Set(['chat', 'text_to_image', 'image_to_image', 'text_to_video', 'image_to_video'])
const SKILL_AUDIT_KEYS = [
  'skill_pack_id', 'skill_pack_source', 'skill_name', 'skill_revision',
  'compiled_prompt', 'compiled_negative_prompt', 'compiled_references',
  'compiled_input_hash', 'warnings', 'compiler_model_id', 'raw_prompt',
  'reference_mode_hint', 'skill_preview_cached',
]

function withoutSkillAudit(value: any) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  const next = { ...value }
  SKILL_AUDIT_KEYS.forEach(key => delete next[key])
  return next
}

function generateNodeReferenceValidationFromError(error: unknown): GenerateNodeReferenceValidationState {
  const value = error as any
  return {
    error_code: String(value?.code || 'REFERENCE_ASSET_INVALID') as GenerateNodeReferenceValidationState['error_code'],
    detail: String(value?.message || '参考素材校验失败'),
    ...(value?.reference_index === undefined ? {} : { reference_index: Number(value.reference_index) }),
    ...(value?.reference_type === undefined ? {} : { reference_type: value.reference_type }),
  }
}

export function subscribeToGenerateNodeExternalError(nodeId: string, onExternalError: () => void) {
  return useCanvasStore.subscribe((state, previousState) => {
    if (
      state.nodeRunStatus[nodeId] !== 'error'
      || previousState.nodeRunStatus[nodeId] === 'error'
    ) return
    onExternalError()
  })
}

function GenerateNodeImpl(props: NodeProps) {
  const { id, data } = props
  const initialCompileAudit = data?.result && typeof data.result === 'object' ? data.result : data || {}
  const { id: routeProjectId } = useParams<{ id: string }>()
  const updateNodeData = useCanvasStore(s => s.updateNodeData)
  const setNodeStatus = useCanvasStore(s => s.setNodeStatus)
  const isMuted = useCanvasStore(s => isGenerateNodeMuted(s.nodes as any, id))
  const { getEdges, setNodes } = useReactFlow()
  const updateNodeInternals = useUpdateNodeInternals()
  const incomingContextSelector = useCallback((state: ReactFlowState) => buildGenerateNodeIncomingContextSnapshot({
    nodeId: id,
    edges: state.edges,
    nodes: Array.from(state.nodeInternals.values()),
  }), [id])
  const incomingContext = useStore(
    incomingContextSelector,
    areGenerateNodeIncomingContextSnapshotsEqual,
  )

  const assets = useAssetLibraryStore(s => s.assets)
  const fetchAssets = useAssetLibraryStore(s => s.fetchAssets)
  const [keys, setKeys] = useState<any[]>([])
  const [allModels, setAllModels] = useState<any[]>([])
  const [modelLoading, setModelLoading] = useState(false)
  const [mode, setMode] = useState(data?.mode || 'chat')
  const [skillTargetMode, setSkillTargetMode] = useState<GenerateNodeSkillTargetMode>(() => (
    normalizeGenerateNodeSkillTargetMode(data?.skillTargetMode ?? data?.skill_target_mode)
  ))
  const [prompt, setPrompt] = useState(data?.prompt || '')
  const [systemPrompt, setSystemPrompt] = useState(data?.systemPrompt || '')
  const [selectedKey, setSelectedKey] = useState<number | null>(Number(data?.api_key_id ?? data?.keyId) || null)
  const [selectedModel, setSelectedModel] = useState(data?.model_name || data?.model || '')
  const [params, setParams] = useState<Record<string, any>>(data?.params || {})
  const [routingStrategy, setRoutingStrategy] = useState(data?.routing_strategy || data?.routingStrategy || 'balanced')
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(Boolean(data?.showOnlyFavorites ?? true))
  const [aspectRatio, setAspectRatio] = useState<AspectRatioValue>((data?.aspectRatio ?? '16:9') as AspectRatioValue)
  const [customWidth, setCustomWidth] = useState<number>(data?.customWidth || 1920)
  const [customHeight, setCustomHeight] = useState<number>(data?.customHeight || 1080)
  const [useRoleAsset, setUseRoleAsset] = useState(Boolean(data?.useRoleAsset))
  const [roleAssetId, setRoleAssetId] = useState<number | null>(data?.roleAssetId || null)
  const [temperature, setTemperature] = useState<number>(data?.temperature ?? 0.7)
  const [showPreview, setShowPreview] = useState(Boolean(data?.showPreview ?? true))
  const [configOpen, setConfigOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [progressMsg, setProgressMsg] = useState('')
  const [result, setResult] = useState<any>(data?.result || null)
  const [mediaDims, setMediaDims] = useState('')
  const [readySkills, setReadySkills] = useState<CanvasSkillSummary[]>([])
  const [allSkills, setAllSkills] = useState<CanvasSkillSummary[]>([])
  const [skillsLoading, setSkillsLoading] = useState(false)
  const [skillPackInstallUrl, setSkillPackInstallUrl] = useState('')
  const [skillPackInstalling, setSkillPackInstalling] = useState(false)
  const [skillPackInstallStatus, setSkillPackInstallStatus] = useState<{
    status: 'selected' | 'choose' | 'installed_no_compatible' | 'installed_preserved'
    packId: string
    revision: string
  } | null>(null)
  const [skillPackInstallError, setSkillPackInstallError] = useState<Pick<CanvasSkillApiError, 'error_code' | 'detail'> | null>(null)
  const [skillPackId, setSkillPackId] = useState(String(data?.skillPackId ?? data?.skill_pack_id ?? ''))
  const [skillName, setSkillName] = useState(String(data?.skillName ?? data?.skill_name ?? ''))
  const [skillRevision, setSkillRevision] = useState(String(data?.skillRevision ?? data?.skill_revision ?? ''))
  const [skillCompileEnabled, setSkillCompileEnabled] = useState(Boolean(data?.skillCompileEnabled ?? data?.skill_compile_enabled ?? data?.skillName ?? data?.skill_name))
  const [skillCompilerModelId, setSkillCompilerModelId] = useState<number | null>(() => {
    const value = data?.skillCompilerModelId ?? data?.skill_compiler_model_id
    return normalizeGenerateNodeCompilerModelId(value)
  })
  const [skillArguments, setSkillArguments] = useState<Record<string, string>>(data?.skillArguments ?? data?.skill_arguments ?? {})
  const [commandSkillArgumentsByCommand, setCommandSkillArgumentsByCommand] = useState<GenerateNodeCommandSkillArgumentsByCommand>(() => (
    normalizeGenerateNodeCommandSkillArgumentsByCommand(data?.commandSkillArgumentsByCommand ?? data?.command_skill_arguments_by_command)
  ))
  const [skillSettings, setSkillSettings] = useState<CanvasSkillSettings | null>(null)
  const [skillSettingsLoaded, setSkillSettingsLoaded] = useState(false)
  const [compilerModels, setCompilerModels] = useState<any[]>([])
  const [compilerModelsLoaded, setCompilerModelsLoaded] = useState(false)
  const [compiledPrompt, setCompiledPrompt] = useState(String(data?.compiledPrompt ?? initialCompileAudit?.compiled_prompt ?? ''))
  const [compiledNegativePrompt, setCompiledNegativePrompt] = useState(String(data?.compiledNegativePrompt ?? initialCompileAudit?.compiled_negative_prompt ?? ''))
  const [compiledReferences, setCompiledReferences] = useState<unknown[]>(Array.isArray(data?.compiledReferences ?? initialCompileAudit?.compiled_references) ? (data?.compiledReferences ?? initialCompileAudit.compiled_references) : [])
  const [compiledReferenceBindings, setCompiledReferenceBindings] = useState<GenerateNodeReferenceBinding[]>(Array.isArray(data?.compiledReferenceBindings ?? initialCompileAudit?.reference_bindings) ? (data?.compiledReferenceBindings ?? initialCompileAudit.reference_bindings) : [])
  const [referenceModeHint, setReferenceModeHint] = useState(String(data?.referenceModeHint ?? initialCompileAudit?.reference_mode_hint ?? ''))
  const [compiledInputHash, setCompiledInputHash] = useState(String(data?.compiledInputHash ?? initialCompileAudit?.compiled_input_hash ?? ''))
  const [compileWarnings, setCompileWarnings] = useState<string[]>(Array.isArray(data?.compileWarnings ?? initialCompileAudit?.warnings) ? (data?.compileWarnings ?? initialCompileAudit.warnings).map(String) : [])
  const [skillPackSource, setSkillPackSource] = useState(String(data?.skillPackSource ?? initialCompileAudit?.skill_pack_source ?? ''))
  const [compilerModelId, setCompilerModelId] = useState<number | null>(() => {
    const value = data?.compilerModelId ?? initialCompileAudit?.compiler_model_id
    return normalizeGenerateNodeCompilerModelId(value)
  })
  const [skillPreviewResult, setSkillPreviewResult] = useState<CanvasSkillCompileResult | null>(data?.skillPreviewResult || null)
  const [skillPreviewCached, setSkillPreviewCached] = useState(Boolean(data?.skillPreviewCached))
  const [skillPreviewLoading, setSkillPreviewLoading] = useState(false)
  const [skillPreviewError, setSkillPreviewError] = useState<Pick<CanvasSkillApiError, 'error_code' | 'detail'> | null>(null)
  const persistedReferenceBindings = data?.referenceBindings ?? data?.reference_bindings
  const initialReferenceReconcileRef = useRef<ReturnType<typeof reconcileGenerateNodeReferenceBindings> | null>(null)
  if (initialReferenceReconcileRef.current === null) {
    initialReferenceReconcileRef.current = reconcileGenerateNodeReferenceBindings(
      persistedReferenceBindings,
      incomingContext.incomingAssets,
      { unresolvedSources: incomingContext.unresolvedReferenceSources },
    )
  }
  const initialReferenceBindingsChangedRef = useRef(shouldInvalidateGenerateNodeInitialCompileAudit(
    persistedReferenceBindings,
    initialReferenceReconcileRef.current.bindings,
  ))
  const [referenceBindings, setReferenceBindings] = useState<GenerateNodeReferenceBinding[]>(() => (
    initialReferenceReconcileRef.current?.bindings || []
  ))
  const [referenceValidationError, setReferenceValidationError] = useState<GenerateNodeReferenceValidationState | null>(() => (
    incomingContext.referenceValidationError || initialReferenceReconcileRef.current?.validationError || null
  ))
  const [executionCompatibilityError, setExecutionCompatibilityError] = useState<GenerateNodeExecutionCompatibilityError | null>(() => (
    parseGenerateNodeExecutionCompatibilityError(data?.executionCompatibilityError ?? data?.execution_compatibility_error)
  ))
  const referenceBindingsRef = useRef(referenceBindings)
  referenceBindingsRef.current = referenceBindings
  const generateRunTrackerRef = useRef(createGenerateNodeRunTracker())
  const chatSkillCompileRunTokenRef = useRef<GenerateNodeRunToken | null>(null)
  const reconciledIncomingFingerprintRef = useRef(incomingContext.fingerprint)
  const sseClientRef = useRef<SSEClient | null>(null)
  const prevRunSignalRef = useRef(data?._runSignal)
  const previousCompileInputFingerprintRef = useRef<string | null>(null)
  const compileInputFingerprintRef = useRef('')
  const appliedSkillTargetResolutionRef = useRef('')
  const pendingSkillTargetUserResolutionRef = useRef(false)
  const skillPreviewRequestTrackerRef = useRef(createGenerateNodePreviewRequestTracker())
  const skillListRequestCoordinatorRef = useRef(createGenerateNodeSkillListRequestCoordinator())
  const skillPackInstallRequestRef = useRef(0)
  const generateNodeMountedRef = useRef(true)
  const nodeRef = useRef<HTMLDivElement>(null)

  const cancelChatSkillCompileRun = useCallback(() => {
    const activeChatToken = chatSkillCompileRunTokenRef.current
    if (!cancelGenerateNodeChatSkillRun({
      tracker: generateRunTrackerRef.current,
      activeChatToken,
    })) return false

    chatSkillCompileRunTokenRef.current = null
    setGenerating(false)
    setProgressMsg('')
    return true
  }, [])

  // UI-only helper states for camera controls
  const [cameraOpen, setCameraOpen] = useState(false)
  const [movementOpen, setMovementOpen] = useState(false)
  const [cameraParams, setCameraParams] = useState<Record<string, string>>(data?.cameraParams || {})
  const [cameraCustomOptions, setCameraCustomOptions] = useState<Record<string, string[]>>(data?.cameraCustomOptions || {})
  const [customMovements, setCustomMovements] = useState<any[]>(data?.customMovements || [])

  const roleAssets = useMemo(() => assets.filter(a => a.type === 'prompt' && a.tags?.includes('SystemRole')), [assets])
  const selectedRolePrompt = useMemo(() => {
    if (useRoleAsset && roleAssetId) {
      const found = roleAssets.find(a => a.id === roleAssetId)
      return found?.data?.content || DEFAULT_ROLE.prompt
    }
    return systemPrompt || DEFAULT_ROLE.prompt
  }, [useRoleAsset, roleAssetId, roleAssets, systemPrompt])

  const ratioSize = getGenerateNodeAspectRatioSize(aspectRatio, customWidth, customHeight)
  const selectedKeyRecord = keys.find(key => Number(key.id) === Number(selectedKey))
  const selectedModelRecord = allModels.find(item => item.model_name === selectedModel)
  const projectId = Number(routeProjectId || 0) || null
  const visibleModels = allModels.filter(item => showOnlyFavorites ? item.is_favorite : true)
  const selectableModels = visibleModels.length > 0 ? visibleModels : allModels
  const supportsPromptSkills = SKILL_MEDIA_MODES.has(mode)
  const effectiveSkillCompileMode = resolveGenerateNodeSkillCompileMode({ nodeMode: mode, skillTargetMode })
  const effectiveSkillCompileModeRef = useRef(effectiveSkillCompileMode)
  effectiveSkillCompileModeRef.current = effectiveSkillCompileMode
  const skillSelectionIdentityRef = useRef<GenerateNodeSkillIdentity | null>(null)
  skillSelectionIdentityRef.current = skillName ? { packId: skillPackId, name: skillName, revision: skillRevision } : null
  const parsedSkillCommand = useMemo(() => parseCanvasSkillCommand(prompt), [prompt])
  const commandSkillArgumentKey = parsedSkillCommand ? `${parsedSkillCommand.packId || ''}:${parsedSkillCommand.name}` : ''
  const commandSkillArguments = commandSkillArgumentKey ? commandSkillArgumentsByCommand[commandSkillArgumentKey] || {} : {}
  const knownSkills = useMemo(() => Array.from(new Map(
    [...allSkills, ...readySkills].map(skill => [`${skill.packId}:${skill.name}:${skill.revision}`, skill]),
  ).values()), [allSkills, readySkills])
  const selectedSkillResolution = useMemo(() => resolveGenerateNodeSkillSelection({
    knownSkills,
    selectedPackId: skillPackId,
    selectedName: skillName,
    selectedRevision: skillRevision,
  }), [knownSkills, skillName, skillPackId, skillRevision])
  const selectedSkill = selectedSkillResolution.selectedSkill
  const commandSkillResolution = useMemo(() => {
    if (!parsedSkillCommand) return null
    return resolveGenerateNodeSkillSelection({
      knownSkills,
      selectedPackId: parsedSkillCommand.packId,
      selectedName: parsedSkillCommand.name,
      selectedRevision: '',
    })
  }, [knownSkills, parsedSkillCommand])
  const commandSkill = commandSkillResolution?.selectedSkill
  const effectiveSkill = parsedSkillCommand ? commandSkill : selectedSkill
  const effectiveSkillSelectionError = parsedSkillCommand
    ? commandSkillResolution?.error || null
    : selectedSkillResolution.error
  const effectiveSkillIdentity = buildGenerateNodeSkillIdentity({
    command: parsedSkillCommand,
    selectedPackId: selectedSkill?.packId || skillPackId,
    selectedName: selectedSkill?.name || skillName,
    selectedRevision: selectedSkill?.revision || skillRevision,
    resolvedCommandSkill: commandSkill,
  })
  const effectiveSkillName = effectiveSkillIdentity.name
  const effectiveSkillPackId = effectiveSkillIdentity.packId
  const effectiveSkillRevision = effectiveSkillIdentity.revision
  const effectiveSkillArguments = resolveGenerateNodeSkillArguments({
    command: parsedSkillCommand,
    skillArguments,
    commandSkillArguments,
    effectiveSkillArgumentSpecs: effectiveSkill?.arguments,
  })
  const setEffectiveSkillArgument = (name: string, value: string) => {
    if (!parsedSkillCommand || !commandSkillArgumentKey) {
      setSkillArguments(current => ({ ...current, [name]: value }))
      return
    }
    setCommandSkillArgumentsByCommand(current => ({
      ...current,
      [commandSkillArgumentKey]: { ...(current[commandSkillArgumentKey] || {}), [name]: value },
    }))
  }
  const hasEffectiveSkill = supportsPromptSkills && Boolean(effectiveSkillName)
  const isChatSkillCompileOnly = mode === 'chat' && hasEffectiveSkill
  const effectiveCompilerModelId = skillCompilerModelId ?? (skillSettingsLoaded ? skillSettings?.skill_compiler_model_id ?? null : compilerModelId)
  const effectiveCompilerModel = compilerModels.find(model => Number(model.id) === Number(effectiveCompilerModelId))
  const effectiveSkillIncompatible = Boolean(hasEffectiveSkill && effectiveSkill && (
    effectiveSkill.compatibility !== 'prompt_ready'
    || !effectiveSkillCompileMode
    || (effectiveSkill.mediaModes.length > 0 && !effectiveSkill.mediaModes.includes(effectiveSkillCompileMode))
  ))
  const missingEffectiveCompilerModel = Boolean(hasEffectiveSkill && (
    !skillSettingsLoaded
    || !compilerModelsLoaded
    || effectiveCompilerModelId === null
    || !effectiveCompilerModel
  ))
  const skillRunBlocked = Boolean(hasEffectiveSkill && (effectiveSkillSelectionError || effectiveSkillIncompatible || missingEffectiveCompilerModel))
  const effectiveCompilerReferenceBindings = useMemo(
    () => resolveGenerateNodeEffectiveCompilerReferenceBindings({
      nodeMode: mode,
      effectiveTargetMode: effectiveSkillCompileMode,
      isChatSkillCompileOnly,
      bindings: referenceBindings,
    }),
    [effectiveSkillCompileMode, isChatSkillCompileOnly, mode, referenceBindings],
  )
  const referenceBindingsFingerprint = useMemo(
    () => buildGenerateNodeReferenceBindingsFingerprint(effectiveCompilerReferenceBindings),
    [effectiveCompilerReferenceBindings],
  )
  const referenceExecutionValidationError = useMemo<GenerateNodeReferenceValidationState | null>(() => {
    try {
      buildGenerateNodeSkillCompileAssets(effectiveCompilerReferenceBindings)
      return null
    } catch (error) {
      return generateNodeReferenceValidationFromError(error)
    }
  }, [referenceBindingsFingerprint])
  const filteringCompilerImages = shouldFilterGenerateNodeCompilerImages({
    nodeMode: mode,
    effectiveTargetMode: effectiveSkillCompileMode,
    isChatSkillCompileOnly,
  })
  const effectiveReferenceValidationError = resolveGenerateNodeEffectiveReferenceValidationError({
    filteringImages: filteringCompilerImages,
    persistedError: referenceValidationError,
    effectiveError: referenceExecutionValidationError,
  })
  const { previewBlocked, runBlocked } = resolveGenerateNodeExecutionBlockState({
    skillBlocked: skillRunBlocked,
    referenceValidationError: effectiveReferenceValidationError,
    executionCompatibilityError: isChatSkillCompileOnly ? null : executionCompatibilityError,
  })
  const executionCompatibilityContextFingerprint = JSON.stringify({
    selectedKey,
    selectedModel,
    mode,
    executionKind: mode === 'chat' && hasEffectiveSkill ? 'skill_compile_only' : 'provider',
    effectiveTarget: effectiveSkillCompileMode,
    effectiveSkillIdentity,
    referenceBindings: referenceBindingsFingerprint,
  })
  const executionCompatibilityContextFingerprintRef = useRef(executionCompatibilityContextFingerprint)
  const hasCompileMetadata = Boolean(result?.compiled_prompt !== undefined || skillPreviewResult || compiledInputHash || compiledPrompt)

  const modelSupportsMode = (item: any) => {
    const capabilities = item?.capabilities || {}
    if (capabilities[mode] === true) return true
    return !Object.keys(capabilities).length
  }

  useEffect(() => {
    updateNodeInternals(id)
  }, [id, mode, skillTargetMode, updateNodeInternals])

  useEffect(() => {
    if (mode !== 'chat' || !effectiveSkill) {
      appliedSkillTargetResolutionRef.current = ''
      if (mode !== 'chat') pendingSkillTargetUserResolutionRef.current = false
      return
    }
    const origin: GenerateNodeSkillTargetTransitionOrigin = pendingSkillTargetUserResolutionRef.current ? 'user' : parsedSkillCommand ? 'command' : 'hydration'
    const resolutionKey = `${origin}:${effectiveSkill.packId}:${effectiveSkill.name}:${effectiveSkill.revision}`
    if (appliedSkillTargetResolutionRef.current === resolutionKey) return
    appliedSkillTargetResolutionRef.current = resolutionKey
    const transition = resolveGenerateNodeSkillTargetTransition({
      origin,
      requestedTargetMode: skillTargetMode,
      skill: effectiveSkill,
    })
    if (origin === 'user' && parsedSkillCommand) {
      appliedSkillTargetResolutionRef.current = `command:${effectiveSkill.packId}:${effectiveSkill.name}:${effectiveSkill.revision}`
    }
    pendingSkillTargetUserResolutionRef.current = false
    if (transition.targetMode !== skillTargetMode) {
      effectiveSkillCompileModeRef.current = resolveGenerateNodeSkillCompileMode({
        nodeMode: mode,
        skillTargetMode: transition.targetMode,
      })
      setSkillTargetMode(transition.targetMode)
    }
    if (transition.clearSkill && !parsedSkillCommand) {
      skillSelectionIdentityRef.current = null
      setSkillPackId('')
      setSkillName('')
      setSkillRevision('')
      setSkillArguments({})
      setSkillCompileEnabled(false)
    }
  }, [effectiveSkill, mode, parsedSkillCommand, skillTargetMode])

  useEffect(() => {
    if (reconciledIncomingFingerprintRef.current === incomingContext.fingerprint) return
    reconciledIncomingFingerprintRef.current = incomingContext.fingerprint
    const reconciled = reconcileGenerateNodeReferenceBindings(
      referenceBindingsRef.current,
      incomingContext.incomingAssets,
      { unresolvedSources: incomingContext.unresolvedReferenceSources },
    )
    setReferenceValidationError(incomingContext.referenceValidationError || reconciled.validationError)
    const currentFingerprint = buildGenerateNodeReferenceBindingsLocalFingerprint(referenceBindingsRef.current)
    const nextFingerprint = buildGenerateNodeReferenceBindingsLocalFingerprint(reconciled.bindings)
    if (currentFingerprint !== nextFingerprint) setReferenceBindings(reconciled.bindings)
  }, [incomingContext.fingerprint])

  useEffect(() => {
    if (executionCompatibilityContextFingerprintRef.current === executionCompatibilityContextFingerprint) return
    executionCompatibilityContextFingerprintRef.current = executionCompatibilityContextFingerprint
    setExecutionCompatibilityError(null)
  }, [executionCompatibilityContextFingerprint])

  useEffect(() => {
    if (isChatSkillCompileOnly && executionCompatibilityError) setExecutionCompatibilityError(null)
  }, [executionCompatibilityError, isChatSkillCompileOnly])

  useEffect(() => {
    updateNodeData(id, {
      mode,
      skillTargetMode,
      skill_target_mode: skillTargetMode,
      prompt,
      systemPrompt,
      model: selectedModel,
      model_name: selectedModel,
      api_key_id: selectedKey,
      keyId: selectedKey,
      params,
      routing_strategy: routingStrategy,
      showOnlyFavorites,
      aspectRatio,
      customWidth,
      customHeight,
      useRoleAsset,
      roleAssetId,
      temperature,
      showPreview,
      result,
      cameraParams,
      cameraCustomOptions,
      customMovements,
      ...buildGenerateNodeReferencePersistencePayload(referenceBindings),
      referenceValidationError,
      executionCompatibilityError,
      execution_compatibility_error: executionCompatibilityError,
      skillPackId: hasEffectiveSkill ? skillPackId : undefined,
      skillName: hasEffectiveSkill ? skillName : undefined,
      skillRevision: hasEffectiveSkill ? skillRevision : undefined,
      skillCompileEnabled: hasEffectiveSkill ? true : skillCompileEnabled,
      skillCompilerModelId,
      skillArguments,
      commandSkillArgumentsByCommand,
      compiledPrompt: hasCompileMetadata ? compiledPrompt : undefined,
      compiledNegativePrompt: hasCompileMetadata ? compiledNegativePrompt : undefined,
      compiledReferences: hasCompileMetadata ? compiledReferences : undefined,
      compiledReferenceBindings: hasCompileMetadata ? compiledReferenceBindings.map(binding => ({
        ...binding,
        ...(binding.source_asset_ids ? { source_asset_ids: [...binding.source_asset_ids] } : {}),
      })) : undefined,
      referenceModeHint: hasCompileMetadata ? referenceModeHint || undefined : undefined,
      compiledInputHash: hasCompileMetadata ? compiledInputHash : undefined,
      compileWarnings: hasCompileMetadata ? compileWarnings : undefined,
      skillPackSource: hasCompileMetadata ? skillPackSource : undefined,
      compilerModelId: hasCompileMetadata ? compilerModelId : undefined,
      skillPreviewResult: hasCompileMetadata ? skillPreviewResult : undefined,
      skillPreviewCached,
      skill_pack_id: result?.skill_pack_id || (skillPreviewResult ? effectiveSkillPackId : skillPackId) || undefined,
      skill_name: result?.skill_name || skillPreviewResult?.skill_name || skillName || undefined,
      skill_revision: result?.skill_revision || skillPreviewResult?.skill_version || skillRevision || undefined,
      skill_compile_enabled: hasEffectiveSkill ? true : skillCompileEnabled,
      skill_compiler_model_id: skillCompilerModelId ?? undefined,
      skill_arguments: Object.keys(skillArguments).length ? skillArguments : undefined,
      command_skill_arguments_by_command: commandSkillArgumentsByCommand,
      compiled_prompt: hasCompileMetadata ? compiledPrompt : undefined,
      compiled_negative_prompt: hasCompileMetadata ? compiledNegativePrompt : undefined,
      compiled_references: hasCompileMetadata ? compiledReferences : undefined,
      reference_mode_hint: hasCompileMetadata ? referenceModeHint || undefined : undefined,
      compiled_input_hash: hasCompileMetadata ? compiledInputHash : undefined,
      warnings: hasCompileMetadata ? compileWarnings : undefined,
      skill_pack_source: hasCompileMetadata ? skillPackSource || undefined : undefined,
      compiler_model_id: hasCompileMetadata ? compilerModelId ?? undefined : undefined,
    })
  }, [id, mode, skillTargetMode, prompt, systemPrompt, selectedModel, selectedKey, params, routingStrategy, showOnlyFavorites, aspectRatio, customWidth, customHeight, useRoleAsset, roleAssetId, temperature, showPreview, result, cameraParams, cameraCustomOptions, customMovements, referenceBindings, referenceValidationError, executionCompatibilityError, skillPackId, skillName, skillRevision, skillCompileEnabled, skillCompilerModelId, skillArguments, commandSkillArgumentsByCommand, compiledPrompt, compiledNegativePrompt, compiledReferences, compiledReferenceBindings, referenceModeHint, compiledInputHash, compileWarnings, skillPackSource, compilerModelId, skillPreviewResult, skillPreviewCached, effectiveSkillPackId, hasEffectiveSkill, hasCompileMetadata, updateNodeData])

  useEffect(() => {
    const initialStatus = resolveGenerateNodeInitialRunStatus({
      currentStatus: useCanvasStore.getState().nodeRunStatus[id],
      hasResult: Boolean(result),
    })
    if (initialStatus) setNodeStatus(id, initialStatus)
  }, [id, result, setNodeStatus])

  useEffect(() => subscribeToGenerateNodeExternalError(id, cancelChatSkillCompileRun), [cancelChatSkillCompileRun, id])

  useEffect(() => {
    apiClient.get('/keys/')
      .then(res => {
        const activeKeys = Array.isArray(res.data) ? res.data.filter((key: any) => key.is_active !== false) : []
        setKeys(activeKeys)
        setSelectedKey(current => current || (activeKeys[0]?.id ? Number(activeKeys[0].id) : null))
      })
      .catch(() => setKeys([]))
  }, [])

  useEffect(() => {
    generateNodeMountedRef.current = true
    return () => {
      generateNodeMountedRef.current = false
      skillPackInstallRequestRef.current += 1
      skillListRequestCoordinatorRef.current.invalidate()
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const allSkillsToken = skillListRequestCoordinatorRef.current.start('all')
    listSkills()
      .then(res => {
        if (generateNodeMountedRef.current && skillListRequestCoordinatorRef.current.isCurrent(allSkillsToken)) {
          setAllSkills(Array.isArray(res.data?.skills) ? res.data.skills : [])
        }
      })
      .catch(() => {
        if (generateNodeMountedRef.current && skillListRequestCoordinatorRef.current.isCurrent(allSkillsToken)) setAllSkills([])
      })
    readSkillSettings()
      .then(res => { if (!cancelled) setSkillSettings(res.data) })
      .catch(() => { if (!cancelled) setSkillSettings({ skill_compiler_model_id: null }) })
      .finally(() => { if (!cancelled) setSkillSettingsLoaded(true) })
    apiClient.get('/models/')
      .then(res => {
        if (cancelled) return
        const models = Array.isArray(res.data) ? res.data : []
        setCompilerModels(models.filter(isGenerateNodeCompilerModelEligible))
      })
      .catch(() => { if (!cancelled) setCompilerModels([]) })
      .finally(() => { if (!cancelled) setCompilerModelsLoaded(true) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const readySkillsToken = beginGenerateNodeSkillReadyListRequest(
      skillListRequestCoordinatorRef.current,
      setSkillsLoading,
    )
    if (!supportsPromptSkills) {
      setReadySkills([])
      settleGenerateNodeSkillReadyListRequest(skillListRequestCoordinatorRef.current, readySkillsToken, setSkillsLoading)
      return
    }
    if (!effectiveSkillCompileMode) {
      setReadySkills([])
      settleGenerateNodeSkillReadyListRequest(skillListRequestCoordinatorRef.current, readySkillsToken, setSkillsLoading)
      return
    }
    listSkills(effectiveSkillCompileMode, true)
      .then(res => {
        if (!generateNodeMountedRef.current || !skillListRequestCoordinatorRef.current.isCurrent(readySkillsToken)) return
        const skills = Array.isArray(res.data?.skills) ? res.data.skills : []
        setReadySkills(skills)
      })
      .catch(() => {
        if (generateNodeMountedRef.current && skillListRequestCoordinatorRef.current.isCurrent(readySkillsToken)) setReadySkills([])
      })
      .finally(() => {
        if (generateNodeMountedRef.current) {
          settleGenerateNodeSkillReadyListRequest(skillListRequestCoordinatorRef.current, readySkillsToken, setSkillsLoading)
        }
      })
  }, [effectiveSkillCompileMode, supportsPromptSkills])

  useEffect(() => {
    if (!selectedKey) {
      setAllModels([])
      return
    }
    setModelLoading(true)
    apiClient.get(`/models/?key_id=${selectedKey}&mode=${mode}`)
      .then(res => {
        const models = Array.isArray(res.data) ? res.data.filter(modelSupportsMode) : []
        setAllModels(models)
        setSelectedModel(current => {
          if (current && models.some((item: any) => item.model_name === current)) return current
          const preferred = models.find((item: any) => item.is_favorite) || models[0]
          return preferred?.model_name || ''
        })
      })
      .catch(() => setAllModels([]))
      .finally(() => setModelLoading(false))
  }, [selectedKey, mode])

  useEffect(() => {
    const current = useCanvasStore.getState().nodes.find(n => n.id === id)?.data
    if (current?.result) setResult(current.result)
  }, [id])

  useEffect(() => { setMediaDims('') }, [result?.content])

  // freezeNodeSizeBeforeMediaPreview：无显式尺寸的节点（旧画布/菜单直建）会被生成的图片/视频
  // 撑到媒体固有尺寸；媒体结果出现时先把当前实测宽高固化进 style，保持"当前多大就多大"
  useEffect(() => {
    const content = typeof result?.content === 'string' ? result.content : ''
    const isMedia = /^data:(image|video)/.test(content) || /\.(png|jpg|jpeg|webp|gif|mp4|webm|mov)(\?|$)/i.test(content) || content.startsWith('http')
    if (!content || !isMedia) return
    setNodes(nds => nds.map(n => {
      if (n.id !== id) return n
      if (n.style?.width && n.style?.height) return n
      const width = n.style?.width || n.width || 360
      const height = n.style?.height || n.height || 380
      return { ...n, style: { ...n.style, width, height } }
    }))
  }, [result?.content, id, setNodes])

  useEffect(() => () => {
    sseClientRef.current?.disconnect()
    sseClientRef.current = null
    generateRunTrackerRef.current.invalidate()
  }, [])

  useEffect(() => {
    if ((!configOpen && !quickOpen) || typeof document === 'undefined') return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const insidePopup = target.closest('.ant-select-dropdown, .ant-tooltip, .ant-popover, .ant-dropdown, .ant-color-picker')
      if (!target.closest('[data-config-panel]') && !target.closest('.react-flow__node') && !insidePopup) {
        setConfigOpen(false)
        setQuickOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [configOpen, quickOpen])

  const resolveProvider = () => String(selectedKeyRecord?.provider || selectedKey || '')

  const skillNodeParams = () => Object.fromEntries(Object.entries({
    size: params.size || ratioSize,
    aspect_ratio: aspectRatio,
    cameraParams,
    customMovements,
  }).filter(([, value]) => value !== undefined && value !== null && value !== ''))

  const compileInputFingerprint = JSON.stringify({
    prompt,
    mode,
    effectiveSkillCompileMode,
    skill: effectiveSkillIdentity,
    skillArguments: effectiveSkillArguments,
    compilerModelId: effectiveCompilerModelId,
    referenceBindings: referenceBindingsFingerprint,
    externalSystemPrompt: incomingContext.externalSystemPrompt,
    nodeParams: skillNodeParams(),
    params,
  })
  compileInputFingerprintRef.current = compileInputFingerprint

  useEffect(() => {
    const previous = previousCompileInputFingerprintRef.current
    const initialReferenceBindingsChanged = initialReferenceBindingsChangedRef.current
    initialReferenceBindingsChangedRef.current = false
    previousCompileInputFingerprintRef.current = compileInputFingerprint
    if (previous === null && !initialReferenceBindingsChanged) return
    if (previous === compileInputFingerprint) return

    skillPreviewRequestTrackerRef.current.invalidate()
    setSkillPreviewLoading(false)
    setCompiledPrompt('')
    setCompiledNegativePrompt('')
    setCompiledReferences([])
    setCompiledReferenceBindings([])
    setReferenceModeHint('')
    setCompiledInputHash('')
    setCompileWarnings([])
    setSkillPackSource('')
    setCompilerModelId(null)
    setSkillPreviewResult(null)
    setSkillPreviewCached(false)
    setSkillPreviewError(null)
    const currentResult = useCanvasStore.getState().nodes.find(node => node.id === id)?.data?.result
    const nextResult = withoutSkillAudit(currentResult)
    setResult(nextResult)
    updateNodeData(id, {
      result: nextResult,
      compiledPrompt: undefined,
      compiledNegativePrompt: undefined,
      compiledReferences: undefined,
      compiledReferenceBindings: undefined,
      referenceModeHint: undefined,
      compiledInputHash: undefined,
      compileWarnings: undefined,
      skillPackSource: undefined,
      compilerModelId: undefined,
      skillPreviewResult: undefined,
      skillPreviewCached: false,
      skill_preview_cached: false,
      compiled_prompt: undefined,
      compiled_negative_prompt: undefined,
      compiled_references: undefined,
      reference_mode_hint: undefined,
      compiled_input_hash: undefined,
      warnings: undefined,
      skill_pack_source: undefined,
      compiler_model_id: undefined,
    })
  }, [compileInputFingerprint, id, updateNodeData])

  const prepareReferenceBindingsForExecution = () => {
    if (effectiveReferenceValidationError) {
      message.error(`${effectiveReferenceValidationError.error_code}: ${effectiveReferenceValidationError.detail}`)
      return null
    }
    try {
      return buildGenerateNodeSkillCompileAssets(effectiveCompilerReferenceBindings)
    } catch (error: any) {
      const validationError = generateNodeReferenceValidationFromError(error)
      setReferenceValidationError(validationError)
      message.error(`${validationError.error_code}: ${validationError.detail}`)
      return null
    }
  }

  const handleSkillPreview = async () => {
    if (!hasEffectiveSkill) return message.info('请先选择 Skill 或在提示词开头输入 /skill 命令')
    if (effectiveSkillSelectionError) return message.error(`${effectiveSkillSelectionError.error_code}: ${effectiveSkillSelectionError.detail}`)
    if (effectiveSkillIncompatible) return message.error(effectiveSkill?.reason || `当前 Skill 与 ${effectiveSkillCompileMode || mode} 不兼容`)
    if (missingEffectiveCompilerModel || effectiveCompilerModelId === null) {
      return message.error(!skillSettingsLoaded || !compilerModelsLoaded ? '正在加载 Skill 编译模型，请稍候' : '请先配置一个启用且支持 Chat 的 Skill 编译模型')
    }

    const previewAssets = prepareReferenceBindingsForExecution()
    if (previewAssets === null) return
    const previewRequest = skillPreviewRequestTrackerRef.current.start(compileInputFingerprint)
    setSkillPreviewLoading(true)
    setSkillPreviewError(null)
    try {
      const res = await compileSkillPreview(buildGenerateNodeSkillCompileRequest({
        skillName: effectiveSkillName,
        packId: effectiveSkillPackId,
        revision: effectiveSkillRevision,
        prompt,
        mode: effectiveSkillCompileMode as GenerateNodeSkillTargetMode,
        references: previewAssets,
        nodeParams: skillNodeParams(),
        arguments: effectiveSkillArguments,
        compilerModelId: effectiveCompilerModelId,
      }))
      if (!skillPreviewRequestTrackerRef.current.isCurrent(previewRequest, compileInputFingerprintRef.current)) return
      const audit = normalizeGenerateNodeSkillCompileAudit({
        response: res.data,
        executionReferences: previewAssets,
        packSource: effectiveSkill?.sourceUrl,
        compilerModelId: effectiveCompilerModelId,
      })
      setCompiledPrompt(audit.compiledPrompt)
      setCompiledNegativePrompt(audit.compiledNegativePrompt)
      setCompiledReferences(audit.compiledReferences)
      setCompiledReferenceBindings(audit.compiledReferenceBindings)
      setReferenceModeHint(audit.referenceModeHint)
      setCompiledInputHash(audit.compiledInputHash)
      setCompileWarnings(audit.compileWarnings)
      setSkillPackSource(audit.skillPackSource)
      setCompilerModelId(audit.compilerModelId)
      setSkillPreviewResult(audit.skillPreviewResult)
      setSkillPreviewCached(audit.skillPreviewCached)
      setSkillCompileEnabled(true)
      message.success(res.data.cached ? '已复用 Skill 编译缓存' : 'Skill 提示词编译完成')
    } catch (error: any) {
      if (!skillPreviewRequestTrackerRef.current.isCurrent(previewRequest, compileInputFingerprintRef.current)) return
      const body = (error?.response?.data || {}) as Partial<CanvasSkillApiError>
      setSkillPreviewError({
        error_code: String(body.error_code || 'SKILL_COMPILE_FAILED'),
        detail: String(body.detail || body.error || error?.message || 'Skill 编译失败'),
      })
    } finally {
      if (skillPreviewRequestTrackerRef.current.isCurrent(previewRequest, compileInputFingerprintRef.current)) {
        setSkillPreviewLoading(false)
      }
    }
  }

  const buildPayload = (executableReferenceBindings: readonly GenerateNodeReferenceBinding[]) => {
    const { externalSystemPrompt } = incomingContext
    const cameraSuffix = buildCameraPromptSuffix(cameraParams)
    const payload = buildGenerateNodeRequestPayload({
      id,
      prompt,
      selectedKey,
      provider: resolveProvider(),
      selectedModel,
      mode,
      routingStrategy,
      params,
      temperature,
      ratioSize,
      selectedRolePrompt,
      cameraSuffix,
      referenceBindings: executableReferenceBindings,
      externalSystemPrompt,
      systemPromptOverride: data?._systemPromptOverride,
      skillPackId: effectiveSkillPackId,
      skillName: effectiveSkillName,
      skillRevision: effectiveSkillRevision,
      skillCompileEnabled: hasEffectiveSkill ? true : undefined,
      skillCompilerModelId: hasEffectiveSkill ? effectiveCompilerModelId : undefined,
      skillArguments: hasEffectiveSkill ? skillArguments : undefined,
      commandSkillArguments: hasEffectiveSkill ? commandSkillArguments : undefined,
      effectiveSkillArgumentSpecs: hasEffectiveSkill ? effectiveSkill?.arguments : undefined,
      compiledInputHash: hasEffectiveSkill ? compiledInputHash : undefined,
    })
    if (hasEffectiveSkill) {
      payload.aspect_ratio = aspectRatio
      payload.cameraParams = cameraParams
      payload.customMovements = customMovements
      if (compiledInputHash) payload.skill_preview_cached = skillPreviewCached
    }
    return payload
  }

  const hasImmediateGenerationResult = (packet: any) => (
    packet?.content != null ||
    packet?.result?.content != null ||
    packet?.data?.content != null ||
    packet?.data?.result?.content != null
  )

  const finishGeneration = (packet: any, runToken: GenerateNodeRunToken) => {
    if (!generateRunTrackerRef.current.isCurrent(runToken)) return
    const currentNodeData = useCanvasStore.getState().nodes.find(node => node.id === id)?.data || data
    const expectedCountRaw = currentNodeData?._fissionExpectedCount
    const expectedCount = Number.isFinite(Number(expectedCountRaw)) ? Number(expectedCountRaw) : null
    const packetResult = buildGenerateNodeResultWithFission({
      packet,
      fissionEnabled: Boolean(currentNodeData?._fissionEnabled),
      expectedCount,
      onCountMismatch: ({ expected, actual }) => message.warning(`裂变数量校验失败：期望 ${expected} 条，实际 ${actual} 条，已回退普通输出`),
    })
    const activeRunReferenceBindings = runToken.referenceBindings
    const resultReferenceAudit = Array.isArray(packetResult?.reference_bindings)
      ? reconcileGenerateNodeReferenceBindings(undefined, packetResult.reference_bindings)
      : null
    const frozenReferenceBindings = resultReferenceAudit && !resultReferenceAudit.validationError
      ? resultReferenceAudit.bindings
      : activeRunReferenceBindings
    const finalResult = freezeGenerateNodeExecutionReferences(packetResult, frozenReferenceBindings)
    const compilerOwnedBindings = finalResult.reference_bindings
    const finalSkillPreviewCached = resolveGenerateNodeChatSkillPreviewCached({
      isChatSkillCompileOnly,
      cached: finalResult.skill_preview_cached,
    })
    const commitSuccessfulGeneration = () => {
      if (finalResult?.compiled_prompt !== undefined) {
        const references = Array.isArray(finalResult.compiled_references) ? finalResult.compiled_references : []
        const warnings = Array.isArray(finalResult.warnings) ? finalResult.warnings.map(String) : []
        const actualCompilerModelId = normalizeGenerateNodeCompilerModelId(finalResult.compiler_model_id)
        setCompiledPrompt(String(finalResult.compiled_prompt || ''))
        setCompiledNegativePrompt(String(finalResult.compiled_negative_prompt || ''))
        setCompiledReferences(references)
        setCompiledReferenceBindings(compilerOwnedBindings)
        setReferenceModeHint(String(finalResult.reference_mode_hint || ''))
        setCompiledInputHash(String(finalResult.compiled_input_hash || ''))
        setCompileWarnings(warnings)
        setSkillPackSource(String(finalResult.skill_pack_source || ''))
        setCompilerModelId(actualCompilerModelId)
        if (finalSkillPreviewCached !== undefined) setSkillPreviewCached(finalSkillPreviewCached)
        setSkillPreviewError(null)
        setSkillPreviewResult({
          skill_name: String(finalResult.skill_name || effectiveSkillName || ''),
          skill_version: String(finalResult.skill_revision || effectiveSkillRevision || ''),
          mode: (isChatSkillCompileOnly ? effectiveSkillCompileMode : mode) as CanvasSkillMediaMode,
          prompt: String(finalResult.compiled_prompt || ''),
          negative_prompt: String(finalResult.compiled_negative_prompt || ''),
          parameters: {},
          references_used: references.map(String),
          warnings,
          reference_bindings: compilerOwnedBindings,
          ...(finalResult.reference_mode_hint ? { reference_mode_hint: finalResult.reference_mode_hint } : {}),
        })
      }
      setResult(finalResult)
      updateNodeData(id, {
        result: finalResult,
        ...(finalResult?.compiled_prompt !== undefined ? {
          compiledPrompt: finalResult.compiled_prompt,
          compiledNegativePrompt: finalResult.compiled_negative_prompt || '',
          compiledReferences: finalResult.compiled_references || [],
          compiledReferenceBindings: compilerOwnedBindings,
          referenceModeHint: finalResult.reference_mode_hint || '',
          compiledInputHash: finalResult.compiled_input_hash || '',
          compileWarnings: finalResult.warnings || [],
          skillPackSource: finalResult.skill_pack_source || '',
          compilerModelId: finalResult.compiler_model_id,
          ...(finalSkillPreviewCached === undefined ? {} : {
            skillPreviewCached: finalSkillPreviewCached,
            skill_preview_cached: finalSkillPreviewCached,
          }),
          skill_pack_id: finalResult.skill_pack_id,
          skill_pack_source: finalResult.skill_pack_source,
          skill_name: finalResult.skill_name,
          skill_revision: finalResult.skill_revision,
          compiled_prompt: finalResult.compiled_prompt,
          compiled_negative_prompt: finalResult.compiled_negative_prompt || '',
          compiled_references: finalResult.compiled_references || [],
          reference_mode_hint: finalResult.reference_mode_hint,
          compiled_input_hash: finalResult.compiled_input_hash,
          warnings: finalResult.warnings || [],
          compiler_model_id: finalResult.compiler_model_id,
        } : {}),
      })
      setNodeStatus(id, 'success')
      setGenerating(false)
      setProgressMsg('')
      sseClientRef.current?.disconnect()
      sseClientRef.current = null
      message.success('🧠 AI 思考完成！')

      if (finalResult?._fission && Array.isArray(finalResult.items)) {
        const store = useCanvasStore.getState()
        if (!store.isGlobalRunning) {
          const outcome = expandFissionAndDistribute({ nodeId: id, items: finalResult.items, store: useCanvasStore })
          if (outcome.expanded) message.info(`裂变完成，已创建 ${finalResult.items.length} 个并行分支`, 3)
          else if (outcome.reason === 'no_downstream') message.warning('裂变结果已生成，但没有下游节点可展开')
        }
      } else {
        getEdges().filter(e => e.source === id).forEach(edge => {
          updateNodeData(edge.target, { incoming_data: finalResult })
        })
      }
    }
    const completed = completeGenerateNodeRunAfterEffects(generateRunTrackerRef.current, runToken, commitSuccessfulGeneration)
    if (completed && chatSkillCompileRunTokenRef.current === runToken) chatSkillCompileRunTokenRef.current = null
  }

  const failGeneration = (error: unknown, runToken: GenerateNodeRunToken) => {
    if (!generateRunTrackerRef.current.complete(runToken)) return
    if (chatSkillCompileRunTokenRef.current === runToken) chatSkillCompileRunTokenRef.current = null
    const compatibilityError = parseGenerateNodeExecutionCompatibilityError(error)
    if (compatibilityError) setExecutionCompatibilityError(compatibilityError)
    const value = error as any
    const errorText = String(
      value?.response?.data?.detail
      || value?.response?.data?.error
      || value?.detail
      || value?.error
      || value?.message
      || error
      || '未知错误',
    )
    message.error(`生成报错: ${errorText || '未知错误'}`)
    setNodeStatus(id, 'error')
    setGenerating(false)
    setProgressMsg('')
    sseClientRef.current?.disconnect()
    sseClientRef.current = null
  }

  const handleSSEMessage = (msg: SSEMessage, runToken: GenerateNodeRunToken) => {
    if (!generateRunTrackerRef.current.isCurrent(runToken)) return
    if (msg.type === 'status') {
      setProgressMsg(String(msg.message || msg.progress || '云端正在生成...'))
      return
    }
    if (msg.type === 'result') {
      try {
        finishGeneration(msg.data ?? msg.result ?? msg, runToken)
      } catch (error) {
        failGeneration(error, runToken)
      }
      return
    }
    if (msg.type === 'error') {
      failGeneration(msg, runToken)
      return
    }
    if (msg.type === 'interrupted') {
      failGeneration(msg, runToken)
    }
  }

  const handleRun = async () => {
    if (generateRunTrackerRef.current.hasActive()) return
    if (runBlocked) {
      setNodeStatus(id, 'error')
      if (!isChatSkillCompileOnly && executionCompatibilityError) {
        return message.error(`${executionCompatibilityError.error_code}: ${executionCompatibilityError.detail}`)
      }
      if (effectiveReferenceValidationError) {
        return message.error(`${effectiveReferenceValidationError.error_code}: ${effectiveReferenceValidationError.detail}`)
      }
      if (effectiveSkillSelectionError) {
        return message.error(`${effectiveSkillSelectionError.error_code}: ${effectiveSkillSelectionError.detail}`)
      }
      if (effectiveSkillIncompatible) {
        return message.error(effectiveSkill?.reason || `当前 Skill 与 ${effectiveSkillCompileMode || mode} 不兼容，请更换或清除`)
      }
      if (missingEffectiveCompilerModel) {
        return message.error(!skillSettingsLoaded || !compilerModelsLoaded ? '正在加载 Skill 编译模型，请稍候' : '请先配置一个启用且支持 Chat 的 Skill 编译模型')
      }
      return message.error('当前配置不可运行')
    }
    if (isChatSkillCompileOnly) {
      const executableReferenceBindings = prepareReferenceBindingsForExecution()
      if (executableReferenceBindings === null) return
      const executionReferenceBindings = buildGenerateNodeCanonicalReferenceBindings(executableReferenceBindings)
      const runToken = generateRunTrackerRef.current.start(executionReferenceBindings)
      if (!runToken) return message.info('当前节点已有生成任务运行中')
      const runCompileFingerprint = compileInputFingerprint
      chatSkillCompileRunTokenRef.current = runToken
      setGenerating(true)
      setProgressMsg('正在编译 Skill 提示词...')
      setNodeStatus(id, 'running')
      updateNodeData(id, { _finalSourcePrompt: prompt, _finalSystemPrompt: data?._systemPromptOverride || selectedRolePrompt })

      try {
        const outcome = await runGenerateNodeChatSkillCompilation({
          request: buildGenerateNodeSkillCompileRequest({
            skillName: effectiveSkillName,
            packId: effectiveSkillPackId,
            revision: effectiveSkillRevision,
            prompt,
            mode: effectiveSkillCompileMode as GenerateNodeSkillTargetMode,
            references: executionReferenceBindings,
            nodeParams: skillNodeParams(),
            arguments: effectiveSkillArguments,
            compilerModelId: effectiveCompilerModelId as number,
          }),
          compile: compileSkillPreview,
          isCurrent: () => (
            generateRunTrackerRef.current.isCurrent(runToken)
            && compileInputFingerprintRef.current === runCompileFingerprint
          ),
          packId: effectiveSkillPackId,
          packSource: effectiveSkill?.sourceUrl,
          compilerModelId: effectiveCompilerModelId as number,
          rawPrompt: prompt,
          executionReferences: executionReferenceBindings,
        })
        if (outcome.status === 'stale') {
          if (settleGenerateNodeChatSkillRun({
            tracker: generateRunTrackerRef.current,
            token: runToken,
            activeChatToken: chatSkillCompileRunTokenRef.current,
          })) {
            chatSkillCompileRunTokenRef.current = null
            setGenerating(false)
            setProgressMsg('')
            setNodeStatus(id, 'idle')
          }
          return
        }
        finishGeneration(outcome.packet, runToken)
      } catch (error: any) {
        failGeneration(error, runToken)
      }
      return
    }
    if (!selectedKey || !selectedModel) {
      setNodeStatus(id, 'error')
      return message.warning('请完整选择 Key 和 模型')
    }
    const executableReferenceBindings = prepareReferenceBindingsForExecution()
    if (executableReferenceBindings === null) return
    const executionReferenceBindings = buildGenerateNodeCanonicalReferenceBindings(executableReferenceBindings)
    const runToken = generateRunTrackerRef.current.start(executionReferenceBindings)
    if (!runToken) return message.info('当前节点已有生成任务运行中')
    setGenerating(true)
    setProgressMsg('正在连接实时通道...')
    setNodeStatus(id, 'running')
    updateNodeData(id, { result: null, _finalSourcePrompt: prompt, _finalSystemPrompt: data?._systemPromptOverride || selectedRolePrompt })

    try {
      sseClientRef.current?.disconnect()
      const sseClient = createSSEClient(id, msg => handleSSEMessage(msg, runToken))
      sseClientRef.current = sseClient
      await sseClient.connect()
      if (!generateRunTrackerRef.current.isCurrent(runToken)) return

      setProgressMsg('正在唤醒云端大脑...')
      const payload = buildPayload(executionReferenceBindings)
      const res = await apiClient.request({ url: '/generate', method: 'POST', data: payload })
      if (!generateRunTrackerRef.current.isCurrent(runToken)) return

      if (res.data?.client_id && !hasImmediateGenerationResult(res.data)) {
        setProgressMsg('已进入后台生成，等待模型返回...')
        return
      }

      finishGeneration(res.data, runToken)
    } catch (error: any) {
      failGeneration(error, runToken)
    }
  }

  useEffect(() => {
    if (!data?._runSignal || data._runSignal === prevRunSignalRef.current) return
    prevRunSignalRef.current = data._runSignal
    void handleRun()
  }, [data?._runSignal])

  const handleInterrupt = async () => {
    if (cancelChatSkillCompileRun()) {
      setNodeStatus(id, result ? 'success' : 'idle')
      message.warning('已中断提示词编译')
      return
    }
    try { await apiClient.post(`/interrupt/${id}`); message.warning('已下发拦截指令') } catch { message.error('拦截信令发送失败') }
  }

  const handleSaveToAsset = async () => {
    if (!result?.content) return
    const savedReferenceBindings = resolveGenerateNodeResultReferenceBindings(result)
    try {
      await apiClient.post('/assets/', buildGenerateNodeAssetPayload({
        resultContent: String(result.content),
        mode,
        prompt: String(result?.raw_prompt || data?._finalSourcePrompt || prompt),
        selectedModel,
        provider: resolveProvider(),
        selectedRolePrompt,
        params,
        temperature,
        aspectRatio,
        ratioSize,
        projectId,
        cameraParams,
        sourceAssetIds: result?.source_asset_ids,
        referenceBindings: savedReferenceBindings,
        referenceModeHint: String(result?.reference_mode_hint || referenceModeHint || ''),
        ...(result?.compiled_prompt !== undefined ? {
          compiledPrompt: result.compiled_prompt,
          compiledNegativePrompt: result.compiled_negative_prompt || '',
          skillPackId: result.skill_pack_id,
          skillPackSource: result.skill_pack_source,
          skillName: result.skill_name,
          skillRevision: result.skill_revision,
          compiledReferences: result.compiled_references || [],
          compiledInputHash: result.compiled_input_hash,
          warnings: result.warnings || [],
          compilerModelId: result.compiler_model_id,
          skillPreviewCached: result.skill_preview_cached,
        } : {}),
      }))
      message.success('已携带溯源信息固化到资产库！')
      if (projectId) await fetchAssets(projectId)
    } catch {
      message.error('入库失败')
    }
  }

  const commitReferenceBindings = (nextBindings: readonly GenerateNodeReferenceBinding[]) => {
    const reconciled = reconcileGenerateNodeReferenceBindings(
      nextBindings,
      incomingContext.incomingAssets,
      { unresolvedSources: incomingContext.unresolvedReferenceSources },
    )
    setReferenceValidationError(incomingContext.referenceValidationError || reconciled.validationError)
    setReferenceBindings(reconciled.bindings)
  }

  const handleReferenceRoleChange = (referenceId: string, referenceRole: GenerateNodeReferenceRole) => {
    const next = updateGenerateNodeReferenceBindingRole(referenceBindings, referenceId, referenceRole)
    setReferenceValidationError(next.validationError)
    if (!next.validationError) commitReferenceBindings(next.bindings)
  }

  const handleReferenceReorder = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= referenceBindings.length) return
    commitReferenceBindings(reorderGenerateNodeReferenceBindings(referenceBindings, index, targetIndex))
  }

  const selectRoleAsset = (assetId: number | null) => {
    setRoleAssetId(assetId)
    if (assetId) {
      setUseRoleAsset(true)
      updateNodeData(id, { roleAssetId: assetId, useRoleAsset: true })
      return
    }
    setUseRoleAsset(false)
    updateNodeData(id, { roleAssetId: null, useRoleAsset: false })
  }

  const handleCreatePresetRole = async (preset: typeof PRESET_ROLES[0]) => {
    const existing = roleAssets.find(asset => asset.name === preset.name)
    if (existing) {
      selectRoleAsset(existing.id)
      message.info(`「${preset.name}」已存在，已自动选中`)
      return
    }

    try {
      const res = await apiClient.post('/assets/', {
        type: 'prompt',
        name: preset.name,
        data: { content: preset.prompt },
        tags: ['SystemRole'],
        project_id: null,
      })
      const created = res.data?.asset || res.data
      if (!created?.id) throw new Error('asset id missing')
      selectRoleAsset(Number(created.id))
      await fetchAssets()
      message.success(`「${preset.name}」已创建到资产库`)
    } catch {
      message.error('创建预设失败')
    }
  }

  const skillOptionKey = (skill: Pick<CanvasSkillSummary, 'packId' | 'name' | 'revision'>) => `${skill.packId}:${skill.name}:${skill.revision}`
  const compatibleReadySkills = effectiveSkillCompileMode
    ? filterGenerateNodeCompatibleSkills(readySkills, effectiveSkillCompileMode)
    : []
  const selectableSkills = selectedSkill && !compatibleReadySkills.some(skill => skillOptionKey(skill) === skillOptionKey(selectedSkill))
    ? [...compatibleReadySkills, selectedSkill]
    : compatibleReadySkills
  const unresolvedSelectedSkillValue = skillName ? `unresolved:${skillPackId}:${skillName}:${skillRevision}` : ''
  const selectedSkillValue = selectedSkill ? skillOptionKey(selectedSkill) : unresolvedSelectedSkillValue
  const unresolvedSelectedSkillOption = !selectedSkill && skillName ? {
    value: unresolvedSelectedSkillValue,
    label: skillRevision
      ? `${skillPackId ? `${skillPackId}: ` : ''}${skillName} · 锁定 revision ${skillRevision} 不可用`
      : `${skillPackId ? `${skillPackId}: ` : ''}${skillName} · revision 未锁定（请选择）`,
  } : null
  const selectPromptSkill = (value: string) => {
    pendingSkillTargetUserResolutionRef.current = false
    if (!value) {
      skillSelectionIdentityRef.current = null
      setSkillPackId('')
      setSkillName('')
      setSkillRevision('')
      setSkillArguments({})
      setSkillCompileEnabled(Boolean(parsedSkillCommand))
      return
    }
    const skill = knownSkills.find(item => skillOptionKey(item) === value)
    if (!skill) return
    skillSelectionIdentityRef.current = { packId: skill.packId, name: skill.name, revision: skill.revision }
    setSkillPackId(skill.packId)
    setSkillName(skill.name)
    setSkillRevision(skill.revision)
    setSkillCompileEnabled(true)
    setSkillArguments(Object.fromEntries(skill.arguments.flatMap(argument => argument.default === undefined ? [] : [[argument.name, String(argument.default)]])))
  }

  const handleInstallSkillPack = async () => {
    const installUrl = skillPackInstallUrl.trim()
    const requestTargetMode = effectiveSkillCompileModeRef.current
    if (!installUrl || skillPackInstalling || !requestTargetMode) return
    const requestSelection = skillSelectionIdentityRef.current
      ? { ...skillSelectionIdentityRef.current }
      : null
    const installRequestId = ++skillPackInstallRequestRef.current
    const isCurrentInstallRequest = () => (
      generateNodeMountedRef.current && skillPackInstallRequestRef.current === installRequestId
    )
    setSkillPackInstalling(true)
    setSkillPackInstallError(null)
    setSkillPackInstallStatus(null)
    try {
      const response = await installSkillPack(skillPackInstallUrl.trim())
      if (!isCurrentInstallRequest()) return
      const installedSkills = Array.isArray(response.data?.skills) ? response.data.skills : []
      const packId = String(response.data?.record?.id || '')
      const revision = String(response.data?.record?.revision || '')
      const mergeSkills = (current: CanvasSkillSummary[], incoming: CanvasSkillSummary[]) => Array.from(new Map(
        [...current, ...incoming].map(skill => [skillOptionKey(skill), skill]),
      ).values())
      const currentTargetMode = effectiveSkillCompileModeRef.current
      const currentSelection = skillSelectionIdentityRef.current
        ? { ...skillSelectionIdentityRef.current }
        : null
      const installedReadySkills = currentTargetMode
        ? filterGenerateNodeCompatibleSkills(installedSkills, currentTargetMode)
        : []

      skillListRequestCoordinatorRef.current.invalidate()
      setAllSkills(current => mergeSkills(current, installedSkills))
      setReadySkills(current => mergeSkills(current, installedReadySkills))

      const outcome = resolveGenerateNodeSkillInstallApplication({
        skills: installedSkills,
        packId,
        revision,
        requestTargetMode,
        currentTargetMode,
        requestSelection,
        currentSelection,
      })
      if (outcome.status === 'selected' && outcome.selection) {
        const installedSkill = installedSkills.find(skill => (
          skill.packId === outcome.selection?.packId
          && skill.name === outcome.selection?.name
          && skill.revision === outcome.selection?.revision
        ))
        skillSelectionIdentityRef.current = { ...outcome.selection }
        setSkillPackId(outcome.selection.packId)
        setSkillName(outcome.selection.name)
        setSkillRevision(outcome.selection.revision)
        setSkillCompileEnabled(true)
        setSkillArguments(Object.fromEntries((installedSkill?.arguments || []).flatMap(argument => (
          argument.default === undefined ? [] : [[argument.name, String(argument.default)]]
        ))))
      }
      setSkillPackInstallStatus({ status: outcome.status, packId, revision })
      setSkillPackInstallUrl('')

      const allSkillsToken = skillListRequestCoordinatorRef.current.start('all')
      const readySkillsToken = beginGenerateNodeSkillReadyListRequest(
        skillListRequestCoordinatorRef.current,
        setSkillsLoading,
      )
      const allRefresh = listSkills().then(result => {
        if (!isCurrentInstallRequest() || !skillListRequestCoordinatorRef.current.isCurrent(allSkillsToken)) return
        const refreshed = Array.isArray(result.data?.skills) ? result.data.skills : []
        setAllSkills(mergeSkills(refreshed, installedSkills))
      })
      const readyRefresh = currentTargetMode
        ? listSkills(currentTargetMode, true).then(result => {
          if (!isCurrentInstallRequest() || !skillListRequestCoordinatorRef.current.isCurrent(readySkillsToken)) return
          const refreshed = Array.isArray(result.data?.skills) ? result.data.skills : []
          setReadySkills(mergeSkills(refreshed, installedReadySkills))
        }).finally(() => {
          if (isCurrentInstallRequest()) {
            settleGenerateNodeSkillReadyListRequest(skillListRequestCoordinatorRef.current, readySkillsToken, setSkillsLoading)
          }
        })
        : Promise.resolve(settleGenerateNodeSkillReadyListRequest(
          skillListRequestCoordinatorRef.current,
          readySkillsToken,
          setSkillsLoading,
        ))
      await Promise.allSettled([allRefresh, readyRefresh])
    } catch (error: any) {
      if (!isCurrentInstallRequest()) return
      const body = (error?.response?.data || {}) as Partial<CanvasSkillApiError>
      setSkillPackInstallError({
        error_code: String(body.error_code || 'SKILL_PACK_INSTALL_FAILED'),
        detail: String(body.detail || error?.message || 'Skill Pack 安装失败'),
      })
    } finally {
      if (isCurrentInstallRequest()) setSkillPackInstalling(false)
    }
  }

  const selectSkillTargetMode = (requestedTargetMode: GenerateNodeSkillTargetMode) => {
    if (effectiveSkillName && !effectiveSkill) pendingSkillTargetUserResolutionRef.current = true
    if (parsedSkillCommand && effectiveSkill) {
      appliedSkillTargetResolutionRef.current = `command:${effectiveSkill.packId}:${effectiveSkill.name}:${effectiveSkill.revision}`
    }
    const transition = resolveGenerateNodeSkillTargetTransition({
      origin: 'user',
      requestedTargetMode,
      skill: effectiveSkill,
    })
    effectiveSkillCompileModeRef.current = resolveGenerateNodeSkillCompileMode({
      nodeMode: mode,
      skillTargetMode: transition.targetMode,
    })
    setSkillTargetMode(transition.targetMode)
    if (transition.clearSkill && !parsedSkillCommand) selectPromptSkill('')
  }

  const compilerSelector = useMemo(() => buildGenerateNodeCompilerSelectorModel({
    keys,
    models: compilerModels,
    overrideModelId: skillCompilerModelId,
    workspaceDefaultModelId: skillSettings?.skill_compiler_model_id ?? null,
  }), [compilerModels, keys, skillCompilerModelId, skillSettings?.skill_compiler_model_id])
  const compilerSelectorLoading = !skillSettingsLoaded || !compilerModelsLoaded

  const renderParams = () => {
    const uiParams = selectedModelRecord?.context_ui_params?.[mode]
    if (!Array.isArray(uiParams) || uiParams.length === 0) return null

    return (
      <div style={{ display: 'grid', gap: 10, padding: 10, border: '1px solid #e2e8f0', borderRadius: 10, background: '#f8fafc' }}>
        {uiParams.map((param: any) => {
          const value = params[param.name] !== undefined ? params[param.name] : param.default
          const commit = (nextValue: any) => {
            const nextParams = { ...params, [param.name]: nextValue }
            setParams(nextParams)
            updateNodeData(id, { params: nextParams })
          }
          return (
            <div key={param.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>{param.label || param.name}</Text>
                {param.type === 'number' && <Text type="secondary" style={{ fontSize: 12 }}>{value}</Text>}
              </div>
              {param.type === 'boolean' && <Switch size="small" checked={Boolean(value)} onChange={commit} />}
              {param.type === 'select' && <Select size="small" value={value} options={normalizeSelectOptions(param.options)} style={{ width: '100%' }} onChange={commit} />}
              {param.type === 'number' && Number(param.max) <= 2 && (
                <Slider min={Number(param.min ?? 0)} max={Number(param.max ?? 2)} step={Number(param.step ?? 0.1)} value={Number(value ?? param.default ?? 0)} onChange={commit} />
              )}
              {param.type === 'number' && Number(param.max) > 2 && (
                <InputNumber size="small" value={Number(value ?? param.default ?? 0)} min={param.min} max={param.max} step={param.step} style={{ width: '100%' }} onChange={commit} />
              )}
              {(param.type === 'string' || param.type === 'text') && (
                <Input size="small" value={value} placeholder={param.default || param.name} onChange={event => commit(event.target.value)} />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const selectModel = (nextModel: string) => {
    setSelectedModel(nextModel)
    const modelRecord = allModels.find(item => item.model_name === nextModel)
    const uiParams = modelRecord?.context_ui_params?.[mode]
    if (Array.isArray(uiParams)) {
      // size 不注入默认值：图像尺寸由节点上的比例选择器（ratioSize 兜底）统一控制
      const defaults = Object.fromEntries(uiParams.filter((param: any) => param?.name !== 'size').map((param: any) => [param.name, param.default]))
      setParams(defaults)
      updateNodeData(id, { params: defaults })
    }
  }

  const renderQuickParams = () => {
    if (mode === 'chat' || mode === 'vision') {
      return (
        <>
          <Tooltip title="温度">
            <InputNumber size="small" value={temperature} min={0} max={2} step={0.1} style={{ width: 64 }} onChange={value => setTemperature(Number(value || 0))} />
          </Tooltip>
          <Tooltip title="裂变输出：LLM 返回 JSON 数组时自动裂变下游节点并发执行">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748b' }}>
              裂变<Switch size="small" checked={Boolean(data?._fissionEnabled)} onChange={checked => updateNodeData(id, { _fissionEnabled: checked })} />
            </span>
          </Tooltip>
        </>
      )
    }
    const quickParams = pickQuickParams(selectedModelRecord?.context_ui_params?.[mode])
    const ratioSelect = (
      <Tooltip key="_aspect_ratio" title="图像尺寸">
        <Select
          size="small"
          value={aspectRatio}
          style={{ width: 130 }}
          onChange={selectAspectRatio}
          options={GENERATE_NODE_ASPECT_RATIO_OPTIONS.map(r => ({ value: r.value, label: r.size ? `${r.label} · ${r.size}` : r.label }))}
        />
      </Tooltip>
    )
    if (quickParams.length === 0) return ratioSelect
    return [ratioSelect, ...quickParams.map(param => {
      const value = params[param.name] !== undefined ? params[param.name] : param.default
      const commit = (nextValue: any) => {
        const nextParams = { ...params, [param.name]: nextValue }
        setParams(nextParams)
        updateNodeData(id, { params: nextParams })
      }
      if (param.type === 'select') {
        return (
          <Tooltip key={param.name} title={param.label || param.name}>
            <Select size="small" value={value} options={normalizeSelectOptions(param.options)} style={{ width: 110 }} onChange={commit} />
          </Tooltip>
        )
      }
      return (
        <Tooltip key={param.name} title={param.label || param.name}>
          <InputNumber size="small" value={Number(value ?? param.default ?? 0)} min={param.min} max={param.max} step={param.step} style={{ width: 64 }} onChange={commit} />
        </Tooltip>
      )
    })]
  }

  const nodeCollapsed = Boolean(data?._collapsed)
  const outType = mode === 'chat' || mode === 'vision' ? 'text'
    : mode === 'text_to_image' || mode === 'image_to_image' ? 'image'
      : mode === 'text_to_video' || mode === 'image_to_video' ? 'video' : 'any'

  const renderDynamicHandles = () => (
    <>
      {(mode === 'chat' || mode === 'vision') && <TypedHandle id="system" type="target" position={Position.Left} dataType="text" label="系统提示词" color="#fadb14" top={30} collapsed={nodeCollapsed} />}
      <TypedHandle id="text" type="target" position={Position.Left} dataType="text" label="文本输入" top={70} collapsed={nodeCollapsed} />
      {(mode === 'vision' || mode === 'image_to_image' || mode === 'image_to_video' || (mode === 'chat' && (skillTargetMode === 'image_to_image' || skillTargetMode === 'image_to_video'))) && <TypedHandle id="image" type="target" position={Position.Left} dataType="image" label="图片输入" top={110} collapsed={nodeCollapsed} />}
    </>
  )

  const isImageVideoMode = ['text_to_image', 'image_to_image', 'text_to_video', 'image_to_video'].includes(mode)
  const showsChatSkillImageReferences = mode === 'chat' && (skillTargetMode === 'image_to_image' || skillTargetMode === 'image_to_video')
  const showsReferencePanel = isImageVideoMode || showsChatSkillImageReferences
  const hasModelSizeParam = (selectedModelRecord?.context_ui_params?.[mode] || []).some((param: any) => param?.name === 'size')

  // 选择比例时清掉模型自带的 size 参数，否则 params.size 优先级更高会让比例失效
  const selectAspectRatio = (nextValue: unknown) => {
    setAspectRatio(nextValue as AspectRatioValue)
    if (hasModelSizeParam && params.size !== undefined) {
      const nextParams = { ...params }
      delete nextParams.size
      setParams(nextParams)
      updateNodeData(id, { params: nextParams })
    }
  }
  const currentModeLabel = MODES.find(item => item.value === mode)?.label || mode.toUpperCase()
  const currentModelDisplay = selectedModelRecord?.display_name || selectedModel || '未配置模型'
  const expectedFissionCount = Number.isFinite(Number(data?._fissionExpectedCount)) ? Number(data?._fissionExpectedCount) : null
  const parsedFissionCount = result?._fission && Array.isArray(result?.items) ? result.items.length : 0
  const fissionCountHealthy = expectedFissionCount === null || parsedFissionCount === expectedFissionCount
  const resultContent = result?.content
  const previewMediaSrc = resolveGenerateNodePreviewMediaSrc(typeof resultContent === 'string' ? resultContent : '')
  const isMediaResult = typeof resultContent === 'string' && (
    resultContent.startsWith('http') ||
    resultContent.startsWith('data:image') ||
    resultContent.startsWith('data:video') ||
    resultContent.match(/\.(png|jpg|jpeg|webp|gif|mp4|webm|mov)(\?|$)/i)
  )
  const isVideoResult = typeof resultContent === 'string' && (
    resultContent.startsWith('data:video') ||
    resultContent.match(/\.(mp4|webm|mov)(\?|$)/i)
  )

  const quickPanel = (
    <NodeConfigToolbar open={quickOpen} onClose={() => setQuickOpen(false)} title="模式与模型" width={340} position={Position.Bottom}>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Segmented
          size="small"
          block
          value={mode}
          options={MODES}
          onChange={nextMode => {
            const nextNodeMode = nextMode as string
            effectiveSkillCompileModeRef.current = resolveGenerateNodeSkillCompileMode({ nodeMode: nextNodeMode, skillTargetMode })
            setMode(nextNodeMode)
            setSelectedModel('')
            setParams({})
          }}
        />
        <Space.Compact block>
          <Select
            value={selectedKey ?? undefined}
            placeholder="选择 Key"
            size="small"
            style={{ width: 120 }}
            options={keys.map(key => ({ label: key.description || key.provider || `Key ${key.id}`, value: Number(key.id) }))}
            onChange={value => { setSelectedKey(Number(value)); setSelectedModel(''); setParams({}) }}
          />
          <Select
            value={selectedModel || undefined}
            placeholder="选择模型"
            size="small"
            loading={modelLoading}
            disabled={!selectedKey}
            style={{ flex: 1, minWidth: 0 }}
            options={selectableModels.map(item => ({ label: `${item.is_favorite && !showOnlyFavorites ? '⭐ ' : ''}${item.display_name || item.model_name}`, value: item.model_name }))}
            onChange={selectModel}
          />
          <Tooltip title={showOnlyFavorites ? '显示全量模型' : '只看收藏模型'}>
            <Button size="small" icon={<StarFilled />} type={showOnlyFavorites ? 'primary' : 'default'} onClick={() => setShowOnlyFavorites(value => !value)} />
          </Tooltip>
        </Space.Compact>
      </Space>
    </NodeConfigToolbar>
  )

  const configPanel = (
    <NodeConfigToolbar open={configOpen} onClose={() => setConfigOpen(false)} title="节点配置" width={400}>
      <Collapse
        size="small"
        defaultActiveKey={['generation']}
        items={[
          {
            key: 'generation',
            label: '生成参数',
            children: (
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {isImageVideoMode && (
                  <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                    <Select
                      size="small"
                      value={aspectRatio}
                      onChange={selectAspectRatio}
                      options={GENERATE_NODE_ASPECT_RATIO_OPTIONS.map(r => ({ value: r.value, label: r.size ? `${r.label} · ${r.size}` : r.label }))}
                    />
                    {aspectRatio === 'custom' ? (
                      <Space.Compact block>
                        <InputNumber size="small" value={customWidth} min={1} onChange={value => setCustomWidth(Number(value || 0))} />
                        <InputNumber size="small" value={customHeight} min={1} onChange={value => setCustomHeight(Number(value || 0))} />
                      </Space.Compact>
                    ) : (
                      <Input size="small" value={ratioSize} disabled />
                    )}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>温度</Text>
                  <InputNumber size="small" value={temperature} min={0} max={2} step={0.1} style={{ width: 90 }} onChange={value => setTemperature(Number(value || 0))} />
                  <Select
                    size="small"
                    value={routingStrategy}
                    options={GENERATE_NODE_ROUTING_STRATEGY_OPTIONS}
                    onChange={setRoutingStrategy}
                    style={{ flex: 1 }}
                  />
                </div>
              </Space>
            ),
          },
          ...(mode === 'chat' || mode === 'vision' ? [{
            key: 'role',
            label: '角色与提示',
            children: (
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Input size="small" value={systemPrompt} onChange={event => setSystemPrompt(event.target.value)} placeholder="System prompt" />
                <Checkbox checked={useRoleAsset} onChange={event => setUseRoleAsset(event.target.checked)}>使用角色资产</Checkbox>
                <Select size="small" value={roleAssetId ?? undefined} onChange={value => selectRoleAsset(value ?? null)} options={roleAssets.map(asset => ({ value: asset.id, label: asset.name }))} placeholder="SystemRole 资产" allowClear style={{ width: '100%' }} />
                <Space size={6} wrap>
                  {PRESET_ROLES.map(preset => (
                    <Tag key={preset.name} color="orange" style={{ cursor: 'pointer', margin: 0 }} onClick={() => handleCreatePresetRole(preset)}>
                      {preset.label}
                    </Tag>
                  ))}
                </Space>
              </Space>
            ),
          }] : []),
          ...(showsReferencePanel ? [{
            key: 'references',
            label: '参考素材',
            children: (
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  最多 9 张图片；提示词参考不计入图片额度。相同 URL 会按独立素材保留。
                </Text>
                {effectiveReferenceValidationError && (
                  <div style={{ padding: 8, borderRadius: 8, background: '#fff2f0', border: '1px solid #ffccc7' }}>
                    <Text type="danger" strong style={{ display: 'block', fontSize: 11 }}>{effectiveReferenceValidationError.error_code}</Text>
                    <Text type="danger" style={{ fontSize: 11 }}>{effectiveReferenceValidationError.detail}</Text>
                  </div>
                )}
                {executionCompatibilityError && (
                  <div style={{ padding: 8, borderRadius: 8, background: '#fff7e6', border: '1px solid #ffd591' }}>
                    <Text type="warning" strong style={{ display: 'block', fontSize: 11 }}>{executionCompatibilityError.error_code}</Text>
                    <Text type="warning" style={{ fontSize: 11 }}>{executionCompatibilityError.detail}</Text>
                  </div>
                )}
                {referenceBindings.length === 0 && (
                  <Text type="secondary" style={{ fontSize: 11 }}>通过 image/text 输入端口连接素材后，可在此设置角色和顺序。</Text>
                )}
                {referenceBindings.map((binding, index) => (
                  <div key={binding.reference_id} style={{ display: 'grid', gridTemplateColumns: '48px minmax(0, 1fr)', gap: 8, padding: 8, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 6, overflow: 'hidden', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {binding.type === 'image' && binding.url ? (
                        <img src={resolveGenerateNodePreviewMediaSrc(binding.url)} alt={`Reference ${binding.reference_index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Text style={{ fontSize: 10 }}>{binding.type === 'prompt' ? 'TEXT' : binding.type.toUpperCase()}</Text>
                      )}
                    </div>
                    <div style={{ minWidth: 0, display: 'grid', gap: 5 }}>
                      <Space size={4} wrap>
                        <Tag color="blue" style={{ margin: 0 }}>#{binding.reference_index}</Tag>
                        <Tag style={{ margin: 0 }}>{binding.type}</Tag>
                        <Text code style={{ fontSize: 10 }}>{binding.reference_id}</Text>
                      </Space>
                      <Text ellipsis={{ tooltip: binding.content || binding.url }} style={{ fontSize: 11 }}>
                        {binding.type === 'prompt' ? binding.content : binding.url}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 10 }}>
                        source IDs: {binding.source_asset_ids?.length ? binding.source_asset_ids.join(', ') : '—'}
                      </Text>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <Select
                          size="small"
                          value={binding.reference_role}
                          options={GENERATE_NODE_REFERENCE_ROLE_OPTIONS}
                          onChange={value => handleReferenceRoleChange(binding.reference_id, value)}
                          style={{ flex: 1, minWidth: 0 }}
                        />
                        <Button size="small" disabled={index === 0} onClick={() => handleReferenceReorder(index, -1)}>↑</Button>
                        <Button size="small" disabled={index === referenceBindings.length - 1} onClick={() => handleReferenceReorder(index, 1)}>↓</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </Space>
            ),
          }] : []),
          ...(supportsPromptSkills ? [{
            key: 'skill',
            label: '提示词 Skill',
            children: (
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {mode === 'chat' && (
                  <div>
                    <Text type="secondary" style={{ display: 'block', fontSize: 11, marginBottom: 3 }}>目标提示词类型</Text>
                    <Select
                      size="small"
                      aria-label="目标提示词类型"
                      value={skillTargetMode}
                      options={GENERATE_NODE_SKILL_TARGET_MODE_OPTIONS}
                      onChange={value => selectSkillTargetMode(value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                )}
                {parsedSkillCommand && (
                  <div style={{ padding: 8, borderRadius: 8, background: '#fff7e6', border: '1px solid #ffd591' }}>
                    <Tag color="orange" style={{ marginBottom: 4 }}>命令生效</Tag>
                    <Text code style={{ fontSize: 11 }}>/{parsedSkillCommand.packId ? `${parsedSkillCommand.packId}:` : ''}{parsedSkillCommand.name}</Text>
                    <div><Text type="secondary" style={{ fontSize: 11 }}>命令优先于下方下拉选择，不会根据触发词自动切换。</Text></div>
                  </div>
                )}
                <Select
                  size="small"
                  value={selectedSkillValue}
                  loading={skillsLoading}
                  onChange={value => selectPromptSkill(String(value || ''))}
                  style={{ width: '100%' }}
                  options={[
                    { value: '', label: '默认（不使用 Skill）' },
                    ...(unresolvedSelectedSkillOption ? [unresolvedSelectedSkillOption] : []),
                    ...selectableSkills.map(skill => ({
                      value: skillOptionKey(skill),
                      label: `${skill.packId}: ${skill.displayName || skill.name} · revision ${skill.revision}${skill.compatibility === 'prompt_ready' && effectiveSkillCompileMode && (skill.mediaModes.length === 0 || skill.mediaModes.includes(effectiveSkillCompileMode)) ? '' : ' · 不兼容'}`,
                    })),
                  ]}
                />
                {hasEffectiveSkill && (
                  <div style={{ padding: 8, borderRadius: 8, border: `1px solid ${effectiveSkillSelectionError || effectiveSkillIncompatible ? '#ffccc7' : '#d9f7be'}`, background: effectiveSkillSelectionError || effectiveSkillIncompatible ? '#fff2f0' : '#f6ffed' }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Text strong style={{ fontSize: 12 }}>{effectiveSkillPackId ? `${effectiveSkillPackId}: ` : ''}{effectiveSkill?.displayName || effectiveSkillName}</Text>
                      <Tag color={effectiveSkillSelectionError || effectiveSkillIncompatible ? 'red' : 'green'} style={{ margin: 0 }}>{effectiveSkillSelectionError ? '不可用' : effectiveSkillIncompatible ? '不兼容' : 'prompt_ready'}</Tag>
                      {(skillPreviewResult?.skill_version || effectiveSkillRevision) && (
                        <Tag color="blue" style={{ margin: 0 }}>锁定 {skillPreviewResult?.skill_version || effectiveSkillRevision}</Tag>
                      )}
                    </div>
                    {effectiveSkillSelectionError && (
                      <div style={{ marginTop: 4 }}>
                        <Text type="danger" strong style={{ display: 'block', fontSize: 11 }}>{effectiveSkillSelectionError.error_code}</Text>
                        {effectiveSkillRevision && <Text type="danger" style={{ display: 'block', fontSize: 11 }}>锁定 revision {effectiveSkillRevision} 当前不可用。</Text>}
                        <Text type="danger" style={{ display: 'block', fontSize: 11 }}>{effectiveSkillSelectionError.detail}</Text>
                      </div>
                    )}
                    {(effectiveSkill?.reason || effectiveSkill?.shortDescription || effectiveSkill?.description) && (
                      <Text type={effectiveSkillIncompatible ? 'danger' : 'secondary'} style={{ display: 'block', marginTop: 4, fontSize: 11 }}>
                        {effectiveSkill?.reason || effectiveSkill?.shortDescription || effectiveSkill?.description}
                      </Text>
                    )}
                  </div>
                )}
                {effectiveSkill?.arguments.map(argument => (
                  <div key={argument.name}>
                    <Text type="secondary" style={{ display: 'block', fontSize: 11, marginBottom: 3 }}>
                      {argument.name}{argument.required ? ' *' : ''}{argument.description ? ` · ${argument.description}` : ''}
                    </Text>
                    <Input
                      size="small"
                      value={effectiveSkillArguments?.[argument.name] ?? argument.default ?? ''}
                      placeholder={argument.default ?? argument.name}
                      onChange={event => setEffectiveSkillArgument(argument.name, event.target.value)}
                    />
                  </div>
                ))}
                <div>
                  <Text type="secondary" style={{ display: 'block', fontSize: 11, marginBottom: 3 }}>Skill 编译模型</Text>
                  <Space.Compact block>
                    <Select
                      aria-label="Skill 编译模型来源"
                      size="small"
                      value={compilerSelector.sourceValue}
                      options={compilerSelector.sourceOptions}
                      loading={compilerSelectorLoading}
                      disabled={compilerSelectorLoading}
                      onChange={value => setSkillCompilerModelId(resolveGenerateNodeCompilerModelIdForSource({
                        keys,
                        models: compilerModels,
                        sourceValue: value,
                      }))}
                      style={{ width: 140 }}
                    />
                    <Select
                      aria-label="Skill 编译模型"
                      size="small"
                      value={compilerSelector.modelValue}
                      options={compilerSelector.modelOptions}
                      loading={compilerSelectorLoading}
                      disabled={compilerSelectorLoading || compilerSelector.modelDisabled}
                      onChange={value => setSkillCompilerModelId(Number(value))}
                      style={{ flex: 1, minWidth: 0 }}
                    />
                  </Space.Compact>
                </div>
                {hasEffectiveSkill && !effectiveSkillSelectionError && missingEffectiveCompilerModel && (
                  <Text type="danger" style={{ fontSize: 11 }}>
                    {!skillSettingsLoaded || !compilerModelsLoaded ? '正在加载可用编译模型…' : '需要配置一个启用且 capabilities.chat === true 的编译模型后才能预览或运行。'}
                  </Text>
                )}
                {mode === 'chat' && hasEffectiveSkill && (
                  <Text type="secondary" style={{ fontSize: 11 }}>Chat Skill 仅使用 Skill 编译模型，不会调用上方选择的 Chat 模型。</Text>
                )}
                <Button
                  block
                  size="small"
                  loading={skillPreviewLoading}
                  disabled={!hasEffectiveSkill || previewBlocked}
                  onClick={handleSkillPreview}
                >
                  预览编译提示词
                </Button>
                {skillPreviewError && (
                  <div style={{ padding: 8, borderRadius: 8, background: '#fff2f0', border: '1px solid #ffccc7' }}>
                    <Text type="danger" strong style={{ display: 'block', fontSize: 11 }}>{skillPreviewError.error_code}</Text>
                    <Text type="danger" style={{ fontSize: 11 }}>{skillPreviewError.detail}</Text>
                  </div>
                )}
                {(skillPreviewResult || compiledPrompt) && (
                  <div style={{ display: 'grid', gap: 6 }}>
                    <Space size={4} wrap>
                      <Tag color="geekblue" style={{ margin: 0 }}>{result?.skill_pack_id || effectiveSkillPackId || '默认 Pack'}: {result?.skill_name || skillPreviewResult?.skill_name || effectiveSkillName}</Tag>
                      <Tag color="blue" style={{ margin: 0 }}>revision {result?.skill_revision || skillPreviewResult?.skill_version || effectiveSkillRevision || '未知'}</Tag>
                      <Tag color={skillPreviewCached ? 'green' : 'default'} style={{ margin: 0 }}>{skillPreviewResult ? (skillPreviewCached ? '缓存命中' : '新编译') : '生成审计'}</Tag>
                      {referenceModeHint && <Tag color="purple" style={{ margin: 0 }}>参考模式提示 {referenceModeHint}</Tag>}
                    </Space>
                    {compiledInputHash && <Text code style={{ fontSize: 10 }}>编译哈希 {compiledInputHash}</Text>}
                    <Collapse
                      size="small"
                      defaultActiveKey={['positive']}
                      items={[
                        { key: 'positive', label: '正向提示词', children: <div style={{ whiteSpace: 'pre-wrap', fontSize: 11 }}>{compiledPrompt}</div> },
                        { key: 'negative', label: '负向提示词', children: <div style={{ whiteSpace: 'pre-wrap', fontSize: 11 }}>{compiledNegativePrompt || '（无）'}</div> },
                        {
                          key: 'reference-bindings',
                          label: `编译参考 (${compiledReferenceBindings.length})`,
                          children: (
                            <div style={{ display: 'grid', gap: 5, fontSize: 11 }}>
                              {compiledReferenceBindings.length ? compiledReferenceBindings.map(binding => (
                                <div key={`${binding.reference_index}:${binding.reference_id}`} style={{ padding: 6, borderRadius: 6, background: '#f8fafc' }}>
                                  <Text strong style={{ fontSize: 11 }}>#{binding.reference_index} · {binding.reference_role} · {binding.type}</Text>
                                  <div><Text code style={{ fontSize: 10 }}>{binding.reference_id}</Text></div>
                                  <Text type="secondary" style={{ fontSize: 10 }}>{binding.content || binding.url || '—'}</Text>
                                </div>
                              )) : '（无）'}
                            </div>
                          ),
                        },
                        { key: 'references', label: `引用 (${compiledReferences.length})`, children: <div style={{ whiteSpace: 'pre-wrap', fontSize: 11 }}>{compiledReferences.length ? compiledReferences.map(String).join('\n') : '（无）'}</div> },
                        { key: 'warnings', label: `警告 (${compileWarnings.length})`, children: <div style={{ whiteSpace: 'pre-wrap', fontSize: 11, color: compileWarnings.length ? '#d4380d' : undefined }}>{compileWarnings.length ? compileWarnings.join('\n') : '（无）'}</div> },
                      ]}
                    />
                  </div>
                )}
                <Collapse
                  size="small"
                  items={[{
                    key: 'install-skill-pack',
                    label: '安装 Skill Pack',
                    children: (
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Input
                          size="small"
                          value={skillPackInstallUrl}
                          disabled={skillPackInstalling}
                          placeholder="https://github.com/MiniMax-AI/MiniMax-H3"
                          onChange={event => setSkillPackInstallUrl(event.target.value)}
                          onPressEnter={() => void handleInstallSkillPack()}
                        />
                        <Button
                          block
                          size="small"
                          type="primary"
                          loading={skillPackInstalling}
                          disabled={skillPackInstalling || !skillPackInstallUrl.trim() || !effectiveSkillCompileMode}
                          onClick={() => void handleInstallSkillPack()}
                        >
                          安装
                        </Button>
                        {skillPackInstallStatus && (
                          <div style={{ padding: 7, borderRadius: 7, background: '#f6ffed', border: '1px solid #b7eb8f' }}>
                            <Space size={4} wrap>
                              <Tag color="green" style={{ margin: 0 }}>Pack ID {skillPackInstallStatus.packId}</Tag>
                              <Tooltip title={skillPackInstallStatus.revision}>
                                <Tag color="blue" style={{ margin: 0 }}>锁定 {skillPackInstallStatus.revision.slice(0, 12)}</Tag>
                              </Tooltip>
                            </Space>
                            <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 11 }}>
                              {skillPackInstallStatus.status === 'selected'
                                ? '已自动选择此 Pack 中唯一兼容的 Skill，并启用编译。'
                                : skillPackInstallStatus.status === 'choose'
                                  ? '发现多个兼容 Skill，请从上方列表选择；原选择已保留。'
                                  : skillPackInstallStatus.status === 'installed_preserved'
                                    ? '安装成功；由于目标或 Skill 选择已更改，当前选择已保留。'
                                    : '安装成功，但当前目标没有兼容的 prompt_ready Skill；原选择已保留。'}
                            </Text>
                          </div>
                        )}
                        {skillPackInstallError && (
                          <div style={{ padding: 7, borderRadius: 7, background: '#fff2f0', border: '1px solid #ffccc7' }}>
                            <Text type="danger" strong style={{ display: 'block', fontSize: 11 }}>{skillPackInstallError.error_code}</Text>
                            <Text type="danger" style={{ fontSize: 11 }}>{skillPackInstallError.detail}</Text>
                          </div>
                        )}
                      </Space>
                    ),
                  }]}
                />
              </Space>
            ),
          }] : []),
          ...(isImageVideoMode ? [{
            key: 'camera',
            label: '镜头控制',
            children: (
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <CameraControl value={cameraParams} onChange={setCameraParams} open={cameraOpen} onOpenChange={setCameraOpen} customOptions={cameraCustomOptions} onCustomOptionsChange={setCameraCustomOptions} />
                <CameraMovement onInsert={text => setPrompt(prev => prev ? `${prev}\n${text}` : text)} open={movementOpen} onOpenChange={setMovementOpen} customPresets={customMovements} onAddCustom={preset => setCustomMovements(prev => [...prev, preset])} onRemoveCustom={value => setCustomMovements(prev => prev.filter(item => item.value !== value))} />
              </Space>
            ),
          }] : []),
          {
            key: 'advanced',
            label: '高级参数',
            children: renderParams() || <Text type="secondary" style={{ fontSize: 12 }}>当前模型没有暴露参数</Text>,
          },
        ]}
      />
    </NodeConfigToolbar>
  )

  return (
    <>
      {renderDynamicHandles()}
      <BaseNode {...props} onOpenConfig={() => setConfigOpen(v => !v)}>
      <div ref={nodeRef} style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, height: '100%' }}>
        <div
          className="nodrag"
          onClick={() => { setQuickOpen(v => !v); setConfigOpen(false) }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', background: quickOpen ? '#eef2ff' : '#fff' }}
        >
          <Tag color="#0ea5e9" style={{ margin: 0, fontWeight: 700, fontSize: 11, fontFamily: 'monospace' }}>{currentModeLabel}</Tag>
          <Text style={{ flex: 1, minWidth: 0, fontSize: 12, color: selectedModel ? '#1e293b' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={currentModelDisplay}>
            {currentModelDisplay}
          </Text>
          {data?._fissionEnabled && (
            <Tooltip title={expectedFissionCount !== null ? `裂变计数校验：期望 ${expectedFissionCount} 条，当前解析 ${parsedFissionCount} 条` : '裂变计数校验：未设置期望条数'}>
              <Tag style={{ margin: 0, fontSize: 11, userSelect: 'none' }} color={fissionCountHealthy ? 'green' : 'red'}>
                {expectedFissionCount !== null ? `${parsedFissionCount}/${expectedFissionCount}` : `${parsedFissionCount}/?`}
              </Tag>
            </Tooltip>
          )}
          <DownOutlined style={{ fontSize: 10, color: '#94a3b8', transform: quickOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>

        <TextArea
          className="nodrag nowheel"
          value={prompt}
          onChange={event => setPrompt(event.target.value)}
          autoSize={{ minRows: 2, maxRows: 4 }}
          placeholder="输入指令或连线输入素材..."
          style={{ fontSize: 13, fontFamily: 'monospace', borderRadius: 8, flexShrink: 0 }}
        />

        <div className="nodrag" style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {renderQuickParams()}
          <span style={{ flex: 1 }} />
          <Button
            type="primary"
            danger={generating}
            disabled={isMuted || (!generating && runBlocked)}
            icon={generating ? <StopOutlined /> : <PlayCircleOutlined />}
            onClick={generating ? handleInterrupt : handleRun}
            style={{ height: 30, fontSize: 13, fontWeight: 700, borderRadius: 8, padding: '0 16px' }}
          >
            {isMuted ? '已静音' : generating ? '中断' : !isChatSkillCompileOnly && executionCompatibilityError ? 'Provider 不兼容' : effectiveReferenceValidationError ? '参考素材待修复' : effectiveSkillSelectionError ? 'Skill 不可用' : skillRunBlocked ? 'Skill 配置待修复' : mode === 'chat' && hasEffectiveSkill ? '生成提示词' : '运行'}
          </Button>
        </div>

        <div style={{ flex: showPreview ? 1 : '0 0 auto', display: 'flex', flexDirection: 'column', background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px dashed #94a3b8', minHeight: showPreview ? 120 : 'auto', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <Text style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>生成结果</Text>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {resultContent && (
                <Tooltip title="携带溯源信息固化到资产库">
                  <Button type="text" size="small" icon={<SaveOutlined />} onClick={handleSaveToAsset} style={{ fontSize: 16, color: '#0ea5e9', padding: 0, height: 'auto' }} />
                </Tooltip>
              )}
              <Switch className="nodrag" size="small" checked={showPreview} onChange={value => setShowPreview(value)} />
            </div>
          </div>

          {showPreview && (
            <div style={{ flex: 1, position: 'relative', background: resultContent && !isMediaResult ? '#0f172a' : '#f1f5f9', borderRadius: 8, overflow: 'hidden', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
              {mediaDims && !generating && resultContent && (
                <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(15,23,42,0.75)', color: '#f8fafc', fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 4, zIndex: 10, fontFamily: 'monospace' }}>{mediaDims}</div>
              )}
              {generating ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20 }}>
                  <Spin size="default" style={{ marginBottom: 12 }} />
                  <Text type="secondary" style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>{progressMsg}</Text>
                </div>
              ) : resultContent ? (
                isMediaResult ? (
                  isVideoResult ? (
                    <video src={previewMediaSrc} controls style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8 }} onLoadedMetadata={event => setMediaDims(`${(event.target as HTMLVideoElement).videoWidth} x ${(event.target as HTMLVideoElement).videoHeight}`)} />
                  ) : (
                    <img src={previewMediaSrc} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8 }} onLoad={event => setMediaDims(`${(event.target as HTMLImageElement).naturalWidth} x ${(event.target as HTMLImageElement).naturalHeight}`)} />
                  )
                ) : (
                  <div className="nodrag nowheel" style={{ position: 'absolute', inset: 0, padding: 12, overflowY: 'auto', fontSize: 13, color: '#f8fafc', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{String(resultContent)}</div>
                )
              ) : (
                <Text type="secondary" style={{ fontSize: 13, color: '#475569' }}>等待生成结果...</Text>
              )}
            </div>
          )}
        </div>
      </div>
      </BaseNode>
      <TypedHandle id="out" type="source" position={Position.Right} dataType={outType} label="生成结果" collapsed={nodeCollapsed} />
      {quickPanel}
      {configPanel}
    </>
  )
}

nodeRegistry.register({ type: 'generate', displayName: 'AI 大脑节点', component: GenerateNodeImpl })
export default GenerateNodeImpl
