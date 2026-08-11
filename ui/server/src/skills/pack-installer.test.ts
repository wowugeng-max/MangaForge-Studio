import { describe, expect, test } from 'bun:test'
import JSZip from 'jszip'
import { access, mkdtemp, readFile, readdir, stat, writeFile, mkdir, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  installGitHubSkillPack,
  installLocalSkillPack,
  parseGitHubArchiveRedirect,
  parsePublicGitHubUrl,
  readPackRecord,
} from './pack-installer'

async function zipBytes(entries: Array<{ name: string; content?: string; dir?: boolean }>) {
  const zip = new JSZip()
  for (const entry of entries) {
    if (entry.dir) zip.folder(entry.name)
    else zip.file(entry.name, entry.content ?? '')
  }
  return zip.generateAsync({ type: 'uint8array' })
}

function response(body: unknown, status = 200): Response {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('Skill Pack installer', () => {
  test('parses only public GitHub repository URLs', () => {
    expect(parsePublicGitHubUrl('https://github.com/acme/demo')).toEqual({ owner: 'acme', repo: 'demo', id: 'demo' })
    expect(parsePublicGitHubUrl('https://github.com/acme/demo.git')).toEqual({ owner: 'acme', repo: 'demo', id: 'demo' })
    for (const value of [
      'http://github.com/acme/demo',
      'https://gitlab.com/acme/demo',
      'https://github.com/acme/demo?x=1',
      'https://github.com/acme/demo#x',
      'https://github.com/acme/demo/../../escape',
      'https://github.com/acme/demo%2Fescape',
      'https://github.com/acme/demo/../other',
      'https://github.com/acme/./demo',
      'https://github.com/acme/demo/',
    ]) expect(() => parsePublicGitHubUrl(value)).toThrow(expect.objectContaining({ code: 'SKILL_GITHUB_URL_INVALID' }))
  })

  test('accepts only an exact GitHub codeload redirect for the requested repository', () => {
    const repo = parsePublicGitHubUrl('https://github.com/minimax-ai/minimax-h3')
    const sha = 'fa6891ff7cdaaa03fa4497e89ac64ff169219acf'
    expect(parseGitHubArchiveRedirect(`https://codeload.github.com/MiniMax-AI/MiniMax-H3/zip/${sha}`, repo)).toBe(sha)
    expect(parseGitHubArchiveRedirect(`https://codeload.github.com/minimax-ai/minimax-h3/zip/${sha}`, repo)).toBe(sha)

    for (const value of [
      `http://codeload.github.com/MiniMax-AI/MiniMax-H3/zip/${sha}`,
      `https://evil.example/MiniMax-AI/MiniMax-H3/zip/${sha}`,
      `https://user@codeload.github.com/MiniMax-AI/MiniMax-H3/zip/${sha}`,
      `https://@codeload.github.com/MiniMax-AI/MiniMax-H3/zip/${sha}`,
      `https://codeload.github.com:444/MiniMax-AI/MiniMax-H3/zip/${sha}`,
      `https://codeload.github.com:443/MiniMax-AI/MiniMax-H3/zip/${sha}`,
      ` https://codeload.github.com:443/MiniMax-AI/MiniMax-H3/zip/${sha}`,
      `\nhttps://codeload.github.com:443/MiniMax-AI/MiniMax-H3/zip/${sha}`,
      `https://codeload.github.com/MiniMax-AI/x/../MiniMax-H3/zip/${sha}`,
      `https://codeload.github.com\\MiniMax-AI\\MiniMax-H3\\zip\\${sha}`,
      `https://codeload%2egithub.com/MiniMax-AI/MiniMax-H3/zip/${sha}`,
      `https://codeload.github.com/MiniMax-AI/MiniMax-H3/zip/${sha}?download=1`,
      `https://codeload.github.com/MiniMax-AI/MiniMax-H3/zip/${sha}#archive`,
      `https://codeload.github.com/other/MiniMax-H3/zip/${sha}`,
      `https://codeload.github.com/MiniMax-AI/other/zip/${sha}`,
      'https://codeload.github.com/MiniMax-AI/MiniMax-H3/zip/HEAD',
      `https://codeload.github.com/MiniMax-AI/MiniMax-H3/tar/${sha}`,
      `/MiniMax-AI/MiniMax-H3/zip/${sha}`,
      'not a URL',
    ]) expect(() => parseGitHubArchiveRedirect(value, repo)).toThrow(expect.objectContaining({ code: 'SKILL_PACK_DOWNLOAD_FAILED' }))
  })

  test('downloads HEAD, validates and atomically installs a GitHub pack revision', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mf-pack-'))
    const sha = '0123456789abcdef0123456789abcdef01234567'
    const archive = await zipBytes([
      { name: 'demo-main/skills/first/SKILL.md', content: '---\nname: first\n---\nfirst' },
      { name: 'demo-main/skills/second/SKILL.md', content: '---\nname: second\n---\nsecond' },
      { name: 'demo-main/postinstall.ts', content: "throw new Error('must not execute')" },
    ])
    const calls: string[] = []
    const fetchImpl = async (input: RequestInfo | URL) => {
      const url = String(input); calls.push(url)
      if (url.endsWith('/commits/HEAD')) return response({ sha })
      if (url === `https://codeload.github.com/acme/demo/zip/${sha}`) return new Response(archive)
      return response({}, 404)
    }
    const result = await installGitHubSkillPack('https://github.com/acme/demo', { workspace, fetchImpl })
    expect(result).toMatchObject({ id: 'demo', sourceUrl: 'https://github.com/acme/demo', revision: sha })
    expect(calls).toEqual([
      'https://api.github.com/repos/acme/demo/commits/HEAD',
      `https://codeload.github.com/acme/demo/zip/${sha}`,
    ])
    const root = join(workspace, '.mangaforge', 'skill-packs', 'demo', sha)
    expect(await stat(join(root, 'skills/first/SKILL.md'))).toBeTruthy()
    expect(await stat(join(root, 'skills/second/SKILL.md'))).toBeTruthy()
    await expect(access(join(root, 'postinstall.ts'))).rejects.toThrow()
    expect(await readFile(join(root, 'pack.json'), 'utf8')).toContain('"status":"installed"')
    const installedAt = (await import('./pack-installer')).readPackRecord(root)?.installedAt
    const again = await installGitHubSkillPack('https://github.com/acme/demo', { workspace, fetchImpl })
    expect(again.installedAt).toBe(installedAt)
  })

  test.each([403, 429])('falls back to the GitHub archive redirect after REST status %d', async (status) => {
    const workspace = await mkdtemp(join(tmpdir(), 'mf-pack-'))
    const sha = '1234567890abcdef1234567890abcdef12345678'
    const archive = await zipBytes([{ name: `demo-${sha}/skills/demo/SKILL.md`, content: '---\nname: demo\n---\ndemo' }])
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      calls.push({ url, init })
      if (url.endsWith('/commits/HEAD')) return response({}, status)
      if (url === 'https://github.com/acme/demo/archive/HEAD.zip') {
        return new Response(null, { status: 302, headers: { location: `https://codeload.github.com/acme/demo/zip/${sha}` } })
      }
      if (url === `https://codeload.github.com/acme/demo/zip/${sha}`) return new Response(archive)
      return response({}, 404)
    }

    const result = await installGitHubSkillPack('https://github.com/acme/demo', { workspace, fetchImpl })

    expect(result.revision).toBe(sha)
    expect(await readFile(join(result.path, 'skills/demo/SKILL.md'), 'utf8')).toContain('name: demo')
    expect(calls).toEqual([
      { url: 'https://api.github.com/repos/acme/demo/commits/HEAD', init: { headers: { accept: 'application/vnd.github+json' } } },
      { url: 'https://github.com/acme/demo/archive/HEAD.zip', init: { method: 'HEAD', redirect: 'manual' } },
      { url: `https://codeload.github.com/acme/demo/zip/${sha}`, init: undefined },
    ])
  })

  test.each([301, 307, 308])('accepts GitHub archive redirect status %d during rate-limit fallback', async (redirectStatus) => {
    const workspace = await mkdtemp(join(tmpdir(), 'mf-pack-'))
    const sha = '234567890abcdef1234567890abcdef123456789'
    const archive = await zipBytes([{ name: `demo-${sha}/skills/demo/SKILL.md`, content: '---\nname: demo\n---\ndemo' }])
    const fetchImpl = async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/commits/HEAD')) return response({}, 403)
      if (url === 'https://github.com/acme/demo/archive/HEAD.zip') {
        return new Response(null, { status: redirectStatus, headers: { location: `https://codeload.github.com/acme/demo/zip/${sha}` } })
      }
      return new Response(archive)
    }

    await expect(installGitHubSkillPack('https://github.com/acme/demo', { workspace, fetchImpl })).resolves.toMatchObject({ revision: sha })
  })

  test('does not fall back after a non-rate-limit REST failure', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mf-pack-'))
    const calls: string[] = []
    const fetchImpl = async (input: RequestInfo | URL) => {
      calls.push(String(input))
      return response({}, 404)
    }

    await expect(installGitHubSkillPack('https://github.com/acme/demo', { workspace, fetchImpl })).rejects.toThrow(
      expect.objectContaining({ code: 'SKILL_PACK_DOWNLOAD_FAILED', message: 'GitHub HEAD request failed: 404' }),
    )
    expect(calls).toEqual(['https://api.github.com/repos/acme/demo/commits/HEAD'])
  })

  test('does not fall back after a REST network failure', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mf-pack-'))
    const calls: string[] = []
    const failure = new Error('network unavailable')
    const fetchImpl = async (input: RequestInfo | URL) => {
      calls.push(String(input))
      throw failure
    }

    await expect(installGitHubSkillPack('https://github.com/acme/demo', { workspace, fetchImpl })).rejects.toThrow(
      expect.objectContaining({ code: 'SKILL_PACK_DOWNLOAD_FAILED', message: 'Unable to fetch https://api.github.com/repos/acme/demo/commits/HEAD', cause: failure }),
    )
    expect(calls).toEqual(['https://api.github.com/repos/acme/demo/commits/HEAD'])
  })

  test.each([
    ['a non-redirect response', new Response(null, { status: 200 }), 'GitHub archive fallback failed: 200'],
    ['a redirect without Location', new Response(null, { status: 302 }), 'GitHub archive fallback did not return a redirect location'],
    ['an untrusted redirect', new Response(null, { status: 302, headers: { location: 'https://evil.example/archive.zip' } }), 'GitHub archive fallback returned an untrusted redirect'],
  ])('rejects rate-limit fallback with %s before archive download', async (_label, fallbackResponse, message) => {
    const workspace = await mkdtemp(join(tmpdir(), 'mf-pack-'))
    const calls: string[] = []
    const fetchImpl = async (input: RequestInfo | URL) => {
      const url = String(input)
      calls.push(url)
      if (url.endsWith('/commits/HEAD')) return response({}, 403)
      return fallbackResponse
    }

    await expect(installGitHubSkillPack('https://github.com/acme/demo', { workspace, fetchImpl })).rejects.toThrow(
      expect.objectContaining({ code: 'SKILL_PACK_DOWNLOAD_FAILED', message }),
    )
    expect(calls).toEqual([
      'https://api.github.com/repos/acme/demo/commits/HEAD',
      'https://github.com/acme/demo/archive/HEAD.zip',
    ])
  })

  test('accepts a repository-scale archive while extracting only the bounded skills payload', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mf-pack-'))
    const sha = '8989898989898989898989898989898989898989'
    const archive = await zipBytes([
      { name: 'demo-main/skills/h3-prompt-writing/SKILL.md', content: '---\nname: h3-prompt-writing\n---\nprompt' },
      { name: 'demo-main/skills/h3-prompt-writing/references/base.txt', content: 'reference' },
      { name: 'demo-main/assets/large-model.bin', content: 'x'.repeat(4 * 1024 * 1024 + 1) },
      { name: 'demo-main/postinstall.ts', content: "throw new Error('must not install')" },
    ])
    const fetchImpl = async (input: RequestInfo | URL) => String(input).endsWith('/commits/HEAD')
      ? response({ sha })
      : new Response(archive, { headers: { 'content-length': '100367421' } })

    const result = await installGitHubSkillPack('https://github.com/acme/demo', { workspace, fetchImpl })

    expect(await readFile(join(result.path, 'skills/h3-prompt-writing/SKILL.md'), 'utf8')).toContain('name: h3-prompt-writing')
    expect(await readFile(join(result.path, 'skills/h3-prompt-writing/references/base.txt'), 'utf8')).toBe('reference')
    await expect(access(join(result.path, 'assets/large-model.bin'))).rejects.toThrow()
    await expect(access(join(result.path, 'postinstall.ts'))).rejects.toThrow()
  })

  test('rejects unsafe archives and leaves previous revision untouched on download failure', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mf-pack-'))
    const sha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    const unsafe = await zipBytes([{ name: '../../escape', content: 'bad' }])
    const fetchUnsafe = async (input: RequestInfo | URL) => String(input).endsWith('/commits/HEAD') ? response({ sha }) : new Response(unsafe)
    await expect(installGitHubSkillPack('https://github.com/acme/demo', { workspace, fetchImpl: fetchUnsafe })).rejects.toThrow(
      expect.objectContaining({ code: 'SKILL_ARCHIVE_PATH_ESCAPE' }),
    )
    const goodSha = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
    const archive = await zipBytes([{ name: 'demo-main/skills/x/SKILL.md', content: '---\nname: x\n---\nx' }])
    const fetchGood = async (input: RequestInfo | URL) => String(input).endsWith('/commits/HEAD') ? response({ sha: goodSha }) : new Response(archive)
    await installGitHubSkillPack('https://github.com/acme/demo', { workspace, fetchImpl: fetchGood })
    const existing = await readFile(join(workspace, '.mangaforge/skill-packs/demo', goodSha, 'skills/x/SKILL.md'), 'utf8')
    const fetchFail = async (input: RequestInfo | URL) => String(input).endsWith('/commits/HEAD') ? response({ sha: 'cccccccccccccccccccccccccccccccccccccccc' }) : response({}, 500)
    await expect(installGitHubSkillPack('https://github.com/acme/demo', { workspace, fetchImpl: fetchFail })).rejects.toThrow(
      expect.objectContaining({ code: 'SKILL_PACK_DOWNLOAD_FAILED' }),
    )
    expect(await readFile(join(workspace, '.mangaforge/skill-packs/demo', goodSha, 'skills/x/SKILL.md'), 'utf8')).toBe(existing)
  })

  test('does not leave partial extraction when a later archive entry is unsafe', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mf-pack-'))
    const sha = 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    const archive = await zipBytes([
      { name: 'demo-main/skills/ok/SKILL.md', content: '---\nname: ok\n---\nok' },
      { name: 'demo-main/../../escape.txt', content: 'bad' },
    ])
    const fetchImpl = async (input: RequestInfo | URL) => String(input).endsWith('/commits/HEAD') ? response({ sha }) : new Response(archive)
    await expect(installGitHubSkillPack('https://github.com/acme/demo', { workspace, fetchImpl })).rejects.toThrow()
    await expect(access(join(workspace, '.mangaforge/skill-packs/demo', sha))).rejects.toThrow()
  })

  test('rejects traversal in the original ZIP filename before JSZip can sanitize it', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mf-pack-'))
    const zip = new JSZip()
    zip.file('../demo-main/skills/escape/SKILL.md', '---\nname: escape\n---\nbad', { createFolders: false })
    const archive = await zip.generateAsync({ type: 'uint8array' })
    const sha = 'efefefefefefefefefefefefefefefefefefefef'
    const fetchImpl = async (input: RequestInfo | URL) => String(input).endsWith('/commits/HEAD')
      ? response({ sha })
      : new Response(archive)

    await expect(installGitHubSkillPack('https://github.com/acme/demo', { workspace, fetchImpl })).rejects.toThrow(
      expect.objectContaining({ code: 'SKILL_ARCHIVE_PATH_ESCAPE' }),
    )
    await expect(access(join(workspace, '.mangaforge/skill-packs/demo', sha))).rejects.toThrow()
  })

  test('rejects ZIP symlink entries outside the selected skills payload', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mf-pack-'))
    const zip = new JSZip()
    zip.file('demo-main/assets/link', 'outside', { unixPermissions: 0o120777 })
    const archive = await zip.generateAsync({ type: 'uint8array', platform: 'UNIX' })
    const sha = 'dddddddddddddddddddddddddddddddddddddddd'
    const fetchImpl = async (input: RequestInfo | URL) => String(input).endsWith('/commits/HEAD') ? response({ sha }) : new Response(archive)
    await expect(installGitHubSkillPack('https://github.com/acme/demo', { workspace, fetchImpl })).rejects.toThrow(
      expect.objectContaining({ code: 'SKILL_ARCHIVE_SYMLINK' }),
    )
  })

  test('rejects symlink entries even when ZIP marks them as directories', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mf-pack-'))
    const zip = new JSZip()
    zip.folder('demo-main/skills/link/')
    const symlinkEntry = zip.files['demo-main/skills/link/']
    if (symlinkEntry) symlinkEntry.unixPermissions = 0o120777
    const archive = await zip.generateAsync({ type: 'uint8array', platform: 'UNIX' })
    const sha = 'edededededededededededededededededededed'
    const fetchImpl = async (input: RequestInfo | URL) => String(input).endsWith('/commits/HEAD') ? response({ sha }) : new Response(archive)
    await expect(installGitHubSkillPack('https://github.com/acme/demo', { workspace, fetchImpl })).rejects.toThrow(
      expect.objectContaining({ code: 'SKILL_ARCHIVE_SYMLINK' }),
    )
  })

  test('imports only regular files beneath an explicit allow-listed root', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mf-pack-'))
    const allowed = await mkdtemp(join(tmpdir(), 'mf-allowed-'))
    const source = join(allowed, 'local-pack')
    await mkdir(join(source, 'skills/demo'), { recursive: true })
    await writeFile(join(source, 'skills/demo/SKILL.md'), '---\nname: demo\n---\nbody')
    const result = await installLocalSkillPack(source, { workspace, allowedRoots: [allowed], packId: 'local-demo' })
    expect(result.revision).toMatch(/^local-[a-f0-9]{64}$/)
    expect(await readFile(join(result.path, 'skills/demo/SKILL.md'), 'utf8')).toContain('name: demo')
    await expect(installLocalSkillPack(join(tmpdir(), 'not-allowed'), { workspace, allowedRoots: [allowed] })).rejects.toThrow(
      expect.objectContaining({ code: 'SKILL_LOCAL_PATH_NOT_ALLOWED' }),
    )
    const outside = await mkdtemp(join(tmpdir(), 'mf-outside-'))
    await symlink(join(outside), join(source, 'escape'))
    await expect(installLocalSkillPack(source, { workspace, allowedRoots: [allowed] })).rejects.toThrow(
      expect.objectContaining({ code: 'SKILL_LOCAL_PATH_NOT_ALLOWED' }),
    )
    await writeFile(join(source, 'postinstall.ts'), 'throw new Error()')
    await writeFile(join(source, 'archive.zip'), 'not an archive')
    await expect(installLocalSkillPack(source, { workspace, allowedRoots: [allowed] })).rejects.toThrow(
      expect.objectContaining({ code: 'SKILL_LOCAL_PATH_NOT_ALLOWED' }),
    )
  })

  test('rejects local script and archive files before copying', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mf-pack-'))
    const allowed = await mkdtemp(join(tmpdir(), 'mf-allowed-'))
    const source = join(allowed, 'unsafe-pack')
    await mkdir(join(source, 'skills/demo'), { recursive: true })
    await writeFile(join(source, 'skills/demo/SKILL.md'), '---\nname: demo\n---\nbody')
    await writeFile(join(source, 'evil.py'), 'raise RuntimeError()')
    await expect(installLocalSkillPack(source, { workspace, allowedRoots: [allowed] })).rejects.toThrow(
      expect.objectContaining({ code: 'SKILL_LOCAL_PATH_NOT_ALLOWED' }),
    )
  })

  test('hashes and installs the exact bytes read from local files', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mf-pack-'))
    const allowed = await mkdtemp(join(tmpdir(), 'mf-allowed-'))
    const source = join(allowed, 'stable-pack')
    await mkdir(join(source, 'skills/demo'), { recursive: true })
    const skillPath = join(source, 'skills/demo/SKILL.md')
    const original = '---\nname: demo\n---\noriginal'
    await writeFile(skillPath, original)
    const result = await installLocalSkillPack(source, { workspace, allowedRoots: [allowed] })
    await writeFile(skillPath, '---\nname: demo\n---\nchanged')
    expect(await readFile(join(result.path, 'skills/demo/SKILL.md'), 'utf8')).toBe(original)
  })

  test('enforces local file and aggregate size limits', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mf-pack-'))
    const allowed = await mkdtemp(join(tmpdir(), 'mf-allowed-'))
    const source = join(allowed, 'large-pack')
    await mkdir(join(source, 'skills/demo'), { recursive: true })
    await writeFile(join(source, 'skills/demo/SKILL.md'), `---\nname: demo\n---\n${'x'.repeat(256 * 1024)}`)
    await expect(installLocalSkillPack(source, { workspace, allowedRoots: [allowed] })).rejects.toThrow(
      expect.objectContaining({ code: 'SKILL_FILE_TOO_LARGE' }),
    )

    const aggregateSource = join(allowed, 'aggregate-pack')
    await mkdir(join(aggregateSource, 'references'), { recursive: true })
    await writeFile(join(aggregateSource, 'skills.md'), 'small')
    for (let index = 0; index < 5; index += 1) {
      await writeFile(join(aggregateSource, 'references', `${index}.txt`), Buffer.alloc(500 * 1024))
    }
    await expect(installLocalSkillPack(aggregateSource, { workspace, allowedRoots: [allowed] })).rejects.toThrow(
      expect.objectContaining({ code: 'SKILL_FILE_TOO_LARGE' }),
    )
  })

  test('rejects malformed pack metadata and cleans temporary directories', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mf-pack-'))
    const sha = '1212121212121212121212121212121212121212'
    const archive = await zipBytes([{ name: 'demo-main/../../escape', content: 'bad' }])
    const fetchImpl = async (input: RequestInfo | URL) => String(input).endsWith('/commits/HEAD') ? response({ sha }) : new Response(archive)
    await expect(installGitHubSkillPack('https://github.com/acme/demo', { workspace, fetchImpl })).rejects.toThrow()
    const parent = join(workspace, '.mangaforge/skill-packs/demo')
    expect((await readdir(parent)).filter((name) => name.startsWith('.tmp-'))).toEqual([])

    const root = join(parent, sha)
    await mkdir(root, { recursive: true })
    await writeFile(join(root, 'pack.json'), JSON.stringify({ id: 'demo', sourceUrl: 'https://github.com/acme/demo', revision: sha, status: 'installed' }))
    const goodArchive = await zipBytes([{ name: 'demo-main/skills/x/SKILL.md', content: '---\nname: x\n---\nx' }])
    const goodFetch = async (input: RequestInfo | URL) => String(input).endsWith('/commits/HEAD') ? response({ sha }) : new Response(goodArchive)
    await expect(installGitHubSkillPack('https://github.com/acme/demo', { workspace, fetchImpl: goodFetch })).rejects.toThrow(
      expect.objectContaining({ code: 'SKILL_PACK_INSTALL_FAILED' }),
    )
    await writeFile(join(root, 'pack.json'), JSON.stringify({ id: 'demo', sourceUrl: 'https://github.com/acme/demo', revision: sha, installedAt: 123, status: 'installed' }))
    await expect(installGitHubSkillPack('https://github.com/acme/demo', { workspace, fetchImpl: goodFetch })).rejects.toThrow(
      expect.objectContaining({ code: 'SKILL_PACK_INSTALL_FAILED' }),
    )
  })

  test('rejects malformed HEAD SHAs and forged existing metadata', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mf-pack-'))
    const badFetch = async (input: RequestInfo | URL) => String(input).endsWith('/commits/HEAD') ? response({ sha: 'abc123' }) : new Response()
    await expect(installGitHubSkillPack('https://github.com/acme/demo', { workspace, fetchImpl: badFetch })).rejects.toThrow(
      expect.objectContaining({ code: 'SKILL_PACK_DOWNLOAD_FAILED' }),
    )
    const sha = 'ffffffffffffffffffffffffffffffffffffffff'
    const root = join(workspace, '.mangaforge/skill-packs/demo', sha)
    await mkdir(root, { recursive: true })
    await writeFile(join(root, 'pack.json'), JSON.stringify({ id: 'forged', sourceUrl: 'evil', revision: sha, installedAt: 'now', status: 'installed' }))
    const archive = await zipBytes([{ name: 'demo-main/skills/x/SKILL.md', content: '---\nname: x\n---\nx' }])
    const fetchGood = async (input: RequestInfo | URL) => String(input).endsWith('/commits/HEAD') ? response({ sha }) : new Response(archive)
    await expect(installGitHubSkillPack('https://github.com/acme/demo', { workspace, fetchImpl: fetchGood })).rejects.toThrow(
      expect.objectContaining({ code: 'SKILL_PACK_INSTALL_FAILED' }),
    )
  })

  test('rejects pack.json symlinks instead of reading metadata outside the revision', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mf-pack-'))
    const outside = await mkdtemp(join(tmpdir(), 'mf-pack-outside-'))
    const sha = '3434343434343434343434343434343434343434'
    const root = join(workspace, '.mangaforge/skill-packs/demo', sha)
    await mkdir(root, { recursive: true })
    const record = { id: 'demo', sourceUrl: 'https://github.com/acme/demo', revision: sha, installedAt: new Date().toISOString(), status: 'installed' }
    const externalMetadata = join(outside, 'pack.json')
    await writeFile(externalMetadata, JSON.stringify(record))
    await symlink(externalMetadata, join(root, 'pack.json'))
    expect(readPackRecord(root)).toBeUndefined()
    const archive = await zipBytes([{ name: 'demo-main/skills/x/SKILL.md', content: '---\nname: x\n---\nx' }])
    const fetchImpl = async (input: RequestInfo | URL) => String(input).endsWith('/commits/HEAD') ? response({ sha }) : new Response(archive)
    await expect(installGitHubSkillPack('https://github.com/acme/demo', { workspace, fetchImpl })).rejects.toThrow(
      expect.objectContaining({ code: 'SKILL_PACK_INSTALL_FAILED' }),
    )
  })

  test('coalesces concurrent installs without EEXIST or temporary leftovers', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mf-pack-'))
    const sha = '5656565656565656565656565656565656565656'
    const archive = await zipBytes([{ name: 'demo-main/skills/x/SKILL.md', content: '---\nname: x\n---\nx' }])
    const fetchImpl = async (input: RequestInfo | URL) => String(input).endsWith('/commits/HEAD') ? response({ sha }) : new Response(archive)
    const [first, second] = await Promise.all([
      installGitHubSkillPack('https://github.com/acme/demo', { workspace, fetchImpl }),
      installGitHubSkillPack('https://github.com/acme/demo', { workspace, fetchImpl }),
    ])
    expect(first.revision).toBe(sha)
    expect(second.revision).toBe(sha)
    expect(first.installedAt).toBe(second.installedAt)
    expect((await readdir(join(workspace, '.mangaforge/skill-packs/demo'))).filter((name) => name.startsWith('.tmp-'))).toEqual([])
  })

  test('enforces archive and uncompressed entry caps even without a content-length header', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mf-pack-'))
    const sha = 'abababababababababababababababababababab'
    const huge = await zipBytes([{ name: 'demo-main/skills/demo/huge.bin', content: 'x'.repeat(4 * 1024 * 1024 + 1) }])
    const fetchHuge = async (input: RequestInfo | URL) => String(input).endsWith('/commits/HEAD')
      ? response({ sha })
      : new Response(huge)
    await expect(installGitHubSkillPack('https://github.com/acme/demo', { workspace, fetchImpl: fetchHuge })).rejects.toThrow(
      expect.objectContaining({ code: 'SKILL_FILE_TOO_LARGE' }),
    )
    const headerSha = 'cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd'
    const fetchHeader = async (input: RequestInfo | URL) => String(input).endsWith('/commits/HEAD')
      ? response({ sha: headerSha })
      : new Response(new Uint8Array([1]), { status: 200, headers: { 'content-length': String(128 * 1024 * 1024 + 1) } })
    await expect(installGitHubSkillPack('https://github.com/acme/demo', { workspace, fetchImpl: fetchHeader })).rejects.toThrow(
      expect.objectContaining({ code: 'SKILL_PACK_ARCHIVE_INVALID' }),
    )
  })
})
