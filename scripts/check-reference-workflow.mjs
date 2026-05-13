const baseUrl = process.env.MANGAFORGE_API_BASE || 'http://127.0.0.1:8787/api'
const args = new Set(process.argv.slice(2))
const explicitProjectId = process.argv.slice(2).find(arg => /^\d+$/.test(arg))

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  const text = await response.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} failed: HTTP ${response.status} ${text.slice(0, 300)}`)
  }
  return body
}

function assertFeature(status, key) {
  if (!status?.features?.[key]) throw new Error(`missing backend feature: ${key}`)
}

async function main() {
  const status = await request('/status')
  assertFeature(status, 'novel_reference_preview')
  assertFeature(status, 'novel_reference_profile_supplement')
  assertFeature(status, 'novel_reference_reports')

  const projects = await request('/novel/projects')
  if (!Array.isArray(projects) || projects.length === 0) throw new Error('no novel projects found')

  const selected = explicitProjectId
    ? projects.find(project => Number(project.id) === Number(explicitProjectId))
    : projects.find(project => Array.isArray(project.reference_config?.references) && project.reference_config.references.length > 0) || projects[0]
  if (!selected) throw new Error(`project not found: ${explicitProjectId}`)

  const preview = await request(`/novel/projects/${selected.id}/reference-preview`, {
    method: 'POST',
    body: JSON.stringify({ task_type: '正文创作' }),
  })

  const activeReferenceCount = Array.isArray(preview.active_references) ? preview.active_references.length : 0
  const injectedEntryCount = Array.isArray(preview.entries) ? preview.entries.length : 0
  const warnings = Array.isArray(preview.warnings) ? preview.warnings : []

  if (args.has('--supplement')) {
    const firstRef = preview.active_references?.[0]?.project_title || selected.reference_config?.references?.[0]?.project_title
    if (firstRef) {
      const result = await request('/knowledge/projects/profile-supplement', {
        method: 'POST',
        body: JSON.stringify({ project_title: firstRef }),
      })
      console.log(`profile supplement: ${result.stored || 0} stored for ${firstRef}`)
    }
  }

  console.log(JSON.stringify({
    ok: true,
    project_id: selected.id,
    project_title: selected.title,
    active_reference_count: activeReferenceCount,
    injected_entry_count: injectedEntryCount,
    warnings,
  }, null, 2))
}

main().catch(error => {
  console.error(error.message || error)
  process.exit(1)
})
