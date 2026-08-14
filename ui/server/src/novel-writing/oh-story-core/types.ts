export const OH_STORY_CORE_SOURCE_URL = 'https://github.com/worldwonderer/oh-story-claudecode'
export const OH_STORY_CORE_SKILL_IDS = ['story-review', 'story-deslop', 'story-long-write'] as const

export type OhStoryCoreSkillId = typeof OH_STORY_CORE_SKILL_IDS[number]

export type OhStoryCoreSkill = {
  skill_markdown: string
  references: Array<{ file: string; text: string }>
}

export type OhStoryCoreSuite = {
  source_url: string
  revision: string
  installed_at: string
  skills: Record<string, OhStoryCoreSkill>
}
