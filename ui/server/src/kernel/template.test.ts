import { describe, expect, test } from 'bun:test'
import { IMPLEMENTED_CAPABILITIES, REGISTERED_ARTIFACT_KINDS } from './artifact-kinds'
import { findUnknownVariables, renderKernelTemplate, type KernelPromptVars } from './template'

const vars: KernelPromptVars = {
  scope_files: '正文/第062章_违背规则的绝对防御.md',
  chapter_no: '62',
  chapter_pad: '062',
  chapter_title: '违背规则的绝对防御',
  previous_chapter_file: '正文/第061章_上一章.md',
  report_path: '审稿/第062章.md',
  review_path: '审稿/第062章.md',
  skill_name: 'story-review',
  user_brief_file: '',
}

describe('kernel template', () => {
  test('renders whitelisted variables', () => {
    expect(renderKernelTemplate('审稿/第{{chapter_pad}}章.md', vars)).toBe('审稿/第062章.md')
    expect(renderKernelTemplate('范围：{{scope_files}}，上一章：{{previous_chapter_file}}', vars))
      .toBe('范围：正文/第062章_违背规则的绝对防御.md，上一章：正文/第061章_上一章.md')
  })

  test('unknown variable is reported and throws on render', () => {
    expect(findUnknownVariables('x {{chapter_pad}} y {{bogus_var}}')).toEqual(['bogus_var'])
    expect(() => renderKernelTemplate('{{bogus_var}}', vars)).toThrow(/bogus_var/)
  })

  test('flags digit and uppercase tokens that the lowercase charset would miss', () => {
    expect(findUnknownVariables('x {{chapter2}} y {{Chapter_Pad}} z')).toEqual(['chapter2', 'Chapter_Pad'])
    expect(() => renderKernelTemplate('{{chapter2}}', vars)).toThrow(/chapter2/)
  })

  test('artifact kind registry is locked', () => {
    expect([...REGISTERED_ARTIFACT_KINDS]).toEqual(['review_report', 'tracking_doc', 'chapter_text', 'outline_doc', 'attachment', 'world_doc', 'character_sheet', 'contract_json'])
    expect([...IMPLEMENTED_CAPABILITIES]).toEqual(['review', 'rewrite', 'tracking', 'attachment'])
  })
})
