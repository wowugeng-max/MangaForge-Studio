import React from 'react'
import { Navigate, createBrowserRouter } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import AssetList from './pages/Assets'
import AssetDetail from './pages/Assets/Detail'
import AssetCreate from './pages/Assets/Create'
import Pipeline from './pages/Pipeline'
import AssetEdit from './pages/Assets/Edit'
import KeyManager from './pages/Keys'
import VideoWorkshop from './pages/VideoWorkshop'
import WorkflowConfig from './pages/Assets/WorkflowConfig'
import RulesPage from './pages/Rules'
import CanvasPage from './pages/Canvas'
import ProviderManager from './pages/Providers'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'assets', element: <AssetList /> },
      { path: 'assets/create', element: <AssetCreate /> },
      { path: 'assets/:id', element: <AssetDetail /> },
      { path: 'video-workshop', element: <VideoWorkshop /> },
      { path: 'keys', element: <KeyManager /> },
      { path: 'pipeline', element: <Pipeline /> },
      { path: 'assets/:id/edit', element: <AssetEdit /> },
      { path: 'assets/workflow-config', element: <WorkflowConfig /> },
      { path: 'assets/workflow-config/:id?', element: <WorkflowConfig /> },
      { path: 'assets/workflow-config/:mode?/:id?', element: <WorkflowConfig /> },
      { path: 'rules', element: <RulesPage /> },
      { path: 'canvas', element: <CanvasPage /> },
      { path: 'providers', element: <ProviderManager /> },
    ],
  },
  {
    path: '/project/:id',
    element: <CanvasPage />,
  },

  { path: '/dashboard', element: <Navigate to="/" replace /> },
  { path: '/graph', element: <Navigate to="/pipeline" replace /> },
  { path: '/quality', element: <Navigate to="/rules" replace /> },
])

export default router
