import { buildReaderContractProgression, formatReaderContractProgressionPrompt } from '../novel-writing/reader-contract-progression'
import { buildGenreProseCardContract, formatGenreProseCardPrompt, listGenreProseCards } from '../novel-writing/genre-prose-cards'
import { buildStoryUnitCard, formatStoryUnitCardPrompt } from '../novel-writing/story-unit-basics'
import { buildOutlineWordBudget, locateOutlineWordBudgetDebt } from '../novel-writing/outline-word-budget'
import { summarizeToxicAiDebt } from '../novel-writing/toxic-ai-pattern-scans'
import { evaluateToxicAiDebtGate } from '../novel-writing/toxic-ai-debt-gate'

/** Productized capability surface for oh-story v0.7 P0-P2 gaps. */
export function createOhStoryCapabilityService() {
  return {
    listCapabilities() {
      return {
        version: 'mangaforge_oh_story_capability_surface_v1',
        p0: [
          { key: 'reader_contract_progression', status: 'available', label: '读者契约+终局储备' },
          { key: 'toxic_ai_debt_gate', status: 'available', label: '毒句式机检与欠账门' },
          { key: 'genre_prose_cards', status: 'available', label: '题材散文卡' },
        ],
        p1: [
          { key: 'story_unit_card', status: 'available', label: '剧情单元卡统一' },
          { key: 'outline_word_budget', status: 'available', label: '细纲密疏字数预算' },
          { key: 'adoption_progress', status: 'available', label: 'v0.7 迁移台账' },
        ],
        p2: [
          { key: 'long_analyze', status: 'scaffold', label: '长篇拆文流水线' },
          { key: 'long_scan', status: 'scaffold', label: '长篇扫榜' },
          { key: 'story_import', status: 'scaffold', label: '逆向导入' },
          { key: 'story_cover', status: 'scaffold', label: '封面生成' },
          { key: 'short_suite', status: 'scaffold', label: '短篇扫榜/拆文/写作' },
        ],
      }
    },

    buildReaderContract(input: any = {}) {
      return buildReaderContractProgression(input)
    },

    buildGenreCard(input: any = {}) {
      return buildGenreProseCardContract(input)
    },

    listGenreCards() {
      return listGenreProseCards()
    },

    buildStoryUnit(input: any = {}) {
      return buildStoryUnitCard(input)
    },

    buildOutlineBudget(input: any = {}) {
      return buildOutlineWordBudget(input)
    },

    locateBudgetDebt(input: any = {}) {
      return locateOutlineWordBudgetDebt(input)
    },

    scanToxicDebt(text: string) {
      return summarizeToxicAiDebt(text)
    },

    evaluateDebtGate(input: any = {}) {
      return evaluateToxicAiDebtGate(input)
    },

    buildLongAnalyzePlan(input: any = {}) {
      return {
        version: 'oh_story_long_analyze_plan_v1',
        status: 'scaffold',
        title: input.title || input.book_title || '未命名对标书',
        stages: [
          { stage: 1, name: '黄金三章', output: '快速预览报告', required: true },
          { stage: 2, name: '人设与关系', output: '角色/关系拆解', required: true },
          { stage: 3, name: '情绪模块与节奏', output: '剧情/情绪模块.md + 剧情/节奏.md', required: true },
          { stage: 4, name: '全量逐章', output: '章级拆文库', required: false },
        ],
        next_action: '上传或粘贴对标正文后执行 Stage 1，确认后再进入 Stage 2+',
      }
    },

    buildLongScanPlan(input: any = {}) {
      return {
        version: 'oh_story_long_scan_plan_v1',
        status: 'scaffold',
        platform: input.platform || '起点/番茄/晋江',
        data_sources: ['脚本采集', '用户粘贴榜单', '内置趋势知识'],
        fields: ['排名', '书名', '作者', '题材', '字数', '推荐/在读'],
        next_action: '选择平台与榜单类型后采集结构化样本，再提炼题材趋势与可迁移模块',
      }
    },

    buildImportPlan(input: any = {}) {
      return {
        version: 'oh_story_import_plan_v1',
        status: 'scaffold',
        mode: input.mode || 'longform',
        steps: [
          '识别章节切分与标题',
          '抽取角色/势力/设定实体',
          '重建卷纲/细纲与剧情单元',
          '生成追踪：伏笔/时间线/角色状态',
          '产出可续写 writing_bible',
        ],
        next_action: '提供半成品/完本正文后执行逆向解析，不覆盖用户已有更完整资产',
      }
    },

    buildCoverPlan(input: any = {}) {
      return {
        version: 'oh_story_cover_plan_v1',
        status: 'scaffold',
        title: input.title || '未命名',
        author: input.author || '',
        genre: input.genre || '',
        style_hints: ['题材主视觉', '书名可读', '作者署名', '平台封面比例'],
        next_action: '确认书名/作者/题材后调用图像模型生成封面候选',
      }
    },

    buildShortSuitePlan(input: any = {}) {
      return {
        version: 'oh_story_short_suite_plan_v1',
        status: 'scaffold',
        modules: [
          { key: 'short_scan', label: '短篇扫榜', platforms: ['知乎盐言', '七猫', '黑岩', '点众'] },
          { key: 'short_analyze', label: '短篇拆文', focus: ['故事核', '反转', '情绪拉扯'] },
          { key: 'short_write', label: '短篇写作', focus: ['建压', '爆点', '落定'] },
        ],
        genre_packs: input.genre_packs || ['世情打脸', '民俗怪谈', '悬疑', '甜宠', '双男主', '沙雕脑洞'],
        next_action: '选择短篇模块与题材包后进入对应流水线',
      }
    },

    formatPromptBundle(input: any = {}) {
      const reader = buildReaderContractProgression(input)
      const genre = buildGenreProseCardContract(input)
      const unit = buildStoryUnitCard(input.story_unit || input)
      return {
        reader_contract_progression: reader,
        genre_prose_card_contract: genre,
        story_unit_card: unit,
        prompt: [
          formatReaderContractProgressionPrompt(reader),
          formatGenreProseCardPrompt(genre),
          formatStoryUnitCardPrompt(unit),
        ].filter(Boolean).join('\n\n'),
      }
    },
  }
}

export type OhStoryCapabilityService = ReturnType<typeof createOhStoryCapabilityService>
