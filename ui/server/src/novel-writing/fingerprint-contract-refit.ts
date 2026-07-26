import {
  buildHumanFingerprintContract,
  createFingerprintSample,
  normalizeFingerprintGenreSlug,
  type FingerprintContract,
} from './prose-fingerprint-lib'

export type RefitSampleInput = { id: string; genre: string; text: string }

/**
 * buildHumanFingerprintContract's own directive[0] (name header) never embeds a
 * digit, so its "prefix up to the first digit" is the whole line — it can only
 * ever match a builtin line if that line is byte-identical, which it isn't
 * (different name), so the header always stays out of the override map below.
 */
function numericDirectivePrefix(line: string): string {
  const idx = line.search(/[0-9]/)
  return idx === -1 ? line : line.slice(0, idx)
}

/**
 * Contracts carry historical prose fields (24 directives / 17 avoid / 12 prefer /
 * narrative_hard) that buildHumanFingerprintContract cannot regenerate — it only
 * emits 7 directives, one of them a header. The other 6 embed refitted target
 * numbers (cv/single-two-sentence/dialogue/clinical-template-adverb/ta-opener/
 * sample-count) and reappear verbatim inside builtin's 24, so refitting maps
 * each fitted directive's stable non-numeric prefix to its new text and swaps
 * in any builtin line that starts with that prefix — every other line (name
 * header included) is copied from builtin byte-for-byte.
 */
export function inheritContractProse(fitted: FingerprintContract, builtin: FingerprintContract): FingerprintContract {
  const overrides = new Map<string, string>()
  for (const line of fitted.prompt_directives || []) {
    const prefix = numericDirectivePrefix(line)
    if (prefix) overrides.set(prefix, line)
  }
  const directives = (builtin.prompt_directives || []).map((line) => {
    for (const [prefix, replacement] of overrides) {
      if (line.startsWith(prefix)) return replacement
    }
    return line
  })
  return {
    ...fitted,
    avoid: [...(builtin.avoid || [])],
    prefer: [...(builtin.prefer || [])],
    prompt_directives: directives,
    narrative_hard: builtin.narrative_hard,
  }
}

function toFingerprintSamples(samples: RefitSampleInput[]) {
  return samples.map((sample) =>
    createFingerprintSample({
      id: sample.id,
      label: 'human_webnovel',
      source: 'qidian_free_chapter',
      title: sample.id,
      genre: sample.genre,
      text: sample.text,
      text_path: '',
      notes: 're-measured by refit',
    }),
  )
}

export function refitContractFromSamples(input: {
  samples: RefitSampleInput[]
  builtin: FingerprintContract
  name?: string
}): FingerprintContract {
  if (!input.samples.length) throw new Error('refit needs at least one sample: no samples provided')
  const fitted = buildHumanFingerprintContract(
    toFingerprintSamples(input.samples),
    input.name || input.builtin.name || 'qidian_free_rank_human',
  )
  return inheritContractProse(fitted, input.builtin)
}

export function refitGenreContracts(input: {
  samples: RefitSampleInput[]
  builtin: FingerprintContract
  genreBuiltins: Record<string, FingerprintContract>
}): Record<string, FingerprintContract> {
  const byGenre = new Map<string, RefitSampleInput[]>()
  for (const sample of input.samples) {
    const slug = normalizeFingerprintGenreSlug(sample.genre)
    if (!slug) continue
    if (!byGenre.has(slug)) byGenre.set(slug, [])
    byGenre.get(slug)!.push(sample)
  }
  const out: Record<string, FingerprintContract> = {}
  for (const [slug, rows] of byGenre) {
    if (rows.length < 3) continue
    const builtinForGenre = input.genreBuiltins[slug] || input.builtin
    out[slug] = refitContractFromSamples({
      samples: rows,
      builtin: builtinForGenre,
      name: builtinForGenre.name,
    })
  }
  return out
}
