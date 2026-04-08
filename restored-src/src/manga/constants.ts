export const STORY_PROJECT_DIR = '.story-project'

export const STORY_PROJECT_PATHS = {
  seriesFile: 'series.yaml',
  styleGuideFile: 'style-guide.md',
  charactersDir: 'characters',
  episodesDir: 'episodes',
} as const

export const STORYBOARD_VERSION = '1.0.0'

export const SUPPORTED_EXPORT_FORMATS = ['json', 'md', 'csv', 'zip'] as const

export type SupportedExportFormat = (typeof SUPPORTED_EXPORT_FORMATS)[number]
