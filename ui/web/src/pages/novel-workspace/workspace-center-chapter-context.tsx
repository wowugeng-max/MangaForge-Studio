import React from 'react'
import { Typography } from 'antd'
import { displayValue } from './utils'

const { Text } = Typography

function shortText(value: unknown, max = 22) {
  const text = String(value || '').trim()
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max)}…` : text
}

function ContextChipList({
  items,
  max = 3,
  empty = '-',
}: {
  items: string[]
  max?: number
  empty?: string
}) {
  if (!items.length) {
    return <span className="novel-context-empty">{empty}</span>
  }
  const shown = items.slice(0, max)
  const rest = items.length - shown.length
  return (
    <span className="novel-context-chip-list">
      {shown.map(item => (
        <span key={item} className="novel-context-mini-chip" title={item}>
          {shortText(item, 20)}
        </span>
      ))}
      {rest > 0 ? (
        <span className="novel-context-mini-chip is-more" title={items.slice(max).join('；')}>
          +{rest}
        </span>
      ) : null}
    </span>
  )
}

export function WorkspaceCenterChapterContext({
  activeChapter,
  requiredAdvances = [],
  forbiddenRepeats = [],
  sceneCards = [],
  dependencyText,
}: {
  activeChapter: any
  requiredAdvances?: string[]
  forbiddenRepeats?: string[]
  sceneCards?: any[]
  dependencyText: string
}) {
  const goal = displayValue(activeChapter?.chapter_goal)
  const summary = displayValue(activeChapter?.chapter_summary)
  const conflict = displayValue(activeChapter?.conflict)
  const endingHook = displayValue(activeChapter?.ending_hook)
  const status = displayValue(activeChapter?.status) || '-'
  const firstScene = sceneCards[0]
  const showSummary = Boolean(summary && summary !== goal)
  const stripTask = goal || summary || '待补齐'
  const stripConstraint = conflict || endingHook || dependencyText
  const stripScenes = sceneCards.length > 0
    ? `${sceneCards.length} 场 · ${displayValue(firstScene?.title || firstScene?.description || firstScene?.purpose) || '待命名'}`
    : '暂无场景卡'

  return (
    <details className="novel-context-panel">
      <summary className="novel-context-strip">
        <span className="novel-context-strip-title">章节上下文</span>
        <span className="novel-context-pill">
          <strong>任务</strong>
          <span>{stripTask}</span>
        </span>
        <span className="novel-context-pill">
          <strong>约束</strong>
          <span>{stripConstraint}</span>
        </span>
        <span className="novel-context-pill">
          <strong>节拍</strong>
          <span>{stripScenes}</span>
        </span>
      </summary>

      <div className="novel-context-body">
        <section className="novel-context-block">
          <div className="novel-context-block-head">
            <span className="novel-context-block-title">本章任务</span>
          </div>
          <p className="novel-context-primary">{goal || '暂无章节目标'}</p>
          {showSummary ? <p className="novel-context-secondary">{summary}</p> : null}
        </section>

        <section className="novel-context-block">
          <div className="novel-context-block-head">
            <span className="novel-context-block-title">写作约束</span>
            <span className="novel-context-block-meta">{dependencyText} · {status}</span>
          </div>
          <div className="novel-context-kv">
            <div className="novel-context-kv-row">
              <em>冲突</em>
              <span title={conflict || ''}>{conflict || '-'}</span>
            </div>
            <div className="novel-context-kv-row">
              <em>钩子</em>
              <span title={endingHook || ''}>{endingHook || '-'}</span>
            </div>
            <div className="novel-context-kv-row">
              <em>推进</em>
              <ContextChipList items={requiredAdvances} max={3} />
            </div>
            <div className="novel-context-kv-row">
              <em>禁写</em>
              <ContextChipList items={forbiddenRepeats} max={3} />
            </div>
          </div>
        </section>

        <section className="novel-context-block novel-context-block-scenes">
          <div className="novel-context-block-head">
            <span className="novel-context-block-title">场景节拍</span>
            <span className="novel-context-block-meta">
              {sceneCards.length > 0 ? `${sceneCards.length} 场` : '未拆场景'}
            </span>
          </div>
          {sceneCards.length > 0 ? (
            <div className="novel-context-scene-list">
              {sceneCards.map((scene: any, index: number) => {
                const title = displayValue(scene.title || scene.description || scene.purpose) || '未命名场景'
                const body = displayValue(scene.purpose || scene.description)
                const sceneConflict = displayValue(scene.conflict)
                const beat = displayValue(scene.beat)
                const exitState = displayValue(scene.exit_state)
                const detail = [sceneConflict ? `冲突 ${sceneConflict}` : '', beat ? `节拍 ${beat}` : '', exitState ? `出场 ${exitState}` : '']
                  .filter(Boolean)
                  .join(' · ')
                return (
                  <div key={`${scene.scene_no || index}-${title}`} className="novel-context-scene-row">
                    <span className="novel-context-scene-index">{scene.scene_no || index + 1}</span>
                    <div className="novel-context-scene-main">
                      <div className="novel-context-scene-title-row">
                        <Text strong className="novel-context-scene-title">{title}</Text>
                        {scene.location ? <span className="novel-context-mini-chip">{scene.location}</span> : null}
                        {scene.emotional_tone ? <span className="novel-context-mini-chip is-tone">{scene.emotional_tone}</span> : null}
                      </div>
                      {body && body !== title ? (
                        <p className="novel-context-scene-body" title={body}>{body}</p>
                      ) : null}
                      {detail ? <p className="novel-context-scene-meta" title={detail}>{detail}</p> : null}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="novel-context-empty-block">暂无场景卡，生成正文前建议先补齐场景节拍。</p>
          )}
        </section>
      </div>
    </details>
  )
}
