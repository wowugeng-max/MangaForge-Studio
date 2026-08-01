import { describe, expect, test } from 'bun:test'
import { getNovelPayload, parseJsonLikePayload } from './novel-route-utils-payload'

describe('parseJsonLikePayload bare quote recovery', () => {
  test('recovers unescaped ASCII quotes inside a JSON string value', () => {
    const raw = `\`\`\`json
{
  "state_delta": {
    "timeline": [{
      "event": "楚弦触发隐藏死律",
      "source_excerpt": "他触犯了"绝对不能在非整点下车"的隐藏死律。"
    }],
    "open_questions": ["第二双脚步声属于谁"]
  }
}
\`\`\``

    expect(parseJsonLikePayload(raw)).toEqual({
      state_delta: {
        timeline: [{
          event: '楚弦触发隐藏死律',
          source_excerpt: '他触犯了"绝对不能在非整点下车"的隐藏死律。',
        }],
        open_questions: ['第二双脚步声属于谁'],
      },
    })
  })

  test('leaves valid escaped quotes and structural quotes unchanged', () => {
    const raw = '{"state_delta":{"open_questions":["他说：\\"停下\\"。"],"current_time":"子时"}}'
    expect(parseJsonLikePayload(raw)).toEqual({
      state_delta: {
        open_questions: ['他说："停下"。'],
        current_time: '子时',
      },
    })
  })

  test('keeps truncated and non-JSON text fail-closed', () => {
    expect(parseJsonLikePayload('```json\n{"state_delta":{"open_questions":["未闭合"]}\n')).toBeNull()
    expect(parseJsonLikePayload('{"state_delta":{"open_questions":["未闭合')).toBeNull()
    expect(parseJsonLikePayload('这只是一段普通模型解释，不是 JSON。')).toBeNull()
  })
})

describe('getNovelPayload prose recovery precedence', () => {
  test('keeps the first valid nested-only JSON payload authoritative', () => {
    const validPayload = {
      prose_chapters: [{ chapter_no: 7, chapter_text: '有效正文' }],
    }
    const malformedFallback = `{"chapter_text":"${'候选正文'.repeat(80)}"未转义引号""}`

    const payload = getNovelPayload({ output: validPayload, content: malformedFallback })

    expect(payload).toBe(validPayload)
    expect(payload.chapter_text).toBeUndefined()
    expect(payload.recovered_from_partial_json).toBeUndefined()
  })

  test('normalizes prose metadata only when the winning payload required bare-quote repair', () => {
    const chapterText = '他的目光落在写着"CN-001"的屏幕上，左手缓缓松开秩序核心。'.repeat(12)
    const payload = getNovelPayload({
      content: `{"prose_chapters":[{"chapter_no":13,"title":"盟友入局","chapter_text":"${chapterText}","scene_breakdown":[{"scene_no":1}]}]}`,
    })

    expect(payload.chapter_text).toBe(chapterText)
    expect(payload.prose_chapters?.[0]).toMatchObject({
      chapter_no: 13,
      title: '盟友入局',
      chapter_text: chapterText,
      scene_breakdown: [{ scene_no: 1 }],
    })
    expect(payload.recovered_from_partial_json).toBe(true)
    expect(payload.partial_json_open_string_recovered).toBe(false)
  })

  test('keeps invalid payloads without recoverable prose fail-closed', () => {
    expect(getNovelPayload({
      content: '```json\n{"state_delta":{"open_questions":["未闭合"]}\n',
    })).toEqual({})
  })
})
