import { describe, expect, test } from 'bun:test'
import { loadVendorSkillMarkdown, stripVendorSkillMarkdown } from './load-vendor'

describe('loadVendorSkillMarkdown', () => {
  test('loads fiction-humanizer skill without frontmatter or star/audit chrome', () => {
    const text = loadVendorSkillMarkdown('fiction-humanizer-zh')
    expect(text).toContain('# 中文小说去 AI 味')
    expect(text).toContain('## Workflow')
    expect(text).toContain('## Edit Modes')
    expect(text).not.toMatch(/^---/)
    expect(text).not.toContain('name: fiction-humanizer-zh')
  })

  test('loads fiction-humanizer references by name', () => {
    const patterns = loadVendorSkillMarkdown('fiction-humanizer-zh', 'ai-fiction-patterns.md')
    const scene = loadVendorSkillMarkdown('fiction-humanizer-zh', 'scene-rewrite.md')
    const checklist = loadVendorSkillMarkdown('fiction-humanizer-zh', 'chapter-checklist.md')
    const genre = loadVendorSkillMarkdown('fiction-humanizer-zh', 'genre-notes.md')
    expect(patterns.length).toBeGreaterThan(200)
    expect(scene.length).toBeGreaterThan(200)
    expect(checklist.length).toBeGreaterThan(200)
    expect(genre.length).toBeGreaterThan(200)
  })

  test('strips remove-ai-flavor star and local audit sections', () => {
    const text = loadVendorSkillMarkdown('remove-ai-flavor')
    expect(text).toContain('# Remove AI Flavor')
    expect(text).toContain('Binary Contrast Shells')
    expect(text).not.toContain('gh repo star')
    expect(text).not.toContain('python3 scripts/audit_ai_flavor.py')
  })

  test('strips humanizer-zh frontmatter, allowed-tools, score table, and dual output format', () => {
    const text = loadVendorSkillMarkdown('humanizer-zh')
    expect(text).toContain('# Humanizer-zh')
    expect(text).toContain('删除填充短语')
    expect(text).not.toContain('allowed-tools')
    expect(text).not.toContain('## 质量评分')
    expect(text).not.toContain('所做更改的简要总结')
  })

  test('stripVendorSkillMarkdown is idempotent on already-stripped text', () => {
    const once = stripVendorSkillMarkdown('---\nname: x\n---\n# Title\n\n## Star\nplease star\n')
    expect(once).toBe('# Title')
    expect(stripVendorSkillMarkdown(once)).toBe('# Title')
  })

  test('rejects reference paths that escape the references directory', () => {
    expect(() =>
      loadVendorSkillMarkdown('fiction-humanizer-zh', '../../remove-ai-flavor/SKILL.md'),
    ).toThrow()
  })
})
