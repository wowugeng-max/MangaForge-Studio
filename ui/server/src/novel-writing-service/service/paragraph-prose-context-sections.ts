import {
  buildBoundedProsePrompt,
} from '../../novel-writing/prose-prompt-context'
import {
  buildParagraphProsePromptLeadSections,
} from './paragraph-prose-context-sections-lead'
import {
  buildParagraphProsePromptBodySections,
} from './paragraph-prose-context-sections-body'
import {
  buildParagraphProsePromptTailSections,
} from './paragraph-prose-context-sections-tail'

export function buildParagraphProsePromptSections(ctx: any) {
  return buildBoundedProsePrompt([
    ...buildParagraphProsePromptLeadSections(ctx),
    ...buildParagraphProsePromptBodySections(ctx),
    ...buildParagraphProsePromptTailSections(ctx),
  ])
}
