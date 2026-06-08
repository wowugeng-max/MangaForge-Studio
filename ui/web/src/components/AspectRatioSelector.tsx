import React from 'react'
import { Button, InputNumber, Select, Typography } from 'antd'
import { CloseOutlined } from '@ant-design/icons'

export type AspectRatioValue = '' | '1:1' | '9:16' | '16:9' | '3:4' | '4:3' | '3:2' | '2:3' | '4:5' | '5:4' | '21:9' | 'custom'
const { Text } = Typography

export const ASPECT_RATIOS = [
  { value: '', label: '自适应', icon: 'auto', size: '' },
  { value: '1:1', label: '1:1', size: '1024*1024' },
  { value: '9:16', label: '9:16', icon: 'portrait', size: '768*1344' },
  { value: '16:9', label: '16:9', icon: 'wide', size: '1344*768' },
  { value: '3:4', label: '3:4', icon: 'portrait', size: '864*1152' },
  { value: '4:3', label: '4:3', icon: 'wide', size: '1152*864' },
  { value: '3:2', label: '3:2', icon: 'wide', size: '1216*832' },
  { value: '2:3', label: '2:3', icon: 'portrait', size: '832*1216' },
  { value: '4:5', label: '4:5', icon: 'portrait', size: '896*1120' },
  { value: '5:4', label: '5:4', icon: 'wide', size: '1120*896' },
  { value: '21:9', label: '21:9', icon: 'cinema', size: '1536*640' },
  { value: 'custom', label: 'Custom', icon: 'custom', size: 'custom' },
] as const

export function getAspectRatioSize(value: AspectRatioValue, customWidth = 1024, customHeight = 1024) {
  if (value === 'custom') return `${customWidth}*${customHeight}`
  return ASPECT_RATIOS.find(r => r.value === value)?.size ?? '1024*1024'
}

export function getAspectRatioLabel(value: AspectRatioValue) {
  return ASPECT_RATIOS.find(r => r.value === value)?.label ?? value
}

export function AspectRatioTrigger({ value, customWidth = 1024, customHeight = 1024, onClick }: { value: AspectRatioValue; customWidth?: number; customHeight?: number; onClick: () => void }) {
  const label = value === 'custom' ? `${customWidth}x${customHeight}` : getAspectRatioLabel(value)
  return <div className="nodrag" onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: value ? '#f5f3ff' : '#f1f5f9', color: value ? '#6d28d9' : '#64748b', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700, border: `1px solid ${value ? '#ddd6fe' : '#e2e8f0'}` }}>▣ {label}</div>
}

export function AspectRatioPanel({ value, customWidth = 1024, customHeight = 1024, onChange, onCustomSizeChange, onClose }: { value: AspectRatioValue; customWidth?: number; customHeight?: number; onChange: (value: AspectRatioValue) => void; onCustomSizeChange?: (width: number, height: number) => void; onClose: () => void }) {
  return <div className="nodrag nowheel" style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', padding: '12px 14px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <Text style={{ flex: 1, fontSize: 12, fontWeight: 800, color: '#1e293b' }}>画面比例</Text>
      <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>{getAspectRatioSize(value, customWidth, customHeight)}</Text>
      <Button type="text" size="small" icon={<CloseOutlined />} onClick={(event) => { event.stopPropagation(); onClose() }} style={{ color: '#94a3b8' }} />
    </div>
    <div style={{ display: 'grid', gap: 8, gridTemplateColumns: value === 'custom' ? '1fr 88px 88px' : '1fr' }}>
      <Select className="nodrag" size="small" value={value} options={ASPECT_RATIOS.map(item => ({ label: item.size ? `${item.label} · ${item.size}` : item.label, value: item.value }))} onChange={next => onChange(next as AspectRatioValue)} />
      {value === 'custom' && (
        <>
          <InputNumber className="nodrag" size="small" min={1} value={customWidth} onChange={next => onCustomSizeChange?.(Number(next || 1), customHeight)} addonAfter="W" />
          <InputNumber className="nodrag" size="small" min={1} value={customHeight} onChange={next => onCustomSizeChange?.(customWidth, Number(next || 1))} addonAfter="H" />
        </>
      )}
    </div>
  </div>
}

export default function AspectRatioSelector({ value, onChange, customWidth, customHeight, onCustomSizeChange }: { value: AspectRatioValue; onChange: (value: AspectRatioValue) => void; customWidth?: number; customHeight?: number; onCustomSizeChange?: (width: number, height: number) => void }) {
  return <AspectRatioPanel value={value} onChange={onChange} customWidth={customWidth} customHeight={customHeight} onCustomSizeChange={onCustomSizeChange} onClose={() => {}} />
}
