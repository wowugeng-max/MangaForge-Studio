import { describe, expect, test } from 'bun:test'

import {
  deriveH3ReferenceModeHint,
  normalizeCanvasReferenceAssets,
  validateCanvasReferenceAssets,
} from './reference-bindings'
import {
  canonicalCompileInput,
  computeCompileInputHash,
  type CompileCacheInput,
} from './compile-cache'
import type { CanvasReferenceAsset } from './types'

describe('canvas reference bindings', () => {
  test('normalizes ordered image references with stable ids, roles, and lineage', () => {
    const bindings = normalizeCanvasReferenceAssets([
      { type: 'image', url: '/a.png', source_asset_ids: [11], reference_role: 'first_frame' },
      { type: 'image', url: '/b.png', source_asset_ids: [12], reference_role: 'last_frame' },
    ])

    expect(bindings).toMatchObject([
      {
        reference_index: 1,
        reference_id: 'reference-1',
        reference_role: 'first_frame',
        type: 'image',
        source_asset_ids: [11],
      },
      {
        reference_index: 2,
        reference_id: 'reference-2',
        reference_role: 'last_frame',
        type: 'image',
        source_asset_ids: [12],
      },
    ])
  })

  test('derives the H3 reference mode hint from executable image roles', () => {
    expect(deriveH3ReferenceModeHint([])).toBe('T2VA')
    expect(deriveH3ReferenceModeHint([{ type: 'image', reference_role: 'first_frame' }])).toBe('I2VA')
    expect(deriveH3ReferenceModeHint([
      { type: 'image', reference_role: 'first_frame' },
      { type: 'image', reference_role: 'last_frame' },
    ])).toBe('FL2VA')
    expect(deriveH3ReferenceModeHint([{ type: 'image', reference_role: 'last_frame' }])).toBe('L2VA')
    expect(deriveH3ReferenceModeHint([{ type: 'image', reference_role: 'character' }, { type: 'image', reference_role: 'style' }])).toBe('Ref2VA')
  })

  test('enforces the nine-image limit with a typed error', () => {
    expect(() => validateCanvasReferenceAssets(
      Array.from({ length: 10 }, () => ({ type: 'image' as const, url: '/x.png' })),
    )).toThrow(expect.objectContaining({ code: 'REFERENCE_LIMIT_EXCEEDED' }))
  })

  test('allows only one first-frame and one last-frame role', () => {
    expect(() => validateCanvasReferenceAssets([
      { type: 'image', reference_role: 'first_frame' },
      { type: 'image', reference_role: 'first_frame' },
    ])).toThrow(expect.objectContaining({ code: 'REFERENCE_ROLE_INVALID' }))
  })

  test('normalizes reserved video and audio types but rejects them for image execution', () => {
    const normalized = normalizeCanvasReferenceAssets([
      { type: 'video', url: '/reference.mp4', reference_role: 'general' },
      { type: 'audio', url: '/reference.wav', reference_role: 'general' },
    ])
    expect(normalized).toMatchObject([
      { type: 'video', reference_index: 1, reference_id: 'reference-1' },
      { type: 'audio', reference_index: 2, reference_id: 'reference-2' },
    ])
    expect(() => validateCanvasReferenceAssets(normalized)).toThrow(expect.objectContaining({ code: 'REFERENCE_MEDIA_UNSUPPORTED' }))
  })

  test('keeps positive lineage ids unique while preserving their order', () => {
    const normalized = normalizeCanvasReferenceAssets([
      { type: 'image', url: '/a.png', source_asset_ids: [11, 11, 0, -2, 12, 11] },
    ])
    expect(normalized[0]?.source_asset_ids).toEqual([11, 12])
  })

  test('changes the canonical compile hash when reference order, index, id, role, or lineage changes', () => {
    const firstReference: CanvasReferenceAsset = {
      type: 'image',
      url: '/a.png',
      reference_index: 1,
      reference_id: 'reference-1',
      reference_role: 'general',
      source_asset_ids: [11],
    }
    const secondReference: CanvasReferenceAsset = {
      type: 'image',
      url: '/b.png',
      reference_index: 2,
      reference_id: 'reference-2',
      reference_role: 'character',
      source_asset_ids: [12],
    }
    const base: CompileCacheInput = {
      packId: 'pack',
      revision: 'rev',
      skillName: 'skill',
      rawPrompt: 'prompt',
      mode: 'image_to_video',
      incomingAssets: [firstReference, secondReference],
      nodeParams: {},
    }
    const reordered: CompileCacheInput = { ...base, incomingAssets: [secondReference, firstReference] }
    const indexChanged: CompileCacheInput = { ...base, incomingAssets: [{ ...firstReference, reference_index: 9 }, secondReference] }
    const idChanged: CompileCacheInput = { ...base, incomingAssets: [{ ...firstReference, reference_id: 'different-id' }, secondReference] }
    const roleChanged: CompileCacheInput = { ...base, incomingAssets: [{ ...firstReference, reference_role: 'style' }, secondReference] }
    const lineageChanged: CompileCacheInput = { ...base, incomingAssets: [{ ...firstReference, source_asset_ids: [99] }, secondReference] }
    expect(computeCompileInputHash(base)).not.toBe(computeCompileInputHash(reordered))
    expect(computeCompileInputHash(base)).not.toBe(computeCompileInputHash(indexChanged))
    expect(computeCompileInputHash(base)).not.toBe(computeCompileInputHash(idChanged))
    expect(computeCompileInputHash(base)).not.toBe(computeCompileInputHash(roleChanged))
    expect(computeCompileInputHash(base)).not.toBe(computeCompileInputHash(lineageChanged))
  })

  test('changes the canonical compile hash when the effective compiler model changes', () => {
    const base: CompileCacheInput = {
      packId: 'pack',
      revision: 'rev',
      skillName: 'skill',
      rawPrompt: 'prompt',
      mode: 'text_to_video',
      incomingAssets: [],
      nodeParams: {},
    }

    expect(computeCompileInputHash({ ...base, compilerModelId: 1 })).toBe(computeCompileInputHash({ ...base, compilerModelId: 1 }))
    expect(computeCompileInputHash({ ...base, compilerModelId: 1 })).not.toBe(computeCompileInputHash({ ...base, compilerModelId: 2 }))
  })

  test('keeps legacy inputs without reference metadata byte-compatible with the parent contract', () => {
    const legacyImageInput: CompileCacheInput = {
      packId: 'p',
      revision: 'r',
      skillName: 's',
      rawPrompt: 'x',
      mode: 'text_to_video',
      incomingAssets: [{ type: 'image', url: '/a.png' }],
      nodeParams: {},
    }
    const legacyEmptyInput: CompileCacheInput = { ...legacyImageInput, incomingAssets: [] }

    expect(canonicalCompileInput(legacyImageInput)).toBe('{"arguments":{},"incomingAssets":[{"content":undefined,"source_asset_ids":undefined,"type":"image","url":"/a.png"}],"mode":"text_to_video","nodeParams":{},"packId":"p","rawPrompt":"x","revision":"r","skillName":"s"}')
    expect(computeCompileInputHash(legacyImageInput)).toBe('6a41c8c3eb7df702c101c048605f8d291af001e73677936b7a5d80cadc931c4e')
    expect(canonicalCompileInput(legacyEmptyInput)).toBe('{"arguments":{},"incomingAssets":[],"mode":"text_to_video","nodeParams":{},"packId":"p","rawPrompt":"x","revision":"r","skillName":"s"}')
    expect(computeCompileInputHash(legacyEmptyInput)).toBe('b80237cc7a6de7991edd5bb0f6816f45f1d8255d538379a5ab9aaf14e14d0aa4')
  })
})
