export type WorkspaceShellMode = 'immersive' | 'workbench'

export const NOVEL_WORKSPACE_SHELL_MODE_KEY = 'novel.workspace.shellMode'
export const NOVEL_WORKSPACE_DIRECTORY_COLLAPSED_WORKBENCH_KEY = 'novel.workspace.directoryCollapsed.workbench'

function safeStorage(): Storage | null {
  try {
    if (typeof globalThis === 'undefined') return null
    const storage = (globalThis as any).localStorage
    if (!storage || typeof storage.getItem !== 'function') return null
    return storage as Storage
  } catch {
    return null
  }
}

export function loadWorkspaceShellMode(): WorkspaceShellMode {
  const raw = safeStorage()?.getItem(NOVEL_WORKSPACE_SHELL_MODE_KEY)
  if (raw === 'workbench' || raw === 'immersive') return raw
  return 'immersive'
}

export function saveWorkspaceShellMode(mode: WorkspaceShellMode): void {
  try {
    safeStorage()?.setItem(NOVEL_WORKSPACE_SHELL_MODE_KEY, mode)
  } catch {
    // ignore quota / private mode
  }
}

export function loadWorkbenchDirectoryCollapsed(): boolean {
  const raw = safeStorage()?.getItem(NOVEL_WORKSPACE_DIRECTORY_COLLAPSED_WORKBENCH_KEY)
  return raw === '1' || raw === 'true'
}

export function saveWorkbenchDirectoryCollapsed(collapsed: boolean): void {
  try {
    safeStorage()?.setItem(NOVEL_WORKSPACE_DIRECTORY_COLLAPSED_WORKBENCH_KEY, collapsed ? '1' : '0')
  } catch {
    // ignore
  }
}

export function isImmersiveShell(shellMode: WorkspaceShellMode, workspaceArea: string): boolean {
  return shellMode === 'immersive' && workspaceArea === 'chapterWriting'
}

export function shellModeForWorkspaceArea(
  workspaceArea: string,
  writingShellMode: WorkspaceShellMode,
): WorkspaceShellMode {
  if (workspaceArea !== 'chapterWriting') return 'workbench'
  return writingShellMode
}

export function rootShellClassName(isImmersive: boolean): string {
  return isImmersive ? 'novel-workspace-shell-immersive' : 'novel-workspace-shell-workbench'
}

export function immersiveEnterPanelDefaults(): { directoryCollapsed: true; rightPanelOpen: false } {
  return { directoryCollapsed: true, rightPanelOpen: false }
}
