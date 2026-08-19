export function collapseRewriteChapterArtifacts<T extends { rel_path: string; artifact_kind: string }>(input: {
  capability: string
  subjectType: string
  currentRel: string
  artifacts: T[]
}): { ok: true; artifacts: T[] } | { ok: false; code: 'OUTPUT_MISSING'; message: string } {
  if (input.capability !== 'rewrite' || input.subjectType !== 'chapter' || !input.currentRel) {
    return { ok: true, artifacts: input.artifacts }
  }
  const texts = input.artifacts.filter(a => a.artifact_kind === 'chapter_text')
  if (texts.length <= 1) return { ok: true, artifacts: input.artifacts }
  const preferred = texts.find(a => a.rel_path === input.currentRel)
  if (preferred) {
    return {
      ok: true,
      artifacts: input.artifacts.map(a => (
        a.artifact_kind === 'chapter_text' && a.rel_path !== input.currentRel
          ? { ...a, artifact_kind: 'attachment' }
          : a
      )),
    }
  }
  return {
    ok: false,
    code: 'OUTPUT_MISSING',
    message: `ambiguous chapter_text: ${texts.map(a => a.rel_path).join(', ')}`,
  }
}
