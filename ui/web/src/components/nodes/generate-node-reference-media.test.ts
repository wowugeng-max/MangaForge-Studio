import { describe, expect, test } from 'bun:test'
import {
  createGenerateNodeReferenceMediaMaterializer,
  GenerateNodeReferenceMediaError,
} from './generate-node-reference-media'

const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='

describe('GenerateNode reference media materializer', () => {
  test('materializes nine ordered image references without changing identity, roles, or lineage', async () => {
    const uploads: string[] = []
    const materializer = createGenerateNodeReferenceMediaMaterializer({
      fetchBlob: async url => new Blob([url], { type: 'image/png' }),
      uploadImage: async (_blob, filename) => {
        uploads.push(filename)
        return `/api/assets/media/${filename}`
      },
    })
    const references = Array.from({ length: 9 }, (_, index) => ({
      type: 'image' as const,
      url: `${PIXEL}#${index + 1}`,
      reference_index: index + 1,
      reference_id: `ref-${index + 1}`,
      reference_role: index === 0
        ? 'first_frame' as const
        : index === 8
          ? 'last_frame' as const
          : 'character' as const,
      source_asset_ids: [index + 1, index + 101],
    }))
    const originalReferences = structuredClone(references)

    const result = await materializer.materializeBindings(references)

    expect(result).toHaveLength(9)
    expect(uploads).toHaveLength(9)
    expect(result).toEqual(originalReferences.map((reference, index) => ({
      ...reference,
      url: `/api/assets/media/reference-${index + 1}.png`,
    })))
    expect(references).toEqual(originalReferences)
  })

  test('passes through HTTPS and local media URLs without fetching or uploading', async () => {
    let calls = 0
    const materializer = createGenerateNodeReferenceMediaMaterializer({
      fetchBlob: async () => {
        calls += 1
        return new Blob()
      },
      uploadImage: async () => {
        calls += 1
        return '/unexpected'
      },
    })
    const references = [
      { type: 'image' as const, url: 'https://cdn.example/a.png', reference_index: 1, reference_id: 'a', reference_role: 'general' as const },
      { type: 'image' as const, url: '/api/assets/media/a.png', reference_index: 2, reference_id: 'b', reference_role: 'general' as const },
      { type: 'image' as const, url: '/api/files/legacy.png', reference_index: 3, reference_id: 'c', reference_role: 'general' as const },
    ]

    expect(await materializer.materializeBindings(references)).toEqual(references)
    expect(calls).toBe(0)
  })

  test('coalesces concurrent duplicate materializations and reuses the settled cache', async () => {
    let fetches = 0
    let uploads = 0
    const materializer = createGenerateNodeReferenceMediaMaterializer({
      fetchBlob: async () => {
        fetches += 1
        return new Blob(['pixel'], { type: 'image/png' })
      },
      uploadImage: async () => {
        uploads += 1
        return '/api/assets/media/shared.png'
      },
    })
    const binding = {
      type: 'image' as const,
      url: PIXEL,
      reference_index: 1,
      reference_id: 'same',
      reference_role: 'general' as const,
    }

    const [first, second] = await Promise.all([
      materializer.materializeBindings([binding]),
      materializer.materializeBindings([binding]),
    ])
    const third = await materializer.materializeBindings([binding])

    expect(fetches).toBe(1)
    expect(uploads).toBe(1)
    expect(first[0].url).toBe('/api/assets/media/shared.png')
    expect(second).toEqual(first)
    expect(third).toEqual(first)
  })

  test('materializes a Blob URL through the same image upload path', async () => {
    const fetchedBlob = new Blob(['pixel'], { type: 'image/webp' })
    let uploadedBlob: Blob | undefined
    const materializer = createGenerateNodeReferenceMediaMaterializer({
      fetchBlob: async url => {
        expect(url).toBe('blob:https://mangaforge.local/reference')
        return fetchedBlob
      },
      uploadImage: async (blob, filename) => {
        uploadedBlob = blob
        return `/api/assets/media/${filename}`
      },
    })

    expect(await materializer.materializeUrl('blob:https://mangaforge.local/reference', 4))
      .toBe('/api/assets/media/reference-4.webp')
    expect(uploadedBlob).toBe(fetchedBlob)
    expect(uploadedBlob?.type).toBe('image/webp')
  })

  test('fails closed with a typed error for a non-image fetched Blob', async () => {
    let uploads = 0
    const materializer = createGenerateNodeReferenceMediaMaterializer({
      fetchBlob: async () => new Blob(['bad'], { type: 'text/plain' }),
      uploadImage: async () => {
        uploads += 1
        return '/unexpected'
      },
    })

    const operation = materializer.materializeUrl(PIXEL, 1)
    await expect(operation).rejects.toBeInstanceOf(GenerateNodeReferenceMediaError)
    await expect(operation).rejects.toMatchObject({
      code: 'REFERENCE_MEDIA_MATERIALIZATION_FAILED',
    })
    expect(uploads).toBe(0)
  })

  test('propagates upload failure as a typed failure and never returns the original Data URL', async () => {
    let uploads = 0
    const materializer = createGenerateNodeReferenceMediaMaterializer({
      fetchBlob: async () => new Blob(['pixel'], { type: 'image/png' }),
      uploadImage: async () => {
        uploads += 1
        throw new Error('upload unavailable')
      },
    })
    const binding = { type: 'image' as const, url: PIXEL, reference_index: 1 }

    const operation = materializer.materializeBindings([binding])
    await expect(operation).rejects.toBeInstanceOf(GenerateNodeReferenceMediaError)
    await expect(operation).rejects.toMatchObject({
      code: 'REFERENCE_MEDIA_MATERIALIZATION_FAILED',
      referenceIndex: 1,
    })
    expect(uploads).toBe(1)
    expect(binding.url).toBe(PIXEL)
  })

  test('clears a failed pending operation so a later retry can upload', async () => {
    let attempts = 0
    const materializer = createGenerateNodeReferenceMediaMaterializer({
      fetchBlob: async () => new Blob(['pixel'], { type: 'image/png' }),
      uploadImage: async () => {
        attempts += 1
        if (attempts === 1) throw new Error('temporary upload failure')
        return '/api/assets/media/retried.png'
      },
    })

    await expect(materializer.materializeUrl(PIXEL, 1)).rejects.toMatchObject({
      code: 'REFERENCE_MEDIA_MATERIALIZATION_FAILED',
    })
    expect(await materializer.materializeUrl(PIXEL, 1)).toBe('/api/assets/media/retried.png')
    expect(attempts).toBe(2)
  })
})
