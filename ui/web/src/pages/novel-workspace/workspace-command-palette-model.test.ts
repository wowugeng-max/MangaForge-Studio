import { describe, expect, test } from 'bun:test'
import { buildChapterWorkflowPresenter } from './chapter-workflow-presenter'
import { buildWorkspaceCommands, filterWorkspaceCommands } from './workspace-command-palette-model'

function contextWith(overrides: Record<string, any> = {}) {
  const calls: string[] = []
  return {
    calls,
    ctx: {
      presenter: buildChapterWorkflowPresenter({ hasChapter: true, hasProse: true }),
      runWorkflowAction: (key: string) => calls.push(`workflow:${key}`),
      openFindReplace: () => calls.push('find'),
      openVersions: () => calls.push('versions'),
      openQuality: () => calls.push('quality'),
      openBrief: () => calls.push('brief'),
      toggleAux: () => calls.push('aux'),
      auxCollapsed: true,
      ...overrides,
    },
  }
}

describe('buildWorkspaceCommands', () => {
  test('主行动置顶且执行走工作流分发', () => {
    const { ctx, calls } = contextWith()
    const commands = buildWorkspaceCommands(ctx)
    expect(commands[0].hint).toContain('主行动')
    expect(commands[0].label).toBe('写下一章')
    commands[0].run()
    expect(calls).toEqual(['workflow:accept_chapter_and_continue'])
  })

  test('keeps 同步故事状态 in the palette after presenter secondaries', () => {
    const { ctx, calls } = contextWith()
    const commands = buildWorkspaceCommands(ctx)
    expect(commands[0].label).toBe('写下一章')
    expect(commands.some(c => c.label === '同步故事状态')).toBe(true)
    const sync = commands.find(c => c.key === 'palette:sync_story_state')
    expect(sync?.section).toBe('章节行动')
    sync?.run()
    expect(calls).toContain('workflow:sync_story_state')
  })

  test('包含次级动作与面板/编辑器入口', () => {
    const { ctx } = contextWith()
    const commands = buildWorkspaceCommands(ctx)
    const keys = commands.map(command => command.key)
    expect(keys).toContain('secondary:generate')
    expect(keys).toContain('editor:find')
    expect(keys).toContain('panel:versions')
    expect(keys).toContain('panel:quality')
    expect(keys).toContain('panel:aux')
  })

  test('辅助面板命令文案随折叠态变化', () => {
    const collapsed = buildWorkspaceCommands(contextWith({ auxCollapsed: true }).ctx)
    const expanded = buildWorkspaceCommands(contextWith({ auxCollapsed: false }).ctx)
    expect(collapsed.find(command => command.key === 'panel:aux')?.label).toBe('展开辅助面板')
    expect(expanded.find(command => command.key === 'panel:aux')?.label).toBe('收起辅助面板')
  })

  test('提供 openBookSearch 时含全书查找命令', () => {
    const { ctx, calls } = contextWith({ openBookSearch: () => calls.push('book-search') })
    const commands = buildWorkspaceCommands(ctx as any)
    const bookSearch = commands.find(command => command.key === 'editor:book-search')
    expect(bookSearch?.label).toBe('全书查找')
    bookSearch?.run()
    expect(calls).toContain('book-search')
  })

  test('无 presenter 时只有固定命令', () => {
    const { ctx } = contextWith({ presenter: null })
    const commands = buildWorkspaceCommands(ctx)
    expect(commands.every(command => command.section !== '章节行动')).toBe(true)
    expect(commands.length).toBeGreaterThan(0)
  })
})

describe('filterWorkspaceCommands', () => {
  test('空查询返回全部,支持 label 与 keywords 匹配', () => {
    const { ctx } = contextWith()
    const commands = buildWorkspaceCommands(ctx)
    expect(filterWorkspaceCommands(commands, '')).toHaveLength(commands.length)
    expect(filterWorkspaceCommands(commands, '查找').map(command => command.key)).toEqual(['editor:find'])
    expect(filterWorkspaceCommands(commands, 'search').map(command => command.key)).toEqual(['editor:find'])
    expect(filterWorkspaceCommands(commands, '不存在的命令')).toHaveLength(0)
  })
})
