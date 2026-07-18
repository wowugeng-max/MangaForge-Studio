import type { Express } from 'express'
import type { CommercialOpsContext } from './builders'
import {
  registerNovelCommercialOpsCreativeRoutes,
} from './register-creative'
import {
  registerNovelCommercialOpsQaRoutes,
} from './register-qa'
import {
  registerNovelCommercialOpsLongformRoutes,
} from './register-longform'
import {
  registerNovelCommercialOpsUtilityRoutes,
} from './register-ops'

export function registerNovelCommercialOpsRoutes(app: Express, ctx: CommercialOpsContext) {
  registerNovelCommercialOpsCreativeRoutes(app, ctx)
  registerNovelCommercialOpsQaRoutes(app, ctx)
  registerNovelCommercialOpsLongformRoutes(app, ctx)
  registerNovelCommercialOpsUtilityRoutes(app, ctx)
}
