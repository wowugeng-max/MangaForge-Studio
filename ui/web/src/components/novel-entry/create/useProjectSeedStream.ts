import { useCallback, useRef, useState } from 'react'
import {
  PROJECT_SEED_UI_STEPS,
  type ProjectSeedStreamState,
  type ProjectSeedStreamStep,
} from './projectSeedStreamTypes'

const apiBase = () =>
  String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787/api').replace(/\/$/, '')

export function createInitialProjectSeedStreamState(): ProjectSeedStreamState {
  return {
    progress: 0,
    currentLabel: PROJECT_SEED_UI_STEPS[0],
    done: false,
    steps: PROJECT_SEED_UI_STEPS.map((label, index) => ({
      key: `step-${index}`,
      label,
      status: 'pending' as const,
    })),
  }
}

export function parseProjectSeedSseChunk(chunk: string) {
  const events: any[] = []
  const parts = String(chunk || '').split('\n\n')
  for (const part of parts) {
    const line = part
      .split('\n')
      .map(item => item.trim())
      .find(item => item.startsWith('data:'))
    if (!line) continue
    const raw = line.slice(5).trim()
    if (!raw || raw === '[DONE]') continue
    try {
      events.push(JSON.parse(raw))
    } catch {
      // ignore malformed
    }
  }
  return events
}

export function reduceProjectSeedStreamState(
  prev: ProjectSeedStreamState | undefined,
  event: any,
): ProjectSeedStreamState {
  const base = prev || createInitialProjectSeedStreamState()
  if (event?.type === 'stage') {
    const uiStep = Number(event.ui_step || 0)
    const steps: ProjectSeedStreamStep[] = base.steps.map((step, index) => {
      if (index < uiStep) return { ...step, status: 'completed' }
      if (index === uiStep) {
        return {
          ...step,
          status:
            event.status === 'error'
              ? 'error'
              : event.status === 'completed'
                ? 'completed'
                : 'running',
          detail: event.detail || step.detail,
          label: event.label || step.label,
        }
      }
      return step
    })
    return {
      ...base,
      progress: Number(event.progress || base.progress || 0),
      currentLabel: event.label || base.currentLabel,
      steps,
      done: false,
      error: event.status === 'error' ? String(event.detail || event.message || '生成失败') : undefined,
    }
  }
  if (event?.type === 'result') {
    return {
      ...base,
      progress: 1,
      done: true,
      seed: event.seed,
      seed_diagnostics: event.seed_diagnostics,
      steps: base.steps.map(step => ({ ...step, status: 'completed' })),
      currentLabel: '完成',
    }
  }
  if (event?.type === 'error') {
    return {
      ...base,
      done: true,
      error: String(event.message || event.error || '生成失败'),
      seed: event.seed,
      seed_diagnostics: event.seed_diagnostics,
    }
  }
  return base
}

export function useProjectSeedStream() {
  const [state, setState] = useState<ProjectSeedStreamState>(() => createInitialProjectSeedStreamState())
  const abortRef = useRef<AbortController | null>(null)

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const start = useCallback(
    async (body: Record<string, any>) => {
      cancel()
      const controller = new AbortController()
      abortRef.current = controller
      setState(createInitialProjectSeedStreamState())
      const response = await fetch(`${apiBase()}/novel/project-seed/derive-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      if (!response.ok || !response.body) {
        const text = await response.text().catch(() => '')
        const next = reduceProjectSeedStreamState(undefined, {
          type: 'error',
          message: text || `HTTP ${response.status}`,
        })
        setState(next)
        return next
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      let latest = createInitialProjectSeedStreamState()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const pieces = buffer.split('\n\n')
        buffer = pieces.pop() || ''
        for (const piece of pieces) {
          for (const event of parseProjectSeedSseChunk(`${piece}\n\n`)) {
            latest = reduceProjectSeedStreamState(latest, event)
            setState(latest)
          }
        }
      }
      if (buffer.trim()) {
        for (const event of parseProjectSeedSseChunk(`${buffer}\n\n`)) {
          latest = reduceProjectSeedStreamState(latest, event)
          setState(latest)
        }
      }
      if (!latest.done && !latest.error) {
        latest = { ...latest, done: true }
        setState(latest)
      }
      return latest
    },
    [cancel],
  )

  return { state, start, cancel, setState }
}
