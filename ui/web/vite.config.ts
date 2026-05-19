import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
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
