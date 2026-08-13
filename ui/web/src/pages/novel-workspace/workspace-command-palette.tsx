import React from 'react'
import { Input, Modal, Typography } from 'antd'
import type { InputRef } from 'antd/es/input'
import {
  filterWorkspaceCommands,
  type WorkspaceCommand,
} from './workspace-command-palette-model'

const { Text } = Typography

export function WorkspaceCommandPalette({
  open,
  commands,
  onClose,
}: {
  open: boolean
  commands: WorkspaceCommand[]
  onClose: () => void
}) {
  const [query, setQuery] = React.useState('')
  const [activeIndex, setActiveIndex] = React.useState(0)
  const inputRef = React.useRef<InputRef | null>(null)

  const filtered = React.useMemo(
    () => filterWorkspaceCommands(commands, query),
    [commands, query],
  )

  React.useEffect(() => {
    if (!open) return
    setQuery('')
    setActiveIndex(0)
    // Modal 挂载后再聚焦
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50)
    return () => window.clearTimeout(timer)
  }, [open])

  React.useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const runCommand = (command: WorkspaceCommand | undefined) => {
    if (!command) return
    onClose()
    command.run()
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex(index => Math.min(index + 1, filtered.length - 1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex(index => Math.max(index - 1, 0))
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      runCommand(filtered[activeIndex])
    }
  }

  let lastSection = ''

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closable={false}
      width={480}
      className="novel-command-palette"
      styles={{ body: { padding: 0 } }}
      destroyOnClose
    >
      <div onKeyDown={handleKeyDown}>
        <Input
          ref={inputRef}
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="输入命令……（↑↓ 选择，Enter 执行，Esc 关闭）"
          variant="borderless"
          className="novel-command-palette-input"
        />
        <div className="novel-command-palette-list" role="listbox">
          {filtered.length === 0 ? (
            <div className="novel-command-palette-empty">
              <Text type="secondary">没有匹配的命令</Text>
            </div>
          ) : filtered.map((command, index) => {
            const sectionHeader = command.section !== lastSection ? command.section : null
            lastSection = command.section
            return (
              <React.Fragment key={command.key}>
                {sectionHeader ? (
                  <div className="novel-command-palette-section">{sectionHeader}</div>
                ) : null}
                <div
                  role="option"
                  aria-selected={index === activeIndex}
                  className={`novel-command-palette-item${index === activeIndex ? ' is-active' : ''}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => runCommand(command)}
                >
                  <span className="novel-command-palette-item-label">{command.label}</span>
                  {command.hint ? (
                    <span className="novel-command-palette-item-hint">{command.hint}</span>
                  ) : null}
                </div>
              </React.Fragment>
            )
          })}
        </div>
        <div className="novel-command-palette-footer">
          <Text type="secondary">⌘K 命令面板 · ⌘↩ 主行动 · ⌘F 查找替换</Text>
        </div>
      </div>
    </Modal>
  )
}
