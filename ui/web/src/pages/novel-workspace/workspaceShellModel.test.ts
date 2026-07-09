import { describe, expect, test, beforeEach } from 'bun:test'
import {
  NOVEL_WORKSPACE_SHELL_MODE_KEY,
  NOVEL_WORKSPACE_DIRECTORY_COLLAPSED_WORKBENCH_KEY,
  loadWorkspaceShellMode,
  saveWorkspaceShellMode,
  loadWorkbenchDirectoryCollapsed,
  saveWorkbenchDirectoryCollapsed,
  isImmersiveShell,
  shellModeForWorkspaceArea,
  rootShellClassName,
  immersiveEnterPanelDefaults,
} from './workspaceShellModel'

describe('workspaceShellModel', () => {
  beforeEach(() => {
    // bun may not have full localStorage; mock if needed
    const store = new Map<string, string>()
    // @ts-expect-error test double
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v) },
      removeItem: (k: string) => { store.delete(k) },
      clear: () => { store.clear() },
    }
  })

  test('defaults shell mode to immersive when storage empty', () => {
    expect(loadWorkspaceShellMode()).toBe('immersive')
  })

  test('persists and loads shell mode', () => {
    saveWorkspaceShellMode('workbench')
    expect(localStorage.getItem(NOVEL_WORKSPACE_SHELL_MODE_KEY)).toBe('workbench')
    expect(loadWorkspaceShellMode()).toBe('workbench')
    saveWorkspaceShellMode('immersive')
    expect(loadWorkspaceShellMode()).toBe('immersive')
  })

  test('ignores invalid stored shell mode', () => {
    localStorage.setItem(NOVEL_WORKSPACE_SHELL_MODE_KEY, 'nope')
    expect(loadWorkspaceShellMode()).toBe('immersive')
  })

  test('workbench directory collapsed preference defaults false', () => {
    expect(loadWorkbenchDirectoryCollapsed()).toBe(false)
    saveWorkbenchDirectoryCollapsed(true)
    expect(localStorage.getItem(NOVEL_WORKSPACE_DIRECTORY_COLLAPSED_WORKBENCH_KEY)).toBe('1')
    expect(loadWorkbenchDirectoryCollapsed()).toBe(true)
  })

  test('immersive only when writing area + immersive mode', () => {
    expect(isImmersiveShell('immersive', 'chapterWriting')).toBe(true)
    expect(isImmersiveShell('workbench', 'chapterWriting')).toBe(false)
    expect(isImmersiveShell('immersive', 'storyPlanning')).toBe(false)
  })

  test('area change forces workbench outside writing', () => {
    expect(shellModeForWorkspaceArea('storyPlanning', 'immersive')).toBe('workbench')
    expect(shellModeForWorkspaceArea('chapterWriting', 'immersive')).toBe('immersive')
    expect(shellModeForWorkspaceArea('chapterWriting', 'workbench')).toBe('workbench')
  })

  test('root class names', () => {
    expect(rootShellClassName(true)).toBe('novel-workspace-shell-immersive')
    expect(rootShellClassName(false)).toBe('novel-workspace-shell-workbench')
  })

  test('immersive enter panel defaults', () => {
    expect(immersiveEnterPanelDefaults()).toEqual({
      directoryCollapsed: true,
      rightPanelOpen: false,
    })
  })
})
