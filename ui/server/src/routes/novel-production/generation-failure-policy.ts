export function classifyGenerationFailure(error: any) {
  if (error?.code === 'MCP_SERVER_NOT_READY') {
    return {
      type: 'mcp_server_not_ready',
      actions: ['保留已完成阶段', '等待 MCP 服务稳定后从当前阶段继续'],
    }
  }
  if (error?.code === 'MCP_DRIVE_SYNC_FAILED') {
    return {
      type: 'mcp_drive_sync_failed',
      actions: ['检查 MCP Drive 权限和内容对账', '修复后从当前阶段继续'],
    }
  }
  if (String(error?.code || '').startsWith('MCP_')) {
    return {
      type: 'mcp_generation_failed',
      actions: ['保留已完成阶段', '确认 MCP 服务状态后从当前阶段继续'],
    }
  }
  const text = String(error?.message || error?.error || error || '')
  if (text.includes('upload current user input file') || text.includes('upload file failed')) return { type: 'provider_upload_failed', actions: ['缩短上下文后重试', '切换模型重试', '把章节批量拆小'] }
  if (text.includes('JSON') || text.includes('解析')) return { type: 'json_parse_failed', actions: ['使用 JSON 修复解析', '降低输出字段复杂度后重试'] }
  if (text.includes('模型未返回正文') || text.includes('未返回正文')) return { type: 'empty_prose', actions: ['降低上下文字数重试', '强制重新生成场景卡', '切换正文模型'] }
  if (text.includes('仿写安全') || text.includes('REFERENCE_SAFETY_BLOCKED')) return { type: 'reference_safety_blocked', actions: ['生成参考迁移计划', '替换高风险专名和桥段', '降低参考强度后重试'] }
  if (text.includes('前置检查') || text.includes('PREFLIGHT')) return { type: 'preflight_blocked', actions: ['补齐章节目标/结尾钩子/角色状态', '生成场景卡', '允许缺材料继续'] }
  if (error?.code === 'APPROVAL_REQUIRED') return { type: 'approval_required', actions: ['人工确认当前关卡', '调整审批策略', '确认后继续执行'] }
  return { type: 'unknown', actions: ['查看原始错误', '手动重试', '切换模型重试'] }
}
