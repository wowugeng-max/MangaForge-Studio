export function getModelStrategy(project: any, preferredModelId?: number) {
  return {
    preferred_model_id: preferredModelId || null,
    stages: {
      incubation: { model_id: preferredModelId || null, temperature: 0.65, reason: '原创孵化需要创意和结构稳定性平衡。' },
      outline: { model_id: preferredModelId || null, temperature: 0.45, reason: '大纲和分卷要求结构一致性。' },
      scene_cards: { model_id: preferredModelId || null, temperature: 0.45, reason: '场景卡需要可控，不宜过度发散。' },
      draft: { model_id: preferredModelId || null, temperature: 0.75, reason: '正文初稿需要保留表达弹性。' },
      review: { model_id: preferredModelId || null, temperature: 0.2, reason: '审稿需要低温、稳定和可复现。' },
      revise: { model_id: preferredModelId || null, temperature: 0.62, reason: '修订需要遵循问题清单，同时保留文气。' },
      safety: { model_id: preferredModelId || null, temperature: 0.15, reason: '仿写安全审计需要保守判断。' },
    },
    cost_policy: {
      low_cost_mode: project.reference_config?.model_strategy?.low_cost_mode !== false,
      retry_limit: Number(project.reference_config?.model_strategy?.retry_limit || 2),
      fallback_enabled: project.reference_config?.model_strategy?.fallback_enabled !== false,
    },
  }
}

export function getStageModelId(project: any, stage: string, preferredModelId?: number) {
  const strategy = project.reference_config?.model_strategy || getModelStrategy(project, preferredModelId)
  return Number(strategy?.stages?.[stage]?.model_id || strategy?.preferred_model_id || preferredModelId || 0) || undefined
}

export function getStageTemperature(project: any, stage: string, fallback: number) {
  const value = Number(project.reference_config?.model_strategy?.stages?.[stage]?.temperature)
  return Number.isFinite(value) && value > 0 ? value : fallback
}
