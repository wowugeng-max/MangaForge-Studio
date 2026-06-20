import { describe, expect, test } from 'bun:test'
import {
  buildKeySubmitPayload,
  buildModelCapabilityPayload,
  DEFAULT_BULK_UI_PARAMS_CAPABILITY,
  DEFAULT_MANUAL_MODEL_CAPABILITIES,
  formatKeySubmitError,
  getCreateKeyFormValues,
  MANUAL_MODEL_CAPABILITY_OPTIONS,
  MODEL_HEALTH_STATUS_MAP,
  modelHealthTooltipTitle,
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

  test('maps model health statuses and exposes the persisted last error in tooltip text', () => {
    expect(MODEL_HEALTH_STATUS_MAP.network_error.text).toBe('网络错误')
    expect(MODEL_HEALTH_STATUS_MAP.upstream_busy.text).toBe('上游繁忙')
    expect(MODEL_HEALTH_STATUS_MAP.key_disabled.text).toBe('Key停用')

    const tooltip = modelHealthTooltipTitle({
      last_tested_at: '2026-06-10T01:02:03.000Z',
      last_error: '测试失败：AnyRouter Claude/Anthropic 模型无权限',
    })

    expect(tooltip).toContain('最后测试')
    expect(tooltip).toContain('AnyRouter Claude/Anthropic')
  })

  test('prevents add-key modal fields from reusing previous provider credentials', async () => {
    expect(getCreateKeyFormValues()).toMatchObject({
      service_type: 'llm',
      provider: undefined,
      base_url: undefined,
      key: undefined,
      is_active: true,
      quota_total: 0,
    })

    const source = await Bun.file(new URL('./index.tsx', import.meta.url)).text()

    expect(source).toContain('getCreateKeyFormValues')
    expect(source).toContain('autoComplete="off"')
    expect(source).toContain('autoComplete="new-password"')
  })
})
