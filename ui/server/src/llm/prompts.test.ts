import { describe, expect, test } from 'bun:test'
import { buildProsePrompt } from './prompts'

describe('buildProsePrompt', () => {
  test('injects oh-story prose meta hygiene rules before chapter drafting', () => {
    const prompt = buildProsePrompt(
      {
        id: 1,
        title: '剑烛大荒',
        genre: '玄幻',
        style_tags: ['快节奏'],
        length_target: 'long',
      } as any,
      {
        chapter_no: 8,
        title: '旧楼门牌',
        chapter_summary: '主角接住上一幕的门牌异变，追查门牌背后的规则代价。',
        ending_hook: '门牌上的名字变成主角本人。',
      },
      {
        prevChapters: [
          {
            chapter_no: 7,
            title: '门牌翻面',
            ending_hook: '旧楼门牌在雨夜自己翻了面。',
            chapter_text: '雨声压住了走廊里的脚步。林青禾看见门牌翻面，背后刻着一个陌生名字。',
          },
        ],
      },
    )

    expect(prompt).toContain('正文元信息清洁')
    expect(prompt).toContain('标题行以外不得出现')
    expect(prompt).toContain('上一章/本章/前文/后文/伏笔/细纲/读者/第X章')
    expect(prompt).toContain('必须改成角色当下能感知的事件锚点或相对时间')
  })

  test('requires oh-story delivery receipts for auditable chapter drafting', () => {
    const prompt = buildProsePrompt(
      {
        id: 1,
        title: '剑烛大荒',
        genre: '玄幻',
        style_tags: ['快节奏'],
        length_target: 'long',
      } as any,
      {
        chapter_no: 9,
        title: '旧印开裂',
        chapter_summary: '主角用旧印反证楼规代价，逼出管事藏起的账册。',
        conflict: '管事试图用楼规压下旧印异变',
        ending_hook: '旧印裂口里露出第二枚门牌。',
        scenes: [
          { scene_no: 1, title: '账房逼问', goal: '承接旧楼门牌异变', conflict: '管事要夺走旧印' },
          { scene_no: 2, title: '旧印开裂', goal: '兑现旧印代价', conflict: '旧印反噬主角手腕' },
        ],
      },
      {
        prevChapters: [
          {
            chapter_no: 8,
            title: '旧楼门牌',
            ending_hook: '门牌上的名字变成主角本人。',
            chapter_text: '门牌上的名字变成了林青禾。管事伸手去抢，旧印却先一步烫进他的掌心。',
          },
        ],
      },
    )

    expect(prompt).toContain('oh-story交付回执')
    expect(prompt).toContain('oh_story_delivery_receipts')
    expect(prompt).toContain('chapter_blueprint')
    expect(prompt).toContain('scene_card_receipts')
    expect(prompt).toContain('delivery_risk_receipts')
    expect(prompt).toContain('revision_receipts')
    expect(prompt).toContain('所有回执必须同时写入 oh_story_delivery_receipts')
    expect(prompt).toContain('changed_evidence')
    expect(prompt).toContain('必须引用 chapter_text 中的原句')
    expect(prompt).toContain('不得只写“已完成”')
  })

  test('requires pre-draft execution receipts for intent and benchmark recall closure', () => {
    const prompt = buildProsePrompt(
      {
        id: 1,
        title: '剑烛大荒',
        genre: '玄幻',
        style_tags: ['快节奏'],
        length_target: 'long',
      } as any,
      {
        chapter_no: 10,
        title: '第二枚门牌',
        chapter_summary: '主角确认第二枚门牌不是奖赏，而是下一层楼规的代价。',
        conflict: '内门执事要求主角交出旧印',
        ending_hook: '第二枚门牌背面出现母亲旧名。',
      },
      {
        prevChapters: [
          {
            chapter_no: 9,
            title: '旧印开裂',
            ending_hook: '旧印裂口里露出第二枚门牌。',
            chapter_text: '旧印裂开，第二枚门牌从裂口里滑出，牌面还在滴水。',
          },
        ],
      },
    )

    expect(prompt).toContain('pre_draft_execution_receipts')
    expect(prompt).toContain('status_filter_receipts')
    expect(prompt).toContain('intent_confirmation_checks')
    expect(prompt).toContain('benchmark_recall_checks')
    expect(prompt).toContain('style_sample_checks')
    expect(prompt).toContain('写前意图、状态筛选、文风/标杆召回')
  })

  test('injects confirmed pre-draft brief details into the chapter drafting prompt', () => {
    const prompt = buildProsePrompt(
      {
        id: 1,
        title: '剑烛大荒',
        genre: '玄幻',
        style_tags: ['快节奏'],
        length_target: 'long',
      } as any,
      {
        chapter_no: 10,
        title: '第二枚门牌',
        chapter_summary: '主角确认第二枚门牌不是奖赏，而是下一层楼规的代价。',
        conflict: '内门执事要求主角交出旧印',
        ending_hook: '第二枚门牌背面出现母亲旧名。',
      },
      {
        pre_draft_brief: {
          intent_confirmation_contract: {
            confirmed_intent: '本章只写清第二枚门牌的代价归属，不扩展外门大案。',
            appearance_order: ['旧印开裂', '执事索印', '门牌显名'],
            cost_and_reward: '代价是手腕灼伤和母亲旧名暴露，收益是确认楼规下一层入口。',
            ending_handoff: '以母亲旧名作为下一章追问入口。',
          },
          state_tracking_contract: {
            filter_rules: ['只使用旧印、第二枚门牌、母亲旧名三项会影响本章判断的状态。'],
            source_requirements: ['上一章结尾', '追踪/伏笔.md', '角色状态'],
          },
          benchmark_recall_brief: {
            style_targets: ['短句推进', '动作压对白', '物件触发规则变化'],
            avoid_patterns: ['解释楼规百科', '提前交代外门大案'],
          },
          style_boundary_contract: {
            must_keep: ['雨夜压迫感', '物证先于解释'],
            must_avoid: ['作者总结式说明', '跳到后续章节预告'],
          },
        },
      } as any,
    )

    expect(prompt).toContain('【oh-story 写前确认】')
    expect(prompt).toContain('本章只写清第二枚门牌的代价归属，不扩展外门大案。')
    expect(prompt).toContain('旧印开裂 -> 执事索印 -> 门牌显名')
    expect(prompt).toContain('代价是手腕灼伤和母亲旧名暴露')
    expect(prompt).toContain('只使用旧印、第二枚门牌、母亲旧名三项会影响本章判断的状态。')
    expect(prompt).toContain('短句推进')
    expect(prompt).toContain('解释楼规百科')
    expect(prompt).toContain('物证先于解释')
    expect(prompt).toContain('作者总结式说明')
  })

  test('injects write preparation brief details into the chapter drafting prompt', () => {
    const prompt = buildProsePrompt(
      {
        id: 1,
        title: '剑烛大荒',
        genre: '玄幻',
        style_tags: ['快节奏'],
        length_target: 'long',
      } as any,
      {
        chapter_no: 11,
        title: '旧印追证',
        chapter_summary: '主角按旧印缺口追证第二枚门牌的归属。',
        conflict: '执事试图把旧印缺口解释成旧案旁支。',
        ending_hook: '旧印缺口里浮出失踪证人的姓。',
      },
      {
        preDraftBrief: {
          writePreparationBrief: {
            readinessStatus: 'needs_context',
            sourceGaps: ['上一章章尾钩子缺少证人姓氏来源'],
            assetRisks: ['第二枚门牌仍是孤立资产，缺归属和触发条件'],
            blueprintFocus: ['旧印缺口必须推动归属判定'],
            readerPayoffFocus: ['读者必须看到执事解释被当场反证'],
            mustConfirm: ['旧印缺口来源', '门牌触发条件'],
            executionOrder: ['接上一章旧印裂口', '执事索印', '证人姓氏浮出'],
          },
        },
      } as any,
    )

    expect(prompt).toContain('写前准备')
    expect(prompt).toContain('needs_context')
    expect(prompt).toContain('上一章章尾钩子缺少证人姓氏来源')
    expect(prompt).toContain('第二枚门牌仍是孤立资产')
    expect(prompt).toContain('旧印缺口必须推动归属判定')
    expect(prompt).toContain('读者必须看到执事解释被当场反证')
    expect(prompt).toContain('旧印缺口来源')
    expect(prompt).toContain('接上一章旧印裂口 -> 执事索印 -> 证人姓氏浮出')
  })

  test('injects benchmark recall authority fields and gap handling into the chapter drafting prompt', () => {
    const prompt = buildProsePrompt(
      {
        id: 1,
        title: '剑烛大荒',
        genre: '玄幻',
        style_tags: ['快节奏'],
        length_target: 'long',
      } as any,
      {
        chapter_no: 11,
        title: '旧印追证',
        chapter_summary: '主角按旧印缺口追证第二枚门牌的归属。',
        conflict: '执事试图把旧印缺口解释成旧案旁支。',
        ending_hook: '旧印缺口里浮出失踪证人的姓。',
      },
      {
        preDraftBrief: {
          benchmarkRecallBrief: {
            styleProfilePath: '对标/万相楼/文风.md',
            styleProfileSummary: '短句压迫，物证先动，解释后置。',
            selectedEmotionModule: 'M03 信息差反杀：先让对手用规则压人，再用物证反证。',
            rhythmReference: '先压后爆，爆发后用一段冷却承接下一钩子。',
            moduleSourcePath: '对标/万相楼/剧情/情绪模块.md',
            rhythmSourcePath: '对标/万相楼/剧情/节奏.md',
            matchedChapterK: 17,
            matchedChapterTechniques: ['问非所答制造潜台词', '短句停顿后给物证'],
            anchorExcerpts: ['他没有回答，只把湿透的木牌推到灯下。'],
            canonicalSourceRules: ['剧情/情绪模块.md 与 剧情/节奏.md 管情绪和节奏', '文风.md 只管表达层'],
            gaps: {
              conflict: ['文风摘要要求慢解释，但节奏.md 要先压后爆'],
              matched_deep_dive_missing: true,
            },
          },
        },
      } as any,
    )

    expect(prompt).toContain('selected_emotion_module')
    expect(prompt).toContain('M03 信息差反杀')
    expect(prompt).toContain('rhythm_reference')
    expect(prompt).toContain('先压后爆')
    expect(prompt).toContain('module_source_path')
    expect(prompt).toContain('对标/万相楼/剧情/情绪模块.md')
    expect(prompt).toContain('rhythm_source_path')
    expect(prompt).toContain('对标/万相楼/剧情/节奏.md')
    expect(prompt).toContain('matched_chapter_K：17')
    expect(prompt).toContain('问非所答制造潜台词')
    expect(prompt).toContain('原文锚点片段')
    expect(prompt).toContain('湿透的木牌')
    expect(prompt).toContain('gaps')
    expect(prompt).toContain('matched_deep_dive_missing')
    expect(prompt).toContain('文风.md 只管表达层')
    expect(prompt).toContain('冲突时以 剧情/情绪模块.md 和 剧情/节奏.md 为准')
    expect(prompt).toContain('不得复制对标桥段、设定、角色名或原句')
    expect(prompt).toContain('benchmark_recall_checks 必须逐项覆盖 selected_emotion_module、rhythm_reference、style_profile_summary、matched_chapter_techniques、canonical_source_rules 和 gaps')
  })

  test('injects style sample strategy and copy boundaries into fallback prose prompt', () => {
    const prompt = buildProsePrompt(
      {
        id: 1,
        title: '剑烛大荒',
        genre: '玄幻',
        style_tags: ['快节奏'],
        length_target: 'long',
      } as any,
      {
        chapter_no: 12,
        title: '旧证反打',
        chapter_summary: '主角在雨巷旧证审讯中顶住三轮压问，半拍亮出反证。',
        conflict: '执事试图用连续压问抢走解释权。',
        ending_hook: '旧证背面浮出内门编号。',
      },
      {
        preDraftBrief: {
          styleSampleStrategy: {
            enabled: true,
            applyTo: ['雨巷审讯', '高压反打'],
            samples: [
              {
                sample_key: '雨巷审讯样章',
                narrative_rhythm: '三轮压问后半拍亮证据',
                sentence_pattern: '短中句推进，解释压短',
                dialogue_ratio: '35%-45%',
                abstract_usage: '只学习对白功能、节奏密度和情绪转折',
                applicable_scenes: ['雨巷审讯', '信息差反打'],
                avoid_scenes: ['纯背景说明'],
                unsafe_direct_phrases: ['你以为这就结束了吗'],
              },
            ],
            doNotCopy: ['样章原句不能照搬', '不得复制样章桥段、专有设定、角色名和核心梗'],
          },
        },
      } as any,
    )

    expect(prompt).toContain('本章风格样章策略')
    expect(prompt).toContain('style_sample_enabled：true')
    expect(prompt).toContain('雨巷审讯样章')
    expect(prompt).toContain('三轮压问后半拍亮证据')
    expect(prompt).toContain('短中句推进，解释压短')
    expect(prompt).toContain('只学习对白功能、节奏密度和情绪转折')
    expect(prompt).toContain('雨巷审讯')
    expect(prompt).toContain('纯背景说明')
    expect(prompt).toContain('样章原句不能照搬')
    expect(prompt).toContain('你以为这就结束了吗')
    expect(prompt).toContain('只学习叙述节奏、句式密度、对白比例和情绪转折')
    expect(prompt).toContain('不得复制样章桥段、专有设定、角色名、核心梗或原句')
    expect(prompt).toContain('style_sample_checks 必须覆盖样章策略执行、适用场景、避用场景和复制边界')
  })

  test('carries oh-story daily workflow gates in fallback prose prompt', () => {
    const prompt = buildProsePrompt(
      {
        id: 1,
        title: '剑烛大荒',
        genre: '玄幻',
        style_tags: ['快节奏'],
        length_target: 'long',
      } as any,
      {
        chapter_no: 11,
        title: '归属判定',
        chapter_summary: '主角筛掉无关旧案，只用会影响归属判定的状态追问执事。',
        conflict: '执事试图用旁支背景拖慢节奏。',
        ending_hook: '旧印显示下一名归属人。',
      },
      {
        prevChapters: [
          {
            chapter_no: 10,
            title: '第二枚门牌',
            ending_hook: '第二枚门牌背面出现母亲旧名。',
            chapter_text: '第二枚门牌背面出现了母亲旧名。旧印随即烫住林青禾的指节。',
          },
        ],
      },
    )

    expect(prompt).toContain('oh-story 日更工作流')
    expect(prompt).toContain('只加载/只使用会影响本章正确性的状态')
    expect(prompt).toContain('不知道就会写错')
    expect(prompt).toContain('场景执行门禁')
    expect(prompt).toContain('goal -> obstacle -> action -> turn -> payoff -> state_delta')
    expect(prompt).toContain('status_filter_receipts')
  })

  test('keeps prose drafting scoped to one serial chapter in batch workflows', () => {
    const prompt = buildProsePrompt(
      {
        id: 1,
        title: '剑烛大荒',
        genre: '玄幻',
        style_tags: ['快节奏'],
        length_target: 'long',
      } as any,
      {
        chapter_no: 12,
        title: '旧印归人',
        chapter_summary: '主角确认旧印归属，逼出下一层楼规代价。',
        conflict: '执事要让主角一次交代后续三章安排。',
        ending_hook: '楼规把归属人改成了失踪多年的兄长。',
      },
      {
        prevChapters: [
          {
            chapter_no: 11,
            title: '归属判定',
            ending_hook: '旧印显示下一名归属人。',
            chapter_text: '旧印显示下一名归属人。林青禾把名字念出口，门外的脚步声同时停住。',
          },
        ],
      },
    )

    expect(prompt).toContain('单章串行边界')
    expect(prompt).toContain('本次调用只负责第 12 章')
    expect(prompt).toContain('不得替外层批量流程生成第 13 章或后续章节')
    expect(prompt).toContain('不得把多章同时写入 prose_chapters')
    expect(prompt).toContain('下一章必须等本章正文、oh_story_delivery_receipts 和状态写回落库后')
    expect(prompt).toContain('由外层工作流重新构建上下文包')
  })

  test('injects next-chapter quality continuity plan into fallback prose prompt', () => {
    const prompt = buildProsePrompt(
      {
        id: 1,
        title: '剑烛大荒',
        genre: '玄幻',
        style_tags: ['快节奏'],
        length_target: 'long',
      } as any,
      {
        chapter_no: 13,
        title: '兄长归名',
        chapter_summary: '主角追查旧印把归属人改成兄长后的真实代价。',
        conflict: '执事要把兄长名字解释成旧档误录。',
        ending_hook: '旧档上的兄长名字开始渗血。',
      },
      {
        preDraftBrief: {
          nextChapterQualityPlan: {
            qualityFocus: ['开篇承接要直接处理兄长归名', '中段必须形成规则反证'],
            openingActions: ['前300字让主角用旧印核验兄长名字'],
            middleActions: ['让执事误录说法被旧档渗血反驳'],
            endingActions: ['章末露出兄长仍活着的行动证据'],
            avoidRepetition: ['不要再用“这只是开始”总结式收尾'],
            evidenceBasis: ['上一章 S2：章末钩子强但缺少下一章开篇动作'],
          },
        },
      } as any,
    )

    expect(prompt).toContain('【oh-story 质量续航】')
    expect(prompt).toContain('开篇承接要直接处理兄长归名')
    expect(prompt).toContain('前300字让主角用旧印核验兄长名字')
    expect(prompt).toContain('让执事误录说法被旧档渗血反驳')
    expect(prompt).toContain('章末露出兄长仍活着的行动证据')
    expect(prompt).toContain('不要再用“这只是开始”总结式收尾')
    expect(prompt).toContain('上一章 S2：章末钩子强但缺少下一章开篇动作')
    expect(prompt).toContain('next_chapter_quality_plan_receipts')
  })
})
