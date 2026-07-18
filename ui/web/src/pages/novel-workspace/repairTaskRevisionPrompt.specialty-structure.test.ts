import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import {
  buildDeliveryRiskRevisionClosurePlan,
  buildRepairTaskRevisionPrompt,
  listQualityContractRequiredFields,
  listQualityContractRequiredFieldKeys,
} from './repairTaskRevisionPrompt'

describe('buildRepairTaskRevisionPrompt specialty/structure', () => {
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
