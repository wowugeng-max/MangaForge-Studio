import { defineConfig, type Plugin } from 'vite'

const antdImportPaths: Record<string, string> = {
  Affix: 'affix',
  Alert: 'alert',
  Anchor: 'anchor',
  App: 'app',
  AutoComplete: 'auto-complete',
  Avatar: 'avatar',
  BackTop: 'back-top',
  Badge: 'badge',
  Breadcrumb: 'breadcrumb',
  Button: 'button',
  Calendar: 'calendar',
  Card: 'card',
  Carousel: 'carousel',
  Cascader: 'cascader',
  Checkbox: 'checkbox',
  Col: 'col',
  Collapse: 'collapse',
  ColorPicker: 'color-picker',
  ConfigProvider: 'config-provider',
  DatePicker: 'date-picker',
  Descriptions: 'descriptions',
  Divider: 'divider',
  Drawer: 'drawer',
  Dropdown: 'dropdown',
  Empty: 'empty',
  Flex: 'flex',
  FloatButton: 'float-button',
  Form: 'form',
  Grid: 'grid',
  Image: 'image',
  Input: 'input',
  InputNumber: 'input-number',
  Layout: 'layout',
  List: 'list',
  Mentions: 'mentions',
  Menu: 'menu',
  Modal: 'modal',
  Pagination: 'pagination',
  Popconfirm: 'popconfirm',
  Popover: 'popover',
  Progress: 'progress',
  QRCode: 'qr-code',
  Radio: 'radio',
  Rate: 'rate',
  Result: 'result',
  Row: 'row',
  Segmented: 'segmented',
  Select: 'select',
  Skeleton: 'skeleton',
  Slider: 'slider',
  Space: 'space',
  Spin: 'spin',
  Splitter: 'splitter',
  Statistic: 'statistic',
  Steps: 'steps',
  Switch: 'switch',
  Table: 'table',
  Tabs: 'tabs',
  Tag: 'tag',
  TimePicker: 'time-picker',
  Timeline: 'timeline',
  Tooltip: 'tooltip',
  Tour: 'tour',
  Transfer: 'transfer',
  Tree: 'tree',
  TreeSelect: 'tree-select',
  Typography: 'typography',
  Upload: 'upload',
  Watermark: 'watermark',
  message: 'message',
  notification: 'notification',
  theme: 'theme',
  version: 'version',
}

const antdTypeImportPaths: Record<string, string> = {
  FormInstance: 'form',
}

function parseImportSpecifier(raw: string) {
  const [imported, local = imported] = raw.trim().split(/\s+as\s+/)
  if (!imported) return null
  return { imported: imported.trim(), local: local.trim() }
}

function splitAntdImports(): Plugin {
  const importPattern = /import\s+(type\s+)?\{([^{}]*?)\}\s+from\s+['"]antd['"];?/g
  return {
    name: 'split-antd-imports',
    enforce: 'pre',
    transform(code, id) {
      const normalizedId = normalizeChunkId(id)
      if (!normalizedId.includes('/src/') || normalizedId.includes('/node_modules/')) return null
      if (!code.includes("from 'antd'") && !code.includes('from "antd"')) return null

      let changed = false
      const nextCode = code.replace(importPattern, (full, typeKeyword: string | undefined, imports: string) => {
        const specifiers = imports
          .split(',')
          .map(parseImportSpecifier)
          .filter((item): item is { imported: string; local: string } => Boolean(item))
        if (!specifiers.length) return full

        changed = true
        const isTypeImport = Boolean(typeKeyword)
        return specifiers.map(specifier => {
          const importPath = isTypeImport
            ? antdTypeImportPaths[specifier.imported]
            : antdImportPaths[specifier.imported]
          if (!importPath) {
            throw new Error(`[split-antd-imports] Unsupported AntD import "${specifier.imported}" in ${id}`)
          }
          if (isTypeImport) {
            const alias = specifier.local === specifier.imported ? specifier.imported : `${specifier.imported} as ${specifier.local}`
            return `import type { ${alias} } from 'antd/es/${importPath}'`
          }
          return `import ${specifier.local} from 'antd/es/${importPath}'`
        }).join('\n')
      })

      return changed ? { code: nextCode, map: null } : null
    },
  }
}

function normalizeChunkId(id: string) {
  return id.replace(/\\/g, '/')
}

function resolveNovelWorkspaceChunk(id: string) {
  if (!id.includes('/src/pages/novel-workspace/')) return undefined
  if (id.includes('/StoryPlanningWorkspace') || id.includes('/planningWorkspaceModel')) {
    return 'novel-planning'
  }
  if (id.includes('/WorkspaceCenter')) return 'novel-writing-editor'
  if (id.includes('/WritingCockpitPanel') || id.includes('/writingCockpitModel')) return 'novel-writing-cockpit'
  if (id.includes('/writingRecommendationModel')) return 'novel-writing-recommendations'
  if (id.includes('/ChapterDirectorySidebar') || id.includes('/ProductionGuidePanel')) return 'novel-writing-sidebar'
  if (id.includes('/ReferencePanel') || id.includes('/SettingWorkshopPanel')) return 'novel-reference-panel'
  if (id.includes('/StoryAssetsWorkspace')) {
    return 'novel-story-assets'
  }
  return undefined
}

function resolveVendorChunk(id: string) {
  if (!id.includes('node_modules')) return undefined
  if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router-dom/') || id.includes('/scheduler/')) {
    return 'vendor-react'
  }
  if (id.includes('/@codemirror/') || id.includes('/codemirror/')) {
    return 'vendor-codemirror'
  }
  if (id.includes('/reactflow/') || id.includes('/@xyflow/')) {
    return 'vendor-flow'
  }
  return undefined
}

function resolveManualChunk(id: string) {
  const normalizedId = normalizeChunkId(id)
  return resolveNovelWorkspaceChunk(normalizedId) || resolveVendorChunk(normalizedId)
}

export default defineConfig({
  plugins: [splitAntdImports()],
  build: {
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        const id = String(warning.id || '')
        if (
          warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
          (id.includes('node_modules/antd/es/') || id.includes('node_modules/@ant-design/icons/es/')) &&
          String(warning.message || '').includes('"use client"')
        ) {
          return
        }
        defaultHandler(warning)
      },
      output: {
        manualChunks(id) {
          return resolveManualChunk(id)
        },
      },
    },
  },
})
