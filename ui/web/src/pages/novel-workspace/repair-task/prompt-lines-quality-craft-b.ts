import type { AnyRecord } from './utils'
import {
  firstText,
  arrayValue,
  objectValue,
} from './utils'
import {
  summarizeEvidenceItem,
} from './support'

export function appendRepairTaskQualitySyncPromptLinesCraftB(lines: string[], ctx: Record<string, any>) {
  const {
    chapterProgressionSync,
    chapterStructureSync,
    contentRubricSync,
    continuityHeatSync,
    coreContractCheckSync,
    deslopRepairCheckSync,
    femaleAudienceSync,
    genrePositioningSync,
    informationLoadSync,
    longformContinuitySync,
    openingSync,
    proseCraftSync,
    proseMetaSync,
    punctuationToneSync,
    revisionReceiptCheckSync,
    targetReaderSync,
    upgradeRhythmSync,
  } = ctx

  if (openingSync) {
    const missed = arrayValue(openingSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(openingSync.next_actions || openingSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【开篇设计修复】',
      firstText(openingSync.label) ? `开篇结论：${firstText(openingSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 opening_checks 修复开篇设计，重做300字内主角登场、1000字内爽点/期待点、三大基点、开头五要诀（简单、不偏、快、爽、不平）、主角目标与本文卖点和信息分批释放。',
      '正文要求：第一屏不要大段背景、天气风景、序章楔子或详细世界观；直接让主角进入有目标、有压力、有可见变化的现场，并尽快给出读者继续看的危机、爽点、问题或回报承诺。',
      '输出要求：必须返回 opening_checks，不能只写自然语言开篇已优化。',
      'opening_checks 每项必须包含 key, label, status, protagonist_entry, first_300_goal, first_1000_expectation, opening_principle, evidence, fix, remaining_risk。',
      '主角未在300字内登场、1000字内缺爽点/期待点或开篇仍是背景说明时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，opening_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (proseCraftSync) {
    const missed = arrayValue(proseCraftSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(proseCraftSync.next_actions || proseCraftSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【正文工艺修复】',
      firstText(proseCraftSync.label) ? `工艺结论：${firstText(proseCraftSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 prose_craft_checks 修复正文工艺，补深度限知、身体细节、环境交互、镜头对象、一动一静、三维度揉进、具体数字/贯穿道具功能和自然子事件连接。',
      '正文要求：用主角可感知的动作、触感、视线、呼吸、对白反应或物件变化承接场景；删除上帝视角、全场/所有人远景概括、连续内心独白、抽象情绪总结、堆叠式描写、无交互环境和“然后/接着/随后/于是”胶水词过渡。',
      '输出要求：必须返回 prose_craft_checks，不能只写自然语言正文工艺已优化。',
      'prose_craft_checks 每项必须包含 key, label, status, pov_depth, body_detail, environment_interaction, action_stillness_balance, crowd_reaction_layering, evidence, fix, remaining_risk。',
      '缺少深度限知、身体细节、环境交互、一动一静或围观分层证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，prose_craft_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (punctuationToneSync) {
    const missed = arrayValue(punctuationToneSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(punctuationToneSync.next_actions || punctuationToneSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【语气标点修复】',
      firstText(punctuationToneSync.label) ? `语气结论：${firstText(punctuationToneSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 punctuation_tone_checks 修复语气标点，处理通篇句号化、随机标点堆砌、省略号/破折号硬停顿、质问/爆发/迟疑标点错配和角色声线同质。',
      '正文要求：标点必须服务人物声线和情绪节奏；被打断或拖长音用动作打断、换行、短句或未完成动作承接；信息揭示和判断落点用冒号或短句落下，删除论文式长分号链。',
      '输出要求：必须返回 punctuation_tone_checks，不能只写自然语言语气标点已修复。',
      'punctuation_tone_checks 每项必须包含 key, label, status, speaker, punctuation_issue, tone_intent, replacement, voice_difference, evidence, fix, remaining_risk。',
      '标点未服务质问/爆发/迟疑/声线，或缺少替换后正文证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，punctuation_tone_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (contentRubricSync) {
    const missed = arrayValue(contentRubricSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(contentRubricSync.next_actions || contentRubricSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【内容基准修复】',
      firstText(contentRubricSync.label) ? `内容结论：${firstText(contentRubricSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 content_rubric_checks 修复内容基准，补核心卖点、冲突推进、情绪曲线、钩子与期待、角色动机、对话质量、设定一致性、文字自然度、最小剧情循环和高潮构建。',
      '正文要求：必须回答黄金三问：读者为什么翻下一页？本章改变了什么？哪个正文证据支持判断？修订要把变化落到动作、对白、信息变化、关系变化、资源变化或规则评价上。',
      '输出要求：必须返回 content_rubric_checks，不能只写自然语言内容基准已修复。',
      'content_rubric_checks 每项必须包含 key, label, status, core_selling_point, conflict_progression, chapter_change, page_turn_reason, evidence, fix, remaining_risk。',
      '缺少核心卖点、冲突推进、章节变化、翻页理由或正文证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，content_rubric_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (targetReaderSync) {
    const missed = arrayValue(targetReaderSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(targetReaderSync.next_actions || targetReaderSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【创作契约修复：目标读者】',
      firstText(targetReaderSync.label) ? `读者结论：${firstText(targetReaderSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '创作契约定位：修目标读者不是补人群标签，而是把本书写给谁、读者为什么想看、本章给了什么重新压回正文。',
      '修订要求：按 target_reader_checks 修复目标读者缺口，补清目标读者画像、读者渴望、情绪缺口、本章命中点、平台口味和可见读者回报。',
      '正文要求：按 oh-story 自嗨判定法回答“写给谁看、目标读者想看什么、本章给了什么”；情绪缺口必须把核心痛苦、深层情结、高频情绪关键词和未满足需求写成现场压力、角色选择、即时反馈或尊严/安全感/掌控感补偿。',
      '输出要求：必须返回 target_reader_checks，不能只写自然语言目标读者已对齐。',
      'target_reader_checks 每项必须包含 key, label, status, target_reader_profile, reader_desire, emotion_gap, chapter_hit, platform_taste, evidence, fix, remaining_risk。',
      '缺少目标读者画像、读者渴望、情绪缺口或本章可感知回报证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，target_reader_checks 必须全部为 pass/ok，missed_count=0；必须用正文证据证明目标读者画像、读者渴望、情绪缺口和本章可感知回报重新对齐。',
    )
  }
  if (genrePositioningSync) {
    const missed = arrayValue(genrePositioningSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(genrePositioningSync.next_actions || genrePositioningSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【创作契约修复：题材定位】',
      firstText(genrePositioningSync.label) ? `题材结论：${firstText(genrePositioningSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '创作契约定位：修题材定位不是补设定说明，而是让本章重新证明本书核心梗、类型公式和题材长板。',
      '修订要求：按 genre_positioning_checks 修复题材定位，校准题材标签、读者心理、核心梗、类型公式、金手指贴合、必备场景、微创新边界、平台适配和题材长板。',
      '正文要求：拉长题材长板而不是补短板；删除稀释核心卖点的支线，把同一卖点扩成至少 3 个角度的正文证据；必须兑现书名简介正文三位一体，避免挂羊头卖狗肉或微创新超过承载范围。',
      '输出要求：必须返回 genre_positioning_checks，不能只写自然语言题材定位已强化。',
      'genre_positioning_checks 每项必须包含 key, label, status, genre_tag, core_hook, type_formula, genre_strength, book_title_blurb_alignment, evidence, fix, remaining_risk。',
      '缺少核心梗、类型公式、题材长板或书名简介正文对齐证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，genre_positioning_checks 必须全部为 pass/ok，missed_count=0；必须用正文证据证明题材标签、核心梗、类型公式和题材长板重新服务本书承诺。',
    )
  }
  if (femaleAudienceSync) {
    const missed = arrayValue(femaleAudienceSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(femaleAudienceSync.next_actions || femaleAudienceSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【女频长篇修复】',
      firstText(femaleAudienceSync.label) ? `女频结论：${firstText(femaleAudienceSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 female_audience_checks 修复女频长篇缺口，补安全感、代入感、女主主动性、主情绪、感情线双轴、虐后反转或糖、平台对位和货板一致。',
      '正文要求：把女主被动改成女主自己做决定、自己推进，并让关键选择带来被认可、被珍视、被尊重的回馈；感情升级必须踩在事业/成长节点上，虐戏后必须给反转或糖，避免连续整卷只虐。',
      '输出要求：必须返回 female_audience_checks，不能只写自然语言女频长篇已修复。',
      'female_audience_checks 每项必须包含 key, label, status, security_anchor, reader_identification, heroine_agency, relationship_axis, post_abuse_payoff, evidence, fix, remaining_risk。',
      '缺少女主主动性、安全感锚点、代入回馈或虐后反转/糖证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，female_audience_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (upgradeRhythmSync) {
    const missed = arrayValue(upgradeRhythmSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(upgradeRhythmSync.next_actions || upgradeRhythmSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【升级节奏修复】',
      firstText(upgradeRhythmSync.label) ? `升级结论：${firstText(upgradeRhythmSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 upgrade_rhythm_checks 修复升级节奏，补升级前后对比、即时反馈、延迟反馈、新门槛、金手指功能/触发/奖励/限制/升级规则和多维成长。',
      '正文要求：金手指简单是核心，规则必须让读者一眼看懂；升级不能只给奖励，必须先有被压制的情绪缺口，再用即时反馈改变资格、能力、关系或地位，并用延迟反馈引出更高门槛、排行榜/层级压力或下一阶段目标。',
      '输出要求：必须返回 upgrade_rhythm_checks，不能只写自然语言升级节奏已修复。',
      'upgrade_rhythm_checks 每项必须包含 key, label, status, before_after_contrast, instant_feedback, delayed_feedback, new_threshold, cheat_rule, evidence, fix, remaining_risk。',
      '缺少升级前后对比、即时反馈、延迟反馈、新门槛或金手指规则证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，upgrade_rhythm_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (chapterStructureSync) {
    const missed = arrayValue(chapterStructureSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(chapterStructureSync.next_actions || chapterStructureSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【章节结构修复】',
      firstText(chapterStructureSync.label) ? `结构结论：${firstText(chapterStructureSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 structure_checks 修复章节结构，补开头钩子、中段推进、局势变化、章尾翻页。',
      '正文要求：开头必须给具体异常/证据/危机，中段必须用行动推动局势变化，结尾必须落在新的发现、危机、选择或反转上；不得只用复述、解释、总结或等待收尾。',
      '输出要求：必须返回 structure_checks，不能只写自然语言章节结构已修复。',
      'structure_checks 每项必须包含 key, label, status, opening_hook, middle_progression, situation_change, ending_page_turn, evidence, fix, remaining_risk。',
      '缺少开头钩子、中段推进、局势变化或章尾翻页证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，structure_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (chapterProgressionSync) {
    const missed = arrayValue(chapterProgressionSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(chapterProgressionSync.next_actions || chapterProgressionSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【章节推进修复】',
      firstText(chapterProgressionSync.label) ? `推进结论：${firstText(chapterProgressionSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 progression_checks 修复章节推进，证明删掉这章会影响理解。',
      '正文要求：至少补出证据、选择、代价、关系变化、设定位移或主线位移之一；等待、旧设定复述、原地解释和不改变局势的段落必须压缩，或改造成行动推进与状态变化。',
      '输出要求：必须返回 progression_checks，不能只写自然语言章节已推进。',
      'progression_checks 每项必须包含 key, label, status, non_deletable_change, mainline_shift, relationship_or_state_change, compressed_water, evidence, fix, remaining_risk。',
      '缺少不可删除变化、主线位移、关系/状态变化或水文压缩证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，progression_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (informationLoadSync) {
    const missed = arrayValue(informationLoadSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(informationLoadSync.next_actions || informationLoadSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【信息负载修复】',
      firstText(informationLoadSync.label) ? `信息结论：${firstText(informationLoadSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 information_checks 修复信息负载，一章不超 3 个新概念，信息必须跟着冲突和行动走。',
      '正文要求：删除行动前的大段设定说明，把规则、来历、限制和代价改成角色质疑、触发、证据核对、冲突反馈或状态变化中的可见信息；读者先看到事，再理解规则。',
      '输出要求：必须返回 information_checks，不能只写自然语言信息负载已降低。',
      'information_checks 每项必须包含 key, label, status, new_concept_count, action_bound_info, conflict_release, reader_first_scene, evidence, fix, remaining_risk。',
      '新概念超过 3 个、信息没有跟行动/冲突释放或缺少正文证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，information_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (longformContinuitySync) {
    const missed = arrayValue(longformContinuitySync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(longformContinuitySync.next_actions || longformContinuitySync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【长篇连续性修复】',
      firstText(longformContinuitySync.label) ? `长篇结论：${firstText(longformContinuitySync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 longform_checks 修复长篇连续性，检查最近 5 章进展、爽点间隔、阶段目标和下一阶段牵引。',
      '上下文分层：优先使用追踪/上下文.md 的近5章详记、十章概要、卷级总览；压缩早期章节、保留近期细节，避免长篇后段只凭零散记忆续写。',
      '范围边界：本任务只修长篇连续性相关承接、阶段位移和后续牵引，不要通读全书或重算全量伏笔；全量伏笔审计只在专门复盘任务中执行。',
      '正文要求：本章必须承接前文状态并推动后续，补出阶段位移、关系/资产/规则状态变化、爽点回报或下一阶段目标；避免连续多章只解释背景、原地等待或重复同一种小冲突。',
      '输出要求：必须返回 longform_checks，不能只写自然语言长篇连续性已修复。',
      'longform_checks 每项必须包含 key, label, status, recent_5_chapter_progress, payoff_interval, stage_goal_shift, next_stage_pull, context_layer, evidence, fix, remaining_risk。',
      '缺少最近5章进展、爽点间隔、阶段目标位移或下一阶段牵引证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，longform_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (coreContractCheckSync) {
    const missed = arrayValue(coreContractCheckSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(coreContractCheckSync.next_actions || coreContractCheckSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【创作契约修复：核心承诺】',
      firstText(coreContractCheckSync.label) ? `契约结论：${firstText(coreContractCheckSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '创作契约定位：修核心承诺不是把支线解释得更合理，而是让支线、资产、情绪和章尾问题重新服务全书承诺。',
      '修订要求：按 core_contract_checks 修复核心契约，守住核心承诺、主线服务、不得漂移红线和主题统一。',
      '正文要求：把支线、资产、情绪和章尾问题都压回全书核心承诺；小情绪必须服从全书核心情绪，repair_focus 必须落成可见事件、选择、代价、规则判定、主线推进或章末问题。',
      '输出要求：必须返回 core_contract_checks，不能只写自然语言核心承诺已回归。',
      'core_contract_checks 每项必须包含 key, label, status, core_promise, mainline_service, core_emotion, rule_judgement, ending_question, evidence, fix, remaining_risk。',
      '缺少主线服务、核心情绪、规则判定或章尾问题回归证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，core_contract_checks 必须全部为 pass/ok，missed_count=0；必须用正文证据证明主线服务、核心情绪、规则判定和章尾问题重新回到本书承诺。',
    )
  }
  if (continuityHeatSync) {
    const missed = arrayValue(continuityHeatSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(continuityHeatSync.next_actions || continuityHeatSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【连续性热度修复】',
      firstText(continuityHeatSync.label) ? `热度结论：${firstText(continuityHeatSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 continuity_heat_checks 修复连续性热度，hot 元素推进，warm 元素保温，cold 回收前必须升温，archived 保持休眠边界。',
      '正文要求：伏笔、关系和期待必须写成当场压力、行动门槛、证据变化、关系站队或章尾问题；不得只点名不推进，不得把冷线突然拿来解题。',
      '输出要求：必须返回 continuity_heat_checks，不能只写自然语言连续性热度已修复。',
      'continuity_heat_checks 每项必须包含 key, label, status, heat_state, hot_progress, warm_keepalive, cold_warmup, archived_boundary, evidence, fix, remaining_risk。',
      'hot 未推进、warm 未保温、cold 回收前未升温或缺正文证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，continuity_heat_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (revisionReceiptCheckSync) {
    const missed = arrayValue(revisionReceiptCheckSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(revisionReceiptCheckSync.next_actions || revisionReceiptCheckSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【修订回执修复】',
      firstText(revisionReceiptCheckSync.label) ? `回执结论：${firstText(revisionReceiptCheckSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 revision_receipt_checks 修复修订回执，revision_receipts 必须逐条对应 delivery_risk_receipts、prose revision 要求或本次修订风险。',
      '回执要求：每条 revision_receipts 必须写清 required_action、repair_segment、applied_fix 和 changed_evidence；changed_evidence 必须引用修订后正文中可定位的动作、对白、信息变化、关系变化或物品状态变化。',
      '输出要求：必须返回 revision_receipt_checks，不能只写自然语言修订回执已补齐。',
      'revision_receipt_checks 每项必须包含 key, label, status, required_action, repair_segment, applied_fix, changed_evidence, evidence, fix, remaining_risk。',
      'revision_receipts 未逐条对应风险，或 changed_evidence 不能定位修订后正文时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，revision_receipt_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (deslopRepairCheckSync) {
    const missed = arrayValue(deslopRepairCheckSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(deslopRepairCheckSync.next_actions || deslopRepairCheckSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【去AI味修复】',
      firstText(deslopRepairCheckSync.label) ? `去味结论：${firstText(deslopRepairCheckSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 deslop_repair_checks 修复去AI味残留，逐条处理 story-deslop Gate A-G 的 fail/warn 项。',
      '正文要求：重写模板化对白、抽象心理、堆叠描写、无功能环境、万能转折或AI腔表达；deslop_repair_receipts.changed_evidence 必须引用修订后正文证据。',
      '输出要求：必须返回 deslop_repair_checks，不能只写自然语言去AI味已修复。',
      'deslop_repair_checks 每项必须包含 key, label, status, gate, original_risk, rewritten_evidence, changed_evidence, receipt_synced, fix, remaining_risk。',
      'Gate A-G 残留未重写、changed_evidence 缺正文证据或回执未同步时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，deslop_repair_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (proseMetaSync) {
    const missed = arrayValue(proseMetaSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(proseMetaSync.next_actions || proseMetaSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【正文元叙事修复】',
      firstText(proseMetaSync.label) ? `元叙事结论：${firstText(proseMetaSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 prose_meta_checks 删除作者说明、创作术语、章节意图旁白和元叙事提示。',
      '工程词扫描：标题行以外不得出现 第[一二三四五六七八九十百千万两0-9]+章、上一章/上章/前一章/本章/这一章/前文/后文/伏笔/细纲/读者 等写作工程词。',
      '替换要求：命中工程词时，必须改成角色当下能感知的事件锚点、相对时间、物件状态或对话信息，不能只删除导致承接断裂。',
      '例外口径：只有故事世界内真实阅读/讨论“第X章”文本，或角色真实具备作者/读者身份并谈论读者身份时，才允许保留。',
      '正文要求：把铺垫、伏笔、反转、信息解释改成角色现场证据、误判、行动后果、对白交锋或物品/关系/状态变化；不得对读者解释“这一章用来做什么”。',
      '输出要求：必须返回 prose_meta_checks，不能只写自然语言清理说明。',
      'prose_meta_checks 每项必须包含 key, label, status, matched_term, location, replacement, evidence, remaining_risk；matched_term 写命中的工程词，replacement 写替换后的场景内表达。',
      '复检要求：标题行以外仍有工程词时 status 不能写 pass/ok；只有所有命中词都替换为角色当下可感知表达或明确符合故事内例外时，才能关闭。',
      '关闭口径：重新运行正文自检后，prose_meta_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
}
