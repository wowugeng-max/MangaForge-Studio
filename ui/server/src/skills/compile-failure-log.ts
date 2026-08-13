import { appendLog } from '../status'

type SkillCompileFailureContext = {
  skill_name?: unknown
  pack_id?: unknown
  mode?: unknown
}

// Compile failures previously surfaced only in the HTTP response of the node
// that triggered them; once the toast is dismissed there is no trace to debug
// intermittent provider issues from. Persist them to the workspace log.
// Logging must never mask the original compile failure, so every step —
// including the workspace lookup — stays inside the try.
export async function logSkillCompileFailure(
  getWorkspace: () => string,
  message: string,
  code: string,
  detail: string,
  context: SkillCompileFailureContext,
) {
  try {
    const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value : undefined)
    await appendLog(getWorkspace(), {
      id: Date.now(),
      level: 'error',
      message,
      createdAt: new Date().toISOString(),
      meta: {
        error_code: code,
        detail,
        skill_name: text(context.skill_name),
        pack_id: text(context.pack_id),
        mode: text(context.mode),
      },
    })
  } catch {}
}
