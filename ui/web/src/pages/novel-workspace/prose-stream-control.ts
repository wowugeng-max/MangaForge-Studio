/** Shared controller for in-flight single-chapter prose generation so the writing UI can cancel without deep prop drilling. */
export const proseStreamControl = {
  controller: null as AbortController | null,
  onCancel: null as null | (() => void),
  begin() {
    this.controller?.abort()
    this.controller = new AbortController()
    return this.controller
  },
  cancel() {
    const had = Boolean(this.controller)
    this.controller?.abort()
    this.controller = null
    this.onCancel?.()
    return had
  },
  end(controller?: AbortController | null) {
    if (!controller || this.controller === controller) {
      this.controller = null
    }
  },
  get signal() {
    return this.controller?.signal
  },
}

export function isAbortError(error: any) {
  return (
    error?.name === 'AbortError'
    || error?.code === 20
    || /aborted|AbortError|The user aborted a request/i.test(String(error?.message || error || ''))
  )
}
