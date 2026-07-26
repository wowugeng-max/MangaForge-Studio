export function resolveAutoConnectHandle(sourceDataType: string, targetNodeType: string): string | null {
  if (targetNodeType === 'display') return 'in'
  if (targetNodeType === 'generate') return sourceDataType === 'image' ? 'image' : 'text'
  if (targetNodeType === 'comfyUIEngine') return sourceDataType === 'workflow' ? 'in' : null
  return null
}
