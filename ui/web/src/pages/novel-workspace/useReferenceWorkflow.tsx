import { useCallback } from 'react'
import { Modal } from 'antd'
import apiClient from '../../api/client'

export function useReferenceWorkflow({
  projectId,
  referenceSummary,
  onNeedConfig,
}: {
  projectId: number
  referenceSummary: { count: number; strengthLabel: string }
  onNeedConfig: () => void
}) {
  const confirmReferenceReady = useCallback(async (taskType: string) => {
    if (!referenceSummary.count) return true
    try {
      const res = await apiClient.post(`/novel/projects/${projectId}/reference-preview`, { task_type: taskType })
      const preview = res.data || {}
      const entries = Array.isArray(preview.entries) ? preview.entries : []
      const warnings = Array.isArray(preview.warnings) ? preview.warnings : []
      if (entries.length > 0 && warnings.length === 0) return true
      const shouldContinue = await new Promise<boolean>((resolve) => {
        Modal.confirm({
          title: '参考知识准备度不足',
          width: 560,
          content: (
            <div style={{ whiteSpace: 'pre-wrap' }}>
              {[
                `当前任务：${taskType}`,
                `已配置参考项目：${referenceSummary.count} 部`,
                `本次可注入知识：${entries.length} 条`,
                ...(warnings.length ? ['问题：', ...warnings.map((item: string) => `- ${item}`)] : ['问题：当前没有命中可注入知识。']),
                '',
                '继续生成不会中断，但仿写效果会明显下降。建议先打开“参考配置”做预览或补提炼。',
              ].join('\n')}
            </div>
          ),
          okText: '继续生成',
          cancelText: '先去配置',
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        })
      })
      if (!shouldContinue) onNeedConfig()
      return shouldContinue
    } catch (error: any) {
      const text = String(error?.response?.data || error?.response?.data?.error || error?.message || '')
      Modal.warning({
        title: '参考预检接口不可用',
        content: text.includes('Cannot POST') || error?.response?.status === 404
          ? '当前后端未加载 reference-preview 路由。请重启 8787 后端服务后再生成。'
          : '参考预检失败，请稍后重试或检查后端服务。',
      })
      return false
    }
  }, [onNeedConfig, projectId, referenceSummary.count])

  return { confirmReferenceReady }
}
