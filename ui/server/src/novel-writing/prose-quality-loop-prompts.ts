import { buildWebnovelRevisePersonaBlock } from './webnovel-author-personas'
import { buildHumanizeDualPassPromptBlock } from './humanize-dual-pass'
import {
  REQUIRED_QUALITY_DIMENSIONS,
  compactQualityText,
  isFiniteQualityNumericValue,
} from './prose-quality-loop-core'
import type { ProseQualityFinding } from './prose-quality-loop-core'

export function buildFocusedProseReviewPrompt(input: {
  coreContract: any
  chapterText: string
  deterministicScan: any
}) {
  return [
    '任务：独立审查小说正文，只判断正文证据，不评价回执是否齐全。',
    `六维：${REQUIRED_QUALITY_DIMENSIONS.join('；')}。`,
    '分制合同：总体分 score 必须使用 0-100 分制，并固定输出 score_scale="0-100"；六个维度分别使用 0-10 分制。不得使用 5 分制或把维度平均值直接写入 score。',
    'S1/S2 必须引用正文中的可定位短句；没有证据只能给 S3 advisory。',
    '确定性扫描标为 advisory 或 status=warn 的词句只保留风格诊断；同一词句已被代码判为 advisory 时，不得仅凭同一词句命中升级为 S1/S2，最多给 S3。',
    '最多 6 个 blocking findings、4 个 advisory findings。分数不能覆盖硬失败。',
    `不可变核心合同：${JSON.stringify(input.coreContract || {}, null, 2)}`,
    `确定性扫描：${JSON.stringify(input.deterministicScan || {}, null, 2)}`,
    `正文：\n${String(input.chapterText || '')}`,
    '只输出 JSON：{"score":0,"score_scale":"0-100","publishable":false,"dimensions":{"continuity":0,"core_promise_agency":0,"conflict_causality":0,"payoff_hook":0,"prose_style":0,"fact_setting_safety":0},"findings":[{"key":"","severity":"S1|S2|S3","dimension":"","evidence":"正文短句","required_change":"可执行改法","acceptance_test":"复检条件"}]}',
  ].join('\n')
}

export function buildFocusedProseRevisionPrompt(input: {
  coreContract: any
  chapterText: string
  blockingFindings: ProseQualityFinding[]
  round: number
  project?: any
}) {
  return [
    buildWebnovelRevisePersonaBlock(input.project || null),
    `任务：执行第 ${input.round} 轮正文定向修订，返回完整章节正文。`,
    '只修复列出的 blocking findings；保留已经通过的维度、既有事实、角色状态、场景顺序和章末承诺。',
    '若 finding key 以 hw_ 开头：这是系统抗检测硬门禁。只改命中句段，禁止整章重写、禁止把全文改成几乎 100% 一句一段、禁止删对白回合。',
    'hw_ 修订验收：删除/改写流程讲义、命运名册宣判、临床连击、宇宙总结；保留短对白、物件核对与章末可见动作；双句密段不要清零。',
    '若 finding 含 clinical/cascade/procedure：全文清扫“生物学死亡/临床死亡/死亡体征/死亡生理学/基础生理学规律/尸僵未形成/尸斑未见/心电图拉直线/质控/停职审查”；每处改成触感动作+半截私心，禁止换一个同义词讲义。',
    '若 finding 含 identity/ticket/fate/roster：全文清扫“拼音缩写/姓名缩写/L.X./写着自己编号的纸片/下一次交割预定/扣减凭证对号”；改成看不清的字/湿纸角+立刻藏证/改口，禁止对号入座升华。',
    '【指纹全链路守恒 · 修订阶段】无论是否 hw_ finding，都必须保持人工网文指纹：短对白独立成段、物件核对链、不对称私心噪声、双句密段混排；禁止为“更整齐/更文学”抹平纹理；禁止新增命运宣判/流程讲义/临床连击。',
    buildHumanizeDualPassPromptBlock({ pass: 'AB', project: input.project }),
    '若 finding key 含 hw_symmetric_ / 多物同构 / 同一读数：删掉并列同构（一模一样/依然是/同样印着），只留一件可核对物件+立刻私心动作；禁止三连同构盘点。',
    '若 finding key 含 hw_opening_probe_cascade：开篇500字验证族连击。只保留1次触诊/听诊/读数中的一种，其余后移；开篇立刻补半截私心+短对白/物件动作，禁止 instrument+numeric+auscult 三连。',
    '若 finding key 含 hw_opening_prop_inventory：开篇道具展柜。前220字改为角色目标/私心或短对白起手；道具最多1个立刻接动作，删掉三连感官清单。',
    '若 finding key 含 hw_semi_science_lecture / 按理说 / 一个人只要就会：删半科普因果讲义，只留一次触感+立刻动作/私心。',
    '若 finding key 含 hw_private_noise_declaration：私心声明外挂。把“先不上报/谁背锅”并进当前动作句，禁止单独成段声明。',
    '若 finding key 含 hw_ending_movie_cadence / 铁锁 / 横栓 / 咔哒：章末删机械落锁；改未完成动作或半截对白打断。',
    '若 finding key 含 hw_multi_body / 同样的测试 / 同样的停摆：第2/3对象禁止复用第1对象动作链，只留一个差异触感。',
    '若 finding key 含 hw_coincidence_omniscience / 不是巧合 / 对方知道：删全知巧合判决；只留半截物件细节+立刻私行（藏/按/改口）。',
    '若 finding key 含 hw_inventory / 遗物 / 香烟 / 收据流水线：全章只展开1件证据立刻藏证，删第2/3具翻袋盘点。',
    '若 finding key 含 hw_ending_procedure_debate / 全面检测 / 违反规程 / 算我的：章末改未完成私行动作或半截对白打断，禁止程序辩论收束。',
    '若 finding key 含 hw_positive_ / hw_missing_mid_ / hw_mess_dialogue_：这是正向人工指纹硬缺口。修订必须主动补纹理，不得只做删句：①每 350–500 字补半截私心噪声并立刻接动作；②补短对白独立成段（推责/口误）；③补物件阻力触感；④把过高的“他/她”起句改成物件/触感/对白起句。禁止整章重写，禁止抹平双句密段。',
    '私心噪声必须“同功能不同句”：每处换不同脏情绪/身体反应/半拍耽误，禁止复制粘贴同一句私心噪声，禁止连续多段出现完全相同的句子；私心必须挂在动作上，禁止外挂声明句。',
    '正向指纹验收：修订后私心噪声最大间距 ≤500 字、物件阻力 ≥3、对白段占比 ≥0.12、“他/她”起句 ≤0.30；缺一项视为本轮未完成。',
    '修订完成后必须对修订后全文重新扫描，不得只检查 finding 原句；不得新增小写英文粘连词、工程词或非中文正文。',
    '全文残留自检：不得留下“微微鼓胀”“没有一丝多余”“缓缓收回”“轻轻敲击”“犹如实质的毒液”这类已知修订残留；改成具体动作、事实或后果。',
    '不得输出审查说明、工程附录、Markdown 标题或下一章。',
    `不可变核心合同：${JSON.stringify(input.coreContract || {}, null, 2)}`,
    `blocking findings：${JSON.stringify((input.blockingFindings || []).slice(0, 6), null, 2)}`,
    `当前完整正文：\n${String(input.chapterText || '')}`,
    '只输出 JSON：{"chapter_text":"完整修订正文","revision_receipts":[{"key":"finding key","changed_evidence":"修后正文短句"}]}',
  ].join('\n')
}


export function isUsableProseQualityReviewPayload(value: any) {
  if (!value || typeof value !== 'object' || !isFiniteQualityNumericValue(value.score)) return false
  const score = Number(value.score)
  const scoreScale = compactQualityText(value.score_scale ?? value.scoreScale, 20)
  if (score < 0 || score > 100) return false
  if (scoreScale && scoreScale !== '0-100') return false
  if (!scoreScale && score > 0 && score <= 10) return false
  const dimensions = value.dimensions
  return Boolean(
    dimensions
      && typeof dimensions === 'object'
      && REQUIRED_QUALITY_DIMENSIONS.every(key => {
        if (!isFiniteQualityNumericValue(dimensions[key])) return false
        const dimensionScore = Number(dimensions[key])
        return Number.isFinite(dimensionScore) && dimensionScore >= 0 && dimensionScore <= 10
      }),
  )
}

