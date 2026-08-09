import { readFile, realpath, stat } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep, win32 } from 'node:path'

export const MAX_SKILL_FILE_BYTES = 512 * 1024
export const MAX_SKILL_DOCUMENT_BYTES = 256 * 1024
export const MAX_SKILL_AGGREGATE_BYTES = 2 * 1024 * 1024

export type SkillPathErrorCode =
  | 'SKILL_PATH_ESCAPE'
  | 'SKILL_FILE_TOO_LARGE'
  | 'SKILL_REFERENCE_MISSING'
  | 'SKILL_ARCHIVE_PATH_ESCAPE'
  | 'SKILL_ARCHIVE_SYMLINK'

export class SkillPathError extends Error {
  readonly code: SkillPathErrorCode
  readonly path?: string

  constructor(code: SkillPathErrorCode, message: string, path?: string) {
    super(message)
    this.name = 'SkillPathError'
    this.code = code
    this.path = path
  }
}

function hasTraversal(path: string): boolean {
  return path.replaceAll('\\', '/').split('/').includes('..')
}

function isWithinRoot(root: string, candidate: string): boolean {
  const child = relative(root, candidate)
  return child === '' || (!child.startsWith(`..${sep}`) && child !== '..' && !isAbsolute(child))
}

export async function assertSafeRelativeSkillPath(root: string, relativePath: string): Promise<string> {
  if (
    !relativePath ||
    isAbsolute(relativePath) ||
    win32.isAbsolute(relativePath) ||
    hasTraversal(relativePath)
  ) {
    throw new SkillPathError('SKILL_PATH_ESCAPE', `Unsafe skill path: ${relativePath}`, relativePath)
  }

  const physicalRoot = await realpath(root)
  const candidate = resolve(physicalRoot, relativePath)
  if (!isWithinRoot(physicalRoot, candidate)) {
    throw new SkillPathError('SKILL_PATH_ESCAPE', `Skill path escapes its root: ${relativePath}`, relativePath)
  }

  let physicalCandidate: string
  try {
    physicalCandidate = await realpath(candidate)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new SkillPathError(
        'SKILL_REFERENCE_MISSING',
        `Skill reference does not exist: ${relativePath}`,
        relativePath,
      )
    }
    throw error
  }
  if (!isWithinRoot(physicalRoot, physicalCandidate)) {
    throw new SkillPathError(
      'SKILL_PATH_ESCAPE',
      `Skill path resolves outside its root: ${relativePath}`,
      relativePath,
    )
  }
  return physicalCandidate
}

export type LoadedSkillReference = {
  relativePath: string
  content: string
  bytes: number
}

export async function loadSkillReferences(
  root: string,
  paths: readonly string[],
): Promise<LoadedSkillReference[]> {
  const normalizedPaths = [...new Set(paths.map((path) => path.replaceAll('\\', '/')))].sort()
  const loaded: LoadedSkillReference[] = []
  let aggregateBytes = 0

  for (const relativePath of normalizedPaths) {
    const physicalPath = await assertSafeRelativeSkillPath(root, relativePath)
    const fileStat = await stat(physicalPath)
    if (!fileStat.isFile()) {
      throw new SkillPathError(
        'SKILL_REFERENCE_MISSING',
        `Skill reference is not a regular file: ${relativePath}`,
        relativePath,
      )
    }
    const limit = relativePath.endsWith('/SKILL.md') || relativePath === 'SKILL.md'
      ? MAX_SKILL_DOCUMENT_BYTES
      : MAX_SKILL_FILE_BYTES
    if (fileStat.size > limit) {
      throw new SkillPathError(
        'SKILL_FILE_TOO_LARGE',
        `Skill file exceeds ${limit} bytes: ${relativePath}`,
        relativePath,
      )
    }
    aggregateBytes += fileStat.size
    if (aggregateBytes > MAX_SKILL_AGGREGATE_BYTES) {
      throw new SkillPathError(
        'SKILL_FILE_TOO_LARGE',
        `Skill references exceed ${MAX_SKILL_AGGREGATE_BYTES} bytes in total`,
        relativePath,
      )
    }
    const content = await readFile(physicalPath, 'utf8')
    loaded.push({ relativePath, content, bytes: fileStat.size })
  }
  return loaded
}

export type SkillArchiveEntryType = 'file' | 'directory' | 'symlink'

export function validateSkillPackArchiveEntry(
  name: string,
  type: SkillArchiveEntryType,
  size: number,
): void {
  const portableName = name.replaceAll('\\', '/')
  if (
    !portableName ||
    portableName.startsWith('/') ||
    isAbsolute(name) ||
    win32.isAbsolute(name) ||
    portableName.split('/').includes('..')
  ) {
    throw new SkillPathError(
      'SKILL_ARCHIVE_PATH_ESCAPE',
      `Unsafe skill archive entry: ${name}`,
      name,
    )
  }
  if (type === 'symlink') {
    throw new SkillPathError('SKILL_ARCHIVE_SYMLINK', `Symlinks are not allowed: ${name}`, name)
  }
  if (type === 'directory') return

  const limit = portableName.endsWith('/SKILL.md') || portableName === 'SKILL.md'
    ? MAX_SKILL_DOCUMENT_BYTES
    : MAX_SKILL_FILE_BYTES
  if (!Number.isSafeInteger(size) || size < 0 || size > limit) {
    throw new SkillPathError(
      'SKILL_FILE_TOO_LARGE',
      `Skill archive entry exceeds ${limit} bytes: ${name}`,
      name,
    )
  }
}
