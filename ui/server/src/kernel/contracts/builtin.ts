import type { KernelContract } from './schema'

const reviewFull: KernelContract = {
  schema_version: 1,
  id: 'oh-story-core.story-review.full',
  pack_id: 'oh-story-core',
  skill_name: 'story-review',
  variant: 'full',
  capability: 'review',
  label: 'oh-story 完整审稿',
  invoke: {
    mention: '$story-review',
    prompt: [
      '审查范围：{{scope_files}}',
      '模式：full',
      '上一章：{{previous_chapter_file}}',
      '若大纲与正文进度不齐：在报告标 S2，写清先改大纲还是先改后文。',
      '不要改本章正文。',
      '报告写到 {{report_path}}',
      '若 Fallback 到 solo：必须在报告第一行写明原因。',
    ].join('\n'),
  },
  projection: { mounts: ['current_chapter', 'previous_chapter', 'outline', 'characters', 'world', 'tracking', 'skill_tree', 'agents'] },
  outputs: [
    { artifact_kind: 'review_report', glob: '审稿/第{{chapter_pad}}章.md', fallback: 'last_message', binding: 'reviews.oh_story_review', required: true },
    { artifact_kind: 'tracking_doc', glob: '追踪/**/*.md', binding: 'kernel_only', required: false },
  ],
  write_scope: ['审稿/', '追踪/'],
  ignore: ['.story-review/'],
  gates: ['reject_solo_fallback', 'require_reviewer_agents'],
  commit: { mode: 'auto_if_single', domain_writes: ['reviews'] },
  sandbox: 'workspace-write',
  approval: 'never',
}

const deslopFile: KernelContract = {
  schema_version: 1,
  id: 'oh-story-core.story-deslop.file',
  pack_id: 'oh-story-core',
  skill_name: 'story-deslop',
  variant: 'file',
  capability: 'rewrite',
  label: 'oh-story 去AI（文件模式）',
  invoke: {
    mention: '$story-deslop',
    prompt: [
      '目标文件：{{scope_files}}',
      '文件模式：直接编辑目标文件完成去AI润色；按 SKILL.md 的检测、定级与 Gate 流程执行，必要时运行 skill 自带脚本。',
      '不要把润色结果只写在回复里，必须写回目标文件。',
      '不要修改 追踪/ 与 大纲/。',
    ].join('\n'),
  },
  projection: { mounts: ['current_chapter', 'skill_tree', 'agents'] },
  outputs: [
    { artifact_kind: 'chapter_text', glob: '正文/第{{chapter_pad}}章_*.md', binding: 'chapters.rewrite', required: true },
  ],
  write_scope: ['正文/'],
  ignore: ['.story-review/'],
  gates: ['require_chapter_file'],
  commit: { mode: 'auto_if_single', domain_writes: ['chapters', 'chapter_versions'], source: 'oh_story_deslop' },
  sandbox: 'workspace-write',
  approval: 'never',
}

const applySurgical: KernelContract = {
  schema_version: 1,
  id: 'oh-story-core.story-apply.surgical',
  pack_id: 'oh-story-core',
  skill_name: 'story-apply',
  variant: 'surgical',
  capability: 'rewrite',
  label: '按建议改稿（外科手术式）',
  invoke: {
    mention: '',
    prompt: [
      '按 改稿/指令.md 执行外科手术式修改：只落实审稿报告中的可执行「修改建议」，禁止整章重写、禁止风格通篇抛光。',
      '审稿报告：{{review_path}}',
      '目标文件：{{scope_files}}',
      '直接编辑目标文件。',
    ].join('\n'),
  },
  projection: { mounts: ['current_chapter', 'previous_chapter', 'review_report', 'skill_tree', 'agents'] },
  outputs: [
    { artifact_kind: 'chapter_text', glob: '正文/第{{chapter_pad}}章_*.md', binding: 'chapters.rewrite', required: true },
  ],
  write_scope: ['正文/'],
  ignore: ['.story-review/'],
  gates: ['require_matching_review', 'paragraph_retention_70', 'require_chapter_file'],
  commit: { mode: 'auto_if_single', domain_writes: ['chapters', 'chapter_versions'], source: 'oh_story_apply' },
  sandbox: 'workspace-write',
  approval: 'never',
}

const longWriteOutline: KernelContract = {
  schema_version: 1,
  id: 'oh-story-core.story-long-write.outline',
  pack_id: 'oh-story-core',
  skill_name: 'story-long-write',
  variant: 'outline',
  capability: 'outline',
  label: 'oh-story 长篇细纲（未实现）',
  invoke: { mention: '$story-long-write', prompt: '细纲工作流：{{scope_files}}（第一期不执行）' },
  projection: { mounts: ['outline', 'skill_tree'] },
  outputs: [
    { artifact_kind: 'outline_doc', glob: '大纲/**/*.md', binding: 'outlines.replace', required: true },
  ],
  write_scope: ['大纲/'],
  gates: [],
  commit: { mode: 'manual', domain_writes: ['outlines'] },
  sandbox: 'workspace-write',
  approval: 'never',
}

export const BUILTIN_KERNEL_CONTRACTS: KernelContract[] = [reviewFull, deslopFile, applySurgical, longWriteOutline]

export function isBuiltinKernelContractId(id: string): boolean {
  return BUILTIN_KERNEL_CONTRACTS.some(contract => contract.id === id)
}
