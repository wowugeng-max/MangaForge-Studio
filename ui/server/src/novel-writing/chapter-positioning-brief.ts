import { normalizePressureLevel } from './scene-briefs'

function compactBriefText(value: any, fallback = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim()
}

export const CHAPTER_POSITIONING_OPTIONS = ['高压', '推进', '修炼试错', '关系回收', '低压生活', '信息整理']

export function normalizeBenchmarkStructureCoordinates(raw: any, sceneBriefs: any[] = []) {
  const values = [
    ...(Array.isArray(raw) ? raw : raw ? [raw] : []),
    ...sceneBriefs.map((scene: any) => scene?.benchmark_structure_coordinate || scene?.benchmarkStructureCoordinate).filter(Boolean),
  ]
  return values
    .map((item: any) => {
      if (typeof item === 'string') return { summary: compactBriefText(item, '') }
      return {
        normalized_position: compactBriefText(item?.normalized_position || item?.normalizedPosition || item?.position),
        volume_chapter_range: compactBriefText(item?.volume_chapter_range || item?.volumeChapterRange || item?.chapter_range || item?.chapterRange),
        source_event: compactBriefText(item?.source_event || item?.sourceEvent || item?.benchmark_event || item?.benchmarkEvent),
        local_event: compactBriefText(item?.local_event || item?.localEvent || item?.current_event || item?.currentEvent),
        event_type: compactBriefText(item?.event_type || item?.eventType || item?.type),
        summary: compactBriefText(item?.summary),
      }
    })
    .filter((item: any) => Object.values(item).some(value => compactBriefText(value)))
    .slice(0, 8)
}

export function normalizeChapterPositioningBrief(contextPackage: any = {}, sceneBriefs: any[] = []) {
  const runtimeTarget = contextPackage?.chapterTarget || {}
  const target = {
    ...(contextPackage?.chapter_target || {}),
    ...runtimeTarget,
  }
  const brief = {
    ...(contextPackage?.pre_draft_brief || {}),
    ...(contextPackage?.preDraftBrief || {}),
  }
  const blueprint = runtimeTarget.chapter_blueprint
    || runtimeTarget.chapterBlueprint
    || target.chapter_blueprint
    || target.chapterBlueprint
    || brief.chapter_blueprint
    || brief.chapterBlueprint
    || contextPackage?.chapter_blueprint
    || {}
  const chapterPositioning = compactBriefText(
    runtimeTarget.chapter_positioning
      || runtimeTarget.chapterPositioning
      || runtimeTarget.chapter_role
      || runtimeTarget.chapterRole
      || target.chapter_positioning
      || target.chapterPositioning
      || target.chapter_role
      || target.chapterRole
      || blueprint.chapter_positioning
      || blueprint.chapterPositioning
      || brief.chapter_positioning
      || brief.chapterPositioning
      || sceneBriefs.map((scene: any) => scene?.chapter_positioning || scene?.chapterPositioning).find(Boolean)
      || '推进',
  )
  const pressureLevel = normalizePressureLevel(
    runtimeTarget.pressure_level
      || runtimeTarget.pressureLevel
      || target.pressure_level
      || target.pressureLevel
      || blueprint.pressure_level
      || blueprint.pressureLevel
      || brief.pressure_level
      || brief.pressureLevel
      || sceneBriefs.map((scene: any) => scene?.pressure_level || scene?.pressureLevel).find(Boolean),
  )
  const benchmarkStructureCoordinates = normalizeBenchmarkStructureCoordinates(
    runtimeTarget.benchmark_structure_coordinates
      || runtimeTarget.benchmarkStructureCoordinates
      || runtimeTarget.benchmark_structure_coordinate
      || runtimeTarget.benchmarkStructureCoordinate
      || target.benchmark_structure_coordinates
      || target.benchmarkStructureCoordinates
      || target.benchmark_structure_coordinate
      || target.benchmarkStructureCoordinate
      || blueprint.benchmark_structure_coordinates
      || blueprint.benchmarkStructureCoordinates
      || brief.benchmark_structure_coordinates
      || brief.benchmarkStructureCoordinates
      || contextPackage?.benchmark_structure_coordinates
      || contextPackage?.benchmarkStructureCoordinates,
    sceneBriefs,
  )
  return {
    version: 'oh_story_chapter_positioning_v1',
    chapter_positioning: chapterPositioning,
    pressure_level: pressureLevel,
    positioning_options: CHAPTER_POSITIONING_OPTIONS,
    benchmark_structure_coordinates: benchmarkStructureCoordinates,
    rules: [
      '章节定位决定爆发/冲突烈度，不等于情绪强度；关系回收章可以低压力但高情绪。',
      '低压生活/信息整理/过场章允许弱钩子或无显性爽点，但必须保留往下看的理由。',
      '高压/推进章必须有明确冲突升级、信息变化或读者回报；不要所有章节同一力度。',
      '相邻 3-4 章避免同一情绪母题扎堆，必要时用关系、世界调剂或信息整理降压。',
    ],
    quality_checks: [
      'chapter_positioning_checks：本章钩子、爽点密度、详略和章尾拉力是否匹配章节定位。',
      '对标结构坐标：有对标时检查 1/4 / 中点 / 3/4 功能位是否换素材迁移，而不是照搬桥段。',
      '低压/过场章仍要有阶段目标、微好奇或关系期待；不能裸奔无钩子。',
    ],
  }
}
