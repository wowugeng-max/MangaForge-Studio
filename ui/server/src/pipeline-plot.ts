import { generatePlotBeat } from '../../../restored-src/src/manga/services/plotService.js'

const DEFAULT_PLOT = {
  episodeId: 'ep-002',
  title: '雨夜失踪案·上',
  premise: '记者林岚在旧城区调查连续失踪案，线人何烬提供关键线索后突然失联。',
  beatFramework: 'three-act' as const,
  targetLength: 12,
}

export async function runPlot(activeWorkspace: string, payload: any) {
  return generatePlotBeat({
    baseDir: activeWorkspace,
    episodeId: payload.episodeId ?? DEFAULT_PLOT.episodeId,
    title: payload.title ?? DEFAULT_PLOT.title,
    premise: payload.premise ?? DEFAULT_PLOT.premise,
    beatFramework: payload.beatFramework ?? payload.framework ?? DEFAULT_PLOT.beatFramework,
    targetLength: Number(payload.panels ?? payload.targetLength ?? DEFAULT_PLOT.targetLength),
  })
}
