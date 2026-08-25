import { describe, expect, test } from 'bun:test'
import { parseAdaptPackParams } from './adapt-pack-params'

describe('parseAdaptPackParams', () => {
  test('rejects missing skill_id, mismatch with subject_key, and illegal ids', () => {
    expect(parseAdaptPackParams({}, 'my-style')).toMatchObject({
      ok: false,
      code: 'VERB_PARAMS_INVALID',
    })
    expect(parseAdaptPackParams({ skill_id: 'my-style' }, 'other-style')).toMatchObject({
      ok: false,
      code: 'VERB_PARAMS_INVALID',
    })
    expect(parseAdaptPackParams({ skill_id: 'BAD ID' }, 'BAD ID')).toMatchObject({
      ok: false,
      code: 'VERB_PARAMS_INVALID',
    })
  })

  test('accepts skill_id that matches subject_key', () => {
    expect(parseAdaptPackParams({ skill_id: 'my-style' }, 'my-style')).toEqual({
      ok: true,
      value: { skill_id: 'my-style' },
    })
  })
})
