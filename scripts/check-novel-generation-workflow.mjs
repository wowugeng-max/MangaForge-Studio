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
    'novel_background_run_queue',
    'novel_production_metrics',
    'novel_approval_gates',
    'novel_quality_benchmark',
    'novel_version_review',
    'novel_topic_validation',
    'novel_similarity_report',
    'novel_rolling_planner',
    'novel_agent_prompt_config',
    'novel_persistent_worker_queue',
    'novel_chapter_production_desk',
    'novel_reference_migration_plan',
    'novel_quality_trends',
    'novel_volume_control',
    'novel_failure_recovery',
    'novel_worker_db_lock',
    'novel_reference_migration_injection',
    'novel_production_budget',
    'novel_version_paragraph_merge',
    'novel_volume_plan_writeback',
    'novel_mock_dry_run_checks',
    'novel_persistent_worker_recovery',
    'novel_scene_level_production',
    'novel_hard_quality_gate',
    'novel_context_package_editor',
    'novel_reference_coverage_diagnostics',
    'novel_model_cost_strategy_stats',
    'novel_enhanced_story_state',
    'novel_route_module_manifest',
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
    production_metrics: false,
    approval_policy: false,
    agent_config: false,
    run_queue: false,
    worker_status: false,
    production_budget: false,
    quality_gate: false,
    reference_coverage: false,
    modules: false,
    reference_migration_plan: false,
    quality_trends: false,
    volume_control: false,
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
  const metrics = await request(`/novel/projects/${project.id}/production-metrics`)
  checks.production_metrics = Boolean(metrics?.metrics)
  const approvalPolicy = await request(`/novel/projects/${project.id}/approval-policy`)
  checks.approval_policy = Boolean(approvalPolicy?.policy)
  const agentConfig = await request(`/novel/projects/${project.id}/agent-config`)
  checks.agent_config = Boolean(agentConfig?.config)
  const runQueue = await request(`/novel/projects/${project.id}/run-queue`)
  checks.run_queue = Boolean(runQueue?.summary)
  const workerStatus = await request(`/novel/projects/${project.id}/run-queue/worker-status`)
  checks.worker_status = Boolean(workerStatus?.worker)
  const productionBudget = await request(`/novel/projects/${project.id}/production-budget`)
  checks.production_budget = Boolean(productionBudget?.budget && productionBudget?.decision)
  const qualityGate = await request(`/novel/projects/${project.id}/quality-gate`)
  checks.quality_gate = Boolean(qualityGate?.gate)
  const referenceCoverage = await request(`/novel/projects/${project.id}/reference-coverage`)
  checks.reference_coverage = Boolean(referenceCoverage?.coverage)
  const modules = await request('/novel/modules')
  checks.modules = Array.isArray(modules?.modules)
  checks.quality_trends = Array.isArray(dashboard?.dashboard?.chapter_trends)
  checks.volume_control = Array.isArray(dashboard?.dashboard?.volume_controls)

  if (chapter) {
    const diagnostics = await request(`/novel/chapters/${chapter.id}/generation-diagnostics?project_id=${project.id}`)
    checks.diagnostics = Boolean(diagnostics?.context_package && diagnostics?.preflight)
    const contextPackage = await request(`/novel/chapters/${chapter.id}/context-package?project_id=${project.id}`)
    checks.context_package_editor = Boolean(contextPackage?.context_package)
    const migration = await request(`/novel/chapters/${chapter.id}/reference-migration-plan`, {
      method: 'POST',
      body: JSON.stringify({ project_id: project.id, dry_run: true }),
    })
    checks.reference_migration_plan = Boolean(migration?.plan || migration?.review)
    const versions = await request(`/novel/chapters/${chapter.id}/versions`)
    if (Array.isArray(versions) && versions[0]) {
      const merge = await request(`/novel/chapters/${chapter.id}/version-merge`, {
        method: 'POST',
        body: JSON.stringify({ project_id: project.id, version_id: versions[0].id, choices: [], dry_run: true }),
      })
      checks.version_merge = Boolean(merge?.dry_run)
    } else {
      checks.version_merge = true
    }
  } else {
    checks.diagnostics = true
    checks.reference_migration_plan = true
    checks.version_merge = true
    checks.context_package_editor = true
  }
  const volumeSync = await request(`/novel/projects/${project.id}/volume-control/sync`, {
    method: 'POST',
    body: JSON.stringify({ volume_remaining_goals: [], dry_run: true }),
  })
  checks.volume_writeback = Boolean(volumeSync?.volume_control)

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
