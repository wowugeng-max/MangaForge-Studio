/**
 * Compatibility re-exports of novel-writing helpers historically exposed
 * through the writing-service monofile public surface.
 */

export {
  scanAuthorialForecastRisks,
} from '../novel-writing/authorial-forecast'

export {
  attachPovLensesToSceneCards,
  buildPovCharacterStatePatch,
  buildPovRepairInstructions,
  compileChapterPovPlan,
  compileAssetPovBindings,
  formatCharacterPovPrompt,
  formatSceneCardPovPrompt,
  scanCharacterPovRisks,
  sanitizeCharacterPovAntiAiStock,
  compilePovKnowledgeLedgers,
  buildCharacterPovUiSnapshot,
} from '../novel-writing/character-pov'

export {
  scanBannedWordLeaks,
  scanContextSensitiveWordDensityRisks,
  scanWeakAdverbDensityRisks,
} from '../novel-writing/deslop-scans'

export {
  buildDeslopGateDiagnostics,
  buildDeterministicProseCleanupReport,
  buildQualityGateReviewWithDeterministicCleanup,
} from '../novel-writing/deterministic-prose-cleanup'

export {
  scanDialogueBreathRisks,
  scanDialoguePowerBalanceRisks,
  scanDialogueVoiceSamenessRisks,
} from '../novel-writing/dialogue-balance'

export {
  scanDialogueDensityRisks,
  scanDialogueProtagonistLineEconomyRisks,
  scanDialogueQuestionAnswerLoopRisks,
} from '../novel-writing/dialogue-economy'

export {
  scanDialogueEasyPersuasionRisks,
  scanDialogueEmotionContinuityRisks,
} from '../novel-writing/dialogue-emotion'

export {
  scanDialogueFormatRisks,
  scanDialogueQuoteStyleRisks,
} from '../novel-writing/dialogue-format'

export {
  scanDialogueFunctionalFillerRisks,
} from '../novel-writing/dialogue-functional'

export {
  scanDialogueDetachedJokeRisks,
  scanDialogueFlatCallbackRisks,
  scanDialogueHighPressureMemeRisks,
  scanDialogueHollowHumorPayoffRisks,
} from '../novel-writing/dialogue-humor'

export {
  scanDialogueInfodumpRisks,
} from '../novel-writing/dialogue-infodump'

export {
  scanDialogueEmptyPraiseRisks,
  scanDialogueJudgmentQuestionRisks,
  scanDialogueSubtextAgendaRisks,
} from '../novel-writing/dialogue-intent'

export {
  scanDialogueToneRisks,
} from '../novel-writing/dialogue-tone'

export {
  scanDownwardSafetyRisks,
  scanOppressionPurposeRisks,
  scanPayoffDensityRisks,
  scanPayoffEscalationRisks,
  scanTrumpCardEffectRisks,
} from '../novel-writing/emotional-payoff-scans'

export {
  scanEndingSummaryRisks,
} from '../novel-writing/ending-summary'

export {
  scanAntagonistDownfallAgencyRisks,
  scanEvidenceChainDumpRisks,
  scanEvidenceTimeBombRisks,
  scanFaceSlapRhythmRisks,
  scanFinalEvidenceImpactRisks,
  scanProtagonistComposureRisks,
} from '../novel-writing/face-slap-scans'

export {
  scanEndingHookRisks,
  scanEntryPromiseAlignmentRisks,
  scanOpeningConflictAlignmentRisks,
  scanOpeningHookEchoRisks,
  scanParagraphHookStallRisks,
  scanSuddenEndingClueRisks,
} from '../novel-writing/hook-alignment-scans'

export {
  scanOpeningEventDensityRisks,
  scanOpeningFirst50ConflictRisks,
  scanOpeningHookRisks,
  scanOpeningProtagonistDelayRisks,
} from '../novel-writing/opening-scans'

export {
  scanExpectationVacuumRisks,
  scanMeaningInflationFillerRisks,
  scanNarrativeTransitionRisks,
  scanParagraphProgressionRisks,
  scanRelationshipSceneChangeRisks,
} from '../novel-writing/progression-scans'

export {
  scanEmotionTellingRisks,
  scanEmotionalStasisRisks,
  scanInfodumpRisks,
  scanInternalMonologueRisks,
  scanParagraphCommaChainDensityRisks,
  scanParagraphFragmentationRisks,
  scanParagraphLengthUniformityRisks,
  scanProseCameraAnchorRisks,
  scanProseDecorativeDetailRisks,
  scanProseMotionStillRisks,
  scanProseOmniscientCrowdCameraRisks,
  scanProseStackedDescriptionRisks,
  scanProseStaticEnvironmentRisks,
  scanRecapFillerRisks,
  scanSpecificCharacterCountExpressionRisks,
  scanVagueQuantityWeightRisks,
} from '../novel-writing/prose-craft-scans'

export {
  normalizeDeterministicProseFormat,
  normalizeDeterministicProsePunctuation,
  scanPeriodMonotonyRisks,
  scanProseFormatRisks,
  scanPunctuationToneRisks,
} from '../novel-writing/prose-format'

export {
  buildProseMetaSyncReport,
  scanModelDegenerationRisks,
  scanProseMetaLeaks,
} from '../novel-writing/prose-meta'

export {
  buildCommercialEditorRewritePrompt,
  buildProseWordTargetExpansionPrompt,
  buildReadabilityReviewPrompt,
} from '../novel-writing/prose-prompt-builders'

export {
  buildPayoffSetupSyncReport,
  buildSpectatorReactionSyncReport,
  scanPayoffSetupRisks,
  scanShockLayeringRisks,
  scanSpectatorReactionDifferentiationRisks,
} from '../novel-writing/public-payoff-scans'

export {
  scanRepeatedReactionRisks,
  scanRepeatedSubjectRisks,
  scanTripleParallelRisks,
  scanUniformRhythmRisks,
} from '../novel-writing/rhythm-scans'

export {
  resolveEffectiveQualityThreshold,
} from '../novel-writing/rolling-rhythm-preflight'

export {
  scanCombatProcessRisks,
  scanSceneDensityExecutionRisks,
  scanSceneGoalObstacleChangeRisks,
  scanScenePurposeWeightRisks,
} from '../novel-writing/scene-action-scans'

export {
  buildSceneCardConsumptionChecks,
  buildSceneCardReceiptSyncReport,
  buildStoryStateSyncContextPackage,
  scanSceneCardReceiptRisks,
  scanSceneSensoryAnchorRisks,
  scanSceneSerialRiskRepairRisks,
  selectVerifiedSceneBreakdownUpdate,
  verifiedSceneBreakdownForStateSync,
} from '../novel-writing/scene-card-execution-scans'

export {
  buildStyleFingerprintStateSnapshot,
} from '../novel-writing/style-fingerprint'

export {
  scanObscureSuspenseRisks,
  scanSuspenseFalseAlarmRisks,
  scanSuspenseWithheldInfoRisks,
} from '../novel-writing/suspense-scans'

export {
  buildChapterTitleUniquenessReport,
  buildChapterTitleUniquenessSyncReport,
  buildGeneratedChapterTitlePatch,
} from '../novel-writing/title-uniqueness'

export {
  scanUpgradeAftermathRisks,
} from '../novel-writing/upgrade-rhythm-basics'

export {
  applyChapterWordTargetToContext,
  countProseChars,
  evaluateProseWordTarget,
  proseMaxTokensForWordTarget,
  resolveChapterWordTarget,
} from '../novel-writing/word-target'

export type {
  ChapterWordTarget,
  ProseWordTargetEvaluation,
} from '../novel-writing/word-target'
