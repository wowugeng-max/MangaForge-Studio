import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import {
  buildDeliveryRiskRevisionClosurePlan,
  buildRepairTaskRevisionPrompt,
  listQualityContractRequiredFields,
  listQualityContractRequiredFieldKeys,
} from './repairTaskRevisionPrompt'

describe('buildRepairTaskRevisionPrompt specialty/structure a', () => {
  test('keeps chapter structure repair tasks open until structure checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'chapter_structure_gap',
        annotation_category: 'chapter_structure',
        annotation_key: 'prose_quality:202:12:12:chapter_structure_gap:章节结构',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            structure_checks: [
              {
                key: 'missing_turning_structure',
                label: '章节结构',
                status: 'warn',
                evidence: '仍缺局势变化和章尾翻页。',
                fix: '补局势变化和新危机。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.note).toContain('章节结构仍未闭环')
    expect(residual.note).toContain('章节结构')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'chapter_structure_gap',
        annotation_category: 'chapter_structure',
        annotation_key: 'prose_quality:202:12:12:chapter_structure_gap:章节结构',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            structure_checks: [
              {
                key: 'missing_turning_structure',
                label: '章节结构',
                status: 'pass',
                evidence: '修订稿已有开头钩子、中段推进、局势变化和章尾翻页。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.note).toContain('章节结构仍未闭环')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('opening_hook')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'chapter_structure_gap',
        annotation_category: 'chapter_structure',
        annotation_key: 'prose_quality:202:12:12:chapter_structure_gap:章节结构',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            structure_checks: [
              {
                key: 'missing_turning_structure',
                label: '章节结构',
                status: 'pass',
                opening_hook: '开篇用阵盘第二道裂纹制造异常和危机。',
                middle_progression: '中段主角用旧印核对阵纹并推动审判转向。',
                situation_change: '长老席从压制转为追查内库阵图。',
                ending_page_turn: '章尾留下内库阵图来源和下一轮追查问题。',
                evidence: '修订稿已有开头钩子、中段推进、局势变化和章尾翻页。',
                fix: '补开头钩子、中段推进、局势变化和章尾翻页。',
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
    expect(cleared.note).toContain('章节结构复检通过')
    expect(cleared.note).toContain('structure_checks')
  })

  test('keeps chapter progression repair tasks open until progression checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'chapter_progression_gap',
        annotation_category: 'chapter_progression',
        annotation_key: 'prose_quality:202:12:12:chapter_progression_gap:章节推进',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            progression_checks: [
              {
                key: 'deletable_chapter',
                label: '章节推进',
                status: 'warn',
                evidence: '删掉这章仍不影响理解。',
                fix: '补本章不可删除的主线变化。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.note).toContain('章节推进仍未闭环')
    expect(residual.note).toContain('章节推进')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'chapter_progression_gap',
        annotation_category: 'chapter_progression',
        annotation_key: 'prose_quality:202:12:12:chapter_progression_gap:章节推进',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            progression_checks: [
              {
                key: 'deletable_chapter',
                label: '章节推进',
                status: 'pass',
                evidence: '修订稿补出不可删除的证据、选择、代价和主线位移。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.note).toContain('章节推进仍未闭环')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('non_deletable_change')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'chapter_progression_gap',
        annotation_category: 'chapter_progression',
        annotation_key: 'prose_quality:202:12:12:chapter_progression_gap:章节推进',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            progression_checks: [
              {
                key: 'deletable_chapter',
                label: '章节推进',
                status: 'pass',
                non_deletable_change: '旧印反证资格让审判结果和后续追查方向改变。',
                mainline_shift: '主线从被审判压制转为追查内库阵图。',
                relationship_or_state_change: '长老席态度从否定转为戒备，主角获得临时资格。',
                compressed_water: '删除不改变理解的过渡说明，把信息并入动作核对。',
                evidence: '修订稿补出不可删除的证据、选择、代价和主线位移。',
                fix: '补不可删除变化、主线位移和关系/状态变化。',
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
    expect(cleared.note).toContain('章节推进复检通过')
    expect(cleared.note).toContain('progression_checks')
  })

  test('keeps information load repair tasks open until information checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'information_load_gap',
        annotation_category: 'information_load',
        annotation_key: 'prose_quality:202:12:12:information_load_gap:信息负载',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            information_checks: [
              {
                key: 'concept_overload',
                label: '信息负载',
                status: 'warn',
                evidence: '信息仍没有跟着冲突走。',
                fix: '把设定说明改成证据核对。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.note).toContain('信息负载仍未闭环')
    expect(residual.note).toContain('信息负载')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'information_load_gap',
        annotation_category: 'information_load',
        annotation_key: 'prose_quality:202:12:12:information_load_gap:信息负载',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            information_checks: [
              {
                key: 'concept_overload',
                label: '信息负载',
                status: 'pass',
                evidence: '修订稿把旧印规则放进质疑、触发、证据核对和冲突反馈里释放。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.note).toContain('信息负载仍未闭环')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('new_concept_count')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'information_load_gap',
        annotation_category: 'information_load',
        annotation_key: 'prose_quality:202:12:12:information_load_gap:信息负载',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            information_checks: [
              {
                key: 'concept_overload',
                label: '信息负载',
                status: 'pass',
                new_concept_count: 2,
                action_bound_info: '旧印规则通过主角触碰阵纹和长老席追问释放。',
                conflict_release: '阵图线索只在审判冲突升级时出现。',
                reader_first_scene: '读者先看到阵纹改色，再理解旧印资格反证规则。',
                evidence: '修订稿把旧印规则放进质疑、触发、证据核对和冲突反馈里释放。',
                fix: '控制新概念数量，并让信息跟冲突和行动走。',
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
    expect(cleared.note).toContain('信息负载复检通过')
    expect(cleared.note).toContain('information_checks')
  })

  test('keeps longform continuity repair tasks open until longform checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'longform_continuity_gap',
        annotation_category: 'longform_continuity',
        annotation_key: 'prose_quality:202:12:12:longform_continuity_gap:长篇连续性',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            longform_checks: [
              {
                key: 'recent_progress_stalled',
                label: '长篇连续性',
                status: 'warn',
                evidence: '最近5章仍没有明确进展。',
                fix: '补阶段位移和爽点间隔。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.note).toContain('长篇连续性仍未闭环')
    expect(residual.note).toContain('长篇连续性')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'longform_continuity_gap',
        annotation_category: 'longform_continuity',
        annotation_key: 'prose_quality:202:12:12:longform_continuity_gap:长篇连续性',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            longform_checks: [
              {
                key: 'recent_progress_stalled',
                label: '长篇连续性',
                status: 'pass',
                evidence: '修订稿补出最近5章阶段位移、爽点间隔和下一阶段目标。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.note).toContain('长篇连续性仍未闭环')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('recent_5_chapter_progress')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'longform_continuity_gap',
        annotation_category: 'longform_continuity',
        annotation_key: 'prose_quality:202:12:12:longform_continuity_gap:长篇连续性',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            longform_checks: [
              {
                key: 'recent_progress_stalled',
                label: '长篇连续性',
                status: 'pass',
                recent_5_chapter_progress: '近5章从被压制推进到拿到临时资格并触发内库阵图追查。',
                payoff_interval: '本章用旧印反证资格补一次明确爽点回报。',
                stage_goal_shift: '阶段目标从自证清白转为追查旧印和内库阵图来源。',
                next_stage_pull: '长老席追查内库阵图牵引下一阶段。',
                context_layer: '承接前章审判压力，并给后续阵图线索保温。',
                evidence: '修订稿补出最近5章阶段位移、爽点间隔和下一阶段目标。',
                fix: '补近5章进展、爽点间隔、阶段目标位移和下一阶段牵引。',
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
    expect(cleared.note).toContain('长篇连续性复检通过')
    expect(cleared.note).toContain('longform_checks')
  })

  test('keeps core contract repair tasks open until core contract checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'core_contract_gap',
        annotation_category: 'core_contract',
        annotation_key: 'prose_quality:202:12:12:core_contract_gap:核心契约',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            core_contract_checks: [
              {
                key: 'theme_unity_rules',
                label: '核心契约',
                status: 'warn',
                evidence: '核心承诺仍没有回到规则反制。',
                fix: '把支线宝物改成规则判定证据。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.note).toContain('核心契约仍未闭环')
    expect(residual.note).toContain('核心契约')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'core_contract_gap',
        annotation_category: 'core_contract',
        annotation_key: 'prose_quality:202:12:12:core_contract_gap:核心契约',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            core_contract_checks: [
              {
                key: 'theme_unity_rules',
                label: '核心契约',
                status: 'pass',
                evidence: '修订稿让主角用规则反制兑现核心承诺，并把章尾问题压回全书核心情绪。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.note).toContain('核心契约仍未闭环')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('core_promise')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'core_contract_gap',
        annotation_category: 'core_contract',
        annotation_key: 'prose_quality:202:12:12:core_contract_gap:核心契约',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            core_contract_checks: [
              {
                key: 'theme_unity_rules',
                label: '核心契约',
                status: 'pass',
                core_promise: '用规则和证据反压不公审判。',
                mainline_service: '旧印和阵图线索都服务主线追查。',
                core_emotion: '被轻视后的尊严回收和规则胜利。',
                rule_judgement: '旧印触发阵纹资格反证，而不是凭空开挂。',
                ending_question: '内库阵图是谁提前动过。',
                evidence: '修订稿让主角用规则反制兑现核心承诺，并把章尾问题压回全书核心情绪。',
                fix: '把支线宝物改成规则判定证据，章尾问题回到核心承诺。',
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
    expect(cleared.note).toContain('核心契约复检通过')
    expect(cleared.note).toContain('core_contract_checks')
  })

  test('keeps continuity heat repair tasks open until continuity heat checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'continuity_heat_gap',
        annotation_category: 'continuity_heat',
        annotation_key: 'prose_quality:202:12:12:continuity_heat_gap:连续性热度',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            continuity_heat_checks: [
              {
                key: 'cold_recall_without_warmup',
                label: '连续性热度',
                status: 'warn',
                evidence: 'cold 伏笔回收前仍没有升温。',
                fix: '先给一处可见升温。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.note).toContain('连续性热度仍未闭环')
    expect(residual.note).toContain('连续性热度')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'continuity_heat_gap',
        annotation_category: 'continuity_heat',
        annotation_key: 'prose_quality:202:12:12:continuity_heat_gap:连续性热度',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            continuity_heat_checks: [
              {
                key: 'cold_recall_without_warmup',
                label: '连续性热度',
                status: 'pass',
                evidence: '修订稿让旧印触发新证据推进，并在 cold 回收前给出可见升温。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(missingContractFields.taskStatus).toBe('needs_review')
    expect(missingContractFields.note).toContain('连续性热度仍未闭环')
    expect(missingContractFields.note).toContain('缺少字段')
    expect(missingContractFields.note).toContain('heat_state')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'continuity_heat_gap',
        annotation_category: 'continuity_heat',
        annotation_key: 'prose_quality:202:12:12:continuity_heat_gap:连续性热度',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            continuity_heat_checks: [
              {
                key: 'cold_recall_without_warmup',
                label: '连续性热度',
                status: 'pass',
                heat_state: 'cold -> warm',
                hot_progress: '旧印触发新证据推进当前章审判线。',
                warm_keepalive: '内库阵图在章尾保温为下一章追查目标。',
                cold_warmup: '回收旧印前先用阵纹改色给可见升温。',
                archived_boundary: '未触碰 archived 休眠支线。',
                evidence: '修订稿让旧印触发新证据推进，并在 cold 回收前给出可见升温。',
                fix: '先升温 cold 伏笔，再推进当前 hot 线索并保温下一章。',
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
    expect(cleared.note).toContain('连续性热度复检通过')
    expect(cleared.note).toContain('continuity_heat_checks')
  })

  test('keeps prose meta repair tasks open until prose meta checks clear', () => {
    const residual = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'prose_meta_gap',
        annotation_category: 'prose_meta',
        annotation_key: 'prose_quality:202:12:12:prose_meta_gap:正文元叙事',
      },
      {
        quality_refresh: {
          ok: true,
          score: 84,
          review: {
            prose_meta_checks: [
              {
                key: 'meta_narration_leak',
                label: '正文元叙事',
                status: 'warn',
                evidence: '正文仍出现作者说明。',
                fix: '删除作者说明。',
              },
            ],
          },
        },
        delivery_risk_convergence: { status: 'cleared', residual_count: 0, label: '风险已清零' },
      },
    )

    expect(residual.taskStatus).toBe('needs_review')
    expect(residual.note).toContain('正文元叙事仍未闭环')
    expect(residual.note).toContain('作者说明')

    const missingContractFields = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'prose_meta_gap',
        annotation_category: 'prose_meta',
        annotation_key: 'prose_quality:202:12:12:prose_meta_gap:正文元叙事',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            prose_meta_checks: [
              {
                key: 'meta_narration_leak',
                label: '正文元叙事',
                status: 'pass',
                evidence: '修订稿删除作者说明，全部改成角色现场证据。',
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
    expect(missingContractFields.note).toContain('matched_term')

    const cleared = buildDeliveryRiskRevisionClosurePlan(
      {
        source: 'review_annotation_risk',
        issue_type: 'prose_meta_gap',
        annotation_category: 'prose_meta',
        annotation_key: 'prose_quality:202:12:12:prose_meta_gap:正文元叙事',
      },
      {
        quality_refresh: {
          ok: true,
          score: 88,
          review: {
            prose_meta_checks: [
              {
                key: 'meta_narration_leak',
                label: '正文元叙事',
                status: 'pass',
                matched_term: '作者说明',
                location: '第12章第34段',
                replacement: '周远抬手按住裂开的审判木，没有再解释。',
                evidence: '修订稿删除作者说明，全部改成角色现场证据。',
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
    expect(cleared.note).toContain('正文元叙事复检通过')
    expect(cleared.note).toContain('prose_meta_checks')
  })

})
