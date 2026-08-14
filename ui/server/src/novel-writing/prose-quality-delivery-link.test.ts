import { describe, expect, test } from 'bun:test'
import {
  detectProgressReplayDirective,
  mergeProseQualityWithDeliveryRisks,
  selectPriorityDeliveryDirectives,
} from './prose-quality-delivery-link'

const CH11_PROSE = `
江哲端起汤碗，在“家人”期待而贪婪的目光中，突然将整碗汤倒在了“爸爸”的头上。
“爸爸”被热汤淋头，瞬间暴怒，身体膨胀，指甲变长，试图撕碎江哲。
江哲不闪不避，任由“爸爸”的利爪抓在自己脖子上，发出刺耳的金属摩擦声。
江哲反手一记耳光，将“爸爸”抽得在地上滚了三圈，牙齿掉了一地。
在这个家里，他不再是被猎杀的羔羊，而是真正的掌权者。
“现在，”江哲缓缓站起身，“开饭时间还没结束。妈妈，汤倒了，我很不开心。为了维持家庭的和睦，你是不是应该，再给我盛一碗？”
“妈妈”颤巍巍地拿起空碗，转身朝着厨房木门走去。
咚、咚、咚。三声沉闷的敲门声在防盗铁门上响了起来。
分针与时针正好在“12”和“10”的位置重合。晚上十点整。
门外的“邻居”，来借东西了。
而此时，“妈妈”正站在厨房门口，手里拿着空碗，僵硬地转过头，用那张没有五官的脸，死死地盯着江哲。
`

const CH12_PROSE_REPLAY = `
“爸爸”被热汤淋头，瞬间暴怒，身体膨胀，指甲变长，试图撕碎江哲。
江哲不闪不避，任由“爸爸”的利爪抓在自己脖子上，发出刺耳的金属摩擦声。
江哲反手一记耳光，将“爸爸”抽得在地上滚了三圈，牙齿掉了一地。
“现在，能好好说话了吗？”江哲敲了敲桌子。
`

const CH12_SEED = {
  id: 72,
  chapter_no: 12,
  chapter_goal: '“爸爸”被热汤淋头，瞬间暴怒，身体膨胀，指甲变长，试图撕碎江哲。江哲反手一记耳光。',
  chapter_summary: '利爪与耳光的正面对决。',
  conflict: '“爸爸”的暴走与江哲物理耳光的正面交锋。',
  chapter_text: CH12_PROSE_REPLAY,
}

const CH11 = {
  id: 71,
  chapter_no: 11,
  chapter_text: CH11_PROSE,
}

describe('prose quality delivery link', () => {
  test('detects progress replay from ch11 overshoot vs ch12 dining fight', () => {
    const hit = detectProgressReplayDirective({
      previousChapter: CH11,
      chapter: CH12_SEED,
    })
    expect(hit).toMatchObject({
      key: 'progress_replay',
      severity: 'high',
    })
    expect(hit?.directive).toMatch(/不要回放|禁止回放|已兑现|掌权|敲门|邻居|空碗/)
  })

  test('selects progress + quality_audit + handoff before specialty noise', () => {
    const reviews = [
      {
        id: 10,
        review_type: 'quality_audit_sync',
        payload: {
          chapter_id: 72,
          chapter_no: 12,
          quality_audit_sync: {
            status: 'warn',
            missed_count: 8,
            summary: '漏检 8 项硬伤',
            priority_repair: '先补强交接与已兑现冲突的进度回放',
            missed: [
              { status: 'miss', label: '冲突进度', fix: '禁止重演已打完的餐桌对决' },
              { status: 'ok', label: '开篇', fix: 'ignore' },
            ],
          },
        },
      },
      {
        id: 9,
        review_type: 'chapter_handoff_sync',
        payload: {
          chapter_id: 72,
          chapter_no: 12,
          chapter_handoff_sync: {
            status: 'warn',
            missed_count: 2,
            summary: '章首未接住敲门与空碗',
            priority_repair: '开篇直接接邻居敲门与妈妈空碗对峙',
            missed: [
              { status: 'miss', label: '邻居敲门', fix: '从十点敲门声起笔' },
              { status: 'miss', label: '妈妈空碗', fix: '保留妈妈端空碗的对峙' },
            ],
          },
        },
      },
      {
        id: 8,
        review_type: 'dialogue_sync',
        payload: {
          chapter_id: 72,
          chapter_no: 12,
          dialogue_sync: {
            status: 'warn',
            missed_count: 1,
            priority_repair: '压缩旁白式对白',
            missed: [{ status: 'miss', label: '旁白对白', fix: '去掉旁白式对白' }],
          },
        },
      },
    ]

    const selected = selectPriorityDeliveryDirectives({
      reviews,
      chapter: CH12_SEED,
      previousChapter: CH11,
      limit: 5,
    })

    expect(selected.map(item => item.key).some(key => key === 'progress_replay')).toBe(true)
    expect(selected.some(item => item.key.startsWith('handoff') || item.key.includes('handoff'))).toBe(true)
    expect(selected.some(item => item.key === 'quality_audit' || item.key.startsWith('quality_audit'))).toBe(true)
    expect(selected.length).toBeLessThanOrEqual(5)
  })

  test('empty 80-score model review no longer looks clean when delivery risks remain', () => {
    const reviews = [
      {
        id: 20,
        review_type: 'quality_audit_sync',
        payload: {
          chapter_id: 72,
          chapter_no: 12,
          quality_audit_sync: {
            status: 'warn',
            missed_count: 3,
            summary: '漏检 3 项',
            priority_repair: '先处理进度回放',
          },
        },
      },
    ]

    const linked = mergeProseQualityWithDeliveryRisks(
      {
        passed: true,
        score: 80,
        issues: [],
        revision_directives: [],
        needs_revision: false,
      },
      {
        reviews,
        chapter: CH12_SEED,
        previousChapter: CH11,
        limit: 5,
      },
    )

    expect(linked.needs_revision).toBe(true)
    expect(linked.passed).toBe(false)
    expect(Number(linked.score)).toBeLessThan(78)
    expect(linked.revision_directives.length).toBeGreaterThan(0)
    expect(linked.issues.length).toBeGreaterThan(0)
    expect(linked.delivery_link?.source_count).toBeGreaterThan(0)
    expect(linked.revision_directives.join('｜')).toMatch(/回放|交接|进度|质量|敲门|空碗|冲突/)
  })

  test('keeps model directives and only prepends higher-priority delivery risks', () => {
    const linked = mergeProseQualityWithDeliveryRisks(
      {
        passed: false,
        score: 70,
        needs_revision: true,
        issues: [{ severity: 'medium', type: 'style', description: '动作描写偏空' }],
        revision_directives: ['把耳光后的疼痛反应写细一点'],
      },
      {
        reviews: [
          {
            id: 1,
            review_type: 'chapter_handoff_delta_sync',
            payload: {
              chapter_id: 72,
              chapter_no: 12,
              chapter_handoff_delta_sync: {
                status: 'warn',
                missed_count: 1,
                priority_repair: '开篇承接敲门悬念',
                missed: [{ status: 'miss', label: '敲门悬念', fix: '开篇承接敲门悬念' }],
              },
            },
          },
        ],
        chapter: CH12_SEED,
        previousChapter: CH11,
        limit: 5,
      },
    )

    expect(linked.revision_directives[0]).toMatch(/回放|交接|敲门/)
    expect(linked.revision_directives).toContain('把耳光后的疼痛反应写细一点')
    expect(linked.issues.some((item: any) => String(item?.description || '').includes('动作描写偏空'))).toBe(true)
  })
})

describe('quality audit material reclassification', () => {
  const MATERIAL_CHAPTER = { id: 80, chapter_no: 20, chapter_text: '守夜人合上账本，把灯芯拨亮了一寸。' }
  const materialReviews = [
    {
      id: 30,
      review_type: 'quality_audit_sync',
      payload: {
        chapter_id: 80,
        chapter_no: 20,
        quality_audit_sync: {
          status: 'warn',
          missed_count: 8,
          summary: '章节结构、章纲目的词、详略分配等 8 项缺生成回执',
          priority_repair: '补齐章纲与生成回执材料',
          missed: [
            { status: 'miss', label: '章节结构', fix: '补章节结构生成回执' },
            { status: 'miss', label: '章纲目的词', fix: '补章纲目的词回执' },
          ],
        },
      },
    },
  ]

  test('quality audit gaps stay medium material hints outside revision directives', () => {
    const selected = selectPriorityDeliveryDirectives({
      reviews: materialReviews,
      chapter: MATERIAL_CHAPTER,
      limit: 5,
    })
    const auditItems = selected.filter(item => item.key === 'quality_audit' || item.key.startsWith('quality_audit:'))

    expect(auditItems.length).toBeGreaterThan(0)
    for (const item of auditItems) {
      expect(item.severity).toBe('medium')
      expect(item.issue.severity).toBe('medium')
      expect(String(item.issue.fix || '')).toMatch(/一键补材料/)
      expect(item.issue.category).toBe('material')
    }
  })

  test('quality audit as the only finding does not force revision on a passed model review', () => {
    const linked = mergeProseQualityWithDeliveryRisks(
      { passed: true, score: 82, issues: [], revision_directives: [], needs_revision: false },
      { reviews: materialReviews, chapter: MATERIAL_CHAPTER, limit: 5 },
    )

    expect(linked.issues.some((item: any) => String(item?.type || '').startsWith('quality_audit'))).toBe(true)
    expect(linked.revision_directives).toEqual([])
    expect(linked.needs_revision).toBe(false)
    expect(linked.passed).toBe(true)
    expect(Number(linked.score)).toBe(82)
  })

  test('material entries stay out of delivery_link.selected so revision builders cannot read them', () => {
    const linked = mergeProseQualityWithDeliveryRisks(
      { passed: true, score: 82, issues: [], revision_directives: [], needs_revision: false },
      { reviews: materialReviews, chapter: MATERIAL_CHAPTER, limit: 5 },
    )
    const selected = linked.delivery_link?.selected || []
    const selectedKeys = selected.map((item: any) => String(item?.key || ''))

    expect(selectedKeys.some((key: string) => key.startsWith('quality_audit'))).toBe(false)
    expect(selected.map((item: any) => String(item?.directive || '')).filter(Boolean)).toEqual([])
    expect(linked.delivery_link?.material_count).toBeGreaterThan(0)
    expect(linked.delivery_link?.source_count).toBeGreaterThan(0)
  })

  test('chapter handoff delta gap still forces revision when model review passed', () => {
    const reviews = [
      {
        id: 31,
        review_type: 'chapter_handoff_delta_sync',
        payload: {
          chapter_id: 80,
          chapter_no: 20,
          chapter_handoff_delta_sync: {
            status: 'warn',
            missed_count: 1,
            priority_repair: '把巨手扣上车顶的钩子写进下一章开篇',
            missed: [{ status: 'miss', label: '章末追读', fix: '开篇接住巨手扣顶' }],
          },
        },
      },
    ]
    const linked = mergeProseQualityWithDeliveryRisks(
      { passed: true, score: 82, issues: [], revision_directives: [], needs_revision: false },
      { reviews, chapter: MATERIAL_CHAPTER, limit: 5 },
    )

    expect(linked.needs_revision).toBe(true)
    expect(linked.passed).toBe(false)
    expect(linked.revision_directives.join('｜')).toMatch(/章末交接|巨手/)
    expect(linked.issues.some((item: any) => item?.type === 'chapter_handoff_delta' && item?.severity === 'high')).toBe(true)
  })
})

describe('conflict-structure reference findings', () => {
  test('keeps conflict-structure issues visible but excludes them from revision directives', () => {
    const linked = mergeProseQualityWithDeliveryRisks(
      { passed: true, score: 82, issues: [], revision_directives: [], needs_revision: false },
      {
        reviews: [
          {
            id: 9,
            review_type: 'conflict_structure_sync',
            status: 'warn',
            payload: {
              conflict_structure_sync: {
                status: 'warn',
                missed_count: 1,
                label: '冲突结构',
                summary: '三层矛盾网没有成立',
                priority_repair: '优先补三层矛盾网',
                checks: [
                  {
                    key: 'conflict_network_layers',
                    label: '三层矛盾网',
                    status: 'warn',
                    delivered: false,
                    issue: '缺纵向矛盾',
                    repair_instruction: '补三层矛盾网：先定地图、定阵营、定角色',
                  },
                ],
              },
            },
          },
        ],
        limit: 5,
      },
    )
    expect(linked.issues.join('｜') + JSON.stringify(linked.issues)).toMatch(/三层矛盾|冲突结构/)
    expect(linked.revision_directives.join('｜')).not.toMatch(/三层矛盾|定地图|补冲突结构/)
    expect(linked.revision_directives.length).toBe(0)
  })
})
