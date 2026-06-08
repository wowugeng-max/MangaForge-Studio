function firstPresent(values: unknown[]) {
  return values.find(value => value !== undefined && value !== null && String(value).trim() !== '')
}

function firstOutputFile(source: any) {
  const files = Array.isArray(source?.output_files)
    ? source.output_files
    : Array.isArray(source?.outputFiles)
      ? source.outputFiles
      : Array.isArray(source?.segment_outputs)
        ? source.segment_outputs
        : Array.isArray(source?.segmentOutputs)
          ? source.segmentOutputs
          : []
  return files.find((file: any) => firstPresent([
    file?.media_url,
    file?.mediaUrl,
    file?.url,
    file?.file_url,
    file?.fileUrl,
    file?.path,
  ])) || null
}

export function pickMediaResultContent(source: any): string {
  if (!source || typeof source !== 'object') return ''
  const firstFile = firstOutputFile(source)
  const value = firstPresent([
    source.content,
    source.url,
    source.file_path,
    source.filePath,
    source.media_url,
    source.mediaUrl,
    source.final_video,
    source.finalVideo,
    source.output_url,
    source.outputUrl,
    source.download_url,
    source.downloadUrl,
    firstFile?.media_url,
    firstFile?.mediaUrl,
    firstFile?.url,
    firstFile?.file_url,
    firstFile?.fileUrl,
    firstFile?.path,
  ])
  return value === undefined || value === null ? '' : String(value)
}
