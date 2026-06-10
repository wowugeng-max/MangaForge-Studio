import React, { useState } from 'react'
import { Modal, message, Button, Typography, Form } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import apiClient from '../../api/client'
import { ModelRuntimeConfigForm } from './ModelRuntimeConfigForm'
import { buildModelRuntimeInitialValues, buildModelRuntimeSavePayload } from './modelRuntimeConfig'

const { Text } = Typography

interface Props {
  modelId: number
  modelName: string
  initialParams: any
  initialApiFormat?: string
  capabilities?: Record<string, boolean>
  onSuccess?: () => void
}

export const ModelParamEditor: React.FC<Props> = ({ modelId, modelName, initialParams, initialApiFormat, capabilities, onSuccess }) => {
  const [visible, setVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const handleOpen = () => {
    form.setFieldsValue(buildModelRuntimeInitialValues({
      api_format: initialApiFormat,
      context_ui_params: initialParams || {},
      capabilities,
    }))
    setVisible(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const payload = buildModelRuntimeSavePayload(values, {
        api_format: initialApiFormat,
        context_ui_params: initialParams || {},
        capabilities,
      })
      setSaving(true)
      await apiClient.put(`/models/${modelId}/ui-params`, payload)
      message.success(`${modelName} 参数配置已热更新！`)
      setVisible(false)
      onSuccess?.()
    } catch (e: any) {
      message.error('保存失败: ' + (e?.message || '未知错误'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button type="link" size="small" icon={<EditOutlined />} onClick={handleOpen}>
        配置参数
      </Button>

      <Modal
        title={`高级配置: ${modelName}`}
        open={visible}
        onOk={handleSave}
        confirmLoading={saving}
        onCancel={() => setVisible(false)}
        width={620}
      >
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            配置模型通信协议、上下文窗口和常用运行参数。保存后，画布节点和小说工作台会读取最新配置。
          </Text>
        </div>
        <Form form={form} layout="vertical">
          <ModelRuntimeConfigForm form={form} compact />
        </Form>
      </Modal>
    </>
  )
}
