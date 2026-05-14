#!/usr/bin/env node

const baseUrl = process.env.MANGAFORGE_API_URL || 'http://127.0.0.1:8787/api'

async function request(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  if (!res.ok) throw new Error(`${options.method || 'GET'} ${path} -> ${res.status}: ${text.slice(0, 300)}`)
  return data
}

async function main() {
  const status = await request('/status')
  const features = status.features || {}
  const requiredFeatures = [
    'novel_reference_preview',
    'novel_reference_profile_supplement',
    'novel_generation_pipeline',
    'novel_generation_diagnostics',
    'novel_writing_bible',
    'novel_story_state_machine',
  ]
  const missingFeatures = requiredFeatures.filter(key => !features[key])
  if (missingFeatures.length) throw new Error(`Missing status features: ${missingFeatures.join(', ')}`)

  const projects = await request('/novel/projects')
  const project = Array.isArray(projects) ? projects[0] : null
  if (!project) {
    console.log(JSON.stringify({ ok: true, skipped: true, reason: 'no novel project exists' }, null, 2))
    return
  }

  const chapters = await request(`/novel/projects/${project.id}/chapters`)
  const chapter = Array.isArray(chapters) ? chapters[0] : null
  const checks = {
    status: true,
    projects: true,
    chapters: Array.isArray(chapters),
    writing_bible: false,
    diagnostics: false,
    runs: false,
  }

  const bible = await request(`/novel/projects/${project.id}/writing-bible`)
  checks.writing_bible = Boolean(bible?.writing_bible)

  if (chapter) {
    const diagnostics = await request(`/novel/chapters/${chapter.id}/generation-diagnostics?project_id=${project.id}`)
    checks.diagnostics = Boolean(diagnostics?.context_package && diagnostics?.preflight)
  } else {
    checks.diagnostics = true
  }

  const runs = await request(`/novel/runs?project_id=${project.id}`)
  checks.runs = Array.isArray(runs)

  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([key]) => key)
  if (failed.length) throw new Error(`Workflow checks failed: ${failed.join(', ')}`)
  console.log(JSON.stringify({ ok: true, project_id: project.id, chapter_id: chapter?.id || null, checks }, null, 2))
}

main().catch(error => {
  console.error(error?.stack || String(error))
  process.exit(1)
})
