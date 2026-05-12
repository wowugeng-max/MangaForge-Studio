import React from 'react'
import { Layout as AntLayout, Menu, Typography, Tag } from 'antd'
import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  HomeOutlined,
  FileImageOutlined,
  KeyOutlined,
  SettingOutlined,
  BlockOutlined,
  AppstoreOutlined,
  PlayCircleOutlined,
  BookOutlined,
  DatabaseOutlined,
  RocketOutlined,
  CompassOutlined,
} from '@ant-design/icons'

const { Content, Sider } = AntLayout
const { Text } = Typography

export default function Layout() {
  const location = useLocation()

  const getSelectedKey = () => {
    const path = location.pathname
    if (path === '/' || path === '/dashboard') return 'dashboard'
    if (path.startsWith('/studio') || path.startsWith('/home')) return 'studio'
    if (path.startsWith('/assets')) return 'assets'
    if (path.startsWith('/keys')) return 'keys'
    if (path.startsWith('/models')) return 'models'
    if (path.startsWith('/providers')) return 'providers'
    if (path.startsWith('/rules')) return 'rules'
    if (path.startsWith('/pipeline')) return 'pipeline'
    if (path.startsWith('/novel')) return 'novel'
    if (path.startsWith('/canvas')) return 'canvas'
    return 'dashboard'
  }

  const selectedKey = getSelectedKey()
  const isFullScreenWorkspace = location.pathname.startsWith('/novel/workspace')

  return (
    <AntLayout style={{ minHeight: '100vh', background: '#f5f7fb' }}>
      <Sider
        width={292}
        style={{
          background: 'linear-gradient(180deg, #111827 0%, #172036 48%, #1e293b 100%)',
          boxShadow: '10px 0 30px rgba(15, 23, 42, 0.22)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 18% 12%, rgba(56,189,248,0.16), transparent 22%), radial-gradient(circle at 84% 22%, rgba(139,92,246,0.18), transparent 24%), radial-gradient(circle at 50% 100%, rgba(14,165,233,0.08), transparent 26%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative' }}>
          <div style={{ height: 84, display: 'flex', alignItems: 'center', padding: '0 22px', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ width: 42, height: 42, borderRadius: 14, background: 'linear-gradient(135deg, #38bdf8 0%, #8b5cf6 100%)', display: 'grid', placeItems: 'center', color: '#fff', boxShadow: '0 14px 28px rgba(56, 189, 248, 0.28)' }}>
              <RocketOutlined />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#fff', fontSize: 19, fontWeight: 900, letterSpacing: 0.6, lineHeight: 1.05 }}>MangaForge Studio</div>
              <Text style={{ color: 'rgba(255,255,255,0.58)', fontSize: 12 }}>Creative model workspace</Text>
            </div>
          </div>

          <div style={{ padding: 16 }}>
            <div style={{ padding: 16, borderRadius: 18, background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 16, backdropFilter: 'blur(10px)' }}>
              <div style={{ color: '#fff', fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CompassOutlined />
                <span>能力中台</span>
              </div>
              <Text style={{ color: 'rgba(255,255,255,0.68)', fontSize: 12, lineHeight: 1.7 }}>模型、厂商、Key、资产、工作流统一管理。</Text>
            </div>

            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[selectedKey]}
              style={{ borderRight: 0, background: 'transparent' }}
              className="studio-sider-menu"
              items={[
                { key: 'dashboard', icon: <HomeOutlined />, label: <Link to="/">我的项目</Link> },
                { key: 'studio', icon: <AppstoreOutlined />, label: <Link to="/studio">Studio Home</Link> },
                { key: 'canvas', icon: <PlayCircleOutlined />, label: <Link to="/canvas">画布工作台</Link> },
                { key: 'pipeline', icon: <BookOutlined />, label: <Link to="/pipeline">Pipeline 工作台</Link> },
                { key: 'novel', icon: <BookOutlined />, label: <Link to="/novel">小说工作台</Link> },
                { type: 'divider' },
                { key: 'assets', icon: <FileImageOutlined />, label: <Link to="/assets">全局资产库</Link> },
                { key: 'keys', icon: <KeyOutlined />, label: <Link to="/keys">Key 管理</Link> },
                { key: 'models', icon: <DatabaseOutlined />, label: <Link to="/models">模型管理</Link> },
                { key: 'providers', icon: <BlockOutlined />, label: <Link to="/providers">厂商中枢</Link> },
                { key: 'rules', icon: <SettingOutlined />, label: <Link to="/rules">推荐规则</Link> },
              ]}
            />
          </div>

          <div style={{ padding: '0 22px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 16, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Tag color="cyan" style={{ borderRadius: 999, padding: '2px 10px', margin: 0 }}>UI Polished</Tag>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>v2</Text>
            </div>
          </div>
        </div>
      </Sider>

      <AntLayout style={{ background: 'transparent', minHeight: 0 }}>
        <Content style={{
          margin: 0,
          height: isFullScreenWorkspace ? '100vh' : undefined,
          minHeight: 0,
          overflow: isFullScreenWorkspace ? 'hidden' : 'auto',
          background: isFullScreenWorkspace ? '#fff' : 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)',
        }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  )
}
