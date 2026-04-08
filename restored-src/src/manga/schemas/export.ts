import { z } from 'zod/v4'
import { SUPPORTED_EXPORT_FORMATS } from '../constants.js'

export const EpisodeExportRequestSchema = z.object({
  episodeId: z.string().min(1),
  format: z.enum(SUPPORTED_EXPORT_FORMATS),
  includePrompts: z.boolean().default(true),
  includeDialogue: z.boolean().default(true),
})

export const EpisodeExportResultSchema = z.object({
  episodeId: z.string().min(1),
  format: z.enum(SUPPORTED_EXPORT_FORMATS),
  outputPath: z.string().min(1),
  generatedAt: z.string().datetime(),
})

export type EpisodeExportRequest = z.infer<typeof EpisodeExportRequestSchema>
export type EpisodeExportResult = z.infer<typeof EpisodeExportResultSchema>
