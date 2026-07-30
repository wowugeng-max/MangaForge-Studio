import React from 'react'
import { message, Modal, Alert, Input, Space, Tag } from 'antd'
import {
  mergeCommercialWebNovelStyleDefaults,
  mergeCommercialWebNovelStyleSampleDefaults,
} from '../writingBibleDefaults'
import { buildGenericReferenceConfigWritePayload } from '../mcpGenerationSourceModel'
import { parseListField } from './workspace-editor-fields'
import { renderStyleSamplePatchPreviewContentView } from './workspace-commercial-result'

export type WritingBibleHandlerDeps = {
  activeChapter: any
  activeContextPackageData: any
  apiClient: any
  applyStyleSampleActionForActiveChapter: any
  loadProjectModules: any
  projectId: any
  selectedModelId: any
  selectedProject: any
  setBookReviewLoading: any
  setRightPanelOpen: any
  setRightPanelTab: any
  setSelectedProject: any
  setStoryStateOpen: any
  setStyleSampleCandidateLoading: any
  setStyleSampleEffectiveness: any
  setStyleSampleEffectivenessLoading: any
  setStyleSamplePatchLoadingKey: any
  setWorkspaceArea: any
  setWritingBibleGenerating: any
  setWritingBibleOpen: any
  storyStateForm: any
  writingBibleForm: any
}

export function createWritingBibleHandlers(deps: WritingBibleHandlerDeps) {
  const activeChapter = deps.activeChapter
  const activeContextPackageData = deps.activeContextPackageData
  const apiClient = deps.apiClient
  const applyStyleSampleActionForActiveChapter = deps.applyStyleSampleActionForActiveChapter
  const loadProjectModules = deps.loadProjectModules
  const projectId = deps.projectId
  const selectedModelId = deps.selectedModelId
  const selectedProject = deps.selectedProject
  const setBookReviewLoading = deps.setBookReviewLoading
  const setRightPanelOpen = deps.setRightPanelOpen
  const setRightPanelTab = deps.setRightPanelTab
  const setSelectedProject = deps.setSelectedProject
  const setStoryStateOpen = deps.setStoryStateOpen
  const setStyleSampleCandidateLoading = deps.setStyleSampleCandidateLoading
  const setStyleSampleEffectiveness = deps.setStyleSampleEffectiveness
  const setStyleSampleEffectivenessLoading = deps.setStyleSampleEffectivenessLoading
  const setStyleSamplePatchLoadingKey = deps.setStyleSamplePatchLoadingKey
  const setWorkspaceArea = deps.setWorkspaceArea
  const setWritingBibleGenerating = deps.setWritingBibleGenerating
  const setWritingBibleOpen = deps.setWritingBibleOpen
  const storyStateForm = deps.storyStateForm
  const writingBibleForm = deps.writingBibleForm

  const fillWritingBibleForm = (bible: any) => {
    const styleLock = mergeCommercialWebNovelStyleDefaults(bible.style_lock || selectedProject?.reference_config?.style_lock || {})
    const styleSampleBank = mergeCommercialWebNovelStyleSampleDefaults(bible.style_sample_bank || selectedProject?.reference_config?.style_sample_bank || [])
    writingBibleForm.setFieldsValue({
      reader_promise: bible.reader_promise || bible.readerPromise || bible.promise || '',
      protagonist_drive: bible.protagonist_drive || bible.protagonistDrive || bible.protagonist_motivation || bible.main_character_drive || '',
      core_conflict: bible.core_conflict || bible.coreConflict || bible.main_conflict || bible.mainline?.conflict || bible.mainline?.core_conflict || '',
      current_volume_goal: bible.current_volume_goal || bible.currentVolumeGoal || bible.volume_goal || bible.volume_plan?.[0]?.goal || bible.volume_plan?.[0]?.summary || '',
      innovation_hook: bible.innovation_hook || bible.innovationHook || bible.original_hook || bible.unique_selling_point || '',
      first30_plan: bible.first30_plan || bible.first30Plan || bible.first_30_plan || bible.opening_strategy || bible.retention_plan || '',
      longform_capacity: bible.longform_capacity || bible.longformCapacity || bible.million_word_spine || bible.longform_spine || bible.serial_engine || '',
      promise: bible.promise || bible.reader_promise || '',
      narrative_person: styleLock.narrative_person || '',
      sentence_length: styleLock.sentence_length || '',
      dialogue_ratio: styleLock.dialogue_ratio || '',
      payoff_density: styleLock.payoff_density || '',
      description_density: styleLock.description_density || '',
      chapter_word_range: styleLock.chapter_word_range || '',
      banned_words: Array.isArray(styleLock.banned_words) ? styleLock.banned_words.join('\n') : '',
      preferred_words: Array.isArray(styleLock.preferred_words) ? styleLock.preferred_words.join('\n') : '',
      world_rules: JSON.stringify(bible.world_rules || [], null, 2),
      mainline: JSON.stringify(bible.mainline || {}, null, 2),
      volume_plan: JSON.stringify(bible.volume_plan || [], null, 2),
      style_lock: JSON.stringify(styleLock || {}, null, 2),
      safety_policy: JSON.stringify(bible.safety_policy || selectedProject?.reference_config?.safety || {}, null, 2),
      forbidden: JSON.stringify(bible.forbidden || [], null, 2),
      meme_bank: JSON.stringify(bible.meme_bank || selectedProject?.reference_config?.meme_bank || [], null, 2),
      style_sample_bank: JSON.stringify(styleSampleBank, null, 2),
      chapter_benchmark_sample_bank: JSON.stringify(bible.chapter_benchmark_sample_bank || selectedProject?.reference_config?.chapter_benchmark_sample_bank || [], null, 2),
    })
  }

  const fillDefaultStyleSampleBank = () => {
    writingBibleForm.setFieldsValue({
      style_sample_bank: JSON.stringify(mergeCommercialWebNovelStyleSampleDefaults([]), null, 2),
    })
    message.success('已填入默认风格样本库')
  }

  const extractStyleSampleCandidates = async () => {
    setStyleSampleCandidateLoading(true)
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/writing-bible/style-sample-candidates`, {
        min_score: 86,
        limit: 6,
      })
      const candidates = Array.isArray(res.data?.candidates) ? res.data.candidates : []
      if (!candidates.length) {
        message.warning('暂未找到可提炼的高分章节')
        return
      }
      writingBibleForm.setFieldsValue({
        style_sample_bank: JSON.stringify(candidates, null, 2),
      })
      message.success(`已提炼 ${candidates.length} 条风格样本候选，请审阅后保存`)
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '风格样本候选提炼失败')
    } finally {
      setStyleSampleCandidateLoading(false)
    }
  }

  const openWritingBibleEditor = async () => {
    setStyleSampleEffectivenessLoading(true)
    setStyleSampleEffectiveness(null)
    try {
      const [res, effectivenessRes] = await Promise.all([
        apiClient.get(`/novel/projects/${projectId}/writing-bible`),
        apiClient.get(`/novel/projects/${projectId}/writing-bible/style-sample-effectiveness`).catch(() => null),
      ])
      const bible = res.data?.writing_bible || {}
      fillWritingBibleForm(bible)
      setStyleSampleEffectiveness(effectivenessRes?.data?.style_sample_effectiveness || effectivenessRes?.data?.report || null)
      setWritingBibleOpen(true)
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '写作圣经加载失败')
    } finally {
      setStyleSampleEffectivenessLoading(false)
    }
  }

  const previewStyleSampleAdjustmentPatch = async (item: any) => {
    const sampleKey = String(item?.sample_key || '').trim()
    if (!sampleKey) return message.warning('缺少样章键')
    setStyleSamplePatchLoadingKey(sampleKey)
    try {
      const previewRes = await apiClient.post(`/novel/projects/${projectId}/writing-bible/style-sample-adjustment`, {
        sample_key: sampleKey,
        dry_run: true,
      })
      const patch = previewRes.data?.style_sample_patch || item?.adjustment_patch || {}
      const patchText = patch.patch_json || JSON.stringify(patch, null, 2)
      Modal.confirm({
        title: '样章补丁预览',
        width: 760,
        okText: '应用补丁',
        cancelText: '暂不应用',
        content: renderStyleSamplePatchPreviewContentView(sampleKey, patchText),
        onOk: async () => {
          try {
            const applyRes = await apiClient.post(`/novel/projects/${projectId}/writing-bible/style-sample-adjustment`, {
              sample_key: sampleKey,
              dry_run: false,
            })
            const nextBible = applyRes.data?.writing_bible || applyRes.data?.project?.reference_config?.writing_bible
            const nextBank = nextBible?.style_sample_bank || applyRes.data?.project?.reference_config?.style_sample_bank
            if (Array.isArray(nextBank)) {
              writingBibleForm.setFieldsValue({
                style_sample_bank: JSON.stringify(nextBank, null, 2),
              })
            }
            if (applyRes.data?.project) {
              setSelectedProject((prev: any) => prev ? { ...prev, ...applyRes.data.project } : applyRes.data.project)
            }
            const effectivenessRes = await apiClient.get(`/novel/projects/${projectId}/writing-bible/style-sample-effectiveness`).catch(() => null)
            setStyleSampleEffectiveness(effectivenessRes?.data?.style_sample_effectiveness || effectivenessRes?.data?.report || styleSampleEffectiveness)
            message.success('样章补丁已应用，请检查 JSON 后保存写作圣经')
          } catch (error: any) {
            message.error(error?.response?.data?.error || error?.message || '样章补丁应用失败')
            throw error
          }
        },
      })
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '样章补丁预览失败')
    } finally {
      setStyleSamplePatchLoadingKey('')
    }
  }

  const previewStyleSampleAdjustmentBatch = async () => {
    const riskyCount = Number(styleSampleEffectiveness?.risky_sample_count || 0)
    if (riskyCount <= 0) return message.info('当前没有需复盘样章')
    setStyleSamplePatchLoadingKey('batch')
    try {
      const previewRes = await apiClient.post(`/novel/projects/${projectId}/writing-bible/style-sample-adjustments`, {
        dry_run: true,
      })
      const batch = previewRes.data?.style_sample_patch_batch || {}
      const patchText = batch.patch_json || JSON.stringify(batch, null, 2)
      Modal.confirm({
        title: '样章批量补丁预览',
        width: 820,
        okText: '应用全部补丁',
        cancelText: '暂不应用',
        content: (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Alert
              type="info"
              showIcon
              message={`将批量调整 ${batch.total_patch_count || riskyCount} 条需复盘样章`}
              description="批量补丁只处理需复盘样章，跳过表现稳定样章；确认后写回风格样章库，不会改正文。"
            />
            <Input.TextArea value={patchText} rows={14} readOnly />
          </Space>
        ),
        onOk: async () => {
          try {
            const applyRes = await apiClient.post(`/novel/projects/${projectId}/writing-bible/style-sample-adjustments`, {
              dry_run: false,
            })
            const nextBible = applyRes.data?.writing_bible || applyRes.data?.project?.reference_config?.writing_bible
            const nextBank = nextBible?.style_sample_bank || applyRes.data?.project?.reference_config?.style_sample_bank
            if (Array.isArray(nextBank)) {
              writingBibleForm.setFieldsValue({
                style_sample_bank: JSON.stringify(nextBank, null, 2),
              })
            }
            if (applyRes.data?.project) {
              setSelectedProject((prev: any) => prev ? { ...prev, ...applyRes.data.project } : applyRes.data.project)
            }
            const effectivenessRes = await apiClient.get(`/novel/projects/${projectId}/writing-bible/style-sample-effectiveness`).catch(() => null)
            setStyleSampleEffectiveness(effectivenessRes?.data?.style_sample_effectiveness || effectivenessRes?.data?.report || styleSampleEffectiveness)
            message.success('样章批量补丁已应用，请检查 JSON 后保存写作圣经')
          } catch (error: any) {
            message.error(error?.response?.data?.error || error?.message || '样章批量补丁应用失败')
            throw error
          }
        },
      })
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '样章批量补丁预览失败')
    } finally {
      setStyleSamplePatchLoadingKey('')
    }
  }

  const undoStyleSampleAdjustmentPatch = async () => {
    setStyleSamplePatchLoadingKey('undo')
    try {
      const undoRes = await apiClient.post(`/novel/projects/${projectId}/writing-bible/style-sample-adjustments/undo`)
      if (!undoRes.data?.changed) {
        message.info('暂无可撤销的样章补丁')
        return
      }
      const nextBible = undoRes.data?.writing_bible || undoRes.data?.project?.reference_config?.writing_bible
      const nextBank = nextBible?.style_sample_bank || undoRes.data?.project?.reference_config?.style_sample_bank
      if (Array.isArray(nextBank)) {
        writingBibleForm.setFieldsValue({
          style_sample_bank: JSON.stringify(nextBank, null, 2),
        })
      }
      if (undoRes.data?.project) {
        setSelectedProject((prev: any) => prev ? { ...prev, ...undoRes.data.project } : undoRes.data.project)
      }
      const effectivenessRes = await apiClient.get(`/novel/projects/${projectId}/writing-bible/style-sample-effectiveness`).catch(() => null)
      setStyleSampleEffectiveness(effectivenessRes?.data?.style_sample_effectiveness || effectivenessRes?.data?.report || styleSampleEffectiveness)
      message.success('样章补丁已撤销')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '样章补丁撤销失败')
    } finally {
      setStyleSamplePatchLoadingKey('')
    }
  }

  const repairStyleSamplePatchReviewSelection = async (review: any = {}) => {
    const repairAction = review?.recommended_repair_action || review?.recommendedRepairAction || {}
    if (repairAction?.action !== 'replace') return
    if (!activeChapter) {
      message.warning('请先选择要重审任务书的章节')
      return
    }
    await applyStyleSampleActionForActiveChapter('replace')
    setWritingBibleOpen(false)
    setWorkspaceArea('chapterWriting')
    setRightPanelOpen(false)
  }

  const reviewStyleSampleAdjustmentPatch = async () => {
    setStyleSamplePatchLoadingKey('review')
    try {
      const contextPackage = activeContextPackageData?.context_package || activeContextPackageData || null
      const nextStyleSampleStrategy = activeChapter?.raw_payload?.pre_draft_brief?.style_sample_strategy
        || activeChapter?.raw_payload?.preDraftBrief?.style_sample_strategy
        || activeChapter?.raw_payload?.preDraftBrief?.styleSampleStrategy
        || contextPackage?.pre_draft_brief?.style_sample_strategy
        || contextPackage?.preDraftBrief?.style_sample_strategy
        || contextPackage?.preDraftBrief?.styleSampleStrategy
        || contextPackage?.chapter_target?.style_sample_strategy
        || contextPackage?.chapter_target?.styleSampleStrategy
        || null
      const reviewRes = await apiClient.post(`/novel/projects/${projectId}/writing-bible/style-sample-adjustments/post-apply-review`, {
        chapter_id: activeChapter?.id || null,
        chapter_no: activeChapter?.chapter_no || null,
        context_package: contextPackage,
        next_style_sample_strategy: nextStyleSampleStrategy,
      })
      const review = reviewRes.data?.style_sample_patch_review || {}
      setStyleSampleEffectiveness(reviewRes.data?.style_sample_effectiveness || reviewRes.data?.report || styleSampleEffectiveness)
      const status = review.status || 'empty'
      const repairAction = review.recommended_repair_action || review.recommendedRepairAction || null
      const repairActionLabel = '换样章并重审任务书'
      const reviewOkText = repairAction?.action === 'replace'
        ? (repairAction.label || repairActionLabel)
        : '知道了'
      const messageText = status === 'warn'
        ? '当前任务书仍选中了复盘风险样章'
        : status === 'ok'
          ? '样章补丁复检通过'
          : status === 'watch'
            ? '样章补丁进入观察'
            : '暂无可复检的样章补丁'
      Modal.info({
        title: '样章补丁复检',
        width: 760,
        content: (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Alert
              type={status === 'warn' ? 'warning' : status === 'ok' ? 'success' : 'info'}
              showIcon
              message={messageText}
              description={(Array.isArray(review.next_actions) ? review.next_actions : []).join('；') || '请先应用样章补丁，再复检任务书是否还会选择风险样章。'}
            />
            <Space size={6} wrap>
              <Tag bordered={false}>补丁样章 {(review.patched_sample_keys || []).length || 0}</Tag>
              <Tag color={(review.still_risky_sample_keys || []).length ? 'orange' : 'green'} bordered={false}>仍需观察 {(review.still_risky_sample_keys || []).length || 0}</Tag>
              <Tag color={review.next_task_selects_repatched_risky_sample ? 'red' : 'green'} bordered={false}>
                任务书选中风险 {review.next_task_selects_repatched_risky_sample ? '是' : '否'}
              </Tag>
            </Space>
            <Input.TextArea value={JSON.stringify(review, null, 2)} rows={10} readOnly />
          </Space>
        ),
        okText: reviewOkText,
        onOk: async () => {
          if (repairAction?.action === 'replace') {
            await repairStyleSamplePatchReviewSelection(review)
          }
        },
      })
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '样章补丁复检失败')
    } finally {
      setStyleSamplePatchLoadingKey('')
    }
  }

  const generateWritingBibleEditor = async () => {
    if (!selectedModelId) return message.warning('请先选择模型')
    setWritingBibleGenerating(true)
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/writing-bible/generate`, {
        model_id: selectedModelId,
        save: true,
      })
      const bible = res.data?.writing_bible || {}
      fillWritingBibleForm(bible)
      setSelectedProject((prev: any) => res.data?.project || (prev ? { ...prev, reference_config: { ...(prev.reference_config || {}), writing_bible: bible } } : prev))
      await loadProjectModules()
      setRightPanelOpen(true)
      setRightPanelTab('writingBible')
      message.success('写作圣经已自动生成并保存，可继续人工微调')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '写作圣经自动生成失败')
    } finally {
      setWritingBibleGenerating(false)
    }
  }

  const saveWritingBibleEditor = async () => {
    try {
      const v = await writingBibleForm.validateFields()
      const parseJson = (value: string, fallback: any) => {
        try { return JSON.parse(value || '') } catch { return fallback }
      }
      const parsedStyleLock = parseJson(v.style_lock, {})
      const memeBank = parseJson(v.meme_bank, [])
      const styleSampleBank = mergeCommercialWebNovelStyleSampleDefaults(parseJson(v.style_sample_bank, []))
      const chapterBenchmarkSampleBank = parseJson(v.chapter_benchmark_sample_bank, [])
      const writingBible = {
        ...(selectedProject?.reference_config?.writing_bible || {}),
        reader_promise: v.reader_promise || v.promise || '',
        protagonist_drive: v.protagonist_drive || '',
        core_conflict: v.core_conflict || '',
        current_volume_goal: v.current_volume_goal || '',
        innovation_hook: v.innovation_hook || '',
        first30_plan: v.first30_plan || '',
        longform_capacity: v.longform_capacity || '',
        promise: v.promise || v.reader_promise || '',
        world_rules: parseJson(v.world_rules, []),
        mainline: parseJson(v.mainline, {}),
        volume_plan: parseJson(v.volume_plan, []),
        style_lock: {
          ...parsedStyleLock,
          narrative_person: v.narrative_person || '',
          sentence_length: v.sentence_length || '',
          dialogue_ratio: v.dialogue_ratio || '',
          payoff_density: v.payoff_density || '',
          description_density: v.description_density || '',
          chapter_word_range: v.chapter_word_range || '',
          banter_density: parsedStyleLock.banter_density || '',
          ending_policy: parsedStyleLock.ending_policy || '',
          banned_words: parseListField(v.banned_words),
          preferred_words: parseListField(v.preferred_words),
          banned_shortcuts: parsedStyleLock.banned_shortcuts || [],
        },
        safety_policy: parseJson(v.safety_policy, {}),
        forbidden: parseJson(v.forbidden, []),
        meme_bank: memeBank,
        style_sample_bank: styleSampleBank,
        chapter_benchmark_sample_bank: chapterBenchmarkSampleBank,
      }
      const res = await apiClient.put(`/novel/projects/${projectId}/writing-bible`, { writing_bible: writingBible })
      const nextReferenceConfig = {
        ...(selectedProject?.reference_config || {}),
        ...(res.data?.project?.reference_config || {}),
        writing_bible: res.data?.writing_bible || writingBible,
        meme_bank: Array.isArray(memeBank) ? memeBank : [],
        style_sample_bank: Array.isArray(styleSampleBank) ? styleSampleBank : [],
        chapter_benchmark_sample_bank: Array.isArray(chapterBenchmarkSampleBank) ? chapterBenchmarkSampleBank : [],
      }
      const referenceConfigWritePayload = buildGenericReferenceConfigWritePayload(nextReferenceConfig)
      const configRes = await apiClient.put(`/novel/projects/${projectId}/reference-config`, referenceConfigWritePayload)
      setSelectedProject((prev: any) => res.data?.project
        ? { ...res.data.project, reference_config: configRes.data || nextReferenceConfig }
        : (prev ? { ...prev, reference_config: configRes.data || nextReferenceConfig } : prev))
      setWritingBibleOpen(false)
      message.success('写作圣经已保存')
    } catch (error: any) {
      if (error?.errorFields) return
      message.error(error?.response?.data?.error || error?.message || '写作圣经保存失败')
    }
  }

  const openStoryStateEditor = async () => {
    try {
      const res = await apiClient.get(`/novel/projects/${projectId}/story-state`)
      const state = res.data?.story_state || {}
      storyStateForm.setFieldsValue({
        character_positions: JSON.stringify(state.character_positions || {}, null, 2),
        character_relationships: JSON.stringify(state.character_relationships || state.relationships || {}, null, 2),
        known_secrets: JSON.stringify(state.known_secrets || {}, null, 2),
        item_ownership: JSON.stringify(state.item_ownership || {}, null, 2),
        foreshadowing_status: JSON.stringify(state.foreshadowing_status || {}, null, 2),
        mainline_progress: state.mainline_progress || '',
        timeline: JSON.stringify(state.timeline || [], null, 2),
        story_state: JSON.stringify(state, null, 2),
      })
      setStoryStateOpen(true)
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '故事状态加载失败')
    }
  }

  const saveStoryStateEditor = async () => {
    try {
      const v = await storyStateForm.validateFields()
      const parseJson = (value: string, fallback: any) => {
        try { return JSON.parse(value || '') } catch { return fallback }
      }
      const baseState = parseJson(v.story_state || '{}', {})
      const storyState = {
        ...baseState,
        character_positions: parseJson(v.character_positions, {}),
        character_relationships: parseJson(v.character_relationships, {}),
        known_secrets: parseJson(v.known_secrets, {}),
        item_ownership: parseJson(v.item_ownership, {}),
        foreshadowing_status: parseJson(v.foreshadowing_status, {}),
        mainline_progress: v.mainline_progress || baseState.mainline_progress || '',
        timeline: parseJson(v.timeline, []),
      }
      const res = await apiClient.put(`/novel/projects/${projectId}/story-state`, { story_state: storyState })
      setSelectedProject((prev: any) => res.data?.project || (prev ? { ...prev, reference_config: { ...(prev.reference_config || {}), story_state: res.data?.story_state || storyState } } : prev))
      setStoryStateOpen(false)
      await loadProjectModules()
      message.success('故事状态机已校正')
    } catch (error: any) {
      if (error?.errorFields) return
      message.error(error?.message?.includes('JSON') ? '故事状态必须是合法 JSON' : (error?.response?.data?.error || error?.message || '故事状态保存失败'))
    }
  }

  const runBookReview = async () => {
    if (!selectedModelId) return message.warning('请先选择模型')
    setBookReviewLoading(true)
    try {
      await apiClient.post(`/novel/projects/${projectId}/book-review`, { model_id: selectedModelId })
      await loadProjectModules()
      setRightPanelOpen(true)
      setRightPanelTab('bookReviews')
      message.success('全书总检已完成')
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '全书总检失败')
    } finally {
      setBookReviewLoading(false)
    }
  }



  return {
    fillWritingBibleForm,
    fillDefaultStyleSampleBank,
    extractStyleSampleCandidates,
    openWritingBibleEditor,
    previewStyleSampleAdjustmentPatch,
    previewStyleSampleAdjustmentBatch,
    undoStyleSampleAdjustmentPatch,
    repairStyleSamplePatchReviewSelection,
    reviewStyleSampleAdjustmentPatch,
    generateWritingBibleEditor,
    saveWritingBibleEditor,
    openStoryStateEditor,
    saveStoryStateEditor,
    runBookReview,
  }
}
