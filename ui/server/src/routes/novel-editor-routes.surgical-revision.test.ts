import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  buildReviewAnnotations,
  buildReviewAnnotationRepairTasks,
  buildStorylineDiffDecisionRepairTasks,
  buildChapterDeliveryRiskBrief,
  buildChapterQualityCard,
  buildDeliveryRiskConvergenceReport,
  buildEditorReportPrompt,
  buildCompactEditorRevisionPrompt,
  buildEditorRevisionPrompt,
  buildStorylineDiffDecisionReviewPayload,
  applySurgicalRevisionPatch,
  isRevisionOutputTruncated,
} from './novel-editor-routes'


function editorBuildersSource() {
  const dir = join(import.meta.dir, 'novel-editor')
  return [
    'builders.ts',
    'builders-annotations.ts',
    'builders-annotations-prose-quality.ts',
    'builders-annotations-delivery-risk.ts',
    'builders-annotations-repair-tasks.ts',
  ].map(name => readFileSync(join(dir, name), 'utf8')).join('\n')
}
describe('applySurgicalRevisionPatch', () => {
  test('applies deletion replacements returned by revision patches', () => {
    const originalText = '他心里有一种说不清道不明的感觉。\n\n门外传来脚步声。'

    const result = applySurgicalRevisionPatch(originalText, {
      revision_mode: 'patch',
      replacements: [
        { find: '他心里有一种说不清道不明的感觉。\n\n', replace: '' },
      ],
      revision_summary: '删除抽象重复描写。',
    })

    expect(result.chapterText).toBe('门外传来脚步声。')
    expect(result.applied).toHaveLength(1)
    expect(result.applied[0]).toMatchObject({ type: 'replacement' })
    expect(result.unapplied).toEqual([])
  })

  test('matches replacement anchors across whitespace differences', () => {
    const originalText = '丁松言醒来的时候，嘴里全是石灰和木屑的味道。他撑着地面坐起来，指尖按进泥里。'

    const result = applySurgicalRevisionPatch(originalText, {
      revision_mode: 'patch',
      replacements: [
        {
          find: '丁松言醒来的时候，嘴里全是石灰和木屑的味道。\n\n他撑着地面坐起来，指尖按进泥里。',
          replace: '丁松言醒来时，嘴里全是石灰和木屑的味道。他撑着地面坐起，指尖按进泥里。',
        },
      ],
    })

    expect(result.chapterText).toBe('丁松言醒来时，嘴里全是石灰和木屑的味道。他撑着地面坐起，指尖按进泥里。')
    expect(result.applied[0]).toMatchObject({ type: 'replacement', match: 'normalized_whitespace' })
    expect(result.unapplied).toEqual([])
  })
})

