import type { GenerationSource, ProseGenerationRequest, ProseGenerationResult } from './types'

export class ModelGenerationSource implements GenerationSource {
  constructor(private readonly generator: (...args: any[]) => Promise<any>) {}

  async generateProse(request: ProseGenerationRequest): Promise<ProseGenerationResult> {
    const result = await this.generator(
      request.project,
      request.chapter,
      {
        ...request.modelContext,
        paragraphTask: request.paragraphTask,
        promptDiagnostics: request.promptDiagnostics,
        contextPackage: request.contextPackage,
        boundedProseContract: true,
        maxTokens: request.maxTokens,
        temperature: request.temperature,
        abortSignal: request.signal,
      },
      {
        activeWorkspace: request.activeWorkspace,
        modelId: String(request.modelId || ''),
        skipMemoryStore: true,
      },
    )
    const { source_receipt: _untrustedSourceReceipt, ...safeResult } = result || {}
    return { ...safeResult, source: 'model' }
  }
}
