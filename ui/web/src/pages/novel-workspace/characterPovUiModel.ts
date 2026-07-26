export type CharacterPovUiScene = {
  sceneNo: number
  povCharacter: string
  decisionInScene: string
  wantNow: string
  fearOrCostNow: string
}

export type CharacterPovUiViolation = {
  key: string
  label: string
  evidence: string
  fix: string
}

export type CharacterPovUiModel = {
  primaryPov: string
  povIntensity: string
  multiPovLocked: boolean
  allowedSecondaryPovs: string[]
  knowledgePreview: string[]
  secondaryCutPreview: string[]
  assetFirewallPreview: string[]
  dialogueFilterPreview: string[]
  scenes: CharacterPovUiScene[]
  statusLabel: string
  status: 'ok' | 'warn' | 'fail' | 'empty'
  violations: CharacterPovUiViolation[]
}

function text(value: any, fallback = '') {
  const out = String(value ?? '').replace(/\s+/g, ' ').trim()
  return out || fallback
}

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value == null || value === '') return []
  return [value]
}

export function buildCharacterPovUiModel(input: {
  sceneCards?: Array<Record<string, any>>
  characters?: any[]
  qualityFindings?: any[]
  chapterText?: string
  primaryPovHint?: string
  povIntensity?: string
  multiPovLocked?: boolean
} = {}): CharacterPovUiModel | null {
  const scenes = asArray(input.sceneCards).map((scene, index) => ({
    sceneNo: Number(scene.sceneNo || scene.scene_no || index + 1) || index + 1,
    povCharacter: text(
      scene.povCharacter
      || scene.pov_character
      || scene.pov_lens?.pov_character
      || scene.povLens?.pov_character,
    ),
    decisionInScene: text(
      scene.decisionInScene
      || scene.decision_in_scene
      || scene.pov_lens?.decision_in_scene
      || scene.povLens?.decision_in_scene,
    ),
    wantNow: text(scene.wantNow || scene.want_now || scene.pov_lens?.want_now || scene.povLens?.want_now),
    fearOrCostNow: text(
      scene.fearOrCostNow
      || scene.fear_or_cost_now
      || scene.pov_lens?.fear_or_cost_now
      || scene.povLens?.fear_or_cost_now,
    ),
  }))

  const protagonist = asArray(input.characters).find((item) => (
    /protagonist|主角/.test(String(item?.role_type || item?.role || ''))
  ))
  const primaryPov = text(
    input.primaryPovHint
    || scenes.find((item) => item.povCharacter)?.povCharacter
    || protagonist?.name
    || asArray(input.characters)[0]?.name,
  )

  const secondary = Array.from(new Set(
    scenes.map((item) => item.povCharacter).filter((name) => name && name !== primaryPov),
  ))

  const knowledgePreview = asArray(input.characters)
    .filter((item) => !primaryPov || text(item?.name) === primaryPov || secondary.includes(text(item?.name)))
    .slice(0, 3)
    .flatMap((item) => {
      const state = item?.current_state || item?.currentState || {}
      const ledger = state.knowledge_ledger || state.knowledgeLedger || {}
      const known = asArray(ledger.known || state.knowledge_now || state.knowledgeNow).slice(0, 2).map(text).filter(Boolean)
      const mis = asArray(ledger.misbeliefs || state.misbeliefs).slice(0, 1).map(text).filter(Boolean)
      const rows: string[] = []
      if (known.length) rows.push(`${text(item?.name)}已知：${known.join('｜')}`)
      if (mis.length) rows.push(`${text(item?.name)}误信：${mis.join('｜')}`)
      return rows
    })
    .slice(0, 4)

  const violations: CharacterPovUiViolation[] = asArray(input.qualityFindings)
    .filter((item) => {
      if (item == null || item === '') return false
      if (typeof item === 'string') {
        return /角色视角|全知|解释腔|未授权视角|作者解释|pov_|视角/.test(item)
      }
      return (
        String(item?.key || item?.pattern || item?.code || '').startsWith('pov_')
        || /角色视角|全知|解释腔|未授权视角|作者解释|视角/.test(String(
          item?.label || item?.message || item?.key || item?.code || item?.check || '',
        ))
      )
    })
    .slice(0, 8)
    .map((item) => {
      if (typeof item === 'string') {
        return {
          key: 'pov_quality',
          label: '视角问题',
          evidence: text(item),
          fix: '回到主视角可感知证据与选择',
        }
      }
      return {
        key: text(item?.key || item?.pattern || item?.code, 'pov'),
        label: text(item?.label || item?.key || item?.code, '视角问题'),
        evidence: text(item?.evidence || item?.matched_text || item?.message || item?.detail),
        fix: text(item?.fix || item?.repair_instruction || item?.action),
      }
    })

  if (!violations.length && input.chapterText) {
    const body = String(input.chapterText)
    if (/这意味着|这说明|科学的逻辑/.test(body)) {
      violations.push({
        key: 'pov_author_explain',
        label: '作者解释腔',
        evidence: '正文含“这意味着/这说明/科学的逻辑”',
        fix: '改成角色误判、追问或当场选择',
      })
    }
    if (/他不知道的是|她不知道的是|读者可以看到/.test(body)) {
      violations.push({
        key: 'pov_omniscient_leak',
        label: '全知泄漏',
        evidence: '正文含全知旁白',
        fix: '回到主视角可感知证据',
      })
    }
  }

  if (!primaryPov && !scenes.length && !violations.length) return null

  const missingDecision = scenes.filter((item) => !item.decisionInScene).length
  const status: CharacterPovUiModel['status'] = violations.some((item) => /fail|解释|全知|未授权|dialogue_mind|asset_firewall|secondary_cut_overstay|对白后|禁揭/.test(item.key + item.label))
    ? 'fail'
    : violations.length || missingDecision > 0
      ? 'warn'
      : primaryPov
        ? 'ok'
        : 'empty'

  const intensity = text(input.povIntensity, 'standard') || 'standard'
  const multiPovLocked = input.multiPovLocked !== false
  const secondaryCutPreview = asArray(input.sceneCards)
    .map((scene) => {
      const cut = scene?.secondary_cut || scene?.secondaryCut || scene?.pov_lens?.secondary_cut || scene?.povLens?.secondary_cut
      if (!cut) return ''
      const name = text(cut.character || cut.pov_character || cut.name)
      const maxLines = Number(cut.max_lines || cut.maxLines || 3) || 3
      return name ? `短切 ${name}≤${maxLines}行` : ''
    })
    .filter(Boolean)
    .slice(0, 4)
  const assetFirewallPreview = asArray(input.sceneCards)
    .flatMap((scene) => [
      ...asArray(scene?.forbidden_settings || scene?.forbiddenSettings || scene?.pov_lens?.asset_bound_unknown).map((item) => `禁揭：${text(item)}`),
      ...asArray(scene?.used_settings || scene?.usedSettings || scene?.pov_lens?.asset_bound_knows).map((item) => `可知：${text(item)}`),
    ])
    .filter(Boolean)
    .slice(0, 4)
  const dialogueFilterPreview = violations
    .filter((item) => /dialogue|对白/.test(item.key + item.label))
    .map((item) => item.label + (item.evidence ? `：${item.evidence}` : ''))
    .slice(0, 3)
  return {
    primaryPov: primaryPov || '未定',
    povIntensity: intensity,
    multiPovLocked,
    allowedSecondaryPovs: secondary,
    knowledgePreview,
    secondaryCutPreview,
    assetFirewallPreview,
    dialogueFilterPreview,
    scenes: scenes.filter((item) => item.povCharacter || item.decisionInScene || item.wantNow),
    statusLabel: status === 'fail'
      ? '视角违规'
      : status === 'warn'
        ? (missingDecision > 0 ? `视角待补选择 ${missingDecision}` : '视角待优化')
        : primaryPov
          ? `视角 · ${primaryPov}`
          : '视角未定',
    status,
    violations,
  }
}
