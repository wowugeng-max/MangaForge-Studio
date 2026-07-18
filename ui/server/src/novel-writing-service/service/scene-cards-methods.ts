import {
  buildSceneCardsPrompt as buildSceneCardsPromptFromBuilder,
} from '../../novel-writing/scene-cards-prompt'
import {
  getNovelPayload,
} from '../../routes/novel-route-utils'
import {
  normalizeSceneCardsPayload,
} from '../post-delivery/scene-cards'
import {
  throwIfAborted,
} from './runtime-helpers'

export function createSceneCardsMethods(deps: {
  executeAgent: (...args: any[]) => any
  getStageModelId: (...args: any[]) => any
  getStageTemperature: (...args: any[]) => any
}) {
  const executeAgent = deps.executeAgent
  const getStageModelId = deps.getStageModelId
  const getStageTemperature = deps.getStageTemperature

const buildSceneCardsPrompt = (project: any, contextPackage: any) => buildSceneCardsPromptFromBuilder(project, contextPackage)









const generateSceneCardsForChapter = async (activeWorkspace: string, project: any, contextPackage: any, modelId?: number, options: any = {}) => {
  const stageModelId = getStageModelId(project, 'scene_cards', modelId)
  throwIfAborted(options)
  const result = await executeAgent('outline-agent', project, {
    task: buildSceneCardsPrompt(project, contextPackage),
    upstreamContext: contextPackage,
  }, {
    activeWorkspace,
    modelId: stageModelId ? String(stageModelId) : undefined,
    maxTokens: 3000,
    temperature: getStageTemperature(project, 'scene_cards', 0.45),
    skipMemory: true,
    signal: options.abortSignal,
    timeoutMs: options.llmTimeoutMs,
  })
  const payload = getNovelPayload(result)
  return { result, sceneCards: normalizeSceneCardsPayload(payload, contextPackage) }
}

  return {
    buildSceneCardsPrompt,
    generateSceneCardsForChapter,
  }
}
