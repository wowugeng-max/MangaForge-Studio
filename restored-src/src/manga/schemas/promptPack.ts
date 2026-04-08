import { z } from 'zod/v4'

export const PromptShotSchema = z.object({
  shotId: z.string().min(1),
  positivePrompt: z.string().min(1),
  negativePrompt: z.string().min(1),
  characterLocks: z.array(z.string().min(1)).default([]),
  cameraTags: z.array(z.string().min(1)).default([]),
})

export const PromptPackSchema = z.object({
  episodeId: z.string().min(1),
  stylePreset: z.string().min(1),
  consistencyLevel: z.enum(['low', 'medium', 'high']).default('high'),
  shots: z.array(PromptShotSchema).min(1),
  generatedAt: z.string().datetime(),
})

export type PromptPack = z.infer<typeof PromptPackSchema>
