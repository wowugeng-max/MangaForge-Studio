import {
  asArray,
  asObject,
  firstText,
  isEmptyValue,
  looksPlaceholder,
  seedValueRichness,
  type AnyRecord,
  type SeedGapTarget,
} from './novel-project-seed-fill-gaps-merge'


function hasContract(value: any) {
  return seedValueRichness(value) >= 24
}

function hasAntagonist(seed: any) {
  const root = asObject(seed)
  const pool = asObject(root.character_pool)
  if (asArray(pool.antagonist_primary).length > 0) return true
  if (firstText(asObject(root.antagonist).name, asObject(root.antagonist).identity)) return true
  return asArray(root.characters).some(item => /反派|对手|敌|boss|antagonist/i.test(String(item?.role_type || item?.role || '')))
}

const LABEL_TO_TARGET: Array<{ match: RegExp; target: Omit<SeedGapTarget, 'reason'> & { reason: string } }> = [
  {
    match: /追读|留存/,
    target: {
      key: 'reader_retention_contract',
      label: '追读留存契约',
      path: 'writing_bible.reader_retention_contract',
      reason: '缺少追读留存契约',
    },
  },
  {
    match: /开篇策略|开篇噱头|opening_strategy/,
    target: {
      key: 'opening_strategy_contract',
      label: '开篇策略契约',
      path: 'writing_bible.opening_strategy_contract',
      reason: '缺少开篇策略契约',
    },
  },
  {
    match: /故事力/,
    target: {
      key: 'story_power_contract',
      label: '故事力合同',
      path: 'writing_bible.story_power_contract',
      reason: '缺少故事力合同',
    },
  },
  {
    match: /核心承诺|承诺雷达|core_contract/,
    target: {
      key: 'core_contract_radar',
      label: '核心承诺雷达',
      path: 'writing_bible.core_contract_radar',
      reason: '缺少核心承诺雷达',
    },
  },
  {
    match: /目标读者/,
    target: {
      key: 'target_reader_contract',
      label: '目标读者契约',
      path: 'writing_bible.target_reader_contract',
      reason: '缺少目标读者契约',
    },
  },
  {
    match: /角色设计合同|角色合同/,
    target: {
      key: 'character_design_contract',
      label: '角色设计合同',
      path: 'writing_bible.character_design_contract',
      reason: '缺少角色设计合同',
    },
  },
  {
    match: /长篇结构/,
    target: {
      key: 'longform_structure_contract',
      label: '长篇结构合同',
      path: 'writing_bible.longform_structure_contract',
      reason: '缺少长篇结构合同',
    },
  },
  {
    match: /情节专题/,
    target: {
      key: 'plot_special_topics_contract',
      label: '情节专题合同',
      path: 'writing_bible.plot_special_topics_contract',
      reason: '缺少情节专题合同',
    },
  },
  {
    match: /题材定位/,
    target: {
      key: 'genre_positioning_contract',
      label: '题材定位合同',
      path: 'writing_bible.genre_positioning_contract',
      reason: '缺少题材定位合同',
    },
  },
  {
    match: /关键人物|人物阵容|角色阵容/,
    target: {
      key: 'characters',
      label: '关键人物阵容',
      path: 'characters',
      reason: '关键人物不足 3 人',
    },
  },
  {
    match: /主要对手|反派|对手/,
    target: {
      key: 'antagonist',
      label: '主要对手',
      path: 'antagonist',
      reason: '缺少主要对手',
    },
  },
  {
    match: /读者承诺/,
    target: {
      key: 'reader_promise',
      label: '读者承诺',
      path: 'commercial_positioning.reader_promise',
      reason: '缺少读者承诺',
    },
  },
  {
    match: /核心卖点|卖点/,
    target: {
      key: 'selling_points',
      label: '核心卖点',
      path: 'commercial_positioning.selling_points',
      reason: '缺少核心卖点',
    },
  },
  {
    match: /伏笔/,
    target: {
      key: 'foreshadowing_plan',
      label: '伏笔计划',
      path: 'foreshadowing_plan',
      reason: '伏笔计划偏薄',
    },
  },
  {
    match: /世界观/,
    target: {
      key: 'world_summary',
      label: '世界观摘要',
      path: 'worldbuilding.world_summary',
      reason: '世界观摘要偏薄',
    },
  },
  {
    match: /力量|规则体系|成长引擎/,
    target: {
      key: 'power_system',
      label: '力量/规则体系',
      path: 'worldbuilding.power_system',
      reason: '力量/规则体系偏薄',
    },
  },
  {
    match: /主线目标|长篇主线/,
    target: {
      key: 'mainline_goal',
      label: '长篇主线目标',
      path: 'plot_engine.mainline_goal',
      reason: '缺少长篇主线目标',
    },
  },
  {
    match: /长线冲突/,
    target: {
      key: 'long_term_conflict',
      label: '长线冲突引擎',
      path: 'plot_engine.long_term_conflict',
      reason: '缺少长线冲突引擎',
    },
  },
]

function pushUniqueTarget(list: SeedGapTarget[], target: SeedGapTarget) {
  if (list.some(item => item.key === target.key || item.path === target.path)) return
  list.push(target)
}

export function listProjectSeedGapTargets(seed: any, hints: string[] = []): SeedGapTarget[] {
  const root = asObject(seed)
  const bible = asObject(root.writing_bible)
  const commercial = asObject(root.commercial_positioning)
  const world = asObject(root.worldbuilding)
  const plot = asObject(root.plot_engine)
  const targets: SeedGapTarget[] = []

  const autoChecks: Array<[boolean, SeedGapTarget]> = [
    [!hasContract(bible.reader_retention_contract), {
      key: 'reader_retention_contract',
      label: '追读留存契约',
      path: 'writing_bible.reader_retention_contract',
      reason: 'writing_bible.reader_retention_contract 缺失或偏薄',
    }],
    [!hasContract(bible.opening_strategy_contract), {
      key: 'opening_strategy_contract',
      label: '开篇策略契约',
      path: 'writing_bible.opening_strategy_contract',
      reason: 'writing_bible.opening_strategy_contract 缺失或偏薄',
    }],
    [!hasContract(bible.story_power_contract), {
      key: 'story_power_contract',
      label: '故事力合同',
      path: 'writing_bible.story_power_contract',
      reason: 'writing_bible.story_power_contract 缺失或偏薄',
    }],
    [!hasContract(bible.core_contract_radar), {
      key: 'core_contract_radar',
      label: '核心承诺雷达',
      path: 'writing_bible.core_contract_radar',
      reason: 'writing_bible.core_contract_radar 缺失或偏薄',
    }],
    [!hasContract(bible.target_reader_contract), {
      key: 'target_reader_contract',
      label: '目标读者契约',
      path: 'writing_bible.target_reader_contract',
      reason: 'writing_bible.target_reader_contract 缺失或偏薄',
    }],
    [!hasContract(bible.character_design_contract), {
      key: 'character_design_contract',
      label: '角色设计合同',
      path: 'writing_bible.character_design_contract',
      reason: 'writing_bible.character_design_contract 缺失或偏薄',
    }],
    [!hasContract(bible.longform_structure_contract), {
      key: 'longform_structure_contract',
      label: '长篇结构合同',
      path: 'writing_bible.longform_structure_contract',
      reason: 'writing_bible.longform_structure_contract 缺失或偏薄',
    }],
    [!hasContract(bible.plot_special_topics_contract), {
      key: 'plot_special_topics_contract',
      label: '情节专题合同',
      path: 'writing_bible.plot_special_topics_contract',
      reason: 'writing_bible.plot_special_topics_contract 缺失或偏薄',
    }],
    [!hasContract(bible.genre_positioning_contract) && !firstText(root.genre), {
      key: 'genre_positioning_contract',
      label: '题材定位合同',
      path: 'writing_bible.genre_positioning_contract',
      reason: '题材定位合同缺失',
    }],
    [asArray(root.characters).length < 3, {
      key: 'characters',
      label: '关键人物阵容',
      path: 'characters',
      reason: `当前人物 ${asArray(root.characters).length} 人，至少需要 3 人`,
    }],
    [!hasAntagonist(root), {
      key: 'antagonist',
      label: '主要对手',
      path: 'antagonist',
      reason: '缺少主要对手 / antagonist_primary',
    }],
    [!firstText(commercial.reader_promise, root.reader_promise, root.logline), {
      key: 'reader_promise',
      label: '读者承诺',
      path: 'commercial_positioning.reader_promise',
      reason: '缺少读者承诺',
    }],
    [asArray(commercial.selling_points).length === 0 && !firstText(root.core_selling_point, root.hook), {
      key: 'selling_points',
      label: '核心卖点',
      path: 'commercial_positioning.selling_points',
      reason: '缺少核心卖点',
    }],
    [!firstText(world.world_summary, world.summary), {
      key: 'world_summary',
      label: '世界观摘要',
      path: 'worldbuilding.world_summary',
      reason: '世界观摘要偏薄',
    }],
    [!firstText(world.power_system), {
      key: 'power_system',
      label: '力量/规则体系',
      path: 'worldbuilding.power_system',
      reason: '力量/规则体系偏薄',
    }],
    [!firstText(plot.mainline_goal, root.mainline_goal), {
      key: 'mainline_goal',
      label: '长篇主线目标',
      path: 'plot_engine.mainline_goal',
      reason: '缺少长篇主线目标',
    }],
    [!firstText(plot.long_term_conflict, root.long_term_conflict, root.main_conflict), {
      key: 'long_term_conflict',
      label: '长线冲突引擎',
      path: 'plot_engine.long_term_conflict',
      reason: '缺少长线冲突引擎',
    }],
    [asArray(root.foreshadowing_plan).length === 0, {
      key: 'foreshadowing_plan',
      label: '伏笔计划',
      path: 'foreshadowing_plan',
      reason: '伏笔计划为空',
    }],
  ]

  for (const [missing, target] of autoChecks) {
    if (missing) pushUniqueTarget(targets, target)
  }

  for (const hint of hints.map(item => String(item || '').trim()).filter(Boolean)) {
    for (const rule of LABEL_TO_TARGET) {
      if (rule.match.test(hint)) {
        pushUniqueTarget(targets, { ...rule.target, reason: `评分缺口：${hint}` })
      }
    }
  }

  return targets
}

function compactJson(value: any, max = 18000) {
  try {
    const text = JSON.stringify(value, null, 2)
    return text.length > max ? `${text.slice(0, max)}\n/* truncated */` : text
  } catch {
    return '{}'
  }
}

