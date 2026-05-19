import type { Express } from 'express'
import { registerNovelProjectBibleRoutes } from './novel-project-bible-routes'
import { registerNovelProjectConfigRoutes } from './novel-project-config-routes'
import { registerNovelProjectDeliveryRoutes } from './novel-project-delivery-routes'
import { registerNovelProjectInsightRoutes } from './novel-project-insight-routes'

type ProjectControlRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
  getStoredOrBuiltWritingBible: (workspace: string, project: any) => Promise<any>
  getStoryState: (project: any) => any
  buildProductionDashboard: (project: any, chapters: any[], outlines: any[], characters: any[], reviews: any[], runs: any[]) => any
  buildProductionMetrics: (chapters: any[], reviews: any[], runs: any[]) => any
  buildCommercialReadiness: (project: any, chapters: any[], outlines: any[], characters: any[], reviews: any[], runs: any[]) => any
  getApprovalPolicy: (project: any) => any
  getProductionBudget: (project: any) => any
  getProductionBudgetDecision: (project: any, runs: any[]) => any
  getQualityGate: (project: any) => any
  getAgentPromptConfig: (project: any) => any
  buildAgentConfigSnapshot: (project: any, preferredModelId?: number) => any
  buildChapterContextPackage: (workspace: string, project: any, chapter: any, chapters: any[], worldbuilding: any[], characters: any[], outlines: any[], reviews: any[]) => Promise<any>
  buildReferenceUsageReport: (workspace: string, project: any, taskType: string, generatedText?: string) => Promise<any>
  buildStructuralSimilarityReport: (chapter: any, referenceReport: any) => any
}

export function registerNovelProjectControlRoutes(app: Express, ctx: ProjectControlRoutesContext) {
  registerNovelProjectDeliveryRoutes(app, ctx)
  registerNovelProjectBibleRoutes(app, ctx)
  registerNovelProjectInsightRoutes(app, ctx)
  registerNovelProjectConfigRoutes(app, ctx)
}
