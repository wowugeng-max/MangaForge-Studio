import { z } from 'zod/v4'
import { STORYBOARD_VERSION } from '../constants.js'

export const ShotSchema = z.object({
  shotId: z.string().min(1),
  sceneId: z.string().min(1),
  panelOrder: z.number().int().positive(),
  camera: z.string().min(1),
  composition: z.string().min(1),
  action: z.string().min(1),
  dialogue: z.array(z.string().min(1)).default([]),
  sfx: z.array(z.string().min(1)).default([]),
  emotion: z.string().optional(),
})

export const StoryboardSchema = z.object({
  version: z.string().default(STORYBOARD_VERSION),
  episodeId: z.string().min(1),
  title: z.string().min(1),
  stylePreset: z.string().optional(),
  shots: z.array(ShotSchema).min(1),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
})

export type Shot = z.infer<typeof ShotSchema>
export type Storyboard = z.infer<typeof StoryboardSchema>
