import { exportEpisode } from '../../../restored-src/src/manga/services/exportService.js'

export async function runExport(activeWorkspace: string, payload: any) {
  const episodeId = payload.episodeId ?? 'ep-002'
  const requested = String(payload.format ?? 'all')
  if (requested === 'all') {
    const results = await Promise.all([
      exportEpisode({ episodeId, format: 'json', includeDialogue: true, includePrompts: true }, activeWorkspace),
      exportEpisode({ episodeId, format: 'md', includeDialogue: true, includePrompts: true }, activeWorkspace),
      exportEpisode({ episodeId, format: 'csv', includeDialogue: true, includePrompts: true }, activeWorkspace),
      exportEpisode({ episodeId, format: 'zip', includeDialogue: true, includePrompts: true }, activeWorkspace),
    ])
    return { mode: 'all', results }
  }
  return exportEpisode(
    { episodeId, format: requested as 'json' | 'md' | 'csv' | 'zip', includeDialogue: true, includePrompts: true },
    activeWorkspace,
  )
}
