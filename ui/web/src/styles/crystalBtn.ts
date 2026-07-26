/** Crystal button class helpers for model / local / display actions. */
export type CrystalBtnKind = 'model' | 'local' | 'display'

const MODEL_RE = /模型|生成|写作|写章|写正文|复检|质检|修订|扩写|孵化|提炼|检查本章|智能|回填|一键补齐|LLM|AI\b|agent|Agent|自检|改写|续写|润色/
const LOCAL_RE = /保存|确认|应用|入库|匹配|补齐|新增|删除|导出|导入|打开|提交|同步|重置|恢复|合并|处置|选择|切换|启用|禁用|绑定|解绑|排序|移动|复制到|粘贴/
const DISPLAY_RE = /刷新|全选|清空|取消|关闭|返回|收起|展开|查看|详情|预览|导航|说明|帮助|暂不|跳过|下一步|上一步|完成引导/

export function crystalBtnClass(kind: CrystalBtnKind, running = false) {
  return [
    'novel-btn-crystal',
    `novel-btn-crystal-${kind}`,
    running ? 'novel-btn-crystal-running' : '',
  ].filter(Boolean).join(' ')
}

export function inferCrystalBtnKind(label: string, opts?: { type?: string; danger?: boolean }): CrystalBtnKind {
  const text = String(label || '').replace(/\s+/g, '')
  if (opts?.danger) return 'local'
  if (MODEL_RE.test(text)) return 'model'
  if (DISPLAY_RE.test(text)) return 'display'
  if (LOCAL_RE.test(text)) return 'local'
  if (opts?.type === 'primary') return 'model'
  return 'display'
}

export function crystalBtnClassFromLabel(label: string, opts?: { type?: string; danger?: boolean; running?: boolean }) {
  return crystalBtnClass(inferCrystalBtnKind(label, opts), Boolean(opts?.running))
}
