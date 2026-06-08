import { describe, expect, test } from 'bun:test'
import { buildAssetMediaUrl } from './assetMedia'

describe('asset media URL builder', () => {
  test('uses the configured API base URL and encodes workspace media paths', () => {
    expect(buildAssetMediaUrl('uploads/a b.png', 'http://127.0.0.1:18787/api')).toBe('http://127.0.0.1:18787/api/assets/media/uploads%2Fa%20b.png')
    expect(buildAssetMediaUrl('assets/comfy-output/frame.png', 'http://127.0.0.1:18787/api/')).toBe('http://127.0.0.1:18787/api/assets/media/assets%2Fcomfy-output%2Fframe.png')
    expect(buildAssetMediaUrl('/api/assets/media/uploads%2Fa.png', 'http://127.0.0.1:18787/api')).toBe('http://127.0.0.1:18787/api/assets/media/uploads%2Fa.png')
  })

  test('rebases persisted absolute TS media URLs onto the configured API base URL', () => {
    expect(buildAssetMediaUrl('http://localhost:8787/api/assets/media/uploads%2Fa.png', 'http://127.0.0.1:18787/api')).toBe('http://127.0.0.1:18787/api/assets/media/uploads%2Fa.png')
    expect(buildAssetMediaUrl('https://old-host.example/api/assets/media/data%2Fassets%2Fimages%2Fold.png', 'https://studio.example/proxy/api')).toBe('https://studio.example/proxy/api/assets/media/data%2Fassets%2Fimages%2Fold.png')
  })

  test('rebases upstream temporary file URLs onto the configured API base URL', () => {
    expect(buildAssetMediaUrl('/api/files/clip.mp4', 'http://127.0.0.1:18787/api')).toBe('http://127.0.0.1:18787/api/files/clip.mp4')
    expect(buildAssetMediaUrl('http://localhost:8000/api/files/nested%2Fclip.mp4', 'https://studio.example/proxy/api')).toBe('https://studio.example/proxy/api/files/nested%2Fclip.mp4')
  })

  test('keeps external and inline media URLs unchanged', () => {
    expect(buildAssetMediaUrl('https://cdn.example/a.png')).toBe('https://cdn.example/a.png')
    expect(buildAssetMediaUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc')
    expect(buildAssetMediaUrl('blob:http://localhost/1')).toBe('blob:http://localhost/1')
  })
})
