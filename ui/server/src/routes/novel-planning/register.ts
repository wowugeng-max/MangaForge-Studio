import type { Express } from 'express'
import type { PlanningRoutesContext } from './builders'
import { registerNovelPlanningReviewRoutes } from './register-reviews'
import { registerNovelPlanningAbRoutes } from './register-ab'
import { registerNovelPlanningOpsRoutes } from './register-planning-ops'

export function registerNovelPlanningRoutes(app: Express, ctx: PlanningRoutesContext) {
  registerNovelPlanningReviewRoutes(app, ctx)
  registerNovelPlanningAbRoutes(app, ctx)
  registerNovelPlanningOpsRoutes(app, ctx)
}
