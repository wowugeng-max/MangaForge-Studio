import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('provider matrix protocol UI', () => {
  test('offers Codex Responses protocol in provider configuration', () => {
    const source = readFileSync(join(import.meta.dir, 'index.tsx'), 'utf8')

    expect(source).toContain("value=\"codex_responses\"")
    expect(source).toContain('Codex / OpenAI Responses')
    expect(source).toContain('CODEX')
    expect(source).toContain("responses: '/responses'")
  })

  test('exposes upstream multimodal DSL route editors', () => {
    const source = readFileSync(join(import.meta.dir, 'index.tsx'), 'utf8')

    expect(source).toContain("['endpoints', 'text_to_image']")
    expect(source).toContain("['endpoints', 'image_to_image']")
    expect(source).toContain("['endpoints', 'text_to_video']")
    expect(source).toContain("['endpoints', 'image_to_video']")
    expect(source).toContain('"payload_template"')
    expect(source).toContain('"task_id_extractor"')
    expect(source).toContain('"result_extractor"')
  })

  test('keeps the upstream DashScope multimodal provider preset', () => {
    const source = readFileSync(join(import.meta.dir, 'index.tsx'), 'utf8')

    expect(source).toContain("label: '阿里云 (千问/万相)'")
    expect(source).toContain("id: 'aliyun_dashscope'")
    expect(source).toContain('X-DashScope-Async')
    expect(source).toContain('dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis')
    expect(source).toContain('model_routes')
    expect(source).toContain("match: 'wanx'")
  })
})
