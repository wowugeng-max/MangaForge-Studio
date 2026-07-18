import { mkdtemp, stat } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  getNovelProject,
  listChapterVersions,
  listNovelChapterSettingUsage,
  listNovelCharacters,
  listNovelChapters,
  listNovelProjects,
  listNovelReviews,
  listNovelSettingEntities,
  listNovelWorldbuilding,
  updateNovelChapter,
} from '../novel'
import { setNovelMutationTestHook } from '../novel-test-support'

export let workspaces: string[] = []

export async function tempWorkspace() {
  const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-novel-test-'))
  workspaces.push(workspace)
  return workspace
}

export async function exists(path: string) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

export async function holdSqliteWriteLock(workspace: string, holdMs: number) {
  const readyPath = join(workspace, `sqlite-lock-ready-${Date.now()}-${Math.random()}`)
  const child = Bun.spawn({
    cmd: [process.execPath, '-e', `
      import { Database } from 'bun:sqlite'
      const db = new Database(process.argv[1])
      db.exec('PRAGMA busy_timeout = 1000; BEGIN IMMEDIATE')
      await Bun.write(process.argv[2], 'ready')
      await Bun.sleep(Number(process.argv[3]))
      db.exec('COMMIT')
      db.close()
    `, join(workspace, 'novel.sqlite'), readyPath, String(holdMs)],
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const deadline = Date.now() + 5000
  while (!(await exists(readyPath))) {
    if (Date.now() >= deadline) {
      const stderr = await new Response(child.stderr).text().catch(() => '')
      const stdout = await new Response(child.stdout).text().catch(() => '')
      throw new Error(`sqlite lock holder did not become ready${stderr || stdout ? `: ${stderr || stdout}` : ''}`)
    }
    await new Promise(resolve => setTimeout(resolve, 5))
  }
  return child
}

export async function spawnBarrieredChapterUpdate(workspace: string, chapterId: number, chapterText: string, label: string) {
  const readyPath = join(workspace, `${label}-ready`)
  const releasePath = join(workspace, `${label}-release`)
  const novelModule = join(import.meta.dir, '../novel.ts')
  const testSupportModule = join(import.meta.dir, '../novel-test-support.ts')
  const child = Bun.spawn({
    cmd: [process.execPath, '-e', `
      import { existsSync } from 'fs'
      import { updateNovelChapter } from ${JSON.stringify(novelModule)}
      import { setNovelMutationTestHook } from ${JSON.stringify(testSupportModule)}
      setNovelMutationTestHook(async event => {
        if (event.phase !== 'before_full_store_write') return
        await Bun.write(${JSON.stringify(readyPath)}, 'ready')
        while (!existsSync(${JSON.stringify(releasePath)})) await Bun.sleep(5)
      })
      await updateNovelChapter(${JSON.stringify(workspace)}, ${chapterId}, { chapter_text: ${JSON.stringify(chapterText)} })
    `],
    stdout: 'pipe',
    stderr: 'pipe',
  })
  return { child, readyPath, releasePath }
}

export async function waitForPath(path: string) {
  const deadline = Date.now() + 3000
  while (!(await exists(path))) {
    if (Date.now() >= deadline) throw new Error(`timed out waiting for ${path}`)
    await new Promise(resolve => setTimeout(resolve, 5))
  }
}

export async function snapshotNovelAcceptanceStore(workspace: string, projectId: number, chapterId: number) {
  return JSON.stringify({
    project: await getNovelProject(workspace, projectId),
    chapters: await listNovelChapters(workspace, projectId),
    versions: await listChapterVersions(workspace, chapterId),
    characters: await listNovelCharacters(workspace, projectId),
    settings: await listNovelSettingEntities(workspace, projectId),
    usage: await listNovelChapterSettingUsage(workspace, projectId, chapterId),
    reviews: await listNovelReviews(workspace, projectId),
  })
}

export async function snapshotNovelReferenceStore(workspace: string, projectIds: number[], chapterIds: number[]) {
  const [chapters, versions, characters, settings, usage, reviews, worldbuilding] = await Promise.all([
    Promise.all(projectIds.map(projectId => listNovelChapters(workspace, projectId))),
    Promise.all(chapterIds.map(chapterId => listChapterVersions(workspace, chapterId))),
    Promise.all(projectIds.map(projectId => listNovelCharacters(workspace, projectId))),
    Promise.all(projectIds.map(projectId => listNovelSettingEntities(workspace, projectId))),
    Promise.all(projectIds.flatMap(projectId => chapterIds.map(chapterId => listNovelChapterSettingUsage(workspace, projectId, chapterId)))),
    Promise.all(projectIds.map(projectId => listNovelReviews(workspace, projectId))),
    Promise.all(projectIds.map(projectId => listNovelWorldbuilding(workspace, projectId))),
  ])
  return JSON.stringify({
    projects: await listNovelProjects(workspace),
    chapters,
    versions,
    characters,
    settings,
    usage,
    reviews,
    worldbuilding,
  })
}


