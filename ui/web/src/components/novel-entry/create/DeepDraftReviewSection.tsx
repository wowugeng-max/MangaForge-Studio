import React from 'react'
import { Button, Card, Input, Space, Typography } from 'antd'
import type {
  DeepDraftChapter,
  DeepDraftCharacter,
  DeepDraftReviewModel,
  DeepDraftVolume,
} from '../deepDraftReviewModel'
import { STEP0_SECTION_TITLES } from './createWizardCopy'

const { Text } = Typography

export function DeepDraftReviewSection(props: {
  model: DeepDraftReviewModel
  onChange: (patch: Partial<DeepDraftReviewModel>) => void
  onChangeCharacter: (index: number, patch: Partial<DeepDraftCharacter>) => void
  onChangeVolume: (index: number, patch: Partial<DeepDraftVolume>) => void
  onChangeChapter: (index: number, patch: Partial<DeepDraftChapter>) => void
  onRemoveItem: (section: 'characters' | 'volumes' | 'chapters', index: number) => void
  onRepairGaps: () => void
}) {
  const model = props.model

  return (
    <Card size="small" title={STEP0_SECTION_TITLES.review} styles={{ body: { padding: 12 } }} style={{ borderRadius: 12 }}>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
          <Input
            value={model.basics.title}
            onChange={event => props.onChange({ basics: { ...model.basics, title: event.target.value } })}
            placeholder="书名"
          />
          <Input
            value={model.basics.genre}
            onChange={event => props.onChange({ basics: { ...model.basics, genre: event.target.value } })}
            placeholder="题材"
          />
        </div>
        <Input.TextArea
          rows={2}
          value={model.basics.pitch}
          onChange={event => props.onChange({ basics: { ...model.basics, pitch: event.target.value } })}
          placeholder="一句话卖点：主角、冲突、爽点承诺"
        />
        <Input.TextArea
          rows={3}
          value={model.basics.synopsis}
          onChange={event => props.onChange({ basics: { ...model.basics, synopsis: event.target.value } })}
          placeholder="项目简介：给后续大纲和正文使用的核心简介"
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
          <Input.TextArea
            rows={4}
            value={model.world.summary}
            onChange={event => props.onChange({ world: { ...model.world, summary: event.target.value } })}
            placeholder="世界观摘要"
          />
          <Input.TextArea
            rows={4}
            value={model.world.powerSystem}
            onChange={event => props.onChange({ world: { ...model.world, powerSystem: event.target.value } })}
            placeholder="能力 / 金手指 / 成长体系"
          />
        </div>

        <Card
          size="small"
          title="关键人物"
          extra={(
            <Button
              size="small"
              onClick={() => props.onChange({ characters: [...model.characters, { name: '', role: '', goal: '' }] })}
            >
              添加人物
            </Button>
          )}
        >
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {model.characters.map((character, index) => (
              <div key={`review-character-${index}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
                <Input value={character.name} onChange={event => props.onChangeCharacter(index, { name: event.target.value })} placeholder="姓名" />
                <Input value={character.role} onChange={event => props.onChangeCharacter(index, { role: event.target.value })} placeholder="定位" />
                <Input value={character.goal} onChange={event => props.onChangeCharacter(index, { goal: event.target.value })} placeholder="目标 / 压力 / 关系" />
                <Button onClick={() => props.onRemoveItem('characters', index)}>移除</Button>
              </div>
            ))}
            {model.characters.length === 0 && <Text type="secondary">还没有人物，可先添加主角、对手和核心同盟。</Text>}
          </Space>
        </Card>

        <Card
          size="small"
          title="分卷规划"
          extra={(
            <Button
              size="small"
              onClick={() => props.onChange({ volumes: [...model.volumes, { title: '', goal: '' }] })}
            >
              添加分卷
            </Button>
          )}
        >
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {model.volumes.map((volume, index) => (
              <div key={`review-volume-${index}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                <Input value={volume.title} onChange={event => props.onChangeVolume(index, { title: event.target.value })} placeholder="卷名" />
                <Input value={volume.goal} onChange={event => props.onChangeVolume(index, { goal: event.target.value })} placeholder="本卷阶段目标 / 地图 / 矛盾" />
                <Button onClick={() => props.onRemoveItem('volumes', index)}>移除</Button>
              </div>
            ))}
            {model.volumes.length === 0 && <Text type="secondary">还没有分卷，可先写第一卷目标，再让模型扩展。</Text>}
          </Space>
        </Card>

        <Card
          size="small"
          title="前30章细纲"
          extra={(
            <Button
              size="small"
              onClick={() => props.onChange({
                chapters: [...model.chapters, { chapterNo: model.chapters.length + 1, title: '', goal: '' }],
              })}
            >
              添加章节
            </Button>
          )}
        >
          <div style={{ maxHeight: 360, overflow: 'auto', paddingRight: 4 }}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              {model.chapters.slice(0, 30).map((chapter, index) => (
                <div key={`review-chapter-${index}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 8 }}>
                  <Input
                    type="number"
                    value={chapter.chapterNo}
                    onChange={event => props.onChangeChapter(index, { chapterNo: Number(event.target.value) || index + 1 })}
                    placeholder="章"
                  />
                  <Input value={chapter.title} onChange={event => props.onChangeChapter(index, { title: event.target.value })} placeholder="章节名" />
                  <Input value={chapter.goal} onChange={event => props.onChangeChapter(index, { goal: event.target.value })} placeholder="本章目标 / 爽点 / 悬念" />
                  <Button onClick={() => props.onRemoveItem('chapters', index)}>移除</Button>
                </div>
              ))}
              {model.chapters.length === 0 && <Text type="secondary">还没有章节细纲，可添加前3章或直接让模型定稿补齐。</Text>}
            </Space>
          </div>
        </Card>

        <Space wrap align="center">
          <Text strong>伏笔与确认项</Text>
          <Button size="small" onClick={props.onRepairGaps}>生成本地可编辑伏笔草稿</Button>
        </Space>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
          <Input.TextArea
            rows={4}
            value={model.continuity.foreshadowing}
            onChange={event => props.onChange({ continuity: { ...model.continuity, foreshadowing: event.target.value } })}
            placeholder="伏笔与回收计划，每行一个"
          />
          <Input.TextArea
            rows={4}
            value={model.continuity.openQuestions}
            onChange={event => props.onChange({ continuity: { ...model.continuity, openQuestions: event.target.value } })}
            placeholder="确认项或待确认问题，每行一个；确认项会随项目种子保存"
          />
        </div>
      </Space>
    </Card>
  )
}
