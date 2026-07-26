import React from 'react'
import { Button, Card, Col, InputNumber, Popover, Row, Slider, Space, Tag, Tooltip, Typography } from 'antd'
import {
  FontSizeOutlined,
  LineHeightOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import type { DeslopGateDiagnosticsModel } from './writingCockpitModel'

const { Text } = Typography

export type EditorDisplayPrefs = { fontSize: number; lineHeight: number }
export type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error'

export const EDITOR_DISPLAY_PREFS_KEY = 'novel.workspace.editorDisplayPrefs'
export const NOVEL_WRITING_AUX_COLLAPSED_KEY = 'novel.workspace.writingAuxCollapsed'
export const DEFAULT_EDITOR_DISPLAY_PREFS: EditorDisplayPrefs = { fontSize: 17, lineHeight: 32 }
export const EDITOR_DISPLAY_PRESETS: Array<EditorDisplayPrefs & { key: string; label: string }> = [
  { key: 'webNovel', label: '网文标准', fontSize: 17, lineHeight: 32 },
  { key: 'review', label: '宽松审稿', fontSize: 18, lineHeight: 38 },
  { key: 'sprint', label: '紧凑冲刺', fontSize: 16, lineHeight: 28 },
]

export function deslopGateTone(status: string) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'fail' || normalized === 'failed' || normalized === 'blocker') return 'fail'
  if (normalized === 'warn' || normalized === 'warning') return 'warn'
  return 'pass'
}

export function DeslopGateDiagnosticsPanel({
  diagnostics,
  onRepairDeslopGate,
  repairLoading,
}: {
  diagnostics?: DeslopGateDiagnosticsModel | null
  onRepairDeslopGate?: () => void
  repairLoading?: boolean
}) {
  if (!diagnostics?.gates?.length) return null
  const concernGates = diagnostics.gates.filter(gate => deslopGateTone(gate.status) !== 'pass' || gate.count > 0)
  const visibleGates = (concernGates.length ? concernGates : diagnostics.gates).slice(0, 7)
  const hasConcern = concernGates.length > 0 || diagnostics.concernGateCount > 0
  const canRepair = hasConcern && Boolean(onRepairDeslopGate)

  return (
    <details className={`novel-deslop-gate-panel novel-deslop-gate-panel-${hasConcern ? 'warn' : 'pass'}`} open={hasConcern}>
      <summary className="novel-deslop-gate-summary">
        <span>去AI味门禁</span>
        <Tag color={hasConcern ? 'gold' : 'green'} bordered={false}>{hasConcern ? `需处理 ${diagnostics.concernGateCount || concernGates.length}` : '已通过'}</Tag>
        <Text type="secondary">{diagnostics.summary}</Text>
        {canRepair && (
          <Button
            className="novel-deslop-gate-action novel-btn-crystal novel-btn-crystal-model"
            size="small"
            type="primary"
            loading={repairLoading}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onRepairDeslopGate?.()
            }}
          >
            修复去AI味并复检
          </Button>
        )}
      </summary>
      <div className="novel-deslop-gate-grid">
        {visibleGates.map(gate => {
          const tone = deslopGateTone(gate.status)
          const evidence = gate.evidence.slice(0, 2).join('；') || gate.patterns.slice(0, 3).join('、')
          const fix = gate.fix || '按本章语境重写成具体动作、感官或角色选择。'
          return (
            <div key={`${gate.gate}-${gate.label}`} className={`novel-deslop-gate-card novel-deslop-gate-card-${tone}`}>
              <div className="novel-deslop-gate-card-head">
                <Tag bordered={false}>{gate.gate ? `Gate ${gate.gate}` : 'Gate'}</Tag>
                <strong>{gate.label || '未命名门禁'}</strong>
                <span>{gate.count > 0 ? `${gate.count} 处` : '无命中'}</span>
              </div>
              {evidence && <Text className="novel-deslop-gate-evidence">证据：{evidence}</Text>}
              <Text className="novel-deslop-gate-fix">修法：{fix}</Text>
            </div>
          )
        })}
      </div>
    </details>
  )
}

export function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(max, Math.max(min, Math.round(numeric)))
}

export function loadEditorDisplayPrefs(): EditorDisplayPrefs {
  if (typeof window === 'undefined') return DEFAULT_EDITOR_DISPLAY_PREFS
  try {
    const raw = window.localStorage.getItem(EDITOR_DISPLAY_PREFS_KEY)
    if (!raw) return DEFAULT_EDITOR_DISPLAY_PREFS
    const parsed = JSON.parse(raw)
    return {
      fontSize: clampNumber(parsed?.fontSize, 15, 26, DEFAULT_EDITOR_DISPLAY_PREFS.fontSize),
      lineHeight: clampNumber(parsed?.lineHeight, 24, 48, DEFAULT_EDITOR_DISPLAY_PREFS.lineHeight),
    }
  } catch {
    return DEFAULT_EDITOR_DISPLAY_PREFS
  }
}

export function saveEditorDisplayPrefs(prefs: EditorDisplayPrefs) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(EDITOR_DISPLAY_PREFS_KEY, JSON.stringify(prefs))
}

export function loadWritingAuxCollapsed() {
  if (typeof window === 'undefined') return true
  const value = window.localStorage.getItem(NOVEL_WRITING_AUX_COLLAPSED_KEY)
  if (value === null) return true
  return value === 'true'
}

export function saveWritingAuxCollapsed(collapsed: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(NOVEL_WRITING_AUX_COLLAPSED_KEY, collapsed ? 'true' : 'false')
}

export function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'unsaved') return <Tooltip title="有未保存的修改"><ClockCircleOutlined style={{ color: '#faad14' }} /></Tooltip>
  if (status === 'saving') return <Tooltip title="保存中…"><SyncOutlined style={{ color: '#1677ff', animation: 'spin 1s linear infinite' }} /></Tooltip>
  if (status === 'saved') return <Tooltip title="已保存"><CheckCircleOutlined style={{ color: '#52c41a' }} /></Tooltip>
  return null
}

export function EditorDisplayControls({
  prefs,
  onChange,
}: {
  prefs: EditorDisplayPrefs
  onChange: (prefs: EditorDisplayPrefs) => void
}) {
  const changePrefs = (patch: Partial<EditorDisplayPrefs>) => {
    onChange({
      fontSize: clampNumber(patch.fontSize ?? prefs.fontSize, 15, 26, DEFAULT_EDITOR_DISPLAY_PREFS.fontSize),
      lineHeight: clampNumber(patch.lineHeight ?? prefs.lineHeight, 24, 48, DEFAULT_EDITOR_DISPLAY_PREFS.lineHeight),
    })
  }

  const resetPrefs = () => onChange(DEFAULT_EDITOR_DISPLAY_PREFS)
  const applyPreset = (preset: EditorDisplayPrefs) => onChange(preset)

  const content = (
    <div style={{ width: 260, padding: '4px 2px 0' }}>
      <Space direction="vertical" size={14} style={{ width: '100%' }}>
        <Space.Compact block>
          {EDITOR_DISPLAY_PRESETS.map(preset => (
            <Button
              key={preset.key}
              size="small"
              type={prefs.fontSize === preset.fontSize && prefs.lineHeight === preset.lineHeight ? 'primary' : 'default'}
              onClick={() => applyPreset(preset)}
            >
              {preset.label}
            </Button>
          ))}
        </Space.Compact>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <FontSizeOutlined style={{ color: '#667085' }} />
            <Text style={{ fontSize: 13 }}>字体大小</Text>
            <Text type="secondary" style={{ marginLeft: 'auto', fontSize: 12 }}>{prefs.fontSize}px</Text>
          </div>
          <Slider min={15} max={26} value={prefs.fontSize} onChange={fontSize => changePrefs({ fontSize })} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <LineHeightOutlined style={{ color: '#667085' }} />
            <Text style={{ fontSize: 13 }}>行距</Text>
            <Text type="secondary" style={{ marginLeft: 'auto', fontSize: 12 }}>{prefs.lineHeight}px</Text>
          </div>
          <Slider min={24} max={48} value={prefs.lineHeight} onChange={lineHeight => changePrefs({ lineHeight })} />
        </div>
        <Button size="small" block onClick={resetPrefs}> 恢复默认</Button>
      </Space>
    </div>
  )

  return (
    <Popover content={content} trigger="click" placement="bottomRight">
      <Tooltip title="编辑显示设置">
        <Button size="small" icon={<FontSizeOutlined />} />
      </Tooltip>
    </Popover>
  )
}

