import React, { Suspense, lazy } from 'react'
import { Navigate, Outlet, createBrowserRouter } from 'react-router-dom'
import Layout from './components/Layout'
import { NovelThemeProvider } from './styles/NovelThemeProvider'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const StudioHome = lazy(() => import('./pages/StudioHome'))
const AssetList = lazy(() => import('./pages/Assets'))
const AssetDetail = lazy(() => import('./pages/Assets/Detail'))
const AssetCreate = lazy(() => import('./pages/Assets/Create'))
const Pipeline = lazy(() => import('./pages/Pipeline'))
const AssetEdit = lazy(() => import('./pages/Assets/Edit'))
const KeyManager = lazy(() => import('./pages/Keys'))
const VideoWorkshop = lazy(() => import('./pages/VideoWorkshop'))
const WorkflowConfig = lazy(() => import('./pages/Assets/WorkflowConfig'))
const RulesPage = lazy(() => import('./pages/Rules'))
const CanvasPage = lazy(() => import('./pages/Canvas'))
const ProviderManager = lazy(() => import('./pages/Providers'))
const NovelStudio = lazy(() => import('./pages/NovelStudio'))
const NovelProjectWorkspace = lazy(() => import('./pages/NovelProjectWorkspace'))
const NovelProductionDesk = lazy(() => import('./pages/NovelProductionDesk'))
const ModelManager = lazy(() => import('./pages/ModelManager'))

function PageFallback() {
  return (
    <div style={{ minHeight: 280, display: 'grid', placeItems: 'center', color: '#64748b', fontSize: 13 }}>
      加载中...
    </div>
  )
}

function page(element: React.ReactNode) {
  return <Suspense fallback={<PageFallback />}>{element}</Suspense>
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: page(<Dashboard />) },
      { path: 'studio', element: page(<StudioHome />) },
      { path: 'assets', element: page(<AssetList />) },
      { path: 'assets/create', element: page(<AssetCreate />) },
      { path: 'assets/:id', element: page(<AssetDetail />) },
      { path: 'video-workshop', element: page(<VideoWorkshop />) },
      { path: 'keys', element: page(<KeyManager />) },
      { path: 'models', element: page(<ModelManager />) },
      { path: 'pipeline', element: page(<Pipeline />) },
      { path: 'assets/:id/edit', element: page(<AssetEdit />) },
      { path: 'assets/workflow-config', element: page(<WorkflowConfig />) },
      { path: 'assets/workflow-config/:id?', element: page(<WorkflowConfig />) },
      { path: 'assets/workflow-config/:mode?/:id?', element: page(<WorkflowConfig />) },
      { path: 'rules', element: page(<RulesPage />) },
      { path: 'canvas', element: page(<CanvasPage />) },
      { path: 'providers', element: page(<ProviderManager />) },
      {
        path: 'novel',
        element: (
          <NovelThemeProvider>
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          </NovelThemeProvider>
        ),
        children: [
          { index: true, element: <NovelStudio /> },
          { path: 'workspace/:id', element: <NovelProjectWorkspace /> },
          { path: 'workspace/:id/production', element: <NovelProductionDesk /> },
        ],
      },

    ],
  },
  {
    path: '/project/:id',
    element: page(<CanvasPage />),
  },

  { path: '/dashboard', element: <Navigate to="/" replace /> },
  { path: '/home', element: <Navigate to="/studio" replace /> },
  { path: '/graph', element: <Navigate to="/pipeline" replace /> },
  { path: '/quality', element: <Navigate to="/rules" replace /> },
])

export default router
