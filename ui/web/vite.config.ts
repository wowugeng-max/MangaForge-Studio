import { defineConfig } from 'vite'

export default defineConfig({
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
        },
      },
    },
  },
})
