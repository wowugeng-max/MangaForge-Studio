import React from 'react'
import { Button, Tooltip, message } from 'antd'
import { CopyOutlined } from '@ant-design/icons'
import {
  copyImageToClipboard,
  copyTextToClipboard,
  resolveAbsoluteMediaUrl,
  type CopyContentKind,
} from '../../utils/copyContent'

const COPY_TOOLTIPS: Record<CopyContentKind, string> = {
  text: '复制文本',
  image: '复制图片',
  video: '复制视频链接',
}

export function CopyContentButton({ kind, value, style }: {
  kind: CopyContentKind
  value: string
  style?: React.CSSProperties
}) {
  const [copying, setCopying] = React.useState(false)

  const handleCopy = async (event: React.MouseEvent) => {
    event.stopPropagation()
    if (!value) {
      message.warning('没有可复制的内容')
      return
    }
    setCopying(true)
    try {
      if (kind === 'image') {
        const outcome = await copyImageToClipboard(value)
        message.success(outcome === 'image' ? '图片已复制到剪贴板' : '当前环境不支持复制图片,已复制图片链接')
      } else if (kind === 'video') {
        await copyTextToClipboard(resolveAbsoluteMediaUrl(value))
        message.success('视频链接已复制')
      } else {
        await copyTextToClipboard(value)
        message.success('文本已复制')
      }
    } catch (error: any) {
      message.error(`复制失败: ${error?.message || error}`)
    } finally {
      setCopying(false)
    }
  }

  return (
    <Tooltip title={COPY_TOOLTIPS[kind]}>
      <Button
        className="nodrag"
        type="text"
        size="small"
        icon={<CopyOutlined />}
        loading={copying}
        onClick={handleCopy}
        style={{ color: '#0ea5e9', ...style }}
      />
    </Tooltip>
  )
}
