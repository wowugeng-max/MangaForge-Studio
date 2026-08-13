export type CopyContentKind = 'text' | 'image' | 'video'

export function resolveAbsoluteMediaUrl(src: string, baseHref?: string) {
  const base = baseHref || (typeof window !== 'undefined' ? window.location.href : undefined)
  try {
    return new URL(src, base).href
  } catch {
    return src
  }
}

export async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  // 非安全上下文(如通过局域网 IP 访问)没有 navigator.clipboard,降级到隐藏 textarea
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    if (!document.execCommand('copy')) throw new Error('当前环境不支持复制')
  } finally {
    document.body.removeChild(textarea)
  }
}

async function toPngBlob(blob: Blob): Promise<Blob> {
  if (blob.type === 'image/png') return blob
  const bitmap = await createImageBitmap(blob)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(result => (result ? resolve(result) : reject(new Error('图片格式转换失败'))), 'image/png')
    })
  } finally {
    bitmap.close()
  }
}

/**
 * 把图片写入系统剪贴板。剪贴板只接受 PNG,其他格式会先经 canvas 转码。
 * 环境不支持(或图片抓取失败)时降级为复制图片链接,返回值区分两种结果。
 */
export async function copyImageToClipboard(src: string): Promise<'image' | 'url'> {
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    try {
      const response = await fetch(src)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const png = await toPngBlob(await response.blob())
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
      return 'image'
    } catch {
      // 降级复制链接
    }
  }
  await copyTextToClipboard(resolveAbsoluteMediaUrl(src))
  return 'url'
}
