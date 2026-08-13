import React from 'react'
import { Button, InputNumber, Popover, Tooltip, Typography } from 'antd'
import { CloseOutlined, DownOutlined } from '@ant-design/icons'

export type AspectRatioValue = '' | '1:1' | '9:16' | '16:9' | '3:4' | '4:3' | '3:2' | '2:3' | '4:5' | '5:4' | '21:9' | 'custom'
const { Text } = Typography

export const ASPECT_RATIOS = [
  { value: '', label: '自适应', icon: 'auto', size: '' },
  { value: '1:1', label: '1:1', size: '1440*1440' },
  { value: '9:16', label: '9:16', icon: 'portrait', size: '1088*1920' },
  { value: '16:9', label: '16:9', icon: 'wide', size: '1920*1088' },
  { value: '3:4', label: '3:4', icon: 'portrait', size: '1248*1664' },
  { value: '4:3', label: '4:3', icon: 'wide', size: '1664*1248' },
  { value: '3:2', label: '3:2', icon: 'wide', size: '1760*1184' },
  { value: '2:3', label: '2:3', icon: 'portrait', size: '1184*1760' },
  { value: '4:5', label: '4:5', icon: 'portrait', size: '1280*1600' },
  { value: '5:4', label: '5:4', icon: 'wide', size: '1600*1280' },
  { value: '21:9', label: '21:9', icon: 'cinema', size: '2208*928' },
  { value: 'custom', label: 'Custom', icon: 'custom', size: 'custom' },
] as const

export type AspectRatioResolution = '1k' | '2k' | '4k'

// 档位按行业分辨率等级取像素总量:1K≈1080p、2K≈1440p、4K≈2160p,宽高按比例反推并做 32 像素对齐
const RESOLUTION_PIXEL_AREAS: Record<AspectRatioResolution, number> = {
  '1k': 1920 * 1080,
  '2k': 2560 * 1440,
  '4k': 3840 * 2160,
}

export const ASPECT_RATIO_RESOLUTIONS: Array<{ value: AspectRatioResolution; label: string }> = [
  { value: '1k', label: '1K' },
  { value: '2k', label: '2K' },
  { value: '4k', label: '4K' },
]

function alignTo32(value: number) {
  return Math.max(32, Math.round(value / 32) * 32)
}

export function getAspectRatioSize(value: AspectRatioValue, customWidth = 1024, customHeight = 1024, resolution: AspectRatioResolution = '1k') {
  if (value === 'custom') return `${customWidth}*${customHeight}`
  if (!value) return ''
  const [a, b] = String(value).split(':').map(Number)
  if (!a || !b) return ''
  const area = RESOLUTION_PIXEL_AREAS[resolution] ?? RESOLUTION_PIXEL_AREAS['1k']
  const width = alignTo32(Math.sqrt(area * a / b))
  const height = alignTo32(Math.sqrt(area * b / a))
  return `${width}*${height}`
}

export function getAspectRatioLabel(value: AspectRatioValue) {
  return ASPECT_RATIOS.find(r => r.value === value)?.label ?? value
}

export function AspectRatioTrigger({ value, customWidth = 1024, customHeight = 1024, onClick }: { value: AspectRatioValue; customWidth?: number; customHeight?: number; onClick: () => void }) {
  const label = value === 'custom' ? `${customWidth}x${customHeight}` : getAspectRatioLabel(value)
  return <div className="nodrag" onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: value ? '#f5f3ff' : '#f1f5f9', color: value ? '#6d28d9' : '#64748b', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700, border: `1px solid ${value ? '#ddd6fe' : '#e2e8f0'}` }}>▣ {label}</div>
}

function AspectRatioShape({ value, selected }: { value: AspectRatioValue; selected: boolean }) {
  const stroke = selected ? '#0f172a' : '#94a3b8'
  const parts = String(value).split(':').map(Number)
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    // 自适应 / 自定义:虚线方框示意
    return (
      <span style={{ height: 18, display: 'inline-flex', alignItems: 'center' }}>
        <span style={{ width: 14, height: 14, border: `1.5px dashed ${stroke}`, borderRadius: 4 }} />
      </span>
    )
  }
  const [a, b] = parts
  const scale = 16 / Math.max(a, b)
  const width = Math.max(7, Math.round(a * scale))
  const height = Math.max(7, Math.round(b * scale))
  return (
    <span style={{ height: 18, display: 'inline-flex', alignItems: 'center' }}>
      <span style={{ width, height, border: `1.5px solid ${stroke}`, borderRadius: 3 }} />
    </span>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', margin: '10px 0 6px' }}>{children}</div>
}

export function AspectRatioGrid({ value, customWidth = 1024, customHeight = 1024, resolution = '1k', onChange, onCustomSizeChange, onResolutionChange }: { value: AspectRatioValue; customWidth?: number; customHeight?: number; resolution?: AspectRatioResolution; onChange: (value: AspectRatioValue) => void; onCustomSizeChange?: (width: number, height: number) => void; onResolutionChange?: (resolution: AspectRatioResolution) => void }) {
  const currentSize = getAspectRatioSize(value, customWidth, customHeight, resolution)
  const [displayWidth, displayHeight] = currentSize && currentSize !== 'custom' ? currentSize.split('*') : ['', '']
  const isCustom = value === 'custom'
  const resolutionDisabled = isCustom || value === ''
  const sizeBoxStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, flex: 1, height: 30, padding: '0 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontFamily: 'monospace', color: '#1e293b' }
  return (
    <div className="nodrag nowheel" style={{ width: 300 }}>
      <SectionTitle>尺寸</SectionTitle>
      {isCustom ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <InputNumber className="nodrag" size="small" min={1} value={customWidth} onChange={next => onCustomSizeChange?.(Number(next || 1), customHeight)} addonBefore="W" style={{ flex: 1 }} />
          <span style={{ color: '#94a3b8' }}>×</span>
          <InputNumber className="nodrag" size="small" min={1} value={customHeight} onChange={next => onCustomSizeChange?.(customWidth, Number(next || 1))} addonBefore="H" style={{ flex: 1 }} />
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={sizeBoxStyle}><span style={{ color: '#94a3b8' }}>W</span>{displayWidth || '自动'}</div>
          <span style={{ color: '#94a3b8' }}>×</span>
          <div style={sizeBoxStyle}><span style={{ color: '#94a3b8' }}>H</span>{displayHeight || '自动'}</div>
        </div>
      )}

      <SectionTitle>宽高比</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {ASPECT_RATIOS.map(item => {
          const selected = item.value === value
          return (
            <Tooltip key={item.value || 'auto'} title={item.value === 'custom' ? '自定义宽高' : item.size ? getAspectRatioSize(item.value as AspectRatioValue, customWidth, customHeight, resolution) : '由模型自动决定尺寸'}>
              <div
                onClick={() => onChange(item.value as AspectRatioValue)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '7px 0 5px', borderRadius: 10, cursor: 'pointer', border: selected ? '1.5px solid #0f172a' : '1px solid #e2e8f0', background: '#fff', boxShadow: selected ? '0 1px 4px rgba(15,23,42,0.12)' : 'none', transition: 'border-color 0.15s ease' }}
              >
                <AspectRatioShape value={item.value as AspectRatioValue} selected={selected} />
                <span style={{ fontSize: 11, fontWeight: selected ? 800 : 600, color: selected ? '#0f172a' : '#475569' }}>{item.label}</span>
              </div>
            </Tooltip>
          )
        })}
      </div>

      {onResolutionChange && (
        <>
          <SectionTitle>分辨率</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {ASPECT_RATIO_RESOLUTIONS.map(item => {
              const selected = item.value === resolution
              return (
                <div
                  key={item.value}
                  onClick={() => { if (!resolutionDisabled) onResolutionChange(item.value) }}
                  style={{ textAlign: 'center', padding: '6px 0', borderRadius: 10, cursor: resolutionDisabled ? 'not-allowed' : 'pointer', border: selected && !resolutionDisabled ? '1.5px solid #0f172a' : '1px solid #e2e8f0', background: '#fff', fontSize: 12, fontWeight: selected && !resolutionDisabled ? 800 : 600, color: resolutionDisabled ? '#cbd5e1' : selected ? '#0f172a' : '#475569', userSelect: 'none' }}
                >
                  {item.label}
                </div>
              )
            })}
          </div>
          {resolutionDisabled && <Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 4 }}>{isCustom ? '自定义尺寸时分辨率由 W/H 决定' : '自适应模式由模型决定尺寸'}</Text>}
        </>
      )}

      <div style={{ marginTop: 8, textAlign: 'right' }}>
        <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>{currentSize ? `输出尺寸 ${currentSize}` : '由模型自适应尺寸'}</Text>
      </div>
    </div>
  )
}

export function AspectRatioPickerButton({ value, customWidth = 1024, customHeight = 1024, resolution = '1k', onChange, onCustomSizeChange, onResolutionChange }: { value: AspectRatioValue; customWidth?: number; customHeight?: number; resolution?: AspectRatioResolution; onChange: (value: AspectRatioValue) => void; onCustomSizeChange?: (width: number, height: number) => void; onResolutionChange?: (resolution: AspectRatioResolution) => void }) {
  const [open, setOpen] = React.useState(false)
  const resolutionSuffix = onResolutionChange && value && value !== 'custom' && resolution !== '1k' ? ` · ${resolution.toUpperCase()}` : ''
  const label = value === 'custom' ? `${customWidth}x${customHeight}` : `${getAspectRatioLabel(value)}${resolutionSuffix}`
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="top"
      content={
        <AspectRatioGrid
          value={value}
          customWidth={customWidth}
          customHeight={customHeight}
          resolution={resolution}
          onCustomSizeChange={onCustomSizeChange}
          onResolutionChange={onResolutionChange}
          onChange={next => { onChange(next); if (next !== 'custom') setOpen(false) }}
        />
      }
    >
      <div className="nodrag" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 24, padding: '0 8px', background: '#fff', border: `1px solid ${open ? '#0ea5e9' : '#d9d9d9'}`, borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#1e293b', whiteSpace: 'nowrap', userSelect: 'none' }}>
        <AspectRatioShape value={value} selected />
        <span style={{ fontWeight: 600 }}>{label}</span>
        <DownOutlined style={{ fontSize: 9, color: '#94a3b8' }} />
      </div>
    </Popover>
  )
}

export function AspectRatioPanel({ value, customWidth = 1024, customHeight = 1024, onChange, onCustomSizeChange, onClose }: { value: AspectRatioValue; customWidth?: number; customHeight?: number; onChange: (value: AspectRatioValue) => void; onCustomSizeChange?: (width: number, height: number) => void; onClose: () => void }) {
  return <div className="nodrag nowheel" style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', padding: '12px 14px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <Text style={{ flex: 1, fontSize: 12, fontWeight: 800, color: '#1e293b' }}>画面比例</Text>
      <Button type="text" size="small" icon={<CloseOutlined />} onClick={(event) => { event.stopPropagation(); onClose() }} style={{ color: '#94a3b8' }} />
    </div>
    <AspectRatioGrid value={value} customWidth={customWidth} customHeight={customHeight} onChange={onChange} onCustomSizeChange={onCustomSizeChange} />
  </div>
}

export default function AspectRatioSelector({ value, onChange, customWidth, customHeight, onCustomSizeChange }: { value: AspectRatioValue; onChange: (value: AspectRatioValue) => void; customWidth?: number; customHeight?: number; onCustomSizeChange?: (width: number, height: number) => void }) {
  return <AspectRatioPanel value={value} onChange={onChange} customWidth={customWidth} customHeight={customHeight} onCustomSizeChange={onCustomSizeChange} onClose={() => {}} />
}
