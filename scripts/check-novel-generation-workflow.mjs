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
    'novel_original_incubation',
    'novel_chapter_group_generation',
    'novel_production_dashboard',
    'novel_editor_report',
    'novel_model_strategy',
    'novel_writing_assets',
    'novel_chapter_group_autorun',
    'novel_original_incubation_confirm',
    'novel_editor_revision',
    'novel_reference_fusion',
    'novel_story_state_manual_edit',
    'novel_book_review',
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
    production_dashboard: false,
    writing_assets: false,
    model_strategy: false,
    reference_fusion: false,
    story_state: false,
    diagnostics: false,
    runs: false,
  }

  const bible = await request(`/novel/projects/${project.id}/writing-bible`)
  checks.writing_bible = Boolean(bible?.writing_bible)
  const dashboard = await request(`/novel/projects/${project.id}/production-dashboard`)
  checks.production_dashboard = Boolean(dashboard?.dashboard)
  const assets = await request(`/novel/projects/${project.id}/writing-assets`)
  checks.writing_assets = Array.isArray(assets?.assets)
  const strategy = await request(`/novel/projects/${project.id}/model-strategy`)
  checks.model_strategy = Boolean(strategy?.strategy)
  const fusion = await request(`/novel/projects/${project.id}/reference-fusion`)
  checks.reference_fusion = Boolean(fusion?.fusion)
  const storyState = await request(`/novel/projects/${project.id}/story-state`)
  checks.story_state = Boolean(storyState && storyState.ok)

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
