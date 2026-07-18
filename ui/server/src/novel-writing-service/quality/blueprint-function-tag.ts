export function inferBlueprintFunctionTag(scene: any, index: number, total: number) {
  if (index === 0 && scene?.opening_hook) return '开篇钩子/铺垫'
  if (scene?.ending_hook_seed || index === total - 1) return '章尾钩子/承接'
  if (scene?.reversal || scene?.turning_point) return '转折/反转'
  if (scene?.reader_payoff) return '爽点/回报'
  if (scene?.information_gap) return '信息差/悬念'
  return '推进/过场'
}
