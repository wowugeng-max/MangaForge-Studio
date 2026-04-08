import { z } from 'zod/v4'

export const EpisodeBeatSchema = z.object({
  beatId: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  conflict: z.string().optional(),
})

export const EpisodeSceneSchema = z.object({
  sceneId: z.string().min(1),
  location: z.string().min(1),
  summary: z.string().min(1),
  mood: z.string().optional(),
  cast: z.array(z.string().min(1)).default([]),
})

export const EpisodeSchema = z.object({
  episodeId: z.string().min(1),
  title: z.string().min(1),
  premise: z.string().min(1),
  logline: z.string().min(1).optional(),
  estimatedPanels: z.number().int().positive().optional(),
  beats: z.array(EpisodeBeatSchema).default([]),
  scenes: z.array(EpisodeSceneSchema).default([]),
  notes: z.string().optional(),
})

export type Episode = z.infer<typeof EpisodeSchema>
