import React, { useState, useEffect } from 'react';
import {
  Typography, Button, Card, Row, Col, Space, Tag, Modal,
  Form, Input, message, Popconfirm, Spin, Empty, Tooltip
} from 'antd';
import {
  PlusOutlined, ProjectOutlined, EditOutlined,
  DeleteOutlined, RocketOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { projectApi } from '../api/projects';
import { UI_COPY } from '../constants/uiCopy';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await projectApi.getAll();
      const list = Array.isArray(res.data?.projects) ? res.data.projects : (Array.isArray(res.data) ? res.data : []);
      const sorted = [...list].sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      setProjects(sorted);
    } catch (error) {
      message.error('无法加载项目列表');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const openModal = (project?: any) => {
    if (project) {
      setEditingId(project.id);
      form.setFieldsValue({ name: project.name, description: project.description, tags: project.tags ? project.tags.join(', ') : '' });
    } else {
      setEditingId(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const payload = { name: values.name, description: values.description, tags: values.tags ? values.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [] };
      if (editingId) {
        await projectApi.update(editingId, payload);
        message.success('项目信息已更新');
      } else {
        await projectApi.create(payload);
        message.success('项目已创建');
      }
      setIsModalOpen(false);
      fetchProjects();
    } catch (error) {
      console.log('Validation Failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await projectApi.delete(id);
      message.success('项目已删除');
      fetchProjects();
    } catch (error) {
      message.error('删除失败');
    }
  };

  return (
    <div style={{ padding: '32px 48px', minHeight: '100vh', background: '#f5f7fa' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 800, color: '#1f1f1f' }}>{UI_COPY.dashboardTitle}</Title>
          <Text type="secondary" style={{ fontSize: 16 }}>{UI_COPY.dashboardSubtitle}</Text>
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">这里负责管理项目；进入工作台后，再进行世界观、角色、大纲与正文创作。</Text>
          </div>
        </div>
        <Button type="primary" size="large" icon={<PlusOutlined />} style={{ borderRadius: 8, height: 48, padding: '0 32px', fontSize: 16, fontWeight: 600, boxShadow: '0 4px 12px rgba(24,144,255,0.3)' }} onClick={() => openModal()}>{UI_COPY.newProject}</Button>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: '100px 0' }}><Spin size="large" /></div> : projects.length === 0 ? (
        <Empty image={<img alt="empty" src="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg" style={{ height: 160 }} />} description={<Text type="secondary" style={{ fontSize: 16 }}>{UI_COPY.projectListEmpty}</Text>} style={{ marginTop: 80 }} />
      ) : (
        <Row gutter={[24, 24]}>
          {projects.map((project) => (
            <Col xs={24} sm={12} md={8} lg={6} xl={6} key={project.id}>
              <Card hoverable style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e8e8e8', transition: 'all 0.3s' }} bodyStyle={{ padding: 0 }} cover={<div style={{ height: 120, background: 'linear-gradient(135deg, #e6f7ff 0%, #f9f0ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ProjectOutlined style={{ fontSize: 48, color: '#1890ff', opacity: 0.2 }} /></div>} actions={[<Tooltip title="编辑项目"><EditOutlined key="edit" onClick={() => openModal(project)} /></Tooltip>, <Popconfirm title="删除项目" description="确定要删除这个项目吗？相关资产可能会变成孤立数据。" onConfirm={() => handleDelete(project.id)} okText="确认删除" okButtonProps={{ danger: true }}><Tooltip title="删除项目"><DeleteOutlined key="delete" style={{ color: '#ff4d4f' }} /></Tooltip></Popconfirm>]}>
                <div style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <Title level={5} style={{ margin: 0, fontWeight: 600 }} ellipsis={{ tooltip: project.name }}>{project.name}</Title>
                  </div>
                  <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><ClockCircleOutlined style={{ fontSize: 12, color: '#bfbfbf' }} /><Text type="secondary" style={{ fontSize: 12 }}>{new Date(project.updated_at).toLocaleDateString()}</Text></div>
                  <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ minHeight: 44, fontSize: 13, marginBottom: 12 }}>{project.description || '暂无描述'}</Paragraph>
                  <div style={{ marginBottom: 12, minHeight: 26, overflow: 'hidden' }}>{project.tags?.map((tag: string) => <Tag key={tag} color="blue" bordered={false} style={{ borderRadius: 4, marginBottom: 4 }}>{tag}</Tag>)}</div>
                  <Space direction="vertical" size={6} style={{ width: '100%', marginBottom: 12 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>项目内将包含世界观、角色、大纲、章节与审校记录。</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>工作台负责正文生成、Agent 执行、市场审计与平台适配。</Text>
                  </Space>
                  <Button type="primary" ghost block icon={<RocketOutlined />} style={{ borderRadius: 6, fontWeight: 500 }} onClick={() => navigate(`/project/${project.id}`)}>{UI_COPY.enterWorkspace}</Button>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal title={editingId ? '编辑项目信息' : '创建新项目'} open={isModalOpen} onOk={handleSubmit} confirmLoading={submitting} onCancel={() => setIsModalOpen(false)} okText={editingId ? '保存修改' : '创建项目'} width={480}>
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item name="name" label="项目名称" rules={[{ required: true, message: '请输入项目名称' }]}><Input placeholder="例如：赛博朋克流浪猫 概念PV" size="large" /></Form.Item>
          <Form.Item name="description" label="项目描述（可选）"><TextArea placeholder="简单描述一下这个项目的目标或灵感来源..." rows={3} /></Form.Item>
          <Form.Item name="tags" label="标签（可选，逗号分隔）"><Input placeholder="例如：动画, 脑洞, 预告片" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
