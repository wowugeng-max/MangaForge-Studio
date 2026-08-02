import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import {
  buildChapterAttractionReviewReport,
  buildChapterCoreDriftReport,
  buildChapterHandoffSyncReport,
  buildCoreContractSyncReport,
  buildInnovationSyncReport,
  buildMergedLayeredMemoryContext,
  buildReaderExpectationSyncReport,
  buildReaderPayoffSyncReport,
  buildReaderRetentionSyncReport,
  buildRunwaySyncReport,
  buildSignatureSceneSyncReport,
  buildStoryUnitSyncReport,
  buildVolumeBeatSyncReport,
  normalizeDeliveryRiskReceipts,
  normalizeDiscoveredAssets,
  normalizeIpSceneCandidates,
  uniqueDeliveryRiskReceipts,
} from '../novel-writing-service'
import { getStyleLock } from './novel-route-utils'
import {
  buildAssetIntakeReviewRecord,
  buildIpSceneIntakeReviewRecord,
  buildPostDeliverySyncReviewRecord,
} from '../novel-writing/post-delivery-sync-review-record'

const readChapterProseStoragePatchSource = () => readFileSync(join(import.meta.dir, '../novel-writing/chapter-prose-storage-patch.ts'), 'utf8')


const writingServicePackageCache = new Map<string, string>()
const writingServiceSourceCache: { value: string | null } = { value: null }

function packageSource(relativeDir: string) {
  const cached = writingServicePackageCache.get(relativeDir)
  if (cached != null) return cached
  const root = join(import.meta.dir, '..', relativeDir)
  const files: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
        continue
      }
      if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        files.push(full)
      }
    }
  }
  walk(root)
  files.sort()
  const value = files.map((file) => readFileSync(file, 'utf8')).join('\n')
  writingServicePackageCache.set(relativeDir, value)
  return value
}

function writingServiceSource() {
  if (writingServiceSourceCache.value != null) return writingServiceSourceCache.value
  writingServiceSourceCache.value = [
    packageSource('novel-writing-service'),
    packageSource('novel-writing'),
  ].join('\n')
  return writingServiceSourceCache.value
}


function deliveryRiskCarryOverSource() {
  const dir = join(import.meta.dir, '../novel-writing-service/post-delivery')
  return [
    'delivery-risk-carry-over.ts',
    'delivery-risk-carry-over-context.ts',
    'delivery-risk-carry-over-prose-quality.ts',
    'delivery-risk-carry-over-prose-quality-core.ts',
    'delivery-risk-carry-over-prose-quality-mid.ts',
    'delivery-risk-carry-over-prose-quality-extended.ts',
    'delivery-risk-carry-over-prose-quality-extended-assets.ts',
    'delivery-risk-carry-over-prose-quality-extended-assets-a.ts',
    'delivery-risk-carry-over-prose-quality-extended-assets-b.ts',
    'delivery-risk-carry-over-prose-quality-extended-craft.ts',
  ].map(name => readFileSync(join(dir, name), 'utf8')).join('\n')
}

describe('chapter handoff sync report', () => {
  test('checks safe batch chapter handoff delivery after chapter text is written', () => {
    const project = { title: '超人的规则怪谈世界' }
    const chapter = { id: 21, chapter_no: 21, title: '门外暗号' }
    const contextPackage = {
      batch_preflight: {
        chapter_handoff_contract: {
          source: 'safe_batch_chapter_handoff_contract',
          previous_handoff: '上一章最后一幕：湿漉漉学生敲响玻璃门，林晓警告不能开门。',
          opening_obligations: ['开篇前300字必须接住敲门、湿漉漉学生和不能开门的警告。'],
          expectation_carry_over: ['读者期待知道门外学生是不是规则诱饵。'],
          must_deliver: ['确认门外学生用暗号诱导开门。'],
          keep_alive: ['广播是谁发出的仍要保持存在感。'],
          overdue: ['上一章未处理的玻璃门水痕必须优先推进。'],
        },
      },
    }
    const handoffText = [
      '湿漉漉学生还在敲玻璃门，林晓压低声音说不能开门。',
      '开篇前几步，李超没有转场，而是盯住门缝下那道玻璃门水痕。',
      '张智确认门外学生用暗号诱导开门，诱饵规则第一次露出形状。',
      '广播是谁发出的仍没有答案，只在天花板里短促响了一声。',
      '他们先推进上一章未处理的玻璃门水痕，再决定是否回应暗号。',
    ].join('\n')
    const driftText = [
      '第二天清晨，三人来到食堂吃饭。',
      '他们没有处理上一章敲门，也没有接住湿漉漉学生。',
      '门外学生是不是诱饵暂时不重要，广播是谁发出的也被忘在一边。',
      '新剧情直接开始。',
    ].join('\n')

    const okReport = buildChapterHandoffSyncReport(project, chapter, contextPackage, handoffText)
    const warnReport = buildChapterHandoffSyncReport(project, chapter, contextPackage, driftText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('章首承接 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['上一章最后一幕', '开篇义务', '必兑现项', '保活项', '逾期待办']))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('章首承接缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining(['上一章最后一幕', '开篇义务', '必兑现项', '逾期待办', '章首承接硬伤']))
    expect(warnReport.next_actions.join('；')).toMatch(/开篇|上一章|期待债/)
  })

  test('checks pre-draft camelCase chapter handoff contract after chapter text is written', () => {
    const project = { title: '超人的规则怪谈世界' }
    const chapter = { id: 22, chapter_no: 22, title: '门外暗号' }
    const contextPackage = {
      pre_draft_brief: {
        chapterHandoffContract: {
          source: 'pre_draft_brief',
          previousHandoff: '上一章最后一幕：湿漉漉学生敲响玻璃门，林晓警告不能开门。',
          openingObligations: ['开篇前300字必须接住敲门、湿漉漉学生和不能开门的警告。'],
          mustDeliver: ['确认门外学生用暗号诱导开门。'],
        },
      },
    }
    const chapterText = [
      '湿漉漉学生还在敲玻璃门，林晓压低声音说不能开门。',
      '开篇前几步，李超没有转场，而是盯住门缝下那道水痕。',
      '张智确认门外学生用暗号诱导开门，诱饵规则第一次露出形状。',
    ].join('\n')

    const report = buildChapterHandoffSyncReport(project, chapter, contextPackage, chapterText)

    expect(report.label).not.toBe('章首承接未配置')
    expect(report.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['上一章最后一幕', '开篇义务', '必兑现项']))
  })

  test('checks runtime camelCase chapterTarget handoff contract after chapter text is written', () => {
    const project = { title: '超人的规则怪谈世界' }
    const chapter = { id: 24, chapter_no: 24, title: '旧广播室' }
    const contextPackage = {
      chapterTarget: {
        chapterHandoffContract: {
          source: 'runtime_chapter_target',
          previousHandoff: '上一章最后一幕：禁库门牌背面响起旧广播室的铃声。',
          openingObligations: ['开篇前300字必须接住禁库门牌和旧广播室铃声。'],
          mustDeliver: ['确认旧广播室铃声不是普通设备，而是规则召唤。'],
        },
      },
    }
    const chapterText = [
      '禁库门牌还攥在李超手里，背面的旧广播室铃声隔着铜片震了一下。',
      '开篇前几步，他没有换场，而是先确认禁库门牌上的裂纹和铃声方向。',
      '张智低声确认旧广播室铃声不是普通设备，而是规则召唤。',
    ].join('\n')

    const report = buildChapterHandoffSyncReport(project, chapter, contextPackage, chapterText)

    expect(report.label).not.toBe('章首承接未配置')
    expect(report.source).toBe('runtime_chapter_target')
    expect(report.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining(['上一章最后一幕', '开篇义务', '必兑现项']))
  })

  test('reads raw camelCase chapter handoff contract after chapter text is written', () => {
    const project = { title: '超人的规则怪谈世界' }
    const chapter = {
      id: 23,
      chapter_no: 23,
      title: '水痕暗号',
      raw_payload: {
        preDraftBrief: {
          chapterHandoffContract: {
            source: 'raw_pre_draft_brief',
            previousHandoff: '上一章最后一幕：水痕在玻璃门内侧倒流。',
            openingObligations: ['开篇前300字必须接住玻璃门内侧倒流水痕。'],
            mustDeliver: ['确认水痕暗号指向旧广播室。'],
          },
        },
      },
    }
    const report = buildChapterHandoffSyncReport(
      project,
      chapter,
      {},
      '水痕在玻璃门内侧倒流，李超没有转场，先按住门框确认玻璃门内侧倒流水痕。张智确认水痕暗号指向旧广播室。',
    )

    expect(report.label).not.toBe('章首承接未配置')
    expect(report.source).toBe('raw_pre_draft_brief')
    expect(report.planned.map((item: any) => item.label)).toEqual(expect.arrayContaining(['上一章最后一幕', '开篇义务', '必兑现项']))
  })

  test('story state sync persists a chapter_handoff_sync review', () => {
    const source = writingServiceSource()

    expect(source).toContain("reviewType: 'chapter_handoff_sync'")
    expect(source).toContain('buildChapterHandoffSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.chapter_handoff_sync = chapterHandoffSync')
  })
})
describe('chapter core drift report', () => {
  test('scores a chapter against reader promise, goal, conflict and ending hook', () => {
    const report = buildChapterCoreDriftReport(
      {
        title: '万古长夜',
        summary: '寒门少年以阵法反压宗门秩序',
        reference_config: {
          writing_bible: {
            reader_promise: '寒门少年以阵法反压宗门秩序',
          },
        },
      },
      { id: 8, chapter_no: 8, title: '试炼前夜' },
      {
        chapter_target: {
          chapter_goal: '主角拿到试炼资格',
          reader_promise: '寒门少年以阵法反压宗门秩序',
          core_conflict: '执事设局阻拦主角参加试炼',
          ending_hook: '阵盘亮起第二道裂纹',
          forbidden_content: ['提前揭示掌门身份'],
        },
      },
      [
        '执事在试炼名单前设局阻拦，逼寒门少年交出阵盘。',
        '主角用阵法反压宗门秩序，当场拿到试炼资格。',
        '夜色落下时，阵盘亮起第二道裂纹。',
      ].join('\n'),
      { missed: [], forbidden_touched: [] },
    )

    expect(report.status).toBe('ok')
    expect(report.score).toBeGreaterThanOrEqual(80)
    expect(report.checks.find(item => item.key === 'chapter_goal')?.status).toBe('ok')
    expect(report.drift_risks).toHaveLength(0)
  })

  test('warns when a chapter misses the promised conflict or touches forbidden content', () => {
    const report = buildChapterCoreDriftReport(
      {
        title: '万古长夜',
        summary: '寒门少年以阵法反压宗门秩序',
        reference_config: {
          writing_bible: {
            reader_promise: '寒门少年以阵法反压宗门秩序',
          },
        },
      },
      { id: 9, chapter_no: 9, title: '偏离测试' },
      {
        chapter_target: {
          chapter_goal: '主角拿到试炼资格',
          core_conflict: '执事设局阻拦主角参加试炼',
          ending_hook: '阵盘亮起第二道裂纹',
          forbidden_content: ['提前揭示掌门身份'],
        },
      },
      '众人聊天许久，提前揭示掌门身份，却没有试炼资格、执事阻拦或阵盘裂纹。',
      {
        missed: [{ name: '宗门试炼主线' }],
        forbidden_touched: [{ name: '掌门身份伏笔' }],
      },
    )

    expect(report.status).toBe('warn')
    expect(report.score).toBeLessThan(80)
    expect(report.drift_risks).toEqual(expect.arrayContaining([
      expect.stringContaining('禁写内容'),
      expect.stringContaining('剧情线漏推'),
    ]))
    expect(report.checks.find(item => item.key === 'forbidden_content')?.status).toBe('warn')
  })

  test('reads raw camelCase preDraftBrief anchors for chapter core drift report', () => {
    const report = buildChapterCoreDriftReport(
      { title: '血缘系统：三位隐藏妈妈' },
      {
        id: 10,
        chapter_no: 1,
        title: '旧楼铃声',
        raw_payload: {
          preDraftBrief: {
            readerPromise: '血缘系统第一次检测揭开三位妈妈身份反转。',
            chapterGoal: '主角完成第一次血缘系统检测。',
            coreConflict: '旧楼规则阻止主角确认真假妈妈身份。',
            endingHook: '第三位妈妈留下没有照片的出生证明。',
          },
        },
      },
      {},
      [
        '李岚推开旧楼的门，走廊里只有一盏坏掉的灯。',
        '广播重复着陌生的校规，所有人必须在十点前回到房间。',
        '他握紧手里的裁员信，知道今晚不能再出错。',
      ].join('\n'),
      { missed: [], forbidden_touched: [] },
    )

    expect(report.anchors.reader_promise).toContain('血缘系统')
    expect(report.anchors.core_conflict).toContain('真假妈妈')
    expect(report.checks.find(item => item.key === 'reader_promise')?.expected).toContain('三位妈妈')
    expect(report.checks.find(item => item.key === 'core_conflict')?.risk).toBe('核心冲突未充分落地')
  })

  test('reads raw camelCase preDraftBrief expectation lines for chapter core drift report', () => {
    const report = buildChapterCoreDriftReport(
      { title: '超人的规则怪谈世界' },
      {
        id: 11,
        chapter_no: 2,
        title: '门外判定',
        raw_payload: {
          preDraftBrief: {
            readerExpectationLedger: {
              mustDeliver: [{ text: '用信息差破解门外学生规则' }],
              keepAlive: [{ text: '广播是谁发出的' }],
            },
            targetReaderContract: {
              readerDesires: ['规则反制爽点'],
              chapterAttractions: ['超人蛮力被规则反制'],
            },
            genrePositioningContract: {
              coreHookRules: ['每章用信息差破解一条规则'],
              microInnovationRules: ['门外学生用暗号反向诱导'],
              mustHaveScenes: ['规则判定压住蛮力'],
            },
          },
        },
      },
      {},
      [
        '李超离开校园，开始经营一片灵田。',
        '他每天浇水、收菜、卖货，大家都说生活越来越安稳。',
      ].join('\n'),
      { missed: [], forbidden_touched: [] },
    )

    expect(report.checks.find(item => item.key === 'plot_expectation_line')?.expected).toContain('广播是谁发出的')
    expect(report.checks.find(item => item.key === 'theme_payoff_line')?.expected).toContain('超人蛮力被规则反制')
    expect(report.checks.find(item => item.key === 'freshness_stimulus_line')?.expected).toContain('门外学生用暗号反向诱导')
    expect(report.drift_risks).toEqual(expect.arrayContaining([
      '剧情期待未充分落地',
      '主题甜头未充分落地',
      '新鲜刺激未充分落地',
    ]))
  })

  test('checks oh-story plot theme and freshness expectation lines in core drift report', () => {
    const report = buildChapterCoreDriftReport(
      {
        title: '超人的规则怪谈世界',
        synopsis: '超人蛮力被规则限制，必须和理性搭档一起破局。',
        reference_config: {
          writing_bible: {
            commercial_positioning: {
              selling_points: ['超人蛮力被规则反制', '每章用信息差破解一条规则'],
            },
          },
        },
      },
      { id: 16, chapter_no: 16, title: '门外判定' },
      {
        chapter_target: {
          chapter_goal: '用信息差破解门外学生规则',
          reader_promise: '超人蛮力被规则限制，必须和理性搭档一起破局。',
          core_conflict: '救门外学生会违规，不救又会错过证人线索。',
          ending_hook: '门外学生报出搭档才知道的暗号。',
          reader_expectation_ledger: {
            must_deliver: [{ text: '用信息差破解门外学生规则' }],
            keep_alive: [{ text: '广播是谁发出的' }],
          },
          target_reader_contract: {
            reader_desires: ['规则反制爽点'],
            chapter_attractions: ['超人蛮力被规则反制'],
          },
          genre_positioning_contract: {
            core_hook_rules: ['每章用信息差破解一条规则'],
            micro_innovation_rules: ['门外学生用暗号反向诱导'],
          },
        },
      },
      [
        '李超没有再撞门，超人蛮力被规则限制，理性搭档张智把违规条件写在玻璃上。',
        '救门外学生会违规，不救又会错过证人线索，他们只能用信息差破解门外学生规则。',
        '张智把暗号顺序写在玻璃上，超人蛮力被规则反制这个爽点终于落地。',
        '广播仍然没有说明是谁发出的。',
        '门外学生忽然报出搭档才知道的暗号，像是反向诱导他们开门。',
      ].join('\n'),
      { missed: [], forbidden_touched: [] },
    )

    expect(report.status).toBe('ok')
    expect(report.checks.find(item => item.key === 'plot_expectation_line')?.status).toBe('ok')
    expect(report.checks.find(item => item.key === 'theme_payoff_line')?.status).toBe('ok')
    expect(report.checks.find(item => item.key === 'freshness_stimulus_line')?.status).toBe('ok')
  })

  test('warns when oh-story expectation lines drift away from the chapter prose', () => {
    const report = buildChapterCoreDriftReport(
      {
        title: '超人的规则怪谈世界',
        synopsis: '超人蛮力被规则限制，必须和理性搭档一起破局。',
        reference_config: {
          writing_bible: {
            commercial_positioning: {
              selling_points: ['超人蛮力被规则反制', '每章用信息差破解一条规则'],
            },
          },
        },
      },
      { id: 17, chapter_no: 17, title: '偏移测试' },
      {
        chapter_target: {
          chapter_goal: '用信息差破解门外学生规则',
          reader_promise: '超人蛮力被规则限制，必须和理性搭档一起破局。',
          core_conflict: '救门外学生会违规，不救又会错过证人线索。',
          ending_hook: '门外学生报出搭档才知道的暗号。',
          reader_expectation_ledger: {
            must_deliver: [{ text: '用信息差破解门外学生规则' }],
          },
          target_reader_contract: {
            reader_desires: ['规则反制爽点'],
            chapter_attractions: ['超人蛮力被规则反制'],
          },
          genre_positioning_contract: {
            core_hook_rules: ['每章用信息差破解一条规则'],
            micro_innovation_rules: ['门外学生用暗号反向诱导'],
          },
        },
      },
      '三人在宿舍里做饭聊天，林晓讲了很多旧事，大家决定明天再去门口看看。',
      { missed: [], forbidden_touched: [] },
    )

    expect(report.status).toBe('warn')
    expect(report.drift_risks).toEqual(expect.arrayContaining([
      expect.stringContaining('剧情期待'),
      expect.stringContaining('主题甜头'),
      expect.stringContaining('新鲜刺激'),
    ]))
  })

  test('story state sync persists a chapter_core_drift review', () => {
    const source = writingServiceSource()

    expect(source).toContain("reviewType: 'chapter_core_drift'")
    expect(source).toContain('buildChapterCoreDriftReport(project, chapter, contextPackage, chapterText, storylineSync)')
    expect(source).toContain('payload.core_drift = coreDrift')
  })

  test('checks core contract radar delivery after chapter text is written', () => {
    const project = { title: '超人的规则怪谈世界' }
    const chapter = { id: 18, chapter_no: 18, title: '玻璃暗号' }
    const contextPackage = {
      chapter_target: {
        core_contract_radar: {
          summary: '本章必须服务超人蛮力被规则反制，并推进广播来源调查。',
          must_serve: [
            '超人蛮力被规则反制',
            '用信息差破解门外学生规则',
            '广播来源调查推进到玻璃暗号',
          ],
          no_drift: [
            '不能把规则怪谈写成纯打怪',
            '不能让主角靠蛮力无代价通关',
          ],
          theme_unity_rules: [
            '一本书从头到尾要有统一的核心情绪：力量被规则反制后的紧张与破局爽。',
            '小情绪服从大情绪；随机翻开一章，情绪必须指向全书核心。',
          ],
          repair_focus: [
            '补足规则判定反制蛮力',
            '章末必须留下广播来源的新问题',
          ],
          selling_point_execution_rules: [
            '卖点四步法：整本书卖点、书名卖点、简介卖点、每段剧情卖点都要能对齐。',
            '卖点表达必须发现比告知爽十倍，用剧情/对话/反应隐性展示，并按开头暗示 -> 中间深化 -> 高潮爆发递进。',
            '每章一句话概括内容并标注目的词，盯紧章纲目的来写。',
          ],
          repetition_strategy_rules: [
            '同一卖点至少延展 3 个角度，用正写、反套路、持续反、反了再正等方式换壳换场景换人物。',
            '当核心看点在当前样本/读者反馈中稳定时保持重复策略；反馈下降时升级重复方式，避免爽点重复导致审美疲劳。',
          ],
          commercial_rhythm_rules: [
            '写前读取追踪/上下文.md 与最近 3 章摘要；连续 2 章没有目标推进、阻碍升级或新信息时，下一章提高冲突密度。',
            '连续 2 章只爆点不留反应余波时，插入 1-2 个承接场景，但必须推进关系/伏笔。',
            '大高潮 7-10 天完成，小高潮约 3 天，高潮后 1-2 章过渡。',
          ],
          goldfinger_structure_rules: [
            '金手指可替换故事流程中的任一环节：建立目标、克服困难、准备环节、激励事件或收获奖励。',
            '金手指简单是核心，一眼就懂；系统限制必须保证主角一步步行动。',
            '给出金手指后必须有即时变化，并契合主角当前职业或打开困境。',
          ],
          launch_pressure_rules: [
            '开篇 300-500字内交代处境、危险来源和破局希望。',
            '优先用环境型压力开局，主角一开始不能完美，形成否极泰来的起点。',
          ],
          checks: [
            { key: 'reader_promise', label: '读者承诺', status: 'warn', reason: '规则反制必须可见。' },
          ],
        },
      },
    }
    const alignedText = [
      '超人蛮力被规则反制，他撞门越重，门缝里的广播判定越冷。',
      '张智没有让他继续砸门，而是用信息差破解门外学生规则，把暗号顺序写在玻璃上。',
      '玻璃暗号让广播来源调查第一次推进，声音来自废弃广播室。',
      '他没有靠蛮力无代价通关，手臂被规则反噬得发麻。',
      '本章的小情绪是门外紧张验证，但仍然指向全书核心情绪：力量被规则反制后的破局爽。',
      '卖点四步法在本章落地：整本书卖点是规则反制，书名卖点是玻璃暗号，简介卖点是超人蛮力遇上规则，段落卖点靠剧情、对话和反应隐性展示。',
      '开头暗示玻璃暗号，中间深化广播来源，高潮爆发在规则反噬现场，读者是自己发现卖点，不是被告知本章很爽。',
      '同一卖点至少延展 3 个角度：正写规则判定、反套路限制蛮力、持续反让广播每次误导主角，换壳换场景换人物但内核一致，并避免审美疲劳。',
      '写前读取追踪/上下文.md 和最近3章摘要后确认没有拖沓，本章有目标推进、阻碍升级和新信息；冲突密度按每500字一个转折点提高。',
      '本章不是连续爆点无余波，受伤反应推进双主角关系；大高潮仍控制在7-10天内，小高潮约3天，高潮后预留1-2章过渡。',
      '金手指可替换故事流程中的克服困难环节，但系统限制保证主角一步步行动；规则识别一眼就懂，给出后立刻出现即时变化，并契合设备师职业打开困境。',
      '开篇300-500字内交代处境、危险来源和破局希望，用环境型压力让主角先不完美，再形成否极泰来的起点。',
      '章末新的问题留下：废弃广播室里是谁提前录好了他的名字？',
    ].join('\n')
    const driftText = [
      '本章完全偏离核心契约。',
      '众人把规则怪谈写成纯打怪，主角靠蛮力无代价通关。',
      '广播来源没有推进，大家聊天后回宿舍休息。',
      '作者直接告诉读者这是核心卖点、本章很爽，但没有通过剧情、对话或反应让读者自己发现。',
      '爽点重复到读者审美疲劳，核心看点抓不住，临时换看点。',
      '连续2章没有目标推进、阻碍升级或新信息，连续2章只爆点不留反应余波，段落像流水账。',
      '金手指成了说明书式万能外挂，太强所以无聊，一键清场且和职业无关。',
      '开篇主角完美无缺，先铺背景和大段世界观，没有危险来源，也没有破局希望。',
    ].join('\n')

    const okReport = buildCoreContractSyncReport(project, chapter, contextPackage, alignedText)
    const warnReport = buildCoreContractSyncReport(project, chapter, contextPackage, driftText)

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('核心契约 OK')
    expect(okReport.missed_count).toBe(0)
    expect(okReport.delivered.map((item: any) => item.label)).toEqual(expect.arrayContaining([
      '必须服务',
      '不得漂移',
      '主题统一',
      '修复焦点',
      '卖点执行',
      '重复策略',
      '商业节奏',
      '金手指结构',
      '开篇压力',
    ]))
    expect(warnReport.status).toBe('warn')
    expect(warnReport.label).toContain('核心契约缺口')
    expect(warnReport.missed.map((item: any) => item.label)).toEqual(expect.arrayContaining([
      '必须服务',
      '不得漂移',
      '主题统一',
      '卖点执行',
      '重复策略',
      '商业节奏',
      '金手指结构',
      '开篇压力',
      '核心契约硬伤',
    ]))
    expect(warnReport.missed.map((item: any) => item.key)).toContain('theme_unity_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('selling_point_execution_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('commercial_rhythm_rules')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('goldfinger_structure_rules')
    expect(warnReport.next_actions.join('；')).toMatch(/核心承诺|不得漂移|章末/)
    expect(warnReport.next_actions.join('；')).toContain('全书核心情绪')
    expect(warnReport.next_actions.join('；')).toContain('卖点四步法')
    expect(warnReport.next_actions.join('；')).toContain('最近3章')
    expect(warnReport.next_actions.join('；')).toContain('金手指')
  })

  test('checks ten-chapter core selling point drift after chapter text is written', () => {
    const project = { title: '超人的规则怪谈世界' }
    const chapter = { id: 10, chapter_no: 10, title: '第十条规则' }
    const contextPackage = {
      chapter_target: {
        core_contract_radar: {
          summary: '第十章复核最初吸引读者的卖点是否还在。',
          must_serve: ['超人力量和规则判定持续碰撞。'],
          no_drift: ['不能把规则怪谈写成纯打怪'],
          periodic_drift_check: {
            cadence: '每10章',
            due: true,
            question: '当初吸引读者的卖点还在吗？',
            selling_points: ['超人能力被规则空间反制。', '力量反制规则'],
          },
        },
      },
    }
    const alignedText = [
      '第十条规则降临时，李超的超人力量刚砸碎铁门，规则判定却立刻反制，把他的拳风折回地面。',
      '这一次不是纯打怪，而是力量和规则空间继续碰撞，张智趁反制间隙找到新限制。',
    ].join('\n')
    const driftText = [
      '李超离开校园，开始经营一片灵田。',
      '他每天浇水、收菜、卖货，大家都说生活越来越安稳。',
    ].join('\n')

    const okReport = buildCoreContractSyncReport(project, chapter, contextPackage, alignedText)
    const warnReport = buildCoreContractSyncReport(project, chapter, contextPackage, driftText)

    expect(okReport.delivered.map((item: any) => item.label)).toContain('十章卖点复核')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed.map((item: any) => item.key)).toContain('ten_chapter_selling_point')
    expect(warnReport.priority_repair).toBe('优先补核心卖点')
    expect(warnReport.next_actions.join('；')).toContain('当初吸引读者的卖点')
  })

  test('warns when a non-finale chapter resolves the core conflict without a new risk', () => {
    const project = { title: '万古长夜' }
    const chapter = { id: 19, chapter_no: 16, title: '阵盘反压' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 16,
        core_conflict: '寒门少年以阵法反压宗门秩序',
        story_unit_context: { current_chapter_role: '压力升级/推进，不是终局收束' },
        core_contract_radar: {
          must_serve: ['寒门少年以阵法反压宗门秩序'],
          no_drift: ['非大结局章节禁止解决核心冲突'],
          repair_focus: ['局部胜利必须伴随新的代价或风险'],
          checks: [{ key: 'core_conflict_rhythm_protection', label: '核心冲突节奏保护' }],
        },
      },
    }
    const prematureText = [
      '沈砚用阵法当场反压宗门秩序。',
      '幕后黑手全部伏法，寒门少年面对的核心矛盾已经彻底解决。',
      '从此再无威胁，宗门也不会再压迫任何人。',
    ].join('\n')
    const riskText = [
      '沈砚当场反压执事，拿到试炼资格。',
      '但掌门令牌忽然亮起，内门长老要求他三日内交出阵盘，否则废除资格。',
    ].join('\n')

    const prematureReport = buildCoreContractSyncReport(project, chapter, contextPackage, prematureText)
    const riskReport = buildCoreContractSyncReport(project, chapter, contextPackage, riskText)

    expect(prematureReport.status).toBe('warn')
    expect(prematureReport.priority_repair).toBe('优先守核心节奏')
    expect(prematureReport.missed.map((item: any) => item.key)).toContain('core_conflict_premature_resolution')
    expect(prematureReport.next_actions.join('；')).toContain('非大结局')
    expect(riskReport.missed.map((item: any) => item.key)).not.toContain('core_conflict_premature_resolution')
  })

  test('reads raw camelCase core contract radar after chapter text is written', () => {
    const project = { title: '超人的规则怪谈世界' }
    const chapter = {
      id: 20,
      chapter_no: 20,
      title: '旧广播室',
      raw_payload: {
        preDraftBrief: {
          coreContractRadar: {
            summary: '本章必须服务旧广播室主线推进。',
            mustServe: ['旧广播室主线推进到录音源头'],
            noDrift: ['不能绕开规则判定直接砸门'],
            repairFocus: ['章末留下录音源头的新问题'],
            checks: [{ key: 'broadcast_source', label: '广播来源推进' }],
          },
        },
      },
    }

    const report = buildCoreContractSyncReport(project, chapter, {}, '李超没有砸门，张智先按规则判定排除陷阱，旧广播室主线推进到录音源头。章末留下录音源头的新问题。')

    expect(report.label).not.toBe('核心契约未配置')
    expect(report.contract_summary).toContain('旧广播室')
    expect(report.planned.map((item: any) => item.text)).toEqual(expect.arrayContaining([
      expect.stringContaining('旧广播室主线推进到录音源头'),
      expect.stringContaining('不能绕开规则判定直接砸门'),
      expect.stringContaining('章末留下录音源头的新问题'),
    ]))
    expect(report.quality_checks).toContain('广播来源推进')
  })

  test('reads runtime camelCase chapterTarget coreContractRadar when chapter_target already exists after delivery', () => {
    const project = { title: '超人的规则怪谈世界' }
    const chapter = { id: 21, chapter_no: 21, title: '旧广播室' }
    const contextPackage = {
      chapter_target: {
        chapter_no: 21,
        title: '旧广播室',
      },
      chapterTarget: {
        chapterNo: 21,
        coreContractRadar: {
          summary: '本章必须服务旧广播室主线推进。',
          mustServe: ['旧广播室主线推进到录音源头'],
          noDrift: ['不能绕开规则判定直接砸门'],
          repairFocus: ['章末留下录音源头的新问题'],
          checks: [{ key: 'broadcast_source', label: '广播来源推进' }],
        },
      },
    }

    const report = buildCoreContractSyncReport(project, chapter, contextPackage, '李超没有砸门，张智先按规则判定排除陷阱，旧广播室主线推进到录音源头。章末留下录音源头的新问题。')

    expect(report.label).not.toBe('核心契约未配置')
    expect(report.contract_summary).toContain('旧广播室')
    expect(report.planned.map((item: any) => item.text)).toEqual(expect.arrayContaining([
      expect.stringContaining('旧广播室主线推进到录音源头'),
      expect.stringContaining('不能绕开规则判定直接砸门'),
      expect.stringContaining('章末留下录音源头的新问题'),
    ]))
    expect(report.quality_checks).toContain('广播来源推进')
  })

  test('story state sync persists a core_contract_sync review', () => {
    const source = writingServiceSource()

    expect(source).toContain("reviewType: 'core_contract_sync'")
    expect(source).toContain('buildCoreContractSyncReport(project, chapter, contextPackage, chapterText)')
    expect(source).toContain('payload.core_contract_sync = coreContractSync')
  })
})
