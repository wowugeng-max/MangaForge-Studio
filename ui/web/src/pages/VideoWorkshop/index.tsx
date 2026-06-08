import React, { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, Space, Card, message, Select, Spin } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import apiClient from '../../api/client';
import { useAssetLibraryStore, type Asset } from '../../stores/assetLibraryStore';
import { buildAssetMediaUrl } from '../../utils/assetMedia';

const { Option } = Select;

function resolveMediaUrl(value: string) {
  return buildAssetMediaUrl(value);
}

function optionLabelForAsset(asset: Asset) {
  return `#${asset.id} ${asset.name || asset.type}`;
}

function optionMatchesInput(input: string, option?: { label?: React.ReactNode }) {
  return String(option?.label || '').toLowerCase().includes(input.toLowerCase());
}

interface Segment {
  frame_a_asset_id: number;
  frame_b_asset_id: number;
  prompt_asset_id: number;
}

export default function VideoWorkshop() {
  const { assets, loading: assetsLoading, fetchAssets } = useAssetLibraryStore();
  const [workflowAssetId, setWorkflowAssetId] = useState<number | undefined>();
  const [segments, setSegments] = useState<Segment[]>([
    { frame_a_asset_id: 0, frame_b_asset_id: 0, prompt_asset_id: 0 },
  ]);
  const [backend, setBackend] = useState<'local' | 'cloud'>('local');
  const [comfyInputDir, setComfyInputDir] = useState('');
  const [cloudBaseUrl, setCloudBaseUrl] = useState('');
  const [runningHubApiKey, setRunningHubApiKey] = useState('');
  const [runningHubTemplateId, setRunningHubTemplateId] = useState('');
  const [templateSubmitPath, setTemplateSubmitPath] = useState('');
  const [templateStatusPath, setTemplateStatusPath] = useState('');
  const [templateFrameAKey, setTemplateFrameAKey] = useState('');
  const [templateFrameBKey, setTemplateFrameBKey] = useState('');
  const [templatePromptKey, setTemplatePromptKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const workflowAssets = useMemo(() => assets.filter(asset => asset.type === 'workflow'), [assets]);
  const imageAssets = useMemo(() => assets.filter(asset => asset.type === 'image'), [assets]);
  const promptAssets = useMemo(() => assets.filter(asset => asset.type === 'prompt'), [assets]);

  const handleAddSegment = () => {
    setSegments([...segments, { frame_a_asset_id: 0, frame_b_asset_id: 0, prompt_asset_id: 0 }]);
  };

  const handleRemoveSegment = (index: number) => {
    const newSegments = segments.filter((_, i) => i !== index);
    setSegments(newSegments);
  };

  const handleSegmentChange = (index: number, field: keyof Segment, value: number) => {
    const newSegments = [...segments];
    newSegments[index][field] = value;
    setSegments(newSegments);
  };

  const handleGenerate = async () => {
    const templateId = runningHubTemplateId.trim();
    if (!workflowAssetId && !(backend === 'cloud' && templateId)) {
      message.warning(backend === 'cloud' ? '请选择工作流资产或填写 RunningHub 模板 ID' : '请输入工作流资产ID');
      return;
    }
    const validSegments = segments.filter(
      (s) => s.frame_a_asset_id && s.frame_b_asset_id && s.prompt_asset_id
    );
    if (validSegments.length === 0) {
      message.warning('至少需要一个有效的段落');
      return;
    }

    setLoading(true);
    setVideoUrl(null);
    try {
      const endpoint = backend === 'local' ? '/tasks/real_video_loop' : '/tasks/cloud_video_loop';
      const response = await apiClient.post(endpoint, {
        workflow_asset_id: workflowAssetId,
        workflow_template_id: runningHubTemplateId.trim() || undefined,
        comfy_input_dir: comfyInputDir.trim() || undefined,
        base_url: cloudBaseUrl.trim() || undefined,
        api_key: runningHubApiKey.trim() || undefined,
        template_submit_path: templateSubmitPath.trim() || undefined,
        template_status_path: templateStatusPath.trim() || undefined,
        template_input_keys: {
          frame_a: templateFrameAKey.trim() || undefined,
          frame_b: templateFrameBKey.trim() || undefined,
          prompt: templatePromptKey.trim() || undefined,
        },
        segments: validSegments,
        project_id: null,
        source_asset_ids: [],
      });
      const data = response.data;
      if (data.media_url || data.final_video) {
        setVideoUrl(resolveMediaUrl(data.media_url || data.final_video));
        message.success('视频生成成功！');
      } else {
        message.error('生成失败：未返回视频路径');
      }
    } catch (error) {
      message.error('生成失败，请检查后端');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>视频工坊</h1>
      <Card>
        <Form layout="vertical">
          <Form.Item label="工作流资产" required>
            <Select
              showSearch
              value={workflowAssetId}
              onChange={setWorkflowAssetId}
              placeholder="选择工作流资产"
              loading={assetsLoading}
              optionFilterProp="label"
              filterOption={optionMatchesInput}
              options={workflowAssets.map(asset => ({ value: Number(asset.id), label: optionLabelForAsset(asset) }))}
            />
          </Form.Item>

          <Form.Item label="执行后端">
            <Select value={backend} onChange={(value) => setBackend(value)}>
              <Option value="local">本地 (5090)</Option>
              <Option value="cloud">云端 RunningHub</Option>
            </Select>
          </Form.Item>

          {backend === 'local' ? (
            <Form.Item label="ComfyUI input 目录">
              <Input
                value={comfyInputDir}
                onChange={(e) => setComfyInputDir(e.target.value)}
                placeholder="可选，填写本地 ComfyUI input 目录路径"
              />
            </Form.Item>
          ) : (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Form.Item label="云端 Base URL">
                <Input
                  value={cloudBaseUrl}
                  onChange={(e) => setCloudBaseUrl(e.target.value)}
                  placeholder="例如 https://www.runninghub.cn/proxy"
                />
              </Form.Item>
              <Form.Item label="RunningHub API Key">
                <Input.Password
                  value={runningHubApiKey}
                  onChange={(e) => setRunningHubApiKey(e.target.value)}
                  placeholder="可选，RunningHub 代理会自动拼接到 Base URL"
                />
              </Form.Item>
              <Form.Item label="RunningHub 模板 ID">
                <Input
                  value={runningHubTemplateId}
                  onChange={(e) => setRunningHubTemplateId(e.target.value)}
                  placeholder="可选；填写后使用云端模板任务，可不选择工作流资产"
                />
              </Form.Item>
              <Space size={12} style={{ width: '100%' }}>
                <Form.Item label="模板提交路径" style={{ flex: 1, marginBottom: 0 }}>
                  <Input
                    value={templateSubmitPath}
                    onChange={(e) => setTemplateSubmitPath(e.target.value)}
                    placeholder="/task/openapi/create"
                  />
                </Form.Item>
                <Form.Item label="状态查询路径" style={{ flex: 1, marginBottom: 0 }}>
                  <Input
                    value={templateStatusPath}
                    onChange={(e) => setTemplateStatusPath(e.target.value)}
                    placeholder="/task/openapi/status"
                  />
                </Form.Item>
              </Space>
              <Space size={12} style={{ width: '100%' }}>
                <Form.Item label="首帧输入键" style={{ flex: 1, marginBottom: 0 }}>
                  <Input
                    value={templateFrameAKey}
                    onChange={(e) => setTemplateFrameAKey(e.target.value)}
                    placeholder="frame_a"
                  />
                </Form.Item>
                <Form.Item label="尾帧输入键" style={{ flex: 1, marginBottom: 0 }}>
                  <Input
                    value={templateFrameBKey}
                    onChange={(e) => setTemplateFrameBKey(e.target.value)}
                    placeholder="frame_b"
                  />
                </Form.Item>
                <Form.Item label="提示词输入键" style={{ flex: 1, marginBottom: 0 }}>
                  <Input
                    value={templatePromptKey}
                    onChange={(e) => setTemplatePromptKey(e.target.value)}
                    placeholder="prompt"
                  />
                </Form.Item>
              </Space>
            </Space>
          )}

          <Form.Item label="段落定义">
            {segments.map((seg, index) => (
              <Space key={index} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                <Select
                  showSearch
                  placeholder="首帧资产"
                  value={seg.frame_a_asset_id || ''}
                  onChange={(value) => handleSegmentChange(index, 'frame_a_asset_id', Number(value) || 0)}
                  loading={assetsLoading}
                  optionFilterProp="label"
                  filterOption={optionMatchesInput}
                  options={imageAssets.map(asset => ({ value: Number(asset.id), label: optionLabelForAsset(asset) }))}
                  style={{ width: 180 }}
                />
                <Select
                  showSearch
                  placeholder="尾帧资产"
                  value={seg.frame_b_asset_id || ''}
                  onChange={(value) => handleSegmentChange(index, 'frame_b_asset_id', Number(value) || 0)}
                  loading={assetsLoading}
                  optionFilterProp="label"
                  filterOption={optionMatchesInput}
                  options={imageAssets.map(asset => ({ value: Number(asset.id), label: optionLabelForAsset(asset) }))}
                  style={{ width: 180 }}
                />
                <Select
                  showSearch
                  placeholder="提示词资产"
                  value={seg.prompt_asset_id || ''}
                  onChange={(value) => handleSegmentChange(index, 'prompt_asset_id', Number(value) || 0)}
                  loading={assetsLoading}
                  optionFilterProp="label"
                  filterOption={optionMatchesInput}
                  options={promptAssets.map(asset => ({ value: Number(asset.id), label: optionLabelForAsset(asset) }))}
                  style={{ width: 180 }}
                />
                <MinusCircleOutlined onClick={() => handleRemoveSegment(index)} />
              </Space>
            ))}
            <Button type="dashed" onClick={handleAddSegment} icon={<PlusOutlined />}>
              添加段落
            </Button>
          </Form.Item>

          <Form.Item>
            <Button type="primary" onClick={handleGenerate} loading={loading}>
              一键生成
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {loading && (
        <Card style={{ marginTop: 24, textAlign: 'center' }}>
          <Spin tip="生成中，请稍候..." />
        </Card>
      )}

      {videoUrl && (
        <Card title="生成结果" style={{ marginTop: 24 }}>
          <video controls width="100%" src={videoUrl}>
            <track kind="captions" />
            您的浏览器不支持视频标签。
          </video>
        </Card>
      )}
    </div>
  );
}
