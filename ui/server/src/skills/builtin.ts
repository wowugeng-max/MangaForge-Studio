import type { SkillManifest } from './types'

/** The legacy prompt-engineer role, exposed as an inert prompt-only Skill. */
export const builtinPromptSkill: SkillManifest = {
  packId: 'builtin',
  revision: 'builtin-v1',
  name: 'prompt-optimizer',
  directoryName: 'prompt-optimizer',
  description: 'Turn a rough idea into a detailed English image or video prompt.',
  arguments: [],
  userInvocable: true,
  triggerWords: [],
  mediaModes: ['text_to_image', 'image_to_image', 'text_to_video', 'image_to_video'],
  compatibility: 'prompt_ready',
  rootDir: 'builtin://prompt-optimizer',
  body: '你是顶级 Prompt Engineer。把输入转化为极致详细的英文 Prompt，并给出负面 Prompt。',
  references: [],
}

