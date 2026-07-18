import { ensureWorkspaceStructure } from '../../workspace'
import {
  appendNovelRun,
  createNovelChapter,
  createNovelCharacter,
  createNovelOutline,
  createNovelProject,
  createNovelProjectSeedDraft,
  createNovelSettingEntity,
  createNovelWorldbuilding,
  deleteNovelChapter,
  deleteNovelOutline,
  deleteNovelProject,
  deleteNovelProjectSeedDraft,
  getNovelChapter,
  getNovelProject,
  listChapterVersions,
  listNovelCharacters,
  listNovelChapters,
  listNovelWorkspaceChapters,
  listNovelOutlines,
  listNovelProjects,
  listNovelProjectSeedDrafts,
  listNovelWorldbuilding,
  rollbackChapterVersion,
  syncNovelChapterPlanByNumber,
  updateNovelCharacter,
  updateNovelChapter,
  updateNovelOutline,
  updateNovelProject,
  updateNovelWorldbuilding,
} from '../../novel'
import { executeNovelAgent, previewNovelKnowledgeInjection } from '../../llm'
import { extractLLMText, parseJsonLikePayload, safeJsonStringify } from '../novel-route-utils'
import { purgeMemoryPalaceProject } from '../../memory-service'
import { buildOhStoryGenreCatalogContract, formatOhStoryGenreCatalogPrompt, listOhStoryGenreCatalogGuides, matchOhStoryGenreCatalogGuide } from '../novel-genre-catalog'
import { buildOhStoryGenreCoreMechanicsContract, formatOhStoryGenreCoreMechanicsPrompt } from '../novel-genre-core-mechanics'
import { buildOhStoryPlotSpecialTopicsContract, formatOhStoryPlotSpecialTopicsPrompt } from '../novel-plot-special-topics'
import { buildOhStoryCharacterDesignContract, formatOhStoryCharacterDesignPrompt } from '../novel-character-design-contract'
import { buildOhStoryStoryPowerContract, formatOhStoryStoryPowerPrompt } from '../novel-story-power-contract'
import { buildOhStoryMainlineDefinitionContract, formatOhStoryMainlineDefinitionPrompt } from '../novel-mainline-definition-contract'
import { buildOhStoryLongformStructureContract, formatOhStoryLongformStructurePrompt } from '../novel-longform-structure-contract'
import { buildOhStoryDirectorForProjectSeed } from '../novel-oh-story-director'
import { normalizeSettingAgentPayload } from '../novel-setting-routes'
import { safeReportProjectSeedProgress, resolvePassA3VolumeStageStatus, sseData, type ProjectSeedProgressReporter } from '../novel-project-seed-progress'
import {
  buildProjectSeedFillGapsPrompt,
  extractFillGapsPatch,
  listProjectSeedGapTargets,
  mergeSeedPreferRicher,
} from '../novel-project-seed-fill-gaps'
import {
  annotateOutlineScaffoldDiagnostics,
  asSeedArray,
  attachProjectSeedDirector,
  buildProjectSeedDiagnostics,
  chapterTitleLooksStructural,
  cleanSeedCharacterName,
  compactSeedText,
  describeLengthTarget,
  ensureProjectSeedModelOutlines,
  extractProjectSeedFactsFromText,
  fallbackChapterDisplayTitle,
  firstSeedText,
  hasUsableProjectSeed,
  inferSeedCharacterName,
  inferSeedGenre,
  mergeGeneratedFields,
  mergeProjectSeedInput,
  mergeRecoveredSeedPreferModelOutlines,
  normalizeLengthTarget,
  normalizeProjectSeedPayload,
  parseNestedSeed,
  projectSeedNeedsOutlineExpansion,
  projectSeedOutlinesLookLikeLocalScaffold,
  repairProjectSeedGaps,
  resultContentPreview,
  resultContentText,
  seedFieldMissing,
  stripLocalScaffoldOutlines,
  uniqueSeedTexts,
} from './builders'

import {
  annotateOutlineScaffoldDiagnostics,
  asSeedArray,
  attachProjectSeedDirector,
  buildProjectSeedDiagnostics,
  chapterTitleLooksStructural,
  cleanSeedCharacterName,
  compactSeedText,
  describeLengthTarget,
  ensureProjectSeedModelOutlines,
  extractProjectSeedFactsFromText,
  fallbackChapterDisplayTitle,
  firstSeedText,
  hasUsableProjectSeed,
  inferSeedCharacterName,
  inferSeedGenre,
  mergeGeneratedFields,
  mergeProjectSeedInput,
  mergeRecoveredSeedPreferModelOutlines,
  normalizeLengthTarget,
  normalizeProjectSeedPayload,
  parseNestedSeed,
  projectSeedNeedsOutlineExpansion,
  projectSeedOutlinesLookLikeLocalScaffold,
  repairProjectSeedGaps,
  resultContentPreview,
  resultContentText,
  seedFieldMissing,
  stripLocalScaffoldOutlines,
  uniqueSeedTexts,
} from './builders-seed-outline'

import {
  asSeedArray,
  attachProjectSeedDirector,
  buildProjectSeedDiagnostics,
  firstSeedText,
  parseNestedSeed,
  repairProjectSeedGaps,
  resultContentPreview,
} from './builders-seed-outline'

export async function fillProjectSeedGapsWithModel(
  activeWorkspace: string,
  seed: any,
  idea: string,
  modelId: string,
  requestedTitle = '',
  risks: string[] = [],
  gapHints: string[] = [],
) {
  const baseSeed = parseNestedSeed(seed)
  const gaps = listProjectSeedGapTargets(baseSeed, [...risks, ...gapHints])
  if (!gaps.length) {
    return {
      seed: attachProjectSeedDirector(baseSeed),
      filled: [] as string[],
      skipped: [] as string[],
      gaps,
      result: null as any,
      seed_diagnostics: {
        ...buildProjectSeedDiagnostics(baseSeed, idea, null),
        status: 'no_gaps',
        suggestion: '未检测到可补缺口，已保留当前种子。',
      },
    }
  }
  const prompt = buildProjectSeedFillGapsPrompt({
    seed: baseSeed,
    idea,
    title: requestedTitle || baseSeed.title || '',
    gaps,
    risks: [...risks, ...gapHints],
  })
  const projectStub = {
    id: 0,
    title: requestedTitle || baseSeed.title || '项目种子补缺口',
    genre: baseSeed.genre || '',
    sub_genres: baseSeed.sub_genres || [],
    synopsis: baseSeed.synopsis || idea.slice(0, 500),
    length_target: baseSeed.length_target || 'medium',
    target_audience: baseSeed.target_audience || '',
    style_tags: baseSeed.style_tags || [],
    commercial_tags: baseSeed.commercial_tags || [],
    reference_config: {},
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const result = await executeNovelAgent('outline-agent', projectStub as any, { task: prompt, authoritativeTask: true }, {
    activeWorkspace,
    modelId,
    maxTokens: 7000,
    temperature: 0.34,
    skipMemory: true,
    responseMode: 'non_stream',
  })
  // Even if model fails, continue to local deterministic fill below with empty model patch.
  const modelFailed = Boolean((result as any)?.error)
  // Robust extract: output may be string/empty object; content may hold JSON.
  const payloadCandidates = [
    (result as any)?.parsed,
    (result as any)?.output,
    (result as any)?.content,
    result,
  ]
  let rawPatch: Record<string, any> = {}
  for (const candidate of payloadCandidates) {
    const extracted = extractFillGapsPatch(candidate)
    if (extracted && Object.keys(extracted).length) {
      rawPatch = extracted
      break
    }
  }
  // Build a narrow patch only. Do NOT full-normalize against the whole seed,
  // or fields like character_pool / first30_plan can be dropped.
  const modelPatch: Record<string, any> = {}
  for (const key of [
    'writing_bible',
    'commercial_positioning',
    'worldbuilding',
    'plot_engine',
    'protagonist',
    'antagonist',
    'characters',
    'character_pool',
    'reader_promise',
    'core_selling_point',
    'opening_hook',
    'mainline_goal',
    'long_term_conflict',
    'growth_engine',
    'target_audience',
    'foreshadowing_plan',
  ]) {
    if (rawPatch[key] !== undefined) modelPatch[key] = rawPatch[key]
  }
  // nested convenience: allow top-level contract objects
  if (!modelPatch.writing_bible) {
    const bibleKeys = [
      'target_reader_contract',
      'opening_strategy_contract',
      'reader_retention_contract',
      'story_power_contract',
      'core_contract_radar',
      'character_design_contract',
      'longform_structure_contract',
      'plot_special_topics_contract',
      'genre_positioning_contract',
      'mainline_definition_contract',
    ]
    const nested: Record<string, any> = {}
    for (const key of bibleKeys) {
      if (rawPatch[key] !== undefined) nested[key] = rawPatch[key]
    }
    if (Object.keys(nested).length) modelPatch.writing_bible = nested
  }
  // Never accept outline rewrites from fill-gaps unless foreshadowing was empty.
  delete modelPatch.chapter_outlines
  delete modelPatch.volume_outlines
  delete modelPatch.title
  delete modelPatch.genre
  if (asSeedArray(baseSeed.foreshadowing_plan).length) delete modelPatch.foreshadowing_plan

  const merged = mergeSeedPreferRicher(baseSeed, modelPatch)
  const filled = Array.from(new Set([...(merged.filled || [])]))
  const skipped = Array.from(new Set([...(merged.skipped || [])]))

  let nextSeed = repairProjectSeedGaps(merged.seed, idea)
  nextSeed = {
    ...nextSeed,
    // hard preserve protected fields
    title: firstSeedText(baseSeed.title, nextSeed.title),
    genre: firstSeedText(baseSeed.genre, nextSeed.genre),
    chapter_outlines: asSeedArray(baseSeed.chapter_outlines).length ? baseSeed.chapter_outlines : nextSeed.chapter_outlines,
    volume_outlines: asSeedArray(baseSeed.volume_outlines).length ? baseSeed.volume_outlines : nextSeed.volume_outlines,
    foreshadowing_plan: asSeedArray(baseSeed.foreshadowing_plan).length
      ? baseSeed.foreshadowing_plan
      : nextSeed.foreshadowing_plan,
    character_pool: nextSeed.character_pool || baseSeed.character_pool,
    raw_idea: baseSeed.raw_idea || idea,
  }
  nextSeed = attachProjectSeedDirector(nextSeed)
  const remaining = listProjectSeedGapTargets(nextSeed, [...risks, ...gapHints])
  const modelPatchKeys = Object.keys(modelPatch)
  const diagnostics = {
    ...buildProjectSeedDiagnostics(nextSeed, idea, result),
    status: remaining.length ? (filled.length ? 'gaps_partially_filled' : 'gaps_unchanged') : 'gaps_filled',
    usable: true,
    filled_fields: filled,
    skipped_fields: skipped,
    requested_gaps: gaps,
    remaining_gaps: remaining,
    model_patch_keys: modelPatchKeys,
    model_patch_empty: modelPatchKeys.length === 0,
    raw_preview: resultContentPreview(result).slice(0, 1200),
    model_error: modelFailed ? String((result as any)?.error || '').slice(0, 300) : '',
    suggestion: !filled.length
      ? (
          modelFailed
            ? `模型调用失败：${String((result as any)?.error || '').slice(0, 120)}。已完整保留原种子，可换模型后重试补齐。`
            : modelPatchKeys.length === 0
              ? '模型未返回可解析补丁，已完整保留原种子。可重试补齐或换更强模型。'
              : '模型补丁未优于现有内容，已保留原种子。'
        )
      : remaining.length
        ? `已用模型安全补齐 ${filled.length} 项，仍有 ${remaining.length} 项可继续补。原有优质内容已保留。`
        : `已用模型安全补齐缺口（${filled.length} 项），未覆盖已有优质内容。`,
  }
  nextSeed = attachProjectSeedDirector({ ...nextSeed, seed_diagnostics: diagnostics })
  return {
    seed: nextSeed,
    filled,
    skipped,
    gaps,
    remaining,
    result,
    seed_diagnostics: diagnostics,
  }
}
