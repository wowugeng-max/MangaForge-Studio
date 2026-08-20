import type { KernelContract } from './schema'

const reviewFull: KernelContract = {
  schema_version: 1,
  id: 'oh-story-core.story-review.full',
  pack_id: 'oh-story-core',
  skill_name: 'story-review',
  variant: 'full',
  verb: 'review_chapter',
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
  gates: ['reject_solo_fallback', 'require_spawn_evidence', 'require_reviewer_agents', 'require_chapter_file', 'reject_chapter_text_artifact'],
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
  verb: 'deslop_chapter',
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
  gates: ['require_chapter_file', 'reject_outline_artifact'],
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
  verb: 'apply_review',
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

const longWriteOpen: KernelContract = {
  schema_version: 1,
  id: 'oh-story-core.story-long-write.open',
  pack_id: 'oh-story-core',
  skill_name: 'story-long-write',
  variant: 'open',
  verb: 'open_book',
  capability: 'outline',
  label: '深度孵化（oh-story 开书）',
  invoke: {
    mention: '$story-long-write',
    prompt: [
      '帮我开书。',
      '创作创意见 {{user_brief_file}}，以它为唯一选题输入。',
      '执行开书流程 Phase 1→2→3：题材定位与核心设定写入 设定/，卷纲与首批章节细纲写入 大纲/。',
      '产物必须写在工作区根目录的 设定/ 与 大纲/ 下，不要再建书名或项目名子目录。',
      '默认停在细纲交付：不要写正文，不要创建 正文/ 目录下的任何文件，不要进入单章写作。',
      '至少交付：一份总纲或卷纲、一份章细纲、一份世界观文件、一份角色档案。',
    ].join('\n'),
  },
  projection: { mounts: ['user_brief', 'skill_tree', 'agents'] },
  outputs: [
    { artifact_kind: 'character_sheet', glob: '设定/角色/*.md', binding: 'characters.upsert', required: true },
    { artifact_kind: 'outline_doc', glob: '大纲/**/*.md', binding: 'outlines.upsert', required: true },
    { artifact_kind: 'world_doc', glob: '设定/**/*.md', binding: 'worldbuilding.upsert', required: true },
    { artifact_kind: 'tracking_doc', glob: '追踪/**/*.md', binding: 'kernel_only', required: false },
  ],
  write_scope: ['设定/', '大纲/', '追踪/'],
  ignore: ['.story-review/'],
  gates: ['reject_chapter_text_artifact', 'require_outline_mix'],
  commit: { mode: 'manual', domain_writes: ['worldbuilding', 'characters', 'outlines'] },
  sandbox: 'workspace-write',
  approval: 'never',
}

const longWriteExpand: KernelContract = {
  schema_version: 1,
  id: 'oh-story-core.story-long-write.expand',
  pack_id: 'oh-story-core',
  skill_name: 'story-long-write',
  variant: 'expand',
  verb: 'expand_outline',
  capability: 'outline',
  label: '扩写大纲',
  invoke: {
    mention: '$story-long-write',
    prompt: [
      '扩写大纲。',
      '在现有 大纲/ 与 设定/ 上新增或修改细纲、卷纲；至少改一份 大纲/ 下的 markdown。',
      '可以更新 设定/ 世界观或角色档案。',
      '不要写正文，不要创建 正文/ 下的任何文件。',
      '不要删除或整份替换已有总纲文件名为目的；用修改或新增文件表达扩写。',
    ].join('\n'),
  },
  projection: { mounts: ['outline', 'world', 'characters', 'tracking', 'skill_tree', 'agents'] },
  outputs: [
    { artifact_kind: 'character_sheet', glob: '设定/角色/*.md', binding: 'characters.upsert', required: false },
    { artifact_kind: 'outline_doc', glob: '大纲/**/*.md', binding: 'outlines.upsert', required: true },
    { artifact_kind: 'world_doc', glob: '设定/**/*.md', binding: 'worldbuilding.upsert', required: false },
    { artifact_kind: 'tracking_doc', glob: '追踪/**/*.md', binding: 'kernel_only', required: false },
  ],
  write_scope: ['设定/', '大纲/', '追踪/'],
  ignore: ['.story-review/'],
  gates: ['reject_chapter_text_artifact'],
  commit: { mode: 'manual', domain_writes: ['worldbuilding', 'characters', 'outlines'] },
  sandbox: 'workspace-write',
  approval: 'never',
}

const longWriteChapter: KernelContract = {
  schema_version: 1,
  id: 'oh-story-core.story-long-write.chapter',
  pack_id: 'oh-story-core',
  skill_name: 'story-long-write',
  variant: 'chapter',
  verb: 'write_chapter',
  capability: 'rewrite',
  label: '写本章',
  invoke: {
    mention: '$story-long-write',
    prompt: [
      '写第 {{chapter_no}} 章《{{chapter_title}}》。',
      '执行单章写作 Phase 4；写完后做 Phase 5 检查，然后停止。',
      '只改 {{scope_files}}（本章正文）。可以更新 追踪/ 下与本章相关的记录。',
      '不要开书，不要扩纲，不要写其他章，不要修改 大纲/，不要创建其它 正文/ 文件。',
      '字数目标见 {{user_brief_file}} 的「体量」一行；体量为（未定）时按 skill 单章字数规范执行。',
      '不要把正文只写在回复里，必须写回目标文件。',
    ].join('\n'),
  },
  projection: {
    mounts: ['current_chapter', 'previous_chapter', 'outline', 'world', 'characters', 'tracking', 'skill_tree', 'agents', 'user_brief'],
  },
  outputs: [
    { artifact_kind: 'chapter_text', glob: '正文/第{{chapter_pad}}章_*.md', binding: 'chapters.rewrite', required: true },
    { artifact_kind: 'tracking_doc', glob: '追踪/**/*.md', binding: 'kernel_only', required: false },
  ],
  write_scope: ['正文/', '追踪/'],
  ignore: ['.story-review/'],
  gates: ['require_chapter_file', 'reject_outline_artifact'],
  commit: { mode: 'auto_if_single', domain_writes: ['chapters', 'chapter_versions'], source: 'oh_story_write' },
  sandbox: 'workspace-write',
  approval: 'never',
}

const longWriteRewrite: KernelContract = {
  schema_version: 1,
  id: 'oh-story-core.story-long-write.rewrite',
  pack_id: 'oh-story-core',
  skill_name: 'story-long-write',
  variant: 'rewrite',
  verb: 'rewrite_chapter',
  capability: 'rewrite',
  label: '回炉重写',
  invoke: {
    mention: '$story-long-write',
    prompt: [
      '重写第 {{chapter_no}} 章《{{chapter_title}}》。',
      '在已有正文上整章重写；写完后做 Phase 5 检查，然后停止。',
      '只改 {{scope_files}}（本章正文）。可以更新 追踪/ 下与本章相关的记录。',
      '不要开书，不要扩纲，不要写其他章，不要修改 大纲/，不要创建其它 正文/ 文件。',
      '字数目标见 {{user_brief_file}} 的「体量」一行；体量为（未定）时按 skill 单章字数规范执行。',
      '不要把正文只写在回复里，必须写回目标文件。',
    ].join('\n'),
  },
  projection: {
    mounts: ['current_chapter', 'previous_chapter', 'outline', 'world', 'characters', 'tracking', 'skill_tree', 'agents', 'user_brief'],
  },
  outputs: [
    { artifact_kind: 'chapter_text', glob: '正文/第{{chapter_pad}}章_*.md', binding: 'chapters.rewrite', required: true },
    { artifact_kind: 'tracking_doc', glob: '追踪/**/*.md', binding: 'kernel_only', required: false },
  ],
  write_scope: ['正文/', '追踪/'],
  ignore: ['.story-review/'],
  gates: ['require_chapter_file', 'reject_outline_artifact'],
  commit: { mode: 'manual', domain_writes: ['chapters', 'chapter_versions'], source: 'oh_story_rewrite' },
  sandbox: 'workspace-write',
  approval: 'never',
}

const longWriteContinue: KernelContract = {
  schema_version: 1,
  id: 'oh-story-core.story-long-write.continue',
  pack_id: 'oh-story-core',
  skill_name: 'story-long-write',
  variant: 'continue',
  verb: 'write_continue',
  capability: 'rewrite',
  label: '续写',
  invoke: {
    mention: '$story-long-write',
    prompt: [
      '续写第 {{chapter_no}} 章（{{chapter_title}}）。',
      '从上一章 {{previous_chapter_file}} 接着写；写完后做 Phase 5 检查，然后停止。',
      '只改 {{scope_files}}（窗口内正文）。可以更新 追踪/ 下与这些章相关的记录。',
      '不要开书，不要扩纲，不要修改 大纲/，不要写窗口以外的 正文/ 文件，不要改 参考/。',
      '字数目标见 {{user_brief_file}} 的「体量」一行；体量为（未定）时按 skill 单章字数规范执行。',
      '不要把正文只写在回复里，必须写回目标文件。',
    ].join('\n'),
  },
  projection: {
    mounts: ['continue_window', 'continue_previous', 'outline', 'world', 'characters', 'tracking', 'skill_tree', 'agents', 'user_brief'],
  },
  outputs: [
    { artifact_kind: 'chapter_text', glob: '正文/第*.md', binding: 'chapters.rewrite', required: true },
    { artifact_kind: 'tracking_doc', glob: '追踪/**/*.md', binding: 'kernel_only', required: false },
  ],
  write_scope: ['正文/', '追踪/'],
  ignore: ['.story-review/'],
  gates: ['require_chapter_file', 'reject_outline_artifact'],
  commit: { mode: 'auto_if_single', domain_writes: ['chapters', 'chapter_versions'], source: 'oh_story_continue' },
  sandbox: 'workspace-write',
  approval: 'never',
}

export const BUILTIN_KERNEL_CONTRACTS: KernelContract[] = [reviewFull, deslopFile, applySurgical, longWriteOutline, longWriteOpen, longWriteExpand, longWriteChapter, longWriteRewrite, longWriteContinue]

export function isBuiltinKernelContractId(id: string): boolean {
  return BUILTIN_KERNEL_CONTRACTS.some(contract => contract.id === id)
}
