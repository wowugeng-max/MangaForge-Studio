import { parseChapterNoFromRelPath } from '../jobs/domain-upsert'

export function collapseContinueChapterArtifacts<T extends { rel_path: string; artifact_kind: string }>(input: {
  windowNos: number[]
  projectedRel: Record<number, string>
  artifacts: T[]
}): { ok: true; artifacts: T[] } | { ok: false; code: 'OUTPUT_MISSING'; message: string } {
  const windowSet = new Set(input.windowNos)
  const keep = new Set<string>()
  for (const no of input.windowNos) {
    const hits = input.artifacts.filter((a) => (
      a.artifact_kind === 'chapter_text' && parseChapterNoFromRelPath(a.rel_path) === no
    ))
    if (hits.length === 0) {
      return { ok: false, code: 'OUTPUT_MISSING', message: `missing chapter_text for 第${no}章` }
    }
    const projected = input.projectedRel[no]
    const preferred = hits.find(a => a.rel_path === projected) || (hits.length === 1 ? hits[0] : null)
    if (!preferred) {
      return {
        ok: false,
        code: 'OUTPUT_MISSING',
        message: `ambiguous chapter_text: ${hits.map(a => a.rel_path).join(', ')}`,
      }
    }
    keep.add(preferred.rel_path)
  }
  return {
    ok: true,
    artifacts: input.artifacts.map((a) => {
      if (a.artifact_kind !== 'chapter_text') return a
      if (keep.has(a.rel_path)) return a
      const no = parseChapterNoFromRelPath(a.rel_path)
      if (no == null || !windowSet.has(no) || !keep.has(a.rel_path)) {
        return { ...a, artifact_kind: 'attachment' as T['artifact_kind'] }
      }
      return a
    }),
  }
}
