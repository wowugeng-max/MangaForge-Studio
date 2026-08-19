export function writeChapterLengthTarget(payload: { word_target_mode?: string; target_word_count?: number }): string {
  if (payload.word_target_mode === 'custom' && Number(payload.target_word_count) > 0) {
    return `自定义 ${Number(payload.target_word_count)} 字`
  }
  if (payload.word_target_mode) return `word_target_mode=${payload.word_target_mode}`
  return ''
}
