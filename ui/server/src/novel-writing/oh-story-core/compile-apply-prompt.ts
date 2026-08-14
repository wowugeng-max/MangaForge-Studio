export function compileOhStoryApplyPrompt(input: {
  projectTitle: string
  chapterText: string
  reportText: string
}): string {
  return [
    '【执行模式】solo。不要 spawn 子 agent，不要读写 .novel/。',
    `项目：${input.projectTitle}`,
    '按建议改稿：只改审稿报告「修改建议」里的可执行条目（优化/微调/删/补/改）。写着「保持」「不要改」的条目不要动。Findings、格式勾选、基础检查只作证据，不要当成改稿指令。未点名的句子和段落必须原样保留，禁止整章重写、禁止通篇换词抛光。不要另加系统理论课，不要输出新的审查报告。',
    '完整修订正文必须放在「### 修订后全文」之后。MangaForge 只把这一段写入章节。',
    '【原文】',
    input.chapterText,
    '【审稿报告】',
    input.reportText,
  ].join('\n')
}
