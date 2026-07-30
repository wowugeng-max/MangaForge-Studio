import { describe, expect, test } from 'bun:test'
import { parseJsonLikePayload } from './novel-route-utils-payload'

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
