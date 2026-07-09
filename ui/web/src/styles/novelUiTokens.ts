import type { ThemeConfig } from 'antd'

export const NOVEL_THEME_ROOT_CLASS = 'novel-theme-root'

export const novelUiTokens = {
  color: {
    primary: '#1677ff',
    primarySoft: '#eff6ff',
    success: '#16a34a',
    successSoft: '#f0fdf4',
    warning: '#d97706',
    warningSoft: '#fffbeb',
    danger: '#dc2626',
    dangerSoft: '#fef2f2',
    text: '#0f172a',
    textSecondary: '#64748b',
    border: '#e8eef5',
    borderStrong: '#dfe7f1',
    bg: '#ffffff',
    bgMuted: '#f5f7fb',
    bgCanvas: '#fbfcfe',
  },
  radius: { sm: 6, md: 8, lg: 10, pill: 999 },
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24 },
  font: {
    size: { xs: 12, sm: 13, md: 14, lg: 16 },
    weight: { regular: 400, medium: 600, bold: 700 },
  },
  control: { heightSm: 28, heightMd: 32, heightLg: 36 },
  progress: { heightSm: 6, heightMd: 8 },
  shell: { topbarHeight: 48, directoryWidth: 240, directoryCollapsed: 48 },
} as const

export const novelAntdTheme: ThemeConfig = {
  token: {
    colorPrimary: novelUiTokens.color.primary,
    colorSuccess: novelUiTokens.color.success,
    colorWarning: novelUiTokens.color.warning,
    colorError: novelUiTokens.color.danger,
    colorText: novelUiTokens.color.text,
    colorTextSecondary: novelUiTokens.color.textSecondary,
    colorBorder: novelUiTokens.color.border,
    colorBgContainer: novelUiTokens.color.bg,
    borderRadius: novelUiTokens.radius.md,
    controlHeight: novelUiTokens.control.heightMd,
    controlHeightSM: novelUiTokens.control.heightSm,
    controlHeightLG: novelUiTokens.control.heightLg,
    fontSize: novelUiTokens.font.size.md,
  },
  components: {
    Button: {
      borderRadius: novelUiTokens.radius.md,
      controlHeight: novelUiTokens.control.heightMd,
      controlHeightSM: novelUiTokens.control.heightSm,
      controlHeightLG: novelUiTokens.control.heightLg,
      fontWeight: novelUiTokens.font.weight.bold,
    },
    Progress: {
      defaultColor: novelUiTokens.color.primary,
      remainingColor: novelUiTokens.color.bgMuted,
    },
    Tag: {
      borderRadiusSM: novelUiTokens.radius.pill,
      defaultBg: novelUiTokens.color.bgMuted,
    },
    Card: {
      borderRadiusLG: novelUiTokens.radius.md,
    },
  },
}
