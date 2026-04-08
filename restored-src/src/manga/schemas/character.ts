import { z } from 'zod/v4'

export const CharacterLookAnchorSchema = z.object({
  silhouette: z.string().min(1),
  palette: z.array(z.string().min(1)).min(1),
  keyProps: z.array(z.string().min(1)).default([]),
})

export const CharacterSpeechStyleSchema = z.object({
  tone: z.string().min(1),
  catchphrases: z.array(z.string().min(1)).default([]),
  bannedPhrases: z.array(z.string().min(1)).default([]),
})

export const CharacterSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  ageRange: z.string().min(1).optional(),
  background: z.string().min(1).optional(),
  personalityTags: z.array(z.string().min(1)).default([]),
  lookAnchor: CharacterLookAnchorSchema,
  speechStyle: CharacterSpeechStyleSchema,
  relationships: z.array(z.string().min(1)).default([]),
  notes: z.string().optional(),
})

export const CharacterListSchema = z.array(CharacterSchema)

export type Character = z.infer<typeof CharacterSchema>
