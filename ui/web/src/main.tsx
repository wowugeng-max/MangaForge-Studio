import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'

type EpisodeStatus = {
  episodeId: string
  plot: boolean
  storyboard: boolean
  promptpack: boolean
  exportJson: boolean
  exportMd: boolean
  exportCsv: boolean
  exportZip: boolean
  releaseReady: boolean
}

type RunHistoryItem = {
  id: number
  endpoint: string
  episodeId: string
  success: boolean
  durationMs: number
  timestamp: string
  error?: string
}

type Status = {
  workspace: string
  storyRoot: string
  episodes: string[]
  files: string[]
  storyFiles: string[]
  episodeStatus: EpisodeStatus[]
  runHistory: RunHistoryItem[]
}

type Template = {
  name: string
  episodeId: string
  title: string
  premise: string
  panelTarget: number
  stylePreset: string
  consistencyLevel: 'low' | 'medium' | 'high'
  beatFramework: 'three-act' | 'five-act'
}

type ApiResult = {
  durationMs?: number
  result?: unknown
  results?: unknown[]
  error?: string
}

const api = 'http://localhost:8787/api/manga'

function StepDot({ ok }: { ok: boolean }) {
  return <span style={{ color: ok ? '#16a34a' : '#dc2626', fontWeight: 700 }}>{ok ? '●' : '○'}</span>
}

function App() {
  const [status, setStatus] = useState<Status | null>(null)
  const [episodeId, setEpisodeId] = useState('ep-100')
  const [title, setTitle] = useState('雨夜失踪案·UI')
  const [premise, setPremise] = useState('林岚追踪失踪线索，逼近钟表店秘密。')
  const [panelTarget, setPanelTarget] = useState(12)
  const [stylePreset, setStylePreset] = useState('cinematic noir manga')
  const [consistencyLevel, setConsistencyLevel] = useState<'low' | 'medium' | 'high'>('high')
  const [beatFramework, setBeatFramework] = useState<'three-act' | 'five-act'>('three-act')
  const [templates, setTemplates] = useState<Template[]>([])
  const [templateName, setTemplateName] = useState('')
  const [workspaceInput, setWorkspaceInput] = useState('')
  const [workspaces, setWorkspaces] = useState<string[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState('')
  const [fileContent, setFileContent] = useState('')
  const [running, setRunning] = useState<string | null>(null)
  const [durations, setDurations] = useState<Record<string, number>>({})

  const episodes = useMemo(() => status?.episodes ?? [], [status])

  async function refreshStatus() {
    const [statusRes, workspaceRes, templateRes] = await Promise.all([
      fetch(`${api}/status`),
      fetch(`${api}/workspaces`),
      fetch(`${api}/templates`),
    ])

    const statusData = await statusRes.json()
    const workspaceData = await workspaceRes.json()
    const templateData = await templateRes.json()

    setStatus(statusData)
    setWorkspaceInput(statusData.workspace)
    setWorkspaces(workspaceData.workspaces ?? [])
    setTemplates(templateData.templates ?? [])

    if (statusData.episodes?.length > 0 && !statusData.episodes.includes(episodeId)) {
      setEpisodeId(statusData.episodes[statusData.episodes.length - 1])
    }
  }

  useEffect(() => {
    refreshStatus().catch(console.error)
  }, [])

  async function run(endpoint: string, body: Record<string, unknown> = {}) {
    setRunning(endpoint)
    try {
      const res = await fetch(`${api}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = (await res.json()) as ApiResult
      if (data.durationMs !== undefined) {
        setDurations(prev => ({ ...prev, [endpoint]: data.durationMs! }))
      }
      setLogs(prev => [`[${endpoint}] ${JSON.stringify(data, null, 2)}`, ...prev])
      await refreshStatus()
      if (!res.ok) throw new Error(data.error || `Failed: ${endpoint}`)
    } finally {
      setRunning(null)
    }
  }

  async function runAll() {
    await run('init')
    await run('plot', { episodeId, title, premise, beatFramework, targetLength: panelTarget })
    await run('storyboard', { episodeId, title, panelTarget, stylePreset })
    await run('promptpack', { episodeId, stylePreset, consistencyLevel })
    await run('export', { episodeId, format: 'all' })
  }

  async function switchWorkspace(path: string) {
    const res = await fetch(`${api}/workspace`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace: path }),
    })
    const data = await res.json()
    setLogs(prev => [`[workspace] ${JSON.stringify(data)}`, ...prev])
    await refreshStatus()
  }

  async function saveTemplate() {
    if (!templateName.trim()) return
    const payload: Template = {
      name: templateName,
      episodeId,
      title,
      premise,
      panelTarget,
      stylePreset,
      consistencyLevel,
      beatFramework,
    }

    const res = await fetch(`${api}/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    setLogs(prev => [`[template:save] ${JSON.stringify(data)}`, ...prev])
    await refreshStatus()
  }

  async function deleteTemplate(name: string) {
    const res = await fetch(`${api}/templates/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    })
    const data = await res.json()
    setLogs(prev => [`[template:delete] ${JSON.stringify(data)}`, ...prev])
    await refreshStatus()
  }

  function applyTemplate(t: Template) {
    setEpisodeId(t.episodeId)
    setTitle(t.title)
    setPremise(t.premise)
    setPanelTarget(t.panelTarget)
    setStylePreset(t.stylePreset)
    setConsistencyLevel(t.consistencyLevel)
    setBeatFramework(t.beatFramework)
  }

  async function openFile(path: string) {
    setSelectedFile(path)
    const res = await fetch(`${api}/file?path=${encodeURIComponent(path)}`)
    const data = await res.json()
    setFileContent(data.content ?? JSON.stringify(data, null, 2))
  }

  function downloadFile(path: string) {
    window.open(`${api}/download?path=${encodeURIComponent(path)}`, '_blank')
  }

  function downloadBundle(ep: string) {
    window.open(`${api}/bundle?episodeId=${encodeURIComponent(ep)}`, '_blank')
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: 20, maxWidth: 1480, margin: '0 auto' }}>
      <h1>MangaForge Studio v5</h1>

      <section style={{ marginBottom: 16, padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
        <h2>Workspace Switcher</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={workspaceInput} onChange={e => setWorkspaceInput(e.target.value)} style={{ flex: 1 }} />
          <button onClick={() => switchWorkspace(workspaceInput)} disabled={!!running}>Switch</button>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>Known: {workspaces.join(' | ') || '(none)'}</div>
      </section>

      <section style={{ marginBottom: 16, padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
        <h2>Template Manager</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="template name" />
          <button onClick={saveTemplate}>Save Current as Template</button>
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          {templates.map(t => (
            <div key={t.name} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <strong>{t.name}</strong>
              <span style={{ fontSize: 12, color: '#666' }}>{t.episodeId} | {t.beatFramework} | {t.panelTarget} panels</span>
              <button onClick={() => applyTemplate(t)}>Load</button>
              <button onClick={() => deleteTemplate(t.name)}>Delete</button>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 16, padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
        <h2>Pipeline Runner</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <input value={episodeId} onChange={e => setEpisodeId(e.target.value)} placeholder="episodeId" />
          <input type="number" value={panelTarget} onChange={e => setPanelTarget(Number(e.target.value || 12))} placeholder="panel target" />
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="title" />
          <input value={stylePreset} onChange={e => setStylePreset(e.target.value)} placeholder="style preset" />
          <textarea value={premise} onChange={e => setPremise(e.target.value)} rows={3} style={{ gridColumn: '1 / span 2' }} />
          <select value={consistencyLevel} onChange={e => setConsistencyLevel(e.target.value as 'low' | 'medium' | 'high')}>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
          <select value={beatFramework} onChange={e => setBeatFramework(e.target.value as 'three-act' | 'five-act')}>
            <option value="three-act">three-act</option>
            <option value="five-act">five-act</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button disabled={!!running} onClick={() => run('init')}>Init</button>
          <button disabled={!!running} onClick={() => run('plot', { episodeId, title, premise, beatFramework, targetLength: panelTarget })}>Plot</button>
          <button disabled={!!running} onClick={() => run('storyboard', { episodeId, title, panelTarget, stylePreset })}>Storyboard</button>
          <button disabled={!!running} onClick={() => run('promptpack', { episodeId, stylePreset, consistencyLevel })}>PromptPack</button>
          <button disabled={!!running} onClick={() => run('export', { episodeId, format: 'all' })}>Export All</button>
          <button disabled={!!running} onClick={runAll}>Run All</button>
          <button disabled={!!running} onClick={() => downloadBundle(episodeId)}>Download Episode Bundle</button>
        </div>

        <div style={{ marginTop: 8, fontSize: 13, color: '#555' }}>
          Durations: init {durations.init ?? '-'}ms | plot {durations.plot ?? '-'}ms | storyboard {durations.storyboard ?? '-'}ms | promptpack {durations.promptpack ?? '-'}ms | export {durations.export ?? '-'}ms
        </div>
      </section>

      <section style={{ marginBottom: 16, padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
        <h2>Episode Board</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th align="left">Episode</th>
              <th>Plot</th>
              <th>SB</th>
              <th>PP</th>
              <th>J</th>
              <th>M</th>
              <th>C</th>
              <th>Z</th>
              <th>Release</th>
              <th>Bundle</th>
            </tr>
          </thead>
          <tbody>
            {(status?.episodeStatus ?? []).map(row => (
              <tr key={row.episodeId}>
                <td>{row.episodeId}</td>
                <td align="center"><StepDot ok={row.plot} /></td>
                <td align="center"><StepDot ok={row.storyboard} /></td>
                <td align="center"><StepDot ok={row.promptpack} /></td>
                <td align="center"><StepDot ok={row.exportJson} /></td>
                <td align="center"><StepDot ok={row.exportMd} /></td>
                <td align="center"><StepDot ok={row.exportCsv} /></td>
                <td align="center"><StepDot ok={row.exportZip} /></td>
                <td align="center" style={{ color: row.releaseReady ? '#166534' : '#991b1b', fontWeight: 700 }}>
                  {row.releaseReady ? 'READY' : 'NOT READY'}
                </td>
                <td align="center"><button onClick={() => downloadBundle(row.episodeId)}>ZIP</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '340px 1fr 1fr', gap: 16 }}>
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
          <h3>Artifacts</h3>
          <div style={{ maxHeight: 360, overflow: 'auto', display: 'grid', gap: 6 }}>
            {(status?.storyFiles ?? []).map(path => (
              <div key={path} style={{ display: 'flex', gap: 4 }}>
                <button style={{ flex: 1, textAlign: 'left' }} onClick={() => openFile(path)}>
                  {path.replace((status?.storyRoot ?? '') + '\\', '')}
                </button>
                <button onClick={() => downloadFile(path)}>⬇</button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
          <h3>Preview</h3>
          <div style={{ fontSize: 12, color: '#666' }}>{selectedFile || '(none)'}</div>
          <pre style={{ maxHeight: 360, overflow: 'auto', background: '#111', color: '#0f0', padding: 8 }}>{fileContent}</pre>
        </div>

        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
          <h3>Run Timeline</h3>
          <div style={{ maxHeight: 360, overflow: 'auto', display: 'grid', gap: 6 }}>
            {(status?.runHistory ?? []).map(item => (
              <div key={item.id} style={{ border: '1px solid #eee', borderRadius: 6, padding: 8 }}>
                <div><strong>{item.endpoint}</strong> | {item.episodeId} | {item.success ? 'OK' : 'FAIL'}</div>
                <div style={{ fontSize: 12, color: '#666' }}>{item.timestamp} | {item.durationMs}ms</div>
                {item.error && <div style={{ color: '#991b1b', fontSize: 12 }}>{item.error}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ marginTop: 16, border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
        <h3>Logs</h3>
        <pre style={{ maxHeight: 220, overflow: 'auto', background: '#222', color: '#eee', padding: 8 }}>{logs.join('\n\n')}</pre>
      </section>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
