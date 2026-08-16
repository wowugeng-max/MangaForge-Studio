import { describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import JSZip from 'jszip'
import { installOhStoryCoreSuite } from './install'
import { OH_STORY_REVIEWER_AGENTS, ohStoryCoreAgentsDir, ohStoryCoreRoot } from './store'

async function fakeArchive(): Promise<Uint8Array> {
  const zip = new JSZip()
  const root = 'oh-story-claudecode-546101ee259cec1791546c1124a5ccafa56d2f04'
  for (const skill of ['story-review', 'story-deslop', 'story-long-write']) {
    zip.file(`${root}/skills/${skill}/SKILL.md`, `---\nname: ${skill}\n---\n# ${skill}`)
  }
  zip.file(`${root}/skills/story-setup/SKILL.md`, '# setup\n\nagents_version: 25\n')
  for (const agent of ['story-architect', 'character-designer', 'narrative-writer', 'consistency-checker']) {
    zip.file(`${root}/skills/story-setup/references/codex/agents/${agent}.toml`, `name = "${agent}"\ndescription = """d"""\ndeveloper_instructions = """i"""\n`)
  }
  zip.file(`${root}/skills/story-setup/references/agent-references/anti-ai-writing.md`, '# ref')
  return await zip.generateAsync({ type: 'uint8array' })
}

describe('install agents bundle', () => {
  test('install extracts reviewer toml, agent references and agents_version', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'ohstory-install-'))
    const bytes = await fakeArchive()
    await installOhStoryCoreSuite(ws, {
      fetchImpl: (async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/commits/HEAD')) {
          return new Response(JSON.stringify({ sha: '546101ee259cec1791546c1124a5ccafa56d2f04' }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        }
        return new Response(bytes.buffer as ArrayBuffer, { status: 200 })
      }) as any,
    })
    for (const agent of OH_STORY_REVIEWER_AGENTS) {
      expect(existsSync(join(ohStoryCoreAgentsDir(ws), `${agent}.toml`))).toBe(true)
    }
    expect(existsSync(join(ohStoryCoreRoot(ws), 'agent-references', 'anti-ai-writing.md'))).toBe(true)
    const pack = JSON.parse(readFileSync(join(ohStoryCoreRoot(ws), 'pack.json'), 'utf8'))
    expect(pack.agents_version).toBe(25)
    expect(pack.agents).toEqual([...OH_STORY_REVIEWER_AGENTS])
  })
})
