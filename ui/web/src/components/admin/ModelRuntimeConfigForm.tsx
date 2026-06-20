import React, { useEffect } from 'react'
import { Button, Form, Input, InputNumber, Radio, Select, Space, Tag, Typography } from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import {
  API_FORMAT_OPTIONS,
  CONTEXT_WINDOW_PRESETS,
  DEFAULT_CONTEXT_WINDOW,
  RESPONSE_MODE_OPTIONS,
  resolveContextWindowPreset,
} from './modelRuntimeConfig'

const { Text } = Typography

type Props = {
  form?: any
  compact?: boolean
}

export const ModelRuntimeConfigForm: React.FC<Props> = ({ form, compact = false }) => {
  const watchedPreset = Form.useWatch('context_window_preset', form)
  const watchedContext = Form.useWatch('context_window', form)

  useEffect(() => {
    if (!form) return
    const preset = CONTEXT_WINDOW_PRESETS.find(item => item.value === watchedPreset)
    if (preset?.tokens && watchedContext !== preset.tokens) {
      form.setFieldsValue({ context_window: preset.tokens })
    }
  }, [form, watchedPreset, watchedContext])

  const resolvedPreset = resolveContextWindowPreset(Number(watchedContext || DEFAULT_CONTEXT_WINDOW), watchedPreset)
  const showCustomInput = resolvedPreset === 'custom'

  return (
    <div style={{ display: 'grid', gap: compact ? 10 : 14 }}>
      <Form.Item name="api_format" label="通信协议">
        <Select
          allowClear
          placeholder="跟随厂商默认协议"
          options={[...API_FORMAT_OPTIONS]}
        />
      </Form.Item>

      <Form.Item
        name="response_mode"
        label="响应返回模式"
        extra="未设置时跟随厂商配置；单个模型可覆盖为流式或非流式。"
      >
        <Radio.Group optionType="button" buttonStyle="solid">
          {RESPONSE_MODE_OPTIONS.map(item => (
            <Radio.Button key={item.value} value={item.value}>{item.label}</Radio.Button>
          ))}
        </Radio.Group>
      </Form.Item>

      <div style={{ display: 'grid', gap: 8 }}>
        <Space wrap align="center">
          <Text strong>上下文窗口</Text>
          <Tag color="green" bordered={false}>默认 1M</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>长篇小说和 Claude/Codex 类请求建议启用最大上下文。</Text>
        </Space>
        <Form.Item name="context_window_preset" noStyle>
          <Select
            options={CONTEXT_WINDOW_PRESETS.map(item => ({ label: item.label, value: item.value }))}
          />
        </Form.Item>
        <Form.Item name="context_window" label={showCustomInput ? '手动输入上下文 Token 数' : undefined}>
          <InputNumber
            min={8_000}
            max={2_000_000}
            step={1_000}
            style={{ width: '100%' }}
            disabled={!showCustomInput}
          />
        </Form.Item>
      </div>

      <Space size={12} align="start" style={{ width: '100%' }}>
        <Form.Item name="max_tokens" label="输出长度限制" style={{ flex: 1, marginBottom: 0 }}>
          <InputNumber min={1} max={262_144} step={512} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="temperature" label="随机性" style={{ flex: 1, marginBottom: 0 }}>
          <InputNumber min={0} max={2} step={0.1} style={{ width: '100%' }} />
        </Form.Item>
      </Space>

      <div style={{ display: 'grid', gap: 8 }}>
        <Text strong>模型级 Header 覆盖</Text>
        <Form.List name="custom_headers_list">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Space key={key} style={{ display: 'flex' }} align="baseline">
                  <Form.Item
                    {...restField}
                    name={[name, 'key']}
                    rules={[{ required: true, message: 'Header 名称不能为空' }]}
                    style={{ marginBottom: 8 }}
                  >
                    <Input placeholder="Header Key" style={{ width: 210 }} />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, 'value']}
                    style={{ marginBottom: 8 }}
                  >
                    <Input placeholder="Header Value" style={{ width: 280 }} />
                  </Form.Item>
                  <Button icon={<MinusCircleOutlined />} onClick={() => remove(name)} />
                </Space>
              ))}
              <Button type="dashed" icon={<PlusOutlined />} onClick={() => add()}>
                添加自定义 Header
              </Button>
            </>
          )}
        </Form.List>
      </div>
    </div>
  )
}
