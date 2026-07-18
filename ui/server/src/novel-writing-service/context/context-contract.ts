import { camelizeSnakeField } from '../quality/text-utils'

export function getContextContract(contextPackage: any, contractField: string) {
  const camelField = camelizeSnakeField(contractField)
  const targetBlueprint = contextPackage?.chapter_target?.chapter_blueprint
    || contextPackage?.chapter_target?.chapterBlueprint
    || contextPackage?.chapterTarget?.chapter_blueprint
    || contextPackage?.chapterTarget?.chapterBlueprint
    || contextPackage?.chapter_blueprint
    || contextPackage?.chapterBlueprint
    || contextPackage?.pre_draft_brief?.chapter_blueprint
    || contextPackage?.pre_draft_brief?.chapterBlueprint
    || contextPackage?.preDraftBrief?.chapter_blueprint
    || contextPackage?.preDraftBrief?.chapterBlueprint
  return contextPackage?.chapter_target?.[contractField]
    || contextPackage?.chapter_target?.[camelField]
    || contextPackage?.chapterTarget?.[contractField]
    || contextPackage?.chapterTarget?.[camelField]
    || targetBlueprint?.[contractField]
    || targetBlueprint?.[camelField]
    || contextPackage?.[contractField]
    || contextPackage?.[camelField]
    || contextPackage?.pre_draft_brief?.[contractField]
    || contextPackage?.pre_draft_brief?.[camelField]
    || contextPackage?.preDraftBrief?.[contractField]
    || contextPackage?.preDraftBrief?.[camelField]
}
