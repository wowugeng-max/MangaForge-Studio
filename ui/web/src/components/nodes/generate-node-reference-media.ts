export type MaterializableReferenceBinding = {
  type: string
  url?: string
  reference_index?: number
}

export class GenerateNodeReferenceMediaError extends Error {
  readonly code = 'REFERENCE_MEDIA_MATERIALIZATION_FAILED' as const
  readonly referenceIndex?: number

  constructor(message: string, referenceIndex?: number, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'GenerateNodeReferenceMediaError'
    this.referenceIndex = referenceIndex
  }
}

export function isGenerateNodeMaterializableImageUrl(value: unknown): boolean {
  return typeof value === 'string' && (/^data:image\//i.test(value) || /^blob:/i.test(value))
}

const WORKSPACE_MEDIA_PREFIX = '/api/assets/media/'

function isWorkspaceMediaUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim() !== value || !value.startsWith(WORKSPACE_MEDIA_PREFIX)) {
    return false
  }

  try {
    const base = new URL('https://workspace.invalid')
    const parsed = new URL(value, base)
    return parsed.origin === base.origin
      && parsed.pathname.startsWith(WORKSPACE_MEDIA_PREFIX)
      && parsed.pathname.length > WORKSPACE_MEDIA_PREFIX.length
  } catch {
    return false
  }
}

function imageExtension(blob: Blob): string | undefined {
  const mediaType = blob.type.split(';', 1)[0].trim().toLowerCase()
  if (!/^image\/[^/\s]+$/.test(mediaType)) return undefined
  if (mediaType === 'image/jpeg') return 'jpg'
  if (mediaType === 'image/webp') return 'webp'
  if (mediaType === 'image/gif') return 'gif'
  return 'png'
}

export function createGenerateNodeReferenceMediaMaterializer(deps: {
  fetchBlob: (url: string) => Promise<Blob>
  uploadImage: (blob: Blob, filename: string) => Promise<string>
}): {
  materializeUrl(url: string, referenceIndex?: number): Promise<string>
  materializeBindings<T extends MaterializableReferenceBinding>(bindings: readonly T[]): Promise<T[]>
} {
  const settled = new Map<string, string>()
  const pending = new Map<string, Promise<string>>()

  async function materializeUrl(url: string, referenceIndex?: number): Promise<string> {
    if (!isGenerateNodeMaterializableImageUrl(url)) return url

    const cached = settled.get(url)
    if (cached !== undefined) return cached

    const inFlight = pending.get(url)
    if (inFlight !== undefined) return inFlight

    const operation = (async () => {
      try {
        const blob = await deps.fetchBlob(url)
        const extension = imageExtension(blob)
        if (extension === undefined) {
          throw new GenerateNodeReferenceMediaError(
            `Reference media must be an image, received ${blob.type || 'an unknown MIME type'}`,
            referenceIndex,
          )
        }

        const filename = `reference-${referenceIndex || 1}.${extension}`
        const uploadedUrl = await deps.uploadImage(blob, filename)
        if (!isWorkspaceMediaUrl(uploadedUrl)) {
          throw new GenerateNodeReferenceMediaError(
            'Reference media upload did not return a workspace media URL',
            referenceIndex,
          )
        }

        settled.set(url, uploadedUrl)
        return uploadedUrl
      } catch (error) {
        if (error instanceof GenerateNodeReferenceMediaError) throw error
        throw new GenerateNodeReferenceMediaError(
          'Failed to materialize GenerateNode reference media',
          referenceIndex,
          { cause: error },
        )
      }
    })()

    pending.set(url, operation)
    const clearPending = () => {
      if (pending.get(url) === operation) pending.delete(url)
    }
    void operation.then(clearPending, clearPending)

    return operation
  }

  async function materializeBindings<T extends MaterializableReferenceBinding>(bindings: readonly T[]): Promise<T[]> {
    return Promise.all(bindings.map(async binding => {
      if (binding.type !== 'image' || !binding.url) return { ...binding }
      const url = await materializeUrl(binding.url, binding.reference_index)
      return { ...binding, url }
    }))
  }

  return { materializeUrl, materializeBindings }
}
