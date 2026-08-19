import { describe, expect, test } from 'bun:test'
import { getVerbTemplate, IMPLEMENTED_VERBS, loadVerbTemplates } from './registry'

describe('verb template registry', () => {
  test('loads all 9 templates and validates them', () => {
    const templates = loadVerbTemplates()
    expect([...templates.keys()].sort()).toEqual([
      'adapt_pack', 'apply_review', 'deslop_chapter', 'expand_outline',
      'open_book', 'review_chapter', 'rewrite_chapter', 'write_chapter', 'write_continue',
    ])
  })
  test('open_book template locks minimum deliverables', () => {
    const t = getVerbTemplate('open_book')!
    expect(t.subject_type).toBe('project')
    expect(t.capability).toBe('outline')
    expect(t.required_kinds).toEqual([
      { kind: 'world_doc', min: 1 },
      { kind: 'character_sheet', min: 1 },
      { kind: 'outline_doc', min: 2 },
    ])
    expect(t.forbidden_required_kinds).toEqual(['chapter_text', 'review_report'])
    expect(t.forbidden_domain_writes).toEqual(['chapters', 'reviews'])
    expect(t.template_gates).toEqual(['reject_chapter_text_artifact', 'require_outline_mix'])
    expect(t.commit_mode).toBe('manual')
    expect(t.mention_policy).toBe('required')
    expect(t.allowed_replace_bindings).toBe(false)
  })
  test('apply_review keeps the 70% retention as verb-level gate', () => {
    const t = getVerbTemplate('apply_review')!
    expect(t.template_gates).toEqual(['require_chapter_file', 'require_matching_review', 'paragraph_retention_70'])
    expect(t.mention_policy).toBe('optional')
  })
  test('implemented verbs are exactly the phase-1 set plus expand_outline and write_chapter', () => {
    expect([...IMPLEMENTED_VERBS].sort()).toEqual([
      'apply_review', 'deslop_chapter', 'expand_outline', 'open_book', 'review_chapter', 'write_chapter',
    ])
  })
  test('write_chapter template gates include reject_outline_artifact', () => {
    expect(getVerbTemplate('write_chapter')!.template_gates).toContain('reject_outline_artifact')
  })
  test('unknown verb returns null', () => {
    expect(getVerbTemplate('nope')).toBeNull()
  })
})
