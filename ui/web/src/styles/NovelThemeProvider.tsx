import React from 'react'
import { ConfigProvider } from 'antd'
import { novelAntdTheme, NOVEL_THEME_ROOT_CLASS } from './novelUiTokens'
import './novel-tokens.css'

export function NovelThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <div className={NOVEL_THEME_ROOT_CLASS} style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <ConfigProvider theme={novelAntdTheme}>
        {children}
      </ConfigProvider>
    </div>
  )
}
