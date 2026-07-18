import type { AnyRecord } from './utils'
import {
  firstText,
  arrayValue,
  objectValue,
  text,
} from './utils'
import {
  summarizeEvidenceItem,
  summarizeKeyValueFlags,
  metricNumber,
} from './support'

export function appendRepairTaskQualitySyncPromptLinesReceipts(lines: string[], ctx: Record<string, any>) {
  const {
    bannedWordsSync,
    benchmarkRecallSync,
    blueprintConsumptionSync,
    chapterHookQualitySync,
    deterministicCleanupSync,
    first30Retention,
    foreshadowingDeltaSync,
    intentConfirmationSync,
    nextChapterQualityPlanReceiptSync,
    readerRetentionCheckSync,
    readerTrialReview,
    serialRiskRepairSync,
    task,
    writePreparationSync,
  } = ctx

  if (bannedWordsSync) {
    const missed = arrayValue(bannedWordsSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(bannedWordsSync.next_actions || bannedWordsSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【禁用词扫描修复】',
      firstText(bannedWordsSync.label) ? `禁用词结论：${firstText(bannedWordsSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '规则来源：对照 references/banned-words.md；一级词命中即替换，二级/模板表达按语境降噪处理。',
      '修订要求：按 banned_words_checks 逐条替换命中词，把套话改成具体动作、事实、口语化对白或场景内判断。',
      '替换边界：不得用同义套话替换，不得只改一个词保留原模板句式；替换后必须仍服务本章动作、信息、情绪或状态变化。',
      '输出要求：必须返回 banned_words_checks，不能只写自然语言替换说明。',
      'banned_words_checks 每项必须包含 key, label, status, matched_word, level, location, replacement, evidence, remaining_risk；matched_word 写原命中词，replacement 写替换后的正文表达。',
      '复检要求：一级词或模板表达未复扫为 0 时 status 不能写 pass/ok；只有命中项全部替换且未产生同义套话时，才能关闭。',
      '关闭口径：重新运行正文自检后，banned_words_checks 必须全部为 pass/ok，missed_count=0，一级词复扫为 0。',
    )
  }
  if (blueprintConsumptionSync) {
    const missed = arrayValue(blueprintConsumptionSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(blueprintConsumptionSync.next_actions || blueprintConsumptionSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    const blueprintFocus = objectValue(blueprintConsumptionSync.blueprint_focus || blueprintConsumptionSync.blueprintFocus)
    lines.push(
      '【细纲兑现修复】',
      firstText(blueprintConsumptionSync.label) ? `细纲结论：${firstText(blueprintConsumptionSync.label)}` : '',
      firstText(blueprintFocus.content_summary, blueprintFocus.contentSummary) ? `内容概括：${firstText(blueprintFocus.content_summary, blueprintFocus.contentSummary)}` : '',
      firstText(blueprintFocus.plot_arrangement, blueprintFocus.plotArrangement) ? `情节安排：${firstText(blueprintFocus.plot_arrangement, blueprintFocus.plotArrangement)}` : '',
      firstText(blueprintFocus.character_order, blueprintFocus.characterOrder, blueprintFocus.character_relationship_order, blueprintFocus.characterRelationshipOrder) ? `人物关系/出场顺序：${firstText(blueprintFocus.character_order, blueprintFocus.characterOrder, blueprintFocus.character_relationship_order, blueprintFocus.characterRelationshipOrder)}` : '',
      firstText(blueprintFocus.plot_detail, blueprintFocus.plotDetail) ? `情节细化：${firstText(blueprintFocus.plot_detail, blueprintFocus.plotDetail)}` : '',
      firstText(blueprintFocus.ending_hook, blueprintFocus.endingHook) ? `结尾设定和钩子：${firstText(blueprintFocus.ending_hook, blueprintFocus.endingHook)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：新版细纲存在时，必须消费内容概括五段式、情节安排多线、人物关系变化/出场顺序、代价兑现/收益兑现，以及结尾设定和钩子。',
      'craft 核对一：爽点出手前必须有可指认的危机/期待铺垫；指不出就补铺垫情节点，不能让高潮凭空发生。',
      'craft 核对二：装逼/打脸/揭露章必须写出在场配角差异化反应，不能只写主角动作或集体模板震惊。',
      'craft 核对三：详略必须按目的词，爽点/卖点展开，过渡点带过，信息密度交替；均匀注水时删过渡、扩爽点点。',
      '旧版细纲口径：若只有旧版细纲，则至少核对核心事件、目标情绪、章首/章尾钩子和字数目标。',
      '输出要求：必须返回 blueprint_consumption_checks，不能只写自然语言细纲兑现说明。',
      'blueprint_consumption_checks 每项必须包含 key, label, status, blueprint_field, expected, delivered_evidence, missing_gap, fix, remaining_risk；blueprint_field 写对应的细纲字段，如 content_outline、plot_arrangement、character_order、cost_and_reward、ending_hook。',
      '复检要求：新版细纲关键项未被正文证据兑现时 status 不能写 pass/ok；只有内容概括、情节安排、人物出场、代价/收益、结尾钩子和 craft 核对项都有正文证据时，才能关闭。',
      '关闭口径：重新运行正文自检后，blueprint_consumption_checks 必须全部为 pass/ok，missed_count=0，并能从 chapter_text 定位正文证据。',
    )
  }
  if (foreshadowingDeltaSync) {
    const missed = arrayValue(foreshadowingDeltaSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(foreshadowingDeltaSync.next_actions || foreshadowingDeltaSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【伏笔增量修复】',
      firstText(foreshadowingDeltaSync.label) ? `伏笔结论：${firstText(foreshadowingDeltaSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：只确认本轮新增/推进/回收的伏笔增量，补写追踪/伏笔.md 并更新状态。',
      '台账字段：每条增量至少写清伏笔名称、类型（新增/推进/回收）、当前状态、首次或本轮涉及章节、source_excerpt 和后续约束。',
      '正文证据：source_excerpt 必须引用修订后 chapter_text 或本轮正文中的原句，不能只用摘要、任务说明或模型自述。',
      '边界要求：不得在日更流程中通读所有 session 或扫描全部正文做全量伏笔审计；全量伏笔审计只在 /story-review 或用户明确要求“全面检查伏笔”时执行。',
      '输出要求：必须返回 foreshadowing_delta_checks，不能只写自然语言伏笔盘点说明。',
      'foreshadowing_delta_checks 每项必须包含 key, label, status, clue_name, delta_type, current_status, chapter, source_excerpt, ledger_path, fix, remaining_risk；delta_type 只能对应新增/推进/回收这类本轮增量。',
      '复检要求：source_excerpt 不能定位到修订后正文，或追踪/伏笔.md 未写回时 status 不能写 pass/ok；只有本轮伏笔增量都有正文原句和台账记录时，才能关闭。',
      '关闭口径：重新运行正文自检后，foreshadowing_delta_checks 必须全部为 pass/ok，missed_count=0，本轮伏笔增量已写入追踪/伏笔.md。',
    )
  }
  if (deterministicCleanupSync) {
    const missed = arrayValue(deterministicCleanupSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(deterministicCleanupSync.next_actions || deterministicCleanupSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    const deterministicProseCleanup = objectValue(deterministicCleanupSync.deterministic_prose_cleanup || deterministicCleanupSync.deterministicProseCleanup)
    const riskCount = metricNumber(deterministicProseCleanup.risk_count ?? deterministicProseCleanup.riskCount)
    const categories = arrayValue(deterministicProseCleanup.categories)
      .map(item => {
        const category = objectValue(item)
        const label = firstText(category.label, category.key, category.name, '风险项')
        const count = metricNumber(category.count)
        const evidence = firstText(category.evidence, category.example, category.text, category.message)
        return [
          label,
          count !== null ? `${count}` : '',
          evidence,
        ].filter(Boolean).join('：')
      })
      .filter(Boolean)
    lines.push(
      '【确定性清理修复】',
      firstText(deterministicCleanupSync.label) ? `清理结论：${firstText(deterministicCleanupSync.label)}` : '',
      '复检对象：deterministic_prose_cleanup',
      riskCount !== null ? `risk_count：${riskCount}` : '',
      categories.length > 0 ? `风险分类：${categories.join('；')}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 MangaForge 确定性清理阶段结果回修正文；命中长省略号、破折号、双连字符、独立横线或高危 AI 句式时，必须回正文改到复扫为 0。',
      '执行边界：只处理硬标点、模板句式、AI 腔表达和明显破坏口吻的确定性风险；不要借清理任务改剧情线、人物状态、设定事实或章节事件。',
      '证据要求：每一类残留都要能对应修订后正文中的具体句子变化；不得只在回执里声称已处理。',
      '输出要求：必须返回 deterministic_prose_cleanup，不能只写自然语言清理说明。',
      'deterministic_prose_cleanup 必须包含 status, risk_count, categories, evidence, required_actions；categories 每项写 key/label/count/evidence/fix_result。',
      '复检要求：risk_count 大于 0 时 status 不能写 ok/pass；只有 risk_count 为 0 且 categories 残留数量清零时，才能关闭确定性清理任务。',
      '关闭口径：重新运行正文自检后，deterministic_prose_cleanup.risk_count 为 0，status 为 ok/pass。',
    )
  }
  if (serialRiskRepairSync) {
    const missed = arrayValue(serialRiskRepairSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(serialRiskRepairSync.next_actions || serialRiskRepairSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【连续风险修复】',
      firstText(serialRiskRepairSync.label) ? `连修结论：${firstText(serialRiskRepairSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 serial_risk_repair_checks 修复安全批量、场景承接和连续生产风险残留。',
      '回执要求：补齐 scene_serial_risk_repair_receipt 或连续生产风险修复回执，并让场景承接变化、状态变化、风险解除或后续约束在正文中可定位。',
      '输出要求：必须返回 serial_risk_repair_checks，不能只写自然语言连续风险已修复。',
      'serial_risk_repair_checks 每项必须包含 key, label, status, risk_type, repair_receipt, continuity_change, state_change, evidence, fix, remaining_risk。',
      '缺少连续生产风险回执、场景承接变化、状态变化或正文证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，serial_risk_repair_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (chapterHookQualitySync) {
    const missed = arrayValue(chapterHookQualitySync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(chapterHookQualitySync.next_actions || chapterHookQualitySync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【章钩质量修复】',
      firstText(chapterHookQualitySync.label) ? `章钩结论：${firstText(chapterHookQualitySync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按 chapter_hook_quality_checks 修复章首/章尾翻页质量。',
      '正文要求：章首必须用现场触发的异常、危险、选择、冲突、对话逼问或规则变化拉住读者；章尾必须留下具体问题、危险、发现、选择或下一章行动压力，并和下一章行动直接相连。',
      '输出要求：必须返回 chapter_hook_quality_checks，不能只写自然语言章钩质量说明。',
      'chapter_hook_quality_checks 每项必须包含 key, label, status, hook_position, trigger_type, concrete_question, danger_or_choice, next_action_link, evidence, fix, remaining_risk；hook_position 写 opening 或 ending。',
      '复检要求：章首/章尾没有具体问题、危险/选择、下一章行动连接或正文证据时 status 不能写 pass/ok；只有现场触发和行动承接都能从 chapter_text 定位时，才能关闭。',
      '关闭口径：重新运行正文自检后，chapter_hook_quality_checks 必须全部为 pass/ok，missed_count=0。',
    )
  }
  if (readerRetentionCheckSync) {
    const missed = arrayValue(readerRetentionCheckSync.missed)
      .map(item => {
        const summary = summarizeEvidenceItem(item)
        const value = objectValue(item)
        const fix = firstText(value.fix, value.repair_instruction, value.repairInstruction, value.suggestion, value.required_action, value.requiredAction)
        if (summary && fix && !summary.includes(fix)) return `${summary}；修法：${fix}`
        return summary || fix
      })
      .filter(Boolean)
    const nextActions = arrayValue(readerRetentionCheckSync.next_actions || readerRetentionCheckSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【创作契约修复：追读留存】',
      firstText(readerRetentionCheckSync.label) ? `追读结论：${firstText(readerRetentionCheckSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '创作契约定位：修追读留存不是单独补钩子，而是把本章的情绪回报、信息差饥饿和章末下一页动力重新绑回读者承诺。',
      '修订要求：按 reader_retention_checks 修复追读雷达，补前300字钩子、正文可见爽点、信息缺口、章末追读，以及留存双引擎的情绪 + 饥饿。',
      '正文要求：情绪必须让读者快速代入，饥饿必须用信息差植入问号并按剥洋葱卡住关键信息；Hook上瘾模型要形成触发 -> 行动 -> 奖励 -> 投入，奖励随机性必须给出出乎意料的额外收获、线索、权限、关系或地位变化，并形成沉没投入。',
      '输出要求：必须返回 reader_retention_checks，不能只写自然语言追读已修复。',
      'reader_retention_checks 每项必须包含 key, label, status, retention_engine, emotional_payoff, information_hunger, page_turn_question, evidence, fix, remaining_risk。',
      '缺少情绪回报、信息差饥饿或章末追读证据时 status 不能写 pass/ok。',
      '关闭口径：重新运行正文自检后，reader_retention_checks 必须全部为 pass/ok，missed_count=0；必须用正文证据证明情绪回报、信息差饥饿和章末追读重新闭环。',
    )
  }
  if (intentConfirmationSync) {
    const missed = arrayValue(intentConfirmationSync.missed)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    const nextActions = arrayValue(intentConfirmationSync.next_actions || intentConfirmationSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    const blueprintFocus = objectValue(intentConfirmationSync.blueprint_focus || intentConfirmationSync.blueprintFocus)
    lines.push(
      '【写前意图确认修复】',
      intentConfirmationSync.score !== undefined && intentConfirmationSync.score !== null ? `意图评分：${intentConfirmationSync.score}` : '',
      firstText(intentConfirmationSync.label) ? `意图结论：${firstText(intentConfirmationSync.label)}` : '',
      '新版细纲意图：内容概括决定起承转合；情节安排决定主线/辅线/事件线/感情线/逻辑线的取舍；人物关系和出场顺序决定镜头进入顺序；情节细化决定代价兑现/收益兑现；结尾设定和钩子决定章尾承接。',
      firstText(blueprintFocus.content_summary, blueprintFocus.contentSummary) ? `内容概括：${firstText(blueprintFocus.content_summary, blueprintFocus.contentSummary)}` : '',
      firstText(blueprintFocus.plot_arrangement, blueprintFocus.plotArrangement) ? `情节安排：${firstText(blueprintFocus.plot_arrangement, blueprintFocus.plotArrangement)}` : '',
      firstText(blueprintFocus.character_order, blueprintFocus.characterOrder, blueprintFocus.character_relationship_order, blueprintFocus.characterRelationshipOrder) ? `人物关系/出场顺序：${firstText(blueprintFocus.character_order, blueprintFocus.characterOrder, blueprintFocus.character_relationship_order, blueprintFocus.characterRelationshipOrder)}` : '',
      firstText(blueprintFocus.plot_detail, blueprintFocus.plotDetail) ? `情节细化：${firstText(blueprintFocus.plot_detail, blueprintFocus.plotDetail)}` : '',
      firstText(blueprintFocus.ending_hook, blueprintFocus.endingHook) ? `结尾设定和钩子：${firstText(blueprintFocus.ending_hook, blueprintFocus.endingHook)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      'craft 约束：爽点出手前先铺可指认的危机/期待，不能让高潮凭空发生；装逼/打脸/揭露章必须通过在场配角放大信息差和差异化反应；高压/生死/悲痛 beat 下搞笑担当和轻快配角声线让位，信息型配角不得变成科普嘴。',
      '修订要求：必须把写前确认的情绪目标、章节意图、关键承接和章尾推动力改成正文可见事件、选择、动作、对白、关系反馈或物品状态变化。',
      '回执要求：oh_story_delivery_receipts.delivery_risk_receipts 必须逐项引用修订后 chapter_text 中的证据，不能只写“已补意图”。',
      '输出要求：必须返回 intent_confirmation_checks，不能只写自然语言意图已落地说明。',
      'intent_confirmation_checks 每项必须包含 key, label, status, intent_field, expected_intent, delivered_evidence, blueprint_link, fix, remaining_risk；intent_field 写 emotion_goal/chapter_intent/handoff/ending_hook/blueprint/craft 中最贴近的一类。',
      '复检要求：情绪目标、章节意图、关键承接、章尾推动力或新版细纲字段没有正文证据时 status 不能写 pass/ok；只有写前意图能从 chapter_text 定位到事件、选择、动作、对白、关系反馈或物品状态变化时，才能关闭。',
      '写前执行回执：oh_story_delivery_receipts.pre_draft_execution_receipts.intent_confirmation_checks 必须逐项复验修订结果，delivered=true 且 remaining_risk 为空才算闭环。',
    )
  }
  if (writePreparationSync) {
    const missed = arrayValue(writePreparationSync.missed)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    const nextActions = arrayValue(writePreparationSync.next_actions || writePreparationSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【写前准备卡修复】',
      writePreparationSync.score !== undefined && writePreparationSync.score !== null ? `写前准备评分：${writePreparationSync.score}` : '',
      firstText(writePreparationSync.label) ? `写前准备结论：${firstText(writePreparationSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：必须把写前准备卡里的 source_gaps、asset_risks、delivery_risk_actions、上一轮待修复、creation_contract_checklist、blueprint_focus、reader_payoff_focus 和 must_confirm 改成正文可见动作、对白、信息变化、关系变化、物品状态变化或章末承接。',
      '创作契约要求：creation_contract_checklist 不能只汇总为“已处理”；目标读者、题材定位、核心承诺、追读留存必须分别补正文证据，证明本章没有偏离读者承诺和长期卖点。',
      '输出要求：必须返回 write_preparation_checks，不能只写自然语言准备项已处理说明。',
      'write_preparation_checks 每项必须包含 key, label, status, preparation_type, expected, delivered_evidence, chapter_location, fix, remaining_risk；preparation_type 写 source_gap/asset_risk/delivery_risk/contract/blueprint/reader_payoff/must_confirm 中最贴近的一类。',
      '复检要求：写前准备项没有落成正文动作、对白、信息变化、关系变化、物品状态变化或章末承接时 status 不能写 pass/ok；只有 delivered_evidence 和 chapter_location 都能定位到修订后正文时，才能关闭。',
      '写前执行回执：oh_story_delivery_receipts.pre_draft_execution_receipts.write_preparation_checks 必须逐项复验修订结果，delivered=true 且 remaining_risk 为空才算闭环。',
    )
  }
  if (benchmarkRecallSync) {
    const missed = arrayValue(benchmarkRecallSync.missed)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    const nextActions = arrayValue(benchmarkRecallSync.next_actions || benchmarkRecallSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    const matchedTechniques = arrayValue(benchmarkRecallSync.matched_chapter_techniques || benchmarkRecallSync.matchedChapterTechniques)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    const anchorExcerpts = arrayValue(benchmarkRecallSync.anchor_excerpts || benchmarkRecallSync.anchorExcerpts)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    const gaps = summarizeKeyValueFlags(benchmarkRecallSync.gaps)
    lines.push(
      '【文风召回修复】',
      benchmarkRecallSync.score !== undefined && benchmarkRecallSync.score !== null ? `召回评分：${benchmarkRecallSync.score}` : '',
      firstText(benchmarkRecallSync.label) ? `召回结论：${firstText(benchmarkRecallSync.label)}` : '',
      firstText(benchmarkRecallSync.module_source_path, benchmarkRecallSync.moduleSourcePath) ? `情绪模块来源：${firstText(benchmarkRecallSync.module_source_path, benchmarkRecallSync.moduleSourcePath)}` : '',
      firstText(benchmarkRecallSync.rhythm_source_path, benchmarkRecallSync.rhythmSourcePath) ? `节奏来源：${firstText(benchmarkRecallSync.rhythm_source_path, benchmarkRecallSync.rhythmSourcePath)}` : '',
      firstText(benchmarkRecallSync.style_profile_path, benchmarkRecallSync.styleProfilePath) ? `文风来源：${firstText(benchmarkRecallSync.style_profile_path, benchmarkRecallSync.styleProfilePath)}` : '',
      firstText(benchmarkRecallSync.matched_chapter_K, benchmarkRecallSync.matchedChapterK) ? `匹配章节：第${firstText(benchmarkRecallSync.matched_chapter_K, benchmarkRecallSync.matchedChapterK)}章` : '',
      firstText(benchmarkRecallSync.selected_emotion_module, benchmarkRecallSync.selectedEmotionModule) ? `情绪模块：${firstText(benchmarkRecallSync.selected_emotion_module, benchmarkRecallSync.selectedEmotionModule)}` : '',
      firstText(benchmarkRecallSync.rhythm_reference, benchmarkRecallSync.rhythmReference) ? `节奏参照：${firstText(benchmarkRecallSync.rhythm_reference, benchmarkRecallSync.rhythmReference)}` : '',
      firstText(benchmarkRecallSync.style_profile_summary, benchmarkRecallSync.styleProfileSummary) ? `文风摘要：${firstText(benchmarkRecallSync.style_profile_summary, benchmarkRecallSync.styleProfileSummary)}` : '',
      matchedTechniques.length > 0 ? `匹配章技巧：${matchedTechniques.join('；')}` : '',
      anchorExcerpts.length > 0 ? `原文锚点：${anchorExcerpts.join('；')}` : '',
      gaps.length > 0 ? `召回 gaps：${gaps.join('；')}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '权威规则：剧情/情绪模块.md 和 剧情/节奏.md 是权威来源；文风.md 只管表达方式，章节摘要和文风不得覆盖情绪模块或节奏参照。',
      'gaps 保真：不得把 gaps.conflict 或 matched_deep_dive_missing 在回执里反转为 false；如果存在 module_missing、rhythm_missing、profile_missing 或 conflict，必须按原 gaps 写明回退、阻塞或权威优先处理。',
      '修订要求：必须把对标模块、节奏参照、文风召回和表达方法改成正文中的节拍分配、对白比例、动作链和情绪转折。',
      '禁止复制参照文本原句、桥段、专有设定、角色名或核心梗；修订证据必须写入 oh_story_delivery_receipts.delivery_risk_receipts。',
      '输出要求：必须返回 benchmark_recall_checks，不能只写自然语言对标已应用说明。',
      'benchmark_recall_checks 每项必须包含 key, label, status, source_type, source_path, expected_application, delivered_evidence, gaps_preserved, fix, remaining_risk；source_type 写 emotion_module/rhythm/style_profile/matched_chapter/anchor_excerpt/gaps 中最贴近的一类。',
      '复检要求：对标模块、节奏参照、文风召回或匹配章技巧没有正文证据时 status 不能写 pass/ok；gaps_preserved 必须保留 conflict、module_missing、rhythm_missing、profile_missing、matched_deep_dive_missing 等原始缺口口径。',
      '写前执行回执：oh_story_delivery_receipts.pre_draft_execution_receipts.benchmark_recall_checks 必须逐项复验修订结果，delivered=true 且 remaining_risk 为空才算闭环。',
    )
  }
  if (nextChapterQualityPlanReceiptSync) {
    const missed = arrayValue(nextChapterQualityPlanReceiptSync.missed)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    const nextActions = arrayValue(nextChapterQualityPlanReceiptSync.next_actions || nextChapterQualityPlanReceiptSync.nextActions)
      .map(item => String(item || '').trim())
      .filter(Boolean)
    lines.push(
      '【质量续航回执闭环】',
      nextChapterQualityPlanReceiptSync.score !== undefined && nextChapterQualityPlanReceiptSync.score !== null ? `质量续航评分：${nextChapterQualityPlanReceiptSync.score}` : '',
      firstText(nextChapterQualityPlanReceiptSync.label) ? `质量续航结论：${firstText(nextChapterQualityPlanReceiptSync.label)}` : '',
      missed.length > 0 ? `缺口维度：${missed.join('；')}` : '',
      nextActions.length > 0 ? `建议动作：${nextActions.join('；')}` : '',
      '修订要求：按上一章 next_chapter_quality_plan 逐项复验本章正文；quality_focus、opening_actions、middle_actions、ending_actions、avoid_repetition 和 evidence_basis 都必须有本章正文证据或明确 remaining_risk。',
      '输出要求：必须返回 next_chapter_quality_plan_receipts，不能只写自然语言质量续航已执行。',
      'next_chapter_quality_plan_receipts 每项必须包含 key, label, delivered, evidence, remaining_risk。',
      '复检要求：delivered=true 时 evidence 必须引用修订后 chapter_text 中可定位的动作、对白、信息变化、结构处理或章末钩子；无法证明时 delivered 不能写 true，remaining_risk 必须说明下一轮风险。',
      '写前执行回执：oh_story_delivery_receipts.pre_draft_execution_receipts.next_chapter_quality_plan_receipts 必须逐项复验上一章质量续航计划，delivered=true 且 remaining_risk 为空才算闭环。',
    )
  }
  if (readerTrialReview || task.source === 'reader_trial_review' || task.issue_type === 'reader_trial_drop_point') {
    const trial = objectValue(readerTrialReview)
    const dropPoints = arrayValue(trial.drop_points || trial.dropPoints)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    const repairActions = arrayValue(trial.repair_actions || trial.repairActions)
      .map(summarizeEvidenceItem)
      .filter(Boolean)
    const personas = arrayValue(trial.personas)
      .map(item => {
        const value = objectValue(item)
        const label = firstText(value.label, value.name, value.key, '模拟读者')
        const verdict = firstText(value.verdict, value.focus, value.text, value.description)
        return verdict ? `${label}：${verdict}` : label
      })
      .filter(Boolean)
    const segments = arrayValue(trial.segments)
      .map(item => {
        const value = objectValue(item)
        const label = firstText(value.label, value.key, '试读分段')
        const score = value.score === undefined || value.score === null ? '' : ` ${value.score}分`
        const verdict = firstText(value.verdict, value.summary, value.text, value.description)
        return verdict ? `${label}${score}：${verdict}` : `${label}${score}`
      })
      .filter(Boolean)
    lines.push(
      '【读者试读修复】',
      trial.score !== undefined && trial.score !== null ? `试读评分：${trial.score}` : '',
      firstText(trial.status) ? `试读状态：${firstText(trial.status)}` : '',
      firstText(trial.summary) ? `试读结论：${firstText(trial.summary)}` : '',
      ...dropPoints.map(item => `弃读点：${item}`),
      ...personas.map(item => `模拟读者：${item}`),
      ...segments.map(item => `试读分段：${item}`),
      ...repairActions.map(item => `修复动作：${item}`),
      '修订要求：只修当前章节，把弃读点改成可见的目标推进、爽点回报、情绪反转、信息增量、创新场面或章末钩子。',
      '不得改长期主线方向，不得新增未确认设定，不得把试读问题转嫁到后续章节。',
    )
  }
  if (first30Retention || task.issue_type === 'first30_retention_recheck') {
    const retention = objectValue(first30Retention)
    const risks = arrayValue(retention.risks)
      .map(item => {
        const value = objectValue(item)
        const segment = firstText(value.segment, value.key, value.label, '前30章')
        const issue = firstText(value.issue, value.message, value.text, value.description)
        const action = firstText(value.action, value.repair_action, value.repairAction)
        if (issue && action) return `${segment}：${issue} -> ${action}`
        if (issue) return `${segment}：${issue}`
        return summarizeEvidenceItem(value)
      })
      .filter(Boolean)
    const riskyChapters = arrayValue(retention.risky_chapters || retention.riskyChapters)
      .map(item => {
        const value = objectValue(item)
        const chapterNo = Number(value.chapter_no ?? value.chapterNo ?? 0)
        const title = firstText(value.title, '未命名章节')
        const score = value.score === undefined || value.score === null ? '' : ` ${value.score}分`
        const flags = arrayValue(value.flags).map(flag => text(flag)).filter(Boolean)
        const prefix = chapterNo > 0 ? `第${chapterNo}章《${title}》` : title
        return `${prefix}${score}${flags.length > 0 ? `：${flags.join('、')}` : ''}`
      })
      .filter(Boolean)
    const nextActions = arrayValue(retention.next_actions || retention.nextActions)
      .map(item => text(item))
      .filter(Boolean)
    lines.push(
      '【前30章留存复诊】',
      firstText(retention.status) ? `留存状态：${firstText(retention.status)}` : '',
      retention.score !== undefined && retention.score !== null ? `留存评分：${retention.score}` : '',
      firstText(retention.summary) ? `留存结论：${firstText(retention.summary)}` : '',
      ...risks.map(item => `风险：${item}`),
      ...riskyChapters.map(item => `高危章节：${item}`),
      ...nextActions.map(item => `建议动作：${item}`),
      '修订要求：必须重新校准开篇三章、试读十章和付费前蓄势；把过期诊断后的正文变化重新纳入判断。',
      '如果动作是重新诊断，不要臆造已经修复；如果动作是生成修复任务，优先处理开篇钩子、试读闭环、爽点兑现和章末翻页。',
    )
  }
}
