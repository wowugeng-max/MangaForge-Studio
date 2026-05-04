import React from 'react'

export type AspectRatioValue = '1:1' | '3:4' | '4:3' | '16:9' | '9:16' | 'custom'

export const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1', size: '1024*1024' },
  { value: '3:4', label: '3:4', size: '768*1024' },
  { value: '4:3', label: '4:3', size: '1024*768' },
  { value: '16:9', label: '16:9', size: '1280*720' },
  { value: '9:16', label: '9:16', size: '720*1280' },
  { value: 'custom', label: 'Custom', size: 'custom' },
] as const

export function getAspectRatioSize(value: AspectRatioValue, customWidth = 1024, customHeight = 1024) {
  if (value === 'custom') return `${customWidth}*${customHeight}`
  return ASPECT_RATIOS.find(r => r.value === value)?.size || '1024*1024'
}

export function getAspectRatioLabel(value: AspectRatioValue) {
  return ASPECT_RATIOS.find(r => r.value === value)?.label || value
}

export default function AspectRatioSelector() { return <div /> }
export const AspectRatioTrigger = () => null
export const AspectRatioPanel = () => null
