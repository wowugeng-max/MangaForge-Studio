import { describe, expect, test } from 'bun:test'
import {
  resolveConfirmedPreDraftBenchmarkRecallSources,
  resolveConfirmedPreDraftBriefSources,
  resolveConfirmedPreDraftContractSources,
  resolveConfirmedPreDraftForeshadowingSource,
  resolveConfirmedPreDraftMemorySources,
} from './pre-draft-confirmation'

describe('pre-draft confirmation helpers', () => {
  test('prefers confirmed pre-draft sources over chapter target and context aliases', () => {
    const sources = resolveConfirmedPreDraftMemorySources({
      chapter_target: {
        longformMemoryCapsule: { source: 'target-capsule' },
        layeredMemoryContext: { source: 'target-layered' },
        progressSummary: { source: 'target-progress' },
        dailyContextSnapshot: { source: 'target-daily' },
      },
      longformMemoryCapsule: { source: 'context-capsule' },
      layeredMemoryContext: { source: 'context-layered' },
      progressSummary: { source: 'context-progress' },
      dailyContextSnapshot: { source: 'context-daily' },
      storyState: {
        progressSummary: { source: 'story-progress' },
        dailyContextSnapshot: { source: 'story-daily' },
      },
    }, {
      longform_memory_capsule: { source: 'brief-capsule' },
      layered_memory_context: { source: 'brief-layered' },
      progress_summary: { source: 'brief-progress' },
      daily_context_snapshot: { source: 'brief-daily' },
    })

    expect(sources).toEqual({
      longform_memory_capsule: { source: 'brief-capsule' },
      layered_memory_context: { source: 'brief-layered' },
      progress_summary: { source: 'brief-progress' },
      daily_context_snapshot: { source: 'brief-daily' },
    })
  })

  test('falls back through chapter target, context, and story state sources', () => {
    const sources = resolveConfirmedPreDraftMemorySources({
      chapter_target: {
        longform_memory_capsule: { source: 'target-capsule' },
      },
      layered_memory_context: { source: 'context-layered' },
      story_state: {
        progress_summary: { source: 'story-progress' },
        dailyContextSnapshot: { source: 'story-daily' },
      },
    }, {})

    expect(sources).toEqual({
      longform_memory_capsule: { source: 'target-capsule' },
      layered_memory_context: { source: 'context-layered' },
      progress_summary: { source: 'story-progress' },
      daily_context_snapshot: { source: 'story-daily' },
    })
  })

  test('accepts longform layered memory aliases for layered memory source', () => {
    expect(resolveConfirmedPreDraftMemorySources({
      longformLayeredMemory: { source: 'context-longform-layered' },
    }, {
      longformLayeredMemory: { source: 'brief-longform-layered' },
    }).layered_memory_context).toEqual({ source: 'brief-longform-layered' })
  })

  test('prefers confirmed pre-draft brief sources over chapter target and context aliases', () => {
    const sources = resolveConfirmedPreDraftBriefSources({
      chapter_target: {
        readerRetentionBrief: { source: 'target-retention' },
        storyDriveBrief: { source: 'target-drive' },
        signatureSceneBrief: { source: 'target-signature' },
      },
      readerRetentionBrief: { source: 'context-retention' },
      storyDriveBrief: { source: 'context-drive' },
      signatureSceneBrief: { source: 'context-signature' },
    }, {
      reader_retention_brief: { source: 'brief-retention' },
      story_drive_brief: { source: 'brief-drive' },
      signature_scene_brief: { source: 'brief-signature' },
    })

    expect(sources.reader_retention_brief).toEqual({ source: 'brief-retention' })
    expect(sources.story_drive_brief).toEqual({ source: 'brief-drive' })
    expect(sources.signature_scene_brief).toEqual({ source: 'brief-signature' })
  })

  test('falls back through chapter target and context aliases for confirmed brief sources', () => {
    const sources = resolveConfirmedPreDraftBriefSources({
      chapter_target: {
        reader_drop_risk_brief: { source: 'target-drop' },
        serialRhythmBrief: { source: 'target-rhythm' },
        governanceRecheckMemory: { source: 'target-governance' },
        scene_cards: [{ title: 'target scene' }],
      },
      goldenThreeBrief: { source: 'context-golden' },
      storyPressureLadder: { source: 'context-pressure' },
      volumeBeatBudget: { source: 'context-volume-budget' },
      readerTrialContext: { source: 'context-trial' },
    }, {})

    expect(sources.reader_drop_risk_brief).toEqual({ source: 'target-drop' })
    expect(sources.golden_three_brief).toEqual({ source: 'context-golden' })
    expect(sources.story_pressure_brief).toEqual({ source: 'context-pressure' })
    expect(sources.serial_rhythm_brief).toEqual({ source: 'target-rhythm' })
    expect(sources.governance_recheck_memory).toEqual({ source: 'target-governance' })
    expect(sources.volume_beat_budget).toEqual({ source: 'context-volume-budget' })
    expect(sources.scene_cards).toEqual([{ title: 'target scene' }])
  })

  test('keeps merge scene brief precedence aligned with the legacy service path', () => {
    const sources = resolveConfirmedPreDraftBriefSources({
      chapter_target: {
        scene_cards: [{ title: 'target card' }],
      },
    }, {
      sceneBriefs: [{ title: 'camel scene is ignored here' }],
    })

    expect(sources.scene_briefs).toEqual([])
    expect(sources.scene_cards).toEqual([{ title: 'target card' }])
  })

  test('prefers confirmed pre-draft contract sources over target and context sources', () => {
    const sources = resolveConfirmedPreDraftContractSources({
      chapter_target: {
        dialogue_contract: { source: 'target-dialogue' },
        story_power_contract: { source: 'target-story-power' },
      },
      dialogue_contract: { source: 'context-dialogue' },
      story_power_contract: { source: 'context-story-power' },
    }, {
      dialogueContract: { source: 'brief-dialogue-camel' },
      story_power_contract: { source: 'brief-story-power' },
    })

    expect(sources.dialogue_contract).toEqual({ source: 'brief-dialogue-camel' })
    expect(sources.story_power_contract).toEqual({ source: 'brief-story-power' })
  })

  test('falls back through target and context snake-case contract sources', () => {
    const sources = resolveConfirmedPreDraftContractSources({
      chapter_target: {
        platform_rubric: { source: 'target-platform' },
        state_tracking_contract: { source: 'target-state' },
      },
      quality_audit_contract: { source: 'context-quality' },
      write_preparation_brief: { source: 'context-write-prep' },
    }, {})

    expect(sources.platform_rubric).toEqual({ source: 'target-platform' })
    expect(sources.state_tracking_contract).toEqual({ source: 'target-state' })
    expect(sources.quality_audit_contract).toEqual({ source: 'context-quality' })
    expect(sources.write_preparation_brief).toBeUndefined()
  })

  test('keeps target and context camel-case contract aliases ignored in the legacy merge path', () => {
    const sources = resolveConfirmedPreDraftContractSources({
      chapter_target: {
        dialogueContract: { source: 'target-camel-dialogue' },
      },
      storyPowerContract: { source: 'context-camel-story-power' },
    }, {})

    expect(sources.dialogue_contract).toBeUndefined()
    expect(sources.story_power_contract).toBeUndefined()
  })

  test('prefers confirmed foreshadowing radar over target context and story state aliases', () => {
    const source = resolveConfirmedPreDraftForeshadowingSource({
      chapter_target: {
        foreshadowingConsistencyRadar: { source: 'target-radar' },
      },
      foreshadowingConsistencyRadar: { source: 'context-radar' },
      storyState: {
        foreshadowingConsistencyRadar: { source: 'story-radar' },
      },
    }, {
      foreshadowing_consistency_radar: { source: 'brief-radar' },
    })

    expect(source).toEqual({ source: 'brief-radar' })
  })

  test('falls back through foreshadowing target context and story aliases', () => {
    expect(resolveConfirmedPreDraftForeshadowingSource({
      chapter_target: {
        foreshadowing_consistency_radar: { source: 'target-radar' },
      },
    }, {})).toEqual({ source: 'target-radar' })

    expect(resolveConfirmedPreDraftForeshadowingSource({
      foreshadowingConsistencyRadar: { source: 'context-radar' },
    }, {})).toEqual({ source: 'context-radar' })

    expect(resolveConfirmedPreDraftForeshadowingSource({
      story_state: {
        foreshadowingConsistencyRadar: { source: 'story-radar' },
      },
    }, {})).toEqual({ source: 'story-radar' })
  })

  test('keeps legacy story-state status and payoff queue fallback for foreshadowing', () => {
    const source = resolveConfirmedPreDraftForeshadowingSource({
      story_state: {
        foreshadowingStatus: '伏笔待回收',
      },
      storyState: {
        payoffQueue: ['第三章回收玉佩'],
      },
    }, {})

    expect(source).toEqual({
      foreshadowing_status: '伏笔待回收',
      payoff_queue: ['第三章回收玉佩'],
    })
  })

  test('prefers confirmed benchmark recall brief over target and context sources', () => {
    const sources = resolveConfirmedPreDraftBenchmarkRecallSources({
      chapter_target: {
        benchmark_recall_brief: { source: 'target-benchmark' },
      },
      benchmark_recall_brief: { source: 'context-benchmark' },
    }, {
      benchmarkRecallBrief: { source: 'brief-benchmark-camel' },
    })

    expect(sources).toEqual({
      benchmark_recall_brief: { source: 'brief-benchmark-camel' },
      chapter_target_benchmark_recall_brief: { source: 'brief-benchmark-camel' },
    })
  })

  test('keeps root benchmark recall fallback out of the nested chapter target copy', () => {
    const sources = resolveConfirmedPreDraftBenchmarkRecallSources({
      benchmark_recall_brief: { source: 'context-benchmark' },
    }, {})

    expect(sources.benchmark_recall_brief).toEqual({ source: 'context-benchmark' })
    expect(sources.chapter_target_benchmark_recall_brief).toBeUndefined()
  })

  test('keeps target and context camel-case benchmark recall aliases ignored in the legacy merge path', () => {
    const sources = resolveConfirmedPreDraftBenchmarkRecallSources({
      chapter_target: {
        benchmarkRecallBrief: { source: 'target-camel-benchmark' },
      },
      benchmarkRecallBrief: { source: 'context-camel-benchmark' },
    }, {})

    expect(sources.benchmark_recall_brief).toBeUndefined()
    expect(sources.chapter_target_benchmark_recall_brief).toBeUndefined()
  })
})
