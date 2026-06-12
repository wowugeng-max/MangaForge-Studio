import { describe, expect, test } from 'bun:test'
import config from './vite.config'

function resolveManualChunk(id: string) {
  const manualChunks = (config as any)?.build?.rollupOptions?.output?.manualChunks
  if (typeof manualChunks !== 'function') throw new Error('manualChunks must be configured')
  return manualChunks(id)
}

function resolvePlugin(name: string) {
  const plugin = (config as any)?.plugins?.find((item: any) => item?.name === name)
  if (!plugin) throw new Error(`${name} plugin must be configured`)
  return plugin
}

describe('vite chunk splitting', () => {
  test('rewrites AntD barrel imports to deep imports before bundling', async () => {
    const plugin = resolvePlugin('split-antd-imports')
    const result = await plugin.transform(
      [
        "import React, { useState } from 'react'",
        "import { useParams } from 'react-router-dom'",
        "import { Button, Layout as AntLayout, message, theme } from 'antd'",
        "import type { FormInstance } from 'antd'",
        'const value = Button',
      ].join('\n'),
      '/repo/ui/web/src/example.tsx',
    )
    const code = typeof result === 'string' ? result : result?.code

    expect(code).toContain("import Button from 'antd/es/button'")
    expect(code).toContain("import AntLayout from 'antd/es/layout'")
    expect(code).toContain("import message from 'antd/es/message'")
    expect(code).toContain("import theme from 'antd/es/theme'")
    expect(code).toContain("import type { FormInstance } from 'antd/es/form'")
    expect(code).toContain("import { useParams } from 'react-router-dom'")
    expect(code).not.toContain("from 'antd'")
  })

  test('splits large novel workspace surfaces into stable chunks', () => {
    expect(resolveManualChunk('/repo/ui/web/src/pages/novel-workspace/AutoCreationDirectorWorkspace.tsx')).toBeUndefined()
    expect(resolveManualChunk('/repo/ui/web/src/pages/novel-workspace/autoCreationDirectorModel.ts')).toBeUndefined()
    expect(resolveManualChunk('/repo/ui/web/src/pages/novel-workspace/StoryPlanningWorkspace.tsx')).toBe('novel-planning')
    expect(resolveManualChunk('/repo/ui/web/src/pages/novel-workspace/planningWorkspaceModel.ts')).toBe('novel-planning')
    expect(resolveManualChunk('/repo/ui/web/src/pages/novel-workspace/WorkspaceCenter.tsx')).toBe('novel-writing-editor')
    expect(resolveManualChunk('/repo/ui/web/src/pages/novel-workspace/WritingCockpitPanel.tsx')).toBe('novel-writing-cockpit')
    expect(resolveManualChunk('/repo/ui/web/src/pages/novel-workspace/writingCockpitModel.ts')).toBe('novel-writing-cockpit')
    expect(resolveManualChunk('/repo/ui/web/src/pages/novel-workspace/writingRecommendationModel.ts')).toBe('novel-writing-recommendations')
    expect(resolveManualChunk('/repo/ui/web/src/pages/novel-workspace/ChapterDirectorySidebar.tsx')).toBe('novel-writing-sidebar')
    expect(resolveManualChunk('/repo/ui/web/src/pages/novel-workspace/ProductionGuidePanel.tsx')).toBe('novel-writing-sidebar')
    expect(resolveManualChunk('/repo/ui/web/src/pages/novel-workspace/ReferencePanel.tsx')).toBe('novel-reference-panel')
    expect(resolveManualChunk('/repo/ui/web/src/pages/novel-workspace/SettingWorkshopPanel.tsx')).toBe('novel-reference-panel')
    expect(resolveManualChunk('/repo/ui/web/src/pages/novel-workspace/StoryAssetsWorkspace.tsx')).toBe('novel-story-assets')
  })

  test('keeps existing vendor chunk groups stable', () => {
    expect(resolveManualChunk('/repo/ui/web/node_modules/react/index.js')).toBe('vendor-react')
    expect(resolveManualChunk('/repo/ui/web/node_modules/@codemirror/view/dist/index.js')).toBe('vendor-codemirror')
    expect(resolveManualChunk('/repo/ui/web/node_modules/reactflow/dist/esm/index.js')).toBe('vendor-flow')
    expect(resolveManualChunk('/repo/ui/web/node_modules/antd/es/button/button.js')).toBeUndefined()
    expect(resolveManualChunk('/repo/ui/web/node_modules/@ant-design/cssinjs/es/index.js')).toBeUndefined()
    expect(resolveManualChunk('/repo/ui/web/node_modules/@ant-design/icons/es/icons/BulbOutlined.js')).toBeUndefined()
    expect(resolveManualChunk('/repo/ui/web/node_modules/rc-table/es/Table.js')).toBeUndefined()
  })
})
