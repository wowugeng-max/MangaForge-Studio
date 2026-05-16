import React from 'react'
import { Card, Col, Form, Input, InputNumber, Modal, Row, Select } from 'antd'
import type { FormInstance } from 'antd'

export type EditorKind = 'worldbuilding' | 'character' | 'outline' | 'chapter'

export function EditorModal({
  editorKind,
  form,
  onCancel,
  onSubmit,
}: {
  editorKind: EditorKind | null
  form: FormInstance
  onCancel: () => void
  onSubmit: () => void
}) {
  return (
    <Modal
      open={editorKind !== null}
      title={{ worldbuilding: '编辑世界观', character: '角色设定', outline: '大纲设定', chapter: '章节信息' }[editorKind || 'chapter'] || '编辑'}
      onCancel={onCancel}
      onOk={onSubmit}
      okText="保存"
      width={860}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
        {editorKind === 'worldbuilding' && (
          <>
            <Form.Item name="world_summary" label="世界摘要"><Input.TextArea rows={4} placeholder="描述世界整体设定" /></Form.Item>
            <Form.Item name="rules" label="规则（逗号分隔）"><Input placeholder="例如：循环规则, 能力限制, 时间代价" /></Form.Item>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="timeline_anchor" label="时间锚点"><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="version" label="版本"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
            </Row>
            <Form.Item name="known_unknowns" label="未知项（逗号分隔）"><Input placeholder="例如：真相来源, 事件操控者" /></Form.Item>
          </>
        )}
        {editorKind === 'character' && (
          <>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="name" label="角色名" rules={[{ required: true }]}><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="role_type" label="角色定位"><Input /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="archetype" label="原型"><Input /></Form.Item></Col>
              <Col span={12}><Form.Item name="goal" label="目标"><Input /></Form.Item></Col>
            </Row>
            <Card size="small" title="基础档案" style={{ marginBottom: 12 }}>
              <Row gutter={16}>
                <Col span={6}><Form.Item name="age" label="年龄" style={{ marginBottom: 0 }}><Input /></Form.Item></Col>
                <Col span={6}><Form.Item name="gender" label="性别" style={{ marginBottom: 0 }}><Input /></Form.Item></Col>
                <Col span={6}><Form.Item name="identity" label="身份" style={{ marginBottom: 0 }}><Input /></Form.Item></Col>
                <Col span={6}><Form.Item name="faction" label="势力" style={{ marginBottom: 0 }}><Input /></Form.Item></Col>
              </Row>
              <Form.Item name="appearance" label="外貌/体貌固定点" style={{ marginTop: 12, marginBottom: 0 }}>
                <Input.TextArea rows={2} placeholder="例如：断臂、衣着、标志性伤痕、气质、不可随意改变的外貌特征" />
              </Form.Item>
            </Card>
            <Form.Item name="motivation" label="动机"><Input.TextArea rows={2} /></Form.Item>
            <Form.Item name="conflict" label="冲突"><Input.TextArea rows={2} /></Form.Item>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="personality" label="性格标签（逗号或换行分隔）"><Input.TextArea rows={2} /></Form.Item></Col>
              <Col span={12}><Form.Item name="abilities" label="能力/限制（逗号或换行分隔）"><Input.TextArea rows={2} /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="items" label="持有物/资源（逗号或换行分隔）"><Input.TextArea rows={2} /></Form.Item></Col>
              <Col span={12}><Form.Item name="knowledge_scope" label="认知范围/已知事实（逗号或换行分隔）"><Input.TextArea rows={2} /></Form.Item></Col>
            </Row>
            <Form.Item name="information_boundaries" label="信息边界/不知道的事（逗号或换行分隔）">
              <Input.TextArea rows={2} placeholder="例如：不知道王长生真实身份；不知道天尊庙与皇室交易细节" />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="backstory" label="背景"><Input.TextArea rows={3} /></Form.Item></Col>
              <Col span={12}><Form.Item name="secret" label="秘密/隐藏信息"><Input.TextArea rows={3} /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="growth_arc" label="成长线"><Input.TextArea rows={2} /></Form.Item></Col>
              <Col span={12}><Form.Item name="arc_hint" label="近期弧线提示"><Input.TextArea rows={2} /></Form.Item></Col>
            </Row>
            <Form.Item name="relationships" label="关系 JSON">
              <Input.TextArea rows={3} placeholder='[{"target":"迟正","relation":"效忠","status":"试探中"}]' />
            </Form.Item>
            <Form.Item name="current_state" label="当前完整状态 JSON">
              <Input.TextArea rows={5} placeholder='{"location":"黑桑县","physical_condition":"断臂濒死","emotional_state":"警惕","last_seen_chapter":1}' />
            </Form.Item>
          </>
        )}
        {editorKind === 'outline' && (
          <>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="outline_type" label="大纲类型"><Select options={[{ value: 'master', label: '总纲' }, { value: 'volume', label: '卷纲' }, { value: 'chapter', label: '章纲' }]} /></Form.Item></Col>
              <Col span={12}><Form.Item name="title" label="标题" rules={[{ required: true }]}><Input /></Form.Item></Col>
            </Row>
            <Form.Item name="parent_id" label="父级大纲ID"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="summary" label="摘要"><Input.TextArea rows={4} /></Form.Item>
            <Form.Item name="conflict_points" label="冲突点（逗号分隔）"><Input /></Form.Item>
            <Form.Item name="turning_points" label="转折点（逗号分隔）"><Input /></Form.Item>
            <Form.Item name="hook" label="钩子"><Input.TextArea rows={2} /></Form.Item>
          </>
        )}
        {editorKind === 'chapter' && (
          <>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="chapter_no" label="章节序号"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={12}><Form.Item name="title" label="章节标题" rules={[{ required: true }]}><Input /></Form.Item></Col>
            </Row>
            <Form.Item name="outline_id" label="所属大纲ID"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="chapter_goal" label="章节目标"><Input.TextArea rows={2} /></Form.Item>
            <Form.Item name="chapter_summary" label="章节摘要"><Input.TextArea rows={3} /></Form.Item>
            <Form.Item name="conflict" label="冲突"><Input.TextArea rows={2} /></Form.Item>
            <Form.Item name="must_advance" label="本章必须推进（逗号或换行分隔）"><Input.TextArea rows={2} placeholder="例如：主角获得新线索, 反派第一次施压" /></Form.Item>
            <Form.Item name="forbidden_repeats" label="禁止重复的信息（逗号或换行分隔）"><Input.TextArea rows={2} placeholder="例如：不要重复解释灵根等级, 不要再次介绍主角贫穷背景" /></Form.Item>
            <Form.Item name="ending_hook" label="结尾钩子"><Input.TextArea rows={2} /></Form.Item>
            <Form.Item name="scene_breakdown" label="场景卡 JSON"><Input.TextArea rows={6} placeholder='[{"scene_no":1,"title":"场景标题","purpose":"场景目的","conflict":"冲突","beat":"节拍"}]' /></Form.Item>
            <Form.Item name="chapter_text" label="正文"><Input.TextArea rows={4} /></Form.Item>
          </>
        )}
      </Form>
    </Modal>
  )
}
