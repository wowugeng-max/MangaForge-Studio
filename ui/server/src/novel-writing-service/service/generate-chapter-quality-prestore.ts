export {
  runQualityLoopPhase,
} from './generate-chapter-quality-prestore-loop'
export {
  runQualityPrestoreFinalize,
} from './generate-chapter-quality-prestore-finalize'

import {
  runQualityLoopPhase,
} from './generate-chapter-quality-prestore-loop'
import {
  runQualityPrestoreFinalize,
} from './generate-chapter-quality-prestore-finalize'
import type {
  QualityPrestoreSetupArgs,
} from './generate-chapter-quality-prestore-contract'

export async function runQualityLoopAndPrestoreSetup(args: QualityPrestoreSetupArgs): Promise<any> {
  const state = await runQualityLoopPhase(args)
  return runQualityPrestoreFinalize(state)
}
