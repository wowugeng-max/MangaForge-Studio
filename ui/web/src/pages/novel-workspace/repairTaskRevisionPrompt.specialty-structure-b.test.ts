import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import {
  buildDeliveryRiskRevisionClosurePlan,
  buildRepairTaskRevisionPrompt,
  listQualityContractRequiredFields,
  listQualityContractRequiredFieldKeys,
} from './repairTaskRevisionPrompt'

describe('buildRepairTaskRevisionPrompt specialty/structure b', () => {
  test('keeps banned words repair tasks open until banned word checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'banned_words_gap',
        annotation_category: 'banned_words',
        annotation_key: 'prose_quality:202:12:12:banned_words_gap:禁用词',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            banned_words_checks: [
              {
                key: 'level_1_banned_word',
                label: '一级禁用词',
                status: 'warn',
                evidence: '正文仍出现“眼中闪过一丝”。',
                fix: '改成具体动作或对白。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('禁用词扫描仍未闭环')
    expect(residual.note).toContain('一级禁用词')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'banned_words_gap',
        annotation_category: 'banned_words',
        annotation_key: 'prose_quality:202:12:12:banned_words_gap:禁用词',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            banned_words_checks: [
              {
                key: 'level_1_banned_word',
                label: '一级禁用词',
                status: 'pass',
                evidence: '修订稿已替换命中词，复扫为 0。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.annotationStatus).toBe('')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('matched_word')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'banned_words_gap',
        annotation_category: 'banned_words',
        annotation_key: 'prose_quality:202:12:12:banned_words_gap:禁用词',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            banned_words_checks: [
              {
                key: 'level_1_banned_word',
                label: '一级禁用词',
                status: 'pass',
                matched_word: '眼中闪过一丝',
                level: 'level_1',
                location: '第12章第18段',
                replacement: '他指节扣紧旧印，没再看执事。',
                evidence: '修订稿已替换命中词，复扫为 0。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('禁用词扫描复检通过')
    expect(cleared.note).toContain('banned_words_checks')
  })

  test('keeps blueprint consumption repair tasks open until outline checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'blueprint_consumption_gap',
        annotation_category: 'blueprint_consumption',
        annotation_key: 'prose_quality:202:12:12:blueprint_consumption_gap:细纲兑现',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            blueprint_consumption_checks: [
              {
                key: 'character_order_missing',
                label: '人物关系/出场顺序',
                status: 'warn',
                evidence: '盟友改口没有按细纲出现在反证之后。',
                fix: '补出反证后盟友改口的现场对白和旁观反馈。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('细纲兑现仍未闭环')
    expect(residual.note).toContain('人物关系/出场顺序')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'blueprint_consumption_gap',
        annotation_category: 'blueprint_consumption',
        annotation_key: 'prose_quality:202:12:12:blueprint_consumption_gap:细纲兑现',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            blueprint_consumption_checks: [
              {
                key: 'character_order_missing',
                label: '人物关系/出场顺序',
                status: 'pass',
                evidence: '反证后盟友改口已落成对白和旁观反馈。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.annotationStatus).toBe('')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('blueprint_field')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'blueprint_consumption_gap',
        annotation_category: 'blueprint_consumption',
        annotation_key: 'prose_quality:202:12:12:blueprint_consumption_gap:细纲兑现',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            blueprint_consumption_checks: [
              {
                key: 'character_order_missing',
                label: '人物关系/出场顺序',
                status: 'pass',
                blueprint_field: 'character_order',
                expected: '反证后盟友改口，并触发旁观者反馈。',
                delivered_evidence: '反证后盟友改口已落成对白和旁观反馈。',
                missing_gap: '无缺口',
                evidence: '反证后盟友改口已落成对白和旁观反馈。',
                fix: '补人物关系/出场顺序的正文兑现证据。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('细纲兑现复检通过')
    expect(cleared.note).toContain('blueprint_consumption_checks')
  })

  test('keeps foreshadowing delta repair tasks open until clue delta checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'foreshadowing_delta_gap',
        annotation_category: 'foreshadowing_delta',
        annotation_key: 'prose_quality:202:12:12:foreshadowing_delta_gap:伏笔增量',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            foreshadowing_delta_checks: [
              {
                key: 'missing_tracking_entry',
                label: '新增伏笔未登记',
                status: 'warn',
                evidence: '带血腰牌首次出现，但追踪/伏笔.md 没有新增记录。',
                fix: '补齐伏笔台账和 source_excerpt。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('伏笔增量仍未闭环')
    expect(residual.note).toContain('新增伏笔未登记')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'foreshadowing_delta_gap',
        annotation_category: 'foreshadowing_delta',
        annotation_key: 'prose_quality:202:12:12:foreshadowing_delta_gap:伏笔增量',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            foreshadowing_delta_checks: [
              {
                key: 'missing_tracking_entry',
                label: '新增伏笔未登记',
                status: 'pass',
                evidence: '带血腰牌已写入追踪/伏笔.md，并带 source_excerpt。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.annotationStatus).toBe('')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('clue_name')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'foreshadowing_delta_gap',
        annotation_category: 'foreshadowing_delta',
        annotation_key: 'prose_quality:202:12:12:foreshadowing_delta_gap:伏笔增量',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            foreshadowing_delta_checks: [
              {
                key: 'missing_tracking_entry',
                label: '新增伏笔未登记',
                status: 'pass',
                clue_name: '带血腰牌',
                delta_type: '新增',
                current_status: '已埋下，未回收',
                chapter: '第12章',
                source_excerpt: '主角在禁门下拾起带血腰牌。',
                ledger_path: '追踪/伏笔.md',
                evidence: '带血腰牌已写入追踪/伏笔.md，并带 source_excerpt。',
                fix: '补伏笔名、增量类型、当前状态、章节、来源摘录和台账路径。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('伏笔增量复检通过')
    expect(cleared.note).toContain('foreshadowing_delta_checks')
  })

  test('keeps title uniqueness repair tasks open until duplicate titles clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'title_uniqueness_gap',
        annotation_category: 'title_uniqueness',
        annotation_key: 'prose_quality:202:8:8:title_uniqueness_gap:标题去重',
      },
      {
        quality_refresh: {
          ok: true,
          score: 86,
          review: {
            title_uniqueness_checks: [
              {
                key: 'duplicate_chapter_title',
                label: '重复标题',
                status: 'warn',
                evidence: '第8章《暗门》与第3章标题重复。',
                fix: '按本章核心事件重新命名，并同步细纲标题和正文文件名。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('标题去重仍未闭环')
    expect(residual.note).toContain('重复标题')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'title_uniqueness_gap',
        annotation_category: 'title_uniqueness',
        annotation_key: 'prose_quality:202:8:8:title_uniqueness_gap:标题去重',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            title_uniqueness_checks: [
              {
                key: 'duplicate_chapter_title',
                label: '重复标题',
                status: 'pass',
                evidence: '第8章已改为《湿校牌》，细纲标题和正文文件名同步完成。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.annotationStatus).toBe('')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('old_title')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'title_uniqueness_gap',
        annotation_category: 'title_uniqueness',
        annotation_key: 'prose_quality:202:8:8:title_uniqueness_gap:标题去重',
      },
      {
        quality_refresh: {
          ok: true,
          score: 89,
          review: {
            title_uniqueness_checks: [
              {
                key: 'duplicate_chapter_title',
                label: '重复标题',
                status: 'pass',
                old_title: '暗门',
                new_title: '湿校牌',
                outline_title_synced: true,
                file_name_synced: true,
                chapter_title_line_synced: true,
                evidence: '第8章已改为《湿校牌》，细纲标题和正文文件名同步完成。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('标题去重复检通过')
    expect(cleared.note).toContain('title_uniqueness_checks')
  })

  test('keeps deterministic cleanup repair tasks open until cleanup risks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'deterministic_cleanup_gap',
        annotation_category: 'deterministic_cleanup',
        annotation_key: 'prose_quality:202:12:12:deterministic_cleanup_gap:确定性清理',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            deterministic_prose_cleanup: {
              status: 'warn',
              risk_count: 2,
              label: '确定性清理残留',
              categories: [
                { label: '长省略号', count: 1, evidence: '“他沉默了……”' },
                { label: '高危 AI 句式', count: 1, evidence: '不是没有可能，而是必须立刻去做。' },
              ],
            },
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.annotationStatus).toBe('')
    expect(residual.note).toContain('确定性清理仍未闭环')
    expect(residual.note).toContain('确定性清理残留')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'deterministic_cleanup_gap',
        annotation_category: 'deterministic_cleanup',
        annotation_key: 'prose_quality:202:12:12:deterministic_cleanup_gap:确定性清理',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            deterministic_prose_cleanup: {
              status: 'ok',
              risk_count: 0,
              label: '确定性清理通过',
            },
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('确定性清理复检通过')
    expect(cleared.note).toContain('deterministic_prose_cleanup.risk_count 为 0')
  })

  test('keeps serial risk repair tasks open until serial risk repair checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'serial_risk_repair_gap',
        annotation_category: 'serial_risk_repair',
        annotation_key: 'prose_quality:202:12:12:serial_risk_repair_gap:连续风险修复',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            serial_risk_repair_checks: [
              {
                key: 'scene_serial_risk_unrepaired',
                label: '连续风险修复',
                status: 'warn',
                evidence: '场景承接风险仍未补回执。',
                fix: '补 scene_serial_risk_repair_receipt。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.note).toContain('连续风险修复仍未闭环')
    expect(residual.note).toContain('场景承接风险')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'serial_risk_repair_gap',
        annotation_category: 'serial_risk_repair',
        annotation_key: 'prose_quality:202:12:12:serial_risk_repair_gap:连续风险修复',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            serial_risk_repair_checks: [
              {
                key: 'scene_serial_risk_unrepaired',
                label: '连续风险修复',
                status: 'pass',
                evidence: '修订稿补齐连续生产风险修复回执，并让场景承接变化落到正文证据。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.annotationStatus).toBe('')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('risk_type')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'serial_risk_repair_gap',
        annotation_category: 'serial_risk_repair',
        annotation_key: 'prose_quality:202:12:12:serial_risk_repair_gap:连续风险修复',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            serial_risk_repair_checks: [
              {
                key: 'scene_serial_risk_unrepaired',
                label: '连续风险修复',
                status: 'pass',
                risk_type: 'scene_continuity',
                repair_receipt: 'scene_serial_risk_repair_receipt 已写入',
                continuity_change: '上一章禁门压力承接到本章验印动作',
                state_change: '主角从被审转为临时追查者',
                evidence: '修订稿补齐连续生产风险修复回执，并让场景承接变化落到正文证据。',
                fix: '补风险类型、修复回执、连续性变化和状态变化。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('连续风险修复复检通过')
    expect(cleared.note).toContain('serial_risk_repair_checks')
  })

  test('keeps chapter hook quality repair tasks open until chapter hook quality checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'chapter_hook_quality_gap',
        annotation_category: 'chapter_hook_quality',
        annotation_key: 'prose_quality:202:12:12:chapter_hook_quality_gap:章钩质量',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            chapter_hook_quality_checks: [
              {
                key: 'ending_hook_weak_pull',
                label: '章钩质量',
                status: 'warn',
                evidence: '章尾没有下一章行动压力。',
                fix: '补具体未解问题。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.note).toContain('章钩质量仍未闭环')
    expect(residual.note).toContain('下一章行动压力')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'chapter_hook_quality_gap',
        annotation_category: 'chapter_hook_quality',
        annotation_key: 'prose_quality:202:12:12:chapter_hook_quality_gap:章钩质量',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            chapter_hook_quality_checks: [
              {
                key: 'ending_hook_weak_pull',
                label: '章钩质量',
                status: 'pass',
                evidence: '章尾补出具体未解问题，并和下一章行动直接相连。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.annotationStatus).toBe('')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('hook_position')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'chapter_hook_quality_gap',
        annotation_category: 'chapter_hook_quality',
        annotation_key: 'prose_quality:202:12:12:chapter_hook_quality_gap:章钩质量',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            chapter_hook_quality_checks: [
              {
                key: 'ending_hook_weak_pull',
                label: '章钩质量',
                status: 'pass',
                hook_position: 'ending',
                trigger_type: 'danger_or_choice',
                concrete_question: '赤炉城供奉为什么和旧钥匙同纹。',
                danger_or_choice: '主角必须在长老席追查前决定是否去赤炉城。',
                next_action_link: '下一章直接进入赤炉城供奉线索追查。',
                evidence: '章尾补出具体未解问题，并和下一章行动直接相连。',
                fix: '补钩子位置、触发类型、具体问题、危险/选择和下一行动链接。',
                remaining_risk: '',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(cleared.taskStatus).toBe('resolved')
    expect(cleared.annotationStatus).toBe('resolved')
    expect(cleared.note).toContain('章钩质量复检通过')
    expect(cleared.note).toContain('chapter_hook_quality_checks')
  })

})
