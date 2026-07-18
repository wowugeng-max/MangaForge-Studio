import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  buildReviewAnnotations,
  buildReviewAnnotationRepairTasks,
  buildStorylineDiffDecisionRepairTasks,
  buildChapterDeliveryRiskBrief,
  buildChapterQualityCard,
  buildDeliveryRiskConvergenceReport,
  buildEditorReportPrompt,
  buildCompactEditorRevisionPrompt,
  buildEditorRevisionPrompt,
  buildStorylineDiffDecisionReviewPayload,
  applySurgicalRevisionPatch,
  isRevisionOutputTruncated,
} from './novel-editor-routes'


function editorBuildersSource() {
  const dir = join(import.meta.dir, 'novel-editor')
  return [
    'builders.ts',
    'builders-annotations.ts',
    'builders-annotations-prose-quality.ts',
    'builders-annotations-prose-quality-types.ts',
    'builders-annotations-prose-quality-core.ts',
    'builders-annotations-prose-quality-craft.ts',
    'builders-annotations-prose-quality-audience.ts',
    'builders-annotations-delivery-risk.ts',
    'builders-annotations-repair-tasks.ts',
  ].map(name => readFileSync(join(dir, name), 'utf8')).join('\n')
}
describe('review annotations delivery risk repair tasks b b', () => {
  test('turns information load and longform misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '旧印压阵', chapter_text: '正文', ending_hook: '长老席要求追查内库阵图源头。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 75,
        review_type: 'prose_quality',
        summary: '信息负载和长篇连续性存在缺口',
        created_at: '2026-06-08T03:54:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 80,
          passed: false,
          self_check: {
            review: {
              information_checks: [
                {
                  key: 'concept_overload',
                  label: '信息负载',
                  status: 'fail',
                  evidence: '本章一次性解释三套阵法、两条宗门规则和旧印来历，信息没有跟着冲突走，读者还没看到动作就被设定淹没。',
                  fix: '压缩新概念到三个以内，把旧印规则放进质疑、触发、证据核对和冲突反馈里释放。',
                },
              ],
              longform_checks: [
                {
                  key: 'recent_progress_stalled',
                  label: '长篇连续性',
                  status: 'warn',
                  evidence: '最近5章都在解释旧印背景，没有明确进展，爽点间隔过长，读者看不到阶段目标推进。',
                  fix: '补最近5章的阶段位移、爽点间隔和下一阶段目标，让本章承接前文并推动后续。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const informationAnnotation = annotations.find((item: any) => item.kind === 'information_load_gap')
    const longformAnnotation = annotations.find((item: any) => item.kind === 'longform_continuity_gap')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(informationAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '信息负载',
      kind: 'information_load_gap',
      title: '信息负载缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(longformAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '长篇连续性',
      kind: 'longform_continuity_gap',
      title: '长篇连续性缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(result.tasks.map((task: any) => task.issue_type)).toEqual(['information_load_gap', 'longform_continuity_gap'])
    expect(result.tasks[0].information_load_sync.missed[0].text).toContain('信息没有跟着冲突走')
    expect(result.tasks[0].acceptance_criteria).toContain('information_checks 复检通过，missed_count=0')
    expect(result.tasks[1].longform_continuity_sync.missed[0].text).toContain('最近5章')
    expect(result.tasks[1].acceptance_criteria).toContain('longform_checks 复检通过，missed_count=0')
  })

  test('turns core contract and continuity heat misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '广播室名单', chapter_text: '正文', ending_hook: '广播来源忽然改写。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '规则夜校' }, [chapter], [
      {
        id: 76,
        review_type: 'prose_quality',
        summary: '核心契约和连续性热度存在缺口',
        created_at: '2026-06-08T03:58:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 79,
          passed: false,
          self_check: {
            review: {
              core_contract_checks: [
                {
                  key: 'theme_unity_rules',
                  label: '核心契约',
                  status: 'fail',
                  evidence: '本章追逐支线宝物，主角没有服务规则反制的核心承诺，小情绪没有服从全书核心情绪，章尾也没有回到主线问题。',
                  fix: '把支线宝物改成规则判定证据，让主角用规则反制兑现核心承诺，并把章尾问题压回全书核心情绪。',
                },
              ],
              continuity_heat_checks: [
                {
                  key: 'cold_recall_without_warmup',
                  label: '连续性热度',
                  status: 'warn',
                  evidence: '旧印作为 hot 元素本章只提名字没有推进，盟友关系 warm 元素断温，cold 伏笔突然回收前没有升温。',
                  fix: '让旧印触发新证据推进，补盟友站队或质疑保持关系热度，cold 回收前先给一处可见升温。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const coreContractAnnotation = annotations.find((item: any) => item.kind === 'core_contract_gap')
    const continuityHeatAnnotation = annotations.find((item: any) => item.kind === 'continuity_heat_gap')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(coreContractAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '核心契约',
      kind: 'core_contract_gap',
      title: '核心契约缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(continuityHeatAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '连续性热度',
      kind: 'continuity_heat_gap',
      title: '连续性热度缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(result.tasks.map((task: any) => task.issue_type)).toEqual(['core_contract_gap', 'continuity_heat_gap'])
    expect(result.tasks[0].core_contract_check_sync.missed[0].text).toContain('核心承诺')
    expect(result.tasks[0].acceptance_criteria).toContain('core_contract_checks 复检通过，missed_count=0')
    expect(result.tasks[1].continuity_heat_sync.missed[0].text).toContain('cold 伏笔突然回收前没有升温')
    expect(result.tasks[1].acceptance_criteria).toContain('continuity_heat_checks 复检通过，missed_count=0')
  })

  test('turns revision receipt and deslop repair misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '重修广播室', chapter_text: '正文', ending_hook: '广播声重新响起。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '规则夜校' }, [chapter], [
      {
        id: 77,
        review_type: 'prose_quality',
        summary: '修订回执和去AI味修复回执存在缺口',
        created_at: '2026-06-08T04:05:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 78,
          passed: false,
          self_check: {
            review: {
              revision_receipt_checks: [
                {
                  key: 'prose_revision_receipt_sync',
                  label: '修订回执未闭环',
                  status: 'fail',
                  evidence: 'delivery_risk_receipts 要求修正文首钩子，但 revision_receipts 没有给 changed_evidence。',
                  fix: '重新输出 revision_receipts，逐条写清 required_action、repair_segment、applied_fix 和 changed_evidence。',
                },
              ],
              deslop_repair_checks: [
                {
                  key: 'deslop_repair_receipt_sync',
                  label: '去AI味修复回执未闭环',
                  status: 'warn',
                  evidence: 'Gate E 模板化对白仍残留，但 deslop_repair_receipts 没有引用修订后正文证据。',
                  fix: '重修 Gate E 对话腔调，并在 deslop_repair_receipts.changed_evidence 中引用修订后对白。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const revisionReceiptAnnotation = annotations.find((item: any) => item.kind === 'revision_receipt_gap')
    const deslopRepairAnnotation = annotations.find((item: any) => item.kind === 'deslop_repair_gap')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(revisionReceiptAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '修订回执',
      kind: 'revision_receipt_gap',
      title: '修订回执缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(deslopRepairAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '去AI味修复',
      kind: 'deslop_repair_gap',
      title: '去AI味修复缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(result.tasks.map((task: any) => task.issue_type)).toEqual(['revision_receipt_gap', 'deslop_repair_gap'])
    expect(result.tasks[0].revision_receipt_check_sync.missed[0].text).toContain('changed_evidence')
    expect(result.tasks[0].acceptance_criteria).toContain('revision_receipt_checks 复检通过，missed_count=0')
    expect(result.tasks[1].deslop_repair_check_sync.missed[0].text).toContain('Gate E')
    expect(result.tasks[1].acceptance_criteria).toContain('deslop_repair_checks 复检通过，missed_count=0')
  })

  test('turns prose meta and serial risk repair misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '连更复检', chapter_text: '正文', ending_hook: '下一场危机压到门口。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '规则夜校' }, [chapter], [
      {
        id: 78,
        review_type: 'prose_quality',
        summary: '正文元叙事和连续风险修复存在缺口',
        created_at: '2026-06-08T04:10:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 77,
          passed: false,
          self_check: {
            review: {
              prose_meta_checks: [
                {
                  key: 'meta_narration_leak',
                  label: '正文元叙事',
                  status: 'fail',
                  evidence: '正文出现“这一章主要用来铺垫后续反转”这类作者说明，破坏读者沉浸。',
                  fix: '删除作者说明，把铺垫改成角色当场看到的证据、误判或行动后果。',
                },
              ],
              serial_risk_repair_checks: [
                {
                  key: 'scene_serial_risk_unrepaired',
                  label: '连续风险修复',
                  status: 'warn',
                  evidence: '安全批量标记场景承接风险，但修订稿没有补 scene_serial_risk_repair_receipt。',
                  fix: '补齐连续生产风险修复回执，并把场景承接变化落到正文证据。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const proseMetaAnnotation = annotations.find((item: any) => item.kind === 'prose_meta_gap')
    const serialRiskAnnotation = annotations.find((item: any) => item.kind === 'serial_risk_repair_gap')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(proseMetaAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '正文元叙事',
      kind: 'prose_meta_gap',
      title: '正文元叙事缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(serialRiskAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '连续风险修复',
      kind: 'serial_risk_repair_gap',
      title: '连续风险修复缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(result.tasks.map((task: any) => task.issue_type)).toEqual(['prose_meta_gap', 'serial_risk_repair_gap'])
    expect(result.tasks[0].prose_meta_sync.missed[0].text).toContain('作者说明')
    expect(result.tasks[0].acceptance_criteria).toContain('prose_meta_checks 复检通过，missed_count=0')
    expect(result.tasks[1].serial_risk_repair_sync.missed[0].text).toContain('场景承接风险')
    expect(result.tasks[1].acceptance_criteria).toContain('serial_risk_repair_checks 复检通过，missed_count=0')
  })

  test('turns chapter hook quality misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 8, title: '连更复检', chapter_text: '正文', ending_hook: '下一场危机压到门口。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '规则夜校' }, [chapter], [
      {
        id: 79,
        review_type: 'prose_quality',
        summary: '章钩质量存在缺口',
        created_at: '2026-06-08T04:20:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 8,
          score: 77,
          passed: false,
          self_check: {
            review: {
              chapter_hook_quality_checks: [
                {
                  key: 'ending_hook_weak_pull',
                  label: '章钩质量',
                  status: 'warn',
                  evidence: '章尾只写“新的麻烦来了”，没有具体问题、危险、选择或下一章行动压力。',
                  fix: '把章尾改成可追读的具体未解问题，并和下一章行动直接相连。',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const hookQualityAnnotation = annotations.find((item: any) => item.kind === 'chapter_hook_quality_gap')
    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(hookQualityAnnotation).toMatchObject({
      source: 'prose_quality',
      source_label: '章钩质量',
      kind: 'chapter_hook_quality_gap',
      title: '章钩质量缺口 1',
      chapter_id: 7,
      chapter_no: 8,
    })
    expect(result.tasks.map((task: any) => task.issue_type)).toEqual(['chapter_hook_quality_gap'])
    expect(result.tasks[0].chapter_hook_quality_sync.missed[0].text).toContain('章尾只写')
    expect(result.tasks[0].acceptance_criteria).toContain('chapter_hook_quality_checks 复检通过，missed_count=0')
  })

  test('turns generic quality audit annotations into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '盟友改口', chapter_text: '正文', ending_hook: '盟友忽然停下。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 43,
        review_type: 'prose_quality',
        summary: '目的词详略失衡',
        created_at: '2026-06-08T03:10:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          self_check: {
            review: {
              score: 82,
              passed: false,
              status: 'warn',
              quality_audit_checks: [
                {
                  key: 'purpose_tag_density_gap',
                  label: '目的词详略分配',
                  status: 'fail',
                  evidence: '爽点场景只用一句摘要带过，过渡场景反而展开三段环境描写。',
                  fix: '按目的词重排详略：爽点/打脸展开出手过程，过渡压缩到1-2句。',
                  strategy: 'rewrite',
                },
              ],
            },
          },
        }),
      },
    ]).annotations

    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('purpose_tag_density_gap')
    expect(result.tasks[0].annotation_category).toBe('quality_audit')
    expect(result.tasks[0].message).toContain('爽点场景只用一句摘要带过')
    expect(result.tasks[0].action).toContain('目的词')
    expect(result.tasks[0].action).toContain('五维评分')
    expect(result.tasks[0].acceptance_criteria).toContain('quality_audit_checks 里的 fail/warn 项已清零')
    expect(result.tasks[0].payload.checks[0].fix).toContain('爽点/打脸展开')
  })

  test('turns quality audit repair receipt annotations into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '盟友改口', chapter_text: '正文', ending_hook: '盟友忽然停下。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 44,
        review_type: 'quality_audit_repair_receipt_sync',
        summary: '质量诊断修复回执缺口',
        created_at: '2026-06-08T03:11:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          quality_audit_repair_receipt_sync: {
            status: 'warn',
            label: '质量诊断修复回执缺口 1',
            summary: '质量诊断修复执行后，仍有 1 项缺口没有形成回执证据。',
            missed_count: 1,
            receipt_count: 2,
            missed: [
              { label: '目的词详略分配', text: 'original_evidence 有问题，但 changed_evidence 为空。' },
            ],
            next_actions: ['重新修订并逐条输出 quality_audit_repair_receipts.changed_evidence。'],
          },
        }),
      },
    ]).annotations

    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('quality_audit_repair_receipt')
    expect(result.tasks[0].annotation_category).toBe('quality_audit_repair_receipt')
    expect(result.tasks[0].source_label).toBe('质量回执')
    expect(result.tasks[0].message).toContain('changed_evidence 为空')
    expect(result.tasks[0].action).toContain('quality_audit_repair_receipts.changed_evidence')
    expect(result.tasks[0].acceptance_criteria).toContain('quality_audit_repair_receipt_sync 复检通过，missed_count=0')
    expect(result.tasks[0].acceptance_criteria).toContain('quality_audit_repair_receipts.changed_evidence 能在修订后正文定位')
    expect(result.tasks[0].payload.missed[0].text).toContain('changed_evidence 为空')
  })

  test('turns deslop repair receipt annotations into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '盟友改口', chapter_text: '正文', ending_hook: '盟友忽然停下。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 45,
        review_type: 'deslop_repair_receipt_sync',
        summary: '去AI味修复回执残留',
        created_at: '2026-06-08T03:12:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          deslop_repair_receipt_sync: {
            status: 'warn',
            label: '去AI味修复回执残留 1',
            summary: '去AI味修复后仍有 1 项残留风险需要继续处理。',
            missed_count: 1,
            receipt_count: 2,
            missed: [
              { label: 'Gate B 句式套路', text: 'changed_evidence 为空，无法证明连续主语问题已修。' },
            ],
            next_actions: ['重新复核去AI味修复结果，并逐条输出 deslop_repair_receipts.changed_evidence。'],
          },
        }),
      },
    ]).annotations

    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('deslop_repair_receipt')
    expect(result.tasks[0].annotation_category).toBe('deslop_repair_receipt')
    expect(result.tasks[0].source_label).toBe('去AI味回执')
    expect(result.tasks[0].message).toContain('连续主语问题')
    expect(result.tasks[0].action).toContain('deslop_repair_receipts.changed_evidence')
    expect(result.tasks[0].acceptance_criteria).toContain('deslop_repair_receipt_sync 复检通过，missed_count=0')
    expect(result.tasks[0].acceptance_criteria).toContain('deslop_repair_receipts.changed_evidence 能在修订后正文定位')
    expect(result.tasks[0].payload.missed[0].text).toContain('连续主语问题')
  })

  test('turns revision cascade and scope guard annotations into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '盟友改口', chapter_text: '正文', ending_hook: '盟友忽然停下。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 46,
        review_type: 'revision_cascade_impact_sync',
        summary: '修订级联影响',
        created_at: '2026-06-08T03:13:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          revision_cascade_impact_sync: {
            status: 'warn',
            label: '修订级联影响 2',
            summary: '本章修订产生 2 项会影响后续章节的同步义务。',
            missed_count: 2,
            missed: [
              { target: '令牌背面血字', text: '令牌状态改变会影响第8章开篇交接。', required_action: '下一章先同步令牌新状态。' },
            ],
            next_actions: ['下一章或后续章节必须先同步修订后的伏笔、时间线、角色状态、资产归属和关系边界。'],
          },
        }),
      },
      {
        id: 47,
        review_type: 'revision_scope_guard_sync',
        summary: '修订幅度过大',
        created_at: '2026-06-08T03:14:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          revision_scope_guard_sync: {
            status: 'warn',
            label: '修订幅度过大 1200',
            summary: '修订前后字数差异 1200 字，超过警戒线 800 字。',
            missed_count: 1,
            missed: [
              { label: '修订幅度过大', text: '修订扩写 1200 字，超过允许差异 800 字。' },
            ],
            next_actions: ['下一轮修订不要重写整章；只按自检证据和修订回执残留做局部修复。'],
          },
        }),
      },
    ]).annotations

    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(result.tasks.map((task: any) => task.issue_type)).toEqual([
      'revision_cascade_impact',
      'revision_scope_guard',
    ])
    expect(result.tasks[0].acceptance_criteria).toContain('revision_cascade_impact_sync 复检通过，missed_count=0')
    expect(result.tasks[0].acceptance_criteria).toContain('后续章节已同步修订后的伏笔、时间线、角色状态、资产归属或关系边界')
    expect(result.tasks[1].acceptance_criteria).toContain('revision_scope_guard_sync 复检通过，missed_count=0')
    expect(result.tasks[1].acceptance_criteria).toContain('修订前后字数差异回到 max(原文 30%, 800 字) 警戒线内')
  })

  test('turns prose revision receipt sync misses into longform repair tasks', () => {
    const chapter = { id: 7, chapter_no: 3, title: '盟友改口', chapter_text: '正文', ending_hook: '盟友忽然停下。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '阵师归来' }, [chapter], [
      {
        id: 48,
        review_type: 'prose_revision_receipt_sync',
        summary: '修订回执残留',
        created_at: '2026-06-08T03:15:00.000Z',
        payload: JSON.stringify({
          chapter_id: 7,
          chapter_no: 3,
          prose_revision_receipt_sync: {
            status: 'warn',
            label: '修订回执残留 1',
            summary: 'delivery_risk_receipts 有失败项，但 revision_receipts 没有对应修订证据。',
            missed_count: 1,
            missed: [
              {
                category: 'delivery_risk_receipt',
                required_action: '章末把带血腰牌变成新的未解问题。',
                repair_segment: 'ending_actions',
                text: '最后300字没有形成追读钩子。',
              },
            ],
            next_actions: [
              '补齐 delivery_risk_receipts 对应的 revision_receipts；每条必须写 required_action、repair_segment、applied_fix 和 changed_evidence。',
            ],
          },
        }),
      },
    ]).annotations

    const result = buildReviewAnnotationRepairTasks(annotations)

    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].issue_type).toBe('prose_revision_receipt_sync')
    expect(result.tasks[0].annotation_category).toBe('prose_revision_receipt')
    expect(result.tasks[0].source_label).toBe('修订回执')
    expect(result.tasks[0].message).toContain('最后300字没有形成追读钩子')
    expect(result.tasks[0].action).toContain('delivery_risk_receipts 对应的 revision_receipts')
    expect(result.tasks[0].acceptance_criteria).toContain('prose_revision_receipt_sync 复检通过，missed_count=0')
    expect(result.tasks[0].acceptance_criteria).toContain('revision_receipts 逐条对应 delivery_risk_receipts 的失败项')
    expect(result.tasks[0].payload.missed[0].repair_segment).toBe('ending_actions')
  })

  test('turns single-chapter governance recheck misses into recovery evidence repair tasks', () => {
    const chapter = { id: 42, chapter_no: 42, title: '旧证重审', chapter_text: '正文', ending_hook: '旧账本出现第二个签名。' }
    const annotations = buildReviewAnnotations({ id: 5, title: '超人的规则怪谈世界' }, [chapter], [
      {
        id: 31,
        review_type: 'governance_recheck_sync',
        created_at: '2026-06-13T08:00:00.000Z',
        payload: JSON.stringify({
          chapter_id: 42,
          chapter_no: 42,
          governance_recheck_sync: {
            status: 'warn',
            label: '恢复依据缺口 2',
            missed_count: 2,
            failed_evidence: ['第42章对白交锋已补回样章节奏'],
            watch_items: ['下一章继续观察样章策略命中率'],
            summary: '单章交稿未继承治理复查记忆。',
          },
        }),
      },
    ]).annotations

    const recoveryAnnotation = annotations.find((item: any) => item.kind === 'recovery_evidence_mismatch')
    const result = buildReviewAnnotationRepairTasks(annotations, [])

    expect(recoveryAnnotation?.category).toBe('recovery_evidence')
    expect(recoveryAnnotation?.title).toBe('恢复依据缺口 2')
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0]).toEqual(expect.objectContaining({
      issue_type: 'recovery_evidence_mismatch',
      annotation_category: 'recovery_evidence',
      chapter_id: 42,
      chapter_no: 42,
    }))
    expect(result.tasks[0].message).toContain('第42章对白交锋已补回样章节奏')
    expect(result.tasks[0].action).toContain('治理复查记忆')
    expect(result.tasks[0].recovery_evidence_review.failed_evidence).toContain('第42章对白交锋已补回样章节奏')
    expect(result.tasks[0].recovery_evidence_review.watch_items).toContain('下一章继续观察样章策略命中率')
  })

})
