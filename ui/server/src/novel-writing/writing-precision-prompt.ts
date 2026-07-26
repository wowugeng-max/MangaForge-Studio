/**
 * Generation-time precision constraints (oh-story aligned).
 * Goal: make the model hit progress/word/line/de-AI targets on first draft,
 * not rely on post-hoc hard gates that only raise reject rate.
 */
import { asArray } from '../routes/novel-route-utils'
import { buildOutlineWordBudget } from './outline-word-budget'
import {
  buildChapterProgressBudget,
  formatChapterProgressBudgetPrompt,
  type ChapterProgressBudgetReport,
} from './chapter-progress-budget'
import type { ChapterWordTarget } from './word-target'
import {
  buildModelFamilyStrategy,
  formatModelFamilySceneCardPrompt,
  formatModelFamilyStrategyPrompt,
  modelFamilyFromContextPackage,
  type ModelFamilyStrategy,
  type ModelRuntimeIdentity,
} from './model-family-strategy'
import {
  attachPovLensesToSceneCards,
  compileChapterPovPlan,
  formatCharacterPovPrompt,
  formatSceneCardPovPrompt,
  type ChapterPovPlan,
} from './character-pov'

function compactText(value: any, limit = 200) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

function uniqueTexts(values: any[], limit = 12) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of values) {
    const text = compactText(raw, 160)
    if (!text) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(text)
    if (out.length >= limit) break
  }
  return out
}

function sceneCardsOf(contextPackage: any) {
  return asArray(
    contextPackage?.scene_cards
    || contextPackage?.sceneCards
    || contextPackage?.chapter_target?.scene_cards
    || contextPackage?.chapterTarget?.scene_cards,
  )
}

function planBeatsFromContext(contextPackage: any, chapterDraft: any = null) {
  const target = contextPackage?.chapter_target || contextPackage?.chapterTarget || {}
  const draft = chapterDraft || {}
  const raw = draft?.raw_payload || draft?.rawPayload || target?.raw_payload || {}
  return uniqueTexts([
    target.goal || target.chapter_goal || draft.chapter_goal || draft.goal,
    target.summary || target.chapter_summary || draft.chapter_summary || draft.summary,
    target.conflict || draft.conflict,
    target.ending_hook || draft.ending_hook,
    ...asArray(target.must_advance || raw.must_advance || draft.must_advance),
  ], 10)
}


function emotionContextHints(contextPackage: any, chapterDraft: any = null) {
  const target = contextPackage?.chapter_target || contextPackage?.chapterTarget || {}
  const draft = chapterDraft || {}
  const raw = draft?.raw_payload || draft?.rawPayload || target?.raw_payload || {}
  const emotional = target?.emotional_arc_contract
    || target?.emotionalArcContract
    || contextPackage?.emotional_arc_contract
    || contextPackage?.emotionalArcContract
    || {}
  const hints = uniqueTexts([
    target.emotion || target.core_emotion || target.coreEmotion,
    target.reader_payoff || target.readerPayoff,
    emotional?.chapter_emotion || emotional?.chapterEmotion || emotional?.core_emotion || emotional?.coreEmotion,
    emotional?.target_emotion || emotional?.targetEmotion,
    ...asArray(emotional?.emotion_flow || emotional?.emotionFlow),
    ...asArray(emotional?.beats || emotional?.stages).map((item: any) => item?.emotion || item?.label || item?.stage || item),
    draft.emotion,
    raw.emotion,
    // derive soft hint from conflict/goal text, not hard-coded genre emotions
    compactText(target.conflict || draft.conflict, 80),
    compactText(target.goal || target.chapter_goal || draft.chapter_goal || draft.goal, 80),
  ], 8)
  return hints
}

function allocateSceneWordBudgets(sceneCount: number, wordTarget: ChapterWordTarget | null | undefined) {
  const target = Number(wordTarget?.target || 4200)
  const n = Math.max(1, sceneCount || 3)
  // Opening 18% / middle 54% / ending 28% for mobile web pacing
  const weights = n === 1
    ? [1]
    : n === 2
      ? [0.42, 0.58]
      : n === 3
        ? [0.18, 0.54, 0.28]
        : Array.from({ length: n }, (_, index) => {
          if (index === 0) return 0.16
          if (index === n - 1) return 0.24
          return 0.6 / Math.max(1, n - 2)
        })
  const sumWeight = weights.reduce((a, b) => a + b, 0) || 1
  const rows = weights.map((weight, index) => {
    const sceneTarget = Math.round(target * (weight / sumWeight))
    return {
      scene_no: index + 1,
      target: sceneTarget,
      min: Math.max(120, Math.round(sceneTarget * 0.9)),
      max: Math.round(sceneTarget * 1.12),
    }
  })
  // Fix rounding drift on the last scene so sum ~= chapter target.
  const sum = rows.reduce((acc, item) => acc + item.target, 0)
  if (rows.length) {
    rows[rows.length - 1].target += (target - sum)
    rows[rows.length - 1].min = Math.max(120, Math.round(rows[rows.length - 1].target * 0.9))
    rows[rows.length - 1].max = Math.round(rows[rows.length - 1].target * 1.12)
  }
  return rows
}

export function buildWritingPrecisionPlan(input: {
  contextPackage?: any
  chapterDraft?: any
  wordTarget?: ChapterWordTarget | null
  modelRuntime?: ModelRuntimeIdentity | string | null
  modelFamilyStrategy?: ModelFamilyStrategy | null
} = {}) {
  const contextPackage = input.contextPackage || {}
  const chapterDraft = input.chapterDraft || contextPackage?.chapter || null
  const wordTarget = input.wordTarget
    || contextPackage?.chapter_target?.word_target
    || contextPackage?.chapterTarget?.word_target
    || null
  const modelFamilyStrategy = input.modelFamilyStrategy
    || (input.modelRuntime ? buildModelFamilyStrategy(input.modelRuntime) : null)
    || modelFamilyFromContextPackage(contextPackage)
  const scenes = sceneCardsOf(contextPackage)
  const planBeats = planBeatsFromContext(contextPackage, chapterDraft)
  const progressBudget = buildChapterProgressBudget({
    chapterText: '',
    currentChapter: chapterDraft || contextPackage?.chapter_target,
    currentPlan: {
      goal: contextPackage?.chapter_target?.goal || contextPackage?.chapter_target?.chapter_goal || chapterDraft?.chapter_goal,
      summary: contextPackage?.chapter_target?.summary || chapterDraft?.summary,
      conflict: contextPackage?.chapter_target?.conflict || chapterDraft?.conflict,
      ending_hook: contextPackage?.chapter_target?.ending_hook || chapterDraft?.ending_hook,
      must_advance: contextPackage?.chapter_target?.must_advance || chapterDraft?.must_advance || chapterDraft?.raw_payload?.must_advance,
    },
    futureChapters: contextPackage?.future_chapters || contextPackage?.futureChapters || [],
    chapters: contextPackage?.chapters || [],
    storyUnitRole: contextPackage?.story_unit_context?.current_chapter_role || contextPackage?.storyUnitContext?.current_chapter_role,
  })
  const outlineBudget = buildOutlineWordBudget({
    chapter_word_target: Number(wordTarget?.target || 4200),
    plot_points: planBeats.length
      ? planBeats.map((beat, index) => ({
        id: `beat_${index + 1}`,
        label: beat,
        density_level: index === 0
          ? 'medium'
          : index === planBeats.length - 1
            ? 'medium'
            : /高潮|打脸|反转|对决|镇压|击破|揭晓/.test(beat) ? 'dense' : 'medium',
      }))
      : undefined,
  })
  const sceneWordBudgets = allocateSceneWordBudgets(scenes.length || outlineBudget.points.length || 3, wordTarget)
  const emotion_hints = emotionContextHints(contextPackage, chapterDraft)
  const pov_plan = compileChapterPovPlan(contextPackage, { chapterDraft, modelFamilyStrategy }) as ChapterPovPlan
  const scene_cards_with_pov = attachPovLensesToSceneCards(scenes, pov_plan)
  return {
    version: 'writing_precision_plan_v1',
    word_target: wordTarget,
    progress_budget: progressBudget as ChapterProgressBudgetReport,
    outline_word_budget: outlineBudget,
    scene_word_budgets: sceneWordBudgets,
    plan_beats: planBeats,
    emotion_hints,
    model_family_strategy: modelFamilyStrategy,
    pov_plan,
    scene_cards_with_pov,
  }
}

/** Positive, operational generation constraints — not gate language. */
export function formatWritingPrecisionPrompt(plan: ReturnType<typeof buildWritingPrecisionPlan> | null | undefined) {
  if (!plan) return [] as string[]
  const wt = plan.word_target || { target: 4200, min: 3780, max: 4620, label: '标准章', rangeText: '3780-4620 字' }
  const sceneBudgetLines = plan.scene_word_budgets
    .map((item: any) => `场景${item.scene_no}：约 ${item.target} 字（${item.min}-${item.max}）`)
    .join('；')
  const beatBudgetLines = asArray(plan.outline_word_budget?.points)
    .slice(0, 8)
    .map((item: any) => `${item.label} → ${item.word_budget}字/${item.density_level || 'medium'}`)
    .join('；')

  return [
    '【写前精密度约束 · 一次写准，不要靠事后门禁碰运气】',
    '',
    '一、进度窗口（先定写什么，再动笔）',
    ...formatChapterProgressBudgetPrompt(plan.progress_budget),
    plan.plan_beats.length ? `本章只交付这些可见结果：${plan.plan_beats.slice(0, 6).join('｜')}` : '',
    '写法：每个交付点写成“动作/对话 + 阻力 + 选择/代价 + 结果变化”；章末最多抛出下一章钩子，不得把后续章结算写完。',
    '字数不够时，深化当前交付点的过程与交锋；禁止跳到后续大纲情节凑篇幅。',
    '字数超了时，先删超纲结算、重复解释和环境水文，再删同义反复；不要靠删掉本章必须交付点压字数。',
    '',
    '二、字数精控（场景预算先分配，再写作；宁稳不准短）',
    `全章硬目标：${wt.target} 字，落点范围 ${wt.min}-${wt.max} 字（${wt.label || '标准章'}）。计数=去掉空白后的字符。`,
    `硬下限提醒：成品不得低于 ${wt.min} 字。若你习惯写短，请把每个 dense 场景再拆 2-3 个动作回合，而不是提前收束。`,
    `硬上限提醒：成品不得高于 ${wt.max} 字。禁止写到 1.3 倍以上再指望事后压缩；scene_chunk 拼接后若接近上限就停，删 sparse 过场与重复确认，不要继续补景。`,
    sceneBudgetLines ? `场景字数分配：${sceneBudgetLines}` : '',
    beatBudgetLines ? `情节点字数分配：${beatBudgetLines}` : '',
    '写作中自检：写完第1个场景后约到目标18%-25%；写到中段应到45%-60%；写完前落在下限-上限内。偏短就补“动作回合=出手/反制/代价/新信息”；偏长先砍重复检查/讲义/环境，不要补散文。',
    'dense 点至少写：规则压力可见、主角一次试探、对手/怪谈一次反击、主角付出代价或获得证据、对话交锋 3 轮以上。',
    ...formatModelFamilyStrategyPrompt(plan.model_family_strategy),
    plan.model_family_strategy?.write_mode === 'scene_chunk_stitch'
      ? '执行方式：优先按场景卡分场景写再拼接；每个场景贴近 word_budget（允许±12%），禁止单场景写成预算的1.5倍；拼接后整章必须落在章上限内，不要一次写爆再靠整章压缩。'
      : '执行方式：可整章一次输出，但必须按场景预算内部推进并自检落点；不要平均注水，也不要写到一半跳章末。',
    '若单次输出明显短于场景预算，不要提前收束：继续补本场景动作回合，直到达到预算下限；若已超过场景 max，立刻停写该场景并进入下一场景。',
    'sparse 点 1-2 句带过。禁止均匀注水，也禁止平均用力。禁止写到一半就跳到章末。',
    '',
    '三、网文分行（手机阅读默认格式）',
    '默认一句一段；对话独立成段；同一镜头里完整推理/情绪链最多 2 句同段。',
    '好例：',
    '他推开门。',
    '走廊里只有应急灯在闪。',
    '"谁？"',
    '没人应。',
    '坏例：他推开门，走廊里只有应急灯在闪，他问了一句谁，却没人应，心里忽然发紧，仿佛有什么东西正盯着他。',
    '禁止：一段塞 3 句以上；90 字以上墙文；无句号提纲残片；把发生/感知/反应拆成三行空诗。',
    '',
    '四、文字情绪（强制硬约束 · 人必须在场，且必须贴合本章剧情）',
    '本章不是事件流水线。dense 场景与关键推进段必须让“这个处境下的这个人”在场，而不是只完成正确动作。',
    '情绪来源（先定再写，禁止套用万能情绪清单）：',
    plan.emotion_hints?.length
      ? `本章情绪线索（仅作推导，不可照抄标签）：${plan.emotion_hints.slice(0, 6).join('｜')}`
      : '本章未给出单独情绪字段时，必须从 goal/conflict/ending_hook 与角色处境自行推导，不得空写。',
    '1) 从本章 goal/conflict/ending_hook、角色身份与关系、当前压力源推导“此刻该有什么情绪”；',
    '2) 情绪必须服务本章剧情功能（压迫、试探、心动、愤怒、羞辱、侥幸、后悔、算计、期待等以本章为准）；',
    '3) 不同角色情绪不同；同一角色前后也可变化，但变化要有现场触发。',
    '落地方式（强制，仍一句一段）：',
    '1) 场内交付：用可见动作、短对白、身体细节、物件反应写出情绪，禁止只贴标签（沉重/复杂/五味杂陈/无法言喻）；',
    '2) 私心可有，但必须来自角色在本章的真实利害（名声、生死、面子、金钱、关系、任务），不要写成固定“嫌麻烦模板”；',
    '3) 允许半拍人味停顿（愣、改口、多看一眼、先做一件多余的小事），但不得拖垮本章必须交付点。',
    '对白漏情绪：关键信息尽量从角色嘴里半截说出，口气符合身份、关系和当下处境；禁止全员同一种冷静旁白腔。',
    '坏例：情节推进正确，但角色像工具人，换到任何书都一样的空情绪。',
    '好例：情绪具体到“此刻这个人在这个冲突里会怎么反应”，读者不看标签也知道他在怕什么/要什么/咽下了什么。',
    '禁止：用解释句代替情绪（“这意味着”“他意识到”）；用跨题材万能反应串硬套本章。',
    '',
    '五、去AI味（怎么说，不改说什么）',
    '正例锚点：短动作、具体物件、口语对白、可见代价、自然虚词（的/了/就/但是/已经/之后/没有）。',
    '反例禁写：仿佛/犹如/一丝/一抹/淡淡/冰冷/缓缓/深吸一口气/眼中闪过/嘴角勾起/不是A而是B/没有A没有B没有C/与此同时/更为重要的是/他感到/他意识到/这一刻他终于明白/更大的风暴/这就是线索/无法言喻/无法抑制地。',
    '标点：正文不要用 …… 和 ——；犹豫改动作停顿或短句；门声、提示音写成“叮”或“门响了”即可。',
    '怪谈外形不要写成“没有眼睛，没有鼻子，没有嘴”的否定排比；改成一个具体畸形细节+角色当场反应。',
    '改法：删总结与标签，改成角色当场能做、能说、能碰到的事；能改一个词就不重写一句，能删一句就不重写一段。',
    '章尾用未解决动作、新信息或现场风险收束，不要作者预告、哲理升华，也不要旁白宣布“这就是XX线索”。',
    '',
    '',
    ...formatCharacterPovPrompt(plan.pov_plan),
    '',
    '交稿前心中过一遍：进度只在本窗口？字数是否已到硬下限以上？是否一句一段？是否锁在角色视角？情绪是否由 want/fear/private_bias 驱动选择？是否还有 AI 套话/解释腔/禁用标点？任一否，先自改再输出。',
  ].filter(Boolean)
}

export function formatSceneCardPrecisionPrompt(plan: ReturnType<typeof buildWritingPrecisionPlan> | null | undefined) {
  if (!plan) return [] as string[]
  const wt = plan.word_target || { target: 4200, min: 3780, max: 4620 }
  const beatLines = asArray(plan.outline_word_budget?.points)
    .slice(0, 8)
    .map((item: any, index: number) => `${index + 1}. ${item.label}｜预算${item.word_budget}｜密度${item.density_level}`)
  return [
    '【场景卡精密度要求】',
    `本章字数目标 ${wt.target}（${wt.min}-${wt.max}）。场景卡必须先切开进度窗口和字数预算，再交给正文。`,
    '每张场景卡必须写清：scene_goal（只属于本章）、must_deliver（可见结果）、forbidden_future_settle（禁止提前结算的后续点）、word_budget、density(dense/medium/sparse)、end_hook_or_handoff。',
    '情绪强制字段：每个 dense/medium 场景必须写 emotion_in_situation（贴合本章冲突与角色处境的当场情绪）与 emotion_tell（动作/对白/身体细节如何交付），禁止空标签，也禁止套用与本章无关的万能情绪。',
    ...formatSceneCardPovPrompt(plan.pov_plan),
    '场景数建议 3-5；各场景 word_budget 之和应接近章目标，dense 场景承担爽点/交锋并带本章应得情绪落点，sparse 只作过场。',
    plan.progress_budget?.future_plan_beats?.length
      ? `后续章禁止在场景卡里安排结算：${plan.progress_budget.future_plan_beats.slice(0, 5).join('｜')}`
      : '不得把后续章高潮、身份揭晓、终局底牌排进本章场景卡。',
    beatLines.length ? `本章交付点预算：\n${beatLines.join('\n')}` : '',
    ...formatModelFamilySceneCardPrompt(plan.model_family_strategy),
    '场景卡不要写完整正文；但每个 must_deliver 必须能在正文里被动作/对话证据验证。',
  ].filter(Boolean)
}
