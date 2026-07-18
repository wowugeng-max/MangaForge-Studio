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
  chapterTitleLooksStructural,
  cleanSeedCharacterName,
  compactSeedText,
  fallbackChapterDisplayTitle,
  firstSeedText,
  parseNestedSeed,
  repairProjectSeedGaps,
  uniqueSeedTexts,
} from './builders-seed-outline'

import {
  buildFallbackWritingBible,
  buildMaterializedSeedCharacters,
  buildProjectSeedStoryState,
  firstNonEmptySeedArray,
  getSeedChapterOutlines,
  getSeedRaw,
  getSeedVolumeOutlines,
  normalizeChapterSeed,
  normalizeSeedSceneCards,
} from './builders-seed-materialize-helpers'

export async function materializeProjectSeed(activeWorkspace: string, project: any, seed: any) {
  const raw = getSeedRaw(seed)
  const master = parseNestedSeed(raw.master_outline || seed.master_outline)
  const volumeOutlines = getSeedVolumeOutlines(seed)
  const chapterOutlines = getSeedChapterOutlines(seed).map((chapter: any, index: number) => normalizeChapterSeed(chapter, index, seed))
  const writingBible = buildFallbackWritingBible(seed, project)
  const materializedCharacters = buildMaterializedSeedCharacters(seed)
  const created: any = { worldbuilding: 0, characters: 0, outlines: 0, chapters: 0, setting_entities: 0 }

  const world = parseNestedSeed(seed.worldbuilding)
  const worldSummary = firstSeedText(world.world_summary, world.history_secret, world.power_system, seed.core_premise, master.summary, project.synopsis)
  if (worldSummary) {
    await createNovelWorldbuilding(activeWorkspace, {
      project_id: project.id,
      world_summary: worldSummary,
      rules: asSeedArray(world.rules),
      systems: [
        world.power_system ? { name: '力量体系', content: world.power_system } : null,
        world.ancient_gods ? { name: '古神', content: world.ancient_gods } : null,
        world.outer_gods ? { name: '外神', content: world.outer_gods } : null,
      ].filter(Boolean),
      known_unknowns: asSeedArray(seed.open_questions),
      raw_payload: { ...world, source: 'project_seed' },
    })
    created.worldbuilding += 1
  }

  for (const character of materializedCharacters) {
    if (!character?.name) continue
    await createNovelCharacter(activeWorkspace, {
      project_id: project.id,
      name: String(character.name),
      role_type: character.role_type || character.role || '',
      archetype: character.archetype || '',
      motivation: character.motivation || '',
      goal: character.goal || '',
      conflict: character.conflict || '',
      growth_arc: character.growth_arc || '',
      current_state: character.current_state || {},
      raw_payload: { ...character, source: 'project_seed' },
    })
    created.characters += 1
  }

  const settingEntities = firstNonEmptySeedArray(raw.setting_entities, seed.setting_entities)
  for (const entity of normalizeSettingAgentPayload({ settings: settingEntities }, project.id)) {
    await createNovelSettingEntity(activeWorkspace, {
      ...entity,
      project_id: project.id,
      payload_json: { ...(entity.payload_json || {}), source: entity.payload_json?.source || 'project_seed_materialization' },
    } as any)
    created.setting_entities += 1
  }

  // Materialize foreshadowing plan and world rules so chapter-1 preflight can read them as source readiness.
  for (const item of asSeedArray(seed.foreshadowing_plan)) {
    const record = parseNestedSeed(item)
    const name = firstSeedText(record.name, record.title)
    if (!name) continue
    await createNovelSettingEntity(activeWorkspace, {
      project_id: project.id,
      entity_type: 'foreshadowing',
      name,
      summary: firstSeedText(record.description, record.summary, record.true_meaning, `${name} 待埋设/回收`),
      state_json: {
        planted_chapter: firstSeedText(record.plant_at, record.plantAt, '1'),
        payoff_chapter: firstSeedText(record.payoff_at, record.payoffAt, ''),
        true_meaning: firstSeedText(record.true_meaning, record.trueMeaning, ''),
        status: 'planted_pending',
      },
      payload_json: { ...record, source: 'project_seed_materialization' },
    } as any)
    created.setting_entities += 1
  }
  for (const rule of asSeedArray(world.rules)) {
    const ruleText = firstSeedText(rule)
    if (!ruleText) continue
    await createNovelSettingEntity(activeWorkspace, {
      project_id: project.id,
      entity_type: 'rule',
      name: compactSeedText(ruleText, 24) || '世界规则',
      summary: ruleText,
      constraints_json: { rule: ruleText, source: 'project_seed_worldbuilding' },
      payload_json: { source: 'project_seed_materialization', kind: 'world_rule' },
    } as any)
    created.setting_entities += 1
  }
  if (firstSeedText(world.power_system)) {
    await createNovelSettingEntity(activeWorkspace, {
      project_id: project.id,
      entity_type: 'system',
      name: '力量体系',
      summary: firstSeedText(world.power_system),
      constraints_json: { power_system: firstSeedText(world.power_system), source: 'project_seed_worldbuilding' },
      payload_json: { source: 'project_seed_materialization', kind: 'power_system' },
    } as any)
    created.setting_entities += 1
  }

  const masterOutline = await createNovelOutline(activeWorkspace, {
    project_id: project.id,
    outline_type: 'master',
    title: firstSeedText(master.title, seed.title, project.title, '全书主线'),
    summary: firstSeedText(master.summary, seed.synopsis, seed.core_premise, project.synopsis),
    hook: firstSeedText(master.hook, seed.logline, seed.main_conflict),
    target_length: project.length_target || '',
    raw_payload: { ...master, source: 'project_seed' },
  })
  created.outlines += 1

  for (const volume of volumeOutlines) {
    if (!volume?.title && !volume?.summary) continue
    await createNovelOutline(activeWorkspace, {
      project_id: project.id,
      outline_type: 'volume',
      parent_id: masterOutline.id,
      title: firstSeedText(volume.title, `分卷 ${created.outlines}`),
      summary: firstSeedText(volume.summary),
      hook: firstSeedText(volume.hook),
      target_length: volume.chapter_count ? `${volume.chapter_count}章` : '',
      raw_payload: { ...volume, source: 'project_seed' },
    })
    created.outlines += 1
  }

  for (const chapter of chapterOutlines) {
    if (!chapter.chapter_no) continue
    const sceneCards = normalizeSeedSceneCards(chapter, materializedCharacters)
    await syncNovelChapterPlanByNumber(activeWorkspace, {
      project_id: project.id,
      chapter_no: chapter.chapter_no,
      title: chapter.title,
      chapter_goal: chapter.chapter_goal,
      chapter_summary: chapter.chapter_summary,
      conflict: chapter.conflict,
      ending_hook: chapter.ending_hook,
      scene_breakdown: sceneCards,
      scene_list: sceneCards,
      raw_payload: { ...chapter.raw_payload, scene_cards_source: 'project_seed_materialization', source: 'project_seed' },
    }, { parent_id: masterOutline.id, source: 'project_seed' })
    created.chapters += 1
  }

  const nextReferenceConfig = {
    ...(project.reference_config || {}),
    project_seed: {
      ...seed,
      materialized_at: new Date().toISOString(),
      materialized_counts: created,
    },
    writing_bible: {
      ...writingBible,
      updated_at: new Date().toISOString(),
    },
    story_state: buildProjectSeedStoryState(seed, project, materializedCharacters),
    commercial_positioning: Object.keys(parseNestedSeed(project.reference_config?.commercial_positioning)).length
      && project.reference_config?.commercial_positioning?.seed !== true
      ? project.reference_config?.commercial_positioning
      : writingBible.commercial_positioning || {
      reader_promise: seed.logline || seed.synopsis || '',
      selling_points: asSeedArray(seed.commercial_tags),
      seed: true,
    },
    foreshadowing_plan: raw.foreshadowing_plan || seed.foreshadowing_plan || [],
    creation_pipeline: {
      mode: 'seed_auto_materialized',
      created,
      next_steps: seed.next_steps || [],
      updated_at: new Date().toISOString(),
    },
  }
  const updated = await updateNovelProject(activeWorkspace, project.id, {
    reference_config: nextReferenceConfig,
  } as any)
  await appendNovelRun(activeWorkspace, {
    project_id: project.id,
    run_type: 'project_seed_materialize',
    step_name: 'create-project-from-seed',
    status: 'success',
    input_ref: safeJsonStringify({ seed_title: seed.title || '', source: 'project_seed' }, undefined, 0),
    output_ref: safeJsonStringify({ created }, undefined, 0),
  })
  return { created, project: updated }
}

export async function createProjectFromSeed(activeWorkspace: string, seed: any, options: { title?: string; idea?: string } = {}) {
  const repairedSeed = repairProjectSeedGaps(seed, options.idea || seed.raw_idea || '')
  const title = firstSeedText(options.title, repairedSeed.title, repairedSeed.logline, '未命名小说').slice(0, 64)
  const seedForProject = attachProjectSeedDirector({
    ...repairedSeed,
    title,
    raw_idea: options.idea || repairedSeed.raw_idea || '',
    derived_at: repairedSeed.derived_at || new Date().toISOString(),
  })
  const project = await createNovelProject(activeWorkspace, {
    title,
    genre: repairedSeed.genre || '',
    sub_genres: asSeedArray(repairedSeed.sub_genres),
    length_target: repairedSeed.length_target || 'medium',
    target_audience: repairedSeed.target_audience || '',
    style_tags: asSeedArray(repairedSeed.style_tags),
    commercial_tags: asSeedArray(repairedSeed.commercial_tags),
    synopsis: repairedSeed.synopsis || repairedSeed.logline || repairedSeed.core_premise || '',
    status: 'draft',
    reference_config: {
      project_seed: seedForProject,
      writing_bible: repairedSeed.writing_bible || {},
      commercial_positioning: {
        ...(repairedSeed.commercial_positioning || {}),
        reader_promise: repairedSeed.commercial_positioning?.reader_promise || repairedSeed.logline || repairedSeed.synopsis || '',
        selling_points: asSeedArray(repairedSeed.commercial_positioning?.selling_points).length
          ? asSeedArray(repairedSeed.commercial_positioning?.selling_points)
          : asSeedArray(repairedSeed.commercial_tags),
        seed: true,
      },
    },
  })
  const materialized = await materializeProjectSeed(activeWorkspace, project, seedForProject)
  return { project: materialized.project || project, seed: seedForProject, created: materialized.created }
}


