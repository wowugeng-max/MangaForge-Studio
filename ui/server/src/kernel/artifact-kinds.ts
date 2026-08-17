export const REGISTERED_ARTIFACT_KINDS = ['review_report', 'tracking_doc', 'chapter_text', 'outline_doc', 'attachment', 'world_doc', 'character_sheet', 'contract_json'] as const
export const IMPLEMENTED_CAPABILITIES = ['review', 'rewrite', 'tracking', 'attachment'] as const
export const ALL_CAPABILITIES = ['review', 'rewrite', 'outline', 'tracking', 'prompt', 'media', 'attachment'] as const
export type KernelCapability = (typeof ALL_CAPABILITIES)[number]
