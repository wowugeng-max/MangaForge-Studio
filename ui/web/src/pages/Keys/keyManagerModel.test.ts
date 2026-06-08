import { describe, expect, test } from 'bun:test'
import {
  buildKeySubmitPayload,
  buildModelCapabilityPayload,
  DEFAULT_BULK_UI_PARAMS_CAPABILITY,
  DEFAULT_MANUAL_MODEL_CAPABILITIES,
  formatKeySubmitError,
  MANUAL_MODEL_CAPABILITY_OPTIONS,
  parseBulkUiParamsJson,
} from './index'

describe('Key manager migration behavior', () => {
  test('parses bulk ui params only when the payload is a JSON array', () => {
    expect(parseBulkUiParamsJson('[{"name":"steps"}]')).toEqual({
      ok: true,
      value: [{ name: 'steps' }],
    })

    expect(parseBulkUiParamsJson('{"name":"steps"}')).toEqual({
      ok: false,
      error: 'JSON 格式错误：批量下发的参数必须是一个数组 []',
    })
  })

  test('returns the upstream parse error message for malformed JSON', () => {
    expect(parseBulkUiParamsJson('[bad json')).toEqual({
      ok: false,
      error: 'JSON 解析失败，请检查语法',
    })
  })

  test('builds a backend-safe key submit payload from form values', () => {
    expect(buildKeySubmitPayload({
      service_type: 'llm',
      provider: 'openai',
      key: 'sk-test',
      tags: ' fast, cheap ,,backup ',
    })).toEqual({
      provider: 'openai',
      key: 'sk-test',
      tags: ['fast', 'cheap', 'backup'],
    })
  })

  test('formats backend validation detail for key submit failures', () => {
    expect(formatKeySubmitError({
      response: {
        data: {
          detail: [{ loc: ['body', 'provider'], msg: 'field required' }],
        },
      },
    })).toBe('提交失败: [{"loc":["body","provider"],"msg":"field required"}]')

    expect(formatKeySubmitError({})).toBe('操作失败')
  })

  test('defaults manual model creation to a valid video generation capability', () => {
    expect(DEFAULT_MANUAL_MODEL_CAPABILITIES).toEqual(['text_to_video'])

    expect(buildModelCapabilityPayload(DEFAULT_MANUAL_MODEL_CAPABILITIES)).toEqual({
      chat: false,
      vision: false,
      text_to_image: false,
      image_to_image: false,
      text_to_video: true,
      image_to_video: false,
    })
  })

  test('defaults bulk ui param updates to a supported six-task capability', () => {
    const optionValues = MANUAL_MODEL_CAPABILITY_OPTIONS.map(option => option.value)

    expect(optionValues).toContain(DEFAULT_BULK_UI_PARAMS_CAPABILITY)
    expect(DEFAULT_BULK_UI_PARAMS_CAPABILITY).toBe('text_to_image')
  })
})
