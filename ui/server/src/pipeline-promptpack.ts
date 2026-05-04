import { generatePromptPack } from '../../../restored-src/src/manga/services/promptService.js'

export async function runPromptPack(activeWorkspace: string, payload: any) {
  return generatePromptPack({
    baseDir: activeWorkspace,
    episodeId: payload.episodeId ?? 'ep-002',
    stylePreset: payload.stylePreset ?? payload.style ?? 'cinematic noir manga',
    consistencyLevel: payload.consistencyLevel ?? payload.consistency ?? 'high',
  })
}
