import {
  buildHumanFingerprintContract,
  createFingerprintSample,
  normalizeFingerprintGenreSlug,
  type FingerprintContract,
} from './prose-fingerprint-lib'

export type RefitSampleInput = { id: string; genre: string; text: string }

const TA_DIRECTIVE_PREFIX = '他/姓名起句占比 ≤'

/**
 * Contracts carry historical prose fields (24 directives / 17 avoid / 12 prefer /
 * narrative_hard) that buildHumanFingerprintContract cannot regenerate — it only
 * emits 7/7/5. Refitting therefore inherits prose verbatim and only rewrites the
 * one directive line that embeds a refitted number.
 */
export function inheritContractProse(fitted: FingerprintContract, builtin: FingerprintContract): FingerprintContract {
  const taMax = fitted.target.subject_ta_opener_ratio_max
  const directives = (builtin.prompt_directives || []).map((line) =>
    line.startsWith(TA_DIRECTIVE_PREFIX) ? line.replace(/≤[0-9.]+/, `≤${taMax}`) : line,
  )
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
